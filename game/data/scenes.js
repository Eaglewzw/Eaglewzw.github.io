// ===============================================================
//  场景 · 地图与物件
//  每个 scene 是一张用「字符画」写的小地图 —— 一行字符串就是地图的
//  一行，一个字符就是一个 16×16 的地块。改地图 = 改字符画，不用碰代码。
//  注意：每个 scene 里所有行的字符数必须一致（顶部行宽即地图宽度）。
//
//  图例（legend）
//  ---------------------------------------------------------------
//  tile     该字符画什么地块（sprites.js 里实现）
//  entity   该字符生成一个「物件」实体（树、牌子、箱子……），可被
//           interactables 挂上交互；没有 entity 的字符只画地面
//  solid    是否挡路（碰撞）。水面、树干、屋子、家具都要挡。
//  water    水面地块，参与流动动画
//
//  场景字段
//  ---------------------------------------------------------------
//  id           场景标识（存档用它，建好后不要改）
//  name         界面左上角显示的场景名
//  indoor       true = 室内（画面氛围不同，水不参与）
//  map          字符画地图
//  spawnPoints  出生点表（地块坐标 [列, 行]）。'default' 必须有；
//               其他键供场景切换时使用（如从室内回到屋外）。
//  characters   场景里的人物（id 对应 characters.js，at 是地块坐标）
//  interactables 互动对象（at 指到地图上的某个物件/地块坐标）
//    type: 'dialogue'  多段对话        → dialogueId
//          'memory'    收录一段回忆    → dialogueId(可选) + memoryId
//          'link'      打开真实链接    → dialogueId(可选) + url
//          'chapterMap' 打开人生地图
//          'scene'     切换场景        → toScene + spawn
//    hint: 靠近时的提示文案
// ===============================================================
window.LIFE_DATA = window.LIFE_DATA || {};

window.LIFE_DATA.scenes = {
  // -------------------------------------------------------------
  //  村庄（室外）：小屋 + 河岸 + 树林 + 田地 + 通向人生地图的路
  //  地图为艺术化示意，不代表真实村庄布局。
  //  地图宽 40 格 × 高 26 格（每格 16px → 640×416 逻辑像素）。
  //  右侧蜿蜒的 s~~~~~ 为河岸与河水（河心还有一座小花岛）；
  //  中上 RRR/WOWDOWW 是小屋立面；西北密林里藏着木箱和一条
  //  通向「树林深处」的林间小路。
  // -------------------------------------------------------------
  village: {
    id: 'village',
    name: '示例村庄 · 村口',
    indoor: false,

    map: [
      'T.TT.TT.TT.T.................T....s~~~~~',
      '.pS.TT.T.TT.T..............T......s~~~~~',
      'Tpp.C.T.T.TT......,...T...........s~~~~~',
      '.TpTT.TT.T.TT......T........,..T...s~~~~',
      'T.p.TT.T..T.T........,..T.........,s~~~~',
      '.TpppT.TT.TT.......................s~~~~',
      'T.T.p.T.T.T.TRRRRRRR.....,.........s~~~~',
      '.T.TpT.T.T.T.RRRRRRR.To...........s~~~~~',
      'T.T.ppp.TT..TRRRRRRR......T.......s~~~~~',
      '..BTT.pT.TB..WOWDOWW..............s~.,~~',
      'T.T..Tpp..TTB...p...,B..........,Ts~,.~~',
      '.TBT.T..pT.TT,L.p.S..o.....B......s~~~~~',
      'T.TT..T.p.T.B...pT....,...,...,..s~~~~~~',
      '..T....Bpppppppppppppppppppppppp.s~~~~~~',
      '....,T....,....,p..,.....o.,..N..s~~~~~~',
      '.....ffffffff...po..........o...,s~~~~~~',
      'T....f######f,..p.,.....,.......s~~~~~~~',
      '.....f######f...p.............K.s~~~~~~~',
      '.....f######f...X...,...........s~~~~~~~',
      '.....ffffffff...X.......B.......s~~~~~~~',
      '.....B..,.......X.............,..s~~~~~~',
      '.T.........o.,..X.........T.o....s~~~~~~',
      '.......,.T....B.X....T.....B.,...s~~~~~~',
      '............T...X............T....s~~~~~',
      '....T...........X................,s~~~~~',
      '................X.................s~~~~~'
    ],

    spawnPoints: {
      'default':        [16, 12],  // 村口岔路（门前小路中段）
      'from-cottage':   [16, 10],  // 从小屋出来，站在门前
      'from-deepwoods': [2, 3]     // 从树林深处回来，站在林间小路上
    },

    characters: [
      { id: 'painter-demo', at: [30, 14] }
    ],

    interactables: [
      { id: 'sign-village',   type: 'dialogue',  at: [18, 11], hint: '村口木牌', dialogueId: 'dlg-sign' },
      { id: 'kite-bank',      type: 'memory',    at: [30, 17], hint: '河边的风筝', dialogueId: 'dlg-kite', memoryId: 'mem-kite', isDemo: true },
      { id: 'chest-woods',    type: 'memory',    at: [4, 2],   hint: '林中的旧木箱', dialogueId: 'dlg-chest', memoryId: 'mem-chest', isDemo: true },
      { id: 'road-faraway',   type: 'chapterMap', at: [16, 20], hint: '远方的路' },
      { id: 'door-cottage',   type: 'scene',     at: [16, 9],  hint: '推开木门', toScene: 'cottage', spawn: 'default' },
      { id: 'sign-woods',     type: 'dialogue',  at: [2, 1],   hint: '林间木牌', dialogueId: 'dlg-woodspath' },
      { id: 'path-deepwoods', type: 'scene',     at: [1, 1],   hint: '林间小路', toScene: 'deepwoods', spawn: 'default' },
      { id: 'tree-lao-huai',  type: 'memory',    at: [17, 12], hint: '村口的老槐树', dialogueId: 'dlg-lao-huai', memoryId: 'mem-lao-huai', isDemo: true },
      { id: 'night-yard',     type: 'memory',    at: [8, 14],  hint: '夏夜的晒谷场', dialogueId: 'dlg-summer-yard', memoryId: 'mem-summer-yard', isDemo: true },
      { id: 'school-road',    type: 'memory',    at: [24, 14], hint: '上学的土路', dialogueId: 'dlg-school-road', memoryId: 'mem-school-road', isDemo: true }
    ]
  },

  // -------------------------------------------------------------
  //  小屋（室内）：书桌（打开真实博客文章）、木床、书架、两块地毯
  //  地图宽 26 格 × 高 16 格。
  // -------------------------------------------------------------
  cottage: {
    id: 'cottage',
    name: '示例村庄 · 小屋内',
    indoor: true,

    map: [
      'UUUUUUUUUUUUUUUUUUUUUUUUUU',
      'U________________________U',
      'U_h______________________U',
      'U________________________U',
      'U____rrrrrr___rrrr_______U',
      'U____rrrrrr___rrrr_______U',
      'U____rrrrrr___________k__U',
      'U________________________U',
      'U________________________U',
      'U________________________U',
      'U________________________U',
      'U_b______________________U',
      'U________________________U',
      'U________________________U',
      'U________________________U',
      'UUUUUUUUUUUUUUdUUUUUUUUUUU'
    ],

    spawnPoints: {
      'default': [14, 13]   // 进门后站的位置
    },

    characters: [],

    interactables: [
      { id: 'door-village', type: 'scene',    at: [14, 15], hint: '走出小屋', toScene: 'village', spawn: 'from-cottage' },
      { id: 'desk-notes',   type: 'link',     at: [22, 6],  hint: '书桌上的笔记', dialogueId: 'dlg-desk',
        url: 'https://eaglewzw.github.io/2026/04/22/GD-Net/', linkLabel: '打开博客文章《GD-Net》' },
      { id: 'bed-rest',     type: 'dialogue', at: [2, 11],  hint: '旧木床', dialogueId: 'dlg-bed' },
      { id: 'shelf-books',  type: 'dialogue', at: [2, 2],   hint: '矮书架', dialogueId: 'dlg-shelf' }
    ]
  },

  // -------------------------------------------------------------
  //  树林深处（室外）：村庄西北密林更深处的演示场景。
  //  地图宽 30 格 × 高 20 格。大量树木 + 一条蜿蜒小径，氛围幽静。
  //  里面只有演示互动（刻字的老树、老井、野兽的足迹），以及
  //  南边出口原路返回村庄。
  // -------------------------------------------------------------
  deepwoods: {
    id: 'deepwoods',
    name: '示例村庄 · 树林深处',
    indoor: false,

    map: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TTTT.,...,TTTTTTTTTTTTTTTTTTTT',
      'TTTT..T...TTTTTTTTTTTTTTTTTTTT',
      'TTTT..p.o.TTTTTTTTTTTTTTTTTTTT',
      'TTTT..p,..TTTTTTTTTTTTTTTTTTTT',
      'TTTTT,pTTTTTTTTTTTTTTTTTTTTTTT',
      'TTTTTTpppTTTTTTTTTTTTTTTTTTTTT',
      'TTTTTTTBpTTTTTTTTTTTTTTTTTTTTT',
      'TTTTTTTTpTTTTTTT,TB.....TTTTTT',
      'TTTTTTTopppppppppppp.oo.TTTTTT',
      'TTTTTTTTT,TT#pTTTTT.,.,.TTTTTT',
      'TTTTTTTTTTTT#pTTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTBTpppTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTp,TTTTTTTTTTTTT',
      'TTTTTTTTTTTTTT,pTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTpoTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTpTTTTTTTTTTTTTT'
    ],

    spawnPoints: {
      'default': [15, 16]   // 从村庄走进来，站在这条蜿蜒小径上
    },

    characters: [],

    interactables: [
      { id: 'trail-village',     type: 'scene',    at: [15, 19], hint: '回到村庄', toScene: 'village', spawn: 'from-deepwoods' },
      { id: 'oldtree-deepwoods', type: 'dialogue', at: [6, 5],   hint: '刻字的老树', dialogueId: 'dlg-oldtree', isDemo: true },
      { id: 'well-deepwoods',    type: 'dialogue', at: [21, 12], hint: '一口老井', dialogueId: 'dlg-well', isDemo: true },
      { id: 'traces-deepwoods',  type: 'memory',   at: [12, 13], hint: '野兽的足迹', dialogueId: 'dlg-traces', memoryId: 'mem-woods', isDemo: true }
    ]
  },

  // -------------------------------------------------------------
  //  图例：字符 → 地块 / 实体 / 碰撞
  // -------------------------------------------------------------
  legend: {
    '.': { tile: 'grass' },
    ',': { tile: 'grassFlower' },
    '~': { tile: 'water',   solid: true, water: true },
    's': { tile: 'shore',   solid: true },
    'p': { tile: 'path' },
    'X': { tile: 'path' },
    '#': { tile: 'soil' },
    'R': { tile: 'roof',    solid: true },
    'W': { tile: 'wall',    solid: true },
    'O': { tile: 'window',  solid: true },
    'D': { tile: 'door' },
    '_': { tile: 'floor' },
    'U': { tile: 'iwall',   solid: true },
    'r': { tile: 'rug' },
    'd': { tile: 'door' },

    'T': { tile: 'grass', entity: 'tree',  solid: true },
    'B': { tile: 'grass', entity: 'bush',  solid: true },
    'o': { tile: 'grass', entity: 'stone', solid: true },
    'f': { tile: 'grass', entity: 'fence', solid: true },
    'L': { tile: 'path',  entity: 'lamp',  solid: true },
    'S': { tile: 'grass', entity: 'sign',  solid: true },
    'C': { tile: 'grass', entity: 'chest', solid: true },
    'K': { tile: 'grass', entity: 'kite' },
    'b': { tile: 'floor', entity: 'bed',   solid: true },
    'k': { tile: 'floor', entity: 'desk',  solid: true },
    'h': { tile: 'floor', entity: 'shelf', solid: true },
    'N': { tile: 'grass' }   // 人物由 characters 列表放置，地图上只是占位
  }
};
