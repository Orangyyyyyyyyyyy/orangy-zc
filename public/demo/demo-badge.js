/* 演示版标记：所有 demo 共用。样式刻意克制，不影响原有界面。 */
(function () {
  if (window.__orangyDemoBadge) return;
  window.__orangyDemoBadge = true;

  function mount() {
    if (document.getElementById("orangy-demo-badge")) return;
    var wrap = document.createElement("div");
    wrap.id = "orangy-demo-badge";
    wrap.style.cssText = [
      "position:fixed",
      "right:14px",
      "bottom:14px",
      "z-index:2147483000",
      "display:flex",
      "align-items:center",
      "gap:10px",
      "padding:7px 10px 7px 12px",
      "border-radius:999px",
      "background:rgba(18,16,14,.82)",
      "color:#f3ede6",
      "font:12px/1.4 -apple-system,BlinkMacSystemFont,'PingFang SC','Noto Sans SC',sans-serif",
      "letter-spacing:.02em",
      "backdrop-filter:blur(10px)",
      "-webkit-backdrop-filter:blur(10px)",
      "border:1px solid rgba(255,255,255,.16)",
      "box-shadow:0 6px 24px rgba(0,0,0,.28)",
      "pointer-events:auto",
    ].join(";");

    var dot = document.createElement("span");
    dot.style.cssText =
      "width:7px;height:7px;border-radius:50%;background:#ff6a1a;box-shadow:0 0 0 3px rgba(255,106,26,.2)";

    var label = document.createElement("span");
    label.textContent = "演示版";
    label.style.cssText = "opacity:.92";

    var link = document.createElement("a");
    link.href = "/works/";
    link.textContent = "作品页 ↗";
    link.style.cssText =
      "color:#ff9a5c;text-decoration:none;border-left:1px solid rgba(255,255,255,.18);padding-left:10px";

    wrap.append(dot, label, link);
    document.body.appendChild(wrap);

    // 移动端稍微收一收
    if (window.innerWidth < 520) {
      wrap.style.transform = "scale(.92)";
      wrap.style.transformOrigin = "bottom right";
    }
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
