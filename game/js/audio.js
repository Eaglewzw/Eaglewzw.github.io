// ===============================================================
//  GameAudio —— 合成音效 + 生成式环境音乐（BGM）
//  全部声音用 WebAudio 现场合成，零音频文件：
//  · 100% 原创，无第三方音频素材
//  · 不自动播放：AudioContext 在用户第一次按键 / 点击后才创建
//  · BGM：pentatonic 五声音阶随机游走 + 长音 pad，双主题（室外明亮
//    乡村小调 / 室内温暖慢板），audio.js 内部自带调度器（lookahead
//    定时器），页面隐藏时暂停、恢复可见时继续，切主题先淡出再换
//  · 音量纪律：音效 blip≈0.035；BGM 旋律通道 ≤0.02、pad 通道 ≤0.015，
//    任何通道都 ≤0.03，保证 BGM 明显轻于音效
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
        if (document.hidden) stopBgm();        // 隐藏：暂停调度
        else startBgm();                       // 恢复可见：继续
      });
    }
  }

  return {
    // 用户手势后调用一次，解锁 AudioContext；此后若开关打开则启动 BGM
    unlock: function () {
      const ac = ensure();
      if (ac) {
        unlocked = true;
        bindVisibility();
        startBgm();
      }
    },
    setEnabled: function (v) {
      enabled = !!v;
      if (!enabled) stopBgm();   // 立即静音：gain 归零 + 停调度器
      else startBgm();           // 已 unlock 时恢复，否则等 unlock
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
    }
  };
})();

// 测试用只读标志：window.GameAudio._bgmActive === true 表示 BGM 调度中
Object.defineProperty(window.GameAudio, '_bgmActive', {
  get: function () { return window.GameAudio._bgmState().active; }
});
