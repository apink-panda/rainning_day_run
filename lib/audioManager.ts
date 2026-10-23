// lib/audioManager.ts
// Comprehensive Sound Effects & Rainy Lo-Fi BGM Manager using Web Audio API and HTML5 Audio
import { getAssetPath } from './assetHelper';

const STORAGE_MUTED_KEY = 'panda_rain_audio_muted';

class AudioManager {
  private ctx: AudioContext | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  private muted: boolean = false;
  private bgmPlaying: boolean = false;
  private rainNoiseNode: AudioNode | null = null;
  private rainGainNode: GainNode | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.muted = window.localStorage.getItem(STORAGE_MUTED_KEY) === 'true';
      } catch {
        this.muted = false;
      }
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public async initAudio(): Promise<void> {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Ignored until user interaction
      }
    }
    this.ensureBgmAudio();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_MUTED_KEY, String(muted));
      } catch {
        // Storage unavailable
      }
    }

    if (this.bgmAudio) {
      this.bgmAudio.muted = muted;
    }

    if (this.rainGainNode && this.ctx) {
      this.rainGainNode.gain.setValueAtTime(muted ? 0 : 0.035, this.ctx.currentTime);
    }

    if (!muted && this.bgmPlaying && this.bgmAudio && this.bgmAudio.paused) {
      void this.bgmAudio.play().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ================= BGM Control =================

  private ensureBgmAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.bgmAudio) {
      const audio = new window.Audio(getAssetPath('/audio/rain-bgm.mp3'));
      audio.loop = true;
      audio.volume = 0.32;
      audio.muted = this.muted;
      audio.preload = 'auto';
      this.bgmAudio = audio;
    }
    return this.bgmAudio;
  }

  public startBgm(): void {
    this.bgmPlaying = true;
    const audio = this.ensureBgmAudio();
    if (!audio) return;
    audio.muted = this.muted;
    if (!this.muted) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Fallback to ambient rain synthesis if direct mp3 playback is delayed
          this.startAmbientRainFallback();
        });
      }
    }
  }

  public pauseBgm(): void {
    if (this.bgmAudio && !this.bgmAudio.paused) {
      this.bgmAudio.pause();
    }
    this.stopAmbientRainFallback();
  }

  public resumeBgm(): void {
    if (!this.bgmPlaying) return;
    if (this.bgmAudio && !this.muted && this.bgmAudio.paused) {
      void this.bgmAudio.play().catch(() => {});
    }
  }

  public stopBgm(): void {
    this.bgmPlaying = false;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
    this.stopAmbientRainFallback();
  }

  // Subtle ambient rain noise generator as backdrop / fallback
  private startAmbientRainFallback(): void {
    if (this.rainNoiseNode || this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // 2 seconds of pink/filtered noise for soft rain patter
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2) * 0.06;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(this.muted ? 0 : 0.035, ctx.currentTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      this.rainNoiseNode = noise;
      this.rainGainNode = gain;
    } catch {
      // Fallback unavailable
    }
  }

  private stopAmbientRainFallback(): void {
    if (this.rainNoiseNode) {
      try {
        (this.rainNoiseNode as AudioBufferSourceNode).stop();
        this.rainNoiseNode.disconnect();
      } catch {
        // Ignore
      }
      this.rainNoiseNode = null;
      this.rainGainNode = null;
    }
  }

  // ================= Sound Effects (SFX) =================

  /**
   * 1. 跳躍音效 (Jump Sound)
   * A buoyant, springy upward chirp (280Hz -> 540Hz) with smooth soft decay.
   */
  public playJump(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(540, t + 0.11);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  /**
   * 翻轉跳躍音效 (Flip Jump Sound)
   * An energetic double-harmonic whoosh with subtle modulation for aerial rotation.
   */
  public playFlip(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(740, t + 0.18);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(480, t);
    osc2.frequency.exponentialRampToValueAtTime(1020, t + 0.2);

    gain.gain.setValueAtTime(0.26, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + 0.23);
    osc2.stop(t + 0.23);
  }

  /**
   * 2. 碰到障礙物音效 (Obstacle Hit Sound)
   * A cartoonish soft thud + splash noise with descending pitch (220Hz -> 65Hz).
   */
  public playObstacleHit(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // 1. Low downward thud
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.22);

    oscGain.gain.setValueAtTime(0.36, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);

    // 2. Water splash noise burst
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.16);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750, t);
      filter.frequency.exponentialRampToValueAtTime(280, t + 0.15);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      whiteNoise.start(t);
      whiteNoise.stop(t + 0.16);
    } catch {
      // Noise failed, thud will suffice
    }
  }

  /**
   * 3. 吃到道具音效 (Pickup Item Sound)
   * Specially tailored for each power-up:
   * - shield: Resonant crystal protective bell
   * - heal: Warm uplifting major arpeggio
   * - rainbow: Shimmering energetic harmonic sweep
   * - star: Cheerful arcade double-coin chime
   */
  public playPickup(kind: 'shield' | 'heal' | 'rainbow' | 'star'): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    if (kind === 'shield') {
      // Dual crystal bell chime (C5 523Hz + G5 784Hz + high octave 1568Hz)
      const freqs = [523.25, 783.99, 1567.98];
      const gains = [0.22, 0.18, 0.08];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(gains[idx], t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
      });
    } else if (kind === 'heal') {
      // Warm uplifting major arpeggio: C5 -> E5 -> G5 -> C6
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const noteTime = t + i * 0.055;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);
        gain.gain.setValueAtTime(0.24, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(noteTime);
        osc.stop(noteTime + 0.24);
      });
    } else if (kind === 'rainbow') {
      // Shimmering rapid sweep with vibrato (440Hz -> 1320Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(1320, t + 0.26);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.3);
    } else {
      // Star / coin ping (659Hz -> 880Hz)
      [659.25, 880.0].forEach((freq, i) => {
        const noteTime = t + i * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);
        gain.gain.setValueAtTime(0.22, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(noteTime);
        osc.stop(noteTime + 0.18);
      });
    }
  }

  /**
   * 歌曲字母撿拾音效 (Letter Pickup Sound)
   * - Regular song letter: Cheerful marimba note ping (784Hz G5)
   * - Lucky song letter hit: Golden magical crystal sparkle arpeggio (G5, B5, D6, G6)
   */
  public playLetterPickup(isLucky: boolean): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    if (isLucky) {
      // Golden magical crystal sparkle
      const notes = [783.99, 987.77, 1174.66, 1567.98];
      notes.forEach((freq, idx) => {
        const noteTime = t + idx * 0.045;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);
        gain.gain.setValueAtTime(0.24, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(noteTime);
        osc.stop(noteTime + 0.26);
      });
    } else {
      // Sweet marimba / bell ping (G5 784Hz + octave harmonic)
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(783.99, t);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1567.98, t);

      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc2.start(t);
      osc.stop(t + 0.16);
      osc2.stop(t + 0.16);
    }
  }

  /**
   * 歌曲收集達成慶祝音效 (Song Complete Fanfare)
   * Staggered joyous chords with triumphant sparkle
   */
  public playSongComplete(isLucky: boolean): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const chord = isLucky
      ? [698.46, 880.0, 1046.5, 1396.91, 1760.0] // F major joyous victory
      : [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C major bright fanfare

    chord.forEach((freq, i) => {
      const noteTime = t + i * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.26, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.48);
    });
  }

  /**
   * 挑戰波次升級音效 (Wave Speed Up Sound)
   */
  public playWaveUp(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(920, t + 0.28);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.32);
  }

  /**
   * 遊戲結束音效 (Game Over Sound)
   * Gentle, soft melancholy lo-fi notes (E4 -> C4 -> A3)
   */
  public playGameOver(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const notes = [329.63, 261.63, 220.0];
    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.13;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);
      gain.gain.setValueAtTime(0.25, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.4);
    });
  }
}

export const audioManager = new AudioManager();
