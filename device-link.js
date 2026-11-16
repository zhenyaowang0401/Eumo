'use strict';
// Four-digit claim + confirmation on canele. A code alone never authorizes sync.
(()=>{
 const ui=window.CaneleUI,bridge=window.DeviceImportBridge;
 if(!ui||!bridge)return;
 const KEY='eumo-linked-watch-v2',PENDING='eumo-pair-pending-v1';
 const validToken=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
 const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
 const messages={
  SYNC_NOT_CONFIGURED:'Device sync is not available on this website yet. Please try again after it is updated.',
  NO_DEVICE_DATA:'Waiting for canele. Check its Wi-Fi, or disconnect here and pair again.',
  UPDATE_DEVICE_FIRMWARE:'Update your canele firmware before syncing.',
  BROWSER_STORAGE_CONFLICT:'Another tab is updating your progress. Try pairing after its session or sync ends.',
  END_BROWSER_SESSION_FIRST:'End and save your browser session before pairing.',
  DEVICE_PROGRESS_WENT_BACKWARDS:'This device has an older save. Sync has stopped to protect your progress.',
  DEVICE_RECORD_CONFLICT:'These saved sessions do not match. Sync has stopped to protect your progress.',
  DEVICE_IMPORT_BASELINE_REQUIRED:'This backup needs an import baseline before it can sync. Your progress has been kept.',
  PAIRING_EXPIRED:'Pairing expired or was declined. Get a new code on canele.',
  INVALID_OR_EXPIRED_CODE:'That code is incorrect or expired. Get a new code on canele.',
  PAIRING_BUSY:'This canele already has a pending request. Generate a new code on its screen.',
  RATE_LIMITED:'Too many attempts. Wait a minute before trying again.',
  DEVICE_IDENTITY_CONFLICT:'This device has conflicting import records. Your progress has been kept.',
  TOO_MANY_DEVICES:'This save has reached its device limit.',
  INVALID_DEVICE_PACKET:'Canele sent an invalid update. Your progress has been kept.',
  INVALID_DEVICE_RECORDS:'Canele sent an invalid update. Your progress has been kept.'
 };
 let binding=null,pending=null,requesting=false,generation=0,lastSequence=-1,restoring=false;
 const controllers=new Set();
 function showError(error,state=binding?'offline':pending?'pending':'disconnected'){
  ui.render({state,message:messages[error.message]||'Could not connect. Your progress is safe; please try again.',detail:'',error:true,invalid:false});
 }
 async function request(path,token,body){
  const controller=new AbortController();controllers.add(controller);
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:controller.signal});
   let data;try{data=await response.json();}catch{throw Error('SYNC_NOT_CONFIGURED');}
   if(!response.ok||data.error)throw Error(data.error||'SYNC_NOT_CONFIGURED');
   return data;
  }finally{clearTimeout(timer);controllers.delete(controller);}
 }
 async function read(token,id){
  const data=await request('/api/dig-sync',token,{action:'read'});
  if(data.deviceId!==id||!Number.isFinite(data.serverTime)||!Number.isFinite(Date.parse(data.updated_at)))throw Error('INVALID_DEVICE_PACKET');
  DeviceProgress.validateSnapshot(data.snapshot);
  return data;
 }
 function showSnapshot(data){
  const stale=data.serverTime-Date.parse(data.updated_at)>20000;
  const message=stale?'Canele is offline. Your last synced progress is saved.':data.snapshot.status==='digging'?'Canele is digging. Time and progress are syncing.':data.snapshot.status==='idle'?'Session saved. Use canele to start your next dig.':'Canele is paused. Use its screen to resume.';
  ui.render({state:stale?'offline':'connected',message,detail:'',error:false,invalid:false});
 }
 async function poll(){
  if(requesting||restoring||(!binding&&!pending))return;
  requesting=true;const epoch=generation;
  try{
   if(pending){
    const active=pending,result=await request('/api/dig-pair',active.token,{action:'poll'});
    if(epoch!==generation)return;
    if(!result.paired){ui.render({state:'pending',message:'Confirm this request on your canele:',detail:active.label,error:false});return;}
    if(!validToken(result.deviceId))throw Error('INVALID_DEVICE_PACKET');
    const data=await read(active.token,result.deviceId);if(epoch!==generation)return;
    bridge.backup(result.deviceId);bridge.apply(result.deviceId,data);
    const saved={token:active.token,id:result.deviceId,paired:true};
    localStorage.setItem(KEY,JSON.stringify(saved));localStorage.removeItem(PENDING);
    binding=saved;pending=null;lastSequence=data.sequence;showSnapshot(data);return;
   }
   const active=binding,data=await read(active.token,active.id);
   if(epoch!==generation||binding!==active)return;
   if(data.sequence<lastSequence){bridge.offline();throw Error('DEVICE_PROGRESS_WENT_BACKWARDS');}
   bridge.apply(active.id,data);lastSequence=data.sequence;showSnapshot(data);
  }catch(error){
   if(epoch!==generation)return;
   bridge.offline();
   if(pending&&['PAIRING_EXPIRED','INVALID_OR_EXPIRED_CODE'].includes(error.message)){
    pending=null;localStorage.removeItem(PENDING);bridge.disconnect();
   }
   showError(error);
  }finally{requesting=false;}
 }
 ui.form.addEventListener('submit',async event=>{
  event.preventDefault();if(requesting||restoring||pending||binding)return;
  const code=ui.input.value;
  if(!/^\d{4}$/.test(code)){ui.render({state:'disconnected',message:'Enter all four digits, including any leading zero.',error:true,invalid:true});ui.input.focus();return;}
  if(!ui.consent.checked){ui.render({message:'Confirm the progress import before connecting.',error:true,invalid:false});ui.consent.focus();return;}
  requesting=true;const epoch=++generation;let locked=false,token;
  ui.render({state:'connecting',message:'Requesting a connection…',detail:'',error:false,invalid:false});
  try{
   await bridge.connect();locked=true;if(epoch!==generation){bridge.disconnect();return;}
   token=secret();const label='Computer '+String(crypto.getRandomValues(new Uint16Array(1))[0]%10000).padStart(4,'0');
   await request('/api/dig-pair',token,{action:'claim',code,label});if(epoch!==generation)return;
   const saved={token,label};localStorage.setItem(PENDING,JSON.stringify(saved));pending=saved;
   ui.render({state:'pending',message:'Confirm this request on your canele:',detail:label,error:false});
  }catch(error){
   if(epoch!==generation)return;
   if(locked)bridge.disconnect();pending=null;
   // A failed local save must not leave an inaccessible authorization request.
   if(token)request('/api/dig-pair',token,{action:'disconnect'}).catch(()=>{});
   showError(error);
  }finally{requesting=false;}
 });
 ui.disconnect.addEventListener('click',()=>{
  const old=pending||binding;const epoch=++generation;
  for(const controller of controllers)controller.abort();
  pending=binding=null;lastSequence=-1;
  localStorage.removeItem(KEY);localStorage.removeItem(PENDING);bridge.disconnect();
  ui.form.reset();ui.render({state:'disconnected',message:'Disconnected. Your imported progress is saved.',detail:'',error:false,invalid:false});
  if(old)request('/api/dig-pair',old.token,{action:'disconnect'}).catch(()=>{
   if(epoch===generation)ui.render({message:'Disconnected here. To remove online access, use Revoke paired browsers on canele.',error:true});
  });
 });
 async function restore(){
  if(binding||pending||requesting||restoring)return;
  restoring=true;const epoch=generation;
  try{
   const saved=JSON.parse(localStorage.getItem(KEY)||'null'),savedPending=JSON.parse(localStorage.getItem(PENDING)||'null');
   const candidate=saved&&validToken(saved.token)&&validToken(saved.id)?saved:null;
   const waiting=savedPending&&validToken(savedPending.token)&&typeof savedPending.label==='string'?savedPending:null;
   if(!candidate&&!waiting)return;
   await bridge.connect();if(epoch!==generation){bridge.disconnect();return;}
   binding=candidate;pending=candidate?null:waiting;
   ui.render({state:binding?'offline':'pending',message:binding?'Checking your canele…':'Confirm this request on your canele:',detail:pending?.label||'',error:false});
  }catch(error){if(epoch===generation)showError(error);}finally{restoring=false;}
  poll();
 }
 // A back/forward-cache page retains JS memory but loses its save lease on
 // pagehide. Reacquire from stored credentials instead of polling without it.
 window.addEventListener('pagehide',()=>{
  generation++;for(const controller of controllers)controller.abort();
  binding=pending=null;lastSequence=-1;bridge.disconnect();
 });
 window.addEventListener('pageshow',event=>{
  if(!event.persisted)return;
  const resume=()=>{if(document.hidden)return;if(requesting||restoring){setTimeout(resume,100);return;}restore();};
  resume();
 });
 // Other tabs can recover a saved binding once the active owner releases it.
 window.addEventListener('eumo-save-owner-available',()=>restore());
 window.addEventListener('storage',event=>{
  if(![KEY,PENDING].includes(event.key))return;
  if(!localStorage.getItem(KEY)&&!localStorage.getItem(PENDING)){
   generation++;binding=pending=null;lastSequence=-1;bridge.disconnect();ui.render({state:'disconnected',message:'Disconnected. Your imported progress is saved.',detail:'',error:false});
  }else restore();
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(!binding&&!pending)restore();else poll();}});
 setTimeout(restore,300);
 setInterval(()=>{if(!document.hidden)poll();},3000);
})();
