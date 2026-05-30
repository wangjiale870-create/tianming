// TaskSystem — 日常任务 + 成就系统
// 给玩家短期目标，快速获得资源

class TaskSystem {

  // —————— 日常任务定义 ——————
  static DAILY_TASKS = [
    { id: 'battle_3',   name: '征战三次',   icon: '⚔️', desc: '完成 3 场战斗',      check: (s) => (s._dailyBattle||0) >= 3,  reward: '💎 150', rewardFn: (s) => { s.spiritStones += 150; } },
    { id: 'draw_1',     name: '天机一抽',   icon: '🎫', desc: '抽卡 1 次',           check: (s) => (s._dailyDraw||0) >= 1,    reward: '💎 100', rewardFn: (s) => { s.spiritStones += 100; } },
    { id: 'shop_1',     name: '坊市采购',   icon: '🏪', desc: '在坊市购买 1 件物品',  check: (s) => (s._dailyBuy||0) >= 1,     reward: '🎫 +1',  rewardFn: (s) => { s.tianjiTokens += 1; } },
    { id: 'upgrade_1',  name: '精益求精',   icon: '⬆️', desc: '升级武器或功法 1 次', check: (s) => (s._dailyUpgrade||0) >= 1, reward: '📜 +5',  rewardFn: (s) => { s.skillScrolls += 5; } },
    { id: 'cult_1000',  name: '勤修不辍',   icon: '⏳', desc: '修炼获得 1000 修为',   check: (s) => (s._dailyCult||0) >= 1000,  reward: '💎 200', rewardFn: (s) => { s.spiritStones += 200; } },
  ];

  // —————— 成就定义 ——————
  static ACHIEVEMENTS = [
    { id: 'first_blood',    name: '初战告捷', icon: '⚔️', desc: '赢得第 1 场战斗',        check: (s) => s.totalBattles >= 1,                                    reward: '💎 300',        rewardFn: (s) => { s.spiritStones += 300; } },
    { id: 'battle_50',      name: '沙场老将', icon: '⚔️', desc: '累计赢得 50 场战斗',     check: (s) => s.totalBattles >= 50,                                   reward: '💎 1000 🎫 +3', rewardFn: (s) => { s.spiritStones += 1000; s.tianjiTokens += 3; } },
    { id: 'realm_jiandan',  name: '金丹大成', icon: '🏛️', desc: '突破至金丹期',            check: (s) => s.realmId >= 14,                                        reward: '💎 2000 🎫 +5', rewardFn: (s) => { s.spiritStones += 2000; s.tianjiTokens += 5; } },
    { id: 'realm_huashen',  name: '化神天尊', icon: '🏛️', desc: '突破至化神期',            check: (s) => s.realmId >= 22,                                        reward: '💎 10000 🎫 +10', rewardFn: (s) => { s.spiritStones += 10000; s.tianjiTokens += 10; } },
    { id: 'legendary_own',  name: '天命所归', icon: '🔴', desc: '获得一件圣品装备',        check: (s) => s.weaponInventory.some(w => w.quality === 'legendary'), reward: '💎 2000 📜 +20', rewardFn: (s) => { s.spiritStones += 2000; s.skillScrolls += 20; } },
    { id: 'collect_weapon', name: '武器收藏家',icon: '🗡️', desc: '拥有 15 把武器',         check: (s) => s.weaponInventory.length >= 15,                         reward: '💎 800 📜 +10', rewardFn: (s) => { s.spiritStones += 800; s.skillScrolls += 10; } },
    { id: 'collect_skill',  name: '功法大师',  icon: '📜', desc: '拥有 10 本功法',          check: (s) => s.skillInventory.length >= 10,                          reward: '💎 800 🎫 +3',  rewardFn: (s) => { s.spiritStones += 800; s.tianjiTokens += 3; } },
    { id: 'layer_100',      name: '百层战神',  icon: '🏔️', desc: '战场通关 100 层',        check: (s) => s.battleHighestLayer >= 100,                            reward: '💎 3000 🎫 +5', rewardFn: (s) => { s.spiritStones += 3000; s.tianjiTokens += 5; } },
  ];

  // —————— 初始化 ——————
  static initFields(state) {
    if (!state.dailyTasks) state.dailyTasks = {};       // { taskId: 'done' }
    if (!state.achievements) state.achievements = {};    // { achvId: 'claimed' }
    if (state._dailyBattle === undefined) state._dailyBattle = 0;
    if (state._dailyDraw === undefined) state._dailyDraw = 0;
    if (state._dailyBuy === undefined) state._dailyBuy = 0;
    if (state._dailyUpgrade === undefined) state._dailyUpgrade = 0;
    if (state._dailyCult === undefined) state._dailyCult = 0;
    if (!state.dailyDate) state.dailyDate = '';
  }

  // —————— 每日重置 ——————
  static checkDailyReset(state) {
    const today = new Date().toISOString().split('T')[0];
    if (state.dailyDate !== today) {
      state.dailyDate = today;
      state.dailyTasks = {};
      state._dailyBattle = 0;
      state._dailyDraw = 0;
      state._dailyBuy = 0;
      state._dailyUpgrade = 0;
      state._dailyCult = 0;
      DataStore.autoSave(state);
    }
  }

  // —————— 日常计数 ——————
  static onBattle(state) { state._dailyBattle = (state._dailyBattle||0) + 1; DataStore.autoSave(state); }
  static onDraw(state) { state._dailyDraw = (state._dailyDraw||0) + 1; DataStore.autoSave(state); }
  static onBuy(state) { state._dailyBuy = (state._dailyBuy||0) + 1; DataStore.autoSave(state); }
  static onUpgrade(state) { state._dailyUpgrade = (state._dailyUpgrade||0) + 1; DataStore.autoSave(state); }
  static onCultivation(state, amount) { state._dailyCult = (state._dailyCult||0) + Math.floor(amount); DataStore.autoSave(state); }

  // —————— 领取奖励 ——————
  static claimDaily(state, taskId) {
    if (state.dailyTasks[taskId]) return { error: '已领取' };
    const task = TaskSystem.DAILY_TASKS.find(t => t.id === taskId);
    if (!task) return { error: '任务不存在' };
    if (!task.check(state)) return { error: '未完成' };
    task.rewardFn(state);
    state.dailyTasks[taskId] = 'done';
    DataStore.autoSave(state);
    return { success: true, message: `${task.icon} ${task.name} 完成！${task.reward}` };
  }

  static claimAchievement(state, achvId) {
    if (state.achievements[achvId]) return { error: '已领取' };
    const achv = TaskSystem.ACHIEVEMENTS.find(a => a.id === achvId);
    if (!achv) return { error: '成就不存在' };
    if (!achv.check(state)) return { error: '未达成' };
    achv.rewardFn(state);
    state.achievements[achvId] = 'claimed';
    DataStore.autoSave(state);
    return { success: true, message: `🏆 ${achv.icon} ${achv.name}！${achv.reward}` };
  }

  // —————— 获取可领取列表 ——————
  static getClaimableDaily(state) {
    TaskSystem.initFields(state);
    return TaskSystem.DAILY_TASKS.filter(t => !state.dailyTasks[t.id] && t.check(state));
  }

  static getClaimableAchievements(state) {
    TaskSystem.initFields(state);
    return TaskSystem.ACHIEVEMENTS.filter(a => !state.achievements[a.id] && a.check(state));
  }

  // 带进度展示的日常任务列表
  static getDailyProgress(state) {
    TaskSystem.initFields(state);
    return TaskSystem.DAILY_TASKS.map(t => {
      const done = !!state.dailyTasks[t.id];
      const complete = t.check(state);
      return { ...t, done, complete };
    });
  }

  static getAchievementProgress(state) {
    TaskSystem.initFields(state);
    return TaskSystem.ACHIEVEMENTS.map(a => {
      const done = !!state.achievements[a.id];
      const complete = a.check(state);
      return { ...a, done, complete };
    });
  }
}
