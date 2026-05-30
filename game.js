// game.js — 天命 主入口
// 初始化游戏状态、加载存档、启动游戏循环

let state;    // GameState
let ui;       // UIManager
let canvas, ctx;
let lastFrameTime = 0;
let autoSaveTimer = 0;
let lastError = ''; // 最近一次错误

// 全局错误捕获
window.onerror = function(msg, url, lineNo, colNo, error) {
  lastError = `${msg} (行${lineNo})`;
  console.error('💥 游戏错误:', lastError, error);
  return true; // 阻止默认弹窗
};

// -------- 初始化 --------
function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  // 自适应 Canvas 大小
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // 加载存档
  const saved = DataStore.load();
  if (saved) {
    state = saved;
    // v2 迁移：如果新字段不存在则初始化
    if (!state.weaponInventory) state.weaponInventory = [];
    if (!state.skillInventory) state.skillInventory = [];
    if (state.equippedWeapon === undefined) state.equippedWeapon = null;
    if (!state.equippedSkills) state.equippedSkills = [];
    if (!state.maxSkillSlots) state.maxSkillSlots = 4;
    if (!state.ores) state.ores = { iron: 0, steel: 0, crystal: 0, essence: 0 };
    if (state.skillScrolls === undefined) state.skillScrolls = 0;
    TaskSystem.initFields(state);
    TaskSystem.checkDailyReset(state);
    if (!state.shopItems) state.shopItems = [];
    if (!state.shopDate) state.shopDate = '';
    if (!state.pills) state.pills = [];
    if (!state.activePillBuffs) state.activePillBuffs = {};
    // 坊市数据迁移：清空旧格式商品（下次打开自动刷新）
    if (!state.shopVersion || state.shopVersion < 2) {
      state.shopItems = [];
      state.shopDate = '';
      state.shopVersion = 2;
    }
    console.log('存档已加载');
  } else {
    state = new GameState();
    console.log('新游戏开始');
  }

  // 初始化音频 & UI
  AudioSystem.init();
  AudioSystem.startMusic();
  ui = new UIManager(canvas, ctx);

  // 计算离线收益
  const offline = CultivationSystem.applyOffline(state);
  if (offline.seconds > 60) {
    // 离线超过 1 分钟才弹窗
    ui.offlineResult = offline;
    ui.offlineDismissed = false;
  }

  // 签到系统
  handleDailyLogin(state);

  // 鼠标移动（追踪滚动区域）
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleY = canvas.height / rect.height;
    const my = (e.clientY - rect.top) * scaleY;
    ui.handleMouseMove(my);
  });

  // 鼠标滚轮（洞府分区滚动）
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    ui.handleWheel(e.deltaY);
  });

  // 点击事件
  // 首次点击激活音频（浏览器策略要求用户交互）
  let audioStarted = false;
  canvas.addEventListener('click', (e) => {
    if (!audioStarted) { AudioSystem.ensureCtx(); AudioSystem.startMusic(); audioStarted = true; }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    ui.handleClick(mx, my);
  });

  // 触摸事件（手机：点击 + 滚动拖拽）
  let touchMoved = false;
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchMoved = false;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const my = (e.touches[0].clientY - rect.top) * scaleY;
    ui.handleTouchStart(my);
  });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    touchMoved = true;
    const rect = canvas.getBoundingClientRect();
    const scaleY = canvas.height / rect.height;
    const my = (e.touches[0].clientY - rect.top) * scaleY;
    ui.handleTouchMove(my);
  });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!touchMoved) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.changedTouches[0].clientX - rect.left) * scaleX;
      const my = (e.changedTouches[0].clientY - rect.top) * scaleY;
      ui.handleClick(mx, my);
    }
    ui.handleTouchEnd();
  });

  // 启动游戏循环
  lastFrameTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// -------- Canvas 自适应 --------
function resizeCanvas() {
  const container = document.getElementById('gameContainer');
  const w = Math.min(400, window.innerWidth - 10);
  const h = Math.min(700, window.innerHeight - 10);
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
}

// -------- 签到系统 --------
function handleDailyLogin(state) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  if (state.lastLoginDate === today) {
    return; // 今天已领过
  }

  // 送天机令
  state.tianjiTokens += 3;

  // 连续签到
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (state.lastLoginDate === yesterday) {
    state.consecutiveLoginDays++;
  } else {
    state.consecutiveLoginDays = 1;
  }
  state.lastLoginDate = today;

  // 连续签到奖励
  if (state.consecutiveLoginDays === 5) {
    state.julingFu += 1;
    ui.toast('连续登录 5 天！🔮 聚灵符 +1');
  } else if (state.consecutiveLoginDays === 7) {
    state.julingFu += 3;
    ui.toast('连续登录 7 天！🔮 聚灵符 +3');
  } else {
    ui.toast(`签到成功！🎫 天机令 +3（现有 ${state.tianjiTokens} 枚）`);
  }

  DataStore.autoSave(state);
}

// -------- 游戏循环 --------
function gameLoop(timestamp) {
  const deltaMs = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  // 转为秒，限制最大单帧时间（防止切标签页后的大跳帧）
  const deltaSeconds = Math.min(deltaMs / 1000, 0.1);

  // 更新
  ui.update(state, deltaSeconds);
  state.tickBuffs(deltaSeconds);

  // 渲染
  ui.render(state);

  // 自动存档（每 10 秒）
  autoSaveTimer += deltaMs;
  if (autoSaveTimer > 10000) {
    autoSaveTimer = 0;
    DataStore.autoSave(state);
  }

  requestAnimationFrame(gameLoop);
}

// -------- 重置游戏 --------
function resetGame() {
  if (confirm('确定要重置所有数据吗？此操作不可恢复！')) {
    DataStore.reset();
    state = new GameState();
    ui = new UIManager(canvas, ctx);
    alert('游戏已重置');
  }
}

// -------- 启动 --------
window.addEventListener('DOMContentLoaded', init);
