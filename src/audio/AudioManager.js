// AudioManager.js - Sound effects and music
export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicVolume = 0.5;
    this.sfxVolume = 1.0;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);

      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.audioContext.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  resume() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // Simple tone-based sound effects (no audio files needed)
  playTone(frequency, duration = 0.1, type = 'square', volume = 0.3) {
    if (!this.initialized) return;
    this.resume();

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  playBlockBreak() { this.playTone(200, 0.08, 'square', 0.2); }
  playBlockPlace() { this.playTone(300, 0.06, 'square', 0.2); }
  playStep() { this.playTone(100 + Math.random() * 50, 0.04, 'triangle', 0.05); }
  playHurt() { this.playTone(400, 0.15, 'sawtooth', 0.3); }
  playXP() { this.playTone(600, 0.1, 'sine', 0.2); this.playTone(800, 0.1, 'sine', 0.15); }
}
