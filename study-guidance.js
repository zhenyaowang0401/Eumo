/* Optional study cues. No activity monitoring, timer ownership, or network calls. */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.StudyGuidance=api;
})(typeof window==='object'?window:globalThis,function(root){
 'use strict';
 const PREFIX='eumo-study-guidance-v1:',TASK_DELAY=120000,SNOOZE=300000;
 const COPY={
  en:{entry:'Study prompts',close:'Close study prompts',label:'Gentle prompts',help:'Find a small first step',task:'Ready for your first small step?',pause:'Your task is still here. Continue when you’re ready.',rest:'Your planned break has ended. Ready to return?',start:'Start',resume:'Continue',later:'Remind me in 5 min',dismiss:'Dismiss',region:'Study guidance',saved:'Your reminder choice is saved on this device.',helpUnavailable:'Choose one small part of your task to start with.',actionError:'Please try again when your session is ready.'},
  zh:{entry:'学习提示',close:'关闭学习提示',label:'温和提醒',help:'找一个容易开始的小步骤',task:'准备好开始第一个小步骤了吗？',pause:'你的任务还在，准备好时就继续吧。',rest:'计划的休息时间到了，准备好回来了吗？',start:'开始',resume:'继续',later:'5 分钟后提醒',dismiss:'关闭',region:'学习引导',saved:'提醒设置保存在此设备。',helpUnavailable:'先从任务中选一个容易完成的小步骤。',actionError:'等会话准备好后再试一次。'}
 };
 const clean=value=>String(value??'').trim().slice(0,200);
 // Hashes identify an event without retaining its task text in reminder storage.
 function hash(value){let n=2166136261;for(const ch of String(value)){n^=ch.codePointAt(0);n=Math.imul(n,16777619);}return (n>>>0).toString(36);}
 function createController({storage=null,now=Date.now,taskDelay=TASK_DELAY,snoozeMs=SNOOZE}={}){
  let user='',state=null,lastSession='',lastStatus='',lastVisible=false,first=true;
  const memory=new Map();
  function read(key){try{return storage?.getItem(key)??memory.get(key)??null;}catch{return memory.get(key)??null;}}
  function write(){if(!state)return;const raw=JSON.stringify(state),key=PREFIX+user;memory.set(key,raw);try{storage?.setItem(key,raw);}catch{}}
  function load(id){
   user=hash(clean(id)||'local');let data;try{data=JSON.parse(read(PREFIX+user)||'null');}catch{}
   state={enabled:data?.enabled!==false,events:{},task:null,pause:null,usedTaskHash:typeof data?.usedTaskHash==='string'?data.usedTaskHash:''};
   if(data?.events&&typeof data.events==='object'&&!Array.isArray(data.events))for(const [key,item]of Object.entries(data.events).slice(-80)){
    if(key.length<=200&&item&&Number.isFinite(item.at)&&Number.isFinite(item.due))state.events[key]={at:item.at,due:item.due,done:item.done===true};
   }
   if(data?.task&&typeof data.task.hash==='string'&&Number.isFinite(data.task.at)&&typeof data.task.key==='string')state.task=data.task;
   if(data?.pause&&typeof data.pause.id==='string'&&typeof data.pause.key==='string')state.pause=data.pause;
   lastSession='';lastStatus='';lastVisible=false;first=true;
  }
  function prune(){const list=Object.entries(state.events);if(list.length>80){list.sort((a,b)=>b[1].at-a[1].at);state.events=Object.fromEntries(list.slice(0,80));}}
  function mark(key,done,due){state.events[key]={at:now(),due,done};prune();write();}
  function eligible(key){const event=state.events[key];return !event?.done&&(!event||event.due<=now());}
  function update(snapshot={}){
   const id=hash(clean(snapshot.userId)||'local');if(!state||id!==user)load(snapshot.userId);
   const session=snapshot.session||null,sessionId=clean(session?.id),status=session?.status||'',visible=snapshot.focusVisible!==false;
   const task=clean(snapshot.task),active=!!session;
   const explicitPreparation=Object.prototype.hasOwnProperty.call(snapshot,'taskPreparedAt');
   const preparedAt=Number(snapshot.taskPreparedAt);
   let changed=false;
   if(active&&task&&state.usedTaskHash!==hash(task)){state.usedTaskHash=hash(task);changed=true;}
   const preparing=explicitPreparation?Number.isFinite(preparedAt)&&preparedAt>0:hash(task)!==state.usedTaskHash;
   if(!task||active||!preparing){if(state.task){state.task=null;changed=true;}}
   else{
    const taskHash=hash(task);
    if(state.task?.hash!==taskHash||explicitPreparation&&state.task?.at!==preparedAt){const at=explicitPreparation?preparedAt:now();state.task={hash:taskHash,at,key:'task:'+taskHash+':'+at};changed=true;}
   }
   const explicitPause=clean(session?.pauseVersion??session?.pausedAt);
   if(status==='paused'&&sessionId){
    const samePause=state.pause?.id===sessionId&&(!explicitPause||state.pause.version===explicitPause);
    if(!samePause||!first&&lastSession===sessionId&&lastStatus==='running'){
     state.pause={id:sessionId,version:explicitPause,key:'pause:'+sessionId+':'+(explicitPause||now()),returnSeen:false};changed=true;
    }
    // Offer resume after opening or returning to the Focus screen, never by
    // interpreting mouse/keyboard inactivity as a lack of studying.
    if((first||visible&&!lastVisible)&&visible&&!state.pause.returnSeen){state.pause.returnSeen=true;changed=true;}
   }else if(state.pause&&(!active||sessionId!==state.pause.id)){state.pause=null;changed=true;}
   lastSession=sessionId;lastStatus=status;lastVisible=visible;first=false;
   if(changed)write();
   if(!state.enabled||snapshot.profileConfigured===false||snapshot.canControl===false||!visible)return null;
   const breakInfo=snapshot.coStudy||snapshot.plannedBreak||{};
   const breakId=clean(breakInfo.breakId),breakEndsAt=Number(breakInfo.breakEndsAt);
   // A planned break is explicit, not a guess based on general inactivity.
   if(breakId&&Number.isFinite(breakEndsAt)&&breakEndsAt>0&&breakEndsAt<=now()&&(!active||status==='paused')){
    const key='break:'+breakId+':'+breakEndsAt;
    if(eligible(key))return {key,type:'rest',action:status==='paused'?'resume':'start'};
   }
   if(status==='paused'&&state.pause?.returnSeen&&eligible(state.pause.key))return {key:state.pause.key,type:'pause',action:'resume'};
   if(!active&&state.task&&now()-state.task.at>=taskDelay&&eligible(state.task.key))return {key:state.task.key,type:'task',action:'start'};
   return null;
  }
  return {
   update,
   dismiss(key){if(state&&key)mark(key,true,0);},
   snooze(key){if(state&&key)mark(key,false,now()+snoozeMs);},
   setEnabled(value){if(state){state.enabled=!!value;write();}},
   get enabled(){return state?.enabled!==false;},
   // External storage updates are reconciled by reloading the active identity.
   reload(id){load(id);}
  };
 }
 function init(adapter={}){
  const document=root.document;if(!document)return null;
  const mount=typeof adapter.mount==='string'?document.querySelector(adapter.mount):adapter.mount||document.getElementById('studyGuidance');
  if(!mount)return null;
  if(mount.__studyGuidance)mount.__studyGuidance.destroy();
  let storage=null;try{storage=root.localStorage;}catch{}
  const controller=createController({storage,now:adapter.now||Date.now,taskDelay:adapter.taskDelay??TASK_DELAY,snoozeMs:adapter.snoozeMs??SNOOZE});
  mount.classList.add('study-guidance');mount.setAttribute('data-no-translate','');
  mount.innerHTML='<button class="study-guidance-trigger" type="button" aria-expanded="false" aria-controls="studyGuidancePopover"></button><section id="studyGuidancePopover" class="study-guidance-popover" hidden><button class="study-guidance-close" type="button">×</button><div class="study-guidance-tools"><label class="study-guidance-setting"><input type="checkbox" id="studyGuidanceEnabled"><span></span></label><button class="study-guidance-help" type="button"></button></div><section class="study-guidance-cue" hidden><p class="study-guidance-message" role="status" aria-live="polite"></p><div class="study-guidance-actions"><button type="button" data-guidance-action="primary"></button><button type="button" data-guidance-action="later"></button><button type="button" data-guidance-action="dismiss"></button></div></section><p class="study-guidance-feedback" role="status" hidden></p></section>';
  const trigger=mount.querySelector('.study-guidance-trigger'),popover=mount.querySelector('.study-guidance-popover'),close=mount.querySelector('.study-guidance-close');
  const checkbox=mount.querySelector('input'),label=mount.querySelector('.study-guidance-setting span'),help=mount.querySelector('.study-guidance-help'),cue=mount.querySelector('.study-guidance-cue'),message=mount.querySelector('.study-guidance-message'),feedback=mount.querySelector('.study-guidance-feedback');
  const primary=mount.querySelector('[data-guidance-action="primary"]'),later=mount.querySelector('[data-guidance-action="later"]'),dismiss=mount.querySelector('[data-guidance-action="dismiss"]');
  let current=null,snapshot={},lastCopy='',busy=false,disposed=false,opened=false,manual=false,lastAutoKey='';
  function copy(){return COPY[root.EumoI18n?.language==='zh'?'zh':'en'];}
  function position(){
   if(!opened)return;
   const rect=trigger.getBoundingClientRect(),width=popover.offsetWidth,height=popover.offsetHeight;
   popover.style.left=Math.max(12,Math.min(rect.right-width,root.innerWidth-width-12))+'px';
   popover.style.top=Math.max(12,Math.min(rect.bottom+8,root.innerHeight-height-12))+'px';
  }
  function setOpen(value,byUser=false){opened=value;manual=value&&byUser;popover.hidden=!value;trigger.setAttribute('aria-expanded',String(value));if(value)position();}
  function closePanel(restoreFocus=false){
   if(current)controller.dismiss(current.key);
   setOpen(false);if(restoreFocus)trigger.focus();refresh();
  }
  function refresh(){
   if(disposed)return;
   try{snapshot=adapter.getSnapshot?.()||{};}catch{return;}
   current=controller.update(snapshot);const text=copy();
   mount.hidden=snapshot.profileConfigured===false||snapshot.focusVisible===false;
   mount.setAttribute('aria-label',text.region);trigger.textContent=text.entry;trigger.title=text.entry;close.setAttribute('aria-label',text.close);popover.setAttribute('aria-label',text.region);label.textContent=text.label;checkbox.checked=controller.enabled;checkbox.title=text.saved;
   help.textContent=text.help;help.disabled=busy||snapshot.canControl===false;
   later.textContent=text.later;dismiss.textContent=text.dismiss;
   cue.hidden=!current;
   if(current){
    const next=current.key+'|'+text[current.type];
    if(next!==lastCopy){message.textContent=text[current.type];lastCopy=next;}
    primary.textContent=text[current.action];primary.disabled=busy||typeof adapter[current.action]!=='function';
   }else {lastCopy='';lastAutoKey='';}
   if(current&&current.key!==lastAutoKey&&!document.querySelector('dialog[open]')){lastAutoKey=current.key;setOpen(true,false);}
   else if(!current&&opened&&!manual)setOpen(false);
   if(mount.hidden)setOpen(false);else position();
  }
  trigger.addEventListener('click',()=>{if(opened)closePanel();else{setOpen(true,true);refresh();}});
  close.addEventListener('click',()=>closePanel(true));
  checkbox.addEventListener('change',()=>{controller.setEnabled(checkbox.checked);refresh();});
  later.addEventListener('click',()=>{if(current){controller.snooze(current.key);refresh();}});
  dismiss.addEventListener('click',()=>{if(current){controller.dismiss(current.key);refresh();}});
  primary.addEventListener('click',async()=>{
   if(!current||busy)return;const event={...current};busy=true;feedback.hidden=true;refresh();
   try{const result=await adapter[event.action]?.();if(result!==false)controller.dismiss(event.key);else{feedback.textContent=copy().actionError;feedback.hidden=false;}}
   catch{feedback.textContent=copy().actionError;feedback.hidden=false;}
   finally{busy=false;refresh();}
  });
  help.addEventListener('click',async()=>{
   if(busy)return;
   try{
    if(adapter.openTaskHelp)await adapter.openTaskHelp(clean(snapshot.task||snapshot.session?.task));
    else {feedback.textContent=copy().helpUnavailable;feedback.hidden=false;}
   }catch{feedback.textContent=copy().helpUnavailable;feedback.hidden=false;}
  });
  function onStorage(event){if(event.key?.startsWith(PREFIX)){controller.reload(snapshot.userId);refresh();}}
  function outside(event){if(opened&&!mount.contains(event.target))closePanel();}
  function escape(event){if(event.key==='Escape'&&opened&&!document.querySelector('dialog[open]')){event.preventDefault();closePanel(mount.contains(document.activeElement));}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);root.addEventListener('resize',position);root.addEventListener('scroll',position,true);
  root.addEventListener('eumo-language',refresh);root.addEventListener('storage',onStorage);
  const timer=root.setInterval(refresh,1000);refresh();
  const handle={refresh,destroy(){disposed=true;root.clearInterval(timer);root.removeEventListener('eumo-language',refresh);root.removeEventListener('storage',onStorage);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);root.removeEventListener('resize',position);root.removeEventListener('scroll',position,true);mount.replaceChildren();delete mount.__studyGuidance;}};
  mount.__studyGuidance=handle;return handle;
 }
 return {createController,init,COPY,defaults:{taskDelay:TASK_DELAY,snoozeMs:SNOOZE}};
});
