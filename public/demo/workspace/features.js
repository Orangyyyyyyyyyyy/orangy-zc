/* ============================================================
 * 个人工作台 · 扩展功能模块 (features.js)
 * 依赖 app.js 暴露的 window.PW（DB / callAI / toast / 等）
 * 功能：① 单词本（多词本 + 上传 + 智谱 AI 加工 + 闪卡学习）
 *       ② 听写专栏（每日 AI 热点英文短文，逐句听写）
 * ============================================================ */
(function () {
  'use strict';
  const PW = window.PW;
  const DB = PW.DB, callAI = PW.callAI, toast = PW.toast, todayStr = PW.todayStr;
  const esc = PW.escapeHtml, el = PW.el, $ = PW.$;

  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const uid = (p) => (p || 'id') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  function normEntries(list) { return (list || []).map((x) => (typeof x === 'string' ? { word: x, date: '' } : x)); }

  /* =========================================================
   * 通用弹窗
   * ======================================================= */
  function openModal(html) {
    const root = $('pw-modal');
    $('pw-modal-box').innerHTML = html;
    root.classList.add('open');
  }
  function closeModal() {
    const root = $('pw-modal');
    root.classList.remove('open');
    $('pw-modal-box').innerHTML = '';
  }
  window.pwCloseModal = closeModal;

  /* =========================================================
   * ① 单词本
   * 数据结构：
   *   wordbooks: [{ id, name, created, words:[{word, phonetic, meaning, example, category}] }]
   *   today_book_id: 'builtin' | 词本 id
   * ======================================================= */
  const BUILTIN_BOOK = 'builtin';
  function getWordbooks() { return DB.get('wordbooks', []); }
  function setWordbooks(list) { DB.set('wordbooks', list); }
  function getTodayBookId() { return DB.get('today_book_id', BUILTIN_BOOK); }
  function setTodayBookId(id) { DB.set('today_book_id', id); }

  // 官方固定的「不认识」单词本（不可删除，用于收纳所有标记为不认识的单词）
  const UNKNOWN_BOOK_ID = 'unknown_builtin';
  function ensureUnknownBook() {
    const list = getWordbooks();
    if (!list.some((b) => b.id === UNKNOWN_BOOK_ID)) {
      list.unshift({ id: UNKNOWN_BOOK_ID, name: '不认识', created: '-', words: [], official: true });
      setWordbooks(list);
    }
  }
  function getUnknownBook() { ensureUnknownBook(); return getWordbooks().find((b) => b.id === UNKNOWN_BOOK_ID); }

  // 内置精选词库（兼容旧的 VOCAB，作为默认背诵源）
  const BUILTIN_WORDS = [
    { word: 'perseverance', phonetic: '/ˌpɜːrsəˈvɪrəns/', meaning: '毅力，坚持不懈', example: 'Perseverance is the key to success.', category: '品质' },
    { word: 'diligent', phonetic: '/ˈdɪlɪdʒənt/', meaning: '勤奋的', example: 'He is a diligent student.', category: '品质' },
    { word: 'achievement', phonetic: '/əˈtʃiːvmənt/', meaning: '成就', example: 'Winning was a great achievement.', category: '品质' },
    { word: 'passion', phonetic: '/ˈpæʃn/', meaning: '热情', example: 'She has a passion for music.', category: '情感' },
    { word: 'dedication', phonetic: '/ˌdedɪˈkeɪʃn/', meaning: '奉献', example: 'His dedication is admirable.', category: '品质' },
    { word: 'resilience', phonetic: '/rɪˈzɪliəns/', meaning: '韧性', example: 'Resilience helps you bounce back.', category: '品质' },
    { word: 'discipline', phonetic: '/ˈdɪsəplɪn/', meaning: '自律', example: 'Discipline beats motivation.', category: '品质' },
    { word: 'curiosity', phonetic: '/ˌkjʊriˈɑːsəti/', meaning: '好奇心', example: 'Curiosity drives learning.', category: '情感' },
    { word: 'gratitude', phonetic: '/ˈɡrætɪtuːd/', meaning: '感恩', example: 'Gratitude changes perspective.', category: '情感' },
    { word: 'focus', phonetic: '/ˈfoʊkəs/', meaning: '专注', example: 'Focus is a superpower.', category: '能力' },
    { word: 'ambition', phonetic: '/æmˈbɪʃn/', meaning: '抱负', example: 'Ambition fuels progress.', category: '情感' },
    { word: 'clarity', phonetic: '/ˈklærəti/', meaning: '清晰', example: 'Clarity precedes action.', category: '能力' },
  ];

  function getTodayBook() {
    const id = getTodayBookId();
    if (id === BUILTIN_BOOK) return { id: BUILTIN_BOOK, name: '内置精选词库', words: BUILTIN_WORDS };
    const list = getWordbooks();
    return list.find((b) => b.id === id) || { id: BUILTIN_BOOK, name: '内置精选词库', words: BUILTIN_WORDS };
  }

  // 解析上传文件 -> [{word, meaning}]
  function parseWordText(text) {
    const out = [];
    const lines = text.split(/\r?\n/);
    for (let raw of lines) {
      raw = raw.trim();
      if (!raw) continue;
      // 支持多种分隔：逗号 / 制表符 / 多个空格，且第二列含中文或较短
      let word = raw, meaning = '';
      const m = raw.match(/^(.+?)[\t,，、]\s*(.+)$/);
      if (m) { word = m[1].trim(); meaning = m[2].trim(); }
      else {
        const sp = raw.split(/\s{2,}|\s+/);
        if (sp.length >= 2 && /[一-龥]/.test(sp[sp.length - 1])) {
          word = sp.slice(0, -1).join(' ').trim();
          meaning = sp[sp.length - 1].trim();
        }
      }
      word = word.replace(/^["'`]+|["'`]+$/g, '').trim();
      if (word) out.push({ word, meaning });
    }
    return out;
  }
  function parseWordFile(file, cb) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      if (typeof XLSX === 'undefined') { toast('请先加载 XLSX 解析库', 'error'); cb([]); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws);
          const out = [];
          rows.forEach((r) => {
            const w = r['单词'] || r['word'] || r['Word'] || r['词语'] || r['A'] || r['__EMPTY'];
            if (!w) return;
            const mean = r['释义'] || r['意思'] || r['meaning'] || r['Meaning'] || r['中文'] || '';
            out.push({ word: String(w).trim(), meaning: mean ? String(mean).trim() : '' });
          });
          cb(out);
        } catch (err) { toast('Excel 解析失败：' + err.message, 'error'); cb([]); }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => cb(parseWordText(e.target.result));
      reader.readAsText(file);
    }
  }

  // 调用智谱 AI 一次性加工整批单词 -> 单词卡数组
  async function enrichWords(rawList) {
    const input = rawList.map((x) => (x.meaning ? (x.word + '：' + x.meaning) : x.word));
    const prompt = '你是一位英语词典编辑。下面是一组英文单词（可能只有单词，也可能带中文释义）。请为每一个生成学习卡片。\n'
      + '只输出 JSON 数组，每个元素：{"word":"原词","phonetic":"音标（英式，带 / /）","meaning":"简洁中文释义","example":"一个地道英文例句（含该词）","category":"主题分类，如 日常/科技/商务/品质"}。\n'
      + '保持 word 与输入一致（大小写可微调）。数组顺序与输入一致。不要任何多余文字。\n输入单词：\n"""\n' + input.join('\n') + '\n"""';
    const r = await callAI([
      { role: 'system', content: '你是严谨的英语词典编辑，只输出符合要求的 JSON 数组。' },
      { role: 'user', content: prompt },
    ], { json: true, temperature: 0.4, max_tokens: 1500 });
    if (r.ok && Array.isArray(r.content)) {
      return r.content.map((c) => ({
        word: c.word || '', phonetic: c.phonetic || '', meaning: c.meaning || '',
        example: c.example || '', category: c.category || '其他',
      })).filter((c) => c.word);
    }
    // 兜底：保留原始单词与已有释义
    return rawList.map((x) => ({ word: x.word, phonetic: '', meaning: x.meaning || '', example: '', category: '其他' }));
  }

  window.pwUploadWordbook = function (file) {
    if (!file) return;
    const baseName = file.name.replace(/\.[^.]+$/, '') || '我的词本';
    parseWordFile(file, async (raw) => {
      if (raw.length === 0) { toast('未识别到单词，请确认文件内容', 'error'); return; }
      const capped = raw.slice(0, 150);
      toast('AI 正在加工 ' + capped.length + ' 个单词，请稍候…', 'info');
      const cards = await enrichWords(capped);
      const book = { id: uid('wb_'), name: baseName, created: todayStr(), words: cards };
      const list = getWordbooks();
      list.push(book);
      setWordbooks(list);
      setTodayBookId(book.id);
      renderBookSelect();
      if (window.PW && window.PW.onEnglish) window.PW.onEnglish();
      toast('✨ 词本「' + baseName + '」已生成 ' + cards.length + ' 张单词卡，并已设为今日背诵', 'success');
    });
  };

  window.pwNewWordbook = function () {
    const name = prompt('请输入新单词本名称：', '我的单词本 ' + (getWordbooks().length + 1));
    if (!name) return;
    const book = { id: uid('wb_'), name: name.trim(), created: todayStr(), words: [] };
    const list = getWordbooks();
    list.push(book);
    setWordbooks(list);
    setTodayBookId(book.id);
    renderBookSelect();
    if (window.PW && window.PW.onEnglish) window.PW.onEnglish();
    toast('已创建词本「' + name.trim() + '」，可在「单词本管理」中上传单词', 'success');
  };

  window.pwSelectTodayBook = function () {
    const sel = $('wb-today-select');
    if (!sel) return;
    setTodayBookId(sel.value);
    if (window.PW && window.PW.onEnglish) window.PW.onEnglish();
    toast('今日背诵词本已切换', 'info');
  };

  function renderBookSelect() {
    const sel = $('wb-today-select');
    if (!sel) return;
    ensureUnknownBook();
    const list = getWordbooks();
    let html = '<option value="' + BUILTIN_BOOK + '">内置精选词库</option>';
    list.forEach((b) => {
      const label = b.official ? (esc(b.name) + ' · 官方固定') : esc(b.name);
      html += '<option value="' + b.id + '">' + label + '（' + b.words.length + '）</option>';
    });
    sel.innerHTML = html;
    sel.value = getTodayBookId();
  }

  // 单词记忆闪卡学习（覆盖原 vocab-tab 内容）
  let studyQueue = [], studyIndex = 0;
  window.PW.onEnglish = function () {
    const tab = $('vocab-tab');
    if (!tab) return;
    const book = getTodayBook();
    studyQueue = (book.words || []).slice();
    studyIndex = 0;
    if (studyQueue.length === 0) {
      tab.innerHTML = '<div class="vocab-card"><h3 class="card-title">单词记忆</h3>'
        + '<p class="card-sub" style="margin:14px 0">当前词本还没有单词。请在「单词本管理」中上传词本，或切换到「内置精选词库」。</p></div>';
      return;
    }
    renderStudyCard();
  };
  function renderStudyCard() {
    const tab = $('vocab-tab');
    if (!tab || studyQueue.length === 0) return;
    const w = studyQueue[studyIndex];
    const showMeaning = studyQueue._shown;
    tab.innerHTML =
      '<div class="vocab-card">'
      + '<div class="vocab-word">' + esc(w.word) + '</div>'
      + (w.phonetic ? '<div class="vocab-meaning" style="color:var(--gold)">' + esc(w.phonetic) + '</div>' : '')
      + '<div class="vocab-meaning" id="study-meaning" style="' + (showMeaning ? '' : 'filter:blur(6px);user-select:none;') + '">' + esc(w.meaning || '—') + '</div>'
      + (w.example ? '<div class="vocab-example" style="' + (showMeaning ? '' : 'filter:blur(6px);user-select:none;') + '">' + esc(w.example) + '</div>' : '')
      + '<div class="vocab-stat">进度 ' + (studyIndex + 1) + ' / ' + studyQueue.length + ' · 词本：' + esc(getTodayBook().name) + '</div>'
      + '<div class="vocab-controls">'
      + (showMeaning
          ? '<button class="btn btn-ghost" onclick="pwStudyMark(\'known\')">认识 ✓</button>'
            + '<button class="btn btn-ghost" onclick="pwStudyMark(\'unknown\')">不认识 ✗</button>'
          : '<button class="btn btn-gold" onclick="pwStudyReveal()">👁 显示释义</button>')
      + '<button class="btn btn-ghost" onclick="pwStudyShuffle()">🔀 打乱</button>'
      + '</div></div>';
  }
  window.pwStudyReveal = function () { studyQueue._shown = true; renderStudyCard(); };
  window.pwStudyShuffle = function () {
    for (let i = studyQueue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [studyQueue[i], studyQueue[j]] = [studyQueue[j], studyQueue[i]]; }
    studyIndex = 0; studyQueue._shown = false; renderStudyCard();
  };
  window.pwStudyMark = function (status) {
    if (!studyQueue.length) return;
    const w = studyQueue[studyIndex];
    if (status === 'known') {
      const list = normEntries(DB.get('vocab_known', []));
      if (!list.some((x) => x.word === w.word)) list.push({ word: w.word, date: todayStr() });
      DB.set('vocab_known', list);
      toast('已记录为「已学习」，计入今日学习单词', 'success');
    } else {
      const list = normEntries(DB.get('vocab_unknown', []));
      if (!list.some((x) => x.word === w.word)) list.push({ word: w.word, date: todayStr() });
      DB.set('vocab_unknown', list);
      // 加入官方固定的「不认识」单词本
      ensureUnknownBook();
      const books = getWordbooks();
      const ub = books.find((b) => b.id === UNKNOWN_BOOK_ID);
      if (ub && !ub.words.some((x) => x.word === w.word)) {
        ub.words.push({ word: w.word, phonetic: w.phonetic || '', meaning: w.meaning || '', example: w.example || '', category: w.category || '其他' });
        setWordbooks(books);
      }
      toast('已加入「不认识」单词本', 'info');
    }
    if (window.PW && window.PW.renderWordbookStats) window.PW.renderWordbookStats();
    // 直接更新「已掌握 / 待巩固」计数，避免调用 loadVocab 重置学习进度
    const known = normEntries(DB.get('vocab_known', []));
    const unk = normEntries(DB.get('vocab_unknown', []));
    const vs = $('vocab-stat'); if (vs) vs.textContent = '已掌握 ' + known.length + ' · 待巩固 ' + unk.length;
    studyIndex++;
    if (studyIndex >= studyQueue.length) {
      $('vocab-tab').innerHTML = '<div class="vocab-card"><h3 class="card-title">🎉 本轮完成</h3>'
        + '<p class="card-sub" style="margin:14px 0">这一批单词已经过一遍啦。可以「打乱」再来一轮，或去「单词本管理」换词本。</p>'
        + '<div class="vocab-controls"><button class="btn btn-gold" onclick="pwStudyShuffle()">🔀 再来一轮</button></div></div>';
      return;
    }
    studyQueue._shown = false;
    renderStudyCard();
  };

  /* =========================================================
   * ② 听写专栏（每日 AI 热点英文短文）
   * 数据结构：dictation: { date, title, en_passage, zh_summary, source, fromAI }
   * ======================================================= */
  function splitSentences(text) {
    const parts = text.match(/[^.!?]+[.!?]*/g) || [text];
    return parts.map((s) => s.trim()).filter(Boolean);
  }
  function aiConfigForServer() {
    const cfg = DB.get('ai_config', null);
    if (cfg && cfg.apiKey && cfg.baseUrl) return { apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, model: cfg.model || '' };
    return {};
  }
  async function ensureDictation(force) {
    const cur = DB.get('dictation', null);
    if (cur && cur.date === todayStr() && !force) return cur;
    const cfg = aiConfigForServer();
    let data = null;
    try {
      const qs = new URLSearchParams();
      if (cfg.apiKey) qs.set('apiKey', cfg.apiKey);
      if (cfg.baseUrl) qs.set('baseUrl', cfg.baseUrl);
      if (cfg.model) qs.set('model', cfg.model);
      const resp = await fetch(PW.API_BASE + '/api/news?' + qs.toString());
      const j = await resp.json().catch(() => null);
      if (j && j.en_passage) data = j;
    } catch (e) { /* 网络失败走兜底 */ }
    if (!data) {
      // 服务端兜底（若后端也未启动，则用本地写死的短文）
      data = { ok: true, date: todayStr(), fromAI: false, title: '今日听写 · 热点短文',
        en_passage: 'Learning a language opens a door to new worlds. Every word you remember is a small step forward. Today, read the news, listen carefully, and write what you hear. Practice a little each day, and your English will grow stronger.',
        zh_summary: '短文鼓励每日通过新闻与听写练习英语，强调积累的力量。', source: ['本地素材'] };
    }
    DB.set('dictation', data);
    return data;
  }
  let dictSentences = [], dictIndex = 0, dictShowSubtitle = false;
  window.PW.onEnglishTab = function (target) {
    if (target === 'dictation-tab') renderDictation();
    else if (target === 'wordbook-tab') renderWordbookManage();
  };
  function renderDictation() {
    const tab = $('dictation-tab');
    if (!tab) return;
    const d = DB.get('dictation', null);
    if (!d) {
      tab.innerHTML = '<div class="vocab-card"><p class="card-sub">听写素材生成中…</p></div>';
      ensureDictation().then(() => { if ($('dictation-tab').classList.contains('active')) renderDictation(); }).catch(() => {});
      return;
    }
    dictSentences = splitSentences(d.en_passage);
    dictIndex = 0;
    dictShowSubtitle = false;
    const src = (d.source || []).map((s) => esc(s)).join('、');
    tab.innerHTML =
      '<div class="vocab-card dictation-box">'
      + '<div class="dictation-head"><span class="dictation-badge">' + (d.fromAI ? '🤖 AI 热点' : '📝 本地') + '</span>'
      + '<span class="dictation-title">' + esc(d.title || '今日听写') + '</span></div>'
      + '<div class="dictation-text" id="dict-sentence">准备就绪，点击播放听写第一句</div>'
      + '<div class="dictation-input-row"><input class="input" id="dict-input" placeholder="听写你刚刚听到的句子" autocomplete="off"><button class="btn btn-gold" onclick="pwCheckSentence()">检查</button></div>'
      + '<div class="vocab-controls" style="margin-top:16px">'
      + '<button class="btn btn-ghost" onclick="pwPlaySentence()">🔊 播放当前句</button>'
      + '<button class="btn btn-ghost" onclick="pwNextSentence()">下一句 ➡</button>'
      + '<button class="btn btn-ghost" id="dict-subtitle-btn" onclick="pwToggleSubtitle()">👁 显示英文字幕</button>'
      + '<button class="btn btn-ghost" onclick="pwToggleSummary()">📖 中文摘要</button>'
      + '</div>'
      + '<div class="dictation-summary" id="dict-summary" style="display:none"><div class="label">中文摘要</div><div class="val">' + esc(d.zh_summary || '') + '</div>'
      + (src ? '<div class="label" style="margin-top:10px">素材来源</div><div class="val">' + src + '</div>' : '') + '</div>'
      + '<div class="vocab-stat" id="dict-progress"></div>'
      + '</div>';
    updateDictProgress();
  }
  function norm(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  window.pwPlaySentence = function () {
    if (!('speechSynthesis' in window)) { toast('当前浏览器不支持语音播放', 'error'); return; }
    const s = dictSentences[dictIndex];
    if (!s) return;
    const u = new SpeechSynthesisUtterance(s);
    u.lang = 'en-US'; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
    const box = $('dict-sentence');
    if (box) {
      box.textContent = dictShowSubtitle ? ('🔊 播放中：' + s) : '🔊 正在播放，请仔细听（磨耳朵模式）';
      box.classList.toggle('hidden-sub', !dictShowSubtitle);
    }
  };
  window.pwToggleSubtitle = function () {
    dictShowSubtitle = !dictShowSubtitle;
    const btn = $('dict-subtitle-btn');
    if (btn) {
      btn.textContent = dictShowSubtitle ? '🙈 隐藏英文字幕' : '👁 显示英文字幕';
      btn.classList.toggle('btn-gold', dictShowSubtitle);
      btn.classList.toggle('btn-ghost', !dictShowSubtitle);
    }
    const box = $('dict-sentence');
    const s = dictSentences[dictIndex];
    if (box && s && box.textContent.includes('播放')) {
      box.textContent = dictShowSubtitle ? ('🔊 播放中：' + s) : '🔊 正在播放，请仔细听（磨耳朵模式）';
      box.classList.toggle('hidden-sub', !dictShowSubtitle);
    }
  };
  window.pwCheckSentence = function () {
    const s = dictSentences[dictIndex];
    if (!s) return;
    const inp = $('dict-input').value.trim();
    if (!inp) { toast('请先输入你听到的内容', 'info'); return; }
    if (norm(inp) === norm(s)) {
      toast('✅ 听写正确！', 'success');
      $('dict-input').value = '';
      pwNextSentence();
    } else {
      toast('❌ 还不对，再听一次或看看参考', 'error');
      $('dict-sentence').innerHTML = '参考：<span style="opacity:.8">' + esc(s) + '</span>';
    }
  };
  window.pwNextSentence = function () {
    dictIndex++;
    if (dictIndex >= dictSentences.length) {
      dictIndex = dictSentences.length - 1;
      $('dict-sentence').textContent = '🎉 今天的听写全部完成！可以重听或查看摘要。';
      $('dict-input').value = '';
      updateDictProgress();
      return;
    }
    $('dict-sentence').textContent = '第 ' + (dictIndex + 1) + ' 句，点击播放听写';
    $('dict-input').value = '';
    updateDictProgress();
  };
  window.pwToggleSummary = function () {
    const s = $('dict-summary');
    if (s) s.style.display = (s.style.display === 'none') ? 'block' : 'none';
  };
  function updateDictProgress() {
    const p = $('dict-progress');
    if (p) p.textContent = '句子进度 ' + (dictIndex + 1) + ' / ' + dictSentences.length;
  }

  /* =========================================================
   * ③ 积分工具（每日登录赠分，仪表板显示累计积分）
   * ======================================================= */
  const INIT_POINTS = 200, DAILY_LOGIN_BONUS = 10;
  function getPoints() { return (window.PW && window.PW.getPoints) ? window.PW.getPoints() : (DB.get('points', 0)); }
  function addPoints(n) { DB.set('points', getPoints() + (n || 0)); if (window.PW && window.PW.loadDashboard) window.PW.loadDashboard(); }
  function spendPoints(n) {
    const p = getPoints();
    if (p < (n || 0)) return false;
    DB.set('points', p - (n || 0));
    if (window.PW && window.PW.loadDashboard) window.PW.loadDashboard();
    return true;
  }
  function ensurePointsSeeded() {
    if (!DB.get('points_seeded')) { DB.set('points', INIT_POINTS); DB.set('points_seeded', true); }
  }
  function grantDailyLogin() {
    const last = DB.get('daily_login_bonus', '');
    if (last !== todayStr()) { DB.set('daily_login_bonus', todayStr()); addPoints(DAILY_LOGIN_BONUS); return true; }
    return false;
  }

  /* =========================================================
   * 单词本管理标签
   * ======================================================= */
  function renderWordbookManage() {
    const tab = $('wordbook-tab');
    if (!tab) return;
    const list = getWordbooks();
    const todayId = getTodayBookId();
    let body;
    if (list.length === 0) {
      body = '<div class="pw-empty">还没有单词本。点击上方「＋ 新建词本」或「⬆ 上传词本（AI 加工）」开始。</div>';
    } else {
      body = list.map((b) => {
        const isToday = b.id === todayId;
        const isOfficial = b.official;
        const badges = (isToday ? ' <span class="rarity-badge r-special">今日背诵</span>' : '') + (isOfficial ? ' <span class="rarity-badge r-legendary">官方固定</span>' : '');
        const meta = '共 ' + b.words.length + ' 词' + (b.created !== '-' ? ' · 创建于 ' + esc(b.created || '') : ' · 系统自动维护');
        return '<div class="wb-manage-item">'
          + '<div class="wb-manage-info"><div class="wb-manage-name">' + esc(b.name) + badges + '</div>'
          + '<div class="wb-manage-meta">' + meta + '</div></div>'
          + '<div class="wb-manage-actions">'
          + (isToday ? '' : '<button class="btn btn-gold btn-sm" onclick="pwSetToday(\'' + b.id + '\')">设为今日背诵</button>')
          + '<button class="btn btn-ghost btn-sm" onclick="pwViewWords(\'' + b.id + '\')">查看单词</button>'
          + (isOfficial ? '' : '<button class="btn btn-ghost btn-sm btn-danger" onclick="pwDeleteBook(\'' + b.id + '\')">删除</button>')
          + '</div></div>';
      }).join('');
    }
    tab.innerHTML = '<div class="vocab-card"><h3 class="card-title">单词本管理</h3>'
      + '<p class="card-sub" style="margin-bottom:14px">上传的词本会由智谱 AI 加工生成单词卡（音标 / 释义 / 例句 / 分类）并存入此处；可创建多个词本并选择当天要背的那一本。</p>'
      + '<div class="wb-manage-list">' + body + '</div></div>';
  }
  window.pwSetToday = function (id) {
    setTodayBookId(id); renderBookSelect();
    if (window.PW && window.PW.onEnglish) window.PW.onEnglish();
    renderWordbookManage();
    toast('已设为今日背诵词本', 'success');
  };
  window.pwDeleteBook = function (id) {
    if (!confirm('确定删除该单词本吗？其中的单词卡将一并删除。')) return;
    setWordbooks(getWordbooks().filter((b) => b.id !== id));
    if (getTodayBookId() === id) setTodayBookId(BUILTIN_BOOK);
    renderBookSelect(); renderWordbookManage();
    if (window.PW && window.PW.onEnglish) window.PW.onEnglish();
    toast('已删除词本', 'info');
  };
  window.pwViewWords = function (id) {
    const b = getWordbooks().find((x) => x.id === id);
    if (!b) return;
    const rows = b.words.length === 0
      ? '<div class="pw-empty">这个词本还没有单词，去上传吧。</div>'
      : b.words.map((w) =>
          '<div class="wb-word-row"><div class="wb-word-main"><span class="wb-word-name">' + esc(w.word) + '</span>'
          + (w.phonetic ? ' <span class="wb-word-phon">/' + esc(w.phonetic) + '/</span>' : '')
          + '<div class="wb-word-mean">' + esc(w.meaning || '') + '</div>'
          + (w.example ? '<div class="wb-word-ex">“' + esc(w.example) + '”</div>' : '')
          + '</div><span class="wb-word-cat">' + esc(w.category || '') + '</span></div>'
        ).join('');
    openModal('<div class="modal-head"><h3>📖 ' + esc(b.name) + '（' + b.words.length + ' 词）</h3><button class="modal-close" onclick="pwCloseModal()">×</button></div>'
      + '<div class="wb-word-list">' + rows + '</div>');
  };

  /* =========================================================
   * 每日听写素材
   * ======================================================= */
  // 登录后的「每日自检」弹窗（内容生成已移至登录加载阶段，避免重复调用 AI）
  window.PW.bootDaily = async function () {
    if (window.PW && window.PW.runSelfCheck) window.PW.runSelfCheck();
  };

  /* =========================================================
   * 登录加载阶段（app.js runLoginLoading 调用，onStatus 回传进度文案）
   * ========================================================= */
  // 阶段1：启动 AI 引擎（积分 / 登录赠分 + 服务端通路预热）
  window.PW.preloadBootstrap = async function () {
    ensurePointsSeeded();
    const justLoggedIn = grantDailyLogin();
    if (justLoggedIn) toast('🌞 每日登录 +' + DAILY_LOGIN_BONUS + ' 积分', 'success');
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      await fetch(PW.API_BASE + '/api/health', { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(t);
    } catch (e) { /* 离线可走本地兜底 */ }
  };
  // 阶段2：英语学习（每日听写短文）
  window.PW.preloadEnglish = ensureDictation;

  // 初始渲染词本下拉（进入英语区前先准备好）
  function bootFeatures() {
    ensureUnknownBook();
    if ($('wb-today-select')) renderBookSelect();
  }
  document.addEventListener('DOMContentLoaded', bootFeatures);
  if (document.readyState !== 'loading') bootFeatures();

  // 弹窗背景点击关闭
  document.addEventListener('click', function (e) {
    const root = $('pw-modal');
    if (root && root.classList.contains('open') && e.target === root) closeModal();
  });
})();
