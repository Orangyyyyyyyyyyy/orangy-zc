/* 拾取 HARVESTER · 演示模式
 * 静态托管没有 Python 后端，这里用一个内存里的"假任务"把完整流程演一遍：
 * 输入网址 → 扫描 → 下载 → 归档 → 结果页。不会真的联网抓取任何内容。
 */
(function () {
  "use strict";

  var REAL_FETCH = window.fetch ? window.fetch.bind(window) : null;
  var tasks = Object.create(null);
  var SEQ = 0;

  function nowClock() {
    var d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map(function (n) {
        return String(n).padStart(2, "0");
      })
      .join(":");
  }

  function json(data, status) {
    return Promise.resolve(
      new Response(JSON.stringify(data), {
        status: status || 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  var DEMO_IMAGES = [
    { name: "cover-01.jpg", size: 482133 },
    { name: "cover-02.jpg", size: 391204 },
    { name: "detail-03.jpg", size: 268011 },
    { name: "poster-04.jpg", size: 712350 },
    { name: "thumb-05.jpg", size: 120884 },
  ];
  var DEMO_VIDEOS = [
    { name: "clip-01.mp4", size: 4820113 },
    { name: "clip-02.mp4", size: 3110220 },
  ];

  function buildTask(url, types) {
    var id = "demo-" + String(++SEQ).padStart(3, "0");
    var startedAt = Date.now();
    tasks[id] = {
      id: id,
      url: url,
      types: types,
      startedAt: startedAt,
      lastSeq: 0,
      cancelled: false,
    };
    return tasks[id];
  }

  function snapshot(task) {
    var elapsed = (Date.now() - task.startedAt) / 1000;
    var total = 9.5;
    var ratio = task.cancelled ? Math.min(1, elapsed / total) : Math.min(1, elapsed / total);

    var phase;
    var status;
    if (task.cancelled) {
      phase = "已停止";
      status = "cancelled";
      ratio = Math.min(ratio, 0.99);
    } else if (ratio >= 1) {
      phase = "完成";
      status = "complete";
    } else if (ratio >= 0.86) {
      phase = "归档中";
      status = "running";
    } else if (ratio >= 0.3) {
      phase = "下载资源";
      status = "running";
    } else {
      phase = "扫描网页";
      status = "running";
    }

    var imageCount = status === "running" ? Math.min(DEMO_IMAGES.length, Math.floor(ratio * 9)) : DEMO_IMAGES.length;
    var videoCount = status === "running" ? Math.min(DEMO_VIDEOS.length, Math.floor(ratio * 5)) : DEMO_VIDEOS.length;

    var items = [];
    for (var i = 0; i < imageCount; i++) {
      items.push({
        kind: "image",
        name: DEMO_IMAGES[i].name,
        filename: "images/" + DEMO_IMAGES[i].name,
        size: DEMO_IMAGES[i].size,
        source_url: "https://example.com/gallery/" + DEMO_IMAGES[i].name,
      });
    }
    for (var j = 0; j < videoCount; j++) {
      items.push({
        kind: "video",
        name: DEMO_VIDEOS[j].name,
        filename: "videos/" + DEMO_VIDEOS[j].name,
        size: DEMO_VIDEOS[j].size,
        source_url: "https://example.com/video/" + DEMO_VIDEOS[j].name,
      });
    }

    var bytes = items.reduce(function (sum, it) {
      return sum + (it.size || 0);
    }, 0);

    var logs = [
      { seq: 1, time: nowClock(), level: "sys", message: "拾取引擎已启动（演示模式）" },
      { seq: 2, time: nowClock(), level: "info", message: "解析目标地址：" + task.url },
    ];
    if (ratio >= 0.2) logs.push({ seq: 3, time: nowClock(), level: "ok", message: "页面结构识别完成，开始枚举媒体资源" });
    if (ratio >= 0.45) logs.push({ seq: 4, time: nowClock(), level: "info", message: "并发下载中，已去重 " + imageCount + " 张图片" });
    if (ratio >= 0.7) logs.push({ seq: 5, time: nowClock(), level: "info", message: "视频分片合并完成 " + videoCount + " 个" });
    if (ratio >= 0.86) logs.push({ seq: 6, time: nowClock(), level: "ok", message: "正在生成 manifest.json 与 README" });
    if (status === "complete") logs.push({ seq: 7, time: nowClock(), level: "ok", message: "归档完成：output/" + task.id });

    var textFiles =
      status === "complete"
        ? [
            { name: "page-01.txt", chars: 18240, combined: false },
            { name: "page-02.txt", chars: 9430, combined: false },
            { name: "all-text-combined.txt", chars: 27670, combined: true },
          ]
        : [];

    var payload = {
      id: task.id,
      url: task.url,
      status: status,
      phase: phase,
      progress: ratio,
      elapsed_seconds: Math.round(elapsed * 10) / 10,
      counts: {
        pages: Math.max(1, Math.round(ratio * 3)),
        images: imageCount,
        videos: videoCount,
        bytes: bytes,
        text_chars: status === "complete" ? 27670 : Math.round(ratio * 27670),
      },
      logs: logs,
      items: items,
      text_files: textFiles,
    };

    if (status === "complete") {
      payload.result = {
        folder: "output/" + task.id + "/harvest-demo",
        package_name: "harvest-demo",
        package_size: bytes + 266772,
        download_url: "/demo/crawler/demo-result.zip",
        elapsed_seconds: Math.round(elapsed * 10) / 10,
      };
    }

    return payload;
  }

  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var method = ((init && init.method) || "GET").toUpperCase();

    if (url.indexOf("/api/") !== 0) {
      return REAL_FETCH ? REAL_FETCH(input, init) : Promise.reject(new Error("no fetch"));
    }

    if (url.indexOf("/api/health") === 0) {
      return json({
        ok: true,
        demo: true,
        limits: { image_mb: 200, video_mb: 2048, total_mb: 4096, pages: 200 },
        engine: "harvester demo",
      });
    }

    if (url.indexOf("/api/crawl") === 0 && method === "POST") {
      var body = {};
      try {
        body = JSON.parse((init && init.body) || "{}");
      } catch (e) {}
      var task = buildTask(body.url || "https://example.com/", body.types || []);
      return json({ ok: true, task: snapshot(task) });
    }

    var m = url.match(/^\/api\/tasks\/([^/]+)(\/[a-z]+)?/);
    if (m) {
      var taskId = m[1];
      var action = m[2] || "";
      var t = tasks[taskId];
      if (!t) return json({ ok: false, error: "任务不存在（演示模式会随刷新重置）" }, 404);

      if (action === "/cancel") {
        t.cancelled = true;
        return json({ ok: true, task: snapshot(t) });
      }
      if (action === "/reveal") {
        return json({ ok: false, error: "演示模式不支持打开本地文件夹" }, 400);
      }
      if (action === "/download") {
        return json({ ok: false, error: "演示模式请使用示例压缩包" }, 404);
      }
      return json({ ok: true, task: snapshot(t) });
    }

    if (url.indexOf("/api/tasks") === 0) {
      return json({ ok: true, tasks: [] });
    }

    return json({ ok: false, error: "DEMO_MODE" }, 503);
  };

  window.addEventListener("DOMContentLoaded", function () {
    var pill = document.createElement("div");
    pill.style.cssText =
      "position:fixed;left:14px;bottom:14px;z-index:2147483000;padding:7px 12px;border-radius:999px;" +
      "background:rgba(10,14,12,.86);border:1px solid rgba(255,255,255,.16);color:#9fe8c0;" +
      "font:12px/1.4 -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif";
    pill.textContent = "演示模式 · 任务为模拟数据，不会真的联网抓取";
    document.body.appendChild(pill);
  });
})();
