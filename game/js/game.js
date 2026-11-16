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
    time: window.GameSave.load().worldTime || 0,
    villageWorld: null,
    visitedScenes: new Set(),
    story: window.GameSave.load().story,
    journey: window.GameSave.load().journey,
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
  // 章节进度：本章已发现 / 全部回忆数
  function chapterProgress(ch) {
    const mems = publishedMemories.filter(function (m) { return m.chapterId === ch.id; });
    const found = mems.filter(function (m) { return G.discovered.has(m.id); }).length;
    return { total: mems.length, found: found, complete: found === mems.length };
  }
  // 顺序解锁：章节按时间顺序排列，第一章默认解锁；
  // 之后每一章需要收集上一章的全部回忆才点亮（无回忆的章节自动放行）
  // —— NPC 生活行为：出生点附近漫游，靠近玩家时停下看人 ——
  function npcBlocked(e, x, y, scene) {
    scene = scene || G.scene;
    const fx = x - 5, fy = y - 6, fw = 10, fh = 6;
    for (const c of scene.colliders) {
      if (c === e.collider) continue; // 豁免自身
      if (fx < c.x + c.w && fx + fw > c.x && fy < c.y + c.h && fy + fh > c.y) return true;
    }
    return false;
  }
  // Breadth-first routes use the same static collision geometry as walking.
  function npcRoute(e, target, scene) {
    scene = scene || G.villageWorld || G.scene;
    const cols = scene.W / TILE, rows = scene.H / TILE;
    const sx = Math.floor(e.x / TILE), sy = Math.floor((e.baseline - 1) / TILE);
    const goal = target[1] * cols + target[0], start = sy * cols + sx;
    const previous = new Map([[start, null]]), queue = [start];
    const walkable = scene.walkable;
    for (let i=0; i<queue.length; i++) {
      const cell=queue[i];
      if (cell===goal) break;
      const x=cell%cols, y=Math.floor(cell/cols);
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx=x+dx, ny=y+dy, next=ny*cols+nx;
        if(nx<0 || ny<0 || nx>=cols || ny>=rows || previous.has(next) || !walkable[next] || next===e.avoidCell && next!==goal) continue;
        previous.set(next,cell); queue.push(next);
      }
    }
    if (!previous.has(goal)) return [];
    const path=[];
    for(let cell=goal; cell!==start; cell=previous.get(cell)) path.push({x:cell%cols*TILE+8,y:Math.floor(cell/cols)*TILE+12});
    path.push({x:sx*TILE+8,y:sy*TILE+12});
    return path.reverse();
  }
  function residentDoor(sceneId,e) {
    const door=DATA.scenes.village.interactables.find(z=>z.toScene===sceneId);
    return door ? door.at : e.nightHome;
  }
  function syncResidents() {
    if(!G.villageWorld || !G.scene) return;
    const residents=G.villageWorld.entities.filter(e=>e.route),occupied=new Set();
    for(const e of residents) e.hidden=!!e.inside;
    for(const e of G.scene.entities) if(e.homeProjection) {
      const resident=residents.find(r=>r.npcId===e.npcId);
      e.hidden=!(resident && resident.inside && (resident.insideScene || resident.homeScene)===G.scene.id);
      if(!e.hidden) {
        e.action=resident.action;e.activity=resident.activity;e.insideScene=G.scene.id;
        const key=G.scene.id+':'+e.action;
        if(e.spotKey!==key) {
          const spot=window.ResidentLife.indoorSpot(G.scene,e.npcId,e.action);
          const cols=G.scene.W/TILE;
          let best=spot[1]*cols+spot[0];
          if(occupied.has(best)) best=G.scene.walkable.findIndex((yes,i)=>yes&&!occupied.has(i));
          e.x=best%cols*TILE+8;e.baseline=Math.floor(best/cols)*TILE+12;e.spotKey=key;
        }
        occupied.add(Math.floor((e.baseline-1)/TILE)*G.scene.W/TILE+Math.floor(e.x/TILE));
      }
    }
  }
  function updateResident(e, dt) {
    const schedule=window.GameStory.routine(e.npcId,G);
    const night=schedule ? schedule.period==='night' : window.LGLandscape.nightAmount(G)>.65;
    const indoors=night ? e.homeScene : schedule && schedule.sceneId!=='village' ? schedule.sceneId : null;
    if(e.night!==night || (e.schedule&&e.schedule.key)!==(schedule&&schedule.key)) {
      e.night=night;e.schedule=schedule;e.path=[];e.routeIndex=0;e.wanderT=0;e.arrivedHome=false;
      window.ResidentBehavior.reset(e);
    }
    e.activity=night?'在家休息':schedule?schedule.activity:'在村里走走';
    e.action=night?'rest':schedule?schedule.action:'walk';
    if(e.inside) {
      if((e.insideScene || e.homeScene)===indoors){e.walking=false;return;}
      const exit=residentDoor(e.insideScene || e.homeScene,e);
      e.x=exit[0]*TILE+8;e.baseline=exit[1]*TILE+12;
      e.inside=false;e.insideScene=null;
    }
    if(reducedMotion()) {
      e.walking=false;
      if(indoors) {const at=residentDoor(indoors,e);e.x=at[0]*TILE+8;e.baseline=at[1]*TILE+12;e.inside=true;e.insideScene=indoors;e.arrivedHome=true;}
      else if(schedule && e.reducedSchedule!==schedule.key){
        const at=window.ResidentBehavior.destination(e,G.villageWorld,schedule.route);
        e.x=at[0]*TILE+8;e.baseline=at[1]*TILE+12;
        window.ResidentBehavior.personality(e).atActivity=true;
      }
      e.reducedSchedule=schedule&&schedule.key;
      return;
    }
    if(window.ResidentBehavior.tick(e,G,G.villageWorld,dt,!!indoors))return;
    if(!e.path || !e.path.length) {
      const route=schedule && schedule.route.length ? schedule.route : e.route;
      const destination=indoors?residentDoor(indoors,e):window.ResidentBehavior.destination(e,G.villageWorld,route);
      e.path=npcRoute(e,destination);
      if(!e.path.length){e.avoidCell=null;e.wanderT=1.5;return;}
      window.ResidentBehavior.start(e);
    }
    followResidentPath(e,dt,G.villageWorld,function(){
      window.ResidentBehavior.arrive(e,schedule?schedule.holdSeconds:3);
      if(indoors){e.inside=true;e.insideScene=indoors;e.arrivedHome=true;}
    });
  }
  function followResidentPath(e,dt,scene,onArrival) {
    const next=e.path[0],dx=next.x-e.x,dy=next.y-e.baseline,distance=Math.hypot(dx,dy);
    if(distance<.7) {
      e.path.shift();e.walking=false;
      if(!e.path.length)onArrival();
      return;
    }
    const pace=window.ResidentBehavior.personality(e).legPace||1;
    const step=Math.min(distance,(e.speed||18)*pace*dt),nx=e.x+dx/distance*step,ny=e.baseline+dy/distance*step;
    const other=scene.entities.find(r=>r.kind==='npc'&&r!==e&&!r.hidden&&!r.inside&&
      // Keep right of way while either walker pauses; otherwise both can yield forever.
      ((!r.route&&!r.streetLife) || e.npcId>r.npcId) && Math.hypot(nx-r.x,ny-r.baseline)<10 &&
      Math.hypot(nx-r.x,ny-r.baseline)<Math.hypot(e.x-r.x,e.baseline-r.baseline));
    if(other && e.path.length>1){
      e.avoidCell=Math.floor((other.baseline-1)/TILE)*(scene.W/TILE)+Math.floor(other.x/TILE);
      e.path=[];e.wanderT=.35+Math.random()*.45;e.walking=false;return;
    }
    if(!npcBlocked(e,nx,ny,scene)){
      e.x=nx;e.baseline=ny;e.walking=true;
      e.faceDir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
    }else{e.path=[];e.wanderT=1;e.walking=false;}
  }
  function updateNpc(e, dt) {
    if (e.hidden) return;
    if (G.mode !== 'explore') {
      e.walking = false;
      if(G.mode==='dialogue' && G.interactTarget && G.interactTarget.ent===e)e.faceDir=faceTowards(e);
      return;
    }
    if(e.route)return;
    if(e.homeProjection || e.streetLife) {
      if(reducedMotion()){e.walking=false;return;}
      if(e.homeProjection){
        if(e.wanderT<=0)window.ResidentBehavior.arrive(e,8);
        window.ResidentBehavior.personality(e).atActivity=true;
        window.ResidentBehavior.tick(e,G,G.scene,dt,false);e.walking=false;return;
      }
      if(window.ResidentBehavior.tick(e,G,G.scene,dt,false))return;
      if(!e.path.length){
        const target=window.ResidentBehavior.destination(e,G.scene,window.LifeWorld.streetAnchors(e,G));
        e.path=npcRoute(e,target,G.scene);
        if(!e.path.length){e.avoidCell=null;e.wanderT=1;return;}
        window.ResidentBehavior.start(e);
      }
      followResidentPath(e,dt,G.scene,()=>window.ResidentBehavior.arrive(e,e.streetLife.hold));
      return;
    }
    const dxp = G.player.x - e.x;
    const dyp = (G.player.y - 8) - (e.baseline - 8);
    if (Math.hypot(dxp, dyp) < (e.route ? 22 : 70)) {
      // 玩家靠近：停下、转身看人
      e.walking = false;
      e.faceDir = Math.abs(dxp) > Math.abs(dyp) ? (dxp > 0 ? 'right' : 'left') : (dyp > 0 ? 'down' : 'up');
      return;
    }
    if (reducedMotion()) { e.walking=false; return; }
    if (e.route) { updateResident(e,dt); return; }

    e.wanderT -= dt;
    if (e.wanderT <= 0 && !e.walking) {
      e.wanderT = 2.5 + Math.random() * 3.5;
      if (Math.random() < 0.45) {
        // 40% 概率走向出生点附近的一个随机可达点
        for (let t = 0; t < 8; t++) {
          const ang = Math.random() * Math.PI * 2;
          const r = 10 + Math.random() * TILE * 1.6;
          const tx = e.homeX + Math.cos(ang) * r;
          const ty = e.homeY + Math.sin(ang) * r;
          if (!npcBlocked(e, tx, ty)) { e.tx = tx; e.ty = ty; e.walking = true; break; }
        }
      }
    }
    if (e.walking) {
      const spd = 20 * dt;
      const dx = e.tx - e.x, dy = e.ty - e.baseline;
      const d = Math.hypot(dx, dy);
      if (d < 1.5) { e.walking = false; }
      else {
        const vx = dx / d * spd, vy = dy / d * spd;
        if (!npcBlocked(e, e.x + vx, e.baseline)) e.x += vx; else e.walking = false;
        if (!npcBlocked(e, e.x, e.baseline + vy)) e.baseline += vy; else e.walking = false;
        if (Math.abs(dx) > Math.abs(dy)) e.faceDir = dx > 0 ? 'right' : 'left';
        else e.faceDir = dy > 0 ? 'down' : 'up';
      }
    }
    // 碰撞体跟随 NPC 移动
    e.collider.x = e.x - TILE / 2 + 2;
    e.collider.y = e.baseline - TILE + 4;
  }

  function chapterUnlockedById(chapterId) {
    const chapters = DATA.chapters || [];
    const idx = chapters.findIndex(function (c) { return c.id === chapterId; });
    if (idx < 0) return true;
    return chapterUnlocked(chapters, idx);
  }
  function chapterUnlocked(chapters, idx) {
    // freeRoam（浏览模式）：全部开放
    if (DATA.config && DATA.config.freeRoam) return true;
    if (idx <= 0) return true;
    const prev = chapters[idx - 1];
    if (!prev) return true;
    return chapterProgress(prev).complete;
  }
  function dialogueById(id) {
    if (!id) return null;
    return (DATA.dialogues && DATA.dialogues[id]) || null;
  }

  // ----------------------------------------------------------
  //  场景装载
  // ----------------------------------------------------------
  function loadScene(sceneId, spawnKey, savedPos) {
    if (sceneId !== 'village' && !G.villageWorld) loadScene('village', 'default', null);
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
        const variants = spec.tile === 'grass' ? G.art.tiles.grassVariants : spec.tile === 'path' ? G.art.tiles.pathVariants : null;
        const img = variants ? variants[Math.abs(c0 * 31 + r * 17) % variants.length] : G.art.tiles[spec.tile];
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
    if (window.LGLandscape) window.LGLandscape.decorate(gg, def, legend, PAD);
    if (window.LGVillageDetails) window.LGVillageDetails.decorate(gg,def,legend,PAD);
    // 地图四边的隐形墙：玩家不能走出原始地图范围
    colliders.push({ x: -2, y: -2, w: W + 4, h: 2 });
    colliders.push({ x: -2, y: H, w: W + 4, h: 2 });
    colliders.push({ x: -2, y: -2, w: 2, h: H + 4 });
    colliders.push({ x: W, y: -2, w: 2, h: H + 4 });

    // 2. 人物实体
    const characters = (def.characters || []).slice();
    if(def.household) {
      for(const resident of DATA.scenes.village.characters.filter(c=>c.route)) {
        if(!characters.some(c=>c.id===resident.id)) characters.push({id:resident.id,at:def.spawnPoints.default,homeProjection:true});
      }
    }
    for (const conf of characters) {
      const cd = (DATA.characters || {})[conf.id];
      if (!cd) continue;
      const sprite = G.art.npc[cd.sprite] || G.art.npc['npc-painter'];
      const px0 = conf.at[0] * TILE, py0 = conf.at[1] * TILE;
      let ent = {
        kind: 'npc', sprite: sprite, x: px0 + TILE / 2, baseline: py0 + (conf.route ? 12 : TILE),
        drawW: 16, drawH: 20, dir: 'down', bobSeed: (conf.at[0] * 7 + conf.at[1] * 13) % 10,
        label: cd.name, isDemo: !!cd.isDemo, npcId: cd.id,
        faceDir: 'down', facing: null,
        route: conf.route, routeIndex: 0, nightHome: conf.nightHome, homeScene: conf.homeScene, speed: conf.speed, path: [],
        homeProjection: !!conf.homeProjection,streetLife:conf.streetLife,
        // —— 生活行为：出生点漫游 ——
        homeX: px0 + TILE / 2, homeY: py0 + TILE,
        wanderT: 1.5 + Math.random() * 3, walking: false, tx: 0, ty: 0
      };
      ent.collider = { x: px0 + 2, y: py0 + 4, w: TILE - 4, h: TILE - 6 };
      if (conf.route) {
        const old=G.villageWorld && G.villageWorld.entities.find(e=>e.npcId===conf.id);
        if(old) ent=old;
        else if(window.LGLandscape.nightAmount(G)>.65) {
          ent.night=true; ent.inside=true; ent.insideScene=conf.homeScene; ent.arrivedHome=true;
          ent.x=conf.nightHome[0]*TILE+8; ent.baseline=conf.nightHome[1]*TILE+12;
        }
      }
      if (!conf.route && !conf.homeProjection && !conf.streetLife) colliders.push(ent.collider);
      entities.push(ent);
      // 人物自带对话互动
      interactZones.push({
        id: 'npc-' + cd.id, kind: 'npc', ent: ent,
        cx: px0 + TILE / 2, cy: py0 + TILE / 2,
        type: 'dialogue', dialogueId: conf.dialogueId || cd.dialogueId,
        hint: cd.name, isDemo: !!cd.isDemo
      });
    }

    // 2.5 过道：走进即切换场景的触发区（登记矩形 + 接近提示）
    const passageZones = [];
    for (const conf of (def.interactables || [])) {
      if (conf.type !== 'passage') continue;
      const tiles = conf.tiles || (conf.at ? [conf.at] : []);
      if (!tiles.length) continue;
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, sx = 0, sy = 0;
      for (const [tx, ty] of tiles) {
        minX = Math.min(minX, tx * TILE); minY = Math.min(minY, ty * TILE);
        maxX = Math.max(maxX, tx * TILE + TILE); maxY = Math.max(maxY, ty * TILE + TILE);
        sx += tx; sy += ty;
      }
      passageZones.push({
        id: conf.id, type: 'passage',
        cx: sx / tiles.length * TILE + TILE / 2,
        cy: sy / tiles.length * TILE + TILE / 2,
        hint: conf.hint || '继续往前走',
        to: conf.to || {},
        chapter: conf.chapter || null,
        rect: { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
      });
    }

    // 3. 互动对象（挂到对应坐标的实体上，或独立成区域；passage 走过即触发，不走这里）
    for (const conf of (def.interactables || [])) {
      if (conf.type === 'passage') continue;
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
    if (hitsAny(colliders,spawn.x-5,spawn.y-6,10,6) || spawn.x>=W || spawn.y>=H) {
      let best=null, distance=Infinity;
      for(let y=0;y<rows.length;y++)for(let x=0;x<cols;x++){
        const px=x*TILE+8,py=y*TILE+12;
        if(hitsAny(colliders,px-5,py-6,10,6))continue;
        const d=Math.hypot(px-spawn.x,py-spawn.y);
        if(d<distance){best={x:px,y:py};distance=d;}
      }
      if(best)spawn=best;
    }

    G.PAD = PAD;
    G.scene = {
      def: def, id: def.id, W: W, H: H,
      ground: ground, waterCells: waterCells,
      entities: entities, colliders: colliders,
      interactZones: interactZones,
      passageZones: passageZones,
      entitySprites: null
    };
    G.scene.lights = window.LGLandscape ? window.LGLandscape.lights(def, legend) : [];
    const staticColliders = colliders.filter(c => !entities.some(e => e.kind === 'npc' && e.collider === c));
    G.scene.walkable = Array.from({length:cols*rows.length}, (_,i) =>
      !hitsAny(staticColliders, i%cols*TILE+3, Math.floor(i/cols)*TILE+6, 10, 6));
    for(const e of entities)if(e.streetLife){
      const cell=Math.floor((e.baseline-1)/TILE)*cols+Math.floor(e.x/TILE);
      if(!G.scene.walkable[cell]){
        const at=window.ResidentBehavior.destination(e,G.scene,e.streetLife.anchors);
        e.x=at[0]*TILE+8;e.baseline=at[1]*TILE+12;
      }
      window.ResidentBehavior.reset(e);
    }
    if (def.id === 'village') G.villageWorld=G.scene;
    syncResidents();
    resize();
    G.player.x = spawn.x; G.player.y = spawn.y;
    G.player.dir = 'down'; G.player.moving = false;
    G.camera.x = cameraTarget(G.player.x, W, viewW());
    G.camera.y = cameraTarget(G.player.y, H, viewH());
    G.interactTarget = null;

    // 出生点若落在过道里（例如从过道另一头走来），预上锁防立刻回传
    G.passageLock = null;
    if (G.scene.passageZones) {
      const fx = G.player.x - 5, fy = G.player.y - 6, fw = 10, fh = 6;
      for (const z of G.scene.passageZones) {
        const r = z.rect;
        if (fx < r.x + r.w && fx + fw > r.x && fy < r.y + r.h && fy + fh > r.y) { G.passageLock = z.id; break; }
      }
    }

    $('hud-location').textContent = def.name || def.id;
    updateJourney();
    const arrival = $('scene-arrival');
    arrival.textContent = G.visitedScenes.has(def.id) ? '' : (def.name || def.id);
    G.visitedScenes.add(def.id);
    arrival.classList.remove('visible');
    clearTimeout(G.arrivalTimer);
    requestAnimationFrame(function () { arrival.classList.add('visible'); });
    G.arrivalTimer = setTimeout(function () { arrival.classList.remove('visible'); }, 2800);
    G.save.sceneId = def.id;
    G.save.pos = { x: spawn.x, y: spawn.y };
    queueSave();
  }

  function makeEntity(kind, c0, r) {
    const ents = G.art.entities;
    const spec = {
      tree:  { img: ents.tree[(c0 * 3 + r) % ents.tree.length], w: 24, h: 32, dx: -4, solid: true,  sways: true },
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
      ...Object.fromEntries(['table','workbench','stool','plant','basket','stove','cabinet'].map(kind=>[kind,{img:ents[kind],w:24,h:24,dx:0,solid:true}])),
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
    if (G.scene && G.scene.def.indoor) {
      viewScale = Math.max(1, Math.min(4, Math.floor(Math.min(cssW / (G.scene.W + 32), cssH / (G.scene.H + 32)))));
    } else if (G.scene && G.scene.W) {
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
    if (e.code === 'Tab' && G.mode !== 'explore') {
      const modal = G.mode === 'intro' ? $('intro') : G.mode === 'panel' ? $('panel') : $('dialogue');
      const nodes = Array.from(modal.querySelectorAll('button, a[href], input, select')).filter(n => !n.disabled && n.getClientRects().length);
      if (nodes.length && (!modal.contains(document.activeElement) ||
          (e.shiftKey && document.activeElement === nodes[0]) ||
          (!e.shiftKey && document.activeElement === nodes[nodes.length - 1]))) {
        e.preventDefault(); nodes[e.shiftKey ? nodes.length - 1 : 0].focus();
      }
      return;
    }
    if (e.code === 'Escape') {
      if (!$('game-menu').hidden) { setMenuOpen(false, true); return; }
      if (G.mode === 'panel') closePanel();
      else if (G.mode === 'dialogue') closeDialogue();
      return;
    }
    if (e.target.closest('input, select, textarea, [contenteditable]')) return;
    if (e.target.closest('button, a') && ['Enter', 'Space'].includes(e.code)) return;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { G.keys.run = true; return; }
    if (G.mode === 'explore' && e.code === 'KeyM') { openPanel('map'); return; }
    if (G.mode === 'explore' && e.code === 'KeyB') { openPanel('book'); return; }
    if (e.repeat) { if (KEYMAP[e.code] || e.code === 'Space') e.preventDefault(); return; }
    window.GameAudio.unlock();

    if (KEYMAP[e.code]) {
      if (!$('game-menu').hidden) { setMenuOpen(false); canvas.focus({ preventScroll: true }); }
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
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') G.keys.run = false;
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
    window.LifeJourney.tick(G);
    window.LifeWorld.tick(G);
    if (G.mode === 'explore' && !G.transitioning) {
      const [dx, dy] = inputVector();
      const moving = dx !== 0 || dy !== 0;
      G.player.moving = moving;
      if (moving) {
        document.body.classList.add('experienced-player');
        // 斜向速度归一
        const len = Math.hypot(dx, dy);
        const speed = PLAYER_SPEED * (G.keys.run ? 1.55 : 1);
        const vx = dx / len * speed * dt;
        const vy = dy / len * speed * dt;
        // 先 X 后 Y，允许贴墙滑动
        if (!playerBlocked(G.player.x + vx, G.player.y)) G.player.x += vx;
        if (!playerBlocked(G.player.x, G.player.y + vy)) G.player.y += vy;

        // 朝向取绝对值较大的轴
        if (Math.abs(dx) > Math.abs(dy)) G.player.dir = dx > 0 ? 'right' : 'left';
        else G.player.dir = dy > 0 ? 'down' : 'up';

        G.player.animT += dt * (G.keys.run ? 1.4 : 1);
        G.player.frame = Math.floor(G.player.animT / 0.16) % 2 + 1;
        G.player.stepT += dt;
        if (G.player.stepT > 0.3) {
          G.player.stepT = 0;
          const tile=(G.scene.def.map[Math.floor(G.player.y/TILE)]||'')[Math.floor(G.player.x/TILE)];
          const spec=(G.scene.def.legend||{})[tile]||(DATA.scenes.legend||{})[tile]||{};
          window.GameAudio.step(spec.tile);
        }

        G.save.pos = { x: G.player.x, y: G.player.y };
      } else {
        G.player.frame = 0;
        G.player.animT = 0;
      }

      // 过道：走进即过渡（防重复锁：走出过道后才重新武装）
      if (G.scene.passageZones && G.scene.passageZones.length) {
        const fx = G.player.x - 5, fy = G.player.y - 6, fw = 10, fh = 6;
        let inside = null;
        for (const z of G.scene.passageZones) {
          const r = z.rect;
          if (fx < r.x + r.w && fx + fw > r.x && fy < r.y + r.h && fy + fh > r.y) { inside = z; break; }
        }
        if (inside) {
          if (G.passageLock !== inside.id) {
            G.passageLock = inside.id;
            const gateOk = !inside.chapter || (DATA.config && DATA.config.freeRoam) ||
              chapterUnlockedById(inside.chapter);
            if (gateOk) {
              switchScene(inside.to.scene, inside.to.spawn || 'default');
            } else {
              toast('（这条路还没走到那一段——先把眼前的回忆收集齐吧。）');
            }
          }
        } else if (G.passageLock) {
          G.passageLock = null;
        }
      }

      // Keep interaction positions attached to wandering NPCs.
      for (const z of G.scene.interactZones) {
        if (z.kind === 'npc' && z.ent) { z.cx = z.ent.x; z.cy = z.ent.baseline - 8; }
      }
      // 最近的可互动对象
      let best = null, bestD = INTERACT_RADIUS;
      for (const z of G.scene.interactZones) {
        if (z.ent && z.ent.hidden || !window.GameKeepsakes.available(z,G)) continue;
        const d = Math.hypot(z.cx - G.player.x, z.cy - (G.player.y - 8));
        if (d < bestD) { best = z; bestD = d; }
      }
      G.interactTarget = best;
      updateHint();
    }

    // 相机跟随；地图小于视口时把地图整体居中（负偏移）
    const tx = cameraTarget(G.player.x, G.scene.W, viewW());
    const ty = cameraTarget(G.player.y, G.scene.H, viewH());
    const lerp = reducedMotion() ? 1 : 1 - Math.exp(-9 * dt);
    G.camera.x += (tx - G.camera.x) * lerp;
    G.camera.y += (ty - G.camera.y) * lerp;

    if (G.mode === 'explore' && G.villageWorld) {
      for(const resident of G.villageWorld.entities) if(resident.route) updateResident(resident, dt);
    }
    syncResidents();
    // NPC 生活行为（漫游 / 靠近看人；对话与面板打开时冻结）
    if (G.scene && G.scene.entities) {
      for (const e of G.scene.entities) {
        if (e.kind === 'npc') updateNpc(e, dt);
      }
    }

    // 氛围动画层 + 生活细节层
    if (window.LGAmbience) window.LGAmbience.update(dt);
    if (window.LGDetails) window.LGDetails.update(dt);

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
    if (G.scene.def.indoor) ctx.drawImage(G.scene.ground, G.PAD, G.PAD, G.scene.W, G.scene.H, 0, 0, G.scene.W, G.scene.H);
    else ctx.drawImage(G.scene.ground, -G.PAD, -G.PAD);

    // 水面（动画帧）
    const wframes = G.art.tiles.water;
    const wf = reducedMotion() ? 0 : Math.floor(G.time / 0.45) % wframes.length;
    for (const [c0, r] of G.scene.waterCells) {
      ctx.drawImage(wframes[(wf + c0 * 3 + r * 7) % wframes.length], c0 * TILE, r * TILE);
    }

    if (window.LGLandscape) window.LGLandscape.shadows(ctx, G.scene.entities);

    // 生活细节层：静态杂物（实体之下）
    if (window.LGDetails) window.LGDetails.draw(ctx, 'ground');
    if (window.LGHomeDetails) window.LGHomeDetails.draw(ctx,G,'ground');

    window.GameStory.draw(ctx,G,G.art);
    // 氛围层：实体之下（水面涟漪等）
    if (window.LGAmbience) window.LGAmbience.draw(ctx, 'ground');

    // 可见范围内的实体 + 玩家，按 y 排序绘制（遮挡关系）
    const list = [];
    const pad = 48;
    for (const e of G.scene.entities) {
      if (e.hidden) continue;
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
        const behavior=window.ResidentBehavior.personality(e);
        img = e.sprite[e.faceDir || 'down'][e.walking && !reducedMotion() ? Math.floor((G.time*behavior.cadence+behavior.phase) / .18) % 2 + 1 : 0];
      }
      const bob = e.kind === 'npc' && e.walking && !reducedMotion()
        ? (Math.sin(G.time / 0.6 + e.behavior.phase) > 0 ? -1 : 0) : 0;
      const obscuresPlayer = e.kind === 'tree' && G.player.y < e.baseline &&
        G.player.y > e.baseline - e.drawH && Math.abs(G.player.x - e.x) < e.drawW / 2;
      ctx.globalAlpha = obscuresPlayer ? .48 : 1;
      img=window.LifeWorld.pose(e,img,G);
      ctx.drawImage(img, Math.round(e.x - e.drawW / 2 + ox), Math.round(e.baseline - e.drawH + bob));
    }

    ctx.globalAlpha = 1;
    for(const e of list) if(e.kind==='npc'){
      if(window.ResidentLife)window.ResidentLife.draw(ctx,e,G);
      window.ResidentBehavior.draw(ctx,e,G);
    }
    if(window.LGHomeDetails) window.LGHomeDetails.draw(ctx,G,'top');
    window.LifeWorld.draw(ctx,G);

    // 互动提示标记（在目标上方轻跳）
    const showMarkers = !reducedMotion() ? 1 : 0;
    for (const z of G.scene.interactZones) {
      if (z.ent && z.ent.hidden || !window.GameKeepsakes.available(z,G)) continue;
      if (z.memoryId && G.discovered.has(z.memoryId) && z !== G.interactTarget) continue;
      if (z !== G.interactTarget || G.mode !== 'explore' || G.settings.interactionHints===false) continue;
      if (z.kind === 'npc' && z !== G.interactTarget) continue;
      const mx = z.cx, my = z.cy;
      if (mx < camX - 16 || mx > camX + viewW() + 16) continue;
      if (my < camY - 16 || my > camY + viewH() + 16) continue;
      const bobY = showMarkers ? Math.round(Math.sin(G.time / 0.35 + mx) * 1.5) : 0;
      ctx.drawImage(G.art.marker, Math.round(mx - 4), Math.round(my - 26 + bobY));
    }

    window.GameKeepsakes.draw(ctx,G);
    // 氛围层：最上方（飞鸟/蝴蝶/落叶/水花）
    if (window.LGAmbience) window.LGAmbience.draw(ctx, 'top');

    // 生活细节层：上升物（炊烟等）
    if (window.LGDetails) window.LGDetails.draw(ctx, 'top');

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (window.LGLandscape) {
      window.LGLandscape.light(ctx, G, canvas.width, canvas.height, k);
      const phase = window.LGLandscape.daylight(G);
      const hour=Math.floor(phase*24), minute=Math.floor(phase*1440)%60;
      const clock=String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
      const label = G.scene.def.indoor ? '⌂ 屋内 · '+clock :
        (hour<5 || hour>=20 ? '☾ 夜晚' : hour<8 ? '☀ 清晨' : hour<17 ? '☀ 白天' : '◒ 傍晚')+' · '+clock;
      if ($('world-light').textContent !== label) $('world-light').textContent = label;
      const dayLabel='第 '+G.journey.day+' 天';if($('world-day').textContent!==dayLabel)$('world-day').textContent=dayLabel;
    }
  }

  // ----------------------------------------------------------
  //  互动
  // ----------------------------------------------------------
  function updateHint() {
    const hint = $('hint');
    const t = G.interactTarget;
    if (!t || (t.ent && t.ent.hidden) || G.mode !== 'explore' || G.settings.interactionHints===false) { hint.hidden = true; return; }
    const isMobile = document.body.classList.contains('touch');
    hint.textContent = (isMobile ? '点 ● ' : '按 E · ') + (t.hint || '查看') + (t.ent && t.ent.activity ? ' · '+t.ent.activity : '');
    hint.hidden = false;
  }

  function doInteract() {
    const t = G.interactTarget;
    if (!t || (t.ent && t.ent.hidden)) return;
    if (t.kind === 'npc' && t.ent) t.ent.faceDir = faceTowards(t.ent);
    window.GameAudio.blip();
    const activity=window.LifeJourney.activity(t,G);
    if(activity){
      if(activity==='supplies'&&!window.LifeJourney.schoolOpen(G)){
        openDialogue(null,null,[{text:'文具摊收起来了。先休息到次日清晨，等摊主开门。',end:true,journeyEvent:'schoolMorning'}]);return;
      }
      G.activity=activity;openPanel('activity');return;
    }
    const storyNodes=window.LifeJourney.dialogue(t,G) || window.GameKeepsakes.dialogue(t,G) || window.GameStory.dialogue(t,G) || window.ResidentBehavior.dialogue(t,G);
    if(storyNodes) {openDialogue(null,null,storyNodes);return;}
    switch (t.type) {
      case 'passage': return; // 走进过道自动触发，无需按键
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
    if (G.transitioning) return;
    if (!sceneById(toScene)) { toast('（场景还在搭建中。）'); return; }
    window.GameAudio.warp();
    const doSwitch = function () {
      loadScene(toScene, spawnKey || 'default', null);
      G.save.sceneId = toScene;
      G.save.pos = { x: G.player.x, y: G.player.y };
      queueSave();
    };
    if (reducedMotion()) { doSwitch(); return; }
    G.transitioning = true;
    G.keys = {};
    const fade = $('fade');
    fade.classList.add('on');
    setTimeout(function () {
      doSwitch();
      setTimeout(function () { fade.classList.remove('on'); G.transitioning = false; }, 120);
    }, 180);
  }

  // ----------------------------------------------------------
  //  对话
  // ----------------------------------------------------------
  function openDialogue(dialogueId, memoryIdToUnlock, customNodes) {
    const dlg = dialogueById(dialogueId);
    let nodes;
    if(customNodes) { nodes=customNodes; }
    else if (dlg && Array.isArray(dlg.nodes) && dlg.nodes.length) {
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
    G.keys = {};
    $('dialogue').focus();
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
    if (node.end) {
      if(node.journeyEvent){const event=node.journeyEvent;closeDialogue();finishJourneyEvent(event);return;}
      if(node.keepsake) { discoverMemory(node.keepsake); queueSave(); }
      if(Number.isInteger(node.storyAdvance) && node.storyAdvance===G.story.step+1) {
        G.story.step=node.storyAdvance;
        if(G.story.step===4) discoverMemory('mem-act-one-stool');
        updateJourney();queueSave();
        toast(G.story.step===4?'第一幕完成：树下又有了座位。':'旅途更新：'+window.GameStory.step(G).title);
      }
      closeDialogue(); return;
    }
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
    canvas.focus({ preventScroll: true });
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
    updateJourney();
    window.GameAudio.chime();
    toast('已收录到回忆手册：《' + (mem.title || id) + '》');
    // 章节完成检查：本章回忆全部集齐 → 下一章解锁
    const ch = chapterOf(mem);
    if (ch) {
      const prog = chapterProgress(ch);
      if (prog.total > 0 && prog.complete) {
        const chapters = DATA.chapters || [];
        const next = chapters[chapters.indexOf(ch) + 1];
        setTimeout(function () {
          toast(next ? '「' + ch.title + '」完成 —— 新章节「' + next.title + '」已解锁'
                     : '「' + ch.title + '」完成！');
          window.GameAudio.chime();
        }, 900);
      }
    }
    queueSave();
  }

  // ----------------------------------------------------------
  //  面板（人生地图 / 回忆手册 / 设置 / 帮助）
  // ----------------------------------------------------------
  let activePanel = null;
  function finishJourneyEvent(event,choice){
    const result=window.LifeJourney.apply(event,G,choice);if(!result)return;
    if(result.memory)discoverMemory(result.memory);
    G.player.lifeAction={kind:event,until:G.time+2};
    window.GameAudio.life(event);
    if(result.scene)loadScene(result.scene,result.spawn,null);
    updateJourney();queueSave();toast(result.message);
  }

  function openPanel(name) {
    setMenuOpen(false);
    if (G.mode === 'dialogue') closeDialogue();
    activePanel = name;
    G.panelReturnMode = G.mode === 'intro' ? 'intro' : 'explore';
    G.keys = {};
    G.mode = 'panel';
    $('hint').hidden = true;
    const body = $('panel-body');
    body.innerHTML = '';
    if (name === 'story') buildStoryPanel(body);
    else if (name === 'map') buildMapPanel(body);
    else if (name === 'book') buildBookPanel(body);
    else if (name === 'settings') buildSettingsPanel(body);
    else if(name==='activity'){
      body.appendChild(panelHeader('生活片段'));
      window.LifeJourney.buildActivity(body,G.activity,G,(event,choice)=>{closePanel();finishJourneyEvent(event,choice);});
    }
    else buildHelpPanel(body);
    $('panel').hidden = false;
    $('panel').scrollTop = 0;
    $('panel').querySelector('button').focus();
    window.GameAudio.open();
  }

  function closePanel() {
    activePanel = null;
    G.keys = {};
    G.mode = G.panelReturnMode || 'explore';
    $('panel').hidden = true;
    canvas.focus({ preventScroll: true });
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

  function updateJourney() {
    if (!G.scene) return;
    const objective=window.GameStory.step(G);
    $('journey-title').textContent=objective.title;
    $('journey-progress').textContent='第 '+G.journey.day+' 天 · '+(G.story.step<4?'树下的竹凳':G.journey.stage<7?'出发之前':'县城的第一天')+' · 演示故事';
  }

  function buildStoryPanel(root) {
    root.appendChild(panelHeader('旅途手记 · 村庄与县城'));
    root.appendChild(el('p','panel-note','演示故事：用于体验主线玩法，不代表真实人生经历。没有时间限制，夜里也能进屋找人。'));
    root.appendChild(el('h3','story-objective',window.GameStory.step(G).title));
    root.appendChild(el('p','help-p',window.GameStory.step(G).hint));
    const destination=window.GameStory.target(G);
    if(destination) {
      const scene=DATA.scenes[destination.sceneId];
      root.appendChild(el('p','story-location','去这里：'+scene.name));
    }
    const inventory=el('div','story-inventory',G.story.step===2||G.story.step===3?'随身物品：一张修好的竹凳':'随身物品：'+(G.story.step===4?'竹凳已放在老槐树下':'暂时没有任务物品'));
    root.appendChild(inventory);
    if(G.journey.stage>=4)root.appendChild(el('p','story-inventory',G.journey.stage>=10?'行李：入学通知、手帕和新文具':G.journey.stage>=5?'行李：入学通知、铅笔、旧手帕':'刚收到：入学通知'));
    const list=el('ol','story-checklist');
    window.GameStory.steps.slice(0,4).forEach((step,i)=>list.appendChild(el('li',i<G.story.step?'done':'', (i<G.story.step?'✓ ':'')+step.title)));
    if(G.story.step===4)window.LifeJourney.steps.slice(0,11).forEach((step,i)=>list.appendChild(el('li',i<G.journey.stage?'done':'',(i<G.journey.stage?'✓ ':'')+step.title)));
    root.appendChild(list);
    const bonds=el('div','journey-bonds');
    window.LifeJourney.relationships(G).forEach(r=>bonds.appendChild(el('p','',r.name+' · '+r.status)));root.appendChild(bonds);
    const mapButton=el('button','btn-pixel','查看当前位置地图');
    mapButton.addEventListener('click',()=>openPanel('map'));root.appendChild(mapButton);
  }

  function buildMapPanel(root) {
    root.appendChild(panelHeader('旅途地图'));
    root.appendChild(el('p', 'panel-note', '红点是你，金色圆环是当前主线目标（或住户家门），浅黄色标记是互动地点。也可以从下方前往已开放的章节。'));
    const map = el('canvas', 'journey-map');
    map.setAttribute('role', 'img');
    map.setAttribute('aria-label', (G.scene.def.name || '') + '地图；下方提供地点文字列表');
    if (window.LGLandscape) window.LGLandscape.map(map, G);
    root.appendChild(map);
    const places = el('div', 'map-places');
    for (const z of G.scene.interactZones) {
      if (z.ent && z.ent.hidden || !window.GameKeepsakes.available(z,G)) continue;
      places.appendChild(el('span', '', (z.memoryId && G.discovered.has(z.memoryId) ? '✓ ' : '· ') + z.hint));
    }
    root.appendChild(places);
    const list = el('div', 'chapter-route');
    (DATA.chapters || []).forEach(function (ch, i, chapters) {
      const row = el('div', 'chapter-stop');
      const heading = el('div', 'chapter-copy');
      heading.appendChild(el('strong', '', ch.title));
      const progress = chapterProgress(ch);
      heading.appendChild(el('small', '', (ch.isDemo ? '玩法演示 · ' : '') + '回忆 ' + progress.found + ' / ' + progress.total));
      row.appendChild(heading);
      const available = ch.status === 'available' && sceneById(ch.sceneId) && chapterUnlocked(chapters, i);
      const btn = el('button', 'btn-pixel', available ? '前往 →' : '尚未开放');
      btn.disabled = !available;
      btn.addEventListener('click', function () { closePanel(); switchScene(ch.sceneId, 'default'); });
      row.appendChild(btn); list.appendChild(row);
    });
    root.appendChild(list);
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
    back.addEventListener('click', function () { window.GameAudio.flip(); root.innerHTML = ''; buildBookPanel(root); });
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
      updateSoundButton();
      queueSave();
    });
    soundRow.appendChild(soundChk);
    soundRow.appendChild(el('span', null, '音效（互动、翻页、收录提示音）'));
    root.appendChild(soundRow);

    const dayRow = el('label', 'setting-row');
    dayRow.appendChild(el('span', null, '村庄时段'));
    const daySelect = el('select');
    daySelect.setAttribute('aria-label', '村庄时段');
    for (const [value,label] of [['auto','自动昼夜交替'],['dawn','清晨'],['morning','早上'],['day','白天'],['dusk','傍晚'],['night','夜晚']]) {
      const option = el('option', '', label); option.value=value; daySelect.appendChild(option);
    }
    daySelect.value = G.settings.timeOfDay || (G.settings.dayCycle === false ? 'day' : 'auto');
    daySelect.addEventListener('change', function () {
      G.settings.timeOfDay=daySelect.value; G.settings.dayCycle=daySelect.value==='auto'; queueSave();
    });
    dayRow.appendChild(daySelect); root.appendChild(dayRow);
    root.appendChild(el('p','panel-note','自动模式约 8 分钟走过一天。夜里窗户和路灯会亮起，村民沿巷道走进各自家中；可随时切换时段。'));

    const hintsRow=el('label','setting-row'),hintsInput=el('input');
    hintsInput.type='checkbox';hintsInput.checked=G.settings.interactionHints!==false;
    hintsInput.addEventListener('change',function(){G.settings.interactionHints=hintsInput.checked;queueSave();updateHint();});
    hintsRow.appendChild(hintsInput);hintsRow.appendChild(el('span',null,'显示附近互动提示（关闭后仍可按 E 互动）'));root.appendChild(hintsRow);
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
      G.story=G.save.story;
      G.time=0;G.journey=window.LifeJourney.defaults();
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
      : ['WASD 或方向键移动，按住 Shift 奔跑', 'M 打开地图，B 打开回忆手册', '靠近发光的对象，按 E 或空格互动', '对话中按 E / 空格继续，Esc 关闭', '页面顶部按钮打开人生地图、回忆手册和设置'])) {
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
        story: G.story, journey: G.journey, worldTime: G.time, seenIntro: G.save.seenIntro
      });
    }, 150);
  }

  window.addEventListener('beforeunload', function () {
    window.GameSave.save({
      sceneId: G.save.sceneId, pos: { x: G.player.x, y: G.player.y },
      discovered: G.save.discovered, settings: G.settings,
      story: G.story, journey: G.journey, worldTime: G.time, seenIntro: G.save.seenIntro
    });
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      G.keys = {};
      window.GameSave.save({
        sceneId: G.save.sceneId, pos: { x: G.player.x, y: G.player.y },
        discovered: G.save.discovered, settings: G.settings,
        story: G.story, journey: G.journey, worldTime: G.time, seenIntro: G.save.seenIntro
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
    $('intro-start').focus();
    $('intro-start').onclick = function () {
      intro.hidden = true;
      G.mode = 'explore';
      G.save.seenIntro = true;
      canvas.focus({ preventScroll: true });
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
  let frameErrors = 0;
  function frame(now) {
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    try {
      update(dt);
      render();
      frameErrors = 0;
    } catch (e) {
      // 渲染出错只中断当前帧，避免整个页面崩掉
      console.error('[life-game]', e);
      if (++frameErrors >= 3) { showFallback('场景暂时无法显示，请刷新重试。你的已有存档仍然保留。'); return; }
    }
    requestAnimationFrame(frame);
  }

  // ----------------------------------------------------------
  //  启动
  // ----------------------------------------------------------
  function setMenuOpen(open, focusTrigger) {
    $('game-menu').hidden = !open;
    $('btn-menu').setAttribute('aria-expanded', String(open));
    if (focusTrigger) $('btn-menu').focus({ preventScroll: true });
  }

  function boot() {
    G.art = window.PixelArt.buildAll();
    window.GameAudio.setEnabled(G.settings.sound);
    updateSoundButton();

    bindTouchControls();
    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp, { passive: false });
    window.addEventListener('blur', function () { G.keys = {}; });
    window.addEventListener('resize', function () { resize(); });

    $('btn-menu').addEventListener('click', function () {
      if (G.mode !== 'explore') return;
      G.keys = {};
      setMenuOpen($('game-menu').hidden);
    });
    document.addEventListener('pointerdown', function (e) {
      if (!e.target.closest('.game-topbar')) setMenuOpen(false);
    });
    $('btn-map').addEventListener('click', function () { openPanel('map'); });
    $('btn-story').addEventListener('click',function(){openPanel('story');});
    $('journey-note').addEventListener('click', function () { openPanel('story'); });
    function syncJournal() {
      const open=G.settings.journalCollapsed===false;
      $('journey-note').hidden=!open;
      $('journey-toggle').setAttribute('aria-expanded',String(open));
      $('journey-toggle').setAttribute('aria-label',open?'收起旅途手记':'展开旅途手记');
    }
    $('journey-toggle').addEventListener('click',function(){G.settings.journalCollapsed=G.settings.journalCollapsed===false;syncJournal();queueSave();});
    syncJournal();
    canvas.addEventListener('pointerdown', function () { if (G.mode === 'explore') canvas.focus(); });
    // 顶部按钮
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
      setMenuOpen(false, true);
    });

    // 恢复存档：场景合法才恢复，否则回到默认场景
    const savedScene = G.save.sceneId && sceneById(G.save.sceneId) ? G.save.sceneId : 'village';
    loadScene(savedScene, 'default', G.save.sceneId === savedScene ? G.save.pos : null);

    if (window.LGAmbience && window.LGAmbience.init) window.LGAmbience.init();
    if (window.LGDetails && window.LGDetails.init) window.LGDetails.init();
    resize();
    requestAnimationFrame(frame);

    if (G.save.seenIntro) {
      document.body.classList.add('experienced-player');
      G.mode = 'explore';
      toast('欢迎回来，继续你的探索吧。');
    } else {
      showIntro();
    }

    // 游戏启动成功：隐藏静态回退区，锁住页面滚动
    document.body.classList.add('game-ready');
    resize();
    if (G.mode === 'intro') $('intro-start').focus();
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
