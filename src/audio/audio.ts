// Áudio 100% sintetizado (Web Audio): SFX com pool de vozes e música generativa por estados (GDD §15).
export type MusicState = 'title' | 'exploration' | 'combat' | 'boss1' | 'boss2' | 'boss3' | 'hub' | 'victory' | 'silent';

export class AudioManager {
  ctx: AudioContext | null = null;
  private master!: GainNode; private sfxBus!: GainNode; private musicBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private voices = 0; private readonly maxVoices = 24;
  private music: Music | null = null;
  volMusic = 0.6; volSfx = 0.8; muted = false;
  unlocked = false;

  unlock() {
    if (this.unlocked) { this.ctx?.resume(); return; }
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      comp.connect(this.master);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(comp);
      this.musicBus = this.ctx.createGain(); this.musicBus.connect(comp);
      const len = this.ctx.sampleRate * 1.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.music = new Music(this.ctx, this.musicBus, this.noiseBuf);
      this.unlocked = true;
      this.applyVolumes();
      document.addEventListener('visibilitychange', () => { if (!this.ctx) return; if (document.hidden) this.ctx.suspend(); else this.ctx.resume(); });
    } catch (e) { console.warn('[audio] indisponível', e); }
  }
  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.muted ? 0 : 1;
    this.sfxBus.gain.value = this.volSfx * 0.9;
    this.musicBus.gain.value = this.volMusic * 0.55;
  }
  setMusic(s: MusicState) { this.music?.setState(s); }
  update(dt: number) { this.music?.update(dt); }

  private env(g: GainNode, t: number, a: number, peak: number, dec: number) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  private voice(dur: number): { t: number; out: GainNode } | null {
    if (!this.ctx || this.voices >= this.maxVoices) return null;
    this.voices++;
    setTimeout(() => this.voices--, (dur + 0.1) * 1000);
    const out = this.ctx.createGain(); out.connect(this.sfxBus);
    return { t: this.ctx.currentTime, out };
  }
  private osc(type: OscillatorType, f0: number, f1: number, dur: number, peak: number, at = 0, dest?: AudioNode) {
    const v = this.voice(dur + at); if (!v) return;
    const o = this.ctx!.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, v.t + at); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), v.t + at + dur);
    const g = this.ctx!.createGain(); this.env(g, v.t + at, 0.005, peak, dur);
    o.connect(g); g.connect(dest ?? v.out); o.start(v.t + at); o.stop(v.t + at + dur + 0.05);
  }
  private noise(dur: number, peak: number, filter: BiquadFilterType, f0: number, f1: number, q = 1, at = 0) {
    const v = this.voice(dur + at); if (!v) return;
    const s = this.ctx!.createBufferSource(); s.buffer = this.noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ctx!.createBiquadFilter(); f.type = filter; f.Q.value = q;
    f.frequency.setValueAtTime(f0, v.t + at); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), v.t + at + dur);
    const g = this.ctx!.createGain(); this.env(g, v.t + at, 0.004, peak, dur);
    s.connect(f); f.connect(g); g.connect(v.out); s.start(v.t + at, Math.random()); s.stop(v.t + at + dur + 0.05);
  }
  /** metal: FM inarmônico */
  private clang(freq: number, dur: number, peak: number, at = 0) {
    const v = this.voice(dur + at); if (!v) return;
    const c = this.ctx!; const t = v.t + at;
    const car = c.createOscillator(); const mod = c.createOscillator(); const mg = c.createGain();
    car.frequency.value = freq; mod.frequency.value = freq * 2.76; mg.gain.setValueAtTime(freq * 3, t); mg.gain.exponentialRampToValueAtTime(10, t + dur);
    mod.connect(mg); mg.connect(car.frequency);
    const g = c.createGain(); this.env(g, t, 0.002, peak, dur);
    car.connect(g); g.connect(v.out); car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  }
  play(name: string, vol = 1) {
    if (!this.ctx || this.muted) return;
    const r = Math.random;
    switch (name) {
      case 'step': this.noise(0.06, 0.12 * vol, 'bandpass', 900 + r() * 400, 300, 1.5); this.clang(180 + r() * 40, 0.05, 0.02 * vol); break;
      case 'stepHeavy': this.noise(0.12, 0.35 * vol, 'lowpass', 300, 60, 1); this.osc('sine', 70, 40, 0.15, 0.3 * vol); break;
      case 'whoosh': this.noise(0.18, 0.25 * vol, 'bandpass', 600, 2400, 2); break;
      case 'whooshHeavy': this.noise(0.35, 0.35 * vol, 'bandpass', 300, 1500, 1.5); this.osc('sawtooth', 90, 180, 0.3, 0.05 * vol); break;
      case 'hit': this.clang(420 + r() * 120, 0.18, 0.28 * vol); this.noise(0.08, 0.35 * vol, 'highpass', 2000, 800, 0.7); this.osc('square', 160, 60, 0.08, 0.12 * vol); break;
      case 'hitHeavy': this.clang(180 + r() * 40, 0.5, 0.4 * vol); this.noise(0.25, 0.5 * vol, 'lowpass', 2500, 120, 0.8); this.osc('sine', 90, 30, 0.35, 0.6 * vol); break;
      case 'crit': this.clang(880, 0.3, 0.2 * vol); this.osc('triangle', 1400, 2200, 0.15, 0.08 * vol); break;
      case 'block': this.clang(300, 0.25, 0.3 * vol); this.noise(0.1, 0.2 * vol, 'bandpass', 1500, 600, 2); break;
      case 'parry': this.clang(1200, 0.5, 0.25 * vol); this.osc('triangle', 1800, 2600, 0.25, 0.12 * vol); this.osc('sine', 600, 1200, 0.2, 0.1 * vol); break;
      case 'hurt': this.osc('sawtooth', 300, 80, 0.25, 0.18 * vol); this.noise(0.15, 0.3 * vol, 'bandpass', 1200, 300, 1); break;
      case 'dodge': this.noise(0.22, 0.2 * vol, 'highpass', 800, 3000, 0.8); this.osc('sine', 300, 700, 0.15, 0.05 * vol); break;
      case 'jump': this.osc('sine', 220, 440, 0.12, 0.08 * vol); this.noise(0.08, 0.1 * vol, 'highpass', 1500, 2500, 1); break;
      case 'land': this.noise(0.1, 0.25 * vol, 'lowpass', 600, 100, 1); this.clang(150, 0.08, 0.06 * vol); break;
      case 'servo': this.osc('sawtooth', 120 + r() * 40, 220, 0.25, 0.04 * vol); break;
      case 'pickup': this.osc('triangle', 880, 1320, 0.08, 0.12 * vol); this.osc('triangle', 1320, 1760, 0.1, 0.1 * vol, 0.07); break;
      case 'part': for (const [i, f] of [523, 659, 784, 1046].entries()) this.osc('triangle', f, f, 0.18, 0.13 * vol, i * 0.08); break;
      case 'equip': this.clang(240, 0.2, 0.25 * vol); this.clang(360, 0.2, 0.2 * vol, 0.15); this.osc('sawtooth', 100, 400, 0.4, 0.06 * vol, 0.05); this.osc('triangle', 784, 1046, 0.3, 0.1 * vol, 0.4); break;
      case 'ui': this.osc('triangle', 660, 660, 0.05, 0.08 * vol); break;
      case 'uiBack': this.osc('triangle', 440, 330, 0.07, 0.08 * vol); break;
      case 'deny': this.osc('square', 180, 140, 0.15, 0.08 * vol); break;
      case 'terminal': for (const [i, f] of [392, 523, 659].entries()) this.osc('sine', f, f, 0.2, 0.1 * vol, i * 0.09); break;
      case 'alert': this.osc('square', 700, 700, 0.08, 0.08 * vol); this.osc('square', 900, 900, 0.08, 0.08 * vol, 0.1); break;
      case 'telegraph': this.osc('sawtooth', 200, 600, 0.35, 0.06 * vol); break;
      case 'charge': this.noise(0.6, 0.25 * vol, 'lowpass', 150, 600, 4); this.osc('sawtooth', 50, 120, 0.6, 0.12 * vol); break;
      case 'saw': this.osc('sawtooth', 300, 1200, 0.6, 0.06 * vol); this.noise(0.6, 0.12 * vol, 'bandpass', 3000, 5000, 4); break;
      case 'zap': this.noise(0.25, 0.3 * vol, 'bandpass', 4000, 1500, 3); this.osc('square', 120, 60, 0.2, 0.1 * vol); break;
      case 'beam': this.osc('sawtooth', 600, 300, 0.5, 0.07 * vol); this.osc('sine', 1200, 600, 0.5, 0.05 * vol); break;
      case 'explode': this.noise(0.9, 0.7 * vol, 'lowpass', 1600, 60, 0.7); this.osc('sine', 80, 25, 0.8, 0.7 * vol); this.clang(140, 0.6, 0.15 * vol); break;
      case 'stomp': this.noise(0.6, 0.8 * vol, 'lowpass', 400, 40, 1); this.osc('sine', 60, 22, 0.7, 0.9 * vol); this.clang(90, 0.5, 0.2 * vol); break;
      case 'press': this.noise(0.4, 0.6 * vol, 'lowpass', 800, 60, 1); this.clang(110, 0.5, 0.3 * vol); this.osc('sine', 70, 30, 0.4, 0.5 * vol); break;
      case 'gate': this.osc('sawtooth', 60, 80, 1.3, 0.05 * vol); this.noise(1.3, 0.15 * vol, 'bandpass', 400, 250, 3); this.clang(200, 0.4, 0.15 * vol, 1.3); break;
      case 'break': this.noise(0.5, 0.6 * vol, 'lowpass', 3000, 200, 0.7); for (let i = 0; i < 4; i++) this.clang(300 + r() * 500, 0.3, 0.12 * vol, i * 0.06); break;
      case 'winch': this.osc('sawtooth', 80, 300, 1.2, 0.08 * vol); this.noise(1.2, 0.15 * vol, 'bandpass', 1500, 3000, 6); break;
      case 'levelup': for (const [i, f] of [523, 659, 784, 1046, 1318].entries()) this.osc('square', f, f, 0.15, 0.06 * vol, i * 0.07); break;
      case 'death': this.osc('sawtooth', 400, 40, 1.4, 0.15 * vol); this.noise(1.2, 0.3 * vol, 'lowpass', 1200, 80, 1); break;
      case 'enemyDie': this.noise(0.5, 0.4 * vol, 'lowpass', 2000, 100, 0.8); this.clang(200 + r() * 100, 0.4, 0.2 * vol); this.osc('square', 300, 50, 0.4, 0.08 * vol); break;
      case 'bossRoar': this.osc('sawtooth', 55, 40, 1.8, 0.35 * vol); this.osc('square', 82, 60, 1.8, 0.12 * vol); this.noise(1.8, 0.4 * vol, 'lowpass', 500, 80, 2); break;
      case 'pixel': this.osc('sine', 1200 + r() * 300, 1800, 0.05, 0.05 * vol); this.osc('sine', 1600, 1100, 0.05, 0.05 * vol, 0.06); break;
      case 'steal': this.osc('triangle', 1200, 400, 0.4, 0.08 * vol); break;
    }
  }
}

/** Música generativa industrial: pad + baixo + percussão metálica; intensidade por estado, crossfade de camadas. */
class Music {
  private layers: Record<'pad' | 'bass' | 'perc' | 'lead' | 'drive', GainNode>;
  private target: Record<string, number> = { pad: 0, bass: 0, perc: 0, lead: 0, drive: 0 };
  private state: MusicState = 'silent';
  private nextNote = 0; private step = 0; private tempo = 92;
  private root = 45; // A2
  private chordIdx = 0;
  constructor(private ctx: AudioContext, out: GainNode, private noise: AudioBuffer) {
    const mk = () => { const g = ctx.createGain(); g.gain.value = 0; g.connect(out); return g; };
    this.layers = { pad: mk(), bass: mk(), perc: mk(), lead: mk(), drive: mk() };
    // reverb simples (eco) para o pad
    const delay = ctx.createDelay(); delay.delayTime.value = 0.38; const fb = ctx.createGain(); fb.gain.value = 0.35; const lp = ctx.createBiquadFilter(); lp.frequency.value = 1800;
    this.layers.lead.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(out);
  }
  setState(s: MusicState) {
    if (s === this.state) return;
    this.state = s;
    const T: Record<MusicState, [number, number, number, number, number, number]> = {
      // pad bass perc lead drive tempo
      title: [0.5, 0.25, 0, 0.3, 0, 80], exploration: [0.45, 0.3, 0.18, 0.18, 0, 88], hub: [0.5, 0.2, 0.08, 0.25, 0, 76],
      combat: [0.35, 0.55, 0.55, 0.15, 0.4, 118], boss1: [0.35, 0.6, 0.6, 0.2, 0.55, 124], boss2: [0.3, 0.7, 0.7, 0.25, 0.7, 132], boss3: [0.35, 0.8, 0.8, 0.3, 0.9, 140],
      victory: [0.6, 0.3, 0.1, 0.5, 0, 84], silent: [0, 0, 0, 0, 0, 90],
    };
    const v = T[s];
    this.target = { pad: v[0], bass: v[1], perc: v[2], lead: v[3], drive: v[4] };
    this.tempo = v[5];
    this.root = s.startsWith('boss') ? 40 : s === 'combat' ? 43 : 45;
  }
  private mtof(m: number) { return 440 * Math.pow(2, (m - 69) / 12); }
  private tone(layer: GainNode, type: OscillatorType, midi: number, t: number, dur: number, vol: number, cutoff = 2000) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = this.mtof(midi);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.05, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(layer); o.start(t); o.stop(t + dur + 0.05);
  }
  private hit(layer: GainNode, t: number, freq: number, dur: number, vol: number, type: BiquadFilterType = 'bandpass') {
    const s = this.ctx.createBufferSource(); s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 2;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(layer); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  private kick(layer: GainNode, t: number, vol: number) {
    const o = this.ctx.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(layer); o.start(t); o.stop(t + 0.32);
  }
  update(dt: number) {
    const k = 1 - Math.exp(-dt * 0.8);
    for (const [n, g] of Object.entries(this.layers)) g.gain.value += (this.target[n] - g.gain.value) * k;
    if (this.state === 'silent') return;
    const now = this.ctx.currentTime;
    if (this.nextNote < now) this.nextNote = now + 0.05;
    const s16 = 60 / this.tempo / 4;
    // progressão modal sombria: i - VI - iv - v (eólio)
    const prog = [[0, 3, 7, 10], [-4, 0, 3, 7], [5, 8, 12, 15], [7, 10, 14, 17]];
    while (this.nextNote < now + 0.25) {
      const t = this.nextNote, st = this.step % 64, bar = Math.floor(this.step / 16);
      const chord = prog[bar % 4];
      if (st % 16 === 0) {
        this.chordIdx = bar % 4;
        for (const n of chord) this.tone(this.layers.pad, 'sawtooth', this.root + 12 + n, t, s16 * 16 * 1.05, 0.035, 900);
        this.tone(this.layers.pad, 'triangle', this.root + 24 + chord[1], t, s16 * 16, 0.03, 2400);
      }
      // baixo
      const bassPat = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
      if (bassPat[st % 16]) this.tone(this.layers.bass, 'sawtooth', this.root + chord[0] + (st % 8 === 6 ? 12 : 0), t, s16 * 1.8, 0.16, 420);
      // percussão metálica (sucata)
      if (st % 8 === 0) this.kick(this.layers.perc, t, 0.5);
      if (st % 8 === 4) this.hit(this.layers.perc, t, 1800, 0.12, 0.25);
      if (st % 2 === 1 && Math.random() < 0.6) this.hit(this.layers.perc, t, 6500, 0.03, 0.08, 'highpass');
      if (st % 16 === 14) this.hit(this.layers.perc, t, 400 + Math.random() * 300, 0.25, 0.18);
      // drive de combate
      if (st % 4 === 0) this.kick(this.layers.drive, t, 0.55);
      if (st % 2 === 0) this.tone(this.layers.drive, 'square', this.root + chord[0] + 12, t, s16 * 0.8, 0.05, 1200);
      if (st % 8 === 4) this.hit(this.layers.drive, t, 2400, 0.18, 0.35);
      // melodia esparsa (eco)
      if (st % 4 === 2 && Math.random() < 0.28) { const n = chord[Math.floor(Math.random() * 4)] + 24 + (Math.random() < 0.3 ? 12 : 0); this.tone(this.layers.lead, 'triangle', this.root + n, t, s16 * 3, 0.05, 3000); }
      this.nextNote += s16; this.step++;
    }
  }
}
