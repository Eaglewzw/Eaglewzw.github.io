// World details for the demo first act; nothing here claims a real autobiographical event.
(function(){
 const data=window.LIFE_DATA,v=data.scenes.village;
 const signs=[
  ['village-crossroads',[19,15],'老槐树下','小屋前是老槐树；往西是晒谷场，向东沿巷道走可以到河边。'],
  ['village-worklane',[32,15],'手艺人巷','沿南边小路走，04 号是木匠的小院，05 号是奶奶的暖屋。'],
  ['village-river',[48,19],'河畔小路','河水从村东流过。沿岸散步的人，傍晚会顺着巷道回家。']
 ];
 const rows=v.map.map(r=>Array.from(r));
 for(const [id,at,name,text] of signs){
  rows[at[1]][at[0]]='S';
  data.dialogues['dlg-'+id]={nodes:[{text,end:true}]};
  v.interactables.push({id,type:'dialogue',at,hint:name,dialogueId:'dlg-'+id,isDemo:true});
 }
 v.map=rows.map(r=>r.join(''));
 // Household layout and domestic details are owned by village-homes.js.
 data.memories.push({id:'mem-act-one-stool',chapterId:'demo-village',title:'树下的一张竹凳',
  summary:'替邻居取回一张修好的竹凳，在村里走了一圈，也认识了几个人。',
  paragraphs:['【演示故事，等待替换为真实人生经历】','你从阿姨那里接下托付，找木匠取凳子，再听奶奶说了几句话。最后，竹凳重新回到老槐树下。','路还是那条路，经过的人却不再陌生。'],status:'published',isDemo:true,people:[],images:[],links:[]});
})();
