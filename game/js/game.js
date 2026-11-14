// ===============================================================
//  人生探索游戏 · 引擎
//  依赖：sprites.js（PixelArt）、audio.js（GameAudio）、save.js（GameSave）、
//        data/*.js（LIFE_DATA）。全部原生 JS，无任何第三方依赖。
//
//  模式（mode）：intro（开场）/ explore（自由移动）/ dialogue（对话中，
//  移动锁定）/ panel（面板打开，移动锁定）。
// ===============================================================
(function () {
  'use strict';

  const DATA = window.LIFE_DATA;
  const TILE = window.PixelArt.TILE;
  const PLAYER_SPEED = 74;        // 逻辑像素/秒
  const INTERACT_RADIUS = 30;     // 互动判定半径（逻辑像素）
  const SAVE_INTERVAL = 8000;     // 位置自动保存间隔 ms

  // ----------------------------------------------------------
  //  小工具
  // ----------------------------------------------------------
  const $ = function (id) { return document.getElementById(id); };
  const el = function (tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  };
  const reducedMotionDefault = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ----------------------------------------------------------
  //  全局状态
  // ----------------------------------------------------------
  const G = {
    mode: 'intro',
    art: null,
    scene: null,          // 当前场景运行时对象
    player: { x: 0, y: 0, dir: 'down', moving: false, animT: 0, frame: 0, stepT: 0 },
    camera: { x: 0, y: 0 },
    keys: {},             // 键盘 + 虚拟按键
    interactTarget: null,
    save: window.GameSave.load(),
    dialogue: null,       // {nodes, index, typing, timer, done}
    time: 0,
    lastFrame: 0,
    saveTimer: 0,
    settings: window.GameSave.load().settings,
    discovered: new Set(window.GameSave.load().discovered || []),
    bookDirty: false
  };

  // ----------------------------------------------------------
  //  数据视图（启动时建立，带降级处理）
  // ----------------------------------------------------------
  function memoryById(id) {
    return (DATA.memories || []).find(function (m) { return m.id === id; }) || null;
  }
  const publishedMemories = (DATA.memories || []).filter(function (m) {
    return m && m.status === 'published';
  });
  function sceneById(id) {
    return (DATA.scenes && DATA.scenes[id]) || null;
  }
  function chapterOf(memory) {
    return (DATA.chapters || []).find(function (c) { return c.id === memory.chapterId; }) || null;
  }
  function dialogueById(id) {
    if (!id) return null;
    return (DATA.dialogues && DATA.dialogues[id]) || null;
  }

  // ----------------------------------------------------------
  //  场景装载
  // ----------------------------------------------------------
  function loadScene(sceneId, spawnKey, savedPos) {
    const def = sceneById(sceneId) || sceneById('village');
    if (!def) { showFallback('场景数据缺失'); return; }

    const legend = Object.assign({}, DATA.scenes.legend || {}, def.legend || {});
    const rows = def.map || [];
    const cols = rows[0] ? rows[0].length : 0;
    const W = cols * TILE, H = rows.length * TILE;

    // 1. 地面层（静态，画进离屏画布缓存）。
    //    画布向四周多延伸 PAD_T 格（按边界地块平铺延伸）——
    //    配合下面的「填满视口」缩放策略，任何窗口尺寸都不会露出黑边
    const PAD_T = 6;
    const PAD = PAD_T * TILE;
    const [ground, gg] = (() => {
      const c = document.createElement('canvas');
      c.width = W + PAD * 2; c.height = H + PAD * 2;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      return [c, g];
    })();

    const waterCells = [];
    const entities = [];
    const colliders = [];
    const interactZones = [];

    for (let r = -PAD_T; r < rows.length + PAD_T; r++) {
      for (let c0 = -PAD_T; c0 < cols + PAD_T; c0++) {
        // 边界外：取该行/列最靠边的地块向外观测平铺（水面/草地自然延续）
        const sr = Math.min(Math.max(r, 0), rows.length - 1);
        const sc = Math.min(Math.max(c0, 0), cols - 1);
        const ch = (rows[sr] || '')[sc] || '.';
        const spec = legend[ch] || legend['.'] || { tile: 'grass' };
        const x = c0 * TILE, y = r * TILE;
        const gx = x + PAD, gy = y + PAD;
        // 碰撞要先于 water 分支登记 —— 水面必须挡路；
        // 但延伸区不登记碰撞（玩家被边界墙拦在地图内，延伸只是视觉）
        const inside = r >= 0 && r < rows.length && c0 >= 0 && c0 < cols;
        if (inside && spec.solid) colliders.push({ x: x, y: y, w: TILE, h: TILE });
        if (spec.water) { waterCells.push([c0, r]); continue; }
        const img = G.art.tiles[spec.tile];
        if (img) gg.drawImage(img, gx, gy);
        if (inside && spec.entity) {
          const ent = makeEntity(spec.entity, c0, r);
          if (ent) {
            entities.push(ent);
            if (ent.collider) colliders.push(ent.collider);
          }
        }
      }
    }
    // 地图四边的隐形墙：玩家不能走出原始地图范围
    colliders.push({ x: -2, y: -2, w: W + 4, h: 2 });
    colliders.push({ x: -2, y: H, w: W + 4, h: 2 });
    colliders.push({ x: -2, y: -2, w: 2, h: H + 4 });
    colliders.push({ x: W, y: -2, w: 2, h: H + 4 });

    // 2. 人物实体
    const characters = def.characters || [];
    for (const conf of characters) {
      const cd = (DATA.characters || {})[conf.id];
      if (!cd) continue;
      const sprite = G.art.npc[cd.sprite] || G.art.npc['npc-painter'];
      const px0 = conf.at[0] * TILE, py0 = conf.at[1] * TILE;
      const ent = {
        kind: 'npc', sprite: sprite, x: px0 + TILE / 2, baseline: py0 + TILE,
        drawW: 16, drawH: 20, dir: 'down', bobSeed: (conf.at[0] * 7 + conf.at[1] * 13) % 10,
        label: cd.name, isDemo: !!cd.isDemo, npcId: cd.id,
        faceDir: 'down', facing: null
      };
      ent.collider = { x: px0 + 2, y: py0 + 4, w: TILE - 4, h: TILE - 6 };
      colliders.push(ent.collider);
      entities.push(ent);
      // 人物自带对话交互
      interactZones.push({
        id: 'npc-' + cd.id, kind: 'npc', ent: ent,
        cx: px0 + TILE / 2, cy: py0 + TILE / 2,
        type: 'dialogue', dialogueId: cd.dialogueId,
        hint: cd.name, isDemo: !!cd.isDemo
      });
    }

    // 3. 互动对象（挂到对应坐标的实体上，或独立成区域）
    for (const conf of (def.interactables || [])) {
      const at = conf.at;
      if (!at) continue;
      const cx = at[0] * TILE + TILE / 2, cy = at[1] * TILE + TILE / 2;
      const ent = entities.find(function (e) {
        return e.tileX === at[0] && e.tileY === at[1];
      }) || null;
      interactZones.push({
        id: conf.id, kind: ent ? ent.kind : 'zone', ent: ent,
        cx: cx, cy: cy, type: conf.type, dialogueId: conf.dialogueId,
        memoryId: conf.memoryId, url: conf.url, linkLabel: conf.linkLabel,
        toScene: conf.toScene, spawn: conf.spawn,
        hint: conf.hint || '查看', isDemo: !!conf.isDemo
      });
      // 门口等无实体对象：不添加碰撞
    }

    // 4. 出生点
    let spawn = null;
    const sp = def.spawnPoints || {};
    if (savedPos && savedPos.x >= 0 && savedPos.y >= 0 && savedPos.x < W && savedPos.y < H) {
      spawn = { x: savedPos.x, y: savedPos.y };
    } else {
      const key = (spawnKey && sp[spawnKey]) ? spawnKey : 'default';
      const at = sp[key] || sp['default'] || [Math.floor(cols / 2), Math.floor(rows / 2)];
      spawn = { x: at[0] * TILE + TILE / 2, y: at[1] * TILE + TILE - 4 };
    }
    // 出生点落在碰撞里时，向下方逐格找一个空位
    while (hitsAny(colliders, spawn.x - 5, spawn.y - 6, 10, 6) && spawn.y < H) {
      spawn.y += TILE;
    }

    G.PAD = PAD;
    G.scene = {
      def: def, id: def.id, W: W, H: H,
      ground: ground, waterCells: waterCells,
      entities: entities, colliders: colliders,
      interactZones: interactZones,
      entitySprites: null
    };
    G.player.x = spawn.x; G.player.y = spawn.y;
    G.player.dir = 'down'; G.player.moving = false;
    G.camera.x = cameraTarget(G.player.x, W, viewW());
    G.camera.y = cameraTarget(G.player.y, H, viewH());
    G.interactTarget = null;

    $('hud-location').textContent = def.name || def.id;
    G.save.sceneId = def.id;
    G.save.pos = { x: spawn.x, y: spawn.y };
    queueSave();
  }

  function makeEntity(kind, c0, r) {
    const ents = G.art.entities;
    const spec = {
      tree:  { img: ents.tree[(c0 + r) % 2], w: 24, h: 32, dx: -4, solid: true,  sways: true },
      bush:  { img: ents.bush,  w: 16, h: 14, dx: 0,  solid: false },
      stone: { img: ents.stone, w: 14, h: 10, dx: 1,  solid: false },
      fence: { img: ents.fence, w: 16, h: 16, dx: 0,  solid: true },
      lamp:  { img: ents.lamp,  w: 12, h: 26, dx: -2, solid: true },
      sign:  { img: ents.sign,  w: 18, h: 18, dx: -1, solid: false },
      chest: { img: ents.chest, w: 16, h: 13, dx: 0,  solid: false },
      kite:  { img: ents.kite,  w: 16, h: 15, dx: 0,  solid: false },
      bed:   { img: ents.bed,   w: 16, h: 26, dx: 0,  solid: true },
      desk:  { img: ents.desk,  w: 22, h: 16, dx: -3, solid: true },
      shelf: { img: ents.shelf, w: 16, h: 20, dx: 0,  solid: true },
      // —— 建筑素材库（村落 / 县城 / 城市内容包）——
      selfhouse:  { img: ents.selfhouse,  w: 24, h: 28, dx: -4,  solid: true, big: true },
      resident:   { img: ents.resident,   w: 28, h: 46, dx: -6,  solid: true, big: true },
      shop:       { img: ents.shop,       w: 26, h: 26, dx: -5,  solid: true, big: true },
      store:      { img: ents.store,      w: 20, h: 22, dx: -2,  solid: true, big: true },
      schoolgate: { img: ents.schoolgate, w: 40, h: 16, dx: -12, solid: true, big: true },
      school:     { img: ents.school,     w: 44, h: 38, dx: -14, solid: true, big: true },
      office:     { img: ents.office,     w: 36, h: 54, dx: -10, solid: true, big: true },
      cw:         { img: ents.cw,         w: 22, h: 40, dx: -3,  solid: true, big: true },
      busstop:    { img: ents.busstop,    w: 26, h: 18, dx: -5,  solid: true },
      tlight:     { img: ents.tlight,     w: 12, h: 26, dx: -2,  solid: true },
      conv:       { img: ents.conv,       w: 18, h: 24, dx: -1,  solid: true, big: true }
    }[kind];
    if (!spec) return null;
    const ent = {
      kind: kind, img: spec.img, tileX: c0, tileY: r,
      x: c0 * TILE + TILE / 2 + spec.dx,           // 绘制中心 x
      baseline: (r + 1) * TILE,                    // 绘制底边 y（排序键，贴地块下沿）
      drawW: spec.w, drawH: spec.h,
      sways: !!spec.sways, swaySeed: (c0 * 13 + r * 7) % 10,
      label: kind
    };
    if (spec.solid) {
      if (spec.big) {
        // 大型建筑：整个占地区域都是实体（符合俯视角建筑习惯）
        ent.collider = {
          x: c0 * TILE + TILE / 2 + spec.dx - spec.w / 2 + 1,
          y: (r + 1) * TILE - spec.h + 2,
          w: spec.w - 2,
          h: spec.h - 4
        };
      } else {
        // 实体碰撞：盖住其所在地块（树干 / 家具等）
        ent.collider = { x: c0 * TILE + 2, y: r * TILE + 4, w: TILE - 4, h: TILE - 6 };
      }
    }
    return ent;
  }

  // ----------------------------------------------------------
  //  碰撞
  // ----------------------------------------------------------
  function hitsAny(colliders, x, y, w, h) {
    for (const c of colliders) {
      if (x < c.x + c.w && x + w > c.x && y < c.y + c.h && y + h > c.y) return true;
    }
    return false;
  }
  function playerBlocked(x, y) {
    return hitsAny(G.scene.colliders, x - 5, y - 6, 10, 6);
  }

  // ----------------------------------------------------------
  //  视图 / 相机
  // ----------------------------------------------------------
  const canvas = $('game-canvas');
  const ctx = canvas.getContext('2d');
  let viewScale = 3, dpr = 1;

  function viewW() { return canvas.width / (viewScale * dpr); }
  function viewH() { return canvas.height / (viewScale * dpr); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    // 缩放策略：画面铺满整个界面 —— 取能覆盖视口的最小整数倍
    // （地图×倍率 ≥ 视口），无黑边且保持像素锐利；上限 7 防止过分放大
    if (G.scene && G.scene.W) {
      const need = Math.max(cssW / G.scene.W, cssH / G.scene.H);
      viewScale = Math.max(2, Math.min(7, Math.ceil(need)));
    } else {
      viewScale = 3;
    }
    ctx.imageSmoothingEnabled = false;
  }

  // ----------------------------------------------------------
  //  输入
  // ----------------------------------------------------------
  const KEYMAP = {
    'KeyW': 'up', 'ArrowUp': 'up',
    'KeyS': 'down', 'ArrowDown': 'down',
    'KeyA': 'left', 'ArrowLeft': 'left',
    'KeyD': 'right', 'ArrowRight': 'right'
  };

  function onKeyDown(e) {
    if (e.repeat) { if (KEYMAP[e.code] || e.code === 'Space') e.preventDefault(); return; }
    window.GameAudio.unlock();

    if (e.code === 'Escape') {
      if (G.mode === 'dialogue') { closeDialogue(); }
      else if (G.mode === 'panel') { closePanel(); }
      e.preventDefault();
      return;
    }
    if (KEYMAP[e.code]) {
      G.keys[KEYMAP[e.code]] = true;
      e.preventDefault();
      return;
    }
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
      e.preventDefault();
      if (G.mode === 'dialogue') { advanceDialogue(); }
      else if (G.mode === 'explore') { doInteract(); }
      return;
    }
  }

  function onKeyUp(e) {
    if (KEYMAP[e.code]) { G.keys[KEYMAP[e.code]] = false; e.preventDefault(); }
  }

  // 移动方向向量（键盘 + 虚拟摇杆）
  function inputVector() {
    let dx = 0, dy = 0;
    if (G.keys.left) dx -= 1;
    if (G.keys.right) dx += 1;
    if (G.keys.up) dy -= 1;
    if (G.keys.down) dy += 1;
    return [dx, dy];
  }

  // ----------------------------------------------------------
  //  更新
  // ----------------------------------------------------------
  function update(dt) {
    G.time += dt;
    if (G.mode === 'explore') {
      const [dx, dy] = inputVector();
      const moving = dx !== 0 || dy !== 0;
      G.player.moving = moving;
      if (moving) {
        // 斜向速度归一
        const len = Math.hypot(dx, dy);
        const vx = dx / len * PLAYER_SPEED * dt;
        const vy = dy / len * PLAYER_SPEED * dt;
        // 先 X 后 Y，允许贴墙滑动
        if (!playerBlocked(G.player.x + vx, G.player.y)) G.player.x += vx;
        if (!playerBlocked(G.player.x, G.player.y + vy)) G.player.y += vy;

        // 朝向取绝对值较大的轴
        if (Math.abs(dx) > Math.abs(dy)) G.player.dir = dx > 0 ? 'right' : 'left';
        else G.player.dir = dy > 0 ? 'down' : 'up';

        G.player.animT += dt;
        G.player.frame = Math.floor(G.player.animT / 0.16) % 2 + 1;
        G.player.stepT += dt;
        if (G.player.stepT > 0.3) { G.player.stepT = 0; window.GameAudio.step(); }

        G.save.pos = { x: G.player.x, y: G.player.y };
      } else {
        G.player.frame = 0;
        G.player.animT = 0;
      }

      // 最近的可互动对象
      let best = null, bestD = INTERACT_RADIUS;
      for (const z of G.scene.interactZones) {
        const d = Math.hypot(z.cx - G.player.x, z.cy - (G.player.y - 8));
        if (d < bestD) { best = z; bestD = d; }
      }
      G.interactTarget = best;
      updateHint();
    }

    // 相机跟随；地图小于视口时把地图整体居中（负偏移）
    const tx = cameraTarget(G.player.x, G.scene.W, viewW());
    const ty = cameraTarget(G.player.y, G.scene.H, viewH());
    const lerp = reducedMotion() ? 1 : 0.14;
    G.camera.x += (tx - G.camera.x) * lerp;
    G.camera.y += (ty - G.camera.y) * lerp;

    // 氛围动画层
    if (window.LGAmbience) window.LGAmbience.update(dt);

    // 自动存档
    G.saveTimer += dt * 1000;
    if (G.saveTimer > SAVE_INTERVAL) { G.saveTimer = 0; queueSave(); }
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function cameraTarget(pos, mapSize, viewSize) {
    if (mapSize < viewSize) return -(viewSize - mapSize) / 2; // 小地图居中
    return clamp(pos - viewSize / 2, 0, mapSize - viewSize);
  }
  function reducedMotion() {
    return G.settings.reducedMotion === null
      ? reducedMotionDefault
      : !!G.settings.reducedMotion;
  }

  // ----------------------------------------------------------
  //  渲染
  // ----------------------------------------------------------
  function render() {
    const k = viewScale * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#2a2018';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(k, 0, 0, k, 0, 0);

    const camX = Math.round(G.camera.x), camY = Math.round(G.camera.y);
    ctx.translate(-camX, -camY);

    // 地面（含四周延伸区）
    ctx.drawImage(G.scene.ground, -G.PAD, -G.PAD);

    // 水面（动画帧）
    const wframes = G.art.tiles.water;
    const wf = reducedMotion() ? 0 : Math.floor(G.time / 0.45) % wframes.length;
    for (const [c0, r] of G.scene.waterCells) {
      ctx.drawImage(wframes[(wf + c0 * 3 + r * 7) % wframes.length], c0 * TILE, r * TILE);
    }

    // 氛围层：实体之下（水面涟漪等）
    if (window.LGAmbience) window.LGAmbience.draw(ctx, 'ground');

    // 可见范围内的实体 + 玩家，按 y 排序绘制（遮挡关系）
    const list = [];
    const pad = 48;
    for (const e of G.scene.entities) {
      if (e.baseline < camY - pad || e.baseline > camY + viewH() + pad) continue;
      if (e.x < camX - pad || e.x > camX + viewW() + pad) continue;
      list.push(e);
    }
    list.push({
      kind: 'player', x: G.player.x, baseline: G.player.y,
      img: G.art.player[G.player.dir][G.player.frame],
      drawW: 16, drawH: 20
    });
    list.sort(function (a, b) { return a.baseline - b.baseline; });

    // 先画所有影子
    for (const e of list) {
      ctx.drawImage(G.art.shadow, e.x - 7, e.baseline - 2);
    }

    for (const e of list) {
      let ox = 0;
      if (e.sways && !reducedMotion()) {
        ox = Math.sin(G.time / 1.4 + e.swaySeed) > 0 ? 0.5 : 0; // 轻微摇曳
      }
      let img = e.img;
      if (e.kind === 'npc') {
        img = e.sprite[e.faceDir || 'down'][0];
      }
      const bob = e.kind === 'npc' && !reducedMotion()
        ? (Math.sin(G.time / 0.6 + e.bobSeed) > 0 ? -1 : 0) : 0;
      ctx.drawImage(img, Math.round(e.x - e.drawW / 2 + ox), Math.round(e.baseline - e.drawH + bob));
    }

    // 互动提示标记（在目标上方轻跳）
    const showMarkers = !reducedMotion() ? 1 : 0;
    for (const z of G.scene.interactZones) {
      const mx = z.cx, my = z.cy;
      if (mx < camX - 16 || mx > camX + viewW() + 16) continue;
      if (my < camY - 16 || my > camY + viewH() + 16) continue;
      const bobY = showMarkers ? Math.round(Math.sin(G.time / 0.35 + mx) * 1.5) : 0;
      ctx.drawImage(G.art.marker, Math.round(mx - 4), Math.round(my - 26 + bobY));
    }

    // 氛围层：最上方（飞鸟/蝴蝶/落叶/水花）
    if (window.LGAmbience) window.LGAmbience.draw(ctx, 'top');

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ----------------------------------------------------------
  //  互动
  // ----------------------------------------------------------
  function updateHint() {
    const hint = $('hint');
    const t = G.interactTarget;
    if (!t || G.mode !== 'explore') { hint.hidden = true; return; }
    const isMobile = document.body.classList.contains('touch');
    hint.textContent = (isMobile ? '点 ● ' : '按 E · ') + (t.hint || '查看');
    hint.hidden = false;
  }

  function doInteract() {
    const t = G.interactTarget;
    if (!t) return;
    if (t.kind === 'npc' && t.ent) t.ent.faceDir = faceTowards(t.ent);
    window.GameAudio.blip();
    switch (t.type) {
      case 'dialogue': openDialogue(t.dialogueId, null); break;
      case 'memory':
        if (t.dialogueId) openDialogue(t.dialogueId, t.memoryId);
        else discoverMemory(t.memoryId);
        break;
      case 'link':
        if (t.dialogueId) openDialogue(t.dialogueId, null);
        else if (t.url) window.open(t.url, '_blank', 'noopener');
        break;
      case 'chapterMap': openPanel('map'); break;
      case 'scene': switchScene(t.toScene, t.spawn); break;
      default: toast('（这个物件还没有内容。）');
    }
  }

  function faceTowards(ent) {
    const dx = G.player.x - ent.x, dy = G.player.y - ent.baseline + 10;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  function switchScene(toScene, spawnKey) {
    if (!sceneById(toScene)) { toast('（场景还在搭建中。）'); return; }
    window.GameAudio.warp();
    const doSwitch = function () {
      loadScene(toScene, spawnKey || 'default', null);
      G.save.sceneId = toScene;
      G.save.pos = { x: G.player.x, y: G.player.y };
      queueSave();
    };
    if (reducedMotion()) { doSwitch(); return; }
    const fade = $('fade');
    fade.classList.add('on');
    setTimeout(function () {
      doSwitch();
      setTimeout(function () { fade.classList.remove('on'); }, 120);
    }, 180);
  }

  // ----------------------------------------------------------
  //  对话
  // ----------------------------------------------------------
  function openDialogue(dialogueId, memoryIdToUnlock) {
    const dlg = dialogueById(dialogueId);
    let nodes;
    if (dlg && Array.isArray(dlg.nodes) && dlg.nodes.length) {
      nodes = dlg.nodes;
    } else {
      nodes = [{ text: '（这段对话还没有写好。等故事整理好后会出现在这里。）', end: true }];
    }
    const t = G.interactTarget;
    G.dialogue = {
      nodes: nodes, index: 0, typing: true, timer: null,
      memoryId: memoryIdToUnlock || null, linkNode: null,
      // 说话人：演示人物这类 NPC 对话用人物名署名，其余为旁白
      speaker: (t && t.kind === 'npc') ? (t.hint || '') : ''
    };
    G.mode = 'dialogue';
    $('hint').hidden = true;
    renderDialogueNode();
    $('dialogue').hidden = false;
    window.GameAudio.open();
  }

  function renderDialogueNode() {
    const d = G.dialogue;
    const node = d.nodes[d.index];
    if (!node) { closeDialogue(); return; }
    const box = $('dialogue');
    const speaker = $('dlg-name');
    speaker.textContent = d.speaker || '';
    speaker.hidden = !d.speaker;

    const demoTag = $('dlg-demo');
    demoTag.hidden = !currentIsDemo();

    // 节点自带 memoryId：读到这一句就收录（分支对话各自解锁各自的回忆）
    if (node.memoryId) discoverMemory(node.memoryId);

    d.typing = true;
    d.fullText = node.text || '……';
    d.shown = 0;
    const textEl = $('dlg-text');
    textEl.textContent = '';
    $('dlg-choices').innerHTML = '';
    $('dlg-more').hidden = true;

    const linkArea = $('dlg-link');
    linkArea.innerHTML = '';
    d.linkNode = node.link && node.link.url ? node.link : null;
    if (d.linkNode) {
      const a = el('a', 'dlg-link-btn', d.linkNode.label || '打开链接');
      a.href = d.linkNode.url;
      a.target = '_blank';
      a.rel = 'noopener';
      linkArea.appendChild(a);
    }

    if (reducedMotion()) { finishTyping(); return; }
    const typeStep = function () {
      if (!G.dialogue || !G.dialogue.typing) return;
      d.shown += 2;
      if (d.shown >= d.fullText.length) { finishTyping(); return; }
      textEl.textContent = d.fullText.slice(0, d.shown);
      d.timer = setTimeout(typeStep, 24);
    };
    d.timer = setTimeout(typeStep, 24);
  }

  function finishTyping() {
    const d = G.dialogue;
    if (!d) return;
    clearTimeout(d.timer);
    d.typing = false;
    $('dlg-text').textContent = d.fullText;
    const node = d.nodes[d.index];
    const choices = $('dlg-choices');
    choices.innerHTML = '';
    if (Array.isArray(node.choices) && node.choices.length) {
      for (const ch of node.choices) {
        const b = el('button', 'dlg-choice', ch.label);
        b.addEventListener('click', function (ev) {
          ev.stopPropagation();
          window.GameAudio.advance();
          d.index = ch.next !== undefined ? ch.next : d.index + 1;
          renderDialogueNode();
        });
        choices.appendChild(b);
      }
      $('dlg-more').hidden = true;
    } else if (!node.end) {
      $('dlg-more').hidden = false;
    }
    if (node.end) $('dlg-more').hidden = false;
  }

  function currentIsDemo() {
    const t = G.interactTarget;
    return !!(t && t.isDemo);
  }

  function advanceDialogue() {
    const d = G.dialogue;
    if (!d) return;
    const node = d.nodes[d.index];
    if (d.typing) { finishTyping(); return; }
    if (Array.isArray(node.choices) && node.choices.length) return; // 等选择
    if (node.end) { closeDialogue(); return; }
    window.GameAudio.advance();
    d.index = node.next !== undefined ? node.next : d.index + 1;
    if (d.index >= d.nodes.length) { closeDialogue(); return; }
    renderDialogueNode();
  }

  function closeDialogue() {
    const d = G.dialogue;
    if (d) {
      clearTimeout(d.timer);
      if (d.memoryId) discoverMemory(d.memoryId);
    }
    G.dialogue = null;
    G.mode = 'explore';
    $('dialogue').hidden = true;
    window.GameAudio.close();
  }

  $('dialogue').addEventListener('click', function (e) {
    if (e.target.closest('.dlg-choice') || e.target.closest('.dlg-link-btn') ||
        e.target.closest('.dlg-close')) return;
    if (G.mode === 'dialogue') advanceDialogue();
  });
  $('dlg-close').addEventListener('click', function (e) {
    e.stopPropagation();
    closeDialogue();
  });

  // ----------------------------------------------------------
  //  回忆收录
  // ----------------------------------------------------------
  function discoverMemory(id) {
    if (!id || G.discovered.has(id)) return;
    const mem = memoryById(id);
    if (!mem || mem.status !== 'published') return; // 草稿/缺失不收录
    G.discovered.add(id);
    G.save.discovered = Array.from(G.discovered);
    G.bookDirty = true;
    updateBookBadge();
    window.GameAudio.chime();
    toast('已收录到回忆手册：《' + (mem.title || id) + '》');
    queueSave();
  }

  // ----------------------------------------------------------
  //  面板（人生地图 / 回忆手册 / 设置 / 帮助）
  // ----------------------------------------------------------
  let activePanel = null;

  function openPanel(name) {
    activePanel = name;
    G.mode = 'panel';
    $('hint').hidden = true;
    const body = $('panel-body');
    body.innerHTML = '';
    if (name === 'map') buildMapPanel(body);
    else if (name === 'book') buildBookPanel(body);
    else if (name === 'settings') buildSettingsPanel(body);
    else buildHelpPanel(body);
    $('panel').hidden = false;
    $('panel').scrollTop = 0;
    window.GameAudio.open();
  }

  function closePanel() {
    activePanel = null;
    G.mode = 'explore';
    $('panel').hidden = true;
    window.GameAudio.close();
  }

  function panelHeader(title) {
    const head = el('div', 'panel-head');
    const h = el('h2', 'panel-title', title);
    const close = el('button', 'panel-close btn-pixel', '×');
    close.setAttribute('aria-label', '关闭');
    close.addEventListener('click', closePanel);
    head.appendChild(h);
    head.appendChild(close);
    return head;
  }

  // —— 人生地图 ——
  function buildMapPanel(root) {
    root.appendChild(panelHeader('人生地图'));
    const note = el('p', 'panel-note', '章节按时间顺序排列。标着「故事待续」的章节还没有写下正文，等主人整理好就会点亮。');
    root.appendChild(note);

    for (const ch of (DATA.chapters || [])) {
      const card = el('div', 'chapter-card' + (ch.status === 'available' ? ' chapter-open' : ' chapter-locked'));
      const top = el('div', 'chapter-top');
      const title = el('h3', 'chapter-title', ch.title || '未命名章节');
      top.appendChild(title);
      const badges = el('span', 'chapter-badges');
      if (ch.isDemo) badges.appendChild(el('em', 'badge badge-demo', '演示'));
      badges.appendChild(el('em', 'badge ' + (ch.status === 'available' ? 'badge-open' : 'badge-soon'),
        ch.status === 'available' ? '可探索' : '故事待续'));
      top.appendChild(badges);
      card.appendChild(top);

      if (ch.period) card.appendChild(el('p', 'chapter-period', ch.period));
      if (ch.description) card.appendChild(el('p', 'chapter-desc', ch.description));
      else if (ch.status !== 'available') card.appendChild(el('p', 'chapter-desc chapter-desc-empty', '这一章的故事还没有写下。'));

      if (ch.status === 'available' && ch.sceneId && sceneById(ch.sceneId)) {
        const btn = el('button', 'btn-pixel btn-primary', '进入这个场景');
        btn.addEventListener('click', function () {
          closePanel();
          switchScene(ch.sceneId, 'default');
        });
        card.appendChild(btn);
      } else if (ch.status === 'available') {
        card.appendChild(el('p', 'chapter-desc chapter-desc-empty', '（这个章节还没有绑定场景。）'));
      }
      root.appendChild(card);
    }
  }

  // —— 回忆手册 ——
  function buildBookPanel(root) {
    root.appendChild(panelHeader('回忆手册'));
    const total = publishedMemories.length;
    const found = publishedMemories.filter(function (m) { return G.discovered.has(m.id); });

    const prog = el('p', 'book-progress');
    prog.appendChild(el('span', null, '已发现 ' + found.length + ' / ' + total + ' 段回忆。'));
    root.appendChild(prog);
    const bar = el('div', 'book-bar');
    const fill = el('div', 'book-bar-fill');
    fill.style.width = (total ? Math.round(found.length / total * 100) : 0) + '%';
    bar.appendChild(fill);
    root.appendChild(bar);

    if (!found.length) {
      root.appendChild(el('p', 'book-empty', '还没有发现任何回忆。去场景里走走，和物件、人物说说话吧。'));
    } else {
      const list = el('ul', 'book-list');
      for (const id of G.discovered) {
        const mem = memoryById(id);
        if (!mem || mem.status !== 'published') continue;
        const li = el('li', 'book-item');
        const ch = chapterOf(mem);
        li.appendChild(el('h3', 'book-item-title', mem.title || mem.id));
        li.appendChild(el('p', 'book-item-sum', mem.summary || ''));
        const meta = el('p', 'book-item-meta');
        if (ch) meta.appendChild(el('span', 'book-item-ch', ch.title));
        if (mem.isDemo) meta.appendChild(el('em', 'badge badge-demo', '演示'));
        li.appendChild(meta);
        const btn = el('button', 'btn-pixel', '重读这一页');
        btn.addEventListener('click', function () {
          window.GameAudio.flip();
          showMemoryDetail(root, mem);
        });
        li.appendChild(btn);
        list.appendChild(li);
      }
      root.appendChild(list);
    }
    const rest = total - found.length;
    if (rest > 0) root.appendChild(el('p', 'book-empty', '还有 ' + rest + ' 段回忆散落在场景里，等你慢慢发现。'));
  }

  function showMemoryDetail(root, mem) {
    root.innerHTML = '';
    root.appendChild(panelHeader('回忆手册'));
    const back = el('button', 'btn-pixel btn-back', '← 返回手册');
    back.addEventListener('click', function () { window.GameAudio.flip(); buildBookPanel(root); });
    root.appendChild(back);

    const head = el('div', 'memory-head');
    head.appendChild(el('h2', 'memory-title', mem.title || mem.id));
    const badges = el('span', 'chapter-badges');
    if (mem.isDemo) badges.appendChild(el('em', 'badge badge-demo', '演示'));
    const ch = chapterOf(mem);
    if (ch) badges.appendChild(el('em', 'badge badge-open', ch.title));
    head.appendChild(badges);
    root.appendChild(head);

    if (mem.dateLabel) root.appendChild(el('p', 'memory-date', mem.dateLabel));
    if (mem.summary) root.appendChild(el('p', 'memory-summary', mem.summary));

    if (Array.isArray(mem.images) && mem.images.length) {
      const wrap = el('div', 'memory-images');
      for (const src of mem.images) {
        const img = el('img', 'memory-image');
        img.src = src; img.alt = '回忆照片';
        img.loading = 'lazy';
        img.addEventListener('error', function () { img.remove(); });
        wrap.appendChild(img);
      }
      root.appendChild(wrap);
    }

    const paras = Array.isArray(mem.paragraphs) ? mem.paragraphs : [];
    if (!paras.length) root.appendChild(el('p', 'memory-para memory-para-empty', '（这一页还没有写下正文。）'));
    for (const p of paras) root.appendChild(el('p', 'memory-para', p));

    if (Array.isArray(mem.people) && mem.people.length) {
      const ppl = el('p', 'memory-people');
      ppl.appendChild(el('span', 'memory-people-label', '相关人物：'));
      for (const name of mem.people) ppl.appendChild(el('em', 'chip', name));
      root.appendChild(ppl);
    }

    if (Array.isArray(mem.links) && mem.links.length) {
      const links = el('div', 'memory-links');
      links.appendChild(el('p', 'memory-people-label', '相关链接：'));
      for (const lk of mem.links) {
        if (!lk || !lk.url) continue;
        const a = el('a', 'memory-link btn-pixel', lk.label || lk.url);
        a.href = lk.url;
        a.target = '_blank';
        a.rel = 'noopener';
        links.appendChild(a);
      }
      root.appendChild(links);
    }
  }

  // —— 设置 ——
  function buildSettingsPanel(root) {
    root.appendChild(panelHeader('设置'));

    const soundRow = el('label', 'setting-row');
    const soundChk = el('input');
    soundChk.type = 'checkbox'; soundChk.checked = !!G.settings.sound;
    soundChk.addEventListener('change', function () {
      G.settings.sound = soundChk.checked;
      window.GameAudio.setEnabled(G.settings.sound);
      queueSave();
    });
    soundRow.appendChild(soundChk);
    soundRow.appendChild(el('span', null, '音效（互动、翻页、收录提示音）'));
    root.appendChild(soundRow);

    const motionRow = el('label', 'setting-row');
    const motionChk = el('input');
    motionChk.type = 'checkbox';
    motionChk.checked = reducedMotion();
    motionChk.addEventListener('change', function () {
      G.settings.reducedMotion = motionChk.checked;
      queueSave();
    });
    motionRow.appendChild(motionChk);
    motionRow.appendChild(el('span', null, '减少动态效果（水面停止流动、关闭摇曳与过渡）'));
    root.appendChild(motionRow);

    root.appendChild(el('p', 'panel-note', '进度保存在这台设备的浏览器里（localStorage），包括所在场景、位置和已发现的回忆。新增内容不会破坏已有存档。'));

    // —— 重置进度（两次确认） ——
    const resetWrap = el('div', 'reset-wrap');
    const resetBtn = el('button', 'btn-pixel btn-danger', '重置游戏进度');
    let armed = false, armTimer = null;
    resetBtn.addEventListener('click', function () {
      if (!armed) {
        armed = true;
        resetBtn.textContent = '真的要重置吗？再按一次确认';
        resetBtn.classList.add('btn-danger-armed');
        window.GameAudio.blip();
        armTimer = setTimeout(function () {
          armed = false;
          resetBtn.textContent = '重置游戏进度';
          resetBtn.classList.remove('btn-danger-armed');
        }, 4000);
        return;
      }
      clearTimeout(armTimer);
      window.GameSave.reset();
      G.discovered = new Set();
      G.save = window.GameSave.load();
      G.save.seenIntro = false;
      window.GameAudio.close();
      closePanel();
      loadScene('village', 'default', null);
      showIntro();
    });
    resetWrap.appendChild(resetBtn);
    root.appendChild(resetWrap);
  }

  // —— 帮助 / 文字目录 ——
  function buildHelpPanel(root) {
    root.appendChild(panelHeader('帮助 · 文字版目录'));

    const ops = el('div', 'help-block');
    ops.appendChild(el('h3', 'help-h', '操作'));
    const isMobile = document.body.classList.contains('touch');
    const ul = el('ul', 'help-list');
    for (const line of (isMobile
      ? ['左下方向键移动', '右下 ● 按钮互动 / 对话推进', '顶部按钮打开人生地图、回忆手册和设置']
      : ['WASD 或方向键移动', '靠近发光的对象，按 E 或空格互动', '对话中按 E / 空格继续，Esc 关闭', '页面顶部按钮打开人生地图、回忆手册和设置'])) {
      ul.appendChild(el('li', null, line));
    }
    ops.appendChild(ul);
    root.appendChild(ops);

    const about = el('div', 'help-block');
    about.appendChild(el('h3', 'help-h', '关于这个游戏'));
    about.appendChild(el('p', 'help-p', '这是一个以真实人生为内容的探索游戏：地图为艺术化示意，演示人物与事件均已标注「演示」，不代表真实经历。回忆手册收录你发现的内容，只表示探索进度，不评价人生本身。'));
    root.appendChild(about);

    const toc = el('div', 'help-block');
    toc.appendChild(el('h3', 'help-h', '文字版人生目录'));
    for (const ch of (DATA.chapters || [])) {
      const row = el('p', 'toc-line');
      row.appendChild(el('span', 'toc-title', ch.title || ch.id));
      row.appendChild(el('em', 'badge ' + (ch.status === 'available' ? 'badge-open' : 'badge-soon'),
        ch.status === 'available' ? '可探索' : '故事待续'));
      toc.appendChild(row);
    }
    root.appendChild(toc);

  }

  // 面板关闭按钮在 panelHeader() 里动态创建并绑定，这里不再静态绑定。
  $('panel').addEventListener('click', function (e) {
    if (e.target === $('panel')) closePanel(); // 点遮罩关闭
  });

  // ----------------------------------------------------------
  //  HUD 小件
  // ----------------------------------------------------------
  function toast(text) {
    const stack = $('toast-stack');
    const t = el('div', 'toast', text);
    stack.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 300);
    }, 2600);
  }

  function updateBookBadge() {
    const badge = $('book-badge');
    badge.hidden = !G.bookDirty;
  }

  // ----------------------------------------------------------
  //  存档
  // ----------------------------------------------------------
  let saveQueued = false;
  function queueSave() {
    if (saveQueued) return;
    saveQueued = true;
    setTimeout(function () {
      saveQueued = false;
      window.GameSave.save({
        sceneId: G.save.sceneId, pos: { x: G.player.x, y: G.player.y },
        discovered: G.save.discovered, settings: G.settings,
        seenIntro: G.save.seenIntro
      });
    }, 150);
  }

  window.addEventListener('beforeunload', function () {
    window.GameSave.save({
      sceneId: G.save.sceneId, pos: { x: G.player.x, y: G.player.y },
      discovered: G.save.discovered, settings: G.settings,
      seenIntro: G.save.seenIntro
    });
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      window.GameSave.save({
        sceneId: G.save.sceneId, pos: { x: G.player.x, y: G.player.y },
        discovered: G.save.discovered, settings: G.settings,
        seenIntro: G.save.seenIntro
      });
    }
  });

  // ----------------------------------------------------------
  //  开场引导
  // ----------------------------------------------------------
  function showIntro() {
    G.mode = 'intro';
    const intro = $('intro');
    intro.hidden = false;
    $('intro-start').onclick = function () {
      intro.hidden = true;
      G.mode = 'explore';
      G.save.seenIntro = true;
      queueSave();
      window.GameAudio.open();
    };
  }

  // ----------------------------------------------------------
  //  移动端虚拟按键
  // ----------------------------------------------------------
  function bindTouchControls() {
    const isTouch = ('ontouchstart' in window) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    if (isTouch) document.body.classList.add('touch');

    for (const [id, dir] of [
      ['pad-up', 'up'], ['pad-down', 'down'], ['pad-left', 'left'], ['pad-right', 'right']
    ]) {
      const btn = $(id);
      const press = function (e) {
        e.preventDefault();
        window.GameAudio.unlock();
        G.keys[dir] = true;
        btn.classList.add('pressed');
      };
      const release = function (e) {
        e && e.preventDefault();
        G.keys[dir] = false;
        btn.classList.remove('pressed');
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }
    const act = $('pad-action');
    act.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      window.GameAudio.unlock();
      act.classList.add('pressed');
      if (G.mode === 'dialogue') advanceDialogue();
      else if (G.mode === 'explore') doInteract();
    });
    act.addEventListener('pointerup', function () { act.classList.remove('pressed'); });
    act.addEventListener('pointerleave', function () { act.classList.remove('pressed'); });
  }

  // ----------------------------------------------------------
  //  主循环
  // ----------------------------------------------------------
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    try {
      update(dt);
      render();
    } catch (e) {
      // 渲染出错只中断当前帧，避免整个页面崩掉
      console.error('[life-game]', e);
    }
    requestAnimationFrame(frame);
  }

  // ----------------------------------------------------------
  //  启动
  // ----------------------------------------------------------
  function boot() {
    G.art = window.PixelArt.buildAll();
    window.GameAudio.setEnabled(G.settings.sound);
    updateSoundButton();

    bindTouchControls();
    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp, { passive: false });
    window.addEventListener('blur', function () { G.keys = {}; });
    window.addEventListener('resize', function () { resize(); });

    // 顶部按钮
    $('btn-map').addEventListener('click', function () {
      window.GameAudio.unlock();
      if (G.mode === 'panel') { closePanel(); return; }
      openPanel('map');
    });
    $('btn-book').addEventListener('click', function () {
      window.GameAudio.unlock();
      G.bookDirty = false;
      updateBookBadge();
      if (G.mode === 'panel') { closePanel(); return; }
      openPanel('book');
    });
    $('btn-settings').addEventListener('click', function () {
      window.GameAudio.unlock();
      if (G.mode === 'panel') { closePanel(); return; }
      openPanel('settings');
    });
    $('btn-help').addEventListener('click', function () {
      window.GameAudio.unlock();
      if (G.mode === 'panel') { closePanel(); return; }
      openPanel('help');
    });
    $('btn-sound').addEventListener('click', function () {
      G.settings.sound = !G.settings.sound;
      window.GameAudio.setEnabled(G.settings.sound);
      updateSoundButton();
      window.GameAudio.unlock();
      queueSave();
    });

    // 恢复存档：场景合法才恢复，否则回到默认场景
    const savedScene = G.save.sceneId && sceneById(G.save.sceneId) ? G.save.sceneId : 'village';
    loadScene(savedScene, 'default', G.save.sceneId === savedScene ? G.save.pos : null);

    if (window.LGAmbience && window.LGAmbience.init) window.LGAmbience.init();
    resize();
    requestAnimationFrame(frame);

    if (G.save.seenIntro) {
      G.mode = 'explore';
      toast('欢迎回来，继续你的探索吧。');
    } else {
      showIntro();
    }

    // 游戏启动成功：隐藏静态回退区，锁住页面滚动
    document.body.classList.add('game-ready');
    const fb = $('static-fallback');
    if (fb) fb.hidden = true;
  }

  function updateSoundButton() {
    const btn = $('btn-sound');
    btn.textContent = G.settings.sound ? '🔊' : '🔇';
    btn.setAttribute('aria-label', G.settings.sound ? '关闭音效' : '开启音效');
    btn.classList.toggle('is-off', !G.settings.sound);
  }

  // 给测试与高级用户留的调试句柄
  window.__lifeGame = {
    state: G,
    warp: function (sceneId, spawn) { loadScene(sceneId, spawn || 'default', null); },
    openPanel: function (name) { openPanel(name); },
    discover: function (id) { discoverMemory(id); }
  };

  try {
    boot();
  } catch (e) {
    console.error('[life-game] 启动失败，回退到文字版目录。', e);
    showFallback('游戏启动失败：' + (e && e.message ? e.message : e));
  }

  function showFallback(reason) {
    const fb = $('static-fallback');
    if (!fb) return;
    fb.hidden = false;
    document.body.classList.remove('game-ready');
    if (reason) {
      const p = el('p', 'fallback-error', reason);
      fb.insertBefore(p, fb.firstChild.nextSibling);
    }
    const rootEl = $('game-root');
    if (rootEl) rootEl.hidden = true;
  }
})();
