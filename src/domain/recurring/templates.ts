import {normalizeValue} from '@/domain/updates/canonical-value';
import {exactKeys} from '@/domain/checkpoints/validation';
import {validUuid} from '@/domain/updates/validation';
import {parseCentsString} from '@/domain/money/money-codec';
import {parsePeriod} from '@/domain/periods/period';
import {parseObligationBatch} from '@/domain/obligations/validation';
import type {PreparedCommand,CanonicalValue} from '@/domain/updates/contracts';
export type Template={id:string;version:string;title:string;amountCents:string;enabled:boolean};
export type Config={schemaVersion:1;action:'CONFIG';templateId:string;expectedVersion:string|null;title:string;amountCents:string;enabled:boolean};
export type Accept={schemaVersion:1;action:'ACCEPT';templateId:string;templateVersion:string;originPeriod:string;fundingPeriod:string;amountCents:string;
  placement:{expectedOrderingRevisionId:string|null;afterPositionId:string|null;beforePositionId:string|null}|null};
export type Decline={schemaVersion:1;action:'DECLINE';templateId:string;templateVersion:string;originPeriod:string};
export type TemplateInput=Config|Accept|Decline;
export function parseTemplateInput(raw:unknown):TemplateInput{
  const v=normalizeValue(raw);
  if(!v||typeof v!=='object'||Array.isArray(v)||!('action'in v)||!('schemaVersion'in v)||v.schemaVersion!==1)throw Error('INVALID_INPUT');
  const keys=v.action==='CONFIG'?['schemaVersion','action','templateId','expectedVersion','title','amountCents','enabled']:
    v.action==='ACCEPT'?['schemaVersion','action','templateId','templateVersion','originPeriod','fundingPeriod','amountCents','placement']:
    v.action==='DECLINE'?['schemaVersion','action','templateId','templateVersion','originPeriod']:null;
  if(!keys||!exactKeys(v,keys)||!validUuid(v.templateId)||v.templateId!==v.templateId.toLowerCase())throw Error('INVALID_INPUT');
  if(v.action==='CONFIG'){
    if(v.expectedVersion!==null&&!validUuid(v.expectedVersion)||typeof v.title!=='string'||v.title!==v.title.trim()
      ||[...v.title].length<1||[...v.title].length>200||typeof v.enabled!=='boolean')throw Error('INVALID_INPUT');
  }else if(!validUuid(v.templateVersion)||!parsePeriod(v.originPeriod).ok)throw Error('INVALID_INPUT');
  if(v.action!=='DECLINE'){const amount=parseCentsString(v.amountCents);if(!amount.ok||amount.value<=0n)throw Error('INVALID_INPUT');}
  if(v.action==='ACCEPT'){
    if(!parsePeriod(v.fundingPeriod).ok||v.fundingPeriod!==v.originPeriod)throw Error('INVALID_INPUT');
    if(v.placement!==null){if(!exactKeys(v.placement,['expectedOrderingRevisionId','afterPositionId','beforePositionId']))throw Error('INVALID_INPUT');
      for(const x of Object.values(v.placement))if(x!==null&&!validUuid(x))throw Error('INVALID_INPUT');}
  }
  return v as unknown as TemplateInput;
}
/** Exact typed adapter; inner provenance is prepared independently but never gets a receipt. */
export function acceptedObligationPayload(input:Accept,source:Template,effectiveDate:string):CanonicalValue{
  parseTemplateInput(input);
  if(input.templateId!==source.id||input.templateVersion!==source.version||!source.enabled)throw Error('STALE_TEMPLATE');
  const payload={changes:[{key:'template_accept',action:'CREATE',obligationId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,
    effectiveDate,bankDate:null,data:{title:source.title,dueDate:null,originalCents:input.amountCents,isPossible:false,reserveFull:true,
      originatingPeriod:input.originPeriod,fundingPeriod:input.fundingPeriod},placement:input.placement,bankCheck:null,paymentConfirmation:null}]};
  if(!parseObligationBatch(payload).ok)throw Error('INVALID_INPUT');
  return payload;
}
export function commandDocument(c:PreparedCommand){return {expectedRevision:c.expectedRevision.toString(),effectiveDate:c.effectiveDate,reason:c.reason,payload:c.payload};}
