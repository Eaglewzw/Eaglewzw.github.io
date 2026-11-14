// ===============================================================
//  人生地图 · 章节
//  这是「人生探索游戏」的内容数据文件之一，改这里不需要动游戏代码。
//
//  字段说明
//  ---------------------------------------------------------------
//  id          稳定的章节标识（英文小写 + 连字符）。存档按 id 记录，
//              建好后不要改，否则玩家已发现的进度会对不上。
//  title       章节名称（可随时改，不影响存档）
//  period      年份或年龄段，纯展示用。留空 '' 则界面上不显示这一行。
//  description 一两句话的章节简介。留空 '' 且章节未开放时，界面显示
//              统一的「故事待续」文案，不会编造内容。
//  status      'available'  → 已有内容，可以进入（需要 sceneId）
//              'comingSoon' → 故事待续，只展示标题，不能进入
//  sceneId     章节对应的场景 id（scenes.js 里定义）。comingSoon 时留空 ''。
//  isDemo      可选。true = 功能演示内容，界面会标「演示」徽章。
// ===============================================================
window.LIFE_DATA = window.LIFE_DATA || {};

window.LIFE_DATA.chapters = [
  // -------------------------------------------------------------
  // 示例章节：只用于展示玩法。真实人生内容请填到下面 8 个章节里。
  // -------------------------------------------------------------
  {
    id: 'demo-village',
    title: '示例场景 · 村口的午后',
    period: '功能演示',
    description: '一个用来演示玩法的原创小村庄：可以走进小屋、沿河岸散步、穿过树林、收到一段回忆。地图为艺术化示意，人物与事件均为功能演示，不是真实经历。',
    status: 'available',
    sceneId: 'village',
    isDemo: true
  },

  // -------------------------------------------------------------
  // 真实人生章节（正文待补充）
  // 等你写好一章的故事后：把 status 改为 'available'、填上 description
//  和 period、为它做一个场景（参考 scenes.js 里的 village），再把
  // sceneId 指过去即可。没写好就保持 comingSoon，游戏不会编造剧情。
  // -------------------------------------------------------------
  {
    id: 'ch-01-xiahuyuan',
    title: '下湖源村的童年',
    period: '',
    description: '',
    status: 'comingSoon',
    sceneId: ''
  },
  {
    id: 'ch-02-county',
    title: '五年级之后来到县城',
    period: '',
    description: '',
    status: 'comingSoon',
    sceneId: ''
  },
  {
    id: 'ch-03-teacher-male',
    title: '一位男老师的鼓励',
    period: '',
    description: '',
    status: 'comingSoon',
    sceneId: ''
  },
  {
    id: 'ch-04-junior-high',
    title: '初中三年',
    period: '',
    description: '',
    status: 'comingSoon',
    sceneId: ''
  },
  {
    id: 'ch-05-teacher-female',
    title: '一位女老师的支持与中考',
    period: '',
    description: '',
    status: 'comingSoon',
    sceneId: ''
  },
  {
    id: 'ch-06-high-school',
    title: '高中生活',
    period: '',
    description: '',
    status: 'comingSoon',
    sceneId: ''
  },
  {
    id: 'ch-07-later',
    title: '后来的经历',
    period: '',
    description: '',
    status: 'comingSoon',
    sceneId: ''
  },
  {
    id: 'ch-08-shenzhen',
    title: '在深圳工作',
    period: '',
    description: '',
    status: 'comingSoon',
    sceneId: ''
  }
];
