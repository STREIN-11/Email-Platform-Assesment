"use client";
import { Condition } from "@/types";
import { Plus, Trash2 } from "lucide-react";

const OPERATORS: { value: Condition["operator"]; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: "greater than" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "less than" },
  { value: "lte", label: "≤" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "not contains" },
];

interface Props {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

export default function ConditionBuilder({ conditions, onChange }: Props) {
  const add = () => onChange([...conditions, { field: "", operator: "eq", value: "" }]);
  const update = (i: number, patch: Partial<Condition>) =>
    onChange(conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const remove = (i: number) => onChange(conditions.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {conditions.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400">No conditions — trigger fires for every matching event.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conditions.map((c, i) => (
            <div key={i} className="flex gap-2 items-center bg-gray-50 rounded-xl p-2.5 border border-gray-100">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-medium text-gray-400 w-6 text-center">{i === 0 ? "IF" : "AND"}</span>
              </div>
              <input
                className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-1.5 text-sm mono focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white"
                placeholder="payload.field"
                value={c.field}
                onChange={(e) => update(i, { field: e.target.value })}
              />
              <select
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white text-gray-700 shrink-0"
                value={c.operator}
                onChange={(e) => update(i, { operator: e.target.value as Condition["operator"] })}
              >
                {OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
              <input
                className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white"
                placeholder="value"
                value={String(c.value)}
                onChange={(e) => update(i, { value: e.target.value })}
              />
              <button onClick={() => remove(i)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={add}
        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
      >
        <Plus size={13} /> Add condition
      </button>
    </div>
  );
}
