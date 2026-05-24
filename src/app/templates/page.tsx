"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Template } from "@/types";
import { Search, Plus, Pencil, Trash2, LayoutTemplate } from "lucide-react";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(q = "") {
    setLoading(true);
    const res = await fetch(`/api/templates?search=${encodeURIComponent(q)}`);
    const data = await res.json();
    setTemplates(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function del(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    setTemplates((t) => t.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">{templates.length} template{templates.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/templates/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={15} /> New Template
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 shadow-sm transition"
          placeholder="Search by name, description, or tag…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); load(e.target.value); }}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate size={28} className="text-gray-300" />}
          title="No templates yet"
          desc="Create your first email template to get started."
          action={<Link href="/templates/new" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Create template →</Link>}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Subject</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Tags</th>
                <th className="px-5 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900">{t.name}</div>
                    {t.description && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{t.description}</div>}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="mono text-xs text-gray-500 truncate block max-w-xs">{t.subject}</span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <div className="flex gap-1.5 flex-wrap">
                      {t.tags?.map((tag) => (
                        <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/templates/${t.id}`} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
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

function EmptyState({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center text-center gap-3">
      {icon}
      <p className="font-semibold text-gray-700">{title}</p>
      <p className="text-sm text-gray-400">{desc}</p>
      {action}
    </div>
  );
}
