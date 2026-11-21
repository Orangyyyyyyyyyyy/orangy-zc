/* ============================================================
 * 山海司·巡荒录  —  战斗引擎 engine.js
 * 实现 P0：荒痕战斗 / 抽弃牌 / 双面牌 / 五行生克
 * 状态机：BattleInit → PlayerTurnStart → PlayerAction →
 *         PlayerTurnEnd → EnemyTurn → StatusTick → TurnEndCheck
 * 纯逻辑，无 DOM，可无头回放
 * ============================================================ */
(function (root) {
  'use strict';
  const SH = (root.SH = root.SH || {});
  const R = SH.RULES;

  const E = (SH.engine = {});

  /* ---------------- 基础查询 ---------------- */
  function cardDef(id) {
    return SH.CARD_BY_ID[id] || null;
  }

  // 取得卡牌实例当前面的定义（含升级覆盖）
  E.faceOf = function (inst) {
    const def = cardDef(inst.id);
    if (!def) return null;
    const baseFace = def.faces[inst.face] || def.faces.tame;
    const out = Object.assign({}, baseFace);
    if (inst.upgraded && def.up) {
      const upFace = def.up[inst.face] || def.up.tame;
      if (upFace) {
        Object.assign(out, upFace);
        out.effects = upFace.effects || baseFace.effects || [];
        out.triggers = upFace.triggers || baseFace.triggers || [];
        out.beast = upFace.beast || baseFace.beast;
        out.cost = upFace.cost != null ? upFace.cost : baseFace.cost;
        out.text = upFace.text || baseFace.text;
      }
    } else if (inst.upgraded) {
      // 主表只给了升级描述文本：按文本解析攻/血/减费，未注明则给 +1/+1 保底
      const ut = def.upgradeText || '';
      const am = /攻\s*\+\s*(\d+)/.exec(ut);
      const hm = /生命\s*\+\s*(\d+)/.exec(ut);
      const cm = /减费\s*(\d+)/.exec(ut);
      if (baseFace.beast) {
        const dAtk = am ? +am[1] : (hm ? 0 : 1);
        const dHp = hm ? +hm[1] : (am ? 0 : 1);
        out.beast = { atk: baseFace.beast.atk + dAtk, hp: baseFace.beast.hp + dHp };
      } else if (baseFace.cost != null) {
        out.cost = Math.max(0, baseFace.cost - (cm ? +cm[1] : 1));
      }
    }
    out.effects = out.effects || [];
    out.triggers = out.triggers || [];
    return out;
  };

  E.defOf = cardDef;

  E.isDouble = function (def) {
    return !!(def && def.faces && def.faces.feral);
  };

  function stOf(target, name) {
    const s = target.statuses && target.statuses[name];
    return s ? s.n : 0;
  }
  E.stOf = stOf;

  function addStatus(b, target, name, n, capBonus) {
    if (!target || n <= 0) return 0;
    const meta = SH.STATUSES[name];
    if (!meta) return 0;
    // P6 S16 晕眩：每场每敌至多施加 2 次（按施加次数计，不按层数）
    if (meta.perBattle) {
      const used = target.statusUsed && target.statusUsed[name] ? target.statusUsed[name] : 0;
      if (used >= meta.perBattle) return 0;
      target.statusUsed = target.statusUsed || {};
      target.statusUsed[name] = used + 1;
    }
    target.statuses = target.statuses || {};
    let capMax = meta.max + (capBonus || 0);
    if (b && b._run && diffMods(b._run).statusMax) capMax = Math.max(1, capMax - 1);
    const cur = target.statuses[name] || { n: 0, t: meta.turns };
    const before = cur.n;
    cur.n = Math.min(capMax, cur.n + n);
    cur.t = meta.turns;
    target.statuses[name] = cur;
    // P6 S18 升空：异兽离地，不占格、不受击、不阻挡
    if (meta.airborne) {
      target.airborne = true;
      target.airTurn = b ? b.turn : 0;
    }
    return cur.n - before;
  }
  E.addStatus = addStatus;

  function removeStatus(target, name) {
    if (target.statuses) delete target.statuses[name];
  }
  E.removeStatus = removeStatus;

  E.unitAt = function (b, pos) {
    return b.units.find((u) => u.pos === pos && u.hp > 0) || null;
  };
  // P6 S18：升空单位不占格、不阻挡、不受敌方攻击 —— 占位判定一律走 blockerAt
  E.blockerAt = function (b, pos) {
    return b.units.find((u) => u.pos === pos && u.hp > 0 && !u.airborne) || null;
  };
  E.airborneAt = function (b, pos) {
    return b.units.find((u) => u.pos === pos && u.hp > 0 && u.airborne) || null;
  };
  E.enemyAt = function (b, pos) {
    return b.enemies.find((e) => e.pos === pos && e.hp > 0) || null;
  };
  E.livingEnemies = function (b) {
    return b.enemies.filter((e) => e.hp > 0);
  };

  E.enemyAtk = function (b, e) {
    if (b && e.atkZeroTurn === b.turn) return 0;
    let atk = e.atkBase;
    atk -= 2 * stOf(e, '冻缓');
    atk += (e.atkBuff || 0) + stOf(e, '狂暴') + (e.devourStacks || 0);
    if (e.hp > 0 && e.hp / e.maxHp < 0.5 && (e.affixes || []).indexOf('A18') >= 0) atk += 3;
    if (e.specials.indexOf('feralFrostRage') >= 0) {
      const frozen = Math.max(0, ...(b ? b.units.map((u) => stOf(u, '冻缓')) : [0]));
      if (frozen >= 3) atk += 3;
    }
    if ((e.affixes || []).indexOf('A20') >= 0) atk += (b ? b.eroded.length : 0);
    return Math.max(0, atk);
  };

  // 异兽实际攻击力：基础 + 前哨格光环
  E.unitAtk = function (b, u) {
    let atk = u.atk + stOf(u, '狂暴');
    b.units.forEach((o) => {
      if (o.uid !== u.uid && o.kit && o.kit.auraFront && u.pos === 1) atk += o.kit.auraFront;
    });
    b.statics.forEach((st) => { if (st.kind === 'unitAtk') atk += st.v; });
    const foe = E.enemyAt(b, u.pos);
    if (foe && (foe.affixes || []).indexOf('A13') >= 0) atk -= 2;
    if (b.terrain[u.pos - 1] === '冰原' && foe) atk -= 0;
    return Math.max(0, atk);
  };

  /* ---------------- 异兽词条（触发系统） ---------------- */
  function makeKit() {
    return { dmgReduce: 0, counterBonus: 0, elementBonus: {}, auraFront: 0, hits: 1, statusBonus: {}, statusCap: {}, summonHp: 0, terrainBonus: 0, discount: 0, chainDiscount: 0, firstFlipFree: 0, omenPlus: 0, purify: 0, onAttack: [], onKill: [], onTurnEnd: [], onStartTurn: [], onFlip: [], onChain: [], onSummon: [], onDaynight: [] };
  }

  function applyPassive(kit, op) {
    switch (op.op) {
      case 'dmgReduce': kit.dmgReduce += op.v; break;
      case 'counterBonus': kit.counterBonus += op.v; break;
      case 'elementBonus': kit.elementBonus[op.e] = (kit.elementBonus[op.e] || 0) + op.v; break;
      case 'auraFront': kit.auraFront += op.v; break;
      case 'multiHit': kit.hits = Math.max(kit.hits, op.v); break;
      case 'statusBonus': kit.statusBonus[op.s] = (kit.statusBonus[op.s] || 0) + op.v; break;
      case 'statusCap': kit.statusCap[op.s] = (kit.statusCap[op.s] || 0) + op.v; break;
      case 'summonHp': kit.summonHp += op.v; break;
      case 'terrainBonus': kit.terrainBonus += op.v; break;
      case 'discount': kit.discount += op.v; break;
      case 'chainDiscount': kit.chainDiscount += op.v; break;
      case 'firstFlipFree': kit.firstFlipFree = 1; break;
      case 'omenPlus': kit.omenPlus += op.v; break;
      case 'purifyPerBattle': kit.purify += op.v; break;
      case 'flatAtk': kit.flatAtk = (kit.flatAtk || 0) + op.v; break;
      default: break;
    }
  }

  function buildKit(face) {
    const kit = makeKit();
    const MAP = { summon: 'onSummon', attack: 'onAttack', kill: 'onKill', turnEnd: 'onTurnEnd', startTurn: 'onStartTurn', flip: 'onFlip', chain: 'onChain', daynight: 'onDaynight' };
    (face.triggers || []).forEach((t) => {
      const trig = t[0], op = t[1];
      if (trig === 'passive') applyPassive(kit, op);
      else if (MAP[trig] && kit[MAP[trig]]) kit[MAP[trig]].push(op);
    });
    return kit;
  }
  E.buildKit = buildKit;

  /* ---------------- 召唤 ---------------- */
  function summon(b, run, def, face, pos, inst, ctx) {
    const mods = omenMods(run);
    const rm = relicMods(run);
    const beast = face.beast || { atk: 0, hp: 1 };
    let atk = beast.atk;
    let hp = beast.hp;
    if (inst.face === 'tame' && mods.tameBeast) { atk += mods.tameBeast; hp += mods.tameBeast; }
    hp += rm.summonHp;
    atk += rm.summonAtk;
    if (b.unitBonus) { atk += b.unitBonus.atk || 0; hp += b.unitBonus.hp || 0; }
    b.units.forEach((o) => { if (o.kit && o.kit.summonHp) hp += o.kit.summonHp; });
    const terrain = b.terrain[pos - 1];
    if (terrain === '金脉') atk += 1 + tPlus(b, pos);
    if (terrain === '石阵') hp += 2 + tPlus(b, pos);
    if (b.flags.jinmaiCompass) atk += (rm.jinmaiAtk || 1);
    if ((run.omens || []).indexOf('O05') >= 0) {
      if (pos === 1) hp += 4;
      if (pos === 3) atk -= 2;
    }
    if (pos === 1) hp += (b.frontHpBonus || 0) + (rm.frontHp || 0);
    const sickExtra = ((run.omens || []).indexOf('O06') >= 0 ? 1 : 0) + diffMods(run).summonSick;
    const kit = buildKit(face);
    if (kit.flatAtk) atk += kit.flatAtk;
    if (inst.face === 'feral' && b.flags.feralAtkBonus) atk += b.flags.feralAtkBonus;
    const unit = {
      uid: SH.util.uid('u'),
      cardId: def.id,
      name: def.name,
      element: def.element,
      atk: Math.max(0, atk),
      hp: hp,
      maxHp: hp,
      pos: pos,
      sick: true,
      sickTurns: 1 + sickExtra,
      statuses: {},
      face: inst.face,
      upgraded: !!inst.upgraded,
      kit: kit,
      flags: {}
    };
    b.units.push(unit);
    b.stats.summons = (b.stats.summons || 0) + 1;
    E.log(b, 'player', '召唤「' + def.name + '」至' + ['', '前哨', '中阵', '后阵'][pos] + '（' + unit.atk + '/' + unit.hp + '）。');
    runOps(b, run, unit, kit.onSummon, ctx || {});
    return unit;
  }

  E.enemyAdvance = function (e) {
    // P6 S17：束缚每层 -2 推进，且与缠绕「同回合只取较高」，不叠乘
    const slow = Math.max(stOf(e, '缠绕'), stOf(e, '束缚') * 2);
    let adv = e.advanceBase + (e.advanceBuff || 0) - slow + stOf(e, '迅捷');
    if (e.specials.indexOf('swift') >= 0) adv += 1;
    if ((e.affixes || []).indexOf('A04') >= 0) adv += 1;
    return Math.max(0, adv);
  };

  // P6：地形强度加成（本格地形效果 +1/层）
  function tPlus(b, pos) {
    return (b.terrainPlus && b.terrainPlus[pos - 1]) || 0;
  }
  E.terrainPlusAt = tPlus;

  /* ---------------- 职业/誓约修正 ---------------- */
  function omenMods(run) {
    const mods = { feralDamage: 0, tameCost: 0, tameBeast: 0, feralSelfDamage: 0, chainBonus: 0, chainLimit: R.chainPerTurn, elementPick: null, elementBonus: 0, otherPenalty: 0, maxHp: 0, selfDamageHeal: 0, husuiGain: 0, shopPrice: 0, altarCost: 0, summonPlus: 0 };
    (run.omens || []).forEach((id) => {
      const o = SH.OMEN_BY_ID[id];
      if (!o || !o.mod) return;
      const m = o.mod;
      if (m.feralDamage) mods.feralDamage += m.feralDamage;
      if (m.tameCost) mods.tameCost += m.tameCost;
      if (m.tameBeast) mods.tameBeast += m.tameBeast;
      if (m.feralSelfDamage) mods.feralSelfDamage += m.feralSelfDamage;
      if (m.chainBonus) mods.chainBonus += m.chainBonus;
      if (m.chainLimit) mods.chainLimit = Math.min(mods.chainLimit, m.chainLimit);
      if (m.elementPick) { mods.elementPick = o.pickElement || '火'; mods.elementBonus = m.elementPick; }
      if (m.otherPenalty) mods.otherPenalty = m.otherPenalty;
      if (m.maxHp) mods.maxHp += m.maxHp;
      if (m.selfDamageHeal) mods.selfDamageHeal += m.selfDamageHeal;
      if (m.husuiGain) mods.husuiGain += m.husuiGain;
      if (m.shopPrice) mods.shopPrice += Math.round(m.shopPrice * 100) / 100;
      if (m.altarCost) mods.altarCost += m.altarCost;
      if (m.summonPlus) mods.summonPlus += m.summonPlus;
    });
    return mods;
  }
  E.omenMods = omenMods;

  function hasRelic(run, id) {
    return (run.relics || []).indexOf(id) >= 0;
  }
  E.hasRelic = hasRelic;

  /* ---------------- 遗物通用修正（P1 6 / P2 14.3） ---------------- */
  function relicMods(run) {
    const m = {
      lingyongPlus: 0, lingyongChance: 0, lingyongOnce: 0, summonHp: 0, summonAtk: 0,
      feralSelfReduce: 0, feralSelfHalf: 0, flipDiscount: 0, flipDiscountOnce: 0,
      flipDrawDiscard: 0, elementBonus: {}, statusBonus: {}, husuiBonus: 0, husuiGainPct: 0,
      battleStartQi: 0, battleStartUnitHp: 0, battleStartUnitAtk: 0, frontHp: 0,
      turnStartDrawOnce: 0, turnStartHealOnce: 0, turnStartDiscount: 0,
      healBonus: 0, freeRefresh: 0, eventAllOptions: 0,
      chainLingyongOnce: 0, chainDrawOnce: 0, counterDrawOnce: 0, counterAoeOnce: 0,
      jinmaiAtk: 0, hpPayHalf: 0, hpPayReduce: 0, maxHp: 0, firstSelfDraw: 0,
      immuneControl: 0, chainLimitDelta: 0, erodeBlock: 0, extraCell: 0,
      purifyPerBattle: 0, upkeepLose: 0, burnDrawOnce: 0, feralDiscountOnKill: 0
    };
    (run.relics || []).forEach((id) => {
      const r = SH.RELIC_BY_ID[id];
      if (!r || r.notReady || !r.mods) return;
      const x = r.mods;
      Object.keys(x).forEach((k) => {
        if (k === 'elementBonus') {
          Object.keys(x[k]).forEach((e) => { m.elementBonus[e] = (m.elementBonus[e] || 0) + x[k][e]; });
        } else if (k === 'statusBonus') {
          Object.keys(x[k]).forEach((st) => { m.statusBonus[st] = (m.statusBonus[st] || 0) + x[k][st]; });
        } else if (typeof x[k] === 'number') {
          m[k] = (m[k] || 0) + x[k];
        }
      });
      if (r.special === 'lingyongUpkeep') m.upkeepLose += 2;
    });
    return m;
  }
  E.relicMods = relicMods;

  // 通用遗物触发：按 timing 执行 effects；每回合/每场限制写进 b.relicOnce
  function relicFire(b, run, timing, ctx) {
    (run.relics || []).forEach((id) => {
      const r = SH.RELIC_BY_ID[id];
      if (!r || r.notReady || r.timing !== timing || !r.effects || !r.effects.length) return;
      if (r.special === 'lingyongUpkeep') return;
      if (b._run && diffMods(b._run).relicChance && rnd(b) > diffMods(b._run).relicChance) return;
      // 一次性限制：文本含「每场 1 次 / 每回合 1 次 / 每卷首次」的内容在数据里标注 once
      if (r.once) {
        b.relicOnce = b.relicOnce || {};
        const key = id + '|' + (r.once === 'battle' ? 'b' : r.once === 'turn' ? b.turn : 'n');
        if (b.relicOnce[key]) return;
        b.relicOnce[key] = true;
      }
      E.applyEffects(b, run, r.effects, Object.assign({ element: '无', name: r.name }, ctx || {}));
      if (r.special === 'drum') {
        b.flags.drumUsed = true;
        b.units.forEach((u) => { u.drumBuff = (u.drumBuff || 0) + 3; });
      }
    });
  }
  E.relicFire = relicFire;

  /* ---------------- 荒阶词缀（P0 5.11.3） ---------------- */
  function diffMods(run) {
    const m = {
      enemyHp: 0, enemyAtk: 0, playerMaxHp: 0, handStart: 0, qiMax: 0, draw: 0,
      chainLimit: 0, shopPrice: 0, husuiGain: 0, statusMax: 0, counterMult: 0,
      relicSlots: 0, terrainCount: 0, eliteExtra: 0, bossPhase: 0, healPct: 0,
      selfDamage: 0, summonSick: 0, firstEnemyTurn: 0, eventRandom: 0, noRefresh: 0,
      enemyHidden: 0, relicChance: 0, erodeBlock: 0, oathNegative: 0
    };
    (run.affixes || []).forEach((id) => {
      switch (id) {
        case 'D01': m.firstEnemyTurn += 1; break;
        case 'D02': m.handStart -= 1; break;
        case 'D03': m.qiMax -= 1; break;
        case 'D04': m.chainLimit -= 1; break;
        case 'D05': m.relicSlots -= 1; break;
        case 'D06': m.eventRandom += 1; break;
        case 'D08': m.eliteExtra += 1; break;
        case 'D09': m.bossPhase += 1; break;
        case 'D10': m.erodeBlock += 1; break;
        case 'D11': m.terrainCount += 1; break;
        case 'D12': m.husuiGain -= 0.5; break;
        case 'D13': m.shopPrice += 0.2; break;
        case 'D14': m.playerMaxHp -= 10; break;
        case 'D15': m.selfDamage += 0.5; break;
        case 'D16': m.draw -= 1; break;
        case 'D17': m.summonSick += 1; break;
        case 'D18': m.counterMult = 1.3; break;
        case 'D19': m.statusMax -= 1; break;
        case 'D20': m.enemyHidden += 1; break;
        case 'D21': m.healPct = 0.5; break;
        case 'D23': m.relicChance = 0.5; break;
        case 'D25': m.enemyAtk += 0.1; break;
        case 'D27': m.chainLimit -= 1; break;
        case 'D29': m.oathNegative += 0.5; break;
        case 'D30': m.enemyHp += 0.1; break;
        default: break;
      }
    });
    return m;
  }
  E.diffMods = diffMods;

  /* ---------------- 生成战斗 ---------------- */
  E.create = function (run, cfg) {
    const vol = SH.VOLUMES[cfg.volume - 1] || SH.VOLUMES[0];
    const b = {
      id: 'b_' + cfg.nodeId,
      kind: cfg.kind || 'battle',
      volume: cfg.volume,
      nodeId: cfg.nodeId || '',
      turn: 1,
      phase: 'player',
      night: false,
      hero: { hp: run.hp, maxHp: run.maxHp, shield: 0 },
      qi: (SH.HERO_BY_ID[run.heroId] || {}).qi || R.qiStart,
      qiMax: (SH.HERO_BY_ID[run.heroId] || {}).qi || R.qiStart,
      lingyong: 0,
      draw: [],
      hand: [],
      discard: [],
      exhaust: [],
      units: [],
      enemies: [],
      terrain: ['', '', ''],
      summonsThisTurn: 0,
      chain: { elem: null, count: 0 },
      eroded: [],
      statics: [],
      relicOnce: {},
      struggle: 0,
      flags: { firstFlipUsed: false, erodePurified: false, drumUsed: false, frontBarrierUsed: false, flipFreeTurn: 0, feralSelfHalf: false, silenceTurn: 0, shellBroken: false },
      log: [],
      pending: null,
      over: null,
      difficulty: run.difficulty || 0,
      affixes: (run.affixes || []).slice(),
      stats: { turns: 0, damageDealt: 0, maxHit: 0, cardsPlayed: 0, flips: 0, maxChain: 0, summons: 0, tamePlays: 0, feralPlays: 0 },
      rngState: cfg.seed || 1,
      seed: cfg.seed || 1,
      drawnThisTurn: 0
    };
    b.hero.statuses = {};
    b._run = run;

    // 牌组实例化并洗切
    b.draw = run.deck.map((c) => Object.assign({}, c, { face: 'tame' }));
    const rng = SH.makeRng(b.seed);
    rng.shuffle(b.draw);
    b.rngState = rng.state();

    // 敌人入场：先上 2 只，其余在荒外候场
    const list = (cfg.enemies || []).slice();
    list.forEach((id, i) => {
      const def = SH.ENEMY_BY_ID[id];
      if (!def) return;
      const dm0 = diffMods(run);
      const scale = (cfg.scale || 1) * (1 + dm0.enemyHp);
      const e = {
        uid: SH.util.uid('e'),
        defId: id,
        name: def.name,
        element: def.element,
        maxHp: Math.round(def.hp * scale),
        hp: Math.round(def.hp * scale),
        atkBase: Math.max(1, Math.round(def.atk * (cfg.atkScale || 1) * (1 + dm0.enemyAtk))),
        advanceBase: def.advance,
        advanceBuff: 0,
        atkBuff: 0,
        pos: 0,
        statuses: {},
        intent: null,
        phaseIdx: 0,
        specials: (def.specials || [def.special]).filter(Boolean),
        affixes: (def.affixes || []).slice(),
        charging: false,
        elite: def.kind === 'elite',
        boss: def.kind === 'boss',
        turnCount: 0,
        guardUsed: 0,
        devourStacks: 0,
        copied: false
      };
      const dmx = diffMods(run);
      if ((def.kind === 'elite' && dmx.eliteExtra) || (def.kind === 'boss' && dmx.bossPhase)) {
        const enemyAffixPool = ['A01', 'A04', 'A05', 'A06', 'A12', 'A13', 'A18'];
        const rngA = SH.makeRng(SH.subSeed(b.seed, 'affixExtra', id));
        e.affixes.push(rngA.pick(enemyAffixPool));
      }
      if (id === 'B02') b.terrain[1] = '瘴泽';
      if (id === 'B03') b.night = true;
      if (id === 'B04') e.specials.push('feralVuln2');
      if (id === 'B05') e.devourStacks = 1;
      b.enemies.push(e);
    });

    // 初始站位
    const onField = Math.min(2, b.enemies.length);
    for (let i = 0; i < onField; i++) b.enemies[i].pos = i + 1;

    // 地形
    const tCount = (cfg.terrainCount || 0) + diffMods(run).terrainCount;
    const rng2 = SH.makeRng(SH.subSeed(cfg.seed || 1, 'terrain', cfg.nodeId));
    const pool = vol.terrainPool.slice();
    for (let i = 0; i < tCount; i++) {
      const t = rng2.pick(pool);
      const pos = rng2.int(3);
      if (!b.terrain[pos]) b.terrain[pos] = t;
    }

    // 战斗开始钩子
    E.log(b, 'sys', '『' + vol.name + '』荒战开始。');
    const rmods = relicMods(run);
    if (rmods.jinmaiAtk && b.terrain.indexOf('金脉') >= 0) {
      b.flags.jinmaiCompass = true;
      E.log(b, 'relic', '金脉罗盘：金脉之地，此后召来的异兽攻击 +1。');
    }
    if (rmods.battleStartQi) {
      b.qi += rmods.battleStartQi;
      E.log(b, 'relic', '巡吏旧印：首回合灵气 +' + rmods.battleStartQi + '。');
    }
    if (rmods.frontHp) {
      b.frontHpBonus = rmods.frontHp;
    }
    const mods = omenMods(run);
    if ((run.omens || []).indexOf('O10') >= 0) {
      b.hero.hp -= 5;
      E.log(b, 'omen', '昼夜誓约：战斗开始失去 5 点生命。');
    }
    if (rmods.maxHp < 0) b.hero.maxHp = Math.max(20, b.hero.maxHp + rmods.maxHp);
    relicFire(b, run, 'battleStart', {});
    // 战斗开始遗物：全体异兽属性（此处还没有异兽，记录为光环）
    b.unitBonus = {
      atk: rmods.battleStartUnitAtk + (rmods.jinmaiAtk && b.terrain.indexOf('金脉') >= 0 ? rmods.jinmaiAtk : 0),
      hp: rmods.battleStartUnitHp
    };
    if (run.flags && run.flags.freeFlipNext) {
      b.flags.flipFreeCount = run.flags.freeFlipNext;
      run.flags.freeFlipNext = 0;
    }
    // 荒阶：敌先手
    const dm = diffMods(run);
    if (dm.qiMax) b.qiMax = Math.max(1, b.qiMax + dm.qiMax);
    if (b.qi > b.qiMax) b.qi = b.qiMax;
    if (dm.draw) b.drawPenalty = dm.draw;
    if (dm.handStart) b.handStartPenalty = dm.handStart;

    // 起手
    E.drawCards(b, Math.max(0, R.drawPerTurn + (b.handStartPenalty || 0)));
    E.rollIntents(b, run);
    E.checkEnd(b);
    return b;
  };

  /* ---------------- 战斗内随机（可复现） ---------------- */
  function rnd(b) {
    const r = SH.makeRng(b.rngState);
    const v = r.next();
    b.rngState = r.state();
    return v;
  }
  E.rnd = rnd;

  /* ---------------- 日志 ---------------- */
  E.log = function (b, kind, text) {
    b.log.push({ t: b.turn, kind: kind, text: text });
    if (b.log.length > 400) b.log.shift();
  };

  /* ---------------- 抽牌 ---------------- */
  E.drawCards = function (b, n) {
    const rng = SH.makeRng(b.rngState);
    let overflow = 0;
    b.drawnThisTurn = b.drawnThisTurn || 0;
    n = Math.max(0, Math.min(n, R.drawCap - b.drawnThisTurn));
    b.drawnThisTurn += n;
    for (let i = 0; i < n; i++) {
      if (b.hand.length >= R.handLimit) {
        overflow += 1;
        if (b.draw.length) {
          const c = b.draw.pop();
          b.discard.push(Object.assign(c, { face: 'tame' }));
        }
        continue;
      }
      if (!b.draw.length) {
        if (!b.discard.length) break;
        b.draw = rng.shuffle(b.discard.map((c) => Object.assign(c, { face: 'tame' })));
        b.discard = [];
        E.log(b, 'sys', '弃牌堆洗回抽牌堆。');
      }
      const card = b.draw.pop();
      card.face = card.face || 'tame';
      b.hand.push(card);
    }
    if (overflow > 0) E.log(b, 'sys', '手牌已满（' + R.handLimit + '），' + overflow + ' 张牌被弃置。');
    b.rngState = rng.state();
  };

  /* ---------------- 相生链 ---------------- */
  function chainLimitOf(b, run) {
    let limit = omenMods(run).chainLimit + diffMods(run).chainLimit - relicMods(run).chainLimitDelta;
    if (b.chainNoLimit) return 99;
    return Math.max(1, limit + (b.chainExtra || 0));
  }

  function chainDiscount(b, run, element) {
    if (!element || element === '无') return false;
    if (!b.chain.elem) return false;
    if (b.chain.count >= chainLimitOf(b, run)) return false;
    return SH.GENERATES[b.chain.elem] === element;
  }

  function applyChain(b, run, element) {
    const mods = omenMods(run);
    if (!element || element === '无') {
      b.chain = { elem: null, count: 0 };
      return { triggered: false };
    }
    const triggered = chainDiscount(b, run, element);
    if (triggered) {
      b.chain.count += 1;
      b.stats.maxChain = Math.max(b.stats.maxChain, b.chain.count);
      const rm = relicMods(run);
      const onceGain = (rm.chainLingyongOnce && b.flags.chainLingyongTurn !== b.turn) ? rm.chainLingyongOnce : 0;
      if (onceGain) b.flags.chainLingyongTurn = b.turn;
      const gain = 1 + mods.chainBonus + onceGain + (b.statics.some((st) => st.kind === 'chainLingyong') ? 1 : 0);
      b.lingyong = Math.min(b.qiMax + R.lingyongOverCap, b.lingyong + gain);
      E.log(b, 'chain', '相生：' + b.chain.elem + '生' + element + '，费用 -1，灵涌 +' + gain + '。');
      b.chain.elem = element;
      b.units.slice().forEach((u) => fire(b, run, u, 'onChain', {}));
      if (b.chainSelfDamage) heroLoseHp(b, run, b.chainSelfDamage);
      relicFire(b, run, 'chain', {});
      if (rm.chainDrawOnce && b.flags.chainDrawTurnOnce !== b.turn) {
        b.flags.chainDrawTurnOnce = b.turn;
        E.drawCards(b, rm.chainDrawOnce);
      }
      b.statics.forEach((st) => {
        if (st.kind === 'chainDraw') {
          b.flags.chainDrawTurn = b.flags.chainDrawTurn || {};
          if ((b.flags.chainDrawTurn[st.cap] || 0) < st.cap) {
            b.flags.chainDrawTurn[st.cap] = (b.flags.chainDrawTurn[st.cap] || 0) + 1;
            E.drawCards(b, st.v);
          }
        }
      });
    } else {
      b.chain = { elem: element, count: 0 };
    }
    return { triggered: triggered };
  }

  /* ---------------- 费用 ---------------- */
  // mode: 'summon'（默认，召唤）/ 'cast'（P6 施术）
  E.costOf = function (b, run, inst, mode) {
    const def = cardDef(inst.id);
    const face = E.faceOf(inst);
    const mods = omenMods(run);
    const casting = mode === 'cast' && !!def.cast;
    const castFace = casting ? (def.cast[inst.face] || def.cast.tame) : null;
    let base = casting ? (def.cast.cost || 0) : (face.cost || 0);
    if (!casting && inst.face === 'tame' && mods.tameCost) base += mods.tameCost;
    if (def.type === 'spell' && (b.affixes || []).indexOf('A19') >= 0 && !(b.stats.spellsPlayed > 0)) {
      base += 1;
    }
    let discount = 0;
    if (chainDiscount(b, run, def.element)) discount += 1;
    if (inst.flipDiscountTurn === b.turn) discount += 1;
    if (inst.killDiscountTurn === b.turn) discount += 1;
    if (b.flags.cheap > 0) discount += (b.flags.cheapValue || 1);
    const tameCheap = !!(inst.face === 'tame' && (b.flags.tameCheap || 0) > 0);
    if (tameCheap) discount += 1;
    const spellCheap = !!(def.type === 'spell' && (b.flags.spellCheap || 0) > 0);
    if (spellCheap) discount += 1;
    return {
      cost: Math.max(0, base - discount), base: base, discount: discount,
      chain: chainDiscount(b, run, def.element), tameCheap: tameCheap, spellCheap: spellCheap
    };
  };

  /* ---------------- 目标判定 ---------------- */
  // P6：三参 mode 用于「施术」分支；不传即原召唤 / 术法逻辑
  E.needTarget = function (b, inst, mode) {
    const def = cardDef(inst.id);
    const face = E.faceOf(inst);
    if (!def) return null;
    if (def.type === 'beast' && mode !== 'cast') {
      const empties = [1, 2, 3].filter((p) => !E.blockerAt(b, p) && !E.enemyAt(b, p));
      if (!empties.length) return { kind: 'noCell' };
      // 入场词条中需要指定敌人的效果
      const summonOps = (face.triggers || []).filter((t) => t[0] === 'summon').map((t) => t[1]);
      const effectOps = (face.effects || []).filter((op) => op.target === 'enemy');
      const needEnemy = summonOps.some((op) => ['statusTarget', 'dmgTarget', 'atkZero', 'advanceTarget', 'drainAtk'].indexOf(op.op) >= 0) || effectOps.length > 0;
      const list = E.livingEnemies(b).filter((e) => e.pos > 0);
      const cellNeed = empties.length > 1 ? { kind: 'cell', options: empties } : { kind: 'cell', options: empties, auto: empties[0] };
      if (needEnemy && list.length > 1) {
        return { kind: 'enemy', options: list.map((e) => e.uid), alsoCell: cellNeed };
      }
      if (needEnemy && list.length === 1) {
        return { kind: 'cell', options: empties, auto: empties[0], autoEnemy: list[0].uid };
      }
      return cellNeed;
    }
    const eff = (mode === 'cast' && def.cast)
      ? ((def.cast[inst.face] || def.cast.tame).effects || [])
      : (face.effects || []);
    const hasTerrain = eff.some((e) => e.op === 'terrainChoose' || e.op === 'terrainPlus');
    const enemyOps = eff.filter((e) => e.target === 'enemy');
    if (hasTerrain) {
      const opts = [1, 2, 3];
      return { kind: 'cell', options: opts, terrain: true, cellLabel: '选择此格地形' };
    }
    if (enemyOps.length) {
      const list = E.livingEnemies(b).filter((e) => e.pos > 0);
      if (!list.length) {
        const hasOther = eff.some((e) => e.target !== 'enemy');
        if (!hasOther) return { kind: 'noEnemy' };
        return null;
      }
      if (list.length === 1) return { kind: 'enemy', options: [list[0].uid], auto: list[0].uid };
      return { kind: 'enemy', options: list.map((e) => e.uid) };
    }
    return null;
  };

  /* ---------------- 词条触发执行 ---------------- */
  function runOps(b, run, unit, ops, ctx) {
    const kit = unit.kit || makeKit();
    (ops || []).forEach((op) => {
      switch (op.op) {
        case 'unitLoseHp': {
          let v = op.v;
          if (unit.face === 'feral') v = Math.max(1, v - relicMods(run).feralSelfReduce);
          unit.hp -= v;
          E.log(b, 'sys', '「' + unit.name + '」自损 ' + v + '。');
          if (unit.hp <= 0) killUnit(b, run, unit);
          break;
        }
        case 'unitHeal':
          unit.hp = Math.min(unit.maxHp, unit.hp + op.v);
          break;
        case 'unitBuffAtk':
          unit.atk += op.v;
          break;
        case 'unitBuffHp':
          unit.hp += op.v; unit.maxHp += op.v;
          break;
        case 'permAtk':
          unit.atk += op.v;
          E.log(b, 'sys', '「' + unit.name + '」永久 +' + op.v + ' 攻击。');
          break;
        case 'draw':
          E.drawCards(b, op.v);
          break;
        case 'drawDiscard':
          E.drawCards(b, op.v);
          for (let i = 0; i < (op.d || 0) && b.hand.length; i++) {
            const c = b.hand.pop();
            b.discard.push(Object.assign(c, { face: 'tame' }));
          }
          break;
        case 'qi':
          if (op.once) {
            if (unit.flags.qiOnce) break;
            unit.flags.qiOnce = true;
          }
          b.qi += op.v;
          E.log(b, 'sys', '「' + unit.name + '」使灵气 +' + op.v + '。');
          break;
        case 'lingyong':
          b.lingyong = Math.min(b.qiMax + R.lingyongOverCap, b.lingyong + op.v);
          break;
        case 'healHero':
          b.hero.hp = Math.min(b.hero.maxHp, b.hero.hp + op.v);
          break;
        case 'loseHp':
          heroLoseHp(b, run, op.v);
          break;
        case 'statusTarget': {
          const t = ctx && ctx.targetEnemy ? ctx.targetEnemy : (E.livingEnemies(b)[0] || null);
          if (t) {
            const bonus = kit.statusBonus[op.s] || 0;
            addStatus(b, t, op.s, op.v + bonus, kit.statusCap[op.s] || 0);
            E.log(b, 'sys', '「' + unit.name + '」对「' + t.name + '」施加 ' + (op.v + bonus) + ' 层' + op.s + '。');
          }
          break;
        }
        case 'statusAll': {
          const bonus = kit.statusBonus[op.s] || 0;
          E.livingEnemies(b).forEach((e) => addStatus(b, e, op.s, op.v + bonus, kit.statusCap[op.s] || 0));
          E.log(b, 'sys', '「' + unit.name + '」对全体敌人施加 ' + (op.v + bonus) + ' 层' + op.s + '。');
          break;
        }
        case 'aoe':
          E.livingEnemies(b).slice().forEach((e) => damageEnemy(b, run, e, op.v, { element: unit.element, sourceName: unit.name }));
          break;
        case 'dmgTarget': {
          const t = ctx && ctx.targetEnemy ? ctx.targetEnemy : (E.livingEnemies(b)[0] || null);
          if (t) damageEnemy(b, run, t, op.v, { element: unit.element, sourceName: unit.name });
          break;
        }
        case 'randomDmg': {
          const list = E.livingEnemies(b).filter((e) => e.pos > 0);
          const t = list[Math.floor(rnd(b) * list.length)];
          if (t) damageEnemy(b, run, t, op.v, { element: unit.element, sourceName: unit.name });
          break;
        }
        case 'advanceTarget': {
          const t = ctx && ctx.targetEnemy ? ctx.targetEnemy : null;
          if (t) t.advanceBuff = (t.advanceBuff || 0) + op.v;
          break;
        }
        case 'advanceAll':
          E.livingEnemies(b).forEach((e) => { e.advanceBuff = (e.advanceBuff || 0) + op.v; });
          break;
        case 'atkZero':
          if (ctx && ctx.targetEnemy) ctx.targetEnemy.atkZeroTurn = b.turn;
          else {
            const t = E.livingEnemies(b)[0];
            if (t) t.atkZeroTurn = b.turn;
          }
          break;
        case 'drainAtk':
          if (ctx && ctx.targetEnemy) ctx.targetEnemy.atkBuff = (ctx.targetEnemy.atkBuff || 0) - op.v;
          break;
        case 'summonToken': {
          const free = [1, 2, 3].find((p) => !E.blockerAt(b, p) && !E.enemyAt(b, p));
          if (free) {
            b.units.push({
              uid: SH.util.uid('u'), cardId: 'TOKEN', name: op.name, element: unit.element,
              atk: op.atk, hp: op.hp, maxHp: op.hp, pos: free, sick: true, statuses: {}, face: 'tame',
              kit: makeKit(), flags: {}, token: true
            });
            E.log(b, 'sys', '「' + unit.name + '」召唤了「' + op.name + '」。');
          }
          break;
        }
        case 'terrainSelf':
          b.terrain[unit.pos - 1] = op.t;
          E.log(b, 'sys', ['', '前哨', '中阵', '后阵'][unit.pos] + '地形变为「' + op.t + '」。');
          break;
        case 'discount':
          b.flags.cheap = Math.max(b.flags.cheap || 0, op.n || 1);
          b.flags.cheapValue = Math.max(b.flags.cheapValue || 0, op.v || 1);
          break;
        default:
          break;
      }
    });
  }
  E.runOps = runOps;

  function fire(b, run, unit, kind, ctx) {
    if (!unit || !unit.kit) return;
    const list = unit.kit[kind];
    if (list && list.length) runOps(b, run, unit, list, ctx);
  }
  E.fire = fire;

  /* ---------------- 伤害管线（P0 4.5 / P3 18.3） ---------------- */
  E.computeDamage = function (b, opts, target) {
    let d = opts.raw + (opts.flat || 0) - (opts.weak || 0);
    // 昼夜
    if (b.night) {
      if (opts.element === '水') d += 1;
      if (opts.element === '火') d -= 1;
    } else {
      if (opts.element === '火') d += 1;
      if (opts.element === '水') d -= 1;
    }
    let countered = false;
    if (opts.element && target.element && SH.COUNTERS[opts.element] === target.element) {
      const dm = (b && b._run) ? diffMods(b._run) : { counterMult: 0 };
      d *= dm.counterMult || R.counterMultiplier;
      countered = true;
    }
    if (countered) {
      d += (opts.counterFlat || 0);
      if (b && b.statics) d += b.statics.filter((st) => st.kind === 'counterBonus').reduce((a, st) => a + st.v, 0);
    }
    d *= opts.mult || 1;
    d = Math.ceil(Math.max(0, d));
    if (!opts.ignoreArmor) {
      let armor = stOf(target, '裂甲');
      if (target.specials && target.specials.indexOf('armorHalf') >= 0) armor = Math.ceil(armor / 2);
      if (target.specials && target.specials.indexOf('armorPierce') >= 0) armor = 0;
      d += armor;
    }
    return { dmg: Math.max(0, d), countered: countered };
  };

  function applyToEnemy(b, e, amount, opts) {
    const o = opts || {};
    let dmg = amount;
    if (e.specials.indexOf('goldArmor') >= 0 || (e.affixes || []).indexOf('A02') >= 0) dmg = Math.max(0, dmg - 1);
    if (e.specials.indexOf('shielded') >= 0) dmg = Math.max(0, dmg - 2);
    if ((e.affixes || []).indexOf('A17') >= 0 && !e.guardUsedThisTurn) {
      dmg = Math.max(0, dmg - 2);
      e.guardUsedThisTurn = true;
    }
    const shield = stOf(e, '护盾');
    if (shield > 0 && !o.ignoreShield) {
      const absorbed = Math.min(shield, dmg);
      e.statuses['护盾'].n -= absorbed;
      if (e.statuses['护盾'].n <= 0) removeStatus(e, '护盾');
      dmg -= absorbed;
    }
    e.hp -= dmg;
    b.stats.damageDealt += dmg;
    b.stats.maxHit = Math.max(b.stats.maxHit || 0, dmg);
    if (e.hp > 0) E.checkPhase(b, e);
    return dmg;
  }

  /* ---------------- 首领阶段（P1 5.4） ---------------- */
  E.checkPhase = function (b, e) {
    const run = b._run || {};
    const def = SH.ENEMY_BY_ID[e.defId];
    if (!def || !def.phases) return;
    const ratio = e.hp / e.maxHp;
    let target = 0;
    def.phases.forEach((p, i) => { if (ratio <= p.at) target = i; });
    if (target <= e.phaseIdx) return;
    e.phaseIdx = target;
    // 切换清理：清空土牢/缠绕，保留灼烧/冻缓
    removeStatus(e, '土牢');
    removeStatus(e, '缠绕');
    const ph = def.phases[target];
    E.log(b, 'sys', '『' + e.name + '』进入第 ' + (target + 1) + ' 阶段 · ' + ph.name + '。');
    const enterCodes = Array.isArray(ph.onEnter) ? ph.onEnter : (ph.onEnter ? [ph.onEnter] : []);
    enterCodes.forEach(function (enterCode) {
      switch (enterCode) {
      case 'summonTwo': {
        const token = SH.ENEMY_BY_ID['E102'];
        let n = 0;
        [1, 2, 3].forEach((p) => {
          if (token && !E.enemyAt(b, p) && n < 2) {
            n += 1;
            b.enemies.push({
              uid: SH.util.uid('e'), defId: 'E102', name: token.name, element: token.element,
              maxHp: token.hp, hp: token.hp, atkBase: token.atk, advanceBase: 1, advanceBuff: 0, atkBuff: 0,
              pos: p, statuses: {}, intent: { type: 'attack', value: token.atk, hits: 1 }, phaseIdx: 0,
              specials: token.specials || [], affixes: [], summoned: true, elite: false, boss: false, turnCount: 0
            });
          }
        });
        E.log(b, 'enemy', '首领召唤了蛊雕幼体。');
        break;
      }
      case 'summonTwoZhu': {
        const token = SH.ENEMY_BY_ID['EL301'];
        let n = 0;
        [1, 2, 3].forEach((p) => {
          if (token && !E.enemyAt(b, p) && n < 2) {
            n += 1;
            b.enemies.push({
              uid: SH.util.uid('e'), defId: 'EL301', name: '烛九阴幼体', element: '火',
              maxHp: Math.round(token.hp * 0.5), hp: Math.round(token.hp * 0.5),
              atkBase: Math.round(token.atk * 0.7), advanceBase: 1, advanceBuff: 0, atkBuff: 0,
              pos: p, statuses: {}, intent: { type: 'attack', value: token.atk, hits: 1 }, phaseIdx: 0,
              specials: ['daynightAtk'], affixes: [], summoned: true, elite: false, boss: false, turnCount: 0
            });
          }
        });
        E.log(b, 'enemy', '首领召唤了烛九阴幼体。');
        break;
      }
      case 'aoeTwo': {
        b.units.slice().forEach((u) => {
          u.hp -= 2;
          E.log(b, 'enemy', '『' + e.name + '』怒啸，' + u.name + ' 失去 2 点生命。');
          if (u.hp <= 0) killUnit(b, run, u);
        });
        break;
      }
      case 'allUnitsFreeze':
        b.units.forEach((u) => addStatus(b, u, '冻缓', 1));
        E.log(b, 'enemy', '全体尖啸：所有异兽获得 1 层冻缓。');
        break;
      case 'allUnitsSunder':
        b.units.forEach((u) => addStatus(b, u, '裂甲', 1));
        E.log(b, 'enemy', '全体裂甲：所有异兽获得 1 层裂甲。');
        break;
      case 'blockCell':
        b.terrain[1] = '毒雾';
        E.log(b, 'sys', '中阵格被毒雾封锁。');
        break;
      case 'poisonMid':
        b.terrain[1] = '瘴泽';
        E.log(b, 'sys', '中阵格化为瘴泽。');
        break;
      case 'poisonAll':
        b.terrain = ['毒雾', '毒雾', '毒雾'];
        E.log(b, 'sys', '毒泽漫过整条荒痕。');
        break;
      case 'daynight':
        b.night = !b.night;
        E.log(b, 'sys', '昼夜为之一变：' + (b.night ? '夜' : '昼'));
        break;
      case 'lavaAll':
        b.terrain = ['熔岩', '熔岩', '熔岩'];
        E.log(b, 'sys', '大地化为熔岩。');
        break;
      case 'feralVuln2':
        e.specials.push('feralVuln2');
        break;
      case 'spiritEater':
        if ((e.affixes || []).indexOf('A08') < 0) e.affixes.push('A08');
        break;
      case 'devour1':
        e.devourStacks = (e.devourStacks || 0) + 1;
        break;
      case 'devour3':
        e.devourStacks = (e.devourStacks || 0) + 3;
        break;
      case 'heroDot2':
        if (e.specials.indexOf('heroDot2') < 0) e.specials.push('heroDot2');
        break;
      case 'aoeUnits2':
        if (e.specials.indexOf('aoeUnits2') < 0) e.specials.push('aoeUnits2');
        break;
      case 'feralFrostRage':
        if (e.specials.indexOf('feralFrostRage') < 0) e.specials.push('feralFrostRage');
        break;
          }
    });
    E.checkEnd(b);
  };

  function killEnemy(b, run, e) {
    if (e.hp > 0) return;
    E.log(b, 'sys', '「' + e.name + '」被击溃。');
    const rm = relicMods(run);
    if (rm.feralDiscountOnKill) {
      b.hand.forEach((c) => { if (c.face === 'feral') c.killDiscountTurn = b.turn; });
    }
    if ((e.affixes || []).indexOf('A16') >= 0 && !e.copied) {
      e.copied = true;
      const free = [1, 2, 3].find((p) => !E.enemyAt(b, p) && p !== e.pos);
      if (free) {
        b.enemies.push({
          uid: SH.util.uid('e'), defId: e.defId, name: e.name + '·半', element: e.element,
          maxHp: Math.max(1, Math.round(e.maxHp / 2)), hp: Math.max(1, Math.round(e.maxHp / 2)),
          atkBase: e.atkBase, advanceBase: e.advanceBase, advanceBuff: 0, atkBuff: 0,
          pos: free, statuses: {}, intent: { type: 'attack', value: e.atkBase }, phaseIdx: 0,
          specials: e.specials, affixes: e.affixes, copied: true, elite: false, boss: false, turnCount: 0
        });
        E.log(b, 'enemy', '「' + e.name + '」分裂出一个半血复制。');
      }
    }
    relicFire(b, run, 'kill', { targetEnemy: e, element: '无' });
    E.checkEnd(b);
  }

  function damageEnemy(b, run, e, raw, opts) {
    if (!e || e.hp <= 0) return 0;
    const res = E.computeDamage(b, Object.assign({ raw: raw }, opts), e);
    const dealt = applyToEnemy(b, e, res.dmg);
    if (dealt > 0) {
      E.log(b, 'player', '「' + (opts.sourceName || '效果') + '」对「' + e.name + '」造成 ' + dealt + ' 点伤害' + (res.countered ? '（相克 ×1.5）' : '') + '。');
      if (res.countered && e.hp > 0 && opts.element) {
        addStatus(b, e, SH.COUNTER_STATUS[opts.element], 1);
      }
    }
    if (e.hp <= 0) killEnemy(b, run, e);
    return dealt;
  }

  function damageUnit(b, run, e, unit, raw) {
    if (!unit || unit.hp <= 0) return 0;
    let dmg = Math.max(0, raw - ((unit.kit && unit.kit.dmgReduce) || 0) - stOf(e, '虚弱'));
    const pierce = (e.affixes || []).indexOf('A10') >= 0 || e.specials.indexOf('armorPierce') >= 0;
    const shield = stOf(unit, '护盾');
    if (shield > 0 && !pierce) {
      const absorbed = Math.min(shield, dmg);
      unit.statuses['护盾'].n -= absorbed;
      if (unit.statuses['护盾'].n <= 0) {
        removeStatus(unit, '护盾');
        b.statics.forEach((st) => { if (st.kind === 'shieldBreakDraw') E.drawCards(b, st.v); });
      }
      dmg -= absorbed;
    }
    unit.hp -= dmg;
    E.log(b, 'enemy', '「' + e.name + '」对「' + unit.name + '」造成 ' + dmg + ' 点伤害。');
    if (unit.hp <= 0) {
      if ((e.affixes || []).indexOf('A03') >= 0) {
        e.hp = Math.min(e.maxHp, e.hp + Math.ceil(e.maxHp * 0.1));
        E.log(b, 'enemy', '「' + e.name + '」嗜血，回复生命。');
      }
      if ((e.affixes || []).indexOf('A15') >= 0) e.devourStacks = (e.devourStacks || 0) + 1;
      killUnit(b, run, unit);
    }
    return dmg;
  }

  function killUnit(b, run, unit) {
    const idx = b.units.indexOf(unit);
    if (idx >= 0) b.units.splice(idx, 1);
    if (b.eroded.indexOf(unit.name) < 0) {
      b.eroded.push(unit.name);
      E.log(b, 'sys', '「' + unit.name + '」阵亡，本场进入荒蚀。');
      relicFire(b, run, 'erode', { name: unit.name });
    }
  }

  /* ---------------- 效果执行 ---------------- */
  function heroLoseHp(b, run, v) {
    const mods = omenMods(run);
    const rm = relicMods(run);
    let loss = v;
    if (rm.hpPayHalf) loss = Math.max(1, Math.ceil(loss / 2));
    if (rm.hpPayReduce) loss = Math.max(1, loss - rm.hpPayReduce);
    if (rm.firstSelfDraw && !b.flags.firstSelfDrawUsed) {
      b.flags.firstSelfDrawUsed = true;
      E.drawCards(b, 1);
    }
    if (mods.selfDamageHeal) {
      const heal = Math.floor(loss * mods.selfDamageHeal);
      b.hero.hp = Math.min(b.hero.maxHp, b.hero.hp + heal);
    }
    b.hero.hp -= loss;
    E.log(b, 'player', '巡吏失去 ' + loss + ' 点生命。');
    E.checkEnd(b);
  }

  E.applyEffects = function (b, run, effects, ctx) {
    const mods = omenMods(run || {});
    const rm = relicMods(run || {});
    const c = ctx || {};
    (effects || []).forEach((op) => {
      switch (op.op) {
        case 'dmg': {
          const times = op.times || 1;
          let v = op.v;
          // P6：条件改值（本回合已相生 / 本回合未出牌）
          if (op.chainAlt && b.chain.count > 0) v = op.chainAlt;
          if (op.firstAlt && !(b.turnCardsPlayed > 0)) v = op.firstAlt;
          if (c.feral && mods.feralDamage) v += mods.feralDamage;
          if (c.feral && b.flags.feralAtkBonus) v += b.flags.feralAtkBonus;
          if (c.feral && c.targetEnemy && (c.targetEnemy.specials || []).indexOf('feralVuln2') >= 0) v += 2;
          if (mods.elementPick && c.element && c.element !== '无') {
            v += c.element === mods.elementPick ? mods.elementBonus : mods.otherPenalty;
          }
          if (b.terrain && c.cell && b.terrain[c.cell - 1] === '金脉' && c.element === '金') v += 1 + tPlus(b, c.cell);
          const counterFlat = (op.counterFlat || 0) + (c.counterFlat || 0);
          const killed = {};
          const hitOne = (e) => {
            if (!e || e.hp <= 0) return;
            damageEnemy(b, run, e, v, { element: c.element, sourceName: c.name, counterFlat: counterFlat });
            if (e.hp <= 0) killed[e.uid] = e;
          };
          for (let i = 0; i < times; i++) {
            if (op.target === 'all') {
              E.livingEnemies(b).slice().forEach(hitOne);
            } else if (op.target === 'random') {
              const list = E.livingEnemies(b).filter((e) => e.pos > 0);
              const e = list[Math.floor(rnd(b) * list.length)];
              hitOne(e);
            } else {
              hitOne(c.targetEnemy);
            }
          }
          const killCount = Object.keys(killed).length;
          if (killCount) {
            if (op.killHeal) {
              const heal = killCount * op.killHeal;
              b.hero.hp = Math.min(b.hero.maxHp, b.hero.hp + heal);
              E.log(b, 'player', '击杀 ' + killCount + ' 个，巡吏回复 ' + heal + ' 点生命。');
            }
            if (op.killDraw) {
              E.drawCards(b, killCount * op.killDraw);
              E.log(b, 'player', '击杀得手，抽 ' + killCount * op.killDraw + ' 张牌。');
            }
            if (op.killPermAtk) {
              const gain = killCount * op.killPermAtk;
              b.units.forEach((u) => { u.atk += gain; });
              b.unitBonus = b.unitBonus || { atk: 0, hp: 0 };
              b.unitBonus.atk = (b.unitBonus.atk || 0) + gain;
              E.log(b, 'player', '击杀得手，本场己方异兽攻击永久 +' + gain + '。');
            }
          }
          break;
        }
        case 'dmgIfStatus': {
          const list = op.target === 'all' ? E.livingEnemies(b).slice() : [c.targetEnemy].filter(Boolean);
          list.forEach((e) => {
            if (stOf(e, op.s) > 0) damageEnemy(b, run, e, op.v, { element: c.element, sourceName: c.name });
          });
          break;
        }
        case 'statusOrDmg': {
          const list = op.target === 'all' ? E.livingEnemies(b).slice() : [c.targetEnemy].filter(Boolean);
          list.forEach((e) => {
            if (stOf(e, op.s) > 0) {
              damageEnemy(b, run, e, op.dmg, { element: c.element, sourceName: c.name });
            } else {
              addStatus(b, e, op.s, op.v + (rm.statusBonus[op.s] || 0));
              E.log(b, 'player', '「' + e.name + '」获得 ' + (op.v + (rm.statusBonus[op.s] || 0)) + ' 层' + op.s + '。');
            }
          });
          break;
        }
        case 'counterStatus': {
          const list = op.target === 'all' ? E.livingEnemies(b).slice() : [c.targetEnemy].filter(Boolean);
          list.forEach((e) => {
            if (c.element && SH.COUNTERS[c.element] === e.element) addStatus(b, e, op.s, op.v);
          });
          break;
        }
        case 'drawIfCounter': {
          const e = c.targetEnemy;
          if (e && c.element && SH.COUNTERS[c.element] === e.element) {
            E.drawCards(b, op.v);
            E.log(b, 'player', '相克既成，抽 ' + op.v + ' 张牌。');
          }
          break;
        }
        case 'drawIfCounterAll': {
          // P6：任一敌人在相克关系内即抽牌
          const e = E.livingEnemies(b).filter((x) => x.pos > 0 && c.element && SH.COUNTERS[c.element] === x.element)[0];
          if (e) {
            E.drawCards(b, op.v);
            E.log(b, 'player', '相克既成，抽 ' + op.v + ' 张牌。');
          }
          break;
        }
        case 'loseHp': {
          let v = op.v;
          if (c.feral && mods.feralSelfDamage) v += mods.feralSelfDamage;
          if (c.feral) v = Math.max(1, v - rm.feralSelfReduce);
          if (b.flags.feralSelfHalf) v = Math.max(1, Math.ceil(v / 2));
          if (b.difficulty && diffMods(run).selfDamage) v = Math.ceil(v * (1 + diffMods(run).selfDamage));
          heroLoseHp(b, run, v);
          break;
        }
        case 'heal': {
          const amt = Math.round(op.v * (1 + rm.healBonus));
          b.hero.hp = Math.min(b.hero.maxHp, b.hero.hp + amt);
          E.log(b, 'player', '巡吏回复 ' + amt + ' 点生命。');
          break;
        }
        case 'delayHeal':
          // P6：下个玩家回合开始回复
          b.flags.delayHeal = (b.flags.delayHeal || 0) + op.v;
          E.log(b, 'player', '下回合开始将回复 ' + op.v + ' 点生命。');
          break;
        case 'healUnits':
          b.units.forEach((u) => { u.hp = Math.min(u.maxHp, u.hp + op.v); });
          break;
        case 'draw':
          E.drawCards(b, op.v);
          break;
        case 'drawIfNight':
          if (b.night) E.drawCards(b, op.v);
          break;
        case 'qi':
          b.qi += op.v;
          E.log(b, 'player', '获得 ' + op.v + ' 点灵气。');
          break;
        case 'qiMax':
          b.qiMax = Math.min(R.qiHardCap, b.qiMax + op.v);
          b.qi += op.v;
          E.log(b, 'player', '灵气上限 +' + op.v + '（当前 ' + b.qiMax + '）。');
          break;
        case 'lingyong': {
          let v = op.v + rm.lingyongPlus;
          if (rm.lingyongOnce && b.flags.lingyongOnceTurn !== b.turn) {
            b.flags.lingyongOnceTurn = b.turn;
            v += rm.lingyongOnce;
          }
          if (rm.lingyongChance && rnd(b) < rm.lingyongChance) v += 1;
          if (b.affixes && b.affixes.indexOf('A08') >= 0 && rnd(b) < 0.5) {
            b.qi = Math.max(0, b.qi - 1);
            E.log(b, 'enemy', '噬灵：灵涌化为 1 点灵气流失。');
            break;
          }
          b.lingyong = Math.min(b.qiMax + R.lingyongOverCap, b.lingyong + v);
          E.log(b, 'player', '获得 ' + v + ' 点灵涌（当前 ' + b.lingyong + '）。');
          break;
        }
        case 'husui':
          run.husui = (run.husui || 0) + op.v;
          E.log(b, 'player', '获得 ' + op.v + ' 荒髓。');
          break;
        case 'status': {
          if (op.chainOnly && b.chain.count <= 0) break;
          const list = op.target === 'all' ? E.livingEnemies(b) : [c.targetEnemy].filter(Boolean);
          list.forEach((e) => {
            if ((e.affixes || []).indexOf('A09') >= 0 && ['缠绕', '土牢', '束缚', '晕眩'].indexOf(op.s) >= 0) return;
            let add = op.v + (rm.statusBonus[op.s] || 0);
            if (op.s === '灼烧') add += b.statics.filter((st) => st.kind === 'burnBonus').reduce((a, st) => a + st.v, 0);
            const got = addStatus(b, e, op.s, add);
            if (!got) { E.log(b, 'player', '「' + e.name + '」抗住了' + op.s + '。'); return; }
            E.log(b, 'player', '「' + e.name + '」获得 ' + got + ' 层' + op.s + '。');
            if (op.s === '灼烧' && rm.burnDrawOnce && b.flags.burnDrawTurn !== b.turn) {
              b.flags.burnDrawTurn = b.turn;
              E.drawCards(b, 1);
              E.log(b, 'relic', '朱雀羽：灼烧既起，抽 1 张牌。');
            }
          });
          break;
        }
        case 'atkZero':
          if (c.targetEnemy) {
            c.targetEnemy.atkZeroTurn = b.turn;
            E.log(b, 'player', '「' + c.targetEnemy.name + '」本回合攻击力降为 0。');
          }
          break;
        case 'atkZeroOrStun': {
          // P6 白泽图录：普通敌人降攻，凶化单位（精英 / 首领）改为晕眩
          const e = c.targetEnemy;
          if (!e) break;
          if (e.elite || e.boss) {
            const got = addStatus(b, e, op.s || '晕眩', op.v || 1);
            E.log(b, 'player', got ? ('「' + e.name + '」被' + (op.s || '晕眩') + '，跳过下次行动。') : ('「' + e.name + '」抗住了' + (op.s || '晕眩') + '。'));
          } else {
            e.atkZeroTurn = b.turn;
            E.log(b, 'player', '「' + e.name + '」本回合攻击力降为 0。');
          }
          break;
        }
        case 'buffEnemyAtk':
          if (c.targetEnemy) c.targetEnemy.atkBuff = (c.targetEnemy.atkBuff || 0) + op.v;
          break;
        case 'advance': {
          const list = op.target === 'all' ? E.livingEnemies(b) : [c.targetEnemy].filter(Boolean);
          list.forEach((e) => { e.advanceBuff = (e.advanceBuff || 0) + op.v; });
          if (list.length) E.log(b, 'player', '敌方推进值 ' + (op.v > 0 ? '+' : '') + op.v + '。');
          break;
        }
        case 'buffUnit': {
          const list = c.unit ? [c.unit] : (b.units.length ? [b.units[0]] : []);
          list.forEach((u) => {
            if (op.atk) u.atk += op.atk;
            if (op.hp) { u.hp += op.hp; u.maxHp += op.hp; }
          });
          break;
        }
        case 'buffUnits': {
          b.units.forEach((u) => {
            let atk = op.atk || 0;
            if (op.elem && u.element === op.elem) atk = op.elemAtk || atk;
            u.atk += atk;
            if (op.hp) { u.hp += op.hp; u.maxHp += op.hp; }
          });
          break;
        }
        case 'buffFront': {
          // P6：「一异兽」类效果落在最前一只未升空异兽（前哨优先）
          const u = b.units.filter((x) => x.hp > 0 && !x.airborne).sort((a, z) => a.pos - z.pos)[0];
          if (!u) { E.log(b, 'sys', '场上无异兽可受增益。'); break; }
          if (op.atk) u.atk += op.atk;
          if (op.hp) { u.hp += op.hp; u.maxHp += op.hp; }
          E.log(b, 'player', '「' + u.name + '」' + (op.atk ? '攻击 +' + op.atk : '生命 +' + op.hp) + '（本场）。');
          break;
        }
        case 'shield':
          b.hero.shield = (b.hero.shield || 0) + op.v;
          E.log(b, 'player', '巡吏获得 ' + op.v + ' 点护盾。');
          break;
        case 'shieldUnit': {
          const list = op.target === 'allUnits' ? b.units : (c.unit ? [c.unit] : b.units);
          list.forEach((u) => addStatus(b, u, '护盾', op.v));
          break;
        }
        case 'discard': {
          const n = op.v === 'all' ? b.hand.length : Math.min(op.v, b.hand.length);
          for (let i = 0; i < n; i++) {
            const card = b.hand.pop();
            b.discard.push(Object.assign(card, { face: 'tame' }));
          }
          E.log(b, 'player', '弃置 ' + n + ' 张手牌。');
          break;
        }
        case 'discardAll': {
          const n = b.hand.length;
          b.hand.forEach((card) => b.discard.push(Object.assign(card, { face: 'tame' })));
          b.hand = [];
          E.log(b, 'player', '弃置全部手牌（' + n + ' 张）。');
          break;
        }
        case 'discountHand': {
          for (let i = 0; i < (op.n || 1) && i < b.hand.length; i++) b.hand[i].flipDiscountTurn = b.turn;
          break;
        }
        case 'tameCheap':
          b.flags.tameCheap = (b.flags.tameCheap || 0) + op.v;
          E.log(b, 'player', '本回合下一张驯化面牌费用 -' + op.v + '。');
          break;
        case 'spellCheap':
          b.flags.spellCheap = (b.flags.spellCheap || 0) + op.v;
          E.log(b, 'player', '本回合下一张术法费用 -' + op.v + '。');
          break;
        case 'nextFeralAtk':
          b.flags.feralAtkBonus = (b.flags.feralAtkBonus || 0) + op.v;
          E.log(b, 'player', '本回合凶化面攻击 +' + op.v + '。');
          break;
        case 'gainHuangSui':
          b.husuiGain = (b.husuiGain || 0) + op.v;
          break;
        case 'terrainChoose': {
          const pos = c.cell || 1;
          b.terrain[pos - 1] = op.t;
          E.log(b, 'player', ['', '前哨', '中阵', '后阵'][pos] + '地形变为「' + op.t + '」。');
          break;
        }
        case 'terrainPlus': {
          // P6：本格地形效果强度 +N（本场）
          const pos = c.cell || 1;
          b.terrainPlus = b.terrainPlus || [0, 0, 0];
          b.terrainPlus[pos - 1] += op.v;
          E.log(b, 'player', ['', '前哨', '中阵', '后阵'][pos] + '地形效果 +' + op.v + '（本场）。');
          break;
        }
        case 'daynight':
          b.night = !b.night;
          E.log(b, 'player', '昼夜切换：' + (b.night ? '夜' : '昼'));
          b.units.slice().forEach((u) => fire(b, run, u, 'onDaynight', {}));
          relicFire(b, run, 'daynight', {});
          if ((run.omens || []).indexOf('O10') >= 0) E.drawCards(b, 1);
          break;
        case 'purify':
          if (!rm.erodeBlock && !(diffMods(run).erodeBlock) && !(b.enemies || []).some((e) => (e.affixes || []).indexOf('A07') >= 0)) {
            if (b.eroded.length) {
              b.eroded.shift();
              b.purifiedCount = (b.purifiedCount || 0) + 1;
              E.log(b, 'player', '净化了一个荒蚀之名。');
            }
          } else {
            E.log(b, 'sys', '荒蚀不净：本次净化被阻止。');
          }
          break;
        case 'atkMult':
          b.units.forEach((u) => {
            if (!u.atkMultBase) u.atkMultBase = u.atk;
            u.atk = Math.round(u.atk * op.v);
          });
          E.log(b, 'player', '本回合己方异兽攻击 ×' + op.v + '。');
          break;
        case 'chainExtra':
          b.chainExtra = (b.chainExtra || 0) + op.v;
          E.log(b, 'player', '本回合相生额外触发 ' + op.v + ' 次。');
          break;
        case 'chainNoLimit':
          b.chainNoLimit = true;
          b.chainSelfDamage = op.v || 2;
          E.log(b, 'player', '本回合相生不消耗次数，每次相生自损 ' + (op.v || 2) + '。');
          break;
        case 'killQi':
          if (c.targetEnemy && c.targetEnemy.hp <= 0) {
            b.qi += op.v;
            E.log(b, 'player', '击杀得手，回复 ' + op.v + ' 点灵气。');
          }
          break;
        case 'flipFree':
          b.flags.flipFreeCount = (b.flags.flipFreeCount || 0) + op.v;
          break;
        case 'flipFreeAll':
          b.flags.flipFreeTurn = b.turn;
          break;
        case 'summonToken': {
          const free = [1, 2, 3].find((p) => !E.blockerAt(b, p) && !E.enemyAt(b, p));
          if (free) {
            const hp = op.hp + (b.unitBonus ? b.unitBonus.hp : 0);
            const atk = op.atk + (b.unitBonus ? b.unitBonus.atk : 0);
            b.units.push({
              uid: SH.util.uid('u'), cardId: 'TOKEN', name: op.name, element: c.element || '无',
              atk: atk, hp: hp, maxHp: hp, pos: free, sick: true, sickTurns: 1, statuses: {},
              face: 'tame', kit: makeKit(), flags: {}, token: true
            });
            E.log(b, 'player', '召唤了「' + op.name + '」。');
          }
          break;
        }
        case 'sacrificeSummon': {
          const idx = b.hand.findIndex((x) => {
            const d = SH.CARD_BY_ID[x.id];
            return d && d.type === 'beast';
          });
          if (idx >= 0) {
            const inst = b.hand.splice(idx, 1)[0];
            const def = SH.CARD_BY_ID[inst.id];
            const face = E.faceOf(Object.assign({}, inst, { face: 'tame' }));
            const beast = face.beast || { atk: 1, hp: 1 };
            for (let i = 0; i < op.count; i++) {
              const free = [1, 2, 3].find((p) => !E.blockerAt(b, p) && !E.enemyAt(b, p));
              if (!free) break;
              const hp = Math.max(1, Math.round(beast.hp * op.ratio));
              const atk = Math.max(1, Math.round(beast.atk * op.ratio));
              b.units.push({
                uid: SH.util.uid('u'), cardId: 'TOKEN', name: def.name + '·影', element: def.element,
                atk: atk, hp: hp, maxHp: hp, pos: free, sick: true, sickTurns: 1, statuses: {},
                face: 'tame', kit: makeKit(), flags: {}, token: true
              });
            }
            E.log(b, 'player', '献祭「' + def.name + '」，召唤 ' + op.count + ' 只复制。');
          } else {
            E.log(b, 'sys', '没有可献祭的异兽牌。');
          }
          break;
        }
        case 'executeLow': {
          let kills = 0;
          E.livingEnemies(b).slice().forEach((e) => {
            if (e.hp <= op.hp) {
              damageEnemy(b, run, e, e.hp + 999, { element: '无', sourceName: c.name });
              kills += 1;
            }
          });
          if (kills) {
            b.hero.hp = Math.min(b.hero.maxHp, b.hero.hp + kills * op.heal);
            E.log(b, 'player', '吞噬 ' + kills + ' 个敌人，回复 ' + kills * op.heal + ' 生命。');
          }
          break;
        }
        case 'gainOmen': {
          const pool = SH.OMENS.filter((o) => (run.omens || []).indexOf(o.id) < 0);
          if (pool.length) {
            const pick = pool[Math.floor(rnd(b) * pool.length)];
            run.omens.push(pick.id);
            E.log(b, 'sys', '获得誓约「' + pick.name + '」。');
          }
          break;
        }
        case 'static': {
          if (!b.statics.some((st) => st.kind === op.kind && st.s === op.s)) b.statics.push(op);
          if (op.kind === 'unitHp') {
            b.units.forEach((u) => { u.hp += op.v; u.maxHp += op.v; });
            b.unitBonus = b.unitBonus || { atk: 0, hp: 0 };
            b.unitBonus.hp = (b.unitBonus.hp || 0) + op.v;
          }
          if (op.kind === 'frontHp') {
            b.frontHpBonus = (b.frontHpBonus || 0) + op.v;
            const fu = E.unitAt(b, 1);
            if (fu) { fu.hp += op.v; fu.maxHp += op.v; }
          }
          if (op.kind === 'extraCell') b.flags.extraCell = 1;
          if (op.kind === 'feralSelfHalf') b.flags.feralSelfHalf = true;
          E.log(b, 'player', '布下「' + (op.kind) + '」持续效果。');
          break;
        }
        case 'frontAtk': {
          const u = E.unitAt(b, 1);
          if (u) u.atk += op.v;
          break;
        }
        case 'frontHpTurn': {
          b.frontHpBonus = (b.frontHpBonus || 0) + op.v;
          const u = E.unitAt(b, 1);
          if (u) { u.hp += op.v; u.maxHp += op.v; }
          break;
        }
        default:
          E.log(b, 'sys', '未知指令：' + op.op);
      }
    });
  };

  /* ---------------- 出牌 ---------------- */
  // choice.mode = 'cast' 时走 P6 施术分支；缺省为召唤
  E.playCard = function (b, run, uid, choice) {
    if (b.over) return { ok: false, reason: '战斗已结束' };
    if (b.phase !== 'player') return { ok: false, reason: '不是你的回合' };
    const inst = b.hand.find((c) => c.uid === uid);
    if (!inst) return { ok: false, reason: '手牌不存在' };
    const def = cardDef(inst.id);
    if (!def) return { ok: false, reason: '卡牌数据缺失' };
    const castable = !!(def.cast && (def.cast[inst.face] || def.cast.tame));
    const mode = (choice && choice.mode === 'cast' && castable) ? 'cast' : 'summon';
    // P6：荒蚀只禁召唤，不禁施术；召唤次数也只约束召唤
    if (def.type === 'beast' && mode === 'summon' && b.eroded.indexOf(def.name) >= 0) {
      return { ok: false, reason: '「' + def.name + '」处于荒蚀，本场无法再召唤（可施术）' };
    }
    if (def.type === 'beast' && mode === 'summon' && b.summonsThisTurn >= R.summonPerTurn + omenMods(run).summonPlus) {
      return { ok: false, reason: '本回合召唤次数已用尽' };
    }
    const need = E.needTarget(b, inst, mode);
    if (need && need.kind === 'noCell') return { ok: false, reason: '荒痕已无空格' };
    if (need && need.kind === 'noEnemy') return { ok: false, reason: '没有合法目标' };
    const hasChoice = !!(choice && (choice.enemy != null || choice.cell != null));
    if (need && !need.auto && !hasChoice) return { ok: false, need: need, reason: '需要选择目标' };

    const c = E.costOf(b, run, inst, mode);
    const pool = b.lingyong + b.qi;
    if (pool < c.cost) return { ok: false, reason: '灵气不足（需要 ' + c.cost + '）' };

    // 支付：优先灵涌
    let pay = c.cost;
    const useLing = Math.min(b.lingyong, pay);
    b.lingyong -= useLing;
    pay -= useLing;
    b.qi -= pay;
    if (b.flags.cheap > 0) b.flags.cheap -= 1;
    if (c.tameCheap) b.flags.tameCheap = Math.max(0, (b.flags.tameCheap || 0) - 1);
    if (c.spellCheap) b.flags.spellCheap = Math.max(0, (b.flags.spellCheap || 0) - 1);

    // 移除手牌
    b.hand.splice(b.hand.indexOf(inst), 1);
    b.stats.cardsPlayed += 1;
    if (def.type === 'beast') {
      if (inst.face === 'feral') b.stats.feralPlays = (b.stats.feralPlays || 0) + 1;
      else b.stats.tamePlays = (b.stats.tamePlays || 0) + 1;
      if (mode === 'cast') b.stats.casts = (b.stats.casts || 0) + 1;
    } else if (def.type === 'spell') {
      b.stats.spellsPlayed = (b.stats.spellsPlayed || 0) + 1;
    }

    const face = E.faceOf(inst);
    const ctx = {
      element: def.element,
      name: def.name,
      targetEnemy: null,
      cell: null,
      unit: null,
      feral: inst.face === 'feral',
      counterFlat: 0,
      cast: mode === 'cast'
    };
    if (need && need.kind === 'enemy') {
      const tid = choice && choice.enemy ? choice.enemy : need.auto;
      ctx.targetEnemy = b.enemies.find((e) => e.uid === tid) || null;
    }
    if (need && need.kind === 'cell' && need.autoEnemy) {
      ctx.targetEnemy = b.enemies.find((e) => e.uid === need.autoEnemy) || null;
    }
    if (choice && choice.cell) ctx.cell = choice.cell;
    else if (need && need.kind === 'cell' && need.auto) ctx.cell = need.auto;
    else if (need && need.alsoCell) ctx.cell = need.alsoCell.auto || (need.alsoCell.options || [1])[0];

    if (mode === 'cast') {
      // 施术：不召唤、不触发召唤时遗物，按当前面结算
      const cf = def.cast[inst.face] || def.cast.tame;
      E.applyEffects(b, run, cf.effects, ctx);
    } else {
      if (def.type === 'beast') {
        ctx.unit = summon(b, run, def, face, ctx.cell || 1, inst, ctx);
        b.summonsThisTurn += 1;
        if (!ctx.targetEnemy) {
          const t = E.livingEnemies(b).filter((e) => e.pos > 0);
          if (t.length) ctx.targetEnemy = t[0];
        }
      }
      // 效果
      E.applyEffects(b, run, face.effects, ctx);
    }

    // 相生链（施术同样参与相生 / 相克）
    applyChain(b, run, def.element);

    // 结算去向：施术一律进消耗堆
    const exhausted = mode === 'cast' ? true : (!!face.exhaust || def.exhaust);
    const back = Object.assign({}, inst, { face: 'tame', flipDiscountTurn: 0 });
    if (exhausted) b.exhaust.push(back);
    else b.discard.push(back);

    // 遗物：按打出面向 / 类型触发（P1 6.2）；巡吏技不触发术法 / 祭仪
    if (inst.face === 'feral') relicFire(b, run, 'afterFeral', { instance: inst });
    else relicFire(b, run, 'afterTame', { instance: inst });
    if (def.type === 'ritual') relicFire(b, run, 'afterRitual', { instance: inst });
    if (def.type === 'terrain') relicFire(b, run, 'afterTerrain', { instance: inst });
    if (def.type === 'spell') relicFire(b, run, 'afterSpell', { instance: inst });

    E.log(b, 'player', (mode === 'cast' ? '施术「' : '打出「') + def.name + (inst.face === 'feral' && E.isDouble(def) ? '·凶' : '') + '」（' + c.cost + ' 灵气）。');
    b.turnCardsPlayed = (b.turnCardsPlayed || 0) + 1;
    E.checkEnd(b);
    return { ok: true, cost: c.cost, chain: c.chain, mode: mode };
  };

  /* ---------------- 翻面 ---------------- */
  E.flipCard = function (b, run, uid) {
    if (b.phase !== 'player' || b.over) return { ok: false, reason: '无法翻面' };
    const inst = b.hand.find((c) => c.uid === uid);
    if (!inst) return { ok: false, reason: '手牌不存在' };
    const def = cardDef(inst.id);
    if (!E.isDouble(def)) return { ok: false, reason: '该牌只有一面' };
    if (inst.flippedTurn === b.turn) return { ok: false, reason: '本回合已翻面' };
    // 卡面自带的「首次翻面免耗」
    const curKit = buildKit(E.faceOf(inst));
    const rm = relicMods(run);
    let free = false;
    if (rm.firstFlipFree && !b.flags.firstFlipUsed) { free = true; b.flags.firstFlipUsed = true; }
    if (b.flags.flipFreeTurn === b.turn) free = true;
    if ((b.flags.flipFreeCount || 0) > 0) { free = true; b.flags.flipFreeCount -= 1; }
    if (curKit.firstFlipFree && !b.flags.cardFlipFree) { free = true; b.flags.cardFlipFree = true; }
    if (!free && b.lingyong + b.qi < 1) return { ok: false, reason: '灵气不足' };
    if (!free) {
      if (b.lingyong > 0) b.lingyong -= 1; else b.qi -= 1;
    }
    inst.face = inst.face === 'tame' ? 'feral' : 'tame';
    inst.flippedTurn = b.turn;
    b.stats.flips += 1;
    E.log(b, 'player', '「' + def.name + '」翻至' + (inst.face === 'feral' ? '凶化' : '驯化') + '面' + (free ? '（免耗）' : '') + '。');
    // 翻面词条（按翻至的新面）
    const newKit = buildKit(E.faceOf(inst));
    if (newKit.onFlip.length) {
      const pseudo = { name: def.name, element: def.element, pos: 1, hp: 1, maxHp: 1, kit: newKit, flags: {}, statuses: {} };
      runOps(b, run, pseudo, newKit.onFlip, {});
    }
    relicFire(b, run, 'flip', { instance: inst, targetEnemy: null });
    if (!b.phase || b.phase === 'player') {
      if (rm.flipDiscount) {
        inst.flipDiscountTurn = b.turn;
        E.log(b, 'relic', '九尾幻尾：该牌本回合费用 -1。');
      }
      if (rm.flipDiscountOnce && b.flags.flipDiscountTurn !== b.turn) {
        b.flags.flipDiscountTurn = b.turn;
        inst.flipDiscountTurn = b.turn;
      }
      if (rm.flipDrawDiscard) {
        E.drawCards(b, 1);
        if (b.hand.length) b.discard.push(Object.assign(b.hand.pop(), { face: 'tame' }));
      }
    }
    return { ok: true };
  };

  /* ---------------- 移动 ---------------- */
  E.moveUnit = function (b, run, uid, toPos) {
    if (b.phase !== 'player' || b.over) return { ok: false, reason: '无法移动' };
    const u = b.units.find((x) => x.uid === uid);
    if (!u) return { ok: false, reason: '单位不存在' };
    if (u.movedTurn === b.turn) return { ok: false, reason: '本回合已调整' };
    if (Math.abs(u.pos - toPos) !== 1) return { ok: false, reason: '只能移动到相邻格' };
    if (E.unitAt(b, toPos) || E.enemyAt(b, toPos)) return { ok: false, reason: '目标格不可用' };
    if (b.lingyong + b.qi < 1) return { ok: false, reason: '灵气不足' };
    if (b.lingyong > 0) b.lingyong -= 1; else b.qi -= 1;
    u.pos = toPos;
    u.movedTurn = b.turn;
    E.log(b, 'player', '「' + u.name + '」移动至' + ['', '前哨', '中阵', '后阵'][toPos] + '。');
    return { ok: true };
  };

  /* ---------------- 巡吏技能 ---------------- */
  E.useSkill = function (b, run) {
    if (b.phase !== 'player' || b.over) return { ok: false, reason: '无法使用' };
    if (b.skillUsed) return { ok: false, reason: '本场已使用过巡吏技能' };
    const hero = SH.HERO_BY_ID[run.heroId];
    b.skillUsed = true;
    E.log(b, 'player', '巡吏技能「' + hero.skill.name + '」发动。');
    E.applyEffects(b, run, hero.skill.effects, { element: '无', name: hero.skill.name });
    E.checkEnd(b);
    return { ok: true };
  };

  /* ---------------- 意图 ---------------- */
  function poolFor(e) {
    const def = SH.ENEMY_BY_ID[e.defId];
    if (!def) return { attack: 100 };
    if (def.phases) {
      const ph = def.phases[e.phaseIdx] || def.phases[0];
      return ph.pool;
    }
    return def.intent;
  }
  E.poolFor = poolFor;

  E.rollIntents = function (b, run) {
    const rng = SH.makeRng(SH.subSeed(b.seed, 'intent', b.turn));
    b.enemies.forEach((e) => {
      if (e.hp <= 0 || e.pos === 0) { e.intent = e.intent || { type: 'advance' }; return; }
      const pool = Object.assign({}, poolFor(e));
      // 反无限：召唤上限（普通 1 / 精英 2 / 首领 3）
      const summons = b.enemies.filter((x) => x.hp > 0 && x.summoned).length;
      const cap = e.boss ? 3 : e.elite ? 2 : (e.specials.indexOf('summonCap2') >= 0 ? 2 : 1);
      if (summons >= cap) pool.summon = 0;
      // 连续限制
      const last = e.lastIntents || [];
      if (last.length >= 2 && last[last.length - 1] === last[last.length - 2]) {
        if (last[last.length - 1] !== 'attack') pool[last[last.length - 1]] = 0;
      }
      const entries = Object.keys(pool).map((k) => ({ v: k, w: pool[k] }));
      let type = rng.weighted(entries) || 'attack';
      if (e.charging) { type = 'attack'; e.charging = false; }
      const intent = { type: type };
      if (type === 'attack') {
        intent.value = E.enemyAtk(b, e) + (e.specials.indexOf('chargeStrike') >= 0 && e.charged ? 5 : 0);
        intent.hits = e.specials.indexOf('multiHit3') >= 0 ? 3 : e.specials.indexOf('multiHit2') >= 0 ? 2 : 1;
        e.charged = false;
      }
      if (type === 'status') {
        intent.status = { '水': '冻缓', '火': '灼烧', '木': '缠绕', '土': '土牢', '金': '裂甲', '无': '虚弱' }[e.element] || '冻缓';
      }
      if (type === 'advance') intent.value = E.enemyAdvance(e);
      if (type === 'charge') { intent.value = 10; e.charging = true; }
      e.intent = intent;
      // 新手教学：按「交战→推进→突入」强制行动，避免互刷站场
      if (b.tutorialSafe) {
        const blocked = !!E.blockerAt(b, e.pos);
        if (blocked) e.intent = { type: 'attack', value: E.enemyAtk(b, e), hits: 1 };
        else if (e.pos >= 3) e.intent = { type: 'breach', value: E.enemyAtk(b, e) };
        else e.intent = { type: 'advance', value: E.enemyAdvance(e) };
      }
      e.lastIntents = (e.lastIntents || []).concat(type).slice(-4);
    });
  };

  // 显示用：被阻挡后的实际意图（P0 1.5）
  E.previewIntent = function (b, e) {
    const it = e.intent || { type: 'advance' };
    // P6 S16：晕眩直接显示「跳过」
    if (stOf(e, '晕眩') > 0) return { type: 'stun', label: '晕眩·跳过', value: null };
    if (e.pos === 0) return { type: 'advance', label: '入场', value: null };
    const blocked = !!(E.blockerAt(b, e.pos) && e.pos > 0);
    if (it.type === 'attack') {
      if (blocked) return { type: 'attack', label: '攻击异兽', value: it.value, hits: it.hits };
      if (e.pos >= 3) return { type: 'breach', label: '突入本体', value: it.value };
      return { type: 'advance', label: '推进', value: E.enemyAdvance(e) };
    }
    if (it.type === 'advance') {
      if (blocked) return { type: 'attack', label: '被阻挡·反击', value: E.enemyAtk(b, e) };
      if (stOf(e, '束缚') > 0) return { type: 'advance', label: '束缚·受阻', value: 0 };
      return { type: 'advance', label: '推进', value: it.value };
    }
    if (it.type === 'breach') {
      if (blocked) return { type: 'attack', label: '攻击异兽', value: E.enemyAtk(b, e) };
      return { type: 'breach', label: '突入本体', value: E.enemyAtk(b, e) };
    }
    const labelMap = { defend: '防御', status: '施法', summon: '召唤', charge: '蓄力' };
    return Object.assign({}, it, { label: labelMap[it.type] || '行动' });
  };

  /* ---------------- 敌方回合 ---------------- */
  function enterBoard(b, e) {
    if (!e || e.hp <= 0 || e.pos !== 0) return false;
    if (E.enemyAt(b, 1)) return false;
    e.pos = 1;
    E.log(b, 'enemy', '「' + e.name + '」自荒外踏入前哨格。');
    return true;
  }

  function advanceEnemy(b, e) {
    let step = E.enemyAdvance(e);
    if (b.terrain[e.pos - 1] === '风穴') step += 1;
    for (let i = 0; i < step; i++) {
      if (e.pos >= 3) break;
      const next = e.pos + 1;
      if (E.enemyAt(b, next)) {
        E.log(b, 'enemy', '「' + e.name + '」推进受阻，发生拥堵。');
        break;
      }
      e.pos = next;
      E.log(b, 'enemy', '「' + e.name + '」推进至' + ['', '前哨', '中阵', '后阵'][next] + '。');
      // 新手教学：遇到异兽就停下交战，不越过防线
      if (b.tutorialSafe && E.unitAt(b, next)) break;
    }
  }

  function breach(b, e) {
    const dmg = E.enemyAtk(b, e);
    let d = dmg;
    if (b.hero.shield > 0) {
      const ab = Math.min(b.hero.shield, d);
      b.hero.shield -= ab;
      d -= ab;
    }
    b.hero.hp -= d;
    E.log(b, 'enemy', '「' + e.name + '」突入本体，巡吏受到 ' + d + ' 点伤害！');
    e.pos = 4;
    e.hp = Math.max(0, e.hp);
    E.checkEnd(b);
  }

  function enemyResolve(b, run, e) {
    if (e.hp <= 0) return;
    // P6 S16 晕眩：整段行动跳过（优先于土牢，不消耗土牢层数）
    if (stOf(e, '晕眩') > 0) {
      e.statuses['晕眩'].n -= 1;
      if (e.statuses['晕眩'].n <= 0) removeStatus(e, '晕眩');
      E.log(b, 'enemy', '「' + e.name + '」目眩神摇，跳过本次行动。');
      return;
    }
    if (e.pos === 0) { enterBoard(b, e); return; }
    if (e.pos >= 4) return;

    if (stOf(e, '土牢') > 0 && (e.affixes || []).indexOf('A09') < 0) {
      e.statuses['土牢'].n -= 1;
      if (e.statuses['土牢'].n <= 0) removeStatus(e, '土牢');
      E.log(b, 'enemy', '「' + e.name + '」被土牢封锁，意图执行失败。');
      return;
    }

    const it = e.intent || { type: 'advance' };
    // P6 S17 束缚：封印「推进」意图
    if (it.type === 'advance' && stOf(e, '束缚') > 0) {
      E.log(b, 'enemy', '「' + e.name + '」被束缚牵制，无法推进。');
      return;
    }
    const rm = relicMods(run);
    const unit = E.blockerAt(b, e.pos);
    const hitUnit = (u, hits, raw) => {
      for (let i = 0; i < hits; i++) {
        if (!u || u.hp <= 0) break;
        damageUnit(b, run, e, u, raw);
      }
      if (!u || u.hp <= 0) return;
      if (e.specials.indexOf('frostAttack') >= 0) addStatus(b, u, '冻缓', 1 + (e.specials.indexOf('frostCap') >= 0 ? 1 : 0));
      if (e.specials.indexOf('tangleAttack') >= 0 && !rm.immuneControl) addStatus(b, u, '缠绕', 1);
      if (e.specials.indexOf('sunder') >= 0) addStatus(b, u, '裂甲', 1);
      if (e.specials.indexOf('atkUpOnAttack') >= 0) e.atkBuff = (e.atkBuff || 0) + 1;
      if (e.specials.indexOf('shriek') >= 0) addStatus(b, u, '冻缓', 1);
    };

    switch (it.type) {
      case 'attack': {
        if (unit) {
          let hits = it.hits || 1;
          if (e.specials.indexOf('multiHit3') >= 0) hits = 3;
          if (e.specials.indexOf('multiHit2') >= 0) hits = 2;
          hitUnit(unit, hits, e.atkZeroTurn === b.turn ? 0 : E.enemyAtk(b, e));
          if (e.specials.indexOf('multiTarget2') >= 0) {
            const other = b.units.filter((u) => u.uid !== unit.uid).sort((a, c) => Math.abs(a.pos - e.pos) - Math.abs(c.pos - e.pos))[0];
            if (other) hitUnit(other, 1, Math.round(E.enemyAtk(b, e) * 0.5));
          }
          if (e.specials.indexOf('selfBleed') >= 0) { e.hp -= 1; E.log(b, 'enemy', '「' + e.name + '」戾气反噬，自损 1。'); }
        } else if ((e.specials || []).indexOf('antiAir') >= 0 && E.airborneAt(b, e.pos)) {
          // P6 对空：仅带「对空」的单位可命中升空目标
          hitUnit(E.airborneAt(b, e.pos), 1, E.enemyAtk(b, e));
        } else if (e.pos >= 3) {
          breach(b, e);
        } else {
          advanceEnemy(b, e);
        }
        break;
      }
      case 'advance': {
        if (unit) {
          hitUnit(unit, 1, e.atkZeroTurn === b.turn ? 0 : E.enemyAtk(b, e));
        } else {
          advanceEnemy(b, e);
        }
        break;
      }
      case 'breach': {
        if (unit) hitUnit(unit, 1, e.atkZeroTurn === b.turn ? 0 : E.enemyAtk(b, e));
        else breach(b, e);
        break;
      }
      case 'defend': {
        addStatus(b, e, '护盾', 4 + ((e.affixes || []).indexOf('A02') >= 0 ? 2 : 0));
        E.log(b, 'enemy', '「' + e.name + '」凝甲自守，获得护盾。');
        break;
      }
      case 'status': {
        const target = E.unitAt(b, e.pos) || b.units[0];
        if (target) {
          if (!(rm.immuneControl && (it.status === '缠绕' || it.status === '土牢'))) {
            addStatus(b, target, it.status || '冻缓', 1);
            E.log(b, 'enemy', '「' + e.name + '」施法，' + target.name + '获得 1 层' + (it.status || '冻缓') + '。');
          }
        }
        break;
      }
      case 'summon': {
        const cap = e.boss ? 3 : e.elite ? 2 : (e.specials.indexOf('summonCap2') >= 0 ? 2 : 1);
        const owned = b.enemies.filter((x) => x.hp > 0 && x.summoned).length;
        if (owned < cap) {
          const name = e.specials.indexOf('summonSmall') >= 0 ? '小蠪' : e.specials.indexOf('summonStrong') >= 0 ? '鹿影' : '鹿影';
          const hp = e.specials.indexOf('summonStrong') >= 0 ? 8 : e.specials.indexOf('summonSmall') >= 0 ? 5 : 6;
          const atk = e.specials.indexOf('summonStrong') >= 0 ? 5 : e.specials.indexOf('summonSmall') >= 0 ? 5 : 3;
          const token = {
            uid: SH.util.uid('e'), defId: 'TOKEN', name: name, element: e.element,
            maxHp: hp, hp: hp, atkBase: atk, advanceBase: 1, advanceBuff: 0, atkBuff: 0,
            pos: e.pos < 3 ? e.pos + 1 : e.pos, statuses: {}, intent: { type: 'attack', value: atk },
            phaseIdx: 0, specials: [], affixes: [], summoned: true, elite: false, boss: false, turnCount: 0
          };
          const free = [1, 2, 3].find((p) => !E.enemyAt(b, p) && p !== e.pos);
          if (free) {
            token.pos = free;
            b.enemies.push(token);
            E.log(b, 'enemy', '「' + e.name + '」召唤了「' + name + '」。');
          } else {
            addStatus(b, e, '护盾', 3);
          }
        }
        break;
      }
      case 'charge': {
        e.charged = true;
        E.log(b, 'enemy', '「' + e.name + '」开始蓄力……');
        break;
      }
      default:
        advanceEnemy(b, e);
    }
  }

  E.endTurn = function (b, run) {
    if (b.over) return { ok: false };
    if (b.phase !== 'player') return { ok: false, reason: '阶段错误' };
    b.phase = 'enemyEnd';
    b.stats.turns = b.turn;

    // 1. 异兽自动攻击（格位 1→3）
    for (let pos = 1; pos <= 3; pos++) {
      const u = E.blockerAt(b, pos);
      if (!u || u.sick || u.airborne) continue;
      const e = E.enemyAt(b, pos);
      if (!e) continue;
      E.unitAttack(b, run, u, e);
      if (b.over) break;
    }

    // 2. 玩家回合结束效果（单位 → 遗物 → 地形 → 状态）
    b.units.slice().forEach((u) => fire(b, run, u, 'onTurnEnd', {}));
    // P6 S18：升空持续到下一个玩家回合结束（躲过一次敌方回合）
    b.units.slice().forEach((u) => {
      if (u.airborne && (u.airTurn || 0) < b.turn) {
        removeStatus(u, '升空');
        u.airborne = false;
        E.log(b, 'sys', '「' + u.name + '」落回荒痕。');
      }
    });
    relicFire(b, run, 'turnEnd', {});
    b.statics.forEach((st) => {
      if (st.kind === 'turnEndDrawDiscard') {
        E.drawCards(b, st.v);
        for (let i = 0; i < (st.d || 1) && b.hand.length; i++) b.discard.push(Object.assign(b.hand.pop(), { face: 'tame' }));
      }
      if (st.kind === 'enemyBurn') {
        E.livingEnemies(b).forEach((e) => {
          e.hp -= st.v;
          if (e.hp <= 0) killEnemy(b, run, e);
        });
        E.log(b, 'sys', '地形灼烧，敌方全体失去 ' + st.v + ' 点生命。');
      }
    });
    if (b.flags.drumUsed) {
      b.hero.hp -= 3;
      b.flags.drumUsed = false;
      E.log(b, 'relic', '刑天战鼓余响：失去 3 点生命。');
    }
    // 地形：己方格
    const terrainMul = b.statics.some((st) => st.kind === 'terrainDouble') ? 2 : 1;
    for (let pos = 1; pos <= 3; pos++) {
      const t = b.terrain[pos - 1];
      const u = E.blockerAt(b, pos);
      const plus = tPlus(b, pos);
      if (t === '瘴泽' && u) { u.hp -= 1 * terrainMul + plus; if (u.hp <= 0) killUnit(b, run, u); }
      if (t === '熔岩') {
        if (u) { u.hp -= 2 * terrainMul + plus; if (u.hp <= 0) killUnit(b, run, u); }
      }
    }
    b.statics.forEach((st) => {
      if (st.kind === 'frontRegen') {
        const u = E.unitAt(b, 1);
        if (u) u.hp = Math.min(u.maxHp, u.hp + st.v);
      }
    });

    // 3. 灵涌清零
    b.lingyong = 0;
    E.checkEnd(b);
    if (b.over) return { ok: true, over: b.over };

    // 4. 敌方回合
    b.phase = 'enemy';
    const order = b.enemies.slice().filter((e) => e.hp > 0).sort((a, c) => a.pos - c.pos);
    order.forEach((e) => {
      if (b.over) return;
      enemyResolve(b, run, e);
      if (b.hero.hp <= 0) { b.over = 'defeat'; }
    });
    if (b.over) { E.log(b, 'sys', b.over === 'defeat' ? '巡吏力竭，巡荒中止。' : '荒兽尽退。'); return { ok: true, over: b.over }; }

    // 4.5 敌人回合结束：词缀 / 首领持续 / 遗物
    b.enemies.forEach((e) => {
      if (e.hp <= 0 || e.pos < 1 || e.pos > 3) return;
      const u = E.unitAt(b, e.pos);
      const aff = e.affixes || [];
      if (u && (aff.indexOf('A01') >= 0 || aff.indexOf('A11') >= 0)) {
        u.hp -= 1;
        E.log(b, 'enemy', '「' + e.name + '」' + (aff.indexOf('A01') >= 0 ? '瘴气' : '毒雾') + '侵蚀「' + u.name + '」。');
        if (u.hp <= 0) killUnit(b, run, u);
      }
      if (u && aff.indexOf('A12') >= 0) {
        u.hp -= 2;
        E.log(b, 'enemy', '「' + e.name + '」熔岩灼身，「' + u.name + '」失去 2 生命。');
        if (u.hp <= 0) killUnit(b, run, u);
      }
      if (aff.indexOf('A05') >= 0) e.hp = Math.min(e.maxHp, e.hp + 3);
      if (aff.indexOf('A14') >= 0 && b.turn % 3 === 0) {
        b.units.slice().forEach((x) => {
          x.hp -= 2;
          if (x.hp <= 0) killUnit(b, run, x);
        });
        E.log(b, 'enemy', '雷罚：全体异兽受到 2 点伤害。');
      }
      if (e.specials.indexOf('regentoken') >= 0) e.hp = Math.min(e.maxHp, e.hp + 2);
      // 首领阶段持续效果
      if (e.specials.indexOf('heroDot2') >= 0) {
        b.hero.hp -= 2;
        E.log(b, 'enemy', '毒雾侵体，巡吏失去 2 点生命。');
      }
      if (e.specials.indexOf('aoeUnits2') >= 0) {
        b.units.slice().forEach((x) => { x.hp -= 2; if (x.hp <= 0) killUnit(b, run, x); });
        E.log(b, 'enemy', '荒兽肆虐，全体异兽失去 2 点生命。');
      }
    });
    relicFire(b, run, 'enemyTurnEnd', {});
    b.enemies.forEach((e) => { e.guardUsedThisTurn = false; });
    E.checkEnd(b);
    if (b.over) { E.log(b, 'sys', b.over === 'defeat' ? '巡吏力竭，巡荒中止。' : '荒兽尽退。'); return { ok: true, over: b.over }; }

    // 5. 状态结算
    E.statusTick(b, run);

    // 6. 回合推进
    b.turn += 1;
    b.phase = 'player';
    b.summonsThisTurn = 0;
    b.hero.shield = 0;
    b.flags.cheap = 0;
    b.flags.cheapValue = 0;
    b.flags.silenced = false;
    b.flags.feralSelfHalf = false;
    b.flags.chainDrawTurn = {};
    b.chainExtra = 0;
    b.chainNoLimit = false;
    b.chainSelfDamage = 0;
    b.drawnThisTurn = 0;
    b.turnCardsPlayed = 0;
    b.flags.tameCheap = 0;
    b.flags.spellCheap = 0;
    b.flags.feralAtkBonus = 0;
    b.units.forEach((u) => {
      if (u.atkMultBase) { u.atk = u.atkMultBase; u.atkMultBase = 0; }
      if (u.drumBuff) { u.atk = Math.max(0, u.atk - u.drumBuff); u.drumBuff = 0; }
      if (u.sickTurns > 0) u.sickTurns -= 1;
      u.sick = (u.sickTurns || 0) > 0;
      u.movedTurn = 0;
      u.flags.qiOnce = false;
    });
    // 遗物每回合维持
    const rm = relicMods(run);
    if (rm.upkeepLose) {
      b.hero.hp -= rm.upkeepLose;
      E.log(b, 'relic', '噬灵铃：每回合开始失去 ' + rm.upkeepLose + ' 点生命。');
      E.checkEnd(b);
      if (b.over) return { ok: true, over: b.over };
    }
    b.qi = b.qiMax;
    b.chain = { elem: null, count: 0 };

    // 地形 / 持续效果：玩家回合开始
    b.statics.forEach((st) => {
      if (st.kind === 'qiMaxPerTurn') {
        if (b.qiMax < (st.cap || 99) + ((SH.HERO_BY_ID[run.heroId] || {}).qi || 0)) {
          b.qiMax += st.v;
          b.qi = b.qiMax;
          E.log(b, 'sys', '灵气上限 +' + st.v + '（当前 ' + b.qiMax + '）。');
        }
      }
      if (st.kind === 'healTurn') b.hero.hp = Math.min(b.hero.maxHp, b.hero.hp + st.v);
      if (st.kind === 'shieldTurn') b.hero.shield += st.v;
      if (st.kind === 'qiOnce') {
        b.flags.qiOnceCount = (b.flags.qiOnceCount || 0) + 1;
        if (b.flags.qiOnceCount <= (st.cap || 1)) {
          b.qi = Math.min(b.qiMax, b.qi + st.v);
          E.log(b, 'sys', '灵泉涌动，灵气 +' + st.v + '。');
        }
      }
    });
    if (rm.turnStartDrawOnce && !b.flags.turnStartDrawUsed) {
      b.flags.turnStartDrawUsed = true;
      E.drawCards(b, 1);
      E.log(b, 'relic', '风铃：额外抽 1 张牌。');
    }
    if (rm.turnStartHealOnce) b.hero.hp = Math.min(b.hero.maxHp, b.hero.hp + rm.turnStartHealOnce);
    // P6：延迟回复（石敢当·施术）
    if (b.flags.delayHeal) {
      const v = b.flags.delayHeal;
      b.flags.delayHeal = 0;
      b.hero.hp = Math.min(b.hero.maxHp, b.hero.hp + v);
      E.log(b, 'sys', '石甲余温：巡吏回复 ' + v + ' 点生命。');
    }
    if (rm.turnStartDiscount) {
      for (let i = 0; i < Math.min(rm.turnStartDiscount, b.hand.length); i++) b.hand[i].flipDiscountTurn = b.turn;
    }
    relicFire(b, run, 'turnStart', {});
    b.units.slice().forEach((u) => fire(b, run, u, 'onStartTurn', {}));
    E.drawCards(b, Math.max(1, R.drawPerTurn + (b.drawPenalty || 0)));
    E.rollIntents(b, run);
    E.checkEnd(b);
    return { ok: true, over: b.over };
  };

  /* ---------------- 状态结算 ---------------- */
  E.statusTick = function (b, run) {
    const mul = b.statics.some((st) => st.kind === 'terrainDouble') ? 2 : 1;
    // 敌方：灼烧 / 中毒 / 再生 / 地形 / 层数衰减
    b.enemies.forEach((e) => {
      if (e.hp <= 0) return;
      const burn = stOf(e, '灼烧');
      if (burn > 0) {
        const d = burn * 2;
        e.hp -= d;
        E.log(b, 'sys', '「' + e.name + '」灼烧发作，失去 ' + d + ' 点生命。');
        if (e.hp <= 0) { e.hp = 0; E.log(b, 'sys', '「' + e.name + '」被灼烧焚尽。'); }
      }
      const poison = stOf(e, '中毒');
      if (poison > 0) {
        e.hp -= poison;
        E.log(b, 'sys', '「' + e.name + '」中毒，失去 ' + poison + ' 点生命。');
        if (e.hp <= 0) e.hp = 0;
      }
      const regen = stOf(e, '再生');
      if (regen > 0) e.hp = Math.min(e.maxHp, e.hp + regen);
      const t = b.terrain[e.pos - 1];
      if (t === '毒雾' && e.pos > 0) {
        e.hp -= 1 * mul + tPlus(b, e.pos);
        addStatus(b, e, '冻缓', 1);
        if (e.hp <= 0) e.hp = 0;
      }
      if (t === '熔岩' && e.pos > 0) {
        e.hp -= 2 * mul + tPlus(b, e.pos);
        if (e.hp <= 0) e.hp = 0;
      }
      Object.keys(e.statuses || {}).forEach((k) => {
        const st = e.statuses[k];
        if (k === '护盾') return;
        st.t -= 1;
        if (st.t <= 0) delete e.statuses[k];
      });
    });
    // 己方：中毒 / 再生 / 灵泉 / 层数衰减
    b.units.forEach((u) => {
      const poison = stOf(u, '中毒');
      if (poison > 0) {
        u.hp -= poison;
        E.log(b, 'sys', '「' + u.name + '」中毒，失去 ' + poison + ' 点生命。');
        if (u.hp <= 0) killUnit(b, run, u);
      }
      const regen = stOf(u, '再生');
      if (regen > 0) u.hp = Math.min(u.maxHp, u.hp + regen);
      if (b.terrain[u.pos - 1] === '灵泉') u.hp = Math.min(u.maxHp, u.hp + 1 * mul + tPlus(b, u.pos));
      Object.keys(u.statuses || {}).forEach((k) => {
        const st = u.statuses[k];
        // 护盾不衰减；升空按「下个玩家回合结束」落地，不随通用计时器扣除
        if (k === '护盾' || k === '升空') return;
        st.t -= 1;
        if (st.t <= 0) delete u.statuses[k];
      });
    });
    E.checkEnd(b);
  };

  /* ---------------- 异兽攻击 ---------------- */
  E.unitAttack = function (b, run, u, e) {
    const kit = u.kit || makeKit();
    const hits = Math.max(1, kit.hits || 1);
    const rm = relicMods(run);
    let flat = (kit.elementBonus && kit.elementBonus[u.element]) || 0;
    flat += rm.elementBonus[u.element] || 0;
    for (let i = 0; i < hits; i++) {
      if (e.hp <= 0) break;
      const res = E.computeDamage(b, {
        raw: E.unitAtk(b, u),
        element: u.element,
        flat: flat,
        weak: stOf(u, '虚弱'),
        counterFlat: kit.counterBonus || 0 + (b.statics.some((st) => st.kind === 'counterBonus') ? 0 : 0)
      }, e);
      const dealt = applyToEnemy(b, e, res.dmg, { ignoreShield: e.specials.indexOf('armorPierce') >= 0 });
      E.log(b, 'player', '「' + u.name + '」' + (hits > 1 ? '第 ' + (i + 1) + ' 段' : '') + '攻击「' + e.name + '」，造成 ' + dealt + ' 点伤害' + (res.countered ? '（相克 ×1.5）' : '') + '。');
      if (res.countered && e.hp > 0) {
        addStatus(b, e, SH.COUNTER_STATUS[u.element], 1, kit.statusCap[SH.COUNTER_STATUS[u.element]] || 0);
        relicFire(b, run, 'counter', { targetEnemy: e, element: u.element });
        if (rm.counterDrawOnce && b.flags.counterDrawTurn !== b.turn) {
          b.flags.counterDrawTurn = b.turn;
          E.drawCards(b, rm.counterDrawOnce);
        }
        if (rm.counterAoeOnce && b.flags.counterAoeTurn !== b.turn) {
          b.flags.counterAoeTurn = b.turn;
          E.livingEnemies(b).forEach((x) => damageEnemy(b, run, x, rm.counterAoeOnce, { element: '无', sourceName: '白虎爪' }));
        }
      }
      b.statics.forEach((st) => {
        if (st.kind === 'attackStatus' && e.hp > 0) addStatus(b, e, st.s, st.v);
      });
      if ((e.affixes || []).indexOf('A06') >= 0 || e.specials.indexOf('thorns') >= 0) {
        u.hp -= 2;
        E.log(b, 'enemy', '「' + e.name + '」反震，「' + u.name + '」失去 2 点生命。');
        if (u.hp <= 0) { killUnit(b, run, u); break; }
      }
    }

    if (e.hp <= 0) {
      runOps(b, run, u, kit.onKill, { targetEnemy: e });
      E.log(b, 'sys', '「' + e.name + '」被击溃。');
      if ((e.affixes || []).indexOf('A16') >= 0 && !e.copied) {
        e.copied = true;
        const free = [1, 2, 3].find((p) => !E.enemyAt(b, p) && p !== e.pos);
        if (free) {
          b.enemies.push({
            uid: SH.util.uid('e'), defId: e.defId, name: e.name + '·半', element: e.element,
            maxHp: Math.max(1, Math.round(e.maxHp / 2)), hp: Math.max(1, Math.round(e.maxHp / 2)),
            atkBase: e.atkBase, advanceBase: e.advanceBase, advanceBuff: 0, atkBuff: 0,
            pos: free, statuses: {}, intent: { type: 'attack', value: e.atkBase }, phaseIdx: 0,
            specials: e.specials, affixes: e.affixes, copied: true, elite: false, boss: false, turnCount: 0
          });
          E.log(b, 'enemy', '「' + e.name + '」分裂出一个半血复制。');
        }
      }
      killEnemy(b, run, e);
    }
    // 攻击后触发
    runOps(b, run, u, kit.onAttack, { targetEnemy: e });
    if (u.hp <= 0) killUnit(b, run, u);
    E.checkEnd(b);
  };

  /* ---------------- 结束判定 ---------------- */
  E.checkEnd = function (b) {
    if (b.over) return b.over;
    // 新手教学：本场不会失败，生命最低保留 1 点（P4 32.3）
    if (b.tutorialSafe && b.hero.hp <= 0) {
      b.hero.hp = 1;
      if (b.flags && !b.flags.tutorialSaved) {
        b.flags.tutorialSaved = true;
        E.log(b, 'sys', '教学护佑：巡吏生命保留 1 点，本场不会失败。');
      }
    }
    if (b.hero.hp <= 0) {
      b.hero.hp = 0;
      b.over = 'defeat';
      E.log(b, 'sys', '巡吏力竭，巡荒中止。');
      return b.over;
    }
    const alive = b.enemies.filter((e) => e.hp > 0 && e.pos < 4);
    if (!alive.length) {
      b.over = 'victory';
      E.log(b, 'sys', '荒野寂静，巡荒告捷。');
    }
    return b.over;
  };
})(typeof window !== 'undefined' ? window : globalThis);
