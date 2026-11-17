// Rasterize the actual website startup art at device resolution (Chrome + Pillow).
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'tests/ui-output');fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'woodland.css'),'utf8');
const logo=html.match(/<svg class="startup-mark"[\s\S]*?<\/svg>/)[0];
const rules=css.slice(css.indexOf('.startup-splash {'),css.indexOf('@keyframes eumo-mark-in'));
const data=(file,mime)=>'data:'+mime+';base64,'+fs.readFileSync(path.join(root,file)).toString('base64');
const background=`<style>@font-face{font-family:'Pixelify Sans';src:url('${data('assets/fonts/pixelify-sans.ttf','font/ttf')}');font-weight:100 900}html,body{margin:0}${rules}.startup-splash{animation:none}</style><div class="startup-splash"><svg class="startup-meadow" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice"><image href="${data('assets/backgrounds/flower-meadow.png','image/png')}" width="1672" height="941"/></svg><span class="startup-credit">VG</span></div>`;
const mark=`<style>html,body{margin:0;background:transparent}svg{display:block;width:211.2px;height:auto}</style>${logo}`;
const executable=process.env.CHROME_PATH||(process.platform==='win32'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':'google-chrome');
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'eumo-art-'));
 const browser=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 let socket;
 try{
  const ws=await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(Error('Chrome startup timed out')),20000);browser.on('error',reject);browser.stderr.on('data',b=>{log+=b;const m=log.match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timer);resolve(m[1]);}});});
  const target=(await(await fetch('http://'+new URL(ws).host+'/json')).json()).find(t=>t.type==='page');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
  let id=0;const pending=new Map();socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,t=setTimeout(()=>reject(Error('Chrome command timeout: '+method)),15000);pending.set(n,m=>{clearTimeout(t);m.error?reject(Error(m.error.message)):resolve(m.result);});socket.send(JSON.stringify({id:n,method,params}));});
  await send('Page.enable');const {frameTree}=await send('Page.getFrameTree');
  for(const [name,content,width,height] of [['startup-background',background,240,280],['startup-logo',mark,212,104]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
   await send('Emulation.setDefaultBackgroundColorOverride',{color:{r:0,g:0,b:0,a:0}});
   await send('Page.setDocumentContent',{frameId:frameTree.frame.id,html:'<!doctype html>'+content});
   const ready=await send('Runtime.evaluate',{expression:'Promise.all([document.fonts.ready,...Array.from(document.images).map(i=>i.decode())]).then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))',awaitPromise:true});
   if(ready.exceptionDetails)throw Error('Startup assets failed to load');
   const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(shot.data,'base64'));
  }
  await send('Browser.close');
 }finally{socket?.close();browser.kill();}
 execFileSync(process.env.PYTHON||'python',[path.join(__dirname,'pack_startup_assets.py')],{stdio:'inherit',windowsHide:true});
})().catch(e=>{console.error(e);process.exitCode=1;});
