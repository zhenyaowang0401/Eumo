const test=require('node:test'),assert=require('node:assert/strict');
const {merge}=require('../device-progress');
const id='a'.repeat(64),legacy='b'.repeat(64),day='2026-11-16';
const record=(id,at,seconds=600)=>({id,at,startedAt:at-seconds*1000,seconds,depth:seconds/30,stars:Math.floor(seconds/300),mode:'study',outcome:'stopped',demo:false,finds:[1,0,0,0],golden:['moon-globe']});
const first=record('study1',1000000);
function packet(sequence,records){const earned={stars:0,sessions:0,finds:[0,0,0,0],golden:{}};for(const h of records){earned.stars+=h.stars;h.finds.forEach((n,i)=>earned.finds[i]+=n);for(const k of h.golden)earned.golden[k]=(earned.golden[k]||0)+1;}return {sequence,deviceId:id,legacyId:legacy,snapshot:{version:3,sessionElapsed:0,status:'idle',depth:records.reduce((n,h)=>n+h.depth,0),seconds:records.reduce((n,h)=>n+h.seconds,0),reportDays:{[day]:{seconds:records.reduce((n,h)=>n+h.seconds,0)}},earned,records}};}
test('imports original settled discoveries/rewards once; future finds remain identical and no re-roll',()=>{
 const initial={depth:100,totalSeconds:3000,balance:10,inventory:[5,0,0,0],rareInventory:{'moon-globe':1},history:[],reportDays:{}};
 const a=merge(initial,id,packet(1,[first])).state;assert.equal(a.depth,120);assert.equal(a.balance,12);assert.deepEqual(a.inventory,[6,0,0,0]);assert.equal(a.rareInventory['moon-globe'],2);assert.equal(a.history[0].sourceDevice,id);
 const b=merge(JSON.parse(JSON.stringify(a)),id,packet(2,[first])).state;assert.equal(b.balance,12);assert.equal(b.history.length,1);
 const c=merge(b,id,packet(3,[record('study2',2000000),first])).state;assert.equal(c.balance,14);assert.equal(c.history.length,2);assert.equal(c.rareInventory['moon-globe'],3);
 const bad=packet(4,[first]);assert.throws(()=>merge(c,id,bad),/BACKWARDS/);
 const inconsistent=packet(4,[first]);inconsistent.snapshot.earned.stars++;assert.throws(()=>merge(b,id,inconsistent),/INVALID_DEVICE_RECORDS/);
});
test('upgrading private link to code uses stable device identity without crediting old depth twice',()=>{
 const old={depth:120,totalSeconds:3600,balance:10,inventory:[5,0,0,0],reportDays:{[day]:{seconds:600}},deviceImports:{[legacy]:{sequence:1,depth:20,seconds:600,reportDays:{[day]:{seconds:600}}}}};
 const state=merge(old,id,packet(2,[first])).state;assert.equal(state.depth,120);assert.equal(state.totalSeconds,3600);assert.equal(state.balance,12);assert.ok(state.deviceImports[id]);assert.equal(state.deviceImports[legacy],undefined);
});
test('preserves a session split across midnight for the original daily history view',()=>{
 const h={...first,daySeconds:{'2026-11-15':300,'2026-11-16':300}};
 const state=merge({},id,packet(1,[h])).state;assert.deepEqual(state.history[0].daySeconds,h.daySeconds);
 assert.throws(()=>merge({},id,packet(1,[{...h,daySeconds:{'2026-02-30':600}}])),/INVALID_DEVICE_RECORDS/);
});

// Modern backups preserve exact session identity and its day distribution.
const at=Date.parse('2026-11-16T18:00:00Z');
const settled=(key,when=at,extra={})=>({...record(key,when),daySeconds:{[day]:600},...extra});
function settledPacket(sequence,records,device=id){
 const p=packet(sequence,records);p.deviceId=device;delete p.legacyId;
 p.snapshot.seconds=records.filter(h=>!h.demo&&h.mode!=='rest').reduce((n,h)=>n+h.seconds,0);
 p.snapshot.reportDays={};p.snapshot.earned.sessions=0;
 for(const h of records){
  if(h.outcome==='complete')p.snapshot.earned.sessions++;
  if(h.demo||h.mode==='rest')continue;
  const field=h.mode==='work'?'workSeconds':'seconds';
  for(const [date,seconds]of Object.entries(h.daySeconds||{})){const row=p.snapshot.reportDays[date]||={};row[field]=(row[field]||0)+seconds;}
  if(h.outcome==='complete'){const date=h.completedDay||day,row=p.snapshot.reportDays[date]||={},field=h.mode==='work'?'workCompleted':'completed';row[field]=(row[field]||0)+1;}
 }
 return p;
}
function savedWeb(records){
 const p=settledPacket(1,records),s=p.snapshot;
 return {depth:s.depth,totalSeconds:s.seconds,balance:s.earned.stars,sessions:s.earned.sessions,inventory:[...s.earned.finds],rareInventory:{...s.earned.golden},reportDays:structuredClone(s.reportDays),history:structuredClone(records),owned:['hat']};
}
test('web backup round-trip credits only new sessions, even after old rewards were spent',()=>{
 const shared=settled('original-web'),fresh=settled('new-device',at+900000),source=savedWeb([shared]);
 source.balance=0;source.inventory=[0,0,0,0];source.rareInventory={};
 const after=merge(source,id,settledPacket(1,[shared,fresh])).state;
 assert.equal(after.depth,40);assert.equal(after.totalSeconds,1200);assert.equal(after.balance,2);
 assert.deepEqual(after.inventory,[1,0,0,0]);assert.equal(after.rareInventory['moon-globe'],1);
 assert.equal(after.history.length,2);assert.deepEqual(after.owned,['hat']);
 assert.equal(after.reportDays[day].seconds,1200);
 const repeated=merge(JSON.parse(JSON.stringify(after)),id,settledPacket(2,[shared,fresh])).state;
 assert.equal(repeated.balance,2);assert.equal(repeated.depth,40);assert.equal(repeated.history.length,2);
});
test('exact known history overlap is shared across device descendants',()=>{
 const shared=settled('shared-origin'),newer=settled('second-device',at+900000),other='c'.repeat(64);
 const first=merge({},id,settledPacket(1,[shared])).state;
 assert.equal(first.history[0].sourceSessionId,'shared-origin');
 const next=merge(first,other,settledPacket(1,[shared,newer],other)).state;
 assert.equal(next.depth,40);assert.equal(next.totalSeconds,1200);assert.equal(next.balance,4);assert.equal(next.history.length,2);
 // Old imported histories did not store sourceSessionId; their exact wrapper
 // still identifies the original session without treating its totals as an ID.
 const legacy=structuredClone(first);delete legacy.history[0].sourceSessionId;
 assert.equal(merge(legacy,other,settledPacket(1,[shared],other)).state.balance,2);
});
test('same totals with different IDs are distinct; changed settlement under same ID is rejected',()=>{
 const shared=settled('web'),source=savedWeb([shared]),distinct={...shared,id:'device'};
 assert.equal(merge(source,id,settledPacket(1,[distinct])).state.depth,40);
 const before=JSON.stringify(source),changed={...shared,startedAt:shared.startedAt-1};
 assert.throws(()=>merge(source,id,settledPacket(1,[changed])),/DEVICE_RECORD_CONFLICT/);
 assert.equal(JSON.stringify(source),before);
});
test('v3 to v2 to v3 retains reward receipts while new legacy time still imports once',()=>{
 const h=settled('one'),newer=settled('two',at+900000);
 let state=merge({},id,settledPacket(1,[h])).state;
 state.balance=0;state.inventory=[0,0,0,0];state.rareInventory={};
 const legacy=settledPacket(2,[h,newer]);legacy.snapshot.version=2;delete legacy.snapshot.earned;delete legacy.snapshot.records;
 state=merge(state,id,legacy).state;
 assert.equal(state.depth,40);assert.equal(state.totalSeconds,1200);
 assert.equal(state.deviceImports[id].earned.stars,2);
 assert.deepEqual(state.deviceImports[id].recordIds,['one']);
 state=merge(JSON.parse(JSON.stringify(state)),id,settledPacket(3,[h,newer])).state;
 assert.equal(state.depth,40);assert.equal(state.totalSeconds,1200);assert.equal(state.balance,2);
 assert.deepEqual(state.inventory,[1,0,0,0]);assert.equal(state.history.length,2);
});
test('midnight and completed Work overlap preserve exact daily counts',()=>{
 const h=settled('midnight',Date.parse('2026-11-17T00:00:00Z'),{mode:'work',outcome:'complete',completedDay:'2026-11-17',daySeconds:{[day]:600}});
 const source=savedWeb([h]),next=merge(source,id,settledPacket(1,[h])).state;
 assert.equal(next.sessions,1);assert.equal(next.totalSeconds,600);
 assert.equal(next.reportDays[day].workSeconds,600);assert.equal(next.reportDays['2026-11-17'].workCompleted,1);assert.equal(next.reportDays[day].workCompleted,0);assert.equal(next.history.length,1);
});
test('existing receipt observes a newly added matching session without re-crediting its rewards',()=>{
 const shared=settled('later-web'),own=settled('first-device',at+900000);
 let state=merge(savedWeb([shared]),id,settledPacket(1,[own])).state;
 state=merge(state,id,settledPacket(2,[own,shared])).state;
 assert.equal(state.depth,40);assert.equal(state.totalSeconds,1200);assert.equal(state.balance,4);assert.equal(state.history.length,2);
});
