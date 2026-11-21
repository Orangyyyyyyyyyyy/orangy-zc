/* ============================================================
 * 山海司·巡荒录  —  新手教程 tutorial.js
 * 贴着真实界面走的「陪练式」引导：暗场聚光 + 金线课笺
 * 只操作 app.ui.tutorial 与少量 UI 钩子；教学护佑只在本场启用
 * ============================================================ */
(function (root) {
  'use strict';
  const SH = (root.SH = root.SH || {});
  const U = SH.util;

  const T = (SH.tutorial = {});

  /* ------------------------------------------------------------
   * 课目：screen 决定在哪一屏出现；wait 表示等玩家完成动作
   * ------------------------------------------------------------ */
  const STEPS = [
    {
      id: 'intro', screen: 'any', center: true, seal: '荒',
      kicker: '序 · 入门', title: '巡荒第一课',
      text: '你将带一队异兽穿过三卷荒原，直到卷末首领。<b>这一程约三分钟</b>：认舆图、打一场荒战、挑一件战利品，再逛一趟坊市与祭坛。',
      nextLabel: '开 始 第 一 课'
    },
    {
      id: 'map-board', screen: 'map', target: '.map-canvas', place: 'right',
      kicker: '其一 · 舆图', title: '九层荒原，择一而行',
      text: '每一层有二到三条岔路，只能向前。金色描边是<b>可行之路</b>，朱红是凶兽巢；卷末必逢首领，斩之方可入下一卷。'
    },
    {
      id: 'map-res', screen: 'map', target: '.tb-right', place: 'bottom',
      kicker: '其二 · 行囊', title: '荒髓、生命与牌组',
      text: '荒髓是坊市与祭坛的硬通货；生命归零，此巡即止。顶栏的<b>牌组</b>随时可查，<b>经义</b>里收着全部词条。'
    },
    {
      id: 'map-go', screen: 'map', target: '.node.can-go.t-battle[data-act="enter-node"]',
      targetFallback: '.node.can-go[data-act="enter-node"]', place: 'right',
      action: 'enter-node', buttonLabel: '入 荒',
      kicker: '其三 · 起步', title: '先入一场荒战',
      text: '点高亮节点前行。第一仗我会陪着你，从出牌到结算走一遍。'
    },
    {
      id: 'battle-board', screen: 'battle', target: '.board', place: 'right',
      kicker: '其四 · 荒痕', title: '三格防线，一线生死',
      text: '前哨、中阵、后阵是你的防线。敌人从<b>荒外</b>压来，若后阵无人阻挡便<b>突入本体</b>，直接伤你。敌人头顶的意图会预告它下一步行动。'
    },
    {
      id: 'battle-hand', screen: 'battle', target: '.hand-zone', place: 'top',
      kicker: '其五 · 灵气', title: '每回合五张，灵气回满',
      text: '每回合抽 <b>5</b> 张牌，灵气回满。卡牌左上角是费用；点击手牌即可打出。<b>灵涌</b>是临时灵气，可溢出上限 2 点。'
    },
    {
      id: 'battle-first', screen: 'battle', target: '.hand .card[data-id^="C_B_"]:not(.is-disabled)',
      targetFallback: '.hand .card:not(.is-disabled)', place: 'top', wait: 'beast',
      waitText: '打出这头异兽后自动继续',
      kicker: '其六 · 落子', title: '先召一只异兽上阵',
      text: '打出高亮的异兽牌，它会落在<b>中阵</b>。刚召唤的异兽会<b>失调</b>：当回合只能阻挡，下回合才攻击；若需要目标，按提示点敌人或格子。'
    },
    {
      id: 'battle-flip', screen: 'battle', target: '.hand .card[data-id^="C_B_"]',
      targetFallback: '.hand .card', place: 'top', wait: 'flip',
      waitText: '翻面一次后自动继续',
      kicker: '其七 · 双面', title: '驯化守，凶化攻',
      text: '异兽牌有<b>驯化 / 凶化</b>两面。点高亮牌右下的「翻面」，支付 1 灵气换一面：驯化偏守与控制，凶化偏攻，常带自损。'
    },
    {
      id: 'battle-feral', screen: 'battle', target: '.hand .card[data-face="feral"]',
      targetFallback: '.hand .card', place: 'top', wait: 'feral',
      waitText: '打出凶化面后自动继续',
      kicker: '其八 · 凶化', title: '把凶化面打出去',
      text: '现在打出刚翻好的<b>凶化面</b>。它通常更激进，也可能自损——这就是翻面的取舍。'
    },
    {
      id: 'battle-chain', screen: 'battle', target: chainTarget,
      targetFallback: '.hand', place: 'top', wait: 'chain',
      waitText: '触发一次相生后自动继续',
      kicker: '其九 · 相生', title: '顺五行连出，减费生涌',
      text: '按 <b>金→水→木→火→土→金</b> 连出牌，第二张起费用 -1 并得 1 灵涌，每回合最多 3 次。打出高亮牌，让上一手生下一手。'
    },
    {
      id: 'battle-end', screen: 'battle', target: '.end-turn', place: 'left',
      nextLabel: '收起引导，继续战斗',
      kicker: '其十 · 收势', title: '结束回合，看敌人落子',
      text: '同格的异兽与敌人会在回合结束自动互击。点<b>结束回合</b>把场面交给荒兽；空格键同样可以。赢下这仗，我们去看战利品。'
    },
    {
      id: 'reward', screen: 'reward', target: '.reward-cards', place: 'corner-br', wait: 'leave',
      waitText: '选好战利品后自动继续',
      kicker: '其十一 · 战利', title: '三选一，添一张牌',
      text: '荒战之后三选一收入牌组，也可舍弃。普通牌同名最多 2 张，稀有及以上 1 张；牌组上限 30，<b>宁精不杂</b>。'
    },
    {
      id: 'map-shop', screen: 'map', target: '.node.can-go.t-shop[data-act="enter-node"]',
      targetFallback: '.node.can-go[data-act="enter-node"]', place: 'right',
      action: 'enter-node', buttonLabel: '入 市',
      kicker: '其十二 · 坊市', title: '下一站：坊市',
      text: '荒战所得与荒髓，都能在这里换成牌与遗物。沿高亮的坊市节点前行。'
    },
    {
      id: 'shop', screen: 'shop', target: '.shop-grid', place: 'corner-br', wait: 'leave',
      waitText: '买完或离开后自动继续',
      kicker: '其十三 · 交易', title: '荒髓要花在刀刃上',
      text: '卡牌、遗物、荒髓囊都能买，刷新货架也要花荒髓。别花光——<b>祭坛删牌通常要 40 荒髓</b>。'
    },
    {
      id: 'map-altar', screen: 'map', target: '.node.can-go.t-altar[data-act="enter-node"]',
      targetFallback: '.node.can-go[data-act="enter-node"]', place: 'right',
      action: 'enter-node', buttonLabel: '入 祭',
      kicker: '其十四 · 祭坛', title: '最后一站：古祭坛',
      text: '祭坛能删牌、升级或异变。沿高亮的祭坛节点前行，这是本课的最后一站。'
    },
    {
      id: 'altar', screen: 'altar', target: '.altar-grid', place: 'corner-br', wait: 'leave',
      waitText: '删牌或离开后自动继续',
      kicker: '其十五 · 删牌', title: '删一张，胜过加三张',
      text: '删牌能压缩牌组，让关键牌更快上手；荒髓够就删一张最弱的，不够也可默然离开。每座祭坛只回应一次。'
    },
    {
      id: 'done', screen: 'map', center: true, seal: '成', final: true,
      kicker: '其十六 · 出师', title: '荒痕已识，余路由你',
      text: '舆图、荒战、战利品、坊市与祭坛，你都走过一遍了。之后可在<b>经义</b>查词条，在<b>图鉴</b>看全卡池。愿你录名山海。',
      nextLabel: '继 续 巡 荒'
    }
  ];

  // 相生课：优先高亮能接上当前五行的牌；接不上就挑一组可连的起手
  function chainTarget() {
    const a = app();
    if (!a || !a.battle) return '.hand';
    const b = a.battle;
    const def = (c) => SH.CARD_BY_ID[c.id] || {};
    const pool = b.qi + b.lingyong;
    const cost = (c) => { try { return SH.engine.costOf(b, a.run, c).cost; } catch (e) { return 99; } };
    const canSummon = b.summonsThisTurn < SH.RULES.summonPerTurn;
    // 召唤数已满时，异兽打不出去，优先高亮术法/山泽
    const usable = (c) => cost(c) <= pool && (def(c).type !== 'beast' || canSummon);
    const hand = b.hand.filter(usable)
      .sort((x, y) => (def(x).type === 'beast' ? 1 : 0) - (def(y).type === 'beast' ? 1 : 0));
    const cur = b.chain && b.chain.elem;
    const want = cur ? SH.GENERATES[cur] : null;
    let pick = want ? hand.find((c) => def(c).element === want) : null;
    if (!pick) {
      for (const c of hand) {
        const next = SH.GENERATES[def(c).element];
        if (hand.some((o) => o !== c && def(o).element === next)) { pick = c; break; }
      }
    }
    return pick ? '.hand .card[data-uid="' + pick.uid + '"]' : '.hand';
  }

  T.STEPS = STEPS;
  T.index = function (id) {
    for (let i = 0; i < STEPS.length; i++) if (STEPS[i].id === id) return i;
    return -1;
  };

  function app() { return SH.app; }
  function state() { return SH.app && SH.app.ui ? SH.app.ui.tutorial : null; }
  function active() { const s = state(); return !!(s && s.active); }

  /* ---------------- 存档 ---------------- */
  function persist() {
    const a = app();
    const s = state();
    if (!a || !a.run || !s) return;
    const prior = a.run.tutorial || {};
    a.run.tutorial = {
      active: !!s.active,
      i: s.i,
      replay: !!s.replay,
      firstBattleDone: !!prior.firstBattleDone
    };
    SH.saveGame({ run: a.run, battle: a.battle });
  }

  function metaDone(skipped) {
    const meta = SH.loadMeta();
    if (!meta.tutorialDone) meta.tutorialDone = true;
    if (skipped) meta.tutorialSkipped = true;
    meta.tutorialAt = Date.now();
    SH.saveMeta(meta);
  }

  function clearRunFlag() {
    const a = app();
    if (a && a.run) delete a.run.tutorial;
  }

  /* ---------------- 生命周期 ---------------- */
  T.begin = function (run, opts) {
    opts = opts || {};
    const a = app();
    if (!a) return;
    a.ui.tutorial = {
      active: true, i: 0, collapsed: false,
      screen: a.screen, replay: !!opts.replay
    };
    if (run) {
      // 教程路线固定：荒战 → 坊市 → 祭坛，保证三站都能走到
      const layers = run.map && run.map.layers;
      if (layers && layers[0]) layers[0].nodes.forEach((n) => { n.type = 'battle'; });
      if (layers && layers[1]) layers[1].nodes.forEach((n) => { n.type = 'shop'; });
      if (layers && layers[2]) layers[2].nodes.forEach((n) => { n.type = 'altar'; });
      run.tutorial = {
        active: true, i: 0, replay: !!opts.replay,
        firstBattleDone: !!(run.tutorial && run.tutorial.firstBattleDone)
      };
    }
    persist();
  };

  T.restore = function (saved) {
    if (!saved || !saved.active) return;
    const a = app();
    if (!a) return;
    const i = Math.max(0, Math.min(STEPS.length - 1, saved.i | 0));
    a.ui.tutorial = {
      active: true, i: i, collapsed: false,
      screen: a.screen, replay: !!saved.replay
    };
  };

  T.isActive = active;

  // 从标题直接开一局白泽教学
  T.startFresh = function () {
    if (SH.ui && SH.ui.startTutorial) SH.ui.startTutorial();
  };

  // 从经义/标题就地续上引导（不重开一局）
  T.startFromScreen = function (screen) {
    const a = app();
    if (!a) return false;
    if (!a.run) { T.startFresh(); return true; }
    const byId = { map: 'map-board', battle: 'battle-board', reward: 'reward' };
    const id = byId[screen];
    if (!id) {
      if (SH.ui && SH.ui.toast) SH.ui.toast('回到舆图或荒战时再开引导');
      return false;
    }
    const i = T.index(id);
    a.ui.tutorial = { active: true, i: i, collapsed: false, screen: screen, replay: true };
    const prior = a.run.tutorial || {};
    a.run.tutorial = { active: true, i: i, replay: true, firstBattleDone: !!prior.firstBattleDone };
    persist();
    SH.ui.render();
    return true;
  };

  T.abortSilently = function () {
    const a = app();
    if (!a) return;
    clearRunFlag();
    a.ui.tutorial = null;
  };

  T.finish = function () {
    const a = app();
    if (!a) return;
    metaDone(false);
    clearRunFlag();
    a.ui.tutorial = null;
    if (a.run) SH.saveGame({ run: a.run, battle: a.battle });
    SH.ui.render();
    SH.ui.toast('新手教程完成 · 荒痕已识，愿此巡顺利');
  };

  T.skip = function () {
    const a = app();
    if (!a) return;
    metaDone(true);
    clearRunFlag();
    a.ui.tutorial = null;
    if (a.run) SH.saveGame({ run: a.run, battle: a.battle });
    SH.ui.render();
    SH.ui.toast('已跳过新手教程 · 规则可在「经义」中查阅');
  };

  /* ---------------- 推进 ---------------- */
  T.sync = function () {
    const a = app();
    const s = state();
    if (!a || !s || !s.active) return;
    if (a.screen === 'result') { T.abortSilently(); return; }
    if (a.screen === 'title' || a.screen === 'hero') return;
    if (s.screen !== a.screen) {
      s.screen = a.screen;
      s.collapsed = false;
    }
    let guard = 0;
    while (guard++ < 30) {
      const cur = STEPS[s.i];
      if (!cur) break;
      if (cur.screen === 'any' || cur.screen === a.screen) break;
      let j = s.i + 1;
      while (j < STEPS.length && STEPS[j].screen !== a.screen) j++;
      if (j >= STEPS.length) break;
      s.i = j;
      persist();
    }
  };

  T.next = function () {
    const a = app();
    const s = state();
    if (!a || !s || !s.active) return;
    const st = STEPS[s.i];
    if (!st) return;
    if (st.final) { T.finish(); return; }
    if (st.action === 'enter-node') {
      let el = resolve(st);
      if (!el || !el.getAttribute || el.getAttribute('data-act') !== 'enter-node') {
        el = document.querySelector('.node.can-go[data-act="enter-node"]') ||
          document.querySelector('.node.can-go');
      }
      if (el) { el.click(); return; }
      if (SH.ui && SH.ui.toast) SH.ui.toast('请点击高亮节点');
      return;
    }
    if (st.wait) return;   // 等玩家完成动作的课目，不允许用键盘/按钮跳过
    s.i = Math.min(s.i + 1, STEPS.length - 1);
    const nx = STEPS[s.i];
    s.collapsed = !!(nx && nx.screen !== 'any' && nx.screen !== a.screen);
    persist();
    SH.ui.render();
  };

  T.back = function () {
    const s = state();
    if (!s || !s.active) return;
    let j = -1;
    for (let k = s.i - 1; k >= 0; k--) {
      if (STEPS[k].screen !== STEPS[s.i].screen) continue;
      if (NO_BACK[STEPS[k].id]) continue;
      j = k;
      break;
    }
    if (j < 0) return;
    s.i = j;
    s.collapsed = false;
    persist();
    SH.ui.render();
  };

  // 由 ui 在关键动作后调用；只做“完成该步”的推进，不负责重绘
  T.notify = function (kind, data) {
    const s = state();
    if (!s || !s.active) return;
    const cur = STEPS[s.i];
    if (!cur || !cur.wait) return;
    let hit = false;
    if (cur.wait === 'beast' && kind === 'play' && data && data.beast) hit = true;
    else if (cur.wait === 'feral' && kind === 'play' && data && data.feral) hit = true;
    else if (cur.wait === 'flip' && kind === 'flip') hit = true;
    else if (cur.wait === 'chain' && kind === 'play' && data && data.chainAfter > data.chainBefore) hit = true;
    if (!hit) return;
    s.i = Math.min(s.i + 1, STEPS.length - 1);
    const nx = STEPS[s.i];
    s.collapsed = !!(nx && nx.screen !== 'any' && nx.screen !== app().screen);
    persist();
  };

  // 第一课固定落前哨：保证有单位挡住荒兽，教学战斗不会互刷
  T.preferredCell = function () {
    const s = state();
    if (!s || !s.active) return 0;
    const st = STEPS[s.i];
    return st && st.id === 'battle-first' ? 2 : 0;
  };

  /* 教学首战：固定手牌与灵气，保证「异兽→翻面→凶化→相生」四课都能走完 */
  T.scriptBattle = function (b) {
    if (!b || !b.hand) return;
    b.tutorialSafe = true;
    b.qiMax = Math.max(b.qiMax, 8);
    b.qi = b.qiMax;
    if (b.flags) b.flags.tutorialSaved = false;

    const def = (c) => SH.CARD_BY_ID[c.id] || {};
    const tameCost = (c) => ((def(c).faces || {}).tame || {}).cost || 0;
    const feralCost = (c) => ((def(c).faces || {}).feral || {}).cost;
    const all = b.hand.concat(b.draw);
    const beasts = all.filter((c) => def(c).type === 'beast')
      .sort((x, y) => tameCost(x) - tameCost(y) || String(x.id).localeCompare(String(y.id)));
    const first = beasts[0];
    let second = null;
    let follower = null;
    const cands = beasts.filter((c) => c !== first)
      .sort((x, y) => (feralCost(x) == null ? 9 : feralCost(x)) - (feralCost(y) == null ? 9 : feralCost(y)));
    // 相生牌优先选术法/山泽：两只异兽已占满本回合召唤数，第三张再召唤会打不出
    let best = null;
    for (const c of cands) {
      const want = SH.GENERATES[def(c).element];
      const pool = all.filter((o) => o !== c && o !== first && def(o).element === want)
        .sort((x, y) => (def(x).type === 'beast' ? 1 : 0) - (def(y).type === 'beast' ? 1 : 0) ||
          tameCost(x) - tameCost(y));
      if (!pool.length) continue;
      const f = pool[0];
      const score = (def(f).type === 'beast' ? 100 : 0) + (feralCost(c) == null ? 9 : feralCost(c)) + tameCost(f);
      if (!best || score < best.score) best = { b: c, f: f, score: score };
    }
    if (best) { second = best.b; follower = best.f; }
    if (!second) second = cands[0] || first;
    // P0 初始牌组可能只有金/木或土/水两种五行（如白泽、招摇），
    // 教学首战按 P4 32 固定一副可连的起手：缺相生牌时注入一张教学临时牌。
    if (!follower) {
      const want = SH.GENERATES[def(second).element];
      const extra = SH.CARDS.find((c) => c.element === want && c.type !== 'beast' && !c.notReady &&
        ((c.faces.tame || {}).cost || 0) <= 2);
      if (extra) {
        const inst = { uid: 'tut_chain', id: extra.id, face: 'tame', upgraded: false };
        all.push(inst);
        follower = inst;
      }
    }

    const hand = [];
    const used = {};
    const take = (c) => {
      if (!c || used[c.uid] || hand.length >= 5) return;
      used[c.uid] = true;
      hand.push(c);
    };
    take(first);
    take(second);
    take(follower);
    all.slice().sort((x, y) => tameCost(x) - tameCost(y) || String(x.id).localeCompare(String(y.id)))
      .forEach(take);

    b.hand = hand;
    b.draw = all.filter((c) => !used[c.uid]);
    b.enemies.forEach((e) => {
      if (e.hp > 0) {
        e.advanceBase = Math.max(3, e.advanceBase || 1);
        e.intent = { type: 'advance', value: SH.engine.enemyAdvance(e) };
      }
    });
    SH.engine.log(b, 'sys', '教学护佑：灵气上限提升至 8，本场不会失败。');
  };

  T.handle = function (act) {
    if (act === 'tut-next') T.next();
    else if (act === 'tut-back') T.back();
    else if (act === 'tut-skip') T.skip();
  };

  /* ---------------- 渲染 ---------------- */
  const NO_BACK = { 'map-go': 1, 'map-shop': 1, 'map-altar': 1 };
  function canBack(i) {
    for (let k = i - 1; k >= 0; k--) {
      if (STEPS[k].screen !== STEPS[i].screen) continue;
      if (NO_BACK[STEPS[k].id]) continue;
      return true;
    }
    return false;
  }

  T.render = function () {
    const a = app();
    const s = state();
    if (!a || !s || !s.active) return '';
    if (a.ui.modal) return '';
    T.sync();
    const live = state();
    if (!live || !live.active || live.collapsed) return '';
    const st = STEPS[live.i];
    if (!st) return '';
    if (st.screen !== 'any' && st.screen !== a.screen) return '';

    const pct = Math.round(((live.i + 1) / STEPS.length) * 100);
    const center = !!st.center;
    const showWait = !!st.wait && !st.final;
    let primary = '';
    if (st.final) {
      primary = '<button class="tut-next" data-act="tut-next">' + U.esc(st.nextLabel || '继续') + '</button>';
    } else if (st.action === 'enter-node') {
      primary = '<button class="tut-next" data-act="tut-next">' + U.esc(st.buttonLabel || '入 荒') + '</button>';
    } else if (!showWait) {
      primary = '<button class="tut-next" data-act="tut-next">' + U.esc(st.nextLabel || '下一步') + '</button>';
    }

    return (
      '<div class="tut-root' + (center ? ' is-center' : '') + '" id="tutRoot" data-tut-step="' + st.id + '">' +
        '<div class="tut-shade" id="tutShade" hidden></div>' +
        '<div class="tut-spot" id="tutSpot" hidden></div>' +
        '<section class="tut-card' + (center ? ' is-center' : '') + '" id="tutCard" role="dialog" aria-live="polite" aria-label="新手教程">' +
          (center && st.seal ? '<div class="tut-bigseal">' + U.esc(st.seal) + '</div>' : '') +
          '<div class="tut-top">' +
            '<span class="tut-mark">教</span>' +
            '<span class="tut-kicker">' + U.esc(st.kicker || '') + '</span>' +
            '<span class="tut-count">' + (live.i + 1) + ' / ' + STEPS.length + '</span>' +
          '</div>' +
          '<h3 class="tut-title">' + U.esc(st.title || '') + '</h3>' +
          '<p class="tut-text">' + st.text + '</p>' +
          '<div class="tut-bar"><i style="width:' + pct + '%"></i></div>' +
          '<div class="tut-actions">' +
            (canBack(live.i) ? '<button class="tut-back" data-act="tut-back">上一步</button>' : '') +
            (showWait ? '<span class="tut-wait"><i></i>' + U.esc(st.waitText || '按提示操作，完成后继续') + '</span>' : '') +
            '<span class="tut-flex"></span>' +
            (!st.final ? '<button class="tut-skip" data-act="tut-skip">跳过教程</button>' : '') +
            primary +
          '</div>' +
        '</section>' +
      '</div>'
    );
  };

  function resolve(st) {
    let raw = null;
    try { raw = typeof st.target === 'function' ? st.target() : st.target; } catch (e) { raw = null; }
    const list = [raw].concat(st.targetFallback ? [st.targetFallback] : []);
    for (let i = 0; i < list.length; i++) {
      if (!list[i]) continue;
      let el = null;
      try { el = document.querySelector(list[i]); } catch (e) { el = null; }
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 1 && r.height > 1) return el;
    }
    return null;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function centerCard(card) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    card.style.left = Math.round((vw - cw) / 2) + 'px';
    card.style.top = Math.round((vh - ch) / 2) + 'px';
  }

  function placeCard(card, st, r) {
    const GAP = 16;
    const M = 14;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const box = {
      left: r.left - 8,
      top: r.top - 8,
      right: r.right + 8,
      bottom: r.bottom + 8
    };
    const space = {
      right: vw - box.right - GAP,
      left: box.left - GAP,
      bottom: vh - box.bottom - GAP,
      top: box.top - GAP
    };
    if (st.place === 'corner-br') {
      card.style.left = Math.round(vw - cw - 18) + 'px';
      card.style.top = Math.round(vh - ch - 18) + 'px';
      card.dataset.side = 'corner-br';
      return;
    }
    const need = (side) => (side === 'right' || side === 'left') ? cw : ch;
    const fits = (side) => space[side] >= need(side);
    const ratio = (side) => space[side] / Math.max(1, need(side));
    // 偏好方向差一点也用它：整块战场这类大目标，贴侧边栏比压住手牌更合适
    let side = st.place || null;
    if (!side || (!fits(side) && ratio(side) < 0.62)) {
      const order = ['right', 'left', 'bottom', 'top'];
      side = order.filter(fits)[0] || order.sort((a, b) => space[b] - space[a])[0];
    }

    let x = 0;
    let y = 0;
    if (side === 'right') {
      x = box.right + GAP;
      y = box.top + (box.bottom - box.top) / 2 - ch / 2;
    } else if (side === 'left') {
      x = box.left - GAP - cw;
      y = box.top + (box.bottom - box.top) / 2 - ch / 2;
    } else if (side === 'bottom') {
      x = box.left + (box.right - box.left) / 2 - cw / 2;
      y = box.bottom + GAP;
    } else {
      x = box.left + (box.right - box.left) / 2 - cw / 2;
      y = box.top - GAP - ch;
    }
    x = clamp(x, M, vw - cw - M);
    y = clamp(y, M, vh - ch - M);
    card.style.left = Math.round(x) + 'px';
    card.style.top = Math.round(y) + 'px';
    card.dataset.side = side;
  }

  T.afterRender = function () {
    const s = state();
    if (!s || !s.active || s.collapsed) return;
    const card = document.getElementById('tutCard');
    if (!card) return;
    const st = STEPS[s.i];
    if (!st) return;
    const spot = document.getElementById('tutSpot');
    const shade = document.getElementById('tutShade');
    const target = st.center ? null : resolve(st);

    if (!target) {
      if (spot) spot.hidden = true;
      if (shade) shade.hidden = false;
      card.classList.add('is-center');
      centerCard(card);
      return;
    }

    const r = target.getBoundingClientRect();
    const pad = 8;
    if (spot) {
      spot.hidden = false;
      spot.style.left = Math.round(r.left - pad) + 'px';
      spot.style.top = Math.round(r.top - pad) + 'px';
      spot.style.width = Math.round(r.width + pad * 2) + 'px';
      spot.style.height = Math.round(r.height + pad * 2) + 'px';
    }
    if (shade) shade.hidden = true;
    card.classList.remove('is-center');
    placeCard(card, st, r);
  };

  // 视口或地图滚动时重新贴合聚光
  if (typeof window !== 'undefined') {
    let pending = 0;
    const reflow = function () {
      const s = state();
      if (!s || !s.active || s.collapsed) return;
      if (pending) cancelAnimationFrame(pending);
      pending = requestAnimationFrame(function () { pending = 0; T.afterRender(); });
    };
    window.addEventListener('resize', reflow);
    window.addEventListener('scroll', reflow, true);
  }
})(typeof window !== 'undefined' ? window : globalThis);
