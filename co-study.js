/* Incremental shared-study UI. The existing app owns personal time, rewards and saves. */
'use strict';
window.CoStudy=(()=>{
 const PREF='eumo-co-study-ui-v1',DRAFT='eumo-co-study-drafts-v1',GAPS='eumo-co-study-gaps-v1';
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const words={
  title:['Study together','和好友一起学'],subtitle:['A little company, one round at a time.','和朋友一起，一轮一轮地前进。'],solo:['Your own timer stays yours.','你的计时仍由自己掌控。'],open:['Open shared study','展开共学'],close:['Close shared study','关闭共学'],breakStart:['Take a 5-minute break','休息 5 分钟'],breakTime:['Your break','你的休息'],breakDone:['Your break is over. Start when you both feel ready.','休息结束，双方准备好后再开始。'],
  friends:['Friends','好友'],choose:['Choose a friend','选择一位好友'],invite:['Invite to study','邀请一起学习'],together:['Study together','共同学习'],challenge:['Friendly challenge','好友挑战'],mode:['Session mode','共学模式'],format:['2 rounds · 20 min each','2 轮 · 每轮 20 分钟'],
  incoming:['Study invitations','共学邀请'],accept:['Join','加入'],decline:['Decline','拒绝'],cancel:['Cancel invitation','取消邀请'],waiting:['Waiting for your friend to join.','等待好友加入。'],inviteInfo:['Invitations expire after 5 minutes.','邀请在 5 分钟后过期。'],
  connect:['Connect with friends','连接好友'],empty:['Add a friend to start a shared session.','先添加好友，再一起开始。'],auth:['Connect this browser to your friends first.','请先为当前浏览器连接好友功能。'],loading:['Checking shared study…','正在查看共学状态…'],retry:['Try again','重试'],refresh:['Refresh','刷新'],
  task:['Your task for this round','这一轮的任务'],taskPlaceholder:['One small thing to work on','这轮想做的一件小事'],share:['Share this task with my friend','向好友分享这项任务'],consent:['Share my study, pause and ready status in this room','在此房间分享我的学习、暂停和准备状态'],privacy:['Your task stays private unless you choose to share it. Chats are never shared.','任务默认仅自己可见；聊天内容不会分享。'],
  ready:['Ready','准备好了'],unready:['Not ready yet','取消准备'],start:['Start together','共同开始'],waitReady:['Both friends need to be ready before starting.','双方准备好后才能开始。'],readyHint:['Choose your task and confirm what this room shares.','选择任务，并确认房间分享的信息。'],round:['Round','轮次'],of:['of','/'],you:['You','你'],host:['Host','发起人'],
  pause:['Pause my session','暂停我的学习'],resume:['Continue my session','继续我的学习'],end:['End this round','结束这一轮'],left:['Left the room','已离开房间'],leave:['Leave room','离开房间'],confirmLeave:['Leave this room? Your saved study progress and earned rewards stay with you.','要离开房间吗？已保存的学习进度与奖励都会保留。'],
  studying:['Studying','学习中'],paused:['Paused','已暂停'],joined:['Choosing a task','正在选择任务'],invited:['Invited','已邀请'],review_pending:['Ready to review','待回顾'],completed:['Round complete','本轮已完成'],stopped:['Ended early','已提前结束'],countdown:['Starting in','即将开始'],seconds:['s','秒'],
  peerWait:['You can review or rest while your friend finishes.','好友还在学习，你可以先回顾或休息。'],next:['Take a break, then both get ready for the next round.','休息一下，双方准备好后开始下一轮。'],finished:['Shared session complete','本次共学已结束'],cancelled:['This invitation is closed.','此邀请已关闭。'],expired:['This invitation has expired.','此邀请已过期。'],newSession:['Another session','再开一场'],
  review:['Review this round','回顾这一轮'],reviewQuestion:['How did your task go?','你的任务进展如何？'],complete:['Completed my goal','完成了目标'],partial:['Made some progress','完成了一部分'],adjusted:['Adjusted my goal','调整了目标'],note:['A short note (optional)','简短记录（选填）'],submit:['Save review','保存回顾'],reviewSaved:['Review saved.','回顾已保存。'],
  points:['challenge points','挑战积分'],point:['challenge point','挑战积分'],pointsHelp:['A point marks a finished study round and a review, not grades or task difficulty. Ties are welcome.','积分代表完成学习轮次与回顾，不代表成绩或任务难度；可以并列。'],unverified:['Challenge result awaiting confirmation','挑战结果待确认'],privateTask:['Task kept private','任务未分享'],
  offline:['Connection interrupted. Your personal progress stays on this device; shared updates are paused.','连接中断。个人进度仍保存在此设备，共学更新暂时暂停。'],notConfigured:['Shared study is not available on this server yet. Your solo study still works.','当前服务器尚未启用共学，个人学习仍可使用。'],unavailable:['Shared study could not be reached. Your personal progress is safe.','暂时无法连接共学服务，个人进度已保留。'],
  conflict:['This room changed. Check the latest state and try again.','房间状态已变化，请查看最新状态后重试。'],notFriend:['This friend relationship has changed. Refresh your friends list.','好友关系已变化，请刷新好友列表。'],rate:['Please wait a moment before trying again.','请稍等片刻再试。'],
  personalBusy:['Finish your current personal session before getting ready here.','请先结束当前个人会话，再准备共学。'],device:['Canele is controlling your timer. Finish its session before starting web co-study.','Canele 正在控制计时，请先结束设备会话，再开始网页共学。'],otherTab:['This session is controlled in another window. Return there to continue.','此会话由另一窗口控制，请回到该窗口继续。'],
  recover:['Continue here','在此继续'],recoverHint:['The room has started. Confirm to continue your own timer here.','房间已经开始，请确认在这里继续自己的计时。'],statusUnknown:['Connection unavailable','连接状态暂不可用'],saved:['Saved on this device','已保存在此设备'],roomShare:['Only you and your invited friend can join.','仅你和受邀好友可以加入。'],chooseRequired:['Choose a friend first.','请先选择好友。'],consentRequired:['Confirm status sharing before getting ready.','准备前请确认房间状态分享。'],taskRequired:['Choose a small task for this round.','请先写下这一轮的小任务。'],syncing:['Updating…','正在更新…'],live:['Live shared session','共学进行中'],inviteCount:['invitation','邀请'],minutes:['min','分钟']
 };
 const t=k=>words[k]?.[window.EumoI18n?.language==='zh'?1:0]||k;
 const uid=()=>globalThis.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16);});
 const terminal=new Set(['finished','cancelled','expired']);
 let adapter,root,model=null,selectedId=null,expanded=false,working=false,polling=false,notice='',failure='',connected=false,disposed=false,clockAt=0,clockBase=0,lastHeartbeat=0,lastSyncAction=0,autoStarting=false,timerActionInFlight=false,startedRounds=new Set(),dismissed=new Set(),lastRender='',lastRoomVersion=null;
 let pollTimer=null,tickTimer=null;const pending=new Map(),drafts={},gaps={};
 function read(){try{return adapter?.read?.()||{};}catch{return {};}}
 function now(){return clockBase?clockBase+(performance.now()-clockAt):Date.now();}
 function savePrefs(){try{localStorage.setItem(PREF,JSON.stringify({expanded,selectedId}));}catch{}}
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
 function errorKey(code){if(['UNAUTHORIZED','FRIENDS_REQUIRED'].includes(code))return'auth';if(/NOT_CONFIGURED|MIGRATION/.test(code))return'notConfigured';if(/RATE|LIMIT/.test(code))return'rate';if(/NOT_FRIEND|FRIENDSHIP/.test(code))return'notFriend';if(/CONFLICT|VERSION|STALE|REQUEST_REUSED|MEMBER_BUSY|NOT_FOUND|INVALID_STATE|ROUND|EXPIRED/.test(code))return'conflict';return navigator.onLine===false?'offline':'unavailable';}
 async function request(action,extra={},opts={}){
  if(disposed)return null;
  if(action!=='state'&&working)return null;
  if(action==='state'&&(polling||working))return null;
  const mutation=action!=='state';if(mutation)working=true;else polling=true;
  const room=currentRoom();let input={action,...extra};
  if(mutation&&action!=='create'&&!input.roomId&&room)input.roomId=room.id;
  if(action==='state'&&selectedId&&!input.roomId)input.roomId=selectedId;
  if(['heartbeat','pause','resume','finish'].includes(action)&&gaps[input.sourceSessionId])input.uncertainInterval=true;
  const signature=JSON.stringify(input);
  if(mutation){
   if(pending.has(signature))input={...pending.get(signature)};
   else{input.requestId=uid();if(['ready','settings','start','accept','cancel','decline'].includes(action)&&room?.id===input.roomId&&Number.isFinite(room.version))input.expectedVersion=room.version;if(['pause','resume','finish'].includes(action)){const own=member(room);input.expectedControlVersion=Number(own?.controlVersion)||0;}pending.set(signature,{...input});}
  }
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch('/api/co-study',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:controller.signal});
   let data;try{data=await response.json();}catch{throw Error('CO_STUDY_UNAVAILABLE');}
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
 function statusLabel(m){if(!m)return '';if(m.status==='studying'&&Number(m.lastSeen)&&now()-Number(m.lastSeen)>90000)return t('statusUnknown');return t(m.status);}
 function formatSeconds(seconds){const n=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
 function render(){
  if(!root)return;const r=currentRoom(),me=member(r),s=read(),busy=working,invites=incoming(),d=draft(r),block=blockReason(r),isHost=r?.hostId===model?.self?.id;
  const focus=document.activeElement?.closest?.('#coStudyPanel')?{id:document.activeElement.id,start:document.activeElement.selectionStart,end:document.activeElement.selectionEnd}:null;
  const headingDetail=invites.length?`${invites.length} ${t('inviteCount')}`:r&&!terminal.has(r.status)?`${r.roundIndex||1}/${r.maxRounds||2}`:'';
  const toggle=$('coStudyToggle');toggle.innerHTML=`<span class="co-study-mark" aria-hidden="true">✦</span><span>${esc(t('title'))}</span>${headingDetail?`<b class="co-study-summary">${esc(headingDetail)}</b>`:''}`;toggle.setAttribute('aria-expanded',String(expanded));
  $('coStudyDialogTitle').textContent=t('title');$('coStudyClose').textContent='×';$('coStudyClose').setAttribute('aria-label',t('close'));
  let html='';
  if(failure)html+=`<div class="co-study-notice" role="status"><span>${esc(t(failure))}</span>${button('coStudyRetry',failure==='auth'?'connect':'retry',failure==='auth'?'friends':'refresh',busy)}</div>`;
  else if(!model)html+=`<p id="coStudyLoading">${esc(t('loading'))}</p>`;
  html+=`<p id="coStudyStatus" class="co-study-feedback" role="status" aria-live="polite">${esc(notice||'')}</p>`;
  if(invites.length)html+=`<section class="co-study-invitations"><h3>${esc(t('incoming'))}</h3>${invites.map(inv=>{const host=inv.members.find(m=>m.id===inv.hostId);return `<article class="co-study-invitation"><span><strong>${esc(host?.name||'Momo')}</strong><small>${esc(t(inv.mode==='challenge'?'challenge':'together'))} · ${esc(t('format'))}</small></span><div><button type="button" data-co-action="accept" data-room="${esc(inv.id)}" ${busy?'disabled':''}>${esc(t('accept'))}</button><button type="button" data-co-action="decline" data-room="${esc(inv.id)}" ${busy?'disabled':''}>${esc(t('decline'))}</button></div></article>`;}).join('')}</section>`;
  if(r){
   const members=r.members||[],allReady=members.length===2&&members.every(m=>m.ready&&m.status!=='left'),phase=r.status;
   html+=`<section class="co-study-room" data-co-room="${esc(r.id)}" data-co-phase="${esc(phase)}"><div class="co-study-room-heading"><h3>${esc(t(r.mode==='challenge'?'challenge':'together'))}</h3><span>${esc(t('round'))} ${r.roundIndex||1}/${r.maxRounds||2} · ${Math.round((r.plannedSeconds||1200)/60)} ${esc(t('minutes'))}</span></div>`;
   if(phase==='inviting')html+=`<p>${esc(t('waiting'))} ${esc(t('inviteInfo'))}</p>`;
   html+=`<div class="co-study-members">${members.map(m=>`<article class="co-member" data-co-member="${esc(m.id)}"><canvas width="128" height="128" data-co-portrait="${esc(m.id)}" aria-label="${esc(m.name||'Momo')}"></canvas><div><strong>${esc(m.name||'Momo')} ${m.id===model?.self?.id?`<small>(${esc(t('you'))})</small>`:''}</strong><span class="co-member-status">${esc(statusLabel(m))}</span><span class="co-member-task">${esc(m.id===model?.self?.id?(d.task||t('privateTask')):(m.shareTask&&m.task?m.task:t('privateTask')))}</span>${r.mode==='challenge'?`<span class="co-member-points">${Number(m.points)||0} ${esc(t('points'))}${(m.verification==='pending_verification'||m.id===model?.self?.id&&gaps[m.sourceSessionId])?` · ${esc(t('unverified'))}`:''}</span>`:''}</div></article>`).join('')}</div>`;
   if(phase==='between_rounds')html+=`<div class="co-study-break">${d.breakEndsAt?`<span>${esc(t(now()<d.breakEndsAt?'breakTime':'breakDone'))}${now()<d.breakEndsAt?' · '+formatSeconds((d.breakEndsAt-now())/1000):''}</span>`:button('coStudyBreak','breakStart','break',false)}</div>`;
   if(['ready','between_rounds'].includes(phase)&&me?.status!=='left'){
    html+=`<div class="co-study-preparation"><p>${esc(t(phase==='between_rounds'?'next':'readyHint'))}</p><label for="coStudyTask">${esc(t('task'))}</label><input id="coStudyTask" maxlength="100" autocomplete="off" placeholder="${esc(t('taskPlaceholder'))}" value="${esc(d.task)}" ${me?.ready?'disabled':''}><label class="co-study-check"><input id="coStudyShare" type="checkbox" ${d.share?'checked':''} ${me?.ready?'disabled':''}>${esc(t('share'))}</label><small>${esc(t('privacy'))}</small><label class="co-study-check"><input id="coStudyConsent" type="checkbox" ${d.consent?'checked':''} ${me?.ready?'disabled':''}>${esc(t('consent'))}</label>`;
    if(isHost&&!r.roundIndex)html+=`<label class="co-study-mode-label" for="coStudyRoomMode">${esc(t('mode'))}<select id="coStudyRoomMode" ${busy?'disabled':''}><option value="together" ${r.mode==='together'?'selected':''}>${esc(t('together'))}</option><option value="challenge" ${r.mode==='challenge'?'selected':''}>${esc(t('challenge'))}</option></select></label>`;
    if(block)html+=`<p class="co-study-warning">${esc(t(block))}</p>`;
    html+=`<div class="co-study-actions">${button('coStudyReady',me?.ready?'unready':'ready','ready',busy||(!me?.ready&&!!block))}${isHost?button('coStudyStart','start','start',busy||!allReady||!!block,'co-primary'):''}</div><small>${esc(t('waitReady'))}</small></div>`;
   }
   if(phase==='active'){
    if(Number(r.startsAt)>now())html+=`<p class="co-study-countdown">${esc(t('countdown'))} <b id="coStudyCountdown">${Math.max(0,Math.ceil((r.startsAt-now())/1000))}</b> ${esc(t('seconds'))}</p>`;
    else if(matchingSession(r)||['studying','paused'].includes(me?.status)){
     if(block)html+=`<p class="co-study-warning">${esc(t(block))}</p>`;
     if(!matchingSession(r)&&!s.history?.some(h=>h.id===me.sourceSessionId))html+=`<p>${esc(t('recoverHint'))}</p>${button('coStudyRecover','recover','recover',busy||!!block,'co-primary')}`;
     else if(matchingSession(r))html+=`<div class="co-study-actions">${button('coStudyPause',s.session.status==='running'?'pause':'resume','toggle',busy||!owned())}${button('coStudyEnd','end','finish',busy||!owned())}<span class="co-own-time">${formatSeconds(s.session.elapsed)} / ${formatSeconds(r.plannedSeconds)}</span></div>`;
    }
    if(['review_pending','completed','stopped'].includes(me?.status)&&members.some(m=>m.id!==me.id&&['studying','paused'].includes(m.status)))html+=`<p>${esc(t('peerWait'))}</p>`;
   }
   if(me&&['review_pending','completed','stopped'].includes(me.status)&&r.roundId&&!matchingSession(r)){
    html+=`<form id="coStudyReviewForm" class="co-study-review"><h4>${esc(t('review'))}</h4><label for="coStudyReviewOutcome">${esc(t('reviewQuestion'))}</label><select id="coStudyReviewOutcome">${['complete','partial','adjusted'].map(k=>`<option value="${k}" ${d.reviewOutcome===k?'selected':''}>${esc(t(k))}</option>`).join('')}</select><label for="coStudyReviewNote">${esc(t('note'))}</label><input id="coStudyReviewNote" maxlength="160" value="${esc(d.note)}"><button id="coStudyReviewSubmit" type="submit" ${busy?'disabled':''}>${esc(t('submit'))}</button>${me.review?`<span class="co-review-saved">${esc(t('reviewSaved'))}</span>`:''}</form>`;
   }
   if(r.mode==='challenge')html+=`<p class="co-study-help">${esc(t('pointsHelp'))}</p>`;
   if(terminal.has(phase))html+=`<div class="co-study-actions"><strong>${esc(t(phase==='finished'?'finished':phase))}</strong>${button('coStudyNew','newSession','new',busy)}</div>`;
   else html+=`<div class="co-study-footer">${phase==='inviting'&&isHost?button('coStudyCancel','cancel','cancel',busy):button('coStudyLeave','leave','leave',busy)}</div>`;
   html+='</section>';
  }else if(model?.self){
   const friends=friendList();html+=`<div class="co-study-create"><p>${esc(t('subtitle'))}</p>`;
   if(!friends.length)html+=`<p>${esc(t('empty'))}</p>${button('coStudyFriends','friends','friends')}`;
   else html+=`<div class="co-study-picker"><label for="coStudyFriend">${esc(t('friends'))}<select id="coStudyFriend"><option value="">${esc(t('choose'))}</option>${friends.map(f=>`<option value="${esc(f.profileId)}" ${d.friendId===f.profileId?'selected':''}>${esc(f.name)}</option>`).join('')}</select></label><label for="coStudyMode">${esc(t('mode'))}<select id="coStudyMode"><option value="together" ${d.mode!=='challenge'?'selected':''}>${esc(t('together'))}</option><option value="challenge" ${d.mode==='challenge'?'selected':''}>${esc(t('challenge'))}</option></select></label>${button('coStudyInvite','invite','create',busy||!!block,'co-primary')}</div><small>${esc(t('format'))} · ${esc(t('roomShare'))}</small>${block?`<p class="co-study-warning">${esc(t(block))}</p>`:''}`;
   html+='</div>';
  }
  const dialog=$('coStudyDialog'),body=$('coStudyBody');
  if(expanded&&!dialog.open)dialog.showModal();else if(!expanded&&dialog.open)dialog.close();
  if(html===lastRender)return;lastRender=html;const scrollTop=body.scrollTop;body.innerHTML=html;body.scrollTop=scrollTop;
  if(focus?.id){const el=$(focus.id);if(el&&!el.disabled){el.focus({preventScroll:true});try{el.setSelectionRange(focus.start,focus.end);}catch{}}}
  root.querySelectorAll('[data-co-portrait]').forEach(canvas=>{const m=r.members.find(m=>m.id===canvas.dataset.coPortrait),friend=friendList().find(f=>f.profileId===m.id),own=m.id===model.self.id;try{window.PixelArt?.drawPortrait(canvas,{profile:{color:m.color||'#b784cf'},equipped:own?(s.equipped||[]):(friend?.equipped||[])});}catch{}});
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
  if(name==='refresh'){window.FriendsClient?.activate?.();await refresh();return;}
  if(name==='new'){if(r)dismissed.add(r.id);selectedId=null;if(model)model.room=null;savePrefs();lastRender='';render();return;}
  if(name==='create'){if(blockReason(r)){notice=t(blockReason(r));render();return;}if(!d.friendId){notice=t('chooseRequired');render();return;}const data=await request('create',{friendId:d.friendId,mode:d.mode||'together'});if(data){expanded=true;savePrefs();render();}return;}
  if(name==='accept'||name==='decline'){const roomId=el.dataset.room;await request(name,{roomId});return;}
  if(name==='ready'){
   const me=member(r);if(!me?.ready){if(blockReason(r)){notice=t(blockReason(r));render();return;}if(!d.consent){notice=t('consentRequired');render();return;}if(!d.task.trim()){notice=t('taskRequired');render();return;}}
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
  if(name==='review'){
   if(!r?.roundId||matchingSession(r))return;const data=await request('review',{roundId:r.roundId,outcome:d.reviewOutcome,note:d.note});
   if(data){adapter.review?.(member(r)?.sourceSessionId,d.note);notice=t('reviewSaved');render();}return;
  }
 }
 function scheduleStart(room){const wait=Math.max(0,Number(room.startsAt)-now());setTimeout(()=>startLocal(currentRoom(),false),Math.min(wait+80,5000));}
 function notify(){if(!root)return;render();queueMicrotask(reconcile);}
 function init(bridge){
  if(root)return;adapter=bridge;root=$('coStudyPanel');if(!root)return;root.classList.add('co-study-panel');root.setAttribute('data-no-translate','');
  root.innerHTML='<button id="coStudyToggle" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="coStudyDialog"></button><dialog id="coStudyDialog" aria-labelledby="coStudyDialogTitle"><header class="co-study-heading"><h2 id="coStudyDialogTitle"></h2><button type="button" id="coStudyClose" data-co-action="close-panel" autofocus>×</button></header><div id="coStudyBody"></div></dialog>';
  $('coStudyDialog').addEventListener('cancel',e=>{e.preventDefault();expanded=false;savePrefs();render();});
  $('coStudyDialog').addEventListener('close',()=>{if(expanded){expanded=false;savePrefs();render();}$('coStudyToggle').focus({preventScroll:true});});
  try{const prefs=JSON.parse(localStorage.getItem(PREF)||'{}');expanded=false;selectedId=typeof prefs.selectedId==='string'?prefs.selectedId:null;Object.assign(drafts,JSON.parse(localStorage.getItem(DRAFT)||'{}'));Object.assign(gaps,JSON.parse(localStorage.getItem(GAPS)||'{}'));}catch{}
  root.addEventListener('click',e=>{if(e.target.closest('#coStudyToggle')){action('toggle-panel',e.target);return;}const el=e.target.closest('[data-co-action]');if(el&&!el.disabled)action(el.dataset.coAction,el);});
  root.addEventListener('input',e=>{const d=draft(currentRoom());if(e.target.id==='coStudyTask')d.task=e.target.value;if(e.target.id==='coStudyReviewNote')d.note=e.target.value;persistDraft();});
  root.addEventListener('change',e=>{const d=draft(currentRoom());if(e.target.id==='coStudyShare')d.share=e.target.checked;if(e.target.id==='coStudyConsent')d.consent=e.target.checked;if(e.target.id==='coStudyFriend')d.friendId=e.target.value;if(e.target.id==='coStudyMode')d.mode=e.target.value;if(e.target.id==='coStudyReviewOutcome')d.reviewOutcome=e.target.value;if(e.target.id==='coStudyRoomMode')request('settings',{mode:e.target.value});persistDraft();});
  root.addEventListener('submit',e=>{if(e.target.id==='coStudyReviewForm'){e.preventDefault();action('review',e.target);}});
  window.addEventListener('eumo-language',()=>{lastRender='';notice='';render();});window.addEventListener('online',refresh);window.addEventListener('offline',()=>{if(matchingSession())markGap(member()?.sourceSessionId);connected=false;failure='offline';render();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  tickTimer=setInterval(()=>{const r=currentRoom();if(!root)return;if(r?.status==='active'&&r.roundId&&lastRoomVersion?.roomId===r.id&&lastRoomVersion.roundId!==r.roundId){lastRoomVersion={roomId:r.id,roundId:r.roundId};scheduleStart(r);}else if(r&&!terminal.has(r.status)&&r.status!=='active')lastRoomVersion={roomId:r.id,roundId:null};render();reconcile();},1000);
  render();setTimeout(refresh,150);schedule();
 }
 function snapshot(){const room=currentRoom(),d=draft(room);return model?JSON.parse(JSON.stringify({...model,room,break:room?.status==='between_rounds'&&d.breakEndsAt?{breakId:d.breakId,breakEndsAt:d.breakEndsAt}:null,ui:{busy:working||timerActionInFlight,polling,connected,expanded}})):null;}
 return{init,notify,refresh,handleTimerAction,open(){if(!root)return;expanded=true;savePrefs();render();refresh();},getState:snapshot,snapshot,getRoom:()=>currentRoom()?JSON.parse(JSON.stringify(currentRoom())):null,dispose(){disposed=true;clearTimeout(pollTimer);clearInterval(tickTimer);}};
})();
