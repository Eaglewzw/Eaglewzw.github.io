const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let seed=42;const math=Object.create(Math);math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const ctx={window:{},Math:math};vm.createContext(ctx);vm.runInContext(fs.readFileSync('game/js/resident-behavior.js','utf8'),ctx);
const behavior=ctx.window.ResidentBehavior;
const scene={W:160,H:160,def:{spawnPoints:{default:[1,1]}},entities:[],passageZones:[],walkable:Array.from({length:100},(_,i)=>i%10>0&&i%10<9&&i>9&&i<90&&!(i%10===5&&i<70))};
const e={npcId:'a',kind:'npc',label:'散步的老人',x:24,baseline:28,faceDir:'down',wanderT:0};scene.entities.push(e);
const seen=new Set(),recent=[];
for(let i=0;i<100;i++){
 const [x,y]=behavior.destination(e,scene,[[4,5]]),cell=y*10+x;
 assert.ok(scene.walkable[cell],'random destination must be walkable');
 assert.ok(!recent.includes(cell),'do not mechanically retrace the last three stops');
 assert.ok(Math.abs(x-4)+Math.abs(y-5)<=3,'keep the activity anchored to its place');
 seen.add(cell);recent.push(cell);if(recent.length>3)recent.shift();e.x=x*16+8;e.baseline=y*16+12;
}assert.ok(seen.size>=10,'a resident needs more than two repeating stops');
const waits=[],paces=[];for(let i=0;i<30;i++){behavior.arrive(e,7);waits.push(e.wanderT);behavior.start(e);paces.push(e.behavior.legPace);}
assert.ok(Math.max(...waits)-Math.min(...waits)>3);assert.ok(Math.max(...paces)/Math.min(...paces)<1.2,'pace varies gently, not every frame');
const state={scene,player:{x:e.x,y:e.baseline},settings:{reducedMotion:false}};
e.wanderT=0;assert.equal(behavior.tick(e,state,scene,.1,false),true);assert.equal(e.behavior.gesture,'greet');
for(let i=0;i<25;i++)behavior.tick(e,state,scene,.1,true);
assert.equal(behavior.tick(e,state,scene,.1,true),false,'standing near a resident must not trap them in a greeting loop');
state.player={x:-500,y:-500};const other={npcId:'b',kind:'npc',x:e.x+16,baseline:e.baseline,wanderT:8,faceDir:'down'};scene.entities.push(other);
Object.assign(behavior.personality(e),{pause:0,social:-1,sociability:1});Object.assign(behavior.personality(other),{social:-1});e.wanderT=8;
behavior.tick(e,state,scene,.1,false);assert.equal(e.behavior.gesture,'chat');assert.equal(other.behavior.gesture,'chat');
for(let i=0;i<50;i++){behavior.tick(e,state,scene,.1,true);behavior.tick(other,state,scene,.1,true);}
assert.equal(e.behavior.pause,0);assert.equal(other.behavior.pause,0,'both people resume after a short conversation');
console.log('PASS: bounded varied destinations, recent-stop avoidance, gentle pace changes, greeting cooldown and finite two-person conversations.');
