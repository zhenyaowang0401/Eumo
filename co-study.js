/* Incremental shared-study UI. The existing app owns personal time, rewards and saves. */
'use strict';
window.CoStudy=(()=>{
 const PREF='eumo-co-study-ui-v1',DRAFT='eumo-co-study-drafts-v1',GAPS='eumo-co-study-gaps-v1';
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const words={
  wave:['Wave','招手'],waved:['Waved','已招手'],waveFailed:['Wave not sent. Try again.','招手未送达，请重试。'],waveLimit:['Wave limit reached. Try again later.','招手次数已达上限，请稍后再试。'],sharedRoom:['Shared study room','双人学习房间'],
  title:['Study together','共学'],open:['Open shared study','展开共学'],close:['Close shared study','关闭共学'],breakStart:['5-min break','休息 5 分钟'],breakTime:['Break','休息'],breakDone:['Ready when you are.','休息结束，准备后开始。'],
  friends:['Friends','好友'],choose:['Choose a friend','选择好友'],invite:['Invite','邀请'],together:['Together','一起学'],challenge:['Challenge','挑战'],mode:['Mode','模式'],format:['2 rounds · 20 min','2 轮 · 每轮 20 分钟'],
  incoming:['Invitations','邀请'],accept:['Join','加入'],decline:['Decline','拒绝'],cancel:['Cancel invite','取消邀请'],waiting:['Waiting for your friend…','等待好友加入…'],inviteInfo:['Invites expire in 5 minutes.','邀请 5 分钟后过期。'],
  connect:['Connect friends','连接好友'],empty:['Add a friend to begin.','先添加一位好友。'],auth:['Connect to Friends first.','请先连接好友。'],loading:['Loading…','加载中…'],retry:['Retry','重试'],refresh:['Refresh','刷新'],
  task:['Task','任务'],taskPlaceholder:['One task for this round','这轮想做什么？'],share:['Share task','分享任务'],consent:['Share ready, study and pause status','共享准备、学习和暂停状态'],privacy:['Tasks are private until you share them. Chats and review notes stay private.','任务由你选择是否分享；聊天和回顾笔记仅自己可见。'],
  ready:['Ready','准备好了'],unready:['Undo ready','取消准备'],start:['Start together','一起开始'],round:['Round','轮次'],of:['of','/'],you:['You','你'],host:['Host','房主'],readyCount:['ready','已准备'],waitReady:['Waiting for friend','等待好友准备'],waitHost:['Waiting for host','等待房主开始'],allReady:['Ready to start','可以开始了'],starting:['Starting','即将开始'],lastSync:['Last sync','上次同步'],localTime:['Local time','本机计时'],roomActive:['In room','房间中'],
  pause:['Pause','暂停'],resume:['Continue','继续'],end:['End round','结束本轮'],left:['Left','已离开'],leave:['Leave','离开'],confirmLeave:['Leave? Your saved progress stays.','离开共学？已保存的进度会保留。'],
  studying:['Studying','学习中'],paused:['Paused','已暂停'],joined:['Preparing','准备中'],invited:['Invited','已邀请'],review_pending:['Review due','待回顾'],completed:['Finished','已完成'],stopped:['Ended','已结束'],countdown:['Starting in','即将开始'],seconds:['s','秒'],
  peerWait:['Your friend is still studying.','好友还在学习。'],finished:['Session finished','共学结束'],cancelled:['Invite closed','邀请已关闭'],expired:['Invite expired','邀请已过期'],newSession:['New session','新一轮共学'],
  review:['Review','回顾'],reviewQuestion:['Progress','进展'],complete:['Completed','已完成'],partial:['Some progress','部分完成'],adjusted:['Adjusted goal','调整目标'],note:['Note · optional','笔记 · 选填'],submit:['Save','保存'],reviewSaved:['Saved','已保存'],edit:['Edit','编辑'],cancelEdit:['Cancel','取消'],
  points:['pts','分'],point:['pt','分'],pointsHelp:['Finish a confirmed round and save a review to earn 1 point. Maximum 2; ties are welcome. Points do not measure grades or task difficulty.','完成已确认的轮次并保存回顾可得 1 分，最多 2 分，可并列；积分不代表成绩或任务难度。'],unverified:['Pending','待确认'],privateTask:['Private task','任务未分享'],rules:['Rules & privacy','规则与隐私'],timingHelp:['Pause independently. A 5-minute break between rounds is optional. Unconfirmed connection gaps do not earn challenge points.','每人可独立暂停，轮间可休息 5 分钟；无法确认的断网区间不计挑战分。'],
  offline:['Offline · local progress kept','已离线 · 本地进度保留'],notConfigured:['Shared study unavailable. Solo works.','共学暂不可用，仍可单人学习。'],unavailable:['Cannot connect. Local progress kept.','连接失败，本地进度保留。'],
  conflict:['Room updated. Please retry.','房间已更新，请重试。'],notFriend:['Friend unavailable. Refresh Friends.','好友不可用，请刷新好友列表。'],rate:['Try again in a moment.','请稍后重试。'],
  personalBusy:['End your current session first.','请先结束当前会话。'],device:['Canele controls the timer.','计时由 Canele 控制。'],otherTab:['Continue in the other window.','请在另一窗口继续。'],
  recover:['Continue here','在此继续'],recoverHint:['This round has started.','本轮已开始。'],statusUnknown:['Offline','离线'],saved:['Saved locally','已保存在本机'],roomShare:['Only invited friends can join.','仅受邀好友可加入。'],chooseRequired:['Choose a friend.','请选择好友。'],consentRequired:['Confirm status sharing.','请确认状态分享。'],taskRequired:['Add a task.','请填写任务。'],syncing:['Updating…','更新中…'],live:['Studying together','共学中'],inviteCount:['invite','邀请'],minutes:['min','分钟']
 };
 const t=k=>words[k]?.[window.EumoI18n?.language==='zh'?1:0]||k;
 const uid=()=>globalThis.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16);});
 const terminal=new Set(['finished','cancelled','expired']);
 let adapter,root,model=null,selectedId=null,expanded=false,rulesOpen=false,working=false,polling=false,notice='',failure='',connected=false,disposed=false,clockAt=0,clockBase=0,lastHeartbeat=0,lastSyncAction=0,autoStarting=false,timerActionInFlight=false,startedRounds=new Set(),dismissed=new Set(),lastRender='',lastRoomVersion=null;
 let pollTimer=null,tickTimer=null,signalTimer=null,signalController=null,signalBusy=false,waveBusy=false,waveQueued=false,signalRoomId=null,signalSelfId=null,wavePending=null,signals=[];const pending=new Map(),drafts={},gaps={};
 function read(){try{return adapter?.read?.()||{};}catch{return {};}}
 function now(){return clockBase?clockBase+(performance.now()-clockAt):Date.now();}
 function savePrefs(){try{localStorage.setItem(PREF,JSON.stringify({expanded,selectedId,rulesOpen}));}catch{}}
 function draftKey(room){return `${model?.self?.id||'local'}:${room?.id||'new'}:${room?.roundIndex||0}`;}
 function draft(room){const key=draftKey(room);if(!drafts[key]){const me=member(room);drafts[key]={task:me?.task||read().lastTask||'',share:!!me?.shareTask,consent:false,reviewOutcome:me?.review?.outcome||'partial',note:me?.review?.note||''};}return drafts[key];}
 function persistDraft(){try{localStorage.setItem(DRAFT,JSON.stringify(drafts));}catch{}}
 function persistGaps(){try{localStorage.setItem(GAPS,JSON.stringify(gaps));}catch{}}
 function markGap(source){if(source){gaps[source]=true;persistGaps();}}
 function member(room=currentRoom()){return room?.members?.find(m=>m.id===model?.self?.id)||null;}
 function currentRoom(){const rooms=model?.rooms||[];return rooms.find(r=>r.id===selectedId)||(!dismissed.has(model?.room?.id)?model?.room:null)||null;}
 function activeRoom(){const r=currentRoom();return r&&!terminal.has(r.status)&&r.status!=='inviting'?r:null;}
 function matchingSession(room=currentRoom()){const me=member(room),s=read().session;return !!(s&&me?.sourceSessionId&&s.id===me.sourceSessionId);}
 function owned(){const s=read();return s.canControl!==false&&s.mayWriteProgress!==false&&s.canSave!==false;}
 function blockReason(room=currentRoom()){
  const s=read();if(s.deviceControl)return 'device';if(s.session&&!matchingSession(room))return 'personalBusy';if(s.session&&!owned())return 'otherTab';return '';
 }
 function incoming(){return(model?.rooms||[]).filter(r=>r.status==='inviting'&&r.guestId===model?.self?.id&&!dismissed.has(r.id));}
 function friendList(){return(window.FriendsClient?.getPlayers?.()||[]).filter(f=>f.live&&f.profileId);}
 // Reactions use their own request ledger; they never advance the round or timer.
 function canSignal(room=currentRoom()){
  return !!(expanded&&!document.hidden&&connected&&room&&['ready','active','between_rounds'].includes(room.status)&&room.members?.length===2&&room.members.every(m=>!['invited','left'].includes(m.status)));
 }
 function waveAt(){return Number(signals.find(v=>v.userId===model?.self?.id)?.at)||0;}
 function syncSignals(){
  const room=currentRoom(),selfId=model?.self?.id;
  if(signalRoomId!==room?.id||signalSelfId!==selfId){
   signalController?.abort();signalRoomId=room?.id||null;signalSelfId=selfId||null;signals=[];wavePending=null;waveQueued=false;
  }
  if(!canSignal(room)){clearTimeout(signalTimer);signalTimer=null;return;}
  if(!signalTimer&&!signalBusy)signalTimer=setTimeout(()=>{signalTimer=null;fetchSignals(false);},200);
 }
 async function fetchSignals(wave=false){
  const room=currentRoom(),actorId=model?.self?.id;
  if(disposed||!canSignal(room))return;
  if(signalBusy){if(wave&&!waveBusy){waveQueued=true;render();}return;}
  if(wave&&now()-waveAt()<5000)return;
  clearTimeout(signalTimer);signalTimer=null;signalBusy=true;waveBusy=wave;
  const controller=new AbortController();signalController=controller;
  const timeout=setTimeout(()=>controller.abort(),8000),roomId=room.id;
  if(wave&&!wavePending)wavePending=uid();
  const requestId=wavePending;
  if(wave)render();
  try{
   const response=await fetch('/api/co-study',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({action:wave?'wave':'signal-state',roomId,...(wave?{requestId}:{})})});
   const data=await response.json();
   if(!response.ok||data.error)throw Error(data.error||'SIGNAL_UNAVAILABLE');
   if(currentRoom()?.id!==roomId||model?.self?.id!==actorId)return;
   if(data.self?.id!==actorId||data.roomId!==roomId||!Array.isArray(data.signals))throw Error('INVALID_SIGNAL');
   const ids=new Set(room.members.map(m=>m.id));
   signals=data.signals.filter(v=>ids.has(v.userId)&&v.type==='wave'&&typeof v.id==='string'&&Number.isFinite(v.at)&&v.at<=now()+1000&&now()-v.at<6000);
   if(wave)wavePending=null;
  }catch(error){
   if(wave&&currentRoom()?.id===roomId&&model?.self?.id===actorId&&error.name!=='AbortError'){
    notice=t(error.message==='WAVE_LIMITED'?'waveLimit':error.message==='RATE_LIMITED'||error.message==='REQUEST_LIMITED'?'rate':'waveFailed');
    if(['INVALID_STATE','NOT_FRIENDS','ROOM_NOT_FOUND','UNAUTHORIZED'].includes(error.message))wavePending=null;
   }else if(wave&&error.name==='AbortError'&&currentRoom()?.id===roomId)notice=t('waveFailed');
  }finally{
   clearTimeout(timeout);signalBusy=false;waveBusy=false;if(signalController===controller)signalController=null;
   // Install the next poll before render, so render cannot create another timer.
   if(!disposed&&canSignal()){
    if(waveQueued){waveQueued=false;signalTimer=setTimeout(()=>{signalTimer=null;fetchSignals(true);},0);}
    else signalTimer=setTimeout(()=>{signalTimer=null;fetchSignals(false);},2500);
   }else waveQueued=false;
   render();
  }
 }
 function renderScene(room=currentRoom(),s=read()){
  const canvas=$('coStudyScene');
  if(!canvas||!room||!expanded){window.CoStudyScene?.stop();return;}
  const members=[...(room.members||[])].sort((a,b)=>Number(b.id===model?.self?.id)-Number(a.id===model?.self?.id)).map(m=>{
   const own=m.id===model?.self?.id,local=own&&matchingSession(room),friend=friendList().find(f=>f.profileId===m.id);
   let state=local?(s.session.status==='running'?'studying':'paused'):m.ready?'ready':m.status;
   if(room.status==='active'&&room.startsAt>now())state='ready';
   else if(own&&state==='studying'&&!local)state='joined';
   else if(!own&&['studying','paused'].includes(state)&&(!connected||!Number(m.lastSeen)||now()-Number(m.lastSeen)>90000))state='offline';
   const signal=signals.find(v=>v.userId===m.id&&now()-v.at<6000);
   return{id:m.id,name:m.name||'Momo',own,color:m.color||'#b784cf',equipped:own?s.equipped||[]:friend?.equipped||[],state,ready:!!m.ready,...(signal?{reaction:'wave',reactionAt:Date.now()-(now()-signal.at)}:{})};
  });
  window.CoStudyScene?.update(canvas,{roomId:room.id,members,phase:room.status,connected,visible:expanded&&!document.hidden});
  const live=$('coStudyReactionStatus');if(live)live.textContent=members.filter(m=>m.reaction).map(m=>`${m.name}: ${t('wave')}`).join(' · ');
 }
 function errorKey(code){if(['UNAUTHORIZED','FRIENDS_REQUIRED'].includes(code))return'auth';if(/NOT_CONFIGURED|MIGRATION/.test(code))return'notConfigured';if(/RATE|LIMIT/.test(code))return'rate';if(/NOT_FRIEND|FRIENDSHIP/.test(code))return'notFriend';if(/CONFLICT|VERSION|STALE|REQUEST_REUSED|MEMBER_BUSY|NOT_FOUND|INVALID_STATE|ROUND|EXPIRED/.test(code))return'conflict';return navigator.onLine===false?'offline':'unavailable';}
 async function request(action,extra={},opts={}){
  if(disposed)return null;
  if(action!=='state'&&working)return null;
  if(action==='state'&&(polling||working))return null;
  const mutation=action!=='state';if(mutation)working=true;else polling=true;
  const room=currentRoom(),actorId=model?.self?.id;let input={action,...extra};
  if(mutation&&action!=='create'&&!input.roomId&&room)input.roomId=room.id;
  if(action==='state'&&selectedId&&!input.roomId)input.roomId=selectedId;
  if(['heartbeat','pause','resume','finish'].includes(action)&&gaps[input.sourceSessionId])input.uncertainInterval=true;
  const signature=JSON.stringify(input);
  if(mutation){
   if(pending.has(signature))input={...pending.get(signature)};
   else{input.requestId=uid();if(['ready','settings','start','accept','cancel','decline'].includes(action)&&room?.id===input.roomId&&Number.isFinite(room.version))input.expectedVersion=room.version;if(['pause','resume','finish'].includes(action)){const own=member(room);input.expectedControlVersion=Number(own?.controlVersion)||0;}pending.set(signature,{...input});}
  }
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  if(mutation)render();
  try{
   const post=async body=>{
    const response=await fetch('/api/co-study',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    let data;try{data=await response.json();}catch{throw Error('CO_STUDY_UNAVAILABLE');}
    return{response,data};
   };
   let {response,data}=await post(input);
   // Both friends can press Ready before the next room poll. Retry that intent
   // once when only the other member changed; never accept a changed mode/round
   // or overwrite this member's change from another tab.
   if(action==='ready'&&data?.error==='STALE_VERSION'&&room?.id===input.roomId){
    const fresh=await post({action:'state',roomId:input.roomId}),latest=fresh.data?.room;
    const before=room.members?.find(m=>m.id===actorId),after=latest?.members?.find(m=>m.id===actorId);
    const sameContext=fresh.response.ok&&fresh.data?.self?.id===actorId&&latest?.id===room.id&&
     ['ready','between_rounds'].includes(latest.status)&&
     ['status','mode','roundId','roundIndex','hostId','guestId','plannedSeconds','maxRounds'].every(k=>latest[k]===room[k]);
    const sameMember=before&&after&&after.status!=='left'&&
     ['status','ready','task','shareTask'].every(k=>after[k]===before[k]);
    if(sameContext&&sameMember&&Number.isSafeInteger(latest.version)){
     input={...input,requestId:uid(),expectedVersion:latest.version};pending.set(signature,{...input});
     ({response,data}=await post(input));
    }
   }
   if(!response.ok||data.error){const err=Error(data.error||'CO_STUDY_UNAVAILABLE');err.code=data.error;throw err;}
   if(!data.self?.id||!Array.isArray(data.rooms))throw Error('CO_STUDY_UNAVAILABLE');
   if(mutation)pending.delete(signature);if(input.uncertainInterval){delete gaps[input.sourceSessionId];persistGaps();}
   // A slower poll must never overwrite a newer mutation or member status.
   const oldRooms=new Map((model?.rooms||[]).map(r=>[r.id,r]));
   data.rooms=data.rooms.map(r=>Number(oldRooms.get(r.id)?.version)>Number(r.version)?oldRooms.get(r.id):r);
   if(data.room)data.room=data.rooms.find(r=>r.id===data.room.id)||data.room;
   const newerClock=!model||Number(data.serverTime)>=Number(model.serverTime);
   model={...data,serverTime:newerClock?data.serverTime:model.serverTime};connected=true;failure='';if(newerClock){clockBase=Number(data.serverTime)||Date.now();clockAt=performance.now();}
   if(data.room&&!dismissed.has(data.room.id)&&(mutation||!selectedId))selectedId=data.room.id;
   if(!selectedId){const candidate=data.rooms.find(r=>!terminal.has(r.status)&&r.status!=='inviting')||data.rooms.find(r=>r.status==='inviting'&&r.hostId===data.self.id);if(candidate)selectedId=candidate.id;}
   const selected=currentRoom();if(selected&&!terminal.has(selected.status)){if(selected.status!=='active')lastRoomVersion={roomId:selected.id,roundId:null};else if(room?.id===selected.id&&room.status!=='active'){lastRoomVersion={roomId:selected.id,roundId:selected.roundId};scheduleStart(selected);}}
   savePrefs();return data;
  }catch(e){connected=false;if(['heartbeat','pause','resume','finish'].includes(action))markGap(input.sourceSessionId);const code=e.code||e.message||'';if(action==='state'&&selectedId&&['NOT_FRIENDS','ROOM_NOT_FOUND','UNAUTHORIZED'].includes(code)){selectedId=null;if(model)model.room=null;savePrefs();if(code!=='UNAUTHORIZED')setTimeout(refresh,0);}if(code==='UNAUTHORIZED'){model=null;selectedId=null;savePrefs();}failure=errorKey(code);if(mutation&&['conflict','notFriend','auth'].includes(failure))pending.delete(signature);if(mutation&&failure==='conflict'){notice=t('conflict');setTimeout(refresh,0);}return null;}
  finally{clearTimeout(timer);if(mutation)working=false;else polling=false;render();schedule();if(action!=='heartbeat'&&!timerActionInFlight)queueMicrotask(reconcile);}
 }
 function schedule(){clearTimeout(pollTimer);if(disposed)return;const r=currentRoom();pollTimer=setTimeout(()=>refresh(),r&&!terminal.has(r.status)?5000:expanded?12000:30000);}
 async function refresh(){if(!root||disposed)return;if(!read().profileConfigured&&!expanded){schedule();return;}return request('state');}
 function button(id,key,action,disabled=false,cls=''){return `<button type="button" ${id?`id="${id}"`:''} data-co-action="${action}" class="${cls}" ${disabled?'disabled':''}>${esc(t(key))}</button>`;}
 function statusLabel(m,room=currentRoom()){
  if(!m)return '';
  if(room?.status==='active'&&['studying','paused'].includes(m.status)){
   if(Number(room.startsAt)>now())return t('starting');
   if(m.id===model?.self?.id&&matchingSession(room))return t(read().session.status==='running'?'studying':'paused');
   if(!connected||(Number(m.lastSeen)&&now()-Number(m.lastSeen)>90000))return t('statusUnknown');
  }
  return t(m.ready?'ready':m.status);
 }
 function formatSeconds(seconds){const n=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
 function render(){
  if(!root||disposed)return;const r=currentRoom(),me=member(r),s=read(),busy=working,invites=incoming(),d=draft(r),block=blockReason(r),isHost=r?.hostId===model?.self?.id;
  const focus=document.activeElement?.closest?.('#coStudyPanel')?{id:document.activeElement.id,start:document.activeElement.selectionStart,end:document.activeElement.selectionEnd}:null;
  const headingDetail=invites.length?`${invites.length} ${t('inviteCount')}`:r?.status==='active'?t('roomActive'):r&&['ready','between_rounds'].includes(r.status)?`${(r.members||[]).filter(m=>m.ready&&m.status!=='left').length}/2 ${t('readyCount')}`:'';
  const toggle=$('coStudyToggle');toggle.innerHTML=`<span class="co-study-mark" aria-hidden="true">✦</span><span>${esc(t('title'))}</span>${headingDetail?`<b class="co-study-summary">${esc(headingDetail)}</b>`:''}`;toggle.setAttribute('aria-expanded',String(expanded));
  $('coStudyDialogTitle').textContent=t('title');$('coStudyClose').textContent='×';$('coStudyClose').setAttribute('aria-label',t('close'));
  let html='';
  if(failure)html+=`<div class="co-study-notice" role="status"><span>${esc(t(failure))}</span>${button('coStudyRetry',failure==='auth'?'connect':'retry',failure==='auth'?'friends':'refresh',busy)}</div>`;
  else if(!model)html+=`<p id="coStudyLoading">${esc(t('loading'))}</p>`;
  html+=`<p id="coStudyStatus" class="co-study-feedback" role="status" aria-live="polite">${esc(notice||(busy?t('syncing'):''))}</p>`;
  if(invites.length)html+=`<section class="co-study-invitations"><h3>${esc(t('incoming'))}</h3>${invites.map(inv=>{const host=inv.members.find(m=>m.id===inv.hostId);return `<article class="co-study-invitation"><span><strong>${esc(host?.name||'Momo')}</strong><small>${esc(t(inv.mode==='challenge'?'challenge':'together'))} · ${esc(t('format'))}</small></span><div><button type="button" data-co-action="accept" data-room="${esc(inv.id)}" ${busy?'disabled':''}>${esc(t('accept'))}</button><button type="button" data-co-action="decline" data-room="${esc(inv.id)}" ${busy?'disabled':''}>${esc(t('decline'))}</button></div></article>`;}).join('')}</section>`;
  if(r){
   const members=[...(r.members||[])].sort((a,b)=>Number(b.id===model?.self?.id)-Number(a.id===model?.self?.id)),readyCount=members.filter(m=>m.ready&&m.status!=='left').length,allReady=members.length===2&&readyCount===2,phase=r.status;
   html+=`<section class="co-study-room" data-co-room="${esc(r.id)}" data-co-phase="${esc(phase)}"><div class="co-study-room-heading"><h3>${esc(t(r.mode==='challenge'?'challenge':'together'))}</h3><span>${esc(t('round'))} ${r.roundIndex||1}/${r.maxRounds||2} · ${Math.round((r.plannedSeconds||1200)/60)} ${esc(t('minutes'))}</span>${['ready','active','between_rounds'].includes(phase)?button('coStudyWave',now()-waveAt()<5000?'waved':'wave','wave',busy||waveBusy||waveQueued||!canSignal(r)||now()-waveAt()<5000,'co-study-wave'):''}</div>`;
   if(phase==='inviting')html+=`<p>${esc(t('waiting'))}</p>`;
   html+=`<div class="co-study-stage"><canvas id="coStudyScene" width="640" height="320" role="img" aria-label="${esc(t('sharedRoom'))}"></canvas><span id="coStudyReactionStatus" class="sr-only" role="status" aria-live="polite"></span><div class="co-study-members co-study-room-roster">${members.map(m=>{
    const own=m.id===model?.self?.id,local=own&&matchingSession(r),elapsed=local?s.session.elapsed:m.elapsedSeconds,task=own?d.task:m.shareTask&&m.task;
    const stale=!local&&['studying','paused'].includes(m.status)&&(!connected||Number(m.lastSeen)&&now()-Number(m.lastSeen)>90000);
    return `<article class="co-member${own?' co-member-self':''}" data-co-member="${esc(m.id)}" data-co-status="${stale?'offline':local?(s.session.status==='running'?'studying':'paused'):m.status}"><div class="co-member-identity"><strong>${esc(m.name||'Momo')}</strong>${own?`<span class="co-member-you">${esc(t('you'))}</span>`:''}${m.id===r.hostId?`<small class="co-member-host">${esc(t('host'))}</small>`:''}</div><div class="co-member-details"><span class="co-member-status">${esc(statusLabel(m,r))}</span>${r.roundId?`<span class="co-member-time" data-co-time="${esc(m.id)}">${formatSeconds(elapsed)}<small> / ${formatSeconds(r.plannedSeconds)}</small></span>${!own?`<small class="co-member-time-label">${esc(t('lastSync'))}</small>`:local&&!connected?`<small class="co-member-time-label">${esc(t('localTime'))}</small>`:''}`:''}${task?`<span class="co-member-task" title="${esc(task)}">${esc(task)}</span>`:''}${r.mode==='challenge'?`<span class="co-member-points">${Number(m.points)||0} ${esc(t('points'))}${(m.verification==='pending_verification'||own&&gaps[m.sourceSessionId])?` · ${esc(t('unverified'))}`:''}</span>`:''}</div></article>`;
   }).join('')}</div></div><div class="co-study-controls">`;
   if(phase==='between_rounds')html+=`<div class="co-study-break">${d.breakEndsAt?`<span>${esc(t(now()<d.breakEndsAt?'breakTime':'breakDone'))}${now()<d.breakEndsAt?' · '+formatSeconds((d.breakEndsAt-now())/1000):''}</span>`:button('coStudyBreak','breakStart','break',false)}</div>`;
   if(['ready','between_rounds'].includes(phase)&&me?.status!=='left'){
    html+=`<div id="coStudyReadiness" class="co-study-readiness${allReady?' is-ready':''}" role="status" aria-live="polite"><strong>${readyCount}/2 ${esc(t('readyCount'))}</strong>${allReady?`<span>${esc(t(isHost?'allReady':'waitHost'))}</span>`:me?.ready?`<span>${esc(t('waitReady'))}</span>`:''}</div><div class="co-study-preparation"><div class="co-study-fields" ${me?.ready?'hidden':''}><label for="coStudyTask">${esc(t('task'))}</label><input id="coStudyTask" maxlength="100" autocomplete="off" placeholder="${esc(t('taskPlaceholder'))}" value="${esc(d.task)}" ${me?.ready?'disabled':''}><label class="co-study-check"><input id="coStudyShare" type="checkbox" ${d.share?'checked':''} ${me?.ready?'disabled':''}>${esc(t('share'))}</label><label class="co-study-check"><input id="coStudyConsent" type="checkbox" ${d.consent?'checked':''} ${me?.ready?'disabled':''}>${esc(t('consent'))}</label>`;
    if(isHost&&!r.roundIndex)html+=`<label class="co-study-mode-label" for="coStudyRoomMode">${esc(t('mode'))}<select id="coStudyRoomMode" ${busy?'disabled':''}><option value="together" ${r.mode==='together'?'selected':''}>${esc(t('together'))}</option><option value="challenge" ${r.mode==='challenge'?'selected':''}>${esc(t('challenge'))}</option></select></label>`;
    html+='</div>';
    if(block)html+=`<p class="co-study-warning">${esc(t(block))}</p>`;
    html+=`<div class="co-study-actions">${button('coStudyReady',me?.ready?'unready':'ready','ready',busy||(!me?.ready&&!!block),!me?.ready?'co-primary':'')}${isHost?button('coStudyStart','start','start',busy||!allReady||!!block,allReady?'co-primary':''):''}</div></div>`;
   }
   if(phase==='active'){
    if(Number(r.startsAt)>now())html+=`<p class="co-study-countdown">${esc(t('countdown'))} <b id="coStudyCountdown">${Math.max(0,Math.ceil((r.startsAt-now())/1000))}</b> ${esc(t('seconds'))}</p>`;
    else if(matchingSession(r)||['studying','paused'].includes(me?.status)){
     if(block)html+=`<p class="co-study-warning">${esc(t(block))}</p>`;
     if(!matchingSession(r)&&!s.history?.some(h=>h.id===me.sourceSessionId))html+=`<p>${esc(t('recoverHint'))}</p>${button('coStudyRecover','recover','recover',busy||!!block,'co-primary')}`;
     else if(matchingSession(r))html+=`<div class="co-study-actions co-study-session-actions">${button('coStudyPause',s.session.status==='running'?'pause':'resume','toggle',busy||!owned(),'co-primary')}${button('coStudyEnd','end','finish',busy||!owned())}</div>`;
    }
    if(['review_pending','completed','stopped'].includes(me?.status)&&members.some(m=>m.id!==me.id&&['studying','paused'].includes(m.status)))html+=`<p>${esc(t('peerWait'))}</p>`;
   }
   if(me&&['review_pending','completed','stopped'].includes(me.status)&&r.roundId&&!matchingSession(r)){
    if(me.review&&!d.editReview)html+=`<div id="coStudyReviewSaved" class="co-review-summary"><span><b>${esc(t('reviewSaved'))}</b> · ${esc(t(me.review.outcome))}</span>${button('coStudyEditReview','edit','edit-review',busy)}</div>`;
    else html+=`<form id="coStudyReviewForm" class="co-study-review"><h4>${esc(t('review'))}</h4><label for="coStudyReviewOutcome">${esc(t('reviewQuestion'))}</label><select id="coStudyReviewOutcome">${['complete','partial','adjusted'].map(k=>`<option value="${k}" ${d.reviewOutcome===k?'selected':''}>${esc(t(k))}</option>`).join('')}</select><label for="coStudyReviewNote">${esc(t('note'))}</label><input id="coStudyReviewNote" maxlength="160" value="${esc(d.note)}"><div class="co-review-buttons"><button id="coStudyReviewSubmit" type="submit" ${busy?'disabled':''}>${esc(t('submit'))}</button>${me.review?button('coStudyCancelReview','cancelEdit','cancel-review',busy):''}</div></form>`;
   }
   if(terminal.has(phase))html+=`<div class="co-study-actions"><strong>${esc(t(phase==='finished'?'finished':phase))}</strong>${button('coStudyNew','newSession','new',busy)}</div>`;
   else html+=`<div class="co-study-footer">${phase==='inviting'&&isHost?button('coStudyCancel','cancel','cancel',busy):button('coStudyLeave','leave','leave',busy)}</div>`;
   html+='</div></section>';
  }else if(model?.self){
   const friends=friendList();html+=`<div class="co-study-create">`;
   if(!friends.length)html+=`<p>${esc(t('empty'))}</p>${button('coStudyFriends','friends','friends')}`;
   else html+=`<div class="co-study-picker"><label for="coStudyFriend">${esc(t('friends'))}<select id="coStudyFriend"><option value="">${esc(t('choose'))}</option>${friends.map(f=>`<option value="${esc(f.profileId)}" ${d.friendId===f.profileId?'selected':''}>${esc(f.name)}</option>`).join('')}</select></label><label for="coStudyMode">${esc(t('mode'))}<select id="coStudyMode"><option value="together" ${d.mode!=='challenge'?'selected':''}>${esc(t('together'))}</option><option value="challenge" ${d.mode==='challenge'?'selected':''}>${esc(t('challenge'))}</option></select></label>${button('coStudyInvite','invite','create',busy||!!block,'co-primary')}</div><small>${esc(t('format'))}</small>${block?`<p class="co-study-warning">${esc(t(block))}</p>`:''}`;
   html+='</div>';
  }
  if(model?.self)html+=`<details id="coStudyRules" class="co-study-rules" ${rulesOpen?'open':''}><summary id="coStudyRulesToggle">${esc(t('rules'))}</summary><div><p>${esc(t('format'))}. ${esc(t('inviteInfo'))} ${esc(t('roomShare'))}</p><p>${esc(t('privacy'))}</p><p>${esc(t('timingHelp'))}</p>${r?.mode==='challenge'||!r?`<p>${esc(t('pointsHelp'))}</p>`:''}</div></details>`;
  const dialog=$('coStudyDialog'),body=$('coStudyBody');
  if(expanded&&!dialog.open)dialog.showModal();else if(!expanded&&dialog.open)dialog.close();
  syncSignals();
  if(html===lastRender){renderScene(r,s);return;}
  lastRender=html;const scrollTop=body.scrollTop,scene=$('coStudyScene');body.innerHTML=html;
  // Keep a single canvas across one-second timer/form updates.
  if(scene&&$('coStudyScene'))$('coStudyScene').replaceWith(scene);
  body.scrollTop=scrollTop;
  if(focus?.id){const el=$(focus.id);if(el&&!el.disabled){el.focus({preventScroll:true});try{el.setSelectionRange(focus.start,focus.end);}catch{}}}
  renderScene(r,s);
 }
 async function startLocal(room,explicit=false){
  if(autoStarting||!room?.roundId||Number(room.startsAt)>now())return false;
  const me=member(room),s=read();if(!me||!['studying','paused'].includes(me.status)||!me.sourceSessionId)return false;
  if(matchingSession(room))return true;
  if(s.history?.some(h=>h.id===me.sourceSessionId)||blockReason(room))return false;
  const stamp=room.id+':'+room.roundId;if(!explicit&&startedRounds.has(stamp))return false;
  // Only auto-start a round this tab observed becoming active. Reloads need an explicit action.
  if(!explicit&&lastRoomVersion?.roundId!==room.roundId)return false;
  autoStarting=true;startedRounds.add(stamp);
  try{const ok=await adapter.start?.({id:me.sourceSessionId,sourceSessionId:me.sourceSessionId,roomId:room.id,roundId:room.roundId,plannedSeconds:room.plannedSeconds||1200,task:draft(room).task||read().lastTask||'',startedAt:now()});if(!ok){notice=t(blockReason(room)||'otherTab');return false;}if(me.status==='paused')await adapter.pause?.();lastHeartbeat=0;return true;}finally{autoStarting=false;render();}
 }
 async function reconcile(){
  if(disposed||working||timerActionInFlight||!connected)return;const room=activeRoom(),me=member(room);if(!room||!me)return;
  const state=read();if(['studying','paused'].includes(me.status)&&room.startsAt<=now()){
   if(!matchingSession(room)){
    const history=state.history?.find(h=>h.id===me.sourceSessionId);
    if(history){if(Date.now()-lastSyncAction>1500){lastSyncAction=Date.now();await request('finish',{roomId:room.id,roundId:room.roundId,sourceSessionId:me.sourceSessionId,outcome:history.outcome==='complete'?'complete':'stopped'});}return;}
    await startLocal(room,false);return;
   }
   if(!owned())return;
   if(state.session.status==='paused'&&me.status==='studying'){if(Date.now()-lastSyncAction>1000){lastSyncAction=Date.now();await request('pause',{roomId:room.id,roundId:room.roundId,sourceSessionId:me.sourceSessionId});}return;}
   if(state.session.status==='running'&&me.status==='paused'){if(Date.now()-lastSyncAction>1000){lastSyncAction=Date.now();await request('resume',{roomId:room.id,roundId:room.roundId,sourceSessionId:me.sourceSessionId});}return;}
   if(state.session.status==='running'&&Date.now()-lastHeartbeat>=10000){lastHeartbeat=Date.now();await request('heartbeat',{roomId:room.id,roundId:room.roundId,sourceSessionId:me.sourceSessionId});}
  }
 }
 async function handleTimerAction(action){
  const room=activeRoom(),me=member(room);if(!room||!me||!matchingSession(room))return false;
  if(!owned()){notice=t('otherTab');render();return true;}
  if(timerActionInFlight)return true;timerActionInFlight=true;
  try{
   if(action==='toggle'){
    const running=read().session.status==='running';
    const ok=running?await adapter.pause?.():await adapter.resume?.();
    // Personal study remains usable offline. Shared status catches up after reconnecting.
    if(ok!==false)await request(running?'pause':'resume',{roundId:room.roundId,sourceSessionId:me.sourceSessionId});
   }else if(action==='finish'){
    const ok=await adapter.finish?.();
    if(ok!==false){const history=read().history?.find(h=>h.id===me.sourceSessionId);await request('finish',{roundId:room.roundId,sourceSessionId:me.sourceSessionId,outcome:history?.outcome==='complete'?'complete':'stopped'});}
   }
  }finally{timerActionInFlight=false;render();}
  return true;
 }
 async function action(name,el){
  notice='';const r=currentRoom(),d=draft(r);
  if(name==='toggle-panel'){expanded=!expanded;savePrefs();render();if(expanded){window.FriendsClient?.activate?.();await refresh();}return;}
  if(name==='close-panel'){expanded=false;savePrefs();render();return;}
  if(name==='friends'){expanded=false;savePrefs();render();adapter.openFriends?.();return;}
  if(name==='break'){d.breakId=r.id+':'+r.roundId;d.breakEndsAt=now()+300000;persistDraft();render();return;}
  if(name==='wave'){await fetchSignals(true);return;}
  if(name==='refresh'){window.FriendsClient?.activate?.();await refresh();return;}
  if(name==='new'){if(r)dismissed.add(r.id);selectedId=null;if(model)model.room=null;savePrefs();lastRender='';render();return;}
  if(name==='create'){if(blockReason(r)){notice=t(blockReason(r));render();return;}if(!d.friendId){notice=t('chooseRequired');render();return;}const data=await request('create',{friendId:d.friendId,mode:d.mode||'together'});if(data){expanded=true;savePrefs();render();}return;}
  if(name==='accept'||name==='decline'){const roomId=el.dataset.room;await request(name,{roomId});return;}
  if(name==='ready'){
   const me=member(r);if(!me?.ready){
    if(blockReason(r)){notice=t(blockReason(r));render();return;}
    const missing=!d.task.trim()?['coStudyTask','taskRequired']:!d.consent?['coStudyConsent','consentRequired']:null;
    if(missing){notice=t(missing[1]);render();const field=$(missing[0]);if(field){field.focus();field.setCustomValidity(notice);field.reportValidity();}return;}
   }
   await request('ready',{ready:!me.ready,task:d.task.trim(),shareTask:!!d.share});return;
  }
  if(name==='start'){
   if(blockReason(r)){notice=t(blockReason(r));render();return;}
   const data=await request('start');if(data?.room){lastRoomVersion={roomId:data.room.id,roundId:data.room.roundId};scheduleStart(data.room);}return;
  }
  if(name==='recover'){await startLocal(r,true);await reconcile();return;}
  if(name==='toggle'||name==='finish'){await handleTimerAction(name);return;}
  if(name==='leave'){
   if(!window.confirm(t('confirmLeave')))return;
   if(matchingSession(r)&&owned())await handleTimerAction('finish');await request('leave');return;
  }
  if(name==='cancel'){await request('cancel');return;}
  if(name==='edit-review'){d.editReview=true;d.reviewOutcome=member(r)?.review?.outcome||d.reviewOutcome;d.note=member(r)?.review?.note||'';persistDraft();render();$('coStudyReviewOutcome')?.focus();return;}
  if(name==='cancel-review'){d.editReview=false;persistDraft();render();$('coStudyEditReview')?.focus();return;}
  if(name==='review'){
   if(!r?.roundId||matchingSession(r))return;const data=await request('review',{roundId:r.roundId,outcome:d.reviewOutcome,note:d.note});
   if(data){adapter.review?.(member(r)?.sourceSessionId,d.note);d.editReview=false;persistDraft();render();$('coStudyEditReview')?.focus();}return;
  }
 }
 function scheduleStart(room){const wait=Math.max(0,Number(room.startsAt)-now());setTimeout(()=>startLocal(currentRoom(),false),Math.min(wait+80,5000));}
 function notify(){if(!root)return;render();queueMicrotask(reconcile);}
 function init(bridge){
  if(root)return;adapter=bridge;root=$('coStudyPanel');if(!root)return;root.classList.add('co-study-panel');root.setAttribute('data-no-translate','');
  root.innerHTML='<button id="coStudyToggle" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="coStudyDialog"></button><dialog id="coStudyDialog" aria-labelledby="coStudyDialogTitle"><header class="co-study-heading"><h2 id="coStudyDialogTitle"></h2><button type="button" id="coStudyClose" data-co-action="close-panel" autofocus>×</button></header><div id="coStudyBody"></div></dialog>';
  $('coStudyDialog').addEventListener('cancel',e=>{e.preventDefault();expanded=false;savePrefs();render();});
  $('coStudyDialog').addEventListener('close',()=>{if(expanded){expanded=false;savePrefs();render();}$('coStudyToggle').focus({preventScroll:true});});
  try{const prefs=JSON.parse(localStorage.getItem(PREF)||'{}');expanded=false;rulesOpen=!!prefs.rulesOpen;selectedId=typeof prefs.selectedId==='string'?prefs.selectedId:null;Object.assign(drafts,JSON.parse(localStorage.getItem(DRAFT)||'{}'));Object.assign(gaps,JSON.parse(localStorage.getItem(GAPS)||'{}'));}catch{}
  root.addEventListener('click',e=>{if(e.target.closest('#coStudyRulesToggle')){e.preventDefault();rulesOpen=!rulesOpen;savePrefs();render();return;}if(e.target.closest('#coStudyToggle')){action('toggle-panel',e.target);return;}const el=e.target.closest('[data-co-action]');if(el&&!el.disabled)action(el.dataset.coAction,el);});
  root.addEventListener('toggle',e=>{if(e.target.id==='coStudyRules'&&e.target.isConnected){rulesOpen=e.target.open;savePrefs();}},true);
  root.addEventListener('input',e=>{const d=draft(currentRoom());if(e.target.id==='coStudyTask'){d.task=e.target.value;e.target.setCustomValidity('');}if(e.target.id==='coStudyReviewNote')d.note=e.target.value;persistDraft();});
  root.addEventListener('change',e=>{const d=draft(currentRoom());if(e.target.id==='coStudyShare')d.share=e.target.checked;if(e.target.id==='coStudyConsent'){d.consent=e.target.checked;e.target.setCustomValidity('');}if(e.target.id==='coStudyFriend')d.friendId=e.target.value;if(e.target.id==='coStudyMode')d.mode=e.target.value;if(e.target.id==='coStudyReviewOutcome')d.reviewOutcome=e.target.value;if(e.target.id==='coStudyRoomMode')request('settings',{mode:e.target.value});persistDraft();});
  root.addEventListener('submit',e=>{if(e.target.id==='coStudyReviewForm'){e.preventDefault();action('review',e.target);}});
  window.addEventListener('eumo-language',()=>{lastRender='';notice='';render();});window.addEventListener('online',refresh);window.addEventListener('offline',()=>{if(matchingSession())markGap(member()?.sourceSessionId);connected=false;failure='offline';render();});
  document.addEventListener('visibilitychange',()=>{render();if(!document.hidden)refresh();});
  tickTimer=setInterval(()=>{const r=currentRoom();if(!root)return;if(r?.status==='active'&&r.roundId&&lastRoomVersion?.roomId===r.id&&lastRoomVersion.roundId!==r.roundId){lastRoomVersion={roomId:r.id,roundId:r.roundId};scheduleStart(r);}else if(r&&!terminal.has(r.status)&&r.status!=='active')lastRoomVersion={roomId:r.id,roundId:null};render();reconcile();},1000);
  render();setTimeout(refresh,150);schedule();
 }
 function snapshot(){const room=currentRoom(),d=draft(room);return model?JSON.parse(JSON.stringify({...model,room,break:room?.status==='between_rounds'&&d.breakEndsAt?{breakId:d.breakId,breakEndsAt:d.breakEndsAt}:null,ui:{busy:working||timerActionInFlight,polling,connected,expanded}})):null;}
 return{init,notify,refresh,handleTimerAction,open(){if(!root)return;expanded=true;savePrefs();render();refresh();},getState:snapshot,snapshot,getRoom:()=>currentRoom()?JSON.parse(JSON.stringify(currentRoom())):null,dispose(){disposed=true;clearTimeout(pollTimer);clearInterval(tickTimer);clearTimeout(signalTimer);signalController?.abort();window.CoStudyScene?.dispose();}};
})();
