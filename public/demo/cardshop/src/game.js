/* ==========================================================================
 * 游戏循环：时间状态机、开店/打烊、日结算、建造与扩建
 * ========================================================================== */
(function (root) {
  'use strict';
  const CS = (root.CS = root.CS || {});
  const C = CS.CONTENT;
  const I = CS.INDEX;
  const U = CS.Util;
  const Grid = CS.Grid;

  const Game = CS.Game = {};

  Game.message = function (G, kind, text) {
    G.messages.push({ day: G.clock.day, minute: G.clock.minute, kind, text });
    if (G.messages.length > 80) G.messages.shift();
    if (Game.onMessage) Game.onMessage(G.messages[G.messages.length - 1]);
  };

  Game.notifyLevelUp = function (G, levels) {
    for (const lv of levels) {
      Game.message(G, 'level', '店铺升到 ' + lv + ' 级！获得 ' + C.economy.expansionPerLevel + ' 个扩建格额度');
    }
    if (Game.onLevelUp) Game.onLevelUp(levels);
  };

  /* ------------------------------ 时间推进 ------------------------------ */
  Game.tick = function (G, dtReal) {
    if (G.clock.paused) return;
    const st = G.clock.state;
    if (st !== 'OPEN_DAY' && st !== 'OPEN_NIGHT') return;
    const dtRealClamped = Math.min(dtReal, 0.1);
    const dtMin = dtRealClamped * 0.5 * G.clock.speed;
    G.clock.minute += dtMin;

    /* 21:00 夜间决策 */
    if (G.clock.state === 'OPEN_DAY' && G.clock.minute >= C.time.closeTime) {
      G.clock.minute = C.time.closeTime;
      G.clock.state = 'NIGHT_DECISION';
      if (Game.onNightDecision) Game.onNightDecision(G);
      return;
    }
    /* 次日 07:00 结算 */
    if (G.clock.state === 'OPEN_NIGHT' && G.clock.minute >= C.time.dayEnd) {
      G.clock.minute = C.time.dayEnd;
      Game.settleDay(G);
      return;
    }

    Game.spawnDue(G);
    CS.World.reconcileTables(G);
    for (const npc of G.npcs.slice()) {
      if (npc.state === 'GONE') continue;
      CS.World.updateNpc(G, npc, dtMin);
    }
    for (const emp of G.employees) CS.World.updateEmployee(G, emp, dtMin);
    CS.World.updateCounters(G, dtMin);

    G.npcs = G.npcs.filter(n => n.state !== 'GONE');
  };

  Game.spawnDue = function (G) {
    while (G.spawnQueue.length && G.spawnQueue[0].minute <= G.clock.minute) {
      const item = G.spawnQueue.shift();
      const npc = CS.World.spawnNpc(G);
      if (item.typeId) {
        /* 保持随机性：类型由权重已经决定，这里只做记录修正 */
      }
    }
  };

  /* ------------------------------ 开店 / 夜间 ------------------------------ */
  Game.openStore = function (G) {
    if (G.clock.state !== 'PREPARE') return { ok: false, reason: '现在不是准备阶段' };
    const diff = C.difficulty[G.difficulty] || C.difficulty.normal;
    const t = C.traffic;
    const base = t.base + (G.rating.score - 60) * t.perRating + G.rating.fame * t.perFame;
    const trafficBonus = CS.Market.trafficBonus ? CS.Market.trafficBonus(G) : 0;
    const count = U.clamp(Math.round(base * diff.trafficMul * (1 + trafficBonus)), t.min, t.max);
    G.spawnQueue = [];
    const start = C.time.prepStart, end = C.time.closeTime;
    /* 客流按"波次"到店：午餐、放学、傍晚、夜间各一波，峰值更真实，也会形成排队 */
    const waves = [
      { at: 10.0, weight: 0.12 },
      { at: 12.8, weight: 0.20 },
      { at: 15.6, weight: 0.24 },
      { at: 18.2, weight: 0.26 },
      { at: 20.2, weight: 0.18 }
    ];
    const totalW = waves.reduce((a, w) => a + w.weight, 0);
    for (let i = 0; i < count; i++) {
      let r = CS.Rng.next(G) * totalW, w = waves[0];
      for (const cand of waves) { r -= cand.weight; if (r <= 0) { w = cand; break; } }
      const m = U.clamp((w.at * 60) + (CS.Rng.next(G) - 0.5) * 90, start, end - 5);
      G.spawnQueue.push({ minute: m });
    }
    G.spawnQueue.sort((a, b) => a.minute - b.minute);
    G.clock.state = 'OPEN_DAY';
    G.clock.minute = C.time.prepStart;
    G.today.opened = true;
    Game.message(G, 'info', '开始营业：今日预计到店 ' + count + ' 位顾客');
    return { ok: true, count };
  };

  Game.hourWeight = function (minute) {
    const h = (minute / 60) % 24;
    if (h < 10) return 0.25;
    if (h < 12) return 0.5;
    if (h < 14) return 0.7;
    if (h < 17) return 1;
    if (h < 19) return 1.15;
    if (h < 21) return 1;
    return 0.3;
  };

  Game.chooseNight = function (G, continueNight) {
    if (G.clock.state !== 'NIGHT_DECISION') return { ok: false, reason: '现在不是夜间决策点' };
    if (continueNight) {
      G.clock.state = 'OPEN_NIGHT';
      G.clock.night8 = true;
      /* 夜间少量客流 */
      const n = U.clamp(Math.round(2 + G.rating.score / 30), 1, 8);
      for (let i = 0; i < n; i++) {
        G.spawnQueue.push({ minute: C.time.closeTime + CS.Rng.range(G, 0, 240) });
      }
      G.spawnQueue.sort((a, b) => a.minute - b.minute);
      Game.message(G, 'info', '夜间营业开始：参与夜班的正式员工工资翻倍');
      return { ok: true };
    }
    Game.message(G, 'info', '选择不夜营：直接进入次日 07:00 结算');
    Game.settleDay(G);
    return { ok: true };
  };

  /* ------------------------------ 日结算 ------------------------------ */
  Game.flushNpcs = function (G) {
    for (const npc of G.npcs.slice()) {
      if (npc.reviewDone) continue;
      for (const it of npc.basket || []) {
        if (it.kind === 'sku') {
          const f = G.facilities.find(x => x.id === it.facilityId);
          if (f) CS.Inv.addToShelf(G, f, it.sku, 1);
        } else if (it.kind === 'card') {
          const card = G.cards.find(c => c.id === it.cardId);
          if (card) { card.reservedBy = null; if (card.location === 'reserved') card.location = 'table'; }
        }
      }
      npc.basket = [];
      npc.metrics.abandonReason = '打烊';
      CS.World.finishVisit(G, npc, false);
      npc.state = 'GONE';
    }
    G.npcs = [];
  };

  Game.settleDay = function (G) {
    Game.flushNpcs(G);
    const diff = C.difficulty[G.difficulty] || C.difficulty.normal;
    G.clock.state = 'SETTLEMENT';
    const day = G.clock.day;

    /* 1) 成本：租金 / 电费 / 工资 */
    const cellCount = Object.keys(G.cells).length;
    const rent = Math.round(cellCount * C.economy.rentPerCell * diff.rentMul);
    const power = Math.round(cellCount * C.economy.powerPerCell);
    let wage = 0;
    for (const emp of G.employees) {
      if (!emp.onDuty) continue;
      wage += Math.round(emp.wage * diff.wageMul * (G.clock.night8 ? C.nightWageMul : 1));
    }

    G.money -= rent;
    CS.Ledger.add(G, 'rent', -rent, '店铺租金（' + cellCount + ' 格）');
    G.money -= power;
    CS.Ledger.add(G, 'power', -power, '基础电费（' + cellCount + ' 格）');

    let arrearsNote = null;
    if (wage > 0) {
      const pay = Math.min(wage, Math.max(0, G.money));
      if (pay > 0) {
        G.money -= pay;
        CS.Ledger.add(G, 'wage', -pay, '员工工资 ' + G.employees.length + ' 人');
      }
      const rest = wage - pay;
      if (rest > 0) {
        G.wageArrears = (G.wageArrears || 0) + rest;
        arrearsNote = '工资欠款 ' + U.money(G.wageArrears) + '（按日 1% 计息）';
        Game.message(G, 'warn', arrearsNote);
      }
    }
    if (G.wageArrears > 0) {
      const interest = Math.round(G.wageArrears * C.economy.wageArrears.dailyRate);
      G.wageArrears += interest;
      if (G.money >= G.wageArrears) {
        G.money -= G.wageArrears;
        CS.Ledger.add(G, 'wage', -G.wageArrears, '补发工资欠款');
        G.wageArrears = 0;
      }
    }

    /* 2) 贷款结算 */
    const loanNotes = CS.Loans.settleDaily(G);
    for (const n of loanNotes) Game.message(G, 'warn', n);

    /* 3) 设施自然损耗 */
    for (const f of G.facilities) {
      f.durability = Math.max(0, f.durability - C.durability.dailyNaturalLoss);
      if (f.durability < C.durability.failHint && !f.warned) {
        f.warned = true;
        Game.message(G, 'warn', I.facilities[f.typeId].name + ' 耐久偏低（' + Math.round(f.durability) + '%），维修可恢复');
      }
    }

    /* 4) 员工专精（当日确实完成主要任务才 +1，每日一次）+ 士气结算 */
    const si = C.staffInteract || {};
    for (const emp of G.employees) {
      if (emp.completedMainToday && emp.main !== 'idle') {
        emp.spec[emp.main] = (emp.spec[emp.main] || 0) + 1;
      }
      emp.completedMainToday = false;
      const moraleMax = si.moraleMax || 100;
      let morale = emp.morale == null ? (si.moraleStart || 62) : emp.morale;
      if (emp.onDuty) {
        morale -= (si.moraleDailyDecay || 5);
        if (emp.talkedDay === day) morale += (si.moraleChatRecover || 4);
      } else {
        morale += 8;      // 休息日恢复
      }
      emp.morale = U.clamp(morale, 0, moraleMax);
      if (emp.morale < (si.moraleLowLine || 35) && !emp.lowWarned) {
        emp.lowWarned = true;
        Game.message(G, 'warn', emp.name + ' 士气低落（' + Math.round(emp.morale) + '），靠近按 E 聊聊或发奖金');
      } else if (emp.morale >= (si.moraleLowLine || 35)) {
        emp.lowWarned = false;
      }
    }

    /* 5) 评分快照 */
    G.rating.score = Math.round(CS.Rating.currentScore(G) * 10) / 10;
    G.rating.history.push({ day, score: G.rating.score });
    if (G.rating.score > 95) G.rating.highStreak = (G.rating.highStreak || 0) + 1;
    else G.rating.highStreak = 0;
    if (G.rating.highStreak > 7) CS.Rating.addFame(G, 1, 1, '高口碑');

    /* 6) 厂商联动快讯 → 市场 / 厂商 / 评级 */
    const newsList = CS.Market.rollSupplierNews ? CS.Market.rollSupplierNews(G) : [];
    const marketLog = CS.Market.dailyUpdate(G);
    const supplierLog = CS.Market.updateSuppliers(G);
    const gradeNotes = CS.Cards.settleGrading(G);
    for (const n of gradeNotes) Game.message(G, 'card', n);

    /* 7) 知名度衰减 */
    CS.Rating.refreshFame(G);

    /* 8) 日报 */
    const sum = CS.Ledger.sum(G, day);
    const report = {
      day,
      revenue: sum.revenue,
      cardRevenue: sum.cardRevenue,
      gameRevenue: sum.gameRevenue,
      purchase: sum.purchase,
      freight: sum.freight,
      wage,
      rent,
      power,
      repair: sum.repair,
      loanInterest: sum.loanInterest,
      grading: sum.grading,
      other: sum.other,
      income: sum.income,
      expense: sum.expense,
      net: sum.net,
      profit: sum.profit,
      customers: G.today.customers,
      served: G.today.served,
      abandoned: G.today.abandoned,
      itemsSold: G.today.itemsSold,
      xpGained: G.today.xpGained,
      rating: G.rating.score,
      fame: G.rating.fame,
      night: !!G.clock.night8,
      arrears: G.wageArrears || 0,
      market: marketLog,
      suppliers: supplierLog,
      createdAt: Date.now()
    };
    G.reports = G.reports || [];
    G.reports.push(report);
    if (G.reports.length > 60) G.reports.shift();

    /* 周报（每 7 个经营日） */
    if (day % 7 === 0) {
      const last = G.reports.slice(-7);
      const week = {
        day,
        revenue: last.reduce((a, r) => a + r.revenue + r.cardRevenue + (r.gameRevenue || 0), 0),
        expense: last.reduce((a, r) => a + r.expense, 0),
        net: last.reduce((a, r) => a + r.net, 0),
        customers: last.reduce((a, r) => a + r.customers, 0),
        served: last.reduce((a, r) => a + r.served, 0),
        rating: G.rating.score,
        fame: G.rating.fame,
        topSkus: Game.topSkus(G, 7),
        staffEff: G.employees.map(e => ({ name: e.name, main: e.main, eff: Math.round(CS.World.employeeEff(e) * 100) / 100, spec: e.spec[e.main] || 0 }))
      };
      G.weekReports = G.weekReports || [];
      G.weekReports.push(week);
      if (G.weekReports.length > 20) G.weekReports.shift();
    }

    /* 9) 进入下一天 */
    G.stats.daysPlayed += 1;
    if (!G.stats.bestDay || report.net > G.stats.bestDay.net) G.stats.bestDay = { day, net: report.net };

    G.npcs = [];
    G.spawnQueue = [];
    G.clock.day = day + 1;
    G.clock.minute = C.time.prepStart;
    G.clock.state = 'PREPARE';
    G.clock.night8 = false;
    G.today = CS.freshDayStats();
    G.lastReport = report;

    if (G.clock.day === 2) {
      Game.message(G, 'event', '第 2 个经营日：本地新秀交流赛邀请函已送达（赛事系统在完整版实现）');
    }

    if (G.options.autoSave && CS.Save) CS.Save.auto(G, 'settle');
    report.news = newsList.map(n => ({ title: n.title, supplierName: n.supplierName, text: n.text, days: n.days }));
    if (Game.onSettlement) Game.onSettlement(report);
    return report;
  };

  Game.topSkus = function (G, days) {
    const n = days || 7;
    const rows = [];
    for (const p of C.products) {
      let sales = 0;
      const recs = G.market[p.sku].days.slice(-n);
      for (const r of recs) sales += r.rec.sales || 0;
      rows.push({ sku: p.sku, name: p.name, sales });
    }
    return rows.sort((a, b) => b.sales - a.sales).slice(0, 3);
  };

  /* ------------------------------ 建造 / 扩建 ------------------------------ */
  Game.canPlace = function (G, typeId, x, y) {
    const def = I.facilities[typeId];
    if (!def) return { ok: false, reason: '未知设施' };
    if (G.progression.level < def.unlockLevel) return { ok: false, reason: '需要店铺 ' + def.unlockLevel + ' 级' };
    if (G.money < def.price) return { ok: false, reason: '资金不足（需要 ' + U.money(def.price) + '）' };
    for (let dy = 0; dy < def.h; dy++) {
      for (let dx = 0; dx < def.w; dx++) {
        const cx = x + dx, cy = y + dy;
        if (!Grid.isUnlocked(G, cx, cy)) return { ok: false, reason: '需要先扩建这块地板', cx, cy };
        if (Grid.isDoorCell(G, cx, cy)) return { ok: false, reason: '不能挡住店门', cx, cy };
        if (Grid.facilityAt(G, cx, cy)) return { ok: false, reason: '这里已经有设施', cx, cy };
      }
    }
    return { ok: true };
  };

  Game.buyFacility = function (G, typeId, x, y) {
    const def = I.facilities[typeId];
    const check = Game.canPlace(G, typeId, x, y);
    if (!check.ok) return check;
    G.money -= def.price;
    CS.Ledger.add(G, 'other', -def.price, '购买设施·' + def.name);
    const f = CS.createFacility(G, typeId, x, y);
    Game.message(G, 'info', '购买并放置了 ' + def.name + '（-' + U.money(def.price) + '）');
    return { ok: true, facility: f };
  };

  Game.removeFacility = function (G, facilityId) {
    const f = G.facilities.find(x => x.id === facilityId);
    if (!f) return { ok: false, reason: '设施不存在' };
    if (f.isInitial) return { ok: false, reason: '初始设施不可回收' };
    const busy = Game.facilityBusy(G, f);
    if (busy) return { ok: false, reason: busy + '，暂时不能回收' };
    /* 内部库存退回快递站，避免消失 */
    const contents = [];
    for (const sku of Object.keys(f.stock || {})) {
      if (f.stock[sku] > 0) contents.push({ sku, qty: f.stock[sku] });
    }
    if (G.inventory.warehouse) {
      for (const sku of Object.keys(G.inventory.warehouse)) { /* 仓库架回收时把库存放回站台 */ }
    }
    if (contents.length) {
      G.inventory.parcels.push({
        id: 'p' + (G.inventory.nextParcelId++),
        supplier: 'star', contents, arrivedDay: G.clock.day, arrivedMinute: G.clock.minute,
        claim: null, state: 'station'
      });
    }
    G.facilities = G.facilities.filter(x => x.id !== facilityId);
    Game.message(G, 'info', I.facilities[f.typeId].name + ' 已回收（不退款），内部商品回到快递站');
    return { ok: true };
  };

  /* 正在被顾客/员工使用，或排队结账中的设施，不允许回收或挪动 */
  Game.facilityBusy = function (G, f) {
    if (!f) return '设施不存在';
    const def = I.facilities[f.typeId];
    if (def && def.kind === 'gametable' && Array.isArray(f.seats) && f.seats.some(Boolean)) return '有顾客正在游戏桌上对局';
    if (f.service) return '正在进行结账';
    if (f.claim) return '员工正在操作该设施';
    for (const npc of G.npcs) {
      if (npc.state === 'GONE') continue;
      if (npc.state === 'TO_SHELF' && npc.targetShelfId === f.id) return '有顾客正在使用该设施';
      if (npc.state === 'TO_CARD' && npc.targetTableId === f.id) return '有顾客正在使用该设施';
      if ((npc.state === 'TO_TABLE' || npc.state === 'PLAYING') && npc.tableId === f.id) return '有顾客正在使用该设施';
      if (npc.state === 'QUEUE' || npc.state === 'TO_COUNTER') {
        const counter = CS.Inv.counters(G)[0];
        if (counter && counter.id === f.id) return '有顾客正在排队结账';
      }
    }
    return null;
  };

  function entityInRect(G, x, y, w, h) {
    const hit = (ex, ey) => ex > x - 0.18 && ex < x + w + 0.18 && ey > y - 0.18 && ey < y + h + 0.18;
    if (hit(G.player.x, G.player.y)) return '你正站在目标位置上';
    for (const emp of G.employees) if (hit(emp.x, emp.y)) return '员工正站在目标位置上';
    for (const npc of G.npcs) {
      if (npc.state === 'GONE') continue;
      if (hit(npc.x, npc.y)) return '顾客正站在目标位置上';
    }
    return null;
  }

  function hasOrthogonalAccess(G, f) {
    for (let x = f.x; x < f.x + f.w; x++) {
      if (Grid.cellFree(G, x, f.y - 1) || Grid.cellFree(G, x, f.y + f.h)) return true;
    }
    for (let y = f.y; y < f.y + f.h; y++) {
      if (Grid.cellFree(G, f.x - 1, y) || Grid.cellFree(G, f.x + f.w, y)) return true;
    }
    return false;
  }

  Game.canMoveFacility = function (G, facilityId, x, y) {
    const f = G.facilities.find(v => v.id === facilityId);
    if (!f) return { ok: false, reason: '设施不存在' };
    const def = I.facilities[f.typeId];
    if (!def) return { ok: false, reason: '未知设施' };
    x = Math.floor(x); y = Math.floor(y);
    if (x === f.x && y === f.y) return { ok: false, reason: '位置没有变化' };
    const busy = Game.facilityBusy(G, f);
    if (busy) return { ok: false, reason: busy };
    for (let dy = 0; dy < def.h; dy++) {
      for (let dx = 0; dx < def.w; dx++) {
        const cx = x + dx, cy = y + dy;
        if (Grid.isDoorCell(G, cx, cy)) return { ok: false, reason: '不能挡住店门', cx, cy };
        if (!Grid.isUnlocked(G, cx, cy)) return { ok: false, reason: '需要先扩建这块地板', cx, cy };
        const other = Grid.facilityAt(G, cx, cy);
        if (other && other.id !== f.id) return { ok: false, reason: '这里已经有其它设施', cx, cy };
      }
    }
    const blocked = entityInRect(G, x, y, def.w, def.h);
    if (blocked) return { ok: false, reason: blocked };
    /* 功能性设施不能挪到四面都被堵死的位置 */
    if (def.kind !== 'decor') {
      const ox = f.x, oy = f.y;
      f.x = x; f.y = y;
      const access = hasOrthogonalAccess(G, f);
      f.x = ox; f.y = oy;
      if (!access) return { ok: false, reason: '目标位置四周没有可站立的空间' };
    }
    return { ok: true, from: { x: f.x, y: f.y }, to: { x, y } };
  };

  /* 挪动玩家放置的设施：不收费、不改变耐久与内部库存 */
  Game.moveFacility = function (G, facilityId, x, y) {
    const check = Game.canMoveFacility(G, facilityId, x, y);
    if (!check.ok) return check;
    const f = G.facilities.find(v => v.id === facilityId);
    const from = { x: f.x, y: f.y };
    f.x = Math.floor(x);
    f.y = Math.floor(y);
    Game.message(G, 'info', I.facilities[f.typeId].name + ' 已从 (' + from.x + ',' + from.y + ') 挪到 (' + f.x + ',' + f.y + ')');
    return { ok: true, facility: f, from, to: { x: f.x, y: f.y } };
  };

  Game.canExpand = function (G, x, y) {
    if (G.progression.expansionCredits <= 0) return { ok: false, reason: '没有可用的扩建额度' };
    if (Grid.isUnlocked(G, x, y)) return { ok: false, reason: '这块地板已经解锁' };
    const lay = C.layout;
    if (x < 0 || y < 0 || x > lay.cols + 3 || y > lay.rows + 3) return { ok: false, reason: '超出可扩建范围' };
    const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(d => Grid.isUnlocked(G, x + d[0], y + d[1]));
    if (!adj) return { ok: false, reason: '新格子必须与现有地板相邻' };
    if (Object.keys(G.cells).length >= C.economy.floorMaxCells) return { ok: false, reason: '单层最多 ' + C.economy.floorMaxCells + ' 格' };
    return { ok: true };
  };

  Game.expandCell = function (G, x, y) {
    const check = Game.canExpand(G, x, y);
    if (!check.ok) return check;
    G.cells[x + ',' + y] = 1;
    G.progression.expansionCredits -= 1;
    return { ok: true };
  };

  /* ------------------------------ 其他操作 ------------------------------ */
  Game.setPrice = function (G, sku, price) {
    if (!G.products[sku]) return { ok: false, reason: '商品不存在' };
    const v = Math.max(1, Math.round(price));
    G.products[sku].price = v;
    return { ok: true };
  };

  Game.repairFacility = function (G, facilityId) {
    const f = G.facilities.find(x => x.id === facilityId);
    if (!f) return { ok: false, reason: '设施不存在' };
    const def = I.facilities[f.typeId];
    const broken = 1 - f.durability / 100;
    if (broken <= 0.001) return { ok: false, reason: '不需要维修' };
    const cost = Math.round(def.price * broken * C.economy.repairCoeff);
    if (G.money < cost) return { ok: false, reason: '资金不足（需要 ' + U.money(cost) + '）' };
    G.money -= cost;
    CS.Ledger.add(G, 'repair', -cost, '维修·' + def.name);
    f.durability = 100;
    f.warned = false;
    return { ok: true, cost };
  };

  Game.employeesOnDuty = (G) => G.employees.filter(e => e.onDuty).length;

  Game.daySummary = function (G) {
    const s = CS.Ledger.sum(G, G.clock.day);
    return s;
  };

  Game.statistics = function (G) {
    const stockValue = C.products.reduce((a, p) => a + CS.Inv.totalStock(G, p.sku) * G.products[p.sku].costAvg, 0);
    const cardValue = CS.Cards.summary(G).value;
    return {
      money: G.money,
      stockValue: Math.round(stockValue),
      cardValue,
      netWorth: Math.round(G.money + stockValue + cardValue - CS.Loans.outstanding(G)),
      cells: Object.keys(G.cells).length,
      facilities: G.facilities.length,
      staff: G.employees.length,
      customers: G.today.customers,
      served: G.today.served
    };
  };

  /* 供 UI 调用：快速推进到 21:00（调试用） */
  Game.fastForwardToClose = function (G) {
    if (G.clock.state !== 'OPEN_DAY') return { ok: false };
    const guard = 200000;
    let steps = 0;
    while (G.clock.state === 'OPEN_DAY' && steps++ < guard) {
      Game.tick(G, 0.05);
    }
    return { ok: true };
  };
})(typeof window !== 'undefined' ? window : globalThis);
