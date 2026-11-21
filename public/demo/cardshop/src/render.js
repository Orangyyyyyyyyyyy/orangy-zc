/* ==========================================================================
 * 渲染层：俯视角像素风店铺、角色、设施、快递站
 * 只读取游戏状态，不修改（对应技术方案 §11）
 * 美术资源通过 CS.Assets 读取（data/art.js 由 tools/bind_art.py 生成）
 * ========================================================================== */
(function (root) {
  'use strict';
  const CS = (root.CS = root.CS || {});
  const C = CS.CONTENT;
  const I = CS.INDEX;
  const U = CS.Util;
  const A = CS.Assets;

  const R = CS.Render = {
    canvas: null, ctx: null, dpr: 1, w: 0, h: 0,
    cam: { x: 3, y: 3.3, scale: 64, zoom: 1, fit: 64 },
    time: 0,
    hover: null,
    ghost: null,     // {typeId, x, y, valid, facilityId?}
    hoverFacilityId: null,
    moveFacilityId: null,
    focusNpcId: null,
    focusUntil: 0,
    mode: 'play',    // play | build | move | movePick
    particles: []
  };

  /* 缩放：1 = 自适应全景基准；0.35 可俯瞰全店，3.5 可看细节 */
  R.ZOOM_MIN = 0.35;
  R.ZOOM_MAX = 3.5;
  R.setZoom = function (z) {
    const prev = R.cam.zoom || 1;
    R.cam.zoom = U.clamp(z, R.ZOOM_MIN, R.ZOOM_MAX);
    if (Math.abs(prev - R.cam.zoom) > 0.001) {
      /* 让缩放平滑过渡：目标值由 draw 内的插值逐步逼近 */
    }
    return R.cam.zoom;
  };
  R.zoomBy = function (factor) { return R.setZoom((R.cam.zoom || 1) * factor); };
  R.fitZoom = function () { R.cam.zoom = 1; return 1; };

  R.init = function (canvas) {
    R.canvas = canvas;
    R.ctx = canvas.getContext('2d');
    R.resize();
    window.addEventListener('resize', R.resize);
    /* #app 从 hidden 变为可见时窗口尺寸事件不一定触发，这里兜底观察一次 */
    if (typeof ResizeObserver !== 'undefined') {
      try {
        new ResizeObserver(() => R.resize()).observe(canvas);
      } catch (e) { /* 忽略 */ }
    }
  };

  R.resize = function () {
    if (!R.canvas) return;
    R.dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = R.canvas.getBoundingClientRect();
    R.w = rect.width;
    R.h = rect.height;
    R.canvas.width = Math.floor(rect.width * R.dpr);
    R.canvas.height = Math.floor(rect.height * R.dpr);
  };

  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  function rect(ctx, x, y, w, h, fill, stroke, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw || 0.02;
      ctx.strokeRect(x + (lw || 0.02) / 2, y + (lw || 0.02) / 2, w - (lw || 0.02), h - (lw || 0.02));
    }
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.025; ctx.stroke(); }
  }

  function label(ctx, text, x, y, size, color, align, weight) {
    ctx.font = (weight || 600) + ' ' + size + 'px "PingFang SC","Hiragino Sans GB",system-ui,sans-serif';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color || '#fff';
    ctx.fillText(text, x, y);
  }

  function caption(ctx, text, cx, y, color) {
    ctx.font = '600 0.17px "PingFang SC","Hiragino Sans GB",system-ui,sans-serif';
    const w = ctx.measureText(text).width + 0.2;
    roundRect(ctx, cx - w / 2, y - 0.115, w, 0.23, 0.07, 'rgba(8,12,19,0.58)');
    label(ctx, text, cx, y + 0.005, 0.17, color || 'rgba(235,242,252,0.92)');
  }

  function ellipseShadow(ctx, x, y, rx, ry, a) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx || 0.26, ry || 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,' + (a == null ? 0.24 : a) + ')';
    ctx.fill();
  }

  /* ------------------------------ 场景 ------------------------------ */
  R.draw = function (G, dt) {
    const ctx = R.ctx;
    if (!ctx) return;
    R.time += dt || 0;
    if (R.focusNpcId && R.focusUntil && Date.now() > R.focusUntil) R.focusNpcId = null;
    const player = G.player;
    const lay = C.layout;

    /* 自适应基准倍率：窗口越大，默认视野越宽 */
    const fit = U.clamp(Math.min(R.w / (lay.cols + 4.2), R.h / (lay.rows + 3.4)), 26, 150);
    R.cam.fit = fit;
    const targetScale = U.clamp(fit * (R.cam.zoom || 1), 8, 340);
    R.cam.scale += (targetScale - R.cam.scale) * Math.min(1, 0.12);

    /* 镜头目标：正常跟随玩家；缩到全景时对准店铺中心 */
    const wide = R.cam.scale < fit * 0.92;
    let tx = wide ? lay.cols / 2 : player.x;
    let ty = wide ? lay.rows / 2 : player.y - 1.0;
    /* 钳制到世界边界，避免缩小时镜头飘到空白区域 */
    const s = R.cam.scale;
    const halfW = R.w / (2 * s), halfH = R.h / (2 * s);
    const minX = -0.5 + halfW, maxX = lay.cols + 0.5 - halfW;
    const minY = -1.2 + halfH, maxY = lay.rows + (lay.outsideDepth || 2) - halfH;
    if (minX <= maxX) tx = U.clamp(tx, minX, maxX); else tx = lay.cols / 2;
    if (minY <= maxY) ty = U.clamp(ty, minY, maxY); else ty = (lay.rows + 0.5) / 2;
    R.cam.x += (tx - R.cam.x) * Math.min(1, wide ? 0.12 : 0.09);
    R.cam.y += (ty - R.cam.y) * Math.min(1, wide ? 0.12 : 0.09);

    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    ctx.clearRect(0, 0, R.w, R.h);
    /* 背景 */
    const bg = ctx.createRadialGradient(R.w / 2, R.h / 2, 80, R.w / 2, R.h / 2, Math.max(R.w, R.h));
    bg.addColorStop(0, '#141a26');
    bg.addColorStop(1, '#070a11');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, R.w, R.h);

    ctx.save();
    ctx.translate(R.w / 2, R.h / 2 + 26);
    ctx.scale(s, s);
    ctx.translate(-R.cam.x, -R.cam.y);

    R.drawOutside(G);
    R.drawFloor(G);
    R.drawWalls(G);
    R.drawDecor(G);
    if (R.expandMode) R.drawExpandHints(G);
    R.drawFacilities(G);
    R.drawStation(G);

    /* 实体按 y 排序 */
    const ents = [];
    for (const npc of G.npcs) if (npc.state !== 'GONE') ents.push({ kind: 'npc', e: npc, y: npc.y });
    for (const emp of G.employees) ents.push({ kind: 'emp', e: emp, y: emp.y });
    ents.push({ kind: 'player', e: player, y: player.y });
    ents.sort((a, b) => a.y - b.y);

    for (const it of ents) {
      if (it.kind === 'player') R.drawPlayer(G, it.e);
      else if (it.kind === 'emp') R.drawEmployee(G, it.e);
      else R.drawNpc(G, it.e);
    }

    R.drawInteraction(G);
    R.drawGhost(G);
    R.drawParticles(dt || 0);
    ctx.restore();
  };

  R.drawOutside = function (G) {
    const ctx = R.ctx;
    const lay = C.layout;
    const cols = lay.cols, rows = lay.rows, depth = lay.outsideDepth || 2;
    const door = lay.door;
    const station = lay.station;
    const sidewalk = A.bind('tiles.sidewalk');
    /* 人行道 / 装卸区地坪：地砖铺满 + 冷色压暗，和店内暖木地板区分 */
    if (sidewalk) {
      for (let x = 0; x < cols; x++) {
        for (let y = rows; y < rows + depth; y++) {
          A.tile(ctx, sidewalk, x, y, 1, { alpha: 0.9 });
          rect(ctx, x, y, 1, 1, 'rgba(14,20,32,0.60)');
        }
      }
    } else {
      rect(ctx, 0.2, rows + 0.18, cols - 0.4, depth - 0.14, '#232936');
    }
    rect(ctx, 0.2, rows + 0.18, cols - 0.4, 0.05, 'rgba(120,145,180,0.25)');
    rect(ctx, 0.2, rows + depth, cols - 0.4, 0.05, 'rgba(0,0,0,0.35)');
    /* 门口地垫 + 台阶 */
    roundRect(ctx, door.x - 0.55, rows + 0.18, door.w + 1.1, 0.16, 0.03, '#3c4a5e');
    rect(ctx, door.x - 0.65, rows + 0.02, door.w + 1.3, 0.06, '#5a6a80');
    /* 快递站台面：整块位于店外人行道，紧贴店墙下方，避免被底部工具栏遮住 */
    roundRect(ctx, station.x - 1.95, rows + 0.17, 3.9, 0.8, 0.08, 'rgba(92,158,230,0.10)', 'rgba(92,158,230,0.30)');
    /* 标牌放在台面左侧，右侧留给快递箱 */
    label(ctx, '快递站', station.x - 1.45, rows + 0.57, 0.16, '#9ec8ff');
    /* 门牌箭头 */
    label(ctx, '▼', door.x + door.w / 2, rows + 0.14, 0.2, 'rgba(245,185,66,0.65)');
  };

  R.drawFloor = function (G) {
    const ctx = R.ctx;
    const floor = A.bind('tiles.floor');
    const lay = C.layout;
    const done = {};
    /* 2×2 一铺，减少重复感；不足 2×2 再逐格补 */
    for (const k in G.cells) {
      if (done[k]) continue;
      const [x, y] = k.split(',').map(Number);
      const quad = [x + ',' + y, (x + 1) + ',' + y, x + ',' + (y + 1), (x + 1) + ',' + (y + 1)];
      if (floor && x % 2 === 0 && y % 2 === 0 && quad.every(q => G.cells[q])) {
        A.tile(ctx, floor, x, y, 2);
        const h = hash(x, y);
        ctx.globalAlpha = 0.10 + h * 0.05;
        rect(ctx, x, y, 2, 2, '#2b1a0c');
        ctx.globalAlpha = 1;
        quad.forEach(q => { done[q] = 1; });
        continue;
      }
      if (floor) {
        A.tile(ctx, floor, x, y, 1);
        const h = hash(x, y);
        ctx.globalAlpha = 0.10 + h * 0.05;
        rect(ctx, x, y, 1, 1, '#2b1a0c');
        ctx.globalAlpha = 1;
      } else {
        const h = hash(x, y);
        rect(ctx, x, y, 1, 1, h > 0.5 ? '#c8b08a' : '#c2a982');
      }
      done[k] = 1;
    }
    /* 室内暖光 */
    ctx.fillStyle = 'rgba(74, 44, 18, 0.10)';
    ctx.fillRect(0, 0, lay.cols, lay.rows);
    /* 房间四周压暗，聚焦店内 */
    const edge = ctx.createLinearGradient(0, 0, 0, lay.rows);
    edge.addColorStop(0, 'rgba(8,10,16,0.34)');
    edge.addColorStop(0.45, 'rgba(8,10,16,0)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, lay.cols, lay.rows);
  };

  R.drawSign = function (G) {
    const ctx = R.ctx;
    roundRect(ctx, 0.25, -0.86, 3.6, 0.46, 0.06, 'rgba(15,21,32,0.92)', 'rgba(245,185,66,0.35)');
    const back = A.bind('cards.back');
    if (back) A.draw(ctx, back, 0.34, -0.79, 0.34, 0.34, { fit: 'contain', anchor: 'center' });
    ctx.font = '700 0.26px "PingFang SC",sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f5b942';
    ctx.fillText(G.shopName, 0.74, -0.62);
    const open = G.clock.state === 'OPEN_DAY' || G.clock.state === 'OPEN_NIGHT';
    ctx.fillStyle = open ? '#6ee0a0' : '#64748b';
    ctx.font = '600 0.18px "PingFang SC",sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(open ? '营业中' : '准备中', 3.7, -0.62);
  };

  R.drawDecor = function (G) {
    const ctx = R.ctx;
    /* 门口地垫（跟随 layout.door） */
    const dl = C.layout.door;
    if (CS.Grid.isUnlocked(G, dl.x, dl.y) && CS.Grid.isUnlocked(G, dl.x + 1, dl.y)) {
      const cx = dl.x + dl.w / 2;
      roundRect(ctx, cx - 0.95, dl.y + 0.7, 1.9, 0.24, 0.03, 'rgba(120,80,40,0.35)');
      label(ctx, '欢迎光临', cx, dl.y + 0.82, 0.11, 'rgba(60,40,20,0.55)');
    }
    /* 中央地毯：卡牌店的试玩区（纯几何，避免贴图网格感） */
    if (CS.Grid.isUnlocked(G, 1, 2) && CS.Grid.isUnlocked(G, 3, 2) &&
        CS.Grid.isUnlocked(G, 1, 4) && CS.Grid.isUnlocked(G, 3, 4)) {
      const rx = 1.8, ry = 2.35, rw = 2.6, rh = 2.0;
      roundRect(ctx, rx + 0.03, ry + 0.05, rw, rh, 0.05, 'rgba(0,0,0,0.20)');
      roundRect(ctx, rx, ry, rw, rh, 0.05, '#5a2a24');
      roundRect(ctx, rx + 0.09, ry + 0.09, rw - 0.18, rh - 0.18, 0.04, '#6e352c');
      ctx.strokeStyle = 'rgba(232,186,98,0.38)';
      ctx.lineWidth = 0.03;
      ctx.strokeRect(rx + 0.2, ry + 0.2, rw - 0.4, rh - 0.4);
      ctx.strokeStyle = 'rgba(232,186,98,0.22)';
      ctx.lineWidth = 0.018;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(rx + 0.24 + i * (rw - 0.48) / 4, ry + 0.24);
        ctx.lineTo(rx + 0.24 + i * (rw - 0.48) / 4, ry + rh - 0.24);
        ctx.stroke();
      }
      /* 流苏 */
      for (let i = 0; i < 10; i++) {
        const fy = ry + 0.08 + i * (rh - 0.16) / 9;
        rect(ctx, rx - 0.07, fy, 0.07, 0.02, 'rgba(200,150,62,0.55)');
        rect(ctx, rx + rw, fy, 0.07, 0.02, 'rgba(200,150,62,0.55)');
      }
    }
    /* 门旁绿植 */
    const plant = A.bind('decor.plant');
    const px = C.layout.door.x + C.layout.door.w + 0.35;
    const py = C.layout.rows - 0.55;
    if (plant && CS.Grid.isUnlocked(G, Math.floor(px), Math.floor(py))) {
      A.draw(ctx, plant, px, py, 0.55, 0.65, { fit: 'height', scale: 0.9 });
    }
  };

  R.drawWalls = function (G) {
    const ctx = R.ctx;
    const th = 0.16;
    const wallTex = A.bind('tiles.wall');
    for (const k in G.cells) {
      const [x, y] = k.split(',').map(Number);
      const has = (dx, dy) => CS.Grid.isUnlocked(G, x + dx, y + dy);
      const isDoor = CS.Grid.isDoorCell(G, x, y);
      const band = (bx, by, bw, bh, vertical) => {
        rect(ctx, bx, by, bw, bh, '#2f211c');
        if (wallTex) {
          A.fillRect(ctx, wallTex, bx, by, bw, bh, { fit: vertical ? 'stretch' : 'cover', alpha: 0.92 });
          rect(ctx, bx, by, bw, bh, 'rgba(20,10,6,0.35)');
        }
        /* 顶面高光 */
        if (vertical) rect(ctx, bx, by, bw * 0.22, bh, 'rgba(255,225,190,0.10)');
        else rect(ctx, bx, by, bw, bh * 0.26, 'rgba(255,225,190,0.12)');
      };
      if (!has(0, -1)) band(x, y - th, 1, th, false);
      if (!has(0, 1)) {
        if (isDoor) {
          rect(ctx, x, y + 1, 1, th, '#6d5946');
          rect(ctx, x, y + 1, 1, 0.03, '#8a7358');
        } else {
          band(x, y + 1, 1, th, false);
        }
      }
      if (!has(-1, 0)) band(x - th, y, th, 1, true);
      if (!has(1, 0)) band(x + 1, y, th, 1, true);
    }
    /* 门外台阶 */
    const dl = C.layout.door;
    rect(ctx, dl.x - 0.65, C.layout.rows + 0.02, dl.w + 1.3, 0.05, '#5a6a80');
  };

  /* ------------------------------ 设施 ------------------------------ */
  function facilityShadow(ctx, f) {
    ctx.beginPath();
    ctx.ellipse(f.x + f.w / 2, f.y + f.h - 0.02, f.w * 0.42, Math.min(0.22, f.h * 0.16), 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fill();
  }

  function facilityLabel(ctx, f, text) {
    caption(ctx, text, f.x + f.w / 2, f.y + f.h + 0.14);
  }

  R.drawFacilities = function (G) {
    const ctx = R.ctx;
    const sorted = G.facilities.slice().sort((a, b) => (a.y + a.h) - (b.y + b.h));
    for (const f of sorted) {
      const def = I.facilities[f.typeId];
      const bind = A.bind('facilities.' + f.typeId);
      const selected = (R.mode === 'move' && R.moveFacilityId === f.id) ||
        (R.mode === 'movePick' && R.hoverFacilityId === f.id);
      ctx.save();
      if (R.mode === 'move' && selected) ctx.globalAlpha = 0.35;
      facilityShadow(ctx, f);
      const repeat = bind && bind.repeat ? Math.max(1, bind.repeat | 0) : 1;
      let drawn = false;
      if (bind) {
        for (let i = 0; i < repeat; i++) {
          const segW = f.w / repeat;
          drawn = A.draw(ctx, bind.sprite, f.x + i * segW, f.y, segW, f.h, {
            fit: bind.fit, scale: bind.scale, alpha: bind.alpha, dy: bind.dy
          }) || drawn;
        }
      }
      if (drawn) {
        /* 素材已画好，动态信息只留文字 */
      } else {
        drawFacilityFallback(ctx, f, def, G);
      }
      /* 动态信息 */
      if (def.kind === 'counter') {
        const q = CS.World.counterQueue(G, f).length;
        if (q) caption(ctx, '排队 ' + q, f.x + f.w / 2, f.y - 0.02, '#ffd479');
        facilityLabel(ctx, f, '收银台');
      } else if (def.kind === 'shelf') {
        const qty = Object.keys(f.stock).reduce((a, k) => a + (f.stock[k] || 0), 0);
        facilityLabel(ctx, f, def.name + ' · ' + qty);
      } else if (def.kind === 'warehouse') {
        const kinds = Object.keys(f.stock).filter(k => f.stock[k] > 0).length;
        facilityLabel(ctx, f, '仓库 · ' + kinds + ' 种');
      } else if (def.kind === 'cardtable') {
        const n = (f.cards || []).length;
        facilityLabel(ctx, f, '卡牌桌 · ' + n + '/' + (def.slots || 8));
        /* 桌上的卡背 */
        const back = A.bind('cards.back');
        if (back) {
          for (let i = 0; i < Math.min(4, n); i++) {
            const cx = f.x + 0.55 + (i % 2) * 1.05;
            const cy = f.y + 0.55 + Math.floor(i / 2) * 0.95;
            A.draw(ctx, back, cx, cy, 0.42, 0.6, { fit: 'contain', anchor: 'center', alpha: 0.95 });
          }
        }
      } else if (def.kind === 'display') {
        const kinds = Object.keys(f.stock).filter(k => f.stock[k] > 0).length;
        facilityLabel(ctx, f, '展示架 · ' + kinds);
      } else if (def.kind === 'gametable') {
        const used = Array.isArray(f.seats) ? f.seats.filter(Boolean).length : 0;
        facilityLabel(ctx, f, '游戏桌 · ' + used + '/' + (def.seats || 2));
      } else {
        facilityLabel(ctx, f, def.name);
      }
      if (selected) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#6ee0a0';
        ctx.lineWidth = 0.05;
        ctx.setLineDash([0.14, 0.1]);
        ctx.strokeRect(f.x - 0.02, f.y - 0.02, f.w + 0.04, f.h + 0.04);
        ctx.setLineDash([]);
      }
      /* 耐久警示 */
      if (f.durability < C.durability.failHint) {
        label(ctx, '!', f.x + f.w - 0.18, f.y + 0.2, 0.3, '#ff9f43');
      }
      ctx.restore();
    }
  };

  function drawFacilityFallback(ctx, f, def, G) {
    const x = f.x, y = f.y, w = f.w, h = f.h;
    if (def.kind === 'counter') {
      roundRect(ctx, x + 0.05, y + 0.05, w - 0.1, h - 0.1, 0.05, '#2f6f6a');
      roundRect(ctx, x + 0.1, y + 0.1, w - 0.2, h - 0.2, 0.05, '#3f8f87');
    } else if (def.kind === 'cardtable') {
      roundRect(ctx, x + 0.12, y + 0.12, w - 0.24, h - 0.24, 0.1, '#4b3a6e');
    } else if (def.kind === 'shelf') {
      roundRect(ctx, x + 0.06, y + 0.1, w - 0.12, h - 0.2, 0.06, '#7b4f2a');
    } else if (def.kind === 'warehouse') {
      roundRect(ctx, x + 0.06, y + 0.06, w - 0.12, h - 0.12, 0.05, '#3f4b5c');
    } else if (def.kind === 'display') {
      roundRect(ctx, x + 0.08, y + 0.08, w - 0.16, h - 0.16, 0.06, '#8a6a2f');
    } else {
      roundRect(ctx, x + 0.08, y + 0.08, w - 0.16, h - 0.16, 0.08, def.color);
    }
  }

  R.drawStation = function (G) {
    const ctx = R.ctx;
    const parcels = G.inventory.parcels;
    const parcelSprites = A.bind('chars.parcels', []);
    const st = C.layout.station;
    const rows = C.layout.rows;
    parcels.slice(0, 5).forEach((pc, i) => {
      const bx = st.x - 0.82 + (i % 5) * 0.52;
      const by = rows + 0.3;
      const sup = I.suppliers[pc.supplier];
      const sprite = parcelSprites.length ? parcelSprites[i % parcelSprites.length] : null;
      if (sprite) {
        A.draw(ctx, sprite, bx, by, 0.4, 0.4, { fit: 'contain' });
      } else {
        rect(ctx, bx + 0.02, by + 0.03, 0.36, 0.34, '#b98a54', '#7a5730', 0.02);
      }
      rect(ctx, bx + 0.02, by + 0.01, 0.36, 0.06, sup.color);
    });
    if (parcels.length > 5) label(ctx, '+' + (parcels.length - 5), st.x + 1.72, rows + 0.5, 0.16, '#ffd479');
    if (!parcels.length) label(ctx, '暂无待取快递', st.x + 0.35, rows + 0.57, 0.16, 'rgba(150,170,200,0.55)');
  };

  /* ------------------------------ 角色 ------------------------------ */
  function drawCharacter(ctx, sprite, x, y, o) {
    o = o || {};
    if (!sprite) return false;
    ellipseShadow(ctx, x, y + 0.36, 0.24, 0.09, 0.25);
    const bob = o.bob || 0;
    return A.draw(ctx, sprite, x - 0.5, y - 0.70 + bob, 1, 1.06, {
      fit: 'height',
      anchor: 'bottom',
      flip: o.flip,
      tint: o.tint,
      tintA: o.tintA,
      alpha: o.alpha
    });
  }

  R.drawPlayer = function (G) {
    const ctx = R.ctx;
    const p = G.player;
    const sprite = A.bind('chars.player');
    const moving = p.moving;
    const bob = moving ? Math.sin(R.time * 9) * 0.015 : 0;
    const flip = p.dir === 'left' ? true : (p.dir === 'right' ? false : false);
    if (drawCharacter(ctx, sprite, p.x, p.y, { flip, bob })) {
      /* 帽子/随身箱子由素材表现，这里只补充携带物 */
      if (p.carry) {
        const carry = A.bind('chars.carry');
        const sup = I.suppliers[p.carry.supplier];
        if (carry) A.draw(ctx, carry, p.x - 0.2, p.y - 0.12, 0.42, 0.42, { fit: 'contain' });
        rect(ctx, p.x - 0.2, p.y - 0.14, 0.42, 0.06, sup.color);
      }
      return;
    }
    drawBody(ctx, p.x, p.y, '#e0a33a', '#f3cba8', '#3a2a1e', p.dir, R.time * 2.2, 1.06);
    rect(ctx, p.x - 0.19, p.y - 0.44, 0.38, 0.09, '#b4762a');
    rect(ctx, p.x - 0.12, p.y - 0.5, 0.24, 0.08, '#c98a38');
    if (p.carry) {
      rect(ctx, p.x - 0.19, p.y - 0.02, 0.38, 0.32, '#c08a52', '#7a5730', 0.02);
      rect(ctx, p.x - 0.19, p.y - 0.02, 0.38, 0.07, I.suppliers[p.carry.supplier].color);
    }
  };

  R.drawEmployee = function (G, emp) {
    const ctx = R.ctx;
    const list = A.bind('chars.employees', []);
    const idx = Math.max(0, G.employees.indexOf(emp));
    const sprite = list.length ? list[idx % list.length] : null;
    const flip = emp.dir === 'left';
    const bob = emp.moving ? Math.sin(R.time * 9 + idx) * 0.014 : 0;
    if (!drawCharacter(ctx, sprite, emp.x, emp.y, { flip, bob })) {
      drawBody(ctx, emp.x, emp.y, '#4f8fd1', '#f0c9a6', '#241a12', emp.dir, R.time * 2, 1);
      rect(ctx, emp.x - 0.16, emp.y - 0.42, 0.32, 0.06, '#2f5f92');
    }
    const names = { restock: '补', cashier: '收', carry: '运', idle: '闲' };
    caption(ctx, names[emp.main] || '员', emp.x, emp.y - 0.96, '#9ec8ff');
    /* 士气条：低于警戒线变红，提示玩家去互动 */
    const si = C.staffInteract;
    const mood = CS.World.employeeMoodLabel ? CS.World.employeeMoodLabel(emp) : { text: '', color: '#6ee0a0' };
    const morale = emp.morale == null ? (si.moraleStart || 62) : emp.morale;
    const bw = 0.5, bx = emp.x - bw / 2, by = emp.y - 0.78;
    rect(ctx, bx, by, bw, 0.07, 'rgba(8,12,19,0.65)');
    rect(ctx, bx + 0.01, by + 0.01, (bw - 0.02) * U.clamp(morale / (si.moraleMax || 100), 0, 1), 0.05, mood.color);
    if (morale < (si.moraleLowLine || 35)) label(ctx, '!', emp.x + 0.26, emp.y - 0.7, 0.2, '#ef6f6c');
    /* 玩家靠近时提示可交谈 */
    if (U.dist(emp.x, emp.y, G.player.x, G.player.y) < 2.2) {
      ctx.font = '600 0.15px "PingFang SC",sans-serif';
      const w = ctx.measureText(emp.name).width + 0.18;
      roundRect(ctx, emp.x - w / 2, emp.y - 1.24, w, 0.24, 0.05, 'rgba(8,12,19,0.78)');
      label(ctx, emp.name, emp.x, emp.y - 1.12, 0.15, 'rgba(255,255,255,0.88)');
    }
    if (emp.carry) {
      const carry = A.bind('chars.carry');
      if (carry) A.draw(ctx, carry, emp.x - 0.18, emp.y - 0.1, 0.38, 0.38, { fit: 'contain' });
      else rect(ctx, emp.x - 0.18, emp.y - 0.02, 0.36, 0.3, '#c08a52', '#7a5730', 0.02);
    }
  };

  function drawBody(ctx, x, y, color, skin, hair, dir, phase, scale) {
    const sc = scale || 1;
    const bob = Math.sin(phase * 8) * 0.02 * sc;
    const legSwing = Math.sin(phase * 8) * 0.08 * sc;
    rect(ctx, x - 0.12 * sc, y + 0.16 + legSwing * 0.4, 0.1 * sc, 0.2 * sc, '#2f3b4d');
    rect(ctx, x + 0.02 * sc, y + 0.16 - legSwing * 0.4, 0.1 * sc, 0.2 * sc, '#2f3b4d');
    roundRect(ctx, x - 0.17 * sc, y - 0.14 * sc + bob, 0.34 * sc, 0.34 * sc, 0.08, color);
    ctx.beginPath();
    ctx.arc(x, y - 0.26 * sc + bob, 0.17 * sc, 0, Math.PI * 2);
    ctx.fillStyle = skin || '#f0c9a6';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - 0.31 * sc + bob, 0.175 * sc, Math.PI * 1.02, Math.PI * 2.0);
    ctx.fillStyle = hair || '#2b2118';
    ctx.fill();
    ctx.fillStyle = '#1e2430';
    if (dir === 'down' || dir === 'left' || dir === 'right') {
      const ox = dir === 'left' ? -0.04 : dir === 'right' ? 0.04 : 0;
      ctx.fillRect(x - 0.07 * sc + ox, y - 0.27 * sc + bob, 0.04 * sc, 0.045 * sc);
      ctx.fillRect(x + 0.03 * sc + ox, y - 0.27 * sc + bob, 0.04 * sc, 0.045 * sc);
    }
  }

  R.drawNpc = function (G, npc) {
    const ctx = R.ctx;
    const bind = A.bind('npc.' + npc.typeId);
    const sprite = bind ? bind.sprite : null;
    const flip = npc.dir === 'left';
    const bob = Math.sin(R.time * 8 + (parseInt(String(npc.id).slice(1), 10) || 0) % 7) * 0.012;
    if (!drawCharacter(ctx, sprite, npc.x, npc.y, {
      flip, bob, tint: bind && bind.tint, tintA: bind && bind.tintA
    })) {
      drawBody(ctx, npc.x, npc.y, npc.color, '#f0c9a6', '#2a1f16', npc.dir,
        R.time * 1.8 + (parseInt(String(npc.id).slice(1), 10) % 7 || 0), 1);
    }
    /* 特殊标识 */
    if (npc.special) {
      const icon = npc.special === 'reporter' ? 'TV' : npc.special === 'streamer' ? '●' : '★';
      label(ctx, icon, npc.x, npc.y - 0.72, 0.18, '#ffe08a');
    }
    /* 气泡 */
    if (G.options.showNpcBubbles === false) {
      /* 玩家关闭了场景气泡 */
    } else if (npc.state === 'QUEUE') {
      const bubble = npc.waited > 25 ? '…' : '¥';
      label(ctx, bubble, npc.x + 0.24, npc.y - 0.66, 0.22, npc.waited > 25 ? '#ef6f6c' : '#9ee6a0');
    } else if (npc.state === 'PLAYING') {
      label(ctx, '⚔', npc.x + 0.24, npc.y - 0.66, 0.2, '#9ee6a0');
    } else if (npc.offer) {
      label(ctx, '卡', npc.x + 0.24, npc.y - 0.66, 0.18, '#ffd479');
    } else if (npc.state === 'PITCH') {
      label(ctx, '!', npc.x + 0.24, npc.y - 0.66, 0.22, '#ffd479');
    }
    if (npc.talking) {
      label(ctx, '…', npc.x - 0.24, npc.y - 0.66, 0.2, 'rgba(235,242,252,0.8)');
    }
    /* 熟客标识：关系 ≥40 显示爱心，≥70 显示双心 */
    if (npc.relation >= 70) label(ctx, '♥♥', npc.x - 0.34, npc.y - 0.64, 0.13, '#ef8fb3');
    else if (npc.relation >= 40) label(ctx, '♥', npc.x - 0.26, npc.y - 0.64, 0.15, '#ef8fb3');
    /* 平板「顾客」页定位高亮 */
    if (R.focusNpcId === npc.id) {
      const pulse = 0.55 + Math.sin(R.time * 5) * 0.35;
      ctx.save();
      ctx.strokeStyle = 'rgba(245,185,66,' + pulse.toFixed(2) + ')';
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.ellipse(npc.x, npc.y + 0.02, 0.52, 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    /* 近处或定位时显示名字（头顶） */
    const named = U.dist(npc.x, npc.y, G.player.x, G.player.y) < 2.0 || R.focusNpcId === npc.id;
    if (named && npc.state !== 'LEAVE') {
      ctx.font = '600 0.15px "PingFang SC",sans-serif';
      const w = ctx.measureText(npc.name).width + 0.16;
      roundRect(ctx, npc.x - w / 2, npc.y - 0.98, w, 0.24, 0.05, 'rgba(8,12,19,0.72)');
      label(ctx, npc.name, npc.x, npc.y - 0.86, 0.15, 'rgba(255,255,255,0.85)');
    }
  };

  /* ------------------------------ 交互提示 ------------------------------ */
  R.drawInteraction = function (G) {
    const ctx = R.ctx;
    const it = CS.World.interaction(G);
    R.currentInteraction = it;
    if (!it) return;
    const f = it.facility;
    let x, y, w, h;
    if (f) { x = f.x; y = f.y; w = f.w; h = f.h; }
    else { x = it.extra.x - 0.5; y = it.extra.y - 0.5; w = 1; h = 1; }
    const pulse = 0.5 + Math.sin(R.time * 4) * 0.5;
    ctx.save();
    ctx.strokeStyle = 'rgba(245,185,66,' + (0.45 + pulse * 0.45) + ')';
    ctx.lineWidth = 0.035;
    ctx.strokeRect(x - 0.03, y - 0.03, w + 0.06, h + 0.06);
    const bx = x + w / 2, by = y - 0.42 - pulse * 0.04;
    ctx.beginPath();
    ctx.arc(bx, by, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#f5b942';
    ctx.fill();
    ctx.fillStyle = '#1a1207';
    ctx.font = '700 0.24px "PingFang SC",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('E', bx, by + 0.01);
    ctx.restore();
  };

  R.drawGhost = function (G) {
    if (!R.ghost || (R.mode !== 'build' && R.mode !== 'move')) return;
    const ctx = R.ctx;
    const def = I.facilities[R.ghost.typeId];
    const x = R.ghost.x, y = R.ghost.y;
    const bind = A.bind('facilities.' + R.ghost.typeId);
    ctx.save();
    if (bind) {
      ctx.globalAlpha = 0.55;
      A.draw(ctx, bind.sprite, x, y, def.w, def.h, { fit: bind.fit, scale: bind.scale });
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = 0.55;
      rect(ctx, x, y, def.w, def.h, R.ghost.valid ? 'rgba(110,220,160,0.55)' : 'rgba(239,111,108,0.55)');
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = R.ghost.valid ? '#6ee0a0' : '#ef6f6c';
    ctx.lineWidth = 0.04;
    ctx.strokeRect(x, y, def.w, def.h);
    ctx.restore();
  };

  R.drawExpandHints = function (G) {
    const ctx = R.ctx;
    const pulse = 0.45 + Math.sin(R.time * 3) * 0.25;
    const lay = C.layout;
    for (let y = -1; y < lay.rows + 4; y++) {
      for (let x = -1; x < lay.cols + 4; x++) {
        if (CS.Grid.isUnlocked(G, x, y)) continue;
        const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(d => CS.Grid.isUnlocked(G, x + d[0], y + d[1]));
        if (!adj) continue;
        ctx.globalAlpha = pulse;
        rect(ctx, x + 0.08, y + 0.08, 0.84, 0.84, 'rgba(245,185,66,0.35)');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(245,185,66,0.85)';
        ctx.lineWidth = 0.03;
        ctx.strokeRect(x + 0.08, y + 0.08, 0.84, 0.84);
      }
    }
  };

  R.pushParticle = function (x, y, text, color) {
    R.particles.push({ x, y, text, color: color || '#ffe08a', life: 1.2, max: 1.2 });
    if (text && /¥/.test(text)) R.pushFx(x + 0.28, y, A.bind('fx.coin'), 0.34);
  };

  R.pushFx = function (x, y, sprite, size, opts) {
    if (!sprite) return;
    R.particles.push({
      x, y, fx: sprite, size: size || 0.4, life: 0.9, max: 0.9,
      rise: (opts && opts.rise) != null ? opts.rise : 0.5
    });
  };

  R.drawParticles = function (dt) {
    const ctx = R.ctx;
    for (const p of R.particles) {
      p.life -= dt;
      p.y -= dt * (p.rise == null ? 0.7 : p.rise);
    }
    R.particles = R.particles.filter(p => p.life > 0);
    for (const p of R.particles) {
      const k = U.clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = k;
      if (p.fx) {
        const s = p.size * (0.75 + (1 - k) * 0.35);
        A.draw(ctx, p.fx, p.x - s / 2, p.y - s / 2, s, s, { fit: 'contain', anchor: 'center' });
      } else {
        label(ctx, p.text, p.x, p.y, 0.24, p.color, 'center', 700);
      }
      ctx.globalAlpha = 1;
    }
  };

  /* 屏幕坐标 → 世界坐标 */
  R.screenToWorld = function (sx, sy) {
    const s = R.cam.scale;
    return {
      x: (sx - R.w / 2) / s + R.cam.x,
      y: (sy - R.h / 2 - 26) / s + R.cam.y
    };
  };

  R.worldToScreen = function (wx, wy) {
    const s = R.cam.scale;
    return {
      x: (wx - R.cam.x) * s + R.w / 2,
      y: (wy - R.cam.y) * s + R.h / 2 + 26
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
