'use strict';
// Four-digit request + physical device confirmation. Long-lived tokens never appear in the UI.
(()=>{
 const host=document.querySelector('#focus');if(!host||!window.DeviceImportBridge)return;
 const KEY='eumo-linked-watch-v2',PENDING='eumo-pair-pending-v1',panel=document.createElement('section');panel.className='device-sync-panel';
 const title=document.createElement('strong');title.textContent='连接小鼹鼠';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const form=document.createElement('form'),input=document.createElement('input');input.type='text';input.inputMode='numeric';input.pattern='[0-9]{4}';input.maxLength=4;input.required=true;input.autocomplete='off';input.placeholder='四位配对码';input.setAttribute('aria-label','小屏幕上的四位配对码');
 input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,4)});
 const connect=document.createElement('button');connect.type='submit';connect.textContent='配对小屏幕';
 const disconnect=document.createElement('button');disconnect.type='button';disconnect.textContent='断开小屏幕';disconnect.hidden=true;
 form.append(input,connect);panel.append(title,status,form,disconnect);host.prepend(panel);
 let binding=null,pending=null,requesting=false,generation=0,lastSequence=-1;
 const messages={SYNC_NOT_CONFIGURED:'同步服务尚未发布或配置。',NO_DEVICE_DATA:'等待小屏幕上传进度。',UPDATE_DEVICE_FIRMWARE:'请先更新小屏幕固件。',BROWSER_STORAGE_CONFLICT:'请关闭同站点其他标签页，刷新后重试。',END_BROWSER_SESSION_FIRST:'请先结束网页自身的计时，再配对。',DEVICE_PROGRESS_WENT_BACKWARDS:'设备存档发生回退，已停止合并。',PAIRING_EXPIRED:'配对码已过期，请在小屏幕生成新码。',INVALID_OR_EXPIRED_CODE:'配对码错误或已过期。',PAIRING_BUSY:'有人正在配对，请在小屏幕重新生成配对码。',RATE_LIMITED:'尝试过于频繁，请一分钟后重试。',FOUR_DIGITS_REQUIRED:'请输入完整的四位数字，保留开头的 0。',DEVICE_IDENTITY_CONFLICT:'同一设备存在两份导入记录，请先核对存档。'};
 function error(e){status.textContent=messages[e.message]||'连接失败，原有记录已保留，可稍后重试。';}
 async function request(path,token,body){
  const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
  let d;try{d=await r.json()}catch{throw Error('SYNC_NOT_CONFIGURED')};if(!r.ok||d.error)throw Error(d.error||'SYNC_NOT_CONFIGURED');return d;
 }
 const read=async token=>{const d=await request('/api/dig-sync',token,{action:'read'});DeviceProgress.validateSnapshot(d.snapshot);return d;};
 const secret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
 function attached(){form.hidden=true;disconnect.hidden=false;disconnect.textContent=pending?'取消配对':'断开小屏幕';}
 async function poll(){
  if(requesting||(!binding&&!pending))return;requesting=true;const epoch=generation;
  try{
   if(pending){
    const active=pending,result=await request('/api/dig-pair',active.token,{action:'poll'});if(epoch!==generation)return;
    if(!result.paired){status.textContent='请在小屏幕确认：'+active.label;return;}
    const data=await read(active.token);if(epoch!==generation)return;
    DeviceImportBridge.backup(result.deviceId);DeviceImportBridge.apply(result.deviceId,data);
    binding={token:active.token,id:result.deviceId,paired:true};localStorage.setItem(KEY,JSON.stringify(binding));pending=null;localStorage.removeItem(PENDING);lastSequence=data.sequence;attached();
    status.textContent='配对成功。小屏幕负责计时，学习记录和发现物自动同步。';return;
   }
   const active=binding,data=await read(active.token);if(epoch!==generation||binding!==active)return;if(data.sequence<lastSequence)return;
   DeviceImportBridge.apply(active.id,data);lastSequence=data.sequence;
   status.textContent=data.serverTime-Date.parse(data.updated_at)>20000?'小屏幕离线，已保留最后记录。':`小屏幕${data.snapshot.status==='digging'?'正在挖掘':data.snapshot.status==='idle'?'本次已结束':'已暂停'} · 累计 ${data.snapshot.depth.toFixed(1)} 米 · 已同步`;
  }catch(e){if(epoch===generation){DeviceImportBridge.offline();error(e);if(pending&&['PAIRING_EXPIRED','INVALID_OR_EXPIRED_CODE'].includes(e.message)){pending=null;localStorage.removeItem(PENDING);DeviceImportBridge.disconnect();form.hidden=false;disconnect.hidden=true;}}}finally{requesting=false;}
 }
 form.onsubmit=async e=>{
  e.preventDefault();if(requesting||pending||binding)return;
  if(!/^\d{4}$/.test(input.value)){error(Error('FOUR_DIGITS_REQUIRED'));return;}
  if(!confirm('配对后将小屏幕已有的深度、时间和收获加入当前存档，之后只添加新增记录。网页计时交给小屏幕控制。继续吗？'))return;
  requesting=true;connect.disabled=true;let locked=false;
  try{
   DeviceImportBridge.connect();locked=true;
   const token=secret(),label='Computer '+String(crypto.getRandomValues(new Uint16Array(1))[0]%10000).padStart(4,'0');
   await request('/api/dig-pair',token,{action:'claim',code:input.value,label});
   pending={token,label};localStorage.setItem(PENDING,JSON.stringify(pending));attached();status.textContent='请在小屏幕确认：'+label;
  }catch(err){if(locked)DeviceImportBridge.disconnect();pending=null;error(err);}finally{requesting=false;connect.disabled=false;}
 };
 disconnect.onclick=()=>{
  const old=pending||binding;generation++;pending=binding=null;lastSequence=-1;localStorage.removeItem(KEY);localStorage.removeItem(PENDING);DeviceImportBridge.disconnect();form.hidden=false;disconnect.hidden=true;
  status.textContent='已断开，导入的记录保留。';
  if(old)request('/api/dig-pair',old.token,{action:'disconnect'}).catch(()=>{status.textContent='本机已断开；云端撤销未完成，可在小屏幕撤销全部配对。'});
 };
 status.textContent='在小屏幕 Setup → Pair screen 获取四位码；在这里输入，然后在设备上确认。';
 setTimeout(()=>{if(binding||pending||requesting||generation)return;try{
  const saved=JSON.parse(localStorage.getItem(KEY)||'null'),p=JSON.parse(localStorage.getItem(PENDING)||'null');
  if(saved&&/^[a-f0-9]{64}$/.test(saved.token)&&/^[a-f0-9]{64}$/.test(saved.id)){DeviceImportBridge.connect();binding=saved;attached();poll();}
  else if(p&&/^[a-f0-9]{64}$/.test(p.token)){DeviceImportBridge.connect();pending=p;attached();poll();}
 }catch(e){error(e)}},300);
 setInterval(poll,3000);
})();
