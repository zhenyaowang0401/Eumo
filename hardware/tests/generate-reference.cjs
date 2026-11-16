const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'../..'),c={};c.window=c;vm.createContext(c);
for(const file of ['journey.js','treasures.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
const fixtures=[];
for(const rewardVersion of [1,2])for(const mode of ['study','work','rest'])for(const demo of [false,true])for(const base of [0,299,599,1200])for(const elapsed of [0,9,15,299,300,600,1200]){
const s={id:'reference-session',rareSeed:'seed0',rewardVersion,mode,demo,baseEligible:base,elapsed,plannedSeconds:Math.max(15,elapsed)};
const r=c.Journey.rewards(s);fixtures.push({s,stars:r.stars,depth:String(r.depth),finds:r.finds,golden:c.RareTreasures.awards(s,r.collected).map(a=>a.id)});
}
// Include real positive rare-drop examples, not only common cases.
for(let i=0;i<500;i++){const s={id:'reference-session',rareSeed:'seed'+i,mode:'study',demo:false,baseEligible:0,elapsed:600,plannedSeconds:600};const r=c.Journey.rewards(s),golden=c.RareTreasures.awards(s,r.collected).map(a=>a.id);if(golden.length)fixtures.push({s,stars:r.stars,depth:String(r.depth),finds:r.finds,golden});}
// Current 40% material rule across seeds and cumulative boundaries, including no-drop cases.
for(let i=0;i<500;i++){const s={id:'reference-session',rareSeed:'seed'+i,rewardVersion:2,mode:'study',demo:false,baseEligible:i%12*600,elapsed:1200,plannedSeconds:1200};const r=c.Journey.rewards(s);fixtures.push({s,stars:r.stars,depth:String(r.depth),finds:r.finds,golden:c.RareTreasures.awards(s,r.collected).map(a=>a.id)});}
fs.writeFileSync(path.join(__dirname,'reference.json'),JSON.stringify(fixtures));console.log(fixtures.length+' fixtures evaluated using the original JavaScript');
