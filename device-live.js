'use strict';
// A read-only view. Never modifies original localStorage saves, accumulates depth,
// or sends start/pause commands back to the device.
(()=>{
 const canvas=document.querySelector('#mine'),c=canvas.getContext('2d'),status=document.querySelector('#status'),form=document.querySelector('#connect');
 let key=location.hash.slice(1),snapshot=null,age=Infinity,received=0,failed=false,sequence=-1,polling=false;
 const validKey=()=>/^[a-f0-9]{64}$/.test(key);
 form.hidden=validKey();form.onsubmit=e=>{e.preventDefault();const input=document.querySelector('#link').value.trim();key=input.includes('#')?input.split('#').pop():input;if(!validKey()){status.textContent='请粘贴完整的观看链接。';return;}location.hash=key;form.hidden=true;snapshot=null;sequence=-1;poll();};
 async function poll(){if(!validKey()||polling)return;polling=true;try{
  const response=await fetch('/api/dig-sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({action:'read'}),signal:AbortSignal.timeout(12000)});const data=await response.json();
  if(!response.ok)throw Error(data.error==='SYNC_NOT_CONFIGURED'?'同步服务尚未部署':data.error==='NO_DEVICE_DATA'?'等待小屏幕上传第一份进度':'连接失败');
  if(!Number.isSafeInteger(data.sequence)||!Number.isFinite(data.snapshot?.depth))throw Error('收到的数据无效');
  if(data.sequence>=sequence){snapshot=data.snapshot;sequence=data.sequence;age=Math.max(0,data.serverTime-Date.parse(data.updated_at));received=performance.now();}failed=false;
 }catch(e){failed=true;status.textContent=(e.message||'连接失败')+'，保留最后进度';}finally{polling=false;}}
 function rect(x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
 function render(now){
  const s=snapshot,depth=s?.depth||0,stale=failed||age+performance.now()-received>20000,dig=s?.status==='digging'&&!stale;
  const ground=Math.max(20,170-Math.min(100,depth)*1.5),feet=depth<25?170+depth*2:220;
  rect(0,0,240,280,depth<240?'#9b806c':depth<480?'#776d76':'#5f5872');
  if(depth<100){rect(0,0,240,ground,'#88bdca');rect(0,ground-5,240,6,'#9fb94e');rect(179,25,19,19,'#f7ce58');rect(27,58,41,9,'#d4e2dd');}
  for(let y=ground;y<280;y+=32)for(let x=0;x<240;x+=38)rect(x,y,10,4,'#ae9580');
  if(depth>0.1)rect(77,ground,95,Math.max(0,feet-ground),'#3d343e');
  c.save();c.translate(65,feet-88);c.scale(3,3);const frame=dig?Math.floor(now/180)%6:0;
  MoleArt.paint(c,{color:s?.color||'#a9b4c6',dig,frame,mood:'awake'});
  WardrobeArt.drawTool(rect,s?.tool||null,frame);
  for(const id of s?.equipped||[])for(const kind of ['hat','extra','scarf','glasses'])WardrobeArt[kind](rect,id);
  c.restore();rect(130,235,104,30,'#302e39');c.fillStyle='#eee4c9';c.font='18px monospace';c.textAlign='right';c.fillText(depth.toFixed(1)+'m',228,256);
  if(s&&!failed)status.textContent=stale?'小屏幕暂时离线 · 最后收到的进度':dig?'正在挖掘':s.status==='paused'?'已暂停':'等待开始';
  if(!validKey())status.textContent='从小屏幕的同步设置获取观看链接';requestAnimationFrame(render);
 }
 poll();setInterval(poll,5000);requestAnimationFrame(render);
})();
