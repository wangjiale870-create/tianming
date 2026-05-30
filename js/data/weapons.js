// 武器 / 道途数据

const DAOS = {
  sword: {
    id: 'sword',
    name: '剑修',
    weapon: '飞剑',
    icon: '🗡️',
    desc: '以杀证道，攻击越高修炼越快',
    statBonus: { atk: 1.3, hp: 1.0, speed: 1.2, luck: 1.0 },
    cultivationBonus: 1.0, // 修炼速度倍率（后期暴击推层快 = 修炼更快）
    critBonus: 0.15,       // 额外暴击率
    saintEffect: '渡劫如砍瓜，刀刀暴击。暴击率额外 +20%',
  },
  magic: {
    id: 'magic',
    name: '法修',
    weapon: '宝珠',
    icon: '🔮',
    desc: '灵力池深，技能爆发毁天灭地',
    statBonus: { atk: 1.0, hp: 0.9, speed: 1.0, luck: 1.1 },
    cultivationBonus: 1.0,
    skillBonus: 0.20,      // 技能伤害加成
    saintEffect: '一波技能秒 Boss。技能伤害额外 +40%',
  },
  body: {
    id: 'body',
    name: '体修',
    weapon: '肉身',
    icon: '🛡️',
    desc: '肉身成圣，雷劫不动如山',
    statBonus: { atk: 0.8, hp: 2.0, speed: 0.7, luck: 1.0 },
    cultivationBonus: 0.7,  // 慢但稳
    tribulationResist: 0.30, // 渡劫失败率 -30%
    saintEffect: '雷劈不动如山。渡劫失败率额外 -30%，几乎不死',
  },
  soul: {
    id: 'soul',
    name: '魂修',
    weapon: '念珠',
    icon: '📿',
    desc: '修炼稳定，离线收益极高',
    statBonus: { atk: 0.9, hp: 1.1, speed: 0.8, luck: 1.2 },
    cultivationBonus: 1.5,  // 修炼快
    offlineBonus: 0.30,     // 离线额外收益
    saintEffect: '睡一觉起来突破大境界。离线收益翻倍',
  },
  luck: {
    id: 'luck',
    name: '运修',
    weapon: '羽扇',
    icon: '🪭',
    desc: '天命所归，奇遇连连',
    statBonus: { atk: 0.7, hp: 0.8, speed: 1.0, luck: 2.5 },
    cultivationBonus: 0.8,
    luckBonus: 0.10,        // 奇遇概率加成
    saintEffect: '路边随便走都是机缘。抽卡红武概率翻倍，奇遇概率 +20%',
  },
};

// 武器品质
const QUALITIES = {
  common:   { id: 'common',   name: '凡品', emoji: '⚪', multiplier: 1.0, color: '#aaaaaa' },
  rare:     { id: 'rare',     name: '灵品', emoji: '🔵', multiplier: 1.5, color: '#4da6ff' },
  epic:     { id: 'epic',     name: '玄品', emoji: '🟣', multiplier: 2.5, color: '#cc66ff' },
  legendary:{ id: 'legendary',name: '圣品', emoji: '🟡', multiplier: 5.0, color: '#ffaa00' },
};

// 矿石类型
const ORES = {
  iron:     { id: 'iron',     name: '铁矿',   emoji: '🔩', color: '#998866' },
  steel:    { id: 'steel',    name: '灵钢',   emoji: '🪨', color: '#6699cc' },
  crystal:  { id: 'crystal',  name: '玄晶',   emoji: '💎', color: '#cc66ff' },
  essence:  { id: 'essence',  name: '圣精',   emoji: '✨', color: '#ffaa00' },
};

// 武器分解产出（按品质）
const DISMANTLE_YIELD = {
  common:    { type: 'iron',    min: 1, max: 3 },
  rare:      { type: 'steel',   min: 1, max: 3 },
  epic:      { type: 'crystal', min: 1, max: 3 },
  legendary: { type: 'essence', min: 1, max: 2 },
};

// 武器成长等级（灵石 + 矿石）
const WEAPON_LEVELS = [
  { level: 0, name: '初识', stoneCost: 0,      oreType: null,     oreCost: 0,  atkMult: 1.0 },
  { level: 1, name: '通灵', stoneCost: 5000,    oreType: 'iron',    oreCost: 5,  atkMult: 1.5 },
  { level: 2, name: '觉醒', stoneCost: 20000,   oreType: 'steel',   oreCost: 5,  atkMult: 2.0 },
  { level: 3, name: '圆满', stoneCost: 50000,   oreType: 'crystal', oreCost: 5,  atkMult: 3.0 },
];
