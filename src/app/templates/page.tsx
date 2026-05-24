"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Template } from "@/types";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(q = "") {
    setLoading(true);
    const res = await fetch(`/api/templates?search=${encodeURIComponent(q)}`);
    setTemplates(await res.json());
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
        <Link href="/templates/new" className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus size={16} /> New Template
        </Link>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Search by name, description, or tag…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); load(e.target.value); }}
        />
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : templates.length === 0 ? (
        <p className="text-gray-400 text-sm">No templates yet. <Link href="/templates/new" className="text-indigo-600">Create one →</Link></p>
      ) : (
        <div className="grid gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{t.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{t.description}</p>
                <p className="text-xs text-gray-400 mt-1">Subject: {t.subject}</p>
                {t.tags?.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {t.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <Link href={`/templates/${t.id}`} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
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
