"use client";
import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";

type Action = "draft" | "rewrite" | "subject_variants" | "improve";

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
    <div className="border border-indigo-200 rounded-xl bg-indigo-50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-indigo-700"
      >
        <span className="flex items-center gap-2"><Sparkles size={16} /> AI Content Helper</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {(["improve", "rewrite", "draft", "subject_variants"] as Action[]).map((a) => (
              <button
                key={a}
                onClick={() => setAction(a)}
                className={`text-xs px-3 py-1 rounded-full border font-medium ${action === a ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-indigo-600 border-indigo-300"}`}
              >
                {a === "subject_variants" ? "Subject Variants" : a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>

          {action === "draft" && (
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Describe the email (e.g. 'welcome email for new paid users')"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
            />
          )}
          {action === "rewrite" && (
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Tone (e.g. friendly, professional, urgent)"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
            />
          )}

          <button
            onClick={run}
            disabled={loading}
            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate"}
          </button>

          {result && (
            <div className="space-y-2">
              {Array.isArray(result) ? (
                result.map((v, i) => (
                  <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <span>{v}</span>
                    <button onClick={() => onApplySubject(v)} className="text-xs text-indigo-600 font-medium ml-2 shrink-0">Use</button>
                  </div>
                ))
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-2 font-medium">Preview</div>
                  <div className="text-sm text-gray-700 max-h-40 overflow-y-auto" dangerouslySetInnerHTML={{ __html: result }} />
                  <button onClick={() => onApplyHtml(result)} className="mt-2 text-xs text-indigo-600 font-medium">Apply to editor</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
