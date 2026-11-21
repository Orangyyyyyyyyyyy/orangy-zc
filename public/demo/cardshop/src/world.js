/* ==========================================================================
 * 世界模拟：玩家交互、NPC 顾客、员工任务、收银、评价
 * 所有实体只在内核中推进，渲染层只读（对应技术方案 §07）
 * ========================================================================== */
(function (root) {
  'use strict';
  const CS = (root.CS = root.CS || {});
  const C = CS.CONTENT;
  const I = CS.INDEX;
  const U = CS.Util;
  const Grid = CS.Grid;

  const W = CS.World = {};

  /* 门 / 快递站由 content.layout 决定：快递站固定在店外人行道上 */
  const DOOR = { x: C.layout.door.x, y: C.layout.door.y, w: C.layout.door.w };
  const STATION = { x: C.layout.station.x, y: C.layout.station.y };
  const DOOR_CX = DOOR.x + DOOR.w / 2;

  /* 移动速度：配置以「现实秒 / 格」给出；内核按游戏分钟推进，1 游戏分钟 = 2 现实秒 */
  const TO_GAME_MIN = 2;
  W.npcSpeed = () => TO_GAME_MIN / (C.move.npcSecPerCell || 0.5);
  W.npcWanderSpeed = () => TO_GAME_MIN / (C.move.npcWanderSecPerCell || 0.62);
  W.employeeIdleSpeed = () => TO_GAME_MIN / (C.move.employeeIdleSecPerCell || 0.95);
  W.employeeBaseSpeed = () => TO_GAME_MIN / (C.move.employeeSecPerCell || 0.8);

  /* ------------------------------ 移动 ------------------------------ */
  W.moveEntity = function (G, e, dtMin, speed) {
    if (!e.path || !e.path.length) return true;
    let budget = speed * dtMin;
    let guard = 0;
    while (budget > 0 && e.path.length && guard++ < 40) {
      const wp = e.path[0];
      const dx = wp.x - e.x, dy = wp.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.02) { e.path.shift(); continue; }
      const step = Math.min(budget, d);
      const nx = e.x + (dx / d) * step;
      const ny = e.y + (dy / d) * step;
      if (Grid.canStand(G, nx, ny, 0.16)) {
        e.x = nx; e.y = ny;
      } else {
        /* 卡住：直接尝试轴向滑动 */
        if (Grid.canStand(G, nx, e.y, 0.16)) e.x = nx;
        else if (Grid.canStand(G, e.x, ny, 0.16)) e.y = ny;
        else { e.path = []; return true; }
      }
      e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      budget -= step;
      if (Math.hypot(wp.x - e.x, wp.y - e.y) < 0.03) e.path.shift();
    }
    return e.path.length === 0;
  };

  W.pathTo = function (G, e, tx, ty) {
    const path = Grid.findPath(G, e.x, e.y, tx, ty);
    e.path = path || [];
    e.pathGoal = { x: tx, y: ty };
    return !!path;
  };

  W.nearFacility = function (G, x, y, typeIds, range) {
    let best = null, bd = range == null ? 1.9 : range;
    for (const f of G.facilities) {
      if (typeIds && typeIds.length && typeIds.indexOf(f.typeId) < 0) continue;
      if (!W.reachableFacility(G, f)) continue;
      const cx = U.clamp(x, f.x, f.x + f.w);
      const cy = U.clamp(y, f.y, f.y + f.h);
      const d = Math.hypot(x - cx, y - cy);
      if (d <= bd) { bd = d; best = f; }
    }
    return best;
  };

  W.reachableFacility = function (G, f) {
    return Grid.accessCells(G, f).length > 0;
  };

  W.facilityAccess = function (G, f, x, y) {
    return Grid.nearestAccess(G, f, x, y);
  };

  /* ------------------------------ 顾客 ------------------------------ */
  const FIRST = C.firstNames, LAST = C.lastNames;

  W.spawnNpc = function (G) {
    /* 有概率遇到熟客：复用档案里的名字/类型/关系值，形成长期互动 */
    const contact = W.pickContact(G);
    const typeDef = contact
      ? (I.npcTypes[contact.typeId] || CS.Rng.weighted(G, C.npcTypes, t => t.weight))
      : CS.Rng.weighted(G, C.npcTypes, t => t.weight);
    const def = typeDef || C.npcTypes[1];
    const rel = contact ? U.clamp(contact.relation || 0, 0, C.relation.relationMax || 100) : 0;
    const budgetBase = CS.Rng.range(G, def.budget[0], def.budget[1]);
    const budget = Math.round(budgetBase * (1 + rel * (C.relation.budgetBonus || 0)));
    const npc = {
      id: 'n' + (G.nextNpcId++),
      contactId: contact ? contact.id : null,
      relation: rel,
      name: contact ? contact.name : CS.Rng.pick(G, LAST) + CS.Rng.pick(G, FIRST),
      typeId: def.id,
      typeName: def.name,
      color: def.color,
      special: def.special || null,
      budget,
      spent: 0,
      priceSens: def.priceSens * CS.Rng.range(G, 0.9, 1.1) * (1 - rel * (C.relation.priceBonus || 0)),
      mood: CS.Rng.int(G, -3, 3),
      prefs: def.pref.slice(),
      favoriteSku: null,
      x: DOOR_CX + CS.Rng.range(G, -0.45, 0.45),
      y: DOOR.y + 0.75,
      dir: 'up',
      state: 'ENTER',
      path: [],
      wantIndex: 0,
      wants: [],
      basket: [],
      targetFacility: null,
      currentWant: null,
      queueEnterMinute: null,
      spawnMinute: G.clock.minute,
      waited: 0,
      metrics: { prefHit: false, priceRatios: [], stockouts: 0, browsed: 0 },
      reviewDone: false,
      visitedTables: {},
      retargetCooldown: 0,
      /* 游戏桌：入座意向 / 本局状态 */
      tableChance: def.tableChance != null ? def.tableChance : 0.3,
      tableRolled: false,
      usedTable: false,
      tableId: null,
      tableSeat: -1,
      tableTimer: 0,
      /* 玩家互动：交谈 / 主动推销 */
      pitchChance: U.clamp((def.pitchChance != null ? def.pitchChance : 0.15) + rel * (C.relation.pitchBonus || 0), 0.02, 0.95),
      pitchChecked: false,
      pitchTries: {},
      offer: null,
      pitchUntil: 0,
      talking: false,
      talked: false
    };

    /* 购物清单 1~3 件 */
    const count = CS.Rng.int(G, 1, def.priceSens < 0.9 ? 3 : 2);
    const unlocked = C.products.filter(p => p.unlockLevel <= G.progression.level);
    const demandOf = (sku) => (CS.Market.demandMulFor ? CS.Market.demandMulFor(G, sku) : 1);
    for (let i = 0; i < count; i++) {
      const pool = unlocked.filter(p => def.pref.indexOf(p.category) >= 0);
      const base = pool.length && CS.Rng.next(G) < 0.85 ? pool : unlocked;
      /* 厂商联动（联名/口碑/风波）会改变顾客对某厂商商品的偏好 */
      const picked = CS.Rng.weighted(G, base, p => Math.max(0.05, demandOf(p.sku))) || CS.Rng.pick(G, base);
      npc.wants.push({ sku: picked.sku, qty: 1, done: false, failed: null });
      if (!npc.favoriteSku || CS.Rng.next(G) < 0.4) npc.favoriteSku = picked.sku;
    }
    /* 需求被炒热的商品：更容易被额外点名 */
    const hot = unlocked.filter(p => demandOf(p.sku) > 1.15);
    if (hot.length && CS.Rng.next(G) < 0.3) {
      const p = CS.Rng.pick(G, hot);
      npc.wants.push({ sku: p.sku, qty: 1, done: false, failed: null });
    }
    /* 需求遇冷的商品：有概率被顾客放弃 */
    const cold = unlocked.filter(p => demandOf(p.sku) < 0.9);
    if (cold.length && npc.wants.length > 1 && CS.Rng.next(G) < 0.35) {
      const i = npc.wants.findIndex(w => cold.some(p => p.sku === w.sku));
      if (i >= 0) npc.wants.splice(i, 1);
    }
    /* 富豪可能大量扫货 */
    if (def.id === 'rich' && CS.Rng.next(G) < 0.35) {
      const p = CS.Rng.pick(G, unlocked);
      npc.wants.push({ sku: p.sku, qty: CS.Rng.int(G, 2, 4), done: false, failed: null });
    }
    /* 收藏家 / 富豪 会逛卡牌桌 */
    npc.cardInterest = (def.id === 'collector' || def.id === 'rich' || def.id === 'pro');
    npc.wantsCard = npc.cardInterest && CS.Inv.cardTables(G).length > 0;
    /* 记者的采访行为 */
    if (def.id === 'reporter') npc.metrics.isReporter = true;

    if (!contact) {
      const c = W.createContact(G, def, npc.name);
      npc.contactId = c.id;
      npc.relation = c.relation;
    } else {
      npc.relation = contact.relation || 0;
    }

    G.npcs.push(npc);
    return npc;
  };

  W.updateNpc = function (G, npc, dtMin) {
    if (npc.talking) return;      // 对话框打开时，该顾客暂停行动
    const now = G.clock.minute;
    const spd = W.npcSpeed();
    switch (npc.state) {
      case 'ENTER': {
        if (!npc.path.length) {
          const free = [];
          for (const k in G.cells) {
            const [x, y] = k.split(',').map(Number);
            if (Grid.cellFree(G, x, y)) free.push({ x, y });
          }
          const t = free.length ? CS.Rng.pick(G, free) : null;
          if (!t) { npc.state = 'LEAVE'; break; }
          W.pathTo(G, npc, t.x, t.y);
        }
        if (W.moveEntity(G, npc, dtMin, spd) || !npc.path.length) npc.state = 'BROWSE';
        break;
      }

      case 'BROWSE': {
        npc.retargetCooldown -= dtMin;
        if (npc.retargetCooldown > 0) break;
        npc.metrics.browsed++;
        const want = npc.wants.find(w => !w.done);
        if (!want) {
          if (npc.wantsCard) {
            npc.wantsCard = false;
            if (W.tryGoCardTable(G, npc)) break;
          }
          /* 游戏桌：竞技玩家/学生优先，入座后按局付台费 */
          if (W.tryGoGameTable(G, npc)) break;
          /* 顾客主动向玩家推销自己的卡牌（每次到店最多一次） */
          if (!npc.pitchChecked && W.maybeStartPitch(G, npc)) break;
          if (npc.basket.length) { W.goCounter(G, npc); break; }
          /* 没买到也会逛 1~2 个货架（让店内更有人气，也拉长停留时间） */
          npc.wanderCount = npc.wanderCount || 0;
          if (npc.wanderCount < 2 && CS.Rng.next(G) < 0.85) {
            npc.wanderCount++;
            const shelves = CS.Inv.shelves(G);
            let target = null;
            if (shelves.length) {
              const f = CS.Rng.pick(G, shelves);
              const acc = W.facilityAccess(G, f, npc.x, npc.y);
              if (acc) target = acc;
            }
            if (!target) {
              const free = [];
              for (const k in G.cells) {
                const [x, y] = k.split(',').map(Number);
                if (Grid.cellFree(G, x, y)) free.push({ x: x + 0.5, y: y + 0.5 });
              }
              if (free.length) target = CS.Rng.pick(G, free);
            }
            if (target) {
              W.pathTo(G, npc, target.cx != null ? target.cx : target.x, target.cy != null ? target.cy : target.y);
              npc.state = 'WANDER';
              npc.linger = 1.5 + CS.Rng.next(G) * 3;
              break;
            }
          }
          npc.state = 'LEAVE';
          break;
        }
        want.done = true;
        CS.Market.record.demand(G, want.sku, want.qty);
        const shelf = CS.Inv.bestShelfWith(G, want.sku, npc.x, npc.y);
        if (!shelf) {
          CS.Market.record.stockout(G, want.sku);
          want.failed = '缺货';
          npc.metrics.stockouts++;
          if (npc.prefs.indexOf(I.products[want.sku].category) >= 0) {
            /* 喜好商品没有货，留给评价 */
          }
          npc.retargetCooldown = 0.15;
          break;
        }
        npc.metrics.prefHit = true;
        const price = G.products[want.sku].price;
        const market = G.market[want.sku].price;
        const ratio = price / market;
        npc.metrics.priceRatios.push(ratio);
        const limit = 1.25 * Math.pow(1 / npc.priceSens, 0.9) * (C.difficulty[G.difficulty].tolerance || 1);
        if (ratio > limit) { want.failed = '价格'; npc.retargetCooldown = 0.15; break; }
        if (npc.spent + price * want.qty > npc.budget) { want.failed = '预算'; npc.retargetCooldown = 0.15; break; }
        npc.currentWant = want;
        npc.targetShelfId = shelf.id;
        const acc = W.facilityAccess(G, shelf, npc.x, npc.y);
        if (!acc) { want.failed = '无法到达'; break; }
        if (!W.pathTo(G, npc, acc.cx, acc.cy)) { want.failed = '无法到达'; break; }
        npc.state = 'TO_SHELF';
        break;
      }

      case 'TO_SHELF': {
        const shelf = G.facilities.find(f => f.id === npc.targetShelfId);
        if (!shelf) { npc.targetShelfId = null; npc.state = 'BROWSE'; break; }
        const acc = W.facilityAccess(G, shelf, npc.x, npc.y);
        const arrived = acc && U.dist(npc.x, npc.y, acc.x, acc.y) < 0.95;
        if (!arrived) { W.moveEntity(G, npc, dtMin, spd); break; }
        const want = npc.currentWant;
        if (!want) { npc.targetShelfId = null; npc.state = 'BROWSE'; break; }
        let bought = 0;
        for (let i = 0; i < want.qty; i++) {
          if ((shelf.stock[want.sku] || 0) <= 0) break;
          const price = G.products[want.sku].price;
          if (npc.spent + price > npc.budget) break;
          CS.Inv.takeFromShelf(G, shelf, want.sku, 1);
          npc.basket.push({ kind: 'sku', sku: want.sku, price, facilityId: shelf.id });
          npc.spent += price;
          bought++;
        }
        if (!bought) {
          want.failed = '缺货';
          npc.metrics.stockouts++;
        }
        npc.currentWant = null;
        npc.targetShelfId = null;
        npc.state = npc.basket.length || npc.wants.some(w => !w.done) ? 'BROWSE' : 'LEAVE';
        npc.retargetCooldown = 0.1;
        break;
      }

      case 'TO_COUNTER': {
        const counter = CS.Inv.counters(G)[0];
        if (!counter) { npc.state = 'LEAVE'; break; }
        const qpos = W.queuePosition(G, counter, npc);
        if (!npc.path.length) {
          const acc = Grid.nearestAccess(G, counter, npc.x, npc.y);
          if (!acc) { npc.state = 'LEAVE'; break; }
          W.pathTo(G, npc, qpos.x, qpos.y);
        }
        W.moveEntity(G, npc, dtMin, spd);
        if (U.dist(npc.x, npc.y, qpos.x, qpos.y) < 0.55 || !npc.path.length) {
          npc.state = 'QUEUE';
          npc.queueEnterMinute = now;
          npc.waited = 0;
        }
        break;
      }

      case 'QUEUE': {
        const counter = CS.Inv.counters(G)[0];
        if (!counter) { npc.state = 'LEAVE'; break; }
        const qpos = W.queuePosition(G, counter, npc);
        W.pathTo(G, npc, qpos.x, qpos.y);
        W.moveEntity(G, npc, dtMin, spd * 0.85);
        npc.waited = now - (npc.queueEnterMinute || now);
        if (npc.waited > 55) {
          W.abandon(G, npc, '等太久');
        }
        break;
      }

      case 'TO_CARD': {
        const f = G.facilities.find(x => x.id === npc.targetTableId);
        if (!f) { npc.targetTableId = null; npc.state = 'BROWSE'; break; }
        const acc = W.facilityAccess(G, f, npc.x, npc.y);
        if (!acc) { npc.targetTableId = null; npc.state = 'BROWSE'; break; }
        if (!npc.path.length && U.dist(npc.x, npc.y, acc.x, acc.y) > 0.9) {
          W.pathTo(G, npc, acc.cx, acc.cy);
        }
        W.moveEntity(G, npc, dtMin, spd * 0.95);
        if (U.dist(npc.x, npc.y, acc.x, acc.y) < 1.0) {
          W.buyFromCardTable(G, npc, f);
          npc.targetTableId = null;
          npc.state = 'BROWSE';
          npc.retargetCooldown = 0.3;
        }
        break;
      }

      case 'TO_TABLE': {
        const f = G.facilities.find(x => x.id === npc.tableId);
        if (!f) { npc.tableId = null; npc.state = 'BROWSE'; break; }
        W.ensureTableState(f);
        const seat = W.freeTableSeat(G, f);
        if (!seat) { npc.tableId = null; npc.state = 'BROWSE'; break; }
        if (U.dist(npc.x, npc.y, seat.x, seat.y) > 0.55) {
          if (!npc.path.length) W.pathTo(G, npc, seat.cx, seat.cy);
          W.moveEntity(G, npc, dtMin, spd * 0.95);
          if (U.dist(npc.x, npc.y, seat.x, seat.y) > 0.55) break;
        }
        npc.x = seat.x; npc.y = seat.y; npc.path = []; npc.dir = 'down';
        const def = I.facilities[f.typeId];
        const fee = Math.max(0, Math.round(def.fee || 0));
        if (fee && npc.spent + fee > npc.budget) {
          npc.usedTable = true;
          npc.tableId = null;
          npc.state = 'BROWSE';
          break;
        }
        f.seats[seat.index] = { npcId: npc.id, x: seat.x, y: seat.y, since: now };
        npc.tableSeat = seat.index;
        npc.tableTimer = def.sessionMinutes || 45;
        if (fee) W.collectTableFee(G, npc, f, fee);
        npc.state = 'PLAYING';
        break;
      }

      case 'PLAYING': {
        const f = G.facilities.find(x => x.id === npc.tableId);
        if (!f) { W.releaseTable(G, npc); npc.state = 'BROWSE'; break; }
        npc.tableTimer -= dtMin;
        if (npc.tableTimer <= 0) {
          W.releaseTable(G, npc);
          npc.usedTable = true;
          npc.metrics.playedTable = true;
          npc.mood = Math.min(5, npc.mood + 1);
          npc.state = 'BROWSE';
          npc.retargetCooldown = 0.25;
        }
        break;
      }

      case 'TO_PLAYER': {
        if (!npc.offer) { npc.state = 'BROWSE'; break; }
        if (U.dist(npc.x, npc.y, G.player.x, G.player.y) <= 1.45) {
          npc.path = [];
          npc.state = 'PITCH';
          npc.pitchUntil = now + (C.npcInteract.pitchDurationMinutes || 12);
          break;
        }
        if (!npc.path.length) {
          const cell = W.approachCell(G, G.player.x, G.player.y, npc.x, npc.y);
          if (cell) W.pathTo(G, npc, cell.cx, cell.cy);
          else {
            npc.state = 'PITCH';
            npc.pitchUntil = now + (C.npcInteract.pitchDurationMinutes || 12);
            break;
          }
        }
        W.moveEntity(G, npc, dtMin, spd);
        if (U.dist(npc.x, npc.y, G.player.x, G.player.y) <= 1.45 || !npc.path.length) {
          npc.state = 'PITCH';
          npc.pitchUntil = now + (C.npcInteract.pitchDurationMinutes || 12);
        }
        break;
      }

      case 'PITCH': {
        if (!npc.offer) { npc.state = 'BROWSE'; break; }
        npc.dir = Math.abs(G.player.x - npc.x) > Math.abs(G.player.y - npc.y)
          ? (G.player.x > npc.x ? 'right' : 'left')
          : (G.player.y > npc.y ? 'down' : 'up');
        if (now >= npc.pitchUntil) {
          W.clearNpcOffer(G, npc, 'expired');
          npc.state = 'BROWSE';
          npc.retargetCooldown = 0.3;
        }
        break;
      }

      case 'WANDER': {
        W.moveEntity(G, npc, dtMin, W.npcWanderSpeed());
        if (!npc.path.length) {
          npc.linger = (npc.linger || 0) - dtMin;
          if (npc.linger > 0) break;
          npc.state = 'BROWSE';
          npc.retargetCooldown = 0.4;
          npc.dir = 'down';
        }
        break;
      }

      case 'PAY': break;

      case 'LEAVE': {
        if (!npc.path.length && !npc.leaving) { npc.leaving = true; W.pathTo(G, npc, DOOR_CX, DOOR.y + 0.55); }
        W.moveEntity(G, npc, dtMin, spd * 1.1);
        if (!npc.path.length) {
          if (!npc.reviewDone) W.finishVisit(G, npc, false);
          npc.state = 'GONE';
        }
        break;
      }
    }
  };

  /* ------------------------------ 游戏桌 ------------------------------ */
  W.ensureTableState = function (f) {
    const def = I.facilities[f.typeId];
    const n = (def && def.seats) || 2;
    if (!Array.isArray(f.seats) || f.seats.length !== n) {
      const old = Array.isArray(f.seats) ? f.seats : [];
      const next = new Array(n).fill(null);
      for (let i = 0; i < Math.min(n, old.length); i++) next[i] = old[i] || null;
      f.seats = next;
    }
    return f.seats;
  };

  /* 桌边座位：优先左右两侧，保证双人桌看起来是对坐 */
  W.tableSeats = function (G, f) {
    const def = I.facilities[f.typeId];
    const n = (def && def.seats) || 2;
    const cells = Grid.accessCells(G, f);
    const out = [];
    const used = {};
    const add = (list) => {
      for (const c of list) {
        const k = c.cx + ',' + c.cy;
        if (used[k]) continue;
        used[k] = 1;
        out.push({ index: out.length, x: c.x, y: c.y, cx: c.cx, cy: c.cy });
        if (out.length >= n) return true;
      }
      return false;
    };
    const addOne = (list) => {
      for (const c of list) {
        const k = c.cx + ',' + c.cy;
        if (used[k]) continue;
        used[k] = 1;
        out.push({ index: out.length, x: c.x, y: c.y, cx: c.cx, cy: c.cy });
        return true;
      }
      return false;
    };
    const byY = (a, b) => a.cy - b.cy || a.cx - b.cx;
    const left = cells.filter(c => c.cx < f.x).sort(byY);
    const right = cells.filter(c => c.cx >= f.x + f.w).sort(byY);
    const top = cells.filter(c => c.cy < f.y).sort(byY);
    const bottom = cells.filter(c => c.cy >= f.y + f.h).sort(byY);
    /* 双人桌先各占左右一边；只有一侧可用时再补同侧/上下 */
    addOne(left); addOne(right); addOne(top); addOne(bottom);
    if (out.length < n) add(cells);
    return out.slice(0, n);
  };

  W.freeTableSeat = function (G, f) {
    W.ensureTableState(f);
    const idx = f.seats.indexOf(null);
    if (idx < 0) return null;
    const seats = W.tableSeats(G, f);
    return seats[idx] || null;
  };

  W.tryGoGameTable = function (G, npc) {
    if (npc.usedTable || npc.tableId || npc.tableRolled) return false;
    const tables = CS.Inv.gameTables(G);
    if (!tables.length) return false;
    npc.tableRolled = true;
    const chance = npc.tableChance == null ? 0.3 : npc.tableChance;
    if (CS.Rng.next(G) > chance) return false;
    let best = null, bd = 1e9;
    for (const f of tables) {
      W.ensureTableState(f);
      const seat = W.freeTableSeat(G, f);
      if (!seat) continue;
      const path = Grid.findPath(G, npc.x, npc.y, seat.cx, seat.cy);
      if (!path) continue;
      const d = U.dist(npc.x, npc.y, seat.x, seat.y);
      if (d < bd) { bd = d; best = { f, seat, path }; }
    }
    if (!best) return false;
    npc.tableId = best.f.id;
    npc.tableSeat = best.seat.index;
    npc.path = best.path;
    npc.state = 'TO_TABLE';
    return true;
  };

  W.collectTableFee = function (G, npc, f, fee) {
    G.money += fee;
    if (G.today) G.today.gameRevenue = (G.today.gameRevenue || 0) + fee;
    if (G.stats) G.stats.totalRevenue = (G.stats.totalRevenue || 0) + fee;
    CS.Ledger.add(G, 'gameRevenue', fee, '游戏桌台费（' + npc.name + '）', { npc: npc.id, facility: f.id });
    npc.spent += fee;
    npc.metrics.tableFee = (npc.metrics.tableFee || 0) + fee;
    npc.metrics.playedTable = true;
    npc.mood = Math.min(5, npc.mood + 1);
    f.usage = (f.usage || 0) + 1;
    f.earned = (f.earned || 0) + fee;
    f.durability = Math.max(0, f.durability - C.durability.usageLoss);
    const ups = CS.Progression.addProfit(G, fee);
    if (ups.length) CS.Game.notifyLevelUp(G, ups);
    CS.Game.message(G, 'info', npc.name + ' 入座游戏桌，支付台费 ' + U.money(fee));
  };

  W.releaseTable = function (G, npc) {
    if (npc.tableId) {
      const f = G.facilities.find(x => x.id === npc.tableId);
      if (f && Array.isArray(f.seats)) {
        const i = f.seats.findIndex(s => s && s.npcId === npc.id);
        if (i >= 0) f.seats[i] = null;
      }
    }
    npc.tableId = null;
    npc.tableSeat = -1;
    npc.tableTimer = 0;
  };

  /* 清理异常残留座位（NPC 已离店 / 已离开桌子） */
  W.reconcileTables = function (G) {
    for (const f of CS.Inv.gameTables(G)) {
      if (!Array.isArray(f.seats)) continue;
      for (let i = 0; i < f.seats.length; i++) {
        const s = f.seats[i];
        if (!s) continue;
        const npc = G.npcs.find(n => n.id === s.npcId);
        if (!npc || npc.state === 'GONE' || npc.tableId !== f.id) f.seats[i] = null;
      }
    }
  };

  /* ------------------------------ 玩家与 NPC 互动 ------------------------------ */
  W.approachCell = function (G, tx, ty, fromX, fromY) {
    const cx = Math.floor(tx), cy = Math.floor(ty);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1], [0, 0]];
    let best = null, bd = 1e9;
    for (const d of dirs) {
      const x = cx + d[0], y = cy + d[1];
      if (!Grid.cellFree(G, x, y)) continue;
      const dist = U.dist(x + 0.5, y + 0.5, fromX, fromY);
      /* 尽量避免站到玩家所在的格子上 */
      const penalty = (d[0] === 0 && d[1] === 0) ? 0.35 : 0;
      if (dist + penalty < bd) { bd = dist + penalty; best = { x: x + 0.5, y: y + 0.5, cx: x, cy: y }; }
    }
    return best;
  };

  W.maybeStartPitch = function (G, npc) {
    if (npc.offer || npc.pitchChecked) return false;
    npc.pitchChecked = true;
    const chance = npc.pitchChance == null ? 0.15 : npc.pitchChance;
    if (CS.Rng.next(G) > chance) return false;
    const offer = W.makeNpcOffer(G, npc);
    if (!offer) return false;
    npc.offer = offer;
    npc.state = 'TO_PLAYER';
    npc.path = [];
    npc.pitchUntil = G.clock.minute + (C.npcInteract.pitchDurationMinutes || 12);
    CS.Game.message(G, 'info', npc.name + ' 拿出一张「' + offer.name + '」，想以 ' + U.money(offer.ask) + ' 卖给你');
    const cell = W.approachCell(G, G.player.x, G.player.y, npc.x, npc.y);
    if (cell) W.pathTo(G, npc, cell.cx, cell.cy);
    return true;
  };

  W.makeNpcOffer = function (G, npc) {
    const cfg = C.npcInteract || {};
    const tiers = (cfg.pitchTiers && cfg.pitchTiers[npc.typeId]) || ['N', 'U', 'R'];
    const pool = (CS.CARDS || []).filter(c => tiers.indexOf(c.tier) >= 0);
    if (!pool.length) return null;
    const def = CS.Rng.pick(G, pool);
    const value = CS.Cards.valueBase(def.tier);
    const range = cfg.pitchAskMul || [0.6, 0.85];
    const ask = Math.max(1, Math.round(value * CS.Rng.range(G, range[0], range[1])));
    return {
      defId: def.id,
      name: def.name,
      nameEn: def.nameEn,
      tier: def.tier,
      img: def.img,
      value,
      ask,
      createdMinute: G.clock.minute,
      expiresMinute: G.clock.minute + (cfg.pitchDurationMinutes || 12)
    };
  };

  W.clearNpcOffer = function (G, npc, reason) {
    npc.offer = null;
    if (npc.state === 'PITCH' || npc.state === 'TO_PLAYER') {
      npc.state = 'BROWSE';
      npc.retargetCooldown = 0.25;
    }
    return { ok: true, reason: reason || 'cleared' };
  };

  W.acceptNpcOffer = function (G, npc) {
    const offer = npc.offer;
    if (!offer) return { ok: false, reason: 'TA 现在没有要出手的卡牌' };
    if (G.money < offer.ask) return { ok: false, reason: '资金不足（需要 ' + U.money(offer.ask) + '）' };
    const def = (CS.CARDS || []).find(c => c.id === offer.defId);
    if (!def) return { ok: false, reason: '卡牌资料不存在' };
    const card = CS.Cards.add(G, def);
    card.history = [{ day: G.clock.day, event: '从 ' + npc.name + ' 收购（' + U.money(offer.ask) + '）' }];
    G.money -= offer.ask;
    CS.Ledger.add(G, 'purchase', -offer.ask, '收购卡牌·' + card.name, { npc: npc.id, card: card.id });
    npc.offer = null;
    npc.mood = Math.min(5, npc.mood + 1);
    npc.metrics.soldCard = (npc.metrics.soldCard || 0) + 1;
    W.addRelation(G, npc, C.relation.perDeal, '把卡卖给了你');
    W.logInteraction(G, { kind: 'deal', who: npc.name, text: '收购 ' + card.name + '（' + U.money(offer.ask) + '）', delta: C.relation.perDeal });
    npc.state = 'BROWSE';
    npc.retargetCooldown = 0.3;
    return { ok: true, card, price: offer.ask };
  };

  W.declineNpcOffer = function (G, npc) {
    if (!npc.offer) return { ok: false, reason: 'TA 现在没有要出手的卡牌' };
    npc.offer = null;
    npc.state = 'BROWSE';
    npc.retargetCooldown = 0.25;
    return { ok: true };
  };

  W.nearestTalkableNpc = function (G, x, y, range) {
    let best = null, bd = range == null ? (C.npcInteract.talkRange || 1.8) : range;
    for (const npc of G.npcs) {
      if (npc.state === 'GONE' || npc.state === 'LEAVE') continue;
      const d = U.dist(npc.x, npc.y, x, y);
      if (d <= bd) { bd = d; best = npc; }
    }
    return best;
  };

  W.pitchOptions = function (G, npc) {
    const wanted = {};
    const basket = {};
    for (const w of npc.wants) if (!w.done) wanted[w.sku] = 1;
    for (const b of npc.basket) if (b.kind === 'sku') basket[b.sku] = 1;

    const wants = npc.wants.filter(w => !w.done).map(w => {
      const p = I.products[w.sku];
      let stock = 0;
      for (const f of CS.Inv.shelves(G)) stock += f.stock[w.sku] || 0;
      const price = G.products[w.sku].price;
      const tries = (npc.pitchTries && npc.pitchTries[w.sku]) || 0;
      return {
        sku: w.sku, name: p.name, price, stock, want: true, tries,
        affordable: npc.spent + price <= npc.budget && tries < (C.npcInteract.pitchAttemptsPerSku || 3)
      };
    });

    const extras = [];
    const seen = {};
    for (const f of CS.Inv.shelves(G)) {
      for (const sku of Object.keys(f.stock)) {
        if ((f.stock[sku] || 0) <= 0 || wanted[sku] || basket[sku] || seen[sku]) continue;
        const p = I.products[sku];
        if (p.unlockLevel > G.progression.level) continue;
        seen[sku] = 1;
        const price = G.products[sku].price;
        const tries = (npc.pitchTries && npc.pitchTries[sku]) || 0;
        extras.push({
          sku, name: p.name, price, tries,
          stock: CS.Inv.shelves(G).reduce((a, g) => a + (g.stock[sku] || 0), 0),
          pref: npc.prefs.indexOf(p.category) >= 0,
          affordable: npc.spent + price <= npc.budget && tries < (C.npcInteract.pitchAttemptsPerSku || 3)
        });
      }
    }
    extras.sort((a, b) => (b.pref - a.pref) || (a.price - b.price));
    return { wants, extras: extras.slice(0, 3) };
  };

  W.pitchProduct = function (G, npc, sku) {
    const p = I.products[sku];
    if (!p) return { ok: false, reason: '商品不存在' };
    const maxTries = C.npcInteract.pitchAttemptsPerSku || 3;
    npc.pitchTries = npc.pitchTries || {};
    if ((npc.pitchTries[sku] || 0) >= maxTries) {
      return { ok: false, reason: '已经推荐过很多次了，顾客不想再听同一件商品' };
    }
    const shelf = CS.Inv.bestShelfWith(G, sku, npc.x, npc.y);
    if (!shelf) return { ok: false, reason: '货架上没有「' + p.name + '」，先去补货' };
    const price = G.products[sku].price;
    if (npc.spent + price > npc.budget) return { ok: false, reason: '顾客预算不够（剩余 ' + U.money(npc.budget - npc.spent) + '）' };
    const market = G.market[sku].price;
    const ratio = price / market;
    const limit = 1.25 * Math.pow(1 / npc.priceSens, 0.9) * (C.difficulty[G.difficulty].tolerance || 1);
    if (ratio > limit * 1.15) {
      return { ok: false, reason: '顾客觉得太贵（行情 ' + U.money(market) + '）' };
    }
    npc.pitchTries[sku] = (npc.pitchTries[sku] || 0) + 1;
    const want = npc.wants.find(w => !w.done && w.sku === sku);
    const otherOpen = npc.wants.some(w => !w.done && w.sku !== sku);
    let chance = 0.58 + npc.mood * 0.035 + (want ? 0.14 : -0.02) - (ratio - 1) * 1.15;
    if (otherOpen) chance -= 0.12;
    chance = U.clamp(chance, 0.05, 0.95);
    if (CS.Rng.next(G) > chance) {
      npc.mood = Math.max(-5, npc.mood - 1);
      npc.metrics.pitchFailed = (npc.metrics.pitchFailed || 0) + 1;
      npc.metrics.priceRatios.push(ratio);
      return { ok: false, chance, reason: '顾客犹豫了一下，没有接受（把握约 ' + Math.round(chance * 100) + '%）' };
    }
    CS.Inv.takeFromShelf(G, shelf, sku, 1);
    if (want) want.done = true;
    else npc.wants.push({ sku, qty: 1, done: true, failed: null, impulse: true });
    npc.basket.push({ kind: 'sku', sku, price, facilityId: shelf.id });
    npc.spent += price;
    if (npc.prefs.indexOf(p.category) >= 0) npc.metrics.prefHit = true;
    npc.metrics.pitchSuccess = (npc.metrics.pitchSuccess || 0) + 1;
    npc.metrics.priceRatios.push(ratio);
    npc.mood = Math.min(5, npc.mood + 1);
    W.addRelation(G, npc, C.relation.perDeal, '接受了推荐');
    W.logInteraction(G, { kind: 'deal', who: npc.name, text: '推荐成功：' + p.name + '（' + U.money(price) + '）', delta: C.relation.perDeal });
    npc.currentWant = null;
    npc.targetShelfId = null;
    npc.targetTableId = null;
    CS.Market.record.demand(G, sku, 1);
    if (npc.tableId) { W.releaseTable(G, npc); npc.usedTable = true; }
    if (npc.offer) npc.offer = null;
    if (!npc.wants.some(w => !w.done) && npc.basket.length) {
      W.goCounter(G, npc);
    } else {
      npc.state = 'BROWSE';
      npc.retargetCooldown = 0.2;
    }
    return { ok: true, chance, price, sku, item: p.name };
  };

  W.chatWithNpc = function (G, npc) {
    if (npc.talked) return { ok: false, reason: '刚刚已经聊过了' };
    npc.talked = true;
    npc.mood = Math.min(5, npc.mood + 1);
    npc.metrics.talked = (npc.metrics.talked || 0) + 1;
    const lines = {
      student: '「老板，最近有什么新卡包吗？我攒了零花钱。」',
      regular: '「随便逛逛，听说你家卡牌桌氛围不错。」',
      collector: '「这张卡的品相我很在意，有评级好的记得叫我。」',
      pro: '「周末有店赛吗？我想试试新卡组。」',
      rich: '「钱不是问题，稀有的东西给我留一份。」',
      reporter: '「这家店的特色是什么？我想做个专题。」',
      streamer: '「开播前先来你这里补点货，观众就爱看拆包。」'
    };
    const ups = CS.Progression.addXp(G, C.npcInteract.chatXp || 2);
    if (ups.length) CS.Game.notifyLevelUp(G, ups);
    const c = W.addRelation(G, npc, C.relation.perChat, '聊了两句');
    return { ok: true, line: lines[npc.typeId] || '「老板好。」', mood: npc.mood, relation: c ? c.relation : null };
  };

  /* ------------------------------ 互动记录 / 熟客关系 ------------------------------ */
  W.logInteraction = function (G, opts) {
    const rec = {
      day: G.clock.day,
      minute: Math.round(G.clock.minute),
      kind: opts.kind || 'npc',        // npc | staff | deal
      who: opts.who || '',
      text: opts.text || '',
      delta: opts.delta || 0
    };
    G.interactions.push(rec);
    if (G.interactions.length > 80) G.interactions.shift();
    return rec;
  };

  W.contactOf = function (G, npc) {
    if (!npc || !npc.contactId) return null;
    return G.contacts.find(c => c.id === npc.contactId) || null;
  };

  W.pickContact = function (G) {
    const cfg = C.relation;
    if (!G.contacts.length) return null;
    if (CS.Rng.next(G) >= (cfg.repeatChance || 0.42)) return null;
    return CS.Rng.weighted(G, G.contacts, c => 1 + (c.relation || 0) * 0.08) || null;
  };

  W.createContact = function (G, def, name) {
    const contact = {
      id: 'k' + (G.nextContactId++),
      name,
      typeId: def.id,
      typeName: def.name,
      relation: 0,
      visits: 0,
      spent: 0,
      lastDay: G.clock.day,
      favoriteSku: null,
      note: ''
    };
    G.contacts.push(contact);
    if (G.contacts.length > (C.relation.maxContacts || 80)) {
      G.contacts.sort((a, b) => (b.relation || 0) - (a.relation || 0) || (b.lastDay || 0) - (a.lastDay || 0));
      G.contacts.length = C.relation.maxContacts || 80;
    }
    return contact;
  };

  W.addRelation = function (G, npc, delta, reason) {
    const c = W.contactOf(G, npc);
    if (!c || !delta) return c;
    const max = C.relation.relationMax || 100;
    const before = c.relation || 0;
    c.relation = U.clamp(before + delta, 0, max);
    c.lastDay = G.clock.day;
    if (delta > 0) c.note = reason || c.note;
    if (Math.round(c.relation) !== Math.round(before)) {
      W.logInteraction(G, {
        kind: 'npc', who: npc.name,
        text: reason + '（关系 ' + Math.round(before) + ' → ' + Math.round(c.relation) + '）',
        delta: Math.round(c.relation) - Math.round(before)
      });
    }
    return c;
  };


  W.tryGoCardTable = function (G, npc) {
    for (const f of CS.Inv.cardTables(G)) {
      const listed = (f.cards || []).map(id => G.cards.find(c => c.id === id))
        .filter(c => c && c.location === 'table' && !c.reservedBy);
      if (!listed.length) continue;
      /* 只考虑买得起的卡 */
      const affordable = listed.filter(c => c.price <= npc.budget * 0.6);
      if (!affordable.length) continue;
      const target = affordable.sort((a, b) => a.price - b.price)[0];
      const acc = W.facilityAccess(G, f, npc.x, npc.y);
      if (!acc) continue;
      npc.targetTableId = f.id;
      npc.targetCardId = target.id;
      if (!W.pathTo(G, npc, acc.cx, acc.cy)) continue;
      npc.state = 'TO_CARD';
      return true;
    }
    return false;
  };

  W.buyFromCardTable = function (G, npc, f) {
    const card = G.cards.find(c => c.id === npc.targetCardId);
    if (!card || card.location !== 'table' || card.reservedBy) return;
    const value = CS.Cards.valueOf(card);
    const maxPay = value * (1.7 / npc.priceSens) * (C.difficulty[G.difficulty].tolerance || 1);
    if (card.price > maxPay) {
      npc.mood = Math.max(-5, npc.mood - 1);
      return;
    }
    if (npc.spent + card.price > npc.budget) return;
    card.reservedBy = npc.id;
    npc.basket.push({ kind: 'card', cardId: card.id, price: card.price, facilityId: f.id });
    npc.spent += card.price;
  };

  W.queuePosition = function (G, counter, npc) {
    const queue = G.npcs.filter(n => n.state === 'QUEUE')
      .sort((a, b) => (a.queueEnterMinute || 1e9) - (b.queueEnterMinute || 1e9));
    let idx = queue.findIndex(n => n.id === npc.id);
    if (idx < 0) idx = queue.length;
    const spot = W.counterStaffSpot(G, counter);
    let cells = Grid.accessCells(G, counter);
    /* 排队点：离门口最近的接入格优先，且避开收银员站位 */
    if (spot) cells = cells.filter(c => !(Math.abs(c.x - spot.x) < 0.01 && Math.abs(c.y - spot.y) < 0.01));
    cells.sort((a, b) => U.dist(a.x, a.y, DOOR_CX, DOOR.y + 0.5) - U.dist(b.x, b.y, DOOR_CX, DOOR.y + 0.5));
    if (!cells.length) return { x: counter.x - 0.5, y: counter.y + counter.h / 2 };
    const c = cells[idx % cells.length];
    const ring = Math.floor(idx / cells.length);
    const jitter = ((idx * 37) % 5 - 2) * 0.05;
    return { x: c.x + jitter, y: c.y + Math.min(0.35, ring * 0.3) };
  };

  W.goCounter = function (G, npc) {
    npc.state = 'TO_COUNTER';
    npc.path = [];
  };

  W.abandon = function (G, npc, reason) {
    W.releaseTable(G, npc);
    npc.targetShelfId = null;
    npc.targetTableId = null;
    /* 退货回货架 */
    for (const it of npc.basket) {
      if (it.kind === 'sku') {
        const f = G.facilities.find(x => x.id === it.facilityId);
        if (f) CS.Inv.addToShelf(G, f, it.sku, 1);
      } else if (it.kind === 'card') {
        const card = G.cards.find(c => c.id === it.cardId);
        if (card) {
          card.reservedBy = null;
          if (card.location === 'reserved') { card.location = 'table'; }
        }
      }
    }
    npc.basket = [];
    npc.metrics.abandonReason = reason;
    W.finishVisit(G, npc, false);
  };

  W.finishVisit = function (G, npc, served) {
    W.releaseTable(G, npc);
    npc.targetShelfId = null;
    npc.targetTableId = null;
    npc.offer = null;
    npc.talking = false;
    const review = W.evaluate(G, npc);
    review.npcId = npc.id;
    review.npcName = npc.name;
    review.typeName = npc.typeName;
    review.served = served;
    review.abandon = npc.metrics.abandonReason || null;
    review.day = G.clock.day;
    review.minute = G.clock.minute;
    CS.Rating.pushReview(G, review);
    /* 熟客档案：记录到店、消费与关系变化 */
    const contact = W.contactOf(G, npc);
    if (contact) {
      contact.visits = (contact.visits || 0) + 1;
      contact.spent = (contact.spent || 0) + Math.round(npc.spent || 0);
      contact.lastDay = G.clock.day;
      if (npc.favoriteSku) contact.favoriteSku = npc.favoriteSku;
      const delta = (C.relation.perVisit || 0)
        + (served ? (C.relation.perServe || 0) : 0)
        + (review.abandon ? (C.relation.perAbandon || 0) : 0);
      W.addRelation(G, npc, delta, served ? '完成消费' : (review.abandon ? '失望离店' : '逛店离店'));
      if (npc.spent > 0) {
        W.logInteraction(G, {
          kind: 'npc', who: npc.name,
          text: '结账 ' + U.money(npc.spent) + '，买走 ' + npc.basket.length + ' 件'
        });
      }
    }
    G.today.customers += 1;
    if (served) {
      G.today.served += 1;
      const ups = CS.Progression.addXp(G, CS.Progression.receptionXp(G, npc));
      if (ups.length) CS.Game.notifyLevelUp(G, ups);
    } else {
      G.today.abandoned += 1;
    }
    if (npc.special === 'reporter') {
      CS.Rating.addFame(G, 20, 5, '电视台采访');
      CS.Game.message(G, 'press', npc.name + '（电视台记者）完成了采访：知名度 +20，5 天内衰减');
    } else if (npc.special === 'streamer') {
      const add = CS.Rng.int(G, 3, 6);
      CS.Rating.addFame(G, add, 7, 'NPC直播');
      CS.Game.message(G, 'press', npc.name + '（知名主播）开播：知名度 +' + add + '，7 天内衰减');
    }
    if (npc.state !== 'GONE') npc.state = 'LEAVE';
    npc.reviewDone = true;
    npc.leaving = false;
    npc.path = [];
  };

  /* ------------------------------ 评价 ------------------------------ */
  W.storeEnvScore = function (G) {
    let env = 0;
    for (const f of G.facilities) {
      const def = I.facilities[f.typeId];
      if ((def.kind === 'decor' || def.kind === 'gametable') && def.env) env += def.env;
    }
    return env;
  };

  W.evaluate = function (G, npc) {
    const cfg = C.evaluation;
    const agg = CS.Inv.assortment(G);

    /* 布局：可通行空格比例 */
    let unlocked = 0, free = 0;
    for (const k in G.cells) {
      unlocked++;
      const [x, y] = k.split(',').map(Number);
      if (Grid.cellFree(G, x, y)) free++;
    }
    const freeRatio = unlocked ? free / unlocked : 0;
    const layoutSat = U.clamp(35 + 65 * (freeRatio / 0.45), 10, 100);

    /* 员工 */
    const staff = G.employees.filter(e => e.onDuty).length;
    const staffSat = U.clamp(45 + 14 * staff, 20, 100);

    /* 货架丰富度 */
    const shelfSat = unlocked ? U.clamp(25 + 75 * agg.ratio, 5, 100) : 10;

    /* 喜好商品 */
    const favSku = npc.favoriteSku;
    const favStocked = favSku ? (CS.Inv.shelves(G).some(f => (f.stock[favSku] || 0) > 0)) : false;
    const prefSat = favStocked ? 92 : (npc.metrics.prefHit ? 62 : 28);

    /* 收银 */
    const experienced = npc.basket.length > 0 || npc.queueEnterMinute != null;
    const paySat = U.clamp(100 - Math.max(0, npc.waited || 0) * 2.2, 12, 100);

    /* 价格 */
    let priceSat;
    if (npc.metrics.priceRatios.length) {
      const avg = npc.metrics.priceRatios.reduce((a, b) => a + b, 0) / npc.metrics.priceRatios.length;
      priceSat = U.clamp(100 - (avg - 1) * 120, 5, 100);
    } else {
      priceSat = 45;
    }

    /* 商品质量（按 SKU 稳定随机） */
    let qsum = 0;
    const skus = npc.basket.filter(b => b.kind === 'sku').map(b => b.sku);
    if (!skus.length) skus.push(...C.products.slice(0, 3).map(p => p.sku));
    for (const s of skus) {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
      qsum += 0.72 + (h / 997) * 0.28;
    }
    const qualitySat = U.clamp(35 + 65 * (qsum / skus.length), 20, 100);

    /* 环境 */
    const envSum = W.storeEnvScore(G);
    const envSat = U.clamp(45 + Math.min(45, envSum * 1.1) +
      (npc.metrics.playedTable ? (C.npcInteract.tableEnvBonus || 6) : 0), 10, 100);

    const sats = {
      layout: layoutSat, staff: staffSat, shelf: shelfSat, pref: prefSat,
      pay: paySat, price: priceSat, quality: qualitySat, env: envSat
    };

    /* 个性权重调整（0.7~1.4 倍）后重新归一化 */
    const sens = npc.priceSens;
    const adj = {
      layout: 1, staff: 1, shelf: 1, pref: 1, pay: 1, price: 1, quality: 1, env: 1
    };
    adj.price = U.clamp(1 + (sens - 1) * 0.9, 0.7, 1.4);
    adj.pref = favSku ? 1.15 : 0.9;
    adj.staff = npc.typeId === 'rich' ? 1.25 : 1;
    adj.quality = npc.typeId === 'collector' ? 1.25 : 1;
    adj.env = npc.typeId === 'rich' ? 1.2 : (npc.typeId === 'student' ? 0.85 : 1);

    let totalW = 0, sum = 0;
    const dims = [];
    for (const d of cfg.dims) {
      if (d.id === 'pay' && !experienced) continue;
      const w = d.weight * (adj[d.id] || 1);
      totalW += w;
      sum += sats[d.id] * w;
      dims.push({ id: d.id, label: d.label, weight: w, sat: Math.round(sats[d.id]) });
    }
    let score = totalW ? sum / totalW : 60;
    score += U.clamp(npc.mood, cfg.moodRange[0], cfg.moodRange[1]);
    score = U.clamp(score, 0, 100);

    let text;
    if (score >= 85) text = CS.Rng.pick(G, cfg.texts.great);
    else if (score >= 70) text = CS.Rng.pick(G, cfg.texts.good);
    else if (score >= 50) text = CS.Rng.pick(G, cfg.texts.mid);
    else text = CS.Rng.pick(G, cfg.texts.bad);
    if (npc.metrics.abandonReason === '等太久') text = '排了太久没人收银，我放下东西走了。';
    if (npc.metrics.stockouts && npc.basket.length === 0) text = '想买的东西一件都没有，只能空手离开。';

    return {
      score: Math.round(score * 10) / 10,
      dims,
      text,
      sats,
      bought: npc.basket.length,
      valid: true
    };
  };

  /* ------------------------------ 收银 ------------------------------ */
  W.counterQueue = function (G, counter) {
    return G.npcs.filter(n => n.state === 'QUEUE').sort((a, b) => (a.queueEnterMinute || 0) - (b.queueEnterMinute || 0));
  };

  /* 收银员站位：柜台离门口最远的一侧（视觉上"站在柜台后面"） */
  W.counterStaffSpot = function (G, counter) {
    const cells = Grid.accessCells(G, counter);
    if (!cells.length) return null;
    cells.sort((a, b) => U.dist(b.x, b.y, DOOR_CX, DOOR.y + 0.5) - U.dist(a.x, a.y, DOOR_CX, DOOR.y + 0.5));
    return cells[0];
  };

  W.staffNearCounter = function (G, counter) {
    const spot = W.counterStaffSpot(G, counter);
    if (!spot) return null;
    for (const e of G.employees) {
      if (!e.onDuty || e.main !== 'cashier') continue;
      if (U.dist(e.x, e.y, spot.x, spot.y) < 1.2) return e;
    }
    return null;
  };

  W.playerNearCounter = function (G, counter) {
    const p = G.player;
    const cx = U.clamp(p.x, counter.x, counter.x + counter.w);
    const cy = U.clamp(p.y, counter.y, counter.y + counter.h);
    return Math.hypot(p.x - cx, p.y - cy) < 2.2;
  };

  W.updateCounters = function (G, dtMin) {
    for (const counter of CS.Inv.counters(G)) {
      const queue = W.counterQueue(G, counter);
      if (counter.service) {
        const svc = counter.service;
        const npc = G.npcs.find(n => n.id === svc.npcId);
        if (!npc || npc.state !== 'QUEUE') { counter.service = null; continue; }
        svc.elapsed += dtMin;
        if (svc.elapsed >= svc.duration) {
          W.checkout(G, counter, npc, svc.by);
          counter.service = null;
        }
        continue;
      }
      if (!queue.length) continue;
      const head = queue[0];
      const staff = W.staffNearCounter(G, counter);
      let duration, by;
      if (staff) {
        duration = 4 / W.employeePerf(staff);
        by = 'staff';
        staff.completedMainToday = staff.completedMainToday || staff.main === 'cashier';
      } else if (W.playerNearCounter(G, counter)) {
        duration = 6;   // 店主在场但没按 E：站着也能逐步处理
        by = 'player-presence';
      } else if (G.options.selfCheckout) {
        duration = 9;
        by = 'self';
      } else {
        continue;
      }
      counter.service = { npcId: head.id, elapsed: 0, duration, by };
    }
  };

  W.checkout = function (G, counter, npc, by) {
    let revenue = 0, profit = 0, cardRevenue = 0;
    const items = [];
    for (const it of npc.basket) {
      if (it.kind === 'sku') {
        revenue += it.price;
        const cost = G.products[it.sku].costAvg || I.products[it.sku].purchase;
        profit += it.price - cost;
        items.push(it.sku);
        CS.Market.record.sale(G, it.sku, 1);
        G.today.itemsSold += 1;
      } else if (it.kind === 'card') {
        const card = G.cards.find(c => c.id === it.cardId);
        if (card) {
          const table = G.facilities.find(x => x.id === it.facilityId);
          if (table) table.cards = (table.cards || []).filter(id => id !== card.id);
          card.location = 'sold';
          card.reservedBy = null;
          card.facilityId = null;
          card.history.push({ day: G.clock.day, event: '售出给 ' + npc.name });
          cardRevenue += it.price;
          revenue += it.price;
          CS.Ledger.add(G, 'cardRevenue', it.price, '售出卡牌 ' + card.name, { card: card.id, npc: npc.id });
          G.today.cardRevenue = (G.today.cardRevenue || 0) + it.price;
        }
      }
    }
    if (revenue > 0) {
      G.money += revenue;
      G.today.revenue += revenue;
      if (cardRevenue < revenue) {
        CS.Ledger.add(G, 'revenue', revenue - cardRevenue, '商品销售（' + npc.name + '）', { npc: npc.id });
      }
      G.stats.totalRevenue += revenue;
      const ups = CS.Progression.addProfit(G, profit);
      if (ups.length) CS.Game.notifyLevelUp(G, ups);
    }
    /* 使用设施增加耐久损耗 */
    counter.usage = (counter.usage || 0) + 1;
    counter.durability = Math.max(0, counter.durability - C.durability.usageLoss);
    for (const it of npc.basket) {
      if (it.kind === 'sku') {
        const f = G.facilities.find(x => x.id === it.facilityId);
        if (f) { f.usage = (f.usage || 0) + 1; f.durability = Math.max(0, f.durability - C.durability.usageLoss * 0.5); }
      }
    }
    if (npc.special && npc.special !== 'reporter') npc.mood = Math.min(5, npc.mood + 1);
    W.finishVisit(G, npc, true);
  };

  W.playerServe = function (G) {
    const counter = CS.Inv.counters(G)[0];
    if (!counter) return { ok: false, reason: '没有收银台' };
    if (!W.playerNearCounter(G, counter)) return { ok: false, reason: '走近收银台才能结账' };
    const queue = W.counterQueue(G, counter);
    if (!queue.length) return { ok: false, reason: '没有等待结账的顾客' };
    const npc = queue[0];
    if (counter.service) counter.service = null;
    W.checkout(G, counter, npc, 'player');
    return { ok: true, npc };
  };

  /* ------------------------------ 快递站 / 玩家搬货 ------------------------------ */
  W.nearStation = function (G) {
    const p = G.player;
    const l = C.layout;
    return U.dist(p.x, p.y, STATION.x, STATION.y) < 1.85 ||
      (p.y > l.rows - 0.1 && p.y < l.rows + 0.9 && Math.abs(p.x - STATION.x) < 2.2);
  };

  W.pickParcel = function (G) {
    if (G.player.carry) return { ok: false, reason: '手上已经抱着一个快递箱' };
    if (!W.nearStation(G)) return { ok: false, reason: '需要走到门口快递站' };
    const pc = G.inventory.parcels.find(p => !p.claim);
    if (!pc) return { ok: false, reason: '快递站没有可取的箱子' };
    G.inventory.parcels = G.inventory.parcels.filter(p => p.id !== pc.id);
    pc.state = 'carried';
    pc.claim = 'player';
    G.player.carry = pc;
    return { ok: true, parcel: pc };
  };

  W.deliverCarried = function (G, facility) {
    const pc = G.player.carry;
    if (!pc) return { ok: false, reason: '没有搬运中的箱子' };
    const result = W.unloadParcel(G, pc, facility, { warehouseFallback: true });
    G.player.carry = null;
    pc.state = 'done';
    return { ok: true, result };
  };

  /* 把一箱货倒入货架，剩余进仓库（或退回快递站） */
  W.unloadParcel = function (G, parcel, facility, opts) {
    opts = opts || {};
    const out = { shelved: 0, stored: 0, returned: 0, detail: [] };
    const shelf = facility && (I.facilities[facility.typeId].kind === 'shelf' || I.facilities[facility.typeId].kind === 'display') ? facility : null;
    const warehouse = facility && I.facilities[facility.typeId].kind === 'warehouse' ? facility : null;
    const leftover = [];
    for (const c of parcel.contents) {
      let qty = c.qty;
      if (shelf) {
        const add = CS.Inv.addToShelf(G, shelf, c.sku, qty);
        if (add) { out.shelved += add; out.detail.push(I.products[c.sku].name + ' 上架 ' + add); }
        qty -= add;
      }
      if (qty > 0 && (warehouse || opts.warehouseFallback)) {
        const add = CS.Inv.addToWarehouse(G, c.sku, qty);
        if (add) { out.stored += add; out.detail.push(I.products[c.sku].name + ' 入库 ' + add); qty -= add; }
      }
      if (qty > 0) leftover.push({ sku: c.sku, qty });
    }
    if (leftover.length) {
      const back = {
        id: 'p' + (G.inventory.nextParcelId++),
        supplier: parcel.supplier,
        contents: leftover,
        arrivedDay: G.clock.day,
        arrivedMinute: G.clock.minute,
        claim: null,
        state: 'station'
      };
      G.inventory.parcels.push(back);
      out.returned = leftover.reduce((a, c) => a + c.qty, 0);
    }
    parcel.contents = [];
    return out;
  };

  /* ------------------------------ 员工 ------------------------------ */
  W.employeeEff = function (emp) {
    const lvl = C.staffLevelEff[emp.level] || 1;
    const m = emp.spec[emp.main] || 0;
    const spec = 1 + C.staffSpec.factor * (m / (m + C.staffSpec.k));
    return lvl * spec;
  };

  /* 士气系数：0 士气 ≈ 0.82×，满士气 ≈ 1.14× */
  W.employeeMoraleMul = function (emp) {
    const si = C.staffInteract;
    const max = si.moraleMax || 100;
    const m = U.clamp(emp.morale == null ? (si.moraleStart || 62) : emp.morale, 0, max);
    const t = m / Math.max(1, max);
    return (si.moraleEffMin || 0.82) + ((si.moraleEffMax || 1.14) - (si.moraleEffMin || 0.82)) * t;
  };

  /* 实际工作效率 = 等级 × 专精 × 士气 */
  W.employeePerf = function (emp) {
    return W.employeeEff(emp) * W.employeeMoraleMul(emp);
  };

  W.employeeMoodLabel = function (emp) {
    const si = C.staffInteract;
    const m = emp.morale == null ? si.moraleStart : emp.morale;
    if (m >= 85) return { text: '干劲十足', color: '#6ee0a0' };
    if (m >= 65) return { text: '状态良好', color: '#9ee6a0' };
    if (m >= (si.moraleLowLine || 35)) return { text: '一般', color: '#ffd479' };
    if (m >= 18) return { text: '有点疲惫', color: '#ef9f6c' };
    return { text: '士气低落', color: '#ef6f6c' };
  };

  W.hireEmployee = function (G, level, main, sec1, sec2) {
    const wage = C.wages[level];
    if (!wage) return { ok: false, reason: '员工等级无效' };
    const names = ['小野', '高木', '森田', '冈本', '藤井', '青木', '木村', '三浦'];
    const emp = {
      id: 'e' + (G.nextEmpId++),
      name: CS.Rng.pick(G, names) + (G.employees.length + 1) + '号',
      level,
      wage,
      main,
      sec1,
      sec2,
      spec: { restock: 0, cashier: 0, carry: 0 },
      x: DOOR_CX,
      y: DOOR.y + 0.3,
      dir: 'up',
      state: 'idle',
      path: [],
      carry: null,
      claimParcel: null,
      claimFacility: null,
      onDuty: true,
      completedMainToday: false,
      servedCount: 0,
      cooldown: 0,
      /* 士气与关系：玩家靠近按 E 可交谈、发奖金、调整任务 */
      morale: C.staffInteract.moraleStart || 62,
      relation: 0,
      talkedDay: 0,
      bonusDay: 0,
      hiredDay: G.clock.day,
      lastChat: null
    };
    G.employees.push(emp);
    return { ok: true, employee: emp };
  };

  W.fireEmployee = function (G, empId) {
    const emp = G.employees.find(e => e.id === empId);
    if (!emp) return { ok: false, reason: '员工不存在' };
    W.releaseClaims(G, emp);
    if (emp.carry) {
      G.inventory.parcels.push({
        id: 'p' + (G.inventory.nextParcelId++), supplier: emp.carry.supplier,
        contents: emp.carry.contents, arrivedDay: G.clock.day, arrivedMinute: G.clock.minute, claim: null, state: 'station'
      });
      emp.carry = null;
    }
    G.employees = G.employees.filter(e => e.id !== empId);
    return { ok: true };
  };

  W.releaseClaims = function (G, emp) {
    for (const pc of G.inventory.parcels) if (pc.claim === emp.id) pc.claim = null;
    for (const f of G.facilities) if (f.claim === emp.id) f.claim = null;
    emp.claimParcel = null;
    emp.claimFacility = null;
  };

  /* ------------------------------ 玩家与员工互动 ------------------------------ */
  W.nearestEmployee = function (G, x, y, range) {
    let best = null, bd = range == null ? (C.staffInteract.talkRange || 1.7) : range;
    for (const e of G.employees) {
      if (!e.onDuty) continue;
      const d = U.dist(e.x, e.y, x, y);
      if (d <= bd) { bd = d; best = e; }
    }
    return best;
  };

  W.employeeChat = function (G, emp) {
    const si = C.staffInteract;
    if (emp.talkedDay === G.clock.day) return { ok: false, reason: '今天已经聊过了，让 TA 先忙' };
    emp.talkedDay = G.clock.day;
    const before = emp.morale == null ? si.moraleStart : emp.morale;
    emp.morale = U.clamp(before + (si.chatMorale || 9), 0, si.moraleMax || 100);
    emp.relation = (emp.relation || 0) + (si.chatRelation || 1);
    const lines = [
      '「老板，这批货我理完了，货架顺手也擦了。」',
      '「刚才那位客人问了很多评级的事，我按你教的说了一遍。」',
      '「今天客流不错，就是收银台有点忙不过来。」',
      '「仓库最里面那箱还没拆，等会儿我去处理。」',
      '「老板，咱们要不要进点新卡包？客人一直在问。」'
    ];
    const line = lines[Math.abs((emp.name.length * 7 + G.clock.day * 3) % lines.length)];
    W.logInteraction(G, {
      kind: 'staff', who: emp.name,
      text: '聊了两句，士气 +' + (si.chatMorale || 9) + '（' + Math.round(before) + ' → ' + Math.round(emp.morale) + '）',
      delta: Math.round(emp.morale) - Math.round(before)
    });
    return { ok: true, line, morale: Math.round(emp.morale), gain: Math.round(emp.morale) - Math.round(before) };
  };

  W.employeeBonus = function (G, emp) {
    const si = C.staffInteract;
    const cost = si.bonusCost || 80;
    if (emp.bonusDay === G.clock.day) return { ok: false, reason: '今天已经发过奖金了' };
    if (G.money < cost) return { ok: false, reason: '资金不足（需要 ' + U.money(cost) + '）' };
    G.money -= cost;
    CS.Ledger.add(G, 'other', -cost, '员工奖金·' + emp.name, { staff: emp.id });
    const before = emp.morale == null ? si.moraleStart : emp.morale;
    emp.morale = U.clamp(before + (si.bonusMorale || 20), 0, si.moraleMax || 100);
    emp.relation = (emp.relation || 0) + (si.bonusRelation || 2);
    emp.bonusDay = G.clock.day;
    /* 其他员工看在眼里，士气小幅提升 */
    for (const o of G.employees) {
      if (o.id === emp.id || !o.onDuty) continue;
      o.morale = U.clamp((o.morale == null ? si.moraleStart : o.morale) + 2, 0, si.moraleMax || 100);
    }
    W.logInteraction(G, {
      kind: 'staff', who: emp.name,
      text: '发放奖金 ' + U.money(cost) + '，士气 +' + Math.round(emp.morale - before),
      delta: Math.round(emp.morale) - Math.round(before)
    });
    return { ok: true, cost, morale: Math.round(emp.morale) };
  };

  W.praiseEmployee = function (G, emp) {
    const si = C.staffInteract;
    if (emp.praiseDay === G.clock.day) return { ok: false, reason: '今天已经肯定过了' };
    emp.praiseDay = G.clock.day;
    const before = emp.morale == null ? si.moraleStart : emp.morale;
    emp.morale = U.clamp(before + (si.praiseMorale || 4), 0, si.moraleMax || 100);
    W.logInteraction(G, { kind: 'staff', who: emp.name, text: '肯定了工作表现，士气 +' + (si.praiseMorale || 4) });
    return { ok: true, morale: Math.round(emp.morale) };
  };

  W.setEmployeeTask = function (G, emp, task) {
    if (!task) return { ok: false, reason: '任务无效' };
    if (task !== 'idle' && !C.staffTasks.some(t => t.id === task)) return { ok: false, reason: '未知任务' };
    emp.main = task;
    emp.state = 'idle';
    emp.path = [];
    emp.cooldown = 0.1;
    W.releaseClaims(G, emp);
    const name = (C.staffTasks.find(t => t.id === task) || {}).name || task;
    W.logInteraction(G, { kind: 'staff', who: emp.name, text: '主要任务调整为「' + name + '」' });
    return { ok: true, task, name };
  };

  W.toggleEmployeeDuty = function (G, emp) {
    emp.onDuty = !emp.onDuty;
    if (!emp.onDuty) {
      emp.state = 'idle';
      emp.path = [];
      W.releaseClaims(G, emp);
      if (emp.carry) W.returnParcelToStation(G, emp);
    }
    W.logInteraction(G, { kind: 'staff', who: emp.name, text: emp.onDuty ? '恢复出勤' : '安排休息' });
    return { ok: true, onDuty: emp.onDuty };
  };

  W.employeeLine = function (G, emp) {
    const mood = W.employeeMoodLabel(emp);
    const task = (C.staffTasks.find(t => t.id === emp.main) || {}).name || '自由活动';
    return '「' + mood.text + '」当前负责' + task + '。';
  };


  W.updateEmployee = function (G, emp, dtMin) {
    if (!emp.onDuty) return;
    const perf = W.employeePerf(emp);
    const speed = W.employeeBaseSpeed() * perf;

    if (emp.state === 'idle') {
      emp.cooldown -= dtMin;
      if (emp.cooldown > 0) return;
      const order = [emp.main, emp.sec1, emp.sec2];
      for (const task of order) {
        if (W.startTask(G, emp, task)) return;
      }
      /* 无任务：在店内闲逛 */
      if (!emp.path.length && CS.Rng.next(G) < 0.01) {
        const free = [];
        if (G.cells) for (const k in G.cells) { const [x, y] = k.split(',').map(Number); if (Grid.cellFree(G, x, y)) free.push({ x, y }); }
        if (free.length) { const t = CS.Rng.pick(G, free); W.pathTo(G, emp, t.x, t.y); }
      }
      W.moveEntity(G, emp, dtMin, W.employeeIdleSpeed() * perf);
      return;
    }

    if (emp.state === 'toParcel') {
      const target = { x: DOOR_CX, y: DOOR.y + 0.45 };
      if (!emp.path.length) W.pathTo(G, emp, target.x, target.y);
      const arrived = U.dist(emp.x, emp.y, target.x, target.y) < 0.7;
      W.moveEntity(G, emp, dtMin, speed);
      if (arrived || !emp.path.length) {
        const pc = G.inventory.parcels.find(p => p.id === emp.claimParcel);
        if (!pc) { emp.state = 'idle'; emp.cooldown = 0.2; return; }
        G.inventory.parcels = G.inventory.parcels.filter(p => p.id !== pc.id);
        pc.state = 'carried';
        pc.claim = emp.id;
        emp.carry = pc;
        /* 找到目标货架 */
        const shelf = emp.intent === 'carry' ? null : W.pickRestockShelf(G, pc, emp);
        if (!shelf) {
          emp.state = 'toWarehouse';
          emp.claimFacility = null;
          const wh = CS.Inv.warehouses(G)[0];
          if (!wh) { W.returnParcelToStation(G, emp); return; }
          const acc = Grid.nearestAccess(G, wh, emp.x, emp.y);
          if (acc) W.pathTo(G, emp, acc.cx, acc.cy);
          return;
        }
        emp.claimFacility = shelf.id;
        const acc = Grid.nearestAccess(G, shelf, emp.x, emp.y);
        if (acc) W.pathTo(G, emp, acc.cx, acc.cy);
        emp.state = 'toShelf';
      }
      return;
    }

    if (emp.state === 'toShelf' || emp.state === 'toWarehouse') {
      const f = G.facilities.find(x => x.id === emp.claimFacility);
      const isWh = emp.state === 'toWarehouse';
      let target = null;
      if (f) {
        const acc = Grid.nearestAccess(G, f, emp.x, emp.y);
        if (acc) target = { x: acc.x, y: acc.y };
      } else if (isWh) {
        target = { x: DOOR_CX, y: DOOR.y + 0.45 };
      }
      if (target && !emp.path.length) W.pathTo(G, emp, target.x, target.y);
      W.moveEntity(G, emp, dtMin, speed);
      if (target && (U.dist(emp.x, emp.y, target.x, target.y) < 0.9)) {
        if (isWh) {
          const wh = CS.Inv.warehouses(G)[0];
          if (wh && emp.carry) {
            const res = W.unloadParcel(G, emp.carry, wh, { warehouseFallback: false });
            emp.completedMainToday = emp.completedMainToday || emp.main === 'carry';
          }
          emp.carry = null;
        } else if (emp.carry && G.facilities.find(x => x.id === emp.claimFacility)) {
          const shelf = G.facilities.find(x => x.id === emp.claimFacility);
          const res = W.unloadParcel(G, emp.carry, shelf, { warehouseFallback: true });
          emp.carry = null;
          if (res.shelved > 0) emp.completedMainToday = emp.completedMainToday || emp.main === 'restock';
        }
        W.releaseClaims(G, emp);
        emp.state = 'idle';
        emp.cooldown = 0.15;
      }
      return;
    }

    if (emp.state === 'cashier') {
      const counter = CS.Inv.counters(G)[0];
      if (!counter) { emp.state = 'idle'; return; }
      const spot = W.counterStaffSpot(G, counter) || Grid.nearestAccess(G, counter, emp.x, emp.y);
      if (!spot) { emp.state = 'idle'; return; }
      if (U.dist(emp.x, emp.y, spot.x, spot.y) > 0.45 && emp.path.length === 0) W.pathTo(G, emp, spot.cx != null ? spot.cx : spot.x, spot.cy != null ? spot.cy : spot.y);
      W.moveEntity(G, emp, dtMin, speed);
      /* 收银实际服务由 updateCounters 处理 */
      return;
    }
  };

  W.returnParcelToStation = function (G, emp) {
    if (emp.carry) {
      G.inventory.parcels.push({
        id: 'p' + (G.inventory.nextParcelId++),
        supplier: emp.carry.supplier,
        contents: emp.carry.contents,
        arrivedDay: G.clock.day, arrivedMinute: G.clock.minute,
        claim: null, state: 'station'
      });
      emp.carry = null;
    }
    W.releaseClaims(G, emp);
    emp.state = 'idle';
    emp.cooldown = 0.5;
  };

  W.pickRestockShelf = function (G, parcel, emp) {
    /* 选择能容纳该箱最多商品的货架 */
    let best = null, bestScore = -1;
    for (const f of CS.Inv.shelves(G)) {
      if (f.claim && f.claim !== 'player') continue;
      let score = 0;
      for (const c of parcel.contents) {
        if (CS.Inv.shelfFree(f, c.sku) > 0) score += Math.min(c.qty, CS.Inv.shelfFree(f, c.sku));
      }
      if (score > bestScore) { bestScore = score; best = f; }
    }
    if (bestScore <= 0) return null;
    best.claim = emp ? emp.id : 'emp';
    return best;
  };

  W.startTask = function (G, emp, task) {
    if (!task || task === 'idle') return false;
    if (task === 'cashier') {
      const counter = CS.Inv.counters(G)[0];
      if (!counter) return false;
      emp.state = 'cashier';
      emp.path = [];
      const spot = W.counterStaffSpot(G, counter);
      if (spot) W.pathTo(G, emp, spot.cx, spot.cy);
      return true;
    }
    if (task === 'restock' || task === 'carry') {
      const free = G.inventory.parcels.filter(p => !p.claim);
      if (!free.length) {
        if (task === 'restock') return W.startWarehouseRestock(G, emp);
        return false;
      }
      const pc = free[0];
      pc.claim = emp.id;
      emp.claimParcel = pc.id;
      emp.intent = task;
      emp.state = 'toParcel';
      emp.path = [];
      return true;
    }
    return false;
  };

  /* 没有快递箱时，从仓库补货到空货架 */
  W.startWarehouseRestock = function (G, emp) {
    const shelves = CS.Inv.shelves(G).filter(f => !f.claim);
    const wh = CS.Inv.warehouses(G)[0];
    if (!wh || !shelves.length) return false;
    /* 找出仓库里有、货架上缺的 SKU */
    let target = null, targetSku = null;
    for (const sku of Object.keys(G.inventory.warehouse)) {
      if ((G.inventory.warehouse[sku] || 0) <= 0) continue;
      for (const f of shelves) {
        if (CS.Inv.shelfFree(f, sku) > 0) { target = f; targetSku = sku; break; }
      }
      if (target) break;
    }
    if (!target) return false;
    const moved = CS.Inv.takeFromWarehouse(G, targetSku, Math.min(12, G.inventory.warehouse[targetSku]));
    CS.Inv.addToShelf(G, target, targetSku, moved);
    target.usage = (target.usage || 0) + 1;
    emp.completedMainToday = emp.completedMainToday || emp.main === 'restock';
    emp.cooldown = 0.3;
    /* 移动表现：去货架附近 */
    const acc = Grid.nearestAccess(G, target, emp.x, emp.y);
    if (acc) W.pathTo(G, emp, acc.cx, acc.cy);
    emp.state = 'idle';
    return true;
  };

  /* ------------------------------ 交互查询 ------------------------------ */
  W.interaction = function (G) {
    const p = G.player;
    const cands = [];
    const push = (type, label, f, extra) => {
      if (!f && !extra) return;
      let d;
      if (f) {
        const cx = U.clamp(p.x, f.x, f.x + f.w);
        const cy = U.clamp(p.y, f.y, f.y + f.h);
        d = Math.hypot(p.x - cx, p.y - cy);
      } else {
        d = Math.hypot(p.x - extra.x, p.y - extra.y);
      }
      cands.push({ type, label, facility: f || null, dist: d, extra: extra || null });
    };

    if (p.carry) {
      const f = W.nearFacility(G, p.x, p.y, ['shelf', 'ironrack', 'display', 'warehouse'], 2.0);
      if (f) {
        const kind = I.facilities[f.typeId].kind;
        push(kind === 'warehouse' ? 'store' : 'shelve', kind === 'warehouse' ? 'E 存入仓库' : 'E 补货上架', f);
      }
    } else {
      if (W.nearStation(G) && G.inventory.parcels.some(x => !x.claim)) {
        push('parcel', 'E 取快递箱', null, { x: STATION.x, y: STATION.y });
      }
    }

    /* 与顾客交谈：靠近即可互动；有推销报价时提示金额 */
    const nearNpc = W.nearestTalkableNpc(G, p.x, p.y, C.npcInteract.talkRange || 1.8);
    if (nearNpc) {
      let label = 'E 与 ' + nearNpc.name + ' 交谈';
      if (nearNpc.offer) label = 'E 听 ' + nearNpc.name + ' 推销卡牌（' + U.money(nearNpc.offer.ask) + '）';
      else if (nearNpc.state === 'PLAYING') label = 'E 和 ' + nearNpc.name + ' 聊两句（对局中）';
      const d = U.dist(p.x, p.y, nearNpc.x, nearNpc.y);
      cands.push({ type: 'npc', label, facility: null, dist: d, extra: { x: nearNpc.x, y: nearNpc.y }, npc: nearNpc });
    }

    /* 与员工交谈：可聊天、发奖金、调岗、安排休息 */
    const nearEmp = W.nearestEmployee(G, p.x, p.y, C.staffInteract.talkRange || 1.7);
    if (nearEmp) {
      const mood = W.employeeMoodLabel(nearEmp);
      cands.push({
        type: 'employee',
        label: 'E 与 ' + nearEmp.name + ' 交谈（' + mood.text + '）',
        facility: null,
        dist: U.dist(p.x, p.y, nearEmp.x, nearEmp.y),
        extra: { x: nearEmp.x, y: nearEmp.y },
        employee: nearEmp
      });
    }

    const counter = CS.Inv.counters(G)[0];
    if (counter && W.playerNearCounter(G, counter)) {
      const q = W.counterQueue(G, counter);
      if (q.length) push('counter', 'E 为 ' + q[0].name + ' 结账', counter);
    }

    const nearF = W.nearFacility(G, p.x, p.y, null, 1.8);
    if (nearF && !p.carry) {
      const kind = I.facilities[nearF.typeId].kind;
      if (kind === 'cardtable') push('cardtable', 'E 查看卡牌桌', nearF);
      else if (kind === 'gametable') push('gametable', 'E 查看游戏桌', nearF);
      else if (kind === 'warehouse') push('warehouse', 'E 查看仓库', nearF);
      else if (kind === 'shelf' || kind === 'display') push('shelf', 'E 查看货架', nearF);
      else if (kind === 'counter') {
        const q = W.counterQueue(G, nearF);
        if (q.length) push('counter', 'E 为 ' + q[0].name + ' 结账', nearF);
      }
    }

    if (!cands.length) return null;
    /* 收银台优先：站在柜台边时不能被“交谈”提示顶掉结账 */
    cands.sort((a, b) => (a.type === 'counter' ? 0 : 1) - (b.type === 'counter' ? 0 : 1) || a.dist - b.dist);
    return cands[0];
  };

  W.doInteract = function (G) {
    const it = W.interaction(G);
    if (!it) return { ok: false, reason: '附近没有可交互目标' };
    if (it.type === 'parcel') return W.pickParcel(G);
    if (it.type === 'shelve' || it.type === 'store') return W.deliverCarried(G, it.facility);
    if (it.type === 'counter') return W.playerServe(G);
    if (it.type === 'npc') return { ok: true, ui: 'npc', npc: it.npc };
    if (it.type === 'employee') return { ok: true, ui: 'employee', employee: it.employee };
    return { ok: true, ui: it.type, facility: it.facility };
  };

  W.STATION = STATION;
  W.DOOR = DOOR;
})(typeof window !== 'undefined' ? window : globalThis);
