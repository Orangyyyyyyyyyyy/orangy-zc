/* ============================================================
 * 个人工作台 · 扩展功能 (features-extras.js)
 * 依赖 app.js 暴露的 window.PW（DB / callAI / toast / todayStr / escapeHtml / el / $）
 * 功能：① 每日新闻推送  ② 个人愿望  ③ 网址清单  ④ 行情关注器
 * ============================================================ */
(function () {
  'use strict';
  const PW = window.PW;
  const DB = PW.DB, callAI = PW.callAI, toast = PW.toast, todayStr = PW.todayStr;
  const esc = PW.escapeHtml, el = PW.el, $ = PW.$;

  const uid = (p) => (p || 'id') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* =========================================================
   * 通用：扩展 switchPage 以分发新页面 + 控制 FAB 显隐
   * ========================================================= */
  const _origSwitch = window.switchPage;
  window.switchPage = function (page) {
    document.querySelectorAll('.fab').forEach((f) => f.classList.remove('show'));
    _origSwitch(page);
    if (page === 'wishes' && window.renderWishes) window.renderWishes();
    else if (page === 'links' && window.renderLinks) window.renderLinks();
    else if (page === 'market' && window.renderMarket) window.renderMarket();
    else if (page === 'dashboard' && window.renderNewsDash) window.renderNewsDash();
  };

  /* 扩展登录后的每日自检：自动检索新闻 + 行情广播 */
  if (typeof window.PW.bootDaily === 'function') {
    const _origBoot = window.PW.bootDaily;
    window.PW.bootDaily = async function () {
      await _origBoot();
      bootNews(); // 新闻仍按原逻辑登录后拉取（不在加载阶段内，走后台）
      // 行情已移至登录加载阶段 preloadMarket，此处不再重复生成
    };
  }
  // 暴露给 app.js 的登录加载阶段调用
  window.PW.preloadMarket = bootMarket;

  /* 通用弹窗（复用 #pw-modal，与 features.js 互不干扰） */
  function openModal(html) {
    const root = $('pw-modal');
    if (!root) return;
    $('pw-modal-box').innerHTML = html;
    root.classList.add('open');
  }
  window.pwCloseExtModal = function () {
    const root = $('pw-modal');
    if (!root) return;
    root.classList.remove('open');
    $('pw-modal-box').innerHTML = '';
  };

  /* =========================================================
   * ① 每日新闻推送
   * ========================================================= */
  const NEWS_CATS = [
    { key: 'politics', label: '政治', icon: '🏛' },
    { key: 'economy', label: '经济', icon: '💹' },
    { key: 'policy', label: '新政策', icon: '📜' },
    { key: 'culture', label: '文化交流', icon: '🎭' },
    { key: 'sports', label: '赛事', icon: '🏟' },
  ];

  async function bootNews() {
    // 进入工作台后自动检索今日新闻
    renderNewsDash(true);
  }

  let _newsBusy = false; // 防止登录时 switchPage + bootDaily 并发触发两次新闻拉取
  async function renderNewsDash(silent) {
    const zone = $('news-zone');
    if (!zone) return;
    const cached = DB.get('daily_news', null);
    if (cached && cached.date === todayStr()) {
      paintNews(zone, cached);
      return;
    }
    if (_newsBusy) return; // 已有请求在飞，避免重复拉取 / 重复 AI 调用
    _newsBusy = true;
    if (!silent) zone.innerHTML = '<div class="news-hint">正在检索今日新闻…</div>';
    try {
      const r = await fetch(PW.API_BASE + '/api/daily-news');
      const data = await r.json();
      DB.set('daily_news', { date: data.date || todayStr(), data });
      paintNews(zone, { date: data.date, data });
    } catch (e) {
      zone.innerHTML = '<div class="news-hint">新闻检索失败，请稍后重试。</div>';
    } finally {
      _newsBusy = false;
    }
  }
  window.renderNewsDash = renderNewsDash;

  function paintNews(zone, payload) {
    const d = payload.data || {};
    const parts = [
      { name: '国内', icon: '🌏', data: d.domestic },
      { name: '国外', icon: '🌐', data: d.foreign },
    ];
    const isFallback = d.fallback;
    let html = '<div class="news-cols">';
    for (const p of parts) {
      const col = p.data || {};
      html += '<div class="news-col">';
      html += '<div class="news-col-head">' + p.icon + ' ' + p.name + '</div>';
      if (col.headline) {
        html += '<div class="news-headline">🔥 头条 · ' + esc(col.headline) + '</div>';
      }
      html += '<div class="news-cats">';
      for (const c of NEWS_CATS) {
        const items = (col[c.key] || []).filter(Boolean);
        html += '<div class="news-cat"><div class="news-cat-title">' + c.icon + ' ' + c.label + '</div>';
        if (items.length) {
          for (const it of items) {
            html += '<div class="news-item">';
            html += '<div class="news-item-title">' + esc(it.title || '') + '</div>';
            if (it.summary) html += '<div class="news-item-sum">' + esc(it.summary) + '</div>';
            html += '</div>';
          }
        } else {
          html += '<div class="news-item"><div class="news-item-sum">暂无相关新闻</div></div>';
        }
        html += '</div>';
      }
      html += '</div></div>';
    }
    html += '</div>';
    if (isFallback) html += '<div class="news-meta">⚠️ 联网检索暂不可用，已展示离线示例结构；联网后将自动替换为真实资讯。</div>';
    else if (d.fromRSS) html += '<div class="news-meta">📡 由 RSS 实时聚合 · ' + esc(payload.date || todayStr()) + ' 更新（AI 结构化暂不可用，已直接呈现真实头条）</div>';
    else html += '<div class="news-meta">由智谱 AI 实时整理 · ' + esc(payload.date || todayStr()) + ' 更新（点击右上「刷新新闻」可强制更新）</div>';
    zone.innerHTML = html;
  }

  /* 手动刷新新闻：清本地缓存 + 强制后端重新抓取（?refresh=1 绕过服务端当日缓存） */
  window.refreshNews = async function () {
    const zone = $('news-zone');
    if (!zone) return;
    zone.innerHTML = '<div class="news-hint">正在重新检索今日新闻…</div>';
    DB.set('daily_news', null);
    try {
      const r = await fetch(PW.API_BASE + '/api/daily-news?refresh=1');
      const data = await r.json();
      DB.set('daily_news', { date: data.date || todayStr(), data });
      paintNews(zone, { date: data.date, data });
      toast(data.fallback ? '已刷新（当前为离线示例）' : '新闻已刷新 🔄', data.fallback ? 'info' : 'success');
    } catch (e) {
      zone.innerHTML = '<div class="news-hint">新闻刷新失败，请稍后重试。</div>';
      toast('新闻刷新失败', 'error');
    }
  };

  /* =========================================================
   * ② 个人愿望（AGNES AI 图标 + 状态样式）
   * ========================================================= */
  function getWishes() { return DB.get('wishes', []); }
  function setWishes(list) { DB.set('wishes', list); }

  function wishIconPrompt(name, content) {
    const base = '扁平卡通图标，圆角，居中，无文字，纯色背景，象征';
    const t = (name || '愿望').slice(0, 20) + '：' + (content || '').slice(0, 40);
    return (base + t + '。清晰简洁的矢量风格。').slice(0, 195);
  }

  async function generateWishIcon(prompt) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 120000);
    try {
      const r = await fetch(PW.API_BASE + '/api/agnes-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, saveDir: 'wishes', size: '512x512' }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      let data = null;
      try { data = await r.json(); } catch (e) { data = null; }
      if (r.ok && data && data.ok && data.image) return data.image;
      return null;
    } catch (e) {
      clearTimeout(t);
      return null;
    }
  }

  function renderWishes() {
    $('page-title').textContent = '个人愿望';
    const grid = $('wishes-grid');
    const list = getWishes();
    $('wish-count').textContent = list.length ? (list.length + ' 个愿望') : '';
    if (!list.length) {
      grid.innerHTML = '<div class="wish-empty">还没有愿望，点击右下角 ＋ 许下一个吧 ✨</div>';
      const f = $('fab-wish'); if (f) f.classList.add('show');
      return;
    }
    grid.innerHTML = '';
    for (const w of list) {
      const card = el('div', 'wish-card wish-' + (w.status || 'pending'));
      const statusLabel = { pending: '进行中', fulfilled: '已实现', cancelled: '已放弃' }[w.status || 'pending'];
      let icon;
      if (w.image) {
        icon = '<img class="wish-icon" src="' + esc(w.image) + '" alt="' + esc(w.name) + '">';
      } else {
        const emoji = w.emoji || '🌟';
        icon = '<div class="wish-emoji-fallback">' + emoji + '</div>';
      }
      card.innerHTML =
        '<button class="wish-del" title="删除愿望" onclick="deleteWish(\'' + w.id + '\')">×</button>' +
        icon +
        '<div class="wish-name">' + esc(w.name) + '</div>' +
        '<span class="wish-status">' + statusLabel + '</span>';
      card.addEventListener('click', (e) => {
        if (e.target.closest('.wish-del')) return;
        openWish(w.id);
      });
      grid.appendChild(card);
    }
    const f = $('fab-wish'); if (f) f.classList.add('show');
  }
  window.renderWishes = renderWishes;

  function openWishEditor() {
    openModal(
      '<div style="padding:22px">' +
      '<h3 style="font-family:Noto Serif SC,serif;margin-bottom:14px">许下一个愿望</h3>' +
      '<div class="form-group" style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-size:13px;color:var(--text-2)">愿望名称</label>' +
      '<input id="wish-name" maxlength="30" placeholder="例如：去一趟冰岛" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text)"></div>' +
      '<div class="form-group" style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-size:13px;color:var(--text-2)">愿望内容</label>' +
      '<textarea id="wish-content" rows="3" maxlength="200" placeholder="想实现的样子、原因…" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);resize:vertical"></textarea></div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end">' +
      '<button class="btn btn-ghost btn-sm" onclick="pwCloseExtModal()">取消</button>' +
      '<button class="btn btn-gold btn-sm" onclick="submitWish()">生成图标并保存</button>' +
      '</div></div>'
    );
    setTimeout(() => { const i = $('wish-name'); if (i) i.focus(); }, 50);
  }
  window.openWishEditor = openWishEditor;

  async function submitWish() {
    const name = ($('wish-name').value || '').trim();
    const content = ($('wish-content').value || '').trim();
    if (!name) { toast('请填写愿望名称', 'warn'); return; }
    const wish = { id: uid('w_'), name, content, image: '', emoji: '🌟', status: 'pending', created: todayStr() };
    const list = getWishes();
    list.unshift(wish);
    setWishes(list);
    renderWishes();
    pwCloseExtModal();
    toast('愿望已添加，正在生成专属图标…');
    const img = await generateWishIcon(wishIconPrompt(name, content));
    if (img) {
      wish.image = img;
      setWishes(getWishes());
      renderWishes();
      toast('图标已生成 ✨');
    } else {
      toast('图标生成失败（可能未联网），已用默认图案保存', 'warn');
    }
  }
  window.submitWish = submitWish;

  function openWish(id) {
    const w = getWishes().find((x) => x.id === id);
    if (!w) return;
    const statusLabel = { pending: '进行中', fulfilled: '已实现', cancelled: '已取消' }[w.status || 'pending'];
    let icon;
    if (w.image) icon = '<img src="' + esc(w.image) + '" style="width:120px;height:120px;border-radius:18px;object-fit:cover;margin:0 auto 12px">';
    else icon = '<div class="wish-emoji-fallback" style="width:120px;height:120px;font-size:58px;margin:0 auto 12px">' + (w.emoji || '🌟') + '</div>';
    openModal(
      '<div style="padding:22px;text-align:center;max-width:360px">' +
      icon +
      '<h3 style="font-family:Noto Serif SC,serif;margin-bottom:6px">' + esc(w.name) + '</h3>' +
      '<span class="wish-status">' + statusLabel + '</span>' +
      (w.content ? '<p style="margin:12px 0;color:var(--text-2);line-height:1.7;font-size:14px">' + esc(w.content) + '</p>' : '') +
      '<div style="display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap">' +
      '<button class="btn btn-ghost btn-sm" onclick="pwCloseExtModal()">关闭</button>' +
      '<button class="btn btn-sm" style="background:rgba(142,136,124,.16);color:var(--text-2)" onclick="setWishStatus(\'' + w.id + '\',\'cancelled\')">取消愿望</button>' +
      '<button class="btn btn-gold btn-sm" onclick="setWishStatus(\'' + w.id + '\',\'fulfilled\')">愿望实现</button>' +
      '</div></div>'
    );
  }
  window.openWish = openWish;

  function setWishStatus(id, status) {
    const list = getWishes();
    const w = list.find((x) => x.id === id);
    if (!w) return;
    w.status = status;
    setWishes(list);
    renderWishes();
    pwCloseExtModal();
    toast(status === 'fulfilled' ? '🎉 愿望已实现！' : status === 'cancelled' ? '已取消该愿望' : '已更新');
  }
  window.setWishStatus = setWishStatus;

  window.deleteWish = function (id) {
    setWishes(getWishes().filter((x) => x.id !== id));
    renderWishes();
    toast('愿望已删除');
  };

  /* =========================================================
   * ③ 有用的网址清单（本地持久 + 拖拽排序）
   * ========================================================= */
  function getLinks() { return DB.get('links', []); }
  function setLinks(list) { DB.set('links', list); }

  function faviconUrl(url) {
    try {
      const u = new URL(url);
      return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(u.hostname) + '&sz=32';
    } catch (e) { return ''; }
  }

  function renderLinks() {
    $('page-title').textContent = '有用的网址清单';
    const box = $('links-list');
    const list = getLinks();
    if (!list.length) {
      box.innerHTML = '<div class="link-empty">还没有保存的网址，点击右下角 ＋ 添加你常用的链接吧。</div>';
      const f = $('fab-link'); if (f) f.classList.add('show');
      return;
    }
    box.innerHTML = '';
    list.forEach((lk) => {
      const item = el('div', 'link-item');
      item.setAttribute('draggable', 'true');
      item.dataset.id = lk.id;
      const fav = faviconUrl(lk.url);
      item.innerHTML =
        '<span class="link-drag" title="拖动排序">⠿</span>' +
        (fav ? '<img class="link-favicon" src="' + fav + '" onerror="this.style.display=\'none\'">' : '') +
        '<div class="link-main"><div class="link-title">' + esc(lk.title || lk.url) + '</div><div class="link-url">' + esc(lk.url) + '</div></div>' +
        '<a class="link-open" href="' + esc(lk.url) + '" target="_blank" rel="noopener">打开</a>' +
        '<button class="link-del" title="删除" onclick="deleteLink(\'' + lk.id + '\')">×</button>';
      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', lk.id);
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        document.querySelectorAll('.link-item.drag-over').forEach((n) => n.classList.remove('drag-over'));
      });
      item.addEventListener('dragover', (e) => { e.preventDefault(); item.classList.add('drag-over'); });
      item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const fromId = e.dataTransfer.getData('text/plain');
        reorderLinks(fromId, lk.id);
      });
      box.appendChild(item);
    });
    const f = $('fab-link'); if (f) f.classList.add('show');
  }
  window.renderLinks = renderLinks;

  function reorderLinks(fromId, toId) {
    if (!fromId || fromId === toId) return;
    const list = getLinks();
    const from = list.findIndex((x) => x.id === fromId);
    const to = list.findIndex((x) => x.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setLinks(list);
    renderLinks();
  }
  window.reorderLinks = reorderLinks;

  function openLinkEditor() {
    openModal(
      '<div style="padding:22px">' +
      '<h3 style="font-family:Noto Serif SC,serif;margin-bottom:14px">添加网址</h3>' +
      '<div class="form-group" style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-size:13px;color:var(--text-2)">标题</label>' +
      '<input id="link-title" maxlength="40" placeholder="例如：Gmail" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text)"></div>' +
      '<div class="form-group" style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-size:13px;color:var(--text-2)">网址</label>' +
      '<input id="link-url" placeholder="https://..." style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text)"></div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end">' +
      '<button class="btn btn-ghost btn-sm" onclick="pwCloseExtModal()">取消</button>' +
      '<button class="btn btn-gold btn-sm" onclick="submitLink()">保存</button>' +
      '</div></div>'
    );
    setTimeout(() => { const i = $('link-url'); if (i) i.focus(); }, 50);
  }
  window.openLinkEditor = openLinkEditor;

  window.submitLink = function () {
    const title = ($('link-title').value || '').trim();
    let url = ($('link-url').value || '').trim();
    if (!url) { toast('请填写网址', 'warn'); return; }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const list = getLinks();
    list.push({ id: uid('l_'), title, url });
    setLinks(list);
    renderLinks();
    pwCloseExtModal();
    toast('链接已保存（本地永久）');
  };

  window.deleteLink = function (id) {
    setLinks(getLinks().filter((x) => x.id !== id));
    renderLinks();
    toast('链接已删除');
  };

  /* =========================================================
   * ④ 行情关注器（登录广播 + 刷新）
   * ========================================================= */
  const DEFAULT_MARKET = [
    { id: 'm_gpu', name: '显卡', category: '硬件' },
    { id: 'm_ram', name: '内存条', category: '硬件' },
    { id: 'm_ssd', name: '硬盘 (SSD)', category: '硬件' },
    { id: 'm_mon', name: '显示器', category: '硬件' },
  ];
  function getMarketItems() {
    let list = DB.get('market_items', null);
    if (!list) { list = DEFAULT_MARKET.slice(); DB.set('market_items', list); }
    return list;
  }
  function setMarketItems(list) { DB.set('market_items', list); }

  function bootMarket() {
    const data = DB.get('market_data', null);
    if (data && data.date === todayStr()) return; // 今日已广播过，直接展示
    refreshMarket(true);
  }

  let _marketBusy = false; // 防止快速重复点击「刷新行情」造成重复 AI 调用
  async function refreshMarket(silent) {
    if (_marketBusy) return;
    _marketBusy = true;
    const items = getMarketItems();
    const list = items.map((i) => i.name + '（' + i.category + '）').join('、');
    const sys = '你是硬件/数码行情分析师。针对用户关注的商品，给出当前参考价格区间与近期价格走势。' +
      '只输出 JSON 数组，元素结构：{"name":"商品名","category":"类别","price":"参考价格(如 ¥1999 或 ¥400-600)","trend":"up|down|flat","change":"价格变化说明(1句)","note":"简短点评(1句)"}。' +
      '价格基于近期常识给出参考区间，并在 change 中说明判断依据；trend 表示近一段时间价格走向（up 涨 / down 跌 / flat 平稳）。不要任何多余文字。';
    const user = '请分析以下商品的行情：' + list;
    let out;
    try {
      const r = await callAI([{ role: 'system', content: sys }, { role: 'user', content: user }],
        { json: true, temperature: 0.5, max_tokens: 1000 });
      out = (r.ok && Array.isArray(r.content)) ? r.content : null;
    } catch (e) { out = null; }
    if (!out) {
      out = items.map((i) => ({ name: i.name, category: i.category, price: '—', trend: 'flat', change: '（暂无法获取实时行情）', note: '' }));
    }
    DB.set('market_data', { date: todayStr(), items: out, ts: Date.now() });
    const sec = document.getElementById('market-section');
    if (window.renderMarket && sec && sec.classList.contains('active')) window.renderMarket();
    if (!silent) toast('行情已刷新 🔄');
    _marketBusy = false;
  }
  window.refreshMarket = refreshMarket;

  function trendArrow(t) {
    if (t === 'up') return '▲ 上涨';
    if (t === 'down') return '▼ 下跌';
    return '＝ 平稳';
  }

  /* 行情磁力块渲染（macOS 文件夹风格，支持拖拽 / 磁吸堆叠 / 自定义区分） */
  const SYSTEM_MARKET_IDS = DEFAULT_MARKET.map((d) => d.id);
  const RING_R = 27, RING_C = 2 * Math.PI * RING_R;

  function setMagnetPos(block, x, y) {
    block.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  }
  function magnetInner(it, m) {
    const trend = m.trend || 'flat';
    const pct = trend === 'up' ? 72 : trend === 'down' ? 30 : 50;
    return '<button class="magnet-del" title="取消关注" data-del="' + it.id + '">×</button>' +
      '<div class="magnet-name">' + esc(m.name || it.name) + '</div>' +
      '<div class="magnet-cat">' + esc(m.category || it.category) + '</div>' +
      '<div class="magnet-ring"><svg width="64" height="64" viewBox="0 0 64 64">' +
        '<circle class="ring-bg" cx="32" cy="32" r="' + RING_R + '" stroke-width="7"></circle>' +
        '<circle class="ring-fg ' + trend + '" cx="32" cy="32" r="' + RING_R + '" stroke-width="7" stroke-dasharray="' + RING_C.toFixed(1) + '" stroke-dashoffset="' + (RING_C * (1 - pct / 100)).toFixed(1) + '"></circle>' +
      '</svg></div>' +
      '<div class="magnet-price">' + esc(m.price || '—') + '</div>' +
      '<div class="magnet-trend ' + trend + '">' + trendArrow(trend) + '</div>';
  }
  function attachMagnetDrag(block, canvas, layout, items) {
    let startX = 0, startY = 0, origX = 0, origY = 0, dragging = false, moved = false;
    block.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.magnet-del')) return;
      dragging = true; moved = false;
      startX = e.clientX; startY = e.clientY;
      const p = layout[block.dataset.id]; origX = p.x; origY = p.y;
      block.classList.add('dragging');
      try { block.setPointerCapture(e.pointerId); } catch (_) {}
    });
    block.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      block._nx = origX + dx; block._ny = origY + dy;
      setMagnetPos(block, block._nx, block._ny);
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      block.classList.remove('dragging');
      if (!moved) { openMarketDetail(block.dataset.id); return; }
      const W = canvas.clientWidth || 820, H = canvas.clientHeight || 480;
      const others = Array.from(canvas.querySelectorAll('.magnet')).filter((o) => o !== block);
      let best = null, bestD = Infinity;
      for (const o of others) {
        const op = layout[o.dataset.id];
        const d = Math.hypot(block._nx - op.x, block._ny - op.y);
        if (d < bestD) { bestD = d; best = op; }
      }
      let fx = block._nx, fy = block._ny;
      if (best && bestD < 80) { fx = best.x + 16; fy = best.y + 16; block.classList.add('snapped'); }
      else { fx = Math.max(0, Math.min(fx, W - 168)); fy = Math.max(0, Math.min(fy, H - 150)); block.classList.remove('snapped'); }
      layout[block.dataset.id] = { x: fx, y: fy };
      setMagnetPos(block, fx, fy);
      DB.set('market_layout', layout);
    }
    block.addEventListener('pointerup', end);
    block.addEventListener('pointercancel', end);
  }
  function openMarketDetail(id) {
    const items = getMarketItems();
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const data = DB.get('market_data', null);
    const map = {};
    if (data && data.items) data.items.forEach((x) => { map[x.name] = x; });
    const m = map[it.name] || { name: it.name, category: it.category, price: '—', trend: 'flat', change: '', note: '' };
    openModal(
      '<div style="padding:22px;max-width:360px">' +
      '<div style="font-family:Noto Serif SC,serif;font-size:20px;margin-bottom:4px">' + esc(m.name) + '</div>' +
      '<div style="color:var(--text-2);font-size:13px;margin-bottom:14px">' + esc(m.category || it.category) + (it.custom ? ' · 自定义关注' : ' · 系统预设') + '</div>' +
      '<div style="font-size:28px;font-weight:600;margin-bottom:4px">' + esc(m.price || '—') + '</div>' +
      '<div class="magnet-trend ' + (m.trend || 'flat') + '">' + trendArrow(m.trend) + '</div>' +
      (m.change ? '<p style="margin:12px 0;color:var(--text-2);line-height:1.7">' + esc(m.change) + '</p>' : '') +
      (m.note ? '<p style="color:var(--text-3)">' + esc(m.note) + '</p>' : '') +
      '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px"><button class="btn btn-ghost btn-sm" onclick="pwCloseExtModal()">关闭</button></div>' +
      '</div>'
    );
  }
  window.openMarketDetail = openMarketDetail;

  function renderMarket() {
    const canvas = $('market-canvas');
    if (!canvas) return;
    $('page-title').textContent = '行情关注器';
    const items = getMarketItems();
    const data = DB.get('market_data', null);
    const map = {};
    if (data && data.items) data.items.forEach((x) => { map[x.name] = x; });
    if (!items.length) {
      canvas.innerHTML = '<div class="market-empty">还没有关注的商品，点击「＋ 添加关注」开始追踪行情。</div>';
      return;
    }
    let layout = DB.get('market_layout', null);
    if (!layout) layout = {};
    const W = canvas.clientWidth || 820;
    const cols = Math.max(1, Math.floor((W - 20) / 188));
    canvas.innerHTML = '';
    items.forEach((it, i) => {
      if (!layout[it.id]) {
        const c = i % cols, r = Math.floor(i / cols);
        layout[it.id] = { x: 16 + c * 188, y: 16 + r * 180 };
      }
      const custom = !SYSTEM_MARKET_IDS.includes(it.id);
      const m = map[it.name] || { name: it.name, category: it.category, price: '—', trend: 'flat', change: '', note: '' };
      const block = el('div', 'magnet ' + (custom ? 'magnet-custom' : 'magnet-system'));
      block.dataset.id = it.id;
      block.innerHTML = magnetInner(it, m);
      setMagnetPos(block, layout[it.id].x, layout[it.id].y);
      canvas.appendChild(block);
      block.querySelector('[data-del]').addEventListener('click', (e) => { e.stopPropagation(); deleteMarketItem(it.id); });
      attachMagnetDrag(block, canvas, layout, items);
    });
    DB.set('market_layout', layout);
  }
  window.renderMarket = renderMarket;

  function openMarketAdd() {
    openModal(
      '<div style="padding:22px">' +
      '<h3 style="font-family:Noto Serif SC,serif;margin-bottom:14px">添加关注对象</h3>' +
      '<div class="form-group" style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-size:13px;color:var(--text-2)">名称</label>' +
      '<input id="mkt-name" maxlength="20" placeholder="例如：机械键盘" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text)"></div>' +
      '<div class="form-group" style="margin-bottom:14px"><label style="display:block;margin-bottom:6px;font-size:13px;color:var(--text-2)">类别</label>' +
      '<input id="mkt-cat" maxlength="12" placeholder="例如：硬件 / 数码 / 其他" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text)"></div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end">' +
      '<button class="btn btn-ghost btn-sm" onclick="pwCloseExtModal()">取消</button>' +
      '<button class="btn btn-gold btn-sm" onclick="submitMarketItem()">添加</button>' +
      '</div></div>'
    );
    setTimeout(() => { const i = $('mkt-name'); if (i) i.focus(); }, 50);
  }
  window.openMarketAdd = openMarketAdd;

  window.submitMarketItem = function () {
    const name = ($('mkt-name').value || '').trim();
    const cat = ($('mkt-cat').value || '').trim() || '其他';
    if (!name) { toast('请填写名称', 'warn'); return; }
    const items = getMarketItems();
    items.push({ id: uid('m_'), name, category: cat, custom: true });
    setMarketItems(items);
    pwCloseExtModal();
    renderMarket();
    toast('已添加关注，正在刷新行情…');
    refreshMarket(true);
  };

  window.deleteMarketItem = function (id) {
    setMarketItems(getMarketItems().filter((x) => x.id !== id));
    const layout = DB.get('market_layout', {}) || {};
    delete layout[id];
    DB.set('market_layout', layout);
    renderMarket();
    toast('已取消关注');
  };

  /* 页面加载即注册全局渲染函数（供 switchPage 调用，已在上文赋值） */
})();
