// Fifteen separate homes, with stable door IDs and household-specific furnishings.
(function () {
  'use strict';
  const data=window.LIFE_DATA, village=data.scenes.village;
  const themes=[
    ['菜园人家','窗台摆着育苗盆，桌上摊着今年的菜种。','plant','basket'],
    ['竹篮小屋','编好的竹篮挂在墙边，长桌上留着未收好的竹篾。','basket','workbench'],
    ['读书人家','书桌面朝窗户，书架上排着课本和练习册。','shelf','desk'],
    ['木匠的小院','木工台上摆着工具，旁边是一把正在修理的椅子。','workbench','stool'],
    ['奶奶的暖屋','炉边放着一把小凳，柜子里叠着洗净的被褥。','stove','cabinet'],
    ['守菜园的家','门边放着菜筐，窗下几盆绿叶长得正旺。','basket','plant'],
    ['送信人的家','书桌上整理着信件，柜子旁放着出门用的包。','desk','cabinet'],
    ['灶边人家','灶台边收拾得干净，餐桌旁摆着两把小凳。','stove','stool'],
    ['乘凉老人的家','矮桌旁摆着茶杯，旧书架上收着翻过许多遍的书。','stool','shelf'],
    ['赶集人的家','木箱和竹篮靠墙放好，桌上记着赶集要带的东西。','chest','basket'],
    ['花窗小屋','窗前摆着花盆，床边留出一块铺着地毯的空地。','plant','cabinet'],
    ['草帽人家','草帽收在门边的柜子里，木桌上放着一只水杯。','cabinet','desk'],
    ['河畔人家','靠窗的矮凳适合坐着歇脚，书架上摆着几本旧书。','stool','shelf'],
    ['学生的小屋','两张书桌各占一边，床头还放着没读完的书。','desk','shelf'],
    ['巷尾阿婆家','暖炉、矮柜和花盆把小屋收拾得满满当当。','stove','plant']
  ];
  // The original village painter also belongs to a household.
  Object.assign(village.characters[0], {route:[[46,14],[48,14]], nightHome:village.homes[14], speed:16});
  village.homes.forEach(function (porch,i) {
    const id='village-home-'+i, [title,description,feature,secondary]=themes[i];
    const w=16+i%3*2, h=14+i%2, door=Math.floor(w/2);
    const rows=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>x===0||y===0||x===w-1||y===h-1?'U':'_'));
    const legend={
      v:{tile:'window',solid:true}, A:{tile:'floor',entity:feature,solid:true},
      Z:{tile:'floor',entity:secondary,solid:true}, t:{tile:'floor',entity:'table',solid:true},
      c:{tile:'floor',entity:'stool',solid:true}, n:{tile:'floor',entity:'plant',solid:true},
      P:{tile:'floor',entity:'cabinet',solid:true}, F:{tile:'floor',entity:'stove',solid:true},
      B:{tile:'floor',entity:'basket',solid:true}, C:{tile:'floor',entity:'chest',solid:true},
      '|':{tile:'iwall',solid:true}
    };
    rows[h-1][door]='d'; rows[0][3]='v';rows[0][w-4]='v';rows[0][1+i%(w-2)]='v';
    // A screened sleeping alcove, a working kitchen and a small shared sitting room.
    const left=i%2===0, bedX=left?2:w-3, divider=left?6:w-7;
    const kitchenX=left?w-3:2, featureX=left?w-4:3, tableX=door+(left?-2:2), tableY=9;
    for(let y=1;y<=5;y++) if(y!==4) rows[y][divider]='|';
    rows[3][bedX]='b'; rows[2][left?4:w-5]='h';rows[5][bedX]='C';
    rows[2][kitchenX]='F'; rows[2][kitchenX+(left?-2:2)]='P';
    rows[4][kitchenX]='B';
    rows[5][featureX]='A';rows[6][featureX+(left?-2:2)]='Z';
    for(let y=tableY-1;y<=tableY+1;y++)for(let x=tableX-1;x<=tableX+1;x++)rows[y][x]='r';
    rows[tableY][tableX]='t';rows[tableY+1][tableX+(left?-1:1)]='c';
    rows[h-3][left?2:w-3]='n';
    // Each home has a different small wall shelf or plant, beyond its occupational furniture.
    rows[1][door+(i%3)-1]='n';
    const activitySpots={
      cook:[kitchenX,3], eat:[tableX,tableY+1], work:[featureX,7],
      rest:[tableX+(left?1:-1),tableY+1], sleep:[bedX,4], welcome:[door,h-3]
    };
    const zones=[
      {name:'卧房',x:left?1:divider+1,y:1,w:5,h:5},
      {name:i===3?'木工间':i===2||i===13?'书房':'灶间',x:left?divider+1:1,y:1,w:w-8,h:6},
      {name:'堂屋',x:1,y:7,w:w-2,h:h-8}
    ];
    const details={theme:i,left,bed:[bedX,3],table:[tableX,tableY],kitchen:[kitchenX,2],
      feature:[featureX,5],entry:[door,h-2],colors:['#af7156','#6c8f94','#9b855e'][i%3]};
    const household=village.characters.filter(c=>c.route && c.nightHome===porch);
    const atHome=[[door-1,h-3],[door+1,h-3]];
    const characters=household.map((resident,j)=>{
      resident.homeScene=id;
      resident.nightHome=[porch[0],porch[1]-1];
      const dialogueId='dlg-home-'+resident.id;
      data.dialogues[dialogueId]={nodes:[{text:'回来了。'+description},{text:'进来坐坐吧，走的时候从下面的门出去就好。',end:true}]};
      return {id:resident.id,at:atHome[j],homeProjection:true,dialogueId};
    });
    const returnKey='from-'+id;
    village.spawnPoints[returnKey]=[porch[0],porch[1]+1];
    village.interactables.push(
      {id:'enter-'+id,type:'passage',tiles:[[porch[0],porch[1]-1]],hint:'走进'+title,to:{scene:id,spawn:'default'}},
      {id:'visit-'+id,type:'scene',at:[porch[0],porch[1]-1],hint:'进入'+title,toScene:id,spawn:'default'}
    );
    const inspectId='dlg-interior-'+i;
    data.dialogues[inspectId]={nodes:[{text:description,end:true}]};
    const kitchenId='dlg-kitchen-'+i, bedroomId='dlg-bedroom-'+i;
    data.dialogues[kitchenId]={nodes:[{text:'灶台边摞着洗净的碗，桌上摆着今天用的筷子。'+(i===7?'这户人家爱做饭，篮子里还备着晚饭的菜。':'门边的鞋子和晾着的衣裳，让小屋有了日常生活的痕迹。'),end:true}]};
    data.dialogues[bedroomId]={nodes:[{text:'布帘隔出一小块卧房，床边收着换洗衣物，旧木箱靠墙放好。',end:true}]};
    data.scenes[id]={id,name:title+' · '+String(i+1).padStart(2,'0')+'号',indoor:true,household:true,
      map:rows.map(r=>r.join('')),legend,characters,activitySpots,zones,details,
      spawnPoints:{default:[door,h-3]},interactables:[
        {id:'exit-'+id,type:'passage',tiles:[[door,h-1]],hint:'走回村巷',to:{scene:'village',spawn:returnKey}},
        {id:'leave-'+id,type:'scene',at:[door,h-1],hint:'走出'+title,toScene:'village',spawn:returnKey},
        {id:'inspect-'+id,type:'dialogue',at:[featureX,5],hint:'看看'+title+'的陈设',dialogueId:inspectId,isDemo:true},
        {id:'kitchen-'+id,type:'dialogue',at:activitySpots.cook,hint:'灶边的碗筷',dialogueId:kitchenId,isDemo:true},
        {id:'bedroom-'+id,type:'dialogue',at:activitySpots.sleep,hint:'看看卧房',dialogueId:bedroomId,isDemo:true}
      ]};
  });
  // The player's own cottage follows the same domestic scale, with a writing corner.
  const cottage=data.scenes.cottage,model=data.scenes['village-home-2'];
  const cottageRows=model.map.map(row=>Array.from(row));
  cottageRows[5][16]='k';cottageRows[6][14]='h';
  cottage.name='自己的小屋';
  cottage.map=cottageRows.map(row=>row.join(''));
  cottage.legend=Object.assign({},model.legend);
  cottage.details=Object.assign({},model.details,{theme:6,colors:'#7e9492'});
  cottage.spawnPoints.default=[10,11];
  cottage.interactables.find(z=>z.id==='door-village').tiles=[[10,13]];
  cottage.interactables.find(z=>z.id==='desk-notes').at=[16,5];
  cottage.interactables.find(z=>z.id==='bed-rest').at=[2,3];
  cottage.interactables.find(z=>z.id==='shelf-books').at=[14,6];
  village.legend.h={tile:'door'};
})();
