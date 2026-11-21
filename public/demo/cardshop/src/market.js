/* ==========================================================================
 * 市场服务：六因子定价 + 厂商 7 日生产策略 + 运费与采购价传导
 *
 *  M = 0.30·D + 0.20·S + 0.15·P + 0.15·V + 0.10·T + 0.10·R
 *  r = clamp(0.05 · M, -0.05, +0.05)
 *  P(t+1) = P(t) · (1 + r)
 *
 *  D 市场总体供需差   S 厂商库存与生产   P 玩家采购压力
 *  V 玩家实际销售     T 最近 7 日价格趋势   R 随机波动
 * 六项均映射到 [-1, +1]。
 * ========================================================================== */
(function (root) {
  'use strict';
  const CS = (root.CS = root.CS || {});
  const C = CS.CONTENT;
  const I = CS.INDEX;
  const U = CS.Util;

  const MKT = CS.Market = {};

  /* ------------------------------ 厂商联动快讯（Link） ------------------------------ */
  MKT.activeNews = function (G, supplierId) {
    const day = G.clock.day;
    return (G.supplierNews || []).filter(n =>
      n.endDay >= day && (!supplierId || n.supplierId === supplierId));
  };

  /* 汇总某厂商当前所有快讯的乘区 */
  MKT.newsEffects = function (G, supplierId) {
    const out = { costMul: 1, freightMul: 1, capacityMul: 1, demandMul: 1, marketMul: 1 };
    for (const n of MKT.activeNews(G, supplierId)) {
      const e = n.effects || {};
      for (const k of Object.keys(out)) if (e[k] != null) out[k] *= e[k];
    }
    return out;
  };

  MKT.demandMulFor = function (G, sku) {
    const p = I.products[sku];
    if (!p) return 1;
    return MKT.newsEffects(G, p.supplier).demandMul;
  };

  MKT.trafficBonus = function (G) {
    let bonus = 0;
    for (const n of MKT.activeNews(G)) if (n.effects && n.effects.trafficBonus) bonus += n.effects.trafficBonus;
    return U.clamp(bonus, -0.3, 0.35);
  };

  MKT.pickNewsEvent = function (G) {
    const list = (C.supplierNews && C.supplierNews.events) || [];
    return CS.Rng.weighted(G, list, e => e.weight) || null;
  };

  /* 每日结算：过期清理 + 新快讯生成 + 立即生效的效果 */
  MKT.rollSupplierNews = function (G) {
    const cfg = C.supplierNews || {};
    const day = G.clock.day;
    const fresh = [];
    /* 过期 */
    G.supplierNews = (G.supplierNews || []).filter(n => n.endDay >= day);
    if (G.supplierNews.length >= (cfg.maxActive || 14)) return fresh;

    for (const sup of C.suppliers) {
      if ((G.supplierNews || []).filter(n => n.supplierId === sup.id).length >= 2) continue;
      if (CS.Rng.next(G) > (cfg.dailyChancePerSupplier || 0.42)) continue;
      const ev = MKT.pickNewsEvent(G);
      if (!ev) continue;
      const span = ev.days || [2, 3];
      const days = CS.Rng.int(G, span[0], span[1]);
      const effects = Object.assign({}, ev.effects || {});
      const st = G.suppliers[sup.id];
      /* 立即效果：库存增减、知名度 */
      if (effects.stockBoost) {
        const skus = C.products.filter(p => p.supplier === sup.id).map(p => p.sku);
        if (skus.length) {
          const sku = CS.Rng.pick(G, skus);
          const delta = Math.round(effects.stockBoost * CS.Rng.range(G, 0.7, 1.3));
          st.stock[sku] = Math.max(0, (st.stock[sku] || 0) + delta);
        }
        delete effects.stockBoost;
      }
      if (effects.fameBonus) {
        CS.Rating.addFame(G, effects.fameBonus, Math.max(2, days), '厂商联动·' + sup.short);
        delete effects.fameBonus;
      }
      if (effects.marketMul) {
        /* 价格战：立刻压低该厂商商品的市场参考价 */
        for (const p of C.products) {
          if (p.supplier !== sup.id) continue;
          const m = G.market[p.sku];
          if (!m) continue;
          const floor = m.basePrice * C.market.priceFloorRatio;
          m.price = Math.max(floor, m.price * effects.marketMul);
        }
        delete effects.marketMul;
      }
      /* 文案中的 {v} 占位：成本/运费类给折扣数，产能/需求类给百分比 */
      let vText = '';
      if (effects.costMul != null) vText = String(Math.round(effects.costMul * 10));
      else if (effects.freightMul != null && effects.freightMul < 1) vText = String(Math.round(effects.freightMul * 10));
      else if (effects.freightMul != null) vText = effects.freightMul.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
      else if (effects.capacityMul != null) vText = String(Math.round(Math.abs(effects.capacityMul - 1) * 100));
      else if (effects.demandMul != null) vText = String(Math.round(Math.abs(effects.demandMul - 1) * 100));
      else vText = String(days);

      const news = {
        id: 'nw' + (G.nextNewsId++),
        supplierId: sup.id,
        supplierName: sup.name,
        eventId: ev.id,
        title: ev.title,
        tag: ev.tag,
        color: ev.color,
        text: (ev.text || '').replace(/\{sup\}/g, sup.name).replace(/\{v\}/g, vText),
        effects,
        startDay: day,
        endDay: day + days,
        days
      };
      G.supplierNews.push(news);
      fresh.push(news);
      CS.Game.message(G, 'press', '【厂商联动】' + news.text);
    }
    /* 上限保护：保留最晚结束的 */
    const max = cfg.maxActive || 14;
    if (G.supplierNews.length > max) {
      G.supplierNews.sort((a, b) => b.endDay - a.endDay);
      G.supplierNews.length = max;
    }
    return fresh;
  };


  /* 旧存档/新增 SKU 兜底：确保市场条目存在，避免启动或日结时读 undefined */
  MKT.ensureSku = function (G, sku) {
    G.market = G.market || {};
    if (!G.market[sku]) {
      const p = I.products[sku];
      if (!p) return null;
      G.market[sku] = {
        basePrice: p.price, price: p.price, days: [], today: CS.freshSkuDay(),
        factors: { D: 0, S: 0, P: 0, V: 0, T: 0, R: 0, M: 0, r: 0 }, lastR: 0
      };
    }
    const m = G.market[sku];
    m.days = m.days || [];
    m.today = m.today || CS.freshSkuDay();
    m.factors = m.factors || { D: 0, S: 0, P: 0, V: 0, T: 0, R: 0, M: 0, r: 0 };
    return m;
  };

  /* ---------- 统计窗口 ---------- */
  MKT.windowRecords = function (G, sku) {
    const m = MKT.ensureSku(G, sku);
    const recs = m.days.slice(-C.market.statWindow).map(r => r.rec);
    recs.push(m.today);
    return recs;
  };

  MKT.windowStats = function (G, sku) {
    const recs = MKT.windowRecords(G, sku);
    const out = { demand: 0, sales: 0, purchases: 0, stockouts: 0, visitors: 0 };
    for (const r of recs) {
      out.demand += r.demand || 0;
      out.sales += r.sales || 0;
      out.purchases += r.purchases || 0;
      out.stockouts += r.stockouts || 0;
      out.visitors += r.visitors || 0;
    }
    return out;
  };

  /* ---------- 记录（供因子与厂商策略使用） ---------- */
  MKT.record = {
    demand(G, sku, n) { const m = MKT.ensureSku(G, sku); if (m) m.today.demand += (n || 1); },
    sale(G, sku, n) { const m = MKT.ensureSku(G, sku); if (m) m.today.sales += (n || 1); },
    purchase(G, sku, n) { const m = MKT.ensureSku(G, sku); if (m) m.today.purchases += (n || 1); },
    stockout(G, sku) { const m = MKT.ensureSku(G, sku); if (m) m.today.stockouts += 1; },
    visitor(G, sku) { const m = MKT.ensureSku(G, sku); if (m) m.today.visitors += 1; }
  };

  /* ---------- 采购价：跟随市场，但幅度小于市场价 ---------- */
  MKT.purchasePrice = function (G, sku) {
    const p = I.products[sku];
    const m = MKT.ensureSku(G, sku);
    const ratio = m.price / m.basePrice;
    const adj = 1 + C.market.purchaseCostSensitivity * (ratio - 1);
    const news = MKT.newsEffects(G, p.supplier);
    const v = p.purchase * U.clamp(adj * news.costMul, C.market.purchaseCostMin, C.market.purchaseCostMax);
    return Math.max(1, Math.round(v));
  };

  /* ---------- 市场总体供需差 D ---------- */
  MKT.marketGap = function (G) {
    let demand = 0, sales = 0, inventory = 0;
    for (const p of C.products) {
      const st = MKT.windowStats(G, p.sku);
      demand += st.demand;
      sales += st.sales;
      inventory += CS.Inv.totalStock(G, p.sku);
    }
    const unmet = U.clamp((demand - sales) / Math.max(1, demand), 0, 1);
    const sluggish = U.clamp((inventory - sales * 2) / Math.max(1, inventory), -1, 1);
    return U.clamp(0.7 * unmet - 0.3 * sluggish, -1, 1);
  };

  /* ---------- 单 SKU 因子 ---------- */
  MKT.factors = function (G, sku) {
    const m = MKT.ensureSku(G, sku);
    const sup = CS.INDEX.suppliers[I.products[sku].supplier];
    const supState = G.suppliers[sup.id];
    const st = MKT.windowStats(G, sku);
    const W = C.market.weights;

    /* D 市场总体供需差（所有 SKU 共享） */
    const D = MKT.marketGap(G);

    /* S 厂商库存及生产情况：库存越低、分配越少 → 越正（涨价压力） */
    const safety = C.market.supplierStockSafety;
    const stock = supState.stock[sku] || 0;
    const alloc = supState.alloc[sku] || 0;
    const baseAlloc = Math.max(1, Math.floor(sup.capacity / Math.max(1, C.products.filter(p => p.supplier === sup.id).length)));
    const sStock = U.clamp((safety - stock) / safety, -1, 1);
    const sAlloc = U.clamp((baseAlloc - alloc) / baseAlloc, -1, 1);
    const S = U.clamp(0.6 * sStock + 0.4 * sAlloc, -1, 1);

    /* P 玩家采购压力 */
    const base = C.market.demandBaseline;
    const P = U.clamp((st.purchases - base) / (base * 2), -1, 1);

    /* V 玩家实际销售需求 */
    const V = U.clamp((st.sales - base) / (base * 2), -1, 1);

    /* T 最近 7 天价格趋势 */
    const refs = m.days.slice(-C.market.trendWindow);
    const oldPrice = refs.length ? refs[0].price : m.basePrice;
    const T = U.clamp(((m.price / oldPrice) - 1) / C.market.trendFullMove, -1, 1);

    /* R 随机波动 */
    const R = (CS.Rng.next(G) * 2 - 1) * 0.8;

    const Mt = W.D * D + W.S * S + W.P * P + W.V * V + W.T * T + W.R * R;
    const r = U.clamp(C.market.stepScale * Mt, -C.market.maxDailyStep, C.market.maxDailyStep);

    return {
      D: U.round2(D), S: U.round2(S), P: U.round2(P),
      V: U.round2(V), T: U.round2(T), R: U.round2(R),
      M: U.round2(Mt), r: U.round2(r * 1000) / 1000,
      stats: st, oldPrice
    };
  };

  /* ---------- 每日市场更新（在 07:00 日结算调用） ---------- */
  MKT.dailyUpdate = function (G) {
    const log = [];
    const day = G.clock.day;
    for (const p of C.products) {
      const m = G.market[p.sku];
      const f = MKT.factors(G, p.sku);
      const before = m.price;
      const floor = m.basePrice * C.market.priceFloorRatio;
      const newsMul = MKT.newsEffects(G, p.supplier).marketMul;
      const next = Math.max(floor, before * (1 + f.r) * newsMul);
      m.price = Math.round(next * 100) / 100;
      m.factors = f;
      m.lastR = f.r;
      /* 归档今日，开启新的今日计数 */
      m.days.push({ day, price: before, rec: m.today, factors: f });
      if (m.days.length > 40) m.days.shift();
      m.today = CS.freshSkuDay();
      log.push({ sku: p.sku, before, after: m.price, r: f.r, M: f.M });
    }
    return log;
  };

  /* ---------- 厂商生产策略：7 日统计 + 延迟 + 总产能上限 ---------- */
  MKT.updateSuppliers = function (G) {
    const day = G.clock.day;
    const log = [];
    const policy = C.supplierPolicy;

    for (const sup of C.suppliers) {
      const st = G.suppliers[sup.id];
      const skus = C.products.filter(p => p.supplier === sup.id).map(p => p.sku);

      /* 1) 计算优先级评分 */
      const scores = {};
      let sum = 0;
      for (const sku of skus) {
        const s = MKT.windowStats(G, sku);
        const stockoutRate = U.clamp(s.stockouts / C.market.statWindow, 0, 1);
        const purchaseHeat = U.clamp(s.purchases / 60, 0, 1);
        const velocity = U.clamp(s.sales / Math.max(1, s.purchases), 0, 1);
        const sluggish = Math.max(0, 0.5 - velocity) * 2;
        let score = 1
          + policy.scoreWeights.stockout * stockoutRate
          + policy.scoreWeights.purchase * purchaseHeat
          + policy.scoreWeights.velocity * velocity
          - policy.scoreWeights.sluggish * sluggish;
        score = Math.max(0.25, score);
        scores[sku] = { score, stockoutRate, purchaseHeat, velocity };
        sum += score;
      }

      /* 2) 按产能分配目标产量，写入延迟队列 */
      const disruption = CS.Rng.next(G) < policy.disruptionChance;
      st.disrupted = disruption;
      const newsCap = MKT.newsEffects(G, sup.id).capacityMul;
      const capacity = Math.round(sup.capacity * (disruption ? policy.disruptionFactor : 1) * newsCap);
      const target = {};
      for (const sku of skus) target[sku] = Math.max(0, Math.round(capacity * scores[sku].score / sum));

      st.plan.push({ effectiveDay: day + policy.lagDays, alloc: target, capacity, disruption });
      /* 应用到期计划 */
      let applied = null;
      while (st.plan.length && st.plan[0].effectiveDay <= day) {
        applied = st.plan.shift();
        st.alloc = Object.assign({}, applied.alloc);
      }
      if (applied) st.allocHistory.push({ day, alloc: Object.assign({}, st.alloc) });
      if (st.allocHistory.length > 30) st.allocHistory.shift();

      /* 3) 生产入库（受库存上限约束） */
      const cap = Math.round(sup.capacity * policy.stockCapFactor);
      let produced = 0;
      for (const sku of skus) {
        const add = st.alloc[sku] || 0;
        st.stock[sku] = Math.min(cap, (st.stock[sku] || 0) + add);
        produced += add;
      }

      /* 4) 运费波动（上限 130% 基础运费） */
      const drift = (CS.Rng.next(G) - 0.5) * 0.12;
      st.freightMul = U.clamp(U.clamp(st.freightMul + drift, 0.8, 1.3), 0.8, 1.3);
      st.freightMul = Math.round(st.freightMul * 100) / 100;

      log.push({ supplier: sup.name, capacity, produced, disruption, alloc: target });
    }
    return log;
  };

  /* ---------- 下单 ---------- */
  MKT.freight = function (G, supplierId) {
    const sup = I.suppliers[supplierId];
    const mul = G.suppliers[supplierId].freightMul;
    const news = MKT.newsEffects(G, supplierId);
    return Math.round(sup.freight * U.clamp(mul * news.freightMul, 0.4, 2));
  };

  MKT.orderQuote = function (G, supplierId, items) {
    let goods = 0, units = 0;
    const lines = [];
    for (const it of items) {
      const qty = Math.max(0, Math.floor(it.qty || 0));
      if (!qty) continue;
      const unit = MKT.purchasePrice(G, it.sku);
      lines.push({ sku: it.sku, qty, unit, sum: unit * qty });
      goods += unit * qty;
      units += qty;
    }
    const freight = units > 0 ? MKT.freight(G, supplierId) : 0;
    return { lines, goods, freight, total: goods + freight, units };
  };

  MKT.placeOrder = function (G, supplierId, items) {
    const quote = MKT.orderQuote(G, supplierId, items);
    if (!quote.units) return { ok: false, reason: '没有选择任何商品' };
    if (G.money < quote.total) return { ok: false, reason: '资金不足（需要 ' + U.money(quote.total) + '）' };

    const st = G.suppliers[supplierId];
    const contents = [];
    let shortfall = 0;

    /* 扣款 */
    G.money -= quote.total;
    G.today.purchase += quote.goods;
    G.today.freight += quote.freight;
    CS.Ledger.add(G, 'purchase', -quote.goods, '采购 ' + I.suppliers[supplierId].name, { supplier: supplierId });
    CS.Ledger.add(G, 'freight', -quote.freight, '运费 ' + I.suppliers[supplierId].name, { supplier: supplierId });

    /* 从厂商库存发货：可能部分缺货 */
    for (const line of quote.lines) {
      const avail = st.stock[line.sku] || 0;
      const take = Math.min(avail, line.qty);
      if (take > 0) {
        st.stock[line.sku] = avail - take;
        contents.push({ sku: line.sku, qty: take });
        MKT.record.purchase(G, line.sku, take);
        /* 加权平均成本（用于销售利润 → 店铺经验） */
        const prod = G.products[line.sku];
        prod.costQty = prod.costQty || 0;
        prod.costAvg = (prod.costAvg * prod.costQty + line.unit * take) / (prod.costQty + take);
        prod.costQty += take;
      }
      shortfall += line.qty - take;
    }

    let parcel = null;
    if (contents.length) {
      parcel = {
        id: 'p' + (G.inventory.nextParcelId++),
        supplier: supplierId,
        contents,
        arrivedDay: G.clock.day,
        arrivedMinute: G.clock.minute,
        claim: null,
        state: 'station'
      };
      G.inventory.parcels.push(parcel);
    }

    const order = {
      id: 'o' + (G.nextOrderId++),
      supplier: supplierId,
      day: G.clock.day,
      minute: G.clock.minute,
      goods: quote.goods,
      freight: quote.freight,
      total: quote.total,
      units: quote.units,
      shortfall,
      parcelId: parcel ? parcel.id : null
    };
    G.orders.push(order);
    if (G.orders.length > 60) G.orders.shift();

    return { ok: true, order, quote, shortfall, parcel };
  };
})(typeof window !== 'undefined' ? window : globalThis);
