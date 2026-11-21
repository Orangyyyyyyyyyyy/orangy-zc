/* ==========================================================================
 * 美术资源层：加载 cardshop 素材、按“脚底对齐”绘制精灵、平铺地砖
 * 数据来源：demo/data/art.js（由 tools/bind_art.py 生成）
 * 渲染层只读这里，不反向修改游戏状态。
 * ========================================================================== */
(function (root) {
  'use strict';
  const CS = (root.CS = root.CS || {});

  const ART = CS.ART || { base: 'assets/art/', sprites: {}, bind: {} };
  const A = (CS.Assets = {
    art: ART,
    base: ART.base || 'assets/art/',
    images: {},
    failed: {},
    tintCache: {},
    loadedCount: 0,
    total: 0,
    complete: false
  });

  A.meta = function (key) {
    return ART.sprites && ART.sprites[key] ? ART.sprites[key] : null;
  };
  A.url = function (key) {
    const m = A.meta(key);
    return m ? A.base + m.file : '';
  };
  A.bind = function (path, dflt) {
    let cur = ART.bind || {};
    for (const part of String(path).split('.')) {
      if (cur == null || typeof cur !== 'object') return dflt;
      cur = cur[part];
    }
    return cur == null ? dflt : cur;
  };
  A.has = function (key) {
    const img = A.images[key];
    return !!(img && img.complete && img.naturalWidth > 0);
  };
  A.image = function (key) {
    return A.has(key) ? A.images[key] : null;
  };

  /* ------------------------------ 预加载 ------------------------------ */
  A.preload = function (keys, onProgress) {
    keys = keys || [];
    return new Promise((resolve) => {
      let done = 0;
      if (!keys.length) return resolve();
      const tick = () => {
        done++;
        if (onProgress) onProgress(done / keys.length, done, keys.length);
        if (done >= keys.length) resolve();
      };
      for (const key of keys) {
        if (A.images[key]) { tick(); continue; }
        const img = new Image();
        img.decoding = 'async';
        img.onload = tick;
        img.onerror = () => { A.failed[key] = true; tick(); };
        img.src = A.url(key);
        A.images[key] = img;
      }
      A.total = keys.length;
    });
  };

  A.preloadAll = function (onProgress) {
    const keys = Object.keys(ART.sprites || {});
    A.total = keys.length;
    return A.preload(keys, (p, d, t) => {
      A.loadedCount = d;
      if (onProgress) onProgress(p, d, t);
    }).then(() => { A.complete = true; return A; });
  };

  /* ------------------------------ 染色缓存 ------------------------------ */
  function tinted(key, color, alpha) {
    const cacheKey = key + '|' + color + '|' + alpha;
    if (A.tintCache[cacheKey]) return A.tintCache[cacheKey];
    const img = A.image(key);
    const m = A.meta(key);
    if (!img || !m) return null;
    const c = document.createElement('canvas');
    c.width = m.w;
    c.height = m.h;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, m.w, m.h);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = Math.max(0, Math.min(1, alpha == null ? 0.2 : alpha));
    g.fillStyle = color || '#ffffff';
    g.fillRect(0, 0, m.w, m.h);
    A.tintCache[cacheKey] = c;
    return c;
  }

  function pickImage(key, opts) {
    if (opts && opts.tint) {
      const t = tinted(key, opts.tint, opts.tintA);
      if (t) return t;
    }
    return A.image(key);
  }

  /* ------------------------------ 绘制 ------------------------------ */
  /**
   * 以“脚底中心”为锚点绘制精灵。
   * @param {string} key   art.js 中的 sprite key
   * @param {number} x,y   footprint 左上角（世界单位/格）
   * @param {number} w,h   footprint 宽高
   * @param {object} o     fit: contain|width|height, scale, alpha, flip, tint, tintA,
   *                       anchor: 'bottom'|'center'|'top', dx, dy, smooth, pad
   */
  A.draw = function (ctx, key, x, y, w, h, o) {
    o = o || {};
    const m = A.meta(key);
    if (!m) return false;
    const img = pickImage(key, o);
    if (!img) return false;
    const iw = m.w;
    const ih = m.h;
    const fit = o.fit || 'contain';
    let dw, dh;
    if (fit === 'width') {
      dw = w;
      dh = w * ih / iw;
    } else if (fit === 'height') {
      dh = h;
      dw = h * iw / ih;
    } else if (fit === 'stretch') {
      dw = w;
      dh = h;
    } else if (fit === 'cover') {
      const s = Math.max(w / iw, h / ih);
      dw = iw * s;
      dh = ih * s;
    } else {
      const s = Math.min(w / iw, h / ih);
      dw = iw * s;
      dh = ih * s;
    }
    const sc = o.scale == null ? 1 : o.scale;
    dw *= sc;
    dh *= sc;

    let cx = x + w / 2 + (o.dx || 0);
    let bottom = y + h + (o.dy || 0);
    if (o.anchor === 'center') bottom = y + h / 2 + dh / 2;
    else if (o.anchor === 'top') bottom = y + dh + (o.dy || 0);

    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    if (o.flip) {
      ctx.translate(cx, 0);
      ctx.scale(-1, 1);
      ctx.translate(-cx, 0);
    }
    ctx.imageSmoothingEnabled = o.smooth !== false;
    ctx.drawImage(img, 0, 0, iw, ih, cx - dw / 2, bottom - dh, dw, dh);
    ctx.restore();
    return true;
  };

  /** 把整张图铺进矩形（墙、招牌底板用）。 */
  A.fillRect = function (ctx, key, x, y, w, h, o) {
    o = o || {};
    const m = A.meta(key);
    const img = pickImage(key, o);
    if (!img || !m) return false;
    let sx = 0, sy = 0, sw = m.w, sh = m.h;
    if (o.fit === 'cover') {
      const target = w / h;
      const source = m.w / m.h;
      if (target > source) {
        sh = m.h;
        sw = Math.round(m.h * target);
      } else {
        sw = m.w;
        sh = Math.round(m.w / target);
      }
      sx = Math.round((m.w - sw) / 2);
      sy = Math.round((m.h - sh) / 2);
    }
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    if (o.flipX) {
      ctx.translate(x + w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, sw, sh, 0, y, w, h);
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    }
    ctx.restore();
    return true;
  };

  /** 一格地砖。tile 已做四向镜像，任意偏移都不会出现接缝。 */
  A.tile = function (ctx, key, x, y, size, o) {
    o = o || {};
    const m = A.meta(key);
    const img = A.image(key);
    if (!img || !m) return false;
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, m.w, m.h, x + (o.dx || 0), y + (o.dy || 0), size, size);
    ctx.restore();
    return true;
  };

  /** 给 HTML 用的缩略图地址 */
  A.img = function (key, cls, style) {
    const url = A.url(key);
    if (!url) return '';
    return '<img class="' + (cls || 'art-thumb') + '" src="' + url + '" style="' + (style || '') + '" alt="">';
  };
})(typeof window !== 'undefined' ? window : globalThis);
