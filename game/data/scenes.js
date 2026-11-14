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
  //  地图宽 31 格 × 高 22 格（每格 16px → 496×352 逻辑像素）。
  //  右侧 s~~~~~~ 为河岸与河水；中上 RRR/WOWDOWW 是小屋立面。
  // -------------------------------------------------------------
  village: {
    id: 'village',
    name: '示例村庄 · 村口',
    indoor: false,

    map: [
      'T.T.T.T..T...T..T.......s~~~~~~',
      '..T..T..T.....,.....,...s~~~~~~',
      '...T..T..T..............s~~~~~~',
      '.T..C..T....T...........s~~~~~~',
      '.T......T..T.....,......s~~~~~~',
      '..T..T....T....T........s~~~~~~',
      '...T.....B......T.......s~~~~~~',
      '.........RRRRRRR........s~~~~~~',
      '.........RRRRRRR........s~~~~~~',
      '.........RRRRRRR........s~~~~~~',
      '.........WOWDOWW........s~~~~~~',
      '........L...p..,........s~~~~~~',
      '............p.S..o......s~~~~~~',
      '............ppppppppppppp~~~~~~',
      '............p....,...N..s~~~~~~',
      '............p..ff.fff...s~~~~~~',
      '............p..f####f..Ks~~~~~~',
      '............p..f####f...s~~~~~~',
      '............p..ffffff...s~~~~~~',
      '............p.B....,....s~~~~~~',
      '............X....o......s~~~~~~',
      '...T........X......T....s~~~~~~'
    ],

    spawnPoints: {
      'default':       [12, 13],  // 村口岔路
      'from-cottage':  [12, 11]   // 从小屋出来，站在门前
    },

    characters: [
      { id: 'painter-demo', at: [22, 14] }
    ],

    interactables: [
      { id: 'sign-village',  type: 'dialogue',  at: [14, 12], hint: '村口木牌', dialogueId: 'dlg-sign' },
      { id: 'kite-bank',     type: 'memory',    at: [23, 16], hint: '河边的风筝', dialogueId: 'dlg-kite', memoryId: 'mem-kite', isDemo: true },
      { id: 'chest-woods',   type: 'memory',    at: [4, 3],   hint: '林中的旧木箱', dialogueId: 'dlg-chest', memoryId: 'mem-chest', isDemo: true },
      { id: 'road-faraway',  type: 'chapterMap', at: [12, 20], hint: '远方的路' },
      { id: 'door-cottage',  type: 'scene',     at: [12, 10], hint: '推开木门', toScene: 'cottage', spawn: 'default' }
    ]
  },

  // -------------------------------------------------------------
  //  小屋（室内）：书桌（打开真实博客文章）、木床、书架
  //  地图宽 14 格 × 高 11 格。
  // -------------------------------------------------------------
  cottage: {
    id: 'cottage',
    name: '示例村庄 · 小屋内',
    indoor: true,

    map: [
      'UUUUUUUUUUUUUU',
      'U____________U',
      'U_h__________U',
      'U____________U',
      'U__rrrr______U',
      'U__rrrr____k_U',
      'U__rrrr______U',
      'U____________U',
      'U_b__________U',
      'U____________U',
      'UUUUUUUdUUUUUU'
    ],

    spawnPoints: {
      'default': [7, 8]   // 进门后站的位置
    },

    characters: [],

    interactables: [
      { id: 'door-village', type: 'scene',    at: [7, 10],  hint: '走出小屋', toScene: 'village', spawn: 'from-cottage' },
      { id: 'desk-notes',   type: 'link',     at: [11, 5],  hint: '书桌上的笔记', dialogueId: 'dlg-desk',
        url: 'https://eaglewzw.github.io/2026/04/22/GD-Net/', linkLabel: '打开博客文章《GD-Net》' },
      { id: 'bed-rest',     type: 'dialogue', at: [2, 8],   hint: '旧木床', dialogueId: 'dlg-bed' },
      { id: 'shelf-books',  type: 'dialogue', at: [2, 2],   hint: '矮书架', dialogueId: 'dlg-shelf' }
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
