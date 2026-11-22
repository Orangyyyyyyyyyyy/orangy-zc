export interface JournalEntry {
  date: string;
  category: string;
  title: string;
  excerpt: string;
  href: string;
}

/**
 * 随笔条目。首页只做索引，正式正文逐步补到 /notes/。
 * 写作主题与作品集里的项目一一对应，不做无来源的叙事。
 */
export const journal: JournalEntry[] = [
  {
    date: "2026 · 11",
    category: "Engineering",
    title: "把一幅画拆成六层：视差的空间从哪里来",
    excerpt:
      "视差不是给背景加动画。先把画面分出前、中、后，再让每一层走不同的距离——顺序错了，再顺滑的动画也只是在抖。",
    href: "/notes/",
  },
  {
    date: "2026 · 10",
    category: "Notes",
    title: "本地优先：为什么工作台的数据不上云",
    excerpt:
      "业务数据留在浏览器里，密钥由本人口令派生。放弃的是多端同步的便利，换来的是不用向任何人解释自己的记录。",
    href: "/notes/",
  },
  {
    date: "2026 · 09",
    category: "Design",
    title: "一间卡牌店的经济系统，先在纸上算完",
    excerpt:
      "进货、上架、开箱概率和现金流，先在纸上跑一遍，再去写第一行代码。数值不对，界面做得再好看也只是个空壳。",
    href: "/notes/",
  },
];
