/* ============================================================
 * 山海司·巡荒录  —  异兽牌 90 张（P0 5.4 主表自动编译）
 * 由 tools/build_cards.py 从 P0完善.docx 生成，请勿手改。
 * 生成时间：见 git 记录；数据源版本：P0 内容层第一批
 * ============================================================ */
(function (root) {
  'use strict';
  const SH = (root.SH = root.SH || {});
  SH.CARDS_BEAST = [
 {
  "id": "C_B_JIN_001",
  "name": "狰",
  "type": "beast",
  "element": "金",
  "rarity": "normal",
  "tags": [
   "凶化",
   "前排"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +2",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 2,
     "hp": 6
    },
    "text": "召唤 2/6，攻击后自损 1",
    "triggers": [
     [
      "attack",
      {
       "op": "unitLoseHp",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 4,
     "hp": 4
    },
    "text": "召唤 4/4，攻击 +2",
    "triggers": [
     [
      "passive",
      {
       "op": "flatAtk",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_002",
  "name": "狻猊",
  "type": "beast",
  "element": "金",
  "rarity": "normal",
  "tags": [
   "驯化",
   "前排"
  ],
  "mutateTo": null,
  "upgradeText": "回 2 生命",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 2,
     "hp": 7
    },
    "text": "召唤 2/7，回合结束回 1 生命",
    "triggers": [
     [
      "turnEnd",
      {
       "op": "healHero",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 4,
     "hp": 5
    },
    "text": "召唤 4/5，攻击后裂甲 1",
    "triggers": [
     [
      "attack",
      {
       "op": "statusTarget",
       "s": "裂甲",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_003",
  "name": "天狗",
  "type": "beast",
  "element": "金",
  "rarity": "normal",
  "tags": [
   "击杀",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +1",
  "faces": {
   "tame": {
    "cost": 1,
    "beast": {
     "atk": 2,
     "hp": 3
    },
    "text": "召唤 2/3，击杀回 2 生命",
    "triggers": [
     [
      "kill",
      {
       "op": "unitHeal",
       "v": 2
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 3,
     "hp": 3
    },
    "text": "召唤 3/3，击杀永久 +1 攻",
    "triggers": [
     [
      "kill",
      {
       "op": "permAtk",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_004",
  "name": "猼訑",
  "type": "beast",
  "element": "金",
  "rarity": "normal",
  "tags": [
   "前排",
   "驯化"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +1",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 5
    },
    "text": "召唤 3/5，受到攻击 -1",
    "triggers": [
     [
      "passive",
      {
       "op": "dmgReduce",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 4,
     "hp": 4
    },
    "text": "召唤 4/4，攻击 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "flatAtk",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_005",
  "name": "豪彘",
  "type": "beast",
  "element": "金",
  "rarity": "normal",
  "tags": [
   "前排",
   "控制"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +2",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 8
    },
    "text": "召唤 4/8，推进 -1",
    "triggers": [
     [
      "summon",
      {
       "op": "advanceAll",
       "v": -1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 6
    },
    "text": "召唤 6/6，攻击后自损 1",
    "triggers": [
     [
      "attack",
      {
       "op": "unitLoseHp",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_006",
  "name": "白虎",
  "type": "beast",
  "element": "金",
  "rarity": "epic",
  "tags": [
   "相克",
   "前排"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 8
    },
    "text": "召唤 5/8，相克伤害 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "counterBonus",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 8,
     "hp": 5
    },
    "text": "召唤 8/5，攻击后裂甲 2",
    "triggers": [
     [
      "attack",
      {
       "op": "statusTarget",
       "s": "裂甲",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_007",
  "name": "穷奇幼兽",
  "type": "beast",
  "element": "金",
  "rarity": "rare",
  "tags": [
   "击杀",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +1",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 6
    },
    "text": "召唤 4/6，击杀回 3 生命",
    "triggers": [
     [
      "kill",
      {
       "op": "unitHeal",
       "v": 3
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 5
    },
    "text": "召唤 6/5，击杀永久 +1 攻",
    "triggers": [
     [
      "kill",
      {
       "op": "permAtk",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_008",
  "name": "英招",
  "type": "beast",
  "element": "金",
  "rarity": "rare",
  "tags": [
   "相生",
   "驯化"
  ],
  "mutateTo": "C_X_B_JIN_008",
  "upgradeText": "减费 2",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 5
    },
    "text": "召唤 3/5，回合开始手牌 1 张减费 1",
    "triggers": [
     [
      "startTurn",
      {
       "op": "discount",
       "n": 1,
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 5,
     "hp": 4
    },
    "text": "召唤 5/4，攻击后抽 1 弃 1",
    "triggers": [
     [
      "attack",
      {
       "op": "drawDiscard",
       "v": 1,
       "d": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_009",
  "name": "陆吾",
  "type": "beast",
  "element": "金",
  "rarity": "rare",
  "tags": [
   "前排",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +2",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 7
    },
    "text": "召唤 4/7，前哨格异兽 +1 攻",
    "triggers": [
     [
      "passive",
      {
       "op": "frontAura",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 6,
     "hp": 6
    },
    "text": "召唤 6/6，攻击后自身 +1 攻",
    "triggers": [
     [
      "attack",
      {
       "op": "unitBuffAtk",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_010",
  "name": "蓐收",
  "type": "beast",
  "element": "金",
  "rarity": "epic",
  "tags": [
   "相克",
   "首领"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 9
    },
    "text": "召唤 5/9，金系伤害 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "elementBonus",
       "e": "金",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 8,
     "hp": 6
    },
    "text": "召唤 8/6，攻击后全体 1 伤害",
    "triggers": [
     [
      "attack",
      {
       "op": "aoe",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_011",
  "name": "狡",
  "type": "beast",
  "element": "金",
  "rarity": "normal",
  "tags": [
   "控制",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "裂甲 2",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 4
    },
    "text": "召唤 3/4，给敌 1 层裂甲",
    "triggers": [
     [
      "summon",
      {
       "op": "statusTarget",
       "s": "裂甲",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 5,
     "hp": 3
    },
    "text": "召唤 5/3，攻击后抽 1",
    "triggers": [
     [
      "attack",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_012",
  "name": "讙",
  "type": "beast",
  "element": "金",
  "rarity": "normal",
  "tags": [
   "相生",
   "驯化"
  ],
  "mutateTo": null,
  "upgradeText": "回 2 灵气",
  "faces": {
   "tame": {
    "cost": 1,
    "beast": {
     "atk": 2,
     "hp": 4
    },
    "text": "召唤 2/4，回合结束回 1 灵气（每场 1 次）",
    "triggers": [
     [
      "turnEnd",
      {
       "op": "qi",
       "v": 1,
       "once": true
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 4,
     "hp": 3
    },
    "text": "召唤 4/3，攻击后弃 1 抽 1",
    "triggers": [
     [
      "attack",
      {
       "op": "drawDiscard",
       "v": 1,
       "d": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_013",
  "name": "帝江",
  "type": "beast",
  "element": "金",
  "rarity": "rare",
  "tags": [
   "翻面",
   "凶化"
  ],
  "mutateTo": "C_X_B_JIN_013",
  "upgradeText": "抽 2",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 6
    },
    "text": "召唤 4/6，翻面时抽 1",
    "triggers": [
     [
      "flip",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 5
    },
    "text": "召唤 6/5，翻面时对随机敌 2 伤害",
    "triggers": [
     [
      "flip",
      {
       "op": "randomDmg",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_014",
  "name": "蓐收使",
  "type": "beast",
  "element": "金",
  "rarity": "normal",
  "tags": [
   "相克"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +1",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 2,
     "hp": 5
    },
    "text": "召唤 2/5，相克伤害 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "counterBonus",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 4,
     "hp": 4
    },
    "text": "召唤 4/4，攻击后裂甲 1",
    "triggers": [
     [
      "attack",
      {
       "op": "statusTarget",
       "s": "裂甲",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_015",
  "name": "白泽",
  "type": "beast",
  "element": "金",
  "rarity": "epic",
  "tags": [
   "翻面",
   "驯化"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +3",
  "faces": {
   "tame": {
    "cost": 5,
    "beast": {
     "atk": 6,
     "hp": 10
    },
    "text": "召唤 6/10，每场首次翻面不耗灵气",
    "triggers": [
     [
      "passive",
      {
       "op": "firstFlipFree"
      }
     ]
    ]
   },
   "feral": {
    "cost": 4,
    "beast": {
     "atk": 9,
     "hp": 7
    },
    "text": "召唤 9/7，翻面时全体 1 伤害",
    "triggers": [
     [
      "flip",
      {
       "op": "aoe",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_016",
  "name": "金甲犀",
  "type": "beast",
  "element": "金",
  "rarity": "rare",
  "tags": [
   "前排",
   "驯化"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +3",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 9
    },
    "text": "召唤 5/9，受到攻击 -1",
    "triggers": [
     [
      "passive",
      {
       "op": "dmgReduce",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 7,
     "hp": 7
    },
    "text": "召唤 7/7，攻击后自身 +2 生命",
    "triggers": [
     [
      "attack",
      {
       "op": "unitBuffHp",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_017",
  "name": "狰王",
  "type": "beast",
  "element": "金",
  "rarity": "rare",
  "tags": [
   "凶化",
   "前排"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 7
    },
    "text": "召唤 4/7，攻击后自损 2",
    "triggers": [
     [
      "attack",
      {
       "op": "unitLoseHp",
       "v": 2
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 6
    },
    "text": "召唤 6/6，攻击 +3",
    "triggers": [
     [
      "passive",
      {
       "op": "flatAtk",
       "v": 3
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_JIN_018",
  "name": "白虎·荒",
  "type": "beast",
  "element": "金",
  "rarity": "boss",
  "tags": [
   "首领",
   "相克"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +3",
  "faces": {
   "tame": {
    "cost": 5,
    "beast": {
     "atk": 7,
     "hp": 10
    },
    "text": "召唤 7/10，相克伤害 +2",
    "triggers": [
     [
      "passive",
      {
       "op": "counterBonus",
       "v": 2
      }
     ]
    ]
   },
   "feral": {
    "cost": 4,
    "beast": {
     "atk": 10,
     "hp": 7
    },
    "text": "召唤 10/7，攻击后裂甲 3",
    "triggers": [
     [
      "attack",
      {
       "op": "statusTarget",
       "s": "裂甲",
       "v": 3
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_001",
  "name": "九尾狐",
  "type": "beast",
  "element": "木",
  "rarity": "rare",
  "tags": [
   "驯化",
   "凶化"
  ],
  "mutateTo": "C_X_B_MU_001",
  "upgradeText": "驯化抽 2；凶化 8 伤",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 4
    },
    "text": "一敌本回合攻击降至 0，抽 1",
    "triggers": [
     [
      "summon",
      {
       "op": "atkZero"
      }
     ],
     [
      "summon",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 3,
     "hp": 4
    },
    "text": "一敌 6 伤害，自损 3",
    "triggers": [
     [
      "summon",
      {
       "op": "dmgTarget",
       "v": 6
      }
     ],
     [
      "summon",
      {
       "op": "loseHp",
       "v": 3
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_002",
  "name": "鹿蜀",
  "type": "beast",
  "element": "木",
  "rarity": "normal",
  "tags": [
   "召唤",
   "驯化"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +2",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 2,
     "hp": 6
    },
    "text": "召唤 2/6，每 2 回合召唤鹿影 2/3",
    "triggers": [
     [
      "startTurn",
      {
       "op": "summonToken",
       "name": "鹿影",
       "atk": 2,
       "hp": 3,
       "every": 2
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 4,
     "hp": 4
    },
    "text": "召唤 4/4，攻击后抽 1",
    "triggers": [
     [
      "attack",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_003",
  "name": "举父",
  "type": "beast",
  "element": "木",
  "rarity": "normal",
  "tags": [
   "凶化",
   "击杀"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +1",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 5
    },
    "text": "召唤 3/5，攻击后自身 +1 攻",
    "triggers": [
     [
      "attack",
      {
       "op": "unitBuffAtk",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 5,
     "hp": 4
    },
    "text": "召唤 5/4，攻击后自损 1",
    "triggers": [
     [
      "attack",
      {
       "op": "unitLoseHp",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_004",
  "name": "天马",
  "type": "beast",
  "element": "木",
  "rarity": "normal",
  "tags": [
   "相生",
   "驯化"
  ],
  "mutateTo": null,
  "upgradeText": "灵涌 +1",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 7
    },
    "text": "召唤 4/7，回合开始获得 1 灵涌（每场 1 次）",
    "triggers": [
     [
      "startTurn",
      {
       "op": "lingyong",
       "v": 1,
       "once": true
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 5
    },
    "text": "召唤 6/5，攻击后推进 -1",
    "triggers": [
     [
      "attack",
      {
       "op": "advanceTarget",
       "v": -1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_005",
  "name": "白鹿",
  "type": "beast",
  "element": "木",
  "rarity": "normal",
  "tags": [
   "驯化",
   "控制"
  ],
  "mutateTo": null,
  "upgradeText": "回 2 生命",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 6
    },
    "text": "召唤 3/6，回合结束回 1 生命",
    "triggers": [
     [
      "turnEnd",
      {
       "op": "healHero",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 5,
     "hp": 4
    },
    "text": "召唤 5/4，攻击后给敌 1 层缠绕",
    "triggers": [
     [
      "attack",
      {
       "op": "statusTarget",
       "s": "缠绕",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_006",
  "name": "青龙",
  "type": "beast",
  "element": "木",
  "rarity": "epic",
  "tags": [
   "相克",
   "首领"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 9
    },
    "text": "召唤 5/9，木系伤害 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "elementBonus",
       "e": "木",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 8,
     "hp": 6
    },
    "text": "召唤 8/6，攻击后全体 1 伤害",
    "triggers": [
     [
      "attack",
      {
       "op": "aoe",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_007",
  "name": "句芒",
  "type": "beast",
  "element": "木",
  "rarity": "rare",
  "tags": [
   "相生",
   "凶化"
  ],
  "mutateTo": "C_X_B_MU_007",
  "upgradeText": "抽 2",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 7
    },
    "text": "召唤 4/7，相生触发时抽 1",
    "triggers": [
     [
      "chain",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 5
    },
    "text": "召唤 6/5，相生触发时对随机敌 2 伤害",
    "triggers": [
     [
      "chain",
      {
       "op": "randomDmg",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_008",
  "name": "英招使",
  "type": "beast",
  "element": "木",
  "rarity": "normal",
  "tags": [
   "相生",
   "驯化"
  ],
  "mutateTo": null,
  "upgradeText": "减费 2",
  "faces": {
   "tame": {
    "cost": 1,
    "beast": {
     "atk": 2,
     "hp": 4
    },
    "text": "召唤 2/4，手牌 1 张减费 1",
    "triggers": [
     [
      "passive",
      {
       "op": "discount",
       "n": 1,
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 4,
     "hp": 3
    },
    "text": "召唤 4/3，攻击后抽 1 弃 1",
    "triggers": [
     [
      "attack",
      {
       "op": "drawDiscard",
       "v": 1,
       "d": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_009",
  "name": "扶桑",
  "type": "beast",
  "element": "木",
  "rarity": "rare",
  "tags": [
   "相生",
   "召唤"
  ],
  "mutateTo": null,
  "upgradeText": "回 2 灵气",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 8
    },
    "text": "召唤 5/8，回合开始回 1 灵气（每场 1 次）",
    "triggers": [
     [
      "startTurn",
      {
       "op": "qi",
       "v": 1,
       "once": true
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 7,
     "hp": 6
    },
    "text": "召唤 7/6，攻击后全体 1 伤害",
    "triggers": [
     [
      "attack",
      {
       "op": "aoe",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_010",
  "name": "鹿蜀母",
  "type": "beast",
  "element": "木",
  "rarity": "rare",
  "tags": [
   "召唤",
   "驯化"
  ],
  "mutateTo": null,
  "upgradeText": "召唤物 +2 生命",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 8
    },
    "text": "召唤 5/8，召唤物 +1 生命",
    "triggers": [
     [
      "passive",
      {
       "op": "summonHp",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 7,
     "hp": 6
    },
    "text": "召唤 7/6，攻击后召唤鹿影 2/3",
    "triggers": [
     [
      "attack",
      {
       "op": "summonToken",
       "name": "鹿影",
       "atk": 2,
       "hp": 3
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_011",
  "name": "天吴",
  "type": "beast",
  "element": "木",
  "rarity": "rare",
  "tags": [
   "相生",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "减费 2",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 7
    },
    "text": "召唤 4/7，相生减费额外 -1（每回合 1 次）",
    "triggers": [
     [
      "passive",
      {
       "op": "chainDiscount",
       "v": 1,
       "n": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 6,
     "hp": 6
    },
    "text": "召唤 6/6，攻击后抽 1",
    "triggers": [
     [
      "attack",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_012",
  "name": "穷奇",
  "type": "beast",
  "element": "木",
  "rarity": "epic",
  "tags": [
   "击杀",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +3",
  "faces": {
   "tame": {
    "cost": 5,
    "beast": {
     "atk": 6,
     "hp": 10
    },
    "text": "召唤 6/10，击杀回 3 生命",
    "triggers": [
     [
      "kill",
      {
       "op": "unitHeal",
       "v": 3
      }
     ]
    ]
   },
   "feral": {
    "cost": 4,
    "beast": {
     "atk": 9,
     "hp": 7
    },
    "text": "召唤 9/7，击杀永久 +2 攻",
    "triggers": [
     [
      "kill",
      {
       "op": "permAtk",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_013",
  "name": "栀",
  "type": "beast",
  "element": "木",
  "rarity": "normal",
  "tags": [
   "控制",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "缠绕 2",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 5
    },
    "text": "召唤 3/5，给敌 1 层缠绕",
    "triggers": [
     [
      "summon",
      {
       "op": "statusTarget",
       "s": "缠绕",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 5,
     "hp": 4
    },
    "text": "召唤 5/4，攻击后推进 -1",
    "triggers": [
     [
      "attack",
      {
       "op": "advanceTarget",
       "v": -1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_014",
  "name": "木客",
  "type": "beast",
  "element": "木",
  "rarity": "normal",
  "tags": [
   "驯化",
   "前排"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +2",
  "faces": {
   "tame": {
    "cost": 1,
    "beast": {
     "atk": 2,
     "hp": 5
    },
    "text": "召唤 2/5，回合结束回 1 生命",
    "triggers": [
     [
      "turnEnd",
      {
       "op": "healHero",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 4
    },
    "text": "召唤 3/4，攻击后自损 1",
    "triggers": [
     [
      "attack",
      {
       "op": "unitLoseHp",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_015",
  "name": "招摇之灵",
  "type": "beast",
  "element": "木",
  "rarity": "rare",
  "tags": [
   "地形",
   "驯化"
  ],
  "mutateTo": null,
  "upgradeText": "地形 +2",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 6
    },
    "text": "召唤 4/6，地形效果 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "terrainBonus",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 5
    },
    "text": "召唤 6/5，攻击后改变本格地形为金脉",
    "triggers": [
     [
      "attack",
      {
       "op": "terrainSelf",
       "t": "金脉"
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_016",
  "name": "白泽使",
  "type": "beast",
  "element": "木",
  "rarity": "normal",
  "tags": [
   "翻面",
   "驯化"
  ],
  "mutateTo": null,
  "upgradeText": "回 2 灵气",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 6
    },
    "text": "召唤 3/6，翻面时回 1 灵气",
    "triggers": [
     [
      "flip",
      {
       "op": "qi",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 5,
     "hp": 4
    },
    "text": "召唤 5/4，翻面时抽 1",
    "triggers": [
     [
      "flip",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_017",
  "name": "九凤",
  "type": "beast",
  "element": "木",
  "rarity": "epic",
  "tags": [
   "相生",
   "首领"
  ],
  "mutateTo": null,
  "upgradeText": "全体伤害 +1",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 8
    },
    "text": "召唤 5/8，相生触发时全体 1 伤害",
    "triggers": [
     [
      "chain",
      {
       "op": "aoe",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 8,
     "hp": 6
    },
    "text": "召唤 8/6，相生触发时全体 2 伤害",
    "triggers": [
     [
      "chain",
      {
       "op": "aoe",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_MU_018",
  "name": "青龙·荒",
  "type": "beast",
  "element": "木",
  "rarity": "boss",
  "tags": [
   "首领",
   "相克"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +3",
  "faces": {
   "tame": {
    "cost": 5,
    "beast": {
     "atk": 7,
     "hp": 10
    },
    "text": "召唤 7/10，木系伤害 +2",
    "triggers": [
     [
      "passive",
      {
       "op": "elementBonus",
       "e": "木",
       "v": 2
      }
     ]
    ]
   },
   "feral": {
    "cost": 4,
    "beast": {
     "atk": 10,
     "hp": 8
    },
    "text": "召唤 10/8，攻击后全体 2 伤害",
    "triggers": [
     [
      "attack",
      {
       "op": "aoe",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_001",
  "name": "蛊雕",
  "type": "beast",
  "element": "水",
  "rarity": "rare",
  "tags": [
   "驯化",
   "控制"
  ],
  "mutateTo": "C_X_B_SHUI_001",
  "upgradeText": "冻缓 +1",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 3,
     "hp": 7
    },
    "text": "召唤 3/7，尖啸施加冻缓 1",
    "triggers": [
     [
      "summon",
      {
       "op": "statusTarget",
       "s": "冻缓",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 5,
     "hp": 5
    },
    "text": "召唤 5/5，推进 -1",
    "triggers": [
     [
      "summon",
      {
       "op": "advanceAll",
       "v": -1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_002",
  "name": "赤鱬",
  "type": "beast",
  "element": "水",
  "rarity": "normal",
  "tags": [
   "控制",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "冻缓 2",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 2,
     "hp": 5
    },
    "text": "召唤 2/5，攻击后冻缓 1",
    "triggers": [
     [
      "attack",
      {
       "op": "statusTarget",
       "s": "冻缓",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 4,
     "hp": 4
    },
    "text": "召唤 4/4，攻击后抽 1",
    "triggers": [
     [
      "attack",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_003",
  "name": "谿边",
  "type": "beast",
  "element": "水",
  "rarity": "normal",
  "tags": [
   "控制",
   "驯化"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +2",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 6
    },
    "text": "召唤 3/6，敌推进 -1",
    "triggers": [
     [
      "summon",
      {
       "op": "advanceAll",
       "v": -1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 5,
     "hp": 4
    },
    "text": "召唤 5/4，攻击后土牢 1",
    "triggers": [
     [
      "attack",
      {
       "op": "statusTarget",
       "s": "土牢",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_004",
  "name": "九婴",
  "type": "beast",
  "element": "水",
  "rarity": "rare",
  "tags": [
   "凶化",
   "多段"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 8
    },
    "text": "召唤 5/8，攻击 2 段",
    "triggers": [
     [
      "passive",
      {
       "op": "multiHit",
       "v": 2
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 7,
     "hp": 6
    },
    "text": "召唤 7/6，攻击后全体 1 伤害",
    "triggers": [
     [
      "attack",
      {
       "op": "aoe",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_005",
  "name": "玄武",
  "type": "beast",
  "element": "水",
  "rarity": "epic",
  "tags": [
   "前排",
   "控制"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +3",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 10
    },
    "text": "召唤 5/10，受到攻击 -1",
    "triggers": [
     [
      "passive",
      {
       "op": "dmgReduce",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 8,
     "hp": 7
    },
    "text": "召唤 8/7，攻击后冻缓 2",
    "triggers": [
     [
      "attack",
      {
       "op": "statusTarget",
       "s": "冻缓",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_006",
  "name": "相柳幼体",
  "type": "beast",
  "element": "水",
  "rarity": "normal",
  "tags": [
   "控制",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "冻缓 2",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 6
    },
    "text": "召唤 4/6，施加冻缓 1",
    "triggers": [
     [
      "summon",
      {
       "op": "statusTarget",
       "s": "冻缓",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 5
    },
    "text": "召唤 6/5，攻击后推进 -1",
    "triggers": [
     [
      "attack",
      {
       "op": "advanceTarget",
       "v": -1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_007",
  "name": "玄冥",
  "type": "beast",
  "element": "水",
  "rarity": "rare",
  "tags": [
   "相克",
   "首领"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 7
    },
    "text": "召唤 4/7，水系伤害 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "elementBonus",
       "e": "水",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 6,
     "hp": 6
    },
    "text": "召唤 6/6，攻击后全体冻缓 1",
    "triggers": [
     [
      "attack",
      {
       "op": "statusAll",
       "s": "冻缓",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_008",
  "name": "蠪侄",
  "type": "beast",
  "element": "水",
  "rarity": "normal",
  "tags": [
   "召唤",
   "驯化"
  ],
  "mutateTo": null,
  "upgradeText": "小蠪 +1 攻",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 5
    },
    "text": "召唤 3/5，召唤 1 只小蠪 2/2",
    "triggers": [
     [
      "summon",
      {
       "op": "summonToken",
       "name": "小蠪",
       "atk": 2,
       "hp": 2
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 5,
     "hp": 4
    },
    "text": "召唤 5/4，攻击后召唤小蠪 2/2",
    "triggers": [
     [
      "attack",
      {
       "op": "summonToken",
       "name": "小蠪",
       "atk": 2,
       "hp": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_009",
  "name": "鲛人",
  "type": "beast",
  "element": "水",
  "rarity": "normal",
  "tags": [
   "驯化",
   "相生"
  ],
  "mutateTo": null,
  "upgradeText": "抽 2",
  "faces": {
   "tame": {
    "cost": 1,
    "beast": {
     "atk": 2,
     "hp": 4
    },
    "text": "召唤 2/4，回合开始抽 1 弃 1",
    "triggers": [
     [
      "startTurn",
      {
       "op": "drawDiscard",
       "v": 1,
       "d": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 4,
     "hp": 3
    },
    "text": "召唤 4/3，攻击后抽 1",
    "triggers": [
     [
      "attack",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_010",
  "name": "冰夷",
  "type": "beast",
  "element": "水",
  "rarity": "rare",
  "tags": [
   "控制",
   "凶化"
  ],
  "mutateTo": "C_X_B_SHUI_010",
  "upgradeText": "冻缓 +1",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 6
    },
    "text": "召唤 4/6，冻缓层数 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "statusBonus",
       "s": "冻缓",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 5
    },
    "text": "召唤 6/5，攻击后土牢 1",
    "triggers": [
     [
      "attack",
      {
       "op": "statusTarget",
       "s": "土牢",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_011",
  "name": "天吴使",
  "type": "beast",
  "element": "水",
  "rarity": "normal",
  "tags": [
   "相生",
   "驯化"
  ],
  "mutateTo": null,
  "upgradeText": "回 2 灵气",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 6
    },
    "text": "召唤 3/6，相生触发时回 1 灵气",
    "triggers": [
     [
      "chain",
      {
       "op": "qi",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 5,
     "hp": 4
    },
    "text": "召唤 5/4，相生触发时抽 1",
    "triggers": [
     [
      "chain",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_012",
  "name": "相柳",
  "type": "beast",
  "element": "水",
  "rarity": "boss",
  "tags": [
   "首领",
   "控制"
  ],
  "mutateTo": null,
  "upgradeText": "冻缓 +2",
  "faces": {
   "tame": {
    "cost": 5,
    "beast": {
     "atk": 7,
     "hp": 10
    },
    "text": "召唤 7/10，冻缓上限 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "statusCap",
       "s": "冻缓",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 4,
    "beast": {
     "atk": 10,
     "hp": 8
    },
    "text": "召唤 10/8，攻击后全体冻缓 2",
    "triggers": [
     [
      "attack",
      {
       "op": "statusAll",
       "s": "冻缓",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_013",
  "name": "雨师",
  "type": "beast",
  "element": "水",
  "rarity": "rare",
  "tags": [
   "驯化",
   "回复"
  ],
  "mutateTo": null,
  "upgradeText": "回 3 生命",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 8
    },
    "text": "召唤 5/8，回合结束回 2 生命",
    "triggers": [
     [
      "turnEnd",
      {
       "op": "healHero",
       "v": 2
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 7,
     "hp": 6
    },
    "text": "召唤 7/6，攻击后全体 1 伤害",
    "triggers": [
     [
      "attack",
      {
       "op": "aoe",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_014",
  "name": "河伯",
  "type": "beast",
  "element": "水",
  "rarity": "normal",
  "tags": [
   "地形",
   "驯化"
  ],
  "mutateTo": null,
  "upgradeText": "地形 +2",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 7
    },
    "text": "召唤 4/7，地形灵泉效果 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "terrainBonus",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 5
    },
    "text": "召唤 6/5，攻击后改变本格为灵泉",
    "triggers": [
     [
      "attack",
      {
       "op": "terrainSelf",
       "t": "灵泉"
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_015",
  "name": "共工",
  "type": "beast",
  "element": "水",
  "rarity": "epic",
  "tags": [
   "相克",
   "首领"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +3",
  "faces": {
   "tame": {
    "cost": 5,
    "beast": {
     "atk": 6,
     "hp": 10
    },
    "text": "召唤 6/10，水系伤害 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "elementBonus",
       "e": "水",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 4,
    "beast": {
     "atk": 9,
     "hp": 7
    },
    "text": "召唤 9/7，攻击后全体 2 伤害",
    "triggers": [
     [
      "attack",
      {
       "op": "aoe",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_016",
  "name": "蜃",
  "type": "beast",
  "element": "水",
  "rarity": "rare",
  "tags": [
   "翻面",
   "控制"
  ],
  "mutateTo": null,
  "upgradeText": "冻缓 2",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 5
    },
    "text": "召唤 3/5，翻面时给敌 1 冻缓",
    "triggers": [
     [
      "flip",
      {
       "op": "statusAll",
       "s": "冻缓",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 5,
     "hp": 4
    },
    "text": "召唤 5/4，翻面时抽 1",
    "triggers": [
     [
      "flip",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_017",
  "name": "蛊雕王",
  "type": "beast",
  "element": "水",
  "rarity": "boss",
  "tags": [
   "首领",
   "控制"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 5,
    "beast": {
     "atk": 7,
     "hp": 11
    },
    "text": "召唤 7/11，尖啸全体冻缓 1",
    "triggers": [
     [
      "summon",
      {
       "op": "statusAll",
       "s": "冻缓",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 4,
    "beast": {
     "atk": 10,
     "hp": 8
    },
    "text": "召唤 10/8，攻击后推进 -2",
    "triggers": [
     [
      "attack",
      {
       "op": "advanceTarget",
       "v": -2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_SHUI_018",
  "name": "玄武·荒",
  "type": "beast",
  "element": "水",
  "rarity": "boss",
  "tags": [
   "首领",
   "前排"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +4",
  "faces": {
   "tame": {
    "cost": 5,
    "beast": {
     "atk": 8,
     "hp": 12
    },
    "text": "召唤 8/12，受到攻击 -2",
    "triggers": [
     [
      "passive",
      {
       "op": "dmgReduce",
       "v": 2
      }
     ]
    ]
   },
   "feral": {
    "cost": 4,
    "beast": {
     "atk": 11,
     "hp": 8
    },
    "text": "召唤 11/8，攻击后冻缓 3",
    "triggers": [
     [
      "attack",
      {
       "op": "statusTarget",
       "s": "冻缓",
       "v": 3
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_001",
  "name": "烛九阴",
  "type": "beast",
  "element": "火",
  "rarity": "epic",
  "tags": [
   "昼夜",
   "凶化"
  ],
  "mutateTo": "C_X_B_HUO_001",
  "upgradeText": "灼烧 +1",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 4,
     "hp": 9
    },
    "text": "召唤 4/9，昼夜切换时抽 1",
    "triggers": [
     [
      "daynight",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 7,
     "hp": 6
    },
    "text": "召唤 7/6，灼烧 2 层",
    "triggers": [
     [
      "summon",
      {
       "op": "statusAll",
       "s": "灼烧",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_002",
  "name": "朱厌",
  "type": "beast",
  "element": "火",
  "rarity": "normal",
  "tags": [
   "凶化",
   "自损"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 7
    },
    "text": "召唤 4/7，蓄力后全体 2 伤害",
    "triggers": [
     [
      "summon",
      {
       "op": "aoe",
       "v": 2
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 5
    },
    "text": "召唤 6/5，攻击后自损 2",
    "triggers": [
     [
      "attack",
      {
       "op": "unitLoseHp",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_003",
  "name": "鴸",
  "type": "beast",
  "element": "火",
  "rarity": "normal",
  "tags": [
   "控制",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "灼烧 2",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 2,
     "hp": 5
    },
    "text": "召唤 2/5，攻击后灼烧 1",
    "triggers": [
     [
      "attack",
      {
       "op": "statusTarget",
       "s": "灼烧",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 4,
     "hp": 4
    },
    "text": "召唤 4/4，攻击后抽 1",
    "triggers": [
     [
      "attack",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_004",
  "name": "毕方",
  "type": "beast",
  "element": "火",
  "rarity": "rare",
  "tags": [
   "相克",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 6
    },
    "text": "召唤 4/6，火系伤害 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "elementBonus",
       "e": "火",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 5
    },
    "text": "召唤 6/5，攻击后全体 1 伤害",
    "triggers": [
     [
      "attack",
      {
       "op": "aoe",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_005",
  "name": "朱雀",
  "type": "beast",
  "element": "火",
  "rarity": "epic",
  "tags": [
   "相克",
   "首领"
  ],
  "mutateTo": null,
  "upgradeText": "灼烧 +2",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 8
    },
    "text": "召唤 5/8，灼烧层数 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "statusBonus",
       "s": "灼烧",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 8,
     "hp": 6
    },
    "text": "召唤 8/6，攻击后全体灼烧 1",
    "triggers": [
     [
      "attack",
      {
       "op": "statusAll",
       "s": "灼烧",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_006",
  "name": "祸斗",
  "type": "beast",
  "element": "火",
  "rarity": "normal",
  "tags": [
   "凶化",
   "自损"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +1",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 6
    },
    "text": "召唤 3/6，攻击后自损 1",
    "triggers": [
     [
      "attack",
      {
       "op": "unitLoseHp",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 5,
     "hp": 4
    },
    "text": "召唤 5/4，攻击 +2",
    "triggers": [
     [
      "passive",
      {
       "op": "flatAtk",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_007",
  "name": "狍鸮",
  "type": "beast",
  "element": "火",
  "rarity": "rare",
  "tags": [
   "控制",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 7
    },
    "text": "召唤 4/7，噬灵：敌灵涌 -1",
    "triggers": [
     [
      "attack",
      {
       "op": "drainAtk",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 6,
     "hp": 6
    },
    "text": "召唤 6/6，攻击后偷 1 灵气",
    "triggers": [
     [
      "attack",
      {
       "op": "qi",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_008",
  "name": "祝融",
  "type": "beast",
  "element": "火",
  "rarity": "epic",
  "tags": [
   "相克",
   "首领"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +3",
  "faces": {
   "tame": {
    "cost": 5,
    "beast": {
     "atk": 6,
     "hp": 10
    },
    "text": "召唤 6/10，火系伤害 +2",
    "triggers": [
     [
      "passive",
      {
       "op": "elementBonus",
       "e": "火",
       "v": 2
      }
     ]
    ]
   },
   "feral": {
    "cost": 4,
    "beast": {
     "atk": 9,
     "hp": 7
    },
    "text": "召唤 9/7，攻击后全体 2 伤害",
    "triggers": [
     [
      "attack",
      {
       "op": "aoe",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_009",
  "name": "赤鸟",
  "type": "beast",
  "element": "火",
  "rarity": "normal",
  "tags": [
   "控制",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "灼烧 2",
  "faces": {
   "tame": {
    "cost": 1,
    "beast": {
     "atk": 2,
     "hp": 3
    },
    "text": "召唤 2/3，攻击后灼烧 1",
    "triggers": [
     [
      "attack",
      {
       "op": "statusTarget",
       "s": "灼烧",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 4,
     "hp": 3
    },
    "text": "召唤 4/3，攻击后抽 1",
    "triggers": [
     [
      "attack",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_010",
  "name": "烛龙幼体",
  "type": "beast",
  "element": "火",
  "rarity": "rare",
  "tags": [
   "昼夜",
   "凶化"
  ],
  "mutateTo": "C_X_B_HUO_010",
  "upgradeText": "回 2 灵气",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 6
    },
    "text": "召唤 4/6，昼夜切换时回 1 灵气",
    "triggers": [
     [
      "daynight",
      {
       "op": "qi",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 5
    },
    "text": "召唤 6/5，昼夜切换时全体 1 伤害",
    "triggers": [
     [
      "daynight",
      {
       "op": "aoe",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_011",
  "name": "火鼠",
  "type": "beast",
  "element": "火",
  "rarity": "normal",
  "tags": [
   "驯化",
   "自损"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +2",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 5
    },
    "text": "召唤 3/5，回合结束回 1 生命",
    "triggers": [
     [
      "turnEnd",
      {
       "op": "healHero",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 5,
     "hp": 4
    },
    "text": "召唤 5/4，攻击后自损 1",
    "triggers": [
     [
      "attack",
      {
       "op": "unitLoseHp",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_012",
  "name": "毕方使",
  "type": "beast",
  "element": "火",
  "rarity": "normal",
  "tags": [
   "相生",
   "控制"
  ],
  "mutateTo": null,
  "upgradeText": "灼烧 2",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 6
    },
    "text": "召唤 3/6，相生触发时灼烧 1",
    "triggers": [
     [
      "chain",
      {
       "op": "statusAll",
       "s": "灼烧",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 5,
     "hp": 4
    },
    "text": "召唤 5/4，相生触发时抽 1",
    "triggers": [
     [
      "chain",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_013",
  "name": "九头鸟",
  "type": "beast",
  "element": "火",
  "rarity": "rare",
  "tags": [
   "多段",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 8
    },
    "text": "召唤 5/8，攻击 2 段",
    "triggers": [
     [
      "passive",
      {
       "op": "multiHit",
       "v": 2
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 7,
     "hp": 6
    },
    "text": "召唤 7/6，攻击后全体 1 伤害",
    "triggers": [
     [
      "attack",
      {
       "op": "aoe",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_014",
  "name": "陆吾火",
  "type": "beast",
  "element": "火",
  "rarity": "normal",
  "tags": [
   "前排",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 7
    },
    "text": "召唤 4/7，前哨格异兽 +1 攻",
    "triggers": [
     [
      "passive",
      {
       "op": "frontAura",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 5
    },
    "text": "召唤 6/5，攻击后自身 +1 攻",
    "triggers": [
     [
      "attack",
      {
       "op": "unitBuffAtk",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_015",
  "name": "朱雀使",
  "type": "beast",
  "element": "火",
  "rarity": "rare",
  "tags": [
   "控制",
   "首领"
  ],
  "mutateTo": null,
  "upgradeText": "灼烧 +1",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 7
    },
    "text": "召唤 4/7，灼烧层数 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "statusBonus",
       "s": "灼烧",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 6,
     "hp": 6
    },
    "text": "召唤 6/6，攻击后全体灼烧 1",
    "triggers": [
     [
      "attack",
      {
       "op": "statusAll",
       "s": "灼烧",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_016",
  "name": "烛龙",
  "type": "beast",
  "element": "火",
  "rarity": "boss",
  "tags": [
   "首领",
   "昼夜"
  ],
  "mutateTo": null,
  "upgradeText": "抽 2",
  "faces": {
   "tame": {
    "cost": 5,
    "beast": {
     "atk": 7,
     "hp": 10
    },
    "text": "召唤 7/10，昼夜切换时抽 1",
    "triggers": [
     [
      "daynight",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 4,
    "beast": {
     "atk": 10,
     "hp": 8
    },
    "text": "召唤 10/8，攻击后全体灼烧 2",
    "triggers": [
     [
      "attack",
      {
       "op": "statusAll",
       "s": "灼烧",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_017",
  "name": "穷奇火",
  "type": "beast",
  "element": "火",
  "rarity": "epic",
  "tags": [
   "击杀",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 8
    },
    "text": "召唤 5/8，击杀回 3 生命",
    "triggers": [
     [
      "kill",
      {
       "op": "unitHeal",
       "v": 3
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 8,
     "hp": 6
    },
    "text": "召唤 8/6，击杀永久 +1 攻",
    "triggers": [
     [
      "kill",
      {
       "op": "permAtk",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_HUO_018",
  "name": "朱雀·荒",
  "type": "beast",
  "element": "火",
  "rarity": "boss",
  "tags": [
   "首领",
   "相克"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +3",
  "faces": {
   "tame": {
    "cost": 5,
    "beast": {
     "atk": 8,
     "hp": 10
    },
    "text": "召唤 8/10，火系伤害 +2",
    "triggers": [
     [
      "passive",
      {
       "op": "elementBonus",
       "e": "火",
       "v": 2
      }
     ]
    ]
   },
   "feral": {
    "cost": 4,
    "beast": {
     "atk": 11,
     "hp": 8
    },
    "text": "召唤 11/8，攻击后全体 3 伤害",
    "triggers": [
     [
      "attack",
      {
       "op": "aoe",
       "v": 3
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_001",
  "name": "饕餮",
  "type": "beast",
  "element": "土",
  "rarity": "epic",
  "tags": [
   "自损",
   "击杀"
  ],
  "mutateTo": "C_X_B_TU_001",
  "upgradeText": "生命 +3",
  "faces": {
   "tame": {
    "cost": 5,
    "beast": {
     "atk": 6,
     "hp": 12
    },
    "text": "召唤 6/12，击杀回 2 生命",
    "triggers": [
     [
      "kill",
      {
       "op": "unitHeal",
       "v": 2
      }
     ]
    ]
   },
   "feral": {
    "cost": 4,
    "beast": {
     "atk": 9,
     "hp": 8
    },
    "text": "召唤 9/8，击杀永久 +1 攻",
    "triggers": [
     [
      "kill",
      {
       "op": "permAtk",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_002",
  "name": "狸力",
  "type": "beast",
  "element": "土",
  "rarity": "normal",
  "tags": [
   "前排",
   "驯化"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +2",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 6
    },
    "text": "召唤 3/6，防御意图权重 +10%",
    "triggers": [
     [
      "passive",
      {
       "op": "guardWeight",
       "v": 10
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 5,
     "hp": 4
    },
    "text": "召唤 5/4，攻击后自身 +1 生命",
    "triggers": [
     [
      "attack",
      {
       "op": "unitBuffHp",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_003",
  "name": "诸怀",
  "type": "beast",
  "element": "土",
  "rarity": "normal",
  "tags": [
   "控制",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +1",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 7
    },
    "text": "召唤 4/7，推进 -1",
    "triggers": [
     [
      "summon",
      {
       "op": "advanceAll",
       "v": -1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 5
    },
    "text": "召唤 6/5，攻击后自损 1",
    "triggers": [
     [
      "attack",
      {
       "op": "unitLoseHp",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_004",
  "name": "犀渠",
  "type": "beast",
  "element": "土",
  "rarity": "rare",
  "tags": [
   "前排",
   "相克"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +3",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 9
    },
    "text": "召唤 5/9，受到攻击 -1",
    "triggers": [
     [
      "passive",
      {
       "op": "dmgReduce",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 7,
     "hp": 7
    },
    "text": "召唤 7/7，攻击后裂甲 2",
    "triggers": [
     [
      "attack",
      {
       "op": "statusTarget",
       "s": "裂甲",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_005",
  "name": "黄龙",
  "type": "beast",
  "element": "土",
  "rarity": "epic",
  "tags": [
   "相克",
   "首领"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 9
    },
    "text": "召唤 5/9，土系伤害 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "elementBonus",
       "e": "土",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 8,
     "hp": 6
    },
    "text": "召唤 8/6，攻击后全体 1 伤害",
    "triggers": [
     [
      "attack",
      {
       "op": "aoe",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_006",
  "name": "合窳",
  "type": "beast",
  "element": "土",
  "rarity": "normal",
  "tags": [
   "控制",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "缠绕 2",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 6
    },
    "text": "召唤 3/6，给敌 1 层缠绕",
    "triggers": [
     [
      "summon",
      {
       "op": "statusTarget",
       "s": "缠绕",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 5,
     "hp": 4
    },
    "text": "召唤 5/4，攻击后推进 -1",
    "triggers": [
     [
      "attack",
      {
       "op": "advanceTarget",
       "v": -1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_007",
  "name": "土蝼",
  "type": "beast",
  "element": "土",
  "rarity": "normal",
  "tags": [
   "驯化",
   "前排"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +2",
  "faces": {
   "tame": {
    "cost": 1,
    "beast": {
     "atk": 2,
     "hp": 4
    },
    "text": "召唤 2/4，回合结束回 1 生命",
    "triggers": [
     [
      "turnEnd",
      {
       "op": "healHero",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 4,
     "hp": 3
    },
    "text": "召唤 4/3，攻击后自损 1",
    "triggers": [
     [
      "attack",
      {
       "op": "unitLoseHp",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_008",
  "name": "后土",
  "type": "beast",
  "element": "土",
  "rarity": "rare",
  "tags": [
   "地形",
   "驯化"
  ],
  "mutateTo": "C_X_B_TU_008",
  "upgradeText": "地形 +2",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 7
    },
    "text": "召唤 4/7，地形效果 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "terrainBonus",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 5
    },
    "text": "召唤 6/5，攻击后改变本格为石阵",
    "triggers": [
     [
      "attack",
      {
       "op": "terrainSelf",
       "t": "石阵"
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_009",
  "name": "饕餮眷属",
  "type": "beast",
  "element": "土",
  "rarity": "rare",
  "tags": [
   "击杀",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 9
    },
    "text": "召唤 5/9，击杀回 2 生命",
    "triggers": [
     [
      "kill",
      {
       "op": "unitHeal",
       "v": 2
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 7,
     "hp": 7
    },
    "text": "召唤 7/7，击杀永久 +2 攻",
    "triggers": [
     [
      "kill",
      {
       "op": "permAtk",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_010",
  "name": "狍鸮土",
  "type": "beast",
  "element": "土",
  "rarity": "normal",
  "tags": [
   "控制",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +1",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 5
    },
    "text": "召唤 3/5，噬灵：敌灵涌 -1",
    "triggers": [
     [
      "attack",
      {
       "op": "drainAtk",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 1,
    "beast": {
     "atk": 5,
     "hp": 4
    },
    "text": "召唤 5/4，攻击后偷 1 灵气",
    "triggers": [
     [
      "attack",
      {
       "op": "qi",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_011",
  "name": "石敢当",
  "type": "beast",
  "element": "土",
  "rarity": "normal",
  "tags": [
   "前排",
   "驯化"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +3",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 9
    },
    "text": "召唤 4/9，受到攻击 -1",
    "triggers": [
     [
      "passive",
      {
       "op": "dmgReduce",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 7
    },
    "text": "召唤 6/7，攻击后自身 +2 生命",
    "triggers": [
     [
      "attack",
      {
       "op": "unitBuffHp",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_012",
  "name": "地狼",
  "type": "beast",
  "element": "土",
  "rarity": "normal",
  "tags": [
   "相生",
   "凶化"
  ],
  "mutateTo": null,
  "upgradeText": "抽 2",
  "faces": {
   "tame": {
    "cost": 2,
    "beast": {
     "atk": 3,
     "hp": 6
    },
    "text": "召唤 3/6，攻击后抽 1",
    "triggers": [
     [
      "attack",
      {
       "op": "draw",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 5,
     "hp": 4
    },
    "text": "召唤 5/4，攻击后自损 1",
    "triggers": [
     [
      "attack",
      {
       "op": "unitLoseHp",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_013",
  "name": "黄龙使",
  "type": "beast",
  "element": "土",
  "rarity": "rare",
  "tags": [
   "相克",
   "首领"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 7
    },
    "text": "召唤 4/7，土系伤害 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "elementBonus",
       "e": "土",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 6,
     "hp": 6
    },
    "text": "召唤 6/6，攻击后全体 1 伤害",
    "triggers": [
     [
      "attack",
      {
       "op": "aoe",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_014",
  "name": "犀渠战兽",
  "type": "beast",
  "element": "土",
  "rarity": "rare",
  "tags": [
   "前排",
   "相克"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +2",
  "faces": {
   "tame": {
    "cost": 4,
    "beast": {
     "atk": 5,
     "hp": 10
    },
    "text": "召唤 5/10，前哨格异兽 +1 攻",
    "triggers": [
     [
      "passive",
      {
       "op": "frontAura",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 3,
    "beast": {
     "atk": 7,
     "hp": 8
    },
    "text": "召唤 7/8，攻击后裂甲 2",
    "triggers": [
     [
      "attack",
      {
       "op": "statusTarget",
       "s": "裂甲",
       "v": 2
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_015",
  "name": "山神",
  "type": "beast",
  "element": "土",
  "rarity": "epic",
  "tags": [
   "誓约",
   "首领"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +3",
  "faces": {
   "tame": {
    "cost": 5,
    "beast": {
     "atk": 6,
     "hp": 11
    },
    "text": "召唤 6/11，誓约正面效果 +1",
    "triggers": [
     [
      "passive",
      {
       "op": "omenPlus",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 4,
    "beast": {
     "atk": 9,
     "hp": 8
    },
    "text": "召唤 9/8，攻击后全体 1 伤害",
    "triggers": [
     [
      "attack",
      {
       "op": "aoe",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_016",
  "name": "土伯",
  "type": "beast",
  "element": "土",
  "rarity": "rare",
  "tags": [
   "荒蚀",
   "控制"
  ],
  "mutateTo": null,
  "upgradeText": "净化 2 次",
  "faces": {
   "tame": {
    "cost": 3,
    "beast": {
     "atk": 4,
     "hp": 7
    },
    "text": "召唤 4/7，荒蚀净化每场 1 次",
    "triggers": [
     [
      "passive",
      {
       "op": "purifyPerBattle",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 2,
    "beast": {
     "atk": 6,
     "hp": 5
    },
    "text": "召唤 6/5，攻击后给敌 1 土牢",
    "triggers": [
     [
      "attack",
      {
       "op": "statusTarget",
       "s": "土牢",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_017",
  "name": "赑屃",
  "type": "beast",
  "element": "土",
  "rarity": "epic",
  "tags": [
   "前排",
   "首领"
  ],
  "mutateTo": null,
  "upgradeText": "生命 +3",
  "faces": {
   "tame": {
    "cost": 5,
    "beast": {
     "atk": 6,
     "hp": 12
    },
    "text": "召唤 6/12，受到攻击 -1",
    "triggers": [
     [
      "passive",
      {
       "op": "dmgReduce",
       "v": 1
      }
     ]
    ]
   },
   "feral": {
    "cost": 4,
    "beast": {
     "atk": 9,
     "hp": 8
    },
    "text": "召唤 9/8，攻击后全体 1 伤害",
    "triggers": [
     [
      "attack",
      {
       "op": "aoe",
       "v": 1
      }
     ]
    ]
   }
  }
 },
 {
  "id": "C_B_TU_018",
  "name": "黄龙·荒",
  "type": "beast",
  "element": "土",
  "rarity": "boss",
  "tags": [
   "首领",
   "相克"
  ],
  "mutateTo": null,
  "upgradeText": "攻 +3",
  "faces": {
   "tame": {
    "cost": 5,
    "beast": {
     "atk": 8,
     "hp": 11
    },
    "text": "召唤 8/11，土系伤害 +2",
    "triggers": [
     [
      "passive",
      {
       "op": "elementBonus",
       "e": "土",
       "v": 2
      }
     ]
    ]
   },
   "feral": {
    "cost": 4,
    "beast": {
     "atk": 11,
     "hp": 8
    },
    "text": "召唤 11/8，攻击后全体 2 伤害",
    "triggers": [
     [
      "attack",
      {
       "op": "aoe",
       "v": 2
      }
     ]
    ]
   }
  }
 }
];
})(typeof window !== 'undefined' ? window : globalThis);
