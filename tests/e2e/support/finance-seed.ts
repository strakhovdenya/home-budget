import {randomUUID} from 'node:crypto';import {sql} from 'drizzle-orm';
import {createDatabase} from '../../../src/infrastructure/db/client';import {requireLocalDatabaseTargets} from '../../../src/infrastructure/db/local-target';
import {identityRepository} from '../../../src/infrastructure/auth/repository';import {createBudgetRepository} from '../../../src/infrastructure/db/budget-update-repository';
import {prepareCommand} from '../../../src/domain/updates/validation';import * as s from '../../../src/infrastructure/db/schema';import {syntheticOwner} from './session';import {financeCases} from '../../../scripts/e2e/finance-harness';
function value<T>(r:{ok:true;value:T}|{ok:false;code:string}):T{if(!r.ok)throw Error('D_SEED_'+r.code);return r.value;}
async function seed(){
 const targets=requireLocalDatabaseTargets(process.env),u=new URL(targets.TEST_DATABASE_URL),id=process.env.HB_E2E_RUN_ID,kind=process.env.HB_D_CASE;
 if(process.cwd()!=='/work'||!id||!/^[a-f0-9]{32}$/.test(id)||u.username!=='hb_verifier'||u.hostname!=='127.0.0.1'||u.port!=='5432'||u.pathname!=='/hb_e2e_'+id||!financeCases.some(c=>c===kind))throw Error('D_SEED_ADMISSION');
 const db=createDatabase(targets.TEST_DATABASE_URL);
 try{
  const owner=await identityRepository(db).bind(syntheticOwner.subject);if(!owner)throw Error('D_OWNER_REQUIRED');
  const day=(await db.db.execute<{today:string;yesterday:string;p:string;m:string;q:string;l:string}>(sql`SELECT (clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date::text today,((clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date-1)::text yesterday,to_char(clock_timestamp() AT TIME ZONE 'Europe/Berlin','YYYY-MM') p,to_char(clock_timestamp() AT TIME ZONE 'Europe/Berlin'-interval '1 month','YYYY-MM') m,to_char(clock_timestamp() AT TIME ZONE 'Europe/Berlin'+interval '1 month','YYYY-MM') q,to_char(clock_timestamp() AT TIME ZONE 'Europe/Berlin'-interval '2 months','YYYY-MM') l`)).rows[0];
  const foreign=randomUUID();await db.db.insert(s.users).values({id:foreign,emailVerified:false,googleSubject:'d-forbidden-owner'});
  for(const [actor,account,other]of [[owner,syntheticOwner.accountId,false],[foreign,randomUUID(),true]] as const){
   await db.db.insert(s.accounts).values({id:account,ownerUserId:actor,displayName:other?'D FORBIDDEN SENTINEL':'D synthetic retained account'});
   if(!other&&kind==='D-00')continue;
   const scope={ownerUserId:actor,accountId:account},repo=createBudgetRepository(db);
   let b='100000',a:Record<string,string>={[day.p]:'100000'},o='0',saving='0',funding=day.p,date=day.m+'-20';
   if(other){b='654321';a={[day.p]:b};}
   else if(kind==='D-02'){o='20000';}
   else if(kind==='D-03'){b='50000';a={[day.p]:b};o='20000';}
   else if(kind==='D-04'){b='50000';a={[day.p]:b};o='10000';}
   else if(kind==='D-05'){b='15000';a={[day.p]:b};}
   else if(kind==='D-06'){b='40000';a={[day.p]:b};o='20000';saving='5000';}
   else if(['D-07','D-09'].includes(kind!)){b='60000';a={[day.m]:b};o='20000';saving='15000';funding=day.m;}
   else if(['D-08a','D-08b','D-10'].includes(kind!)){b='90000';a={[day.m]:'40000',[day.p]:'50000'};o='30000';saving='5000';funding=day.m;}
   else if(kind==='D-12'){b='50000';a={[day.p]:b};date=day.m+'-05';}
   else if(kind==='D-13'){b='20000';a={[day.p]:'15000',[day.q]:'5000'};o='10000';funding=day.q;}
   else if(kind==='D-15'){b='10000';a={[day.l]:'4000',[day.m]:'6000'};o='9000';saving='2000';funding=day.l;date=day.l+'-20';}
   const obligation=(amount:string,period:string,title:string)=>({action:'CREATE',identityId:null,expectedRevisionId:null,bankDate:null,payment:null,data:{title,dueDate:null,originalCents:amount,isPossible:false,reserveFull:true,originatingPeriod:period,fundingPeriod:period}});
   const obligations=o==='0'?[]:[obligation(o,funding,'D retained obligation')];if(!other&&kind==='D-10')obligations.push(obligation('2000',day.p,'D disjoint obligation'));
   const savings=saving==='0'?[]:[{action:'CREATE',identityId:null,expectedRevisionId:null,data:{title:'D retained saving',amountCents:saving,originatingPeriod:funding,fundingPeriod:funding}}];
   for(const [when,balance,vector,initial] of (kind==='D-12'&&!other?[[date,b,a,true],[day.yesterday,'45000',{[day.p]:'45000'},false]]:[[date,b,a,true]]) as [string,string,Record<string,string>,boolean][]){
    const base=value(await repo.load(scope)) as unknown as {revision:string;knowledgeCut:string;baseCheckpointId:string|null;baseVectorId:string|null};
    const raw=value(prepareCommand({requestId:randomUUID(),expectedRevision:base.revision,effectiveDate:when,reason:'Synthetic D seed',payload:{schemaVersion:1,knowledgeCut:base.knowledgeCut,baseCheckpointId:base.baseCheckpointId,baseVectorId:base.baseVectorId,effectiveDate:when,checkpoint:{observedDate:when,observedAt:null,balanceCents:balance,allocations:Object.entries(vector).map(([period,amountCents])=>({period,amountCents})),correction:null,placement:null},allocationChange:null,completeVectorConfirmed:true,obligations:initial?obligations:[],savings:initial?savings:[]}}));
    value(await repo.confirm(scope,value(prepareCommand(value(await repo.preview(scope,raw))))));
   }
  }
  console.log('D_SYNTHETIC_SEED_READY');
 }finally{await db.close();}
}
seed().catch(e=>{console.error(e instanceof Error&&/^D_[A-Z_]+$/.test(e.message)?e.message:'D_SEED_FAILED');process.exitCode=1;});
