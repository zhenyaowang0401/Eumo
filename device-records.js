'use strict';
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DeviceRecords=api;})(globalThis,()=>{
 const gold=new Set(['sanxingdui','bronze-ding','mole-statue','iphone18','rog-laptop','chanel-bag','gold-console','moon-globe','royal-crown','gold-camera']);
 const count=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
 const counts=a=>Array.isArray(a)&&a.length===4&&a.every(count);
 const map=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([k,n])=>gold.has(k)&&count(n));
 const empty=()=>({stars:0,sessions:0,finds:[0,0,0,0],golden:{}});
 const validDate=date=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;
 const localDate=at=>{const d=new Date(at);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const formal=h=>!h.demo&&(h.mode==='study'||h.mode==='work');
 function sessionId(h){
  const prefix=typeof h.sourceDevice==='string'?'device:'+h.sourceDevice+':':null;
  if(prefix&&typeof h.id==='string'&&h.id.startsWith(prefix))return h.sourceSessionId||h.id.slice(prefix.length);
  return h.id;
 }
 // Session identity is not inferred from matching aggregate totals. Normalize
 // only fields that old firmware explicitly fills and its numeric precision.
 function fingerprint(h){
  const round=(n,scale)=>Math.round(n*scale)/scale;
  return JSON.stringify([h.at,h.startedAt??h.at,round(h.seconds,1000),round(h.depth??0,1000000),h.stars,h.mode,h.outcome,h.demo===true,
   h.finds,h.golden||[],Object.entries(h.daySeconds||{}).sort(([a],[b])=>a.localeCompare(b)).map(([day,n])=>[day,round(n,1000)]),
   formal(h)&&h.outcome==='complete'?(h.completedDay||localDate(h.at)):null]);
 }
 function addEarned(total,h){
  total.stars+=h.stars;total.sessions+=h.outcome==='complete'?1:0;
  h.finds.forEach((n,i)=>total.finds[i]+=n);for(const id of h.golden)total.golden[id]=(total.golden[id]||0)+1;
 }
 function plan(state,id,current,previous,legacy){
  if(!current.earned)return null;
  const known=new Map();for(const h of state.history||[]){const key=sessionId(h);if(typeof key!=='string')continue;const group=known.get(key)||[];group.push(h);known.set(key,group);}
  if(previous?.recordIds!==undefined&&(!Array.isArray(previous.recordIds)||previous.recordIds.some(x=>typeof x!=='string')))throw Error('INVALID_DEVICE_RECEIPTS');
  const seen=new Set(previous?.recordIds||[]);
  // Receipts made before recordIds was introduced can recover their observed
  // sessions from the imported history already stored alongside the receipt.
  if(previous&&!previous.recordIds)for(const h of state.history||[])if(h.sourceDevice===id||legacy&&h.sourceDevice===legacy)seen.add(sessionId(h));
  const ids=new Set(current.records.map(h=>h.id));
  for(const key of seen)if(!ids.has(key))throw Error('DEVICE_PROGRESS_WENT_BACKWARDS');
  const overlap={depth:0,seconds:0,reportDays:{},earned:empty()},add=[];
  for(const h of current.records){
   const candidates=known.get(h.id)||[],matching=candidates.some(old=>fingerprint(old)===fingerprint(h));
   if(candidates.length&&!matching)throw Error('DEVICE_RECORD_CONFLICT');
   if(!matching){add.push(h);continue;}
   if(seen.has(h.id))continue;
   addEarned(overlap.earned,h);
   // A v2 receipt already contains time/depth but no settled records. Its
   // upgrade must not retroactively subtract time that may have been imported.
   if(previous&&!previous.earned&&!previous.recordIds)continue;
   overlap.depth+=h.depth;
   if(!formal(h))continue;
   overlap.seconds+=h.seconds;
   const distribution=Object.keys(h.daySeconds||{}).length?h.daySeconds:{[localDate(h.at)]:h.seconds};
   const field=h.mode==='work'?'workSeconds':'seconds';
   for(const [day,seconds]of Object.entries(distribution)){const row=overlap.reportDays[day]||(overlap.reportDays[day]={});row[field]=(row[field]||0)+seconds;}
   if(h.outcome==='complete'){const day=h.completedDay||localDate(h.at),row=overlap.reportDays[day]||(overlap.reportDays[day]={}),field=h.mode==='work'?'workCompleted':'completed';row[field]=(row[field]||0)+1;}
  }
  return {overlap,add,recordIds:[...ids]};
 }
 function validate(s){
  const e=s.earned;if(!e||!count(e.stars)||!count(e.sessions)||!counts(e.finds)||!map(e.golden)||!Array.isArray(s.records)||s.records.length>2000)throw Error('INVALID_DEVICE_RECORDS');
  const ids=new Set();const records=s.records.map(h=>{
   if(!h||typeof h.id!=='string'||!h.id.length||h.id.length>120||ids.has(h.id)||!['study','work','rest'].includes(h.mode)||!['complete','stopped'].includes(h.outcome)||!Number.isFinite(h.at)||h.at<0||!Number.isFinite(h.startedAt)||h.startedAt<0||!Number.isFinite(h.seconds)||h.seconds<0||h.seconds>7200||!Number.isFinite(h.depth)||h.depth<0||!count(h.stars)||!counts(h.finds)||!Array.isArray(h.golden)||h.golden.length>50||!h.golden.every(x=>gold.has(x)))throw Error('INVALID_DEVICE_RECORDS');
   let daySeconds;
   if(h.daySeconds!==undefined){
    if(!h.daySeconds||typeof h.daySeconds!=='object'||Array.isArray(h.daySeconds)||Object.keys(h.daySeconds).length>366)throw Error('INVALID_DEVICE_RECORDS');
    daySeconds={};for(const [date,seconds]of Object.entries(h.daySeconds)){
     if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||!Number.isFinite(seconds)||seconds<0||seconds>7200)throw Error('INVALID_DEVICE_RECORDS');
     daySeconds[date]=seconds;
    }
   }
   if(h.completedDay!==undefined&&!validDate(h.completedDay))throw Error('INVALID_DEVICE_RECORDS');
   ids.add(h.id);return {id:h.id,at:h.at,startedAt:h.startedAt,seconds:h.seconds,depth:h.depth,stars:h.stars,mode:h.mode,outcome:h.outcome,demo:h.demo===true,finds:[...h.finds],golden:[...h.golden],...(daySeconds?{daySeconds}:{}),...(h.completedDay?{completedDay:h.completedDay}:{})};
  });
  // Cumulative totals are derived from the original session settlements, not re-rolled.
  const summed=empty();for(const h of records){summed.stars+=h.stars;summed.sessions+=h.outcome==='complete'?1:0;h.finds.forEach((n,i)=>summed.finds[i]+=n);for(const id of h.golden)summed.golden[id]=(summed.golden[id]||0)+1;}
  if(summed.stars!==e.stars||summed.sessions!==e.sessions||summed.finds.some((n,i)=>n!==e.finds[i])||[...gold].some(id=>(summed.golden[id]||0)!==(e.golden[id]||0)))throw Error('INVALID_DEVICE_RECORDS');
  return {earned:{stars:e.stars,sessions:e.sessions,finds:[...e.finds],golden:{...e.golden}},records};
 }
 function merge(next,id,current,previous,prepared){
  if(!current.earned)return;
  const old=previous?.earned||empty(),e=current.earned,excluded=prepared.overlap.earned;
  const delta=(now,before,skip=0)=>{const value=now-before-skip;if(value<0)throw Error('DEVICE_PROGRESS_WENT_BACKWARDS');return value;};
  next.balance=(next.balance||0)+delta(e.stars,old.stars,excluded.stars);
  next.sessions=(next.sessions||0)+delta(e.sessions,old.sessions,excluded.sessions);
  next.inventory=next.inventory||[0,0,0,0];e.finds.forEach((n,i)=>next.inventory[i]+=delta(n,old.finds[i],excluded.finds[i]));
  next.rareInventory=next.rareInventory||{};for(const k of gold){const n=delta(e.golden[k]||0,old.golden[k]||0,excluded.golden[k]||0);if(n)next.rareInventory[k]=(next.rareInventory[k]||0)+n;}
  next.history=next.history||[];
  for(const h of prepared.add)next.history.push({...h,id:'device:'+id+':'+h.id,sourceDevice:id,sourceSessionId:h.id});
  next.history.sort((a,b)=>b.at-a.at);
 }
 return {validate,merge,plan};
});
