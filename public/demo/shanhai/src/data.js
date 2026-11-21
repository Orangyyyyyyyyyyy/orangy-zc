/* ============================================================
 * 山海司·巡荒录  —  规则与元数据层 data.js
 * 内容表见 cards.js / cards_extra.js / content.js（均由 P0 生成）
 * 允许的指令集（白名单）：见 SH.OPS
 * ============================================================ */
(function (root) {
  'use strict';
  const SH = (root.SH = root.SH || {});

  /* ============================================================
   * 0. 规则层常数（P0 0 / P1 6—8；不随内容热更）
   * ============================================================ */
  SH.RULES = {
    boardSize: 3,              // 荒痕三格
    handLimit: 10,
    drawPerTurn: 5,
    drawCap: 12,               // P0 2.2 每回合抽牌上限
    deckMin: 5,
    deckMax: 30,
    summonPerTurn: 2,          // 誓约后 3
    qiStart: 3,
    qiHardCap: 10,
    lingyongOverCap: 2,
    chainPerTurn: 3,
    statusMax: 5,
    statusTickTurn: 2,
    counterMultiplier: 1.5,
    relicSlotsBase: 2,         // 含巡吏遗物
    relicSlotsMax: 6,
    recursionDepth: 10,
    difficultyMax: 10
  };

  SH.ELEMENTS = ['金', '木', '水', '火', '土', '无'];

  SH.ELEM = {
    '金': { color: '#d9c27a', glow: 'rgba(217,194,122,.35)', key: 'jin' },
    '木': { color: '#7fae72', glow: 'rgba(127,174,114,.35)', key: 'mu' },
    '水': { color: '#5f97c4', glow: 'rgba(95,151,196,.35)', key: 'shui' },
    '火': { color: '#cf5f45', glow: 'rgba(207,95,69,.35)', key: 'huo' },
    '土': { color: '#b5926a', glow: 'rgba(181,146,106,.35)', key: 'tu' },
    '无': { color: '#9aa0a6', glow: 'rgba(154,160,166,.25)', key: 'wu' }
  };

  // 相生：金生水、水生木、木生火、火生土、土生金
  SH.GENERATES = { '金': '水', '水': '木', '木': '火', '火': '土', '土': '金' };
  // 相克：金克木、木克土、土克水、水克火、火克金
  SH.COUNTERS = { '金': '木', '木': '土', '土': '水', '水': '火', '火': '金' };
  SH.COUNTER_STATUS = { '金': '裂甲', '木': '缠绕', '土': '土牢', '水': '冻缓', '火': '灼烧' };

  /* ============================================================
   * 稀有度权重（P0 2.6 / P1 6.1 / P2 14.2.8）
   * ============================================================ */
  SH.RARITY_WEIGHT = {
    normal: { normal: 60, rare: 30, epic: 10 },
    elite: { normal: 35, rare: 45, epic: 20 },
    boss: { normal: 20, rare: 45, epic: 30, boss: 5 }
  };
  SH.RELIC_WEIGHT = {
    elite: { normal: 40, rare: 45, epic: 15, curse: 0 },
    boss: { normal: 20, rare: 45, epic: 30, curse: 5 }
  };
  SH.RARITY_NAME = { normal: '普通', rare: '稀有', epic: '史诗', boss: '首领专属', mutant: '异变', hero: '巡吏', curse: '荒遗物' };

  /* ============================================================
   * 指令白名单（P3 17.3 效果 DSL 约束）
   * ============================================================ */
  SH.OPS = [
    'dmg', 'loseHp', 'heal', 'healUnits', 'draw', 'drawDiscard', 'drawIfNight', 'drawIfCounter', 'qi', 'qiMax', 'lingyong',
    'status', 'atkZero', 'buffEnemyAtk', 'advance', 'buffUnit', 'buffUnits', 'shield', 'shieldUnit',
    'discard', 'discardAll', 'gainHuangSui', 'husui', 'terrainChoose', 'daynight', 'purify',
    'atkMult', 'dmgIfStatus', 'statusOrDmg', 'counterStatus', 'killQi', 'chainExtra', 'chainNoLimit',
    'flipFree', 'flipFreeAll', 'summonToken', 'sacrificeSummon', 'executeLow', 'gainOmen',
    'static', 'frontAtk', 'frontHpTurn', 'discountHand',
    // P6：施术表 / 巡吏技新增指令
    'buffFront', 'drawIfCounterAll', 'terrainPlus', 'delayHeal',
    'tameCheap', 'spellCheap', 'nextFeralAtk', 'atkZeroOrStun'
  ];
})(typeof window !== 'undefined' ? window : globalThis);
