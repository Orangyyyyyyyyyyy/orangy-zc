/* ==========================================================================
 * UI 层：HUD、平板 APP、弹窗、建造条
 * UI 只发起命令与展示状态，不直接改写领域数据（技术方案 §11）
 * ========================================================================== */
(function (root) {
  'use strict';
  const CS = (root.CS = root.CS || {});
  const C = CS.CONTENT;
  const I = CS.INDEX;
  const U = CS.Util;
  const A = CS.Assets;

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = U.money;
  const pct = (v, digits) => (v > 0 ? '+' : '') + (v * 100).toFixed(digits == null ? 2 : digits) + '%';
  const signed = (v) => '<span class="' + (v >= 0 ? 'pos' : 'neg') + '">' + (v >= 0 ? '+' : '') + money(v) + '</span>';
  const clamp = U.clamp;

  /* IP 顺序：宝可梦 → 游戏王 → 数码宝贝 → 海贼王 */
  function ipCatalog() {
    return (CS.IP_CATALOG && CS.IP_CATALOG.length) ? CS.IP_CATALOG : (C.ips || []);
  }
  function ipMeta(id) {
    return ipCatalog().find(i => i.id === id) || (C.ips || []).find(i => i.id === id) || null;
  }
  function ipTag(id) {
    const ip = ipMeta(id);
    if (!ip) return '';
    return '<span class="tag" style="color:' + ip.color + ';border-color:' + ip.color + '55">IP' + ip.order + ' ' + esc(ip.name) + '</span>';
  }

  const TABS = [
    { id: 'shop', name: '厂商商城', icon: '▦' },
    { id: 'inventory', name: '库存', icon: '▤' },
    { id: 'pricing', name: '定价', icon: '¥' },
    { id: 'market', name: '市场', icon: '◭' },
    { id: 'npc', name: '顾客', icon: '☻', iconKey: 'tabs.staff' },
    { id: 'staff', name: '员工', icon: '☺' },
    { id: 'finance', name: '财务', icon: '▣' },
    { id: 'loan', name: '银行', icon: '⌂' },
    { id: 'grading', name: '评级', icon: '◎' },
    { id: 'cards', name: '卡册', icon: '♠' },
    { id: 'codex', name: '图鉴', icon: '▦', iconKey: 'tabs.cards' },
    { id: 'facility', name: '设施', icon: '▧' },
    { id: 'store', name: '店铺', icon: '★' },
    { id: 'settings', name: '设置', icon: '⚙' }
  ];

  const NPC_STATE_NAME = {
    ENTER: '进店', BROWSE: '逛店', TO_SHELF: '去货架', TO_COUNTER: '去收银',
    QUEUE: '排队', TO_CARD: '去卡牌桌', TO_TABLE: '去游戏桌', PLAYING: '对局中',
    TO_PLAYER: '走向你', PITCH: '向你推销', WANDER: '闲逛', LEAVE: '离店', GONE: '已离店'
  };

  const UI = CS.UI = {
    G: null,
    tab: 'shop',
    tabletOpen: false,
    cart: {},
    shopSupplier: 'star',
    gradeSelection: [],
    gradeInst: 'pro',
    gradeSpeed: 'standard',
    cardFilter: 'all',
    cardIp: 'all',
    codexIp: 'all',
    codexTier: 'all',
    codexOnly: 'all',
    codexPage: 0,
    financeTab: 'today',
    mode: 'play',          // play | build | expand | move | movePick
    buildType: null,
    moveFacilityId: null,
    expandMode: false,
    modalOpen: false,
    lastHud: {}
  };

  /* ------------------------------ 初始化 ------------------------------ */
  UI.bind = function () {
    $('#tablet-nav').innerHTML = TABS.map(t => {
      const sp = A.bind('tabs.' + t.id) || (t.iconKey ? A.bind(t.iconKey) : null);
      const ico = sp ? A.img(sp, 'tb-ico') : '';
      return '<button class="tb-tab" data-tab="' + t.id + '">' + ico + t.name + '</button>';
    }).join('');
    $('#tablet-nav').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      UI.tab = b.dataset.tab;
      UI.renderTab();
    });
    $('#tablet-close').addEventListener('click', () => UI.closeTablet());
    $('#btn-tablet').addEventListener('click', () => UI.toggleTablet());
    $('#btn-pause').addEventListener('click', () => UI.openPause());
    $('#btn-open').addEventListener('click', () => {
      const mode = $('#btn-open').dataset.mode;
      if (mode === 'night') UI.nightDecision();
      else UI.tryOpenStore();
    });
    $('#btn-build').addEventListener('click', () => UI.toggleBuildBar());
    const zo = $('#btn-zoom-out'), zi = $('#btn-zoom-in'), zf = $('#btn-zoom-fit');
    if (zo) zo.addEventListener('click', () => UI.zoomBy(1 / 1.2));
    if (zi) zi.addEventListener('click', () => UI.zoomBy(1.2));
    if (zf) zf.addEventListener('click', () => UI.zoomFit());
    CS.Game.onMessage = (m) => UI.toast(m.text, m.kind);
    CS.Game.onSettlement = (rep) => UI.showReport(rep);
    CS.Game.onNightDecision = () => UI.nightDecision();
    CS.Game.onLevelUp = (lv) => {
      UI.updateHUD();
      const p = UI.G && UI.G.player;
      if (p && CS.Render.pushFx) {
        CS.Render.pushFx(p.x, p.y - 0.7, A.bind('fx.level'), 1.7, { rise: 0.22 });
        CS.Render.pushParticle(p.x, p.y - 1.1, 'Lv.' + UI.G.progression.level + ' 升级！', '#6ee0a0');
      }
    };
  };

  UI.attachGame = function (G) { UI.G = G; UI.cart = {}; UI._talkingNpc = null; UI.cardIp = 'all'; UI.updateHUD(); };

  /* ------------------------------ HUD ------------------------------ */
  UI.updateHUD = function () {
    const G = UI.G;
    if (!G) return;
    const c = C;
    $('#hud-shopname').textContent = G.shopName;
    $('#hud-level').textContent = 'Lv.' + G.progression.level;
    const need = CS.Progression.xpToNext(G);
    const p = clamp(G.progression.xp / need * 100, 0, 100);
    $('#hud-xpbar').style.width = p.toFixed(1) + '%';
    $('#hud-xptext').textContent = Math.floor(G.progression.xp) + ' / ' + need;
    $('#hud-clock').textContent = '第 ' + G.clock.day + ' 天 · ' + U.hhmm(G.clock.minute);
    const stateName = {
      PREPARE: '准备阶段 · 时间暂停', OPEN_DAY: '营业中', NIGHT_DECISION: '21:00 夜间决策',
      OPEN_NIGHT: '夜间营业', SETTLEMENT: '结算中', PAUSED: '已暂停'
    }[G.clock.state] || G.clock.state;
    $('#hud-state').textContent = stateName + (G.clock.paused ? ' · 暂停' : '');
    $('#hud-money').textContent = money(G.money);
    $('#hud-money').style.color = G.money < 0 ? 'var(--red)' : '';
    $('#hud-rating').textContent = G.rating.score.toFixed(1);
    $('#hud-fame').textContent = Math.round(G.rating.fame);
    /* 自动存档状态 */
    const saveEl = $('#hud-save');
    if (saveEl) {
      const la = G.lastAutoSave;
      if (CS.Save.lastError) {
        saveEl.textContent = '存档失败：' + CS.Save.lastError;
        saveEl.className = 'save-badge error';
      } else if (!G.options.autoSave) {
        saveEl.textContent = '自动存档 关闭';
        saveEl.className = 'save-badge off';
      } else if (la) {
        const d = new Date(la.ts);
        saveEl.textContent = '已自动保存 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        if (!saveEl.classList.contains('flash')) saveEl.className = 'save-badge on';
      } else {
        saveEl.textContent = '自动存档已开启';
        if (!saveEl.classList.contains('flash')) saveEl.className = 'save-badge';
      }
    }
    UI.updateZoomLabel();

    /* 速度按钮 */
    if (!UI.speedBuilt) {
      $('#speed-group').innerHTML = C.time.speeds.map(s =>
        '<button data-speed="' + s + '">' + s + '×</button>').join('');
      $('#speed-group').addEventListener('click', (e) => {
        const b = e.target.closest('[data-speed]');
        if (!b) return;
        G.clock.speed = Number(b.dataset.speed);
        UI.updateSpeedButtons();
      });
      UI.speedBuilt = true;
    }
    UI.updateSpeedButtons();

    /* 开店按钮 */
    const openBtn = $('#btn-open');
    if (G.clock.state === 'PREPARE') {
      openBtn.disabled = false;
      openBtn.textContent = '开店营业';
      openBtn.dataset.mode = 'open';
    } else if (G.clock.state === 'NIGHT_DECISION') {
      openBtn.disabled = false;
      openBtn.textContent = '夜间决策';
      openBtn.dataset.mode = 'night';
    } else {
      openBtn.disabled = true;
      openBtn.textContent = G.clock.state === 'OPEN_DAY' ? '营业中…' : '今日已打烊';
      openBtn.dataset.mode = 'none';
    }

    /* 侧栏摘要 */
    const items = CS.Inv.assortment(G);
    const stats = CS.Game.statistics(G);
    const queue = (CS.Inv.counters(G)[0] ? CS.World.counterQueue(G, CS.Inv.counters(G)[0]).length : 0);
    const tutorial = (G.stats && G.stats.daysPlayed === 0) ? (
      '<div class="sn-title" style="margin-top:14px">新手流程</div>' +
      '<div class="sn-todo ' + (G.orders.length ? 'done' : '') + '">1. 平板【厂商商城】下单采购</div>' +
      '<div class="sn-todo ' + (items.units > 0 ? 'done' : '') + '">2. 门口按 E 取箱 → 货架按 E 补货</div>' +
      '<div class="sn-todo ' + (G.today.opened ? 'done' : '') + '">3. 点击「开店营业」开始计时</div>' +
      '<div class="sn-todo ' + (G.employees.length ? 'done' : '') + '">4. 平板【员工】招聘；走近员工按 E 交谈/发奖金</div>' +
      '<div class="sn-todo ' + (G.today.served > 0 ? 'done' : '') + '">5. 顾客排队时到收银台按 E</div>'
    ) : '';
    $('#side-note').innerHTML =
      '<div class="sn-title">经营概览</div>' +
      '<div class="sn-row"><span>在售 SKU</span><b>' + items.skuCount + ' / ' + items.unlockedCount + '</b></div>' +
      '<div class="sn-row"><span>货架商品</span><b>' + items.units + ' 件</b></div>' +
      '<div class="sn-row"><span>快递站</span><b>' + G.inventory.parcels.length + ' 箱</b></div>' +
      '<div class="sn-row"><span>收银排队</span><b>' + queue + ' 人</b></div>' +
      '<div class="sn-row"><span>今日销售额</span><b>' + money(CS.Ledger.today(G).revenue + CS.Ledger.today(G).cardRevenue + CS.Ledger.today(G).gameRevenue) + '</b></div>' +
      '<div class="sn-row"><span>今日净利</span><b>' + money(CS.Ledger.today(G).net) + '</b></div>' +
      '<div class="sn-row"><span>净资产</span><b>' + money(stats.netWorth) + '</b></div>' +
      '<div class="sn-row"><span>携带</span><b>' + (G.player.carry ? '1 箱' : '空手') + '</b></div>' + tutorial;
  };

  UI.updateSpeedButtons = function () {
    const G = UI.G;
    for (const b of document.querySelectorAll('#speed-group button')) {
      b.classList.toggle('on', Number(b.dataset.speed) === G.clock.speed);
    }
  };

  /* ------------------------------ 缩放 / 存档提示 ------------------------------ */
  UI.zoomBy = function (factor) {
    if (!CS.Render || !CS.Render.zoomBy) return;
    CS.Render.zoomBy(factor);
    UI.updateZoomLabel();
  };
  UI.zoomFit = function () {
    if (!CS.Render || !CS.Render.fitZoom) return;
    CS.Render.fitZoom();
    UI.updateZoomLabel();
    UI.toast('视角已复位（100%）');
  };
  UI.updateZoomLabel = function () {
    const el = document.querySelector('#zoom-label');
    if (!el) return;
    const z = (CS.Render && CS.Render.cam && CS.Render.cam.zoom) || 1;
    el.textContent = Math.round(z * 100) + '%';
    el.classList.toggle('off', Math.abs(z - 1) < 0.01);
  };
  UI.flashSaveBadge = function () {
    const el = document.querySelector('#hud-save');
    if (!el) return;
    el.classList.remove('flash');
    /* 强制重排以便重复触发动画 */
    void el.offsetWidth;
    el.classList.add('flash');
    clearTimeout(UI._saveFlashTimer);
    UI._saveFlashTimer = setTimeout(() => el.classList.remove('flash'), 950);
  };

  /* ------------------------------ 提示 ------------------------------ */
  UI.toast = function (text, kind) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.innerHTML = esc(text);
    box.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(14px)'; }, 5200);
    setTimeout(() => el.remove(), 5800);
    while (box.children.length > 5) box.firstChild.remove();
  };

  /* ------------------------------ 平板 ------------------------------ */
  UI.toggleTablet = function () {
    if (UI.tabletOpen) UI.closeTablet(); else UI.openTablet();
  };
  UI.openTablet = function (tab) {
    if (tab) UI.tab = tab;
    UI.tabletOpen = true;
    $('#tablet').classList.remove('hidden');
    UI.renderTab();
  };
  UI.closeTablet = function () {
    UI.tabletOpen = false;
    $('#tablet').classList.add('hidden');
    UI.updateHUD();
  };

  UI.renderTab = function () {
    const G = UI.G;
    if (!G) return;
    for (const b of document.querySelectorAll('.tb-tab')) b.classList.toggle('on', b.dataset.tab === UI.tab);
    const fn = {
      shop: tabShop, inventory: tabInventory, pricing: tabPricing, market: tabMarket,
      npc: tabNpc, staff: tabStaff, finance: tabFinance, loan: tabLoan, grading: tabGrading,
      cards: tabCards, codex: tabCodex, facility: tabFacility, store: tabStore, settings: tabSettings
    }[UI.tab];
    const body = $('#tablet-body');
    body.innerHTML = fn ? fn() : '';
    wireTab(body);
  };

  function wireTab(body) {
    body.querySelectorAll('[data-act]').forEach(el => {
      const evt = (el.tagName === 'SELECT') ? 'change' : 'click';
      el.addEventListener(evt, (e) => {
        const act = el.dataset.act;
        if (evt === 'click') e.stopPropagation();
        handleAction(act, el, body);
      });
    });
    /* 数字输入变化 */
    body.querySelectorAll('[data-input]').forEach(el => {
      el.addEventListener('input', () => handleInput(el.dataset.input, el, body));
    });
  }

  /* ------------------------------ 厂商商城 ------------------------------ */
  function tabShop() {
    const G = UI.G;
    const sup = UI.shopSupplier;
    const s = I.suppliers[sup];
    const st = G.suppliers[sup];
    const products = C.products.filter(p => p.supplier === sup);
    const rows = products.map(p => {
      const qty = UI.cart[p.sku] || 0;
      const unit = CS.Market.purchasePrice(G, p.sku);
      const market = G.market[p.sku].price;
      const locked = p.unlockLevel > G.progression.level;
      const stock = st.stock[p.sku] || 0;
      const alloc = st.alloc[p.sku] || 0;
      const ip = p.pack && p.pack.ip ? ipMeta(p.pack.ip) : null;
      return '<tr data-sku="' + p.sku + '" class="' + (locked ? 'muted' : '') + '">' +
        '<td>' + prodIcon(p.sku) + '<b>' + esc(p.name) + '</b>' + (ip ? ' ' + ipTag(ip.id) : '') + (locked ? ' <span class="tag red">' + p.unlockLevel + '级解锁</span>' : '') +
        '<div class="small muted">' + esc(p.short) + ' · 占 ' + p.space + ' 格</div></td>' +
        '<td class="num">' + money(unit) + '</td>' +
        '<td class="num">' + money(market) + '<div class="small ' + (market >= p.price ? 'pos' : 'neg') + '">' + pct(market / p.price - 1) + '</div></td>' +
        '<td class="num">' + stock + '<div class="small muted">日产 ' + alloc + '</div></td>' +
        '<td class="num">' + (locked ? '—' : cartStepper(p.sku, qty)) + '</td>' +
        '<td class="num">' + (locked || !qty ? '—' : money(unit * qty)) + '</td>' +
        '</tr>';
    }).join('');

    const items = products.map(p => ({ sku: p.sku, qty: UI.cart[p.sku] || 0 }))
      .filter(i => i.qty > 0 && I.products[i.sku].unlockLevel <= G.progression.level);
    const quote = CS.Market.orderQuote(G, sup, items);
    const after = G.money - quote.total;
    const todayLedger = CS.Ledger.today(G);

    /* 厂商联动快讯（LINK）：本厂商优先，其次其它厂商 */
    const allNews = (G.supplierNews || []).filter(n => n.endDay >= G.clock.day)
      .sort((a, b) => (b.supplierId === sup ? 1 : 0) - (a.supplierId === sup ? 1 : 0) || a.endDay - b.endDay);
    const newsHtml = allNews.length ? allNews.slice(0, 6).map(n =>
      '<div class="news-row">' +
      '<span class="tag" style="color:' + n.color + ';border-color:' + n.color + '55">' + esc(n.tag) + '</span>' +
      '<div class="news-body"><b>' + esc(n.title) + '</b>' +
      '<div class="small muted">' + esc(n.text) + '</div></div>' +
      '<div class="news-days">剩 ' + Math.max(0, n.endDay - G.clock.day) + ' 天' +
      '<div class="small muted">' + esc(n.supplierName) + '</div></div>' +
      '</div>').join('')
      : '<div class="small muted">今日暂无联动快讯。厂商每天结算时可能发布新动态：折扣、补贴、扩产、联名、断供、价格战等。</div>';

    return '<div class="moneybar">' +
      '<div class="mb-item main"><span>可用资金</span><b class="' + (G.money < 0 ? 'neg' : '') + '">' + money(G.money) + '</b></div>' +
      '<div class="mb-item"><span>本单货款 + 运费</span><b>' + money(quote.total) + '</b></div>' +
      '<div class="mb-item"><span>下单后余额</span><b class="' + (after < 0 ? 'neg' : 'pos') + '">' + money(after) + '</b>' +
      (after < 0 ? '<span class="tag red">资金不足</span>' : '') + '</div>' +
      '<div class="mb-item"><span>今日采购支出</span><b>' + money(todayLedger.purchase + todayLedger.freight) + '</b></div>' +
      '</div>' +
      '<div class="between" style="margin-bottom:12px">' +
      '<div class="chip-row">' + C.suppliers.map(x =>
        '<button class="chip ' + (x.id === sup ? 'on' : '') + '" data-act="pick-supplier" data-id="' + x.id + '">' +
        '<span style="color:' + x.color + '">●</span> ' + x.name + '</button>').join('') + '</div>' +
      '<div class="small muted">每位厂商一笔订单 = 一个快递箱</div></div>' +
      '<div class="panel" style="padding:12px;margin-bottom:12px">' +
      '<div class="between"><div><b>' + s.name + '</b> <span class="muted small">' + s.desc + '</span></div>' +
      '<div class="small mono">运费 ' + money(CS.Market.freight(G, sup)) + '（基础 ' + money(s.freight) + ' × ' + G.suppliers[sup].freightMul + '）</div></div>' +
      '<div class="small muted" style="margin-top:6px">日产能 ' + s.capacity + ' 单位 · 本日生产配额 ' +
      products.reduce((a, p) => a + (st.alloc[p.sku] || 0), 0) + ' 单位' +
      (st.disrupted ? ' · <span class="tag red">本日减产</span>' : '') + '</div>' +
      '</div>' +
      '<div class="panel link-panel" style="margin-bottom:12px">' +
      '<div class="between"><h3 class="sec" style="margin:0">厂商联动 · LINK</h3>' +
      '<span class="small muted">' + allNews.length + ' 条生效中 · 每日结算刷新</span></div>' +
      '<div class="news-list">' + newsHtml + '</div></div>' +
      '<table class="tbl"><thead><tr><th>商品</th><th class="num">采购价</th><th class="num">市场参考价</th><th class="num">厂商库存</th><th class="num">采购量</th><th class="num">小计</th></tr></thead><tbody>' +
      rows + '</tbody></table>' +
      '<div class="panel quote-bar" style="margin-top:14px"><div class="between">' +
      '<div class="small muted">货款 ' + money(quote.goods) + ' + 运费 ' + money(quote.freight) +
      ' · 共 ' + quote.units + ' 件 · 资金 ' + money(G.money) + '</div>' +
      '<div class="row"><b class="mono" style="font-size:16px">' + money(quote.total) + '</b>' +
      '<button class="btn primary" data-act="order" ' + (quote.units ? '' : 'disabled') + '>下单（立即到快递站）</button></div>' +
      '</div></div>';
  }

  function cardImg(c, borderColor, sizeStyle) {
    const frame = String(c.defId || c.id).indexOf('orig-') === 0 ? A.bind('cards.borders.' + c.tier) : null;
    if (frame) {
      return '<div class="card-art" style="' + (sizeStyle || '') + '">' +
        '<img loading="lazy" src="' + c.img + '" alt="">' +
        '<img class="card-frame" src="' + A.url(frame) + '" alt="">' +
        '</div>';
    }
    return '<img loading="lazy" src="' + c.img + '" alt="" style="' + (sizeStyle || '') +
      (borderColor ? ';border:2px solid ' + borderColor : '') + '">';
  }

  function prodIcon(sku, cls) {
    const b = A.bind('products.' + sku);
    return b ? A.img(b.sprite, cls || 'row-ico') : '';
  }

  function cartStepper(sku, qty) {
    return '<div class="row" style="justify-content:flex-end;gap:4px">' +
      '<button class="btn sm" data-act="cart-dec" data-sku="' + sku + '">−</button>' +
      '<input type="number" min="0" max="999" value="' + qty + '" data-input="cart" data-sku="' + sku + '" style="width:56px;text-align:center">' +
      '<button class="btn sm" data-act="cart-inc" data-sku="' + sku + '">＋</button></div>';
  }

  /* ------------------------------ 库存 ------------------------------ */
  function tabInventory() {
    const G = UI.G;
    const rows = C.products.map(p => {
      const shelfQty = CS.Inv.shelves(G).reduce((a, f) => a + (f.stock[p.sku] || 0), 0);
      const wh = G.inventory.warehouse[p.sku] || 0;
      const station = CS.Inv.stationStock(G, p.sku);
      const carry = G.player.carry && G.player.carry.contents.some(c => c.sku === p.sku);
      const cost = G.products[p.sku].costAvg || p.purchase;
      const price = G.products[p.sku].price;
      const margin = price - cost;
      const status = shelfQty > 0 ? '<span class="tag green">在售</span>' :
        (wh > 0 || station > 0 ? '<span class="tag amber">未上架</span>' : '<span class="tag">无库存</span>');
      return '<tr>' +
        '<td>' + prodIcon(p.sku) + '<b>' + esc(p.name) + '</b><div class="small muted">' + esc(I.suppliers[p.supplier].name) + '</div></td>' +
        '<td class="num">' + shelfQty + '</td>' +
        '<td class="num">' + wh + '</td>' +
        '<td class="num">' + station + (carry ? '+' : '') + '</td>' +
        '<td class="num">' + money(cost) + '</td>' +
        '<td class="num">' + money(price) + '<div class="small ' + (margin >= 0 ? 'pos' : 'neg') + '">' + (margin >= 0 ? '+' : '') + money(margin) + '</div></td>' +
        '<td>' + status + '</td></tr>';
    }).join('');

    const packs = C.products.filter(p => p.pack && CS.Inv.totalStock(G, p.sku) > 0);

    return '<div class="between" style="margin-bottom:12px">' +
      '<div class="kpi" style="flex:1">' +
      kpi('货架商品', CS.Inv.assortment(G).units + ' 件') +
      kpi('快递站', G.inventory.parcels.length + ' 箱') +
      kpi('仓库', CS.Inv.warehouses(G).length + ' 组') +
      kpi('随身', G.player.carry ? '1 箱' : '空手') + '</div></div>' +
      '<table class="tbl"><thead><tr><th>商品</th><th class="num">货架</th><th class="num">仓库</th><th class="num">快递站</th><th class="num">成本均价</th><th class="num">售价</th><th>状态</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      (packs.length ? '<div class="panel" style="margin-top:14px"><h3 class="sec">拆包</h3><div class="small muted" style="margin-bottom:8px">拆开卡包会消耗 1 件库存，随机获得 5 张卡牌进入卡册。</div><div class="row">' +
        packs.map(p => '<button class="btn" data-act="openpack" data-sku="' + p.sku + '">拆 1 包 ' + esc(p.name) + '（余 ' + CS.Inv.totalStock(G, p.sku) + '）</button>').join('') +
        '</div></div>' : '') +
      '<div class="panel" style="margin-top:14px"><h3 class="sec">快递站</h3>' +
      (G.inventory.parcels.length ? '<div class="small muted">每个箱子只能搬一个。走到门口快递站按 E 取箱，再到货架按 E 补货。</div>' : '<div class="small muted">暂无待取快递。</div>') + '</div>';
  }

  function kpi(k, v) {
    return '<div class="kpi-item"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div></div>';
  }

  /* ------------------------------ 定价 ------------------------------ */
  function tabPricing() {
    const G = UI.G;
    const rows = C.products.map(p => {
      const m = G.market[p.sku];
      const price = G.products[p.sku].price;
      const cost = G.products[p.sku].costAvg || p.purchase;
      const margin = price - cost;
      const pctMargin = price ? Math.round(margin / price * 100) : 0;
      return '<tr>' +
        '<td>' + prodIcon(p.sku) + '<b>' + esc(p.name) + '</b><div class="small muted">市场参考 ' + money(m.price) + ' · 成本 ' + money(cost) + '</div></td>' +
        '<td class="num"><input type="number" min="1" data-input="price" data-sku="' + p.sku + '" value="' + price + '" style="width:76px;text-align:right"></td>' +
        '<td class="num"><span class="' + (margin >= 0 ? 'pos' : 'neg') + '">' + (margin >= 0 ? '+' : '') + money(margin) + '</span><div class="small muted">' + pctMargin + '%</div></td>' +
        '<td class="num">' + pct(price / m.price - 1, 1) + '</td>' +
        '<td><button class="btn sm" data-act="price-market" data-sku="' + p.sku + '">按行情</button></td>' +
        '</tr>';
    }).join('');
    return '<div class="between" style="margin-bottom:10px"><div class="small muted">玩家自由定价。NPC 会拿你的价格与市场参考价比较：越贵越容易放弃购买。</div>' +
      '<button class="btn" data-act="price-all-market">全部按行情</button></div>' +
      '<table class="tbl"><thead><tr><th>商品</th><th class="num">售价</th><th class="num">毛利</th><th class="num">相对行情</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  /* ------------------------------ 市场 ------------------------------ */
  function tabMarket() {
    const G = UI.G;
    const rows = C.products.map(p => {
      const m = G.market[p.sku];
      const f = m.factors || { D: 0, S: 0, P: 0, V: 0, T: 0, R: 0, M: 0, r: m.lastR || 0 };
      const st = CS.Market.windowStats(G, p.sku);
      const heat = (v) => '<span class="mono" style="color:' + (v > 0.02 ? 'var(--red)' : v < -0.02 ? 'var(--blue)' : 'var(--dim)') + '">' + (v > 0 ? '+' : '') + Number(v).toFixed(2) + '</span>';
      return '<tr>' +
        '<td><b>' + esc(p.name) + '</b><div class="small muted">配额 ' + (G.suppliers[p.supplier].alloc[p.sku] || 0) + ' · 厂商库存 ' + (G.suppliers[p.supplier].stock[p.sku] || 0) + '</div></td>' +
        '<td class="num">' + money(m.price) + '</td>' +
        '<td class="num ' + (m.lastR >= 0 ? 'pos' : 'neg') + '">' + pct(m.lastR || 0) + '</td>' +
        '<td class="num">' + heat(f.D) + '</td><td class="num">' + heat(f.S) + '</td><td class="num">' + heat(f.P) + '</td>' +
        '<td class="num">' + heat(f.V) + '</td><td class="num">' + heat(f.T) + '</td><td class="num">' + heat(f.R) + '</td>' +
        '<td class="num"><b>' + (f.M > 0 ? '+' : '') + Number(f.M).toFixed(2) + '</b></td>' +
        '<td class="num">' + st.sales + '<div class="small muted">需求 ' + st.demand + '</div></td>' +
        '</tr>';
    }).join('');
    return '<div class="panel" style="margin-bottom:12px">' +
      '<h3 class="sec">六因子定价模型（每日结算时更新）</h3>' +
      '<div class="mono small" style="line-height:1.9">M = 0.30·D + 0.20·S + 0.15·P + 0.15·V + 0.10·T + 0.10·R<br>r = clamp(0.05·M, −5%, +5%)　　P(t+1) = P(t)·(1+r)</div>' +
      '<div class="small muted" style="margin-top:8px">D 市场供需差 · S 厂商库存与生产 · P 玩家采购压力 · V 玩家实际销售 · T 最近 7 日趋势 · R 随机波动。各项映射到 −1~+1。</div>' +
      '</div>' +
      '<table class="tbl"><thead><tr><th>商品</th><th class="num">现价</th><th class="num">昨日涨跌</th><th class="num">D</th><th class="num">S</th><th class="num">P</th><th class="num">V</th><th class="num">T</th><th class="num">R</th><th class="num">M</th><th class="num">7日销量</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="small muted" style="margin-top:10px">长期价格没有累计倍率上限；每日变化被硬性限制在 ±5%。</div>';
  }

  /* ------------------------------ 顾客（可见性与互动） ------------------------------ */
  function tabNpc() {
    const G = UI.G;
    const live = G.npcs.filter(n => n.state !== 'GONE');
    const inside = live.filter(n => n.state !== 'LEAVE');
    const queued = live.filter(n => n.state === 'QUEUE' || n.state === 'TO_COUNTER').length;
    const contacts = (G.contacts || []).slice().sort((a, b) => (b.relation || 0) - (a.relation || 0) || (b.lastDay || 0) - (a.lastDay || 0));
    const feed = (G.interactions || []).slice(-26).reverse();

    const rowOf = (n) => {
      const st = NPC_STATE_NAME[n.state] || n.state;
      const mood = n.mood >= 3 ? '<span class="tag green">心情好</span>' : n.mood <= -1 ? '<span class="tag red">不耐烦</span>' : '<span class="tag">平静</span>';
      const wants = (n.wants || []).map(w => {
        const p = I.products[w.sku];
        return (p ? p.short : w.sku) + (w.done ? '✓' : w.failed ? '（' + w.failed + '）' : '');
      }).join('、') || '—';
      const rel = n.relation || 0;
      return '<tr>' +
        '<td><b>' + esc(n.name) + '</b>' + (n.contactId ? ' <span class="tag amber">熟客</span>' : '') +
        (n.special ? ' <span class="tag blue">' + (n.special === 'reporter' ? '记者' : '主播') + '</span>' : '') +
        '<div class="small muted">' + esc(n.typeName) + ' · 关系 ' + Math.round(rel) + '</div></td>' +
        '<td>' + esc(st) + '<div class="small muted">' + mood + '</div></td>' +
        '<td class="num">' + money(Math.max(0, n.budget - n.spent)) + '<div class="small muted">预算 ' + money(n.budget) + '</div></td>' +
        '<td class="num">' + (n.basket ? n.basket.length : 0) + ' 件</td>' +
        '<td class="small">' + esc(wants) + (n.offer ? '<div class="small" style="color:var(--amber2)">想卖你：' + esc(n.offer.name) + ' ' + money(n.offer.ask) + '</div>' : '') + '</td>' +
        '<td class="num">' + U.dist(n.x, n.y, G.player.x, G.player.y).toFixed(1) + '</td>' +
        '<td><button class="btn sm" data-act="npc-focus" data-id="' + n.id + '">定位</button></td>' +
        '</tr>';
    };

    const contactRows = contacts.slice(0, 12).map(c => {
      const rel = Math.round(c.relation || 0);
      const fav = c.favoriteSku && I.products[c.favoriteSku] ? I.products[c.favoriteSku].short : '—';
      return '<tr><td><b>' + esc(c.name) + '</b><div class="small muted">' + esc(c.typeName) + '</div></td>' +
        '<td class="num">' + rel + '<div class="bar" style="margin-top:3px"><i style="width:' + rel + '%"></i></div></td>' +
        '<td class="num">' + (c.visits || 0) + '</td>' +
        '<td class="num">' + money(c.spent || 0) + '</td>' +
        '<td class="num">' + (c.lastDay ? 'D' + c.lastDay : '—') + '</td>' +
        '<td class="small">' + esc(fav) + '</td></tr>';
    }).join('');

    const feedRows = feed.length ? feed.map(f =>
      '<div class="feed-row">' +
      '<span class="feed-time mono">D' + f.day + ' ' + U.hhmm(f.minute) + '</span>' +
      '<span class="tag ' + (f.kind === 'staff' ? 'blue' : f.kind === 'deal' ? 'amber' : '') + '">' +
      (f.kind === 'staff' ? '员工' : f.kind === 'deal' ? '成交' : '顾客') + '</span>' +
      '<b class="small">' + esc(f.who) + '</b>' +
      '<span class="small muted" style="flex:1">' + esc(f.text) + '</span>' +
      (f.delta ? '<span class="small ' + (f.delta > 0 ? 'pos' : 'neg') + '">' + (f.delta > 0 ? '+' : '') + f.delta + '</span>' : '') +
      '</div>').join('')
      : '<div class="small muted">今天还没有互动记录。靠近顾客或员工按 E 试试。</div>';

    return '<div class="kpi">' + kpi('店内顾客', inside.length + ' 人') + kpi('排队 / 去收银', queued + ' 人') +
      kpi('熟客档案', contacts.length + ' 人') + kpi('今日互动', (G.interactions || []).filter(i => i.day === G.clock.day).length + ' 次') + '</div>' +
      '<div class="panel" style="margin-top:14px"><div class="between"><h3 class="sec" style="margin:0">店内顾客（实时）</h3>' +
      '<span class="small muted">定位会在场景中高亮该顾客</span></div>' +
      (inside.length ? '<table class="tbl"><thead><tr><th>顾客</th><th>状态</th><th class="num">剩余预算</th><th class="num">购物篮</th><th>想要的商品</th><th class="num">距离</th><th></th></tr></thead><tbody>' +
        inside.map(rowOf).join('') + '</tbody></table>'
        : '<div class="small muted" style="margin-top:8px">店里暂时没有顾客。开店营业后会陆续到店。</div>') +
      '</div>' +
      '<div class="grid2" style="margin-top:14px">' +
      '<div class="panel"><h3 class="sec">熟客档案（按关系值）</h3>' +
      (contactRows ? '<table class="tbl"><thead><tr><th>熟客</th><th class="num">关系</th><th class="num">到店</th><th class="num">累计消费</th><th class="num">最近</th><th>偏好</th></tr></thead><tbody>' + contactRows + '</tbody></table>'
        : '<div class="small muted">还没有熟客。接待过的顾客会逐步形成档案，关系越高越愿意多花钱。</div>') +
      '<div class="small muted" style="margin-top:8px">关系加成：预算 +0.25%/点、价格容忍 +0.18%/点、接受推荐 +0.12%/点。</div></div>' +
      '<div class="panel"><h3 class="sec">与玩家的互动记录</h3>' + feedRows + '</div>' +
      '</div>';
  }

  /* ------------------------------ 员工 ------------------------------ */
  function tabStaff() {
    const G = UI.G;
    const rows = G.employees.map(e => {
      const eff = CS.World.employeeEff(e);
      const perf = CS.World.employeePerf(e);
      const mood = CS.World.employeeMoodLabel(e);
      const morale = Math.round(e.morale == null ? C.staffInteract.moraleStart : e.morale);
      const spec = e.spec[e.main] || 0;
      const taskSel = (field) => '<select data-act="task-' + field + '" data-id="' + e.id + '">' +
        C.staffTasks.map(t => '<option value="' + t.id + '" ' + (e[field] === t.id ? 'selected' : '') + '>' + t.name + '</option>').join('') + '</select>';
      return '<tr>' +
        '<td><b>' + esc(e.name) + '</b><div class="small muted">Lv.' + e.level + ' · 日薪 ' + money(e.wage) + '</div></td>' +
        '<td>' + taskSel('main') + '</td><td>' + taskSel('sec1') + '</td><td>' + taskSel('sec2') + '</td>' +
        '<td class="num">' + spec + '</td>' +
        '<td class="num">' + eff.toFixed(2) + '×</td>' +
        '<td class="num"><b style="color:' + mood.color + '">' + morale + '</b><div class="small muted">' + mood.text + '</div></td>' +
        '<td class="num"><b>' + perf.toFixed(2) + '</b>×</td>' +
        '<td><button class="btn sm danger" data-act="fire" data-id="' + e.id + '">解雇</button></td></tr>';
    }).join('');

    const hireRows = C.hireableLevels.map(lv => {
      const wage = Math.round(C.wages[lv] * (C.difficulty[G.difficulty] || C.difficulty.normal).wageMul);
      return '<option value="' + lv + '">Lv.' + lv + ' · 日薪 ' + money(wage) + '</option>';
    }).join('');

    return '<div class="panel"><h3 class="sec">招聘</h3>' +
      '<div class="row" style="flex-wrap:wrap">' +
      '<select id="hire-level">' + hireRows + '</select>' +
      '<span class="small muted">主要</span><select id="hire-main">' + C.staffTasks.filter(t => t.id !== 'idle').map(t => '<option value="' + t.id + '">' + t.name + '</option>').join('') + '</select>' +
      '<span class="small muted">次级</span><select id="hire-sec1">' + C.staffTasks.map(t => '<option value="' + t.id + '"' + (t.id === 'idle' ? ' selected' : '') + '>' + t.name + '</option>').join('') + '</select>' +
      '<select id="hire-sec2">' + C.staffTasks.map(t => '<option value="' + t.id + '"' + (t.id === 'idle' ? ' selected' : '') + '>' + t.name + '</option>').join('') + '</select>' +
      '<button class="btn primary" data-act="hire">招聘员工</button>' +
      '</div>' +
      '<div class="small muted" style="margin-top:8px">规则：主要任务 → 次级 1 → 次级 2；当天实际完成主要任务，专精 +1（每天最多 1 层）。专精效率 E = 1 + 0.6·M/(M+20)，与员工等级、士气系数相乘。<b>走到员工身边按 E</b> 可聊天、发奖金、调整任务或安排休息。</div>' +
      '</div>' +
      '<div class="panel" style="margin-top:12px"><h3 class="sec">员工（' + G.employees.length + ' 人）</h3>' +
      (G.employees.length ? '<table class="tbl"><thead><tr><th>员工</th><th>主要</th><th>次级1</th><th>次级2</th><th class="num">专精</th><th class="num">能力</th><th class="num">士气</th><th class="num">实际效率</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>'
        : '<div class="small muted">还没有员工。没有收银员时，顾客会自助结账（Demo 便利选项），但评价中的收银体验会偏低。</div>') +
      '</div>';
  }

  /* ------------------------------ 财务 ------------------------------ */
  function tabFinance() {
    const G = UI.G;
    const s = CS.Ledger.today(G);
    const reports = (G.reports || []).slice().reverse();
    const weeks = (G.weekReports || []).slice().reverse();
    const ledger = G.ledger.slice(-60).reverse();
    const tabs = [['today', '今日汇总'], ['daily', '日报'], ['weekly', '周报'], ['ledger', '流水']];
    let inner = '';
    if (UI.financeTab === 'today') {
      inner = '<div class="panel"><h3 class="sec">今日（第 ' + G.clock.day + ' 天）</h3>' +
        row('销售收入', s.revenue + s.cardRevenue) +
        row('游戏台桌收入', s.gameRevenue) +
        row('采购成本', -s.purchase) +
        row('运费', -s.freight) +
        row('租金 + 电费', -(s.rent + s.power)) +
        row('工资', -s.wage) +
        row('维修', -s.repair) +
        row('贷款利息', -s.loanInterest) +
        row('评级费用', -s.grading) +
        '<div class="report-row total"><span>净利</span><b class="' + (s.net >= 0 ? 'pos' : 'neg') + '">' + (s.net >= 0 ? '+' : '') + money(s.net) + '</b></div>' +
        '<div class="small muted" style="margin-top:10px">营业收入按实际销售记账；游戏台桌台费在顾客入座时入账；采购在付款当下计入支出。租金、电费、工资在次日 07:00 结算。</div></div>';
    } else if (UI.financeTab === 'daily') {
      inner = reports.length ? reports.map(r =>
        '<div class="panel" style="margin-bottom:10px"><div class="between"><b>第 ' + r.day + ' 天日报</b>' +
        '<span class="small muted">顾客 ' + r.customers + ' · 结账 ' + r.served + ' · 售出 ' + r.itemsSold + ' 件' + (r.night ? ' · 夜营' : '') + '</span></div>' +
        '<div class="report-row"><span>营业收入</span><b>' + money(r.revenue + r.cardRevenue) + '</b></div>' +
        (r.gameRevenue ? '<div class="report-row"><span>游戏台桌</span><b>' + money(r.gameRevenue) + '</b></div>' : '') +
        '<div class="report-row"><span>采购 + 运费</span><b class="neg">-' + money(r.purchase + r.freight) + '</b></div>' +
        '<div class="report-row"><span>租金 + 电费</span><b class="neg">-' + money(r.rent + r.power) + '</b></div>' +
        '<div class="report-row"><span>工资</span><b class="neg">-' + money(r.wage) + '</b></div>' +
        (r.loanInterest ? '<div class="report-row"><span>贷款利息</span><b class="neg">-' + money(r.loanInterest) + '</b></div>' : '') +
        '<div class="report-row total"><span>净利</span><b class="' + (r.net >= 0 ? 'pos' : 'neg') + '">' + money(r.net) + '</b></div>' +
        '</div>').join('') : '<div class="muted small">还没有日报，完成第一个经营日的结算后生成。</div>';
    } else if (UI.financeTab === 'weekly') {
      inner = weeks.length ? weeks.map(w =>
        '<div class="panel" style="margin-bottom:10px"><div class="between"><b>截至第 ' + w.day + ' 天的周报</b>' +
        '<span class="small muted">评分 ' + w.rating + ' · 知名度 ' + w.fame + '</span></div>' +
        '<div class="report-row"><span>营业额</span><b>' + money(w.revenue) + '</b></div>' +
        '<div class="report-row"><span>支出</span><b class="neg">-' + money(w.expense) + '</b></div>' +
        '<div class="report-row"><span>净利</span><b class="' + (w.net >= 0 ? 'pos' : 'neg') + '">' + money(w.net) + '</b></div>' +
        '<div class="report-row"><span>客流</span><b>' + w.customers + ' / 结账 ' + w.served + '</b></div>' +
        '</div>').join('') : '<div class="muted small">每 7 个经营日生成周报。</div>';
    } else {
      inner = '<table class="tbl"><thead><tr><th>天</th><th>时间</th><th>类型</th><th>说明</th><th class="num">金额</th></tr></thead><tbody>' +
        ledger.map(t => '<tr><td class="mono">D' + t.day + '</td><td class="mono">' + U.hhmm(t.minute) + '</td><td>' + catName(t.category) + '</td><td>' + esc(t.desc) + '</td><td class="num ' + (t.amount >= 0 ? 'pos' : 'neg') + '">' + (t.amount >= 0 ? '+' : '') + money(t.amount) + '</td></tr>').join('') +
        '</tbody></table>';
    }
    return '<div class="chip-row" style="margin-bottom:12px">' + tabs.map(t =>
      '<button class="chip ' + (UI.financeTab === t[0] ? 'on' : '') + '" data-act="finance-tab" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' + inner;
  }
  function row(k, v) {
    return '<div class="report-row"><span>' + k + '</span><b class="' + (v >= 0 ? 'pos' : 'neg') + '">' + (v >= 0 ? '+' : '') + money(v) + '</b></div>';
  }
  function catName(c) {
    return ({ revenue: '销售收入', cardRevenue: '卡牌销售', gameRevenue: '游戏台桌', purchase: '采购', freight: '运费', wage: '工资', rent: '租金', power: '电费', repair: '维修', loanInterest: '利息', grading: '评级', other: '其他' })[c] || c;
  }

  /* ------------------------------ 银行 ------------------------------ */
  function tabLoan() {
    const G = UI.G;
    const off = C.loans.official, pri = C.loans.private;
    const offLimit = CS.Loans.limit(G, 'official');
    const priLimit = CS.Loans.limit(G, 'private');
    const outstanding = CS.Loans.outstanding(G);
    const credit = CS.Loans.creditMul(G);
    const locked = G.progression.level < off.unlockLevel;

    const card = (cfg, limit, key) => {
      const isLocked = G.progression.level < cfg.unlockLevel;
      return '<div class="panel"><div class="between"><b>' + cfg.name + '</b>' +
        '<span class="tag ' + (isLocked ? 'red' : 'green') + '">' + (isLocked ? cfg.unlockLevel + ' 级解锁' : '可申请') + '</span></div>' +
        '<div class="small muted" style="margin:6px 0 10px">' + cfg.desc + '</div>' +
        '<div class="report-row"><span>日利率</span><b>' + (cfg.dailyRate * 100).toFixed(2) + '%</b></div>' +
        '<div class="report-row"><span>期限</span><b>' + (cfg.termDays || (cfg.repayEveryDays ? 30 : 0)) + ' 个经营日</b></div>' +
        (key === 'official' ? '<div class="report-row"><span>每 7 日还款</span><b>自动</b></div>' : '') +
        '<div class="report-row"><span>逾期宽限</span><b>' + cfg.graceDays + ' 天 / 罚息 ' + (cfg.penaltyRate * 100).toFixed(1) + '%/日</b></div>' +
        '<div class="report-row total"><span>' + (isLocked ? '当前额度（未解锁）' : '当前额度') + '</span><b>' + (isLocked ? '—' : money(limit)) + '</b></div>' +
        '<div class="row" style="margin-top:10px"><input type="number" id="loan-amt-' + key + '" value="' + Math.min(5000, Math.max(0, limit)) + '" min="0" max="' + limit + '">' +
        '<button class="btn primary" data-act="borrow" data-kind="' + key + '" ' + (isLocked || limit <= 0 ? 'disabled' : '') + '>申请贷款</button></div>' +
        '</div>';
    };

    const loanRows = G.loans.filter(l => l.balance > 0).map(l =>
      '<tr><td><b>' + l.name + '</b>' + (l.overdue ? ' <span class="tag red">逾期 ' + l.overdueDays + ' 天</span>' : '') +
      '<div class="small muted">起始 ' + money(l.principal) + ' · 到期第 ' + l.dueDay + ' 天</div></td>' +
      '<td class="num">' + money(l.balance) + '</td>' +
      '<td class="num">' + (l.rate * 100).toFixed(2) + '%</td>' +
      '<td class="num"><div class="row" style="justify-content:flex-end"><input type="number" id="repay-' + l.id + '" value="' + Math.min(Math.round(l.balance), Math.max(0, Math.round(G.money))) + '" style="width:80px">' +
      '<button class="btn sm" data-act="repay" data-id="' + l.id + '">还款</button></div></td></tr>').join('');

    return '<div class="grid2">' + card(off, offLimit, 'official') + card(pri, priLimit, 'private') + '</div>' +
      '<div class="panel" style="margin-top:12px"><h3 class="sec">贷款状态</h3>' +
      '<div class="kpi">' + kpi('未偿还本金', money(outstanding)) + kpi('授信倍率（按评分）', credit + '×') + kpi('放贷上限', money(offLimit)) + '</div>' +
      (loanRows ? '<table class="tbl" style="margin-top:12px"><thead><tr><th>贷款</th><th class="num">剩余应还</th><th class="num">日利率</th><th class="num">操作</th></tr></thead><tbody>' + loanRows + '</tbody></table>' : '<div class="small muted" style="margin-top:10px">当前没有未还贷款。</div>') +
      '<div class="small muted" style="margin-top:10px">官方额度 = (10,000 + 3,000 × (等级 − 5)) × 授信倍率；民间额度 = 官方额度 × 1.5。利息按未偿还本金逐日计提，不计复利。</div>' +
      '</div>';
  }

  /* ------------------------------ 评级 ------------------------------ */
  function tabGrading() {
    const G = UI.G;
    const binder = G.cards.filter(c => c.location === 'binder');
    const sel = UI.gradeSelection.filter(id => binder.some(c => c.id === id));
    UI.gradeSelection = sel;
    const cost = CS.Cards.gradeCost(UI.gradeInst, UI.gradeSpeed, sel.length);
    const insts = C.grading.institutions.map(i =>
      '<button class="chip ' + (UI.gradeInst === i.id ? 'on' : '') + '" data-act="grade-inst" data-id="' + i.id + '">' + i.name + '</button>').join('');
    const speeds = C.grading.speeds.map(s =>
      '<button class="chip ' + (UI.gradeSpeed === s.id ? 'on' : '') + '" data-act="grade-speed" data-id="' + s.id + '">' + s.name + '</button>').join('');
    const orders = G.gradingOrders.filter(o => o.status === 'pending').map(o =>
      '<div class="report-row"><span>' + o.instName + ' · ' + o.speedName + ' · ' + o.cardIds.length + ' 张</span><b>' +
      (o.dueDay - G.clock.day) + ' 天后完成</b></div>').join('');

    return '<div class="panel"><h3 class="sec">送评</h3>' +
      '<div class="row" style="margin-bottom:8px"><span class="small muted" style="width:56px">机构</span><div class="chip-row">' + insts + '</div></div>' +
      '<div class="row" style="margin-bottom:10px"><span class="small muted" style="width:56px">时效</span><div class="chip-row">' + speeds + '</div></div>' +
      '<div class="small muted">每张评级费按机构与时效倍率计算，单次运费固定；评级等级 1~10 完全随机，花更多钱不会提高高等级概率。</div>' +
      '<div class="kpi" style="margin-top:10px">' + kpi('已选卡牌', sel.length + ' / 10') + kpi('手续费', money(sel.length ? cost.fee : 0)) + kpi('运费', money(sel.length ? cost.freight : 0)) + kpi('预计用时', cost.days + ' 天') + '</div>' +
      '<div class="between" style="margin-top:10px"><div class="mono" style="font-size:18px">合计 ' + money(sel.length ? cost.total : 0) + '</div>' +
      '<div class="row"><button class="btn ghost" data-act="grade-clear">清空</button><button class="btn primary" data-act="grade-submit" ' + (sel.length ? '' : 'disabled') + '>送评</button></div></div>' +
      (orders ? '<div style="margin-top:12px"><h3 class="sec">处理中</h3>' + orders + '</div>' : '') +
      '</div>' +
      '<div class="panel" style="margin-top:12px"><h3 class="sec">卡册中可送评（' + binder.length + ' 张）</h3>' +
      (binder.length ? '<div class="cardgrid">' + binder.map(c => cardTile(c, sel.indexOf(c.id) >= 0)).join('') + '</div>'
        : '<div class="small muted">卡册是空的。先在【库存】里拆开卡包。</div>') +
      '</div>';
  }

  function cardTile(c, selected) {
    const tierColor = C.rarity.colors[c.tier] || '#888';
    return '<div class="carditem ' + (selected ? 'sel' : '') + '" data-act="grade-pick" data-id="' + c.id + '">' +
      (c.grade ? '<div class="grade">' + c.grade + '级</div>' : '') +
      cardImg(c, tierColor) +
      '<div class="cname">' + esc(c.name) + '</div>' +
      '<div class="ctier" style="color:' + tierColor + '">' + esc(c.tier) + ' · ' + money(CS.Cards.valueOf(c)) + '</div>' +
      '</div>';
  }

  /* ------------------------------ 卡册 ------------------------------ */
  function tabCards() {
    const G = UI.G;
    const sum = CS.Cards.summary(G);
    const filters = [['all', '全部'], ['graded', '已评级'], ['table', '在售'], ['grading', '评级中']];
    let list = G.cards.filter(c => c.location !== 'sold');
    if (UI.cardFilter === 'graded') list = list.filter(c => c.grade > 0);
    if (UI.cardFilter === 'table') list = list.filter(c => c.location === 'table');
    if (UI.cardFilter === 'grading') list = list.filter(c => c.location === 'grading');
    if (UI.cardIp !== 'all') list = list.filter(c => c.ip === UI.cardIp);
    list.sort((a, b) => CS.Cards.valueOf(b) - CS.Cards.valueOf(a));

    const tables = CS.Inv.cardTables(G);
    const listed = G.cards.filter(c => c.location === 'table');

    return '<div class="kpi">' + kpi('持有卡牌', sum.total + ' 张') + kpi('图鉴收集', sum.unique + ' / ' + (CS.CARDS || []).length) +
      kpi('已评级', sum.graded) + kpi('收藏估值', money(sum.value)) + '</div>' +
      '<div class="between" style="margin:14px 0 10px">' +
      '<div class="chip-row">' + filters.map(f => '<button class="chip ' + (UI.cardFilter === f[0] ? 'on' : '') + '" data-act="card-filter" data-id="' + f[0] + '">' + f[1] + '</button>').join('') + '</div>' +
      '<div class="small muted">卡牌桌 ' + (tables.length ? '：已上架 ' + listed.length + ' 张' : '：未购买（3 级解锁）') + '</div></div>' +
      '<div class="chip-row" style="margin-bottom:12px">' +
      '<button class="chip ' + (UI.cardIp === 'all' ? 'on' : '') + '" data-act="card-ip" data-id="all">全部 IP</button>' +
      ipCatalog().map(ip => '<button class="chip ' + (UI.cardIp === ip.id ? 'on' : '') + '" data-act="card-ip" data-id="' + ip.id + '"><span style="color:' + ip.color + '">●</span> IP' + ip.order + ' ' + esc(ip.name) + '</button>').join('') +
      '</div>' +
      (list.length ? '<div class="cardgrid">' + list.map(c => {
        const clickable = c.location === 'binder' || c.location === 'table';
        return '<div class="carditem" data-act="card-detail" data-id="' + c.id + '">' +
          (c.grade ? '<div class="grade">' + c.grade + '级</div>' : '') +
          cardImg(c, C.rarity.colors[c.tier] || '#888') +
          '<div class="cname">' + esc(c.name) + '</div>' +
          '<div class="ctier" style="color:' + (C.rarity.colors[c.tier] || '#888') + '">' + esc(C.rarity.names[c.tier] || c.tier) +
          (c.location === 'table' ? ' · 在售 ' + money(c.price) : ' · ' + money(CS.Cards.valueOf(c))) + '</div>' +
          '<div class="small muted">' + (c.ipName || '宝可梦') + '</div>' +
          '</div>';
      }).join('') + '</div>' : '<div class="small muted">卡册暂无卡牌。拆卡包或在卡牌桌购买后获得。</div>') +
      '<div class="small muted" style="margin-top:14px">评级价值 = 卡牌基础收藏价值 × 等级倍率。卡牌实例具有唯一 ID 与唯一所有者。</div>';
  }

  /* ------------------------------ 卡牌图鉴 ------------------------------ */
  function ownedCounts(G) {
    const map = {};
    for (const c of G.cards) {
      if (c.location === 'sold') continue;
      map[c.defId] = (map[c.defId] || 0) + 1;
    }
    return map;
  }

  function tabCodex() {
    const G = UI.G;
    const all = CS.CARDS || [];
    const owned = ownedCounts(G);
    let list = all.slice();
    if (UI.codexIp !== 'all') list = list.filter(c => c.ip === UI.codexIp);
    if (UI.codexTier !== 'all') list = list.filter(c => c.tier === UI.codexTier);
    if (UI.codexOnly === 'owned') list = list.filter(c => owned[c.id]);
    if (UI.codexOnly === 'missing') list = list.filter(c => !owned[c.id]);
    /* 稳定排序：已收集优先，再按稀有度、IP */
    const tierRank = {}; C.rarity.order.forEach((t, i) => { tierRank[t] = i; });
    list.sort((a, b) => (owned[b.id] ? 1 : 0) - (owned[a.id] ? 1 : 0)
      || (a.ipOrder || 0) - (b.ipOrder || 0)
      || (tierRank[b.tier] || 0) - (tierRank[a.tier] || 0)
      || String(a.name).localeCompare(String(b.name)));

    const perPage = 48;
    const pages = Math.max(1, Math.ceil(list.length / perPage));
    const page = U.clamp(UI.codexPage, 0, pages - 1);
    UI.codexPage = page;
    const slice = list.slice(page * perPage, page * perPage + perPage);
    const totalOwned = all.filter(c => owned[c.id]).length;

    const ipStats = ipCatalog().map(ip => {
      const pool = all.filter(c => c.ip === ip.id);
      const got = pool.filter(c => owned[c.id]).length;
      return { ip, pool: pool.length, got };
    });

    const chips = '<div class="chip-row" style="margin-bottom:8px">' +
      '<button class="chip ' + (UI.codexIp === 'all' ? 'on' : '') + '" data-act="codex-ip" data-id="all">全部 IP</button>' +
      ipCatalog().map(ip => '<button class="chip ' + (UI.codexIp === ip.id ? 'on' : '') + '" data-act="codex-ip" data-id="' + ip.id + '">' +
        '<span style="color:' + ip.color + '">●</span> IP' + ip.order + ' ' + esc(ip.name) + '</button>').join('') +
      '</div><div class="chip-row" style="margin-bottom:8px">' +
      '<button class="chip ' + (UI.codexTier === 'all' ? 'on' : '') + '" data-act="codex-tier" data-id="all">全部稀有度</button>' +
      C.rarity.order.map(t => '<button class="chip ' + (UI.codexTier === t ? 'on' : '') + '" data-act="codex-tier" data-id="' + t + '">' +
        esc(C.rarity.names[t] || t) + '</button>').join('') +
      '</div><div class="chip-row" style="margin-bottom:12px">' +
      [['all', '全部'], ['owned', '已收集'], ['missing', '未收集']].map(f =>
        '<button class="chip ' + (UI.codexOnly === f[0] ? 'on' : '') + '" data-act="codex-only" data-id="' + f[0] + '">' + f[1] + '</button>').join('') +
      '</div>';

    const grid = slice.length ? '<div class="cardgrid codex-grid">' + slice.map(c => {
      const n = owned[c.id] || 0;
      const tierColor = C.rarity.colors[c.tier] || '#888';
      const ip = ipMeta(c.ip);
      return '<div class="carditem codex-item ' + (n ? '' : 'unowned') + '" data-act="codex-detail" data-id="' + esc(c.id) + '">' +
        (n > 1 ? '<div class="own-badge">×' + n + '</div>' : '') +
        (n ? '' : '<div class="lock-badge">未收集</div>') +
        (c.id.startsWith('orig-') && A.bind('cards.borders.' + c.tier)
          ? '<div class="card-art"><img loading="lazy" src="' + c.img + '" alt=""><img class="card-frame" src="' + A.url(A.bind('cards.borders.' + c.tier)) + '" alt=""></div>'
          : '<img loading="lazy" src="' + c.img + '" alt="">') +
        '<div class="cname">' + esc(c.name) + '</div>' +
        '<div class="ctier" style="color:' + tierColor + '">' + esc(C.rarity.names[c.tier] || c.tier) + '</div>' +
        '<div class="small muted">' + (ip ? 'IP' + ip.order + ' ' + esc(ip.name) : '') + '</div>' +
        '</div>';
    }).join('') + '</div>' : '<div class="small muted">这个筛选条件下没有卡牌。</div>';

    const pager = '<div class="between" style="margin-top:12px">' +
      '<div class="small muted">共 ' + list.length + ' 张 · 第 ' + (page + 1) + ' / ' + pages + ' 页</div>' +
      '<div class="row"><button class="btn sm" data-act="codex-page" data-id="' + (page - 1) + '" ' + (page <= 0 ? 'disabled' : '') + '>上一页</button>' +
      '<button class="btn sm" data-act="codex-page" data-id="' + (page + 1) + '" ' + (page >= pages - 1 ? 'disabled' : '') + '>下一页</button></div></div>';

    return '<div class="kpi">' + kpi('图鉴收集', totalOwned + ' / ' + all.length) +
      kpi('收集率', (all.length ? Math.round(totalOwned / all.length * 100) : 0) + '%') +
      ipStats.map(s => kpi('IP' + s.ip.order + ' ' + s.ip.name, s.got + ' / ' + s.pool)).join('') +
      '</div>' +
      '<div class="between" style="margin:14px 0 8px"><div class="small muted">图鉴收录全部可获取卡牌；卡包与 NPC 交易都会点亮对应条目。</div>' +
      '<div class="small muted">持有卡牌 ' + G.cards.filter(c => c.location !== 'sold').length + ' 张</div></div>' +
      chips + grid + pager;
  }

  UI.codexDetail = function (defId) {
    const G = UI.G;
    const def = (CS.CARDS || []).find(c => c.id === defId);
    if (!def) return;
    const owned = G.cards.filter(c => c.defId === defId && c.location !== 'sold');
    const ip = ipMeta(def.ip);
    const tierColor = C.rarity.colors[def.tier] || '#888';
    const pack = C.products.find(p => p.pack && p.pack.ip === def.ip);
    const modal = UI.modal(
      '<div class="modal-head"><h2>' + esc(def.name) + '</h2><button class="modal-x" id="cx-close">×</button></div>' +
      '<div class="modal-body"><div class="row" style="align-items:flex-start;gap:16px">' +
      '<div style="width:190px;flex:none">' +
      (def.id.startsWith('orig-') && A.bind('cards.borders.' + def.tier)
        ? '<div class="card-art"><img src="' + def.img + '" alt=""><img class="card-frame" src="' + A.url(A.bind('cards.borders.' + def.tier)) + '" alt=""></div>'
        : '<img src="' + def.img + '" alt="" style="width:100%;border-radius:10px;border:2px solid ' + tierColor + '">') +
      '</div>' +
      '<div style="flex:1">' +
      '<div class="small muted">' + esc(def.series || '') + ' · ' + esc(def.nameEn || '') + '</div>' +
      '<div class="row" style="margin:10px 0"><span class="tag" style="color:' + tierColor + ';border-color:' + tierColor + '55">' + esc(C.rarity.names[def.tier] || def.tier) + '</span>' +
      (ip ? ipTag(ip.id) : '') +
      '<span class="tag ' + (owned.length ? 'green' : '') + '">' + (owned.length ? '已收集 ×' + owned.length : '未收集') + '</span></div>' +
      '<div class="report-row"><span>基础收藏价值</span><b>' + money(CS.Cards.valueBase(def.tier)) + '</b></div>' +
      '<div class="report-row"><span>获取来源</span><b>' + (pack ? esc(pack.name) : 'NPC 交易 / 卡牌桌') + '</b></div>' +
      '<div class="report-row"><span>图鉴编号</span><b class="mono">' + esc(def.id) + '</b></div>' +
      (owned.length ? '<div class="report-row"><span>持有实例</span><b class="mono">' + owned.slice(0, 4).map(c => c.grade ? c.grade + '级' : '未评级').join('、') + '</b></div>' : '') +
      '<div class="small muted" style="margin-top:10px">' + (owned.length ? '可以在【卡册】里查看实例、评级或上架卡牌桌。' : '拆对应 IP 的卡包，或等 NPC 主动向你推销。') + '</div>' +
      '</div></div></div>' +
      '<div class="modal-foot"><button class="btn primary" id="cx-close2">关闭</button></div>'
    );
    modal.querySelector('#cx-close').addEventListener('click', () => UI.closeModal());
    modal.querySelector('#cx-close2').addEventListener('click', () => UI.closeModal());
  };

  /* ------------------------------ 设施 ------------------------------ */
  function tabFacility() {
    const G = UI.G;
    const owned = {};
    for (const f of G.facilities) owned[f.typeId] = (owned[f.typeId] || 0) + 1;
    const rows = C.facilities.map(def => {
      const locked = G.progression.level < def.unlockLevel;
      const affordable = G.money >= def.price;
      return '<tr>' +
        '<td><b>' + esc(def.name) + '</b><div class="small muted">' + esc(def.desc) + '</div></td>' +
        '<td class="num">' + def.w + '×' + def.h + '</td>' +
        '<td class="num">' + money(def.price) + '</td>' +
        '<td class="num">' + (locked ? '需 ' + def.unlockLevel + ' 级' : '可购买') + '</td>' +
        '<td class="num">' + (owned[def.id] || 0) + '</td>' +
        '<td><button class="btn sm" data-act="place-facility" data-id="' + def.id + '" ' + (locked || !affordable ? 'disabled' : '') + '>购买并放置</button></td>' +
        '</tr>';
    }).join('');
    return '<div class="between" style="margin-bottom:10px"><div class="small muted">购买后进入放置模式：鼠标移动到可用格子上点击确认。设施可回收（不退款），内部商品会退回快递站；已放置的设施可以随时挪动。</div></div>' +
      '<table class="tbl"><thead><tr><th>设施</th><th class="num">占地</th><th class="num">价格</th><th class="num">解锁</th><th class="num">已拥有</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="panel" style="margin-top:12px"><h3 class="sec">现有设施</h3>' +
      (G.facilities.length ? '<table class="tbl"><thead><tr><th>设施</th><th class="num">位置</th><th class="num">耐久</th><th class="num">维修费</th><th></th></tr></thead><tbody>' +
        G.facilities.map(f => {
          const def = I.facilities[f.typeId];
          const broken = 1 - f.durability / 100;
          const cost = Math.round(def.price * broken * C.economy.repairCoeff);
          return '<tr><td>' + esc(def.name) + (f.isInitial ? ' <span class="tag">初始</span>' : '') + '</td>' +
            '<td class="num">(' + f.x + ',' + f.y + ')</td>' +
            '<td class="num">' + Math.round(f.durability) + '%</td>' +
            '<td class="num">' + money(cost) + '</td>' +
            '<td><button class="btn sm" data-act="move-facility" data-id="' + f.id + '">挪动</button> ' +
            '<button class="btn sm" data-act="repair" data-id="' + f.id + '" ' + (broken < 0.01 || G.money < cost ? 'disabled' : '') + '>维修</button>' +
            (f.isInitial ? '' : ' <button class="btn sm danger" data-act="recycle" data-id="' + f.id + '">回收</button>') + '</td></tr>';
        }).join('') + '</tbody></table>' : '<div class="small muted">没有设施。</div>') +
      '</div>';
  }

  /* ------------------------------ 店铺 ------------------------------ */
  function tabStore() {
    const G = UI.G;
    const next = CS.Progression.xpToNext(G);
    const reviews = G.rating.reviews.slice(-8).reverse();
    const stars = CS.Rating.stars(G.rating.score);
    return '<div class="grid2">' +
      '<div class="panel"><h3 class="sec">成长</h3>' +
      '<div class="between"><b style="font-size:20px">Lv.' + G.progression.level + '</b><span class="mono">' + Math.floor(G.progression.xp) + ' / ' + next + ' XP</span></div>' +
      '<div class="bar amber" style="margin:8px 0 14px"><i style="width:' + clamp(G.progression.xp / next * 100, 0, 100) + '%"></i></div>' +
      '<div class="report-row"><span>累计经验</span><b>' + Math.floor(G.progression.lifetimeXp || 0) + '</b></div>' +
      '<div class="report-row"><span>扩建格额度</span><b>' + G.progression.expansionCredits + '</b></div>' +
      '<div class="report-row"><span>已解锁面积</span><b>' + Object.keys(G.cells).length + ' / ' + C.economy.floorMaxCells + '</b></div>' +
      '<div class="report-row"><span>累计销售利润</span><b>' + money(G.progression.profitTotal) + '</b></div>' +
      '<div class="row" style="margin-top:10px"><button class="btn primary" data-act="expand-mode" ' + (G.progression.expansionCredits > 0 ? '' : 'disabled') + '>扩建地板（剩余 ' + G.progression.expansionCredits + '）</button></div>' +
      '<div class="small muted" style="margin-top:8px">每升一级永久 +2 格额度；新格子必须与现有地板相邻，单层上限 ' + C.economy.floorMaxCells + ' 格。</div>' +
      '</div>' +
      '<div class="panel"><h3 class="sec">评价</h3>' +
      '<div class="between"><div><b style="font-size:24px">' + G.rating.score.toFixed(1) + '</b><span class="muted"> / 100</span></div>' +
      '<div><span class="tag amber">★ ' + stars + '</span> <span class="tag">知名度 ' + Math.round(G.rating.fame) + '</span></div></div>' +
      '<div class="small muted" style="margin:8px 0 10px">当前评分 = 最近 30 个经营日有效评价的算术平均（历史评价永久保存）。</div>' +
      reviews.map(r => '<div class="report-row"><span title="' + esc(r.text) + '">' + esc(r.npcName) + ' · ' + esc(r.typeName) + '</span><b>' + r.score.toFixed(1) + ' 分</b></div>').join('') +
      '</div></div>' +
      '<div class="panel" style="margin-top:12px"><h3 class="sec">IP 同步（优先级）</h3>' +
      ipCatalog().map(ip => {
        const demoCount = (CS.CARDS || []).filter(c => c.ip === ip.id).length;
        const pack = I.products[ip.pack];
        return '<div class="report-row"><span><span style="color:' + ip.color + '">●</span> IP' + ip.order + ' · ' + esc(ip.name) + '</span>' +
          '<b class="small">素材 ' + (ip.total ? Number(ip.total).toLocaleString('zh-CN') : '—') + ' 张 · Demo ' + demoCount + ' 张 · ' + esc(pack ? pack.name : '未配置卡包') + '</b></div>';
      }).join('') +
      '<div class="small muted" style="margin-top:8px">顺序固定为：宝可梦 → 游戏王 → 数码宝贝 → 海贼王。素材库全量已登记；游戏王 / 数码宝贝 / 海贼王 各内置 100 张精选卡，新增卡包只从对应 IP 抽取。</div></div>' +
      '<div class="panel" style="margin-top:12px"><h3 class="sec">等级解锁（1–25 建议表）</h3>' +
      '<div class="small muted" style="margin-bottom:8px">表内为建议稿，设施解锁仅代表购买资格，不赠送。</div>' +
      '<div class="chip-row">' + Array.from({ length: 25 }, (_, i) => {
        const lv = i + 1;
        return '<span class="tag ' + (lv <= G.progression.level ? 'green' : '') + '">' + lv + '级</span>';
      }).join('') + '</div></div>';
  }

  /* ------------------------------ 设置 ------------------------------ */
  function tabSettings() {
    const G = UI.G;
    return '<div class="grid2">' +
      '<div class="panel"><h3 class="sec">存档</h3>' +
      '<div class="row" style="flex-wrap:wrap">' +
      '<button class="btn primary" data-act="save">保存到浏览器</button>' +
      '<button class="btn" data-act="export">导出存档文件</button>' +
      '<button class="btn" data-act="import">导入存档</button>' +
      '</div>' +
      '<div class="small muted" style="margin-top:8px">浏览器存档使用 localStorage；导出可获得 JSON 备份。' +
      (G.lastAutoSave ? '上次自动保存：第 ' + G.lastAutoSave.day + ' 天 ' + U.hhmm(G.lastAutoSave.minute) + '（累计 ' + (G.saveMeta ? G.saveMeta.autoSaves : 0) + ' 次）' : '尚未自动保存。') + '</div>' +
      '<div class="row" style="margin-top:14px"><button class="btn danger" data-act="newgame">重新开档</button></div>' +
      '</div>' +
      '<div class="panel"><h3 class="sec">选项</h3>' +
      '<label class="row" style="margin-bottom:8px"><input type="checkbox" ' + (G.options.selfCheckout ? 'checked' : '') + ' data-act="toggle-selfcheckout"> <span class="small">无人收银时顾客自助结账（Demo 便利）</span></label>' +
      '<label class="row" style="margin-bottom:8px"><input type="checkbox" ' + (G.options.autoSave ? 'checked' : '') + ' data-act="toggle-autosave"> <span class="small">自动存档（关键操作 + 定时）</span></label>' +
      '<div class="row" style="margin-bottom:10px"><span class="small muted" style="width:96px">自动存档间隔</span>' +
      '<select data-act="autosave-interval">' +
      [10, 15, 30, 60].map(v => '<option value="' + v + '" ' + (Number(G.options.autoSaveIntervalSec || C.autosave.intervalSec) === v ? 'selected' : '') + '>每 ' + v + ' 秒</option>').join('') +
      '</select></div>' +
      '<label class="row" style="margin-bottom:8px"><input type="checkbox" ' + (G.options.showNpcBubbles !== false ? 'checked' : '') + ' data-act="toggle-npcbubbles"> <span class="small">场景内显示顾客状态气泡</span></label>' +
      '<div class="small muted">按 ESC 打开暂停菜单；平板打开时游戏不会暂停（与 GDD 一致）。</div>' +
      '</div></div>' +
      '<div class="panel" style="margin-top:12px"><h3 class="sec">演示工具（仅 Demo）</h3>' +
      '<div class="row" style="flex-wrap:wrap">' +
      '<button class="btn" data-act="dev-money">+¥10,000</button>' +
      '<button class="btn" data-act="dev-xp">+1,000 经验</button>' +
      '<button class="btn" data-act="dev-level">等级 +1</button>' +
      '<button class="btn" data-act="dev-close">直接进入 21:00</button>' +
      '<button class="btn" data-act="dev-settle">跳到次日 07:00</button>' +
      '</div>' +
      '<div class="small muted" style="margin-top:8px">这些按钮不会出现在正式版，用来快速验证市场、贷款与评级系统。</div>' +
      '</div>' +
      '<div class="panel" style="margin-top:12px"><h3 class="sec">关于</h3>' +
      '<div class="small muted" style="line-height:1.8">卡牌店模拟经营 · 浏览器 Demo ' + C.meta.version + '<br>' +
      '依据 GDD 1.0 / 数值与配置表 1.0 / 浏览器 Demo 技术实施方案 1.0 实现。<br>' +
      '本 Demo 覆盖：采购→快递→搬运→上架→定价→NPC 购物→收银→评价→日结算→次日 的完整闭环，并实现了市场六因子、厂商 7 日生产策略、经验曲线、员工专精、评级与贷款。</div>' +
      '</div>';
  }

  /* ------------------------------ 动作分发 ------------------------------ */
  function handleAction(act, el, body) {
    const G = UI.G;
    switch (act) {
      case 'pick-supplier':
        UI.shopSupplier = el.dataset.id;
        UI.renderTab();
        break;
      case 'cart-inc': {
        const sku = el.dataset.sku;
        UI.cart[sku] = Math.min(999, (UI.cart[sku] || 0) + 1);
        UI.renderTab();
        break;
      }
      case 'cart-dec': {
        const sku = el.dataset.sku;
        UI.cart[sku] = Math.max(0, (UI.cart[sku] || 0) - 1);
        UI.renderTab();
        break;
      }
      case 'order': {
        const items = C.products.filter(p => p.supplier === UI.shopSupplier)
          .map(p => ({ sku: p.sku, qty: UI.cart[p.sku] || 0 })).filter(i => i.qty > 0);
        const r = CS.Market.placeOrder(G, UI.shopSupplier, items);
        if (r.ok) {
          UI.toast('下单成功：' + r.order.units + ' 件，' + money(r.order.total) + (r.shortfall ? '，其中 ' + r.shortfall + ' 件缺货未发' : ''), 'info');
          for (const k of Object.keys(UI.cart)) UI.cart[k] = 0;
          CS.Save.auto(G, 'order');
        } else {
          UI.toast('下单失败：' + r.reason, 'warn');
        }
        UI.renderTab();
        UI.updateHUD();
        break;
      }
      case 'openpack': {
        const r = CS.Cards.openPack(G, el.dataset.sku);
        if (r.ok) {
          const ip = ipMeta(r.ip);
          UI.toast('拆包获得' + (ip ? '【IP' + ip.order + ' ' + ip.name + '】' : '') + '：' + r.cards.map(c => c.name + '(' + c.tier + ')').join('、'), 'card');
          const p = UI.G && UI.G.player;
          const rare = r.cards.some(c => ['AR', 'SR', 'SAR', 'UR'].indexOf(c.tier) >= 0);
          if (p && CS.Render.pushFx) {
            CS.Render.pushFx(p.x, p.y - 0.75, A.bind('fx.rare'), rare ? 1.3 : 0.8, { rise: 0.3 });
          }
        } else UI.toast(r.reason, 'warn');
        UI.renderTab();
        break;
      }
      case 'price-market':
        CS.Game.setPrice(G, el.dataset.sku, Math.round(G.market[el.dataset.sku].price));
        UI.renderTab();
        break;
      case 'price-all-market':
        for (const p of C.products) CS.Game.setPrice(G, p.sku, Math.round(G.market[p.sku].price));
        UI.toast('全部商品已按市场参考价定价');
        UI.renderTab();
        break;
      case 'hire': {
        const lv = Number($('#hire-level').value);
        const main = $('#hire-main').value;
        const s1 = $('#hire-sec1').value, s2 = $('#hire-sec2').value;
        const r = CS.World.hireEmployee(G, lv, main, s1, s2);
        if (r.ok) UI.toast('已招聘 ' + r.employee.name + '（Lv.' + lv + ' ' + taskName(main) + '）');
        else UI.toast(r.reason, 'warn');
        UI.renderTab();
        UI.updateHUD();
        break;
      }
      case 'fire': {
        const r = CS.World.fireEmployee(G, el.dataset.id);
        if (r.ok) UI.toast('员工已解雇');
        UI.renderTab();
        UI.updateHUD();
        break;
      }
      case 'finance-tab':
        UI.financeTab = el.dataset.tab;
        UI.renderTab();
        break;
      case 'borrow': {
        const kind = el.dataset.kind;
        const amt = Number($('#loan-amt-' + kind).value);
        const r = CS.Loans.borrow(G, kind, amt);
        UI.toast(r.ok ? '放款 ' + money(r.loan.principal) + '（' + r.loan.name + '）' : r.reason, r.ok ? 'info' : 'warn');
        UI.renderTab();
        UI.updateHUD();
        break;
      }
      case 'repay': {
        const id = el.dataset.id;
        const amt = Number($('#repay-' + id).value);
        const r = CS.Loans.repay(G, id, amt);
        UI.toast(r.ok ? '已还款 ' + money(r.paid) : r.reason, r.ok ? 'info' : 'warn');
        UI.renderTab();
        UI.updateHUD();
        break;
      }
      case 'grade-inst': UI.gradeInst = el.dataset.id; UI.renderTab(); break;
      case 'grade-speed': UI.gradeSpeed = el.dataset.id; UI.renderTab(); break;
      case 'grade-pick': {
        const id = el.dataset.id;
        const i = UI.gradeSelection.indexOf(id);
        if (i >= 0) UI.gradeSelection.splice(i, 1);
        else if (UI.gradeSelection.length < 10) UI.gradeSelection.push(id);
        UI.renderTab();
        break;
      }
      case 'grade-clear': UI.gradeSelection = []; UI.renderTab(); break;
      case 'grade-submit': {
        const r = CS.Cards.sendToGrading(G, UI.gradeSelection, UI.gradeInst, UI.gradeSpeed);
        if (r.ok) {
          UI.toast('已送评 ' + r.order.cardIds.length + ' 张，费用 ' + money(r.cost.total) + '，' + r.cost.days + ' 个经营日后返回', 'card');
          UI.gradeSelection = [];
        } else UI.toast(r.reason, 'warn');
        UI.renderTab();
        UI.updateHUD();
        break;
      }
      case 'card-filter': UI.cardFilter = el.dataset.id; UI.renderTab(); break;
      case 'card-ip': UI.cardIp = el.dataset.id; UI.renderTab(); break;
      case 'card-detail': UI.cardDetail(el.dataset.id); break;
      case 'codex-ip': UI.codexIp = el.dataset.id; UI.codexPage = 0; UI.renderTab(); break;
      case 'codex-tier': UI.codexTier = el.dataset.id; UI.codexPage = 0; UI.renderTab(); break;
      case 'codex-only': UI.codexOnly = el.dataset.id; UI.codexPage = 0; UI.renderTab(); break;
      case 'codex-page': UI.codexPage = Math.max(0, Number(el.dataset.id) || 0); UI.renderTab(); break;
      case 'codex-detail': UI.codexDetail(el.dataset.id); break;
      case 'npc-focus': {
        const npc = G.npcs.find(n => n.id === el.dataset.id);
        if (!npc) { UI.toast('该顾客已经离店', 'warn'); break; }
        CS.Render.focusNpcId = npc.id;
        CS.Render.focusUntil = Date.now() + 9000;
        UI.closeTablet();
        UI.toast('已在场景中标记 ' + npc.name + '（高亮 9 秒）', 'info');
        break;
      }
      case 'place-facility': {
        UI.startBuild(el.dataset.id);
        break;
      }
      case 'move-facility': {
        UI.startMove(el.dataset.id);
        break;
      }
      case 'repair': {
        const r = CS.Game.repairFacility(G, el.dataset.id);
        UI.toast(r.ok ? '维修完成，花费 ' + money(r.cost) : r.reason, r.ok ? 'info' : 'warn');
        UI.renderTab();
        UI.updateHUD();
        break;
      }
      case 'recycle': {
        const r = CS.Game.removeFacility(G, el.dataset.id);
        UI.toast(r.ok ? '设施已回收' : r.reason, r.ok ? 'info' : 'warn');
        UI.renderTab();
        break;
      }
      case 'expand-mode':
        UI.closeTablet();
        UI.startExpand();
        break;
      case 'save': {
        const ok = CS.Save.writeLocal(G);
        G.saveMeta = G.saveMeta || { autoSaves: 0, manualSaves: 0 };
        if (ok) G.saveMeta.manualSaves = (G.saveMeta.manualSaves || 0) + 1;
        UI.toast(ok ? '已保存到浏览器' : '保存失败：浏览器存储不可用', ok ? 'level' : 'warn');
        break;
      }
      case 'export': UI.exportSave(); break;
      case 'import': UI.importSave(); break;
      case 'newgame': UI.confirmNewGame(); break;
      case 'toggle-selfcheckout':
        G.options.selfCheckout = !G.options.selfCheckout;
        UI.renderTab();
        break;
      case 'toggle-autosave':
        G.options.autoSave = !G.options.autoSave;
        if (G.options.autoSave) CS.Save.auto(G, 'settings');
        UI.toast(G.options.autoSave ? '自动存档已开启' : '自动存档已关闭', G.options.autoSave ? 'info' : 'warn');
        UI.renderTab();
        break;
      case 'autosave-interval':
        G.options.autoSaveIntervalSec = Number(el.value) || C.autosave.intervalSec;
        CS.Save.auto(G, 'settings');
        UI.toast('自动存档间隔：每 ' + G.options.autoSaveIntervalSec + ' 秒');
        break;
      case 'toggle-npcbubbles':
        G.options.showNpcBubbles = !G.options.showNpcBubbles;
        UI.renderTab();
        break;
      case 'dev-money': G.money += 10000; UI.toast('已加 ¥10,000（演示工具）'); UI.updateHUD(); break;
      case 'dev-xp': {
        const ups = CS.Progression.addXp(G, 1000);
        UI.toast('已加 1000 经验' + (ups.length ? '，升级到 ' + ups.join('、') : ''));
        UI.updateHUD();
        break;
      }
      case 'dev-level': {
        G.progression.level += 1;
        G.progression.expansionCredits += 2;
        UI.toast('等级 +1（演示工具），获得 2 格扩建额度');
        UI.updateHUD();
        break;
      }
      case 'dev-close': {
        if (G.clock.state === 'OPEN_DAY') {
          CS.Game.fastForwardToClose(G);
          UI.updateHUD();
        } else UI.toast('当前不在营业中', 'warn');
        break;
      }
      case 'dev-settle': {
        if (G.clock.state === 'NIGHT_DECISION') CS.Game.chooseNight(G, false);
        else UI.toast('请先到达 21:00 夜间决策', 'warn');
        break;
      }
      default: break;
    }
    /* 任务选择器 */
    if (act.startsWith('task-')) {
      const field = act.slice(5);
      const id = el.dataset.id;
      const emp = G.employees.find(e => e.id === id);
      if (emp) {
        emp[field] = el.value;
        if (field === 'main') { emp.state = 'idle'; emp.path = []; CS.World.releaseClaims(G, emp); }
        UI.toast(emp.name + ' 的' + (field === 'main' ? '主要任务' : field === 'sec1' ? '次级任务 1' : '次级任务 2') + '已设为 ' + taskName(el.value));
      }
    }
  }

  function handleInput(kind, el) {
    const G = UI.G;
    if (kind === 'cart') {
      const v = Math.max(0, Math.min(999, Number(el.value) || 0));
      UI.cart[el.dataset.sku] = v;
      /* 就地更新合计，不重绘输入框 */
      const sup = UI.shopSupplier;
      const items = C.products.filter(p => p.supplier === sup).map(p => ({ sku: p.sku, qty: UI.cart[p.sku] || 0 }));
      const q = CS.Market.orderQuote(G, sup, items);
      const box = document.querySelector('#tablet-body .panel .row b.mono');
      if (box) box.textContent = money(q.total);
      const desc = document.querySelector('#tablet-body .panel .row .small.muted');
      if (desc) desc.textContent = '货款 ' + money(q.goods) + ' + 运费 ' + money(q.freight) + ' · 共 ' + q.units + ' 件 · 资金 ' + money(G.money);
    }
    if (kind === 'price') {
      const sku = el.dataset.sku;
      CS.Game.setPrice(G, sku, Number(el.value) || 1);
      UI.updateHUD();
    }
  }

  UI.handleAction = handleAction;
  function taskName(id) { const t = C.staffTasks.find(x => x.id === id); return t ? t.name : id; }

  /* ------------------------------ 建造 / 扩建 ------------------------------ */
  UI.fillBuildBar = function () {
    const G = UI.G;
    const el = $('#buildbar');
    const controls = '<button class="bb-cancel" data-cancel="1">退出</button>' +
      '<button class="bb-cancel" data-move="1" style="background:rgba(110,224,160,.15);color:var(--green)">挪动设施</button>' +
      '<button class="bb-cancel" data-expand="1" style="background:rgba(245,185,66,.15);color:var(--amber)">扩建（' + G.progression.expansionCredits + '）</button>';
    el.innerHTML = controls + C.facilities.map(def => {
      const locked = G.progression.level < def.unlockLevel;
      const fb = A.bind('facilities.' + def.id);
      return '<button class="bb-item ' + (locked ? 'locked' : '') + '" data-fac="' + def.id + '" ' + (locked ? 'disabled' : '') + '>' +
        (fb ? A.img(fb.sprite, 'bb-icon') : '') +
        '<b>' + esc(def.name) + '</b><span>' + money(def.price) + ' · ' + def.w + '×' + def.h + (locked ? ' · ' + def.unlockLevel + '级' : '') + '</span></button>';
    }).join('');
    el.querySelectorAll('[data-fac]').forEach(b => b.addEventListener('click', () => UI.startBuild(b.dataset.fac)));
    el.querySelector('[data-cancel]').addEventListener('click', () => UI.stopBuildMode());
    el.querySelector('[data-move]').addEventListener('click', () => UI.startMovePick());
    el.querySelector('[data-expand]').addEventListener('click', () => UI.startExpand());
  };

  UI.toggleBuildBar = function () {
    const el = $('#buildbar');
    if (!el.classList.contains('hidden')) { UI.stopBuildMode(); return; }
    UI.fillBuildBar();
    el.classList.remove('hidden');
  };

  UI.startBuild = function (typeId) {
    UI.closeTablet();
    UI.mode = 'build';
    UI.buildType = typeId;
    UI.moveFacilityId = null;
    CS.Render.mode = 'build';
    CS.Render.expandMode = false;
    UI.fillBuildBar();
    UI.toast('放置模式：移动鼠标到可用格子，点击放置；右键或 ESC 取消');
    $('#buildbar').classList.remove('hidden');
  };

  UI.startExpand = function () {
    UI.mode = 'expand';
    CS.Render.mode = 'build';
    CS.Render.expandMode = true;
    UI.buildType = null;
    UI.moveFacilityId = null;
    UI.fillBuildBar();
    $('#buildbar').classList.remove('hidden');
    UI.toast('扩建模式：点击与现有地板相邻的高亮格子（剩余 ' + UI.G.progression.expansionCredits + ' 格）');
  };

  UI.startMovePick = function () {
    UI.mode = 'movePick';
    UI.buildType = null;
    UI.moveFacilityId = null;
    CS.Render.mode = 'movePick';
    CS.Render.expandMode = false;
    CS.Render.ghost = null;
    CS.Render.hoverFacilityId = null;
    CS.Render.moveFacilityId = null;
    UI.fillBuildBar();
    $('#buildbar').classList.remove('hidden');
    UI.toast('挪动模式：点击要挪动的设施（右键或 ESC 取消）');
  };

  UI.startMove = function (facilityId) {
    const G = UI.G;
    const f = G && G.facilities.find(x => x.id === facilityId);
    if (!f) { UI.toast('设施不存在', 'warn'); return; }
    UI.closeTablet();
    UI.mode = 'move';
    UI.buildType = null;
    UI.moveFacilityId = facilityId;
    CS.Render.mode = 'move';
    CS.Render.expandMode = false;
    CS.Render.ghost = null;
    CS.Render.hoverFacilityId = facilityId;
    CS.Render.moveFacilityId = facilityId;
    UI.fillBuildBar();
    $('#buildbar').classList.remove('hidden');
    UI.toast('正在挪动 ' + I.facilities[f.typeId].name + '：点击目标位置确认，右键或 ESC 取消');
  };

  UI.stopBuildMode = function () {
    UI.mode = 'play';
    UI.buildType = null;
    UI.moveFacilityId = null;
    CS.Render.mode = 'play';
    CS.Render.expandMode = false;
    CS.Render.ghost = null;
    CS.Render.hoverFacilityId = null;
    CS.Render.moveFacilityId = null;
    $('#buildbar').classList.add('hidden');
  };

  UI.canvasClick = function (worldX, worldY, button) {
    const G = UI.G;
    if (UI.mode === 'build' && UI.buildType) {
      const def = I.facilities[UI.buildType];
      const x = Math.floor(worldX - (def.w - 1) / 2);
      const y = Math.floor(worldY - (def.h - 1) / 2);
      if (button === 2) { UI.stopBuildMode(); return; }
      const r = CS.Game.buyFacility(G, UI.buildType, x, y);
      if (r.ok) {
        UI.toast('已购买并放置 ' + def.name + '（-' + money(def.price) + '）');
        UI.updateHUD();
        UI.renderTabIfOpen();
        if (G.money < def.price) UI.stopBuildMode();
      } else {
        UI.toast(r.reason, 'warn');
      }
      return;
    }
    if (UI.mode === 'move' && UI.moveFacilityId) {
      if (button === 2) { UI.stopBuildMode(); return; }
      const f = G.facilities.find(v => v.id === UI.moveFacilityId);
      if (!f) { UI.stopBuildMode(); return; }
      const def = I.facilities[f.typeId];
      const x = Math.floor(worldX - (def.w - 1) / 2);
      const y = Math.floor(worldY - (def.h - 1) / 2);
      const r = CS.Game.moveFacility(G, f.id, x, y);
      if (r.ok) {
        UI.toast(def.name + ' 已挪到 (' + r.to.x + ',' + r.to.y + ')');
        UI.updateHUD();
        UI.renderTabIfOpen();
        UI.stopBuildMode();
      } else {
        UI.toast(r.reason, 'warn');
      }
      return;
    }
    if (UI.mode === 'movePick') {
      if (button === 2) { UI.stopBuildMode(); return; }
      const f = CS.Grid.facilityAt(G, Math.floor(worldX), Math.floor(worldY));
      if (f) UI.startMove(f.id);
      else UI.toast('这里没有可挪动的设施', 'warn');
      return;
    }
    if (UI.mode === 'expand') {
      const x = Math.floor(worldX), y = Math.floor(worldY);
      const r = CS.Game.expandCell(G, x, y);
      if (r.ok) {
        UI.toast('已扩建 (' + x + ',' + y + ')，剩余额度 ' + G.progression.expansionCredits);
        UI.updateHUD();
        if (G.progression.expansionCredits <= 0) UI.stopBuildMode();
      } else {
        UI.toast(r.reason, 'warn');
      }
    }
  };

  UI.canvasMove = function (worldX, worldY) {
    if (UI.mode === 'move' && UI.moveFacilityId) {
      const G = UI.G;
      const f = G.facilities.find(v => v.id === UI.moveFacilityId);
      if (!f) { CS.Render.ghost = null; return; }
      const def = I.facilities[f.typeId];
      const x = Math.floor(worldX - (def.w - 1) / 2);
      const y = Math.floor(worldY - (def.h - 1) / 2);
      const check = CS.Game.canMoveFacility(G, f.id, x, y);
      CS.Render.ghost = { typeId: f.typeId, x, y, valid: check.ok, facilityId: f.id };
      CS.Render.hoverFacilityId = f.id;
      return;
    }
    if (UI.mode === 'movePick') {
      const G = UI.G;
      const f = CS.Grid.facilityAt(G, Math.floor(worldX), Math.floor(worldY));
      CS.Render.hoverFacilityId = f ? f.id : null;
      CS.Render.ghost = null;
      return;
    }
    if (UI.mode !== 'build') { CS.Render.ghost = null; CS.Render.hoverFacilityId = null; return; }
    CS.Render.hoverFacilityId = null;
    if (UI.mode === 'build' && UI.buildType) {
      const def = I.facilities[UI.buildType];
      const x = Math.floor(worldX - (def.w - 1) / 2);
      const y = Math.floor(worldY - (def.h - 1) / 2);
      const check = CS.Game.canPlace(UI.G, UI.buildType, x, y);
      CS.Render.ghost = { typeId: UI.buildType, x, y, valid: check.ok };
    } else if (UI.mode === 'expand') {
      CS.Render.ghost = null;
    }
  };

  UI.renderTabIfOpen = function () { if (UI.tabletOpen) UI.renderTab(); };

  /* ------------------------------ 弹窗 ------------------------------ */
  UI.modal = function (html, opts) {
    opts = opts || {};
    const root = $('#modal-root');
    root.innerHTML = '<div class="modal-back"><div class="modal ' + (opts.cls || '') + '">' + html + '</div></div>';
    UI.modalOpen = true;
    if (opts.onClose) {
      root.querySelector('.modal-back').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-back')) { UI.closeModal(); opts.onClose(); }
      });
    }
    return root.querySelector('.modal');
  };
  UI.closeModal = function () {
    if (UI._talkingNpc) {
      UI._talkingNpc.talking = false;
      UI._talkingNpc = null;
    }
    $('#modal-root').innerHTML = '';
    UI.modalOpen = false;
    UI._pauseResume = null;
  };

  /* 开始界面 */
  UI.showStartScreen = function (hasSave, onStart, onContinue) {
    UI.difficulty = 'normal';
    const modal = UI.modal(
      '<div class="modal-head"><h2>卡牌店模拟经营 · 浏览器 Demo</h2></div>' +
      '<div class="modal-body">' +
      '<div class="start-hero">' +
      (A.bind('promo.keyart') ? '<img src="' + A.url(A.bind('promo.keyart')) + '" alt="">' : '') +
      '<div class="t"><b>把一间小店，做成城市里的卡牌地标</b><span>采购开盒 · 定价上架 · 评级收藏 · 赛事活动。' +
      '当前版本已接入原创美术素材包：店铺设施、角色、卡面与平板图标全部来自本地生成资源。</span></div></div>' +
      '<div class="field"><label>店铺名称</label><input type="text" id="start-shopname" maxlength="12" value="星光卡牌屋"></div>' +
      '<div class="field"><label>难度（存档创建后固定）</label><div class="diff-cards" id="diff-cards">' +
      Object.values(C.difficulty).map(d => '<div class="diff-card ' + (d.id === 'normal' ? 'on' : '') + '" data-diff="' + d.id + '"><b>' + d.name + '</b><span>' + esc(d.desc) + '</span></div>').join('') +
      '</div></div>' +
      '<div class="small muted" style="line-height:1.8">初始资金按难度设定（标准 4,000 元）。开局拥有 8×8＝64 格地板、1 个普通货架、1 台 2×2 收银台，快递站位于店外人行道。<br>' +
      'WASD 移动 · E 交互 · TAB 平板 · B 设施 · 滚轮/+- 缩放 · 0 复位视角 · ESC 暂停。自动存档每 15 秒一次，关键操作后立即保存。</div>' +
      '</div>' +
      '<div class="modal-foot">' +
      (hasSave ? '<button class="btn ghost" id="start-continue">继续上次存档</button>' : '') +
      (hasSave ? '<button class="btn danger" id="start-reset">清空存档</button>' : '') +
      '<button class="btn primary" id="start-go">开店营业</button></div>',
      { cls: 'start-screen' }
    );
    modal.querySelectorAll('[data-diff]').forEach(el => el.addEventListener('click', () => {
      UI.difficulty = el.dataset.diff;
      modal.querySelectorAll('[data-diff]').forEach(x => x.classList.toggle('on', x === el));
    }));
    modal.querySelector('#start-go').addEventListener('click', () => {
      const name = (modal.querySelector('#start-shopname').value || '无名卡牌店').trim();
      UI.closeModal();
      onStart({ shopName: name, difficulty: UI.difficulty });
    });
    if (hasSave) modal.querySelector('#start-continue').addEventListener('click', () => { UI.closeModal(); onContinue(); });
    if (hasSave) modal.querySelector('#start-reset').addEventListener('click', () => {
      if (!confirm('确定清空本地存档并重新开始？建议先导出备份。')) return;
      CS.Save.clearLocal();
      location.reload();
    });
  };

  UI.confirmNewGame = function () {
    const modal = UI.modal(
      '<div class="modal-head"><h2>重新开档</h2></div>' +
      '<div class="modal-body small">当前存档会被覆盖（浏览器本地存档）。建议先导出备份。</div>' +
      '<div class="modal-foot"><button class="btn ghost" id="ng-cancel">取消</button><button class="btn primary" id="ng-ok">重新开始</button></div>'
    );
    modal.querySelector('#ng-cancel').addEventListener('click', () => UI.closeModal());
    modal.querySelector('#ng-ok').addEventListener('click', () => {
      CS.Save.clearLocal();
      location.reload();
    });
  };

  /* 21:00 夜间决策 */
  UI.nightDecision = function () {
    const G = UI.G;
    const t = CS.Ledger.today(G);
    const modal = UI.modal(
      '<div class="modal-head"><h2>21:00 · 是否继续夜间营业？</h2></div>' +
      '<div class="modal-body">' +
      '<div class="report-row"><span>今日销售额</span><b>' + money(t.revenue + t.cardRevenue + t.gameRevenue) + '</b></div>' +
      '<div class="report-row"><span>今日支出（采购/运费）</span><b class="neg">-' + money(t.purchase + t.freight) + '</b></div>' +
      '<div class="report-row"><span>接待顾客</span><b>' + G.today.served + ' / ' + G.today.customers + '</b></div>' +
      '<div class="small muted" style="margin-top:10px">夜营期间参与工作的正式员工工资翻倍，设备损耗增加；也可以直接结束营业进入次日结算。</div>' +
      '</div>' +
      '<div class="modal-foot"><button class="btn" id="night-no">结束营业 → 次日 07:00</button><button class="btn primary" id="night-yes">继续夜营</button></div>'
    );
    modal.querySelector('#night-yes').addEventListener('click', () => { UI.closeModal(); CS.Game.chooseNight(G, true); UI.updateHUD(); });
    modal.querySelector('#night-no').addEventListener('click', () => { UI.closeModal(); CS.Game.chooseNight(G, false); UI.updateHUD(); });
  };

  /* 日报 */
  UI.showReport = function (r) {
    const G = UI.G;
    const modal = UI.modal(
      '<div class="modal-head"><h2>第 ' + r.day + ' 天 · 经营日报</h2><span class="tag ' + (r.net >= 0 ? 'green' : 'red') + '">净利 ' + money(r.net) + '</span></div>' +
      '<div class="modal-body">' +
      '<div class="grid2"><div>' +
      '<div class="report-row"><span>销售收入</span><b>' + money(r.revenue + r.cardRevenue) + '</b></div>' +
      (r.gameRevenue ? '<div class="report-row"><span>游戏台桌</span><b>' + money(r.gameRevenue) + '</b></div>' : '') +
      '<div class="report-row"><span>采购成本</span><b class="neg">-' + money(r.purchase) + '</b></div>' +
      '<div class="report-row"><span>运费</span><b class="neg">-' + money(r.freight) + '</b></div>' +
      '<div class="report-row"><span>租金 + 基础电费</span><b class="neg">-' + money(r.rent + r.power) + '</b></div>' +
      '<div class="report-row"><span>工资' + (r.night ? '（夜班 ×2）' : '') + '</span><b class="neg">-' + money(r.wage) + '</b></div>' +
      (r.loanInterest ? '<div class="report-row"><span>贷款利息</span><b class="neg">-' + money(r.loanInterest) + '</b></div>' : '') +
      '<div class="report-row total"><span>净利润</span><b class="' + (r.net >= 0 ? 'pos' : 'neg') + '">' + money(r.net) + '</b></div>' +
      '</div><div>' +
      '<div class="report-row"><span>到店顾客</span><b>' + r.customers + '</b></div>' +
      '<div class="report-row"><span>完成结账</span><b>' + r.served + '</b></div>' +
      '<div class="report-row"><span>售出商品</span><b>' + r.itemsSold + ' 件</b></div>' +
      '<div class="report-row"><span>获得经验</span><b>' + Math.round(r.xpGained) + ' XP</b></div>' +
      '<div class="report-row"><span>店铺评分</span><b>' + r.rating.toFixed(1) + '</b></div>' +
      '<div class="report-row"><span>知名度</span><b>' + Math.round(r.fame) + '</b></div>' +
      (r.arrears ? '<div class="report-row"><span>工资欠款</span><b class="neg">' + money(r.arrears) + '</b></div>' : '') +
      '</div></div>' +
      (r.news && r.news.length ? '<div class="panel" style="margin-top:14px"><h3 class="sec">厂商联动 · LINK</h3><div class="small" style="line-height:1.9">' +
        r.news.map(n => '<div><span class="tag" style="color:' + (n.color || '#f5b942') + '">' + esc(n.tag || '动态') + '</span> ' +
          esc(n.supplierName) + '：' + esc(n.text) + '</div>').join('') + '</div></div>' : '') +
      '<div class="panel" style="margin-top:14px"><h3 class="sec">市场变化</h3><div class="small mono" style="line-height:1.9">' +
      r.market.filter(x => Math.abs(x.r) > 0.001).slice(0, 6).map(x => {
        const p = I.products[x.sku];
        return p.name + '：' + money(x.before) + ' → ' + money(x.after) + '（' + pct(x.r) + '，M=' + x.M + '）';
      }).join('<br>') + '</div></div>' +
      '</div>' +
      '<div class="modal-foot"><button class="btn primary" id="rep-ok">进入第 ' + (r.day + 1) + ' 天</button></div>'
    );
    modal.querySelector('#rep-ok').addEventListener('click', () => { UI.closeModal(); UI.updateHUD(); });
  };

  /* 暂停菜单 */
  UI.openPause = function () {
    const G = UI.G;
    if (!G) return;
    const wasPaused = G.clock.paused;
    G.clock.paused = true;
    UI.modal(
      '<div class="modal-head"><h2>已暂停</h2></div>' +
      '<div class="modal-body small muted">ESC 冻结整个模拟：时间、NPC、员工、市场与订单。<br>打开平板不会暂停游戏。</div>' +
      '<div class="modal-foot">' +
      '<button class="btn ghost" id="pause-save">保存</button>' +
      '<button class="btn ghost" id="pause-exit">返回标题</button>' +
      '<button class="btn primary" id="pause-resume">继续游戏</button></div>'
    );
    const resume = () => {
      UI.closeModal();
      G.clock.paused = wasPaused;
    };
    /* 注意：.modal-back 是 .modal 的父节点，必须从 #modal-root 取，不能在 modal 内 query */
    const back = $('#modal-root .modal-back');
    const bind = (sel, fn) => { const el = document.querySelector(sel); if (el) el.addEventListener('click', fn); };
    bind('#pause-resume', resume);
    bind('#pause-save', () => { CS.Save.writeLocal(G); UI.toast('已保存'); });
    bind('#pause-exit', () => { CS.Save.writeLocal(G); location.reload(); });
    if (back) back.addEventListener('click', (e) => { if (e.target === back) resume(); });
    UI._pauseResume = resume;
  };

  /* ------------------------------ NPC 交谈 / 游戏桌 ------------------------------ */
  UI.showNpcDialog = function (npc) {
    const G = UI.G;
    if (!npc) return;
    if (UI._talkingNpc && UI._talkingNpc !== npc) UI._talkingNpc.talking = false;
    UI._talkingNpc = npc;
    npc.talking = true;
    const cfg = C.npcInteract || {};
    const opts = CS.World.pitchOptions(G, npc);
    const offer = npc.offer;
    const rem = Math.max(0, npc.budget - npc.spent);
    const mood = npc.mood >= 3 ? '心情不错' : npc.mood <= -1 ? '有点不耐烦' : '平静';
    const stateName = npc.state === 'PLAYING' ? '正在游戏桌对局' : npc.state === 'PITCH' ? '有卡想出手' : '正在逛店';

    const wantRows = opts.wants.length ? opts.wants.map(w =>
      '<tr><td><b>' + esc(w.name) + '</b></td>' +
      '<td class="num">' + money(w.price) + '</td>' +
      '<td class="num">' + (w.stock > 0 ? w.stock + ' 件' : '<span class="tag red">缺货</span>') + '</td>' +
      '<td><button class="btn sm primary" data-act="npc-pitch" data-sku="' + w.sku + '" ' +
      (w.stock > 0 && w.affordable ? '' : 'disabled') + '>推荐</button></td></tr>').join('')
      : '<tr><td colspan="4" class="small muted">TA 已经挑好了想要的商品。</td></tr>';

    const extraBtns = opts.extras.length ? opts.extras.map(x =>
      '<button class="btn sm" data-act="npc-pitch" data-sku="' + x.sku + '" ' +
      (x.stock > 0 && x.affordable ? '' : 'disabled') + '>' + esc(x.name) + ' · ' + money(x.price) +
      (x.pref ? ' <span class="tag amber">偏好</span>' : '') + '</button>').join('')
      : '<span class="small muted">货架没有可额外推荐的商品。</span>';

    const offerHtml = offer ? (
      '<div class="panel" style="margin-top:12px;border-color:rgba(245,185,66,.45)">' +
      '<div class="between"><b>TA 想向你推销一张卡</b><span class="tag amber">' + esc(offer.tier) + '</span></div>' +
      '<div class="row" style="align-items:flex-start;gap:12px;margin-top:10px">' +
      cardImg({ defId: offer.defId, img: offer.img, tier: offer.tier }, C.rarity.colors[offer.tier] || '#888', 'width:86px;border-radius:8px') +
      '<div style="flex:1"><b>' + esc(offer.name) + '</b>' +
      '<div class="small muted">估值 ' + money(offer.value) + ' · 报价 <b class="pos">' + money(offer.ask) + '</b></div>' +
      '<div class="row" style="margin-top:8px"><button class="btn sm primary" data-act="npc-buy-offer" ' +
      (G.money >= offer.ask ? '' : 'disabled') + '>收下（-' + money(offer.ask) + '）</button>' +
      '<button class="btn sm ghost" data-act="npc-decline-offer">婉拒</button></div></div></div></div>'
    ) : '';

    const modal = UI.modal(
      '<div class="modal-head"><h2>' + esc(npc.name) + ' · ' + esc(npc.typeName) + '</h2>' +
      '<button class="modal-x" id="npc-close">×</button></div>' +
      '<div class="modal-body">' +
      '<div class="kpi">' + kpi('心情', mood) + kpi('状态', stateName) + kpi('剩余预算', money(rem)) + kpi('购物篮', npc.basket.length + ' 件') + '</div>' +
      offerHtml +
      '<div class="panel" style="margin-top:12px"><h3 class="sec">TA 的购物清单</h3>' +
      '<table class="tbl"><thead><tr><th>商品</th><th class="num">售价</th><th class="num">库存</th><th></th></tr></thead><tbody>' + wantRows + '</tbody></table>' +
      '<div class="small muted" style="margin-top:8px">主动推荐成功会直接把商品放进购物篮，顾客随后去收银台结账；失败会降低心情。</div></div>' +
      '<div class="panel" style="margin-top:12px"><h3 class="sec">推荐搭配（提高客单价）</h3>' +
      '<div class="chip-row">' + extraBtns + '</div></div>' +
      '<div class="between" style="margin-top:12px">' +
      '<div class="small muted">' + (npc.talked ? '已经聊过了' : '聊两句可以改善心情，并了解顾客偏好') + '</div>' +
      '<button class="btn" data-act="npc-chat" ' + (npc.talked ? 'disabled' : '') + '>聊两句（+' + (cfg.chatXp || 2) + ' XP）</button></div>' +
      '</div>' +
      '<div class="modal-foot"><button class="btn primary" id="npc-close2">结束交谈</button></div>'
    );

    const rerender = () => { UI.closeModal(); UI.showNpcDialog(npc); };
    modal.querySelector('#npc-close').addEventListener('click', () => UI.closeModal());
    modal.querySelector('#npc-close2').addEventListener('click', () => UI.closeModal());
    modal.querySelectorAll('[data-act="npc-pitch"]').forEach(b => b.addEventListener('click', () => {
      const r = CS.World.pitchProduct(G, npc, b.dataset.sku);
      UI.toast(r.ok ? '推销成功：' + r.item + ' 已加入购物篮（' + money(r.price) + '）' : r.reason, r.ok ? 'info' : 'warn');
      UI.updateHUD();
      rerender();
    }));
    modal.querySelectorAll('[data-act="npc-buy-offer"]').forEach(b => b.addEventListener('click', () => {
      const r = CS.World.acceptNpcOffer(G, npc);
      UI.toast(r.ok ? '已收下 ' + r.card.name + '（-' + money(r.price) + '），进入卡册' : r.reason, r.ok ? 'card' : 'warn');
      if (r.ok) {
        const p = UI.G.player;
        if (CS.Render.pushFx) CS.Render.pushFx(p.x, p.y - 0.7, A.bind('fx.rare'), 0.9, { rise: 0.3 });
      }
      UI.updateHUD();
      rerender();
    }));
    modal.querySelectorAll('[data-act="npc-decline-offer"]').forEach(b => b.addEventListener('click', () => {
      CS.World.declineNpcOffer(G, npc);
      UI.toast('你婉拒了这张卡', 'warn');
      rerender();
    }));
    modal.querySelectorAll('[data-act="npc-chat"]').forEach(b => b.addEventListener('click', () => {
      const r = CS.World.chatWithNpc(G, npc);
      if (r.ok) { UI.toast(r.line, 'info'); UI.updateHUD(); rerender(); }
      else UI.toast(r.reason, 'warn');
    }));
  };

  /* ------------------------------ 员工交谈 ------------------------------ */
  UI.showEmployeeDialog = function (emp) {
    const G = UI.G;
    if (!emp) return;
    const si = C.staffInteract;
    const mood = CS.World.employeeMoodLabel(emp);
    const perf = CS.World.employeePerf(emp);
    const morale = Math.round(emp.morale == null ? si.moraleStart : emp.morale);
    const task = (C.staffTasks.find(t => t.id === emp.main) || {}).name || '自由活动';
    const talked = emp.talkedDay === G.clock.day;
    const bonused = emp.bonusDay === G.clock.day;
    const praised = emp.praiseDay === G.clock.day;
    const taskOpts = C.staffTasks.map(t =>
      '<option value="' + t.id + '" ' + (t.id === emp.main ? 'selected' : '') + '>' + t.name + ' · ' + t.desc + '</option>').join('');

    const modal = UI.modal(
      '<div class="modal-head"><h2>' + esc(emp.name) + ' · Lv.' + emp.level + ' 员工</h2><button class="modal-x" id="emp-close">×</button></div>' +
      '<div class="modal-body">' +
      '<div class="kpi">' + kpi('士气', morale + ' · ' + mood.text) + kpi('关系', String(emp.relation || 0)) +
      kpi('当前效率', (perf * 100).toFixed(0) + '%') + kpi('日薪', money(emp.wage)) + '</div>' +
      '<div class="panel" style="margin-top:12px;padding:12px">' +
      '<div class="between"><span class="small muted">士气</span><b class="mono" style="color:' + mood.color + '">' + morale + ' / ' + (si.moraleMax || 100) + '</b></div>' +
      '<div class="bar" style="margin-top:6px"><i style="width:' + U.clamp(morale, 0, 100) + '%;background:' + mood.color + '"></i></div>' +
      '<div class="small muted" style="margin-top:8px">士气影响实际效率（' + Math.round((si.moraleEffMin || 0.82) * 100) + '% ~ ' + Math.round((si.moraleEffMax || 1.14) * 100) + '%）。每天出勤会自然下降，聊两句、发奖金或安排休息可以恢复。</div>' +
      '</div>' +
      '<div class="panel" style="margin-top:12px"><h3 class="sec">互动</h3>' +
      '<div class="row" style="flex-wrap:wrap">' +
      '<button class="btn" data-emp="chat" ' + (talked ? 'disabled' : '') + '>聊两句（士气 +' + (si.chatMorale || 9) + '）' + (talked ? ' · 今日已聊' : '') + '</button>' +
      '<button class="btn" data-emp="bonus" ' + (bonused || G.money < (si.bonusCost || 80) ? 'disabled' : '') + '>发奖金 ' + money(si.bonusCost || 80) + '（士气 +' + (si.bonusMorale || 20) + '）' + (bonused ? ' · 今日已发' : '') + '</button>' +
      '<button class="btn ghost" data-emp="praise" ' + (praised ? 'disabled' : '') + '>肯定工作（士气 +' + (si.praiseMorale || 4) + '）' + (praised ? ' · 今日已做' : '') + '</button>' +
      '</div>' +
      '<div class="small muted" style="margin-top:8px">' + esc(CS.World.employeeLine(G, emp)) + '</div>' +
      '</div>' +
      '<div class="panel" style="margin-top:12px"><h3 class="sec">工作安排</h3>' +
      '<div class="row"><span class="small muted" style="width:64px">主要任务</span>' +
      '<select id="emp-task" style="flex:1">' + taskOpts + '</select>' +
      '<button class="btn sm primary" data-emp="set-task">应用</button></div>' +
      '<div class="between" style="margin-top:10px"><div class="small muted">当前：' + esc(task) + ' · ' + (emp.onDuty ? '出勤中' : '休息中') + '</div>' +
      '<button class="btn sm ' + (emp.onDuty ? 'danger' : '') + '" data-emp="duty">' + (emp.onDuty ? '安排休息' : '恢复出勤') + '</button></div>' +
      '<div class="small muted" style="margin-top:8px">专精：补货 ' + (emp.spec.restock || 0) + ' · 收银 ' + (emp.spec.cashier || 0) + ' · 搬运 ' + (emp.spec.carry || 0) + '</div>' +
      '</div>' +
      '</div>' +
      '<div class="modal-foot"><button class="btn primary" id="emp-close2">结束交谈</button></div>'
    );

    const rerender = () => { UI.closeModal(); UI.showEmployeeDialog(emp); };
    modal.querySelector('#emp-close').addEventListener('click', () => UI.closeModal());
    modal.querySelector('#emp-close2').addEventListener('click', () => UI.closeModal());
    modal.querySelectorAll('[data-emp]').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.emp;
      if (act === 'chat') {
        const r = CS.World.employeeChat(G, emp);
        UI.toast(r.ok ? r.line + '（士气 ' + r.morale + '）' : r.reason, r.ok ? 'info' : 'warn');
      } else if (act === 'bonus') {
        const r = CS.World.employeeBonus(G, emp);
        UI.toast(r.ok ? '发了 ' + money(r.cost) + ' 奖金，' + emp.name + ' 士气 ' + r.morale : r.reason, r.ok ? 'level' : 'warn');
      } else if (act === 'praise') {
        const r = CS.World.praiseEmployee(G, emp);
        UI.toast(r.ok ? '你肯定了 ' + emp.name + ' 的工作（士气 ' + r.morale + '）' : r.reason, r.ok ? 'info' : 'warn');
      } else if (act === 'set-task') {
        const v = modal.querySelector('#emp-task').value;
        const r = CS.World.setEmployeeTask(G, emp, v);
        UI.toast(r.ok ? emp.name + ' 的主要任务改为「' + r.name + '」' : r.reason, r.ok ? 'info' : 'warn');
      } else if (act === 'duty') {
        const r = CS.World.toggleEmployeeDuty(G, emp);
        UI.toast(r.ok ? emp.name + (r.onDuty ? ' 恢复出勤' : ' 开始休息') : '操作失败', 'info');
      }
      UI.updateHUD();
      if (act === 'duty') { UI.closeModal(); UI.renderTabIfOpen(); }
      else rerender();
    }));
  };

  UI.showGameTable = function (f) {
    const G = UI.G;
    const def = I.facilities[f.typeId];
    W_ensureTable(f);
    const seats = f.seats || [];
    const rows = seats.map((s, i) => {
      const npc = s ? G.npcs.find(n => n.id === s.npcId) : null;
      return '<tr><td class="num">' + (i + 1) + '</td><td>' +
        (npc ? '<b>' + esc(npc.name) + '</b> <span class="small muted">' + esc(npc.typeName) + '</span>' : '<span class="small muted">空座</span>') +
        '</td><td class="num">' + (npc ? '对局中' : '—') + '</td></tr>';
    }).join('');
    const total = f.earned || 0;
    const modal = UI.modal(
      '<div class="modal-head"><h2>' + esc(def.name) + '</h2><button class="modal-x" id="gt-close">×</button></div>' +
      '<div class="modal-body">' +
      '<div class="kpi">' + kpi('座位', seats.filter(Boolean).length + ' / ' + (def.seats || 2)) +
      kpi('台费', money(def.fee || 0) + ' / 局') + kpi('单局时长', (def.sessionMinutes || 45) + ' 分钟') +
      kpi('累计台费', money(total)) + '</div>' +
      '<table class="tbl" style="margin-top:12px"><thead><tr><th class="num">座位</th><th>顾客</th><th class="num">状态</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="small muted" style="margin-top:10px">竞技玩家与学生最喜欢入座；台费在入座时立即入账，并计入“游戏台桌”收入。挪动或回收前需要等对局结束。</div>' +
      '</div>' +
      '<div class="modal-foot"><button class="btn primary" id="gt-close2">关闭</button></div>'
    );
    modal.querySelector('#gt-close').addEventListener('click', () => UI.closeModal());
    modal.querySelector('#gt-close2').addEventListener('click', () => UI.closeModal());
  };

  function W_ensureTable(f) {
    if (!CS.World.ensureTableState) return;
    CS.World.ensureTableState(f);
  }

  /* 设施详情（E 交互） */
  UI.showFacility = function (f) {
    const G = UI.G;
    const def = I.facilities[f.typeId];
    if (I.facilities[f.typeId].kind === 'cardtable') return UI.showCardTable(f);
    if (I.facilities[f.typeId].kind === 'gametable') return UI.showGameTable(f);
    const skus = Object.keys(f.stock).filter(k => f.stock[k] > 0);
    const rows = skus.map(sku => {
      const p = I.products[sku];
      const wh = G.inventory.warehouse[sku] || 0;
      return '<tr><td>' + esc(p.name) + '</td><td class="num">' + f.stock[sku] + '</td>' +
        '<td class="num">' + money(G.products[sku].price) + '</td>' +
        '<td class="num">' + (def.kind === 'warehouse' ? '' : (wh > 0 ? '<button class="btn sm" data-act="shelf-from-wh" data-fac="' + f.id + '" data-sku="' + sku + '">从仓库补 5</button>' : '<span class="small muted">仓库无货</span>')) + '</td></tr>';
    }).join('');
    const modal = UI.modal(
      '<div class="modal-head"><h2>' + def.name + '</h2><button class="modal-x" id="fx-close">×</button></div>' +
      '<div class="modal-body">' +
      '<div class="kpi">' + kpi('耐久', Math.round(f.durability) + '%') + kpi('商品种类', skus.length + ' / ' + (def.skuSlots || '—')) +
      kpi('商品总数', skus.reduce((a, k) => a + f.stock[k], 0)) +
      (def.kind === 'warehouse' ? kpi('仓库容量', CS.Inv.warehouseCapacity(G).kinds + ' 种') : '') + '</div>' +
      (skus.length ? '<table class="tbl" style="margin-top:12px"><thead><tr><th>商品</th><th class="num">数量</th><th class="num">售价</th><th class="num">操作</th></tr></thead><tbody>' + rows + '</tbody></table>'
        : '<div class="small muted" style="margin-top:12px">' + (def.kind === 'warehouse' ? '仓库是空的。' : '货架是空的。') + '</div>') +
      '<div class="small muted" style="margin-top:10px">' + esc(def.desc) + '</div>' +
      '</div>' +
      '<div class="modal-foot"><button class="btn primary" id="fx-close2">关闭</button></div>'
    );
    modal.querySelector('#fx-close').addEventListener('click', () => UI.closeModal());
    modal.querySelector('#fx-close2').addEventListener('click', () => UI.closeModal());
    modal.querySelectorAll('[data-act="shelf-from-wh"]').forEach(b => b.addEventListener('click', () => {
      const fac = G.facilities.find(x => x.id === b.dataset.fac);
      const n = CS.Inv.takeFromWarehouse(G, b.dataset.sku, 5);
      const add = CS.Inv.addToShelf(G, fac, b.dataset.sku, n);
      if (add < n) CS.Inv.addToWarehouse(G, b.dataset.sku, n - add);
      UI.closeModal();
      UI.showFacility(fac);
      UI.updateHUD();
    }));
  };

  /* 卡牌桌 */
  UI.showCardTable = function (f) {
    const G = UI.G;
    const listed = (f.cards || []).map(id => G.cards.find(c => c.id === id)).filter(Boolean);
    const rows = listed.map(c =>
      '<tr><td class="row">' + cardImg(c, null, 'width:34px;border-radius:4px') + ' <span>' + esc(c.name) + ' <span class="small muted">' + esc(c.tier) + '</span></span></td>' +
      '<td class="num">' + (c.grade ? c.grade + '级' : '未评级') + '</td>' +
      '<td class="num"><input type="number" id="ctp-' + c.id + '" value="' + c.price + '" style="width:80px"></td>' +
      '<td><button class="btn sm" data-act="ct-price" data-id="' + c.id + '">改价</button> ' +
      '<button class="btn sm danger" data-act="ct-unlist" data-id="' + c.id + '">下架</button></td></tr>').join('');
    const binder = G.cards.filter(c => c.location === 'binder').slice(0, 24);
    const modal = UI.modal(
      '<div class="modal-head"><h2>普通卡牌桌</h2><button class="modal-x" id="ct-close">×</button></div>' +
      '<div class="modal-body">' +
      '<div class="small muted">展示 ' + (f.cards ? f.cards.length : 0) + ' / 8 张。NPC 收藏家会以自己判断的价格购买，价格越高越容易流拍。</div>' +
      (listed.length ? '<table class="tbl" style="margin-top:10px"><thead><tr><th>卡牌</th><th class="num">评级</th><th class="num">售价</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' : '<div class="small muted" style="margin-top:10px">卡牌桌上是空的。</div>') +
      '<h3 class="sec" style="margin-top:16px">从卡册上架</h3>' +
      (binder.length ? '<div class="cardgrid">' + binder.map(c =>
        '<div class="carditem" data-act="ct-list" data-id="' + c.id + '">' + cardImg(c) + '<div class="cname">' + esc(c.name) + '</div><div class="ctier">' + money(CS.Cards.valueOf(c)) + '</div></div>'
      ).join('') + '</div>' : '<div class="small muted">卡册没有可上架的卡牌。</div>') +
      '</div>' +
      '<div class="modal-foot"><button class="btn primary" id="ct-close2">关闭</button></div>'
    );
    const close = () => UI.closeModal();
    modal.querySelector('#ct-close').addEventListener('click', close);
    modal.querySelector('#ct-close2').addEventListener('click', close);
    modal.querySelectorAll('[data-act="ct-list"]').forEach(b => b.addEventListener('click', () => {
      const card = G.cards.find(c => c.id === b.dataset.id);
      const suggested = Math.round(CS.Cards.valueOf(card) * 1.05);
      const r = CS.Cards.listOnTable(G, f.id, card.id, suggested);
      if (r.ok) UI.toast('已上架 ' + card.name + '，标价 ' + money(suggested));
      else UI.toast(r.reason, 'warn');
      close(); UI.showCardTable(f);
    }));
    modal.querySelectorAll('[data-act="ct-unlist"]').forEach(b => b.addEventListener('click', () => {
      CS.Cards.unlist(G, b.dataset.id);
      close(); UI.showCardTable(f);
    }));
    modal.querySelectorAll('[data-act="ct-price"]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.id;
      const v = Number(modal.querySelector('#ctp-' + id).value);
      CS.Cards.setPrice(G, id, v);
      UI.toast('已改价 ' + money(v));
      close(); UI.showCardTable(f);
    }));
  };

  /* 卡牌详情 */
  UI.cardDetail = function (id) {
    const G = UI.G;
    const c = G.cards.find(x => x.id === id);
    if (!c) return;
    const tables = CS.Inv.cardTables(G);
    const val = CS.Cards.valueOf(c);
    const modal = UI.modal(
      '<div class="modal-head"><h2>' + esc(c.name) + '</h2><button class="modal-x" id="cd-close">×</button></div>' +
      '<div class="modal-body"><div class="row" style="align-items:flex-start;gap:16px">' +
      cardImg(c, C.rarity.colors[c.tier] || '#888', 'width:180px;border-radius:10px') +
      '<div style="flex:1">' +
      '<div class="small muted">' + esc(c.series) + ' · ' + esc(c.nameEn || '') + '</div>' +
      '<div class="row" style="margin:10px 0"><span class="tag" style="color:' + (C.rarity.colors[c.tier] || '#aaa') + '">' + esc(C.rarity.names[c.tier] || c.tier) + '</span>' +
      (c.grade ? '<span class="tag amber">评级 ' + c.grade + ' 级</span>' : '<span class="tag">未评级</span>') + '</div>' +
      (ipMeta(c.ip) ? '<div class="report-row"><span>IP</span><b>IP' + ipMeta(c.ip).order + ' · ' + esc(ipMeta(c.ip).name) + '</b></div>' : '') +
      '<div class="report-row"><span>基础收藏价值</span><b>' + money(CS.Cards.valueBase(c.tier)) + '</b></div>' +
      '<div class="report-row"><span>当前估值</span><b>' + money(val) + '</b></div>' +
      '<div class="report-row"><span>位置</span><b>' + ({ binder: '卡册', table: '卡牌桌', grading: '评级中', sold: '已售出' }[c.location] || c.location) + '</b></div>' +
      (c.location === 'table' ? '<div class="row" style="margin-top:10px"><span class="small muted">售价</span><input type="number" id="cd-price" value="' + c.price + '" style="width:88px"><button class="btn sm" id="cd-setprice">改价</button><button class="btn sm danger" id="cd-unlist">下架</button></div>' : '') +
      (c.location === 'binder' && tables.length ? '<div class="row" style="margin-top:10px"><span class="small muted">上架价</span><input type="number" id="cd-listprice" value="' + Math.round(val * 1.1) + '" style="width:88px"><button class="btn sm primary" id="cd-list">放上卡牌桌</button></div>' : '') +
      '<div class="small muted" style="margin-top:12px">实例 ID：' + c.id + '</div>' +
      '</div></div></div>' +
      '<div class="modal-foot"><button class="btn" id="cd-close2">关闭</button></div>'
    );
    modal.querySelector('#cd-close').addEventListener('click', () => UI.closeModal());
    modal.querySelector('#cd-close2').addEventListener('click', () => UI.closeModal());
    const listBtn = modal.querySelector('#cd-list');
    if (listBtn) listBtn.addEventListener('click', () => {
      const price = Number(modal.querySelector('#cd-listprice').value);
      const table = tables[0];
      const r = CS.Cards.listOnTable(G, table.id, c.id, price);
      if (r.ok) { UI.toast('已上架 ' + c.name + '，标价 ' + money(price)); UI.closeModal(); UI.renderTabIfOpen(); }
      else UI.toast(r.reason, 'warn');
    });
    const setp = modal.querySelector('#cd-setprice');
    if (setp) setp.addEventListener('click', () => {
      CS.Cards.setPrice(G, c.id, Number(modal.querySelector('#cd-price').value));
      UI.closeModal(); UI.renderTabIfOpen();
    });
    const un = modal.querySelector('#cd-unlist');
    if (un) un.addEventListener('click', () => {
      CS.Cards.unlist(G, c.id);
      UI.closeModal(); UI.renderTabIfOpen();
    });
  };

  /* 存档导入导出 */
  UI.exportSave = function () {
    const data = CS.Save.serialize(UI.G);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '卡牌店存档_' + UI.G.shopName + '_D' + UI.G.clock.day + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    UI.toast('存档已导出');
  };
  UI.importSave = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const G = CS.Save.load(String(reader.result));
          CS.Save.writeLocal(G);
          location.reload();
        } catch (e) {
          UI.toast('存档读取失败：' + e.message, 'warn');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  };

  /* 开店 */
  UI.tryOpenStore = function () {
    const G = UI.G;
    const r = CS.Game.openStore(G);
    if (r.ok) {
      UI.toast('开始营业：今日预计到店 ' + r.count + ' 位顾客');
      UI.updateHUD();
    } else {
      UI.toast(r.reason, 'warn');
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
