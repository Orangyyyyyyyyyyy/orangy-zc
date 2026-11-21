/* ============================================================
 * 山海司·巡荒录  —  界面层 ui.js
 * 只负责渲染与交互，所有规则由 engine / run 承担
 * ============================================================ */
(function (root) {
  'use strict';
  const SH = (root.SH = root.SH || {});
  const U = SH.util;
  const app = (SH.app = {
    screen: 'title',
    run: null,
    battle: null,
    ui: {
      targeting: null, selectedUnit: null, modal: null, reward: null,
      shop: null, event: null, altarMode: null, shrine: null, toast: '', result: null,
      tutorial: null
    }
  });

  let rootEl = null;

  const TYPE_NAME = { beast: '异兽', spell: '术法', terrain: '山泽', ritual: '祭仪', heroSkill: '巡吏技' };
  const INTENT_CLASS = {
    attack: 'i-attack', advance: 'i-advance', breach: 'i-breach',
    defend: 'i-defend', status: 'i-status', summon: 'i-summon', charge: 'i-charge',
    stun: 'i-status'
  };
  const INTENT_ICON = {
    attack: 'blade', advance: 'chevron', breach: 'info', defend: 'shield',
    status: 'crystal', summon: 'paw', charge: 'sun', stun: 'crystal'
  };

  function esc(s) { return U.esc(s); }
  function icon(name, size) { return SH.art.icon(name, size); }

  /* ---------------- 通用片段 ---------------- */
  function elemBadge(elem) {
    const c = (SH.ELEM[elem] || SH.ELEM['无']).color;
    return '<span class="glyph" style="--e:' + c + '">' + esc(elem) + '</span>';
  }

  function hpBar(cur, max, opts) {
    opts = opts || {};
    const pct = Math.max(0, Math.min(100, (cur / Math.max(1, max)) * 100));
    return '<div class="hpbar ' + (opts.cls || '') + ' ' + (opts.thin ? 'thin' : '') + '">' +
      '<i style="width:' + pct + '%"></i><b>' + Math.max(0, cur) + ' / ' + max + '</b></div>';
  }

  function faceName(inst) {
    const def = SH.CARD_BY_ID[inst.id];
    if (!def || !def.faces.feral) return '';
    return inst.face === 'feral' ? '凶' : '驯';
  }

  function cardText(inst) {
    const face = SH.engine.faceOf(inst);
    return face ? face.text : '';
  }

  function cardHTML(inst, opts) {
    opts = opts || {};
    const def = SH.CARD_BY_ID[inst.id];
    if (!def) return '';
    const face = SH.engine.faceOf(inst) || {};
    const double = SH.engine.isDouble(def);
    const ec = SH.art.elemColor(def.element);
    let cost = face.cost || 0;
    let down = false;
    if (opts.battle && app.battle && app.run && !opts.noCostCalc) {
      const c = SH.engine.costOf(app.battle, app.run, inst);
      cost = c.cost;
      down = c.discount > 0;
    }
    const disabled = !!opts.disabled;
    const targeting = !!opts.targeting;
    const art = SH.art.card(def, { face: inst.face });
    const beast = face.beast;
    const action = opts.action || 'play-card';
    const rarity = SH.RARITY_NAME[def.rarity] || '普通';
    const castFace = def.cast ? (def.cast[inst.face] || def.cast.tame) : null;
    return (
      '<article class="card r-' + def.rarity + ' ' + (disabled ? 'is-disabled' : '') + ' ' +
        (targeting ? 'targeting' : '') + (opts.big ? ' big' : '') + '" ' +
        'style="--e:' + ec + '" data-act="' + action + '" data-uid="' + inst.uid + '" data-id="' + inst.id + '" ' +
        'data-face="' + (inst.face || 'tame') + '" data-elem="' + def.element + '" ' +
        'role="button" tabindex="0" aria-label="' + esc(def.name) + '" ' +
        'title="' + esc(def.name + '：' + cardText(inst) +
          (castFace ? '｜施术 ' + def.cast.cost + '：' + castFace.text : '') +
          (inst.upgraded && def.upgradeText ? '（升级：' + def.upgradeText + '）' : '')) + '">' +
        '<div class="card-art">' +
          '<img loading="lazy" src="' + art + '" alt="' + esc(def.name) + '">' +
          '<span class="cost ' + (down ? 'down' : '') + '" title="' + (down ? '相生减费后的实际费用' : '灵气消耗') + '">' + cost + '</span>' +
          (double ? '<span class="card-face face-' + inst.face + '">' + faceName(inst) + '</span>' : '') +
          '<div class="card-title">' + esc(def.name) + (inst.upgraded ? '<i class="up">+</i>' : '') + '</div>' +
        '</div>' +
        '<div class="card-type">' + elemBadge(def.element) +
          '<span>' + (TYPE_NAME[def.type] || '') + '</span>' +
          '<span class="rarity">' + rarity + '</span>' +
          ((face.exhaust || def.exhaust) ? '<span class="rarity">消耗</span>' : '') +
          (def.notReady ? '<span class="rarity" style="color:#cf5f45">未完成</span>' : '') + '</div>' +
        '<div class="card-text">' + esc(cardText(inst)) + '</div>' +
        '<div class="card-bot">' +
          '<span class="beast-stat">' + (beast ? '攻 ' + beast.atk + ' · 血 ' + beast.hp : rarity) + '</span>' +
          (castFace && opts.battle ? '<button class="mini cast" data-act="cast-card" data-uid="' + inst.uid + '" title="' + esc('施术 ' + def.cast.cost + '：' + castFace.text) + '">术 ' + def.cast.cost + '</button>' : '') +
          (double ? '<button class="mini" data-act="flip-card" data-uid="' + inst.uid + '" title="支付 1 灵气翻至另一面">翻面</button>' : '') +
        '</div>' +
      '</article>'
    );
  }

  function statusChips(target) {
    const s = target.statuses || {};
    return Object.keys(s).map((k) => {
      const meta = SH.STATUSES[k] || {};
      return '<span class="chip ' + (meta.bad ? 'bad' : 'good') + '" title="' + esc(meta.desc || '') + '">' +
        k + ' ' + s[k].n + '</span>';
    }).join('');
  }

  function portrait(hero, cls) {
    return '<img class="' + (cls || '') + '" src="' + SH.art.heroPortrait(hero) + '" alt="' + esc(hero.name) + '">';
  }

  function watermark(ch) {
    return '<div class="screen-wm" aria-hidden="true">' + ch + '</div>';
  }

  /* ---------------- 顶部 ---------------- */
  function topBar() {
    const run = app.run;
    if (!run) return '';
    const vol = SH.VOLUMES[run.volume - 1];
    const inBattle = app.screen === 'battle' && app.battle;
    const hpNow = inBattle ? app.battle.hero.hp : run.hp;
    const hpMax = inBattle ? app.battle.hero.maxHp : run.maxHp;
    const hpPct = Math.max(0, Math.min(100, (hpNow / hpMax) * 100));
    return (
      '<header class="topbar">' +
        '<div class="tb-left">' +
          '<div class="brand">' +
            '<span class="brand-seal">山</span>' +
            '<div class="brand-text"><b>山海司</b><i>巡荒录</i></div>' +
          '</div>' +
          '<div class="vol-chip"><span>卷 ' + run.volume + '</span><b>' + esc(vol.name) + '</b></div>' +
          (run.difficulty ? '<div class="vol-chip diff"><span>荒阶</span><b>' + run.difficulty + '</b></div>' : '') +
        '</div>' +
        '<div class="tb-right">' +
          '<div class="res husui" title="荒髓：坊市与祭坛的通货">' + icon('crystal') + '<span>荒髓</span><b>' + run.husui + '</b></div>' +
          '<div class="res hp" title="巡吏生命">' + icon('heart') + '<span>生命</span><b>' + Math.max(0, hpNow) + '</b>' +
            '<span class="mini-bar"><i style="width:' + hpPct + '%"></i></span></div>' +
          '<div class="res deck" title="当前牌组张数">' + icon('deck') + '<span>牌组</span><b>' + run.deck.length + '</b></div>' +
          '<div class="seed" title="本局种子">' + run.seedCode + '</div>' +
          '<span class="tb-divider"></span>' +
          '<button class="btn tiny" data-act="open-codex" title="图鉴 · 已录 ' + (SH.codex ? SH.codex.totals().recorded : 0) + ' / ' + (SH.codex ? SH.codex.totals().total : 160) + '">图鉴' +
            (SH.codex && SH.codex.newCount ? '<i class="tb-dot"></i>' : '') + '</button>' +
          '<button class="btn tiny" data-act="open-deck">牌组</button>' +
          '<button class="btn tiny" data-act="open-help">经义</button>' +
          '<button class="btn tiny ghost" data-act="to-title">离席</button>' +
        '</div>' +
      '</header>'
    );
  }

  /* ---------------- 标题 ---------------- */
  function titleSlips(text, base) {
    return '<div class="ts-col">' + text.split('').map(function (ch, i) {
      return '<i class="' + (ch === '·' ? 'dot' : '') + '" style="--i:' + (base + i) + '">' + esc(ch) + '</i>';
    }).join('') + '</div>';
  }

  // 题字上的墨蚀滤波（山海经石刻感）：只作用于首页题字
  function inkDefs() {
    return '<svg class="ink-defs" width="0" height="0" aria-hidden="true" focusable="false">' +
      '<filter id="sh-ink-edge" x="-6%" y="-12%" width="112%" height="124%">' +
        '<feTurbulence type="fractalNoise" baseFrequency=".042" numOctaves="2" seed="7" result="n"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter></svg>';
  }

  function titleSeal() {
    return '<div class="title-seal" title="山海司印">荒' +
      '<span class="title-seal-caption">山 海 司 印</span></div>';
  }

  function titleButton(act, iconName, label, cls, title) {
    return '<button class="btn ' + (cls || '') + '" data-act="' + act + '"' +
      (title ? ' title="' + esc(title) + '"' : '') + '>' +
      '<span class="tb-ico">' + icon(iconName, 15) + '</span>' +
      '<span>' + label + '</span></button>';
  }

  function renderTitle() {
    const meta = SH.loadMeta();
    const saved = SH.storage.read(SH.SAVE_KEY);
    let saveInfo = null;
    if (saved && saved.run && saved.saveVersion === SH.SAVE_VERSION) {
      const hero = SH.HERO_BY_ID[saved.run.heroId];
      saveInfo = {
        hero: hero ? hero.name : '巡吏',
        volume: saved.run.volume || 1,
        hp: saved.run.hp,
        maxHp: saved.run.maxHp
      };
    }
    const beasts = SH.CARDS.filter((c) => c.type === 'beast' && c.rarity !== 'mutant').length;
    const codexSt = SH.codex ? SH.codex.totals() : { recorded: 0, total: 150 };
    return (
      '<div class="screen title-screen">' +
        inkDefs() +
        '<div class="title-emblem" aria-hidden="true"><img src="' + SH.art.asset('assets/bg/title-emblem.svg') + '" alt=""></div>' +
        '<div class="title-band top" aria-hidden="true"><img src="' + SH.art.asset('assets/bg/taotie-band.svg') + '" alt=""></div>' +
        '<div class="title-band bottom" aria-hidden="true"><img src="' + SH.art.asset('assets/bg/taotie-band.svg') + '" alt=""></div>' +

        '<div class="title-side left" aria-hidden="true">' +
          '<span class="ts-label">南 山 经</span>' +
          titleSlips('观山海之形·驭异兽之性', 0) +
        '</div>' +
        '<div class="title-side right" aria-hidden="true">' +
          '<span class="ts-label">西 山 经</span>' +
          titleSlips('五行相生相克·三格定生死', 2) +
        '</div>' +

        '<div class="title-orbits" aria-hidden="true">' +
          '<div class="title-orbit moon">' + icon('moonRabbit', 42) + '<span>月 · 夜</span></div>' +
          '<div class="title-orbit sun">' + icon('sunCrow', 42) + '<span>日 · 昼</span></div>' +
        '</div>' +

        '<div class="title-inner">' +
          '<div class="title-eyebrow">' +
            '<span class="te-line"></span>' + icon('taotie', 13) +
            '<span>山 海 司</span>' + icon('taotie', 13) +
            '<span class="te-line rt"></span>' +
          '</div>' +
          titleSeal() +
          '<h1 class="game-title" aria-label="巡荒录">' +
            '<span class="gt-char" data-ch="巡" style="--i:0" aria-hidden="true">巡</span>' +
            '<span class="gt-char" data-ch="荒" style="--i:1" aria-hidden="true">荒</span>' +
            '<span class="gt-char" data-ch="录" style="--i:2" aria-hidden="true">录</span>' +
          '</h1>' +
          '<div class="title-subline">异 兽 巡 行</div>' +
          '<div class="title-roman">shan hai si · xun huang lu</div>' +
          '<p class="game-poem"><span class="poem-brush">荒痕三格</span>，一线生死；<br>' +
            '<span class="poem-brush">观其形</span>，驭其性，录其名。</p>' +
          '<div class="title-actions">' +
            (saveInfo ?
              '<button class="btn primary" data-act="continue">' +
                '<span class="tb-ico">' + icon('feather', 15) + '</span><span>续 前 巡</span></button>' +
              '<button class="btn" data-act="new-run">' +
                '<span class="tb-ico">' + icon('compass', 16) + '</span><span>开 始 巡 荒</span></button>'
              :
              '<button class="btn primary" data-act="new-run">' +
                '<span class="tb-ico">' + icon('compass', 16) + '</span><span>开 始 巡 荒</span></button>') +
            titleButton('start-tutorial', 'bamboo', '新 手 教 程', 'tut', '以白泽开一局，边玩边学') +
            titleButton('open-codex', 'codex', '图 鉴', 'ghost') +
            titleButton('open-achievements', 'ding', '成 就', 'ghost') +
            titleButton('open-help', 'hexagram', '经 义', 'ghost') +
          '</div>' +
          (!meta.tutorialDone ?
            '<div class="title-tut-hint" data-act="start-tutorial" title="约三分钟，白泽带你走一遍">' +
              '<span class="seal">教</span>初次巡荒？<b>新手教程</b>约三分钟，白泽带你走一遍' +
            '</div>' : '') +
          (saveInfo ?
            '<div class="title-save" data-act="continue" title="继续上次的巡荒">' +
              '<span class="dot"></span><span>前巡未竟</span>' +
              '<b>' + saveInfo.hero + ' · 第 ' + saveInfo.volume + ' 卷 · ' + saveInfo.hp + '/' + saveInfo.maxHp + '</b>' +
            '</div>' : '') +
          '<div class="title-meta">巡荒 <b>' + (meta.runs || 0) + '</b> 次 · 通关 <b>' + (meta.wins || 0) +
            '</b> 次 · 图鉴 <b>' + codexSt.recorded + '</b> / ' + codexSt.total + ' 卡</div>' +
        '</div>' +
        '<div class="title-foot">' +
          '<span class="tf-brand">' + icon('mountain', 12) + '山海司 · 巡荒录 v' + SH.VERSION + '</span>' +
          '<em>墨书山海 · 一纸荒痕</em>' +
          '<span>全卡池 ' + SH.CARDS.filter(function (c) { return !c.notReady; }).length + ' 张 · 遗物 ' + SH.RELICS.length + ' 件</span>' +
        '</div>' +
      '</div>'
    );
  }

  /* ---------------- 选巡吏 ---------------- */
  const HERO_INDEX = ['壹', '贰', '叁', '肆'];
  function renderHeroSelect() {
    return (
      '<div class="screen hero-screen">' +
        watermark('吏') +
        '<div class="screen-head"><h2>择 一 巡 吏</h2><p>初始牌组与遗物定下开局流派，局中仍可靠构筑转向</p>' +
          '<p class="screen-subnote">白泽展卷 · 穷奇振翼 · 招摇引石 · 巫咸燃灯</p></div>' +
        '<div class="run-setup">' +
          '<div class="setup-row"><span class="setup-lab">荒阶</span><div class="diff-picks">' +
            [0,1,2,3,4,5,6,7,8,9,10].map(function (d) {
              return '<button class="diff-pick ' + ((app.ui.difficulty || 0) === d ? 'on' : '') + '" data-act="pick-diff" data-v="' + d + '">' + d + '</button>';
            }).join('') +
          '</div></div>' +
          '<div class="setup-row"><span class="setup-lab">种子</span>' +
            '<input id="seedInput" class="seed-input" type="text" placeholder="留空则随机 · 可粘贴 SH-XXXX" value="' + esc(app.ui.seedText || '') + '">' +
            '<span class="setup-hint">同种子同图同牌序（P3 19）</span></div>' +
          '<div class="setup-row setup-affix"><span class="setup-lab">词缀</span><span>' +
            ((app.ui.difficulty || 0) ? SH.run.rollAffixes(app.ui.difficulty || 0, 1).map(function (id) {
              var a = SH.AFFIX_BY_ID[id]; return '<b title="' + esc(a.text) + '">' + esc(a.name) + '</b>';
            }).join('') : '无 · 标准巡荒') +
          '</span></div>' +
        '</div>' +
        '<div class="hero-grid">' +
        SH.HEROES.map((hero, i) => {
          const relic = SH.RELIC_BY_ID[hero.relic];
          return (
            '<article class="hero-card" data-act="pick-hero" data-id="' + hero.id + '" tabindex="0" role="button">' +
              '<div class="hero-art">' + portrait(hero) +
                '<span class="hero-aura" aria-hidden="true"></span>' +
                '<span class="hero-no">' + HERO_INDEX[i] + '</span>' +
                '<span class="hero-tag">' + esc(hero.title) + '</span>' +
              '</div>' +
              '<div class="hero-body">' +
                '<h3>' + esc(hero.name) + '<span>' + esc(hero.title) + '</span></h3>' +
                '<p class="hero-desc">' + esc(hero.desc) + '</p>' +
                '<div class="hero-stats">' +
                  '<div><b>' + hero.hp + '</b><span>生命</span></div>' +
                  '<div><b>' + hero.qi + '</b><span>灵气</span></div>' +
                  '<div><b>' + hero.deck.length + '</b><span>牌组</span></div>' +
                '</div>' +
                '<div class="hero-skill"><i>技</i><span>' + esc(hero.skill.name) + '：' + esc(hero.skill.text) + '</span></div>' +
                '<div class="hero-relic"><i>遗</i><span>' + esc(relic.name) + '：' + esc(relic.text) + '</span></div>' +
                '<button class="btn hero-pick" data-act="pick-hero" data-id="' + hero.id + '">择 此 巡 吏</button>' +
              '</div>' +
            '</article>'
          );
        }).join('') +
        '</div>' +
        '<div class="screen-foot"><button class="btn ghost" data-act="to-title">返回</button></div>' +
      '</div>'
    );
  }

  /* ---------------- 地图 ---------------- */
  const MAP_W = 760;
  const MAP_LAYER_H = 90;
  const MAP_TOP = 54;

  function nodePos(layer, index, count) {
    return {
      x: MAP_W / 2 + (index - (count - 1) / 2) * 168,
      y: MAP_TOP + layer * MAP_LAYER_H
    };
  }

  function renderMap() {
    const run = app.run;
    const map = run.map;
    const reachable = SH.mapgen.reachable(map, run.nodeId);
    const cur = run.nodeId ? map.index[run.nodeId] : null;
    const height = MAP_TOP + (map.layers.length - 1) * MAP_LAYER_H + 66;

    const taken = {};
    for (let pi = 0; pi < run.path.length - 1; pi++) taken[run.path[pi] + '>' + run.path[pi + 1]] = true;
    let edges = '';
    map.layers.forEach((L, li) => {
      if (li === map.layers.length - 1) return;
      const nextL = map.layers[li + 1];
      L.nodes.forEach((n, i) => {
        const a = nodePos(li, i, L.nodes.length);
        n.next.forEach((id) => {
          const j = nextL.nodes.findIndex((x) => x.id === id);
          if (j < 0) return;
          const b = nodePos(li + 1, j, nextL.nodes.length);
          const active = n.id === run.nodeId && reachable.indexOf(id) >= 0;
          const done = !!taken[n.id + '>' + id];
          edges += '<path class="' + (active ? 'edge-active' : done ? 'edge-done' : 'edge-idle') +
            '" d="M' + a.x + ' ' + a.y + ' C ' + a.x + ' ' + (a.y + 46) + ', ' + b.x + ' ' + (b.y - 46) + ', ' + b.x + ' ' + b.y + '"/>';
        });
      });
    });

    let nodes = '';
    map.layers.forEach((L, li) => {
      const tag = nodePos(li, 0, L.nodes.length);
      nodes += '<span class="map-layer-tag" style="top:' + tag.y + 'px">第 ' + (li + 1) + ' 层</span>';
      L.nodes.forEach((n, i) => {
        const p = nodePos(li, i, L.nodes.length);
        const meta = SH.NODE_META[n.type];
        const canGo = reachable.indexOf(n.id) >= 0;
        const here = n.id === run.nodeId;
        const done = n.visited && !here;
        nodes += '<button class="node t-' + n.type + ' ' + (canGo ? 'can-go' : '') + ' ' +
          (done ? 'done' : '') + ' ' + (here ? 'here' : '') + '" ' +
          'style="left:' + p.x + 'px; top:' + p.y + 'px"' +
          (canGo ? ' data-act="enter-node" data-id="' + n.id + '"' : ' aria-disabled="true" tabindex="-1"') +
          ' title="' + esc(meta.desc) + '">' +
          '<span class="node-disc">' + SH.art.nodeIcon(n.type, n.type === 'boss' ? 32 : 24) + '</span>' +
          '<span class="node-name">' + esc(meta.name) + '</span>' +
          (n.type === 'boss' ? '<span class="node-boss">' + esc((SH.ENEMY_BY_ID[SH.run.bossFor(run)] || {}).name || '') + '</span>' : '') +
        '</button>';
      });
    });

    const progress = Math.round(((cur ? cur.layer + 1 : 0) / map.layers.length) * 100);
    return (
      topBar() +
      '<div class="screen map-screen">' +
        '<aside class="side-panel">' + heroPanel() + relicPanel() + statsPanel() + '</aside>' +
        '<main class="map-main">' +
          '<div class="map-head"><h2>' + esc(map.name) + '</h2>' +
            '<p>路径只能向前 · 分支节点强制取舍</p>' +
            '<div class="map-progress"><span>第 ' + (cur ? cur.layer + 1 : 1) + ' / ' + map.layers.length + ' 层</span>' +
              '<i><b style="width:' + progress + '%"></b></i>' +
              '<span>' + (cur ? '前路已择' : '择路入荒') + '</span></div>' +
          '</div>' +
          '<div class="map-canvas" style="height:' + height + 'px">' +
            '<svg class="map-lines" viewBox="0 0 ' + MAP_W + ' ' + height + '" preserveAspectRatio="none">' + edges + '</svg>' +
            nodes +
          '</div>' +
          '<div class="map-legend">' +
            '<span style="color:#c9a961"><i></i>可行之路</span>' +
            '<span style="color:#d08a6c"><i></i>凶兽巢</span>' +
            '<span style="color:#d9745f"><i></i>卷末首领</span>' +
            '<span style="color:#7c838a"><i></i>已过之境</span>' +
            '<span>沿途：荒战 / 异兽踪 / 古祭坛 / 坊市 / 山神祠</span>' +
          '</div>' +
        '</main>' +
        '<aside class="side-panel">' + omenPanel() + relicHintPanel() + '</aside>' +
      '</div>'
    );
  }

  function heroPanel() {
    const run = app.run;
    const hero = SH.HERO_BY_ID[run.heroId];
    return (
      '<section class="panel hero-panel">' +
        '<div class="panel-head"><span>巡 吏</span><b>' + esc(hero.name) + '</b></div>' +
        '<div class="hero-row">' +
          '<div class="hero-avatar">' + portrait(hero) + '</div>' +
          '<div class="hero-info">' +
            '<div class="hero-name-line"><b>' + esc(hero.title) + '</b></div>' +
            hpBar(run.hp, run.maxHp, { thin: true }) +
            '<div class="hero-skill-mini">技 · ' + esc(hero.skill.name) + '</div>' +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function relicPanel() {
    const run = app.run;
    return (
      '<section class="panel">' +
        '<div class="panel-head"><span>遗 物</span><b>' + run.relics.length + ' / ' + SH.run.relicSlots(run) + '</b></div>' +
        (run.relics.length ?
          '<div class="relic-list">' + run.relics.map((id) => {
            const r = SH.RELIC_BY_ID[id];
            if (!r) return '';
            return '<div class="relic r-' + r.rarity + '" title="' + esc(r.text) + '"><i>' + esc(r.name.slice(0, 1)) + '</i><span>' + esc(r.name) + '</span></div>';
          }).join('') + '</div>'
          : '<p class="empty">尚未拾得遗物。凶兽巢与首领必掉。</p>') +
      '</section>'
    );
  }

  function omenPanel() {
    const run = app.run;
    return (
      '<section class="panel">' +
        '<div class="panel-head"><span>巡荒誓约</span><b>' + run.omens.length + ' / 3</b></div>' +
        (run.omens.length ? '<div class="omen-list">' + run.omens.map((id) => {
          const o = SH.OMEN_BY_ID[id];
          return '<div class="omen" title="' + esc(o.up + ' / ' + o.down) + '"><b>' + esc(o.name) + '</b>' + esc(o.up) + '</div>';
        }).join('') + '</div>' : '<p class="empty">尚未立誓。山神祠可立下不可解的誓约，强弱相随。</p>') +
      '</section>'
    );
  }

  function statsPanel() {
    const run = app.run;
    return (
      '<section class="panel">' +
        '<div class="panel-head"><span>巡荒录</span><b>' + run.path.length + ' 节点</b></div>' +
        '<ul class="stat-list">' +
          '<li><span>荒战</span><b>' + run.stats.battles + '</b></li>' +
          '<li><span>凶兽巢</span><b>' + run.stats.elites + '</b></li>' +
          '<li><span>击杀</span><b>' + run.stats.kills + '</b></li>' +
          '<li><span>牌组</span><b>' + run.deck.length + ' / ' + SH.RULES.deckMax + '</b></li>' +
        '</ul>' +
      '</section>'
    );
  }

  function relicHintPanel() {
    return (
      '<section class="panel">' +
        '<div class="panel-head"><span>行 路 要 诀</span><b>荒痕</b></div>' +
        '<ul class="stat-list">' +
          '<li><span>荒外</span><b>候场之敌</b></li>' +
          '<li><span>前哨 / 中阵 / 后阵</span><b>三格防线</b></li>' +
          '<li><span>突入</span><b>本体受伤</b></li>' +
        '</ul>' +
        '<p class="empty" style="margin-top:10px">点击高亮节点前行；每卷末必有首领。</p>' +
      '</section>'
    );
  }

  /* ---------------- 战斗 ---------------- */
  function renderBattle() {
    const b = app.battle;
    if (!b) return '';
    const run = app.run;
    const hero = SH.HERO_BY_ID[run.heroId];
    const tgt = app.ui.targeting;
    const step = tgt ? tgt.steps[tgt.index] : null;
    const phaseText = b.over === 'victory' ? '荒兽尽退' : b.over === 'defeat' ? '巡吏力竭' : b.phase === 'player' ? '你的回合' : '敌方行动';

    return (
      topBar() +
      '<div class="screen battle-screen">' +
        '<aside class="side-panel battle-left">' +
          '<section class="panel battle-hero">' +
            '<div class="panel-head"><span>' + esc(hero.title) + '</span><b>' + esc(hero.name) + '</b></div>' +
            hpBar(b.hero.hp, b.hero.maxHp, { cls: b.hero.hp / b.hero.maxHp < .35 ? 'bad' : '' }) +
            '<div class="hero-shield">' + (b.hero.shield ? icon('shield', 12) + ' 护盾 ' + b.hero.shield : '　') + '</div>' +
            '<div class="resource">' +
              '<div class="qi-row"><span class="lab">灵气</span><span class="orbs">' + qiOrbs(b) + '</span></div>' +
              '<div class="ling-row"><span class="lab">灵涌</span><b class="ling">' + b.lingyong + '</b><span class="cap">/ 溢出上限 +' + SH.RULES.lingyongOverCap + '</span></div>' +
            '</div>' +
            '<button class="btn skill" data-act="use-skill" ' + (b.skillUsed ? 'disabled' : '') + '>' +
              (b.skillUsed ? '技 · 已用' : '技 · ' + esc(hero.skill.name)) + '</button>' +
            '<div class="piles">' +
              '<div class="pile"><b>' + b.draw.length + '</b><span>抽牌堆</span></div>' +
              '<div class="pile"><b>' + b.discard.length + '</b><span>弃牌堆</span></div>' +
              '<div class="pile"><b>' + b.exhaust.length + '</b><span>消耗堆</span></div>' +
            '</div>' +
            (b.eroded.length ? '<div class="eroded">荒蚀：' + b.eroded.map(esc).join('、') + '</div>' : '') +
          '</section>' +
          '<section class="panel">' +
            '<div class="panel-head"><span>遗 物</span><b>' + run.relics.length + ' / ' + SH.run.relicSlots(run) + '</b></div>' +
            '<div class="relic-list compact">' + run.relics.map((id) => {
              const r = SH.RELIC_BY_ID[id];
              return '<div class="relic r-' + r.rarity + '" title="' + esc(r.text) + '"><i>' + esc(r.name.slice(0, 1)) + '</i><span>' + esc(r.name) + '</span></div>';
            }).join('') + '</div>' +
          '</section>' +
          '<section class="panel battle-stats">' +
            '<div class="panel-head"><span>本 场</span><b>' + (b.kindName || '荒战') + '</b></div>' +
            '<ul class="stat-list">' +
              '<li><span>造成伤害</span><b>' + b.stats.damageDealt + '</b></li>' +
              '<li><span>出牌 / 翻面</span><b>' + b.stats.cardsPlayed + ' / ' + b.stats.flips + '</b></li>' +
              '<li><span>最长相生</span><b>×' + b.stats.maxChain + '</b></li>' +
              '<li><span>荒蚀之名</span><b>' + b.eroded.length + '</b></li>' +
            '</ul>' +
          '</section>' +
        '</aside>' +

        '<main class="board-wrap">' +
          '<div class="board-top">' +
            '<div class="turn-badge">回合 <b>' + b.turn + '</b></div>' +
            (tgt ?
              '<div class="targeting-tip">' +
                (step && step.kind === 'enemy' ? '选择一名敌人' : step && step.terrain ? (step.cellLabel || '选择地形格') : '选择召唤位置') +
                (tgt.mode === 'cast' ? '<i class="cast-hint">施术</i>' : '') +
                '<button class="btn tiny" data-act="cancel-target">取消</button>' +
              '</div>' :
              '<div class="board-phase">' + phaseText +
              (b.chain.count > 0 ? '<span class="chain-badge">' + icon('chain', 10) + ' 相生 ×' + b.chain.count + '</span>' : '') + '</div>') +
            '<div class="turn-badge" style="font-size:10px;color:var(--muted)">' + b.kindName + '</div>' +
          '</div>' +
          '<div class="board">' +
            '<div class="lane lane-out">' +
              '<div class="lane-label">荒外</div>' +
              '<div class="lane-terrain">　</div>' +
              '<div class="slot enemy-slot">' +
                (b.enemies.filter((e) => e.hp > 0 && e.pos === 0).map((e) => enemyCard(e, b)).join('') ||
                  '<span class="lane-empty">荒</span>') +
              '</div>' +
              '<div class="slot unit-slot"></div>' +
            '</div>' +
            [1, 2, 3].map((pos) => {
              const e = SH.engine.enemyAt(b, pos);
              const u = SH.engine.unitAt(b, pos);
              const t = b.terrain[pos - 1];
              const tdef = SH.TERRAIN_BY_NAME[t] || { desc: '', color: '#8a8a8a' };
              const isTargetCell = step && step.kind === 'cell' && (step.options || []).indexOf(pos) >= 0 &&
                (step.terrain ? true : !u);
              const selUnit = app.ui.selectedUnit ? b.units.find((x) => x.uid === app.ui.selectedUnit) : null;
              const canMoveHere = selUnit && !u && !e && adjacentCells(b, selUnit).indexOf(pos) >= 0;
              return (
                '<div class="lane" data-pos="' + pos + '">' +
                  '<div class="lane-label">' + ['', '前哨', '中阵', '后阵'][pos] + '</div>' +
                  '<div class="lane-terrain" ' + (t ? 'title="' + esc(tdef.desc) + '"' : '') + '>' +
                    (t ? '<span style="--t:' + tdef.color + '">' + esc(t) + '</span>' : '　') + '</div>' +
                  '<div class="slot enemy-slot">' +
                    (e ? enemyCard(e, b) : '<span class="lane-empty">' + ['', '一', '二', '三'][pos] + '</span>') +
                  '</div>' +
                  '<div class="slot unit-slot">' +
                    (u ? unitCard(u, b) : '') +
                    (isTargetCell ? '<button class="slot-btn" data-act="choose-cell" data-pos="' + pos + '">' +
                      (step.terrain ? (step.cellLabel || '选择此格') : '召唤于此') + '</button>' : '') +
                    (canMoveHere ? '<button class="slot-btn move" data-act="move-here" data-pos="' + pos + '">移动至此 · 1 灵气</button>' : '') +
                  '</div>' +
                '</div>'
              );
            }).join('') +
            '<div class="lane lane-hero">' +
              '<div class="lane-label">本体</div>' +
              '<div class="lane-terrain">　</div>' +
              '<div class="slot hero-slot">' +
                '<div class="hero-totem">' +
                  '<div class="totem-frame">' + portrait(hero) +
                    '<span class="phase-badge ' + (b.night ? 'night' : '') + '" title="' + (b.night ? '夜 · 月出' : '昼 · 日出') + '">' + icon(b.night ? 'moonRabbit' : 'sunCrow', 15) + '</span>' +
                  '</div>' +
                  '<div class="totem-hp">' + b.hero.hp + '<small> / ' + b.hero.maxHp + '</small></div>' +
                  '<div class="body-name">巡 吏 本 体</div>' +
                '</div>' +
              '</div>' +
              '<div class="slot"></div>' +
            '</div>' +
          '</div>' +
          '<div class="board-foot">' +
            '<div class="hint">' + battleHint(b) + '</div>' +
            '<button class="btn end-turn" data-act="end-turn" ' + (b.phase !== 'player' || b.over ? 'disabled' : '') + '>结 束 回 合</button>' +
          '</div>' +
        '</main>' +

        '<aside class="side-panel battle-right">' +
          '<section class="panel log-panel">' +
            '<div class="panel-head"><span>战 报</span><b>敌 ' +
              b.enemies.filter((e) => e.hp > 0 && e.pos < 4).length + ' · 第 ' + b.turn + ' 回合</b></div>' +
            '<div class="log-list" id="logList">' +
              (b.log.length ? b.log.slice(-60).map((l) =>
                '<div class="log l-' + l.kind + '"><i>T' + l.t + '</i>' + esc(l.text) + '</div>').join('')
                : '<div class="log-empty">风过荒痕，未起刀兵。</div>') +
            '</div>' +
          '</section>' +
        '</aside>' +
      '</div>' +
      '<div class="hand-zone">' +
        '<div class="hand-side left">' + icon('deck', 15) + '<b>' + b.draw.length + '</b><span>抽牌</span></div>' +
        '<div class="hand">' +
          (b.hand.length ? b.hand.map((c) => cardHTML(c, {
            battle: true,
            disabled: b.phase !== 'player' || !!b.over,
            targeting: tgt && tgt.uid === c.uid
          })).join('') : '<div class="hand-empty">手牌已空 · 结束回合以抽牌</div>') +
        '</div>' +
        '<div class="hand-side right">' + icon('skip', 15) + '<b>' + b.discard.length + '</b><span>弃牌</span></div>' +
      '</div>'
    );
  }

  function battleHint(b) {
    if (b.over === 'victory') return '荒兽尽退。<b>收拾战利品</b>';
    if (b.over === 'defeat') return '巡吏力竭……';
    if (app.ui.targeting) return '正在选择目标 · <b>Esc</b> 取消';
    if (app.ui.selectedUnit) return '点击相邻空格移动（1 灵气），再次点击异兽取消';
    if (b.phase !== 'player') return '敌方行动中……';
    return '点击手牌出牌 · 点击异兽可调整站位 · <b>空格</b> 结束回合';
  }

  function qiOrbs(b) {
    let out = '';
    for (let i = 0; i < Math.max(b.qiMax, b.qi); i++) out += '<i class="orb ' + (i < b.qi ? 'on' : '') + '"></i>';
    return out;
  }

  function enemyCard(e, b) {
    const intent = SH.engine.previewIntent(b, e);
    const meta = SH.ENEMY_BY_ID[e.defId] || {};
    const pct = Math.max(0, (e.hp / e.maxHp) * 100);
    const tgt = app.ui.targeting;
    const step = tgt ? tgt.steps[tgt.index] : null;
    const selectable = step && step.kind === 'enemy' && (step.options || []).indexOf(e.uid) >= 0;
    const typeClass = INTENT_CLASS[intent.type] || '';
    const art = SH.art.card({ id: e.defId, name: e.name, element: e.element, type: 'beast' }, { face: 'tame' });
    return (
      '<div class="enemy ' + (e.boss ? 'boss' : '') + (e.elite ? 'elite' : '') + (selectable ? ' targetable' : '') + '"' +
        ' data-uid="' + e.uid + '" data-pos="' + e.pos + '" data-elem="' + esc(e.element) + '"' +
        (selectable ? ' data-act="choose-enemy" data-uid="' + e.uid + '"' : '') +
        ' title="' + esc(meta.text || e.name) + '">' +
        '<div class="intent ' + typeClass + '">' + icon(INTENT_ICON[intent.type] || 'chevron', 10) +
          '<b>' + esc(intent.label) + '</b>' +
          (intent.value != null ? '<span class="val">' + intent.value + '</span>' : '') + '</div>' +
        '<div class="enemy-art-wrap"><img class="enemy-art" loading="lazy" src="' + art + '" alt=""></div>' +
        '<div class="e-name">' + esc(e.name) + (e.phaseIdx > 0 ? ' <i>阶 ' + (e.phaseIdx + 1) + '</i>' : '') + '</div>' +
        '<div class="e-hp"><i style="width:' + pct + '%"></i><b>' + Math.max(0, e.hp) + '/' + e.maxHp + '</b></div>' +
        '<div class="e-meta">' + elemBadge(e.element) + '<span class="atk">攻 ' + SH.engine.enemyAtk(b, e) + '</span></div>' +
        '<div class="chips">' + statusChips(e) + '</div>' +
      '</div>'
    );
  }

  function unitCard(u, b) {
    const selected = app.ui.selectedUnit === u.uid;
    const cells = selected ? adjacentCells(b, u) : [];
    const art = SH.art.card(
      { id: u.cardId || ('U_' + u.name), name: u.name, element: u.element, type: 'beast' },
      { face: u.face || 'tame' }
    );
    return (
      '<div class="unit ' + (u.sick ? 'sick' : '') + ' ' + (selected ? 'selected' : '') + '" data-act="select-unit" data-uid="' + u.uid + '"' +
        ' data-pos="' + u.pos + '" data-elem="' + esc(u.element) + '">' +
        '<div class="unit-art-wrap"><img class="unit-art" loading="lazy" src="' + art + '" alt=""></div>' +
        '<div class="u-name">' + esc(u.name) + (u.face === 'feral' ? '<i class="feral">凶</i>' : '') + '</div>' +
        '<div class="u-hp"><i style="width:' + Math.max(0, (u.hp / u.maxHp) * 100) + '%"></i><b>' + Math.max(0, u.hp) + '/' + u.maxHp + '</b></div>' +
        '<div class="u-meta"><span class="atk">攻 ' + SH.engine.unitAtk(b, u) + '</span>' +
          (u.sick ? '<span class="chip sickc">失调</span>' : '') + '</div>' +
        '<div class="chips">' + statusChips(u) + '</div>' +
        (selected ? '<div class="move-hint">' + (cells.length ? '点击相邻空格移动（1 灵气）' : '无可移动空格') + '</div>' : '') +
      '</div>'
    );
  }

  function adjacentCells(b, u) {
    const out = [];
    [u.pos - 1, u.pos + 1].forEach((p) => {
      if (p >= 1 && p <= 3 && !SH.engine.unitAt(b, p) && !SH.engine.enemyAt(b, p)) out.push(p);
    });
    return out;
  }

  /* ---------------- 奖励 ---------------- */
  function renderReward() {
    const r = app.ui.reward;
    if (!r) return '';
    const run = app.run;
    return (
      topBar() +
      '<div class="screen reward-screen">' +
        watermark('得') +
        '<div class="screen-head"><h2>' + esc(r.title || '荒战所得') + '</h2>' +
          '<p>荒髓 +' + r.husui + (r.relic ? ' · 遗物已入囊中' : '') + (r.relicLost ? ' · 遗物槽已满，' + esc(SH.RELIC_BY_ID[r.relicLost].name) + ' 散落荒外' : '') + ' · 择一张牌收入牌组</p></div>' +
        (r.relic ? '<div class="relic-gain">' + icon('seal', 18) + '<span>遗 物</span><b>' +
          esc(SH.RELIC_BY_ID[r.relic].name) + '</b><i>' + esc(SH.RELIC_BY_ID[r.relic].text) + '</i></div>' : '') +
        (r.relicLost ? '<div class="relic-swap"><p>遗物槽已满：「' + esc(SH.RELIC_BY_ID[r.relicLost].name) +
          '」无法入囊。可弃一件旧物换新，或任其散落。</p><div class="swap-list">' +
          run.relics.map((id) => {
            const old = SH.RELIC_BY_ID[id];
            return '<button class="swap-item" data-act="swap-relic" data-old="' + id + '"><b>' + esc(old.name) + '</b><span>' + esc(old.text) + '</span></button>';
          }).join('') + '<button class="swap-item skip" data-act="drop-relic">放 弃</button></div></div>' : '') +
        '<div class="reward-cards">' +
          r.cards.map((id) => {
            const inst = { uid: 'rw_' + id, id: id, upgraded: false, face: 'tame' };
            return '<div class="reward-item">' + cardHTML(inst, { action: 'take-card', big: true }) + '</div>';
          }).join('') +
        '</div>' +
        '<div class="gain-line">' +
          '<span class="gain-chip">荒髓 +' + r.husui + '</span>' +
          (r.relic ? '<span class="gain-chip">遗物 · ' + esc(SH.RELIC_BY_ID[r.relic].name) + '</span>' : '') +
          '<span class="gain-chip">牌组 ' + run.deck.length + ' / ' + SH.RULES.deckMax + '</span>' +
        '</div>' +
        '<div class="screen-foot"><button class="btn ghost" data-act="skip-reward">' + icon('skip', 13) + ' 舍弃卡牌，继续前行</button></div>' +
      '</div>'
    );
  }

  /* ---------------- 坊市 ---------------- */
  function renderShop() {
    const shop = app.ui.shop;
    if (!shop) return '';
    const run = app.run;
    const freeRefresh = run.relics.indexOf('R_018') >= 0 && !run.flags.freeRefreshUsed;
    const refreshPrice = freeRefresh ? 0 : 10 + 5 * shop.refreshed;
    const noRefresh = !!shop.noRefresh;
    const cardPrice = (id) => SH.run.priceWithOmen(run, SH.run.cardPrice(id));
    return (
      topBar() +
      '<div class="screen shop-screen">' +
        watermark('市') +
        '<div class="screen-head"><h2>坊 市</h2><p>荒髓 ' + run.husui + ' · 离市之后，货架即散</p></div>' +
        '<div class="shop-grid">' +
          '<div class="shop-col"><h4>' + icon('deck', 14) + ' 卡牌</h4>' +
            shop.cards.map((id, i) => {
              const bought = shop.bought.indexOf('card' + i) >= 0;
              const inst = { uid: 'shop_' + i, id: id, upgraded: false, face: 'tame' };
              const price = cardPrice(id);
              return '<div class="shop-item ' + (bought ? 'bought' : '') + '">' +
                cardHTML(inst, { action: 'noop' }) +
                '<button class="btn price" data-act="buy-card" data-i="' + i + '" ' + (bought || run.husui < price ? 'disabled' : '') + '>' +
                  (bought ? '已 售 出' : price + ' 荒髓') + '</button>' +
              '</div>';
            }).join('') +
          '</div>' +
          '<div class="shop-col"><h4>' + icon('seal', 14) + ' 遗物</h4>' +
            shop.relics.map((id, i) => {
              const bought = shop.bought.indexOf('relic' + i) >= 0;
              const r = SH.RELIC_BY_ID[id];
              const price = SH.run.priceWithOmen(run, SH.run.relicPrice(id));
              return '<div class="shop-relic ' + (bought ? 'bought' : '') + '">' +
                '<div class="relic-big r-' + r.rarity + '"><i>' + esc(r.name.slice(0, 1)) + '</i></div>' +
                '<div class="sr-name">' + esc(r.name) + '</div>' +
                '<div class="sr-text">' + esc(r.text) + '</div>' +
                '<button class="btn price" data-act="buy-relic" data-i="' + i + '" ' + (bought || run.husui < price ? 'disabled' : '') + '>' +
                  (bought ? '已 售 出' : price + ' 荒髓') + '</button>' +
              '</div>';
            }).join('') +
            '<div class="shop-relic ' + (shop.bought.indexOf('husui') >= 0 ? 'bought' : '') + '">' +
              '<div class="relic-big r-normal"><i>髓</i></div>' +
              '<div class="sr-name">荒髓囊</div>' +
              '<div class="sr-text">割血换髓：支付 10 点生命，换得 25 荒髓。每坊市限一次。</div>' +
              '<button class="btn price" data-act="buy-husui" ' + (shop.bought.indexOf('husui') >= 0 || run.hp <= 11 ? 'disabled' : '') + '>' +
                (shop.bought.indexOf('husui') >= 0 ? '已 售 出' : '10 生命') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="screen-foot">' +
          '<button class="btn" data-act="refresh-shop" ' + (noRefresh || run.husui < refreshPrice ? 'disabled' : '') + '>' + (noRefresh ? '荒阶 · 坊市冷清（不可刷新）' : '刷新货架（' + refreshPrice + ' 荒髓）') + '</button>' +
          '<button class="btn primary" data-act="leave-node">离开坊市</button>' +
        '</div>' +
      '</div>'
    );
  }

  /* ---------------- 祭坛 ---------------- */
  function renderAltar() {
    const run = app.run;
    const q = SH.run.altarQuote(run);
    return (
      topBar() +
      '<div class="screen altar-screen">' +
        watermark('祭') +
        '<div class="screen-head"><h2>古 祭 坛</h2><p>以荒髓或生命为价，改写牌组 · 每座祭坛只回应一次</p></div>' +
        '<div class="altar-grid">' +
          '<button class="altar-opt" data-act="altar-mode" data-mode="remove" ' + (run.husui < q.remove ? 'disabled' : '') + '>' +
            '<span class="opt-icon">' + icon('close', 18) + '</span>' +
            '<b>删 牌</b><span>' + q.remove + ' 荒髓</span><i>牌组不得低于 ' + SH.RULES.deckMin + ' 张</i></button>' +
          '<button class="altar-opt" data-act="altar-mode" data-mode="upgrade" ' + (run.husui < q.upgrade ? 'disabled' : '') + '>' +
            '<span class="opt-icon">' + icon('seal', 18) + '</span>' +
            '<b>升 级</b><span>' + q.upgrade + ' 荒髓</span><i>每张牌限一次，双面同时生效</i></button>' +
          '<button class="altar-opt" data-act="altar-mode" data-mode="mutate" ' + (run.husui < q.mutate ? 'disabled' : '') + '>' +
            '<span class="opt-icon">' + icon('crystal', 18) + '</span>' +
            '<b>异 变</b><span>' + q.mutate + ' 荒髓</span><i>化为独立的异变之牌</i></button>' +
          '<button class="altar-opt" data-act="altar-mode" data-mode="life" ' + (run.hp <= q.lifeRemove + 1 ? 'disabled' : '') + '>' +
            '<span class="opt-icon">' + icon('heart', 18) + '</span>' +
            '<b>以 血 代 价</b><span>' + q.lifeRemove + ' 生命</span><i>仅可替代一次删牌</i></button>' +
        '</div>' +
        '<div class="screen-foot"><button class="btn ghost" data-act="leave-node">默然离开</button></div>' +
      '</div>'
    );
  }

  /* ---------------- 山神祠 ---------------- */
  function renderShrine() {
    const run = app.run;
    const s = app.ui.shrine || { mode: 'main', omens: [] };
    if (s.mode === 'omen') {
      return (
        topBar() +
        '<div class="screen shrine-screen">' +
          watermark('誓') +
          '<div class="screen-head"><h2>立 誓</h2><p>誓约本局永久，至多三条 · 增益愈强，约束愈重</p></div>' +
          '<div class="omen-grid">' +
            s.omens.map((id) => {
              const o = SH.OMEN_BY_ID[id];
              return '<button class="omen-card" data-act="pick-omen" data-id="' + id + '">' +
                '<b>' + esc(o.name) + '</b><span class="up">利 · ' + esc(o.up) + '</span>' +
                '<span class="down">弊 · ' + esc(o.down) + '</span></button>';
            }).join('') +
          '</div>' +
          '<div class="screen-foot"><button class="btn ghost" data-act="shrine-back">返回祠堂</button></div>' +
        '</div>'
      );
    }
    return (
      topBar() +
      '<div class="screen shrine-screen">' +
        watermark('祠') +
        '<div class="screen-head"><h2>山 神 祠</h2><p>香火未绝 · 三选其一</p></div>' +
        '<div class="shrine-grid">' +
          '<button class="shrine-opt" data-act="shrine-heal">' +
            '<span class="opt-icon">' + icon('heart', 18) + '</span>' +
            '<b>祈 愈</b><span>恢复 30% 最大生命</span><i>约 ' + Math.ceil(run.maxHp * 0.3) + ' 点</i></button>' +
          '<button class="shrine-opt" data-act="shrine-omen" ' + (run.omens.length >= 3 ? 'disabled' : '') + '>' +
            '<span class="opt-icon">' + icon('seal', 18) + '</span>' +
            '<b>立 誓</b><span>择一项巡荒誓约</span><i>' + (run.omens.length >= 3 ? '誓约已满' : '本局永久，不可解除') + '</i></button>' +
          '<button class="shrine-opt" data-act="shrine-husui">' +
            '<span class="opt-icon">' + icon('crystal', 18) + '</span>' +
            '<b>取 香 火</b><span>获得 15 荒髓</span><i>山神不问去处</i></button>' +
        '</div>' +
        '<div class="screen-foot"><button class="btn ghost" data-act="leave-node">退出祠堂</button></div>' +
      '</div>'
    );
  }

  /* ---------------- 事件 ---------------- */
  function renderEvent() {
    const ev = app.ui.event;
    if (!ev) return '';
    const run = app.run;
    const def = ev.def;
    return (
      topBar() +
      '<div class="screen event-screen">' +
        watermark('踪') +
        '<div class="event-card">' +
          '<div class="event-seal">踪</div>' +
          '<div class="event-kicker">异 兽 踪</div>' +
          '<h2>' + esc(def.name) + '</h2>' +
          '<p class="event-text">' + esc(def.text) + '</p>' +
          (def.linkHit && def.linkHit.length ? '<div class="event-link">联动 · ' + def.linkHit.map(esc).join(' · ') + '</div>' : '') +
          '<div class="event-options">' +
            def.options.map((opt, i) => {
              const cost = opt.cost || {};
              const blocked = (cost.husui && run.husui < cost.husui) || (cost.hp && run.hp <= cost.hp) || ev.done;
              const costText = [cost.husui ? cost.husui + ' 荒髓' : '', cost.hp ? cost.hp + ' 生命' : ''].filter(Boolean).join(' · ');
              return '<button class="event-opt" data-act="event-option" data-i="' + i + '" ' + (blocked ? 'disabled' : '') + '>' +
                '<span class="eo-text">' + esc(opt.text) + '</span>' +
                '<span class="eo-cost">' + (costText ? '代价：' + costText : '无代价') + '</span>' +
              '</button>';
            }).join('') +
          '</div>' +
          (ev.resultText ? '<div class="event-result">' + esc(ev.resultText) + '</div>' : '') +
        '</div>' +
        (ev.done ? '<div class="screen-foot"><button class="btn primary" data-act="leave-node">继续前行</button></div>' : '') +
      '</div>'
    );
  }

  /* ---------------- 结算 ---------------- */
  function renderResult() {
    const r = app.ui.result || {};
    return (
      '<div class="screen result-screen ' + (r.win ? 'win' : 'lose') + '">' +
        '<div class="result-seal">' + (r.win ? '荒' : '殁') + '</div>' +
        '<h2>' + (r.win ? '巡荒功成' : '巡荒中止') + '</h2>' +
        '<p>' + esc(r.text || '') + '</p>' +
        '<ul class="result-stats">' +
          '<li><span>抵达</span><b>第 ' + (r.volume || 1) + ' 卷</b></li>' +
          '<li><span>荒战</span><b>' + (r.battles || 0) + '</b></li>' +
          '<li><span>击杀</span><b>' + (r.kills || 0) + '</b></li>' +
          '<li><span>种子</span><b>' + esc(r.seed || '') + '</b></li>' +
        '</ul>' +
        '<div class="screen-foot"><button class="btn primary" data-act="to-title">回到山海司</button></div>' +
      '</div>'
    );
  }

  /* ---------------- 模态 ---------------- */
  function renderModal() {
    const m = app.ui.modal;
    if (!m) return '';
    if (m.kind === 'help') return helpModal();
    if (m.kind === 'codex') return codexModal(m);
    if (m.kind === 'codex-entry') return codexEntryModal(m);
    const run = app.run;
    const list = m.list || (run ? run.deck : []);
    const title = m.title || '牌组';
    return (
      '<div class="modal-mask" data-act="close-modal">' +
        '<div class="modal">' +
          '<div class="modal-head">' +
            '<h3>' + esc(title) + '</h3>' +
            '<div class="modal-tools"><button class="btn tiny" data-act="close-modal">' + icon('close', 12) + '</button></div>' +
          '</div>' +
          '<div class="modal-body deck-grid">' +
            list.map((inst) => {
              const disabled = m.filter && !m.filter(inst);
              return cardHTML(inst, { action: m.pickAction || 'noop', disabled: !!disabled });
            }).join('') +
            (!list.length ? '<p class="empty">此处空无一物。</p>' : '') +
          '</div>' +
          '<div class="modal-foot">' + esc(m.hint || ('共 ' + list.length + ' 张 · 点击空白处关闭')) + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  const CODEX_TABS = [
    ['atlas', '卡牌图鉴'], ['cards', '全卡'], ['relics', '遗物'], ['enemies', '敌人'], ['events', '事件'],
    ['keywords', '关键词'], ['achievements', '成就'], ['schools', '流派'], ['affixes', '荒阶']
  ];

  function codexModal(m) {
    const tab = m.tab || 'atlas';
    let body = '';
    if (tab === 'atlas') {
      body = atlasBody(m);
    } else if (tab === 'cards') {
      const list = SH.CARDS.filter((c) => {
        if (m.filterType && m.filterType !== 'all' && c.type !== m.filterType) return false;
        if (m.filterElem && m.filterElem !== 'all' && c.element !== m.filterElem) return false;
        return true;
      });
      body = '<div class="deck-grid">' + list.map((inst) => cardHTML(inst, { action: 'noop' })).join('') +
        (!list.length ? '<p class="empty">此处空无一物。</p>' : '') + '</div>';
    } else {
      body = codexList(tab);
    }
    const tot = SH.codex ? SH.codex.totals() : { total: 150, recorded: 0, authored: 0 };
    const batch = SH.CODEX_BATCH || { total: 8, loaded: [1] };
    const loaded = batch.loaded || [batch.index || 1];
    const batchNo = loaded.length > 1 ? loaded[0] + '—' + loaded[loaded.length - 1] : String(loaded[0]);
    return (
      '<div class="modal-mask" data-act="close-modal">' +
        '<div class="modal codex-modal">' +
          '<div class="modal-head">' +
            '<h3>' + esc(m.title || '图 鉴') + '</h3>' +
            '<div class="modal-tools"><button class="btn tiny" data-act="close-modal">' + icon('close', 12) + '</button></div>' +
          '</div>' +
          '<div class="modal-tabs codex-tabs">' +
            CODEX_TABS.map(([k, label]) => '<button class="tab ' + (tab === k ? 'on' : '') + '" data-act="codex-tab" data-tab="' + k + '">' + label + '</button>').join('') +
          '</div>' +
          (tab === 'cards' ? codexTabs(m) : '') +
          '<div class="modal-body codex-body">' + body + '</div>' +
          '<div class="modal-foot">' + esc(m.hint || ('图鉴已录 ' + tot.recorded + ' / ' + tot.total +
            ' · 释文 ' + tot.authored + ' / ' + tot.total + ' · 批次 ' + batchNo + '／' + batch.total + ' · 点击空白处关闭')) + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  /* ---------------- 异兽图鉴 ---------------- */
  function atlasBody(m) {
    const scope = m.atlasType || 'beast';
    const st = SH.codex.stats(scope);
    const elem = m.atlasElem || 'all';
    const rec = m.atlasRec || 'all';
    const reveal = !!m.revealAll;
    const list = SH.codex.list({ type: scope, element: elem, recorded: rec });
    const scopes = SH.codex.TYPE_ORDER.map((k) => ({ key: k, label: SH.codex.TYPE_LABEL[k], stat: SH.codex.stats(k) }));
    const pct = st.total ? Math.round((st.recorded / st.total) * 100) : 0;
    const elems = [['all', '五行']].concat(
      SH.codex.elemOrder
        .filter((e) => (st.byElem[e] || { total: 0 }).total > 0)
        .map((e) => [e, e])
    );
    const recordedAll = st.recorded === 0;

    const scopeBar = '<div class="atlas-scopes"><span class="as-label">卷 目</span>' +
      scopes.map((sc) => '<button class="atlas-scope ' + (scope === sc.key ? 'on' : '') + '" data-act="atlas-type" data-type="' + sc.key + '">' +
        sc.label + '<b>' + sc.stat.recorded + '</b><span>/' + sc.stat.total + '</span></button>').join('') +
      '</div>';

    let head = '<div class="atlas-head">' +
      '<div class="atlas-progress" title="首次获得该卡即录入图鉴">' +
        '<b>' + st.recorded + '</b><span>/ ' + st.total + ' 已录</span>' +
        '<i class="atlas-bar"><em style="width:' + pct + '%"></em></i>' +
      '</div>' +
      '<div class="atlas-elems">' + elems.map(([k, label]) => {
        const b = k === 'all' ? { recorded: st.recorded, total: st.total } : (st.byElem[k] || { recorded: 0, total: 0 });
        const c = k === 'all' ? '#c9a961' : SH.art.elemColor(k);
        return '<button class="atlas-el ' + (elem === k ? 'on' : '') + '" style="--e:' + c + '" ' +
          'data-act="atlas-elem" data-elem="' + k + '">' + label +
          '<b>' + b.recorded + '</b><span>/' + b.total + '</span></button>';
      }).join('') + '</div>' +
      '<div class="atlas-tools">' +
        [['all', '全部'], ['recorded', '已录'], ['missing', '未录']].map(([k, label]) =>
          '<button class="tab ' + (rec === k ? 'on' : '') + '" data-act="atlas-rec" data-rec="' + k + '">' + label + '</button>'
        ).join('') +
        '<button class="btn tiny ghost atlas-reveal ' + (reveal ? 'on' : '') + '" data-act="codex-reveal" title="未录入者也可读释文，便于校订">' +
          (reveal ? '收起通览' : '通览未录') + '</button>' +
      '</div>' +
    '</div>';

    if (recordedAll) {
      head += '<p class="atlas-note">初访图鉴：尚无已录' + SH.codex.TYPE_LABEL[scope] + '。' +
        (reveal ? '已默认展开全卷释文（校订用）。' : '可点「通览未录」查看释文。') +
        '首次获得该卡后即记为「已录」。</p>';
    }

    const grid = '<div class="atlas-grid">' + list.map((row) => {
      const def = row.def;
      const e = row.entry;
      const locked = !row.recorded;
      const dim = locked && !reveal;
      return '<button class="atlas-tile ' + (row.recorded ? 'recorded' : 'locked') + (dim ? ' dim' : '') +
        (def.notReady ? ' not-ready' : '') +
        (SH.codex.isNew(def.id) ? ' is-new' : '') + (e.authored ? '' : ' pending') + '" ' +
        'style="--e:' + SH.art.elemColor(def.element) + '" data-act="codex-entry" data-id="' + def.id + '" ' +
        'title="' + esc(def.name + ' · ' + e.typeName + ' · ' + (def.notReady ? '未完成' : row.recorded ? '已录' : '未录') + (e.authored ? '' : ' · 释文待补')) + '">' +
        '<span class="at-ico"><img loading="lazy" src="' + SH.art.cardIcon(def) + '" alt="' + esc(def.name) + '"></span>' +
        '<span class="at-name">' + esc(def.name) + '<i class="at-el">' + esc(def.element) + '</i></span>' +
        '<span class="at-tags">' + esc((e.tags || []).join(' · ')) + '</span>' +
        '<span class="at-state">' + (def.notReady ? '未完成' : (row.recorded ? '已录' : (reveal ? '未录 · 通览' : '未录'))) + '</span>' +
        (SH.codex.isNew(def.id) ? '<span class="at-new">新</span>' : '') +
        '</button>';
    }).join('') + '</div>';

    return scopeBar + head + (list.length ? grid : '<p class="empty">此卷尚无符合条件的卡牌。</p>');
  }

  function codexEntryModal(m) {
    const def = SH.CARD_BY_ID[m.id];
    if (!def || !SH.codex) return codexModal({ kind: 'codex', tab: 'atlas' });
    const e = SH.codex.entryOf(def);
    const rec = SH.codex.isRecorded(def.id);
    const reveal = rec || !!m.revealAll;
    const ts = SH.codex.recordedAt(def.id);
    const scope = m.scopeType || def.type;
    const unit = ({ beast: '兽', spell: '术', terrain: '地', ritual: '仪', mutant: '变' })[scope] || '卡';
    const all = SH.codex.list({ type: scope });
    const idx = all.findIndex((x) => x.def.id === def.id);
    const elemList = all.filter((x) => x.def.element === def.element);
    const eIdx = elemList.findIndex((x) => x.def.id === def.id);
    const st = SH.codex.stats(scope);
    const ec = SH.art.elemColor(def.element);

    const faceBox = (f, label, mark) => {
      if (!f) return '';
      const b = f.beast;
      return '<div class="ce-face ' + mark + '">' +
        '<div class="ce-face-head"><span>' + label + '</span><b>' + (f.cost == null ? 0 : f.cost) + ' 灵气</b></div>' +
        (b ? '<div class="ce-face-stat">攻 ' + b.atk + ' · 血 ' + b.hp + '</div>' : '') +
        '<p>' + esc(f.text || '') + '</p>' +
      '</div>';
    };

    const body = reveal ?
      '<div class="ce-left">' +
        '<img class="ce-art" src="' + SH.art.card(def, { face: 'tame' }) + '" alt="' + esc(def.name) + '">' +
        '<div class="ce-faces">' +
          (def.type === 'beast' ?
            faceBox(def.faces && def.faces.tame, '驯化', 'tame') +
            faceBox(def.faces && def.faces.feral, '凶化', 'feral') :
            faceBox(def.faces && def.faces.tame, e.typeName, 'tame')) +
        '</div>' +
      '</div>' +
      '<div class="ce-right">' +
        (e.quote ?
          '<blockquote class="ce-quote">「' + esc(e.quote) + '」<cite>山 海 经</cite></blockquote>' :
          '<div class="ce-quote none">经文未载 · 以形性录之</div>') +
        (e.lore ?
          '<p class="ce-lore">' + esc(e.lore) + '</p>' :
          '<p class="ce-lore pending">释文待补：此兽目前仅录机制，意象条文将在后续批次补入。</p>') +
        '<div class="ce-mech"><span class="ce-lab">机 制</span><p>' + esc(e.mech || '—') + '</p></div>' +
        '<div class="ce-tags">' + (e.tags || []).map((t) => '<span>' + esc(t) + '</span>').join('') + '</div>' +
        '<dl class="ce-meta">' +
          '<div><dt>解锁</dt><dd>' + esc(e.unlock) + '</dd></div>' +
          '<div><dt>图标</dt><dd class="mono">' + esc(e.iconId) + '</dd></div>' +
          '<div><dt>收录</dt><dd>' + (rec ? (ts ? new Date(ts).toLocaleDateString('zh-CN') : '已录') : '未录 · 通览') + '</dd></div>' +
          '<div><dt>序号</dt><dd>' + esc(def.element) + ' · ' + (eIdx + 1) + ' / ' + elemList.length + '</dd></div>' +
          '<div><dt>总序</dt><dd>' + (idx + 1) + ' / ' + all.length + '</dd></div>' +
          (e.designUnlock ? '<div><dt>原案</dt><dd>' + esc(e.designUnlock) + ' · 规则未实装</dd></div>' : '') +
          (def.notReady ? '<div><dt>状态</dt><dd>未完成 · 暂不可获得</dd></div>' : '') +
          (e.authored ? '' : '<div><dt>释文</dt><dd>待补（后续批次）</dd></div>') +
        '</dl>' +
      '</div>' :
      '<div class="ce-left">' +
        '<img class="ce-art locked" src="' + SH.art.card(def, { face: 'tame' }) + '" alt="">' +
      '</div>' +
      '<div class="ce-right">' +
        '<div class="ce-locked">' +
          '<span class="ce-lock-seal">未 录</span>' +
          '<p>此兽尚未收入山海司图鉴。<br>解锁条件：' + esc(e.unlock) + '。</p>' +
          '<button class="btn tiny" data-act="codex-reveal">破例通览释文</button>' +
        '</div>' +
        '<dl class="ce-meta">' +
          '<div><dt>图标</dt><dd class="mono">' + esc(e.iconId) + '</dd></div>' +
          '<div><dt>序号</dt><dd>' + esc(def.element) + ' · ' + (eIdx + 1) + ' / ' + elemList.length + '</dd></div>' +
          '<div><dt>总序</dt><dd>' + (idx + 1) + ' / ' + all.length + '</dd></div>' +
          (e.designUnlock ? '<div><dt>原案</dt><dd>' + esc(e.designUnlock) + ' · 规则未实装</dd></div>' : '') +
          (def.notReady ? '<div><dt>状态</dt><dd>未完成 · 暂不可获得</dd></div>' : '') +
        '</dl>' +
      '</div>';

    return (
      '<div class="modal-mask" data-act="close-modal">' +
        '<div class="modal codex-entry-modal" style="--e:' + ec + '">' +
          '<div class="modal-head">' +
            '<h3>' + esc(def.name) + ' ' + elemBadge(def.element) +
              ' <i class="ce-type">' + esc(e.typeName) + '</i>' +
              ' <i class="ce-rarity">' + esc(SH.RARITY_NAME[def.rarity] || '') + '</i>' +
              (def.notReady ? ' <i class="ce-unrec">未完成</i>' : (rec ? '' : ' <i class="ce-unrec">未录</i>')) + '</h3>' +
            '<div class="modal-tools">' +
              '<button class="btn tiny" data-act="codex-back">返回图鉴</button>' +
              '<button class="btn tiny" data-act="codex-step" data-dir="-1" title="上一兽">‹</button>' +
              '<button class="btn tiny" data-act="codex-step" data-dir="1" title="下一兽">›</button>' +
              '<button class="btn tiny" data-act="close-modal">' + icon('close', 12) + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="modal-body ce-body">' + body + '</div>' +
          '<div class="modal-foot">第 ' + (idx + 1) + ' / ' + all.length + ' ' + unit + ' · 已录 ' + st.recorded + ' / ' + st.total +
            (rec ? '' : ' · 未录（可通览）') + ' · ← → 切换</div>' +
        '</div>' +
      '</div>'
    );
  }

  function codexTabs(m) {
    const types = [['all', '全部'], ['beast', '异兽'], ['spell', '术法'], ['terrain', '山泽'], ['ritual', '祭仪']];
    const elems = ['all', '金', '木', '水', '火', '土', '无'];
    let out = '<div class="modal-tabs">';
    types.forEach(([k, label]) => {
      out += '<button class="tab ' + ((m.filterType || 'all') === k ? 'on' : '') + '" data-act="modal-filter" data-type="' + k + '">' + label + '</button>';
    });
    out += '</div><div class="modal-tabs">';
    elems.forEach((e) => {
      out += '<button class="tab ' + ((m.filterElem || 'all') === e ? 'on' : '') + '" data-act="modal-filter" data-elem="' + e + '">' + (e === 'all' ? '五行' : e) + '</button>';
    });
    return out + '</div>';
  }

  function codexList(tab) {
    if (tab === 'relics') {
      return SH.RELICS.map((r) => (
        '<article class="codex-row r-' + r.rarity + '">' +
          '<div class="cr-id">' + esc(r.id) + '</div>' +
          '<div class="cr-main"><h4>' + esc(r.name) + (r.notReady ? ' <i class="nr">未完成</i>' : '') + '</h4>' +
            '<p>' + esc(r.text) + '</p>' +
            '<div class="cr-meta"><span>' + esc(SH.RARITY_NAME[r.rarity] || r.rarity) + '</span><span>时机 · ' + esc(r.timing) + '</span>' +
            (r.conflict && r.conflict.length ? '<span>互斥 · ' + r.conflict.map(esc).join(' / ') + '</span>' : '') +
            '<span>' + (r.tags || []).map(esc).join(' · ') + '</span></div></div>' +
        '</article>'
      )).join('');
    }
    if (tab === 'enemies') {
      return SH.ENEMIES.map((e) => {
        const pool = e.phases ? e.phases.map((p) => p.name + '：' + Object.keys(p.pool).map((k) => k + p.pool[k]).join('/')).join('｜') : Object.keys(e.intent).map((k) => k + e.intent[k]).join('/');
        return '<article class="codex-row e-' + e.kind + '">' +
          '<div class="cr-id">' + esc(e.id) + '</div>' +
          '<div class="cr-main"><h4>' + esc(e.name) + ' <i class="tag">' + esc(e.element) + '</i></h4>' +
            '<p>' + esc(e.text || '') + '</p>' +
            '<div class="cr-meta"><span>生命 ' + e.hp + '</span><span>攻击 ' + e.atk + '</span><span>推进 ' + e.advance + '</span>' +
              '<span>意图 ' + esc(pool) + '</span>' + (e.affixText ? '<span>词缀 ' + esc(e.affixText) + '</span>' : '') +
              (e.replace ? '<span>' + esc(e.replace) + '</span>' : '') + '</div></div>' +
        '</article>';
      }).join('');
    }
    if (tab === 'events') {
      return SH.EVENTS.map((e) => (
        '<article class="codex-row"><div class="cr-id">' + esc(e.id) + '</div>' +
          '<div class="cr-main"><h4>' + esc(e.name) + ' <i class="tag">' + (e.act ? '第 ' + e.act + ' 卷' : '任意卷') + '</i></h4>' +
            '<p>' + esc(e.lore || e.text || '') + '</p>' +
            '<div class="cr-opts">' + e.options.map((o, i) => '<span><b>' + 'ABC'[i] + '</b>' + esc(o.text) + '</span>').join('') + '</div>' +
            (e.link && e.link !== '无' ? '<div class="cr-meta"><span>联动 · ' + esc(e.link) + '</span></div>' : '') +
          '</div></article>'
      )).join('');
    }
    if (tab === 'keywords') {
      return SH.KEYWORDS.map((k) => (
        '<article class="codex-row"><div class="cr-id">' + esc(k.id) + '</div>' +
          '<div class="cr-main"><h4>' + esc(k.name) + '</h4><p>' + esc(k.def) + '</p>' +
            '<div class="cr-meta"><span>边界 · ' + esc(k.bound) + '</span><span>' + esc(k.tip) + '</span></div></div></article>'
      )).join('');
    }
    if (tab === 'achievements') {
      const meta = SH.loadMeta();
      const got = meta.achievements || {};
      return SH.ACHIEVEMENTS.map((a) => (
        '<article class="codex-row ach ' + (got[a.id] ? 'got' : '') + '">' +
          '<div class="cr-id">' + esc(a.id) + '</div>' +
          '<div class="cr-main"><h4>' + (got[a.id] ? '◆ ' : '◇ ') + esc(a.name) + ' <i class="tag">' + esc(a.cat) + '</i>' + (a.notReady ? ' <i class="nr">待挑战系统</i>' : '') + '</h4>' +
            '<p>' + esc(a.cond) + ' · 奖励：' + esc(a.reward) + '</p>' +
            '<div class="cr-meta"><span>' + esc(a.lore) + '</span></div></div></article>'
      )).join('');
    }
    if (tab === 'schools') {
      return SH.SCHOOLS.map((s) => (
        '<article class="codex-row"><div class="cr-id">' + esc(s.id) + '</div>' +
          '<div class="cr-main"><h4>' + esc(s.name) + '</h4>' +
            '<div class="cr-meta"><span>核心卡 · ' + esc(s.coreCards) + '</span><span>核心遗物 · ' + esc(s.coreRelics) + '</span></div>' +
            '<p>成型 · ' + esc(s.stage) + '</p><p>优势 · ' + esc(s.pros) + '；劣势 · ' + esc(s.cons) + '</p>' +
            '<div class="cr-meta"><span>防无限 · ' + esc(s.limit) + '</span><span>验收 · ' + esc(s.test) + '</span></div></div></article>'
      )).join('') + '<div class="codex-matrix">' +
        Object.keys(SH.SCHOOL_FIT).map((k) => {
          const f = SH.SCHOOL_FIT[k];
          return '<div><b>' + esc(k) + '</b><span>白泽 ' + esc(f.baiZe) + ' · 穷奇 ' + esc(f.qiongQi) + ' · 招摇 ' + esc(f.zhaoYao) + ' · 巫咸 ' + esc(f.wuXian) + '</span></div>';
        }).join('') + '</div>';
    }
    if (tab === 'affixes') {
      return SH.AFFIXES.map((a) => (
        '<article class="codex-row"><div class="cr-id">' + esc(a.id) + '</div>' +
          '<div class="cr-main"><h4>' + esc(a.name) + ' <i class="tag">荒阶 ' + a.minRank + '+</i></h4>' +
            '<p>' + esc(a.text) + '</p>' +
            '<div class="cr-meta">' + (a.conflict.length ? '<span>互斥 · ' + a.conflict.map(esc).join(' / ') + '</span>' : '') + '</div></div></article>'
      )).join('');
    }
    return '';
  }

  function helpModal() {
    const rows = SH.KEYWORDS.map((k) => '<div class="help-row"><dt>' + esc(k.name) + '</dt><dd>' + esc(k.tip) + '</dd></div>').join('');
    return (
      '<div class="modal-mask" data-act="close-modal">' +
        '<div class="modal" style="width:min(980px,93vw)">' +
          '<div class="modal-head"><h3>经 义 · 巡荒须知</h3>' +
            '<div class="modal-tools">' +
              '<button class="btn tiny" data-act="replay-intro">重看开场</button>' +
              '<button class="btn tiny" data-act="start-guide">新手引导</button>' +
              '<button class="btn tiny" data-act="close-modal">' + icon('close', 12) + '</button>' +
            '</div></div>' +
          '<div class="modal-body help-body">' +
            '<div class="help-col">' +
              '<h4>一、荒痕之战</h4>' +
              '<div class="help-steps">' +
                '<div class="help-step"><b>壹</b><span>敌自「荒外」入场，沿前哨、中阵、后阵推进；抵达后阵且无人阻挡时「突入本体」，你直接受伤。</span></div>' +
                '<div class="help-step"><b>贰</b><span>异兽召唤当回合「失调」，只能阻挡、不能攻击；下一回合开始才可行动。</span></div>' +
                '<div class="help-step"><b>叁</b><span>每回合自动抽 5 张牌，灵气回满。灵涌是临时灵气，可溢出上限 2 点，回合结束清零。</span></div>' +
                '<div class="help-step"><b>肆</b><span>异兽与敌人同格时，回合结束自动互相攻击；点击己方异兽可花 1 灵气移动到相邻空格。</span></div>' +
              '</div>' +
              '<h4 style="margin-top:22px">二、双面与相生</h4>' +
              '<div class="help-steps">' +
                '<div class="help-step"><b>伍</b><span>异兽牌有「驯化 / 凶化」两面：花 1 灵气翻面，每张牌每回合一次。驯化偏守与控制，凶化偏攻与自损。</span></div>' +
                '<div class="help-step"><b>陆</b><span>按五行相生顺序连续出牌（金→水→木→火→土→金）可减 1 费并获得灵涌，每回合至多 3 次。</span></div>' +
                '<div class="help-step"><b>柒</b><span>五行相克（金克木、木克土、土克水、水克火、火克金）时伤害 ×1.5，并附加对应状态。</span></div>' +
                '<div class="help-step"><b>捌</b><span>异兽阵亡后本场进入「荒蚀」，同名异兽牌不可再打出。同名卡组上限见卡面稀有度。</span></div>' +
                '<div class="help-step"><b>玖</b><span>异兽牌打出时二选一：<b>召唤</b>（入荒痕）或<b>施术</b>（按当前面直接结算，随即进消耗堆）。荒蚀只禁召唤，不禁施术。</span></div>' +
                '<div class="help-step"><b>拾</b><span>晕眩跳过整段行动，束缚封住推进意图，升空则不占格、不受击也不阻挡；无「对空」者打不到升空单位。</span></div>' +
              '</div>' +
            '</div>' +
            '<div class="help-col">' +
              '<h4>三、词条释名</h4>' +
              rows +
            '</div>' +
          '</div>' +
          '<div class="modal-foot">按 Esc 或点击空白处关闭</div>' +
        '</div>' +
      '</div>'
    );
  }

  /* ---------------- 主渲染 ---------------- */
  const SCREENS = {
    title: renderTitle,
    hero: renderHeroSelect,
    map: renderMap,
    battle: renderBattle,
    reward: renderReward,
    shop: renderShop,
    altar: renderAltar,
    shrine: renderShrine,
    event: renderEvent,
    result: renderResult
  };

  function render() {
    const fn = SCREENS[app.screen] || renderTitle;
    if (app.run && app.battle && app.battle.kind) {
      app.battle.kindName = ({ battle: '荒战', elite: '凶兽巢', boss: '卷末首领' })[app.battle.kind] || '荒战';
    }
    const tut = (SH.tutorial && !app.ui.modal) ? SH.tutorial.render() : '';
    rootEl.innerHTML =
      fn() +
      renderModal() +
      tut +
      '<div class="toast ' + (app.ui.toast ? 'show' : '') + '">' + esc(app.ui.toast) + '</div>';
    document.body.dataset.screen = app.screen;
    const log = document.getElementById('logList');
    if (log) log.scrollTop = log.scrollHeight;
    if (SH.tutorial) SH.tutorial.afterRender();
    if (SH.fx) SH.fx.afterRender(app);
  }

  /* ---------------- 提示 ---------------- */
  let toastTimer = null;
  function toast(msg) {
    app.ui.toast = msg;
    render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      app.ui.toast = '';
      render();
    }, 1800);
  }

  /* ---------------- 交互 ---------------- */
  function onClick(ev) {
    const t = ev.target.closest('[data-act]');
    if (!t) return;
    const act = t.getAttribute('data-act');
    if (!act || act === 'noop') return;
    if (t.classList.contains('modal-mask') && ev.target.closest('.modal')) return;
    ev.preventDefault();
    ev.stopPropagation();

    const run = app.run;
    const b = app.battle;

    if (act.indexOf('tut-') === 0) {
      if (SH.tutorial) SH.tutorial.handle(act, t);
      return;
    }

    switch (act) {
      case 'start-tutorial':
        if (SH.tutorial) SH.tutorial.startFresh();
        return;

      case 'replay-intro':
        app.ui.modal = null;
        render();
        if (SH.fx) SH.fx.intro();
        return;

      case 'start-guide':
        app.ui.modal = null;
        if (!run) { if (SH.tutorial) SH.tutorial.startFresh(); return; }
        if (SH.tutorial) SH.tutorial.startFromScreen(app.screen);
        return;

      case 'new-run':
        app.screen = 'hero';
        render();
        return;

      case 'pick-diff': {
        const si = document.getElementById('seedInput');
        if (si) app.ui.seedText = si.value;
        app.ui.difficulty = parseInt(t.getAttribute('data-v'), 10) || 0;
        render();
        return;
      }

      case 'pick-hero': {
        const input = document.getElementById('seedInput');
        const raw = input ? input.value.trim() : '';
        let seed = null;
        if (raw) {
          const m = /^SH-([0-9A-Z]+)$/i.exec(raw);
          if (m) seed = parseInt(m[1], 36);
          else if (/^\d+$/.test(raw)) seed = parseInt(raw, 10) >>> 0;
          else {
            let h = 2166136261;
            for (let i = 0; i < raw.length; i++) { h ^= raw.charCodeAt(i); h = Math.imul(h, 16777619); }
            seed = h >>> 0;
          }
        }
        startRun(t.getAttribute('data-id'), { seed: seed, difficulty: app.ui.difficulty || 0 });
        return;
      }

      case 'continue':
        resume();
        return;

      case 'to-title': {
        // 结算后离席：清掉已结束的一局，避免 pagehide 又把它写回存档
        const ended = app.screen === 'result';
        if (ended) {
          app.run = null;
          app.battle = null;
        } else if (app.run) {
          saveRun();
        }
        app.screen = 'title';
        app.ui.targeting = null;
        app.ui.selectedUnit = null;
        app.ui.modal = null;
        if (ended || !app.run) app.ui.tutorial = null;
        render();
        return;
      }

      case 'open-deck':
        app.ui.modal = { title: '当前牌组 · ' + run.deck.length + ' 张', pickAction: 'noop' };
        render();
        return;

      case 'open-help':
        app.ui.modal = { kind: 'help' };
        render();
        return;

      case 'open-codex': {
        const st = SH.codex ? SH.codex.stats('beast') : { recorded: 0 };
        if (SH.codex) SH.codex.markSeen();
        app.ui.modal = {
          kind: 'codex', tab: 'atlas',
          title: '图 鉴 · 卡 牌 录',
          atlasType: 'beast', atlasElem: 'all', atlasRec: 'all',
          revealAll: st.recorded === 0,
          hint: ''
        };
        render();
        return;
      }

      case 'open-achievements': {
        app.ui.modal = { kind: 'codex', tab: 'achievements', title: '成 就 · ' + SH.ACHIEVEMENTS.length + ' 项' };
        render();
        return;
      }

      case 'codex-tab': {
        if (!app.ui.modal) return;
        app.ui.modal.tab = t.getAttribute('data-tab') || 'atlas';
        render();
        return;
      }

      case 'atlas-type': {
        if (!app.ui.modal) return;
        app.ui.modal.atlasType = t.getAttribute('data-type') || 'beast';
        app.ui.modal.atlasElem = 'all';
        render();
        return;
      }

      case 'atlas-elem': {
        if (!app.ui.modal) return;
        app.ui.modal.atlasElem = t.getAttribute('data-elem') || 'all';
        render();
        return;
      }

      case 'atlas-rec': {
        if (!app.ui.modal) return;
        app.ui.modal.atlasRec = t.getAttribute('data-rec') || 'all';
        render();
        return;
      }

      case 'codex-entry': {
        const m = app.ui.modal;
        if (!m) return;
        app.ui.modal = {
          kind: 'codex-entry',
          id: t.getAttribute('data-id'),
          title: '图 鉴 · 卡 牌 录',
          scopeType: m.atlasType || 'beast',
          atlasElem: m.atlasElem || 'all',
          atlasRec: m.atlasRec || 'all',
          revealAll: !!m.revealAll
        };
        render();
        return;
      }

      case 'codex-back': {
        const m = app.ui.modal;
        if (!m) return;
        app.ui.modal = {
          kind: 'codex', tab: 'atlas', title: '图 鉴 · 卡 牌 录',
          atlasType: m.scopeType || 'beast',
          atlasElem: m.atlasElem || 'all',
          atlasRec: m.atlasRec || 'all',
          revealAll: !!m.revealAll
        };
        render();
        return;
      }

      case 'codex-step': {
        const m = app.ui.modal;
        if (!m || !m.id) return;
        const list = SH.codex.list({ type: m.scopeType || 'beast' });
        if (!list.length) return;
        let i = list.findIndex((x) => x.def.id === m.id);
        if (i < 0) i = 0;
        const dir = parseInt(t.getAttribute('data-dir'), 10) || 1;
        i = (i + dir + list.length) % list.length;
        m.id = list[i].def.id;
        render();
        return;
      }

      case 'codex-reveal': {
        const m = app.ui.modal;
        if (!m) return;
        m.revealAll = !m.revealAll;
        render();
        return;
      }

      case 'modal-filter': {
        const m = app.ui.modal;
        if (!m) return;
        const type = t.getAttribute('data-type');
        const elem = t.getAttribute('data-elem');
        if (type) m.filterType = type;
        if (elem) m.filterElem = elem;
        render();
        return;
      }

      case 'close-modal':
        app.ui.modal = null;
        render();
        return;

      case 'enter-node':
        enterNode(t.getAttribute('data-id'));
        return;

      /* --- 战斗 --- */
      case 'play-card':
        playCard(t.getAttribute('data-uid'));
        return;

      case 'cast-card':
        castCard(t.getAttribute('data-uid'));
        return;

      case 'flip-card': {
        const inst = b.hand.find((c) => c.uid === t.getAttribute('data-uid'));
        if (inst && SH.fx) SH.fx.markFlip({ uid: inst.uid, face: inst.face === 'feral' ? 'tame' : 'feral' });
        const res = SH.engine.flipCard(b, run, t.getAttribute('data-uid'));
        if (!res.ok) { if (SH.fx) SH.fx.markFlip(null); toast(res.reason); }
        else if (SH.tutorial) SH.tutorial.notify('flip', { uid: t.getAttribute('data-uid') });
        render();
        return;
      }

      case 'choose-enemy': {
        const tg = app.ui.targeting;
        if (!tg) return;
        chooseTarget('enemy', t.getAttribute('data-uid'));
        return;
      }

      case 'choose-cell': {
        const tg = app.ui.targeting;
        if (!tg) return;
        chooseTarget('cell', parseInt(t.getAttribute('data-pos'), 10));
        return;
      }

      case 'cancel-target':
        app.ui.targeting = null;
        render();
        return;

      case 'select-unit': {
        const uid = t.getAttribute('data-uid');
        app.ui.selectedUnit = app.ui.selectedUnit === uid ? null : uid;
        render();
        return;
      }

      case 'move-here': {
        const res = SH.engine.moveUnit(b, run, app.ui.selectedUnit, parseInt(t.getAttribute('data-pos'), 10));
        if (!res.ok) toast(res.reason);
        app.ui.selectedUnit = null;
        render();
        return;
      }

      case 'use-skill': {
        const res = SH.engine.useSkill(b, run);
        if (!res.ok) toast(res.reason);
        else if (SH.fx) SH.fx.skill((SH.HERO_BY_ID[run.heroId] || {}).skill && SH.HERO_BY_ID[run.heroId].skill.name, run.heroId);
        afterBattleAction();
        return;
      }

      case 'end-turn': {
        app.ui.targeting = null;
        app.ui.selectedUnit = null;
        SH.engine.endTurn(b, run);
        afterBattleAction();
        return;
      }

      /* --- 奖励 --- */
      case 'swap-relic': {
        const r = app.ui.reward;
        if (!r || !r.relicLost) return;
        const old = t.getAttribute('data-old');
        const lost = r.relicLost;
        const idx = run.relics.indexOf(old);
        if (idx >= 0) run.relics.splice(idx, 1);
        if (!SH.run.addRelic(run, lost)) {
          if (idx >= 0) run.relics.splice(idx, 0, old);
          toast('该遗物与现有遗物互斥，无法替换');
          return;
        }
        r.relic = lost;
        r.relicLost = null;
        saveRun();
        toast('以「' + SH.RELIC_BY_ID[old].name + '」换入「' + SH.RELIC_BY_ID[lost].name + '」');
        return;
      }

      case 'drop-relic':
        if (app.ui.reward) app.ui.reward.relicLost = null;
        render();
        return;

      case 'take-card': {
        const id = t.getAttribute('data-id');
        if (!SH.run.deckAdd(run, id)) { toast('同名卡已达上限或牌组已满'); return; }
        finishReward();
        return;
      }

      case 'skip-reward':
        finishReward();
        return;

      /* --- 坊市 --- */
      case 'buy-card': {
        const i = parseInt(t.getAttribute('data-i'), 10);
        const shop = app.ui.shop;
        if (shop.bought.indexOf('card' + i) >= 0) return;
        const id = shop.cards[i];
        const price = SH.run.priceWithOmen(run, SH.run.cardPrice(id));
        if (run.husui < price) { toast('荒髓不足'); return; }
        if (!SH.run.deckAdd(run, id)) { toast('同名卡已达上限或牌组已满'); return; }
        run.husui -= price;
        shop.bought.push('card' + i);
        run.stats.shopBuys = (run.stats.shopBuys || 0) + 1;
        run.flags.noShopBuy = false;
        saveRun();
        toast('购入「' + SH.CARD_BY_ID[id].name + '」');
        return;
      }

      case 'buy-relic': {
        const i = parseInt(t.getAttribute('data-i'), 10);
        const shop = app.ui.shop;
        if (shop.bought.indexOf('relic' + i) >= 0) return;
        const id = shop.relics[i];
        const price = SH.run.priceWithOmen(run, SH.run.relicPrice(id));
        if (run.husui < price) { toast('荒髓不足'); return; }
        if (!SH.run.addRelic(run, id)) { toast('遗物槽已满'); return; }
        run.husui -= price;
        shop.bought.push('relic' + i);
        run.stats.shopBuys = (run.stats.shopBuys || 0) + 1;
        run.flags.noShopBuy = false;
        saveRun();
        toast('获得遗物「' + SH.RELIC_BY_ID[id].name + '」');
        return;
      }

      case 'buy-husui': {
        const shop = app.ui.shop;
        if (shop.bought.indexOf('husui') >= 0) return;
        if (run.hp <= 11) { toast('生命不足以支付'); return; }
        run.hp -= 10;
        run.husui += 25;
        shop.bought.push('husui');
        run.stats.paidHp = (run.stats.paidHp || 0) + 1;
        saveRun();
        toast('以 10 生命换得 25 荒髓');
        return;
      }

      case 'refresh-shop': {
        const shop = app.ui.shop;
        if (shop.noRefresh) { toast('荒阶词缀：坊市冷清，不可刷新'); return; }
        let price = 10 + 5 * shop.refreshed;
        if (run.relics.indexOf('R_018') >= 0 && !run.flags.freeRefreshUsed) {
          price = 0;
          run.flags.freeRefreshUsed = true;
        }
        if (run.husui < price) { toast('荒髓不足'); return; }
        run.husui -= price;
        const fresh = SH.run.shopStock(run, run.nodeId + '#r' + (shop.refreshed + 1));
        fresh.refreshed = shop.refreshed + 1;
        app.ui.shop = fresh;
        saveRun();
        render();
        return;
      }

      case 'leave-node':
        leaveNode();
        return;

      /* --- 祭坛 --- */
      case 'altar-mode': {
        const mode = t.getAttribute('data-mode');
        app.ui.altarMode = mode;
        const q = SH.run.altarQuote(run);
        if (mode === 'remove' || mode === 'life') {
          app.ui.modal = {
            title: '选择要删除的牌（' + (mode === 'life' ? q.lifeRemove + ' 生命' : q.remove + ' 荒髓') + '）',
            pickAction: 'altar-remove',
            filter: () => run.deck.length > SH.RULES.deckMin,
            hint: '牌组低于 ' + SH.RULES.deckMin + ' 张时不可再删。'
          };
        } else if (mode === 'upgrade') {
          app.ui.modal = {
            title: '选择要升级的牌（' + q.upgrade + ' 荒髓）',
            pickAction: 'altar-upgrade',
            filter: (inst) => !inst.upgraded,
            hint: '已升级的牌不会出现在可选项中。'
          };
        } else if (mode === 'mutate') {
          const mutables = run.deck.filter((inst) => {
            const mt = (SH.CARD_BY_ID[inst.id] || {}).mutateTo;
            return mt && SH.CARD_BY_ID[mt];
          });
          if (!mutables.length) { toast('牌组中没有可异变的牌'); return; }
          app.ui.modal = {
            title: '选择要异变的牌（' + q.mutate + ' 荒髓）',
            pickAction: 'altar-mutate',
            list: mutables,
            hint: '异变后原牌移出牌组，视为未升级。'
          };
        }
        render();
        return;
      }

      case 'altar-remove':
      case 'altar-upgrade':
      case 'altar-mutate': {
        const uid = t.getAttribute('data-uid');
        const q = SH.run.altarQuote(run);
        const mode = app.ui.altarMode;
        if (mode === 'life') {
          if (run.hp <= q.lifeRemove + 1) { toast('生命不足'); return; }
          if (!SH.run.deckRemove(run, uid)) { toast('无法删除'); return; }
          run.hp -= q.lifeRemove;
        } else if (act === 'altar-remove') {
          if (run.husui < q.remove) { toast('荒髓不足'); return; }
          if (!SH.run.deckRemove(run, uid)) { toast('无法删除'); return; }
          run.husui -= q.remove;
          run.clears.removes += 1;
        } else if (act === 'altar-upgrade') {
          if (run.husui < q.upgrade) { toast('荒髓不足'); return; }
          if (!SH.run.deckUpgrade(run, uid)) { toast('该牌已升级'); return; }
          run.husui -= q.upgrade;
          run.clears.upgrades += 1;
        } else if (act === 'altar-mutate') {
          if (run.husui < q.mutate) { toast('荒髓不足'); return; }
          if (!SH.run.deckMutate(run, uid)) { toast('无法异变'); return; }
          run.husui -= q.mutate;
          run.clears.mutates += 1;
        }
        run.stats.altarUses = (run.stats.altarUses || 0) + 1;
        app.ui.modal = null;
        app.ui.altarMode = null;
        toast('祭坛回应了你的请求');
        leaveNode();
        return;
      }

      /* --- 山神祠 --- */
      case 'shrine-heal':
        SH.run.healPercent(run, 0.3);
        toast('山神垂怜，生命回复');
        leaveNode();
        return;

      case 'shrine-omen': {
        const rng = SH.makeRng(SH.subSeed(run.seed, 'omen', run.nodeId));
        const pool = SH.OMENS.filter((o) => run.omens.indexOf(o.id) < 0);
        const copy = pool.slice();
        rng.shuffle(copy);
        app.ui.shrine = { mode: 'omen', omens: copy.slice(0, 3).map((o) => o.id) };
        render();
        return;
      }

      case 'shrine-back':
        app.ui.shrine = { mode: 'main' };
        render();
        return;

      case 'pick-omen':
        SH.run.addOmen(run, t.getAttribute('data-id'));
        toast('誓约已成，永不可解');
        leaveNode();
        return;

      case 'shrine-husui':
        run.husui += 15;
        toast('获得 15 荒髓');
        leaveNode();
        return;

      /* --- 事件 --- */
      case 'event-option':
        resolveEvent(parseInt(t.getAttribute('data-i'), 10));
        return;

      case 'event-upgrade':
      case 'event-remove':
      case 'event-mutate':
        onModalPick(act, t.getAttribute('data-uid'));
        return;

      case 'next-volume':
        SH.run.enterVolume(run, run.volume + 1);
        app.screen = 'map';
        saveRun();
        render();
        return;

      default:
        return;
    }
  }

  /* ---------------- 流程 ---------------- */
  function startRun(heroId, opts) {
    opts = opts || {};
    app.run = SH.run.create(heroId, opts.seed, opts.difficulty || 0);
    app.battle = null;
    app.ui = {
      targeting: null, selectedUnit: null, modal: null, reward: null,
      shop: null, event: null, altarMode: null, shrine: null, toast: '', result: null,
      tutorial: null
    };
    app.screen = 'map';
    const meta = SH.loadMeta();
    if (SH.tutorial && (opts.tutorial || !meta.tutorialDone)) {
      SH.tutorial.begin(app.run, { replay: !!opts.tutorial });
    }
    saveRun();
    render();
  }

  function startTutorialRun() {
    startRun('baiZe', { tutorial: true, seed: 20261021 });
  }

  function enterNode(id) {
    const run = app.run;
    const node = run.map.index[id];
    if (!node) return;
    run.nodeId = id;
    SH.run.recordNode(run, node);
    app.ui.selectedUnit = null;
    app.ui.targeting = null;
    if (node.type === 'battle' || node.type === 'elite' || node.type === 'boss') {
      const enc = SH.run.makeEncounter(run, node);
      // 新手教程的第一场荒战：单敌、削弱，确保第一课能走完
      const tutBattle = !!(run.tutorial && run.tutorial.active && !run.tutorial.firstBattleDone && node.type === 'battle');
      if (tutBattle) {
        enc.enemies = ['E101'];
        run.tutorial.firstBattleDone = true;
      }
      app.battle = SH.engine.create(run, {
        kind: enc.kind,
        enemies: enc.enemies,
        volume: enc.volume,
        terrainCount: enc.terrainCount,
        nodeId: id,
        seed: tutBattle ? 20261021 : SH.subSeed(run.seed, 'battle', id),
        scale: tutBattle ? 0.6 : 1,
        atkScale: tutBattle ? 0.85 : 1
      });
      if (tutBattle && SH.tutorial) SH.tutorial.scriptBattle(app.battle);
      app.screen = 'battle';
    } else if (node.type === 'shop') {
      app.ui.shop = SH.run.shopStock(run, id);
      app.screen = 'shop';
    } else if (node.type === 'altar') {
      app.screen = 'altar';
    } else if (node.type === 'shrine') {
      app.ui.shrine = { mode: 'main' };
      app.screen = 'shrine';
    } else if (node.type === 'event') {
      const def = SH.run.pickEvent(run, id);
      run.seenEvents.push(def.id);
      app.ui.event = { def: def, done: false, resultText: '' };
      app.screen = 'event';
    }
    saveRun();
    render();
  }

  function playCard(uid) {
    const b = app.battle;
    const run = app.run;
    app.ui.selectedUnit = null;
    const inst = b.hand.find((c) => c.uid === uid);
    const chainBefore = b.chain.count;
    markCastFX(inst, b, null);
    const res = SH.engine.playCard(b, run, uid);
    if (!res.ok) {
      if (SH.fx) SH.fx.clearCast();
      if (res.need) { startTargeting(uid, res.need); return; }
      toast(res.reason || '无法打出');
      return;
    }
    if (SH.tutorial) SH.tutorial.notify('play', tutorialPlayInfo(inst, b, chainBefore));
    afterBattleAction();
  }

  // P6：异兽牌二选一 —— 施术（不进荒痕，直接结算后进消耗堆）
  function castCard(uid) {
    const b = app.battle;
    const run = app.run;
    app.ui.selectedUnit = null;
    const inst = b.hand.find((c) => c.uid === uid);
    const chainBefore = b.chain.count;
    markCastFX(inst, b, { mode: 'cast' });
    const res = SH.engine.playCard(b, run, uid, { mode: 'cast' });
    if (!res.ok) {
      if (SH.fx) SH.fx.clearCast();
      if (res.need) { startTargeting(uid, res.need, 'cast'); return; }
      toast(res.reason || '无法施术');
      return;
    }
    if (SH.tutorial) SH.tutorial.notify('play', tutorialPlayInfo(inst, b, chainBefore));
    afterBattleAction();
  }

  // 把"打出了哪张牌、落在哪一格、指向谁"交给特效层；不改动任何规则
  function markCastFX(inst, b, choice) {
    if (!SH.fx || !inst || !b) return;
    const def = SH.CARD_BY_ID[inst.id];
    if (!def) return;
    const castMode = !!(choice && choice.mode === 'cast');
    let need = null;
    try { need = SH.engine.needTarget(b, inst, castMode ? 'cast' : undefined) || null; } catch (e) { need = null; }
    const cell = (choice && choice.cell) || (need && need.auto) ||
      (need && need.alsoCell && need.alsoCell.auto) || null;
    const targetUid = (choice && choice.enemy) || (need && need.autoEnemy) || null;
    SH.fx.markCast({
      id: inst.id,
      type: castMode ? 'spell' : def.type,
      element: def.element,
      name: def.name,
      face: inst.face,
      mode: castMode ? 'cast' : 'summon',
      mutant: !!def.mutateOf || def.rarity === 'mutant',
      cell: cell,
      targetUid: targetUid
    });
  }

  function tutorialPlayInfo(inst, b, chainBefore) {
    const def = inst ? SH.CARD_BY_ID[inst.id] : null;
    return {
      uid: inst ? inst.uid : null,
      id: inst ? inst.id : null,
      type: def ? def.type : null,
      element: def ? def.element : null,
      feral: !!(inst && inst.face === 'feral'),
      beast: !!(def && def.type === 'beast'),
      chainBefore: chainBefore | 0,
      chainAfter: b.chain.count | 0
    };
  }

  function startTargeting(uid, need, mode) {
    if (SH.tutorial && need) {
      const pc = SH.tutorial.preferredCell();
      if (pc) {
        if (need.kind === 'cell' && (!need.options || need.options.indexOf(pc) >= 0)) { need.auto = pc; need.options = [pc]; }
        if (need.alsoCell && (!need.alsoCell.options || need.alsoCell.options.indexOf(pc) >= 0)) { need.alsoCell.auto = pc; need.alsoCell.options = [pc]; }
      }
    }
    const steps = [];
    if (need.kind === 'enemy' && need.alsoCell) {
      steps.push({ kind: 'cell', options: need.alsoCell.options || [], auto: need.alsoCell.auto });
      steps.push({ kind: 'enemy', options: need.options || [] });
    } else {
      steps.push({
        kind: need.kind,
        options: need.options || [],
        auto: need.auto,
        terrain: !!need.terrain,
        cellLabel: need.cellLabel
      });
    }
    const choice = mode === 'cast' ? { mode: 'cast' } : {};
    let i = 0;
    for (; i < steps.length; i++) {
      const st = steps[i];
      if ((st.auto && (!st.options.length || st.options.length === 1)) || st.options.length === 1) {
        const val = st.auto || st.options[0];
        if (st.kind === 'cell') choice.cell = val;
        if (st.kind === 'enemy') choice.enemy = val;
        continue;
      }
      break;
    }
    if (i >= steps.length) { finishPlay({ uid: uid, choice: choice }); return; }
    app.ui.targeting = { uid: uid, steps: steps, index: i, choice: choice, mode: mode || (choice.mode === 'cast' ? 'cast' : 'summon') };
    render();
  }

  function chooseTarget(kind, value) {
    const tg = app.ui.targeting;
    if (!tg) return;
    tg.choice[kind] = value;
    let i = tg.index + 1;
    while (i < tg.steps.length) {
      const st = tg.steps[i];
      if ((st.auto && (!st.options.length || st.options.length === 1)) || st.options.length === 1) {
        const val = st.auto || st.options[0];
        if (st.kind === 'cell') tg.choice.cell = val;
        if (st.kind === 'enemy') tg.choice.enemy = val;
        i += 1;
        continue;
      }
      break;
    }
    if (i >= tg.steps.length) {
      const choice = tg.choice;
      const uid = tg.uid;
      app.ui.targeting = null;
      finishPlay({ uid: uid, choice: choice });
      return;
    }
    tg.index = i;
    render();
  }

  function finishPlay(tg) {
    const b = app.battle;
    const inst = b.hand.find((c) => c.uid === tg.uid);
    const chainBefore = b.chain.count;
    markCastFX(inst, b, tg.choice);
    const res = SH.engine.playCard(b, app.run, tg.uid, tg.choice);
    app.ui.targeting = null;
    if (!res.ok) { if (SH.fx) SH.fx.clearCast(); toast(res.reason || '无法打出'); render(); return; }
    if (SH.tutorial) SH.tutorial.notify('play', tutorialPlayInfo(inst, b, chainBefore));
    afterBattleAction();
  }

  function afterBattleAction() {
    const b = app.battle;
    const run = app.run;
    if (!b) return;
    if (b.over) { app.ui.targeting = null; app.ui.selectedUnit = null; }
    if (b.over === 'victory') {
      if (SH.fx) SH.fx.end('victory');
      SH.engine.relicFire(b, app.run, 'battleEnd', {});
      (b.statics || []).forEach((st) => { if (st.kind === 'battleEndHeal') b.hero.hp = Math.min(b.hero.maxHp, b.hero.hp + st.v); });
      run.hp = Math.max(1, b.hero.hp);
      run.stats.turns += b.stats.turns;
      run.stats.kills += b.enemies.filter((e) => e.hp <= 0).length;
      run.stats.damage += b.stats.damageDealt;
      if (b.kind === 'elite') run.stats.elites += 1;
      if (b.kind === 'boss') run.stats.bosses += 1;
      if ((b.kind === 'elite' || b.kind === 'boss') && !run.flags['slot_' + b.kind]) {
        run.flags['slot_' + b.kind] = true;
        run.relicSlotBonus = (run.relicSlotBonus || 0) + 1;
      }
      run.stats.battles += 1;
      run.stats.flips = (run.stats.flips || 0) + (b.stats.flips || 0);
      run.stats.chainMax = Math.max(run.stats.chainMax || 0, b.stats.maxChain || 0);
      run.stats.dmgMax = Math.max(run.stats.dmgMax || 0, b.stats.maxHit || 0);
      run.stats.summonTotal = (run.stats.summonTotal || 0) + (b.stats.summons || 0);
      if (b.eroded.length === 0) run.stats.eroded = run.stats.eroded || 0;
      if (b.eroded.length) {
        run.flags.erodedThisRun = true;
        run.stats.eroded = (run.stats.eroded || 0) + b.eroded.length;
      }
      if (SH.ach) SH.ach.onBattle(run, b, b.kind);
      if (app.ui.eventBattle) {
        const eb = app.ui.eventBattle;
        app.ui.eventBattle = null;
        let text = '你胜了。';
        if (eb.gain && eb.gain.randomCard) text += grantRandomCard(run, eb.gain.randomCard, 'w') || '牌组已满，未能收录。';
        if (eb.gain && eb.gain.husui) { run.husui += eb.gain.husui; text += '获得 ' + eb.gain.husui + ' 荒髓。'; }
        if (eb.gain && eb.gain.relic) {
          const rid = SH.run.rollRelic(run, 'elite');
          if (rid && SH.run.addRelic(run, rid)) text += '获得遗物「' + SH.RELIC_BY_ID[rid].name + '」。';
        }
        app.battle = null;
        app.ui.event = { def: eb.def, done: true, resultText: text };
        app.screen = 'event';
        saveRun();
        render();
        return;
      }
      const husui = SH.run.husuiReward(run, b.kind);
      run.husui += husui;
      const relic = (b.kind === 'elite' || b.kind === 'boss') ? SH.run.rollRelic(run, b.kind) : null;
      const relicOk = relic ? SH.run.addRelic(run, relic) : false;
      app.ui.reward = {
        cards: SH.run.rollCardRewards(run, b.kind),
        relic: relicOk ? relic : null,
        relicLost: relic && !relicOk ? relic : null,
        husui: husui,
        title: b.kind === 'boss' ? '卷末首领 · 破关' : b.kind === 'elite' ? '凶兽巢 · 清剿' : '荒战 · 得胜',
        boss: b.kind === 'boss'
      };
      app.battle = null;
      app.screen = 'reward';
      saveRun();
      render();
      return;
    }
    if (b.over === 'defeat') {
      const meta = SH.loadMeta();
      meta.runs = (meta.runs || 0) + 1;
      meta.bestVolume = Math.max(meta.bestVolume || 0, run.volume);
      SH.saveMeta(meta);
      SH.clearSave();
      if (SH.ach) SH.ach.onRunEnd(run, false);
      app.ui.result = {
        win: false, volume: run.volume, battles: run.stats.battles, kills: run.stats.kills,
        seed: run.seedCode, text: '荒野无情，巡吏的名字被刻上了古碑。'
      };
      app.screen = 'result';
      app.battle = null;
      render();
      return;
    }
    saveRun();
    render();
  }

  function finishReward() {
    const r = app.ui.reward;
    const run = app.run;
    app.ui.reward = null;
    if (r && r.boss) {
      if (run.volume >= 3) {
        const meta = SH.loadMeta();
        meta.runs = (meta.runs || 0) + 1;
        meta.wins = (meta.wins || 0) + 1;
        meta.bestVolume = 3;
        SH.saveMeta(meta);
        if (SH.ach) SH.ach.onRunEnd(run, true);
        SH.clearSave();
        app.ui.result = {
          win: true, volume: 3, battles: run.stats.battles, kills: run.stats.kills,
          seed: run.seedCode, text: '三卷既定，山海司的巡荒录上，留下了你的名字。'
        };
        app.screen = 'result';
        render();
        return;
      }
      SH.run.enterVolume(run, run.volume + 1);
    }
    app.screen = 'map';
    saveRun();
    render();
  }

  function leaveNode() {
    app.screen = 'map';
    app.ui.shop = null;
    app.ui.event = null;
    app.ui.shrine = null;
    app.ui.modal = null;
    saveRun();
    render();
  }

  function grantRandomCard(run, kind, salt) {
    const rng = SH.makeRng(SH.subSeed(run.seed, 'evcard', (run.nodeId || '') + salt));
    let pool = SH.CARDS.filter((c) => !c.notReady && c.rarity !== 'mutant' && ['normal', 'rare', 'epic'].indexOf(c.rarity) >= 0);
    if (kind === 'rare') pool = pool.filter((c) => c.rarity === 'rare');
    if (kind === 'epic') pool = pool.filter((c) => c.rarity === 'epic');
    if (kind === 'boss') pool = SH.CARDS.filter((c) => c.rarity === 'boss');
    if (kind === 'beast') pool = pool.filter((c) => c.type === 'beast');
    if (kind === 'terrain') pool = SH.CARDS.filter((c) => c.type === 'terrain' && !c.notReady);
    const available = pool.filter((c) => run.deck.filter((x) => x.id === c.id).length < SH.run.maxCopiesOf(c));
    const pick = rng.pick(available.length ? available : pool);
    if (pick && SH.run.deckAdd(run, pick.id)) return '获得「' + pick.name + '」。';
    return '';
  }

  function resolveEvent(index) {
    const ev = app.ui.event;
    const run = app.run;
    const opt = ev.def.options[index];
    if (!opt) return;
    const cost = opt.cost || {};
    if (cost.husui && run.husui < cost.husui) { toast('荒髓不足'); return; }
    if (cost.hp && run.hp <= cost.hp) { toast('生命不足'); return; }
    run.husui -= cost.husui || 0;
    run.hp -= cost.hp || 0;
    run.stats.eventChoices = (run.stats.eventChoices || 0) + 1;
    if (cost.hp) run.stats.paidHp = (run.stats.paidHp || 0) + 1;

    if (opt.battle) {
      const enc = {
        kind: opt.battle.kind === 'elite' ? 'elite' : 'battle',
        enemies: opt.battle.pool.slice(),
        volume: run.volume,
        terrainCount: SH.VOLUMES[run.volume - 1].terrainCount
      };
      app.ui.eventBattle = { gain: opt.gain || {}, def: ev.def };
      app.battle = SH.engine.create(run, {
        kind: enc.kind, enemies: enc.enemies, volume: enc.volume,
        terrainCount: enc.terrainCount, nodeId: run.nodeId,
        seed: SH.subSeed(run.seed, 'evbattle', run.nodeId + index)
      });
      app.screen = 'battle';
      saveRun();
      render();
      return;
    }

    const gain = opt.gain || {};
    const text = [];
    if (gain.heal) { run.hp = Math.min(run.maxHp, run.hp + gain.heal); text.push('生命回复 ' + gain.heal + ' 点。'); }
    if (gain.husui) { run.husui += gain.husui; text.push('获得 ' + gain.husui + ' 荒髓。'); }
    if (gain.card) { text.push(SH.run.deckAdd(run, gain.card) ? '获得「' + SH.CARD_BY_ID[gain.card].name + '」。' : '牌组已满，未能收录。'); }
    if (gain.randomCard) { text.push(grantRandomCard(run, gain.randomCard, index) || '牌组已满，未能收录。'); }
    if (gain.relicId) {
      const id = gain.relicId;
      text.push(SH.run.addRelic(run, id) ? '获得遗物「' + SH.RELIC_BY_ID[id].name + '」。' : '遗物槽已满或互斥，只能作罢。');
    }
    if (gain.extraRelicId) {
      const id = gain.extraRelicId;
      text.push(SH.run.addRelic(run, id) ? '追加遗物「' + SH.RELIC_BY_ID[id].name + '」。' : '遗物槽已满，追加遗物散落。');
    }
    if (gain.randomRelic) {
      const id = gain.randomRelic === 'any' ? SH.run.rollRelic(run, 'elite') : SH.run.rollRelicByRarity(run, gain.randomRelic);
      if (id && SH.run.addRelic(run, id)) text.push('获得遗物「' + SH.RELIC_BY_ID[id].name + '」。');
      else text.push('遗物槽已满或互斥，只能作罢。');
    }
    if (gain.relic) {
      const kind = gain.relic === 'normal' ? 'elite' : 'boss';
      const id = SH.run.rollRelic(run, kind);
      if (id && SH.run.addRelic(run, id)) text.push('获得遗物「' + SH.RELIC_BY_ID[id].name + '」。');
      else text.push('遗物槽已满，只能作罢。');
    }
    if (gain.purify) text.push('蚀气被涤净，荒蚀暂退。');
    if (gain.omen) {
      const pool = SH.OMENS.filter((o) => run.omens.indexOf(o.id) < 0);
      const rng = SH.makeRng(SH.subSeed(run.seed, 'evomen', (run.nodeId || '') + index));
      const o = rng.pick(pool);
      if (o && SH.run.addOmen(run, o.id)) text.push('获得誓约「' + o.name + '」。');
      else text.push('誓约已满，山神未应。');
    }
    if (gain.modifier && gain.modifier.husuiGain) {
      run.flags.husuiGainMod = (run.flags.husuiGainMod || 0) + gain.modifier.husuiGain;
      text.push('本卷荒髓获取 -20%。');
    }
    if (gain.flipFree) {
      run.flags.freeFlipNext = (run.flags.freeFlipNext || 0) + gain.flipFree;
      text.push('获得一次免费翻面（下一场战斗生效）。');
    }
    if (gain.mutate) {
      app.ui.event = { def: ev.def, done: true, resultText: text.join('') };
      app.ui.modal = { title: '选择要异变的牌', pickAction: 'event-mutate', filter: (inst) => {
        const d = SH.CARD_BY_ID[inst.id];
        return d && d.mutateTo && SH.CARD_BY_ID[d.mutateTo] && !SH.CARD_BY_ID[d.mutateTo].notReady;
      } };
      render();
      return;
    }
    if (gain.upgrade) {
      app.ui.event = { def: ev.def, done: true, resultText: text.join('') || '你感到牌组中有什么在苏醒。' };
      app.ui.modal = {
        title: '选择要升级的牌',
        pickAction: 'event-upgrade',
        filter: (inst) => !inst.upgraded
      };
      render();
      return;
    }
    if (gain.removeCard) {
      app.ui.removeQueue = gain.removeCard;
      app.ui.event = { def: ev.def, done: true, resultText: text.join('') || '请选择要删除的牌。' };
      app.ui.modal = { title: '选择要删除的牌（' + gain.removeCard + ' 张）', pickAction: 'event-remove' };
      render();
      return;
    }
    ev.done = true;
    ev.resultText = text.join('') || '你继续前行。';
    render();
  }

  function onModalPick(act, uid) {
    const run = app.run;
    if (act === 'event-upgrade') {
      SH.run.deckUpgrade(run, uid);
      app.ui.modal = null;
      app.ui.event.resultText += ' 牌已升级。';
      render();
      return true;
    }
    if (act === 'event-remove') {
      SH.run.deckRemove(run, uid);
      app.ui.removeQueue = Math.max(0, (app.ui.removeQueue || 1) - 1);
      if (app.ui.removeQueue > 0 && run.deck.length > SH.RULES.deckMin) {
        app.ui.event.resultText += ' 牌已删除。';
        app.ui.modal = { title: '继续选择要删除的牌（' + app.ui.removeQueue + ' 张）', pickAction: 'event-remove' };
      } else {
        app.ui.modal = null;
        app.ui.event.resultText += ' 牌已删除。';
      }
      render();
      return true;
    }
    if (act === 'event-mutate') {
      if (SH.run.deckMutate(run, uid)) {
        app.ui.modal = null;
        app.ui.event.resultText += ' 牌已异变。';
      } else {
        toast('无法异变该牌');
      }
      render();
      return true;
    }
    return false;
  }

  /* ---------------- 存读档 ---------------- */
  function saveRun() {
    if (!app.run) return;
    const battle = app.battle ? Object.assign({}, app.battle) : null;
    if (battle) battle._run = null;
    SH.saveGame({ run: app.run, battle: battle });
  }

  function resume() {
    const data = SH.loadGame();
    if (!data) { toast('没有可用的存档'); return; }
    if (data.incompatible) { toast('旧版本存档不可继续（规则层已变更）'); return; }
    app.run = data.run;
    app.ui.tutorial = null;
    if (SH.tutorial && data.run.tutorial && data.run.tutorial.active) SH.tutorial.restore(data.run.tutorial);
    if (data.battle) {
      app.battle = data.battle;
      app.battle._run = app.run;
      app.battle.pending = null;
      if (!app.battle.kindName) app.battle.kindName = '荒战';
      app.screen = 'battle';
    } else {
      app.battle = null;
      app.screen = 'map';
    }
    render();
  }

  /* ---------------- 初始化 ---------------- */
  function init(container) {
    rootEl = container;
    rootEl.addEventListener('click', onClick);
    if (SH.fx) SH.fx.init();
    render();
  }

  SH.ui = { render: render, init: init, toast: toast, app: app, startTutorial: startTutorialRun };
})(typeof window !== 'undefined' ? window : globalThis);
