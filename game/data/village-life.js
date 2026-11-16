// Village scenery and fictional ambient residents; existing story and memory IDs stay stable.
(function () {
  'use strict';
  const data = window.LIFE_DATA, village = data.scenes.village;
  const width = 56, height = 44;
  const map = Array.from({length: height}, (_, y) => Array.from({length: width}, (_, x) => {
    if (x >= 51) return '~';
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
