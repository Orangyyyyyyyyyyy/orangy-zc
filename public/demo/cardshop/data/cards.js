/* 卡牌素材：宝可梦示例 46 张 + 原创 10 张；游戏王/数码宝贝/海贼王由 ip_cards.js 注入（各 100 张） */
(function (root) {
  'use strict';
  const CS = (root.CS = root.CS || {});
  CS.CARDS = [
    { id: "sv3-149", name: "劈斩司令", nameEn: "Bisharp", tier: "N", series: "黑曜烈焰", rarity: "Common", img: "assets/cards/sv3-149.jpg" },
    { id: "sv3-178", name: "贪心栗鼠", nameEn: "Skwovet", tier: "N", series: "黑曜烈焰", rarity: "Common", img: "assets/cards/sv3-178.jpg" },
    { id: "sv3pt5-46", name: "派拉斯", nameEn: "Paras", tier: "N", series: "宝可梦151", rarity: "Common", img: "assets/cards/sv3pt5-46.jpg" },
    { id: "sv4-31", name: "海刺龙", nameEn: "Seadra", tier: "N", series: "悖论裂隙", rarity: "Common", img: "assets/cards/sv4-31.jpg" },
    { id: "sv4-95", name: "尖牙陆鲨", nameEn: "Gabite", tier: "N", series: "悖论裂隙", rarity: "Common", img: "assets/cards/sv4-95.jpg" },
    { id: "swsh10-122", name: "熊宝宝", nameEn: "Teddiursa", tier: "N", series: "星辉光芒", rarity: "Common", img: "assets/cards/swsh10-122.jpg" },
    { id: "swsh10-47", name: "冰宝", nameEn: "Bergmite", tier: "N", series: "星辉光芒", rarity: "Common", img: "assets/cards/swsh10-47.jpg" },
    { id: "swsh12pt5-112", name: "聒噪鸟", nameEn: "Chatot", tier: "N", series: "皇冠天顶", rarity: "Common", img: "assets/cards/swsh12pt5-112.jpg" },
    { id: "swsh7-81", name: "快拳郎", nameEn: "Hitmonchan", tier: "N", series: "进化天空", rarity: "Common", img: "assets/cards/swsh7-81.jpg" },
    { id: "me1-117", name: "Forest of Vitality", nameEn: "Forest of Vitality", tier: "U", series: "超级进化", rarity: "Uncommon", img: "assets/cards/me1-117.jpg" },
    { id: "me2pt5-203", name: "Team Rocket's Factory", nameEn: "Team Rocket's Factory", tier: "U", series: "升华英雄", rarity: "Uncommon", img: "assets/cards/me2pt5-203.jpg" },
    { id: "sv1-53", name: "涌跃鸭", nameEn: "Quaxwell", tier: "U", series: "朱红紫罗兰", rarity: "Uncommon", img: "assets/cards/sv1-53.jpg" },
    { id: "sv2-173", name: "Bravery Charm", nameEn: "Bravery Charm", tier: "U", series: "帕底亚进化", rarity: "Uncommon", img: "assets/cards/sv2-173.jpg" },
    { id: "sv4-166", name: "Luxurious Cape", nameEn: "Luxurious Cape", tier: "U", series: "悖论裂隙", rarity: "Uncommon", img: "assets/cards/sv4-166.jpg" },
    { id: "sv4pt5-22", name: "大电海燕", nameEn: "Kilowattrel", tier: "U", series: "帕底亚之命运", rarity: "Uncommon", img: "assets/cards/sv4pt5-22.jpg" },
    { id: "sv6-11", name: "叶伊布", nameEn: "Leafeon", tier: "U", series: "暮色假面", rarity: "Uncommon", img: "assets/cards/sv6-11.jpg" },
    { id: "swsh4-56", name: "电蜘蛛", nameEn: "Galvantula", tier: "U", series: "鲜艳电压", rarity: "Uncommon", img: "assets/cards/swsh4-56.jpg" },
    { id: "sv3pt5-134", name: "水伊布", nameEn: "Vaporeon", tier: "R", series: "宝可梦151", rarity: "Rare", img: "assets/cards/sv3pt5-134.jpg" },
    { id: "sv4-73", name: "拉帝欧斯", nameEn: "Latios", tier: "R", series: "悖论裂隙", rarity: "Rare", img: "assets/cards/sv4-73.jpg" },
    { id: "sv8pt5-25", name: "冰伊布", nameEn: "Glaceon", tier: "R", series: "棱镜进化", rarity: "Rare", img: "assets/cards/sv8pt5-25.jpg" },
    { id: "swsh10-48", name: "洗翠冰岩怪", nameEn: "Hisuian Avalugg", tier: "R", series: "星辉光芒", rarity: "Rare", img: "assets/cards/swsh10-48.jpg" },
    { id: "swsh3-63", name: "颤弦蝾螈", nameEn: "Toxtricity", tier: "R", series: "暗夜燃烧", rarity: "Rare Holo", img: "assets/cards/swsh3-63.jpg" },
    { id: "swsh3-68", name: "胖可丁", nameEn: "Wigglytuff", tier: "R", series: "暗夜燃烧", rarity: "Rare", img: "assets/cards/swsh3-68.jpg" },
    { id: "swsh9-41", name: "玛纳霏", nameEn: "Manaphy", tier: "R", series: "璀璨星辰", rarity: "Rare", img: "assets/cards/swsh9-41.jpg" },
    { id: "swsh9-83", name: "泥偶巨人", nameEn: "Golurk", tier: "R", series: "璀璨星辰", rarity: "Rare", img: "assets/cards/swsh9-83.jpg" },
    { id: "me2pt5-135", name: "超级头巾混混 ex", nameEn: "Mega Scrafty ex", tier: "RR", series: "升华英雄", rarity: "Double Rare", img: "assets/cards/me2pt5-135.jpg" },
    { id: "me2pt5-73", name: "密勒顿 ex", nameEn: "Miraidon ex", tier: "RR", series: "升华英雄", rarity: "Double Rare", img: "assets/cards/me2pt5-73.jpg" },
    { id: "sv6-77", name: "铁荆棘 ex", nameEn: "Iron Thorns ex", tier: "RR", series: "暮色假面", rarity: "Double Rare", img: "assets/cards/sv6-77.jpg" },
    { id: "sv7-82", name: "路卡利欧 ex", nameEn: "Lucario ex", tier: "RR", series: "星光王冠", rarity: "Double Rare", img: "assets/cards/sv7-82.jpg" },
    { id: "swsh10-49", name: "伽勒尔踏冰人偶 V", nameEn: "Galarian Mr. Rime V", tier: "RR", series: "星辉光芒", rarity: "Rare Holo V", img: "assets/cards/swsh10-49.jpg" },
    { id: "swsh2-110", name: "列阵兵 V", nameEn: "Falinks V", tier: "RR", series: "反叛冲突", rarity: "Rare Holo V", img: "assets/cards/swsh2-110.jpg" },
    { id: "swsh6-124", name: "龙卷云 V", nameEn: "Tornadus V", tier: "RR", series: "冰冷统治", rarity: "Rare Holo V", img: "assets/cards/swsh6-124.jpg" },
    { id: "me2pt5-234", name: "诅咒娃娃", nameEn: "Banette", tier: "AR", series: "升华英雄", rarity: "Illustration Rare", img: "assets/cards/me2pt5-234.jpg" },
    { id: "me4-91", name: "哲尔尼亚斯", nameEn: "Xerneas", tier: "AR", series: "混沌崛起", rarity: "Illustration Rare", img: "assets/cards/me4-91.jpg" },
    { id: "sv4-211", name: "长尾怪手", nameEn: "Aipom", tier: "AR", series: "悖论裂隙", rarity: "Illustration Rare", img: "assets/cards/sv4-211.jpg" },
    { id: "sv9-163", name: "奇树的大电海燕", nameEn: "Iono's Kilowattrel", tier: "AR", series: "旅程同行", rarity: "Illustration Rare", img: "assets/cards/sv9-163.jpg" },
    { id: "zsv10pt5-147", name: "双斧战龙", nameEn: "Haxorus", tier: "AR", series: "黑雷", rarity: "Illustration Rare", img: "assets/cards/zsv10pt5-147.jpg" },
    { id: "me3-101", name: "焰后蜥 ex", nameEn: "Salazzle ex", tier: "SR", series: "完美秩序", rarity: "Ultra Rare", img: "assets/cards/me3-101.jpg" },
    { id: "pgo-73", name: "修建老匠 V", nameEn: "Conkeldurr V", tier: "SR", series: "宝可梦GO", rarity: "Rare Ultra", img: "assets/cards/pgo-73.jpg" },
    { id: "swsh10-81", name: "光辉摔角鹰人", nameEn: "Radiant Hawlucha", tier: "SR", series: "星辉光芒", rarity: "Radiant Rare", img: "assets/cards/swsh10-81.jpg" },
    { id: "swsh9tg-TG15", name: "仙子伊布 VMAX", nameEn: "Sylveon VMAX", tier: "SR", series: "璀璨星辰_训练家画廊", rarity: "Rare Holo VMAX", img: "assets/cards/swsh9tg-TG15.jpg" },
    { id: "sv2-260", name: "狂欢浪舞鸭 ex", nameEn: "Quaquaval ex", tier: "SAR", series: "帕底亚进化", rarity: "Special Illustration Rare", img: "assets/cards/sv2-260.jpg" },
    { id: "sv2-269", name: "Iono", nameEn: "Iono", tier: "SAR", series: "帕底亚进化", rarity: "Special Illustration Rare", img: "assets/cards/sv2-269.jpg" },
    { id: "zsv10pt5-169", name: "盖诺赛克特 ex", nameEn: "Genesect ex", tier: "SAR", series: "黑雷", rarity: "Special Illustration Rare", img: "assets/cards/zsv10pt5-169.jpg" },
    { id: "swsh45-73", name: "霜奶仙 VMAX", nameEn: "Alcremie VMAX", tier: "UR", series: "闪耀命运", rarity: "Rare Rainbow", img: "assets/cards/swsh45-73.jpg" },
    { id: "swsh7-224", name: "Raihan", nameEn: "Raihan", tier: "UR", series: "进化天空", rarity: "Rare Rainbow", img: "assets/cards/swsh7-224.jpg" },
    /* ---- 原创卡池：cardshop 素材包自带的 10 张卡面（与宝可梦示例卡并存） ---- */
    { id: "orig-ember",  name: "焰灵",       nameEn: "Ember Sprite",     tier: "U",   series: "原创·元素序章", rarity: "Uncommon", img: "assets/art/art_ember.png" },
    { id: "orig-otter",  name: "溪獭",       nameEn: "Rivulet Otter",    tier: "N",   series: "原创·元素序章", rarity: "Common",   img: "assets/art/art_otter.png" },
    { id: "orig-golem",  name: "卵石魔像",   nameEn: "Pebble Golem",     tier: "N",   series: "原创·元素序章", rarity: "Common",   img: "assets/art/art_golem.png" },
    { id: "orig-owl",    name: "疾风枭",     nameEn: "Gust Owl",         tier: "U",   series: "原创·元素序章", rarity: "Uncommon", img: "assets/art/art_owl.png" },
    { id: "orig-fox",    name: "月影狐",     nameEn: "Moonlit Fox",      tier: "R",   series: "原创·元素序章", rarity: "Rare",     img: "assets/art/art_fox.png" },
    { id: "orig-hare",   name: "发条兔",     nameEn: "Clockwork Hare",   tier: "R",   series: "原创·元素序章", rarity: "Rare",     img: "assets/art/art_hare.png" },
    { id: "orig-volcano",name: "熔岩守卫",   nameEn: "Volcanic Guardian",tier: "RR",  series: "原创·传奇回响", rarity: "Double Rare", img: "assets/art/art_volcanic.png" },
    { id: "orig-tidal",  name: "潮汐巨兽",   nameEn: "Tidal Leviathan",  tier: "AR",  series: "原创·传奇回响", rarity: "Illustration Rare", img: "assets/art/art_tidal.png" },
    { id: "orig-seraph", name: "风暴炽天使", nameEn: "Storm Seraph",     tier: "SR",  series: "原创·传奇回响", rarity: "Ultra Rare", img: "assets/art/art_seraph.png" },
    { id: "orig-bloom",  name: "远古花灵",   nameEn: "Ancient Bloom",    tier: "SAR", series: "原创·传奇回响", rarity: "Special Illustration Rare", img: "assets/art/art_bloom.png" },
  ];

  /* IP 同步：现有 56 张示例/原创卡归属第一 IP「宝可梦」；其余 IP 由 ip_cards.js 注入 */
  for (const c of CS.CARDS) {
    if (!c.ip) { c.ip = 'pokemon'; c.ipName = '宝可梦'; c.ipOrder = 1; }
  }
  if (CS.IP_CARDS && CS.IP_CARDS.length) CS.CARDS = CS.CARDS.concat(CS.IP_CARDS);
})(typeof window !== 'undefined' ? window : globalThis);
