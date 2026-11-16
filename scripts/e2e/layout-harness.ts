import {randomBytes} from 'node:crypto';import {readFile,mkdir} from 'node:fs/promises';import {join} from 'node:path';
export const layoutCases=['H-RU-320','H-RU-DESKTOP','H-DE-320','H-DE-DESKTOP','H-EN-320','H-EN-DESKTOP','H-RU-375','H-FF-DESKTOP','H-FF-375','H-WK-DESKTOP','H-WK-375'] as const;
// Owner scope change, 2026-11-16: MVP smoke only; H retains its complete matrix.
export const accessibilityCases = ['H-RU-320-A11Y', 'H-RU-320-A11Y-FIRST'];
export const journeyCases=[...layoutCases.filter(n=>!n.endsWith('375')&&!n.startsWith('H-FF')&&!n.startsWith('H-WK')).flatMap(n=>[n+'-FIRST',n+'-TRANSITION']),...layoutCases.filter(n=>n.startsWith('H-FF')||n.startsWith('H-WK')).map(n=>n+'-FIRST'),...accessibilityCases.filter(name=>name.endsWith('-FIRST'))];
export const zeroCases=['H-RU-320-ZERO','H-DE-320-ZERO','H-EN-320-ZERO'];
export const allLayoutCases:readonly string[]=['H-LABELS','H-FILTERS',...layoutCases,...zeroCases,...journeyCases.filter(name=>!name.includes('-A11Y')),...accessibilityCases];
type Env=Record<string,string>;
type Harness={node:(args:string[],env?:Env,timeout?:number)=>Promise<string>;sql:(s:string)=>Promise<unknown>;copy:(s:string,d:string)=>Promise<unknown>;step:(n:string,a:()=>Promise<unknown>)=>Promise<unknown>;verifier:Env;output:string;caseFilter?:string;forbiddenPasswords:string[]};
export async function runLayoutCases(h:Harness){
 const password=randomBytes(24).toString('hex');if(h.forbiddenPasswords.includes(password))throw Error('H_PASSWORD_COLLISION');
 await h.sql("CREATE ROLE hb_h_runtime LOGIN PASSWORD '"+password+"';");
 const writerPassword=randomBytes(24).toString('hex');if([password,...h.forbiddenPasswords].includes(writerPassword))throw Error('H_WRITER_PASSWORD_COLLISION');
 await h.sql("CREATE ROLE hb_h_writer LOGIN PASSWORD '"+writerPassword+"';");
 const stats:Record<string,unknown>={},databases:{name:string;removed:boolean}[]=[];let failures=0;
 for(const name of allLayoutCases.filter(n=>!h.caseFilter||h.caseFilter.split(',').includes(n))){
  const writable=journeyCases.includes(name),role=writable?'hb_h_writer':'hb_h_runtime',runtimePassword=writable?writerPassword:password;
  const nonce=randomBytes(16).toString('hex'),database='hb_e2e_'+nonce,dir=join(h.output,name);await mkdir(dir,{recursive:true});
  await h.sql('CREATE DATABASE '+database);const record={name:database,removed:false};databases.push(record);
  const admin:Env={...h.verifier,HB_E2E_RUN_ID:nonce,HB_H_CASE:name};for(const key of ['DATABASE_URL','DATABASE_URL_UNPOOLED','TEST_DATABASE_URL']){const u=new URL(admin[key]);u.pathname='/'+database;admin[key]=u.toString();}
  await h.step(name+'-migrate',()=>h.node(['--conditions=react-server','--import','tsx','scripts/db-migrate.ts'],admin));
  await h.step(name+'-seed',()=>h.node(['--conditions=react-server','--import','tsx','tests/e2e/support/layout-seed.ts'],admin));
  const grants=`GRANT CONNECT ON DATABASE ${database} TO ${role};GRANT USAGE ON SCHEMA public TO ${role};GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${role};`+(writable?`GRANT INSERT ON ${name.endsWith('-FIRST')?'accounts,':''}budget_periods,budget_updates,historical_positions,ordering_revisions,balance_checkpoints,allocation_revisions,period_allocations,obligations,obligation_events,${name.endsWith('-TRANSITION')?'savings_goals,savings_events,':''}audit_events${name.endsWith('-TRANSITION')?',transfer_proposals,transition_decisions,budget_transfers':''} TO hb_h_writer;GRANT UPDATE(aggregate_revision,recorded_seq,active_allocation_revision_id) ON accounts TO hb_h_writer;GRANT UPDATE(theme) ON users TO hb_h_writer;${name.endsWith('-TRANSITION')?'GRANT UPDATE(id) ON transfer_proposals TO hb_h_writer;':''}`:'');
  await h.node(['--input-type=module','-e',"import pg from 'pg';const c=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await c.connect();await c.query("+JSON.stringify(grants)+");await c.end();"],admin);
  const u='postgresql://'+role+':'+runtimePassword+'@127.0.0.1:5432/'+database;
  const env={DATABASE_URL:u,DATABASE_URL_UNPOOLED:u,TEST_DATABASE_URL:u,HB_E2E_RUN_ID:nonce,HB_E2E_DATABASE:database,HB_E2E_PASSWORD:runtimePassword,HB_H_CASE:name,
   AUTH_SECRET:randomBytes(24).toString('hex'),AUTH_GOOGLE_ID:'hb021-synthetic.apps.googleusercontent.com',AUTH_GOOGLE_SECRET:randomBytes(24).toString('hex'),ALLOWED_GOOGLE_EMAIL:'owner@example.test',AUTH_URL:'http://127.0.0.1:3000'};
  await h.node(['-e',"for(const file of ['h-results.json','h-layout.json','h-layout.png','h-theme-light.png','h-theme-dark.png','h-theme-system.png'])require('fs').rmSync('/work/test-results/'+file,{force:true})"]);
  try{await h.step(name+'-browser',()=>h.node(['node_modules/@playwright/test/cli.js','test','--config','playwright.layout.config.ts','--grep',name+' '],env,300_000));}catch{failures++;}
  await h.copy('/work/test-results/h-layout.png',join(dir,'layout.png')).catch(()=>{});
  await h.copy('/work/test-results/h-layout.json',join(dir,'layout.json')).catch(()=>{});
  for(const theme of ['light','dark','system'])await h.copy('/work/test-results/h-theme-'+theme+'.png',join(dir,'theme-'+theme+'.png')).catch(()=>{});
  // Synthetic H/K and retained batch anchors only; no URLs, passwords or cookies.
  await h.copy('/work/test-results/h-fixture.json',join(dir,'fixture.json')).catch(()=>{failures++;});
  await h.copy('/work/test-results/h-results.json',join(dir,'playwright.json')).catch(()=>{failures++;});
  try{const r=JSON.parse(await readFile(join(dir,'playwright.json'),'utf8')),expected=name==='H-LABELS'||name==='H-FILTERS'?9:1;stats[name]=r.stats;if(r.status!=='passed'||r.stats.expected!==expected||r.stats.unexpected||r.stats.skipped||r.stats.flaky||r.tests.length!==expected)failures++;}catch{stats[name]={notExecuted:true};failures++;}
  if(!/^hb_e2e_[a-f0-9]{32}$/.test(database)||database===new URL(h.verifier.TEST_DATABASE_URL).pathname.slice(1))throw Error('H_FOREIGN_DATABASE_REFUSED');
  await h.step(name+'-database-cleanup',()=>h.sql('DROP DATABASE '+database));record.removed=true;
  if(failures)break;
 }
 return{stats,databases,failures,notExecuted:allLayoutCases.filter(n=>(!h.caseFilter||h.caseFilter.split(',').includes(n))&&!(n in stats))};
}
