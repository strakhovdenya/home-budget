import {isDeepStrictEqual} from 'node:util';import {test,expect,type Page,type Locator} from '@playwright/test';
import {contextFor,own,foreign,clock,identity} from './onboarding-proof';import {database,census,noWrite,actionFrom,argsOf,invoke,resultOf,hydrated,type Action} from './proof';import en from '../../../src/shared/i18n/messages/en.json' with {type:'json'};
import type {BudgetReviewData} from '../../../src/features/budget-updates/budget-review';
export {test,expect,contextFor,own,foreign,clock,identity,database,census,noWrite,actionFrom,argsOf,invoke,resultOf,hydrated,en};export type {Action};
export const u=en.budgetUpdate;
export const same=(a:unknown,b:unknown,label:string)=>expect(isDeepStrictEqual(a,b),label).toBe(true);
export function euros(cents:string|bigint){const v=BigInt(cents),n=v<0n?-v:v;return(v<0n?'-':'')+'€'+(n/100n).toLocaleString('en-US')+'.'+(n%100n).toString().padStart(2,'0');}
export async function day(){const d=await clock();return{...d,p:d.period,q:d.future,m:(await database(async c=>(await c.query("SELECT to_char((clock_timestamp() AT TIME ZONE 'Europe/Berlin')-interval '1 month','YYYY-MM') m")).rows[0].m)) as string};}
export async function select(page:Page,control:Locator,name:string|RegExp){await control.click();await page.getByRole('option',{name,exact:true}).click();}
export async function open(page:Page){await page.goto('/update-budget');await hydrated(page.getByRole('textbox',{name:u.balance,exact:true}));}
export async function vector(page:Page,balance:string,amounts:Record<string,string>,date?:string){
 await page.getByRole('textbox',{name:u.balance,exact:true}).fill(euros(balance).replace(/[^0-9.-]/g,''));
 if(date)await page.locator('input[name="observedDate"]:visible').fill(date);
 const entries=Object.entries(amounts);let count=await page.locator('input[name^="allocation-"]:visible').count();
 while(count<entries.length){await page.getByRole('button',{name:u.addMonth,exact:true}).click();count++;}
 while(count>entries.length){const last=page.locator('input[name^="allocation-"]:visible').last().locator('..').locator('..').locator('..');await last.getByRole('button',{name:u.remove,exact:true}).click();count--;}
 for(let i=0;i<entries.length;i++){await page.locator('input[name="period-'+i+'"]:visible').fill(entries[i][0]);await page.locator('input[name="allocation-'+i+'"]:visible').fill(euros(entries[i][1]).replace(/[^0-9.-]/g,''));}
}
export async function consent(page:Page,payment=false,ack=false){await page.getByRole('checkbox',{name:u.vectorConsent,exact:true}).check();const order=page.getByRole('checkbox',{name:u.orderConsent,exact:true});if(await order.count())await order.check();if(payment)await page.getByRole('checkbox',{name:u.bankConsent,exact:true}).check();if(ack)await page.getByRole('checkbox',{name:u.unchangedConsent,exact:true}).check();}
export async function edit(page:Page,kind:'OBLIGATION'|'SAVING',action:string,title?:string,amount?:string){
 await page.getByRole('button',{name:kind==='OBLIGATION'?u.addObligation:u.addSaving,exact:true}).click();
 const field=page.getByRole('group',{name:kind==='OBLIGATION'?u.obligation:u.saving,exact:true}).last();
 if(title){await select(page,field.getByRole('combobox',{name:u.identity,exact:true}),new RegExp('^'+title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));}
 await select(page,field.getByRole('combobox',{name:u.actionLabel,exact:true}),u.action[action as keyof typeof u.action]);
 if(amount!==undefined)await field.getByRole('textbox',{name:u.amount,exact:true}).fill(euros(amount).replace(/[^0-9.-]/g,''));return field;
}
export async function transition(page:Page,mode:'FRESH_START'|'CARRY'|'DEFER',reuse=false,source?:string){
 if(mode==='FRESH_START')await page.getByRole('button',{name:u.startFresh,exact:true}).click();
 else{await page.getByRole('button',{name:u.otherActions,exact:true}).click();await select(page,page.getByRole('combobox',{name:u.mode,exact:true}),u.modeLabel[mode]);}
 if(source)await page.getByLabel(u.source,{exact:true}).filter({visible:true}).fill(source);
 if(reuse)await page.getByRole('checkbox',{name:u.reuse,exact:true}).check();
 if(mode!=='DEFER')await page.getByRole('checkbox',{name:u.fundingConsent,exact:true}).check();
 if(mode==='FRESH_START'){await page.getByRole('checkbox',{name:u.nonCarryConsent,exact:true}).check();await page.getByRole('checkbox',{name:u.futureConsent,exact:true}).check();}
}
export async function preview(page:Page,technicalProposal=false){
 const before=JSON.parse(await census()) as Record<string,string>;
 const pending=page.waitForResponse(r=>r.request().method()==='POST'&&!!r.request().headers()['next-action']);
 await page.getByRole('button',{name:u.preview,exact:true}).click();const response=await pending;await response.finished();
 const result=resultOf(await response.text());expect(result?.ok===true,'D_REAL_PREVIEW_SUCCEEDED').toBe(true);const after=JSON.parse(await census()) as Record<string,string>;
 for(const table of Object.keys(before))if(!technicalProposal||!['transfer_proposals','budget_periods'].includes(table))expect(after[table]===before[table],'D_PREVIEW_NO_FINANCIAL_WRITE_'+table).toBe(true);
 if(technicalProposal){
  const scope=(await own()).accounts[0],current=(await day()).p;
  for(const table of ['transfer_proposals','budget_periods']){
   const prior=JSON.parse(before[table]) as Record<string,unknown>[],next=JSON.parse(after[table]) as Record<string,unknown>[];
   for(const row of prior)same(next.find(r=>r.id===row.id),row,'D_PREVIEW_RETAINED_TECHNICAL_'+table);
   const added=next.filter(row=>!prior.some(old=>old.id===row.id));
   expect(added.every(row=>row.owner_user_id===scope.owner_user_id&&row.account_id===scope.id),'D_PREVIEW_OWNED_TECHNICAL_ROWS').toBe(true);
   if(table==='budget_periods')expect(added.length<=1&&added.every(row=>row.period===current),'D_ONLY_MISSING_CURRENT_CALENDAR_PERIOD').toBe(true);
   else{const proposal=(result!.value as {payload:{proposalId:string}}).payload.proposalId;expect(added.length===1&&added[0].id===proposal,'D_ONE_ACTUAL_REVIEW_PROPOSAL').toBe(true);}
  }
 }
 await expect(page.getByRole('button',{name:u.confirm,exact:true})).toBeVisible();return{action:actionFrom(response.request()),value:result!.value as Record<string,unknown>};
}
export async function commit(page:Page){
 const before=await own(),pending=page.waitForResponse(r=>r.request().method()==='POST'&&!!r.request().headers()['next-action']);
 await page.getByRole('button',{name:u.confirm,exact:true}).click();const response=await pending;await response.finished();const result=resultOf(await response.text());expect(result?.ok===true,'D_REAL_CONFIRM_SUCCEEDED').toBe(true);
 await expect(page.getByRole('button',{name:u.confirm,exact:true})).toHaveCount(0);await expect(page.getByRole('status').filter({hasText:u.saved})).toContainText(u.saved);
 const action=actionFrom(response.request()),command=argsOf(action)[0] as Record<string,unknown>,after=await own();
 expect(after.budget_updates.length===before.budget_updates.length+1,'D_ONE_BATCH').toBe(true);const batch=after.budget_updates.find(r=>r.request_id===command.requestId)!;
 same(batch.result,result!.value,'D_PERSISTED_ORIGINAL_RECEIPT');expect(BigInt(String(after.accounts[0].recorded_seq))===BigInt(String(before.accounts[0].recorded_seq))+1n,'D_ONE_SEQUENCE').toBe(true);
 const audits=after.audit_events.filter(a=>a.budget_update_id===batch.id),review=audits.find(a=>(a.before_after as {entity:{type:string}}).entity.type==='BUDGET_UPDATE_REVIEW');
 expect(!!review&&audits.every(a=>a.recorded_seq===batch.recorded_seq),'D_AUDIT_BATCH_LINK').toBe(true);
 const evidence=(review!.before_after as {after:{command:Record<string,unknown>;review:unknown}}).after;
 same(evidence.command,{expectedRevision:command.expectedRevision,effectiveDate:command.effectiveDate,reason:command.reason,payload:command.payload},'D_ORIGINAL_COMMAND_EVIDENCE');
 const payload=command.payload as {draft:{checkpoint:{observedDate:string;balanceCents:string}|null;allocationChange:{checkpoint:{observedDate:string;balanceCents:string}|null}|null}};
 const cp=payload.draft.checkpoint??payload.draft.allocationChange?.checkpoint,created=after.balance_checkpoints.filter(c=>c.budget_update_id===batch.id);
 expect(created.length===(cp?1:0),'D_EXACT_NEW_OR_REUSED_CHECKPOINT').toBe(true);
 if(cp)expect(created[0].observed_date===cp.observedDate&&String(created[0].balance_cents)===cp.balanceCents,'D_PERSISTED_OBSERVATION_DATE_AMOUNT').toBe(true);
 for(const [table,identity,fields]of [['obligation_events','obligation_id',['title','due_date','original_cents','outstanding_cents','status','is_possible','reserve_full']],['savings_events','savings_id',['title','amount_cents','status']]] as const){
  for(const event of after[table].filter(e=>e.budget_update_id===batch.id&&e.action==='FUNDING_TRANSFER')){
   const previous=before[table].find(e=>e.id===event.previous_revision_id);
   expect(!!previous&&previous[identity]===event[identity],'D_FUNDING_LINEAGE_RETAINS_IDENTITY').toBe(true);
   for(const field of fields)same(event[field],previous![field],'D_FUNDING_PRESERVES_'+field);
   expect(after.audit_events.some(a=>a.budget_update_id===batch.id&&(a.before_after as {entity:{type:string;id:string}}).entity.type==='FUNDING_TRANSFER'&&(a.before_after as {entity:{id:string}}).entity.id===event.id),'D_EXPLICIT_FUNDING_AUDIT').toBe(true);
  }
 }
 test.info().annotations.push({type:'receipt',description:'Actual Next action, one persisted batch/receipt/sequence, linked original command and review audit verified'});
 return{action,result:result!,review:evidence.review,batch};
}
export async function replay(page:Page,saved:Awaited<ReturnType<typeof commit>>){await noWrite('D_ORIGINAL_REPLAY',async()=>{const r=resultOf((await invoke(page,saved.action)).body);expect(r?.ok===true,'D_ORIGINAL_REPLAY_OK').toBe(true);same(r?.value,saved.result.value,'D_ORIGINAL_RECEIPT_SAME');});}
export async function assertState(page:Page,expected:{B:string;A:Record<string,string>;R?:Record<string,string>;S?:Record<string,string>},show=true){
 const rows=await own(),periods=new Map(rows.budget_periods.map(p=>[p.id,p.period as string])),head=rows.allocation_revisions.find(v=>v.id===rows.accounts[0].active_allocation_revision_id)!;
 expect(!!head,'D_CONFIRMED_VECTOR').toBe(true);const bank=rows.balance_checkpoints.find(c=>c.id===head.checkpoint_id)!;
 expect(String(bank.balance_cents)===expected.B,'D_AUTHORITATIVE_BANK').toBe(true);
 const A:Record<string,bigint>={},R:Record<string,bigint>={},S:Record<string,bigint>={};
 for(const a of rows.period_allocations.filter(a=>a.allocation_revision_id===head.id))A[periods.get(a.period_id)!]=BigInt(String(a.amount_cents));
 const latest=(records:Record<string,unknown>[],key:string)=>{const map=new Map<unknown,Record<string,unknown>>();for(const e of records){const old=map.get(e[key]);if(!old||BigInt(String(e.recorded_seq))>BigInt(String(old.recorded_seq)))map.set(e[key],e);}return [...map.values()];};
 for(const o of latest(rows.obligation_events,'obligation_id'))if(o.status==='UNPAID'&&o.reserve_full){const p=periods.get(o.funding_period_id)!;R[p]=(R[p]??0n)+BigInt(String(o.outstanding_cents));}
 for(const s of latest(rows.savings_events,'savings_id'))if(s.status==='ACTIVE'){const p=periods.get(s.funding_period_id)!;S[p]=(S[p]??0n)+BigInt(String(s.amount_cents));}
 for(const [actual,wanted,label]of [[A,expected.A,'A'],[R,expected.R??{},'R'],[S,expected.S??{},'S']] as const){const keys=new Set([...Object.keys(actual),...Object.keys(wanted)]);for(const p of keys)expect((actual[p]??0n)===BigInt(wanted[p]??'0'),'D_INDEPENDENT_'+label).toBe(true);}
 const B=BigInt(expected.B);expect(Object.values(A).every(v=>v>=0n)&&Object.values(A).reduce((n,v)=>n+v,0n)===B,'D_NONNEGATIVE_FULL_VECTOR_SUM_BANK').toBe(true);
 const d=await day(),all=new Set([...Object.keys(A),...Object.keys(R),...Object.keys(S)]);let T=(R[d.p]??0n)+(S[d.p]??0n);
 for(const p of all)if(p!==d.p){const a=A[p]??0n,e=(R[p]??0n)+(S[p]??0n);T+=a>e?a:e;}
 const safe=B>T?B-T:0n,F=(A[d.p]??0n)-(R[d.p]??0n)-(S[d.p]??0n),parts=d.today.split('-').map(Number),n=BigInt(new Date(Date.UTC(parts[0],parts[1],0)).getUTCDate()-parts[2]+1);
 const latestBatch=[...rows.budget_updates].sort((a,b)=>BigInt(String(a.recorded_seq))>BigInt(String(b.recorded_seq))?-1:1)[0];
 const evidence=rows.audit_events.find(a=>a.budget_update_id===latestBatch.id&&(a.before_after as {entity:{type:string}}).entity.type==='BUDGET_UPDATE_REVIEW')!;
 const financial=(evidence.before_after as {after:{review:BudgetReviewData}}).after.review.financial;
 expect(financial.projection.bank?.balance===expected.B&&financial.projection.safe?.safeAvailable===safe.toString()&&financial.projection.safe.safeDailyLimit===(safe/n).toString(),'D_SAVED_REVIEW_INDEPENDENT_CURRENT_D36').toBe(true);
 if(show)await noWrite('D_DASHBOARD_READ_RELOAD',async()=>{await page.goto('/');const metric=async(label:string,value:bigint)=>{await expect(page.locator('dt:visible').filter({hasText:new RegExp('^'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')}).locator('..').locator('dd')).toHaveText(euros(value));};await metric(en.dashboard.free,F);await metric(en.dashboard.safeAvailable,safe);await metric(en.dashboard.safeDaily,safe/n);await page.reload();await metric(en.dashboard.safeAvailable,safe);});
 test.info().annotations.push({type:'invariants',description:'Independent integer PG full-vector/R/S/F/D36 oracle and real dashboard; no double debit; Berlin inclusive days'});return{rows,A,R,S,B,F,safe,head,bank};
}
