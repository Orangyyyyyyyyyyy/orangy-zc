/* global window, document, fetch, URL, AbortController */
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const els = {
    form: $("#crawlForm"),
    url: $("#urlInput"),
    urlWrap: $("#urlWrap"),
    urlError: $("#urlError"),
    formError: $("#formError"),
    pasteBtn: $("#pasteBtn"),
    startBtn: $("#startBtn"),
    startLabel: $("#startBtn .btn-label"),
    typeCards: $$(".type-card"),
    advancedToggle: $("#advancedToggle"),
    advancedPanel: $("#advancedPanel"),
    maxPages: $("#maxPages"),
    maxAssets: $("#maxAssets"),
    respectRobots: $("#respectRobots"),
    limitsNote: $("#limitsNote"),
    console: $("#console"),
    enginePill: $("#enginePill"),
    engineState: $("#engineState"),
    stage: $("#stage"),
    stageTitle: $("#stageTitle"),
    stageBadge: $("#stageBadge"),
    stageBadgeText: $("#stageBadgeText"),
    phaseLabel: $("#phaseLabel"),
    elapsedLabel: $("#elapsedLabel"),
    progressNumber: $("#progressNumber"),
    progressText: $("#progressText"),
    progressPhase: $("#progressPhase"),
    progressFill: $("#progressFill"),
    progressBar: $("#progressBar"),
    phaseSteps: $("#phaseSteps"),
    statPages: $("#statPages"),
    statImages: $("#statImages"),
    statVideos: $("#statVideos"),
    statBytes: $("#statBytes"),
    streamList: $("#streamList"),
    streamCount: $("#streamCount"),
    logList: $("#logList"),
    stopBtn: $("#stopBtn"),
    addNextBtn: $("#addNextBtn"),
    stageHint: $("#stageHint"),
    result: $("#result"),
    resultTitle: $("#resultTitle"),
    resultSub: $("#resultSub"),
    packageName: $("#packageName"),
    packagePath: $("#packagePath"),
    downloadBtn: $("#downloadBtn"),
    revealBtn: $("#revealBtn"),
    copyPathBtn: $("#copyPathBtn"),
    resultPages: $("#resultPages"),
    resultImages: $("#resultImages"),
    resultVideos: $("#resultVideos"),
    resultTextChars: $("#resultTextChars"),
    resultBytes: $("#resultBytes"),
    resultElapsed: $("#resultElapsed"),
    gallery: $("#gallery"),
    galleryCount: $("#galleryCount"),
    fileLists: $("#fileLists"),
    textPreview: $("#textPreview"),
    textPreviewBody: $("#textPreviewBody"),
    resultWarnings: $("#resultWarnings"),
    newTaskBtn: $("#newTaskBtn"),
    queueSection: $("#queueSection"),
    queueList: $("#queueList"),
    queueSummary: $("#queueSummary"),
    queueHint: $("#queueHint"),
    nextTaskBtn: $("#nextTaskBtn"),
    autoContinue: $("#autoContinue"),
    autoContinueBar: $("#autoContinueBar"),
    autoContinueText: $("#autoContinueText"),
    startNextNowBtn: $("#startNextNowBtn"),
    pauseAutoBtn: $("#pauseAutoBtn"),
    toastStack: $("#toastStack"),
    confettiCanvas: $("#confettiCanvas"),
    particleCanvas: $("#particleCanvas"),
  };

  const state = {
    taskId: null,
    viewTaskId: null,
    status: "idle",
    tasks: [],
    activeId: null,
    selectedResultId: null,
    queueSeq: 0,
    pollTimer: null,
    autoTimer: null,
    autoRemaining: 0,
    autoContinue: true,
    pollFailures: 0,
    lastLogSeq: 0,
    seenItems: new Set(),
    displayedProgress: 0,
    submitting: false,
    stopping: false,
    completing: false,
    packagePath: "",
    packageName: "",
  };

  /* ------------------------------------------------------------------ */
  /* Utilities                                                          */
  /* ------------------------------------------------------------------ */

  function formatBytes(value) {
    const bytes = Number(value) || 0;
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    const units = ["KB", "MB", "GB"];
    let size = bytes / 1024;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${size >= 10 ? size.toFixed(0) : size.toFixed(1)} ${units[unit]}`;
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Number(seconds) || 0);
    const mins = Math.floor(total / 60);
    const secs = Math.floor(total % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("zh-CN").format(Number(value) || 0);
  }

  function toast(message, type = "info", duration = 4200) {
    if (!message) return;
    const node = document.createElement("div");
    node.className = `toast${type === "error" ? " is-error" : ""}`;
    node.textContent = message;
    els.toastStack.appendChild(node);
    window.setTimeout(() => {
      node.classList.add("is-leaving");
      window.setTimeout(() => node.remove(), 320);
    }, duration);
  }

  function showFieldError(message) {
    els.urlError.textContent = message || "";
    if (message) {
      els.urlWrap.classList.add("is-invalid");
      els.url.setAttribute("aria-invalid", "true");
    } else {
      els.urlWrap.classList.remove("is-invalid");
      els.url.removeAttribute("aria-invalid");
    }
  }

  function clearFormError() {
    els.formError.textContent = "";
  }

  function setStartButton(label, mode = "normal") {
    els.startLabel.textContent = label;
    els.startBtn.classList.toggle("is-stop", mode === "stop");
    els.startBtn.disabled = mode === "disabled";
  }

  function normalizeUrl(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  }

  function validateForm() {
    clearFormError();
    showFieldError("");
    const normalized = normalizeUrl(els.url.value);
    if (!normalized) {
      showFieldError("请先粘贴一个网页链接。");
      els.url.focus();
      return null;
    }
    if (/\s/.test(normalized)) {
      showFieldError("链接中不能包含空格，请检查后重试。");
      els.url.focus();
      return null;
    }
    let parsed;
    try {
      parsed = new URL(normalized);
    } catch (error) {
      showFieldError("这个链接看起来不完整，请检查格式。");
      els.url.focus();
      return null;
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      showFieldError("只支持 http / https 网页链接。");
      els.url.focus();
      return null;
    }
    if (!parsed.hostname) {
      showFieldError("链接缺少有效域名。");
      els.url.focus();
      return null;
    }
    const types = $$('input[name="type"]:checked', els.form).map((input) => input.value);
    if (!types.length) {
      els.formError.textContent = "请至少勾选一种资源类型。";
      return null;
    }
    els.url.value = normalized;
    return {
      url: normalized,
      types,
      options: {
        max_pages: Number(els.maxPages.value) || 1,
        max_assets: Number(els.maxAssets.value) || 80,
        respect_robots: Boolean(els.respectRobots.checked),
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /* Task queue                                                         */
  /* ------------------------------------------------------------------ */

  const TYPE_LABELS = { image: "图片", text: "文字", video: "视频" };
  const STATUS_LABELS = {
    pending: "等待中",
    starting: "启动中",
    running: "抓取中",
    complete: "已完成",
    failed: "失败",
    cancelled: "已停止",
  };

  function activeItem() {
    return state.tasks.find((item) => item.localId === state.activeId) || null;
  }

  function pendingItems() {
    return state.tasks.filter((item) => item.status === "pending");
  }

  function itemByLocalId(localId) {
    return state.tasks.find((item) => item.localId === localId) || null;
  }

  function queueHost(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (error) {
      return url;
    }
  }

  function createQueueItem(payload) {
    state.queueSeq += 1;
    const random = Math.random().toString(36).slice(2, 8);
    return {
      localId: `q_${Date.now()}_${state.queueSeq}_${random}`,
      seq: state.queueSeq,
      url: payload.url,
      types: payload.types.slice(),
      options: { ...payload.options },
      status: "pending",
      taskId: null,
      addedAt: Date.now(),
      snapshot: null,
      error: null,
      finished: false,
    };
  }

  function updateStartButton() {
    if (state.submitting) {
      setStartButton("正在启动…", "disabled");
      return;
    }
    if (state.stopping) {
      setStartButton("正在停止…", "disabled");
      return;
    }
    if (state.tasks.length === 0) {
      setStartButton("开始拾取");
    } else {
      setStartButton("加入队列");
    }
  }

  function updateAutoText() {
    if (!els.autoContinueText) return;
    els.autoContinueText.textContent = `下一轮将在 ${Math.max(1, state.autoRemaining)} 秒后开始`;
  }

  function clearAutoNext() {
    if (state.autoTimer) {
      window.clearInterval(state.autoTimer);
      state.autoTimer = null;
    }
    state.autoRemaining = 0;
    if (els.autoContinueBar) els.autoContinueBar.hidden = true;
  }

  function scheduleAutoNext() {
    clearAutoNext();
    if (!state.autoContinue || state.activeId || !pendingItems().length) {
      renderQueue();
      return;
    }
    state.autoRemaining = 4;
    updateAutoText();
    els.autoContinueBar.hidden = false;
    state.autoTimer = window.setInterval(() => {
      if (!state.autoContinue || state.activeId) {
        clearAutoNext();
        renderQueue();
        return;
      }
      if (!pendingItems().length) {
        clearAutoNext();
        renderQueue();
        return;
      }
      state.autoRemaining -= 1;
      if (state.autoRemaining <= 0) {
        clearAutoNext();
        startNextPending();
        return;
      }
      updateAutoText();
    }, 1000);
  }

  function startNextPending() {
    if (state.activeId || state.submitting) return;
    const next = pendingItems()[0];
    if (!next) {
      renderQueue();
      return;
    }
    clearAutoNext();
    launchTask(next);
  }

  function removeQueueItem(localId) {
    const item = itemByLocalId(localId);
    if (!item) return;
    if (["starting", "running"].includes(item.status)) {
      toast("正在运行的任务不能从列表删除，请先停止任务。", "error");
      return;
    }
    state.tasks = state.tasks.filter((entry) => entry.localId !== localId);
    if (state.selectedResultId === localId) {
      state.selectedResultId = null;
      els.result.hidden = true;
    }
    clearAutoNext();
    renderQueue();
    updateStartButton();
    if (state.autoContinue && pendingItems().length && !state.activeId) {
      scheduleAutoNext();
    }
    toast("已从任务列表移除，磁盘上的归档文件不会被删除。");
  }

  function retryQueueItem(localId) {
    const item = itemByLocalId(localId);
    if (!item || !["failed", "cancelled"].includes(item.status)) return;
    item.status = "pending";
    item.error = null;
    item.snapshot = null;
    item.finished = false;
    item.taskId = null;
    renderQueue();
    if (!state.activeId && !state.submitting) {
      launchTask(item);
    } else {
      toast("已重新加入队列。");
    }
  }

  function showQueueResult(localId) {
    const item = itemByLocalId(localId);
    if (!item || !item.snapshot || item.status !== "complete") {
      toast("这个任务还没有可查看的结果。", "error");
      return;
    }
    state.selectedResultId = localId;
    clearAutoNext();
    renderResult(item.snapshot);
    els.result.hidden = false;
    els.result.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  function queueActionButton(label, action, localId, extraClass = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `queue-action ${extraClass}`.trim();
    button.dataset.queueAction = action;
    button.dataset.localId = localId;
    button.textContent = label;
    if (action === "remove") {
      button.title = "从列表移除（不删除磁盘文件）";
      button.setAttribute("aria-label", "从列表移除，不删除磁盘文件");
    } else if (action === "view") {
      button.title = "查看这个任务的归档结果";
    } else if (action === "retry") {
      button.title = "重新加入并开始这个任务";
    }
    return button;
  }

  function appendQueueMetrics(row, item) {
    const metrics = document.createElement("div");
    metrics.className = "queue-metrics";
    const primary = document.createElement("b");
    primary.dataset.field = "queue-primary";
    const secondary = document.createElement("span");
    secondary.dataset.field = "queue-secondary";

    const counts = item.snapshot ? item.snapshot.counts || {} : {};
    if (item.status === "running" || item.status === "starting") {
      const progress = Math.round((Number(item.snapshot?.progress) || 0) * 100);
      primary.className = "queue-progress";
      primary.textContent = `${progress}%`;
      secondary.textContent = `${counts.images || 0} 图 / ${counts.videos || 0} 视频`;
    } else if (item.status === "complete") {
      primary.textContent = `${counts.images || 0} 图 / ${counts.videos || 0} 视频`;
      secondary.textContent = `${counts.text_pages || 0} 文字 · ${formatBytes(counts.bytes || 0)}`;
    } else if (["failed", "cancelled"].includes(item.status)) {
      primary.textContent = "未完成";
      secondary.textContent = item.status === "cancelled" ? "已停止" : "可重试";
    } else {
      primary.textContent = "待开始";
      const position = pendingItems().findIndex((entry) => entry.localId === item.localId);
      secondary.textContent = position >= 0 ? `第 ${position + 1} 位` : "队列中";
    }
    metrics.append(primary, secondary);
    row.appendChild(metrics);
  }

  function renderQueue() {
    if (!els.queueSection || !els.queueList) return;
    if (!state.tasks.length) {
      els.queueSection.hidden = true;
      els.queueList.replaceChildren();
      return;
    }
    els.queueSection.hidden = false;

    const running = state.tasks.filter((item) => ["starting", "running"].includes(item.status)).length;
    const waiting = pendingItems().length;
    const completed = state.tasks.filter((item) => item.status === "complete").length;
    const summary = [`${state.tasks.length} 个任务`];
    if (running) summary.push(`${running} 个进行中`);
    if (waiting) summary.push(`${waiting} 个等待中`);
    if (completed) summary.push(`${completed} 个已完成`);
    els.queueSummary.textContent = summary.join(" · ");
    els.queueHint.textContent = state.activeId
      ? "当前任务进行中，可以继续添加下一轮；完成后队列会自动继续。"
      : waiting
        ? `有 ${waiting} 个任务等待开始，点击「开始下一轮」继续。`
        : "任务会按添加顺序依次执行。抓取过程中可以继续添加下一轮链接。";
    els.autoContinue.checked = state.autoContinue;
    els.nextTaskBtn.hidden = Boolean(state.activeId) || waiting === 0;

    els.queueList.replaceChildren();
    state.tasks.forEach((item, index) => {
      const row = document.createElement("article");
      row.className = "queue-item";
      row.dataset.localId = item.localId;
      if (["starting", "running"].includes(item.status)) row.classList.add("is-running");
      if (item.status === "complete") row.classList.add("is-complete");
      if (item.status === "cancelled") row.classList.add("is-interrupted");

      const number = document.createElement("span");
      number.className = "queue-index";
      number.textContent = String(index + 1).padStart(2, "0");
      row.appendChild(number);

      const main = document.createElement("div");
      main.className = "queue-main";
      const line = document.createElement("div");
      line.className = "queue-line";
      const status = document.createElement("span");
      const statusClass = ["running", "starting"].includes(item.status)
        ? "is-running"
        : item.status === "complete"
          ? "is-complete"
          : ["failed", "cancelled"].includes(item.status)
            ? "is-failed"
            : "is-pending";
      status.className = `queue-status ${statusClass}`;
      status.textContent = STATUS_LABELS[item.status] || item.status;
      const host = document.createElement("span");
      host.className = "queue-host";
      host.textContent = queueHost(item.url);
      line.append(status, host);
      main.appendChild(line);

      const url = document.createElement("p");
      url.className = "queue-url";
      if (["failed", "cancelled"].includes(item.status) && item.error) {
        url.classList.add("is-error");
        url.textContent = item.error;
      } else {
        url.textContent = item.url;
      }
      url.title = item.url;
      main.appendChild(url);

      const tags = document.createElement("div");
      tags.className = "queue-tags";
      item.types.forEach((type) => {
        const tag = document.createElement("span");
        tag.className = `queue-tag is-${type}`;
        tag.textContent = TYPE_LABELS[type] || type;
        tags.appendChild(tag);
      });
      main.appendChild(tags);
      row.appendChild(main);

      appendQueueMetrics(row, item);

      const actions = document.createElement("div");
      actions.className = "queue-actions";
      if (item.status === "complete") {
        if (item.taskId) {
          const download = document.createElement("a");
          download.className = "queue-action is-download";
          download.href = (item.snapshot?.result?.download_url) || `/api/tasks/${item.taskId}/download`;
          download.setAttribute("download", `${item.snapshot?.result?.package_name || "archive"}.zip`);
          download.textContent = "下载";
          actions.appendChild(download);
        }
        actions.appendChild(queueActionButton("查看", "view", item.localId));
        actions.appendChild(queueActionButton("×", "remove", item.localId, "queue-remove"));
      } else if (item.status === "running" || item.status === "starting") {
        actions.appendChild(queueActionButton("进度", "progress", item.localId));
      } else if (["failed", "cancelled"].includes(item.status)) {
        actions.appendChild(queueActionButton("重试", "retry", item.localId));
        actions.appendChild(queueActionButton("×", "remove", item.localId, "queue-remove"));
      } else {
        actions.appendChild(queueActionButton("×", "remove", item.localId, "queue-remove"));
      }
      row.appendChild(actions);
      els.queueList.appendChild(row);
    });
  }

  function updateQueueLive(task) {
    const item = activeItem();
    if (!item) return;
    const row = els.queueList?.querySelector(`[data-local-id="${item.localId}"]`);
    if (!row) return;
    const progress = row.querySelector('[data-field="queue-primary"]');
    const counts = row.querySelector('[data-field="queue-secondary"]');
    if (progress) {
      progress.textContent = `${Math.round((Number(task.progress) || 0) * 100)}%`;
    }
    if (counts) {
      const data = task.counts || {};
      counts.textContent = `${data.images || 0} 图 / ${data.videos || 0} 视频`;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Health                                                             */
  /* ------------------------------------------------------------------ */

  function applyLimits(limits) {
    if (!limits || !els.limitsNote) return;
    const format = (mb) => {
      if (mb === 0 || mb === null || mb === undefined) return "不限制";
      if (mb >= 1024) {
        const gb = mb / 1024;
        return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
      }
      return `${mb} MB`;
    };
    const image = format(limits.image_mb);
    const video = format(limits.video_mb);
    const total = format(limits.total_mb);
    els.limitsNote.textContent = `当前上限：图片 ${image} · 视频 ${video} · 单次归档 ${total}`;
    els.limitsNote.classList.toggle(
      "is-unlimited",
      Number(limits.video_mb) === 0 || Number(limits.total_mb) === 0
    );
  }

  async function checkEngine() {
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      if (!response.ok) throw new Error("offline");
      const data = await response.json();
      applyLimits(data.limits);
      els.engineState.textContent = "在线";
      els.enginePill.classList.remove("is-offline");
    } catch (error) {
      els.engineState.textContent = "离线";
      els.enginePill.classList.add("is-offline");
    }
  }

  /* ------------------------------------------------------------------ */
  /* Atmosphere canvas                                                  */
  /* ------------------------------------------------------------------ */

  function initParticles() {
    const canvas = els.particleCanvas;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let frame = 0;
    let running = true;
    const pointer = { x: -9999, y: -9999 };

    function reset() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(22, Math.min(72, Math.round((width * height) / 26000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 0.7 + Math.random() * 1.4,
        alpha: 0.12 + Math.random() * 0.28,
      }));
    }

    function draw() {
      if (!running) return;
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        if (!reducedMotion) {
          particle.x += particle.vx;
          particle.y += particle.vy;
          if (particle.x < -10) particle.x = width + 10;
          if (particle.x > width + 10) particle.x = -10;
          if (particle.y < -10) particle.y = height + 10;
          if (particle.y > height + 10) particle.y = -10;
        }

        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 130) {
          particle.x += (dx / (distance || 1)) * 0.35;
          particle.y += (dy / (distance || 1)) * 0.35;
        }

        context.beginPath();
        context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        context.fillStyle = `rgba(205, 245, 186, ${particle.alpha})`;
        context.fill();
      }

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 120) {
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.strokeStyle = `rgba(188, 233, 178, ${(1 - dist / 120) * 0.055})`;
            context.lineWidth = 0.7;
            context.stroke();
          }
        }
      }

      if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    }

    reset();
    draw();

    window.addEventListener("resize", () => {
      if (reducedMotion) return;
      reset();
    });

    window.addEventListener("pointermove", (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }, { passive: true });

    window.addEventListener("pointerleave", () => {
      pointer.x = -9999;
      pointer.y = -9999;
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        running = false;
        window.cancelAnimationFrame(frame);
      } else if (!reducedMotion) {
        running = true;
        draw();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Form interactions                                                  */
  /* ------------------------------------------------------------------ */

  function syncTypeCards() {
    els.typeCards.forEach((card) => {
      const input = $('input[type="checkbox"]', card);
      card.classList.toggle("is-active", Boolean(input && input.checked));
    });
  }

  function initForm() {
    els.typeCards.forEach((card) => {
      const input = $('input[type="checkbox"]', card);
      if (!input) return;
      input.addEventListener("change", () => {
        syncTypeCards();
        clearFormError();
      });
    });
    syncTypeCards();

    els.url.addEventListener("input", () => {
      showFieldError("");
      clearFormError();
    });

    els.advancedToggle.addEventListener("click", () => {
      const open = els.advancedToggle.getAttribute("aria-expanded") === "true";
      els.advancedToggle.setAttribute("aria-expanded", String(!open));
      els.advancedPanel.hidden = open;
    });

    els.pasteBtn.addEventListener("click", async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text || !text.trim()) {
          toast("剪贴板里没有可用的链接。");
          return;
        }
        els.url.value = text.trim();
        showFieldError("");
        els.url.focus();
        toast("已从剪贴板粘贴。");
      } catch (error) {
        toast("无法读取剪贴板，请使用 ⌘V / Ctrl+V 粘贴。", "error");
        els.url.focus();
      }
    });

    els.console.addEventListener("pointermove", (event) => {
      const rect = els.console.getBoundingClientRect();
      els.console.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
      els.console.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
    }, { passive: true });

    els.stopBtn.addEventListener("click", () => stopActiveTask());
    els.addNextBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      window.setTimeout(() => els.url.focus({ preventScroll: true }), 500);
    });

    els.form.addEventListener("submit", (event) => {
      event.preventDefault();
      enqueueTask();
    });

    els.autoContinue.addEventListener("change", () => {
      state.autoContinue = Boolean(els.autoContinue.checked);
      if (!state.autoContinue) {
        clearAutoNext();
      } else if (!state.activeId && pendingItems().length && state.selectedResultId) {
        scheduleAutoNext();
      }
      renderQueue();
    });

    els.nextTaskBtn.addEventListener("click", () => startNextPending());
    els.startNextNowBtn.addEventListener("click", () => startNextPending());
    els.pauseAutoBtn.addEventListener("click", () => {
      state.autoContinue = false;
      els.autoContinue.checked = false;
      clearAutoNext();
      renderQueue();
    });

    els.queueList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-queue-action]");
      if (!button) return;
      const localId = button.dataset.localId;
      const action = button.dataset.queueAction;
      if (action === "remove") {
        removeQueueItem(localId);
      } else if (action === "retry") {
        retryQueueItem(localId);
      } else if (action === "view") {
        showQueueResult(localId);
      } else if (action === "progress") {
        els.stage.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      }
    });

    els.newTaskBtn.addEventListener("click", () => {
      els.result.hidden = true;
      state.selectedResultId = null;
      clearAutoNext();
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      window.setTimeout(() => els.url.focus({ preventScroll: true }), 500);
    });

    els.copyPathBtn.addEventListener("click", async () => {
      if (!state.packagePath) return;
      try {
        await navigator.clipboard.writeText(state.packagePath);
        toast("归档路径已复制。");
      } catch (error) {
        toast("复制失败，请手动选择路径。", "error");
      }
    });

    els.revealBtn.addEventListener("click", async () => {
      if (!state.viewTaskId) return;
      els.revealBtn.disabled = true;
      try {
        const response = await fetch(`/api/tasks/${state.viewTaskId}/reveal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "打开失败");
        toast("已在 Finder 中定位归档文件夹。");
      } catch (error) {
        toast(error.message || "无法打开文件管理器。", "error");
      } finally {
        els.revealBtn.disabled = false;
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Task lifecycle                                                     */
  /* ------------------------------------------------------------------ */

  function enqueueTask() {
    const payload = validateForm();
    if (!payload) return;

    const item = createQueueItem(payload);
    state.tasks.push(item);
    els.url.value = "";
    showFieldError("");
    clearFormError();
    renderQueue();

    const olderWaiting = state.tasks.some(
      (entry) => entry.localId !== item.localId && entry.status === "pending"
    );
    if (!state.activeId && !state.submitting && !olderWaiting) {
      launchTask(item);
      return;
    }

    updateStartButton();
    const position = pendingItems().findIndex((entry) => entry.localId === item.localId) + 1;
    toast(position > 0 ? `已加入队列 · 第 ${position} 位` : "已加入队列，等待当前任务完成。");
    if (!state.activeId) {
      els.url.focus();
    }
  }

  async function launchTask(item) {
    if (!item || state.activeId || state.submitting) return;

    state.activeId = item.localId;
    state.selectedResultId = null;
    state.taskId = null;
    state.viewTaskId = null;
    state.status = "starting";
    state.submitting = true;
    state.stopping = false;
    state.completing = false;
    state.pollFailures = 0;
    item.status = "starting";
    item.error = null;
    item.snapshot = null;
    item.finished = false;

    clearAutoNext();
    clearPreviousStage();
    els.stage.hidden = false;
    els.result.hidden = true;
    setStartButton("正在启动…", "disabled");
    els.startBtn.disabled = true;
    els.stopBtn.disabled = true;
    renderQueue();
    window.setTimeout(() => {
      els.stage.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    }, 120);

    try {
      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: item.url, types: item.types, options: item.options }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "任务启动失败，请稍后重试。");
      }
      const task = data.task;
      state.submitting = false;
      state.status = "running";
      state.taskId = task.id;
      state.lastLogSeq = 0;
      state.seenItems = new Set();
      state.displayedProgress = 0;
      item.taskId = task.id;
      item.status = "running";
      item.snapshot = task;

      els.stopBtn.disabled = false;
      els.stopBtn.style.display = "";
      els.stopBtn.innerHTML = '<span class="stop-square" aria-hidden="true"></span>停止当前任务';
      updateStage(task);
      renderQueue();
      updateStartButton();
      schedulePoll(250);
      toast(`开始拾取 · ${queueHost(item.url)}`);
    } catch (error) {
      state.submitting = false;
      state.activeId = null;
      state.taskId = null;
      state.status = "failed";
      item.status = "failed";
      item.error = error.message || "任务启动失败。";
      item.finished = true;
      els.stopBtn.disabled = true;
      els.stopBtn.innerHTML = '<span class="stop-square" aria-hidden="true"></span>任务未启动';
      setStageBadge("error", "启动失败");
      els.stageTitle.textContent = "任务未能启动";
      els.phaseLabel.textContent = "未开始";
      els.progressPhase.textContent = "失败";
      els.stageHint.textContent = "可在队列中重试，或检查链接与网络后重新添加。";
      showStageNotice(item.error);
      renderQueue();
      updateStartButton();
      els.startBtn.disabled = false;
      toast(item.error, "error", 6000);
    }
  }

  function clearStream(message = "等待第一个资源…") {
    els.streamList.replaceChildren();
    const empty = document.createElement("p");
    empty.className = "stream-empty";
    empty.textContent = message;
    els.streamList.appendChild(empty);
    els.streamCount.textContent = "0 FILES";
    state.seenItems.clear();
  }

  function clearPreviousStage() {
    els.logList.replaceChildren();
    clearStream();
    els.statPages.textContent = "0";
    els.statImages.textContent = "0";
    els.statVideos.textContent = "0";
    els.statBytes.textContent = "0 B";
    els.progressFill.style.width = "0%";
    els.progressText.textContent = "0%";
    els.progressNumber.textContent = "0";
    els.phaseLabel.textContent = "正在建立连接";
    els.elapsedLabel.textContent = "00:00";
    els.progressPhase.textContent = "准备中";
    els.progressBar.setAttribute("aria-valuenow", "0");
    const notice = $("#stageNotice");
    if (notice) notice.remove();
    els.stageTitle.textContent = "正在扫描网页";
    setStageBadge("running", "运行中");
    setPhaseSteps(0);
    els.phaseSteps.classList.remove("is-stopped");
    els.stopBtn.innerHTML = '<span class="stop-square" aria-hidden="true"></span>停止任务';
  }

  function setStageBadge(kind, label) {
    els.stageBadge.className = "stage-status";
    if (kind === "done") els.stageBadge.classList.add("is-done");
    if (kind === "error") els.stageBadge.classList.add("is-error");
    if (kind === "stopped") els.stageBadge.classList.add("is-stopped");
    els.stageBadgeText.textContent = label;
  }

  function schedulePoll(delay) {
    window.clearTimeout(state.pollTimer);
    state.pollTimer = window.setTimeout(pollTask, delay);
  }

  async function pollTask() {
    const item = activeItem();
    if (!item || !item.taskId) return;
    const taskId = item.taskId;
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { cache: "no-store" });
      if (!response.ok) {
        if (response.status === 404) throw new Error("任务不存在或本地服务已重启。");
        throw new Error(`状态读取失败（${response.status}）`);
      }
      const data = await response.json();
      if (!data.ok || !data.task) throw new Error("状态数据不完整。");
      if (state.activeId !== item.localId) return;
      state.pollFailures = 0;
      item.snapshot = data.task;
      updateStage(data.task);
      if (["complete", "failed", "cancelled"].includes(data.task.status)) {
        finishTask(data.task, item);
        return;
      }
      schedulePoll(520);
    } catch (error) {
      state.pollFailures += 1;
      if (state.pollFailures <= 6) {
        schedulePoll(900 + state.pollFailures * 250);
      } else {
        state.status = "failed";
        state.submitting = false;
        state.activeId = null;
        state.taskId = null;
        item.status = "failed";
        item.error = error.message || "无法读取任务状态。";
        item.finished = true;
        els.stopBtn.disabled = true;
        els.stopBtn.innerHTML = '<span class="stop-square" aria-hidden="true"></span>连接中断';
        setStageBadge("error", "连接中断");
        els.stageTitle.textContent = "与本地引擎失去联系";
        els.stageHint.textContent = "请确认终端中的 server.py 仍在运行，必要时刷新页面。";
        showStageNotice(item.error);
        renderQueue();
        updateStartButton();
        els.startBtn.disabled = false;
        toast("与本地引擎的连接中断。", "error");
      }
    }
  }

  function updateStage(task) {
    const counts = task.counts || {};
    const progress = Math.max(0, Math.min(100, Math.round((Number(task.progress) || 0) * 100)));

    state.displayedProgress = Math.max(state.displayedProgress, progress);
    els.progressFill.style.width = `${state.displayedProgress}%`;
    els.progressText.textContent = `${state.displayedProgress}%`;
    els.progressNumber.textContent = String(state.displayedProgress);
    els.progressBar.setAttribute("aria-valuenow", String(state.displayedProgress));

    if (task.phase) {
      els.progressPhase.textContent = task.phase;
      els.phaseLabel.textContent = task.phase;
    }

    if (typeof task.elapsed_seconds === "number") {
      els.elapsedLabel.textContent = formatDuration(task.elapsed_seconds);
    }

    updateCounter(els.statPages, counts.pages || 0);
    updateCounter(els.statImages, counts.images || 0);
    updateCounter(els.statVideos, counts.videos || 0);
    els.statBytes.textContent = formatBytes(counts.bytes || 0);

    setPhaseSteps(state.displayedProgress);

    if (task.status === "running" && task.phase) {
      if (state.displayedProgress >= 86) {
        els.stageTitle.textContent = "正在整理归档";
      } else if (state.displayedProgress >= 30) {
        els.stageTitle.textContent = "正在下载资源";
      } else {
        els.stageTitle.textContent = "正在扫描网页";
      }
    }

    renderLogs(task.logs || []);
    renderStream(task.items || []);
    updateQueueLive(task);
  }

  function updateCounter(element, value) {
    const next = formatNumber(value);
    if (element.textContent !== next) {
      element.textContent = next;
      element.classList.remove("stat-tick");
      void element.offsetWidth;
      element.classList.add("stat-tick");
    }
  }

  function setPhaseSteps(progress) {
    const steps = $$("#phaseSteps span");
    if (!steps.length) return;
    const thresholds = [0, 30, 86, 100];
    let activeIndex = 0;
    for (let i = 0; i < thresholds.length; i += 1) {
      if (progress >= thresholds[i]) activeIndex = i;
    }
    steps.forEach((step, index) => {
      step.classList.toggle("is-active", index === activeIndex && progress < 100);
      step.classList.toggle("is-done", progress >= 100 || index < activeIndex);
    });
  }

  function renderLogs(logs) {
    let appended = false;
    const stick = els.logList.scrollHeight - els.logList.scrollTop - els.logList.clientHeight < 50;
    for (const log of logs) {
      if (!log || typeof log.seq !== "number" || log.seq <= state.lastLogSeq) continue;
      state.lastLogSeq = log.seq;
      const line = document.createElement("div");
      line.className = "log-line";

      const time = document.createElement("span");
      time.className = "log-time";
      time.textContent = log.time || "--:--:--";

      const level = document.createElement("span");
      const levelName = ["info", "ok", "warn", "error", "sys"].includes(log.level) ? log.level : "info";
      level.className = `log-level ${levelName}`;
      level.textContent = levelName.toUpperCase();

      const message = document.createElement("span");
      message.className = "log-message";
      message.textContent = log.message || "";

      line.append(time, level, message);
      els.logList.appendChild(line);
      appended = true;
    }
    while (els.logList.childElementCount > 260) {
      els.logList.firstElementChild.remove();
    }
    if (appended && stick) {
      els.logList.scrollTop = els.logList.scrollHeight;
    }
  }

  const ICONS = {
    video: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="14" height="14" rx="3"/><path d="M17 10l4-2v8l-4-2z"/></svg>',
    text: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l5 5v13H6z"/><path d="M14 3v6h5M9 12h7M9 16h7"/></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="M4 17l5-5 4 4 3-3 4 4"/></svg>',
  };

  function iconNode(name) {
    const wrapper = document.createElement("span");
    wrapper.innerHTML = ICONS[name] || ICONS.text;
    return wrapper.firstElementChild;
  }

  function renderStream(items) {
    const media = items.filter((item) => item.kind === "image" || item.kind === "video");
    els.streamCount.textContent = `${media.length} ${media.length === 1 ? "FILE" : "FILES"}`;
    if (!media.length) return;

    const empty = $(".stream-empty", els.streamList);
    if (empty) empty.remove();

    for (const item of media) {
      if (state.seenItems.has(item.name)) continue;
      state.seenItems.add(item.name);
      const chip = document.createElement("div");
      chip.className = "stream-item";
      chip.title = item.source_url || item.filename || "";

      if (item.kind === "image" && item.preview_url) {
        const image = document.createElement("img");
        image.className = "stream-thumb";
        image.src = item.preview_url;
        image.alt = "";
        image.loading = "lazy";
        chip.appendChild(image);
      } else {
        const icon = document.createElement("span");
        icon.className = "stream-kind";
        icon.appendChild(iconNode(item.kind));
        chip.appendChild(icon);
      }

      const name = document.createElement("span");
      name.className = "stream-name";
      name.textContent = item.filename || item.name || "resource";
      chip.appendChild(name);
      els.streamList.appendChild(chip);
    }

    while (els.streamList.childElementCount > 8) {
      els.streamList.firstElementChild.remove();
    }
  }

  function showStageNotice(message) {
    if (!message) return;
    let notice = $("#stageNotice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "stageNotice";
      notice.className = "error-banner";
      const icon = document.createElement("span");
      icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 17H3z"/><path d="M12 9v5M12 17.5v.2"/></svg>';
      const copy = document.createElement("div");
      const title = document.createElement("b");
      title.textContent = "任务中断";
      const text = document.createElement("span");
      text.id = "stageNoticeText";
      copy.append(title, text);
      notice.append(icon.firstElementChild, copy);
      els.stage.insertBefore(notice, $(".stage-grid"));
    }
    const text = $("#stageNoticeText");
    if (text) text.textContent = message;
  }

  async function stopActiveTask() {
    const item = activeItem();
    if (!item || !item.taskId || state.stopping) return;
    if (item.status !== "running") return;
    state.stopping = true;
    els.stopBtn.disabled = true;
    els.startBtn.disabled = true;
    updateStartButton();
    els.stageHint.textContent = "正在取消未完成的下载并清理临时文件…";
    try {
      const response = await fetch(`/api/tasks/${item.taskId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "停止失败");
      if (data.task) updateStage(data.task);
      schedulePoll(250);
    } catch (error) {
      state.stopping = false;
      els.stopBtn.disabled = false;
      els.startBtn.disabled = false;
      updateStartButton();
      els.stageHint.textContent = "任务在本地运行，所有资源只写入你的磁盘。";
      toast(error.message || "停止任务失败。", "error");
    }
  }

  function finishTask(task, item) {
    if (!item) item = activeItem();
    if (!item || item.finished) return;
    item.finished = true;
    state.status = task.status;
    state.stopping = false;
    state.submitting = false;
    state.activeId = null;
    state.taskId = null;
    item.status = task.status;
    item.snapshot = task;
    item.error = task.error || null;
    window.clearTimeout(state.pollTimer);
    els.stopBtn.disabled = true;
    els.stopBtn.innerHTML = '<span class="stop-square" aria-hidden="true"></span>任务已结束';
    els.startBtn.disabled = false;

    if (task.status === "complete") {
      state.selectedResultId = item.localId;
      setStageBadge("done", "已完成");
      els.stageTitle.textContent = "拾取完成";
      els.progressFill.style.width = "100%";
      els.progressText.textContent = "100%";
      els.progressNumber.textContent = "100";
      els.progressBar.setAttribute("aria-valuenow", "100");
      setPhaseSteps(100);
      els.progressPhase.textContent = "完成";
      els.phaseLabel.textContent = "归档完成";
      els.stageHint.textContent = "所有文件已写入本地文件夹，可下载 ZIP 或直接打开目录。";
      renderResult(task);
      toast("归档完成，文件已经整理好了。");
      if (pendingItems().length && state.autoContinue) {
        scheduleAutoNext();
      } else {
        clearAutoNext();
      }
      window.setTimeout(() => {
        if (state.selectedResultId !== item.localId || state.activeId) return;
        els.result.hidden = false;
        els.result.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
        if (!reducedMotion) fireConfetti();
      }, 220);
    } else if (task.status === "cancelled") {
      state.selectedResultId = null;
      clearAutoNext();
      setStageBadge("stopped", "已停止");
      els.stageTitle.textContent = "任务已停止";
      els.phaseLabel.textContent = "已停止";
      els.progressPhase.textContent = "已停止";
      setPhaseSteps(state.displayedProgress);
      els.phaseSteps.classList.add("is-stopped");
      clearStream("临时文件已清理");
      els.stageHint.textContent = "未完成的临时文件已清理。队列中的下一轮可以手动开始。";
      toast("任务已停止，临时文件已清理。");
    } else {
      state.selectedResultId = null;
      clearAutoNext();
      setStageBadge("error", "失败");
      els.stageTitle.textContent = "任务中断";
      els.phaseLabel.textContent = "未完成";
      els.progressPhase.textContent = "失败";
      els.stageHint.textContent = "请检查链接、网络或站点限制后重试，或开始队列中的下一轮。";
      clearStream("未生成归档文件");
      showStageNotice(task.error || "抓取失败，未生成归档。");
      toast(task.error || "抓取失败。", "error", 6000);
    }

    renderQueue();
    updateStartButton();
  }

  function renderResult(task) {
    state.viewTaskId = task.id;
    els.autoContinueBar.hidden = true;
    const counts = task.counts || {};
    const result = task.result || {};
    const items = task.items || [];
    const textFiles = task.text_files || [];
    const images = items.filter((item) => item.kind === "image");
    const videos = items.filter((item) => item.kind === "video");
    const regularTexts = textFiles.filter((file) => !file.combined);
    const totalFiles = images.length + videos.length + regularTexts.length;

    state.packagePath = result.folder || "";
    state.packageName = result.package_name || task.package_name || "";

    if (totalFiles === 0) {
      els.resultTitle.textContent = "任务完成，但没有发现可保存的资源。";
      els.resultSub.textContent = "可能页面依赖 JavaScript 渲染、资源被站点保护，或链接指向的是纯入口页。归档清单仍然保留。";
    } else {
      els.resultTitle.textContent = `已收下 ${totalFiles} 份资源。`;
      els.resultSub.textContent = "文件已按类型归入 images / videos / text，并附带 manifest.json 清单与 README 说明。";
    }

    els.packageName.textContent = state.packageName || "—";
    els.packageName.title = state.packageName;
    els.packagePath.textContent = state.packagePath || "—";
    els.packagePath.title = state.packagePath;

    els.downloadBtn.href = result.download_url || `/api/tasks/${task.id}/download`;
    els.downloadBtn.setAttribute("download", `${state.packageName || "harvest"}.zip`);
    els.revealBtn.disabled = !state.packagePath;

    els.resultPages.textContent = formatNumber(counts.pages || 0);
    els.resultImages.textContent = formatNumber(counts.images || 0);
    els.resultVideos.textContent = formatNumber(counts.videos || 0);
    els.resultTextChars.textContent = `${formatNumber(counts.text_chars || 0)} 字`;
    els.resultBytes.textContent = formatBytes(result.package_size || counts.bytes || 0);
    els.resultElapsed.textContent = `${Number(result.elapsed_seconds || task.elapsed_seconds || 0)}s`;

    els.gallery.replaceChildren();
    els.galleryCount.textContent = String(images.length);
    if (!images.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "本次没有保存图片。";
      els.gallery.appendChild(empty);
    } else {
      images.slice(0, 12).forEach((item, index) => {
        const figure = document.createElement("figure");
        figure.className = "gallery-item";
        figure.style.animationDelay = `${Math.min(index * 35, 380)}ms`;
        const image = document.createElement("img");
        image.src = item.preview_url || "";
        image.alt = item.filename || "归档图片";
        image.loading = "lazy";
        image.decoding = "async";
        const meta = document.createElement("figcaption");
        meta.className = "gallery-meta";
        meta.textContent = item.filename || item.name || "";
        figure.append(image, meta);
        els.gallery.appendChild(figure);
      });
      if (images.length > 12) {
        const more = document.createElement("div");
        more.className = "gallery-more";
        more.textContent = `+${images.length - 12}`;
        els.gallery.appendChild(more);
      }
    }

    els.fileLists.replaceChildren();
    let groups = 0;
    if (videos.length) {
      groups += 1;
      const group = buildFileGroup("VIDEOS", videos.map((item) => ({
        icon: "video",
        name: item.filename,
        size: item.size,
        title: item.source_url,
      })));
      els.fileLists.appendChild(group);
    }
    if (textFiles.length) {
      groups += 1;
      const group = buildFileGroup("TEXT", textFiles.map((file) => ({
        icon: "text",
        name: file.filename,
        size: file.chars,
        title: file.url,
        suffix: "字",
        combined: file.combined,
      })));
      els.fileLists.appendChild(group);
    }
    if (!groups) {
      const empty = document.createElement("p");
      empty.className = "empty-files";
      empty.textContent = "本次没有保存视频或文字。";
      els.fileLists.appendChild(empty);
    }

    const preview = String(task.text_preview || "").trim();
    if (preview) {
      els.textPreview.hidden = false;
      els.textPreviewBody.textContent = preview.length > 560 ? `${preview.slice(0, 560)}…` : preview;
    } else {
      els.textPreview.hidden = true;
      els.textPreviewBody.textContent = "";
    }

    const notices = [];
    if (Number(counts.failed) > 0) notices.push(`${counts.failed} 个资源未能保存`);
    if (Number(counts.skipped) > 0) notices.push(`${counts.skipped} 个资源被安全跳过`);
    if (Array.isArray(task.warnings) && task.warnings.length) notices.push(task.warnings[0]);
    els.resultWarnings.textContent = notices.length ? `注意：${notices.join("；")}。详细信息见 manifest.json。` : "";
  }

  function buildFileGroup(title, rows) {
    const group = document.createElement("div");
    group.className = "file-group";
    const heading = document.createElement("h4");
    heading.textContent = title;
    group.appendChild(heading);

    rows.slice(0, 80).forEach((row) => {
      const line = document.createElement("div");
      line.className = "file-row";
      line.title = row.title || row.name || "";
      line.appendChild(iconNode(row.icon));

      const name = document.createElement("span");
      name.className = "file-name";
      name.textContent = row.name || "";
      line.appendChild(name);

      const size = document.createElement("span");
      size.className = "file-size";
      if (row.suffix) {
        size.textContent = `${formatNumber(row.size)} ${row.suffix}`;
      } else {
        size.textContent = formatBytes(row.size);
      }
      line.appendChild(size);
      group.appendChild(line);
    });
    return group;
  }

  /* ------------------------------------------------------------------ */
  /* Confetti                                                           */
  /* ------------------------------------------------------------------ */

  function fireConfetti() {
    const canvas = els.confettiCanvas;
    if (!canvas || reducedMotion) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = ["#d7ff5f", "#64f0c2", "#ff9561", "#eef4e8", "#a8d32e"];
    const pieces = Array.from({ length: 90 }, () => ({
      x: width * (0.35 + Math.random() * 0.3),
      y: height * (0.24 + Math.random() * 0.08),
      vx: (Math.random() - 0.5) * 9,
      vy: -3 - Math.random() * 7,
      size: 3 + Math.random() * 5,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.28,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
    }));

    const start = performance.now();
    function draw(now) {
      const elapsed = (now - start) / 1000;
      context.clearRect(0, 0, width, height);
      for (const piece of pieces) {
        piece.vy += 0.18;
        piece.vx *= 0.994;
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.rotation += piece.spin;
        piece.life = Math.max(0, 1 - Math.max(0, elapsed - 1.3) / 1.5);

        context.save();
        context.globalAlpha = piece.life;
        context.translate(piece.x, piece.y);
        context.rotate(piece.rotation);
        context.fillStyle = piece.color;
        context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        context.restore();
      }
      if (elapsed < 2.8) {
        window.requestAnimationFrame(draw);
      } else {
        context.clearRect(0, 0, width, height);
      }
    }
    window.requestAnimationFrame(draw);
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */

  initForm();
  initParticles();
  renderQueue();
  updateStartButton();
  checkEngine();

  window.setInterval(checkEngine, 30000);

  window.addEventListener("beforeunload", () => {
    window.clearTimeout(state.pollTimer);
  });
})();
