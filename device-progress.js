'use strict';
// A receipt and the credited totals live in the SAME browser save. Replaying a
// cloud snapshot, reconnecting, or refreshing cannot credit the device twice.
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DeviceProgress=api;})(globalThis,()=>{
 const Records=typeof module==='object'&&module.exports?require('./device-records'):globalThis.DeviceRecords;
 const fields=['seconds','workSeconds','completed','workCompleted'];
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const finite=x=>Number.isFinite(x)&&x>=0&&x<=1e12;
 function days(value){
  if(!object(value)||Object.keys(value).length>366)throw Error('INVALID_DEVICE_DAYS');
  const out={};for(const [date,day]of Object.entries(value)){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||!object(day))throw Error('INVALID_DEVICE_DAYS');
   out[date]={};for(const field of fields){const n=day[field]??0;if(!finite(n)||field.includes('ompleted')&&!Number.isSafeInteger(n))throw Error('INVALID_DEVICE_DAYS');out[date][field]=n;}
  }return out;
 }
 function validateSnapshot(s){
  if(!object(s)||!finite(s.sessionElapsed)||![2,3].includes(s.version)||!finite(s.depth)||!finite(s.seconds)||!['digging','paused','idle'].includes(s.status))throw Error('UPDATE_DEVICE_FIRMWARE');
  return {depth:s.depth,seconds:s.seconds,reportDays:days(s.reportDays),...(s.version===3?Records.validate(s):{})};
 }
 function merge(state,id,packet){
  if(!/^[a-f0-9]{64}$/.test(id)||!Number.isSafeInteger(packet.sequence)||packet.sequence<1)throw Error('INVALID_DEVICE_PACKET');
  if(packet.deviceId){if(!/^[a-f0-9]{64}$/.test(packet.deviceId))throw Error('INVALID_DEVICE_PACKET');id=packet.deviceId;}
  const current=validateSnapshot(packet.snapshot),receipts=state.deviceImports??{};
  if(!object(receipts))throw Error('INVALID_DEVICE_RECEIPTS');
  const legacy=packet.legacyId&&packet.legacyId!==id&&/^[a-f0-9]{64}$/.test(packet.legacyId)?packet.legacyId:null;
  if(receipts[id]&&legacy&&receipts[legacy])throw Error('DEVICE_IDENTITY_CONFLICT');
  const previous=receipts[id]||(legacy&&receipts[legacy]);
  if(previous&&(!Number.isSafeInteger(previous.sequence)||!finite(previous.depth)||!finite(previous.seconds)))throw Error('INVALID_DEVICE_RECEIPTS');
  if(previous&&packet.sequence<=previous.sequence)return {state,changed:false,depth:0,seconds:0};
  const old=previous?{...previous,reportDays:days(previous.reportDays)}:{depth:0,seconds:0,reportDays:{}};
  if(current.depth+1e-6<old.depth||current.seconds+1e-3<old.seconds)throw Error('DEVICE_PROGRESS_WENT_BACKWARDS');
  for(const [date,day]of Object.entries(old.reportDays))for(const field of fields)if((current.reportDays[date]?.[field]??0)+1e-3<day[field])throw Error('DEVICE_PROGRESS_WENT_BACKWARDS');
  // Keep high-water marks even when floating-point rounding moves backwards.
  current.depth=Math.max(current.depth,old.depth);current.seconds=Math.max(current.seconds,old.seconds);
  for(const [date,day]of Object.entries(old.reportDays)){
   current.reportDays[date] ||= {...day};
   for(const field of fields)current.reportDays[date][field]=Math.max(current.reportDays[date][field],day[field]);
  }
  const next=JSON.parse(JSON.stringify(state));next.deviceImports=next.deviceImports||{};
  if(!previous&&Object.keys(next.deviceImports).length>=8)throw Error('TOO_MANY_DEVICES');
  const depth=Math.max(0,current.depth-old.depth),seconds=Math.max(0,current.seconds-old.seconds);
  next.depth=(next.depth||0)+depth;next.totalSeconds=(next.totalSeconds||0)+seconds;
  // Do not replace the user's current browser session, appearance or rewards.
  if(next.session)next.session.baseDepth=(next.session.baseDepth||0)+depth;
  next.reportDays=next.reportDays||{};
  for(const [date,day]of Object.entries(current.reportDays)){
   const target=next.reportDays[date]||(next.reportDays[date]={});
   for(const field of fields)target[field]=(target[field]||0)+Math.max(0,day[field]-(old.reportDays[date]?.[field]||0));
  }
  Records.merge(next,id,current,previous);
  const {records,...receipt}=current;
  if(legacy)delete next.deviceImports[legacy];
  next.deviceImports[id]={sequence:packet.sequence,...receipt};
  return {state:next,changed:true,depth,seconds};
 }
 return {merge,validateSnapshot};
});
