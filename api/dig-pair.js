'use strict';
const {createHash,randomInt}=require('node:crypto');
const hash=s=>createHash('sha256').update(s).digest('hex');
const actions=new Set(['start','claim','poll','poll-device','confirm','revoke','disconnect']);
const send=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
function createHandler({env=process.env,fetchImpl=fetch,makeCode=()=>String(randomInt(10000)).padStart(4,'0')}={}){return async(req,res)=>{
 if(req.method!=='POST')return send(res,405,{error:'POST_REQUIRED'});
 try{if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:'WRONG_ORIGIN'});}catch{return send(res,403,{error:'WRONG_ORIGIN'});}
 const secret=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization||'')?.[1];if(!secret)return send(res,401,{error:'INVALID_TOKEN'});
 let b;try{let raw=req.body;if(raw===undefined){const chunks=[];let n=0;for await(const part of req){n+=part.length;if(n>2048)throw Error();chunks.push(part);}raw=Buffer.concat(chunks).toString();}else if(typeof raw!=='string')raw=JSON.stringify(raw);if(Buffer.byteLength(raw)>2048)throw Error();b=JSON.parse(raw);if(!actions.has(b.action))throw Error();}catch{return send(res,400,{error:'INVALID_REQUEST'});}
 if(b.action==='claim'&&!/^\d{4}$/.test(b.code||''))return send(res,400,{error:'FOUR_DIGITS_REQUIRED'});
 if(b.action==='confirm'&&!/^[a-f0-9]{64}$/.test(b.requestId||''))return send(res,400,{error:'INVALID_REQUEST'});
 try{
  const origin=new URL(env.SUPABASE_URL);if(origin.protocol!=='https:'||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error();
  const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'};if(!env.SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_'))headers.Authorization='Bearer '+env.SUPABASE_SERVICE_ROLE_KEY;
  const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  for(let attempt=0;attempt<4;attempt++){
   const code=b.action==='start'?makeCode():b.code;
   const response=await fetchImpl(origin.origin+'/rest/v1/rpc/eumo_pair_dig',{method:'POST',headers,signal:AbortSignal.timeout(10000),body:JSON.stringify({p_actor:hash(secret),p_action:b.action,p_code:code?hash(code):null,p_request:b.requestId||null,p_label:String(b.label||'My computer').replace(/[\x00-\x1f]/g,'').slice(0,32),p_rate:hash(b.action==='start'?secret:ip)})});
   if(!response.ok)throw Error();const data=await response.json();if(data.error==='CODE_BUSY'&&b.action==='start')continue;
   return send(res,data.error?(data.error==='RATE_LIMITED'?429:409):200,{...data,...(!data.error&&b.action==='start'?{code}:{}),serverTime:Date.now()});
  }
  return send(res,503,{error:'PAIRING_BUSY'});
 }catch{return send(res,503,{error:'SYNC_NOT_CONFIGURED'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
