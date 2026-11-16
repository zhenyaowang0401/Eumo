// Real Chrome + original app. The device HTTP response is a controlled fixture;
// this proves UI/storage integration, not a deployed cloud or physical watch.
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),delay=ms=>new Promise(r=>setTimeout(r,ms));
const deviceId='a'.repeat(64);let confirmed=false,claimed=false;
let current={deviceId,sequence:1,snapshot:{version:3,depth:140,seconds:4200,sessionElapsed:120,status:'digging',reportDays:{'2026-11-16':{seconds:4200}},earned:{stars:2,sessions:0,finds:[1,0,0,0],golden:{'moon-globe':1}},records:[{id:'watch-1',at:1000000,startedAt:400000,seconds:600,depth:20,stars:2,mode:'study',outcome:'stopped',demo:false,finds:[1,0,0,0],golden:['moon-globe']}]}};
const server=http.createServer((req,res)=>{
 if(req.url==='/api/dig-pair'){let raw='';req.on('data',b=>raw+=b);req.on('end',()=>{const body=JSON.parse(raw);res.setHeader('Content-Type','application/json');if(body.action==='claim'){assert.equal(body.code,'0372');claimed=true;res.end(JSON.stringify({pending:true}));}else if(body.action==='poll')res.end(JSON.stringify(confirmed?{paired:true,deviceId}:{pending:true}));else res.end(JSON.stringify({disconnected:true}));});return;}
 if(req.url==='/api/dig-sync'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({...current,updated_at:new Date().toISOString(),serverTime:Date.now()}));}
 const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)){res.writeHead(404);return res.end();}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'eumo-sync-test-')),'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 let socket;try{
  const ws=await new Promise((resolve,reject)=>{let output='';const t=setTimeout(()=>reject(Error('Chrome startup timeout')),20000);browser.stderr.on('data',b=>{output+=b;const m=output.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m){clearTimeout(t);resolve(m[1]);}});});
  const targets=await(await fetch('http://'+new URL(ws).host+'/json')).json();socket=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
  let seq=0;const waiting=new Map(),errors=[];
  socket.addEventListener('message',e=>{const x=JSON.parse(e.data);if(x.id){waiting.get(x.id)(x);waiting.delete(x.id);}if(x.method==='Runtime.exceptionThrown')errors.push(x.params.exceptionDetails);});
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;waiting.set(id,x=>x.error?reject(Error(JSON.stringify(x.error))):resolve(x.result));socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const x=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(x.exceptionDetails)throw Error(JSON.stringify(x.exceptionDetails));return x.result.value;};
  await cdp('Runtime.enable');await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const url='http://127.0.0.1:'+server.address().port+'/#focus';
  async function ready(){for(let i=0;i<100;i++){if(await evaluate("!!window.DeviceImportBridge && saveOwnerReady"))return;await delay(100);}throw Error('app not ready');}
  await cdp('Page.navigate',{url});await ready();
  await evaluate("state.depth=100;state.totalSeconds=3000;state.balance=10;state.inventory=[5,0,0,0];state.rareInventory={};state.history=[];state.profile.configured=true;state.session=null;state.reportDays={};save();window.confirm=()=>true;document.querySelector('.device-sync-panel input').value='0372';document.querySelector('.device-sync-panel form').requestSubmit()");
  for(let i=0;i<50&&!claimed;i++)await delay(100);assert.ok(claimed);
  await delay(3500);assert.equal(await evaluate('state.depth'),100); // No physical confirmation, no import.
  confirmed=true;
  for(let i=0;i<60;i++){if(await evaluate('state.depth===240'))break;await delay(100);}
  assert.equal(await evaluate('state.depth'),240);assert.equal(await evaluate('deviceIsDigging()'),true);assert.equal(await evaluate("document.querySelector('#startButton').disabled"),true);
  assert.equal(await evaluate('state.balance'),12);assert.equal(await evaluate("state.rareInventory['moon-globe']"),1);assert.equal(await evaluate('state.history.length'),1);
  assert.match(await evaluate("getComputedStyle(document.body).fontFamily"),/Silver/);
  await evaluate("document.querySelector('#mineToSurface').click()");assert.equal(await evaluate('MineView.cameraFor(state)'),0);
  current={...current,sequence:2,snapshot:{...current.snapshot,depth:145,seconds:4350,reportDays:{'2026-11-16':{seconds:4350}}}};
  await delay(5500);assert.equal(await evaluate('state.depth'),245);
  assert.equal(await evaluate('MineView.cameraFor(state)'),0); // incoming sync does not snap browsing back
  await evaluate("document.querySelector('#mineToMole').click()");assert.equal(await evaluate('MineView.cameraFor(state)===MineView.maximum(state)'),true);
  await cdp('Page.reload');await delay(600);await ready();await delay(700);assert.equal(await evaluate('state.depth'),245);
  assert.equal(await evaluate('state.totalSeconds'),7350);
  assert.equal(await evaluate('state.balance'),12);assert.equal(await evaluate('state.history.length'),1);
  if(process.env.EUMO_CAPTURE){const out=path.resolve(process.env.EUMO_CAPTURE);fs.mkdirSync(out,{recursive:true});await evaluate("navigateTo('focus');document.querySelector('.device-sync-panel').close()");await delay(700);fs.writeFileSync(path.join(out,'screen-pair-main.png'),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));await evaluate("document.querySelector('.focus-device-button').click()");fs.writeFileSync(path.join(out,'screen-pair-dialog.png'),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));await evaluate("document.querySelector('.device-sync-panel').close()");}
  // A failed atomic receipt+progress write must leave memory and disk untouched.
  assert.equal(await evaluate(`(()=>{const original=Storage.prototype.setItem;let writes=0;Storage.prototype.setItem=function(k,v){if(k===STORAGE_KEY&&++writes===2)throw Error('quota');return original.call(this,k,v)};try{DeviceImportBridge.apply('a'.repeat(64),{sequence:3,snapshot:${JSON.stringify({...current.snapshot,depth:150})},serverTime:Date.now(),updated_at:new Date().toISOString()});return false;}catch{return state.depth===245&&JSON.parse(localStorage.getItem(STORAGE_KEY)).depth===245;}finally{Storage.prototype.setItem=original}})()`),true);
  await evaluate("DeviceImportBridge.offline()");assert.equal(await evaluate('deviceIsDigging()'),false);
  await evaluate("[...document.querySelectorAll('.device-sync-panel button')].find(b=>b.textContent==='断开小屏幕').click()");assert.equal(await evaluate("document.querySelector('#startButton').disabled"),false);
  assert.equal(await evaluate('state.depth'),245);assert.deepEqual(errors,[]);
  console.log('PASS real Chrome: 0372 pairing + physical confirmation, 100 + watch 140 =240, +5 =245, rewards/history import once, reload, daily time, digging, browsing, offline, disconnect, atomic-write failure.');
  await cdp('Browser.close');
 }finally{socket?.close();browser.kill();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
