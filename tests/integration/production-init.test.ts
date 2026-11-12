import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import pg from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import {identityRepository} from '@/infrastructure/auth/repository';
import {beforeAll,afterAll,it,expect} from 'vitest';
import {requireLocalDatabaseTargets} from '@/infrastructure/db/local-target';
import {initialize,loadMigrations,readCatalog,catalogHash,verify,type Connection} from '../../scripts/production-init/core';
const migrations=loadMigrations(process.cwd());
const expected=JSON.parse(readFileSync('scripts/production-init/schema.json','utf8'));
let admin:pg.Client,base:URL;
const clients:pg.Client[]=[];
const pools:pg.Pool[]=[];
beforeAll(async()=>{
  if(process.env.HB_TEST_DATABASE_TARGET!=='disposable-local-container')throw Error('DISPOSABLE_LOCAL_REQUIRED');
  const targets=requireLocalDatabaseTargets(process.env);base=new URL(targets.TEST_DATABASE_URL);
  admin=new pg.Client({connectionString:base.toString()});await admin.connect();
});
afterAll(async()=>{for(const c of clients)await c.end();for(const p of pools)await p.end();await admin.end();});
async function fresh(){
  const name='hb_init_'+randomUUID().replaceAll('-','');
  await admin.query('CREATE DATABASE "'+name+'"');
  const u=new URL(base);u.pathname='/'+name;const db=new pg.Client({connectionString:u.toString()});await db.connect();clients.push(db);
  const options={migrations,expectedHash:expected.sha256,database:name,owner:decodeURIComponent(base.username),requireTls:false};
  return {db,options,u};
}
async function empty(db:Connection){
  expect((await db.query("SELECT to_regnamespace('drizzle') IS NULL AS absent")).rows[0].absent).toBe(true);
  expect((await db.query("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public'")).rows[0].count).toBe(0);
}
it('real original six-file initialization is atomic, full catalog matches and application remains empty',async()=>{
  const {db,options}=await fresh();expect(await initialize(db,options)).toEqual({status:'COMMITTED',migrations:6,applicationRows:0});
  await db.query('BEGIN READ ONLY');await db.query('SET LOCAL search_path=public,pg_catalog');
  expect(catalogHash(await readCatalog(db))).toBe(expected.sha256);await verify(db,migrations,expected.sha256);await db.query('ROLLBACK');
  await expect(initialize(db,options)).rejects.toThrow('TARGET_NOT_EMPTY');
});
it.each(['identity','tls','catalog'])('refuses %s without leaving schema or journal',async(kind)=>{
  const {db,options}=await fresh();
  const altered={...options,...(kind==='identity'?{database:'wrong'}:kind==='tls'?{requireTls:true}:{expectedHash:'0'.repeat(64)})};
  await expect(initialize(db,altered)).rejects.toThrow();await empty(db);
});
it.each(['table','function','type','schema'])('does not repair or overwrite unknown existing %s',async(kind)=>{
  const {db,options}=await fresh();
  await db.query({table:'CREATE TABLE public.unknown_state(id integer)',function:'CREATE FUNCTION public.unknown_state() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$',type:"CREATE TYPE public.unknown_state AS ENUM ('retained')",schema:'CREATE SCHEMA unknown_state'}[kind as 'table']);
  await expect(initialize(db,options)).rejects.toThrow('TARGET_NOT_EMPTY');
  expect((await db.query("SELECT to_regnamespace('drizzle') IS NULL AS absent")).rows[0].absent).toBe(true);
});
it('statement failure after initial DDL rolls back all journal/schema and never exposes driver details',async()=>{
  const {db,options}=await fresh();
  const wrapped:Connection={query:async(sql,values)=>{
    if(sql.startsWith('INSERT INTO drizzle.__drizzle_migrations'))throw Error('synthetic-sensitive-driver-detail');
    return db.query(sql,values);
  }};
  await expect(initialize(wrapped,options)).rejects.toThrow('INITIALIZATION_ROLLED_BACK');await empty(db);
});
it('lost COMMIT acknowledgement remains UNKNOWN; read-only evidence resolves committed state',async()=>{
  const {db,options}=await fresh();let rollbacks=0;
  const wrapped:Connection={query:async(sql,values)=>{
    if(sql==='ROLLBACK')rollbacks++;
    const result=await db.query(sql,values);if(sql==='COMMIT')throw Error('synthetic connection loss');return result;
  }};
  await expect(initialize(wrapped,options)).rejects.toThrow('COMMIT_OUTCOME_UNKNOWN_READ_ONLY_INSPECTION_REQUIRED');expect(rollbacks).toBe(0);
  await db.query('BEGIN READ ONLY');await db.query('SET LOCAL search_path=public,pg_catalog');await verify(db,migrations,expected.sha256);await db.query('ROLLBACK');
});
it('two initializer connections cannot race schema admission',async()=>{
  const {db,options,u}=await fresh();const second=new pg.Client({connectionString:u.toString()});await second.connect();clients.push(second);
  let entered!:()=>void,release!:()=>void;
  const ready=new Promise<void>(r=>entered=r),barrier=new Promise<void>(r=>release=r);
  const wrapped:Connection={query:async(sql,values)=>{
    if(sql==='CREATE SCHEMA drizzle'){entered();await barrier;}return db.query(sql,values);
  }};
  const first=initialize(wrapped,options);await ready;
  try{await expect(initialize(second,options)).rejects.toThrow('INITIALIZER_BUSY');}finally{release();}
  expect((await first).status).toBe('COMMITTED');
});
it('read-only verify refuses changed journal and disabled immutable trigger',async()=>{
  const {db,options}=await fresh();await initialize(db,options);
  await db.query('BEGIN');await db.query('SET LOCAL search_path=public,pg_catalog');
  await db.query("UPDATE drizzle.__drizzle_migrations SET hash='changed' WHERE id=1");
  await expect(verify(db,migrations,expected.sha256)).rejects.toThrow('APPLIED_JOURNAL_MISMATCH');await db.query('ROLLBACK');
  await db.query('ALTER TABLE audit_events DISABLE TRIGGER USER');
  await expect(verify(db,migrations,expected.sha256)).rejects.toThrow('SCHEMA_MISMATCH');
});

it('read-only verify refuses even a single synthetic identity row',async()=>{
  const {db,options}=await fresh();await initialize(db,options);
  await db.query("INSERT INTO users(id) VALUES($1)",[randomUUID()]);
  await expect(verify(db,migrations,expected.sha256)).rejects.toThrow('UNEXPECTED_APPLICATION_ROWS');
});
it('a scoped non-owner runtime role supports real auth and required locks without admin, DDL or delete rights',async()=>{
  const {db,options,u}=await fresh();await initialize(db,options);
  const role='hb_rt_'+randomUUID().replaceAll('-','');
  await admin.query('CREATE ROLE "'+role+'" LOGIN PASSWORD \'synthetic-runtime-only\' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS');
  await db.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
  await db.query('GRANT CONNECT ON DATABASE "'+options.database+'" TO "'+role+'"');
  await db.query('GRANT USAGE ON SCHEMA public TO "'+role+'"');
  const tables=(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
  for(const {tablename} of tables)await db.query('GRANT SELECT,INSERT ON TABLE public."'+tablename+'" TO "'+role+'"');
  await db.query('GRANT UPDATE ON TABLE public.users,public.accounts,public.report_heads,public.transfer_proposals TO "'+role+'"');
  const rtUrl=new URL(u);rtUrl.username=role;rtUrl.password='synthetic-runtime-only';
  const runtime=new pg.Client({connectionString:rtUrl.toString()});await runtime.connect();clients.push(runtime);
  const pool=new pg.Pool({connectionString:rtUrl.toString()});pools.push(pool);
  const repository=identityRepository({db:drizzle(pool),close:()=>pool.end()});
  const id=await repository.bind('synthetic-release-subject');expect(id).toMatch(/^[a-f0-9-]{36}$/);
  expect(await repository.matches(id!,'synthetic-release-subject')).toBe(true);
  expect(await repository.bind('different-synthetic-subject')).toBeNull();
  await runtime.query('BEGIN');
  await runtime.query('SELECT id FROM users FOR UPDATE');await runtime.query('SELECT id FROM accounts FOR UPDATE');
  await runtime.query('SELECT id FROM transfer_proposals FOR UPDATE');await runtime.query('ROLLBACK');
  for(const sql of ['CREATE TABLE public.unwanted(id int)','ALTER TABLE public.users ADD COLUMN unwanted int','TRUNCATE public.users','DELETE FROM public.users','SELECT * FROM drizzle.__drizzle_migrations']) {
    await expect(runtime.query(sql)).rejects.toMatchObject({code:'42501'});
  }
});

it('rollback acknowledgement failure is never reported as confirmed rollback',async()=>{
  const {db,options}=await fresh();
  const wrapped:Connection={query:async(sql,values)=>{
    if(sql==='ROLLBACK'){await db.query(sql);throw Error('synthetic lost rollback ack');}
    return db.query(sql,values);
  }};
  await expect(initialize(wrapped,{...options,database:'wrong'})).rejects.toThrow('ROLLBACK_UNCONFIRMED_READ_ONLY_INSPECTION_REQUIRED');
  await empty(db);
});
