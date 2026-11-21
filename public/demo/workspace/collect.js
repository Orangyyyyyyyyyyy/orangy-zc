/* ============================================================
 * 个人工作台 · 信息搜集模块 v3 (collect.js)
 * 依赖 app.js 暴露的 window.PW（DB / escapeHtml / $ / API_BASE / toast / todayStr）
 *
 * 职责分离（铁律）：
 *   🕷 爬虫（server.js /api/collect/*）只负责「抓取」；
 *   🤖 AI 只负责「分析 / 整理 / 归纳 / 加标签」，绝不参与抓取。
 *
 * v3 变更（按用户 2026-09-29 优化要求）：
 *  1) 界面显示修复：整页渲染改为「常显进度面板 + 常显资料清单」，
 *     进度面板不再藏在 display:none 里；资料清单不再截断，全部展示。
 *  2) 流式呈现：AI 整理出一条就立刻上屏一条（并发 4，完成即追加渲染）。
 *  3) AI 提速：只送正文前 2200 字、max_tokens 收敛、并发 4、按 URL+标题哈希去重跳过。
 *  4) 微信聊天记录上传：支持 .txt/.csv/.json 文件解析 + 粘贴，解析发言人/时间后送 AI 分析。
 *  5) 全量展示 + 自动归档：按「截止时间最接近」置顶，已过期自动归档并置于列表尾部。
 *  6) 增量检索（核心）：首次进入全量抓取（栏目页 → 文章页）；
 *     之后每次只抓「上次抓取时间至今」的新文章，已见 URL 一律跳过，不再重复看。
 *  7) 筛选器：标题/摘要/标签全文搜索 + 标签筛选 + 来源筛选 + 归档开关。
 *  8) 详情查阅：点标题进详情弹窗看全文原文 + 原资料链接 + AI 追问 + 手动归档。
 *
 * 本模块 AI 与工作台其它 AI 完全独立：配置存 collect_ai，通道 /api/collect/ai（strictUser）。
 * 采集源：东北师范大学官网 https://www.nenu.edu.cn
 * 朗读（喇叭）功能按用户要求不做；GRM 未确认指向，暂不提供预设。
 * ============================================================ */
(function () {
  'use strict';
  const PW = window.PW;
  if (!PW) { console.error('[collect] window.PW 未就绪，模块未加载'); return; }
  const DB = PW.DB;
  const esc = PW.escapeHtml;
  const $ = PW.$;

  /* ---------------- 常量 / 配置 ---------------- */
  const KEY = 'collect_data';
  const AIKEY = 'collect_ai'; // 与 ai_config 完全隔离
  const NENU = 'https://www.nenu.edu.cn';
  const VERSION = 3;

  // 栏目启发式：命中即视为「值得采集的通知/新闻类栏目」
  const SECTION_RE = /通知|公告|新闻|资讯|教务|招生|培养|学术|科研|学生|就业|动态|快讯|学院|重要|公示|校历|会议|简报|招标|人才|讲座|活动|竞赛|评奖|助学|安全|服务/;
  const SECTION_MAX = 14;      // 最多采集多少个栏目
  const PER_SECTION = 8;       // 每个栏目最多取多少篇（按栏目内顺序，通常最新在前）
  const MAX_NEW_FIRST = 48;    // 首次全量：最多整理多少篇新文章
  const MAX_NEW_INCR = 30;     // 增量：最多整理多少篇新文章
  const AI_CONC = 4;           // AI 并发数（提速关键）
  const FETCH_CONC = 12;       // 每批提交的抓取数量（服务端再并发 4，摊薄 HTTP 往返）
  const TEXT_FOR_AI = 2200;    // 单篇送 AI 的正文长度（提速关键）
  const RAW_KEEP = 2600;       // 本地保留的原文长度（够详情阅读，且不撑爆 localStorage）
  const MAX_ITEMS = 400;       // 本地资料条数上限（超出时优先裁剪最旧的已归档）

  /* ---------------- 供应商预设（多 AI 接入，DeepSeek 默认） ---------------- */
  const PROVIDERS = {
    deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-4.1-flash' },
    kimi: { name: 'Kimi（月之暗面）', baseUrl: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
    doubao: { name: '豆包（火山方舟）', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-seed-1.6-250615' },
    zhipu: { name: '智谱 AI', baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4.7-flash' },
    qwen: { name: '千问 AI（通义）', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
    gemini: { name: 'Gemini（Google）', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.0-flash' },
    openai: { name: 'OpenAI（ChatGPT）', baseUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
    claude: { name: 'Claude（OpenRouter 网关）', baseUrl: 'https://openrouter.ai/api/v1/chat/completions', model: 'anthropic/claude-3.7-sonnet' },
    ollama: { name: 'Ollama（本地）', baseUrl: 'http://localhost:11434/v1/chat/completions', model: 'llama3' },
    custom: { name: '自定义 OpenAI 兼容', baseUrl: '', model: '' },
  };

  /* ---------------- 工具 ---------------- */
  let _seq = 0;
  function uid() { return 'c' + Date.now().toString(36) + (_seq++).toString(36) + Math.random().toString(36).slice(2, 6); }
  function escBr(s) { return esc(s || '').replace(/\n/g, '<br>'); }
  function toast(msg, type) { if (PW && PW.toast) PW.toast(msg, type); }
  function todayStr() { return (PW.todayStr ? PW.todayStr() : new Date().toISOString().slice(0, 10)); }
  function nowHM() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0'); }
  function addDays(dateStr, n) {
    const p = String(dateStr).split('-').map(Number);
    const d = new Date(p[0], (p[1] || 1) - 1, p[2] || 1);
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function daysBetween(a, b) { // b - a，单位天
    const pa = String(a).split('-').map(Number), pb = String(b).split('-').map(Number);
    const da = new Date(pa[0], pa[1] - 1, pa[2]), db2 = new Date(pb[0], pb[1] - 1, pb[2]);
    return Math.round((db2 - da) / 86400000);
  }
  function hashStr(s) {
    let h = 5381;
    s = String(s || '');
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  async function post(path, body) {
    try {
      const r = await fetch(PW.API_BASE + path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await r.json().catch(() => ({ ok: false, error: 'PARSE', message: '返回解析失败' }));
    } catch (e) { return { ok: false, error: 'NET', message: '网络错误：' + e.message }; }
  }

  /* ---------------- 独立 AI 调用（不复用工作台 AI） ---------------- */
  function getAI() {
    const d = DB.get(AIKEY, null);
    if (d && d.baseUrl) return d;
    return { provider: 'deepseek', baseUrl: PROVIDERS.deepseek.baseUrl, model: PROVIDERS.deepseek.model, apiKey: '' };
  }
  function setAI(a) { DB.set(AIKEY, a); }
  function aiReady() { const a = getAI(); return !!(a.apiKey && a.baseUrl); }
  async function callCollectAI(messages, opts) {
    const a = getAI();
    if (!a.apiKey) return { ok: false, error: 'NO_KEY', message: '请先在「本功能 AI 设置」中填写 API Key' };
    if (!a.baseUrl) return { ok: false, error: 'NO_URL', message: '请填写 API Base URL' };
    const body = {
      messages,
      baseUrl: a.baseUrl,
      apiKey: a.apiKey,
      model: a.model || '',
      temperature: (opts && opts.temperature != null) ? opts.temperature : 0.5,
      max_tokens: (opts && opts.max_tokens != null) ? opts.max_tokens : 1000,
      json: !!(opts && opts.json),
    };
    const j = await post('/api/collect/ai', body);
    if (!j) return { ok: false, error: 'PARSE', message: 'AI 接口无返回' };
    if (!j.ok) return j;
    if (body.json) {
      if (j.data) return { ok: true, data: j.data };
      if (j.content) {
        try { return { ok: true, data: JSON.parse(j.content) }; } catch (e) { /* fallthrough */ }
      }
    }
    return { ok: true, content: j.content || '' };
  }
  // 从 AI 返回里稳健取出 items 数组（兼容 {items:[]} / 裸数组 / 文本夹杂）
  function pickItems(r) {
    if (!r) return [];
    if (r.data) {
      if (Array.isArray(r.data)) return r.data;
      if (Array.isArray(r.data.items)) return r.data.items;
      if (Array.isArray(r.data.data)) return r.data.data;
    }
    if (r.content) {
      const m = r.content.match(/\[[\s\S]*\]/);
      if (m) { try { const a = JSON.parse(m[0]); if (Array.isArray(a)) return a; } catch (e) { /* ignore */ } }
    }
    return [];
  }

  /* ---------------- 数据层 ---------------- */
  function defaults() {
    return {
      version: VERSION,
      items: [],          // 🤖 AI 整理后的资料（全部保留）
      seen: {},           // 🕷 已抓取过的文章 URL（增量检索的核心闸门）
      confirmed: [],      // ✅ 已验证为「信息列表页」的栏目（增量采集只抓这些）
      sections: [],       // 最近一次发现的栏目
      lastCrawlAt: 0,     // 上次采集完成时间戳
      lastCrawlNew: 0,    // 上次新增条数
      stats: { crawled: 0, analyzed: 0 },
      wechat: [],         // 微信聊天记录（已解析的会话）
      filters: { q: '', tags: [], source: 'all', showArchived: true, imp: 'all' },
      log: [],
    };
  }
  function getData() {
    const d = DB.get(KEY, null);
    if (!d || typeof d !== 'object') return defaults();
    const base = defaults();
    const out = Object.assign(base, d);
    // 迁移旧结构（v2：rawPages / keywordOrder；v3 起改为 seen + 流式整理）
    if (Number(out.version || 1) < VERSION) {
      out.items = (Array.isArray(d.items) ? d.items : []).filter((it) => it.sourceType === 'wechat');
      out.seen = {};
      out.lastCrawlAt = 0;
    }
    if (!out.seen || typeof out.seen !== 'object') out.seen = {};
    if (!Array.isArray(out.items)) out.items = [];
    if (!Array.isArray(out.wechat)) {
      out.wechat = (d.wechat && d.wechat.raw) ? [{ id: uid(), importedAt: d.wechat.importedAt || Date.now(), fromFile: '（旧版粘贴记录）', msgs: [], raw: d.wechat.raw }] : [];
    }
    if (!out.filters) out.filters = defaults().filters;
    if (!Array.isArray(out.log)) out.log = [];
    out.version = VERSION;
    return out;
  }
  function setData(d) {
    try { DB.set(KEY, d); }
    catch (e) {
      // 配额保护：先丢弃最旧资料的原文，再重试
      try {
        const items = (d.items || []).slice();
        items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        items.slice(0, Math.ceil(items.length / 3)).forEach((it) => { it.raw = (it.raw || '').slice(0, 300); });
        DB.set(KEY, d);
        toast('本地空间吃紧，已自动精简较早资料的原文缓存', 'info');
      } catch (e2) {
        // 最后兜底：只保留最近 120 条
        d.items = (d.items || []).slice(-120);
        try { DB.set(KEY, d); } catch (e3) { toast('本地存储写入失败，请导出存档后清理', 'error'); }
      }
    }
  }
  function getItems() { return getData().items || []; }
  function saveItems(items) {
    const d = getData();
    // 上限保护：超出时优先丢弃最旧的「已归档」条目
    if (items.length > MAX_ITEMS) {
      const today = todayStr();
      const extra = items.length - MAX_ITEMS;
      const idx = [];
      items.forEach((it, i) => { if (it.archivedAt || (it.deadline && it.deadline < today)) idx.push(i); });
      const drop = new Set(idx.slice(0, extra));
      items = items.filter((_, i) => !drop.has(i));
    }
    d.items = items; setData(d);
  }
  function itemsContain(hash) { return getItems().some((it) => it.hash === hash); }

  /* ---------------- 进度面板（常显，绝不隐藏） ---------------- */
  function logLine(msg) {
    const box = $('cl-log');
    const d = getData();
    d.log = (d.log || []).concat([{ t: nowHM(), m: msg }]).slice(-200);
    setData(d);
    if (box) {
      const line = document.createElement('div');
      line.className = 'cl-log-line';
      line.innerHTML = '<span class="cl-log-t">' + nowHM() + '</span>' + esc(msg);
      box.appendChild(line);
      box.scrollTop = box.scrollHeight;
    }
  }
  function setPhase(label, done, total, note) {
    const ph = $('cl-phase'), ct = $('cl-count'), fill = $('cl-bar-fill'), nt = $('cl-note');
    if (ph) ph.textContent = label || '空闲';
    if (ct) ct.textContent = (total ? (done + '/' + total) : '');
    if (nt) nt.textContent = note || '';
    if (fill) fill.style.width = (total ? Math.round(done / total * 100) : (label && label !== '空闲' ? 6 : 0)) + '%';
  }
  function setRunning(on) {
    st.running = on;
    const dot = $('cl-dot');
    if (dot) dot.classList.toggle('cl-dot-live', !!on);
    const btn = $('cl-recollect');
    if (btn) btn.disabled = !!on;
  }

  /* ---------------- 抓取（爬虫） ---------------- */
  const st = {
    running: false, sections: [], detailId: null, autoTried: false,
  };

  function normUrl(u) {
    try {
      const x = new URL(u);
      x.hash = '';
      let s = x.href;
      s = s.replace(/\?.*$/, '');
      if (s.endsWith('/')) s = s.slice(0, -1);
      return s;
    } catch (e) { return String(u || ''); }
  }
  const NAV_RE = /^(首页|上一页|下一页|末页|尾页|更多|更多>>|more|More|MORE|返回|登录|注册|English|学院首页|学校首页|部门首页|联系我们|网站地图|旧版回顾|设为首页|加入收藏|管理入口|正文|打印|关闭|详情|查看|点击|下载)$/i;
  const FILE_RE = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z|jpg|jpeg|png|gif|mp4|mp3|wmv|avi)$/i;
  // 博达系 CMS 详情页特征：/info/<栏目ID>/<文章ID>.htm
  const DETAIL_RE = /\/info\/\d+\/\d+\.(htm|html|shtml|jsp|php)(\?|$)/i;

  // 清理锚点文本里的 CSS/JS 噪音（东师首页部分栏目的 <a> 内嵌了 <style> 片段）
  function cleanText(t) {
    let s = String(t || '').trim();
    if (!s) return '';
    if (/[{};]/.test(s) || /\.cls-|fill:|stroke:|\.ico|@media/i.test(s)) return '';
    s = s.replace(/\s+/g, ' ').trim();
    if (/^https?:\/\//i.test(s)) return '';
    return s;
  }

  // 是否为「文章详情页」链接（放宽：锚点文本为空也接受，标题随后由文章页自身提供）
  function isArticleLink(l) {
    const href = l.href || '';
    const rawText = String(l.text || '').trim();
    const text = cleanText(rawText);
    if (!/^https?:/i.test(href)) return false;
    if (FILE_RE.test(href)) return false;
    if (/\/index\.(htm|html|shtml|php|asp)$/i.test(href)) return false;
    if (text && NAV_RE.test(text)) return false;
    if (/^\d{4}[-.]\d{1,2}[-.]\d{1,2}$/.test(text)) return false;
    // 强特征：/info/<数字>/<数字>.htm → 一定是详情页
    if (DETAIL_RE.test(href)) return true;
    // 弱特征：必须是网页文件 + 非导航文本，且不在站点根一级（避免把 xxgk.htm 之类栏目页当文章）
    if (!/\.(htm|html|shtml|jsp|php|aspx?)(\?|$)/i.test(href)) return false;
    if (!text) return false;
    if (text.length < 8 || text.length > 90) return false;
    const depth = (href.split('/').length - 3);
    return depth >= 1;
  }
  function extractArticles(links) {
    const seen = new Set();
    const out = [];
    (links || []).forEach((l) => {
      if (!isArticleLink(l)) return;
      const n = normUrl(l.href);
      if (seen.has(n)) return;
      seen.add(n);
      out.push({ url: l.href, title: cleanText(l.text), date: l.date || '' });
    });
    // 有日期的排在前面（列表页通常就是最新在前，日期可用于优先取新的）
    out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return out;
  }

  // 是否为「栏目/列表页」候选（首页导航里的 .htm 页面）
  function isSectionCandidate(l) {
    const href = l.href || '';
    if (!/^https?:/i.test(href)) return false;
    if (FILE_RE.test(href)) return false;
    if (DETAIL_RE.test(href)) return false;
    if (/#/.test(href)) return false;
    return /\.(htm|html|shtml|php)$/i.test(href.replace(/[?#].*$/, ''));
  }

  // 固定种子栏目（东师官网已知入口，作为兜底，保证首次必有可采集栏目）
  const SEED_SECTIONS = [
    { href: 'https://www.nenu.edu.cn/tzgg.htm', text: '通知公告' },
    { href: 'https://www.nenu.edu.cn/dsyw/ywsd.htm', text: '东师要闻' },
  ];


  // 关键词命中度：用于给「候选栏目」排序（命中越多的越可能是有价值的信息栏目）
  function sectionScore(l) {
    const t = cleanText(l.text) || '';
    const u = decodeURIComponent(l.href || '');
    let s = 0;
    if (SECTION_RE.test(t)) s += 3;
    if (SECTION_RE.test(u)) s += 2;
    if (/通知|公告|公示|tzgg|gg|notice|announce/i.test(u + t)) s += 5;
    if (/新闻|要闻|动态|news|dt|yw|xx/i.test(u + t)) s += 3;
    return s;
  }
  // 从首页链接里挑「候选栏目」（未验证，需要抓一次确认是否真是列表页）
  function pickSections(links) {
    const home = normUrl(NENU);
    const seen = new Set();
    const out = [];
    (links || []).forEach((l) => {
      if (!isSectionCandidate(l)) return;
      const n = normUrl(l.href);
      if (seen.has(n) || n === home) return;
      seen.add(n);
      const text = cleanText(l.text) || '';
      out.push({ href: l.href, text: text || l.href, score: sectionScore(l), date: l.date || '' });
    });
    out.sort((a, b) => b.score - a.score);
    // 种子栏目兜底（确保一定有可采集入口）
    SEED_SECTIONS.forEach((s) => {
      const n = normUrl(s.href);
      if (seen.has(n)) return;
      seen.add(n);
      out.unshift({ href: s.href, text: s.text, score: 9, date: '' });
    });
    return out.slice(0, SECTION_MAX);
  }

  // 批量抓取（走服务端并发）
  async function fetchBatch(urls, lite) {
    if (!urls.length) return [];
    const r = await post('/api/collect/fetch-batch', { urls: urls.slice(0, 60), lite: !!lite });
    if (!r || !r.ok) {
      // 服务端不支持批量时串行兜底
      const out = [];
      for (const u of urls) out.push(await post('/api/collect/fetch', { url: u, lite: !!lite }));
      return out;
    }
    return r.results || [];
  }
  async function fetchBatchChunked(urls, lite, onProgress) {
    const out = [];
    for (let i = 0; i < urls.length; i += FETCH_CONC) {
      const part = urls.slice(i, i + FETCH_CONC);
      const res = await fetchBatch(part, lite);
      res.forEach((x) => out.push(x));
      if (onProgress) onProgress(Math.min(i + part.length, urls.length), urls.length);
    }
    return out;
  }

  /* ---------------- AI 分析（整理 / 加标签） ---------------- */
  function itemFromAI(it, page, sourceType, sourceName) {
    const title = String(it.title || page.title || '未命名事项').slice(0, 140);
    const url = page.url || '';
    return {
      id: uid(),
      hash: hashStr(normUrl(url) + '|' + title),
      title,
      summary: String(it.summary || '').slice(0, 1200),
      url,
      sourceType: sourceType || 'nenu',
      sourceName: sourceName || (sourceType === 'wechat' ? '微信记录' : '东北师大官网'),
      section: page.section || '',
      publishDate: String(it.publishDate || page.date || '').slice(0, 10),
      deadline: String(it.deadline || '').slice(0, 10),
      keywords: (Array.isArray(it.keywords) ? it.keywords : []).map((k) => String(k).trim()).filter(Boolean).slice(0, 8),
      category: String(it.category || '').slice(0, 12),
      importance: (it.importance === 'high' || it.importance === 'mid' || it.importance === 'low') ? it.importance : 'mid',
      raw: String(page.text || '').slice(0, RAW_KEEP),
      aiOk: true,
      createdAt: Date.now(),
      archivedAt: null,
      followupEnabled: false,
      followup: null,
    };
  }
  // 无 AI / AI 失败时的兜底条目：保证「资料全部展示」，不因 Key 缺失而空白
  function itemFromRaw(page, sourceType, sourceName, note) {
    const title = String(page.title || '(无标题)').slice(0, 140) || '(无标题)';
    const body = String(page.text || '').replace(/\s+/g, ' ').trim();
    return {
      id: uid(),
      hash: hashStr(normUrl(page.url) + '|' + title),
      title,
      summary: (note ? ('【' + note + '】') : '') + body.slice(0, 260),
      url: page.url || '',
      sourceType: sourceType || 'nenu',
      sourceName: sourceName || '东北师大官网',
      section: page.section || '',
      publishDate: String(page.date || '').slice(0, 10),
      deadline: '',
      keywords: [],
      category: '',
      importance: 'mid',
      raw: String(page.text || '').slice(0, RAW_KEEP),
      aiOk: false,
      createdAt: Date.now(),
      archivedAt: null,
      followupEnabled: false,
      followup: null,
    };
  }

  async function analyzePage(page, sourceType, sourceName) {
    const text = String(page.text || '').slice(0, TEXT_FOR_AI);
    const sys = '你是高校信息整理助手。请阅读官网文章原文，提取用户需要知道的具体「信息条目」（通知/公告/讲座/活动/招生/教务/评奖/就业等），并做中文归纳。要求措辞客观准确，不臆造日期。';
    const user = '【来源链接】' + (page.url || '') + '\n【页面标题】' + (page.title || '') + '\n【栏目】' + (page.section || '') + '\n【页面日期线索】' + (page.date || '未识别') + '\n【正文节选】\n"""\n' + text + '\n"""\n\n'
      + '请输出 JSON 对象：{"items":[{"title":"信息标题（20字内，保留关键信息）",'
      + '"summary":"中文摘要与解读（2-4句：是什么、谁需要关注、要做什么、注意事项）",'
      + '"publishDate":"发布日期 YYYY-MM-DD，无法确定则空字符串",'
      + '"deadline":"截止/报名/提交日期 YYYY-MM-DD，无则空字符串",'
      + '"keywords":["关键词2-6个，每个2-6字，如 选课/奖学金/答辩/截止"],'
      + '"category":"通知|公告|讲座|活动|招生|教务|评奖|就业|其他 之一",'
      + '"importance":"high|mid|low"}]}。'
      + '若正文不含任何具体信息条目，返回 {"items":[]}。只输出 JSON，不要任何多余文字。';
    const r = await callCollectAI([
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ], { json: true, temperature: 0.3, max_tokens: 900 });
    if (!r.ok) return { ok: false, message: r.message || r.error || 'AI 调用失败', items: [] };
    const arr = pickItems(r);
    return { ok: true, items: arr.map((it) => itemFromAI(it, page, sourceType, sourceName)) };
  }

  // 并发分析 + 完成一条立即上屏一条
  async function analyzeAndStream(pages, sourceType, sourceName, phaseLabel) {
    const total = pages.length;
    if (!total) return { added: 0, failed: 0 };
    let done = 0, added = 0, failed = 0;
    let cursor = 0;
    if (!aiReady()) {
      // 未配置 Key：仍然把原始资料全部落到清单里，保证「全部展示」
      setPhase('整理（本地摘要）', 0, total, '未配置 AI Key，先以原始标题+摘要入库；配置 Key 后可点「🤖 AI 重新整理」');
      pages.forEach((p, i) => {
        const it = itemFromRaw(p, sourceType, sourceName, '原始抓取，待 AI 整理');
        insertItem(it);
        done++;
        if ((done % 3 === 0) || done === total) setPhase('整理（本地摘要）', done, total, '已入库 ' + done + '/' + total);
      });
      renderAll();
      return { added: done, failed: 0 };
    }
    setPhase(phaseLabel || 'AI 整理中', 0, total, 'AI 每整理完一条会立即上屏');
    const worker = async () => {
      for (;;) {
        const i = cursor++;
        if (i >= total) return;
        const p = pages[i];
        let res;
        try { res = await analyzePage(p, sourceType, sourceName); }
        catch (e) { res = { ok: false, items: [], message: String((e && e.message) || e) }; }
        if (res.ok && res.items.length) {
          res.items.forEach((it) => { if (insertItem(it)) added++; });
        } else {
          failed++;
          // AI 未产出条目时也不丢资料：以原始摘要入库（标注为待整理）
          const fb = itemFromRaw(p, sourceType, sourceName, res.ok ? 'AI 判定无具体条目，已存原文' : ('AI 整理失败：' + (res.message || '未知')));
          if (insertItem(fb)) added++;
        }
        done++;
        setPhase(phaseLabel || 'AI 整理中', done, total, '已上屏 ' + added + ' 条 / 处理 ' + done + '/' + total);
        renderList(); renderStats(); renderTagFilter();
      }
    };
    await Promise.all(Array.from({ length: Math.min(AI_CONC, total) }, worker));
    return { added, failed };
  }

  function insertItem(it) {
    if (!it) return false;
    if (it.hash && itemsContain(it.hash)) return false;
    const items = getItems();
    items.push(it);
    saveItems(items);
    return true;
  }

  /* ---------------- 采集主流程 ---------------- */
  async function runCollect(mode) {
    // mode: 'auto'（进入页面自动，首轮全量/后续增量） | 'force'（忽略当日闸门做增量） | 'full'（重置后全量）
    if (st.running) { toast('采集正在进行中，请稍候', 'info'); return; }
    setRunning(true);
    let d = getData();
    const firstRun = !d.seen || Object.keys(d.seen).length === 0 || mode === 'full' || !(d.confirmed || []).length;
    if (mode === 'full') {
      d.seen = {}; d.confirmed = [];
      d.items = (d.items || []).filter((it) => it.sourceType !== 'nenu');
      setData(d);
    }
    // 当日闸门（auto 模式一天只自动跑一次）
    const today = todayStr();
    if (mode === 'auto' && d.lastCrawlAt && new Date(d.lastCrawlAt).toDateString() === new Date().toDateString()) {
      setRunning(false);
      setPhase('空闲', 0, 0, '今日已自动采集过（' + new Date(d.lastCrawlAt).toLocaleTimeString() + '）；可点「🔄 增量更新」手动再查一次新资料');
      return;
    }
    const cap = firstRun ? MAX_NEW_FIRST : MAX_NEW_INCR;
    const t0 = Date.now();
    try {
      setPhase('探索首页', 0, 1, firstRun ? '首次采集：全量检索官网' : '增量采集：只找新发布的资料');
      logLine('开始' + (firstRun ? '首次全量' : '增量') + '采集 @' + NENU);

      const home = await post('/api/collect/fetch', { url: NENU, lite: true });
      if (!home || !home.ok) {
        setPhase('采集失败', 0, 0, (home && home.message) || '无法访问官网');
        logLine('❌ 首页抓取失败：' + ((home && home.message) || '未知'));
        toast('官网访问失败：' + ((home && home.message) || '未知'), 'error');
        return;
      }
      const allLinks = home.links || [];
      // 首页本身就是一个文章源（要闻 / 学术报告等直接列在首页）
      const homeArts = extractArticles(allLinks);
      logLine('首页发现 ' + allLinks.length + ' 个站内链接，其中 ' + homeArts.length + ' 篇疑似文章');

      // 确认栏目：首次全量验证候选栏目；之后直接复用已确认栏目（大幅提速）
      let sections = (d.confirmed || []).slice();
      if (firstRun || !sections.length) {
        const cands = pickSections(allLinks);
        setPhase('验证栏目', 0, cands.length, '正在验证 ' + cands.length + ' 个候选栏目是否为信息列表页');
        const candPages = await fetchBatchChunked(cands.map((c) => c.href), true, (done, total) => {
          setPhase('验证栏目', done, total, '正在验证候选栏目');
        });
        const confirmed = [];
        const seedSet = SEED_SECTIONS.map((s) => normUrl(s.href));
        candPages.forEach((p, i) => {
          if (!p || !p.ok) return;
          const c = cands[i];
          const n = extractArticles(p.links || []).length;
          if (n < 3) return;
          const isSeed = seedSet.indexOf(normUrl(c.href)) >= 0;
          // 过滤掉「学校概况 / 现任领导」这类纯导航页：栏目名或 URL 必须带有信息类关键词
          const looksInfo = isSeed || SECTION_RE.test(c.text || '')
            || /通知|公告|公示|新闻|要闻|动态|讲座|学术|就业|招生|教务|tzgg|gg|notice|news|dt|yw/i.test(decodeURIComponent(c.href));
          if (!looksInfo) return;
          confirmed.push({ href: c.href, text: c.text, count: n });
        });
        confirmed.sort((a, b) => b.count - a.count);
        sections = confirmed.slice(0, SECTION_MAX);
        if (!sections.length) sections = SEED_SECTIONS.map((s) => ({ href: s.href, text: s.text, count: 0 }));
        d = getData(); d.confirmed = sections; setData(d);
        logLine('栏目验证完成：确认 ' + sections.length + ' 个信息栏目 → ' + sections.map((s) => s.text || s.href).slice(0, 6).join('、'));
        // 注意：未确认的候选栏目只用于「验证」，绝不抽取其文章，避免把导航页噪音当资料
      }
      st.sections = sections;

      // 抓已确认栏目（lite：只要能抽出文章链接）
      setPhase('抓取栏目', 0, sections.length, '正在读取 ' + sections.length + ' 个栏目列表');
      const secPages = await fetchBatchChunked(sections.map((s) => s.href), true, (done, total) => {
        setPhase('抓取栏目', done, total, '正在读取栏目列表');
      });

      // 汇总文章链接（增量核心：过滤掉已见过的 URL）
      const cands = [];
      const skipped = { n: 0 };
      const localSeen = new Set();
      const push = (a, sectionName) => {
        const n = normUrl(a.url);
        if (d.seen[n]) { skipped.n++; return; }
        if (localSeen.has(n)) return;
        localSeen.add(n);
        cands.push({ url: a.url, title: a.title, date: a.date || '', section: sectionName || '' });
      };
      homeArts.forEach((a) => push(a, '首页'));
      secPages.forEach((sp, i) => {
        const sec = sections[i] || {};
        if (!sp || !sp.ok) { logLine('⚠ 栏目不可达：' + (sec.text || sec.href)); return; }
        extractArticles(sp.links || []).slice(0, PER_SECTION * 2).forEach((a) => push(a, sec.text || ''));
      });

      const targets = cands.slice(0, cap);
      logLine('待采新文章 ' + targets.length + ' 篇' + (skipped.n ? '（已跳过 ' + skipped.n + ' 篇历史文章，不再重复抓取）' : ''));
      if (!targets.length) {
        const dNone = getData(); dNone.lastCrawlAt = Date.now(); dNone.lastCrawlNew = 0; setData(dNone);
        setPhase('空闲', 0, 0, '没有新资料（本地已有 ' + getItems().length + ' 条，已见链接 ' + Object.keys(dNone.seen).length + ' 个）');
        logLine('✅ 无新资料，未重复抓取任何历史页面');
        renderStats();
        toast('没有发现新资料', 'info');
        return;
      }

      // 抓文章正文（full）
      setPhase('抓取正文', 0, targets.length, '正在下载 ' + targets.length + ' 篇文章');
      const pages = await fetchBatchChunked(targets.map((t) => t.url), false, (done, total) => {
        setPhase('抓取正文', done, total, '正在下载文章正文');
      });
      const okPages = [];
      pages.forEach((p, i) => {
        const t = targets[i];
        if (!p || !p.ok) { logLine('⚠ 跳过不可达：' + (t.title || t.url)); return; }
        p.section = t.section || '';
        if (!p.date && t.date) p.date = t.date;
        if (!p.title || /^https?:\/\//.test(p.title)) p.title = t.title || p.title;
        okPages.push(p);
      });
      logLine('成功获取 ' + okPages.length + ' 篇文章正文');

      // 记录已见 URL + 已确认栏目（无论 AI 是否成功，都不再重复抓取）
      const dRec = getData();
      targets.forEach((t) => { dRec.seen[normUrl(t.url)] = Date.now(); });
      dRec.confirmed = sections;
      dRec.stats = { crawled: ((dRec.stats && dRec.stats.crawled) || 0) + okPages.length, analyzed: getItems().length };
      setData(dRec);

      // AI 整理：完成一条立刻上屏一条
      const res = await analyzeAndStream(okPages, 'nenu', '东北师大官网', 'AI 整理中');
      const d2 = getData();
      d2.lastCrawlAt = Date.now();
      d2.lastCrawlNew = res.added;
      d2.stats = { crawled: dRec.stats.crawled, analyzed: getItems().length };
      setData(d2);
      logLine('✅ 采集完成：新增 ' + res.added + ' 条' + (res.failed ? '（' + res.failed + ' 篇 AI 未产出，已存原文）' : '') + '，耗时 ' + Math.round((Date.now() - t0) / 1000) + 's');
      setPhase('空闲', 0, 0, '本次新增 ' + res.added + ' 条 · 耗时 ' + Math.round((Date.now() - t0) / 1000) + 's · 共 ' + getItems().length + ' 条资料');
      toast('采集完成，新增 ' + res.added + ' 条资料', 'success');
      renderAll();
    } catch (e) {
      console.error('[collect] 采集异常', e);
      setPhase('异常结束', 0, 0, String((e && e.message) || e));
      logLine('❌ 采集异常：' + String((e && e.message) || e));
      toast('采集出错：' + String((e && e.message) || e), 'error');
    } finally {
      setRunning(false);
    }
  }

  // 用 AI 重新整理「尚未 AI 整理」的本地条目（针对未配置 Key 时入库的原始条目）
  async function reanalyzePending() {
    if (st.running) { toast('有任务正在运行', 'info'); return; }
    if (!aiReady()) { toast('请先在「本功能 AI 设置」填写 API Key', 'error'); return; }
    const items = getItems().filter((it) => !it.aiOk && it.raw);
    if (!items.length) { toast('没有待整理的条目', 'info'); return; }
    setRunning(true);
    try {
      const pages = items.map((it) => ({ url: it.url, title: it.title, date: it.publishDate, text: it.raw, section: it.section }));
      // 先移除旧条目，再交给流式整理重新入库
      saveItems(getItems().filter((it) => it.aiOk));
      renderAll();
      await analyzeAndStream(pages, 'nenu', '东北师大官网', 'AI 重新整理中');
      const d = getData(); d.lastCrawlAt = d.lastCrawlAt || Date.now();
      setData(d);
      setPhase('空闲', 0, 0, 'AI 重新整理完成');
      renderAll();
    } finally { setRunning(false); }
  }

  /* ---------------- 微信聊天记录（上传 + 解析 + AI 分析） ---------------- */
  // 解析微信导出的 .txt / .csv / .json 为结构化消息
  // 支持多种常见形态：
  //   A) 2026-09-20 21:03:12 张三          （时间 + 发言人，下一行是内容）
  //   B) 2026-09-20 21:03:12 张三: 内容    （时间 + 发言人 + 内容 同行）
  //   C) 张三: 内容                        （仅发言人）
  //   D) 2026-09-20 21:03:12               （仅时间，内容在下一行）
  function parseChatText(raw) {
    const msgs = [];
    const lines = String(raw || '').replace(/\r\n?/g, '\n').split('\n');
    const reTimeLead = /^\s*[\[【]?(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?)[\]】]?[\s·\-|]*(.*)$/;
    const reSenderColon = /^\s*[\[【]?([^:：\n]{1,24})[\]】]?\s*[:：]\s*([\s\S]*)$/;
    const isPureSender = (s) => !!s && s.length <= 24 && !/[。，、！？；：,;!?]/.test(s) && !/^\d/.test(s);
    let cur = null;
    const push = (m) => { if (m && (m.content || m.sender || m.time)) { msgs.push(m); cur = m; } };
    for (const rawLine of lines) {
      const line = rawLine.replace(/\s+$/, '');
      if (!line.trim()) continue;
      const mt = line.match(reTimeLead);
      if (mt) {
        const time = normalizeDateStr(mt[1]);
        const rest = mt[2].trim();
        if (!rest) { push({ time, sender: '', content: '' }); continue; }
        const ms = rest.match(reSenderColon);
        if (ms && isPureSender(ms[1].trim()) && ms[2].trim()) push({ time, sender: ms[1].trim(), content: ms[2].trim() });
        else if (isPureSender(rest)) push({ time, sender: rest, content: '' }); // 发言人在下一行起内容
        else push({ time, sender: '', content: rest });
        continue;
      }
      const ms = line.match(reSenderColon);
      if (ms && isPureSender(ms[1].trim()) && ms[2].trim()) {
        push({ time: '', sender: ms[1].trim(), content: ms[2].trim() });
        continue;
      }
      if (cur && !cur.content && !cur.sender && isPureSender(line.trim())) { cur.sender = line.trim(); continue; }
      if (cur) cur.content += (cur.content ? '\n' : '') + line.trim();
      else push({ time: '', sender: '', content: line.trim() });
    }
    return msgs.filter((m) => m.content);
  }
  function normalizeDateStr(s) {
    const m = String(s).match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (!m) return String(s).trim();
    return m[1] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[3]).padStart(2, '0') + (m[4] ? (' ' + String(m[4]).padStart(2, '0') + ':' + m[5]) : '');
  }
  function parseChatCsv(text) {
    const rows = String(text).split(/\r?\n/).filter((l) => l.trim());
    if (!rows.length) return { msgs: [], raw: '' };
    const cell = (l) => (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).map((s) => s.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    const head = cell(rows[0]).map((h) => h.toLowerCase());
    const idxTime = head.findIndex((h) => /time|时间|日期|date/.test(h));
    const idxFrom = head.findIndex((h) => /from|发送|昵称|name|sender|用户|好友/.test(h));
    const idxText = head.findIndex((h) => /content|内容|消息|text|msg/.test(h));
    const msgs = [];
    if (idxText >= 0) {
      for (let i = 1; i < rows.length; i++) {
        const c = cell(rows[i]);
        const content = c[idxText] || '';
        if (!content) continue;
        msgs.push({ time: idxTime >= 0 ? normalizeDateStr(c[idxTime] || '') : '', sender: idxFrom >= 0 ? (c[idxFrom] || '') : '', content });
      }
      return { msgs, raw: text };
    }
    return { msgs: parseChatText(text), raw: text };
  }
  function parseChatJson(text) {
    let j = null;
    try { j = JSON.parse(text); } catch (e) { j = null; }
    if (!j) return { msgs: parseChatText(text), raw: text };
    const arr = Array.isArray(j) ? j : (Array.isArray(j.messages) ? j.messages : (Array.isArray(j.data) ? j.data : (Array.isArray(j.chat) ? j.chat : null)));
    if (!arr) return { msgs: parseChatText(text), raw: text };
    const msgs = arr.map((m) => ({
      time: normalizeDateStr(m.time || m.date || m.timestamp || m.createTime || ''),
      sender: String(m.sender || m.from || m.name || m.nickname || m.user || m.talker || '').trim(),
      content: String(m.content || m.text || m.msg || m.message || '').trim(),
    })).filter((m) => m.content);
    return { msgs, raw: text };
  }
  function parseChatFile(name, text) {
    const lower = String(name || '').toLowerCase();
    if (lower.endsWith('.json')) return parseChatJson(text);
    if (lower.endsWith('.csv')) return parseChatCsv(text);
    // .txt / .md：先看有没有 CSV 表头
    if (/^\s*[^\n]*,/.test(text) && /content|内容|消息|time|时间/i.test(text.split('\n')[0])) return parseChatCsv(text);
    return { msgs: parseChatText(text), raw: text };
  }

  async function analyzeWechatConv(conv) {
    if (!aiReady()) { toast('请先在「本功能 AI 设置」填写 API Key', 'error'); return; }
    const msgs = conv.msgs || [];
    if (!msgs.length) { toast('没有解析到有效聊天内容', 'info'); return; }
    if (st.running) { toast('有任务正在运行', 'info'); return; }
    setRunning(true);
    try {
      // 重建全文，按 6000 字切块，逐块送 AI（并发），有结果立即上屏
      const lines = msgs.map((m) => (m.time ? '[' + m.time + '] ' : '') + (m.sender ? m.sender + ': ' : '') + m.content);
      const chunks = [];
      let buf = '';
      lines.forEach((l) => {
        if ((buf + '\n' + l).length > 6000) { if (buf) chunks.push(buf); buf = l; }
        else buf = buf ? (buf + '\n' + l) : l;
      });
      if (buf) chunks.push(buf);
      const pages = chunks.slice(0, 8).map((c, i) => ({
        url: 'wechat://' + conv.id + '#' + (i + 1),
        title: '微信聊天记录节选 ' + (i + 1) + '/' + chunks.length,
        date: (msgs[0] && msgs[0].time ? msgs[0].time.slice(0, 10) : ''),
        text: c,
        // 聊天记录没有可点击的来源链接，详情里展示这段原文即可
        isChat: true,
      }));
      setPhase('AI 分析聊天记录', 0, pages.length, '共 ' + msgs.length + ' 条消息，分 ' + pages.length + ' 段分析');
      await analyzeAndStream(pages, 'wechat', conv.fromFile || '微信记录', 'AI 分析聊天记录中');
      const d = getData();
      const c = (d.wechat || []).find((x) => x.id === conv.id);
      if (c) { c.analyzedAt = Date.now(); setData(d); }
      setPhase('空闲', 0, 0, '聊天记录分析完成');
      renderAll();
      toast('聊天记录已分析并入库', 'success');
    } finally { setRunning(false); }
  }

  /* ---------------- 归档判定 / 排序 ---------------- */
  function isArchived(it) {
    if (it.archivedAt) return true;
    if (it.deadline && it.deadline < todayStr()) return true; // 已过期自动归档
    return false;
  }
  function dlInfo(it) {
    if (!it.deadline) return { text: '', cls: '' };
    const left = daysBetween(todayStr(), it.deadline);
    if (left < 0) return { text: '已过期 ' + (-left) + ' 天', cls: 'cl-dl-expired' };
    if (left === 0) return { text: '今天截止', cls: 'cl-dl-soon' };
    if (left <= 3) return { text: '剩余 ' + left + ' 天', cls: 'cl-dl-soon' };
    if (left <= 7) return { text: '剩余 ' + left + ' 天', cls: 'cl-dl-week' };
    return { text: '剩余 ' + left + ' 天', cls: 'cl-dl-normal' };
  }
  const IMP_RANK = { high: 0, mid: 1, low: 2 };
  const IMP_TEXT = { high: '重要', mid: '中等', low: '一般' };

  function filteredSorted() {
    const f = getData().filters || {};
    const q = (f.q || '').trim().toLowerCase();
    const tags = f.tags || [];
    let items = getItems().slice();
    if (!f.showArchived) items = items.filter((it) => !isArchived(it));
    if (f.source && f.source !== 'all') items = items.filter((it) => it.sourceType === f.source);
    if (f.imp && f.imp !== 'all') items = items.filter((it) => it.importance === f.imp);
    if (tags.length) items = items.filter((it) => (it.keywords || []).some((k) => tags.indexOf(k) >= 0));
    if (q) {
      items = items.filter((it) => (
        (it.title || '') + ' ' + (it.summary || '') + ' ' + (it.keywords || []).join(' ') + ' ' +
        (it.publishDate || '') + ' ' + (it.deadline || '') + ' ' + (it.sourceName || '') + ' ' + (it.category || '')
      ).toLowerCase().indexOf(q) >= 0);
    }
    items.sort((a, b) => {
      const aa = isArchived(a) ? 1 : 0, bb = isArchived(b) ? 1 : 0;
      if (aa !== bb) return aa - bb;                       // 未归档优先
      if (aa === 1) return (b.createdAt || 0) - (a.createdAt || 0); // 归档区按入库时间倒序
      const ha = a.deadline ? 1 : 0, hb = b.deadline ? 1 : 0;
      if (ha !== hb) return hb - ha;                       // 有截止时间的优先（越近越靠上）
      if (ha && a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1;
      const ra = IMP_RANK[a.importance] == null ? 1 : IMP_RANK[a.importance];
      const rb = IMP_RANK[b.importance] == null ? 1 : IMP_RANK[b.importance];
      if (ra !== rb) return ra - rb;
      const pa = a.publishDate || '', pb = b.publishDate || '';
      if (pa !== pb) return pa < pb ? 1 : -1;              // 其余按发布时间倒序
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return items;
  }

  /* ---------------- 渲染：列表 ---------------- */
  function renderStats() {
    const box = $('cl-stats');
    if (!box) return;
    const d = getData();
    const all = getItems();
    const arch = all.filter(isArchived).length;
    const act = all.length - arch;
    const last = d.lastCrawlAt ? new Date(d.lastCrawlAt).toLocaleString() : '尚未采集';
    const due3 = all.filter((it) => !isArchived(it) && it.deadline && daysBetween(todayStr(), it.deadline) <= 3).length;
    box.innerHTML = '<b>' + all.length + '</b> 条资料 · 进行中 <b>' + act + '</b> · 已归档 <b>' + arch + '</b>'
      + (due3 ? ' · <b class="cl-warn">3 天内截止 ' + due3 + '</b>' : '')
      + '<br><span class="cl-dim">上次采集：' + esc(last) + ' · 已见链接 ' + Object.keys(d.seen || {}).length + ' 个（增量检索不再重复抓取）</span>';
  }

  function cardHtml(it, idx) {
    const arch = isArchived(it);
    const autoArch = !it.archivedAt && arch;
    const dl = dlInfo(it);
    const imp = it.importance || 'mid';
    const srcName = it.sourceName || (it.sourceType === 'wechat' ? '微信记录' : '东北师大官网');
    const srcCls = it.sourceType === 'wechat' ? 'cl-src-wechat' : 'cl-src-nenu';
    const kws = (it.keywords || []).map((k) => '<span class="cl-tag" data-act="tag" data-tag="' + esc(k) + '">' + esc(k) + '</span>').join('');
    const meta = [];
    if (it.publishDate) meta.push('发布 ' + esc(it.publishDate));
    if (it.deadline) meta.push('截止 ' + esc(it.deadline));
    if (it.section) meta.push('栏目 ' + esc(it.section));
    if (it.category) meta.push(esc(it.category));
    const fu = it.followupEnabled;
    const fuAns = (it.followup && it.followup.answer)
      ? '<div class="cl-fu-ans"><div class="cl-fu-q">问：' + escBr(it.followup.question) + '</div><div class="cl-fu-a">答：' + escBr(it.followup.answer) + '</div></div>'
      : '';
    return '<div class="cl-item' + (arch ? ' cl-item-arch' : '') + '" data-id="' + it.id + '">'
      + '<div class="cl-item-head">'
      + '<span class="cl-idx">#' + idx + '</span>'
      + '<span class="cl-title" data-act="detail" data-id="' + it.id + '" title="点击查看详细内容">' + esc(it.title) + '</span>'
      + (arch ? '<span class="cl-badge cl-badge-arch">' + (autoArch ? '已过期·自动归档' : '已归档') + '</span>' : '')
      + (it.aiOk === false ? '<span class="cl-badge cl-badge-raw">原始</span>' : '')
      + '<span class="cl-badge ' + srcCls + '">' + esc(srcName) + '</span>'
      + '<span class="cl-badge cl-imp-' + imp + '">' + (IMP_TEXT[imp] || '中等') + '</span>'
      + (dl.text ? '<span class="cl-dl ' + dl.cls + '">' + esc(dl.text) + '</span>' : '')
      + '</div>'
      + (meta.length ? '<div class="cl-meta">' + meta.join(' · ') + '</div>' : '')
      + (it.summary ? '<div class="cl-summary">' + escBr(it.summary) + '</div>' : '')
      + (kws ? '<div class="cl-tags">' + kws + '</div>' : '')
      + '<div class="cl-actions">'
      + '<button class="cl-btn" data-act="detail" data-id="' + it.id + '">📄 查看详情</button>'
      + (it.url && !/^wechat:/.test(it.url) ? '<a class="cl-btn" href="' + esc(it.url) + '" target="_blank" rel="noopener">🔗 来源链接</a>' : '')
      + '<button class="cl-btn' + (fu ? ' cl-btn-on' : '') + '" data-act="toggle-fu" data-id="' + it.id + '">🤖 AI 追问</button>'
      + '<button class="cl-btn" data-act="archive" data-id="' + it.id + '">' + (arch ? '↩ 取消归档' : '📦 归档') + '</button>'
      + '<button class="cl-btn cl-btn-danger" data-act="del-item" data-id="' + it.id + '">✕ 删除</button>'
      + '</div>'
      + '<div class="cl-fu" style="display:' + (fu ? 'block' : 'none') + '">'
      + '<div class="cl-fu-row"><input class="cl-input cl-fu-input" placeholder="向 AI 追问（例如：这件事我需要准备什么材料？截止前要做什么？）">'
      + '<button class="cl-btn cl-btn-gold" data-act="ask-fu" data-id="' + it.id + '">追问</button></div>'
      + fuAns + '</div>'
      + '</div>';
  }

  function renderList() {
    const box = $('cl-list');
    if (!box) return;
    const items = filteredSorted();
    const total = getItems().length;
    const cnt = $('cl-list-count');
    if (cnt) cnt.textContent = '显示 ' + items.length + ' / 共 ' + total + ' 条';
    if (!items.length) {
      box.innerHTML = '<div class="cl-empty">'
        + (total ? '当前筛选条件下没有资料。换个筛选条件试试，或勾选「显示已归档」。' : '暂无资料。进入本页面会自动开始采集；也可点上方「🔄 增量更新」立即采集。')
        + '</div>';
      return;
    }
    box.innerHTML = items.map((it, i) => cardHtml(it, i + 1)).join('');
  }

  function renderTagFilter() {
    const box = $('cl-tags');
    if (!box) return;
    const freq = {};
    getItems().forEach((it) => (it.keywords || []).forEach((k) => { freq[k] = (freq[k] || 0) + 1; }));
    const list = Object.keys(freq).sort((a, b) => freq[b] - freq[a] || a.localeCompare(b)).slice(0, 60);
    const f = getData().filters || {};
    const active = f.tags || [];
    if (!list.length) { box.innerHTML = '<span class="cl-dim">暂无标签（AI 整理后会自动生成）</span>'; return; }
    box.innerHTML = list.map((k) => {
      const on = active.indexOf(k) >= 0;
      return '<span class="cl-tag' + (on ? ' cl-tag-on' : '') + '" data-act="tag" data-tag="' + esc(k) + '">' + esc(k) + '<i>' + freq[k] + '</i></span>';
    }).join('');
    const clear = $('cl-tag-clear');
    if (clear) clear.style.display = active.length ? 'inline-flex' : 'none';
  }

  function renderAll() { renderStats(); renderTagFilter(); renderList(); }

  /* ---------------- 渲染：整页 ---------------- */
  function render() {
    const sec = $('collect-section');
    if (!sec) return;
    const d = getData();
    const f = d.filters || {};
    sec.innerHTML =
      '<div class="cl-wrap">'

      /* 工具条 */
      + '<div class="cl-bar">'
      + '<div class="cl-bar-l">'
      + '<button class="cl-btn cl-btn-gold" data-act="open-ai">⚙ AI 设置</button>'
      + '<button class="cl-btn" id="cl-recollect" data-act="recollect">🔄 增量更新</button>'
      + '<button class="cl-btn" data-act="reanalyze">🤖 AI 重新整理</button>'
      + '<button class="cl-btn" data-act="open-wechat">📥 上传微信记录</button>'
      + '<button class="cl-btn" data-act="sections">⚙ 栏目选择</button>'
      + '<button class="cl-btn" data-act="export">⬇ 导出存档</button>'
      + '<button class="cl-btn" data-act="cloud">☁ 云端（预留）</button>'
      + '<button class="cl-btn cl-btn-danger" data-act="full-reset">🧹 重置并全量重爬</button>'
      + '</div>'
      + '<div class="cl-stats" id="cl-stats"></div>'
      + '</div>'

      /* 进度面板：常显（不再隐藏） */
      + '<div class="cl-progress">'
      + '<div class="cl-prog-head">'
      + '<span class="cl-dot" id="cl-dot"></span>'
      + '<span class="cl-phase" id="cl-phase">空闲</span>'
      + '<span class="cl-count" id="cl-count"></span>'
      + '<span class="cl-note" id="cl-note">🕷 爬虫只负责抓取官网内容；🤖 AI 只负责分析 / 整理 / 排序 / 加标签</span>'
      + '</div>'
      + '<div class="cl-track"><div class="cl-fill" id="cl-bar-fill"></div></div>'
      + '<div class="cl-log" id="cl-log"></div>'
      + '</div>'

      /* 筛选器 */
      + '<div class="cl-panel">'
      + '<div class="cl-panel-h">🔍 筛选器' + '<span class="cl-panel-h-r" id="cl-list-count"></span></div>'
      + '<div class="cl-frow">'
      + '<input class="cl-input cl-grow" id="cl-q" placeholder="搜索标题 / 摘要 / 标签 / 日期…" value="' + esc(f.q || '') + '">'
      + '<select class="cl-select" id="cl-source">'
      + '<option value="all"' + (f.source === 'all' || !f.source ? ' selected' : '') + '>全部来源</option>'
      + '<option value="nenu"' + (f.source === 'nenu' ? ' selected' : '') + '>东北师大官网</option>'
      + '<option value="wechat"' + (f.source === 'wechat' ? ' selected' : '') + '>微信记录</option>'
      + '</select>'
      + '<select class="cl-select" id="cl-imp">'
      + '<option value="all"' + (f.imp === 'all' || !f.imp ? ' selected' : '') + '>全部重要度</option>'
      + '<option value="high"' + (f.imp === 'high' ? ' selected' : '') + '>重要</option>'
      + '<option value="mid"' + (f.imp === 'mid' ? ' selected' : '') + '>中等</option>'
      + '<option value="low"' + (f.imp === 'low' ? ' selected' : '') + '>一般</option>'
      + '</select>'
      + '<label class="cl-check"><input type="checkbox" id="cl-arch"' + (f.showArchived ? ' checked' : '') + '>显示已归档</label>'
      + '<button class="cl-btn" id="cl-tag-clear" data-act="tag-clear">清除标签筛选</button>'
      + '</div>'
      + '<div class="cl-tags cl-tags-filter" id="cl-tags"></div>'
      + '<div class="cl-sort-hint">排序规则：<b>截止时间最接近的置顶</b> → 重要度 → 发布时间；已过期资料<b>自动归档</b>并沉到列表末尾。</div>'
      + '</div>'

      /* 资料清单：全部展示 */
      + '<div class="cl-panel">'
      + '<div class="cl-panel-h">📚 资料清单</div>'
      + '<div class="cl-list" id="cl-list"></div>'
      + '</div>'

      + '</div>';

    // 恢复日志（常显面板里回放历史记录）
    const box = $('cl-log');
    if (box) {
      box.innerHTML = (d.log || []).slice(-40).map((l) =>
        '<div class="cl-log-line"><span class="cl-log-t">' + esc(l.t) + '</span>' + esc(l.m) + '</div>').join('');
      box.scrollTop = box.scrollHeight;
    }
    const q = $('cl-q'); if (q && f.q) q.value = f.q;

    wire();
    renderAll();
    if (!st.running) setPhase('空闲', 0, 0);

    // 进入页面自动采集：首轮全量 / 之后增量（同日只自动跑一次）
    if (!st.autoTried) { st.autoTried = true; runCollect('auto'); }
  }

  /* ---------------- 统一动作分发（页面内 + 弹窗内共用） ---------------- */
  async function handleAct(act, t) {
    const id = (t && t.dataset) ? t.dataset.id : '';
    if (act === 'open-ai') return openAIModal();
    if (act === 'cloud') return cloudReserved();
    if (act === 'export') return exportData();
    if (act === 'recollect') return runCollect('force');
    if (act === 'full-reset') return fullReset();
    if (act === 'reanalyze') return reanalyzePending();
    if (act === 'open-wechat') return openWechatModal();
    if (act === 'sections') return openSectionsModal();
    if (act === 'sections-save') return saveSections();
    if (act === 'detail') return openDetail(id);
    if (act === 'toggle-fu') return toggleFollowup(id);
    if (act === 'ask-fu') return askFollowup(id);
    if (act === 'ask-fu-detail') { const inp = $('cl-detail-q'); return askFollowup(id, inp ? inp.value.trim() : ''); }
    if (act === 'archive') return toggleArchive(id);
    if (act === 'del-item') return delItem(id);
    if (act === 'tag') return toggleTag(t.dataset.tag);
    if (act === 'tag-clear') return clearTags();
    if (act === 'close-modal') return closeModal();
    if (act === 'ai-save') return void saveAI();
    if (act === 'ai-test') return void testAI();
    // 微信
    if (act === 'wechat-file') { const el = $('wechat-file'); if (el) el.click(); return; }
    if (act === 'wechat-save') return void saveWechat();
    if (act === 'wechat-analyze') { const c = saveWechat(true); if (c) await analyzeWechatConv(c); return; }
    // 栏目
    if (act === 'sections-run') return runPickedSections();
  }

  /* ---------------- 事件绑定（一次，委托到持久 section） ---------------- */
  function wire() {
    const sec = $('collect-section');
    if (!sec || sec._wired) return;
    sec._wired = true;

    sec.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      handleAct(t.dataset.act, t);
    });

    // 筛选器
    sec.addEventListener('input', (e) => {
      if (!e.target) return;
      if (e.target.id === 'cl-q') {
        const d = getData(); d.filters.q = e.target.value; setData(d);
        if (sec._qTimer) clearTimeout(sec._qTimer);
        sec._qTimer = setTimeout(renderList, 160);
      }
    });
    sec.addEventListener('change', (e) => {
      if (!e.target) return;
      const d = getData();
      if (e.target.id === 'cl-source') { d.filters.source = e.target.value; setData(d); renderList(); }
      else if (e.target.id === 'cl-imp') { d.filters.imp = e.target.value; setData(d); renderList(); }
      else if (e.target.id === 'cl-arch') { d.filters.showArchived = !!e.target.checked; setData(d); renderList(); }
    });
    sec.addEventListener('keydown', (e) => {
      if (e.target && e.target.id === 'cl-q' && e.key === 'Enter') { e.preventDefault(); renderList(); }
    });
  }

  // 弹窗内事件（弹窗在 #pw-modal 内，不在 collect-section 里，必须单独绑）
  function wireModal(box) {
    if (box._wired) return;
    box._wired = true;
    box.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      handleAct(t.dataset.act, t);
    });
    box.addEventListener('change', (e) => {
      if (!e.target) return;
      if (e.target.id === 'cai-provider') {
        const p = PROVIDERS[e.target.value] || {};
        const bu = $('cai-baseurl'), md = $('cai-model');
        if (p.baseUrl) { if (bu) bu.value = p.baseUrl; if (md) md.value = p.model || ''; }
        else { if (bu) bu.value = ''; if (md) md.value = ''; }
        return;
      }
      if (e.target.id === 'wechat-file' && e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const rd = new FileReader();
        rd.onload = () => {
          const txt = String(rd.result || '');
          const parsed = parseChatFile(file.name, txt);
          const ta = $('wechat-text'); if (ta) ta.value = txt;
          const stx = $('wechat-status');
          if (stx) stx.textContent = '已读取「' + file.name + '」，解析出 ' + parsed.msgs.length + ' 条消息' + (parsed.msgs.length ? '' : '（未识别到结构，将按纯文本处理）');
          toast('已读取文件：' + file.name, 'info');
        };
        rd.readAsText(file);
      }
    });
    box.addEventListener('keydown', (e) => {
      if (e.target && e.target.id === 'cl-detail-q' && e.key === 'Enter') {
        e.preventDefault();
        askFollowup(st.detailId, e.target.value.trim());
      }
    });
  }

  /* ---------------- 详情弹窗 ---------------- */
  function openDetail(id) {
    const it = getItems().find((x) => x.id === id);
    if (!it) return;
    st.detailId = id;
    const arch = isArchived(it);
    const autoArch = !it.archivedAt && arch;
    const dl = dlInfo(it);
    const kws = (it.keywords || []).map((k) => '<span class="cl-tag">' + esc(k) + '</span>').join('');
    const metaRows = [
      ['来源', esc(it.sourceName || '')],
      ['栏目', esc(it.section || '—')],
      ['发布日期', esc(it.publishDate || '未识别')],
      ['截止日期', esc(it.deadline || '未识别') + (dl.text ? '（<span class="' + dl.cls + '">' + esc(dl.text) + '</span>）' : '')],
      ['重要度', IMP_TEXT[it.importance] || '中等'],
      ['分类', esc(it.category || '—')],
      ['入库时间', it.createdAt ? new Date(it.createdAt).toLocaleString() : '—'],
      ['状态', arch ? (autoArch ? '已过期·自动归档' : '已归档') : '进行中'],
    ].map((r) => '<div class="cl-drow"><span class="cl-dk">' + r[0] + '</span><span class="cl-dv">' + r[1] + '</span></div>').join('');
    const fuAns = (it.followup && it.followup.answer)
      ? '<div class="cl-fu-ans"><div class="cl-fu-q">问：' + escBr(it.followup.question) + '</div><div class="cl-fu-a">答：' + escBr(it.followup.answer) + '</div></div>' : '';
    const srcLink = (it.url && !/^wechat:/.test(it.url))
      ? '<a class="cl-btn cl-btn-gold" href="' + esc(it.url) + '" target="_blank" rel="noopener">🔗 打开原资料链接</a>'
      : '<span class="cl-dim">（本地聊天记录，无外部链接）</span>';
    openModal(
      '<div class="cl-mhead"><h3>' + esc(it.title) + '</h3><button class="cl-x" data-act="close-modal">×</button></div>'
      + '<div class="cl-mbody">'
      + '<div class="cl-dgrid">' + metaRows + '</div>'
      + (it.summary ? '<div class="cl-dsec"><div class="cl-dsec-h">AI 摘要</div><div class="cl-dtext">' + escBr(it.summary) + '</div></div>' : '')
      + (kws ? '<div class="cl-dsec"><div class="cl-dsec-h">标签</div><div class="cl-tags">' + kws + '</div></div>' : '')
      + '<div class="cl-dsec"><div class="cl-dsec-h">原文全文' + (it.raw && it.raw.length >= RAW_KEEP ? '（本地缓存前 ' + RAW_KEEP + ' 字）' : '') + '</div>'
      + '<pre class="cl-pre">' + esc(it.raw || '（无原文缓存，可点下方原资料链接查看）') + '</pre></div>'
      + '<div class="cl-dsec"><div class="cl-dsec-h">原资料链接</div><div class="cl-drow-src">' + srcLink + (it.url ? '<span class="cl-url">' + esc(it.url) + '</span>' : '') + '</div></div>'
      + '<div class="cl-dsec"><div class="cl-dsec-h">🤖 AI 追问（深加工）</div>'
      + '<div class="cl-fu-row"><input class="cl-input cl-grow" id="cl-detail-q" placeholder="例如：这件事对我有什么影响？我需要准备什么？" value="' + esc((it.followup && it.followup.question) || '') + '">'
      + '<button class="cl-btn cl-btn-gold" data-act="ask-fu-detail" data-id="' + it.id + '">追问 AI</button></div>'
      + fuAns + '</div>'
      + '</div>'
      + '<div class="cl-mfoot">'
      + '<button class="cl-btn" data-act="archive" data-id="' + it.id + '">' + (arch ? '↩ 取消归档' : '📦 归档这份资料') + '</button>'
      + '<button class="cl-btn" data-act="close-modal">关闭</button>'
      + '</div>'
    );
  }

  /* ---------------- 归档 / 删除 ---------------- */
  function toggleArchive(id) {
    const items = getItems();
    const it = items.find((x) => x.id === id);
    if (!it) return;
    if (it.archivedAt) it.archivedAt = null;
    else it.archivedAt = Date.now();
    saveItems(items);
    renderAll();
    if (st.detailId === id) openDetail(id);
    toast(it.archivedAt ? '已归档' : '已取消归档', 'success');
  }
  function delItem(id) {
    const items = getItems();
    const it = items.find((x) => x.id === id);
    if (!it) return;
    if (!confirm('确定删除这条资料？\n\n' + (it.title || ''))) return;
    const d = getData();
    // 同步移除 seen 记录，允许将来重新采集到它
    if (it.url) delete d.seen[normUrl(it.url)];
    d.items = items.filter((x) => x.id !== id);
    setData(d);
    renderAll();
    closeModal();
    toast('已删除', 'info');
  }
  function clearItems() {
    if (!confirm('确定清空全部资料？（不影响「已见链接」记录，避免重复抓取）')) return;
    const d = getData(); d.items = []; setData(d);
    renderAll(); toast('已清空资料清单', 'info');
  }
  // 说明：清空按钮已从工具条移除（避免误操作），保留此函数供后续按需调用。
  function fullReset() {
    if (!confirm('重置并全量重爬？\n\n将清空「已见链接」记录并删除东北师大官网来源的资料，下次采集会重新全量抓取。微信记录会保留。')) return;
    const d = getData();
    d.seen = {};
    d.items = (d.items || []).filter((it) => it.sourceType !== 'nenu');
    d.lastCrawlAt = 0;
    setData(d);
    renderAll();
    runCollect('full');
  }

  /* ---------------- AI 追问 ---------------- */
  function toggleFollowup(id) {
    const items = getItems();
    const it = items.find((x) => x.id === id);
    if (!it) return;
    it.followupEnabled = !it.followupEnabled;
    if (!it.followupEnabled) it.followup = null;
    saveItems(items);
    renderList();
  }
  async function askFollowup(id, question) {
    const items = getItems();
    const it = items.find((x) => x.id === id);
    if (!it) return;
    let q = question;
    if (!q) {
      const inp = document.querySelector('.cl-item[data-id="' + id + '"] .cl-fu-input');
      q = inp ? inp.value.trim() : '';
    }
    if (!q) { toast('请输入要追问的问题', 'info'); return; }
    if (!aiReady()) { toast('请先在「本功能 AI 设置」中填写 API Key', 'error'); return; }
    const sys = '你是资料整理助手。用户已从官网/聊天记录中整理出一条资料，并就其提出追问。请紧扣资料内容，用简明中文回答，给出可执行的下一步；资料未提及的信息请明确说明"资料中未提及"，不要编造。';
    const user = '【资料标题】' + (it.title || '') + '\n【摘要】' + (it.summary || '') + '\n【发布日期】' + (it.publishDate || '未知') + '\n【截止日期】' + (it.deadline || '未知') + '\n【原文】\n' + (it.raw || '').slice(0, 4000) + '\n\n【用户追问】' + q;
    toast('AI 正在思考…', 'info');
    const r = await callCollectAI([
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ], { temperature: 0.5, max_tokens: 800 });
    const ans = (r.ok && r.content) ? r.content.trim() : ('（AI 未返回结果：' + ((r && (r.message || r.error)) || '未知') + '）');
    const cur = getItems();
    const t = cur.find((x) => x.id === id);
    if (t) { t.followup = { question: q, answer: ans }; t.followupEnabled = true; saveItems(cur); }
    renderList();
    if (st.detailId === id) openDetail(id);
    toast('追问完成', 'success');
  }

  /* ---------------- 标签筛选 ---------------- */
  function toggleTag(tag) {
    if (!tag) return;
    const d = getData();
    const arr = d.filters.tags || [];
    const i = arr.indexOf(tag);
    if (i >= 0) arr.splice(i, 1); else arr.push(tag);
    d.filters.tags = arr; setData(d);
    renderTagFilter(); renderList();
  }
  function clearTags() {
    const d = getData(); d.filters.tags = []; setData(d);
    renderTagFilter(); renderList();
  }

  /* ---------------- 微信上传弹窗 ---------------- */
  function openWechatModal() {
    const d = getData();
    const convs = (d.wechat || []).slice(-5).reverse();
    const hist = convs.map((c) =>
      '<div class="cl-drow"><span class="cl-dk">' + (c.importedAt ? new Date(c.importedAt).toLocaleString() : '—') + '</span>'
      + '<span class="cl-dv">' + esc(c.fromFile || '（粘贴）') + ' · ' + ((c.msgs || []).length) + ' 条消息' + (c.analyzedAt ? ' · 已分析' : '') + '</span></div>').join('') || '<span class="cl-dim">还没有导入过聊天记录</span>';
    openModal(
      '<div class="cl-mhead"><h3>📥 上传微信聊天记录</h3><button class="cl-x" data-act="close-modal">×</button></div>'
      + '<div class="cl-mbody">'
      + '<div class="cl-hint">支持微信导出的 <b>.txt / .csv / .json</b> 文件，也可直接<b>粘贴</b>聊天文本。系统会先<b>本地解析</b>发言人 / 时间 / 内容（不上传），再由你确认是否送 AI 分析。支持格式示例：'
      + '<br><code>2026-09-29 21:03:12 张三</code><br><code>明天上午九点开班会，记得带材料</code>'
      + '<br>或 <code>张三: 明天上午九点开班会</code></div>'
      + '<textarea class="cl-textarea" id="wechat-text" placeholder="把聊天记录粘贴到这里（或点下方按钮选择文件 / 直接拖入）"></textarea>'
      + '<div class="cl-frow">'
      + '<input type="file" id="wechat-file" accept=".txt,.md,.json,.csv" style="display:none">'
      + '<button class="cl-btn" data-act="wechat-file">⬆ 选择文件</button>'
      + '<button class="cl-btn" data-act="wechat-save">💾 保存并解析</button>'
      + '<button class="cl-btn cl-btn-gold" data-act="wechat-analyze">🤖 保存并送 AI 分析</button>'
      + '<span class="cl-dim" id="wechat-status"></span>'
      + '</div>'
      + '<div class="cl-dsec"><div class="cl-dsec-h">最近导入</div>' + hist + '</div>'
      + '</div>'
      + '<div class="cl-mfoot"><button class="cl-btn" data-act="close-modal">关闭</button></div>'
    );
    const ta = $('wechat-text');
    if (ta) {
      ta.addEventListener('dragover', (e) => e.preventDefault());
      ta.addEventListener('drop', (e) => {
        e.preventDefault();
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) {
          const rd = new FileReader();
          rd.onload = () => { ta.value = String(rd.result || ''); const s = $('wechat-status'); if (s) s.textContent = '已拖入「' + f.name + '」'; };
          rd.readAsText(f);
        } else if (e.dataTransfer) {
          ta.value = e.dataTransfer.getData('text') || ta.value;
        }
      });
    }
  }
  function saveWechat(silent) {
    const ta = $('wechat-text');
    const raw = ta ? ta.value.trim() : '';
    if (!raw) { if (!silent) toast('内容为空，请粘贴或上传聊天记录', 'info'); return null; }
    const parsed = parseChatFile('paste.txt', raw);
    const d = getData();
    const conv = {
      id: uid(), fromFile: '（粘贴/上传）', importedAt: Date.now(),
      msgs: parsed.msgs || [], raw: raw.slice(0, 200000), analyzedAt: null,
    };
    d.wechat = (d.wechat || []).concat([conv]).slice(-20);
    setData(d);
    const s = $('wechat-status');
    if (s) s.textContent = '已解析 ' + conv.msgs.length + ' 条消息' + (conv.msgs.length ? '' : '（未识别到结构，将按纯文本送 AI）');
    logLine('导入微信聊天记录：解析 ' + conv.msgs.length + ' 条消息');
    if (!silent) toast('已保存并解析 ' + conv.msgs.length + ' 条消息', 'success');
    return conv;
  }

  /* ---------------- 栏目选择弹窗 ---------------- */
  function openSectionsModal() {
    const d = getData();
    const list = (d.confirmed && d.confirmed.length ? d.confirmed : (st.sections.length ? st.sections : (d.sections || [])));
    const rows = list.length
      ? list.map((s, i) => '<label class="cl-secrow"><input type="checkbox" data-sec="' + esc(s.href) + '" checked>'
        + '<span class="cl-secname">' + esc(s.text || s.href) + '</span>'
        + '<span class="cl-dim">' + (s.count != null ? (s.count + ' 篇文章/页') : '') + ' · ' + esc(s.href.replace(/^https?:\/\/[^/]+/, '')) + '</span></label>').join('')
      : '<div class="cl-dim">尚未确认任何栏目。请先点「🔄 增量更新」完成一次采集；或在下方手动填入栏目页地址。</div>';
    openModal(
      '<div class="cl-mhead"><h3>⚙ 栏目管理</h3><button class="cl-x" data-act="close-modal">×</button></div>'
      + '<div class="cl-mbody">'
      + '<div class="cl-hint">系统已自动验证并锁定下列「信息列表页」栏目（<b>已验证</b>：该页能抽出 ≥3 篇文章）。增量采集只抓这些栏目，并自动跳过已见文章。可勾选后手动重采，或追加自定义栏目页。</div>'
      + '<div class="cl-seclist">' + rows + '</div>'
      + '<div class="cl-form"><label>追加自定义栏目页（每行一个 URL，可选，会在下次增量采集时一并验证）</label>'
      + '<textarea class="cl-textarea" id="cl-sec-extra" style="min-height:70px" placeholder="https://www.nenu.edu.cn/tzgg.htm"></textarea></div>'
      + '</div>'
      + '<div class="cl-mfoot">'
      + '<button class="cl-btn cl-btn-gold" data-act="sections-save">💾 保存栏目清单</button>'
      + '<button class="cl-btn" data-act="sections-run">📥 采集勾选栏目</button>'
      + '<button class="cl-btn" data-act="close-modal">关闭</button>'
      + '</div>'
    );
  }
  function saveSections() {
    const boxes = Array.prototype.slice.call(document.querySelectorAll('#pw-modal-box input[data-sec]'));
    const picked = boxes.map((b) => ({ href: b.dataset.sec, text: (b.parentElement.querySelector('.cl-secname') || {}).textContent || '', checked: b.checked, count: null }));
    const ta = $('cl-sec-extra');
    const extras = (ta ? ta.value : '').split(/\n+/).map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s));
    const d = getData();
    const out = picked.filter((p) => p.checked).map((p) => ({ href: p.href, text: p.text, count: p.count }));
    extras.forEach((u) => { if (!out.some((x) => normUrl(x.href) === normUrl(u))) out.push({ href: u, text: '自定义栏目', count: null }); });
    d.confirmed = out;
    setData(d);
    logLine('栏目清单已更新：' + out.length + ' 个栏目');
    toast('已保存 ' + out.length + ' 个栏目', 'success');
    closeModal();
  }
  async function runPickedSections() {
    const boxes = Array.prototype.slice.call(document.querySelectorAll('#pw-modal-box input[data-sec]'));
    const picked = boxes.filter((b) => b.checked).map((b) => b.dataset.sec);
    const ta = $('cl-sec-extra');
    const extras = (ta ? ta.value : '').split(/\n+/).map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s));
    const all = picked.concat(extras);
    if (!all.length) { toast('请至少勾选或填写一个栏目', 'info'); return; }
    closeModal();
    if (st.running) { toast('有任务正在运行', 'info'); return; }
    const secs = all.map((h) => ({ href: h, text: h }));
    st.sections = secs;
    await crawlSections(secs);
  }
  // 只走「指定栏目 → 新文章」的采集（增量语义，仍然跳过已见链接）
  async function crawlSections(sections) {
    setRunning(true);
    try {
      setPhase('抓取栏目', 0, sections.length, '人工选定栏目采集中');
      const d = getData();
      const secPages = await fetchBatchChunked(sections.map((s) => s.href), true, (done, total) => setPhase('抓取栏目', done, total, '正在读取栏目列表'));
      const cands = [];
      const localSeen = new Set();
      secPages.forEach((sp, i) => {
        const sec = sections[i] || {};
        if (!sp || !sp.ok) return;
        extractArticles(sp.links || []).slice(0, PER_SECTION * 2).forEach((a) => {
          const n = normUrl(a.url);
          if (d.seen[n] || localSeen.has(n)) return;
          localSeen.add(n);
          cands.push({ url: a.url, title: a.title, date: a.date || '', section: sec.text || '' });
        });
      });
      const targets = cands.slice(0, MAX_NEW_INCR);
      if (!targets.length) { setPhase('空闲', 0, 0, '所选栏目没有新文章'); toast('没有新文章', 'info'); return; }
      setPhase('抓取正文', 0, targets.length, '正在下载 ' + targets.length + ' 篇文章');
      const pages = await fetchBatchChunked(targets.map((t) => t.url), false, (done, total) => setPhase('抓取正文', done, total, '正在下载正文'));
      const okPages = [];
      pages.forEach((p, i) => {
        if (!p || !p.ok) return;
        p.section = targets[i].section;
        if (!p.date) p.date = targets[i].date;
        if (!p.title) p.title = targets[i].title;
        okPages.push(p);
      });
      const dRec = getData();
      targets.forEach((t) => { dRec.seen[normUrl(t.url)] = Date.now(); });
      dRec.lastCrawlAt = Date.now(); setData(dRec);
      const res = await analyzeAndStream(okPages, 'nenu', '东北师大官网', 'AI 整理中');
      const d2 = getData(); d2.lastCrawlNew = res.added; setData(d2);
      setPhase('空闲', 0, 0, '本次新增 ' + res.added + ' 条');
      renderAll();
    } finally { setRunning(false); }
  }

  /* ---------------- 导出 / 云端 ---------------- */
  function exportData() {
    const d = getData();
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '信息搜集存档-' + todayStr() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('已导出本地存档 JSON（含全部 ' + (d.items || []).length + ' 条资料）', 'success');
  }
  function cloudReserved() {
    openModal('<div class="cl-mhead"><h3>☁ 云端同步</h3><button class="cl-x" data-act="close-modal">×</button></div>'
      + '<div class="cl-mbody"><div class="cl-big">🚧</div>'
      + '<p class="cl-center">该功能尚未开放。</p>'
      + '<p class="cl-sub cl-center">云端同步（多端互通 / 备份）正在规划中。当前全部资料均<b>本地留存</b>于本机浏览器，可随时用「⬇ 导出存档」备份。</p>'
      + '</div>'
      + '<div class="cl-mfoot"><button class="cl-btn cl-btn-gold" data-act="close-modal">知道了</button></div>');
  }

  /* ---------------- AI 设置弹窗 ---------------- */
  function openAIModal() {
    const a = getAI();
    const opts = Object.keys(PROVIDERS).map((k) =>
      '<option value="' + k + '"' + (a.provider === k ? ' selected' : '') + '>' + esc(PROVIDERS[k].name) + '</option>').join('');
    openModal(
      '<div class="cl-mhead"><h3>⚙ 本功能 AI 设置（独立）</h3><button class="cl-x" data-act="close-modal">×</button></div>'
      + '<div class="cl-mbody">'
      + '<div class="cl-hint cl-hint-warn">⚠️ 此 AI 配置仅用于「信息搜集」，与工作台其它 AI（设置页的智谱/自定义）<b>完全独立、互不干扰</b>，也绝不复用其 Key。</div>'
      + '<div class="cl-form"><label>供应商</label><select class="cl-select cl-full" id="cai-provider">' + opts + '</select></div>'
      + '<div class="cl-form"><label>API Base URL</label><input class="cl-input cl-full" id="cai-baseurl" value="' + esc(a.baseUrl || '') + '"></div>'
      + '<div class="cl-form"><label>模型（Model）</label><input class="cl-input cl-full" id="cai-model" value="' + esc(a.model || '') + '" placeholder="如 deepseek-4.1-flash，可随时更换"></div>'
      + '<div class="cl-form"><label>API Key</label><input class="cl-input cl-full" id="cai-key" type="password" value="' + esc(a.apiKey || '') + '" placeholder="在此填入本功能的 Key（仅本地保存）"></div>'
      + '<div class="cl-frow"><button class="cl-btn cl-btn-gold" data-act="ai-save">保存配置</button>'
      + '<button class="cl-btn" data-act="ai-test">测试连接</button>'
      + '<span id="cai-status" class="cl-dim"></span></div>'
      + '<div class="cl-sub">默认已选 DeepSeek，模型填 <b>deepseek-4.1-flash</b>；也可在「自定义」里更换任意 OpenAI 兼容模型。未填 Key 时，采集仍会进行，但资料以「原始」状态入库（可稍后点「🤖 AI 重新整理」）。</div>'
      + '</div>'
    );
  }
  function saveAI() {
    const provider = ($('cai-provider') || {}).value || 'custom';
    const baseUrl = (($('cai-baseurl') || {}).value || '').trim();
    const model = (($('cai-model') || {}).value || '').trim();
    const apiKey = (($('cai-key') || {}).value || '').trim();
    if (!baseUrl) { toast('请填写 API Base URL', 'error'); return false; }
    if (!apiKey) { toast('请填写 API Key', 'error'); return false; }
    setAI({ provider, baseUrl, model, apiKey });
    toast('已保存本功能 AI 配置', 'success');
    const s = $('cai-status'); if (s) { s.textContent = '已保存 ✅'; }
    return true;
  }
  async function testAI() {
    if (!saveAI()) return;
    const s = $('cai-status'); if (s) s.textContent = '测试中…';
    const r = await callCollectAI([{ role: 'user', content: 'ping' }], { max_tokens: 8 });
    if (r.ok) { if (s) s.textContent = '连接成功 🎉'; toast('🎉 AI 连接成功', 'success'); }
    else { if (s) s.textContent = '失败：' + ((r && (r.message || r.error)) || '未知'); toast('AI 连接失败：' + ((r && (r.message || r.error)) || '未知'), 'error'); }
  }

  /* ---------------- 通用弹窗 ---------------- */
  function openModal(html) {
    const root = $('pw-modal'), box = $('pw-modal-box');
    if (!root || !box) { alert(html.replace(/<[^>]+>/g, ' ')); return; }
    box.innerHTML = html; root.classList.add('open');
    wireModal(box);
  }
  function closeModal() {
    const root = $('pw-modal'), box = $('pw-modal-box');
    if (!root || !box) return;
    root.classList.remove('open'); box.innerHTML = '';
    st.detailId = null;
  }

  /* ---------------- 样式注入（沿用金色主题，兼容深浅色） ---------------- */
  (function injectStyle() {
    if (document.getElementById('collect-style')) return;
    const css = [
      '.cl-wrap{max-width:1240px}',
      '.cl-bar{display:flex;flex-direction:column;gap:9px;margin-bottom:14px}',
      '.cl-bar-l{display:flex;gap:8px;flex-wrap:wrap}',
      '.cl-stats{font-size:12.5px;color:var(--text-2);line-height:1.8;padding-top:8px;border-top:1px dashed var(--border)}',
      '.cl-stats b{color:var(--gold)}',
      '.cl-stats b.cl-warn{color:#c0392b}',
      '.cl-dim{color:var(--text-3)}',
      '.cl-center{text-align:center}',
      '.cl-warn{color:#c0392b}',

      '.cl-btn{display:inline-flex;align-items:center;gap:5px;background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:9px;padding:7px 12px;font-size:12.5px;cursor:pointer;text-decoration:none;transition:all .15s;line-height:1.2;font-family:inherit}',
      '.cl-btn:hover{border-color:var(--gold);color:var(--gold)}',
      '.cl-btn:disabled{opacity:.45;cursor:not-allowed}',
      '.cl-btn-gold{background:var(--gold);border-color:var(--gold);color:#fff}',
      '.cl-btn-gold:hover{filter:brightness(1.06);color:#fff}',
      '.cl-btn-danger:hover{border-color:#c0392b;color:#c0392b}',
      '.cl-btn-on{background:var(--gold-soft);border-color:var(--gold);color:var(--gold)}',

      /* 进度面板：常显 */
      '.cl-progress{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:14px}',
      '.cl-prog-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px}',
      '.cl-dot{width:9px;height:9px;border-radius:50%;background:var(--text-3);flex-shrink:0}',
      '.cl-dot-live{background:var(--gold);box-shadow:0 0 0 0 var(--gold);animation:clPulse 1.3s infinite}',
      '@keyframes clPulse{0%{box-shadow:0 0 0 0 rgba(182,138,74,.55)}70%{box-shadow:0 0 0 9px rgba(182,138,74,0)}100%{box-shadow:0 0 0 0 rgba(182,138,74,0)}}',
      '.cl-phase{font-weight:600;color:var(--text)}',
      '.cl-count{color:var(--gold);font-weight:600}',
      '.cl-note{color:var(--text-3);font-size:12px;flex:1;min-width:180px}',
      '.cl-track{height:4px;background:var(--border);border-radius:4px;overflow:hidden;margin:10px 0 8px}',
      '.cl-fill{height:100%;width:0;background:var(--gold);border-radius:4px;transition:width .3s}',
      '.cl-log{max-height:104px;overflow-y:auto;font-size:11.5px;line-height:1.75;color:var(--text-2);border-top:1px dashed var(--border);padding-top:6px}',
      '.cl-log-line{white-space:normal;word-break:break-all}',
      '.cl-log-t{color:var(--text-3);margin-right:6px;font-variant-numeric:tabular-nums}',

      '.cl-panel{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:14px}',
      '.cl-panel-h{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:600;color:var(--text);margin-bottom:10px;font-family:"Noto Serif SC",serif}',
      '.cl-panel-h-r{font-size:12px;font-weight:400;color:var(--text-3)}',
      '.cl-frow{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}',
      '.cl-grow{flex:1;min-width:180px}',
      '.cl-input,.cl-select,.cl-textarea{background:var(--surface-2);border:1px solid var(--border);color:var(--text);border-radius:9px;padding:8px 11px;font-size:13px;font-family:inherit;outline:none}',
      '.cl-input:focus,.cl-select:focus,.cl-textarea:focus{border-color:var(--gold)}',
      '.cl-full{width:100%}',
      '.cl-textarea{width:100%;min-height:150px;resize:vertical;line-height:1.6;margin-top:8px}',
      '.cl-check{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text-2);cursor:pointer}',
      '.cl-sort-hint{font-size:12px;color:var(--text-3);line-height:1.7;margin-top:8px}',

      '.cl-tags{display:flex;flex-wrap:wrap;gap:6px}',
      '.cl-tags-filter{margin-top:8px;max-height:112px;overflow-y:auto}',
      '.cl-tag{font-size:11.5px;color:var(--text-2);background:var(--gold-soft);border:1px solid var(--gold-22);border-radius:11px;padding:2px 9px;cursor:pointer;user-select:none;display:inline-flex;align-items:center;gap:4px}',
      '.cl-tag:hover{border-color:var(--gold);color:var(--gold)}',
      '.cl-tag-on{background:var(--gold);border-color:var(--gold);color:#fff}',
      '.cl-tag i{font-style:normal;opacity:.65;font-size:10.5px}',

      '.cl-list{display:flex;flex-direction:column;gap:10px}',
      '.cl-empty{font-size:13px;color:var(--text-3);line-height:1.8;padding:18px;text-align:center;border:1px dashed var(--border);border-radius:12px}',
      '.cl-item{border:1px solid var(--border);border-radius:12px;padding:12px 14px;background:var(--surface-2);transition:border-color .15s}',
      '.cl-item:hover{border-color:var(--gold-22)}',
      '.cl-item-arch{opacity:.72}',
      '.cl-item-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.cl-idx{font-size:11px;font-weight:700;color:#fff;background:var(--gold);border-radius:7px;padding:1px 7px;flex-shrink:0}',
      '.cl-item-arch .cl-idx{background:var(--text-3)}',
      '.cl-title{font-size:14px;font-weight:600;color:var(--text);flex:1;min-width:140px;cursor:pointer;line-height:1.5}',
      '.cl-title:hover{color:var(--gold);text-decoration:underline}',
      '.cl-badge{font-size:11px;padding:1px 8px;border-radius:10px;background:var(--gold-soft);color:var(--gold);white-space:nowrap}',
      '.cl-src-wechat{background:rgba(47,158,111,.15);color:#2f9e6f}',
      '.cl-badge-arch{background:rgba(120,120,120,.16);color:var(--text-3)}',
      '.cl-badge-raw{background:rgba(192,57,43,.12);color:#c0392b}',
      '.cl-imp-high{background:#c0392b;color:#fff}',
      '.cl-imp-mid{background:var(--gold);color:#fff}',
      '.cl-imp-low{background:var(--text-3);color:#fff}',
      '.cl-dl{font-size:11px;padding:1px 8px;border-radius:10px;white-space:nowrap;border:1px solid transparent}',
      '.cl-dl-expired{background:rgba(120,120,120,.16);color:var(--text-3)}',
      '.cl-dl-soon{background:rgba(192,57,43,.14);color:#c0392b;border-color:rgba(192,57,43,.3)}',
      '.cl-dl-week{background:rgba(216,150,20,.16);color:#b8860b}',
      '.cl-dl-normal{background:var(--gold-soft);color:var(--gold)}',
      '.cl-meta{font-size:11.5px;color:var(--text-3);margin:6px 0 2px}',
      '.cl-summary{font-size:13px;line-height:1.75;color:var(--text);margin:5px 0}',
      '.cl-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px;padding-top:9px;border-top:1px dashed var(--border)}',
      '.cl-fu{margin-top:9px}',
      '.cl-fu-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '.cl-fu-ans{font-size:12.5px;line-height:1.75;background:var(--gold-soft);border:1px solid var(--gold-22);border-radius:10px;padding:9px 11px;margin-top:8px}',
      '.cl-fu-q{color:var(--text-2);margin-bottom:4px}',
      '.cl-fu-a{color:var(--text)}',

      '.cl-mhead{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding-bottom:12px;border-bottom:1px solid var(--border)}',
      '.cl-mhead h3{margin:0;font-size:16px;line-height:1.5;font-family:"Noto Serif SC",serif;color:var(--text)}',
      '.cl-x{background:none;border:none;color:var(--text-3);font-size:22px;line-height:1;cursor:pointer;padding:0 4px}',
      '.cl-x:hover{color:#c0392b}',
      '.cl-mbody{padding-top:12px}',
      '.cl-mfoot{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;padding-top:12px;border-top:1px solid var(--border);flex-wrap:wrap;position:sticky;bottom:-24px;background:var(--surface)}',
      '.cl-dgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin-bottom:12px}',
      '.cl-drow{display:flex;gap:8px;font-size:12.5px;line-height:1.7;margin-bottom:3px}',
      '.cl-dk{color:var(--text-3);flex-shrink:0;min-width:62px}',
      '.cl-dv{color:var(--text);word-break:break-all}',
      '.cl-dsec{margin:12px 0}',
      '.cl-dsec-h{font-size:12.5px;font-weight:600;color:var(--gold);margin-bottom:6px}',
      '.cl-dtext{font-size:13px;line-height:1.8;color:var(--text)}',
      '.cl-pre{max-height:200px;overflow:auto;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:11px;font-size:12px;line-height:1.75;white-space:pre-wrap;word-break:break-word;color:var(--text-2);font-family:ui-monospace,Menlo,Consolas,monospace;margin:0}',
      '.cl-drow-src{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.cl-url{font-size:11px;color:var(--text-3);word-break:break-all}',
      '.cl-form{display:flex;flex-direction:column;gap:6px;margin:11px 0}',
      '.cl-form label{font-size:12.5px;color:var(--text-2)}',
      '.cl-hint{font-size:12px;line-height:1.75;color:var(--text-3);background:var(--gold-soft);border:1px solid var(--gold-22);border-radius:10px;padding:9px 11px;margin-bottom:10px}',
      '.cl-hint code{background:rgba(0,0,0,.08);border-radius:4px;padding:1px 5px;font-size:11.5px}',
      '.cl-hint-warn{background:rgba(192,57,43,.08);border-color:rgba(192,57,43,.25);color:#a8412f}',
      '.cl-big{font-size:40px;text-align:center;margin:6px 0}',
      '.cl-sub{font-size:12px;color:var(--text-3);line-height:1.75;margin-top:10px}',
      '.cl-seclist{max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:2px}',
      '.cl-secrow{display:flex;align-items:center;gap:9px;font-size:12.5px;padding:7px 8px;border-radius:8px;cursor:pointer}',
      '.cl-secrow:hover{background:var(--gold-soft)}',
      '.cl-secname{color:var(--text);flex:1;min-width:0}',
      '@media(max-width:760px){.cl-dgrid{grid-template-columns:1fr}.cl-stats{text-align:left;max-width:none}}',
    ].join('\n');
    const s = document.createElement('style');
    s.id = 'collect-style'; s.textContent = css;
    document.head.appendChild(s);
  })();

  /* ---------------- 暴露接口 ---------------- */
  window.Collect = {
    render, openAIModal, saveAI, testAI, closeModal, cloudReserved,
    runCollect, crawlSections, openWechatModal, parseChatText, parseChatFile, reanalyzePending,
    // 便于命令行/自动化校验内部规则（不影响页面逻辑）
    _test: { isArticleLink, pickSections, extractArticles, isSectionCandidate, cleanText, parseChatCsv, parseChatJson, dlInfo, isArchived, normUrl, hashStr },
  };

  // 点击遮罩关闭弹窗
  document.addEventListener('click', (e) => {
    const root = $('pw-modal');
    if (root && root.classList.contains('open') && e.target === root) closeModal();
  });
})();
