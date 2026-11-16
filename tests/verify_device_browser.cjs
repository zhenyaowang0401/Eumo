// Real Chrome + original app. The device HTTP response is a controlled fixture;
// this proves UI/storage integration, not a deployed cloud or physical watch.
const {spawn,spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),delay=ms=>new Promise(r=>setTimeout(r,ms));
function chromeExecutable(){
 const override=process.env.EUMO_CHROME_PATH||process.env.CHROME_PATH;
 if(override){if(fs.existsSync(override))return override;throw Error('Browser executable does not exist: '+override);}
 const candidates=process.platform==='win32'?
  [process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter(Boolean).flatMap(base=>[path.join(base,'Google/Chrome/Application/chrome.exe'),path.join(base,'Microsoft/Edge/Application/msedge.exe')]):
  process.platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge','/Applications/Chromium.app/Contents/MacOS/Chromium']:
  ['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome','/opt/google/chrome/chrome'];
 const existing=candidates.find(file=>fs.existsSync(file));if(existing)return existing;
 for(const name of ['chromium','chromium-browser','google-chrome','chrome','msedge']){
  const found=spawnSync(process.platform==='win32'?'where':'which',[name],{encoding:'utf8',windowsHide:true});
  const file=found.status===0?found.stdout.trim().split(/\r?\n/)[0]:'';if(file&&fs.existsSync(file))return file;
 }
 throw Error('Chrome/Chromium not found. Set EUMO_CHROME_PATH to its executable.');
}
const deviceId='a'.repeat(64);
let confirmed=false,claimed=false,pairFailure=null,readFailure=false,stale=false;
let current={deviceId,sequence:1,snapshot:{version:3,depth:140,seconds:4200,sessionElapsed:120,status:'digging',reportDays:{'2026-11-16':{seconds:4200}},earned:{stars:2,sessions:0,finds:[1,0,0,0],golden:{'moon-globe':1}},records:[{id:'watch-1',at:1000000,startedAt:400000,seconds:600,depth:20,stars:2,mode:'study',outcome:'stopped',demo:false,finds:[1,0,0,0],golden:['moon-globe']}]}};
const server=http.createServer((req,res)=>{
 const json=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 if(req.url==='/api/dig-pair'){
  let raw='';req.on('data',b=>raw+=b);req.on('end',()=>{
   try{
    const body=JSON.parse(raw);
    if(body.action==='claim'){
     assert.equal(body.code,'0372');claimed=true;
     return json(200,{pending:true});
    }
    if(body.action==='poll')return pairFailure?json(pairFailure==='SYNC_NOT_CONFIGURED'?503:409,{error:pairFailure}):json(200,confirmed?{paired:true,deviceId}:{pending:true});
    if(body.action==='disconnect'){confirmed=false;claimed=false;return json(200,{revoked:true});}
    return json(400,{error:'INVALID_ACTION'});
   }catch(error){json(400,{error:error.message});}
  });return;
 }
 if(req.url==='/api/dig-sync')return readFailure?json(503,{error:'SYNC_NOT_CONFIGURED'}):json(200,{...current,updated_at:new Date(Date.now()-(stale?30000:0)).toISOString(),serverTime:Date.now()});
 const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)){res.writeHead(404);return res.end();}
 try{
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');
  res.end(fs.readFileSync(file));
 }catch{res.writeHead(404);res.end();}
});

async function waitFor(check,label,timeout=10000){
 const end=Date.now()+timeout;
 while(Date.now()<end){if(await check())return;await delay(100);}
 throw Error('Timed out: '+label);
}

(async()=>{
 const executable=chromeExecutable(),profile=fs.mkdtempSync(path.join(os.tmpdir(),'eumo-sync-test-'));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0',...(process.platform==='linux'?['--no-sandbox']:[]),'--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 const clients=[],errors=[];
 try{
  const ws=await new Promise((resolve,reject)=>{
   let output='';
   const t=setTimeout(()=>reject(Error('Chrome startup timeout: '+output.slice(-1500))),20000);
   const fail=error=>{clearTimeout(t);reject(error);};
   browser.once('error',fail);browser.once('exit',code=>fail(Error('Chrome exited before connecting: '+code)));
   browser.stderr.on('data',b=>{
    output=(output+b).slice(-8000);const match=output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if(match){clearTimeout(t);resolve(match[1]);}
   });
  });
  const debugOrigin='http://'+new URL(ws).host,url='http://127.0.0.1:'+server.address().port+'/#focus';
  async function attach(targetId){
   const targets=await(await fetch(debugOrigin+'/json')).json();
   const target=targets.find(t=>targetId?t.id===targetId:t.type==='page');
   assert.ok(target,'Chrome page target exists');
   const socket=new WebSocket(target.webSocketDebuggerUrl),waiting=new Map();let seq=0;
   await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
   socket.addEventListener('message',event=>{
    const response=JSON.parse(event.data);
    if(response.id){waiting.get(response.id)?.(response);waiting.delete(response.id);}
    if(response.method==='Runtime.exceptionThrown')errors.push(response.params.exceptionDetails);
   });
   const cdp=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++seq;waiting.set(id,response=>response.error?reject(Error(JSON.stringify(response.error))):resolve(response.result));
    socket.send(JSON.stringify({id,method,params}));
   });
   const evaluate=async expression=>{
    const response=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(response.exceptionDetails)throw Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
   };
   const client={id:target.id,cdp,evaluate,socket};clients.push(client);
   await cdp('Runtime.enable');await cdp('Page.enable');
   await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
   return client;
  }
  async function ready(page){
   await waitFor(()=>page.evaluate("!!window.DeviceImportBridge && !!window.MoleArt?.ready && !!document.querySelector('#caneleDisconnect')"),'app and Canele UI ready');
  }
  async function newTab(page){
   const {targetId}=await page.cdp('Target.createTarget',{url});
   const tab=await attach(targetId);await ready(tab);return tab;
  }
  async function openPair(page){
   await page.evaluate("navigateTo('focus');document.querySelector('#connectCaneleButton').click()");
   assert.equal(await page.evaluate("document.querySelector('#caneleDialog').open"),true);
  }
  async function submitPair(page,consent=true){
   await page.evaluate(`document.querySelector('#canelePairCode').value='0372';document.querySelector('#caneleImportConsent').checked=${consent};document.querySelector('#canelePairForm').requestSubmit()`);
  }
  const first=await attach();await first.cdp('Page.navigate',{url});await ready(first);
  await first.evaluate("localStorage.setItem('eumo-tour-v1','seen');state.profile.configured=true;state.session=null;save();navigateTo('focus')");
  // An unrelated second tab must remain usable before any device is connected.
  let page=await newTab(first);
  assert.equal(await page.evaluate("document.querySelector('#gameShell').inert"),false,'unpaired second tab is not inert');
  assert.equal(await page.evaluate("document.querySelector('#startButton').disabled"),false,'unpaired second tab can start');
  await page.cdp('Target.closeTarget',{targetId:first.id});first.socket.close();
  await waitFor(()=>page.evaluate("!document.querySelector('#gameShell').inert && !document.querySelector('#startButton').disabled"),'second tab usable after first closes');
  // Starting immediately after coalesced idle writes must use the latest edit.
  await page.evaluate("for(let i=1;i<=40;i++){state.minutes=i+10;save();}document.querySelector('#startButton').click()");
  await waitFor(()=>page.evaluate("state.session?.status==='running'"),'second tab starts a real local session');
  assert.equal(await page.evaluate('state.session.plannedSeconds'),3000,'Start waits for the newest queued idle save');
  // Reset only this isolated browser's fixture state before importing device data.
  await page.evaluate("state.session=null;state.depth=100;state.totalSeconds=3000;state.balance=10;state.inventory=[5,0,0,0];state.rareInventory={};state.history=[];state.reportDays={};state.deviceImports={};deviceLedgerStamp=JSON.stringify({});save();renderTimer();renderStats()");
  assert.equal(await page.evaluate("document.querySelectorAll('#connectCaneleButton').length"),1,'one canele entry');
  assert.equal(await page.evaluate("document.querySelectorAll('.focus-device-button,.device-sync-panel').length"),0,'no duplicate legacy pairing interface');
  assert.equal(await page.evaluate("document.querySelector('#connectCaneleButton').dataset.icon"),'canele','disconnected front icon');
  await openPair(page);
  await submitPair(page,false);await delay(200);assert.equal(claimed,false,'import consent is required before network claim');
  await submitPair(page);
  await waitFor(()=>claimed,'four-digit claim sent');
  await delay(3500);
  assert.equal(await page.evaluate('state.depth'),100,'no import before physical confirmation');
  assert.equal(await page.evaluate("document.querySelector('#connectCaneleButton').dataset.icon"),'canele','pending is not connected');
  await page.evaluate("document.querySelector('#caneleDisconnect').click()");
  await waitFor(()=>!claimed,'cancel revokes pending claim');
  assert.equal(await page.evaluate("document.querySelector('#connectCaneleButton').dataset.connection"),'disconnected');
  assert.equal(await page.evaluate("localStorage.getItem('eumo-pair-pending-v1')"),null);
  assert.equal(await page.evaluate('state.depth'),100,'cancel does not import progress');
  await submitPair(page);await waitFor(()=>claimed,'new claim after cancellation');
  pairFailure='SYNC_NOT_CONFIGURED';
  await waitFor(()=>page.evaluate("document.querySelector('#caneleFeedback').textContent.includes('not available')"),'pending poll failure is shown');
  assert.equal(await page.evaluate('state.depth'),100,'failed poll cannot authorize an import');
  assert.equal(await page.evaluate("document.querySelector('#connectCaneleButton').dataset.connection"),'pending');
  // Replacing/rejecting the request on the physical device expires its old code.
  pairFailure='PAIRING_EXPIRED';
  await waitFor(()=>page.evaluate("!document.querySelector('#canelePairForm').hidden"),'expired/rejected pairing returns to entry');
  assert.equal(await page.evaluate('state.depth'),100);
  assert.equal(await page.evaluate("document.querySelector('#startButton').disabled"),false,'expired request releases timer');
  assert.equal(await page.evaluate("localStorage.getItem('eumo-pair-pending-v1')"),null,'expired request is not restored');
  assert.match(await page.evaluate("document.querySelector('#caneleFeedback').textContent"),/expir|new code|reject/i);
  pairFailure=null;claimed=false;
  await submitPair(page);await waitFor(()=>claimed,'new request after expiry');confirmed=true;
  await waitFor(()=>page.evaluate('state.depth===240'),'initial import after physical confirmation');
  assert.equal(await page.evaluate('deviceIsDigging()'),true);
  assert.equal(await page.evaluate("document.querySelector('#startButton').disabled"),true);
  assert.equal(await page.evaluate("document.querySelector('#connectCaneleButton').dataset.icon"),'caneleConnected','confirmed fluted-back icon');
  assert.equal(await page.evaluate('state.balance'),12);
  assert.equal(await page.evaluate("state.rareInventory['moon-globe']"),1);
  assert.equal(await page.evaluate('state.history.length'),1);
  assert.match(await page.evaluate('getComputedStyle(document.body).fontFamily'),/Silver/);
  await page.evaluate("document.querySelector('#caneleDialog').close();document.querySelector('#mineToSurface').click()");
  assert.equal(await page.evaluate('MineView.cameraFor(state)'),0);
  current={...current,sequence:2,snapshot:{...current.snapshot,depth:145,seconds:4350,reportDays:{'2026-11-16':{seconds:4350}}}};
  await waitFor(()=>page.evaluate('state.depth===245'),'incremental depth import');
  assert.equal(await page.evaluate('MineView.cameraFor(state)'),0,'incoming sync does not reset camera');
  await page.evaluate("document.querySelector('#mineToMole').click()");
  assert.equal(await page.evaluate('MineView.cameraFor(state)===MineView.maximum(state)'),true);
  await page.cdp('Page.reload');await delay(600);await ready(page);
  await waitFor(()=>page.evaluate('deviceIsDigging()'),'binding restored after reload');
  assert.equal(await page.evaluate('state.depth'),245);
  assert.equal(await page.evaluate('state.totalSeconds'),7350);
  assert.equal(await page.evaluate('state.balance'),12);
  assert.equal(await page.evaluate('state.history.length'),1,'reload does not duplicate records');
  // Simulate BFCache lifecycle events: actual cache eligibility varies with
  // browser/Web Locks. The retained document must reacquire its save lease.
  const savedBinding=await page.evaluate("localStorage.getItem('eumo-linked-watch-v2')");
  const beforeRestore=await page.evaluate('JSON.stringify({depth:state.depth,totalSeconds:state.totalSeconds,balance:state.balance,inventory:state.inventory,rareInventory:state.rareInventory,history:state.history,deviceImports:state.deviceImports})');
  await page.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}))");
  assert.equal(await page.evaluate('deviceControl'),false,'pagehide releases device control');
  assert.equal(await page.evaluate("localStorage.getItem('eumo-linked-watch-v2')"),savedBinding,'pagehide retains the saved pairing');
  await page.evaluate("window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))");
  await waitFor(()=>page.evaluate('deviceControl && !!releaseSaveOwner && deviceIsDigging()'),'cached page reacquires ownership and resumes sync');
  assert.equal(await page.evaluate('JSON.stringify({depth:state.depth,totalSeconds:state.totalSeconds,balance:state.balance,inventory:state.inventory,rareInventory:state.rareInventory,history:state.history,deviceImports:state.deviceImports})'),beforeRestore,'cached-page restoration preserves progress, history and import receipts');
  // A paired owner may hold the save lock, but other tabs can still navigate.
  const follower=await newTab(page);
  await waitFor(()=>follower.evaluate("!!document.querySelector('#saveOwnerNotice') && !document.querySelector('#saveOwnerNotice').hidden"),'active owner notice in second tab');
  assert.equal(await follower.evaluate("document.querySelector('#gameShell').inert"),false,'blocked save owner does not disable navigation');
  await follower.evaluate("navigateTo('home')");
  assert.equal(await follower.evaluate("document.querySelector('#home').hidden"),false);
  await follower.cdp('Target.closeTarget',{targetId:page.id});page.socket.close();page=follower;
  await waitFor(()=>page.evaluate('deviceIsDigging()'),'paired tab takes over after owner closes');
  assert.equal(await page.evaluate('state.depth'),245,'ownership handoff does not re-import depth');
  assert.equal(await page.evaluate('state.balance'),12,'ownership handoff does not re-import rewards');
  await page.evaluate("navigateTo('focus')");
  // Stale server data and transport failure must both stop the digging animation.
  stale=true;
  await waitFor(()=>page.evaluate('!deviceIsDigging()'),'stale snapshot stops digging');
  assert.equal(await page.evaluate('state.depth'),245);
  assert.equal(await page.evaluate("document.querySelector('#connectCaneleButton').dataset.connection"),'offline');
  assert.equal(await page.evaluate("document.querySelector('#connectCaneleButton').dataset.icon"),'canele','offline uses front icon');
  stale=false;
  await waitFor(()=>page.evaluate('deviceIsDigging()'),'fresh device snapshot resumes digging');
  assert.equal(await page.evaluate("document.querySelector('#connectCaneleButton').dataset.connection"),'connected');
  readFailure=true;
  await waitFor(()=>page.evaluate('!deviceIsDigging()'),'network failure stops digging');
  assert.equal(await page.evaluate('state.balance'),12);
  assert.equal(await page.evaluate("document.querySelector('#connectCaneleButton').dataset.connection"),'offline');
  readFailure=false;
  await waitFor(()=>page.evaluate('deviceIsDigging()'),'network recovery resumes digging');
  // A failed atomic receipt+progress write must leave memory and disk untouched.
  assert.equal(await page.evaluate(`(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===STORAGE_KEY&&JSON.parse(v).deviceImports?.['${deviceId}']?.sequence===3)throw Error('quota');return original.call(this,k,v)};try{DeviceImportBridge.apply('${deviceId}',{sequence:3,snapshot:${JSON.stringify({...current.snapshot,depth:150})},serverTime:Date.now(),updated_at:new Date().toISOString()});return false;}catch{return state.depth===245&&JSON.parse(localStorage.getItem(STORAGE_KEY)).depth===245;}finally{Storage.prototype.setItem=original}})()`),true,'failed write rolls back import');
  if(process.env.EUMO_CAPTURE){
   const out=path.resolve(process.env.EUMO_CAPTURE);fs.mkdirSync(out,{recursive:true});
   await page.evaluate("navigateTo('focus');document.querySelector('#caneleDialog').close()");await delay(300);
   fs.writeFileSync(path.join(out,'screen-pair-main.png'),Buffer.from((await page.cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
   await openPair(page);fs.writeFileSync(path.join(out,'screen-pair-dialog.png'),Buffer.from((await page.cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  await openPair(page);
  await page.evaluate("document.querySelector('#caneleDisconnect').click()");
  await waitFor(()=>page.evaluate("!document.querySelector('#startButton').disabled"),'disconnect restores local timer');
  assert.equal(await page.evaluate("document.querySelector('#connectCaneleButton').dataset.connection"),'disconnected');
  assert.equal(await page.evaluate("document.querySelector('#connectCaneleButton').dataset.icon"),'canele');
  assert.equal(await page.evaluate('state.depth'),245);
  assert.deepEqual(errors,[],'no uncaught browser errors');
  console.log('PASS real Chrome: portable launch, usable unpaired tabs, queued save then Start, one Canele entry, import consent, 0372 + physical confirmation, expiry/rejection, icon states, 100 + 140 =240, +5 =245, reward/history deduplication, reload, simulated BFCache restore, stale/offline/recovery, camera, disconnect and atomic-write rollback.');
  await page.cdp('Browser.close');
 }finally{
  for(const client of clients)client.socket.close();browser.kill();server.close();
  if(browser.exitCode===null)await Promise.race([new Promise(resolve=>browser.once('exit',resolve)),delay(3000)]);
  fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 }
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
