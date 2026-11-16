import {createHash} from 'node:crypto';
/** Physical report-row oracle. No production report/projection/codec is called. */
export function storedReport(row:Record<string,unknown>,period:string){
 const keys=['historicalThroughDate','lastCheckpointId','lastBankObservedDate','lastBankObservedAt','lastObservedBalanceCents','historicalAllocationRevisionId','allocationEffectiveDate','endCheckpointId','endBalanceCents','bankDataCompleteness','operationDetailStatus','historicalAllocatedCents','historicalReservedCents','historicalSavingsCents','historicalFreeCents','snapshotSchemaVersion','selectionContractVersion'];
 const scalars:Record<string,unknown>={};for(const key of keys){const column=key.replace(/[A-Z]/g,c=>'_'+c.toLowerCase()),value=row[column];if(value===undefined)throw Error('F_REPORT_PERSISTED_COLUMN_MISSING');scalars[key]=key.endsWith('Cents')&&value!==null?String(value):value;}
 const snapshot=row.snapshot_json as {obligations?:{revisionId:string}[];knownObligations?:{revisionId:string}[];savings?:{revisionId:string}[];knownSavings?:{revisionId:string}[]};
 return{schemaVersion:1,period,...scalars,snapshot,obligationRevisionIds:(snapshot.obligations??snapshot.knownObligations??[]).map(r=>r.revisionId).sort(),savingsRevisionIds:(snapshot.savings??snapshot.knownSavings??[]).map(r=>r.revisionId).sort(),orderingRevisionRefs:row.ordering_revision_refs,sourceManifest:row.source_manifest};
}
function canonical(value:unknown):string{if(Array.isArray(value))return'['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical((value as Record<string,unknown>)[k])).join(',')+'}';return JSON.stringify(value);}
export const storedDigest=(value:unknown)=>createHash('sha256').update(canonical(value),'utf8').digest('hex');
