'use strict';
// Local trial server: persistent accounts, actual SQL and no demonstration data.
// Hosted deployment still uses api/*.js with its configured Supabase database.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {openLocalDatabase}=require('./local_database.cjs');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.m4a':'audio/mp4','.ttf':'font/ttf','.otf':'font/otf','.woff':'font/woff','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'};
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}).end(JSON.stringify(value));}
function privatePath(pathname){return pathname.split('/').some(s=>s.startsWith('.'))||/^\/(ai|api|database|scripts|tests|docs|hardware|desktop|node_modules|rest)(\/|$)/.test(pathname);}
function acquireDirectoryLock(directory){
 fs.mkdirSync(directory,{recursive:true});const file=path.join(directory,'.eumo-local-server.lock');
 try{fs.writeFileSync(file,String(process.pid),{flag:'wx',mode:0o600});}
 catch(error){
  if(error.code!=='EEXIST')throw error;
  let pid;try{pid=Number(fs.readFileSync(file,'utf8'));}catch{}
  if(!Number.isSafeInteger(pid)||pid<1)throw Error('Local database is locked. Stop the previous server before starting another.');
  try{process.kill(pid,0);throw Error('Local database is already open in another server.');}
  catch(lookup){if(lookup.code!=='ESRCH')throw lookup;}
  fs.unlinkSync(file);fs.writeFileSync(file,String(process.pid),{flag:'wx',mode:0o600});
 }
 return ()=>{try{if(fs.readFileSync(file,'utf8')===String(process.pid))fs.unlinkSync(file);}catch{}};
}
async function startLocalServer({port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1',dataDir=path.resolve(process.env.EUMO_LOCAL_DATA_DIR||path.join(root,'.eumo-local-db'))}={}){
 if(!Number.isInteger(port)||port<0||port>65535)throw Error('PORT must be an integer between 0 and 65535');
 const directory=path.resolve(dataDir),unlock=acquireDirectoryLock(directory),realDirectory=fs.realpathSync(directory);let local;
 try{local=await openLocalDatabase(directory);}catch(error){unlock();throw error;}
 const friends=require('../api/friends.js').createHandler({env:local.env,fetchImpl:local.fetchImpl});
 const coStudy=require('../api/co-study.js').createHandler({env:local.env,fetchImpl:local.fetchImpl});
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Eumo-Environment','isolated-local-preview');
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return json(res,400,{error:'INVALID_URL'});}
  try{
   if(pathname==='/api/friends')return await friends(req,res);
   if(pathname==='/api/co-study')return await coStudy(req,res);
   if(pathname==='/api/chat')return await require('../api/chat.js')(req,res);
   if(pathname==='/api/transcribe')return await require('../api/transcribe.js')(req,res);
   // Local identities never authorize hosted devices or mutate hosted progress.
   if(['/api/device','/api/dig-pair','/api/dig-sync'].includes(pathname))return json(res,503,{error:'DEVICE_SERVICE_NOT_CONFIGURED'});
   if(privatePath(pathname)||!['GET','HEAD'].includes(req.method))return json(res,404,{error:'NOT_FOUND'});
   const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(root+path.sep)||file===directory||file.startsWith(directory+path.sep)||!types[path.extname(file)])return json(res,404,{error:'NOT_FOUND'});
   let real,stat;try{real=fs.realpathSync(file);stat=fs.statSync(real);}catch{return json(res,404,{error:'NOT_FOUND'});}
   if(!stat.isFile()||!real.startsWith(root+path.sep)||privatePath('/'+path.relative(root,real).split(path.sep).join('/'))||real===realDirectory||real.startsWith(realDirectory+path.sep))return json(res,404,{error:'NOT_FOUND'});
   const headers={'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
   let start=0,end=stat.size-1,status=200;
   if(req.headers.range){
    const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if(!match||!match[1]&&!match[2]){res.writeHead(416,{'Content-Range':'bytes */'+stat.size}).end();return;}
    start=match[1]?Number(match[1]):Math.max(0,stat.size-Number(match[2]));end=match[1]&&match[2]?Math.min(end,Number(match[2])):end;
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stat.size){res.writeHead(416,{'Content-Range':'bytes */'+stat.size}).end();return;}
    status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
   }
   headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);
   if(req.method==='HEAD')res.end();else fs.createReadStream(real,stat.size?{start,end}:{}).on('error',()=>res.destroy()).pipe(res);
  }catch{if(!res.headersSent)json(res,500,{error:'LOCAL_SERVER_ERROR'});else res.end();}
 });
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});}
 catch(error){await local.close();unlock();throw error;}
 let stopping;
 async function close(){if(stopping)return stopping;stopping=new Promise(resolve=>{server.close(async()=>{try{await local.close();}finally{unlock();resolve();}});server.closeIdleConnections?.();});return stopping;}
 return {server,close,dataDir:directory};
}
if(require.main===module){
 startLocalServer().then(({server,close,dataDir})=>{
  const address=server.address(),hostname=address.address==='0.0.0.0'?'localhost':address.address.includes(':')?'['+address.address+']':address.address;console.log('Eumo local preview: http://'+hostname+':'+address.port);
  console.log('Isolated local accounts and co-study rooms. Hosted accounts and device pairing are separate.');
  console.log('Local data: '+dataDir);
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>close().then(()=>process.exit(0)));
 }).catch(error=>{console.error('Local preview could not start: '+error.message);process.exitCode=1;});
}
module.exports={startLocalServer};
