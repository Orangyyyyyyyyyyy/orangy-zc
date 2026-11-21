/* ==========================================================================
 * 核心模型：状态创建、随机数、网格、存档
 * 规则与渲染/平台层完全分离（对应技术方案 §03 分层原则）
 * ========================================================================== */
(function (root) {
  'use strict';
  const CS = (root.CS = root.CS || {});
  const C = CS.CONTENT;
  const I = CS.INDEX;

  /* ------------------------------ 通用工具 ------------------------------ */
  const U = CS.Util = {
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    round2(v) { return Math.round(v * 100) / 100; },
    key(x, y) { return x + ',' + y; },
    money(v) { return (v < 0 ? '-¥' : '¥') + Math.abs(Math.round(v)).toLocaleString('zh-CN'); },
    hhmm(min) {
      const m = ((Math.floor(min) % 1440) + 1440) % 1440;
      return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    },
    pad(n, w) { return String(n).padStart(w || 2, '0'); },
    dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); },
    uid(prefix, n) { return prefix + '_' + n; }
  };

  /* ------------------------------ 随机数 ------------------------------ */
  function nextRandom(G) {
    G.rngState = (G.rngState + 0x6D2B79F5) | 0;
    let t = G.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rnd(G) { return nextRandom(G); }
  function rndRange(G, a, b) { return a + nextRandom(G) * (b - a); }
  function rndInt(G, a, b) { return Math.floor(a + nextRandom(G) * (b - a + 1)); }
  function pick(G, arr) { return arr[Math.floor(nextRandom(G) * arr.length)]; }
  function weighted(G, items, weightFn) {
    let total = 0;
    for (const it of items) total += Math.max(0, weightFn(it));
    if (total <= 0) return null;
    let r = nextRandom(G) * total;
    for (const it of items) {
      r -= Math.max(0, weightFn(it));
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }
  CS.Rng = { next: rnd, range: rndRange, int: rndInt, pick, weighted };

  /* ------------------------------ 网格 ------------------------------ */
  const L = () => C.layout;

  const Grid = CS.Grid = {
    layout() { return C.layout; },
    isUnlocked(G, x, y) { return !!G.cells[x + ',' + y]; },
    facilityAt(G, x, y) {
      for (const f of G.facilities) {
        if (x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h) return f;
      }
      return null;
    },
    isFounderCell(G, x, y) {
      const l = C.layout;
      return x >= 0 && x < l.cols && y >= 0 && y < l.rows;
    },
    isDoorCell(G, x, y) {
      const d = C.layout.door;
      return y === d.y && x >= d.x && x < d.x + d.w;
    },
    /* 建筑格是否可站立 */
    cellFree(G, x, y) {
      return this.isUnlocked(G, x, y) && !this.facilityAt(G, x, y);
    },
    /* 世界坐标是否可走（含门外装卸区） */
    pointWalkable(G, x, y) {
      const l = C.layout;
      if (y >= l.rows) {
        /* 整条店外人行道都可走：取快递、绕到门口 */
        return x > 0.45 && x < l.cols - 0.45 && y < l.rows + (l.outsideDepth || 2) - 0.5;
      }
      if (y < 0 || x < 0) return false;
      const cx = Math.floor(x), cy = Math.floor(y);
      return this.cellFree(G, cx, cy);
    },
    /* 以半径 r 采样，用于碰撞 */
    canStand(G, x, y, r) {
      const rr = r == null ? 0.20 : r;
      return this.pointWalkable(G, x - rr, y - rr) &&
             this.pointWalkable(G, x + rr, y - rr) &&
             this.pointWalkable(G, x - rr, y + rr) &&
             this.pointWalkable(G, x + rr, y + rr);
    },
    /* 设施四周可站立的格子 */
    accessCells(G, f) {
      const out = [];
      const seen = {};
      const add = (x, y) => {
        const k = x + ',' + y;
        if (seen[k]) return;
        if (this.cellFree(G, x, y)) { seen[k] = 1; out.push({ x: x + 0.5, y: y + 0.5, cx: x, cy: y }); }
      };
      for (let x = f.x; x < f.x + f.w; x++) { add(x, f.y - 1); add(x, f.y + f.h); }
      for (let y = f.y; y < f.y + f.h; y++) { add(f.x - 1, y); add(f.x + f.w, y); }
      if (!out.length) {
        /* 兜底：设施周边任意已解锁格 */
        for (let dy = -1; dy <= f.h; dy++) for (let dx = -1; dx <= f.w; dx++) add(f.x + dx, f.y + dy);
      }
      return out;
    },
    nearestAccess(G, f, x, y) {
      const cells = this.accessCells(G, f);
      let best = null, bd = 1e9;
      for (const c of cells) {
        const d = U.dist(c.x, c.y, x, y);
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    },
    /* BFS 寻路（建筑格） */
    findPath(G, fromX, fromY, toX, toY) {
      const sx = Math.floor(fromX), sy = Math.floor(fromY);
      const tx = Math.floor(toX), ty = Math.floor(toY);
      if (sx === tx && sy === ty) return [{ x: tx + 0.5, y: ty + 0.5 }];
      if (!this.cellFree(G, tx, ty)) return null;
      const open = [{ x: sx, y: sy, g: 0 }];
      const came = {};
      const cost = {};
      cost[sx + ',' + sy] = 0;
      let guard = 0;
      while (open.length && guard++ < 4000) {
        open.sort((a, b) => a.g - b.g);
        const cur = open.shift();
        const ck = cur.x + ',' + cur.y;
        if (cur.x === tx && cur.y === ty) {
          const path = [];
          let k = ck;
          let node = cur;
          while (k) {
            path.push({ x: node.x + 0.5, y: node.y + 0.5 });
            const prev = came[k];
            if (!prev) break;
            node = prev;
            k = prev.x + ',' + prev.y;
          }
          path.reverse();
          path[path.length - 1] = { x: tx + 0.5, y: ty + 0.5 };
          return path;
        }
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const d of dirs) {
          const nx = cur.x + d[0], ny = cur.y + d[1];
          if (!this.cellFree(G, nx, ny)) continue;
          const nk = nx + ',' + ny;
          const ng = cur.g + 1;
          if (cost[nk] == null || ng < cost[nk]) {
            cost[nk] = ng;
            came[nk] = cur;
            open.push({ x: nx, y: ny, g: ng });
          }
        }
      }
      return null;
    }
  };

  /* ------------------------------ 创建新游戏 ------------------------------ */
  function createFacility(G, typeId, x, y, opts) {
    const def = I.facilities[typeId];
    if (!def) throw new Error('未知设施 ' + typeId);
    const f = {
      id: 'f' + (G.nextFacilityId++),
      typeId,
      x, y, w: def.w, h: def.h,
      durability: C.durability.start,
      stock: {},
      claim: null,
      cards: [],
      /* 游戏桌座位：null 或 { npcId, x, y, since }；非游戏桌保持空数组 */
      seats: def.kind === 'gametable' ? new Array(def.seats || 2).fill(null) : [],
      earned: 0,
      usage: 0,
      isInitial: !!(opts && opts.initial)
    };
    G.facilities.push(f);
    return f;
  }

  function createGame(opts) {
    opts = opts || {};
    const diff = C.difficulty[opts.difficulty] || C.difficulty.normal;
    const G = {
      schema: C.save.schema,
      seed: opts.seed || Math.floor(Math.random() * 1e9),
      rngState: (opts.seed || Math.floor(Math.random() * 1e9)) | 0,
      shopName: opts.shopName || '星光卡牌屋',
      difficulty: diff.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),

      clock: {
        day: 1,
        minute: C.time.prepStart,
        state: 'PREPARE',
        speed: opts.speed || C.time.defaultSpeed,
        paused: false,
        night8: false,
        lastAutoSaveDay: 0
      },

      money: diff.startMoney,
      ledger: [],
      today: freshDayStats(),

      progression: {
        xp: 0,
        level: 1,
        expansionCredits: 0,
        profitTotal: 0,
        xpFromProfit: 0,
        levelsGained: 0
      },

      rating: {
        score: C.economy.startRating,
        reviews: [],
        fame: 0,
        fameEvents: [],
        highStreak: 0,
        history: [{ day: 1, score: C.economy.startRating }]
      },

      cells: {},
      facilities: [],
      nextFacilityId: 1,

      inventory: {
        warehouse: {},
        warehouseCap: 0,
        parcels: [],
        nextParcelId: 1
      },

      products: {},       // sku -> { price, costAvg }
      market: {},         // sku -> { basePrice, price, days:[], today:{}, factors:{}, lastR }
      suppliers: {},      // id -> { stock:{}, alloc:{}, plan:[], freightMul, disrupted }
      orders: [],
      nextOrderId: 1,

      npcs: [],
      nextNpcId: 1,
      employees: [],
      nextEmpId: 1,
      nextEmpName: 0,

      cards: [],
      nextCardId: 1,
      gradingOrders: [],
      nextGradingId: 1,

      loans: [],
      nextLoanId: 1,

      spawnQueue: [],
      messages: [],
      specials: [],
      /* 熟客档案 / 玩家互动记录 / 厂商联动快讯 */
      contacts: [],
      interactions: [],
      supplierNews: [],
      nextContactId: 1,
      nextNewsId: 1,
      lastAutoSave: null,
      saveMeta: { autoSaves: 0, manualSaves: 0 },

      player: { x: C.layout.spawn.x, y: C.layout.spawn.y, dir: 'up', carry: null, moving: false },

      stats: {
        daysPlayed: 0,
        totalRevenue: 0,
        totalCustomers: 0,
        bestDay: null
      },

      options: {
        selfCheckout: true,      // Demo 便利：无人收银时顾客自助结账
        autoSave: true,
        showPaths: false
      }
    };

    /* 初始建筑格：8×8 = 64 格（可在 Store 页继续扩建） */
    const lay = C.layout;
    for (let y = 0; y < lay.rows; y++) for (let x = 0; x < lay.cols; x++) G.cells[x + ',' + y] = 1;

    /* 初始设施（GDD §17.2 已确认） */
    createFacility(G, 'shelf', 0, 0, { initial: true });
    createFacility(G, 'counter', 4, 3, { initial: true });

    /* 商品 */
    for (const p of C.products) {
      G.products[p.sku] = {
        price: p.price,
        costAvg: p.purchase,
        unlockLevel: p.unlockLevel
      };
    }

    /* 市场 */
    for (const p of C.products) {
      G.market[p.sku] = {
        basePrice: p.price,
        price: p.price,
        days: [],
        today: freshSkuDay(),
        factors: { D: 0, S: 0, P: 0, V: 0, T: 0, R: 0, M: 0, r: 0 },
        lastR: 0
      };
    }

    /* 厂商 */
    for (const s of C.suppliers) {
      const skus = C.products.filter(p => p.supplier === s.id);
      const stock = {}, alloc = {};
      const share = Math.floor(s.capacity / Math.max(1, skus.length));
      for (const p of skus) {
        alloc[p.sku] = share;
        stock[p.sku] = share * 2;
      }
      G.suppliers[s.id] = {
        stock, alloc,
        plan: [],
        freightMul: 1,
        disrupted: false,
        allocHistory: [{ day: 1, alloc: Object.assign({}, alloc) }]
      };
    }

    /* 初始库存为 0，快递站为空 */
    G.messages.push({ day: 1, minute: C.time.prepStart, kind: 'info', text: '新店开张：先在平板【厂商商城】下单采购，再去门口快递站取货上架。' });
    return G;
  }

  function freshSkuDay() {
    return { demand: 0, sales: 0, purchases: 0, stockouts: 0, visitors: 0 };
  }
  function freshDayStats() {
    return {
      revenue: 0, cardRevenue: 0, gameRevenue: 0, purchase: 0, freight: 0, wage: 0,
      rent: 0, power: 0, repair: 0, loanInterest: 0, grading: 0, other: 0,
      customers: 0, served: 0, abandoned: 0, itemsSold: 0,
      profit: 0, xpGained: 0, reviews: 0, reviewSum: 0,
      opened: false
    };
  }
  CS.createGame = createGame;
  CS.createFacility = createFacility;
  CS.freshDayStats = freshDayStats;
  CS.freshSkuDay = freshSkuDay;

  /* ------------------------------ 存档 ------------------------------ */
  /* 布局迁移辅助：把旧存档补齐到当前 8×8 底板，并修正设施尺寸/重叠/挡门 */
  function ensureLayoutCells(G) {
    const l = C.layout;
    let added = 0;
    for (let y = 0; y < l.rows; y++) {
      for (let x = 0; x < l.cols; x++) {
        const k = x + ',' + y;
        if (!G.cells[k]) { G.cells[k] = 1; added++; }
      }
    }
    return added;
  }

  function overlapsDoor(f) {
    const d = C.layout.door;
    for (let y = f.y; y < f.y + f.h; y++) {
      for (let x = f.x; x < f.x + f.w; x++) {
        if (y === d.y && x >= d.x && x < d.x + d.w) return true;
      }
    }
    return false;
  }

  function overlapsAny(f, list) {
    for (const o of list) {
      if (o === f) continue;
      if (f.x < o.x + o.w && f.x + f.w > o.x && f.y < o.y + o.h && f.y + f.h > o.y) return true;
    }
    return false;
  }

  function spotUsable(G, f, x, y, placed) {
    const l = C.layout;
    if (x < 0 || y < 0 || x + f.w > l.cols + 4 || y + f.h > l.rows + 4) return false;
    for (let dy = 0; dy < f.h; dy++) {
      for (let dx = 0; dx < f.w; dx++) {
        const cx = x + dx, cy = y + dy;
        if (!Grid.isUnlocked(G, cx, cy)) return false;
        if (cy === l.door.y && cx >= l.door.x && cx < l.door.x + l.door.w) return false;
        const other = placed.find(o => o !== f && cx >= o.x && cx < o.x + o.w && cy >= o.y && cy < o.y + o.h);
        if (other) return false;
      }
    }
    return true;
  }

  function relocateFacility(G, f, placed) {
    const ox = f.x, oy = f.y;
    const l = C.layout;
    for (let y = 0; y < l.rows; y++) {
      for (let x = 0; x < l.cols; x++) {
        if (spotUsable(G, f, x, y, placed)) { f.x = x; f.y = y; return true; }
      }
    }
    f.x = ox; f.y = oy;
    return false;
  }

  function normalizeFacilities(G) {
    const placed = [];
    for (const f of G.facilities) {
      const def = I.facilities[f.typeId];
      if (!def) continue;
      /* 尺寸以配置为准（收银台 2×3 → 2×2 等改版会自动生效） */
      if (f.w !== def.w || f.h !== def.h) { f.w = def.w; f.h = def.h; }
      if (overlapsDoor(f) || overlapsAny(f, placed)) relocateFacility(G, f, placed);
      placed.push(f);
    }
  }

  CS.Save = {
    lastError: null,
    serialize(G) {
      const copy = JSON.parse(JSON.stringify(G));
      copy.updatedAt = Date.now();
      copy.schema = C.save.schema;
      return JSON.stringify(copy);
    },
    load(str) {
      const G = JSON.parse(str);
      const fromSchema = Number(G.schema) || 1;
      /* 迁移入口：当前 schema=2（8×8 底板 / 收银台 2×2 / 员工士气 / 熟客 / 厂商快讯） */
      G.options = Object.assign({
        selfCheckout: true, autoSave: true, showPaths: false,
        autoSaveIntervalSec: C.autosave.intervalSec, showNpcBubbles: true
      }, G.options || {});
      /* 旧存档补字段：游戏桌座位 / 台费收入 / 设施累计收益 */
      if (!G.today || G.today.gameRevenue == null) {
        G.today = G.today || {};
        G.today.gameRevenue = 0;
      }
      /* 结构兜底：旧存档/损坏存档缺字段时也能走到开始界面 */
      G.cards = G.cards || [];
      G.facilities = G.facilities || [];
      G.npcs = G.npcs || [];
      G.employees = G.employees || [];
      G.spawnQueue = G.spawnQueue || [];
      G.ledger = G.ledger || [];
      G.messages = G.messages || [];
      G.contacts = Array.isArray(G.contacts) ? G.contacts : [];
      G.interactions = Array.isArray(G.interactions) ? G.interactions : [];
      G.supplierNews = Array.isArray(G.supplierNews) ? G.supplierNews : [];
      G.nextContactId = G.nextContactId || 1;
      G.nextNewsId = G.nextNewsId || 1;
      G.saveMeta = Object.assign({ autoSaves: 0, manualSaves: 0 }, G.saveMeta || {});
      G.inventory = Object.assign({ warehouse: {}, warehouseCap: 0, parcels: [], nextParcelId: 1 }, G.inventory || {});
      G.today = Object.assign(CS.freshDayStats(), G.today || {});
      G.cells = G.cells || {};
      if (fromSchema < 2) ensureLayoutCells(G);
      normalizeFacilities(G);

      /* 版本迁移：补上新增 SKU、市场与厂商状态（旧存档没有四 IP 卡包） */
      G.products = G.products || {};
      G.market = G.market || {};
      G.suppliers = G.suppliers || {};
      for (const p of C.products) {
        if (!G.products[p.sku]) {
          G.products[p.sku] = { price: p.price, costAvg: p.purchase, unlockLevel: p.unlockLevel };
        }
        if (!G.market[p.sku]) {
          G.market[p.sku] = {
            basePrice: p.price, price: p.price, days: [], today: freshSkuDay(),
            factors: { D: 0, S: 0, P: 0, V: 0, T: 0, R: 0, M: 0, r: 0 }, lastR: 0
          };
        }
      }
      for (const sup of C.suppliers) {
        if (!G.suppliers[sup.id]) {
          G.suppliers[sup.id] = { stock: {}, alloc: {}, plan: [], freightMul: 1, disrupted: false, allocHistory: [] };
        }
        const st = G.suppliers[sup.id];
        st.stock = st.stock || {};
        st.alloc = st.alloc || {};
        st.plan = st.plan || [];
        st.allocHistory = st.allocHistory || [];
        const supProducts = C.products.filter(x => x.supplier === sup.id);
        const baseShare = Math.max(1, Math.floor(sup.capacity / Math.max(1, supProducts.length)));
        for (const p of supProducts) {
          if (st.stock[p.sku] == null) st.stock[p.sku] = baseShare * 2;
          if (st.alloc[p.sku] == null) st.alloc[p.sku] = baseShare;
        }
      }
      for (const c of G.cards || []) {
        if (!c.ip) { c.ip = 'pokemon'; c.ipName = '宝可梦'; c.ipOrder = 1; }
      }
      for (const f of G.facilities || []) {
        const def = I.facilities[f.typeId];
        if (def && def.kind === 'gametable') {
          const n = def.seats || 2;
          if (!Array.isArray(f.seats) || f.seats.length !== n) {
            const old = Array.isArray(f.seats) ? f.seats : [];
            f.seats = Array.from({ length: n }, (_, i) => old[i] || null);
          }
        } else if (!Array.isArray(f.seats)) {
          f.seats = [];
        }
        if (f.earned == null) f.earned = 0;
      }
      /* 员工士气 / 互动字段 */
      const si = C.staffInteract || {};
      for (const emp of G.employees || []) {
        if (emp.morale == null) emp.morale = si.moraleStart || 62;
        if (emp.relation == null) emp.relation = 0;
        if (emp.talkedDay == null) emp.talkedDay = 0;
        if (emp.bonusDay == null) emp.bonusDay = 0;
        if (emp.restDay == null) emp.restDay = 0;
      }
      G.schema = C.save.schema;
      return G;
    },
    writeLocal(G) {
      try {
        localStorage.setItem(C.save.key, this.serialize(G));
        this.lastError = null;
        return true;
      } catch (e) {
        this.lastError = (e && e.name === 'QuotaExceededError') ? '浏览器存储空间不足'
          : (e && e.message) || '浏览器存储不可用（可能是隐私模式或 file:// 限制）';
        return false;
      }
    },
    /* 自动存档：tick=定时写入（有最短间隔）；milestone=关键动作立即写入 */
    auto(G, reason) {
      if (!G || !G.options || !G.options.autoSave) return false;
      const now = Date.now();
      const minGap = (C.autosave.minIntervalSec || 4) * 1000;
      const lastTs = (G.lastAutoSave && G.lastAutoSave.ts) || 0;
      if (reason === 'tick' && now - lastTs < minGap) return false;
      G.lastAutoSave = { ts: now, day: G.clock.day, minute: Math.round(G.clock.minute), reason: reason || 'auto' };
      G.saveMeta = G.saveMeta || { autoSaves: 0, manualSaves: 0 };
      G.saveMeta.autoSaves = (G.saveMeta.autoSaves || 0) + 1;
      return this.writeLocal(G);
    },
    readLocal() {
      try {
        const s = localStorage.getItem(C.save.key);
        return s ? this.load(s) : null;
      } catch (e) { return null; }
    },
    clearLocal() {
      try { localStorage.removeItem(C.save.key); } catch (e) {}
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
