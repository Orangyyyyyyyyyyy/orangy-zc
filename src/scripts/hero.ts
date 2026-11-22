/**
 * 首页交互：水墨视差、导航状态、滚动淡入。
 *
 * 设计约束
 * - 每帧只写两个 CSS 变量（--px / --py），图层位移在 CSS 里各自计算，
 *   因此不会触发任何框架层面的重复渲染。
 * - 位移用指数阻尼插值，帧率无关；鼠标停下后缓慢回到原位，不会跳。
 * - 没有精确指针（触屏 / 手写笔）时切换成极慢的环境漂移，不监听鼠标。
 * - 开启 prefers-reduced-motion 时整套视差关闭，画面保持静止。
 */

const REDUCED = "(prefers-reduced-motion: reduce)";
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

type Vars = { tx: number; ty: number; x: number; y: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function initParallax(hero: HTMLElement, scene: HTMLElement, reduce: MediaQueryList, fine: MediaQueryList) {
  const state: Vars = { tx: 0, ty: 0, x: 0, y: 0 };
  let raf = 0;
  let last = 0;
  let onScreen = true;
  let awake = false;

  const ambient = () => !fine.matches;

  const write = () => {
    scene.style.setProperty("--px", state.x.toFixed(4));
    scene.style.setProperty("--py", state.y.toFixed(4));
  };

  const measure = () => {
    scene.style.setProperty("--scene-w", `${scene.clientWidth}px`);
  };

  const tick = (now: number) => {
    raf = 0;
    const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 1 / 60;
    last = now;

    if (ambient()) {
      // 环境漂移：两条不同周期的正弦叠加，避免机械循环感
      const t = now / 1000;
      state.tx = Math.sin(t / 11.3) * 0.5 + Math.sin(t / 26.7) * 0.18;
      state.ty = Math.cos(t / 15.1) * 0.42 + Math.sin(t / 33.4) * 0.12;
    }

    const settledTarget = state.tx === 0 && state.ty === 0;
    const rate = !fine.matches ? 1.1 : settledTarget ? 1.9 : 4.6;
    const k = 1 - Math.exp(-dt * rate);

    state.x += (state.tx - state.x) * k;
    state.y += (state.ty - state.y) * k;

    if (Math.abs(state.x) < 0.0002 && Math.abs(state.y) < 0.0002) {
      state.x = 0;
      state.y = 0;
    }
    write();

    const settled =
      Math.abs(state.tx - state.x) < 0.0004 && Math.abs(state.ty - state.y) < 0.0004;

    if ((!ambient() && settled && state.tx === 0 && state.ty === 0) || !onScreen) {
      awake = false;
      last = 0;
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  const wake = () => {
    if (raf || reduce.matches || !onScreen) return;
    if (!awake) {
      awake = true;
      last = 0;
    }
    raf = requestAnimationFrame(tick);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (ambient() || reduce.matches) return;
    if (event.pointerType === "touch") return;
    state.tx = clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1);
    state.ty = clamp((event.clientY / window.innerHeight) * 2 - 1, -1, 1);
    wake();
  };

  const rest = () => {
    state.tx = 0;
    state.ty = 0;
    wake();
  };

  const onLeave = () => rest();

  const onModeChange = () => {
    state.tx = 0;
    state.ty = 0;
    wake();
  };

  measure();
  write();

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  window.addEventListener("blur", onLeave);
  window.addEventListener("resize", measure, { passive: true });
  fine.addEventListener("change", onModeChange);
  reduce.addEventListener("change", onModeChange);

  const visibility = new IntersectionObserver(
    (entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      if (!onScreen) {
        state.tx = 0;
        state.ty = 0;
        state.x = 0;
        state.y = 0;
        write();
        return;
      }
      wake();
    },
    { rootMargin: "10% 0px" }
  );
  visibility.observe(hero);

  const onDocVisibility = () => {
    if (document.hidden) {
      state.x = 0;
      state.y = 0;
      write();
      return;
    }
    last = 0;
    wake();
  };
  document.addEventListener("visibilitychange", onDocVisibility);

  wake();

  return () => {
    window.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("blur", onLeave);
    window.removeEventListener("resize", measure);
    fine.removeEventListener("change", onModeChange);
    reduce.removeEventListener("change", onModeChange);
    document.removeEventListener("visibilitychange", onDocVisibility);
    visibility.disconnect();
    if (raf) cancelAnimationFrame(raf);
  };
}

function initScrollChrome(hero: HTMLElement) {
  const header = document.querySelector<HTMLElement>(".site-header--overlay");
  let scheduled = 0;

  const apply = () => {
    scheduled = 0;
    const y = window.scrollY || window.pageYOffset;
    header?.classList.toggle("is-solid", y > 40);
    const height = hero.offsetHeight || 1;
    hero.style.setProperty("--hero-progress", clamp(y / height, 0, 1).toFixed(3));
  };

  const onScroll = () => {
    if (scheduled) return;
    scheduled = requestAnimationFrame(apply);
  };

  apply();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    if (scheduled) cancelAnimationFrame(scheduled);
  };
}

function initReveal() {
  const items = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
  if (!items.length) return;

  const showAll = () => items.forEach((item) => item.classList.add("is-in"));

  if (!("IntersectionObserver" in window)) {
    showAll();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        const delay = Number(el.dataset.revealDelay ?? 0);
        window.setTimeout(() => el.classList.add("is-in"), delay);
        observer.unobserve(el);
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
  );

  items.forEach((item) => observer.observe(item));
  // 兜底：任何异常情况下 2.5s 后内容都要可见
  window.setTimeout(showAll, 2500);
}

function initSceneReady(scene: HTMLElement) {
  const plate = scene.querySelector<HTMLImageElement>("img[data-ink-plate]");
  const mark = () => scene.classList.add("is-ready");
  if (!plate) {
    mark();
    return;
  }
  if (plate.complete && plate.naturalWidth > 0) {
    mark();
  } else {
    plate.addEventListener("load", mark, { once: true });
    plate.addEventListener("error", mark, { once: true });
  }
}

export function initHero() {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (!hero) return;

  const scene = hero.querySelector<HTMLElement>("[data-ink-scene]");
  const reduce = window.matchMedia(REDUCED);
  const fine = window.matchMedia(FINE_POINTER);

  if (scene) {
    initSceneReady(scene);
    initParallax(hero, scene, reduce, fine);
  }

  initScrollChrome(hero);
  initReveal();
}
