// Small, bounded decisions: a person's purpose stays stable while their timing varies.
window.ResidentBehavior=(function(){
  'use strict';
  const connectedCache=new WeakMap();
  const rand=(a,b)=>a+Math.random()*(b-a);
  const choose=xs=>xs[Math.floor(Math.random()*xs.length)];
  function personality(e){
    if(!e.behavior){
      const elderly=/奶奶|爷爷|阿婆|老人|伯伯/.test(e.label||'');
      const child=/孩子|学生|女孩/.test(e.label||'');
      e.behavior={pace:rand(elderly?.78:child?1.02:.88,elderly?.98:child?1.25:1.14),
        patience:rand(elderly?1.1:.7,elderly?1.7:1.3),sociability:rand(.25,.8),
        phase:rand(0,20),cadence:rand(.85,1.2),recent:[],pause:0,
        attention:0,social:rand(4,14),idle:rand(2,7),enroute:rand(7,18),gesture:null,gestureT:0};
    }
    return e.behavior;
  }
  function face(e,x,y){
    const dx=x-e.x,dy=y-e.baseline;
    e.faceDir=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
  }
  function gesture(e,name,duration){const b=personality(e);b.gesture=name;b.gestureT=duration;}
  function reset(e){
    const b=personality(e);b.pause=0;b.gesture=null;b.gestureT=0;b.atActivity=false;
    e.wanderT=rand(0,2.3);b.recent=[];e.avoidCell=null;
  }
  function start(e){const b=personality(e);b.legPace=b.pace*rand(.92,1.08);b.atActivity=false;b.gesture=null;}
  function arrive(e,base){
    const b=personality(e);b.atActivity=true;
    e.wanderT=rand(base*.65,base*1.8)*b.patience;b.idle=rand(.7,3);
  }
  function connected(scene){
    if(connectedCache.has(scene))return connectedCache.get(scene);
    const cols=scene.W/16,at=scene.def.spawnPoints.default;
    let start=at[1]*cols+at[0];
    if(!scene.walkable[start])start=scene.walkable.findIndex(Boolean);
    const cells=new Set([start]),q=[start];
    for(let i=0;i<q.length;i++)for(const n of [q[i]-1,q[i]+1,q[i]-cols,q[i]+cols]){
      if(n<0||n>=scene.walkable.length||Math.abs(n%cols-q[i]%cols)>1||!scene.walkable[n]||cells.has(n))continue;
      cells.add(n);q.push(n);
    }
    connectedCache.set(scene,cells);return cells;
  }
  function destination(e,scene,anchors){
    const b=personality(e),cols=scene.W/16,reachable=connected(scene);
    const occupied=new Set(scene.entities.filter(r=>r.kind==='npc'&&(r.route?!r.inside:!r.hidden)&&r!==e).map(r=>Math.floor((r.baseline-1)/16)*cols+Math.floor(r.x/16)));
    const exits=new Set((scene.passageZones||[]).flatMap(z=>{
      const cells=[];for(let y=Math.floor(z.rect.y/16);y<(z.rect.y+z.rect.h)/16;y++)for(let x=Math.floor(z.rect.x/16);x<(z.rect.x+z.rect.w)/16;x++)cells.push(y*cols+x);return cells;
    }));
    const anchor=choose(anchors),candidates=[];
    for(const cell of reachable){
      const x=cell%cols,y=Math.floor(cell/cols),d=Math.abs(x-anchor[0])+Math.abs(y-anchor[1]);
      if(d>3||occupied.has(cell)||exits.has(cell)||b.recent.includes(cell)||Math.hypot(x*16+8-e.x,y*16+12-e.baseline)<12)continue;
      candidates.push({cell,score:Math.random()/(1+d*.6)});
    }
    candidates.sort((a,b)=>b.score-a.score);
    const cell=candidates.length?candidates[0].cell:[...reachable].sort((a,b)=>Math.abs(a%cols-anchor[0])+Math.abs(Math.floor(a/cols)-anchor[1])-Math.abs(b%cols-anchor[0])-Math.abs(Math.floor(b/cols)-anchor[1]))[0];
    b.recent.push(cell);if(b.recent.length>3)b.recent.shift();
    return [cell%cols,Math.floor(cell/cols)];
  }
  // Returns true while pausing. All timers use simulation time, never frame-count randomness.
  function tick(e,state,scene,dt,travellingHome){
    const b=personality(e);b.attention-=dt;b.social-=dt;b.idle-=dt;b.enroute-=dt;
    b.gestureT=Math.max(0,b.gestureT-dt);if(!b.gestureT)b.gesture=null;
    if(e.wanderT>0)e.wanderT=Math.max(0,e.wanderT-dt);
    if(b.pause>0){b.pause=Math.max(0,b.pause-dt);e.walking=false;return true;}
    const nearby=state.scene===scene && Math.hypot(state.player.x-e.x,state.player.y-e.baseline)<27;
    if(nearby && b.attention<=0){
      face(e,state.player.x,state.player.y);b.attention=rand(10,19);b.pause=rand(.8,1.6);
      gesture(e,'greet',b.pause);e.walking=false;return true;
    }
    if(!travellingHome && e.wanderT>0 && b.social<=0){
      b.social=rand(12,25);
      const other=scene.entities.find(r=>r!==e&&r.kind==='npc'&&!r.hidden&&!r.inside&&!r.walking&&
        r.wanderT>1&&personality(r).social<=0&&Math.hypot(r.x-e.x,r.baseline-e.baseline)<30);
      if(other && Math.random()<b.sociability){
        const ob=personality(other),duration=rand(1.8,3.5);
        face(e,other.x,other.baseline);face(other,e.x,e.baseline);
        b.pause=ob.pause=duration;b.social=ob.social=rand(15,30);
        gesture(e,'chat',duration);gesture(other,'chat',duration);e.walking=false;return true;
      }
    }
    if(e.wanderT>0){
      e.walking=false;
      if(b.idle<=0){
        const move=choose(['look','adjust','stretch','look']);
        gesture(e,move,rand(.8,1.7));b.idle=rand(4,10);
        if(move==='look')e.faceDir=choose(['up','down','left','right'].filter(d=>d!==e.faceDir));
      }
      return true;
    }
    if(!travellingHome && e.path && e.path.length>2 && b.enroute<=0){
      b.enroute=rand(10,22);b.pause=rand(.4,1.2);gesture(e,'look',b.pause);e.walking=false;return true;
    }
    return false;
  }
  function draw(ctx,e,state){
    const b=e.behavior;if(!b||e.hidden)return;
    const x=Math.round(e.x),y=Math.round(e.baseline),beat=Math.floor((state.time+b.phase)*3)%2;
    if(e.streetLife && !b.gesture){
      ctx.save();
      const action=e.streetLife.action;
      if(action==='school'||action==='read'){
        ctx.fillStyle='#ede2c7';ctx.fillRect(x-5,y-9,9,5);ctx.fillStyle='#6b8ba0';ctx.fillRect(x-5,y-10,9,1);
      }else if(action==='shop'){
        ctx.fillStyle='#aa8051';ctx.fillRect(x+5,y-7,6,6);ctx.fillStyle='#729955';ctx.fillRect(x+6,y-9,4,3);
      }else if(action==='deliver'){
        ctx.fillStyle='#ba976b';ctx.fillRect(x-5,y-10,10,7);ctx.fillStyle='#e3c795';ctx.fillRect(x-1,y-10,2,7);
      }
      ctx.restore();
    }
    if(!b.gesture||e.walking||state.settings.reducedMotion===true||
      state.settings.reducedMotion===null&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    if(!['greet','chat','adjust','stretch'].includes(b.gesture))return;
    ctx.save();ctx.fillStyle='#d9b58d';
    const side=e.faceDir==='left'?-1:1;
    const lift=b.gesture==='stretch'?15:b.gesture==='adjust'?17:12+beat*2;
    ctx.fillRect(x+side*6-1,y-lift,3,3);
    if(b.gesture==='stretch')ctx.fillRect(x-side*6-1,y-lift,3,3);
    ctx.restore();
  }
  function dialogue(zone,state){
    const e=zone.ent;if(!e||!e.streetLife)return null;
    const hour=window.LGLandscape.daylight(state)*24;
    if((hour<7||hour>=18)&&['shop','browse'].includes(e.streetLife.action))return [{text:'摊子已经收起来了，今天先回去，明早再来看看。',end:true}];
    const b=personality(e),lines=e.streetLife.lines;
    const variants=lines.map((text,i)=>({text,i})).filter(v=>v.i!==b.lastLine);
    const reply=choose(variants.length?variants:lines.map((text,i)=>({text,i})));
    b.lastLine=reply.i;
    return [{text:reply.text,end:true}];
  }
  return {personality,reset,start,arrive,destination,tick,draw,dialogue};
})();
