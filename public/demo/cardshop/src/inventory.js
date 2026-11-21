/* ==========================================================================
 * 库存服务：快递站 → 货架 / 仓库 → 销售
 * 唯一事实来源：任何商品数量只能通过这些函数改变（对应技术方案 §08）
 * ========================================================================== */
(function (root) {
  'use strict';
  const CS = (root.CS = root.CS || {});
  const C = CS.CONTENT;
  const I = CS.INDEX;
  const U = CS.Util;

  const Inv = CS.Inv = {};

  Inv.shelves = (G) => G.facilities.filter(f => (I.facilities[f.typeId].kind === 'shelf' || I.facilities[f.typeId].kind === 'display'));
  Inv.warehouses = (G) => G.facilities.filter(f => I.facilities[f.typeId].kind === 'warehouse');
  Inv.counters = (G) => G.facilities.filter(f => I.facilities[f.typeId].kind === 'counter');
  Inv.cardTables = (G) => G.facilities.filter(f => I.facilities[f.typeId].kind === 'cardtable');
  Inv.gameTables = (G) => G.facilities.filter(f => I.facilities[f.typeId].kind === 'gametable');

  Inv.shelfCapPerSku = function (f, sku) {
    const def = I.facilities[f.typeId];
    const p = I.products[sku];
    return Math.max(1, Math.floor(def.itemSlots / Math.max(1, p.space)));
  };

  Inv.shelfUsedSkus = function (f) {
    return Object.keys(f.stock).filter(k => f.stock[k] > 0).length;
  };

  /* 货架某 SKU 还能放多少 */
  Inv.shelfFree = function (f, sku) {
    const def = I.facilities[f.typeId];
    const cur = f.stock[sku] || 0;
    if (cur <= 0 && Inv.shelfUsedSkus(f) >= def.skuSlots) return 0;
    return Math.max(0, Inv.shelfCapPerSku(f, sku) - cur);
  };

  /* 上架，返回实际放入数量 */
  Inv.addToShelf = function (G, f, sku, qty) {
    const free = Inv.shelfFree(f, sku);
    const add = Math.min(free, qty);
    if (add > 0) f.stock[sku] = (f.stock[sku] || 0) + add;
    return add;
  };

  Inv.takeFromShelf = function (G, f, sku, qty) {
    const cur = f.stock[sku] || 0;
    const take = Math.min(cur, qty);
    f.stock[sku] = cur - take;
    if (f.stock[sku] <= 0) delete f.stock[sku];
    return take;
  };

  /* 仓库容量：每个仓库架 24 种商品 × 每种 30 物品格 */
  Inv.warehouseCapacity = function (G) {
    let kinds = 0, slots = 0;
    for (const w of Inv.warehouses(G)) {
      const def = I.facilities[w.typeId];
      kinds += def.skuSlots;
      slots += def.itemSlots;
    }
    return { kinds, slots };
  };

  Inv.warehouseFree = function (G, sku) {
    const cap = Inv.warehouseCapacity(G);
    if (!cap.kinds) return 0;
    const used = Object.keys(G.inventory.warehouse).filter(k => G.inventory.warehouse[k] > 0).length;
    const cur = G.inventory.warehouse[sku] || 0;
    if (cur <= 0 && used >= cap.kinds) return 0;
    const p = I.products[sku];
    const perSku = Math.max(1, Math.floor(cap.slots / Math.max(1, p.space)));
    return Math.max(0, perSku - cur);
  };

  Inv.addToWarehouse = function (G, sku, qty) {
    const add = Math.min(Inv.warehouseFree(G, sku), qty);
    if (add > 0) G.inventory.warehouse[sku] = (G.inventory.warehouse[sku] || 0) + add;
    return add;
  };

  Inv.takeFromWarehouse = function (G, sku, qty) {
    const cur = G.inventory.warehouse[sku] || 0;
    const take = Math.min(cur, qty);
    G.inventory.warehouse[sku] = cur - take;
    if (G.inventory.warehouse[sku] <= 0) delete G.inventory.warehouse[sku];
    return take;
  };

  /* 货架 / 仓库可售库存合计 */
  Inv.totalStock = function (G, sku) {
    let n = G.inventory.warehouse[sku] || 0;
    for (const f of Inv.shelves(G)) n += f.stock[sku] || 0;
    return n;
  };

  /* 快递站 + 运输中的库存 */
  Inv.stationStock = function (G, sku) {
    let n = 0;
    for (const pc of G.inventory.parcels) {
      for (const c of pc.contents) if (c.sku === sku) n += c.qty;
    }
    if (G.player.carry) {
      for (const c of G.player.carry.contents) if (c.sku === sku) n += c.qty;
    }
    return n;
  };

  Inv.everywhere = function (G, sku) {
    return Inv.totalStock(G, sku) + Inv.stationStock(G, sku);
  };

  /* 全店 SKU 上架情况（用于评价） */
  Inv.assortment = function (G) {
    const shelves = Inv.shelves(G);
    const onShelf = new Set();
    let units = 0;
    for (const f of shelves) {
      for (const sku of Object.keys(f.stock)) if (f.stock[sku] > 0) { onShelf.add(sku); units += f.stock[sku]; }
    }
    const unlocked = C.products.filter(p => p.unlockLevel <= G.progression.level);
    return {
      skuCount: onShelf.size,
      unlockedCount: unlocked.length,
      units,
      shelves: shelves.length,
      ratio: shelves.length ? U.clamp(onShelf.size / Math.max(1, Math.min(unlocked.length, shelves.reduce((a, f) => a + I.facilities[f.typeId].skuSlots, 0))), 0, 1) : 0
    };
  };

  /* 找到有该 SKU 库存、且离 (x,y) 最近的货架 */
  Inv.bestShelfWith = function (G, sku, x, y) {
    let best = null, bd = 1e9;
    for (const f of Inv.shelves(G)) {
      if ((f.stock[sku] || 0) <= 0) continue;
      const d = Math.abs(f.x + f.w / 2 - x) + Math.abs(f.y + f.h / 2 - y);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  };

  /* 商店可售商品列表（用于 UI） */
  Inv.skuLocations = function (G, sku) {
    const rows = [];
    for (const f of Inv.shelves(G)) {
      if (f.stock[sku]) rows.push({ facility: f, qty: f.stock[sku] });
    }
    if (G.inventory.warehouse[sku]) rows.push({ facility: null, qty: G.inventory.warehouse[sku], warehouse: true });
    return rows;
  };

  Inv.destroyAtStation = function (G, parcel) {
    const i = G.inventory.parcels.indexOf(parcel);
    if (i >= 0) G.inventory.parcels.splice(i, 1);
  };
})(typeof window !== 'undefined' ? window : globalThis);
