// ===============================================================
//  人物
//  字段说明
//  ---------------------------------------------------------------
//  id          稳定标识（存档 / 对话引用它，建好后不要改）
//  name        对话框里显示的名字
//  sprite      sprites.js 里的人物外观（'npc-painter' 等）
//  dialogueId  对话内容（dialogues.js）
//  isDemo      true = 功能演示人物，界面上会标注「演示」
// ===============================================================
window.LIFE_DATA = window.LIFE_DATA || {};

window.LIFE_DATA.characters = {
  'painter-demo': {
    id: 'painter-demo',
    name: '老周（演示人物）',
    sprite: 'npc-painter',
    dialogueId: 'dlg-painter',
    isDemo: true
  }
};
