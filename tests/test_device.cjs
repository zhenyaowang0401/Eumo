const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {createHandler,deviceIdentity}=require('../api/device.js');
const hash=s=>createHash('sha256').update(s).digest('hex');
function fixture(){let clock=1794400000000,rows=[],owner='a'.repeat(64),calls=[];
const env={SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'server-only'};
const match=(r,q)=>[...q].every(([key,value])=>key==='select'||value==='is.null'&&r[key]===null||value.startsWith('eq.')&&r[key]===value.slice(3)||value.startsWith('gt.')&&Date.parse(r[key])>Date.parse(value.slice(3)));
const fetchImpl=async(url,opts={})=>{calls.push({url,opts});const u=new URL(url);assert.equal(opts.headers.apikey,'server-only');let result=[];
if(u.pathname.endsWith('eumo_friend_profiles'))result=u.searchParams.get('auth_hash')==='eq.'+hash(owner)?[{id:'owner'}]:[];
else if(opts.method==='POST'){const row=JSON.parse(opts.body);rows.push(row);result=[row];}
else if(opts.method==='PATCH'){result=rows.filter(r=>match(r,u.searchParams));for(const r of result)Object.assign(r,JSON.parse(opts.body));}
else if(opts.method==='DELETE'){result=rows.filter(r=>match(r,u.searchParams));rows=rows.filter(r=>!result.includes(r));}
else result=rows.filter(r=>match(r,u.searchParams));
return {ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(result))};};
const handler=createHandler({env,fetchImpl,now:()=>clock});let n=0;
async function request(action,extra={},headers={}){let body,status;const res={setHeader(){},set statusCode(v){status=v;},end(text){body=JSON.parse(text);}};
await handler({method:'POST',headers:{'content-type':'application/json',host:'site.test','x-forwarded-for':'test-'+(++n)+'-'+Math.random(),...headers},body:{action,...extra}},res);return {status,body};}
return {request,env,fetchImpl,owner,calls,rows:()=>rows,advance:ms=>clock+=ms,now:()=>clock};}
test('pairing: hashed token, browser consent, single claim, polling and same friend identity',async()=>{
const f=fixture(),start=await f.request('start');assert.equal(start.status,200);assert.match(start.body.deviceToken,/^[a-f0-9]{64}$/);assert.match(start.body.code,/^[A-F0-9]{12}$/);assert.equal(f.rows()[0].token_hash,hash(start.body.deviceToken));assert.equal(JSON.stringify(f.rows()).includes(start.body.deviceToken),false);
const headers={authorization:'Bearer '+start.body.deviceToken};assert.equal((await f.request('poll',{},headers)).body.paired,false);
assert.equal((await f.request('approve',{code:start.body.code})).status,401);
assert.equal((await f.request('approve',{code:start.body.code},{cookie:'eumo_friend_session='+f.owner,origin:'https://evil.test'})).status,403);
assert.equal((await f.request('approve',{code:start.body.code},{cookie:'eumo_friend_session='+f.owner})).status,200);
assert.equal((await f.request('approve',{code:start.body.code},{cookie:'eumo_friend_session='+f.owner})).status,404);
assert.equal((await f.request('poll',{},headers)).body.paired,true);
assert.equal(await deviceIdentity({headers},f.env,f.fetchImpl,f.now()),hash(f.owner));
assert.equal(JSON.stringify((await f.request('poll',{},headers)).body).includes(hash(f.owner)),false);
assert.equal((await f.request('revoke',{}, {cookie:'eumo_friend_session='+f.owner})).status,200);
assert.equal(await deviceIdentity({headers},f.env,f.fetchImpl,f.now()),null);
});
test('expired pairing cannot be approved, guessed device token cannot poll',async()=>{const f=fixture(),start=await f.request('start');f.advance(301000);assert.equal((await f.request('approve',{code:start.body.code},{cookie:'eumo_friend_session='+f.owner})).status,404);assert.equal((await f.request('poll',{}, {authorization:'Bearer '+start.body.deviceToken})).status,410);assert.equal((await f.request('poll',{}, {authorization:'Bearer '+'b'.repeat(64)})).status,410);});
test('reject invalid action, oversized JSON and non-owner cookie',async()=>{const f=fixture();assert.equal((await f.request('wrong')).status,400);assert.equal((await f.request('approve',{code:'a'.repeat(3000)})).status,400);const s=await f.request('start');assert.equal((await f.request('approve',{code:s.body.code},{cookie:'eumo_friend_session='+'c'.repeat(64)})).status,401);});
test('paired device uses the existing friend identity without receiving a browser cookie',async()=>{
 const {createHandler}=require('../api/friends.js'),ownerHash=hash('browser-owner');let usedHash;
 const handler=createHandler({env:{SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'server-only'},fetchImpl:async(url,options)=>{
  if(url.includes('/eumo_devices?'))return {ok:true,status:200,json:async()=>[{owner_hash:ownerHash,expires_at:'2099-01-01T00:00:00Z'}]};
  assert.ok(url.includes('/rpc/eumo_friends_action'));usedHash=JSON.parse(options.body).p_token_hash;
  return {ok:true,status:200,json:async()=>({self:{id:'11111111-1111-1111-1111-111111111111',code:'ABCDE23456'},friends:[],incoming:[],outgoing:[]})};
 }});
 const response={headers:{},setHeader(k,v){this.headers[k]=v;},end(s){this.body=JSON.parse(s);}};
 await handler({method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+'d'.repeat(64)},body:{action:'state'}},response);
 assert.equal(response.statusCode,200);assert.equal(usedHash,ownerHash);assert.equal(response.headers['Set-Cookie'],undefined);
});
test('pairing SQL migration runs and browser roles cannot read device tokens',async()=>{
 const {createDatabase}=require('./friends_database.cjs'),fs=require('node:fs'),path=require('node:path'),database=await createDatabase();
 try{await database.db.exec(fs.readFileSync(path.join(__dirname,'../database/device_pairing.sql'),'utf8'));for(const role of ['anon','authenticated']){await database.db.exec('set role '+role);await assert.rejects(database.db.query('select * from public.eumo_devices'),/permission denied/);await database.db.exec('reset role');}}
 finally{await database.db.close();}
});
