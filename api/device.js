'use strict';
// Device pairing uses a separate revocable token. Browser friend cookies never leave the server.
const {randomBytes,createHash}=require('node:crypto');
const hash=s=>createHash('sha256').update(s).digest('hex');
const cookie=req=>String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('eumo_friend_session='))?.slice(20);
const bearer=req=>/^Bearer ([a-f0-9]{64})$/.exec(String(req.headers.authorization||''))?.[1];
const buckets=new Map();
const send=(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));};
function config(env){const u=new URL(env.SUPABASE_URL||'https://unconfigured.invalid');if(u.protocol!=='https:')throw Error('CONFIG');return {url:u.origin,key:env.SUPABASE_SERVICE_ROLE_KEY};}
async function rest(env,fetchImpl,path,method='GET',body){const c=config(env);if(!c.key)throw Error('CONFIG');const headers={apikey:c.key,'Content-Type':'application/json',Prefer:'return=representation'};if(!c.key.startsWith('sb_secret_'))headers.Authorization='Bearer '+c.key;const r=await fetchImpl(c.url+'/rest/v1/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('DATABASE');return r.status===204?[]:r.json();}
async function deviceIdentity(req,env=process.env,fetchImpl=fetch,now=Date.now()){
 const token=bearer(req);if(!token)return null;
 const rows=await rest(env,fetchImpl,'eumo_devices?'+new URLSearchParams({select:'owner_hash,expires_at',token_hash:'eq.'+hash(token)}));
 const row=rows[0];return row?.owner_hash&&Date.parse(row.expires_at)>now?row.owner_hash:null;
}
function createHandler({env=process.env,fetchImpl=fetch,now=Date.now}={}){return async(req,res)=>{
 if(req.method!=='POST')return send(res,405,{error:'METHOD_NOT_ALLOWED'});
 try{if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:'ORIGIN_NOT_ALLOWED'});}catch{return send(res,403,{error:'ORIGIN_NOT_ALLOWED'});}
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return send(res,415,{error:'JSON_REQUIRED'});
 let input;try{let text;if(req.body!==undefined)text=typeof req.body==='string'?req.body:JSON.stringify(req.body);else{const chunks=[];let length=0;for await(const part of req){length+=part.length;if(length>2000)throw Error();chunks.push(part);}text=Buffer.concat(chunks).toString('utf8');}if(!text||Buffer.byteLength(text)>2000)throw Error();input=JSON.parse(text);if(!input||!['start','poll','approve','revoke'].includes(input.action))throw Error();}catch{return send(res,400,{error:'INVALID_REQUEST'});}
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0],key=ip+':'+input.action,t=now(),entry=buckets.get(key)||{at:t,n:0};if(t-entry.at>60000){entry.at=t;entry.n=0;}if(++entry.n>(input.action==='start'?6:30))return send(res,429,{error:'RATE_LIMITED'});buckets.set(key,entry);if(buckets.size>4000)for(const [k,v]of buckets)if(t-v.at>60000)buckets.delete(k);
 try{
  if(input.action==='start'){
   const token=randomBytes(32).toString('hex'),code=randomBytes(6).toString('hex').toUpperCase(),expires=new Date(t+5*60000).toISOString();
   await rest(env,fetchImpl,'eumo_devices','POST',{token_hash:hash(token),pair_code_hash:hash(code),pair_expires_at:expires,expires_at:expires,owner_hash:null});
   return send(res,200,{deviceToken:token,code,expiresAt:expires});
  }
  if(input.action==='poll'){
   const token=bearer(req);if(!token)return send(res,401,{error:'UNAUTHORIZED'});
   const rows=await rest(env,fetchImpl,'eumo_devices?'+new URLSearchParams({select:'owner_hash,expires_at,pair_expires_at',token_hash:'eq.'+hash(token)}));const row=rows[0];
   if(!row||Date.parse(row.expires_at)<=t)return send(res,410,{error:'PAIRING_EXPIRED'});
   return send(res,200,{paired:!!row.owner_hash,expiresAt:row.expires_at});
  }
  const owner=cookie(req);if(!/^[a-f0-9]{64}$/.test(owner||''))return send(res,401,{error:'CONNECT_FRIENDS_FIRST'});
  const ownerHash=hash(owner),profiles=await rest(env,fetchImpl,'eumo_friend_profiles?'+new URLSearchParams({select:'id',auth_hash:'eq.'+ownerHash}));if(!profiles.length)return send(res,401,{error:'CONNECT_FRIENDS_FIRST'});
  if(input.action==='revoke'){await rest(env,fetchImpl,'eumo_devices?'+new URLSearchParams({owner_hash:'eq.'+ownerHash}),'DELETE');return send(res,200,{revoked:true});}
  const code=String(input.code||'').replace(/[ -]/g,'').toUpperCase();if(!/^[0-9A-F]{12}$/.test(code))return send(res,400,{error:'INVALID_CODE'});
  // Conditional PATCH is the atomic claim: a code cannot be claimed twice or after expiry.
  const rows=await rest(env,fetchImpl,'eumo_devices?'+new URLSearchParams({pair_code_hash:'eq.'+hash(code),owner_hash:'is.null',pair_expires_at:'gt.'+new Date(t).toISOString()}),'PATCH',{owner_hash:ownerHash,pair_code_hash:null,expires_at:new Date(t+365*86400000).toISOString()});
  return rows.length?send(res,200,{paired:true}):send(res,404,{error:'INVALID_OR_EXPIRED_CODE'});
 }catch{return send(res,503,{error:'DEVICE_SERVICE_NOT_CONFIGURED'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;module.exports.deviceIdentity=deviceIdentity;
