"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trigger, Template, Condition } from "@/types";
import ConditionBuilder from "@/components/ConditionBuilder";

const EMPTY: Partial<Trigger> = {
  name: "", event_name: "", template_id: "", conditions: [], once_per_user: true, active: true,
};

export default function TriggerForm({ initial }: { initial?: Trigger }) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<Trigger>>(initial ?? EMPTY);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then(setTemplates);
  }, []);

  const set = (k: keyof Trigger, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    const method = initial ? "PUT" : "POST";
    const url = initial ? `/api/triggers/${initial.id}` : "/api/triggers";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    router.push("/triggers");
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Name</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.name ?? ""}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Welcome to Paid"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.event_name ?? ""}
            onChange={(e) => set("event_name", e.target.value)}
            placeholder="user.plan_upgraded"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
        <select
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={form.template_id ?? ""}
          onChange={(e) => set("template_id", e.target.value)}
        >
          <option value="">Select a template…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <ConditionBuilder
        conditions={form.conditions ?? []}
        onChange={(c: Condition[]) => set("conditions", c)}
      />

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.once_per_user ?? true}
            onChange={(e) => set("once_per_user", e.target.checked)}
            className="rounded"
          />
          Send only once per user
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.active ?? true}
            onChange={(e) => set("active", e.target.checked)}
            className="rounded"
          />
          Active
        </label>
      </div>

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : initial ? "Save Changes" : "Create Trigger"}
        </button>
        <button onClick={() => router.push("/triggers")} className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}
