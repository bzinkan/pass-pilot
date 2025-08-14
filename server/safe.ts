export function invariant(condition: any, msg: string): asserts condition {
  if (!condition) throw new Error(msg);
}

export function unwrap<T>(v: T | null | undefined, msg = "Unexpected null"): T {
  if (v == null) throw new Error(msg);
  return v;
}