'use client';
import { useTranslations } from 'next-intl';
import { Button,Checkbox,FormControlLabel,MenuItem,Stack,TextField,Typography } from '@mui/material';
import { euro,type UpdateSeed,type UpdateForm,type DraftEdit } from './presentation';
export function BudgetEditors({seed,form,disabled,fieldError,error,edit,change}:{seed:UpdateSeed;form:UpdateForm;disabled:boolean;fieldError:string;error:string;edit:(key:string,patch:Partial<DraftEdit>)=>void;change:(patch:Partial<UpdateForm>)=>void}){
const t=useTranslations('budgetUpdate');return <>{form.edits.map(e=>{
            const allowed=e.kind==='OBLIGATION'?['CREATE','AMEND','PARTIAL_SETTLEMENT','PAID','CANCELLED']:['CREATE','AMEND','INCREASE','PARTIAL_RELEASE','FULL_RELEASE'];
            return <Stack component="fieldset" key={e.key} spacing={2} sx={{m:0,p:2,border:1,borderColor:'divider',minWidth:0}}>
              <Typography component="legend">{t(e.kind==='OBLIGATION'?'obligation':'saving')}</Typography>
              <TextField select label={t('identity')} value={e.identityId} disabled={disabled} onChange={event=>{
                const identityId=event.target.value,o=seed.obligations.find(x=>x.obligationId===identityId),s=seed.savings.find(x=>x.savingsId===identityId);
                edit(e.key,{identityId,action:identityId?'AMEND':'CREATE',title:o?.title??s?.title??'',amount:o?euro(o.originalCents):s?euro(s.amountCents):'',period:o?.fundingPeriod??s?.fundingPeriod??seed.today.slice(0,7),dueDate:o?.dueDate??'',isPossible:o?.isPossible??false,reserveFull:o?.reserveFull??true});
              }}><MenuItem value="">{t('newIdentity')}</MenuItem>{e.kind==='OBLIGATION'?seed.obligations.filter(o=>o.status==='UNPAID').map(o=><MenuItem key={o.obligationId} value={o.obligationId}>{o.title} · {o.fundingPeriod}</MenuItem>):seed.savings.filter(s=>s.status==='ACTIVE').map(s=><MenuItem key={s.savingsId} value={s.savingsId}>{s.title} · {s.fundingPeriod}</MenuItem>)}</TextField>
              <TextField select label={t('actionLabel')} value={e.action} disabled={disabled} onChange={event=>{
                const action=event.target.value,o=seed.obligations.find(x=>x.obligationId===e.identityId);edit(e.key,{action,...(action==='PAID'&&o?{amount:euro(o.outstandingCents)}:{})});
              }}>{allowed.filter(a=>e.identityId?a!=='CREATE':a==='CREATE').map(a=><MenuItem key={a} value={a}>{t(`action.${a}`)}</MenuItem>)}</TextField>
              {['CREATE','AMEND'].includes(e.action)?<TextField label={t('name')} value={e.title} disabled={disabled} onChange={event=>edit(e.key,{title:event.target.value})}/>:null}
              {e.action!=='CANCELLED'&&(e.kind==='OBLIGATION'||e.action!=='AMEND')?<TextField name={'edit-'+e.key+'-amount'} label={t('amount')} value={e.amount} disabled={disabled} error={fieldError==='edit-'+e.key+'-amount'} helperText={fieldError==='edit-'+e.key+'-amount'?error:undefined} onChange={event=>edit(e.key,{amount:event.target.value})} slotProps={{htmlInput:{inputMode:'decimal',autoComplete:'off'}}}/>:null}
              {e.action==='CREATE'?<TextField label={t('fundingPeriod')} type="month" value={e.period} disabled={disabled} onChange={event=>edit(e.key,{period:event.target.value})} slotProps={{inputLabel:{shrink:true}}}/>:null}
              {e.kind==='OBLIGATION'&&['CREATE','AMEND'].includes(e.action)?<>
                <TextField label={t('dueDate')} type="date" value={e.dueDate} disabled={disabled} onChange={event=>edit(e.key,{dueDate:event.target.value})} slotProps={{inputLabel:{shrink:true}}}/>
                <FormControlLabel label={t('possible')} control={<Checkbox checked={e.isPossible} disabled={disabled} onChange={event=>edit(e.key,{isPossible:event.target.checked,reserveFull:!event.target.checked})}/>}/>
                <FormControlLabel label={t('reserveFull')} control={<Checkbox checked={e.reserveFull} disabled={disabled||!e.isPossible} onChange={event=>edit(e.key,{reserveFull:event.target.checked})}/>}/>
              </>:null}
              {e.kind==='OBLIGATION'&&['PAID','PARTIAL_SETTLEMENT'].includes(e.action)?<>
                <TextField select label={t('paymentSource')} value={e.source} disabled={disabled} onChange={event=>edit(e.key,{source:event.target.value as DraftEdit['source']})}><MenuItem value="TRACKED_CARD">{t('trackedCard')}</MenuItem><MenuItem value="OUTSIDE_TRACKED_CARD">{t('outsideCard')}</MenuItem></TextField>
                <TextField label={t('bankDate')} type="date" value={e.bankDate} disabled={disabled} onChange={event=>edit(e.key,{bankDate:event.target.value})} slotProps={{inputLabel:{shrink:true}}}/>
              </>:null}
              <Button disabled={disabled} onClick={()=>change({edits:form.edits.filter(x=>x.key!==e.key)})}>{t('remove')}</Button>
            </Stack>;
          })}</>;
}
