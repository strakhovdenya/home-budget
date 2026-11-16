import {randomUUID} from 'node:crypto';import {sql} from 'drizzle-orm';
import {createDatabase} from '../../../src/infrastructure/db/client';import {requireLocalDatabaseTargets} from '../../../src/infrastructure/db/local-target';
import {identityRepository} from '../../../src/infrastructure/auth/repository';import {createBudgetRepository} from '../../../src/infrastructure/db/budget-update-repository';
import {createTemplateRepository} from '../../../src/infrastructure/db/template-repository';import {prepareCommand} from '../../../src/domain/updates/validation';
import * as s from '../../../src/infrastructure/db/schema';import {syntheticOwner} from './session';import {recurringCases} from '../../../scripts/e2e/recurring-harness';
function value<T>(r:{ok:true;value:T}|{ok:false;code:string}):T{if(!r.ok)throw Error('E_SEED_'+r.code);return r.value;}
async function seed(){
 const targets=requireLocalDatabaseTargets(process.env),u=new URL(targets.TEST_DATABASE_URL),id=process.env.HB_E2E_RUN_ID,kind=process.env.HB_E_CASE;
 if(process.cwd()!=='/work'||!id||!/^[a-f0-9]{32}$/.test(id)||u.username!=='hb_verifier'||u.hostname!=='127.0.0.1'||u.port!=='5432'||u.pathname!=='/hb_e2e_'+id||!recurringCases.some(c=>c===kind))throw Error('E_SEED_ADMISSION');
 const db=createDatabase(targets.TEST_DATABASE_URL);
 try{
  const owner=await identityRepository(db).bind(syntheticOwner.subject);if(!owner)throw Error('E_OWNER_REQUIRED');
  const d=(await db.db.execute<{today:string;p:string;m:string;q:string}>(sql`SELECT (clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date::text today,to_char(clock_timestamp() AT TIME ZONE 'Europe/Berlin','YYYY-MM') p,to_char(clock_timestamp() AT TIME ZONE 'Europe/Berlin'-interval '1 month','YYYY-MM') m,to_char(clock_timestamp() AT TIME ZONE 'Europe/Berlin'+interval '1 month','YYYY-MM') q`)).rows[0];
  const foreign=randomUUID();await db.db.insert(s.users).values({id:foreign,emailVerified:false,googleSubject:'e-forbidden-owner'});
  for(const [actor,account,other]of [[owner,syntheticOwner.accountId,false],[foreign,randomUUID(),true]] as const){
   await db.db.insert(s.accounts).values({id:account,ownerUserId:actor,displayName:other?'E FORBIDDEN SENTINEL':'E synthetic retained account'});
   const scope={ownerUserId:actor,accountId:account},repo=createBudgetRepository(db),when=d.m+'-20',base=value(await repo.load(scope)) as unknown as {revision:string;knowledgeCut:string;baseCheckpointId:string|null;baseVectorId:string|null};
   const raw=value(prepareCommand({requestId:randomUUID(),expectedRevision:base.revision,effectiveDate:when,reason:'Synthetic E seed',payload:{schemaVersion:1,knowledgeCut:base.knowledgeCut,baseCheckpointId:base.baseCheckpointId,baseVectorId:base.baseVectorId,effectiveDate:when,checkpoint:{observedDate:when,observedAt:null,balanceCents:other?'654321':'100000',allocations:other?[{period:d.p,amountCents:'654321'}]:[{period:d.p,amountCents:'70000'},{period:d.q,amountCents:'30000'}],correction:null,placement:null},allocationChange:null,completeVectorConfirmed:true,obligations:[],savings:[]}}));
   value(await repo.confirm(scope,value(prepareCommand(value(await repo.preview(scope,raw))))));
   const templates=createTemplateRepository(db),templateId=randomUUID();
   const current=()=>templates.load(scope,d.p);
   const initial=value(await current()) as unknown as {revision:string};
   value(await templates.commit(scope,value(prepareCommand({requestId:randomUUID(),expectedRevision:initial.revision,effectiveDate:d.today,reason:'Synthetic E configuration',payload:{schemaVersion:1,action:'CONFIG',templateId,expectedVersion:null,title:other?'E FORBIDDEN TEMPLATE':'E synthetic monthly bill',amountCents:'5400',enabled:true}}))));
   if(!other&&['E-05','E-06'].includes(kind!)){
    const prior=value(await templates.load(scope,d.m)) as unknown as {revision:string;placement:unknown;configs:{version:string}[]};
    value(await templates.commit(scope,value(prepareCommand({requestId:randomUUID(),expectedRevision:prior.revision,effectiveDate:d.today,reason:'Synthetic E old context debt',payload:{schemaVersion:1,action:'ACCEPT',templateId,templateVersion:prior.configs[0].version,originPeriod:d.m,fundingPeriod:d.m,amountCents:'5400',placement:prior.placement}}))));
   }
  }
  console.log('E_SYNTHETIC_SEED_READY');
 }finally{await db.close();}
}
seed().catch(e=>{console.error(e instanceof Error&&/^E_[A-Z_]+$/.test(e.message)?e.message:'E_SEED_FAILED');process.exitCode=1;});
