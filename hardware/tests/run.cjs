// Use CXX for clang++/g++ or a Zig executable; no compiler or user files are bundled.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
process.chdir(__dirname);
const include=process.env.ARDUINOJSON_INCLUDE;
if(!include||!fs.existsSync(path.join(include,'ArduinoJson.h')))throw Error('Set ARDUINOJSON_INCLUDE to ArduinoJson 7.4.2 src directory.');
const compiler=process.env.CXX||'clang++',prefix=/zig(?:\.exe)?$/i.test(compiler)?['c++']:[];
const run=(cmd,args)=>cp.execFileSync(cmd,args,{stdio:'inherit',windowsHide:true});
run(process.execPath,['generate-reference.cjs']);
for(const name of ['game','ui']){const exe=path.resolve(name+'_test'+(process.platform==='win32'?'.exe':''));run(compiler,[...prefix,'-std=c++17','-Ihost','-I'+include,'host/'+name+'_test.cpp','-o',exe]);run(exe,[]);}
require('../../device-progress').validateSnapshot(JSON.parse(fs.readFileSync('device-snapshot.json')));
run(process.execPath,['art-parity.cjs']);
console.log('PASS device snapshot validated by original web merge protocol');
