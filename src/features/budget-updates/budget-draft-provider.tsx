'use client';

import { createContext, useContext, useRef, useSyncExternalStore, type ReactNode, type SetStateAction } from 'react';
import type { DraftEdit, UpdateSeed } from './presentation';
import { euro, initialForm } from './presentation';

export type EntryIntent = Readonly<{ kind: DraftEdit['kind']; identityId: string | null; revisionId: string | null; action: string; suggestedAmount?: string }>;
type Store = ReturnType<typeof createStore>;
function createStore() {
  const values: Record<string, unknown> = {};
  const listeners = new Set<() => void>();
  return { values, entry: null as EntryIntent | null,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    update(key: string, value: unknown) { values[key] = value; listeners.forEach(fn => fn()); },
  };
}
function createWorkspace() {
  let current: { scope: string; store: Store } | null = null;
  return { bind(scope: string) {
    if (current?.scope !== scope) current = { scope, store: createStore() };
    return current.store;
  } };
}
const Workspace = createContext<ReturnType<typeof createWorkspace> | null>(null);
const Session = createContext<Store | null>(null);
export function BudgetDraftProvider({ children }: { children: ReactNode }) {
  const workspace = useRef<ReturnType<typeof createWorkspace> | null>(null);
  if (!workspace.current) workspace.current = createWorkspace();
  return <Workspace.Provider value={workspace.current}>{children}</Workspace.Provider>;
}
export function useBudgetWorkspace(scope: string) {
  const context = useContext(Workspace), fallback = useRef<ReturnType<typeof createWorkspace> | null>(null);
  if (!fallback.current) fallback.current = createWorkspace();
  return (context ?? fallback.current).bind(scope);
}
export function BudgetSession({ store, children }: { store: Store; children: ReactNode }) { return <Session.Provider value={store}>{children}</Session.Provider>; }
/** Called on entry/new server props, never on ordinary form state updates. */
export function openBudgetSession(store: Store, seed: UpdateSeed) {
  const values = store.values;
  // A fresh server view cannot rebase an unfinished or unresolved command.
  if (values.dirty || values.unknown || values.pending || values.accessLost
    || (values.busy as { current?: boolean } | undefined)?.current) return;
  const retained = Object.fromEntries(['receipt','history','readFailed'].filter(key => key in values).map(key => [key,values[key]]));
  for (const key of Object.keys(values)) delete values[key];
  Object.assign(values, retained, { seed, form: initialForm(seed) });
  if (store.entry) {
    const entry = store.entry; store.entry = null;
    const edit = resolveEntry(seed, entry);
    values.form = { ...initialForm(seed), edits: edit ? [edit] : [] };
    values.dirty = !!edit; values.entryError = !edit;
  }
}
/** React-instance memory only, shared across route mounts; async completions notify the current subscriber. */
export function useBudgetState<T>(key: string, initial: T | (() => T)): [T, (next: SetStateAction<T>) => void] {
  const store = useContext(Session); if (!store) throw Error('BUDGET_SESSION_REQUIRED');
  if (!(key in store.values)) store.values[key] = typeof initial === 'function' ? (initial as () => T)() : initial;
  const value = useSyncExternalStore(store.subscribe, () => store.values[key] as T, () => store.values[key] as T);
  return [value, next => store.update(key, typeof next === 'function' ? (next as (old: T) => T)(store.values[key] as T) : next)];
}
export function useBudgetRef<T>(key: string, initial: T) {
  const store = useContext(Session); if (!store) throw Error('BUDGET_SESSION_REQUIRED');
  if (!(key in store.values)) store.values[key] = { current: initial };
  return store.values[key] as { current: T };
}
export function requestEntry(store: Store, intent: EntryIntent, replace = false): 'READY' | 'DIRTY' | 'UNKNOWN' {
  if (store.values.accessLost || store.values.unknown || store.values.pending || (store.values.busy as { current?: boolean } | undefined)?.current) return 'UNKNOWN';
  if (store.values.dirty && !replace) return 'DIRTY';
  for (const key of Object.keys(store.values)) delete store.values[key];
  store.entry = intent;
  return 'READY';
}
export function resolveEntry(seed: UpdateSeed, intent: EntryIntent): DraftEdit | null {
  const o = intent.kind === 'OBLIGATION' ? seed.obligations.find(x => x.obligationId === intent.identityId) : undefined;
  const s = intent.kind === 'SAVING' ? seed.savings.find(x => x.savingsId === intent.identityId) : undefined;
  const allowed = intent.kind === 'OBLIGATION' ? ['AMEND','PARTIAL_SETTLEMENT','PAID','CANCELLED'] : ['AMEND','INCREASE','PARTIAL_RELEASE','FULL_RELEASE'];
  if (intent.identityId === null ? intent.action !== 'CREATE' : !allowed.includes(intent.action) || (o?.id ?? s?.id) !== intent.revisionId
    || (o?.status ?? s?.status) !== (intent.kind === 'OBLIGATION' ? 'UNPAID' : 'ACTIVE')) return null;
  const amount = intent.action === 'PAID' ? o?.outstandingCents : intent.action === 'FULL_RELEASE' ? s?.amountCents
    : intent.action === 'AMEND' ? o?.originalCents : intent.suggestedAmount;
  return { key: crypto.randomUUID(), kind: intent.kind, identityId: intent.identityId ?? '', action: intent.action,
    title: o?.title ?? s?.title ?? '', amount: amount ? euro(amount) : '', period: o?.fundingPeriod ?? s?.fundingPeriod ?? seed.today.slice(0,7),
    dueDate: o?.dueDate ?? '', bankDate: '', isPossible: o?.isPossible ?? false, reserveFull: o?.reserveFull ?? true, source: 'TRACKED_CARD' };
}
