"use client";
import { useEffect, useState } from "react";
import { Calendar, Clock, CheckCircle2, XCircle, RefreshCw, Ban } from "lucide-react";
import { ScheduledSend } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-violet-50 text-violet-700 border-violet-200",
  sent:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed:    "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending:   <Clock size={11} />,
  sent:      <CheckCircle2 size={11} />,
  failed:    <XCircle size={11} />,
  cancelled: <Ban size={11} />,
};

export default function ScheduledPage() {
  const [sends, setSends]     = useState<ScheduledSend[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/scheduled-sends");
    const data = await res.json();
    setSends(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function runCron() {
    setRunning(true);
    await fetch("/api/cron");
    await load();
    setRunning(false);
  }

  async function cancel(id: string) {
    await fetch(`/api/scheduled-sends/${id}`, { method: "DELETE" });
    setSends((prev) => prev.map((s) => s.id === id ? { ...s, status: "cancelled" } : s));
  }

  useEffect(() => { load(); }, []);

  const pending   = sends.filter((s) => s.status === "pending");
  const completed = sends.filter((s) => s.status !== "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Scheduled Emails</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Emails queued to send at a specific date and time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runCron}
            disabled={running}
            className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 border border-violet-200 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={running ? "animate-spin" : ""} />
            {running ? "Processing…" : "Process now"}
          </button>
          <button onClick={load} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>

      {/* Pending */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Pending ({pending.length})
        </p>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
          </div>
        ) : pending.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Calendar size={24} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No pending scheduled emails.</p>
            <p className="text-xs text-gray-300 mt-1">
              Set a schedule on a trigger to queue emails here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((s) => (
              <SendRow key={s.id} send={s} onCancel={() => cancel(s.id)} />
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {completed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            History ({completed.length})
          </p>
          <div className="space-y-2">
            {completed.map((s) => (
              <SendRow key={s.id} send={s} />
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
        <p className="text-sm font-semibold text-violet-900 mb-2">How scheduled emails work</p>
        <ol className="space-y-1.5">
          {[
            "You set a date & time on a trigger",
            "When the event fires, the email is queued here instead of sending immediately",
            "At the scheduled time, the system delivers it automatically",
            "Click \"Process now\" above to manually trigger delivery (useful for testing)",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-violet-800">
              <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function SendRow({ send, onCancel }: { send: ScheduledSend; onCancel?: () => void }) {
  const isPending = send.status === "pending";
  const sendAt    = new Date(send.send_at);
  const isOverdue = isPending && sendAt < new Date();

  return (
    <div className={`bg-white rounded-2xl border p-4 flex items-start justify-between gap-4 ${
      isOverdue ? "border-amber-200 bg-amber-50/30" : "border-gray-100"
    }`}>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[send.status]}`}>
            {STATUS_ICONS[send.status]} {send.status}
          </span>
          {isOverdue && (
            <span className="text-xs text-amber-600 font-medium bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
              overdue — click Process now
            </span>
          )}
          <span className="text-xs text-gray-400">
            {(send as ScheduledSend & { triggers?: { name: string } }).triggers?.name ?? "—"}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-800 truncate">{send.rendered_subject}</p>
        <p className="text-xs text-gray-400">
          To: {send.recipient_email} · {isPending ? "Sends" : send.status === "sent" ? "Sent" : "Scheduled for"}{" "}
          <strong className="text-gray-600">
            {sendAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </strong>
        </p>
        {send.error && (
          <p className="text-xs text-red-500 mt-1">Error: {send.error}</p>
        )}
      </div>
      {isPending && onCancel && (
        <button
          onClick={onCancel}
          className="shrink-0 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 hover:border-red-200 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
