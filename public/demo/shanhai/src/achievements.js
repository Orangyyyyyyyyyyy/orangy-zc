/* ============================================================
 * 山海司·巡荒录  —  成就判定 achievements.js
 * P0 5.11.2 50 项；只解锁，不发属性奖励（P4 37 合规）
 * ============================================================ */
(function (root) {
  'use strict';
  const SH = (root.SH = root.SH || {});

  const A = (SH.ach = {});

  function meta() { return SH.loadMeta(); }

  A.unlock = function (id) {
    const a = SH.ACHIEVEMENT_BY_ID[id];
    if (!a || a.notReady) return false;
    const m = meta();
    m.achievements = m.achievements || {};
    if (m.achievements[id]) return false;
    m.achievements[id] = Date.now();
    SH.saveMeta(m);
    SH.ach.last = a;
    return true;
  };

  function has(m, id) { return !!(m.achievements && m.achievements[id]); }

  /* ---------------- 战斗结束 ---------------- */
  A.onBattle = function (run, b, kind) {
    const st = run.stats;
    const win = b.over === 'victory';
    if (!win) return [];
    const got = [];
    const tryA = (id, cond) => { if (cond && A.unlock(id)) got.push(id); };
    tryA('A01', st.battles >= 1);
    tryA('A04', kind === 'battle' && b.hero.hp === b.hero.maxHp);
    tryA('A05', st.bosses >= 3);
    tryA('A07', (b.purifiedCount || 0) >= 2);
    tryA('A08', (b.stats.maxHit || 0) >= 10);
    tryA('A09', kind === 'boss' && b.hero.hp === b.hero.maxHp);
    tryA('A10', kind === 'boss' && b.hero.hp <= 3);
    tryA('A11', kind === 'battle' && b.stats.turns <= 3);
    tryA('A12', kind === 'battle' && (b.stats.summons || 0) === 0);
    tryA('A13', kind === 'elite' && (b.stats.feralPlays || 0) === 0);
    tryA('A14', kind === 'elite' && (b.stats.tamePlays || 0) === 0);
    tryA('A16', (b.stats.maxChain || 0) >= 3);
    tryA('A18', (b.stats.flips || 0) >= 5);
    tryA('A27', (b.stats.summons || 0) >= 5);
    return got;
  };

  /* ---------------- 局末 ---------------- */
  A.onRunEnd = function (run, win) {
    const st = run.stats || {};
    const got = [];
    const tryA = (id, cond) => { if (cond && A.unlock(id)) got.push(id); };
    const diff = run.difficulty || 0;
    const elems = {};
    run.deck.forEach((c) => {
      const d = SH.CARD_BY_ID[c.id];
      if (d && d.element !== '无') elems[d.element] = (elems[d.element] || 0) + 1;
    });
    const sameElem = Math.max(0, ...Object.values(elems));
    const curse = run.relics.filter((id) => (SH.RELIC_BY_ID[id] || {}).rarity === 'curse').length;

    tryA('A02', st.bosses >= 1);
    tryA('A03', win && diff === 0);
    tryA('A15', win && diff >= 5);
    tryA('A17', Object.keys(elems).length >= 5);
    tryA('A19', win && (st.eroded || 0) === 0);
    tryA('A20', win && run.deck.length <= 10);
    tryA('A21', win && run.deck.length >= 30);
    tryA('A22', (run.clears.mutates || 0) >= 3);
    tryA('A23', (run.clears.upgrades || 0) >= 5);
    tryA('A24', (run.omens || []).length >= 3);
    tryA('A25', curse >= 2);
    tryA('A26', win && sameElem >= 15);
    tryA('A28', run.husui >= 200);
    tryA('A29', win && (st.shopBuys || 0) === 0);
    tryA('A30', (st.shopBuys || 0) >= 5);
    tryA('A31', (st.altarUses || 0) >= 3);
    tryA('A32', (run.clears.removes || 0) >= 3);
    tryA('A33', win && run.husui <= 5);
    tryA('A34', (st.eventChoices || 0) >= 5);
    tryA('A35', (st.paidHp || 0) >= 5);
    tryA('A36', (st.codexSeen || 0) >= 10);
    tryA('A39', (meta().heroWins || 0) >= 4);
    tryA('A41', win && diff >= 10);
    tryA('A44', win && diff >= 1);
    tryA('A45', win && diff >= 3);
    tryA('A46', win && diff >= 5);
    tryA('A47', win && diff >= 7);
    tryA('A48', win && diff >= 9);

    if (win) {
      const m = meta();
      m.heroWins = m.heroWins || {};
      m.heroWins[run.heroId] = true;
      if (Object.keys(m.heroWins).length >= 4) tryA('A39', true);
      SH.saveMeta(m);
    }
    return got;
  };
})(typeof window !== 'undefined' ? window : globalThis);
