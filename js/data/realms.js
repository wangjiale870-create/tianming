// 境界数据表
// 每个境界包含：名称、所需修为、攻击加成、血量加成、突破失败概率
const REALMS = [
  { id: 0,  name: '凡人',     needExp: 0,         atk: 1,   hp: 1,   failRate: 0 },
  { id: 1,  name: '炼气一层',  needExp: 500,       atk: 1.5, hp: 1.5, failRate: 0 },
  { id: 2,  name: '炼气二层',  needExp: 1200,      atk: 2,   hp: 2,   failRate: 0 },
  { id: 3,  name: '炼气三层',  needExp: 2500,      atk: 2.5, hp: 2.5, failRate: 0 },
  { id: 4,  name: '炼气四层',  needExp: 5000,      atk: 3,   hp: 3,   failRate: 0.05 },
  { id: 5,  name: '炼气五层',  needExp: 9000,      atk: 4,   hp: 4,   failRate: 0.05 },
  { id: 6,  name: '炼气六层',  needExp: 15000,     atk: 5,   hp: 5,   failRate: 0.08 },
  { id: 7,  name: '炼气七层',  needExp: 24000,     atk: 6.5, hp: 6.5, failRate: 0.08 },
  { id: 8,  name: '炼气八层',  needExp: 38000,     atk: 8,   hp: 8,   failRate: 0.10 },
  { id: 9,  name: '炼气九层',  needExp: 60000,     atk: 10,  hp: 10,  failRate: 0.10 },
  // 大境界突破
  { id: 10, name: '筑基初期',  needExp: 100000,    atk: 15,  hp: 15,  failRate: 0.15, isMajor: true },
  { id: 11, name: '筑基中期',  needExp: 160000,    atk: 20,  hp: 20,  failRate: 0.15 },
  { id: 12, name: '筑基后期',  needExp: 250000,    atk: 28,  hp: 28,  failRate: 0.18 },
  { id: 13, name: '筑基圆满',  needExp: 400000,    atk: 38,  hp: 38,  failRate: 0.18 },
  // 金丹
  { id: 14, name: '金丹初期',  needExp: 650000,    atk: 55,  hp: 55,  failRate: 0.25, isMajor: true },
  { id: 15, name: '金丹中期',  needExp: 1000000,   atk: 75,  hp: 75,  failRate: 0.25 },
  { id: 16, name: '金丹后期',  needExp: 1600000,   atk: 100, hp: 100, failRate: 0.28 },
  { id: 17, name: '金丹圆满',  needExp: 2500000,   atk: 140, hp: 140, failRate: 0.30 },
  // 元婴
  { id: 18, name: '元婴初期',  needExp: 4000000,   atk: 200, hp: 200, failRate: 0.35, isMajor: true },
  { id: 19, name: '元婴中期',  needExp: 6500000,   atk: 280, hp: 280, failRate: 0.35 },
  { id: 20, name: '元婴后期',  needExp: 10000000,  atk: 400, hp: 400, failRate: 0.38 },
  { id: 21, name: '元婴圆满',  needExp: 16000000,  atk: 550, hp: 550, failRate: 0.40 },
  // 化神
  { id: 22, name: '化神初期',  needExp: 25000000,  atk: 800, hp: 800, failRate: 0.45, isMajor: true },
  { id: 23, name: '化神中期',  needExp: 40000000,  atk: 1200,hp: 1200,failRate: 0.45 },
  { id: 24, name: '化神后期',  needExp: 65000000,  atk: 1800,hp: 1800,failRate: 0.48 },
  { id: 25, name: '化神圆满',  needExp: 100000000, atk: 2500,hp: 2500,failRate: 0.50 },
];

// 离线修炼速率：每秒修为（基础值，乘品质倍率和道途加成）
const BASE_CULTIVATION_PER_SECOND = 10;

// 离线收益上限：最多累计 24 小时
const MAX_OFFLINE_SECONDS = 86400;
