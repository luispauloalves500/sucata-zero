// Orquestrador: passo fixo 60 Hz, setores, missões, saves, morte/retorno, chefe, UI e API de teste (window.__SZ).
import * as THREE from 'three';
import { Physics } from '../engine/physics';
import { Renderer, isTouchDevice } from '../engine/renderer';
import { CameraRig } from '../engine/camera';
import { Assets } from '../engine/assets';
import { Input } from '../input/input';
import { TouchControls } from '../input/touch';
import { AudioManager } from '../audio/audio';
import { Particles, Telegraphs } from '../fx/particles';
import { Beacon } from '../fx/beacon';
import { EventBus } from '../core/events';
import { newGame, type GameState } from '../game/state';
import { computeStats, equip as doEquip, unequip as doUnequip, craft as doCraft, upgrade as doUpgrade, dismantle as doDismantle, findPart, grantPart, grantMaterials, type Stats } from '../items/inventory';
import { ITEMS, SLOTS, type Slot } from '../content/items';
import { ENEMIES } from '../content/enemies';
import { QUEST_BY_ID } from '../content/quests';
import { questEvent, questStage, mainQuest, activeQuests, countProgress, type QuestEvent, type QuestUpdate } from '../progression/quests';
import { addXp, xpToNext } from '../progression/leveling';
import { DIFFICULTY } from '../combat/damage';
import { SaveStore, SLOT_IDS, parseImport, type SaveSlot } from '../persistence/save';
import { loadSettings, saveSettings, type Settings } from './settings';
import { buildW01, type Level, type Interactable, type SpawnDef } from '../world/level-w01';
import { Loot } from '../world/loot';
import { Player } from '../player/player';
import { Enemy } from '../ai/enemy';
import { Boss } from '../ai/boss';
import { Animator } from '../engine/animator';
import { Hud, type HudFrame, esc } from '../ui/hud';
import { Screens } from '../ui/screens';
import { Workshop } from '../ui/workshop';
import { INTRO, LINES, MEMORIES, ENDING, type Line } from '../content/story';
import type { GameCtx, Hurtable, EnemyHit } from './context';
import { clamp } from '../core/math';

export const VERSION = 'v1.0.0';
type Mode = 'boot' | 'title' | 'play' | 'pause' | 'menu' | 'dead' | 'ending';
export function fmtTime(sec: number) { const m = Math.floor(sec / 60), h = Math.floor(m / 60); return h ? `${h}h${String(m % 60).padStart(2, '0')}` : `${m} min`; }

export class Game implements GameCtx {
  scene = new THREE.Scene();
  physics = new Physics();
  input!: Input; cam!: CameraRig; audio = new AudioManager(); fx!: Particles; tele!: Telegraphs; events = new EventBus();
  state: GameState = newGame(); stats: Stats = computeStats(this.state); settings: Settings = loadSettings(); level!: Level;
  renderer!: Renderer; assets = new Assets(); touch!: TouchControls; hud!: Hud; screens!: Screens; saves = SaveStore.create();
  player!: Player; enemies: Enemy[] = []; boss: Boss | null = null; loot!: Loot;
  pixel!: { root: THREE.Object3D; anim: Animator; pos: THREE.Vector3 }; ferro!: { root: THREE.Object3D; anim: Animator };
  attackTokens = new Set<string>();
  time = 0; mode: Mode = 'boot';
  difficultyMul = { dmgTaken: 1, telegraph: 1, extraAttacks: false };
  acc = 0; last = 0; hitstopT = 0; frameDt = 0;
  spawnedSectors = new Set<string>(); killedSession = new Set<string>();
  sector = ''; arena = { wave: 0, t: 0, active: false, done: false };
  bossFight = false;
  workshop: Workshop | null = null;
  fpsAcc = { t: 0, n: 0, txt: '' };
  autosaveT = 0;
  tmp = new THREE.Vector3();
  interactTarget: Interactable | null = null;
  errors: string[] = [];
  said = new Set<string>();
  stageHooksRan = new Set<string>();
  cinematic = 0;
  padPrev: boolean[] = [];
  container: HTMLElement;
  frames = 0;
  beacon!: Beacon; sideBeacons: Beacon[] = [];

  constructor(container: HTMLElement) { this.container = container; }

  // ------------------------------------------------------------------ boot
  async boot() {
    const ui = document.createElement('div'); ui.id = 'ui'; this.container.appendChild(ui);
    this.screens = new Screens(ui);
    this.screens.onSound = (n) => this.audio.play(n);
    const ld = this.screens.loading();
    window.addEventListener('error', (e) => this.reportError(String(e.message)));
    window.addEventListener('unhandledrejection', (e) => this.reportError('Promise: ' + String((e as PromiseRejectionEvent).reason?.message ?? (e as PromiseRejectionEvent).reason)));
    try {
      const canvas = document.createElement('canvas'); canvas.id = 'game'; this.container.prepend(canvas);
      ld.set(0.05, 'Inicializando vídeo…');
      try { this.renderer = new Renderer(canvas, this.settings.quality); }
      catch (e) { ld.done(); this.screens.error('WebGL indisponível', 'Seu navegador ou dispositivo não conseguiu criar um contexto WebGL2.\n\n' + String(e), () => location.reload()); return; }
      this.renderer.onContextLost = () => { if (this.mode === 'play') this.pause(); this.reportError('Contexto WebGL perdido — tentando restaurar…'); };
      this.renderer.onContextRestored = () => this.hud?.toast('Vídeo restaurado', 'info');
      this.cam = new CameraRig(innerWidth / innerHeight);
      this.input = new Input(canvas);
      ld.set(0.12, 'Inicializando física…');
      await this.physics.init();
      ld.set(0.2, 'Carregando modelos 3D…');
      await this.assets.loadAll((d, t, label) => ld.set(0.2 + (d / t) * 0.55, `Carregando modelos 3D… ${label} (${d}/${t})`));
      if (this.assets.errors.length) this.reportError('Falha em modelos: ' + this.assets.errors.map((e) => `${e.id} (${e.message})`).join(', ') + ' — usando versão de emergência.');
      ld.set(0.8, 'Montando o Ferro-Velho 09…');
      await new Promise((r) => setTimeout(r, 0));
      const prof = this.renderer.profile;
      this.level = buildW01(this.scene, this.physics, { propDensity: prof.propDensity, shadows: prof.shadows, shadowSize: prof.shadowSize, drawDistance: prof.drawDistance });
      this.fx = new Particles(this.scene); this.fx.density = prof.particles;
      this.tele = new Telegraphs(this.scene);
      this.beacon = new Beacon(this.scene, 0xffa62b, 18);
      for (let i = 0; i < 4; i++) this.sideBeacons.push(new Beacon(this.scene, 0x39f0ff, 9));
      this.loot = new Loot(this.scene, this.assets);
      this.player = new Player(this, this.assets, new THREE.Vector3(-3, 0.5, -9.5));
      this.makeNpcs();
      this.hud = new Hud(ui); this.hud.setVisible(false);
      this.touch = new TouchControls(this.input, ui); this.touch.show(false);
      this.applySettings();
      this.wireEvents();
      ld.set(0.95, 'Compilando shaders…');
      this.renderer.r.compile(this.scene, this.cam.cam);
      ld.set(1, 'Pronto');
      window.addEventListener('resize', () => this.onResize());
      this.onResize();
      ld.done();
      await this.showTitle();
      this.last = performance.now();
      this.renderer.r.setAnimationLoop(() => this.frame());
      this.exposeTestApi();
      document.addEventListener('visibilitychange', () => { if (document.hidden && this.mode === 'play') this.pause(); });
    } catch (e: any) {
      console.error(e);
      ld.done();
      this.screens.error('Falha ao iniciar', String(e?.stack ?? e), () => location.reload());
    }
  }
  reportError(msg: string) {
    this.errors.push(msg);
    console.error('[sucata]', msg);
    this.hud?.toast('Erro: ' + msg.slice(0, 80), 'warn');
  }
  onResize() {
    this.renderer.resize();
    this.cam.cam.aspect = innerWidth / innerHeight; this.cam.cam.updateProjectionMatrix();
    this.fx.setScale(innerHeight);
    document.body.classList.toggle('portrait', isTouchDevice() && innerHeight > innerWidth);
  }
  applySettings() {
    const s = this.settings;
    this.audio.volMusic = s.music; this.audio.volSfx = s.sfx; this.audio.muted = s.muted; this.audio.applyVolumes();
    this.input.sensitivity = s.sensitivity; this.input.invertY = s.invertY;
    this.cam.shoulder = s.shoulder; this.cam.shakeEnabled = s.shake;
    if (this.touch) this.touch.fixed = s.fixedJoystick;
    document.documentElement.style.setProperty('--hud-scale', String(s.hudScale));
    document.documentElement.style.setProperty('--sub-scale', String(s.subtitlesScale));
    document.body.classList.toggle('hc', s.highContrast);
    document.body.classList.toggle('touch', isTouchDevice());
    saveSettings(s);
  }
  makeNpcs() {
    const pi = this.assets.instance('pixel');
    this.pixel = { root: pi.root, anim: new Animator(pi.root, pi.clips), pos: new THREE.Vector3(-2, 2, -9) };
    this.pixel.anim.play('idle', { loop: true });
    const pl = new THREE.PointLight(0x39f0ff, 3, 5, 2); pl.position.y = 0.1; pi.root.add(pl);
    this.scene.add(pi.root);
    const fi = this.assets.instance('ferro7');
    this.ferro = { root: fi.root, anim: new Animator(fi.root, fi.clips) };
    fi.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
    this.scene.add(fi.root);
  }

  // ------------------------------------------------------------------ GameCtx
  targets(): Hurtable[] { const t: Hurtable[] = this.enemies.filter((e) => e.alive); if (this.boss?.alive && this.boss.state !== 'dormant') t.push(this.boss); return t; }
  hitstop(s: number) { this.hitstopT = Math.max(this.hitstopT, s); }
  shake(v: number) { this.cam.addShake(this.settings.reduceFlashes ? v * 0.5 : v); }
  damageNumber(pos: THREE.Vector3, amount: number, crit: boolean, color?: string) {
    if (!this.settings.damageNumbers) return;
    const p = this.project(pos); if (p.on) this.hud.damage(p.x, p.y, amount, crit, color);
  }
  heavyImpact(c: THREE.Vector3) {
    for (const [id, p] of this.level.plates) {
      if (p.broken) continue;
      const d = Math.hypot(c.x - p.pos.x, c.z - p.pos.z);
      if (d < p.w / 2 + 1.2) this.breakPlate(id, true);
    }
  }
  project(p: THREE.Vector3) {
    const v = this.tmp.copy(p).project(this.cam.cam);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, on: v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05, z: v.z, nx: v.x, ny: v.y };
  }
  wireEvents() {
    const E = this.events;
    E.on('TOAST', (p) => this.hud.toast(p.text, p.kind));
    E.on('SAY', (p) => this.hud.say(p.who, p.text, p.dur));
    E.on('MODULE_ACTIVATED', () => this.useAbility());
    E.on('DAMAGE_APPLIED', (p) => { if (p.target === 'player' && this.player.hp <= 0 && this.mode === 'play') this.onPlayerDeath(); });
  }
  say(l: Line, once?: string) {
    if (once) { if (this.said.has(once)) return; this.said.add(once); }
    this.hud.say(l.who, l.text, l.dur ?? 3);
    if (l.who === 'PÍXEL') this.audio.play('pixel');
  }
  flag(k: string) { return !!this.state.flags[k]; }
  setFlag(k: string, v: boolean | number = true) { this.state.flags[k] = v; }

  // ------------------------------------------------------------------ fluxo de telas
  async showTitle() {
    this.mode = 'title';
    this.hud.setVisible(false); this.touch.show(false);
    this.audio.setMusic('title');
    this.cam.override = { pos: new THREE.Vector3(14, 6, -4), look: new THREE.Vector3(0, 1.4, 6), blend: 1 };
    this.player.teleport(new THREE.Vector3(-3, 0.55, -9.5), 0.6);
    const meta = await this.saves.meta('auto').catch(() => null);
    this.screens.clear();
    this.screens.title({
      version: VERSION, hasContinue: !!meta,
      onContinue: () => this.loadSlot('auto'),
      onNew: () => this.screens.difficulty((d) => { this.screens.clear(); this.startNew(d); }),
      onLoad: () => this.slotMenu('load'),
      onOptions: () => this.openOptions(),
      onCredits: () => this.screens.info('Créditos', `<p><b>SUCATA ZERO: A Última Máquina</b> — Episódio 1.</p><p>Design, código, modelos 3D procedurais, texturas, música generativa e efeitos sonoros sintetizados feitos inteiramente para este projeto.</p><p>Tecnologia: Three.js, Rapier (física), Vite, TypeScript.</p><p class="muted">${VERSION} — sem assets de terceiros.</p>`),
    });
    const unlock = () => { this.audio.unlock(); this.audio.setMusic(this.mode === 'title' ? 'title' : this.sectorMusic()); };
    window.addEventListener('pointerdown', unlock, { once: true }); window.addEventListener('keydown', unlock, { once: true });
  }
  openOptions() {
    const extras = this.mode !== 'title' ? [{ label: `Dificuldade: ${({ explorer: 'Explorador', standard: 'Padrão', veteran: 'Veterano' } as const)[this.state.difficulty]}`, act: () => this.screens.difficulty((d) => { this.state.difficulty = d; this.applyDifficulty(); this.screens.pop(); this.screens.pop(); this.hud.toast('Dificuldade alterada', 'info'); }) }] : [];
    this.screens.options(this.settings, (s) => { this.applySettings(); if (s.quality !== this.lastQuality) { this.lastQuality = s.quality; this.renderer.setQuality(s.quality); } }, extras);
  }
  lastQuality: Settings['quality'] = loadSettings().quality;
  async slotMenu(mode: 'load' | 'save') {
    const items = [];
    for (const id of SLOT_IDS) {
      if (mode === 'save' && id === 'auto') continue;
      const m = await this.saves.meta(id).catch(() => null);
      const label = id === 'auto' ? 'Automático' : `Slot ${id.slice(-1)}`;
      const sub = m ? `Nível ${m.level} • ${fmtTime(m.playtime)} • ${new Date(m.savedAt).toLocaleString('pt-BR')}` : 'vazio';
      items.push({ label, sub, disabled: mode === 'load' && !m, act: () => { if (mode === 'load') { this.screens.clear(); this.loadSlot(id); } else this.saveTo(id, true); } });
    }
    this.screens.list(mode === 'load' ? 'Carregar' : 'Salvar', [
      ...items,
      mode === 'save' ? { label: 'Exportar save (arquivo)', act: () => this.exportSave() } : { label: 'Importar save (arquivo)', act: () => this.importSave() },
    ]);
  }
  exportSave() {
    const blob = new Blob([this.saves.exportJson(this.state)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `sucata-zero-${Date.now()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  importSave() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
    inp.onchange = async () => {
      const f = inp.files?.[0]; if (!f) return;
      if (f.size > 512 * 1024) { this.hud.toast('Arquivo grande demais', 'warn'); return; }
      const r = parseImport(await f.text());
      if (!r.ok) { this.screens.info('Importação recusada', `<p>O arquivo não é um save válido.</p><pre>${esc(r.errors.join('\n'))}</pre>`); return; }
      await this.saves.save('slot3', r.state);
      this.screens.clear(); this.startFromState(r.state);
      this.hud.toast('Save importado (copiado para o Slot 3)', 'info');
    };
    inp.click();
  }
  async loadSlot(slot: SaveSlot) {
    const r = await this.saves.load(slot);
    if (!r.ok) { this.screens.info('Não foi possível carregar', `<p>${esc(r.errors.join('; '))}</p>`); return; }
    this.screens.clear();
    this.startFromState(r.state);
  }
  async saveTo(slot: SaveSlot, notify = false) {
    try {
      this.state.player.hp = Math.max(1, Math.round(this.player.hp)); this.state.player.energy = Math.round(this.player.en);
      await this.saves.save(slot, this.state);
      this.events.emit('SAVE_COMMITTED', { slot });
      if (notify) { this.hud.toast(`Jogo salvo (${slot === 'auto' ? 'automático' : 'slot ' + slot.slice(-1)})`, 'info'); this.screens.pop(); }
      else this.hud.toast('Progresso salvo', 'info');
    } catch (e: any) { this.reportError('Falha ao salvar: ' + (e?.message ?? e)); }
  }
  startNew(d: GameState['difficulty']) {
    const s = newGame(d);
    s.quests['1-1'] = { state: 'active', stage: 0 };
    this.said.clear();
    this.startFromState(s, true);
  }
  applyDifficulty() {
    const D = DIFFICULTY[this.state.difficulty];
    this.difficultyMul = { dmgTaken: D.dmgTaken, telegraph: D.telegraph, extraAttacks: D.extraAttacks };
  }

  /** reconstrói o mundo a partir do estado (novo jogo, carregar) */
  startFromState(s: GameState, fresh = false) {
    this.state = s;
    this.applyDifficulty();
    this.cam.override = null;
    this.clearEnemies(); this.loot.clearAll();
    this.killedSession.clear(); this.spawnedSectors.clear(); this.stageHooksRan.clear();
    for (const t of this.level.triggers) t.inside = false;
    const q14 = s.quests['1-4'];
    this.arena = { wave: 0, t: 0, active: false, done: q14?.state === 'complete' || (q14?.stage ?? 0) > 0 };
    this.applyWorldFlags();
    this.refreshLoadout(false);
    this.player.refreshStats(true);
    if (!fresh) { this.player.hp = Math.min(this.stats.hpMax, Math.max(1, s.player.hp)); this.player.en = Math.min(this.stats.enMax, s.player.energy); }
    this.restorePendingDrops();
    this.loot.setLost(s.lostScrap ? new THREE.Vector3(...s.lostScrap.pos) : null, s.lostScrap?.amount ?? 0);
    const t = this.level.terminals.find((x) => x.id === s.checkpointId) ?? this.level.terminals[0];
    this.player.setState('idle'); this.player.robot.release(0.01);
    if (fresh) this.player.teleport(new THREE.Vector3(-3, 0.55, -9.5), 0.4);
    else this.player.teleport(t.respawn, Math.atan2(t.respawn.x - t.pos.x, t.respawn.z - t.pos.z));
    this.cam.snapBehind(this.player.heading); this.cam.pitch = 0.25;
    this.setupBoss();
    this.mode = 'play';
    this.hud.setVisible(true); this.touch.show(isTouchDevice());
    this.input.clearAll();
    this.reconcileQuests();
    this.sector = '';
    this.updateSector(true);
    if (fresh) {
      this.player.robot.play('getup', { fade: 0.01 });
      setTimeout(() => { if (this.player.state === 'idle') this.player.robot.release(0.4); }, 1600);
      INTRO.forEach((l) => this.say(l));
      this.hud.banner('FERRO-VELHO 09', 'Câmara de Triagem', 3600);
      setTimeout(() => this.hud.toast(isTouchDevice() ? 'Joystick à esquerda • arraste à direita para girar a câmera' : 'WASD mover • Mouse câmera • Espaço pular • Clique atacar', 'info'), 3500);
    } else this.hud.banner('SISTEMAS RESTAURADOS', t.name, 2400);
    this.audio.setMusic(this.sectorMusic());
  }
  restorePendingDrops() {
    const s = this.state;
    const q12 = s.quests['1-2'];
    if (q12?.state === 'active' && q12.stage === 2 && !s.granted.includes('drop:e02q:P11')) this.loot.spawnPart('P11', 'drop:e02q:P11', new THREE.Vector3(-4, 0, 34));
    if (this.flag('killed:b_e02q') && !s.granted.includes('drop:e02q:P02')) this.loot.spawnPart('P02', 'drop:e02q:P02', new THREE.Vector3(-2.5, 0, 34.5));
    const q15 = s.quests['1-5'];
    if (q15?.state === 'active' && q15.stage === 2 && !s.granted.includes('drop:b01:P07')) this.loot.spawnPart('P07', 'drop:b01:P07', this.level.bossCenter.clone().add(new THREE.Vector3(0, 0, -3)));
    if (!s.granted.includes('pickup:secret_p03')) { const it = this.level.interactables.find((i) => i.id === 'secret_p03'); if (it) this.loot.spawnPart('P03', 'pickup:secret_p03', it.pos.clone().setY(0)); }
    if (this.flag('used:cache_p18') && !s.granted.includes('cache:cache_p18:P18')) this.loot.spawnPart('P18', 'cache:cache_p18:P18', new THREE.Vector3(19.5, 2.6, 93));
  }
  applyWorldFlags() {
    const L = this.level, s = this.state;
    const q = (id: string) => s.quests[id];
    L.gates.get('gate_a')!.setOpen(this.flag('used:crate_start') || q('1-1')?.state === 'complete', true);
    L.gates.get('lift_13_gate')!.setOpen(this.flag('used:lift_13'), true);
    L.gates.get('gate_boss')!.setOpen(q('1-4')?.state === 'complete', true);
    L.gates.get('gate_arena_in')!.setOpen(true, true);
    for (const [id, p] of L.plates) if (this.flag('plate:' + id) && !p.broken) this.breakPlate(id, false);
    for (const it of L.interactables) {
      it.used = this.flag('used:' + it.id) || ((it.kind === 'memory' || it.kind === 'tool') && s.collectibles.includes(it.id));
      this.applyInteractVisual(it, false);
    }
    const free = this.flag('ferro_free');
    const bars = L.cage.getObjectByName('bars')!;
    bars.position.y = free ? 3.4 : 0; bars.visible = !free;
    const cageCol = L.cage.userData.col;
    if (free && cageCol) { this.physics.remove(cageCol); L.cage.userData.col = null; }
    if (free) { this.ferro.root.position.set(-8.6, 0, 158.2); this.ferro.root.rotation.y = -0.6; this.ferro.anim.play('work', { loop: true }); }
    else { this.ferro.root.position.set(0, 0.25, 163); this.ferro.root.rotation.y = Math.PI; this.ferro.anim.play('trapped', { loop: true }); }
    const hook = this.scene.getObjectByName('craneHook');
    if (hook) { hook.userData.y0 ??= hook.position.y; hook.position.y = this.flag('used:crane_lever') ? hook.userData.y0 - 5.4 : hook.userData.y0; }
    const open = this.flag('used:anchor_gate');
    L.anchorDoors.forEach((d, i) => { d.rotation.y = open ? (i === 0 ? -1.9 : 1.9) : 0; const c = d.userData.col; if (open && c) { this.physics.remove(c); d.userData.col = null; } });
  }
  applyInteractVisual(it: Interactable, animate: boolean) {
    const o = it.obj; if (!o) return;
    if (it.kind === 'crate' || it.kind === 'cache') {
      const lid = o.getObjectByName('lid'); const strip = o.getObjectByName('strip');
      if (lid) { lid.rotation.x = it.used ? -1.9 : 0; lid.position.set(0, it.used ? 0.95 : 0.76, it.used ? -0.45 : 0); }
      if (strip) strip.visible = !it.used;
      o.visible = !(it.id === 'cache_hidden_c' && !this.stats.abilities.has('scrapSense') && !it.used);
    }
    if (it.kind === 'conductor') {
      const c = o.getObjectByName('core') as THREE.Mesh | undefined;
      if (c) { const m = c.material as THREE.MeshStandardMaterial; const col = it.used ? 0x39f0ff : 0xffa62b; m.color.setHex(col); m.emissive.setHex(col); m.emissiveIntensity = it.used ? 3 : 1.6; }
      if (animate) this.fx.burst('electric', it.pos.clone().setY(it.pos.y + 1.8), 24);
    }
    if (it.kind === 'memory' || it.kind === 'tool') o.visible = !it.used && (it.kind !== 'tool' || this.state.quests['S01']?.state === 'active');
  }
  breakPlate(id: string, live: boolean) {
    const p = this.level.plates.get(id)!; if (p.broken) return;
    p.broken = true;
    if (p.col) { this.physics.remove(p.col); p.col = null; }
    p.mesh.visible = false;
    this.level.nav.markBox(p.pos.x - 1.6, p.pos.z - 1.6, p.pos.x + 1.6, p.pos.z + 1.6, 0);
    if (live) {
      this.setFlag('plate:' + id);
      const c = new THREE.Vector3(p.pos.x, 1.5, p.pos.z);
      this.fx.burst('debris', c, 40); this.fx.burst('sparks', c, 30); this.fx.burst('dust', c, 30);
      this.audio.play('break'); this.shake(0.6); this.hitstop(0.1);
      this.events.emit('PLATE_BROKEN', { id });
      this.quest({ type: 'plate', id });
      if (id === 'plate_c3') this.hud.toast('Passagem secreta aberta!', 'info');
    }
  }

  // ------------------------------------------------------------------ missões
  quest(ev: QuestEvent) {
    const u = questEvent(this.state, ev);
    this.handleQuestUpdate(u);
    this.reconcileQuests();
  }
  /** estágios de coletar/equipar já satisfeitos são concluídos (ex.: após carregar) */
  reconcileQuests() {
    for (let guard = 0; guard < 6; guard++) {
      let changed = false;
      for (const q of activeQuests(this.state)) {
        const st = questStage(this.state, q.id); if (!st) continue;
        if (st.type === 'collect' && this.state.inventory.parts.some((p) => p.itemId === st.target)) { this.handleQuestUpdate(questEvent(this.state, { type: 'collect', itemId: st.target })); changed = true; }
        else if (st.type === 'equip' && SLOTS.some((sl) => findPart(this.state, this.state.equipment[sl])?.itemId === st.target)) { this.handleQuestUpdate(questEvent(this.state, { type: 'equip', itemId: st.target })); changed = true; }
      }
      if (!changed) break;
    }
  }
  handleQuestUpdate(u: QuestUpdate) {
    for (const sc of u.stageCompleted ?? []) {
      this.events.emit('QUEST_STAGE_COMPLETED', { questId: sc.quest, stageId: sc.stage });
      this.audio.play('terminal', 0.6);
      this.onStageDone(sc.quest, sc.stage);
    }
    for (const r of u.rewards ?? []) {
      const q = QUEST_BY_ID[r.quest];
      this.hud.banner(q.kind === 'main' ? 'MISSÃO CONCLUÍDA' : 'TAREFA CONCLUÍDA', q.title, 3000);
      const parts: string[] = [];
      if (r.reward.scrap) parts.push(`+${r.reward.scrap} sucata`);
      if (r.reward.alloy) parts.push(`+${r.reward.alloy} liga`);
      if (r.reward.xp) parts.push(`+${r.reward.xp} XP`);
      if (r.reward.capacity) parts.push(`+${r.reward.capacity} capacidade`);
      if (r.reward.blueprint) parts.push(`projeto: ${ITEMS[r.reward.blueprint].name}`);
      if (r.reward.circuit) parts.push(`+${r.reward.circuit} ponto de circuito`);
      if (parts.length) this.hud.toast(parts.join(' • '), 'loot');
      if (r.levels) this.onLevelUp();
      this.events.emit('QUEST_COMPLETED', { questId: r.quest });
      this.onQuestDone(r.quest);
    }
    for (const q of activeQuests(this.state)) if (!this.flag('seen:' + q.id)) { this.setFlag('seen:' + q.id); if (q.id !== '1-1') this.hud.toast(`Nova ${q.kind === 'main' ? 'missão' : 'tarefa'}: ${q.title}`, 'quest'); }
  }
  onStageDone(q: string, st: string) {
    const key = q + ':' + st; if (this.stageHooksRan.has(key)) return; this.stageHooksRan.add(key);
    if (q === '1-1' && st === 'open') { this.level.gates.get('gate_a')!.setOpen(true); this.audio.play('gate'); }
    if (q === '1-2' && st === 'find') { this.say(LINES.yard, 'yard'); this.say(LINES.yardTip, 'yardTip'); this.spawnSector('B', true); }
    if (q === '1-2' && st === 'loot') this.say(LINES.drop, 'drop');
    if (q === '1-2' && st === 'equip') { this.say(LINES.equipped, 'equipped'); this.say(LINES.plateHint, 'plateHint'); setTimeout(() => this.spawnSector('B', true), 4000); }
    if (q === '1-3' && st === 'conductors') this.hud.toast('Energia restaurada no elevador de carga', 'quest');
    if (q === '1-4' && st === 'cage') this.say(LINES.ferroFree);
    if (q === '1-5' && st === 'boss') this.say(LINES.bossDown);
    if (q === '1-5' && st === 'equip') this.say(LINES.tensor, 'tensor');
  }
  onQuestDone(q: string) {
    if (q === '1-4') { this.level.gates.get('gate_boss')!.setOpen(true); this.audio.play('gate'); this.say(LINES.ferroTools, 'ferroTools'); this.say(LINES.bossDoor, 'bossDoor'); for (const it of this.level.interactables) this.applyInteractVisual(it, false); }
    if (q === '1-5') setTimeout(() => this.showEnding(), 2600);
  }
  onLevelUp() {
    this.stats = computeStats(this.state); this.player.refreshStats(true);
    this.events.emit('LEVEL_UP', { level: this.state.player.level });
    this.audio.play('levelup'); this.hud.banner(`NÍVEL ${this.state.player.level}`, 'Integridade e energia restauradas', 2600);
    this.fx.burst('electric', this.player.center(), 30);
  }
  grantXp(n: number) { if (addXp(this.state, n)) this.onLevelUp(); }

  // ------------------------------------------------------------------ peças / oficina
  refreshLoadout(animate: boolean) {
    const ids: Record<Slot, string | null> = { head: null, armL: null, armR: null, legs: null, body: null, core: null };
    for (const sl of SLOTS) ids[sl] = findPart(this.state, this.state.equipment[sl])?.itemId ?? null;
    const changed = this.player.robot.setLoadout(ids);
    this.stats = computeStats(this.state);
    this.player.refreshStats(false);
    if (animate && changed.length) this.player.playEquip();
    this.touch?.setAbility(this.stats.abilities.has('winch'));
    for (const it of this.level.interactables) if (it.id === 'cache_hidden_c') this.applyInteractVisual(it, false);
    return changed;
  }
  openWorkshop(mode: 'field' | 'full', title: string) {
    this.mode = 'menu';
    this.hud.setVisible(false); this.touch.show(false);
    document.exitPointerLock?.();
    const p = this.player.pos, f = this.player.forward();
    const r = new THREE.Vector3(-f.z, 0, f.x);
    this.cam.override = { pos: new THREE.Vector3(p.x + f.x * 3.1 - r.x * 1.1, p.y + 1.55, p.z + f.z * 3.1 - r.z * 1.1), look: new THREE.Vector3(p.x - r.x * 0.9, p.y + 0.95, p.z - r.z * 0.9), blend: 0 };
    const deny = (reason: string) => { this.hud.toast(reason, 'warn'); this.audio.play('deny'); this.workshop?.flash(reason); };
    const ws = new Workshop(this.state, mode, {
      equip: (id) => { const r2 = doEquip(this.state, id); if (!r2.ok) return deny(r2.reason); this.afterEquip(); },
      unequip: (sl) => { const r2 = doUnequip(this.state, sl); if (!r2.ok) return deny(r2.reason); this.afterEquip(); },
      craft: (id) => { const r2 = doCraft(this.state, id); if (!r2.ok) return deny(r2.reason); this.audio.play('part'); this.fx.burst('weld', this.player.center(), 20); this.workshop?.flash(`Fabricado: ${ITEMS[id].name}`); this.reconcileQuests(); },
      upgrade: (id) => { const r2 = doUpgrade(this.state, id); if (!r2.ok) return deny(r2.reason); this.audio.play('equip'); this.fx.burst('weld', this.player.center(), 16); this.refreshLoadout(false); this.workshop?.flash('Peça melhorada!'); },
      dismantle: (id) => this.screens.confirm('Desmontar esta peça? Você recupera 40% da sucata.', () => { const r2 = doDismantle(this.state, id); if (!r2.ok) return deny(r2.reason); this.audio.play('break', 0.4); this.workshop?.refresh(); this.workshop?.flash(`+${r2.refund!.scrap} sucata`); }, 'Desmontar'),
      close: () => this.closeWorkshop(),
      sound: (n) => this.audio.play(n),
    }, title);
    this.workshop = ws;
    this.screens.push(ws.el, () => this.closeWorkshop());
    this.audio.setMusic('hub');
  }
  afterEquip() {
    const before = this.player.robot.loadout.armR;
    const changed = this.refreshLoadout(true);
    for (const sl of changed) {
      const id = findPart(this.state, this.state.equipment[sl])?.itemId ?? null;
      this.events.emit('ITEM_EQUIPPED', { slot: sl, itemId: id });
      if (id) this.quest({ type: 'equip', itemId: id });
    }
    if (!before && this.player.robot.loadout.armR) this.workshop?.flash('Braço direito montado! Combo e golpe pesado liberados');
    if (changed.includes('head') && this.stats.abilities.has('scrapSense')) this.say(LINES.scrapSense, 'scrapSense');
    this.workshop?.refresh();
  }
  closeWorkshop() {
    this.screens.clear(); this.workshop = null;
    this.cam.override = null;
    this.resume();
    if (!this.player.robot.loadout.armR && this.state.inventory.parts.some((p) => ITEMS[p.itemId].slot === 'armR')) this.hud.toast('Você ainda não montou o braço direito', 'warn');
    this.saveTo('auto');
  }

  // ------------------------------------------------------------------ interação
  interactables(): Interactable[] {
    return this.level.interactables.filter((it) => {
      if (it.used && it.kind !== 'terminal') return false;
      if (it.kind === 'tool' && this.state.quests['S01']?.state !== 'active') return false;
      if (it.kind === 'lever' && this.state.quests['S02']?.state !== 'active') return false;
      if (it.id === 'cache_hidden_c' && !this.stats.abilities.has('scrapSense')) return false;
      if (it.kind === 'pickup') return false;
      if (it.kind === 'cage' && this.flag('ferro_free')) return false;
      return true;
    });
  }
  findInteract(): Interactable | null {
    let best: Interactable | null = null, bd = 1e9;
    const p = this.player.pos;
    for (const it of this.interactables()) {
      const d = Math.hypot(it.pos.x - p.x, it.pos.z - p.z);
      if (d > it.radius || Math.abs(it.pos.y - (p.y + 1)) > 2.2) continue;
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }
  doInteract(it: Interactable) {
    const s = this.state;
    const use = () => { it.used = true; this.setFlag('used:' + it.id); this.applyInteractVisual(it, true); };
    this.player.heading = Math.atan2(it.pos.x - this.player.pos.x, it.pos.z - this.player.pos.z);
    switch (it.kind) {
      case 'terminal': this.useTerminal(it); return;
      case 'crate': case 'cache': {
        this.player.playInteract(0.7);
        use(); this.audio.play('pickup'); this.fx.burst('sparks', it.pos.clone().setY(it.pos.y + 0.8), 10);
        const d = it.data ?? {};
        const gid = 'crate:' + it.id;
        if (!s.granted.includes(gid)) {
          s.granted.push(gid);
          const at = it.pos.clone().setY(it.pos.y + 0.6);
          if (d.scrap) this.loot.spawnOrbs(at, d.scrap);
          if (d.alloy) this.loot.spawnOrbs(at, d.alloy, 'alloy');
          if (d.cells) this.loot.spawnOrbs(at, d.cells, 'cells');
          if (d.itemId) this.loot.spawnPart(d.itemId, `cache:${it.id}:${d.itemId}`, it.pos.clone().add(new THREE.Vector3(-1, 0, -1.3)));
          if (d.memory) setTimeout(() => this.collectMemory(d.memory, it.id === 'crate_start' ? () => this.say(LINES.crate, 'crate') : undefined), 700);
        }
        this.quest({ type: 'interact', id: it.id });
        return;
      }
      case 'conductor': {
        if (s.quests['1-3']?.state !== 'active') { this.hud.toast('O condutor está sem carga.', 'warn'); return; }
        this.player.playInteract(0.9); use();
        this.audio.play('zap'); this.audio.play('terminal');
        this.quest({ type: 'interact', id: it.id });
        const n = countProgress(s, '1-3', 'conductors');
        if (n > 0 && n < 3) { this.hud.toast(`Condutores ligados: ${n}/3`, 'quest'); this.say(LINES.conductor); }
        return;
      }
      case 'panel': {
        const st = questStage(s, '1-3');
        if (!st || st.id !== 'lift') { this.audio.play('deny'); this.hud.toast(`Sem energia. Condutores: ${countProgress(s, '1-3', 'conductors')}/3`, 'warn'); return; }
        this.player.playInteract(0.9); use();
        this.level.gates.get('lift_13_gate')!.setOpen(true); this.audio.play('gate');
        this.say(LINES.lift); this.quest({ type: 'interact', id: it.id });
        return;
      }
      case 'cage': {
        const st = questStage(s, '1-4');
        if (!st || st.id !== 'cage') { this.hud.toast('Elimine as ameaças primeiro.', 'warn'); return; }
        this.player.playInteract(1.1);
        this.setFlag('ferro_free'); use();
        this.audio.play('break'); this.audio.play('gate');
        this.fx.burst('sparks', new THREE.Vector3(0, 1.5, 163), 30);
        this.ferro.anim.play('wave', { fade: 0.2 });
        const bars = this.level.cage.getObjectByName('bars')!;
        const t0 = performance.now(); const anim = () => { const k = Math.min(1, (performance.now() - t0) / 1500); bars.position.y = k * 3.4; if (k < 1) requestAnimationFrame(anim); else bars.visible = false; }; anim();
        const cc = this.level.cage.userData.col; if (cc) { this.physics.remove(cc); this.level.cage.userData.col = null; }
        setTimeout(() => { this.ferro.root.position.set(-8.6, 0, 158.2); this.ferro.root.rotation.y = -0.6; this.ferro.anim.play('work', { loop: true }); this.fx.burst('electric', new THREE.Vector3(-8.6, 1, 158.2), 20); }, 2600);
        this.quest({ type: 'interact', id: it.id });
        setTimeout(() => this.say(LINES.ferroHub), 3000);
        return;
      }
      case 'tool': {
        use(); if (!s.collectibles.includes(it.id)) s.collectibles.push(it.id); this.audio.play('part');
        this.quest({ type: 'interact', id: it.id });
        const n = s.collectibles.filter((c) => c.startsWith('tool_')).length;
        this.hud.toast(`Ferramenta do FERRO-7 recuperada (${n}/3)`, 'loot');
        return;
      }
      case 'memory': {
        use(); if (!s.collectibles.includes(it.id)) s.collectibles.push(it.id);
        this.collectMemory(it.data?.memory ?? 'm1');
        return;
      }
      case 'lever': {
        this.player.playInteract(1); use();
        this.audio.play('servo'); this.audio.play('gate');
        const hook = this.scene.getObjectByName('craneHook');
        if (hook) { const t0 = performance.now(); hook.userData.y0 ??= hook.position.y; const y0 = hook.userData.y0; const a = () => { const k = Math.min(1, (performance.now() - t0) / 2200); hook.position.y = y0 - k * 5.4; if (k < 1) requestAnimationFrame(a); else { this.audio.play('stomp'); this.shake(0.4); this.fx.burst('dust', new THREE.Vector3(hook.position.x, 0.3, hook.position.z), 30); } }; a(); }
        this.quest({ type: 'interact', id: it.id });
        this.hud.toast('O guindaste soltou um contêiner: dentro, o projeto do Martelo de Prensa!', 'loot');
        return;
      }
      case 'anchor': {
        if (!this.stats.abilities.has('winch')) { this.audio.play('deny'); this.hud.toast('Precisa de um guincho — equipe o Braço TENSOR', 'warn'); return; }
        this.pullAnchor(it);
        return;
      }
      default: return;
    }
  }
  pullAnchor(it: Interactable) {
    if (it.used || this.player.state === 'pull') return;
    const target = it.obj ? it.obj.getWorldPosition(new THREE.Vector3()) : it.pos.clone();
    this.player.startPull(target, 2.2, () => {
      it.used = true; this.setFlag('used:anchor_gate');
      this.audio.play('gate'); this.audio.play('break'); this.shake(0.7);
      this.fx.burst('sparks', target, 40); this.fx.burst('dust', target, 30);
      const t0 = performance.now();
      const doors = this.level.anchorDoors;
      const a = () => { const k = Math.min(1, (performance.now() - t0) / 1600); const e = 1 - (1 - k) ** 3; doors.forEach((d, i) => (d.rotation.y = (i === 0 ? -1.9 : 1.9) * e)); if (k < 1) requestAnimationFrame(a); }; a();
      for (const d of doors) { const c = d.userData.col; if (c) { this.physics.remove(c); d.userData.col = null; } }
      this.say(LINES.anchor);
      this.quest({ type: 'interact', id: 'anchor_gate' });
    });
  }
  collectMemory(id: string, after?: () => void) {
    const m = MEMORIES[id]; if (!m) return;
    if (!this.state.collectibles.includes('mem:' + id)) this.state.collectibles.push('mem:' + id);
    this.audio.play('terminal');
    const n = Object.keys(MEMORIES).filter((k) => this.state.collectibles.includes('mem:' + k)).length;
    if (this.mode !== 'play') { after?.(); return; }
    this.mode = 'menu'; document.exitPointerLock?.(); this.touch.show(false);
    this.screens.info(m.title, `${m.lines.map((l) => `<p class="mem">${esc(l)}</p>`).join('')}<p class="muted">Registros de memória: ${n}/5</p>`, () => { this.resume(); after?.(); }, 'info memory');
  }
  useTerminal(it: Interactable) {
    const t = this.level.terminals.find((x) => x.id === it.id)!;
    this.activateTerminal(t.id, true);
    this.quest({ type: 'interact', id: it.id });
    this.mode = 'menu'; document.exitPointerLock?.(); this.touch.show(false); this.hud.setVisible(false);
    const close = () => { this.screens.clear(); this.resume(); };
    const items = [];
    if (t.workshop !== 'none') items.push({ label: t.workshop === 'full' ? 'Oficina' : 'Bancada de campo', sub: t.workshop === 'full' ? 'Montar, fabricar e melhorar peças' : 'Trocar peças', act: () => { this.screens.clear(); this.openWorkshop(t.workshop as 'field' | 'full', t.name); } });
    const travel = this.level.terminals.filter((x) => x.id !== t.id && this.state.flags['term:' + x.id]);
    if (travel.length) items.push({ label: 'Viajar', sub: 'Teletransporte entre terminais ativos', act: () => this.screens.list('Viajar para…', travel.map((x) => ({ label: x.name, act: () => { this.screens.clear(); this.travelTo(x.id); } }))) });
    items.push({ label: 'Salvar em slot', act: () => this.slotMenu('save') });
    items.push({ label: 'Registros de memória', act: () => this.showMemories() });
    items.push({ label: 'Fechar', act: close });
    this.screens.list(t.name, items, 'terminal', `<p class="muted">Terminal ativo • Integridade e energia restauradas • Progresso salvo • Inimigos comuns reativados</p>`, close, false);
  }
  showMemories() {
    const got = Object.entries(MEMORIES).filter(([k]) => this.state.collectibles.includes('mem:' + k));
    this.screens.info('Registros de memória', got.length ? got.map(([, m]) => `<h4>${esc(m.title)}</h4>${m.lines.map((l) => `<p class="mem">${esc(l)}</p>`).join('')}`).join('') : '<p class="muted">Nenhum registro encontrado ainda.</p>', undefined, 'info memory');
  }
  activateTerminal(id: string, rest: boolean) {
    const s = this.state;
    if (!s.flags['term:' + id]) { s.flags['term:' + id] = true; this.events.emit('TERMINAL_UNLOCKED', { terminalId: id }); this.hud.toast('Terminal ativado — novo ponto de retorno', 'info'); this.audio.play('terminal'); }
    s.checkpointId = id;
    s.scrapSinceTerminal = 0;
    if (rest) {
      this.player.hp = this.stats.hpMax; this.player.en = this.stats.enMax; this.player.heat = 0;
      this.killedSession.clear();
      this.respawnWorld();
      this.saveTo('auto');
    }
  }
  travelTo(id: string) {
    const t = this.level.terminals.find((x) => x.id === id)!;
    this.state.checkpointId = id;
    this.player.teleport(t.respawn, Math.atan2(t.respawn.x - t.pos.x, t.respawn.z - t.pos.z));
    this.cam.snapBehind(this.player.heading);
    this.fx.burst('electric', this.player.center(), 30); this.audio.play('zap');
    this.resume(); this.updateSector(true);
  }

  // ------------------------------------------------------------------ inimigos
  clearEnemies() { for (const e of this.enemies) this.scene.remove(e.root); this.enemies = []; this.attackTokens.clear(); }
  respawnWorld() {
    for (const e of this.enemies) if (!e.spawn.group) this.scene.remove(e.root);
    this.enemies = this.enemies.filter((e) => !!e.spawn.group && e.alive);
    this.attackTokens.clear();
    this.spawnedSectors.clear();
    this.updateSector(true);
  }
  spawnAllowed(sp: SpawnDef): boolean {
    const s = this.state;
    if (sp.group) return false;
    if (sp.questTag && this.flag('killed:' + sp.id)) return false;
    if (this.killedSession.has(sp.id)) return false;
    const q12 = s.quests['1-2'];
    switch (sp.when) {
      case 'q12_fight': return q12?.state === 'active' && q12.stage <= 1;
      case 'q12_ambush': return q12?.state === 'active' && q12.stage >= 4 && this.stats.moveset !== 'none';
      case 'q12_done': return q12?.state === 'complete';
      case 'q14_done': return s.quests['1-4']?.state === 'complete';
      default: return true;
    }
  }
  spawnSector(id: string, force = false) {
    if (this.spawnedSectors.has(id) && !force) return;
    this.spawnedSectors.add(id);
    for (const sp of this.level.spawns) {
      if (sp.sector !== id || !this.spawnAllowed(sp)) continue;
      if (this.enemies.some((e) => e.spawn.id === sp.id && e.alive)) continue;
      this.spawnEnemy(sp);
    }
  }
  spawnEnemy(sp: SpawnDef, alert = false) {
    const def = ENEMIES[sp.def];
    const e = new Enemy(this, this.assets, def, sp, (en) => this.onEnemyDeath(en));
    this.enemies.push(e);
    this.fx.burst('electric', e.lockPoint(new THREE.Vector3()), 10);
    if (alert) e.alertNearby();
    return e;
  }
  onEnemyDeath(e: Enemy) {
    const def = e.def; const pos = e.pos.clone();
    this.killedSession.add(e.spawn.id);
    if (e.spawn.questTag) this.setFlag('killed:' + e.spawn.id);
    this.events.emit('ENEMY_DEFEATED', { enemyId: e.id, defId: def.id, questTag: e.spawn.questTag, pos: [pos.x, pos.y, pos.z] });
    const [a, b] = def.loot.scrap;
    const scrap = Math.round(a + Math.random() * (b - a)) + e.stolen;
    this.loot.spawnOrbs(pos, scrap);
    if (def.loot.alloy && Math.random() < def.loot.alloy) this.loot.spawnOrbs(pos, 1, 'alloy');
    if (def.loot.cells) this.loot.spawnOrbs(pos, def.loot.cells, 'cells');
    this.grantXp(def.xp);
    if (e.spawn.questTag === 'e02_quest') {
      this.loot.spawnPart('P11', 'drop:e02q:P11', pos.clone().add(new THREE.Vector3(0.9, 0, 0)));
      this.loot.spawnPart('P02', 'drop:e02q:P02', pos.clone().add(new THREE.Vector3(-1.0, 0, 0.5)));
      this.quest({ type: 'defeat', tag: 'e02_quest' });
    }
    if (this.player.lockTarget === e) this.player.lockTarget = null;
  }
  updateArena(dt: number) {
    const a = this.arena; if (!a.active) return;
    const alive = this.enemies.filter((e) => e.alive && e.spawn.group?.startsWith('arena14'));
    if (alive.length) return;
    a.t += dt;
    if (a.wave === 1 && a.t > 1.6) { a.wave = 2; a.t = 0; this.say(LINES.ambush2); for (const sp of this.level.spawns.filter((x) => x.group === 'arena14_w2')) this.spawnEnemy(sp, true); }
    else if (a.wave === 2 && a.t > 1.2) {
      a.active = false; a.done = true;
      this.level.gates.get('lift_13_gate')!.setOpen(true); this.audio.play('gate');
      this.say(LINES.cleared); this.audio.setMusic('hub');
      this.quest({ type: 'reach', id: 'arena14_clear' });
    }
  }
  startArena() {
    const a = this.arena; if (a.active || a.done) return;
    a.active = true; a.wave = 1; a.t = 0;
    this.level.gates.get('lift_13_gate')!.setOpen(false); this.audio.play('gate');
    this.say(LINES.ambush); this.audio.setMusic('combat');
    this.hud.banner('EMBOSCADA', 'Sobreviva às duas ondas', 2200);
    for (const sp of this.level.spawns.filter((x) => x.group === 'arena14_w1')) this.spawnEnemy(sp, true);
  }
  resetArena() {
    const a = this.arena; if (!a.active) return;
    a.active = false; a.wave = 0;
    for (const e of this.enemies.filter((x) => x.spawn.group?.startsWith('arena14'))) this.scene.remove(e.root);
    this.enemies = this.enemies.filter((x) => !x.spawn.group?.startsWith('arena14'));
    this.level.gates.get('lift_13_gate')!.setOpen(true, true);
    for (const t of this.level.triggers) if (t.id === 'arena14') t.inside = false;
  }

  // ------------------------------------------------------------------ chefe
  setupBoss() {
    if (this.boss) { this.boss.dispose(); this.boss = null; }
    for (const c of this.level.columns) c.restore();
    this.bossFight = false;
    if (this.state.bossFlags['B01']) return;
    const b = new Boss(this, this.assets, this.level.bossCenter, this.level.arenaRadius, this.level.columns);
    b.onPhase = (p) => { this.audio.setMusic(p === 2 ? 'boss2' : 'boss3'); this.say(p === 2 ? LINES.boss2 : LINES.boss3); this.hud.banner(p === 2 ? 'FASE 2' : 'FASE 3', p === 2 ? 'SOBRECARGA' : 'RUPTURA — núcleo exposto', 2000); };
    b.onSpawnAdds = () => { [-8, 8].forEach((x, i) => this.spawnEnemy({ id: 'boss_add' + i, def: 'E01', x, z: this.level.bossCenter.z - 4, sector: 'E', group: 'boss_adds' }, true)); };
    b.onDefeated = () => this.onBossDefeated();
    this.boss = b;
  }
  startBossFight() {
    if (!this.boss || this.bossFight || this.state.bossFlags['B01']) return;
    this.bossFight = true;
    this.level.gates.get('gate_arena_in')!.setOpen(false); this.audio.play('gate');
    this.boss.startIntro();
    this.audio.setMusic('boss1');
    this.hud.banner('O COMPACTADOR', 'Guardião da Prensa Central', 3000);
    this.say(LINES.bossIntro); this.say(LINES.bossTip);
    const c = this.level.bossCenter;
    this.cam.override = { pos: new THREE.Vector3(c.x + 7, 4.2, c.z - 5), look: new THREE.Vector3(this.boss.pos.x, 3, this.boss.pos.z), blend: 0 };
    this.cinematic = 2.6;
  }
  onBossDefeated() {
    this.state.bossFlags['B01'] = true;
    this.events.emit('BOSS_DEFEATED', { bossId: 'B01' });
    this.bossFight = false;
    this.grantXp(400);
    const bp = this.boss!.pos.clone();
    this.loot.spawnOrbs(bp.clone().setY(1), 300);
    this.loot.spawnOrbs(bp.clone().setY(1), 3, 'alloy');
    for (const e of this.enemies) if (e.spawn.group === 'boss_adds' && e.alive) e.receiveHit({ amount: 999, crit: false, stagger: 99, dir: new THREE.Vector3(0, 0, 1), heavy: true, from: e.pos.clone(), attackId: 'x' });
    this.quest({ type: 'boss', id: 'B01' });
    setTimeout(() => {
      const dropAt = new THREE.Vector3(bp.x, 0, bp.z).lerp(this.level.bossCenter, 0.5);
      dropAt.addScaledVector(new THREE.Vector3(this.player.pos.x - dropAt.x, 0, this.player.pos.z - dropAt.z).normalize(), 3);
      this.loot.spawnPart('P07', 'drop:b01:P07', dropAt);
      this.level.gates.get('gate_arena_in')!.setOpen(true);
      this.audio.setMusic('victory');
      this.saveTo('auto');
    }, 2200);
    this.hud.banner('AMEAÇA NEUTRALIZADA', 'O COMPACTADOR', 3200);
  }
  resetBoss() {
    for (const e of this.enemies.filter((x) => x.spawn.group === 'boss_adds')) this.scene.remove(e.root);
    this.enemies = this.enemies.filter((x) => x.spawn.group !== 'boss_adds');
    this.level.gates.get('gate_arena_in')!.setOpen(true, true);
    this.setupBoss();
  }

  // ------------------------------------------------------------------ habilidade (guincho)
  useAbility() {
    if (!this.stats.abilities.has('winch')) { this.hud.toast('Nenhum módulo ativo. Equipe um braço com guincho.', 'warn'); this.audio.play('deny'); return; }
    if (this.player.abilityCd > 0) { this.audio.play('deny'); return; }
    const anchor = this.level.interactables.find((i) => i.kind === 'anchor' && !i.used && Math.hypot(i.pos.x - this.player.pos.x, i.pos.z - this.player.pos.z) < 8);
    if (anchor) { this.pullAnchor(anchor); return; }
    if (this.player.en < 25) { this.hud.toast('Energia insuficiente', 'warn'); this.audio.play('deny'); return; }
    const t = this.player.lockTarget ?? this.player.softTarget(9, 0.7);
    if (!t || !(t instanceof Enemy)) { this.hud.toast('Nada ao alcance do guincho', 'info'); return; }
    this.player.en -= 25; this.player.abilityCd = 3;
    const e = t;
    this.player.cable.visible = true; this.audio.play('winch');
    const arr = (this.player.cable.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute;
    const t0 = performance.now();
    const light = e.def.stability < 40;
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / 350);
      const hc = this.player.center();
      const lp = e.lockPoint(new THREE.Vector3());
      arr.setXYZ(0, hc.x, hc.y, hc.z); arr.setXYZ(1, lp.x, lp.y, lp.z); arr.needsUpdate = true;
      if (light && e.alive) { const f = this.player.forward(); const tx = this.player.pos.x + f.x * 1.6, tz = this.player.pos.z + f.z * 1.6; e.pos.x += (tx - e.pos.x) * 0.25; e.pos.z += (tz - e.pos.z) * 0.25; }
      if (k < 1) requestAnimationFrame(step);
      else { this.player.cable.visible = false; if (e.alive) { e.stagger(light ? 1.6 : 0.8); this.fx.burst('electric', lp, 10); } }
    };
    step();
  }

  // ------------------------------------------------------------------ morte
  onPlayerDeath() {
    if (this.mode !== 'play') return;
    this.mode = 'dead';
    const s = this.state;
    const lose = Math.min(s.inventory.materials.scrap, Math.round(s.scrapSinceTerminal * 0.2));
    s.inventory.materials.scrap -= lose;
    s.lostScrap = lose > 0 ? { amount: lose, pos: [this.player.pos.x, Math.max(0, this.player.pos.y), this.player.pos.z] } : null;
    s.scrapSinceTerminal = 0;
    this.audio.setMusic('silent');
    document.exitPointerLock?.();
    setTimeout(() => { this.touch.show(false); this.screens.death(() => this.respawn(), lose); }, 1800);
  }
  respawn() {
    const s = this.state;
    this.resetArena();
    if (this.boss && this.boss.alive && (this.bossFight || this.boss.state !== 'dormant')) this.resetBoss();
    this.killedSession.clear();
    this.clearEnemies();
    this.spawnedSectors.clear();
    this.tele.clear();
    const t = this.level.terminals.find((x) => x.id === s.checkpointId) ?? this.level.terminals[0];
    this.player.revive(t.respawn, Math.atan2(t.respawn.x - t.pos.x, t.respawn.z - t.pos.z));
    this.cam.snapBehind(this.player.heading);
    this.loot.setLost(s.lostScrap ? new THREE.Vector3(...s.lostScrap.pos) : null, s.lostScrap?.amount ?? 0);
    this.mode = 'play'; this.touch.show(isTouchDevice());
    this.sector = '';
    this.updateSector(true);
    this.say(LINES.death, 'death');
    this.audio.setMusic(this.sectorMusic());
    this.saveTo('auto');
  }

  // ------------------------------------------------------------------ final
  showEnding() {
    if (this.mode === 'ending') return;
    this.mode = 'ending'; document.exitPointerLock?.();
    this.hud.setVisible(false); this.touch.show(false);
    const s = this.state;
    const mem = Object.keys(MEMORIES).filter((k) => s.collectibles.includes('mem:' + k)).length;
    const stats = `<span>Tempo <b>${fmtTime(s.playtimeSeconds)}</b></span><span>Nível <b>${s.player.level}</b></span><span>Peças <b>${s.inventory.parts.length}</b></span><span>Memórias <b>${mem}/5</b></span>`;
    this.audio.setMusic('victory');
    this.screens.ending(ENDING.lines, ENDING.title, ENDING.next, stats, () => this.resume());
    this.saveTo('auto');
  }

  // ------------------------------------------------------------------ pausa
  pause() {
    if (this.mode !== 'play') return;
    this.mode = 'pause'; document.exitPointerLock?.(); this.input.clearAll();
    this.touch.show(false);
    const s = this.state;
    const mq = mainQuest(s);
    const side = activeQuests(s).filter((q) => q.kind === 'side');
    const m = s.inventory.materials;
    const intro = `<div class="pause-info"><div><h4>${mq ? esc(mq.title) : 'Episódio concluído'}</h4><p>${mq ? esc(mq.summary) : 'Explore livremente o Ferro-Velho 09.'}</p>${side.map((q) => `<p class="side">◇ ${esc(q.title)} — ${esc(questStage(s, q.id)?.text ?? '')}</p>`).join('')}</div>
      <div class="pmats">⬢ ${m.scrap} sucata • ◆ ${m.alloy} liga • ▮ ${m.cells} células • Nível ${s.player.level} • ${fmtTime(s.playtimeSeconds)}</div></div>`;
    const close = () => { this.screens.clear(); this.resume(); };
    this.screens.list('PAUSA', [
      { label: 'Continuar', act: close },
      { label: 'Salvar', act: () => this.slotMenu('save') },
      { label: 'Carregar', act: () => this.slotMenu('load') },
      { label: 'Registros de memória', act: () => this.showMemories() },
      { label: 'Opções', act: () => this.openOptions() },
      { label: 'Voltar ao título', danger: true, act: () => this.screens.confirm('Voltar ao título? O progresso desde o último salvamento será perdido.', () => { this.screens.clear(); this.showTitle(); }, 'Sair') },
    ], 'pause', intro, close, false);
  }
  resume() {
    if (this.mode === 'title') return;
    this.mode = 'play';
    this.hud.setVisible(true); this.touch.show(isTouchDevice());
    this.input.clearAll();
    this.audio.setMusic(this.bossFight ? (this.boss?.phase === 3 ? 'boss3' : this.boss?.phase === 2 ? 'boss2' : 'boss1') : this.arena.active ? 'combat' : this.sectorMusic());
  }
  sectorMusic() { return (this.level.sectors.find((x) => x.id === this.sector)?.music ?? 'exploration') as 'exploration' | 'hub'; }

  // ------------------------------------------------------------------ setores e gatilhos
  updateSector(force = false) {
    const z = this.player.pos.z;
    const sec = this.level.sectors.find((s) => z >= s.minZ && z < s.maxZ) ?? this.level.sectors[0];
    if (sec.id !== this.sector || force) {
      const prev = this.sector;
      this.sector = sec.id;
      this.spawnSector(sec.id);
      const idx = this.level.sectors.indexOf(sec);
      const next = this.level.sectors[idx + 1]; if (next) this.spawnSector(next.id);
      if (prev && prev !== sec.id) {
        this.hud.banner(sec.name.toUpperCase(), 'Ferro-Velho 09', 2200);
        if (!this.bossFight && !this.arena.active) this.audio.setMusic(sec.music);
        if (sec.id === 'C') this.say(LINES.triage, 'triage');
      }
    }
  }
  checkTriggers() {
    const p = this.player.pos;
    for (const t of this.level.triggers) {
      const b = t.box;
      const inside = p.x > b.minX && p.x < b.maxX && p.y + 0.5 > b.minY && p.y < b.maxY && p.z > b.minZ && p.z < b.maxZ;
      if (inside && !t.inside) {
        this.events.emit('REACH', { id: t.id });
        this.quest({ type: 'reach', id: t.id });
        if (t.id === 'arena14' && questStage(this.state, '1-4')?.id === 'arena') this.startArena();
        if (t.id === 'r_end' && this.state.quests['1-5']?.state === 'complete' && !this.flag('seen_end')) { this.setFlag('seen_end'); this.hud.banner('CIDADE MORTA', 'Episódio 2 — em breve', 3500); }
      }
      t.inside = inside;
    }
    for (const t of this.level.terminals) if (!this.state.flags['term:' + t.id] && Math.hypot(t.pos.x - p.x, t.pos.z - p.z) < 4.5) this.activateTerminal(t.id, false);
    const c = this.level.bossCenter;
    if (this.boss && !this.bossFight && !this.state.bossFlags['B01'] && questStage(this.state, '1-5')?.id === 'boss' && Math.hypot(p.x - c.x, p.z - c.z) < 12) this.startBossFight();
    const lost = this.loot.lost;
    if (lost && Math.hypot(lost.pos.x - p.x, lost.pos.z - p.z) < 1.3 && Math.abs(lost.pos.y - p.y) < 2) {
      grantMaterials(this.state, { scrap: lost.amount });
      this.hud.toast(`Sucata recuperada: +${lost.amount}`, 'loot'); this.audio.play('part');
      this.state.lostScrap = null; this.loot.setLost(null);
    }
    for (const d of [...this.loot.drops]) {
      if (Math.hypot(d.pos.x - p.x, d.pos.z - p.z) < 1.5 && Math.abs(d.pos.y - p.y) < 2) {
        const inst = grantPart(this.state, d.itemId, d.grantId);
        this.loot.removeDrop(d);
        if (inst) {
          this.events.emit('PART_LOOTED', { itemId: d.itemId, instanceId: inst.instanceId });
          this.audio.play('part'); this.fx.burst('electric', this.player.center(), 20);
          this.hud.banner('PEÇA OBTIDA', ITEMS[d.itemId].name, 3000);
          this.hud.toast(ITEMS[d.itemId].desc, 'loot');
          this.quest({ type: 'collect', itemId: d.itemId });
          if (d.itemId === 'P11' && this.stats.moveset === 'none') this.hud.toast('Leve a peça até uma bancada para montá-la', 'quest');
          this.saveTo('auto');
        }
      }
    }
  }

  // ------------------------------------------------------------------ laço principal
  frame() {
    const now = performance.now();
    let dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now; this.frameDt = dt;
    this.frames++;
    try {
      this.renderer.sampleFrame(dt, now);
      this.input.poll(dt);
      this.pollMenuPad();
      if (this.mode === 'play' && this.input.consume('pause')) this.pause();
      if (this.hitstopT > 0) { this.hitstopT -= dt; dt *= 0.06; }
      if (this.mode === 'play' || this.mode === 'dead') {
        this.state.playtimeSeconds += dt;
        this.acc += dt;
        let n = 0;
        while (this.acc >= 1 / 60 && n < 5) { this.fixed(1 / 60); this.acc -= 1 / 60; n++; }
        if (n === 5) this.acc = 0;
      }
      this.render(dt);
    } catch (e: any) {
      if (this.errors.length < 20) this.reportError('Erro no quadro: ' + (e?.stack ?? e));
    }
    this.input.endFrame();
  }
  fixed(dt: number) {
    this.time += dt;
    const P = this.player;
    if (this.mode === 'play' && this.cinematic <= 0) this.cam.applyLook(this.input.look.x, this.input.look.y);
    this.input.look.x = this.input.look.y = 0;
    if (this.mode === 'play') {
      if (this.input.consume('shoulder')) { this.settings.shoulder = this.settings.shoulder === 1 ? -1 : 1; this.cam.shoulder = this.settings.shoulder; saveSettings(this.settings); }
      if (this.input.consume('lock')) this.toggleLock();
      this.interactTarget = P.alive && !P.busy ? this.findInteract() : null;
      if (this.input.consume('interact') && this.interactTarget) { const it = this.interactTarget; this.interactTarget = null; this.doInteract(it); }
    }
    P.conveyorPush.set(0, 0, 0);
    for (const c of this.level.conveyors) if (P.grounded && c.contains(P.pos)) P.conveyorPush.copy(c.push);
    P.fixedUpdate(dt);
    if (P.pos.y < -15) { const t = this.level.terminals.find((x) => x.id === this.state.checkpointId) ?? this.level.terminals[0]; P.teleport(t.respawn); }
    for (const pr of this.level.presses) {
      pr.update(dt);
      const pd = Math.hypot(P.pos.x - pr.x, P.pos.z - pr.z);
      if (pr.justSlammed) { this.audio.play('press', clamp(1 - pd / 30, 0, 1)); if (pd < 14) this.shake(0.15); this.fx.burst('dust', new THREE.Vector3(pr.x, 0.4, pr.z), 14); }
      if (pr.dangerous()) {
        if (pr.inside(P.pos) && P.pos.y < 2.5) {
          const away = new THREE.Vector3(P.pos.x - pr.x, 0, P.pos.z - pr.z); if (away.lengthSq() < 0.01) away.set(0, 0, 1); away.normalize();
          const hit: EnemyHit = { amount: 28, stagger: 60, type: 'kinetic', blockable: false, from: new THREE.Vector3(pr.x, 0, pr.z), source: pr.id };
          if (P.applyDamage(hit)) { P.vel.x = away.x * 9; P.vel.z = away.z * 9; }
        }
        for (const e of this.enemies) if (e.alive && pr.inside(e.pos)) e.receiveHit({ amount: 200, crit: false, stagger: 99, dir: new THREE.Vector3(0, 0, 1), heavy: true, from: new THREE.Vector3(pr.x, 3, pr.z), attackId: 'press' });
      }
    }
    for (const g of this.level.gates.values()) g.update(dt);
    for (const e of this.enemies) e.update(dt);
    this.enemies = this.enemies.filter((e) => !e.removed);
    this.boss?.update(dt);
    this.updateArena(dt);
    this.physics.step();
    if (this.cinematic > 0) { this.cinematic -= dt; if (this.cinematic <= 0) this.cam.override = null; }
    const lt = P.lockTarget;
    if (lt && (!lt.alive || lt.pos.distanceTo(P.pos) > 22)) P.lockTarget = null;
    if (!P.lockTarget && this.settings.autoLock && P.state === 'attack') { const t = P.softTarget(8, 1); if (t) P.lockTarget = t; }
    if (this.mode === 'play') { this.checkTriggers(); this.updateSector(); }
    const got = this.loot.update(dt, P.pos, this.time, (x, z, y) => { const h = this.physics.rayStatic(x, y + 0.5, z, 0, -1, 0, 6); return h === null ? 0 : y + 0.5 - h; });
    for (const g of got) {
      grantMaterials(this.state, { [g.kind]: g.amount });
      if (g.kind === 'scrap') this.state.scrapSinceTerminal += g.amount;
      this.audio.play('pickup', 0.5);
    }
    this.autosaveT += dt;
    if (this.autosaveT > 90 && this.mode === 'play' && !this.bossFight && !this.arena.active && this.attackTokens.size === 0 && P.alive) { this.autosaveT = 0; this.saveTo('auto'); }
    this.state.player.hp = Math.max(0, Math.round(P.hp));
  }
  toggleLock() {
    const P = this.player;
    const cands = this.targets().filter((t) => t.lockable && t.pos.distanceTo(P.pos) < 18);
    if (!cands.length) { P.lockTarget = null; return; }
    const scored = cands.map((t) => { const s = this.project(t.lockPoint(new THREE.Vector3())); return { t, s: s.on ? Math.hypot(s.nx, s.ny) + t.pos.distanceTo(P.pos) * 0.02 : 99 }; }).sort((a, b) => a.s - b.s);
    if (!P.lockTarget) P.lockTarget = scored[0].s < 99 ? scored[0].t : null;
    else {
      const i = scored.findIndex((x) => x.t === P.lockTarget);
      P.lockTarget = scored.length > 1 && i >= 0 && i < scored.length - 1 ? scored[i + 1].t : null;
    }
    this.audio.play('ui', 0.5);
  }
  pollMenuPad() {
    if (!this.screens.open) { this.padPrev = []; return; }
    const gp = [...(navigator.getGamepads?.() ?? [])].find((p) => p && p.connected);
    if (!gp) return;
    const b = (i: number) => !!gp.buttons[i]?.pressed;
    const now = [b(12) || (gp.axes[1] ?? 0) < -0.6, b(13) || (gp.axes[1] ?? 0) > 0.6, b(0), b(1) || b(9)];
    const prev = this.padPrev;
    if (now[0] && !prev[0]) this.screens.navigate(-1);
    if (now[1] && !prev[1]) this.screens.navigate(1);
    if (now[2] && !prev[2]) this.screens.activate();
    if (now[3] && !prev[3]) this.screens.back();
    this.padPrev = now;
  }

  render(dt: number) {
    const P = this.player;
    const realDt = this.frameDt;
    if (this.mode !== 'pause') P.render(dt);
    const f = P.forward(), r = new THREE.Vector3(-f.z, 0, f.x);
    const want = new THREE.Vector3(P.pos.x - r.x * 0.9 - f.x * 0.6, P.pos.y + 2.05 + Math.sin(this.time * 2) * 0.12, P.pos.z - r.z * 0.9 - f.z * 0.6);
    this.pixel.pos.lerp(want, 1 - Math.exp(-4 * realDt));
    this.pixel.root.position.copy(this.pixel.pos); this.pixel.root.rotation.y = P.heading + Math.sin(this.time * 0.7) * 0.4;
    this.pixel.anim.update(realDt); this.ferro.anim.update(realDt);
    if (this.cam.override) {
      this.cam.override.blend = Math.min(1, this.cam.override.blend + realDt * 2.5);
      if (this.boss && this.cinematic > 0) this.cam.override.look.set(this.boss.pos.x, 3, this.boss.pos.z);
      if (this.mode === 'title') { const t = performance.now() / 1000; this.cam.override.pos.set(Math.sin(t * 0.06) * 13 - 2, 5.5 + Math.sin(t * 0.1), Math.cos(t * 0.06) * 13 - 2); this.cam.override.look.set(-2, 1.5, -2); }
    }
    this.cam.lockTarget = P.lockTarget ? P.lockTarget.lockPoint(new THREE.Vector3()) : null;
    this.cam.update(realDt, P.robot.root.position, this.physics, P.heading, P.lastSpeed > 0.5);
    (this.scene.userData as any).camPos = this.cam.cam.position;
    // evita ver o interior do modelo quando a câmera encosta no Z-01
    const camNear = this.cam.override ? 99 : this.cam.cam.position.distanceTo(this.tmp.copy(P.robot.root.position).setY(P.robot.root.position.y + 1.2));
    P.robot.root.visible = camNear > 0.95;
    const sun = this.level.sun, c = this.cam.focus;
    sun.position.set(c.x - 30, c.y + 45, c.z + 40); sun.target.position.set(c.x, 0, c.z); sun.target.updateMatrixWorld();
    for (const a of this.level.animated) a.fn(a.obj, this.time + (this.mode === 'title' ? performance.now() / 1000 : 0));
    for (const cv of this.level.conveyors) cv.tex.offset.y -= cv.push.x * realDt * 0.25;
    if (this.mode === 'play' || this.mode === 'dead') { this.fx.update(dt); this.tele.update(dt); }
    this.audio.update(realDt);
    if (this.mode === 'play' || this.mode === 'dead') this.updateHud(realDt);
    this.renderer.r.render(this.scene, this.cam.cam);
  }
  waypointPos(key: string): THREE.Vector3 | null {
    const p = this.player.pos;
    if (key === 'drop') return this.loot.drops.find((d) => !d.grantId.includes('P03') && !d.grantId.includes('P18'))?.pos ?? null;
    if (key === 'e02_quest') return this.enemies.find((e) => e.spawn.questTag === 'e02_quest' && e.alive)?.pos ?? this.level.markers.get('r_yard') ?? null;
    if (key === 'boss') return this.boss?.pos ?? this.level.bossCenter;
    if (key === 'tool') {
      const left = this.level.interactables.filter((i) => i.kind === 'tool' && !i.used);
      left.sort((a, b) => a.pos.distanceTo(p) - b.pos.distanceTo(p));
      return left[0]?.pos ?? null;
    }
    if (key === 'cond') {
      const left = this.level.interactables.filter((i) => i.kind === 'conductor' && !i.used);
      left.sort((a, b) => a.pos.distanceTo(p) - b.pos.distanceTo(p));
      return left[0]?.pos ?? null;
    }
    return this.level.markers.get(key) ?? null;
  }
  objectiveBeacon(wp: THREE.Vector3 | null) {
    const P = this.player, dt = this.frameDt;
    this.beacon.update(wp, wp ? Math.hypot(wp.x - P.pos.x, wp.z - P.pos.z) : 0, dt, this.time);
    // feixes ciano nos objetos das tarefas secundárias ativas
    const side = this.interactables().filter((i) => i.kind === 'tool' || i.kind === 'lever');
    this.sideBeacons.forEach((b, i) => { const it = side[i]; b.update(it ? it.pos : null, it ? Math.hypot(it.pos.x - P.pos.x, it.pos.z - P.pos.z) : 0, dt, this.time); });
  }
  updateHud(dt: number) {
    const P = this.player, s = this.state;
    const mq = mainQuest(s); const st = mq ? questStage(s, mq.id) : null;
    let text = st?.text ?? '';
    if (st?.type === 'count' && mq) text += ` (${countProgress(s, mq.id, st.id)}/${st.count})`;
    const side = activeQuests(s).filter((q) => q.kind === 'side').map((q) => { const ss = questStage(s, q.id); return `◇ ${q.title}${ss?.type === 'count' ? ` (${countProgress(s, q.id, ss.id)}/${ss.count})` : ''}`; }).join('\n');
    const touchUi = isTouchDevice();
    const place = (wp: THREE.Vector3 | null, minDist: number, maxDist = 1e9): HudFrame['waypoint'] => {
      if (!wp) return null;
      const pt = wp.clone(); pt.y = Math.max(pt.y, 0) + 1.6;
      const pr = this.project(pt); const dist = Math.hypot(wp.x - P.pos.x, wp.z - P.pos.z);
      if (dist <= minDist || dist > maxDist) return null;
      // área segura: não cobre barras (topo-esquerda), objetivo (topo-direita) nem controles de toque (base)
      const top = touchUi ? 0.2 : 0.14, bot = touchUi ? 0.62 : 0.86;
      if (pr.on && pr.z < 1) return { x: pr.x, y: clamp(pr.y, innerHeight * 0.06, innerHeight * bot), on: true, ang: 0, dist };
      let nx = pr.nx, ny = pr.ny; if (pr.z > 1) { nx = -nx; ny = -ny; }
      const ang = Math.atan2(-ny, nx);
      const m = 0.86, k = Math.min(m / Math.max(1e-3, Math.abs(Math.cos(ang))), m / Math.max(1e-3, Math.abs(Math.sin(ang))));
      const y = clamp((Math.sin(ang) * k * 0.5 + 0.5) * innerHeight, innerHeight * top, innerHeight * bot);
      return { x: (Math.cos(ang) * k * 0.5 + 0.5) * innerWidth, y, on: false, ang, dist };
    };
    const waypoint = place(st?.waypoint ? this.waypointPos(st.waypoint) : null, 2.5);
    this.objectiveBeacon(st?.waypoint && !this.bossFight ? this.waypointPos(st.waypoint) : null);
    // tarefa secundária mais próxima (marcador ciano)
    let sideWp: THREE.Vector3 | null = null, sd = 1e9;
    for (const q of activeQuests(s)) {
      if (q.kind !== 'side') continue;
      const ss = questStage(s, q.id); if (!ss?.waypoint) continue;
      const v = this.waypointPos(ss.waypoint); if (!v) continue;
      const d = v.distanceTo(P.pos); if (d < sd) { sd = d; sideWp = v; }
    }
    const sideWaypoint = place(sideWp, 2.5, 70);
    let lock: HudFrame['lock'] = null;
    if (P.lockTarget) { const pr = this.project(P.lockTarget.lockPoint(new THREE.Vector3())); if (pr.on) lock = { x: pr.x, y: pr.y, hp: P.lockTarget.hpFrac(), name: P.lockTarget.name }; }
    const bars: HudFrame['bars'] = [];
    for (const e of this.enemies) {
      if (!e.alive || e === P.lockTarget || this.time - e.lastHitT > 4 || e.hp >= e.def.hp) continue;
      const pt = e.pos.clone(); pt.y += e.height + 0.4; const pr = this.project(pt);
      if (pr.on && e.pos.distanceTo(P.pos) < 25) bars.push({ x: pr.x, y: pr.y, hp: e.hpFrac(), key: e.id });
    }
    const b = this.boss && this.bossFight && this.boss.alive ? { name: this.boss.name, frac: this.boss.hpFrac(), phase: this.boss.phase, exposed: this.boss.coreExposed } : null;
    const it = this.interactTarget;
    const touch = isTouchDevice();
    const pk = this.input.lastDevice === 'pad' ? 'X' : 'E';
    this.touch.setInteract(it ? it.label : null);
    this.fpsAcc.t += dt; this.fpsAcc.n++;
    if (this.fpsAcc.t > 0.5) { const st2 = this.renderer.stats; this.fpsAcc.txt = this.settings.showFps ? `${Math.round(this.fpsAcc.n / this.fpsAcc.t)} FPS • ${st2.calls} draws • ${st2.profile} ${st2.pr.toFixed(2)}x` : ''; this.fpsAcc.t = 0; this.fpsAcc.n = 0; }
    this.hud.update({
      hp: P.hp, hpMax: this.stats.hpMax, en: P.en, enMax: this.stats.enMax, heat: P.heat, heatLock: P.heat >= 99, stab: P.stab,
      level: s.player.level, xpFrac: s.player.xp / xpToNext(s.player.level), scrap: s.inventory.materials.scrap, alloy: s.inventory.materials.alloy, cells: s.inventory.materials.cells,
      objective: mq ? { title: mq.title, text, side } : side ? { title: 'Tarefas', text: '', side } : null,
      waypoint, sideWaypoint, lock, bars, boss: b, prompt: it && !touch ? { key: pk, label: it.label } : null,
      ability: this.stats.abilities.has('winch') ? { name: 'Guincho', cd: P.abilityCd / 3, ready: P.abilityCd <= 0 } : null,
      hurt: P.hurtFlash * (this.settings.reduceFlashes ? 0.4 : 0.8), lowHp: P.hp / this.stats.hpMax < 0.25 && P.alive, fps: this.fpsAcc.txt, touch,
    }, dt);
  }

  // ------------------------------------------------------------------ API de teste (Playwright)
  exposeTestApi() {
    const g = this;
    (window as any).__SZ = {
      get mode() { return g.mode; },
      get errors() { return [...g.errors]; },
      get frames() { return g.frames; },
      get time() { return g.time; },
      state: () => JSON.parse(JSON.stringify(g.state)),
      player: () => ({ x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z, hp: g.player.hp, en: g.player.en, state: g.player.state, grounded: g.player.grounded, heading: g.player.heading, armR: g.player.robot.loadout.armR }),
      stats: () => ({ ...g.stats, abilities: [...g.stats.abilities] }),
      renderStats: () => g.renderer.stats,
      newGame: (d: GameState['difficulty'] = 'standard') => { g.screens.clear(); g.startNew(d); },
      teleport: (x: number, y: number, z: number, h = 0) => { g.player.teleport(new THREE.Vector3(x, y, z), h); g.cam.snapBehind(h); g.updateSector(true); },
      setCam: (yaw: number, pitch: number) => { g.cam.yaw = yaw; g.cam.pitch = pitch; },
      enemies: () => g.enemies.filter((e) => e.alive).map((e) => ({ id: e.id, def: e.def.id, x: e.pos.x, z: e.pos.z, hp: e.hp, state: e.state, tag: e.spawn.questTag })),
      boss: () => g.boss ? { hp: g.boss.hp, phase: g.boss.phase, state: g.boss.state, alive: g.boss.alive, x: g.boss.pos.x, z: g.boss.pos.z, fight: g.bossFight } : null,
      damageEnemy: (idx: number, amount: number, heavy = false) => { const e = g.enemies.filter((x) => x.alive)[idx]; e?.receiveHit({ amount, crit: false, stagger: 10, dir: new THREE.Vector3(0, 0, 1), heavy, from: g.player.pos.clone(), attackId: 'test' }); },
      damageEnemyTag: (tag: string, amount: number) => { const e = g.enemies.find((x) => x.alive && x.spawn.questTag === tag); e?.receiveHit({ amount, crit: false, stagger: 10, dir: new THREE.Vector3(0, 0, 1), heavy: false, from: g.player.pos.clone(), attackId: 'test' }); return !!e; },
      killAll: () => { for (const e of g.enemies.filter((x) => x.alive)) e.receiveHit({ amount: 9999, crit: false, stagger: 99, dir: new THREE.Vector3(0, 0, 1), heavy: true, from: g.player.pos.clone(), attackId: 'test' }); },
      damageBoss: (amount: number) => g.boss?.receiveHit({ amount, crit: false, stagger: 10, dir: new THREE.Vector3(0, 0, 1), heavy: false, from: g.player.pos.clone(), attackId: 'test' }),
      interactNearest: () => { const it = g.findInteract(); if (it) g.doInteract(it); return it?.id ?? null; },
      interact: (id: string) => { const it = g.level.interactables.find((i) => i.id === id); if (it) g.doInteract(it); return !!it; },
      equipItem: (itemId: string) => { const p = g.state.inventory.parts.find((x) => x.itemId === itemId); if (!p) return false; const r = doEquip(g.state, p.instanceId); if (r.ok) g.afterEquip(); return r.ok; },
      openWorkshop: (mode: 'field' | 'full' = 'full') => g.openWorkshop(mode, 'Bancada'),
      closeMenus: () => { g.screens.clear(); g.workshop = null; g.cam.override = null; g.resume(); },
      pause: () => g.pause(),
      quest: (id: string) => g.state.quests[id],
      flags: () => ({ ...g.state.flags }),
      gate: (id: string) => g.level.gates.get(id)?.open ?? null,
      plateBroken: (id: string) => g.level.plates.get(id)?.broken ?? null,
      save: (slot: SaveSlot = 'slot1') => g.saveTo(slot),
      load: (slot: SaveSlot = 'slot1') => g.loadSlot(slot),
      setQuality: (q: Settings['quality']) => { g.settings.quality = q; g.renderer.setQuality(q); },
      killPlayer: () => { g.player.applyDamage({ amount: 99999, stagger: 0, type: 'kinetic', blockable: false, from: g.player.pos.clone(), source: 'test' }); },
      grant: (m: { scrap?: number; alloy?: number }) => grantMaterials(g.state, m),
      drops: () => g.loot.drops.map((d) => ({ itemId: d.itemId, x: d.pos.x, z: d.pos.z })),
      press: (action: string, ms = 80) => { g.input.setAction(action as any, true); setTimeout(() => g.input.setAction(action as any, false), ms); },
      move: (x: number, y: number) => { g.input.virtualMove = { x, y, active: x !== 0 || y !== 0 }; },
      screen: () => document.querySelector('#screens .screen:last-child')?.className ?? '',
    };
  }
}
