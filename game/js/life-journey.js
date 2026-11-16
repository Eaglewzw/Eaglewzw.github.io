// A fictional, playable village-to-school chapter. Stable event IDs are saved, never real biography.
window.LifeJourney=(function(){
  'use strict';
  const data=window.LIFE_DATA;
  const friends=[['village-resident-0','种菜阿姨'],['village-resident-3','木匠伯伯'],['village-resident-4','奶奶'],['village-resident-2','阿禾']];
  data.characters['village-resident-2'].name='阿禾 · 村里的朋友';
  const classmate='county-student-demo',teacher='county-teacher-male-demo';
  data.characters[classmate].name='小川 · 新同学';
  const zones=[
    ['village','journey-water',[14,21],'照看阿姨的菜苗'],
    ['cottage','journey-cook',[17,3],'小灶台'],
    ['cottage','journey-letter',[15,6],'桌上的入学通知'],
    ['cottage','journey-pack',[4,5],'收拾行李'],
    ['village','journey-depart',[17,40],'准备出发去县城'],
    ['county','journey-supplies',[35,17],'街角文具摊'],
    ['county','journey-letter-home',[18,10],'课后写一封回信'],
    ['cottage','journey-school-photo',[12,1],'墙上的新同学合影']
  ];
  for(const [scene,id,at,hint]of zones)data.scenes[scene].interactables.push({id,at,hint,type:'dialogue',isDemo:true});
  for(const [id,title,summary]of [
    ['mem-shared-dinner','出发前的一顿饭','洗菜、添柴、盛饭。第一次觉得，自己也能照顾好日常生活。'],
    ['mem-village-farewell','把熟悉的人留在心里','阿姨叮嘱吃饭，木匠递来铅笔，奶奶整理手帕，阿禾约好了再见。'],
    ['mem-first-school-day','县城的第一天','报到、认识小川、一起准备文具，然后写下一封寄回村里的信。']
  ])data.memories.push({id,chapterId:id==='mem-first-school-day'?'ch-02-county':'demo-village',title,summary,
    paragraphs:['【演示故事】'+summary],status:'published',isDemo:true,people:[],images:[],links:[]});
  const steps=[
    {title:'替阿姨照看菜苗',hint:'竹凳放好了。去晒谷场旁的小菜畦，给三株菜苗浇水。',sceneId:'village',zone:'journey-water'},
    {title:'回小屋做一顿饭',hint:'把洗菜、添柴、盛饭的顺序做好。忙完今天，也照顾好自己。',sceneId:'cottage',zone:'journey-cook'},
    {title:'睡一觉，迎接明天',hint:'回到小屋的床边休息。次日会有一封新的来信。',sceneId:'cottage',zone:'bed-rest'},
    {title:'读桌上的入学通知',hint:'通知放在自己小屋的书桌旁。新的生活从这里开始。',sceneId:'cottage',zone:'journey-letter'},
    {title:'整理上学要带的东西',hint:'去床边的行李处，把通知、铅笔和旧手帕装好。',sceneId:'cottage',zone:'journey-pack'},
    {title:'和熟悉的人说声再见',hint:'分别找阿姨、木匠、奶奶和阿禾聊聊。他们会记住这次告别。'},
    {title:'从村南出发去县城',hint:'在南边出村的路上准备出发，下一天清晨抵达县城。',sceneId:'village',zone:'journey-depart'},
    {title:'去学校向老师报到',hint:'从县城西侧校门进入校园，找到男老师。夜间可以选择等到次日。',sceneId:'county',npc:teacher},
    {title:'认识新同学小川',hint:'小川在校门附近等你。他也曾不熟悉这里的路。',sceneId:'county',npc:classmate},
    {title:'一起准备新学期的文具',hint:'街角文具摊在路口东北侧，选好本子、铅笔和橡皮。',sceneId:'county',zone:'journey-supplies'},
    {title:'把县城的第一天写回家',hint:'回学校东侧的课后书桌，选一件想告诉家人的事。',sceneId:'county',zone:'journey-letter-home'},
    {title:'这一程完成 · 村庄与县城',hint:'你有了新的同学，也有一直惦记你的邻居。回村看看，他们还有新的话想说。'}
  ];
  function defaults(){return {stage:0,day:1,cycle:0,events:[],bonds:{},letter:''};}
  const known=['water','cook','sleep','letter','pack',...friends.map(f=>'bye:'+f[0]),'depart','register','friend','supplies','write'];
  function normalize(raw){
    const j=defaults(),r=raw&&typeof raw==='object'?raw:{};
    j.stage=Number.isInteger(r.stage)?Math.max(0,Math.min(11,r.stage)):0;
    j.day=Number.isInteger(r.day)?Math.max(1,r.day):1;j.cycle=Number.isInteger(r.cycle)?Math.max(0,r.cycle):0;
    j.events=Array.isArray(r.events)?[...new Set(r.events.filter(x=>known.includes(x)))]:[];
    for(const [id]of [...friends,[classmate]])j.bonds[id]=Number.isFinite(r.bonds&&r.bonds[id])?Math.max(0,Math.min(4,r.bonds[id])):0;
    j.letter=['friend','school','home'].includes(r.letter)?r.letter:'';return j;
  }
  function step(s){
    const result=steps[s.journey.stage];
    if(s.journey.stage===5){const next=friends.find(f=>!s.journey.events.includes('bye:'+f[0]));return {...result,npc:next&&next[0],title:next?'去和'+next[1]+'道别':result.title};}
    return result;
  }
  function target(s){
    const goal=step(s),sceneId=goal.sceneId||'village';
    if(goal.npc && sceneId==='village')return {npc:goal.npc};
    const def=data.scenes[sceneId];if(!def)return null;
    if(goal.npc){
      const live=s.scene.id===sceneId&&s.scene.entities.find(e=>e.npcId===goal.npc);
      const conf=def.characters.find(c=>c.id===goal.npc);
      return live?{sceneId,x:live.x,y:live.baseline}:conf?{sceneId,x:conf.at[0]*16+8,y:conf.at[1]*16+12}:null;
    }
    const zone=def.interactables.find(z=>z.id===goal.zone);
    return zone?{sceneId,x:zone.at[0]*16+8,y:zone.at[1]*16+8,entry:sceneId==='cottage'?{x:16*16+8,y:9*16+8}:undefined}:null;
  }
  function available(z,s){
    if(!z.id.startsWith('journey-'))return true;
    if(s.story.step<4)return false;
    const limits={'journey-water':0,'journey-cook':1,'journey-letter':3,'journey-pack':4,'journey-depart':6,'journey-supplies':9,'journey-letter-home':10,'journey-school-photo':11};
    return s.journey.stage>=limits[z.id];
  }
  const nodes=(lines,event)=>lines.map((text,i)=>({text,end:i===lines.length-1,journeyEvent:i===lines.length-1?event:undefined}));
  function schoolOpen(s){const hour=window.LGLandscape.daylight(s)*24;return hour>=7&&hour<18;}
  function dialogue(z,s){
    if(s.story.step<4)return null;
    const j=s.journey,id=z.ent&&z.ent.npcId;
    if(z.id==='bed-rest')return nodes([j.stage===2?'锅碗收好了。明天醒来，再看看门口有没有新的消息。':'把今天的路放下，睡一觉再出发。','休息到次日清晨。'],j.stage===2?'sleep':'rest');
    if(z.id==='journey-letter')return nodes(['【演示故事】入学通知上写着：请到县城学校报到，带好通知和学习用品。','纸张不重，握在手里却像多了一件要自己完成的事。'],j.stage===3?'letter':null);
    if(z.id==='journey-depart')return nodes(j.stage===6?['天还没亮，你把行李放在门边。熟悉的村巷渐渐安静下来。','次日清晨，沿着南边的路去县城。身后是记得你的人，前面是还不认识你的地方。']:['往南就是县城。想家的时候，也可以沿这条路回来。'],j.stage===6?'depart':null);
    if(id===teacher && j.stage===7){
      if(!schoolOpen(s))return nodes(['现在已经过了报到时间。先歇一晚，明天早晨再来。','等到次日清晨，老师会在这里接待你。'],'schoolMorning');
      return nodes(['把入学通知给我看看。欢迎你来这里，刚开始不熟悉很正常。','名字登记好了。小川就在校门附近，他会带你认认这条街。'],'register');
    }
    if(id===classmate){
      if(j.stage===8)return nodes(['你就是今天报到的新同学？我叫小川。','我刚来时也走错过校门。明天我们可以一起走。','先去街角准备本子、铅笔和橡皮吧。回来后，写点话告诉家里你到了。'],'friend');
      if(j.stage>=9)return nodes([j.stage>=11?'信写好了？明天我还在校门口等你。下次换你带新同学认路。':'文具摊就在路口东北边。买齐了我们就回学校。']);
    }
    const f=friends.find(f=>f[0]===id);
    if(f){
      if(j.stage===5 && !j.events.includes('bye:'+id)){
        const lines={
          'village-resident-0':['菜苗这两天长得不错，多亏你帮忙。到县城也别忘了按时吃饭。','哪天回来，来菜地喊我一声，咱们再一起摘菜。'],
          'village-resident-3':['竹凳已经有人坐了。这个削好的铅笔套带着，写字的时候别急。','东西坏了可以修，遇到不会的事也可以慢慢学。'],
          'village-resident-4':['手帕叠好放在口袋里。你会走越来越远，但家里的门一直给你留着。','到了之后，写几句话回来。说说你吃了什么，认识了谁，就够了。'],
          'village-resident-2':['你要去县城上学啦？等你回来，告诉我学校是什么样。','树下那张凳子给你留一半。说好了，下次再一起坐。']};
        return nodes(lines[id],'bye:'+id);
      }
      if(j.stage>=11)return nodes([id==='village-resident-4'?{friend:'信收到了。小川愿意陪你一起走，我也放心了。',school:'信收到了。你已经能自己找到学校和文具摊，比出发前更有底气了。',home:'想家就回来看看。能把心里话写给我们，也是一件勇敢的事。'}[j.letter]||'你的信收到了，大家都惦记着你。':id==='village-resident-2'?'你信里说的那件事，我记住了。再讲讲县城吧，我想听。':'回来啦！听说你在县城安顿好了，还是熟悉的声音听着亲切。']);
      if(j.stage>=6)return nodes(['行李收好了就放心去吧。下次回来，记得把路上的故事讲给我听。']);
      if(id==='village-resident-0')return nodes([j.stage===0?'树下的凳子放稳了。你愿意顺便替我给菜畦里的三株苗浇点水吗？':'今天多亏你照看菜苗。等它们长大，带些新鲜菜回家。']);
      if(id==='village-resident-2')return nodes(['我叫阿禾。你把竹凳放回去以后，大家又常在树下坐着了。','明天如果没事，咱们再在村口见。']);
    }
    if(z.id==='journey-school-photo')return nodes(['【演示合影】你和小川站在学校门口。从前不认识的脸，现在已经是约好一起上学的人。']);
    if(z.id.startsWith('journey-'))return nodes(['这件事已经做好了。它留下的变化还在，新的目标记在旅途手记里。']);
    return null;
  }
  const tasks={
    water:{stage:0,title:'给三株菜苗浇水',hint:'逐株浇到根部，土变深色就够了。',mode:'pick',items:['左边的菜苗','中间的菜苗','右边的菜苗'],required:[0,1,2],done:'菜苗都喝到了水，阿姨会记得你的帮忙。'},
    cook:{stage:1,title:'做一顿简单的晚饭',hint:'先洗菜，再添柴煮熟，最后盛到碗里。',mode:'order',items:['盛饭上桌','洗好青菜','添柴煮菜'],required:[1,2,0],done:'热饭上桌了。收好碗筷，就可以去休息。'},
    pack:{stage:4,title:'整理上学的行李',hint:'带上通知、铅笔和手帕。暂时用不到的物件留在家里。',mode:'pick',items:['入学通知','铅笔','旧手帕','沉甸甸的石头','空花盆'],required:[0,1,2],done:'行李收好了。出发前，去向熟悉的人道别。'},
    supplies:{stage:9,title:'准备新学期的文具',hint:'用出发前备好的零钱，选好本子、铅笔和橡皮。',mode:'pick',items:['练习本','铅笔','橡皮','玻璃弹珠','糖纸'],required:[0,1,2],done:'文具齐了。回学校，写几句话给惦记你的人。'},
    write:{stage:10,title:'给村里写一封信',hint:'选一件最想告诉家人的事，再把信装好。',mode:'letter',items:['我认识了新同桌小川','我已经找到学校和街角的文具摊','有点想家，但我会慢慢适应'],required:[],done:'信寄出了。小川送你的校门合影，也会挂回家中的墙上。'}
  };
  function activity(z,s){
    if(s.story.step<4)return null;
    const id={'journey-water':'water','journey-cook':'cook','journey-pack':'pack','journey-supplies':'supplies','journey-letter-home':'write'}[z.id];
    return id&&tasks[id].stage===s.journey.stage?id:null;
  }
  function morning(s,minimum){
    s.journey.day=Math.max(minimum||1,s.journey.day+1);
    const cycle=Math.floor(s.time/480+.42)+1;s.time=(cycle+.30-.42)*480;s.journey.cycle=cycle;
    s.settings.timeOfDay=s.settings.reducedMotion===true || s.settings.reducedMotion===null&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'morning':'auto';s.settings.dayCycle=true;
  }
  function apply(event,s,choice){
    if(s.story.step<4)return null;
    const j=s.journey,st=j.stage;
    if(event==='rest'||event==='schoolMorning'){morning(s);return {message:'新的一天，从清晨开始。'};}
    const expected=['water','cook','sleep','letter','pack','farewell','depart','register','friend','supplies','write'][st];
    if(j.events.includes(event)||event!==expected && !(st===5&&friends.some(f=>event==='bye:'+f[0])))return null;
    j.events.push(event);
    if(event.startsWith('bye:')){const id=event.slice(4);j.bonds[id]=Math.min(4,(j.bonds[id]||1)+1);if(friends.every(f=>j.events.includes('bye:'+f[0])))j.stage=6;}
    else j.stage++;
    if(event==='water')j.bonds[friends[0][0]]=2;
    if(event==='cook')j.bonds[friends[2][0]]=2;
    if(event==='friend')j.bonds[classmate]=2;
    if(event==='write'){j.letter=['friend','school','home'][choice]||'home';j.bonds[classmate]=3;}
    if(event==='sleep')morning(s,2);
    if(event==='depart')morning(s,3);
    return {message:tasks[event]?tasks[event].done:event.startsWith('bye:')?'这句告别，对方记住了。':step(s).title,
      memory:event==='cook'?'mem-shared-dinner':j.stage===6?'mem-village-farewell':event==='write'?'mem-first-school-day':null,
      scene:event==='depart'?'county':null,spawn:'from-village'};
  }
  function tick(s){
    const cycle=Math.floor(s.time/480+.42);
    if(cycle>s.journey.cycle){if(s.settings.timeOfDay==='auto'||!s.settings.timeOfDay)s.journey.day+=cycle-s.journey.cycle;s.journey.cycle=cycle;}
  }
  function relationships(s){return [...friends,[classmate,'小川']].map(([id,name])=>{
    const score=Math.max(s.journey.bonds[id]||0,s.story.step===4&&id!==classmate?1:0);
    return {name,status:['还未熟悉','已经认识','彼此熟悉','记挂着你','亲近的人'][score]};
  });}
  function buildActivity(root,id,s,finish){
    const task=tasks[id],chosen=new Set();let sequence=0,letter=-1;
    const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;e.textContent=text;return e;};
    root.appendChild(make('p','panel-note','生活片段 · 演示故事 · 无倒计时，可随时退出重来'));
    root.appendChild(make('h3','story-objective',task.title));root.appendChild(make('p','help-p',task.hint));
    const picture=document.createElement('canvas');picture.width=240;picture.height=64;picture.className='activity-scene';picture.setAttribute('role','img');picture.setAttribute('aria-label',task.title+'的进度画面');root.appendChild(picture);
    function paint(){
      const g=picture.getContext('2d');g.imageSmoothingEnabled=false;
      const box=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
      box(0,0,240,64,'#d9c39a');box(0,51,240,13,'#b59a6e');
      if(id==='water'){
        box(0,0,240,35,'#9fbd80');
        for(let i=0;i<3;i++){const x=40+i*70,wet=chosen.has(i);box(x-21,40,42,16,wet?'#71553b':'#a88555');box(x,24,3,22,'#4d7949');box(x-10,24,11,4,'#74a054');box(x+2,18,10,4,'#88ad5d');if(wet){box(x-6,43,4,2,'#8db6b4');box(x+7,47,3,2,'#8db6b4');}}
      }else if(id==='cook'){
        box(78,33,75,24,'#826752');box(84,45,18,10,sequence>=2?'#cf844d':'#544c41');
        box(88,24,53,12,'#4f625b');box(85,22,59,3,'#9ca59a');
        if(sequence>=1){box(100,22,9,3,'#83a45c');box(115,21,13,4,'#a4ba71');}
        if(sequence>=2){box(101,10,2,6,'#f4e5bd');box(126,5,2,8,'#f4e5bd');}
        if(sequence>=3){box(171,37,27,7,'#f5e6c3');box(176,34,18,5,'#8f9e58');}
      }else if(id==='write'){
        box(66,7,110,48,'#9c7d54');box(69,5,104,48,'#f5e8bf');
        for(let i=0;i<(letter<0?2:5);i++)box(82,14+i*6,letter<0?35:64-i%2*13,1,'#9c8764');
        box(178,16,3,26,'#7b6146');box(178,42,3,3,'#474a40');
      }else{
        box(91,16,60,9,'#795d40');box(96,12,50,5,'#795d40');box(82,25,78,31,'#aa8051');box(86,29,70,23,'#ceaa70');
        for(let i=0;i<3;i++){const x=94+i*21;box(x,33,15,13,'#a28760');if(chosen.has(i)){box(x+2,30,11,14,['#e6d8b0','#8faba7','#c8c3aa'][i]);box(x+4,33,7,1,'#79694b');}}
      }
    }paint();
    const progress=make('p','activity-progress','尚未完成');progress.setAttribute('role','status');root.appendChild(progress);
    const grid=make('div','activity-grid activity-'+id,'');root.appendChild(grid);
    const confirm=make('button','btn-pixel btn-primary activity-confirm','完成这件事');confirm.disabled=true;
    task.items.forEach((label,i)=>{
      const button=make('button','activity-item',label);button.type='button';button.setAttribute('aria-pressed','false');
      button.onclick=()=>{
        if(task.mode==='letter'){letter=i;for(const b of grid.children){b.classList.remove('selected');b.setAttribute('aria-pressed','false');}button.classList.add('selected');button.setAttribute('aria-pressed','true');progress.textContent='信里写着：「'+label+'。」';confirm.disabled=false;}
        else if(task.mode==='order'){
          if(task.required[sequence]!==i){progress.textContent='接下来先做：'+task.items[task.required[sequence]];return;}
          sequence++;button.disabled=true;button.classList.add('selected');progress.textContent=sequence+'/3 · '+label+'，做好了';confirm.disabled=sequence!==3;
        }else{
          if(!task.required.includes(i)){progress.textContent=id==='pack'?'这个先留在家里，回来时还能看见。':'今天先准备学习需要的东西。';return;}
          chosen.add(i);button.disabled=true;button.classList.add('selected');button.setAttribute('aria-pressed','true');progress.textContent=chosen.size+'/3 · '+(id==='water'?'土壤湿润了':'已经放好了');confirm.disabled=chosen.size!==3;
        }
        paint();window.GameAudio.life(id);
      };grid.appendChild(button);
    });
    confirm.onclick=()=>{if(!confirm.disabled){confirm.disabled=true;finish(id,letter);}};root.appendChild(confirm);
  }
  return {defaults,normalize,steps,step,target,available,dialogue,activity,apply,tick,relationships,buildActivity,schoolOpen};
})();
