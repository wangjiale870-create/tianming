// 万界战场 — 敌人数据
// 每层一个守关者，300 层

function generateEnemies(totalLayers = 300) {
  const enemies = [];
  const names = [
    '噬金鼠', '石魔', '火鸦', '冰蟒', '风狼', '毒蝎', '雷鹰', '土龙',
    '幽冥鬼蝠', '赤焰虎', '玄冰熊', '紫电貂', '金翅大鹏', '九头蛇',
    '啸月天狼', '焚天雀', '万毒蜈蚣', '撼地猿', '飞天夜叉', '黑水玄蛇',
    '铁甲犀牛', '碧眼狐狸', '嗜血魔蝠', '寒冰巨人', '烈焰魔君',
    '天雷尊者', '剑魂', '刀魔', '阵灵', '荒兽',
    '九尾妖狐', '麒麟', '玄武', '白虎', '青龙', '朱雀',
    '混沌兽', '穷奇', '梼杌', '饕餮', '应龙', '烛龙',
    '上古剑仙残魂', '魔尊分身', '逍遥散仙', '太古神魔', '天道傀儡',
  ];

  const titles = [
    '', '精英', '统领', '王族', '远古', '不朽',
    '天劫级', '灭世级', '混沌级', '开天级',
  ];

  for (let i = 0; i < totalLayers; i++) {
    const nameIdx = i % names.length;
    const titleIdx = Math.min(Math.floor(i / 30), titles.length - 1);
    const titlePrefix = titleIdx > 0 ? titles[titleIdx] + ' ' : '';

    // 每层血量递增 12%，攻击递增 8%
    const baseHP = 100 * Math.pow(1.12, i);
    const baseATK = 10 * Math.pow(1.08, i);

    // 每 5 层一个 BOSS 层，属性翻倍
    const isBoss = (i + 1) % 5 === 0;
    const bossMult = isBoss ? 2.5 : 1;

    enemies.push({
      layer: i + 1,
      name: titlePrefix + names[nameIdx],
      hp: Math.floor(baseHP * bossMult),
      atk: Math.floor(baseATK * bossMult),
      isBoss: isBoss,
      // 掉落
      rewards: {
        spiritStones: Math.floor(10 + i * 5 + (isBoss ? 500 : 0)),
        tianjiFragments: isBoss ? 5 : (Math.random() < 0.15 ? 1 : 0), // 15% 掉 1 个碎片
      },
    });
  }
  return enemies;
}

const ENEMIES = generateEnemies(300);
const TIANJI_FRAGMENTS_PER_TOKEN = 30; // 30 个碎片合成 1 枚天机令
