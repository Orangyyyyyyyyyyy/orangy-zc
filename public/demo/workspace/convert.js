/* ============================================================
 * 个人工作台 · 文件格式转换（convert.js）
 * 本地离线转换：TXT/Word/PDF 互相转换 + 缓存/永久保留/导出
 * 依赖 app.js 暴露的 window.PW（API_BASE / toast / escapeHtml）
 * 设计：内容与格式保真优先；引擎缺失时明确提示，绝不伪造成功。
 * ============================================================ */
(function () {
  'use strict';

  const API = (window.PW && window.PW.API_BASE) ? window.PW.API_BASE : '';
  const esc = (window.PW && window.PW.escapeHtml) ? window.PW.escapeHtml : function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };
  function toast(msg, type) {
    if (window.PW && window.PW.toast) window.PW.toast(msg, type);
    else console.log('[convert]', msg);
  }

  const FMT = { txt: 'TXT', docx: 'Word', pdf: 'PDF', word: 'Word' };
  const fmtLabel = (f) => FMT[f] || (f || '').toUpperCase();

  const STYLE = `
  <style>
  .cv-wrap{max-width:960px;margin:0 auto;padding:4px 2px 40px;}
  .cv-card{background:var(--card,#1b1d22);border:1px solid var(--bd,#2a2d34);border-radius:14px;padding:18px 18px 20px;margin-bottom:18px;box-shadow:0 2px 10px rgba(0,0,0,.18);}
  .cv-card h3{margin:0 0 12px;font-size:16px;display:flex;align-items:center;gap:8px;color:var(--text,#e8e8ea);}
  .cv-muted{color:var(--text-2,#9aa0a6);font-size:12.5px;line-height:1.6;}
  .cv-banner{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px;}
  .cv-chip{font-size:12px;padding:4px 10px;border-radius:999px;border:1px solid var(--bd,#2a2d34);}
  .cv-chip.ok{color:#36d399;border-color:#1c5e44;background:#0f2a20;}
  .cv-chip.warn{color:#fbbd23;border-color:#5e4d1c;background:#2a2310;}
  .cv-chip.bad{color:#f87272;border-color:#5e1c1c;background:#2a1010;}
  .cv-drop{border:1.5px dashed var(--bd,#2a2d34);border-radius:12px;padding:22px;text-align:center;cursor:pointer;transition:.15s;color:var(--text-2,#9aa0a6);}
  .cv-drop.hover{border-color:var(--gold,#d9b36b);color:var(--gold,#d9b36b);background:rgba(217,179,107,.06);}
  .cv-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:12px;}
  .cv-field{display:flex;flex-direction:column;gap:5px;font-size:12.5px;color:var(--text-2,#9aa0a6);}
  .cv-field select,.cv-field input{background:var(--input,#15171c);color:var(--text,#e8e8ea);border:1px solid var(--bd,#2a2d34);border-radius:8px;padding:7px 9px;font-size:13px;}
  .cv-btn{background:var(--gold-soft,#3a3320);color:var(--gold,#d9b36b);border:1px solid var(--gold,#d9b36b);border-radius:9px;padding:8px 16px;font-size:13.5px;cursor:pointer;font-weight:600;transition:.15s;}
  .cv-btn:hover{filter:brightness(1.12);}
  .cv-btn.ghost{background:transparent;color:var(--text-2,#9aa0a6);border-color:var(--bd,#2a2d34);font-weight:500;}
  .cv-btn:disabled{opacity:.45;cursor:not-allowed;}
  .cv-progress{height:8px;border-radius:6px;background:var(--bd,#2a2d34);overflow:hidden;margin-top:12px;}
  .cv-progress > i{display:block;height:100%;background:linear-gradient(90deg,var(--gold,#d9b36b),#f0d49a);width:0;transition:width .3s;}
  .cv-stage{font-size:12px;color:var(--text-2,#9aa0a6);margin-top:6px;}
  .cv-tabs{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;}
  .cv-tab{padding:6px 14px;border-radius:999px;border:1px solid var(--bd,#2a2d34);font-size:13px;cursor:pointer;color:var(--text-2,#9aa0a6);}
  .cv-tab.active{background:var(--gold-soft,#3a3320);color:var(--gold,#d9b36b);border-color:var(--gold,#d9b36b);}
  .cv-table{width:100%;border-collapse:collapse;font-size:13px;}
  .cv-table th,.cv-table td{padding:9px 8px;border-bottom:1px solid var(--bd,#2a2d34);text-align:left;vertical-align:middle;}
  .cv-table th{color:var(--text-2,#9aa0a6);font-weight:600;font-size:12px;}
  .cv-badge{font-size:11.5px;padding:2px 9px;border-radius:999px;}
  .cv-badge.success{color:#36d399;background:#0f2a20;}
  .cv-badge.failed{color:#f87272;background:#2a1010;}
  .cv-badge.processing{color:#60a5fa;background:#10203a;}
  .cv-badge.pending{color:#9aa0a6;background:#23262d;}
  .cv-badge.cancelled{color:#c084fc;background:#241033;}
  .cv-perm{color:#36d399;font-size:11.5px;margin-left:6px;}
  .cv-actions{display:flex;gap:6px;flex-wrap:wrap;}
  .cv-act{font-size:12px;padding:4px 9px;border-radius:7px;border:1px solid var(--bd,#2a2d34);background:transparent;color:var(--text-2,#9aa0a6);cursor:pointer;}
  .cv-act:hover{color:var(--gold,#d9b36b);border-color:var(--gold,#d9b36b);}
  .cv-act.danger:hover{color:#f87272;border-color:#f87272;}
  .cv-empty{color:var(--text-2,#9aa0a6);text-align:center;padding:22px;font-size:13px;}
  .cv-note{background:#2a2310;border:1px solid #5e4d1c;color:#fbbd23;border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.6;margin-bottom:12px;}
  .cv-warn-block{background:#2a1010;border:1px solid #5e1c1c;color:#f87272;border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.6;margin-top:10px;}
  </style>`;

  let engines = null;
  let records = [];
  let selected = null; // {name, data(base64), size}
  let target = 'pdf';
  let filter = 'all';
  let polling = null;

  function isSupported(src, tgt) {
    if (!engines || !engines.supported) return false;
    return !!engines.supported[(src + '->' + tgt).toLowerCase()];
  }

  async function loadEngines() {
    try {
      const r = await fetch(API + '/api/convert/engines');
      const d = await r.json();
      engines = d;
    } catch (e) { engines = { engines: {}, supported: {} }; }
    render();
  }

  async function loadRecords() {
    try {
      const r = await fetch(API + '/api/convert/list');
      const d = await r.json();
      records = (d.records || []);
    } catch (e) { records = []; }
  }

  function fmtTime(ts) {
    if (!ts) return '-';
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function srcExt(name) {
    const m = /\.([a-z0-9]+)$/i.exec(name || '');
    return m ? m[1].toLowerCase() : '';
  }

  function buildBanner() {
    if (!engines) return '<div class="cv-muted">正在检测本地转换引擎…</div>';
    const e = engines.engines || {};
    const chips = [
      ['PDF 解析 (PyMuPDF)', e.pymupdf],
      ['Word 读写 (python-docx)', e.python_docx],
      ['PDF 生成 (reportlab)', e.reportlab],
      ['PDF→Word (pdf2docx)', e.pdf2docx],
    ].map(([n, ok]) => '<span class="cv-chip ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓ ' : '✕ ') + n + '</span>').join('');
    let warn = '';
    if (!e.libreoffice) warn += '<span class="cv-chip warn">⚠ Word→PDF 需 LibreOffice（本机未安装，将明确拦截）</span>';
    if (!e.tesseract) warn += '<span class="cv-chip warn">⚠ 扫描件 OCR 需 Tesseract（本机未安装，扫描件 PDF 将拦截）</span>';
    return '<div class="cv-banner">' + chips + warn + '</div>';
  }

  function buildConverter() {
    const src = selected ? srcExt(selected.name) : '';
    let targetOpts = ['pdf', 'docx', 'txt'].map((t) => {
      const sup = src ? isSupported(src, t) : true;
      const label = fmtLabel(t) + (src && !sup ? '（本机暂不支持）' : '');
      return '<option value="' + t + '"' + (t === target ? ' selected' : '') + (src && !sup ? ' disabled' : '') + '>' + label + '</option>';
    }).join('');
    const showOpts = selected && src === 'txt' && target === 'pdf';
    const optsHtml = showOpts ? `
      <div class="cv-field"><label><input type="checkbox" id="cv-pages"> 添加页码</label></div>
      <div class="cv-field"><label>字号</label><select id="cv-fs"><option>10</option><option selected>11</option><option>12</option><option>14</option></select></div>
      <div class="cv-field"><label>页边距(mm)</label><select id="cv-mg"><option>12</option><option selected>18</option><option>25</option></select></div>` : '';
    const fileInfo = selected
      ? '<div class="cv-muted">已选择：<b style="color:var(--text)">' + esc(selected.name) + '</b>（' + fmtLabel(src) + '，' + (selected.size / 1024).toFixed(1) + ' KB）</div>'
      : '';
    return `
      <div class="cv-card">
        <h3>📄 文件转换</h3>
        ${buildBanner()}
        <div class="cv-drop" id="cv-drop">点击或拖拽文件到此处（支持 TXT / Word(.docx) / PDF）</div>
        <input type="file" id="cv-file" accept=".txt,.doc,.docx,.pdf" style="display:none">
        ${fileInfo}
        <div class="cv-row">
          <div class="cv-field"><label>目标格式</label><select id="cv-target">${src ? targetOpts : '<option>请先选择文件</option>'}</select></div>
          ${optsHtml}
        </div>
        <div class="cv-row">
          <button class="cv-btn" id="cv-go">开始转换</button>
          <span class="cv-muted" id="cv-hint"></span>
        </div>
        <div class="cv-progress" id="cv-prog" style="display:none"><i></i></div>
        <div class="cv-stage" id="cv-stage"></div>
        <div class="cv-warn-block" id="cv-warn" style="display:none"></div>
      </div>`;
  }

  function buildRecords() {
    const now = Date.now();
    let list = records.slice();
    if (filter === 'perm') list = list.filter((r) => r.permanent);
    else if (filter === 'expiring') list = list.filter((r) => !r.permanent && r.expires_at && (r.expires_at - now) < 7 * 864e5);

    const rows = list.map((r) => {
      const st = r.status;
      const badge = '<span class="cv-badge ' + st + '">' + ({ success: '成功', failed: '失败', processing: '转换中', pending: '排队中', cancelled: '已取消' }[st] || st) + '</span>';
      const perm = r.permanent ? '<span class="cv-perm">★ 永久保留</span>' : '';
      const warn = r.warning ? ' <span class="cv-chip warn" title="' + esc(r.warning) + '">⚠ 差异</span>' : '';
      const ocr = r.ocr_used ? ' <span class="cv-chip ok">OCR</span>' : '';
      const acts = [];
      if (r.output_path) acts.push('<button class="cv-act" data-act="dl-out" data-id="' + r.id + '">下载结果</button>');
      if (r.source_path) acts.push('<button class="cv-act" data-act="dl-src" data-id="' + r.id + '">源文件</button>');
      if (r.diff_report_path) acts.push('<button class="cv-act" data-act="dl-diff" data-id="' + r.id + '">差异报告</button>');
      if (r.status === 'success' && !r.permanent) acts.push('<button class="cv-act" data-act="perm" data-id="' + r.id + '">永久保留</button>');
      if (r.status === 'failed') acts.push('<button class="cv-act" data-act="retry" data-id="' + r.id + '">重试</button>');
      acts.push('<button class="cv-act danger" data-act="del" data-id="' + r.id + '">删记录</button>');
      return `<tr>
        <td>${esc(r.source_name)} ${perm}</td>
        <td>${fmtLabel(r.source_format)} → ${fmtLabel(r.target_format)}</td>
        <td>${badge}${warn}${ocr}</td>
        <td class="cv-muted">${fmtTime(r.created_at)}</td>
        <td class="cv-muted">${r.permanent ? '永久' : fmtTime(r.expires_at)}</td>
        <td class="cv-actions">${acts.join('')}</td>
      </tr>`;
    }).join('');

    const tabs = [['all', '全部'], ['perm', '永久保留'], ['expiring', '即将过期']].map(([k, l]) =>
      '<span class="cv-tab ' + (filter === k ? 'active' : '') + '" data-filter="' + k + '">' + l + '</span>').join('');

    return `
      <div class="cv-card">
        <h3>🗂 转换记录（默认保留 30 天）</h3>
        <div class="cv-tabs">${tabs}
          <span style="flex:1"></span>
          <button class="cv-btn ghost" id="cv-export">导出永久保留包</button>
          <button class="cv-btn ghost" id="cv-clean">清理过期缓存</button>
        </div>
        ${list.length ? '<table class="cv-table"><thead><tr><th>文件名</th><th>方向</th><th>状态</th><th>创建</th><th>过期/保留</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table>'
          : '<div class="cv-empty">暂无记录</div>'}
      </div>`;
  }

  function render() {
    const root = document.getElementById('convert-mount');
    if (!root) return;
    root.innerHTML = STYLE + '<div class="cv-wrap">' + buildConverter() + buildRecords() + '</div>';
    bind();
  }

  function bind() {
    const drop = document.getElementById('cv-drop');
    const file = document.getElementById('cv-file');
    if (drop && file) {
      drop.onclick = () => file.click();
      drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('hover'); };
      drop.ondragleave = () => drop.classList.remove('hover');
      drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('hover'); if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]); };
      file.onchange = () => { if (file.files[0]) pickFile(file.files[0]); };
    }
    const tsel = document.getElementById('cv-target');
    if (tsel) tsel.onchange = () => { target = tsel.value; render(); };
    const go = document.getElementById('cv-go');
    if (go) go.onclick = submit;

    document.querySelectorAll('.cv-tab').forEach((t) => t.onclick = () => { filter = t.dataset.filter; render(); });
    const ex = document.getElementById('cv-export'); if (ex) ex.onclick = doExport;
    const cl = document.getElementById('cv-clean'); if (cl) cl.onclick = doCleanup;

    document.querySelectorAll('.cv-act').forEach((b) => b.onclick = () => onAction(b.dataset.act, b.dataset.id));
  }

  function pickFile(f) {
    const ext = srcExt(f.name);
    if (!/^(txt|doc|docx|pdf)$/.test(ext)) { toast('不支持的文件格式：' + ext, 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      selected = { name: f.name, data: String(reader.result).replace(/^data:.*;base64,/, ''), size: f.size };
      target = ext === 'txt' ? 'pdf' : (ext === 'pdf' ? 'txt' : 'pdf');
      render();
    };
    reader.readAsDataURL(f);
  }

  function getOptions() {
    const o = {};
    const pages = document.getElementById('cv-pages');
    const fs = document.getElementById('cv-fs');
    const mg = document.getElementById('cv-mg');
    if (pages && pages.checked) o.page_numbers = true;
    if (fs) o.font_size = parseFloat(fs.value);
    if (mg) o.margin_mm = parseFloat(mg.value);
    return o;
  }

  async function submit() {
    if (!selected) { toast('请先选择文件', 'error'); return; }
    const src = srcExt(selected.name);
    if (!isSupported(src, target)) {
      const w = document.getElementById('cv-warn');
      if (w) { w.style.display = 'block'; w.textContent = '当前方向（' + fmtLabel(src) + '→' + fmtLabel(target) + '）在本机无法离线保真转换（缺少相应引擎），提交后将被明确拦截并提示，不会伪造成功。'; }
      return;
    }
    const go = document.getElementById('cv-go'); if (go) go.disabled = true;
    const prog = document.getElementById('cv-prog'); if (prog) prog.style.display = 'block';
    const hint = document.getElementById('cv-hint'); if (hint) hint.textContent = '提交中…';
    try {
      const r = await fetch(API + '/api/convert/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selected.name, data: selected.data, target, options: getOptions() }),
      });
      const d = await r.json();
      if (!d.ok) { toast(d.message || '提交失败', 'error'); return; }
      toast('已加入转换队列', 'success');
      pollStatus(d.id);
    } catch (e) { toast('提交失败：' + e.message, 'error'); }
    finally { if (go) go.disabled = false; }
  }

  function pollStatus(id) {
    if (polling) clearInterval(polling);
    polling = setInterval(async () => {
      try {
        const r = await fetch(API + '/api/convert/status?id=' + id);
        const d = await r.json();
        const rec = d.record;
        if (!rec) return;
        const prog = document.getElementById('cv-prog');
        const bar = prog && prog.querySelector('i');
        const stage = document.getElementById('cv-stage');
        if (bar && prog) { prog.style.display = 'block'; bar.style.width = (rec.progress || 0) + '%'; }
        if (stage) stage.textContent = rec.status === 'processing' ? ('进度 ' + (rec.progress || 0) + '%  ' + (rec.stage || '')) : '';
        if (['success', 'failed', 'cancelled'].includes(rec.status)) {
          clearInterval(polling); polling = null;
          if (rec.status === 'success') {
            toast('转换成功：' + (rec.output_name || ''), 'success');
            if (rec.warning) { const w = document.getElementById('cv-warn'); if (w) { w.style.display = 'block'; w.textContent = '提示：' + rec.warning; } }
          } else if (rec.status === 'failed') {
            toast('转换失败：' + (rec.error_message || rec.error_code), 'error');
            const w = document.getElementById('cv-warn'); if (w) { w.style.display = 'block'; w.textContent = '失败原因：' + (rec.error_message || rec.error_code); }
          }
          await loadRecords(); render();
        }
      } catch (e) {}
    }, 1000);
  }

  async function onAction(act, id) {
    if (act === 'del') {
      if (!confirm('确定删除该缓存记录？\n注意：仅删除记录，源文件 / 输出文件 / 永久保留文件均不会被删除。')) return;
      await fetch(API + '/api/convert/record?id=' + id, { method: 'DELETE' });
      toast('记录已删除（文件未受影响）', 'success');
      await loadRecords(); render();
      return;
    }
    if (act === 'retry') {
      await fetch(API + '/api/convert/retry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      toast('已重新提交', 'success');
      await loadRecords(); render();
      return;
    }
    if (act === 'perm') {
      const r = await fetch(API + '/api/convert/permanent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const d = await r.json();
      toast(d.ok ? '已永久保留（文件已复制到永久目录）' : (d.message || '操作失败'), d.ok ? 'success' : 'error');
      await loadRecords(); render();
      return;
    }
    // 下载
    let kind = act === 'dl-out' ? 'output' : act === 'dl-src' ? 'source' : 'diff';
    window.open(API + '/api/convert/download?id=' + id + '&kind=' + kind, '_blank');
  }

  async function doExport() {
    if (!confirm('导出「永久保留」记录为加密可追溯的资料包（manifest.json + records.csv + 文件 + 校验和）？\n仅包含已永久保留的转换。')) return;
    const r = await fetch(API + '/api/convert/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const d = await r.json();
    if (!d.ok) { toast(d.message || '导出失败', 'error'); return; }
    window.open(API + '/api/convert/export-download?token=' + d.token, '_blank');
    toast('导出已生成', 'success');
  }

  async function doCleanup() {
    if (!confirm('清理所有「非永久保留且已超过 30 天」的缓存记录与缓存文件？\n永久保留记录不受影响。')) return;
    const r = await fetch(API + '/api/convert/cleanup', { method: 'POST' });
    const d = await r.json();
    toast(d.ok ? ('已清理 ' + d.count + ' 条过期记录') : '清理失败', d.ok ? 'success' : 'error');
    await loadRecords(); render();
  }

  window.Convert = {
    render: async function () {
      render(); // 先画骨架（含引擎检测占位）
      await loadEngines();
      await loadRecords();
      render();
    },
  };
})();
