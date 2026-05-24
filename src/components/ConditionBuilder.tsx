"use client";
import { Condition } from "@/types";
import { Plus, Trash2 } from "lucide-react";

const OPERATORS = ["eq", "neq", "gt", "gte", "lt", "lte", "contains", "not_contains"] as const;

interface Props {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

export default function ConditionBuilder({ conditions, onChange }: Props) {
  const add = () =>
    onChange([...conditions, { field: "", operator: "eq", value: "" }]);

  const update = (i: number, patch: Partial<Condition>) =>
    onChange(conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const remove = (i: number) => onChange(conditions.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Conditions (all must match)</label>
        <button onClick={add} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
          <Plus size={14} /> Add condition
        </button>
      </div>

      {conditions.length === 0 && (
        <p className="text-xs text-gray-400">No conditions — trigger fires for every matching event.</p>
      )}

      {conditions.map((c, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="payload field (e.g. plan, user.days_on_free)"
            value={c.field}
            onChange={(e) => update(i, { field: e.target.value })}
          />
          <select
            className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={c.operator}
            onChange={(e) => update(i, { operator: e.target.value as Condition["operator"] })}
          >
            {OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
          </select>
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="value"
            value={String(c.value)}
            onChange={(e) => update(i, { value: e.target.value })}
          />
          <button onClick={() => remove(i)} className="p-2 text-gray-400 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
