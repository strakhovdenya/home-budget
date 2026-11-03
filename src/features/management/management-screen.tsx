'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import type { ManagementKind, ManagementList, ManagementHistory, HistoryQuery, ReleaseProposal } from '@/domain/management/contracts';
import type { ProjectionResult } from '@/domain/forecast/contracts';
import type { CanonicalValue } from '@/domain/updates/contracts';
import { useBudgetWorkspace, requestEntry, type EntryIntent } from '@/features/budget-updates/budget-draft-provider';
import { formatMoney } from '@/features/dashboard/format-money';
import { formatCalendarDate, formatMonth } from '@/features/dashboard/presentation';

export type ManagementActions = {
  load: () => Promise<ProjectionResult<ManagementList>>;
  history: (q: HistoryQuery) => Promise<ProjectionResult<ManagementHistory>>;
  propose: (id: string) => Promise<ProjectionResult<ReleaseProposal>>;
};
type Item = ManagementList['obligations'][number] | ManagementList['savings'][number];
function isObligation(i: Item): i is ManagementList['obligations'][number] { return 'outstanding' in i; }
export function orderedItems(items: readonly Item[], status: string, period: string) {
  const order: Record<string, number> = { UNPAID: 0, ACTIVE: 0, PAID: 1, CANCELLED: 2, RELEASED: 1 };
  return items.filter(i => (!status || i.status === status) && (!period || i.fundingPeriod === period)).sort((a,b) => {
    const dueA=isObligation(a)?a.dueDate??'9999-99-99':'',dueB=isObligation(b)?b.dueDate??'9999-99-99':'';
    return order[a.status]-order[b.status] || dueA.localeCompare(dueB) || a.identityId.localeCompare(b.identityId);
  });
}
export function ManagementScreen({ initial, kind, actions }: { initial: ManagementList; kind: ManagementKind; actions: ManagementActions }) {
  const t=useTranslations('management'),u=useTranslations('budgetUpdate'),d=useTranslations('dashboard'),locale=useLocale(),router=useRouter();
  const [data,setData]=useState(initial),[status,setStatus]=useState(''),[period,setPeriod]=useState(''),[visible,setVisible]=useState(50);
  const [selected,setSelected]=useState<Item|null>(null),[history,setHistory]=useState<ManagementHistory|null>(null);
  const [pending,setPending]=useState(false),[error,setError]=useState(false),[entry,setEntry]=useState<EntryIntent|null>(null),[blocked,setBlocked]=useState(false);
  const [accessLost,setAccessLost]=useState(false);
  const version=useRef(0),store=useBudgetWorkspace(data.scopeKey);
  const items=kind==='OBLIGATION'?data.obligations:data.savings,filtered=orderedItems(items,status,period);
  const projection=data.projection,ready=projection.kind==='ACCOUNT_ESTIMATE'?projection:null;
  const budgets=new Map(ready?.periods.map(p=>[p.period,p])??[]);
  const m=(s:string)=>formatMoney(s,locale),month=(s:string)=>formatMonth(s,locale);
  function launch(intent:EntryIntent,replace=false){const result=requestEntry(store,intent,replace);
    if(result==='READY'){setEntry(null);setSelected(null);router.push('/update-budget');}
    else{setEntry(intent);setBlocked(result==='UNKNOWN');}}
  function intent(item:Item,action:string,amount?:string):EntryIntent{return {kind,identityId:item.identityId,revisionId:item.revisionId,action,...(amount?{suggestedAmount:amount}:{})};}
  async function refresh(){setPending(true);setError(false);version.current++;try{const r=await actions.load();if(r.ok){setData(r.value);setSelected(null);setHistory(null);}else{if(r.code==='FORBIDDEN'||r.code==='UNAUTHORIZED')setAccessLost(true);setSelected(null);setHistory(null);setError(true);}}catch{setError(true);}finally{setPending(false);}}
  async function detail(item:Item,cursor:string|null=null){const generation=++version.current;setSelected(item);if(!cursor)setHistory(null);setPending(true);setError(false);
    try{const r=await actions.history({kind,identityId:item.identityId,cursor});if(generation!==version.current)return;
      if(r.ok)setHistory(old=>cursor&&old?{...r.value,hasNewData:r.value.hasNewData||r.value.knowledgeCut!==data.knowledgeCut,entries:[...old.entries,...r.value.entries]}:{...r.value,hasNewData:r.value.hasNewData||r.value.knowledgeCut!==data.knowledgeCut});else{if(r.code==='FORBIDDEN'||r.code==='UNAUTHORIZED')setAccessLost(true);setError(true);}
    }catch{if(generation===version.current)setError(true);}finally{if(generation===version.current)setPending(false);}}
  async function suggest(item:Item){setPending(true);setError(false);try{const p=await actions.propose(item.identityId);
    if(p.ok&&p.value.revisionId===item.revisionId&&p.value.knowledgeCut===data.knowledgeCut&&p.value.amount!=='0'){
      launch(intent(item,p.value.amount===('amount'in item?item.amount:'')?'FULL_RELEASE':'PARTIAL_RELEASE',p.value.amount));
    }else{if(!p.ok&&(p.code==='FORBIDDEN'||p.code==='UNAUTHORIZED'))setAccessLost(true);setError(true);}}catch{setError(true);}finally{setPending(false);}}
  function state(value:CanonicalValue){if(!value||typeof value!=='object'||Array.isArray(value))return <Typography>—</Typography>;
    const v=value as Record<string,CanonicalValue>;
    return <Stack spacing={0.5}>
      {typeof v.title==='string'?<Typography sx={{overflowWrap:'anywhere'}}>{u('name')}: {v.title}</Typography>:null}
      {['originalCents','outstandingCents','amountCents'].map((k,i)=>typeof v[k]==='string'?<Typography key={k}>{u(['originalAmount','outstandingAmount','amount'][i])}: {m(v[k] as string)}</Typography>:null)}
      {typeof v.status==='string'?<Typography>{t('status')}: {u(`status.${v.status}`)}</Typography>:null}
      {typeof v.reserveFull==='boolean'?<Typography>{u('reserveFull')}: {u(v.reserveFull?'yes':'no')}</Typography>:null}
      {typeof v.isPossible==='boolean'?<Typography>{u('possible')}: {u(v.isPossible?'yes':'no')}</Typography>:null}
      {'dueDate'in v?<Typography>{u('dueDate')}: {typeof v.dueDate==='string'?formatCalendarDate(v.dueDate,locale):t('noDue')}</Typography>:null}
    </Stack>;}
  function itemFacts(item:Item){const b=budgets.get(item.fundingPeriod);return <Stack spacing={1}>
    <Typography>{t('status')}: {u(`status.${item.status}`)}</Typography>
    <Typography>{t('origin')}: {month(item.originPeriod)}</Typography><Typography>{u('fundingPeriod')}: {month(item.fundingPeriod)}</Typography>
    {isObligation(item)?<><Typography>{u('originalAmount')}: {m(item.original)}</Typography><Typography>{u('outstandingAmount')}: {m(item.outstanding)}</Typography>
      <Typography>{t('reserved')}: {m(item.status==='UNPAID'&&item.reserveFull?item.outstanding:'0')}</Typography>
      <Typography>{u('dueDate')}: {item.dueDate?formatCalendarDate(item.dueDate,locale):t('noDue')}</Typography>
      {item.isPossible?<Alert severity="info">{u('possible')} · {t(item.reserveFull?'selectedReserve':'noReserve')}</Alert>:null}</>
      :<><Typography>{t('retained')}: {m(item.amount)}</Typography><Typography variant="body2">{t('savingExplanation')}</Typography></>}
    <Typography>{t('monthFree')}: {b?m(b.free):t('unavailable')}</Typography>
    {b?.free.startsWith('-')?<Alert severity="warning">{t('deficit')}: {m(b.deficit)}</Alert>:null}
  </Stack>;}
  const active=selected&&(selected.status==='UNPAID'||selected.status==='ACTIVE');
  if(accessLost)return <Alert severity="error">{u('errors.access')}</Alert>;
  return <Stack spacing={3} sx={{minWidth:0,'& .MuiButton-root':{minHeight:44,whiteSpace:'normal'},'& .MuiTypography-root':{overflowWrap:'anywhere'}}}>
    <Typography component="h1" variant="h1">{t(kind==='OBLIGATION'?'obligations':'savings')}</Typography>
    <Typography>{t('intro')}</Typography><Stack direction="row" sx={{flexWrap:'wrap',gap:1}}>
      <Button variant="contained" onClick={()=>launch({kind,identityId:null,revisionId:null,action:'CREATE'})}>{t('create')}</Button>
      <Button disabled={pending} onClick={refresh}>{t('refresh')}</Button></Stack>
    {kind==='OBLIGATION'?<Typography variant="body2">{t('reserveExplanation')}</Typography>:null}
    {error?<Alert severity="error" role="alert">{t('error')} <Button onClick={()=>selected?detail(selected):refresh()} disabled={pending}>{t('retry')}</Button></Alert>:null}
    {ready?<Paper variant="outlined" sx={{p:2}}><Stack spacing={1}>
      <Typography>{d('bank')}: {m(ready.bank.balance)}</Typography><Typography>{t('checked')}: {formatCalendarDate(ready.bank.observedDate,locale)}</Typography>
      {ready.freshness.ageDays>0?<Typography>{t('oldData')}</Typography>:null}{ready.freshness.showReminder?<Alert severity="info">{t('reminder')}</Alert>:null}
      <Typography sx={{fontWeight:700}}>{t('safeDaily')}: {m(ready.currentLiquidity.safeDailyLimit)}</Typography>
      {ready.currentLiquidity.coverageGroups.map((g,i)=><Alert severity="warning" key={i}>{t('shortage')}: {m(g.amount)} · {g.meanings.map(key=>d(`meaning.${key}`)).join(' · ')}</Alert>)}
    </Stack></Paper>:<Alert severity="info">{t('noObservation')}</Alert>}
    <Stack direction={{xs:'column',sm:'row'}} spacing={2}>
      <TextField select label={t('status')} value={status} onChange={e=>{setStatus(e.target.value);setVisible(50);}} fullWidth>
        <MenuItem value="">{t('allStatuses')}</MenuItem>{(kind==='OBLIGATION'?['UNPAID','PAID','CANCELLED']:['ACTIVE','RELEASED']).map(s=><MenuItem key={s} value={s}>{u(`status.${s}`)}</MenuItem>)}</TextField>
      <TextField select label={u('fundingPeriod')} value={period} onChange={e=>{setPeriod(e.target.value);setVisible(50);}} fullWidth>
        <MenuItem value="">{t('allMonths')}</MenuItem>{[...new Set(items.map(i=>i.fundingPeriod))].sort().map(p=><MenuItem key={p} value={p}>{month(p)}</MenuItem>)}</TextField>
    </Stack>
    {!filtered.length?<Alert severity="info">{t(items.length?'emptyFilter':'empty')} {items.length?<Button onClick={()=>{setStatus('');setPeriod('');}}>{t('clearFilters')}</Button>:null}</Alert>:null}
    <Stack component="ul" spacing={2} sx={{listStyle:'none',m:0,p:0}}>{filtered.slice(0,visible).map(item=><Paper component="li" key={item.identityId} variant="outlined" sx={{p:{xs:2,sm:3},minWidth:0}}>
      <Stack spacing={2}><Typography component="h2" variant="h3">{item.title}</Typography>{itemFacts(item)}<Button onClick={()=>detail(item)}>{t('detailsHistory')}</Button></Stack>
    </Paper>)}</Stack>
    {filtered.length>visible?<Button onClick={()=>setVisible(n=>n+50)}>{t('more')}</Button>:null}
    <Dialog open={!!selected} onClose={()=>{version.current++;setSelected(null);setPending(false);}} fullWidth maxWidth="md" aria-labelledby="management-detail-title">
      <DialogTitle id="management-detail-title" sx={{overflowWrap:'anywhere'}}>{selected?.title}</DialogTitle><DialogContent dividers sx={{'& .MuiButton-root':{minHeight:44},overflowWrap:'anywhere'}}>
        {selected?<Stack spacing={3}>{itemFacts(selected)}
          {active?<Stack spacing={1}>{(kind==='OBLIGATION'?['AMEND','PARTIAL_SETTLEMENT','PAID','CANCELLED']:['AMEND','INCREASE','PARTIAL_RELEASE','FULL_RELEASE']).map(action=><Button disabled={pending||history?.knowledgeCut!==data.knowledgeCut} key={action} onClick={()=>launch(intent(selected,action))}>{u(`action.${action}`)}</Button>)}
            {kind==='SAVING'&&budgets.get(selected.fundingPeriod)?.free.startsWith('-')?<Button disabled={pending} onClick={()=>suggest(selected)}>{t('considerRelease')}</Button>:null}
          </Stack>:<Alert severity="info">{t('terminal')}</Alert>}
          <Typography component="h2" variant="h3">{u('history')}</Typography><Typography>{t('historyExplanation')}</Typography>
          {error?<Alert severity="error">{t('error')} <Button onClick={()=>detail(selected)}>{t('retry')}</Button></Alert>:null}
          {history?<><Typography>{t('historyCut',{date:formatCalendarDate(history.through,locale),cut:history.knowledgeCut})}</Typography>
            {history.hasNewData?<Alert severity="info">{t('newData')} <Button onClick={refresh}>{t('refresh')}</Button></Alert>:null}
            {history.entries.map(e=><Paper variant="outlined" key={e.id} sx={{p:2}}><Stack spacing={1}>
              <Typography component="h3" variant="h3">{u(`action.${e.action}`)}</Typography>
              <Typography>{t('effective')}: {formatCalendarDate(e.effectiveDate,locale)}</Typography>
              <Typography>{u('recordedAt')}: {new Intl.DateTimeFormat(locale,{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(e.recordedAt))}</Typography>
              <Typography>{t('origin')}: {month(e.originPeriod)} · {u('fundingPeriod')}: {month(e.fundingPeriod)}</Typography>
              {e.supersededBy?<Alert severity="info">{t('superseded')}</Alert>:null}{e.supersedesId?<Typography>{t('correction')}</Typography>:null}
              <Typography sx={{fontWeight:700}}>{u('before')}</Typography>{e.beforeFundingPeriod?<Typography>{u('fundingPeriod')}: {month(e.beforeFundingPeriod)}</Typography>:null}{state(e.before)}<Typography sx={{fontWeight:700}}>{u('after')}</Typography>{state(e.after)}
              {e.payment&&typeof e.payment==='object'&&!Array.isArray(e.payment)?<><Typography>{u('paymentAmount')}: {m(String((e.payment as Record<string,CanonicalValue>).amountCents))}</Typography>
                <Typography>{u('paymentSource')}: {u((e.payment as Record<string,CanonicalValue>).source==='TRACKED_CARD'?'trackedCard':'outsideCard')}</Typography>
                <Typography>{u('bankConsent')}: {u((e.payment as Record<string,CanonicalValue>).bankStateAffirmed?'yes':'no')}</Typography><Typography>{u('unchangedConsent')}: {u((e.payment as Record<string,CanonicalValue>).unchangedBalanceAcknowledged?'yes':'no')}</Typography></>:null}
              {e.increase?<Typography>{u('increasedAmount')}: {m(e.increase)}</Typography>:null}{e.released?<Typography>{u('releasedAmount')}: {m(e.released)}</Typography>:null}
              {e.bankDate?<Typography>{u('bankDate')}: {formatCalendarDate(e.bankDate,locale)}</Typography>:null}
              <details><summary>{t('evidence')}</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:'0.75rem'}}>{JSON.stringify({revision:e.id,previous:e.previousRevisionId,supersedes:e.supersedesId,position:e.positionId,recordedSeq:e.recordedSeq,confirmedAt:e.confirmedAt,actor:e.actorId,reason:e.reason,before:e.before,after:e.after,payment:e.payment,funding:e.fundingProof},null,2)}</pre></details>
            </Stack></Paper>)}{history.cursor?<Button disabled={pending} onClick={()=>detail(selected,history.cursor)}>{t('more')}</Button>:null}
          </>:null}</Stack>:null}
      </DialogContent><DialogActions><Button onClick={()=>{version.current++;setSelected(null);setPending(false);}}>{t('close')}</Button></DialogActions>
    </Dialog>
    <Dialog open={!!entry} onClose={()=>setEntry(null)} aria-labelledby="management-draft-title"><DialogTitle id="management-draft-title">{t(blocked?'unknownTitle':'draftTitle')}</DialogTitle>
      <DialogContent>{t(blocked?'unknownDraft':'existingDraft')}</DialogContent><DialogActions sx={{flexWrap:'wrap'}}><Button onClick={()=>setEntry(null)}>{t('close')}</Button>
        <Button onClick={()=>{setEntry(null);router.push('/update-budget');}}>{t('returnDraft')}</Button>{!blocked&&entry?<Button onClick={()=>launch(entry,true)}>{t('replaceDraft')}</Button>:null}</DialogActions></Dialog>
    <Typography role="status" aria-live="polite">{pending?t('loading'):''}</Typography>
  </Stack>;
}
