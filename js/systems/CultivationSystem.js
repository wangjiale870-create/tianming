// CultivationSystem — 修炼系统
// 离线收益计算、境界突破、渡劫

class CultivationSystem {

  // 计算离线收益
  static calculateOffline(state) {
    const now = Date.now();
    const offlineMs = now - state.lastOnlineTime;
    const offlineSeconds = Math.floor(offlineMs / 1000);

    // 最多累计 24 小时
    const cappedSeconds = Math.min(offlineSeconds, MAX_OFFLINE_SECONDS);
    const rate = state.cultivationPerSecond;
    const offlineMult = state.offlineMultiplier;
    const gained = Math.floor(rate * cappedSeconds * offlineMult);

    return {
      seconds: Math.min(offlineSeconds, MAX_OFFLINE_SECONDS),
      gained: gained,
      rate: rate,
      multiplier: offlineMult,
    };
  }

  // 应用离线收益
  static applyOffline(state) {
    const result = CultivationSystem.calculateOffline(state);
    state.cultivation += result.gained;
    state.lastOnlineTime = Date.now();
    return result;
  }

  // 在线修炼（每帧调用，deltaSeconds 为距上一帧的秒数）
  static tickCultivation(state, deltaSeconds) {
    state.cultivation += state.cultivationPerSecond * deltaSeconds;
  }

  // 检查是否可以突破
  static canBreakthrough(state) {
    if (!state.nextRealm) return false;
    // 修为足够
    if (state.cultivation < state.nextRealm.needExp) return false;
    // 不在渡劫中
    if (state.isTribulating) return false;
    return true;
  }

  // 执行突破 → 可能进入渡劫
  static attemptBreakthrough(state) {
    if (!CultivationSystem.canBreakthrough(state)) {
      return { success: false, reason: '修为不足或条件不满足' };
    }

    const isMajorBreakthrough = state.nextRealm.isMajor || false;
    let result;

    if (isMajorBreakthrough) {
      // 大境界突破 → 进入渡劫
      result = CultivationSystem.startTribulation(state);
    } else {
      // 小境界突破 → 直接成功
      result = CultivationSystem.directBreakthrough(state);
    }

    return result;
  }

  // 直接突破（小境界）
  static directBreakthrough(state) {
    const oldRealm = state.realm.name;
    state.realmId++;
    const newRealm = state.realm.name;

    // 大境界突破送聚灵符
    if (state.realm.isMajor) {
      state.julingFu += 2;
    }

    DataStore.autoSave(state);
    return {
      success: true,
      type: 'direct',
      oldRealm: oldRealm,
      newRealm: newRealm,
      message: `突破成功！${oldRealm} → ${newRealm}`,
      rewards: state.realm.isMajor ? '🔮 聚灵符 ×2' : '',
    };
  }

  // 进入渡劫（大境界）
  static startTribulation(state) {
    state.isTribulating = true;
    state.tribulationFailed = false;
    return {
      success: true,
      type: 'tribulation',
      oldRealm: state.realm.name,
      newRealm: state.nextRealm.name,
      failRate: state.tribulationFailRate,
      message: `天劫降临！正在渡${state.nextRealm.name}天劫……\n失败率：${Math.floor(state.tribulationFailRate * 100)}%`,
    };
  }

  // 渡劫结果判定
  static resolveTribulation(state) {
    if (!state.isTribulating) return null;

    const roll = Math.random();
    const failRate = state.tribulationFailRate;
    const success = roll > failRate;

    if (success) {
      // 渡劫成功
      state.realmId++;
      state.isTribulating = false;
      state.tribulationFailed = false;

      const isMajor = state.realm.isMajor;
      if (isMajor) {
        state.julingFu += 2; // 大境界突破送聚灵符
      }

      DataStore.autoSave(state);
      return {
        result: 'success',
        message: `天劫淬体，${state.realm.name}已成！`,
        roll: roll,
        threshold: failRate,
      };
    } else {
      // 渡劫失败
      state.isTribulating = false;
      state.tribulationFailed = true;

      // 修为回退到当前境界的 50%
      const currentStart = state.realm.needExp;
      const nextStart = state.nextRealm.needExp;
      state.cultivation = currentStart + (nextStart - currentStart) * 0.5;

      DataStore.autoSave(state);
      return {
        result: 'failure',
        message: '天劫劈落……修为大损！',
        roll: roll,
        threshold: failRate,
        // 小概率触发 "破而后立"
        brokenThenStand: Math.random() < 0.15,
      };
    }
  }

  // 看广告复活渡劫
  static reviveTribulation(state) {
    if (!state.tribulationFailed) return null;

    state.realmId++;
    state.tribulationFailed = false;

    // 破而后立：额外送聚灵符
    if (Math.random() < 0.15) {
      state.julingFu += 1;
    }

    DataStore.autoSave(state);
    return {
      message: `置之死地而后生！突破${state.realm.name}！`,
      bonus: state.julingFu > 0 ? '🔮 聚灵符 +1' : '',
    };
  }
}
