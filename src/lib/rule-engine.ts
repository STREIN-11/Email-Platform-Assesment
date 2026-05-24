import { Condition } from "@/types";

function getValue(payload: Record<string, unknown>, field: string): unknown {
  return field.split(".").reduce<unknown>((obj, key) =>
    obj && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined,
    payload
  );
}

function evaluate(condition: Condition, payload: Record<string, unknown>): boolean {
  const actual = getValue(payload, condition.field);
  const expected = condition.value;

  switch (condition.operator) {
    case "eq": return actual == expected;
    case "neq": return actual != expected;
    case "gt": return Number(actual) > Number(expected);
    case "gte": return Number(actual) >= Number(expected);
    case "lt": return Number(actual) < Number(expected);
    case "lte": return Number(actual) <= Number(expected);
    case "contains":
      return typeof actual === "string" && actual.includes(String(expected));
    case "not_contains":
      return typeof actual === "string" && !actual.includes(String(expected));
    default: return false;
  }
}

export function evaluateConditions(
  conditions: Condition[],
  payload: Record<string, unknown>
): boolean {
  // All conditions must pass (AND logic)
  return conditions.every((c) => evaluate(c, payload));
}
