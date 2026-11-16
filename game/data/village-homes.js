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
    const w=20+i%3*2, h=16+i%2*2, door=Math.floor(w/2);
    const rows=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>x===0||y===0||x===w-1||y===h-1?'U':'_'));
    const legend={
      v:{tile:'window',solid:true}, A:{tile:'floor',entity:feature,solid:true},
      Z:{tile:'floor',entity:secondary,solid:true}, t:{tile:'floor',entity:'table',solid:true},
      c:{tile:'floor',entity:'stool',solid:true}, n:{tile:'floor',entity:'plant',solid:true}
    };
    rows[h-1][door]='d'; rows[0][4]='v';rows[0][w-5]='v';
    // Alternate bedroom sides, different rug/table positions and distinct work corners.
    const left=i%2===0, bedX=left?3:w-4, tableX=left?w-6:5, tableY=7+i%3;
    rows[3][bedX]='b'; rows[3][left?w-4:3]='h';
    rows[5][left?4:w-5]='C'; // Local override uses indoor floor, not grass.
    legend.C={tile:'floor',entity:'chest',solid:true};
    for(let y=tableY-1;y<=tableY+1;y++)for(let x=tableX-1;x<=tableX+1;x++)rows[y][x]='r';
    rows[tableY][tableX]='t'; rows[tableY+2][tableX-1]='c';
    rows[3][Math.floor(w/2)-2]='A';rows[4+i%3][Math.floor(w/2)+2]='Z';
    rows[h-4][left?3:w-4]='n';
    rows[1][2+i]='n';
    if(i%3===0) rows[3][bedX+(left?2:-2)]='b';
    const household=village.characters.filter(c=>c.route && c.nightHome===porch);
    const atHome=[[door-2,h-5],[door+2,h-5]];
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
    data.scenes[id]={id,name:title+' · '+String(i+1).padStart(2,'0')+'号',indoor:true,household:true,
      map:rows.map(r=>r.join('')),legend,characters,
      spawnPoints:{default:[door,h-3]},interactables:[
        {id:'exit-'+id,type:'passage',tiles:[[door,h-1]],hint:'走回村巷',to:{scene:'village',spawn:returnKey}},
        {id:'leave-'+id,type:'scene',at:[door,h-1],hint:'走出'+title,toScene:'village',spawn:returnKey},
        {id:'inspect-'+id,type:'dialogue',at:[Math.floor(w/2)-2,3],hint:'看看'+title+'的陈设',dialogueId:inspectId,isDemo:true}
      ]};
  });
  village.legend.h={tile:'door'};
})();
