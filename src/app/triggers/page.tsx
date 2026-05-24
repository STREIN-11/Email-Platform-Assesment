"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Trigger } from "@/types";
import { Plus, Pencil, Trash2, Zap } from "lucide-react";

export default function TriggersPage() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/triggers").then((r) => r.json()).then((d) => { setTriggers(d); setLoading(false); });
  }, []);

  async function del(id: string) {
    if (!confirm("Delete this trigger?")) return;
    await fetch(`/api/triggers/${id}`, { method: "DELETE" });
    setTriggers((t) => t.filter((x) => x.id !== id));
  }

  async function toggle(t: Trigger) {
    const res = await fetch(`/api/triggers/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !t.active }),
    });
    const updated = await res.json();
    setTriggers((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Triggers</h1>
        <Link href="/triggers/new" className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={16} /> New Trigger
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : triggers.length === 0 ? (
        <p className="text-gray-400 text-sm">No triggers yet. <Link href="/triggers/new" className="text-indigo-600">Create one →</Link></p>
      ) : (
        <div className="grid gap-4">
          {triggers.map((t) => (
            <div key={t.id} className={`bg-white border rounded-xl p-5 flex items-start justify-between ${t.active ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-indigo-500" />
                  <h2 className="font-semibold text-gray-900">{t.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {t.active ? "active" : "paused"}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Event: <code className="bg-gray-100 px-1 rounded text-xs">{t.event_name}</code>
                  {" → "}
                  <span className="text-gray-700">{t.templates?.name ?? t.template_id}</span>
                </p>
                <p className="text-xs text-gray-400">
                  {t.conditions?.length ?? 0} condition(s) · {t.once_per_user ? "once per user" : "every time"}
                </p>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button onClick={() => toggle(t)} className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-500 hover:border-indigo-300 hover:text-indigo-600">
                  {t.active ? "Pause" : "Resume"}
                </button>
                <Link href={`/triggers/${t.id}`} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                  <Pencil size={16} />
                </Link>
                <button onClick={() => del(t.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
