const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHandler}=require('../api/dig-sync');
const writer='a'.repeat(64),viewer='b'.repeat(64),snapshot={depth:12.5,seconds:90,status:'digging',name:'Momo',color:'#a9b4c6',equipped:[],tool:null};
test('actual SQL: ordered snapshots, read-only token, RLS and validation',async()=>{
 const {createDatabase}=require('./friends_database.cjs'),{db}=await createDatabase();
 try{
 await db.exec(fs.readFileSync(path.join(__dirname,'../database/dig_sync.sql'),'utf8'));
 await db.exec(fs.readFileSync(path.join(__dirname,'../database/dig_pairing.sql'),'utf8'));
 const handler=createHandler({env:{SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'server-key'},fetchImpl:async(url,opts)=>{
  let rows;const u=new URL(url);if(u.pathname.endsWith('/rpc/eumo_publish_dig')){const p=JSON.parse(opts.body);rows=(await db.query('select eumo_publish_dig($1,$2,$3,$4) as accepted',[p.p_writer,p.p_viewer,p.p_sequence,p.p_snapshot])).rows[0].accepted;}
  else rows=(await db.query('select eumo_read_dig($1) as result',[JSON.parse(opts.body).p_reader])).rows[0].result;
  return {ok:true,json:async()=>rows};
 }});
 async function request(body,secret=writer,extra={}){let out;const res={setHeader(){},end(s){out=JSON.parse(s);}};await handler({method:'POST',headers:{authorization:'Bearer '+secret,host:'site.test',...extra},body},res);return {status:res.statusCode,...out};}
 assert.equal((await request({action:'publish',sequence:2,viewerToken:viewer,snapshot})).accepted,true);
 assert.equal((await request({action:'publish',sequence:1,viewerToken:viewer,snapshot:{...snapshot,depth:1}})).accepted,false);
 let read=await request({action:'read'},viewer);assert.equal(read.snapshot.depth,12.5);assert.equal(read.sequence,2);
 assert.equal((await request({action:'read'},writer)).status,404);
 // A reader may create a distinct stream, but cannot alter the real stream.
 await request({action:'publish',sequence:100,viewerToken:'c'.repeat(64),snapshot:{...snapshot,depth:999}},viewer);
 assert.equal((await request({action:'read'},viewer)).snapshot.depth,12.5);
 assert.equal((await request({action:'publish',sequence:3,viewerToken:viewer,snapshot:{...snapshot,depth:-1}})).status,400);
 assert.equal((await request({action:'read'},'guess')).status,401);
 assert.equal((await request({action:'read'},viewer,{origin:'https://evil.test'})).status,403);
 assert.equal((await request({action:'publish',sequence:3,viewerToken:viewer,snapshot:{...snapshot,status:'paused'}})).accepted,true);
 assert.equal((await request({action:'read'},viewer)).snapshot.status,'paused');
 const v2={...snapshot,version:2,sessionElapsed:90,reportDays:{'2026-11-16':{seconds:90,completed:0}}};
 assert.equal((await request({action:'publish',sequence:4,viewerToken:viewer,snapshot:v2})).accepted,true);
 read=await request({action:'read'},viewer);assert.equal(read.snapshot.version,2);assert.equal(read.snapshot.sessionElapsed,90);assert.equal(read.snapshot.reportDays['2026-11-16'].seconds,90);
 assert.equal((await request({action:'publish',sequence:5,viewerToken:viewer,snapshot:{...v2,reportDays:{'2026-02-30':{seconds:1}}}})).status,400);
 const h={id:'study-1',at:1000000,startedAt:400000,seconds:600,depth:20,stars:2,mode:'study',outcome:'stopped',demo:false,finds:[1,0,0,0],golden:['moon-globe']};
 const v3={...v2,version:3,earned:{stars:2,sessions:0,finds:[1,0,0,0],golden:{'moon-globe':1}},records:[h]};
 assert.equal((await request({action:'publish',sequence:6,viewerToken:viewer,snapshot:v3})).accepted,true);
 read=await request({action:'read'},viewer);assert.deepEqual(read.snapshot.records,[h]);assert.equal(read.snapshot.earned.golden['moon-globe'],1);assert.match(read.deviceId,/^[a-f0-9]{64}$/);
 assert.equal((await request({action:'publish',sequence:7,viewerToken:viewer,snapshot:{...v3,earned:{...v3.earned,stars:99}}})).status,400);
 const countdown={...v3,sessionPlannedSeconds:1500,sessionRemaining:1410};
 assert.equal((await request({action:'publish',sequence:7,viewerToken:viewer,snapshot:countdown})).accepted,true);
 read=await request({action:'read'},viewer);
 assert.equal(read.snapshot.sessionPlannedSeconds,1500);assert.equal(read.snapshot.sessionRemaining,1410);
 assert.equal(read.snapshot.sessionElapsed,90);assert.equal(read.snapshot.seconds,90);assert.equal(read.snapshot.depth,12.5);
 assert.deepEqual(read.snapshot.earned,v3.earned);assert.deepEqual(read.snapshot.records,[h]);
 for(const patch of [{sessionRemaining:1501},{sessionRemaining:-1},{sessionPlannedSeconds:7201},{sessionPlannedSeconds:null}]){
  assert.equal((await request({action:'publish',sequence:8,viewerToken:viewer,snapshot:{...countdown,...patch}})).status,400);
 }
 assert.equal((await request({action:'publish',sequence:8,viewerToken:viewer,snapshot:{...v3,sessionRemaining:1410}})).status,400);
 assert.equal((await request({action:'publish',sequence:8,viewerToken:viewer,snapshot:{...v3,sessionPlannedSeconds:1500}})).status,400);
 // Older firmware can still publish, without inheriting stale countdown fields.
 assert.equal((await request({action:'publish',sequence:8,viewerToken:viewer,snapshot:v3})).accepted,true);
 read=await request({action:'read'},viewer);assert.equal(read.snapshot.sessionRemaining,undefined);assert.equal(read.snapshot.sessionPlannedSeconds,undefined);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from eumo_dig_streams'),/permission denied/);await assert.rejects(db.query("select eumo_publish_dig('a','b',1,'{}')"),/permission denied/);await db.exec('reset role');}
 }finally{await db.close();}
});
