'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash,randomBytes,randomUUID}=require('node:crypto');
const {createCoStudyDatabase}=require('./co_study_database.cjs');
const {requestRest,friendLinkRest}=require('./co_study_signal_transport.cjs');
const {createHandler}=require('../api/co-study.js');
let database,clock=Date.UTC(2026,10,26,12),sequence=0,ip=0;
const config={SUPABASE_URL:'https://signals.example',SUPABASE_SERVICE_ROLE_KEY:'sb_secret_fixture_only'};
const hash=value=>createHash('sha256').update(value).digest('hex');
async function user(name){
 const token=randomBytes(32).toString('hex'),n=++sequence,code='ABCDEFGH'+String.fromCharCode(65+Math.floor(n/8))+String.fromCharCode(65+n%8);
 const value=await database.rpc(hash(token),'connect',{friendCode:code,snapshot:{name,color:'#abcdef'}});
 assert(!value.error,JSON.stringify(value));return {token,hash:hash(token),code,id:value.self.id};
}
const write=(u,action,payload)=>database.coStudy(u.hash,action,{requestId:randomUUID(),...payload},clock);
async function pair(join=true){
 const a=await user('Alice'),b=await user('Bob');const f=await database.rpc(a.hash,'request',{code:b.code});
 await database.rpc(b.hash,'accept',{linkId:f.outgoing[0].linkId});
 const r=await write(a,'create',{friendId:b.id,mode:'together'});assert(!r.error);
 const p={a,b,id:r.room.id};if(join)assert(!(await write(b,'accept',{roomId:p.id})).error);return p;
}
async function transport(raw,options={}){
 const url=new URL(raw),method=options.method||'GET',body=options.body?JSON.parse(options.body):{};
 assert.equal(url.origin,config.SUPABASE_URL);assert.equal(options.headers.apikey,config.SUPABASE_SERVICE_ROLE_KEY);assert.equal(options.headers.Authorization,undefined);
 let value;
 if(url.pathname==='/rest/v1/rpc/eumo_co_study_action')value=await database.coStudy(body.p_token_hash,body.p_action,body.p_payload,Date.parse(body.p_now));
 else value=await database.db.transaction(async tx=>{
  await tx.exec('set local role service_role');
  if(url.pathname==='/rest/v1/eumo_study_requests')return requestRest(tx,url,method,body);
  if(url.pathname==='/rest/v1/eumo_friend_links')return friendLinkRest(tx,url,method);
  throw Error('Unsupported fixture request');
 });
 return new Response(JSON.stringify(value),{status:200});
}
function handler(fetchImpl=transport){return createHandler({env:config,fetchImpl,now:()=>clock});}
async function api(h,u,body,headers={}){
 const req={method:'POST',body,headers:{host:'eumo.test',origin:'https://eumo.test','content-type':'application/json','x-forwarded-for':'192.0.2.'+(++ip),cookie:u?'eumo_friend_session='+u.token:'',...headers}};
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(value){this.body=JSON.parse(value);}};
 await h(req,res);return res;
}
const signal=(id)=>({action:'signal-state',roomId:id});
const wave=(id,requestId=randomUUID())=>({action:'wave',roomId:id,requestId});
const rawRoom=async id=>(await database.db.query('select version,status,data from public.eumo_study_rooms where id=$1',[id])).rows[0];
test.before(async()=>database=await createCoStudyDatabase());test.after(async()=>database.db.close());

test('signals: real authenticated peer delivery is private and does not mutate readiness, clocks or rewards',async()=>{
 const p=await pair(),h=handler();
 await write(p.a,'ready',{roomId:p.id,task:'PRIVATE ESSAY',ready:true,shareTask:false});
 await write(p.b,'ready',{roomId:p.id,task:'PRIVATE REVIEW',ready:true,shareTask:false});
 const before=await rawRoom(p.id),empty=await api(h,p.b,signal(p.id));
 assert.equal(empty.statusCode,200);assert.deepEqual(Object.keys(empty.body).sort(),['roomId','self','serverTime','signals']);assert.deepEqual(empty.body.signals,[]);
 const sent=wave(p.id),r=await api(h,p.a,{...sent,actorId:p.b.id,type:'admin',at:clock+999999,points:100,task:'forged'});
 assert.equal(r.statusCode,200);assert.deepEqual(r.body.signals,[{userId:p.a.id,id:sent.requestId,type:'wave',at:clock}]);
 const peer=await api(h,p.b,signal(p.id));assert.deepEqual(peer.body.signals,r.body.signals);assert.equal(peer.body.self.id,p.b.id);
 const text=JSON.stringify(peer.body);for(const secret of [p.a.token,p.a.hash,'PRIVATE','sourceSessionId','review','points','snapshot','sb_secret_'])assert(!text.includes(secret));
 assert.deepEqual(await rawRoom(p.id),before);
 assert.equal((await api(h,null,signal(p.id))).statusCode,401);
 assert.equal((await api(h,{token:'f'.repeat(64)},signal(p.id))).statusCode,401);
 const outsider=await user('Outside');assert.equal((await api(h,outsider,signal(p.id))).statusCode,404);
 assert.equal((await api(h,outsider,wave(p.id))).statusCode,404);
});

test('signals: concurrent duplicate and delayed retries retain one receipt and original time',async()=>{
 const p=await pair(),h=handler(),first=wave(p.id),start=clock;
 const results=await Promise.all([api(h,p.a,first),api(h,p.a,first)]);assert(results.every(r=>r.statusCode===200));
 const rows=await database.db.query('select request_id,created_at from public.eumo_study_requests where actor_id=$1 and fingerprint=$2',[p.a.id,'wave:v1']);assert.equal(rows.rows.length,1);
 clock+=5000;const newer=wave(p.id);assert.equal((await api(h,p.a,newer)).statusCode,200);
 clock+=1500;const retry=await api(h,p.a,first);assert.equal(retry.statusCode,200);assert.deepEqual(retry.body.signals,[{userId:p.a.id,id:newer.requestId,type:'wave',at:start+5000}]);
 assert.equal((await database.db.query('select count(*)::integer n from public.eumo_study_requests where actor_id=$1 and fingerprint=$2',[p.a.id,'wave:v1'])).rows[0].n,2);
 assert.equal(Date.parse((await database.db.query('select created_at from public.eumo_study_requests where actor_id=$1 and request_id=$2',[p.a.id,first.requestId])).rows[0].created_at),start);
 const normal=(await database.db.query('select request_id from public.eumo_study_requests where actor_id=$1 and fingerprint<>$2 limit 1',[p.a.id,'wave:v1'])).rows[0].request_id;
 assert.equal((await api(h,p.a,wave(p.id,normal))).body.error,'REQUEST_REUSED');
 const upper=await api(h,p.a,{...first,roomId:p.id.toUpperCase(),requestId:first.requestId.toUpperCase()});assert.equal(upper.statusCode,200);
});

test('signals: persistent cooldown survives API instances and waves expire without renewing on replay',async()=>{
 const p=await pair(),first=wave(p.id),at=clock;
 assert.equal((await api(handler(),p.a,first)).statusCode,200);
 clock+=4500;const limited=await api(handler(),p.a,wave(p.id));assert.equal(limited.statusCode,429);assert.equal(limited.body.error,'REQUEST_LIMITED');assert.equal(limited.headers['Retry-After'],'1');
 assert.equal((await api(handler(),p.b,wave(p.id))).statusCode,200);
 clock=at+6001;const visible=await api(handler(),p.b,signal(p.id));assert.equal(visible.body.signals.length,1);assert.equal(visible.body.signals[0].userId,p.b.id);
 clock=at+11000;const replay=await api(handler(),p.a,first);assert.equal(replay.statusCode,200);assert.deepEqual(replay.body.signals,[]);
 assert.equal((await api(handler(),p.a,wave(p.id))).statusCode,200);
});

test('signals: sixty waves plus two normal rounds retain ledger capacity for the next study session',async()=>{
 const p=await pair(),h=handler();let first;
 for(let round=0;round<2;round++){
  await write(p.a,'ready',{roomId:p.id,ready:true,shareTask:false});await write(p.b,'ready',{roomId:p.id,ready:true,shareTask:false});
  const started=await write(p.a,'start',{roomId:p.id});assert(!started.error);clock=Number(started.room.startsAt);
  for(let step=1;step<=120;step++){
   clock+=10000;
   for(const u of [p.a,p.b]){
    const state=await database.coStudy(u.hash,'state',{roomId:p.id},clock),own=state.room.members.find(m=>m.id===u.id);
    const beat=await write(u,'heartbeat',{roomId:p.id,roundId:state.room.roundId,sourceSessionId:own.sourceSessionId});assert(!beat.error);
   }
   if(round===0&&step%2===0){const event=wave(p.id);first||=event;assert.equal((await api(h,p.a,event)).statusCode,200);}
  }
  for(const u of [p.a,p.b])assert(!(await write(u,'review',{roomId:p.id,roundId:started.room.roundId,outcome:'complete'})).error);
  if(round===0){
   clock+=5000;const limited=await api(handler(),p.a,wave(p.id));assert.equal(limited.statusCode,429);assert.equal(limited.body.error,'WAVE_LIMITED');assert(Number(limited.headers['Retry-After'])>0&&Number(limited.headers['Retry-After'])<=3600);
   assert.equal((await api(handler(),p.a,first)).statusCode,200);
  }
 }
 const count=(await database.db.query('select count(*)::integer total,count(*) filter (where fingerprint=$2)::integer waves from public.eumo_study_requests where actor_id=$1',[p.a.id,'wave:v1'])).rows[0];
 assert.equal(count.waves,60);assert(count.total<500);
 const next=await write(p.a,'create',{friendId:p.b.id,mode:'together'});assert(!next.error,JSON.stringify(next));
});

test('signals: reaction polling and core controls have separate bounded IP budgets',async()=>{
 const p=await pair(),sameIp={'x-forwarded-for':'198.51.100.4'};
 const h=handler(async()=>new Response(JSON.stringify({error:'UNAUTHORIZED'})));
 for(let n=0;n<300;n++)assert.equal((await api(h,p.a,signal(p.id),sameIp)).statusCode,401);
 assert.equal((await api(h,p.a,signal(p.id),sameIp)).statusCode,429);
 for(let n=0;n<180;n++)assert.equal((await api(h,p.a,{action:'state'},sameIp)).statusCode,401);
 assert.equal((await api(h,p.a,{action:'state'},sameIp)).statusCode,429);
 clock+=60000;assert.equal((await api(h,p.a,signal(p.id),sameIp)).statusCode,401);assert.equal((await api(h,p.a,{action:'state'},sameIp)).statusCode,401);
});

test('signals: invitation, departed member, ended room and revoked friendship deny both reads and writes',async()=>{
 const p=await pair(false),h=handler();
 for(const u of [p.a,p.b])for(const body of [signal(p.id),wave(p.id)])assert.equal((await api(h,u,body)).body.error,'INVALID_STATE');
 await write(p.b,'accept',{roomId:p.id});
 await write(p.a,'ready',{roomId:p.id,ready:true,shareTask:false});await write(p.b,'ready',{roomId:p.id,ready:true,shareTask:false});
 const started=await write(p.a,'start',{roomId:p.id});assert(!started.error);clock=Number(started.room.startsAt)+1000;
 await write(p.a,'leave',{roomId:p.id});
 assert.equal((await rawRoom(p.id)).status,'active');
 for(const u of [p.a,p.b])assert.equal((await api(h,u,signal(p.id))).body.error,'INVALID_STATE');
 const second=await pair();const relation=await database.rpc(second.a.hash,'state');await database.rpc(second.a.hash,'remove',{linkId:relation.friends[0].linkId});
 for(const body of [signal(second.id),wave(second.id)])assert.equal((await api(h,second.a,body)).body.error,'NOT_FRIENDS');
 const cancelled=await pair();await write(cancelled.a,'leave',{roomId:cancelled.id});assert.equal((await api(h,cancelled.b,signal(cancelled.id))).body.error,'INVALID_STATE');
});

test('signals: wave delivery races with Start without changing its optimistic version',async()=>{
 const p=await pair();await write(p.a,'ready',{roomId:p.id,ready:true,shareTask:false});await write(p.b,'ready',{roomId:p.id,ready:true,shareTask:false});
 const before=await rawRoom(p.id);
 const [sent,started]=await Promise.all([api(handler(),p.a,wave(p.id)),write(p.a,'start',{roomId:p.id,expectedVersion:before.version})]);
 assert.equal(sent.statusCode,200);assert(!started.error,JSON.stringify(started));assert.equal(started.room.version,before.version+1);assert.equal(started.room.roundIndex,1);
 const own=started.room.members.find(m=>m.id===p.a.id);clock=Number(started.room.startsAt)+2000;
 await write(p.a,'pause',{roomId:p.id,roundId:started.room.roundId,sourceSessionId:own.sourceSessionId,expectedControlVersion:own.controlVersion});
 const paused=await rawRoom(p.id);await api(handler(),p.b,wave(p.id));assert.deepEqual(await rawRoom(p.id),paused);
});

test('signals: a room closed during delivery never returns a successful reaction',async()=>{
 const p=await pair();let close=true;
 const h=handler(async(raw,options)=>{
  if(close&&new URL(raw).pathname==='/rest/v1/eumo_study_requests'&&options.method==='POST'){close=false;await write(p.b,'leave',{roomId:p.id});}
  return transport(raw,options);
 });
 const r=await api(h,p.a,wave(p.id));assert.equal(r.statusCode,409);assert.equal(r.body.error,'INVALID_STATE');assert.equal(r.body.signals,undefined);
 assert.equal((await api(handler(),p.a,signal(p.id))).body.error,'INVALID_STATE');
});

test('signals: only valid recent member reactions are returned even with malformed storage rows',async()=>{
 const p=await pair(),id=randomUUID();
 const h=handler(async(raw,options)=>{
  const url=new URL(raw);
  if(url.pathname==='/rest/v1/eumo_study_requests'&&url.searchParams.has('room_id')){
   const row={actor_id:p.a.id,request_id:id,fingerprint:'wave:v1',room_id:p.id,created_at:new Date(clock).toISOString(),privateNote:'NEVER SHARE'};
   return new Response(JSON.stringify([row,{...row,actor_id:randomUUID()},{...row,room_id:randomUUID()},{...row,request_id:'bad'},{...row,fingerprint:'other'},{...row,created_at:new Date(clock+1).toISOString()},{...row,created_at:'bad'},{...row,created_at:new Date(clock-6001).toISOString()}]));
  }return transport(raw,options);
 });
 const r=await api(h,p.b,signal(p.id));assert.equal(r.statusCode,200);assert.deepEqual(r.body.signals,[{userId:p.a.id,id,type:'wave',at:clock}]);assert(!JSON.stringify(r.body).includes('NEVER SHARE'));
});

test('signals: malformed client input, rejected storage and transport errors fail safely',async()=>{
 const u={token:'a'.repeat(64)},noFetch=handler(()=>assert.fail('No request should reach storage'));
 for(const body of [{action:'signal-state'},{action:'signal-state',roomId:'bad'},wave('bad'),{action:'wave',roomId:randomUUID()},{...wave(randomUUID()),requestId:'bad'},{...signal(randomUUID()),extra:'x'.repeat(5000)}])assert.equal((await api(noFetch,u,body)).statusCode,400);
 assert.equal((await api(noFetch,u,signal(randomUUID()),{origin:'https://wrong.example'})).statusCode,403);
 const p=await pair();let failed=false;
 const h=handler(async(raw,options)=>{
  if(new URL(raw).pathname==='/rest/v1/eumo_study_requests'){failed=true;return new Response('private database details',{status:500});}
  return transport(raw,options);
 });
 const result=await api(h,p.a,wave(p.id));assert(failed);assert.equal(result.statusCode,503);assert.deepEqual(result.body,{error:'CO_STUDY_UNAVAILABLE'});
 const broken=await api(handler(()=>{throw Error('private credential');}),p.a,signal(p.id));assert.equal(broken.statusCode,503);assert(!JSON.stringify(broken.body).includes('credential'));
});

test('signals: the actual local-development adapter delivers the same authenticated reaction',async()=>{
 const {openLocalDatabase}=require('../scripts/local_database.cjs'),local=await openLocalDatabase();
 try{
  const a={token:randomBytes(32).toString('hex')},b={token:randomBytes(32).toString('hex')};
  const rpc=async(u,action,payload)=>{
   const r=await local.db.query('select public.eumo_friends_action($1,$2,$3::jsonb) result',[hash(u.token),action,JSON.stringify(payload||{})]);return r.rows[0].result;
  };
  const ra=await rpc(a,'connect',{friendCode:'ABCDEFGHAB',snapshot:{name:'Local A'}}),rb=await rpc(b,'connect',{friendCode:'ABCDEFGHAC',snapshot:{name:'Local B'}});
  a.id=ra.self.id;b.id=rb.self.id;
  const invited=await rpc(a,'request',{code:rb.self.code});await rpc(b,'accept',{linkId:invited.outgoing[0].linkId});
  const h=createHandler({env:local.env,fetchImpl:local.fetchImpl,now:()=>clock});
  const made=await api(h,a,{action:'create',friendId:b.id,requestId:randomUUID()});assert.equal(made.statusCode,200);
  const id=made.body.room.id;assert.equal((await api(h,b,{action:'accept',roomId:id,requestId:randomUUID()})).statusCode,200);
  const event=wave(id);assert.equal((await api(h,a,event)).statusCode,200);
  assert.deepEqual((await api(h,b,signal(id))).body.signals,[{userId:a.id,id:event.requestId,type:'wave',at:clock}]);
 }finally{await local.close();}
});
