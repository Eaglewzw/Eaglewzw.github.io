// Visible consequences, opening hours and small original pixel poses.
window.LifeWorld=(function(){
  const poseCache=new WeakMap();let soundAt=0,bellKey='';
  const hour=s=>window.LGLandscape.daylight(s)*24;
  function pose(e,img,s){
    if(!img)return img;
    let kind=null;
    if(e.kind==='player'&&s.player.lifeAction&&s.player.lifeAction.until>s.time)kind=s.player.lifeAction.kind==='water'?'bend':s.player.lifeAction.kind==='pack'?'carry':null;
    else if(e.kind==='npc'&&!e.walking&&(!e.behavior||!e.behavior.gesture)){
      const resident=s.villageWorld&&s.villageWorld.entities.find(r=>r.npcId===e.npcId);
      const plan=resident&&window.ResidentLife.routine(e.npcId,s);
      const active=e.homeProjection||e.behavior&&e.behavior.atActivity;
      if(plan&&active){
        if(['cool','eat','visit','rest'].includes(plan.action))kind='sit';
        if(['water','harvest','work','weave'].includes(plan.action)&&Math.sin(s.time*1.5+(e.behavior?e.behavior.phase:0))>.1)kind='bend';
      }
    }else if(e.kind==='npc'&&e.walking&&(e.action==='deliver'||e.streetLife&&e.streetLife.action==='deliver'))kind='carry';
    if(!kind||s.settings.reducedMotion===true||s.settings.reducedMotion===null&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return img;
    if(!poseCache.has(img))poseCache.set(img,{});const cache=poseCache.get(img);if(cache[kind])return cache[kind];
    const c=document.createElement('canvas');c.width=16;c.height=20;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
    if(kind==='sit'){
      g.drawImage(img,0,0,16,14,0,4,16,14);g.drawImage(img,4,14,8,5,3,16,10,3);
      g.fillStyle='#4c4a43';g.fillRect(3,18,4,2);g.fillRect(9,18,4,2);
    }else if(kind==='bend'){
      g.drawImage(img,0,13,16,7,0,13,16,7);g.drawImage(img,0,0,16,13,2,4,14,12);
      g.fillStyle='#dab68e';g.fillRect(11,14,3,2);
    }else{g.drawImage(img,0,0);g.fillStyle='#d3ac83';g.fillRect(3,12,3,2);g.fillRect(10,12,3,2);}
    cache[kind]=c;return c;
  }
  function rect(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  function draw(ctx,s){
    const j=s.journey,h=hour(s),open=h>=7&&h<18,scene=s.scene.id;
    ctx.save();
    if(scene==='village'){
      // Wet soil and visible growth remain after the player's help.
      if(j.events.includes('water'))for(let i=0;i<3;i++){
        const x=(12+i)*16,y=22*16;
        rect(ctx,x,y,14,5,'#745b3e');rect(ctx,x+6,y-(j.day>1?7:3),2,j.day>1?9:5,'#497345');
        rect(ctx,x+2,y-(j.day>1?6:2),5,2,'#88aa59');rect(ctx,x+8,y-4,4,2,'#b0c66e');
      }
      if(j.stage>=6){rect(ctx,18*16,12*16-3,9,5,'#d7c292');rect(ctx,18*16+1,12*16-2,6,1,'#987956');}
      // Doors swing inward as a resident reaches the threshold; resting houses close again.
      for(const r of s.villageWorld.entities.filter(e=>e.route&&!e.inside)){
        const plan=window.ResidentLife.routine(r.npcId,s);if(!plan||plan.sceneId==='village')continue;
        const door=s.scene.def.interactables.find(z=>z.toScene===plan.sceneId);if(!door)continue;
        const x=door.at[0]*16,y=door.at[1]*16;
        if(Math.hypot(r.x-x-8,r.baseline-y-12)>28)continue;
        rect(ctx,x+2,y,12,16,'#443b30');rect(ctx,x+2,y,4,16,'#906846');rect(ctx,x+5,y+7,1,2,'#d4b77e');
      }
    }
    if(scene==='cottage'){
      if(j.stage>=3){rect(ctx,15*16+3,6*16,10,7,'#eee0ae');rect(ctx,15*16+5,6*16+2,6,1,'#9e7153');}
      if(j.stage>=5){rect(ctx,4*16,5*16,13,10,'#9c6d46');rect(ctx,4*16+4,5*16-3,6,3,'#634b36');rect(ctx,4*16+2,5*16+4,9,2,'#d2aa70');}
      if(j.events.includes('cook')){rect(ctx,8*16,9*16-4,8,4,'#f1dcb2');rect(ctx,8*16+2,9*16-6,4,3,'#849b4e');}
      if(j.stage===11){rect(ctx,12*16,1*16,14,11,'#79543e');rect(ctx,12*16+2,1*16+2,10,7,'#a9bbbd');rect(ctx,12*16+4,1*16+4,2,4,'#e6c499');rect(ctx,12*16+8,1*16+4,2,4,'#e6c499');}
    }
    if(scene==='county'){
      for(const e of s.scene.entities.filter(e=>['shop','store','conv'].includes(e.kind))){
        if(open){rect(ctx,e.x-10,e.baseline-e.drawH+7,22,3,'#e6c684');}
        else {rect(ctx,e.x-6,e.baseline-16,12,14,'#7d8580');for(let y=0;y<14;y+=3)rect(ctx,e.x-6,e.baseline-16+y,12,1,'#555f60');}
      }
      // A tangible stationery stall and a small writing desk in the schoolyard.
      const x=35*16,y=17*16;
      rect(ctx,x-7,y-3,25,4,'#9b7850');rect(ctx,x-5,y+1,3,7,'#70563b');rect(ctx,x+13,y+1,3,7,'#70563b');
      if(open){rect(ctx,x-8,y-19,27,4,'#9b6257');rect(ctx,x-4,y-7,8,4,'#e4d8ad');rect(ctx,x+6,y-7,6,4,'#91aeb6');}
      else rect(ctx,x-6,y-9,22,6,'#7b8173');
      const dx=18*16,dy=10*16;
      rect(ctx,dx-4,dy-4,23,4,'#b58b55');rect(ctx,dx-2,dy,3,7,'#7a583c');rect(ctx,dx+14,dy,3,7,'#7a583c');
      rect(ctx,dx+3,dy-7,10,4,j.stage>=11?'#e5d39a':'#ddd4b5');
      if(j.stage>=8){rect(ctx,13*16,8*16,12,8,'#ccb77d');rect(ctx,13*16+2,8*16+2,8,1,'#745c46');}
    }
    ctx.restore();
  }
  function tick(s){
    if(s.mode!=='explore')return;
    const h=hour(s),key=s.journey.day+':'+(h>=16?'out':h>=8?'in':'early');
    if(s.scene.id==='county' && key!==bellKey){
      if(bellKey && (h>=8&&h<9||h>=16&&h<17))window.GameAudio.life('bell');bellKey=key;
    }
    if(s.time<soundAt)return;soundAt=s.time+4+Math.random()*4;
    const near=s.scene.entities.find(e=>e.kind==='npc'&&!e.hidden&&Math.hypot(e.x-s.player.x,e.baseline-s.player.y)<55);
    if(near){const action=near.action||near.streetLife&&near.streetLife.action;
      if(['cook','work','weave'].includes(action))window.GameAudio.life(action,true);
      else if(near.behavior&&near.behavior.gesture==='chat')window.GameAudio.life('murmur',true);
    }
  }
  function streetAnchors(e,s){
    const h=hour(s),action=e.streetLife.action;
    if(action==='school'||action==='read')return h>=8&&h<15?[[8,9],[18,9]]:h>=15&&h<18?[[14,14],[18,16]]:[[20,16],[23,17]];
    if(action==='shop'||action==='browse')return h>=7&&h<18?e.streetLife.anchors:[[24,27],[29,30]];
    return e.streetLife.anchors;
  }
  return {pose,draw,tick,streetAnchors};
})();
