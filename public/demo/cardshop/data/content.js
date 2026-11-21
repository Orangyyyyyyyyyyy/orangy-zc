/* ==========================================================================
 * 卡牌店模拟经营 — 浏览器 Demo 内容与数值配置
 * 所有数值均为「可配置测试初值」，来源：GDD 1.0 / 数值与配置表 1.0 /
 * 六项补充设计（市场六因子、厂商7日策略、经验曲线、专精曲线、价格体系、贷款）。
 * 修改此文件即可调整整个 Demo 的平衡性，不需要改代码。
 * ========================================================================== */
(function (root) {
  'use strict';
  const CS = (root.CS = root.CS || {});

  const CONTENT = {
    meta: {
      version: '0.4.1-demo',
      title: '卡牌店模拟经营',
      subtitle: '浏览器 Demo｜核心经营闭环 + 六项数值系统'
    },

    /* ---------------- IP 优先级（与素材库同步顺序） ---------------- */
    ips: [
      { id: 'pokemon',  order: 1, name: '宝可梦',   nameEn: 'Pokémon',     color: '#e0a33a' },
      { id: 'yugioh',   order: 2, name: '游戏王',   nameEn: 'Yu-Gi-Oh!',   color: '#8a6ad2' },
      { id: 'digimon',  order: 3, name: '数码宝贝', nameEn: 'Digimon',     color: '#3f86c9' },
      { id: 'onepiece', order: 4, name: '海贼王',   nameEn: 'One Piece',   color: '#d2553f' }
    ],

    /* ---------------- 难度（创建存档时固定） ---------------- */
    difficulty: {
      easy:   { id: 'easy',   name: '轻松', startMoney: 6000, rentMul: 0.80, wageMul: 0.80, trafficMul: 1.15, tolerance: 1.15, desc: '资金宽裕、客流更多、NPC 更能接受高价' },
      normal: { id: 'normal', name: '标准', startMoney: 4000, rentMul: 1.00, wageMul: 1.00, trafficMul: 1.00, tolerance: 1.00, desc: '按 GDD 已确认数值：4000 元起步' },
      hard:   { id: 'hard',   name: '硬核', startMoney: 3000, rentMul: 1.15, wageMul: 1.10, trafficMul: 0.88, tolerance: 0.90, desc: '起步资金更少，租金与工资更高' }
    },

    /* ---------------- 客流（Demo 初值） ---------------- */
    traffic: { base: 42, perRating: 0.45, perFame: 0.25, min: 14, max: 150 },

    /* ---------------- 时间（已确认规则） ---------------- */
    time: {
      secondsPerGameMinute: 2,      // 1 游戏分钟 = 2 现实秒
      prepStart: 7 * 60,            // 07:00 准备阶段（暂停）
      closeTime: 21 * 60,           // 21:00 夜间决策点
      dayEnd: 31 * 60,              // 次日 07:00 结算
      speeds: [1, 5, 20, 60],       // Demo 时间倍率（1× 为设计基准）
      defaultSpeed: 20
    },

    /* ---------------- 店铺布局（8×8 初始地板，门开在下方，快递站在店外） ---------------- */
    layout: {
      cols: 8,
      rows: 8,
      door: { x: 3, y: 7, w: 2 },       // 门内格子：x=3,4 / y=7
      station: { x: 6.0, y: 8.68 },     // 快递站（店外人行道，门右侧）
      spawn: { x: 2.9, y: 4.3 },
      outsideDepth: 2                   // 店外人行道占用的可视行数
    },

    /* ---------------- 移动速度（现实秒 / 格，1× 时间倍率） ----------------
     * 玩家与 NPC 每 0.5 秒走一格；员工每 0.8 秒走一格（等级与专精会更快）。
     * 移动内核按「游戏分钟」推进，1 游戏分钟 = 2 现实秒，因此换算系数为 2。
     */
    move: {
      playerCellsPerSec: 2.0,     // 0.5 秒 / 格
      employeeSecPerCell: 0.8,
      npcSecPerCell: 0.5,
      npcWanderSecPerCell: 0.62,  // 闲逛稍慢，避免飘忽
      employeeIdleSecPerCell: 0.95
    },

    /* ---------------- 自动存档 ---------------- */
    autosave: {
      intervalSec: 15,        // 现实秒；每 15 秒写一次本地存档
      minIntervalSec: 4,      // 关键动作后的最短写入间隔，避免频繁 IO
      keepMilestones: true    // 下单 / 开店 / 拆包 / 扩建 / 日结后立即存档
    },

    /* ---------------- 经济基础（已确认） ---------------- */
    economy: {
      /* 8×8 底板下按格计租：64 格 ≈ 原 6×6 的租金总额，避免开局固定成本过高 */
      rentPerCell: 6,
      powerPerCell: 0.6,
      repairCoeff: 0.5,
      startRating: 60,
      reviewWindowDays: 30,
      ratingDisplayMax: 5,
      fameMax: 100,
      wageArrears: { enabled: true, dailyRate: 0.01 },
      floorBaseCells: 64,
      floorMaxCells: 144,
      expansionPerLevel: 2
    },

    /* ---------------- 店铺经验曲线（补充设计 A） ---------------- */
    xp: {
      // 1→2, 2→3, ... 25→26（逐级经验表）
      table: [100, 150, 220, 310, 430, 570, 730, 920, 1140, 1400, 1700, 2050, 2450, 2900,
              3400, 3950, 4550, 5200, 5900, 6700, 7600, 8600, 9700, 10900, 12200],
      perProfit: 20,          // 每 20 元有效销售利润 = 1 经验
      reception: 1,           // 普通顾客有效接待
      specialReception: [3, 5]// 特殊顾客有效接待
    },

    /* ---------------- 员工（工资表已确认） ---------------- */
    wages: { 1: 150, 2: 250, 3: 400, 4: 500, 5: 650, 6: 850, 7: 1000, 8: 1500, 9: 3000, 10: 5000 },
    nightWageMul: 2,
    staffLevelEff: { 1: 1.00, 2: 1.06, 3: 1.12, 4: 1.18, 5: 1.24, 6: 1.30, 7: 1.36, 8: 1.42, 9: 1.50, 10: 1.60 },
    staffSpec: {
      factor: 0.6,  // E = 1 + factor * M / (M + k)
      k: 20,
      maxPerDay: 1
    },
    staffTasks: [
      { id: 'restock', name: '补货', desc: '取快递箱 → 补满货架 → 余货入库' },
      { id: 'cashier', name: '收银', desc: '在收银台为顾客结账' },
      { id: 'carry',   name: '搬运', desc: '把快递箱送入仓库' },
      { id: 'idle',    name: '自由活动', desc: '休息、打牌、整理店内' }
    ],
    hireableLevels: [1, 2, 3, 4, 5],

    /* ---------------- 动态市场（补充设计 B：六因子） ---------------- */
    market: {
      weights: { D: 0.30, S: 0.20, P: 0.15, V: 0.15, T: 0.10, R: 0.10 },
      maxDailyStep: 0.05,        // ±5% 硬上限
      stepScale: 0.05,           // r = clamp(stepScale * M)
      trendWindow: 7,            // 最近 7 天趋势
      trendFullMove: 0.10,       // 7 日累计涨跌 10% 视为满强度
      statWindow: 7,             // 统计窗口（经营日）
      priceFloorRatio: 0.15,     // 价格地板（相对初始参考价），避免归零
      demandBaseline: 250,       // P/V 因子基准：7 日 250 件（约合日销 35 件）
      supplierStockSafety: 260,  // 厂商安全库存
      purchaseCostSensitivity: 0.5, // 采购价跟随市场的敏感度
      purchaseCostMin: 0.60,
      purchaseCostMax: 2.40
    },

    /* ---------------- 厂商生产策略（7 日统计 + 延迟） ---------------- */
    supplierPolicy: {
      lagDays: 2,              // 生产调整延迟 1~3 个经营日
      capacityUnits: 'supplier',  // 每厂商独立产能
      stockCapFactor: 3,       // 厂商库存上限 = 日产能 × 3
      disruptionChance: 0.03,  // 每日断货/减产概率
      disruptionFactor: 0.35,
      scoreWeights: { stockout: 1.2, purchase: 0.9, velocity: 1.0, sluggish: 0.7 }
    },

    /* ---------------- 设施（价格取自数值表） ---------------- */
    facilities: [
      { id: 'shelf',      name: '普通货架',       price: 1500,  w: 4, h: 1, unlockLevel: 1, kind: 'shelf',     skuSlots: 12, itemSlots: 24, color: '#8a5a33', icon: '▤', desc: '12 种商品，每种 24 物品格' },
      { id: 'ironrack',   name: '铁架子',         price: 2300,  w: 1, h: 1, unlockLevel: 1, kind: 'shelf',     skuSlots: 3,  itemSlots: 20, color: '#6c7785', icon: '▥', desc: '3 种商品，每种 20 物品格' },
      { id: 'warehouse',  name: '仓库架',         price: 2500,  w: 2, h: 4, unlockLevel: 1, kind: 'warehouse', skuSlots: 24, itemSlots: 30, color: '#4d5b6e', icon: '▧', desc: '仓库存储，24 种商品' },
      { id: 'counter',    name: '实体收银台',     price: 5888,  w: 2, h: 2, unlockLevel: 1, kind: 'counter',   color: '#2f6f6a', icon: '$', desc: '顾客结账位置（2×2）' },
      { id: 'cardtable',  name: '普通卡牌桌',     price: 2000,  w: 3, h: 3, unlockLevel: 3, kind: 'cardtable', slots: 8, color: '#5b4a86', icon: '♠', desc: '展示 8 张个人卡牌，NPC 可直接购买' },
      { id: 'gameaTable', name: '双人游戏桌',     price: 1500,  w: 2, h: 2, unlockLevel: 3, kind: 'gametable', seats: 2, fee: 35, sessionMinutes: 45, env: 8, color: '#7a5230', icon: '⚔', desc: '2 个座位；NPC 会入座对局并按局支付台费' },
      { id: 'purifier',   name: '空气清新器',     price: 1500,  w: 1, h: 1, unlockLevel: 2, kind: 'decor',     env: 10, color: '#3d7f8c', icon: '≈', desc: '改善空气质量' },
      { id: 'light',      name: '照明设备',       price: 500,   w: 1, h: 1, unlockLevel: 1, kind: 'decor',     env: 6, color: '#b8913a', icon: '☀', desc: '提升亮度与体验' },
      { id: 'trash',      name: '垃圾桶',         price: 500,   w: 1, h: 1, unlockLevel: 1, kind: 'decor',     env: 5, color: '#4a4a4a', icon: '▽', desc: '收集垃圾，避免环境下降' },
      { id: 'chair',      name: '顾客休息椅',     price: 1500,  w: 1, h: 1, unlockLevel: 2, kind: 'decor',     env: 6, color: '#8c5a4a', icon: '▬', desc: '改善等待与休息体验' },
      { id: 'workshop',   name: '卡牌整理工作台', price: 2500,  w: 2, h: 1, unlockLevel: 4, kind: 'decor',     env: 4, color: '#5f6f4a', icon: '✥', desc: '组装与整理卡组的位置' },
      { id: 'display',    name: '周边展示架',     price: 3000,  w: 2, h: 2, unlockLevel: 4, kind: 'display',   skuSlots: 8,  itemSlots: 2, color: '#8a6a2f', icon: '✦', desc: '8 个展示格，每格 2 件周边' }
    ],

    /* ---------------- 商品 ---------------- */
    products: [
      { sku: 'pack_ss',    name: '剑盾卡包',       short: '剑盾包', supplier: 'star',  purchase: 30,  price: 60,  space: 1, unlockLevel: 1, category: 'pack',    pack: { cards: 5, name: '剑盾系列', ip: 'pokemon' } },
      { sku: 'pack_sv',    name: '朱紫卡包',       short: '朱紫包', supplier: 'flame', purchase: 32,  price: 64,  space: 1, unlockLevel: 1, category: 'pack',    pack: { cards: 5, name: '朱紫系列', ip: 'pokemon' } },
      { sku: 'pack_me',    name: '超级进化卡包',   short: '进化包', supplier: 'star',  purchase: 62,  price: 124,  space: 1, unlockLevel: 3, category: 'pack',    pack: { cards: 5, name: '超级进化系列', ip: 'pokemon' } },
      { sku: 'deck_fire',  name: '预组卡组·炎',    short: '炎预组', supplier: 'flame', purchase: 110, price: 220, space: 2, unlockLevel: 1, category: 'deck' },
      { sku: 'deck_water', name: '预组卡组·水',    short: '水预组', supplier: 'flame', purchase: 105, price: 210, space: 2, unlockLevel: 2, category: 'deck' },
      { sku: 'box_ss',     name: '剑盾珍藏礼盒',   short: '珍藏盒', supplier: 'star',  purchase: 180, price: 360, space: 3, unlockLevel: 2, category: 'box' },
      { sku: 'sleeves',    name: '卡牌保护套',     short: '保护套', supplier: 'blue',  purchase: 18,  price: 38,  space: 1, unlockLevel: 1, category: 'accessory' },
      { sku: 'deckbox',    name: '卡组盒',         short: '卡组盒', supplier: 'blue',  purchase: 45,  price: 92,  space: 2, unlockLevel: 1, category: 'accessory' },
      { sku: 'playmat',    name: '桌垫',           short: '桌垫',   supplier: 'blue',  purchase: 78,  price: 158, space: 3, unlockLevel: 2, category: 'accessory' },
      { sku: 'figure_s',   name: '小型手办',       short: '小手办', supplier: 'giga',  purchase: 95,  price: 195, space: 2, unlockLevel: 1, category: 'figure' },
      { sku: 'figure_m',   name: '中型手办',       short: '中手办', supplier: 'giga',  purchase: 240, price: 470, space: 4, unlockLevel: 3, category: 'figure' },
      { sku: 'box_limited',name: '限定收藏礼盒',   short: '限定盒', supplier: 'giga',  purchase: 320, price: 640, space: 5, unlockLevel: 4, category: 'box' },
      /* IP2~IP4 卡包：按 IP 优先级接入，开包只从对应 IP 卡池抽取 */
      { sku: 'pack_ygo',  name: '游戏王卡包',     short: '游戏王包', supplier: 'flame', purchase: 34, price: 68, space: 1, unlockLevel: 1, category: 'pack', pack: { cards: 5, name: '游戏王系列', ip: 'yugioh' } },
      { sku: 'pack_digi', name: '数码宝贝卡包',   short: '数码包',   supplier: 'blue',  purchase: 33, price: 66, space: 1, unlockLevel: 1, category: 'pack', pack: { cards: 5, name: '数码宝贝系列', ip: 'digimon' } },
      { sku: 'pack_op',   name: '海贼王卡包',     short: '海贼王包', supplier: 'giga',  purchase: 36, price: 72, space: 1, unlockLevel: 1, category: 'pack', pack: { cards: 5, name: '海贼王系列', ip: 'onepiece' } }
    ],

    /* ---------------- 厂商 ---------------- */
    suppliers: [
      { id: 'star',  name: '星辉卡牌社', short: '星辉', color: '#e0a33a', freight: 60, capacity: 320, desc: '主打卡包与珍藏礼盒，产量稳定', priceLag: 0.5 },
      { id: 'flame', name: '赤焰娱乐',   short: '赤焰', color: '#d2553f', freight: 70, capacity: 340, desc: '卡包与预组卡组，运费偏高', priceLag: 0.6 },
      { id: 'blue',  name: '蓝鲸周边',   short: '蓝鲸', color: '#3f86c9', freight: 45, capacity: 530, desc: '保护套、盒、桌垫等周边', priceLag: 0.35 },
      { id: 'giga',  name: '万象模型',   short: '万象', color: '#8a6ad2', freight: 90, capacity: 240, desc: '手办与限定礼盒，单价高、产能低', priceLag: 0.7 }
    ],

    /* ---------------- 稀有度与卡牌价值 ---------------- */
    rarity: {
      order: ['N', 'U', 'R', 'RR', 'AR', 'SR', 'SAR', 'UR'],
      names: { N: '普通', U: '非普通', R: '稀有', RR: '双稀有', AR: '插画稀有', SR: '超级稀有', SAR: '特别插画', UR: '究极稀有' },
      colors: { N: '#8b95a5', U: '#5fb3a1', R: '#4f8fd1', RR: '#b06ad2', AR: '#e0a33a', SR: '#ef6f6c', SAR: '#f5c542', UR: '#f2e6b0' },
      value: { N: 4, U: 12, R: 32, RR: 110, AR: 280, SR: 620, SAR: 1500, UR: 2800 },
      packWeights: { N: 60.0, U: 20.0, R: 12.0, RR: 5.0, AR: 2.0, SR: 0.8, SAR: 0.15, UR: 0.05 }
    },

    /* ---------------- 评级（补充设计 C） ---------------- */
    grading: {
      maxCardsPerOrder: 10,
      institutions: [
        { id: 'basic',   name: '普通评级机构', tier: '经济型', perCard: 30,  freight: 30, baseDays: 6 },
        { id: 'pro',     name: '专业评级机构', tier: '专业型', perCard: 70,  freight: 50, baseDays: 4 },
        { id: 'premium', name: '顶级评级机构', tier: '高端型', perCard: 130, freight: 80, baseDays: 2 }
      ],
      speeds: [
        { id: 'slow',     name: '慢速', timeMul: 1.5, costMul: 0.8 },
        { id: 'standard', name: '标准', timeMul: 1.0, costMul: 1.0 },
        { id: 'rush',     name: '加急', timeMul: 0.5, costMul: 2.0 }
      ],
      gradeMul: { 1: 0.70, 2: 0.85, 3: 1.00, 4: 1.15, 5: 1.35, 6: 1.60, 7: 2.00, 8: 2.60, 9: 3.60, 10: 5.00 }
    },

    /* ---------------- 贷款（补充设计 D） ---------------- */
    loans: {
      official: {
        id: 'official', name: '官方贷款', unlockLevel: 5, dailyRate: 0.0025,
        baseLimit: 10000, perLevel: 3000, termDays: 30, repayEveryDays: 7, graceDays: 3, penaltyRate: 0.005,
        desc: '利率低、额度稳定、还款节奏长'
      },
      private: {
        id: 'private', name: '民间贷款', unlockLevel: 5, dailyRate: 0.008,
        limitMul: 1.5, termDays: 14, graceDays: 1, penaltyRate: 0.01,
        desc: '放款灵活、额度更高，利息和风险更大'
      },
      creditMul: [
        { min: 95, mul: 1.4 }, { min: 80, mul: 1.2 }, { min: 50, mul: 1.0 }, { min: 0, mul: 0.7 }
      ]
    },

    /* ---------------- NPC 评价维度（GDD §11） ---------------- */
    evaluation: {
      dims: [
        { id: 'layout',  label: '店铺布局与通行',   weight: 0.12 },
        { id: 'staff',   label: '员工数量与服务',   weight: 0.14 },
        { id: 'shelf',   label: '货架库存与丰富度', weight: 0.12 },
        { id: 'pref',    label: '喜好商品库存',     weight: 0.18 },
        { id: 'pay',     label: '收银排队与时间',   weight: 0.15 },
        { id: 'price',   label: '价格符合行情',     weight: 0.12 },
        { id: 'quality', label: '商品质量',         weight: 0.07 },
        { id: 'env',     label: '环境与设施体验',   weight: 0.10 }
      ],
      moodRange: [-5, 5],
      texts: {
        great: ['这家店挑货很用心，下次还会来。', '布局顺手，价格也公道，舒服。', '货架补得很满，难得。'],
        good:  ['整体还行，就是收银慢了一点。', '想买的都有，体验不错。', '店里有点挤，但商品挺全。'],
        mid:   ['东西不算多，价格再低点就好了。', '找了半天才找到想要的。', '店里有点乱，不过还能逛。'],
        bad:   ['想买的根本找不到，白跑一趟。', '价格比别家贵太多了。', '排队太久，不想再来了。']
      }
    },

    /* ---------------- NPC 类型 ---------------- */
    npcTypes: [
      { id: 'student',  name: '学生',       weight: 24, budget: [120, 600],  priceSens: 1.25, pref: ['pack', 'accessory'], color: '#7fb3d5', fame: 0, tableChance: 0.55, pitchChance: 0.10 },
      { id: 'regular',  name: '普通顾客',   weight: 34, budget: [200, 1200], priceSens: 1.0,  pref: ['pack', 'accessory'], color: '#9aa7b5', fame: 0, tableChance: 0.32, pitchChance: 0.12 },
      { id: 'collector',name: '收藏家',     weight: 16, budget: [800, 5000], priceSens: 0.85, pref: ['box', 'figure'],     color: '#c9a04e', fame: 0, tableChance: 0.18, pitchChance: 0.34 },
      { id: 'pro',      name: '竞技玩家',   weight: 16, budget: [300, 1800], priceSens: 0.95, pref: ['pack', 'deck', 'accessory'], color: '#6cc0a0', fame: 0, tableChance: 0.78, pitchChance: 0.22 },
      { id: 'rich',     name: '富豪',       weight: 5,  budget: [3000, 12000], priceSens: 0.6, pref: ['box', 'figure'],    color: '#d98cb3', fame: 2, tableChance: 0.12, pitchChance: 0.30 },
      { id: 'reporter', name: '电视台记者', weight: 0.5,  budget: [200, 800],  priceSens: 1.0,  pref: ['pack'],              color: '#e0d24a', fame: 20, special: 'reporter', tableChance: 0.10, pitchChance: 0.25 },
      { id: 'streamer', name: '知名主播',   weight: 1,  budget: [800, 3000], priceSens: 0.8,  pref: ['pack', 'box'],       color: '#b07fd2', fame: 4,  special: 'streamer', tableChance: 0.45, pitchChance: 0.28 }
    ],

    /* ---------------- NPC 互动（交谈 / 推销 / 游戏桌） ---------------- */
    npcInteract: {
      talkRange: 1.8,                 // 玩家与 NPC 可交谈的距离
      pitchDurationMinutes: 12,       // NPC 主动推销的等待时长（游戏分钟）
      pitchAskMul: [0.60, 0.85],      // NPC 出手卡牌的报价 = 卡牌估值 × 该区间
      pitchAttemptsPerSku: 3,         // 同一位顾客对同一件商品最多听几次推荐
      pitchTiers: {                   // 不同 NPC 会拿出来推销的卡牌稀有度
        student:   ['N', 'U', 'R'],
        regular:   ['N', 'U', 'R'],
        pro:       ['U', 'R', 'RR'],
        collector: ['R', 'RR', 'AR', 'SR'],
        rich:      ['R', 'RR', 'AR', 'SR'],
        reporter:  ['U', 'R'],
        streamer:  ['R', 'RR', 'AR']
      },
      chatXp: 2,                      // 第一次与 NPC 闲聊获得的经验
      tableEnvBonus: 6                // 入座游戏桌对“环境体验”满意度的加成
    },

    /* ---------------- 员工互动（靠近按 E） ---------------- */
    staffInteract: {
      talkRange: 1.7,                 // 玩家与员工可交谈的距离
      chatMorale: 9,                  // 聊两句：士气 +
      chatRelation: 1,                // 聊两句：关系 +
      bonusCost: 80,                  // 发放奖金花费
      bonusMorale: 20,                // 发放奖金：士气 +
      bonusRelation: 2,               // 发放奖金：关系 +
      praiseMorale: 4,                // 肯定工作：士气 +
      moraleStart: 62,
      moraleMax: 100,
      moraleDailyDecay: 5,            // 出勤一天自然消耗
      moraleChatRecover: 4,           // 当天聊过，日结额外恢复
      moraleLowLine: 35,              // 低于该值提示士气低落
      moraleEffMin: 0.82,             // 士气 0 时的效率系数
      moraleEffMax: 1.14              // 士气 100 时的效率系数
    },

    /* ---------------- NPC 长期关系（熟客档案） ---------------- */
    relation: {
      repeatChance: 0.42,             // 新顾客命中熟客档案的概率
      maxContacts: 80,
      relationMax: 100,
      perVisit: 1,                    // 每次到店结算
      perServe: 2,                    // 完成结账
      perChat: 1,
      perDeal: 3,                     // 收购/推销成交
      perAbandon: -2,
      budgetBonus: 0.0025,            // 每点关系：预算 +0.25%
      priceBonus: 0.0018,             // 每点关系：价格容忍 +0.18%
      pitchBonus: 0.0012              // 每点关系：推荐成功率 +0.12%
    },

    /* ---------------- 厂商联动快讯（Link）：不止减产与运费两种 ---------------- */
    supplierNews: {
      maxActive: 14,
      dailyChancePerSupplier: 0.42,
      events: [
        { id: 'discount',  weight: 14, days: [2, 4], title: '限时进货折扣', tag: '价格', color: '#6ee0a0',
          text: '{sup} 开启限时进货折扣，采购价 {v} 折。', effects: { costMul: 0.85 } },
        { id: 'freight',   weight: 12, days: [2, 3], title: '物流补贴', tag: '运费', color: '#5c9ee6',
          text: '{sup} 补贴干线物流，本店运费 {v} 折。', effects: { freightMul: 0.62 } },
        { id: 'capacity',  weight: 10, days: [3, 5], title: '产能扩张', tag: '产能', color: '#4fd1c5',
          text: '{sup} 新产线投产，日产能 +{v}%。', effects: { capacityMul: 1.35 } },
        { id: 'shortage',  weight: 10, days: [2, 4], title: '原料短缺', tag: '产能', color: '#ef6f6c',
          text: '{sup} 原料短缺，日产能 -{v}%。', effects: { capacityMul: 0.62 } },
        { id: 'stockup',   weight: 9,  days: [1, 1], title: '紧急补库', tag: '库存', color: '#ffd479',
          text: '{sup} 向本店渠道紧急补库，库存 +{v} 件。', effects: { stockBoost: 90 } },
        { id: 'clearance', weight: 8,  days: [2, 3], title: '清仓甩卖', tag: '价格', color: '#b07fd2',
          text: '{sup} 清仓甩卖，采购价 {v} 折且库存充足。', effects: { costMul: 0.76, stockBoost: 60 } },
        { id: 'hype',      weight: 8,  days: [3, 5], title: '联名炒作', tag: '需求', color: '#f5b942',
          text: '{sup} 联名话题登上热搜，相关商品需求 +{v}%。', effects: { demandMul: 1.35 } },
        { id: 'scandal',   weight: 6,  days: [2, 4], title: '质检风波', tag: '需求', color: '#ef6f6c',
          text: '{sup} 被曝质检问题，相关商品需求 -{v}%。', effects: { demandMul: 0.72 } },
        { id: 'strike',    weight: 6,  days: [1, 2], title: '物流罢工', tag: '运费', color: '#ef6f6c',
          text: '{sup} 物流罢工，本店运费涨到 {v} 倍。', effects: { freightMul: 1.45 } },
        { id: 'exclusive', weight: 7,  days: [3, 6], title: '独家代理', tag: '配额', color: '#4fd1c5',
          text: '{sup} 授予本店独家代理，生产配额 +{v}%。', effects: { capacityMul: 1.2, demandMul: 1.12 } },
        { id: 'bundle',    weight: 7,  days: [2, 3], title: '买赠活动', tag: '价格', color: '#6ee0a0',
          text: '{sup} 买赠活动：满 10 件赠送 1 件，采购价 {v} 折。', effects: { costMul: 0.9, stockBoost: 20 } },
        { id: 'festival',  weight: 7,  days: [3, 4], title: '节日礼盒季', tag: '需求', color: '#ffd479',
          text: '{sup} 节日礼盒季开启，到店客流 +{v}%，礼盒需求上升。', effects: { demandMul: 1.25, trafficBonus: 0.08 } },
        { id: 'restock',   weight: 6,  days: [1, 1], title: '渠道回收', tag: '库存', color: '#94a3b8',
          text: '{sup} 回收滞销库存，本店库存 -{v} 件（腾出货架）。', effects: { stockBoost: -35 } },
        { id: 'pricewar',  weight: 6,  days: [2, 4], title: '价格战', tag: '价格', color: '#ef6f6c',
          text: '{sup} 与竞品打起价格战，市场参考价承压，采购价 {v} 折。', effects: { costMul: 0.82, marketMul: 0.985 } },
        { id: 'quality',   weight: 5,  days: [4, 7], title: '品质升级', tag: '需求', color: '#5c9ee6',
          text: '{sup} 完成品质升级，顾客口碑提升，需求 +{v}%。', effects: { demandMul: 1.18, fameBonus: 2 } },
        { id: 'openhouse', weight: 5,  days: [1, 2], title: '厂商开放日', tag: '关系', color: '#b07fd2',
          text: '{sup} 邀请店主参加开放日，赠送样品并加深合作。', effects: { stockBoost: 25, fameBonus: 1 } }
      ]
    },

    firstNames: ['小林', '阿拓', '美咲', '健太', '千夏', '凉介', '由纪', '慎吾', '杏子', '大和', '直树', '莉奈', '和真', '枫', '悠斗', '咲良'],
    lastNames: ['佐藤', '铃木', '高桥', '田中', '伊藤', '渡边', '山本', '中村', '小林', '加藤', '吉田', '山田'],

    /* ---------------- 维修 / 耐久 ---------------- */
    durability: {
      start: 100,
      dailyNaturalLoss: 0.6,
      usageLoss: 0.10,       // 每次使用/交易
      failHint: 35            // 低于该值时提示
    },

    /* ---------------- 存档 ---------------- */
    save: { key: 'card_shop_demo_save_v1', schema: 2 }
  };

  CS.CONTENT = CONTENT;

  /* 便捷索引 */
  CS.INDEX = {
    ips: Object.fromEntries(CONTENT.ips.map(i => [i.id, i])),
    products: Object.fromEntries(CONTENT.products.map(p => [p.sku, p])),
    facilities: Object.fromEntries(CONTENT.facilities.map(f => [f.id, f])),
    suppliers: Object.fromEntries(CONTENT.suppliers.map(s => [s.id, s])),
    npcTypes: Object.fromEntries(CONTENT.npcTypes.map(n => [n.id, n]))
  };
})(typeof window !== 'undefined' ? window : globalThis);
