'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createController,defaults}=require('../study-guidance.js');
function fixture(){let time=1000000;const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};const make=()=>createController({storage,now:()=>time});return {make,values,storage,advance:n=>time+=n,snapshot:{userId:'alice',profileConfigured:true,canControl:true,focusVisible:true,task:'Read the first section',session:null}};}
test('task reminder follows an explicit preparation event after two minutes, not immediately',()=>{
 const f=fixture(),c=f.make(),s={...f.snapshot,taskPreparedAt:1000000};assert.equal(c.update(s),null);f.advance(119999);assert.equal(c.update(s),null);f.advance(1);assert.equal(c.update(s).type,'task');
});
test('empty tasks and stale remembered tasks with no preparation cannot trigger a reminder',()=>{
 const f=fixture(),c=f.make();c.update({...f.snapshot,task:''});f.advance(600000);assert.equal(c.update({...f.snapshot,task:''}),null);c.update({...f.snapshot,taskPreparedAt:0});f.advance(600000);assert.equal(c.update({...f.snapshot,taskPreparedAt:0}),null);
});
test('dismissal persists across refresh and never stores private task text',()=>{
 const f=fixture(),c=f.make();c.update(f.snapshot);f.advance(defaults.taskDelay);const e=c.update(f.snapshot);c.dismiss(e.key);assert.equal(f.make().update(f.snapshot),null);assert.ok(![...f.values.values()].join('').includes('Read the first section'));
});
test('snooze persists and fires only after the configured five minutes',()=>{
 const f=fixture(),c=f.make();c.update(f.snapshot);f.advance(defaults.taskDelay);const e=c.update(f.snapshot);c.snooze(e.key);const refreshed=f.make();f.advance(defaults.snoozeMs-1);assert.equal(refreshed.update(f.snapshot),null);f.advance(1);assert.equal(refreshed.update(f.snapshot).key,e.key);
});
test('changing or clearing the task cancels the previous reminder event',()=>{
 const f=fixture(),c=f.make();c.update(f.snapshot);f.advance(defaults.taskDelay);assert.equal(c.update(f.snapshot).type,'task');const next={...f.snapshot,task:'Read section two'};assert.equal(c.update(next),null);f.advance(defaults.taskDelay);assert.equal(c.update(next).type,'task');assert.equal(c.update({...next,task:''}),null);
});
test('starting cancels task prompt and finishing does not prompt the same old task again',()=>{
 const f=fixture(),c=f.make();c.update(f.snapshot);f.advance(defaults.taskDelay);const active={...f.snapshot,session:{id:'s1',status:'running'}};assert.equal(c.update(active),null);assert.equal(c.update(f.snapshot),null);f.advance(defaults.taskDelay);assert.equal(c.update(f.snapshot),null);assert.equal(f.make().update(f.snapshot),null);
});
test('intentional preparation can reuse a task after the previous session',()=>{
 const f=fixture(),c=f.make();c.update({...f.snapshot,session:{id:'s1',status:'running'}});const prepared={...f.snapshot,taskPreparedAt:1000000};assert.equal(c.update(prepared),null);f.advance(defaults.taskDelay);assert.equal(c.update(prepared).type,'task');
});
test('opening a paused session offers a resume action once and dismissal persists',()=>{
 const f=fixture(),c=f.make(),s={...f.snapshot,session:{id:'s1',status:'paused',pausedAt:900000}};const e=c.update(s);assert.equal(e.type,'pause');assert.equal(e.action,'resume');c.dismiss(e.key);assert.equal(f.make().update(s),null);
});
test('a user pause does not immediately nag; returning to Focus offers resume',()=>{
 const f=fixture(),c=f.make(),running={...f.snapshot,session:{id:'s1',status:'running'}};c.update(running);const paused={...f.snapshot,session:{id:'s1',status:'paused',pausedAt:1000000}};assert.equal(c.update(paused),null);c.update({...paused,focusVisible:false});assert.equal(c.update(paused).type,'pause');
});
test('resuming cancels a snoozed pause and a later new pause gets its own identity',()=>{
 const f=fixture(),c=f.make(),s={...f.snapshot,session:{id:'s1',status:'paused',pausedAt:1}};const e=c.update(s);c.snooze(e.key);c.update({...s,session:{...s.session,status:'running'}});f.advance(defaults.snoozeMs);assert.equal(c.update({...s,session:{...s.session,status:'running'}}),null);c.update({...s,focusVisible:false,session:{...s.session,pausedAt:2}});const e2=c.update({...s,session:{...s.session,pausedAt:2}});assert.notEqual(e2.key,e.key);
});
test('planned break prompts use explicit deadline, disappear while studying, and stay dismissed',()=>{
 const f=fixture(),c=f.make(),s={...f.snapshot,task:'',coStudy:{breakId:'r1',breakEndsAt:1001000}};assert.equal(c.update(s),null);f.advance(1000);const e=c.update(s);assert.equal(e.type,'rest');assert.equal(e.action,'start');assert.equal(c.update({...s,session:{id:'s2',status:'running'}}),null);c.dismiss(e.key);assert.equal(f.make().update(s),null);
});
test('disabled preferences survive reload, stay private to one user, and suppress all cues',()=>{
 const f=fixture(),c=f.make();c.update(f.snapshot);c.setEnabled(false);f.advance(defaults.taskDelay);assert.equal(c.update(f.snapshot),null);const next=f.make();assert.equal(next.update(f.snapshot),null);assert.equal(next.enabled,false);next.update({...f.snapshot,userId:'bob'});assert.equal(next.enabled,true);
});
test('device/tab control, setup and non-Focus views suppress actionable cues',()=>{
 const f=fixture(),c=f.make();c.update(f.snapshot);f.advance(defaults.taskDelay);for(const change of [{canControl:false},{profileConfigured:false},{focusVisible:false}])assert.equal(c.update({...f.snapshot,...change}),null);assert.equal(c.update(f.snapshot).type,'task');
});
test('unavailable storage and malformed data keep the timer-independent controller usable',()=>{
 let time=1000;const c=createController({storage:{getItem(){throw Error('denied');},setItem(){throw Error('denied');}},now:()=>time});c.update({task:'x'});time+=defaults.taskDelay;assert.equal(c.update({task:'x'}).type,'task');c.dismiss(c.update({task:'x'}).key);assert.equal(c.update({task:'x'}),null);
 const malformed=createController({storage:{getItem:()=>'{broken',setItem(){}},now:()=>time});assert.equal(malformed.update({task:''}),null);
});
