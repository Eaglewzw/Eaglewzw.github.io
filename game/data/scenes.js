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
    "village": {
      "id": "village",
      "name": "示例村庄 · 村口",
      "indoor": false,
      "map": [
        "T.TT.TT.TT.T.................T....s~~~~~",
        ".pS.TT.T.TT.T..............T......s~~~~~",
        "Tpp.C.T.T.TT......,...T...........s~~~~~",
        ".TpTT.TT.T.TT......T........,..T...s~~~~",
        "T.p.TT.T..T.T........,..T.........,s~~~~",
        ".TpppT.TT.TT..........H..H.........s~~~~",
        "T.T.p.T.T.T.TRRRRRRR.....,.........s~~~~",
        ".T.TpT.T.T.T.RRRRRRR.To...........s~~~~~",
        "T.T.ppp.TT..TRRRRRRR....V.T.......s~~~~~",
        "..BTT.pT.TB..WOWDOWW..............s~II~~",
        "T.T..Tpp..TTB...p...,B..........,Ts~II~~",
        ".TBT.T..pT.TT,L.p.S..o.....B......s~~~~~",
        "T.TT..T.p.T.B...pT....,...,...,..s~~~~~~",
        "..T....Bpppppppppppppppppppppppp.s~~~~~~",
        "....,T....,....,p..,.....o.,..N..s~~~~~~",
        ".....ffffffff...po..........o...,s~~~~~~",
        "T....f######f,..p.,.....,.......s~~~~~~~",
        ".....f######f...p.............K.s~~~~~~~",
        ".....f######f...X...,...........s~~~~~~~",
        ".....ffffffff...X.......B.......s~~~~~~~",
        ".....B..,.......X.............,..s~~~~~~",
        ".T.........o.,..X.........T.o....s~~~~~~",
        ".......,.T....B.X....T.....B.,...s~~~~~~",
        "............T...X............T....s~~~~~",
        "....T...........X................,s~~~~~",
        "................X.................s~~~~~"
      ],
      "spawnPoints": {
        "default": [
          16,
          12
        ],
        "from-cottage": [
          16,
          10
        ],
        "from-deepwoods": [
          2,
          3
        ],
        "from-county": [
          16,
          23
        ]
      },
      "characters": [
        {
          "id": "painter-demo",
          "at": [
            30,
            14
          ]
        }
      ],
      "interactables": [
        {
          "id": "sign-village",
          "type": "dialogue",
          "at": [
            18,
            11
          ],
          "hint": "村口木牌",
          "dialogueId": "dlg-sign"
        },
        {
          "id": "kite-bank",
          "type": "memory",
          "at": [
            30,
            17
          ],
          "hint": "河边的风筝",
          "dialogueId": "dlg-kite",
          "memoryId": "mem-kite",
          "isDemo": true
        },
        {
          "id": "chest-woods",
          "type": "memory",
          "at": [
            4,
            2
          ],
          "hint": "林中的旧木箱",
          "dialogueId": "dlg-chest",
          "memoryId": "mem-chest",
          "isDemo": true
        },
        {
          "id": "sign-woods",
          "type": "dialogue",
          "at": [
            2,
            1
          ],
          "hint": "林间木牌",
          "dialogueId": "dlg-woodspath"
        },
        {
          "id": "tree-lao-huai",
          "type": "memory",
          "at": [
            17,
            12
          ],
          "hint": "村口的老槐树",
          "dialogueId": "dlg-lao-huai",
          "memoryId": "mem-lao-huai",
          "isDemo": true
        },
        {
          "id": "night-yard",
          "type": "memory",
          "at": [
            8,
            14
          ],
          "hint": "夏夜的晒谷场",
          "dialogueId": "dlg-summer-yard",
          "memoryId": "mem-summer-yard",
          "isDemo": true
        },
        {
          "id": "school-road",
          "type": "memory",
          "at": [
            24,
            14
          ],
          "hint": "上学的土路",
          "dialogueId": "dlg-school-road",
          "memoryId": "mem-school-road",
          "isDemo": true
        },
        {
          "id": "door-cottage",
          "type": "passage",
          "tiles": [
            [
              16,
              9
            ]
          ],
          "hint": "推开木门 · 自己的小屋",
          "to": {
            "scene": "cottage",
            "spawn": "default"
          }
        },
        {
          "id": "pass-deepwoods",
          "type": "passage",
          "tiles": [
            [
              1,
              1
            ]
          ],
          "hint": "林间小路 · 树林深处",
          "to": {
            "scene": "deepwoods",
            "spawn": "from-village"
          }
        },
        {
          "id": "road-county",
          "type": "passage",
          "tiles": [
            [
              16,
              24
            ],
            [
              16,
              25
            ]
          ],
          "hint": "沿路南下 · 县城",
          "to": {
            "scene": "county",
            "spawn": "from-village"
          },
          "chapter": "ch-02-county"
        }
      ],
      "legend": {
        "H": {
          "tile": "grass",
          "entity": "selfhouse",
          "solid": true
        },
        "V": {
          "tile": "grass",
          "entity": "store",
          "solid": true
        }
      }
    },
    "cottage": {
      "id": "cottage",
      "name": "示例村庄 · 小屋内",
      "indoor": true,
      "map": [
        "UUUUUUUUUUUUUUUUUUUUUUUUUU",
        "U________________________U",
        "U_h______________________U",
        "U________________________U",
        "U____rrrrrr___rrrr_______U",
        "U____rrrrrr___rrrr_______U",
        "U____rrrrrr___________k__U",
        "U________________________U",
        "U________________________U",
        "U________________________U",
        "U________________________U",
        "U_b______________________U",
        "U________________________U",
        "U________________________U",
        "U________________________U",
        "UUUUUUUUUUUUUUdUUUUUUUUUUU"
      ],
      "spawnPoints": {
        "default": [
          14,
          13
        ]
      },
      "characters": [],
      "interactables": [
        {
          "id": "door-village",
          "type": "passage",
          "tiles": [
            [
              14,
              15
            ]
          ],
          "hint": "走出小屋 · 村口",
          "to": {
            "scene": "village",
            "spawn": "from-cottage"
          }
        },
        {
          "id": "desk-notes",
          "type": "link",
          "at": [
            22,
            6
          ],
          "hint": "书桌上的笔记",
          "dialogueId": "dlg-desk",
          "url": "https://eaglewzw.github.io/2026/04/22/GD-Net/",
          "linkLabel": "打开博客文章《GD-Net》"
        },
        {
          "id": "bed-rest",
          "type": "dialogue",
          "at": [
            2,
            11
          ],
          "hint": "旧木床",
          "dialogueId": "dlg-bed"
        },
        {
          "id": "shelf-books",
          "type": "dialogue",
          "at": [
            2,
            2
          ],
          "hint": "矮书架",
          "dialogueId": "dlg-shelf"
        }
      ]
    },
    "deepwoods": {
      "id": "deepwoods",
      "name": "示例村庄 · 树林深处",
      "indoor": false,
      "map": [
        "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
        "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
        "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
        "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
        "TTTT.,...,TTTTTTTTTTTTTTTTTTTT",
        "TTTT..T...TTTTTTTTTTTTTTTTTTTT",
        "TTTT..p.o.TTTTTTTTTTTTTTTTTTTT",
        "TTTT..p,..TTTTTTTTTTTTTTTTTTTT",
        "TTTTT,pTTTTTTTTTTTTTTTTTTTTTTT",
        "TTTTTTpppTTTTTTTTTTTTTTTTTTTTT",
        "TTTTTTTBpTTTTTTTTTTTTTTTTTTTTT",
        "TTTTTTTTpTTTTTTT,TB.....TTTTTT",
        "TTTTTTTopppppppppppp.oo.TTTTTT",
        "TTTTTTTTT,TT#pTTTTT.,.,.TTTTTT",
        "TTTTTTTTTTTT#pTTTTTTTTTTTTTTTT",
        "TTTTTTTTTTTBTpppTTTTTTTTTTTTTT",
        "TTTTTTTTTTTTTTTp,TTTTTTTTTTTTT",
        "TTTTTTTTTTTTTT,pTTTTTTTTTTTTTT",
        "TTTTTTTTTTTTTTTpoTTTTTTTTTTTTT",
        "TTTTTTTTTTTTTTTpTTTTTTTTTTTTTT"
      ],
      "spawnPoints": {
        "default": [
          15,
          16
        ],
        "from-village": [
          15,
          17
        ]
      },
      "characters": [],
      "interactables": [
        {
          "id": "trail-village",
          "type": "passage",
          "tiles": [
            [
              15,
              19
            ]
          ],
          "hint": "南边的小路 · 村口",
          "to": {
            "scene": "village",
            "spawn": "from-deepwoods"
          }
        },
        {
          "id": "oldtree-deepwoods",
          "type": "dialogue",
          "at": [
            6,
            5
          ],
          "hint": "刻字的老树",
          "dialogueId": "dlg-oldtree",
          "isDemo": true
        },
        {
          "id": "well-deepwoods",
          "type": "dialogue",
          "at": [
            21,
            12
          ],
          "hint": "一口老井",
          "dialogueId": "dlg-well",
          "isDemo": true
        },
        {
          "id": "traces-deepwoods",
          "type": "memory",
          "at": [
            12,
            13
          ],
          "hint": "野兽的足迹",
          "dialogueId": "dlg-traces",
          "memoryId": "mem-woods",
          "isDemo": true
        }
      ]
    },
    "legend": {
      ".": {
        "tile": "grass"
      },
      ",": {
        "tile": "grassFlower"
      },
      "~": {
        "tile": "water",
        "solid": true,
        "water": true
      },
      "s": {
        "tile": "shore",
        "solid": true
      },
      "p": {
        "tile": "path"
      },
      "X": {
        "tile": "path"
      },
      "#": {
        "tile": "soil"
      },
      "R": {
        "tile": "roof",
        "solid": true
      },
      "W": {
        "tile": "wall",
        "solid": true
      },
      "O": {
        "tile": "window",
        "solid": true
      },
      "D": {
        "tile": "door"
      },
      "_": {
        "tile": "floor"
      },
      "U": {
        "tile": "iwall",
        "solid": true
      },
      "r": {
        "tile": "rug"
      },
      "d": {
        "tile": "door"
      },
      "T": {
        "tile": "grass",
        "entity": "tree",
        "solid": true
      },
      "B": {
        "tile": "grass",
        "entity": "bush",
        "solid": true
      },
      "o": {
        "tile": "grass",
        "entity": "stone",
        "solid": true
      },
      "f": {
        "tile": "grass",
        "entity": "fence",
        "solid": true
      },
      "L": {
        "tile": "path",
        "entity": "lamp",
        "solid": true
      },
      "S": {
        "tile": "grass",
        "entity": "sign",
        "solid": true
      },
      "C": {
        "tile": "grass",
        "entity": "chest",
        "solid": true
      },
      "K": {
        "tile": "grass",
        "entity": "kite"
      },
      "I": {
        "tile": "island"
      },
      "b": {
        "tile": "floor",
        "entity": "bed",
        "solid": true
      },
      "k": {
        "tile": "floor",
        "entity": "desk",
        "solid": true
      },
      "h": {
        "tile": "floor",
        "entity": "shelf",
        "solid": true
      },
      "N": {
        "tile": "grass"
      }
    },
    "county": {
      "id": "county",
      "name": "县城 · 十字街口",
      "indoor": false,
      "map": [
        "T..T..T..T..T.BT..T..T..T.aaa-aaaT..T..T..T..T..TB.T..T.",
        ".......................aaaaaa-aaaa.T..,.....T.,...T.....",
        "..wwwwwwwwwwwwwwwwwwwwwaaaaaa-aaaa..T....T.....T....T...",
        "..wyyyyyyyyyyyyyyyyyyywaaaaaa-aaaq......................",
        "..wyYyyyyyyyyyyyyyyYyywaaaaaa-aaaa........,........,....",
        "..wyyyyyyyyyyyyyyyyyyywaaaaaa-aaaq.....m.....m..........",
        "..wyyyyyyyyyMyyyyyyyyywaaaaaa-aaaa......................",
        "..wyyyyyyyyyyyyyyFyyyypaaaaaa-aaaq...T.....T.....T......",
        "..wyyyyyyyyyyyyyyyyyyypaaaaaa-aaaa......................",
        "..wyyyyyyyyyyyyyyyyyyywaataaa-aaaq......................",
        "..wyyYyyyyyyyyyyyyyyYywaaaaaa-aaaa......................",
        "..wyyyyyyyyyyyyyyyyyyywaaaaaa-aaaq...................B..",
        "..wwwwwwwwwwppgwwwwwwwwaaaaaa-aaaa..,..B................",
        "..B..........pp.,......aaaaaa-aaaq......................",
        "....T........pp........aaaaaa-aaaaaaaa..................",
        ".T.........T.pp.....,..aaaaaa-aaaaaaaa..T...T.......T...",
        "...,....m....pp........aia=======aiaSa..................",
        "..........,..ppaaaaaaaaaaa=======aaaaaaaaaaaaaaaaaaaaaaa",
        ".....,.......ppaaqaqaqaaaaaaa-aaaaaaaaaqaqacaqavaqacaqaa",
        "aaaaaaaaaaaaaaaaaaaaaaa===aaaaaaa===aaaaaaaaaaaaaaaaaaaa",
        "aaaaaaaaaaaaaaaaaaaaaaa===aaaaaaa===aaaaaaaaaaaaaaaaaaaa",
        "aaaaaaaaaaaaaaaaaaaaaaa===aaaaaaa===aaaaaaaaaaaaaaaaaaaa",
        "-----------------------===aaaaaaa===--------------------",
        "aaaaaaaaaaaaaaaaaaaaaaa===aaaaaaa===aaaaaaaaaaaaaaaaaaaa",
        "aaaaaaaaaaaaaaaaaaaaaaa===aaaaaaa===aaaaaaaaaaaaaaaaaaaa",
        "aaaaaaaaaaaaaaaaaaaaaaa===aaaaaaa===aaaaaaaaaaaaaaaaaaaa",
        ".aaaqacaqavaqacaqaqavaq...aaa-aaaaaaaqaqavaqataaqacaqava",
        ".aaaaaaaaaaaaaaaaaaaaaaaaa=======aaaaaaaaaaaaaaaaaaaaaaa",
        "...YyyyyyyyyyY.........aia=======aia....................",
        ".,.yyyyyyyyyyy.T........aaaaa-aaaa..B...................",
        "...yyyyyyyyyyy.......T..aaaaa-aaaa....T.......T.....T...",
        "..,yyyyyyyyyyy,....m....aqaaa-aaaq.......m..............",
        "...yyyyyyyyyyy..........aaaaa-aaaa...,...............,..",
        "...Yyyyyyyyyyy..T......Taaaaa-aaaa.........,...........B",
        "...........B.........,..acaaa-aaav......................",
        ".T......T...............aaaaa-aaaa....T.....T.....T.....",
        "........................aaaaa-aaaa.............,........",
        "..T...T...T...T.........aqaaa-aaaq......................",
        "........................aaaaa-aaaa......................",
        "T.T..T..T..T..T.BT..T..T..aaa-aaaT..T..T..T..TB.T..T..T."
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
        "w": {
          "tile": "brickwall",
          "solid": true
        },
        "y": {
          "tile": "yard"
        },
        "Y": {
          "tile": "yard",
          "entity": "tree",
          "solid": true
        },
        "q": {
          "tile": "asphalt",
          "entity": "shop",
          "solid": true
        },
        "c": {
          "tile": "asphalt",
          "entity": "store",
          "solid": true
        },
        "v": {
          "tile": "asphalt",
          "entity": "conv",
          "solid": true
        },
        "m": {
          "tile": "grass",
          "entity": "resident",
          "solid": true
        },
        "g": {
          "tile": "path",
          "entity": "schoolgate",
          "solid": true
        },
        "M": {
          "tile": "yard",
          "entity": "school",
          "solid": true
        },
        "F": {
          "tile": "yard",
          "entity": "office",
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
        }
      },
      "spawnPoints": {
        "default": [
          25,
          10
        ],
        "from-village": [
          29,
          2
        ],
        "from-shenzhen": [
          53,
          20
        ]
      },
      "characters": [
        {
          "id": "county-teacher-male-demo",
          "at": [
            16,
            9
          ]
        },
        {
          "id": "county-teacher-female-demo",
          "at": [
            9,
            8
          ]
        },
        {
          "id": "county-student-demo",
          "at": [
            14,
            16
          ]
        },
        {
          "id": "county-storeboss-demo",
          "at": [
            7,
            27
          ]
        }
      ],
      "interactables": [
        {
          "id": "bus-arrival",
          "type": "memory",
          "at": [
            25,
            9
          ],
          "hint": "长途汽车站牌",
          "dialogueId": "dlg-arrival",
          "memoryId": "mem-county-arrival",
          "isDemo": true
        },
        {
          "id": "tlight-corner",
          "type": "dialogue",
          "at": [
            24,
            16
          ],
          "hint": "十字路口的红绿灯",
          "dialogueId": "dlg-tlight"
        },
        {
          "id": "newsstand-rack",
          "type": "link",
          "at": [
            36,
            16
          ],
          "hint": "报刊亭的杂志架",
          "dialogueId": "dlg-newsstand",
          "url": "https://eaglewzw.github.io/2025/12/15/Drone-10k/",
          "linkLabel": "打开博客文章《Drone-10k》"
        },
        {
          "id": "stationery-window",
          "type": "dialogue",
          "at": [
            33,
            7
          ],
          "hint": "文具店的橱窗",
          "dialogueId": "dlg-stationery"
        },
        {
          "id": "noodle-aroma",
          "type": "dialogue",
          "at": [
            12,
            26
          ],
          "hint": "面馆的香气",
          "dialogueId": "dlg-noodle"
        },
        {
          "id": "store-fridge",
          "type": "dialogue",
          "at": [
            6,
            26
          ],
          "hint": "小卖部的冰柜",
          "dialogueId": "dlg-fridge"
        },
        {
          "id": "market-square",
          "type": "dialogue",
          "at": [
            8,
            30
          ],
          "hint": "集市的吆喝声",
          "dialogueId": "dlg-market"
        },
        {
          "id": "gate-bell",
          "type": "dialogue",
          "at": [
            14,
            12
          ],
          "hint": "学校大门",
          "dialogueId": "dlg-gatebell"
        },
        {
          "id": "classroom-front",
          "type": "dialogue",
          "at": [
            12,
            6
          ],
          "hint": "教学楼的教室",
          "dialogueId": "dlg-classroom"
        },
        {
          "id": "office-door",
          "type": "dialogue",
          "at": [
            17,
            7
          ],
          "hint": "老师们的办公室",
          "dialogueId": "dlg-office",
          "isDemo": true
        },
        {
          "id": "recess-yard",
          "type": "dialogue",
          "at": [
            8,
            9
          ],
          "hint": "课间的操场",
          "dialogueId": "dlg-recess"
        },
        {
          "id": "nightstudy-window",
          "type": "memory",
          "at": [
            13,
            6
          ],
          "hint": "晚自习亮着的窗",
          "dialogueId": "dlg-nightstudy",
          "memoryId": "mem-junior-years",
          "isDemo": true
        },
        {
          "id": "senior-wing",
          "type": "memory",
          "at": [
            10,
            9
          ],
          "hint": "高中部的晚自习",
          "dialogueId": "dlg-senior-wing",
          "memoryId": "mem-high-school-years",
          "isDemo": true
        },
        {
          "id": "road-village",
          "type": "passage",
          "tiles": [
            [
              29,
              0
            ],
            [
              30,
              0
            ]
          ],
          "hint": "北去的路 · 下湖源村",
          "to": {
            "scene": "village",
            "spawn": "from-county"
          }
        },
        {
          "id": "road-shenzhen",
          "type": "passage",
          "tiles": [
            [
              55,
              20
            ],
            [
              55,
              21
            ]
          ],
          "hint": "沿大道往东 · 深圳",
          "to": {
            "scene": "shenzhen",
            "spawn": "from-county"
          },
          "chapter": "ch-08-shenzhen"
        }
      ]
    },
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
  };
