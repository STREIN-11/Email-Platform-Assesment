"use client";
import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Wand2 } from "lucide-react";

type Action = "improve" | "rewrite" | "draft" | "subject_variants";

const ACTIONS: { value: Action; label: string; desc: string }[] = [
  { value: "improve", label: "Improve", desc: "Enhance clarity and tone" },
  { value: "rewrite", label: "Rewrite", desc: "Rewrite in a different tone" },
  { value: "draft", label: "Draft", desc: "Generate from a description" },
  { value: "subject_variants", label: "Subject Variants", desc: "5 subject line options" },
];

interface Props {
  currentHtml: string;
  currentSubject: string;
  onApplyHtml: (html: string) => void;
  onApplySubject: (subject: string) => void;
}

export default function AiHelper({ currentHtml, currentSubject, onApplyHtml, onApplySubject }: Props) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<Action>("improve");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | string[] | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    const content = action === "subject_variants" ? currentSubject : currentHtml;
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, content, extra }),
    });
    const data = await res.json();
    setResult(data.result ?? data.variants ?? null);
    setLoading(false);
  }

  return (
    <div className={`rounded-2xl border transition-all ${open ? "border-indigo-200 bg-indigo-50/40 shadow-sm" : "border-gray-100 bg-white shadow-sm"}`}>
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Sparkles size={12} className="text-indigo-600" />
          </div>
          <span className="font-semibold text-gray-800">AI Content Helper</span>
          <span className="text-xs text-gray-400 hidden sm:block">Draft, rewrite, or improve your email copy</span>
        </div>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-indigo-100">
          {/* Action tabs */}
          <div className="flex gap-2 flex-wrap pt-4">
            {ACTIONS.map((a) => (
              <button
                key={a.value}
                onClick={() => { setAction(a.value); setResult(null); }}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                  action === a.value
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Context input */}
          {(action === "draft" || action === "rewrite") && (
            <input
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white"
              placeholder={action === "draft" ? "Describe the email (e.g. 'welcome email for new paid users')" : "Tone (e.g. friendly, professional, urgent)"}
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
            />
          )}

          <button
            onClick={run}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
          >
            <Wand2 size={13} /> {loading ? "Generating…" : "Generate"}
          </button>

          {/* Results */}
          {result && (
            <div className="space-y-2">
              {Array.isArray(result) ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 mb-2">Subject line variants — click to use</p>
                  {result.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => onApplySubject(v)}
                      className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-left hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group"
                    >
                      <span className="text-gray-800">{v}</span>
                      <span className="text-xs text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">Use →</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Generated content</span>
                    <button
                      onClick={() => onApplyHtml(result)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      Apply to editor →
                    </button>
                  </div>
                  <div
                    className="px-4 py-3 text-sm text-gray-700 max-h-48 overflow-y-auto prose prose-sm"
                    dangerouslySetInnerHTML={{ __html: result }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
