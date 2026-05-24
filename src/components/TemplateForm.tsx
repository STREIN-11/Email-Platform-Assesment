"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Template } from "@/types";
import AiHelper from "@/components/AiHelper";
import { Eye, Code2, Send, Save, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

const EMPTY: Partial<Template> = {
  name: "", description: "", subject: "", html_body: "", tags: [], placeholders: [],
};

type Toast = { type: "success" | "error"; msg: string } | null;

export default function TemplateForm({ initial }: { initial?: Template }) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<Template>>(initial ?? EMPTY);
  const [tab, setTab] = useState<"code" | "preview">("code");
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const set = (k: keyof Template, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function save() {
    setSaving(true);
    const method = initial ? "PUT" : "POST";
    const url = initial ? `/api/templates/${initial.id}` : "/api/templates";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      showToast("success", initial ? "Template saved." : "Template created.");
      if (!initial) router.push("/templates");
    } else {
      showToast("error", "Failed to save.");
    }
  }

  async function sendTest() {
    if (!testEmail) return;
    setTestSending(true);
    const res = await fetch("/api/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: initial?.id, to: testEmail, sample_data: { name: "Test User", email: testEmail } }),
    });
    const data = await res.json();
    setTestSending(false);
    showToast(data.provider_id ? "success" : "error", data.provider_id ? `Sent! ID: ${data.provider_id}` : data.error);
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
        <button onClick={() => router.push("/templates")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={15} /> Templates
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Save size={14} /> {saving ? "Saving…" : initial ? "Save Changes" : "Create Template"}
        </button>
      </div>

      {/* Main form card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Template Name">
            <input
              className={INPUT}
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Welcome to Paid"
            />
          </Field>
          <Field label="Subject Line">
            <input
              className={`${INPUT} mono`}
              value={form.subject ?? ""}
              onChange={(e) => set("subject", e.target.value)}
              placeholder="Welcome to {{plan}}, {{name}}!"
            />
          </Field>
        </div>

        <Field label="Description" hint="Optional — shown in the template library">
          <input
            className={INPUT}
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Sent when a user upgrades their plan"
          />
        </Field>

        <Field label="Tags" hint="Comma separated">
          <input
            className={INPUT}
            value={(form.tags ?? []).join(", ")}
            onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            placeholder="onboarding, paid, upgrade"
          />
        </Field>
      </div>

      {/* AI Helper */}
      <AiHelper
        currentHtml={form.html_body ?? ""}
        currentSubject={form.subject ?? ""}
        onApplyHtml={(html) => set("html_body", html)}
        onApplySubject={(subject) => set("subject", subject)}
      />

      {/* HTML Editor */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center border-b border-gray-100 px-4 pt-1">
          <TabBtn active={tab === "code"} onClick={() => setTab("code")} icon={<Code2 size={13} />} label="HTML" />
          <TabBtn active={tab === "preview"} onClick={() => setTab("preview")} icon={<Eye size={13} />} label="Preview" />
          <div className="ml-auto py-2">
            <span className="text-xs text-gray-400">Use <code className="bg-gray-100 px-1 rounded text-gray-600">{"{{placeholder}}"}</code> for dynamic values</span>
          </div>
        </div>

        {tab === "code" ? (
          <textarea
            className="w-full px-5 py-4 text-sm mono focus:outline-none min-h-72 resize-y bg-[#fafafa] text-gray-800"
            value={form.html_body ?? ""}
            onChange={(e) => set("html_body", e.target.value)}
            placeholder={"<p>Hi {{name}}, welcome to {{plan}}!</p>"}
            spellCheck={false}
          />
        ) : (
          <div
            className="px-5 py-4 min-h-72 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: form.html_body ?? "<p class='text-gray-400 text-sm'>Nothing to preview yet.</p>" }}
          />
        )}
      </div>

      {/* Test send */}
      {initial && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
              <Send size={13} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Send Test Email</p>
              <p className="text-xs text-gray-400">Renders the template with sample data and delivers via Resend</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              className={`${INPUT} flex-1`}
              placeholder="recipient@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <button
              onClick={sendTest}
              disabled={testSending || !testEmail}
              className="bg-gray-900 text-white text-sm px-5 py-2 rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors font-medium"
            >
              {testSending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const INPUT = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white transition";

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

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
        active ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
      }`}
    >
      {icon} {label}
    </button>
  );
}
