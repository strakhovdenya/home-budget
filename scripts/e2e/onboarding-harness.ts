import { randomBytes } from 'node:crypto';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export const onboardingCases=['C-01','C-02','C-03','C-04','C-05','C-06','C-07','C-08','C-09a','C-09b'] as const;
type Environment=Record<string,string>;
type Harness={
  node:(args:string[],env?:Environment,timeout?:number)=>Promise<string>;
  sql:(statement:string)=>Promise<unknown>;
  copy:(source:string,destination:string)=>Promise<unknown>;
  step:(name:string,action:()=>Promise<unknown>)=>Promise<unknown>;
  verifier:Environment; output:string; caseFilter?:string;
  forbiddenPasswords:string[];
};
/** Host orchestrator owns provisioning/control. No privileged credential goes to Playwright/Next. */
export async function runOnboardingCases(h:Harness) {
  const selected=h.caseFilter?onboardingCases.filter(c=>c===h.caseFilter):onboardingCases;
  if(!selected.length)throw Error('C_UNKNOWN_CASE');
  const password=randomBytes(24).toString('hex');if(h.forbiddenPasswords.includes(password))throw Error('C_ROLE_PASSWORD_COLLISION');
  await h.sql("CREATE ROLE hb_c_runtime LOGIN PASSWORD '"+password+"';");
  const stats:Record<string,unknown>={},databases:{case:string;database:string;cleanup:string;removed:boolean}[]=[];let failures=0;
  for(const name of selected){
    const subId=randomBytes(16).toString('hex'),database='hb_e2e_'+subId,dir=join(h.output,name);await mkdir(dir,{recursive:true});
    // The name is generated here, never from a URL override or browser input.
    await h.sql('CREATE DATABASE '+database+';');
    databases.push({case:name,database,removed:false,cleanup:'Owned PostgreSQL tmpfs container finally is the fallback'});
    const urls=(role:string,secret:string)=>{
      const url='postgresql://'+role+':'+secret+'@127.0.0.1:5432/'+database;
      return {DATABASE_URL:url,DATABASE_URL_UNPOOLED:url,TEST_DATABASE_URL:url,HB_DATABASE_TARGET:'isolated-development',HB_TEST_DATABASE_TARGET:'disposable-local-container'};
    };
    const admin={...h.verifier};
    for(const key of ['DATABASE_URL','DATABASE_URL_UNPOOLED','TEST_DATABASE_URL']){const url=new URL(admin[key]);url.pathname='/'+database;admin[key]=url.toString();}
    const test={...urls('hb_c_runtime',password),HB_E2E_RUN_ID:subId,HB_E2E_DATABASE:database,HB_E2E_PASSWORD:password,HB_C_CASE:name,
      AUTH_SECRET:randomBytes(24).toString('hex'),AUTH_GOOGLE_ID:'hb021-synthetic.apps.googleusercontent.com',AUTH_GOOGLE_SECRET:randomBytes(24).toString('hex'),ALLOWED_GOOGLE_EMAIL:'owner@example.test',AUTH_URL:'http://127.0.0.1:3000'};
    await h.step(name+'-migrate',()=>h.node(['--conditions=react-server','--import','tsx','scripts/db-migrate.ts'],admin));
    if(name==='C-04')await h.step(name+'-established-base',()=>h.node(['--conditions=react-server','--import','tsx','tests/e2e/support/seed.ts'],admin));
    await h.step(name+'-seed',()=>h.node(['--conditions=react-server','--import','tsx','tests/e2e/support/onboarding-seed.ts'],{...admin,HB_E2E_RUN_ID:subId,HB_C_CASE:name}));
    const grants=`GRANT CONNECT ON DATABASE ${database} TO hb_c_runtime; GRANT USAGE ON SCHEMA public TO hb_c_runtime;
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO hb_c_runtime;
      GRANT INSERT ON accounts,budget_periods,budget_updates,historical_positions,ordering_revisions,balance_checkpoints,allocation_revisions,period_allocations,audit_events TO hb_c_runtime;
      GRANT UPDATE (aggregate_revision,recorded_seq,active_allocation_revision_id) ON accounts TO hb_c_runtime;
      GRANT UPDATE (theme) ON users TO hb_c_runtime;`;
    await h.node(['--input-type=module','-e',"import pg from 'pg';const c=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await c.connect();await c.query("+JSON.stringify(grants)+");await c.end();"],admin);
    if(name==='C-05')await h.node(['--input-type=module','-e',"import pg from 'pg';const c=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await c.connect();await c.query('REVOKE INSERT ON audit_events FROM hb_c_runtime');await c.end();"],admin);
    await h.node(['-e',"const f=require('fs');f.rmSync('/work/test-results/c-control',{recursive:true,force:true});f.mkdirSync('/work/test-results/c-control',{recursive:true});f.rmSync('/work/test-results/c-results.json',{force:true});"]);
    const controlled=name==='C-05'||name.startsWith('C-09');
    const control=controlled?h.node(['--import','tsx','tests/e2e/support/onboarding-control.ts'],{...admin,HB_E2E_RUN_ID:subId,HB_C_CASE:name},120_000).then(value=>({ok:true,value}),(error:unknown)=>{
      const failure=error as {stdout?:string;stderr?:string};
      return {ok:false,value:((failure.stdout??'')+'\n'+(failure.stderr??'')).match(/^C_[A-Z_]+$/m)?.[0]??'C_CONTROL_FAILED'};
    }):undefined;
    try {
      await h.step(name+'-browser',()=>h.node(['node_modules/@playwright/test/cli.js','test','--config','playwright.onboarding.config.ts','--grep',name+' '],test,180_000));
    }catch{failures++;}
    finally{
      await h.node(['-e',"require('fs').writeFileSync('/work/test-results/c-control/cancel','cancel')"]);
      if(control){const result=await control;stats[name+'-control']=result;if(!result.ok)failures++;}
      await h.copy('/work/test-results/c-results.json',join(dir,'playwright.json')).catch(()=>{failures++;});
      await h.copy('/work/test-results/c-control',join(dir,'control'));
      try{
        const result=JSON.parse(await readFile(join(dir,'playwright.json'),'utf8'));
        stats[name]=result.stats;
        if(result.status!=='passed'||result.stats.expected!==1||result.stats.unexpected!==0||result.stats.skipped!==0||result.stats.flaky!==0||
          result.tests.length!==1||result.tests[0].status!=='passed'||!result.tests[0].title.startsWith(name+' '))failures++;
      }catch{stats[name]={notExecuted:true};failures++;}
    }
  }
  // Release only databases generated and successfully created by this invocation.
  // All browser/control processes have exited and evidence is copied. Retaining
  // ten complete realms would consume A's fixed tmpfs during the full PG suite.
  const parent=new URL(h.verifier.TEST_DATABASE_URL).pathname.slice(1);
  for(const entry of databases){
    if(!/^hb_e2e_[a-f0-9]{32}$/.test(entry.database)||entry.database===parent)throw Error('C_OWN_DATABASE_CLEANUP_REFUSED');
    await h.step(entry.case+'-database-cleanup',()=>h.sql('DROP DATABASE '+entry.database+';'));
    entry.removed=true;entry.cleanup='Exact generated child database dropped after all browser/control exits and evidence copy';
  }
  return {stats,failures,databases};
}
