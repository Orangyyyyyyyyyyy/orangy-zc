/* ============================================================
 * 竞赛时间表 / 证书规划 (competition.js)
 * ------------------------------------------------------------
 * 依赖：app.js 暴露的 window.PW（DB / callAI / toast / todayStr / escapeHtml / el / $）
 *        comp-data.js 暴露的 window.CompData
 *
 * 两个页面共用同一套引擎：
 *   comp（竞赛）：甘特表 / 时间轴 / 我的参赛 / 比赛回忆录
 *   cert（证书）：考试日历 / 时间轴 / 我的证书（含到期提醒）
 *
 * 存储（全部本地）：
 *   pw_comp_my       我的参赛 / 报考条目
 *   pw_comp_memoirs  回忆录（文字）
 *   pw_comp_custom   用户新增或覆盖的内置条目
 *   pw_comp_desc     AI 生成的比赛介绍缓存
 *   IndexedDB pw_comp_imgs  回忆录图片（dataURL）
 * ============================================================ */
(function () {
  'use strict';

  const PW = window.PW;
  const DATA = window.CompData;
  if (!PW || !DATA) { console.error('[competition] 缺少依赖 PW / CompData'); return; }
  const DB = PW.DB, callAI = PW.callAI, toast = PW.toast, todayStr = PW.todayStr;
  const esc = PW.escapeHtml, el = PW.el, $ = PW.$;

  const uid = (p) => (p || 'id') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ================= 月份工具 =================
   * 1–12 = 基准年 Y，13–24 = 次年 Y+1 */
  const mLab = (m) => (m <= 12 ? m + '月' : '次年' + (m - 12) + '月');
  const mIdx = (m) => m - 1;                       // 0–23
  const mYear = (m, Y) => (m <= 12 ? Y : Y + 1);
  const mReal = (m) => (m <= 12 ? m : m - 12);     // 真实月份 1–12
  const rangeLab = (a, b) => (a === b ? mLab(a) : mLab(a) + ' – ' + mLab(b));
  const rangeFull = (arr, Y) => {
    if (!arr || !arr.length) return '—';
    return mYear(arr[0], Y) + '年' + mReal(arr[0]) + '月' + (arr[1] === arr[0] ? '' : ' – ' + mYear(arr[1], Y) + '年' + mReal(arr[1]) + '月');
  };
  const lastDay = (y, m) => new Date(y, m, 0).getDate();
  const dateOf = (m, Y, day) => {
    const y = mYear(m, Y), mo = mReal(m);
    const d = Math.min(day || 1, lastDay(y, mo));
    return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  };
  const dKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const daysTo = (ds) => {
    if (!ds) return null;
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const d = new Date(ds + 'T00:00:00');
    return Math.round((d - t) / 86400000);
  };

  /* ================= 数据读取 ================= */
  const CATS = { comp: DATA.COMP_CATS, cert: DATA.CERT_CATS };
  const BUILTIN = { comp: DATA.COMPETITIONS, cert: DATA.CERTIFICATES };

  function readCustom(kind) {
    return (DB.get('comp_custom', []) || []).filter((c) => c.kind === kind);
  }
  function writeCustom(kind, list) {
    const all = (DB.get('comp_custom', []) || []).filter((c) => c.kind !== kind);
    DB.set('comp_custom', all.concat(list));
  }
  /* 内置库 + 用户新增，用户同名条目覆盖内置 */
  function allEntries(kind) {
    const custom = readCustom(kind);
    const map = {};
    BUILTIN[kind].forEach((b) => { map[b.id] = Object.assign({}, b, { kind }); });
    custom.forEach((c) => {
      if (map[c.id]) map[c.id] = Object.assign({}, map[c.id], c, { edited: true });
      else map[c.id] = Object.assign({}, c, { kind });
    });
    return Object.keys(map).map((k) => map[k]);
  }
  function findEntry(kind, id) {
    return allEntries(kind).find((e) => e.id === id) || null;
  }
  const myList = () => DB.get('comp_my', []) || [];
  const mySave = (l) => DB.set('comp_my', l);
  const memoList = () => DB.get('comp_memoirs', []) || [];
  const memoSave = (l) => DB.set('comp_memoirs', l);

  const CAT_COLOR = {
    '创新创业': '#b68a4a', '数学建模': '#4a90c2', '学科竞赛': '#5b8c5a', '英语外语': '#8a6fb0',
    'IT与编程': '#3d8b8b', '电子与硬件': '#c2703d', '机械与制造': '#7a7a52', '艺术设计': '#b0557a', '综合与人文': '#8e887c',
    '语言类': '#8a6fb0', '计算机与IT': '#3d8b8b', '财经与会计': '#b68a4a', '法律与金融': '#4a90c2',
    '教育与公考': '#5b8c5a', '工程与建造': '#c2703d', '医药健康': '#b0557a', '通用技能': '#7a7a52',
  };
  const catColor = (c) => CAT_COLOR[c] || '#8e887c';

  /* ================= 页面状态 ================= */
  const S = {
    comp: { tab: 'gantt', year: new Date().getFullYear(), cat: '全部', onlyMine: false },
    cert: { tab: 'gantt', year: new Date().getFullYear(), cat: '全部', onlyMine: false },
    memoYear: new Date().getFullYear(),
  };

  /* ================= 侧边栏分发 ================= */
  const _origSwitch = window.switchPage;
  window.switchPage = function (page) {
    _origSwitch(page);
    if (page === 'comp') { $('page-title').textContent = '竞赛时间表'; renderComp(); }
    else if (page === 'cert') { $('page-title').textContent = '证书规划'; renderCert(); }
    else if (page === 'dashboard') { renderDashCard(); }
  };
  if (typeof window.PW.bootDaily === 'function') {
    const _b = window.PW.bootDaily;
    window.PW.bootDaily = async function () { await _b(); try { renderDashCard(); } catch (e) { console.warn(e); } };
  }

  /* ================= 通用弹窗 ================= */
  function modal(html) {
    let root = $('comp-modal');
    if (!root) {
      root = el('div'); root.id = 'comp-modal';
      root.innerHTML = '<div class="cm-mask" onclick="compCloseModal()"></div><div class="cm-box" id="cm-box"></div>';
      document.body.appendChild(root);
    }
    $('cm-box').innerHTML = html;
    root.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  window.compCloseModal = function () {
    const r = $('comp-modal');
    if (r) { r.classList.remove('open'); $('cm-box').innerHTML = ''; }
    document.body.style.overflow = '';
  };

  /* ================= ① 月份甘特表 ================= */
  function ganttHtml(kind) {
    const st = S[kind];
    const Y = st.year;
    const now = new Date();
    const nowIdx = now.getFullYear() === Y ? now.getMonth()
      : now.getFullYear() === Y + 1 ? 12 + now.getMonth() : -1;

    let list = allEntries(kind).filter((e) => st.cat === '全部' || e.cat === st.cat);
    if (st.onlyMine) {
      const ids = myList().filter((m) => m.kind === kind).map((m) => m.refId);
      list = list.filter((e) => ids.indexOf(e.id) >= 0);
    }
    const rows = list.filter((e) => kind === 'comp' ? e.regMonths : (e.regMonths || e.examMonths))
      .sort((a, b) => (a.regMonths ? a.regMonths[0] : 99) - (b.regMonths ? b.regMonths[0] : 99));

    const head = '<div class="gantt-head"><div class="gantt-label">' + (kind === 'comp' ? '竞赛 / 赛季 ' + Y : '证书 / 年度 ' + Y) + '</div>' +
      Array.from({ length: 24 }, (_, i) => {
        const m = i + 1;
        const lab = (m <= 12 ? m : m - 12) + '';
        return '<div class="gantt-mh' + (i >= 12 ? ' yr2' : '') + (i === nowIdx ? ' now' : '') + '">' + lab + '</div>';
      }).join('') + '</div>';

    const body = rows.map((e) => {
      const regA = e.regMonths ? mIdx(e.regMonths[0]) : -1;
      const regB = e.regMonths ? mIdx(e.regMonths[1]) : -1;
      const cA = kind === 'comp' ? (e.compMonths ? mIdx(e.compMonths[0]) : -1) : (e.examMonths ? mIdx(e.examMonths[0]) : -1);
      const cB = kind === 'comp' ? (e.compMonths ? mIdx(e.compMonths[1]) : -1) : (e.examMonths ? mIdx(e.examMonths[1]) : -1);
      const bar = (a, b, cls) => {
        if (a < 0 || b < 0) return '';
        const l = (a / 24 * 100), w = ((b - a + 1) / 24 * 100);
        return '<div class="gantt-bar ' + cls + '" style="left:' + l.toFixed(3) + '%;width:' + w.toFixed(3) + '%" title="' +
          esc(rangeLab(a + 1, b + 1)) + '"></div>';
      };
      /* 一年两批的证书：第二批用半透明条表示 */
      const altBar = e.alt ? bar(e.alt.regMonths ? mIdx(e.alt.regMonths[0]) : -1, e.alt.regMonths ? mIdx(e.alt.regMonths[1]) : -1, 'reg alt') +
        bar(e.alt.examMonths ? mIdx(e.alt.examMonths[0]) : -1, e.alt.examMonths ? mIdx(e.alt.examMonths[1]) : -1, 'comp alt') : '';
      const cells = Array.from({ length: 24 }, (_, i) => '<div class="gantt-cell' + (i === nowIdx ? ' nowcol' : '') + (i >= 12 ? ' yr2' : '') + '"></div>').join('');
      const mine = myList().find((m) => m.kind === kind && m.refId === e.id);
      return '<div class="gantt-row" onclick="compOpenDetail(\'' + kind + '\',\'' + e.id + '\')">' +
        '<div class="gantt-label"><span class="gantt-name" title="' + esc(e.name) + '">' + esc(e.short || e.name) +
        (mine ? ' <span class="comp-tag gold">已加入</span>' : '') + (e.edited ? ' <span class="comp-tag">已修正</span>' : '') + '</span>' +
        '<span class="gantt-meta"><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + catColor(e.cat) + '"></i>' +
        esc(e.cat) + ' · ' + esc(e.level || '') + '</span></div>' +
        '<div class="gantt-track"><div class="gantt-cells">' + cells + '</div>' +
        bar(regA, regB, 'reg') + bar(cA, cB, 'comp') + altBar + '</div></div>';
    }).join('');

    if (!rows.length) return '<div class="comp-empty">当前筛选下没有条目，换个分类或新增一个试试。</div>';

    return '<div class="comp-gantt"><div class="comp-gantt-scroll">' + head + body + '</div>' +
      '<div class="gantt-legend">' +
      '<span><i style="background:rgba(182,138,74,.85)"></i>上排：' + (kind === 'comp' ? '报名窗口' : '报考窗口') + '</span>' +
      '<span><i style="background:rgba(47,158,111,.8)"></i>下排：' + (kind === 'comp' ? '比赛期间' : '考试月份') + '</span>' +
      '<span>左半区 = ' + Y + ' 年，右半区（底色） = ' + (Y + 1) + ' 年</span>' +
      '<span>点击任意一行查看比赛详情</span></div></div>';
  }

  /* ================= ② 时间轴 ================= */
  function timelineHtml(kind) {
    const Y = S[kind].year;
    let list = allEntries(kind).filter((e) => S[kind].cat === '全部' || e.cat === S[kind].cat);
    if (S[kind].onlyMine) {
      const ids = myList().filter((m) => m.kind === kind).map((m) => m.refId);
      list = list.filter((e) => ids.indexOf(e.id) >= 0);
    }
    const nodes = [];
    list.forEach((e) => {
      const reg = e.regMonths;
      const main = kind === 'comp' ? e.compMonths : e.examMonths;
      if (reg) nodes.push({ m: reg[0], e, tag: kind === 'comp' ? '报名开始' : '报考开始' });
      if (main && (!reg || main[0] !== reg[0])) nodes.push({ m: main[0], e, tag: kind === 'comp' ? '开赛' : '考试' });
    });
    nodes.sort((a, b) => a.m - b.m || a.e.short.localeCompare(b.e.short, 'zh'));
    if (!nodes.length) return '<div class="comp-empty">当前筛选下没有时间节点。</div>';

    const byYear = {};
    nodes.forEach((n) => { const y = mYear(n.m, Y); (byYear[y] = byYear[y] || []).push(n); });
    const nowY = new Date().getFullYear(), nowM = new Date().getMonth() + 1;

    return '<div class="comp-timeline">' + Object.keys(byYear).sort().map((y) => {
      const byMonth = {};
      byYear[y].forEach((n) => { const mm = mReal(n.m); (byMonth[mm] = byMonth[mm] || []).push(n); });
      return '<div class="tl-group"><div class="tl-year">' + y + ' 年</div>' +
        Object.keys(byMonth).sort((a, b) => a - b).map((mm) => {
          const isNow = Number(y) === nowY && Number(mm) === nowM;
          return '<div class="tl-month' + (isNow ? ' now' : '') + '"><div class="tl-month-h">' + mm + ' 月' + (isNow ? ' · 本月' : '') + '</div>' +
            '<div class="tl-cards">' + byMonth[mm].map((n) =>
              '<div class="tl-card" onclick="compOpenDetail(\'' + kind + '\',\'' + n.e.id + '\')" title="' + esc(n.e.name) + '">' +
              '<i class="tl-dot" style="background:' + catColor(n.e.cat) + '"></i>' +
              '<span class="tl-title">' + esc(n.e.short || n.e.name) + '</span>' +
              '<span class="tl-badge">' + esc(n.tag) + '</span></div>').join('') + '</div></div>';
        }).join('') + '</div>';
    }).join('') + '</div>';
  }

  /* ================= ③ 我的参赛 / 我的证书 ================= */
  const STATUS = ['关注中', '已报名', '备赛中', '已完赛', '已归档'];

  function myHtml(kind) {
    const list = myList().filter((m) => m.kind === kind);
    if (!list.length) {
      return '<div class="comp-empty">' + (kind === 'comp'
        ? '还没有加入任何比赛。到「竞赛日历」或「时间轴」里点开一个比赛，选「加入我的参赛」即可开始倒计时。'
        : '还没有加入任何证书。到「考试日历」里点开一个证书，选「加入我的考证计划」即可开始倒计时。') + '</div>';
    }
    const withNext = list.map((m) => {
      const ms = (m.milestones || []).filter((x) => x.date).sort((a, b) => a.date.localeCompare(b.date));
      const next = ms.find((x) => daysTo(x.date) >= 0) || null;
      return { m, ms, next, d: next ? daysTo(next.date) : null };
    }).sort((a, b) => (a.d == null ? 1e9 : a.d) - (b.d == null ? 1e9 : b.d));

    return '<div class="comp-grid">' + withNext.map((o) => {
      const m = o.m;
      const cls = o.d == null ? 'calm' : o.d <= 7 ? 'urgent' : o.d <= 30 ? 'soon' : 'calm';
      const e = findEntry(kind, m.refId);
      const today = todayStr();
      return '<div class="cd-card ' + cls + '">' +
        '<div class="cd-head"><div class="cd-title">' + esc(m.title) + '</div><span class="cd-status">' + esc(m.status) + '</span></div>' +
        '<div class="cd-count">' + (o.d == null ? '<span style="font-size:15px;color:var(--text-3)">已结束</span>'
          : o.d + '<small>天</small>') + '</div>' +
        '<div class="cd-next">' + (o.next ? '下一节点：' + esc(o.next.label) + '（' + esc(o.next.date) + '）'
          : (m.season ? '本赛季（' + m.season + '）已全部结束' : '暂无待办节点')) + '</div>' +
        '<div class="cd-ms">' + o.ms.map((x) => {
          const dd = daysTo(x.date);
          const c = dd < 0 ? 'done' : (o.next && x.date === o.next.date) ? 'next' : '';
          return '<div class="cd-ms-row ' + c + '">' + (dd < 0 ? '✓' : (dd === 0 ? '!' : '·')) + ' ' + esc(x.label) + ' · ' + esc(x.date) + '</div>';
        }).join('') + '</div>' +
        '<div class="cd-actions">' +
        (o.d == null ? '<button class="btn btn-gold btn-sm" onclick="compShiftSeason(\'' + m.id + '\')">⇥ 顺延到下一赛季</button>' : '') +
        '<button class="btn btn-ghost btn-sm" onclick="compEditMilestones(\'' + m.id + '\')">✎ 节点</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="compNextStatus(\'' + m.id + '\')">⇥ ' + esc(nextStatus(m.status)) + '</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="compPushCalendar(\'' + m.id + '\')">📅 写入日历</button>' +
        '<button class="btn btn-gold btn-sm" onclick="compAIPlan(\'' + m.id + '\')">✨ 备赛计划</button>' +
        (kind === 'comp' ? '<button class="btn btn-ghost btn-sm" onclick="compOpenMemoir(null,\'' + m.id + '\')">📖 写回忆录</button>' : '') +
        '<button class="btn btn-ghost btn-sm" onclick="compRemoveMy(\'' + m.id + '\')">✕ 移除</button>' +
        '</div>' +
        (m.note ? '<div class="comp-note" style="margin:0">' + esc(m.note) + '</div>' : '') +
        '</div>';
    }).join('') + '</div>';
  }
  function nextStatus(s) {
    const i = STATUS.indexOf(s);
    return STATUS[Math.min(i + 1, STATUS.length - 1)] || '已归档';
  }
  window.compNextStatus = function (id) {
    const l = myList(); const m = l.find((x) => x.id === id);
    if (!m) return;
    m.status = nextStatus(m.status);
    mySave(l); toast('状态更新为「' + m.status + '」', 'success');
    renderComp(); renderCert(); renderDashCard();
    if (m.status === '已完赛' && m.kind === 'comp') {
      setTimeout(() => { if (confirm('比赛结束了，现在写一份回忆录留给以后的自己吗？')) compOpenMemoir(null, m.id); }, 320);
    }
  };
  /* 整季顺延一年（在日期字符串上 +1 年，遇到 2/29 自动落到 2/28） */
  window.compShiftSeason = function (id) {
    const l = myList(); const m = l.find((x) => x.id === id);
    if (!m) return;
    const push = (ds) => {
      const d = new Date(ds + 'T00:00:00');
      if (isNaN(d)) return ds;
      d.setFullYear(d.getFullYear() + 1);
      return dKey(d);
    };
    m.milestones = (m.milestones || []).map((x) => ({ label: x.label, date: push(x.date) }));
    m.season = (m.season || new Date().getFullYear()) + 1;
    mySave(l); toast('已顺延到 ' + m.season + ' 赛季', 'success');
    renderComp(); renderCert(); renderDashCard();
  };
  window.compRemoveMy = function (id) {
    if (!confirm('确定从我的列表中移除？回忆录不会被删除。')) return;
    mySave(myList().filter((x) => x.id !== id));
    toast('已移除'); renderComp(); renderCert(); renderDashCard();
  };

  /* 加入我的列表 */
  function defaultMilestones(kind, e, season) {
    const Y = season || new Date().getFullYear();
    if (kind === 'comp') {
      const ms = [];
      if (e.regMonths) {
        ms.push({ label: '报名开始', date: dateOf(e.regMonths[0], Y, 1) });
        ms.push({ label: '报名截止', date: dateOf(e.regMonths[1], Y, 28) });
      }
      if (e.compMonths) ms.push({ label: '比赛开始', date: dateOf(e.compMonths[0], Y, 15) });
      if (e.compMonths && e.compMonths[1] !== e.compMonths[0]) ms.push({ label: '决赛 / 国赛', date: dateOf(e.compMonths[1], Y, 15) });
      return ms;
    }
    const ms = [];
    if (e.regMonths) {
      ms.push({ label: '报名开始', date: dateOf(e.regMonths[0], Y, 1) });
      ms.push({ label: '报名截止', date: dateOf(e.regMonths[1], Y, 28) });
    }
    if (e.examMonths) ms.push({ label: '考试', date: dateOf(e.examMonths[0], Y, 15) });
    /* 一年多次考试的证书（四六级、NCRE、软考、教资等）补上另一批次，
       否则 9 月加入四级会只看到次年 3 月的报名，错过当年 12 月那场 */
    if (e.alt) {
      const pre = '第二批·';
      if (e.alt.regMonths) {
        ms.push({ label: pre + '报名开始', date: dateOf(e.alt.regMonths[0], Y, 1) });
        ms.push({ label: pre + '报名截止', date: dateOf(e.alt.regMonths[1], Y, 28) });
      }
      if (e.alt.examMonths) ms.push({ label: pre + '考试', date: dateOf(e.alt.examMonths[0], Y, 15) });
    }
    const vy = parseValidYears(e.valid);
    if (vy && e.examMonths) {
      const dd = new Date(dateOf(e.examMonths[0], Y, 15) + 'T00:00:00');
      dd.setFullYear(dd.getFullYear() + vy);
      ms.push({ label: '证书到期（' + vy + '年）', date: dKey(dd) });
    }
    return ms;
  }
  function parseValidYears(v) {
    if (!v) return null;
    if (/长期|终身/.test(v)) return null;
    const m = v.match(/(\d+)\s*年/);
    return m ? Number(m[1]) : null;
  }

  /* 选一个「还没结束」的赛季：优先当前查看的赛季，若节点全已过期则顺延一年 */
  function pickSeason(kind, e, pref) {
    const tryYears = [pref, pref + 1, pref + 2];
    for (const y of tryYears) {
      const ms = defaultMilestones(kind, e, y);
      if (ms.some((x) => daysTo(x.date) >= 0)) return y;
    }
    return pref;
  }
  window.compJoin = function (kind, id) {
    const e = findEntry(kind, id);
    if (!e) return;
    const l = myList();
    if (l.find((x) => x.kind === kind && x.refId === id)) { toast('已经在你的列表里了', 'info'); return; }
    const season = pickSeason(kind, e, S[kind].year);
    l.push({
      id: uid('my'), kind, refId: id, title: e.short || e.name, status: '关注中',
      season, milestones: defaultMilestones(kind, e, season), note: '', createdAt: todayStr(),
    });
    mySave(l);
    compCloseModal();
    toast('已加入，默认节点按往年月份生成，记得改成准确日期', 'success');
    S[kind].tab = 'my';
    renderComp(); renderCert(); renderDashCard();
  };

  /* 编辑节点 */
  window.compEditMilestones = function (id) {
    const m = myList().find((x) => x.id === id);
    if (!m) return;
    const rows = (m.milestones || []).map((x, i) =>
      '<div class="ms-row"><input type="text" id="ms-l-' + i + '" value="' + esc(x.label) + '" placeholder="节点名称">' +
      '<input type="date" id="ms-d-' + i + '" value="' + esc(x.date) + '">' +
      '<button class="ms-del" onclick="compDelMs(\'' + id + '\',' + i + ')">删除</button></div>').join('');
    modal('<button class="cm-close" onclick="compCloseModal()">✕</button>' +
      '<div class="cm-title">编辑时间节点</div><div class="cm-short">' + esc(m.title) + '</div>' +
      '<div class="cm-sec"><h4>关键节点（用于倒计时）</h4><div class="ms-editor" id="ms-editor">' + rows + '</div>' +
      '<button class="cm-btn" style="margin-top:10px" onclick="compAddMsRow(\'' + id + '\')">＋ 添加节点</button></div>' +
      '<div class="cm-sec"><h4>备注</h4><textarea class="cm-field" id="ms-note" style="width:100%;min-height:70px;border:1px solid var(--border);border-radius:9px;padding:8px 11px;background:var(--surface-2);color:var(--text);font-family:inherit;font-size:13px">' + esc(m.note || '') + '</textarea></div>' +
      '<div class="cm-actions"><button class="cm-btn" onclick="compCloseModal()">取消</button>' +
      '<button class="cm-btn primary" onclick="compSaveMs(\'' + id + '\')">保存</button></div>');
  };
  window.compAddMsRow = function (id) {
    const box = $('ms-editor');
    const i = box.children.length;
    const d = el('div', 'ms-row');
    d.innerHTML = '<input type="text" id="ms-l-' + i + '" placeholder="节点名称，如：提交作品"><input type="date" id="ms-d-' + i + '" value="' + todayStr() + '"><button class="ms-del" onclick="this.parentNode.remove()">删除</button>';
    box.appendChild(d);
  };
  window.compDelMs = function (id, i) {
    const l = myList(); const m = l.find((x) => x.id === id);
    m.milestones.splice(i, 1); mySave(l); compEditMilestones(id); renderComp(); renderCert(); renderDashCard();
  };
  window.compSaveMs = function (id) {
    const l = myList(); const m = l.find((x) => x.id === id);
    const box = $('ms-editor');
    const ms = [];
    Array.from(box.children).forEach((row, i) => {
      const la = $('ms-l-' + i), da = $('ms-d-' + i);
      if (la && da && la.value.trim() && da.value) ms.push({ label: la.value.trim(), date: da.value });
    });
    m.milestones = ms.sort((a, b) => a.date.localeCompare(b.date));
    m.note = ($('ms-note') ? $('ms-note').value : '').trim();
    mySave(l); compCloseModal(); toast('已保存', 'success');
    renderComp(); renderCert(); renderDashCard();
  };

  /* 写入日历 */
  window.compPushCalendar = function (id) {
    const m = myList().find((x) => x.id === id);
    if (!m) return;
    const all = DB.get('events', {});
    let n = 0;
    (m.milestones || []).forEach((x) => {
      if (!x.date) return;
      const t = m.title + ' · ' + x.label;
      if (!all[x.date]) all[x.date] = [];
      if (all[x.date].some((e) => e.title === t)) return;
      all[x.date].push({ time: '09:00', title: t }); n++;
    });
    DB.set('events', all);
    toast(n ? ('已把 ' + n + ' 个节点写入日历') : '这些节点已经在日历里了', n ? 'success' : 'info');
  };

  /* AI 备赛计划 → 写入每日任务 */
  window.compAIPlan = function (id) {
    const m = myList().find((x) => x.id === id);
    if (!m) return;
    const e = findEntry(m.kind, m.refId);
    const d = (m.milestones || []).find((x) => daysTo(x.date) >= 0);
    const days = d ? daysTo(d.date) : 30;
    modal('<button class="cm-close" onclick="compCloseModal()">✕</button>' +
      '<div class="cm-title">✨ AI 备赛计划</div><div class="cm-short">' + esc(m.title) + (d ? ' · 距「' + esc(d.label) + '」还有 ' + days + ' 天' : '') + '</div>' +
      '<div class="cm-sec" id="ai-plan-box"><div class="comp-empty">正在让 AI 拆解备赛计划…</div></div>');
    const prompt = '你是大学生竞赛与考证规划教练。请为下面的目标生成一份可执行的备赛计划。\n' +
      '目标：' + m.title + (e ? '（' + [e.cat, e.level, e.team, e.tips || (e.batches || '')].filter(Boolean).join('，') + '）' : '') + '\n' +
      '距离最近节点「' + (d ? d.label : '目标') + '」还有 ' + days + ' 天。\n' +
      '要求：输出 8-12 条具体、可打卡的每日/每周行动项，按时间顺序排列，每条不超过 20 字。只输出 JSON：{"plan":[{"title":"..."}]}';
    callAI([{ role: 'user', content: prompt }], { json: true, temperature: 0.7, max_tokens: 900 })
      .then((r) => {
        const box = $('ai-plan-box');
        if (!box) return;
        let items = [];
        if (r && r.ok && r.content && Array.isArray(r.content.plan)) items = r.content.plan.map((x) => String(x.title || '').trim()).filter(Boolean);
        if (!items.length) {
          items = ['查阅官网通知并确认报名入口', '组队并明确分工', '整理往年优秀作品 3 份', '完成选题与方案初稿', '按节点倒排时间表', '准备答辩 PPT 与演讲稿'];
        }
        box.innerHTML = '<h4>建议的备赛行动（勾选要加入每日任务的项）</h4>' +
          '<div id="ai-plan-list" style="display:flex;flex-direction:column;gap:6px;margin-top:8px">' +
          items.map((t, i) => '<label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.6"><input type="checkbox" class="ai-pick" value="' + esc(t) + '" checked><span>' + esc(t) + '</span></label>').join('') +
          '</div><div class="cm-actions" style="margin-top:14px">' +
          '<button class="cm-btn" onclick="compCloseModal()">取消</button>' +
          '<button class="cm-btn primary" onclick="compApplyPlan(\'' + id + '\')">加入「每日任务」</button></div>';
      })
      .catch((err) => {
        const box = $('ai-plan-box');
        if (box) box.innerHTML = '<div class="comp-empty">AI 生成失败：' + esc(String(err && err.message || err)) + '</div>';
      });
  };
  window.compApplyPlan = function (id) {
    const m = myList().find((x) => x.id === id);
    const picks = Array.from(document.querySelectorAll('.ai-pick:checked')).map((c) => c.value);
    if (!picks.length) { toast('没有勾选任何项', 'info'); return; }
    const tasks = DB.get('tasks', []);
    picks.forEach((t) => tasks.push({ id: uid('t'), title: '【' + (m ? m.title : '备赛') + '】' + t, category: '备赛计划', points: 1 }));
    DB.set('tasks', tasks);
    compCloseModal();
    toast('已把 ' + picks.length + ' 条行动加入每日任务', 'success');
    if (PW.loadDashboard) PW.loadDashboard();
  };

  /* ================= ④ 详情弹窗 ================= */
  function flowOf(kind, e) {
    if (kind === 'cert') {
      return ['查看官网本年度公告，确认报考条件与批次', '在报名系统注册并完成信息采集', '缴费并确认报名成功', '按计划备考（见备考周期建议）', '参加考试', '查询成绩 / 领取证书'];
    }
    if (e.level === '校级') return ['关注学校教务处 / 学院通知', '组队并向学院提交报名表', '参加校赛', '优胜后被推荐参加更高级别赛事'];
    if (e.level === '行业级') return ['官网注册账号并组队', '线上初赛 / 资格赛', '复赛或区域赛', '全国总决赛'];
    return ['学校发布通知，校内选拔或推荐（校赛）', '通过校赛后进入省赛 / 区域赛', '省赛优胜晋级全国总决赛', '国赛现场答辩或实操，决出奖项'];
  }

  window.compOpenDetail = function (kind, id) {
    const e = findEntry(kind, id);
    if (!e) return;
    const Y = S[kind].year;
    const mine = myList().find((m) => m.kind === kind && m.refId === id);
    const kv = [];
    if (kind === 'comp') {
      kv.push(['报名窗口', rangeFull(e.regMonths, Y) + '（' + rangeLab(e.regMonths ? e.regMonths[0] : 0, e.regMonths ? e.regMonths[1] : 0) + '，往年惯例）']);
      kv.push(['比赛期间', rangeFull(e.compMonths, Y)]);
      kv.push(['参赛形式', e.team || '—']);
      kv.push(['报名费', e.fee || '—']);
    } else {
      kv.push(['报考窗口', e.regMonths ? rangeFull(e.regMonths, Y) : '详见批次说明']);
      kv.push(['考试月份', e.examMonths ? rangeFull(e.examMonths, Y) : '详见批次说明']);
      kv.push(['考试批次', e.batches || '—']);
      if (e.alt) kv.push(['其他批次', (e.alt.label || '第二批次') + '：报考 ' + rangeFull(e.alt.regMonths, Y) + '，考试 ' + rangeFull(e.alt.examMonths, Y)]);
      kv.push(['费用', e.fee || '—']);
      kv.push(['有效期', e.valid || '—']);
      kv.push(['备考周期', e.difficulty || '—']);
      kv.push(['职业价值', e.career || '—']);
    }
    kv.push(['主办 / 主管', e.organiser || '—']);

    const links = [];
    if (e.official) links.push('<a class="cm-btn" href="' + esc(e.official) + '" target="_blank" rel="noopener">🏛 官方主页</a>');
    if (e.register && e.register !== e.official) links.push('<a class="cm-btn" href="' + esc(e.register) + '" target="_blank" rel="noopener">📝 报名入口</a>');
    else if (e.official) links.push('<a class="cm-btn" href="' + esc(e.official) + '" target="_blank" rel="noopener">📝 报名入口</a>');

    const descCache = DB.get('comp_desc', {});
    const cached = descCache[kind + ':' + id];

    modal('<button class="cm-close" onclick="compCloseModal()">✕</button>' +
      '<div class="cm-title">' + esc(e.name) + '</div>' +
      '<div class="cm-short">' + esc(e.short || '') + '</div>' +
      '<div class="cm-tags"><span class="comp-tag gold">' + esc(e.cat) + '</span><span class="comp-tag">' + esc(e.level || '') + '</span>' +
      '<span class="comp-tag">数据年份 ' + esc(e.srcYear || '—') + '</span>' +
      '<span class="comp-tag ' + (e.confidence === '低' ? 'warn' : e.confidence === '高' ? 'ok' : '') + '">可信度 ' + esc(e.confidence || '中') + '</span>' +
      (e.edited ? '<span class="comp-tag gold">已按你的修改校正</span>' : '') + '</div>' +
      '<div class="cm-sec"><h4>时间信息</h4><dl class="cm-kv">' +
      kv.map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>').join('') + '</dl></div>' +
      '<div class="cm-sec"><h4>' + (kind === 'comp' ? '比赛流程' : '报考流程') + '</h4><div class="cm-flow">' +
      flowOf(kind, e).map((s, i) => '<div class="cm-flow-step"><span class="sdot"></span><span>' + (i + 1) + '. ' + esc(s) + '</span></div>').join('') +
      '</div></div>' +
      '<div class="cm-sec"><h4>备赛提示</h4><div style="font-size:13px;line-height:1.75;color:var(--text-2)">' +
      esc(e.tips || e.career || '暂无提示，可在下方让 AI 生成一份介绍与备赛建议。') + '</div></div>' +
      '<div class="cm-sec" id="cm-desc"><h4>介绍</h4><div style="font-size:13px;line-height:1.8;color:var(--text-2)" id="cm-desc-body">' +
      (cached ? esc(cached) : '点下面的按钮，让 AI（GLM）写一份 150 字左右的介绍与备赛建议，生成后本地缓存。') + '</div>' +
      '<div style="margin-top:8px"><button class="cm-btn" onclick="compAIDesc(\'' + kind + '\',\'' + id + '\')">✨ ' + (cached ? '重新生成介绍' : 'AI 生成介绍') + '</button></div></div>' +
      '<div class="cm-sec"><h4>报名与官网</h4><div class="cm-links">' + (links.length ? links.join('') : '<span class="comp-tag">暂无收录网址</span>') + '</div>' +
      '<div style="font-size:12px;color:var(--text-3);margin-top:8px">报名地点：多为线上报名系统；部分赛事需先通过学校 / 学院统一选拔后再由学校集体报名。</div></div>' +
      '<div class="cm-warn">⚠️ 报名与比赛月份为往年惯例区间，每年都会浮动，请以官网本年度通知为准。若你掌握了准确日期，点「校正时间」就地覆盖，你的修改会永久保存在本地。</div>' +
      '<div class="cm-actions" style="margin-top:16px">' +
      '<button class="cm-btn" onclick="compEditEntry(\'' + kind + '\',\'' + id + '\')">✎ 校正 / 新增</button>' +
      (mine ? '<button class="cm-btn" onclick="compCloseModal()">已在你的列表中</button>'
        : '<button class="cm-btn primary" onclick="compJoin(\'' + kind + '\',\'' + id + '\')">＋ ' + (kind === 'comp' ? '加入我的参赛' : '加入考证计划') + '</button>') +
      '</div>');
  };

  window.compAIDesc = function (kind, id) {
    const e = findEntry(kind, id);
    if (!e) return;
    const box = $('cm-desc-body');
    if (box) box.textContent = '正在生成…';
    const p = '请用 150 字左右介绍这个' + (kind === 'comp' ? '大学生竞赛' : '职业证书') + '：' + e.name +
      '。内容包含：它是什么、含金量与认可度、适合什么阶段的本科生、备赛/备考的关键建议。语气温和务实，不要夸大。';
    callAI([{ role: 'user', content: p }], { temperature: 0.8, max_tokens: 500 })
      .then((r) => {
        const txt = (r && r.ok && r.content) ? String(r.content).trim() : '';
        const out = txt || 'AI 暂不可用（未配置 Key 或无网络）。';
        const cache = DB.get('comp_desc', {});
        cache[kind + ':' + id] = out; DB.set('comp_desc', cache);
        if ($('cm-desc-body')) $('cm-desc-body').textContent = out;
      })
      .catch(() => { if ($('cm-desc-body')) $('cm-desc-body').textContent = 'AI 暂不可用，可先在「设置」里配置智谱 Key。'; });
  };

  /* 校正 / 新增条目 */
  window.compEditEntry = function (kind, id) {
    const e = id ? findEntry(kind, id) : null;
    const isNew = !e;
    const v = e || { name: '', short: '', cat: CATS[kind][0], level: kind === 'comp' ? '国家级' : '入门', regMonths: [3, 4], compMonths: [5, 6], examMonths: [6, 6], official: '', register: '', organiser: '', fee: '', team: '', tips: '', batches: '', valid: '', difficulty: '', career: '' };
    const opts = (arr, cur) => arr.map((c) => '<option value="' + esc(c) + '"' + (c === cur ? ' selected' : '') + '>' + esc(c) + '</option>').join('');
    const monthOpts = (cur) => Array.from({ length: 24 }, (_, i) => '<option value="' + (i + 1) + '"' + (i + 1 === cur ? ' selected' : '') + '>' + mLab(i + 1) + '</option>').join('');
    modal('<button class="cm-close" onclick="compCloseModal()">✕</button>' +
      '<div class="cm-title">' + (isNew ? '新增' : '校正') + (kind === 'comp' ? '竞赛' : '证书') + '</div>' +
      '<div class="cm-short">' + (isNew ? '自己添加的条目会永久保存在本地' : '你的修改会覆盖内置数据') + '</div>' +
      '<div class="cm-form" style="margin-top:14px">' +
      '<div class="cm-field"><label>全称</label><input id="ce-name" value="' + esc(v.name) + '"></div>' +
      '<div class="cm-field"><label>简称（时间轴卡片上显示）</label><input id="ce-short" value="' + esc(v.short) + '"></div>' +
      '<div class="cm-row"><div class="cm-field"><label>分类</label><select id="ce-cat">' + opts(CATS[kind], v.cat) + '</select></div>' +
      '<div class="cm-field"><label>级别</label><select id="ce-level">' + opts(kind === 'comp' ? ['国家级', '省部级', '行业级', '校级'] : ['入门', '进阶', '高阶'], v.level) + '</select></div></div>' +
      '<div class="cm-row"><div class="cm-field"><label>' + (kind === 'comp' ? '报名开始' : '报考开始') + '</label><select id="ce-r1">' + monthOpts(v.regMonths ? v.regMonths[0] : 3) + '</select></div>' +
      '<div class="cm-field"><label>' + (kind === 'comp' ? '报名结束' : '报考结束') + '</label><select id="ce-r2">' + monthOpts(v.regMonths ? v.regMonths[1] : 4) + '</select></div></div>' +
      (kind === 'comp'
        ? '<div class="cm-row"><div class="cm-field"><label>比赛开始</label><select id="ce-m1">' + monthOpts(v.compMonths ? v.compMonths[0] : 5) + '</select></div>' +
          '<div class="cm-field"><label>比赛结束</label><select id="ce-m2">' + monthOpts(v.compMonths ? v.compMonths[1] : 6) + '</select></div></div>'
        : '<div class="cm-row"><div class="cm-field"><label>考试开始</label><select id="ce-m1">' + monthOpts(v.examMonths ? v.examMonths[0] : 6) + '</select></div>' +
          '<div class="cm-field"><label>考试结束</label><select id="ce-m2">' + monthOpts(v.examMonths ? v.examMonths[1] : 6) + '</select></div></div>') +
      '<div class="cm-row"><div class="cm-field"><label>官方网址</label><input id="ce-off" value="' + esc(v.official || '') + '"></div>' +
      '<div class="cm-field"><label>报名网址</label><input id="ce-reg" value="' + esc(v.register || '') + '"></div></div>' +
      '<div class="cm-field"><label>主办 / 主管</label><input id="ce-org" value="' + esc(v.organiser || '') + '"></div>' +
      (kind === 'comp'
        ? '<div class="cm-row"><div class="cm-field"><label>参赛形式</label><input id="ce-team" value="' + esc(v.team || '') + '"></div>' +
          '<div class="cm-field"><label>报名费</label><input id="ce-fee" value="' + esc(v.fee || '') + '"></div></div>'
        : '<div class="cm-row"><div class="cm-field"><label>有效期</label><input id="ce-valid" value="' + esc(v.valid || '') + '"></div>' +
          '<div class="cm-field"><label>备考周期</label><input id="ce-diff" value="' + esc(v.difficulty || '') + '"></div></div>' +
          '<div class="cm-field"><label>考试批次说明</label><input id="ce-batches" value="' + esc(v.batches || '') + '"></div>') +
      '<div class="cm-field"><label>提示 / 备注</label><textarea id="ce-tips">' + esc(v.tips || v.career || '') + '</textarea></div>' +
      '<div class="cm-actions">' +
      (isNew ? '' : '<button class="cm-btn" onclick="compDeleteEntry(\'' + kind + '\',\'' + id + '\')">删除这条</button>') +
      '<button class="cm-btn" onclick="compCloseModal()">取消</button>' +
      '<button class="cm-btn primary" onclick="compSaveEntry(\'' + kind + '\',\'' + (id || '') + '\')">保存</button></div></div>');
  };
  window.compSaveEntry = function (kind, id) {
    const name = $('ce-name').value.trim();
    if (!name) { toast('请填写全称', 'info'); return; }
    const g = (x) => Number($(x).value);
    const o = {
      name, short: $('ce-short').value.trim() || name.slice(0, 8),
      cat: $('ce-cat').value, level: $('ce-level').value,
      regMonths: [Math.min(g('ce-r1'), g('ce-r2')), Math.max(g('ce-r1'), g('ce-r2'))],
      official: $('ce-off').value.trim(), register: $('ce-reg').value.trim(),
      organiser: $('ce-org').value.trim(), tips: $('ce-tips').value.trim(),
      srcYear: new Date().getFullYear(), confidence: '高',
    };
    if (kind === 'comp') {
      o.compMonths = [Math.min(g('ce-m1'), g('ce-m2')), Math.max(g('ce-m1'), g('ce-m2'))];
      o.team = $('ce-team').value.trim(); o.fee = $('ce-fee').value.trim();
    } else {
      o.examMonths = [Math.min(g('ce-m1'), g('ce-m2')), Math.max(g('ce-m1'), g('ce-m2'))];
      o.valid = $('ce-valid').value.trim(); o.difficulty = $('ce-diff').value.trim(); o.batches = $('ce-batches').value.trim();
    }
    const list = readCustom(kind);
    const targetId = id || (kind === 'comp' ? 'u_c_' : 'u_k_') + uid('');
    const idx = list.findIndex((x) => x.id === targetId);
    const rec = Object.assign({}, o, { id: targetId, kind });
    if (idx >= 0) list[idx] = Object.assign({}, list[idx], rec); else list.push(rec);
    writeCustom(kind, list);
    compCloseModal(); toast('已保存', 'success');
    renderComp(); renderCert();
  };
  window.compDeleteEntry = function (kind, id) {
    if (!confirm('删除这一条？（你的自定义条目会被移除；若是内置条目，将恢复为内置数据）')) return;
    writeCustom(kind, readCustom(kind).filter((x) => x.id !== id));
    compCloseModal(); toast('已删除'); renderComp(); renderCert();
  };

  /* ================= ⑤ 回忆录（时间机器） ================= */
  let _dbp = null;
  function idb() {
    return new Promise((res) => {
      if (_dbp) return res(_dbp);
      if (!window.indexedDB) return res(null);
      const rq = indexedDB.open('pw_comp', 1);
      rq.onupgradeneeded = () => { const d = rq.result; if (!d.objectStoreNames.contains('imgs')) d.createObjectStore('imgs'); };
      rq.onsuccess = () => { _dbp = rq.result; res(_dbp); };
      rq.onerror = () => res(null);
    });
  }
  function idbSet(k, v) {
    return idb().then((d) => new Promise((res) => {
      if (!d) return res(false);
      const tx = d.transaction('imgs', 'readwrite'); tx.objectStore('imgs').put(v, k);
      tx.oncomplete = () => res(true); tx.onerror = () => res(false);
    }));
  }
  function idbGet(k) {
    return idb().then((d) => new Promise((res) => {
      if (!d) return res(null);
      const tx = d.transaction('imgs', 'readonly'); const rq = tx.objectStore('imgs').get(k);
      rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null);
    }));
  }
  function compImg(file, cb) {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const MAX = 1000;
        let { width: w, height: h } = im;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(im, 0, 0, w, h);
        cb(c.toDataURL('image/jpeg', 0.72));
      };
      im.onerror = () => cb(null);
      im.src = fr.result;
    };
    fr.onerror = () => cb(null);
    fr.readAsDataURL(file);
  }

  let _draftImgs = [];
  window.compOpenMemoir = function (memoId, myId) {
    const m = memoId ? memoList().find((x) => x.id === memoId) : null;
    const my = myId ? myList().find((x) => x.id === myId) : null;
    _draftImgs = m ? (m.imgs || []).slice() : [];
    const title = m ? m.title : (my ? my.title + ' 回忆录' : '');
    const date = m ? m.date : todayStr();
    modal('<button class="cm-close" onclick="compCloseModal()">✕</button>' +
      '<div class="cm-title">' + (m ? '编辑回忆录' : '写下这场比赛的回忆') + '</div>' +
      '<div class="cm-short">写给未来回看的自己 · 时间机器</div>' +
      '<div class="cm-form" style="margin-top:14px">' +
      '<div class="cm-row"><div class="cm-field"><label>标题</label><input id="mr-title" value="' + esc(title) + '"></div>' +
      '<div class="cm-field"><label>日期</label><input type="date" id="mr-date" value="' + esc(date) + '"></div></div>' +
      '<div class="cm-row"><div class="cm-field"><label>结果 / 奖项</label><input id="mr-result" value="' + esc(m ? m.result || '' : '') + '" placeholder="如：省赛二等奖"></div>' +
      '<div class="cm-field"><label>心情</label><input id="mr-mood" value="' + esc(m ? m.mood || '' : '') + '" placeholder="如：累但值得"></div></div>' +
      '<div class="cm-field"><label>正文（队友、过程、收获、下次改进…）</label><textarea id="mr-text" style="min-height:150px">' + esc(m ? m.text || '' : '') + '</textarea></div>' +
      '<div class="cm-field"><label>照片（压缩后存在本地）</label><div class="mr-imgs" id="mr-imgs"></div></div>' +
      '<div class="cm-actions">' +
      (m ? '<button class="cm-btn" onclick="compDelMemoir(\'' + m.id + '\')">删除</button>' : '') +
      '<button class="cm-btn" onclick="compCloseModal()">取消</button>' +
      '<button class="cm-btn primary" onclick="compSaveMemoir(\'' + (memoId || '') + '\',\'' + (myId || '') + '\')">保存回忆</button></div></div>');
    renderDraftImgs();
  };
  function renderDraftImgs() {
    const box = $('mr-imgs');
    if (!box) return;
    box.innerHTML = _draftImgs.map((id, i) =>
      '<div class="mr-img"><img src="' + id + '" alt=""><span class="x" onclick="compDelDraftImg(' + i + ')">✕</span></div>').join('') +
      '<div class="mr-add" onclick="$(\'mr-file\').click()">＋</div>' +
      '<input type="file" id="mr-file" accept="image/*" multiple style="display:none" onchange="compPickImgs(this)">';
  }
  window.compPickImgs = function (input) {
    const files = Array.from(input.files || []).slice(0, 9);
    let left = files.length;
    if (!left) return;
    files.forEach((f) => {
      compImg(f, (data) => {
        if (data) _draftImgs.push(data);
        left--;
        if (!left) { renderDraftImgs(); toast('图片已压缩并暂存', 'success'); }
      });
    });
  };
  window.compDelDraftImg = function (i) { _draftImgs.splice(i, 1); renderDraftImgs(); };
  window.compSaveMemoir = function (memoId, myId) {
    const t = $('mr-title').value.trim();
    if (!t) { toast('给这段回忆起个标题吧', 'info'); return; }
    const l = memoList();
    const rec = {
      id: memoId || uid('mr'), title: t, date: $('mr-date').value || todayStr(),
      result: $('mr-result').value.trim(), mood: $('mr-mood').value.trim(),
      text: $('mr-text').value.trim(), myId: myId || (memoId ? (l.find((x) => x.id === memoId) || {}).myId : '') || '',
      imgs: _draftImgs.slice(), updatedAt: new Date().toISOString(),
    };
    const i = l.findIndex((x) => x.id === rec.id);
    if (i >= 0) l[i] = rec; else l.push(rec);
    memoSave(l);
    S.memoYear = Number(rec.date.slice(0, 4));
    compCloseModal(); toast('已存进时间机器 📖', 'success');
    renderComp();
  };
  window.compDelMemoir = function (id) {
    if (!confirm('删除这份回忆录？删除后无法恢复。')) return;
    memoSave(memoList().filter((x) => x.id !== id));
    compCloseModal(); toast('已删除'); renderComp();
  };

  function memoirHtml() {
    const all = memoList().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (!all.length) {
      return '<div class="comp-empty">还没有回忆录。把一场比赛标记为「已完赛」，然后写下当时的队友、熬夜、遗憾和高光 —— 以后回看会很有意思。</div>';
    }
    const years = Array.from(new Set(all.map((m) => (m.date || '').slice(0, 4)))).sort((a, b) => b - a);
    if (years.indexOf(String(S.memoYear)) < 0) S.memoYear = Number(years[0]);
    const list = all.filter((m) => (m.date || '').slice(0, 4) === String(S.memoYear));

    const nav = '<div class="tm-nav">' +
      '<button class="comp-tab" onclick="compMemoYear(-1)">‹ 上一年</button>' +
      '<div class="tm-year">' + S.memoYear + '</div>' +
      '<button class="comp-tab" onclick="compMemoYear(1)">下一年 ›</button>' +
      '<div style="margin-left:auto;font-size:12px;color:var(--text-3)">共 ' + all.length + ' 篇 · 本年 ' + list.length + ' 篇</div></div>';

    if (!list.length) return nav + '<div class="comp-empty">' + S.memoYear + ' 年没有回忆录，换一年看看。</div>';

    return nav + '<div class="mr-grid">' + list.map((m) => {
      const cover = m.imgs && m.imgs.length
        ? '<div class="mr-cover" style="background-image:url(' + m.imgs[0] + ')"></div>'
        : '<div class="mr-cover">📖 无照片</div>';
      return '<div class="mr-card mr-open" onclick="compViewMemoir(\'' + m.id + '\')">' + cover +
        '<div class="mr-body"><div class="mr-title">' + esc(m.title) + '</div>' +
        '<div class="mr-sub">' + esc(m.date) + (m.result ? ' · ' + esc(m.result) : '') + (m.mood ? ' · ' + esc(m.mood) : '') + '</div>' +
        '<div class="mr-text">' + esc(m.text || '（没有写正文）') + '</div></div></div>';
    }).join('') + '</div>';
  }
  window.compMemoYear = function (d) { S.memoYear += d; renderComp(); };
  window.compViewMemoir = function (id) {
    const m = memoList().find((x) => x.id === id);
    if (!m) return;
    modal('<button class="cm-close" onclick="compCloseModal()">✕</button>' +
      '<div class="cm-short">时间机器 · ' + esc(m.date) + '</div>' +
      '<div class="cm-title">' + esc(m.title) + '</div>' +
      '<div class="cm-tags">' + (m.result ? '<span class="comp-tag gold">' + esc(m.result) + '</span>' : '') +
      (m.mood ? '<span class="comp-tag">' + esc(m.mood) + '</span>' : '') + '</div>' +
      '<div class="cm-sec" style="font-size:14px;line-height:1.9;white-space:pre-wrap">' + esc(m.text || '（没有写正文）') + '</div>' +
      (m.imgs && m.imgs.length ? '<div class="mr-view-imgs">' + m.imgs.map((s) => '<img src="' + s + '" onclick="window.open(this.src)">').join('') + '</div>' : '') +
      '<div class="cm-actions" style="margin-top:16px"><button class="cm-btn" onclick="compCloseModal()">合上</button>' +
      '<button class="cm-btn primary" onclick="compOpenMemoir(\'' + m.id + '\')">编辑</button></div>');
  };

  /* ================= 页面渲染 ================= */
  const TABS = {
    comp: [['gantt', '竞赛日历'], ['timeline', '时间轴'], ['my', '我的参赛'], ['memoir', '比赛回忆录']],
    cert: [['gantt', '考试日历'], ['timeline', '时间轴'], ['my', '我的证书']],
  };
  function shell(kind, subtitle, body) {
    const st = S[kind];
    const chips = ['全部'].concat(CATS[kind]).map((c) =>
      '<span class="comp-chip' + (st.cat === c ? ' on' : '') + '" onclick="compSetCat(\'' + kind + '\',\'' + c + '\')">' + esc(c) + '</span>').join('');
    const showFilters = st.tab === 'gantt' || st.tab === 'timeline';
    return '<div class="comp-tabs">' + TABS[kind].map(([k, label]) =>
      '<span class="comp-tab' + (st.tab === k ? ' active' : '') + '" onclick="compSetTab(\'' + kind + '\',\'' + k + '\')">' + label + '</span>').join('') +
      '<span style="margin-left:auto"></span>' +
      '<button class="btn btn-ghost btn-sm" onclick="compEditEntry(\'' + kind + '\',\'\')">＋ 新增' + (kind === 'comp' ? '竞赛' : '证书') + '</button></div>' +
      '<p class="comp-sub">' + subtitle + '</p>' +
      (showFilters ? '<div class="comp-filters">' + chips +
        '<span class="comp-chip' + (st.onlyMine ? ' on' : '') + '" onclick="compToggleMine(\'' + kind + '\')">只看我加入的</span>' +
        '<span class="comp-year"><button onclick="compYear(\'' + kind + '\',-1)">‹</button><span>' + st.year + ' – ' + (st.year + 1) + ' 赛季</span><button onclick="compYear(\'' + kind + '\',1)">›</button></span></div>' : '') +
      body;
  }
  window.compSetTab = function (kind, t) { S[kind].tab = t; kind === 'comp' ? renderComp() : renderCert(); };
  window.compSetCat = function (kind, c) { S[kind].cat = c; kind === 'comp' ? renderComp() : renderCert(); };
  window.compToggleMine = function (kind) { S[kind].onlyMine = !S[kind].onlyMine; kind === 'comp' ? renderComp() : renderCert(); };
  window.compYear = function (kind, d) { S[kind].year += d; kind === 'comp' ? renderComp() : renderCert(); };

  function renderComp() {
    const box = $('comp-mount');
    if (!box) return;
    let body = '';
    if (S.comp.tab === 'gantt') body = ganttHtml('comp');
    else if (S.comp.tab === 'timeline') body = timelineHtml('comp');
    else if (S.comp.tab === 'my') body = myHtml('comp');
    else body = memoirHtml();
    box.innerHTML = shell('comp', '报名时间每年浮动，表中月份为往年惯例区间 —— 点开任意一条可查看流程、官网与报名网址，并就地校正为你掌握的准确日期。', body);
  }
  function renderCert() {
    const box = $('cert-mount');
    if (!box) return;
    let body = '';
    if (S.cert.tab === 'gantt') body = ganttHtml('cert');
    else if (S.cert.tab === 'timeline') body = timelineHtml('cert');
    else body = myHtml('cert');
    box.innerHTML = shell('cert', '证书按年度批次排列，加入「我的证书」后可跟踪报考节点、成绩与有效期到期时间。', body);
  }
  window.renderCompPage = renderComp;
  window.renderCertPage = renderCert;

  /* ================= 仪表板联动 ================= */
  function upcoming(limit) {
    const t = todayStr();
    const out = [];
    myList().forEach((m) => {
      (m.milestones || []).forEach((x) => {
        if (!x.date || x.date < t) return;
        out.push({ d: daysTo(x.date), title: m.title, label: x.label, date: x.date, kind: m.kind });
      });
    });
    return out.sort((a, b) => a.d - b.d).slice(0, limit || 3);
  }
  function renderDashCard() {
    const grid = document.querySelector('#dashboard-section .card-grid');
    if (!grid) return;
    let card = $('dash-comp-card');
    if (!card) {
      card = el('div', 'card'); card.id = 'dash-comp-card';
      card.innerHTML = '<h3 class="card-title">竞赛 / 证书倒计时</h3><div class="cd-mini" id="dash-comp-body"></div>';
      grid.appendChild(card);
    }
    const list = upcoming(3);
    const body = $('dash-comp-body');
    if (!body) return;
    if (!list.length) {
      body.innerHTML = '<div style="font-size:12px;color:var(--text-3)">还没有加入比赛或证书。到「竞赛时间表」里挑一个吧。</div>';
      return;
    }
    body.innerHTML = list.map((x) =>
      '<div class="cd-mini-row"><span class="n">' + x.d + '天</span>' +
      '<span class="t">' + esc(x.title) + ' · ' + esc(x.label) + '</span>' +
      '<span class="d">' + esc(x.date.slice(5)) + '</span></div>').join('') +
      '<div style="font-size:12px;color:var(--text-3);margin-top:2px"><a href="javascript:;" onclick="switchPage(\'comp\')" style="color:var(--gold)">查看全部 ›</a></div>';
  }
  window.compUpcoming = upcoming;

  /* ================= 启动 ================= */
  function boot() {
    renderDashCard();
    /* 每天零点后重算倒计时（页面长期开着时） */
    let last = todayStr();
    setInterval(() => {
      const t = todayStr();
      if (t !== last) { last = t; renderComp(); renderCert(); renderDashCard(); }
    }, 60000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
