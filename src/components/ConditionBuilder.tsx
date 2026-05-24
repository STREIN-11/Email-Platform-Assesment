"use client";
import { Condition } from "@/types";
import { Plus, Trash2, Info } from "lucide-react";

// ─── Preset fields a non-technical user can pick from ───────────────────────
const FIELD_OPTIONS = [
  { value: "plan",                    label: "User's plan",              hint: "e.g. free, pro, enterprise" },
  { value: "email",                   label: "User's email address",     hint: "e.g. jane@company.com" },
  { value: "user.unsubscribed_product", label: "Unsubscribed from emails", hint: "true or false" },
  { value: "days_on_free",            label: "Days on free plan",        hint: "a number" },
  { value: "storage_hits",            label: "Storage cap hits (7 days)", hint: "a number" },
  { value: "team_size",               label: "Team size",                hint: "a number" },
  { value: "country",                 label: "Country",                  hint: "e.g. US, GB" },
  { value: "source",                  label: "Signup source",            hint: "e.g. organic, paid" },
  { value: "__custom__",              label: "Custom field…",            hint: "type a field name" },
];

// ─── Operator groups by data type ────────────────────────────────────────────
type OpValue = Condition["operator"];

const TEXT_OPS: { value: OpValue; label: string }[] = [
  { value: "eq",           label: "is" },
  { value: "neq",          label: "is not" },
  { value: "contains",     label: "contains" },
  { value: "not_contains", label: "does not contain" },
];

const NUMBER_OPS: { value: OpValue; label: string }[] = [
  { value: "eq",  label: "is exactly" },
  { value: "neq", label: "is not" },
  { value: "gt",  label: "is more than" },
  { value: "gte", label: "is at least" },
  { value: "lt",  label: "is less than" },
  { value: "lte", label: "is at most" },
];

const BOOL_OPS: { value: OpValue; label: string }[] = [
  { value: "eq",  label: "is" },
  { value: "neq", label: "is not" },
];

// Fields that are numeric or boolean get a different operator set / value input
const NUMERIC_FIELDS = new Set(["days_on_free", "storage_hits", "team_size"]);
const BOOL_FIELDS    = new Set(["user.unsubscribed_product"]);

function getOpsForField(field: string) {
  if (BOOL_FIELDS.has(field))    return BOOL_OPS;
  if (NUMERIC_FIELDS.has(field)) return NUMBER_OPS;
  return TEXT_OPS;
}

// ─── Human-readable sentence for a single condition ──────────────────────────
function toSentence(c: Condition): string {
  const fieldLabel = FIELD_OPTIONS.find((f) => f.value === c.field)?.label ?? c.field;
  const opLabel    = [...TEXT_OPS, ...NUMBER_OPS, ...BOOL_OPS].find((o) => o.value === c.operator)?.label ?? c.operator;
  const val        = c.value === "" ? "…" : String(c.value);
  return `${fieldLabel} ${opLabel} "${val}"`;
}

// ─── Value input — adapts to field type ──────────────────────────────────────
function ValueInput({ field, value, onChange }: { field: string; value: string | number | boolean; onChange: (v: string | number | boolean) => void }) {
  if (BOOL_FIELDS.has(field)) {
    return (
      <select
        className={SELECT}
        value={String(value)}
        onChange={(e) => onChange(e.target.value === "true")}
      >
        <option value="false">No (not unsubscribed)</option>
        <option value="true">Yes (unsubscribed)</option>
      </select>
    );
  }
  if (NUMERIC_FIELDS.has(field)) {
    return (
      <input
        type="number"
        className={INPUT}
        placeholder="0"
        value={String(value)}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      />
    );
  }
  return (
    <input
      className={INPUT}
      placeholder="Enter a value…"
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

export default function ConditionBuilder({ conditions, onChange }: Props) {
  const add = () =>
    onChange([...conditions, { field: "plan", operator: "eq", value: "" }]);

  const update = (i: number, patch: Partial<Condition> & { _customField?: string }) => {
    onChange(
      conditions.map((c, idx) => {
        if (idx !== i) return c;
        const next = { ...c, ...patch };
        // When field changes, reset operator to first valid one for that field
        if (patch.field !== undefined && patch.field !== c.field) {
          next.operator = getOpsForField(patch.field)[0].value;
          next.value = "";
        }
        return next;
      })
    );
  };

  const remove = (i: number) => onChange(conditions.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      {/* Explainer */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Info size={14} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Conditions control <strong>when</strong> this email is sent. All conditions must be true at the same time.
          If you add no conditions, the email fires for every matching event.
        </p>
      </div>

      {/* Condition rows */}
      {conditions.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center">
          <p className="text-sm text-gray-400">No conditions added yet.</p>
          <p className="text-xs text-gray-300 mt-1">This trigger will fire for every <span className="font-medium">matching event</span>.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conditions.map((c, i) => {
            const isCustom = !FIELD_OPTIONS.slice(0, -1).find((f) => f.value === c.field);
            const ops = getOpsForField(c.field);

            return (
              <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
                {/* Row label */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    i === 0 ? "bg-indigo-100 text-indigo-600" : "bg-gray-200 text-gray-500"
                  }`}>
                    {i === 0 ? "WHEN" : "AND ALSO"}
                  </span>
                  <button
                    onClick={() => remove(i)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Three inputs in a row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Field picker */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">What to check</label>
                    <select
                      className={SELECT}
                      value={isCustom ? "__custom__" : c.field}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          update(i, { field: "" });
                        } else {
                          update(i, { field: e.target.value });
                        }
                      }}
                    >
                      {FIELD_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    {isCustom && (
                      <input
                        className={`${INPUT} mt-1.5`}
                        placeholder="e.g. metadata.source"
                        value={c.field}
                        onChange={(e) => update(i, { field: e.target.value })}
                      />
                    )}
                  </div>

                  {/* Operator */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Condition</label>
                    <select
                      className={SELECT}
                      value={c.operator}
                      onChange={(e) => update(i, { operator: e.target.value as OpValue })}
                    >
                      {ops.map((op) => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Value */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Value</label>
                    <ValueInput
                      field={c.field}
                      value={c.value}
                      onChange={(v) => update(i, { value: v })}
                    />
                  </div>
                </div>

                {/* Live plain-English sentence */}
                {c.field && c.value !== "" && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-xs text-gray-400">Reads as:</span>
                    <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                      {toSentence(c)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary sentence */}
      {conditions.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Summary</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            Send this email when{" "}
            {conditions.map((c, i) => (
              <span key={i}>
                {i > 0 && <span className="font-semibold text-indigo-600"> and </span>}
                <span className="font-medium text-gray-900">{toSentence(c)}</span>
              </span>
            ))}.
          </p>
        </div>
      )}

      <button
        onClick={add}
        className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
      >
        <Plus size={14} /> Add another condition
      </button>
    </div>
  );
}

const INPUT  = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white transition";
const SELECT = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white transition text-gray-700";
