// Deterministic contract checks; no browser installation or external service required.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={window:{matchMedia:()=>({matches:false})}};vm.createContext(context);
for(const name of ['chapters','scenes','characters','dialogues','memories','pack-village','pack-county','pack-city','village-life','village-homes','act-one'])
 vm.runInContext(fs.readFileSync('game/data/'+name+'.js','utf8'),context,{filename:name});
context.window.LGLandscape={daylight:s=>s.phase,nightAmount:s=>s.phase>.84||s.phase<.25?1:0};
for(const name of ['resident-life','story'])vm.runInContext(fs.readFileSync('game/js/'+name+'.js','utf8'),context,{filename:name});
const data=context.window.LIFE_DATA,life=context.window.ResidentLife,story=context.window.GameStory;
function runtime(def){
 const legend={...data.scenes.legend,...def.legend},cols=def.map[0].length;
 return {def,id:def.id,W:cols*16,H:def.map.length*16,entities:[],walkable:def.map.flatMap(row=>[...row].map(ch=>!legend[ch].solid))};
}
const world=runtime(data.scenes.village);world.entities=world.def.characters.filter(c=>c.route).map(c=>({npcId:c.id,homeScene:c.homeScene,nightHome:c.nightHome,x:c.at[0]*16+8,baseline:c.at[1]*16+12}));
const state={villageWorld:world,scene:world,story:{step:0},settings:{reducedMotion:false},time:0,phase:.3};
const signatures=new Set(),actions=new Set();
for(const person of world.entities){
 const scenes=[];
 for(const phase of [.3,.5,.65,.75,.94]){
  state.phase=phase;const plan=life.routine(person.npcId,state);
  assert.ok(plan);assert.equal(plan,life.routine(person.npcId,state),'plans must be referentially stable within a time block');
  actions.add(plan.action);scenes.push(plan.sceneId+':'+plan.action);
  for(const [x,y]of plan.route)assert.ok(world.walkable[y*world.W/16+x],person.npcId+' has blocked route');
  if(plan.sceneId!=='village'){
   const room=runtime(data.scenes[plan.sceneId]),at=life.indoorSpot(room,person.npcId,plan.action);
   assert.ok(room.walkable[at[1]*room.W/16+at[0]],'indoor activity must be on a free floor tile');
  }
 }
 signatures.add(scenes.join('|'));
}
assert.ok(signatures.size>=15,'residents should have distinct daily schedules');
for(const action of ['cook','visit','water','school','returnSchool','work','cool','paint'])assert.ok(actions.has(action));
state.phase=.65;const grandma=world.entities.find(e=>e.npcId==='village-resident-4');
grandma.inside=true;grandma.insideScene='village-home-14';grandma.action='visit';state.story.step=2;
const objective=story.target(state);assert.equal(objective.sceneId,'village-home-14','quest target must follow a visiting resident');
const quest=story.dialogue({ent:grandma},state);assert.equal(quest[quest.length-1].storyAdvance,3,'daily chat must not override story advancement');
const neighbor=world.entities.find(e=>e.npcId==='village-resident-1');
state.phase=.3;const morning=life.dialogue({ent:neighbor},state)[0].text;
state.phase=.65;neighbor.inside=true;neighbor.insideScene='village-home-4';
const afternoon=life.dialogue({ent:neighbor},state)[0].text;
assert.notEqual(morning,afternoon);assert.ok(afternoon.includes('邻居家'));
const room=runtime(data.scenes['village-home-4']);
const first=life.indoorSpot(room,'village-resident-1','visit'),second=life.indoorSpot(room,'village-resident-8','visit');
assert.notDeepEqual(first,second,'visitors need separate floor spots');
console.log('PASS: '+world.entities.length+' residents; '+signatures.size+' distinct daily schedules; walkable indoor/outdoor stops; visiting quest NPC and non-overriding dialogue.');
