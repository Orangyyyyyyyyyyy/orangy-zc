# orangy-zc

ORANGY ZC 的个人数字空间 —— 主站 [orangy-site](https://orangy-site.pages.dev) 之外的另一扇门。

水墨底色、宣纸质感，放作品集、数字实验室、随笔和关于。

## 本地开发

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # 产物在 dist/
```

## 目录

```
src/
  config/site.ts          站点名称、描述、GitHub 与邮箱、导航项
  components/             SiteHeader / SiteFooter
  layouts/BaseLayout.astro  页面外壳（head、导航、页脚）
  pages/
    index.astro           首页（水墨底图 + 主标题）
    works/index.astro     作品集
    lab/index.astro       数字实验室
    notes/index.astro     随笔与记录
    about.astro           关于我
    404.astro             404
  styles/global.css       配色、字体、版式
public/
  favicon.svg
  images/home-inkwash.png 首页水墨底图（1672×941）
```

## 部署

推送到 `main` 后由 Cloudflare Pages 自动构建（`npm run build` → `dist`）。

- 生产地址：https://orangy-zc.pages.dev
- 仓库：https://github.com/Orangyyyyyyyyyyy/orangy-zc

## 改哪里

- 站点名 / 描述 / 邮箱 / GitHub：`src/config/site.ts`
- 首页大标题与文案：`src/pages/index.astro`
- 各分页开头文案：`src/pages/*/index.astro`
- 配色与字体：`src/styles/global.css`
- 首页底图：替换 `public/images/home-inkwash.png`（同路径即可）
