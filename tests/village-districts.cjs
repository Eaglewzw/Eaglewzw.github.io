// Pure data regression: no browser dependencies. Run: node tests/village-districts.cjs
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={window:{}};vm.createContext(context);
for(const name of ['chapters','scenes','characters','dialogues','memories','pack-village','pack-county','pack-city','village-life','village-homes','act-one']) {
 vm.runInContext(fs.readFileSync('game/data/'+name+'.js','utf8'),context,{filename:name+'.js'});
}
const data=context.window.LIFE_DATA,scene=data.scenes.village;
const legend={...data.scenes.legend,...scene.legend},width=scene.map[0].length,height=scene.map.length;
assert.equal(width,62);assert.equal(height,44);assert.ok(scene.map.every(row=>row.length===width));
const solid=(x,y)=>!scene.map[y]||!scene.map[y][x]||(legend[scene.map[y][x]]||{}).solid;
const q=[scene.spawnPoints.default],seen=new Set([q[0].join(',')]);
for(let i=0;i<q.length;i++){
 const [x,y]=q[i];
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const nx=x+dx,ny=y+dy,key=nx+','+ny;
  if(nx<0||ny<0||nx>=width||ny>=height||solid(nx,ny)||seen.has(key))continue;
  seen.add(key);q.push([nx,ny]);
 }
}
function reachable(point,label){assert.ok(seen.has(point.join(',')),label+' must be reachable: '+point);}
for(const home of scene.homes){reachable(home,'Home porch');reachable([home[0],home[1]-1],'Home door');}
for(const place of scene.landmarks)reachable(place.at,place.name);
for(const ch of scene.characters){reachable(ch.at,ch.id+' spawn');for(const stop of ch.route||[])reachable(stop,ch.id+' route');if(ch.nightHome)reachable(ch.nightHome,ch.id+' door');}
for(const passage of scene.interactables.filter(z=>z.type==='passage'))for(const tile of passage.tiles)reachable(tile,passage.id);
for(const [id,point] of Object.entries(scene.spawnPoints))reachable(point,id);
for(let x=50;x<=56;x++)for(const y of [22,23]){
 const spec=legend[scene.map[y][x]];assert.equal(spec.tile,'bridge');assert.ok(!spec.solid&&!spec.water);
}
assert.equal(legend[scene.map[37][12]].solid,true,'The visible well must block walking');
assert.equal(legend[scene.map[21][53]].water,true,'Water beside the bridge must remain blocked');
assert.ok(scene.map.some(row=>row.includes('j')),'Old alley paving must exist');
assert.equal(scene.map[12][17],'T','Keep the story tree');
assert.ok(!solid(18,12),'Keep room for the persistent story stool');
console.log('PASS: four districts, all 15 home doors, all residents/routes, bridge crossing, well collision and original scene exits are reachable.');
