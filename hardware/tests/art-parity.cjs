// Compare every terrain rectangle against the original JavaScript renderer.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=__dirname,c={Math};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'../../terrain.js'),'utf8'),c);
function css(color){const n=parseInt(color.slice(1),16),v=((n>>8)&0xf800)|((n>>5)&0x7e0)|((n>>3)&31);return '#'+[((v>>11)&31)*255/31,((v>>5)&63)*255/63,(v&31)*255/31].map(n=>Math.floor(n).toString(16).padStart(2,'0')).join('');}
let total=0;
for(let i=0;i<7;i++){
 const expected=[],ctx={fillStyle:'',fillRect(x,y,w,h){expected.push([x-72,y,w,h,css(this.fillStyle)]);}};
 c.Terrain.paint(ctx,c.Terrain.layers[i].from*6,280,37,c.Terrain.layers[i].from+1);
 const svg=fs.readFileSync(path.join(root,'ui-output/terrain-'+i+'.svg'),'utf8');
 const actual=[...svg.matchAll(/<rect x='(-?\d+)' y='(-?\d+)' width='(\d+)' height='(\d+)' fill='(#[0-9a-f]+)'\/>/g)].map(m=>[...m.slice(1,5).map(Number),m[5]]);
 assert.deepStrictEqual(actual,expected,'Terrain mismatch at '+c.Terrain.layers[i].id);total+=actual.length;
}
console.log('PASS: '+total+' terrain rectangles match original terrain.js across all 7 layers, including transition masking, roots and vines.');
