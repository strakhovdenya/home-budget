import fs from 'node:fs';import {randomUUID} from 'node:crypto';import {sql} from 'drizzle-orm';
import {identityRepository} from '../../../src/infrastructure/auth/repository';import * as s from '../../../src/infrastructure/db/schema';
import {syntheticOwner} from './session';import {admitted,builder,calendar,common} from './history-fixture';
import {commitBatch} from '../../../src/infrastructure/db/commit';import {writeObligations} from '../../../src/infrastructure/db/obligation-writer';
import {closingCases} from '../../../scripts/e2e/closing-harness';
async function seed(){const db=admitted(),kind=process.env.HB_G_CASE;if(!closingCases.some(c=>c===kind))throw Error('G_SEED_CASE');try{
 const owner=await identityRepository(db).bind(syntheticOwner.subject);if(!owner)throw Error('G_SEED_OWNER');const scope={ownerUserId:owner,accountId:syntheticOwner.accountId};await db.db.insert(s.accounts).values({...scope,id:scope.accountId,displayName:'G synthetic account'});
 const d=await calendar(db),b=builder(db,scope);let result:Record<string,unknown>={calendar:d,scope};
 if(kind==='G-10')result=await common(db,scope,'F-03');else{
  const bn=['G-01','G-04'].includes(kind!);result.amounts=bn?{r:'30000',s:'0'}:{r:'20000',s:'10000'};
  if(bn)await commitBatch(db.db,{scope,kind:'OBLIGATION_CREATE',command:await b.command({changes:[{key:'o',action:'CREATE',obligationId:null,expectedStateRevisionId:null,correctionId:null,previousChangeKey:null,effectiveDate:d.m+'-02',bankDate:null,placement:null,bankCheck:null,paymentConfirmation:null,data:{title:'G retained full obligation',dueDate:null,originalCents:'30000',isPossible:false,reserveFull:true,originatingPeriod:d.m,fundingPeriod:d.m}}]},d.m+'-02')},writeObligations);
  else await b.earmarks(d.m,kind==='G-03'?'2000':'20000',kind==='G-03'?'1000':'10000');
  result.original=await b.observe(kind==='G-02'||kind==='G-03'?d.h:d.d0,kind==='G-03'?'0':'80000',kind==='G-03'?{[d.m]:'0'}:{[d.m]:'60000',[d.p]:'20000'});
  // A later genuine current observation must never become past month-end cash.
  result.current=await b.observe(d.today,'100000',{[d.p]:'100000'});
  if(kind==='G-04')result.report1=await b.close(d.m,d.today);
  if(kind==='G-03')result.amounts={r:'2000',s:'1000'};
 }
 const foreign=randomUUID(),account=randomUUID();await db.db.insert(s.users).values({id:foreign,emailVerified:false,googleSubject:'g-forbidden'});await db.db.insert(s.accounts).values({id:account,ownerUserId:foreign,displayName:'G FORBIDDEN'});const other=builder(db,{ownerUserId:foreign,accountId:account});await other.observe(d.d0,'654321',{[d.m]:'654321'});const receipt=await other.close(d.m,d.today);
 if(kind==='G-06')await db.db.execute(sql.raw(`CREATE FUNCTION g_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.reason='G forced SQL rollback' THEN RAISE EXCEPTION 'G synthetic rollback' USING ERRCODE='23514'; END IF; RETURN NEW; END $$; CREATE TRIGGER g_fail_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION g_reject_audit();`));
 fs.mkdirSync('/work/test-results',{recursive:true});fs.writeFileSync('/work/test-results/g-fixture.json',JSON.stringify({...result,foreign:{owner:foreign,account,receipt}},(_,v)=>typeof v==='bigint'?v.toString():v));console.log('G_SYNTHETIC_SEED_READY');
 }finally{await db.close();}}
seed().catch(()=>{console.error('G_SEED_FAILED');process.exitCode=1;});
