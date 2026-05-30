// 功法升级等级
const SKILL_UPGRADE_LEVELS = [
  { level: 0, name: '初悟', scrollCost: 0,    stoneCost: 0,      atkBonus: 0 },
  { level: 1, name: '精通', scrollCost: 5,    stoneCost: 2000,   atkBonus: 0.05 },
  { level: 2, name: '大成', scrollCost: 15,   stoneCost: 8000,   atkBonus: 0.10 },
  { level: 3, name: '圆满', scrollCost: 30,   stoneCost: 20000,  atkBonus: 0.15 },
];

// 功法分解产出（按品质）
const SKILL_DISMANTLE_YIELD = {
  common:    { min: 1, max: 2 },
  rare:      { min: 3, max: 5 },
  epic:      { min: 8, max: 12 },
  legendary: { min: 20, max: 30 },
};

// 功法数据表
// key: daoId, value: 该道途所有功法
const SKILLS_BY_DAO = {
  sword: [
    { id: 'sword_common_1', name: '基础剑法',   quality: 'common',    desc: '剑修入门功法',                  atkBonus: 1.05, effect: '攻击 +5%' },
    { id: 'sword_rare_1',   name: '御剑术',     quality: 'rare',      desc: '以气驭剑，百步之外取敌首级',     atkBonus: 1.10, effect: '攻击 +10%' },
    { id: 'sword_rare_2',   name: '剑气纵横',   quality: 'rare',      desc: '剑气化形，范围倍增',             atkBonus: 1.08, effect: '暴击伤害 +20%' },
    { id: 'sword_epic_1',   name: '万剑归宗',   quality: 'epic',      desc: '万剑齐发，天地变色',             atkBonus: 1.20, effect: '攻击 +20%，暴击率 +10%' },
    { id: 'sword_epic_2',   name: '无上剑意',   quality: 'epic',      desc: '心中有剑，万物皆可为剑',         atkBonus: 1.15, effect: '战斗时间越久攻击越高' },
    { id: 'sword_legendary',name: '斩天剑诀',   quality: 'legendary', desc: '此剑出鞘，天劫退避三舍',         atkBonus: 1.50, effect: '攻击 +50%，暴击率 +25%' },
  ],
  magic: [
    { id: 'magic_common_1', name: '基础法术',   quality: 'common',    desc: '法修入门功法',                  atkBonus: 1.05, effect: '攻击 +5%' },
    { id: 'magic_rare_1',   name: '五雷正法',   quality: 'rare',      desc: '引天雷为已用，霸道无双',         atkBonus: 1.10, effect: '技能伤害 +15%' },
    { id: 'magic_rare_2',   name: '玄冰诀',     quality: 'rare',      desc: '冰封万里，寒入骨髓',             atkBonus: 1.08, effect: '灵力恢复 +30%' },
    { id: 'magic_epic_1',   name: '焚天术',     quality: 'epic',      desc: '烈焰焚天，焚尽八荒',             atkBonus: 1.20, effect: '技能伤害 +30%' },
    { id: 'magic_epic_2',   name: '乾坤挪移',   quality: 'epic',      desc: '移山倒海，一念之间',             atkBonus: 1.15, effect: '战斗开场直接放一次技能' },
    { id: 'magic_legendary',name: '混沌天书',   quality: 'legendary', desc: '混沌未开，天书已成。万法归宗',   atkBonus: 1.50, effect: '技能伤害 +60%' },
  ],
  body: [
    { id: 'body_common_1',  name: '基础炼体',   quality: 'common',    desc: '体修入门功法',                  atkBonus: 1.05, effect: '血量 +10%' },
    { id: 'body_rare_1',    name: '金钟罩',     quality: 'rare',      desc: '罡气护体，刀枪不入',             atkBonus: 1.10, effect: '减伤 +15%' },
    { id: 'body_rare_2',    name: '铁布衫',     quality: 'rare',      desc: '千锤百炼，肉身即法宝',           atkBonus: 1.08, effect: '反伤 10%' },
    { id: 'body_epic_1',    name: '不灭金身',   quality: 'epic',      desc: '金身不灭，万劫不毁',             atkBonus: 1.20, effect: '血量 +30%，减伤 +15%' },
    { id: 'body_epic_2',    name: '万兽之力',   quality: 'epic',      desc: '炼化万兽精血，力大无穷',         atkBonus: 1.15, effect: '攻击额外增加血量 10%' },
    { id: 'body_legendary', name: '混沌圣体',   quality: 'legendary', desc: '混沌未分，圣体已成。天地莫能伤', atkBonus: 1.50, effect: '血量 +50%，减伤 +25%' },
  ],
  soul: [
    { id: 'soul_common_1',  name: '冥想术',     quality: 'common',    desc: '魂修入门功法',                  atkBonus: 1.05, effect: '修炼速度 +5%' },
    { id: 'soul_rare_1',    name: '神识扩散',   quality: 'rare',      desc: '神识如丝，蔓延千里',             atkBonus: 1.10, effect: '离线收益 +15%' },
    { id: 'soul_rare_2',    name: '元神出窍',   quality: 'rare',      desc: '元神离体，天地遨游',             atkBonus: 1.08, effect: '突破成功率 +10%' },
    { id: 'soul_epic_1',    name: '六道轮回',   quality: 'epic',      desc: '窥轮回之秘，证不死之身',         atkBonus: 1.20, effect: '修炼速度 +25%' },
    { id: 'soul_epic_2',    name: '天机推演',   quality: 'epic',      desc: '推演天机，预知未来',             atkBonus: 1.15, effect: '渡劫失败率 -15%' },
    { id: 'soul_legendary', name: '永恒之魂',   quality: 'legendary', desc: '魂之极致，永恒不朽',             atkBonus: 1.50, effect: '修炼速度 +50%' },
  ],
  luck: [
    { id: 'luck_common_1',  name: '望气术',     quality: 'common',    desc: '运修入门功法',                  atkBonus: 1.05, effect: '奇遇概率 +2%' },
    { id: 'luck_rare_1',    name: '趋吉避凶',   quality: 'rare',      desc: '冥冥中自有天意',                 atkBonus: 1.10, effect: '战斗失败不掉层数' },
    { id: 'luck_rare_2',    name: '福缘深厚',   quality: 'rare',      desc: '福缘加身，上天眷顾',             atkBonus: 1.08, effect: '抽卡掉落灵石翻倍' },
    { id: 'luck_epic_1',    name: '天道眷顾',   quality: 'epic',      desc: '天道垂青，机缘不断',             atkBonus: 1.20, effect: '奇遇概率 +8%，抽卡紫品概率翻倍' },
    { id: 'luck_epic_2',    name: '逆天改命',   quality: 'epic',      desc: '我命由我不由天',                 atkBonus: 1.15, effect: '渡劫失败后可无广告免费复活一次' },
    { id: 'luck_legendary', name: '天命所归',   quality: 'legendary', desc: '天命之子，诸天俯首',             atkBonus: 1.50, effect: '奇遇概率 +20%，抽卡红武概率翻倍' },
  ],
};
