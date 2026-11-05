import type {ReviewContentRow} from './review-content';

type Translate=(key:string,values?:Record<string,string|number>)=>string;
const metadata=new Set(['schemaVersion','snapshotSchemaVersion','selectionVersion','selectionContractVersion','eventIndex','recordedSeq','knowledgeCut','capturedAggregateRevision','accountId','ownerUserId']);
/** A total, checkable mapping from the complete leaf review to readable rows.
 * Only protocol/commit coordinates are summarized; every semantic ref, ordering,
 * old state and text fragment remains mandatory. Identical representations merge
 * only within the same source context. Raw coordinates never earn review credit. */
export function groupedClosingReview(rows:readonly ReviewContentRow[],initial:boolean,t:Translate):readonly ReviewContentRow[]{
  const result:ReviewContentRow[]=[],indexes=new Map<string,number>();
  for(const row of rows){
    const rootSummary=!initial&&['endBalanceCents','lastObservedBalanceCents','historicalAllocatedCents','historicalFreeCents','lastBankObservedDate','historicalReservedCents','historicalSavingsCents'].includes(row.key)&&row.coverage.every(id=>{const [a,b]=JSON.parse(id) as string[][];return a.length===1&&b.length===1;});
    const destination=rootSummary?'summary' as const:'evidence' as const;
    const service=metadata.has(row.key),candidate=service?{...row,destination,field:t('recordProvenance'),before:initial?'':row.before===t('reviewNotRecorded')?t('reviewNotRecorded'):t('priorRecord'),after:row.after===t('reviewNotRecorded')?t('reviewNotRecorded'):t(initial?'confirmedRecord':'updatedRecord'),part:1,parts:1}:{...row,destination};
    const key=JSON.stringify([candidate.group,candidate.section,candidate.subject,candidate.field,candidate.before,candidate.after,candidate.part]);
    const i=indexes.get(key);
    if(i===undefined){indexes.set(key,result.length);result.push(candidate);}
    else result[i]={...result[i],coverage:[...result[i].coverage,...candidate.coverage]};
  }
  const expected=rows.flatMap(r=>r.coverage),actual=result.flatMap(r=>r.coverage);
  const identities=new Set(expected);
  if(identities.size!==expected.length||actual.length!==expected.length||new Set(actual).size!==expected.length||actual.some(x=>!identities.has(x)))throw Error('REPORT_PROOF_INVALID');
  const order={card:0,allocation:1,earmarks:2,history:3};
  return result.sort((a,b)=>order[a.group]-order[b.group]);
}
