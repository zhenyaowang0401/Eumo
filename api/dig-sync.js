'use strict';
const {createHash}=require('node:crypto');
const {validateSnapshot}=require('../device-progress');
const hash=s=>createHash('sha256').update(s).digest('hex');
const token=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const buckets=new Map();
const send=(res,n,data)=>{res.statusCode=n;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
function validSnapshot(s){return s&&Number.isFinite(s.depth)&&s.depth>=0&&s.depth<=1e9&&Number.isFinite(s.seconds)&&s.seconds>=0&&s.seconds<=1e12&&['digging','paused','idle'].includes(s.status)&&/^#[a-fA-F0-9]{6}$/.test(s.color)&&typeof s.name==='string'&&s.name.length<=32&&Array.isArray(s.equipped)&&s.equipped.length<=12&&s.equipped.every(x=>typeof x==='string'&&/^[a-z0-9_-]{1,40}$/.test(x))&&(s.tool===null||typeof s.tool==='string'&&/^[a-z0-9_-]{1,40}$/.test(s.tool));}
function createHandler({env=process.env,fetchImpl=fetch}={}){return async(req,res)=>{
 if(req.method!=='POST')return send(res,405,{error:'POST_REQUIRED'});
 try{if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:'WRONG_ORIGIN'});}catch{return send(res,403,{error:'WRONG_ORIGIN'});}
 let b;try{let raw;if(req.body!==undefined)raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);else{const parts=[];let size=0;for await(const p of req){size+=p.length;if(size>1048576)throw Error();parts.push(p);}raw=Buffer.concat(parts).toString();}if(Buffer.byteLength(raw)>1048576)throw Error();b=JSON.parse(raw);if(!b||!['publish','read'].includes(b.action))throw Error();}catch{return send(res,400,{error:'INVALID_REQUEST'});}
 const now=Date.now(),ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0],entry=buckets.get(ip)||{time:now,count:0};
 if(now-entry.time>60000){entry.time=now;entry.count=0;}if(++entry.count>120)return send(res,429,{error:'RATE_LIMITED'});buckets.set(ip,entry);if(buckets.size>4000)for(const [k,v]of buckets)if(now-v.time>60000)buckets.delete(k);
 const secret=String(req.headers.authorization||'').replace(/^Bearer /,'');if(!token(secret))return send(res,401,{error:'INVALID_TOKEN'});
 if(b.action==='publish'&&(!token(b.viewerToken)||b.viewerToken===secret||!Number.isSafeInteger(b.sequence)||b.sequence<1||!validSnapshot(b.snapshot)))return send(res,400,{error:'INVALID_SNAPSHOT'});
 if(b.action==='publish'&&b.snapshot.version!==undefined){try{validateSnapshot(b.snapshot);}catch{return send(res,400,{error:'INVALID_SNAPSHOT'});}}
 try{
  const base=new URL(env.SUPABASE_URL);if(base.protocol!=='https:'||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error();
  const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'};if(!env.SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_'))headers.Authorization='Bearer '+env.SUPABASE_SERVICE_ROLE_KEY;
  // Separate random write/read capabilities. A viewer can never publish to the
  // device's stream. Only hashed capabilities are stored in the database.
  const path=b.action==='publish'?'rpc/eumo_publish_dig':'rpc/eumo_read_dig';
  const options={method:'POST',headers,signal:AbortSignal.timeout(10000)};
  if(b.action==='publish'){
   const normalized=b.snapshot.version?validateSnapshot(b.snapshot):null;
   options.body=JSON.stringify({p_writer:hash(secret),p_viewer:hash(b.viewerToken),p_sequence:b.sequence,p_snapshot:{depth:b.snapshot.depth,seconds:b.snapshot.seconds,status:b.snapshot.status,color:b.snapshot.color,name:b.snapshot.name,equipped:b.snapshot.equipped,tool:b.snapshot.tool,...(normalized?{version:b.snapshot.version,sessionElapsed:b.snapshot.sessionElapsed,reportDays:normalized.reportDays,...(normalized.sessionRemaining!==undefined?{sessionPlannedSeconds:normalized.sessionPlannedSeconds,sessionRemaining:normalized.sessionRemaining}:{}),...(b.snapshot.version===3?{earned:normalized.earned,records:normalized.records}:{})}:{})}});
  }else options.body=JSON.stringify({p_reader:hash(secret)});
  const r=await fetchImpl(base.origin+'/rest/v1/'+path,options);if(!r.ok)throw Error();const result=await r.json();
  if(b.action==='publish')return send(res,200,{accepted:result===true});
  if(!result)return send(res,404,{error:'NO_DEVICE_DATA'});
  return send(res,200,{...result,serverTime:Date.now()});
 }catch{return send(res,503,{error:'SYNC_NOT_CONFIGURED'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;module.exports.validSnapshot=validSnapshot;
