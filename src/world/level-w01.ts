// Mundo 1 — Ferro-Velho 09: layout autorado à mão em 5 setores conectados (GDD §8.2).
import * as THREE from 'three';
import type { Physics } from '../engine/physics';
import { LevelBuilder, NavGrid, boxGeo, type AABB } from './builder';
import { makeTextures, type TexSet } from './textures';
import { Gate, Plate, Conveyor, Press, Column } from './dynamic';
import { rng } from '../core/math';

export type InteractKind = 'terminal' | 'crate' | 'conductor' | 'panel' | 'cage' | 'tool' | 'memory' | 'lever' | 'anchor' | 'cache' | 'pickup';
export interface Interactable { id: string; kind: InteractKind; pos: THREE.Vector3; label: string; obj?: THREE.Object3D; used: boolean; radius: number; hidden?: boolean; data?: any }
export interface Trigger { id: string; box: AABB; inside: boolean }
export interface SpawnDef { id: string; def: string; x: number; z: number; y?: number; patrol?: [number, number][]; sector: string; questTag?: string; when?: string; group?: string }
export interface Sector { id: string; name: string; minZ: number; maxZ: number; music: 'exploration' | 'hub' }
export interface TerminalDef { id: string; name: string; pos: THREE.Vector3; respawn: THREE.Vector3; workshop: 'none' | 'field' | 'full'; sector: string }

export interface Level {
  builder: LevelBuilder; nav: NavGrid; tex: TexSet;
  gates: Map<string, Gate>; plates: Map<string, Plate>; conveyors: Conveyor[]; presses: Press[]; columns: Column[];
  interactables: Interactable[]; triggers: Trigger[]; spawns: SpawnDef[]; sectors: Sector[]; terminals: TerminalDef[];
  markers: Map<string, THREE.Vector3>; mats: Record<string, THREE.MeshStandardMaterial>;
  animated: { obj: THREE.Object3D; fn: (o: THREE.Object3D, t: number) => void }[];
  lights: THREE.PointLight[]; sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight;
  cage: THREE.Group; anchorDoors: THREE.Group[]; elevatorPlatform?: THREE.Object3D;
  bossCenter: THREE.Vector3; arenaRadius: number;
}

export function buildW01(scene: THREE.Scene, physics: Physics, quality: { propDensity: number; shadows: boolean; shadowSize: number; drawDistance: number }): Level {
  const tex = makeTextures();
  const M = (name: string, o: THREE.MeshStandardMaterialParameters) => { const m = new THREE.MeshStandardMaterial(o); m.name = name; return m; };
  const mats = {
    ground: M('ground', { map: tex.ground, roughness: 0.95, metalness: 0.05, color: 0xffffff }),
    c0: M('cont0', { map: tex.containers[0], roughness: 0.75, metalness: 0.35 }),
    c1: M('cont1', { map: tex.containers[1], roughness: 0.75, metalness: 0.35 }),
    c2: M('cont2', { map: tex.containers[2], roughness: 0.75, metalness: 0.35 }),
    c3: M('cont3', { map: tex.containers[3], roughness: 0.75, metalness: 0.35 }),
    c4: M('cont4', { map: tex.containers[4], roughness: 0.75, metalness: 0.35 }),
    plate: M('plateFloor', { map: tex.plate, roughness: 0.55, metalness: 0.7 }),
    concrete: M('concrete', { map: tex.concrete, roughness: 0.92, metalness: 0.02 }),
    hazard: M('hazardStripe', { map: tex.hazard, roughness: 0.6, metalness: 0.2 }),
    belt: M('belt', { map: tex.belt, roughness: 0.85, metalness: 0.1 }),
    rust: M('rustPanel', { map: tex.rustPanel, roughness: 0.88, metalness: 0.4 }),
    crack: M('crackPlate', { map: tex.crack, roughness: 0.7, metalness: 0.3, emissive: 0x3a1a00, emissiveIntensity: 0.6 }),
    steel: M('steelL', { color: 0x6f767e, roughness: 0.42, metalness: 0.85 }),
    dark: M('darkL', { color: 0x2a2d31, roughness: 0.6, metalness: 0.6 }),
    rubber: M('rubberL', { color: 0x1c1d1f, roughness: 0.95, metalness: 0 }),
    wood: M('sleeper', { color: 0x4a3b2e, roughness: 0.95, metalness: 0 }),
    teal: M('tealLed', { color: 0x39f0ff, emissive: 0x39f0ff, emissiveIntensity: 2.4, roughness: 0.3 }),
    amber: M('amberLed', { color: 0xffa62b, emissive: 0xffa62b, emissiveIntensity: 2.2, roughness: 0.3 }),
    red: M('redLed', { color: 0xff3b2f, emissive: 0xff3b2f, emissiveIntensity: 2.4, roughness: 0.3 }),
    orange: M('hingeOrange', { color: 0xe8641e, emissive: 0x6a2000, emissiveIntensity: 0.5, roughness: 0.5, metalness: 0.3 }),
    yellowPaint: M('yellowPaint', { color: 0xd9a21b, roughness: 0.6, metalness: 0.3 }),
    redPaint: M('redPaint', { color: 0x8f2a1c, roughness: 0.7, metalness: 0.35 }),
    bluePaint: M('bluePaint', { color: 0x2f4f66, roughness: 0.65, metalness: 0.35 }),
    far: M('farSilhouette', { color: 0x5b4636, roughness: 1, metalness: 0, flatShading: true }),
    far2: M('farSilhouette2', { color: 0x3e3530, roughness: 1, metalness: 0.1, flatShading: true }),
    glass: M('glassL', { color: 0x10202a, roughness: 0.1, metalness: 0.5, emissive: 0x0a3040, emissiveIntensity: 0.6 }),
  };
  const B = new LevelBuilder(physics);
  const conts = [mats.c0, mats.c1, mats.c2, mats.c3, mats.c4];
  const R = rng(909);
  const interactables: Interactable[] = [];
  const triggers: Trigger[] = [];
  const markers = new Map<string, THREE.Vector3>();
  const animated: Level['animated'] = [];
  const lights: THREE.PointLight[] = [];
  const props = new THREE.Group(); scene.add(props);

  // ---------------- céu, névoa, luz ----------------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(380, 24, 12), new THREE.MeshBasicMaterial({ map: tex.sky, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -10; scene.add(sky); sky.name = 'sky';
  animated.push({ obj: sky, fn: (o) => { const cam = (scene as any).userData.camPos as THREE.Vector3 | undefined; if (cam) o.position.set(cam.x, 0, cam.z); } });
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(16, 32), new THREE.MeshBasicMaterial({ color: 0xffe2b0, fog: false, transparent: true, opacity: 0.9 }));
  sunDisc.position.set(-160, 120, 260); sunDisc.lookAt(0, 0, 0); sky.add(sunDisc);
  scene.fog = new THREE.Fog(0xc6a07c, 35, quality.drawDistance);
  scene.background = new THREE.Color(0xc6a07c);
  const hemi = new THREE.HemisphereLight(0xbfd4e6, 0x6b4a32, 1.15); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b8, 2.6);
  sun.position.set(-30, 45, 40);
  sun.castShadow = quality.shadows;
  sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
  const sc = sun.shadow.camera; sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 140;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun); scene.add(sun.target);

  // ---------------- chão ----------------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mats.ground);
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 110); ground.receiveShadow = true;
  (mats.ground.map as THREE.Texture).repeat.set(120, 120);
  scene.add(ground);
  physics.addBox(0, -0.5, 110, 300, 0.5, 300);

  // ---------------- primitivas de cenário ----------------
  const CW = 6.06, CH = 2.6, CD = 2.44;
  const container = (x: number, z: number, rotY: number, level = 0, mat?: THREE.Material, collide = true) => {
    const m = mat ?? conts[Math.floor(R() * conts.length)];
    const y = level * CH + CH / 2;
    B.box(x, y, z, CW, CH, CD, m, { rotY, collide, uv: 1 / CW });
    // reforços das quinas
    const c = Math.cos(rotY), s = Math.sin(rotY);
    for (const e of [-1, 1]) B.addGeo(boxGeo(0.14, CH + 0.02, CD + 0.04, 1), mats.dark, { x: x + e * (CW / 2) * c, y, z: z - e * (CW / 2) * s }, rotY);
  };
  /** parede de contêineres empilhados entre dois pontos (ao longo de x ou z) */
  const wallX = (x0: number, x1: number, z: number, levels = 2) => {
    const n = Math.max(1, Math.round((x1 - x0) / CW)); const step = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const x = x0 + step * (i + 0.5);
      const lv = levels + (R() > 0.75 ? 1 : 0);
      for (let l = 0; l < lv; l++) container(x + (l ? (R() - 0.5) * 0.4 : 0), z + (l ? (R() - 0.5) * 0.3 : 0), (l ? (R() - 0.5) * 0.06 : 0), l, undefined, l < 2);
      if (lv > 2) B.addObstacle(x, CH, z, CW, CH * 2, CD);
    }
  };
  const wallZ = (z0: number, z1: number, x: number, levels = 2) => {
    const n = Math.max(1, Math.round((z1 - z0) / CW)); const step = (z1 - z0) / n;
    for (let i = 0; i < n; i++) {
      const z = z0 + step * (i + 0.5);
      const lv = levels + (R() > 0.75 ? 1 : 0);
      for (let l = 0; l < lv; l++) container(x + (l ? (R() - 0.5) * 0.3 : 0), z, Math.PI / 2 + (l ? (R() - 0.5) * 0.06 : 0), l, undefined, l < 2);
    }
  };
  const crate = (x: number, z: number, w: number, h: number, d: number, y0 = 0, mat: THREE.Material = mats.rust) => {
    B.box(x, y0 + h / 2, z, w, h, d, mat, { uv: 0.6 });
    B.addGeo(boxGeo(w + 0.04, 0.1, d + 0.04, 1), mats.dark, { x, y: y0 + h - 0.05, z });
  };
  const barrelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.9, 12);
  const tireGeo = new THREE.TorusGeometry(0.42, 0.17, 8, 14);
  const chunkGeo = new THREE.BoxGeometry(1, 1, 1);
  const pipeGeo = new THREE.CylinderGeometry(0.18, 0.18, 1, 8);
  const scrapPile = (x: number, z: number, r: number, h: number, collide = true) => {
    const n = Math.round((12 + r * r * 2.2) * quality.propDensity);
    const pm = [mats.rust, mats.steel, mats.dark, mats.redPaint, mats.bluePaint, mats.yellowPaint, mats.rubber];
    // núcleo do monte
    const core = new THREE.IcosahedronGeometry(1, 1);
    const pos = core.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) { const k = 0.8 + R() * 0.4; pos.setXYZ(i, pos.getX(i) * k, Math.max(-0.2, pos.getY(i)) * k, pos.getZ(i) * k); }
    core.computeVertexNormals();
    B.addGeo(core, mats.rust, { x, y: 0, z }, R() * 6, 0, 1);
    const coreMesh = core.clone(); coreMesh.scale(r * 0.85, h * 0.9, r * 0.85);
    B.addGeo(coreMesh, mats.far2, { x, y: 0, z }, R() * 6);
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r;
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      const py = Math.max(0.1, (1 - d / r) * h * (0.6 + R() * 0.5));
      const t = R();
      const mat = pm[Math.floor(R() * pm.length)];
      if (t < 0.45) { const g = chunkGeo.clone(); g.scale(0.4 + R() * 1.4, 0.2 + R() * 0.8, 0.4 + R() * 1.2); B.addGeo(g, mat, { x: px, y: py, z: pz }, R() * 6, (R() - 0.5) * 0.8); }
      else if (t < 0.65) B.addGeo(barrelGeo, R() > 0.5 ? mats.yellowPaint : mats.redPaint, { x: px, y: py, z: pz }, R() * 6, (R() - 0.5) * 2.5);
      else if (t < 0.8) B.addGeo(tireGeo, mats.rubber, { x: px, y: py, z: pz }, R() * 6, R() * 3);
      else { const g = pipeGeo.clone(); g.scale(1, 1.5 + R() * 3, 1); B.addGeo(g, mats.steel, { x: px, y: py, z: pz }, R() * 6, Math.PI / 2 + (R() - 0.5)); }
    }
    if (collide) { B.colliders.push(physics.addCylinder(x, h * 0.35, z, h * 0.35, r * 0.72)); B.addObstacle(x, h * 0.35, z, r * 1.4, h * 0.7, r * 1.4); }
  };
  const lamp = (x: number, z: number, real = false) => {
    B.addGeo(new THREE.CylinderGeometry(0.09, 0.12, 6, 8), mats.dark, { x, y: 3, z });
    B.addGeo(boxGeo(1.4, 0.12, 0.2, 1), mats.dark, { x: x + 0.6, y: 5.95, z });
    B.addGeo(boxGeo(0.5, 0.12, 0.3, 1), mats.teal, { x: x + 1.1, y: 5.85, z }, 0, 0, 1, false);
    physics.addCylinder(x, 3, z, 3, 0.14); B.addObstacle(x, 3, z, 0.3, 6, 0.3);
    if (real && lights.length < 6) { const l = new THREE.PointLight(0x39f0ff, 8, 12, 2); l.position.set(x + 1.1, 5.5, z); scene.add(l); lights.push(l); }
  };
  const rails = (x: number, z0: number, z1: number) => {
    const len = z1 - z0, zc = (z0 + z1) / 2;
    for (const dx of [-0.72, 0.72]) B.addGeo(boxGeo(0.12, 0.16, len, 1), mats.steel, { x: x + dx, y: 0.16, z: zc }, 0, 0, 1, false);
    for (let z = z0; z < z1; z += 0.9) B.addGeo(boxGeo(2.4, 0.1, 0.32, 1), mats.wood, { x, y: 0.05, z }, (R() - 0.5) * 0.05, 0, 1, false);
  };
  const wagon = (x: number, z: number, mat: THREE.Material) => {
    B.box(x, 1.75, z, 2.9, 2.5, 9, mat, { uv: 0.3 });
    B.addGeo(boxGeo(3.1, 0.2, 9.2, 1), mats.dark, { x, y: 3.05, z });
    B.addGeo(boxGeo(2.4, 0.5, 8.4, 1), mats.dark, { x, y: 0.35, z });
    for (const dz of [-3.2, -2.2, 2.2, 3.2]) for (const dx of [-0.75, 0.75]) B.addGeo(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 12), mats.steel, { x: x + dx, y: 0.38, z: z + dz }, 0, Math.PI / 2);
  };
  const fence = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0), rot = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i <= len; i += 2.5) { const t = i / len; B.addGeo(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6), mats.dark, { x: x0 + (x1 - x0) * t, y: 0.9, z: z0 + (z1 - z0) * t }); }
    for (const y of [0.4, 1.0, 1.6]) B.addGeo(boxGeo(0.04, 0.04, len, 1), mats.steel, { x: (x0 + x1) / 2, y, z: (z0 + z1) / 2 }, rot);
  };
  const catwalk = (x: number, z: number, w: number, d: number, top: number, rails: ('n' | 's' | 'e' | 'w')[]) => {
    B.box(x, top - 0.15, z, w, 0.3, d, mats.plate, { uv: 0.5 });
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.addGeo(boxGeo(0.25, top - 0.3, 0.25, 1), mats.yellowPaint, { x: x + dx * (w / 2 - 0.2), y: (top - 0.3) / 2, z: z + dz * (d / 2 - 0.2) });
    for (const r of rails) {
      const along = r === 'n' || r === 's';
      const px = r === 'e' ? x - w / 2 + 0.05 : r === 'w' ? x + w / 2 - 0.05 : x;
      const pz = r === 'n' ? z + d / 2 - 0.05 : r === 's' ? z - d / 2 + 0.05 : z;
      B.box(px, top + 0.55, pz, along ? w : 0.08, 1.1, along ? 0.08 : d, mats.yellowPaint, { nav: false });
    }
  };
  const machine = (x: number, z: number, w: number, h: number, d: number, mat: THREE.Material) => {
    B.box(x, h / 2, z, w, h, d, mat, { uv: 0.4 });
    B.addGeo(boxGeo(w * 0.6, 0.6, d * 0.6, 1), mats.dark, { x, y: h + 0.3, z });
    B.addGeo(new THREE.CylinderGeometry(0.3, 0.3, 2.5, 10), mats.steel, { x: x + w * 0.3, y: h + 1.25, z: z - d * 0.2 });
    B.addGeo(boxGeo(w * 0.5, 0.2, 0.05, 1), mats.amber, { x, y: h * 0.7, z: z + d / 2 + 0.03 }, 0, 0, 1, false);
  };

  const gates = new Map<string, Gate>();
  const gateMats = { door: mats.rust, frame: mats.dark, light: mats.red };
  const addGate = (id: string, x: number, z: number, w: number, h: number) => { const g = new Gate(id, physics, x, z, w, h, gateMats); scene.add(g.group); gates.set(id, g); return g; };
  const plates = new Map<string, Plate>();
  const addPlate = (id: string, x: number, z: number, w: number, h: number, rotY = 0) => { const p = new Plate(id, physics, new THREE.Vector3(x, 0, z), w, h, mats.crack, rotY); scene.add(p.mesh); plates.set(id, p); markers.set(id, new THREE.Vector3(x, 1.2, z)); return p; };
  const interact = (id: string, kind: InteractKind, x: number, y: number, z: number, label: string, obj?: THREE.Object3D, data?: any, hidden = false) => {
    const it: Interactable = { id, kind, pos: new THREE.Vector3(x, y, z), label, obj, used: false, radius: 2.2, data, hidden };
    interactables.push(it); markers.set(id, it.pos); return it;
  };
  const trigger = (id: string, x: number, y: number, z: number, w: number, h: number, d: number) => { triggers.push({ id, box: { minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2, minZ: z - d / 2, maxZ: z + d / 2 }, inside: false }); markers.set(id, new THREE.Vector3(x, y, z)); };

  // objetos interativos com malha própria
  const terminalObj = (x: number, z: number, rotY: number, bench: boolean) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
    const base = new THREE.Mesh(boxGeo(1.0, 1.1, 0.7, 1), mats.bluePaint); base.position.y = 0.55; base.castShadow = true; g.add(base);
    const scr = new THREE.Mesh(boxGeo(0.8, 0.55, 0.08, 1), mats.glass); scr.position.set(0, 1.45, 0.05); scr.rotation.x = -0.25; g.add(scr);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.04), mats.teal); led.position.set(0, 1.12, 0.36); g.add(led);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), mats.dark); ant.position.set(0.4, 2.0, -0.2); g.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mats.teal); tip.position.set(0.4, 2.6, -0.2); g.add(tip);
    if (bench) {
      const t = new THREE.Mesh(boxGeo(2.6, 0.12, 1.1, 1), mats.plate); t.position.set(-2.0, 0.95, 0); t.castShadow = true; g.add(t);
      for (const dx of [-3.1, -0.9]) { const l = new THREE.Mesh(boxGeo(0.12, 0.9, 1.0, 1), mats.dark); l.position.set(dx, 0.45, 0); g.add(l); }
      const arm = new THREE.Mesh(boxGeo(0.15, 2.4, 0.15, 1), mats.yellowPaint); arm.position.set(-2.0, 2.1, -0.5); g.add(arm);
      const arm2 = new THREE.Mesh(boxGeo(1.4, 0.15, 0.15, 1), mats.yellowPaint); arm2.position.set(-1.4, 3.25, -0.5); g.add(arm2);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 6), mats.steel); claw.position.set(-0.8, 3.0, -0.5); claw.rotation.x = Math.PI; g.add(claw);
      physics.addBox(x - 2 * Math.cos(rotY), 0.5, z + 2 * Math.sin(rotY), 1.3, 0.5, 0.55, rotY);
    }
    physics.addBox(x, 0.55, z, 0.5, 0.55, 0.35, rotY);
    B.addObstacle(x, 0.55, z, 1.2, 1.1, 1.2);
    g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    props.add(g);
    animated.push({ obj: tip, fn: (o, t) => { (o as THREE.Mesh).scale.setScalar(1 + Math.sin(t * 4) * 0.25); } });
    return g;
  };
  const crateObj = (x: number, y: number, z: number, rotY: number, color: THREE.Material) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY;
    const b = new THREE.Mesh(boxGeo(1.3, 0.7, 0.8, 1), color); b.position.y = 0.35; g.add(b);
    const lid = new THREE.Mesh(boxGeo(1.34, 0.12, 0.84, 1), mats.dark); lid.position.set(0, 0.76, 0); lid.name = 'lid'; g.add(lid);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.02), mats.amber); strip.position.set(0, 0.5, 0.41); strip.name = 'strip'; g.add(strip);
    g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    physics.addBox(x, y + 0.4, z, 0.65, 0.4, 0.4, rotY);
    props.add(g); return g;
  };
  const conductorObj = (x: number, y: number, z: number) => {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.6, 12), mats.dark); b.position.y = 0.8; g.add(b);
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 16), mats.steel); r.rotation.x = Math.PI / 2; r.position.y = 0.4 + i * 0.5; g.add(r); }
    const coreM = mats.amber.clone(); coreM.name = 'condCore';
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), coreM); c.position.y = 1.85; c.name = 'core'; g.add(c);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 0.25, 12), mats.steel); cap.position.y = 1.62; g.add(cap);
    g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; } });
    physics.addCylinder(x, y + 0.8, z, 0.8, 0.5); B.addObstacle(x, y + 0.8, z, 1.1, 1.6, 1.1);
    props.add(g);
    animated.push({ obj: c, fn: (o, t) => { o.position.y = 1.85 + Math.sin(t * 2 + x) * 0.05; } });
    return g;
  };
  const memoryObj = (x: number, y: number, z: number) => {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), mats.teal); m.position.y = 1.0; g.add(m);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.02, 6, 24), mats.teal); ring.position.y = 1.0; ring.rotation.x = Math.PI / 2; g.add(ring);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.3, 10), mats.dark); base.position.y = 0.15; g.add(base);
    props.add(g);
    animated.push({ obj: g, fn: (o, t) => { o.children[0].rotation.y = t * 1.5; o.children[0].position.y = 1.0 + Math.sin(t * 2) * 0.08; o.children[1].rotation.z = t; } });
    return g;
  };
  const toolObj = (x: number, y: number, z: number) => {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), mats.dark); h.rotation.z = Math.PI / 2; h.position.y = 0.5; g.add(h);
    const head = new THREE.Mesh(boxGeo(0.18, 0.3, 0.2, 1), mats.orange); head.position.set(0.35, 0.5, 0); g.add(head);
    const glow = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 24), mats.amber); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03; g.add(glow);
    props.add(g);
    animated.push({ obj: g, fn: (o, t) => { o.children[0].position.y = 0.5 + Math.sin(t * 3) * 0.06; o.children[1].position.y = 0.5 + Math.sin(t * 3) * 0.06; o.rotation.y = t; } });
    return g;
  };

  const terminals: TerminalDef[] = [];
  const addTerminal = (id: string, name: string, x: number, z: number, rotY: number, workshop: TerminalDef['workshop'], sector: string, bench = false) => {
    const obj = terminalObj(x, z, rotY, bench);
    const fx = Math.sin(rotY), fz = Math.cos(rotY);
    terminals.push({ id, name, pos: new THREE.Vector3(x, 0, z), respawn: new THREE.Vector3(x + fx * 2.2, 0.1, z + fz * 2.2), workshop, sector });
    interact(id, 'terminal', x, 1.0, z, workshop === 'none' ? 'Terminal' : workshop === 'field' ? 'Bancada de campo' : 'Oficina', obj).radius = 2.8;
  };

  // =====================================================================
  // SETOR A — Câmara de Triagem (1-1)
  // =====================================================================
  wallX(-12, 12, -14);
  wallZ(-14, 11, -12.5);
  wallZ(-14, 11, 13.5);
  wallX(-12.5, -2.6, 11.2); wallX(2.6, 13.5, 11.2);
  addGate('gate_a', 0, 11.2, 5.0, 4.2);
  // berço de triagem onde Z-01 desperta (baia de sucata)
  B.box(-3, 0.25, -9.5, 4.2, 0.5, 3.4, mats.plate);
  B.box(-5.2, 0.8, -9.5, 0.2, 1.6, 3.4, mats.yellowPaint); B.box(-0.8, 0.8, -9.5, 0.2, 1.6, 3.4, mats.yellowPaint);
  B.box(-3, 0.8, -11.3, 4.6, 1.6, 0.2, mats.yellowPaint);
  scrapPile(-9, -10, 2.6, 2.2); scrapPile(-9, 4, 2.2, 1.8); scrapPile(3.5, -11, 2.0, 1.6);
  // degraus de caixas até a passarela leste
  crate(4.4, -3.6, 1.6, 0.95, 1.6);
  crate(6.2, -1.8, 1.6, 1.75, 1.6);
  catwalk(9.7, 1.5, 5.4, 15, 2.25, []);
  // rampa de descida (norte da passarela, rumo oeste)
  physics.addRamp(4.4, 1.05, 7.8, 1.2, 0.12, 2.95, -Math.PI / 2, 0.39);
  // ajuste visual da rampa (inclinada)
  B.group.userData.rampFix = true;
  machine(-7, 6.5, 3, 3.2, 2.4, mats.bluePaint);
  lamp(-10.5, -2, true); lamp(11.8, -10);
  interact('crate_start', 'crate', 9.7, 2.25, 7.4, 'Abrir contêiner', crateObj(9.7, 2.25, 7.4, Math.PI, mats.yellowPaint), { scrap: 25, memory: 'm1' });
  trigger('r_ledge', 9.7, 3.2, 0, 5, 2, 7);
  trigger('r_exit11', 0, 1.5, 13.6, 5, 3, 2.4);
  addTerminal('cp_start', 'Câmara de Triagem', -7.5, -4.5, Math.PI / 2, 'none', 'A');

  // =====================================================================
  // SETOR B — Pátio dos Trilhos (1-2)
  // =====================================================================
  wallX(-23, -12.5, 11.2); wallX(13.5, 23, 11.2);
  wallZ(11.2, 58, -23); wallZ(11.2, 58, 23);
  wallX(-23, -3.2, 58.2); wallX(3.2, 23, 58.2);
  addPlate('plate_12', 0, 58.2, 6.4, 4.4);
  rails(-6, 13, 57);
  wagon(-14.5, 22, mats.c0); wagon(-14.5, 40, mats.c3);
  scrapPile(9, 21, 3.8, 3.0); scrapPile(15, 33, 4.5, 3.6); scrapPile(-18.5, 51, 3.0, 2.4); scrapPile(5, 41, 2.6, 2.0);
  crate(17, 44, 1.4, 1.4, 1.4); crate(18.2, 45.4, 1.2, 1.2, 1.2); crate(17.6, 44.6, 1.0, 1.0, 1.0, 1.4);
  fence(-3, 15, -3, 30); fence(-3, 34, -3, 52);
  lamp(2, 26, true); lamp(-9, 48); lamp(19, 26);
  addTerminal('term_field', 'Pátio dos Trilhos', 14.5, 51, -Math.PI / 2, 'field', 'B', true);
  trigger('r_yard', 0, 1.5, 18, 20, 3, 4);
  // segredo: passagem através de contêiner aberto na parede oeste -> nicho com Olho de Sucata
  for (const p of [[-28, 26.5, 0], [-28, 35.5, 0]]) for (let l = 0; l < 2; l++) container(p[0], p[1], 0, l);
  wallZ(26.5, 35.5, -31.5);
  // contêiner atravessável (sem colisor central)
  const tz = 31;
  B.addGeo(boxGeo(6.06, 0.2, 2.44, 0.5), mats.c2, { x: -24.6, y: 2.5, z: tz }, Math.PI / 2 * 0 + 0, 0);
  B.box(-24.6, 1.3, tz - 1.15, 6.06, 2.6, 0.14, mats.c2); B.box(-24.6, 1.3, tz + 1.15, 6.06, 2.6, 0.14, mats.c2);
  interact('secret_p03', 'pickup', -28, 0.6, 31, 'Recolher peça', undefined, { itemId: 'P03' });
  interact('mem_m2', 'memory', -29.5, 0, 33.5, 'Registro de memória', memoryObj(-29.5, 0, 33.5), { memory: 'm2' });
  interact('tool_1', 'tool', 19, 0, 15, 'Ferramenta do FERRO-7', toolObj(19, 0, 15), undefined, true);
  interact('cache_b1', 'cache', -20.5, 0, 14, 'Cache de sucata', crateObj(-20.5, 0, 14, 0.3, mats.redPaint), { scrap: 40 });
  interact('cache_b2', 'cache', 20.5, 0, 55.5, 'Cache de sucata', crateObj(20.5, 0, 55.5, -0.2, mats.redPaint), { scrap: 35, alloy: 1 });

  // =====================================================================
  // SETOR C — Linha de Triagem (1-3)
  // =====================================================================
  wallZ(58.2, 120, -25); wallZ(58.2, 120, 25);
  container(-24, 59.5, 0); container(24, 59.5, 0);
  const conveyors: Conveyor[] = [];
  const belt = (id: string, z: number, dir: number) => {
    const x0 = -21, x1 = 21, top = 0.32;
    B.box(0, 0.12, z, x1 - x0, 0.24, 3.4, mats.dark, { nav: false });
    for (const dz of [-1.75, 1.75]) B.box(0, 0.25, z + dz, x1 - x0, 0.5, 0.16, mats.hazard, { uv: 1, nav: false });
    const t = tex.belt.clone(); t.needsUpdate = true; t.repeat.set(1, (x1 - x0) / 2);
    const bm = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, metalness: 0.1 });
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(3.2, x1 - x0), bm);
    surf.rotation.set(-Math.PI / 2, 0, Math.PI / 2); surf.position.set(0, top + 0.005, z); surf.receiveShadow = true; scene.add(surf);
    physics.addBox(0, top / 2, z, (x1 - x0) / 2, top / 2, 1.6);
    for (let x = x0 + 1; x < x1; x += 2.5) B.addGeo(new THREE.CylinderGeometry(0.14, 0.14, 3.6, 8), mats.steel, { x, y: 0.16, z }, Math.PI / 2, Math.PI / 2, 1, false);
    conveyors.push(new Conveyor(id, x0, x1, z - 1.6, z + 1.6, top, new THREE.Vector3(2.0 * dir, 0, 0), t));
  };
  belt('belt1', 68, 1); belt('belt2', 81, -1); belt('belt3', 106, 1);
  const presses: Press[] = [];
  for (const [i, px] of [-7, 7].entries()) {
    const p = new Press('press' + i, physics, px, 81, 2.6, i * 1.6, { head: mats.steel, hazard: mats.hazard, light: mats.red });
    scene.add(p.head); presses.push(p);
    // pórtico
    for (const dx of [-1.9, 1.9]) B.box(px + dx, 3.4, 81, 0.4, 6.8, 0.6, mats.yellowPaint, { nav: false });
    B.box(px, 7.0, 81, 4.4, 0.6, 1.0, mats.yellowPaint, { collide: false });
  }
  machine(-12, 92, 4, 3.6, 3, mats.yellowPaint); machine(4, 94, 3.5, 3.0, 2.6, mats.bluePaint); machine(14, 74.5, 3, 2.6, 2.2, mats.redPaint);
  scrapPile(-4, 74, 2.2, 1.6); scrapPile(18, 112, 3.0, 2.4); scrapPile(-6, 99, 1.8, 1.4); scrapPile(8, 113, 2.0, 1.6);
  // plataforma elevada com o condutor B
  catwalk(17, 92, 10, 8, 2.6, ['w', 'n']);
  crate(9.6, 89.6, 1.6, 1.1, 1.6); crate(11.2, 91.4, 1.6, 2.05, 1.6);
  interact('cond_a', 'conductor', -20, 0, 64, 'Ligar condutor', conductorObj(-20, 0, 64));
  interact('cond_b', 'conductor', 20, 2.6, 90.5, 'Ligar condutor', conductorObj(20, 2.6, 90.5));
  interact('cond_c', 'conductor', -19, 0, 114, 'Ligar condutor', conductorObj(-19, 0, 114));
  markers.set('cond', new THREE.Vector3(0, 0, 90));
  interact('cache_p18', 'cache', 20.5, 2.6, 94.3, 'Cache do condutor', crateObj(20.5, 2.6, 94.3, Math.PI, mats.yellowPaint), { itemId: 'P18', scrap: 20 });
  // guindaste abandonado (S02)
  const craneX = -19, craneZ = 90;
  for (const dx of [-1.2, 1.2]) for (const dz of [-1.2, 1.2]) B.box(craneX + dx, 6, craneZ + dz, 0.35, 12, 0.35, mats.yellowPaint, { nav: false });
  B.addObstacle(craneX, 2, craneZ, 3, 4, 3);
  B.addGeo(boxGeo(22, 0.8, 1.0, 0.5), mats.yellowPaint, { x: craneX + 8, y: 12.3, z: craneZ });
  B.addGeo(boxGeo(2.6, 2.2, 2.6, 0.5), mats.yellowPaint, { x: craneX, y: 13.6, z: craneZ });
  const hookG = new THREE.Group(); hookG.position.set(craneX + 14, 12, craneZ);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 6, 6), mats.dark); cable.position.y = -3; hookG.add(cable);
  const hookC = new THREE.Mesh(boxGeo(3.2, 1.2, 1.4, 0.6), mats.c1); hookC.position.y = -6.5; hookC.castShadow = true; hookG.add(hookC);
  props.add(hookG); hookG.name = 'craneHook';
  animated.push({ obj: hookG, fn: (o, t) => { o.rotation.z = Math.sin(t * 0.6) * 0.03; } });
  interact('crane_lever', 'lever', -21.5, 0, 95.5, 'Cabine do guindaste', crateObj(-21.5, 0, 95.5, Math.PI / 2, mats.bluePaint), undefined, true);
  interact('mem_m3', 'memory', -22, 0, 86, 'Registro de memória', memoryObj(-22, 0, 86), { memory: 'm3' });
  interact('tool_2', 'tool', -9, 0, 74, 'Ferramenta do FERRO-7', toolObj(-9, 0, 74), undefined, true);
  // nicho com chapa rachada (opcional) na parede leste
  addPlate('plate_c3', 22.2, 99.5, 3.0, 3.0, Math.PI / 2);
  container(28, 96.5, Math.PI / 2); container(28, 102.5, Math.PI / 2); container(31, 99.5, Math.PI / 2);
  interact('cache_c3', 'cache', 26.5, 0, 99.5, 'Cache de sucata', crateObj(26.5, 0, 99.5, -Math.PI / 2, mats.redPaint), { scrap: 60, alloy: 2 });
  interact('cache_hidden_c', 'cache', 21.5, 0, 117, 'Cache escondido', crateObj(21.5, 0, 117, 0, mats.dark), { scrap: 80, cells: 1 }, false);
  // elevador de carga (portão) + painel
  wallX(-25, -3.4, 120); wallX(3.4, 25, 120);
  addGate('lift_13_gate', 0, 120, 6.4, 5.0);
  const panel = crateObj(5.8, 0, 117.6, Math.PI, mats.bluePaint);
  interact('lift_13', 'panel', 5.8, 1, 117.6, 'Acionar elevador de carga', panel);
  addTerminal('term_triage', 'Linha de Triagem', -14, 61.5, 0, 'none', 'C');
  lamp(-23, 70, true); lamp(22.5, 84); lamp(-23, 101); lamp(10, 116);

  // =====================================================================
  // SETOR D — Galpão da Oficina (1-4)
  // =====================================================================
  wallZ(120, 172, -23); wallZ(120, 172, 23);
  wallX(-23, -3.4, 172.4); wallX(3.4, 23, 172.4);
  addGate('gate_boss', 0, 172.4, 6.4, 5.0);
  for (const z of [130, 146, 162]) for (const x of [-13, 13]) {
    B.box(x, 4.5, z, 0.7, 9, 0.7, mats.bluePaint);
    B.addGeo(boxGeo(26.6, 0.5, 0.5, 1), mats.bluePaint, { x: 0, y: 9.2, z }, 0, 0, 1, true);
  }
  for (const x of [-13, 0, 13]) B.addGeo(boxGeo(0.4, 0.4, 34, 1), mats.dark, { x, y: 9.6, z: 146 }, 0, 0, 1, false);
  for (const [x, z] of [[-6, 138], [6, 154], [-6, 154], [6, 138]]) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.4, 12), mats.dark); l.position.set(x, 8, z); props.add(l);
    const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), mats.amber); bulb.rotation.x = Math.PI / 2; bulb.position.set(x, 7.79, z); props.add(bulb);
  }
  const l1 = new THREE.PointLight(0xffb060, 18, 22, 2); l1.position.set(0, 7, 146); scene.add(l1); lights.push(l1);
  machine(-18, 134, 3, 3.4, 4, mats.redPaint); machine(18, 150, 3.2, 3.0, 4, mats.yellowPaint);
  scrapPile(18, 126, 2.4, 2); scrapPile(-18, 152, 2.2, 1.8);
  crate(-17, 166, 1.6, 1.6, 1.6, 0, mats.bluePaint); crate(-15.2, 167, 1.2, 1.2, 1.2, 0, mats.yellowPaint);
  // jaula do FERRO-7
  const cage = new THREE.Group(); cage.position.set(0, 0, 163);
  const cageTop = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.3, 16), mats.dark); cageTop.position.y = 3.3; cage.add(cageTop);
  const cageBase = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.25, 16), mats.dark); cageBase.position.y = 0.12; cage.add(cageBase);
  const bars = new THREE.Group(); bars.name = 'bars';
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.1, 6), mats.steel); b.position.set(Math.cos(a) * 1.75, 1.7, Math.sin(a) * 1.75); bars.add(b); }
  cage.add(bars);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6, 6), mats.dark); chain.position.y = 6.4; cage.add(chain);
  cage.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  scene.add(cage);
  const cageCol = physics.addCylinder(0, 1.6, 163, 1.6, 1.95);
  cage.userData.col = cageCol;
  interact('cage_ferro7', 'cage', 0, 1, 160.6, 'Libertar FERRO-7', cage);
  addTerminal('bench_hub', 'Oficina do FERRO-7', -11, 160, Math.PI / 2, 'full', 'D', true);
  interact('mem_m4', 'memory', 19, 0, 168, 'Registro de memória', memoryObj(19, 0, 168), { memory: 'm4' });
  interact('tool_3', 'tool', 19.5, 0, 129, 'Ferramenta do FERRO-7', toolObj(19.5, 0, 129), undefined, true);
  interact('cache_d1', 'cache', -20.5, 0, 125, 'Cache de sucata', crateObj(-20.5, 0, 125, 0.4, mats.redPaint), { scrap: 50 });
  trigger('arena14', 0, 1.5, 133, 30, 3, 6);
  markers.set('arena14', new THREE.Vector3(0, 0, 146));
  trigger('r_14', 0, 1.5, 124.5, 6, 3, 3);

  // =====================================================================
  // SETOR E — Depósito da Prensa (1-5) — arena circular
  // =====================================================================
  const bc = new THREE.Vector3(0, 0, 197), AR = 19;
  wallZ(172.4, 180, -23); wallZ(172.4, 180, 23);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const dx = Math.sin(a), dz = Math.cos(a);
    if (Math.abs(a - Math.PI) < 0.2) continue; // entrada sul
    if (a < 0.17 || a > Math.PI * 2 - 0.17) continue; // saída norte
    const x = bc.x + dx * (AR + 1.3), z = bc.z + dz * (AR + 1.3);
    for (let l = 0; l < 2; l++) container(x, z, a, l);
  }
  // entrada sul (corredor) com portão
  B.box(-4.0, 2.6, 175.0, 1.0, 5.2, 4.8, mats.concrete); B.box(4.0, 2.6, 175.0, 1.0, 5.2, 4.8, mats.concrete);
  addGate('gate_arena_in', 0, 176.6, 7.0, 5.0);
  // piso de concreto da arena
  const arenaFloor = new THREE.Mesh(new THREE.CircleGeometry(AR, 48), mats.concrete);
  (mats.concrete.map as THREE.Texture).repeat.set(1, 1);
  const cf = mats.concrete.clone(); cf.map = tex.concrete.clone(); cf.map.repeat.set(8, 8); cf.map.needsUpdate = true; arenaFloor.material = cf;
  arenaFloor.rotation.x = -Math.PI / 2; arenaFloor.position.set(bc.x, 0.02, bc.z); arenaFloor.receiveShadow = true; scene.add(arenaFloor);
  const ringM = new THREE.Mesh(new THREE.RingGeometry(AR - 1.2, AR - 0.6, 64), mats.hazard); ringM.rotation.x = -Math.PI / 2; ringM.position.set(bc.x, 0.03, bc.z); scene.add(ringM);
  const columns: Column[] = [];
  for (const [i, ang] of [210, 330, 90].entries()) {
    const a = (ang * Math.PI) / 180;
    const c = new Column('col' + i, physics, bc.x + Math.cos(a) * 9.5, bc.z + Math.sin(a) * 9.5, { body: mats.concrete, band: mats.hazard });
    scene.add(c.mesh); columns.push(c);
  }
  addTerminal('term_arena', 'Depósito da Prensa', 11, 186, -Math.PI / 4, 'field', 'E');
  trigger('r_arena15', 0, 1.5, 183.5, 8, 3, 3);
  markers.set('boss', bc.clone());
  // portão norte com dobradiças laranja + âncora do guincho
  const anchorDoors: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const d = new THREE.Group(); d.position.set(sx * 3.6, 0, bc.z + AR + 0.8);
    const panelM = new THREE.Mesh(boxGeo(3.6, 6, 0.5, 0.5), mats.rust); panelM.position.set(-sx * 1.8, 3, 0); panelM.castShadow = true; d.add(panelM);
    for (const y of [1.2, 4.8]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 10), mats.orange); h.position.set(0, y, 0); d.add(h); }
    const stripe = new THREE.Mesh(boxGeo(3.4, 0.4, 0.55, 1), mats.hazard); stripe.position.set(-sx * 1.8, 5.4, 0); d.add(stripe);
    scene.add(d); anchorDoors.push(d);
    d.userData.col = physics.addBox(sx * 1.8, 3, bc.z + AR + 0.8, 1.8, 3, 0.3);
  }
  for (const sx of [-1, 1]) B.box(sx * 4.2, 3.5, bc.z + AR + 0.8, 1.0, 7, 1.2, mats.concrete);
  const anchor = new THREE.Group(); anchor.position.set(0, 2.2, bc.z + AR + 0.45);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.09, 8, 18), mats.orange); anchor.add(ring);
  const plateA = new THREE.Mesh(boxGeo(0.9, 0.9, 0.12, 1), mats.dark); plateA.position.z = 0.1; anchor.add(plateA);
  scene.add(anchor);
  interact('anchor_gate', 'anchor', 0, 1.6, bc.z + AR - 0.6, 'Âncora de guincho', anchor);
  // trilha final rumo à Cidade Morta
  B.box(-4.5, 1.5, 224, 1, 3, 10, mats.concrete); B.box(4.5, 1.5, 224, 1, 3, 10, mats.concrete);
  B.box(0, 0.5, 231.5, 12, 1, 1, mats.concrete);
  trigger('r_end', 0, 1.5, 226, 8, 3, 3);
  interact('mem_m5', 'memory', -2.5, 0, 225, 'Registro de memória', memoryObj(-2.5, 0, 225), { memory: 'm5' });
  lamp(-7, 186); lamp(9, 186);

  // =====================================================================
  // pano de fundo: montanhas de sucata, guindastes gigantes, cidade ao norte
  // =====================================================================
  const farR = rng(77);
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (48 + farR() * 60), z = -40 + farR() * 280;
    const g = new THREE.IcosahedronGeometry(1, 1);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * (0.8 + farR() * 0.4), Math.max(-0.1, p.getY(k)), p.getZ(k) * (0.8 + farR() * 0.4));
    g.computeVertexNormals();
    const s = 10 + farR() * 18;
    const m = new THREE.Mesh(g, farR() > 0.5 ? mats.far : mats.far2); m.scale.set(s * 1.4, s * (0.6 + farR() * 0.5), s); m.position.set(x, 0, z); props.add(m);
  }
  for (let i = 0; i < 5; i++) {
    const x = (i % 2 ? 1 : -1) * (70 + i * 9), z = 20 + i * 45;
    const cg = new THREE.Group(); cg.position.set(x, 0, z);
    const tower = new THREE.Mesh(boxGeo(2, 40, 2, 0.2), mats.far2); tower.position.y = 20; cg.add(tower);
    const jib = new THREE.Mesh(boxGeo(36, 1.6, 1.6, 0.2), mats.far2); jib.position.set(-Math.sign(x) * 12, 40, 0); cg.add(jib);
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 18), mats.far2); cab.position.set(-Math.sign(x) * 24, 31, 0); cg.add(cab);
    cg.rotation.y = farR() * 0.6; props.add(cg);
  }
  // cabeça de robô gigante tombada (narrativa ambiental)
  const head = new THREE.Group(); head.position.set(-62, 0, 120); head.rotation.set(0.3, 0.8, 0.25);
  const hb = new THREE.Mesh(boxGeo(22, 16, 18, 0.1), mats.far); hb.position.y = 6; head.add(hb);
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x220a06, emissive: 0x6a1408, emissiveIntensity: 1.2 });
  for (const sx of [-5, 5]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 1, 16), eyeM); e.rotation.x = Math.PI / 2; e.position.set(sx, 8, 9.2); head.add(e); }
  props.add(head);
  // skyline da Cidade Morta ao norte
  const cityM = new THREE.MeshStandardMaterial({ color: 0x55606c, roughness: 1, emissive: 0x111820, emissiveIntensity: 0.4 });
  const winM = new THREE.MeshStandardMaterial({ color: 0xffb040, emissive: 0xff9a2a, emissiveIntensity: 1.6 });
  for (let i = 0; i < 34; i++) {
    const x = -150 + i * 9 + farR() * 5, z = 300 + farR() * 60, h = 25 + farR() * 75, w = 7 + farR() * 9;
    const b = new THREE.Mesh(boxGeo(w, h, w, 0.1), cityM); b.position.set(x, h / 2 - 4, z); props.add(b);
    if (farR() > 0.5) { const wnd = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), winM); wnd.position.set(x + (farR() - 0.5) * w * 0.6, h * (0.3 + farR() * 0.5), z - w / 2 - 0.05); wnd.rotation.y = Math.PI; props.add(wnd); }
  }
  // poeira suspensa: partículas instanciadas grandes (baratas)
  B.finish(scene);
  // corrige rampa visual (inclinação)
  const rampMesh = new THREE.Mesh(boxGeo(5.9, 0.24, 2.4, 0.5), mats.plate);
  rampMesh.position.set(4.4, 1.05, 7.8); rampMesh.rotation.set(0, -Math.PI / 2, 0); rampMesh.rotateX(0.39); rampMesh.receiveShadow = true; rampMesh.castShadow = true; scene.add(rampMesh);

  // ---------------- navegação ----------------
  const nav = new NavGrid(-30, -16, 30, 236, 1);
  nav.build(B.obstacles);
  for (const g of gates.values()) nav.markBox(g.x - g.w / 2, g.z - 0.6, g.x + g.w / 2, g.z + 0.6, 1);
  for (const p of plates.values()) nav.markBox(p.pos.x - 1.6, p.pos.z - 1.6, p.pos.x + 1.6, p.pos.z + 1.6, 1);
  for (const c of columns) nav.markBox(c.x - 1.7, c.z - 1.7, c.x + 1.7, c.z + 1.7, 1);
  nav.markBox(-2.3, 160.7, 2.3, 165.3, 1);
  nav.markBox(-9, 215, 9, 240, 1);

  // ---------------- spawns de inimigos ----------------
  const spawns: SpawnDef[] = [
    { id: 'b_e02q', def: 'E02', x: -6, z: 26, sector: 'B', patrol: [[-6, 24], [-6, 46], [2, 46], [2, 30]], questTag: 'e02_quest', when: 'q12_fight' },
    { id: 'b_e02', def: 'E02', x: -6, z: 40, sector: 'B', patrol: [[-6, 24], [-6, 50]], when: 'q12_done' },
    { id: 'b_e01a', def: 'E01', x: 11, z: 27, sector: 'B', when: 'q12_ambush' },
    { id: 'b_e01b', def: 'E01', x: 12, z: 39, sector: 'B', when: 'q12_ambush' },
    { id: 'c_e01a', def: 'E01', x: -10, z: 74, sector: 'C' },
    { id: 'c_e01b', def: 'E01', x: 6, z: 88, sector: 'C' },
    { id: 'c_e01c', def: 'E01', x: -4, z: 100, sector: 'C' },
    { id: 'c_e05a', def: 'E05', x: 0, z: 92, sector: 'C', patrol: [[-10, 88], [10, 96]] },
    { id: 'c_e05b', def: 'E05', x: -12, z: 110, sector: 'C', patrol: [[-16, 104], [0, 114]] },
    { id: 'c_e04', def: 'E04', x: -13, z: 112, sector: 'C' },
    { id: 'c_e02', def: 'E02', x: 12, z: 64, sector: 'C', patrol: [[12, 63], [-6, 63]] },
    // arena 1-4 (ondas) — geradas pelo diretor de encontro
    { id: 'd_w1a', def: 'E01', x: -10, z: 150, sector: 'D', group: 'arena14_w1' },
    { id: 'd_w1b', def: 'E01', x: 10, z: 152, sector: 'D', group: 'arena14_w1' },
    { id: 'd_w1c', def: 'E02', x: 0, z: 156, sector: 'D', group: 'arena14_w1' },
    { id: 'd_w1d', def: 'E05', x: 6, z: 144, sector: 'D', group: 'arena14_w1' },
    { id: 'd_w2a', def: 'E03', x: 0, z: 158, sector: 'D', group: 'arena14_w2' },
    { id: 'd_w2b', def: 'E04', x: -11, z: 146, sector: 'D', group: 'arena14_w2' },
    { id: 'd_w2c', def: 'E01', x: 11, z: 140, sector: 'D', group: 'arena14_w2' },
    { id: 'd_w2d', def: 'E01', x: -6, z: 154, sector: 'D', group: 'arena14_w2' },
    // patrulha do galpão após a arena
    { id: 'd_e03', def: 'E03', x: 14, z: 140, sector: 'D', when: 'q14_done' },
    { id: 'd_e01', def: 'E01', x: -14, z: 128, sector: 'D', when: 'q14_done' },
  ];
  const sectors: Sector[] = [
    { id: 'A', name: 'Câmara de Triagem', minZ: -16, maxZ: 11.2, music: 'exploration' },
    { id: 'B', name: 'Pátio dos Trilhos', minZ: 11.2, maxZ: 58.2, music: 'exploration' },
    { id: 'C', name: 'Linha de Triagem', minZ: 58.2, maxZ: 120, music: 'exploration' },
    { id: 'D', name: 'Galpão da Oficina', minZ: 120, maxZ: 172.4, music: 'hub' },
    { id: 'E', name: 'Depósito da Prensa', minZ: 172.4, maxZ: 240, music: 'exploration' },
  ];
  // sombra do sol acompanha o jogador (atualizado pelo jogo)
  return { builder: B, nav, tex, gates, plates, conveyors, presses, columns, interactables, triggers, spawns, sectors, terminals, markers, mats, animated, lights, sun, hemi, cage, anchorDoors, bossCenter: bc, arenaRadius: AR };
}
