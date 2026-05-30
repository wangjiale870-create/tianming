// AudioSystem — 程序化音效 & 背景音乐
// 使用 Web Audio API 生成，无需外部音频文件

class AudioSystem {
  static ctx = null;
  static musicGain = null;
  static musicPlaying = false;
  static musicNodes = [];
  static muted = false;

  // —————— 初始化 ——————
  static init() {
    // 延迟创建，等首次用户交互
  }

  static ensureCtx() {
    if (!AudioSystem.ctx) {
      try {
        AudioSystem.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.log('音频不支持');
        return false;
      }
    }
    if (AudioSystem.ctx.state === 'suspended') {
      AudioSystem.ctx.resume();
    }
    return true;
  }

  // —————— 工具函数 ——————
  static _osc(type, freq, start, duration, gain = 0.15, dest = null) {
    if (!AudioSystem.ensureCtx() || AudioSystem.muted) return;
    const t = start || AudioSystem.ctx.currentTime;
    const osc = AudioSystem.ctx.createOscillator();
    const g = AudioSystem.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g);
    g.connect(dest || AudioSystem.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  static _noise(start, duration, gain = 0.08) {
    if (!AudioSystem.ensureCtx() || AudioSystem.muted) return;
    const t = start || AudioSystem.ctx.currentTime;
    const bufferSize = AudioSystem.ctx.sampleRate * duration;
    const buffer = AudioSystem.ctx.createBuffer(1, bufferSize, AudioSystem.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = AudioSystem.ctx.createBufferSource();
    source.buffer = buffer;
    const g = AudioSystem.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(g);
    g.connect(AudioSystem.ctx.destination);
    source.start(t);
    source.stop(t + duration);
  }

  // —————— 音效 ——————

  static playClick() {
    const t = AudioSystem.ctx?.currentTime || 0;
    AudioSystem._osc('sine', 800, t, 0.05, 0.08);
    AudioSystem._osc('sine', 1000, t + 0.02, 0.03, 0.05);
  }

  static playBuy() {
    const t = AudioSystem.ctx?.currentTime || 0;
    AudioSystem._osc('sine', 523, t, 0.08, 0.12);
    AudioSystem._osc('sine', 659, t + 0.06, 0.08, 0.12);
    AudioSystem._osc('sine', 784, t + 0.12, 0.12, 0.15);
  }

  static playSell() {
    const t = AudioSystem.ctx?.currentTime || 0;
    AudioSystem._osc('sine', 784, t, 0.08, 0.12);
    AudioSystem._osc('sine', 659, t + 0.06, 0.08, 0.12);
    AudioSystem._osc('sine', 523, t + 0.12, 0.12, 0.15);
  }

  static playDraw() {
    const t = AudioSystem.ctx?.currentTime || 0;
    AudioSystem._noise(t, 0.3, 0.06);
    AudioSystem._osc('sine', 400, t + 0.1, 0.15, 0.1);
    AudioSystem._osc('sine', 600, t + 0.2, 0.1, 0.1);
    AudioSystem._osc('sine', 800, t + 0.3, 0.2, 0.15);
  }

  static playLegendary() {
    const t = AudioSystem.ctx?.currentTime || 0;
    AudioSystem._osc('sine', 523, t, 0.3, 0.15);
    AudioSystem._osc('sine', 659, t + 0.15, 0.3, 0.15);
    AudioSystem._osc('sine', 784, t + 0.3, 0.3, 0.15);
    AudioSystem._osc('sine', 1047, t + 0.45, 0.5, 0.2);
    AudioSystem._noise(t + 0.1, 0.6, 0.04);
  }

  static playBattleHit() {
    const t = AudioSystem.ctx?.currentTime || 0;
    // 有节奏的打击感：低频鼓点 + 中频冲击 + 噪声
    AudioSystem._osc('sine', 60, t, 0.12, 0.15);       // 鼓点低频
    AudioSystem._osc('triangle', 180, t, 0.08, 0.1);    // 中频冲击
    AudioSystem._noise(t, 0.06, 0.06);                  // 噪声瞬态
  }

  static playCrit() {
    const t = AudioSystem.ctx?.currentTime || 0;
    // 暴击更大声更有力
    AudioSystem._osc('sine', 80, t, 0.15, 0.2);
    AudioSystem._osc('sawtooth', 300, t, 0.12, 0.12);
    AudioSystem._osc('triangle', 600, t, 0.06, 0.08);
    AudioSystem._noise(t, 0.08, 0.1);
  }

  static playVictory() {
    const t = AudioSystem.ctx?.currentTime || 0;
    AudioSystem._osc('sine', 523, t, 0.15, 0.12);
    AudioSystem._osc('sine', 659, t + 0.1, 0.15, 0.12);
    AudioSystem._osc('sine', 784, t + 0.2, 0.2, 0.15);
    AudioSystem._osc('sine', 1047, t + 0.35, 0.3, 0.2);
  }

  static playDefeat() {
    const t = AudioSystem.ctx?.currentTime || 0;
    AudioSystem._osc('sine', 400, t, 0.2, 0.1);
    AudioSystem._osc('sine', 300, t + 0.15, 0.2, 0.1);
    AudioSystem._osc('sine', 200, t + 0.3, 0.3, 0.12);
  }

  static playUpgrade() {
    const t = AudioSystem.ctx?.currentTime || 0;
    AudioSystem._osc('sine', 300, t, 0.1, 0.08);
    AudioSystem._osc('sine', 500, t + 0.08, 0.1, 0.1);
    AudioSystem._osc('sine', 800, t + 0.15, 0.15, 0.12);
    AudioSystem._osc('sine', 1200, t + 0.25, 0.2, 0.15);
    AudioSystem._noise(t + 0.05, 0.25, 0.03);
  }

  static playBreakthrough() {
    const t = AudioSystem.ctx?.currentTime || 0;
    AudioSystem._noise(t, 0.8, 0.06);
    AudioSystem._osc('sine', 200, t, 0.5, 0.1);
    AudioSystem._osc('sine', 300, t + 0.3, 0.4, 0.1);
    AudioSystem._osc('sine', 800, t + 0.6, 0.5, 0.15);
    AudioSystem._osc('sine', 1200, t + 0.9, 0.6, 0.2);
  }

  static playTribulation() {
    const t = AudioSystem.ctx?.currentTime || 0;
    AudioSystem._noise(t, 1.5, 0.08);
    AudioSystem._osc('sawtooth', 60, t, 1.0, 0.1);
    AudioSystem._osc('sawtooth', 80, t + 0.3, 0.8, 0.08);
    AudioSystem._osc('sawtooth', 50, t + 0.6, 0.6, 0.06);
  }

  static playTribulationFail() {
    const t = AudioSystem.ctx?.currentTime || 0;
    AudioSystem._osc('sawtooth', 100, t, 0.5, 0.15);
    AudioSystem._osc('sawtooth', 70, t + 0.3, 0.5, 0.12);
    AudioSystem._osc('sine', 100, t + 0.5, 0.8, 0.1);
  }

  static playDrop() {
    const t = AudioSystem.ctx?.currentTime || 0;
    AudioSystem._osc('sine', 880, t, 0.1, 0.1);
    AudioSystem._osc('sine', 1100, t + 0.08, 0.12, 0.12);
    AudioSystem._osc('sine', 1320, t + 0.16, 0.15, 0.15);
  }

  // —————— 背景音乐（修仙氛围，持续循环）——————
  static _scheduleMusic(fromTime) {
    const t = fromTime;

    // 低音持续音（drone — 稳稳托底）
    for (let i = 0; i < 16; i++) {
      AudioSystem._osc('sine', 131, t + i * 4, 3.8, 0.15, AudioSystem.musicGain);
      AudioSystem._osc('sine', 165, t + i * 4 + 1.5, 3.5, 0.08, AudioSystem.musicGain);
    }

    // 旋律线（五声音阶循环）
    const melody = [262, 330, 294, 392, 330, 262, 220, 294, 262, 196, 220, 262, 330, 294, 262, 220];
    for (let i = 0; i < 32; i++) {
      const note = melody[i % melody.length];
      AudioSystem._osc('triangle', note, t + i * 1.8, 1.6, 0.12, AudioSystem.musicGain);
    }

    // 高音点缀（随机闪烁）
    const highNotes = [523, 587, 659, 784, 880, 784, 659, 587];
    for (let i = 0; i < 24; i++) {
      if (Math.random() < 0.45) {
        const freq = highNotes[i % highNotes.length];
        AudioSystem._osc('sine', freq, t + i * 2.5 + Math.random() * 1.5, 2.0, 0.06, AudioSystem.musicGain);
      }
    }
  }

  static startMusic() {
    if (!AudioSystem.ensureCtx() || AudioSystem.musicPlaying || AudioSystem.muted) return;
    AudioSystem.musicPlaying = true;

    AudioSystem.musicGain = AudioSystem.ctx.createGain();
    AudioSystem.musicGain.gain.setValueAtTime(0.25, AudioSystem.ctx.currentTime);
    AudioSystem.musicGain.connect(AudioSystem.ctx.destination);

    const now = AudioSystem.ctx.currentTime;
    AudioSystem._scheduleMusic(now);

    // 每 30 秒续播，无缝衔接（上一轮最后几个音符还在响时下一轮就开始了）
    AudioSystem._musicTimer = setInterval(() => {
      if (!AudioSystem.musicPlaying || AudioSystem.muted) return;
      AudioSystem._scheduleMusic(AudioSystem.ctx.currentTime);
    }, 28000);
  }

  static stopMusic() {
    AudioSystem.musicPlaying = false;
    if (AudioSystem._musicTimer) {
      clearInterval(AudioSystem._musicTimer);
      AudioSystem._musicTimer = null;
    }
    if (AudioSystem.musicGain) {
      AudioSystem.musicGain.disconnect();
      AudioSystem.musicGain = null;
    }
  }

  static toggleMute() {
    AudioSystem.muted = !AudioSystem.muted;
    if (AudioSystem.muted) {
      AudioSystem.stopMusic();
    } else {
      AudioSystem.startMusic();
    }
    return AudioSystem.muted;
  }
}
