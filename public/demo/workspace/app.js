/* ============================================================
 * 个人工作台 · 前端逻辑 (app.js)
 * 纯前端 + Web Crypto 真加密 + 本地后端代理智谱 AI
 * ============================================================ */
(function () {
  'use strict';

  /* ---------------------- 存储层 ---------------------- */
  const DB = {
    p: (k) => 'pw_' + k,
    get(k, def) {
      const v = localStorage.getItem(this.p(k));
      try { return v ? JSON.parse(v) : def; } catch (e) { return def; }
    },
    set(k, v) { localStorage.setItem(this.p(k), JSON.stringify(v)); },
    del(k) { localStorage.removeItem(this.p(k)); },
  };

  // 本地时区日期键（YYYY-MM-DD）。
  // ⚠️ 全项目统一用它取「日期」，不要用 toISOString().slice(0,10)：后者按 UTC 取日期，
  // 在东八区（UTC+8）会把本地 0:00–8:00 的时间点、以及所有 new Date(y,m,d) 的本地零点
  // 都算成「前一天」，导致日历高亮错位、导出日期差一天、连续打卡天数不准。
  const localDateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = () => localDateKey(new Date());
  const weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const fmtDate = (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekday[d.getDay()]}`;

  // API 基地址：默认用相对路径（经 HTTP 服务器访问时同源）。
  // 若用户直接用 file:// 双击打开本文件，则自动指向本地服务器，配合 server.js 的 CORS 头即可跨域访问后端。
  const API_BASE = (typeof location !== 'undefined' && location.protocol === 'file:') ? 'http://localhost:8787' : '';

  /* ---------------------- 工具 ---------------------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function toast(msg, type) {
    const t = el('div', 'pw-toast ' + (type || 'info'), msg);
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
  }
  // 安全的 base64 <-> ArrayBuffer
  function bufToB64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }
  function b64ToBuf(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  /* ---------------------- 智谱 AI 客户端 ----------------------
   * 通过本地后端 /api/ai 转发。优先使用用户在「设置」中配置的 AI 服务
   * （baseUrl + apiKey + model），否则回退到服务端 config.json 的智谱 Key。
   * 无后端 / 无 Key 时返回 null，由调用方走本地兜底。 */
  const PROVIDERS = {
    zhipu:   { name: '智谱 AI',   baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4.7-flash' },
    openai:  { name: 'ChatGPT',   baseUrl: 'https://api.openai.com/v1/chat/completions',          model: 'gpt-4o-mini' },
    codex:   { name: 'Codex',     baseUrl: 'https://api.openai.com/v1/chat/completions',          model: 'gpt-4o' },
    kimi:    { name: 'Kimi',      baseUrl: 'https://api.moonshot.cn/v1/chat/completions',          model: 'moonshot-v1-8k' },
    gemini:  { name: 'Gemini',    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-1.5-flash' },
    deepseek:{ name: 'DeepSeek',  baseUrl: 'https://api.deepseek.com/chat/completions',            model: 'deepseek-chat' },
    qwen:    { name: '千问',      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
    alibaba: { name: '阿里',      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-max' },
    custom:  { name: '自定义',    baseUrl: '', model: '' },
  };
  function onProviderChange() {
    const p = PROVIDERS[$('ai-provider').value];
    if (p && p.baseUrl) {
      $('ai-baseurl').value = p.baseUrl;
      $('ai-model').value = p.model;
    } else {
      $('ai-baseurl').value = '';
      $('ai-model').value = '';
    }
  }
  function loadAIConfig() {
    const cfg = DB.get('ai_config', null);
    if (cfg) {
      $('ai-provider').value = cfg.provider || 'custom';
      $('ai-baseurl').value = cfg.baseUrl || '';
      $('ai-model').value = cfg.model || '';
      $('ai-key').value = cfg.apiKey || '';
      const st = $('ai-config-status');
      st.textContent = '已配置：' + (PROVIDERS[cfg.provider] ? PROVIDERS[cfg.provider].name : cfg.provider || '自定义') + '（' + (cfg.model || '') + '）✅';
      st.style.background = 'rgba(47,158,111,.12)';
    } else {
      $('ai-provider').value = 'zhipu';
      onProviderChange();
      const st = $('ai-config-status');
      st.textContent = '尚未配置本地 AI，将使用服务端 / 本地兜底。';
      st.style.background = '';
    }
  }
  async function saveAIConfig() {
    const provider = $('ai-provider').value;
    const baseUrl = $('ai-baseurl').value.trim();
    const model = $('ai-model').value.trim();
    const apiKey = $('ai-key').value.trim();
    if (!baseUrl) { toast('请填写 API Base URL', 'error'); return; }
    if (!apiKey) { toast('请填写 API Key', 'error'); return; }
    DB.set('ai_config', { provider, baseUrl, model, apiKey });
    toast('AI 配置已保存，正在测试连接…', 'info');
    loadAIConfig();
    // 连通性测试：用刚保存的配置发一次极简请求，给出成功/失败提示
    const probe = await callAI([{ role: 'user', content: 'ping' }], { max_tokens: 8, probe: true });
    if (probe.ok) {
      toast('🎉 AI 连接成功，可正常使用', 'success');
    } else if (probe.reason === 'RATE_LIMIT') {
      toast('配置已保存，但当前接口限流，稍后自动恢复', 'info');
    } else {
      toast('配置已保存，但连接测试失败：' + (probe.message || probe.reason) + '（实际使用时将走本地兜底）', 'error');
    }
    loadSettings();
  }
  function clearAIConfig() {
    DB.del('ai_config');
    toast('已清除本地 AI 配置，回退到服务端', 'info');
    loadAIConfig();
  }
  // AI 限流保护：一旦上游返回 429，进入冷却期，期间直接走本地兜底，不再发网络请求（杜绝控制台 429 刷屏）
  let aiCooldownUntil = 0;
  const AI_COOLDOWN_MS = 5 * 60 * 1000; // 5 分钟
  let aiThrottleNotified = false;
  // 串行化 AI 请求，避免并发突刺触发限流
  let aiChain = Promise.resolve();

  // callAI 统一返回 { ok, content, reason, message }，便于调用方给出成功/失败提示
  async function doCallAI(body, opts) {
    try {
      const resp = await fetch(API_BASE + '/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json().catch(() => null);
      if (data && data.ok) {
        return { ok: true, content: opts.json ? (data.data || null) : data.content };
      }
      // 上游限流：进入冷却期，后续请求直接走本地兜底（探测请求 probe 不触发冷却）
      if (data && data.error === 'RATE_LIMIT') {
        if (!opts.probe) {
          aiCooldownUntil = Date.now() + AI_COOLDOWN_MS;
          if (!aiThrottleNotified) {
            aiThrottleNotified = true;
            toast('AI 接口已达速率上限，已切换为本地内容，几分钟后自动恢复。', 'error');
          }
        }
        return { ok: false, reason: 'RATE_LIMIT', message: (data && data.message) || '限流' };
      }
      if (data && data.error === 'NO_KEY') {
        return { ok: false, reason: 'NO_KEY', message: (data && data.message) || '未配置 Key' };
      }
      return { ok: false, reason: (data && data.error) || 'UPSTREAM', message: (data && data.message) || '上游调用失败' };
    } catch (e) {
      return { ok: false, reason: 'NETWORK', message: '网络错误：' + e.message };
    }
  }

  async function callAI(messages, opts) {
    opts = opts || {};
    // 冷却期内：不发起任何请求，直接返回失败让调用方走本地兜底
    if (Date.now() < aiCooldownUntil) return { ok: false, reason: 'COOLDOWN', message: '限流冷却中' };
    const ai = DB.get('ai_config', null);
    const body = {
      messages,
      json: !!opts.json,
      temperature: opts.temperature != null ? opts.temperature : 0.8,
      max_tokens: opts.max_tokens != null ? opts.max_tokens : 1024,
      model: opts.model || null,
    };
    if (ai && ai.apiKey && ai.baseUrl) {
      body.provider = ai.provider || 'custom';
      body.baseUrl = ai.baseUrl;
      body.apiKey = ai.apiKey;
      body.model = ai.model || opts.model || null;
    }
    if (opts.cache) body.cache = true; // 仅确定性的请求（如每日鸡汤）才缓存
    const run = aiChain.then(() => doCallAI(body, opts));
    aiChain = run.then(() => {}, () => {});
    return run;
  }

  /* ---------------------- 天气（Open-Meteo，免 Key） ---------------------- */
  function weatherDesc(code) {
    const m = {
      0: '晴', 1: '大致晴朗', 2: '局部多云', 3: '阴',
      45: '雾', 48: '雾凇',
      51: '小毛毛雨', 53: '毛毛雨', 55: '大毛毛雨',
      61: '小雨', 63: '中雨', 65: '大雨',
      66: '冻雨', 67: '强冻雨',
      71: '小雪', 73: '中雪', 75: '大雪', 77: '雪粒',
      80: '阵雨', 81: '强阵雨', 82: '暴雨',
      85: '阵雪', 86: '强阵雪',
      95: '雷暴', 96: '雷暴伴冰雹', 99: '强雷暴伴冰雹',
    };
    return m[code] != null ? m[code] : '未知';
  }
  async function loadWeather() {
    const s = DB.get('settings', { city: '上海', lat: 31.2304, lon: 121.4737 });
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}&current=temperature_2m,weather_code`;
      const r = await fetch(url);
      const d = await r.json();
      const t = Math.round(d.current.temperature_2m);
      const desc = weatherDesc(d.current.weather_code);
      $('dash-temp').textContent = t + '°C';
      $('dash-weather').textContent = desc + ' · ' + s.city;
      return { t, desc };
    } catch (e) {
      $('dash-temp').textContent = '--°C';
      $('dash-weather').textContent = '天气获取失败（离线）';
      return null;
    }
  }

  /* ---------------------- 心灵鸡汤 ---------------------- */
  const MOCK_QUOTES = [
    { chinese: '把每一天，过成值得收藏的作品。', english: 'Make each day a piece worth keeping.' },
    { chinese: '微小的坚持，终会照亮远方。', english: 'Small persistence eventually lights the distance.' },
    { chinese: '今天的努力，是给未来的自己写信。', english: 'Today’s effort is a letter to your future self.' },
    { chinese: '慢一点也没关系，只要在前行。', english: 'Going slow is fine, as long as you move forward.' },
    { chinese: '你不需要很厉害才能开始，但开始了就会变厉害。', english: 'You need not be great to start, but you start to be great.' },
  ];
  async function getMotivation() {
    const cached = DB.get('motivation', null);
    if (cached && cached.date === todayStr()) {
      return cached;
    }
    const r = await callAI([
      { role: 'system', content: '你是温暖治愈的中文心灵鸡汤写手。每日为用户生成一段中英双语鼓励语。要求：中文不超过50字，积极温暖；英文为对应翻译，简洁。只输出 JSON，格式：{"chinese":"...","english":"..."}，不要任何多余文字。' },
      { role: 'user', content: '请生成今天的每日鸡汤。' },
    ], { json: true, temperature: 1.0, max_tokens: 200, cache: true });
    let result;
    if (r.ok && r.content && r.content.chinese) {
      result = { date: todayStr(), chinese: r.content.chinese, english: r.content.english };
    } else {
      result = Object.assign({ date: todayStr() }, MOCK_QUOTES[Math.floor(Math.random() * MOCK_QUOTES.length)]);
    }
    DB.set('motivation', result);
    return result;
  }
  async function renderMotivation() {
    const q = await getMotivation();
    if ($('motivation-text')) { $('motivation-text').textContent = q.chinese; $('motivation-en').textContent = q.english; }
    if ($('dash-motivation')) $('dash-motivation').textContent = q.chinese;
    if ($('dash-motivation-en')) $('dash-motivation-en').textContent = q.english;
  }

  /* ---------------------- 导航 / 主题 ---------------------- */
  const PAGE_NAMES = {
    dashboard: '仪表板', checkin: '签到打卡', tasks: '每日任务', english: '英语学习',
    cet4: '英语四级冲刺', diary: '每日日记', music: 'Music 专区', ledger: '记帐本', calendar: '日历',
    reports: '报表', private: '私密空间', settings: '设置', collect: '信息搜集',
    convert: '文件格式转换',
  };
  function switchPage(page) {
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.page === page));
    document.querySelectorAll('.content-section').forEach((s) => s.classList.remove('active'));
    const sec = $(page + '-section');
    if (sec) sec.classList.add('active');
    if ($('page-title')) $('page-title').textContent = PAGE_NAMES[page] || '个人工作台';
    if ($('current-date')) $('current-date').textContent = fmtDate(new Date());
    // 各模块加载
    if (page === 'dashboard') { loadDashboard(); }
    else if (page === 'checkin') { loadCheckin(); }
    else if (page === 'tasks') { loadTasks(); }
    else if (page === 'english') { loadVocab(); }
    else if (page === 'cet4') { if (window.PW && window.PW.onCet4) window.PW.onCet4(); }
    else if (page === 'diary') { loadDiary(); }
    else if (page === 'ledger') { loadLedger(); }
    else if (page === 'calendar') { renderCalendar(); }
    else if (page === 'reports') { /* 按需生成 */ }
    else if (page === 'private') { loadPrivate(); }
    else if (page === 'settings') { loadSettings(); }
    else if (page === 'collect') { if (window.Collect) window.Collect.render(); }
    else if (page === 'convert') { if (window.Convert) window.Convert.render(); }
  }
  /* ---------------------- 登录加载编排 ---------------------- */
  function setLoadStage(id, state, statusText) {
    const row = document.querySelector('.load-stage[data-stage="' + id + '"]');
    if (!row) return;
    row.classList.remove('pending', 'active', 'done');
    row.classList.add(state);
    const sp = row.querySelector('.stage-status');
    if (state === 'active' && sp) sp.textContent = statusText || '进行中…';
    else if (state === 'done' && sp) sp.textContent = '完成 ✓';
    const total = 4;
    const done = document.querySelectorAll('.load-stage.done').length;
    const fill = $('loading-bar-fill');
    if (fill) fill.style.width = (done / total * 100) + '%';
  }
  function setLoadStatus(id, msg) {
    const row = document.querySelector('.load-stage[data-stage="' + id + '"]');
    if (!row || !row.classList.contains('active')) return;
    const sp = row.querySelector('.stage-status');
    if (sp) sp.textContent = msg;
  }
  async function runLoginLoading() {
    const overlay = $('login-loading');
    if (overlay) overlay.classList.add('show');
    const stages = [
      { id: 'ai', fn: async () => { if (window.PW && window.PW.preloadBootstrap) await window.PW.preloadBootstrap(); } },
      { id: 'home', fn: async () => {
          if (window.PW && window.PW.renderMotivation) await window.PW.renderMotivation();
        } },
      { id: 'english', fn: async () => { if (window.PW && window.PW.preloadEnglish) await window.PW.preloadEnglish(); } },
      { id: 'market', fn: async () => { if (window.PW && window.PW.preloadMarket) await window.PW.preloadMarket(); } },
    ];
    const start = Date.now();
    const HARD_CAP = 120000; // 安全上限：超过 120s 强制进入，避免 AGNES 异常时卡死
    for (const s of stages) {
      setLoadStage(s.id, 'active');
      try { await s.fn((m) => setLoadStatus(s.id, m)); }
      catch (e) { console.error('登录加载阶段失败：', s.id, e); }
      setLoadStage(s.id, 'done');
      if (Date.now() - start > HARD_CAP) break;
    }
    if (overlay) overlay.classList.remove('show');
  }
  async function enterApp() {
    await runLoginLoading();
    $('login-view').classList.remove('active');
    $('app-view').classList.add('active');
    switchPage('dashboard');
    loadWeather();
    // 扩展模块钩子：登录自检弹窗等（内容生成已移至加载阶段，不再重复）
    if (window.PW && window.PW.bootDaily) window.PW.bootDaily();
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    DB.set('theme', theme);
    const btn = $('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀' : '☾';
  }

  /* ---------------------- 仪表板 ---------------------- */
  function getTodayCheckin() {
    const all = DB.get('checkin', {});
    return all[todayStr()] || null;
  }
  function getPoints() { return DB.get('points', 0); }
  function getTaskDoneToday() { const m = DB.get('task_done', {}); return m[todayStr()] || []; }
  function getTaskCount() { return DB.get('tasks', []).length; }
  function loadDashboard() {
    const c = getTodayCheckin();
    $('dash-morning').textContent = c && c.morning ? c.morning : '未签到';
    $('dash-evening').textContent = c && c.evening ? c.evening : '未签到';
    const done = getTaskDoneToday().length;
    $('dash-tasks-done').textContent = done;
    $('dash-tasks-total').textContent = getTaskCount();
    $('dash-points').textContent = getPoints();
    // 连续打卡天数
    const all = DB.get('checkin', {});
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 60; i++) {
      const key = localDateKey(d);
      const rec = all[key];
      if (rec && rec.morning && rec.evening) streak++;
      else if (i > 0) break;
      d.setDate(d.getDate() - 1);
    }
    $('dash-streak').textContent = streak;
  }

  /* ---------------------- 签到 ---------------------- */
  function nowHM() {
    const d = new Date();
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }
  function saveCheckin(type) {
    const all = DB.get('checkin', {});
    const key = todayStr();
    if (!all[key]) all[key] = {};
    all[key][type] = nowHM();
    DB.set('checkin', all);
  }
  function loadCheckin() {
    const c = getTodayCheckin();
    $('checkin-morning-status').textContent = c && c.morning ? '已签到 ' + c.morning : '未签到';
    $('checkin-evening-status').textContent = c && c.evening ? '已签到 ' + c.evening : '未签到';
    $('checkin-morning-time').textContent = new Date().toLocaleTimeString('zh-CN');
    $('checkin-evening-time').textContent = new Date().toLocaleTimeString('zh-CN');
  }
  function morningCheckin() {
    const c = getTodayCheckin();
    if (c && c.morning) { toast('早上已经签到过啦', 'info'); return; }
    saveCheckin('morning');
    toast('早上签到成功 🌞 ' + nowHM(), 'success');
    loadCheckin(); loadDashboard();
  }
  function eveningCheckin() {
    const c = getTodayCheckin();
    if (c && c.evening) { toast('晚上已经签到过啦', 'info'); return; }
    saveCheckin('evening');
    toast('晚上签到成功 🌙 ' + nowHM(), 'success');
    loadCheckin(); loadDashboard();
  }

  /* ---------------------- 任务 ---------------------- */
  const DEFAULT_PLAN = [
    { title: '晨间冥想 / 拉伸 10 分钟', category: '健康', points: 1 },
    { title: '阅读专业书籍 30 分钟', category: '学习', points: 1 },
    { title: '完成一项英语学习（单词 + 听写）', category: '英语', points: 1 },
    { title: '写今日日记并完成早晚打卡', category: '复盘', points: 1 },
    { title: '复习昨日任务清单', category: '规划', points: 1 },
    { title: '运动 30 分钟', category: '健康', points: 1 },
  ];
  function loadDefaultPlan() {
    if (DB.get('tasks', []).length > 0) {
      if (!confirm('已存在任务清单，确定用内置每日规划覆盖吗？')) return;
    }
    const tasks = DEFAULT_PLAN.map((t, i) => ({ id: 't' + Date.now() + '_' + i, title: t.title, category: t.category, points: t.points || 1 }));
    DB.set('tasks', tasks);
    toast('已载入内置每日规划（' + tasks.length + ' 项）', 'success');
    loadTasks(); loadDashboard();
  }
  function parsePlanRows(rows) {
    const tasks = [];
    rows.forEach((row, i) => {
      const title = row['任务'] || row['任务名称'] || row['Task'] || row['title'] || row['名称'];
      if (!title) return;
      const category = row['类别'] || row['Category'] || row['分类'] || '其他';
      const points = parseInt(row['积分'] || row['Points'] || row['points'] || '1', 10) || 1;
      tasks.push({ id: 't' + Date.now() + '_' + i, title: String(title), category: String(category), points });
    });
    return tasks;
  }
  function uploadPlan(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        const tasks = parsePlanRows(rows);
        if (tasks.length === 0) { toast('未识别到任务列，请确认表头含「任务/任务名称」', 'error'); return; }
        if (DB.get('tasks', []).length > 0 && !confirm('已存在任务清单，确定覆盖吗？')) return;
        DB.set('tasks', tasks);
        toast('已导入 ' + tasks.length + ' 项任务', 'success');
        loadTasks(); loadDashboard();
      } catch (err) {
        toast('解析文件失败：' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }
  function completeTask(id) {
    const done = DB.get('task_done', {});
    const today = todayStr();
    if (!done[today]) done[today] = [];
    if (done[today].indexOf(id) >= 0) { toast('今天已完成该项 💡', 'info'); return; }
    const tasks = DB.get('tasks', []);
    const task = tasks.find((t) => t.id === id);
    done[today].push(id);
    DB.set('task_done', done);
    DB.set('points', getPoints() + (task ? task.points : 1));
    toast('完成：「' + (task ? task.title : '') + '」 +' + (task ? task.points : 1) + ' 积分', 'success');
    loadTasks(); loadDashboard();
  }
  function loadTasks() {
    const tasks = DB.get('tasks', []);
    const done = getTaskDoneToday();
    $('task-points').textContent = getPoints();
    const list = $('tasks-list');
    list.innerHTML = '';
    if (tasks.length === 0) {
      list.appendChild(el('div', 'pw-empty', '暂无任务。点击「载入内置规划」或「上传 Excel/CSV」开始。'));
      return;
    }
    tasks.forEach((t) => {
      const isDone = done.indexOf(t.id) >= 0;
      const item = el('div', 'task-item' + (isDone ? ' done' : ''));
      item.innerHTML =
        '<label class="task-check"><input type="checkbox" ' + (isDone ? 'checked disabled' : '') + ' onchange="completeTask(\'' + t.id + '\')"><span class="task-text">' + escapeHtml(t.title) + '</span></label>' +
        '<span class="task-meta">' + escapeHtml(t.category || '') + '</span>' +
        '<span class="task-points">+' + t.points + '</span>';
      list.appendChild(item);
    });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  // 日记正文是富文本 HTML（含 <p>/<img> 等）。写进日报文本、发给 AI 之前必须先转纯文本，
  // 否则报告里会直接出现 "<p>今天的日记</p>" 这种标签垃圾。
  function stripHtml(s) {
    return String(s || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, ' ').trim();
  }

  /* ---------------------- 英语学习 ---------------------- */
  const VOCAB = [
    { w: 'perseverance', m: '毅力，坚持不懈', e: 'Perseverance is the key to success.' },
    { w: 'diligent', m: '勤奋的', e: 'He is a diligent student.' },
    { w: 'achievement', m: '成就', e: 'Winning was a great achievement.' },
    { w: 'passion', m: '热情', e: 'She has a passion for music.' },
    { w: 'dedication', m: '奉献', e: 'His dedication is admirable.' },
    { w: 'resilience', m: '韧性', e: 'Resilience helps you bounce back.' },
    { w: 'discipline', m: '自律', e: 'Discipline beats motivation.' },
    { w: 'curiosity', m: '好奇心', e: 'Curiosity drives learning.' },
    { w: 'gratitude', m: '感恩', e: 'Gratitude changes perspective.' },
    { w: 'focus', m: '专注', e: 'Focus is a superpower.' },
    { w: 'ambition', m: '抱负', e: 'Ambition fuels progress.' },
    { w: 'clarity', m: '清晰', e: 'Clarity precedes action.' },
  ];
  let currentVocab = null;
  // 兼容旧数据：早期 vocab_known / vocab_unknown 存的是字符串数组，统一成 {word, date}
  function normEntries(list) {
    return (list || []).map((x) => (typeof x === 'string' ? { word: x, date: '' } : x));
  }
  function loadVocab() {
    if (!currentVocab) newVocab();
    const known = normEntries(DB.get('vocab_known', []));
    const unk = normEntries(DB.get('vocab_unknown', []));
    const vs = $('vocab-stat'); if (vs) vs.textContent = '已掌握 ' + known.length + ' · 待巩固 ' + unk.length;
    renderWordbookStats();
    // 扩展模块钩子：渲染单词记忆闪卡（使用今日所选单词本）
    if (window.PW && window.PW.onEnglish) window.PW.onEnglish();
  }
  function newVocab() {
    currentVocab = VOCAB[Math.floor(Math.random() * VOCAB.length)];
    const w = $('vocab-word'), m = $('vocab-meaning'), e = $('vocab-example');
    if (w) w.textContent = currentVocab.w;
    if (m) m.textContent = currentVocab.m;
    if (e) e.textContent = currentVocab.e;
  }
  function markVocab(status) {
    if (!currentVocab) return;
    if (status === 'known') {
      // 「认识」= 已学习掌握，计入今日/累计学习单词数（带日期）
      const list = normEntries(DB.get('vocab_known', []));
      if (!list.some((x) => x.word === currentVocab.w)) list.push({ word: currentVocab.w, date: todayStr() });
      DB.set('vocab_known', list);
      toast('已标记为「认识」，计入今日学习单词', 'success');
    } else {
      // 「不认识」= 待巩固，仅收录进单词本，不计入学习统计
      const list = normEntries(DB.get('vocab_unknown', []));
      if (!list.some((x) => x.word === currentVocab.w)) list.push({ word: currentVocab.w, date: todayStr() });
      DB.set('vocab_unknown', list);
      addToWordbook(currentVocab);
      toast('已加入待巩固 + 单词本', 'success');
    }
    newVocab(); loadVocab();
  }
  /* 单词本：仅「不认识」时收录 */
  function addToWordbook(v) {
    const wb = DB.get('wordbook', []);
    if (wb.some((x) => x.word === v.w)) return;
    wb.push({ word: v.w, meaning: v.m, example: v.e, date: todayStr() });
    DB.set('wordbook', wb);
  }
  /* 学习统计：只统计「认识」的单词（今日学习 = 今天的「认识」；累计 = 全部「认识」）
   * 单词本（wordbook）仅收录「不认识」的单词，不计入上述统计。 */
  function renderWordbookStats() {
    const known = normEntries(DB.get('vocab_known', []));
    const today = known.filter((x) => x.date === todayStr()).length;
    if ($('wb-today')) $('wb-today').textContent = today;
    if ($('wb-total')) $('wb-total').textContent = known.length;
  }
  function renderWordbook() {
    renderWordbookStats();
    const wb = DB.get('wordbook', []);
    const box = $('wordbook-list');
    if (!box) return;
    box.innerHTML = '';
    if (wb.length === 0) {
      box.appendChild(el('div', 'wordbook-empty', '单词本还是空的。记忆时选择「不认识」，单词会自动收进来。'));
      return;
    }
    wb.slice().reverse().forEach((x) => {
      const item = el('div', 'wordbook-item');
      item.innerHTML = '<span class="wb-word">' + escapeHtml(x.word) + '</span>' +
        '<span class="wb-meaning">' + escapeHtml(x.meaning || '') + '</span>' +
        '<span class="wb-date">' + escapeHtml(x.date || '') + '</span>';
      box.appendChild(item);
    });
  }
  function switchEnglishTab(target, btn) {
    ['vocab-tab', 'dictation-tab', 'wordbook-tab'].forEach((id) => {
      const t = $(id); if (t) t.classList.toggle('active', id === target);
    });
    document.querySelectorAll('#english-section .tab-btn').forEach((b) => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    // 扩展模块钩子：按标签渲染对应内容（听写 / 单词本管理）
    if (window.PW && window.PW.onEnglishTab) window.PW.onEnglishTab(target);
  }
  const DICTATION_SENTENCES = [
    'Practice makes perfect.',
    'Where there is a will, there is a way.',
    'Knowledge is power.',
    'Better late than never.',
    'Actions speak louder than words.',
    'A journey of a thousand miles begins with a single step.',
    'The early bird catches the worm.',
    'Honesty is the best policy.',
  ];
  let currentSentence = DICTATION_SENTENCES[0];
  function newDictation() {
    currentSentence = DICTATION_SENTENCES[Math.floor(Math.random() * DICTATION_SENTENCES.length)];
    // features.js 的「听写专栏」会用新结构（#dict-sentence / #dict-input）整块替换该容器，
    // 旧元素此时已不存在，必须容错，否则点击即抛 TypeError 导致整个页面卡住。
    const t = $('dictation-text');
    if (t) t.textContent = '点击「播放」听写，然后输入你听到的内容';
  }
  function playDictation() {
    if (!('speechSynthesis' in window)) { toast('当前浏览器不支持语音播放', 'error'); return; }
    const u = new SpeechSynthesisUtterance(currentSentence);
    u.lang = 'en-US'; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  function checkDictation() {
    const input = $('dictation-input');
    if (!input) return; // 已切换到扩展版听写界面（#dict-input），由 pwCheckSentence 处理
    const inp = input.value.trim().toLowerCase().replace(/[.。\s]+/g, '');
    const ans = currentSentence.toLowerCase().replace(/[.。\s]+/g, '');
    if (inp === ans) { toast('听写正确！🎉', 'success'); }
    else { toast('再试一次，注意大小写与标点已忽略', 'error'); }
  }

  /* ---------------------- 日记 ---------------------- */
  function compressImage(file, cb) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1000;
        let { width, height } = img;
        if (width > maxW) { height = Math.round(height * maxW / width); width = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        try { cb(canvas.toDataURL('image/jpeg', 0.7)); }
        catch (err) { cb(e.target.result); }
      };
      img.onerror = () => cb(e.target.result);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  function insertAtCursor(html) {
    const ed = $('diary-editor');
    if (!ed) return;
    ed.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const frag = document.createRange().createContextualFragment(html);
      const last = frag.lastChild;
      range.insertNode(frag);
      if (last) { range.setStartAfter(last); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); }
    } else {
      ed.innerHTML += html;
    }
  }
  function saveDiary() {
    const date = $('diary-date').value || todayStr();
    if (date !== todayStr()) { toast('只能保存「今天」的日记', 'error'); return; }
    const ed = $('diary-editor');
    let content = ed.innerHTML.trim();
    if (!content || content === '<br>' || content === '<div></div>') { toast('请输入日记内容', 'error'); return; }
    const all = DB.get('diary', {});
    const prev = all[date] || {};
    all[date] = {
      content,
      images: Array.isArray(prev.images) ? prev.images : [], // 保留历史附件，避免每次保存把它清空
      time: new Date().toLocaleString('zh-CN'),
    };
    DB.set('diary', all);
    toast('日记已保存（' + date + '）', 'success');
  }
  function diaryPlainText() {
    const ed = $('diary-editor');
    let t = ed.innerText || '';
    t = t.replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    return t;
  }
  async function summarizeDiary() {
    const text = diaryPlainText();
    if (!text) { toast('日记为空，无法总结', 'error'); return; }
    const r = await callAI([
      { role: 'system', content: '你是贴心的日记助手。请用 2-3 句简洁中文总结下面这篇日记的要点与情绪，不要使用 markdown，不要重复原文长句。' },
      { role: 'user', content: text },
    ], { temperature: 0.6, max_tokens: 300 });
    const box = $('diary-summary');
    if (r.ok && r.content) {
      if (box) { box.textContent = r.content; box.style.display = 'block'; }
      toast('✨ AI 日记总结成功', 'success');
    } else {
      if (box) box.style.display = 'none';
      toast('⚠️ AI 总结失败：' + (r.message || '请稍后再试'), 'error');
    }
  }
  function loadDiary() {
    const di = $('diary-date');
    if (!di.value) di.value = todayStr();
    const date = di.value;
    const ed = $('diary-editor');
    const all = DB.get('diary', {});
    const entry = all[date];
    const isToday = date === todayStr();
    ed.innerHTML = entry ? (entry.content || '') : '';
    const badge = $('diary-badge');
    const notice = $('diary-notice');
    const saveBtn = $('btn-save-diary');
    const toolbarBtns = document.querySelectorAll('#fmt-toolbar .fmt-btn');
    if (isToday) {
      ed.setAttribute('contenteditable', 'true');
      if (badge) { badge.textContent = '今日可编辑'; badge.style.background = 'var(--gold-soft)'; badge.style.color = 'var(--gold)'; }
      if (notice) notice.style.display = 'none';
      if (saveBtn) saveBtn.disabled = false;
      toolbarBtns.forEach((b) => (b.disabled = false));
      const dv = document.querySelectorAll('#voice-bar .voice-btn'); dv.forEach((b) => (b.disabled = false));
    } else {
      ed.setAttribute('contenteditable', 'false');
      const past = date < todayStr();
      if (badge) { badge.textContent = past ? '历史日记 · 只读' : '未来日期 · 只读'; badge.style.background = 'var(--surface-2)'; badge.style.color = 'var(--text-2)'; }
      if (notice) { notice.style.display = 'block'; notice.textContent = past ? '这是过去的日记，仅供查看，无法修改。' : '这是未来的日期，暂不可添加笔记。'; }
      if (saveBtn) saveBtn.disabled = true;
      toolbarBtns.forEach((b) => (b.disabled = true));
      const dv = document.querySelectorAll('#voice-bar .voice-btn'); dv.forEach((b) => (b.disabled = true));
    }
    renderVoices(date);
  }
  function insertEmoji(em) {
    const ed = $('diary-editor');
    if (!ed || ed.getAttribute('contenteditable') === 'false') return;
    insertAtCursor(em);
  }
  function formatDiary(cmd) {
    const ed = $('diary-editor');
    if (!ed || ed.getAttribute('contenteditable') === 'false') return;
    ed.focus();
    if (cmd === 'enlarge') document.execCommand('fontSize', false, '6');
    else document.execCommand(cmd, false, null);
  }
  function insertHr() {
    const ed = $('diary-editor');
    if (!ed || ed.getAttribute('contenteditable') === 'false') return;
    insertAtCursor('<hr>');
  }
  function uploadDiaryImage(file) {
    compressImage(file, (dataUrl) => {
      insertAtCursor('<img src="' + dataUrl + '" style="max-width:100%;border-radius:8px;margin:6px 0;display:block">');
      toast('图片已插入', 'success');
    });
  }

  /* ---------------------- 日记 · 语音（转写 + 录音保留） ---------------------- */
  // 语音备忘存储：用 IndexedDB 存放音频（体积大，localStorage 配额会爆），不可用时回退 localStorage
  const VoiceStore = (function () {
    const DB_NAME = 'pw_voice_db', STORE = 'voices';
    let _db = null, _tried = false;
    function open() {
      return new Promise((res) => {
        if (_db) return res(_db);
        if (_tried || !window.indexedDB) return res(null);
        _tried = true;
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'date' });
        };
        req.onsuccess = (e) => { _db = e.target.result; res(_db); };
        req.onerror = () => res(null);
      });
    }
    async function getAll(date) {
      const db = await open();
      if (!db) { try { return JSON.parse(localStorage.getItem('pw_voices_' + date) || '[]'); } catch (e) { return []; } }
      return new Promise((res) => {
        try {
          const tx = db.transaction(STORE, 'readonly');
          const rq = tx.objectStore(STORE).get(date);
          rq.onsuccess = () => res(rq.result ? rq.result.items : []);
          rq.onerror = () => res([]);
        } catch (e) { res([]); }
      });
    }
    async function setAll(date, items) {
      const db = await open();
      if (!db) { try { localStorage.setItem('pw_voices_' + date, JSON.stringify(items)); } catch (e) {} return; }
      return new Promise((res) => {
        try {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put({ date, items });
          tx.oncomplete = () => res();
          tx.onerror = () => res();
        } catch (e) { res(); }
      });
    }
    return { getAll, setAll };
  })();

  function escHtml(s) { return (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function fmtDur(s) { s = s || 0; const m = Math.floor(s / 60), ss = s % 60; return m + ':' + String(ss).padStart(2, '0'); }

  // 语音转写（Web Speech API）
  let dictating = false, recog = null, dictFinal = '';
  function toggleDictate() {
    const ed = $('diary-editor');
    if (ed && ed.getAttribute('contenteditable') === 'false') { toast('历史/未来日记不可编辑，无法语音转写', 'error'); return; }
    if (recording) stopRecord();
    if (dictating) { stopDictate(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('当前浏览器不支持语音转写（请用 Chrome / Edge）', 'error'); return; }
    try { recog = new SR(); } catch (e) { toast('语音识别初始化失败', 'error'); return; }
    recog.lang = 'zh-CN'; recog.continuous = true; recog.interimResults = true;
    recog.onresult = (e) => {
      let inter = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) dictFinal += r[0].transcript; else inter += r[0].transcript;
      }
      const st = $('voice-status'); if (st) st.textContent = '识别中：' + (dictFinal + inter);
    };
    recog.onerror = (e) => { toast('语音识别出错：' + (e.error || '未知'), 'error'); stopDictate(); };
    recog.onend = () => { if (dictating) { try { recog.start(); } catch (_) {} } }; // 静音后自动续接
    dictating = true; dictFinal = '';
    const btn = $('btn-dictate'); if (btn) { btn.classList.add('recording'); btn.textContent = '🎙️ 停止转写'; }
    const st = $('voice-status'); if (st) st.textContent = '请开始说话…';
    try { recog.start(); } catch (_) {}
  }
  function stopDictate() {
    dictating = false;
    try { recog && recog.stop(); } catch (_) {}
    if (dictFinal.trim()) {
      insertAtCursor('<p>' + escHtml(dictFinal.trim()) + '</p>');
      toast('已插入语音转写文字', 'success');
    } else {
      const st = $('voice-status'); if (st) st.textContent = '';
    }
    const btn = $('btn-dictate'); if (btn) { btn.classList.remove('recording'); btn.textContent = '🎙️ 语音转写'; }
    const st2 = $('voice-status'); if (st2 && dictFinal.trim()) st2.textContent = '';
  }

  // 录制语音并保留（MediaRecorder + IndexedDB）
  let recording = false, mediaRec = null, mediaStream = null, recChunks = [], recStart = 0, recTimer = null;
  const VOICE_MAX_MS = 120000, VOICE_MAX_CHARS = 4000000; // 最多 2 分钟；base64 上限约 3MB
  async function toggleRecord() {
    const ed = $('diary-editor');
    if (ed && ed.getAttribute('contenteditable') === 'false') { toast('历史/未来日记不可编辑，无法录制语音', 'error'); return; }
    if (dictating) stopDictate();
    if (recording) { stopRecord(); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('当前环境不支持录音', 'error'); return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (err) { toast('无法访问麦克风：' + (err.message || err.name), 'error'); return; }
    mediaStream = stream;
    const MR = window.MediaRecorder;
    let mime = '';
    if (MR && MR.isTypeSupported) {
      if (MR.isTypeSupported('audio/webm')) mime = 'audio/webm';
      else if (MR.isTypeSupported('audio/mp4')) mime = 'audio/mp4';
      else if (MR.isTypeSupported('audio/ogg')) mime = 'audio/ogg';
    }
    try { mediaRec = new MR(stream, mime ? { mimeType: mime } : undefined); }
    catch (e) { toast('录音初始化失败：' + e.message, 'error'); stopStream(); return; }
    recChunks = [];
    mediaRec.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.push(e.data); };
    mediaRec.onstop = async () => {
      const blob = new Blob(recChunks, { type: mime || 'audio/webm' });
      const dur = Math.round((Date.now() - recStart) / 1000);
      const dataUrl = await blobToDataURL(blob);
      if (dataUrl.length > VOICE_MAX_CHARS) {
        toast('语音过长，已超出本地存储上限（请控制在 2 分钟内）', 'error');
        stopStream(); return;
      }
      const date = $('diary-date').value || todayStr();
      const items = await VoiceStore.getAll(date);
      items.push({ id: 'v' + Date.now(), dataUrl, mime: blob.type, duration: dur, ts: new Date().toISOString() });
      await VoiceStore.setAll(date, items);
      stopStream();
      renderVoices(date);
      toast('🎧 语音已保存', 'success');
    };
    mediaRec.start();
    recording = true; recStart = Date.now();
    const btn = $('btn-record'); if (btn) { btn.classList.add('recording'); btn.textContent = '⏹ 停止录制'; }
    recTimer = setInterval(() => {
      const s = Math.floor((Date.now() - recStart) / 1000);
      const st = $('voice-status'); if (st) st.textContent = '● 录音中… ' + s + 's（最多 2 分钟）';
      if (Date.now() - recStart >= VOICE_MAX_MS) stopRecord();
    }, 500);
  }
  function stopRecord() {
    if (!recording) return;
    recording = false;
    try { mediaRec && mediaRec.stop(); } catch (_) {}
    clearInterval(recTimer);
    const btn = $('btn-record'); if (btn) { btn.classList.remove('recording'); btn.textContent = '🔴 录制语音'; }
    const st = $('voice-status'); if (st) st.textContent = '';
  }
  function stopStream() { if (mediaStream) { mediaStream.getTracks().forEach((t) => t.stop()); mediaStream = null; } }
  function blobToDataURL(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }
  async function renderVoices(date) {
    const box = $('voice-list'); if (!box) return;
    const items = await VoiceStore.getAll(date || todayStr());
    if (!items.length) { box.innerHTML = ''; return; }
    box.innerHTML = '';
    box.appendChild(el('div', 'voice-list-head', '🎧 语音备忘（' + items.length + '）'));
    items.forEach((it) => {
      const row = el('div', 'voice-item');
      const au = document.createElement('audio');
      au.controls = true; au.preload = 'none'; au.src = it.dataUrl;
      row.appendChild(au);
      row.appendChild(el('span', 'voice-meta', fmtDur(it.duration) + (it.ts ? ' · ' + new Date(it.ts).toLocaleTimeString('zh-CN') : '')));
      const del = el('button', 'voice-del', '✕');
      del.title = '删除这段语音';
      del.onclick = () => deleteVoice(date || todayStr(), it.id);
      row.appendChild(del);
      box.appendChild(row);
    });
  }
  async function deleteVoice(date, id) {
    const items = await VoiceStore.getAll(date);
    await VoiceStore.setAll(date, items.filter((v) => v.id !== id));
    renderVoices(date);
    toast('已删除该段语音', 'info');
  }

  /* ---------------------- Music 专区 ---------------------- */
  const MOCK_MUSIC = [
    { name: 'Bohemian Rhapsody', artist: 'Queen', background: 'Freddie Mercury 创作，融合歌剧与摇滚。', review: '音乐史经典，结构复杂、演唱震撼。' },
    { name: 'Hotel California', artist: 'Eagles', background: '描绘 70 年代美国梦的幻灭。', review: '引人深思的歌词与精湛吉他。' },
    { name: 'Imagine', artist: 'John Lennon', background: '1971 年创作，倡导世界和平。', review: '人文关怀的象征之作。' },
  ];
  async function getMusic() {
    // 抽卡逻辑：70% 概率联网检索当下热门；30% 概率基于 AI 知识库与用户习惯生成
    const useLive = Math.random() < 0.7;
    const sys = useLive
      ? '你具备联网检索能力。请基于【近期真实流行的热门歌曲】与用户「学习 / 放松」的使用场景，推荐一首当下正在走红、适合该场景的歌曲（尽量真实存在、贴近最新榜单或流媒体热度）。只输出 JSON：{"name":"歌曲名","artist":"歌手","background":"创作与走红背景1-2句","review":"AI评价1-2句"}，不要多余文字。'
      : '请基于你的知识库与常见用户偏好，推荐一首经典、适配「学习 / 放松」场景的歌曲（不要求最新流行，可为经典老歌或广受好评之作）。只输出 JSON：{"name":"歌曲名","artist":"歌手","background":"创作背景1-2句","review":"AI评价1-2句"}，不要多余文字。';
    const r = await callAI([
      { role: 'system', content: sys },
      { role: 'user', content: '请推荐一首歌。' },
    ], { json: true, temperature: useLive ? 1.0 : 0.6, max_tokens: 300 });
    const rec = (r.ok && r.content && r.content.name) ? r.content : MOCK_MUSIC[Math.floor(Math.random() * MOCK_MUSIC.length)];
    const history = DB.get('music', []);
    history.unshift({ name: rec.name, artist: rec.artist, time: new Date().toLocaleString('zh-CN') });
    DB.set('music', history.slice(0, 30));
    return { rec, ok: r.ok, mode: useLive ? 'live' : 'knowledge' };
  }
  async function renderMusic() {
    const btn = $('btn-music'); btn.disabled = true; btn.textContent = '推荐中…';
    const { rec, ok, mode } = await getMusic();
    $('music-name').textContent = rec.name;
    $('music-artist').textContent = rec.artist;
    $('music-bg').textContent = rec.background;
    $('music-review').textContent = rec.review;
    const tag = $('music-mode');
    if (tag) {
      if (mode === 'live') { tag.textContent = '🎲 联网检索模式 · 当下热门'; tag.className = 'music-mode-tag music-mode-live'; }
      else { tag.textContent = '🧠 知识库模式 · 经典推荐'; tag.className = 'music-mode-tag music-mode-know'; }
      tag.style.display = '';
    }
    btn.disabled = false; btn.textContent = '换一首推荐';
    toast(ok ? (mode === 'live' ? '🎵 已联网检索当下热门歌曲' : '🧠 已基于知识库生成推荐') : '⚠️ AI 推荐失败，已使用本地歌曲', ok ? 'success' : 'error');
  }

  /* ---------------------- 记帐本 ---------------------- */
  // 记录分页状态：全部本地保存，支持“翻页查看所有历史记录”
  const LEDGER_PAGE_SIZE = 20;
  const ledgerState = { page: 1, filter: 'all', search: '', dateFrom: '', dateTo: '' };

  // 取记录本地日期（YYYY-MM-DD），用于日期范围筛选（与列表展示的本地时间一致）
  function ledgerRecDate(r) {
    const dt = new Date(r.ts);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  // 统一的记账记录筛选：类型 + 描述搜索 + 日期范围（起止含当天）
  function filterLedgerRecords(all) {
    const f = ledgerState.filter;
    const q = ledgerState.search.trim().toLowerCase();
    const from = ledgerState.dateFrom || '';
    const to = ledgerState.dateTo || '';
    return all.filter((r) => {
      if (f !== 'all' && r.type !== f) return false;
      if (q && !((r.desc || '').toLowerCase().includes(q))) return false;
      const d = ledgerRecDate(r);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }

  // 当前生效的筛选条件文字描述（用于标题与导出提示）
  function ledgerActiveFilterLabel() {
    const parts = [];
    if (ledgerState.filter === 'income') parts.push('仅收入');
    else if (ledgerState.filter === 'expense') parts.push('仅支出');
    if (ledgerState.search.trim()) parts.push('搜索"' + ledgerState.search.trim() + '"');
    if (ledgerState.dateFrom || ledgerState.dateTo) parts.push((ledgerState.dateFrom || '最早') + ' ~ ' + (ledgerState.dateTo || '至今'));
    return parts.join(' · ');
  }

  // 导出文件名后缀：有日期范围用范围，否则用今天
  function ledgerRangeSuffix() {
    if (ledgerState.dateFrom || ledgerState.dateTo) return (ledgerState.dateFrom || 'start') + '_' + (ledgerState.dateTo || 'end');
    return todayStr();
  }

  // 自动找回 / 合并旧版本数据：兼容 storage.js 的 personal_desk_account_records，以及其它可能的本地键
  function migrateLedger() {
    let recovered = 0;
    const current = DB.get('ledger', []);
    const seen = new Set(current.map((r) => String(r.id)));
    const norm = (r) => {
      const type = (r.type === 'income' || r.type === 'expense') ? r.type : (parseFloat(r.amount) < 0 ? 'expense' : 'income');
      return {
        id: r.id || ('a' + Date.now() + Math.random().toString(36).slice(2, 7)),
        type: type,
        amount: Math.abs(parseFloat(r.amount) || 0),
        desc: (r.desc || r.description || r.note || '(无描述)') + '',
        ts: r.ts || r.timestamp || r.time || new Date().toISOString(),
      };
    };
    const tryMerge = (arr) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((r) => {
        const rec = norm(r);
        if (!seen.has(String(rec.id))) { current.push(rec); seen.add(String(rec.id)); recovered++; }
      });
    };
    // 1) 旧版 storage.js 键
    try { const raw = localStorage.getItem('personal_desk_account_records'); if (raw) tryMerge(JSON.parse(raw)); } catch (e) {}
    // 2) 安全网：扫描所有本地键，凡看起来像记帐数组的一并找回（排除应用自身的键）
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || k.indexOf('pw_') === 0 || k.indexOf('personal_desk_') === 0) continue;
        if (/ledger|account|记帐|记账/i.test(k)) {
          try {
            const arr = JSON.parse(localStorage.getItem(k) || 'null');
            if (Array.isArray(arr) && arr.length && (arr[0].type || arr[0].amount != null)) tryMerge(arr);
          } catch (e) {}
        }
      }
    } catch (e) {}
    if (recovered > 0) DB.set('ledger', current);
    return recovered;
  }

  function addLedger() {
    const type = $('ledger-type').value;
    const amount = parseFloat($('ledger-amount').value);
    const desc = $('ledger-desc').value.trim();
    if (!(amount > 0)) { toast('请输入有效金额', 'error'); return; }
    if (!desc) { toast('请输入描述', 'error'); return; }
    const rec = { id: 'a' + Date.now() + Math.random().toString(36).slice(2, 5), type, amount, desc, ts: new Date().toISOString() };
    const all = DB.get('ledger', []);
    all.push(rec); DB.set('ledger', all);
    $('ledger-amount').value = ''; $('ledger-desc').value = '';
    ledgerState.page = 1; ledgerState.filter = 'all'; ledgerState.search = ''; ledgerState.dateFrom = ''; ledgerState.dateTo = '';
    const sf = $('ledger-search'); if (sf) sf.value = '';
    const df = $('ledger-date-from'); if (df) df.value = '';
    const dt = $('ledger-date-to'); if (dt) dt.value = '';
    document.querySelectorAll('.ledger-filters .filter-btn').forEach((b) => b.classList.toggle('active', (b.dataset.f || 'all') === 'all'));
    toast('已记录：' + (type === 'income' ? '收入' : '支出') + ' ¥' + amount.toFixed(2), 'success');
    loadLedger();
  }

  function sumLedger(type, period) {
    const all = DB.get('ledger', []);
    const now = new Date();
    let start;
    if (period === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (period === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
    else start = new Date(now.getFullYear(), 0, 1);
    return all.filter((r) => new Date(r.ts) >= start && r.type === type)
      .reduce((s, r) => s + r.amount, 0);
  }

  function loadLedger() {
    migrateLedger(); // 每次打开自动找回旧记录，绝不丢失
    const set = (id, v) => { const e = $(id); if (e) e.textContent = '¥' + v.toFixed(2); };
    const ti = sumLedger('income', 'today'), te = sumLedger('expense', 'today');
    const mi = sumLedger('income', 'month'), me = sumLedger('expense', 'month');
    const yi = sumLedger('income', 'year'), ye = sumLedger('expense', 'year');
    set('sum-today-income', ti); set('sum-today-expense', te); set('sum-today-net', ti - te);
    set('sum-month-income', mi); set('sum-month-expense', me); set('sum-month-net', mi - me);
    set('sum-year-income', yi); set('sum-year-expense', ye); set('sum-year-net', yi - ye);

    // 全部记录，按时间倒序
    const all = DB.get('ledger', []).slice().sort((a, b) => new Date(b.ts) - new Date(a.ts));
    const filtered = filterLedgerRecords(all);
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / LEDGER_PAGE_SIZE));
    if (ledgerState.page > pages) ledgerState.page = pages;
    if (ledgerState.page < 1) ledgerState.page = 1;
    const startIdx = (ledgerState.page - 1) * LEDGER_PAGE_SIZE;
    const pageItems = filtered.slice(startIdx, startIdx + LEDGER_PAGE_SIZE);

    const titleEl = $('ledger-history-title');
    if (titleEl) titleEl.textContent = (ledgerActiveFilterLabel() ? '已筛选：' + ledgerActiveFilterLabel() + '（' : '全部记录（') + '共 ' + total + ' 条）';

    const box = $('ledger-history'); box.innerHTML = '';
    if (total === 0) {
      box.appendChild(el('div', 'pw-empty', '暂无记帐记录，使用上方表单添加你的第一笔收支'));
    } else {
      pageItems.forEach((r) => {
        const item = el('div', 'record-item ' + r.type);
        const del = '<button class="record-del" type="button" title="删除该记录" onclick="deleteLedgerRecord(\'' + String(r.id).replace(/'/g, "\\'") + '\')">×</button>';
        item.innerHTML = '<div class="record-details"><div>' + escapeHtml(r.desc || '') + '</div><div class="record-time">' + new Date(r.ts).toLocaleString('zh-CN') + '</div></div>' +
          '<div class="record-amount ' + r.type + '">' + (r.type === 'income' ? '+' : '-') + '¥' + (parseFloat(r.amount) || 0).toFixed(2) + '</div>' + del;
        box.appendChild(item);
      });
    }
    renderLedgerPager(total, pages);
  }

  function renderLedgerPager(total, pages) {
    const pager = $('ledger-pager');
    if (!pager) return;
    pager.innerHTML = '';
    if (total === 0) { pager.style.display = 'none'; return; }
    pager.style.display = '';
    const mk = (label, page, opts) => {
      opts = opts || {};
      const b = el('button', 'pager-btn' + (opts.active ? ' active' : '') + (opts.disabled ? ' disabled' : ''));
      b.type = 'button'; b.textContent = label;
      if (!opts.disabled && !opts.active) b.onclick = () => { ledgerState.page = page; loadLedger(); };
      return b;
    };
    pager.appendChild(mk('‹ 上一页', ledgerState.page - 1, { disabled: ledgerState.page <= 1 }));
    const cur = ledgerState.page;
    const range = [];
    for (let p = 1; p <= pages; p++) {
      if (p === 1 || p === pages || Math.abs(p - cur) <= 2) range.push(p);
      else if (range[range.length - 1] !== '...') range.push('...');
    }
    range.forEach((p) => {
      if (p === '...') { pager.appendChild(el('span', 'pager-ellipsis', '…')); }
      else pager.appendChild(mk(String(p), p, { active: p === cur }));
    });
    pager.appendChild(mk('下一页 ›', ledgerState.page + 1, { disabled: ledgerState.page >= pages }));
    pager.appendChild(el('span', 'pager-info', '第 ' + cur + ' / ' + pages + ' 页 · 共 ' + total + ' 条'));
  }

  function ledgerSetFilter(f) {
    ledgerState.filter = f; ledgerState.page = 1;
    document.querySelectorAll('.ledger-filters .filter-btn').forEach((b) => b.classList.toggle('active', (b.dataset.f || 'all') === f));
    loadLedger();
  }
  function ledgerSetDateRange() {
    const fromEl = $('ledger-date-from');
    const toEl = $('ledger-date-to');
    ledgerState.dateFrom = fromEl ? fromEl.value : '';
    ledgerState.dateTo = toEl ? toEl.value : '';
    if (ledgerState.dateFrom && ledgerState.dateTo && ledgerState.dateFrom > ledgerState.dateTo) {
      toast('起始日期不能晚于结束日期', 'error');
      return;
    }
    ledgerState.page = 1;
    loadLedger();
  }
  function ledgerClearDateRange() {
    const fromEl = $('ledger-date-from');
    const toEl = $('ledger-date-to');
    if (fromEl) fromEl.value = '';
    if (toEl) toEl.value = '';
    ledgerState.dateFrom = '';
    ledgerState.dateTo = '';
    ledgerState.page = 1;
    loadLedger();
  }
  function ledgerSearchInput(v) { ledgerState.search = v; ledgerState.page = 1; loadLedger(); }
  function ledgerPrevPage() { if (ledgerState.page > 1) { ledgerState.page--; loadLedger(); } }
  function ledgerNextPage() { ledgerState.page++; loadLedger(); }

  function deleteLedgerRecord(id) {
    if (!confirm('确定删除这条记录吗？此操作不可撤销。')) return;
    const all = DB.get('ledger', []).filter((r) => String(r.id) !== String(id));
    DB.set('ledger', all);
    loadLedger();
    toast('已删除一条记录', 'success');
  }

  function exportLedger() {
    const all = DB.get('ledger', []);
    const filtered = filterLedgerRecords(all);
    if (!filtered.length) { toast('当前筛选条件下没有可导出的记录', 'info'); return; }
    const label = ledgerActiveFilterLabel();
    const data = { app: '个人工作台-记账本', exported_at: new Date().toISOString(), count: filtered.length, filter: label || '全部', records: filtered };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '记账本记录_' + ledgerRangeSuffix() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('已导出 ' + filtered.length + ' 条记录到本地文件' + (label ? '（已按筛选）' : ''), 'success');
  }

  // 构建记账本 Excel 工作表：含表头、金额数值格式、合计/总支出/净额三行
  function buildLedgerWorksheet(all) {
    const rows = all.slice().sort((a, b) => new Date(a.ts) - new Date(b.ts)); // 按时间升序，符合记账习惯
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4472C4' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
    const ws = {};
    const set = (r, c, v, style) => {
      const cell = { v: v, t: (typeof v === 'number') ? 'n' : 's' };
      if (style) cell.s = style;
      ws[XLSX.utils.encode_cell({ r, c })] = cell;
    };
    const head = ['日期', '时间', '类型', '金额', '描述'];
    head.forEach((h, i) => set(0, i, h, headerStyle));
    rows.forEach((r, i) => {
      const d = new Date(r.ts);
      set(i + 1, 0, localDateKey(d));
      set(i + 1, 1, d.toTimeString().slice(0, 8));
      set(i + 1, 2, r.type === 'income' ? '收入' : '支出');
      set(i + 1, 3, Math.round((parseFloat(r.amount) || 0) * 100) / 100, { numFmt: '0.00' });
      set(i + 1, 4, r.desc || '');
    });
    const totalIncome = all.filter((r) => r.type === 'income').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const totalExpense = all.filter((r) => r.type === 'expense').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const t = rows.length + 1;
    const bold = { font: { bold: true } };
    set(t, 2, '合计', bold);
    set(t, 3, Math.round(totalIncome * 100) / 100, { numFmt: '0.00', font: { bold: true } });
    set(t + 1, 2, '总支出', bold);
    set(t + 1, 3, Math.round(totalExpense * 100) / 100, { numFmt: '0.00', font: { bold: true } });
    set(t + 2, 2, '净额', bold);
    set(t + 2, 3, Math.round((totalIncome - totalExpense) * 100) / 100, { numFmt: '0.00', font: { bold: true } });
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: t + 2, c: 4 } });
    ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 44 }];
    return ws;
  }

  // 导出记账本为 Excel（.xlsx）；XLSX 库不可用时回退为 UTF-8 CSV（Excel 可直接打开）
  function exportLedgerExcel() {
    const all = DB.get('ledger', []);
    const filtered = filterLedgerRecords(all);
    if (!filtered.length) { toast('当前筛选条件下没有可导出的记录', 'info'); return; }
    const stamp = ledgerRangeSuffix();
    const label = ledgerActiveFilterLabel();
    if (typeof XLSX !== 'undefined' && XLSX.utils && XLSX.writeFile) {
      try {
        const ws = buildLedgerWorksheet(filtered);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '记账本');
        XLSX.writeFile(wb, '记账本_' + stamp + '.xlsx');
        toast('已导出 ' + filtered.length + ' 条记录为 Excel (.xlsx)' + (label ? '（已按筛选）' : ''), 'success');
        return;
      } catch (e) {
        console.error('Excel 生成失败，尝试 CSV 兜底：', e);
      }
    }
    // 离线兜底：UTF-8 BOM 的 CSV，Excel 打开中文不乱码
    const lines = ['﻿日期,时间,类型,金额,描述'];
    filtered.slice().sort((a, b) => new Date(a.ts) - new Date(b.ts)).forEach((r) => {
      const d = new Date(r.ts);
      const cells = [
        localDateKey(d),
        d.toTimeString().slice(0, 8),
        r.type === 'income' ? '收入' : '支出',
        (Math.round((parseFloat(r.amount) || 0) * 100) / 100).toFixed(2),
        '"' + String(r.desc || '').replace(/"/g, '""') + '"',
      ];
      lines.push(cells.join(','));
    });
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '记账本_' + stamp + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('未加载 Excel 组件，已导出 CSV（Excel 可直接打开）' + (label ? '（已按筛选）' : ''), 'info');
  }

  function importLedgerFromFile(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const incoming = Array.isArray(parsed) ? parsed : (parsed.records && Array.isArray(parsed.records) ? parsed.records : null);
        if (!incoming) { toast('文件格式不正确，应为记账本导出文件', 'error'); return; }
        const current = DB.get('ledger', []);
        const seen = new Set(current.map((r) => String(r.id)));
        let added = 0;
        incoming.forEach((r) => {
          const rec = {
            id: r.id || ('a' + Date.now() + Math.random().toString(36).slice(2, 7)),
            type: (r.type === 'income' || r.type === 'expense') ? r.type : 'expense',
            amount: Math.abs(parseFloat(r.amount) || 0),
            desc: (r.desc || r.description || '(无描述)') + '',
            ts: r.ts || r.timestamp || new Date().toISOString(),
          };
          if (!seen.has(String(rec.id))) { current.push(rec); seen.add(String(rec.id)); added++; }
        });
        DB.set('ledger', current);
        ledgerState.page = 1;
        loadLedger();
        toast('已重新导入 ' + added + ' 条记录（重复已自动跳过）', 'success');
      } catch (err) {
        toast('导入失败：' + err.message, 'error');
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  function recoverLedger() {
    const n = migrateLedger();
    ledgerState.page = 1;
    loadLedger();
    if (n > 0) toast('已找回并合并 ' + n + ' 条旧记录', 'success');
    else toast('已扫描本地存储，未发现可找回的其它记录', 'success');
  }

  /* ---------------------- 日历 ---------------------- */
  let calDate = new Date();
  let selectedCalDate = null;
  const MOODS = {
    happy:   { label: '开心', emoji: '😊' },
    angry:   { label: '生气', emoji: '😠' },
    sad:     { label: '难过', emoji: '😢' },
    calm:    { label: '平静', emoji: '😌' },
    tired:   { label: '疲惫', emoji: '😴' },
    excited: { label: '兴奋', emoji: '🤩' },
  };
  function renderCalendar() {
    if (!selectedCalDate) selectedCalDate = todayStr();
    const y = calDate.getFullYear(), m = calDate.getMonth();
    $('cal-month').textContent = y + '年' + (m + 1) + '月';
    const first = new Date(y, m, 1);
    const start = new Date(first); start.setDate(start.getDate() - first.getDay());
    const grid = $('cal-grid'); grid.innerHTML = '';
    const events = DB.get('events', {});
    const moods = DB.get('moods', {});
    const today = todayStr();
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const dk = localDateKey(d);
      const cell = el('div', 'cal-day' + (d.getMonth() === m ? '' : ' other'));
      if (dk === today) cell.classList.add('today');
      if (dk === selectedCalDate) cell.classList.add('selected');
      if (moods[dk]) cell.classList.add('mood-' + moods[dk]);
      cell.appendChild(el('div', 'cal-num', String(d.getDate())));
      if (events[dk] && events[dk].length) cell.appendChild(el('div', 'cal-dot'));
      if (moods[dk] && MOODS[moods[dk]]) cell.appendChild(el('div', 'cal-mood-emoji', MOODS[moods[dk]].emoji));
      cell.onclick = () => selectDate(dk);
      grid.appendChild(cell);
    }
    renderDayDetail();
  }
  function selectDate(dk) {
    // 点击仅查看当日行程，不直接弹窗；是否添加由用户点击「添加行程」决定
    selectedCalDate = dk;
    renderCalendar();
  }
  function renderDayDetail() {
    const dk = selectedCalDate;
    const parts = dk.split('-');
    const mm = parseInt(parts[1], 10), dd = parseInt(parts[2], 10);
    if ($('cal-detail-title')) $('cal-detail-title').textContent = mm + '月' + dd + '日 行程';
    // 容错排序：历史数据可能缺少 time 字段，直接 .localeCompare 会抛错并让整个日历页白屏
    const events = (DB.get('events', {})[dk] || []).slice()
      .sort((a, b) => String((a && a.time) || '').localeCompare(String((b && b.time) || '')));
    const box = $('cal-events'); box.innerHTML = '';
    if (events.length === 0) {
      box.appendChild(el('div', 'pw-empty', '这一天还没有行程，需要时可点「添加行程」。'));
    } else {
      events.forEach((ev) => {
        box.appendChild(el('div', 'event-item', '<span class="event-time">' + escapeHtml((ev && ev.time) || '') + '</span><span class="event-title">' + escapeHtml((ev && ev.title) || '') + '</span>'));
      });
    }
    const isToday = dk === todayStr();
    if ($('mood-label')) $('mood-label').textContent = isToday ? '今日心情' : ('当日心情（' + mm + '月' + dd + '日）');
    renderMoodPicker();
  }
  function renderMoodPicker() {
    const picker = $('mood-picker');
    if (!picker) return;
    const cur = DB.get('moods', {})[selectedCalDate];
    picker.innerHTML = '';
    Object.keys(MOODS).forEach((key) => {
      const m = MOODS[key];
      const b = el('button', 'mood-btn' + (cur === key ? ' active' : ''));
      b.type = 'button'; b.title = m.label; b.textContent = m.emoji;
      b.onclick = () => setMood(key);
      picker.appendChild(b);
    });
  }
  function setMood(key) {
    const moods = DB.get('moods', {});
    let added = false;
    if (moods[selectedCalDate] === key) delete moods[selectedCalDate];
    else { moods[selectedCalDate] = key; added = true; }
    DB.set('moods', moods);
    renderCalendar();
    renderMoodPicker();
    toast(added ? ('已记录心情：' + MOODS[key].label) : '已取消心情记录', added ? 'success' : 'info');
  }
  function addEventForSelected() {
    const dk = selectedCalDate;
    if (!dk) return;
    const title = prompt('为 ' + dk + ' 添加行程标题：');
    if (!title) return;
    const time = prompt('时间（HH:MM）：', '09:00') || '09:00';
    const all = DB.get('events', {});
    if (!all[dk]) all[dk] = [];
    all[dk].push({ time, title });
    DB.set('events', all);
    toast('已添加行程', 'success');
    renderCalendar();
    renderDayDetail();
  }
  function openDiaryForSelected() {
    if (!selectedCalDate) return;
    $('diary-date').value = selectedCalDate;
    switchPage('diary');
  }
  function prevMonth() { calDate.setMonth(calDate.getMonth() - 1); renderCalendar(); }
  function nextMonth() { calDate.setMonth(calDate.getMonth() + 1); renderCalendar(); }

  /* ---------------------- 报表（日报/周报/月报） ---------------------- */
  function collectStats() {
    const c = getTodayCheckin();
    const done = getTaskDoneToday().length;
    const total = getTaskCount();
    const ti = sumLedger('income', 'today'), te = sumLedger('expense', 'today');
    const mi = sumLedger('income', 'month'), me = sumLedger('expense', 'month');
    const diaryAll = DB.get('diary', {});
    const todayDiary = diaryAll[todayStr()];
    return { c, done, total, ti, te, mi, me, points: getPoints(), todayDiary: todayDiary ? stripHtml(todayDiary.content) : '' };
  }
  function buildSummaryText(type, s) {
    if (type === 'daily') {
      return '今日数据：签到(早' + (s.c && s.c.morning ? s.c.morning : '未') + '/晚' + (s.c && s.c.evening ? s.c.evening : '未') + ')；完成任务 ' + s.done + '/' + s.total + '；积分 ' + s.points + '；收支(今) 收入¥' + s.ti.toFixed(2) + '/支出¥' + s.te.toFixed(2) + '。' + (s.todayDiary ? '日记：' + s.todayDiary.slice(0, 80) : '今日未写日记。');
    }
    if (type === 'weekly') {
      return '本周数据：完成任务 ' + s.done + '/' + s.total + '；积分 ' + s.points + '；本月收支 收入¥' + s.mi.toFixed(2) + '/支出¥' + s.me.toFixed(2) + '。';
    }
    return '本月数据：积分 ' + s.points + '；本月收支 收入¥' + s.mi.toFixed(2) + '/支出¥' + s.me.toFixed(2) + '；净额 ¥' + (s.mi - s.me).toFixed(2) + '。';
  }
  async function generateReport(type) {
    const s = collectStats();
    const base = buildSummaryText(type, s);
    const label = type === 'daily' ? '日报' : type === 'weekly' ? '周报' : '月报';
    const r = await callAI([
      { role: 'system', content: '你是用户的个人助理。请根据以下数据，用温暖、鼓励的中文写一段' + label + '总结（180字以内），点出亮点与可改进之处，不要使用 markdown。' },
      { role: 'user', content: base },
    ], { temperature: 0.9, max_tokens: 400 });
    const ai = r.ok ? r.content : null;
    if (r.ok) toast(label + ' · AI 总结成功 ✅', 'success');
    else toast(label + ' · AI 调用失败，已使用本地数据', 'error');
    const out = ai ? (label + ' · ' + new Date().toLocaleDateString('zh-CN') + '\n\n' + base + '\n\n【AI 总结】\n' + ai) : (label + ' · ' + new Date().toLocaleDateString('zh-CN') + '\n\n' + base);
    $('report-output').textContent = out;
    const reports = DB.get('reports', { daily: [], weekly: [], monthly: [] });
    reports[type].unshift({ time: new Date().toLocaleString('zh-CN'), content: out });
    DB.set('reports', reports);
    toast(label + '已生成', 'success');
  }

  /* ---------------------- 私密空间（Web Crypto 真加密） ---------------------- */
  const PBKDF2_SALT = new TextEncoder().encode('personal-workbench-salt-v1');
  const PRIVATE_MARKER = '__PW_PRIVATE_OK__';
  function deriveKey(passphrase) {
    if (!crypto.subtle) return Promise.reject(new Error('no-crypto'));
    return crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
      .then((km) => crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: PBKDF2_SALT, iterations: 100000, hash: 'SHA-256' },
        km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']));
  }
  function encryptText(passphrase, plaintext) {
    return deriveKey(passphrase).then((key) => {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
        .then((ct) => bufToB64(iv) + ':' + bufToB64(ct));
    });
  }
  function decryptText(passphrase, packed) {
    return deriveKey(passphrase).then((key) => {
      const parts = packed.split(':');
      const iv = b64ToBuf(parts[0]);
      const ct = b64ToBuf(parts[1]);
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
        .then((pt) => new TextDecoder().decode(pt));
    });
  }
  function passphraseOf(p1, p2, p3) { return p1 + '|' + p2 + '|' + p3; }
  function privateLockedToday() { return DB.get('private_lock', '') === todayStr(); }
  function loadPrivate() {
    if (privateLockedToday()) {
      showPrivateLocked();
      return;
    }
    if (!DB.get('private_setup', false)) {
      showPrivateSetup();
      return;
    }
    showPrivateLogin();
  }
  function showPrivateSetup() {
    $('private-setup').style.display = 'block';
    $('private-login').style.display = 'none';
    $('private-content').style.display = 'none';
    $('private-lock-msg').textContent = '';
  }
  function showPrivateLogin() {
    $('private-setup').style.display = 'none';
    $('private-login').style.display = 'block';
    $('private-content').style.display = 'none';
    $('private-p1').value = ''; $('private-p2').value = ''; $('private-p3').value = '';
    $('private-lock-msg').textContent = '需连续输入 3 道正确密码方可进入，输错任意一道今日将锁定。';
  }
  function showPrivateLocked() {
    $('private-setup').style.display = 'none';
    $('private-login').style.display = 'block';
    $('private-content').style.display = 'none';
    [$('private-p1'), $('private-p2'), $('private-p3')].forEach((i) => { if (i) i.disabled = true; });
    const b = $('btn-private-enter'); if (b) b.disabled = true;
    $('private-lock-msg').textContent = '🔒 今日已进入机会已取消（密码错误），请明日再试。';
  }
  function setupPrivate() {
    const p1 = $('setup-p1').value, p2 = $('setup-p2').value, p3 = $('setup-p3').value;
    if (!p1 || !p2 || !p3) { toast('请填写 3 道密码', 'error'); return; }
    encryptText(passphraseOf(p1, p2, p3), PRIVATE_MARKER).then((marker) => {
      DB.set('private_marker', marker);
      return encryptText(passphraseOf(p1, p2, p3), '');
    }).then((data) => {
      DB.set('private_data', data);
      DB.set('private_setup', true);
      toast('私密空间已初始化', 'success');
      showPrivateLogin();
    }).catch(() => toast('加密失败，请使用现代浏览器（Chrome/Safari）', 'error'));
  }
  async function enterPrivate() {
    const p1 = $('private-p1').value, p2 = $('private-p2').value, p3 = $('private-p3').value;
    if (!p1 || !p2 || !p3) { toast('请输入 3 道密码', 'error'); return; }
    const marker = DB.get('private_marker', '');
    const pass = passphraseOf(p1, p2, p3);
    try {
      const dec = await decryptText(pass, marker);
      if (dec !== PRIVATE_MARKER) throw new Error('wrong');
      const data = DB.get('private_data', '');
      const notes = data ? (await decryptText(pass, data)) : '';
      $('private-notes').value = notes;
      $('private-login').style.display = 'none';
      $('private-content').style.display = 'block';
      toast('欢迎进入私密空间 🔐', 'success');
    } catch (e) {
      DB.set('private_lock', todayStr());
      [$('private-p1'), $('private-p2'), $('private-p3')].forEach((i) => { if (i) i.disabled = true; });
      const b = $('btn-private-enter'); if (b) b.disabled = true;
      $('private-lock-msg').textContent = '🔒 密码错误，今日进入机会已取消。';
      toast('密码错误，今日已锁定', 'error');
    }
  }
  async function savePrivate() {
    const pass = passphraseOf($('private-p1').value, $('private-p2').value, $('private-p3').value);
    if (!pass || pass === '||') { toast('请重新进入私密空间', 'error'); return; }
    try {
      const data = await encryptText(pass, $('private-notes').value);
      DB.set('private_data', data);
      toast('已加密保存 🔐', 'success');
    } catch (e) { toast('保存失败', 'error'); }
  }
  function exitPrivate() {
    [$('private-p1'), $('private-p2'), $('private-p3')].forEach((i) => { if (i) { i.disabled = false; i.value = ''; } });
    const b = $('btn-private-enter'); if (b) b.disabled = false;
    showPrivateLogin();
  }

  /* ---------------------- 音效与显示 ---------------------- */
  let soundVolume = 0.5;       // 0..1
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
    }
    return audioCtx;
  }
  // 播放「嘟」提示音（正弦波短促音）
  function playBeep(vol) {
    if (vol == null) vol = soundVolume;
    if (vol <= 0) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol * 0.35, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }
  function testBeep() { playBeep(soundVolume); }
  function onSoundVolume(v) {
    soundVolume = Math.max(0, Math.min(1, Number(v) / 100));
    const sv = Math.round(soundVolume * 100);
    if ($('sound-val')) $('sound-val').textContent = sv + '%';
  }
  function onFontScale(v) {
    const scale = Math.max(0.8, Math.min(1.5, Number(v) / 100));
    document.documentElement.style.zoom = scale;
    if ($('font-val')) $('font-val').textContent = Math.round(scale * 100) + '%';
  }
  function saveSoundSettings() {
    const s = DB.get('settings', { city: '上海', lat: 31.2304, lon: 121.4737 });
    s.soundVolume = soundVolume;
    s.fontScale = Number($('set-font').value) / 100;
    DB.set('settings', s);
    toast('音效与显示设置已保存', 'success');
  }
  function applySoundAndFontSettings() {
    const s = DB.get('settings', { city: '上海', lat: 31.2304, lon: 121.4737, soundVolume: 0.5, fontScale: 1.0 });
    soundVolume = (typeof s.soundVolume === 'number') ? s.soundVolume : 0.5;
    const fontScale = (typeof s.fontScale === 'number') ? s.fontScale : 1.0;
    document.documentElement.style.zoom = fontScale;
    const sv = Math.round(soundVolume * 100);
    const fv = Math.round(fontScale * 100);
    if ($('set-sound')) { $('set-sound').value = sv; if ($('sound-val')) $('sound-val').textContent = sv + '%'; }
    if ($('set-font')) { $('set-font').value = fv; if ($('font-val')) $('font-val').textContent = fv + '%'; }
  }

  /* ---------------------- 设置 ---------------------- */
  function loadSettings() {
    const s = DB.get('settings', { city: '上海', lat: 31.2304, lon: 121.4737 });
    $('set-city').value = s.city || '';
    applySoundAndFontSettings();
    loadAIConfig();
    // AI 状态：优先反映浏览器端用户配置，其次看服务端智谱 Key
    const ai = DB.get('ai_config', null);
    const st = $('ai-status');
    if (ai && ai.apiKey && ai.baseUrl) {
      st.textContent = '✅ 已启用本地 AI：' + (PROVIDERS[ai.provider] ? PROVIDERS[ai.provider].name : '自定义') + (ai.model ? '（' + ai.model + '）' : '') + ' —— 配置保存在本机浏览器';
      st.className = 'ai-status ok';
    } else {
      fetch(API_BASE + '/api/health').then((r) => r.json()).then((d) => {
        if (d.hasKey) {
          st.textContent = '✅ 服务端 AI 已连接（' + d.model + '）';
          st.className = 'ai-status ok';
        } else {
          st.textContent = '⚠️ 未配置 AI：将使用本地兜底内容（可在上方填写你的 AI 服务）';
          st.className = 'ai-status warn';
        }
      }).catch(() => {
        st.textContent = 'AI 状态未知（可能未启动后端）';
        st.className = 'ai-status warn';
      });
    }
  }
  function saveCity() {
    const city = $('set-city').value.trim();
    if (!city) return;
    // 用 Open-Meteo 地理编码解析经纬度
    fetch('https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0').catch(() => {});
    fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=1&language=zh')
      .then((r) => r.json()).then((d) => {
        const s = DB.get('settings', { city, lat: 31.2304, lon: 121.4737 });
        if (d.results && d.results[0]) {
          s.lat = d.results[0].latitude; s.lon = d.results[0].longitude;
        }
        s.city = city; DB.set('settings', s);
        toast('城市已更新：' + city, 'success');
        loadWeather();
      }).catch(() => { toast('城市解析失败，请检查网络', 'error'); });
  }
  function exportData() {
    // 全量备份键：除原有基础模块外，补齐愿望、网址、词本、行情、新闻缓存、
    // 主题与私密空间（密文，需原密码才能解密）——否则「导出 → 导入」会丢这些资产。
    const keys = [
      // 基础模块
      'checkin', 'tasks', 'task_done', 'points', 'diary', 'ledger', 'events', 'moods',
      'settings', 'motivation', 'music', 'reports', 'theme',
      // 英语学习
      'vocab_known', 'vocab_unknown', 'wordbook', 'wordbooks', 'today_book_id', 'dictation', 'cet4_checkin', 'cet4_records',
      'points_seeded', 'daily_login_bonus',
      // 扩展模块
      'wishes', 'links', 'market_items', 'market_data', 'market_layout', 'daily_news',
      // AI 配置与私密空间（private_* 均为加密结果，可安全备份；private_lock 为当日临时锁，不备份）
      'ai_config', 'private_setup', 'private_marker', 'private_data',
    ];
    const out = {};
    keys.forEach((k) => { const v = DB.get(k, null); if (v !== null) out[k] = v; });
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '个人工作台备份_' + todayStr() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url); // 及时释放，避免长期驻留内存
    toast('数据已导出（' + Object.keys(out).length + ' 项）', 'success');
  }
  function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Object.keys(data).forEach((k) => { if (data[k] != null) DB.set(k, data[k]); });
        toast('数据已导入', 'success');
        loadDashboard();
        // 让扩展模块立即反映导入后的数据（否则需刷新页面才看得到）
        if (window.PW) {
          if (window.PW.renderWordbookStats) window.PW.renderWordbookStats();
          if (window.PW.onEnglish) window.PW.onEnglish();
        }
      } catch (err) { toast('导入失败：' + err.message, 'error'); }
    };
    reader.readAsText(file);
  }

  /* ---------------------- 初始化 ---------------------- */
  function init() {
    applyTheme(DB.get('theme', 'light'));
    applySoundAndFontSettings(); // 启动时即应用字体缩放与音量
    $('current-date') && ($('current-date').textContent = fmtDate(new Date()));
    renderMotivation();
    // 暴露给内联 onchange / onclick
    window.enterApp = enterApp;
    // switchPage 已在脚本加载期挂到 window（features-extras.js 会在此之上做包装），
    // 这里只在异常情况下兜底，绝不重复覆盖，否则会冲掉扩展层的页面分发逻辑。
    if (typeof window.switchPage !== 'function') window.switchPage = switchPage;
    window.morningCheckin = morningCheckin;
    window.eveningCheckin = eveningCheckin;
    window.loadDefaultPlan = loadDefaultPlan;
    window.uploadPlan = uploadPlan;
    window.completeTask = completeTask;
    window.newVocab = newVocab;
    window.markVocab = markVocab;
    window.newDictation = newDictation;
    window.playDictation = playDictation;
    window.checkDictation = checkDictation;
    window.saveDiary = saveDiary;
    window.loadDiary = loadDiary;
    window.summarizeDiary = summarizeDiary;
    window.insertEmoji = insertEmoji;
    window.uploadDiaryImage = uploadDiaryImage;
    window.renderMusic = renderMusic;
    window.addLedger = addLedger;
    window.loadLedger = loadLedger;
    window.migrateLedger = migrateLedger;
    window.recoverLedger = recoverLedger;
    window.exportLedger = exportLedger;
    window.exportLedgerExcel = exportLedgerExcel;
    window.importLedgerFromFile = importLedgerFromFile;
    window.deleteLedgerRecord = deleteLedgerRecord;
    window.ledgerSetFilter = ledgerSetFilter;
    window.ledgerSetDateRange = ledgerSetDateRange;
    window.ledgerClearDateRange = ledgerClearDateRange;
    window.ledgerSearchInput = ledgerSearchInput;
    window.ledgerPrevPage = ledgerPrevPage;
    window.ledgerNextPage = ledgerNextPage;
    window.prevMonth = prevMonth;
    window.nextMonth = nextMonth;
    window.generateReport = generateReport;
    window.setupPrivate = setupPrivate;
    window.enterPrivate = enterPrivate;
    window.savePrivate = savePrivate;
    window.exitPrivate = exitPrivate;
    window.saveCity = saveCity;
    window.exportData = exportData;
    window.importData = importData;
    window.saveAIConfig = saveAIConfig;
    window.clearAIConfig = clearAIConfig;
    window.onProviderChange = onProviderChange;
    window.testBeep = testBeep;
    window.onSoundVolume = onSoundVolume;
    window.onFontScale = onFontScale;
    window.saveSoundSettings = saveSoundSettings;
    window.formatDiary = formatDiary;
    window.insertHr = insertHr;
    window.toggleDictate = toggleDictate;
    window.toggleRecord = toggleRecord;
    window.renderVoices = renderVoices;
    window.deleteVoice = deleteVoice;
    window.switchEnglishTab = switchEnglishTab;
    window.renderWordbook = renderWordbook;
    window.renderWordbookStats = renderWordbookStats;
    window.addEventForSelected = addEventForSelected;
    window.openDiaryForSelected = openDiaryForSelected;
    window.setMood = setMood;
    window.renderMoodPicker = renderMoodPicker;
    window.renderDayDetail = renderDayDetail;
    window.applyTheme = applyTheme;
    window.toggleTheme = () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    // 交互提示音：点击按钮/导航等、键盘操作（输入框内打字不响）
    document.addEventListener('click', (e) => {
      const t = e.target.closest('button, .nav-item, .tab-btn, .fmt-btn, .emoji-btn, .cal-nav, .mood-btn, .cal-day, .wordbook-item, .event-item');
      if (t) playBeep();
    });
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (e.target.isContentEditable || tag === 'input' || tag === 'textarea') return;
      playBeep();
    });
    // 大时钟
    setInterval(() => {
      const t = new Date().toLocaleTimeString('zh-CN');
      if ($('checkin-morning-time')) $('checkin-morning-time').textContent = t;
      if ($('checkin-evening-time')) $('checkin-evening-time').textContent = t;
    }, 1000);
  }

  /* ---------------------- 对外暴露给扩展模块（features.js） ----------------------
   * features.js 复用本模块内部的存储层、AI 客户端与 UI 工具，避免重复实现。
   *
   * ⚠️ switchPage 必须在这里（脚本加载期）就挂到 window，且早于 features-extras.js 执行：
   * features-extras.js 会包装 window.switchPage，用于分发「个人愿望 / 网址清单 / 行情关注器」
   * 这几个 app.js 不认识的新页面（渲染内容 + 隐藏浮动按钮 + 拉取新闻）。
   * 若只在 init() 里赋值，init 执行在 features-extras 之后，会把那层包装整个覆盖掉，
   * 结果就是：点进愿望 / 网址 / 行情页面一片空白、页面标题不更新、右下角 ＋ 按钮不消失。 */
  window.switchPage = switchPage;
  window.PW = {
    DB, callAI, toast, todayStr, escapeHtml, el, $, API_BASE,
    getPoints, loadDashboard, loadVocab, renderWordbookStats, renderMotivation,
  };

  /* ---------------------- file:// 直接打开时的友好引导 ----------------------
   * 当用户用 file:// 双击打开本文件时，API 基地址会自动指向 http://localhost:8787。
   * 若本地服务器未启动，这里给出清晰提示，而不是让用户面对一堆 CORS 报错。 */
  function renderServerHint() {
    if (document.getElementById('pw-filehint')) return;
    const bar = el('div');
    bar.id = 'pw-filehint';
    bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9900;background:#b9482e;color:#fff;font-size:13px;line-height:1.6;padding:12px 18px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.25)';
    bar.innerHTML = '⚠️ 你正以 <b>file://</b> 方式打开本页面。AI / 新闻 / 行情 / 文件转换等接口需要本地服务器支持。' +
      '请在本项目目录运行 <b>node server.js</b>，再访问 <b>http://localhost:8787/个人工作台.html</b>（或直接双击本文件，服务器已启动时会自动对接）。' +
      '<button id="pw-filehint-x" style="margin-left:12px;background:#fff;color:#b9482e;border:none;border-radius:6px;padding:3px 12px;cursor:pointer;font-weight:700">知道了</button>';
    document.body.appendChild(bar);
    const x = document.getElementById('pw-filehint-x');
    if (x) x.onclick = () => bar.remove();
  }
  if (typeof location !== 'undefined' && location.protocol === 'file:') {
    fetch(API_BASE + '/api/health')
      .then((r) => r.json())
      .then((d) => { if (!d || !d.ok) renderServerHint(); })
      .catch(() => renderServerHint());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
