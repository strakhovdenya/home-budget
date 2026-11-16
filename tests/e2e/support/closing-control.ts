import fs from 'node:fs';import {sql} from 'drizzle-orm';import {admitted,builder,calendar} from './history-fixture';
async function late(){const db=admitted();try{const f=JSON.parse(fs.readFileSync('/work/test-results/g-fixture.json','utf8')),dir='/work/test-results/g-control',limit=Date.now()+110000;
 while(!fs.existsSync(dir+'/append')){if(fs.existsSync(dir+'/cancel')||Date.now()>limit)throw Error('G_APPEND_CANCELLED');await new Promise(r=>setTimeout(r,10));}
 const d=await calendar(db);if(d.today!==f.calendar.today)throw Error('G_CALENDAR_CHANGED');const b=builder(db,f.scope),before=await b.account(),pid=(await db.db.execute<{pid:number}>(sql`SELECT pg_backend_pid() pid`)).rows[0].pid;
 const receipt=await b.observe(d.h,'76000',{[d.m]:'56000',[d.p]:'20000'}),after=await b.account();
 if(after.recordedSeq!==before.recordedSeq+1n||after.activeAllocationRevisionId!==before.activeAllocationRevisionId)throw Error('G_LATE_CURRENT_HEAD_CHANGED');
 fs.writeFileSync(dir+'/append.json',JSON.stringify({pid,beforeCut:String(before.recordedSeq),afterCut:String(after.recordedSeq),receipt}));fs.writeFileSync(dir+'/appended','ready');console.log('G_LATE_FACT_COMMITTED');
 }finally{await db.close();}}
late().catch(()=>{console.error('G_LATE_FAILED');process.exitCode=1;});
