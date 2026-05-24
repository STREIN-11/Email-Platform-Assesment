"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trigger, Template, Condition } from "@/types";
import ConditionBuilder from "@/components/ConditionBuilder";
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Zap, SlidersHorizontal, ShieldCheck, Info, Calendar } from "lucide-react";

// ─── Preset events a non-technical user can pick from ────────────────────────
const EVENT_OPTIONS = [
  { value: "user.plan_upgraded",      label: "User upgrades their plan",           example: "When someone goes from Free → Pro" },
  { value: "user.signed_up",          label: "New user signs up",                  example: "When someone creates an account" },
  { value: "user.trial_started",      label: "User starts a free trial",           example: "When a trial period begins" },
  { value: "user.trial_ended",        label: "Free trial ends",                    example: "When a trial expires" },
  { value: "user.payment_failed",     label: "Payment fails",                      example: "When a charge is declined" },
  { value: "user.subscription_cancelled", label: "User cancels their subscription", example: "When someone downgrades to free" },
  { value: "user.storage_cap_hit",    label: "User hits their storage limit",      example: "When storage usage reaches 100%" },
  { value: "user.inactive_14d",       label: "User inactive for 14 days",          example: "Re-engagement nudge" },
  { value: "user.milestone_reached",  label: "User reaches a milestone",           example: "e.g. 100th project, 1 year anniversary" },
  { value: "__custom__",              label: "Custom event…",                      example: "Type your own event name" },
];

const EMPTY: Partial<Trigger> = {
  name: "", event_name: "", template_id: "", conditions: [], once_per_user: true, active: true,
  scheduled_for: null, schedule_timezone: "UTC",
};

type Toast = { type: "success" | "error"; msg: string } | null;

export default function TriggerForm({ initial }: { initial?: Trigger }) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<Trigger>>(initial ?? EMPTY);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then((d) => setTemplates(Array.isArray(d) ? d : []));
  }, []);

  const set = (k: keyof Trigger, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  // Convert a datetime-local string ("YYYY-MM-DDTHH:mm") + IANA timezone → UTC ISO string
  function toUTC(localDt: string, tz: string): string {
    // Parse as if it's in the given timezone by formatting a known UTC date and finding the offset
    const [datePart, timePart] = localDt.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);
    // Use Intl to find what UTC time corresponds to this local time in the given tz
    const approx = new Date(Date.UTC(year, month - 1, day, hour, minute));
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const parts = Object.fromEntries(formatter.formatToParts(approx).filter(p => p.type !== "literal").map(p => [p.type, p.value]));
    const tzLocal = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute));
    const offset = tzLocal.getTime() - approx.getTime();
    return new Date(approx.getTime() - offset).toISOString();
  }

  // Convert a UTC ISO string back to "YYYY-MM-DDTHH:mm" in the given timezone (for the input value)
  function fromUTC(utcIso: string, tz: string): string {
    try {
      const d = new Date(utcIso);
      if (isNaN(d.getTime())) return utcIso.slice(0, 16);
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
      const parts = Object.fromEntries(formatter.formatToParts(d).filter(p => p.type !== "literal").map(p => [p.type, p.value]));
      return `${parts.year}-${parts.month}-${parts.day}T${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`;
    } catch {
      return utcIso.slice(0, 16);
    }
  }

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function save() {
    setSaving(true);
    const method = initial ? "PUT" : "POST";
    const url = initial ? `/api/triggers/${initial.id}` : "/api/triggers";
    const tz = form.schedule_timezone ?? "UTC";
    const payload = {
      ...form,
      scheduled_for: form.scheduled_for ? toUTC(form.scheduled_for.slice(0, 16), tz) : null,
    };
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      showToast("success", initial ? "Trigger saved." : "Trigger created.");
      if (!initial) router.push("/triggers");
    } else {
      showToast("error", "Failed to save.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
          toast.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/triggers")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={15} /> Triggers
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Save size={14} /> {saving ? "Saving…" : initial ? "Save Changes" : "Create Trigger"}
        </button>
      </div>

      {/* Section: Identity */}
      <Section icon={<Zap size={14} className="text-amber-500" />} title="Trigger Identity" desc="Give this trigger a name, choose what event starts it, and pick which email to send.">
        <Field label="Trigger Name" hint="Internal label — only you see this">
          <input className={INPUT} value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Welcome to Paid" />
        </Field>
        <EventPicker
          value={form.event_name ?? ""}
          onChange={(v) => set("event_name", v)}
        />
        <Field label="Which email should be sent?">
          <select className={INPUT} value={form.template_id ?? ""} onChange={(e) => set("template_id", e.target.value)}>
            <option value="">Select a template…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      </Section>

      {/* Section: Conditions */}
      <Section icon={<SlidersHorizontal size={14} className="text-indigo-500" />} title="Conditions" desc="All conditions must match for this trigger to fire.">
        <ConditionBuilder
          conditions={form.conditions ?? []}
          onChange={(c: Condition[]) => set("conditions", c)}
        />
      </Section>

      {/* Section: Schedule */}
      <Section icon={<Calendar size={14} className="text-violet-500" />} title="Schedule (Optional)" desc="Send this email at a specific date and time instead of immediately.">
        <SchedulePicker
          value={form.scheduled_for ? fromUTC(form.scheduled_for, form.schedule_timezone ?? "UTC") : null}
          timezone={form.schedule_timezone ?? "UTC"}
          onChangeDate={(v) => set("scheduled_for", v)}
          onChangeTimezone={(v) => set("schedule_timezone", v)}
        />
      </Section>

      {/* Section: Delivery rules */}
      <Section icon={<ShieldCheck size={14} className="text-emerald-500" />} title="Delivery Rules" desc="Control deduplication and activation.">
        <div className="flex flex-col gap-3">
          <Toggle
            checked={form.once_per_user ?? true}
            onChange={(v) => set("once_per_user", v)}
            label="Send only once per user"
            desc="Prevents duplicate sends to the same recipient"
          />
          <Toggle
            checked={form.active ?? true}
            onChange={(v) => set("active", v)}
            label="Active"
            desc="Inactive triggers are skipped during event processing"
          />
        </div>
      </Section>
    </div>
  );
}

const INPUT = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white transition";

function EventPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isCustom = value !== "" && !EVENT_OPTIONS.slice(0, -1).find((e) => e.value === value);
  const selected = EVENT_OPTIONS.find((e) => e.value === value);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="text-sm font-medium text-gray-700">When does this email fire?</label>
      </div>

      {/* Preset cards */}
      <div className="grid grid-cols-1 gap-1.5">
        {EVENT_OPTIONS.map((opt) => {
          const active = isCustom ? opt.value === "__custom__" : value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value === "__custom__" ? "" : opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                active
                  ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300"
                  : "border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${active ? "text-indigo-700" : "text-gray-800"}`}>{opt.label}</span>
                {active && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
              </div>
              <span className="text-xs text-gray-400 mt-0.5 block">{opt.example}</span>
            </button>
          );
        })}
      </div>

      {/* Custom input */}
      {(isCustom || value === "") && (
        <div className="pt-1">
          <input
            className={`${INPUT} mono`}
            placeholder="e.g. order.shipped"
            value={isCustom ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-1">This must exactly match the event name your app sends.</p>
        </div>
      )}

      {/* Live confirmation */}
      {value && !isCustom && selected && selected.value !== "__custom__" && (
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
          <Info size={13} className="text-indigo-400 shrink-0" />
          <p className="text-xs text-indigo-700">
            This trigger fires when: <strong>{selected.label.toLowerCase()}</strong>.
            The system listens for the event code <code className="bg-indigo-100 px-1 rounded mono">{value}</code>.
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">{icon}</div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc: string }) {
  return (
    <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ml-4 ${checked ? "bg-indigo-500" : "bg-gray-200"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
      </div>
    </label>
  );
}

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Kolkata", "Asia/Singapore",
  "Asia/Tokyo", "Australia/Sydney",
];

function SchedulePicker({ value, timezone, onChangeDate, onChangeTimezone }: {
  value: string | null;
  timezone: string;
  onChangeDate: (v: string | null) => void;
  onChangeTimezone: (v: string) => void;
}) {
  const enabled = !!value;

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors">
        <div>
          <p className="text-sm font-medium text-gray-800">Schedule for a specific date & time</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {enabled
              ? "Email will be queued and sent at the chosen time"
              : "Off — email sends immediately when the event fires"}
          </p>
        </div>
        <div
          onClick={() => onChangeDate(enabled ? null : new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16))}
          className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ml-4 ${enabled ? "bg-violet-500" : "bg-gray-200"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-4" : ""}`} />
        </div>
      </label>

      {/* Date/time + timezone pickers */}
      {enabled && (
        <div className="space-y-3 pl-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Send on</label>
              <input
                type="datetime-local"
                className="w-full border border-violet-200 bg-violet-50 text-violet-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition"
                value={value?.slice(0, 16) ?? ""}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => onChangeDate(e.target.value || null)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Timezone</label>
              <select
                className="w-full border border-violet-200 bg-violet-50 text-violet-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition"
                value={timezone}
                onChange={(e) => onChangeTimezone(e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Confirmation */}
          {value && (
            <div className="flex items-start gap-2 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
              <Calendar size={14} className="text-violet-400 mt-0.5 shrink-0" />
              <p className="text-xs text-violet-700">
                This email will be <strong>queued</strong> when the event fires, then delivered on{" "}
                <strong>
                  {value.slice(0, 16).replace("T", " at ").replace(/:(\d{2})$/, (_, m) => {
                    const [h, min] = value.slice(11, 16).split(":").map(Number);
                    const ampm = h >= 12 ? "PM" : "AM";
                    const h12 = h % 12 || 12;
                    return `:${String(min).padStart(2, "0")} ${ampm}`;
                  }).replace(/^(\d{4})-(\d{2})-(\d{2})/, (_, y, mo, d) =>
                    new Date(+y, +mo - 1, +d).toLocaleDateString("en-US", { dateStyle: "full" })
                  )}
                </strong>{" "}({timezone}).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
