// Stable daily plans. Destinations are resolved against the actual village navigation grid.
window.ResidentLife = (function () {
  'use strict';
  const planCache=new WeakMap(), spotCache=new WeakMap();
  const periods=['morning','noon','afternoon','evening','night'];
  const fallbackPlaces={garden:[14,20],well:[11,38],'old-tree':[18,13],'old-lane':[10,34],river:[49,23],bridge:[53,23],'village-gate':[16,40]};
  const names={garden:'菜园',well:'老井','old-tree':'老槐树下','old-lane':'老巷',river:'河边',bridge:'木桥','village-gate':'上学的村口'};
  const actions={
    water:{activity:'给菜苗浇水',line:'水慢慢浇到根边就好。太阳一高，叶子上的水就干得快。'},
    harvest:{activity:'摘菜装篮',line:'这一篮先送到家里，嫩叶留着晚上下锅。'},
    cook:{activity:'在灶间做饭',line:'锅里还煨着菜，等火小一点就能盛出来了。'},
    eat:{activity:'坐下来吃饭',line:'忙了一上午，坐下来吃口热饭，下午再出门。'},
    weave:{activity:'编补竹篮',line:'这根竹篾得顺着纹理弯，急着折就会断。'},
    work:{activity:'刨磨木器',line:'边角再磨圆一点，拿在手里就不扎人了。'},
    deliver:{activity:'给邻居送东西',line:'拐过这条巷子就到了，送完东西再回家。'},
    visit:{activity:'在邻居家串门',line:'来串个门，问问近况，顺便坐一会儿。'},
    school:{activity:'背着书往村口走',line:'书都装好了。走到村口，再沿着去县城的路往前。'},
    returnSchool:{activity:'放学后回村',line:'今天的功课记在本子里了，回家先写完再出来玩。'},
    read:{activity:'在书桌前读书',line:'刚读到这里，折个小纸签，等会儿接着看。'},
    cool:{activity:'在树荫下乘凉',line:'树下凉快，坐坐再走。过路的人总能聊上几句。'},
    fetch:{activity:'到老井边取水',line:'把桶提稳，沿着老巷慢慢走回去。'},
    paint:{activity:'在河边写生',line:'水面一阵亮、一阵暗，先把眼前这点颜色记下来。'},
    play:{activity:'在河边看风筝',line:'风从桥那边过来了，风筝线又绷直了。'},
    walk:{activity:'沿巷道散步',line:'绕过老井，再从树下走回来，刚好活动活动腿脚。'},
    rest:{activity:'在家歇息',line:'门已经掩好了，灯留着，坐一会儿就休息。'}
  };
  const outdoor=(place,action)=>({sceneId:'village',place,action});
  const indoors=(action,house)=>({sceneId:house===undefined?'home':'village-home-'+house,action});
  const profiles=[
    [outdoor('garden','water'),indoors('cook'),outdoor('garden','harvest'),indoors('cook')],
    [outdoor('old-lane','deliver'),indoors('eat'),indoors('visit',4),indoors('weave')],
    [outdoor('village-gate','school'),indoors('eat'),outdoor('village-gate','returnSchool'),indoors('read')],
    [indoors('work'),outdoor('old-tree','cool'),outdoor('old-lane','deliver'),indoors('work')],
    [outdoor('well','fetch'),outdoor('old-tree','cool'),indoors('visit',14),indoors('cook')],
    [outdoor('garden','water'),outdoor('old-tree','cool'),outdoor('garden','harvest'),indoors('eat')],
    [outdoor('old-lane','deliver'),indoors('eat'),outdoor('river','deliver'),indoors('read')],
    [outdoor('old-lane','harvest'),indoors('cook'),indoors('visit',0),indoors('cook')],
    [outdoor('well','walk'),outdoor('old-tree','cool'),indoors('visit',4),indoors('rest')],
    [outdoor('village-gate','deliver'),outdoor('old-lane','cool'),outdoor('old-lane','deliver'),indoors('eat')],
    [outdoor('village-gate','school'),indoors('eat'),outdoor('river','play'),indoors('read')],
    [outdoor('garden','water'),outdoor('old-tree','cool'),outdoor('garden','harvest'),indoors('rest')],
    [outdoor('river','walk'),indoors('eat'),outdoor('bridge','walk'),indoors('cook')],
    [outdoor('village-gate','school'),indoors('read'),outdoor('village-gate','returnSchool'),indoors('read')],
    [outdoor('well','fetch'),indoors('cook'),outdoor('old-lane','walk'),indoors('rest')],
    [outdoor('garden','harvest'),outdoor('old-tree','eat'),outdoor('old-lane','deliver'),indoors('cook')],
    [indoors('work'),outdoor('old-tree','cool'),indoors('visit',3),indoors('work')],
    [outdoor('old-lane','deliver'),indoors('eat'),outdoor('village-gate','deliver'),indoors('rest')],
    [outdoor('village-gate','school'),indoors('eat'),outdoor('river','play'),indoors('read')],
    [outdoor('well','walk'),outdoor('old-tree','cool'),outdoor('bridge','walk'),indoors('rest')],
    [outdoor('river','paint'),outdoor('old-tree','cool'),outdoor('bridge','paint'),indoors('rest')]
  ];
  function index(id){return id==='painter-demo'?20:Number(id.replace('village-resident-',''));}
  function period(state){
    const hour=window.LGLandscape.daylight(state)*24;
    return hour<6||hour>=20?'night':hour<11?'morning':hour<14?'noon':hour<17?'afternoon':'evening';
  }
  function cache(world){
    if(planCache.has(world))return planCache.get(world);
    const cols=world.W/16,startAt=world.def.spawnPoints.default,start=startAt[1]*cols+startAt[0];
    const connected=new Set(),queue=[start];
    if(world.walkable[start])connected.add(start);
    for(let i=0;i<queue.length;i++){
      const cell=queue[i];
      for(const n of [cell-1,cell+1,cell-cols,cell+cols]){
        if(n<0||n>=world.walkable.length||Math.abs(n%cols-cell%cols)>1||!world.walkable[n]||connected.has(n))continue;
        connected.add(n);queue.push(n);
      }
    }
    const result={plans:new Map(),connected};planCache.set(world,result);return result;
  }
  function nearest(world,point,offset){
    const c=cache(world),cols=world.W/16;
    let best=null,bestD=Infinity;
    for(const cell of c.connected){
      const x=cell%cols,y=Math.floor(cell/cols),d=Math.abs(x-point[0])+Math.abs(y-point[1]);
      const score=d*100+((x*13+y*7+offset*11)%19);
      if(score<bestD){bestD=score;best=[x,y];}
    }
    return best || world.def.spawnPoints.default.slice();
  }
  function routine(id,state){
    const i=index(id),world=state.villageWorld;
    if(!world || !Number.isInteger(i) || !profiles[i])return null;
    const resident=world.entities.find(e=>e.npcId===id);
    if(!resident)return null;
    const time=period(state),key=id+':'+time,c=cache(world);
    if(c.plans.has(key))return c.plans.get(key);
    const spec=time==='night'?indoors('rest'):profiles[i][periods.indexOf(time)];
    const sceneId=spec.sceneId==='home'?resident.homeScene:spec.sceneId;
    let route;
    if(sceneId==='village'){
      const place=(world.def.worldPlaces||{})[spec.place];
      const mark=(world.def.landmarks||[]).find(p=>p.id===spec.place);
      const at=Array.isArray(place)?place:place&&place.at || mark&&mark.at || fallbackPlaces[spec.place];
      const first=nearest(world,[at[0]+i%3-1,at[1]+Math.floor(i%6/3)],i);
      const second=nearest(world,[at[0]+(i%2?2:-2),at[1]+1],i+1);
      route=[first,second];
    }else{
      const portal=world.def.interactables.find(p=>p.toScene===sceneId);
      route=[portal?portal.at.slice():resident.nightHome.slice()];
    }
    const plan={key,period:time,sceneId,route,action:spec.action,
      activity:actions[spec.action].activity,holdSeconds:['water','work','paint','weave','cool','cook'].includes(spec.action)?7:4,
      indoorKind:spec.action==='visit'?'welcome':spec.action==='read'?'work':spec.action==='weave'?'work':spec.action==='rest'?'rest':spec.action,
      destination:sceneId==='village'?names[spec.place]:window.LIFE_DATA.scenes[sceneId].name};
    c.plans.set(key,plan);return plan;
  }
  function indoorSpot(scene,id,action){
    const spotKind={read:'work',weave:'work',visit:'welcome',rest:'rest',cook:'cook',eat:'eat',work:'work'}[action]||'welcome';
    const def=scene.def||scene,spots=def.activitySpots||{};
    let origin=spots[spotKind]||spots.welcome||((def.characters||[]).find(c=>c.id===id)||{}).at||def.spawnPoints.default;
    if(!scene.walkable)return origin.slice();
    if(!spotCache.has(scene))spotCache.set(scene,new Map());
    const assignments=spotCache.get(scene),key=id+':'+spotKind;
    if(assignments.has(key))return assignments.get(key).slice();
    for(const old of assignments.keys())if(old.startsWith(id+':'))assignments.delete(old);
    const used=new Set([...assignments.values()].map(p=>p.join(','))),cols=scene.W/16;
    const candidates=[];
    scene.walkable.forEach((open,cell)=>{if(open)candidates.push([cell%cols,Math.floor(cell/cols)]);});
    candidates.sort((a,b)=>(Math.abs(a[0]-origin[0])+Math.abs(a[1]-origin[1]))-(Math.abs(b[0]-origin[0])+Math.abs(b[1]-origin[1])));
    const result=candidates.find(p=>!used.has(p.join(',')))||origin;
    assignments.set(key,result);return result.slice();
  }
  function dialogue(target,state){
    const id=target.ent&&target.ent.npcId,plan=id&&routine(id,state);
    if(!plan)return null;
    const resident=state.villageWorld.entities.find(e=>e.npcId===id);
    const inside=resident.insideScene || (resident.inside?resident.homeScene:null);
    const onSite=plan.sceneId==='village'?!resident.inside&&!resident.walking&&(!resident.behavior||resident.behavior.atActivity):inside===plan.sceneId;
    const prefix=inside && inside!==resident.homeScene?'今天来邻居家坐坐。':inside?'回到屋里了。':'';
    const text=onSite?prefix+actions[plan.action].line:'我正往'+plan.destination+'去，等到了再忙手里的事。';
    return [{text,end:true}];
  }
  // Small original pixel props show the activity rather than adding floating text.
  function draw(ctx,e,state){
    if(e.hidden||!e.npcId)return;
    const resident=state.villageWorld&&state.villageWorld.entities.find(r=>r.npcId===e.npcId);
    const plan=routine(e.npcId,state);if(!resident||!plan)return;
    if(e.behavior && (e.behavior.gesture || !e.behavior.atActivity && !resident.inside && !e.walking))return;
    if(e.walking&&!['school','returnSchool','deliver','fetch','harvest'].includes(plan.action))return;
    const inside=resident.insideScene || (resident.inside?resident.homeScene:null);
    if(plan.sceneId!=='village' && inside!==plan.sceneId)return;
    if(plan.sceneId==='village' && resident.inside)return;
    const x=Math.round(e.x),y=Math.round(e.baseline),still=state.settings.reducedMotion===true ||
      state.settings.reducedMotion===null&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const beat=still?0:Math.floor((state.time+(e.behavior?e.behavior.phase:0))*3)%2;
    ctx.save();
    if(plan.action==='water'){
      ctx.fillStyle='#7eabb1';ctx.fillRect(x+4,y-8,5,4);ctx.fillRect(x+8,y-7,4,1);
      ctx.fillStyle='#b9d6d5';ctx.fillRect(x+12,y-5+beat,1,2);ctx.fillRect(x+14,y-3+beat,1,2);
    }else if(plan.action==='work'||plan.action==='weave'){
      ctx.fillStyle='#be945e';ctx.fillRect(x+5,y-5,7,2);
      ctx.fillStyle='#b0bec2';ctx.fillRect(x+8,y-10+beat*2,5,2);ctx.fillStyle='#725035';ctx.fillRect(x+10,y-8+beat*2,1,4);
    }else if(['read','school','returnSchool'].includes(plan.action)){
      ctx.fillStyle='#f1dfb4';ctx.fillRect(x-5,y-9,10,5);ctx.fillStyle='#a18663';ctx.fillRect(x,y-9,1,5);
    }else if(plan.action==='cook'){
      ctx.fillStyle='#ddd7bc';ctx.fillRect(x+6,y-15-beat,1,2);ctx.fillRect(x+8,y-18+beat,1,2);
      ctx.fillStyle='#8f6040';ctx.fillRect(x+4,y-8,7,1);
    }else if(['harvest','deliver','fetch'].includes(plan.action)){
      ctx.fillStyle='#b78b4b';ctx.fillRect(x+5,y-6,6,5);ctx.fillStyle='#6c864c';ctx.fillRect(x+6,y-8,3,3);
    }else if(['cool','eat','visit','rest'].includes(plan.action)){
      ctx.fillStyle='#ae824e';ctx.fillRect(x-6,y-3,12,2);ctx.fillRect(x-5,y-1,2,4);ctx.fillRect(x+3,y-1,2,4);
      if(plan.action==='cool'){ctx.fillStyle='#cfba81';ctx.fillRect(x+6,y-10+beat,4,5);ctx.fillStyle='#8b6c44';ctx.fillRect(x+7,y-5+beat,1,3);}
      else if(plan.action==='eat'||plan.action==='visit'){ctx.fillStyle='#e9d4a6';ctx.fillRect(x+4,y-8,3,3);}
    }else if(plan.action==='paint'){
      ctx.fillStyle='#e9d3a2';ctx.fillRect(x+5,y-10,6,7);ctx.fillStyle='#7394a0';ctx.fillRect(x+6,y-9,4,3);
    }
    ctx.restore();
  }
  return {routine,indoorSpot,dialogue,draw,period};
})();
