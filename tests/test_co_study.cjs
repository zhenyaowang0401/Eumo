'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash,randomBytes,randomUUID}=require('node:crypto');
const {createCoStudyDatabase}=require('./co_study_database.cjs');
const {createHandler}=require('../api/co-study.js');
let database,clock=Date.UTC(2026,10,25,14),index=0;
const digest=s=>createHash('sha256').update(s).digest('hex');
const nextCode=()=>{const n=++index;return 'ABCDEFGH'+String.fromCharCode(65+Math.floor(n/8))+String.fromCharCode(65+n%8);};
const write=(user,action,payload,at=clock)=>database.coStudy(user.hash,action,{requestId:randomUUID(),...payload},at);
const state=(user,id)=>database.coStudy(user.hash,'state',id?{roomId:id}:{},clock);
async function user(name){const token=randomBytes(32).toString('hex'),hash=digest(token),code=nextCode();const r=await database.rpc(hash,'connect',{friendCode:code,snapshot:{name,color:'#abcdef'}});assert(!r.error);return {token,hash,code,id:r.self.id};}
async function pair(mode='challenge'){
 const a=await user('Alice'),b=await user('Bob');const invite=await database.rpc(a.hash,'request',{code:b.code});await database.rpc(b.hash,'accept',{linkId:invite.outgoing[0].linkId});
 const made=await write(a,'create',{friendId:b.id,mode});assert(!made.error,JSON.stringify(made));const id=made.room.id;
 assert(!(await write(b,'accept',{roomId:id})).error);return {a,b,id};
}
async function start(p){await write(p.a,'ready',{roomId:p.id,ready:true,shareTask:false,task:'Private homework'});await write(p.b,'ready',{roomId:p.id,ready:true,shareTask:true,task:'Shared reading'});const r=await write(p.a,'start',{roomId:p.id});assert(!r.error,JSON.stringify(r));clock=Number(r.room.startsAt);return r.room;}
function member(room,u){return room.members.find(m=>m.id===u.id);}
async function event(p,u,action,extra={}){const s=await state(u,p.id);return write(u,action,{roomId:p.id,roundId:s.room.roundId,sourceSessionId:member(s.room,u).sourceSessionId,...(['pause','resume','finish'].includes(action)?{expectedControlVersion:member(s.room,u).controlVersion}:{}),...extra});}
async function completePair(p){for(let n=0;n<60;n++){clock+=20000;for(const u of [p.a,p.b]){const r=await event(p,u,'heartbeat');assert(!r.error,JSON.stringify(r));}}}
test.before(async()=>database=await createCoStudyDatabase());test.after(async()=>database.db.close());
test('real SQL: friend consent, private tasks, authorization and immutable ready/start parameters',async()=>{
 const p=await pair();const c=await user('Outsider');assert.equal((await state(c,p.id)).error,'ROOM_NOT_FOUND');
 assert.equal((await write(c,'create',{friendId:p.a.id})).error,'NOT_FRIENDS');assert.equal((await write(p.b,'start',{roomId:p.id})).error,'FORBIDDEN');
 assert.equal((await write(p.a,'start',{roomId:p.id})).error,'NOT_READY');
 const ra=await write(p.a,'ready',{roomId:p.id,ready:true,shareTask:false,task:'Private homework'});
 assert.equal(member((await state(p.b,p.id)).room,p.a).task,'');assert.equal(member(ra.room,p.a).task,'Private homework');
 await write(p.b,'ready',{roomId:p.id,ready:true,shareTask:true,task:'Reading'});
 assert.equal((await write(p.a,'start',{roomId:p.id,expectedVersion:ra.room.version})).error,'STALE_VERSION');
 const settings=await write(p.a,'settings',{roomId:p.id,mode:'together'});assert(settings.room.members.every(m=>!m.ready));
 const r=await start(p);assert.equal(r.plannedSeconds,1200);assert.equal(r.maxRounds,2);assert.equal(r.roundIndex,1);assert(member(r,p.a).sourceSessionId);assert.equal(member(r,p.b).sourceSessionId,null);
 assert.equal((await write(p.a,'settings',{roomId:p.id,mode:'challenge'})).error,'INVALID_STATE');
 assert.equal((await write(p.a,'ready',{roomId:p.id,ready:true,shareTask:false})).error,'INVALID_STATE');
 await event(p,p.a,'finish',{outcome:'stopped'});await event(p,p.b,'finish',{outcome:'stopped'});await write(p.a,'leave',{roomId:p.id});
});
test('real SQL: request replay/concurrent starts create one round; reusing request IDs with other payloads fails',async()=>{
 const p=await pair();await write(p.a,'ready',{roomId:p.id,ready:true,shareTask:false});await write(p.b,'ready',{roomId:p.id,ready:true,shareTask:false});
 const req={requestId:randomUUID(),roomId:p.id};const [a,b]=await Promise.all([database.coStudy(p.a.hash,'start',req,clock),database.coStudy(p.a.hash,'start',req,clock)]);
 assert.equal(a.room.roundId,b.room.roundId);assert.equal(b.notice,'ALREADY_APPLIED');assert.equal(b.room.roundIndex,1);
 assert.equal((await database.coStudy(p.a.hash,'leave',req,clock)).error,'REQUEST_REUSED');
 clock=Number(a.room.startsAt)+1000;assert.equal((await event(p,p.a,'heartbeat',{sourceSessionId:randomUUID()})).error,'SESSION_MISMATCH');
 assert.equal((await event(p,p.a,'pause',{roundId:randomUUID()})).error,'STALE_ROUND');
 await write(p.a,'leave',{roomId:p.id});assert.equal((await event(p,p.b,'heartbeat')).room.status,'active');await event(p,p.b,'finish',{outcome:'stopped'});assert.equal((await state(p.b,p.id)).room.status,'finished');
});
test('real SQL: independent pauses and early endings preserve partner and yield zero challenge credit',async()=>{
 const p=await pair();await start(p);clock+=30000;await event(p,p.a,'pause');await event(p,p.b,'heartbeat');clock+=20000;await event(p,p.b,'heartbeat');
 let s=await state(p.a,p.id);assert.equal(member(s.room,p.a).elapsedSeconds,30);assert.equal(member(s.room,p.b).elapsedSeconds,50);assert.equal(member(s.room,p.a).status,'paused');
 await event(p,p.a,'resume');clock+=10000;await event(p,p.a,'finish',{outcome:'stopped'});
 const review=await write(p.a,'review',{roomId:p.id,roundId:s.room.roundId,outcome:'complete',note:'Finished early'});assert.equal(member(review.room,p.a).points,0);assert.equal(member(review.room,p.a).status,'stopped');assert.equal(member(review.room,p.b).status,'studying');
 assert.equal((await event(p,p.a,'resume')).error,'INVALID_STATE');await write(p.b,'leave',{roomId:p.id});assert.equal((await state(p.a,p.id)).room.status,'finished');
});
test('real SQL: qualifying partial reviews award once, normal rewards untouched, two rounds max, history retained',async()=>{
 const p=await pair();await start(p);await completePair(p);let s=await state(p.a,p.id);assert(s.room.members.every(m=>m.status==='review_pending'&&m.elapsedSeconds===1200));
 const req={requestId:randomUUID(),roomId:p.id,roundId:s.room.roundId,outcome:'partial',note:'Read half'};
 const first=await database.coStudy(p.a.hash,'review',req,clock);assert.equal(member(first.room,p.a).points,1);assert.equal(first.room.status,'active');
 const replay=await database.coStudy(p.a.hash,'review',req,clock);assert.equal(member(replay.room,p.a).points,1);
 const edit=await write(p.a,'review',{...req,requestId:randomUUID(),note:'Updated'});assert.equal(member(edit.room,p.a).points,1);
 await write(p.b,'review',{roomId:p.id,roundId:s.room.roundId,outcome:'adjusted'});s=await state(p.a,p.id);assert.equal(s.room.status,'between_rounds');assert.equal(s.room.history.length,1);
 const firstSource=member(s.room,p.a).sourceSessionId;
 await write(p.a,'review',{roomId:p.id,roundId:s.room.roundId,outcome:'partial',note:'Retained after next round'});
 const ownHistory=(await state(p.a,p.id)).room.history[0].members.find(m=>m.id===p.a.id),otherHistory=(await state(p.b,p.id)).room.history[0].members.find(m=>m.id===p.a.id);
 assert.equal(ownHistory.review.note,'Retained after next round');assert.equal(ownHistory.sourceSessionId,firstSource);assert.equal(otherHistory.review,null);assert.equal(otherHistory.sourceSessionId,null);assert.equal(otherHistory.task,'');
 await start(p);await completePair(p);s=await state(p.a,p.id);for(const u of [p.a,p.b])await write(u,'review',{roomId:p.id,roundId:s.room.roundId,outcome:'complete'});
 s=await state(p.a,p.id);assert.equal(s.room.status,'finished');assert.equal(s.room.history.length,2);assert(s.room.members.every(m=>m.points===2));assert.equal((await write(p.a,'start',{roomId:p.id})).error,'INVALID_STATE');
 assert.equal(s.room.history[0].members.find(m=>m.id===p.a.id).sourceSessionId,firstSource);assert.equal(s.room.history[0].members.find(m=>m.id===p.a.id).review.note,'Retained after next round');
 assert.equal((await database.rpc(p.a.hash,'state')).self.id,p.a.id);
});
test('real SQL: disconnected intervals never mint points; pending verification does not block next round',async()=>{
 const p=await pair();await start(p);clock+=30000;await event(p,p.a,'heartbeat');clock+=1200000;
 let r=await event(p,p.a,'finish',{outcome:'complete'});assert.equal(member(r.room,p.a).elapsedSeconds,30);assert.equal(member(r.room,p.a).verification,'pending_verification');
 r=await write(p.a,'review',{roomId:p.id,roundId:r.room.roundId,outcome:'partial'});assert.equal(member(r.room,p.a).points,0);assert.equal(member(r.room,p.a).status,'completed');
 await event(p,p.b,'finish',{outcome:'stopped'});r=await state(p.a,p.id);assert.equal(r.room.status,'between_rounds');assert.equal((await start(p)).roundIndex,2);await write(p.a,'leave',{roomId:p.id});await write(p.b,'leave',{roomId:p.id});
});
test('real SQL: delayed control events cannot override a newer independent pause',async()=>{
 const p=await pair();await start(p);clock+=10000;
 await event(p,p.a,'pause');let s=await state(p.a,p.id);
 const delayed={requestId:randomUUID(),roomId:p.id,roundId:s.room.roundId,sourceSessionId:member(s.room,p.a).sourceSessionId,expectedControlVersion:member(s.room,p.a).controlVersion};
 await event(p,p.a,'resume');clock+=10000;await event(p,p.b,'heartbeat');await event(p,p.a,'pause');
 assert.equal((await database.coStudy(p.a.hash,'resume',delayed,clock)).error,'STALE_CONTROL');
 s=await state(p.a,p.id);assert.equal(member(s.room,p.a).status,'paused');assert.equal(member(s.room,p.a).elapsedSeconds,20);assert.equal(member(s.room,p.b).status,'studying');
 await write(p.a,'leave',{roomId:p.id});await write(p.b,'leave',{roomId:p.id});
});
test('real SQL: short offline pause/resume gaps cannot be credited on reconnect',async()=>{
 const p=await pair();await start(p);clock+=10000;await event(p,p.a,'heartbeat');
 // The local timer paused and resumed while both control requests failed.
 // Twenty elapsed server seconds fit inside the ordinary 45-second window.
 clock+=20000;let r=await event(p,p.a,'heartbeat',{uncertainInterval:true});
 assert.equal(member(r.room,p.a).elapsedSeconds,10);assert.equal(member(r.room,p.a).verification,'pending_verification');
 clock+=10000;r=await event(p,p.a,'heartbeat',{uncertainInterval:false});
 assert.equal(member(r.room,p.a).elapsedSeconds,20);assert.equal(member(r.room,p.a).verification,'pending_verification');
 r=await event(p,p.a,'finish',{outcome:'complete'});r=await write(p.a,'review',{roomId:p.id,roundId:r.room.roundId,outcome:'complete'});
 assert.equal(member(r.room,p.a).points,0);await write(p.b,'leave',{roomId:p.id});
});
test('real SQL: simultaneous incoming accepts reserve only one active room and invitation spam is bounded',async()=>{
 const p=await pair();await write(p.a,'leave',{roomId:p.id});const c=await user('Carol');
 const relation=await database.rpc(c.hash,'request',{code:p.b.code});await database.rpc(p.b.hash,'accept',{linkId:relation.outgoing[0].linkId});
 const r1=await write(p.a,'create',{friendId:p.b.id}),r2=await write(c,'create',{friendId:p.b.id});
 const accepted=await Promise.all([write(p.b,'accept',{roomId:r1.room.id}),write(p.b,'accept',{roomId:r2.room.id})]);
 assert.equal(accepted.filter(r=>!r.error).length,1);assert.equal(accepted.find(r=>r.error).error,'MEMBER_BUSY');
 await write(p.a,'leave',{roomId:r1.room.id});await write(c,'leave',{roomId:r2.room.id});
 for(let n=0;n<3;n++){const r=await write(p.a,'create',{friendId:p.b.id});assert(!r.error);await write(p.a,'cancel',{roomId:r.room.id});}
 assert.equal((await write(p.a,'create',{friendId:p.b.id})).error,'REQUEST_LIMITED');
});
test('real SQL: ordinary together mode keeps full study history without challenge awards',async()=>{
 const p=await pair('together');await start(p);await completePair(p);const s=await state(p.a,p.id);
 for(const u of [p.a,p.b])await write(u,'review',{roomId:p.id,roundId:s.room.roundId,outcome:'complete'});
 const r=(await state(p.a,p.id)).room;assert.equal(r.history.length,1);assert(r.members.every(m=>m.points===0&&m.elapsedSeconds===1200));
 await write(p.a,'leave',{roomId:p.id});
});
test('real SQL: busy identities, invitations expire, revoked friends and direct browser DB access',async()=>{
 const p=await pair();const second=await write(p.a,'create',{friendId:p.b.id});assert.equal(second.error,'MEMBER_BUSY');await write(p.a,'leave',{roomId:p.id});
 let r=await write(p.a,'create',{friendId:p.b.id});clock+=300001;assert.equal((await write(p.b,'accept',{roomId:r.room.id})).error,'INVITE_EXPIRED');
 r=await write(p.a,'create',{friendId:p.b.id});await write(p.b,'decline',{roomId:r.room.id});assert.equal((await state(p.a,r.room.id)).room.status,'cancelled');
 r=await write(p.a,'create',{friendId:p.b.id});const f=await database.rpc(p.a.hash,'state');await database.rpc(p.a.hash,'remove',{linkId:f.friends.find(x=>x.id===p.b.id).linkId});assert.equal((await write(p.b,'accept',{roomId:r.room.id})).error,'NOT_FRIENDS');assert.equal((await state(p.b)).rooms.length,0);assert.equal((await state(p.b,r.room.id)).error,'NOT_FRIENDS');
 for(const role of ['anon','authenticated']){await database.db.exec('set role '+role);try{await assert.rejects(database.db.query('select * from public.eumo_study_rooms'),/permission denied/);await assert.rejects(database.db.query('select public.eumo_co_study_action($1,$2)',[p.a.hash,'state']),/permission denied/);}finally{await database.db.exec('reset role');}}
});
const config={SUPABASE_URL:'https://co-study.example',SUPABASE_SERVICE_ROLE_KEY:'test-private-key'};
let ip=0;
async function api(h,body,token='',extra={},method='POST'){
 const req={method,body,headers:{host:'eumo.test',origin:'https://eumo.test','content-type':'application/json','x-forwarded-for':'192.0.2.'+(++ip),cookie:token?'eumo_friend_session='+token:'',...extra}};
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(x){this.body=JSON.parse(x);}};await h(req,res);return res;
}
test('API: authenticated identity and server time only, modern keys, actual SQL result and safe errors',async()=>{
 const p=await pair();let captured;const h=createHandler({env:{...config,SUPABASE_SERVICE_ROLE_KEY:'sb_secret_fixture_only'},now:()=>clock,fetchImpl:async(url,options)=>{assert.equal(options.headers.Authorization,undefined);captured=JSON.parse(options.body);return {ok:true,json:()=>database.coStudy(captured.p_token_hash,captured.p_action,captured.p_payload,Date.parse(captured.p_now))};}});
 const r=await api(h,{action:'state',roomId:p.id,actorId:p.b.id,now:999999999,elapsedSeconds:1200,points:2},p.a.token);assert.equal(r.statusCode,200);assert.equal(r.body.self.id,p.a.id);assert.equal(captured.p_token_hash,p.a.hash);assert.equal(Date.parse(captured.p_now),clock);assert.equal(captured.p_payload.points,undefined);assert.equal(captured.p_payload.actorId,undefined);
 const text=JSON.stringify(r.body);assert(!text.includes(p.a.hash));assert(!text.includes(p.a.token));assert(!text.includes('sb_secret_'));
 const active=await start(p);clock+=10000;const uncertain=await api(h,{action:'heartbeat',requestId:randomUUID(),roomId:p.id,roundId:active.roundId,sourceSessionId:member(active,p.a).sourceSessionId,uncertainInterval:true},p.a.token);
 assert.equal(uncertain.statusCode,200);assert.equal(captured.p_payload.uncertainInterval,true);assert.equal(member(uncertain.body.room,p.a).elapsedSeconds,0);assert.equal(member(uncertain.body.room,p.a).verification,'pending_verification');
 assert.equal((await api(h,{action:'state'})).statusCode,401);assert.equal((await api(h,{action:'state'},'a'.repeat(64))).statusCode,401);
});
test('API: methods, origins, bounded bodies and malformed or forged action fields',async()=>{
 const noCall=()=>assert.fail('must not call remote');const h=createHandler({env:config,fetchImpl:noCall});const token='a'.repeat(64);
 assert.equal((await api(h,{},token,{},'GET')).statusCode,405);assert.equal((await api(h,{},token,{origin:'https://bad.test'})).statusCode,403);assert.equal((await api(h,{},token,{'content-type':'text/plain'})).statusCode,415);
 for(const body of [null,{},'invalid',{action:'create',requestId:randomUUID(),friendId:'wrong'},{action:'start',roomId:randomUUID()},{action:'ready',requestId:randomUUID(),roomId:randomUUID(),ready:'yes',shareTask:false},{action:'review',requestId:randomUUID(),roomId:randomUUID(),roundId:randomUUID(),outcome:'anything'},{action:'state',padding:'a'.repeat(5000)}])assert.equal((await api(h,body,token)).statusCode,400);
 assert.equal((await api(createHandler({env:{},fetchImpl:noCall}),{action:'state'},token)).body.error,'CO_STUDY_NOT_CONFIGURED');
 const bad=createHandler({env:config,fetchImpl:async()=>({ok:false,status:500})});assert.equal((await api(bad,{action:'state'},token)).body.error,'CO_STUDY_UNAVAILABLE');
 const timeout=createHandler({env:config,timeoutMs:5,fetchImpl:async(u,{signal})=>new Promise((a,b)=>signal.addEventListener('abort',()=>b(Error('secret'))))});assert.equal((await api(timeout,{action:'state'},token)).body.error,'CO_STUDY_UNAVAILABLE');
});
test('migration: reapplying additive schema preserves rooms and unique awards',async()=>{
 const before=(await database.db.query('select (select count(*) from public.eumo_study_rooms) rooms,(select count(*) from public.eumo_study_awards) awards')).rows[0];
 await database.db.exec(require('node:fs').readFileSync(require('node:path').join(__dirname,'../database/co_study.sql'),'utf8'));
 const after=(await database.db.query('select (select count(*) from public.eumo_study_rooms) rooms,(select count(*) from public.eumo_study_awards) awards')).rows[0];assert.deepEqual(after,before);
});
