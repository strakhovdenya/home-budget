'use client';

import { useEffect, useRef } from 'react';
import { BudgetEditors } from './budget-editors';
import { BudgetSession, useBudgetWorkspace, useBudgetState, useBudgetRef, openBudgetSession } from './budget-draft-provider';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import type { CanonicalValue, CommitReceipt } from '@/domain/updates/contracts';
import { formatMoney } from '@/features/dashboard/format-money';
import { formatCalendarDate } from '@/features/dashboard/presentation';
import { initialForm, makeBudgetCommand, FormInputError, type BudgetActions, type DraftEdit, type UpdateForm, type UpdateSeed } from './presentation';
import { parseBudgetDraft,cashVectorGap } from '@/domain/budget-update/validation';

type ReviewState={title:string;fundingPeriodId:string;originalCents?:string;outstandingCents?:string;amountCents?:string;status:string;reserveFull?:boolean};
type FinancialReview={effectiveDate:string;bank:{balanceCents:string;observedDate:string};allocations:{period:string;amountCents:string}[];fundingPeriods:{id:string;period:string}[];
  projection:{bank?:{balance:string;observedDate:string};periods?:{period:string;allocated:string;reserved:string;savings:string;free:string;deficit:string}[];
    safe?:{safeAvailable:string;safeDailyLimit:string;coverageGroups:{amount:string;meanings:string[]}[]};freshness?:{showReminder:boolean;ageDays:number}};
  obligations:{action:string;before:ReviewState|null;after:ReviewState;payment:{amountCents:string;source:string;unchangedBalanceAcknowledged:boolean}|null}[];
  savings:{action:string;before:ReviewState|null;after:ReviewState;confirmedIncreaseAmount:string|null;confirmedReleasedAmount:string|null}[]};
function Review({review}:{review:{financial:FinancialReview}}){
  const t=useTranslations('budgetUpdate'),d=useTranslations('dashboard'),locale=useLocale(),f=review.financial,m=(c:string)=>formatMoney(c,locale);
  return <Stack spacing={2}>
    <Typography>{t('bank')}: {m(f.bank.balanceCents)} · {formatCalendarDate(f.bank.observedDate,locale)}</Typography>
    <Typography>{t('effectiveDate')}: {formatCalendarDate(f.effectiveDate,locale)}</Typography>
    {f.projection.safe?<><Typography component="h3" variant="h4">{t('safeDaily')}: {m(f.projection.safe.safeDailyLimit)}</Typography>
      <Typography>{t('safeAvailable')}: {m(f.projection.safe.safeAvailable)}</Typography></>:null}
    {f.projection.bank?<Typography>{t('currentBasis',{amount:m(f.projection.bank.balance),date:formatCalendarDate(f.projection.bank.observedDate,locale)})}</Typography>:null}
    {f.projection.safe?.coverageGroups.map(g=><Alert key={g.amount} severity="warning"><Typography>{d('shortage',{amount:m(g.amount)})}</Typography>
      {g.meanings.map(meaning=><Typography key={meaning}>{d(`meaning.${meaning}`)}</Typography>)}</Alert>)}
    {f.projection.safe&&f.projection.safe.coverageGroups.length>1?<Typography>{d('nonAdditive')}</Typography>:null}
    {f.projection.freshness?.ageDays?<Alert severity="info">{t('oldData')}{f.projection.freshness.showReminder?' '+t('reminder'):''}</Alert>:null}
    {f.projection.periods?.map(p=><Box key={p.period} component="dl" sx={{m:0,p:2,border:1,borderColor:'divider',borderRadius:1,minWidth:0}}>
      <Typography component="dt" sx={{fontWeight:700}}>{p.period}</Typography>
      {(['allocated','reserved','savings','free','deficit'] as const).map(k=><Box key={k} sx={{display:'flex',gap:2,justifyContent:'space-between',flexWrap:'wrap'}}>
        <Typography component="dt">{t(k)}</Typography><Typography component="dd" sx={{m:0,fontVariantNumeric:'tabular-nums',overflowWrap:'anywhere'}}>{m(p[k])}</Typography>
      </Box>)}
    </Box>)}
    {[...f.obligations,...f.savings].map((e,i)=><Box key={i} sx={{p:2,border:1,borderColor:'divider',borderRadius:1,overflowWrap:'anywhere'}}>
      <Typography sx={{fontWeight:700}}>{e.after.title}: {t(`action.${e.action}`)}</Typography>
      {(['before','after'] as const).map(key=>{const state=e[key];return <Box key={key} sx={{mt:1}}><Typography sx={{fontWeight:600}}>{t(key)}</Typography>
        {state?<><Typography>{t('name')}: {state.title}</Typography><Typography>{t('fundingPeriod')}: {f.fundingPeriods.find(p=>p.id===state.fundingPeriodId)?.period??'—'}</Typography>
          <Typography>{t('itemStatus')}: {t(`status.${state.status}`)}</Typography>
          {state.originalCents!==undefined?<Typography>{t('originalAmount')}: {m(state.originalCents)}</Typography>:null}
          {state.outstandingCents!==undefined?<Typography>{t('outstandingAmount')}: {m(state.outstandingCents)}</Typography>:null}
          {state.amountCents!==undefined?<Typography>{t('amount')}: {m(state.amountCents)}</Typography>:null}
          {state.reserveFull!==undefined?<Typography>{t('reserveFull')}: {t(state.reserveFull?'yes':'no')}</Typography>:null}
        </>:<Typography>—</Typography>}</Box>;})}
      {'payment' in e&&e.payment?<><Typography>{t('paymentAmount')}: {m(e.payment.amountCents)}</Typography><Typography>{t('paymentSource')}: {t(e.payment.source==='TRACKED_CARD'?'trackedCard':'outsideCard')}</Typography>
        <Typography>{t('unchangedConsent')}: {t(e.payment.unchangedBalanceAcknowledged?'yes':'no')}</Typography></>:null}
      {'confirmedReleasedAmount' in e&&e.confirmedReleasedAmount!==null?<Typography>{t('releasedAmount')}: {m(e.confirmedReleasedAmount)}</Typography>:null}
      {'confirmedIncreaseAmount' in e&&e.confirmedIncreaseAmount!==null?<Typography>{t('increasedAmount')}: {m(e.confirmedIncreaseAmount)}</Typography>:null}
    </Box>)}
    <Typography variant="body2">{t('nonPosting')}</Typography>
  </Stack>;
}
const box={p:{xs:2,sm:3},minWidth:0} as const;
export function UpdateBudgetScreen({initialSeed,actions,scopeKey='standalone'}:{initialSeed:UpdateSeed;actions:BudgetActions;scopeKey?:string}){
  const store=useBudgetWorkspace(scopeKey);
  const opened=useRef<{store:typeof store;seed:UpdateSeed}|null>(null);
  if(opened.current?.store!==store||opened.current.seed!==initialSeed){
    openBudgetSession(store,initialSeed);opened.current={store,seed:initialSeed};}
  return <BudgetSession store={store}><UpdateBudgetForm initialSeed={initialSeed} actions={actions}/></BudgetSession>;
}
function UpdateBudgetForm({initialSeed,actions}:{initialSeed:UpdateSeed;actions:BudgetActions}){
  const t=useTranslations('budgetUpdate'),locale=useLocale();
  const [seed,setSeed]=useBudgetState('seed',initialSeed),[form,setForm]=useBudgetState<UpdateForm>('form',()=>initialForm(initialSeed));
  const [reviewed,setReviewed]=useBudgetState<CanonicalValue|null>('reviewed',null),[pending,setPending]=useBudgetState('pending',false),[dirty,setDirty]=useBudgetState('dirty',false);
  const [error,setError]=useBudgetState('error',''),[unknown,setUnknown]=useBudgetState('unknown',false),[receipt,setReceipt]=useBudgetState<CommitReceipt|null>('receipt',null),[readFailed,setReadFailed]=useBudgetState('readFailed',false);
  const [accessLost,setAccessLost]=useBudgetState('accessLost',false);
  const [entryError]=useBudgetState('entryError',false);
  const [fieldError,setFieldError]=useBudgetState('fieldError','');const formRef=useRef<HTMLFormElement>(null),resultRef=useRef<HTMLDivElement>(null);
  const [history,setHistory]=useBudgetState<{receipt:CommitReceipt;recordedAt:string;review:{financial:FinancialReview}}[]>('history',[]);
  const generation=useBudgetRef('generation',0),original=useBudgetRef<CanonicalValue|null>('original',null),busy=useBudgetRef('busy',false),errorRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(error){const input=fieldError?formRef.current?.elements.namedItem(fieldError):null;
    if(input instanceof HTMLElement)input.focus();else errorRef.current?.focus();}},[error,fieldError]);
  useEffect(()=>{if(receipt)resultRef.current?.focus();},[receipt]);
  useEffect(()=>{if(!dirty&&!unknown)return;
    const unload=(e:BeforeUnloadEvent)=>{e.preventDefault();};
    const navigate=(e:MouseEvent)=>{const target=e.target instanceof Element?e.target.closest('a[href]'):null;
      if(target&&!window.confirm(t(unknown?'unknown':'unsaved')))e.preventDefault();};
    window.addEventListener('beforeunload',unload);document.addEventListener('click',navigate,true);
    return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigate,true);};
  },[dirty,unknown,t]);
  function change(patch:Partial<UpdateForm>){if(unknown||busy.current)return;generation.current++;setForm(old=>({...old,...patch}));setReviewed(null);setDirty(true);setError('');setFieldError('');}
  function edit(key:string,patch:Partial<DraftEdit>){change({edits:form.edits.map(e=>e.key===key?{...e,...patch}:e)});}
  function add(kind:DraftEdit['kind']){change({edits:[...form.edits,{key:crypto.randomUUID(),kind,identityId:'',action:'CREATE',title:'',amount:'',period:seed.today.slice(0,7),dueDate:'',bankDate:'',isPossible:false,reserveFull:true,source:'TRACKED_CARD'}]});}
  const paid=form.edits.some(e=>e.kind==='OBLIGATION'&&['PAID','PARTIAL_SETTLEMENT'].includes(e.action));
  const review=reviewed?(reviewed as unknown as {payload:{review:{financial:FinancialReview}}}).payload.review:null;
  const disabled=pending||unknown;
  const message=(code:string)=>{
    if(code==='SAME_IDENTITY_COMPOUND_NOT_SUPPORTED')return t('errors.compound');
    if(code==='PAYMENT_CONFIRMATION_REQUIRED')return t('errors.payment');
    if(code==='OWNER_POLICY_REQUIRED')return t('errors.policy');
    if(code==='UNAUTHORIZED'||code==='FORBIDDEN'){setAccessLost(true);original.current=null;setReviewed(null);return t('errors.access');}
    if(/STALE|CONFLICT|ORDERING|REPORT_IMPACT|TARGET_PERIOD/.test(code))return t('errors.conflict');
    if(/STORAGE|TRANSACTION/.test(code))return t('errors.storage');return t('errors.input');
  };
  async function preview(){if(busy.current||unknown)return;const version=generation.current;setError('');setFieldError('');setPending(true);
    try{const command=makeBudgetCommand(seed,form,locale,crypto.randomUUID()),valid=parseBudgetDraft(command.payload);
      if(!valid.ok){const gap=cashVectorGap(command.payload);if(gap!==null){setFieldError('allocation-0');setError(t('allocationGap',{amount:formatMoney(gap,locale)}));return;}
        throw new FormInputError(valid.code==='PAYMENT_CONFIRMATION_REQUIRED'?'bankAffirmed':'',valid.code);}
      const r=await actions.preview(command);
      if(version!==generation.current)return;if(r.ok)setReviewed(r.value);else setError(message(r.code));
    }catch(e){if(e instanceof FormInputError)setFieldError(e.field);setError(message(e instanceof Error?e.message:'INVALID_INPUT'));}finally{setPending(false);}}
  async function readHistory(id?:string){try{const h=await actions.history(id??null);if(h.ok){setHistory(h.value as unknown as typeof history);setReadFailed(false);}else{if(h.code==='FORBIDDEN'||h.code==='UNAUTHORIZED'){setAccessLost(true);original.current=null;}setReadFailed(true);}}catch{setReadFailed(true);}}
  async function confirm(retry=false){const command=retry?original.current:reviewed;if(!command||busy.current)return;
    busy.current=true;setPending(true);original.current=command;setError('');
    try{const r=await actions.confirm(command);if(r.ok){setReceipt(r.value);setUnknown(false);setDirty(false);setReviewed(null);await readHistory(r.value.updateId);}
      else if(r.code==='COMMIT_OUTCOME_UNKNOWN'){setUnknown(true);setError(t('unknown'));}
      else{setUnknown(false);setError(message(r.code));}
    }catch{setUnknown(true);setError(t('unknown'));}finally{busy.current=false;setPending(false);}}
  async function status(){const command=original.current as {requestId?:string}|null;if(!command?.requestId)return;setPending(true);
    try{const r=await actions.status(command.requestId);if(r.ok&&r.value){setReceipt(r.value);setUnknown(false);setDirty(false);setReviewed(null);await readHistory(r.value.updateId);}
      else setError(r.ok?t('unknown'):message(r.code));}catch{setError(t('unknown'));}finally{setPending(false);}}
  async function reload(){setPending(true);setError('');try{const r=await actions.load();if(r.ok){setSeed(r.value as unknown as UpdateSeed);setReviewed(null);setForm(old=>({...old,vectorConfirmed:false,bankAffirmed:false,unchangedAcknowledged:false,fundingConfirmed:false,nonCarryConfirmed:false,futureConfirmed:false,orderAcknowledged:false,unchangedFunding:false}));generation.current++;}else setError(message(r.code));}catch{setError(message('STORAGE_ERROR'));}finally{setPending(false);}}
  function consent(key:keyof UpdateForm,label:string){return <FormControlLabel control={<Checkbox name={key} checked={Boolean(form[key])} disabled={disabled} onChange={e=>change({[key]:e.target.checked})} slotProps={{input:{'aria-invalid':fieldError===key,'aria-describedby':fieldError===key?'budget-update-error':undefined}}}/>} label={t(label)}/>;}
  if(accessLost)return <Alert severity="error">{t('errors.access')}</Alert>;
  return <Stack spacing={3} sx={{minWidth:0,'& .MuiFormControlLabel-root':{minHeight:44},'& .MuiCheckbox-root':{minHeight:44,minWidth:44},'& .MuiButton-root':{whiteSpace:'normal',textAlign:'center'}}}>
    <Typography component="h1" variant="h1">{t('title')}</Typography><Typography>{t('description')}</Typography>
    <Button component={Link} href="/" prefetch={false} sx={{alignSelf:'flex-start'}}>{t('back')}</Button>
    {entryError?<Alert severity="warning">{t('errors.conflict')}</Alert>:null}
    {error?<Alert id="budget-update-error" severity="error" ref={errorRef} tabIndex={-1} role="alert">{error}</Alert>:null}
    {receipt?<Alert severity="success" ref={resultRef} tabIndex={-1} role="status">{t('saved')} <Typography component="span" sx={{overflowWrap:'anywhere'}}>{receipt.updateId}</Typography></Alert>:null}
    {readFailed?<Alert severity="warning">{t('savedReadFailed')}<Button onClick={()=>readHistory(receipt?.updateId)}>{t('retryRead')}</Button></Alert>:null}
    {unknown?<Alert severity="warning"><Typography>{t('unknown')}</Typography><Button onClick={status} disabled={pending}>{t('checkResult')}</Button>
      <Button onClick={()=>confirm(true)} disabled={pending}>{t('retrySame')}</Button></Alert>:null}
    <Box component="form" ref={formRef} onSubmit={e=>{e.preventDefault();preview();}} sx={{display:'grid',gridTemplateColumns:{xs:'minmax(0,1fr)',lg:'minmax(0,1.2fr) minmax(0,1fr)'},gap:3,minWidth:0}}>
      <Stack spacing={3}>
        <Paper variant="outlined" sx={box}><Stack spacing={2}>
          <Typography component="h2" variant="h3">{t('bank')}</Typography>
          {seed.bank?<Typography>{t('previousCheck',{amount:formatMoney(seed.bank.balanceCents,locale),date:formatCalendarDate(seed.bank.observedDate,locale)})}</Typography>:null}
          <FormControlLabel label={t('reuse')} control={<Checkbox checked={form.reuse} disabled={disabled||!seed.bank||paid||form.mode==='FRESH_START'} onChange={e=>change({reuse:e.target.checked})}/>}/>
          <TextField name="balance" label={t('balance')} value={form.balance} disabled={disabled||form.reuse} error={fieldError==='balance'} onChange={e=>change({balance:e.target.value})} helperText={fieldError==='balance'?error:t('moneyHint')} slotProps={{htmlInput:{inputMode:'decimal',autoComplete:'off'}}}/>
          <TextField name="observedDate" label={t(form.reuse?'effectiveDate':'observedDate')} type="date" value={form.observedDate} disabled={disabled} error={fieldError==='observedDate'} helperText={fieldError==='observedDate'?error:undefined} onChange={e=>change({observedDate:e.target.value})} slotProps={{inputLabel:{shrink:true},htmlInput:{max:seed.today}}}/>
          {seed.placement&&form.observedDate===seed.today?consent('orderAcknowledged','orderConsent'):null}
          <Typography variant="body2">{t('memoryOnly')}</Typography>
        </Stack></Paper>
        <Paper variant="outlined" sx={box}><Stack spacing={2}>
          <Typography component="h2" variant="h3">{t('allocations')}</Typography>
          {form.allocations.map((a,i)=><Stack key={a.key} spacing={1}>
            <TextField name={'period-'+i} label={t('period')} type="month" value={a.period} disabled={disabled} error={fieldError==='period-'+i} helperText={fieldError==='period-'+i?error:undefined} onChange={e=>change({allocations:form.allocations.map(x=>x.key===a.key?{...x,period:e.target.value}:x)})} slotProps={{inputLabel:{shrink:true}}}/>
            <TextField name={'allocation-'+i} label={t('allocated')} value={a.amount} disabled={disabled} error={fieldError==='allocation-'+i} helperText={fieldError==='allocation-'+i?error:undefined} onChange={e=>change({allocations:form.allocations.map(x=>x.key===a.key?{...x,amount:e.target.value}:x)})} slotProps={{htmlInput:{inputMode:'decimal',autoComplete:'off'}}}/>
            <Button disabled={disabled} onClick={()=>change({allocations:form.allocations.filter(x=>x.key!==a.key)})}>{t('remove')}</Button>
          </Stack>)}
          <Button disabled={disabled} onClick={()=>change({allocations:[...form.allocations,{key:crypto.randomUUID(),period:'',amount:''}]})}>{t('addMonth')}</Button>
        </Stack></Paper>
        <Paper variant="outlined" sx={box}><Stack spacing={2}>
          <Typography component="h2" variant="h3">{t('edits')}</Typography>
          <BudgetEditors seed={seed} form={form} disabled={disabled} fieldError={fieldError} error={error} edit={edit} change={change}/>
          <Button disabled={disabled||form.edits.filter(e=>e.kind==='OBLIGATION').length>=7} onClick={()=>add('OBLIGATION')}>{t('addObligation')}</Button>
          <Button disabled={disabled||form.edits.filter(e=>e.kind==='SAVING').length>=7} onClick={()=>add('SAVING')}>{t('addSaving')}</Button>
          <TextField label={t('reason')} value={form.reason} disabled={disabled} onChange={e=>change({reason:e.target.value})}/>
        </Stack></Paper>
        {seed.bank?<Paper variant="outlined" sx={box}><Stack spacing={2}>
          <Typography component="h2" variant="h3">{t('transition')}</Typography>
          <TextField select label={t('mode')} value={form.mode} disabled={disabled} slotProps={{select:{displayEmpty:true},inputLabel:{shrink:true}}} onChange={e=>change({mode:e.target.value as UpdateForm['mode'],fundingConfirmed:false,nonCarryConfirmed:false,futureConfirmed:false})}>
            <MenuItem value="">{t('noTransition')}</MenuItem>{['CARRY','FRESH_START','DEFER'].map(m=><MenuItem key={m} value={m}>{t(`modeLabel.${m}`)}</MenuItem>)}
          </TextField>
          {form.mode==='CARRY'?<TextField label={t('source')} type="month" value={form.source} disabled={disabled} onChange={e=>change({source:e.target.value})} slotProps={{inputLabel:{shrink:true}}}/>:null}
          {form.mode==='CARRY'||form.mode==='FRESH_START'?consent('fundingConfirmed','fundingConsent'):null}
          {form.mode==='FRESH_START'?<>{consent('nonCarryConfirmed','nonCarryConsent')}{consent('futureConfirmed','futureConsent')}</>:null}
          {form.reuse&&!form.mode?consent('unchangedFunding','unchangedFundingConsent'):null}
        </Stack></Paper>:null}
      </Stack>
      <Stack spacing={3} sx={{minWidth:0,alignSelf:'start'}}>
        <Paper variant="outlined" sx={box}><Stack spacing={2}>
          <Typography component="h2" variant="h3">{t('review')}</Typography>
          {consent('vectorConfirmed','vectorConsent')}
          {paid?<><Alert severity="warning">{t('paymentWarning')}</Alert>{consent('bankAffirmed','bankConsent')}{consent('unchangedAcknowledged','unchangedConsent')}</>:null}
          <Button type="submit" variant="outlined" disabled={pending||unknown}>{t(pending?'working':'preview')}</Button>
          {review?<><Alert severity="info">{t('notSaved')}</Alert><Review review={review}/><Button variant="contained" disabled={disabled} onClick={()=>confirm()}>{t('confirm')}</Button></>:null}
        </Stack></Paper>
        <Button disabled={pending||unknown} onClick={reload}>{t('reloadBase')}</Button>
        <Button disabled={pending} onClick={()=>readHistory()}>{t('history')}</Button>
        {history.map(h=><Paper key={h.receipt.updateId} variant="outlined" sx={box}><Typography sx={{overflowWrap:'anywhere'}}>{h.receipt.updateId}</Typography>
          <Typography>{t('recordedAt')}: {new Intl.DateTimeFormat(locale,{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(h.recordedAt))}</Typography><Review review={h.review}/></Paper>)}
      </Stack>
    </Box>
    <Typography role="status" aria-live="polite">{pending?t('working'):dirty?t('unsavedShort'):''}</Typography>
  </Stack>;
}
