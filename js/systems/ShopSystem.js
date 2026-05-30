// ShopSystem — 坊市系统
// 每日刷新商品，灵石购买，定向获取武器/功法/矿石/丹药

class ShopSystem {

  // 每个分类刷几个商品
  static SLOTS = {
    weapon: 3,
    skill: 3,
    ore: 2,
    pill: 2,
  };

  // 手动刷新费用
  static REFRESH_COST = 50;

  // —————— 品质概率（受奇遇值加成）——————

  static rollQuality(state) {
    const luck = state.luck || 1.0;
    const luckBonus = luck - 1.0;
    // 奇遇值越高，高品概率越高
    const legendaryChance = Math.min(0.30, 0.03 + luckBonus * 0.012);
    const epicChance      = Math.min(0.50, 0.15 + luckBonus * 0.025);
    const rareChance      = Math.max(0.10, 0.32 - luckBonus * 0.01);
    // common 补足剩余

    const roll = Math.random();
    if (roll < legendaryChance) return 'legendary';
    if (roll < legendaryChance + epicChance) return 'epic';
    if (roll < legendaryChance + epicChance + rareChance) return 'rare';
    return 'common';
  }

  // —————— 商品生成 ——————

  static generateWeaponItem(state) {
    const daoIds = ['sword', 'magic', 'body', 'soul', 'luck'];
    const daoId = daoIds[Math.floor(Math.random() * daoIds.length)];
    const quality = ShopSystem.rollQuality(state);

    const prices = { common: 500, rare: 2000, epic: 8000, legendary: 30000 };
    const dao = DAOS[daoId];
    const q = QUALITIES[quality];

    // 紧凑数值描述（最多2个道途特征，确保不溢出）
    const daoStats = [];
    if (dao.critBonus) daoStats.push(`暴击+${Math.round(dao.critBonus * 100)}%`);
    if (dao.skillBonus) daoStats.push(`技能+${Math.round(dao.skillBonus * 100)}%`);
    if (dao.tribulationResist) daoStats.push(`渡劫抗性+${Math.round(dao.tribulationResist * 100)}%`);
    if (dao.cultivationBonus !== 1) daoStats.push(`修炼×${dao.cultivationBonus}`);
    if (dao.offlineBonus) daoStats.push(`离线+${Math.round(dao.offlineBonus * 100)}%`);
    if (dao.luckBonus) daoStats.push(`奇遇+${Math.round(dao.luckBonus * 100)}%`);
    const shortDesc = [`ATK×${q.multiplier}`, ...daoStats.slice(0, 2)].join(' · ');

    return {
      id: 'shop_wep_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      category: 'weapon',
      name: `${dao.icon} ${dao.weapon}·${q.name}`,
      daoId,
      quality,
      price: prices[quality],
      stock: 1,
      sold: false,
      emoji: q.emoji,
      desc: shortDesc,
      saintEffect: dao.saintEffect,
    };
  }

  static generateSkillItem(state) {
    const daoIds = ['sword', 'magic', 'body', 'soul', 'luck'];
    const daoId = daoIds[Math.floor(Math.random() * daoIds.length)];
    const quality = ShopSystem.rollQuality(state);

    const prices = { common: 300, rare: 1500, epic: 5000, legendary: 25000 };
    const pool = SKILLS_BY_DAO[daoId].filter(s => s.quality === quality);
    if (pool.length === 0) {
      // 安全回退：找该道途任意功法
      const fallback = SKILLS_BY_DAO[daoId];
      if (fallback && fallback.length > 0) {
        const skillAny = fallback[Math.floor(Math.random() * fallback.length)];
        const qAny = QUALITIES[skillAny.quality];
        const daoAny = DAOS[daoId];
        return {
          id: 'shop_skill_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          category: 'skill', name: `${daoAny.icon} ${skillAny.name}`,
          daoId, quality: skillAny.quality, skillId: skillAny.id,
          price: ({ common: 300, rare: 1500, epic: 5000, legendary: 25000 })[skillAny.quality] || 300,
          stock: 1, sold: false, emoji: qAny.emoji, desc: skillAny.effect || skillAny.desc,
        };
      }
      // 极端情况：返回一个占位商品
      const dao = DAOS[daoId];
      return {
        id: 'shop_skill_fallback_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        category: 'skill', name: `${dao.icon} 基础心得`, daoId, quality: 'common',
        skillId: daoId + '_common_1', price: 300, stock: 1, sold: false, emoji: '⚪',
        desc: '基础修炼心得，聊胜于无',
      };
    }
    const skill = pool[Math.floor(Math.random() * pool.length)];
    const q = QUALITIES[quality];
    const dao = DAOS[daoId];

    return {
      id: 'shop_skill_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      category: 'skill',
      name: `${dao.icon} ${skill.name}`,
      daoId,
      quality,
      skillId: skill.id,
      price: prices[quality],
      stock: 1,
      sold: false,
      emoji: q.emoji,
      desc: skill.effect || skill.desc,
    };
  }

  static generateOreItem(state) {
    const types = ['iron', 'steel', 'crystal'];
    const oreType = types[Math.floor(Math.random() * types.length)];
    const o = ORES[oreType];

    const configs = {
      iron:    { amount: 5,  price: 500 },
      steel:   { amount: 3,  price: 1500 },
      crystal: { amount: 1,  price: 3000 },
    };
    const cfg = configs[oreType];

    return {
      id: 'shop_ore_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      category: 'ore',
      name: `${o.emoji} ${o.name} ×${cfg.amount}`,
      oreType,
      amount: cfg.amount,
      price: cfg.price,
      stock: 1,
      sold: false,
      emoji: o.emoji,
      desc: `武器升级材料`,
      color: o.color,
    };
  }

  static generatePillItem(state) {
    const pillPool = [
      { name: '战力丹', effect: 'battle', desc: '下次战斗攻击力 +20%', emoji: '💊', color: '#ff6644', price: 300 },
      { name: '修炼丹', effect: 'cultivation', desc: '修炼速度 +50%（30分钟）', emoji: '🧪', color: '#44cc66', price: 500 },
      { name: '护体丹', effect: 'hp', desc: '下次战斗血量 +30%', emoji: '🛡️', color: '#4499ff', price: 300 },
      { name: '暴击丹', effect: 'crit', desc: '下次战斗暴击率 +20%', emoji: '💥', color: '#ffaa00', price: 400 },
    ];
    const pill = pillPool[Math.floor(Math.random() * pillPool.length)];

    return {
      id: 'shop_pill_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      category: 'pill',
      name: `${pill.emoji} ${pill.name}`,
      price: pill.price,
      stock: 1,
      sold: false,
      emoji: pill.emoji,
      desc: pill.desc,
      pillEffect: pill.effect,
      color: pill.color,
    };
  }

  // —————— 刷新 ——————

  static refreshShop(state, costStones = false) {
    if (costStones) {
      if (state.spiritStones < ShopSystem.REFRESH_COST) return { error: '灵石不足，需要 50 灵石' };
      state.spiritStones -= ShopSystem.REFRESH_COST;
    }

    const items = [];

    for (let i = 0; i < ShopSystem.SLOTS.weapon; i++) {
      items.push(ShopSystem.generateWeaponItem(state));
    }
    for (let i = 0; i < ShopSystem.SLOTS.skill; i++) {
      items.push(ShopSystem.generateSkillItem(state));
    }
    for (let i = 0; i < ShopSystem.SLOTS.ore; i++) {
      items.push(ShopSystem.generateOreItem(state));
    }
    for (let i = 0; i < ShopSystem.SLOTS.pill; i++) {
      items.push(ShopSystem.generatePillItem(state));
    }

    state.shopItems = items;
    state.shopDate = new Date().toISOString().split('T')[0];
    DataStore.autoSave(state);

    return { items };
  }

  // 检查是否需要每日刷新
  static checkAndRefresh(state) {
    const today = new Date().toISOString().split('T')[0];
    if (state.shopDate !== today || !state.shopItems || state.shopItems.length === 0) {
      return ShopSystem.refreshShop(state, false);
    }
    return null;
  }

  // —————— 购买 ——————

  static buyItem(state, itemIdx) {
    if (itemIdx < 0 || itemIdx >= state.shopItems.length) return { error: '商品不存在' };
    const item = state.shopItems[itemIdx];
    if (!item) return { error: '商品不存在' };
    if (item.sold) return { error: '已售罄' };
    if (state.spiritStones < item.price) return { error: '灵石不足' };

    // 扣钱
    state.spiritStones -= item.price;
    item.sold = true;

    // 根据分类发物品
    let result = { success: true, message: '' };

    switch (item.category) {
      case 'weapon': {
        const w = {
          id: item.daoId + '_' + item.quality + '_' + Date.now(),
          daoId: item.daoId,
          quality: item.quality,
          level: 0,
          equipped: false,
          name: DAOS[item.daoId].weapon + '·' + QUALITIES[item.quality].name,
          desc: item.desc,
        };
        state.weaponInventory.push(w);
        if (state.weaponInventory.length === 1 && state.equippedWeapon === null) {
          state.equipWeapon(state.weaponInventory.length - 1);
        }
        result.message = `获得 ${item.name}！`;
        result.item = w;
        break;
      }
      case 'skill': {
        if (!state.skillInventory.find(s => s.id === item.skillId)) {
          const skillData = SKILLS_BY_DAO[item.daoId].find(s => s.id === item.skillId);
          const se = {
            id: item.skillId,
            daoId: item.daoId,
            quality: item.quality,
            level: 0,
            equipped: false,
            name: skillData.name,
            desc: skillData.desc,
            effect: skillData.effect,
          };
          state.skillInventory.push(se);
          if (state.equippedSkills.length < state.maxSkillSlots) {
            state.equipSkill(state.skillInventory.length - 1);
          }
          result.message = `习得 ${item.name}！`;
        } else {
          result.message = `已有此功法，灵石已消耗`;
        }
        break;
      }
      case 'ore': {
        state.ores[item.oreType] = (state.ores[item.oreType] || 0) + item.amount;
        result.message = `获得 ${item.name}！`;
        break;
      }
      case 'pill': {
        // 丹药存入背包（新字段）
        if (!state.pills) state.pills = [];
        state.pills.push({
          name: item.name,
          effect: item.pillEffect,
          desc: item.desc,
          emoji: item.emoji,
          color: item.color,
        });
        result.message = `获得 ${item.name}！可在背包中使用`;
        break;
      }
    }

    DataStore.autoSave(state);
    return result;
  }

  // 初始化商店字段
  static initShopFields(state) {
    if (!state.shopItems) state.shopItems = [];
    if (!state.shopDate) state.shopDate = '';
    if (!state.pills) state.pills = [];
    if (!state.activePillBuffs) state.activePillBuffs = {};
  }
}
