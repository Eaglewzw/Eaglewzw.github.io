// Persistent consequences of exploration. All narrative content remains a demonstration.
window.GameKeepsakes=(function(){
  const data=window.LIFE_DATA;
  data.scenes.cottage.interactables.push(
    {id:'cottage-photo',type:'dialogue',at:[8,1],hint:'墙上的村庄合影',isDemo:true},
    {id:'cottage-thanks',type:'dialogue',at:[15,5],hint:'桌上的感谢字条',isDemo:true}
  );
  data.memories.push({id:'mem-village-photo',chapterId:'demo-village',title:'认出照片里的人',
    summary:'找到旧木箱后，老周帮你认出了合影中的邻居。照片被挂回小屋。',
    paragraphs:['【演示故事】老周认出了旧照片里的人，帮你把它装进相框。回到小屋时，墙上多了一张村庄合影。'],
    status:'published',isDemo:true,people:[],images:[],links:[]});
  const nodes=(lines,reward)=>lines.map((text,i)=>({text,end:i===lines.length-1,keepsake:i===lines.length-1?reward:undefined}));
  function has(state,id){return state.discovered.has(id);}
  function available(zone,state){
    if(window.LifeJourney && !window.LifeJourney.available(zone,state))return false;
    if(zone.id==='cottage-photo')return has(state,'mem-village-photo');
    if(zone.id==='cottage-thanks')return state.story.step===4;
    return true;
  }
  function dialogue(zone,state){
    const id=zone.ent && zone.ent.npcId;
    if(id==='painter-demo' && has(state,'mem-chest')){
      if(!has(state,'mem-village-photo'))return nodes([
        '你找到林子里的旧木箱了？那张夹在里面的合影，我还认得。',
        '这是年轻时的几位邻居。照片放在箱底，总有一天会忘了谁是谁。',
        '【演示故事】我帮你把照片装好。带回小屋挂起来吧，以后每次回来，还能看见这些面孔。'
      ],'mem-village-photo');
      return nodes(['合影挂好了？下次有人来串门，可以请他们认一认照片里的人。']);
    }
    if(zone.id==='cottage-photo')return nodes(['【演示合影】照片里几个人挨在一起，身后是村口的老树。','从前只是陌生的面孔，现在你已经能叫出其中几个人的名字。']);
    if(zone.id==='cottage-thanks')return nodes(['纸上写着：「凳子放得很稳，傍晚又有人在树下歇脚了。谢谢你跑这一趟。——邻居们」']);
    if(id==='village-resident-6' && state.story.step===4)return nodes(['邻居们托我捎了张字条，放在你小屋的桌上。谢谢你把竹凳送回树下。']);
    if(id==='village-resident-10' && has(state,'mem-kite'))return nodes(['你也见过河边那只风筝？我想给它系一条新的尾巴。下次起风，我们一起去看看吧。']);
    return null;
  }
  function draw(ctx,state){
    if(state.scene.id!=='cottage')return;
    ctx.save();
    if(has(state,'mem-village-photo')){
      const x=8*16,y=16;
      ctx.fillStyle='#704b34';ctx.fillRect(x-6,y-5,24,18);
      ctx.fillStyle='#e8d6a4';ctx.fillRect(x-4,y-3,20,14);
      ctx.fillStyle='#89a273';ctx.fillRect(x-3,y-2,18,6);
      for(let i=0;i<3;i++){ctx.fillStyle='#caaf86';ctx.fillRect(x+i*5,y+1,3,3);ctx.fillStyle=['#937d68','#6c8798','#a17d68'][i];ctx.fillRect(x-1+i*5,y+4,5,5);}
    }
    if(state.story.step===4){
      ctx.fillStyle='#f4e5bb';ctx.fillRect(15*16+10,5*16-3,9,6);
      ctx.fillStyle='#88704b';ctx.fillRect(15*16+11,5*16-2,6,1);ctx.fillRect(15*16+11,5*16+1,4,1);
    }
    ctx.restore();
  }
  return {available,dialogue,draw};
})();
