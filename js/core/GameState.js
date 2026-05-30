// GameState — 核心游戏状态管理
// 单例，管理所有玩家数据

class GameState {
  constructor() {
    this.reset();
  }

  // -------- 初始化 / 重置 --------
  reset() {
    // 修为 & 境界
    this.cultivation = 0;        // 当前修为
    this.realmId = 0;            // 当前境界 ID（对应 REALMS 索引）

    // 灵石
    this.spiritStones = 100;

    // 天机令
    this.tianjiTokens = 5;       // 新手送 5 枚
    this.totalDraws = 0;         // 累计抽卡次数（用于天命保底）

    // 聚灵符
    this.julingFu = 0;

    // 天机令碎片
    this.tianjiFragments = 0;

    // -------- 背包 --------
    // 武器背包：[{id, daoId, quality, level, equipped}]
    this.weaponInventory = [];
    // 功法背包：[{id, daoId, quality, equipped}]
    this.skillInventory = [];

    // 矿石背包：{ iron: 0, steel: 0, crystal: 0, essence: 0 }
    this.ores = { iron: 0, steel: 0, crystal: 0, essence: 0 };

    // 功法残页（分解功法获得，用于功法升级）
    this.skillScrolls = 0;

    // -------- 装备栏 --------
    this.equippedWeapon = null;   // 武器背包中某一把的引用（index）
    this.equippedSkills = [];     // 最多 4 个，存 skill id 或 inventory index

    // 最大技能槽
    this.maxSkillSlots = 4;

    // 万界战场
    this.battleCurrentLayer = 1; // 当前挑战层
    this.battleHighestLayer = 0; // 最高通关层

    // 渡劫相关
    this.isTribulating = false;  // 是否在渡劫中
    this.tribulationFailed = false; // 渡劫是否失败

    // 签到
    this.lastLoginDate = null;   // 'YYYY-MM-DD'
    this.consecutiveLoginDays = 0;

    // 离线时间
    this.lastOnlineTime = Date.now();

    // 统计
    this.totalAdsWatched = 0;
    this.totalBattles = 0;
    this.totalCrits = 0;
    this.maxCrit = 0;
    this.totalLegendaryDraws = 0;

    // 新手保护 & 天命
    this.newbieProtectionActive = true;  // 前 50 抽是否在保护期内
    this.destinyWeaponDrawn = false;     // 是否已出红武保底
    this.destinySkillDrawn = false;      // 是否已出红功法保底

    // 坊市
    this.shopItems = [];       // 当前坊市商品
    this.shopDate = '';        // 上次刷新日期 'YYYY-MM-DD'
    this.shopVersion = 2;      // 商品数据格式版本

    // 丹药
    this.pills = [];           // 丹药背包 [{name, effect, desc, emoji, color}]
    this.activePillBuffs = {}; // 当前丹药 buff 效果
  }

  // -------- 当前装备数据（便捷访问）--------
  get currentWeapon() {
    if (this.equippedWeapon === null || this.equippedWeapon === undefined) return null;
    return this.weaponInventory[this.equippedWeapon] || null;
  }

  get daoId() {
    const w = this.currentWeapon;
    return w ? w.daoId : null;
  }

  get weaponQuality() {
    const w = this.currentWeapon;
    return w ? w.quality : null;
  }

  get weaponLevel() {
    const w = this.currentWeapon;
    return w ? (w.level || 0) : 0;
  }

  // 当前装备的技能列表
  get equippedSkillList() {
    return this.equippedSkills
      .map(idx => this.skillInventory[idx])
      .filter(Boolean);
  }

  // -------- 装备/卸下操作 --------
  equipWeapon(inventoryIndex) {
    if (inventoryIndex < 0 || inventoryIndex >= this.weaponInventory.length) return false;
    this.equippedWeapon = inventoryIndex;
    this.weaponInventory[inventoryIndex].equipped = true;
    // 卸下其他武器
    for (let i = 0; i < this.weaponInventory.length; i++) {
      if (i !== inventoryIndex) this.weaponInventory[i].equipped = false;
    }
    return true;
  }

  unequipWeapon() {
    if (this.equippedWeapon !== null) {
      this.weaponInventory[this.equippedWeapon].equipped = false;
    }
    this.equippedWeapon = null;
  }

  equipSkill(inventoryIndex) {
    if (this.equippedSkills.length >= this.maxSkillSlots) return false; // 槽位已满
    if (inventoryIndex < 0 || inventoryIndex >= this.skillInventory.length) return false;
    if (this.equippedSkills.includes(inventoryIndex)) return false; // 已装备
    this.equippedSkills.push(inventoryIndex);
    this.skillInventory[inventoryIndex].equipped = true;
    return true;
  }

  unequipSkill(inventoryIndex) {
    const pos = this.equippedSkills.indexOf(inventoryIndex);
    if (pos >= 0) {
      this.equippedSkills.splice(pos, 1);
      this.skillInventory[inventoryIndex].equipped = false;
    }
  }

  // 交换技能槽位置
  swapSkillSlots(fromIdx, toIdx) {
    if (fromIdx < 0 || fromIdx >= this.equippedSkills.length) return;
    if (toIdx < 0 || toIdx >= this.maxSkillSlots) return;
    const temp = this.equippedSkills[fromIdx];
    this.equippedSkills[fromIdx] = this.equippedSkills[toIdx];
    this.equippedSkills[toIdx] = temp;
  }

  // 分解武器得矿石
  dismantleWeapon(inventoryIndex) {
    if (inventoryIndex < 0 || inventoryIndex >= this.weaponInventory.length) return null;
    const w = this.weaponInventory[inventoryIndex];
    // 已装备的不能分解
    if (this.equippedWeapon === inventoryIndex) return { error: '已装备的武器不能分解，请先卸下' };

    const yieldData = DISMANTLE_YIELD[w.quality];
    if (!yieldData) return { error: '无法分解' };

    const amount = yieldData.min + Math.floor(Math.random() * (yieldData.max - yieldData.min + 1));
    const oreType = yieldData.type;

    // 给矿石
    this.ores[oreType] = (this.ores[oreType] || 0) + amount;

    // 从背包移除
    this.weaponInventory.splice(inventoryIndex, 1);

    // 如果装备索引在分解的武器之后，需要调整
    if (this.equippedWeapon > inventoryIndex) this.equippedWeapon--;
    else if (this.equippedWeapon === inventoryIndex) this.equippedWeapon = null;

    return {
      oreType: oreType,
      amount: amount,
      oreName: ORES[oreType].name,
      oreEmoji: ORES[oreType].emoji,
      weaponName: w.name || DAOS[w.daoId].weapon,
    };
  }

  // 分解功法得残页
  dismantleSkill(inventoryIndex) {
    if (inventoryIndex < 0 || inventoryIndex >= this.skillInventory.length) return null;
    const s = this.skillInventory[inventoryIndex];
    if (this.equippedSkills.includes(inventoryIndex)) return { error: '已装备的功法不能分解，请先卸下' };

    const yieldData = SKILL_DISMANTLE_YIELD[s.quality];
    if (!yieldData) return { error: '无法分解' };

    const amount = yieldData.min + Math.floor(Math.random() * (yieldData.max - yieldData.min + 1));
    this.skillScrolls += amount;
    const skillName = s.name;

    // 从背包移除，调整装备索引
    this.skillInventory.splice(inventoryIndex, 1);
    this.equippedSkills = this.equippedSkills
      .map(idx => idx > inventoryIndex ? idx - 1 : idx)
      .filter(idx => idx >= 0 && idx < this.skillInventory.length);

    return { amount, skillName };
  }

  // 升级功法
  upgradeSkill(inventoryIndex) {
    if (inventoryIndex < 0 || inventoryIndex >= this.skillInventory.length) return { error: '功法不存在' };
    const s = this.skillInventory[inventoryIndex];
    const curLvl = s.level || 0;
    if (curLvl >= 3) return { error: '已达圆满之境' };

    const nextLvl = SKILL_UPGRADE_LEVELS[curLvl + 1];
    if (this.skillScrolls < nextLvl.scrollCost) return { error: `残页不足 (需 ${nextLvl.scrollCost})` };
    if (this.spiritStones < nextLvl.stoneCost) return { error: `灵石不足 (需 ${nextLvl.stoneCost.toLocaleString()})` };

    this.skillScrolls -= nextLvl.scrollCost;
    this.spiritStones -= nextLvl.stoneCost;
    s.level = (s.level || 0) + 1;

    DataStore.autoSave(this);
    return { success: true, message: `${s.name} 升级 → ${SKILL_UPGRADE_LEVELS[s.level].name}！ATK +${Math.round(nextLvl.atkBonus*100)}%` };
  }

  // -------- 丹药系统 --------

  // 使用丹药
  usePill(pillIndex) {
    if (pillIndex < 0 || pillIndex >= this.pills.length) return { error: '丹药不存在' };
    const pill = this.pills[pillIndex];
    const effect = pill.effect;

    // 检查同类型 buff 是否已激活
    if (this.activePillBuffs[effect] && this.activePillBuffs[effect].active) {
      return { error: '该类型丹药效果已激活，请等待结束后再用' };
    }

    // 应用 buff
    const buff = { active: true, name: pill.name, emoji: pill.emoji };
    if (effect === 'cultivation') {
      buff.remaining = 1800; // 30 分钟 = 1800 秒
    }
    this.activePillBuffs[effect] = buff;

    // 从背包移除
    this.pills.splice(pillIndex, 1);

    DataStore.autoSave(this);
    return { success: true, message: `使用 ${pill.name}！${pill.desc}` };
  }

  // 每帧更新 buff 计时
  tickBuffs(deltaSeconds) {
    const cult = this.activePillBuffs['cultivation'];
    if (cult && cult.active && cult.remaining !== undefined) {
      cult.remaining -= deltaSeconds;
      if (cult.remaining <= 0) {
        cult.active = false;
      }
    }
  }

  // 战斗后消耗一次性 buff
  consumeBattleBuffs() {
    for (const key of ['battle', 'hp', 'crit']) {
      if (this.activePillBuffs[key]) {
        this.activePillBuffs[key].active = false;
      }
    }
  }

  // 是否有任何活跃 buff
  get hasActiveBuffs() {
    return Object.values(this.activePillBuffs).some(b => b && b.active);
  }

  // 获取活跃 buff 列表（UI 用）
  get activeBuffList() {
    return Object.entries(this.activePillBuffs)
      .filter(([_, b]) => b && b.active)
      .map(([key, b]) => ({ key, ...b }));
  }

  // -------- 计算属性 --------
  get realm() {
    return REALMS[this.realmId];
  }

  get nextRealm() {
    if (this.realmId + 1 >= REALMS.length) return null;
    return REALMS[this.realmId + 1];
  }

  // 当前境界进度 0-1
  get realmProgress() {
    const currentNeed = this.realm.needExp;
    const nextNeed = this.nextRealm ? this.nextRealm.needExp : Infinity;
    // 当前境界的起始修为 = 当前境界的 needExp
    const startExp = currentNeed;
    const endExp = nextNeed;
    if (endExp === Infinity) return 1;
    return Math.min(1, Math.max(0, (this.cultivation - startExp) / (endExp - startExp)));
  }

  // 综合攻击力
  get attack() {
    let base = this.realm.atk;
    // 武器加成
    if (this.daoId && this.weaponQuality) {
      const daoBonus = DAOS[this.daoId].statBonus.atk;
      const qualityMult = QUALITIES[this.weaponQuality].multiplier;
      const weaponLevelMult = WEAPON_LEVELS[this.weaponLevel].atkMult;
      base *= daoBonus * qualityMult * weaponLevelMult;
    }
    // 装备的技能加成（含升级等级）
    for (const skill of this.equippedSkillList) {
      const skillData = SKILLS_BY_DAO[skill.daoId]?.find(s => s.id === skill.id);
      if (skillData) {
        const lvlBonus = SKILL_UPGRADE_LEVELS[skill.level || 0].atkBonus;
        base *= (skillData.atkBonus + lvlBonus);
      }
    }
    // 战力丹 buff
    if (this.activePillBuffs['battle']?.active) base *= 1.20;
    return Math.floor(base);
  }

  // 综合血量
  get health() {
    let base = this.realm.hp * 50;
    if (this.daoId && this.weaponQuality) {
      const daoBonus = DAOS[this.daoId].statBonus.hp;
      const qualityMult = QUALITIES[this.weaponQuality].multiplier;
      base *= daoBonus * qualityMult;
    }
    // 护体丹 buff
    if (this.activePillBuffs['hp']?.active) base *= 1.30;
    return Math.floor(base);
  }

  // 暴击率
  get critRate() {
    let rate = 0.10; // 基础 10%
    if (this.daoId === 'sword') rate += DAOS.sword.critBonus;
    if (this.daoId === 'sword' && this.weaponQuality === 'legendary') rate += 0.20;
    // 暴击丹 buff
    if (this.activePillBuffs['crit']?.active) rate += 0.20;
    return Math.min(0.80, rate);
  }

  // 暴击伤害倍率
  get critMultiplier() {
    let mult = 2.0;
    // 功法中可以加暴击伤害
    for (const skill of this.equippedSkillList) {
      const skillData = SKILLS_BY_DAO[skill.daoId]?.find(s => s.id === skill.id);
      if (skillData && skillData.effect && skillData.effect.includes('暴击伤害')) {
        mult += 0.5;
      }
    }
    return mult;
  }

  // 渡劫失败率（综合计算）
  get tribulationFailRate() {
    let rate = this.realm.failRate;
    if (this.daoId === 'body') rate -= DAOS.body.tribulationResist;
    if (this.daoId === 'body' && this.weaponQuality === 'legendary') rate -= 0.30;
    // 功法可减
    for (const skill of this.equippedSkillList) {
      const skillData = SKILLS_BY_DAO[skill.daoId]?.find(s => s.id === skill.id);
      if (skillData && skillData.effect && skillData.effect.includes('渡劫失败率')) {
        rate -= 0.15;
      }
    }
    return Math.max(0, Math.min(1, rate));
  }

  // 修炼速度（每秒）
  get cultivationPerSecond() {
    let rate = BASE_CULTIVATION_PER_SECOND;
    if (this.daoId) rate *= DAOS[this.daoId].cultivationBonus;
    // 品质影响修炼
    if (this.weaponQuality) rate *= QUALITIES[this.weaponQuality].multiplier;
    // 功法影响
    for (const skill of this.equippedSkillList) {
      const skillData = SKILLS_BY_DAO[skill.daoId]?.find(s => s.id === skill.id);
      if (skillData && skillData.effect && skillData.effect.includes('修炼速度')) {
        rate *= 1.15;
      }
    }
    // 修炼丹 buff
    if (this.activePillBuffs['cultivation']?.active) rate *= 1.50;
    return rate;
  }

  // 离线收益倍率
  get offlineMultiplier() {
    let mult = 1.0;
    if (this.daoId === 'soul') mult += DAOS.soul.offlineBonus;
    if (this.daoId === 'soul' && this.weaponQuality === 'legendary') mult += 1.0;
    return mult;
  }

  // 奇遇值（影响战斗掉落率）
  get luck() {
    let base = 1.0;
    if (this.daoId && this.weaponQuality) {
      const daoLuck = DAOS[this.daoId].statBonus.luck;
      const qualityMult = QUALITIES[this.weaponQuality].multiplier;
      base = daoLuck * qualityMult;
    }
    // 运修圣品额外加成
    if (this.daoId === 'luck' && this.weaponQuality === 'legendary') base *= 2.0;
    // 功法中可能有奇遇加成
    for (const skill of this.equippedSkillList) {
      const skillData = SKILLS_BY_DAO[skill.daoId]?.find(s => s.id === skill.id);
      if (skillData && skillData.effect && skillData.effect.includes('奇遇概率')) {
        base *= 1.10;
      }
    }
    return Math.round(base * 10) / 10; // 保留1位小数
  }
}
