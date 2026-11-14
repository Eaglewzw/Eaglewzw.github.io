// ===============================================================
//  内容包 · 县城 —— 第二章「五年级之后来到县城」的舞台
//  ---------------------------------------------------------------
//  场景 county「县城 · 十字街口」：十字柏油大街 + 红绿灯 + 斑马线、
//  连排临街店铺与小卖部、居民楼、学校区块（围墙 / 大门 / 教学楼 /
//  办公楼 / 操场）、集市空地、两处公交亭。56 列 × 40 行。
//
//  说明：本章的正文故事仍留白。场景里的回忆与部分对话是「占位故
//  事」（文末均已注明），只负责把县城的样子搭起来；等真实经历整
//  理好，直接替换对应文字即可。演示人物一律标注「演示」。
//
//  注册方式（照 container 结构）：
//    Object.assign(window.LIFE_DATA.scenes, { county: ... });
//    Object.assign(window.LIFE_DATA.characters, { ... });
//    Object.assign(window.LIFE_DATA.dialogues, { ... });
//    window.LIFE_DATA.memories.push({ ... });
// ===============================================================
window.LIFE_DATA = window.LIFE_DATA || {};

// —— 兼容加载顺序 ——
// 本文件在 characters.js / dialogues.js / memories.js 之前加载
// （见 game.njk 的 script 顺序），而这三个基础文件用整体赋值更新
// 同名容器，会把先注册的内容覆盖掉。这里把这三个字段换成「合并式」
// 存取器：后赋值的基础数据并入容器而不是整体替换——任何加载顺序、
// 任何赋值写法（整体赋值 / concat / Object.assign）内容都不丢失。
(function () {
  const D = window.LIFE_DATA;
  function mergeable(key, isArray) {
    let store = D[key] || (isArray ? [] : {});
    Object.defineProperty(D, key, {
      configurable: true,
      enumerable: true,
      get: function () { return store; },
      set: function (v) {
        if (isArray) {
          if (!Array.isArray(v)) return;
          const have = new Set(store.map(function (m) { return m && m.id; }));
          for (const item of v) {
            if (item && item.id && !have.has(item.id)) { store.push(item); have.add(item.id); }
          }
        } else {
          if (!v || typeof v !== 'object') return;
          Object.assign(store, v);
        }
      }
    });
  }
  mergeable('characters', false);
  mergeable('dialogues', false);
  mergeable('memories', true);
})();

// —— 场景 ——
// 字符画：一行 = 地图一行，一个字符 = 16×16 地块。
// 新字符在本场景 legend 里定义（引擎会与全局图例合并）：
//   a 柏油路面   - 路面中线   = 斑马线   w 砖围墙
//   y 操场/水泥空地   Y 操场里的树
//   q 临街店铺   c 小卖部   v 便利店   m 居民楼（草地上）
//   g 学校大门   M 教学楼   F 办公楼   t 公交亭   i 红绿灯
// 大型建筑是整栋实体：地图上只写一个锚点字符（建筑底部中心偏右），
// 周围对应范围被建筑覆盖，不要在占地里放互动点或出生点。
Object.assign(window.LIFE_DATA.scenes, {
  county: {
    id: 'county',
    name: '县城 · 十字街口',
    indoor: false,

    map: [
      'T..T..T..T..T.BT..T..T..T.aaa-aaaT..T..T..T..T..TB.T..T.',
      '.......................aaaaaa-aaaa.T..,.....T.,...T.....',
      '..wwwwwwwwwwwwwwwwwwwwwaaaaaa-aaaa..T....T.....T....T...',
      '..wyyyyyyyyyyyyyyyyyyywaaaaaa-aaaq......................',
      '..wyYyyyyyyyyyyyyyyYyywaaaaaa-aaaa........,........,....',
      '..wyyyyyyyyyyyyyyyyyyywaaaaaa-aaaq.....m.....m..........',
      '..wyyyyyyyyyMyyyyyyyyywaaaaaa-aaaa......................',
      '..wyyyyyyyyyyyyyyFyyyypaaaaaa-aaaq...T.....T.....T......',
      '..wyyyyyyyyyyyyyyyyyyypaaaaaa-aaaa......................',
      '..wyyyyyyyyyyyyyyyyyyywaataaa-aaaq......................',
      '..wyyYyyyyyyyyyyyyyyYywaaaaaa-aaaa......................',
      '..wyyyyyyyyyyyyyyyyyyywaaaaaa-aaaq...................B..',
      '..wwwwwwwwwwppgwwwwwwwwaaaaaa-aaaa..,..B................',
      '..B..........pp.,......aaaaaa-aaaq......................',
      '....T........pp........aaaaaa-aaaaaaaa..................',
      '.T.........T.pp.....,..aaaaaa-aaaaaaaa..T...T.......T...',
      '...,....m....pp........aia=======aiaSa..................',
      '..........,..ppaaaaaaaaaaa=======aaaaaaaaaaaaaaaaaaaaaaa',
      '.....,.......ppaaqaqaqaaaaaaa-aaaaaaaaaqaqacaqavaqacaqaa',
      'aaaaaaaaaaaaaaaaaaaaaaa===aaaaaaa===aaaaaaaaaaaaaaaaaaaa',
      'aaaaaaaaaaaaaaaaaaaaaaa===aaaaaaa===aaaaaaaaaaaaaaaaaaaa',
      'aaaaaaaaaaaaaaaaaaaaaaa===aaaaaaa===aaaaaaaaaaaaaaaaaaaa',
      '-----------------------===aaaaaaa===--------------------',
      'aaaaaaaaaaaaaaaaaaaaaaa===aaaaaaa===aaaaaaaaaaaaaaaaaaaa',
      'aaaaaaaaaaaaaaaaaaaaaaa===aaaaaaa===aaaaaaaaaaaaaaaaaaaa',
      'aaaaaaaaaaaaaaaaaaaaaaa===aaaaaaa===aaaaaaaaaaaaaaaaaaaa',
      '.aaaqacaqavaqacaqaqavaq...aaa-aaaaaaaqaqavaqataaqacaqava',
      '.aaaaaaaaaaaaaaaaaaaaaaaaa=======aaaaaaaaaaaaaaaaaaaaaaa',
      '...YyyyyyyyyyY.........aia=======aia....................',
      '.,.yyyyyyyyyyy.T........aaaaa-aaaa..B...................',
      '...yyyyyyyyyyy.......T..aaaaa-aaaa....T.......T.....T...',
      '..,yyyyyyyyyyy,....m....aqaaa-aaaq.......m..............',
      '...yyyyyyyyyyy..........aaaaa-aaaa...,...............,..',
      '...Yyyyyyyyyyy..T......Taaaaa-aaaa.........,...........B',
      '...........B.........,..acaaa-aaav......................',
      '.T......T...............aaaaa-aaaa....T.....T.....T.....',
      '........................aaaaa-aaaa.............,........',
      '..T...T...T...T.........aqaaa-aaaq......................',
      '........................aaaaa-aaaa......................',
      'T.T..T..T..T..T.BT..T..T..aaa-aaaT..T..T..T..TB.T..T..T.'
    ],

    legend: {
      'a': { tile: 'asphalt' },
      '-': { tile: 'roadline' },
      '=': { tile: 'crosswalk' },
      'w': { tile: 'brickwall', solid: true },
      'y': { tile: 'yard' },
      'Y': { tile: 'yard',   entity: 'tree',       solid: true },
      'q': { tile: 'asphalt', entity: 'shop',      solid: true },
      'c': { tile: 'asphalt', entity: 'store',     solid: true },
      'v': { tile: 'asphalt', entity: 'conv',      solid: true },
      'm': { tile: 'grass',   entity: 'resident',  solid: true },
      'g': { tile: 'path',    entity: 'schoolgate', solid: true },
      'M': { tile: 'yard',    entity: 'school',    solid: true },
      'F': { tile: 'yard',    entity: 'office',    solid: true },
      't': { tile: 'asphalt', entity: 'busstop',   solid: true },
      'i': { tile: 'asphalt', entity: 'tlight',    solid: true }
    },

    // 出生点：长途汽车站牌旁（初到县城）
    spawnPoints: {
      'default': [25, 10]
    },

    characters: [
      { id: 'county-teacher-male-demo',   at: [16, 9] },   // 操场·办公楼前
      { id: 'county-teacher-female-demo', at: [9, 8] },    // 操场·教学楼西侧
      { id: 'county-student-demo',        at: [14, 16] },  // 校门前土路上
      { id: 'county-storeboss-demo',      at: [7, 27] }    // 小卖部后巷
    ],

    interactables: [
      // —— 初到县城（第二章舞台）——
      { id: 'bus-arrival',        type: 'memory',    at: [25, 9],   hint: '长途汽车站牌',     dialogueId: 'dlg-arrival',      memoryId: 'mem-county-arrival', isDemo: true },
      { id: 'tlight-corner',      type: 'dialogue',  at: [24, 16],  hint: '十字路口的红绿灯', dialogueId: 'dlg-tlight' },
      { id: 'newsstand-rack',     type: 'link',      at: [36, 16],  hint: '报刊亭的杂志架',   dialogueId: 'dlg-newsstand',
        url: 'https://eaglewzw.github.io/2025/12/15/Drone-10k/', linkLabel: '打开博客文章《Drone-10k》' },
      { id: 'stationery-window',  type: 'dialogue',  at: [33, 7],   hint: '文具店的橱窗',     dialogueId: 'dlg-stationery' },
      { id: 'noodle-aroma',       type: 'dialogue',  at: [12, 26],  hint: '面馆的香气',       dialogueId: 'dlg-noodle' },
      { id: 'store-fridge',       type: 'dialogue',  at: [6, 26],   hint: '小卖部的冰柜',     dialogueId: 'dlg-fridge' },
      { id: 'market-square',      type: 'dialogue',  at: [8, 30],   hint: '集市的吆喝声',     dialogueId: 'dlg-market' },
      // —— 学校区块（第三章 / 第四章）——
      { id: 'gate-bell',          type: 'dialogue',  at: [14, 12],  hint: '学校大门',         dialogueId: 'dlg-gatebell' },
      { id: 'classroom-front',    type: 'dialogue',  at: [12, 6],   hint: '教学楼的教室',     dialogueId: 'dlg-classroom' },
      { id: 'office-door',        type: 'dialogue',  at: [17, 7],   hint: '老师们的办公室',   dialogueId: 'dlg-office', isDemo: true },
      { id: 'recess-yard',        type: 'dialogue',  at: [8, 9],    hint: '课间的操场',       dialogueId: 'dlg-recess' },
      { id: 'nightstudy-window',  type: 'memory',    at: [13, 6],   hint: '晚自习亮着的窗',   dialogueId: 'dlg-nightstudy', memoryId: 'mem-junior-years', isDemo: true },
      // —— 高中生活（第六章）——
      { id: 'senior-wing',        type: 'memory',    at: [10, 9],   hint: '高中部的晚自习',   dialogueId: 'dlg-senior-wing', memoryId: 'mem-high-school-years', isDemo: true },
      // —— 出口：回人生地图 ——
      { id: 'bus-map-exit',       type: 'chapterMap', at: [45, 26], hint: '回人生地图看看' }
    ]
  }
});

// —— 人物（均为功能演示人物）——
Object.assign(window.LIFE_DATA.characters, {
  'county-teacher-male-demo': {
    id: 'county-teacher-male-demo',
    name: '男老师（演示人物）',
    sprite: 'npc-worker',
    dialogueId: 'dlg-teacher-male',
    isDemo: true
  },
  'county-teacher-female-demo': {
    id: 'county-teacher-female-demo',
    name: '女老师（演示人物）',
    sprite: 'npc-painter',
    dialogueId: 'dlg-teacher-female',
    isDemo: true
  },
  'county-student-demo': {
    id: 'county-student-demo',
    name: '县城学生（演示人物）',
    sprite: 'npc-student',
    dialogueId: 'dlg-county-student',
    isDemo: true
  },
  'county-storeboss-demo': {
    id: 'county-storeboss-demo',
    name: '杂货店老板（演示人物）',
    sprite: 'npc-villager',
    dialogueId: 'dlg-storeboss',
    isDemo: true
  }
});

// —— 对话 ——
Object.assign(window.LIFE_DATA.dialogues, {

  // 长途汽车站牌：初到县城的观感（占位故事，读完收录回忆）
  'dlg-arrival': {
    nodes: [
      { text: '长途车站的站牌立在人行道上，油漆字写着开往各地的班次，最底下一行是粉笔添上去的临时加车。' },
      { text: '下车的人拎着大包小包站定，先看这条街：柏油路、斑马线、连成排的临街招牌，还有十字路口慢慢变颜色的灯。' },
      { text: '县城的声音比村里响，也比村里密——汽车喇叭、自行车铃、谁家收音机里的戏曲，混在一起，就是「到了」。' },
      { text: '（占位故事：这里想写的是初到县城的那个下午。等真实经历整理好，会替换成真实的到达。）', end: true, memoryId: 'mem-county-arrival' }
    ]
  },

  // 十字路口的红绿灯
  'dlg-tlight': {
    nodes: [
      { text: '十字路口的红绿灯是这条街上最高的东西之一，四个方向各挂一盏，谁都得听它的。' },
      { text: '绿灯一亮，自行车流最先冲出去，铃声响成一片；卡车不慌不忙，压着黄灯的尾巴过线。' },
      { text: '红灯变绿的那几秒，路口等路的人会同时迈步——县城的一天，就是被这盏灯切成一段一段的。', end: true }
    ]
  },

  // 报刊亭：带真实博客链接
  'dlg-newsstand': {
    nodes: [
      { text: '报刊亭的窗口镶着木框，挂着的杂志被风掀起一角，又啪嗒一声落回去。' },
      { text: '架子上摆着报纸、邮票，还有几本封面印着飞机与航模的杂志，翻开的那页画着旋翼和电路。' },
      { text: '（窗口贴着一张手写的纸条：航模资料，欢迎翻看。要看的话，可以从这里翻到博客里对应的那篇文章。）',
        link: {
          url: 'https://eaglewzw.github.io/2025/12/15/Drone-10k/',
          label: '打开博客文章《Drone-10k》'
        },
        end: true }
    ]
  },

  // 文具店的橱窗
  'dlg-stationery': {
    nodes: [
      { text: '文具店的橱窗擦得很亮：一层摆钢笔，一层摆田字格本，最里面是包着玻璃纸的橡皮。' },
      { text: '新学期的海报贴在玻璃上角——铅笔盒、书包、自动铅笔，都朝着街上的行人张着嘴。' },
      { text: '柜台玻璃板上留着一片试笔的墨水渍，一圈一圈，像小小的年轮。', end: true }
    ]
  },

  // 面馆的香气
  'dlg-noodle': {
    nodes: [
      { text: '面馆的排风扇往外呼呼吹着，半条街都闻得见骨头汤的味道。' },
      { text: '玻璃柜里码着浇头：牛肉、肥肠、酸菜里脊；老板娘隔着蒸汽问：二两还是三两？' },
      { text: '门口的小方桌翻台最快，蹲在门槛上端碗的也不少，呼噜噜一片，像整条街一起开饭。', end: true }
    ]
  },

  // 小卖部的冰柜
  'dlg-fridge': {
    nodes: [
      { text: '小卖部的冰柜紧挨着柜台，掀开盖子，白汽混着香精的甜味涌上来。' },
      { text: '玻璃罐里是橘子瓣糖和话梅，墙上的小黑板用粉笔写着今天的赊账，字歪歪扭扭。' },
      { text: '老板从冰柜底下摸出一瓶汽水，起子一撬——「呲」的一声，比什么都解暑。', end: true }
    ]
  },

  // 集市的吆喝声
  'dlg-market': {
    nodes: [
      { text: '这块水泥空地一到晌午就摆满摊子：竹筐、蛇皮袋、三轮车，把过路的地方挤成一条弯弯的缝。' },
      { text: '吆喝声此起彼伏——「自家腌的酸菜」「最后两把小葱」；秤杆起起落落，秤砣晃得人眼晕。' },
      { text: '散集之后，地上剩下几片菜叶和半根草绳。扫地的奶奶把它们归拢成一堆，动作不紧不慢。', end: true }
    ]
  },

  // 学校大门：放学铃声 + 侧门指引
  'dlg-gatebell': {
    nodes: [
      { text: '学校大门上方的横幅被风吹得鼓起来，门柱上的电铃线一直通到传达室。' },
      { text: '铃一响，整条街都听得见。放学时校门口最先忙起来：卖的、接的、等人的，自行车把门口堵成一团，又很快散开。' },
      { text: '正门只在上下学时敞开，平日走东墙的侧门——门不大，白天一直虚掩着。', end: true }
    ]
  },

  // 教学楼的教室（氛围）
  'dlg-classroom': {
    nodes: [
      { text: '教室的窗户正对操场：上课时听得见操场上的哨子声，下课了听得见街上的吆喝声。' },
      { text: '黑板报的角落画着一辆自行车，粉笔线歪歪扭扭，署名被值日生擦掉了一半。' },
      { text: '课桌右上角的课程表被摸得起了毛边。男老师讲题时爱用黑板擦敲讲台，一下一下，像给句子打拍子。', end: true }
    ]
  },

  // 老师们的办公室：第三章「一位男老师的鼓励」的占位故事（收录回忆）
  'dlg-office': {
    nodes: [
      { text: '办公室的窗开了一条缝，里面一张张桌子挨着，作业本摞得比茶缸还高。' },
      { text: '男老师的桌上摊着一沓卷子，红笔圈出错的地方，页边写着一行字：「重来一次，你能行。」' },
      { text: '（占位故事：这里想写的是在办公室得到鼓励的那一次。等真实经历整理好，会替换成真实的人和话。）', end: true, memoryId: 'mem-teacher-male' }
    ]
  },

  // 课间的操场
  'dlg-recess': {
    nodes: [
      { text: '下课铃一响，操场先响起脚步声，然后才是喊声——跳皮筋的、追跑的、围着乒乓球台排队的。' },
      { text: '水泥地上用粉笔画了跳房子的格子，一轮一轮换人，格子被鞋底蹭得越来越淡。' },
      { text: '上课铃响之前，所有人往教学楼跑，操场一下子空了，只剩风吹旗绳拍旗杆的声音。', end: true }
    ]
  },

  // 晚自习亮着的窗：第四章「初中三年」的占位故事（收录回忆）
  'dlg-nightstudy': {
    nodes: [
      { text: '上晚自习的傍晚，教学楼的窗一排排亮起来。从操场这边看，像一格一格的灯箱。' },
      { text: '窗里传出翻书页的沙沙声，偶尔有人被叫起来背书，声音不大，整栋楼都听得见。' },
      { text: '下了晚自习走到街上，路灯把影子拉得老长；回头再看，那排窗还亮着一半——总有人走得比灯灭更晚。' },
      { text: '（占位故事：这里想写的是初中三年晚自习的灯光。等真实经历整理好，会替换成真实的那个夜晚。）', end: true, memoryId: 'mem-junior-years' }
    ]
  },

  // 男老师（演示人物）：第三章「一位男老师的鼓励」，带分支
  'dlg-teacher-male': {
    nodes: [
      { text: '（办公室门口，男老师放下手里的红笔，朝你招了招手。）「正想去操场转转，一起走两步？」' },
      { text: '「卷子发下来，先别急着看分数，先看错在哪。错的地方弄懂了，分数自己会回来。」' },
      {
        text: '「你手上那道题，卡在哪一步了？」',
        choices: [
          { label: '「这道题我还是不太明白。」', next: 3 },
          { label: '「我把错的题都抄了一遍。」', next: 4 }
        ]
      },
      { text: '「不明白就对了——说明你找到问题了。来，我们把第一步再走一遍，慢一点，不怕。」' },
      { text: '（他把作业本翻到最新一页，指着页边一行小字：比上个月工整多了。）「看，这就是弄懂的样子。」' },
      { text: '（演示对话：这位男老师是功能演示人物，展现的是「一位男老师的鼓励」。等真实经历整理好，会替换成真实的人和话。）', end: true, memoryId: 'mem-teacher-male' }
    ]
  },

  // 女老师（演示人物）：第五章「一位女老师的支持与中考」
  'dlg-teacher-female': {
    nodes: [
      { text: '（女老师抱着一沓名单从办公楼出来，看见你，把脚步放慢了。）「来得正好，有个事跟你说。」' },
      { text: '「中考的报名表我帮你核过了。字写清楚，照片按要求贴，别在这些小事上丢分。」' },
      { text: '「按平常的节奏来：饭吃好，觉睡够。模考的分数不算数，最后那一场才算数。」' },
      { text: '（她把报名表折成整齐的一小方递过来。）「有事就来办公室找我，门开着。」' },
      { text: '（演示对话：这位女老师是功能演示人物，展现的是「一位女老师的支持与中考」。等真实经历整理好，会替换成真实的人和话。）', end: true, memoryId: 'mem-teacher-female' }
    ]
  },

  // 县城学生（演示人物）
  'dlg-county-student': {
    nodes: [
      { text: '「新来的吧？我在这个学校上了两年学了，闭着眼都能从校门口走到教室。」' },
      { text: '「告诉你个门道：东墙的侧门白天开着，正门要等放学才敞——走侧门能少绕半条街。」' },
      { text: '「放学沿着大街走，能闻到三家不一样的饭香：面馆、饺子馆、烤饼摊。闻着闻着，就到家了。」' },
      { text: '（演示人物对话：这个学生是功能演示用的，不是真实的人。）', end: true }
    ]
  },

  // 杂货店老板（演示人物）
  'dlg-storeboss': {
    nodes: [
      { text: '「哟，稀客。本子一块二，带橡皮头的贵五分；汽水在冰柜里，掀盖子轻点儿。」' },
      { text: '「这条街啊，早上听面馆卸门板，晌午听学校打铃，天黑听谁家喊小孩回家——听了十几年，闭着眼都知道时辰。」' },
      { text: '（演示人物对话：这位老板是功能演示用的，不是真实的人。）', end: true }
    ]
  },
  'dlg-senior-wing': {
    nodes: [
      { text: '高中部在教学楼的另一侧，走廊又长又安静——只有粉笔灰和翻卷子的声音。' },
      { text: '黑板右上角的倒计时每天更新一个数字，粉笔字一天比一天小，像在小声倒数。' },
      { text: '（占位故事，等待替换为真实经历：高中的同学、班主任、那些熬过的夜晚，都还没有写下。）', end: true }
    ]
  }
});

// —— 回忆（占位故事，等真实经历整理好后替换正文）——
window.LIFE_DATA.memories.push(
  {
    id: 'mem-county-arrival',
    chapterId: 'ch-02-county',
    title: '初到县城的那个下午',
    summary: '长途汽车到站，第一次认真打量这条十字街口。',
    paragraphs: [
      '长途汽车在站牌前停下，行李先从车顶卸下来，人跟着落地。脚底下的柏油路比村里的土路硬，声音也更响。',
      '十字街口比想象里宽：红绿灯、斑马线、连成排的临街招牌。公交车进站时，车头几乎贴着店铺的遮阳棚。',
      '（占位故事，等待替换为真实经历：那天是谁送的、带了什么行李、第一顿饭在哪吃的，都还没有写下。）'
    ],
    dateLabel: '',
    people: [],
    images: [],
    links: [],
    status: 'published',
    isDemo: true
  },
  {
    id: 'mem-teacher-male',
    chapterId: 'ch-03-teacher-male',
    title: '卷子页边的那行红字',
    summary: '男老师把卷子摊开，先讲对的那一半，再把错的一道道陪着走。',
    paragraphs: [
      '办公室里全是作业本的墨水味。红笔圈出错的地方，页边却先写了一行字：「重来一次，你能行。」',
      '「错的地方弄懂了，分数自己会回来。」——后来每次拿到卷子，都会先去找那行红字还在不在。',
      '（占位故事，等待替换为真实经历：这位男老师的姓氏、说的原话、发生在哪个学期，都还没有写下。）'
    ],
    dateLabel: '',
    people: ['男老师（演示人物）'],
    images: [],
    links: [],
    status: 'published',
    isDemo: true
  },
  {
    id: 'mem-junior-years',
    chapterId: 'ch-04-junior-high',
    title: '晚自习亮起来的那排窗',
    summary: '初中三年的傍晚，教学楼的窗一格一格亮成灯箱。',
    paragraphs: [
      '晚自习的教室很安静：笔尖的沙沙声、翻书页的声音，和窗外偶尔经过的自行车铃混在一起。',
      '下了晚自习走到街上回头看，那排窗还亮着一半——总有人走得比灯灭更晚。',
      '（占位故事，等待替换为真实经历：初中三年的同学、那条晚自习后走过的路，都还没有写下。）'
    ],
    dateLabel: '',
    people: [],
    images: [],
    links: [],
    status: 'published',
    isDemo: true
  },
  {
    id: 'mem-teacher-female',
    chapterId: 'ch-05-teacher-female',
    title: '中考前的报名表',
    summary: '女老师核过报名表，说：按平常的节奏来，最后那一场才算数。',
    paragraphs: [
      '报名表被折成整齐的一小方，边角对齐——她批改的卷子向来如此，红笔的批注从不潦草。',
      '「模考的分数不算数，最后那一场才算数。」这句话，在中考前的那几个晚上被想起过很多次。',
      '（占位故事，等待替换为真实经历：这位女老师教的科目、中考那年的细节，都还没有写下。）'
    ],
    dateLabel: '',
    people: ['女老师（演示人物）'],
    images: [],
    links: [],
    status: 'published',
    isDemo: true
  },
  {
    id: 'mem-high-school-years',
    chapterId: 'ch-06-high-school',
    title: '高中部的倒计时',
    summary: '黑板右上角的数字每天减一，晚自习的灯总是整层最晚熄。',
    paragraphs: [
      '高中部在教学楼的另一侧。晚自习的灯总是整层最晚熄，黑板右上角写着「距高考还有 N 天」，数字每天减一。',
      '月考、周测、错题本越来越厚。走廊里背单词的声音压得很低——怕吵到别人，也怕自己听见心里的慌。',
      '（占位故事，等待替换为真实经历：高中的同学、班主任、那些熬过的夜晚和考完那天的天空，都还没有写下。）'
    ],
    dateLabel: '',
    people: [],
    images: [],
    links: [],
    status: 'published',
    isDemo: true
  }
);
