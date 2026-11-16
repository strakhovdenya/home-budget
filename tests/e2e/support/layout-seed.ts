import {mkdir,writeFile} from 'node:fs/promises';
import {identityRepository} from '../../../src/infrastructure/auth/repository';
import * as s from '../../../src/infrastructure/db/schema';
import {syntheticOwner} from './session';
import {admitted,common,builder,calendar} from './history-fixture';
import {allLayoutCases} from '../../../scripts/e2e/layout-harness';
async function seed(){
 if(!allLayoutCases.includes(process.env.HB_H_CASE??''))throw Error('H_SEED_CASE');
 if(process.env.HB_H_CASE==='H-LABELS'||process.env.HB_H_CASE!.endsWith('-FIRST')||process.env.HB_H_CASE!.endsWith('-TRANSITION')){
  // Reuse approved synthetic fixtures; credentials stay in this setup process.
  const first=process.env.HB_H_CASE==='H-LABELS'||process.env.HB_H_CASE!.endsWith('-FIRST');
  if(first)process.env.HB_C_CASE='C-01';else process.env.HB_D_CASE='D-07';
  await mkdir('/work/test-results',{recursive:true});await writeFile('/work/test-results/h-fixture.json',JSON.stringify({syntheticSeed:first?'C-01':'D-07'}));
  if(first)await import('./onboarding-seed');else await import('./finance-seed');
  return;
 }
 const db=admitted();
 try{
  const owner=await identityRepository(db).bind(syntheticOwner.subject);if(!owner)throw Error('H_SEED_OWNER');
  const scope={ownerUserId:owner,accountId:syntheticOwner.accountId};
  await db.db.insert(s.accounts).values({...scope,id:scope.accountId,displayName:'H synthetic retained account'});
  const fixture=await common(db,scope,process.env.HB_H_CASE!.endsWith('-ZERO')?'F-04b':'F-01');
  if(!process.env.HB_H_CASE!.endsWith('-ZERO')){const d=await calendar(db);await builder(db,scope).observe(d.today,'100001',{[d.p]:'80001',[d.q]:'20000'});}
  await mkdir('/work/test-results',{recursive:true});
  await writeFile('/work/test-results/h-fixture.json',JSON.stringify(fixture,(_,v)=>typeof v==='bigint'?v.toString():v));
  console.log('H_SYNTHETIC_SEED_READY');
 }finally{await db.close();}
}
seed().catch(()=>{console.error('H_SEED_FAILED');process.exitCode=1;});
