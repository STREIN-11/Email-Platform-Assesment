"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Template } from "@/types";
import AiHelper from "@/components/AiHelper";
import { Eye, Send } from "lucide-react";

const EMPTY: Partial<Template> = {
  name: "", description: "", subject: "", html_body: "", tags: [], placeholders: [],
};

export default function TemplateForm({ initial }: { initial?: Template }) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<Template>>(initial ?? EMPTY);
  const [preview, setPreview] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k: keyof Template, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    const method = initial ? "PUT" : "POST";
    const url = initial ? `/api/templates/${initial.id}` : "/api/templates";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    router.push("/templates");
  }

  async function sendTest() {
    if (!testEmail) return;
    setTestSending(true);
    setTestMsg("");
    const res = await fetch("/api/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: initial?.id, to: testEmail, sample_data: { name: "Test User", email: testEmail } }),
    });
    const data = await res.json();
    setTestMsg(data.provider_id ? `✓ Sent! ID: ${data.provider_id}` : `✗ ${data.error}`);
    setTestSending(false);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.name ?? ""}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Welcome to Paid"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={form.subject ?? ""}
            onChange={(e) => set("subject", e.target.value)}
            placeholder="Welcome to {{plan}}, {{name}}!"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={form.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Sent when a user upgrades their plan"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          value={(form.tags ?? []).join(", ")}
          onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
          placeholder="onboarding, paid, upgrade"
        />
      </div>

      <AiHelper
        currentHtml={form.html_body ?? ""}
        currentSubject={form.subject ?? ""}
        onApplyHtml={(html) => set("html_body", html)}
        onApplySubject={(subject) => set("subject", subject)}
      />

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">HTML Body</label>
          <button
            onClick={() => setPreview(!preview)}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
          >
            <Eye size={14} /> {preview ? "Edit" : "Preview"}
          </button>
        </div>
        {preview ? (
          <div
            className="border border-gray-200 rounded-lg p-4 bg-white min-h-48"
            dangerouslySetInnerHTML={{ __html: form.html_body ?? "" }}
          />
        ) : (
          <textarea
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-64"
            value={form.html_body ?? ""}
            onChange={(e) => set("html_body", e.target.value)}
            placeholder="<p>Hi {{name}}, welcome to {{plan}}!</p>"
          />
        )}
        <p className="text-xs text-gray-400 mt-1">Use {"{{placeholder}}"} syntax for dynamic values.</p>
      </div>

      {initial && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700 flex items-center gap-2"><Send size={14} /> Send Test Email</p>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="recipient@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <button
              onClick={sendTest}
              disabled={testSending}
              className="bg-gray-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-900 disabled:opacity-50"
            >
              {testSending ? "Sending…" : "Send"}
            </button>
          </div>
          {testMsg && <p className="text-sm text-gray-600">{testMsg}</p>}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : initial ? "Save Changes" : "Create Template"}
        </button>
        <button onClick={() => router.push("/templates")} className="text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}
