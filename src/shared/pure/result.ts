/** ADR 0003's Outcome shape, with a caller-selected error vocabulary. */
export type Result<T, E extends string> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; code: E }>;
