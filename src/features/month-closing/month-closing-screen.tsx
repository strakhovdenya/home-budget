'use client';
import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import Link from 'next/link';
import { useLocale,useTranslations } from 'next-intl';
import { Alert,Box,Button,Checkbox,FormControlLabel,Paper,Stack,TextField,Typography } from '@mui/material';
import type { Json } from '@/domain/closing/contracts';
import { formatMoney } from '@/features/dashboard/format-money';
import { formatCalendarDate } from '@/features/dashboard/presentation';
import { readCompleteDocument,type ClosingActions,type CloseReview,type MonthView,type ReportSummary } from './presentation';
import { closingReviewContent } from './review-content';

function EvidenceReview({before,after,digest,onRead}:{before:Json|null;after:Json;digest:string;onRead:()=>void}){
  const t=useTranslations('monthClosing'),locale=useLocale(),lines=useMemo(()=>closingReviewContent(before,after,locale,t),[before,after,locale,t]);
  const [page,setPage]=useState(0),[seen,setSeen]=useState<readonly number[]>([]),pages=Math.max(1,Math.ceil(lines.length/20));
  useEffect(()=>{setSeen(old=>old.includes(page)?old:[...old,page]);},[page]);
  useEffect(()=>{if(seen.length===pages)onRead();},[seen.length,pages,onRead]);
  return <Stack component="section" aria-label={t('evidenceReview')} spacing={1} sx={{minWidth:0}}>
    <Typography component="h3" variant="h6">{t(before?'reviewChanges':'evidenceReview')}</Typography>
    <Typography>{t(before?'evidenceExplanation':'initialSourcesExplanation')}</Typography>
    <Box component="dl" data-testid="closing-review-content" sx={{m:0}}>{lines.slice(page*20,page*20+20).map((line,i)=><Box key={page*20+i} sx={{overflowWrap:'anywhere',borderBottom:1,borderColor:'divider',p:1}}>
      {i===0||lines[page*20+i-1].section!==line.section||lines[page*20+i-1].subject!==line.subject?<Typography component="dt" variant="body2" color="text.secondary">{line.section}{line.subject?' — '+line.subject:''}</Typography>:null}
      <Typography component="dt" sx={{fontWeight:600}}>{line.field}{line.parts>1?' — '+t('reviewPart',{n:line.part,total:line.parts}):''}</Typography>
      {before?<Typography component="dd" sx={{m:0,whiteSpace:'pre-wrap'}}>{t('before')}: {line.before}</Typography>:null}
      <Typography component="dd" sx={{m:0,whiteSpace:'pre-wrap'}}>{before?t('after')+': ':''}{line.after}</Typography>
    </Box>)}</Box>
    {lines.length===0?<Typography>{t('reviewSourcesEmpty')}</Typography>:null}
    <Typography role="status">{t('readPages',{read:seen.length,total:pages})}</Typography>
    {pages>1?<Stack direction="row" spacing={1}><Button disabled={page===0} onClick={()=>setPage(page-1)}>{t('evidencePrevious')}</Button>
      <Button disabled={page+1>=pages} onClick={()=>setPage(page+1)}>{t('evidenceNext')}</Button></Stack>:null}
    <Box component="details" sx={{overflowWrap:'anywhere'}}><Box component="summary">{t('reviewTechnical')}</Box>
      <Typography variant="body2">{t('reviewDocumentDigest')}: {digest}</Typography>
      {lines.slice(page*20,page*20+20).map((line,i)=><Typography key={page*20+i} component="pre" variant="body2" sx={{whiteSpace:'pre-wrap',m:0}}>{line.technical}</Typography>)}
    </Box>
  </Stack>;
}

export function MonthClosingReadError(){const t=useTranslations('dashboard');return <Alert severity="error">{t('state.STORAGE_ERROR')}</Alert>;}

function Summary({report,label}:{report:ReportSummary;label:string}){
  const t=useTranslations('monthClosing'),locale=useLocale();
  const m=(v:string|null)=>v===null?t('unknown'):formatMoney(v,locale);
  return <Box component="section" sx={{minWidth:0,p:2,border:1,borderColor:'divider',borderRadius:1}}>
    <Typography component="h3" variant="h6">{label}</Typography>
    <Typography>{t('reportThrough')}: {formatCalendarDate(report.historicalThroughDate,locale)}</Typography>
    <Typography>{t('asClosed')}</Typography>
    <Box component="dl" sx={{m:0}}>{(['endBalanceCents','lastObservedBalanceCents','historicalAllocatedCents','historicalReservedCents','historicalSavingsCents','historicalFreeCents'] as const).map(key=><Box key={key} sx={{display:'flex',justifyContent:'space-between',gap:2,flexWrap:'wrap'}}>
      <Typography component="dt">{t(key)}</Typography><Typography component="dd" sx={{m:0,fontVariantNumeric:'tabular-nums'}}>{m(report[key])}</Typography>
    </Box>)}</Box>
    <Typography>{t('observedDate')}: {report.lastBankObservedDate?formatCalendarDate(report.lastBankObservedDate,locale):t('unknown')}</Typography>
    <Typography>{t('effectiveDate')}: {report.allocationEffectiveDate?formatCalendarDate(report.allocationEffectiveDate,locale):t('unknown')}</Typography>
    <Typography>{t('completeness.'+report.bankDataCompleteness)}</Typography><Typography>{t('noOperations')}</Typography>
    {report.reason?<Typography sx={{overflowWrap:'anywhere'}}>{t('reason')}: {report.reason}</Typography>:null}
  </Box>;
}
function Details({document,label,onRead}:{document:Json;label:string;onRead?:()=>void}){
  const t=useTranslations('monthClosing'),locale=useLocale(),[offset,setOffset]=useState(0);
  type Source={originPeriod?:string;effectiveDate?:string;dueDate?:string|null;original?:string};
  type O=Source&{title:string;outstanding:string;fundingPeriod:string;status:string;reserveFull:boolean};
  type S=Source&{title:string;amount:string;fundingPeriod:string;status:string};
  const doc=document as {snapshot?:{allocations?:{period:string;amount:string}[];obligations?:O[];knownObligations?:O[];savings?:S[];knownSavings?:S[]}};
  const s=doc.snapshot,os=s?.obligations??s?.knownObligations??[],ss=s?.savings??s?.knownSavings??[];
  const lines:({title:string;amount:string;period:string;status:string;reserve:boolean|null}&Source)[]=[...(s?.allocations??[]).map(a=>({title:a.period,amount:a.amount,period:a.period,status:'ALLOCATION',reserve:null})),
    ...os.map(o=>({...o,amount:o.outstanding,period:o.fundingPeriod,reserve:o.reserveFull})),
    ...ss.map(x=>({...x,period:x.fundingPeriod,reserve:null}))];
  const [seen,setSeen]=useState<readonly number[]>([]),pages=Math.max(1,Math.ceil(lines.length/50));
  useEffect(()=>{setSeen(old=>old.includes(offset)?old:[...old,offset]);},[offset]);
  useEffect(()=>{if(seen.length>=pages)onRead?.();},[seen.length,pages,onRead]);
  return <Stack component="section" spacing={1} sx={{minWidth:0}}><Typography component="h3" variant="h6">{label}</Typography>
    {lines.slice(offset,offset+50).map((line,i)=><Box key={offset+i} sx={{p:1,overflowWrap:'anywhere',borderBottom:1,borderColor:'divider'}}>
      <Typography>{line.title} · {formatMoney(line.amount,locale)}</Typography><Typography>{line.period} · {t('lifecycle.'+line.status)}</Typography>
      {line.reserve!==null?<Typography>{t(line.reserve?'selected':'unelected')}</Typography>:null}
      {line.originPeriod?<Typography>{t('origin')}: {line.originPeriod}</Typography>:null}
      {line.original!==undefined?<Typography>{t('original')}: {formatMoney(line.original,locale)}</Typography>:null}
      {line.effectiveDate?<Typography>{t('effective')}: {formatCalendarDate(line.effectiveDate,locale)}</Typography>:null}
      {line.dueDate?<Typography>{t('due')}: {formatCalendarDate(line.dueDate,locale)}</Typography>:null}
    </Box>)}
    {lines.length===0?<Typography>{t('empty')}</Typography>:null}
    {onRead?<Typography role="status">{t('readPages',{read:seen.length,total:pages})}</Typography>:null}
    {pages>1?<Stack direction="row" spacing={1}><Button disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-50))}>{t('previous')}</Button>
      <Button disabled={offset+50>=lines.length} onClick={()=>setOffset(offset+50)}>{t('next')}</Button></Stack>:null}
  </Stack>;
}
export function MonthClosingScreen({initial,actions}:{initial:MonthView;actions:ClosingActions}){
  const t=useTranslations('monthClosing');const [view,setView]=useState(initial),[reason,setReason]=useState(''),[review,setReview]=useState<CloseReview|null>(null),[consent,setConsent]=useState(false),
    [pending,setPending]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[unknown,setUnknown]=useState(false),[after,setAfter]=useState<Json|null>(null),[before,setBefore]=useState<Json|null>(null),[detail,setDetail]=useState<Json|null>(null),[afterRead,setAfterRead]=useState(false),[beforeRead,setBeforeRead]=useState(false),[readFailed,setReadFailed]=useState(false);
  const [evidenceRead,setEvidenceRead]=useState(false);
  const markAfter=useCallback(()=>setAfterRead(true),[]),markBefore=useCallback(()=>setBeforeRead(true),[]),markEvidence=useCallback(()=>setEvidenceRead(true),[]);
  const busy=useRef(false),original=useRef<CloseReview['command']|null>(null),result=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),cancelFocus=useRef(false);
  useEffect(()=>{if(!review&&cancelFocus.current){cancelFocus.current=false;trigger.current?.focus();}},[review]);
  const dirty=!!reason||!!review||unknown;
  useEffect(()=>{if(!dirty)return;const unload=(e:BeforeUnloadEvent)=>e.preventDefault();const navigate=(e:MouseEvent)=>{const a=e.target instanceof Element?e.target.closest('a[href]'):null;if(a&&!window.confirm(t(unknown?'unknownOutcome':'unsaved')))e.preventDefault();};
    window.addEventListener('beforeunload',unload);document.addEventListener('click',navigate,true);return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigate,true);};},[dirty,unknown,t]);
  useEffect(()=>{if(error||notice)result.current?.focus();},[error,notice]);
  function query(version:number|null=null){return {period:view.period,version,offset:0,digest:null};}
  async function perform(run:()=>Promise<void>){if(busy.current)return;busy.current=true;setPending(true);setError('');try{await run();}catch{setError('error');}finally{busy.current=false;setPending(false);}}
  async function load(version:number|null=null){const r=await actions.load(query(version));if(!r.ok)throw Error(r.code);setView(r.value as unknown as MonthView);setDetail(null);setReadFailed(false);}
  async function saved(){setUnknown(false);original.current=null;setReview(null);setAfter(null);setBefore(null);setReason('');setConsent(false);setNotice('saved');try{await load();}catch{setReadFailed(true);}}
  async function readDocument(version:number,digest:string|null=null){return readCompleteDocument(offset=>actions.chunk({...query(version),offset,digest}),digest);}
  async function preview(){await perform(async()=>{
    const request={requestId:crypto.randomUUID(),expectedRevision:view.revision,effectiveDate:view.today,reason,payload:{schemaVersion:1,operation:view.headId?'REVISION':'INITIAL',period:view.period,expectedHeadId:view.headId,expectedHeadVersion:view.headVersion}};
    const r=await actions.preview(request);if(!r.ok){setError(r.code==='NO_REPORT_CHANGE'?'noChange':'error');return;}
    const next=r.value as unknown as CloseReview;setConsent(false);setAfterRead(false);setBeforeRead(!next.before);setEvidenceRead(false);setAfter(null);setBefore(null);setReview(next);
    const full=await readCompleteDocument(offset=>actions.review(next.command,offset),next.detailDigest);
    let prior:Json|null=null;if(next.before?.version)prior=await readDocument(next.before.version,next.before.digest??null);
    setAfter(full);setBefore(prior);
  });}
  async function confirm(){if(!review||!after||!consent||!afterRead||!beforeRead||!evidenceRead)return;await perform(async()=>{
    original.current=review.command;
    try{const r=await actions.confirm(review.command);if(!r.ok){if(r.code==='COMMIT_OUTCOME_UNKNOWN'){setUnknown(true);setError('unknownOutcome');}else setError('error');return;}
      await saved();
    }catch{setUnknown(true);setError('unknownOutcome');}
  });}
  async function status(retry=false){await perform(async()=>{
    const command=original.current;if(!command)return;
    const r=retry?await actions.confirm(command):await actions.status(command.requestId);
    if(!r.ok){setError('unknownOutcome');return;}if(!r.value){setError('unknownOutcome');return;}
    await saved();
  });}
  return <Paper component="section" aria-busy={pending} sx={{p:{xs:2,sm:3},mt:3,minWidth:0}}><Stack spacing={2}>
    <Typography component="h2" variant="h5">{t('title')}</Typography><Typography>{view.period} · {t('state.'+view.state)}</Typography>
    <Typography>{t('separate')}</Typography>{view.correctionPending?<Alert severity="info">{t('pending')}</Alert>:null}
    <Box ref={result} tabIndex={-1} aria-live="polite">{error?<Alert severity="error">{t(error)}</Alert>:notice?<Alert severity="success">{t(notice)}</Alert>:null}</Box>
    {readFailed?<Alert severity="warning">{t('reloadNeeded')}</Alert>:null}
    {pending?<Typography role="status">{t('loading')}</Typography>:null}
    {view.report&&!review?<><Summary report={view.report} label={t('version',{n:view.report.version??0})}/>
      <Stack component="nav" direction="row" spacing={1} sx={{flexWrap:'wrap'}} aria-label={t('versions')}>
        {view.versions.map(v=><Button key={v.version} component={Link} prefetch={false} href={`/months?period=${view.period}&version=${v.version}`} aria-current={view.report?.version===v.version?'page':undefined}>{t('version',{n:v.version})}</Button>)}
        {view.nextVersionOffset!==null?<Button disabled={pending||unknown} onClick={()=>perform(async()=>{const r=await actions.load({...query(),offset:view.nextVersionOffset});if(!r.ok)throw Error(r.code);const next=r.value as unknown as MonthView;setView(old=>({...old,versions:[...old.versions,...next.versions],nextVersionOffset:next.nextVersionOffset}));})}>{t('moreVersions')}</Button>:null}
      </Stack><Button disabled={pending||unknown} onClick={()=>perform(async()=>{if(view.report?.version)setDetail(await readDocument(view.report.version,view.report.digest??null));})}>{t('details')}</Button>
      {detail?<Details document={detail} label={t('details')}/>:null}</>:null}
    {unknown?<Stack spacing={1}><Typography>{t('unknownOutcome')}</Typography><Button disabled={pending} onClick={()=>status()}>{t('check')}</Button><Button disabled={pending} onClick={()=>status(true)}>{t('retry')}</Button></Stack>:
    <>{!readFailed&&(view.state==='AWAITING_CLOSE'||view.state==='CLOSED')?<Box component="form" onSubmit={e=>{e.preventDefault();void preview();}}>
      <TextField required fullWidth label={t('reason')} name="closingReason" autoComplete="off" value={reason} disabled={pending||!!review}
        onChange={e=>setReason(e.target.value)} slotProps={{htmlInput:{maxLength:1000}}}/>
      <Button ref={trigger} type="submit" disabled={pending||!!review} sx={{mt:1}}>{t('preview')}</Button>
    </Box>:null}
    {review?<Stack spacing={2}>
      {!review.before?<Alert severity="info"><Typography sx={{fontWeight:600}}>{t('initialReport')}</Typography>{t('initialReportExplanation')}</Alert>:null}
      {review.before?<Summary report={review.before} label={t('before')}/>:null}<Summary report={review.after} label={t(review.before?'after':'reportToConfirm')}/>
      {before?<Details key={'before'+review.command.requestId} document={before} label={t('before')} onRead={markBefore}/>:null}{after?<Details key={'after'+review.command.requestId} document={after} label={t(review.before?'after':'reviewReportContents')} onRead={markAfter}/>:null}
      {review.before&&(['endBalanceCents','lastObservedBalanceCents','historicalAllocatedCents','historicalReservedCents','historicalSavingsCents','historicalFreeCents'] as const).every(key=>review.before![key]===review.after[key])?<Alert severity="info">{t('reviewSameAmounts')}</Alert>:null}
      {after?<EvidenceReview key={'evidence'+review.command.requestId} before={before} after={after} digest={review.detailDigest} onRead={markEvidence}/>:null}
      <FormControlLabel label={t('consent')} control={<Checkbox checked={consent} disabled={pending||!after||!afterRead||!beforeRead||!evidenceRead} onChange={e=>setConsent(e.target.checked)}/>}/>
      <Button variant="contained" disabled={pending||!after||!consent||!afterRead||!beforeRead||!evidenceRead} onClick={confirm}>{t('confirm')}</Button>
      <Button disabled={pending} onClick={()=>{cancelFocus.current=true;setReview(null);setAfter(null);setBefore(null);setConsent(false);}}>{t('cancel')}</Button>
    </Stack>:null}</>}
    <Button component={Link} prefetch={false} href="/update-budget">{t('update')}</Button><Typography variant="body2">{t('memory')}</Typography>
    <Button disabled={pending||unknown} onClick={()=>perform(async()=>{await load();setReview(null);setAfter(null);setBefore(null);setConsent(false);original.current=null;})}>{t('refresh')}</Button>
  </Stack></Paper>;
}
