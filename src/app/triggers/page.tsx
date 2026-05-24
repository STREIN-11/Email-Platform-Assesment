"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Trigger } from "@/types";
import { Plus, Pencil, Trash2, Zap } from "lucide-react";

export default function TriggersPage() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/triggers")
      .then((r) => r.json())
      .then((d) => { setTriggers(Array.isArray(d) ? d : []); setLoading(false); });
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
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Triggers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{triggers.length} trigger{triggers.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/triggers/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={15} /> New Trigger
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : triggers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center text-center gap-3">
          <Zap size={28} className="text-gray-200" />
          <p className="font-semibold text-gray-700">No triggers yet</p>
          <p className="text-sm text-gray-400">Create a trigger to start automating email delivery.</p>
          <Link href="/triggers/new" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Create trigger →</Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trigger</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Event</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Template</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {triggers.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t.conditions?.length ?? 0} condition{(t.conditions?.length ?? 0) !== 1 ? "s" : ""}</div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg mono">{t.event_name}</code>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <span className="text-sm text-gray-600">{(t as Trigger & { templates?: { name: string } }).templates?.name ?? "—"}</span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => toggle(t)}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                        t.active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${t.active ? "bg-emerald-500" : "bg-gray-400"}`} />
                      {t.active ? "Active" : "Paused"}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/triggers/${t.id}`} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Pencil size={14} />
                      </Link>
                      <button onClick={() => del(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
