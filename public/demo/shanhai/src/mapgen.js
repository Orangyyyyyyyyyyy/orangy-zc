/* ============================================================
 * 山海司·巡荒录  —  地图生成 mapgen.js
 * 实现 P1 8：卷结构 / 节点权重 / 保底 / 无死路分支
 * 全部随机走 runSeed 派生，保证同种子同图
 * ============================================================ */
(function (root) {
  'use strict';
  const SH = (root.SH = root.SH || {});

  const NODE_META = (SH.NODE_META = {
    battle: { name: '荒战', icon: '刀', desc: '普通战斗：卡牌三选一 + 荒髓' },
    elite: { name: '凶兽巢', icon: '煞', desc: '精英战：遗物 + 稀有卡牌' },
    event: { name: '异兽踪', icon: '踪', desc: '事件：收服、交易或代价' },
    altar: { name: '古祭坛', icon: '祭', desc: '删牌 / 升级 / 异变' },
    shop: { name: '坊市', icon: '市', desc: '购买卡牌、遗物与荒髓' },
    shrine: { name: '山神祠', icon: '祠', desc: '恢复，或立下巡荒誓约' },
    boss: { name: '卷末首领', icon: '荒', desc: '本卷终战' }
  });

  const M = (SH.mapgen = {});

  M.generate = function (volumeIndex, runSeed) {
    const vol = SH.VOLUMES[volumeIndex - 1];
    const rng = SH.makeRng(SH.subSeed(runSeed, 'map', volumeIndex));
    const layers = [];

    // P1 8.1：卷 1/2/3 节点总数 10/11/12；起点 1、首领 1，其余在 1—3 之间分配
    const middle = vol.layers - 2;
    const widths = new Array(middle).fill(1);
    let remaining = Math.max(0, (vol.nodeCount || vol.layers + 2) - 2 - middle);
    let guardW = 0;
    while (remaining > 0 && guardW++ < 100) {
      const idx = rng.int(middle);
      if (widths[idx] < 3) { widths[idx] += 1; remaining -= 1; }
    }
    for (let l = 0; l < vol.layers; l++) {
      const isLast = l === vol.layers - 1;
      const width = isLast || l === 0 ? 1 : widths[l - 1];
      const nodes = [];
      for (let i = 0; i < width; i++) {
        nodes.push({
          id: 'v' + volumeIndex + 'l' + l + 'n' + i,
          layer: l,
          index: i,
          type: isLast ? 'boss' : 'battle',
          visited: false,
          next: []
        });
      }
      layers.push({ index: l, nodes: nodes });
    }

    // 节点类型：按权重
    const w = vol.weights;
    const entries = Object.keys(w).map((k) => ({ v: k, w: w[k] }));
    for (let l = 0; l < layers.length - 1; l++) {
      layers[l].nodes.forEach((n) => {
        let type = rng.weighted(entries);
        if (l === 0 && (type === 'elite' || type === 'boss')) type = 'battle';
        n.type = type;
      });
    }

    // 保底：至少 1 精英 / 1 坊市 / 1 祭坛 / 1 山神祠 / 2 事件
    // 候选过滤：不破坏「首领前一层无精英」「精英不连续层」「首层无精英」
    const isLastIndex = layers.length - 1;
    function eliteSafe(l) {
      if (l === 0 || l === isLastIndex || l === isLastIndex - 1) return false;
      const prev = layers[l - 1].nodes;
      const next = layers[l + 1].nodes;
      return !prev.some((n) => n.type === 'elite') && !next.some((n) => n.type === 'elite');
    }
    function pickCandidate(type) {
      const pool = [];
      layers.forEach((L, li) => {
        if (li === 0 || li === isLastIndex) return;
        if (type === 'elite' && !eliteSafe(li)) return;
        L.nodes.forEach((n) => { if (n.type === 'battle') pool.push(n); });
      });
      if (!pool.length) {
        // 放宽：允许替换其他保底节点；小地图只剩精英时，保留至少 1 个精英后也可替换
        const eliteCount = countType(layers, 'elite');
        layers.forEach((L, li) => {
          if (li === 0 || li === isLastIndex) return;
          if (type === 'elite' && !eliteSafe(li)) return;
          L.nodes.forEach((n) => {
            if (n.type === 'boss' || n.type === type) return;
            if (n.type === 'elite' && type !== 'elite' && eliteCount <= 1) return;
            pool.push(n);
          });
        });
      }
      return pool.length ? rng.pick(pool) : null;
    }

    const guarantees = [['elite', 1], ['shop', 1], ['altar', 1], ['shrine', 1], ['event', 2]];
    guarantees.forEach(([type, need]) => {
      let count = countType(layers, type);
      let guard = 0;
      while (count < need && guard++ < 12) {
        const pick = pickCandidate(type);
        if (!pick) break;
        pick.type = type;
        count += 1;
      }
    });

    // 同层同类型不超过 2：仅把超出的改为荒战，且不减少保底类型数量
    for (let l = 1; l < layers.length - 1; l++) {
      const tally = {};
      layers[l].nodes.forEach((n) => {
        tally[n.type] = (tally[n.type] || 0) + 1;
        if (tally[n.type] > 2 && n.type !== 'elite') n.type = 'battle';
      });
    }

    // 二次校验：若仍缺保底，强制补齐
    guarantees.forEach(([type, need]) => {
      let count = countType(layers, type);
      let guard = 0;
      while (count < need && guard++ < 12) {
        const pick = pickCandidate(type);
        if (!pick) break;
        pick.type = type;
        count += 1;
      }
    });

    // 连线：相邻层 |i-j| <= 1，保证无死路
    for (let l = 0; l < layers.length - 1; l++) {
      const cur = layers[l].nodes;
      const nxt = layers[l + 1].nodes;
      cur.forEach((n, i) => {
        const targets = [];
        nxt.forEach((m, j) => {
          if (Math.abs(i - j) <= 1) targets.push(m.id);
        });
        if (!targets.length) {
          const j = Math.min(i, nxt.length - 1);
          targets.push(nxt[j].id);
        }
        n.next = targets;
      });
      // 保证下一层每个节点都有入边
      nxt.forEach((m, j) => {
        const hasIn = cur.some((n) => n.next.indexOf(m.id) >= 0);
        if (!hasIn) {
          const i = Math.min(j, cur.length - 1);
          cur[i].next.push(m.id);
        }
      });
    }

    const index = {};
    layers.forEach((L) => L.nodes.forEach((n) => { index[n.id] = n; }));

    return {
      volume: volumeIndex,
      name: vol.name,
      layers: layers,
      index: index,
      startIds: layers[0].nodes.map((n) => n.id),
      bossId: layers[layers.length - 1].nodes[0].id
    };
  };

  function countType(layers, type) {
    let c = 0;
    layers.forEach((L) => L.nodes.forEach((n) => { if (n.type === type) c += 1; }));
    return c;
  }

  M.reachable = function (map, currentNodeId) {
    if (!currentNodeId) return map.startIds.slice();
    const node = map.index[currentNodeId];
    return node ? node.next.slice() : [];
  };

  M.node = function (map, id) {
    return map.index[id] || null;
  };

  // 校验：保底 / 无死路 / 首领可达（P1 8.6）
  M.validate = function (map) {
    const errors = [];
    const types = {};
    Object.keys(map.index).forEach((id) => {
      const n = map.index[id];
      types[n.type] = (types[n.type] || 0) + 1;
      if (n.type !== 'boss' && !n.next.length) errors.push('死路节点：' + id);
    });
    ['elite', 'shop', 'altar', 'shrine'].forEach((t) => {
      if (!types[t]) errors.push('缺少保底节点：' + t);
    });
    if ((types.event || 0) < 2) errors.push('事件节点不足 2');
    if (!types.boss) errors.push('缺少首领');
    return errors;
  };
})(typeof window !== 'undefined' ? window : globalThis);
