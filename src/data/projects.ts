export type ProjectStat = { label: string; value: string };

export interface Project {
  slug: string;
  no: string;
  title: string;
  en: string;
  kicker: string;
  tagline: string;
  summary: string;
  status: string;
  statusTone: "live" | "wip" | "demo";
  year: string;
  category: string;
  tags: string[];
  cover: string;
  gallery: { src: string; caption: string }[];
  demo?: string;
  repo?: string;
  stats: ProjectStat[];
  overview: string[];
  features: { title: string; desc: string }[];
  challenges: { problem: string; solution: string }[];
  devSteps: { phase: string; title: string; desc: string }[];
  tech: string[];
  next: string[];
}

export const projects: Project[] = [
  {
    slug: "workspace",
    no: "01",
    title: "个人工作台",
    en: "PERSONAL WORKSPACE",
    kicker: "AI · 效率工具 · 本地优先",
    tagline: "把所有要盯的事，收进一个每天早上打开的页面。",
    summary:
      "接入多模态模型 API 的本地优先工作台：自动检索当日新闻并生成推送，聚合任务规划、打卡、英语学习、日记等模块，还能盯住校官网的通知公告与竞赛时间轴。",
    status: "持续迭代",
    statusTone: "live",
    year: "2026",
    category: "AI 应用",
    tags: ["多模态 API", "本地优先", "信息聚合"],
    cover: "/images/projects/workspace/cover.jpg",
    gallery: [
      { src: "/images/projects/workspace/cover.jpg", caption: "仪表板：签到、任务、天气、每日新闻一次看完" },
      { src: "/images/projects/workspace/landing.jpg", caption: "首次进入的欢迎页" },
    ],
    demo: "/demo/workspace/",
    stats: [
      { label: "功能模块", value: "19" },
      { label: "数据位置", value: "本地" },
      { label: "AI 接入", value: "多模态" },
    ],
    overview: [
      "这是我目前做得最完整的一个程序，也是每天真正在用的一个。它跑在浏览器里，后端只用 Node 内置模块，一个文件夹 + 一条命令就能启动，所有数据留在本机。",
      "起点其实很朴素：每天要看校官网的通知公告、要盯竞赛报名时间、要记任务、要打卡、要背单词。这些事分散在十几个网页和备忘录里，于是干脆把它们收进一个工作台，让程序替我盯。",
      "接上多模态模型之后，它能做到的不只是「汇总」：抓回来的新闻和公告会先被判断重要程度与价值，再决定要不要推给我——这样我既不会漏掉一手信息，也不用在噪声里翻找。",
    ],
    features: [
      {
        title: "每日新闻自动推送",
        desc: "定时检索当日国内 / 国外新闻，按政治、经济、政策、文化、赛事分类整理，生成带头条的推送卡片。",
      },
      {
        title: "校官网通知与公告监控",
        desc: "自动检索学校官网的通知公告，判断重要程度与价值后再推送，保证一手资料不被淹没。",
      },
      {
        title: "竞赛信息时间轴",
        desc: "内置竞赛库，选中自己参加的比赛即可提醒报名窗口，也能一眼看到其余赛事的时间分布。",
      },
      {
        title: "任务规划与积分",
        desc: "内置规划或上传 Excel / CSV 自动生成清单，完成任务累计积分，配合早晚两次打卡统计连续天数。",
      },
      {
        title: "英语学习与四级冲刺",
        desc: "多词本、AI 加工、闪卡、每日听写（浏览器语音朗读），以及 CET-4 专项打卡与刷题记录。",
      },
      {
        title: "日记、记账、日历、报表",
        desc: "文字 + 表情 + 图片的日记，收支记账，月历行程与天气，以及基于这些数据生成的日 / 周 / 月报。",
      },
    ],
    challenges: [
      {
        problem: "信息源太多，人工筛选成本高",
        solution: "把「抓取 → 结构化 → 重要度判断 → 推送」串成一条流水线，让模型先做减法，人只看结论。",
      },
      {
        problem: "效率工具一旦上云，隐私就成了问题",
        solution: "业务数据全部存在浏览器 localStorage / IndexedDB，私密空间用 AES-256-GCM 加密，密钥由本人口令派生，不上传任何服务器。",
      },
      {
        problem: "功能越加越多，容易变成一堆互不相干的页面",
        solution: "统一的数据层与模块入口：仪表板只回答「今天要做什么」，其余模块各管一件事，互相通过同一份本地数据联动。",
      },
    ],
    devSteps: [
      { phase: "01", title: "需求收敛", desc: "先列出每天真正会用的十件事，砍掉「看起来有用」的功能，确定仪表板作为唯一入口。" },
      { phase: "02", title: "本地数据层", desc: "设计 pw_ 前缀的存储约定与导入导出，保证换电脑、备份、恢复都不丢数据。" },
      { phase: "03", title: "接入多模态 API", desc: "把模型调用收在后端，前端只发结构化请求；Key 不下发浏览器，缺失时自动回落本地文案。" },
      { phase: "04", title: "信息流水线", desc: "抓取校官网与新闻源，做去重与增量更新，再加入重要度判断与推送策略。" },
      { phase: "05", title: "打磨与自用", desc: "按真实使用频率调整布局与交互，把最常用的三件事放在第一屏。" },
    ],
    tech: ["原生 HTML / CSS / JS", "Node.js（零外部依赖）", "多模态模型 API", "Web Crypto (AES-256-GCM)", "IndexedDB", "Open-Meteo"],
    next: [
      "把通知公告的重要度判断做成可解释的摘要，而不只是一个分数",
      "移动端布局继续压缩，让手机上也能完成打卡与任务勾选",
      "整理成可分发版本，让不使用 AI 的人也能当纯本地工具用",
    ],
  },
  {
    slug: "harvester",
    no: "02",
    title: "拾取 Harvester",
    en: "WEB RESOURCE HARVESTER",
    kicker: "爬虫 · 资源归档 · 零门槛",
    tagline: "一个网址，把页面里的视频、音乐、文字、图片全部带走。",
    summary:
      "完全免费的网页资源捕手：粘贴一个链接，勾选需要的类型，本地抓取、去重、规范命名，最后打包成一个整洁的文件夹。",
    status: "可用",
    statusTone: "live",
    year: "2026",
    category: "工具 / 爬虫",
    tags: ["网页抓取", "资源归档", "本地运行"],
    cover: "/images/projects/crawler/cover.jpg",
    gallery: [
      { src: "/images/projects/crawler/cover.jpg", caption: "首页：粘贴链接、勾选资源类型即可开始" },
      { src: "/images/projects/crawler/stage.jpg", caption: "任务进行中：阶段、进度、实时日志与文件流" },
      { src: "/images/projects/crawler/result.jpg", caption: "归档结果：清单、体积统计与打包下载" },
    ],
    demo: "/demo/crawler/",
    stats: [
      { label: "操作门槛", value: "1 个网址" },
      { label: "支持类型", value: "4 类" },
      { label: "费用", value: "免费" },
    ],
    overview: [
      "起因很直接：看到一个想存的页面，图片要一张张右键，视频要另找工具，文字还得手动复制。于是做了一个「只输入网址」的版本——把选择权交给勾选框，剩下的交给程序。",
      "它完全免费、在自己电脑上跑：启动后在浏览器里粘贴链接，选图片 / 文字 / 视频，点开始，剩下的扫描、下载、去重、命名、归档一气呵成，最后给你一个装好 manifest 的文件夹。",
      "设计上刻意把「复杂」留在后台：前端只有一条输入框和几个勾选项，进度、日志、文件流都在一个舞台里滚动，跑完直接给结果，不需要理解任何参数。",
    ],
    features: [
      {
        title: "粘贴即抓",
        desc: "支持普通网页、B 站视频页与 X 推文，一个链接就能开始，不需要写规则或选择器。",
      },
      {
        title: "四类资源一次收齐",
        desc: "图片、文字、视频（含音频）可多选，按类型自动分流到 images / videos / text 目录。",
      },
      {
        title: "自动去重与规范命名",
        desc: "按内容哈希去重，文件名统一规范，避免「未命名 (13).jpg」这类垃圾。",
      },
      {
        title: "实时进度与日志",
        desc: "扫描、下载、归档三个阶段可视化，配合实时日志与文件流，长任务也有掌控感。",
      },
      {
        title: "一键打包",
        desc: "任务结束后生成带 manifest.json 与 README 的 ZIP，直接下载或打开本地目录。",
      },
      {
        title: "任务队列",
        desc: "多个链接可以排队依次执行，前一个跑完自动接上下一个，适合批量囤素材。",
      },
    ],
    challenges: [
      {
        problem: "不同站点的资源结构差异极大",
        solution: "先做通用解析（DOM + 常见媒体标签），再针对 B 站 / X 这类平台加专门通道，兜底策略保证任何页面都能产出「能用的东西」。",
      },
      {
        problem: "大文件下载容易卡死或内存爆掉",
        solution: "流式写入 + 分片临时文件，按体积限额提前拦截，失败可重试而不影响已完成的资源。",
      },
      {
        problem: "门槛要低，但能力不能低",
        solution: "把高级选项折叠起来，默认值即可完成 90% 的场景；需要精细控制时再展开。",
      },
    ],
    devSteps: [
      { phase: "01", title: "抓取管线", desc: "先把「给一个 URL，返回资源清单」这件事跑通，确定去重与命名规则。" },
      { phase: "02", title: "任务模型", desc: "引入任务状态机（排队 / 运行 / 完成 / 失败 / 取消）与进度、日志、文件流。" },
      { phase: "03", title: "平台适配", desc: "为 B 站、X 推文补充专门解析，处理需要额外接口或多段合并的媒体。" },
      { phase: "04", title: "界面重做", desc: "把命令行能力包成一张单页：输入、勾选、舞台、结果，四块就够。" },
      { phase: "05", title: "归档与下载", desc: "生成 manifest、README 与 ZIP，让结果可以直接被别的工具消费。" },
    ],
    tech: ["Python（标准库 HTTP 服务）", "原生 JavaScript 前端", "HTML 解析 / 媒体嗅探", "ZIP 归档", "本地文件系统"],
    next: [
      "把平台适配做成插件式，方便继续加站点",
      "断点续传与失败重试的可视化",
      "可选的定时任务：盯住某个页面，有新内容就抓",
    ],
  },
  {
    slug: "shanhai",
    no: "03",
    title: "山海司 · 巡荒录",
    en: "SHAN HAI SI",
    kicker: "肉鸽 · 卡牌构筑 · 山海经",
    tagline: "观山海之形，驭异兽之性。",
    summary:
      "以《山海经》为题材的肉鸽爬塔卡牌游戏：一层层往上走，靠牌组构筑与异兽契约活下来。目前是可玩的 demo，美术素材正由多模态模型重制。",
    status: "Demo 开发中",
    statusTone: "demo",
    year: "2026",
    category: "游戏",
    tags: ["Roguelike", "卡牌构筑", "山海经"],
    cover: "/images/projects/shanhai/cover.jpg",
    gallery: [
      { src: "/images/projects/shanhai/menu.jpg", caption: "主界面：巡荒 / 图鉴 / 成就 / 经文" },
      { src: "/images/projects/shanhai/cover.jpg", caption: "战斗：三格站位、五行相生相克" },
      { src: "/images/projects/shanhai/codex.jpg", caption: "图鉴：160 张卡牌的收集与解锁" },
    ],
    demo: "/demo/shanhai/",
    stats: [
      { label: "卡牌", value: "160" },
      { label: "题材", value: "山海经" },
      { label: "阶段", value: "Demo" },
    ],
    overview: [
      "《山海经》里最迷人的不是怪物本身，而是它们被记录的方式：形、性、名，三言两语就立住一个世界。我想把这种「读条目」的感觉做成可以玩的牌局。",
      "核心是一套肉鸽爬塔结构：每次巡荒的地图、事件、遭遇都重新生成，靠牌组构筑和异兽契约一路往上。战斗采用三格站位与五行相生相克，让「摆在哪」和「打什么」同样重要。",
      "目前是可玩的 demo：主循环、卡牌、图鉴、成就、经文都已经跑通，160 张卡牌可收集。美术正在用多模态模型重制，所以现在看到的素材会继续换。",
    ],
    features: [
      {
        title: "肉鸽爬塔",
        desc: "每局重新生成路线与事件，失败不继承，靠对牌组与敌人的理解往上走。",
      },
      {
        title: "三格站位 + 五行克制",
        desc: "上阵位置决定攻防顺序，五行相生相克决定伤害倍率，站位与出牌同样关键。",
      },
      {
        title: "异兽契约",
        desc: "收服山海异兽作为牌组核心，不同的契约组合会带来完全不同的打法。",
      },
      {
        title: "图鉴与成就",
        desc: "160 张卡牌的收集、解锁与词条说明，配合成就系统记录每一次巡荒。",
      },
      {
        title: "经文系统",
        desc: "局内可叠加的规则改写，让每一局的构筑方向都不一样。",
      },
      {
        title: "新手教程",
        desc: "约三分钟的引导局，白泽带你走一遍基础规则再放开手。",
      },
    ],
    challenges: [
      {
        problem: "肉鸽的随机性容易变成「看脸」",
        solution: "把随机限制在路线与事件上，战斗内的数值保持可预期，让失败更多来自决策而不是运气。",
      },
      {
        problem: "山海经题材容易只剩皮",
        solution: "每张牌都从原文条目出发设计机制：形决定面板，性决定效果，名决定词条，尽量让考据和玩法咬合。",
      },
      {
        problem: "美术产能跟不上卡牌数量",
        solution: "用多模态模型批量生成初版素材先跑通玩法，再按优先级逐张重制，避免卡在美术上。",
      },
    ],
    devSteps: [
      { phase: "01", title: "规则原型", desc: "先用最小卡池验证三格站位与五行克制是否好玩，再决定扩展方向。" },
      { phase: "02", title: "引擎与数据", desc: "把卡牌、敌人、事件、地图生成拆成数据与引擎两层，方便持续加内容。" },
      { phase: "03", title: "内容扩充", desc: "把卡池扩到 160 张，补齐图鉴词条、成就与经文。" },
      { phase: "04", title: "美术重制", desc: "用模型生成统一风格的美术，逐张替换占位素材。" },
      { phase: "05", title: "打磨与上架", desc: "平衡数值、补教程与引导，完善后计划开源到 GitHub。" },
    ],
    tech: ["原生 JavaScript 游戏引擎", "Canvas / SVG 美术", "程序化地图生成", "卡牌数据驱动", "多模态模型生成素材"],
    next: [
      "完成全部卡牌的美术重制与统一风格",
      "补充章节内容与 Boss 设计",
      "数值平衡与新手引导打磨，之后开源到 GitHub",
    ],
  },
  {
    slug: "cardshop",
    no: "04",
    title: "卡牌店模拟经营",
    en: "CARD SHOP SIM",
    kicker: "模拟经营 · 像素 · 单机",
    tagline: "把一间小店，做成城市里的卡牌地标。",
    summary:
      "灵感来自 TCG 卡牌店模拟器：2D 像素画风的店铺经营游戏，采购开盒、定价上架、评级收藏、赛事活动，目前正在开发中，后续计划上架 GitHub。",
    status: "开发中",
    statusTone: "wip",
    year: "2026",
    category: "游戏",
    tags: ["模拟经营", "像素风", "单机"],
    cover: "/images/projects/cardshop/cover.jpg",
    gallery: [
      { src: "/images/projects/cardshop/cover.jpg", caption: "店铺视角：货架、收银台与顾客动线" },
      { src: "/images/projects/cardshop/cards.jpg", caption: "卡牌图鉴：356 张卡面与稀有度" },
      { src: "/images/projects/cardshop/facilities.jpg", caption: "设施与平板 APP：17 个可解锁的经营工具" },
    ],
    demo: "/demo/cardshop/",
    stats: [
      { label: "卡牌", value: "356" },
      { label: "底板", value: "8×8" },
      { label: "形态", value: "单机" },
    ],
    overview: [
      "我很喜欢 TCG 卡牌店模拟器那类游戏：不是打牌，而是经营一间靠牌吃饭的店。于是想做一个自己的版本——2D 像素、单机、可以一局一局开下去。",
      "玩家从一间空店开始：进货、开盒、定价、上架、应付砍价的顾客，慢慢添置设施、办比赛、做评级，把 8×8 的底板经营成城市里的卡牌地标。",
      "目前有两个可玩形态：Python + Pygame 的本地完整版，以及浏览器 Demo。两边共享同一套卡牌数据与美术资产，日常开发以浏览器版为主，方便随时打开试。",
    ],
    features: [
      {
        title: "采购与开盒",
        desc: "按系列进货，开盒的稀有度分布决定这一批货的利润空间，赌性与经营感并存。",
      },
      {
        title: "定价与上架",
        desc: "同一张卡的价格会随市场波动，定高了没人买，定低了亏本，还要应付顾客砍价。",
      },
      {
        title: "356 张卡牌图鉴",
        desc: "四个 IP 的卡池与自制卡面，覆盖不同稀有度与系列，收集与交易并行。",
      },
      {
        title: "店铺经营与设施",
        desc: "8×8 底板自由摆放货架、收银台与设施，17 个平板 APP 提供进阶经营工具。",
      },
      {
        title: "员工与顾客",
        desc: "员工可以分工补货、收银，顾客有各自的偏好与耐心，动线设计直接影响翻台率。",
      },
      {
        title: "赛事与快讯",
        desc: "办比赛拉动人气，厂商 LINK 快讯会带来限时活动与新系列。",
      },
    ],
    challenges: [
      {
        problem: "模拟经营很容易变成数值表格",
        solution: "把关键决策放进「看得见的店」里：货架摆哪、顾客走哪、收银排不排队，让经营感来自空间而不是菜单。",
      },
      {
        problem: "两套形态（Pygame / 浏览器）容易各写各的",
        solution: "抽出一层共享的卡牌与规则数据，两边只实现各自的表现层，避免数值分叉。",
      },
      {
        problem: "美术资产是最大的瓶颈",
        solution: "用本地 ComfyUI 批量生成像素素材，再用绑定管线统一裁剪、抠图与命名，保证风格一致。",
      },
    ],
    devSteps: [
      { phase: "01", title: "核心循环", desc: "进货 → 开盒 → 定价 → 卖出，先把这一圈跑通，确认「赚钱的手感」成立。" },
      { phase: "02", title: "空间与设施", desc: "8×8 底板、货架与收银台摆放，把经营从菜单搬到场景里。" },
      { phase: "03", title: "内容扩充", desc: "卡池扩到 356 张，补四个 IP 系列与稀有度体系。" },
      { phase: "04", title: "双端并行", desc: "Pygame 本地版与浏览器 Demo 共享数据，各自打磨操作手感。" },
      { phase: "05", title: "打磨与开源", desc: "补员工、赛事、平板 APP 等系统，完善后计划上架 GitHub。" },
    ],
    tech: ["JavaScript Canvas 游戏引擎", "Python + Pygame-CE", "ComfyUI 本地美术生成", "素材绑定管线（Python）", "localStorage 存档"],
    next: [
      "补齐员工分工与顾客偏好的深度互动",
      "赛事系统与厂商活动的长期运营感",
      "整理代码与文档，上架 GitHub 开源",
    ],
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);

export const categories = ["全部", ...Array.from(new Set(projects.map((p) => p.category)))];
