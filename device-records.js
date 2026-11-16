'use strict';
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DeviceRecords=api;})(globalThis,()=>{
 const gold=new Set(['sanxingdui','bronze-ding','mole-statue','iphone18','rog-laptop','chanel-bag','gold-console','moon-globe','royal-crown','gold-camera']);
 const count=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
 const counts=a=>Array.isArray(a)&&a.length===4&&a.every(count);
 const map=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([k,n])=>gold.has(k)&&count(n));
 const empty=()=>({stars:0,sessions:0,finds:[0,0,0,0],golden:{}});
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
   ids.add(h.id);return {id:h.id,at:h.at,startedAt:h.startedAt,seconds:h.seconds,depth:h.depth,stars:h.stars,mode:h.mode,outcome:h.outcome,demo:h.demo===true,finds:[...h.finds],golden:[...h.golden],...(daySeconds?{daySeconds}:{})};
  });
  // Cumulative totals are derived from the original session settlements, not re-rolled.
  const summed=empty();for(const h of records){summed.stars+=h.stars;summed.sessions+=h.outcome==='complete'?1:0;h.finds.forEach((n,i)=>summed.finds[i]+=n);for(const id of h.golden)summed.golden[id]=(summed.golden[id]||0)+1;}
  if(summed.stars!==e.stars||summed.sessions!==e.sessions||summed.finds.some((n,i)=>n!==e.finds[i])||[...gold].some(id=>(summed.golden[id]||0)!==(e.golden[id]||0)))throw Error('INVALID_DEVICE_RECORDS');
  return {earned:{stars:e.stars,sessions:e.sessions,finds:[...e.finds],golden:{...e.golden}},records};
 }
 function merge(next,id,current,previous){
  if(!current.earned)return;
  const old=previous?.earned||empty(),e=current.earned;
  if(e.stars<old.stars||e.sessions<old.sessions||e.finds.some((n,i)=>n<old.finds[i])||[...gold].some(k=>(e.golden[k]||0)<(old.golden[k]||0)))throw Error('DEVICE_PROGRESS_WENT_BACKWARDS');
  next.balance=(next.balance||0)+e.stars-old.stars;next.sessions=(next.sessions||0)+e.sessions-old.sessions;
  next.inventory=next.inventory||[0,0,0,0];e.finds.forEach((n,i)=>next.inventory[i]+=n-old.finds[i]);
  next.rareInventory=next.rareInventory||{};for(const k of gold){const n=(e.golden[k]||0)-(old.golden[k]||0);if(n)next.rareInventory[k]=(next.rareInventory[k]||0)+n;}
  next.history=next.history||[];const known=new Set(next.history.map(h=>h.id));
  for(const h of current.records){const key='device:'+id+':'+h.id;if(!known.has(key)){next.history.push({...h,id:key,sourceDevice:id});known.add(key);}}
  next.history.sort((a,b)=>b.at-a.at);
 }
 return {validate,merge};
});
