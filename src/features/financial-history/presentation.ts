import type {CanonicalValue} from '@/domain/updates/contracts';
import type {Basis} from '@/domain/history/contracts';
import {parseCentsString} from '@/domain/money/money-codec';
import {parsePeriod} from '@/domain/periods/period';
export type HistoryChange={action:string;title?:string;amount?:string;period?:string;date?:string;status?:string;reserve?:string};
export type HistorySummary={batchId:string;basis:Basis;kind:'INITIAL'|'UPDATE'|'CONFIG'|'ACCEPT'|'DECLINE'|'CLOSE';changes:HistoryChange[]};
type Doc=Record<string,CanonicalValue>;
function object(v:unknown):Doc|null{return v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Doc:null;}
function amount(v:unknown):string|undefined{return typeof v==='string'&&parseCentsString(v).ok?v:undefined;}
function title(v:unknown):string|undefined{return typeof v==='string'&&v.trim()&&[...v].length<=200?v:undefined;}
function period(v:unknown):string|undefined{return parsePeriod(v).ok?v as string:undefined;}
/** Only call after the existing original SOURCE verifier succeeds. Never use a current projection. */
export function summarizeVerifiedSource(raw:CanonicalValue):HistorySummary{
  const d=object(raw);if(!d||!object(d.basis)||typeof d.batchId!=='string')throw Error('INVALID_SOURCE_SUMMARY');
  const base={batchId:d.batchId,basis:d.basis as unknown as Basis};
  if(d.precision==='REPORT')return {...base,kind:'CLOSE',changes:[]};
  if(d.precision!=='SOURCE'||d.perspective!=='SOURCE')throw Error('INVALID_SOURCE_SUMMARY');
  const changes:HistoryChange[]=[],template=object(d.template),input=object(object(template?.command)?.payload),source=object(template?.source);
  const evidence=Array.isArray(d.evidence)?d.evidence.map(object).filter((v):v is Doc=>!!v):[];
  if(input&&source){
    if(input.action==='DECLINE')return {...base,kind:'DECLINE',changes:[{action:'DECLINE',title:title(source.title),period:period(input.originPeriod)}]};
    if(input.action==='ACCEPT')return {...base,kind:'ACCEPT',changes:[{action:'CREATE',title:title(source.title),amount:amount(input.amountCents),period:period(input.originPeriod),status:'UNPAID',reserve:amount(input.amountCents)}]};
    if(input.action==='CONFIG'){
      const control=evidence.map(a=>object(a.beforeAfter)??object(a.document)).find(a=>object(a?.entity)?.type==='TEMPLATE_CONFIG');
      const before=object(control?.before);
      const action=input.expectedVersion===null?'CONFIG_CREATED':before?.enabled===true&&input.enabled===false?'CONFIG_DISABLED':before?.enabled===false&&input.enabled===true?'CONFIG_ENABLED':'CONFIG_CHANGED';
      return {...base,kind:'CONFIG',changes:[{action,title:title(source.title),amount:amount(input.amountCents)}]};
    }
  }
  // A truncated evidence page cannot claim to describe every action in the update.
  if(d.nextOffset!==null&&d.nextOffset!==undefined)return {...base,kind:'UPDATE',changes:[]};
  const refs=Array.isArray(d.periodReferences)?d.periodReferences.map(object):[],sources=object(d.source);
  const originalRefs=Array.isArray(sources?.sources)?sources.sources.map(object):[];
  let initial=false;
  for(const audit of evidence){
    const doc=object(audit.beforeAfter)??object(audit.document),entity=object(doc?.entity),after=object(doc?.after);
    if(entity?.type==='ACCOUNT_CREATED')initial=true;
    if(entity?.type==='BANK_CHECKPOINT'&&after&&amount(after.balanceCents)!==undefined)changes.push({action:'CHECK',amount:amount(after.balanceCents),date:typeof after.observedDate==='string'?after.observedDate:undefined});
    if(entity?.type==='OBLIGATION_STATE'&&after){
      const state=object(after.state),ref=originalRefs.find(r=>r?.kind==='OBLIGATION_STATE'&&r.id===entity.id);
      if(!state||typeof ref?.action!=='string'||!['CREATE','AMEND','PAID','PARTIAL_SETTLEMENT','CANCELLED'].includes(ref.action))continue;
      const funding=refs.find(p=>p?.id===state.fundingPeriodId)?.period;
      changes.push({action:ref.action,title:title(state.title),amount:amount(object(after.payment)?.amountCents)??(['CREATE','AMEND'].includes(ref.action)?amount(state.originalCents):undefined),
        period:period(funding),status:typeof state.status==='string'?state.status:undefined,reserve:state.status==='UNPAID'&&state.reserveFull===true?amount(state.outstandingCents):'0'});
    }
  }
  return {...base,kind:initial?'INITIAL':'UPDATE',changes};
}
