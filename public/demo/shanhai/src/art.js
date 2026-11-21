/* ============================================================
 * 山海司·巡荒录  —  美术层 art.js
 * 职责：程序化水墨卡面（SVG Data URI）、图标、头像路径
 * 说明：卡面按卡牌 id 作为随机种子，同卡永远同图；
 *       全部矢量绘制，无外部图片依赖，可直接 file:// 运行。
 * ============================================================ */
(function (root) {
  'use strict';
  const SH = (root.SH = root.SH || {});
  const A = (SH.art = {});

  const INK = '#07090b';
  const INK2 = '#11161a';

  // 以 art.js 自身位置推导应用根目录，保证在 app/ 与 tools/ 下都能取到美术资源
  const BASE = (function () {
    try {
      const src = (document.currentScript && document.currentScript.src) || '';
      const i = src.indexOf('/src/art.js');
      return i >= 0 ? src.slice(0, i + 1) : '';
    } catch (e) { return ''; }
  })();

  const ELEM = {
    '金': { main: '#e0c887', deep: '#8a6f38', soft: 'rgba(224,200,135,.22)' },
    '木': { main: '#8fbf7c', deep: '#3d6244', soft: 'rgba(143,191,124,.2)' },
    '水': { main: '#7fb6dc', deep: '#2a5570', soft: 'rgba(127,182,220,.2)' },
    '火': { main: '#e07a58', deep: '#7a2f22', soft: 'rgba(224,122,88,.22)' },
    '土': { main: '#c9a67c', deep: '#5e4832', soft: 'rgba(201,166,124,.2)' },
    '无': { main: '#b9bec4', deep: '#474e55', soft: 'rgba(185,190,196,.16)' }
  };
  A.ELEM = ELEM;

  function col(elem, key) {
    return (ELEM[elem] || ELEM['无'])[key || 'main'];
  }
  A.color = col;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function f(n) { return Math.round(n * 10) / 10; }

  /* ============================================================
   * 1. 异兽剪影（模块化水墨兽形）
   *    局部坐标：兽身中心 (0,0)，头朝右，脚下约 y=70
   * ============================================================ */
  function leg(x, top, len, w, op) {
    return '<path d="M ' + f(x - w / 2) + ' ' + f(top) + ' L ' + f(x - w / 2 + 1) + ' ' + f(top + len) +
      ' L ' + f(x + w / 2 - 1) + ' ' + f(top + len) + ' L ' + f(x + w / 2) + ' ' + f(top) + ' Z"' +
      (op ? ' opacity="' + op + '"' : '') + '/>' +
      '<ellipse cx="' + f(x) + '" cy="' + f(top + len) + '" rx="' + f(w * 0.75) + '" ry="' + f(w * 0.34) + '"/>';
  }

  function tailShape(kind, w, h, count) {
    let out = '';
    if (kind === 'none') return out;
    if (kind === 'nine') {
      const bx = -w * 0.9;
      for (let i = 0; i < 9; i++) {
        const a = (-118 + i * 19) * Math.PI / 180;
        const len = 52 + (i % 3) * 10 + (i % 2) * 6;
        const tipX = bx + Math.cos(a) * len;
        const tipY = Math.sin(a) * len;
        const cx1 = bx - 22 + Math.cos(a) * len * 0.35;
        const cy1 = Math.sin(a) * len * 0.55 - 6;
        out += '<path d="M ' + f(bx) + ' 4 Q ' + f(cx1) + ' ' + f(cy1) + ' ' + f(tipX) + ' ' + f(tipY) +
          '" fill="none" stroke="' + INK + '" stroke-width="9" stroke-linecap="round" opacity=".95"/>';
        out += '<circle cx="' + f(tipX) + '" cy="' + f(tipY) + '" r="4.5"/>';
      }
      return out;
    }
    if (kind === 'bushy') {
      out += '<path d="M ' + (-w * 0.92) + ' 2 C ' + (-w - 20) + ' -8 ' + (-w - 34) + ' -34 ' +
        (-w - 20) + ' -56 C ' + (-w - 16) + ' -32 ' + (-w - 2) + ' -16 ' + (-w * 0.8) + ' -8 Z"/>';
    } else if (kind === 'long') {
      out += '<path d="M ' + (-w * 0.92) + ' 0 C ' + (-w - 30) + ' -2 ' + (-w - 56) + ' -18 ' +
        (-w - 58) + ' -40 C ' + (-w - 40) + ' -24 ' + (-w - 20) + ' -12 ' + (-w * 0.82) + ' -8 Z"/>';
    } else if (kind === 'thin') {
      out += '<path d="M ' + (-w * 0.95) + ' -2 C ' + (-w - 20) + ' -10 ' + (-w - 26) + ' -34 ' +
        (-w - 18) + ' -52" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>';
    } else if (kind === 'horse') {
      out += '<path d="M ' + (-w * 0.95) + ' -4 C ' + (-w - 22) + ' -16 ' + (-w - 22) + ' -50 ' +
        (-w - 6) + ' -72 C ' + (-w - 16) + ' -44 ' + (-w - 6) + ' -20 ' + (-w * 0.8) + ' -8 Z"/>';
    } else {
      out += '<path d="M ' + (-w * 0.92) + ' 4 C ' + (-w - 22) + ' 8 ' + (-w - 30) + ' -8 ' +
        (-w - 22) + ' -24 C ' + (-w - 12) + ' -10 ' + (-w - 4) + ' -4 ' + (-w * 0.82) + ' -6 Z"/>';
    }
    return out;
  }

  function quad(cfg) {
    const w = cfg.w || 44;
    const h = cfg.h || 20;
    const len = cfg.legLen || 40;
    const headX = cfg.headX || w + 22;
    const headY = cfg.headY || -h - 22;
    const headR = cfg.headR || 14;
    const parts = [];

    parts.push(tailShape(cfg.tail, w, h, cfg.tails));
    // 身体
    parts.push('<path d="M ' + (-w) + ' 0 C ' + (-w) + ' ' + (-h * 1.1) + ' ' + (-w * 0.6) + ' ' + (-h * 1.35) +
      ' 0 ' + (-h * 1.35) + ' C ' + (w * 0.6) + ' ' + (-h * 1.35) + ' ' + (w * 0.88) + ' ' + (-h * 0.7) +
      ' ' + (w * 0.94) + ' 0 C ' + (w * 0.86) + ' ' + (h * 0.95) + ' ' + (w * 0.3) + ' ' + (h * 1.12) +
      ' 0 ' + (h * 1.12) + ' C ' + (-w * 0.5) + ' ' + (h * 1.12) + ' ' + (-w * 0.9) + ' ' + (h * 0.85) + ' ' + (-w) + ' 0 Z"/>');
    parts.push('<circle cx="' + f(-w * 0.58) + '" cy="' + f(h * 0.14) + '" r="' + f(h * 0.98) + '"/>');
    parts.push('<circle cx="' + f(w * 0.55) + '" cy="' + f(-h * 0.05) + '" r="' + f(h * 0.8) + '"/>');
    // 颈
    parts.push('<path d="M ' + f(w * 0.5) + ' ' + f(-h * 0.6) + ' L ' + f(headX - headR * 0.4) + ' ' + f(headY + headR * 0.7) +
      ' L ' + f(headX + headR * 0.5) + ' ' + f(headY + headR * 0.9) + ' L ' + f(w * 0.82) + ' ' + f(h * 0.2) + ' Z"/>');
    // 头
    parts.push('<ellipse cx="' + f(headX) + '" cy="' + f(headY) + '" rx="' + f(headR) + '" ry="' + f(headR * 0.8) +
      '" transform="rotate(-10 ' + f(headX) + ' ' + f(headY) + ')"/>');
    // 吻部
    parts.push('<path d="M ' + f(headX + headR * 0.5) + ' ' + f(headY - headR * 0.35) + ' L ' +
      f(headX + headR + (cfg.snout || 12)) + ' ' + f(headY) + ' L ' +
      f(headX + headR * 0.55) + ' ' + f(headY + headR * 0.5) + ' Z"/>');
    // 耳 / 角
    const ear = cfg.ear || 'point';
    if (ear === 'antler') {
      parts.push('<path d="M ' + f(headX - 10) + ' ' + f(headY - headR * 0.7) + ' C ' + f(headX - 18) + ' ' + f(headY - 26) +
        ' ' + f(headX - 14) + ' ' + f(headY - 38) + ' ' + f(headX - 4) + ' ' + f(headY - 46) +
        ' C ' + f(headX - 8) + ' ' + f(headY - 32) + ' ' + f(headX - 4) + ' ' + f(headY - 24) + ' ' + f(headX) + ' ' + f(headY - 18) + ' Z"/>');
      parts.push('<path d="M ' + f(headX + 2) + ' ' + f(headY - headR * 0.8) + ' C ' + f(headX - 2) + ' ' + f(headY - 32) +
        ' ' + f(headX + 4) + ' ' + f(headY - 44) + ' ' + f(headX + 14) + ' ' + f(headY - 48) +
        ' C ' + f(headX + 8) + ' ' + f(headY - 34) + ' ' + f(headX + 10) + ' ' + f(headY - 24) + ' ' + f(headX + 12) + ' ' + f(headY - 16) + ' Z"/>');
    } else if (ear === 'horn') {
      parts.push('<path d="M ' + f(headX - 9) + ' ' + f(headY - headR * 0.6) + ' C ' + f(headX - 18) + ' ' + f(headY - 24) +
        ' ' + f(headX - 20) + ' ' + f(headY - 34) + ' ' + f(headX - 12) + ' ' + f(headY - 40) +
        ' C ' + f(headX - 8) + ' ' + f(headY - 28) + ' ' + f(headX - 4) + ' ' + f(headY - 20) + ' ' + f(headX - 1) + ' ' + f(headY - 14) + ' Z"/>');
      parts.push('<path d="M ' + f(headX + 4) + ' ' + f(headY - headR * 0.7) + ' C ' + f(headX + 2) + ' ' + f(headY - 26) +
        ' ' + f(headX + 8) + ' ' + f(headY - 36) + ' ' + f(headX + 16) + ' ' + f(headY - 40) +
        ' C ' + f(headX + 12) + ' ' + f(headY - 26) + ' ' + f(headX + 12) + ' ' + f(headY - 18) + ' ' + f(headX + 13) + ' ' + f(headY - 12) + ' Z"/>');
    } else if (ear === 'round') {
      parts.push('<circle cx="' + f(headX - 9) + '" cy="' + f(headY - headR * 0.85) + '" r="6"/>');
      parts.push('<circle cx="' + f(headX + 7) + '" cy="' + f(headY - headR * 0.9) + '" r="6"/>');
    } else {
      parts.push('<path d="M ' + f(headX - 11) + ' ' + f(headY - headR * 0.5) + ' L ' + f(headX - 16) + ' ' + f(headY - 24) +
        ' L ' + f(headX - 2) + ' ' + f(headY - headR * 0.8) + ' Z"/>');
      parts.push('<path d="M ' + f(headX + 4) + ' ' + f(headY - headR * 0.8) + ' L ' + f(headX + 10) + ' ' + f(headY - 24) +
        ' L ' + f(headX + 14) + ' ' + f(headY - headR * 0.5) + ' Z"/>');
    }
    // 鬃毛 / 背脊
    if (cfg.mane) {
      parts.push('<path d="M ' + f(headX - 6) + ' ' + f(headY - 8) + ' C ' + f(headX - 20) + ' ' + f(headY - 22) +
        ' ' + f(w * 0.5) + ' ' + f(-h * 1.6) + ' ' + f(w * 0.1) + ' ' + f(-h * 1.55) +
        ' C ' + f(w * 0.4) + ' ' + f(-h * 1.2) + ' ' + f(w * 0.75) + ' ' + f(-h * 0.4) + ' ' + f(w * 0.55) + ' ' + f(h * 0.1) + ' Z"/>');
    }
    if (cfg.spikes) {
      for (let i = 0; i < 5; i++) {
        const x = -w * 0.8 + i * w * 0.32;
        parts.push('<path d="M ' + f(x) + ' ' + f(-h * 1.2) + ' L ' + f(x + 6) + ' ' + f(-h * 1.9) + ' L ' + f(x + 11) + ' ' + f(-h * 1.2) + ' Z"/>');
      }
    }
    // 腿
    const legs = cfg.legs || [-w * 0.72, -w * 0.5, w * 0.42, w * 0.64];
    parts.push(leg(legs[1], h * 0.5, len, 9, '.95'));
    parts.push(leg(legs[3], h * 0.4, len, 9, '.95'));
    parts.push(leg(legs[0], h * 0.6, len, 10));
    parts.push(leg(legs[2], h * 0.5, len, 10));

    // 獠牙
    if (cfg.tusk) {
      parts.push('<path d="M ' + f(headX + 12) + ' ' + f(headY + 5) + ' L ' + f(headX + 18) + ' ' + f(headY + 16) +
        ' L ' + f(headX + 20) + ' ' + f(headY + 4) + ' Z"/>');
    }
    return parts.join('');
  }

  function bird() {
    return [
      '<path d="M -30 4 C -52 20 -76 18 -90 8 C -66 4 -46 -2 -26 -8 Z"/>',
      '<path d="M -26 8 L -62 30 L -44 10 L -70 2 L -30 0 Z" opacity=".92"/>',
      '<ellipse cx="2" cy="4" rx="34" ry="21" transform="rotate(-8 2 4)"/>',
      '<path d="M 18 -2 C 24 -26 36 -34 44 -32 L 34 2 Z"/>',
      '<circle cx="42" cy="-26" r="11"/>',
      '<path d="M 50 -30 L 70 -22 L 50 -16 Z"/>',
      '<path d="M 40 -36 C 36 -50 42 -58 50 -62 C 48 -50 50 -42 52 -36 Z"/>',
      '<path d="M -10 -10 C 6 -46 38 -56 58 -48 C 38 -40 20 -28 2 2 Z"/>',
      '<path d="M -18 -4 C -46 -26 -68 -20 -80 0 C -56 -4 -36 6 -12 12 Z" opacity=".94"/>',
      '<path d="M -4 22 L -8 38 M 12 22 L 10 38" stroke="' + INK + '" stroke-width="3.4"/>',
      '<path d="M -4 22 L -10 38 L -4 38 L 0 24 M 12 22 L 8 38 L 14 38 L 16 24" fill="' + INK + '"/>'
    ].join('');
  }

  function fish() {
    return [
      '<path d="M -44 2 C -24 -26 18 -30 44 -6 C 26 18 -14 26 -44 2 Z"/>',
      '<path d="M -38 2 L -74 -22 L -66 2 L -76 24 Z"/>',
      '<path d="M -8 -24 L 6 -46 L 16 -22 Z"/>',
      '<path d="M -8 22 L 4 42 L 16 20 Z"/>',
      '<path d="M 26 8 C 36 16 44 16 52 10" stroke="' + INK + '" stroke-width="3" fill="none"/>',
      '<path d="M 40 -6 C 58 -12 66 -24 60 -34" stroke="' + INK + '" stroke-width="2.4" fill="none"/>',
      '<path d="M 30 -18 L 36 -30 L 42 -18" stroke="' + INK + '" stroke-width="2" fill="none"/>'
    ].join('');
  }

  function serpent() {
    return [
      '<path d="M -66 30 C -32 46 14 44 28 22 C 42 2 30 -22 8 -22 C -14 -22 -24 -2 -4 4" fill="none" stroke="' + INK + '" stroke-width="15" stroke-linecap="round"/>',
      '<path d="M 26 18 L 54 -2 L 68 12 L 40 32 Z"/>',
      '<ellipse cx="62" cy="2" rx="15" ry="11" transform="rotate(26 62 2)"/>',
      '<path d="M 60 -8 L 58 -32 L 68 -14 Z"/>',
      '<path d="M 66 -8 L 80 -26 L 78 -8 Z"/>',
      '<path d="M 74 6 C 90 2 98 -8 100 -20 M 74 12 C 88 16 96 24 96 34" stroke="' + INK + '" stroke-width="2.2" fill="none"/>',
      '<path d="M 40 24 L 48 40 L 52 30 Z M 16 36 L 22 50 L 28 40 Z"/>'
    ].join('');
  }

  function ape() {
    return [
      '<ellipse cx="0" cy="-8" rx="34" ry="24"/>',
      '<path d="M -28 6 C -34 30 -18 44 -4 44 L 14 44 C 28 42 34 28 28 4 Z"/>',
      '<circle cx="26" cy="-32" r="14"/>',
      '<path d="M 34 -38 L 48 -32 L 34 -26 Z"/>',
      '<path d="M -30 -8 C -52 12 -54 38 -46 52 L -34 52 C -40 32 -34 16 -18 0 Z"/>',
      '<path d="M 28 -4 C 46 16 48 38 42 52 L 30 52 C 36 34 32 18 18 2 Z"/>',
      '<path d="M -18 40 L -20 56 L -10 56 L -8 40 Z"/>',
      '<path d="M 10 40 L 12 56 L 22 56 L 20 40 Z"/>',
      '<path d="M -34 2 C -54 -4 -66 -16 -64 -30 C -56 -14 -46 -8 -30 -8 Z"/>',
      '<path d="M -36 -20 C -46 -34 -60 -38 -70 -34 C -58 -28 -48 -20 -40 -10 Z" opacity=".8"/>'
    ].join('');
  }

  function insect() {
    return [
      '<ellipse cx="22" cy="2" rx="18" ry="20"/>',
      '<circle cx="-4" cy="4" r="14"/>',
      '<circle cx="-26" cy="6" r="9"/>',
      '<path d="M 36 8 L 56 24 L 48 2 Z"/>',
      '<path d="M 22 -18 C 2 -56 -28 -62 -46 -50 C -24 -46 -8 -32 8 -6 Z" opacity=".5"/>',
      '<path d="M 26 -16 C 38 -48 62 -56 76 -46 C 56 -40 42 -28 34 -4 Z" opacity=".5"/>',
      '<path d="M -32 -2 C -46 -16 -58 -16 -66 -8 M -32 8 C -48 18 -58 26 -62 34" stroke="' + INK + '" stroke-width="2.2" fill="none"/>',
      '<path d="M -4 -8 C -12 -28 -26 -34 -34 -32 M -4 12 C -14 28 -24 34 -34 34 M 16 -16 C 10 -36 2 -42 -6 -42 M 16 18 C 12 36 4 44 -6 44" stroke="' + INK + '" stroke-width="2" fill="none"/>'
    ].join('');
  }

  function turtle() {
    return [
      '<path d="M -44 20 C -48 -14 -24 -34 2 -34 C 30 -34 50 -12 46 18 C 20 30 -20 30 -44 20 Z"/>',
      '<path d="M -46 22 C -60 24 -66 32 -62 40 L -36 34 Z"/>',
      '<ellipse cx="52" cy="12" rx="15" ry="10"/>',
      '<path d="M 62 8 L 72 12 L 62 18 Z"/>',
      '<path d="M -36 30 L -44 44 L -32 44 L -26 30 Z M 14 32 L 10 46 L 22 46 L 24 32 Z"/>',
      '<path d="M -14 -30 C -8 -46 8 -48 14 -32" fill="none" stroke="' + INK + '" stroke-width="5"/>',
      '<path d="M -22 4 L -6 -14 L 12 4 L -2 20 Z" fill="#0d1418" opacity=".6"/>'
    ].join('');
  }

  function mask() {
    return [
      '<path d="M -34 22 C -44 -10 -26 -40 0 -46 C 28 -40 46 -10 34 22 C 26 46 -28 46 -34 22 Z"/>',
      '<path d="M -30 -34 C -46 -50 -52 -66 -44 -76 C -34 -62 -24 -52 -16 -46 Z"/>',
      '<path d="M 30 -34 C 46 -50 52 -66 44 -76 C 34 -62 24 -52 16 -46 Z"/>',
      '<path d="M -32 6 L -16 12 L -30 20 Z M 32 6 L 16 12 L 30 20 Z"/>',
      '<path d="M -16 28 Q0 38 16 28 Q8 44 0 44 Q-8 44 -16 28 Z"/>',
      '<path d="M -10 26 L -12 38 L -6 30 Z M 10 26 L 12 38 L 6 30 Z"/>',
      '<path d="M -44 26 C -62 34 -68 50 -64 62 M 44 26 C 62 34 68 50 64 62" stroke="' + INK + '" stroke-width="4" fill="none"/>'
    ].join('');
  }

  function horse() {
    const cfg = { w: 46, h: 19, legLen: 50, headX: 70, headY: -44, headR: 13, snout: 16, ear: 'point', tail: 'horse', mane: true };
    return quad(cfg);
  }

  /* ---------------- 原型选择 ---------------- */
  const RULES = [
    ['fox', ['狐']],
    ['feline', ['狰', '狻猊', '白虎', '穷奇', '陆吾', '虎', '豹', '狮', '猊']],
    ['canine', ['天狗', '狡', '谿边', '地狼', '祸斗', '狗', '狼', '狐']],
    ['deer', ['鹿', '蜀', '訑', '麟', '麋']],
    ['bovine', ['诸怀', '犀', '牛', '兕', '渠']],
    ['boar', ['彘', '合窳', '狸力']],
    ['horse', ['英招', '天马']],
    ['turtle', ['玄武', '赑屃', '龟']],
    ['bird', ['雕', '鴸', '毕方', '朱雀', '鸟', '凤', '雨师', '蓐收', '帝江', '扶桑', '离朱']],
    ['fish', ['鱬', '鲛', '河伯', '蜃', '鱼']],
    ['serpent', ['龙', '蛇', '九婴', '相柳', '共工', '冰夷', '天吴', '烛九阴']],
    ['ape', ['举父', '朱厌', '长右']],
    ['mask', ['神', '灵', '伯', '土蝼', '石敢当', '木客', '栀', '后土', '祝融', '蠪', '狍鸮', '饕餮', '句芒', '玄冥', '英招使', '使']]
  ];

  function archetype(def) {
    const name = def.name || '';
    for (let i = 0; i < RULES.length; i++) {
      if (RULES[i][1].some((w) => name.indexOf(w) >= 0)) return RULES[i][0];
    }
    // 按属性兜底，让不同属性的杂兽也有差异
    const fb = { '金': 'feline', '木': 'deer', '水': 'serpent', '火': 'canine', '土': 'bovine', '无': 'mask' };
    return fb[def.element] || 'feline';
  }

  function creatureBody(def) {
    const arch = archetype(def);
    let body = '';
    let eye = [66, -40];
    switch (arch) {
      case 'bird': body = bird(); eye = [45, -28]; break;
      case 'fish': body = fish(); eye = [26, -8]; break;
      case 'serpent': body = serpent(); eye = [64, -2]; break;
      case 'ape': body = ape(); eye = [31, -34]; break;
      case 'insect': body = insect(); eye = [12, -4]; break;
      case 'turtle': body = turtle(); eye = [55, 10]; break;
      case 'mask': body = mask(); eye = [-18, 4]; break;
      case 'horse': body = horse(); eye = [74, -46]; break;
      case 'fox':
        body = quad({
          w: 42, h: 18, legLen: 40, headX: 62, headY: -36, headR: 13, snout: 13,
          tail: 'nine', tails: 9, ear: 'point'
        });
        eye = [66, -38];
        break;
      case 'feline':
        body = quad({ w: 45, h: 18, legLen: 40, headX: 64, headY: -38, headR: 14, snout: 13, tail: 'long', ear: 'point', mane: false });
        eye = [69, -40];
        break;
      case 'canine':
        body = quad({ w: 41, h: 20, legLen: 38, headX: 62, headY: -36, headR: 14, snout: 18, tail: 'bushy', ear: 'point' });
        eye = [67, -38];
        break;
      case 'deer':
        body = quad({ w: 39, h: 17, legLen: 50, headX: 62, headY: -42, headR: 12, snout: 13, tail: 'short', ear: 'antler' });
        eye = [66, -44];
        break;
      case 'bovine':
        body = quad({ w: 49, h: 25, legLen: 32, headX: 64, headY: -40, headR: 16, snout: 15, tail: 'thin', ear: 'horn', mane: false });
        eye = [69, -42];
        break;
      case 'boar':
        body = quad({ w: 47, h: 24, legLen: 30, headX: 62, headY: -36, headR: 15, snout: 18, tail: 'short', ear: 'point', spikes: true, tusk: true });
        eye = [67, -38];
        break;
      default:
        body = quad({});
    }
    return { arch: arch, body: body, eye: eye };
  }

  function drawCreature(def, r, color) {
    const parts = creatureBody(def);
    const arch = parts.arch;
    const body = parts.body;
    const eye = parts.eye;

    const s = 0.94 + r.next() * 0.12;
    const rot = r.range(-5, 2);
    const tx = 118;
    const ty = 78;
    const shadow = '<ellipse cx="' + tx + '" cy="' + (ty + 62) + '" rx="' + (arch === 'bird' ? 34 : 56) +
      '" ry="6" fill="#000" opacity=".38"/>';

    let out = '';
    // 墨圈（圆相）与背景墨晕
    out += '<g opacity=".16" fill="none" stroke="' + color + '">' +
      '<circle cx="118" cy="76" r="55" stroke-width="6" stroke-linecap="round" stroke-dasharray="292 54" transform="rotate(-38 118 76)"/>' +
      '<circle cx="118" cy="76" r="64" stroke-width="1" stroke-dasharray="2 8" opacity=".7"/>' +
      '</g>';
    out += '<g fill="' + color + '" opacity=".07">' +
      '<ellipse cx="104" cy="96" rx="78" ry="30"/><ellipse cx="150" cy="46" rx="34" ry="18"/></g>';
    out += shadow;
    out += '<g transform="translate(' + tx + ' ' + ty + ') rotate(' + rot + ') scale(' + s + ')" opacity=".8">' +
      '<g transform="translate(-2.4 -2.6)" fill="' + color + '" opacity=".58">' + body + '</g></g>';
    out += '<g transform="translate(' + tx + ' ' + ty + ') rotate(' + rot + ') scale(' + s + ')" fill="' + INK + '" filter="url(#rough)">' + body + '</g>';
    out += '<g transform="translate(' + tx + ' ' + ty + ') rotate(' + rot + ') scale(' + s + ')">' +
      '<circle cx="' + eye[0] + '" cy="' + eye[1] + '" r="2.2" fill="' + color + '"/>' +
      '<circle cx="' + eye[0] + '" cy="' + eye[1] + '" r=".9" fill="#fff" opacity=".85"/>' +
      '</g>';
    return out;
  }

  function splatter(r, n, color, spread) {
    let out = '<g fill="' + color + '">';
    for (let i = 0; i < n; i++) {
      const x = (r.next() - 0.5) * spread;
      const y = (r.next() - 0.5) * spread * 0.55 - 4;
      const rad = r.next() < 0.14 ? r.range(1.8, 3.4) : r.range(0.4, 1.5);
      out += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(rad) + '" opacity="' + f(r.range(12, 42)) / 100 + '"/>';
    }
    return out + '</g>';
  }

  function motif(elem, r) {
    const c = col(elem);
    switch (elem) {
      case '金': {
        let s = '<g stroke="' + c + '" stroke-opacity=".16" stroke-width="1">';
        for (let i = 0; i < 4; i++) {
          const x = -40 + i * 70 + r.range(-10, 10);
          s += '<path d="M ' + f(x) + ' 150 L ' + f(x + 40) + ' 40"/>';
        }
        s += '</g><g fill="' + c + '" opacity=".12"><circle cx="46" cy="44" r="2"/><circle cx="196" cy="34" r="1.6"/></g>';
        return s;
      }
      case '木': {
        return '<g stroke="' + c + '" stroke-opacity=".16" fill="none" stroke-width="1.3">' +
          '<path d="M 22 150 C 22 108 6 90 12 60 C 16 42 30 30 28 14"/>' +
          '<path d="M 12 60 C -2 50 -6 36 -2 26 M 18 86 C 36 80 44 66 42 54"/></g>' +
          '<g fill="' + c + '" opacity=".12">' +
          '<path d="M 12 58 C 2 54 -2 44 0 36 C 10 40 14 48 12 58 Z"/>' +
          '<path d="M 20 84 C 30 78 40 80 44 86 C 34 92 26 90 20 84 Z"/></g>';
      }
      case '水': {
        let s = '<g stroke="' + c + '" stroke-opacity=".18" fill="none" stroke-width="1.2">';
        for (let i = 0; i < 3; i++) {
          const y = 112 + i * 15;
          s += '<path d="M -20 ' + y + ' Q 10 ' + (y - 7) + ' 40 ' + y + ' T 100 ' + y + ' T 160 ' + y + ' T 220 ' + y + ' T 280 ' + y + '"/>';
        }
        s += '</g>';
        return s;
      }
      case '火': {
        return '<g fill="' + c + '" opacity=".14">' +
          '<path d="M 196 150 C 182 126 192 108 206 92 C 204 112 216 116 214 130 C 224 122 226 108 222 96 C 240 116 242 134 228 150 Z"/>' +
          '<path d="M 30 150 C 22 134 30 122 38 112 C 38 126 46 128 44 138 C 50 132 52 122 50 114 C 60 128 62 140 54 150 Z" opacity=".8"/></g>';
      }
      case '土': {
        return '<g fill="none" stroke="' + c + '" stroke-opacity=".16" stroke-width="1.2">' +
          '<path d="M -20 132 L 30 96 L 70 122 L 114 84 L 160 122 L 200 98 L 260 132"/>' +
          '<path d="M -20 144 L 30 120 L 74 140 L 120 116 L 164 140 L 208 120 L 260 142"/></g>';
      }
      default:
        return '<g fill="none" stroke="' + c + '" stroke-opacity=".12">' +
          '<circle cx="120" cy="74" r="46"/><circle cx="120" cy="74" r="62" stroke-dasharray="2 9"/></g>';
    }
  }

  /* ============================================================
   * 2. 术法 / 山泽 / 祭仪
   * ============================================================ */
  function talismanSvg(def, r, color) {
    const glyph = def.element;
    let out = '';
    out += '<g transform="translate(118 74) rotate(-7)">';
    out += '<rect x="-32" y="-54" width="64" height="108" rx="3" fill="#e3d8bf" opacity=".93"/>';
    out += '<rect x="-32" y="-54" width="64" height="108" rx="3" fill="none" stroke="' + color + '" stroke-opacity=".5"/>';
    out += '<path d="M -20 -38 H 20 M -20 -28 H 8 M -16 -8 H 16 M -16 2 H 4 M -20 24 H 20 M -20 34 H 2" stroke="#2b2a24" stroke-opacity=".5" stroke-width="2.2"/>';
    out += '<text x="0" y="18" text-anchor="middle" font-family="Songti SC, STSong, serif" font-size="32" fill="' + color + '" opacity=".95">' + glyph + '</text>';
    out += '<rect x="-28" y="38" width="17" height="17" fill="#a8402f" opacity=".92"/>';
    out += '<text x="-19.5" y="51" text-anchor="middle" font-family="Songti SC, serif" font-size="11" fill="#f1e5cd">令</text>';
    out += '</g>';
    out += '<g stroke="' + color + '" stroke-opacity=".25" fill="none">';
    out += '<circle cx="118" cy="74" r="66" stroke-dasharray="2 10"/><circle cx="118" cy="74" r="82" stroke-opacity=".12"/>';
    out += '</g>';
    out += splatter(r, 14, color, 200);
    return out;
  }

  function terrainSvg(def, r, color) {
    let out = '<g>';
    out += '<path d="M -20 132 L 40 74 L 76 106 L 118 54 L 168 112 L 210 82 L 270 132 Z" fill="' + INK2 + '"/>';
    out += '<path d="M -20 132 L 60 96 L 108 122 L 156 92 L 212 124 L 270 104 L 270 150 L -20 150 Z" fill="' + INK + '"/>';
    out += '<path d="M 40 74 L 76 106 L 118 54 L 168 112 L 210 82" fill="none" stroke="' + color + '" stroke-opacity=".32"/>';
    out += '</g>';
    out += '<circle cx="188" cy="40" r="14" fill="' + color + '" opacity=".3"/>';
    out += '<circle cx="188" cy="40" r="26" fill="none" stroke="' + color + '" stroke-opacity=".16"/>';
    out += '<text x="40" y="54" font-family="Songti SC, STSong, serif" font-size="30" fill="' + color + '" opacity=".24">' + def.element + '</text>';
    out += splatter(r, 10, color, 220);
    return out;
  }

  function ritualSvg(def, r, color) {
    let out = '';
    out += '<g transform="translate(120 98)"><path d="M -42 -14 C -44 12 -26 30 0 30 C 26 30 44 12 42 -14 Z" fill="' + INK + '"/>';
    out += '<path d="M -50 -18 H 50 L 44 -8 H -44 Z" fill="' + INK + '"/>';
    out += '<path d="M -34 30 L -40 52 M 34 30 L 40 52 M 0 32 L 0 54" stroke="' + INK + '" stroke-width="5"/>';
    out += '<path d="M -42 -8 C -56 -20 -50 -34 -40 -40 M 42 -8 C 56 -20 50 -34 40 -40" stroke="' + INK + '" stroke-width="4" fill="none"/>';
    out += '<path d="M -50 -18 C -54 -28 -44 -34 -36 -36 M 50 -18 C 54 -28 44 -34 36 -36" stroke="' + color + '" stroke-opacity=".4" stroke-width="1.6" fill="none"/></g>';
    out += '<g fill="' + color + '" opacity=".5"><path d="M 120 64 C 108 46 118 34 128 22 C 128 40 140 44 136 56 C 146 48 146 36 142 28 C 158 46 158 60 146 70 C 138 78 126 78 120 64 Z"/></g>';
    out += '<g stroke="' + color + '" stroke-opacity=".16" fill="none"><path d="M 96 30 C 88 14 100 4 94 -8"/><path d="M 144 24 C 152 10 142 0 150 -12"/></g>';
    out += splatter(r, 16, color, 210);
    return out;
  }

  /* ============================================================
   * 3. 卡面
   * ============================================================ */
  const CACHE = {};

  A.card = function (def, opts) {
    if (!def) return '';
    opts = opts || {};
    const key = def.id + '|' + (opts.face || 'tame');
    if (CACHE[key]) return CACHE[key];
    const r = SH.makeRng(SH.hashSeed('art|' + def.id + '|' + (opts.face || 'tame')));
    const elem = def.element || '无';
    const color = col(elem);
    const deep = col(elem, 'deep');
    const W = 240, H = 150;

    let inner = '';
    if (def.type === 'beast') inner += drawCreature(def, r, color);
    else if (def.type === 'terrain') inner += terrainSvg(def, r, color);
    else if (def.type === 'ritual') inner += ritualSvg(def, r, color);
    else inner += talismanSvg(def, r, color);

    const glyph = (def.name || '').slice(0, 1);
    const wm = '<text x="200" y="140" text-anchor="end" font-family="Songti SC, STSong, serif" ' +
      'font-size="96" fill="' + color + '" opacity=".065">' + esc(glyph) + '</text>';

    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '">' +
      '<defs>' +
        '<linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">' +
          '<stop offset="0" stop-color="' + deep + '" stop-opacity=".62"/>' +
          '<stop offset=".5" stop-color="#0e1317"/>' +
          '<stop offset="1" stop-color="#06080a"/>' +
        '</linearGradient>' +
        '<radialGradient id="glow" cx=".48" cy=".5" r=".55">' +
          '<stop offset="0" stop-color="' + color + '" stop-opacity=".34"/>' +
          '<stop offset=".55" stop-color="' + color + '" stop-opacity=".08"/>' +
          '<stop offset="1" stop-color="' + color + '" stop-opacity="0"/>' +
        '</radialGradient>' +
        '<radialGradient id="vig" cx=".5" cy=".45" r=".74">' +
          '<stop offset=".5" stop-color="#000" stop-opacity="0"/>' +
          '<stop offset="1" stop-color="#000" stop-opacity=".55"/>' +
        '</radialGradient>' +
        '<filter id="rough" x="-15%" y="-15%" width="130%" height="130%">' +
          '<feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="' + (r.int(90) + 1) + '" result="n"/>' +
          '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>' +
        '</filter>' +
      '</defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="#0a0d10"/>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#bg)"/>' +
      '<ellipse cx="118" cy="80" rx="112" ry="70" fill="url(#glow)"/>' +
      motif(elem, r) +
      wm +
      inner +
      (opts.face === 'feral' ?
        '<rect width="' + W + '" height="' + H + '" fill="#7a2a20" opacity=".16"/>' +
        '<rect width="' + W + '" height="' + H + '" fill="none" stroke="#b3453c" stroke-opacity=".28" stroke-width="3"/>' : '') +
      '<rect width="' + W + '" height="' + H + '" fill="url(#vig)"/>' +
      '</svg>';

    const uri = 'data:image/svg+xml,' + encodeURIComponent(svg);
    CACHE[key] = uri;
    return uri;
  };

  /* ============================================================
   * 3.1 图鉴图标：icon_card_[卡ID]
   *     兽为剪影，术法为符纸，山泽为山形，祭仪为鼎
   * ============================================================ */
  const ICON_CACHE = {};

  A.iconIdOf = function (def) {
    return def && def.id ? 'icon_card_' + def.id : '';
  };

  function spellIcon(def, color) {
    return '<g transform="translate(48 49) rotate(-5)">' +
      '<rect x="-19" y="-31" width="38" height="62" rx="2" fill="#e3d8bf" opacity=".94"/>' +
      '<rect x="-19" y="-31" width="38" height="62" rx="2" fill="none" stroke="' + color + '" stroke-opacity=".55"/>' +
      '<path d="M -12 -22 H 12 M -12 -15 H 4 M -12 20 H 12 M -12 25 H 2" stroke="#2b2a24" stroke-opacity=".42" stroke-width="2"/>' +
      '<text x="0" y="10" text-anchor="middle" font-family="Songti SC, STSong, serif" font-size="19" fill="' + color + '">' + esc(def.element) + '</text>' +
      '<rect x="-15" y="25" width="9" height="9" fill="#a8402f" opacity=".88"/>' +
      '</g>';
  }

  function terrainIcon(color, r) {
    const a = 26 + r.range(-4, 4), ah = 36 + r.range(-5, 5);
    const b = 44 + r.range(-3, 3), bh = 50 + r.range(-5, 4);
    const c = 60 + r.range(-4, 4), ch = 24 + r.range(-4, 5);
    const d = 77 + r.range(-3, 3), dh = 54 + r.range(-4, 4);
    return '<g>' +
      '<circle cx="' + (70 + r.range(-4, 4)) + '" cy="' + (26 + r.range(-3, 3)) + '" r="5.5" fill="' + color + '" opacity=".45"/>' +
      '<path d="M 7 70 L ' + a + ' ' + (70 - ah) + ' L ' + b + ' ' + (70 - bh) + ' L ' + c + ' ' + (70 - ch) +
        ' L ' + d + ' ' + (70 - dh) + ' L 89 ' + (44 + r.range(-3, 3)) + ' L 89 70 Z" fill="' + color + '" opacity=".16"/>' +
      '<path d="M 7 70 L ' + a + ' ' + (70 - ah) + ' L ' + b + ' ' + (70 - bh) + ' L ' + c + ' ' + (70 - ch) +
        ' L ' + d + ' ' + (70 - dh) + ' L 89 ' + (44 + r.range(-3, 3)) + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-opacity=".9"/>' +
      '<path d="M 7 76 H 89" stroke="' + color + '" stroke-width="1" stroke-opacity=".35"/>' +
      '</g>';
  }

  function ritualIcon(color, r) {
    const w = 23 + r.range(-2, 2);
    const flame = 12 + r.range(-2, 3);
    return '<path d="M 48 ' + flame + ' C 41 ' + (flame + 10) + ' 45 ' + (flame + 16) + ' 50 ' + (flame + 20) +
      ' C 51 ' + (flame + 12) + ' 55 ' + (flame + 10) + ' 54 ' + (flame + 4) + ' C 60 ' + (flame + 10) + ' 62 ' + (flame + 18) +
      ' 58 ' + (flame + 24) + ' C 55 ' + (flame + 28) + ' 50 ' + (flame + 29) + ' 47 ' + (flame + 24) +
      ' C 44 ' + (flame + 19) + ' 45 ' + (flame + 12) + ' 48 ' + (flame + 7) + ' Z" fill="' + color + '" opacity=".32"/>' +
      '<g transform="translate(48 52)">' +
      '<path d="M -' + w + ' -14 H ' + w + ' L ' + (w - 5) + ' 0 C ' + (w - 8) + ' 8 ' + (w - 14) + ' 12 0 12 C -' + (w - 14) + ' 12 -' + (w - 8) + ' 8 -' + (w - 5) + ' 0 Z" fill="' + color + '" fill-opacity=".9"/>' +
      '<path d="M -16 12 L -21 29 M 0 14 L 0 30 M 16 12 L 21 29" stroke="' + color + '" stroke-width="4" stroke-linecap="round" fill="none"/>' +
      '<path d="M -' + (w + 2) + ' -18 C -12 -23 12 -23 ' + (w + 2) + ' -18" fill="none" stroke="' + color + '" stroke-width="1.6" stroke-opacity=".55"/>' +
      '</g>';
  }

  A.cardIcon = function (def, opts) {
    if (!def) return '';
    opts = opts || {};
    const key = def.id + (opts.face || '');
    if (ICON_CACHE[key]) return ICON_CACHE[key];
    const r = SH.makeRng(SH.hashSeed('icon|' + def.id));
    const elem = def.element || '无';
    const color = col(elem);
    const deep = col(elem, 'deep');
    const tx = 48, ty = 52;
    const rot = r.range(-4, 2);
    let inner = '';

    if (def.type === 'beast') {
      const parts = creatureBody(def);
      const body = parts.body;
      const eye = parts.eye;
      inner = '<ellipse cx="' + tx + '" cy="' + (ty + 34) + '" rx="26" ry="3.4" fill="#000" opacity=".45"/>' +
        '<g transform="translate(' + tx + ' ' + ty + ') scale(.46) rotate(' + rot + ')" fill="#000" opacity=".55">' +
          '<g transform="translate(2 3)">' + body + '</g></g>' +
        '<g transform="translate(' + tx + ' ' + ty + ') scale(.46) rotate(' + rot + ')" fill="' + color + '" ' +
          'fill-opacity=".94" stroke="#080a0c" stroke-opacity=".5" stroke-width="1.6">' + body + '</g>' +
        '<g transform="translate(' + tx + ' ' + ty + ') scale(.46)">' +
          '<circle cx="' + eye[0] + '" cy="' + eye[1] + '" r="2.8" fill="#0a0d10"/>' +
          '<circle cx="' + eye[0] + '" cy="' + eye[1] + '" r="1" fill="#fff" opacity=".9"/>' +
        '</g>';
    } else if (def.type === 'terrain') {
      inner = terrainIcon(color, r);
    } else if (def.type === 'ritual') {
      inner = ritualIcon(color, r);
    } else {
      inner = spellIcon(def, color);
    }

    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">' +
      '<defs>' +
        '<linearGradient id="ibg" x1="0" y1="0" x2=".4" y2="1">' +
          '<stop offset="0" stop-color="' + deep + '" stop-opacity=".8"/>' +
          '<stop offset=".55" stop-color="#0d1215"/>' +
          '<stop offset="1" stop-color="#070a0c"/>' +
        '</linearGradient>' +
        '<radialGradient id="iglow" cx=".5" cy=".46" r=".55">' +
          '<stop offset="0" stop-color="' + color + '" stop-opacity=".26"/>' +
          '<stop offset="1" stop-color="' + color + '" stop-opacity="0"/>' +
        '</radialGradient>' +
      '</defs>' +
      '<rect width="96" height="96" fill="url(#ibg)"/>' +
      '<rect width="96" height="96" fill="url(#iglow)"/>' +
      '<g fill="none" stroke="' + color + '" opacity=".3">' +
        '<rect x="4.5" y="4.5" width="87" height="87" stroke-opacity=".45"/>' +
        '<circle cx="48" cy="48" r="40" stroke-dasharray="1.5 5" stroke-opacity=".4"/>' +
      '</g>' +
      inner +
      '<text x="8" y="18" font-family="Songti SC, STSong, serif" font-size="10" fill="' + color + '" opacity=".85">' + esc(elem) + '</text>' +
      '<rect x="82" y="82" width="7" height="7" fill="#a8402f" opacity=".75"/>' +
      '</svg>';

    const uri = 'data:image/svg+xml,' + encodeURIComponent(svg);
    ICON_CACHE[key] = uri;
    return uri;
  };

  /* ============================================================
   * 4. 图标
   * ============================================================ */
  const ICONS = {
    blade: '<path d="M5 19 L15 5 L19 3 L17 7 L8 18 Z" fill="currentColor" opacity=".9"/><path d="M4 20 L7 17" stroke="currentColor" stroke-width="2"/>',
    claw: '<path d="M4 4 L7 13 M9 3 L11 13 M14 4 L15 14 M19 6 L18 15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M3 17 Q11 21 19 17" stroke="currentColor" stroke-width="1.6" fill="none"/>',
    paw: '<circle cx="12" cy="15" r="4" fill="currentColor"/><circle cx="6" cy="9" r="2" fill="currentColor"/><circle cx="10" cy="6.5" r="2" fill="currentColor"/><circle cx="14" cy="6.5" r="2" fill="currentColor"/><circle cx="18" cy="9" r="2" fill="currentColor"/>',
    tripod: '<path d="M5 7 H19 L17 12 Q12 15 7 12 Z" fill="currentColor"/><path d="M7 12 L5 20 M12 14 L12 21 M17 12 L19 20" stroke="currentColor" stroke-width="1.8"/><path d="M4 6 Q12 2 20 6" stroke="currentColor" stroke-width="1.6" fill="none"/>',
    coin: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><rect x="9" y="9" width="6" height="6" fill="currentColor"/>',
    torii: '<path d="M3 6 Q12 2 21 6 L20 9 Q12 6 4 9 Z" fill="currentColor"/><rect x="5" y="9" width="2.4" height="12" fill="currentColor"/><rect x="16.6" y="9" width="2.4" height="12" fill="currentColor"/><rect x="7.5" y="12" width="9" height="1.8" fill="currentColor"/>',
    mask: '<path d="M12 3 C18 3 20 8 19 13 C18 18 16 21 12 21 C8 21 6 18 5 13 C4 8 6 3 12 3 Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10 L10.5 12 L8 13.5 M16 10 L13.5 12 L16 13.5" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M9 17 Q12 19 15 17" stroke="currentColor" stroke-width="1.4" fill="none"/>',
    crystal: '<path d="M12 2 L19 8 L16 20 L8 20 L5 8 Z" fill="currentColor" opacity=".22"/><path d="M12 2 L19 8 L16 20 L8 20 L5 8 Z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 2 L12 20 M5 8 L19 8" stroke="currentColor" stroke-width="1" opacity=".6"/>',
    heart: '<path d="M12 20 C6 15 3 11 3 8 C3 5 5 3 8 3 C10 3 11 4 12 6 C13 4 14 3 16 3 C19 3 21 5 21 8 C21 11 18 15 12 20 Z" fill="currentColor" opacity=".85"/>',
    deck: '<rect x="8" y="6" width="12" height="16" rx="1.4" fill="currentColor" opacity=".2"/><path d="M8 6 H20 V22 H8 Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 11 H17 M11 14 H17 M11 17 H15" stroke="currentColor" stroke-width="1.2"/><path d="M5 4 V19" stroke="currentColor" stroke-width="1.6"/>',
    scroll: '<path d="M6 3 H18 V21 H6 Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 7 H15 M9 10.5 H15 M9 14 H13" stroke="currentColor" stroke-width="1.3"/>',
    sun: '<circle cx="12" cy="12" r="4.4" fill="currentColor"/><path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M19.1 4.9 L17 7 M7 17 L4.9 19.1" stroke="currentColor" stroke-width="1.6"/>',
    moon: '<path d="M15 3 A9 9 0 1 0 21 16 A7.5 7.5 0 0 1 15 3 Z" fill="currentColor"/>',
    shield: '<path d="M12 3 L20 6 V12 C20 17 16 20 12 21 C8 20 4 17 4 12 V6 Z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9 12 L11.5 14.5 L15.5 9.5" stroke="currentColor" stroke-width="1.7" fill="none"/>',
    close: '<path d="M5 5 L19 19 M19 5 L5 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 11 V17" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="7.6" r="1.2" fill="currentColor"/>',
    skip: '<path d="M5 5 L13 12 L5 19 Z" fill="currentColor"/><path d="M16 5 V19" stroke="currentColor" stroke-width="2"/>',
    chevron: '<path d="M9 5 L16 12 L9 19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    seal: '<rect x="4" y="4" width="16" height="16" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7 V17 M8 10 H16 M8 14 H16" stroke="currentColor" stroke-width="1.3"/>',
    /* —— 山海经纹样图标组：首页入口、昼夜、相生共用 —— */
    compass: '<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="currentColor" stroke-width="1" opacity=".55" stroke-dasharray="1 2"/><path d="M12 3.4 V6 M12 18 V20.6 M3.4 12 H6 M18 12 H20.6" stroke="currentColor" stroke-width="1.2" opacity=".7"/><path d="M9 15 L13.4 13.4 L15 9 L10.6 10.6 Z" fill="currentColor" opacity=".85"/>',
    bamboo: '<path d="M6 4 V20 M12 3 V21 M18 4 V20" stroke="currentColor" stroke-width="1.5"/><path d="M6 8 H18 M6 14 H18" stroke="currentColor" stroke-width="1.1" opacity=".65"/><path d="M4.6 4 H7.4 M10.6 3 H13.4 M16.6 4 H19.4" stroke="currentColor" stroke-width="1.1"/>',
    codex: '<path d="M4 5 H10 C11 5 12 6 12 7 V20 C12 19 11 18 10 18 H4 Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M20 5 H14 C13 5 12 6 12 7 V20 C12 19 13 18 14 18 H20 Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M7 9 H10 M7 12 H10 M14 9 H17 M14 12 H17" stroke="currentColor" stroke-width="1" opacity=".6"/>',
    ding: '<path d="M5 8 H19 L17.4 13 C16.6 15.4 14.4 17 12 17 C9.6 17 7.4 15.4 6.6 13 Z" fill="currentColor" opacity=".22"/><path d="M5 8 H19 L17.4 13 C16.6 15.4 14.4 17 12 17 C9.6 17 7.4 15.4 6.6 13 Z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7.6 17 L6.2 21 M12 17 V21 M16.4 17 L17.8 21" stroke="currentColor" stroke-width="1.4"/><path d="M4 6.4 C8 4 16 4 20 6.4" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".7"/>',
    hexagram: '<path d="M4 6 H20 M4 10 H11 M14 10 H20 M4 14 H20 M4 18 H11 M14 18 H20" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>',
    taotie: '<path d="M4 9 C6 5 9 4 12 4 C15 4 18 5 20 9 C20 15 17 20 12 20 C7 20 4 15 4 9 Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6 10 C7 7 9 6 12 6" stroke="currentColor" stroke-width="1.1" opacity=".6"/><path d="M8 9.6 C9 8.4 10.6 8.4 11.5 9.6 C10.6 10.8 9 10.8 8 9.6 Z" fill="currentColor"/><path d="M16 9.6 C15 8.4 13.4 8.4 12.5 9.6 C13.4 10.8 15 10.8 16 9.6 Z" fill="currentColor"/><path d="M10 16 C11 17 13 17 14 16 M12 12 V15" stroke="currentColor" stroke-width="1.2" fill="none"/>',
    sunCrow: '<circle cx="12" cy="11.4" r="5" fill="currentColor" opacity=".22"/><circle cx="12" cy="11.4" r="5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M7.6 9.4 C9 6.6 15 6.6 16.4 9.4 C14.6 8.4 9.4 8.4 7.6 9.4 Z" fill="currentColor"/><path d="M12 7.2 V13.6 M10.2 10.4 L8.4 12.4 M13.8 10.4 L15.6 12.4" stroke="currentColor" stroke-width="1.1"/><path d="M9.4 16.2 L8.6 20 M12 16.6 V20.4 M14.6 16.2 L15.4 20" stroke="currentColor" stroke-width="1.2"/>',
    moonRabbit: '<path d="M15.6 3.2 C19 5 21 8.4 21 12 C21 17 17 21 12 21 C7 21 3 17 3 12 C3 7.4 6.4 3.6 10.8 3.1" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M9.4 9.4 C8.2 6.4 8.6 4.2 9.8 3.4 C10.8 5.4 10.8 7.6 10.4 9" fill="currentColor" opacity=".8"/><path d="M12.4 8.8 C12.2 5.8 13 3.8 14.2 3.4 C14.6 5.6 14.2 7.6 13.4 8.8" fill="currentColor" opacity=".65"/><circle cx="10.4" cy="13.6" r="3.2" fill="none" stroke="currentColor" stroke-width="1.2"/>',
    mountain: '<path d="M2 19 L8.4 7 L12.4 14.4 L15.6 9 L22 19 Z" fill="currentColor" opacity=".2"/><path d="M2 19 L8.4 7 L12.4 14.4 L15.6 9 L22 19" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4.6 19 H20.4" stroke="currentColor" stroke-width="1" opacity=".6"/>',
    chain: '<circle cx="9" cy="9" r="4.4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="15" cy="15" r="4.4" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    brush: '<path d="M15 3 L21 9 L12 18 L6 20 L8 14 Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M14 5 L19 10" stroke="currentColor" stroke-width="1" opacity=".6"/><path d="M6 20 L3 21 L4 18" fill="currentColor"/>',
    feather: '<path d="M20 4 C12 4 6 9 5 19 C15 18 20 12 20 4 Z" fill="currentColor" opacity=".18"/><path d="M20 4 C12 4 6 9 5 19 C15 18 20 12 20 4 Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M19 5 L6 18 M14 7 L12 12 M16 10 L12 10" stroke="currentColor" stroke-width=".9" opacity=".7"/>',
    flame: '<path d="M12 2 C14 7 18 9 18 14 C18 18 15 21 12 21 C9 21 6 18 6 14 C6 11 8 9.4 9.4 7.2 C9.8 9.4 10.6 10.4 11.6 10.9 C11 8 11 4.6 12 2 Z" fill="currentColor" opacity=".85"/>',
    drop: '<path d="M12 2.6 C15 7 19 10.6 19 14.2 C19 18.2 15.8 21 12 21 C8.2 21 5 18.2 5 14.2 C5 10.6 9 7 12 2.6 Z" fill="currentColor" opacity=".82"/>',
    star: '<path d="M12 2 L14 9 L21 12 L14 15 L12 22 L10 15 L3 12 L10 9 Z" fill="currentColor" opacity=".85"/>'
  };

  A.icon = function (name, size) {
    const body = ICONS[name] || '';
    const s = size || 16;
    return '<svg class="ico" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>';
  };

  A.nodeIcon = function (type, size) {
    const map = { battle: 'blade', elite: 'claw', event: 'paw', altar: 'tripod', shop: 'coin', shrine: 'torii', boss: 'mask' };
    return A.icon(map[type] || 'blade', size || 26);
  };

  A.elementGlyph = function (elem) {
    return '<span class="glyph" style="--e:' + col(elem) + '">' + esc(elem) + '</span>';
  };

  A.heroPortrait = function (hero) {
    const id = typeof hero === 'string' ? hero : hero.id;
    return BASE + 'assets/portraits/hero-' + id.toLowerCase() + '.svg';
  };

  // 资源绝对/相对路径：以 art.js 所在目录推导，保证 app/ 与 tools/ 下都能取到
  A.asset = function (p) {
    return BASE + String(p || '').replace(/^\//, '');
  };

  A.elemColor = function (elem) {
    return col(elem);
  };
})(typeof window !== 'undefined' ? window : globalThis);
