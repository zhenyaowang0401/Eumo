const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {createHandler}=require('../api/dig-pair'),{createHandler:syncHandler}=require('../api/dig-sync');
const hash=s=>createHash('sha256').update(s).digest('hex'),writer='d'.repeat(64),viewer='e'.repeat(64),reader='f'.repeat(64);
test('real SQL + API: four digits, consent, single claim, revoke, expiry, persistent throttling',async()=>{
 const {db}=await require('./friends_database.cjs').createDatabase();
 try{
  for(const file of ['dig_sync.sql','dig_pairing.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../database',file),'utf8'));
  await db.query('select eumo_publish_dig($1,$2,1,$3)',[hash(writer),hash(viewer),{depth:150}]);
  const fetchImpl=async(url,options)=>{const p=JSON.parse(options.body);let result;
   if(url.endsWith('eumo_pair_dig'))result=(await db.query('select eumo_pair_dig($1,$2,$3,$4,$5,$6) as r',[p.p_actor,p.p_action,p.p_code,p.p_request,p.p_label,p.p_rate])).rows[0].r;
   else result=(await db.query('select eumo_read_dig($1) as r',[p.p_reader])).rows[0].r;
   return {ok:true,json:async()=>result};};
  const options={env:{SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'server-only'},fetchImpl};
  const api=createHandler({...options,makeCode:()=> '0372'}),sync=syncHandler(options);
  async function req(body,token=reader,ip='client-1',handler=api){let result;const res={setHeader(){},end(s){result=JSON.parse(s)}};await handler({method:'POST',headers:{authorization:'Bearer '+token,host:'site.test','x-forwarded-for':ip},body},res);return {status:res.statusCode,...result};}
  assert.equal((await req({action:'start'},writer)).code,'0372');
  assert.equal((await req({action:'claim',code:'372'})).error,'FOUR_DIGITS_REQUIRED');
  assert.equal((await req({action:'claim',code:'0001'})).error,'INVALID_OR_EXPIRED_CODE');
  assert.equal((await req({action:'claim',code:'0372',label:'My laptop'})).pending,true);
  assert.equal((await req({action:'claim',code:'0372'},'c'.repeat(64))).error,'PAIRING_BUSY');
  assert.equal((await req({action:'read'},reader,'client-1',sync)).status,404);
  const pending=await req({action:'poll-device'},writer);assert.equal(pending.requestId,hash(reader));assert.equal(pending.label,'My laptop');assert.ok(!JSON.stringify(pending).includes(reader));
  assert.equal((await req({action:'confirm',requestId:hash(reader)},'b'.repeat(64))).error,'PAIRING_EXPIRED');
  assert.equal((await req({action:'confirm',requestId:hash(reader)},writer)).paired,true);
  assert.equal((await req({action:'poll'})).deviceId,hash(writer));
  const read=await req({action:'read'},reader,'client-1',sync);assert.equal(read.snapshot.depth,150);assert.equal(read.deviceId,hash(writer));
  assert.equal((await req({action:'claim',code:'0372'},'a'.repeat(64),'other')).error,'INVALID_OR_EXPIRED_CODE');
  assert.equal((await req({action:'revoke'},writer)).revoked,true);assert.equal((await req({action:'read'},reader,'client-1',sync)).status,404);
  await req({action:'start'},writer);await db.exec("update eumo_dig_pairs set expires_at=now()-interval '1 second'");
  assert.equal((await req({action:'claim',code:'0372'},reader,'new-ip')).error,'INVALID_OR_EXPIRED_CODE');
  // Fresh handler instances cannot reset SQL rate limits.
  for(let i=0;i<5;i++)await req({action:'claim',code:'9999'},reader,'guessing',createHandler(options));
  assert.equal((await req({action:'claim',code:'9999'},reader,'guessing',createHandler(options))).status,429);
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from eumo_dig_readers'),/permission denied/);await assert.rejects(db.query('select eumo_read_dig($1)',[hash(reader)]),/permission denied/);await db.exec('reset role');}
 }finally{await db.close()}
});
