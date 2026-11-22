# orangy-zc

ORANGY ZC 的个人数字空间 —— 主站 [orangy-site](https://orangy-site.pages.dev) 之外的另一扇门。

水墨底色、宣纸质感，放作品集、数字实验室、随笔和关于。

## 本地开发

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # 产物在 dist/
npm run preview  # 预览构建产物
```

## 目录

```
src/
  config/site.ts             站点名称、描述、GitHub 与邮箱、导航项
  config/landscape.ts        首页山水图层：画布尺寸、坐标、叠放顺序、视差位移、LQIP
  components/
    SiteHeader.astro         导航（solid 常规 / overlay 首屏浮层两种状态）
    SiteFooter.astro
    Hero/
      HeroSection.astro      首屏骨架与交互入口
      LandscapeScene.astro   六层画布（底图 + 五个独立图层）
      ParallaxLayer.astro    单个透明图层（webp + png 双格式）
      HeroIntroduction.astro 首屏标题、副标题与按钮
  layouts/BaseLayout.astro   页面外壳（head、可选的 overlay 导航、预加载、页脚）
  pages/
    index.astro              首页：首屏 + 关于 / 精选作品 / 创作理念 / 随笔 / 联系
    works/index.astro        作品集（含筛选）
    works/[slug].astro       作品详情
    lab/index.astro          数字实验室
    notes/index.astro        随笔与记录
    about.astro              关于我
    404.astro                404
  scripts/hero.ts            视差调度、导航滚动状态、板块淡入
  styles/
    global.css               配色、字体、页头页脚、通用排版
    hero.css                 首屏版式、按钮、滚动提示
    parallax.css             图层机制与太阳 / 仙鹤 / 松树 / 云雾的细微动态
    home.css                 首页正文板块
    works.css                作品集页
public/
  images/landscape/          山水画干净底图（webp + jpg）与五张透明图层（webp + png）
  images/projects/           作品截图
tools/landscape-pipeline/    从素材包生成底图与图层的脚本
```

## 首页山水画是怎么来的

首屏用的是 **同一幅画的六个图层**，而不是一张背景图：

| 图层 | 文件 | 视差位移（画布像素） |
| --- | --- | ---: |
| 山水底图 | `public/images/landscape/background.webp` | 2 |
| 落日 | `sun` | 4 |
| 双鹤 | `cranes` | 6 |
| 山顶亭台 | `pavilion` | 5 |
| 江上小舟 | `boat` | 9 |
| 前景松树 | `pine` | 15 |

要点：

- 底图**不是原图的简单拷贝**，而是把太阳 / 仙鹤 / 亭台 / 小舟 / 松树从画面里移除后的「干净底版」。
  单张合成图没有隐藏区域信息，所以移除处只用低频云雾填补，不伪造笔触——图层滑动时露出来的
  那一窄条，看起来就是雾。
- 每张图层保留原画像素颜色、alpha 等价于被移除的区域，所以**静止时的合成结果就是原画本身**
  （与原图逐像素比较 PSNR ≈ 49 dB）。
- 画布四周向外做了 36px 出血，并向页面纸色淡出，图层滑动时画面边缘不会露洞，也不会有硬边。
- 素材由 `tools/landscape-pipeline/build_assets.py` 从 `landscape-assets` 素材包生成，
  需要 Python 3 + numpy + Pillow；坐标同时输出在 `metadata`/`config/landscape.ts` 里。

生成新素材后，把 `assets/*.webp`、`*.png`、`*.jpg` 覆盖到 `public/images/landscape/`，
并按输出更新 `src/config/landscape.ts` 里每个图层的 `x / y / width / height`。

## 改哪里

- 站点名 / 描述 / 邮箱 / GitHub：`src/config/site.ts`
- 首页首屏文案：`src/components/Hero/HeroIntroduction.astro`
- 首页正文文案（关于 / 理念 / 联系）：`src/pages/index.astro`
- 精选作品出现在首页的顺序：`src/pages/index.astro` 的 `featuredSlugs`
- 随笔条目：`src/data/journal.ts`
- 图层坐标与视差幅度：`src/config/landscape.ts`
- 配色与字体：`src/styles/global.css`
- 首屏版式：`src/styles/hero.css`；图层动画：`src/styles/parallax.css`

## 部署

推送到 `main` 后由 Cloudflare Pages 自动构建（`npm run build` → `dist`）。

- 生产地址：https://orangy-zc.pages.dev
- 仓库：https://github.com/Orangyyyyyyyyyyy/orangy-zc
