"use client";
import { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, CheckCircle2, XCircle, Clock, Info, ChevronDown, ChevronUp, RefreshCw, CalendarClock, Paperclip, X } from "lucide-react";

// Default sample values for common field names
const FIELD_DEFAULTS: Record<string, string> = {
  name:         "Jane Doe",
  email:        "jane@example.com",
  plan:         "pro",
  trial_days:   "14",
  amount:       "49.00",
  storage_hits: "3",
  days_on_free: "16",
  milestone:    "100th project",
};

type TriggerOption = {
  event_name: string;
  label: string;        // trigger name
  template: string;     // template name
};

type ResultRow = { trigger: string; status: string; reason?: string; send_at?: string };
type EngineResult = { event_id: string; results: ResultRow[]; matched?: number } | null;

const REASON_LABELS: Record<string, string> = {
  already_sent: "Already sent to this user before",
  unsubscribed:  "User has unsubscribed from emails",
  no_email:      "No email address was provided",
};

export default function PlaygroundPage() {
  const [triggers, setTriggers]       = useState<TriggerOption[]>([]);
  const [loadingTriggers, setLoadingTriggers] = useState(true);
  const [selectedEvent, setSelectedEvent]     = useState<string>("");
  const [customEvent, setCustomEvent]         = useState("");
  const [userId, setUserId] = useState("user_001");
  const [fields, setFields]                   = useState<{ key: string; value: string }[]>([
    { key: "name",  value: "Jane Doe" },
    { key: "email", value: "jane@example.com" },
  ]);
  const [result, setResult]   = useState<EngineResult>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [attachments, setAttachments] = useState<{ filename: string; content: string; contentType: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadTriggers() {
    setLoadingTriggers(true);
    try {
      const res  = await fetch("/api/triggers");
      const data = await res.json();
      const opts: TriggerOption[] = (Array.isArray(data) ? data : [])
        .filter((t: { active: boolean }) => t.active)
        .map((t: { event_name: string; name: string; templates?: { name: string } }) => ({
          event_name: t.event_name,
          label:      t.name,
          template:   t.templates?.name ?? "",
        }));
      setTriggers(opts);
      // Auto-select first
      if (opts.length > 0 && !selectedEvent) {
        selectEvent(opts[0].event_name);
      }
    } finally {
      setLoadingTriggers(false);
    }
  }

  useEffect(() => { loadTriggers(); }, []);

  // Unique event names (multiple triggers can share one event)
  const uniqueEvents = Array.from(new Map(triggers.map((t) => [t.event_name, t])).values());
  // Add custom option at the end
  const allOptions = [...uniqueEvents, { event_name: "__custom__", label: "Custom event…", template: "" }];

  function selectEvent(val: string) {
    setSelectedEvent(val);
    setResult(null);
    setError("");
    // Pre-fill fields based on known field defaults — keep email always present
    if (val !== "__custom__") {
      setFields([
        { key: "name",  value: FIELD_DEFAULTS["name"] },
        { key: "email", value: FIELD_DEFAULTS["email"] },
      ]);
    }
  }

  function setField(i: number, key: string, value: string) {
    setFields((prev) => prev.map((f, idx) => idx === i ? { key, value } : f));
  }

  function addField() { setFields((prev) => [...prev, { key: "", value: "" }]); }
  function removeField(i: number) { setFields((prev) => prev.filter((_, idx) => idx !== i)); }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.error) { setError(data.error); }
    else { setAttachments((prev) => [...prev, ...data.attachments]); }
    setUploading(false);
    e.target.value = "";
  }

  function removeAttachment(i: number) {
    setAttachments((prev) => prev.filter((_, idx) => idx !== i));
  }

  function reset() {
    setSelectedEvent(uniqueEvents[0]?.event_name ?? "");
    setUserId("user_001");
    setFields([
      { key: "name",  value: "Jane Doe" },
      { key: "email", value: "jane@example.com" },
    ]);
    setAttachments([]);
    setResult(null);
    setError("");
  }

  async function fire() {
    setError("");
    setResult(null);
    const eventName = selectedEvent === "__custom__" ? customEvent.trim() : selectedEvent;
    if (!eventName) { setError("Please select an event first."); return; }
    if (!userId.trim()) { setError("Please enter a User ID."); return; }

    const payload: Record<string, string> = {};
    for (const f of fields) {
      if (f.key.trim()) payload[f.key.trim()] = f.value;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_name: eventName, user_id: userId.trim(), payload, attachments }),
      });
      setResult(await res.json());
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    }
    setLoading(false);
  }

  // Triggers that will be evaluated for the selected event
  const matchingTriggers = triggers.filter((t) => t.event_name === selectedEvent);
  const selectedLabel    = allOptions.find((o) => o.event_name === selectedEvent)?.label ?? selectedEvent;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Event Playground</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Simulate something happening in your app and see which emails would fire.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* ── Left: Form ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Simulate an event</span>
            <div className="flex items-center gap-3">
              <button onClick={loadTriggers} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                <RefreshCw size={11} className={loadingTriggers ? "animate-spin" : ""} /> Refresh
              </button>
              <button onClick={reset} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                <RotateCcw size={11} /> Reset
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5">

            {/* Step 1 — Event picker */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Step 1 — What happened?
              </p>

              {loadingTriggers ? (
                <div className="space-y-1.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : uniqueEvents.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center space-y-1">
                  <p className="text-sm text-gray-500 font-medium">No active triggers yet</p>
                  <p className="text-xs text-gray-400">
                    Create a trigger first, then come back here to test it.
                  </p>
                  <a href="/triggers/new" className="text-xs text-indigo-600 font-medium hover:text-indigo-700">
                    Create a trigger →
                  </a>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {allOptions.map((opt) => {
                    const active = selectedEvent === opt.event_name;
                    const isCustom = opt.event_name === "__custom__";
                    return (
                      <button
                        key={opt.event_name}
                        type="button"
                        onClick={() => selectEvent(opt.event_name)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                          active
                            ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200"
                            : "border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${active ? "text-indigo-700" : "text-gray-800"}`}>
                            {opt.label}
                          </span>
                          {active && !isCustom && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
                        </div>
                        {!isCustom && (
                          <span className="text-xs text-gray-400 mt-0.5 block font-mono">{opt.event_name}</span>
                        )}
                        {!isCustom && opt.template && (
                          <span className="text-xs text-gray-400 mt-0.5 block">→ {opt.template}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedEvent === "__custom__" && (
                <input
                  className={`${INPUT} mt-2 font-mono`}
                  placeholder="e.g. order.shipped"
                  value={customEvent}
                  onChange={(e) => setCustomEvent(e.target.value)}
                  autoFocus
                />
              )}

              {/* Matching triggers hint */}
              {matchingTriggers.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                  <span className="font-semibold">{matchingTriggers.length}</span>
                  trigger{matchingTriggers.length !== 1 ? "s" : ""} will be evaluated for this event
                </div>
              )}
            </div>

            {/* Step 2 — Who */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Step 2 — Who did it?</p>
              <label className="block text-xs text-gray-500 mb-1">User ID <span className="text-gray-400 font-normal">(any value — e.g. MAR-001, user_123, an email)</span></label>
              <input
                className={INPUT}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Any unique ID for this user"
              />
              <p className="text-xs text-gray-400 mt-1">
                Change this to simulate a different user and bypass the "send once" check.
              </p>
            </div>

            {/* Step 3 — Fields */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Step 3 — Event details</p>
              <p className="text-xs text-gray-400 mb-3">
                These values are checked against your trigger conditions and used to fill in the email.
              </p>
              <div className="space-y-2">
                {fields.map((f, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className={`${INPUT} flex-1 font-mono text-xs`}
                      placeholder="field name"
                      value={f.key}
                      onChange={(e) => setField(i, e.target.value, f.value)}
                    />
                    <span className="text-gray-300 text-sm shrink-0">=</span>
                    <input
                      className={`${INPUT} flex-1 text-xs`}
                      placeholder="value"
                      value={f.value}
                      onChange={(e) => setField(i, f.key, e.target.value)}
                    />
                    <button onClick={() => removeField(i)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0 p-1">
                      <XCircle size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={addField} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                  + Add a field
                </button>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Attachments (optional)</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.csv,image/*"
                className="hidden"
                onChange={handleFiles}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 border border-dashed border-gray-200 hover:border-indigo-300 bg-gray-50 hover:bg-indigo-50 px-4 py-2.5 rounded-xl w-full justify-center transition-colors disabled:opacity-50"
              >
                <Paperclip size={14} />
                {uploading ? "Uploading…" : "Attach files (PDF, CSV, images)"}
              </button>
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {attachments.map((a, i) => (
                    <div key={i} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip size={12} className="text-gray-400 shrink-0" />
                        <span className="text-xs text-gray-700 truncate">{a.filename}</span>
                        <span className="text-xs text-gray-400 shrink-0">{a.contentType.split("/")[1].toUpperCase()}</span>
                      </div>
                      <button onClick={() => removeAttachment(i)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0 ml-2">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                <XCircle size={14} className="shrink-0" /> {error}
              </div>
            )}

            <button
              onClick={fire}
              disabled={loading || (!selectedEvent && !customEvent)}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Play size={14} /> {loading ? "Sending…" : "Send this event"}
            </button>
          </div>
        </div>

        {/* ── Right: Results ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">What happened</span>
            {loading && <span className="text-xs text-indigo-500 animate-pulse">Processing…</span>}
          </div>

          <div className="min-h-72">
            {!result && !loading ? (
              <div className="h-72 flex flex-col items-center justify-center gap-3 text-center p-8">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                  <Play size={18} className="text-gray-200" />
                </div>
                <p className="text-sm text-gray-400">Send an event to see what fires</p>
                <p className="text-xs text-gray-300">Results will appear here</p>
              </div>
            ) : result ? (
              <div className="p-5 space-y-5">
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                  <p className="text-sm text-gray-700">
                    You simulated: <strong className="text-gray-900">{selectedLabel}</strong>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {(result.results?.length ?? 0) === 0
                      ? result.matched === 0
                        ? "No active triggers found for this event name."
                        : "All triggers were skipped."
                      : `${result.results?.length} trigger${result.results?.length !== 1 ? "s" : ""} were checked.`}
                  </p>
                </div>

                {(result.results?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    {result.results.map((r, i) => (
                      <div key={i} className={`rounded-xl border p-4 ${
                        r.status === "sent"      ? "bg-emerald-50 border-emerald-100" :
                        r.status === "scheduled" ? "bg-violet-50 border-violet-100" :
                        r.status === "failed"    ? "bg-red-50 border-red-100" :
                                                   "bg-gray-50 border-gray-100"
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{r.trigger}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {r.status === "sent"
                                ? "✅ Email was sent successfully."
                                : r.status === "scheduled"
                                ? `🕐 Scheduled — will be sent on ${new Date(r.send_at!).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}.`
                                : r.status === "failed"
                                ? `❌ Something went wrong: ${r.reason ?? "unknown error"}`
                                : `⏭ Skipped — ${REASON_LABELS[r.reason ?? ""] ?? r.reason ?? "no reason given"}.`}
                            </p>
                          </div>
                          <StatusBadge status={r.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {showRaw ? "Hide" : "Show"} technical details
                  </button>
                  {showRaw && (
                    <pre className="mt-2 text-xs font-mono bg-gray-900 text-green-400 rounded-xl p-4 overflow-auto max-h-48">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={14} className="text-amber-500" />
          <p className="text-sm font-semibold text-amber-900">How this works</p>
        </div>
        <ol className="space-y-2">
          {[
            { title: "Event is recorded",       desc: "The system logs what happened and who it happened to." },
            { title: "Triggers are checked",     desc: "Every active trigger listening for this event is found." },
            { title: "Conditions are evaluated", desc: "Each trigger's conditions are tested against the event details you provided." },
            { title: "Duplicates are prevented", desc: "If \"send only once\" is on and this user already got the email, it's skipped." },
            { title: "Email is sent",            desc: "The matching template is filled in with the event details and delivered." },
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <div>
                <span className="text-sm font-medium text-amber-900">{step.title} — </span>
                <span className="text-sm text-amber-700">{step.desc}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "sent") return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
      <CheckCircle2 size={11} /> Sent
    </span>
  );
  if (status === "scheduled") return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-100 border border-violet-200 px-2.5 py-1 rounded-full shrink-0">
      <CalendarClock size={11} /> Scheduled
    </span>
  );
  if (status === "skipped") return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-full shrink-0">
      <Clock size={11} /> Skipped
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-100 border border-red-200 px-2.5 py-1 rounded-full shrink-0">
      <XCircle size={11} /> Failed
    </span>
  );
}

const INPUT = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white transition";
