/* The shared study room reuses Eumo's existing burrow and dressed mole artwork. */
'use strict';
window.CoStudyScene=(()=>{
 const W=640,H=320,portraits=new Map(),backdrops=new Map();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const absent=new Set(['invited','left']),dimmed=new Set(['offline','disconnected']);
 let canvas=null,model=null,raf=0,expiryTimer=0,lastPaint=0,frames=0,disposed=false;
 const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const validColor=color=>/^#[a-f0-9]{6}$/i.test(color||'')?color:'#b784cf';
 const bounded=(cache,key,value,limit)=>{if(cache.size>=limit)cache.delete(cache.keys().next().value);cache.set(key,value);return value;};
 function world(){return window.WorldClock?.snapshot?.()||{period:'day',sky:'#88bdca',skyLow:'#c8dfce',cloud:'#fff8df',cloudBack:'#d9e7d8',mountain:'#789a6d',grass:'#9fb94e',grassShadow:'#587747',sun:'#f7ce58'};}
 function background(t){
  const key=t.period+':'+t.sky;if(backdrops.has(key))return backdrops.get(key);
  const result=document.createElement('canvas');result.width=W;result.height=H;
  const c=result.getContext('2d');c.imageSmoothingEnabled=false;
  const theme=window.HomeCatalog?.themes?.find(theme=>theme.id==='cave')||{id:'cave'};
  if(window.HomeScenery?.paint){
   // Decorate our own copy: HomeScenery.paint() returns a shared cached asset.
   const room=document.createElement('canvas');room.width=640;room.height=360;
   const r=room.getContext('2d');r.imageSmoothingEnabled=false;
   r.drawImage(HomeScenery.paint(theme,t),0,0);
   HomeScenery.glow?.(r,'hangingLantern',{x:273,y:225},t);
   HomeScenery.drawDecor?.(r,'archedWindow',{x:215,y:231},t);
   HomeScenery.drawDecor?.(r,'herbShelf',{x:105,y:268},t);
   HomeScenery.drawDecor?.(r,'hangingLantern',{x:273,y:225},t);
   // Enlarge the existing living room, keeping its floor and both seats visible.
   c.drawImage(room,52,172,320,160,0,0,W,H);
  }else{
   rect(c,0,0,W,H,'#76664d');rect(c,34,22,572,274,'#e9dfb9');
   rect(c,34,274,572,22,'#c8b78e');
  }
  // One long rug and table unite the two places in the same room.
  rect(c,105,281,430,23,'#9e7d59');rect(c,113,284,414,16,'#c6a67b');
  rect(c,126,288,388,2,'#ead6ad');rect(c,126,295,388,2,'#ead6ad');
  for(let x=117;x<530;x+=18)rect(c,x,282,2,20,'#a5815c');
  return bounded(backdrops,key,result,4);
 }
 function portrait(member){
  const equipped=Array.isArray(member.equipped)?member.equipped.filter(id=>typeof id==='string').slice(0,8):[];
  const color=validColor(member.color),key=color+':'+equipped.join(',');
  if(portraits.has(key))return portraits.get(key);
  const sprite=document.createElement('canvas');sprite.width=128;sprite.height=128;
  const c=sprite.getContext('2d');c.imageSmoothingEnabled=false;
  if(window.PixelArt?.drawPortrait)PixelArt.drawPortrait(sprite,{profile:{color},equipped});
  else if(window.MoleArt?.paint){c.save();c.translate(23,40);c.scale(3,3);MoleArt.paint(c,{color});c.restore();}
  return bounded(portraits,key,sprite,24);
 }
 function chair(c,x){
  rect(c,x-45,177,90,72,'#795b40');rect(c,x-40,181,80,61,'#b38b61');
  rect(c,x-36,186,72,39,'#8d9e78');rect(c,x-32,189,64,3,'#b4be95');
  rect(c,x-45,239,90,12,'#634c38');rect(c,x-40,250,10,43,'#795b40');
  rect(c,x+30,250,10,43,'#795b40');
 }
 function table(c){
  rect(c,102,220,436,5,'#795b40');rect(c,98,225,444,14,'#a37c56');
  rect(c,100,225,440,4,'#e0bd8b');rect(c,111,230,416,2,'#bb986b');
  rect(c,118,239,404,17,'#795b40');rect(c,122,241,396,9,'#b38c61');
  rect(c,132,251,14,47,'#795b40');rect(c,135,253,4,43,'#c5a173');
  rect(c,494,251,14,47,'#795b40');rect(c,497,253,4,43,'#c5a173');
  rect(c,145,286,350,6,'#795b40');
  // A small shared lamp between the two workspaces, matching the home palette.
  rect(c,310,214,22,4,'#795b40');rect(c,319,190,4,25,'#a37c56');
  rect(c,305,175,32,18,'#c9a56e');rect(c,308,171,26,5,'#efd6a1');
  rect(c,308,178,26,12,'#f7e6ba');rect(c,305,190,32,3,'#a37c56');
 }
 function papers(c,x,state,frame,motion){
  // These are desk props, not evidence that a task has been completed.
  rect(c,x-34,216,67,5,'#795b40');rect(c,x-33,205,31,12,'#f4e9c9');
  rect(c,x,205,32,12,'#fff6dc');rect(c,x-2,205,2,13,'#ccb991');
  for(let line=0;line<3;line++){rect(c,x-26,208+line*3,18,1,'#b8b495');rect(c,x+6,208+line*3,18,1,'#b8b495');}
  const working=state==='studying',n=working&&motion?Math.floor(frame/3)%3:0;
  const px=x+17+(working?n:7),py=working?202+n:211;
  for(let k=0;k<6;k++)rect(c,px+k,py-k,3,3,k<1?'#5b4b3a':k>4?'#bd8674':'#d8b76d');
  if(state==='paused'){
   rect(c,x+42,205,13,12,'#8ca8a4');rect(c,x+44,204,9,2,'#d6e1c7');
   rect(c,x+55,208,4,6,'#8ca8a4');rect(c,x+56,209,2,3,'#e9dfb9');
  }
 }
 function waveVisible(member,epoch){
  const at=Number(member.reactionAt),age=epoch-at;
  return member.reaction==='wave'&&Number.isFinite(at)&&at>0&&age>=-2000&&age<6000&&!absent.has(member.state)&&!dimmed.has(member.state);
 }
 function wave(c,x,y,motion,frame){
  const bob=motion?Math.round(Math.sin(frame*.45)):0;y+=bob;
  rect(c,x-26,y,52,31,'#795b40');rect(c,x-24,y+2,48,27,'#fff5d8');
  rect(c,x-5,y+31,10,3,'#795b40');rect(c,x-3,y+29,6,3,'#fff5d8');
  // Pixel hand: a real user-triggered wave, never an automatic presence cue.
  const sway=motion?(Math.floor(frame/3)%2)*2:0;
  rect(c,x-8+sway,y+12,18,12,'#d69978');rect(c,x-6+sway,y+10,14,13,'#f0bd98');
  rect(c,x-8+sway,y+6,3,10,'#f0bd98');rect(c,x-3+sway,y+4,3,11,'#f0bd98');
  rect(c,x+2+sway,y+5,3,10,'#f0bd98');rect(c,x+7+sway,y+8,3,10,'#f0bd98');
  rect(c,x-13+sway,y+14,6,4,'#f0bd98');
 }
 function canPaint(){return !!(canvas&&model?.visible&&canvas.isConnected&&!document.hidden&&!disposed);}
 function canAnimate(){return canPaint()&&!reduced.matches;}
 function setRunning(value){if(canvas)canvas.dataset.sceneRunning=String(value);}
 function paint(stamp=performance.now()){
  if(!canPaint())return;
  const c=canvas.getContext('2d');if(!c)return;
  c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;c.clearRect(0,0,W,H);
  c.drawImage(background(world()),0,0);
  const motion=!reduced.matches,frame=motion?Math.floor(stamp/125):0,epoch=Date.now();
  const members=(model.members||[]).slice(0,2).map(member=>!member.own&&model.connected===false&&!absent.has(member.state)?{...member,state:'offline'}:member).sort((a,b)=>Number(!!b.own)-Number(!!a.own));
  const places=[208,432];
  for(const x of places)chair(c,x);
  members.forEach((member,index)=>{
   if(absent.has(member.state))return;
   const x=places[index],offline=dimmed.has(member.state),paused=member.state==='paused';
   // Idle breathing is purely cosmetic. Only a verified studying state moves
   // the pencil; no animation changes time, rewards or a member's status.
   const bob=motion&&!offline?Math.round(Math.sin(stamp/(paused?2300:1700)+index)*1):0;
   c.save();if(offline)c.globalAlpha=.3;
   c.drawImage(portrait(member),x-96,35+bob+(paused?3:0),192,192);c.restore();
   if(waveVisible(member,epoch))wave(c,x,index===0?12:20,motion,frame);
  });
  table(c);
  members.forEach((member,index)=>{
   if(absent.has(member.state))return;
   c.save();if(dimmed.has(member.state))c.globalAlpha=.4;
   papers(c,places[index],member.state,frame,motion&&!dimmed.has(member.state));c.restore();
  });
  frames++;canvas.dataset.sceneFrame=String(frames);
  canvas.dataset.scenePhase=String(model.phase||'ready');
 }
 function scheduleExpiry(){
  clearTimeout(expiryTimer);expiryTimer=0;if(!canPaint())return;
  const epoch=Date.now(),ends=(model.members||[]).filter(member=>waveVisible(member,epoch)).map(member=>Number(member.reactionAt)+6000-epoch).filter(ms=>ms>0);
  if(ends.length)expiryTimer=setTimeout(()=>{expiryTimer=0;paint();scheduleExpiry();},Math.min(...ends)+20);
 }
 function tick(stamp){
  raf=0;if(!canAnimate()){setRunning(false);return;}
  if(stamp-lastPaint>=125){lastPaint=stamp;paint(stamp);}
  setRunning(true);raf=requestAnimationFrame(tick);
 }
 function halt(){if(raf)cancelAnimationFrame(raf);raf=0;clearTimeout(expiryTimer);expiryTimer=0;setRunning(false);}
 function resume(){
  halt();if(!canPaint())return;paint();scheduleExpiry();
  if(canAnimate()){lastPaint=performance.now();setRunning(true);raf=requestAnimationFrame(tick);}
 }
 function update(nextCanvas,nextModel){
  if(disposed||!nextCanvas?.getContext)return;
  const changed=canvas!==nextCanvas;if(changed){halt();canvas=nextCanvas;}
  model={...nextModel,members:Array.isArray(nextModel?.members)?nextModel.members.map(member=>({...member,equipped:Array.isArray(member.equipped)?[...member.equipped]:[]})):[]};
  if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;
  if(!canvas.hasAttribute('role'))canvas.setAttribute('role','img');
  if(!canvas.hasAttribute('aria-label'))canvas.setAttribute('aria-label','Shared study room');
  if(!canPaint()){halt();return;}
  if(!canAnimate()){halt();paint();scheduleExpiry();return;}
  paint();scheduleExpiry();
  if(canAnimate()&&!raf){lastPaint=performance.now();setRunning(true);raf=requestAnimationFrame(tick);}
 }
 function stop(){halt();if(model)model={...model,visible:false};}
 function dispose(){stop();disposed=true;canvas=null;model=null;portraits.clear();backdrops.clear();document.removeEventListener('visibilitychange',resume);reduced.removeEventListener?.('change',resume);window.removeEventListener('eumo-appearance',resume);}
 document.addEventListener('visibilitychange',resume);reduced.addEventListener?.('change',resume);window.addEventListener('eumo-appearance',resume);
 return {update,stop,dispose};
})();
