// ===============================================================
//  GameAudio —— 合成音效 + 生成式环境音乐（BGM）+ 场景环境声层
//  全部声音用 WebAudio 现场合成，零音频文件：
//  · 100% 原创，无第三方音频素材
//  · 不自动播放：AudioContext 在用户第一次按键 / 点击后才创建
//  · BGM：pentatonic 五声音阶随机游走 + 长音 pad，双主题（室外明亮
//    乡村小调 / 室内温暖慢板），audio.js 内部自带调度器（lookahead
//    定时器），页面隐藏时暂停、恢复可见时继续，切主题先淡出再换
//  · 环境声：按场景自动切换的氛围层，与 BGM 并行、音量更低——
//    村庄（village/deepwoods）：鸟鸣 + 轻风（+ 近水时河声）；
//    县城（county）：远处车流低鸣 + 人声嘈杂 + 偶尔喇叭；
//    深圳（shenzhen）：城市低鸣 + 更频繁喇叭 + 地铁低频脉冲；
//    小屋（cottage）：几乎安静的房间底噪。场景每 2 秒防御式
//    轮询 window.__lifeGame.state.scene（也可 setScene(info) 主动喂）
//  · 音量纪律：音效 blip≈0.035；BGM 旋律通道 ≤0.02、pad 通道 ≤0.015，
//    任何通道都 ≤0.03；环境声任意时刻总峰值 ≤0.012（明显轻于 BGM）
//  · 开关状态保存在存档里（game.js 调 setEnabled）
// ===============================================================
window.GameAudio = (function () {
  'use strict';
  let ctx = null;
  let enabled = true;
  let unlocked = false;          // 用户是否已有手势（unlock 成功）

  // ---------------- 音效（原有行为，保持不变） ----------------
  function ensure() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }

  function tone(freq, dur, type, vol, delay) {
    if (!enabled) return;
    const ac = ensure();
    if (!ac) return;
    try {
      const t0 = ac.currentTime + (delay || 0);
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type || 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(vol || 0.035, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) { /* 音频失败不影响游戏 */ }
  }

  // ---------------- BGM：生成式环境音乐 ----------------
  const TICK_MS = 250;            // 调度器每 250ms 醒一次
  const LOOKAHEAD = 1.0;          // 每次排期未来 1 秒内的音符
  const THEME_CHECK_EVERY = 2.0;  // 每 2 秒探测一次所在场景
  const MAX_VOICES = 12;          // BGM 同时存在的振荡器上界（防泄漏）
  const FADE_OUT = 1.2;           // 切主题：淡出时长
  const FADE_IN = 1.4;            // 启动 / 切主题：淡入时长
  const PAD_OVERLAP = 3.5;        // pad 交叉淡化重叠时长
  const STEP_POOL = [-2, -1, -1, 1, 1, 2]; // 游走步长：小步为主

  let bgmBus = null;              // BGM 总线（音效不经过它，互不影响）
  let active = false;             // BGM 调度器是否在跑
  let timer = null;
  let live = [];                  // 活跃声部 {osc, g, stopAt, pad, vol}
  let nextMelody = 0;             // 下一颗旋律音的 ctx 时间
  let nextPad = 0;                // 下一段 pad 的开始时间
  let walk = 3;                   // 五声音阶随机游走的索引
  let lastThemeCheck = -1e9;
  let currentTheme = 'outdoor';   // 场景未就绪时先用室外主题
  let pendingTheme = null;        // 过渡目标主题
  let switchAt = 0;               // 到这个时刻执行“淡出完成→换主题”
  let visibilityBound = false;

  // 双主题参数（音量纪律：旋律 ≤0.02，pad ≤0.015）
  const THEMES = {
    outdoor: { // 室外：明亮的乡村小调 —— C 大调五声，三角波，稍快
      base: 261.63, wave: 'triangle',
      scale: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24],
      lo: 0.8, hi: 1.4, noteDur: [0.7, 1.3], melVol: [0.012, 0.02],
      padRoot: 130.81, padFifth: 196.0, padVol: 0.014, padDur: 12
    },
    indoor: { // 室内：温暖安静的慢板 —— A 小调五声，正弦，更慢更轻
      base: 220.0, wave: 'sine',
      scale: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22],
      lo: 1.1, hi: 1.6, noteDur: [1.0, 1.8], melVol: [0.009, 0.014],
      padRoot: 110.0, padFifth: 164.81, padVol: 0.010, padDur: 14
    }
  };

  function rand(a, b) { return a + Math.random() * (b - a); }

  function ensureBus() {
    if (!ctx) return null;
    try {
      if (!bgmBus) {
        bgmBus = ctx.createGain();
        bgmBus.gain.value = 0;
        bgmBus.connect(ctx.destination);
      }
      return bgmBus;
    } catch (e) { bgmBus = null; return null; }
  }

  // 总线音量斜坡（cancel 后从当前实际值出发，避免爆音）
  function rampBus(target, seconds) {
    if (!bgmBus || !ctx) return;
    try {
      const now = ctx.currentTime;
      const g = bgmBus.gain;
      g.cancelScheduledValues(now);
      const cur = (typeof g.value === 'number' && g.value > 0) ? g.value : 0.0001;
      g.setValueAtTime(cur, now);
      g.linearRampToValueAtTime(Math.max(target, 0.0001), now + seconds);
    } catch (e) { /* 忽略 */ }
  }

  // 新建一个 BGM 声部；所有振荡器都有确定的 stop 时刻
  function spawnVoice(type, freq, t0, dur, vol, attack, release, isPad) {
    try {
      if (live.length >= MAX_VOICES) return false; // 组件数量上界
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const end = t0 + dur;
      const sus = Math.max(t0 + attack, end - release);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, Math.min(t0 + attack, end));
      g.gain.setValueAtTime(vol, sus);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(g);
      g.connect(bgmBus);
      osc.start(t0);
      osc.stop(end + 0.05);
      const v = { osc: osc, g: g, stopAt: end + 0.06, pad: !!isPad, vol: vol };
      osc.onended = function () {
        try { g.disconnect(); } catch (e) { /* 已断开 */ }
        try { osc.disconnect(); } catch (e) { /* 已断开 */ }
      };
      live.push(v);
      return true;
    } catch (e) { return false; }
  }

  function pruneVoices(now) {
    if (!live.length) return;
    const keep = [];
    for (let i = 0; i < live.length; i++) {
      if (live[i].stopAt > now) keep.push(live[i]);
    }
    live = keep;
  }

  // 立刻（或在 fade 秒内）终止所有 BGM 声部
  function killVoices(fade) {
    const arr = live;
    live = [];
    if (!ctx || !arr.length) return;
    const now = ctx.currentTime;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      try {
        v.g.gain.cancelScheduledValues(now);
        const cur = (typeof v.g.gain.value === 'number' && v.g.gain.value > 0)
          ? v.g.gain.value : v.vol;
        v.g.gain.setValueAtTime(Math.max(cur, 0.0001), now);
        if (fade > 0) v.g.gain.linearRampToValueAtTime(0.0001, now + fade);
        v.osc.stop(now + fade + 0.05);
      } catch (e) { /* 可能已停止 */ }
    }
  }

  // 一颗旋律音：五声音阶随机游走；偶尔留白让音乐呼吸
  function scheduleMelody(t0) {
    const th = THEMES[currentTheme];
    if (Math.random() < 0.12) return;
    const sc = th.scale;
    walk += STEP_POOL[(Math.random() * STEP_POOL.length) | 0];
    if (walk < 0) walk = Math.min(1, sc.length - 1);
    if (walk > sc.length - 1) walk = Math.max(0, sc.length - 2);
    const freq = th.base * Math.pow(2, sc[walk] / 12);
    const dur = rand(th.noteDur[0], th.noteDur[1]);
    const vol = rand(th.melVol[0], th.melVol[1]);
    spawnVoice(th.wave, freq, t0, dur, vol, 0.05, dur * 0.7, false);
    // 室外偶尔叠一个八度泛音，像远处风铃的点缀（很轻）
    if (currentTheme === 'outdoor' && Math.random() < 0.18) {
      spawnVoice('sine', freq * 2, t0 + 0.02, dur * 0.8, vol * 0.35, 0.06, dur * 0.5, false);
    }
  }

  // 一段 pad：根音 + 纯五度长音，正弦，极轻，交叉淡化衔接
  function schedulePad(t0) {
    const th = THEMES[currentTheme];
    spawnVoice('sine', th.padRoot, t0, th.padDur, th.padVol, 3.0, 3.5, true);
    spawnVoice('sine', th.padFifth, t0, th.padDur, th.padVol * 0.6, 3.0, 3.5, true);
  }

  // 每 2 秒读一次场景（防御式），决定目标主题
  function checkTheme(now) {
    let want = null;
    try {
      const st = window.__lifeGame;
      const sc = st && st.state && st.state.scene;
      if (sc && sc.id) {
        // 引擎把 indoor 放在 scene.def 里，直接放 scene 上也兼容
        const ind = typeof sc.indoor === 'boolean'
          ? sc.indoor
          : !!(sc.def && sc.def.indoor);
        want = ind ? 'indoor' : 'outdoor';
      }
    } catch (e) { want = null; }
    if (!want) return;                              // 未就绪则跳过
    if (want === currentTheme && !pendingTheme) return;
    if (pendingTheme === want) return;
    // 切主题：先淡出，到点再换（applyTheme）
    pendingTheme = want;
    switchAt = now + FADE_OUT;
    rampBus(0, FADE_OUT);
  }

  // 淡出完成：换主题、清声部、再淡入
  function applyTheme(now) {
    killVoices(0.05);
    currentTheme = pendingTheme;
    pendingTheme = null;
    walk = 3;
    nextMelody = now + 0.3;
    nextPad = now + 0.4;
    rampBus(1, FADE_IN);
  }

  function tick() {
    if (!active || !enabled || !ctx) return;
    if (ctx.state !== 'running') return;   // 被 suspend 时不排期
    const now = ctx.currentTime;
    pruneVoices(now);

    if (now - lastThemeCheck >= THEME_CHECK_EVERY) {
      lastThemeCheck = now;
      checkTheme(now);
    }
    if (pendingTheme && now >= switchAt) applyTheme(now);

    const th = THEMES[currentTheme];

    // 防追帧：调度指针落后（刚恢复可见 / resume）时重新对齐
    if (nextMelody < now - 0.05) nextMelody = now + 0.15;
    if (nextPad < now - 0.05) nextPad = now + 0.4;

    while (nextMelody < now + LOOKAHEAD) {   // lookahead：排未来 1 秒
      scheduleMelody(nextMelody);
      nextMelody += rand(th.lo, th.hi);      // 音符间隔 0.8~1.6 秒
    }
    while (nextPad < now + LOOKAHEAD) {
      schedulePad(nextPad);
      nextPad += th.padDur - PAD_OVERLAP;    // 长音交叉淡化
    }
  }

  function startBgm() {
    if (!enabled || !unlocked || active) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    const ac = ensure();
    if (!ac || !ensureBus()) return;
    active = true;
    const now = ac.currentTime;
    nextMelody = now + 0.4;
    nextPad = now + 0.2;
    rampBus(1, FADE_IN);
    if (!timer) timer = setInterval(tick, TICK_MS);
  }

  // 停止：gain 归零 + 停调度器 + 终止声部（enabled=false / 页面隐藏）
  function stopBgm() {
    const wasActive = active;
    active = false;
    pendingTheme = null;
    if (timer) { clearInterval(timer); timer = null; }
    if (wasActive && ctx) {
      rampBus(0, 0.15);
      killVoices(0.15);
    }
  }

  function bindVisibility() {
    if (visibilityBound) return;
    visibilityBound = true;
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { stopBgm(); stopAmb(); }   // 隐藏：暂停调度
        else { startBgm(); startAmb(); }                 // 恢复可见：继续
      });
    }
  }

  // ===============================================================
  //  环境声层：按场景自动切换，与 BGM 并行（独立总线、独立调度器）
  //  · 循环噪声层：共享 2 秒白噪声 buffer → 循环 AudioBufferSourceNode
  //    → BiquadFilter 滤波成型 → 层 gain（部分层挂 0.03~0.12Hz 的
  //    超低频 LFO 做缓慢起伏）；所有循环源 spawn 时就登记清理路径
  //  · 一次性事件（鸟鸣 / 喇叭 / 地铁脉冲）：短振荡器 + 确定的
  //    stop 时刻，onended 后自动断开全部节点，并有并发上界防泄漏
  //  · 场景来源：每 2 秒防御式读 window.__lifeGame.state.scene；
  //    若游戏主动调过 setScene(info)，10 秒内优先用手动信息
  //  · 生命周期与 BGM 完全同步：unlock 后启动、setEnabled(false)
  //    立即静音（总线归零 + 停源）、页面隐藏暂停、恢复可见继续；
  //    场景切换时旧层淡出、新层淡入，河声按玩家与 waterCells 的
  //    距离迟滞开关（<8 格开、>12 格关）
  //  音量预算（任意时刻各通道峰值总和 ≤0.012，含 LFO 起伏上界）：
  //    village  风 0.0052 + 河水 0.004 + 鸟鸣 0.002        ≤0.0112
  //    county   车流 0.0056 + 人声 0.0044 + 喇叭 0.0018    ≤0.0118
  //    shenzhen 城鸣 0.0048 + 人声 0.0032 + 喇叭 0.0016
  //             + 地铁 0.002                              ≤0.0116
  //    cottage  房间底噪 0.0038                            ≤0.0038
  // ===============================================================
  const AMB_MAX_SHOTS = 12;       // 一次性事件并发上界（防泄漏）
  const AMB_FADE_OUT = 0.6;       // 切场景：旧层淡出时长
  const AMB_ATTACK = 1.2;         // 新层淡入时长（也是总线淡入时长）
  const AMB_WATER_ON = 8;         // 距水面 <8 格 → 河声开
  const AMB_WATER_OFF = 12;       // 距水面 >12 格 → 河声关（迟滞带）
  const AMB_TILE = 16;            // 引擎格尺寸（世界像素/格），换算玩家距离
  const AMB_MANUAL_TTL = 10000;   // setScene 手动信息有效期（毫秒）

  let ambBus = null;              // 环境声总线（音效与 BGM 都不经过它）
  let ambActive = false;          // 环境声调度器是否在跑
  let ambTimer = null;
  let ambTheme = null;            // 当前主题；场景未就绪时为 null = 完全静默
  let ambWater = false;           // village 系场景是否叠河声
  let pendingAmb = null;          // 过渡目标 {theme, water}
  let ambSwitchAt = 0;            // 到这个时刻执行切换
  let ambLayers = [];             // 循环噪声层 {name,src,f,g,lfoOsc,lfoG}
  let ambShots = [];              // 一次性事件 {g,srcs:[],stopAt}
  let noiseBuf = null;            // 共享 2 秒白噪声 buffer（懒创建）
  let ambSceneId = null;          // 最近一次探测到的场景 id（调试观察）
  let manualScene = null;         // setScene(info) 喂进来的手动场景信息
  let lastAmbSceneCheck = -1e9;
  let nextBird = 0;               // 下一组鸟鸣的 ctx 时间
  let nextHorn = 0;               // 下一次远处喇叭的 ctx 时间
  let nextSub = 0;                // 下一次地铁脉冲的 ctx 时间

  // 各主题的循环噪声层规格（vol 即上表预算）
  const AMB_LAYERS = {
    village: [  // 轻风：低通噪声持续极低音；河水：带通噪声（近水才加）
      { name: 'wind',  vol: 0.0042, filter: { type: 'lowpass',  freq: 420, Q: 0.4 }, lfo: { rate: 0.06, depth: 0.001 } },
      { name: 'water', vol: 0.004,  filter: { type: 'bandpass', freq: 720, Q: 0.8 } }
    ],
    county: [   // 远处车流：极低频低通；人声嘈杂感：中频带通缓慢起伏
      { name: 'traffic', vol: 0.0048, filter: { type: 'lowpass',  freq: 150, Q: 0.5 }, lfo: { rate: 0.04, depth: 0.0008 } },
      { name: 'murmur',  vol: 0.0034, filter: { type: 'bandpass', freq: 500, Q: 1.4 }, lfo: { rate: 0.09, depth: 0.001 } }
    ],
    shenzhen: [ // 城市低鸣 + 更快起伏的人声底
      { name: 'hum',    vol: 0.0042, filter: { type: 'lowpass',  freq: 110, Q: 0.5 }, lfo: { rate: 0.05, depth: 0.0006 } },
      { name: 'murmur', vol: 0.0024, filter: { type: 'bandpass', freq: 620, Q: 1.2 }, lfo: { rate: 0.12, depth: 0.0008 } }
    ],
    cottage: [  // 几乎安静：极低的房间底噪
      { name: 'room',   vol: 0.0034, filter: { type: 'lowpass',  freq: 160, Q: 0.4 }, lfo: { rate: 0.03, depth: 0.0004 } }
    ]
  };

  function ensureAmbBus() {
    if (!ctx) return null;
    try {
      if (!ambBus) {
        ambBus = ctx.createGain();
        ambBus.gain.value = 0;
        ambBus.connect(ctx.destination);
      }
      return ambBus;
    } catch (e) { ambBus = null; return null; }
  }

  function rampAmbBus(target, seconds) {
    if (!ambBus || !ctx) return;
    try {
      const now = ctx.currentTime;
      const g = ambBus.gain;
      g.cancelScheduledValues(now);
      const cur = (typeof g.value === 'number' && g.value > 0) ? g.value : 0.0001;
      g.setValueAtTime(cur, now);
      g.linearRampToValueAtTime(Math.max(target, 0.0001), now + seconds);
    } catch (e) { /* 忽略 */ }
  }

  // 2 秒白噪声 buffer（所有循环噪声层共享一份）
  function getNoise() {
    if (!ctx) return null;
    if (noiseBuf) return noiseBuf;
    try {
      const len = Math.floor(ctx.sampleRate * 2);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return noiseBuf;
    } catch (e) { noiseBuf = null; return null; }
  }

  // 一次性事件节点登记：最后一个源 onended 时断开全部节点
  function bindShotCleanup(srcs, extra) {
    if (!srcs.length) return;
    srcs[srcs.length - 1].onended = function () {
      for (let i = 0; i < srcs.length; i++) {
        try { srcs[i].disconnect(); } catch (e) { /* 已断开 */ }
      }
      for (let i = 0; i < extra.length; i++) {
        try { extra[i].disconnect(); } catch (e) { /* 已断开 */ }
      }
    };
  }

  function pruneShots(now) {
    if (!ambShots.length) return;
    const keep = [];
    for (let i = 0; i < ambShots.length; i++) {
      if (ambShots[i].stopAt > now) keep.push(ambShots[i]);
    }
    ambShots = keep;
  }

  // 立刻终止所有一次性事件（setEnabled(false) / 页面隐藏）
  function killShots(fade) {
    const arr = ambShots;
    ambShots = [];
    if (!ctx || !arr.length) return;
    const now = ctx.currentTime;
    for (let i = 0; i < arr.length; i++) {
      const s = arr[i];
      try {
        s.g.gain.cancelScheduledValues(now);
        const cur = (typeof s.g.gain.value === 'number' && s.g.gain.value > 0)
          ? s.g.gain.value : 0.0001;
        s.g.gain.setValueAtTime(cur, now);
        s.g.gain.linearRampToValueAtTime(0.0001, now + fade);
        for (let j = 0; j < s.srcs.length; j++) {
          try { s.srcs[j].stop(now + fade + 0.02); } catch (e) { /* 已停 */ }
        }
      } catch (e) { /* 可能已停止 */ }
    }
  }

  // ---------- 循环噪声层的生命周期 ----------
  function teardownAmbLayer(rec) {
    try { rec.src.disconnect(); } catch (e) { /* 已断开 */ }
    try { rec.f.disconnect(); } catch (e) { /* 已断开 */ }
    try { rec.g.disconnect(); } catch (e) { /* 已断开 */ }
    if (rec.lfoG) { try { rec.lfoG.disconnect(); } catch (e) { /* 已断开 */ } }
    if (rec.lfoOsc) { try { rec.lfoOsc.disconnect(); } catch (e) { /* 已断开 */ } }
  }

  function addAmbLayer(spec, now) {
    try {
      const buf = getNoise();
      if (!buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = spec.filter.type;
      f.frequency.value = spec.filter.freq;
      if (spec.filter.Q) f.Q.value = spec.filter.Q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(spec.vol, now + AMB_ATTACK);   // 淡入
      src.connect(f);
      f.connect(g);
      g.connect(ambBus);
      src.start(now, Math.random() * 1.5);   // 随机相位，避免各层完全相关
      let lfoOsc = null, lfoG = null;
      if (spec.lfo) {                        // 缓慢起伏（风 / 人声 / 城鸣）
        lfoOsc = ctx.createOscillator();
        lfoOsc.type = 'sine';
        lfoOsc.frequency.value = spec.lfo.rate;
        lfoG = ctx.createGain();
        lfoG.gain.value = spec.lfo.depth;
        lfoOsc.connect(lfoG);
        lfoG.connect(g.gain);
        lfoOsc.start(now);
      }
      const rec = { name: spec.name, src: src, f: f, g: g, lfoOsc: lfoOsc, lfoG: lfoG };
      src.onended = function () { teardownAmbLayer(rec); };
      ambLayers.push(rec);
    } catch (e) { /* 音频失败不影响游戏 */ }
  }

  function killAmbLayer(rec, fade) {
    try {
      if (rec.lfoG) { try { rec.lfoG.disconnect(); } catch (e) { /* 已断开 */ } }
      if (!ctx) { teardownAmbLayer(rec); return; }
      const now = ctx.currentTime;
      rec.g.gain.cancelScheduledValues(now);
      const cur = (typeof rec.g.gain.value === 'number' && rec.g.gain.value > 0)
        ? rec.g.gain.value : 0.0001;
      rec.g.gain.setValueAtTime(cur, now);
      rec.g.gain.linearRampToValueAtTime(0.0001, now + fade);       // 淡出
      rec.src.stop(now + fade + 0.05);
      if (rec.lfoOsc) { try { rec.lfoOsc.stop(now + fade + 0.05); } catch (e) { /* 已停 */ } }
    } catch (e) { teardownAmbLayer(rec); }
  }

  function killAllAmbLayers(fade) {
    const arr = ambLayers;
    ambLayers = [];
    for (let i = 0; i < arr.length; i++) killAmbLayer(arr[i], fade);
  }

  // 目标主题需要的层做差量同步：不换名的层保留，其余淡出 / 淡入
  function syncAmbLayers(theme, water, now) {
    const specs = (AMB_LAYERS[theme] || []).filter(function (s) {
      return s.name !== 'water' || water;      // 河声只在近水时加入
    });
    const names = [];
    for (let i = 0; i < specs.length; i++) names.push(specs[i].name);
    const keep = [];
    for (let i = 0; i < ambLayers.length; i++) {
      const rec = ambLayers[i];
      if (names.indexOf(rec.name) !== -1) keep.push(rec);
      else killAmbLayer(rec, AMB_FADE_OUT);
    }
    ambLayers = keep;
    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      let has = false;
      for (let j = 0; j < ambLayers.length; j++) {
        if (ambLayers[j].name === s.name) { has = true; break; }
      }
      if (!has) addAmbLayer(s, now);
    }
  }

  // ---------- 一次性事件合成 ----------
  // 一声鸟啁啾：高频正弦快速下滑，极短促
  function chirp(t0, vol) {
    try {
      if (ambShots.length >= AMB_MAX_SHOTS) return;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const g = ctx.createGain();
      const f0 = rand(2100, 3400);
      const dur = rand(0.05, 0.11);
      osc.frequency.setValueAtTime(f0, t0);
      osc.frequency.exponentialRampToValueAtTime(f0 * rand(0.55, 0.8), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.03);
      osc.connect(g);
      g.connect(ambBus);
      osc.start(t0);
      osc.stop(t0 + dur + 0.06);
      bindShotCleanup([osc], [g]);
      ambShots.push({ g: g, srcs: [osc], stopAt: t0 + dur + 0.08 });
    } catch (e) { /* 忽略 */ }
  }

  // 一组鸟鸣：2~4 声短促啁啾，间隔 0.08~0.17 秒
  function scheduleBirds(t0) {
    const n = 2 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      chirp(t0 + i * rand(0.08, 0.17), rand(0.0012, 0.002));
    }
  }

  // 远处喇叭：双音三角波（F4+A4）+ 低通收「远」，音量极低
  function horn(t0, vol) {
    try {
      if (ambShots.length >= AMB_MAX_SHOTS) return;
      const dur = rand(0.25, 0.5);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1100;
      f.Q.value = 0.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      const srcs = [];
      const freqs = [349.23, 440];
      for (let i = 0; i < freqs.length; i++) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = freqs[i];
        o.connect(f);
        o.start(t0);
        o.stop(t0 + dur + 0.05);
        srcs.push(o);
      }
      f.connect(g);
      g.connect(ambBus);
      bindShotCleanup(srcs, [f, g]);
      ambShots.push({ g: g, srcs: srcs, stopAt: t0 + dur + 0.08 });
    } catch (e) { /* 忽略 */ }
  }

  // 地铁感低频脉冲：正弦下滑涌动（两节车厢的呼吸）+ 75Hz 噪声衬底
  function subwayPulse(t0) {
    try {
      if (ambShots.length >= AMB_MAX_SHOTS - 1) return;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(56, t0);
      osc.frequency.exponentialRampToValueAtTime(34, t0 + 1.8);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.0014, t0 + 0.55);
      g.gain.linearRampToValueAtTime(0.0006, t0 + 1.0);
      g.gain.linearRampToValueAtTime(0.0012, t0 + 1.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.9);
      osc.connect(g);
      g.connect(ambBus);
      osc.start(t0);
      osc.stop(t0 + 2.0);
      const srcs = [osc];
      const extra = [g];
      const buf = getNoise();
      if (buf) {
        const nsrc = ctx.createBufferSource();
        nsrc.buffer = buf;
        nsrc.loop = true;
        const nf = ctx.createBiquadFilter();
        nf.type = 'lowpass';
        nf.frequency.value = 75;
        nf.Q.value = 0.5;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.0001, t0);
        ng.gain.linearRampToValueAtTime(0.0006, t0 + 0.6);
        ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
        nsrc.connect(nf);
        nf.connect(ng);
        ng.connect(ambBus);
        nsrc.start(t0, Math.random());
        nsrc.stop(t0 + 1.9);
        srcs.push(nsrc);
        extra.push(nf, ng);
      }
      bindShotCleanup(srcs, extra);
      ambShots.push({ g: g, srcs: srcs, stopAt: t0 + 2.1 });
    } catch (e) { /* 忽略 */ }
  }

  // ---------- 场景探测 ----------
  // 玩家与最近水面的距离（格）；8 格内开河声，12 格外关（迟滞）
  function waterNearby() {
    try {
      const st = window.__lifeGame;
      const sc = st && st.state && st.state.scene;
      const p = st && st.state && st.state.player;
      if (!sc || !p || !Array.isArray(sc.waterCells) || !sc.waterCells.length) return false;
      const px = p.x / AMB_TILE, py = p.y / AMB_TILE;
      const cells = sc.waterCells;
      const max = Math.min(cells.length, 4000);   // 防御上界
      let best = 1e9;
      for (let i = 0; i < max; i++) {
        const c = cells[i];
        if (!c || typeof c[0] !== 'number' || typeof c[1] !== 'number') continue;
        const dx = (c[0] + 0.5) - px;
        const dy = (c[1] + 0.5) - py;
        const d = dx * dx + dy * dy;
        if (d < best) best = d;
      }
      const dist = Math.sqrt(best);
      if (ambWater) return dist <= AMB_WATER_OFF; // 已开：离够远才关
      return dist < AMB_WATER_ON;
    } catch (e) { return false; }
  }

  // 轮询 window.__lifeGame（防御式，任何异常都安全降级）
  function pollScene() {
    try {
      const st = window.__lifeGame;
      const sc = st && st.state && st.state.scene;
      if (!sc || !sc.id) return null;
      // 引擎把 indoor 放在 scene.def 里，直接放 scene 上也兼容
      const ind = typeof sc.indoor === 'boolean'
        ? sc.indoor
        : !!(sc.def && sc.def.indoor);
      return { id: String(sc.id), indoor: ind, waterNear: ind ? false : waterNearby() };
    } catch (e) { return null; }
  }

  // 场景信息 → 环境声主题
  function themeFor(info) {
    if (!info || !info.id) return null;
    if (info.indoor) return { theme: 'cottage', water: false };
    if (info.id === 'county') return { theme: 'county', water: false };
    if (info.id === 'shenzhen') return { theme: 'shenzhen', water: false };
    if (info.id === 'village' || info.id === 'deepwoods') {
      return { theme: 'village', water: !!info.waterNear };
    }
    return { theme: 'village', water: false };   // 其他室外场景：默认村庄底噪
  }

  // 每 2 秒一次：决定目标主题（手动 setScene 信息在有效期内优先）
  function ambCheckScene(now) {
    let info = null;
    try {
      if (manualScene && manualScene.id &&
          Date.now() - manualScene.atMs <= AMB_MANUAL_TTL) {
        info = manualScene;
      } else {
        info = pollScene();
      }
    } catch (e) { info = null; }
    if (info && info.id) ambSceneId = info.id;
    const want = themeFor(info);
    if (!want) return;                             // 场景未就绪：保持现状
    if (ambTheme === null) {                       // 首次就绪：立刻进入主题
      pendingAmb = want;
      ambSwitchAt = now + 0.01;
      return;
    }
    if (want.theme === ambTheme && want.water === ambWater && !pendingAmb) return;
    if (pendingAmb && pendingAmb.theme === want.theme &&
        pendingAmb.water === want.water) return;
    pendingAmb = want;
    ambSwitchAt = now + AMB_FADE_OUT;
  }

  function applyAmbTheme(now) {
    ambTheme = pendingAmb.theme;
    ambWater = pendingAmb.water;
    pendingAmb = null;
    syncAmbLayers(ambTheme, ambWater, now);        // 差量换层（淡出+淡入）
  }

  function ambTick() {
    if (!ambActive || !enabled || !ctx) return;
    if (ctx.state !== 'running') return;           // 被 suspend 时不排期
    const now = ctx.currentTime;
    pruneShots(now);

    if (now - lastAmbSceneCheck >= THEME_CHECK_EVERY) {
      lastAmbSceneCheck = now;
      ambCheckScene(now);
    }
    if (pendingAmb && now >= ambSwitchAt) applyAmbTheme(now);

    // —— 一次性事件调度（与 BGM 相同的 lookahead 模式）——
    if (ambTheme === 'village') {
      if (nextBird < now - 0.05) nextBird = now + rand(0.4, 1.5);   // 防追帧对齐
      while (nextBird < now + LOOKAHEAD) {
        scheduleBirds(nextBird);
        nextBird += rand(3, 8);                    // 每组间隔 3~8 秒
      }
    }
    if (ambTheme === 'county' || ambTheme === 'shenzhen') {
      const lo = ambTheme === 'county' ? 15 : 8;   // 县城 15~30s，深圳 8~16s
      const hi = ambTheme === 'county' ? 30 : 16;
      const vol = ambTheme === 'county' ? 0.0018 : 0.0016;
      if (nextHorn < now - 0.05) nextHorn = now + rand(2, 6);
      while (nextHorn < now + LOOKAHEAD) {
        const t = nextHorn;
        horn(t, vol);
        if (ambTheme === 'shenzhen' && Math.random() < 0.3) {
          horn(t + 0.26, vol * 0.8);               // 深圳偶尔双响
        }
        nextHorn += rand(lo, hi);
      }
    }
    if (ambTheme === 'shenzhen') {
      if (nextSub < now - 0.05) nextSub = now + rand(3, 7);
      while (nextSub < now + LOOKAHEAD) {
        subwayPulse(nextSub);
        nextSub += rand(8, 15);                    // 地铁脉冲每 8~15 秒
      }
    }
  }

  function startAmb() {
    if (!enabled || !unlocked || ambActive) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    const ac = ensure();
    if (!ac || !ensureAmbBus()) return;
    ambActive = true;
    const now = ac.currentTime;
    lastAmbSceneCheck = -1e9;                      // 启动后立即探测场景
    nextBird = now + rand(1.5, 4);
    nextHorn = now + rand(5, 10);
    nextSub = now + rand(4, 8);
    rampAmbBus(1, AMB_ATTACK);
    if (!ambTimer) ambTimer = setInterval(ambTick, TICK_MS);
  }

  // 停止：总线归零 + 停调度器 + 终止所有循环层与一次性事件
  function stopAmb() {
    const wasActive = ambActive;
    ambActive = false;
    pendingAmb = null;
    if (ambTimer) { clearInterval(ambTimer); ambTimer = null; }
    if (ctx) {
      rampAmbBus(0, wasActive ? 0.12 : 0.02);
      killAllAmbLayers(0.15);
      killShots(0.1);
    }
  }

  return {
    // 用户手势后调用一次，解锁 AudioContext；此后若开关打开则启动 BGM 与环境声
    unlock: function () {
      const ac = ensure();
      if (ac) {
        unlocked = true;
        bindVisibility();
        startBgm();
        startAmb();
      }
    },
    setEnabled: function (v) {
      enabled = !!v;
      if (!enabled) {            // 立即静音：总线归零 + 停两个调度器 + 停所有源
        stopBgm();
        stopAmb();
      } else {                   // 已 unlock 时恢复，否则等 unlock
        startBgm();
        startAmb();
      }
    },
    isEnabled: function () { return enabled; },
    blip:   function () { tone(520, 0.07, 'square', 0.03); },               // 交互
    step:   function () { tone(170 + Math.random() * 40, 0.045, 'triangle', 0.012); }, // 脚步
    advance: function () { tone(640, 0.05, 'square', 0.025); },            // 对话下一句
    open:   function () { tone(440, 0.06, 'square', 0.03); tone(660, 0.07, 'square', 0.03, 0.06); },
    close:  function () { tone(520, 0.05, 'square', 0.025); tone(392, 0.06, 'square', 0.025, 0.05); },
    chime:  function () { tone(784, 0.1, 'sine', 0.045); tone(1046, 0.12, 'sine', 0.045, 0.09); tone(1318, 0.16, 'sine', 0.04, 0.18); }, // 收录回忆
    flip:   function () { tone(300, 0.04, 'triangle', 0.025); },
    warp:   function () { tone(392, 0.08, 'sine', 0.04); tone(523, 0.1, 'sine', 0.04, 0.08); },

    // ---- 可选的主动场景接口：游戏可在切场景时调 setScene({id, indoor,
    // waterNear})，10 秒内优先于内部轮询；传 null 恢复纯轮询。不调也
    // 完全不影响——内部会每 2 秒防御式读 window.__lifeGame.state.scene
    setScene: function (info) {
      try {
        if (!info || !info.id) { manualScene = null; return; }
        manualScene = {
          id: String(info.id),
          indoor: typeof info.indoor === 'boolean'
            ? info.indoor
            : !!(info.def && info.def.indoor),
          waterNear: !!info.waterNear,
          atMs: Date.now()
        };
      } catch (e) { manualScene = null; }
    },

    // ---- 仅供测试 / 调试的内部状态（不参与游戏逻辑） ----
    _bgmState: function () {
      return {
        unlocked: unlocked,
        enabled: enabled,
        active: active,
        theme: currentTheme,
        pending: pendingTheme,
        voices: live.length,
        context: ctx ? ctx.state : 'none'
      };
    },
    _ambState: function () {
      return {
        unlocked: unlocked,
        enabled: enabled,
        active: ambActive,
        theme: ambTheme,
        pending: pendingAmb ? pendingAmb.theme : null,
        scene: ambSceneId,
        water: ambWater,
        layers: ambLayers.map(function (l) { return l.name; }),
        shots: ambShots.length,
        context: ctx ? ctx.state : 'none'
      };
    }
  };
})();

// 测试用只读标志：window.GameAudio._bgmActive === true 表示 BGM 调度中
Object.defineProperty(window.GameAudio, '_bgmActive', {
  get: function () { return window.GameAudio._bgmState().active; }
});
// 测试用只读标志：window.GameAudio._ambActive === true 表示环境声调度中
Object.defineProperty(window.GameAudio, '_ambActive', {
  get: function () { return window.GameAudio._ambState().active; }
});
