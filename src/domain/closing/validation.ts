import { exactKeys } from '@/domain/checkpoints/validation';
import { parsePeriod,endOfMonth } from '@/domain/periods/period';
import { validUuid } from '@/domain/updates/validation';
import { MAX_CENTS } from '@/domain/money/money';
import type { ClosingInput, ClosingQuery } from './contracts';
import { fail } from './serialization';

export function parseClosingQuery(raw:unknown):ClosingQuery {
  if(!exactKeys(raw,['period','version','offset','digest'])||!parsePeriod(raw.period).ok
    ||(raw.version!==null&&(!Number.isSafeInteger(raw.version)||(raw.version as number)<1||(raw.version as number)>2147483647))
    ||!Number.isSafeInteger(raw.offset)||(raw.offset as number)<0||(raw.offset as number)>8388608
    ||(raw.digest!==null&&(typeof raw.digest!=='string'||!(/^[a-f0-9]{64}$/).test(raw.digest))))fail('REPORT_PROOF_INVALID');
  return raw as ClosingQuery;
}
export function parseClosingInput(raw:unknown):ClosingInput {
  if(!exactKeys(raw,['schemaVersion','operation','period','historicalThroughDate','knowledgeCut','expectedHeadId','expectedHeadVersion',
    'snapshotSchemaVersion','selectionContractVersion','reviewDigest','confirmed'])||raw.schemaVersion!==1
    ||!['INITIAL','REVISION'].includes(String(raw.operation))||!parsePeriod(raw.period).ok
    ||typeof raw.knowledgeCut!=='string'||!(/^(0|[1-9][0-9]{0,18})$/).test(raw.knowledgeCut)||BigInt(raw.knowledgeCut)>MAX_CENTS
    ||(raw.expectedHeadId!==null&&!validUuid(raw.expectedHeadId))
    ||(raw.expectedHeadVersion!==null&&(!Number.isSafeInteger(raw.expectedHeadVersion)||(raw.expectedHeadVersion as number)<1))
    ||typeof raw.historicalThroughDate!=='string'||raw.snapshotSchemaVersion!==1||raw.selectionContractVersion!==1
    ||typeof raw.reviewDigest!=='string'||!(/^[a-f0-9]{64}$/).test(raw.reviewDigest)||raw.confirmed!==true)fail('REPORT_PROOF_INVALID');
  const period=parsePeriod(raw.period);
  if(!period.ok||raw.historicalThroughDate!==endOfMonth(period.value)
    ||(raw.operation==='INITIAL'?(raw.expectedHeadId!==null||raw.expectedHeadVersion!==null):(raw.expectedHeadId===null||raw.expectedHeadVersion===null))
    ||(typeof raw.expectedHeadVersion==='number'&&raw.expectedHeadVersion>1000))fail('REPORT_PROOF_INVALID');
  return raw as ClosingInput;
}
