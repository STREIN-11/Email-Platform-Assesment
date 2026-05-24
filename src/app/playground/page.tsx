"use client";
import { useState } from "react";
import { Play } from "lucide-react";

const EXAMPLE = {
  event_name: "user.plan_upgraded",
  user_id: "00000000-0000-0000-0000-000000000001",
  payload: { plan: "pro", name: "Jane Doe", email: "jane@example.com" },
};

export default function PlaygroundPage() {
  const [raw, setRaw] = useState(JSON.stringify(EXAMPLE, null, 2));
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fire() {
    setError("");
    setResult(null);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { setError("Invalid JSON"); return; }
    setLoading(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Event Playground</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fire an event and watch the rule engine evaluate triggers, render templates, and send emails.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Event Payload (JSON)</label>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-64"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={fire}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            <Play size={16} /> {loading ? "Processing…" : "Fire Event"}
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Engine Output</label>
          <div className="border border-gray-200 rounded-xl bg-gray-900 text-green-400 font-mono text-sm p-4 min-h-64 overflow-auto">
            {result ? (
              <pre>{JSON.stringify(result, null, 2)}</pre>
            ) : (
              <span className="text-gray-500">Fire an event to see results…</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-1">
        <p className="font-medium">How it works</p>
        <ol className="list-decimal list-inside space-y-1 text-amber-700">
          <li>Event is logged to the database</li>
          <li>Active triggers matching the event name are fetched</li>
          <li>Each trigger&apos;s conditions are evaluated against the payload</li>
          <li>Unsubscribe flag and once-per-user deduplication are checked</li>
          <li>Template is rendered with payload data and sent via Resend</li>
          <li>Result is logged to send_log for audit</li>
        </ol>
      </div>
    </div>
  );
}
