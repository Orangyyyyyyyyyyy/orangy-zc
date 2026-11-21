/* ============================================================
 * 山海司·巡荒录  —  巡荒进程 run.js
 * 一局游戏的状态：牌组 / 遗物 / 誓约 / 荒髓 / 地图进度 / 经济
 * 实现 P1 6·7·8·9 与 P2 内容池规则
 * ============================================================ */
(function (root) {
  'use strict';
  const SH = (root.SH = root.SH || {});
  const U = SH.util;

  const RUN = (SH.run = {});

  // 图鉴：首次获得即录入（只写 META，不影响本局规则与数值）
  function noteCodex(run, id, src) {
    if (!SH.codex) return;
    SH.codex.record(id, src);
    if (run && run.stats) run.stats.codexSeen = SH.codex.count();
  }

  /* ---------------- 荒阶词缀（P0 5.11.4：先按适用荒阶过滤再随机） ---------------- */
  RUN.rollAffixes = function (difficulty, seed) {
    if (!difficulty) return [];
    const pool = SH.AFFIXES.filter((a) => a.minRank <= difficulty && !a.notReady);
    const rng = SH.makeRng(SH.subSeed(seed, 'affix', difficulty));
    const picked = [];
    const conflict = {};
    let guard = 0;
    while (picked.length < Math.min(difficulty, pool.length) && guard++ < 200) {
      const a = rng.pick(pool);
      if (picked.indexOf(a.id) >= 0) continue;
      if (conflict[a.id]) continue;
      picked.push(a.id);
      a.conflict.forEach((c) => { conflict[c] = true; });
    }
    return picked;
  };

  /* ---------------- 开局 ---------------- */
  RUN.create = function (heroId, seedInput, difficulty) {
    const hero = SH.HERO_BY_ID[heroId] || SH.HEROES[0];
    const seed = seedInput == null ? Math.floor(Math.random() * 0xffffffff) >>> 0 : seedInput >>> 0;
    const diff = Math.max(0, Math.min(SH.RULES.difficultyMax, difficulty || 0));
    const affixes = RUN.rollAffixes(diff, seed);
    const dm = SH.engine ? SH.engine.diffMods({ affixes: affixes }) : { playerMaxHp: 0 };
    const maxHp = Math.max(20, hero.hp + (dm.playerMaxHp || 0));
    const run = {
      version: SH.VERSION,
      saveVersion: SH.SAVE_VERSION,
      seed: seed,
      seedCode: 'SH-' + seed.toString(36).toUpperCase(),
      heroId: hero.id,
      heroName: hero.name,
      difficulty: diff,
      affixes: affixes,
      hp: maxHp,
      maxHp: maxHp,
      husui: 30,
      deck: hero.deck.map((id) => ({ uid: U.uid('c'), id: id, upgraded: false, face: 'tame' })),
      relics: [hero.relic],
      relicSlotBonus: 0,
      omens: [],
      volume: 1,
      map: SH.mapgen.generate(1, seed),
      nodeId: null,
      layer: 0,
      path: [],
      clears: { removes: 0, upgrades: 0, mutates: 0 },
      seenEvents: [],
      shopRefreshes: {},
      eventChoices: 0,
      flags: { freeRefreshUsed: false, husuiBoost: 0, noShopBuy: true },
      stats: {
        battles: 0, elites: 0, bosses: 0, turns: 0, kills: 0, damage: 0,
        flips: 0, summons: 0, chainMax: 0, purifies: 0, dmgMax: 0,
        flipsTotal: 0, cardsPlayed: 0, altarUses: 0, shopBuys: 0,
        eventChoices: 0, paidHp: 0
      },
      log: []
    };
    if (run.relics[0] && SH.RELIC_BY_ID[run.relics[0]] && SH.RELIC_BY_ID[run.relics[0]].mods && SH.RELIC_BY_ID[run.relics[0]].mods.maxHp) {
      run.maxHp = Math.max(20, run.maxHp + SH.RELIC_BY_ID[run.relics[0]].mods.maxHp);
      run.hp = Math.min(run.hp, run.maxHp);
    }
    if (SH.codex) {
      SH.codex.recordDeck(run);
      run.stats.codexSeen = SH.codex.count();
    }
    return run;
  };

  /* ---------------- 牌组操作 ---------------- */
  RUN.deckAdd = function (run, cardId, opts) {
    const def = SH.CARD_BY_ID[cardId];
    if (!def || def.notReady) return false;
    if (run.deck.length >= SH.RULES.deckMax) return false;
    const same = run.deck.filter((c) => c.id === cardId).length;
    if (same >= RUN.maxCopiesOf(def)) return false;
    run.deck.push(Object.assign({ uid: U.uid('c'), id: cardId, upgraded: false, face: 'tame' }, opts || {}));
    noteCodex(run, cardId, 'obtain');
    return true;
  };

  RUN.maxCopiesOf = function (def) {
    if (!def) return 1;
    if (def.rarity === 'normal') return 2;
    return 1;
  };

  // P6：巡吏技奖励池（仅本巡吏、按同名上限过滤）
  RUN.heroSkillPool = function (run) {
    const list = (SH.HERO_SKILL_REWARD || {})[run.heroId] || [];
    return list.filter(function (id) {
      const def = SH.CARD_BY_ID[id];
      if (!def) return false;
      return run.deck.filter(function (c) { return c.id === id; }).length < RUN.maxCopiesOf(def);
    });
  };

  RUN.deckRemove = function (run, uid) {
    if (run.deck.length <= SH.RULES.deckMin) return false;
    const i = run.deck.findIndex((c) => c.uid === uid);
    if (i < 0) return false;
    run.deck.splice(i, 1);
    return true;
  };

  RUN.deckUpgrade = function (run, uid) {
    const c = run.deck.find((x) => x.uid === uid);
    if (!c || c.upgraded) return false;
    c.upgraded = true;
    return true;
  };

  RUN.deckMutate = function (run, uid) {
    const c = run.deck.find((x) => x.uid === uid);
    if (!c) return false;
    const def = SH.CARD_BY_ID[c.id];
    if (!def || !def.mutateTo) return false;
    if (!SH.CARD_BY_ID[def.mutateTo] || SH.CARD_BY_ID[def.mutateTo].notReady) return false;
    if (run.deck.length <= SH.RULES.deckMin) return false;
    const target = def.mutateTo;
    const i = run.deck.indexOf(c);
    run.deck[i] = { uid: U.uid('c'), id: target, upgraded: false, face: 'tame' };
    noteCodex(run, target, 'mutate');
    return true;
  };

  /* ---------------- 遗物（P1 6.1 槽位） ---------------- */
  RUN.relicSlots = function (run) {
    let n = SH.RULES.relicSlotsBase;
    n += (run.volume - 1);
    n += (run.relicSlotBonus || 0);
    const dm = SH.engine ? SH.engine.diffMods(run) : { relicSlots: 0 };
    n += dm.relicSlots || 0;
    return Math.max(1, Math.min(SH.RULES.relicSlotsMax, n));
  };

  RUN.addRelic = function (run, relicId) {
    if (run.relics.indexOf(relicId) >= 0) return false;
    const def = SH.RELIC_BY_ID[relicId];
    if (!def || def.notReady) return false;
    if (run.relics.length >= RUN.relicSlots(run)) return false;
    // 互斥
    if ((def.conflict || []).some((c) => run.relics.indexOf(c) >= 0)) return false;
    run.relics.push(relicId);
    if (def.mods && def.mods.maxHp) {
      run.maxHp = Math.max(20, run.maxHp + def.mods.maxHp);
      run.hp = Math.min(run.hp, run.maxHp);
    }
    return true;
  };

  RUN.relicConflict = function (run, relicId) {
    const def = SH.RELIC_BY_ID[relicId];
    if (!def) return false;
    if ((def.conflict || []).some((c) => run.relics.indexOf(c) >= 0)) return true;
    return run.relics.some((r) => (SH.RELIC_BY_ID[r].conflict || []).indexOf(relicId) >= 0);
  };

  RUN.addOmen = function (run, omenId) {
    if (run.omens.indexOf(omenId) >= 0) return false;
    if (run.omens.length >= 3) return false;
    run.omens.push(omenId);
    const mod = (SH.OMEN_BY_ID[omenId] || {}).mod || {};
    if (mod.maxHp) {
      run.maxHp = Math.max(20, run.maxHp + mod.maxHp);
      run.hp = Math.min(run.maxHp, run.hp + Math.max(0, mod.maxHp));
    }
    run.hp = Math.min(run.hp, run.maxHp);
    return true;
  };

  /* ---------------- 卡池与掉落 ---------------- */
  function cardPool(run, kinds, type) {
    return SH.CARDS.filter((c) => {
      if (c.notReady || c.rarity === 'mutant') return false;
      if (type && c.type !== type) return false;
      if (kinds && kinds.indexOf(c.rarity) < 0) return false;
      return true;
    });
  }

  RUN.rollCardRewards = function (run, kind) {
    const wmap = SH.RARITY_WEIGHT[kind === 'elite' ? 'elite' : kind === 'boss' ? 'boss' : 'normal'];
    const rng = SH.makeRng(SH.subSeed(run.seed, 'reward', run.nodeId + '|' + run.path.length));
    const picks = [];
    const used = {};
    let guard = 0;
    const available = (card) => {
      const copies = run.deck.filter((c) => c.id === card.id).length;
      return copies < RUN.maxCopiesOf(card);
    };
    while (picks.length < 3 && guard++ < 120) {
      const rarity = rng.weighted(Object.keys(wmap).map((r) => ({ v: r, w: wmap[r] })));
      const pool = cardPool(run, [rarity]).filter((c) => !used[c.id] && available(c));
      if (!pool.length) continue;
      const c = rng.pick(pool);
      used[c.id] = true;
      picks.push(c.id);
    }
    if (picks.length < 3) {
      const fallback = cardPool(run).filter((c) => !used[c.id] && available(c));
      rng.shuffle(fallback);
      fallback.slice(0, 3 - picks.length).forEach((c) => picks.push(c.id));
    }
    // P0 2.6：三选一至少 1 张与巡吏标签或已有遗物标签相关
    const heroTags = {
      baiZe: ['驯化', '控制', '翻面', '抽牌'],
      qiongQi: ['凶化', '自损', '击杀'],
      zhaoYao: ['地形', '前排', '防御', '誓约'],
      wuXian: ['术法', '相生', '抽牌']
    }[run.heroId] || [];
    const relicTags = [];
    run.relics.forEach((id) => ((SH.RELIC_BY_ID[id] || {}).tags || []).forEach((t) => relicTags.push(t)));
    const relateTags = heroTags.concat(relicTags);
    const related = (id) => ((SH.CARD_BY_ID[id] || {}).tags || []).some((t) => relateTags.indexOf(t) >= 0);
    if (picks.length && !picks.some(related)) {
      const pool = cardPool(run).filter((c) => !used[c.id] && available(c) && related(c.id) && picks.indexOf(c.id) < 0);
      if (pool.length) picks[0] = rng.pick(pool).id;
    }
    // P6：巡吏技按概率占一个奖励位
    const skillPool = RUN.heroSkillPool(run).filter((id) => picks.indexOf(id) < 0);
    if (picks.length && skillPool.length && rng.chance(0.45)) picks[picks.length - 1] = rng.pick(skillPool);
    return picks;
  };

  RUN.rollRelic = function (run, kind) {
    const wmap = SH.RELIC_WEIGHT[kind === 'boss' ? 'boss' : 'elite'];
    const rng = SH.makeRng(SH.subSeed(run.seed, 'relic', run.nodeId + '|' + run.path.length));
    const owned = {};
    run.relics.forEach((r) => { owned[r] = true; });
    const pool = SH.RELICS.filter((r) => !owned[r.id] && !r.heroOnly && !r.notReady && !RUN.relicConflict(run, r.id));
    let guard = 0;
    while (guard++ < 60) {
      const rarity = rng.weighted(Object.keys(wmap).map((r) => ({ v: r, w: wmap[r] })));
      const list = pool.filter((r) => r.rarity === rarity);
      if (list.length) return rng.pick(list).id;
    }
    return pool.length ? rng.pick(pool).id : null;
  };

  RUN.rollRelicByRarity = function (run, rarity) {
    const pool = SH.RELICS.filter((r) => !r.heroOnly && !r.notReady && r.rarity === rarity &&
      run.relics.indexOf(r.id) < 0 && !RUN.relicConflict(run, r.id));
    if (!pool.length) return null;
    const rng = SH.makeRng(SH.subSeed(run.seed, 'relicPick', rarity + run.path.length));
    return rng.pick(pool).id;
  };

  /* ---------------- 敌人编成 ---------------- */
  RUN.bossFor = function (run) {
    const vol = SH.VOLUMES[run.volume - 1];
    if (run.volume === 1 && (run.difficulty || 0) >= 3) return 'B04';
    if (run.volume === 2 && (run.difficulty || 0) >= 5) return 'B05';
    return vol.boss;
  };

  RUN.makeEncounter = function (run, node) {
    const vol = SH.VOLUMES[run.volume - 1];
    const rng = SH.makeRng(SH.subSeed(run.seed, 'enc', node.id));
    if (node.type === 'boss') {
      return { kind: 'boss', enemies: [RUN.bossFor(run)], volume: run.volume, terrainCount: vol.terrainCount };
    }
    if (node.type === 'elite') {
      const elite = rng.pick(vol.elite);
      return { kind: 'elite', enemies: [elite], volume: run.volume, terrainCount: vol.terrainCount };
    }
    const count = rng.chance(0.35) ? 2 : 1;
    const enemies = [];
    for (let i = 0; i < count; i++) {
      let id = rng.pick(vol.normal);
      let guard = 0;
      while (enemies.indexOf(id) >= 0 && guard++ < 10) id = rng.pick(vol.normal);
      enemies.push(id);
    }
    return { kind: 'battle', enemies: enemies, volume: run.volume, terrainCount: vol.terrainCount };
  };

  /* ---------------- 荒髓产出（P1 7.1） ---------------- */
  RUN.husuiReward = function (run, kind) {
    const table = {
      battle: [12, 14, 16],
      elite: [35, 40, 45],
      boss: [60, 70, 80]
    };
    const base = (table[kind] || table.battle)[run.volume - 1] || 12;
    const rng = SH.makeRng(SH.subSeed(run.seed, 'husui', run.nodeId + kind));
    let value = base + rng.range(-1, 1);
    if ((run.omens || []).indexOf('O08') >= 0) value = Math.round(value * 1.25);
    if (SH.engine && SH.engine.diffMods(run).husuiGain) value = Math.round(value * (1 + SH.engine.diffMods(run).husuiGain));
    run.relics.forEach((id) => {
      const r = SH.RELIC_BY_ID[id];
      if (!r || !r.mods) return;
      if (r.mods.husuiBonus) value += r.mods.husuiBonus;
      if (r.mods.husuiGainPct) value = Math.round(value * (1 + r.mods.husuiGainPct));
    });
    if (run.flags && run.flags.husuiGainMod) value = Math.round(value * (1 + run.flags.husuiGainMod));
    return Math.max(0, value);
  };

  RUN.gainHusui = function (run, v) {
    run.husui = Math.max(0, run.husui + v);
  };

  /* ---------------- 坊市（P1 7.2） ---------------- */
  RUN.shopStock = function (run, nodeId) {
    const rng = SH.makeRng(SH.subSeed(run.seed, 'shop', nodeId));
    const cards = [];
    const rarities = run.volume >= 3 ? { normal: 50, rare: 30, epic: 20 } : { normal: 60, rare: 30, epic: 10 };
    for (let i = 0; i < 3; i++) {
      const rarity = rng.weighted(Object.keys(rarities).map((r) => ({ v: r, w: rarities[r] })));
      const pool = cardPool(run, [rarity]).filter((c) => cards.indexOf(c.id) < 0);
      if (pool.length) cards.push(rng.pick(pool).id);
    }
    // P6：巡吏技按概率上架
    const skillPool = RUN.heroSkillPool(run).filter((id) => cards.indexOf(id) < 0);
    if (cards.length && skillPool.length && rng.chance(0.35)) cards[cards.length - 1] = rng.pick(skillPool);
    const relicRarities = { normal: 50, rare: 40, epic: 10 };
    const relics = [];
    const owned = {};
    run.relics.forEach((r) => { owned[r] = true; });
    for (let i = 0; i < 2; i++) {
      let guard = 0;
      while (guard++ < 40) {
        const rarity = rng.weighted(Object.keys(relicRarities).map((r) => ({ v: r, w: relicRarities[r] })));
        const pool = SH.RELICS.filter((r) => r.rarity === rarity && !r.heroOnly && !r.notReady && !owned[r.id] && !RUN.relicConflict(run, r.id));
        if (pool.length) {
          const pick = rng.pick(pool);
          owned[pick.id] = true;
          relics.push(pick.id);
          break;
        }
      }
    }
    return { cards: cards, relics: relics, husuiPack: true, bought: [], refreshed: 0, noRefresh: (SH.engine && SH.engine.diffMods(run).noRefresh) || false };
  };

  RUN.cardPrice = function (run, cardId) {
    const def = SH.CARD_BY_ID[cardId];
    if (!def) return 30;
    const table = { normal: 22, rare: 48, epic: 85, boss: 120 };
    let p = table[def.rarity] || 30;
    if (SH.engine) p = Math.round(p * (1 + SH.engine.diffMods(run).shopPrice));
    return p;
  };

  RUN.relicPrice = function (run, relicId) {
    const def = SH.RELIC_BY_ID[relicId];
    if (!def) return 40;
    const table = { normal: 35, rare: 70, epic: 120, curse: 0, hero: 0 };
    let p = table[def.rarity] || 40;
    if (SH.engine) p = Math.round(p * (1 + SH.engine.diffMods(run).shopPrice));
    return p;
  };

  RUN.priceWithOmen = function (run, price) {
    const omen = (run.omens || []).indexOf('O08') >= 0 ? 1.2 : 1;
    return Math.round(price * omen);
  };

  /* ---------------- 祭坛（P1 7.3） ---------------- */
  RUN.altarQuote = function (run) {
    const omen = (run.omens || []).indexOf('O07') >= 0 ? 1.5 : 1;
    const r = run.clears;
    return {
      remove: Math.round((40 + 15 * r.removes) * omen),
      upgrade: Math.round((30 + 10 * r.upgrades) * omen),
      mutate: Math.round((60 + 20 * r.mutates) * omen),
      lifeRemove: 15
    };
  };

  /* ---------------- 事件标签联动（P0 5.9.6，13 条） ---------------- */
  function tagCount(run, tag) {
    return run.deck.filter((c) => {
      const d = SH.CARD_BY_ID[c.id];
      return d && (d.tags || []).indexOf(tag) >= 0;
    }).length;
  }
  function elemCount(run, elem) {
    return run.deck.filter((c) => (SH.CARD_BY_ID[c.id] || {}).element === elem).length;
  }
  function relicTagCount(run, tag) {
    return run.relics.filter((id) => ((SH.RELIC_BY_ID[id] || {}).tags || []).indexOf(tag) >= 0).length;
  }
  function adjustCost(opt, key, value) {
    opt.cost = opt.cost || {};
    opt.cost[key] = value;
  }

  RUN.applyEventLink = function (run, def) {
    const ev = JSON.parse(JSON.stringify(def));
    ev.options = (ev.options || []).map((o) => JSON.parse(JSON.stringify(o)));
    const feral = tagCount(run, '凶化');
    const tame = tagCount(run, '驯化');
    const chain = tagCount(run, '相生');
    const front = tagCount(run, '前排');
    const daynight = tagCount(run, '昼夜');
    const summon = tagCount(run, '召唤');
    const elems = ['金', '木', '水', '火', '土'].filter((e) => elemCount(run, e) > 0).length;
    const omens = (run.omens || []).length;
    const flipRelics = relicTagCount(run, '翻面');
    const lowHp = run.hp <= run.maxHp * 0.5;
    const eroded = !!(run.flags && run.flags.erodedThisRun);
    const hit = [];
    const opt = (i) => ev.options[i];

    switch (ev.id) {
      case 'V001':
        if (feral >= 3 && opt(0)) { adjustCost(opt(0), 'husui', 4); hit.push('凶化面 ≥3：赎价 6→4'); }
        break;
      case 'V012':
        if (feral >= 3 && opt(0)) { opt(0).gain.randomRelic = 'epic'; hit.push('凶化面 ≥3：随机遗物升为史诗'); }
        break;
      case 'V033':
        if (feral >= 3 && opt(0)) { opt(0).gain.randomCard = 'epic'; hit.push('凶化面 ≥3：战斗奖励升为史诗'); }
        break;
      case 'V029':
      case 'V034':
        if (tame >= 3 && opt(0)) { opt(0).gain.randomCard = 'rare'; hit.push('驯化面 ≥3：奖励升为稀有'); }
        break;
      case 'V025':
        if (elems >= 2) {
          ev.options.push({ text: '付 15 荒髓 → 随机稀有遗物', cost: { husui: 15 }, gain: { randomRelic: 'rare' } });
          hit.push('五行 ≥2 种：追加稀有遗物选项');
        }
        break;
      case 'V005':
        if (eroded && opt(0)) { opt(0).gain.draw = 1; hit.push('有荒蚀牌：净化额外抽 1'); }
        break;
      case 'V021':
        if (eroded && opt(1)) { adjustCost(opt(1), 'husui', 12); hit.push('有荒蚀牌：净化代价 18→12'); }
        break;
      case 'V036':
        if (lowHp && opt(0)) { adjustCost(opt(0), 'husui', 10); hit.push('生命 ≤50%：代价 15→10'); }
        break;
      case 'V004':
        if (omens >= 1 && opt(1)) { opt(1).gain = { upgrade: 1 }; hit.push('有誓约：誓约选项改为升级'); }
        break;
      case 'V022':
        if (omens >= 1 && opt(1)) { opt(1).gain = { randomRelic: 'rare' }; hit.push('有誓约：誓约选项改为稀有遗物'); }
        break;
      case 'V028':
        if (omens >= 1) {
          if (opt(0)) adjustCost(opt(0), 'husui', 16);
          if (opt(1)) adjustCost(opt(1), 'husui', 16);
          hit.push('有誓约：价格 -20%');
        }
        break;
      case 'V011':
        if (chain >= 3 && opt(0)) { adjustCost(opt(0), 'husui', 6); hit.push('相生卡 ≥3：代价 8→6'); }
        break;
      case 'V018':
        if (chain >= 3 && opt(1)) { adjustCost(opt(1), 'husui', 6); hit.push('相生卡 ≥3：代价 12→6'); }
        break;
      case 'V009':
        if (elemCount(run, '金') >= 3 && opt(0)) { opt(0).gain.husui = (opt(0).gain.husui || 0) + 10; hit.push('金系卡 ≥3：升级额外得 10 荒髓'); }
        break;
      case 'V016':
        if (elemCount(run, '金') >= 3 && opt(0)) { adjustCost(opt(0), 'hp', 6); hit.push('金系卡 ≥3：失血 10→6'); }
        break;
      case 'V010':
        if (elemCount(run, '水') >= 3 && opt(0)) { adjustCost(opt(0), 'hp', 8); hit.push('水系卡 ≥3：失血 12→8'); }
        break;
      case 'V019':
        if (summon >= 3 && opt(0)) { opt(0).gain.extraRelicId = 'R_062'; hit.push('召唤卡 ≥3：追加妖骨笛'); }
        break;
      case 'V013':
        if (daynight >= 2 && opt(0)) { opt(0).gain.lingyong = 1; hit.push('昼夜卡 ≥2：额外获得 1 灵涌'); }
        break;
      case 'V020':
        if (daynight >= 2 && opt(0)) { opt(0).gain.randomRelic = 'curse'; hit.push('昼夜卡 ≥2：荒遗物可指定（本实现为荒遗物池）'); }
        break;
      case 'V024':
        if (front >= 3 && opt(0)) { adjustCost(opt(0), 'hp', 10); hit.push('前排卡 ≥3：失血 15→10'); }
        break;
      case 'V006':
        if (flipRelics >= 1 && opt(0)) { opt(0).gain.draw = 1; hit.push('翻面遗物 ≥1：额外抽 1'); }
        break;
      default:
        break;
    }
    ev.linkHit = hit;
    return ev;
  };

  /* ---------------- 事件 ---------------- */
  RUN.pickEvent = function (run, nodeId) {
    const rng = SH.makeRng(SH.subSeed(run.seed, 'event', nodeId));
    const pool = SH.EVENTS.filter((e) => {
      if (run.seenEvents.indexOf(e.id) >= 0) return false;
      return e.act === run.volume || e.act === 0;
    });
    const list = pool.length ? pool : SH.EVENTS.filter((e) => run.seenEvents.indexOf(e.id) < 0);
    const ev = rng.weighted(list.map((e) => ({ v: e, w: e.weight || 20 }))) || SH.EVENTS[0];
    return RUN.applyEventLink(run, ev);
  };

  /* ---------------- 卷推进 ---------------- */
  RUN.enterVolume = function (run, volumeIndex) {
    run.volume = volumeIndex;
    run.map = SH.mapgen.generate(volumeIndex, run.seed);
    run.nodeId = null;
    run.layer = 0;
    run.maxHp += 10;
    run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * 0.2));
    run.relicSlotBonus = (run.relicSlotBonus || 0) + 1;
    run.flags.freeRefreshUsed = false;
    run.flags.husuiGainMod = 0;
    return run;
  };

  RUN.healPercent = function (run, pct) {
    let p = pct;
    run.relics.forEach((id) => {
      const r = SH.RELIC_BY_ID[id];
      if (r && r.mods && r.mods.healBonus) p += r.mods.healBonus;
    });
    if (SH.engine && SH.engine.diffMods(run).healPct) p *= 0.5;
    run.hp = Math.min(run.maxHp, run.hp + Math.ceil(run.maxHp * p));
  };

  RUN.applyDamage = function (run, v) {
    run.hp = Math.max(0, run.hp - v);
  };

  RUN.recordNode = function (run, node) {
    run.path.push(node.id);
    if (run.map.index[node.id]) run.map.index[node.id].visited = true;
  };
})(typeof window !== 'undefined' ? window : globalThis);
