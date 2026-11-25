'use strict';
const {createHash}=require('node:crypto');
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const ACTIONS=new Set(['state','create','accept','decline','cancel','ready','settings','start','heartbeat','pause','resume','finish','review','leave']);
const STATUS={UNAUTHORIZED:401,FORBIDDEN:403,ROOM_NOT_FOUND:404,NOT_FRIENDS:403,REQUEST_LIMITED:429,STALE_VERSION:409,STALE_CONTROL:409,STALE_ROUND:409,MEMBER_BUSY:409,REQUEST_REUSED:409,INVALID_STATE:409,NOT_READY:409,NOT_STARTED:409,SESSION_MISMATCH:409,INVITE_EXPIRED:410,INVALID_REQUEST:400};
const send=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Cookie');res.end(JSON.stringify(data));};
function tokenOf(req){const value=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('eumo_friend_session='))?.slice('eumo_friend_session='.length);return /^[a-f0-9]{64}$/.test(value||'')?value:null;}
async function readBody(req){if(req.body!==undefined){const value=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(value)>4096)throw Error();return JSON.parse(value);}const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>4096)throw Error();parts.push(part);}return JSON.parse(Buffer.concat(parts).toString('utf8'));}
const clean=(value,n)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,n):'';
function payloadFor(input){
 const p={};if(input.action!=='state'){if(!UUID.test(input.requestId||''))throw Error();p.requestId=input.requestId;}
 if(input.action!=='create'&&(input.action!=='state'||input.roomId!==undefined)){if(!UUID.test(input.roomId||''))throw Error();p.roomId=input.roomId;}
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
function createHandler({env=process.env,fetchImpl=globalThis.fetch,now=Date.now,timeoutMs=12000}={}){
 const buckets=new Map();
 return async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'METHOD_NOT_ALLOWED'});}
  try{if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:'ORIGIN_NOT_ALLOWED'});}catch{return send(res,403,{error:'ORIGIN_NOT_ALLOWED'});}
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return send(res,415,{error:'JSON_REQUIRED'});
  const at=now(),ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  for(const [key,bucket]of buckets)if(at-bucket.at>=60000)buckets.delete(key);
  if(buckets.size>=4000&&!buckets.has(ip))return send(res,429,{error:'RATE_LIMITED'});
  const bucket=buckets.get(ip)||{at,n:0};bucket.n++;buckets.set(ip,bucket);
  if(bucket.n>180){res.setHeader('Retry-After','60');return send(res,429,{error:'RATE_LIMITED'});}
  const token=tokenOf(req);if(!token)return send(res,401,{error:'UNAUTHORIZED'});
  let input,payload;try{input=await readBody(req);if(!input||!ACTIONS.has(input.action))throw Error();payload=payloadFor(input);}catch{return send(res,400,{error:'INVALID_REQUEST'});}
  let url;const key=env.SUPABASE_SERVICE_ROLE_KEY;
  try{url=new URL(env.SUPABASE_URL);if(!key||url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw Error();}catch{return send(res,503,{error:'CO_STUDY_NOT_CONFIGURED'});}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const headers={'Content-Type':'application/json',apikey:key};if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
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
