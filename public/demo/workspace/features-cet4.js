/* ============================================================
 * 个人工作台 · 英语四级冲刺模块 (features-cet4.js)
 * 依赖 app.js 暴露的 window.PW（DB / toast / el / $ 等）
 * 功能：① 单词背诵打卡（百词斩照片 + 连续天数）
 *       ② 四级考试介绍（题型分值 + 考试流程时间轴）
 *       ③ 每日冲刺记录（文本 + 多图 + emoji 心得）
 * ============================================================ */
(function () {
  'use strict';
  const PW = window.PW;
  const DB = PW.DB, toast = PW.toast, el = PW.el, $ = PW.$;
  const todayStr = PW.todayStr;
  const esc = PW.escapeHtml;

  /* ---------- 工具 ---------- */
  function dateKey(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  }
  // 图片压缩为 base64（控制体积，避免 localStorage 爆容）
  function compressImage(file, cb, maxW) {
    maxW = maxW || 900;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width, height = img.height;
        if (width > maxW) { height = Math.round(height * maxW / width); width = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        try { cb(canvas.toDataURL('image/jpeg', 0.72)); }
        catch (err) { cb(e.target.result); }
      };
      img.onerror = () => cb(e.target.result);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* =========================================================
   * ① 单词背诵打卡模块
   * 数据结构：cet4_checkin = { [date]: { image, time } }
   * ======================================================= */
  function getCheckins() { return DB.get('cet4_checkin', {}); }
  function setCheckins(v) { DB.set('cet4_checkin', v); }
  function todayCheckin() { return getCheckins()[todayStr()] || null; }

  // 连续打卡天数：今天没打不算断，从今天/昨天往前连续计数
  function calcStreak() {
    const all = getCheckins();
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const k = dateKey(d);
      if (all[k] && all[k].image) { streak++; d.setDate(d.getDate() - 1); }
      else if (i === 0) { d.setDate(d.getDate() - 1); continue; } // 今天还没打，不算断
      else break;
    }
    return streak;
  }
  function calcTotal() {
    const all = getCheckins();
    return Object.keys(all).filter((k) => all[k] && all[k].image).length;
  }

  function uploadCheckinImage(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('请上传图片文件', 'error'); return; }
    compressImage(file, (dataUrl) => {
      const all = getCheckins();
      all[todayStr()] = { image: dataUrl, time: new Date().toLocaleString('zh-CN') };
      setCheckins(all);
      toast('✅ 今日单词打卡完成！', 'success');
      renderCheckinTab();
    });
  }

  function renderCheckinTab() {
    const box = $('cet4-checkin');
    if (!box) return;
    const today = todayCheckin();
    const streak = calcStreak();
    const total = calcTotal();
    const all = getCheckins();
    // 最近 7 天打卡墙
    const days = [];
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const k = dateKey(d);
      days.unshift({ key: k, label: (i === 0 ? '今天' : (d.getMonth() + 1) + '/' + d.getDate()), rec: all[k], isToday: i === 0 });
      d.setDate(d.getDate() - 1);
    }
    const wallHtml = days.map((dy) => {
      const has = dy.rec && dy.rec.image;
      return '<div class="c4-wall-day' + (dy.isToday ? ' today' : '') + (has ? ' done' : '') + '">'
        + '<div class="c4-wall-img">' + (has ? '<img src="' + esc(dy.rec.image) + '" alt="打卡">' : '<span class="c4-wall-empty">' + (dy.isToday ? '📷' : '·') + '</span>') + '</div>'
        + '<div class="c4-wall-label">' + esc(dy.label) + '</div>'
        + (has ? '<span class="c4-wall-check">✓</span>' : '')
        + '</div>';
    }).join('');

    box.innerHTML =
      '<div class="c4-checkin-layout">'
      + '<div class="c4-checkin-main">'
        + '<div class="panel c4-checkin-card">'
          + '<div class="c4-checkin-head">'
            + '<div class="c4-checkin-title">📚 今日百词斩打卡</div>'
            + (today ? '<span class="c4-badge done">已打卡 ✓</span>' : '<span class="c4-badge todo">未打卡</span>')
          + '</div>'
          + '<div class="c4-checkin-preview">'
            + (today
                ? '<img src="' + esc(today.image) + '" alt="今日打卡"><div class="c4-checkin-time">打卡时间：' + esc(today.time) + '</div>'
                : '<div class="c4-checkin-empty"><div class="c4-upload-icon">📷</div><p>今天还没有上传百词斩打卡截图</p><p class="card-sub">上传一张照片即完成今日单词打卡</p></div>')
          + '</div>'
          + '<div class="c4-checkin-actions">'
            + '<button class="btn btn-gold" onclick="document.getElementById(\'c4-checkin-file\').click()">' + (today ? '🔄 重新上传' : '⬆ 上传打卡截图') + '</button>'
            + '<input type="file" id="c4-checkin-file" accept="image/*" style="display:none" onchange="if(this.files[0])c4UploadCheckin(this.files[0]);this.value=\'\'">'
          + '</div>'
        + '</div>'
      + '</div>'
      + '<div class="c4-checkin-side">'
        + '<div class="c4-stat-card streak">'
          + '<div class="c4-stat-num">' + streak + '</div>'
          + '<div class="c4-stat-label">🔥 连续打卡（天）</div>'
        + '</div>'
        + '<div class="c4-stat-card total">'
          + '<div class="c4-stat-num">' + total + '</div>'
          + '<div class="c4-stat-label">📊 累计打卡（天）</div>'
        + '</div>'
      + '</div>'
      + '</div>'
      + '<div class="c4-wall-section">'
        + '<div class="c4-wall-title">📅 最近 7 天打卡墙</div>'
        + '<div class="c4-wall">' + wallHtml + '</div>'
      + '</div>';
  }

  /* =========================================================
   * ② 四级考试介绍（静态内容，根据网查真实数据）
   * 总分710 / 及格425 / 时长125分钟 / 57题
   * ======================================================= */
  const CET4_STRUCTURE = [
    { part: '写作', content: '短文写作', type: '1 篇短文', count: '1 题', ratio: '15%', score: '106.5 分', duration: '30 分钟' },
    { part: '听力理解', content: '短篇新闻', type: '选择题（单选）', count: '7 题', ratio: '7%', score: '49.7 分', duration: '25 分钟' },
    { part: '听力理解', content: '长对话', type: '选择题（单选）', count: '8 题', ratio: '8%', score: '56.8 分', duration: '—' },
    { part: '听力理解', content: '听力篇章', type: '选择题（单选）', count: '10 题', ratio: '20%', score: '142 分', duration: '—' },
    { part: '阅读理解', content: '词汇理解（选词填空）', type: '选词填空', count: '10 题', ratio: '5%', score: '35.5 分', duration: '40 分钟' },
    { part: '阅读理解', content: '长篇阅读（信息匹配）', type: '匹配题', count: '10 题', ratio: '10%', score: '71 分', duration: '—' },
    { part: '阅读理解', content: '仔细阅读', type: '选择题（单选）', count: '10 题', ratio: '20%', score: '142 分', duration: '—' },
    { part: '翻译', content: '汉译英（段落翻译）', type: '1 段翻译', count: '1 题', ratio: '15%', score: '106.5 分', duration: '30 分钟' },
  ];
  const CET4_FLOW = [
    { time: '8:40 — 9:00', title: '试音入场', desc: '考生入场，试音时间。9:00 后禁止迟到考生入场。', icon: '🔔' },
    { time: '9:00 — 9:10', title: '发卷贴码', desc: '阅读考场注意事项，发放试题册、答题卡 1 和答题卡 2，贴条形码并填涂个人信息。', icon: '📋' },
    { time: '9:10 — 9:40', title: '写作考试', desc: '考试正式开始，作答第一部分——写作（30 分钟）。作文题目在试题册背面，期间不可翻看其他部分。', icon: '✍️' },
    { time: '9:40 — 10:05', title: '听力考试', desc: '打开试题册，听力考试正式开始（25 分钟）。务必边听边涂答题卡，听力结束立即收答题卡 1。', icon: '🎧' },
    { time: '10:05 — 10:10', title: '收答题卡 1', desc: '考试暂停 5 分钟，监考老师收回答题卡 1（含作文与听力作答）。', icon: '📥' },
    { time: '10:10 — 11:20', title: '阅读与翻译', desc: '作答阅读理解与翻译部分（70 分钟）。含选词填空、长篇匹配、仔细阅读及段落翻译。', icon: '📖' },
    { time: '11:20', title: '考试结束', desc: '收取试题册和答题卡 2，考试正式结束。清点无误后方可离场。', icon: '🏁' },
  ];

  function renderExamInfo() {
    const box = $('cet4-exam');
    if (!box) return;
    const structRows = CET4_STRUCTURE.map((r) =>
      '<tr>'
      + '<td>' + esc(r.part) + '</td>'
      + '<td>' + esc(r.content) + '</td>'
      + '<td>' + esc(r.type) + '</td>'
      + '<td>' + esc(r.count) + '</td>'
      + '<td><strong>' + esc(r.ratio) + '</strong></td>'
      + '<td>' + esc(r.score) + '</td>'
      + '<td>' + esc(r.duration) + '</td>'
      + '</tr>'
    ).join('');
    const flowHtml = CET4_FLOW.map((f) =>
      '<div class="c4-flow-item">'
      + '<div class="c4-flow-icon">' + f.icon + '</div>'
      + '<div class="c4-flow-body">'
        + '<div class="c4-flow-time">' + esc(f.time) + '</div>'
        + '<div class="c4-flow-title">' + esc(f.title) + '</div>'
        + '<div class="c4-flow-desc">' + esc(f.desc) + '</div>'
      + '</div>'
      + '</div>'
    ).join('');
    box.innerHTML =
      '<div class="c4-exam-overview">'
        + '<div class="c4-overview-card"><div class="c4-ov-num">710</div><div class="c4-ov-label">总分</div></div>'
        + '<div class="c4-overview-card"><div class="c4-ov-num">425</div><div class="c4-ov-label">及格线</div></div>'
        + '<div class="c4-overview-card"><div class="c4-ov-num">125<span class="c4-ov-unit">分钟</span></div><div class="c4-ov-label">考试时长</div></div>'
        + '<div class="c4-overview-card"><div class="c4-ov-num">57<span class="c4-ov-unit">题</span></div><div class="c4-ov-label">总题量</div></div>'
      + '</div>'
      + '<div class="panel c4-struct-card">'
        + '<h3 class="card-title">一、试卷结构与题型分值</h3>'
        + '<p class="card-sub" style="margin-bottom:14px">四级考试共 4 大部分：写作（15%）、听力（35%）、阅读（35%）、翻译（15%）。</p>'
        + '<div class="c4-table-wrap"><table class="c4-table"><thead><tr>'
          + '<th>部分</th><th>测试内容</th><th>题型</th><th>题量</th><th>分值比例</th><th>满分</th><th>考试时间</th>'
        + '</tr></thead><tbody>' + structRows + '</tbody>'
        + '<tfoot><tr><td colspan="3">总计</td><td>57 题</td><td><strong>100%</strong></td><td><strong>710 分</strong></td><td>125 分钟</td></tr></tfoot>'
        + '</table></div>'
      + '</div>'
      + '<div class="panel c4-flow-card">'
        + '<h3 class="card-title">二、考试流程与时间安排</h3>'
        + '<p class="card-sub" style="margin-bottom:18px">四级考试通常在上午 9:00 — 11:20 进行，严格按以下时间节点推进，听力结束后会立即收回答题卡 1。</p>'
        + '<div class="c4-flow">' + flowHtml + '</div>'
        + '<div class="c4-tips">'
          + '<div class="c4-tips-title">💡 备考小提示</div>'
          + '<ul>'
            + '<li>听力没有额外涂卡时间，<strong>务必边听边涂</strong>答题卡。</li>'
            + '<li>写作时间内<strong>不可翻看</strong>试题册其他部分。</li>'
            + '<li>翻译难度较高，先把基本意思译出来也能得分，<strong>不要空着</strong>。</li>'
            + '<li>带齐三证（准考证、身份证、学生证）与 2B 铅笔、橡皮、黑色签字笔。</li>'
            + '<li>严禁携带电子设备进入考场，开考前务必上交。</li>'
          + '</ul>'
        + '</div>'
      + '</div>';
  }

  /* =========================================================
   * ③ 每日冲刺记录
   * 数据结构：cet4_records = { [date]: { content, images:[], emoji, time } }
   * ======================================================= */
  const RECORD_EMOJIS = [
    { e: '💪', label: '斗志满满' },
    { e: '😌', label: '从容淡定' },
    { e: '🤔', label: '还需琢磨' },
    { e: '😵', label: '略感吃力' },
    { e: '😴', label: '状态平平' },
    { e: '🔥', label: '渐入佳境' },
    { e: '🌱', label: '慢慢积累' },
    { e: '🎯', label: '目标清晰' },
    { e: '⚡', label: '效率爆发' },
    { e: '😰', label: '时间紧张' },
    { e: '😊', label: '小有收获' },
    { e: '🌟', label: '突破自己' },
  ];
  const MAX_RECORD_IMAGES = 6;
  // 当前编辑态（重新渲染时先从 DOM 同步回来，避免输入丢失）
  let recState = { date: '', images: [], emoji: '', content: '' };

  function getRecords() { return DB.get('cet4_records', {}); }
  function setRecords(v) { DB.set('cet4_records', v); }

  function loadRecordState(date) {
    const all = getRecords();
    const r = all[date];
    recState = {
      date: date,
      images: (r && r.images) ? r.images.slice() : [],
      emoji: (r && r.emoji) || '',
      content: (r && r.content) || '',
    };
  }

  // 渲染前先同步当前 DOM 上的编辑态
  function syncFromDom() {
    const ta = $('c4-record-text');
    if (ta) recState.content = ta.value;
    const di = $('c4-record-date');
    if (di && di.value && di.value !== recState.date) {
      // 日期被改了，切到对应日期的记录
      loadRecordState(di.value);
    }
  }

  function renderRecordTab() {
    const box = $('cet4-record');
    if (!box) return;
    syncFromDom();
    const date = recState.date || todayStr();
    const all = getRecords();
    const r = all[date];
    const isToday = date === todayStr();
    const isPast = date < todayStr();
    const editable = isToday;

    const emojiHtml = RECORD_EMOJIS.map((m) =>
      '<button class="c4-emoji-btn' + (recState.emoji === m.e ? ' active' : '') + '" type="button" title="' + esc(m.label) + '" onclick="c4PickEmoji(\'' + m.e + '\')" ' + (editable ? '' : 'disabled') + '>'
      + '<span class="c4-emoji-icon">' + m.e + '</span><span class="c4-emoji-label">' + esc(m.label) + '</span></button>'
    ).join('');
    const imgsHtml = recState.images.length
      ? recState.images.map((src, i) =>
          '<div class="c4-rec-img"><img src="' + esc(src) + '" alt="记录图"><button class="c4-rec-img-del" onclick="c4DelRecImage(' + i + ')" title="删除">×</button></div>'
        ).join('')
      : '';
    box.innerHTML =
      '<div class="panel c4-record-card">'
        + '<div class="c4-record-head">'
          + '<input type="date" class="input" id="c4-record-date" value="' + esc(date) + '" onchange="c4LoadRecord()">'
          + (isToday ? '<span class="c4-badge done">今日记录</span>' : '<span class="c4-badge todo">' + (isPast ? '历史记录 · 只读' : '未来日期') + '</span>')
        + '</div>'
        + (editable ? '' : '<div class="diary-notice">' + (isPast ? '这是过去的记录，仅供查看。切回今天即可编辑。' : '未来的日期暂不可记录。') + '</div>')
        + '<div class="c4-record-section">'
          + '<div class="c4-record-label">📝 今日学习内容</div>'
          + '<textarea class="textarea c4-record-text" id="c4-record-text" placeholder="今天背了多少单词？做了哪部分真题？有什么收获和困惑……" ' + (editable ? '' : 'disabled') + '>' + esc(recState.content) + '</textarea>'
        + '</div>'
        + '<div class="c4-record-section">'
          + '<div class="c4-record-label">🖼 学习配图（最多 ' + MAX_RECORD_IMAGES + ' 张）</div>'
          + '<div class="c4-rec-images">' + imgsHtml + '</div>'
          + (editable && recState.images.length < MAX_RECORD_IMAGES
              ? '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'c4-record-file\').click()"><i>＋</i> 添加图片</button><input type="file" id="c4-record-file" accept="image/*" style="display:none" onchange="if(this.files[0])c4AddRecImage(this.files[0]);this.value=\'\'">'
              : (editable ? '<span class="card-sub">已达图片上限</span>' : ''))
        + '</div>'
        + '<div class="c4-record-section">'
          + '<div class="c4-record-label">😊 用一个表情概括今天的学习心得</div>'
          + '<div class="c4-emoji-picker">' + emojiHtml + '</div>'
          + (recState.emoji ? '<div class="c4-emoji-current">当前心得：<span class="c4-emoji-big">' + recState.emoji + '</span></div>' : '')
        + '</div>'
        + (editable ? '<div class="c4-record-actions"><button class="btn btn-gold" onclick="c4SaveRecord()">💾 保存今日记录</button></div>' : '')
      + '</div>'
      + '<div class="c4-record-history">'
        + '<h3 class="card-title" style="margin-bottom:14px">📔 冲刺记录历史</h3>'
        + renderRecordHistory(all)
      + '</div>';
  }

  function renderRecordHistory(all) {
    const keys = Object.keys(all).sort().reverse();
    if (keys.length === 0) return '<div class="pw-empty">还没有任何冲刺记录，开始你的第一篇吧～</div>';
    return '<div class="c4-history-list">' + keys.slice(0, 30).map((k) => {
      const r = all[k];
      if (!r) return '';
      const preview = (r.content || '').slice(0, 80);
      const imgCount = (r.images || []).length;
      return '<div class="c4-history-item" onclick="c4OpenRecord(\'' + esc(k) + '\')">'
        + '<div class="c4-history-emoji">' + (r.emoji || '📄') + '</div>'
        + '<div class="c4-history-body">'
          + '<div class="c4-history-date">' + esc(k) + (k === todayStr() ? ' · 今天' : '') + '</div>'
          + '<div class="c4-history-preview">' + esc(preview || '(无文字记录)') + (preview.length >= 80 ? '…' : '') + '</div>'
          + '<div class="c4-history-meta">' + (imgCount ? '🖼 ' + imgCount + ' 张图 · ' : '') + esc(r.time || '') + '</div>'
        + '</div>'
        + '</div>';
    }).join('') + '</div>';
  }

  /* ---------- 交互入口 ---------- */
  window.c4UploadCheckin = uploadCheckinImage;

  window.c4LoadRecord = function () {
    syncFromDom();
    renderRecordTab();
  };

  window.c4OpenRecord = function (date) {
    loadRecordState(date);
    renderRecordTab();
    const box = $('cet4-record');
    if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.c4AddRecImage = function (file) {
    if (!file || !file.type.startsWith('image/')) { toast('请上传图片文件', 'error'); return; }
    if (recState.images.length >= MAX_RECORD_IMAGES) { toast('最多 ' + MAX_RECORD_IMAGES + ' 张图片', 'error'); return; }
    syncFromDom();
    compressImage(file, (dataUrl) => {
      recState.images.push(dataUrl);
      renderRecordTab();
      toast('图片已添加（共 ' + recState.images.length + ' 张）', 'success');
    });
  };

  window.c4DelRecImage = function (i) {
    syncFromDom();
    recState.images.splice(i, 1);
    renderRecordTab();
  };

  window.c4PickEmoji = function (e) {
    syncFromDom();
    recState.emoji = (recState.emoji === e) ? '' : e;
    renderRecordTab();
  };

  window.c4SaveRecord = function () {
    syncFromDom();
    const date = recState.date || todayStr();
    const text = (recState.content || '').trim();
    if (!text && recState.images.length === 0 && !recState.emoji) {
      toast('请至少填写内容、图片或心得表情', 'error'); return;
    }
    const all = getRecords();
    all[date] = {
      content: text,
      images: recState.images.slice(),
      emoji: recState.emoji,
      time: new Date().toLocaleString('zh-CN'),
    };
    setRecords(all);
    toast('✅ 冲刺记录已保存（' + date + '）', 'success');
    renderRecordTab();
  };

  /* ---------- Tab 切换 ---------- */
  window.switchCet4Tab = function (target, btn) {
    ['cet4-checkin', 'cet4-exam', 'cet4-record'].forEach((id) => {
      const t = $(id); if (t) t.classList.toggle('active', id === target);
    });
    document.querySelectorAll('#cet4-section .tab-btn').forEach((b) => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (target === 'cet4-checkin') renderCheckinTab();
    else if (target === 'cet4-exam') renderExamInfo();
    else if (target === 'cet4-record') renderRecordTab();
  };

  /* ---------- 进入页面时初始化 ---------- */
  window.PW.onCet4 = function () {
    renderCheckinTab();
    renderExamInfo();
    if (!recState.date) loadRecordState(todayStr());
    renderRecordTab();
  };

  // 启动时预置今天的编辑态（日期选择器默认值）
  function boot() {
    if (!recState.date) loadRecordState(todayStr());
  }
  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
