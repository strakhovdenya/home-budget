'use client';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {useLocale,useTranslations} from 'next-intl';
import {Alert,Button,Checkbox,FormControlLabel,Paper,Stack,TextField,Typography} from '@mui/material';
import type {BudgetResult} from '@/domain/budget-update/ports';
import type {CanonicalValue,CommitReceipt} from '@/domain/updates/contracts';
import {inputCents} from '@/features/budget-updates/presentation';
import {BudgetReview,type BudgetReviewData} from '@/features/budget-updates/budget-review';
type Actions={preview:(input:unknown)=>Promise<BudgetResult<CanonicalValue>>;confirm:(input:unknown)=>Promise<BudgetResult<CommitReceipt>>;status:(key:unknown)=>Promise<BudgetResult<CommitReceipt|null>>};
type ReviewCommand={requestId:string;payload:{review:BudgetReviewData}};
export function FirstRunScreen({today,actions}:{today:string;actions:Actions}){
  const t=useTranslations('firstRun'),u=useTranslations('budgetUpdate'),locale=useLocale(),router=useRouter();
  const [balance,setBalance]=useState(''),[day,setDay]=useState(today),[rows,setRows]=useState([{period:today.slice(0,7),amount:''}]),
    [consent,setConsent]=useState(false),[review,setReview]=useState<ReviewCommand|null>(null),[busy,setBusy]=useState(false),
    [unknown,setUnknown]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  const pending=useRef(false),frozen=useRef<ReviewCommand|null>(null),heading=useRef<HTMLHeadingElement>(null);
  const disabled=busy||unknown;
  function failure(code:string){
    if(code==='EXISTING_EMPTY_ACCOUNT'){router.push('/update-budget');return;}
    if(code==='ALREADY_INITIALIZED'){router.refresh();setError(t('already'));return;}
    setError(t(code==='UNAUTHORIZED'||code==='FORBIDDEN'?'authError':code==='STORAGE_ERROR'?'storageError':'error'));
  }
  async function preview(){
    if(pending.current)return;pending.current=true;setBusy(true);setError('');
    try{
      if(!consent)throw Error('INVALID_INPUT');
      const balanceCents=inputCents(balance,locale),allocations=rows.map(r=>({period:r.period,amountCents:inputCents(r.amount,locale)}));
      const command={requestId:crypto.randomUUID(),expectedRevision:'0',effectiveDate:day,reason:t('reason'),payload:{schemaVersion:1,
        knowledgeCut:'0',baseCheckpointId:null,baseVectorId:null,effectiveDate:day,checkpoint:{observedDate:day,observedAt:null,balanceCents,allocations,correction:null,placement:null},
        allocationChange:null,completeVectorConfirmed:true,obligations:[],savings:[]}};
      const result=await actions.preview(command);
      if(!result.ok){failure(result.code);return;}
      const reviewed=result.value as unknown as ReviewCommand;frozen.current=reviewed;setReview(reviewed);
      setTimeout(()=>heading.current?.focus(),0);
    }catch{setError(t('error'));}finally{pending.current=false;setBusy(false);}
  }
  async function confirm(){
    const command=frozen.current;if(!command||pending.current)return;pending.current=true;setBusy(true);setError('');
    try{
      const result=await actions.confirm(command);
      if(result.ok){setUnknown(false);setSaved(true);try{router.refresh();}catch{setError(t('storageError'));}}
      else if(result.code==='COMMIT_OUTCOME_UNKNOWN'){setUnknown(true);}
      else failure(result.code);
    }catch{setUnknown(true);}finally{pending.current=false;setBusy(false);}
  }
  async function status(){
    const command=frozen.current;if(!command||pending.current)return;pending.current=true;setBusy(true);
    try{
      const result=await actions.status(command.requestId);
      if(result.ok&&result.value){setUnknown(false);setSaved(true);router.refresh();}
      else if(!result.ok)failure(result.code);
    }catch{setError(t('storageError'));}finally{pending.current=false;setBusy(false);}
  }
  return <Stack spacing={3} sx={{minWidth:0}}>
    <Typography component="h1" variant="h1">{t('title')}</Typography>
    {!saved?<Typography>{t('unknown')}</Typography>:null}
    {error?<Alert severity="error" role="alert">{error}</Alert>:null}
    {saved?<Alert severity="success" role="status">{t('saved')}</Alert>:null}
    {busy?<Typography role="status">{t('pending')}</Typography>:null}
    {unknown?<Alert severity="warning" role="status">{t('outcomeUnknown')}<Stack direction="row" spacing={1} sx={{flexWrap:'wrap'}}>
      <Button disabled={busy} onClick={status}>{t('status')}</Button><Button disabled={busy} onClick={confirm}>{t('retry')}</Button>
    </Stack></Alert>:null}
    {!review&&!saved?<Paper component="form" variant="outlined" sx={{p:{xs:2,sm:3}}} onSubmit={e=>{e.preventDefault();void preview();}}>
      <Stack spacing={2}>
        <TextField required label={u('balance')} value={balance} disabled={disabled} onChange={e=>setBalance(e.target.value)} slotProps={{htmlInput:{inputMode:'decimal',autoComplete:'off'}}}/>
        <TextField required type="date" label={u('observedDate')} value={day} disabled={disabled} onChange={e=>setDay(e.target.value)} slotProps={{inputLabel:{shrink:true},htmlInput:{max:today}}}/>
        {rows.map((r,i)=><Stack spacing={1} key={i} sx={{minWidth:0}}>
          <TextField required type="month" label={u('period')} value={r.period} disabled={disabled} onChange={e=>setRows(rows.map((x,n)=>n===i?{...x,period:e.target.value}:x))} slotProps={{inputLabel:{shrink:true}}}/>
          <TextField required label={u('allocated')} value={r.amount} disabled={disabled} onChange={e=>setRows(rows.map((x,n)=>n===i?{...x,amount:e.target.value}:x))} slotProps={{htmlInput:{inputMode:'decimal',autoComplete:'off'}}}/>
          {rows.length>1?<Button disabled={disabled} onClick={()=>setRows(rows.filter((_,n)=>n!==i))}>{t('remove')}</Button>:null}
        </Stack>)}
        <Button disabled={disabled||rows.length>=120} onClick={()=>setRows([...rows,{period:'',amount:''}])}>{t('add')}</Button>
        <FormControlLabel control={<Checkbox checked={consent} disabled={disabled} onChange={e=>setConsent(e.target.checked)}/>} label={t('consent')}/>
        <Button type="submit" variant="contained" disabled={disabled||!consent}>{t('review')}</Button>
      </Stack>
    </Paper>:null}
    {review&&!saved?<Stack spacing={2}>
      <Typography component="h2" variant="h2" ref={heading} tabIndex={-1}>{t('reviewTitle')}</Typography>
      <BudgetReview review={review.payload.review}/>
      <Button variant="contained" disabled={disabled} onClick={confirm}>{t('confirm')}</Button>
      <Button disabled={disabled} onClick={()=>{setReview(null);frozen.current=null;setError('');}}>{t('edit')}</Button>
    </Stack>:null}
  </Stack>;
}
