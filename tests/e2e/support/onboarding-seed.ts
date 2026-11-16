import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { createDatabase } from '../../../src/infrastructure/db/client';
import { requireLocalDatabaseTargets } from '../../../src/infrastructure/db/local-target';
import { identityRepository } from '../../../src/infrastructure/auth/repository';
import { createBudgetRepository } from '../../../src/infrastructure/db/budget-update-repository';
import { createClosingRepository } from '../../../src/infrastructure/db/closing-repository';
import { commitBatch } from '../../../src/infrastructure/db/commit';
import { writeObligations } from '../../../src/infrastructure/db/obligation-writer';
import { acceptedObligationPayload } from '../../../src/domain/recurring/templates';
import { prepareCommand } from '../../../src/domain/updates/validation';
import * as s from '../../../src/infrastructure/db/schema';
import { syntheticOwner } from './session';

function value<T>(v: {ok:true;value:T}|{ok:false;code:string}):T { if (!v.ok) throw Error('C_SEED_' + v.code); return v.value; }
async function seed() {
  if (process.env.HB_TEST_DATABASE_TARGET !== 'disposable-local-container') throw Error('C_LOCAL_ONLY');
  const targets=requireLocalDatabaseTargets(process.env),url=new URL(targets.TEST_DATABASE_URL),id=process.env.HB_E2E_RUN_ID;
  if(process.cwd()!=='/work'||!id||!/^[a-f0-9]{32}$/.test(id)||url.username!=='hb_verifier'||
    url.hostname!=='127.0.0.1'||url.port!=='5432'||url.pathname!=='/hb_e2e_'+id||
    !['C-01','C-02','C-03','C-04','C-05','C-06','C-07','C-08','C-09a','C-09b'].includes(process.env.HB_C_CASE??''))throw Error('C_SEED_ADMISSION');
  const db = createDatabase(targets.TEST_DATABASE_URL);
  try {
    const identities=identityRepository(db);
    // C-04 is already provisioned by the unchanged B seed, including its foreign
    // forbidden identity. Do not perform a second first-login bind in that realm.
    const existing=process.env.HB_C_CASE==='C-04'
      ? await db.db.select({id:s.users.id}).from(s.users).where(eq(s.users.googleSubject,syntheticOwner.subject)) : [];
    const owner=process.env.HB_C_CASE==='C-04'?(existing.length===1?existing[0].id:null):await identities.bind(syntheticOwner.subject);
    if (!owner||!await identities.matches(owner,syntheticOwner.subject)) throw Error('C_BINDING_REQUIRED');
    const clock = (await db.db.execute<{today:string;past:string;yesterday:string}>(sql`SELECT (clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date::text today,
      to_char((clock_timestamp() AT TIME ZONE 'Europe/Berlin')-interval '1 month','YYYY-MM') past,
      ((clock_timestamp() AT TIME ZONE 'Europe/Berlin')::date-1)::text yesterday`)).rows[0];
    if (process.env.HB_C_CASE === 'C-04') {
      const scope = { ownerUserId: owner, accountId: syntheticOwner.accountId }, repo = createBudgetRepository(db);
      const base = value(await repo.load(scope)) as unknown as {revision:string;knowledgeCut:string;baseCheckpointId:string;baseVectorId:string};
      const day = clock.past + '-25';
      const raw = value(prepareCommand({requestId:randomUUID(),expectedRevision:base.revision,effectiveDate:day,reason:'Synthetic historical C regression',payload:{schemaVersion:1,
        knowledgeCut:base.knowledgeCut,baseCheckpointId:base.baseCheckpointId,baseVectorId:base.baseVectorId,effectiveDate:day,
        checkpoint:{observedDate:day,observedAt:null,balanceCents:'90000',allocations:[{period:clock.today.slice(0,7),amountCents:'90000'}],correction:null,placement:null},
        allocationChange:null,completeVectorConfirmed:true,obligations:[],savings:[]}}));
      value(await repo.confirm(scope,value(prepareCommand(value(await repo.preview(scope,raw))))));
      const closing = createClosingRepository(db), view = value(await closing.load(scope,{period:clock.past,version:null,offset:0,digest:null})) as {revision:string;headId:string;headVersion:number};
      const review = value(await closing.preview(scope,value(prepareCommand({requestId:randomUUID(),expectedRevision:view.revision,effectiveDate:clock.today,reason:'Synthetic immutable version two',
        payload:{schemaVersion:1,operation:'REVISION',period:clock.past,expectedHeadId:view.headId,expectedHeadVersion:view.headVersion}})))) as {command:unknown};
      value(await closing.confirm(scope,value(prepareCommand(review.command))));
    } else {
      const foreign = randomUUID(), foreignAccount = randomUUID();
      await db.db.insert(s.users).values({id:foreign,googleSubject:'c-forbidden-foreign',emailVerified:false});
      await db.db.insert(s.accounts).values({id:foreignAccount,ownerUserId:foreign,displayName:'C FORBIDDEN SENTINEL'});
      const repo=createBudgetRepository(db), scope={ownerUserId:foreign,accountId:foreignAccount};
      const raw=value(prepareCommand({requestId:randomUUID(),expectedRevision:'0',effectiveDate:clock.today,reason:'Synthetic forbidden fixture',payload:{schemaVersion:1,
        knowledgeCut:'0',baseCheckpointId:null,baseVectorId:null,effectiveDate:clock.today,checkpoint:{observedDate:clock.today,observedAt:null,balanceCents:'654321',
          allocations:[{period:clock.today.slice(0,7),amountCents:'654321'}],correction:null,placement:null},allocationChange:null,completeVectorConfirmed:true,obligations:[],savings:[]}}));
      value(await repo.confirm(scope,value(prepareCommand(value(await repo.preview(scope,raw))))));
      if(process.env.HB_C_CASE==='C-03') {
        const accountId=syntheticOwner.accountId; await db.db.insert(s.accounts).values({id:accountId,ownerUserId:owner,displayName:'Synthetic retained name'});
        const template={id:randomUUID(),version:randomUUID(),title:'Synthetic retained full reserve',amountCents:'5400',enabled:true};
        const payload=acceptedObligationPayload({schemaVersion:1,action:'ACCEPT',templateId:template.id,templateVersion:template.version,
          originPeriod:clock.today.slice(0,7),fundingPeriod:clock.today.slice(0,7),amountCents:'5400',placement:null},template,clock.yesterday);
        await commitBatch(db.db,{scope:{ownerUserId:owner,accountId},kind:'OBLIGATION_CREATE',command:value(prepareCommand({requestId:randomUUID(),expectedRevision:'0',effectiveDate:clock.yesterday,reason:'Synthetic retained reserve',payload}))},writeObligations);
      }
    }
    console.log('C_SYNTHETIC_CASE_PROVISIONED');
  } finally { await db.close(); }
}
seed().catch(error => { console.error(error instanceof Error && /^C_[A-Z_]+$/.test(error.message) ? error.message : 'C_PROVISION_FAILED'); process.exitCode=1; });
