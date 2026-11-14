// ===============================================================
//  内容包 · 村庄（第一章「下湖源村的童年」的记忆锚点）
//  为 village 场景补充三处童年记忆锚点的对话与占位回忆：
//    村口的老槐树 / 夏夜的晒谷场 / 上学的土路
//  这里只写有画面感的环境与占位故事，不编造真实经历——
//  每条回忆正文里都保留一句占位声明，写真实回忆时整段替换。
//
//  加载顺序：必须在 dialogues.js 与 memories.js 之后加载本文件
//  （本包用 Object.assign 合并对话、用 push 追加回忆，若在它们
//  之前加载会被整体覆盖）。
// ===============================================================
window.LIFE_DATA = window.LIFE_DATA || {};
window.LIFE_DATA.dialogues = window.LIFE_DATA.dialogues || {};
window.LIFE_DATA.memories = window.LIFE_DATA.memories || [];

Object.assign(window.LIFE_DATA.dialogues, {

  // 村口的老槐树（第一章 · 记忆锚点，读完收录回忆）
  'dlg-lao-huai': {
    nodes: [
      { text: '村口这棵老槐树，树干粗得两个人才抱得过来，树皮裂成一道道深沟。' },
      { text: '树冠把半个岔路口都罩进影子里。夏天蝉声一起，树下就坐满了摇蒲扇的人。' },
      { text: '（把老槐树下的日子记进回忆手册吧。）', end: true, memoryId: 'mem-lao-huai' }
    ]
  },

  // 夏夜的晒谷场（第一章 · 记忆锚点，读完收录回忆）
  'dlg-summer-yard': {
    nodes: [
      { text: '围栏里这块平整的空地就是晒谷场：白天摊晒谷子，夜里腾出来乘凉。' },
      { text: '天一擦黑，竹床和凉席挨挨挤挤铺开，抬头就是一整条银河。' },
      { text: '（把数星星的那个夜晚记进回忆手册吧。）', end: true, memoryId: 'mem-summer-yard' }
    ]
  },

  // 上学的土路（第一章 · 记忆锚点，读完收录回忆）
  'dlg-school-road': {
    nodes: [
      { text: '脚下这条土路出了村一直往外去。晴天一层浮土，雨天一脚泥。' },
      { text: '清晨出门时天边才刚泛亮，裤脚很快被路边的露水打湿，越走天越亮。' },
      { text: '（把走土路上学的清晨记进回忆手册吧。）', end: true, memoryId: 'mem-school-road' }
    ]
  }
});

window.LIFE_DATA.memories.push(
  // 村口的老槐树（占位故事）
  {
    id: 'mem-lao-huai',
    chapterId: 'ch-01-xiahuyuan',
    title: '村口的老槐树',
    summary: '村口岔路边一棵两人合抱的老槐树，树影罩住半个路口。',
    paragraphs: [
      '老槐树立在村口的岔路边，比围墙还高，树皮裂成一道道深沟，最低的那根枝子伸手就能够到。夏天蝉声一起，树冠把半个岔路口都罩进影子里。',
      '傍晚收工的人扛着锄头从树下过，树影被夕阳拉得老长，一直铺到对面的墙根。树下总有人坐着摇蒲扇说话——好像只要树在，村口就有人气。',
      '（这是一段占位故事——替换成你的真实童年回忆。）'
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
  // 夏夜的晒谷场（占位故事）
  {
    id: 'mem-summer-yard',
    chapterId: 'ch-01-xiahuyuan',
    title: '夏夜的晒谷场',
    summary: '晒谷场上竹床凉席挨挨挤挤铺开，躺在上面数一整条银河。',
    paragraphs: [
      '天刚擦黑，晒谷场就热闹起来：竹床、凉席、小板凳挨挨挤挤铺了一地，蒲扇拍蚊子啪嗒啪嗒响成一片，谁家的收音机在角落里小声唱。',
      '躺下来抬头看，银河横在头顶，流星偶尔划过一道就没了。数星星数到眼皮打架，大人们说话的声音越来越远，夜风带着晒了一天的谷壳味。',
      '（这是一段占位故事——替换成你的真实童年回忆。）'
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
  // 上学的土路（占位故事）
  {
    id: 'mem-school-road',
    chapterId: 'ch-01-xiahuyuan',
    title: '上学的土路',
    summary: '天刚泛亮就走上的土路，晴天一层浮土，雨天一脚泥。',
    paragraphs: [
      '上学的土路出了村一直往外去，晴天一层浮土，雨天一脚泥。清晨出门时天边才刚泛亮，路上人少，脚步声显得特别响。',
      '路边的草叶挂满露水，裤脚走不多远就湿了半截。走到坡顶回头望一眼，身后的村子一点点缩下去，再低头接着往前赶路。',
      '（这是一段占位故事——替换成你的真实童年回忆。）'
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
