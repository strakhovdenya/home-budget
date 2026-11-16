import {randomBytes} from 'node:crypto';import {readFile,mkdir} from 'node:fs/promises';import {join} from 'node:path';
export const historyCases=['F-01','F-02','F-03','F-04a','F-04b','F-04c','F-05','F-06','F-07','F-08'] as const;
type Env=Record<string,string>;
type Harness={node:(args:string[],env?:Env,timeout?:number)=>Promise<string>;sql:(s:string)=>Promise<unknown>;copy:(s:string,d:string)=>Promise<unknown>;step:(n:string,a:()=>Promise<unknown>)=>Promise<unknown>;verifier:Env;output:string;caseFilter?:string;forbiddenPasswords:string[]};
export async function runHistoryCases(h:Harness){
 const password=randomBytes(24).toString('hex');if(h.forbiddenPasswords.includes(password))throw Error('F_PASSWORD_COLLISION');
 await h.sql("CREATE ROLE hb_f_runtime LOGIN PASSWORD '"+password+"';");
 const stats:Record<string,unknown>={},databases:{name:string;removed:boolean}[]=[];let failures=0;
 for(const name of historyCases.filter(n=>!h.caseFilter||h.caseFilter.split(',').includes(n))){
  const nonce=randomBytes(16).toString('hex'),database='hb_e2e_'+nonce,dir=join(h.output,name);await mkdir(dir,{recursive:true});
  await h.sql('CREATE DATABASE '+database);const record={name:database,removed:false};databases.push(record);
  const admin:Env={...h.verifier,HB_E2E_RUN_ID:nonce,HB_F_CASE:name};for(const key of ['DATABASE_URL','DATABASE_URL_UNPOOLED','TEST_DATABASE_URL']){const u=new URL(admin[key]);u.pathname='/'+database;admin[key]=u.toString();}
  await h.step(name+'-migrate',()=>h.node(['--conditions=react-server','--import','tsx','scripts/db-migrate.ts'],admin));
  await h.step(name+'-seed',()=>h.node(['--conditions=react-server','--import','tsx','tests/e2e/support/history-seed.ts'],admin));
  const grants=`GRANT CONNECT ON DATABASE ${database} TO hb_f_runtime;GRANT USAGE ON SCHEMA public TO hb_f_runtime;GRANT SELECT ON ALL TABLES IN SCHEMA public TO hb_f_runtime;`;
  await h.node(['--input-type=module','-e',"import pg from 'pg';const c=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await c.connect();await c.query("+JSON.stringify(grants)+");await c.end();"],admin);
  const u='postgresql://hb_f_runtime:'+password+'@127.0.0.1:5432/'+database;
  const env={DATABASE_URL:u,DATABASE_URL_UNPOOLED:u,TEST_DATABASE_URL:u,HB_E2E_RUN_ID:nonce,HB_E2E_DATABASE:database,HB_E2E_PASSWORD:password,HB_F_CASE:name,
   AUTH_SECRET:randomBytes(24).toString('hex'),AUTH_GOOGLE_ID:'hb021-synthetic.apps.googleusercontent.com',AUTH_GOOGLE_SECRET:randomBytes(24).toString('hex'),ALLOWED_GOOGLE_EMAIL:'owner@example.test',AUTH_URL:'http://127.0.0.1:3000'};
  await h.node(['-e',"require('fs').rmSync('/work/test-results/f-results.json',{force:true})"]);
  let control:Promise<unknown>|undefined;
  if(name==='F-06'){await h.node(['-e',"require('fs').rmSync('/work/test-results/f-control',{recursive:true,force:true});require('fs').mkdirSync('/work/test-results/f-control',{recursive:true})"]);control=h.node(['--conditions=react-server','--import','tsx','tests/e2e/support/history-control.ts'],admin,120_000);void control.catch(()=>{});}
  try{await h.step(name+'-browser',()=>h.node(['node_modules/@playwright/test/cli.js','test','--config','playwright.history.config.ts','--grep',name+' '],env,240_000));}catch{failures++;}
  if(control){await h.node(['-e',"require('fs').writeFileSync('/work/test-results/f-control/cancel','cancel')"]);try{await h.step(name+'-append',()=>control!);}catch{failures++;}await h.copy('/work/test-results/f-control/append.json',join(dir,'append.json')).catch(()=>{failures++;});}
  // Synthetic H/K and retained batch anchors only; no URLs, passwords or cookies.
  await h.copy('/work/test-results/f-fixture.json',join(dir,'fixture.json')).catch(()=>{failures++;});
  await h.copy('/work/test-results/f-results.json',join(dir,'playwright.json')).catch(()=>{failures++;});
  try{const r=JSON.parse(await readFile(join(dir,'playwright.json'),'utf8'));stats[name]=r.stats;if(r.status!=='passed'||r.stats.expected!==1||r.stats.unexpected||r.stats.skipped||r.stats.flaky||r.tests.length!==1)failures++;}catch{stats[name]={notExecuted:true};failures++;}
  if(!/^hb_e2e_[a-f0-9]{32}$/.test(database)||database===new URL(h.verifier.TEST_DATABASE_URL).pathname.slice(1))throw Error('F_FOREIGN_DATABASE_REFUSED');
  await h.step(name+'-database-cleanup',()=>h.sql('DROP DATABASE '+database));record.removed=true;
 }
 return{stats,databases,failures};
}
