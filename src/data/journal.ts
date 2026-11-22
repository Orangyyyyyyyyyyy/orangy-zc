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
 *
 * 目前清空：等真正写完一篇再往里加，不再预留占位条目。
 */
export const journal: JournalEntry[] = [];
