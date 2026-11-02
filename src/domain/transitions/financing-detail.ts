import { parseCentsString } from '@/domain/money/money-codec';
import { sumCents } from '@/domain/money/money';
import { parsePeriod } from '@/domain/periods/period';
import { exactKeys } from '@/domain/checkpoints/validation';
import { normalizeValue } from '@/domain/updates/canonical-value';
import { validUuid } from '@/domain/updates/validation';
/** Explanatory only. This result is neither an operation receipt nor cash posting. */
export function proposeFinancingDetail(raw:unknown){
  const bad={ok:false,code:'INVALID_INPUT'} as const;
  try{
    const v=normalizeValue(raw);if(!exactKeys(v,['checkpointRevisionId','allocationRevisionId','amountCents','details'])||!validUuid(v.checkpointRevisionId)||!validUuid(v.allocationRevisionId)||!Array.isArray(v.details))return bad;
    const amount=parseCentsString(v.amountCents);if(!amount.ok||amount.value===0n)return bad;
    const rows=[];const seen=new Set<string>();
    for(const r of v.details){if(!exactKeys(r,['period','amountCents']))return bad;const p=parsePeriod(r.period),a=parseCentsString(r.amountCents);
      if(!p.ok||!a.ok||seen.has(p.value)||a.value===0n||(a.value>0n)!==(amount.value>0n))return bad;seen.add(p.value);rows.push({period:p.value,amountCents:a.value});}
    const sum=sumCents(rows.map(r=>r.amountCents));if(!sum.ok)return sum;if(sum.value!==amount.value)return bad;
    return {ok:true as const,value:{kind:'EXPLANATORY_PROPOSAL' as const,checkpointRevisionId:v.checkpointRevisionId,allocationRevisionId:v.allocationRevisionId,amountCents:amount.value,details:rows}};
  }catch{return bad;}
}
