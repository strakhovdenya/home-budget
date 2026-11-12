'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import {Alert,Box,Button,Card,CardContent,Paper,Stack,TextField,Typography} from '@mui/material';
import type {Basis,Entry,HistoryResult,Page,PageQuery} from '@/domain/history/contracts';
import {sameBasis} from '@/domain/history/validation';
import {endOfMonth,parsePeriod} from '@/domain/periods/period';
import type {CanonicalValue} from '@/domain/updates/contracts';
import type {HistoryActions} from './read-history';
import {formatMoney} from '@/features/dashboard/format-money';
import type {HistoryChange,HistorySummary} from './presentation';
import {formatCalendarDate,formatMonth} from '@/features/dashboard/presentation';

type Data={readonly [key:string]:CanonicalValue};
function object(v:CanonicalValue|undefined):Data|null{return v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Data:null;}
function text(v:CanonicalValue|undefined):string{return typeof v==='string'?v:'';}
export function FinancialHistoryScreen({initial,actions}:{initial:HistoryResult<Page>|null;actions:HistoryActions}){
  const t=useTranslations('financialHistory'),r=useTranslations('recurring'),locale=useLocale();
  const [page,setPage]=useState<Page|null>(initial?.ok?initial.value:null),[stack,setStack]=useState<PageQuery[]>([]),[filter,setFilter]=useState('');
  const [pending,setPending]=useState(false),[error,setError]=useState(initial&&!initial.ok?initial.code:''),[selected,setSelected]=useState<Entry|null>(null);
  const [detail,setDetail]=useState<Data|null>(null),[day,setDay]=useState(''),[perspective,setPerspective]=useState<'ORIGINAL'|'LATER'|'REPORT'|'SOURCE'>('ORIGINAL');
  const generation=useRef(0),detailHeading=useRef<HTMLHeadingElement>(null);
  const [summaries,setSummaries]=useState<Record<string,HistorySummary>>({});
  const queue=useRef<Promise<unknown>>(Promise.resolve());
  function enqueue<T>(run:()=>Promise<T>):Promise<T>{const result=queue.current.catch(()=>undefined).then(run);queue.current=result;return result;}
  const openAction=actions.open;
  useEffect(()=>{
    const request=++generation.current;let disposed=false;setPending(true);setError('');
    void openAction({schemaVersion:1,month:null}).then(r=>{if(disposed||request!==generation.current)return;if(r.ok)setPage(r.value);else setError(r.code);})
      .catch(()=>{if(!disposed&&request===generation.current)setError('STORAGE_ERROR');})
      .finally(()=>{if(!disposed&&request===generation.current)setPending(false);});
    return ()=>{disposed=true;generation.current++;};
  },[openAction]);
  useEffect(()=>{
    if(!page||!actions.summarize)return;const summarize=actions.summarize,basis=page.basis;let disposed=false;setSummaries({});
    void (async()=>{for(const entry of page.items){
      if(disposed)return;if(entry.sourceStatus!=='VALID')continue;
      try{const result=await enqueue(()=>summarize({schemaVersion:1,basis,batchId:entry.id,dayH:basis.today,perspective:'SOURCE',offset:0}));
        if(disposed)return;if(result.ok&&result.value.batchId===entry.id&&sameBasis(result.value.basis,basis))setSummaries(old=>({...old,[entry.id]:result.value}));
      }catch{/* Leave a neutral title; selected detail retains explicit fail-closed errors. */}
    }})();
    return()=>{disposed=true;};
  },[page,actions.summarize]);
  useEffect(()=>{if(detail)detailHeading.current?.focus();},[detail]);
  function date(value:string){return formatCalendarDate(value,locale);}
  function instant(value:string){return new Intl.DateTimeFormat(locale,{timeZone:'Europe/Berlin',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZoneName:'shortOffset'}).format(new Date(value));}
  function money(value:CanonicalValue|undefined){return value===null||value===undefined?t('unknown'):formatMoney(text(value),locale);}
  async function refresh(){
    const request=++generation.current;setPending(true);setError('');setPage(null);setSelected(null);setDetail(null);setStack([]);
    try{const r=await actions.open({schemaVersion:1,month:filter||null});if(request!==generation.current)return;if(!r.ok)setError(r.code);else setPage(r.value);}
    catch{if(request===generation.current)setError('STORAGE_ERROR');}finally{if(request===generation.current)setPending(false);}
  }
  async function navigate(back:boolean){
    if(!page)return;
    const current:PageQuery={schemaVersion:1,basis:page.basis,fromLastSeq:page.fromLastSeq,lastSeq:page.lastSeq};
    const q=back?stack.at(-1):page.nextLastSeq?{schemaVersion:1 as const,basis:page.basis,fromLastSeq:page.lastSeq,lastSeq:page.nextLastSeq}:null;
    if(!q)return;
    const request=++generation.current;setPending(true);setError('');setSelected(null);setDetail(null);
    try{const r=await actions.page(q);if(request!==generation.current)return;
      if(!r.ok)setError(r.code);
      else if(r.value.schemaVersion!==1||!sameBasis(page.basis,r.value.basis)||r.value.fromLastSeq!==q.fromLastSeq||r.value.lastSeq!==q.lastSeq)setError('INVALID_INPUT');
      else {setPage(r.value);setStack(back?stack.slice(0,-1):[...stack,current]);}
    }catch{if(request===generation.current)setError('STORAGE_ERROR');}finally{if(request===generation.current)setPending(false);}
  }
  async function read(entry:Entry,h:string,view:typeof perspective,offset=0){
    if(!page)return;
    const request=++generation.current,basis=page.basis;setPending(true);setError('');setSelected(entry);setDay(h);setPerspective(view);setDetail(null);
    try{const r=await enqueue(()=>actions.detail({schemaVersion:1,basis,batchId:entry.id,dayH:h,perspective:view,offset}));if(request!==generation.current)return;
      if(!r.ok)setError(r.code);else{
        const v=object(r.value),echo=v?.basis;
        if(!v||v.schemaVersion!==1||v.offset!==offset||v.batchId!==entry.id||!echo||typeof echo!=='object'||Array.isArray(echo)||!sameBasis(basis,echo as unknown as Basis)
          ||v.perspective!==view||(view!=='REPORT'&&v.dayH!==h))setError('INVALID_INPUT');
        else setDetail(v);
      }
    }catch{if(request===generation.current)setError('STORAGE_ERROR');}finally{if(request===generation.current)setPending(false);}
  }
  function open(entry:Entry){
    if(!page)return;
    const first=entry.sources.filter(s=>s.kind!=='AUDIT').map(s=>s.date).filter(Boolean).sort().at(-1)??page.basis.today;
    const month=parsePeriod(first.slice(0,7)),h=month.ok&&first.slice(0,7)<page.basis.today.slice(0,7)?endOfMonth(month.value):page.basis.today;
    void read(entry,h,entry.kind==='MONTH_CLOSE'?'REPORT':'ORIGINAL');
  }
  function changeLabel(change:HistoryChange){
    return t('changes.'+change.action,{name:change.title??'',amount:change.amount===undefined?'':formatMoney(change.amount,locale),
      date:change.date?date(change.date):'',month:change.period?formatMonth(change.period,locale):t('unspecifiedMonth')});
  }
  function entryTitle(entry:Entry){
    const summary=summaries[entry.id];
    if(summary?.kind==='INITIAL')return t('firstBalance');
    if(summary?.changes.length===1)return changeLabel(summary.changes[0]);
    return t(entry.kind==='MONTH_CLOSE'?'closingTitle':entry.kind==='TEMPLATE_CONFIG'?'templateTitle':entry.kind==='TEMPLATE_DECLINE'?'declineTitle':entry.kind==='TEMPLATE_ACCEPT'?'acceptTitle':'updateTitle');
  }
  const template=object(detail?.template),templateSource=object(template?.source),templateCommand=object(template?.command),templateInput=object(templateCommand?.payload);
  const reportMeta=object(detail?.reportMeta);
  const report=object(detail?.report),snapshot=object(detail?.snapshot)??object(report?.snapshot),bank=object(snapshot?.checkpoint);
  const periods=Array.isArray(detail?.periods)?detail.periods:report?[{period:report.period,allocated:report.historicalAllocatedCents,reserved:report.historicalReservedCents,savings:report.historicalSavingsCents,free:report.historicalFreeCents,deficit:null}]:[];
  const identities=snapshot?.kind==='NO_OBSERVATION'?[...(Array.isArray(snapshot.knownObligations)?snapshot.knownObligations:[]),...(Array.isArray(snapshot.knownSavings)?snapshot.knownSavings:[])]:[...(Array.isArray(snapshot?.obligations)?snapshot.obligations:[]),...(Array.isArray(snapshot?.savings)?snapshot.savings:[])];
  return <Stack spacing={3} sx={{minWidth:0,overflowWrap:'anywhere'}} aria-busy={pending}>
    <Typography component="h1" variant="h2">{t('title')}</Typography><Typography>{t('intro')}</Typography>
    <Stack direction={{xs:'column',sm:'row'}} spacing={2}>
      <TextField type="month" label={t('month')} value={filter} onChange={e=>setFilter(e.target.value)} slotProps={{inputLabel:{shrink:true}}}/>
      <Button disabled={pending} onClick={()=>void refresh()}>{t('refresh')}</Button>
    </Stack>
    <Box role="status" aria-live="polite">{pending?t('loading'):page?t('progress',{page:stack.length+1,count:page.items.length}):''}</Box>
    {error?<Alert severity="error" role="alert">{t('error')}: {t(`errors.${error}`)}</Alert>:null}
    {page?<>
      <details><summary>{t('technical')}</summary><Typography>{t('indexCut',{cut:page.basis.knowledgeCut})}</Typography></details>
      {page.sourceValidity==='INVALID'?<Alert severity="warning">{t('invalidSources')}</Alert>:null}
      {page.items.length===0?<Typography>{t('empty')}</Typography>:<Stack component="ol" spacing={2} sx={{listStyle:'none',p:0,m:0}}>
        {page.items.map(entry=><Card component="li" key={entry.id} variant="outlined"><CardContent>
          <Typography>{t('recorded')}: <time dateTime={entry.recordedAt}>{instant(entry.recordedAt)}</time></Typography>
          {entry.sourceStatus!=='VALID'?<Typography>{t('status.'+entry.sourceStatus)}</Typography>:null}
          <Typography component="h2" variant="h6">{entryTitle(entry)}</Typography>
          {(summaries[entry.id]?.changes.length??0)>1||summaries[entry.id]?.kind==='INITIAL'?<Box component="ul">{summaries[entry.id].changes.map((change,index)=><li key={index}>{changeLabel(change)}{change.reserve!==undefined?' · '+t('reserved')+': '+formatMoney(change.reserve,locale):''}</li>)}</Box>:null}
          <Button disabled={pending||entry.sourceStatus!=='VALID'} onClick={()=>open(entry)}>{t('open')}</Button>
          <details><summary>{t('technical')}</summary><Typography>{entry.kind} · {entry.recordedSeq}</Typography><Box component="ul" sx={{pl:2}}>{entry.sources.map(source=><li key={source.kind+source.id}>{t('sourceKinds.'+source.kind)} · {source.date} · {source.id}</li>)}</Box></details>
        </CardContent></Card>)}
      </Stack>}
      <Stack direction="row" spacing={1}><Button disabled={pending||stack.length===0} onClick={()=>void navigate(true)}>{t('previous')}</Button><Button disabled={pending||page.nextLastSeq===null} onClick={()=>void navigate(false)}>{t('next')}</Button></Stack>
    </>:null}
    {selected&&page?<Box component="section" aria-labelledby="history-detail-heading">
      <Typography id="history-detail-heading" component="h2" variant="h4" tabIndex={-1} ref={detailHeading}>{t('selected')}</Typography>
      <TextField type="date" label={t('day')} value={day} onChange={e=>setDay(e.target.value)} slotProps={{inputLabel:{shrink:true},htmlInput:{max:page.basis.today}}} sx={{my:2}}/>
      <Stack direction={{xs:'column',sm:'row'}} spacing={1}>
        <Button disabled={pending} aria-pressed={perspective==='SOURCE'} onClick={()=>void read(selected,day,'SOURCE')}>{t('sourceFacts')}</Button>
        <Button disabled={pending} aria-pressed={perspective==='ORIGINAL'} onClick={()=>void read(selected,day,'ORIGINAL')}>{t('original')}</Button>
        <Button disabled={pending} aria-pressed={perspective==='LATER'} onClick={()=>void read(selected,day,'LATER')}>{t('later')}</Button>
        {selected.kind==='MONTH_CLOSE'?<Button disabled={pending} aria-pressed={perspective==='REPORT'} onClick={()=>void read(selected,day,'REPORT')}>{t('report')}</Button>:null}
      </Stack>
      {detail?<Stack spacing={2} sx={{mt:2}}>
        <Typography>{detail.precision==='SOURCE'?t('sourceCaption'):detail.precision==='DAY'?t(perspective==='LATER'?'laterCaption':'originalCaption',{day:date(text(detail.dayH))}):t('reportCaption')}</Typography>
        {detail.precision==='DAY'&&typeof detail.knowledgeRecordedAt==='string'?<Typography>{t('knowledgeRecorded')}: <time dateTime={detail.knowledgeRecordedAt}>{instant(detail.knowledgeRecordedAt)}</time></Typography>:null}
        {reportMeta?<>
          <Typography>{t('reportHumanBasis',{version:typeof reportMeta.version==='number'?reportMeta.version:0,day:date(text(reportMeta.dayH))})}</Typography>
          <Typography>{t('reportReason')}: {text(reportMeta.reason)}</Typography>
          {reportMeta.previousVersionId===null?<Typography>{t('initialVersion')}</Typography>:null}
          {typeof reportMeta.createdAt==='string'?<Typography>{t('reportCreated')}: <time dateTime={reportMeta.createdAt}>{instant(reportMeta.createdAt)}</time></Typography>:null}
        </>:null}
        {detail.precision!=='SOURCE'?<><Typography>{t('bank')}: {bank?money(bank.balance):t('unknown')}</Typography>
        <Typography>{t('observed')}: {bank?date(text(bank.observedDate)):t('unknown')}</Typography>
        <Typography>{t('end')}: {money(detail.precision==='REPORT'?report?.endBalanceCents:detail.endBalance)}</Typography>
        </>:null}
        <Typography>{t('noInference')}</Typography>
        {templateInput&&templateSource?<Paper variant="outlined" sx={{p:2}}><Typography component="h3" variant="h6">{text(templateSource.title)}</Typography>
          <Typography>{templateInput.action==='DECLINE'?r('declineReview',{month:formatMonth(text(templateInput.originPeriod),locale)}):templateInput.action==='ACCEPT'?r('acceptReview'):r('configOnly')}</Typography>
          {templateInput.action!=='DECLINE'?<Typography>{r('amount')}: {money(templateInput.amountCents)}</Typography>:null}
          {templateInput.action!=='CONFIG'?<Typography>{r('origin')}: {formatMonth(text(templateInput.originPeriod),locale)}{templateInput.action==='ACCEPT'?' · '+r('funding')+': '+formatMonth(text(templateInput.fundingPeriod),locale):''}</Typography>:<Typography>{r(templateInput.enabled===true?'enabled':'disabled')}</Typography>}
        </Paper>:null}
        <Stack spacing={2}>{periods.map((value,index)=>{const p=object(value as CanonicalValue);return p?<Card key={text(p.period)||index} variant="outlined"><CardContent><Typography component="h3" variant="h6">{formatMonth(text(p.period),locale)}</Typography><Box component="dl" sx={{m:0}}>{(['allocated','reserved','savings','free','deficit'] as const).map(key=><Box key={key}><Typography component="dt">{t(key)}</Typography><Typography component="dd" sx={{ml:0,mb:1}}>{money(p[key])}</Typography></Box>)}</Box></CardContent></Card>:null;})}</Stack>
        {identities.map((value,index)=>{const i=object(value);return i?<Box key={text(i.revisionId)||index}><Typography>{text(i.title)} · {t('identityStatus.'+text(i.status))}</Typography><Typography>{Object.hasOwn(i,'outstanding')?t('outstanding'):t('savingAmount')}: {money(Object.hasOwn(i,'outstanding')?i.outstanding:i.amount)}</Typography>{Object.hasOwn(i,'original')?<Typography>{t('originalAmount')}: {money(i.original)}</Typography>:null}{i.isPossible===true?<Typography>{t('possible')}</Typography>:null}{Object.hasOwn(i,'outstanding')?<Typography>{t('reserved')}: {money(i.status==='UNPAID'&&i.reserveFull===true?i.outstanding:'0')}</Typography>:null}{i.status==='UNPAID'?<Typography>{i.reserveFull===true?t('fullReserve'):t('excludedReserve')}</Typography>:null}<Typography>{t('origin')}: {formatMonth(text(i.originPeriod),locale)} · {t('funding')}: {formatMonth(text(i.fundingPeriod),locale)}</Typography><Typography>{t('effective')}: {date(text(i.effectiveDate))}</Typography></Box>:null;})}
        <details><summary>{t('technical')}</summary><Box component="pre" sx={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12}}>{JSON.stringify(detail,null,2)}</Box></details>
        {typeof detail.nextOffset==='number'?<Button disabled={pending} onClick={()=>void read(selected,day,perspective,detail.nextOffset as number)}>{t('moreEvidence')}</Button>:null}
      </Stack>:null}
    </Box>:null}
  </Stack>;
}
