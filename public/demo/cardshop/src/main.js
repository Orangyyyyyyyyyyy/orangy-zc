/* ==========================================================================
 * 入口：启动、输入、主循环
 * ========================================================================== */
(function (root) {
  'use strict';
  const CS = root.CS;
  const C = CS.CONTENT;
  const U = CS.Util;

  const keys = {};
  let lastTime = 0;
  let game = null;
  let hudTimer = 0;
  let autoSaveTimer = 0;
  let running = false;

  const SPEED = C.move.playerCellsPerSec;   // 玩家：0.5 秒走一格（= 2 格/秒）
  const RADIUS = 0.19;

  function boot() {
    CS.Render.init(document.getElementById('game'));
    CS.UI.bind();

    const fill = document.querySelector('#boot .boot-bar i');
    const sub = document.querySelector('#boot .boot-sub');
    const start = () => {
      document.getElementById('boot').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      CS.Render.resize();
      afterBoot();
    };
    if (CS.Assets && CS.Assets.preloadAll) {
      CS.Assets.preloadAll((p, d, t) => {
        if (fill) { fill.style.animation = 'none'; fill.style.width = Math.max(4, p * 100).toFixed(1) + '%'; }
        if (sub) sub.textContent = '正在装载美术素材 ' + d + ' / ' + t;
      }).then(start);
    } else {
      start();
    }
  }

  function afterBoot() {
    /* 自动化测试入口：?auto=1&tab=shop&day=3&money=20000 */
    const q = new URLSearchParams(location.search);
    if (q.get('continue')) {
      continueSave();
    } else if (q.get('auto')) {
      startNew({ shopName: q.get('shop') || '测试卡牌屋', difficulty: q.get('diff') || 'normal' });
      if (q.get('money')) game.money = Number(q.get('money'));
      /* 调试：?order=pack_ss:6 直接下一单，方便截图/验收快递站 */
      if (q.get('order')) {
        const parts = String(q.get('order')).split(':');
        const sku = parts[0];
        const qty = Number(parts[1]) || 5;
        const prod = CS.INDEX.products[sku];
        if (prod) CS.Market.placeOrder(game, prod.supplier, [{ sku, qty }]);
      }
      if (q.get('build')) CS.UI.startBuild(q.get('build'));
      if (q.get('demo')) runDemo(game, q);
      if (q.get('warp')) {
        const minutes = Number(q.get('warp')) || 0;
        const perStep = 0.5 * game.clock.speed * 0.05;
        const steps = Math.min(20000, Math.round(minutes / perStep));
        for (let i = 0; i < steps; i++) CS.Game.tick(game, 0.05);
        CS.UI.updateHUD();
      }
      if (q.get('close')) { CS.Game.fastForwardToClose(game); CS.UI.updateHUD(); }
      if (q.get('settle')) {
        CS.Game.fastForwardToClose(game);
        if (game.clock.state === 'NIGHT_DECISION') { CS.UI.closeModal(); CS.Game.chooseNight(game, false); }
        CS.UI.updateHUD();
      }
      if (q.get('zoom')) CS.Render.setZoom(Number(q.get('zoom')));
      if (q.get('tab')) CS.UI.openTablet(q.get('tab'));
      if (q.get('expand')) { game.progression.expansionCredits = 4; CS.UI.startExpand(); }
      if (q.get('lvl')) { game.progression.level = Number(q.get('lvl')); CS.UI.updateHUD(); }
    } else {
      const hasSave = !!CS.Save.readLocal();
      CS.UI.showStartScreen(
        hasSave,
        (opts) => startNew(opts),
        () => continueSave()
      );
    }
    requestAnimationFrame(loop);
  }

  /* 自动演示：采购 → 取货 → 上架 → 雇人 → 开店（用于截图与快速验收） */
  function runDemo(G, q) {
    CS.Market.placeOrder(G, 'star', [{ sku: 'pack_ss', qty: 24 }]);
    CS.Market.placeOrder(G, 'flame', [{ sku: 'pack_sv', qty: 24 }]);
    const shelf = G.facilities.find(f => f.typeId === 'shelf');
    for (const pc of G.inventory.parcels.slice()) {
      CS.World.unloadParcel(G, pc, shelf, { warehouseFallback: false });
      G.inventory.parcels = G.inventory.parcels.filter(p => p.id !== pc.id);
    }
    CS.World.hireEmployee(G, 1, 'cashier', 'restock', 'carry');
    if (Number(q.get('packs') || 0) > 0) {
      for (let i = 0; i < Number(q.get('packs')); i++) CS.Cards.openPack(G, 'pack_ss');
    }
    G.products.pack_ss.price = Math.round(G.market.pack_ss.price * 1.05);
    G.products.pack_sv.price = Math.round(G.market.pack_sv.price * 1.05);
    CS.Game.openStore(G);
    G.clock.speed = 20;
    CS.UI.updateHUD();
  }

  /* 页面错误提示（开发期可见） */
  window.addEventListener('error', (e) => {
    const box = document.getElementById('errbox') || (() => {
      const d = document.createElement('div');
      d.id = 'errbox';
      d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#7a1f1f;color:#fff;font:12px/1.5 monospace;padding:8px 12px;max-height:120px;overflow:auto;white-space:pre-wrap';
      document.body.appendChild(d);
      return d;
    })();
    box.textContent += (e.message || e.error) + ' @ ' + (e.filename || '') + ':' + (e.lineno || '') + '\n';
  });

  function startNew(opts) {
    game = CS.createGame({ shopName: opts.shopName, difficulty: opts.difficulty });
    afterStart();
    /* 新档立刻落盘一次：即使马上关掉页面，「继续上次存档」也能接上 */
    if (CS.Save.auto(game, 'start')) CS.UI.flashSaveBadge();
    CS.UI.toast('欢迎来到「' + game.shopName + '」。先打开平板，在厂商商城下单采购。', 'info');
  }

  function continueSave() {
    const g = CS.Save.readLocal();
    if (!g) { startNew({ shopName: '星光卡牌屋', difficulty: 'normal' }); return; }
    game = g;
    afterStart();
    CS.UI.toast('存档已读取：第 ' + game.clock.day + ' 天，' + U.hhmm(game.clock.minute), 'info');
  }

  function afterStart() {
    window.__GAME = game;
    window.__CS = CS;
    if (location.protocol === 'file:') {
      setTimeout(() => CS.UI.toast('检测到直接打开 HTML 文件：浏览器会限制本地存档，可能读不到上次进度。请改用「启动Demo.command」启动。', 'warn'), 600);
    }
    CS.UI.attachGame(game);
    CS.UI.updateHUD();
    running = true;
    /* 玩家位置修正：确保不在设施里 */
    if (!CS.Grid.canStand(game, game.player.x, game.player.y, RADIUS)) {
      const spot = findSpawn(game);
      game.player.x = spot.x; game.player.y = spot.y;
    }
  }

  function findSpawn(G) {
    for (const k of Object.keys(G.cells)) {
      const [x, y] = k.split(',').map(Number);
      if (CS.Grid.cellFree(G, x, y)) return { x: x + 0.5, y: y + 0.5 };
    }
    return { x: 2.5, y: 4.5 };
  }

  /* ------------------------------ 主循环 ------------------------------ */
  function loop(t) {
    requestAnimationFrame(loop);
    const dt = lastTime ? Math.min(0.1, (t - lastTime) / 1000) : 0;
    lastTime = t;
    if (!game || !running) return;

    /* 时间推进（含 NPC / 员工 / 收银）；弹窗不暂停，暂停由 clock.paused 控制 */
    CS.Game.tick(game, dt);

    updatePlayer(dt);
    CS.Render.draw(game, dt);

    /* 自动存档：按现实时间计时，与游戏内时间倍率无关 */
    if (game.options.autoSave) {
      autoSaveTimer += dt;
      const interval = Number(game.options.autoSaveIntervalSec || C.autosave.intervalSec || 15);
      if (autoSaveTimer >= interval) {
        autoSaveTimer = 0;
        if (CS.Save.auto(game, 'tick')) {
          CS.UI.flashSaveBadge();
          if (CS.UI._saveWarned) CS.UI._saveWarned = false;
        } else if (!CS.UI._saveWarned) {
          CS.UI._saveWarned = true;
          CS.UI.toast('自动存档失败：' + (CS.Save.lastError || '浏览器存储不可用') +
            '。请用「启动Demo.command」打开，或在设置页导出存档备份。', 'warn');
        }
      }
    }

    hudTimer += dt;
    if (hudTimer > 0.15) {
      hudTimer = 0;
      CS.UI.updateHUD();
      updatePrompt();
    }
  }

  function updatePlayer(dt) {
    const G = game;
    if (CS.UI.modalOpen || CS.UI.tabletOpen) { G.player.moving = false; return; }
    if (G.clock.paused) { G.player.moving = false; return; }
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    if (!dx && !dy) { G.player.moving = false; return; }
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    const p = G.player;
    const step = SPEED * dt;
    const nx = p.x + dx * step;
    const ny = p.y + dy * step;
    if (CS.Grid.canStand(G, nx, p.y, RADIUS)) p.x = nx;
    if (CS.Grid.canStand(G, p.x, ny, RADIUS)) p.y = ny;
    if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 'right' : 'left';
    else p.dir = dy > 0 ? 'down' : 'up';
    p.moving = true;
  }

  function updatePrompt() {
    const G = game;
    const el = document.getElementById('interact');
    if (CS.UI.modalOpen || CS.UI.tabletOpen || CS.UI.mode !== 'play') { el.classList.add('hidden'); return; }
    const it = CS.World.interaction(G);
    if (!it) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.innerHTML = '<kbd>E</kbd> ' + escapeHtml(it.label.replace(/^E\s*/, ''));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ------------------------------ 交互 ------------------------------ */
  function interact() {
    const G = game;
    if (CS.UI.modalOpen || CS.UI.tabletOpen || CS.UI.mode !== 'play') return;
    const r = CS.World.doInteract(G);
    if (!r.ok) {
      if (r.reason && r.reason !== '附近没有可交互目标') CS.UI.toast(r.reason, 'warn');
      return;
    }
    if (r.ui === 'npc') {
      CS.UI.showNpcDialog(r.npc);
    } else if (r.ui === 'employee') {
      CS.UI.showEmployeeDialog(r.employee);
    } else if (r.ui === 'shelf' || r.ui === 'warehouse') {
      CS.UI.showFacility(r.facility);
    } else if (r.ui === 'cardtable') {
      CS.UI.showCardTable(r.facility);
    } else if (r.ui === 'gametable') {
      CS.UI.showGameTable(r.facility);
    } else if (r.parcel) {
      CS.UI.toast('搬起了 ' + I.supplierName(r.parcel.supplier) + ' 的快递箱（' + r.parcel.contents.reduce((a, c) => a + c.qty, 0) + ' 件）');
      CS.Render.pushParticle(G.player.x, G.player.y - 0.6, '+1 箱', '#ffd479');
    } else if (r.result) {
      const parts = [];
      if (r.result.shelved) parts.push('上架 ' + r.result.shelved + ' 件');
      if (r.result.stored) parts.push('入库 ' + r.result.stored + ' 件');
      if (r.result.returned) parts.push('余 ' + r.result.returned + ' 件退回快递站');
      CS.UI.toast('补货完成：' + (parts.join('，') || '无变化'));
      if (r.result.shelved) CS.Render.pushParticle(r.facility ? r.facility.x + r.facility.w / 2 : G.player.x, G.player.y - 0.8, '+库存', '#6ee0a0');
    } else if (r.npc) {
      CS.Render.pushParticle(G.player.x, G.player.y - 0.8, '+¥', '#ffd479');
    }
    CS.UI.updateHUD();
  }

  const I = {
    supplierName(id) { return (CS.INDEX.suppliers[id] || {}).name || id; }
  };

  /* ------------------------------ 输入 ------------------------------ */
  function isTyping(e) {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
  }

  window.addEventListener('keydown', (e) => {
    if (isTyping(e)) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      e.preventDefault();
      if (CS.UI.modalOpen && game && game.clock.state === 'NIGHT_DECISION') {
        CS.UI.nightDecision();
        return;
      }
      if (CS.UI.modalOpen) {
        const pauseResume = CS.UI._pauseResume;
        if (pauseResume) {
          pauseResume();          // 会走 closeModal 并恢复暂停前的状态
        } else {
          CS.UI.closeModal();
        }
      } else if (CS.UI.tabletOpen) CS.UI.closeTablet();
      else if (CS.UI.mode === 'build' || CS.UI.mode === 'expand' || CS.UI.mode === 'move' || CS.UI.mode === 'movePick') CS.UI.stopBuildMode();
      else CS.UI.openPause();
      return;
    }
    if (k === 'tab') {
      e.preventDefault();
      if (!CS.UI.modalOpen) CS.UI.toggleTablet();
      return;
    }
    if (k === 'e') {
      e.preventDefault();
      interact();
      return;
    }
    if (k === 'b') {
      if (game && !CS.UI.modalOpen && !CS.UI.tabletOpen) CS.UI.toggleBuildBar();
      return;
    }
    if (k === 'm') {
      if (game && !CS.UI.modalOpen && !CS.UI.tabletOpen) CS.UI.startMovePick();
      return;
    }
    if (k === '+' || k === '=' || k === 'numpadadd') {
      e.preventDefault();
      CS.UI.zoomBy(1.18);
      return;
    }
    if (k === '-' || k === '_') {
      e.preventDefault();
      CS.UI.zoomBy(1 / 1.18);
      return;
    }
    if (k === '0') {
      e.preventDefault();
      CS.UI.zoomFit();
      return;
    }
    if (k === ' ') {
      e.preventDefault();
      const G = game;
      if (G && !CS.UI.modalOpen && !CS.UI.tabletOpen) {
        G.clock.paused = !G.clock.paused;
        CS.UI.toast(G.clock.paused ? '模拟已暂停（空格）' : '继续模拟');
      }
      return;
    }
    keys[k] = true;
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  /* 画布鼠标 */
  document.getElementById('game').addEventListener('mousemove', (e) => {
    if (!game) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const w = CS.Render.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    CS.UI.canvasMove(w.x, w.y, e);
  });
  document.getElementById('game').addEventListener('mousedown', (e) => {
    if (!game) return;
    if (CS.UI.mode === 'play') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const w = CS.Render.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    CS.UI.canvasClick(w.x, w.y, e.button);
  });
  document.getElementById('game').addEventListener('contextmenu', (e) => {
    if (CS.UI.mode !== 'play') { e.preventDefault(); CS.UI.stopBuildMode(); }
  });

  /* 缩放：滚轮（画布上）与顶栏按钮 */
  const canvasEl = document.getElementById('game');
  canvasEl.addEventListener('wheel', (e) => {
    if (!game) return;
    e.preventDefault();
    CS.UI.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12);
  }, { passive: false });

  /* 存档兜底：关闭/切后台/移动端回收前都写一次 */
  window.addEventListener('beforeunload', () => {
    if (game && game.options.autoSave) CS.Save.auto(game, 'exit');
  });
  window.addEventListener('pagehide', () => {
    if (game && game.options.autoSave) CS.Save.auto(game, 'pagehide');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game && game.options.autoSave) CS.Save.auto(game, 'hidden');
  });

  /* 启动 */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
