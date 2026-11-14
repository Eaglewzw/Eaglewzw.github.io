// ===============================================================
//  GameAudio —— 合成音效
//  全部音效用 WebAudio 现场合成（正弦/方波短音），零音频文件：
//  · 100% 原创，无第三方音频素材
//  · 不自动播放：AudioContext 在用户第一次按键 / 点击后才创建
//  · 开关状态保存在存档里
// ===============================================================
window.GameAudio = (function () {
  'use strict';
  let ctx = null;
  let enabled = true;

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

  return {
    // 用户手势后调用一次，解锁 AudioContext
    unlock: function () { ensure(); },
    setEnabled: function (v) { enabled = !!v; },
    isEnabled: function () { return enabled; },
    blip:   function () { tone(520, 0.07, 'square', 0.03); },               // 交互
    step:   function () { tone(170 + Math.random() * 40, 0.045, 'triangle', 0.012); }, // 脚步
    advance: function () { tone(640, 0.05, 'square', 0.025); },            // 对话下一句
    open:   function () { tone(440, 0.06, 'square', 0.03); tone(660, 0.07, 'square', 0.03, 0.06); },
    close:  function () { tone(520, 0.05, 'square', 0.025); tone(392, 0.06, 'square', 0.025, 0.05); },
    chime:  function () { tone(784, 0.1, 'sine', 0.045); tone(1046, 0.12, 'sine', 0.045, 0.09); tone(1318, 0.16, 'sine', 0.04, 0.18); }, // 收录回忆
    flip:   function () { tone(300, 0.04, 'triangle', 0.025); },
    warp:   function () { tone(392, 0.08, 'sine', 0.04); tone(523, 0.1, 'sine', 0.04, 0.08); }
  };
})();
