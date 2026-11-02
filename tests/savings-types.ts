import type { SavingState } from '@/domain/savings/contracts';
import type { SavingReader } from '@/domain/savings/ports';
declare const state: SavingState;
// @ts-expect-error money is bigint, never number
const invalidMoney: SavingState = { ...state, amountCents: 5000 };
// @ts-expect-error revisions are readonly
state.amountCents = 1n;
declare const reader: SavingReader;
// @ts-expect-error historical through must be a validated BerlinDate
reader.read({ ownerUserId: 'owner', accountId: 'account' }, '2026-10-31', null);
void invalidMoney;
