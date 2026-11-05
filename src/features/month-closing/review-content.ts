import type { Json } from '@/domain/closing/contracts';
import {formatMoney} from '@/features/dashboard/format-money';
import {formatCalendarDate} from '@/features/dashboard/presentation';

type RecordValue={readonly [key:string]:Json};
type Translate=(key:string,values?:Record<string,string|number>)=>string;
export type ReviewContentRow=Readonly<{section:string;subject:string;field:string;before:string;after:string;part:number;parts:number;technical:string;
  key:string;group:'card'|'allocation'|'earmarks'|'history';coverage:readonly string[];destination?:'summary'|'evidence'}>;
const object=(v:Json|undefined):v is RecordValue=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const own=(v:Json|undefined,key:string):Json|undefined=>object(v)&&Object.hasOwn(v,key)?v[key]:Array.isArray(v)&&/^(0|[1-9]\d*)$/.test(key)?v[Number(key)]:undefined;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const money=new Set(['amount','original','outstanding','balance','amountCents','originalCents','outstandingCents','balanceCents','endBalanceCents','lastObservedBalanceCents','historicalAllocatedCents','historicalReservedCents','historicalSavingsCents','historicalFreeCents']);
const summary=new Set(['schemaVersion','period','historicalThroughDate','snapshotSchemaVersion','selectionContractVersion','bankDataCompleteness','operationDetailStatus','lastBankObservedDate','lastBankObservedAt','allocationEffectiveDate',...money]);
const detail=new Set(['title','original','outstanding','amount','originPeriod','fundingPeriod','effectiveDate','dueDate','status','reserveFull']);
/** Split visible text, never a UTF-16 pair. No omitted tail and no huge DOM row. */
function fragments(text:string){const parts:string[]=[];for(let i=0;i<text.length;){let end=Math.min(i+256,text.length);if(end<text.length&&/[\uD800-\uDBFF]/.test(text[end-1]))end--;parts.push(text.slice(i,end));i=end;}return parts.length?parts:[''];}

/** Presentation only. Inputs are complete SHA-verified report documents. Every
 * changed value/ref is retained; primary labels give refs distinct stable names,
 * while raw identifiers/paths remain secondary diagnostic information. Initial
 * review describes existing content, never a diff against an absent report. */
export function closingReviewContent(before:Json|null,after:Json,locale:string,t:Translate):readonly ReviewContentRow[]{
  function presentationShape(doc:Json){
    if(!object(doc)||!object(doc.snapshot))return doc;const snapshot={...doc.snapshot};
    // These are the same source sets in the no-observation/complete variants.
    // A newly observed bank balance does not recreate unchanged obligations.
    for(const [known,current]of [['knownObligations','obligations'],['knownSavings','savings']])if(!Object.hasOwn(snapshot,current)&&Array.isArray(snapshot[known])){snapshot[current]=snapshot[known];delete snapshot[known];}
    return {...doc,snapshot};
  }
  before=before===null?null:presentationShape(before);after=presentationShape(after);
  const rows:ReviewContentRow[]=[],refs=new Map<string,string>(),counts=new Map<string,number>();let visits=0;
  const titleIndexes=new Map<Json|null,Map<string,string>>();
  const identityIndexes=new Map<Json|null,Map<string,string>>();
  const sourceIndexes=new Map<Json|null,Map<string,Json>>(),periodIndexes=new Map<Json|null,Map<string,string|null>>();
  function sourceTitle(doc:Json|null,type:Json|undefined,id:Json|undefined){
    if(!titleIndexes.has(doc)){const index=new Map<string,string>(),identities=new Map<string,string>(),sources=new Map<string,Json>(),snapshot=own(doc??undefined,'snapshot');
      for(const [key,kind]of [['obligations','OBLIGATION_STATE'],['knownObligations','OBLIGATION_STATE'],['savings','SAVINGS_STATE'],['knownSavings','SAVINGS_STATE']]){
        const list=own(snapshot,key);if(Array.isArray(list))for(const entry of list){const rev=own(entry,'revisionId'),title=own(entry,'title'),identity=own(entry,'identityId');if(typeof rev==='string'){sources.set(kind+':'+rev,entry);if(typeof title==='string')index.set(kind+':'+rev,title);if(typeof identity==='string')identities.set(kind+':'+rev,identity);}}}
      titleIndexes.set(doc,index);identityIndexes.set(doc,identities);sourceIndexes.set(doc,sources);
    }return typeof type==='string'&&typeof id==='string'?titleIndexes.get(doc)!.get(type+':'+id):undefined;
  }
  function periodName(doc:Json|null,id:string){
    if(!periodIndexes.has(doc)){sourceTitle(doc,undefined,undefined);const index=new Map<string,string|null>(),list=own(own(doc??undefined,'sourceManifest'),'evidence');
      if(Array.isArray(list))for(const item of list){const document=own(item,'document'),entity=own(document,'entity'),type=own(entity,'type'),rev=own(entity,'id'),source=typeof type==='string'&&typeof rev==='string'?sourceIndexes.get(doc)?.get(type+':'+rev):undefined,state=own(own(document,'after'),'state');
        if(!source)continue;for(const [field,name]of [['originatingPeriodId','originPeriod'],['fundingPeriodId','fundingPeriod']]){const key=own(state,field),period=own(source,name);
          if(typeof key==='string'&&typeof period==='string')index.set(key,index.has(key)&&index.get(key)!==period?null:period);}}
      periodIndexes.set(doc,index);
    }return periodIndexes.get(doc)!.get(id);
  }
  const initial=before===null;
  const fieldName=(key:string)=>t('reviewFields.'+key);
  const knownFields=new Set(['id','identityId','revisionId','accountId','ownerUserId','positionId','transitionDecisionId','checkpointId','allocationRevisionId','lastCheckpointId','historicalAllocationRevisionId','anchorCheckpointRevisionId','endCheckpointId','obligationRevisionIds','savingsRevisionIds','orderingRevisionRefs','orderingRevisionIds','budgetUpdateId','recordedSeq','knowledgeCut','capturedAggregateRevision','schemaVersion','selectionVersion','selectionContractVersion','snapshotSchemaVersion','period','historicalThroughDate','lastBankObservedAt','lastBankObservedDate','allocationEffectiveDate','observedAt','observedDate','effectiveDate','dueDate','bankDate','date','historicalDate','originPeriod','originatingPeriodId','fundingPeriod','fundingPeriodId','kind','status','action','title','isPossible','reserveFull','amount','original','outstanding','balance','amountCents','originalCents','outstandingCents','balanceCents','endBalanceCents','lastObservedBalanceCents','historicalAllocatedCents','historicalReservedCents','historicalSavingsCents','historicalFreeCents','bankDataCompleteness','operationDetailStatus','supersedesId','previousRevisionId','logicalFactId','confirmedAt','eventIndex','before','after','state','entity','document','type','payment','source','paymentConfirmation','unchangedBalanceAcknowledged','bankStateAffirmed','allocations','obligations','knownObligations','savings','knownSavings','checkpoint','provenance','sourceManifest','snapshot','evidence','evidenceNote','note','ref','positionIds','edges','reason','fundingRefs','transitionDecision','decisionId','proposalId','sourcePeriodId','targetPeriodId','releasedCents','fundedCents']);
  const label=(key:string)=>knownFields.has(key)?fieldName(key):t('reviewExtraField',{name:key.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ')});
  knownFields.add('obligationId');knownFields.add('savingsId');
  function at(doc:Json|null,path:readonly string[]){let value:Json|undefined=doc;for(const key of path)value=own(value,key);return value;}
  function context(path:readonly string[],doc:Json|null){
    const evidence=path.indexOf('evidence');
    if(evidence>=0){const entry=at(doc,path.slice(0,evidence+2)),d=own(entry,'document'),entity=own(d,'entity'),type=own(entity,'type');
      const title=sourceTitle(doc,type,own(entity,'id'));
      return {section:t('evidenceReview'),subject:t('reviewEvidenceNumber',{n:Number(path[evidence+1])+1})+(typeof type==='string'?' — '+enumValue(type):'')+(typeof title==='string'?' «'+title+'»':'')};}
    const source=path.findIndex(k=>['obligations','knownObligations','savings','knownSavings','allocations'].includes(k));
    if(source>=0){const entity=at(doc,path.slice(0,source+2)),title=own(entity,'title'),period=own(entity,'period');return {section:t('reviewReportContents'),subject:label(path[source])+' — '+(typeof title==='string'?title:typeof period==='string'?period:t('reviewItemNumber',{n:Number(path[source+1])+1}))};}
    return {section:path.some(k=>/order|positionIds|edges/i.test(k))?t('reviewOrdering'):t('reviewReportContents'),subject:''};
  }
  const enumKeys=new Set(['NO_OBSERVATION','ACTIVE_COMPLETE','INCOMPLETE_STATE','END_DATE_OBSERVED','INCOMPLETE','NOT_PROVIDED','UNPAID','PAID','CANCELLED','ACTIVE','RELEASED','BANK_CHECKPOINT','ALLOCATION_REVISION','DAY_ORDERING','OBLIGATION_STATE','SAVINGS_STATE','CREATE','AMEND','PARTIAL_SETTLEMENT','FUNDING_TRANSFER','REPORT_REVIEW_REQUIRED','TRACKED_CARD','OTHER_SOURCE','REUSE_CONFIRMED','ACTUAL_CHECK','CARRY','FRESH_START','DEFER','BANK_HEAD','BUDGET_TRANSFER','BUDGET_UPDATE_REVIEW','TRANSITION_DECISION','TRANSITION_CONFIRMATION','ALLOCATION_ONLY_REVIEW','INCREASE','DECREASE','RELEASE']);
  function enumValue(v:string){return enumKeys.has(v)?t('reviewEnums.'+v):v;}
  function refKind(path:readonly string[],doc:Json|null){
    if(/periodId$/i.test(path.at(-1)??''))return 'period';
    const joined=path.join(' ');if(/checkpoint|bank/i.test(joined))return 'bank';if(/positionIds|edges|positionId/i.test(joined))return 'position';if(/ordering/i.test(joined))return 'ordering';
    if(path.at(-1)==='obligationId'||path.at(-1)==='identityId'&&/obligation/i.test(joined))return 'obligationIdentity';
    if(path.at(-1)==='savingsId'||path.at(-1)==='identityId'&&/saving/i.test(joined))return 'savingIdentity';
    if(/allocation/i.test(joined))return 'allocation';if(/budgetUpdate|recordedSeq|knowledgeCut/i.test(joined))return 'update';
    if(/account|owner|actor/i.test(joined))return 'budget';
    if(path.at(-1)==='id'&&path.includes('evidence')&&path.indexOf('evidence')===path.length-3)return 'evidence';
    if(path.includes('evidence')&&['id','revisionId','supersedesId','previousRevisionId','logicalFactId'].includes(path.at(-1)??'')){const entry=at(doc,path.slice(0,path.indexOf('evidence')+2)),type=own(own(own(entry,'document'),'entity'),'type');
      if(type==='OBLIGATION_STATE')return 'obligation';if(type==='SAVINGS_STATE')return 'saving';if(type==='BANK_CHECKPOINT')return 'bank';if(type==='ALLOCATION_REVISION')return 'allocation';if(type==='DAY_ORDERING')return 'ordering';}
    if(/saving|savings/i.test(joined))return 'saving';if(/obligation/i.test(joined))return 'obligation';
    return 'source';
  }
  function value(v:Json|undefined,path:readonly string[],doc:Json|null):string{
    const key=path.at(-1)??'',parent=[...path].reverse().find(k=>!/^\d+$/.test(k))??key;
    if(v===undefined)return t('reviewNotRecorded');
    if(v===null){if(['observedAt','lastBankObservedAt'].includes(key))return t('timeNotRecorded');if(['supersedesId','previousRevisionId'].includes(key))return t('noPreviousRecord');return money.has(key)||key.endsWith('Cents')||['lastBankObservedDate','allocationEffectiveDate','observedDate'].includes(key)?t('unknown'):t('reviewNotSpecified');}
    if(typeof v==='boolean')return t(v?'reviewYes':'reviewNo');
    if(Array.isArray(v))return t(v.length?'reviewList':'reviewNoEntries');if(object(v))return t(Object.keys(v).length?'reviewStructuredData':'reviewNoDetails');
    if(typeof v==='string'){
      if(['title','note','evidenceNote','reason'].includes(key))return v||t('reviewEmptyText');
      if((uuid.test(v)&&!['title','note','evidenceNote','reason'].includes(parent)||/Id$|Ids$|Refs$/.test(parent)||['id','ref'].includes(parent))&&v){
        const kind=refKind(path,doc),identity=kind+':'+v;if(!refs.has(identity)){const n=(counts.get(kind)??0)+1;counts.set(kind,n);refs.set(identity,t('reviewReferences.'+kind,{n}));}
        const period=kind==='period'?periodName(doc,v):null;return period?new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',timeZone:'Europe/Berlin'}).format(new Date(period+'-15T12:00:00Z'))+' — '+refs.get(identity)!:refs.get(identity)!;
      }
      if((money.has(key)||key.endsWith('Cents')||path.includes('allocations'))&&/^-?\d+$/.test(v))return formatMoney(v,locale);
      if(v==='')return t('reviewEmptyText');
      if(/^\d{4}-\d{2}$/.test(v))return new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',timeZone:'Europe/Berlin'}).format(new Date(v+'-15T12:00:00Z'));
      if(/^\d{4}-\d{2}-\d{2}$/.test(v))return formatCalendarDate(v,locale);
      if(/^\d{4}-\d{2}-\d{2}T/.test(v)&&Number.isFinite(Date.parse(v))){
        const fraction=(v.match(/\.(\d{1,6})/)?.[1]??'').padEnd(6,'0'),decimal=new Intl.NumberFormat(locale).formatToParts(1.1).find(p=>p.type==='decimal')?.value??'.';
        return new Intl.DateTimeFormat(locale,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short',timeZone:'Europe/Berlin'}).formatToParts(new Date(v)).map(p=>p.type==='second'?p.value+decimal+fraction:p.value).join('');
      }
      return ['kind','status','action','type','source','bankDataCompleteness','operationDetailStatus','mode','observationMode'].includes(key)?enumValue(v):v;
    }return String(v);
  }
  function initialCovered(path:readonly string[],v:Json|undefined){
    if(path.length===1&&summary.has(path[0]))return true;
    if(v===1&&/^(schemaVersion|selectionVersion)$/.test(path.at(-1)??''))return true;
    if(path.join('.')==='snapshot.accountId'||path.join('.')==='snapshot.kind')return true;
    if(path[0]==='snapshot'&&['obligations','knownObligations','savings','knownSavings','allocations'].includes(path[1])&&path.length===4&&detail.has(path[3]))return true;
    // Empty references do not establish a historical source. The visible empty
    // state and financial detail list describe the absence, not a made-up change.
    return (v===null||Array.isArray(v)&&v.length===0)&&(/Id$|Ids$|Refs$/.test(path.at(-1)??'')||['evidence','knownObligations','knownSavings','obligations','savings','allocations'].includes(path.at(-1)??''));
  }
  function add(path:readonly string[],a:Json|undefined,b:Json|undefined,oldPath:readonly string[]=path){
    if(initial&&initialCovered(path,b))return;
    const c=context(b===undefined?oldPath:path,b===undefined?before:after),key=path.at(-1)??'';
    const labels=path.filter((k,i)=>!['snapshot','sourceManifest','document','entity','provenance','evidence','after','state'].includes(k)
      &&!(['obligations','knownObligations','savings','knownSavings','allocations'].includes(k)&&c.subject)
      &&!(/^\d+$/.test(k)&&['evidence','obligations','knownObligations','savings','knownSavings','allocations'].includes(path[i-1])));
    const name=labels.length?labels.map(k=>/^\d+$/.test(k)?t('reviewItemNumber',{n:Number(k)+1}):label(k)).join(' — '):label(key);
    const left=fragments(value(a,oldPath,before)),right=fragments(value(b,path,after)),names=fragments(name),subjects=fragments(c.subject),parts=Math.max(left.length,right.length,names.length,subjects.length);
    const raw=(v:Json|undefined)=>v===undefined?'—':JSON.stringify(v);
    const technical=fragments(name+'\n'+(initial?raw(b):raw(a)+' → '+raw(b)));
    // A bounded diagnostic preview never creates blank primary pages. Complete
    // meaningful values, including long note text, are in the primary fragments.
    const sourcePath=b===undefined?oldPath:path,doc=b===undefined?before:after,evidence=sourcePath.indexOf('evidence');
    const type=evidence<0?'':own(own(own(at(doc,sourcePath.slice(0,evidence+2)),'document'),'entity'),'type');
    const scope=sourcePath.join(' ')+' '+String(type??'');
    const group=/obligation|saving|OBLIGATION|SAVINGS/.test(scope)?'earmarks':/checkpoint|bank|BANK_CHECKPOINT/i.test(scope)?'card':/allocation|ALLOCATION_REVISION/i.test(scope)?'allocation':'history';
    for(let part=0;part<parts;part++)rows.push({section:c.section,subject:subjects[part]??(subjects.length===1?subjects[0]:''),field:names[part]??(names.length===1?names[0]:''),before:left[part]??'',after:right[part]??'',part:part+1,parts,technical:technical[part]??'',key,group,coverage:[JSON.stringify([oldPath,path,part])]});
  }
  function itemKey(entry:Json,path:readonly string[],doc:Json|null):string|null{
    const collection=path.at(-1);
    if(['obligations','knownObligations','savings','knownSavings'].includes(collection??'')){const id=own(entry,'identityId');return typeof id==='string'?id:null;}
    if(collection==='allocations'){const period=own(entry,'period');return typeof period==='string'?period:null;}
    if(collection!=='evidence')return null;
    const document=own(entry,'document'),entity=own(document,'entity'),type=own(entity,'type'),id=own(entity,'id'),state=own(document,'after');
    if(typeof type!=='string'||typeof id!=='string')return null;
    sourceTitle(doc,type,id);const logical=identityIndexes.get(doc)?.get(type+':'+id);
    if(logical)return type+':'+logical;
    const date=own(state,'date')??own(state,'historicalDate'),fact=own(state,'logicalFactId');
    return type+':'+(type==='DAY_ORDERING'&&typeof date==='string'?date:typeof fact==='string'?fact:id);
  }
  function walk(a:Json|undefined,b:Json|undefined,path:readonly string[],depth:number,oldPath:readonly string[]=path){
    if(++visits>200000||depth>32)throw Error('REPORT_LIMIT_EXCEEDED');if(!initial&&a===b)return;
    const ao=object(a)||Array.isArray(a),bo=object(b)||Array.isArray(b);
    if(ao||bo){
      if(Array.isArray(a)&&Array.isArray(b)&&!initial){
        const old=a.map((v,i)=>({key:itemKey(v,path,before),value:v,index:i})),next=b.map((v,i)=>({key:itemKey(v,path,after),value:v,index:i}));
        // Match source sets by logical identity, not their UUID sort position.
        // Event positions and dependency edges remain positional and observable.
        if([...old,...next].every(x=>x.key!==null)&&new Set(old.map(x=>x.key)).size===old.length&&new Set(next.map(x=>x.key)).size===next.length){
          const previous=new Map(old.map(x=>[x.key,x])),current=new Map(next.map(x=>[x.key,x]));
          for(const key of new Set([...previous.keys(),...current.keys()])){const x=previous.get(key),y=current.get(key);walk(x?.value,y?.value,[...path,String(y?.index??x!.index)],depth+1,[...oldPath,String(x?.index??y!.index)]);}return;
        }
      }
      const keys=[...new Set([...Object.keys(ao?a:{}),...Object.keys(bo?b:{})])].sort((x,y)=>/^\d+$/.test(x)&&/^\d+$/.test(y)?Number(x)-Number(y):x<y?-1:x>y?1:0);
      if(!keys.length){if(initial||!ao||!bo||Array.isArray(a)!==Array.isArray(b))add(path,a,b,oldPath);return;}
      if(ao&&bo&&Array.isArray(a)!==Array.isArray(b))add(path,a,b,oldPath);
      if(!initial&&ao!==bo&&a!==undefined&&b!==undefined)add(path,a,b,oldPath);
      for(const key of keys)walk(own(a,key),own(b,key),[...path,key],depth+1,[...oldPath,key]);
    }else add(path,a,b,oldPath);
  }
  walk(before??undefined,after,[],0);return rows;
}
