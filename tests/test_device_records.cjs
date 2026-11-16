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
