/* ==========================================================================
 * 经济 / 成长 / 评分 / 贷款 / 卡牌评级
 * ========================================================================== */
(function (root) {
  'use strict';
  const CS = (root.CS = root.CS || {});
  const C = CS.CONTENT;
  const I = CS.INDEX;
  const U = CS.Util;

  /* ------------------------------ 财务流水 ------------------------------ */
  const Ledger = CS.Ledger = {};
  Ledger.add = function (G, category, amount, desc, meta) {
    const tx = {
      id: 'tx' + (G.nextTxId = (G.nextTxId || 1) + 1),
      day: G.clock.day,
      minute: G.clock.minute,
      category, amount, desc, meta: meta || null
    };
    G.ledger.push(tx);
    if (G.ledger.length > 2000) G.ledger.shift();
    return tx;
  };

  Ledger.sum = function (G, day) {
    const out = {
      revenue: 0, cardRevenue: 0, gameRevenue: 0, purchase: 0, freight: 0, wage: 0,
      rent: 0, power: 0, repair: 0, loanInterest: 0, grading: 0, other: 0,
      income: 0, expense: 0, net: 0
    };
    for (const t of G.ledger) {
      if (t.day !== day) continue;
      if (t.amount > 0) out.income += t.amount; else out.expense += -t.amount;
      if (out[t.category] != null) out[t.category] += Math.abs(t.amount);
    }
    out.net = out.income - out.expense;
    out.profit = out.revenue + out.cardRevenue + out.gameRevenue -
      (out.purchase + out.freight + out.wage + out.rent + out.power + out.repair + out.loanInterest + out.grading);
    return out;
  };

  Ledger.today = (G) => Ledger.sum(G, G.clock.day);

  /* ------------------------------ 店铺成长 ------------------------------ */
  const Progression = CS.Progression = {};

  Progression.xpToNext = function (G) {
    const t = C.xp.table;
    const lv = G.progression.level;
    if (lv - 1 < t.length) return t[lv - 1];
    return Math.round(t[t.length - 1] * Math.pow(1.12, lv - t.length));
  };

  Progression.addXp = function (G, amount) {
    if (!amount) return [];
    const ups = [];
    G.progression.xp += amount;
    G.progression.lifetimeXp = (G.progression.lifetimeXp || 0) + amount;
    G.today.xpGained += amount;
    let guard = 0;
    while (G.progression.xp >= Progression.xpToNext(G) && guard++ < 50) {
      G.progression.xp -= Progression.xpToNext(G);
      G.progression.level += 1;
      G.progression.expansionCredits += C.economy.expansionPerLevel;
      G.progression.levelsGained += 1;
      ups.push(G.progression.level);
    }
    return ups;
  };

  /* 销售利润 → 经验（每 20 元有效利润 = 1 经验） */
  Progression.addProfit = function (G, profit) {
    G.progression.profitTotal += profit;
    const target = Math.floor(G.progression.profitTotal / C.xp.perProfit);
    const delta = target - G.progression.xpFromProfit;
    if (delta > 0) {
      G.progression.xpFromProfit = target;
      return Progression.addXp(G, delta);
    }
    return [];
  };

  Progression.receptionXp = function (G, npc) {
    if (npc.special) return CS.Rng.int(G, C.xp.specialReception[0], C.xp.specialReception[1]);
    return C.xp.reception;
  };

  /* ------------------------------ 评分与知名度 ------------------------------ */
  const Rating = CS.Rating = {};

  Rating.currentScore = function (G) {
    const from = G.clock.day - C.economy.reviewWindowDays + 1;
    const rs = G.rating.reviews.filter(r => r.day >= from && r.valid !== false);
    if (!rs.length) return G.rating.score;
    let s = 0;
    for (const r of rs) s += r.score;
    return s / rs.length;
  };

  Rating.pushReview = function (G, review) {
    G.rating.reviews.push(review);
    if (G.rating.reviews.length > 600) G.rating.reviews.shift();
    const score = Rating.currentScore(G);
    G.rating.score = Math.round(score * 10) / 10;
    G.today.reviews += 1;
    G.today.reviewSum += review.score;
    return G.rating.score;
  };

  Rating.addFame = function (G, amount, days, source) {
    G.rating.fameEvents.push({
      amount, startDay: G.clock.day, endDay: G.clock.day + days, source
    });
    Rating.refreshFame(G);
  };

  Rating.refreshFame = function (G) {
    let sum = 0;
    const now = G.clock.day;
    G.rating.fameEvents = G.rating.fameEvents.filter(e => e.endDay > now);
    for (const e of G.rating.fameEvents) {
      const left = (e.endDay - now) / Math.max(1, e.endDay - e.startDay);
      sum += e.amount * U.clamp(left, 0, 1);
    }
    G.rating.fame = Math.round(U.clamp(sum + (G.rating.fameFloor || 0), 0, C.economy.fameMax));
  };

  Rating.stars = function (score) {
    return Math.round((score / 100) * 5 * 10) / 10;
  };

  /* ------------------------------ 贷款 ------------------------------ */
  const Loans = CS.Loans = {};

  Loans.creditMul = function (G) {
    for (const row of C.loans.creditMul) if (G.rating.score >= row.min) return row.mul;
    return 0.7;
  };

  Loans.limit = function (G, kind) {
    const cfg = C.loans[kind];
    const mul = Loans.creditMul(G);
    if (kind === 'official') {
      const base = cfg.baseLimit + cfg.perLevel * (G.progression.level - 5);
      return Math.max(0, Math.round(base * mul));
    }
    const official = C.loans.official;
    const base = official.baseLimit + official.perLevel * (G.progression.level - 5);
    return Math.max(0, Math.round(base * mul * cfg.limitMul));
  };

  Loans.outstanding = function (G) {
    return G.loans.reduce((a, l) => a + (l.balance > 0 ? l.balance : 0), 0);
  };

  Loans.hasOverdue = function (G) {
    return G.loans.some(l => l.overdue && l.balance > 0);
  };

  Loans.borrow = function (G, kind, amount) {
    const cfg = C.loans[kind];
    if (G.progression.level < cfg.unlockLevel) return { ok: false, reason: '需要店铺 ' + cfg.unlockLevel + ' 级' };
    if (Loans.hasOverdue(G)) return { ok: false, reason: '存在逾期贷款，暂停新贷款' };
    const limit = Loans.limit(G, kind) - Loans.outstanding(G);
    if (amount <= 0) return { ok: false, reason: '金额无效' };
    if (amount > limit) return { ok: false, reason: '超出可贷额度（剩余 ' + U.money(limit) + '）' };
    const loan = {
      id: 'L' + (G.nextLoanId++),
      kind,
      name: cfg.name,
      principal: amount,
      balance: amount,
      rate: cfg.dailyRate,
      startDay: G.clock.day,
      dueDay: G.clock.day + cfg.termDays,
      nextPayDay: G.clock.day + (cfg.repayEveryDays || 0),
      overdue: false,
      overdueDays: 0,
      paid: 0
    };
    G.loans.push(loan);
    G.money += amount;
    Ledger.add(G, 'other', amount, '贷款放款·' + cfg.name, { loan: loan.id });
    return { ok: true, loan };
  };

  Loans.repay = function (G, loanId, amount) {
    const loan = G.loans.find(l => l.id === loanId);
    if (!loan) return { ok: false, reason: '贷款不存在' };
    const pay = Math.min(amount, loan.balance, G.money);
    if (pay <= 0) return { ok: false, reason: '资金不足' };
    loan.balance -= pay;
    loan.paid += pay;
    G.money -= pay;
    Ledger.add(G, 'other', -pay, '还款·' + loan.name, { loan: loan.id });
    if (loan.balance <= 0.5) {
      loan.balance = 0;
      loan.closed = true;
      loan.overdue = false;
    }
    return { ok: true, paid: pay, loan };
  };

  /* 日结：计息、官方贷款 7 日自动还款、逾期罚息 */
  Loans.settleDaily = function (G) {
    const notes = [];
    const day = G.clock.day;
    for (const loan of G.loans) {
      if (loan.balance <= 0) continue;
      const cfg = C.loans[loan.kind];
      const interest = loan.balance * loan.rate;
      let paidInterest = Math.min(interest, G.money);
      if (paidInterest > 0) {
        G.money -= paidInterest;
        Ledger.add(G, 'loanInterest', -paidInterest, '利息·' + loan.name, { loan: loan.id });
      }
      const unpaid = interest - paidInterest;
      if (unpaid > 0.01) {
        loan.balance += unpaid;
        notes.push(loan.name + ' 利息 ' + U.money(unpaid) + ' 因资金不足滚入本金');
      }

      /* 官方贷款：每 7 个经营日自动还款一次 */
      if (loan.kind === 'official' && loan.nextPayDay && day >= loan.nextPayDay) {
        const periodsLeft = Math.max(1, Math.ceil((loan.dueDay - day) / cfg.repayEveryDays));
        const due = Math.ceil(loan.balance / periodsLeft);
        const pay = Math.min(due, G.money, loan.balance);
        if (pay > 0) {
          loan.balance -= pay;
          loan.paid += pay;
          G.money -= pay;
          Ledger.add(G, 'other', -pay, '定期还款·' + loan.name, { loan: loan.id });
        }
        loan.nextPayDay = day + cfg.repayEveryDays;
        if (loan.balance <= 0.5) { loan.balance = 0; loan.closed = true; }
      }

      /* 逾期 */
      if (loan.balance > 0 && day > loan.dueDay + cfg.graceDays) {
        loan.overdue = true;
        loan.overdueDays += 1;
        const penalty = loan.balance * cfg.penaltyRate;
        loan.balance += penalty;
        notes.push(loan.name + ' 逾期第 ' + loan.overdueDays + ' 天，罚息 ' + U.money(penalty));
      }
    }
    return notes;
  };

  /* ------------------------------ 卡牌与评级 ------------------------------ */
  const Cards = CS.Cards = {};

  Cards.defsByTier = function (tier, ip) {
    return (CS.CARDS || []).filter(c => c.tier === tier && (!ip || c.ip === ip));
  };

  Cards.ipPool = function (ip) {
    return (CS.CARDS || []).filter(c => !ip || c.ip === ip);
  };

  Cards.valueBase = (tier) => C.rarity.value[tier] || 1;

  Cards.valueOf = function (card) {
    const base = Cards.valueBase(card.tier);
    const mul = card.grade ? (C.grading.gradeMul[card.grade] || 1) : 1;
    return Math.round(base * mul);
  };

  Cards.ipMeta = function (ip) {
    return (C.ips || []).find(i => i.id === ip) || null;
  };

  Cards.rollTier = function (G, weights) {
    const table = weights || C.rarity.packWeights;
    const entries = C.rarity.order.map(t => ({ tier: t, w: table[t] || 0 }));
    entries.sort((a, b) => b.w - a.w);
    const total = entries.reduce((a, e) => a + e.w, 0);
    let r = CS.Rng.next(G) * total;
    for (const e of entries) {
      r -= e.w;
      if (r <= 0) return e.tier;
    }
    return 'N';
  };

  Cards.add = function (G, def, opts) {
    const card = {
      id: 'c' + (G.nextCardId++),
      defId: def.id,
      name: def.name,
      nameEn: def.nameEn,
      tier: def.tier,
      img: def.img,
      series: def.series,
      ip: def.ip || 'pokemon',
      ipName: def.ipName || '宝可梦',
      ipOrder: def.ipOrder || 1,
      location: 'binder',
      facilityId: null,
      price: 0,
      grade: 0,
      gradeInst: null,
      gradeDay: null,
      reservedBy: null,
      history: [{ day: G.clock.day, event: '获得' }]
    };
    G.cards.push(card);
    return card;
  };

  Cards.openPack = function (G, sku) {
    const p = I.products[sku];
    if (!p || !p.pack) return { ok: false, reason: '该商品不是卡包' };
    const ip = p.pack.ip || null;
    const ipPool = Cards.ipPool(ip);
    let taken = false;
    for (const f of CS.Inv.shelves(G)) {
      if ((f.stock[sku] || 0) > 0) { CS.Inv.takeFromShelf(G, f, sku, 1); taken = true; break; }
    }
    if (!taken) {
      if ((G.inventory.warehouse[sku] || 0) > 0) { CS.Inv.takeFromWarehouse(G, sku, 1); taken = true; }
    }
    if (!taken) return { ok: false, reason: '没有可拆的卡包库存' };

    const out = [];
    const used = new Set();
    const fresh = (arr) => arr.filter(c => !used.has(c.id));
    for (let i = 0; i < p.pack.cards; i++) {
      const tier = Cards.rollTier(G, p.pack.weights);
      let pool = fresh(Cards.defsByTier(tier, ip));
      if (!pool.length && ip) pool = fresh(ipPool);
      if (!pool.length && !ip) pool = fresh(Cards.defsByTier(tier));
      if (!pool.length) pool = ipPool.length ? ipPool : (CS.CARDS || []);
      const def = pool.length ? CS.Rng.pick(G, pool) : null;
      if (!def) break;
      used.add(def.id);
      out.push(Cards.add(G, def));
    }
    return { ok: true, cards: out, ip: ip || null };
  };

  Cards.listOnTable = function (G, facilityId, cardId, price) {
    const f = G.facilities.find(x => x.id === facilityId);
    if (!f) return { ok: false, reason: '卡牌桌不存在' };
    const def = I.facilities[f.typeId];
    if (!def || def.kind !== 'cardtable') return { ok: false, reason: '不是卡牌桌' };
    if (f.cards.length >= (def.slots || 8)) return { ok: false, reason: '卡牌桌已满' };
    const card = G.cards.find(c => c.id === cardId);
    if (!card || card.location !== 'binder') return { ok: false, reason: '卡牌不在卡册中' };
    if (card.reservedBy) return { ok: false, reason: '卡牌被预订' };
    card.location = 'table';
    card.facilityId = facilityId;
    card.price = Math.max(1, Math.round(price));
    card.history.push({ day: G.clock.day, event: '上架 ' + U.money(card.price) });
    f.cards.push(card.id);
    return { ok: true, card };
  };

  Cards.unlist = function (G, cardId) {
    const card = G.cards.find(c => c.id === cardId);
    if (!card || card.location !== 'table') return { ok: false, reason: '该卡未上架' };
    const f = G.facilities.find(x => x.id === card.facilityId);
    if (f) f.cards = f.cards.filter(id => id !== cardId);
    card.location = 'binder';
    card.facilityId = null;
    card.price = 0;
    card.history.push({ day: G.clock.day, event: '下架' });
    return { ok: true, card };
  };

  Cards.setPrice = function (G, cardId, price) {
    const card = G.cards.find(c => c.id === cardId);
    if (!card || card.location !== 'table') return { ok: false, reason: '该卡不在卡牌桌上' };
    card.price = Math.max(1, Math.round(price));
    return { ok: true, card };
  };

  Cards.gradeCost = function (instId, speedId, count) {
    const inst = C.grading.institutions.find(i => i.id === instId);
    const sp = C.grading.speeds.find(s => s.id === speedId);
    if (!inst || !sp) return null;
    const fee = count * inst.perCard * sp.costMul;
    return { fee, freight: inst.freight, total: fee + inst.freight, days: Math.max(1, Math.round(inst.baseDays * sp.timeMul)) };
  };

  Cards.sendToGrading = function (G, cardIds, instId, speedId) {
    if (!cardIds.length) return { ok: false, reason: '没有选择卡牌' };
    if (cardIds.length > C.grading.maxCardsPerOrder) return { ok: false, reason: '单次最多 ' + C.grading.maxCardsPerOrder + ' 张' };
    const cost = Cards.gradeCost(instId, speedId, cardIds.length);
    if (!cost) return { ok: false, reason: '参数错误' };
    if (G.money < cost.total) return { ok: false, reason: '资金不足（需要 ' + U.money(cost.total) + '）' };
    const cards = cardIds.map(id => G.cards.find(c => c.id === id)).filter(Boolean);
    for (const c of cards) {
      if (c.location !== 'binder') return { ok: false, reason: '卡牌 ' + c.name + ' 不在卡册中' };
    }
    const inst = C.grading.institutions.find(i => i.id === instId);
    const sp = C.grading.speeds.find(s => s.id === speedId);
    G.money -= cost.total;
    Ledger.add(G, 'grading', -cost.total, '评级费用·' + inst.name + '/' + sp.name);
    for (const c of cards) {
      c.location = 'grading';
      c.history.push({ day: G.clock.day, event: '送评 ' + inst.name });
    }
    const order = {
      id: 'G' + (G.nextGradingId++),
      instId, instName: inst.name,
      speedId, speedName: sp.name,
      cardIds,
      cost: cost.total,
      submitDay: G.clock.day,
      dueDay: G.clock.day + cost.days,
      status: 'pending'
    };
    G.gradingOrders.push(order);
    return { ok: true, order, cost };
  };

  Cards.settleGrading = function (G) {
    const notes = [];
    for (const order of G.gradingOrders) {
      if (order.status !== 'pending') continue;
      if (G.clock.day < order.dueDay) continue;
      order.status = 'done';
      for (const cid of order.cardIds) {
        const card = G.cards.find(c => c.id === cid);
        if (!card) continue;
        const grade = CS.Rng.int(G, 1, 10);
        card.grade = grade;
        card.gradeInst = order.instName;
        card.gradeDay = G.clock.day;
        card.location = 'binder';
        card.history.push({ day: G.clock.day, event: '评级完成 ' + grade + ' 级' });
        notes.push(card.name + ' 评级结果：' + grade + ' 级（' + order.instName + '）');
      }
    }
    return notes;
  };

  Cards.summary = function (G) {
    const owned = G.cards.filter(c => c.location !== 'sold');
    const graded = owned.filter(c => c.grade > 0);
    return {
      total: owned.length,
      unique: new Set(owned.map(c => c.defId)).size,
      graded: graded.length,
      table: owned.filter(c => c.location === 'table').length,
      grading: owned.filter(c => c.location === 'grading').length,
      value: owned.reduce((a, c) => a + Cards.valueOf(c), 0)
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
