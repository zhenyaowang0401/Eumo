'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../save-transfer.js'),'utf8');
const GAME='loop-pet-soft-universe-v1';
const progress=balance=>({profile:{name:'Momo'},inventory:[0,0,0,0],balance,owned:[],home:{slots:{}},session:null});
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function fixture(){
 const values=new Map([[GAME,JSON.stringify(progress(10))]]),nodes=new Map(),downloads=[];
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',files:[],click(){},close(){},showModal(){}});return nodes.get(id);};
 let reloaded=false;
 const context=vm.createContext({window:{},document:{getElementById:node,createElement:()=>({click(){}})},localStorage:storage,Blob,URL:{createObjectURL:blob=>{downloads.push(blob);return'blob:test';},revokeObjectURL(){}},setTimeout(){},confirm:()=>true,location:{reload(){reloaded=true;}}});
 vm.runInContext(source,context);
 const api=context.window.SaveTransfer;
 function importFile(balance){node('saveTransferFile').files=[{size:100,text:async()=>JSON.stringify({format:'eumo-progress',version:1,storage:{[GAME]:JSON.stringify(progress(balance))}})}];return node('saveTransferFile').onchange();}
 return{api,node,storage,downloads,importFile,reloaded:()=>reloaded};
}
test('backup export awaits queued progress before encoding the downloaded file',async()=>{
 const f=fixture(),flush=deferred();
 f.api.init({read:()=>progress(10),flush:()=>flush.promise});
 const exporting=f.node('exportProgress').onclick();assert.equal(f.downloads.length,0);
 f.storage.setItem(GAME,JSON.stringify(progress(25)));flush.resolve();await exporting;
 assert.equal(JSON.parse(JSON.parse(await f.downloads[0].text()).storage[GAME]).balance,25);
});
test('backup import does not replace progress until exclusive ownership is granted',async()=>{
 const f=fixture(),lease=deferred();let requested=false,prepared=false;
 f.api.init({read:()=>progress(10),beginImport:()=>{requested=true;return lease.promise;},beforeReload:()=>{prepared=true;}});
 const importing=f.importFile(40);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(requested,true);assert.equal(JSON.parse(f.storage.getItem(GAME)).balance,10);assert.equal(f.reloaded(),false);
 lease.resolve();await importing;
 assert.equal(JSON.parse(f.storage.getItem(GAME)).balance,40);assert.equal(prepared,true);assert.equal(f.reloaded(),true);
});
test('a rejected import lease preserves existing progress and releases temporary ownership',async()=>{
 const f=fixture();let cancelled=false;
 f.api.init({read:()=>progress(10),beginImport:async()=>{throw Error('Other tab recording');},cancelImport:()=>{cancelled=true;},beforeReload:()=>assert.fail('must not reload')});
 await f.importFile(40);
 assert.equal(JSON.parse(f.storage.getItem(GAME)).balance,10);assert.equal(cancelled,true);assert.equal(f.reloaded(),false);
 assert.match(f.node('saveTransferStatus').textContent,/could not be imported/);
});
