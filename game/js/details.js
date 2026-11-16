// ===============================================================
//  LGDetails —— 生活细节层
//  让村庄/县城/深圳充满真实中国生活的细节：
//  · 村落：鸡群散步、河面鸭子、柴火堆、水缸、石磨、晾衣绳、草垛、炊烟
//  · 县城：电线杆与电线、店铺塑料凳+遮阳伞、烤红薯炉（带烟）、
//          自行车停靠、垃圾桶、消防栓
//  · 深圳：共享单车停放架、快递柜、垃圾桶、井盖
//  全部程序化原创像素绘制（风格对齐 sprites.js 色板）；
//  布置为确定性种子随机，自动避开路面/水域/互动锚点/出生点；
//  尊重游戏内「减少动态」设置（开启动物静止、炊烟隐藏）。
//  接口契约：init() / update(dt) / draw(ctx, layer: 'ground'|'top')
//  （主线程已在 game.js 的 update/render 中埋好调用点）
// ===============================================================
window.LGDetails = (function () {
  'use strict';

  const TILE = 16;
  let ready = false;
  let sceneId = null;
  let sceneKind = 'village';   // village | county | city | indoor
  let items = [];              // 静态杂物（ground 层）
  let chickens = [];           // 鸡（ground 层，漫游）
  let ducks = [];              // 鸭（ground 层，水面浮动）
  let smoke = [];              // 炊烟/炉烟（top 层，上升）
  let time = 0;

  // 同风格小色板
  const C = {
    outline: '#2e2417',
    wood: '#9a6a44', woodD: '#7f5433', woodL: '#b98a5e',
    jar: '#8a6a52', jarD: '#6f5440',
    stoneA: '#a8a494', stoneD: '#8c887a',
    straw: '#d8b96a', strawD: '#c2a355',
    pole: '#6e6a60', poleD: '#5a564e',
    bin: '#4f7a4a', binD: '#3f623c',
    hydrant: '#c23a2b',
    bike: '#4a89b5', bike2: '#c96a52',
    chicken: '#f0e6d2', chickenD: '#d8c8a8', comb: '#d05a4e',
    duck: '#e8e2d2', duckD: '#c9b98a', duckBill: '#e0862f',
    cloth: ['#c96a52', '#5480a8', '#d3a545', '#6a9c4e']
  };

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return [c, g];
  }
  function px(g, x, y, color) { g.fillStyle = color; g.fillRect(x, y, 1, 1); }
  function rectO(g, x, y, w, h, fill) {
    g.fillStyle = C.outline;
    g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = fill;
    g.fillRect(x, y, w, h);
  }
  function circle(g, cx, cy, r, color) {
    g.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y) + 0.5);
      g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // —— 杂物精灵（一次性绘制） ——
  const SPR = {};
  function buildSprites() {
    // 柴火堆 16×10
    {
      const [c, g] = makeCanvas(16, 10);
      for (let i = 0; i < 4; i++) {
        const y = 7 - i * 2;
        g.fillStyle = i % 2 ? C.wood : C.woodD;
        g.fillRect(2 + (i % 2) * 2, y, 12 - (i % 2) * 3, 2);
      }
      g.fillStyle = C.woodL; g.fillRect(3, 8, 10, 1);
      SPR.firewood = c;
    }
    // 水缸 14×14
    {
      const [c, g] = makeCanvas(14, 14);
      rectO(g, 2, 3, 10, 10, C.jar);
      g.fillStyle = C.jarD; g.fillRect(2, 6, 10, 1); g.fillRect(2, 10, 10, 1);
      g.fillStyle = '#5f7a94'; g.fillRect(3, 3, 8, 2);
      g.fillStyle = C.woodL; g.fillRect(1, 2, 12, 2);
      SPR.jar = c;
    }
    // 石磨 16×12
    {
      const [c, g] = makeCanvas(16, 12);
      circle(g, 8, 7, 6, C.stoneD);
      circle(g, 8, 6, 5, C.stoneA);
      g.fillStyle = C.stoneD; g.fillRect(7, 6, 2, 1);
      rectO(g, 12, 8, 3, 3, C.wood);
      SPR.mill = c;
    }
    // 草垛 14×12
    {
      const [c, g] = makeCanvas(14, 12);
      circle(g, 7, 7, 6, C.strawD);
      circle(g, 7, 6, 5, C.straw);
      g.fillStyle = C.strawD;
      for (let i = 0; i < 6; i++) px(g, 3 + i * 2, 4 + (i % 3) * 2, C.strawD);
      g.fillStyle = C.grassD; g.fillRect(2, 10, 10, 1);
      SPR.haystack = c;
    }
    // 电线杆 10×30
    {
      const [c, g] = makeCanvas(10, 30);
      rectO(g, 3, 4, 3, 25, C.pole);
      g.fillStyle = C.poleD; g.fillRect(5, 4, 1, 25);
      rectO(g, 1, 2, 8, 3, C.wood);
      g.fillStyle = C.poleD;
      g.fillRect(2, 3, 2, 1); g.fillRect(6, 3, 2, 1);
      SPR.pole = c;
    }
    // 垃圾桶 12×16
    {
      const [c, g] = makeCanvas(12, 16);
      rectO(g, 2, 3, 8, 12, C.bin);
      g.fillStyle = C.binD;
      g.fillRect(2, 6, 8, 1); g.fillRect(2, 10, 8, 1);
      g.fillStyle = '#6e6a60'; g.fillRect(1, 1, 10, 2);
      SPR.bin = c;
    }
    // 消防栓 10×14
    {
      const [c, g] = makeCanvas(10, 14);
      rectO(g, 2, 3, 6, 9, C.hydrant);
      g.fillStyle = '#9e2e22'; g.fillRect(2, 6, 6, 1);
      rectO(g, 3, 11, 4, 2, C.stoneA);
      g.fillStyle = C.hydrant; g.fillRect(1, 5, 1, 3); g.fillRect(8, 5, 1, 3);
      SPR.hydrant = c;
    }
    // 井盖 14×6
    {
      const [c, g] = makeCanvas(14, 6);
      g.fillStyle = '#6e6a60'; g.fillRect(0, 0, 14, 6);
      g.fillStyle = '#5a564e';
      for (let x = 1; x < 13; x += 3) g.fillRect(x, 1, 1, 4);
      SPR.manhole = c;
    }
    // 烤红薯炉 14×16
    {
      const [c, g] = makeCanvas(14, 16);
      rectO(g, 2, 4, 10, 11, '#7a5a3a');
      g.fillStyle = '#5f4630'; g.fillRect(3, 8, 8, 6);
      g.fillStyle = '#2e2417'; g.fillRect(4, 11, 6, 3);
      g.fillStyle = '#e0862f'; g.fillRect(5, 12, 4, 1);
      g.fillStyle = '#d8cbb0'; g.fillRect(2, 2, 10, 2);
      SPR.roaststove = c;
    }
    // 共享单车架（含 3 辆车） 40×16
    {
      const [c, g] = makeCanvas(40, 16);
      g.fillStyle = '#9a9a94'; g.fillRect(1, 6, 38, 2);
      for (let i = 0; i < 3; i++) {
        const x = 3 + i * 12;
        g.strokeStyle = i % 2 ? C.bike : C.bike2;
        g.lineWidth = 1;
        g.beginPath(); g.arc(x + 3, 12, 3, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.arc(x + 10, 12, 3, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.moveTo(x + 3, 12); g.lineTo(x + 6, 6); g.lineTo(x + 10, 12); g.stroke();
        g.beginPath(); g.moveTo(x + 6, 6); g.lineTo(x + 5, 4); g.stroke();
        g.fillStyle = C.outline;
        g.fillRect(x + 1, 14, 6, 1); g.fillRect(x + 8, 14, 6, 1);
      }
      SPR.bikerack = c;
    }
    // 快递柜 18×22
    {
      const [c, g] = makeCanvas(18, 22);
      rectO(g, 1, 1, 16, 20, '#3f623c');
      g.fillStyle = 'rgba(84,128,80,.56)';
      for (let y = 3; y < 19; y += 5) for (let x = 3; x < 15; x += 5) g.fillRect(x, y, 4, 3);
      g.fillStyle = '#e8c46a'; g.fillRect(14, 3, 2, 2);
      SPR.locker = c;
    }
    // 塑料凳+遮阳伞 20×22
    {
      const [c, g] = makeCanvas(20, 22);
      g.fillStyle = C.pole; g.fillRect(9, 6, 2, 12);
      g.fillStyle = '#c96a52';
      g.beginPath(); g.arc(10, 6, 8, Math.PI, 0); g.fill();
      g.fillStyle = '#f1e4c1';
      g.fillRect(10, 6, 8, 1);
      rectO(g, 4, 16, 8, 4, '#3e7c33');
      g.fillStyle = '#2e5a28'; g.fillRect(5, 18, 6, 1);
      SPR.stool = c;
    }
    // 晾衣绳（立柱+绳+衣） 44×20
    {
      const [c, g] = makeCanvas(44, 20);
      rectO(g, 2, 4, 3, 15, C.wood);
      rectO(g, 39, 4, 3, 15, C.wood);
      g.strokeStyle = '#8a8578'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(4, 6); g.lineTo(40, 6); g.stroke();
      const cols = C.cloth;
      for (let i = 0; i < 4; i++) {
        const x = 8 + i * 8;
        g.fillStyle = cols[i % cols.length];
        g.fillRect(x, 6, 5, 7);
        g.fillStyle = C.outline; g.fillRect(x, 12, 5, 1);
      }
      SPR.clothesline = c;
    }
    // 石凳 14×8
    {
      const [c, g] = makeCanvas(14, 8);
      rectO(g, 1, 1, 12, 5, C.stoneA);
      g.fillStyle = C.stoneD; g.fillRect(1, 4, 12, 1);
      rectO(g, 2, 5, 2, 2, C.stoneD);
      rectO(g, 10, 5, 2, 2, C.stoneD);
      SPR.bench2 = c;
    }
    // 花坛 18×10
    {
      const [c, g] = makeCanvas(18, 10);
      rectO(g, 0, 0, 18, 8, '#a55a42');      // 砖沿
      g.fillStyle = '#8e4a35'; g.fillRect(0, 3, 18, 1);
      g.fillStyle = '#5c9247'; g.fillRect(2, 4, 14, 3);  // 绿叶
      g.fillStyle = C.flowerW;
      px(g, 4, 4, C.flowerW); px(g, 8, 5, C.flowerY); px(g, 12, 4, C.flowerP); px(g, 6, 6, C.flowerY);
      g.fillStyle = '#b5674d'; g.fillRect(0, 8, 18, 1);
      SPR.planter = c;
    }

    // 鸡（两帧） 10×8
    {
      SPR.chicken = [0, 1].map(f => {
        const [c, g] = makeCanvas(10, 8);
        g.fillStyle = C.chicken; g.fillRect(2, 1, 6, 5);
        g.fillStyle = C.chickenD; g.fillRect(2, 4, 6, 2);
        px(g, 1, 2, C.chicken);
        g.fillStyle = C.comb; g.fillRect(4, 0, 2, 1);
        px(g, 7, 2, C.outline);
        g.fillStyle = '#e0862f'; g.fillRect(8, 3, 2, 1);
        g.fillStyle = C.outline;
        g.fillRect(3, 6 + (f ? 0 : 1), 1, 2 - (f ? 0 : 1));
        g.fillRect(6, 6 + (f ? 1 : 0), 1, 2 - (f ? 1 : 0));
        return c;
      });
    }
    // 鸭（两帧） 12×8
    {
      SPR.duck = [0, 1].map(f => {
        const [c, g] = makeCanvas(12, 8);
        g.fillStyle = C.duck; g.fillRect(3, 2, 7, 4);
        g.fillStyle = C.duckD; g.fillRect(3, 4, 7, 2);
        g.fillStyle = C.duckBill; g.fillRect(1, 2, 2, 1);
        px(g, 5, 2, C.outline);
        g.fillStyle = C.outline; g.fillRect(9, 1, 1, 2);
        return c;
      });
    }
  }

  // ------------------------------------------------------------
  //  布置：按场景类型生成杂物与动物
  // ------------------------------------------------------------
  function setupForScene() {
    items = []; chickens = []; ducks = []; smoke = [];
    const st = window.__lifeGame && window.__lifeGame.state;
    if (!st || !st.scene) { ready = false; return; }
    const scene = st.scene;
    sceneId = scene.id;
    sceneKind = scene.def && scene.def.indoor ? 'indoor'
      : scene.id === 'shenzhen' ? 'city'
      : scene.id === 'county' ? 'county' : 'village';
    if (sceneKind === 'indoor') { ready = true; return; }

    const legend = Object.assign({}, (window.LIFE_DATA.scenes || {}).legend || {}, scene.def.legend || {});
    const tileAt = (tx, ty) => {
      const row = scene.def.map[ty];
      if (!row || row[tx] === undefined) return null;
      return (legend[row[tx]] || {}).tile || null;
    };
    const blockedZones = (scene.interactZones || []).map(z => [z.cx, z.cy]);
    const spawns = Object.values(scene.def.spawnPoints || {}).map(a => [a[0] * TILE, a[1] * TILE]);
    const near = (x, y, list, r) => list.some(([lx, ly]) => Math.hypot(lx - x, ly - y) < r);

    const rnd = mulberry32(
      [...scene.id].reduce((a, ch) => a + ch.charCodeAt(0) * 7, 11));
    const isCounty = sceneKind === 'county';
    const isCity = sceneKind === 'city';

    // 候选格：草地/空地/木地板/操场（非路面、非水、非实心）
    const candidates = [];
    for (let ty = 0; ty < scene.def.map.length; ty++) {
      for (let tx = 0; tx < scene.def.map[0].length; tx++) {
        const t = tileAt(tx, ty);
        if (t !== 'grass' && t !== 'yard' && t !== 'soil') continue;
        if (solidAt(tx, ty)) continue;
        candidates.push([tx, ty]);
      }
    }
    function solidAt(tx, ty) {
      const row = scene.def.map[ty];
      if (!row || row[tx] === undefined) return true;
      const spec = legend[row[tx]];
      return !!(spec && spec.solid);
    }

    const freeSpot = (x, y) =>
      !near(x, y, blockedZones, 44) &&
      !near(x, y, spawns, 64) &&
      !(scene.interactZones || []).some(z =>
        Math.abs(z.cx - x) < TILE * 1.6 && Math.abs(z.cy - y) < TILE * 1.6);

    const pick = n => {
      const out = [];
      const used = new Set();
      let guard = 0;
      while (out.length < n && guard++ < 400) {
        if (!candidates.length) break;
        const [tx, ty] = candidates[(rnd() * candidates.length) | 0];
        const x = tx * TILE + 8, y = ty * TILE + 12;
        const k = tx + ',' + ty;
        if (used.has(k)) continue;
        if (!freeSpot(x, y)) continue;
        used.add(k);
        out.push([x, y]);
      }
      return out;
    };

    // —— 杂物（ground 静态） ——
    const spots = pick(sceneKind === 'village' ? 10 : 12);
    let si = 0;
    const vocab = sceneKind === 'village'
      ? ['firewood', 'jar', 'mill', 'haystack', 'clothesline', 'bin']
      : sceneKind === 'county'
        ? ['pole', 'stool', 'roaststove', 'bikerack', 'bin', 'hydrant', 'planter', 'bench2']
        : ['bikerack', 'locker', 'bin', 'hydrant', 'planter', 'bench2'];
    for (const [x, y] of spots) {
      items.push({ type: vocab[(si++) % vocab.length], x: x, y: y });
    }

    // —— 鸡（村庄漫游） ——
    if (sceneKind === 'village') {
      for (const [x, y] of pick(2)) {
        for (let i = 0; i < 2; i++) {
          chickens.push({
            hx: x, hy: y,
            x: x + (rnd() * 20 - 10), y: y + (rnd() * 16 - 8),
            dir: rnd() < 0.5 ? -1 : 1, t: rnd() * 3, frame: 0, peck: 0, walking: false
          });
        }
      }
    }

    // —— 鸭（水面） ——
    const waterCells = scene.waterCells || [];
    if (waterCells.length && sceneKind === 'village') {
      for (let i = 0; i < 2; i++) {
        const [wc, wr] = waterCells[(rnd() * waterCells.length) | 0];
        ducks.push({ x: wc * TILE + 8, y: wr * TILE + 8, bob: rnd() * 6, drift: (rnd() - 0.5) * 2, homeX: wc * TILE + 8 });
      }
    }

    // —— 炊烟（小屋屋顶，village；烤红薯炉，county） ——
    if (sceneKind === 'village') {
      if (scene.id === 'village') {
        smoke.push({ x: 18 * TILE + 4, y: 6 * TILE - 9, t: rnd() * 2, big: true });
        (scene.def.homes || []).forEach(function (home, i) {
          if (i % 4 === 0) smoke.push({ x: (home[0] + 1) * TILE + 4,
            y: (home[1] - 4) * TILE - 9, t: rnd() * 2, big: true });
        });
      }
    } else if (isCounty) {
      const stove = items.find(it => it.type === 'roaststove');
      if (stove) smoke.push({ x: stove.x, y: stove.y - 12, t: 0, big: false });
    }
    ready = true;
  }

  // ------------------------------------------------------------
  //  更新
  // ------------------------------------------------------------
  function update(dt) {
    if (!ready) return;
    const st = window.__lifeGame && window.__lifeGame.state;
    if (!st || !st.scene) return;
    if (st.scene.id !== sceneId) { setupForScene(); return; }
    time += dt;
    const reduced = st.settings.reducedMotion === null
      ? (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      : !!st.settings.reducedMotion;
    if (reduced) return;

    // 鸡：随机走动 + 啄食
    for (const ch of chickens) {
      ch.t -= dt;
      if (ch.t <= 0) {
        ch.t = 1.5 + Math.random() * 2.5;
        ch.dir = Math.random() < 0.5 ? -1 : 1;
        ch.walking = Math.random() < 0.6;
        ch.peck = Math.random() < 0.4 ? 0.8 : 0;
      }
      if (ch.walking && !(ch.peck > 0)) {
        const nx = ch.x + ch.dir * 9 * dt;
        if (Math.abs(nx - ch.hx) < TILE * 1.5) ch.x = nx;
        else ch.dir *= -1;
        ch.frame = Math.floor(time * 6) % 2;
      } else {
        ch.frame = 0;
        if (ch.peck > 0) ch.peck -= dt;
      }
    }
    // 鸭：漂移 + 浮动
    for (const d of ducks) {
      d.x += d.drift * 2 * dt;
      if (Math.abs(d.x - d.homeX) > TILE) d.drift *= -1;
    }
    // 烟：上升
    for (const s of smoke) {
      s.t += dt;
      if (s.t > 2.2) s.t = 0;
    }
  }

  // ------------------------------------------------------------
  //  绘制
  // ------------------------------------------------------------
  function draw(ctx, layer) {
    if (!ready) return;
    if (layer === 'ground') {
      // 静态杂物
      for (const it of items) {
        const img = SPR[it.type];
        if (!img) continue;
        ctx.drawImage(img, Math.round(it.x - img.width / 2), Math.round(it.y - img.height));
      }
      // 鸡
      for (const ch of chickens) {
        const img = SPR.chicken[ch.frame];
        ctx.save();
        if (ch.dir < 0) { ctx.scale(-1, 1); ctx.drawImage(img, -Math.round(ch.x + 5), Math.round(ch.y - 8)); }
        else ctx.drawImage(img, Math.round(ch.x - 5), Math.round(ch.y - 8));
        ctx.restore();
      }
      // 鸭
      for (const d of ducks) {
        const bob = Math.sin(time / 0.7 + d.bob) * 1;
        ctx.drawImage(SPR.duck[Math.floor(time * 2) % 2], Math.round(d.x - 6), Math.round(d.y - 4 + bob));
      }
    } else if (layer === 'top') {
      // 炊烟：上升烟团
      const st = window.__lifeGame && window.__lifeGame.state;
      const reduced = st && (st.settings.reducedMotion === null
        ? (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        : !!st.settings.reducedMotion);
      if (reduced) return;
      for (const s of smoke) {
        const phase = s.t / 2.2;
        const rise = phase * 26;
        const alpha = 0.42 * (1 - phase);
        const size = 3 + phase * 5;
        ctx.fillStyle = 'rgba(200,196,186,' + alpha.toFixed(3) + ')';
        const sway = Math.sin(phase * 5 + s.x) * 2.5;
        ctx.fillRect(Math.round(s.x + sway), Math.round(s.y - rise), size, size);
        if (phase > 0.4) {
          ctx.fillStyle = 'rgba(200,196,186,' + (alpha * 0.6).toFixed(3) + ')';
          ctx.fillRect(Math.round(s.x + sway + 3), Math.round(s.y - rise - 4), size - 2, size - 2);
        }
      }
    }
  }

  // ------------------------------------------------------------
  //  对外接口
  // ------------------------------------------------------------
  return {
    init: function () { buildSprites(); setupForScene(); },
    update: function (dt) { update(dt); },
    draw: function (ctx, layer) { try { draw(ctx, layer); } catch (e) { /* 细节层绝不影响本体 */ } },
    _stats: function () { return { sceneId: sceneId, kind: sceneKind, items: items.length, chickens: chickens.length, ducks: ducks.length, smoke: smoke.length, ready: ready }; }
  };
})();
