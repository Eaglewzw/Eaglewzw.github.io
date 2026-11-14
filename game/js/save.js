// ===============================================================
//  GameSave —— 本地存档
//  · 保存：当前场景、位置、已发现的回忆、设置项
//  · 稳定 ID：存档只记录 id 字符串。新增内容不影响旧存档；
//    删除/改名内容时，旧存档里多余的 id 会被自动忽略。
//  · 版本号 SAVE_VERSION：将来结构大改时用于迁移。
// ===============================================================
window.GameSave = (function () {
  'use strict';
  const KEY = 'lifeGame.v1';
  const SAVE_VERSION = 1;

  function defaults() {
    return {
      version: SAVE_VERSION,
      sceneId: null,
      pos: null,                 // {x, y} 逻辑像素（场景内绝对坐标）
      discovered: [],            // 已收录回忆的 id 列表
      settings: {
        sound: true,
        reducedMotion: null       // null = 跟随系统 prefers-reduced-motion
      },
      seenIntro: false,
      updatedAt: 0
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const data = JSON.parse(raw);
      const base = defaults();
      if (!data || typeof data !== 'object') return base;
      // 浅合并，保证新增字段有默认值（向前兼容）
      const out = Object.assign(base, data);
      out.settings = Object.assign(defaults().settings, data.settings || {});
      out.discovered = Array.isArray(data.discovered)
        ? data.discovered.filter(function (id) { return typeof id === 'string'; })
        : [];
      if (typeof out.sceneId !== 'string') out.sceneId = null;
      if (!out.pos || typeof out.pos.x !== 'number' || typeof out.pos.y !== 'number') out.pos = null;
      out.version = SAVE_VERSION;
      return out;
    } catch (e) {
      return defaults();
    }
  }

  function save(state) {
    try {
      const data = {
        version: SAVE_VERSION,
        sceneId: state.sceneId,
        pos: state.pos ? { x: Math.round(state.pos.x), y: Math.round(state.pos.y) } : null,
        discovered: Array.from(state.discovered || []),
        settings: state.settings,
        seenIntro: !!state.seenIntro,
        updatedAt: Date.now()
      };
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* 隐私模式等场景下静默失败 */ }
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  return { load: load, save: save, reset: reset, defaults: defaults };
})();
