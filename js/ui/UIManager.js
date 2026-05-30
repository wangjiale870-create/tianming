// UIManager — 翻新版：精致布局 + 战斗动画
// 卡片式设计、底部导航栏、VS碰撞战斗动画

class UIManager {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.W = canvas.width;
    this.H = canvas.height;

    this.screen = 'main';
    this.buttons = [];

    // 战斗动画
    this.battleAnim = null;      // { phase, timer, ... }
    this.battleResult = null;

    // 抽卡动画
    this.drawAnim = null;        // { timer, results, currentIndex }
    this.drawResults = [];

    // 消息
    this.toastMessage = '';
    this.toastTimer = 0;

    // 离线
    this.offlineResult = null;
    this.offlineDismissed = false;

    // 渡劫
    this.tribulationResult = null;

    // 屏幕震动
    this.shakeX = 0; this.shakeY = 0; this.shakeTimer = 0;

    // 导航栏高度
    this.navH = 52;

    // 滚动状态（分区独立滚动）
    this.scrollZones = {};        // { zoneKey: { offset, max, y, h } }
    this.activeScrollZone = null; // 当前正在滚动的区域 key
    this.isDragging = false;
    this.dragStartY = 0;
    this.dragStartOffset = 0;

    // 坊市滚动持久缓存（防止购买后跳回顶部）
    this._showTaskPopup = false;
    this._shopScroll = 0;
    this._invScroll = 0;
    this._equipScroll = 0;
  }

  // ============ 样式常量 ============
  get colors() { return {
    bg: '#07071a',
    card: '#0f0f2a',
    cardBorder: '#222244',
    gold: '#ffd700',
    text: '#e0e0e0',
    dim: '#777799',
    accent: '#ff6644',
    green: '#44cc66',
    red: '#ff4444',
    blue: '#4499ff',
    purple: '#9944ff',
    navBg: '#0a0a20',
    navActive: '#334488',
  };}

  // 圆角矩形
  roundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  // 卡片
  drawCard(x, y, w, h, title) {
    const ctx = this.ctx;
    this.roundRect(ctx, x, y, w, h, 8, this.colors.card, this.colors.cardBorder);
    if (title) {
      ctx.fillStyle = this.colors.gold;
      ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(title, x + 10, y + 18);
    }
  }

  // 按钮
  addButton(x, y, w, h, text, color, onClick) {
    const ctx = this.ctx;
    const c = this.colors;
    this.roundRect(ctx, x, y, w, h, 6, color, this._lighten(color, 0.3));
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + w / 2, y + h / 2 + 5);
    ctx.textAlign = 'left';
    this.buttons.push({ x, y, w, h, onClick });
  }

  _lighten(hex, amount) {
    if (!hex || hex.length < 7) return '#666688';
    const r = Math.min(255, parseInt(hex.slice(1,3), 16) + 80);
    const g = Math.min(255, parseInt(hex.slice(3,5), 16) + 80);
    const b = Math.min(255, parseInt(hex.slice(5,7), 16) + 80);
    return `rgb(${r},${g},${b})`;
  }

  // ============ 入口 ============
  render(state) {
    try {
    const ctx = this.ctx;
    // 屏幕震动偏移
    if (this.shakeTimer > 0) {
      this.shakeX = (Math.random() - 0.5) * this.shakeTimer * 2;
      this.shakeY = (Math.random() - 0.5) * this.shakeTimer * 2;
      this.shakeTimer--;
    } else { this.shakeX = 0; this.shakeY = 0; }

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(-5, -5, this.W + 10, this.H + 10);

    this.buttons = [];

    const contentH = this.H - this.navH;
    switch (this.screen) {
      case 'main': this.renderMain(state, contentH); break;
      case 'gacha': this.renderGacha(state, contentH); break;
      case 'battle': this.renderBattle(state, contentH); break;
      case 'equipment': this.renderEquipment(state, contentH); break;
      case 'inventory': this.renderInventory(state, contentH); break;
      case 'shop': this.renderShop(state, contentH); break;
    }

    // 底部导航栏
    this.renderNavBar();

    // Toast
    if (this.toastTimer > 0) this.renderToast();

    // 覆盖层
    if (this.offlineResult && !this.offlineDismissed) this.renderOfflinePopup();
    if (state.isTribulating) this.renderTribulationPopup(state);
    if (state.tribulationFailed) this.renderTribulationFailedPopup(state);
    if (this._showTaskPopup) this.renderTaskPopup(state);

    ctx.restore();
    } catch (e) {
      // 渲染出错时，尝试清理 canvas 状态并显示错误
      try { this.ctx.restore(); } catch (_) {}
      this.ctx.fillStyle = '#ff4444';
      this.ctx.font = '11px "Microsoft YaHei", sans-serif';
      this.ctx.fillText('渲染错误: ' + e.message, 10, 30);
      if (window.lastError !== undefined) window.lastError = e.message + ' (行' + (e.lineNumber||'?') + ')';
    }
  }

  // ============ 底部导航栏 ============
  renderNavBar() {
    const ctx = this.ctx;
    const c = this.colors;
    const navY = this.H - this.navH;

    this.roundRect(ctx, 0, navY, this.W, this.navH, 0, c.navBg, '#222244');

    const tabs = [
      { id: 'main', icon: '🏛️', label: '修炼' },
      { id: 'gacha', icon: '🏯', label: '天机阁' },
      { id: 'battle', icon: '⚔️', label: '战场' },
      { id: 'equipment', icon: '🗡️', label: '装备' },
      { id: 'inventory', icon: '🎒', label: '背包' },
      { id: 'shop', icon: '🏪', label: '坊市' },
    ];
    const tabW = this.W / tabs.length;

    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      const tx = i * tabW;
      const isActive = this.screen === t.id;

      if (isActive) {
        ctx.fillStyle = c.navActive;
        ctx.fillRect(tx + 4, navY + 2, tabW - 8, this.navH - 4);
      }

      ctx.fillStyle = isActive ? '#ffffff' : c.dim;
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.icon, tx + tabW / 2, navY + 22);
      ctx.font = '10px "Microsoft YaHei", sans-serif';
      ctx.fillText(t.label, tx + tabW / 2, navY + 38);
      ctx.textAlign = 'left';

      this.buttons.push({ x: tx, y: navY, w: tabW, h: this.navH, onClick: () => this.goTo(t.id) });
    }
  }

  // ============ 主界面 ============
  renderMain(state, contentH) {
    const ctx = this.ctx; const c = this.colors;
    let y = 10;

    // 顶部标题栏
    this.roundRect(ctx, 8, y, this.W - 16, 44, 10, c.card, c.cardBorder);
    ctx.fillStyle = c.gold;
    ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('☯ 天 命 ☯', this.W / 2, y + 18);
    ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = c.dim;
    ctx.fillText(`${state.realm.name} · ${state.currentWeapon ? DAOS[state.currentWeapon.daoId].name : '道途未定'}`, this.W / 2, y + 34);
    ctx.textAlign = 'left';
    // 音量 + 任务
    this.addButton(this.W - 80, y + 8, 32, 24, '📋', '#222244',
      () => { this._showTaskPopup = !this._showTaskPopup; });
    this.addButton(this.W - 42, y + 8, 32, 24, AudioSystem.muted ? '🔇' : '🔊', '#222244',
      () => { AudioSystem.toggleMute(); });
    y += 56;

    // ====== 修行进度条 ======
    const progress = state.realmProgress;
    const nextNeed = state.nextRealm ? state.nextRealm.needExp : state.cultivation;
    const currentStart = state.realm.needExp;
    const currentCult = Math.floor(state.cultivation) - currentStart;
    const needCult = nextNeed - currentStart;

    // 境界名 + 百分比
    ctx.fillStyle = c.gold; ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
    ctx.fillText(`🏛️ ${state.realm.name}`, 14, y + 16);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
    ctx.fillText(`${Math.floor(progress * 100)}%`, this.W - 14, y + 16);
    ctx.textAlign = 'left';
    y += 22;

    // 蓝色进度条
    const bx = 12, pbarW = this.W - 24, pbarH = 24, by = y;
    // 深色轨道
    ctx.fillStyle = '#0d0d1f';
    ctx.strokeStyle = '#2a2a44'; ctx.lineWidth = 1.5;
    this.roundRect(ctx, bx, by, pbarW, pbarH, 12, '#0d0d1f', '#2a2a44');
    // 蓝色填充部分（至少显示 2px）
    const filled = Math.max(2, Math.min(pbarW, progress * pbarW));
    ctx.fillStyle = '#2288ee';
    this.roundRect(ctx, bx + 1, by + 1, filled - 2, pbarH - 2, 11, null, null);
    ctx.fill();
    // 条上数字
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${currentCult.toLocaleString()} / ${needCult.toLocaleString()}`, this.W / 2, by + 16);
    ctx.textAlign = 'left';
    y += 34;

    // 下一境界（与进度条留出间距）
    ctx.fillStyle = c.dim; ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.fillText(`→ ${state.nextRealm ? state.nextRealm.name : '已达巅峰'}  ·  ⏳ ${Math.floor(state.cultivationPerSecond)}/秒`, 14, y);
    y += 26;

    // 装备摘要卡片
    this.drawCard(8, y, this.W - 16, 36, null);
    if (state.currentWeapon) {
      const w = state.currentWeapon; const dao = DAOS[w.daoId]; const q = QUALITIES[w.quality]; const wlvl = WEAPON_LEVELS[w.level||0];
      ctx.fillStyle = q.color;
      ctx.font = '12px "Microsoft YaHei", sans-serif';
      ctx.fillText(`🗡️ ${dao.icon} ${w.name||dao.weapon} ${q.emoji} ${wlvl.name}`, 18, y + 22);
      // 技能小标
      const skillStr = state.equippedSkillList.map(s => QUALITIES[s.quality].emoji + s.name).join(' · ');
      if (skillStr) {
        ctx.fillStyle = c.dim; ctx.font = '10px "Microsoft YaHei", sans-serif';
        ctx.fillText(`📜 ${skillStr}`, 18, y + 34);
      }
    } else {
      ctx.fillStyle = c.dim; ctx.font = '12px "Microsoft YaHei", sans-serif';
      ctx.fillText('❓ 尚未获得武器，去天机阁抽取天命', 18, y + 22);
    }
    y += 44;

    // 角色总数值卡片（3×3 九宫格）
    const statCardH = 92;
    this.drawCard(8, y, this.W - 16, statCardH, null);
    const cols3 = [66, 200, 334]; // 3 列中心 x
    const row1Y = y + 16, row2Y = y + 42, row3Y = y + 70;
    const numFont = 'bold 12px "Microsoft YaHei", sans-serif';
    const lblFont = '9px "Microsoft YaHei", sans-serif';
    const tribRate = state.isTribulating ? state.tribulationFailRate : (state.nextRealm?.failRate || 0);

    // 所有 9 项数据
    const allStats = [
      // 行1
      [{ icon:'⚔️', val:state.attack.toLocaleString(), label:'攻击', color:'#fff' },
       { icon:'❤️', val:state.health.toLocaleString(), label:'血量', color:'#fff' },
       { icon:'💥', val:Math.floor(state.critRate*100)+'%', label:'暴击率', color:c.accent }],
      // 行2
      [{ icon:'💫', val:'×'+state.critMultiplier.toFixed(1), label:'暴击伤害', color:'#ffaa00' },
       { icon:'⏳', val:Math.floor(state.cultivationPerSecond)+'/秒', label:'修炼速度', color:'#44cc66' },
       { icon:'🌙', val:'×'+state.offlineMultiplier.toFixed(1), label:'离线收益', color:'#7799cc' }],
      // 行3
      [{ icon:'⚡', val:Math.floor(tribRate*100)+'%', label:'渡劫失败率', color:tribRate>0.3?'#ff6644':'#ffaa00' },
       { icon:'🍀', val:state.luck.toFixed(1), label:'奇遇值', color:'#44dd88' },
       { icon:'🏔️', val:'第'+state.battleCurrentLayer+'层', label:'万界战场', color:'#cc88ff' }],
    ];

    const rowYs = [row1Y, row2Y, row3Y];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const s = allStats[r][c];
        ctx.fillStyle = s.color; ctx.font = numFont;
        ctx.textAlign = 'center';
        ctx.fillText(`${s.icon} ${s.val}`, cols3[c], rowYs[r]);
        ctx.fillStyle = c.dim; ctx.font = lblFont;
        ctx.fillText(s.label, cols3[c], rowYs[r] + 13);
      }
    }
    ctx.textAlign = 'left';
    y += statCardH + 10;

    // 活跃丹药 buff 指示行
    const activeBuffs = state.activeBuffList;
    if (activeBuffs.length > 0) {
      ctx.font = '11px "Microsoft YaHei", sans-serif';
      let bx = 12;
      for (const b of activeBuffs) {
        const label = b.key === 'cultivation'
          ? `${b.emoji} ${b.name} ${Math.ceil(b.remaining || 0)}s`
          : `${b.emoji} ${b.name}`;
        const labelW = ctx.measureText(label).width + 16;
        this.roundRect(ctx, bx, y, labelW, 18, 4, '#1a1a30', '#336633');
        ctx.fillStyle = '#44cc66';
        ctx.fillText(label, bx + 8, y + 13);
        bx += labelW + 6;
      }
      y += 24;
    }

    // 资源条
    this.drawCard(8, y, this.W - 16, 36, null);
    ctx.fillStyle = '#fff'; ctx.font = '13px "Microsoft YaHei", sans-serif';
    ctx.fillText(`💎 ${state.spiritStones.toLocaleString()}`, 18, y + 19);
    ctx.fillText(`🎫 ${state.tianjiTokens}`, 100, y + 19);
    ctx.fillText(`🔮 ${state.julingFu}`, 182, y + 19);
    ctx.fillText(`📜 ${state.skillScrolls || 0}`, 264, y + 19);
    ctx.fillStyle = c.dim; ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.fillText(`⏳ ${Math.floor(state.cultivationPerSecond)}/秒`, 330, y + 17);
    y += 42;

    // 📋 任务入口（显眼大卡片）
    TaskSystem.checkDailyReset(state);
    const claimCount = TaskSystem.getClaimableDaily(state).length + TaskSystem.getClaimableAchievements(state).length;
    const dailyProgress = TaskSystem.getDailyProgress(state);
    const doneCount = dailyProgress.filter(t => t.done).length;
    const totalCount = dailyProgress.length;

    this.roundRect(ctx, 8, y, this.W - 16, 38, 8, '#151528', claimCount > 0 ? '#ffaa00' : '#333355');
    ctx.fillStyle = claimCount > 0 ? '#ffd700' : '#fff';
    ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
    ctx.fillText(`📋 任务 (${doneCount}/${totalCount})`, 22, y + 18);
    if (claimCount > 0) {
      // 红点 + 可领取数
      ctx.fillStyle = '#ff4444'; ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
      ctx.fillText(`🔴 ${claimCount} 个可领`, 200, y + 18);
    } else if (doneCount === totalCount) {
      ctx.fillStyle = '#44cc66'; ctx.font = '11px "Microsoft YaHei", sans-serif';
      ctx.fillText('✅ 全部完成', 200, y + 18);
    } else {
      ctx.fillStyle = '#999'; ctx.font = '11px "Microsoft YaHei", sans-serif';
      ctx.fillText('进行中...', 200, y + 18);
    }
    this.addButton(this.W - 72, y + 6, 56, 26, '查看', '#334488', () => { this._showTaskPopup = true; });
    y += 44;

    // 快捷操作按钮
    const btnY = y;
    const bw = (this.W - 32) / 2;
    this.addButton(10, btnY, bw - 4, 40, '🏯 天机阁 · 抽卡', '#331166', () => this.goTo('gacha'));
    this.addButton(14 + bw, btnY, bw - 4, 40, '⚔️ 万界战场', '#553311', () => this.goTo('battle'));

    // 突破按钮
    const canBreak = CultivationSystem.canBreakthrough(state);
    const breakText = state.isTribulating ? '⚡ 渡劫中…' : '⬆️ 突破境界';
    this.addButton(10, btnY + 46, this.W - 20, 40, breakText, canBreak ? '#114422' : '#222233', () => this.onBreakthrough(state));

  }

  // ============ 天机阁 ============
  renderGacha(state, contentH) {
    const ctx = this.ctx; const c = this.colors;
    const mx = 10, mw = this.W - 20;
    let y = 12;

    // 标题
    this.drawCard(mx, y, mw, 44, null);
    ctx.fillStyle = c.gold; ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('🏯 天 机 阁', this.W/2, y+32);
    ctx.textAlign = 'left';
    y += 56;

    // 天机令大卡片
    this.drawCard(mx, y, mw, 56, null);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
    ctx.fillText(`🎫 ${state.tianjiTokens}`, mx+20, y+24);
    ctx.fillStyle = c.dim; ctx.font = '13px "Microsoft YaHei", sans-serif';
    ctx.fillText('枚天机令', mx+20, y+44);
    // 聚灵符
    ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
    ctx.fillText(`🔮 聚灵符 ×${state.julingFu}`, this.W - 120, y+24);
    ctx.fillStyle = c.dim; ctx.font = '10px "Microsoft YaHei", sans-serif';
    ctx.fillText('看广告得 10 天机令', this.W - 120, y+42);
    y += 68;

    // 奖池概率
    const probs = GachaSystem.getProbabilities(state);
    this.drawCard(mx, y, mw, state.newbieProtectionActive ? 46 : 28, null);
    ctx.fillStyle = c.dim; ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.fillText(`奖池概率`, mx+14, y+16);
    ctx.fillText(`🔴圣品 ${(probs.legendary*100).toFixed(1)}%`, mx+100, y+16);
    ctx.fillText(`🟣玄品 ${(probs.epic*100).toFixed(0)}%`, mx+190, y+16);
    ctx.fillText(`🔵灵品 ${(probs.rare*100).toFixed(0)}%`, mx+280, y+16);
    if (state.newbieProtectionActive) {
      ctx.fillStyle = '#ffaa00'; ctx.font = '11px "Microsoft YaHei", sans-serif';
      const remaining = 50 - state.totalDraws;
      ctx.fillText(`🌟 天命保护中：${remaining} 抽内必出圣品！`, mx+14, y+36);
    }
    y += state.newbieProtectionActive ? 54 : 34;

    // 操作按钮区 — 大间距
    y += 10;
    const bw = (this.W - 50) / 3;
    const bh = 60;

    // 牌桌式布局：三张"牌"
    // 牌1：看广告
    this.drawCard(mx, y, bw, bh, null);
    ctx.fillStyle = '#4499ff'; ctx.font = '28px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('📺', mx+bw/2, y+30);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
    ctx.fillText('+1 天机令', mx+bw/2, y+50);
    ctx.textAlign = 'left';
    this.buttons.push({ x: mx, y: y, w: bw, h: bh, onClick: () => this.onWatchAdForToken(state) });

    // 牌2：聚灵符
    const jlfX = mx + bw + 8;
    const hasJl = state.julingFu > 0;
    this.drawCard(jlfX, y, bw, bh, null);
    ctx.fillStyle = hasJl ? '#ff8800' : '#555'; ctx.font = '28px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🔮', jlfX+bw/2, y+30);
    ctx.fillStyle = hasJl ? '#fff' : '#888'; ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
    ctx.fillText(hasJl ? '聚灵符 +10' : '无符', jlfX+bw/2, y+50);
    ctx.textAlign = 'left';
    this.buttons.push({ x: jlfX, y: y, w: bw, h: bh, onClick: () => this.onUseJuliingFu(state) });

    // 牌3：十连抽
    const tenX = jlfX + bw + 8;
    const canTen = state.tianjiTokens >= 10;
    this.drawCard(tenX, y, bw, bh, null);
    ctx.fillStyle = canTen ? '#cc44cc' : '#555'; ctx.font = '28px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('✨', tenX+bw/2, y+30);
    ctx.fillStyle = canTen ? '#fff' : '#888'; ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
    ctx.fillText('十连抽', tenX+bw/2, y+50);
    ctx.textAlign = 'left';
    this.buttons.push({ x: tenX, y: y, w: bw, h: bh, onClick: () => this.onTenDraw(state) });
    y += bh + 12;

    // 单抽大按钮
    const canSingle = state.tianjiTokens >= 1;
    this.addButton(mx, y, mw, 48,
      `🎫 单 抽 · 消耗 1 枚天机令${canSingle ? '' : '（不足）'}`,
      canSingle ? '#442266' : '#222233', () => this.onSingleDraw(state));
    TaskSystem.onDraw(state);
    y += 62;

    // 最近抽卡记录
    if (this.drawResults.length > 0) {
      this.drawCard(mx, y, mw, 28, null);
      ctx.fillStyle = c.gold; ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
      ctx.fillText('📋 最近抽卡记录', mx+14, y+20);
      y += 36;

      const show = this.drawResults.slice(-8);
      for (const r of show) {
        const q = QUALITIES[r.quality] || { color: '#aaa', emoji: '⚪' };
        this.roundRect(ctx, mx, y, mw, 22, 4, '#0c0c1e', '#222244');
        ctx.fillStyle = q.color; ctx.font = '12px "Microsoft YaHei", sans-serif';
        ctx.fillText(`${q.emoji} ${r.name || r.desc || ''}`, mx+12, y+15);
        y += 24;
      }
    }
  }

  // ============ 万界战场（可视化战斗） ============
  renderBattle(state, contentH) {
    const ctx = this.ctx; const c = this.colors;

    if (this.battleAnim) {
      this.renderBattleAnimation(state, contentH);
      return;
    }

    let y = 10;
    this.drawCard(8, y, this.W - 16, 38, null);
    ctx.fillStyle = c.accent; ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('⚔️ 万 界 战 场', this.W/2, y+26);
    ctx.textAlign = 'left';
    y += 46;

    // VS 预览
    const enemy = ENEMIES[state.battleCurrentLayer - 1];
    this.drawCard(8, y, this.W - 16, 100, null);

    // 我方
    ctx.fillStyle = '#44aaff'; ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
    ctx.fillText('⚔️ 你', 20, y + 22);
    ctx.fillStyle = '#fff'; ctx.font = '12px "Microsoft YaHei", sans-serif';
    const daoName = state.currentWeapon ? DAOS[state.currentWeapon.daoId].name : '散修';
    ctx.fillText(`${state.realm.name} · ${daoName}`, 20, y + 40);
    ctx.fillStyle = c.accent;
    ctx.fillText(`攻击 ${state.attack.toLocaleString()}  |  暴击 ${Math.floor(state.critRate*100)}%`, 20, y + 56);

    // VS
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('⚡VS⚡', this.W/2, y + 42);
    ctx.textAlign = 'left';

    // 敌方
    ctx.fillStyle = '#ff6644'; ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('🐉 ' + enemy.name, this.W - 20, y + 22);
    ctx.fillStyle = '#fff'; ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.fillText(`第${state.battleCurrentLayer}层${enemy.isBoss?' 👑BOSS':''}`, this.W - 20, y + 40);
    ctx.fillStyle = c.accent;
    ctx.fillText(`生命 ${enemy.hp.toLocaleString()}  |  攻击 ${enemy.atk.toLocaleString()}`, this.W - 20, y + 56);
    ctx.textAlign = 'left';

    // 奖励预览
    ctx.fillStyle = c.dim; ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.fillText(`🎁 掉落：💎${enemy.rewards.spiritStones} ${enemy.rewards.tianjiFragments > 0 ? '🎫碎片+' + enemy.rewards.tianjiFragments : ''}`, 20, y + 80);
    y += 110;

    // 战斗结果
    if (this.battleResult) {
      this.renderBattleResult(ctx, y, this.battleResult);
      y += 130;
    }

    // 按钮
    const bw2 = (this.W - 28) / 2;
    this.addButton(8, contentH - 50, bw2, 40, '⚔️ 挑战！', '#662211', () => this.startBattleAnim(state));
    this.addButton(12 + bw2, contentH - 50, bw2, 40, '🔁 扫荡', state.battleHighestLayer >= 5 ? '#224422' : '#222233', () => this.onSweep(state));
  }

  // ============ 战斗动画 ============
  startBattleAnim(state) {
    const enemy = ENEMIES[state.battleCurrentLayer - 1];
    // 先执行实际战斗结算
    const result = BattleSystem.fight(state, state.battleCurrentLayer);
    this.battleResult = result;

    // 启动动画
    this.battleAnim = {
      phase: 'charge',     // charge → clash → numbers → done
      timer: 0,
      result: result,
      playerName: state.realm.name,
      enemyName: enemy.name,
      playerAtk: state.attack,
      enemyHP: enemy.hp,
      showLog: result.log,
      logIndex: 0,
      logTimer: 0,
      currentNumber: null,
      numberY: 0,
    };
  }

  renderBattleAnimation(state, contentH) {
    const ctx = this.ctx; const c = this.colors;
    const anim = this.battleAnim;
    if (!anim) return;

    anim.timer++;

    const cx = this.W / 2, cy = contentH / 2;
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, this.W, contentH);

    // 底部按钮区先不画
    let done = false;

    switch (anim.phase) {
      case 'charge': {
        // 双方名字从两侧飞入
        const t = anim.timer;
        const playerX = -100 + Math.min(t * 12, cx - 60);
        const enemyX = this.W + 100 - Math.min(t * 12, cx - 40);

        ctx.fillStyle = '#44aaff'; ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`⚔️ ${anim.playerName}`, playerX, cy - 10);

        ctx.fillStyle = '#ff6644'; ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
        ctx.fillText(`🐉 ${anim.enemyName}`, enemyX, cy + 30);

        ctx.textAlign = 'left';

        if (t > 40) {
          anim.phase = 'clash';
          anim.timer = 0;
          AudioSystem.playBattleHit();
          // 碰撞闪光
          this.shakeTimer = 8;
        }
        break;
      }

      case 'clash': {
        // 碰撞发光
        const t = anim.timer;
        const flashAlpha = Math.max(0, 1 - t / 20);

        ctx.fillStyle = '#44aaff'; ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`⚔️ ${anim.playerName}`, cx - 70, cy - 15);

        ctx.fillStyle = '#ff6644'; ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
        ctx.fillText(`🐉 ${anim.enemyName}`, cx + 70, cy - 15);

        // 碰撞中心
        ctx.fillStyle = `rgba(255,200,50,${flashAlpha})`;
        ctx.font = 'bold 36px "Microsoft YaHei", sans-serif';
        ctx.fillText('💥', cx, cy + 20);

        ctx.textAlign = 'left';

        if (t > 18) {
          anim.phase = 'numbers';
          anim.timer = 0;
          anim.logIndex = 0;
          anim.logTimer = 0;
        }
        break;
      }

      case 'numbers': {
        // 显示战斗数字：一回合一行，带动画
        const t = anim.timer;
        const log = anim.showLog;

        // 双方名字小标
        ctx.fillStyle = '#44aaff'; ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center'; ctx.fillText(`⚔️ ${anim.playerName}`, cx - 70, cy - 80);
        ctx.fillStyle = '#ff6644'; ctx.fillText(`🐉 ${anim.enemyName}`, cx + 70, cy - 80);
        ctx.textAlign = 'left';

        let numY = cy - 50;
        const shown = Math.min(log.length, anim.logIndex + 1);

        for (let i = 0; i < shown; i++) {
          const entry = log[i];
          const isLast = (i === anim.logIndex);
          const alpha = isLast ? Math.min(1, (anim.logTimer) / 15) : 1;

          let ly = numY + i * 22;

          if (entry.isCrit) {
            // 暴击大数字
            ctx.fillStyle = `rgba(255,68,68,${alpha})`;
            const scale = isLast ? 1.3 : 1.0;
            ctx.font = `bold ${Math.floor(14*scale)}px "Microsoft YaHei", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(`🔥 ${entry.damage.toLocaleString()}`, cx, ly);
            ctx.textAlign = 'left';

            if (isLast) {
              this.shakeTimer = Math.max(this.shakeTimer, 3);
            }
          } else {
            ctx.fillStyle = `rgba(200,200,200,${alpha})`;
            ctx.font = '13px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${entry.damage.toLocaleString()}`, cx, ly);
            ctx.textAlign = 'left';
          }
        }

        // 有韵律的战斗节奏：24帧/回合（2.5拍/秒 ≈ 150BPM）
        anim.logTimer++;
        if (anim.logTimer >= 24 && anim.logIndex < log.length - 1) {
          anim.logIndex++;
          anim.logTimer = 0;
          const entry = log[anim.logIndex];
          if (entry.isCrit) AudioSystem.playCrit();
          else AudioSystem.playBattleHit();
        }

        if (anim.logIndex >= log.length - 1 && anim.logTimer >= 30) {
          anim.phase = 'result';
          anim.timer = 0;
          if (anim.result.victory) AudioSystem.playVictory();
          else AudioSystem.playDefeat();
        }
        break;
      }

      case 'result': {
        // 结算
        const r = anim.result;
        const drop = state._lastDrop;
        const cardH = (r.victory && drop) ? 150 : 130;
        const rx = 20, ry = cy - 50;
        this.drawCard(rx, ry, this.W - 40, cardH, null);

        ctx.fillStyle = r.victory ? c.green : c.red;
        ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(r.victory ? '🏆 胜 利！' : '💀 败 北……', this.W/2, ry + 30);
        ctx.textAlign = 'left';

        ctx.fillStyle = '#fff'; ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
        ctx.fillText(`总伤害 ${r.stats.totalDamage.toLocaleString()}`, rx + 14, ry + 56);
        if (r.stats.maxCrit > 0) {
          ctx.fillStyle = c.red; ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
          ctx.fillText(`🔥 最高暴击 ${r.stats.maxCrit.toLocaleString()}`, rx + 14, ry + 78);
        }
        ctx.fillStyle = c.dim; ctx.font = '12px "Microsoft YaHei", sans-serif';
        ctx.fillText(`暴击 ${r.stats.critCount}次 · ${r.stats.turns}回合`, rx + 14, ry + 98);

        if (r.victory) {
          ctx.fillStyle = c.gold;
          ctx.fillText(`🎁 💎+${r.enemy.rewards.spiritStones}`, rx + 14, ry + 114);
          if (drop) {
            const q = QUALITIES[drop.quality] || { color: '#fff', emoji: '' };
            ctx.fillStyle = q.color; ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
            ctx.fillText(`📦 ${q.emoji} ${drop.name}`, rx + 14, ry + 134);
            state._lastDrop = null; // 显示一次后清除
          }
        }

        // 继续按钮
        this.addButton(this.W/2 - 40, ry + 110, 80, 30, '确定', '#334488', () => {
          if (r.victory && state._lastDrop) AudioSystem.playDrop();
          this.battleAnim = null;
        });
        break;
      }
    }
  }

  // ============ 战斗结算（旧的静态版，在动画完成后用） ============
  renderBattleResult(ctx, startY, result) {
    let y = startY;
    const c = this.colors;

    // 简单文字版结算，当动画未激活时显示
    ctx.strokeStyle = '#444466';
    ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(this.W - 10, y); ctx.stroke();
    y += 8;

    ctx.fillStyle = result.victory ? c.green : c.red;
    ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
    ctx.fillText(result.victory ? '🏆 胜利！' : '💀 失败……', 18, y);
    y += 20;

    ctx.fillStyle = '#fff'; ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.fillText(`总伤害 ${result.stats.totalDamage.toLocaleString()}  |  暴击 ${result.stats.critCount}次`, 18, y);
    y += 16;

    if (result.stats.maxCrit > 0) {
      ctx.fillStyle = c.red; ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
      ctx.fillText(`🔥 最高暴击 ${result.stats.maxCrit.toLocaleString()}`, 18, y);
      y += 20;
    }

    ctx.fillStyle = c.dim; ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.fillText(`${result.stats.turns}回合结束`, 18, y);
  }

  // ============ 装备栏（带滚动）============
  renderEquipment(state, contentH) {
    const ctx = this.ctx; const c = this.colors;
    const mx = 10, mw = this.W - 20;

    // === 固定标题 ===
    let hy = 8;
    this.drawCard(mx, hy, mw, 40, null);
    ctx.fillStyle = c.gold; ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('🗡️ 装 备 栏', this.W / 2, hy + 28);
    ctx.textAlign = 'left';
    hy += 46;
    const scrollStartY = hy;
    const visibleH = contentH - scrollStartY;

    // === 计算总内容高度 ===
    const wep = state.currentWeapon;
    const eqSkills = state.equippedSkillList;
    const SKILL_SLOT_H = 46;  // 技能槽卡片 + 间距
    const SKILL_UPG_H = 46;   // 功法升级卡片 + 间距

    let totalH = 0;
    // 武器区：标题行(30) + 武器卡 + 间距(12)
    totalH += 30 + (wep ? 94 + 12 : 80);
    // 技能区：间距(10) + 标题行(30) + 4槽 + 间距(14)
    totalH += 10 + 30 + 4 * SKILL_SLOT_H + 14;
    // 武器升级区
    totalH += wep ? ((wep.level || 0) < 3 ? 28 + 80 : 28 + 24) : 0;
    // 功法升级区：间距(12) + 标题(28) + N*卡片
    if (eqSkills.length > 0) {
      totalH += 12 + 28 + eqSkills.length * SKILL_UPG_H;
    }

    const maxScroll = Math.max(0, totalH - visibleH);
    const equipOffset = this._equipScroll || 0;
    const offset = Math.min(equipOffset, maxScroll);

    // === 裁剪 + 滚动 ===
    ctx.save();
    ctx.beginPath(); ctx.rect(0, scrollStartY, this.W, visibleH); ctx.clip();
    ctx.translate(0, -offset);

    let y = scrollStartY;

    // ====== 武器槽 ======
    this.drawCard(mx, y, mw, 22, '🗡️ 武器');
    y += 30;

    const wepCardH = 94;
    this.roundRect(ctx, mx + 4, y, mw - 8, wepCardH, 8, wep ? '#151530' : '#0a0a18', wep ? '#444488' : '#333355');
    if (wep) {
      const q = QUALITIES[wep.quality]; const dao = DAOS[wep.daoId]; const wlvl = WEAPON_LEVELS[wep.level || 0];

      ctx.font = '26px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(q.emoji, mx + 34, y + wepCardH / 2 + 8);
      ctx.textAlign = 'left';

      const lx = mx + 62;
      ctx.fillStyle = q.color; ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
      ctx.fillText(`${dao.icon} ${wep.name || dao.weapon}`, lx, y + 24);
      ctx.fillStyle = q.color; ctx.font = '12px "Microsoft YaHei", sans-serif';
      ctx.fillText(`${q.name} · ${wlvl.name} · ATK×${q.multiplier}`, lx, y + 42);

      const atkPct = Math.round((dao.statBonus.atk - 1) * 100);
      const hpPct = Math.round((dao.statBonus.hp - 1) * 100);
      ctx.fillStyle = '#ccc'; ctx.font = '11px "Microsoft YaHei", sans-serif';
      ctx.fillText(`道途 ATK ${atkPct >= 0 ? '+' : ''}${atkPct}%  ·  HP ${hpPct >= 0 ? '+' : ''}${hpPct}%`, lx, y + 58);

      ctx.fillStyle = '#999'; ctx.font = '10px "Microsoft YaHei", sans-serif';
      let trait = '';
      if (dao.critBonus) trait = `暴击率 +${Math.round(dao.critBonus * 100)}%`;
      else if (dao.skillBonus) trait = `技能伤害 +${Math.round(dao.skillBonus * 100)}%`;
      else if (dao.tribulationResist) trait = `渡劫抵抗 +${Math.round(dao.tribulationResist * 100)}%`;
      else if (dao.cultivationBonus !== 1) trait = `修炼速度 ×${dao.cultivationBonus}`;
      else if (dao.offlineBonus) trait = `离线收益 +${Math.round(dao.offlineBonus * 100)}%`;
      else if (dao.luckBonus) trait = `奇遇概率 +${Math.round(dao.luckBonus * 100)}%`;
      if (trait) ctx.fillText(trait, lx, y + 72);

      if (q.id === 'legendary') {
        ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 10px "Microsoft YaHei", sans-serif';
        ctx.fillText(`🌟 ${dao.saintEffect}`, lx, y + 88);
      }
    } else {
      ctx.fillStyle = '#555'; ctx.font = '15px "Microsoft YaHei", sans-serif';
      ctx.fillText('武器槽空置', mx + 24, y + 36);
      ctx.fillStyle = '#666'; ctx.font = '11px "Microsoft YaHei", sans-serif';
      ctx.fillText('前往天机阁抽取天命获得武器', mx + 24, y + 58);
    }
    y += wepCardH + 12;

    // ====== 技能槽 ======
    y += 14;
    this.drawCard(mx, y, mw, 22, `📜 技能 · ${state.equippedSkills.length}/${state.maxSkillSlots}`);
    y += 30;

    for (let i = 0; i < state.maxSkillSlots; i++) {
      const skillIdx = i < state.equippedSkills.length ? state.equippedSkills[i] : -1;
      const skill = skillIdx >= 0 ? state.skillInventory[skillIdx] : null;
      this.roundRect(ctx, mx + 4, y, mw - 8, 42, 6, skill ? '#0f0f28' : '#080818', skill ? '#333366' : '#222244');
      ctx.fillStyle = skill ? '#6688aa' : '#444466'; ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
      ctx.fillText(`[${i + 1}]`, mx + 14, y + 28);
      if (skill) {
        const q = QUALITIES[skill.quality]; const dao = DAOS[skill.daoId];
        ctx.font = '20px sans-serif'; ctx.fillText(q.emoji, mx + 46, y + 28);
        ctx.fillStyle = q.color; ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
        ctx.fillText(`${dao.icon} ${skill.name}`, mx + 72, y + 20);
        ctx.fillStyle = '#aaa'; ctx.font = '11px "Microsoft YaHei", sans-serif';
        ctx.fillText(skill.effect || skill.desc || '', mx + 72, y + 38);
        this.addButton(this.W - 70, y + 8, 50, 24, '卸下', '#553333', () => { state.unequipSkill(skillIdx); DataStore.autoSave(state); });
      } else {
        ctx.fillStyle = '#444466'; ctx.font = '14px "Microsoft YaHei", sans-serif';
        ctx.fillText('—  空 槽 位  —', mx + 46, y + 28);
      }
      y += 46;
    }
    y += 14;

    // ====== 武器升级 ======
    if (wep) {
      this.drawCard(mx, y, mw, 22, '⬆️ 武器升级');
      y += 28;
      const lvl = wep.level || 0;
      if (lvl < 3) {
        const curLvl = WEAPON_LEVELS[lvl];
        const nextLvl = WEAPON_LEVELS[lvl + 1];
        const haveStones = state.spiritStones >= nextLvl.stoneCost;
        const haveOre = (state.ores[nextLvl.oreType] || 0) >= nextLvl.oreCost;
        const canUp = haveStones && haveOre;
        const oi = ORES[nextLvl.oreType];

        this.roundRect(ctx, mx + 4, y, mw - 8, 74, 6, '#0f0f22', '#333355');
        ctx.fillStyle = '#fff'; ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
        ctx.fillText(`${curLvl.name} → ${nextLvl.name}`, mx + 14, y + 22);
        ctx.fillStyle = c.gold; ctx.font = '12px "Microsoft YaHei", sans-serif';
        ctx.fillText(`ATK ×${nextLvl.atkMult}`, mx + 14, y + 40);
        ctx.fillStyle = haveStones ? c.green : c.red; ctx.font = '13px "Microsoft YaHei", sans-serif';
        ctx.fillText(`💎${nextLvl.stoneCost.toLocaleString()}`, mx + 170, y + 22);
        ctx.fillStyle = haveOre ? c.green : c.red;
        ctx.fillText(`${oi.emoji}${oi.name} ${state.ores[nextLvl.oreType] || 0}/${nextLvl.oreCost}`, mx + 170, y + 40);
        this.addButton(mx + 14, y + 50, mw - 28, 28,
          canUp ? '⬆️ 升 级' : '材料不足', canUp ? '#1a552a' : '#222233', () => this.onUpgradeWeapon(state));
        y += 80;
      } else {
        ctx.fillStyle = c.green; ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
        ctx.fillText('✅ 武器已满级 — 圆满之境', mx + 14, y + 18);
        y += 24;
      }
    }

    // ====== 功法升级 ======
    if (eqSkills.length > 0) {
      y += 12;
      this.drawCard(mx, y, mw, 22, `📜 功法升级  📜${state.skillScrolls} 残页`);
      y += 28;

      for (let i = 0; i < eqSkills.length; i++) {
        const s = eqSkills[i];
        const lvl = s.level || 0;
        const curLvl = SKILL_UPGRADE_LEVELS[lvl];
        const q = QUALITIES[s.quality];
        const dao = DAOS[s.daoId];

        this.roundRect(ctx, mx, y, mw, 40, 5, '#101028', '#2a2a44');
        ctx.font = '16px sans-serif';
        ctx.fillText(q.emoji, mx + 12, y + 24);
        ctx.fillStyle = q.color; ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
        ctx.fillText(`${dao.icon} ${s.name}`, mx + 38, y + 16);
        ctx.fillStyle = '#aaa'; ctx.font = '10px "Microsoft YaHei", sans-serif';
        ctx.fillText(`${curLvl.name} · ${s.effect || ''}`, mx + 38, y + 32);

        if (lvl < 3) {
          const next = SKILL_UPGRADE_LEVELS[lvl + 1];
          const canUp = state.skillScrolls >= next.scrollCost && state.spiritStones >= next.stoneCost;
          ctx.fillStyle = canUp ? '#44cc66' : '#ff6644'; ctx.font = '10px "Microsoft YaHei", sans-serif';
          ctx.fillText(`📜${next.scrollCost} 💎${next.stoneCost.toLocaleString()}`, this.W - 168, y + 16);
          const skillInvIdx = state.skillInventory.indexOf(s);
          this.addButton(this.W - 80, y + 8, 60, 22,
            canUp ? '升级' : '不足',
            canUp ? '#1a552a' : '#222233', () => {
              if (skillInvIdx >= 0) {
                const r = state.upgradeSkill(skillInvIdx);
                if (r.error) this.toast(r.error);
                else this.toast(r.message);
              }
            });
        } else {
          ctx.fillStyle = '#44cc66'; ctx.font = 'bold 10px "Microsoft YaHei", sans-serif';
          ctx.fillText('✅ 圆满', this.W - 80, y + 22);
        }
        y += 46;
      }
    }

    ctx.restore();

    // === 滚动条 ===
    if (maxScroll > 0) {
      const barW = 3, barX = this.W - 8;
      ctx.fillStyle = 'rgba(20,20,40,0.6)';
      ctx.fillRect(barX, scrollStartY, barW, visibleH);
      const thumbH = Math.max(20, visibleH * visibleH / (visibleH + maxScroll));
      const thumbY = scrollStartY + (offset / maxScroll) * (visibleH - thumbH);
      ctx.fillStyle = 'rgba(140,140,200,0.7)';
      this.roundRect(ctx, barX, thumbY, barW, thumbH, 2, null, null);
      ctx.fill();
    }

    // 持久缓存
    this._equipScroll = offset;
    this.scrollZones = { equipment: { screenY: scrollStartY, h: visibleH, offset, max: maxScroll } };
  }

  // ============ 背包（统一滚动，武器库 + 功法库 + 丹药）============
  renderInventory(state, contentH) {
    const ctx = this.ctx; const c = this.colors;
    const mx = 10, mw = this.W - 20;
    const WEP_ITEM_H = 44, SKILL_ITEM_H = 38, PILL_ITEM_H = 32;
    const btnW = 56;

    // === 固定标题 ===
    let ty = 8;
    this.drawCard(mx, ty, mw, 36, null);
    ctx.fillStyle = c.gold; ctx.font = 'bold 19px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('🎒 背 包', this.W / 2, ty + 26);
    ctx.textAlign = 'left';
    ty += 42;
    const scrollStartY = ty;
    const visibleH = contentH - scrollStartY;

    // === 计算内容总高度 ===
    const wepCount = state.weaponInventory.length;
    const skillCount = state.skillInventory.length;
    const pillCount = (state.pills || []).length;

    let totalH = 0;
    // 矿石区
    totalH += 40;
    // 武器库
    totalH += 26 + (wepCount > 0 ? wepCount * WEP_ITEM_H + 8 : 20);
    // 功法库
    totalH += 26 + (skillCount > 0 ? skillCount * SKILL_ITEM_H + 8 : 20);
    // 丹药区
    totalH += pillCount > 0 ? 24 + pillCount * PILL_ITEM_H : 0;

    const maxScroll = Math.max(0, totalH - visibleH);
    const offset = Math.min(this._invScroll, maxScroll);

    // === 裁剪 + 滚动 ===
    ctx.save();
    ctx.beginPath(); ctx.rect(0, scrollStartY, this.W, visibleH); ctx.clip();
    ctx.translate(0, -offset);

    let sy = scrollStartY;

    // --- 矿石资源 ---
    this.drawCard(mx, sy, mw, 32, null);
    const oreTypes = ['iron', 'steel', 'crystal', 'essence'];
    const oreW = mw / 4;
    for (let i = 0; i < oreTypes.length; i++) {
      const ot = ORES[oreTypes[i]];
      ctx.fillStyle = ot.color; ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${ot.emoji} ${state.ores[oreTypes[i]] || 0}`, mx + oreW * i + oreW / 2, sy + 22);
    }
    ctx.textAlign = 'left';
    sy += 40;

    // --- 武器库 ---
    this.drawCard(mx, sy, mw, 24, null);
    ctx.fillStyle = c.gold; ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
    ctx.fillText(`🗡️ 武器库  ${wepCount} 把`, mx + 10, sy + 18);
    sy += 26;

    if (wepCount === 0) {
      ctx.fillStyle = c.dim; ctx.font = '12px "Microsoft YaHei", sans-serif';
      ctx.fillText('空空如也……去天机阁抽卡吧', mx + 10, sy + 12);
      sy += 20;
    } else {
      for (let i = 0; i < wepCount; i++) {
        const w = state.weaponInventory[i]; const dao = DAOS[w.daoId]; const q = QUALITIES[w.quality];
        const isEq = state.equippedWeapon === i; const wl = WEAPON_LEVELS[w.level || 0];
        const ydata = DISMANTLE_YIELD[w.quality];

        this.roundRect(ctx, mx + 2, sy + 1, mw - 4, WEP_ITEM_H - 2, 5,
          isEq ? '#0f1f0f' : '#101028', isEq ? '#336633' : '#2a2a44');

        ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(q.emoji, mx + 22, sy + WEP_ITEM_H / 2 + 6);
        ctx.textAlign = 'left';

        ctx.font = 'bold 14px "Microsoft YaHei", sans-serif'; ctx.fillStyle = q.color;
        ctx.fillText(`${dao.icon} ${w.name || dao.weapon}`, mx + 48, sy + 18);

        ctx.fillStyle = '#999'; ctx.font = '10px "Microsoft YaHei", sans-serif';
        const qMult = QUALITIES[w.quality].multiplier;
        let sub = `ATK×${qMult} · ${wl.name}`;
        if (dao.critBonus) sub += ` · 暴击+${Math.round(dao.critBonus * 100)}%`;
        else if (dao.tribulationResist) sub += ` · 渡抗+${Math.round(dao.tribulationResist * 100)}%`;
        ctx.fillText(sub, mx + 48, sy + 38);

        const rX = this.W - 140;
        if (!isEq) {
          if (ydata) {
            ctx.fillStyle = '#777'; ctx.font = '9px "Microsoft YaHei", sans-serif';
            ctx.fillText(`分解 ${ORES[ydata.type].emoji}×${ydata.min}-${ydata.max}`, rX, sy + 18);
          }
          this.addButton(rX + 4, sy + 22, 52, 20, '分解', '#553322', () => {
            const r = state.dismantleWeapon(i);
            if (r && r.error) this.toast(r.error);
            else if (r) { DataStore.autoSave(state); this.toast(`${r.oreEmoji}${r.oreName}×${r.amount}`); }
          });
          this.addButton(rX + 60, sy + 22, 52, 20, '装备', '#224422', () => { state.equipWeapon(i); DataStore.autoSave(state); });
        } else {
          ctx.fillStyle = '#44cc66'; ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
          ctx.fillText('✅ 装备中', rX + 6, sy + 28);
        }
        sy += WEP_ITEM_H;
      }
      sy += 8;
    }

    // --- 功法库 ---
    this.drawCard(mx, sy, mw, 24, null);
    ctx.fillStyle = c.gold; ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
    ctx.fillText(`📜 功法库  ${skillCount} 本`, mx + 10, sy + 18);
    sy += 26;

    if (skillCount === 0) {
      ctx.fillStyle = c.dim; ctx.font = '12px "Microsoft YaHei", sans-serif';
      ctx.fillText('空空如也……去天机阁抽卡吧', mx + 10, sy + 12);
      sy += 20;
    } else {
      for (let i = 0; i < skillCount; i++) {
        const s = state.skillInventory[i]; const dao = DAOS[s.daoId]; const q = QUALITIES[s.quality];
        const isEq = state.equippedSkills.includes(i);
        const slvl = SKILL_UPGRADE_LEVELS[s.level || 0];

        this.roundRect(ctx, mx + 2, sy + 1, mw - 4, SKILL_ITEM_H - 2, 5,
          isEq ? '#0f1f0f' : '#101028', isEq ? '#336633' : '#2a2a44');

        ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(q.emoji, mx + 22, sy + SKILL_ITEM_H / 2 + 6);
        ctx.textAlign = 'left';

        ctx.font = 'bold 13px "Microsoft YaHei", sans-serif'; ctx.fillStyle = q.color;
        ctx.fillText(`${dao.icon} ${s.name}`, mx + 48, sy + 16);

        ctx.fillStyle = '#999'; ctx.font = '9px "Microsoft YaHei", sans-serif';
        ctx.fillText(`${slvl.name} · ${s.effect || s.desc || ''}`, mx + 48, sy + 32);

        const sR = this.W - 140;
        if (isEq) {
          ctx.fillStyle = '#44cc66'; ctx.font = 'bold 11px "Microsoft YaHei", sans-serif';
          ctx.fillText('✅ 装备中', sR, sy + 14);
          this.addButton(sR + 68, sy + 6, 52, 20, '卸下', '#553333', () => { state.unequipSkill(i); DataStore.autoSave(state); });
        } else {
          this.addButton(sR + 8, sy + 6, 52, 20, '分解', '#553322', () => {
            const r = state.dismantleSkill(i);
            if (r && r.error) this.toast(r.error);
            else if (r) { DataStore.autoSave(state); this.toast(`分解 → 📜残页×${r.amount}`); }
          });
          const hasSlots = state.equippedSkills.length < state.maxSkillSlots;
          this.addButton(sR + 68, sy + 6, 52, 20, '装备', hasSlots ? '#224422' : '#333344', () => {
            if (!hasSlots) { this.toast('技能槽已满'); return; }
            state.equipSkill(i); DataStore.autoSave(state);
          });
        }
        sy += SKILL_ITEM_H;
      }
      sy += 8;
    }

    // --- 丹药区 ---
    if (pillCount > 0) {
      this.drawCard(mx, sy, mw, 24, null);
      ctx.fillStyle = '#ff6644'; ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
      ctx.fillText(`🧪 丹药  ${pillCount} 个`, mx + 10, sy + 18);
      sy += 26;

      for (let i = 0; i < pillCount; i++) {
        const p = state.pills[i];
        this.roundRect(ctx, mx + 2, sy + 1, mw - 4, PILL_ITEM_H - 2, 4, '#101028', '#2a2a44');

        ctx.font = '15px sans-serif';
        ctx.fillText(p.emoji, mx + 14, sy + 20);
        ctx.fillStyle = p.color || '#fff'; ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
        ctx.fillText(p.name, mx + 40, sy + 14);
        ctx.fillStyle = '#999'; ctx.font = '9px "Microsoft YaHei", sans-serif';
        ctx.fillText(p.desc, mx + 40, sy + 26);
        this.addButton(this.W - 68, sy + 4, 52, 22, '使用', '#1a552a', () => {
          const r = state.usePill(i);
          if (r.error) this.toast(r.error);
          else this.toast(r.message);
        });

        sy += PILL_ITEM_H;
      }
    }

    ctx.restore();

    // === 滚动条 ===
    if (maxScroll > 0) {
      const barW = 3, barX = this.W - 8;
      ctx.fillStyle = 'rgba(20,20,40,0.6)';
      ctx.fillRect(barX, scrollStartY, barW, visibleH);
      const thumbH = Math.max(20, visibleH * visibleH / (visibleH + maxScroll));
      const thumbY = scrollStartY + (offset / maxScroll) * (visibleH - thumbH);
      ctx.fillStyle = 'rgba(140,140,200,0.7)';
      this.roundRect(ctx, barX, thumbY, barW, thumbH, 2, null, null);
      ctx.fill();
    }

    this._invScroll = offset;
    this.scrollZones = { inventory: { screenY: scrollStartY, h: visibleH, offset, max: maxScroll } };
  }

  // ============ 坊市（带滚动）============
  renderShop(state, contentH) {
    const ctx = this.ctx; const c = this.colors;
    const mx = 10, mw = this.W - 20;
    const ITEM_H = 54;   // 商品卡片高度
    const ITEM_GAP = 5;  // 卡片间距
    const CAT_H = 24;    // 分类标题高度

    // 只在需要时刷新（空商品 或 跨天），不在每帧做 init
    const today = new Date().toISOString().split('T')[0];
    const needsRefresh = !state.shopItems || state.shopItems.length === 0 || state.shopDate !== today;
    if (needsRefresh) {
      ShopSystem.refreshShop(state, false);
    }

    // 确保字段存在（防御性，不覆盖已有数据）
    if (!state.pills) state.pills = [];
    if (!state.activePillBuffs) state.activePillBuffs = {};

    const items = (state.shopItems || []).filter(i => i && i.category && i.id);
    if (items.length === 0) {
      this.scrollZones = {};
      return;
    }

    // === 固定标题栏 ===
    let hy = 8;
    this.drawCard(mx, hy, mw, 44, null);
    ctx.fillStyle = c.gold; ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('🏪 坊 市', this.W / 2, hy + 22);
    ctx.textAlign = 'left';
    ctx.fillStyle = c.dim; ctx.font = '10px "Microsoft YaHei", sans-serif';
    ctx.fillText(`${state.shopDate} · 每日 0 点刷新`, mx + 18, hy + 38);
    const canRefresh = state.spiritStones >= ShopSystem.REFRESH_COST;
    this.addButton(this.W - 110, hy + 6, 90, 28,
      `🔄 ${ShopSystem.REFRESH_COST}灵石`,
      canRefresh ? '#442244' : '#222233', () => this.onRefreshShop(state));
    hy += 52;
    const scrollStartY = hy;

    // === 计算总内容高度 ===
    const categories = [
      { key: 'weapon', title: '🗡️ 武器铺', color: '#4499ff' },
      { key: 'skill',  title: '📖 功法阁', color: '#9944ff' },
      { key: 'ore',    title: '💎 矿石摊', color: '#44cc66' },
      { key: 'pill',   title: '🧪 丹药铺', color: '#ff6644' },
    ];

    let totalH = 0;
    for (const cat of categories) {
      const catItems = items.filter(i => i.category === cat.key);
      if (catItems.length === 0) continue;
      totalH += CAT_H;
      totalH += catItems.length * (ITEM_H + ITEM_GAP);
      totalH += 10; // 分类间距
    }
    totalH += 20; // 底部提示

    const visibleH = contentH - scrollStartY;
    const maxScroll = Math.max(0, totalH - visibleH);
    // 从持久缓存读取（防止购买操作后 scrollZones 被意外清空）
    const offset = Math.min(this._shopScroll, maxScroll);

    // === 裁剪区域 + 滚动偏移 ===
    ctx.save();
    ctx.beginPath(); ctx.rect(0, scrollStartY, this.W, visibleH); ctx.clip();
    ctx.translate(0, -offset);

    let sy = scrollStartY;

    for (const cat of categories) {
      const catItems = items.filter(i => i.category === cat.key);
      if (catItems.length === 0) continue;

      // 分类标题
      ctx.fillStyle = cat.color; ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
      ctx.fillText(cat.title, mx + 4, sy + 16);
      sy += CAT_H;

      // 商品卡片
      for (const item of catItems) {
        const isSold = item.sold;
        const canBuy = !isSold && state.spiritStones >= item.price;
        const cardBg = isSold ? '#0a0a12' : '#0f0f28';
        const cardBorder = isSold ? '#222233' : '#2a2a55';

        // 卡片底板
        this.roundRect(ctx, mx, sy, mw, ITEM_H, 6, cardBg, cardBorder);

        // 左：品质 emoji（大号，垂直居中）
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.emoji, mx + 20, sy + ITEM_H / 2 + 8);
        ctx.textAlign = 'left';

        // 中：商品名（第一行）
        const textX = mx + 42;
        ctx.fillStyle = isSold ? '#555' : '#fff';
        ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
        ctx.fillText(item.name, textX, sy + 20);

        // 中：描述（第二行，品质颜色）
        ctx.fillStyle = isSold ? '#444' : '#999';
        ctx.font = '11px "Microsoft YaHei", sans-serif';
        let line2 = item.desc || '';
        // 矿石化显示已有数量
        if (item.category === 'ore' && item.oreType) {
          const owned = (state.ores[item.oreType] || 0);
          line2 = `${line2}  ·  拥有 ${owned}`;
        }
        // 武器/功法显示品质标签
        if (item.quality && QUALITIES[item.quality]) {
          const q = QUALITIES[item.quality];
          ctx.fillStyle = q.color;
          line2 = `${q.name}  ·  ${line2}`;
        }
        ctx.fillText(line2, textX, sy + 38);

        // 右：价格 + 购买按钮
        const rightX = this.W - 20;
        if (isSold) {
          ctx.fillStyle = '#555'; ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText('— 售罄 —', rightX, sy + ITEM_H / 2 + 5);
          ctx.textAlign = 'left';
        } else {
          // 价格
          ctx.fillStyle = c.gold; ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`💎${item.price.toLocaleString()}`, rightX, sy + 20);
          ctx.textAlign = 'left';
          // 购买按钮 — 用数组索引确保精确匹配
          const buyIdx = state.shopItems.indexOf(item);
          this.addButton(rightX - 52, sy + 26, 52, 22,
            canBuy ? '购买' : '不足',
            canBuy ? '#1a552a' : '#222233', () => this.onBuyItem(state, buyIdx));
        }

        sy += ITEM_H + ITEM_GAP;
      }
      sy += 10;
    }

    // 底部提示
    ctx.fillStyle = c.dim; ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('每日 0 点自动刷新  ·  或花 50 灵石手动刷新', this.W / 2, sy + 8);
    ctx.textAlign = 'left';

    ctx.restore();

    // === 滚动条 ===
    if (maxScroll > 0) {
      const barW = 3, barX = this.W - 8;
      ctx.fillStyle = 'rgba(20,20,40,0.6)';
      ctx.fillRect(barX, scrollStartY, barW, visibleH);
      const thumbH = Math.max(20, visibleH * visibleH / (visibleH + maxScroll));
      const thumbY = scrollStartY + (offset / maxScroll) * (visibleH - thumbH);
      ctx.fillStyle = 'rgba(140,140,200,0.7)';
      this.roundRect(ctx, barX, thumbY, barW, thumbH, 2, null, null);
      ctx.fill();
    }

    // 同步持久缓存 + 滚动区域
    this._shopScroll = offset;
    this.scrollZones = { shop: { screenY: scrollStartY, h: visibleH, offset, max: maxScroll } };
  }

  // ============ 弹窗 ============
  renderOverlay() {
    this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  renderOfflinePopup() {
    if (!this.offlineResult) return;
    this.renderOverlay();
    const ctx = this.ctx; const c = this.colors;
    const cx = this.W/2, cy = this.H/2;
    const pw = 280, ph = 180;
    this.roundRect(ctx, cx-pw/2, cy-ph/2, pw, ph, 12, c.card, c.gold);
    ctx.fillStyle = c.gold; ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🌙 修炼归来', cx, cy-55);
    ctx.fillStyle = '#fff'; ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.fillText(`离线 ${this.formatSeconds(this.offlineResult.seconds)}`, cx, cy-22);
    ctx.fillText(`速度 ${Math.floor(this.offlineResult.rate)}/秒`, cx, cy);
    ctx.fillStyle = c.gold; ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
    ctx.fillText(`+${this.offlineResult.gained.toLocaleString()} 修为`, cx, cy+30);
    this.addButton(cx-50, cy+50, 100, 36, '收下', c.blue, () => {
      this.offlineDismissed = true; this.offlineResult = null;
    });
    ctx.textAlign = 'left';
  }

  renderTribulationPopup(state) {
    this.renderOverlay();
    const ctx = this.ctx; const cx = this.W/2, cy = this.H/2;
    const pw = 270, ph = 150;
    this.roundRect(ctx, cx-pw/2, cy-ph/2, pw, ph, 12, '#1a1a3a', '#ffaa00');
    ctx.fillStyle = '#ff4444'; ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ 天劫降临！', cx, cy-35);
    ctx.fillStyle = '#fff'; ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.fillText(`渡 ${state.nextRealm.name} 天劫`, cx, cy-5);
    ctx.fillText(`失败率 ${Math.floor(state.tribulationFailRate*100)}%`, cx, cy+20);
    this.addButton(cx-50, cy+38, 100, 36, '⚡ 渡劫！', '#884422', () => this.onResolveTribulation(state));
    ctx.textAlign = 'left';
  }

  renderTribulationFailedPopup(state) {
    this.renderOverlay();
    const ctx = this.ctx; const cx = this.W/2, cy = this.H/2;
    const pw = 270, ph = 160;
    this.roundRect(ctx, cx-pw/2, cy-ph/2, pw, ph, 12, '#1a1a3a', '#ff4444');
    ctx.fillStyle = '#ff4444'; ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💀 渡劫失败！', cx, cy-40);
    ctx.fillStyle = '#fff'; ctx.font = '13px "Microsoft YaHei", sans-serif';
    ctx.fillText('修为大损……', cx, cy-8);
    this.addButton(cx-50, cy+15, 100, 32, '😔 放弃', '#333', () => this.onGiveUpTribulation(state));
    this.addButton(cx-50, cy+52, 100, 32, '📺 广告复活', '#448844', () => this.onReviveTribulation(state));
    ctx.textAlign = 'left';
  }

  // ============ 任务弹窗 ============
  renderTaskPopup(state) {
    this.renderOverlay();
    const ctx = this.ctx; const c = this.colors;
    const pw = 360, ph = 520;
    const cx = this.W / 2, cy = this.H / 2;
    this.roundRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 12, c.card, c.gold);
    this.roundRect(ctx, cx - pw / 2 + 10, cy - ph / 2 + 6, pw - 20, 32, 6, '#0a0a1a', null);
    ctx.fillStyle = c.gold; ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('📋 任务 & 成就', cx, cy - ph / 2 + 28); ctx.textAlign = 'left';

    let ty = cy - ph / 2 + 44;
    const dailyList = TaskSystem.getDailyProgress(state);

    // 日常任务
    ctx.fillStyle = '#4499ff'; ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
    ctx.fillText('📋 日常任务', cx - pw / 2 + 16, ty); ty += 24;

    for (const t of dailyList) {
      const done = t.done, complete = t.complete;
      const cardColor = done ? '#0a2a0a' : (complete ? '#1a2a1a' : '#101028');
      const borderColor = done ? '#336633' : (complete ? '#33aa33' : '#2a2a44');
      this.roundRect(ctx, cx - pw / 2 + 14, ty, pw - 28, 36, 4, cardColor, borderColor);

      // 第一行：图标+任务名
      ctx.fillStyle = done ? '#666' : '#fff';
      ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
      ctx.fillText(`${t.icon} ${t.name}`, cx - pw / 2 + 22, ty + 16);

      // 第二行：描述/奖励（与按钮同行）
      ctx.fillStyle = done ? '#44cc66' : (complete ? '#ffd700' : '#666');
      ctx.font = '11px "Microsoft YaHei", sans-serif';
      ctx.fillText(done ? '✅ 已领取' : (complete ? t.reward : t.desc), cx - pw / 2 + 22, ty + 32);

      if (complete && !done) {
        this.addButton(cx + pw / 2 - 72, ty + 6, 56, 24, '领取', '#226622',
          ((tId) => () => { const r = TaskSystem.claimDaily(state, tId); this.toast(r.error || r.message); })(t.id));
      }
      ty += 40;
    }

    // 成就
    ty += 8;
    ctx.fillStyle = '#ff8800'; ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
    ctx.fillText('🏆 成就', cx - pw / 2 + 16, ty); ty += 24;

    const achvList = TaskSystem.getAchievementProgress(state);
    const showAchv = achvList.filter(a => a.complete || a.done).slice(0, 5);
    if (showAchv.length === 0) {
      ctx.fillStyle = '#555'; ctx.font = '12px "Microsoft YaHei", sans-serif';
      ctx.fillText('暂无达成的成就，继续修行吧！', cx - pw / 2 + 16, ty + 5);
      ty += 24;
    } else {
      for (const a of showAchv) {
        const aColor = a.done ? '#0a2a0a' : '#2a1a0a';
        const aBorder = a.done ? '#336633' : '#664422';
        this.roundRect(ctx, cx - pw / 2 + 14, ty, pw - 28, 36, 4, aColor, aBorder);

        ctx.fillStyle = a.done ? '#666' : '#ffaa00';
        ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
        ctx.fillText(`🏆 ${a.icon} ${a.name}`, cx - pw / 2 + 22, ty + 16);
        ctx.fillStyle = a.done ? '#44cc66' : '#ff8800';
        ctx.font = '11px "Microsoft YaHei", sans-serif';
        ctx.fillText(a.done ? '✅ 已领取' : a.reward, cx - pw / 2 + 22, ty + 32);

        if (a.complete && !a.done) {
          this.addButton(cx + pw / 2 - 72, ty + 6, 56, 24, '领取', '#664400',
            ((aId) => () => { const r = TaskSystem.claimAchievement(state, aId); this.toast(r.error || r.message); })(a.id));
        }
        ty += 40;
      }
    }

    // 关闭按钮
    this.addButton(cx - 40, cy + ph / 2 - 36, 80, 28, '关闭', '#334488', () => { this._showTaskPopup = false; });
  }

  renderToast() {
    const ctx = this.ctx;
    const alpha = Math.min(1, this.toastTimer / 25);
    ctx.fillStyle = `rgba(20,20,40,${alpha*0.9})`;
    const msg = this.toastMessage.split('\n')[0]; // 取第一行
    const tw = ctx.measureText(msg).width + 40;
    const tx = this.W/2 - tw/2, ty = this.H - 100;
    this.roundRect(ctx, tx, ty, tw, 36, 10, null, null);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.font = '13px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(msg, this.W/2, ty + 23);
    ctx.textAlign = 'left';
  }

  // ============ 事件处理 ============
  // 检测鼠标在哪个滚动区域内
  _getScrollZoneAt(my) {
    for (const key of Object.keys(this.scrollZones)) {
      const z = this.scrollZones[key];
      if (my >= z.screenY && my <= z.screenY + z.h && z.max > 0) return key;
    }
    return null;
  }

  handleClick(mx, my) {
    const navStartY = this.H - this.navH;
    const scrollable = ['inventory', 'shop', 'equipment'];

    // 分离导航栏按钮和内容区按钮
    const navBtns = [], contentBtns = [];
    for (const btn of this.buttons) {
      if (btn.y >= navStartY) navBtns.push(btn);
      else contentBtns.push(btn);
    }

    // 滚动页面：调整点击坐标匹配内容区
    let adjustedMy = my;
    if (scrollable.includes(this.screen)) {
      for (const key of Object.keys(this.scrollZones)) {
        const z = this.scrollZones[key];
        if (my >= z.screenY && my <= z.screenY + z.h) {
          adjustedMy = my + z.offset;
          break;
        }
      }
    }

    // 优先匹配内容区按钮
    for (const btn of [...contentBtns].reverse()) {
      if (mx >= btn.x && mx <= btn.x + btn.w && adjustedMy >= btn.y && adjustedMy <= btn.y + btn.h) {
        if (btn.onClick) { btn.onClick(); AudioSystem.playClick(); }
        return true;
      }
    }
    // 再匹配导航栏按钮
    for (const btn of [...navBtns].reverse()) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        if (btn.onClick) { btn.onClick(); AudioSystem.playClick(); }
        return true;
      }
    }
    return false;
  }

  handleWheel(deltaY) {
    const scrollable = ['inventory', 'shop', 'equipment'];
    if (!scrollable.includes(this.screen)) return;
    // 使用最近一次记录的活跃区域，没有则取第一个可用区域
    let key = this.activeScrollZone;
    if (!key || !this.scrollZones[key]) {
      const keys = Object.keys(this.scrollZones);
      if (keys.length > 0) key = keys[0];
    }
    if (key && this.scrollZones[key]) {
      const z = this.scrollZones[key];
      z.offset = Math.max(0, Math.min(z.max, z.offset + deltaY));
      // 同步持久缓存
      if (key === 'shop') this._shopScroll = z.offset;
      else if (key === 'inventory') this._invScroll = z.offset;
      else if (key === 'equipment') this._equipScroll = z.offset;
    }
  }

  handleTouchStart(my) {
    // 导航栏区域不触发滚动拖拽
    const scrollable = ['inventory', 'shop', 'equipment'];
    if (!scrollable.includes(this.screen) || my >= this.H - this.navH) return;
    this.isDragging = true;
    this.dragStartY = my;
    const key = this._getScrollZoneAt(my);
    this.activeScrollZone = key;
    if (key && this.scrollZones[key]) {
      this.dragStartOffset = this.scrollZones[key].offset;
    }
  }

  handleTouchMove(my) {
    const scrollable = ['inventory', 'shop', 'equipment'];
    if (!this.isDragging || !scrollable.includes(this.screen)) return;
    const key = this.activeScrollZone;
    if (key && this.scrollZones[key]) {
      const delta = this.dragStartY - my;
      const newOffset = Math.max(0, Math.min(this.scrollZones[key].max, this.dragStartOffset + delta));
      this.scrollZones[key].offset = newOffset;
      // 同步持久缓存
      if (key === 'shop') this._shopScroll = newOffset;
      else if (key === 'inventory') this._invScroll = newOffset;
      else if (key === 'equipment') this._equipScroll = newOffset;
    }
  }

  handleTouchEnd() {
    this.isDragging = false;
    this.activeScrollZone = null;
  }

  // 绘制单个区域的迷你滚动条
  drawZoneScrollbar(key, zoneY, zoneH) {
    const z = this.scrollZones[key];
    if (!z || z.max <= 0) return;
    const ctx = this.ctx;
    const barW = 3, barX = this.W - 8;
    ctx.fillStyle = 'rgba(20,20,40,0.6)';
    ctx.fillRect(barX, zoneY, barW, zoneH);
    const thumbH = Math.max(20, zoneH * zoneH / (zoneH + z.max));
    const thumbY = zoneY + (z.offset / z.max) * (zoneH - thumbH);
    ctx.fillStyle = 'rgba(140,140,200,0.7)';
    this.roundRect(ctx, barX, thumbY, barW, thumbH, 2, null, null);
    ctx.fill();
  }

  goTo(screen) {
    if (this.screen === 'battle' && screen !== 'battle' && typeof state !== 'undefined') {
      state._lastDrop = null;
    }
    this.screen = screen;
    this.battleResult = null;
    this.battleAnim = null;
    this.scrollZones = {};
    this.activeScrollZone = null;
    // 切走时清空对应缓存
    if (screen !== 'shop') this._shopScroll = 0;
    if (screen !== 'inventory') this._invScroll = 0;
    if (screen !== 'equipment') this._equipScroll = 0;
  }

  handleMouseMove(my) {
    const scrollable = ['inventory', 'shop', 'equipment'];
    if (!scrollable.includes(this.screen)) return;
    this.activeScrollZone = this._getScrollZoneAt(my);
  }

  toast(msg) { this.toastMessage = msg; this.toastTimer = 100; }

  formatSeconds(total) {
    const h = Math.floor(total/3600), m = Math.floor((total%3600)/60), s = Math.floor(total%60);
    return `${h}时${m}分${s}秒`;
  }

  update(state, deltaSeconds) {
    CultivationSystem.tickCultivation(state, deltaSeconds);
    if (this.toastTimer > 0) { this.toastTimer--; if (this.toastTimer === 0) this.toastMessage = ''; }
  }

  // === 天机阁事件 ===
  onWatchAdForToken(state) {
    if (state.julingFu > 0) {
      const r = GachaSystem.useJuliingFu(state);
      if (r) { state.totalAdsWatched++; this.toast(`聚灵符！天机令 +${r.gained}`); return; }
    }
    state.tianjiTokens++; state.totalAdsWatched++;
    this.toast(`天机令 +1（${state.tianjiTokens}枚）`);
  }

  onUseJuliingFu(state) {
    if (state.julingFu <= 0) { this.toast('没有聚灵符'); return; }
    const r = GachaSystem.useJuliingFu(state);
    if (r) { state.totalAdsWatched++; this.toast(r.message); }
  }

  onSingleDraw(state) {
    TaskSystem.onDraw(state);
    if (state.tianjiTokens < 1) { this.toast('天机令不足'); return; }
    state.tianjiTokens--;
    const r = GachaSystem.draw(state);
    this.drawResults.push(r);
    const q = QUALITIES[r.quality] || { color: '#aaa', emoji: '⚪' };
    this.toast(`${q.emoji} ${r.name || r.desc}`);
    if (r.quality === 'legendary') { this.toast('🔴 圣品降临！！！'); AudioSystem.playLegendary(); }
    else AudioSystem.playDraw();
  }

  onTenDraw(state) {
    if (state.tianjiTokens < 10) { this.toast('需要 10 枚天机令'); return; }
    const results = GachaSystem.drawTen(state);
    if (!results) return;
    for (const r of results) this.drawResults.push(r);
    const best = [...results].sort((a, b) => {
      const o = { legendary:4, epic:3, rare:2, common:1, julingfu:0 };
      return (o[b.quality]||0) - (o[a.quality]||0);
    })[0];
    const q = QUALITIES[best.quality] || { color: '#aaa', emoji: '⚪' };
    this.toast(`十连！最优 ${q.emoji} ${best.name}`);
    if (results.some(r => r.quality === 'legendary')) { this.toast('🔴 圣品降临！！！'); AudioSystem.playLegendary(); }
    else AudioSystem.playDraw();
  }

  // === 战场事件 ===
  onBattle(state) {
    const result = BattleSystem.fight(state, state.battleCurrentLayer);
    this.battleResult = result;
    this.toast(result.victory ? `🏆 通关第${result.enemy.layer}层！` : '💀 败北……提升战力再战');
  }

  onSweep(state) {
    const r = BattleSystem.sweep(state);
    if (r.swept > 0) this.toast(`扫荡 ${r.swept} 层 💎${r.rewards.spiritStones.toLocaleString()}`);
    else this.toast('无可扫荡层');
  }

  onBreakthrough(state) {
    if (state.isTribulating) { this.toast('正在渡劫中'); return; }
    const r = CultivationSystem.attemptBreakthrough(state);
    if (r.success) this.toast(r.message);
    else this.toast(r.reason || '无法突破');
  }

  onResolveTribulation(state) {
    const r = CultivationSystem.resolveTribulation(state);
    if (r.result === 'success') this.toast(r.message);
    else this.toast(r.message);
  }

  onReviveTribulation(state) {
    const r = CultivationSystem.reviveTribulation(state);
    state.totalAdsWatched++;
    if (r) this.toast(r.message + ' ' + (r.bonus||''));
  }

  onGiveUpTribulation(state) {
    state.tribulationFailed = false;
    this.toast('修为大损……');
  }

  onUpgradeWeapon(state) {
    const w = state.currentWeapon;
    if (!w) { this.toast('无装备武器'); return; }
    if ((w.level||0) >= 3) { this.toast('已满级'); return; }
    const next = WEAPON_LEVELS[(w.level||0) + 1];
    if (state.spiritStones < next.stoneCost) { this.toast(`灵石不足 ${next.stoneCost.toLocaleString()}`); return; }
    if ((state.ores[next.oreType]||0) < next.oreCost) {
      this.toast(`${ORES[next.oreType].name}不足 ${next.oreCost}个`); return;
    }
    state.spiritStones -= next.stoneCost;
    state.ores[next.oreType] -= next.oreCost;
    w.level = (w.level||0) + 1;
    DataStore.autoSave(state);
    AudioSystem.playUpgrade(); this.toast(`武器升级 → ${WEAPON_LEVELS[w.level].name}！`);
    TaskSystem.onUpgrade(state);
  }

  // === 坊市事件 ===
  onBuyItem(state, itemIdx) {
    const r = ShopSystem.buyItem(state, itemIdx);
    if (r.error) {
      this.toast('❌ ' + r.error);
      return;
    }
    AudioSystem.playBuy();
    TaskSystem.onBuy(state);
    this.toast('✅ ' + (r.message || '购买成功！'));
  }

  onRefreshShop(state) {
    const r = ShopSystem.refreshShop(state, true);
    if (r.error) { this.toast(r.error); return; }
    this.toast('🔄 坊市已刷新！');
  }
}
