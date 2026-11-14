/**
 * Procedural Web Audio API sound synthesis and Telegram Haptic Feedback
 * Zero external audio files required, instant latency, volume & mute control
 * Soft, minimal acoustic sounds inspired by physical board games
 */

class SoundController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private lastSoundTime: Record<string, number> = {};

  constructor() {
    const saved = localStorage.getItem('mikasa_ludo_muted');
    if (saved !== null) {
      this.isMuted = saved === 'true';
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('mikasa_ludo_muted', String(this.isMuted));
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Telegram WebApp Haptic Feedback:
   * Only called on direct user intent (rolling dice, picking token)
   */
  public hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light') {
    try {
      const haptic = (window as any).Telegram?.WebApp?.HapticFeedback;
      if (haptic && typeof haptic.impactOccurred === 'function') {
        haptic.impactOccurred(style);
      } else if (navigator.vibrate) {
        navigator.vibrate(style === 'heavy' ? 25 : style === 'medium' ? 18 : 10);
      }
    } catch {}
  }

  public hapticNotification(type: 'error' | 'success' | 'warning') {
    try {
      const haptic = (window as any).Telegram?.WebApp?.HapticFeedback;
      if (haptic && typeof haptic.notificationOccurred === 'function') {
        haptic.notificationOccurred(type);
      } else if (navigator.vibrate) {
        navigator.vibrate(15);
      }
    } catch {}
  }

  private canPlay(key: string, cooldownMs: number = 60): boolean {
    if (this.isMuted) return false;
    const now = Date.now();
    const last = this.lastSoundTime[key] || 0;
    if (now - last < cooldownMs) return false;
    this.lastSoundTime[key] = now;
    return true;
  }

  /**
   * Soft wooden dice tumble/clatter
   */
  public playDiceRoll() {
    if (!this.canPlay('diceRoll', 300)) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // 3 subtle wooden clicks
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220 + i * 40, t + i * 0.05);
      osc.frequency.exponentialRampToValueAtTime(110, t + i * 0.05 + 0.035);

      gain.gain.setValueAtTime(0.12, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.005, t + i * 0.05 + 0.035);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.04);
    }
  }

  /**
   * Soft wooden dice settling
   */
  public playDiceLand() {
    if (!this.canPlay('diceLand', 200)) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Crisp, soft wooden board tap for token movement
   */
  public playTokenStep() {
    if (!this.canPlay('step', 50)) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.045);

    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  /**
   * Tactile capture: soft swoosh + wooden knock
   */
  public playCapture() {
    if (!this.canPlay('capture', 400)) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.14);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  /**
   * Delicate glass/bell chime for reaching safe star or home
   */
  public playSafeStar() {
    if (!this.canPlay('star', 300)) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [659.25, 880.0];
    const t = this.ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.07);

      gain.gain.setValueAtTime(0.15, t + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.005, t + idx * 0.07 + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.18);
    });
  }

  /**
   * Soft turn start notification
   */
  public playTurnStart() {
    if (!this.canPlay('turnStart', 500)) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.setValueAtTime(650, t + 0.06);

    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  /**
   * Minimal quiet tick when timer is almost out
   */
  public playTimerTick() {
    if (!this.canPlay('tick', 300)) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, t);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.002, t + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  /**
   * Playful tactile hop / step pop sound when token walks along the board
   */
  public playTokenHop(hopIndex: number = 0) {
    if (!this.canPlay('tokenHop', 60)) return;
    this.initCtx();
    if (!this.ctx) return;

    // Pleasant ascending pitch as token walks
    const baseFreq = 420 + Math.min(hopIndex * 35, 320);
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, t + 0.045);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  public playChatNotification() {
    if (!this.canPlay('chat', 200)) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, t);
    osc.frequency.setValueAtTime(880.0, t + 0.05);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playReactionBurst() {
    if (!this.canPlay('reaction', 200)) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.08);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Warm gentle victory chime
   */
  public playVictory() {
    if (!this.canPlay('victory', 1000)) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    let t = this.ctx.currentTime;
    notes.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.22);
      t += 0.12;
    });
  }

  /**
   * Smooth, gentle defeat chime for runners up / loss
   */
  public playDefeat() {
    if (!this.canPlay('defeat', 1000)) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 392, 349.23, 293.66];
    let t = this.ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);

      gain.gain.setValueAtTime(0.14, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.005, t + idx * 0.12 + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.28);
    });
  }

  /**
   * Soft quiet button tap
   */
  public playClick() {
    if (!this.canPlay('click', 40)) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.025);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.025);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.025);
  }
}

export const sound = new SoundController();
