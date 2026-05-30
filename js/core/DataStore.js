// DataStore — 存档系统
// 使用 localStorage 持久化

class DataStore {
  static STORAGE_KEY = 'tianming_save_v1';

  // 保存
  static save(state) {
    const data = {
      cultivation: state.cultivation,
      realmId: state.realmId,
      spiritStones: state.spiritStones,
      tianjiTokens: state.tianjiTokens,
      totalDraws: state.totalDraws,
      julingFu: state.julingFu,
      tianjiFragments: state.tianjiFragments,
      // v2 inventory
      weaponInventory: state.weaponInventory,
      skillInventory: state.skillInventory,
      ores: state.ores,
      skillScrolls: state.skillScrolls,
      equippedWeapon: state.equippedWeapon,
      equippedSkills: state.equippedSkills,
      maxSkillSlots: state.maxSkillSlots,
      battleCurrentLayer: state.battleCurrentLayer,
      battleHighestLayer: state.battleHighestLayer,
      lastLoginDate: state.lastLoginDate,
      consecutiveLoginDays: state.consecutiveLoginDays,
      lastOnlineTime: state.lastOnlineTime,
      totalAdsWatched: state.totalAdsWatched,
      totalBattles: state.totalBattles,
      totalCrits: state.totalCrits,
      maxCrit: state.maxCrit,
      totalLegendaryDraws: state.totalLegendaryDraws,
      newbieProtectionActive: state.newbieProtectionActive,
      destinyWeaponDrawn: state.destinyWeaponDrawn,
      destinySkillDrawn: state.destinySkillDrawn,
      // v3 shop & pills
      shopItems: state.shopItems,
      shopDate: state.shopDate,
      shopVersion: state.shopVersion,
      pills: state.pills,
      activePillBuffs: state.activePillBuffs,
      dailyTasks: state.dailyTasks,
      achievements: state.achievements,
      _dailyBattle: state._dailyBattle,
      _dailyDraw: state._dailyDraw,
      _dailyBuy: state._dailyBuy,
      _dailyUpgrade: state._dailyUpgrade,
      _dailyCult: state._dailyCult,
      dailyDate: state.dailyDate,
      // 存档版本号
      version: 2,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(DataStore.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('存档失败:', e);
      return false;
    }
  }

  // 加载
  static load() {
    try {
      const raw = localStorage.getItem(DataStore.STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);

      // 构建 GameState 对象
      const state = new GameState();
      // 只赋值普通字段，跳过 getter 字段
      const assignableKeys = Object.keys(data).filter(k => {
        const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(state), k);
        return !desc || !desc.get;
      });
      for (const key of assignableKeys) { state[key] = data[key]; }
      return state;
    } catch (e) {
      console.error('读档失败:', e);
      return null;
    }
  }

  // 是否存在存档
  static exists() {
    return localStorage.getItem(DataStore.STORAGE_KEY) !== null;
  }

  // 删除存档（重置用）
  static reset() {
    localStorage.removeItem(DataStore.STORAGE_KEY);
  }

  // 自动保存（定时调用）
  static autoSave(state) {
    DataStore.save(state);
  }
}
