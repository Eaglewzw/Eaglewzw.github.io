// ===============================================================
//  PixelArt —— 程序化原创像素素材
//  所有瓦片、物件、人物都在启动时用代码逐像素画出来：
//  · 100% 原创，不引用任何第三方图片素材（无版权风险）
//  · 分辨率统一：逻辑像素 16×16，其余尺寸都是 16 的整数倍对齐
//  · 色板统一（下面的 P），保证画面像一套手绘素材而不是拼贴
//  素材只在启动时生成一次，之后按需缓存，体积为 0 字节图片。
// ===============================================================
window.PixelArt = (function () {
  'use strict';

  const TILE = 16;

  // —— 统一色板（温暖乡村风，原创配色） ——
  const P = {
    outline: '#2e2417',
    grassA: '#7cb85f', grassB: '#8cc76e', grassC: '#6aa752', grassD: '#5c9247',
    flowerW: '#f6f2df', flowerY: '#f0cf5e', flowerP: '#e2a0c4',
    path: '#d6b98a', pathD: '#c3a171', pathL: '#e5cd9d',
    waterA: '#5493d6', waterB: '#4383c8', waterC: '#74b3e8', foam: '#e3f0fa',
    soil: '#a97c50', soilD: '#936740', sprout: '#8cbc66',
    roof: '#bd6046', roofD: '#a34f38', roofL: '#cf7c5a',
    wall: '#f1e4c1', wallD: '#dccca3', timber: '#8a5a3b',
    doorWood: '#8a5a3b', doorD: '#6f4629', glass: '#f7e9b0',
    floor: '#c8a26e', floorD: '#b18c5c', floorL: '#d9b782',
    iwall: '#94805f', iwallD: '#7f6c4c',
    rug: '#c25f4a', rugD: '#aa4e3a', rugB: '#ecdcae',
    stoneA: '#aaa695', stoneD: '#8d897b',
    leafA: '#4e8f3e', leafB: '#61a14c', leafC: '#3e7c33',
    trunk: '#7f5433', trunkD: '#6a4428',
    metal: '#cbc4b6',
    skin: '#f0c397', skinD: '#d9a67c',
    hairBrown: '#5a4632', hairGrey: '#b9b3a4',
    shirtCream: '#e9e3d3', shirtBlue: '#6a89b5', pants: '#4a5568',
    kiteA: '#d9834b', kiteB: '#e8b25e', kiteC: '#b8643a',
    bedCover: '#6a89b5', pillow: '#f3efe2',
    berry: '#d05a4e',
    paper: '#f7f2e0',
    bookA: '#b95f45', bookB: '#5480a8', bookC: '#d3a545',
    beret: '#a8433a'
  };

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return [c, g];
  }

  // 小工具：带描边的实心矩形（像素画的基础形状）
  function rectO(g, x, y, w, h, fill) {
    g.fillStyle = P.outline;
    g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = fill;
    g.fillRect(x, y, w, h);
  }

  function px(g, x, y, color) { g.fillStyle = color; g.fillRect(x, y, 1, 1); }

  // 确定性伪随机（同一瓦片每次生成完全一致）
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function circle(g, cx, cy, r, color) {
    g.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y) + 0.5);
      g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  }

  // ------------------------------------------------------------
  //  地面瓦片
  // ------------------------------------------------------------
  function tileGrass(seed, flowers) {
    const [c, g] = makeCanvas(TILE, TILE);
    const rnd = mulberry32(seed);
    g.fillStyle = P.grassA; g.fillRect(0, 0, TILE, TILE);
    for (let i = 0; i < 12; i++) px(g, (rnd() * TILE) | 0, (rnd() * TILE) | 0, rnd() < 0.5 ? P.grassB : P.grassC);
    for (let i = 0; i < 4; i++) {
      const x = (rnd() * TILE) | 0, y = 2 + ((rnd() * 12) | 0);
      g.fillStyle = P.grassD;
      g.fillRect(x, y, 1, 2);
    }
    if (flowers) {
      const spots = [[3, 3, P.flowerW], [11, 6, P.flowerY], [6, 12, P.flowerP], [13, 12, P.flowerW]];
      for (const [x, y, col] of spots) {
        px(g, x, y, col); px(g, x + 1, y, col); px(g, x, y + 1, col); px(g, x + 1, y + 1, col);
        px(g, x, y, P.outline === col ? col : col); // 花心
        px(g, x, y, (x + y) % 2 ? P.flowerY : P.flowerW);
      }
    }
    return c;
  }

  function tilePath(seed) {
    const [c, g] = makeCanvas(TILE, TILE);
    const rnd = mulberry32(seed);
    g.fillStyle = P.path; g.fillRect(0, 0, TILE, TILE);
    for (let i = 0; i < 10; i++) px(g, (rnd() * TILE) | 0, (rnd() * TILE) | 0, rnd() < 0.55 ? P.pathD : P.pathL);
    for (let i = 0; i < 3; i++) {
      const x = (rnd() * 14) | 0, y = (rnd() * 14) | 0;
      g.fillStyle = P.pathD; g.fillRect(x, y, 2, 1);
    }
    return c;
  }

  function tileWater(frame) {
    const [c, g] = makeCanvas(TILE, TILE);
    const rnd = mulberry32(1000 + frame);
    g.fillStyle = P.waterB; g.fillRect(0, 0, TILE, TILE);
    // 深色底纹
    for (let i = 0; i < 8; i++) px(g, (rnd() * TILE) | 0, (rnd() * TILE) | 0, P.waterA);
    // 波光：三条横线，每帧横向错位
    const rows = [3, 8, 13];
    for (let i = 0; i < rows.length; i++) {
      const y = rows[i];
      const off = (frame * 3 + i * 5) % TILE;
      for (let k = 0; k < 3; k++) {
        const x = (off + k * 6) % TILE;
        g.fillStyle = P.waterC;
        g.fillRect(x, y, 3, 1);
        if (frame % 2) g.fillRect((x + 8) % TILE, y, 2, 1);
      }
    }
    // 偶尔的小浪花点
    px(g, (frame * 5 + 2) % TILE, 5 + (frame % 3) * 3, P.foam);
    px(g, (frame * 7 + 9) % TILE, 11 - (frame % 2) * 3, P.foam);
    return c;
  }

  function tileShore() {
    const [c, g] = makeCanvas(TILE, TILE);
    // 左侧草地
    const grass = tileGrass(77);
    g.drawImage(grass, 0, 0);
    // 右侧水面（静态帧）
    g.fillStyle = P.waterB; g.fillRect(10, 0, 6, TILE);
    g.fillStyle = P.waterA; g.fillRect(12, 3, 2, 1); g.fillRect(13, 9, 2, 1);
    // 泡沫边界
    g.fillStyle = P.foam;
    g.fillRect(10, 0, 1, TILE);
    px(g, 11, 2, P.foam); px(g, 11, 7, P.foam); px(g, 11, 12, P.foam);
    // 岸边沙粒
    px(g, 9, 5, P.path); px(g, 9, 11, P.path);
    return c;
  }

  function tileSoil(seed) {
    const [c, g] = makeCanvas(TILE, TILE);
    const rnd = mulberry32(seed);
    g.fillStyle = P.soil; g.fillRect(0, 0, TILE, TILE);
    for (let y = 1; y < TILE; y += 4) { g.fillStyle = P.soilD; g.fillRect(0, y, TILE, 1); }
    for (let i = 0; i < 5; i++) px(g, (rnd() * TILE) | 0, (rnd() * TILE) | 0, P.sprout);
    return c;
  }

  function tileRoof() {
    const [c, g] = makeCanvas(TILE, TILE);
    g.fillStyle = P.roof; g.fillRect(0, 0, TILE, TILE);
    g.fillStyle = P.roofD;
    for (let y = 2; y < TILE; y += 4) g.fillRect(0, y, TILE, 2);
    // 交错瓦缝
    g.fillStyle = P.roofD;
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 4 : 0;
      for (let x = off; x < TILE; x += 8) g.fillRect(x, row * 4, 1, 4);
    }
    g.fillStyle = P.roofL; g.fillRect(0, 0, TILE, 1);
    return c;
  }

  function tileWall() {
    const [c, g] = makeCanvas(TILE, TILE);
    g.fillStyle = P.wall; g.fillRect(0, 0, TILE, TILE);
    g.fillStyle = P.timber;
    g.fillRect(0, 0, 2, TILE); g.fillRect(14, 0, 2, TILE);
    g.fillStyle = P.wallD; g.fillRect(2, 1, 12, 1); g.fillRect(2, 13, 12, 1);
    return c;
  }

  function tileWindow() {
    const [c, g] = makeCanvas(TILE, TILE);
    g.drawImage(tileWall(), 0, 0);
    rectO(g, 4, 4, 8, 8, P.glass);
    g.fillStyle = P.timber;
    g.fillRect(7, 4, 1, 8); g.fillRect(4, 7, 8, 1);
    px(g, 5, 5, '#fff8dd');
    return c;
  }

  function tileDoor() {
    const [c, g] = makeCanvas(TILE, TILE);
    g.drawImage(tileWall(), 0, 0);
    rectO(g, 3, 2, 10, 14, P.doorWood);
    g.fillStyle = P.doorD;
    g.fillRect(4, 3, 8, 1); g.fillRect(4, 8, 8, 1); g.fillRect(4, 13, 8, 1);
    g.fillRect(7, 3, 1, 13);
    px(g, 10, 9, P.metal);
    return c;
  }

  function tileFloor() {
    const [c, g] = makeCanvas(TILE, TILE);
    g.fillStyle = P.floor; g.fillRect(0, 0, TILE, TILE);
    g.fillStyle = P.floorD;
    for (let y = 3; y < TILE; y += 5) g.fillRect(0, y, TILE, 1);
    g.fillRect(4, 0, 1, 3); g.fillRect(11, 4, 1, 5); g.fillRect(6, 9, 1, 3);
    px(g, 2, 2, P.floorL); px(g, 13, 12, P.floorL);
    return c;
  }

  function tileIWall() {
    const [c, g] = makeCanvas(TILE, TILE);
    g.fillStyle = P.iwall; g.fillRect(0, 0, TILE, TILE);
    g.fillStyle = P.iwallD;
    for (let i = 0; i < 6; i++) px(g, (i * 5 + 2) % TILE, 4 + (i % 3) * 4, P.iwallD);
    g.fillRect(0, 12, TILE, 2);
    g.fillStyle = P.timber; g.fillRect(0, 14, TILE, 2);
    return c;
  }

  function tileRug() {
    const [c, g] = makeCanvas(TILE, TILE);
    g.fillStyle = P.rug; g.fillRect(0, 0, TILE, TILE);
    g.fillStyle = P.rugD;
    for (let y = 2; y < TILE; y += 4) for (let x = 2; x < TILE; x += 4) g.fillRect(x, y, 2, 2);
    return c;
  }

  // ------------------------------------------------------------
  //  物件实体（宽高都是 16 的倍数区域，底部为立足线）
  // ------------------------------------------------------------
  function entTree(variant) {
    const [c, g] = makeCanvas(24, 32);
    const rnd = mulberry32(500 + variant * 91);
    // 树干
    rectO(g, 9, 22, 6, 9, P.trunk);
    g.fillStyle = P.trunkD; g.fillRect(11, 23, 1, 7);
    // 树冠（大圆 + 错落小圆 + 亮点）
    circle(g, 12, 12, 9, P.leafC);
    circle(g, 12, 11, 8, P.leafA);
    circle(g, 7, 14, 5, P.leafA);
    circle(g, 17, 14, 5, P.leafA);
    circle(g, 12, 7, 5, P.leafB);
    for (let i = 0; i < 8; i++) {
      const x = 4 + ((rnd() * 16) | 0), y = 4 + ((rnd() * 12) | 0);
      px(g, x, y, rnd() < 0.5 ? P.leafB : P.leafC);
    }
    // 树底投影提示（贴地一圈深绿）
    g.fillStyle = P.leafC; g.fillRect(5, 30, 14, 1);
    return c;
  }

  function entBush() {
    const [c, g] = makeCanvas(16, 14);
    circle(g, 8, 8, 6, P.leafC);
    circle(g, 8, 7, 5, P.leafA);
    circle(g, 5, 6, 3, P.leafB);
    px(g, 11, 6, P.berry); px(g, 6, 10, P.berry); px(g, 12, 10, P.berry);
    g.fillStyle = P.leafC; g.fillRect(3, 12, 10, 1);
    return c;
  }

  function entStone() {
    const [c, g] = makeCanvas(14, 10);
    rectO(g, 2, 3, 10, 6, P.stoneA);
    g.fillStyle = P.stoneD;
    g.fillRect(3, 7, 8, 1); g.fillRect(10, 4, 1, 3);
    px(g, 4, 4, '#c2beb0');
    return c;
  }

  function entFence() {
    const [c, g] = makeCanvas(16, 16);
    rectO(g, 2, 5, 3, 10, P.woodL || '#b98a5e');
    rectO(g, 11, 5, 3, 10, '#b98a5e');
    g.fillStyle = P.trunk;
    g.fillRect(0, 6, 16, 2); g.fillRect(0, 10, 16, 2);
    g.fillStyle = P.trunkD;
    g.fillRect(0, 8, 16, 1); g.fillRect(2, 5, 1, 10); g.fillRect(12, 5, 1, 10);
    return c;
  }

  function entLamp() {
    const [c, g] = makeCanvas(12, 26);
    rectO(g, 4, 8, 3, 17, '#6e6a60');
    g.fillStyle = '#5a564e'; g.fillRect(4, 8, 1, 17);
    rectO(g, 2, 2, 8, 7, P.glass);
    g.fillStyle = '#6e6a60';
    g.fillRect(2, 2, 8, 1); g.fillRect(1, 0, 10, 2);
    px(g, 4, 4, '#fff6cf'); px(g, 6, 6, '#fff6cf');
    g.fillStyle = '#5a564e'; g.fillRect(2, 24, 7, 2);
    return c;
  }

  function entSign() {
    const [c, g] = makeCanvas(18, 18);
    rectO(g, 7, 9, 4, 8, P.trunk);
    rectO(g, 1, 2, 16, 8, '#b98a5e');
    g.fillStyle = P.trunkD;
    g.fillRect(2, 3, 14, 1); g.fillRect(2, 8, 14, 1);
    g.fillStyle = P.outline;
    g.fillRect(4, 5, 8, 1); g.fillRect(4, 7, 5, 1);
    return c;
  }

  function entChest() {
    const [c, g] = makeCanvas(16, 13);
    rectO(g, 1, 3, 14, 9, P.trunk);
    g.fillStyle = P.trunkD;
    g.fillRect(1, 6, 14, 1);
    g.fillStyle = '#b98a5e'; g.fillRect(2, 4, 12, 2);
    g.fillStyle = P.metal;
    g.fillRect(7, 5, 2, 4);
    px(g, 7, 8, P.outline); px(g, 8, 8, P.outline);
    return c;
  }

  function entKite() {
    const [c, g] = makeCanvas(16, 15);
    // 斜放的风筝（菱形压在草地上）
    g.fillStyle = P.kiteA;
    g.fillRect(5, 2, 6, 2); g.fillRect(3, 4, 10, 3); g.fillRect(5, 7, 6, 2);
    g.fillStyle = P.kiteB; g.fillRect(5, 4, 6, 1); g.fillRect(6, 2, 2, 2);
    g.fillStyle = P.kiteC; g.fillRect(3, 6, 4, 1);
    // 骨架
    g.fillStyle = P.trunkD;
    g.fillRect(7, 2, 1, 7); g.fillRect(3, 5, 10, 1);
    // 尾巴和线
    g.fillStyle = P.trunkD;
    g.fillRect(8, 9, 2, 1); g.fillRect(10, 11, 2, 1); g.fillRect(12, 13, 2, 1);
    px(g, 9, 10, P.kiteB); px(g, 11, 12, P.kiteB);
    return c;
  }

  function entBed() {
    const [c, g] = makeCanvas(16, 26);
    rectO(g, 1, 0, 14, 25, P.trunk);
    g.fillStyle = '#b98a5e'; g.fillRect(2, 1, 12, 3);
    g.fillStyle = P.pillow; g.fillRect(2, 4, 12, 6);
    g.fillStyle = P.bedCover; g.fillRect(2, 10, 12, 14);
    g.fillStyle = '#5c78a5'; g.fillRect(2, 18, 12, 1); g.fillRect(2, 23, 12, 1);
    px(g, 4, 12, '#7f9cc7'); px(g, 11, 21, '#7f9cc7');
    return c;
  }

  function entDesk() {
    const [c, g] = makeCanvas(22, 16);
    rectO(g, 0, 0, 22, 6, '#b98a5e');
    g.fillStyle = P.trunkD; g.fillRect(0, 5, 22, 1);
    rectO(g, 2, 6, 3, 9, P.trunk);
    rectO(g, 17, 6, 3, 9, P.trunk);
    // 摊开的笔记
    rectO(g, 6, 1, 9, 4, P.paper);
    g.fillStyle = '#8a8578';
    g.fillRect(7, 2, 7, 1); g.fillRect(7, 3, 5, 1);
    // 小书堆
    rectO(g, 15, 1, 5, 2, P.bookB);
    return c;
  }

  function entShelf() {
    const [c, g] = makeCanvas(16, 20);
    rectO(g, 0, 0, 16, 20, P.trunk);
    g.fillStyle = '#6a4428';
    g.fillRect(1, 9, 14, 2); g.fillRect(1, 17, 14, 2);
    // 两层书
    const books = [[P.bookA, 2, 3], [P.bookB, 5, 2], [P.bookC, 7, 3], [P.bookA, 10, 2]];
    for (const [col, x, w] of books) { g.fillStyle = col; g.fillRect(x, 3, w, 6); }
    const books2 = [[P.bookC, 3, 2], [P.bookA, 5, 3], [P.bookB, 9, 3], [P.bookC, 12, 2]];
    for (const [col, x, w] of books2) { g.fillStyle = col; g.fillRect(x, 11, w, 6); }
    return c;
  }

  // ------------------------------------------------------------
  //  人物（玩家 / NPC 共用骨架）
  //  dir: down | up | left | right ；frame: 0 待机 1/2 走路
  // ------------------------------------------------------------
  function drawPerson(opts) {
    const [c, g] = makeCanvas(16, 20);
    const { hair, shirt, pants, dir, frame, hat, palette } = opts;
    const O = P.outline;

    // 头（含描边）
    rectO(g, 4, 1, 8, 7, P.skin);
    // 头发
    g.fillStyle = hair;
    if (dir === 'up') { g.fillRect(4, 1, 8, 6); }
    else if (dir === 'down') { g.fillRect(4, 1, 8, 3); g.fillRect(4, 4, 1, 2); g.fillRect(11, 4, 1, 2); }
    else { g.fillRect(4, 1, 8, 3); g.fillRect(dir === 'left' ? 8 : 4, 4, 4, 2); }
    // 帽子（老周画家帽）
    if (hat) { rectO(g, 3, 0, 10, 3, hat); g.fillStyle = hat; g.fillRect(3, 3, 6, 1); }
    // 眼睛
    if (dir === 'down') { px(g, 6, 5, O); px(g, 9, 5, O); }
    else if (dir === 'left') { px(g, 5, 5, O); }
    else if (dir === 'right') { px(g, 10, 5, O); }

    // 身体
    rectO(g, 4, 8, 8, 6, shirt);
    g.fillStyle = 'rgba(46,36,23,.25)';
    g.fillRect(4, 13, 8, 1);

    // 手臂（走路时前后摆）
    const swing = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    if (dir === 'left' || dir === 'right') {
      const ax = dir === 'left' ? 3 : 11;
      rectO(g, ax, 9, 3, 4, shirt);
      g.fillStyle = P.skin; g.fillRect(ax + (dir === 'left' ? -1 : 2) + swing, 12, 2, 2);
      if (palette) { // 老周手里的调色盘
        rectO(g, dir === 'left' ? 0 : 11, 12, 5, 4, '#b98a5e');
        px(g, dir === 'left' ? 1 : 12, 13, P.berry); px(g, dir === 'left' ? 3 : 14, 14, P.bookB);
      }
    } else {
      rectO(g, 2, 9 + (swing > 0 ? 1 : 0), 2, 4, shirt);
      rectO(g, 12, 9 + (swing < 0 ? 1 : 0), 2, 4, shirt);
      g.fillStyle = P.skin;
      g.fillRect(2, 12 + (swing > 0 ? 1 : 0), 2, 2);
      g.fillRect(12, 12 + (swing < 0 ? 1 : 0), 2, 2);
    }

    // 腿与脚
    if (dir === 'left' || dir === 'right') {
      const stepA = frame === 1, stepB = frame === 2;
      rectO(g, 4, 14, 3, stepA ? 4 : 5, pants);
      rectO(g, 9, 14, 3, stepB ? 4 : 5, pants);
      g.fillStyle = O;
      g.fillRect(3, stepA ? 17 : 18, 4, 1);
      g.fillRect(9, stepB ? 17 : 18, 4, 1);
    } else {
      const lA = frame === 1 ? 4 : 5, lB = frame === 2 ? 4 : 5;
      rectO(g, 4, 14, 3, lA, pants);
      rectO(g, 9, 14, 3, lB, pants);
      g.fillStyle = O;
      g.fillRect(4, 14 + lA, 3, 1);
      g.fillRect(9, 14 + lB, 3, 1);
    }
    return c;
  }


  // =============================================================
  //  建筑素材库（村落 / 县城 / 城市内容包共用）
  //  全部程序化原创像素，风格与上面色板一致
  // =============================================================

  function tileAsphalt() {
    const [c, g] = makeCanvas(TILE, TILE);
    const rnd = mulberry32(88);
    g.fillStyle = '#585c60'; g.fillRect(0, 0, TILE, TILE);
    for (let i = 0; i < 8; i++) px(g, (rnd() * TILE) | 0, (rnd() * TILE) | 0, rnd() < 0.5 ? '#4c5054' : '#666a6e');
    return c;
  }

  function tileRoadline() {
    const [c, g] = makeCanvas(TILE, TILE);
    g.drawImage(tileAsphalt(), 0, 0);
    g.fillStyle = '#e8d34e';
    g.fillRect(7, 2, 2, 6);
    return c;
  }

  function tileCrosswalk() {
    const [c, g] = makeCanvas(TILE, TILE);
    g.drawImage(tileAsphalt(), 0, 0);
    g.fillStyle = '#e6e3da';
    for (let x = 1; x < TILE; x += 5) g.fillRect(x, 1, 3, TILE - 2);
    return c;
  }

  function tileBrickwall() {
    const [c, g] = makeCanvas(TILE, TILE);
    g.fillStyle = '#a55a42'; g.fillRect(0, 0, TILE, TILE);
    g.fillStyle = '#8e4a35';
    for (let y = 3; y < TILE; y += 4) g.fillRect(0, y, TILE, 1);
    for (let y = 0; y < TILE; y += 4) {
      const off = (y / 4) % 2 ? 4 : 0;
      for (let x = off; x < TILE; x += 8) g.fillRect(x, y, 1, 4);
    }
    g.fillStyle = '#b5674d';
    for (let i = 0; i < 5; i++) px(g, (i * 5 + 2) % TILE, (i * 3 + 1) % TILE, '#b5674d');
    return c;
  }

  function tileYard() {
    const [c, g] = makeCanvas(TILE, TILE);
    const rnd = mulberry32(66);
    g.fillStyle = '#c9c2b0'; g.fillRect(0, 0, TILE, TILE);
    for (let i = 0; i < 6; i++) px(g, (rnd() * TILE) | 0, (rnd() * TILE) | 0, '#bab3a0');
    g.fillStyle = '#b5ae9c'; g.fillRect(0, 7, TILE, 1); g.fillRect(9, 0, 1, TILE);
    return c;
  }

  function tileIsland() { // 河心小岛：泡沫岸线 + 草地中心（2×2 拼出一座小花岛）
    const [c, g] = makeCanvas(TILE, TILE);
    g.fillStyle = P.waterB; g.fillRect(0, 0, TILE, TILE);
    g.fillStyle = P.foam;
    g.fillRect(0, 0, TILE, 2); g.fillRect(0, 14, TILE, 2);
    g.fillRect(0, 0, 2, TILE); g.fillRect(14, 0, 2, TILE);
    g.fillStyle = P.grassA; g.fillRect(3, 3, 10, 10);
    g.fillStyle = P.grassC; g.fillRect(3, 3, 10, 1); g.fillRect(3, 3, 1, 10);
    g.fillStyle = P.grassB;
    g.fillRect(5, 6, 3, 1); g.fillRect(8, 9, 2, 1); px(g, 6, 11, P.grassD);
    return c;
  }

  function tileBridge() {
    const [c, g] = makeCanvas(TILE, TILE);
    g.fillStyle = P.waterB; g.fillRect(0, 0, TILE, TILE);
    g.fillStyle = '#8a6a48'; g.fillRect(0, 2, TILE, 12);
    g.fillStyle = '#75563a';
    for (let x = 1; x < TILE; x += 4) g.fillRect(x, 2, 1, 12);
    g.fillStyle = '#9a7a55'; g.fillRect(0, 2, TILE, 1); g.fillRect(0, 13, TILE, 1);
    return c;
  }

  function winRow(g, x, y, w, n, gw) { // 一排窗
    for (let i = 0; i < n; i++) {
      rectO(g, x + i * (gw + 2), y, gw, 6, P.glass);
      g.fillStyle = P.timber; g.fillRect(x + i * (gw + 2) + gw / 2 - 1, y, 1, 6);
    }
  }

  function entSelfhouse() { // 村落自建房 24×28
    const [c, g] = makeCanvas(24, 28);
    g.fillStyle = '#b5674d'; g.fillRect(1, 6, 22, 21);
    g.fillStyle = '#9d563e';
    for (let y = 9; y < 27; y += 4) g.fillRect(1, y, 22, 1);
    g.fillStyle = '#8a4436'; g.fillRect(0, 4, 24, 3);
    g.fillStyle = '#a3563f'; g.fillRect(0, 4, 24, 1);
    rectO(g, 3, 11, 6, 6, P.glass);
    g.fillStyle = P.timber; g.fillRect(5, 11, 1, 6); g.fillRect(3, 13, 6, 1);
    rectO(g, 15, 11, 6, 6, P.glass);
    g.fillStyle = P.timber; g.fillRect(17, 11, 1, 6); g.fillRect(15, 13, 6, 1);
    rectO(g, 9, 20, 7, 7, P.doorWood);
    px(g, 14, 23, P.metal);
    return c;
  }

  function entResident() { // 居民楼 28×46
    const [c, g] = makeCanvas(28, 46);
    g.fillStyle = '#ddd3b8'; g.fillRect(1, 2, 26, 43);
    g.fillStyle = '#c7bca0';
    for (let y = 10; y < 44; y += 11) g.fillRect(1, y, 26, 1);
    g.fillStyle = '#a8987a'; g.fillRect(0, 0, 28, 3);
    for (let f = 0; f < 3; f++) {
      const y = 6 + f * 11;
      rectO(g, 3, y, 7, 7, P.glass);
      g.fillStyle = P.timber; g.fillRect(6, y, 1, 7);
      rectO(g, 18, y, 7, 7, P.glass);
      g.fillStyle = P.timber; g.fillRect(21, y, 1, 7);
      g.fillStyle = '#9a8f74'; g.fillRect(12, y + 2, 4, 7); // 阳台
    }
    rectO(g, 11, 39, 6, 6, P.doorWood);
    return c;
  }

  function entShop() { // 临街店铺 26×26
    const [c, g] = makeCanvas(26, 26);
    g.fillStyle = '#e3d6b4'; g.fillRect(1, 2, 24, 23);
    g.fillStyle = P.rug; g.fillRect(1, 2, 24, 6);          // 招牌
    g.fillStyle = '#a94e3a'; g.fillRect(1, 7, 24, 1);
    g.fillStyle = P.paper; g.fillRect(4, 4, 4, 2); g.fillRect(10, 4, 6, 2); g.fillRect(18, 4, 4, 2);
    // 遮阳棚条纹
    for (let x = 1; x < 25; x += 4) { g.fillStyle = P.rug; g.fillRect(x, 9, 4, 3); }
    g.fillStyle = '#f1e4c1'; g.fillRect(1, 9, 24, 3);
    for (let x = 2; x < 25; x += 6) { g.fillStyle = '#c96a52'; g.fillRect(x, 9, 3, 3); }
    rectO(g, 3, 14, 8, 10, P.glass);                        // 玻璃窗
    g.fillStyle = '#7a95b5'; g.fillRect(4, 16, 5, 6);
    rectO(g, 15, 14, 8, 10, P.doorWood);                    // 门
    px(g, 21, 19, P.metal);
    return c;
  }

  function entStore() { // 小卖部 20×22
    const [c, g] = makeCanvas(20, 22);
    g.fillStyle = '#d9cba6'; g.fillRect(1, 2, 18, 19);
    g.fillStyle = P.bookB; g.fillRect(1, 2, 18, 5);
    g.fillStyle = P.paper; g.fillRect(4, 3, 8, 3);
    rectO(g, 3, 10, 6, 7, P.glass);
    rectO(g, 12, 10, 5, 9, P.doorWood);
    g.fillStyle = '#7a95b5'; g.fillRect(4, 12, 3, 3);
    px(g, 15, 14, P.metal);
    return c;
  }

  function entSchoolGate() { // 学校大门 40×16
    const [c, g] = makeCanvas(40, 16);
    rectO(g, 1, 2, 7, 13, '#d8cbb0');                       // 左门柱
    rectO(g, 32, 2, 7, 13, '#d8cbb0');
    g.fillStyle = '#b5a88a'; g.fillRect(2, 3, 5, 1);
    g.fillStyle = P.timber;
    for (let x = 9; x < 31; x += 3) g.fillRect(x, 6, 1, 9); // 铁栅栏
    g.fillRect(9, 6, 22, 2);
    g.fillStyle = P.rug; g.fillRect(8, 1, 24, 5);           // 横幅
    g.fillStyle = P.paper;
    g.fillRect(11, 3, 3, 2); g.fillRect(16, 3, 3, 2); g.fillRect(21, 3, 3, 2); g.fillRect(26, 3, 3, 2);
    return c;
  }

  function entSchool() { // 教学楼 44×38
    const [c, g] = makeCanvas(44, 38);
    g.fillStyle = '#e8ddc0'; g.fillRect(1, 4, 42, 33);
    g.fillStyle = '#d3c6a2';
    for (let y = 15; y < 36; y += 11) g.fillRect(1, y, 42, 1);
    g.fillStyle = P.roof; g.fillRect(0, 0, 44, 5);
    g.fillStyle = P.roofD; g.fillRect(0, 4, 44, 1);
    // 楼梯间
    g.fillStyle = '#d8ccb0'; g.fillRect(19, 2, 7, 35);
    g.fillStyle = P.roof; g.fillRect(18, 0, 9, 3);
    for (let f = 0; f < 3; f++) {
      const y = 8 + f * 11;
      winRow(g, 3, y, 40, 4, 6);
    }
    rectO(g, 20, 32, 6, 5, P.doorWood);
    // 旗杆
    g.fillStyle = '#9a9a94'; g.fillRect(41, 18, 1, 18);
    g.fillStyle = P.rug; g.fillRect(42, 18, 1, 4);
    return c;
  }

  function entOffice() { // 写字楼 36×54
    const [c, g] = makeCanvas(36, 54);
    g.fillStyle = '#8fa8c0'; g.fillRect(1, 2, 34, 51);
    g.fillStyle = '#7c95ad';
    for (let y = 4; y < 52; y += 8) g.fillRect(1, y, 34, 1);
    for (let x = 4; x < 34; x += 8) g.fillRect(x, 2, 1, 51);
    g.fillStyle = '#5f7a94'; g.fillRect(0, 0, 36, 3);
    g.fillStyle = '#aec6dc';
    for (let y = 5; y < 50; y += 8) for (let x = 5; x < 33; x += 8) g.fillRect(x, y, 4, 5);
    rectO(g, 14, 46, 8, 7, '#3f4a63');
    g.fillStyle = '#aec6dc'; g.fillRect(15, 47, 6, 1);
    return c;
  }

  function entCw() { // 城中村握手楼 22×40
    const [c, g] = makeCanvas(22, 40);
    g.fillStyle = '#c4b490'; g.fillRect(0, 2, 10, 37);
    g.fillStyle = '#b3a27c'; g.fillRect(11, 0, 10, 39);
    g.fillStyle = '#a08e68'; g.fillRect(10, 0, 1, 40);
    for (let f = 0; f < 5; f++) {
      const y = 4 + f * 7;
      rectO(g, 2, y, 5, 5, P.glass);
      rectO(g, 14, y - 2, 5, 5, P.glass);
    }
    g.fillStyle = '#8a7c5e'; g.fillRect(0, 38, 10, 1); g.fillRect(11, 38, 10, 1);
    rectO(g, 5, 34, 5, 5, P.doorWood);
    return c;
  }

  function entBusstop() { // 公交车站 26×18
    const [c, g] = makeCanvas(26, 18);
    g.fillStyle = '#5f7a94'; g.fillRect(1, 2, 24, 2);       // 顶棚
    g.fillStyle = '#7c95ad'; g.fillRect(1, 4, 24, 1);
    rectO(g, 2, 4, 2, 13, '#6e6a60');
    rectO(g, 22, 4, 2, 13, '#6e6a60');
    g.fillStyle = '#c9d5e2'; g.fillRect(5, 6, 14, 7);        // 站牌广告
    g.fillStyle = P.rug; g.fillRect(6, 7, 5, 2);
    g.fillStyle = '#8a8578'; g.fillRect(6, 10, 12, 1);
    return c;
  }

  function entTlight() { // 红绿灯 12×26
    const [c, g] = makeCanvas(12, 26);
    rectO(g, 4, 8, 3, 17, '#6e6a60');
    rectO(g, 2, 0, 7, 9, '#3a3a38');
    px(g, 5, 2, '#e05a4a'); px(g, 5, 4, '#e8b23a'); px(g, 5, 6, '#5aae5a');
    return c;
  }

  function entConv() { // 便利店 18×24
    const [c, g] = makeCanvas(18, 24);
    g.fillStyle = '#e8e2d2'; g.fillRect(1, 2, 16, 21);
    g.fillStyle = '#3e7c33'; g.fillRect(1, 2, 16, 6);
    g.fillStyle = P.paper; g.fillRect(4, 4, 10, 2);
    g.fillStyle = P.glass; g.fillRect(3, 11, 12, 8);
    g.fillStyle = '#7a95b5'; g.fillRect(4, 13, 10, 4);
    rectO(g, 7, 20, 5, 3, P.doorWood);
    return c;
  }


  function buildPlayer() {
    const out = {};
    const look = { hair: P.hairBrown, shirt: P.shirtBlue, pants: P.pants };
    for (const dir of ['down', 'up', 'left', 'right']) {
      out[dir] = [
        drawPerson({ ...look, dir, frame: 0 }),
        drawPerson({ ...look, dir, frame: 1 }),
        drawPerson({ ...look, dir, frame: 2 })
      ];
    }
    return out;
  }

  function buildNpc() {
    // 每个外观 id → 四个方向。以后加人物时在这里补一行外观即可
    const looks = {
      'npc-painter': { hair: P.hairGrey, shirt: P.shirtCream, pants: '#5c5648', hat: P.beret, palette: true },
      'npc-student': { hair: '#231f20', shirt: '#e8eef7', pants: '#2b3f66' },
      'npc-villager': { hair: '#3a332c', shirt: '#c9a15e', pants: '#4a5568', hat: '#d8c27a' },
      'npc-worker': { hair: '#231f20', shirt: '#e07b39', pants: '#3f4a63', hat: '#f2d13d' }
    };
    const out = {};
    for (const [id, look] of Object.entries(looks)) {
      out[id] = {};
      for (const dir of ['down', 'up', 'left', 'right']) {
        out[id][dir] = [drawPerson({ ...look, dir, frame: 0 })];
      }
    }
    return out;
  }

  function entMarker() {
    const [c, g] = makeCanvas(8, 9);
    rectO(g, 1, 0, 6, 6, '#fdf8ea');
    px(g, 3, 1, P.outline); px(g, 3, 2, P.outline);
    g.fillStyle = P.outline; g.fillRect(3, 4, 1, 1);
    g.fillStyle = P.outline;
    g.fillRect(3, 7, 1, 1); g.fillRect(2, 6, 1, 1); g.fillRect(4, 6, 1, 1);
    return c;
  }

  function entShadow() {
    const [c, g] = makeCanvas(14, 6);
    g.fillStyle = 'rgba(40,30,16,.28)';
    g.beginPath();
    g.ellipse(7, 3, 6, 2.4, 0, 0, Math.PI * 2);
    g.fill();
    return c;
  }

  // ------------------------------------------------------------
  //  一次性生成全部素材
  // ------------------------------------------------------------
  function buildAll() {
    return {
      TILE,
      tiles: {
        grass: tileGrass(11), grassFlower: tileGrass(23, true),
        path: tilePath(31), soil: tileSoil(47),
        water: [tileWater(0), tileWater(1), tileWater(2)],
        shore: tileShore(),
        roof: tileRoof(), wall: tileWall(), window: tileWindow(), door: tileDoor(),
        floor: tileFloor(), iwall: tileIWall(), rug: tileRug(),
        asphalt: tileAsphalt(), roadline: tileRoadline(), crosswalk: tileCrosswalk(),
        brickwall: tileBrickwall(), yard: tileYard(), bridge: tileBridge(),
        island: tileIsland()
      },
      entities: {
        tree: [entTree(0), entTree(1)],
        bush: entBush(), stone: entStone(), fence: entFence(), lamp: entLamp(),
        sign: entSign(), chest: entChest(), kite: entKite(),
        bed: entBed(), desk: entDesk(), shelf: entShelf(),
        selfhouse: entSelfhouse(), resident: entResident(), shop: entShop(),
        store: entStore(), schoolgate: entSchoolGate(), school: entSchool(),
        office: entOffice(), cw: entCw(), busstop: entBusstop(),
        tlight: entTlight(), conv: entConv()
      },
      player: buildPlayer(),
      npc: buildNpc(),
      marker: entMarker(),
      shadow: entShadow()
    };
  }

  return { TILE, buildAll };
})();
