'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useLocale,useTranslations} from 'next-intl';
import {Alert,Box,Button,Checkbox,FormControlLabel,Paper,Stack,TextField,Typography} from '@mui/material';
import type {BudgetResult} from '@/domain/budget-update/ports';
import type {CanonicalValue} from '@/domain/updates/contracts';
import type {TemplateSeed,TemplateActions} from '@/domain/recurring/ports';
import {parseTemplateInput,type Template,type TemplateInput} from '@/domain/recurring/templates';
import {inputCents,euro} from '@/features/budget-updates/presentation';
import {PeriodNavigation} from '@/features/dashboard/period-navigation';
import {formatMonth} from '@/features/dashboard/presentation';
import {notifyBudgetCommitted,onBudgetCommitted} from '@/features/budget-updates/refresh';
import {formatMoney} from '@/features/dashboard/format-money';
type Command={requestId:string;expectedRevision:string;effectiveDate:string;reason:string;payload:TemplateInput};
export function TemplateScreen({initial,today,actions}:{initial:BudgetResult<CanonicalValue>;today:string;actions:TemplateActions}){
  const t=useTranslations('recurring'),locale=useLocale(),router=useRouter();
  const [seed,setSeed]=useState<TemplateSeed|null>(initial.ok?initial.value as unknown as TemplateSeed:null),
    [amounts,setAmounts]=useState<Record<string,string>>({}),
    [hidden,setHidden]=useState<string[]>([]),[title,setTitle]=useState(''),[amount,setAmount]=useState(''),[enabled,setEnabled]=useState(true),
    [editing,setEditing]=useState<Template|null>(null),[review,setReview]=useState<Command|null>(null),[error,setError]=useState(initial.ok?'':t(initial.code==='UNAUTHORIZED'?'authError':['FORBIDDEN','ACCOUNT_SELECTION_REQUIRED'].includes(initial.code)?'scopeError':'storageError')),
    [busy,setBusy]=useState(false),[unknown,setUnknown]=useState(false),[saved,setSaved]=useState('');
  const pending=useRef(false),frozen=useRef<Command|null>(null),heading=useRef<HTMLHeadingElement>(null);
  const origin=seed?.originPeriod??today.slice(0,7);
  const disabled=busy||unknown;
  useEffect(()=>{if(!initial.ok||busy||unknown||review)return;const next=initial.value as unknown as TemplateSeed;
    if(next.originPeriod!==origin){setSeed(next);setAmounts({});setHidden([]);}else if(seed&&BigInt(next.revision)>BigInt(seed.revision))setSeed(next);
  },[initial,busy,unknown,review,origin,seed]);
  useEffect(()=>onBudgetCommitted(()=>{if(!pending.current&&!unknown&&!review)void reload();}),[actions.load,origin,unknown,review]);
  const month=(p:string)=>formatMonth(p,locale);
  function failure(code:string){setError(t(code==='UNAUTHORIZED'?'authError':['FORBIDDEN','ACCOUNT_SELECTION_REQUIRED'].includes(code)?'scopeError':code==='TEMPLATE_ALREADY_ACCEPTED'?'acceptedConflict':code==='TEMPLATE_ALREADY_DECLINED'?'declinedConflict':
    ['STALE_REVISION','STALE_TEMPLATE','ORDERING_CONFLICT'].includes(code)?'stale':'error'));}
  async function reload(){
    if(pending.current||unknown)return;pending.current=true;setBusy(true);setError('');
    try{const r=await actions.load(origin);if(r.ok){const next=r.value as unknown as TemplateSeed;if(next.originPeriod!==origin){failure('STALE_TEMPLATE');return;}setSeed(next);setHidden([]);}else failure(r.code);}
    catch{setError(t('storageError'));}finally{pending.current=false;setBusy(false);}
  }
  function prepare(payload:TemplateInput){
    if(!seed||disabled)return;
    try{
      parseTemplateInput(payload);
      const command={requestId:crypto.randomUUID(),expectedRevision:seed.revision,effectiveDate:seed.today,reason:t('reason'),payload};
      frozen.current=command;setReview(command);setSaved('');setError('');setTimeout(()=>heading.current?.focus(),0);
    }catch{setError(t('error'));}
  }
  function decide(source:Template,action:'ACCEPT'|'DECLINE'){
    if(!seed)return;
    const common={schemaVersion:1 as const,templateId:source.id,templateVersion:source.version,originPeriod:seed.originPeriod};
    try{prepare(action==='ACCEPT'?{...common,action,fundingPeriod:seed.originPeriod,amountCents:inputCents(amounts[source.id]??euro(source.amountCents),locale),placement:seed.placement}:{...common,action});}
    catch{setError(t('error'));}
  }
  async function committed(){
    const input=frozen.current?.payload,config=input?seed?.configs.find(c=>c.id===input.templateId):null;
    if(input)setSaved(input.action==='ACCEPT'?t('savedAccept',{name:config?.title??'',month:month(input.originPeriod)}):input.action==='DECLINE'?t('savedDecline',{name:config?.title??'',month:month(input.originPeriod)}):t(input.expectedVersion===null?'savedCreate':config?.enabled===true&&!input.enabled?'savedDisable':config?.enabled===false&&input.enabled?'savedEnable':'savedConfig',{name:input.title}));
    setUnknown(false);setReview(null);frozen.current=null;setEditing(null);setTitle('');setAmount('');
    notifyBudgetCommitted();router.refresh();
    try{const next=await actions.load(origin);if(next.ok){const nextSeed=next.value as unknown as TemplateSeed;if(nextSeed.originPeriod===origin)setSeed(nextSeed);else failure('STALE_TEMPLATE');}else failure(next.code);}catch{setError(t('storageError'));}
  }
  async function confirm(){
    if(!frozen.current||pending.current)return;pending.current=true;setBusy(true);setError('');
    try{const r=await actions.commit(frozen.current);if(r.ok)await committed();else if(r.code==='COMMIT_OUTCOME_UNKNOWN')setUnknown(true);else failure(r.code);}
    catch{setUnknown(true);}finally{pending.current=false;setBusy(false);}
  }
  async function status(){
    if(!frozen.current||pending.current)return;pending.current=true;setBusy(true);
    try{const r=await actions.status(frozen.current.requestId);if(r.ok&&r.value)await committed();else if(!r.ok)failure(r.code);}
    catch{setError(t('storageError'));}finally{pending.current=false;setBusy(false);}
  }
  const payload=review?.payload,source=payload?seed?.configs.find(c=>c.id===payload.templateId):null;
  return <Stack component="section" spacing={2} sx={{minWidth:0}}>
    <Typography component="h2" variant="h2">{t('title')}</Typography><Typography>{t('intro')}</Typography>
    {error?<Alert severity="error" role="alert">{error}</Alert>:null}{saved?<Alert severity="success" role="status">{saved}</Alert>:null}
    {busy?<Typography role="status">{t('pending')}</Typography>:null}
    {unknown?<Alert severity="warning" role="status">{t('unknown')}<Stack direction="row" spacing={1} sx={{flexWrap:'wrap'}}>
      <Button disabled={busy} onClick={status}>{t('status')}</Button><Button disabled={busy} onClick={confirm}>{t('retry')}</Button>
    </Stack></Alert>:null}
    <Stack direction={{xs:'column',sm:'row'}} spacing={1}>
      <Typography>{t('periodContext',{month:month(origin)})}</Typography>
      <Button disabled={disabled||!!review} onClick={reload}>{t('load')}</Button>
    </Stack>
    <PeriodNavigation key={origin} period={origin} base="/obligations" disabled={disabled||!!review}/>
    {!review?<>
      {seed?.offers.filter(s=>!hidden.includes(s.id)).map(s=><Paper key={s.id} variant="outlined" sx={{p:2,minWidth:0}}>
        <Stack spacing={1}>
          <Typography component="h3" variant="h6" sx={{overflowWrap:'anywhere'}}>{s.title}</Typography>
          <TextField label={t('amount')} value={amounts[s.id]??euro(s.amountCents)} disabled={disabled} onChange={e=>setAmounts({...amounts,[s.id]:e.target.value})} slotProps={{htmlInput:{inputMode:'decimal',autoComplete:'off'}}}/>
          <Button disabled={disabled||seed.originPeriod!==origin} onClick={()=>decide(s,'ACCEPT')}>{t('accept')}</Button>
          <Button disabled={disabled||seed.originPeriod!==origin} onClick={()=>decide(s,'DECLINE')}>{t('decline')}</Button>
          <Button disabled={disabled} onClick={()=>setHidden([...hidden,s.id])}>{t('later')}</Button>
        </Stack>
      </Paper>)}
      {seed&&seed.offers.length===0?<Typography>{t('noOffers')}</Typography>:null}
      {seed?.decisions.map(d=><Typography key={d.input.templateId}>{t(d.input.action==='ACCEPT'?'decisionAccept':'decisionDecline',{name:d.title??t('unnamedPayment'),month:month(d.input.originPeriod)})}</Typography>)}
      <Box component="form" onSubmit={e=>{e.preventDefault();try{prepare({schemaVersion:1,action:'CONFIG',templateId:editing?.id??crypto.randomUUID(),
        expectedVersion:editing?.version??null,title:title.trim(),amountCents:inputCents(amount,locale),enabled});}catch{setError(t('error'));}}}>
        <Stack spacing={2}>
          <Typography component="h3" variant="h6">{t(editing?'edit':'create')}</Typography>
          <TextField required label={t('name')} value={title} disabled={disabled||!seed} onChange={e=>setTitle(e.target.value)}/>
          <TextField required label={t('amount')} value={amount} disabled={disabled||!seed} onChange={e=>setAmount(e.target.value)} slotProps={{htmlInput:{inputMode:'decimal',autoComplete:'off'}}}/>
          <FormControlLabel control={<Checkbox checked={enabled} disabled={disabled||!seed} onChange={e=>setEnabled(e.target.checked)}/>} label={t('enabled')}/>
          <Button type="submit" disabled={disabled||!seed}>{t('reviewConfig')}</Button>
        </Stack>
      </Box>
      {seed?.configs.map(s=><Stack key={s.id} direction={{xs:'column',sm:'row'}} spacing={1} sx={{alignItems:{sm:'center'}}}>
        <Typography sx={{overflowWrap:'anywhere',minWidth:0}}>{s.title} · {formatMoney(s.amountCents,locale)} · {t(s.enabled?'enabled':'disabled')}</Typography>
        <Button disabled={disabled} onClick={()=>{setEditing(s);setTitle(s.title);setAmount(euro(s.amountCents));setEnabled(s.enabled);}}>{t('edit')}</Button>
        <Button disabled={disabled} onClick={()=>prepare({schemaVersion:1,action:'CONFIG',templateId:s.id,expectedVersion:s.version,title:s.title,amountCents:s.amountCents,enabled:!s.enabled})}>{t(s.enabled?'disable':'enable')}</Button>
      </Stack>)}
    </>:<Paper variant="outlined" sx={{p:2}}>
      <Stack spacing={2}>
        <Typography component="h3" variant="h5" tabIndex={-1} ref={heading}>{t('review')}</Typography>
        <Typography>{payload?.action==='CONFIG'?payload.title:source?.title}</Typography>
        {payload?.action==='DECLINE'?<Typography>{t('declineReview',{month:month(payload.originPeriod)})}</Typography>:payload?<Typography>{t('amount')}: {formatMoney(payload.amountCents,locale)}</Typography>:null}
        {payload?.action==='ACCEPT'?<><Typography>{t('periodContext',{month:month(payload.originPeriod)})}</Typography><Typography>{t('acceptReview')}</Typography></>:null}
        {payload?.action==='CONFIG'?<Typography>{t(payload.enabled?'enabled':'disabled')} — {t('configOnly')}</Typography>:null}
        <Button variant="contained" disabled={disabled} onClick={confirm}>{t('confirm')}</Button>
        <Button disabled={disabled} onClick={()=>{setReview(null);frozen.current=null;setError('');}}>{t('cancel')}</Button>
      </Stack>
    </Paper>}
    <Button component={Link} href="/history" prefetch={false}>{t('history')}</Button>
  </Stack>;
}
