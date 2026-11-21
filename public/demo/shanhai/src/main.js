/* ============================================================
 * 山海司·巡荒录  —  启动入口 main.js
 * ============================================================ */
(function () {
  'use strict';
  const SH = window.SH;

  function boot() {
    const root = document.getElementById('app');
    if (!root) return;
    SH.ui.init(root);

    // 深链：#codex 直接开图鉴；#codex/C_B_JIN_001 直达该兽详情
    setTimeout(() => {
      const m = /^#codex(?:\/([A-Za-z0-9_]+))?$/.exec(window.location.hash || '');
      if (!m) return;
      const btn = document.querySelector('[data-act="open-codex"]');
      if (!btn) return;
      btn.click();
      if (m[1]) {
        setTimeout(() => {
          const def = SH.CARD_BY_ID[m[1]];
          if (def && SH.app.ui.modal) {
            SH.app.ui.modal.atlasType = def.rarity === 'mutant' ? 'mutant' : def.type;
            SH.ui.render();
          }
          const tile = document.querySelector('[data-act="codex-entry"][data-id="' + m[1] + '"]');
          if (tile) tile.click();
        }, 160);
      }
    }, 80);

    // 键盘：Esc 取消选择 / 关闭模态；空格结束回合；D 牌组；H 经义
    window.addEventListener('keydown', (e) => {
      const app = SH.app;
      if (e.key === 'Escape') {
        if (app.ui.modal && app.ui.modal.kind === 'codex-entry') {
          const m = app.ui.modal;
          app.ui.modal = { kind: 'codex', tab: 'atlas', title: '图 鉴 · 卡 牌 录',
            atlasType: m.scopeType || 'beast',
            atlasElem: m.atlasElem || 'all', atlasRec: m.atlasRec || 'all', revealAll: !!m.revealAll };
          SH.ui.render();
          return;
        }
        if (app.ui.modal) { app.ui.modal = null; SH.ui.render(); return; }
        if (app.ui.targeting) { app.ui.targeting = null; app.ui.selectedUnit = null; SH.ui.render(); return; }
        if (app.ui.selectedUnit) { app.ui.selectedUnit = null; SH.ui.render(); }
        return;
      }
      if (app.ui.modal) {
        if (app.ui.modal.kind === 'codex-entry' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          const step = document.querySelector('[data-act="codex-step"][data-dir="' + (e.key === 'ArrowLeft' ? '-1' : '1') + '"]');
          if (step) { e.preventDefault(); step.click(); }
        }
        return;
      }
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (SH.tutorial && SH.tutorial.isActive() && e.key === 'ArrowRight' && !app.ui.targeting) {
        e.preventDefault();
        SH.tutorial.next();
        return;
      }
      if (e.code === 'Space' || e.key === ' ') {
        const btn = document.querySelector('[data-act="end-turn"]');
        if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
        return;
      }
      const k = String(e.key || '').toLowerCase();
      if (k === 'd') {
        const btn = document.querySelector('[data-act="open-deck"]');
        if (btn) { e.preventDefault(); btn.click(); }
      } else if (k === 'h') {
        const btn = document.querySelector('[data-act="open-help"]');
        if (btn) { e.preventDefault(); btn.click(); }
      } else if (k === 'c') {
        const btn = document.querySelector('[data-act="open-codex"]');
        if (btn) { e.preventDefault(); btn.click(); }
      }
    });

    // 回车触发当前聚焦的可交互元素（键盘可用性）
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const t = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!t || t.classList.contains('modal-mask')) return;
      e.preventDefault();
      t.click();
    });

    // 离开页面前保存，避免中途关窗丢档
    window.addEventListener('pagehide', () => {
      const app = SH.app;
      if (app && app.run) SH.saveGame({ run: app.run, battle: app.battle });
    });

    // 开发期自检
    if (window.console && SH.DEBUG) {
      console.log('[山海] version', SH.VERSION, 'cards', SH.CARDS.length, 'enemies', SH.ENEMIES.length);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
