'use strict';
const {createHash}=require('node:crypto');
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const ACTIONS=new Set(['state','create','accept','decline','cancel','ready','settings','start','heartbeat','pause','resume','finish','review','leave','signal-state','wave']);
const SIGNAL_ACTIONS=new Set(['signal-state','wave']);
const WAVE_FINGERPRINT='wave:v1',WAVE_WINDOW_MS=6000,WAVE_COOLDOWN_MS=5000;
const WAVE_HOURLY_LIMIT=60;
const SIGNAL_COLUMNS='actor_id,request_id,fingerprint,room_id,created_at';
const STATUS={UNAUTHORIZED:401,FORBIDDEN:403,ROOM_NOT_FOUND:404,NOT_FRIENDS:403,REQUEST_LIMITED:429,STALE_VERSION:409,STALE_CONTROL:409,STALE_ROUND:409,MEMBER_BUSY:409,REQUEST_REUSED:409,INVALID_STATE:409,NOT_READY:409,NOT_STARTED:409,SESSION_MISMATCH:409,INVITE_EXPIRED:410,INVALID_REQUEST:400};
const send=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Cookie');res.end(JSON.stringify(data));};
function tokenOf(req){const value=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('eumo_friend_session='))?.slice('eumo_friend_session='.length);return /^[a-f0-9]{64}$/.test(value||'')?value:null;}
async function readBody(req){if(req.body!==undefined){const value=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(value)>4096)throw Error();return JSON.parse(value);}const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>4096)throw Error();parts.push(part);}return JSON.parse(Buffer.concat(parts).toString('utf8'));}
const clean=(value,n)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,n):'';
function payloadFor(input){
 const p={};if(!['state','signal-state'].includes(input.action)){if(!UUID.test(input.requestId||''))throw Error();p.requestId=input.requestId;}
 if(input.action!=='create'&&(input.action!=='state'||input.roomId!==undefined)){if(!UUID.test(input.roomId||''))throw Error();p.roomId=input.roomId;}
 if(SIGNAL_ACTIONS.has(input.action)){p.roomId=p.roomId.toLowerCase();if(p.requestId)p.requestId=p.requestId.toLowerCase();return p;}
 if(input.expectedVersion!==undefined){if(!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1)throw Error();p.expectedVersion=input.expectedVersion;}
 if(['pause','resume','finish'].includes(input.action)){if(!Number.isSafeInteger(input.expectedControlVersion)||input.expectedControlVersion<0)throw Error();p.expectedControlVersion=input.expectedControlVersion;}
 if(input.action==='create'){if(!UUID.test(input.friendId||''))throw Error();p.friendId=input.friendId;p.mode=input.mode||'together';}
 if(input.action==='settings')p.mode=input.mode;
 if(p.mode!==undefined&&!['together','challenge'].includes(p.mode))throw Error();
 if(input.action==='ready'){
  if(typeof input.ready!=='boolean'||typeof input.shareTask!=='boolean'||input.task!==undefined&&typeof input.task!=='string'||String(input.task||'').length>100)throw Error();
  p.ready=input.ready;p.shareTask=input.shareTask;p.task=clean(input.task,100);
 }
 if(['heartbeat','pause','resume','finish','review'].includes(input.action)){
  if(!UUID.test(input.roundId||''))throw Error();p.roundId=input.roundId;
  if(input.action!=='review'){if(!UUID.test(input.sourceSessionId||''))throw Error();p.sourceSessionId=input.sourceSessionId;}
 }
 if(['heartbeat','pause','resume','finish'].includes(input.action)&&input.uncertainInterval!==undefined){if(typeof input.uncertainInterval!=='boolean')throw Error();p.uncertainInterval=input.uncertainInterval;}
 if(input.action==='finish'){if(!['stopped','complete'].includes(input.outcome||'stopped'))throw Error();p.outcome=input.outcome||'stopped';}
 if(input.action==='review'){
  if(!['complete','partial','adjusted'].includes(input.outcome)||input.note!==undefined&&typeof input.note!=='string'||String(input.note||'').length>160)throw Error();
  p.outcome=input.outcome;p.note=clean(input.note,160);
 }
 return p;
}
// Reactions use the existing append-only request ledger. They never change a
// room version, ready state, clock or reward. The receipt's UUID makes retries
// idempotent even after a newer wave; its original server timestamp never moves.
async function handleSignal({action,payload,hash,at,origin,headers,signal,fetchImpl}){
 const failure=(error)=>({status:STATUS[error]||503,body:{error:STATUS[error]?error:'CO_STUDY_UNAVAILABLE'}});
 const request=async(path,options={})=>{
  const response=await fetchImpl(origin+'/rest/v1/'+path,{...options,headers:{...headers,...options.headers},signal});
  if(!response.ok)throw Error('Signal storage unavailable');
  return response.json();
 };
 const rows=async(table,filters,options={})=>{
  const result=await request(table+'?'+new URLSearchParams(filters),options);
  if(!Array.isArray(result))throw Error('Invalid signal storage response');
  return result;
 };
 const authorize=async()=>{
  const result=await request('rpc/eumo_co_study_action',{method:'POST',body:JSON.stringify({p_token_hash:hash,p_action:'state',p_payload:{roomId:payload.roomId},p_now:new Date(at).toISOString()})});
  if(result?.error)return {failure:failure(result.error)};
  const room=result?.room,self=result?.self;
  if(!UUID.test(self?.id||'')||!room||room.id!==payload.roomId||!UUID.test(room.hostId||'')||!UUID.test(room.guestId||'')||room.hostId===room.guestId)throw Error('Invalid signal authorization response');
  const memberIds=[room.hostId,room.guestId];
  if(!memberIds.includes(self.id))return {failure:failure('ROOM_NOT_FOUND')};
  if(!['ready','active','between_rounds'].includes(room.status)||!Array.isArray(room.members)||room.members.length!==2||!memberIds.every(id=>room.members.filter(m=>m.id===id).length===1))return {failure:failure('INVALID_STATE')};
  const joined=new Set(['joined','ready','studying','paused','review_pending','completed','stopped']);
  if(room.members.some(m=>!joined.has(m.status)))return {failure:failure('INVALID_STATE')};
  const relation=await rows('eumo_friend_links',{select:'id',pair_key:'eq.'+memberIds.slice().sort().join(':'),status:'eq.accepted',limit:'1'});
  if(relation.length!==1||!UUID.test(relation[0]?.id||''))return {failure:failure('NOT_FRIENDS')};
  return {self:{id:self.id},roomId:room.id,memberIds};
 };
 let access=await authorize();if(access.failure)return access.failure;
 const receipt=async()=>{
  const result=await rows('eumo_study_requests',{select:SIGNAL_COLUMNS,actor_id:'eq.'+access.self.id,request_id:'eq.'+payload.requestId,limit:'1'});
  if(result.length>1)throw Error('Invalid receipt response');
  return result[0];
 };
 const isReplay=row=>row&&row.actor_id===access.self.id&&row.request_id===payload.requestId&&row.room_id===payload.roomId&&row.fingerprint===WAVE_FINGERPRINT&&Number.isFinite(Date.parse(row.created_at));
 if(action==='wave'){
  const existing=await receipt();
  if(existing&&!isReplay(existing))return failure('REQUEST_REUSED');
  if(!existing){
   const recent=await rows('eumo_study_requests',{select:SIGNAL_COLUMNS,actor_id:'eq.'+access.self.id,fingerprint:'eq.'+WAVE_FINGERPRINT,created_at:'gt.'+new Date(at-WAVE_COOLDOWN_MS).toISOString(),order:'created_at.desc',limit:'1'});
   if(recent.length){
    // Persistent best-effort cooldown. Concurrent distinct requests can both
    // pass this read; they only add a cosmetic signal, never study credit.
    const concurrent=await receipt();
    if(concurrent&&!isReplay(concurrent))return failure('REQUEST_REUSED');
    if(!concurrent){
     const last=Date.parse(recent[0].created_at);
     if(!Number.isFinite(last))throw Error('Invalid signal timestamp');
     return {...failure('REQUEST_LIMITED'),retryAfter:Math.max(1,Math.ceil((last+WAVE_COOLDOWN_MS-at)/1000))};
    }
   }
   const hourly=await rows('eumo_study_requests',{select:SIGNAL_COLUMNS,actor_id:'eq.'+access.self.id,fingerprint:'eq.'+WAVE_FINGERPRINT,created_at:'gt.'+new Date(at-3600000).toISOString(),order:'created_at.desc',limit:String(WAVE_HOURLY_LIMIT)});
   if(hourly.length>=WAVE_HOURLY_LIMIT){
    const concurrent=await receipt();
    if(concurrent&&!isReplay(concurrent))return failure('REQUEST_REUSED');
    if(!concurrent){
     const oldest=Math.min(...hourly.map(row=>Date.parse(row.created_at)));
     if(!Number.isFinite(oldest))throw Error('Invalid signal timestamp');
     return {status:429,body:{error:'WAVE_LIMITED'},retryAfter:Math.max(1,Math.ceil((oldest+3600000-at)/1000))};
    }
   }
   const inserted=await rows('eumo_study_requests',{on_conflict:'actor_id,request_id',select:SIGNAL_COLUMNS},{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({actor_id:access.self.id,request_id:payload.requestId,fingerprint:WAVE_FINGERPRINT,room_id:payload.roomId,created_at:new Date(at).toISOString()})});
   if(inserted.length>1)throw Error('Invalid signal insert response');
   const saved=inserted[0]||await receipt();
   if(!saved)throw Error('Signal receipt missing');
   if(!isReplay(saved))return failure('REQUEST_REUSED');
   // A room may close while the request is in flight. Keep its immutable
   // receipt, but do not return reactions for a now-closed/revoked room.
   access=await authorize();if(access.failure)return access.failure;
  }
 }
 const stored=await rows('eumo_study_requests',{select:SIGNAL_COLUMNS,room_id:'eq.'+access.roomId,actor_id:'in.('+access.memberIds.join(',')+')',fingerprint:'eq.'+WAVE_FINGERPRINT,created_at:'gte.'+new Date(at-WAVE_WINDOW_MS).toISOString(),order:'created_at.desc',limit:'24'});
 const latest=new Map();
 for(const row of stored){
  const stamp=Date.parse(row.created_at);
  if(row.room_id!==access.roomId||row.fingerprint!==WAVE_FINGERPRINT||!access.memberIds.includes(row.actor_id)||!UUID.test(row.request_id||'')||!Number.isFinite(stamp)||stamp>at||stamp<at-WAVE_WINDOW_MS)continue;
  if(!latest.has(row.actor_id)||latest.get(row.actor_id).at<stamp)latest.set(row.actor_id,{userId:row.actor_id,id:row.request_id,type:'wave',at:stamp});
 }
 return {status:200,body:{self:access.self,roomId:access.roomId,signals:[...latest.values()].sort((a,b)=>a.userId.localeCompare(b.userId)),serverTime:at}};
}
function createHandler({env=process.env,fetchImpl=globalThis.fetch,now=Date.now,timeoutMs=12000}={}){
 // Cosmetic polling has its own bounded IP budget so a room on a shared
 // school network cannot consume the budget for pause, finish or Start.
 const coreBuckets=new Map(),signalBuckets=new Map();
 return async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'METHOD_NOT_ALLOWED'});}
  try{if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:'ORIGIN_NOT_ALLOWED'});}catch{return send(res,403,{error:'ORIGIN_NOT_ALLOWED'});}
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return send(res,415,{error:'JSON_REQUIRED'});
  const token=tokenOf(req);
  let input,payload,invalid=false;try{input=await readBody(req);if(!input||!ACTIONS.has(input.action))throw Error();payload=payloadFor(input);}catch{invalid=true;}
  const isSignal=!invalid&&SIGNAL_ACTIONS.has(input.action),buckets=isSignal?signalBuckets:coreBuckets,limit=isSignal?300:180;
  const at=now(),ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  for(const [key,bucket]of buckets)if(at-bucket.at>=60000)buckets.delete(key);
  if(buckets.size>=4000&&!buckets.has(ip))return send(res,429,{error:'RATE_LIMITED'});
  const bucket=buckets.get(ip)||{at,n:0};bucket.n++;buckets.set(ip,bucket);
  if(bucket.n>limit){res.setHeader('Retry-After','60');return send(res,429,{error:'RATE_LIMITED'});}
  if(!token)return send(res,401,{error:'UNAUTHORIZED'});
  if(invalid)return send(res,400,{error:'INVALID_REQUEST'});
  let url;const key=env.SUPABASE_SERVICE_ROLE_KEY;
  try{url=new URL(env.SUPABASE_URL);if(!key||url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw Error();}catch{return send(res,503,{error:'CO_STUDY_NOT_CONFIGURED'});}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const headers={'Content-Type':'application/json',apikey:key};if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
   if(SIGNAL_ACTIONS.has(input.action)){
    const result=await handleSignal({action:input.action,payload,hash:createHash('sha256').update(token).digest('hex'),at,origin:url.origin,headers,signal:controller.signal,fetchImpl});
    if(result.retryAfter)res.setHeader('Retry-After',String(result.retryAfter));
    return send(res,result.status,result.body);
   }
   const response=await fetchImpl(url.origin+'/rest/v1/rpc/eumo_co_study_action',{method:'POST',headers,signal:controller.signal,body:JSON.stringify({p_token_hash:createHash('sha256').update(token).digest('hex'),p_action:input.action,p_payload:payload,p_now:new Date(at).toISOString()})});
   if(!response.ok)return send(res,503,{error:'CO_STUDY_UNAVAILABLE'});
   const data=await response.json();
   if(data?.error)return send(res,STATUS[data.error]||503,{error:STATUS[data.error]?data.error:'CO_STUDY_UNAVAILABLE',...(Number.isInteger(data.version)?{version:data.version}:{})});
   if(!data?.self||!UUID.test(data.self.id||'')||!Array.isArray(data.rooms)||!Number.isFinite(Number(data.serverTime)))return send(res,503,{error:'CO_STUDY_UNAVAILABLE'});
   return send(res,200,data);
  }catch{return send(res,503,{error:'CO_STUDY_UNAVAILABLE'});}finally{clearTimeout(timeout);}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
