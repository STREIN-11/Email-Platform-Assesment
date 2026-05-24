"use client";
import { useState } from "react";
import { Condition } from "@/types";
import { Plus, Trash2, ChevronDown } from "lucide-react";

// ─── Field groups — shown as a categorised picker ─────────────────────────────
type FieldType = "text" | "number" | "boolean" | "date";

const FIELD_GROUPS: {
  group: string;
  emoji: string;
  fields: { value: string; label: string; type: FieldType; placeholder?: string }[];
}[] = [
  {
    group: "Plan & Billing",
    emoji: "💳",
    fields: [
      { value: "plan",          label: "their plan",           type: "text",    placeholder: "e.g. free, pro" },
      { value: "subscribed_at", label: "subscription date",    type: "date" },
      { value: "days_on_free",  label: "days on free plan",    type: "number",  placeholder: "e.g. 14" },
    ],
  },
  {
    group: "Activity",
    emoji: "📊",
    fields: [
      { value: "storage_hits",   label: "storage cap hits",    type: "number",  placeholder: "e.g. 2" },
      { value: "last_active_at", label: "last active date",    type: "date" },
      { value: "team_size",      label: "team size",           type: "number",  placeholder: "e.g. 5" },
    ],
  },
  {
    group: "Trial",
    emoji: "⏳",
    fields: [
      { value: "trial_started_at", label: "trial start date",  type: "date" },
      { value: "trial_ended_at",   label: "trial end date",    type: "date" },
    ],
  },
  {
    group: "Account",
    emoji: "👤",
    fields: [
      { value: "email",      label: "email address",           type: "text",    placeholder: "e.g. @company.com" },
      { value: "country",    label: "country",                 type: "text",    placeholder: "e.g. US, GB" },
      { value: "source",     label: "signup source",           type: "text",    placeholder: "e.g. organic" },
      { value: "created_at", label: "account created date",    type: "date" },
      { value: "user.unsubscribed_product", label: "unsubscribed from emails", type: "boolean" },
    ],
  },
  {
    group: "Custom",
    emoji: "🔧",
    fields: [
      { value: "__custom__", label: "a custom field…",         type: "text" },
    ],
  },
];

// Flat lookup
const ALL_FIELDS = FIELD_GROUPS.flatMap(g => g.fields);

function getField(value: string) {
  return ALL_FIELDS.find(f => f.value === value);
}
function getFieldType(value: string): FieldType {
  return getField(value)?.type ?? "text";
}

// ─── Operators — plain English labels ────────────────────────────────────────
type OpValue = Condition["operator"];

const OPS_BY_TYPE: Record<FieldType, { value: OpValue; label: string }[]> = {
  text: [
    { value: "eq",           label: "is" },
    { value: "neq",          label: "is not" },
    { value: "contains",     label: "contains" },
    { value: "not_contains", label: "doesn't contain" },
  ],
  number: [
    { value: "eq",  label: "is exactly" },
    { value: "neq", label: "is not" },
    { value: "gt",  label: "is more than" },
    { value: "gte", label: "is at least" },
    { value: "lt",  label: "is less than" },
    { value: "lte", label: "is at most" },
  ],
  boolean: [
    { value: "eq",  label: "is YES" },
    { value: "neq", label: "is NO" },
  ],
  date: [
    { value: "date_after",       label: "is after" },
    { value: "date_before",      label: "is before" },
    { value: "date_after_days",  label: "was more than … days ago" },
    { value: "date_before_days", label: "was less than … days ago" },
  ],
};

// ─── Plain-English sentence preview ──────────────────────────────────────────
function toSentence(c: Condition): string {
  const field = getField(c.field);
  const fieldLabel = field?.label ?? c.field;
  const type = getFieldType(c.field);
  const ops = OPS_BY_TYPE[type];
  const opLabel = ops.find(o => o.value === c.operator)?.label ?? c.operator;

  if (type === "boolean") {
    return `${fieldLabel} ${c.operator === "eq" ? "is YES (true)" : "is NO (false)"}`;
  }
  if (type === "date") {
    if (c.operator === "date_after_days" || c.operator === "date_before_days") {
      return `${fieldLabel} ${opLabel.replace("…", String(c.value))}`;
    }
    const d = c.value ? new Date(String(c.value)) : null;
    const fmt = d && !isNaN(d.getTime())
      ? d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
      : String(c.value);
    return `${fieldLabel} ${opLabel} ${fmt}`;
  }
  const val = c.value === "" ? "…" : `"${c.value}"`;
  return `${fieldLabel} ${opLabel} ${val}`;
}

// ─── Field picker modal ───────────────────────────────────────────────────────
function FieldPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = getField(value);
  const label = current?.value === "__custom__" ? "a custom field" : (current?.label ?? "choose a field…");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-sm px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
      >
        {label} <ChevronDown size={12} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-2xl shadow-xl w-72 overflow-hidden">
            <div className="p-2 max-h-80 overflow-y-auto">
              {FIELD_GROUPS.map(group => (
                <div key={group.group} className="mb-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1.5">
                    {group.emoji} {group.group}
                  </p>
                  {group.fields.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => { onChange(f.value); setOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        value === f.value
                          ? "bg-indigo-50 text-indigo-700 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Operator picker ──────────────────────────────────────────────────────────
function OpPicker({ fieldType, value, onChange }: { fieldType: FieldType; value: OpValue; onChange: (v: OpValue) => void }) {
  const ops = OPS_BY_TYPE[fieldType];
  if (fieldType === "boolean") return null; // boolean has no separate op picker — it's baked into the field label
  return (
    <select
      className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-sm px-3 py-1.5 rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-colors appearance-none cursor-pointer"
      value={value}
      onChange={e => onChange(e.target.value as OpValue)}
    >
      {ops.map(op => (
        <option key={op.value} value={op.value}>{op.label}</option>
      ))}
    </select>
  );
}

// ─── Value input ──────────────────────────────────────────────────────────────
function ValueInput({ field, operator, value, onChange }: {
  field: string; operator: OpValue;
  value: string | number | boolean;
  onChange: (v: string | number | boolean) => void;
}) {
  const type = getFieldType(field);
  const fieldDef = getField(field);

  if (type === "boolean") {
    return (
      <select
        className="bg-emerald-50 text-emerald-700 font-semibold text-sm px-3 py-1.5 rounded-lg border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
        value={String(value)}
        onChange={e => onChange(e.target.value === "true")}
      >
        <option value="false">No</option>
        <option value="true">Yes</option>
      </select>
    );
  }

  if (type === "date") {
    if (operator === "date_after_days" || operator === "date_before_days") {
      return (
        <div className="flex items-center gap-1.5">
          <input
            type="number" min={1}
            className="w-20 bg-emerald-50 text-emerald-700 font-semibold text-sm px-3 py-1.5 rounded-lg border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 text-center"
            placeholder="14"
            value={String(value)}
            onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          />
          <span className="text-sm text-gray-500 font-medium">days</span>
        </div>
      );
    }
    return (
      <input
        type="datetime-local"
        className="bg-emerald-50 text-emerald-700 font-semibold text-sm px-3 py-1.5 rounded-lg border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        value={String(value)}
        onChange={e => onChange(e.target.value)}
      />
    );
  }

  if (type === "number") {
    return (
      <input
        type="number"
        className="w-24 bg-emerald-50 text-emerald-700 font-semibold text-sm px-3 py-1.5 rounded-lg border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 text-center"
        placeholder="0"
        value={String(value)}
        onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      />
    );
  }

  return (
    <input
      className="bg-emerald-50 text-emerald-700 font-semibold text-sm px-3 py-1.5 rounded-lg border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 min-w-0 w-36"
      placeholder={fieldDef?.placeholder ?? "value…"}
      value={String(value)}
      onChange={e => onChange(e.target.value)}
    />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
interface Props {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

export default function ConditionBuilder({ conditions, onChange }: Props) {
  const add = () => onChange([...conditions, { field: "plan", operator: "eq", value: "" }]);

  const update = (i: number, patch: Partial<Condition>) => {
    onChange(conditions.map((c, idx) => {
      if (idx !== i) return c;
      const next = { ...c, ...patch };
      if (patch.field !== undefined && patch.field !== c.field) {
        const type = getFieldType(patch.field);
        next.operator = OPS_BY_TYPE[type][0].value;
        next.value = "";
      }
      return next;
    }));
  };

  const remove = (i: number) => onChange(conditions.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">

      {/* Empty state */}
      {conditions.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center space-y-2">
          <p className="text-sm font-medium text-gray-500">No conditions yet</p>
          <p className="text-xs text-gray-400 leading-relaxed max-w-xs mx-auto">
            Without conditions, this email fires for <strong>every</strong> matching event.
            Add a condition to narrow it down — e.g. only send to users on the Pro plan.
          </p>
          <button
            onClick={add}
            className="mt-2 inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus size={14} /> Add a condition
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {conditions.map((c, i) => {
              const fieldType = getFieldType(c.field);
              const isCustom  = c.field === "__custom__" || c.field === "";

              return (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
                  {/* Connector label */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      i === 0 ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"
                    }`}>
                      {i === 0 ? "SEND WHEN" : "AND"}
                    </span>
                    <button
                      onClick={() => remove(i)}
                      className="text-gray-300 hover:text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Sentence row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-500">the user's</span>
                    <FieldPicker
                      value={isCustom ? "__custom__" : c.field}
                      onChange={v => update(i, { field: v === "__custom__" ? "" : v })}
                    />
                    {fieldType !== "boolean" && (
                      <OpPicker
                        fieldType={fieldType}
                        value={c.operator}
                        onChange={v => update(i, { operator: v, value: "" })}
                      />
                    )}
                    <ValueInput
                      field={c.field}
                      operator={c.operator}
                      value={c.value}
                      onChange={v => update(i, { value: v })}
                    />
                  </div>

                  {/* Custom field name input */}
                  {isCustom && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-gray-400">Field name:</span>
                      <input
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white"
                        placeholder="e.g. metadata.source"
                        value={c.field === "" ? "" : c.field}
                        onChange={e => update(i, { field: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Live sentence preview */}
                  {c.field && c.value !== "" && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center gap-2">
                      <span className="text-xs text-gray-400 shrink-0">This means:</span>
                      <span className="text-xs font-medium text-gray-700 italic">
                        "{toSentence(c)}"
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add more */}
          <button
            onClick={add}
            className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors pt-1"
          >
            <Plus size={14} /> Add another condition
          </button>

          {/* Summary */}
          {conditions.some(c => c.field && c.value !== "") && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">This email will send when:</p>
              <p className="text-sm text-indigo-900 leading-relaxed">
                {conditions
                  .filter(c => c.field && c.value !== "")
                  .map((c, i) => (
                    <span key={i}>
                      {i > 0 && <strong className="text-indigo-600"> AND </strong>}
                      {toSentence(c)}
                    </span>
                  ))}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
