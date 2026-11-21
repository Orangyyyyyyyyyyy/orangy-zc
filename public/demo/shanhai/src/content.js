/* ============================================================
 * 山海司·巡荒录  —  P0 内容层全量（遗物/敌人/事件/巡吏/流派/关键词/成就/荒阶）
 * 由 tools/build_content.py 从 P0完善.docx 生成，请勿手改。
 * ============================================================ */
(function (root) {
  'use strict';
  const SH = (root.SH = root.SH || {});
  SH.RELICS = [
  {
    "id": "R_001",
    "name": "狰之牙",
    "rarity": "normal",
    "timing": "afterFeral",
    "tags": [
      "凶化"
    ],
    "text": "随机敌人 2 伤害",
    "conflict": [],
    "negative": "",
    "effects": [
      {
        "op": "dmg",
        "target": "random",
        "v": 2
      }
    ]
  },
  {
    "id": "R_002",
    "name": "白泽图",
    "rarity": "normal",
    "timing": "firstFlip",
    "tags": [
      "驯化",
      "翻面"
    ],
    "text": "不消耗灵气",
    "conflict": [],
    "negative": "",
    "heroOnly": "baiZe",
    "mods": {
      "firstFlipFree": 1
    }
  },
  {
    "id": "R_005",
    "name": "灵涌之环",
    "rarity": "normal",
    "timing": "gainLingyong",
    "tags": [
      "相生"
    ],
    "text": "50% 额外 +1（仍限 +2）",
    "conflict": [
      "R_006"
    ],
    "negative": "",
    "mods": {
      "lingyongChance": 0.5
    }
  },
  {
    "id": "R_008",
    "name": "金脉罗盘",
    "rarity": "normal",
    "timing": "battleStart",
    "tags": [
      "地形",
      "金"
    ],
    "text": "金脉地形 +1 攻",
    "conflict": [],
    "negative": "",
    "mods": {
      "jinmaiAtk": 1
    }
  },
  {
    "id": "R_013",
    "name": "鹿蜀铃",
    "rarity": "normal",
    "timing": "summon",
    "tags": [
      "召唤"
    ],
    "text": "召唤异兽 +1 生命",
    "conflict": [],
    "negative": "",
    "mods": {
      "summonHp": 1
    }
  },
  {
    "id": "R_017",
    "name": "荒髓袋",
    "rarity": "normal",
    "timing": "gainHusui",
    "tags": [
      "经济"
    ],
    "text": "+2 荒髓",
    "conflict": [],
    "negative": "",
    "mods": {
      "husuiBonus": 2
    }
  },
  {
    "id": "R_021",
    "name": "石肤符",
    "rarity": "normal",
    "timing": "battleStart",
    "tags": [
      "前排"
    ],
    "text": "前哨格异兽 +2 生命",
    "conflict": [],
    "negative": "",
    "mods": {
      "frontHp": 2
    }
  },
  {
    "id": "R_022",
    "name": "风铃",
    "rarity": "normal",
    "timing": "turnStart",
    "tags": [
      "抽牌"
    ],
    "text": "每场 1 次，额外抽 1",
    "conflict": [],
    "negative": "",
    "mods": {
      "turnStartDrawOnce": 1
    },
    "once": "battle"
  },
  {
    "id": "R_023",
    "name": "鹿角",
    "rarity": "normal",
    "timing": "summon",
    "tags": [
      "召唤"
    ],
    "text": "召唤异兽 +1 攻击",
    "conflict": [
      "R_062"
    ],
    "negative": "",
    "mods": {
      "summonAtk": 1
    }
  },
  {
    "id": "R_024",
    "name": "荒草",
    "rarity": "normal",
    "timing": "battleEnd",
    "tags": [
      "回复"
    ],
    "text": "回复 3 生命",
    "conflict": [],
    "negative": "",
    "effects": [
      {
        "op": "heal",
        "v": 3
      }
    ]
  },
  {
    "id": "R_025",
    "name": "铜钱串",
    "rarity": "normal",
    "timing": "gainHusui",
    "tags": [
      "经济"
    ],
    "text": "+3 荒髓",
    "conflict": [
      "R_066"
    ],
    "negative": "",
    "mods": {
      "husuiBonus": 3
    }
  },
  {
    "id": "R_026",
    "name": "赤绳",
    "rarity": "normal",
    "timing": "afterFeral",
    "tags": [
      "凶化"
    ],
    "text": "该牌自损 -1（最低 1）",
    "conflict": [],
    "negative": "",
    "mods": {
      "feralSelfReduce": 1
    }
  },
  {
    "id": "R_027",
    "name": "青囊",
    "rarity": "normal",
    "timing": "afterTame",
    "tags": [
      "驯化",
      "回复"
    ],
    "text": "回复 2 生命",
    "conflict": [],
    "negative": "",
    "effects": [
      {
        "op": "heal",
        "v": 2
      }
    ]
  },
  {
    "id": "R_028",
    "name": "灵木枝",
    "rarity": "normal",
    "timing": "chain",
    "tags": [
      "相生"
    ],
    "text": "额外 +1 灵涌（每回合 1 次）",
    "conflict": [
      "R_060"
    ],
    "negative": "",
    "mods": {
      "chainLingyongOnce": 1
    },
    "once": "turn"
  },
  {
    "id": "R_029",
    "name": "冰晶",
    "rarity": "normal",
    "timing": "status",
    "tags": [
      "控制",
      "水"
    ],
    "text": "额外 +1 层",
    "conflict": [],
    "negative": "",
    "mods": {
      "statusBonus": {
        "冻缓": 1
      }
    }
  },
  {
    "id": "R_030",
    "name": "火种",
    "rarity": "normal",
    "timing": "status",
    "tags": [
      "控制",
      "火"
    ],
    "text": "额外 +1 层",
    "conflict": [],
    "negative": "",
    "mods": {
      "statusBonus": {
        "灼烧": 1
      }
    }
  },
  {
    "id": "R_031",
    "name": "裂甲石",
    "rarity": "normal",
    "timing": "status",
    "tags": [
      "控制",
      "金"
    ],
    "text": "额外 +1 层",
    "conflict": [],
    "negative": "",
    "mods": {
      "statusBonus": {
        "裂甲": 1
      }
    }
  },
  {
    "id": "R_032",
    "name": "缠绕藤",
    "rarity": "normal",
    "timing": "status",
    "tags": [
      "控制",
      "木"
    ],
    "text": "额外 +1 层",
    "conflict": [],
    "negative": "",
    "mods": {
      "statusBonus": {
        "缠绕": 1
      }
    }
  },
  {
    "id": "R_033",
    "name": "土牢符",
    "rarity": "normal",
    "timing": "status",
    "tags": [
      "控制",
      "土"
    ],
    "text": "额外 +1 层",
    "conflict": [],
    "negative": "",
    "mods": {
      "statusBonus": {
        "土牢": 1
      }
    }
  },
  {
    "id": "R_034",
    "name": "破旧罗盘",
    "rarity": "normal",
    "timing": "node",
    "tags": [
      "节点"
    ],
    "text": "事件首次显示全部选项",
    "conflict": [],
    "negative": "",
    "mods": {
      "eventAllOptions": 1
    }
  },
  {
    "id": "R_035",
    "name": "巡吏旧印",
    "rarity": "normal",
    "timing": "battleStart",
    "tags": [
      "经济"
    ],
    "text": "首回合灵气 +1",
    "conflict": [],
    "negative": "",
    "mods": {
      "battleStartQi": 1
    }
  },
  {
    "id": "R_036",
    "name": "兽骨",
    "rarity": "normal",
    "timing": "kill",
    "tags": [
      "击杀",
      "回复"
    ],
    "text": "回复 2 生命",
    "conflict": [],
    "negative": "",
    "effects": [
      {
        "op": "heal",
        "v": 2
      }
    ]
  },
  {
    "id": "R_037",
    "name": "羽饰",
    "rarity": "normal",
    "timing": "flip",
    "tags": [
      "翻面"
    ],
    "text": "该牌费用 -1（每回合 1 次）",
    "conflict": [
      "R_010",
      "R_051"
    ],
    "negative": "",
    "mods": {
      "flipDiscountOnce": 1
    }
  },
  {
    "id": "R_038",
    "name": "石碗",
    "rarity": "normal",
    "timing": "battleEnd",
    "tags": [
      "经济"
    ],
    "text": "获得 5 荒髓",
    "conflict": [],
    "negative": "",
    "effects": [
      {
        "op": "husui",
        "v": 5
      }
    ]
  },
  {
    "id": "R_039",
    "name": "木盾",
    "rarity": "normal",
    "timing": "battleStart",
    "tags": [
      "防御"
    ],
    "text": "获得 4 护盾",
    "conflict": [],
    "negative": "",
    "effects": [
      {
        "op": "shield",
        "v": 4
      }
    ]
  },
  {
    "id": "R_040",
    "name": "火把",
    "rarity": "normal",
    "timing": "battleStart",
    "tags": [
      "伤害"
    ],
    "text": "对所有敌人 1 伤害",
    "conflict": [],
    "negative": "",
    "effects": [
      {
        "op": "dmg",
        "target": "all",
        "v": 1
      }
    ]
  },
  {
    "id": "R_041",
    "name": "水囊",
    "rarity": "normal",
    "timing": "turnStart",
    "tags": [
      "回复"
    ],
    "text": "每回合 1 次，回复 1 生命",
    "conflict": [],
    "negative": "",
    "mods": {
      "turnStartHealOnce": 1
    },
    "once": "turn"
  },
  {
    "id": "R_042",
    "name": "金砂",
    "rarity": "normal",
    "timing": "damage",
    "tags": [
      "相克",
      "金"
    ],
    "text": "金系伤害 +1",
    "conflict": [],
    "negative": "",
    "mods": {
      "elementBonus": {
        "金": 1
      }
    }
  },
  {
    "id": "R_043",
    "name": "藤蔓护腕",
    "rarity": "normal",
    "timing": "damage",
    "tags": [
      "相克",
      "木"
    ],
    "text": "木系伤害 +1",
    "conflict": [],
    "negative": "",
    "mods": {
      "elementBonus": {
        "木": 1
      }
    }
  },
  {
    "id": "R_044",
    "name": "珍珠",
    "rarity": "normal",
    "timing": "damage",
    "tags": [
      "相克",
      "水"
    ],
    "text": "水系伤害 +1",
    "conflict": [],
    "negative": "",
    "mods": {
      "elementBonus": {
        "水": 1
      }
    }
  },
  {
    "id": "R_003",
    "name": "招摇山图",
    "rarity": "rare",
    "timing": "turnEnd",
    "tags": [
      "前排"
    ],
    "text": "前哨格异兽 +2 攻，失去 1 生命",
    "conflict": [],
    "negative": "",
    "heroOnly": "zhaoYao",
    "effects": [
      {
        "op": "frontAtk",
        "v": 2
      },
      {
        "op": "loseHp",
        "v": 1
      }
    ]
  },
  {
    "id": "R_004",
    "name": "烛阴之瞳",
    "rarity": "rare",
    "timing": "flip",
    "tags": [
      "翻面",
      "昼夜"
    ],
    "text": "抽 1，回复 1 灵气",
    "conflict": [
      "R_070"
    ],
    "negative": "",
    "effects": [
      {
        "op": "draw",
        "v": 1
      },
      {
        "op": "qi",
        "v": 1
      }
    ]
  },
  {
    "id": "R_007",
    "name": "荒蚀净化灯",
    "rarity": "rare",
    "timing": "erode",
    "tags": [
      "荒蚀"
    ],
    "text": "每场 1 次，净化 1 个荒蚀",
    "conflict": [
      "R_059"
    ],
    "negative": "",
    "mods": {
      "purifyPerBattle": 1
    },
    "effects": [
      {
        "op": "purify"
      }
    ],
    "once": "battle"
  },
  {
    "id": "R_010",
    "name": "九尾幻尾",
    "rarity": "rare",
    "timing": "flip",
    "tags": [
      "翻面",
      "凶化"
    ],
    "text": "该牌本回合费用 -1",
    "conflict": [
      "R_037",
      "R_051"
    ],
    "negative": "",
    "mods": {
      "flipDiscount": 1
    }
  },
  {
    "id": "R_014",
    "name": "穷奇爪",
    "rarity": "rare",
    "timing": "kill",
    "tags": [
      "凶化",
      "击杀"
    ],
    "text": "本回合凶化牌费用 -1",
    "conflict": [],
    "negative": "",
    "heroOnly": "qiongQi",
    "mods": {
      "feralDiscountOnKill": 1
    }
  },
  {
    "id": "R_018",
    "name": "巡荒令",
    "rarity": "rare",
    "timing": "node",
    "tags": [
      "经济",
      "节点"
    ],
    "text": "每卷首次坊市刷新免费",
    "conflict": [],
    "negative": "",
    "mods": {
      "freeRefresh": 1
    },
    "once": "volume"
  },
  {
    "id": "R_045",
    "name": "白虎牙",
    "rarity": "rare",
    "timing": "counter",
    "tags": [
      "相克",
      "抽牌"
    ],
    "text": "每回合 1 次，抽 1",
    "conflict": [],
    "negative": "",
    "mods": {
      "counterDrawOnce": 1
    },
    "once": "turn"
  },
  {
    "id": "R_046",
    "name": "青龙鳞",
    "rarity": "rare",
    "timing": "chain",
    "tags": [
      "相生",
      "回复"
    ],
    "text": "回复 1 生命",
    "conflict": [],
    "negative": "",
    "effects": [
      {
        "op": "heal",
        "v": 1
      }
    ]
  },
  {
    "id": "R_047",
    "name": "玄武甲",
    "rarity": "rare",
    "timing": "battleStart",
    "tags": [
      "防御"
    ],
    "text": "获得 10 护盾",
    "conflict": [
      "R_076"
    ],
    "negative": "",
    "effects": [
      {
        "op": "shield",
        "v": 10
      }
    ]
  },
  {
    "id": "R_048",
    "name": "朱雀羽",
    "rarity": "rare",
    "timing": "status",
    "tags": [
      "控制",
      "抽牌"
    ],
    "text": "额外 +1 层；每回合 1 次抽 1",
    "conflict": [],
    "negative": "",
    "mods": {
      "statusBonus": {
        "灼烧": 1
      },
      "burnDrawOnce": 1
    },
    "once": "turn"
  },
  {
    "id": "R_049",
    "name": "相柳血",
    "rarity": "rare",
    "timing": "enemyTurnEnd",
    "tags": [
      "伤害"
    ],
    "text": "随机敌人 1 伤害",
    "conflict": [],
    "negative": "",
    "effects": [
      {
        "op": "dmg",
        "target": "random",
        "v": 1
      }
    ]
  },
  {
    "id": "R_050",
    "name": "穷奇角",
    "rarity": "rare",
    "timing": "kill",
    "tags": [
      "击杀",
      "相生"
    ],
    "text": "获得 1 灵涌",
    "conflict": [],
    "negative": "",
    "effects": [
      {
        "op": "lingyong",
        "v": 1
      }
    ]
  },
  {
    "id": "R_051",
    "name": "九尾尾",
    "rarity": "rare",
    "timing": "flip",
    "tags": [
      "翻面"
    ],
    "text": "该牌费用 -1，抽 1 弃 1",
    "conflict": [
      "R_010",
      "R_037"
    ],
    "negative": "",
    "mods": {
      "flipDiscountOnce": 1,
      "flipDrawDiscard": 1
    }
  },
  {
    "id": "R_052",
    "name": "英招羽",
    "rarity": "rare",
    "timing": "turnStart",
    "tags": [
      "相生"
    ],
    "text": "手牌 1 张减费 1",
    "conflict": [],
    "negative": "",
    "mods": {
      "turnStartDiscount": 1
    }
  },
  {
    "id": "R_053",
    "name": "帝江囊",
    "rarity": "rare",
    "timing": "flip",
    "tags": [
      "翻面",
      "伤害"
    ],
    "text": "随机敌人 2 伤害",
    "conflict": [],
    "negative": "",
    "effects": [
      {
        "op": "dmg",
        "target": "random",
        "v": 2
      }
    ]
  },
  {
    "id": "R_054",
    "name": "蓐收刃",
    "rarity": "rare",
    "timing": "damage",
    "tags": [
      "相克",
      "金"
    ],
    "text": "金系伤害 +2",
    "conflict": [
      "R_042"
    ],
    "negative": "",
    "mods": {
      "elementBonus": {
        "金": 2
      }
    }
  },
  {
    "id": "R_055",
    "name": "句芒种",
    "rarity": "rare",
    "timing": "damage",
    "tags": [
      "相克",
      "木"
    ],
    "text": "木系伤害 +2",
    "conflict": [
      "R_043"
    ],
    "negative": "",
    "mods": {
      "elementBonus": {
        "木": 2
      }
    }
  },
  {
    "id": "R_056",
    "name": "玄冥珠",
    "rarity": "rare",
    "timing": "damage",
    "tags": [
      "相克",
      "水"
    ],
    "text": "水系伤害 +2",
    "conflict": [
      "R_044"
    ],
    "negative": "",
    "mods": {
      "elementBonus": {
        "水": 2
      }
    }
  },
  {
    "id": "R_057",
    "name": "祝融火",
    "rarity": "rare",
    "timing": "damage",
    "tags": [
      "相克",
      "火"
    ],
    "text": "火系伤害 +2",
    "conflict": [],
    "negative": "",
    "mods": {
      "elementBonus": {
        "火": 2
      }
    }
  },
  {
    "id": "R_058",
    "name": "后土印",
    "rarity": "rare",
    "timing": "damage",
    "tags": [
      "相克",
      "土"
    ],
    "text": "土系伤害 +2",
    "conflict": [],
    "negative": "",
    "mods": {
      "elementBonus": {
        "土": 2
      }
    }
  },
  {
    "id": "R_059",
    "name": "荒蚀镜",
    "rarity": "rare",
    "timing": "erode",
    "tags": [
      "荒蚀",
      "抽牌"
    ],
    "text": "每场 1 次，净化 1 荒蚀并抽 1",
    "conflict": [
      "R_007"
    ],
    "negative": "",
    "mods": {
      "purifyPerBattle": 1
    },
    "effects": [
      {
        "op": "purify"
      },
      {
        "op": "draw",
        "v": 1
      }
    ],
    "once": "battle"
  },
  {
    "id": "R_060",
    "name": "灵涌瓶",
    "rarity": "rare",
    "timing": "gainLingyong",
    "tags": [
      "相生"
    ],
    "text": "每回合 1 次，额外 +1",
    "conflict": [
      "R_028"
    ],
    "negative": "",
    "mods": {
      "lingyongOnce": 1
    },
    "once": "turn"
  },
  {
    "id": "R_061",
    "name": "兽皮甲",
    "rarity": "rare",
    "timing": "battleStart",
    "tags": [
      "前排"
    ],
    "text": "所有异兽 +2 生命",
    "conflict": [],
    "negative": "",
    "mods": {
      "battleStartUnitHp": 2
    }
  },
  {
    "id": "R_062",
    "name": "妖骨笛",
    "rarity": "rare",
    "timing": "summon",
    "tags": [
      "召唤"
    ],
    "text": "召唤异兽 +1 攻 +1 生命",
    "conflict": [
      "R_023"
    ],
    "negative": "",
    "mods": {
      "summonAtk": 1,
      "summonHp": 1
    }
  },
  {
    "id": "R_063",
    "name": "古祭坛残片",
    "rarity": "rare",
    "timing": "afterRitual",
    "tags": [
      "祭仪",
      "回复"
    ],
    "text": "回复 3 生命",
    "conflict": [],
    "negative": "",
    "effects": [
      {
        "op": "heal",
        "v": 3
      }
    ]
  },
  {
    "id": "R_064",
    "name": "山泽图",
    "rarity": "rare",
    "timing": "afterTerrain",
    "tags": [
      "山泽",
      "抽牌"
    ],
    "text": "抽 1",
    "conflict": [],
    "negative": "",
    "effects": [
      {
        "op": "draw",
        "v": 1
      }
    ]
  },
  {
    "id": "R_065",
    "name": "术法卷",
    "rarity": "rare",
    "timing": "afterSpell",
    "tags": [
      "术法",
      "相生"
    ],
    "text": "获得 1 灵涌",
    "conflict": [],
    "negative": "",
    "effects": [
      {
        "op": "lingyong",
        "v": 1
      }
    ]
  },
  {
    "id": "R_066",
    "name": "荒髓袋·大",
    "rarity": "rare",
    "timing": "gainHusui",
    "tags": [
      "经济"
    ],
    "text": "+5 荒髓",
    "conflict": [
      "R_025"
    ],
    "negative": "",
    "mods": {
      "husuiBonus": 5
    }
  },
  {
    "id": "R_067",
    "name": "巡荒灯笼",
    "rarity": "rare",
    "timing": "node",
    "tags": [
      "节点",
      "回复"
    ],
    "text": "生命回复 +50%",
    "conflict": [],
    "negative": "",
    "mods": {
      "healBonus": 0.5
    }
  },
  {
    "id": "R_068",
    "name": "五行盘",
    "rarity": "rare",
    "timing": "chain",
    "tags": [
      "相生",
      "抽牌"
    ],
    "text": "每回合 1 次，抽 1",
    "conflict": [],
    "negative": "",
    "mods": {
      "chainDrawOnce": 1
    },
    "once": "turn"
  },
  {
    "id": "R_009",
    "name": "刑天战鼓",
    "rarity": "epic",
    "timing": "afterRitual",
    "tags": [
      "祭仪",
      "自损"
    ],
    "text": "本回合异兽 +3 攻；回合结束自损 3",
    "conflict": [],
    "negative": "",
    "effects": [
      {
        "op": "buffUnits",
        "atk": 3
      }
    ],
    "special": "drum"
  },
  {
    "id": "R_012",
    "name": "山神契",
    "rarity": "epic",
    "timing": "shrine",
    "tags": [
      "誓约"
    ],
    "text": "恢复 +50%；誓约负面不可解",
    "conflict": [],
    "negative": "",
    "mods": {
      "healBonus": 0.5,
      "omenLock": 1
    }
  },
  {
    "id": "R_015",
    "name": "相柳毒囊",
    "rarity": "epic",
    "timing": "enemyTurnEnd",
    "tags": [
      "控制",
      "水"
    ],
    "text": "所有敌人 +1 冻缓层",
    "conflict": [
      "R_016"
    ],
    "negative": "",
    "effects": [
      {
        "op": "status",
        "target": "all",
        "s": "冻缓",
        "v": 1
      }
    ]
  },
  {
    "id": "R_019",
    "name": "烛龙逆鳞",
    "rarity": "epic",
    "timing": "daynight",
    "tags": [
      "昼夜"
    ],
    "text": "全体敌人 2 伤害",
    "conflict": [
      "R_071"
    ],
    "negative": "",
    "effects": [
      {
        "op": "dmg",
        "target": "all",
        "v": 2
      }
    ]
  },
  {
    "id": "R_069",
    "name": "巫咸蓍草",
    "rarity": "epic",
    "timing": "battleStart",
    "tags": [
      "术法",
      "相生"
    ],
    "text": "首回合抽 2，灵涌 +1",
    "conflict": [],
    "negative": "",
    "heroOnly": "wuXian",
    "effects": [
      {
        "op": "draw",
        "v": 2
      },
      {
        "op": "lingyong",
        "v": 1
      }
    ]
  },
  {
    "id": "R_070",
    "name": "白泽图·真",
    "rarity": "epic",
    "timing": "flip",
    "tags": [
      "翻面"
    ],
    "text": "抽 1，回 1 灵气",
    "conflict": [
      "R_004"
    ],
    "negative": "",
    "effects": [
      {
        "op": "draw",
        "v": 1
      },
      {
        "op": "qi",
        "v": 1
      }
    ]
  },
  {
    "id": "R_071",
    "name": "烛龙眼",
    "rarity": "epic",
    "timing": "daynight",
    "tags": [
      "昼夜",
      "伤害"
    ],
    "text": "全体敌人 2 伤害，抽 1",
    "conflict": [
      "R_019"
    ],
    "negative": "",
    "effects": [
      {
        "op": "dmg",
        "target": "all",
        "v": 2
      },
      {
        "op": "draw",
        "v": 1
      }
    ]
  },
  {
    "id": "R_072",
    "name": "刑天战甲",
    "rarity": "epic",
    "timing": "hpPay",
    "tags": [
      "自损",
      "抽牌"
    ],
    "text": "自损 -1（最低 1）；每回合首次自损抽 1",
    "conflict": [
      "R_020"
    ],
    "negative": "",
    "mods": {
      "hpPayReduce": 1,
      "firstSelfDraw": 1
    }
  },
  {
    "id": "R_073",
    "name": "饕餮口",
    "rarity": "epic",
    "timing": "kill",
    "tags": [
      "击杀",
      "经济"
    ],
    "text": "回复 5 生命，获得 3 荒髓",
    "conflict": [],
    "negative": "",
    "effects": [
      {
        "op": "heal",
        "v": 5
      },
      {
        "op": "husui",
        "v": 3
      }
    ]
  },
  {
    "id": "R_074",
    "name": "相柳毒牙",
    "rarity": "epic",
    "timing": "enemyTurnEnd",
    "tags": [
      "控制",
      "水"
    ],
    "text": "所有敌人 1 层冻缓",
    "conflict": [
      "R_015"
    ],
    "negative": "",
    "effects": [
      {
        "op": "status",
        "target": "all",
        "s": "冻缓",
        "v": 1
      }
    ]
  },
  {
    "id": "R_075",
    "name": "朱雀冠",
    "rarity": "epic",
    "timing": "status",
    "tags": [
      "控制",
      "火"
    ],
    "text": "额外 +2 层",
    "conflict": [
      "R_048"
    ],
    "negative": "",
    "mods": {
      "statusBonus": {
        "灼烧": 2
      }
    }
  },
  {
    "id": "R_076",
    "name": "玄武壳",
    "rarity": "epic",
    "timing": "battleStart",
    "tags": [
      "防御",
      "前排"
    ],
    "text": "获得 15 护盾，所有异兽 +2 生命",
    "conflict": [
      "R_047"
    ],
    "negative": "",
    "mods": {
      "battleStartUnitHp": 2
    },
    "effects": [
      {
        "op": "shield",
        "v": 15
      }
    ]
  },
  {
    "id": "R_077",
    "name": "青龙角",
    "rarity": "epic",
    "timing": "chain",
    "tags": [
      "相生"
    ],
    "text": "每回合 1 次，额外 +2 灵涌",
    "conflict": [
      "R_028",
      "R_060"
    ],
    "negative": "",
    "mods": {
      "chainLingyongOnce": 2
    }
  },
  {
    "id": "R_078",
    "name": "白虎爪",
    "rarity": "epic",
    "timing": "counter",
    "tags": [
      "相克",
      "伤害"
    ],
    "text": "每回合 1 次，全体敌人 2 伤害",
    "conflict": [],
    "negative": "",
    "mods": {
      "counterAoeOnce": 2
    },
    "once": "turn"
  },
  {
    "id": "R_079",
    "name": "荒痕之眼",
    "rarity": "epic",
    "timing": "battleStart",
    "tags": [
      "地形"
    ],
    "text": "本场荒痕格 +1",
    "conflict": [],
    "negative": "",
    "mods": {
      "extraCell": 1
    },
    "notReady": true
  },
  {
    "id": "R_006",
    "name": "噬灵铃",
    "rarity": "curse",
    "timing": "gainLingyong",
    "tags": [
      "相生",
      "自损"
    ],
    "text": "灵涌 +1；负面：每回合开始失去 2 生命",
    "conflict": [],
    "negative": "每回合开始失去 2 生命",
    "mods": {
      "lingyongPlus": 1
    },
    "effects": [
      {
        "op": "loseHp",
        "v": 2
      }
    ],
    "special": "lingyongUpkeep"
  },
  {
    "id": "R_011",
    "name": "饕餮之胃",
    "rarity": "curse",
    "timing": "kill",
    "tags": [
      "击杀",
      "经济"
    ],
    "text": "回复 5 生命；负面：荒髓获取 -20%",
    "conflict": [],
    "negative": "荒髓获取 -20%",
    "mods": {
      "husuiGainPct": -0.2
    },
    "effects": [
      {
        "op": "heal",
        "v": 5
      }
    ]
  },
  {
    "id": "R_016",
    "name": "镇岳印",
    "rarity": "curse",
    "timing": "battleStart",
    "tags": [
      "控制",
      "相生"
    ],
    "text": "免疫缠绕、土牢；负面：相生每回合 -1 次",
    "conflict": [],
    "negative": "相生每回合 -1 次",
    "mods": {
      "immuneControl": 1,
      "chainLimitDelta": -1
    }
  },
  {
    "id": "R_020",
    "name": "刑天首",
    "rarity": "curse",
    "timing": "hpPay",
    "tags": [
      "自损",
      "生命"
    ],
    "text": "支付生命减半；负面：最大生命 -10",
    "conflict": [],
    "negative": "最大生命 -10",
    "mods": {
      "hpPayHalf": 1,
      "maxHp": -10
    }
  },
  {
    "id": "R_080",
    "name": "大荒之种",
    "rarity": "curse",
    "timing": "battleStart",
    "tags": [
      "召唤",
      "荒蚀"
    ],
    "text": "所有异兽 +3 攻 +3 生命；负面：荒蚀不可净化",
    "conflict": [],
    "negative": "荒蚀不可净化",
    "mods": {
      "battleStartUnitAtk": 3,
      "battleStartUnitHp": 3,
      "erodeBlock": 1
    }
  }
];
  SH.ENEMIES = [
  {
    "id": "E101",
    "name": "狰",
    "act": 1,
    "kind": "normal",
    "element": "金",
    "hp": 22,
    "atk": 6,
    "advance": 1,
    "intent": {
      "attack": 60,
      "defend": 10,
      "status": 10,
      "summon": 0,
      "advance": 10,
      "charge": 10
    },
    "specials": [
      "selfBleed"
    ],
    "drop": "12 荒髓 + 卡牌三选一",
    "text": "攻击后自损 1",
    "lore": "状如赤豹，五尾一角，音如击石"
  },
  {
    "id": "E102",
    "name": "蛊雕幼体",
    "act": 1,
    "kind": "normal",
    "element": "水",
    "hp": 18,
    "atk": 5,
    "advance": 1,
    "intent": {
      "attack": 40,
      "defend": 10,
      "status": 25,
      "summon": 5,
      "advance": 10,
      "charge": 10
    },
    "specials": [
      "shriek"
    ],
    "drop": "12 荒髓 + 卡牌三选一",
    "text": "尖啸施加冻缓 1",
    "lore": "水中有翼之兽，幼体尖啸"
  },
  {
    "id": "E103",
    "name": "鹿蜀",
    "act": 1,
    "kind": "normal",
    "element": "木",
    "hp": 26,
    "atk": 5,
    "advance": 1,
    "intent": {
      "attack": 45,
      "defend": 10,
      "status": 10,
      "summon": 20,
      "advance": 10,
      "charge": 5
    },
    "specials": [
      "summonDeer"
    ],
    "drop": "12 荒髓 + 卡牌三选一",
    "text": "每 2 回合召唤鹿影 6/3",
    "lore": "状如马而白首，纹如虎而赤尾"
  },
  {
    "id": "E104",
    "name": "狸力",
    "act": 1,
    "kind": "normal",
    "element": "土",
    "hp": 24,
    "atk": 5,
    "advance": 1,
    "intent": {
      "attack": 45,
      "defend": 25,
      "status": 10,
      "summon": 0,
      "advance": 10,
      "charge": 10
    },
    "specials": [
      "guardWeight"
    ],
    "drop": "12 荒髓 + 卡牌三选一",
    "text": "防御权重 +10%（已计入意图池）",
    "lore": "状如豚而有距，善掘土"
  },
  {
    "id": "E105",
    "name": "赤鱬",
    "act": 1,
    "kind": "normal",
    "element": "水",
    "hp": 20,
    "atk": 6,
    "advance": 1,
    "intent": {
      "attack": 50,
      "defend": 5,
      "status": 25,
      "summon": 0,
      "advance": 10,
      "charge": 10
    },
    "specials": [
      "frostAttack"
    ],
    "drop": "12 荒髓 + 卡牌三选一",
    "text": "攻击附带冻缓 1",
    "lore": "人面鱼身，音如鸳鸯"
  },
  {
    "id": "E106",
    "name": "鴸",
    "act": 1,
    "kind": "normal",
    "element": "火",
    "hp": 21,
    "atk": 7,
    "advance": 1,
    "intent": {
      "attack": 40,
      "defend": 5,
      "status": 10,
      "summon": 0,
      "advance": 5,
      "charge": 40
    },
    "specials": [
      "chargeStrike"
    ],
    "drop": "12 荒髓 + 卡牌三选一",
    "text": "蓄力后造成 10 伤害",
    "lore": "鸟身人面，其鸣自号"
  },
  {
    "id": "E107",
    "name": "长右",
    "act": 1,
    "kind": "normal",
    "element": "木",
    "hp": 25,
    "atk": 5,
    "advance": 2,
    "intent": {
      "attack": 50,
      "defend": 10,
      "status": 10,
      "summon": 0,
      "advance": 25,
      "charge": 5
    },
    "specials": [
      "swift"
    ],
    "drop": "12 荒髓 + 卡牌三选一",
    "text": "推进值 2",
    "lore": "状如禺而四耳，善攀援"
  },
  {
    "id": "E108",
    "name": "猼訑",
    "act": 1,
    "kind": "normal",
    "element": "金",
    "hp": 23,
    "atk": 6,
    "advance": 1,
    "intent": {
      "attack": 50,
      "defend": 20,
      "status": 10,
      "summon": 0,
      "advance": 10,
      "charge": 10
    },
    "specials": [
      "dmgReduce1"
    ],
    "drop": "12 荒髓 + 卡牌三选一",
    "text": "受到攻击 -1",
    "lore": "状如羊，九尾四耳，目在背"
  },
  {
    "id": "E201",
    "name": "朱厌",
    "act": 2,
    "kind": "normal",
    "element": "火",
    "hp": 30,
    "atk": 8,
    "advance": 1,
    "intent": {
      "attack": 40,
      "defend": 10,
      "status": 10,
      "summon": 0,
      "advance": 10,
      "charge": 30
    },
    "specials": [
      "chargeStrike"
    ],
    "drop": "14 荒髓 + 卡牌三选一",
    "text": "蓄力后造成 12 伤害",
    "lore": "状如猿而白首赤足，见则大兵"
  },
  {
    "id": "E202",
    "name": "狡",
    "act": 2,
    "kind": "normal",
    "element": "木",
    "hp": 28,
    "atk": 7,
    "advance": 1,
    "intent": {
      "attack": 45,
      "defend": 10,
      "status": 25,
      "summon": 0,
      "advance": 10,
      "charge": 10
    },
    "specials": [
      "thornTrap"
    ],
    "drop": "14 荒髓 + 卡牌三选一",
    "text": "每回合给玩家 1 张「缠绕」临时牌",
    "lore": "状如犬而豹文，角如牛"
  },
  {
    "id": "E203",
    "name": "狰·荒",
    "act": 2,
    "kind": "normal",
    "element": "金",
    "hp": 34,
    "atk": 9,
    "advance": 1,
    "intent": {
      "attack": 55,
      "defend": 10,
      "status": 10,
      "summon": 0,
      "advance": 15,
      "charge": 10
    },
    "specials": [
      "armorHalf"
    ],
    "drop": "14 荒髓 + 卡牌三选一",
    "text": "裂甲效果对其减半",
    "lore": "狰之荒化，金气更盛"
  },
  {
    "id": "E204",
    "name": "豪彘",
    "act": 2,
    "kind": "normal",
    "element": "土",
    "hp": 36,
    "atk": 8,
    "advance": 2,
    "intent": {
      "attack": 50,
      "defend": 15,
      "status": 10,
      "summon": 0,
      "advance": 20,
      "charge": 5
    },
    "specials": [
      "swift"
    ],
    "drop": "14 荒髓 + 卡牌三选一",
    "text": "推进值 2",
    "lore": "状如猪而白毛，长尾"
  },
  {
    "id": "E205",
    "name": "举父",
    "act": 2,
    "kind": "normal",
    "element": "木",
    "hp": 32,
    "atk": 9,
    "advance": 1,
    "intent": {
      "attack": 50,
      "defend": 10,
      "status": 10,
      "summon": 0,
      "advance": 10,
      "charge": 20
    },
    "specials": [
      "atkUpOnAttack"
    ],
    "drop": "14 荒髓 + 卡牌三选一",
    "text": "攻击后自身 +1 攻（本场永久）",
    "lore": "状如猿而臂长，善掷"
  },
  {
    "id": "E206",
    "name": "谿边",
    "act": 2,
    "kind": "normal",
    "element": "水",
    "hp": 29,
    "atk": 7,
    "advance": 1,
    "intent": {
      "attack": 45,
      "defend": 10,
      "status": 25,
      "summon": 0,
      "advance": 10,
      "charge": 10
    },
    "specials": [
      "frostAttack"
    ],
    "drop": "14 荒髓 + 卡牌三选一",
    "text": "攻击施加冻缓 1",
    "lore": "状如犬而人面，善走"
  },
  {
    "id": "E207",
    "name": "讙",
    "act": 2,
    "kind": "normal",
    "element": "火",
    "hp": 31,
    "atk": 8,
    "advance": 1,
    "intent": {
      "attack": 50,
      "defend": 10,
      "status": 10,
      "summon": 0,
      "advance": 10,
      "charge": 20
    },
    "specials": [
      "multiTarget2"
    ],
    "drop": "14 荒髓 + 卡牌三选一",
    "text": "攻击可命中最多 2 个目标",
    "lore": "状如狸而一目，三尾"
  },
  {
    "id": "E208",
    "name": "天狗",
    "act": 2,
    "kind": "normal",
    "element": "金",
    "hp": 33,
    "atk": 9,
    "advance": 1,
    "intent": {
      "attack": 55,
      "defend": 10,
      "status": 10,
      "summon": 0,
      "advance": 15,
      "charge": 10
    },
    "specials": [
      "bloodthirst"
    ],
    "drop": "14 荒髓 + 卡牌三选一",
    "text": "击杀异兽后回复 3 生命",
    "lore": "状如狸而白首，音如榴榴"
  },
  {
    "id": "E301",
    "name": "诸怀",
    "act": 3,
    "kind": "normal",
    "element": "土",
    "hp": 42,
    "atk": 10,
    "advance": 2,
    "intent": {
      "attack": 50,
      "defend": 15,
      "status": 10,
      "summon": 0,
      "advance": 20,
      "charge": 5
    },
    "specials": [
      "swift"
    ],
    "drop": "16 荒髓 + 卡牌三选一",
    "text": "推进值 2",
    "lore": "状如牛而四角，人目彘耳"
  },
  {
    "id": "E302",
    "name": "狍鸮",
    "act": 3,
    "kind": "normal",
    "element": "火",
    "hp": 38,
    "atk": 11,
    "advance": 1,
    "intent": {
      "attack": 45,
      "defend": 10,
      "status": 25,
      "summon": 0,
      "advance": 10,
      "charge": 10
    },
    "specials": [
      "spiritEater"
    ],
    "drop": "16 荒髓 + 卡牌三选一",
    "text": "噬灵：玩家灵涌 50% 改为失 1 灵气",
    "lore": "羊身人面，目在腋下，虎齿人爪"
  },
  {
    "id": "E303",
    "name": "天马",
    "act": 3,
    "kind": "normal",
    "element": "木",
    "hp": 40,
    "atk": 9,
    "advance": 1,
    "intent": {
      "attack": 50,
      "defend": 10,
      "status": 10,
      "summon": 0,
      "advance": 15,
      "charge": 15
    },
    "specials": [
      "gainSwift"
    ],
    "drop": "16 荒髓 + 卡牌三选一",
    "text": "每回合获得 1 层迅捷",
    "lore": "状如马而白身，黑尾"
  },
  {
    "id": "E304",
    "name": "九婴",
    "act": 3,
    "kind": "normal",
    "element": "水",
    "hp": 44,
    "atk": 10,
    "advance": 1,
    "intent": {
      "attack": 50,
      "defend": 5,
      "status": 20,
      "summon": 0,
      "advance": 10,
      "charge": 15
    },
    "specials": [
      "multiHit2"
    ],
    "drop": "16 荒髓 + 卡牌三选一",
    "text": "攻击 2 段（每段 5 伤害）",
    "lore": "九首蛇身，能吐水火"
  },
  {
    "id": "E305",
    "name": "犀渠",
    "act": 3,
    "kind": "normal",
    "element": "土",
    "hp": 46,
    "atk": 11,
    "advance": 1,
    "intent": {
      "attack": 55,
      "defend": 20,
      "status": 10,
      "summon": 0,
      "advance": 10,
      "charge": 5
    },
    "specials": [
      "dmgReduce1",
      "regen2"
    ],
    "drop": "16 荒髓 + 卡牌三选一",
    "text": "受到攻击 -1；回合结束回 2 生命",
    "lore": "状如牛而苍身，音如婴儿"
  },
  {
    "id": "E306",
    "name": "䍺",
    "act": 3,
    "kind": "normal",
    "element": "金",
    "hp": 41,
    "atk": 12,
    "advance": 1,
    "intent": {
      "attack": 60,
      "defend": 10,
      "status": 10,
      "summon": 0,
      "advance": 10,
      "charge": 10
    },
    "specials": [
      "sunder"
    ],
    "drop": "16 荒髓 + 卡牌三选一",
    "text": "攻击后施加裂甲 1",
    "lore": "状如羊而无口，不可杀"
  },
  {
    "id": "E307",
    "name": "蠪侄",
    "act": 3,
    "kind": "normal",
    "element": "木",
    "hp": 39,
    "atk": 10,
    "advance": 1,
    "intent": {
      "attack": 40,
      "defend": 10,
      "status": 10,
      "summon": 30,
      "advance": 10,
      "charge": 0
    },
    "specials": [
      "summonSmall"
    ],
    "drop": "16 荒髓 + 卡牌三选一",
    "text": "召唤 2 只小蠪 5/5",
    "lore": "九首九尾，虎爪"
  },
  {
    "id": "E308",
    "name": "合窳",
    "act": 3,
    "kind": "normal",
    "element": "水",
    "hp": 43,
    "atk": 11,
    "advance": 1,
    "intent": {
      "attack": 50,
      "defend": 10,
      "status": 20,
      "summon": 0,
      "advance": 15,
      "charge": 5
    },
    "specials": [
      "tangleAttack"
    ],
    "drop": "16 荒髓 + 卡牌三选一",
    "text": "攻击施加缠绕 1",
    "lore": "状如猪而人面，黄身赤尾"
  },
  {
    "id": "EL101",
    "name": "蛊雕",
    "act": 1,
    "kind": "elite",
    "element": "水",
    "hp": 70,
    "atk": 11,
    "advance": 2,
    "intent": {
      "attack": 50,
      "defend": 10,
      "status": 20,
      "summon": 0,
      "advance": 15,
      "charge": 5
    },
    "specials": [
      "swift",
      "frostCap"
    ],
    "affixes": [
      "A04"
    ],
    "affixText": "迅捷 + 冻缓强化",
    "drop": "35 荒髓 + 遗物",
    "text": "每 3 回合推进 2 格；冻缓上限 +1",
    "lore": "凶兽巢中的强大个体：每 3 回合推进 2 格；冻缓上限 +1"
  },
  {
    "id": "EL102",
    "name": "穷奇幼兽",
    "act": 1,
    "kind": "elite",
    "element": "火",
    "hp": 65,
    "atk": 12,
    "advance": 1,
    "intent": {
      "attack": 55,
      "defend": 10,
      "status": 10,
      "summon": 0,
      "advance": 15,
      "charge": 10
    },
    "specials": [
      "bloodthirst",
      "feralVuln"
    ],
    "affixes": [
      "A03"
    ],
    "affixText": "嗜血 + 凶化易伤",
    "drop": "35 荒髓 + 遗物",
    "text": "击杀回 10% 生命；凶化伤害对其 +1",
    "lore": "凶兽巢中的强大个体：击杀回 10% 生命；凶化伤害对其 +1"
  },
  {
    "id": "EL103",
    "name": "狰王",
    "act": 1,
    "kind": "elite",
    "element": "金",
    "hp": 68,
    "atk": 11,
    "advance": 1,
    "intent": {
      "attack": 55,
      "defend": 15,
      "status": 10,
      "summon": 0,
      "advance": 10,
      "charge": 10
    },
    "specials": [
      "thorns",
      "armorHalf"
    ],
    "affixes": [
      "A06"
    ],
    "affixText": "反震 + 裂甲强化",
    "drop": "35 荒髓 + 遗物",
    "text": "被异兽攻击时反 2 伤害；裂甲对其减半",
    "lore": "凶兽巢中的强大个体：被异兽攻击时反 2 伤害；裂甲对其减半"
  },
  {
    "id": "EL104",
    "name": "鹿蜀母",
    "act": 1,
    "kind": "elite",
    "element": "木",
    "hp": 72,
    "atk": 9,
    "advance": 1,
    "intent": {
      "attack": 40,
      "defend": 10,
      "status": 10,
      "summon": 30,
      "advance": 5,
      "charge": 5
    },
    "specials": [
      "regen",
      "summonStrong"
    ],
    "affixes": [
      "A05"
    ],
    "affixText": "再生 + 召唤强化",
    "drop": "35 荒髓 + 遗物",
    "text": "回合结束回 3 生命；鹿影强化为 8/5",
    "lore": "凶兽巢中的强大个体：回合结束回 3 生命；鹿影强化为 8/5"
  },
  {
    "id": "EL201",
    "name": "相柳幼体",
    "act": 2,
    "kind": "elite",
    "element": "水",
    "hp": 90,
    "atk": 13,
    "advance": 1,
    "intent": {
      "attack": 50,
      "defend": 10,
      "status": 20,
      "summon": 10,
      "advance": 5,
      "charge": 5
    },
    "specials": [
      "multiTarget2",
      "frostCap"
    ],
    "affixes": [
      "A13"
    ],
    "affixText": "多目标 + 冻缓强化",
    "drop": "40 荒髓 + 遗物",
    "text": "攻击最多命中 2 目标；冻缓 +1 层",
    "lore": "凶兽巢中的强大个体：攻击最多命中 2 目标；冻缓 +1 层"
  },
  {
    "id": "EL202",
    "name": "金甲犀",
    "act": 2,
    "kind": "elite",
    "element": "土",
    "hp": 100,
    "atk": 12,
    "advance": 1,
    "intent": {
      "attack": 50,
      "defend": 25,
      "status": 10,
      "summon": 0,
      "advance": 10,
      "charge": 5
    },
    "specials": [
      "goldArmor",
      "immuneControl"
    ],
    "affixes": [
      "A02",
      "A09"
    ],
    "affixText": "金甲 + 镇岳",
    "drop": "40 荒髓 + 遗物",
    "text": "受到攻击 -1；免疫缠绕土牢；裂甲对其减半",
    "lore": "凶兽巢中的强大个体：受到攻击 -1；免疫缠绕土牢；裂甲对其减半"
  },
  {
    "id": "EL203",
    "name": "朱厌战将",
    "act": 2,
    "kind": "elite",
    "element": "火",
    "hp": 88,
    "atk": 14,
    "advance": 1,
    "intent": {
      "attack": 40,
      "defend": 10,
      "status": 10,
      "summon": 0,
      "advance": 10,
      "charge": 30
    },
    "specials": [
      "chargeStrike",
      "armorPierce"
    ],
    "affixes": [
      "A10"
    ],
    "affixText": "蓄力 + 破甲",
    "drop": "40 荒髓 + 遗物",
    "text": "蓄力后 15 伤害；攻击无视护盾",
    "lore": "凶兽巢中的强大个体：蓄力后 15 伤害；攻击无视护盾"
  },
  {
    "id": "EL204",
    "name": "天狗首领",
    "act": 2,
    "kind": "elite",
    "element": "金",
    "hp": 92,
    "atk": 13,
    "advance": 2,
    "intent": {
      "attack": 55,
      "defend": 10,
      "status": 10,
      "summon": 0,
      "advance": 20,
      "charge": 5
    },
    "specials": [
      "bloodthirst",
      "swift"
    ],
    "affixes": [
      "A03",
      "A04"
    ],
    "affixText": "嗜血 + 迅捷",
    "drop": "40 荒髓 + 遗物",
    "text": "击杀回 10% 生命；推进值 2",
    "lore": "凶兽巢中的强大个体：击杀回 10% 生命；推进值 2"
  },
  {
    "id": "EL301",
    "name": "烛九阴幼体",
    "act": 3,
    "kind": "elite",
    "element": "火",
    "hp": 120,
    "atk": 15,
    "advance": 1,
    "intent": {
      "attack": 50,
      "defend": 10,
      "status": 15,
      "summon": 10,
      "advance": 5,
      "charge": 10
    },
    "specials": [
      "daynightAtk",
      "burnCap"
    ],
    "affixes": [
      "A12"
    ],
    "affixText": "昼夜 + 灼烧强化",
    "drop": "45 荒髓 + 遗物",
    "text": "昼夜切换时攻击 +3；灼烧 +1 层",
    "lore": "凶兽巢中的强大个体：昼夜切换时攻击 +3；灼烧 +1 层"
  },
  {
    "id": "EL302",
    "name": "饕餮眷属",
    "act": 3,
    "kind": "elite",
    "element": "土",
    "hp": 130,
    "atk": 14,
    "advance": 1,
    "intent": {
      "attack": 50,
      "defend": 15,
      "status": 10,
      "summon": 10,
      "advance": 10,
      "charge": 5
    },
    "specials": [
      "devour2",
      "regen"
    ],
    "affixes": [
      "A15",
      "A05"
    ],
    "affixText": "吞噬 + 再生",
    "drop": "45 荒髓 + 遗物",
    "text": "击杀永久 +2 攻；回合结束回 3 生命",
    "lore": "凶兽巢中的强大个体：击杀永久 +2 攻；回合结束回 3 生命"
  },
  {
    "id": "EL303",
    "name": "九婴战将",
    "act": 3,
    "kind": "elite",
    "element": "水",
    "hp": 125,
    "atk": 15,
    "advance": 1,
    "intent": {
      "attack": 55,
      "defend": 10,
      "status": 20,
      "summon": 5,
      "advance": 5,
      "charge": 5
    },
    "specials": [
      "multiHit3",
      "frostCap"
    ],
    "affixes": [
      "A13"
    ],
    "affixText": "多段 + 冻缓强化",
    "drop": "45 荒髓 + 遗物",
    "text": "攻击 3 段（每段 5）；施加冻缓 1",
    "lore": "凶兽巢中的强大个体：攻击 3 段（每段 5）；施加冻缓 1"
  },
  {
    "id": "EL304",
    "name": "诸怀战兽",
    "act": 3,
    "kind": "elite",
    "element": "土",
    "hp": 135,
    "atk": 13,
    "advance": 2,
    "intent": {
      "attack": 50,
      "defend": 20,
      "status": 10,
      "summon": 0,
      "advance": 20,
      "charge": 0
    },
    "specials": [
      "goldArmor",
      "swift"
    ],
    "affixes": [
      "A02",
      "A04"
    ],
    "affixText": "金甲 + 推进强化",
    "drop": "45 荒髓 + 遗物",
    "text": "受到攻击 -1；推进值 2",
    "lore": "凶兽巢中的强大个体：受到攻击 -1；推进值 2"
  },
  {
    "id": "B01",
    "name": "蛊雕王",
    "act": 1,
    "kind": "boss",
    "element": "水",
    "hp": 200,
    "atk": 15,
    "advance": 1,
    "intent": {
      "attack": 50,
      "defend": 10,
      "status": 20,
      "summon": 0,
      "advance": 15,
      "charge": 5
    },
    "phases": [
      {
        "at": 1.0,
        "pool": {
          "attack": 50,
          "defend": 10,
          "status": 20,
          "summon": 0,
          "advance": 15,
          "charge": 5
        },
        "name": "正常",
        "special": "正常",
        "onEnter": []
      },
      {
        "at": 0.7,
        "pool": {
          "attack": 40,
          "defend": 10,
          "status": 20,
          "summon": 20,
          "advance": 10,
          "charge": 0
        },
        "name": "召唤 2 只蛊雕幼体；玩家冻缓 ≥3 时攻击 +3",
        "special": "召唤 2 只蛊雕幼体；玩家冻缓 ≥3 时攻击 +3",
        "onEnter": [
          "summonTwo",
          "feralFrostRage"
        ]
      },
      {
        "at": 0.4,
        "pool": {
          "attack": 60,
          "defend": 5,
          "status": 20,
          "summon": 0,
          "advance": 15,
          "charge": 0
        },
        "name": "全体尖啸：所有异兽冻缓 1 层",
        "special": "全体尖啸：所有异兽冻缓 1 层",
        "onEnter": [
          "allUnitsFreeze"
        ]
      }
    ],
    "drop": "60 荒髓 + 首领奖励",
    "text": "三阶段首领；正常；召唤 2 只蛊雕幼体；玩家冻缓 ≥3 时攻击 +3；全体尖啸：所有异兽冻缓 1 层",
    "lore": "蛊雕之王，水域霸主，尖啸裂石",
    "replace": "卷 1 首领"
  },
  {
    "id": "B02",
    "name": "相柳",
    "act": 2,
    "kind": "boss",
    "element": "水",
    "hp": 280,
    "atk": 17,
    "advance": 1,
    "intent": {
      "attack": 50,
      "defend": 30,
      "status": 20,
      "summon": 0,
      "advance": 0,
      "charge": 0
    },
    "phases": [
      {
        "at": 1.0,
        "pool": {
          "attack": 50,
          "defend": 30,
          "status": 20,
          "summon": 0,
          "advance": 0,
          "charge": 0
        },
        "name": "毒雾：中阵格地形变为瘴泽",
        "special": "毒雾：中阵格地形变为瘴泽",
        "onEnter": [
          "poisonMid"
        ]
      },
      {
        "at": 0.7,
        "pool": {
          "attack": 40,
          "defend": 15,
          "status": 20,
          "summon": 20,
          "advance": 5,
          "charge": 0
        },
        "name": "封锁 1 个空格 2 回合",
        "special": "封锁 1 个空格 2 回合",
        "onEnter": [
          "blockCell"
        ]
      },
      {
        "at": 0.4,
        "pool": {
          "attack": 60,
          "defend": 5,
          "status": 20,
          "summon": 5,
          "advance": 10,
          "charge": 0
        },
        "name": "每回合对本体 2 伤害",
        "special": "每回合对本体 2 伤害",
        "onEnter": [
          "heroDot2"
        ]
      }
    ],
    "drop": "70 荒髓 + 首领奖励",
    "text": "三阶段首领；毒雾：中阵格地形变为瘴泽；封锁 1 个空格 2 回合；每回合对本体 2 伤害",
    "lore": "九首蛇身，毒沼之主",
    "replace": "卷 2 首领"
  },
  {
    "id": "B03",
    "name": "烛龙",
    "act": 3,
    "kind": "boss",
    "element": "火",
    "hp": 360,
    "atk": 20,
    "advance": 1,
    "intent": {
      "attack": 50,
      "defend": 30,
      "status": 10,
      "summon": 0,
      "advance": 5,
      "charge": 5
    },
    "phases": [
      {
        "at": 1.0,
        "pool": {
          "attack": 50,
          "defend": 30,
          "status": 10,
          "summon": 0,
          "advance": 5,
          "charge": 5
        },
        "name": "昼夜切换：全场火 / 水伤害 ±1",
        "special": "昼夜切换：全场火 / 水伤害 ±1",
        "onEnter": [
          "daynight"
        ]
      },
      {
        "at": 0.7,
        "pool": {
          "attack": 40,
          "defend": 15,
          "status": 20,
          "summon": 20,
          "advance": 5,
          "charge": 0
        },
        "name": "召唤 2 只烛九阴幼体",
        "special": "召唤 2 只烛九阴幼体",
        "onEnter": [
          "summonTwoZhu"
        ]
      },
      {
        "at": 0.4,
        "pool": {
          "attack": 60,
          "defend": 5,
          "status": 20,
          "summon": 5,
          "advance": 10,
          "charge": 0
        },
        "name": "所有格地形变为熔岩：每回合 -2 生命",
        "special": "所有格地形变为熔岩：每回合 -2 生命",
        "onEnter": [
          "lavaAll"
        ]
      }
    ],
    "drop": "80 荒髓 + 首领奖励",
    "text": "三阶段首领；昼夜切换：全场火 / 水伤害 ±1；召唤 2 只烛九阴幼体；所有格地形变为熔岩：每回合 -2 生命",
    "lore": "睁目为昼，闭目为夜",
    "replace": "卷 3 首领"
  },
  {
    "id": "B04",
    "name": "穷奇",
    "act": 1,
    "kind": "boss",
    "element": "火",
    "hp": 320,
    "atk": 19,
    "advance": 1,
    "intent": {
      "attack": 60,
      "defend": 10,
      "status": 10,
      "summon": 0,
      "advance": 15,
      "charge": 5
    },
    "phases": [
      {
        "at": 1.0,
        "pool": {
          "attack": 60,
          "defend": 10,
          "status": 10,
          "summon": 0,
          "advance": 15,
          "charge": 5
        },
        "name": "凶化伤害对其 +2",
        "special": "凶化伤害对其 +2",
        "onEnter": [
          "feralVuln2"
        ]
      },
      {
        "at": 0.7,
        "pool": {
          "attack": 40,
          "defend": 10,
          "status": 20,
          "summon": 20,
          "advance": 5,
          "charge": 5
        },
        "name": "噬灵：灵涌 50% 改为失 1 灵气",
        "special": "噬灵：灵涌 50% 改为失 1 灵气",
        "onEnter": [
          "spiritEater"
        ]
      },
      {
        "at": 0.4,
        "pool": {
          "attack": 70,
          "defend": 5,
          "status": 15,
          "summon": 5,
          "advance": 5,
          "charge": 0
        },
        "name": "全体裂甲 1 层",
        "special": "全体裂甲 1 层",
        "onEnter": [
          "allUnitsSunder"
        ]
      }
    ],
    "drop": "75 荒髓 + 首领奖励",
    "text": "三阶段首领；凶化伤害对其 +2；噬灵：灵涌 50% 改为失 1 灵气；全体裂甲 1 层",
    "lore": "凶兽之首，专惩恶人",
    "replace": "荒阶 3+ 替换卷 1 首领"
  },
  {
    "id": "B05",
    "name": "饕餮",
    "act": 2,
    "kind": "boss",
    "element": "土",
    "hp": 340,
    "atk": 18,
    "advance": 1,
    "intent": {
      "attack": 50,
      "defend": 30,
      "status": 20,
      "summon": 0,
      "advance": 0,
      "charge": 0
    },
    "phases": [
      {
        "at": 1.0,
        "pool": {
          "attack": 50,
          "defend": 30,
          "status": 20,
          "summon": 0,
          "advance": 0,
          "charge": 0
        },
        "name": "击杀永久 +1 攻",
        "special": "击杀永久 +1 攻",
        "onEnter": [
          "devour1"
        ]
      },
      {
        "at": 0.7,
        "pool": {
          "attack": 40,
          "defend": 15,
          "status": 20,
          "summon": 20,
          "advance": 5,
          "charge": 0
        },
        "name": "击杀永久 +3 攻",
        "special": "击杀永久 +3 攻",
        "onEnter": [
          "devour3"
        ]
      },
      {
        "at": 0.4,
        "pool": {
          "attack": 65,
          "defend": 5,
          "status": 15,
          "summon": 5,
          "advance": 10,
          "charge": 0
        },
        "name": "每回合对所有异兽 2 伤害",
        "special": "每回合对所有异兽 2 伤害",
        "onEnter": [
          "aoeUnits2"
        ]
      }
    ],
    "drop": "78 荒髓 + 首领奖励",
    "text": "三阶段首领；击杀永久 +1 攻；击杀永久 +3 攻；每回合对所有异兽 2 伤害",
    "lore": "贪食无厌，吞天噬地",
    "replace": "荒阶 5+ 替换卷 2 首领"
  }
];
  SH.EVENTS = [
  {
    "id": "V025",
    "name": "五色石",
    "act": 0,
    "weight": 20,
    "pre": "无",
    "options": [
      {
        "text": "付 10 荒髓 → 随机普通遗物（R_021—R_044 池）",
        "cost": {
          "husui": 10
        },
        "gain": {
          "randomRelic": "normal"
        }
      },
      {
        "text": "升级 1 张牌",
        "cost": {},
        "gain": {
          "upgrade": 1
        }
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {}
      }
    ],
    "link": "五行 ≥2 种：额外显示「付 15 荒髓 → 随机稀有遗物」",
    "lore": "补天遗石，五色流光",
    "text": "补天遗石，五色流光"
  },
  {
    "id": "V026",
    "name": "迷途巡吏",
    "act": 0,
    "weight": 20,
    "pre": "无",
    "options": [
      {
        "text": "付 8 荒髓 → 随机普通卡（三选一）",
        "cost": {
          "husui": 8
        },
        "gain": {
          "randomCard": "normal"
        },
        "battle": null
      },
      {
        "text": "战斗 → 25 荒髓",
        "cost": {},
        "gain": {
          "husui": 25
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "无",
    "lore": "荒径遇旧吏，衣袍沾尘",
    "text": "荒径遇旧吏，衣袍沾尘"
  },
  {
    "id": "V027",
    "name": "古碑",
    "act": 0,
    "weight": 20,
    "pre": "无",
    "options": [
      {
        "text": "失 10 生命 → 升级 1 张牌",
        "cost": {
          "hp": 10
        },
        "gain": {
          "upgrade": 1
        },
        "battle": null
      },
      {
        "text": "付 15 荒髓 → 随机稀有卡（三选一）",
        "cost": {
          "husui": 15
        },
        "gain": {
          "randomCard": "rare"
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "无",
    "lore": "碑文漫漶，字如虫蚀",
    "text": "碑文漫漶，字如虫蚀"
  },
  {
    "id": "V028",
    "name": "荒髓商队",
    "act": 0,
    "weight": 20,
    "pre": "无",
    "options": [
      {
        "text": "付 10 生命 → 30 荒髓",
        "cost": {},
        "gain": {
          "husui": 30
        },
        "battle": null
      },
      {
        "text": "付 20 荒髓 → 随机普通遗物",
        "cost": {
          "husui": 20
        },
        "gain": {
          "randomRelic": "normal"
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "有誓约：价格 -20%",
    "lore": "驼铃自荒外来",
    "text": "驼铃自荒外来"
  },
  {
    "id": "V029",
    "name": "异兽幼崽",
    "act": 0,
    "weight": 20,
    "pre": "无",
    "options": [
      {
        "text": "收服 → 随机异兽牌（普通池，三选一）",
        "cost": {},
        "gain": {
          "randomCard": "beast"
        },
        "battle": null
      },
      {
        "text": "放走 → 15 荒髓",
        "cost": {},
        "gain": {
          "husui": 15
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "驯化面 ≥3：收服改为稀有池",
    "lore": "幼兽蜷缩，目露怯光",
    "text": "幼兽蜷缩，目露怯光"
  },
  {
    "id": "V030",
    "name": "祭坛残火",
    "act": 0,
    "weight": 20,
    "pre": "无",
    "options": [
      {
        "text": "免费删 1 张牌，失 10 生命",
        "cost": {
          "hp": 10
        },
        "gain": {
          "removeCard": 1
        },
        "battle": null
      },
      {
        "text": "付 20 荒髓 → 升级 1 张牌",
        "cost": {
          "husui": 20
        },
        "gain": {
          "upgrade": 1
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "无",
    "lore": "残火未熄，祭坛半塌",
    "text": "残火未熄，祭坛半塌"
  },
  {
    "id": "V031",
    "name": "巡荒旧账",
    "act": 0,
    "weight": 20,
    "pre": "无",
    "options": [
      {
        "text": "付 12 荒髓 → 随机普通遗物",
        "cost": {
          "husui": 12
        },
        "gain": {
          "randomRelic": "normal"
        },
        "battle": null
      },
      {
        "text": "失 8 生命 → 20 荒髓",
        "cost": {
          "hp": 8
        },
        "gain": {
          "husui": 20
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "无",
    "lore": "旧账册页，墨迹犹新",
    "text": "旧账册页，墨迹犹新"
  },
  {
    "id": "V032",
    "name": "山泽之灵",
    "act": 0,
    "weight": 20,
    "pre": "无",
    "options": [
      {
        "text": "获得随机山泽牌（C_Z 池）",
        "cost": {},
        "gain": {
          "randomCard": "terrain"
        },
        "battle": null
      },
      {
        "text": "回复 15 生命",
        "cost": {},
        "gain": {
          "heal": 15
        },
        "battle": null
      },
      {
        "text": "付 8 荒髓 → 升级 1 张山泽牌",
        "cost": {
          "husui": 8
        },
        "gain": {
          "upgrade": 1
        },
        "battle": null
      }
    ],
    "link": "无",
    "lore": "泽畔灵光，草木低伏",
    "text": "泽畔灵光，草木低伏"
  },
  {
    "id": "V033",
    "name": "凶兽陷阱",
    "act": 0,
    "weight": 20,
    "pre": "无",
    "options": [
      {
        "text": "战斗 → 随机凶化面卡（稀有池）",
        "cost": {},
        "gain": {
          "randomCard": "rare"
        },
        "battle": {
          "pool": [
            "E101"
          ],
          "kind": "battle"
        }
      },
      {
        "text": "付 10 荒髓 → 绕行",
        "cost": {
          "husui": 10
        },
        "gain": {}
      },
      {
        "text": "失 12 生命 → 绕行",
        "cost": {
          "hp": 12
        },
        "gain": {}
      }
    ],
    "link": "凶化面 ≥3：战斗奖励升为史诗池",
    "lore": "陷阱深坑，兽骨散落",
    "text": "陷阱深坑，兽骨散落"
  },
  {
    "id": "V034",
    "name": "瑞兽祥云",
    "act": 0,
    "weight": 20,
    "pre": "无",
    "options": [
      {
        "text": "回复 20 生命",
        "cost": {},
        "gain": {
          "heal": 20
        },
        "battle": null
      },
      {
        "text": "获得随机驯化面卡（普通池）",
        "cost": {},
        "gain": {
          "randomCard": "beast"
        },
        "battle": null
      },
      {
        "text": "付 8 荒髓 → 删 1 张牌",
        "cost": {
          "husui": 8
        },
        "gain": {
          "removeCard": 1
        },
        "battle": null
      }
    ],
    "link": "驯化面 ≥3：奖励升为稀有池",
    "lore": "祥云低垂，瑞兽隐现",
    "text": "祥云低垂，瑞兽隐现"
  },
  {
    "id": "V035",
    "name": "无名祭坛",
    "act": 0,
    "weight": 20,
    "pre": "无",
    "options": [
      {
        "text": "付 20 荒髓 → 异变 1 张牌",
        "cost": {
          "husui": 20
        },
        "gain": {
          "mutate": 1
        },
        "battle": null
      },
      {
        "text": "付 10 荒髓 → 升级 1 张牌",
        "cost": {
          "husui": 10
        },
        "gain": {
          "upgrade": 1
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "无",
    "lore": "坛上无铭，唯余灰烬",
    "text": "坛上无铭，唯余灰烬"
  },
  {
    "id": "V036",
    "name": "大荒行者",
    "act": 0,
    "weight": 20,
    "pre": "无",
    "options": [
      {
        "text": "付 15 荒髓 → 随机史诗卡（三选一）",
        "cost": {
          "husui": 15
        },
        "gain": {
          "randomCard": "epic"
        }
      },
      {
        "text": "战斗 → 随机荒遗物（R_006/R_011/R_016/R_020/R_080）",
        "cost": {},
        "gain": {
          "randomRelic": "curse"
        },
        "battle": {
          "pool": [
            "E301"
          ],
          "kind": "battle"
        }
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {}
      }
    ],
    "link": "生命 ≤50%：付 15 荒髓改为付 10 荒髓",
    "lore": "行者负笈，踏荒而来",
    "text": "行者负笈，踏荒而来"
  },
  {
    "id": "V001",
    "name": "狰的试炼",
    "act": 1,
    "weight": 25,
    "pre": "无",
    "options": [
      {
        "text": "付 6 荒髓 → 获得 C_B_JIN_001 狰",
        "cost": {
          "husui": 6
        },
        "gain": {
          "card": "C_B_JIN_001"
        },
        "battle": null
      },
      {
        "text": "战斗（E101×1）→ 随机稀有卡（三选一）",
        "cost": {},
        "gain": {
          "randomCard": "rare"
        },
        "battle": {
          "pool": [
            "E101"
          ],
          "kind": "battle"
        }
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "凶化面 ≥3：付 6 改为付 4",
    "lore": "赤豹五尾，试尔胆魄",
    "text": "赤豹五尾，试尔胆魄"
  },
  {
    "id": "V002",
    "name": "蛊雕巢穴",
    "act": 1,
    "weight": 25,
    "pre": "无",
    "options": [
      {
        "text": "付 8 荒髓 → 随机普通遗物",
        "cost": {
          "husui": 8
        },
        "gain": {
          "randomRelic": "normal"
        },
        "battle": null
      },
      {
        "text": "失 10 生命 → 随机史诗卡（三选一）",
        "cost": {
          "hp": 10
        },
        "gain": {
          "randomCard": "epic"
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "无",
    "lore": "水巢腥风，翼影盘旋",
    "text": "水巢腥风，翼影盘旋"
  },
  {
    "id": "V003",
    "name": "鹿蜀引路",
    "act": 1,
    "weight": 25,
    "pre": "无",
    "options": [
      {
        "text": "回复 15 生命",
        "cost": {},
        "gain": {
          "heal": 15
        },
        "battle": null
      },
      {
        "text": "获得 C_B_MU_002 鹿蜀",
        "cost": {},
        "gain": {
          "card": "C_B_MU_002"
        },
        "battle": null
      },
      {
        "text": "付 5 荒髓 → 删 1 张牌",
        "cost": {
          "husui": 5
        },
        "gain": {
          "removeCard": 1
        },
        "battle": null
      }
    ],
    "link": "无",
    "lore": "白首马身，纹如虎",
    "text": "白首马身，纹如虎"
  },
  {
    "id": "V004",
    "name": "山神小祠",
    "act": 1,
    "weight": 25,
    "pre": "无",
    "options": [
      {
        "text": "回复 20 生命",
        "cost": {},
        "gain": {
          "heal": 20
        },
        "battle": null
      },
      {
        "text": "获得随机誓约（10 选 1）",
        "cost": {},
        "gain": {
          "omen": true
        },
        "battle": null
      },
      {
        "text": "获得 15 荒髓",
        "cost": {},
        "gain": {
          "husui": 15
        },
        "battle": null
      }
    ],
    "link": "有誓约：誓约选项改为升级 1 张牌",
    "lore": "小祠香火，山神低眉",
    "text": "小祠香火，山神低眉"
  },
  {
    "id": "V005",
    "name": "荒蚀之泉",
    "act": 1,
    "weight": 25,
    "pre": "无",
    "options": [
      {
        "text": "净化 1 个荒蚀（若有）",
        "cost": {},
        "gain": {
          "purify": true
        },
        "battle": null
      },
      {
        "text": "失 8 生命 → 25 荒髓",
        "cost": {
          "hp": 8
        },
        "gain": {
          "husui": 25
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "有荒蚀牌：净化选项额外抽 1",
    "lore": "泉水浊黑，蚀气翻涌",
    "text": "泉水浊黑，蚀气翻涌"
  },
  {
    "id": "V006",
    "name": "九尾幻境",
    "act": 1,
    "weight": 25,
    "pre": "无",
    "options": [
      {
        "text": "免费翻面 1 张手牌（不耗灵气）",
        "cost": {},
        "gain": {
          "flipFree": 1
        },
        "battle": null
      },
      {
        "text": "获得 C_B_MU_001 九尾狐",
        "cost": {},
        "gain": {
          "card": "C_B_MU_001"
        },
        "battle": null
      },
      {
        "text": "失 5 荒髓 → 离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "翻面遗物 ≥1：额外抽 1",
    "lore": "九尾隐雾，幻象丛生",
    "text": "九尾隐雾，幻象丛生"
  },
  {
    "id": "V007",
    "name": "赤鱬泪",
    "act": 1,
    "weight": 25,
    "pre": "无",
    "options": [
      {
        "text": "回复 10 生命",
        "cost": {},
        "gain": {
          "heal": 10
        },
        "battle": null
      },
      {
        "text": "付 6 荒髓 → 升级 1 张牌",
        "cost": {
          "husui": 6
        },
        "gain": {
          "upgrade": 1
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "无",
    "lore": "人面鱼身，泪落成珠",
    "text": "人面鱼身，泪落成珠"
  },
  {
    "id": "V008",
    "name": "猼訑之皮",
    "act": 1,
    "weight": 25,
    "pre": "无",
    "options": [
      {
        "text": "失 8 生命 → 随机普通遗物",
        "cost": {
          "hp": 8
        },
        "gain": {
          "randomRelic": "normal"
        },
        "battle": null
      },
      {
        "text": "付 10 荒髓 → 随机稀有卡（三选一）",
        "cost": {
          "husui": 10
        },
        "gain": {
          "randomCard": "rare"
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "无",
    "lore": "九尾四耳，目在背",
    "text": "九尾四耳，目在背"
  },
  {
    "id": "V009",
    "name": "金脉矿洞",
    "act": 2,
    "weight": 25,
    "pre": "无",
    "options": [
      {
        "text": "付 10 荒髓 → 升级 1 张牌",
        "cost": {
          "husui": 10
        },
        "gain": {
          "upgrade": 1
        },
        "battle": null
      },
      {
        "text": "失 15 生命 → 随机普通遗物",
        "cost": {
          "hp": 15
        },
        "gain": {
          "randomRelic": "normal"
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "金系卡 ≥3：升级额外获得 10 荒髓",
    "lore": "矿脉金光，凿声叮当",
    "text": "矿脉金光，凿声叮当"
  },
  {
    "id": "V010",
    "name": "相柳毒沼",
    "act": 2,
    "weight": 25,
    "pre": "无",
    "options": [
      {
        "text": "失 12 生命 → 随机稀有卡（三选一）",
        "cost": {
          "hp": 12
        },
        "gain": {
          "randomCard": "rare"
        },
        "battle": null
      },
      {
        "text": "付 12 荒髓 → 随机普通遗物",
        "cost": {
          "husui": 12
        },
        "gain": {
          "randomRelic": "normal"
        },
        "battle": null
      },
      {
        "text": "战斗（EL201×1）→ 随机稀有遗物",
        "cost": {},
        "gain": {
          "randomRelic": "rare"
        },
        "battle": {
          "pool": [
            "EL201"
          ],
          "kind": "elite"
        }
      }
    ],
    "link": "水系卡 ≥3：失 12 改为失 8",
    "lore": "毒沼九首，瘴气弥天",
    "text": "毒沼九首，瘴气弥天"
  },
  {
    "id": "V011",
    "name": "噬灵鸟群",
    "act": 2,
    "weight": 25,
    "pre": "无",
    "options": [
      {
        "text": "付 8 荒髓 → R_005 灵涌之环",
        "cost": {
          "husui": 8
        },
        "gain": {
          "relicId": "R_005"
        }
      },
      {
        "text": "失 1 张牌 → 随机史诗卡（三选一）",
        "cost": {},
        "gain": {
          "removeCard": 1,
          "randomCard": "epic"
        }
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {}
      }
    ],
    "link": "相生卡 ≥3：付 8 改为付 6",
    "lore": "鸟群掠灵，嗡鸣刺耳",
    "text": "鸟群掠灵，嗡鸣刺耳"
  },
  {
    "id": "V012",
    "name": "穷奇赌局",
    "act": 2,
    "weight": 25,
    "pre": "无",
    "options": [
      {
        "text": "付 15 荒髓 → 随机稀有遗物",
        "cost": {
          "husui": 15
        },
        "gain": {
          "randomRelic": "rare"
        },
        "battle": null
      },
      {
        "text": "失 20 生命 → 40 荒髓",
        "cost": {
          "hp": 20
        },
        "gain": {
          "husui": 40
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "凶化面 ≥3：随机遗物升为史诗池",
    "lore": "穷奇踞石，目露戏谑",
    "text": "穷奇踞石，目露戏谑"
  },
  {
    "id": "V013",
    "name": "烛阴昼夜",
    "act": 2,
    "weight": 25,
    "pre": "无",
    "options": [
      {
        "text": "获得 R_004 烛阴之瞳",
        "cost": {},
        "gain": {
          "relicId": "R_004"
        }
      },
      {
        "text": "升级 1 张双面牌",
        "cost": {},
        "gain": {
          "upgrade": 1
        }
      },
      {
        "text": "付 10 荒髓 → 删 1 张牌",
        "cost": {
          "husui": 10
        },
        "gain": {
          "removeCard": 1
        }
      }
    ],
    "link": "昼夜卡 ≥2：额外获得 1 灵涌（本场）",
    "lore": "烛阴睁目，昼夜轮转",
    "text": "烛阴睁目，昼夜轮转"
  },
  {
    "id": "V014",
    "name": "饕餮残宴",
    "act": 2,
    "weight": 25,
    "pre": "无",
    "options": [
      {
        "text": "回复 30 生命，本卷荒髓获取 -20%",
        "cost": {},
        "gain": {
          "heal": 30,
          "modifier": {
            "husuiGain": -0.2
          }
        }
      },
      {
        "text": "获得随机荒遗物（R_006/R_011/R_016/R_020/R_080）",
        "cost": {},
        "gain": {
          "randomRelic": "curse"
        }
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {}
      }
    ],
    "link": "无",
    "lore": "残宴狼藉，吞噬未尽",
    "text": "残宴狼藉，吞噬未尽"
  },
  {
    "id": "V015",
    "name": "朱厌战鼓",
    "act": 2,
    "weight": 25,
    "pre": "无",
    "options": [
      {
        "text": "战斗（E201×1）→ 随机史诗卡（三选一）",
        "cost": {},
        "gain": {
          "randomCard": "epic"
        },
        "battle": {
          "pool": [
            "E201"
          ],
          "kind": "battle"
        }
      },
      {
        "text": "付 12 荒髓 → 升级 1 张牌",
        "cost": {
          "husui": 12
        },
        "gain": {
          "upgrade": 1
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "无",
    "lore": "白首赤足，见则大兵",
    "text": "白首赤足，见则大兵"
  },
  {
    "id": "V016",
    "name": "天狗食月",
    "act": 2,
    "weight": 25,
    "pre": "无",
    "options": [
      {
        "text": "失 10 生命 → 获得 C_B_JIN_003 天狗",
        "cost": {
          "hp": 10
        },
        "gain": {
          "card": "C_B_JIN_003"
        }
      },
      {
        "text": "付 10 荒髓 → 随机普通遗物",
        "cost": {
          "husui": 10
        },
        "gain": {
          "randomRelic": "normal"
        }
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {}
      }
    ],
    "link": "金系卡 ≥3：失 10 改为失 6",
    "lore": "天狗噬月，夜色如墨",
    "text": "天狗噬月，夜色如墨"
  },
  {
    "id": "V017",
    "name": "诸怀拦路",
    "act": 3,
    "weight": 30,
    "pre": "无",
    "options": [
      {
        "text": "战斗（E301×1）→ 随机史诗卡（三选一）",
        "cost": {},
        "gain": {
          "randomCard": "epic"
        },
        "battle": {
          "pool": [
            "E301"
          ],
          "kind": "battle"
        }
      },
      {
        "text": "付 15 荒髓 → 通过",
        "cost": {
          "husui": 15
        },
        "gain": {},
        "battle": null
      },
      {
        "text": "失 15 生命 → 通过",
        "cost": {
          "hp": 15
        },
        "gain": {},
        "battle": null
      }
    ],
    "link": "无",
    "lore": "四角人目，拦于荒径",
    "text": "四角人目，拦于荒径"
  },
  {
    "id": "V018",
    "name": "狍鸮窃灵",
    "act": 3,
    "weight": 30,
    "pre": "无",
    "options": [
      {
        "text": "失 10 生命 → R_016 镇岳印",
        "cost": {
          "hp": 10
        },
        "gain": {
          "relicId": "R_016"
        },
        "battle": null
      },
      {
        "text": "付 12 荒髓 → 升级 1 张牌",
        "cost": {
          "husui": 12
        },
        "gain": {
          "upgrade": 1
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "相生卡 ≥3：失 10 改为失 6",
    "lore": "羊身人面，目在腋下",
    "text": "羊身人面，目在腋下"
  },
  {
    "id": "V019",
    "name": "天马行空",
    "act": 3,
    "weight": 30,
    "pre": "无",
    "options": [
      {
        "text": "获得 R_023 鹿角（召唤 +1 攻）",
        "cost": {},
        "gain": {
          "relicId": "R_023"
        }
      },
      {
        "text": "回复 25 生命",
        "cost": {},
        "gain": {
          "heal": 25
        }
      },
      {
        "text": "付 12 荒髓 → 升级 1 张牌",
        "cost": {
          "husui": 12
        },
        "gain": {
          "upgrade": 1
        }
      }
    ],
    "link": "召唤卡 ≥3：额外获得 R_062 妖骨笛",
    "lore": "天马行空，白身黑尾",
    "text": "天马行空，白身黑尾"
  },
  {
    "id": "V020",
    "name": "烛龙之瞳",
    "act": 3,
    "weight": 30,
    "pre": "无",
    "options": [
      {
        "text": "获得随机荒遗物（R_006/R_011/R_016/R_020/R_080）",
        "cost": {},
        "gain": {
          "randomRelic": "curse"
        },
        "battle": null
      },
      {
        "text": "失 20 生命 → 随机史诗卡（三选一）",
        "cost": {
          "hp": 20
        },
        "gain": {
          "randomCard": "epic"
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "昼夜卡 ≥2：荒遗物可指定",
    "lore": "烛龙之瞳，照彻九幽",
    "text": "烛龙之瞳，照彻九幽"
  },
  {
    "id": "V021",
    "name": "荒蚀母体",
    "act": 3,
    "weight": 30,
    "pre": "无",
    "options": [
      {
        "text": "战斗（EL302×1）→ 随机稀有遗物",
        "cost": {},
        "gain": {
          "randomRelic": "rare"
        },
        "battle": {
          "pool": [
            "EL302"
          ],
          "kind": "elite"
        }
      },
      {
        "text": "付 18 荒髓 → 净化全部荒蚀",
        "cost": {
          "husui": 18
        },
        "gain": {
          "purify": true
        }
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {}
      }
    ],
    "link": "有荒蚀牌：付 18 改为付 12",
    "lore": "母体蠕动，蚀气育卵",
    "text": "母体蠕动，蚀气育卵"
  },
  {
    "id": "V022",
    "name": "山神大祠",
    "act": 3,
    "weight": 30,
    "pre": "无",
    "options": [
      {
        "text": "回复 40 生命",
        "cost": {},
        "gain": {
          "heal": 40
        }
      },
      {
        "text": "获得随机誓约 + 随机普通遗物",
        "cost": {},
        "gain": {
          "omen": true,
          "randomRelic": "normal"
        }
      },
      {
        "text": "付 20 荒髓 → 删 2 张牌",
        "cost": {
          "husui": 20
        },
        "gain": {
          "removeCard": 2
        }
      }
    ],
    "link": "有誓约：誓约选项改为随机稀有遗物",
    "lore": "大祠巍峨，香火鼎盛",
    "text": "大祠巍峨，香火鼎盛"
  },
  {
    "id": "V023",
    "name": "九婴之巢",
    "act": 3,
    "weight": 30,
    "pre": "无",
    "options": [
      {
        "text": "战斗（E304×1）→ 随机首领专属牌（C_L 池）",
        "cost": {},
        "gain": {
          "randomCard": "boss"
        },
        "battle": {
          "pool": [
            "E304"
          ],
          "kind": "battle"
        }
      },
      {
        "text": "付 18 荒髓 → 随机稀有遗物",
        "cost": {
          "husui": 18
        },
        "gain": {
          "randomRelic": "rare"
        }
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {}
      }
    ],
    "link": "无",
    "lore": "九首蛇身，巢穴腥膻",
    "text": "九首蛇身，巢穴腥膻"
  },
  {
    "id": "V024",
    "name": "犀渠金甲",
    "act": 3,
    "weight": 30,
    "pre": "无",
    "options": [
      {
        "text": "失 15 生命 → R_047 玄武甲",
        "cost": {
          "hp": 15
        },
        "gain": {
          "relicId": "R_047"
        },
        "battle": null
      },
      {
        "text": "付 15 荒髓 → 随机史诗卡（三选一）",
        "cost": {
          "husui": 15
        },
        "gain": {
          "randomCard": "epic"
        },
        "battle": null
      },
      {
        "text": "离开",
        "cost": {},
        "gain": {},
        "battle": null
      }
    ],
    "link": "前排卡 ≥3：失 15 改为失 10",
    "lore": "苍身牛形，金甲覆体",
    "text": "苍身牛形，金甲覆体"
  }
];
  SH.HEROES = [
  {
    "id": "baiZe",
    "name": "白泽",
    "title": "瑞兽使",
    "role": "驯化控制",
    "hp": 80,
    "qi": 3,
    "deck": [
      "C_B_MU_001",
      "C_B_JIN_001",
      "C_B_JIN_001",
      "C_B_MU_002",
      "C_B_JIN_002",
      "C_S_WU_001",
      "C_S_WU_001",
      "C_S_WU_002",
      "C_Z_MU_001",
      "C_Y_JIN_001"
    ],
    "relic": "R_002",
    "skill": {
      "name": "通物",
      "text": "本回合翻面不耗灵气",
      "effects": [
        {
          "op": "flipFreeAll"
        }
      ]
    },
    "unlock": "初始",
    "difficulty": "低",
    "desc": "白泽通万物之情，巡荒以驯化安境"
  },
  {
    "id": "qiongQi",
    "name": "穷奇",
    "title": "凶兽驭者",
    "role": "凶化爆发",
    "hp": 75,
    "qi": 3,
    "deck": [
      "C_B_HUO_006",
      "C_B_HUO_006",
      "C_B_JIN_007",
      "C_B_HUO_002",
      "C_B_MU_003",
      "C_S_HUO_001",
      "C_S_HUO_002",
      "C_S_JIN_001",
      "C_Z_HUO_001",
      "C_Y_HUO_001"
    ],
    "relic": "R_014",
    "skill": {
      "name": "纵凶",
      "text": "本回合凶化面自损减半（向上取整）",
      "effects": [
        {
          "op": "static",
          "kind": "feralSelfHalf"
        }
      ]
    },
    "unlock": "阶位 2",
    "difficulty": "中",
    "desc": "穷奇驭凶兽，以暴制暴"
  },
  {
    "id": "zhaoYao",
    "name": "招摇",
    "title": "山神祀",
    "role": "地形防御",
    "hp": 90,
    "qi": 3,
    "deck": [
      "C_B_TU_002",
      "C_B_TU_002",
      "C_B_TU_003",
      "C_B_SHUI_003",
      "C_B_TU_007",
      "C_S_TU_001",
      "C_S_TU_002",
      "C_S_TU_003",
      "C_Z_TU_001",
      "C_Y_TU_001"
    ],
    "relic": "R_003",
    "skill": {
      "name": "镇岳",
      "text": "前哨格异兽 +3 生命，持续本场",
      "effects": [
        {
          "op": "frontHpTurn",
          "v": 3
        }
      ]
    },
    "unlock": "阶位 5",
    "difficulty": "中",
    "desc": "招摇山神，借地势御荒"
  },
  {
    "id": "wuXian",
    "name": "巫咸",
    "title": "方士",
    "role": "术法相生",
    "hp": 70,
    "qi": 4,
    "deck": [
      "C_B_SHUI_009",
      "C_B_JIN_012",
      "C_B_SHUI_011",
      "C_B_TU_012",
      "C_B_JIN_008",
      "C_S_WU_002",
      "C_S_WU_003",
      "C_S_WU_005",
      "C_Z_SHUI_001",
      "C_Y_SHUI_001"
    ],
    "relic": "R_069",
    "skill": {
      "name": "问神",
      "text": "抽 2，获得 1 灵涌",
      "effects": [
        {
          "op": "draw",
          "v": 2
        },
        {
          "op": "lingyong",
          "v": 1
        }
      ]
    },
    "unlock": "阶位 8",
    "difficulty": "高",
    "desc": "巫咸蓍草通神，以术法乱荒"
  }
];
  SH.SCHOOLS = [
  {
    "id": "S01",
    "name": "凶化爆发",
    "coreCards": "C_B_JIN_001 狰、C_B_JIN_007 穷奇幼兽、C_B_HUO_006 祸斗、C_Y_JIN_003 刑天战舞",
    "coreRelics": "R_001 狰之牙、R_009 刑天战鼓、R_014 穷奇爪",
    "stage": "卷 2 中期（需 3 张凶化牌 + 1 件凶化遗物）",
    "pros": "抢血快，普通战 3—4 回合",
    "cons": "自损高，怕反震 / 破甲词缀",
    "limit": "凶化自损不能击杀自己；每回合凶化打出 ≤5；R_009 自损每回合 ≤3",
    "test": "10 局内至少 3 局在卷 2 首领前生命 <50%"
  },
  {
    "id": "S02",
    "name": "驯化控制",
    "coreCards": "C_B_MU_001 九尾狐、C_B_SHUI_001 蛊雕、C_B_JIN_011 狡",
    "coreRelics": "R_002 白泽图、R_010 九尾幻尾、R_047 玄武甲",
    "stage": "卷 1 末（需 2 张驯化牌 + 1 件翻面遗物）",
    "pros": "稳定，控制层数上限 5",
    "cons": "输出低，首领战可能超 12 回合",
    "limit": "控制层数 ≤5；土牢 ≤3；冻缓 ≤5",
    "test": "首领战回合数 ≤12；控制层数不超上限"
  },
  {
    "id": "S03",
    "name": "相生循环",
    "coreCards": "C_B_JIN_008 英招、C_B_JIN_012 讙、C_B_MU_011 天吴、C_S_WU_002 灵涌术",
    "coreRelics": "R_005 灵涌之环、R_060 灵涌瓶、R_077 青龙角",
    "stage": "卷 2 中期（需 3 种五行 + 2 件相生遗物）",
    "pros": "费用引擎，单回合多牌",
    "cons": "怕噬灵 / 静默词缀；无属性牌断链",
    "limit": "相生 ≤3 次/回合；灵涌超上限 ≤2；抽牌 ≤12",
    "test": "单回合相生触发 ≤3；灵涌不超上限 +2"
  },
  {
    "id": "S04",
    "name": "单属性克制",
    "coreCards": "C_B_JIN_006 白虎、C_B_JIN_010 蓐收、C_B_MU_006 青龙",
    "coreRelics": "R_008 金脉罗盘、R_054 蓐收刃、R_078 白虎爪",
    "stage": "卷 2（需 5 张同属性 + 1 件相克遗物）",
    "pros": "对克制敌人伤害 ×1.5",
    "cons": "被金甲 / 镇岳 / 破甲反制",
    "limit": "相克每牌每目标 1 层；加伤遗物互斥",
    "test": "对同属性敌人伤害不超基础 ×2"
  },
  {
    "id": "S05",
    "name": "前排站场",
    "coreCards": "C_B_JIN_005 豪彘、C_B_TU_011 石敢当、C_B_TU_004 犀渠",
    "coreRelics": "R_003 招摇山图、R_021 石肤符、R_061 兽皮甲",
    "stage": "卷 1 末（需 2 张高生命异兽 + 1 件前排遗物）",
    "pros": "防线稳，本体少受伤",
    "cons": "后排弱，怕多目标 / 推进",
    "limit": "前排格最多 1 异兽；生命增益不叠加超 3 层",
    "test": "前哨格异兽生命 ≤15；本体生命损失 ≤30%"
  },
  {
    "id": "S06",
    "name": "昼夜切换",
    "coreCards": "C_B_HUO_001 烛九阴、C_B_HUO_010 烛龙幼体、C_B_HUO_001 烛九阴（昼夜）",
    "coreRelics": "R_004 烛阴之瞳、R_019 烛龙逆鳞、R_071 烛龙眼",
    "stage": "卷 2（需 2 张昼夜牌 + 1 件翻面遗物）",
    "pros": "灵活，切换触发多效果",
    "cons": "依赖翻面费用；怕静默",
    "limit": "每牌每回合翻 1 次；昼夜切换每回合 ≤2 次",
    "test": "单回合翻面 ≤3；昼夜切换 ≤2"
  },
  {
    "id": "S07",
    "name": "召唤铺场",
    "coreCards": "C_B_MU_002 鹿蜀、C_B_SHUI_008 蠪侄、C_S_MU_005 句芒春生",
    "coreRelics": "R_013 鹿蜀铃、R_023 鹿角、R_062 妖骨笛",
    "stage": "卷 2（需 3 张召唤牌 + 1 件召唤遗物）",
    "pros": "铺场快，多单位阻挡",
    "cons": "怕荒蚀母体；召唤失调限制",
    "limit": "每回合召唤 ≤2（誓约后 ≤3）；同名 ≤1；召唤物上限普通 1 / 精英 2 / 首领 3",
    "test": "单回合召唤 ≤3；场上召唤物 ≤3"
  },
  {
    "id": "S08",
    "name": "自损祭仪",
    "coreCards": "C_Y_JIN_001 金祭、C_Y_HUO_001 火祭、C_Y_MU_001 木祭、C_Y_JIN_003 刑天战舞",
    "coreRelics": "R_009 刑天战鼓、R_006 噬灵铃、R_020 刑天首",
    "stage": "卷 3（需 3 张祭仪 + 2 件自损遗物）",
    "pros": "爆发高，单回合斩杀",
    "cons": "生命压力大；自损上限 10/回合",
    "limit": "自损不能使生命 <1；每回合自损 ≤10；R_020 最大生命 -10",
    "test": "单回合自损 ≤10；生命不低于 1"
  }
];
  SH.SCHOOL_FIT = {
  "凶化爆发": {
    "baiZe": "B",
    "qiongQi": "S",
    "zhaoYao": "C",
    "wuXian": "B"
  },
  "驯化控制": {
    "baiZe": "S",
    "qiongQi": "C",
    "zhaoYao": "B",
    "wuXian": "B"
  },
  "相生循环": {
    "baiZe": "B",
    "qiongQi": "C",
    "zhaoYao": "C",
    "wuXian": "S"
  },
  "单属性克制": {
    "baiZe": "B",
    "qiongQi": "B",
    "zhaoYao": "B",
    "wuXian": "B"
  },
  "前排站场": {
    "baiZe": "B",
    "qiongQi": "C",
    "zhaoYao": "S",
    "wuXian": "C"
  },
  "昼夜切换": {
    "baiZe": "B",
    "qiongQi": "B",
    "zhaoYao": "C",
    "wuXian": "A"
  },
  "召唤铺场": {
    "baiZe": "A",
    "qiongQi": "C",
    "zhaoYao": "B",
    "wuXian": "B"
  },
  "自损祭仪": {
    "baiZe": "C",
    "qiongQi": "S",
    "zhaoYao": "C",
    "wuXian": "B"
  }
};
  SH.KEYWORDS = [
  {
    "id": "K01",
    "name": "灵气",
    "def": "每回合回复至上限的战斗费用",
    "bound": "不保留；上限 10；灵涌优先消耗",
    "tip": "每回合恢复的战斗资源"
  },
  {
    "id": "K02",
    "name": "灵涌",
    "def": "临时灵气，可超上限最多 2 点",
    "bound": "优先消耗；回合结束清零；噬灵可减；不受层数上限 5 限制",
    "tip": "临时灵气，优先消耗"
  },
  {
    "id": "K03",
    "name": "荒髓",
    "def": "局内货币",
    "bound": "不继承；失败不返还；事件 / 坊市 / 祭坛使用",
    "tip": "巡荒所得的局内货币"
  },
  {
    "id": "K04",
    "name": "荒痕",
    "def": "玩家侧三格防线",
    "bound": "1 前哨 / 2 中阵 / 3 后阵；每格 1 异兽 1 敌人",
    "tip": "三格防线，拦截敌人推进"
  },
  {
    "id": "K05",
    "name": "本体",
    "def": "巡吏所在位置",
    "bound": "敌人突入造成攻击力伤害",
    "tip": "巡吏所在，敌人突入即受伤"
  },
  {
    "id": "K06",
    "name": "前哨格",
    "def": "荒痕第 1 格",
    "bound": "先接敌；部分遗物 / 地形只作用此格",
    "tip": "第一道防线"
  },
  {
    "id": "K07",
    "name": "中阵格",
    "def": "荒痕第 2 格",
    "bound": "部分首领毒雾改变此格地形",
    "tip": "第二道防线"
  },
  {
    "id": "K08",
    "name": "后阵格",
    "def": "荒痕第 3 格",
    "bound": "敌人到达后下回合突入",
    "tip": "最后一道防线"
  },
  {
    "id": "K09",
    "name": "交战格",
    "def": "同格有玩家异兽与敌人",
    "bound": "异兽只攻击同格敌人",
    "tip": "同格敌我交战"
  },
  {
    "id": "K10",
    "name": "拥堵",
    "def": "敌人推进目标格已有敌人",
    "bound": "本回合不推进",
    "tip": "敌人推进受阻"
  },
  {
    "id": "K11",
    "name": "突入",
    "def": "后阵未被阻挡的敌人下回合攻击本体",
    "bound": "造成攻击力伤害并移出",
    "tip": "敌人突破防线攻击本体"
  },
  {
    "id": "K12",
    "name": "召唤失调",
    "def": "召唤当回合不能自动攻击",
    "bound": "可阻挡；可被卡牌解除",
    "tip": "新召唤异兽当回合不能攻击"
  },
  {
    "id": "K13",
    "name": "荒蚀",
    "def": "同名异兽被击杀后本场禁用",
    "bound": "按卡名；战斗结束清除；可净化",
    "tip": "同名异兽本场不可再召唤"
  },
  {
    "id": "K14",
    "name": "驯化面",
    "def": "双面牌默认面",
    "bound": "偏向防御 / 控制 / 资源",
    "tip": "异兽的驯化形态"
  },
  {
    "id": "K15",
    "name": "凶化面",
    "def": "双面牌翻转面",
    "bound": "偏向进攻 / 爆发 / 自损",
    "tip": "异兽的凶化形态"
  },
  {
    "id": "K16",
    "name": "翻面",
    "def": "支付 1 灵气切换双面牌",
    "bound": "每牌每回合 1 次；不触发打出",
    "tip": "切换异兽牌的形态"
  },
  {
    "id": "K17",
    "name": "相生链",
    "def": "连续打出相生五行",
    "bound": "每回合 ≤3 次；无属性断链；翻面不断链",
    "tip": "五行相生触发减费与灵涌"
  },
  {
    "id": "K18",
    "name": "相克",
    "def": "五行克制造成 ×1.5 并附加状态",
    "bound": "每牌每目标最多 1 层；无属性不参与",
    "tip": "五行克制增伤并附加状态"
  },
  {
    "id": "K19",
    "name": "裂甲",
    "def": "受击伤害 +1/层",
    "bound": "上限 5；持续 2 回合；金克木附加",
    "tip": "受到攻击伤害增加"
  },
  {
    "id": "K20",
    "name": "缠绕",
    "def": "推进值 -1/层",
    "bound": "上限 5；持续 1 回合；木克土附加",
    "tip": "推进受阻"
  },
  {
    "id": "K21",
    "name": "土牢",
    "def": "意图无法执行",
    "bound": "上限 3；执行失败减 1；土克水附加",
    "tip": "本次意图无法执行"
  },
  {
    "id": "K22",
    "name": "冻缓",
    "def": "攻击 -2/层",
    "bound": "上限 5；持续 2 回合；水克火附加",
    "tip": "攻击力降低"
  },
  {
    "id": "K23",
    "name": "灼烧",
    "def": "回合结束失去 2×层数生命",
    "bound": "上限 5；持续 2 回合；火克金附加",
    "tip": "回合结束受到伤害"
  },
  {
    "id": "K24",
    "name": "中毒",
    "def": "回合结束失去 1×层数生命",
    "bound": "上限 5；持续 3 回合；可驱散",
    "tip": "持续中毒伤害"
  },
  {
    "id": "K25",
    "name": "虚弱",
    "def": "造成伤害 -1/层",
    "bound": "上限 3；持续 2 回合",
    "tip": "造成伤害降低"
  },
  {
    "id": "K26",
    "name": "护盾",
    "def": "吸收伤害",
    "bound": "无层数上限；至破碎；不触发受击",
    "tip": "吸收伤害的护盾"
  },
  {
    "id": "K27",
    "name": "迅捷",
    "def": "推进 +1/层",
    "bound": "上限 3；持续 2 回合",
    "tip": "推进值增加"
  },
  {
    "id": "K28",
    "name": "狂暴",
    "def": "攻击 +1/层",
    "bound": "上限 5；永久",
    "tip": "攻击力永久提升"
  },
  {
    "id": "K29",
    "name": "再生",
    "def": "回合结束 +1/层生命",
    "bound": "上限 5；持续 3 回合",
    "tip": "回合结束回复生命"
  },
  {
    "id": "K30",
    "name": "静默",
    "def": "术法费用 +1",
    "bound": "持续 1 回合；可驱散",
    "tip": "术法费用增加"
  },
  {
    "id": "K31",
    "name": "噬灵",
    "def": "获得灵涌时改为失去 1 灵气",
    "bound": "上限 3；持续 2 回合",
    "tip": "灵涌转化为灵气损失"
  },
  {
    "id": "K32",
    "name": "消耗",
    "def": "打出后移出本场战斗",
    "bound": "不进弃牌堆；不洗回",
    "tip": "本场战斗移出"
  },
  {
    "id": "K33",
    "name": "地形",
    "def": "荒痕格标签",
    "bound": "有单位时生效；每格 1 个；不与同格重复",
    "tip": "荒痕格的特殊环境"
  },
  {
    "id": "K34",
    "name": "誓约",
    "def": "山神祠永久增益 + 负面",
    "bound": "最多 3 个；不可解除；荒遗物可强化",
    "tip": "永久增益与代价"
  },
  {
    "id": "K35",
    "name": "荒遗物",
    "def": "强力遗物 + 负面条件",
    "bound": "首领掉落；同局 ≤2；不可售卖",
    "tip": "强力但有代价的遗物"
  },
  {
    "id": "K36",
    "name": "异变",
    "def": "祭坛替换独立版本",
    "bound": "独立同名上限；可再升级 1 次；原牌移出",
    "tip": "卡牌的异变形态"
  },
  {
    "id": "K37",
    "name": "升级",
    "def": "每牌 1 次",
    "bound": "双面同时升级；异变后可再升级 1 次",
    "tip": "卡牌强化"
  },
  {
    "id": "K38",
    "name": "自损",
    "def": "失去生命",
    "bound": "不能低于 1；每回合 ≤10；护盾抵消不算",
    "tip": "主动失去生命"
  },
  {
    "id": "K39",
    "name": "首领专属",
    "def": "仅首领奖励掉落的卡",
    "bound": "同名上限 1；不进普通池",
    "tip": "首领掉落的专属卡"
  },
  {
    "id": "K40",
    "name": "未完成池",
    "def": "缺图鉴 / 图标 / DSL 的内容",
    "bound": "不得进入掉落池；开发期标记",
    "tip": "未完成内容不进入游戏"
  }
];
  SH.ACHIEVEMENTS = [
  {
    "id": "A01",
    "name": "初巡荒",
    "cat": "战斗",
    "cond": "完成第一场战斗",
    "reward": "图鉴 +1",
    "lore": "初入大荒，首战告捷"
  },
  {
    "id": "A02",
    "name": "卷末斩",
    "cat": "战斗",
    "cond": "击败任意卷末首领",
    "reward": "图鉴 +1",
    "lore": "一卷终了，首领伏诛"
  },
  {
    "id": "A03",
    "name": "三卷通",
    "cat": "战斗",
    "cond": "荒阶 0 通关",
    "reward": "卡背「巡荒」",
    "lore": "三卷尽通，山海在握"
  },
  {
    "id": "A04",
    "name": "无伤普通",
    "cat": "战斗",
    "cond": "单场普通战不受本体伤害",
    "reward": "图鉴 +1",
    "lore": "异兽挡关，本体无恙"
  },
  {
    "id": "A05",
    "name": "首领克星",
    "cat": "战斗",
    "cond": "单局击败 3 个首领",
    "reward": "头像「烛龙」",
    "lore": "首领连诛，威震大荒"
  },
  {
    "id": "A06",
    "name": "突入阻断",
    "cat": "战斗",
    "cond": "单场阻断 5 次敌人突入",
    "reward": "图鉴 +1",
    "lore": "防线如铁，突入无门"
  },
  {
    "id": "A07",
    "name": "荒蚀净化",
    "cat": "战斗",
    "cond": "单场净化 2 个荒蚀",
    "reward": "图鉴 +1",
    "lore": "荒蚀尽涤，异兽归位"
  },
  {
    "id": "A08",
    "name": "一击十伤",
    "cat": "战斗",
    "cond": "单次造成 ≥10 伤害",
    "reward": "图鉴 +1",
    "lore": "一击裂石"
  },
  {
    "id": "A09",
    "name": "满血首领",
    "cat": "战斗",
    "cond": "满生命击败首领",
    "reward": "图鉴 +1",
    "lore": "无瑕之战"
  },
  {
    "id": "A10",
    "name": "极限反杀",
    "cat": "战斗",
    "cond": "生命 ≤3 时击败首领",
    "reward": "图鉴 +1",
    "lore": "绝境反杀"
  },
  {
    "id": "A11",
    "name": "十回合内",
    "cat": "战斗",
    "cond": "普通战 ≤3 回合胜利",
    "reward": "图鉴 +1",
    "lore": "速战速决"
  },
  {
    "id": "A12",
    "name": "零召唤",
    "cat": "战斗",
    "cond": "不召唤异兽赢 1 场普通战",
    "reward": "图鉴 +1",
    "lore": "术法制敌"
  },
  {
    "id": "A13",
    "name": "全驯化",
    "cat": "战斗",
    "cond": "仅用驯化面赢 1 场精英战",
    "reward": "图鉴 +1",
    "lore": "驯化制胜"
  },
  {
    "id": "A14",
    "name": "全凶化",
    "cat": "战斗",
    "cond": "仅用凶化面赢 1 场精英战",
    "reward": "图鉴 +1",
    "lore": "凶化制胜"
  },
  {
    "id": "A15",
    "name": "荒阶 5 通",
    "cat": "战斗",
    "cond": "荒阶 5 通关",
    "reward": "卡背「荒阶」",
    "lore": "荒阶五重，仍可破之"
  },
  {
    "id": "A16",
    "name": "三相生",
    "cat": "构筑",
    "cond": "单回合触发 3 次相生",
    "reward": "图鉴 +1",
    "lore": "五行连环"
  },
  {
    "id": "A17",
    "name": "五行圆满",
    "cat": "构筑",
    "cond": "一局集齐 5 种五行卡",
    "reward": "图鉴 +1",
    "lore": "五行俱全"
  },
  {
    "id": "A18",
    "name": "双面大师",
    "cat": "构筑",
    "cond": "单场翻面 ≥5 次",
    "reward": "图鉴 +1",
    "lore": "翻面如反掌"
  },
  {
    "id": "A19",
    "name": "荒蚀不侵",
    "cat": "构筑",
    "cond": "单局不触发荒蚀通关",
    "reward": "图鉴 +1",
    "lore": "异兽无殒"
  },
  {
    "id": "A20",
    "name": "精简牌组",
    "cat": "构筑",
    "cond": "牌组 ≤10 张通关",
    "reward": "卡背「精简」",
    "lore": "少即是多"
  },
  {
    "id": "A21",
    "name": "满编牌组",
    "cat": "构筑",
    "cond": "牌组 30 张通关",
    "reward": "图鉴 +1",
    "lore": "万法归一"
  },
  {
    "id": "A22",
    "name": "全异变",
    "cat": "构筑",
    "cond": "单局异变 3 张牌",
    "reward": "图鉴 +1",
    "lore": "异变丛生"
  },
  {
    "id": "A23",
    "name": "全升级",
    "cat": "构筑",
    "cond": "单局升级 5 张牌",
    "reward": "图鉴 +1",
    "lore": "精益求精"
  },
  {
    "id": "A24",
    "name": "誓约三连",
    "cat": "构筑",
    "cond": "单局获得 3 个誓约",
    "reward": "图鉴 +1",
    "lore": "誓约缠身"
  },
  {
    "id": "A25",
    "name": "荒遗物双持",
    "cat": "构筑",
    "cond": "单局持有 2 件荒遗物",
    "reward": "头像「饕餮」",
    "lore": "荒遗双持"
  },
  {
    "id": "A26",
    "name": "单属性极致",
    "cat": "构筑",
    "cond": "牌组 ≥15 张同属性通关",
    "reward": "卡背「纯色」",
    "lore": "一色到底"
  },
  {
    "id": "A27",
    "name": "召唤大师",
    "cat": "构筑",
    "cond": "单场召唤 ≥5 只异兽",
    "reward": "图鉴 +1",
    "lore": "铺场如潮"
  },
  {
    "id": "A28",
    "name": "荒髓满仓",
    "cat": "经济",
    "cond": "单局持有 ≥200 荒髓",
    "reward": "图鉴 +1",
    "lore": "荒髓满仓"
  },
  {
    "id": "A29",
    "name": "一毛不拔",
    "cat": "经济",
    "cond": "不购买任何坊市商品通关",
    "reward": "卡背「节俭」",
    "lore": "分文未花"
  },
  {
    "id": "A30",
    "name": "坊市常客",
    "cat": "经济",
    "cond": "单局坊市购买 ≥5 次",
    "reward": "图鉴 +1",
    "lore": "坊市常客"
  },
  {
    "id": "A31",
    "name": "祭坛熟客",
    "cat": "经济",
    "cond": "单局祭坛使用 ≥3 次",
    "reward": "图鉴 +1",
    "lore": "祭坛熟客"
  },
  {
    "id": "A32",
    "name": "删牌大师",
    "cat": "经济",
    "cond": "单局删牌 ≥3 张",
    "reward": "图鉴 +1",
    "lore": "删繁就简"
  },
  {
    "id": "A33",
    "name": "荒髓散尽",
    "cat": "经济",
    "cond": "单局结束时荒髓 ≤5",
    "reward": "图鉴 +1",
    "lore": "散尽荒髓"
  },
  {
    "id": "A34",
    "name": "事件全选",
    "cat": "经济",
    "cond": "单局事件选择 ≥5 次",
    "reward": "图鉴 +1",
    "lore": "逢事必参"
  },
  {
    "id": "A35",
    "name": "赎价不还",
    "cat": "经济",
    "cond": "单局支付赎价 ≥5 次",
    "reward": "图鉴 +1",
    "lore": "赎价不还"
  },
  {
    "id": "A36",
    "name": "图鉴初开",
    "cat": "探索",
    "cond": "解锁 10 条图鉴",
    "reward": "图鉴 +1",
    "lore": "图鉴初开"
  },
  {
    "id": "A37",
    "name": "图鉴半卷",
    "cat": "探索",
    "cond": "解锁 200 条图鉴",
    "reward": "卡背「图鉴」",
    "lore": "图鉴半卷"
  },
  {
    "id": "A38",
    "name": "图鉴全卷",
    "cat": "探索",
    "cond": "解锁 400 条图鉴",
    "reward": "头像「白泽」",
    "lore": "图鉴全卷"
  },
  {
    "id": "A39",
    "name": "四巡吏",
    "cat": "探索",
    "cond": "4 巡吏各通关 1 次",
    "reward": "图鉴 +1",
    "lore": "四巡吏皆通"
  },
  {
    "id": "A40",
    "name": "八流派",
    "cat": "探索",
    "cond": "8 流派各通关 1 次",
    "reward": "卡背「流派」",
    "lore": "八流派皆通"
  },
  {
    "id": "A41",
    "name": "荒阶十",
    "cat": "探索",
    "cond": "荒阶 10 通关",
    "reward": "头像「大荒」",
    "lore": "荒阶十重"
  },
  {
    "id": "A42",
    "name": "每日首胜",
    "cat": "探索",
    "cond": "完成 1 次每日挑战",
    "reward": "图鉴 +1",
    "lore": "每日首胜",
    "notReady": true
  },
  {
    "id": "A43",
    "name": "每周首胜",
    "cat": "探索",
    "cond": "完成 1 次每周挑战",
    "reward": "图鉴 +1",
    "lore": "每周首胜",
    "notReady": true
  },
  {
    "id": "A44",
    "name": "荒阶 1",
    "cat": "荒阶",
    "cond": "荒阶 1 通关",
    "reward": "图鉴 +1",
    "lore": "荒阶初启"
  },
  {
    "id": "A45",
    "name": "荒阶 3",
    "cat": "荒阶",
    "cond": "荒阶 3 通关",
    "reward": "图鉴 +1",
    "lore": "穷奇现世"
  },
  {
    "id": "A46",
    "name": "荒阶 5",
    "cat": "荒阶",
    "cond": "荒阶 5 通关",
    "reward": "图鉴 +1",
    "lore": "饕餮现世"
  },
  {
    "id": "A47",
    "name": "荒阶 7",
    "cat": "荒阶",
    "cond": "荒阶 7 通关",
    "reward": "图鉴 +1",
    "lore": "烛龙荒化"
  },
  {
    "id": "A48",
    "name": "荒阶 9",
    "cat": "荒阶",
    "cond": "荒阶 9 通关",
    "reward": "图鉴 +1",
    "lore": "荒阶九重"
  },
  {
    "id": "A49",
    "name": "卡牌全收",
    "cat": "收集",
    "cond": "收集 150 张主卡",
    "reward": "卡背「全卡」",
    "lore": "卡牌全收"
  },
  {
    "id": "A50",
    "name": "遗物全收",
    "cat": "收集",
    "cond": "收集 80 件遗物",
    "reward": "卡背「全遗物」",
    "lore": "遗物全收"
  }
];
  SH.AFFIXES = [
  {
    "id": "D01",
    "name": "敌先手",
    "text": "战斗开始敌人先行动 1 次",
    "conflict": [
      "D02"
    ],
    "minRank": 1,
    "stack": false
  },
  {
    "id": "D02",
    "name": "少抽",
    "text": "初始手牌 -1",
    "conflict": [
      "D01"
    ],
    "minRank": 1,
    "stack": false
  },
  {
    "id": "D03",
    "name": "灵气稀薄",
    "text": "灵气上限 -1",
    "conflict": [
      "D04"
    ],
    "minRank": 2,
    "stack": false
  },
  {
    "id": "D04",
    "name": "灵涌难聚",
    "text": "相生每回合 -1 次",
    "conflict": [
      "D03"
    ],
    "minRank": 2,
    "stack": false
  },
  {
    "id": "D05",
    "name": "遗物残缺",
    "text": "遗物槽 -1",
    "conflict": [
      "D06"
    ],
    "minRank": 3,
    "stack": false
  },
  {
    "id": "D06",
    "name": "事件无常",
    "text": "事件奖励随机化",
    "conflict": [
      "D05"
    ],
    "minRank": 3,
    "stack": false
  },
  {
    "id": "D07",
    "name": "坊市冷清",
    "text": "坊市无刷新",
    "conflict": [],
    "minRank": 4,
    "stack": false
  },
  {
    "id": "D08",
    "name": "精英强化",
    "text": "精英 +1 词缀",
    "conflict": [],
    "minRank": 3,
    "stack": false
  },
  {
    "id": "D09",
    "name": "首领额外",
    "text": "首领 +1 阶段词缀",
    "conflict": [],
    "minRank": 7,
    "stack": false
  },
  {
    "id": "D10",
    "name": "荒蚀不净",
    "text": "荒蚀不可净化",
    "conflict": [],
    "minRank": 8,
    "stack": false
  },
  {
    "id": "D11",
    "name": "地形恶劣",
    "text": "每战地形 +1",
    "conflict": [],
    "minRank": 2,
    "stack": false
  },
  {
    "id": "D12",
    "name": "荒髓减半",
    "text": "荒髓获取 -50%",
    "conflict": [
      "D13"
    ],
    "minRank": 6,
    "stack": false
  },
  {
    "id": "D13",
    "name": "物价飞涨",
    "text": "坊市价格 +20%",
    "conflict": [
      "D12"
    ],
    "minRank": 4,
    "stack": false
  },
  {
    "id": "D14",
    "name": "生命脆弱",
    "text": "最大生命 -10",
    "conflict": [
      "D15"
    ],
    "minRank": 3,
    "stack": false
  },
  {
    "id": "D15",
    "name": "自损加剧",
    "text": "自损 +50%",
    "conflict": [
      "D14"
    ],
    "minRank": 5,
    "stack": false
  },
  {
    "id": "D16",
    "name": "抽牌受阻",
    "text": "每回合抽牌 -1",
    "conflict": [],
    "minRank": 4,
    "stack": false
  },
  {
    "id": "D17",
    "name": "召唤迟滞",
    "text": "召唤失调 +1 回合",
    "conflict": [],
    "minRank": 5,
    "stack": false
  },
  {
    "id": "D18",
    "name": "相克减弱",
    "text": "相克倍率降为 1.3",
    "conflict": [],
    "minRank": 6,
    "stack": false
  },
  {
    "id": "D19",
    "name": "状态易散",
    "text": "状态上限 -1",
    "conflict": [],
    "minRank": 7,
    "stack": false
  },
  {
    "id": "D20",
    "name": "意图难测",
    "text": "每个敌人隐藏 1 个意图",
    "conflict": [],
    "minRank": 5,
    "stack": false
  },
  {
    "id": "D21",
    "name": "恢复减半",
    "text": "山神祠恢复减半",
    "conflict": [],
    "minRank": 10,
    "stack": false
  },
  {
    "id": "D22",
    "name": "牌组臃肿",
    "text": "初始牌组 +2 张低效牌",
    "conflict": [],
    "minRank": 6,
    "stack": false
  },
  {
    "id": "D23",
    "name": "遗物蒙尘",
    "text": "遗物触发概率 50%",
    "conflict": [],
    "minRank": 8,
    "stack": false
  },
  {
    "id": "D24",
    "name": "双精英",
    "text": "每卷精英 +1",
    "conflict": [],
    "minRank": 9,
    "stack": false
  },
  {
    "id": "D25",
    "name": "首领狂暴",
    "text": "首领攻击 +10%",
    "conflict": [],
    "minRank": 7,
    "stack": false
  },
  {
    "id": "D26",
    "name": "荒痕裂隙",
    "text": "荒痕格 -1（最低 2 格）",
    "conflict": [],
    "minRank": 10,
    "stack": false
  },
  {
    "id": "D27",
    "name": "五行紊乱",
    "text": "相生链每回合重置 2 次",
    "conflict": [],
    "minRank": 6,
    "stack": false
  },
  {
    "id": "D28",
    "name": "荒蚀蔓延",
    "text": "荒蚀触发时全体异兽 -1 生命",
    "conflict": [],
    "minRank": 8,
    "stack": false
  },
  {
    "id": "D29",
    "name": "誓约难守",
    "text": "誓约负面效果 +50%",
    "conflict": [],
    "minRank": 9,
    "stack": false
  },
  {
    "id": "D30",
    "name": "大荒压境",
    "text": "所有敌人生命 +10%",
    "conflict": [],
    "minRank": 10,
    "stack": false
  }
];
  SH.OMENS = [
  {
    "id": "O01",
    "name": "凶化誓约",
    "up": "凶化面造成的伤害 +2",
    "down": "驯化面费用 +1",
    "tags": [
      "凶化"
    ],
    "mod": {
      "feralDamage": 2,
      "tameCost": 1
    }
  },
  {
    "id": "O02",
    "name": "驯化誓约",
    "up": "驯化面召唤异兽 +1/+1",
    "down": "凶化面自损 +2",
    "tags": [
      "驯化"
    ],
    "mod": {
      "tameBeast": 1,
      "feralSelfDamage": 2
    }
  },
  {
    "id": "O03",
    "name": "相生誓约",
    "up": "相生额外 +1 灵涌",
    "down": "每回合相生最多 2 次",
    "tags": [
      "相生"
    ],
    "mod": {
      "chainBonus": 1,
      "chainLimit": 2
    }
  },
  {
    "id": "O04",
    "name": "离火誓约",
    "up": "火属性伤害 +3",
    "down": "其他属性伤害 -1",
    "tags": [
      "五行"
    ],
    "pickElement": "火",
    "mod": {
      "elementPick": 3,
      "otherPenalty": -1
    }
  },
  {
    "id": "O05",
    "name": "前排誓约",
    "up": "前哨格异兽生命 +4",
    "down": "后阵格异兽攻击 -2",
    "tags": [
      "前排"
    ],
    "mod": {
      "frontHp": 4,
      "backAtk": -2
    }
  },
  {
    "id": "O06",
    "name": "召唤誓约",
    "up": "每回合召唤上限 +1",
    "down": "召唤失调延长 1 回合",
    "tags": [
      "召唤"
    ],
    "mod": {
      "summonPlus": 1,
      "sickExtra": 1
    }
  },
  {
    "id": "O07",
    "name": "生命誓约",
    "up": "最大生命 +20",
    "down": "祭坛费用 +50%",
    "tags": [
      "生命"
    ],
    "mod": {
      "maxHp": 20,
      "altarCost": 0.5
    }
  },
  {
    "id": "O08",
    "name": "荒髓誓约",
    "up": "荒髓获取 +25%",
    "down": "坊市价格 +20%",
    "tags": [
      "经济"
    ],
    "mod": {
      "husuiGain": 0.25,
      "shopPrice": 0.2
    }
  },
  {
    "id": "O09",
    "name": "自损誓约",
    "up": "自损效果每点回复 1 生命",
    "down": "最大生命 -10",
    "tags": [
      "自损"
    ],
    "mod": {
      "selfDamageHeal": 1,
      "maxHp": -10
    }
  },
  {
    "id": "O10",
    "name": "昼夜誓约",
    "up": "昼夜切换时抽 1 张牌",
    "down": "每场战斗开始失去 5 生命",
    "tags": [
      "昼夜"
    ],
    "mod": {
      "daynightDraw": 1,
      "battleStartLose": 5
    }
  }
];
  SH.TERRAINS = [
  {
    "name": "瘴泽",
    "desc": "此格单位每回合结束失去 1 生命。",
    "color": "#6b7a4a"
  },
  {
    "name": "金脉",
    "desc": "此格异兽攻击 +1。",
    "color": "#d9c27a"
  },
  {
    "name": "风穴",
    "desc": "此格敌人推进 +1，受到伤害 +1。",
    "color": "#8fb6c9"
  },
  {
    "name": "石阵",
    "desc": "此格异兽生命 +2。",
    "color": "#b5926a"
  },
  {
    "name": "灵泉",
    "desc": "此格异兽每回合回复 1 生命。",
    "color": "#5f97c4"
  },
  {
    "name": "熔岩",
    "desc": "此格单位每回合结束失去 2 生命。",
    "color": "#cf5f45"
  },
  {
    "name": "毒雾",
    "desc": "此格敌人回合结束获得 1 冻缓并失去 1 生命。",
    "color": "#7fae72"
  },
  {
    "name": "冰原",
    "desc": "此格敌人攻击 -1。",
    "color": "#a8c7d8"
  }
];
  SH.STATUSES = {
  "裂甲": {
    "desc": "每层使受到攻击伤害 +1，持续 2 回合",
    "max": 5,
    "turns": 2,
    "bad": true
  },
  "缠绕": {
    "desc": "每层使推进值 -1（最低 0），持续 1 回合",
    "max": 5,
    "turns": 1,
    "bad": true
  },
  "土牢": {
    "desc": "使敌人下一次意图无法执行，持续 1 回合",
    "max": 3,
    "turns": 1,
    "bad": true
  },
  "冻缓": {
    "desc": "每层使攻击力 -2，持续 2 回合",
    "max": 5,
    "turns": 2,
    "bad": true
  },
  "灼烧": {
    "desc": "回合结束失去 2×层数 生命，持续 2 回合",
    "max": 5,
    "turns": 2,
    "bad": true
  },
  "中毒": {
    "desc": "回合结束失去 1×层数 生命，持续 3 回合",
    "max": 5,
    "turns": 3,
    "bad": true
  },
  "虚弱": {
    "desc": "造成伤害 -1/层，持续 2 回合",
    "max": 3,
    "turns": 2,
    "bad": true
  },
  "护盾": {
    "desc": "抵消等量伤害，无上限，至破碎",
    "max": 99,
    "turns": 1,
    "bad": false
  },
  "迅捷": {
    "desc": "推进 +1/层，持续 2 回合",
    "max": 3,
    "turns": 2,
    "bad": false
  },
  "狂暴": {
    "desc": "攻击 +1/层，永久",
    "max": 5,
    "turns": 99,
    "bad": false
  },
  "再生": {
    "desc": "回合结束 +1/层生命，持续 3 回合",
    "max": 5,
    "turns": 3,
    "bad": false
  },
  "静默": {
    "desc": "术法费用 +1，持续 1 回合",
    "max": 1,
    "turns": 1,
    "bad": true
  },
  "噬灵": {
    "desc": "获得灵涌时改为失去 1 灵气，持续 2 回合",
    "max": 3,
    "turns": 2,
    "bad": true
  },
  "荒蚀": {
    "desc": "同名异兽被击杀后本场不可再打出",
    "max": 1,
    "turns": 99,
    "bad": true
  },
  "召唤失调": {
    "desc": "召唤当回合不能自动攻击",
    "max": 1,
    "turns": 1,
    "bad": false
  }
};
  SH.VOLUMES = [
  {
    "index": 1,
    "name": "南山经",
    "boss": "B01",
    "layers": 8,
    "nodeCount": 10,
    "width": [
      2,
      3
    ],
    "terrainCount": 1,
    "terrainPool": [
      "瘴泽",
      "金脉",
      "石阵",
      "灵泉"
    ],
    "normal": [
      "E101",
      "E102",
      "E103",
      "E104",
      "E105",
      "E106",
      "E107",
      "E108"
    ],
    "elite": [
      "EL101",
      "EL102",
      "EL103",
      "EL104"
    ],
    "weights": {
      "battle": 45,
      "elite": 8,
      "event": 20,
      "altar": 8,
      "shop": 8,
      "shrine": 6
    }
  },
  {
    "index": 2,
    "name": "西山经",
    "boss": "B02",
    "layers": 9,
    "nodeCount": 11,
    "width": [
      2,
      3
    ],
    "terrainCount": 2,
    "terrainPool": [
      "瘴泽",
      "金脉",
      "风穴",
      "石阵",
      "毒雾"
    ],
    "normal": [
      "E201",
      "E202",
      "E203",
      "E204",
      "E205",
      "E206",
      "E207",
      "E208"
    ],
    "elite": [
      "EL201",
      "EL202",
      "EL203",
      "EL204"
    ],
    "weights": {
      "battle": 40,
      "elite": 10,
      "event": 20,
      "altar": 10,
      "shop": 10,
      "shrine": 5
    }
  },
  {
    "index": 3,
    "name": "北山经",
    "boss": "B03",
    "layers": 10,
    "nodeCount": 12,
    "width": [
      2,
      3
    ],
    "terrainCount": 3,
    "terrainPool": [
      "瘴泽",
      "金脉",
      "风穴",
      "石阵",
      "熔岩",
      "冰原"
    ],
    "normal": [
      "E301",
      "E302",
      "E303",
      "E304",
      "E305",
      "E306",
      "E307",
      "E308"
    ],
    "elite": [
      "EL301",
      "EL302",
      "EL303",
      "EL304"
    ],
    "weights": {
      "battle": 35,
      "elite": 12,
      "event": 20,
      "altar": 10,
      "shop": 10,
      "shrine": 5
    }
  }
];
  SH.RELIC_BY_ID = {}; SH.RELICS.forEach(function (r) { SH.RELIC_BY_ID[r.id] = r; });
  SH.ENEMY_BY_ID = {}; SH.ENEMIES.forEach(function (e) { SH.ENEMY_BY_ID[e.id] = e; });
  SH.EVENT_BY_ID = {}; SH.EVENTS.forEach(function (e) { SH.EVENT_BY_ID[e.id] = e; });
  SH.HERO_BY_ID = {}; SH.HEROES.forEach(function (h) { SH.HERO_BY_ID[h.id] = h; });
  SH.OMEN_BY_ID = {}; SH.OMENS.forEach(function (o) { SH.OMEN_BY_ID[o.id] = o; });
  SH.AFFIX_BY_ID = {}; SH.AFFIXES.forEach(function (a) { SH.AFFIX_BY_ID[a.id] = a; });
  SH.ACHIEVEMENT_BY_ID = {}; SH.ACHIEVEMENTS.forEach(function (a) { SH.ACHIEVEMENT_BY_ID[a.id] = a; });

  SH.KEYWORD_BY_NAME = {};
  SH.KEYWORDS.forEach(function (k) { SH.KEYWORD_BY_NAME[k.name] = k; });
  SH.TERRAIN_BY_NAME = {};
  SH.TERRAINS.forEach(function (t) { SH.TERRAIN_BY_NAME[t.name] = t; });
})(typeof window !== 'undefined' ? window : globalThis);
