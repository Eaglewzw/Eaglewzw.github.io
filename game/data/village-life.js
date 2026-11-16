// Village scenery and fictional ambient residents; existing story and memory IDs stay stable.
(function () {
  'use strict';
  const data = window.LIFE_DATA, village = data.scenes.village;
  const width = 62, height = 44;
  const map = Array.from({length: height}, (_, y) => Array.from({length: width}, (_, x) => {
    if (x >= 51 && x <= 55) return '~';
    if (x === 61) return y % 4 === 0 ? 'T' : '.';
    if (x >= 56) return (x + y) % 13 === 0 ? ',' : '.';
    if (x === 50) return 's';
    if (y < 26 && x < 21) return village.map[y][x] || '.';
    return (x * 13 + y * 7) % 29 === 0 ? ',' : '.';
  }));
  function rect(x, y, w, h, tile) {
    for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) map[r][c] = tile;
  }
  // Public lanes connect the old cottage, residential courtyards and river bank.
  [9, 13, 24, 33, 41].forEach(y => rect(y === 13 ? 8 : 21, y, y === 13 ? 42 : 29, 2, 'p'));
  [24, 33, 41].forEach(y => rect(2, y, 48, 2, 'p'));
  rect(16, 13, 2, 31, 'p'); rect(30, 7, 2, 36, 'p'); rect(40, 7, 2, 36, 'p');
  // Keep the original memory tree and cottage approach intact.
  map[12][17] = 'T'; map[11][18] = 'S';
  Object.assign(village.legend, {
    a: {tile: 'roofSlate', solid: true}, z: {tile: 'roofMoss', solid: true},
    h: {tile: 'door', solid: true}
  });
  const plots = [[23,2],[33,2],[43,2],[24,17],[34,17],[43,17],
    [3,28],[10,28],[22,28],[33,28],[43,28],[3,36],[23,36],[34,36],[43,36]];
  const homes = [];
  plots.forEach(function ([x,y], i) {
    const roof = ['R','a','z'][i % 3];
    rect(x - 1, y - 1, 7, 7, '.');
    rect(x, y, 5, 3, roof);
    ['W','O','h','O','W'].forEach((ch,j) => map[y+3][x+j] = ch);
    rect(x, y+4, 5, 2, 'p');
    const roadY = y < 10 ? 9 : y < 24 ? 24 : y < 34 ? 33 : 41;
    for (let r=y+4; r<=roadY; r++) map[r][x+2]='p';
    map[y+4][x-1]='f'; map[y+5][x-1]=',';
    map[y+4][x+5]=','; map[y+5][x+5]='f';
    homes.push([x+2,y+4]);
  });
  // A few trees, lit lanes and a river-side resting place, away from travel lanes.
  [[21,1],[31,1],[41,1],[48,7],[22,22],[38,22],[48,22],[2,35],[20,37],[48,36]].forEach(([x,y])=>map[y][x]='T');
  [[20,14],[29,10],[39,14],[49,14],[29,25],[39,25],[15,34],[29,34],[39,42]].forEach(([x,y])=>map[y][x]='L');
  map[17][48]='K';
  // Distinct neighborhoods retain every original doorstep and travel connection.
  Object.assign(village.legend, {
    j: {tile:'yard'}, v: {tile:'bridge'}, w: {tile:'yard',solid:true}
  });
  // Stone-paved old alley, with a small well court where the grid opens up.
  for(let y=26;y<43;y++)for(let x=2;x<16;x++)if(map[y][x]==='p')map[y][x]='j';
  rect(10,36,5,5,'j'); rect(12,37,2,2,'w');
  // The southern edge of the threshing yard becomes household vegetable plots.
  rect(3,21,4,2,'#'); rect(9,21,4,2,'#');
  rect(7,20,2,4,'p'); rect(13,20,2,2,'p');
  // A genuine two-tile-wide footbridge crosses the river to the eastern grove.
  rect(42,23,9,1,'p'); rect(50,22,7,2,'v');
  rect(57,21,3,4,'p'); rect(58,24,2,6,'p');
  [[57,17],[59,18],[60,26],[57,30],[60,34]].forEach(([x,y])=>map[y][x]='T');
  // Bank-side lanes have staggered flower beds instead of uniform square yards.
  [[49,7],[48,9],[49,16],[48,26],[49,28],[48,34],[49,40]].forEach(([x,y])=>{
    if(map[y][x]==='.' || map[y][x]===',')map[y][x]=',';
  });
  village.districts=[
    {id:'village-heart',name:'老槐树下',bounds:[12,8,10,8],palette:'warm'},
    {id:'garden-courts',name:'菜地小院',bounds:[2,15,13,9],palette:'green'},
    {id:'old-lanes',name:'井边老巷',bounds:[2,26,14,17],palette:'stone'},
    {id:'riverside',name:'河畔人家',bounds:[42,0,19,43],palette:'river'}
  ];
  village.landmarks=[
    {id:'old-tree',name:'村口老槐树',at:[18,13],description:'老槐树就在自己小屋门前。树影下那段路，总有人停下说话。'},
    {id:'garden',name:'晒谷场旁的菜园',at:[14,20],description:'两片菜畦隔着一条土埂，叶尖上还挂着水。旁边就是村里的晒谷场。'},
    {id:'well',name:'老巷石井',at:[11,38],description:'石井边沿被手掌磨得光滑。青石路从这里拐进老巷，晾衣绳横过低矮的院墙。'},
    {id:'old-lane',name:'青石老巷',at:[10,34],description:'脚下换成了旧青石。几户人家挤在小巷两边，门前摆着水缸和竹筐。'},
    {id:'river',name:'河西桥头',at:[49,23],description:'走上木桥，就能到河对岸的小树林。河畔几户人家的窗户朝着这边。'},
    {id:'bridge',name:'村东木桥',at:[53,23],description:'脚下的木板轻轻响着，河水从桥下流过去。两岸的路在这里接在了一起。'},
    {id:'east-bank',name:'东岸树荫',at:[58,23],description:'隔着河回头看，屋顶、炊烟和村口的大树落在同一幅画里。'},
    {id:'village-gate',name:'南边出村的路',at:[16,40],description:'沿这条路往南走就是县城。回头还能看见井边的老巷。'}
  ];
  village.worldPlaces=Object.fromEntries(village.landmarks.map(place=>[place.id,place.at]));
  for(const place of village.landmarks) {
    const dialogueId='dlg-place-'+place.id;
    data.dialogues[dialogueId]={nodes:[{text:place.description,end:true}]};
    // The existing tree is already a story anchor; keep its interaction priority.
    if(place.id!=='old-tree')village.interactables.push({id:'place-'+place.id,type:'dialogue',at:place.at,hint:place.name,dialogueId,isDemo:true});
  }
  village.name = '下湖源村 · 村巷';
  village.map = map.map(row=>row.join(''));
  village.homes = homes;
  village.spawnPoints['from-county'] = [16,40];
  const south = village.interactables.find(z=>z.id==='road-county');
  south.tiles = [[16,42],[16,43],[17,42],[17,43]];
  village.interactables.find(z=>z.id==='kite-bank').at = [48,17];
  village.characters[0].at = [46,14];
  const roles = ['种菜的阿姨','提篮的邻居','放学的孩子','修竹椅的伯伯','散步的奶奶',
    '看菜园的大叔','送信的青年','买菜的婶婶','乘凉的爷爷','赶集的邻居',
    '扎辫子的女孩','戴草帽的叔叔','河边散步的人','拿书的学生','巷口的阿婆',
    '挑菜的村民','做木工的邻居','跑腿的青年','看风筝的孩子','遛弯的伯伯'];
  const starts = [[19,13],[23,14],[27,13],[32,14],[36,13],[42,14],[46,13],
    [23,9],[28,10],[34,9],[43,10],[17,20],[21,24],[27,25],[35,24],
    [44,25],[8,34],[24,34],[35,33],[44,42]];
  const chatter = ['沿着这条巷子走，家家户户门前都有小院。', '天亮了，出来走走，顺便和邻居打个招呼。',
    '河边风凉，过了晒谷场再往东走就到了。', '傍晚窗户亮起来，就知道该往家里走了。', '慢慢走，村里的路都连着呢。'];
  roles.forEach(function (name,i) {
    const id='village-resident-'+i, dialogueId='dlg-'+id;
    data.characters[id]={id,name,sprite:'npc-local-'+i%6,dialogueId,isDemo:true};
    data.dialogues[dialogueId]={nodes:[{text:chatter[i%chatter.length],end:true}]};
    const at=starts[i];
    const route = [at, [at[0]+(i%2 ? -2 : 2),at[1]], at];
    village.characters.push({id,at,route,nightHome:homes[i%homes.length],speed:14+i%5*2});
  });
})();
