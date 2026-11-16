// First-act demonstration. Replace this script's dialogue with real memories later.
window.GameStory = (function () {
  'use strict';
  const steps=[
    {title:'去和种菜的阿姨聊聊',hint:'她白天在菜地和村巷活动，夜晚在 01 号菜园人家。',npc:'village-resident-0'},
    {title:'找木匠伯伯取竹凳',hint:'木匠会在 04 号家里做木工，也会去老巷送木器；地图会标出他的位置。',npc:'village-resident-3'},
    {title:'把竹凳带给奶奶看看',hint:'奶奶会取水、树下乘凉，也会去串门；地图会标出她现在的位置。',npc:'village-resident-4'},
    {title:'把竹凳放回老槐树下',hint:'回到自己小屋前的老槐树旁，按 E 放下竹凳。',zone:'tree-lao-huai'},
    {title:'第一幕完成 · 树下又有了座位',hint:'去树下坐坐，或者和刚才的邻居再聊几句。'}
  ];
  function step(state) { return state.story.step===4 && state.journey ? window.LifeJourney.step(state) : steps[state.story.step] || steps[0]; }
  function routine(id,state) {
    return window.ResidentLife ? window.ResidentLife.routine(id,state) : null;
  }
  function nodes(lines,advance) {
    return lines.map((text,i)=>({text,end:i===lines.length-1,storyAdvance:i===lines.length-1?advance:undefined}));
  }
  function dialogue(target,state) {
    const id=target.ent && target.ent.npcId, progress=state.story.step;
    const night=window.LGLandscape.nightAmount(state)>.65;
    const greeting=night?'这么晚还来串门，进屋歇歇吧。':'今天村里风不大，适合慢慢走。';
    const daily=window.ResidentLife && window.ResidentLife.dialogue(target,state);
    const reply=text=>nodes([text].concat(daily?daily.map(node=>node.text):[]));
    if(id==='village-resident-0') {
      if(progress===0) return nodes([
        '【第一幕 · 演示故事】树下的一张竹凳。'+greeting,
        '老槐树下原来有张竹凳，前两天凳脚松了，送到木匠伯伯那里修。',
        '你愿意帮忙取回来吗？取到后让奶奶看一眼，她最熟悉那张凳子。走完这段路，再把它放回树下。'
      ],1);
      return reply(progress===4?'凳子放回去了？谢谢你。傍晚路过的人，又能在那里歇歇脚了。':'木匠伯伯住在 04 号，奶奶住在 05 号；如果去串门了，地图会帮你找到他们。');
    }
    if(id==='village-resident-3') {
      if(progress===1) return nodes([
        '阿姨托你来的吧？凳脚已经修牢了，我又把边角磨了一遍。',
        '【拿起修好的竹凳】木头摸起来有些温热，旧凳面上的痕迹还在。',
        '带去给奶奶看看吧。修东西，有时候只是想让熟悉的东西再陪人久一点。'
      ],2);
      return reply(progress===4?'凳子放稳了？那就好。以后路过树下，我也去坐一坐。':progress>=2?'那张竹凳已经交给你了。放回树下后，也替我试试稳不稳。':greeting+'我在修一张旧竹凳。先去找种菜的阿姨聊聊，她正惦记这件事。');
    }
    if(id==='village-resident-4') {
      if(progress===2) return nodes([
        '呀，是树下那张凳子。凳脚好了，上面的旧印子还留着。',
        '以前坐在树下，总能等来一个路过的人，说几句不紧要的话。',
        '把它放回老槐树下吧。也许今天，还会有人在那里等一阵风。'
      ],3);
      return reply(progress===4?'我一会儿去树下坐坐。你也别总急着往前赶，累了就歇歇。':greeting+'村口的老槐树就在你的小屋前。等拿到竹凳，再来让我看看。');
    }
    if(target.id==='tree-lao-huai' && progress===3) return nodes([
      '你把竹凳放在老槐树的阴影里，轻轻按了按。四只脚稳稳地落在土上。',
      '风从村巷里穿过。有人提着菜篮回来，有人关上了院门。',
      '【第一幕完成】这条路走了一圈，你开始认得这里的人。树下，也重新有了一个可以停留的位置。'
    ],4);
    if(target.id==='tree-lao-huai' && progress===4) return nodes(['竹凳还稳稳地放在树下。你坐了一会儿，听见村巷里有人打招呼。']);
    if(id && (id.startsWith('village-resident-') || id==='painter-demo')) return daily;
    return null;
  }
  function target(state) {
    const objective=step(state);
    if(state.story.step===4 && state.journey){const next=window.LifeJourney.target(state);if(!next||!next.npc)return next;}
    if(objective.npc && state.villageWorld) {
      const resident=state.villageWorld.entities.find(e=>e.npcId===objective.npc);
      if(resident) {
        if(resident.inside) {
          const sceneId=resident.insideScene || resident.homeScene,home=window.LIFE_DATA.scenes[sceneId];
          const runtime=state.scene.id===sceneId?state.scene:null;
          const projection=runtime && runtime.entities.find(e=>e.homeProjection&&e.npcId===resident.npcId);
          const at=window.ResidentLife.indoorSpot(runtime||home,resident.npcId,resident.action);
          const portal=state.villageWorld.def.interactables.find(p=>p.toScene===sceneId);
          const entry=portal?portal.at:resident.nightHome;
          return {sceneId,x:projection?projection.x:at[0]*16+8,y:projection?projection.baseline:at[1]*16+12,
            entry:{x:entry[0]*16+8,y:entry[1]*16+8}};
        }
        return {sceneId:'village',x:resident.x,y:resident.baseline};
      }
    }
    if(objective.zone) return {sceneId:'village',x:17*16+8,y:12*16+8};
    return null;
  }
  function draw(ctx,state,art) {
    if(state.scene.id==='village' && state.story.step===4) ctx.drawImage(art.entities.stool,18*16,12*16);
  }
  return {steps,step,routine,dialogue,target,draw};
})();
