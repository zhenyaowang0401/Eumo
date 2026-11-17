const test=require('node:test'),assert=require('node:assert/strict');
const {merge,validateSnapshot}=require('../device-progress');
const id='a'.repeat(64);
const initial=()=>({depth:100,totalSeconds:3000,profile:{name:'My mole'},equipped:['hat'],reportDays:{'2026-11-16':{seconds:3000,completed:2}}});
const packet=(sequence=1,depth=140,seconds=4200)=>({sequence,snapshot:{version:2,sessionElapsed:seconds,depth,seconds,status:'digging',reportDays:{'2026-11-16':{seconds,completed:1}}}});
test('adds to original save, survives refresh and reconnect without double credit',()=>{
 const source=initial(),a=merge(source,id,packet());assert.equal(a.state.depth,240);assert.equal(source.depth,100);
 assert.equal(a.state.totalSeconds,7200);assert.equal(a.state.reportDays['2026-11-16'].seconds,7200);
 assert.equal(a.state.reportDays['2026-11-16'].completed,3);assert.deepEqual(a.state.profile,source.profile);assert.deepEqual(a.state.equipped,source.equipped);
 const restored=JSON.parse(JSON.stringify(a.state));assert.equal(merge(restored,id,packet()).changed,false);
 const b=merge(restored,id,packet(2,145,4350));assert.equal(b.depth,5);assert.equal(b.state.depth,245);assert.equal(b.state.totalSeconds,7350);
 assert.equal(merge(b.state,id,packet()).changed,false);
 assert.equal(merge(b.state,id,packet(3,145,4350)).depth,0);
});
test('rejects reset/decreasing history and invalid dates without modifying save',()=>{
 const state=merge(initial(),id,packet()).state,copy=JSON.stringify(state);
 assert.throws(()=>merge(state,id,packet(2,1,1)),/WENT_BACKWARDS/);
 const bad=packet(2,141,4230);bad.snapshot.reportDays={};assert.throws(()=>merge(state,id,bad),/WENT_BACKWARDS/);
 bad.snapshot.reportDays={'2026-02-30':{seconds:1}};assert.throws(()=>validateSnapshot(bad.snapshot),/INVALID_DEVICE_DAYS/);
 assert.equal(JSON.stringify(state),copy);
 assert.throws(()=>validateSnapshot({depth:1,seconds:1,status:'digging'}),/UPDATE_DEVICE_FIRMWARE/);
});
test('keeps rounding high water, daily distribution and active session baseline',()=>{
 let state=merge(initial(),id,packet()).state;
 state=merge(state,id,packet(2,140-1e-7,4200-1e-4)).state;
 assert.equal(merge(state,id,packet(3)).depth,0);assert.equal(merge(state,id,packet(3)).seconds,0);
 state.session={baseDepth:240,status:'paused'};
 const p=packet(3,142,4260);p.snapshot.reportDays['2026-11-16'].seconds=4200;p.snapshot.reportDays['2026-11-17']={seconds:60};
 const next=merge(state,id,p).state;assert.equal(next.session.baseDepth,242);assert.equal(next.session.status,'paused');assert.equal(next.reportDays['2026-11-17'].seconds,60);
});
test('optional countdown metadata is validated without changing cumulative receipts',()=>{
 const p=packet();p.snapshot.sessionPlannedSeconds=1500;p.snapshot.sessionRemaining=1409.25;
 assert.equal(validateSnapshot(p.snapshot).sessionRemaining,1409.25);
 let state=merge(initial(),id,p).state;
 assert.equal(state.deviceImports[id].sessionRemaining,undefined);
 assert.equal(state.deviceImports[id].sessionPlannedSeconds,undefined);
 const next=packet(2);next.snapshot.sessionPlannedSeconds=1800;next.snapshot.sessionRemaining=1709.25;
 const extended=merge(state,id,next);assert.equal(extended.depth,0);assert.equal(extended.seconds,0);
 assert.equal(extended.state.totalSeconds,state.totalSeconds);assert.equal(extended.state.depth,state.depth);
 // Old v2 packets with no display metadata remain valid after a new packet.
 assert.equal(merge(extended.state,id,packet(3)).seconds,0);
 for(const [planned,remaining]of [[15,15],[15,0],[120,90],[7200,7200]]){
  assert.equal(validateSnapshot({...p.snapshot,sessionPlannedSeconds:planned,sessionRemaining:remaining}).sessionRemaining,remaining);
 }
 for(const fields of [
  {sessionPlannedSeconds:1500},{sessionRemaining:900},
  {sessionPlannedSeconds:0,sessionRemaining:0},{sessionPlannedSeconds:7201,sessionRemaining:7000},
  {sessionPlannedSeconds:1500,sessionRemaining:-1},{sessionPlannedSeconds:1500,sessionRemaining:1501},
  {sessionPlannedSeconds:'1500',sessionRemaining:900},{sessionPlannedSeconds:1500,sessionRemaining:null},
  {sessionPlannedSeconds:Infinity,sessionRemaining:900},{sessionPlannedSeconds:1500,sessionRemaining:NaN}
 ])assert.throws(()=>validateSnapshot({...packet().snapshot,...fields}),/INVALID_DEVICE_TIMER/);
});
test('paired timer renders the received countdown and freezes offline, with legacy fallback',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 const render=source.match(/function renderDeviceTimer\(\)\{[\s\S]*?\n\}/)[0];
 const nodes=new Map(),get=selector=>{
  if(!nodes.has(selector))nodes.set(selector,{setAttribute(key,value){this[key]=value;}});
  return nodes.get(selector);
 };
 const context=vm.createContext({$:get,$$:()=>[],EumoI18n:{t:s=>s},deviceControl:true,
  deviceActivity:{until:Date.now()+20000,snapshot:{status:'digging',sessionElapsed:90.75,sessionPlannedSeconds:1500,sessionRemaining:1409.25}},
  deviceIsDigging:()=>true});
 vm.runInContext(render,context);
 const draw=()=>vm.runInContext('renderDeviceTimer()',context);
 draw();assert.equal(get('#timeDisplay').textContent,'23:30');assert.match(get('#timeDisplay')['aria-label'],/remaining$/);
 context.deviceActivity.until=0;draw();assert.equal(get('#timeDisplay').textContent,'23:30');assert.equal(get('#timerLabel').textContent,'canele offline');
 context.deviceActivity.snapshot.status='paused';draw();assert.equal(get('#timeDisplay').textContent,'23:30');
 context.deviceActivity.snapshot={status:'idle',sessionElapsed:90.75,sessionPlannedSeconds:1800,sessionRemaining:1800};
 draw();assert.equal(get('#timeDisplay').textContent,'30:00');
 context.deviceActivity.snapshot={status:'paused',sessionElapsed:90.75};
 draw();assert.equal(get('#timeDisplay').textContent,'01:30');assert.match(get('#timeDisplay')['aria-label'],/elapsed$/);
});
