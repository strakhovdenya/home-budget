import type { Result } from '@/shared/pure/result';

export function unwrap<T, E extends string>(result: Result<T, E>): T {
  if (!result.ok) throw new Error(`Unexpected primitive error: ${result.code}`);
  return result.value;
}
