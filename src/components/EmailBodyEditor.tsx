"use client";
import { useState } from "react";
import { Heading2, AlignLeft, List, MousePointerClick, Minus, Plus, Trash2, GripVertical, MoveUp, MoveDown, Eye, EyeOff } from "lucide-react";

// ─── Block types ──────────────────────────────────────────────────────────────
export type BlockType = "heading" | "text" | "bullets" | "button" | "divider";

export interface Block {
  id: string;
  type: BlockType;
  content: string;   // heading/text/button label
  items?: string[];  // bullet list items
  url?: string;      // button href
}

const BLOCK_DEFS: { type: BlockType; icon: React.ReactNode; label: string; desc: string }[] = [
  { type: "heading",  icon: <Heading2 size={14} />,          label: "Heading",   desc: "A bold section title" },
  { type: "text",     icon: <AlignLeft size={14} />,         label: "Paragraph", desc: "A block of text" },
  { type: "bullets",  icon: <List size={14} />,              label: "Bullet list", desc: "A list of items" },
  { type: "button",   icon: <MousePointerClick size={14} />, label: "Button",    desc: "A call-to-action link" },
  { type: "divider",  icon: <Minus size={14} />,             label: "Divider",   desc: "A horizontal line" },
];

function newBlock(type: BlockType): Block {
  const id = Math.random().toString(36).slice(2);
  if (type === "bullets") return { id, type, content: "", items: [""] };
  if (type === "button")  return { id, type, content: "Get started", url: "https://" };
  if (type === "divider") return { id, type, content: "" };
  return { id, type, content: "" };
}

// ─── HTML serialiser ──────────────────────────────────────────────────────────
export function blocksToHtml(blocks: Block[]): string {
  return blocks.map((b) => {
    switch (b.type) {
      case "heading":
        return `<h2 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 12px">${b.content}</h2>`;
      case "text":
        return `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px">${b.content.replace(/\n/g, "<br>")}</p>`;
      case "bullets":
        return `<ul style="font-size:15px;color:#374151;line-height:1.8;margin:0 0 16px;padding-left:20px">${
          (b.items ?? []).map((item) => `<li>${item}</li>`).join("")
        }</ul>`;
      case "button":
        return `<p style="margin:20px 0"><a href="${b.url ?? "#"}" style="display:inline-block;background:#4f46e5;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">${b.content}</a></p>`;
      case "divider":
        return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">`;
      default:
        return "";
    }
  }).join("\n");
}

// ─── HTML → blocks (robust parser for AI-generated HTML) ───────────────────
export function htmlToBlocks(html: string): Block[] {
  if (!html.trim()) return [];

  const blocks: Block[] = [];

  // Normalise: collapse whitespace, strip wrapping code fences if AI added them
  const clean = html
    .replace(/```[\w]*\n?/g, "")
    .replace(/\n?```/g, "")
    .trim();

  // Split on block-level tags
  const parts = clean.split(/(?=<(?:h[1-6]|p|ul|ol|hr|div|table)[\s>])/i).filter((s) => s.trim());

  for (const part of parts) {
    const id = Math.random().toString(36).slice(2);
    const stripped = part.replace(/<[^>]+>/g, "").trim();

    if (/^<h[1-6]/i.test(part)) {
      blocks.push({ id, type: "heading", content: stripped });
    } else if (/^<hr/i.test(part)) {
      blocks.push({ id, type: "divider", content: "" });
    } else if (/^<[uo]l/i.test(part)) {
      const items = [...part.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
        .filter(Boolean);
      blocks.push({ id, type: "bullets", content: "", items: items.length ? items : [""] });
    } else if (/background.*#4f46e5|display.*inline-block.*border-radius/i.test(part)) {
      // Button block (from our own serialiser)
      const label = part.match(/style="[^"]*">([^<]+)<\/a>/)?.[1] ?? "Get started";
      const url   = part.match(/href="([^"]*)"/)?.[1] ?? "https://";
      blocks.push({ id, type: "button", content: label, url });
    } else if (stripped) {
      // Everything else → paragraph
      const content = part.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
      if (content) blocks.push({ id, type: "text", content });
    }
  }

  // Fallback: if nothing parsed, dump the whole thing as a single text block
  if (blocks.length === 0) {
    const fallback = clean.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
    if (fallback) {
      blocks.push({ id: Math.random().toString(36).slice(2), type: "text", content: fallback });
    }
  }

  return blocks;
}

// ─── Individual block editors ─────────────────────────────────────────────────
function BlockEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const TA = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white resize-none transition";
  const IN = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white transition";

  if (block.type === "heading") return (
    <input className={`${IN} text-base font-bold`} placeholder="Section heading…" value={block.content}
      onChange={(e) => onChange({ ...block, content: e.target.value })} />
  );

  if (block.type === "text") return (
    <textarea className={TA} rows={3} placeholder="Write your paragraph here… Use {{name}} for personalisation."
      value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} />
  );

  if (block.type === "bullets") {
    const items = block.items ?? [""];
    return (
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-gray-300 text-lg leading-none shrink-0">•</span>
            <input className={IN} placeholder={`Item ${i + 1}…`} value={item}
              onChange={(e) => {
                const next = [...items]; next[i] = e.target.value;
                onChange({ ...block, items: next });
              }} />
            {items.length > 1 && (
              <button onClick={() => onChange({ ...block, items: items.filter((_, idx) => idx !== i) })}
                className="text-gray-300 hover:text-red-400 transition-colors shrink-0"><Trash2 size={13} /></button>
            )}
          </div>
        ))}
        <button onClick={() => onChange({ ...block, items: [...items, ""] })}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
          + Add item
        </button>
      </div>
    );
  }

  if (block.type === "button") return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Button label</label>
        <input className={IN} placeholder="Get started" value={block.content}
          onChange={(e) => onChange({ ...block, content: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Link URL</label>
        <input className={IN} placeholder="https://…" value={block.url ?? ""}
          onChange={(e) => onChange({ ...block, url: e.target.value })} />
      </div>
    </div>
  );

  if (block.type === "divider") return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 border-t border-dashed border-gray-200" />
      <span className="text-xs text-gray-300">divider</span>
      <div className="flex-1 border-t border-dashed border-gray-200" />
    </div>
  );

  return null;
}

// ─── Main exported component ──────────────────────────────────────────────────
interface Props {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

export default function EmailBodyEditor({ blocks, onChange }: Props) {
  const [preview, setPreview] = useState(false);

  function update(i: number, b: Block) { onChange(blocks.map((x, idx) => idx === i ? b : x)); }
  function remove(i: number)           { onChange(blocks.filter((_, idx) => idx !== i)); }
  function moveUp(i: number)           { if (i === 0) return; const b = [...blocks]; [b[i-1], b[i]] = [b[i], b[i-1]]; onChange(b); }
  function moveDown(i: number)         { if (i === blocks.length - 1) return; const b = [...blocks]; [b[i], b[i+1]] = [b[i+1], b[i]]; onChange(b); }
  function add(type: BlockType)        { onChange([...blocks, newBlock(type)]); }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-1 flex-wrap">
          {BLOCK_DEFS.map(({ type, icon, label }) => (
            <button key={type} onClick={() => add(type)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-gray-100 hover:border-indigo-200 transition-all">
              {icon} {label}
            </button>
          ))}
        </div>
        <button onClick={() => setPreview(!preview)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors ml-2 shrink-0">
          {preview ? <EyeOff size={13} /> : <Eye size={13} />}
          {preview ? "Edit" : "Preview"}
        </button>
      </div>

      {/* Preview mode */}
      {preview ? (
        <div className="px-6 py-5 min-h-48 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: blocksToHtml(blocks) || "<p class='text-gray-300 text-sm'>Nothing to preview yet.</p>" }} />
      ) : (
        <div className="p-4 space-y-2 min-h-48">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
                <Plus size={16} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Add a block above to start building your email</p>
              <p className="text-xs text-gray-300">No HTML knowledge needed</p>
            </div>
          ) : (
            blocks.map((block, i) => {
              const def = BLOCK_DEFS.find((d) => d.type === block.type)!;
              return (
                <div key={block.id} className="group flex gap-2 items-start">
                  {/* Drag handle / move */}
                  <div className="flex flex-col items-center gap-0.5 pt-2.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => moveUp(i)} className="text-gray-300 hover:text-gray-500 transition-colors"><MoveUp size={12} /></button>
                    <GripVertical size={12} className="text-gray-200" />
                    <button onClick={() => moveDown(i)} className="text-gray-300 hover:text-gray-500 transition-colors"><MoveDown size={12} /></button>
                  </div>

                  {/* Block card */}
                  <div className="flex-1 border border-gray-100 rounded-xl p-3.5 bg-gray-50/40 hover:border-gray-200 transition-colors">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                        {def.icon} {def.label}
                      </span>
                      <button onClick={() => remove(i)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-0.5">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <BlockEditor block={block} onChange={(b) => update(i, b)} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Placeholder hint */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
        <p className="text-xs text-gray-400">
          Tip: use <code className="bg-gray-100 text-gray-600 px-1 rounded">{"{{name}}"}</code>,{" "}
          <code className="bg-gray-100 text-gray-600 px-1 rounded">{"{{plan}}"}</code> etc. anywhere in your text to personalise the email.
        </p>
      </div>
    </div>
  );
}
