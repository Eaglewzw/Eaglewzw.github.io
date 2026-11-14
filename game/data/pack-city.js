// ===============================================================
//  内容包 · 城市
//  对应第七章「后来的经历」（ch-07-later）与第八章「在深圳工作」（ch-08-shenzhen）：
//  一张「深圳 · 科技园与城中村」的可探索场景，以及它的人物、对话与回忆。
//
//  场景为艺术化示意：一侧是玻璃幕墙的科技园，一侧是握手楼密布的城中村，
//  中间一条柏油主干道把两种生活隔开又连起来。地图 60 格 × 44 格。
//  所有故事类内容均为【占位故事】——已明确标注，等主人替换成真实经历。
//
//  注册方式（与引擎约定一致）：
//    Object.assign(window.LIFE_DATA.scenes / characters / dialogues, …)
//    window.LIFE_DATA.memories.push(…)
//  game.njk 里本文件加载于核心数据（characters/dialogues/memories）之后；
//  文件末尾的 sealPackData() 是一道保险：无论脚本顺序如何调整（内容包
//  被挪到核心文件之前、或核心文件日后改为整体赋值重挂容器），内容包
//  数据都不会丢，详见该函数注释。
// ===============================================================
window.LIFE_DATA = window.LIFE_DATA || {};

// ---------------------------------------------------------------
//  场景 · shenzhen「深圳 · 科技园与城中村」
//  图例（本场景新增字符，会与全局图例合并）：
//    a 沥青路面      - 车道虚线     = 斑马线      y 水泥地面
//    Q 写字楼(整栋)  H 握手楼(整栋) m 居民楼(整栋) n 便利店(整栋)
//    q 临街店铺(整栋) t 公交亭       i 红绿灯      w 砖围墙
//    其余沿用全局：. 草地  , 花  p 小径  T 树  B 灌木  o 石头  L 路灯
//  大型建筑在地图上只占一个字符（锚点=底部中央），楼体向上覆盖绘制。
// ---------------------------------------------------------------
window.LIFE_DATA.scenes = window.LIFE_DATA.scenes || {};
Object.assign(window.LIFE_DATA.scenes, {
    "shenzhen": {
      "id": "shenzhen",
      "name": "深圳 · 科技园与城中村",
      "indoor": false,
      "map": [
        "wwwwwwwwwwwwwwwwwwwwwwwwwyaaaaaayTT.TT.TT.TT.TT.TT.TT.TT.TT.",
        "pBppppppBppppp.ppppBppp.pyaaaaaay...........................",
        "yyyypyypyyyppyyyyyyyyyyyyyaaaaaay...........................",
        "yyyypyypyyyppyyyyyyyyyyyyyaaaaaay..................T........",
        "yyyHpyHpyHyppyyymyyymyyyyyaaaaaay...........................",
        "yyyyyyyyyyyppyyyyyyyyyyyyyaaaaaay....Q..Q..Q..Q...,......T..",
        "yByyy,yyyyyppLyyyyyyyyyyyyaaaaaay..yyyyyyyyyyyyy............",
        "yyyyyyyoyyypppppppppyyyyyyaaaaaay.wyyyyyyyyyy,yy.......,....",
        "yyyyyyyyyyyppyyyyyyyyyyyyyaaaaaay.wy,yyyyyyyyyyyppppppp.....",
        "yyyyyyyyyyyppyy,yyByyyyyyyaaaaaay.wyyyyyyyyyyyyy.....B......",
        "yyyyyyyyyyyppyyyyyyyyTyyyyaaaaaay.wyy,y,y,y,yyyy..........,.",
        "yyyHyyHyyyyppyyyyyyyyyyyyyaaaaaay.pppppyyyyyyyyy............",
        "y,yyyyyyyyyppyyyyyyyyyoyyyaaaaaay.pppppyyyyyyyyy.T..........",
        "yyyLyyyyyyyppyyyyyyyyyyyyyaaaaaay.wyLyyyyyyyyyLy....,.......",
        "yyyyyyyyyByppyyyyyyyyyyyyyaaaaaay.wyyyyyyyyyyyyy........T...",
        "yyyyyyyyyyyppyyyyyyyyyyyyyaaaaaay.wyyyyyyyyyyyyyL...........",
        "yyyyyyyyyyyppyyyyyyyyyyyyy======y.wyyyyyyyyyyyyy............",
        "yyqyyqpyqyyppynyyyyyyyyyqy======y...........................",
        "TyyyyyyyyyTyyyyyyyyTyyyyyiaaaaaaiyyyTyyyyyyytyyyyyyTyyyyyTyy",
        "aaaaaaaaaaaaaaaaaaaaaaa===aaaaaa===aaaaaaaaaaaaaaaaaaaaaaaaa",
        "aaaaaaaaaaaaaaaaaaaaaaa===aaaaaa===aaaaaaaaaaaaaaaaaaaaaaaaa",
        "-----------------------===aaaaaa===-------------------------",
        "aaaaaaaaaaaaaaaaaaaaaaa===aaaaaa===aaaaaaaaaaaaaaaaaaaaaaaaa",
        "aaaaaaaaaaaaaaaaaaaaaaa===aaaaaa===aaaaaaaaaaaaaaaaaaaaaaaaa",
        "yyTyyyyyyyyytyyyyTyyyTyyyiaaaaaaiyyyyTyyyTyyyyyyyyyyTyyyyTyy",
        "wwwwwwwwwwpppwwwww.......y======yy......p...................",
        "yyyyyyyyyyypyyyyyyyyyyyy,y======yy.n.L..p............T......",
        "yyyyyyyyyyypyyyyyyyLyyyyyyaaaaaayy....ppppppppppppp......,..",
        "yyyyyypyyyypyyyypyyyyyTyyyaaaaaayy.....,....p.....,.........",
        "yyyyyypyyyypyyyypyyyyyyyyyaaaaaayy..........p..T....o.......",
        "yyyyyypyyyypyyyypyyyyyy,yyaaaaaayy....T...B.p...............",
        "yyyymypyymypyymypyyyByyyyyaaaaaayy..........p............T..",
        "yyyyyypyyyypyyyypyyyyyyyyyaaaaaayy..........p...............",
        "ypppppppppppppppppyyyyyyyyaaaaaayy..........o......B........",
        "yyyyyypyyyypyyyyyyyyyyyyyyaaaaaayy..........................",
        "yyyyyypyyyypyyyyyyyyyyyyyyaaaaaayy...........,....L.....B...",
        "yyyyyypyyyypyyyyyyyyyyyyyyaaaaaayy......T............,......",
        "yyyymypyymypyymyyyyyyyyyyyaaaaaayy........,.................",
        "......p....p.............yaaaaaayy..............T...........",
        "......p.o..p.............yaaaaaayy....,.....................",
        "...T..p....p.....T..,....yaaaaaayy............B........T....",
        "......p...Tp.,...........yaaaaaayy..T.......................",
        "......p....p...B.........yaaaaaayyppppp.....................",
        "......p....p.............yaaaaaayy.........................."
      ],
      "legend": {
        "a": {
          "tile": "asphalt"
        },
        "-": {
          "tile": "roadline"
        },
        "=": {
          "tile": "crosswalk"
        },
        "y": {
          "tile": "yard"
        },
        "Q": {
          "tile": "asphalt",
          "entity": "office",
          "solid": true
        },
        "H": {
          "tile": "asphalt",
          "entity": "cw",
          "solid": true
        },
        "m": {
          "tile": "asphalt",
          "entity": "resident",
          "solid": true
        },
        "n": {
          "tile": "asphalt",
          "entity": "conv",
          "solid": true
        },
        "q": {
          "tile": "asphalt",
          "entity": "shop",
          "solid": true
        },
        "t": {
          "tile": "asphalt",
          "entity": "busstop",
          "solid": true
        },
        "i": {
          "tile": "asphalt",
          "entity": "tlight",
          "solid": true
        },
        "w": {
          "tile": "brickwall",
          "solid": true
        }
      },
      "spawnPoints": {
        "default": [
          12,
          18
        ],
        "from-county": [
          2,
          20
        ]
      },
      "characters": [
        {
          "id": "city-colleague",
          "at": [
            51,
            8
          ]
        },
        {
          "id": "city-clerk",
          "at": [
            35,
            27
          ]
        }
      ],
      "interactables": [
        {
          "id": "lobby-gate",
          "type": "dialogue",
          "at": [
            40,
            6
          ],
          "hint": "写字楼大堂",
          "dialogueId": "dlg-lobby",
          "isDemo": true
        },
        {
          "id": "stall-changfen",
          "type": "dialogue",
          "at": [
            6,
            17
          ],
          "hint": "巷口的肠粉摊",
          "dialogueId": "dlg-stall",
          "isDemo": true
        },
        {
          "id": "conv-night",
          "type": "dialogue",
          "at": [
            14,
            18
          ],
          "hint": "深夜便利店",
          "dialogueId": "dlg-convnight",
          "isDemo": true
        },
        {
          "id": "bench-park",
          "type": "dialogue",
          "at": [
            44,
            33
          ],
          "hint": "公园长椅",
          "dialogueId": "dlg-bench",
          "isDemo": true
        },
        {
          "id": "roof-view",
          "type": "dialogue",
          "at": [
            14,
            32
          ],
          "hint": "居民楼的天台",
          "dialogueId": "dlg-roof",
          "isDemo": true
        },
        {
          "id": "mem-ticket",
          "type": "memory",
          "at": [
            12,
            24
          ],
          "hint": "公交亭下的旧车票",
          "dialogueId": "dlg-ticket",
          "memoryId": "mem-city-ticket",
          "isDemo": true
        },
        {
          "id": "mem-window",
          "type": "memory",
          "at": [
            6,
            12
          ],
          "hint": "握手楼的窗",
          "dialogueId": "dlg-window",
          "memoryId": "mem-city-window",
          "isDemo": true
        },
        {
          "id": "mem-overtime",
          "type": "memory",
          "at": [
            43,
            6
          ],
          "hint": "凌晨还亮着的窗",
          "dialogueId": "dlg-overtime",
          "memoryId": "mem-city-overtime",
          "isDemo": true
        },
        {
          "id": "mem-launch",
          "type": "memory",
          "at": [
            52,
            10
          ],
          "hint": "园区草坪",
          "dialogueId": "dlg-launch",
          "memoryId": "mem-city-launch",
          "isDemo": true
        },
        {
          "id": "road-county",
          "type": "passage",
          "tiles": [
            [
              0,
              20
            ],
            [
              0,
              21
            ]
          ],
          "hint": "沿大道往西 · 县城",
          "to": {
            "scene": "county",
            "spawn": "from-shenzhen"
          }
        }
      ]
    }
  });

// ---------------------------------------------------------------
//  人物（均为演示人物）
// ---------------------------------------------------------------
window.LIFE_DATA.characters = window.LIFE_DATA.characters || {};
Object.assign(window.LIFE_DATA.characters, {
  'city-colleague': {
    id: 'city-colleague',
    name: '深圳同事（演示人物）',
    sprite: 'npc-worker',
    dialogueId: 'dlg-colleague',
    isDemo: true
  },
  'city-clerk': {
    id: 'city-clerk',
    name: '便利店店员（演示人物）',
    sprite: 'npc-villager',
    dialogueId: 'dlg-clerk',
    isDemo: true
  }
});

// ---------------------------------------------------------------
//  对话
// ---------------------------------------------------------------
window.LIFE_DATA.dialogues = window.LIFE_DATA.dialogues || {};
Object.assign(window.LIFE_DATA.dialogues, {

  // 写字楼大堂：闸机与咖啡香（氛围）
  'dlg-lobby': {
    nodes: [
      { text: '玻璃门一开，冷气混着现磨咖啡的味道涌出来。大堂比外面暗，亮着的是闸机上一格一格的绿灯。' },
      { text: '保安抬了抬下巴，算是打过招呼。前台背后的屏幕上滚动着各家公司的名字，一格格往上翻。' },
      { text: '早高峰的电梯要排队。人人手里一杯咖啡、一部手机——这里的一天，是从等电梯开始的。' },
      { text: '（演示场景：大堂的氛围描写为功能演示文案，不是真实经历。）', end: true }
    ]
  },

  // 城中村巷口的肠粉摊（氛围）
  'dlg-stall': {
    nodes: [
      { text: '巷口的肠粉摊刚支起来，蒸屉冒着白汽，米浆的香味顺着窄巷飘出去老远。' },
      { text: '老板娘手脚麻利：一勺浆、一个蛋、刮板一推，几秒钟出货。塑料凳沿街摆了一排，先到先坐。' },
      { text: '在这里落脚的人都懂：清晨这一屉热腾腾的肠粉，是深圳最便宜的热情。' },
      { text: '（演示场景：摊子与摊主均为氛围演示，不是真实店铺。）', end: true }
    ]
  },

  // 深夜便利店（氛围）
  'dlg-convnight': {
    nodes: [
      { text: '凌晨一点的便利店，灯白得像另一个时区。关东煮在锅里咕嘟咕嘟，加热柜转着圈。' },
      { text: '加班回来的人买一桶泡面，代驾司机靠在门口刷手机，谁也不打扰谁。' },
      { text: '城市再大，总有一盏灯为晚归的人留着——虽然它只是想顺手卖给你一个饭团。' },
      { text: '（演示场景：氛围描写为功能演示文案。）', end: true }
    ]
  },

  // 公园长椅（氛围）
  'dlg-bench': {
    nodes: [
      { text: '所谓长椅，其实是一块条石，被太阳晒了一下午，坐上去还有点烫。' },
      { text: '对面楼里的灯一层层亮起来。有人在跑步，有人遛狗，有人只是坐着，把手机扣在腿上发呆。' },
      { text: '在这座城市，一块石凳就是一小段租来的安静——到点就该回去睡了。' },
      { text: '（演示场景：氛围描写为功能演示文案。）', end: true }
    ]
  },

  // 居民楼的天台（氛围）
  'dlg-roof': {
    nodes: [
      { text: '居民楼的天台上，晾衣绳拉了好几道，床单在风里鼓成帆。' },
      { text: '扶着栏杆往远处看：写字楼的玻璃幕墙反着光，一直铺到看不见的地方。' },
      { text: '据说天气好的时候能望见山。住在这里的人更常望见的，是下个月的房租。' },
      { text: '（演示场景：占位描写——替换成你自己的天台记忆。）', end: true }
    ]
  },

  // 公交亭下的旧车票（第七章 · 占位故事 → 回忆）
  'dlg-ticket': {
    nodes: [
      { text: '公交亭的广告灯箱半夜也不会暗。站牌被等车的人摸得发亮，座椅缝里卡着一张旧车票的边角。' },
      { text: '一张薄薄的车票，能把一个人从熟悉的地方连根拔起，再在这座城市轻轻放下。' },
      { text: '（这是一段占位故事——替换成你的真实经历：哪一年来的深圳？坐了多久的车？出站时第一眼看见的是什么？谁来接的你？）' },
      { text: '（把这张车票的故事记进回忆手册吧。）', end: true, memoryId: 'mem-city-ticket' }
    ]
  },

  // 握手楼的窗（第七章 · 占位故事 → 回忆）
  'dlg-window': {
    nodes: [
      { text: '握手楼的窗户挨得很近，对面晾的衣服几乎能碰到这边的窗框，伸手就能递过去一碗汤。' },
      { text: '一扇窗就是一个人的剧场：炒菜声、视频通话里的乡音、深夜还亮着的一小格屏幕。' },
      { text: '（这是一段占位故事——替换成你的真实经历：第一间出租屋在几楼？窗外是什么？住了多久？）' },
      { text: '（把这扇窗记进回忆手册吧。）', end: true, memoryId: 'mem-city-window' }
    ]
  },

  // 第一次加班到凌晨（第八章 · 占位故事 → 回忆）
  'dlg-overtime': {
    nodes: [
      { text: '这栋楼里有一扇窗，凌晨两点半还亮着。楼下便利店的人说，那扇窗常常是整层最后一盏。' },
      { text: '第一次加班到凌晨的人，往往记不清自己改了什么，只记得下楼时马路空得能听见红绿灯变灯的声音。' },
      { text: '（这是一段占位故事——替换成你的真实经历：那天在赶什么？几点走的？回去路上在想什么？）' },
      { text: '（把那个通宵记进回忆手册吧。）', end: true, memoryId: 'mem-city-overtime' }
    ]
  },

  // 项目上线那天（第八章 · 占位故事 → 回忆）
  'dlg-launch': {
    nodes: [
      { text: '园区草坪上有人野餐、有人团建，一只飞盘从人群头顶慢悠悠地飞过去。' },
      { text: '据说每一块草坪都见证过一次上线：前一夜还兵荒马乱，第二天下午大家坐在草坡上，谁都不想看手机。' },
      { text: '（这是一段占位故事——替换成你的真实经历：项目叫什么名字？上线那一刻你在哪儿？和谁一起庆祝的？）' },
      { text: '（把上线那一天记进回忆手册吧。）', end: true, memoryId: 'mem-city-launch' }
    ]
  },

  // 深圳同事（演示人物）
  'dlg-colleague': {
    nodes: [
      { text: '「嘿，新面孔。我是你隔壁工位的同事——先说好，这段是功能演示，人物是虚构的，别当真。」' },
      { text: '「在深圳做事，节奏是快，但也没传说中那么吓人。中午下楼吃个快餐，周末来园区草坪躺一会儿，缓过来就行。」' },
      {
        text: '「你呢，想听点什么？」',
        choices: [
          { label: '「有什么要特别注意的吗？」', next: 3 },
          { label: '「先去忙了，回头聊。」', next: 5 }
        ]
      },
      { text: '「按时吃饭，别硬扛。工作是为了生活——这两件事的顺序，千万别倒过来。」' },
      { text: '「有空去写字楼大堂闻闻咖啡香，再去城中村巷口吃份肠粉。这两样加起来，就是深圳的一半。」', end: true },
      { text: '「行，忙你的去。对了——巷口的肠粉摊六点收摊，手速快点儿。」', end: true }
    ]
  },

  // 便利店店员（演示人物）
  'dlg-clerk': {
    nodes: [
      { text: '「欢迎光临——哦，是来串门的呀。我是这间便利店的店员，演示人物，连卖的东西都是画出来的。」' },
      { text: '「这间店二十四小时营业。白天卖咖啡和饭团，夜里卖安静——晚归的人都懂。」' },
      { text: '「夜班印象最深的一单？凌晨三点，给一个刚下班的程序员热了份便当。他说了声谢谢，声音很轻。」' },
      { text: '（演示人物与情节均为功能演示，不是真实经历。）', end: true }
    ]
  }
});

// ---------------------------------------------------------------
//  回忆（4 条：2 条属第七章，2 条属第八章；正文均为占位故事）
// ---------------------------------------------------------------
window.LIFE_DATA.memories = window.LIFE_DATA.memories || [];
window.LIFE_DATA.memories.push(
  {
    id: 'mem-city-ticket',
    chapterId: 'ch-07-later',
    title: '初到深圳的车票',
    summary: '一张薄薄的车票，把人从熟悉的地方连根拔起，又在这座城市轻轻放下。',
    paragraphs: [
      '公交亭的灯箱下，座椅缝里还卡着一张旧车票的边角。',
      '（这是一段占位故事——替换成你的真实经历：哪一年、从哪儿出发、坐了多久、出站时第一眼看见的是什么、行李箱的轮子坏没坏、谁来接的你。）'
    ],
    dateLabel: '',
    people: [],
    images: [],
    links: [
      { label: '博客里的无人机数据集 Drone-10k', url: 'https://eaglewzw.github.io/2025/12/15/Drone-10k/' }
    ],
    status: 'published',
    isDemo: true
  },
  {
    id: 'mem-city-window',
    chapterId: 'ch-07-later',
    title: '出租屋的窗',
    summary: '握手楼的窗户挨得很近，一扇窗就是一个人的剧场。',
    paragraphs: [
      '对面晾的衣服几乎能碰到这边的窗框，伸手就能递过去一碗汤。',
      '（这是一段占位故事——替换成你的真实经历：第一间出租屋在几楼、窗外是什么、住了多久、搬走时带走了什么。）'
    ],
    dateLabel: '',
    people: [],
    images: [],
    links: [
      { label: 'GitHub 主页', url: 'https://github.com/Eaglewzw' }
    ],
    status: 'published',
    isDemo: true
  },
  {
    id: 'mem-city-overtime',
    chapterId: 'ch-08-shenzhen',
    title: '第一次加班到凌晨',
    summary: '整层楼最后一盏灯，和凌晨空得能听见红绿灯变灯的马路。',
    paragraphs: [
      '那扇窗常常是整层最后一盏。下楼时，马路空得能听见红绿灯变灯的声音。',
      '（这是一段占位故事——替换成你的真实经历：那天在赶什么、几点走的、回去路上在想什么、第二天几点又坐回了工位。）'
    ],
    dateLabel: '',
    people: [],
    images: [],
    links: [
      { label: 'GitHub 主页', url: 'https://github.com/Eaglewzw' }
    ],
    status: 'published',
    isDemo: true
  },
  {
    id: 'mem-city-launch',
    chapterId: 'ch-08-shenzhen',
    title: '项目上线那天',
    summary: '前一夜兵荒马乱，第二天下午大家坐在草坡上，谁都不想看手机。',
    paragraphs: [
      '园区草坪见证过很多次上线。这一次，飞盘从人群头顶慢悠悠地飞过去。',
      '（这是一段占位故事——替换成你的真实经历：项目叫什么名字、上线那一刻你在哪儿、和谁一起庆祝、庆功饭吃的是什么。）'
    ],
    dateLabel: '',
    people: [],
    images: [],
    links: [
      { label: '博客里的无人机数据集 Drone-10k', url: 'https://eaglewzw.github.io/2025/12/15/Drone-10k/' }
    ],
    status: 'published',
    isDemo: true
  }
);

// ---------------------------------------------------------------
//  加载顺序自适应（防覆盖保险）
//  game.njk 目前的加载顺序是：
//    chapters → scenes → characters → dialogues → memories →
//    pack-village → pack-county → pack-city → sprites → … → game.js
//  内容包在核心文件之后加载，Object.assign / push 直接生效；
//  pack-county.js 还把 characters/dialogues/memories 换成了「合并式
//  存取器」。这里再补一道保险：把（尚未被保护的）容器也换成合并型
//  存取器——日后若有人调整脚本顺序、或核心文件改回整体赋值重挂
//  容器，内容包数据都会自动并回去，不会丢。
// ---------------------------------------------------------------
(function sealPackData() {
  const D = window.LIFE_DATA;
  ['scenes', 'characters', 'dialogues', 'memories'].forEach(function (key) {
    const desc = Object.getOwnPropertyDescriptor(D, key);
    if (!desc || desc.get || !('value' in desc)) return; // 已有存取器保护（如 pack-county），跳过
    const isArr = Array.isArray(D[key]);
    const pack = isArr ? D[key].slice() : Object.assign({}, D[key]); // 当前数据快照
    let merged = D[key];
    Object.defineProperty(D, key, {
      configurable: true,
      enumerable: true,
      get: function () { return merged; },
      set: function (incoming) {
        merged = isArr
          ? [].concat(incoming || [], pack)
          : Object.assign({}, incoming || {}, pack);
      }
    });
  });
})();
