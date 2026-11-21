/* ============================================================
 * 山海司·巡荒录  —  核心层 core.js
 * 职责：命名空间、工具函数、可复现随机源、本地存档
 * 约束：不依赖 DOM，可在 Node 环境下做无头测试
 * ============================================================ */
(function (root) {
  'use strict';
  const SH = (root.SH = root.SH || {});

  SH.VERSION = '0.7.0';
  SH.SAVE_VERSION = 2;      // 存档结构版本（P3 21.3）
  SH.SCHEMA_VERSION = 2;    // 内容表 schema 版本（P3 17.1）
  SH.CONTENT_VERSION = '1.1.0'; // 内容层版本（P3 17.1）
  SH.LOC_VERSION = 1;       // 本地化版本

  /* ---------------- 通用工具 ---------------- */
  let __seq = 0;
  const U = (SH.util = {
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    sum: (arr) => arr.reduce((a, b) => a + b, 0),
    uid(prefix) {
      __seq += 1;
      return (prefix || 'u') + '_' + __seq.toString(36);
    },
    setSeq(n) {
      __seq = Math.max(__seq, n | 0);
    },
    getSeq() {
      return __seq;
    },
    clone(o) {
      return JSON.parse(JSON.stringify(o));
    },
    esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    },
    flat(arr) {
      return arr.reduce((a, b) => a.concat(Array.isArray(b) ? U.flat(b) : b), []);
    },
    range(n) {
      const r = [];
      for (let i = 0; i < n; i++) r.push(i);
      return r;
    }
  });

  /* ---------------- 可复现随机源 ---------------- */
  // 哈希：字符串 → 32 位无符号种子
  SH.hashSeed = function (str) {
    let h = 2166136261 >>> 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    }
    return h >>> 0;
  };

  // mulberry32：状态可导出/恢复，保证回放一致（P3 19.1）
  SH.makeRng = function (seed) {
    let a = (seed >>> 0) || 1;
    const rng = {
      next() {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), 1 | t);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      int(n) {
        return Math.floor(rng.next() * n);
      },
      range(min, max) {
        return min + rng.int(max - min + 1);
      },
      chance(p) {
        return rng.next() < p;
      },
      pick(arr) {
        if (!arr.length) return null;
        return arr[rng.int(arr.length)];
      },
      shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = rng.int(i + 1);
          const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
      },
      // 加权抽取：[{v,w}] 或 [[value,weight]]
      weighted(entries) {
        const list = entries.map((e) => (Array.isArray(e) ? { v: e[0], w: e[1] } : e));
        const total = list.reduce((s, e) => s + Math.max(0, e.w || 0), 0);
        if (total <= 0) return list.length ? list[0].v : null;
        let r = rng.next() * total;
        for (const e of list) {
          r -= Math.max(0, e.w || 0);
          if (r <= 0) return e.v;
        }
        return list[list.length - 1].v;
      },
      state() { return a >>> 0; },
      setState(s) { a = (s >>> 0) || 1; }
    };
    return rng;
  };

  // 随机源分层：runSeed 派生子种子（P3 19.1）
  SH.subSeed = function (runSeed, tag, index) {
    return SH.hashSeed(String(runSeed) + '|' + tag + '|' + (index == null ? '' : index));
  };

  /* ---------------- 本地存档 ---------------- */
  SH.storage = {
    available() {
      try {
        return typeof localStorage !== 'undefined' && !!localStorage;
      } catch (e) {
        return false;
      }
    },
    read(key) {
      if (!SH.storage.available()) return null;
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    write(key, value) {
      if (!SH.storage.available()) return false;
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },
    remove(key) {
      if (!SH.storage.available()) return;
      try { localStorage.removeItem(key); } catch (e) {}
    }
  };

  SH.SAVE_KEY = 'shanhai.xunhuang.save.v1';
  SH.META_KEY = 'shanhai.xunhuang.meta.v1';

  SH.saveGame = function (state) {
    return SH.storage.write(SH.SAVE_KEY, {
      saveVersion: SH.SAVE_VERSION,
      schemaVersion: SH.SCHEMA_VERSION,
      contentVersion: SH.CONTENT_VERSION,
      locVersion: SH.LOC_VERSION,
      gameVersion: SH.VERSION,
      seq: U.getSeq(),
      savedAt: Date.now(),
      run: state.run,
      battle: state.battle
    });
  };

  SH.loadGame = function () {
    const data = SH.storage.read(SH.SAVE_KEY);
    if (!data) return null;
    if (data.saveVersion !== SH.SAVE_VERSION) {
      // 规则层变更：旧档不可继续（P3 21.3）
      return { incompatible: true, saveVersion: data.saveVersion };
    }
    U.setSeq(data.seq || 0);
    return data;
  };

  SH.clearSave = function () {
    SH.storage.remove(SH.SAVE_KEY);
  };

  SH.loadMeta = function () {
    return SH.storage.read(SH.META_KEY) || { runs: 0, wins: 0, bestVolume: 0, unlocked: [] };
  };
  SH.saveMeta = function (meta) {
    SH.storage.write(SH.META_KEY, meta);
  };

  /* ---------------- 简易断言（开发期） ---------------- */
  SH.assert = function (cond, msg) {
    if (!cond) {
      if (typeof console !== 'undefined') console.warn('[SH assert]', msg);
      return false;
    }
    return true;
  };
})(typeof window !== 'undefined' ? window : globalThis);
