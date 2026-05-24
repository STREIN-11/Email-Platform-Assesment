import { Condition } from "@/types";

function getValue(payload: Record<string, unknown>, field: string): unknown {
  return field.split(".").reduce<unknown>(
    (obj, key) => (obj && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined),
    payload
  );
}

function toDate(val: unknown): Date | null {
  if (!val) return null;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

export type EvalResult =
  | { pass: true }
  | { pass: false; reason: string };

function evaluate(condition: Condition, payload: Record<string, unknown>): EvalResult {
  const actual   = getValue(payload, condition.field);
  const expected = condition.value;

  // Field missing from payload — most common mistake
  if (actual === undefined || actual === null) {
    return {
      pass: false,
      reason: `Field "${condition.field}" was not found in the event payload. Add it to your event details.`,
    };
  }

  switch (condition.operator) {
    case "eq":
      return actual == expected
        ? { pass: true }
        : { pass: false, reason: `"${condition.field}" is "${actual}" but expected "${expected}"` };
    case "neq":
      return actual != expected
        ? { pass: true }
        : { pass: false, reason: `"${condition.field}" is "${actual}" — expected it to NOT be "${expected}"` };
    case "gt":
      return Number(actual) > Number(expected)
        ? { pass: true }
        : { pass: false, reason: `"${condition.field}" is ${actual}, needs to be more than ${expected}` };
    case "gte":
      return Number(actual) >= Number(expected)
        ? { pass: true }
        : { pass: false, reason: `"${condition.field}" is ${actual}, needs to be at least ${expected}` };
    case "lt":
      return Number(actual) < Number(expected)
        ? { pass: true }
        : { pass: false, reason: `"${condition.field}" is ${actual}, needs to be less than ${expected}` };
    case "lte":
      return Number(actual) <= Number(expected)
        ? { pass: true }
        : { pass: false, reason: `"${condition.field}" is ${actual}, needs to be at most ${expected}` };
    case "contains":
      return typeof actual === "string" && actual.includes(String(expected))
        ? { pass: true }
        : { pass: false, reason: `"${condition.field}" ("${actual}") does not contain "${expected}"` };
    case "not_contains":
      return typeof actual === "string" && !actual.includes(String(expected))
        ? { pass: true }
        : { pass: false, reason: `"${condition.field}" ("${actual}") contains "${expected}" but shouldn't` };

    case "date_after": {
      const a = toDate(actual);
      const b = toDate(expected);
      if (!a) return { pass: false, reason: `"${condition.field}" ("${actual}") is not a valid date` };
      if (!b) return { pass: false, reason: `The comparison date "${expected}" is not valid` };
      return a > b
        ? { pass: true }
        : { pass: false, reason: `"${condition.field}" (${a.toLocaleString()}) is not after ${b.toLocaleString()}` };
    }
    case "date_before": {
      const a = toDate(actual);
      const b = toDate(expected);
      if (!a) return { pass: false, reason: `"${condition.field}" ("${actual}") is not a valid date` };
      if (!b) return { pass: false, reason: `The comparison date "${expected}" is not valid` };
      return a < b
        ? { pass: true }
        : { pass: false, reason: `"${condition.field}" (${a.toLocaleString()}) is not before ${b.toLocaleString()}` };
    }
    case "date_after_days": {
      const a = toDate(actual);
      if (!a) return { pass: false, reason: `"${condition.field}" ("${actual}") is not a valid date` };
      const days   = Number(expected);
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      return a < cutoff
        ? { pass: true }
        : { pass: false, reason: `"${condition.field}" (${a.toLocaleDateString()}) is not more than ${days} days ago` };
    }
    case "date_before_days": {
      const a = toDate(actual);
      if (!a) return { pass: false, reason: `"${condition.field}" ("${actual}") is not a valid date` };
      const days   = Number(expected);
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      return a > cutoff
        ? { pass: true }
        : { pass: false, reason: `"${condition.field}" (${a.toLocaleDateString()}) is not within the last ${days} days` };
    }

    default:
      return { pass: false, reason: `Unknown operator "${condition.operator}"` };
  }
}

export function evaluateConditions(
  conditions: Condition[],
  payload: Record<string, unknown>
): boolean {
  return conditions.every((c) => evaluate(c, payload).pass);
}

// Returns the first failing condition's reason, or null if all pass
export function getFailureReason(
  conditions: Condition[],
  payload: Record<string, unknown>
): string | null {
  for (const c of conditions) {
    const result = evaluate(c, payload);
    if (!result.pass) return result.reason;
  }
  return null;
}
