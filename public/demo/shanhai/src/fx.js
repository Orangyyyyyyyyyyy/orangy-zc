/* ============================================================
 * 山海司·巡荒录  —  特效层 fx.js
 * 职责：把状态变化翻译成"看得见"的一瞬
 *   · 出牌（异兽 / 术法 / 山泽 / 祭仪 / 异变）
 *   · 召唤、翻面、昼夜切换、相生、遗物
 *   · 攻击、受伤、护盾、治疗、状态、阵亡
 *   · 画面转场与启动开场
 * 约束：不参与规则计算；只读 DOM 与 SH.app 的快照，所有节点均为临时节点。
 * ============================================================ */
(function (root) {
  'use strict';
  const SH = (root.SH = root.SH || {});
  const FX = (SH.fx = {});

  const ELEM_COLOR = {
    '金': '#e0c887', '木': '#8fbf7c', '水': '#7fb6dc',
    '火': '#e07a58', '土': '#c9a67c', '无': '#b9bec4'
  };
  const TYPE_LABEL = { beast: '异兽', spell: '术法', terrain: '山泽', ritual: '祭仪' };

  let layer = null;       // 战斗内特效（粒子、刀光、数字）
  let screenLayer = null; // 全屏特效（昼夜、转场、回合横幅）
  let ambient = null;
  let booted = false;
  let prev = null;        // 上一次渲染后的状态快照
  let pendingCast = null; // 本次动作打出的牌（由 ui 在调用引擎前标记）
  const reduced = (function () {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  })();

  /* ---------------- 基础设施 ---------------- */
  const rand = (a, b) => a + Math.random() * (b - a);

  function colorOf(elem) { return ELEM_COLOR[elem] || ELEM_COLOR['无']; }
  function icon(name, size) { return (SH.art && SH.art.icon) ? SH.art.icon(name, size) : ''; }

  function mk(cls, html) {
    const d = document.createElement('div');
    d.className = 'fx ' + cls;
    if (html) d.innerHTML = html;
    return d;
  }

  function kill(el, life) {
    if (!el) return;
    if (FX._keep) return; // 特效检视页：保留节点以便定格截图
    const t = Math.max(60, life | 0);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, t);
  }

  function rectOf(sel) {
    try {
      const el = document.querySelector(sel);
      return el ? el.getBoundingClientRect() : null;
    } catch (e) { return null; }
  }
  function center(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function offsetRect(r, dx, dy) {
    return { left: r.left + (dx || 0), top: r.top + (dy || 0), width: r.width, height: r.height };
  }
  function boardRect() { return rectOf('.board') || rectOf('.board-wrap'); }
  function laneRect(pos) {
    return rectOf('.lane[data-pos="' + pos + '"]') || boardRect();
  }
  function enemyRect(uid, pos) {
    return rectOf('.enemy[data-uid="' + uid + '"]') ||
      rectOf('.lane[data-pos="' + pos + '"] .enemy-slot') || laneRect(pos);
  }
  function unitRect(uid, pos) {
    return rectOf('.unit[data-uid="' + uid + '"]') ||
      rectOf('.lane[data-pos="' + pos + '"] .unit-slot') || laneRect(pos);
  }
  function heroRect() { return rectOf('.hero-totem') || rectOf('.lane-hero') || boardRect(); }

  // 把一个临时节点钉在某个矩形上
  function pin(el, rect, w, h) {
    if (!rect) return el;
    const c = center(rect);
    el.style.left = c.x + 'px';
    el.style.top = c.y + 'px';
    if (w != null) el.style.width = w + 'px';
    if (h != null) el.style.height = h + 'px';
    return el;
  }

  function add(node, life, delay) {
    if (!layer) return null;
    if (delay) {
      setTimeout(() => {
        layer.appendChild(node);
        kill(node, life || 1400);
      }, delay);
      return node;
    }
    layer.appendChild(node);
    kill(node, life || 1400);
    return node;
  }

  function addScreen(node, life, delay) {
    if (!screenLayer) return null;
    if (delay) {
      setTimeout(() => {
        screenLayer.appendChild(node);
        kill(node, life || 2200);
      }, delay);
      return node;
    }
    screenLayer.appendChild(node);
    kill(node, life || 2200);
    return node;
  }

  /* ---------------- 粒子 / 数字 / 刀光 ---------------- */
  function particles(rect, opts) {
    opts = opts || {};
    if (reduceCheck() || !rect) return;
    const box = mk('fx-particles');
    pin(box, rect);
    const n = opts.n || 12;
    const spread = opts.spread || 54;
    const list = [];
    for (let i = 0; i < n; i++) {
      const a = (opts.angle == null ? Math.random() * Math.PI * 2 : opts.angle + rand(-0.9, 0.9));
      const r = spread * rand(0.35, 1.25);
      const size = rand(1.6, opts.size || 4.6);
      const life = rand(0.42, 0.86);
      list.push('<i style="--dx:' + (Math.cos(a) * r).toFixed(1) + 'px;--dy:' +
        (Math.sin(a) * r - (opts.rise || 0)).toFixed(1) + 'px;--dur:' + life.toFixed(2) +
        's;--d:' + (Math.random() * 0.12).toFixed(2) + 's;width:' + size.toFixed(1) +
        'px;height:' + (size * rand(0.6, 1.3)).toFixed(1) + 'px;background:' +
        (opts.color || '#c9a961') + ';--rot:' + (rand(-180, 180) | 0) + 'deg"></i>');
    }
    box.innerHTML = list.join('');
    add(box, 1200);
  }

  function number(rect, text, color, opts) {
    opts = opts || {};
    if (!rect) return;
    const el = mk('fx-num', '<span>' + text + '</span>');
    pin(el, rect);
    el.style.setProperty('--c', color || '#e8d3a0');
    if (opts.big) el.classList.add('big');
    add(el, 1250, opts.delay || 0);
  }

  function slash(rect, color, opts) {
    opts = opts || {};
    if (reduceCheck() || !rect) return;
    const w = Math.max(90, rect.width * (opts.scale || 1.15));
    const h = Math.max(90, rect.height * (opts.scale || 1.15));
    const el = mk('fx-slash ' + (opts.cls || ''), '');
    pin(el, rect, w, h);
    const flip = opts.flip !== false;
    el.innerHTML =
      '<svg viewBox="0 0 120 120" preserveAspectRatio="none">' +
        '<path class="s1" d="M8 96 C34 56 64 30 112 12" stroke="' + (color || '#e8d3a0') + '"/>' +
        '<path class="s2" d="M18 108 C44 68 76 40 116 24" stroke="' + (color || '#e8d3a0') + '"/>' +
        (flip ? '<path class="s3" d="M12 24 C40 54 74 78 110 96" stroke="' + (color || '#e8d3a0') + '"/>' : '') +
      '</svg>';
    add(el, 780, opts.delay || 0);
  }

  function ring(rect, color, size, cls, opts) {
    if (!rect) return;
    const el = mk('fx-ring ' + (cls || ''));
    pin(el, rect, size || Math.max(rect.width, rect.height), size || Math.max(rect.width, rect.height));
    el.style.setProperty('--c', color || '#c9a961');
    add(el, 900, (opts && opts.delay) || 0);
  }

  function shake(power) {
    if (reduceCheck()) return;
    const rootEl = document.getElementById('app');
    if (!rootEl) return;
    rootEl.classList.remove('fx-shake');
    rootEl.style.setProperty('--shake', (power || 4) + 'px');
    void rootEl.offsetWidth;
    rootEl.classList.add('fx-shake');
    setTimeout(() => rootEl.classList.remove('fx-shake'), 420);
  }

  function flash(color, alpha) {
    const el = mk('fx-flash');
    const c = color || '#e8d3a0';
    el.style.background = 'transparent';
    el.style.boxShadow = 'inset 0 0 240px 40px ' + c;
    el.style.opacity = alpha == null ? 0.4 : Math.min(1, alpha * 2.4);
    addScreen(el, 560);
  }

  function textAt(rect, text, cls, color, delay) {
    if (!rect) return;
    const el = mk('fx-word ' + (cls || ''), '<b>' + text + '</b>');
    pin(el, rect);
    if (color) el.style.setProperty('--c', color);
    add(el, 1200, delay || 0);
  }

  // 目标卡牌受击 / 回血时给 DOM 本体一个短促反馈（不参与规则）
  function reactCard(sel, kind) {
    if (!sel) return;
    let el = null;
    try { el = document.querySelector(sel); } catch (e) { return; }
    if (!el) return;
    const cls = kind === 'heal' ? 'fx-heal-glow' : 'fx-recoil';
    el.classList.remove('fx-recoil', 'fx-heal-glow');
    void el.offsetWidth;
    el.classList.add(cls);
    const bar = el.querySelector('.e-hp i, .u-hp i, .hpbar i, .mini-bar i');
    if (bar) {
      bar.classList.remove('fx-bar-hit', 'fx-bar-heal');
      void bar.offsetWidth;
      bar.classList.add(kind === 'heal' ? 'fx-bar-heal' : 'fx-bar-hit');
    }
    setTimeout(function () {
      el.classList.remove(cls);
      if (bar) bar.classList.remove('fx-bar-hit', 'fx-bar-heal');
    }, 480);
  }

  function flashHeroBars(kind) {
    const bars = document.querySelectorAll('.battle-hero .hpbar i, .topbar .res.hp .mini-bar i');
    const cls = kind === 'heal' ? 'fx-bar-heal' : 'fx-bar-hit';
    Array.prototype.forEach.call(bars, function (b) {
      b.classList.remove('fx-bar-hit', 'fx-bar-heal');
      void b.offsetWidth;
      b.classList.add(cls);
      setTimeout(function () { b.classList.remove(cls); }, 520);
    });
  }

  function reduceCheck() {
    if (!reduced) return false;
    // 减少动态偏好：只保留极少量提示
    return true;
  }

  /* ---------------- 快照与差异 ---------------- */
  function statusKeys(t) {
    const out = [];
    const s = t.statuses || {};
    for (const k in s) if (s[k] && s[k].n > 0) out.push(k + ':' + s[k].n);
    return out.join('|');
  }

  function snap(app) {
    const o = {
      screen: app.screen,
      run: app.run ? {
        hp: app.run.hp, maxHp: app.run.maxHp, husui: app.run.husui,
        deck: app.run.deck.length, relics: app.run.relics.length, volume: app.run.volume
      } : null,
      battle: null
    };
    const b = app.battle;
    if (!b) return o;
    o.battle = {
      turn: b.turn, phase: b.phase, night: !!b.night, over: b.over,
      heroHp: b.hero.hp, heroMax: b.hero.maxHp, shield: b.hero.shield || 0,
      qi: b.qi, lingyong: b.lingyong,
      chain: b.chain.count, chainElem: b.chain.elem,
      terrain: (b.terrain || []).join('|'),
      hand: b.hand.map((c) => c.uid + ':' + c.id + ':' + c.face + ':' + (c.upgraded ? 1 : 0)).join('|'),
      handMap: b.hand.reduce((m, c) => { m[c.uid] = c.face; return m; }, {}),
      units: b.units.map((u) => ({
        uid: u.uid, id: u.cardId, name: u.name, pos: u.pos, hp: u.hp, maxHp: u.maxHp,
        atk: u.atk, face: u.face, st: statusKeys(u), element: u.element
      })),
      enemies: b.enemies.filter((e) => e.hp > 0).map((e) => ({
        uid: e.uid, defId: e.defId, name: e.name, pos: e.pos, hp: e.hp, maxHp: e.maxHp, atk: e.atkBase,
        phaseIdx: e.phaseIdx || 0, st: statusKeys(e),
        intent: e.intent ? e.intent.type : '', intentVal: e.intent ? e.intent.value : 0,
        element: e.element
      })),
      stats: {
        cards: b.stats.cardsPlayed, flips: b.stats.flips, summons: b.stats.summons || 0,
        dmg: b.stats.damageDealt || 0
      },
      eroded: b.eroded.length,
      logLen: b.log.length
    };
    return o;
  }

  function byUid(list) {
    const m = {};
    (list || []).forEach((x) => { m[x.uid] = x; });
    return m;
  }

  /* ---------------- 出牌特效 ---------------- */
  function castAnchor(c) {
    if (c && c.cell) return laneRect(c.cell);
    if (c && c.targetUid) {
      const b = SH.app && SH.app.battle;
      const e = b && b.enemies.find((x) => x.uid === c.targetUid);
      if (e) return enemyRect(e.uid, e.pos);
    }
    return boardRect();
  }

  function sigilSVG(elem, glyph, size) {
    const c = colorOf(elem);
    const pts = ['金', '水', '木', '火', '土'];
    let dots = '';
    pts.forEach((p, i) => {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
      const x = 60 + Math.cos(a) * 42, y = 60 + Math.sin(a) * 42;
      const on = p === elem;
      dots += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (on ? 4.4 : 2.2) +
        '" fill="' + (on ? c : 'none') + '" stroke="' + c + '" stroke-opacity="' + (on ? 0.95 : 0.4) + '" stroke-width="1"/>';
    });
    return '<svg class="fx-sigil-svg" viewBox="0 0 120 120">' +
      '<circle cx="60" cy="60" r="52" fill="none" stroke="' + c + '" stroke-opacity=".45" stroke-width="1"/>' +
      '<circle cx="60" cy="60" r="46" fill="none" stroke="' + c + '" stroke-opacity=".28" stroke-width="1" stroke-dasharray="2 6"/>' +
      '<circle class="sig-rot" cx="60" cy="60" r="36" fill="none" stroke="' + c + '" stroke-opacity=".55" stroke-width="1" stroke-dasharray="10 7 3 7"/>' +
      dots +
      '<path d="M60 18 L88 78 L24 44 L96 44 L32 78 Z" fill="none" stroke="' + c + '" stroke-opacity=".14" stroke-width="1"/>' +
      '<text x="60" y="68" text-anchor="middle" font-family="Songti SC, STSong, serif" font-size="' +
      (size || 26) + '" fill="' + c + '" fill-opacity=".92">' + (glyph || '') + '</text>' +
      '</svg>';
  }

  function castFX(c, ev) {
    if (!c) return;
    const type = c.type || 'spell';
    const col = colorOf(c.element);
    const anchor = castAnchor(c);
    if (!anchor) return;
    const feral = c.face === 'feral';
    const glyph = (c.name || '荒').slice(0, 1);

    if (c.mutant) {
      // 异变：画面裂开一道紫黑的痕
      const gl = mk('fx-mutant');
      pin(gl, anchor, 320, 260);
      gl.innerHTML = '<svg viewBox="0 0 320 260">' +
        '<path d="M12 248 L96 150 L128 190 L186 78 L232 132 L300 18" fill="none" stroke="#c58cd8" stroke-opacity=".72" stroke-width="2"/>' +
        '<path d="M26 254 L110 162 L136 198 L194 92 L240 144 L306 38" fill="none" stroke="#7d4c94" stroke-opacity=".45" stroke-width="1"/>' +
        '</svg>';
      add(gl, 1000);
      const z = mk('fx-mutant-word', '<b>' + (c.name || '异变') + '</b><span>异 变</span>');
      pin(z, anchor);
      add(z, 1200);
      particles(anchor, { color: '#c58cd8', n: 24, spread: 90, size: 4 });
      flash('#6a3f7a', 0.18);
    } else if (type === 'beast') {
      // 异兽：墨影自地底立起，兽爪撕开荒痕
      let target = null;
      if (ev && ev.newUnits && ev.newUnits.length) {
        target = ev.newUnits.find((u) => u.id === c.id) || ev.newUnits[0];
      }
      const rect = target ? unitRect(target.uid, target.pos) : anchor;
      const art = SH.art.card({ id: c.id, name: c.name, element: c.element, type: 'beast' }, { face: c.face });
      const ph = mk('fx-beast', '<img src="' + art + '" alt="">');
      pin(ph, rect, Math.max(120, rect.width * 1.3), Math.max(110, rect.height * 1.55));
      add(ph, 900);
      ring(rect, col, Math.max(90, rect.width * 1.45), 'ground', { delay: 40 });
      particles(rect, { color: col, n: 16, spread: 60, rise: 22, size: 5 });
      slash(rect, col, { scale: 1.25, flip: feral });
      textAt(offsetRect(rect, 0, rect.height * 0.46), TYPE_LABEL[type] + ' · ' + c.name, 'cast-word', col);
      if (feral) {
        const z = mk('fx-feral', '<i>凶</i>');
        pin(z, rect, rect.width, rect.height);
        add(z, 1000);
      }
    } else if (type === 'spell') {
      // 术法：符箓展开，符文环逆转
      const sig = mk('fx-cast sigil', sigilSVG(c.element, glyph, 28));
      pin(sig, anchor, 174, 174);
      add(sig, 1100);
      const tal = mk('fx-talisman', '<span>' + glyph + '</span>');
      pin(tal, offsetRect(anchor, Math.min(74, anchor.width * 0.42), 0));
      tal.style.setProperty('--c', col);
      add(tal, 1000);
      particles(anchor, { color: col, n: 18, spread: 70, size: 3.2 });
      ring(anchor, col, 140, 'thin');
      textAt(offsetRect(anchor, 0, anchor.height * 0.54), '术法 · ' + c.name, 'cast-word', col, 80);
    } else if (type === 'terrain') {
      // 山泽：地脉起伏，碎石破土
      let rect = anchor;
      if (ev && ev.terrainChanged != null) rect = laneRect(ev.terrainChanged + 1);
      for (let i = 0; i < 3; i++) ring(rect, col, 80 + i * 54, 'ground', { delay: i * 90 });
      const rocks = mk('fx-rocks', '');
      const rr = rect.width > 480
        ? { left: rect.left + rect.width / 2 - 200, top: rect.top + rect.height / 2 - 120, width: 400, height: 240 }
        : rect;
      pin(rocks, rr, rr.width, rr.height);
      let rh = '';
      for (let i = 0; i < 14; i++) {
        rh += '<i style="--x:' + rand(-0.46, 0.46).toFixed(2) + ';--d:' + rand(0.5, 0.95).toFixed(2) +
          's;--r:' + (rand(-120, 120) | 0) + 'deg;--c:' + col + '"></i>';
      }
      rocks.innerHTML = rh;
      add(rocks, 1200);
      const g = mk('fx-terrain-glyph', '<b>山</b>');
      pin(g, rect, 220, 220);
      add(g, 1000);
      const mist = mk('fx-terrain-mist');
      pin(mist, rr, rr.width + 80, rr.height + 40);
      add(mist, 1100);
      particles(rect, { color: col, n: 14, spread: 60, angle: -Math.PI / 2, rise: 26, size: 6 });
      textAt(offsetRect(rect, 0, rect.height * 0.34), TYPE_LABEL[type] + ' · ' + c.name, 'cast-word', col);
    } else if (type === 'ritual') {
      // 祭仪：朱砂阵、血滴与下沉的暗
      const anchor2 = boardRect() || anchor;
      const sig = mk('fx-cast ritual', sigilSVG('火', glyph, 34));
      pin(sig, anchor2, 320, 320);
      add(sig, 1500);
      const drops = mk('fx-drops', '');
      pin(drops, anchor2, 320, 320);
      let dh = '';
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 4;
        dh += '<i style="left:' + (50 + Math.cos(a) * 36).toFixed(1) + '%;top:' +
          (50 + Math.sin(a) * 30).toFixed(1) + '%;--d:' + rand(0.5, 1.1).toFixed(2) + 's"></i>';
      }
      drops.innerHTML = dh;
      add(drops, 1500);
      const dark = mk('fx-ritual-dark');
      pin(dark, anchor2, 340, 280);
      add(dark, 1400);
      particles(anchor2, { color: '#b3453c', n: 18, spread: 86, rise: 10, size: 4 });
      textAt(offsetRect(anchor2, 0, 110), TYPE_LABEL[type] + ' · ' + c.name, 'cast-word', '#d98f7f');
    }
  }

  /* ---------------- 战斗内差异 ---------------- */
  function diffBattle(p, n, ev) {
    const a = p.battle, b = n.battle;
    if (!a || !b) return;
    const delayStep = 130;
    let delay = 0;

    // 昼夜
    if (a.night !== b.night) {
      daynight(b.night);
      document.body.classList.toggle('is-night', b.night);
    }

    // 相生链
    if (b.chain > a.chain) chainFX(b.chainElem, b.chain);

    // 出牌：优先播放，锚点与新召唤的单位一致
    if (ev && ev.cast) {
      castFX(ev.cast, ev);
      delay += delayStep;
    }

    // 翻面（手牌中的牌面变化）
    if (b.stats.flips > a.stats.flips && ev && ev.flip) {
      const target = rectOf('.card[data-uid="' + ev.flip.uid + '"]') || heroRect();
      flipFX(target, ev.flip.face);
      delay += delayStep;
    }

    // 己方单位
    const au = byUid(a.units), bu = byUid(b.units);
    Object.keys(bu).forEach((uid) => {
      const u = bu[uid], old = au[uid];
      if (!old) return;
      const r = unitRect(u.uid, u.pos);
      const uSel = '.unit[data-uid="' + u.uid + '"]';
      if (u.hp < old.hp) {
        hitFX(r, old.hp - u.hp, { source: 'enemy', color: '#d9695a', delay: delay, sel: uSel });
        delay += delayStep;
      } else if (u.hp > old.hp) {
        healFX(r, u.hp - old.hp, delay, uSel);
        delay += delayStep;
      }
      if (u.st !== old.st) statusFX(r, old.st, u.st, delay);
      if (u.atk > old.atk) textAt(r, '攻 +' + (u.atk - old.atk), 'buff-word', '#a9c9b5', delay);
    });

    // 己方单位入场 / 阵亡
    (ev.newUnits || []).forEach((u, i) => {
      const r = unitRect(u.uid, u.pos);
      const fromBeast = ev.cast && ev.cast.type === 'beast';
      if (!fromBeast) {
        const art = SH.art.card({ id: u.id, name: u.name, element: u.element, type: 'beast' }, { face: u.face });
        const ph = mk('fx-beast mini', '<img src="' + art + '" alt="">');
        pin(ph, r, Math.max(90, r.width * 1.05), Math.max(90, r.height * 1.2));
        add(ph, 780, i * 60);
      }
      ring(r, colorOf(u.element), 120, 'ground', { delay: i * 80 });
      particles(r, { color: colorOf(u.element), n: 10, spread: 42, rise: 16 });
    });
    (ev.deadUnits || []).forEach((u, i) => {
      const r = unitRect(u.uid, u.pos);
      inkBurst(r, '#c9a961', '散');
      textAt(r, '荒 蚀', 'erode-word', '#c08b7e', 100 + i * 80);
    });

    // 敌方
    const ae = byUid(a.enemies), be = byUid(b.enemies);
    Object.keys(be).forEach((uid) => {
      const e = be[uid], old = ae[uid];
      if (!old) return;
      const r = enemyRect(e.uid, e.pos);
      if (e.hp < old.hp) {
        const sameLane = (b.units || []).find((u) => u.pos === e.pos);
        const elem = (ev.cast && ev.cast.element) || (sameLane && sameLane.element) || '无';
        hitFX(r, old.hp - e.hp, {
          source: 'player', color: colorOf(elem), element: elem,
          variant: ev.cast ? (ev.cast.mutant ? 'mutant' : ev.cast.type) : 'beast',
          heavy: old.hp - e.hp >= 12, delay: delay,
          sel: '.enemy[data-uid="' + e.uid + '"]'
        });
        delay += delayStep;
      } else if (e.hp > old.hp) {
        healFX(r, e.hp - old.hp, delay, '.enemy[data-uid="' + e.uid + '"]');
        delay += delayStep;
      }
      if (e.st !== old.st) statusFX(r, old.st, e.st, delay);
      if (e.pos !== old.pos) advanceFX(old.pos, e.pos);
      if (e.phaseIdx > old.phaseIdx) bossPhaseFX(r, e);
    });

    (ev.newEnemies || []).forEach((e, i) => {
      const r = enemyRect(e.uid, e.pos);
      if (e.defId) {
        const art = SH.art.card({ id: e.defId, name: e.name, element: e.element, type: 'beast' }, { face: 'tame' });
        const ph = mk('fx-beast mini enemy', '<img src="' + art + '" alt="">');
        pin(ph, r, Math.max(110, r.width * 1.15), Math.max(100, r.height * 1.25));
        add(ph, 850, i * 100);
      }
      ring(r, '#b3453c', 130, 'ground', { delay: i * 110 });
      particles(r, { color: '#b3453c', n: 12, spread: 50, rise: 18 });
      textAt(r, '荒 兽 入 场', 'cast-word', '#d9a79c', i * 110);
    });
    (ev.deadEnemies || []).forEach((e, i) => {
      const r = enemyRect(e.uid, e.pos);
      inkBurst(r, '#e8d3a0', '破');
    });

    // 本体
    if (b.heroHp < a.heroHp) {
      const selfCost = ev && ev.cast && (ev.cast.type === 'ritual' || ev.cast.mutant);
      if (selfCost) selfCostFX(a.heroHp - b.heroHp);
      else heroHitFX(a.heroHp - b.heroHp);
    } else if (b.heroHp > a.heroHp) {
      healFX(heroRect(), b.heroHp - a.heroHp, 0, '.hero-totem');
    }
    if (b.shield > a.shield) shieldFX(heroRect(), b.shield - a.shield);
    if (b.shield < a.shield) {
      ring(heroRect(), '#7fb6dc', 130, 'thin');
      textAt(heroRect(), '护 盾 破', 'buff-word', '#9fc7dd');
    }

    // 遗物 / 誓约触发：金光在巡吏身上一闪
    const fresh = (SH.app.battle && SH.app.battle.log ? SH.app.battle.log : []).slice(a.logLen || 0);
    fresh.forEach((l, i) => {
      if (l.kind === 'relic') relicFX(l.text, i * 110, '#e8d3a0');
      else if (l.kind === 'omen') relicFX(l.text, i * 110, '#c6a9d8');
    });

    // 荒蚀
    if (b.eroded > a.eroded) {
      const r = boardRect();
      textAt(r, '荒 蚀 +1', 'erode-word', '#c08b7e', 160);
    }

    // 回合 / 阶段
    if (b.turn !== a.turn) turnFX(b);
    if (b.over && !a.over) endFX(b.over);

    // 攻击意图变化：只闪一下敌人意图，不做大特效
    Object.keys(be).forEach((uid) => {
      const e = be[uid], old = ae[uid];
      if (old && e.intent && old.intent && e.intent !== old.intent && e.pos > 0) {
        const el = document.querySelector('.enemy[data-uid="' + uid + '"] .intent');
        if (el) {
          el.classList.remove('fx-intent-pop');
          void el.offsetWidth;
          el.classList.add('fx-intent-pop');
        }
      }
    });
  }

  /* ---------------- 各类命中 ---------------- */
  function hitFX(rect, amount, o) {
    o = o || {};
    if (!rect) return;
    const col = o.color || '#e8d3a0';
    const v = o.variant || (o.source === 'enemy' ? 'enemy' : 'beast');
    const delay = o.delay || 0;

    reactCard(o.sel, 'hit');
    const imp = mk('fx-impact ' + v);
    pin(imp, rect, Math.max(120, rect.width * 1.25), Math.max(120, rect.height * 1.2));
    imp.style.setProperty('--c', col);
    add(imp, 520, delay);

    if (o.element && o.element !== '无' && o.source === 'player') {
      const tag = mk('fx-dmg-tag', o.element);
      pin(tag, offsetRect(rect, rect.width * 0.24, -rect.height * 0.12));
      tag.style.setProperty('--c', col);
      add(tag, 1000, delay);
    }

    if (v === 'enemy' || v === 'beast') {
      // 兽爪：三道并行的抓痕
      slash(rect, col, { delay: delay, scale: o.heavy ? 1.5 : 1.2 });
    } else if (v === 'spell') {
      // 术法：命中处炸开一枚小符阵
      const sig = mk('fx-hit-sigil', sigilSVG(o.element, '破', 20));
      pin(sig, rect, 96, 96);
      add(sig, 620, delay);
      ring(rect, col, 86, 'thin', { delay: delay });
    } else if (v === 'terrain') {
      // 山泽：碎石自地面崩起
      const rk = mk('fx-hit-rocks', '<i></i><i></i><i></i><i></i><i></i><i></i>');
      pin(rk, rect, rect.width, rect.height);
      add(rk, 700, delay);
      particles(rect, { color: col, n: 10, spread: 44, angle: -Math.PI / 2, rise: 24, size: 5 });
    } else if (v === 'ritual') {
      // 祭仪：血珠与朱砂环
      const dr = mk('fx-hit-blood', '<i></i><i></i><i></i><i></i><i></i>');
      pin(dr, rect, rect.width, rect.height);
      add(dr, 760, delay);
      ring(rect, '#b3453c', 92, 'thin', { delay: delay });
    } else {
      const gl = mk('fx-hit-crack');
      pin(gl, rect, rect.width * 1.2, rect.height * 1.1);
      add(gl, 620, delay);
    }

    particles(rect, { color: col, n: o.heavy ? 20 : 12, spread: o.heavy ? 80 : 54, size: 4.2 });
    number(rect, '-' + amount, o.source === 'player' ? '#e8d3a0' : '#ec8f7c',
      { big: !!o.heavy, delay: delay });
    if (o.heavy) {
      ring(rect, col, 150, 'thin');
      shake(5);
      flash(col, 0.1);
    }
  }

  function healFX(rect, amount, delay, sel) {
    if (!rect) return;
    reactCard(sel, 'heal');
    if (sel && sel.indexOf('hero-totem') >= 0) flashHeroBars('heal');
    const d = delay || 0;
    // 生之柱：自目标脚底升起的一束青气
    const pillar = mk('fx-heal-pillar');
    pin(pillar, rect, Math.max(90, rect.width * 0.7), Math.max(150, rect.height * 1.5));
    add(pillar, 950, d);
    // 双层生环（本体用细环，避免大椭圆压住立绘）
    const isHero = !!(sel && sel.indexOf('hero') >= 0);
    ring(rect, '#8fbf7c', Math.max(96, rect.width * 1.05), 'thin', { delay: d });
    if (!isHero) ring(rect, '#d8e8b8', Math.max(104, rect.width * 1.1), 'ground', { delay: d + 100 });
    // 愈字与上升叶片
    const g = mk('fx-heal-glyph', '<b>愈</b>');
    pin(g, offsetRect(rect, 0, -rect.height * 0.2));
    add(g, 1000, d);
    particles(rect, { color: '#a9d9a1', n: 16, spread: 38, rise: 56, size: 3.2 });
    particles(rect, { color: '#d8e8b8', n: 8, spread: 52, rise: 34, size: 2.4, angle: -Math.PI / 2 });
    number(offsetRect(rect, 0, -rect.height * 0.5), '+' + amount, '#b9e8ac', { big: amount >= 10, delay: d });
  }

  function heroHitFX(amount) {
    const r = heroRect();
    reactCard('.hero-totem', 'hit');
    flashHeroBars();
    slash(r, '#d9695a', { scale: 1.16, flip: false });
    particles(r, { color: '#b3453c', n: 18, spread: 66, size: 4.2 });
    number(r, '-' + amount, '#ff9a86', { big: true });
    const v = mk('fx-hurt-vignette');
    addScreen(v, 700);
    shake(Math.min(8, 3 + amount * 0.22));
    flash('#7a2a20', 0.14);
  }

  // 自损 / 祭仪代价：不是被击中，而是"香火与血"的交换
  function selfCostFX(amount) {
    const r = heroRect();
    reactCard('.hero-totem', 'hit');
    flashHeroBars();
    const el = mk('fx-selfcost', '<b>祭</b>');
    pin(el, r, Math.max(120, r.width * 1.2), Math.max(120, r.height * 1.2));
    add(el, 1000);
    particles(r, { color: '#b3453c', n: 12, spread: 34, rise: -26, size: 3.6, angle: Math.PI / 2 });
    number(r, '-' + amount, '#e08a78');
    ring(r, '#b3453c', 120, 'thin');
  }

  function shieldFX(rect, amount) {
    if (!rect) return;
    const el = mk('fx-shield', '<svg viewBox="0 0 100 100"><path d="M50 4 L92 22 V52 C92 76 74 92 50 98 C26 92 8 76 8 52 V22 Z"/><path d="M50 16 L80 29 V52 C80 70 67 82 50 88 C33 82 20 70 20 52 V29 Z"/></svg>');
    pin(el, rect, Math.max(130, rect.width * 1.45), Math.max(130, rect.height * 1.45));
    add(el, 1100);
    number(offsetRect(rect, 0, -rect.height * 0.64), '御 +' + amount, '#9fc7dd');
  }

  function statusFX(rect, from, to, delay) {
    const oldSet = String(from || '').split('|').filter(Boolean);
    const list = String(to || '').split('|').filter(Boolean);
    list.forEach((item) => {
      const key = item.split(':')[0];
      const old = oldSet.find((x) => x.split(':')[0] === key);
      const meta = (SH.STATUSES || {})[key] || {};
      if (!old || old !== item) {
        const chip = mk('fx-chip ' + (meta.bad ? 'bad' : 'good'), key + ' ' + item.split(':')[1]);
        pin(chip, rect);
        add(chip, 1300, delay || 0);
        if (key === '护盾') shieldFX(rect, parseInt(item.split(':')[1], 10) || 0);
        particles(rect, {
          color: meta.bad ? '#d08a7c' : '#9fc7ab', n: 6, spread: 34, size: 2.6
        });
      }
    });
  }

  function relicFX(text, delay, color) {
    const r = heroRect();
    if (!r) return;
    ring(r, color || '#e8d3a0', 110, 'thin', { delay: delay || 0 });
    particles(r, { color: color || '#e8d3a0', n: 8, spread: 40, rise: 26, size: 3 });
    const t = String(text || '').replace(/^[^：]*：/, '').slice(0, 16);
    if (t) textAt(offsetRect(r, 0, -r.height * 0.3), t, 'buff-word', color || '#e8d3a0', delay || 0);
  }

  function advanceFX(from, to) {
    const r = laneRect(to);
    const back = to > from;
    const el = mk('fx-advance', '<i></i><i></i><i></i>');
    pin(el, r, r.width, r.height);
    el.style.setProperty('--dir', back ? '1' : '-1');
    add(el, 900);
    particles(r, { color: '#a7c4d6', n: 8, spread: 40, rise: 10, size: 3 });
  }

  function inkBurst(rect, color, glyph) {
    if (!rect) return;
    const el = mk('fx-inkburst', glyph ? '<b>' + glyph + '</b>' : '');
    pin(el, rect, Math.max(110, rect.width * 1.3), Math.max(100, rect.height * 1.3));
    add(el, 1000);
    particles(rect, { color: color || '#c9a961', n: 24, spread: 90, size: 5.2 });
    ring(rect, color || '#c9a961', 130, 'thin');
  }

  function bossPhaseFX(rect, e) {
    if (!rect) return;
    const el = mk('fx-boss-phase', '<span>第 ' + ((e.phaseIdx || 0) + 1) + ' 阶</span><b>' + (e.name || '') + '</b>');
    pin(el, rect);
    add(el, 1800);
    flash('#b3453c', 0.22);
    shake(8);
    particles(rect, { color: '#d9745f', n: 30, spread: 120, size: 5 });
  }

  /* ---------------- 手牌翻面 ---------------- */
  function flipFX(rect, face) {
    if (!rect) return;
    const el = mk('fx-flip ' + (face === 'feral' ? 'feral' : 'tame'),
      '<div class="ff-card"><span class="ff-side ff-tame">驯</span><span class="ff-side ff-feral">凶</span></div>' +
      '<div class="ff-label">' + (face === 'feral' ? '凶 化' : '驯 化') + '</div>');
    pin(el, rect, Math.max(110, rect.width), Math.max(110, rect.height));
    add(el, 1100);
    ring(rect, face === 'feral' ? '#d9695a' : '#8fbf7c', 120, 'thin');
    particles(rect, { color: face === 'feral' ? '#d9695a' : '#8fbf7c', n: 12, spread: 46, size: 3.4 });
  }

  /* ---------------- 相生 ---------------- */
  function chainFX(elem, count) {
    const r = boardRect();
    if (!r) return;
    const el = mk('fx-chain', sigilSVG(elem || '木', '生', 30) +
      '<div class="fc-text">相 生 <b>×' + count + '</b></div>');
    pin(el, r, 300, 300);
    add(el, 1300);
    particles(r, { color: colorOf(elem || '木'), n: 16, spread: 120, size: 3.6 });
  }

  /* ---------------- 昼夜 ---------------- */
  function daynight(toNight) {
    document.body.classList.toggle('is-night', !!toNight);
    const el = mk('fx-phase ' + (toNight ? 'to-night' : 'to-day'));
    let stars = '';
    if (toNight) {
      for (let i = 0; i < 28; i++) {
        stars += '<i style="left:' + rand(2, 98).toFixed(1) + '%;top:' + rand(3, 55).toFixed(1) +
          '%;--d:' + rand(0.4, 1.4).toFixed(2) + 's;--s:' + rand(1, 2.6).toFixed(1) + 'px"></i>';
      }
    }
    el.innerHTML =
      '<div class="fp-sweep"></div>' +
      '<div class="fp-stars">' + stars + '</div>' +
      '<div class="fp-body">' +
        '<div class="fp-icon">' + icon(toNight ? 'moonRabbit' : 'sunCrow', 72) + '</div>' +
        '<div class="fp-word">' + (toNight ? '月 出' : '日 升') + '</div>' +
        '<div class="fp-sub">昼夜为之一变 · ' + (toNight ? '夜' : '昼') + '</div>' +
      '</div>' +
      '<div class="fp-grain"></div>';
    addScreen(el, 2800);
    const phaseEl = document.querySelector('.phase-badge');
    if (phaseEl) {
      phaseEl.classList.toggle('night', !!toNight);
      phaseEl.innerHTML = icon(toNight ? 'moonRabbit' : 'sunCrow', 15);
    }
  }

  /* ---------------- 回合 / 结束 ---------------- */
  function turnFX(b) {
    const el = mk('fx-turn ' + (b.phase === 'player' ? 'mine' : 'foe'),
      '<span>第 ' + b.turn + ' 回合</span><b>' + (b.phase === 'player' ? '你 的 回 合' : '敌 方 行 动') + '</b>');
    addScreen(el, 1200);
    if (b.phase === 'player') {
      const hero = document.querySelector('.hero-totem');
      if (hero) {
        hero.classList.remove('fx-hero-ready');
        void hero.offsetWidth;
        hero.classList.add('fx-hero-ready');
      }
    }
  }

  function endFX(over) {
    const win = over === 'victory';
    const el = mk('fx-end ' + (win ? 'win' : 'lose'),
      '<div class="fe-seal">' + (win ? '荒' : '殁') + '</div>' +
      '<div class="fe-word">' + (win ? '荒 兽 尽 退' : '巡 吏 力 竭') + '</div>');
    addScreen(el, 2400);
    if (!win) shake(9);
    flash(win ? '#e8d3a0' : '#7a2a20', win ? 0.2 : 0.26);
  }

  /* ---------------- 转场 ---------------- */
  const SCREEN_WORD = {
    title: '山 海 司', hero: '择 吏', map: '巡 荒', battle: '荒 战',
    reward: '所 得', shop: '坊 市', altar: '祭 坛', shrine: '山 神 祠',
    event: '异 兽 踪', result: '录'
  };

  function screenWipe(to, from) {
    if (!to || from === to) return;
    if (to === 'battle') return; // 战斗入场另有仪式
    const el = mk('fx-wipe', '<div class="fw-ink"></div><div class="fw-word">' + (SCREEN_WORD[to] || '') + '</div>');
    addScreen(el, 1000);
  }

  function battleIntro(n) {
    const el = mk('fx-battle-in');
    el.innerHTML = '<div class="fb-ink"></div><div class="fb-word">荒 战</div><div class="fb-sub">三 格 荒 痕 · 一 线 生 死</div>';
    addScreen(el, 1800);
    const b = n.battle;
    if (!b) return;
    (b.enemies || []).forEach((e, i) => {
      if (e.pos <= 0) return;
      const r = enemyRect(e.uid, e.pos);
      setTimeout(() => {
        ring(r, '#b3453c', 130, 'ground');
        particles(r, { color: '#b3453c', n: 14, spread: 56, rise: 20 });
        textAt(r, '荒 兽 入 场', 'cast-word', '#d9a79c');
      }, 420 + i * 120);
    });
    const br = boardRect();
    if (br) {
      for (let i = 1; i <= 3; i++) {
        const tr = laneRect(i);
        const label = document.querySelector('.lane[data-pos="' + i + '"] .lane-terrain span');
        if (label) {
          setTimeout(() => {
            label.classList.add('fx-terrain-glow');
            setTimeout(() => label.classList.remove('fx-terrain-glow'), 900);
          }, 500 + i * 90);
        }
      }
    }
  }

  /* ---------------- 开场 ---------------- */
  FX.intro = function () {
    if (!document.body) return;
    if (root.__SH_SKIP_INTRO) return;
    const seal = document.createElement('div');
    seal.className = 'fx-intro';
    seal.innerHTML =
      '<div class="fi-sky"></div>' +
      '<div class="fi-ink"></div>' +
      '<div class="fi-emblem"><img src="' + (SH.art && SH.art.asset ? SH.art.asset('assets/bg/title-emblem.svg') : 'assets/bg/title-emblem.svg') + '" alt=""></div>' +
      '<div class="fi-ring r1"></div><div class="fi-ring r2"></div>' +
      '<div class="fi-mountains"></div>' +
      '<div class="fi-band top"><img src="' + (SH.art && SH.art.asset ? SH.art.asset('assets/bg/taotie-band.svg') : 'assets/bg/taotie-band.svg') + '" alt=""></div>' +
      '<div class="fi-seal">荒</div>' +
      '<div class="fi-body">' +
        '<div class="fi-eyebrow">山 海 司</div>' +
        '<h1 class="fi-title"><span style="--i:0">巡</span><span style="--i:1">荒</span><span style="--i:2">录</span></h1>' +
        '<div class="fi-sub">异 兽 巡 行</div>' +
        '<div class="fi-line"></div>' +
      '</div>' +
      '<div class="fi-dust">' +
        Array.from({ length: 16 }).map(function () {
          return '<i style="left:' + rand(4, 96).toFixed(1) + '%;top:' + rand(18, 86).toFixed(1) +
            '%;--d:' + rand(2.4, 5.4).toFixed(2) + 's;--b:' + rand(0, 2).toFixed(2) + 's"></i>';
        }).join('') +
      '</div>' +
      '<div class="fi-skip">点 击 入 荒</div>';
    document.body.appendChild(seal);
    document.body.classList.add('fx-booting');

    let closed = false;
    const close = function () {
      if (closed) return;
      closed = true;
      seal.classList.add('out');
      document.body.classList.remove('fx-booting');
      setTimeout(() => { if (seal.parentNode) seal.parentNode.removeChild(seal); }, 780);
      window.removeEventListener('keydown', onKey);
    };
    const onKey = function () { close(); };
    seal.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    setTimeout(close, reduced ? 900 : 3050);
  };

  /* ---------------- 标题环境浮尘 ---------------- */
  function startAmbient() {
    ambient = document.createElement('div');
    ambient.id = 'fx-motes';
    let html = '';
    for (let i = 0; i < 18; i++) {
      html += '<i style="--x:' + rand(2, 98).toFixed(1) + '%;--y:' + rand(8, 92).toFixed(1) +
        '%;--d:' + rand(11, 26).toFixed(1) + 's;--b:' + rand(-40, 40).toFixed(0) +
        's;--s:' + rand(1.2, 3.4).toFixed(1) + 'px;--o:' + rand(0.12, 0.5).toFixed(2) + '"></i>';
    }
    ambient.innerHTML = html;
    document.body.appendChild(ambient);
  }

  /* ---------------- 对外接口 ---------------- */
  FX.markCast = function (info) { pendingCast = info || null; };
  FX.markFlip = function (info) { FX._flip = info || null; };
  FX.clearCast = function () { pendingCast = null; };

  FX.wipe = function (to, from) { screenWipe(to, from); };
  FX.daynight = daynight;
  FX.shake = shake;
  FX.end = endFX;

  // 巡吏技能：本体法相 + 技能名（四吏各有其色）
  const HERO_FX = {
    baiZe: { c: '#f0e6cf', ch: '通', icon: 'scroll' },
    qiongQi: { c: '#e08a62', ch: '凶', icon: 'claw' },
    zhaoYao: { c: '#9fc7ab', ch: '镇', icon: 'mountain' },
    wuXian: { c: '#8fc4e6', ch: '巫', icon: 'feather' }
  };
  FX.skill = function (name, heroId) {
    const r = heroRect();
    if (!r) return;
    const meta = HERO_FX[heroId] || HERO_FX.baiZe;
    const el = document.querySelector('.hero-totem');
    if (el) {
      el.classList.remove('fx-cast');
      void el.offsetWidth;
      el.classList.add('fx-cast');
      setTimeout(function () { el.classList.remove('fx-cast'); }, 1000);
    }
    const sig = mk('fx-cast sigil hero-sigil', sigilSVG('无', meta.ch, 30));
    pin(sig, r, 190, 190);
    sig.querySelectorAll('svg *').forEach(function (n) {
      if (n.getAttribute('stroke')) n.setAttribute('stroke', meta.c);
      if (n.getAttribute('fill') && n.getAttribute('fill') !== 'none') n.setAttribute('fill', meta.c);
    });
    add(sig, 1100);
    ring(r, meta.c, 176, 'thin');
    ring(r, meta.c, 120, 'ground');
    particles(r, { color: meta.c, n: 22, spread: 70, rise: 30, size: 3.6 });
    textAt(offsetRect(r, 0, -r.height * 0.44), '技 · ' + (name || ''), 'cast-word', meta.c);
    flash(meta.c, 0.09);
  };

  FX.init = function () {
    if (booted) return;
    booted = true;
    layer = document.createElement('div');
    layer.id = 'fx-layer';
    layer.className = 'fx-layer';
    screenLayer = document.createElement('div');
    screenLayer.id = 'fx-screen';
    screenLayer.className = 'fx-screen';
    document.body.appendChild(layer);
    document.body.appendChild(screenLayer);
    startAmbient();
    FX.intro();
  };

  FX.afterRender = function (app) {
    if (!layer) return;
    const now = snap(app);
    const p = prev;
    prev = now;
    if (!p) {
      document.body.classList.toggle('is-night', !!(now.battle && now.battle.night));
      if (now.screen === 'battle') battleIntro(now);
      return;
    }

    // 局外生命变化：山神祠祈愈、事件代价、祭坛以血为价
    if (p.run && now.run && p.screen === now.screen && now.screen !== 'battle' && p.run.hp !== now.run.hp) {
      const hud = rectOf('.tb-right .res.hp') || rectOf('.hero-info .hpbar') || rectOf('.hero-panel .hpbar');
      if (hud) {
        const delta = now.run.hp - p.run.hp;
        if (delta > 0) healFX(hud, delta, 0, null);
        else {
          number(hud, String(delta), '#ec8f7c');
          flash('#7a2a20', 0.07);
        }
      }
    }

    // 转场
    if (p.screen !== now.screen) {
      screenWipe(now.screen, p.screen);
      if (now.screen === 'battle') {
        document.body.classList.toggle('is-night', !!now.battle.night);
        battleIntro(now);
      } else if (now.screen === 'result') {
        // 结算页自带大字，留一点墨爆
        if (now.battle == null && p.battle) flash('#c9a961', 0.14);
      }
      pendingCast = null;
      FX._flip = null;
      return;
    }

    if (!now.battle || !p.battle) {
      document.body.classList.remove('is-night');
      pendingCast = null;
      FX._flip = null;
      return;
    }
    if (now.battle === p.battle) return;

    const ev = { cast: pendingCast, flip: FX._flip };
    pendingCast = null;
    FX._flip = null;

    // 入场 / 阵亡清单
    const au = byUid(p.battle.units), bu = byUid(now.battle.units);
    ev.newUnits = now.battle.units.filter((u) => !au[u.uid]);
    ev.deadUnits = p.battle.units.filter((u) => !bu[u.uid]);
    const ae = byUid(p.battle.enemies), be = byUid(now.battle.enemies);
    ev.newEnemies = now.battle.enemies.filter((e) => !ae[e.uid]);
    ev.deadEnemies = p.battle.enemies.filter((e) => !be[e.uid]);

    // 地形变化（供山泽落点定位）
    ev.terrainChanged = null;
    const ta = String(p.battle.terrain || '').split('|');
    const tb = String(now.battle.terrain || '').split('|');
    for (let i = 0; i < tb.length; i++) {
      if (ta[i] !== tb[i]) { ev.terrainChanged = i; break; }
    }

    document.body.classList.toggle('is-night', !!now.battle.night);
    diffBattle(p, now, ev);
  };

  FX.snapshot = snap;
})(typeof window !== 'undefined' ? window : globalThis);
