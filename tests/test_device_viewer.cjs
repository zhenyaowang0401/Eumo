const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('viewer renders original sprites, freezes stale digging and never writes local game state',async()=>{
 let clock=0,tick,poll,paint,fail=false;const text=[],elements={'#status':{},'#connect':{},'#link':{}};
 const ctx={fillRect(){},save(){},restore(){},translate(){},scale(){},fillText(s){text.push(s);}};
 elements['#mine']={getContext:()=>ctx};
 const sandbox={window:{},document:{querySelector:s=>elements[s]},location:{hash:'#'+'b'.repeat(64)},performance:{now:()=>clock},requestAnimationFrame:fn=>tick=fn,setInterval:fn=>poll=fn,AbortSignal,fetch:async()=>{if(fail)throw Error('Offline');return {ok:true,json:async()=>({sequence:1,serverTime:1000,updated_at:new Date(1000).toISOString(),snapshot:{depth:12.5,status:'digging',color:'#a9b4c6',equipped:['hat'],tool:null}})};}};
 vm.createContext(sandbox);for(const file of ['mole-art.js','wardrobe-art.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),sandbox);
 sandbox.MoleArt=sandbox.window.MoleArt;sandbox.WardrobeArt=sandbox.window.WardrobeArt;const original=sandbox.MoleArt.paint;sandbox.MoleArt.paint=(c,o)=>{paint=o;original(c,o);};
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../device-live.js'),'utf8'),sandbox);await new Promise(setImmediate);tick(0);assert.equal(paint.dig,true);assert.equal(text.at(-1),'12.5m');
 clock=21001;tick(clock);assert.equal(paint.dig,false);assert.match(elements['#status'].textContent,/离线/);assert.equal(text.at(-1),'12.5m');
 fail=true;await poll();tick(clock);assert.equal(paint.dig,false);assert.match(elements['#status'].textContent,/保留最后进度/);
});
