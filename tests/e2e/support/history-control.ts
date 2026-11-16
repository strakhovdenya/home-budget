import fs from 'node:fs';import {sql} from 'drizzle-orm';import {admitted,builder,calendar} from './history-fixture';
const directory='/work/test-results/f-control';
async function append(){const db=admitted();try{const fixture=JSON.parse(fs.readFileSync('/work/test-results/f-fixture.json','utf8')) as {scope:{ownerUserId:string;accountId:string}},end=Date.now()+110000;
 while(!fs.existsSync(directory+'/append')){if(fs.existsSync(directory+'/cancel')||Date.now()>end)throw Error('F_APPEND_CANCELLED');await new Promise(r=>setTimeout(r,10));}
 const b=builder(db,fixture.scope),before=await b.account();if(before.recordedSeq!==45n)throw Error('F_APPEND_CUT');const pid=(await db.db.execute<{pid:number}>(sql`SELECT pg_backend_pid() pid`)).rows[0].pid,d=await calendar(db),receipt=await b.redistribute(d.d4,d.p,d.q,true),after=await b.account();
 if(after.recordedSeq!==46n||after.aggregateRevision!==before.aggregateRevision+1n)throw Error('F_APPEND_RESULT');fs.writeFileSync(directory+'/append.json',JSON.stringify({separateBackendPid:pid,beforeCut:'45',afterCut:'46',receipt}));fs.writeFileSync(directory+'/appended','appended');console.log('F_OWNED_SYNTHETIC_APPEND_COMMITTED');
 }finally{await db.close();}}
append().catch(e=>{console.error(e instanceof Error&&/^F_[A-Z_]+$/.test(e.message)?e.message:'F_APPEND_FAILED');process.exitCode=1;});
