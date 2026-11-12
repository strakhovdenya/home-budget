import { it, expect } from 'vitest';
import { mkdtempSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadMigrations, target, catalogHash, type Catalog } from '../scripts/production-init/core';
import { validateUrl, requireApproval, verifyNeon, runOperator } from '../scripts/production-init/operator';
const url=`postgresql://${target.owner}:synthetic-only@${target.host}/${target.database}?sslmode=verify-full`;
it('accepts only exact direct production endpoint and enforces certificate verification outside URL options',()=>{
  expect(new URL(validateUrl(url).connectionString).search).toBe('');
});
it.each([
  undefined,'invalid',url.replace('postgresql:','postgres:'),url.replace(target.host,'localhost'),
  url.replace(target.host,target.host.replace('.c-8','-pooler.c-8')),url.replace('/neondb','/other'),
  url.replace(target.owner,'runtime'),url+'&host=evil',url+'&options=evil',url.replace('verify-full','disable'),url+'#fragment',
])('refuses malformed, redirected, pooled or non-TLS operator target (%#)',value=>{
  expect(()=>validateUrl(value)).toThrow(/REQUIRED/);
});
it('requires explicit target-bound GO and exact separately reviewed current commit',()=>{
  const head='a'.repeat(40);
  expect(()=>requireApproval({},head)).toThrow('REVIEWED_COMMIT_REQUIRED');
  const env={HB_PRODUCTION_INIT_REVIEWED_COMMIT:head};
  expect(()=>requireApproval(env,head)).toThrow('EXPLICIT_PRODUCTION_GO_REQUIRED');
  expect(()=>requireApproval({...env,HB_PRODUCTION_INIT_GO:`INITIALIZE:${target.project}:${target.branch}:${target.database}:${head}`},head)).not.toThrow();
  expect(()=>requireApproval(env,'b'.repeat(40))).toThrow('REVIEWED_COMMIT_REQUIRED');
});
it('operator refuses missing mode before any provider or SQL request',async()=>{
  await expect(runOperator({},[])).rejects.toThrow('MODE_REQUIRED');
});
it('loads exact six reviewed hashes, retaining PL/pgSQL semicolons and original journal timestamps',()=>{
  const migrations=loadMigrations(process.cwd());expect(migrations).toHaveLength(6);
  expect(migrations[3].statements.some(s=>s.includes('CREATE FUNCTION hb_obligation_integrity') && (s.match(/;/g)?.length??0)>5)).toBe(true);
  expect(migrations.map(m=>m.hash)).toEqual(target.migrations.map(m=>m.sha256));
});
it.each(['sql','journal','extra'])('rejects changed %s source before opening any DB',kind=>{
  const root=mkdtempSync(join(tmpdir(),'hb-init-source-'));cpSync('drizzle',join(root,'drizzle'),{recursive:true});
  const file=join(root,'drizzle',kind==='journal'?'meta/_journal.json':kind==='extra'?'9999_unreviewed.sql':'0000_foundation.sql');
  writeFileSync(file,kind==='journal'?readFileSync(file,'utf8').replace('0000_foundation','0000_other'):'SELECT 1;');
  expect(()=>loadMigrations(root)).toThrow(/MISMATCH/);
});
it('expected schema fingerprint describes all actual original tables, constraints, triggers and functions',()=>{
  const schema=JSON.parse(readFileSync('scripts/production-init/schema.json','utf8'));
  expect(catalogHash(schema.catalog as Catalog)).toBe(schema.sha256);
  expect(new Set(schema.catalog.columns.map((r:{table_name:string})=>r.table_name)).size).toBe(20);
  expect(schema.catalog.constraints).toHaveLength(374);expect(schema.catalog.triggers).toHaveLength(46);
});
it.each(['valid','project','branch','endpoint','database'])('provider identity mismatch (%s) refuses exact target',async(kind)=>{
  const objects:Record<string,unknown>={
    '':{project:{id:target.project,region_id:target.region,pg_version:18,proxy_host:target.host.slice(target.endpoint.length+1)}},
    ['/branches/'+target.branch]:{branch:{id:target.branch,project_id:target.project,name:'production',primary:true,default:true,current_state:'ready'}},
    ['/endpoints/'+target.endpoint]:{endpoint:{id:target.endpoint,project_id:target.project,branch_id:target.branch,host:target.host,type:'read_write',disabled:false}},
    ['/branches/'+target.branch+'/databases']:{databases:[{name:target.database,owner_name:target.owner}]},
  };
  const paths={project:'',branch:'/branches/'+target.branch,endpoint:'/endpoints/'+target.endpoint,database:'/branches/'+target.branch+'/databases'};
  if(kind!=='valid')objects[paths[kind as keyof typeof paths]]={};
  const get=(async (input: string|URL|Request)=>new Response(JSON.stringify(objects[String(input).split(target.project)[1]]),{status:200})) as typeof fetch;
  if(kind==='valid')await expect(verifyNeon('synthetic-test-key',get)).resolves.toBeUndefined();
  else await expect(verifyNeon('synthetic-test-key',get)).rejects.toThrow(/MISMATCH/);
});

it('Neon channel_binding=require becomes mandatory driver policy while URL sslmode cannot override TLS',()=>{
  const config=validateUrl(url+'&channel_binding=require');
  expect(config.requireChannelBinding).toBe(true);expect(new URL(config.connectionString).search).toBe('');
  expect(validateUrl(url).requireChannelBinding).toBe(false);
});
it.each(['prefer','disable','', 'require&channel_binding=require','require&host=evil'])('rejects weak, repeated or redirected channel binding policy (%s)',policy=>{
  expect(()=>validateUrl(url+'&channel_binding='+policy)).toThrow('EXACT_DIRECT_TLS_TARGET_REQUIRED');
});
it('rejects repeated SSL mode even if one value is valid',()=>{
  expect(()=>validateUrl(url+'&sslmode=disable&channel_binding=require')).toThrow('EXACT_DIRECT_TLS_TARGET_REQUIRED');
});
