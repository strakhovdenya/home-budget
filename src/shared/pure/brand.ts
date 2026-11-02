/** Matches the validated primitive brands in ADR 0003. */
export type Brand<T, N extends string> = T & { readonly __brand: N };
