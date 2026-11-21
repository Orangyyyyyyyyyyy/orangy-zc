/* ============================================================
 * 山海司·巡荒录  —  P6 扩展层 p6.js
 * 内容：S16—S18 状态 / K41—K44 关键词 / 30 张异兽施术表 /
 *      16 张巡吏技 / 4 位巡吏初始牌组替换
 * 约定：本文件只做「新增 + 回填」，不改 cards.js / cards_extra.js /
 *      content.js 生成物；规则实现在 engine.js。
 * ============================================================ */
(function (root) {
  'use strict';
  const SH = (root.SH = root.SH || {});

  /* ============================================================
   * 一、状态机制 S16—S18（并入状态表）
   * ============================================================ */
  SH.STATUS_EXT = {
    '晕眩': {
      sid: 'S16',
      desc: '跳过本次行动：不执行意图、不推进、不攻击；上限 2，持续 1 回合',
      max: 2,
      turns: 1,
      bad: true,
      dispel: true,
      skipAction: true,
      perBattle: 2,
      tip: '跳过本次行动'
    },
    '束缚': {
      sid: 'S17',
      desc: '每层推进值 -2，且无法执行「推进」意图；上限 3，持续 2 回合',
      max: 3,
      turns: 2,
      bad: true,
      dispel: true,
      advPerStack: 2,
      blockAdvance: true,
      tip: '推进受阻，无法推进'
    },
    '升空': {
      sid: 'S18',
      desc: '离开荒痕格：不占格、不受敌方攻击、不阻挡推进，也不能自动攻击；上限 1',
      max: 1,
      turns: 1,
      bad: false,
      dispel: false,
      airborne: true,
      tip: '离开地面，不占格不受击，但也不阻挡'
    }
  };
  Object.keys(SH.STATUS_EXT).forEach(function (k) {
    SH.STATUSES[k] = SH.STATUS_EXT[k];
  });
  SH.STATUS_ID_BY_NAME = {};
  Object.keys(SH.STATUSES).forEach(function (k) {
    if (SH.STATUSES[k].sid) SH.STATUS_ID_BY_NAME[k] = SH.STATUSES[k].sid;
  });

  /* ============================================================
   * 二、关键词库回填 K41—K44
   * ============================================================ */
  SH.KEYWORDS_EXT = [
    { id: 'K41', name: '晕眩', def: '目标跳过本次行动', bound: '上限 2；每场每敌至多施加 2 次；可驱散；覆盖土牢', tip: '跳过本次行动。' },
    { id: 'K42', name: '束缚', def: '每层推进 -2，且封推进意图', bound: '上限 3；与缠绕同回合只取较高值，不叠乘', tip: '推进受阻，无法推进。' },
    { id: 'K43', name: '升空', def: '离开荒痕格，不占格、不受击、不阻挡', bound: '上限 1；仅异兽可获；不可驱散；不释放召唤位', tip: '离开地面，不占格不受击，但也不阻挡。' },
    { id: 'K44', name: '对空', def: '可命中升空单位', bound: '无「对空」只能打地面单位', tip: '可命中升空单位。' }
  ];
  SH.KEYWORDS_EXT.forEach(function (k) {
    if (!SH.KEYWORDS.some(function (x) { return x.id === k.id; })) SH.KEYWORDS.push(k);
  });
  // content.js 的按名索引在加载时已建好，这里补入新增词条
  SH.KEYWORD_BY_NAME = SH.KEYWORDS.reduce(function (m, k) { m[k.name] = k; return m; }, {});

  /* ============================================================
   * 三、30 张异兽施术表（每五行 6 张）
   * 打出异兽牌时二选一：召唤（原效果）/ 施术（本表，进消耗堆）
   * ============================================================ */
  SH.CAST_TABLE = [
    /* ---- 金系 6 张 ---- */
    {
      id: 'C_B_JIN_001', cost: 1, tags: ['伤害', '自损'],
      tame: { text: '对一敌造成 5 伤害，自损 2', effects: [{ op: 'dmg', target: 'enemy', v: 5 }, { op: 'loseHp', v: 2 }] },
      feral: { text: '对一敌造成 7 伤害，自损 3，附加 1 裂甲', effects: [{ op: 'dmg', target: 'enemy', v: 7 }, { op: 'loseHp', v: 3 }, { op: 'status', target: 'enemy', s: '裂甲', v: 1 }] }
    },
    {
      id: 'C_B_JIN_002', cost: 1, tags: ['防御', '回复'],
      tame: { text: '获得 5 护盾，回复 2 生命', effects: [{ op: 'shield', v: 5 }, { op: 'heal', v: 2 }] },
      feral: { text: '对一敌造成 4 伤害，巡吏回复 2 生命', effects: [{ op: 'dmg', target: 'enemy', v: 4 }, { op: 'heal', v: 2 }] }
    },
    {
      id: 'C_B_JIN_003', cost: 1, tags: ['伤害', '击杀'],
      tame: { text: '对一敌造成 4 伤害；击杀则抽 1', effects: [{ op: 'dmg', target: 'enemy', v: 4, killDraw: 1 }] },
      feral: { text: '对一敌造成 6 伤害；击杀则回 3 生命', effects: [{ op: 'dmg', target: 'enemy', v: 6, killHeal: 3 }] }
    },
    {
      id: 'C_B_JIN_006', cost: 2, tags: ['伤害', '相克'],
      tame: { text: '对一敌造成 8 伤害；相克则附加 2 裂甲', effects: [{ op: 'dmg', target: 'enemy', v: 8 }, { op: 'counterStatus', target: 'enemy', s: '裂甲', v: 2 }] },
      feral: { text: '对一敌造成 10 伤害，自损 3；相克则附加 3 裂甲', effects: [{ op: 'dmg', target: 'enemy', v: 10 }, { op: 'loseHp', v: 3 }, { op: 'counterStatus', target: 'enemy', s: '裂甲', v: 3 }] }
    },
    {
      id: 'C_B_JIN_008', cost: 1, tags: ['相生', '伤害'],
      tame: { text: '手牌 1 张减费 1，抽 1', effects: [{ op: 'discountHand', n: 1 }, { op: 'draw', v: 1 }] },
      feral: { text: '对一敌造成 5 伤害，弃 1 抽 1', effects: [{ op: 'dmg', target: 'enemy', v: 5 }, { op: 'drawDiscard', v: 1, d: 1 }] }
    },
    {
      id: 'C_B_JIN_007', cost: 2, tags: ['伤害', '击杀'],
      tame: { text: '对一敌造成 6 伤害；击杀则回 3 生命', effects: [{ op: 'dmg', target: 'enemy', v: 6, killHeal: 3 }] },
      feral: { text: '对一敌造成 8 伤害，自损 2；击杀则永久 +1 攻', effects: [{ op: 'dmg', target: 'enemy', v: 8, killPermAtk: 1 }, { op: 'loseHp', v: 2 }] }
    },

    /* ---- 木系 6 张 ---- */
    {
      id: 'C_B_MU_001', cost: 1, tags: ['控制', '伤害'],
      tame: { text: '一敌本回合攻击降至 0，抽 1', effects: [{ op: 'atkZero', target: 'enemy' }, { op: 'draw', v: 1 }] },
      feral: { text: '对一敌造成 6 伤害，自损 3', effects: [{ op: 'dmg', target: 'enemy', v: 6 }, { op: 'loseHp', v: 3 }] }
    },
    {
      id: 'C_B_MU_002', cost: 1, tags: ['召唤', '抽牌'],
      tame: { text: '召唤 1 只鹿影 2/3（临时，不占同名上限）', effects: [{ op: 'summonToken', name: '鹿影', atk: 2, hp: 3 }] },
      feral: { text: '对一敌造成 4 伤害，抽 1', effects: [{ op: 'dmg', target: 'enemy', v: 4 }, { op: 'draw', v: 1 }] }
    },
    {
      id: 'C_B_MU_003', cost: 1, tags: ['增益', '伤害'],
      tame: { text: '前哨异兽 +2 攻（本场）', effects: [{ op: 'buffFront', atk: 2 }] },
      feral: { text: '对一敌造成 6 伤害，自损 1', effects: [{ op: 'dmg', target: 'enemy', v: 6 }, { op: 'loseHp', v: 1 }] }
    },
    {
      id: 'C_B_MU_007', cost: 2, tags: ['相生', '伤害'],
      tame: { text: '本回合相生触发时抽 1', effects: [{ op: 'static', kind: 'chainDraw', v: 1, cap: 1 }] },
      feral: { text: '对一敌造成 7 伤害；若本回合已相生，附加 2 束缚', effects: [{ op: 'dmg', target: 'enemy', v: 7 }, { op: 'status', target: 'enemy', s: '束缚', v: 2, chainOnly: true }] }
    },
    {
      id: 'C_B_MU_006', cost: 2, tags: ['全体', '相克'],
      tame: { text: '对所有敌人 3 伤害；相克则抽 1', effects: [{ op: 'dmg', target: 'all', v: 3 }, { op: 'drawIfCounterAll', v: 1 }] },
      feral: { text: '对所有敌人 5 伤害，自损 3', effects: [{ op: 'dmg', target: 'all', v: 5 }, { op: 'loseHp', v: 3 }] }
    },
    {
      id: 'C_B_MU_011', cost: 2, tags: ['相生', '控制'],
      tame: { text: '获得 2 灵涌，抽 1', effects: [{ op: 'lingyong', v: 2 }, { op: 'draw', v: 1 }] },
      feral: { text: '对一敌造成 6 伤害，施加 1 束缚', effects: [{ op: 'dmg', target: 'enemy', v: 6 }, { op: 'status', target: 'enemy', s: '束缚', v: 1 }] }
    },

    /* ---- 水系 6 张 ---- */
    {
      id: 'C_B_SHUI_001', cost: 1, tags: ['控制', '伤害'],
      tame: { text: '对一敌造成 3 伤害，施加 1 冻缓', effects: [{ op: 'dmg', target: 'enemy', v: 3 }, { op: 'status', target: 'enemy', s: '冻缓', v: 1 }] },
      feral: { text: '对一敌造成 5 伤害，施加 1 晕眩', effects: [{ op: 'dmg', target: 'enemy', v: 5 }, { op: 'status', target: 'enemy', s: '晕眩', v: 1 }] }
    },
    {
      id: 'C_B_SHUI_002', cost: 1, tags: ['控制', '抽牌'],
      tame: { text: '对一敌造成 3 伤害，施加 1 冻缓', effects: [{ op: 'dmg', target: 'enemy', v: 3 }, { op: 'status', target: 'enemy', s: '冻缓', v: 1 }] },
      feral: { text: '对一敌造成 4 伤害，抽 1', effects: [{ op: 'dmg', target: 'enemy', v: 4 }, { op: 'draw', v: 1 }] }
    },
    {
      id: 'C_B_SHUI_004', cost: 2, tags: ['多段', '全体'],
      tame: { text: '对一敌造成 2 段 3 伤害', effects: [{ op: 'dmg', target: 'enemy', v: 3, times: 2 }] },
      feral: { text: '对所有敌人 3 伤害，施加 1 冻缓', effects: [{ op: 'dmg', target: 'all', v: 3 }, { op: 'status', target: 'all', s: '冻缓', v: 1 }] }
    },
    {
      id: 'C_B_SHUI_005', cost: 2, tags: ['防御', '控制'],
      tame: { text: '获得 8 护盾，回复 3 生命', effects: [{ op: 'shield', v: 8 }, { op: 'heal', v: 3 }] },
      feral: { text: '对所有敌人 2 伤害，施加 1 束缚', effects: [{ op: 'dmg', target: 'all', v: 2 }, { op: 'status', target: 'all', s: '束缚', v: 1 }] }
    },
    {
      id: 'C_B_SHUI_010', cost: 1, tags: ['控制'],
      tame: { text: '对一敌造成 3 伤害，施加 2 冻缓', effects: [{ op: 'dmg', target: 'enemy', v: 3 }, { op: 'status', target: 'enemy', s: '冻缓', v: 2 }] },
      feral: { text: '对一敌造成 4 伤害，施加 1 束缚', effects: [{ op: 'dmg', target: 'enemy', v: 4 }, { op: 'status', target: 'enemy', s: '束缚', v: 1 }] }
    },
    {
      id: 'C_B_SHUI_006', cost: 2, tags: ['全体', '控制'],
      tame: { text: '对所有敌人 2 伤害，施加 1 冻缓', effects: [{ op: 'dmg', target: 'all', v: 2 }, { op: 'status', target: 'all', s: '冻缓', v: 1 }] },
      feral: { text: '对所有敌人 3 伤害，施加 1 束缚', effects: [{ op: 'dmg', target: 'all', v: 3 }, { op: 'status', target: 'all', s: '束缚', v: 1 }] }
    },

    /* ---- 火系 6 张 ---- */
    {
      id: 'C_B_HUO_001', cost: 3, tags: ['全体', '昼夜'],
      tame: { text: '对所有敌人 3 伤害，施加 1 灼烧；抽 1', effects: [{ op: 'dmg', target: 'all', v: 3 }, { op: 'status', target: 'all', s: '灼烧', v: 1 }, { op: 'draw', v: 1 }] },
      feral: { text: '对所有敌人 5 伤害，施加 2 灼烧，自损 3', effects: [{ op: 'dmg', target: 'all', v: 5 }, { op: 'status', target: 'all', s: '灼烧', v: 2 }, { op: 'loseHp', v: 3 }] }
    },
    {
      id: 'C_B_HUO_002', cost: 2, tags: ['伤害', '自损'],
      tame: { text: '对一敌造成 6 伤害；若本回合未出牌，改为 8', effects: [{ op: 'dmg', target: 'enemy', v: 6, firstAlt: 8 }] },
      feral: { text: '对一敌造成 8 伤害，自损 3', effects: [{ op: 'dmg', target: 'enemy', v: 8 }, { op: 'loseHp', v: 3 }] }
    },
    {
      id: 'C_B_HUO_004', cost: 1, tags: ['伤害', '控制'],
      tame: { text: '对一敌造成 4 伤害，施加 1 灼烧', effects: [{ op: 'dmg', target: 'enemy', v: 4 }, { op: 'status', target: 'enemy', s: '灼烧', v: 1 }] },
      feral: { text: '对一敌造成 6 伤害，施加 1 灼烧，自损 1', effects: [{ op: 'dmg', target: 'enemy', v: 6 }, { op: 'status', target: 'enemy', s: '灼烧', v: 1 }, { op: 'loseHp', v: 1 }] }
    },
    {
      id: 'C_B_HUO_005', cost: 2, tags: ['全体', '控制'],
      tame: { text: '对所有敌人 3 伤害，施加 1 灼烧', effects: [{ op: 'dmg', target: 'all', v: 3 }, { op: 'status', target: 'all', s: '灼烧', v: 1 }] },
      feral: { text: '对所有敌人 5 伤害，施加 2 灼烧，自损 3', effects: [{ op: 'dmg', target: 'all', v: 5 }, { op: 'status', target: 'all', s: '灼烧', v: 2 }, { op: 'loseHp', v: 3 }] }
    },
    {
      id: 'C_B_HUO_006', cost: 1, tags: ['伤害', '自损'],
      tame: { text: '对一敌造成 5 伤害，自损 1', effects: [{ op: 'dmg', target: 'enemy', v: 5 }, { op: 'loseHp', v: 1 }] },
      feral: { text: '对一敌造成 7 伤害，自损 2，前哨异兽 +2 攻（本场）', effects: [{ op: 'dmg', target: 'enemy', v: 7 }, { op: 'loseHp', v: 2 }, { op: 'buffFront', atk: 2 }] }
    },
    {
      id: 'C_B_HUO_007', cost: 2, tags: ['伤害', '控制'],
      tame: { text: '对一敌造成 5 伤害；夺其灵息，灵涌 +1', effects: [{ op: 'dmg', target: 'enemy', v: 5 }, { op: 'lingyong', v: 1 }] },
      feral: { text: '对一敌造成 7 伤害，偷 1 灵涌', effects: [{ op: 'dmg', target: 'enemy', v: 7 }, { op: 'lingyong', v: 1 }] }
    },

    /* ---- 土系 6 张 ---- */
    {
      id: 'C_B_TU_001', cost: 3, tags: ['伤害', '击杀'],
      tame: { text: '对一敌造成 8 伤害；击杀回 4 生命', effects: [{ op: 'dmg', target: 'enemy', v: 8, killHeal: 4 }] },
      feral: { text: '对一敌造成 10 伤害，自损 3；击杀永久 +1 攻', effects: [{ op: 'dmg', target: 'enemy', v: 10, killPermAtk: 1 }, { op: 'loseHp', v: 3 }] }
    },
    {
      id: 'C_B_TU_002', cost: 1, tags: ['防御', '回复'],
      tame: { text: '获得 6 护盾', effects: [{ op: 'shield', v: 6 }] },
      feral: { text: '对一敌造成 3 伤害，巡吏回复 3 生命', effects: [{ op: 'dmg', target: 'enemy', v: 3 }, { op: 'heal', v: 3 }] }
    },
    {
      id: 'C_B_TU_003', cost: 1, tags: ['控制', '伤害'],
      tame: { text: '对一敌造成 4 伤害，施加 1 束缚', effects: [{ op: 'dmg', target: 'enemy', v: 4 }, { op: 'status', target: 'enemy', s: '束缚', v: 1 }] },
      feral: { text: '对一敌造成 6 伤害，自损 1', effects: [{ op: 'dmg', target: 'enemy', v: 6 }, { op: 'loseHp', v: 1 }] }
    },
    {
      id: 'C_B_TU_004', cost: 2, tags: ['防御', '相克'],
      tame: { text: '获得 7 护盾，对一敌施加 1 裂甲', effects: [{ op: 'shield', v: 7 }, { op: 'status', target: 'enemy', s: '裂甲', v: 1 }] },
      feral: { text: '对一敌造成 7 伤害，施加 2 裂甲', effects: [{ op: 'dmg', target: 'enemy', v: 7 }, { op: 'status', target: 'enemy', s: '裂甲', v: 2 }] }
    },
    {
      id: 'C_B_TU_008', cost: 2, tags: ['地形', '抽牌'],
      tame: { text: '本格地形效果 +1（本场）', effects: [{ op: 'terrainPlus', v: 1 }] },
      feral: { text: '改变本格地形为石阵，抽 1', effects: [{ op: 'terrainChoose', t: '石阵' }, { op: 'draw', v: 1 }] }
    },
    {
      id: 'C_B_TU_011', cost: 2, tags: ['防御', '回复'],
      tame: { text: '获得 9 护盾；下回合开始回复 3 生命', effects: [{ op: 'shield', v: 9 }, { op: 'delayHeal', v: 3 }] },
      feral: { text: '对一敌造成 6 伤害，巡吏回复 4 生命', effects: [{ op: 'dmg', target: 'enemy', v: 6 }, { op: 'heal', v: 4 }] }
    }
  ];

  // 回填到异兽卡：def.cast = { cost, tags, tame:{text,effects}, feral:{text,effects} }
  SH.CAST_TABLE.forEach(function (c) {
    const def = SH.CARD_BY_ID[c.id];
    if (!def) return;
    def.cast = { cost: c.cost, tags: c.tags, tame: c.tame, feral: c.feral };
    def.castText = '施术 ' + c.cost + '：' + c.tame.text + ' ／ ' + c.feral.text;
  });
  SH.CAST_BY_ID = {};
  SH.CAST_TABLE.forEach(function (c) { SH.CAST_BY_ID[c.id] = c; });

  /* ============================================================
   * 四、16 张巡吏技（每巡吏 4 张；不占 150 主卡配额）
   * ============================================================ */
  const HERO_SKILLS = [
    /* ---- 白泽 · 驯化控制 ---- */
    {
      id: 'C_H_BZ_001', name: '通物', hero: 'baiZe', rarity: 'hero', cost: 1,
      tags: ['巡吏技', '翻面', '抽牌'], text: '翻面 1 张手牌不耗灵气，抽 1',
      effects: [{ op: 'flipFree', v: 1 }, { op: 'draw', v: 1 }]
    },
    {
      id: 'C_H_BZ_002', name: '白泽图录', hero: 'baiZe', rarity: 'hero', cost: 2,
      tags: ['巡吏技', '控制'], text: '一敌本回合攻击降至 0；精英或首领改为晕眩 1',
      effects: [{ op: 'atkZeroOrStun', target: 'enemy', s: '晕眩', v: 1 }]
    },
    {
      id: 'C_H_BZ_003', name: '瑞兽庇护', hero: 'baiZe', rarity: 'hero', cost: 1,
      tags: ['巡吏技', '防御', '回复'], text: '获得 6 护盾，回复 2 生命',
      effects: [{ op: 'shield', v: 6 }, { op: 'heal', v: 2 }]
    },
    {
      id: 'C_H_BZ_004', name: '万物之名', hero: 'baiZe', rarity: 'hero', cost: 2,
      tags: ['巡吏技', '抽牌', '驯化'], text: '抽 2；本回合下一张驯化面牌费用 -1',
      effects: [{ op: 'draw', v: 2 }, { op: 'tameCheap', v: 1 }]
    },

    /* ---- 穷奇 · 凶化爆发 ---- */
    {
      id: 'C_H_QQ_001', name: '纵凶', hero: 'qiongQi', rarity: 'hero', cost: 1,
      tags: ['巡吏技', '凶化'], text: '本回合下一张凶化面牌自损减半，攻击 +1',
      effects: [{ op: 'static', kind: 'feralSelfHalf' }, { op: 'nextFeralAtk', v: 1 }]
    },
    {
      id: 'C_H_QQ_002', name: '凶兽噬', hero: 'qiongQi', rarity: 'hero', cost: 2,
      tags: ['巡吏技', '伤害', '自损', '击杀'], text: '对一敌造成 7 伤害，自损 2；击杀则回 3 生命',
      effects: [{ op: 'dmg', target: 'enemy', v: 7, killHeal: 3 }, { op: 'loseHp', v: 2 }]
    },
    {
      id: 'C_H_QQ_003', name: '暴戾', hero: 'qiongQi', rarity: 'hero', cost: 1,
      tags: ['巡吏技', '自损', '抽牌'], text: '自损 3，抽 2，获得 1 灵涌',
      effects: [{ op: 'loseHp', v: 3 }, { op: 'draw', v: 2 }, { op: 'lingyong', v: 1 }]
    },
    {
      id: 'C_H_QQ_004', name: '凶化狂潮', hero: 'qiongQi', rarity: 'hero', cost: 3,
      tags: ['巡吏技', '全体', '自损'], text: '对所有敌人 5 伤害，自损 4；每击杀 1 个回 2 生命',
      effects: [{ op: 'dmg', target: 'all', v: 5, killHeal: 2 }, { op: 'loseHp', v: 4 }]
    },

    /* ---- 招摇 · 地形防御 ---- */
    {
      id: 'C_H_ZY_001', name: '镇岳', hero: 'zhaoYao', rarity: 'hero', cost: 1,
      tags: ['巡吏技', '前排', '增益'], text: '前哨格异兽 +3 生命（本场）',
      effects: [{ op: 'frontHpTurn', v: 3 }]
    },
    {
      id: 'C_H_ZY_002', name: '山势', hero: 'zhaoYao', rarity: 'hero', cost: 2,
      tags: ['巡吏技', '防御', '地形'], text: '获得 8 护盾；本格地形效果 +1（本场）',
      effects: [{ op: 'shield', v: 8 }, { op: 'terrainPlus', v: 1 }]
    },
    {
      id: 'C_H_ZY_003', name: '磐石', hero: 'zhaoYao', rarity: 'hero', cost: 1,
      tags: ['巡吏技', '增益', '防御'], text: '前哨异兽 +4 生命，获得 3 护盾',
      effects: [{ op: 'buffFront', hp: 4 }, { op: 'shield', v: 3 }]
    },
    {
      id: 'C_H_ZY_004', name: '地脉', hero: 'zhaoYao', rarity: 'hero', cost: 2,
      tags: ['巡吏技', '地形', '抽牌'], text: '改变本格地形为石阵；抽 1',
      effects: [{ op: 'terrainChoose', t: '石阵' }, { op: 'draw', v: 1 }]
    },

    /* ---- 巫咸 · 术法相生 ---- */
    {
      id: 'C_H_WX_001', name: '问神', hero: 'wuXian', rarity: 'hero', cost: 1,
      tags: ['巡吏技', '抽牌', '相生'], text: '抽 2，获得 1 灵涌',
      effects: [{ op: 'draw', v: 2 }, { op: 'lingyong', v: 1 }]
    },
    {
      id: 'C_H_WX_002', name: '蓍草', hero: 'wuXian', rarity: 'hero', cost: 1,
      tags: ['巡吏技', '相生', '抽牌'], text: '本回合相生额外触发 1 次；抽 1',
      effects: [{ op: 'chainExtra', v: 1 }, { op: 'draw', v: 1 }]
    },
    {
      id: 'C_H_WX_003', name: '灵光', hero: 'wuXian', rarity: 'hero', cost: 0,
      tags: ['巡吏技', '相生', '术法'], text: '获得 1 灵涌；本回合下一张术法费用 -1',
      effects: [{ op: 'lingyong', v: 1 }, { op: 'spellCheap', v: 1 }]
    },
    {
      id: 'C_H_WX_004', name: '巫祝', hero: 'wuXian', rarity: 'hero', cost: 2,
      tags: ['巡吏技', '全体', '相生'], text: '对所有敌人 3 伤害；若本回合已相生，改为 5',
      effects: [{ op: 'dmg', target: 'all', v: 3, chainAlt: 5 }]
    }
  ];

  SH.CARDS_HERO_SKILL = HERO_SKILLS.map(function (s) {
    return {
      id: s.id,
      name: s.name,
      type: 'heroSkill',
      element: '无',
      rarity: s.rarity,
      hero: s.hero,
      heroOnly: true,
      tags: s.tags,
      upgradeText: '减费 1',
      faces: {
        tame: { cost: s.cost, text: s.text, effects: s.effects, exhaust: false }
      }
    };
  });
  SH.CARD_HERO_SKILL_BY_ID = {};
  SH.CARDS_HERO_SKILL.forEach(function (c) {
    SH.CARD_BY_ID[c.id] = c;
    SH.CARD_HERO_SKILL_BY_ID[c.id] = c;
  });

  // 巡吏技分池：入初始牌组 2 张 / 入奖励、坊市池 2 张
  SH.HERO_SKILL_STARTER = { baiZe: ['C_H_BZ_001', 'C_H_BZ_002'], qiongQi: ['C_H_QQ_001', 'C_H_QQ_002'], zhaoYao: ['C_H_ZY_001', 'C_H_ZY_002'], wuXian: ['C_H_WX_001', 'C_H_WX_002'] };
  SH.HERO_SKILL_REWARD = { baiZe: ['C_H_BZ_003', 'C_H_BZ_004'], qiongQi: ['C_H_QQ_003', 'C_H_QQ_004'], zhaoYao: ['C_H_ZY_003', 'C_H_ZY_004'], wuXian: ['C_H_WX_003', 'C_H_WX_004'] };

  /* ============================================================
   * 五、4 巡吏初始牌组替换（10 张不变，各换入 2 张巡吏技）
   * ============================================================ */
  SH.DECK_PATCH = [
    { hero: 'baiZe', remove: ['C_S_WU_001', 'C_Y_JIN_001'], add: ['C_H_BZ_001', 'C_H_BZ_002'], note: '净心→通物；金祭→白泽图录' },
    { hero: 'qiongQi', remove: ['C_S_JIN_001', 'C_S_HUO_002'], add: ['C_H_QQ_001', 'C_H_QQ_002'], note: '金刃→纵凶；火灵弹→凶兽噬' },
    { hero: 'zhaoYao', remove: ['C_S_TU_002', 'C_Y_TU_001'], add: ['C_H_ZY_001', 'C_H_ZY_002'], note: '石肤→镇岳；土祭→山势' },
    { hero: 'wuXian', remove: ['C_Y_SHUI_001', 'C_S_WU_005'], add: ['C_H_WX_001', 'C_H_WX_002'], note: '水祭→问神；灵光一闪→蓍草' }
  ];

  SH.P6_APPLIED = [];
  SH.DECK_PATCH.forEach(function (p) {
    const h = SH.HERO_BY_ID[p.hero];
    if (!h || !Array.isArray(h.deck)) return;
    // 幂等：已换过则跳过
    if (p.add.every(function (id) { return h.deck.indexOf(id) >= 0; })) return;
    p.remove.forEach(function (id) {
      const i = h.deck.indexOf(id);
      if (i >= 0) h.deck.splice(i, 1);
    });
    p.add.forEach(function (id) {
      if (h.deck.indexOf(id) < 0) h.deck.push(id);
    });
    SH.P6_APPLIED.push(p.hero);
  });

  /* ============================================================
   * 六、口径备注（供 UI / 测试引用）
   * ============================================================ */
  SH.P6_NOTES = {
    cast: '异兽牌打出时二选一：召唤（原效果）或施术（本表）；施术后进消耗堆；荒蚀只禁召唤。',
    self: '施术不产生单位：「自身 +N 生命」结算为巡吏回复；「自身 +N 攻」结算为前哨异兽 +N 攻（无单位则无效）。',
    lingyong: '敌方无灵涌资源，「敌灵涌 -1 / 偷 1 灵气」统一结算为巡吏灵涌 +1。',
    feralUnit: '「凶化单位」按精英 / 首领判定。',
    heroSkill: '巡吏技不召唤、不占格、无属性不参与相生；不触发术法 / 祭仪 / 召唤时遗物。'
  };
})(typeof window !== 'undefined' ? window : globalThis);
