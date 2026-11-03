import { normalizeValue } from '@/domain/updates/canonical-value';
import { exactKeys, parseCheckpoint } from '@/domain/checkpoints/validation';
import { validUuid } from '@/domain/updates/validation';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { parseCentsString } from '@/domain/money/money-codec';
import { parseTransition } from '@/domain/transitions/validation';
import { parseObligationBatch } from '@/domain/obligations/validation';
import { parseSavingBatch } from '@/domain/savings/validation';
import type { Result } from '@/shared/pure/result';
import type { BudgetDraft, BudgetError } from './contracts';
import { MAX_CENTS } from '@/domain/money/money';

/** Exact form-validation feedback only; allocation acceptance still uses the existing validator. */
export function cashVectorGap(raw:unknown):string|null {
  try{const v=normalizeValue(raw) as {checkpoint?:unknown;allocationChange?:unknown};
    const cash=(v.checkpoint??v.allocationChange) as {balanceCents?:unknown;allocations?:unknown};
    const b=parseCentsString(cash?.balanceCents);if(!b.ok||b.value<0n||!Array.isArray(cash.allocations)||cash.allocations.length>120)return null;
    let total=0n;for(const a of cash.allocations){if(!a||typeof a!=='object'||!('amountCents'in a))return null;
      const amount=parseCentsString(a.amountCents);if(!amount.ok||amount.value<0n)return null;total+=amount.value;if(total>MAX_CENTS)return null;}
    return b.value===total?null:(b.value-total).toString();
  }catch{return null;}
}

/** Narrow aggregate DTO. A payment refers to the ONE aggregate check, never its own check. */
export function parseBudgetDraft(raw: unknown): Result<BudgetDraft, BudgetError> {
  const bad = { ok: false, code: 'INVALID_INPUT' } as const;
  let v: unknown; try { v = normalizeValue(raw); } catch { return bad; }
  if (!exactKeys(v, ['schemaVersion','knowledgeCut','baseCheckpointId','baseVectorId','effectiveDate',
    'checkpoint','allocationChange','completeVectorConfirmed','obligations','savings']) || v.schemaVersion !== 1) return bad;
  const cut = parseCentsString(v.knowledgeCut), day = parseBerlinDate(v.effectiveDate);
  if (!cut.ok || cut.value < 0n || !day.ok || v.completeVectorConfirmed !== true) return bad;
  for (const key of ['baseCheckpointId','baseVectorId']) if (v[key] !== null && !validUuid(v[key])) return bad;
  if ((v.baseCheckpointId === null) !== (v.baseVectorId === null)) return bad;
  const cp = v.checkpoint === null ? null : parseCheckpoint(v.checkpoint);
  const change = v.allocationChange === null ? null : parseTransition(v.allocationChange);
  if (cp && !cp.ok) return cp;
  if (change && !change.ok) return change;
  if ((!cp && !change) || (cp && change) || (cp?.ok && (cp.value.correction || cp.value.observedDate !== day.value))) return bad;
  if (change?.ok && (change.value.effectiveDate !== day.value || change.value.expectedCheckpointRevisionId !== v.baseCheckpointId
    || change.value.expectedAllocationRevisionId !== v.baseVectorId)) return bad;
  const actual = cp?.ok ? cp.value : change?.ok ? change.value.checkpoint : null;
  if (!Array.isArray(v.obligations) || !Array.isArray(v.savings) || v.obligations.length > 7 || v.savings.length > 7) return bad;
  const os: BudgetDraft['obligations'][number][] = [], ss: BudgetDraft['savings'][number][] = [];
  const seen = new Set<string>();
  for (const [i,x] of v.obligations.entries()) {
    if (!exactKeys(x, ['action','identityId','expectedRevisionId','data','bankDate','payment'])) return bad;
    const identity = x.identityId === null ? `new:${i}` : String(x.identityId).toLowerCase();
    if (seen.has('O:'+identity)) return { ok:false, code:'SAME_IDENTITY_COMPOUND_NOT_SUPPORTED' };
    seen.add('O:'+identity);
    const paid = x.action === 'PAID' || x.action === 'PARTIAL_SETTLEMENT';
    if (paid && !actual) return { ok:false, code:'PAYMENT_CONFIRMATION_REQUIRED' };
    if (paid && !exactKeys(x.payment, ['source','bankStateAffirmed','unchangedBalanceAcknowledged'])) return { ok:false, code:'PAYMENT_CONFIRMATION_REQUIRED' };
    const parsed = parseObligationBatch({ changes: [{ key:`o${i}`, action:x.action, obligationId:x.identityId,
      expectedStateRevisionId:x.expectedRevisionId, correctionId:null, previousChangeKey:null, effectiveDate:day.value,
      bankDate:x.bankDate, data:x.data, placement:null, bankCheck:paid ? actual : null,
      paymentConfirmation:paid ? { ...x.payment as object, checkpointId:null } : x.payment }] });
    if (!parsed.ok) return parsed;
    os.push(parsed.value[0]);
  }
  for (const [i,x] of v.savings.entries()) {
    if (!exactKeys(x, ['action','identityId','expectedRevisionId','data'])) return bad;
    const identity = x.identityId === null ? `new:${i}` : String(x.identityId).toLowerCase();
    if (seen.has('S:'+identity)) return { ok:false, code:'SAME_IDENTITY_COMPOUND_NOT_SUPPORTED' };
    seen.add('S:'+identity);
    const parsed = parseSavingBatch({ changes: [{ key:`s${i}`,action:x.action,savingsId:x.identityId,
      expectedStateRevisionId:x.expectedRevisionId,correctionId:null,previousChangeKey:null,effectiveDate:day.value,
      data:x.data,placement:null,bankCheck:null }] });
    if (!parsed.ok) return parsed;
    ss.push(parsed.value[0]);
  }
  return { ok:true,value:{ schemaVersion:1,knowledgeCut:cut.value,baseCheckpointId:v.baseCheckpointId as string|null,
    baseVectorId:v.baseVectorId as string|null,effectiveDate:day.value,checkpoint:cp?.ok?cp.value:null,
    allocationChange:change?.ok?change.value:null,completeVectorConfirmed:true,obligations:os,savings:ss } };
}
