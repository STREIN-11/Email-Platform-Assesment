"use client";
import { useState } from "react";
import { Play, RotateCcw, CheckCircle2, XCircle, Clock } from "lucide-react";

const EXAMPLE = {
  event_name: "user.plan_upgraded",
  user_id: "00000000-0000-0000-0000-000000000001",
  payload: { plan: "pro", name: "Jane Doe", email: "jane@example.com" },
};

type ResultRow = { trigger: string; status: string; reason?: string };
type EngineResult = { event_id: string; results: ResultRow[] } | null;

export default function PlaygroundPage() {
  const [raw, setRaw] = useState(JSON.stringify(EXAMPLE, null, 2));
  const [result, setResult] = useState<EngineResult>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fire() {
    setError("");
    setResult(null);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { setError("Invalid JSON — check your payload."); return; }
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
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Event Playground</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Fire a test event and watch the rule engine evaluate triggers, render templates, and send emails.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Event Payload</span>
            <button
              onClick={() => setRaw(JSON.stringify(EXAMPLE, null, 2))}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RotateCcw size={11} /> Reset
            </button>
          </div>
          <textarea
            className="flex-1 px-5 py-4 text-sm mono focus:outline-none min-h-72 resize-none bg-[#fafafa] text-gray-800"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            spellCheck={false}
          />
          {error && (
            <div className="px-5 py-3 border-t border-red-100 bg-red-50 flex items-center gap-2 text-sm text-red-600">
              <XCircle size={14} /> {error}
            </div>
          )}
          <div className="px-5 py-3.5 border-t border-gray-100">
            <button
              onClick={fire}
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Play size={14} /> {loading ? "Processing…" : "Fire Event"}
            </button>
          </div>
        </div>

        {/* Output panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">Engine Output</span>
            {loading && <span className="text-xs text-indigo-500 animate-pulse">Processing…</span>}
          </div>

          <div className="flex-1 min-h-72">
            {!result && !loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-center p-8">
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                  <Play size={16} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">Fire an event to see results</p>
              </div>
            ) : result ? (
              <div className="p-5 space-y-4">
                {/* Event ID */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Event ID</span>
                  <code className="text-xs mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{result.event_id}</code>
                </div>

                {/* Results table */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Trigger Results</p>
                  {result.results?.length === 0 ? (
                    <p className="text-sm text-gray-400">No triggers matched this event.</p>
                  ) : (
                    result.results?.map((r, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{r.trigger}</p>
                          {r.reason && <p className="text-xs text-gray-400 mt-0.5">{r.reason}</p>}
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                    ))
                  )}
                </div>

                {/* Raw JSON */}
                <details className="group">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">Raw JSON</summary>
                  <pre className="mt-2 text-xs mono bg-gray-900 text-green-400 rounded-xl p-4 overflow-auto max-h-48">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
        <p className="text-sm font-semibold text-amber-900 mb-3">How the engine works</p>
        <ol className="space-y-1.5">
          {[
            "Event is logged to the database",
            "Active triggers matching the event name are fetched (indexed by event_name)",
            "Each trigger's conditions are evaluated against the payload",
            "Deduplication is checked via send_log (once-per-user or TTL-based)",
            "Template is rendered with payload data and sent via Resend",
            "Result is written to send_log for audit",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-amber-800">
              <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "sent") return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
      <CheckCircle2 size={11} /> Sent
    </span>
  );
  if (status === "skipped") return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">
      <Clock size={11} /> Skipped
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
      <XCircle size={11} /> {status}
    </span>
  );
}
