// BattleSystem — 万界战场战斗系统
// 自动结算 + 数字动画数据

class BattleSystem {

  // 执行一场战斗
  static fight(state, enemyLayer) {
    const enemy = ENEMIES[enemyLayer - 1]; // enemyLayer 从 1 开始
    if (!enemy) return null;

    // 战斗开始，消耗一次性丹药 buff（战力/护体/暴击）
    state.consumeBattleBuffs();

    const playerAtk = state.attack;
    const playerHP = state.health;
    const playerCritRate = state.critRate;
    const playerCritMult = state.critMultiplier;

    // 战斗日志
    const log = [];
    let enemyHP = enemy.hp;
    let playerCurrentHP = playerHP;
    let turn = 0;
    let maxCrit = 0;
    let critCount = 0;
    let totalDamage = 0;
    const maxTurns = 50; // 防无限循环

    // 战斗循环
    while (enemyHP > 0 && playerCurrentHP > 0 && turn < maxTurns) {
      turn++;

      // 玩家攻击
      let damage = playerAtk;
      let isCrit = false;

      // 暴击判定
      if (Math.random() < playerCritRate) {
        isCrit = true;
        damage = Math.floor(damage * playerCritMult);
        critCount++;
        if (damage > maxCrit) maxCrit = damage;
      }

      // 攻击浮动 ±20%
      damage = Math.floor(damage * (0.8 + Math.random() * 0.4));

      enemyHP -= damage;
      totalDamage += damage;

      log.push({
        turn: turn,
        damage: damage,
        isCrit: isCrit,
        enemyHP: Math.max(0, enemyHP),
        playerHP: playerCurrentHP,
      });

      // 敌人还击
      if (enemyHP > 0) {
        let enemyDamage = Math.floor(enemy.atk * (0.9 + Math.random() * 0.2));
        playerCurrentHP -= enemyDamage;
        log[log.length - 1].enemyDamage = enemyDamage;
      }
    }

    const victory = enemyHP <= 0;
    const totalTurns = turn;

    // 战斗结束统计
    const result = {
      victory: victory,
      enemy: enemy,
      log: log,
      stats: {
        totalDamage: totalDamage,
        maxCrit: maxCrit,
        critCount: critCount,
        turns: totalTurns,
      },
    };

    // 更新玩家统计
    state.totalBattles++;
    state.totalCrits += critCount;
    if (victory) TaskSystem.onBattle(state);
    if (maxCrit > state.maxCrit) state.maxCrit = maxCrit;

    // 胜利处理
    if (victory) {
      BattleSystem.onVictory(state, enemyLayer);
    }

    DataStore.autoSave(state);
    return result;
  }

  // 战斗胜利
  static onVictory(state, clearedLayer) {
    const enemy = ENEMIES[clearedLayer - 1];
    const luck = state.luck || 1.0;

    // 更新最高层
    if (clearedLayer > state.battleHighestLayer) {
      state.battleHighestLayer = clearedLayer;
    }
    // 更新当前层
    if (clearedLayer >= state.battleCurrentLayer) {
      state.battleCurrentLayer = Math.min(clearedLayer + 1, ENEMIES.length);
    }

    // 发放奖励 — 奇遇值加成
    const stoneBonus = Math.floor(enemy.rewards.spiritStones * luck * 0.05);
    state.spiritStones += enemy.rewards.spiritStones + stoneBonus;

    // 天机令碎片掉落率受奇遇值加成
    const baseFragChance = 0.15;
    const luckFragChance = Math.min(0.60, baseFragChance * (1 + luck * 0.3));
    if (enemy.rewards.tianjiFragments > 0 || Math.random() < luckFragChance) {
      const frags = enemy.rewards.tianjiFragments > 0
        ? enemy.rewards.tianjiFragments + (Math.random() < luck * 0.1 ? 1 : 0)
        : 1;
      state.tianjiFragments += frags;
      // 碎片合成
      while (state.tianjiFragments >= TIANJI_FRAGMENTS_PER_TOKEN) {
        state.tianjiFragments -= TIANJI_FRAGMENTS_PER_TOKEN;
        state.tianjiTokens++;
      }
    }

    // 武器 & 功法掉落（受奇遇值 + 层数加成）
    const isBoss = enemy.isBoss;
    const layerBonus = Math.min(1.0, clearedLayer / 300); // 0~1 层数加成

    // 武器掉落
    const baseWepChance = isBoss ? 0.40 : 0.05;
    const wepDropChance = Math.min(0.60, baseWepChance * (1 + luck * 0.15) + layerBonus * 0.1);
    if (Math.random() < wepDropChance) {
      const daoIds = ['sword', 'magic', 'body', 'soul', 'luck'];
      const daoId = daoIds[Math.floor(Math.random() * daoIds.length)];
      const wepQuality = BattleSystem._rollDropQuality(luck, layerBonus);
      const w = {
        id: daoId + '_' + wepQuality + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
        daoId, quality: wepQuality, level: 0, equipped: false,
        name: DAOS[daoId].weapon + '·' + QUALITIES[wepQuality].name,
        desc: '战场掉落',
      };
      state.weaponInventory.push(w);
      if (state.weaponInventory.length === 1 && state.equippedWeapon === null) {
        state.equipWeapon(state.weaponInventory.length - 1);
      }
      state._lastDrop = { type: 'weapon', name: w.name, quality: wepQuality };
    }

    // 功法掉落
    const baseSkillChance = isBoss ? 0.35 : 0.04;
    const skillDropChance = Math.min(0.50, baseSkillChance * (1 + luck * 0.15) + layerBonus * 0.1);
    if (Math.random() < skillDropChance) {
      const daoIds = ['sword', 'magic', 'body', 'soul', 'luck'];
      const daoId = daoIds[Math.floor(Math.random() * daoIds.length)];
      const skillQuality = BattleSystem._rollDropQuality(luck, layerBonus);
      const pool = SKILLS_BY_DAO[daoId].filter(s => s.quality === skillQuality);
      if (pool.length > 0) {
        const skillData = pool[Math.floor(Math.random() * pool.length)];
        const se = {
          id: skillData.id, daoId, quality: skillQuality, level: 0, equipped: false,
          name: skillData.name, desc: skillData.desc, effect: skillData.effect,
        };
        if (!state.skillInventory.find(s => s.id === skillData.id)) {
          state.skillInventory.push(se);
          if (state.equippedSkills.length < state.maxSkillSlots) {
            state.equipSkill(state.skillInventory.length - 1);
          }
          state._lastDrop = { type: 'skill', name: skillData.name, quality: skillQuality };
        }
      }
    }

    // 修炼奖励：通关获得少量修为
    state.cultivation += Math.floor(enemy.hp / 10);
  }

  // 战场掉落品质掷骰
  static _rollDropQuality(luck, layerBonus) {
    const legendaryChance = Math.min(0.15, 0.005 + luck * 0.004 + layerBonus * 0.02);
    const epicChance      = Math.min(0.40, 0.05  + luck * 0.015  + layerBonus * 0.05);
    const rareChance      = Math.min(0.50, 0.15  + luck * 0.01);

    const roll = Math.random();
    if (roll < legendaryChance) return 'legendary';
    if (roll < legendaryChance + epicChance) return 'epic';
    if (roll < legendaryChance + epicChance + rareChance) return 'rare';
    return 'common';
  }

  // 扫荡（已通关层）
  static sweep(state) {
    const sweepStart = 1;
    const sweepEnd = Math.max(0, state.battleHighestLayer - 5); // 扫荡到最高层 -5 层

    if (sweepEnd < sweepStart) {
      return { swept: 0, rewards: { spiritStones: 0, fragments: 0 } };
    }

    let totalStones = 0;
    let totalFragments = 0;

    // 扫荡结算（简化，不逐层战斗）
    for (let layer = sweepStart; layer <= sweepEnd; layer++) {
      const enemy = ENEMIES[layer - 1];
      totalStones += Math.floor(enemy.rewards.spiritStones * 0.5); // 扫荡收益减半
      totalFragments += enemy.isBoss ? 2 : (Math.random() < 0.1 ? 1 : 0);
    }

    state.spiritStones += totalStones;
    state.tianjiFragments += totalFragments;
    while (state.tianjiFragments >= TIANJI_FRAGMENTS_PER_TOKEN) {
      state.tianjiFragments -= TIANJI_FRAGMENTS_PER_TOKEN;
      state.tianjiTokens++;
    }

    DataStore.autoSave(state);

    return {
      swept: sweepEnd - sweepStart + 1,
      rewards: { spiritStones: totalStones, fragments: totalFragments },
    };
  }
}
