// Generate device catalogs and pixel assets from the original repository, not a second shop.
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process');
const src=path.join(__dirname,'..'),out=path.join(__dirname,'Eumo169');fs.mkdirSync(out,{recursive:true});
const c={console,Math};c.window=c;vm.createContext(c);
for(const f of ['journey.js','home.js','wardrobe.js','wardrobe-art.js','treasures.js','mole-art.js','home-scenery.js','pixel-art.js'])vm.runInContext(fs.readFileSync(path.join(src,f),'utf8'),c);
const catalog={items:c.WardrobeCatalog.items,tools:c.WardrobeCatalog.tools,home:{items:c.HomeCatalog.items,themes:c.HomeCatalog.themes,slots:c.HomeCatalog.slots,materials:c.HomeCatalog.materials},treasures:c.RareTreasures.items.map(({rects,...v})=>v)};
fs.writeFileSync(path.join(out,'Catalog.h'),'#pragma once\nstatic const char CATALOG_JSON[] = R"catalog('+JSON.stringify(catalog)+')catalog";\n');
const arts={};
for(let p=0;p<2;p++){const rows=[],ctx={fillStyle:'',fillRect(x,y,w,h){rows.push([x,y,w,h,this.fillStyle]);}};c.MoleArt.paint(ctx,{color:'#a9b4c6',dig:true,frame:p});arts['body'+p]=rows;}
for(const mood of ['awake','rest','drowsy','asleep']){const rows=[],ctx={fillStyle:'',fillRect(x,y,w,h){rows.push([x,y,w,h,this.fillStyle]);}};c.MoleArt.paint(ctx,{color:'#a9b4c6',mood,frame:12,sleepScale:mood==='asleep'?.86:1});arts['idle_'+mood]=rows;}
for(const i of [{id:'basic',category:'tools'},...catalog.tools.map(i=>({...i,category:'tools'})),...catalog.items])for(let p=0;p<(i.category==='tools'?6:1);p++){
const r=[];if(i.category==='tools')c.WardrobeArt.drawTool((...a)=>r.push(a),i.id==='basic'?null:i.id,p);else c.WardrobeArt[{hats:'hat',glasses:'glasses',scarves:'scarf',extras:'extra'}[i.category]]((...a)=>r.push(a),i.id);arts[i.id+'_'+p]=r;
}
function svgRects(svg){return [...svg.matchAll(/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" fill="([^"]+)"/g)].map(m=>[...m.slice(1,5).map(Number),m[5]]);}
for(const i of catalog.home.items)arts['home_'+i.id]=svgRects(c.PixelArt.homeIcon(i.id));
for(const id of ['star','mushroom','crystal','fossil'])arts['find_'+id]=svgRects(c.PixelArt.iconSVG(id));
for(const i of c.RareTreasures.items)arts['rare_'+i.id]=i.rects;
let h='#pragma once\n#include <stdint.h>\nstruct PixelRect {int16_t x,y,w,h;uint32_t color;};\nstruct Sprite {const char *id;const PixelRect *data;uint16_t count;};\n';
let n=0;const entries=[];for(const [id,rows]of Object.entries(arts)){if(!rows.length)throw Error('Empty sprite '+id);const name='sprite'+n++;h+='static const PixelRect '+name+'[] = {'+rows.map(r=>'{'+r.slice(0,4).map(Math.round).join(',')+',0x'+r[4].slice(1,7)+'}').join(',')+'};\n';entries.push('{'+JSON.stringify(id)+','+name+','+rows.length+'}');}
h+='static const Sprite SPRITES[]={'+entries.join(',')+'};\n';fs.writeFileSync(path.join(out,'Sprites.h'),h);
const commit=cp.execFileSync('git',['-C',src,'rev-parse','HEAD'],{encoding:'utf8'}).trim();fs.writeFileSync(path.join(__dirname,'SOURCE.json'),JSON.stringify({repository:'https://github.com/zhenyaowang0401/1111',commit,catalogItems:catalog.items.length,tools:catalog.tools.length,furniture:catalog.home.items.length,sprites:n},null,2));
fs.writeFileSync(path.join(__dirname,'assets.json'),JSON.stringify(arts));
console.log('Generated original catalogs, furniture, treasures and '+n+' sprites at '+commit);
