// Node-only layout checks. No browser or dependencies required.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={window:{}};vm.createContext(context);
for(const file of ['chapters','scenes','characters','dialogues','memories','pack-village','pack-county','pack-city','village-life','village-homes','act-one'])
 vm.runInContext(fs.readFileSync('game/data/'+file+'.js','utf8'),context,{filename:file});
const data=context.window.LIFE_DATA,homes=Object.values(data.scenes).filter(s=>s.household),failures=[];
assert.equal(homes.length,15);
assert.equal(new Set(homes.map(s=>s.map.join('\n'))).size,15);
for(const home of homes){
 const legend={...data.scenes.legend,...home.legend},w=home.map[0].length,h=home.map.length;
 assert.ok(w<=20&&h<=15,home.id+' should be compact');
 assert.ok(home.map.every(r=>r.length===w),home.id+' ragged map');
 const free=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&!legend[home.map[y][x]].solid;
 const start=home.spawnPoints.default,q=[start],seen=new Set([start.join(',')]);
 assert.ok(free(...start),home.id+' spawn blocked');
 for(let i=0;i<q.length;i++){
  const [x,y]=q[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy,key=nx+','+ny;
   if(free(nx,ny)&&!seen.has(key)){seen.add(key);q.push([nx,ny]);}
  }
 }
 for(const [name,at]of Object.entries(home.activitySpots))if(!seen.has(at.join(',')))failures.push(home.id+' activity '+name+' unreachable '+at);
 for(const c of home.characters)if(!seen.has(c.at.join(',')))failures.push(home.id+' resident '+c.id+' unreachable');
 for(const z of home.interactables){
  const at=z.at || z.tiles[0];
  if(!q.some(p=>Math.hypot(p[0]-at[0],p[1]-at[1])<=1.4))failures.push(home.id+' interaction '+z.id+' unreachable');
 }
}
assert.deepEqual(failures,[]);console.log('PASS: 15 compact distinct homes; entrances, residents, all activity spots and interactions reachable.');
