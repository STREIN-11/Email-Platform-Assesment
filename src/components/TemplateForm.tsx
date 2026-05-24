"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Template } from "@/types";
import AiHelper from "@/components/AiHelper";
import EmailBodyEditor, { Block, blocksToHtml, htmlToBlocks } from "@/components/EmailBodyEditor";
import { Send, Save, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

const EMPTY: Partial<Template> = {
  name: "", description: "", subject: "", html_body: "", tags: [], placeholders: [],
};

type Toast = { type: "success" | "error"; msg: string } | null;

export default function TemplateForm({ initial }: { initial?: Template }) {
  const router = useRouter();
  const [form, setForm]     = useState<Partial<Template>>(initial ?? EMPTY);
  const [blocks, setBlocks] = useState<Block[]>(() => htmlToBlocks(initial?.html_body ?? ""));

  // Keep a live HTML string for the AI helper so it always sees current content
  const currentHtml = blocksToHtml(blocks);
  const [testEmail, setTestEmail]     = useState("");
  const [testSending, setTestSending] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState<Toast>(null);

  const set = (k: keyof Template, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function save() {
    setSaving(true);
    const html = blocksToHtml(blocks);
    const method = initial ? "PUT" : "POST";
    const url    = initial ? `/api/templates/${initial.id}` : "/api/templates";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, html_body: html }),
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
      body: JSON.stringify({
        template_id: initial?.id,
        to: testEmail,
        sample_data: { name: "Test User", email: testEmail },
      }),
    });
    const data = await res.json();
    setTestSending(false);
    showToast(
      data.provider_id ? "success" : "error",
      data.provider_id ? `Sent! ID: ${data.provider_id}` : data.error
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
          toast.type === "success"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/templates")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
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

      {/* Details card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Template Name">
            <input
              className={INPUT}
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Welcome to Paid"
            />
          </Field>
          <Field label="Subject Line" hint="What the recipient sees in their inbox">
            <input
              className={INPUT}
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

        <Field label="Tags" hint="Comma separated — helps you find this template later">
          <input
            className={INPUT}
            value={(form.tags ?? []).join(", ")}
            onChange={(e) =>
              set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
            }
            placeholder="onboarding, paid, upgrade"
          />
        </Field>
      </div>

      {/* AI Helper */}
      <AiHelper
        currentHtml={currentHtml}
        currentSubject={form.subject ?? ""}
        onApplyHtml={(html) => {
          const parsed = htmlToBlocks(html);
          setBlocks(parsed.length ? parsed : [{ id: Math.random().toString(36).slice(2), type: "text", content: html.replace(/<[^>]+>/g, "").trim() }]);
        }}
        onApplySubject={(subject) => set("subject", subject)}
      />

      {/* Visual block editor */}
      <div>
        <div className="mb-2">
          <p className="text-sm font-semibold text-gray-800">Email Body</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Build your email by adding blocks — no coding needed.
          </p>
        </div>
        <EmailBodyEditor blocks={blocks} onChange={setBlocks} />
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
              <p className="text-xs text-gray-400">
                Sends a real email with sample data so you can see exactly how it looks
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              className={`${INPUT} flex-1`}
              placeholder="your@email.com"
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

const INPUT =
  "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white transition";

function Field({
  label, hint, children,
}: {
  label: string; hint?: string; children: React.ReactNode;
}) {
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
