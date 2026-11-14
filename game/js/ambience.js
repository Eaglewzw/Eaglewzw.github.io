// ===============================================================
//  LGAmbience —— 环境氛围动画层
//  为游戏叠加一层低调的"活气"：蝴蝶、飞鸟、鱼跃、落叶、室内微尘。
//  · 100% 程序化像素绘制（fillRect 小方块），配色取自 sprites.js
//    的统一色板，不引用任何图片 / 字体 / 第三方库
//  · 防御性设计：window.__lifeGame 或 scene 未就绪时安全空转，
//    任何内部异常都被吞掉，绝不影响游戏本体渲染
//  · 场景切换：通过 state.scene 的 id/W/H 变化自行感知并重置粒子
//  · 减少动态：settings.reducedMotion（null 时跟随系统偏好）为
//    true 时隐藏全部氛围元素
//  · 密度克制：室外同屏同时最多 8 个元素
//
//  接口（由主线程调用）：
//    window.LGAmbience.init()          // 游戏启动后调用一次
//    window.LGAmbience.update(dt)      // 每帧推进（dt 秒）
//    window.LGAmbience.draw(ctx, layer) // layer: 'ground' 实体之下
//                                       //        'top'    实体之上
//  调用 draw 时 ctx 已处于世界坐标系（引擎已 translate(-camX,-camY)），
//  本模块直接使用世界坐标绘制。
// ===============================================================
window.LGAmbience = (function () {
  'use strict';

  // ----------------------------------------------------------
  //  常量
  // ----------------------------------------------------------
  const TILE = 16;                        // 与 sprites.js 一致的逻辑格
  const VIEW_FALLBACK = { w: 480, h: 300 };
  const MAX_ELEMENTS = 8;                 // 室外同屏氛围元素上限
  const MAX_LEAVES = 3;                   // 落叶并发上限

  // 统一色板关键色（与 sprites.js 的 P 保持一致，就地复制以免依赖加载顺序）
  const C = {
    outline: '#2e2417',
    foam: '#e3f0fa',
    waterC: '#74b3e8',
    flowerW: '#f6f2df', flowerY: '#f0cf5e', flowerP: '#e2a0c4',
    leafA: '#4e8f3e', leafB: '#61a14c', leafC: '#3e7c33',
    kiteA: '#d9834b', kiteB: '#e8b25e',
    metal: '#cbc4b6',
    warmLight: '#fff6cf'
  };
  const BUTTERFLY_COLORS = [C.flowerP, C.flowerY, C.flowerW, C.kiteA];
  const LEAF_COLORS = [C.leafA, C.leafB, C.leafC];

  // 系统级「减少动态」偏好（读一次即可，与引擎做法一致）
  const RM_DEFAULT = (function () {
    try {
      return !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  })();

  // ----------------------------------------------------------
  //  运行时状态
  // ----------------------------------------------------------
  let time = 0;               // 氛围层自己的时钟（秒）
  let sceneKey = null;        // 'id:WxH:in|out'，变化即视为切换场景
  let indoor = false;
  let sceneW = 0, sceneH = 0;
  let waterSet = null;        // '列,行' → 水面格（快速查询）
  let waterList = [];         // 同上数组形态（随机抽样）
  let trees = [];             // 树冠锚点 {x, baseline}
  let view = { w: VIEW_FALLBACK.w, h: VIEW_FALLBACK.h }; // 可视区（自动校准）
  let viewTimer = 0;
  let kDev = 0;               // 渲染缩放（draw 时从 ctx 变换矩阵捕获）
  let camDev = { x: 0, y: 0 };// 相机世界坐标（同上，取整后的渲染值）

  let butterflies = [];
  let birds = [];
  let birdTimer = 8;
  let fish = [];              // 正在跃弧线的鱼
  let sprays = [];            // 鱼跃带起的小水花
  let ripples = [];           // 水面涟漪
  let fishTimer = 4;
  let leaves = [];
  let leafTimer = 1.5;
  let dust = [];              // 室内微光尘埃
  let respawnTimer = 0;       // 种群补齐节奏器

  // 仅供调试 / 测试观察的计数器，不参与任何行为
  const stats = {
    birdSpawned: 0, fishJumps: 0, leafSpawned: 0,
    active: 0, sceneSwitches: 0, scene: null,
    butterflies: 0, birds: 0, leaves: 0, dust: 0,
    fx: null, fy: null,   // 第一条鱼的当前位置
    bx: null, by: null,   // 第一只鸟的当前位置
    lx: null, ly: null    // 第一片下落中树叶的位置
  };

  // ----------------------------------------------------------
  //  小工具
  // ----------------------------------------------------------
  function rand(a, b) { return a + Math.random() * (b - a); }
  function irand(a, b) { return Math.floor(rand(a, b + 1)); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function getState() {
    try {
      const lg = window.__lifeGame;
      return (lg && lg.state) ? lg.state : null;
    } catch (e) { return null; }
  }

  // settings.reducedMotion：true/false 生效，null 跟随系统
  function reducedMotion(state) {
    try {
      const s = state && state.settings;
      if (s && typeof s.reducedMotion === 'boolean') return s.reducedMotion;
    } catch (e) { /* 忽略 */ }
    return RM_DEFAULT;
  }

  // 从全局状态安全提取场景快照（id / indoor / 尺寸 / 水面 / 实体）
  function sceneInfo(state) {
    try {
      const sc = state && state.scene;
      if (!sc || !(sc.W > 0) || !(sc.H > 0)) return null;
      // 引擎当前把 indoor 放在 scene.def 里，未来若提升到 scene 本体也兼容
      const ind = typeof sc.indoor === 'boolean'
        ? sc.indoor
        : !!(sc.def && sc.def.indoor);
      return {
        id: String(sc.id || ''),
        W: sc.W, H: sc.H, indoor: ind,
        water: Array.isArray(sc.waterCells) ? sc.waterCells : [],
        entities: Array.isArray(sc.entities) ? sc.entities : [],
        key: String(sc.id || '') + ':' + sc.W + 'x' + sc.H + (ind ? ':i' : ':o')
      };
    } catch (e) { return null; }
  }

  function getCamera() {
    // 优先用渲染变换矩阵里捕获的相机（与引擎实际渲染完全一致）
    if (kDev > 0 && isFinite(camDev.x)) return camDev;
    try {
      const cam = getState() && getState().camera;
      if (cam && typeof cam.x === 'number' && typeof cam.y === 'number') return cam;
    } catch (e) { /* 忽略 */ }
    return { x: 0, y: 0 };
  }

  // draw 时捕获当前渲染变换：a/d = 缩放 k，e/f = -cam*k。
  // 这样无论引擎将来怎么调整缩放策略，氛围层都能拿到真实可视区。
  function captureTransform(ctx) {
    try {
      if (!ctx.getTransform) return;
      const t = ctx.getTransform();
      if (t && t.a > 0 && t.d > 0 && isFinite(t.e) && isFinite(t.f)) {
        kDev = t.a;
        camDev.x = -t.e / t.a;
        camDev.y = -t.f / t.d;
      }
    } catch (e) { /* 忽略 */ }
  }

  // 可视区（逻辑像素）= 画布设备尺寸 / 渲染缩放；拿不到时退回估算
  function refreshView() {
    try {
      const cv = document.getElementById('game-canvas');
      if (cv && kDev > 0) {
        const w = cv.width / kDev, h = cv.height / kDev;
        if (w > 50 && w < 3000 && h > 50 && h < 3000) { view.w = w; view.h = h; return; }
      }
      if (cv && sceneW > 0 && cv.clientWidth && cv.clientHeight) {
        // 兜底：复刻引擎「铺满视口」的缩放推导
        const need = Math.max(cv.clientWidth / sceneW, cv.clientHeight / sceneH);
        const scale = Math.max(2, Math.min(7, Math.ceil(need)));
        view.w = cv.clientWidth / scale;
        view.h = cv.clientHeight / scale;
        return;
      }
    } catch (e) { /* 忽略 */ }
    view.w = VIEW_FALLBACK.w; view.h = VIEW_FALLBACK.h;
  }

  function inWater(x, y) {
    if (!waterSet) return false;
    return waterSet.has(Math.floor(x / TILE) + ',' + Math.floor(y / TILE));
  }

  // ----------------------------------------------------------
  //  场景同步与重置
  // ----------------------------------------------------------
  function resetElements() {
    butterflies.length = 0;
    birds.length = 0;
    fish.length = 0;
    sprays.length = 0;
    ripples.length = 0;
    leaves.length = 0;
    dust.length = 0;
    stats.active = 0;
    stats.butterflies = 0;
    stats.birds = 0;
    stats.leaves = 0;
    stats.dust = 0;
    stats.fx = null; stats.fy = null;
    stats.bx = null; stats.by = null;
    stats.lx = null; stats.ly = null;
  }

  function syncScene(info) {
    sceneKey = info.key;
    indoor = info.indoor;
    sceneW = info.W;
    sceneH = info.H;

    waterSet = new Set();
    waterList = [];
    for (let i = 0; i < info.water.length; i++) {
      const cell = info.water[i];
      if (Array.isArray(cell) && typeof cell[0] === 'number' && typeof cell[1] === 'number') {
        const k = cell[0] + ',' + cell[1];
        if (!waterSet.has(k)) { waterSet.add(k); waterList.push([cell[0], cell[1]]); }
      }
    }

    trees = [];
    for (let i = 0; i < info.entities.length; i++) {
      const e = info.entities[i];
      if (e && e.kind === 'tree' && typeof e.x === 'number' && typeof e.baseline === 'number') {
        trees.push({ x: e.x, baseline: e.baseline });
      }
    }

    resetElements();
    refreshView();               // 新场景尺寸可能改变缩放与可视区
    respawnTimer = 0.8;          // 给相机一点就位时间，再放第一只小家伙
    birdTimer = rand(6, 14);     // 第一群鸟来得稍早，之后固定 20~40s 节奏
    fishTimer = rand(2, 6);
    leafTimer = rand(1, 2.5);
    stats.sceneSwitches++;
  }

  // 种群补齐：蝴蝶 / 尘埃是常驻元素，意外清空（如关闭减少动态）后自动回来
  function ensurePopulation(dt) {
    respawnTimer -= dt;
    if (respawnTimer > 0) return;
    if (indoor) {
      if (dust.length < 1) { spawnDust(); respawnTimer = 1; }
    } else if (butterflies.length < 1) {
      spawnButterflies();
      respawnTimer = 1;
    }
  }

  // ----------------------------------------------------------
  //  蝴蝶：草地上缓慢游走，2 帧翅膀，随机换向，避开水面
  // ----------------------------------------------------------
  function pickLandPoint(cam) {
    for (let t = 0; t < 14; t++) {
      let x, y;
      if (t < 9) {   // 优先相机视野附近（保证玩家看得见）
        x = cam.x - 20 + Math.random() * (view.w + 40);
        y = cam.y - 20 + Math.random() * (view.h + 40);
      } else {       // 兜底：场景内任意位置
        x = Math.random() * sceneW;
        y = Math.random() * sceneH;
      }
      x = clamp(x, 8, sceneW - 8);
      y = clamp(y, 8, sceneH - 8);
      if (!inWater(x, y)) return { x: x, y: y };
    }
    return null;
  }

  function spawnButterflies() {
    const cam = getCamera();
    for (let i = 0; i < 3; i++) {
      const p = pickLandPoint(cam);
      if (!p) break;
      butterflies.push({
        x: p.x, y: p.y,
        heading: rand(0, Math.PI * 2),
        target: rand(0, Math.PI * 2),
        turnT: rand(0.8, 2.8),
        speed: rand(9, 13),
        wingT: rand(0, 0.11),
        wing: irand(0, 1),
        bob: rand(0, Math.PI * 2),
        color: BUTTERFLY_COLORS[irand(0, BUTTERFLY_COLORS.length - 1)]
      });
    }
  }

  function updateButterflies(dt) {
    for (let i = 0; i < butterflies.length; i++) {
      const b = butterflies[i];
      b.turnT -= dt;
      if (b.turnT <= 0) {          // 随机换向
        b.target = rand(0, Math.PI * 2);
        b.turnT = rand(1.2, 3.2);
      }
      let d = b.target - b.heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      b.heading += clamp(d, -2.4 * dt, 2.4 * dt);
      const nx = b.x + Math.cos(b.heading) * b.speed * dt;
      const ny = b.y + Math.sin(b.heading) * b.speed * dt;
      if (nx < 8 || nx > sceneW - 8 || ny < 8 || ny > sceneH - 8 || inWater(nx, ny)) {
        b.target = b.heading + Math.PI * rand(0.55, 1.45);  // 撞边界 / 水面：掉头
        b.turnT = rand(1.2, 3.2);
      } else {
        b.x = nx;
        b.y = ny;
      }
      b.wingT += dt;
      if (b.wingT >= 0.11) { b.wingT = 0; b.wing ^= 1; }
    }
  }

  // ----------------------------------------------------------
  //  飞鸟：每 20~40 秒一群（2~3 只）从画面一侧高空飞过
  // ----------------------------------------------------------
  function countActive() {
    return butterflies.length + birds.length + fish.length + leaves.length;
  }

  function spawnBirdFlock() {
    const room = MAX_ELEMENTS - countActive();
    if (room < 2) return;                          // 画面太满就不打扰
    const cam = getCamera();
    const n = Math.min(irand(2, 3), room);
    const fromLeft = Math.random() < 0.5;
    const dir = fromLeft ? 1 : -1;
    const y0 = clamp(cam.y + rand(20, 90), 6, Math.max(6, sceneH - 24));
    const speed = rand(52, 74);
    for (let i = 0; i < n; i++) {
      birds.push({
        x: fromLeft
          ? cam.x - 40 - i * rand(10, 22)
          : cam.x + view.w + 40 + i * rand(10, 22),
        y: clamp(y0 + rand(-9, 12), 6, Math.max(6, sceneH - 24)),
        vx: dir * speed * rand(0.92, 1.08),
        bob: rand(0, Math.PI * 2),
        wingT: rand(0, 0.16),
        wing: irand(0, 1)
      });
    }
    stats.birdSpawned += n;
  }

  function updateBirds(dt) {
    const cam = getCamera();
    const left = cam.x - 80, right = cam.x + view.w + 80;
    for (let i = birds.length - 1; i >= 0; i--) {
      const b = birds[i];
      b.x += b.vx * dt;
      b.y += Math.sin(time * 1.8 + b.bob) * 7 * dt;   // 轻微起伏
      b.wingT += dt;
      if (b.wingT >= 0.16) { b.wingT = 0; b.wing ^= 1; }
      if (b.x < left || b.x > right) birds.splice(i, 1);
    }
    if (birds.length) {            // 调试观察：第一只鸟的当前位置
      stats.bx = Math.round(birds[0].x);
      stats.by = Math.round(birds[0].y);
    } else {
      stats.bx = null; stats.by = null;
    }
  }

  // ----------------------------------------------------------
  //  鱼跃：河面随机点跳出小弧线 + 涟漪扩散
  // ----------------------------------------------------------
  function addRipple(x, y) {
    ripples.push({ x: x, y: y, t: 0, dur: 1.3 });
  }

  function addSpray(x, y, n) {
    for (let i = 0; i < n; i++) {
      sprays.push({
        x: x + rand(-2, 2), y: y,
        vx: rand(-8, 8), vy: -rand(18, 30),
        t: 0, dur: rand(0.3, 0.5)
      });
    }
  }

  // 优先取相机视野内的水面格（鱼跃要让人看见）；没有就退回全部水面
  function pickWaterCell() {
    if (!waterList.length) return null;
    const cam = getCamera();
    const near = waterList.filter(function (cell) {
      const cx = (cell[0] + 0.5) * TILE, cy = (cell[1] + 0.5) * TILE;
      return cx > cam.x + 20 && cx < cam.x + view.w - 20 &&
             cy > cam.y + 16 && cy < cam.y + view.h - 16;
    });
    const pool = near.length ? near : waterList;
    return pool[irand(0, pool.length - 1)];
  }

  function spawnFish() {
    if (!waterList.length) return;
    if (countActive() + 1 > MAX_ELEMENTS) return;
    const cell = pickWaterCell();
    if (!cell) return;
    const cx = cell[0] * TILE + rand(3, 13);
    const cy = cell[1] * TILE + rand(4, 12);
    const dir = Math.random() < 0.5 ? -1 : 1;
    fish.push({
      x0: cx, y0: cy,
      dx: dir * rand(9, 16),       // 弧线水平位移
      hop: rand(9, 13),            // 弧顶高度
      t: 0, dur: rand(0.7, 0.95)
    });
    addRipple(cx, cy);
    addSpray(cx, cy, 2);
    stats.fishJumps++;
  }

  function updateFish(dt) {
    for (let i = fish.length - 1; i >= 0; i--) {
      const f = fish[i];
      f.t += dt;
      if (f.t >= f.dur) {          // 落水：终点再起一圈涟漪
        addRipple(f.x0 + f.dx, f.y0);
        addSpray(f.x0 + f.dx, f.y0, 2);
        fish.splice(i, 1);
      }
    }
    if (fish.length) {             // 调试观察：第一条鱼的当前位置
      const f = fish[0];
      const p = clamp(f.t / f.dur, 0, 1);
      stats.fx = Math.round(f.x0 + f.dx * p);
      stats.fy = Math.round(f.y0 - Math.sin(p * Math.PI) * f.hop);
    } else {
      stats.fx = null; stats.fy = null;
    }
  }

  function updateSprays(dt) {
    for (let i = sprays.length - 1; i >= 0; i--) {
      const s = sprays[i];
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 90 * dt;             // 简易重力
      if (s.t >= s.dur) sprays.splice(i, 1);
    }
  }

  function updateRipples(dt) {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.t += dt;
      if (r.t >= r.dur) ripples.splice(i, 1);
    }
  }

  // ----------------------------------------------------------
  //  落叶：从树冠飘落、旋转、落地停留片刻后消失
  // ----------------------------------------------------------
  function spawnLeaf() {
    if (!trees.length || leaves.length >= MAX_LEAVES) return;
    if (countActive() + 1 > MAX_ELEMENTS) return;
    // 优先取视野附近的树（落叶要让人看见）；没有就退回全部树
    const cam = getCamera();
    const near = trees.filter(function (t) {
      return t.x > cam.x - 40 && t.x < cam.x + view.w + 40 &&
             t.baseline > cam.y - 40 && t.baseline < cam.y + view.h + 60;
    });
    const pool = near.length ? near : trees;
    const t = pool[irand(0, pool.length - 1)];
    leaves.push({
      x: t.x + rand(-8, 8),                    // 树冠范围内
      y: t.baseline - 30 + rand(2, 15),
      landY: t.baseline - 2 + rand(0, 6),      // 落在树脚附近的地面上
      sway: rand(1.5, 2.6),                    // 左右摇摆频率
      phase: rand(0, Math.PI * 2),
      vy: rand(9, 15),                         // 下落速度
      spin: rand(2.2, 3.6),                    // 旋转频率
      t: 0, settled: 0,
      // 大部分是树冠的绿色，偶尔一片暖橙（风筝色板）点缀秋意
      color: Math.random() < 0.18 ? C.kiteA : LEAF_COLORS[irand(0, LEAF_COLORS.length - 1)]
    });
    stats.leafSpawned++;
  }

  function updateLeaves(dt) {
    for (let i = leaves.length - 1; i >= 0; i--) {
      const l = leaves[i];
      l.t += dt;
      if (l.settled > 0) {
        l.settled += dt;
        if (l.settled >= 0.9) leaves.splice(i, 1);
        continue;
      }
      l.y += l.vy * dt;
      l.x += Math.sin(l.t * l.sway + l.phase) * 8 * dt;   // 飘
      if (l.y >= l.landY) { l.y = l.landY; l.settled = 0.001; }
    }
    const falling = leaves.filter(function (l) { return l.settled <= 0; })[0];
    if (falling) {                 // 调试观察：第一片下落中树叶的位置
      stats.lx = Math.round(falling.x);
      stats.ly = Math.round(falling.y);
    } else {
      stats.lx = null; stats.ly = null;
    }
  }

  // ----------------------------------------------------------
  //  室内微光尘埃：3~5 个缓慢漂浮、忽明忽暗的微粒
  // ----------------------------------------------------------
  function spawnDust() {
    const n = irand(3, 5);
    for (let i = 0; i < n; i++) {
      dust.push({
        x: rand(6, Math.max(7, sceneW - 6)),
        y: rand(6, Math.max(7, sceneH - 6)),
        phase: rand(0, Math.PI * 2),
        drift: rand(2.5, 5),
        tw: rand(0.5, 1.1)         // 闪烁频率
      });
    }
  }

  function updateDust(dt) {
    for (let i = 0; i < dust.length; i++) {
      const d = dust[i];
      d.x += Math.sin(time * 0.5 + d.phase) * d.drift * dt;
      d.y += Math.cos(time * 0.37 + d.phase * 1.7) * d.drift * 0.7 * dt;
      d.x = clamp(d.x, 4, sceneW - 4);
      d.y = clamp(d.y, 4, sceneH - 4);
    }
  }

  // ----------------------------------------------------------
  //  更新入口
  // ----------------------------------------------------------
  function update(dt) {
    try {
      if (!(dt > 0) || !isFinite(dt)) dt = 0.016;
      if (dt > 0.12) dt = 0.12;    // 切后台回来时不跳变
      const st = getState();
      if (!st) return;
      const info = sceneInfo(st);
      if (!info) { resetElements(); sceneKey = null; stats.scene = null; return; }
      if (info.key !== sceneKey) syncScene(info);   // 场景切换感知
      stats.scene = sceneKey;

      viewTimer -= dt;
      if (viewTimer <= 0) { refreshView(); viewTimer = 1; }

      if (reducedMotion(st)) { resetElements(); return; }   // 减少动态：全部隐藏

      time += dt;
      ensurePopulation(dt);

      if (indoor) {                // 室内：只有微光尘埃
        updateDust(dt);
        stats.active = dust.length;
        stats.dust = dust.length;
        return;
      }

      updateButterflies(dt);

      birdTimer -= dt;
      if (birdTimer <= 0) { spawnBirdFlock(); birdTimer = rand(20, 40); }
      updateBirds(dt);

      fishTimer -= dt;
      if (fishTimer <= 0) { spawnFish(); fishTimer = rand(7, 16); }
      updateFish(dt);
      updateSprays(dt);
      updateRipples(dt);

      leafTimer -= dt;
      if (leafTimer <= 0) { spawnLeaf(); leafTimer = rand(2.5, 6); }
      updateLeaves(dt);

      stats.active = countActive();
      stats.butterflies = butterflies.length;
      stats.birds = birds.length;
      stats.leaves = leaves.length;
    } catch (e) { /* 氛围层任何异常都不允许影响游戏本体 */ }
  }

  // ----------------------------------------------------------
  //  绘制（全部 fillRect 像素块；坐标取整保证锐利）
  // ----------------------------------------------------------
  function drawButterflies(g) {
    for (let i = 0; i < butterflies.length; i++) {
      const b = butterflies[i];
      const x = Math.round(b.x);
      const y = Math.round(b.y + Math.sin(time * 2 + b.bob));
      g.fillStyle = C.outline;
      g.fillRect(x, y, 1, 2);                       // 身体
      g.fillStyle = b.color;
      if (b.wing === 0) {                           // 展翅
        g.fillRect(x - 1, y - 1, 1, 2);
        g.fillRect(x + 1, y - 1, 1, 2);
        g.fillRect(x - 1, y - 2, 1, 1);
        g.fillRect(x + 1, y - 2, 1, 1);
      } else {                                      // 收翅
        g.fillRect(x - 1, y, 1, 1);
        g.fillRect(x + 1, y, 1, 1);
      }
    }
  }

  function drawBirds(g) {
    g.fillStyle = C.outline;                        // 高空剪影
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      const x = Math.round(b.x);
      const y = Math.round(b.y + Math.sin(time * 2.2 + b.bob));
      g.fillRect(x, y, 1, 1);                       // 身体
      if (b.wing === 0) {
        g.fillRect(x - 1, y - 1, 1, 1);
        g.fillRect(x + 1, y - 1, 1, 1);
      } else {
        g.fillRect(x - 1, y + 1, 1, 1);
        g.fillRect(x + 1, y + 1, 1, 1);
      }
    }
  }

  function drawFish(g) {
    for (let i = 0; i < fish.length; i++) {
      const f = fish[i];
      const p = clamp(f.t / f.dur, 0, 1);
      const x = Math.round(f.x0 + f.dx * p);
      const y = Math.round(f.y0 - Math.sin(p * Math.PI) * f.hop);
      const dir = f.dx >= 0 ? 1 : -1;
      g.fillStyle = C.metal;                        // 银灰鱼身
      g.fillRect(x - 1, y, 3, 1);
      g.fillStyle = C.outline;                      // 尾（在行进反侧）
      g.fillRect(x - dir * 2, y, 1, 1);
      g.fillStyle = C.foam;                         // 身下一点水光
      g.fillRect(x - dir, y + 2, 1, 1);
    }
  }

  function drawSprays(g) {
    g.fillStyle = C.foam;
    for (let i = 0; i < sprays.length; i++) {
      g.fillRect(Math.round(sprays[i].x), Math.round(sprays[i].y), 1, 1);
    }
  }

  function rippleRing(g, cx, cy, r, color, alpha) {
    if (r <= 0.4) return;
    g.globalAlpha = clamp(alpha, 0, 1);
    g.fillStyle = color;
    const n = Math.max(8, Math.round(r * 7));
    const ry = Math.max(1, r * 0.42);               // 压扁成水面椭圆
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * ry), 1, 1);
    }
    g.globalAlpha = 1;
  }

  function drawRipples(g) {
    for (let i = 0; i < ripples.length; i++) {
      const r = ripples[i];
      const p = clamp(r.t / r.dur, 0, 1);
      const fade = 1 - p;
      rippleRing(g, r.x, r.y, 1 + p * 5.5, C.foam, 0.8 * fade);
      if (p > 0.3) rippleRing(g, r.x, r.y, (p - 0.3) * 7, C.waterC, 0.55 * fade);
    }
  }

  function drawLeaves(g) {
    for (let i = 0; i < leaves.length; i++) {
      const l = leaves[i];
      const x = Math.round(l.x), y = Math.round(l.y);
      g.globalAlpha = l.settled > 0 ? clamp(1 - l.settled / 0.9, 0, 1) : 1;
      g.fillStyle = l.color;
      const ph = l.settled > 0 ? 0 : Math.floor(l.t * l.spin) % 4;
      if (ph === 0 || ph === 2) {                   // 横向
        g.fillRect(x - 1, y, 2, 1);
        g.fillRect(x, y + 1, 1, 1);
      } else {                                      // 纵向（旋转中的另一帧）
        g.fillRect(x, y - 1, 1, 2);
        g.fillRect(x + 1, y, 1, 1);
      }
      g.globalAlpha = 1;
    }
  }

  function drawDust(g) {
    for (let i = 0; i < dust.length; i++) {
      const d = dust[i];
      const a = 0.3 + 0.45 * (0.5 + 0.5 * Math.sin(time * d.tw + d.phase));
      const x = Math.round(d.x), y = Math.round(d.y);
      g.fillStyle = C.warmLight;
      g.globalAlpha = clamp(a, 0.1, 0.75);
      g.fillRect(x, y, 1, 1);                     // 微粒本体
      g.globalAlpha = clamp(a * 0.4, 0.05, 0.3);  // 一圈极淡的暖光晕
      g.fillRect(x - 1, y, 1, 1);
      g.fillRect(x + 1, y, 1, 1);
      g.fillRect(x, y - 1, 1, 1);
      g.fillRect(x, y + 1, 1, 1);
      g.globalAlpha = 1;
    }
  }

  // ----------------------------------------------------------
  //  绘制入口：layer 'ground'（实体之下）| 'top'（实体之上）
  // ----------------------------------------------------------
  function draw(ctx, layer) {
    try {
      if (!ctx) return;
      captureTransform(ctx);      // 从渲染矩阵自校准可视区与相机
      const st = getState();
      if (!st || reducedMotion(st)) return;
      const info = sceneInfo(st);
      if (!info) return;
      if (info.key !== sceneKey) syncScene(info);   // update 未跑到时也保持一致

      if (layer === 'ground') {
        if (!indoor) drawRipples(ctx);              // 涟漪贴着水面
      } else if (layer === 'top') {
        if (indoor) {
          drawDust(ctx);
        } else {
          drawLeaves(ctx);
          drawButterflies(ctx);
          drawFish(ctx);
          drawSprays(ctx);
          drawBirds(ctx);
        }
      }
    } catch (e) { /* 绝不影响游戏渲染 */ }
  }

  // ----------------------------------------------------------
  //  初始化：游戏启动后由主线程调用一次
  // ----------------------------------------------------------
  function init() {
    try {
      refreshView();
      const st = getState();
      if (!st) return;
      const info = sceneInfo(st);
      if (info) syncScene(info);
    } catch (e) { /* 防御 */ }
  }

  return {
    init: init,
    update: update,
    draw: draw,
    // —— 以下仅供调试 / 测试观察，主线程不会依赖 ——
    _stats: stats
  };
})();
