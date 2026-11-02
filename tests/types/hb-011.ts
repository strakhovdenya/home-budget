import type { ObligationState, Payment } from '@/domain/obligations/contracts';
declare const state: ObligationState;
// @ts-expect-error immutable full states
state.title = 'mutation';
// @ts-expect-error money cannot use numeric cents
const amount: ObligationState['originalCents'] = 20000;
// @ts-expect-error possible is a characteristic, not a status
const status: ObligationState['status'] = 'POSSIBLE';
// @ts-expect-error affirmation cannot be omitted or false
const affirmation: Payment['bankStateAffirmed'] = false;
void amount; void status; void affirmation;
