// GachaSystem — 抽卡系统
// 天机令管理、奖池、概率、天命保底、聚灵符

class GachaSystem {

  // -------- 奖池 --------
  // 根据品质生成奖池内容
  static generatePoolItem(quality) {
    const daoIds = ['sword', 'magic', 'body', 'soul', 'luck'];
    const randomDao = daoIds[Math.floor(Math.random() * daoIds.length)];

    switch (quality) {
      case 'common':
        // 修为灵石类
        if (Math.random() < 0.5) {
          return { type: 'cultivation', daoId: null, quality: 'common',
                   name: '一缕灵气', amount: 100 + Math.floor(Math.random() * 400),
                   emoji: '⚪', desc: '微薄灵气，聊胜于无' };
        } else {
          return { type: 'stones', daoId: null, quality: 'common',
                   name: '灵石碎片', amount: 50 + Math.floor(Math.random() * 150),
                   emoji: '⚪', desc: '几块碎灵石' };
        }

      case 'rare':
        if (Math.random() < 0.4) {
          return { type: 'cultivation', daoId: null, quality: 'rare',
                   name: '灵泉灌顶', amount: 2000 + Math.floor(Math.random() * 3000),
                   emoji: '🔵', desc: '灵泉涌入体内，修为大涨' };
        } else if (Math.random() < 0.5) {
          return { type: 'weapon', daoId: randomDao, quality: 'rare',
                   name: DAOS[randomDao].weapon + '·灵品', emoji: '🔵', desc: '一件不错的法器' };
        } else {
          // 随机一本 rare 功法
          const skills = SKILLS_BY_DAO[randomDao].filter(s => s.quality === 'rare');
          const skill = skills[Math.floor(Math.random() * skills.length)];
          return { type: 'skill', daoId: randomDao, quality: 'rare',
                   id: skill.id, name: skill.name, emoji: '🔵', desc: skill.desc, effect: skill.effect };
        }

      case 'epic':
        if (Math.random() < 0.3) {
          return { type: 'cultivation', daoId: null, quality: 'epic',
                   name: '天降机缘', amount: 10000 + Math.floor(Math.random() * 20000),
                   emoji: '🟣', desc: '天道垂青，修为暴涨' };
        } else if (Math.random() < 0.5) {
          return { type: 'weapon', daoId: randomDao, quality: 'epic',
                   name: DAOS[randomDao].weapon + '·玄品', emoji: '🟣', desc: '一件稀世法器' };
        } else {
          const skills = SKILLS_BY_DAO[randomDao].filter(s => s.quality === 'epic');
          const skill = skills[Math.floor(Math.random() * skills.length)];
          return { type: 'skill', daoId: randomDao, quality: 'epic',
                   id: skill.id, name: skill.name, emoji: '🟣', desc: skill.desc, effect: skill.effect };
        }

      case 'legendary':
        if (Math.random() < 0.5) {
          return { type: 'weapon', daoId: randomDao, quality: 'legendary',
                   name: DAOS[randomDao].weapon + '·圣品', emoji: '🔴', desc: DAOS[randomDao].saintEffect };
        } else {
          const skills = SKILLS_BY_DAO[randomDao].filter(s => s.quality === 'legendary');
          const skill = skills[0];
          return { type: 'skill', daoId: randomDao, quality: 'legendary',
                   id: skill.id, name: skill.name, emoji: '🔴', desc: skill.desc, effect: skill.effect };
        }

      case 'julingfu':
        return { type: 'julingfu', daoId: null, quality: 'epic',
                 name: '🔮 聚灵符', amount: 1, emoji: '🟣', desc: '使用后，下次看广告得 10 枚天机令' };

      default:
        return GachaSystem.generatePoolItem('common');
    }
  }

  // 获取当前有效概率
  static getProbabilities(state) {
    // 基础概率
    if (state.newbieProtectionActive && state.totalDraws < 50) {
      // 新手保护期动态概率
      const drawsIn = state.totalDraws;
      if (drawsIn < 30) {
        return { common: 0.615, rare: 0.25, epic: 0.10, legendary: 0.005, julingfu: 0.03 };
      } else if (drawsIn < 40) {
        return { common: 0.555, rare: 0.25, epic: 0.12, legendary: 0.02, julingfu: 0.055 };
      } else if (drawsIn < 49) {
        return { common: 0.445, rare: 0.25, epic: 0.15, legendary: 0.05, julingfu: 0.105 };
      } else {
        // 第 50 抽：必出红武或红功法
        const needWeapon = !state.destinyWeaponDrawn;
        const needSkill = !state.destinySkillDrawn;
        if (needWeapon && needSkill) {
          // 随机给一个，另一个下抽出
          return { common: 0, rare: 0, epic: 0, legendary: 1.0, julingfu: 0, legendaryType: Math.random() < 0.5 ? 'weapon' : 'skill' };
        } else if (needWeapon) {
          return { common: 0, rare: 0, epic: 0, legendary: 1.0, julingfu: 0, legendaryType: 'weapon' };
        } else {
          return { common: 0, rare: 0, epic: 0, legendary: 1.0, julingfu: 0, legendaryType: 'skill' };
        }
      }
    } else {
      // 正常概率（50 抽后）
      return { common: 0.615, rare: 0.25, epic: 0.10, legendary: 0.001, julingfu: 0.034 };
    }
  }

  // 执行一次抽卡
  static draw(state) {
    const probs = GachaSystem.getProbabilities(state);

    // 确定品质
    let quality;
    let legendaryType = null; // 'weapon' | 'skill'

    if (probs.legendaryType) {
      quality = 'legendary';
      legendaryType = probs.legendaryType;
    } else {
      const roll = Math.random();
      let cumulative = 0;
      const order = ['legendary', 'epic', 'rare', 'julingfu', 'common'];

      for (const q of order) {
        cumulative += probs[q] || 0;
        if (roll <= cumulative) {
          quality = q;
          break;
        }
      }
      if (!quality) quality = 'common';
    }

    // 聚灵符特殊处理
    if (quality === 'julingfu') {
      state.julingFu++;
      state.totalDraws++;
      GachaSystem.checkDestiny(state);
      DataStore.autoSave(state);
      return { quality: 'julingfu', name: '🔮 聚灵符', emoji: '🟣', desc: '使用后，下次看广告得 10 枚天机令', isJuliungfu: true };
    }

    // 生成物品
    const item = GachaSystem.generatePoolItem(quality);

    // 如果是圣品且指定了类型，修正
    if (quality === 'legendary' && legendaryType) {
      const daoIds = ['sword', 'magic', 'body', 'soul', 'luck'];
      const randomDao = daoIds[Math.floor(Math.random() * daoIds.length)];
      if (legendaryType === 'weapon') {
        item.type = 'weapon';
        item.daoId = randomDao;
        item.name = DAOS[randomDao].weapon + '·圣品';
        item.desc = DAOS[randomDao].saintEffect;
      } else {
        const skills = SKILLS_BY_DAO[randomDao].filter(s => s.quality === 'legendary');
        item.type = 'skill';
        item.daoId = randomDao;
        const skill = skills[0];
        item.id = skill.id;
        item.name = skill.name;
        item.desc = skill.desc;
        item.effect = skill.effect;
      }
    }

    // 应用抽卡结果
    GachaSystem.applyDraw(state, item);

    state.totalDraws++;
    GachaSystem.checkDestiny(state);
    DataStore.autoSave(state);

    return item;
  }

  // 应用抽卡结果到玩家（武器/功法进背包）
  static applyDraw(state, item) {
    switch (item.type) {
      case 'cultivation':
        state.cultivation += item.amount;
        break;
      case 'stones':
        state.spiritStones += item.amount;
        break;
      case 'weapon':
        // 检查是否已有同名同品质武器（用于升级材料）
        const existingWep = state.weaponInventory.find(
          w => w.daoId === item.daoId && w.quality === item.quality
        );
        const weaponEntry = {
          id: item.daoId + '_' + item.quality + '_' + Date.now(),
          daoId: item.daoId,
          quality: item.quality,
          level: 0,
          equipped: false,
          name: item.name,
          desc: item.desc,
        };
        state.weaponInventory.push(weaponEntry);
        // 如果这是第一把武器，自动装备
        if (state.weaponInventory.length === 1 && state.equippedWeapon === null) {
          state.equipWeapon(state.weaponInventory.length - 1);
        }
        break;
      case 'skill':
        // 检查是否已有该技能
        if (!state.skillInventory.find(s => s.id === item.id)) {
          const skillEntry = {
            id: item.id,
            daoId: item.daoId,
            quality: item.quality,
            level: 0,
            equipped: false,
            name: item.name,
            desc: item.desc,
            effect: item.effect,
          };
          state.skillInventory.push(skillEntry);
          // 如果还有空槽位，自动装备
          if (state.equippedSkills.length < state.maxSkillSlots) {
            state.equipSkill(state.skillInventory.length - 1);
          }
        }
        break;
      case 'julingfu':
        state.julingFu++;
        break;
    }
  }

  // 检查天命保底（看背包）
  static checkDestiny(state) {
    if (state.totalDraws >= 50) {
      state.newbieProtectionActive = false;
    }
    // 统计背包中是否有圣品
    if (state.weaponInventory.some(w => w.quality === 'legendary')) state.destinyWeaponDrawn = true;
    if (state.skillInventory.some(s => s.quality === 'legendary')) state.destinySkillDrawn = true;
  }

  // 十连抽
  static drawTen(state) {
    if (state.tianjiTokens < 10) return null;

    state.tianjiTokens -= 10;
    const results = [];

    let hasEpicOrBetter = false;
    for (let i = 0; i < 10; i++) {
      const result = GachaSystem.draw(state);
      results.push(result);

      // 处理天机令消耗（draw 里不消耗，十连时统一消耗）
      // draw 方法内部已经应用了结果和计数
      if (result.quality === 'epic' || result.quality === 'legendary') {
        hasEpicOrBetter = true;
      }
    }

    // 十连保底：至少 1 紫
    if (!hasEpicOrBetter) {
      // 最后一张强制变紫
      const lastResult = results[9];
      const forcedEpic = GachaSystem.generatePoolItem('epic');
      // 回退最后一张的效果，应用紫品
      GachaSystem.revertDraw(state, lastResult);
      GachaSystem.applyDraw(state, forcedEpic);
      results[9] = forcedEpic;
    }

    DataStore.autoSave(state);
    return results;
  }

  // 回退抽卡效果（十连保底用）
  static revertDraw(state, item) {
    switch (item.type) {
      case 'cultivation':
        state.cultivation -= item.amount;
        break;
      case 'stones':
        state.spiritStones -= item.amount;
        break;
      case 'weapon':
        // 移除最后加入的同名武器
        const wepIdx = state.weaponInventory.findLastIndex(w => w.daoId === item.daoId && w.quality === item.quality);
        if (wepIdx >= 0) {
          if (state.equippedWeapon === wepIdx) state.unequipWeapon();
          state.weaponInventory.splice(wepIdx, 1);
        }
        break;
      case 'skill':
        state.skillInventory = state.skillInventory.filter(s => s.id !== item.id);
        break;
    }
  }

  // 聚灵符：看一次广告得 10 天机令
  static useJuliingFu(state) {
    if (state.julingFu <= 0) return null;

    state.julingFu--;
    state.tianjiTokens += 10;
    DataStore.autoSave(state);

    return {
      message: '聚灵符生效！天道之力涌入……',
      gained: 10,
      nowHas: state.tianjiTokens,
    };
  }
}
