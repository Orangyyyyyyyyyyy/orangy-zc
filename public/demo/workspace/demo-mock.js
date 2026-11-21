/* 个人工作台 · 演示模式
 * 1) 首次访问写入一组示例数据（只写不读真实记录，全部在访客自己的浏览器里）
 * 2) 拦截 /api/* 请求，返回示例数据，避免静态托管下出现红色报错
 */
(function () {
  "use strict";

  var REAL_FETCH = window.fetch ? window.fetch.bind(window) : null;

  function localDate() {
    var d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  var TODAY = localDate();

  /* ---------- 示例数据 ---------- */
  var DEMO = {
    tasks: [
      { id: "d1", title: "整理校官网今日通知与公告", category: "信息", points: 3 },
      { id: "d2", title: "CET-4 听力精听 1 套", category: "英语", points: 2 },
      { id: "d3", title: "《山海司》卡牌数值平衡第二轮", category: "项目", points: 5 },
      { id: "d4", title: "读《设计中的设计》30 页", category: "阅读", points: 2 },
      { id: "d5", title: "整理本周竞赛报名窗口", category: "规划", points: 3 },
    ],
    done: ["d1", "d2"],
    checkin: {},
    points: 128,
  };
  DEMO.checkin[TODAY] = { morning: "07:12", evening: "23:05" };

  try {
    if (!localStorage.getItem("pw_demo_seeded")) {
      if (!localStorage.getItem("pw_tasks")) localStorage.setItem("pw_tasks", JSON.stringify(DEMO.tasks));
      if (!localStorage.getItem("pw_task_done")) localStorage.setItem("pw_task_done", JSON.stringify({}));
      if (!localStorage.getItem("pw_checkin")) localStorage.setItem("pw_checkin", JSON.stringify(DEMO.checkin));
      if (!localStorage.getItem("pw_points")) localStorage.setItem("pw_points", JSON.stringify(DEMO.points));
      if (!localStorage.getItem("pw_settings")) {
        localStorage.setItem(
          "pw_settings",
          JSON.stringify({ city: "上海", lat: 31.2304, lon: 121.4737, theme: "light" })
        );
      }
      localStorage.setItem("pw_demo_seeded", "1");
    }
  } catch (e) {}

  /* ---------- 示例新闻 ---------- */
  function newsPayload() {
    function col(area) {
      return {
        headline:
          area === "国内"
            ? "多部门联合发布青年就业与实习新政"
            : "国际学术会议公布今年开放获取新规",
        politics: [
          { title: area + "：本周政策要点梳理", summary: "（示例数据）用于展示新闻卡片的排版效果。" },
        ],
        economy: [{ title: area + "：市场与产业动态", summary: "（示例数据）演示模式下不联网抓取。" }],
        policy: [{ title: area + "：新规速览", summary: "（示例数据）真实内容由后端抓取。" }],
        culture: [{ title: area + "：文化与展览", summary: "（示例数据）" }],
        sports: [{ title: area + "：赛事日历", summary: "（示例数据）" }],
      };
    }
    return {
      date: TODAY,
      fallback: true,
      domestic: col("国内"),
      foreign: col("国外"),
    };
  }

  function json(data, status) {
    return Promise.resolve(
      new Response(JSON.stringify(data), {
        status: status || 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var method = (init && init.method) || "GET";

    if (url.indexOf("/api/") === -1) return REAL_FETCH ? REAL_FETCH(input, init) : Promise.reject(new Error("no fetch"));

    if (url.indexOf("/api/health") === 0) {
      return json({ ok: true, hasKey: false, model: "glm-4-flash", demo: true });
    }
    if (url.indexOf("/api/daily-news") === 0 || url.indexOf("/api/news") === 0) {
      return json(url.indexOf("/api/daily-news") === 0 ? newsPayload() : { ok: true, items: [] });
    }
    if (url.indexOf("/api/ai") === 0) {
      return json({ ok: false, error: "DEMO_MODE", message: "演示模式：AI 未接入，已使用本地兜底文案。" }, 503);
    }
    if (url.indexOf("/api/agnes-image") === 0) {
      return json({ ok: false, error: "DEMO_MODE" }, 503);
    }
    // 其它后端接口一律友好失败，避免控制台红字
    return json({ ok: false, error: "DEMO_MODE" }, 503);
  };

  /* 设置页里把“服务端已连接的 Key”说明清楚 */
  /* 支持 ?enter=1 直接进入工作台（用于截图与直达） */
  window.addEventListener("DOMContentLoaded", function () {
    if (/[?&]enter=1/.test(location.search)) {
      setTimeout(function () {
        var btn = Array.from(document.querySelectorAll("button,a")).filter(function (el) {
          return /进入工作台/.test(el.textContent || "");
        })[0];
        if (btn) btn.click();
      }, 300);
    }
  });

  window.addEventListener("DOMContentLoaded", function () {
    var pill = document.createElement("div");
    pill.style.cssText =
      "position:fixed;left:14px;bottom:14px;z-index:2147483000;padding:7px 12px;border-radius:999px;" +
      "background:rgba(255,255,255,.9);border:1px solid rgba(0,0,0,.08);color:#6e685c;" +
      "font:12px/1.4 -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.06)";
    pill.textContent = "示例数据 · 不会上传、不影响本地工作台";
    document.body.appendChild(pill);
  });
})();
