// ===============================================================
//  回忆（回忆手册的内容）
//  字段说明
//  ---------------------------------------------------------------
//  id          稳定标识（存档用它，建好后不要改）
//  chapterId   所属章节（chapters.js 的 id）
//  title       回忆标题
//  summary     手册列表里的一句简述
//  paragraphs  正文，一段一个字符串。空数组 = 详情里显示占位文案
//  dateLabel   时间描述（如「1998 年夏天」）。留空 '' 则不显示
//  people      相关人物名字数组。留空 [] 则不显示
//  images      可选图片路径数组（如 '/images/xxx.jpg'）。
//              留空 [] 则不显示；路径失效时该图自动跳过
//  links       相关链接数组：{ label, url }。url 用博客真实地址
//  status      'published' → 出现在游戏里
//              'draft'     → 草稿，绝不出现在公开游戏中
//  isDemo      true = 功能演示内容，界面标「演示」徽章
// ===============================================================
window.LIFE_DATA = window.LIFE_DATA || {};

window.LIFE_DATA.memories = [
  // -------------------------------------------------------------
  //  演示回忆（isDemo: true）。风格与结构就是真实回忆的模板。
  // -------------------------------------------------------------
  {
    id: 'mem-kite',
    chapterId: 'demo-village',
    title: '河边的风筝',
    summary: '一只斜插在草坡上的旧风筝，尾巴还系着半截线。',
    paragraphs: [
      '风筝是竹骨的，糊纸的地方补过两回。',
      '（这一段是演示文案：写清那天是谁、在哪儿、发生了什么、后来它去了哪儿。真实回忆请直接替换这段话。）'
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
    id: 'mem-chest',
    chapterId: 'demo-village',
    title: '林中的旧木箱',
    summary: '树林深处一只漆面开裂的木箱，装着整理到一半的旧物。',
    paragraphs: [
      '箱盖打开时会发出很轻的一声吱呀。',
      '（演示文案：这里可以写箱子里具体有什么、为什么留着、现在还在不在。）'
    ],
    dateLabel: '',
    people: [],
    images: [],
    links: [
      { label: '项目：自主拦截无人机（GitHub）', url: 'https://github.com/Eaglewzw/Autonomous-Intercept-Drone' }
    ],
    status: 'published',
    isDemo: true
  },
  {
    id: 'mem-portrait',
    chapterId: 'demo-village',
    title: '老周的速写本',
    summary: '河边画画的老人把这条河画了十几年，总说画不像。',
    paragraphs: [
      '（演示文案：与演示人物「老周」相关的一段回忆示例。people 字段里填入相关人物的名字，手册详情里会显示。）'
    ],
    dateLabel: '',
    people: ['老周（演示人物）'],
    images: [],
    links: [
      { label: '博客文章《ESP-Net》', url: 'https://eaglewzw.github.io/2026/04/22/ESP-Net/' }
    ],
    status: 'published',
    isDemo: true
  },
  {
    id: 'mem-woods',
    chapterId: 'demo-village',
    title: '树林深处的脚印',
    summary: '幽静密林的一块软泥上，留着一串比手掌还大的野兽脚印。',
    paragraphs: [
      '脚印陷进软泥里很深，前后间距拉得很开，像是有大型野兽在深夜匆匆路过，天亮前就离开了。',
      '（演示文案：这里可以写那天听到了什么声响、为什么没有追上去、后来这片林子又发生了什么。真实回忆请直接替换这段话。）'
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

  // -------------------------------------------------------------
  //  草稿示例：status 为 draft 的回忆【不会】出现在公开游戏里。
  //  留在这里只是演示草稿机制；写真实回忆时直接照着上面的结构加。
  // -------------------------------------------------------------
  {
    id: 'mem-draft-example',
    chapterId: 'demo-village',
    title: '（草稿示例）还没想好怎么写的那个下午',
    summary: '这条是草稿，游戏里看不到——所以你现在也没看到。',
    paragraphs: [
      '如果你能在游戏里读到这句话，说明草稿过滤失效了，请告诉我。'
    ],
    dateLabel: '',
    people: [],
    images: [],
    links: [],
    status: 'draft',
    isDemo: true
  }
];
