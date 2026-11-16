// Inimigos do Mundo 1, chefe O COMPACTADOR, FERRO-7 e PÍXEL — rigs rígidos + clipes.
import * as THREE from 'three';
import { PAL, mat, mesh, node, rbox, cyl, sph, tor, cone, rivets, hose, clip, type ModelAsset, type Key, type V3 } from './kit';

const k = (t: number, r: Key['r'], p?: Key['p']): Key => ({ t, r, p });
type R3 = Record<string, V3>;

const E = () => ({
  rust: mat('e_rust', 0x7d3b22, { rough: 0.8, metal: 0.45 }),
  rust2: mat('e_rust2', 0x5c2c1a, { rough: 0.85, metal: 0.4 }),
  red: mat('e_red', 0xa3291c, { rough: 0.55, metal: 0.35 }),
  steel: mat('steel', PAL.steel, { rough: 0.4, metal: 0.85 }),
  steelDark: mat('steel_dark', PAL.steelDark, { rough: 0.5, metal: 0.8 }),
  dark: mat('e_dark', 0x23262b, { rough: 0.6, metal: 0.5 }),
  hazard: mat('hazard', PAL.hazard, { rough: 0.55, metal: 0.2 }),
  olive: mat('e_olive', 0x55603e, { rough: 0.7, metal: 0.35 }),
  copper: mat('z_copper', PAL.copper, { rough: 0.35, metal: 0.9 }),
  rubber: mat('rubber', PAL.rubber, { rough: 0.9, metal: 0.0 }),
  redGlow: mat('red_glow', PAL.red, { emissive: PAL.red, ei: 2.4, rough: 0.3, metal: 0 }),
  amberGlow: mat('amber_glow', PAL.amber, { emissive: PAL.amber, ei: 2.0, rough: 0.3, metal: 0 }),
  yellowGlow: mat('yellow_glow', 0xffe14a, { emissive: 0xffd21a, ei: 2.2, rough: 0.3, metal: 0 }),
  cyan: mat('z_cyan', PAL.zCyan, { emissive: PAL.zCyan, ei: 2.2, rough: 0.3, metal: 0 }),
  glass: mat('z_glass', 0x0b1418, { rough: 0.15, metal: 0.2 }),
  white: mat('e_white', 0xd8d2c4, { rough: 0.5, metal: 0.2 }),
});

// ======================= E02 — Patrulheiro de Trilho =======================
export function buildE02(): ModelAsset {
  const m = E();
  const root = node('E02');
  const hips = node('hips', [0, 0.95, 0], root);
  hips.add(mesh(rbox(0.36, 0.18, 0.26, 0.05), m.dark, [0, 0, 0]));
  hips.add(mesh(rbox(0.4, 0.05, 0.3, 0.015), m.hazard, [0, 0.08, 0]));
  const torso = node('torso', [0, 0.1, 0], hips);
  torso.add(mesh(rbox(0.44, 0.5, 0.3, 0.06), m.red, [0, 0.3, 0]));
  torso.add(mesh(rbox(0.3, 0.2, 0.05, 0.02), m.dark, [0, 0.36, 0.15]));
  torso.add(mesh(rbox(0.12, 0.04, 0.02, 0.01), m.amberGlow, [0, 0.42, 0.18]));
  torso.add(mesh(rbox(0.3, 0.36, 0.14, 0.03), m.steelDark, [0, 0.3, -0.2]));
  torso.add(mesh(cyl(0.04, 0.04, 0.3, 8), m.steel, [0.1, 0.62, -0.22]));
  torso.add(mesh(sph(0.03, 8, 6), m.redGlow, [0.1, 0.78, -0.22]));
  rivets(torso, m.steel, [-0.18, 0.1, 0.152], [0.18, 0.1, 0.152], 6, 0.012);
  const neck = node('neck', [0, 0.58, 0], torso);
  neck.add(mesh(cyl(0.05, 0.06, 0.1, 8), m.steelDark, [0, 0.03, 0]));
  const head = node('head', [0, 0.08, 0], neck);
  head.add(mesh(rbox(0.36, 0.14, 0.2, 0.05), m.dark, [0, 0.05, 0]));
  head.add(mesh(rbox(0.3, 0.04, 0.02, 0.01), m.redGlow, [0, 0.06, 0.1], [0, 0, 0], 'eye'));
  head.add(mesh(rbox(0.4, 0.04, 0.22, 0.015), m.red, [0, 0.13, 0]));
  head.add(mesh(cone(0.04, 0.12, 6), m.steel, [0.16, 0.18, -0.02]));
  for (const s of ['L', 'R'] as const) {
    const sx = s === 'L' ? 1 : -1;
    const sh = node(`shoulder${s}`, [0.3 * sx, 0.48, 0], torso);
    sh.add(mesh(rbox(0.2, 0.12, 0.22, 0.04), m.red, [0.03 * sx, 0.03, 0]));
    sh.add(mesh(rbox(0.1, 0.3, 0.1, 0.03), m.steelDark, [0, -0.16, 0]));
    const el = node(`elbow${s}`, [0, -0.33, 0], sh);
    el.add(mesh(rbox(0.12, 0.28, 0.12, 0.03), m.dark, [0, -0.14, 0]));
    el.add(mesh(sph(0.065, 10, 8), m.steel, [0, -0.3, 0]));
    if (s === 'R') {
      const baton = node('baton', [0, -0.32, 0.02], el);
      baton.rotation.x = Math.PI / 2; // aponta para frente
      baton.add(mesh(cyl(0.025, 0.025, 0.7, 8), m.steelDark, [0, 0.28, 0]));
      baton.add(mesh(cyl(0.04, 0.04, 0.12, 8), m.hazard, [0, 0.0, 0]));
      baton.add(mesh(cyl(0.035, 0.035, 0.12, 8), m.amberGlow, [0, 0.62, 0], [0, 0, 0], 'batonTip'));
    } else {
      el.add(mesh(cyl(0.18, 0.18, 0.04, 16), m.steel, [0.06, -0.18, 0.05], [0, 0, Math.PI / 2]));
      el.add(mesh(cyl(0.06, 0.06, 0.05, 12), m.red, [0.08, -0.18, 0.05], [0, 0, Math.PI / 2]));
    }
    const th = node(`thigh${s}`, [0.13 * sx, -0.06, 0], hips);
    th.add(mesh(rbox(0.13, 0.36, 0.15, 0.04), m.red, [0, -0.2, 0]));
    const kn = node(`knee${s}`, [0, -0.42, 0], th);
    kn.add(mesh(sph(0.07, 10, 8), m.steel, [0, 0, 0]));
    kn.add(mesh(rbox(0.11, 0.34, 0.13, 0.03), m.dark, [0, -0.2, 0]));
    // pé com roda de trilho
    kn.add(mesh(rbox(0.16, 0.08, 0.28, 0.03), m.steelDark, [0, -0.42, 0.04]));
    kn.add(mesh(cyl(0.05, 0.05, 0.05, 12), m.steel, [0, -0.44, -0.08], [0, 0, Math.PI / 2]));
  }
  const rest: R3 = { shoulderL: [0, 0, 8], shoulderR: [-10, 0, -8], elbowL: [-25, 0, 0], elbowR: [-30, 0, 0], torso: [0, 0, 0], neck: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], hips: [0, 0, 0] };
  const P = (o: R3) => ({ ...rest, ...o });
  const clips = [
    clip(root, 'idle', 2.0, [k(0, P({}), { hips: [0, 0, 0] }), k(1, P({ torso: [3, 0, 0], neck: [0, 10, 0], elbowR: [-35, 0, 0] }), { hips: [0, -0.015, 0] })]),
    clip(root, 'walk', 1.0, [
      k(0, P({ thighL: [-22, 0, 0], kneeL: [8, 0, 0], thighR: [20, 0, 0], kneeR: [15, 0, 0], shoulderL: [15, 0, 8], torso: [3, -5, 0] }), { hips: [0, 0, 0] }),
      k(0.25, P({ thighL: [-4, 0, 0], thighR: [0, 0, 0], kneeR: [40, 0, 0] }), { hips: [0, 0.03, 0] }),
      k(0.5, P({ thighR: [-22, 0, 0], kneeR: [8, 0, 0], thighL: [20, 0, 0], kneeL: [15, 0, 0], shoulderL: [-15, 0, 8], torso: [3, 5, 0] }), { hips: [0, 0, 0] }),
      k(0.75, P({ thighR: [-4, 0, 0], thighL: [0, 0, 0], kneeL: [40, 0, 0] }), { hips: [0, 0.03, 0] })]),
    clip(root, 'run', 0.64, [
      k(0, P({ thighL: [-45, 0, 0], kneeL: [20, 0, 0], thighR: [30, 0, 0], kneeR: [50, 0, 0], shoulderL: [35, 0, 10], torso: [14, -8, 0], shoulderR: [-40, 0, -8], elbowR: [-60, 0, 0] }), { hips: [0, -0.02, 0] }),
      k(0.16, P({ thighL: [-15, 0, 0], thighR: [-5, 0, 0], kneeR: [95, 0, 0], torso: [14, 0, 0], shoulderR: [-40, 0, -8], elbowR: [-60, 0, 0] }), { hips: [0, 0.05, 0] }),
      k(0.32, P({ thighR: [-45, 0, 0], kneeR: [20, 0, 0], thighL: [30, 0, 0], kneeL: [50, 0, 0], shoulderL: [-35, 0, 10], torso: [14, 8, 0], shoulderR: [-40, 0, -8], elbowR: [-60, 0, 0] }), { hips: [0, -0.02, 0] }),
      k(0.48, P({ thighR: [-15, 0, 0], thighL: [-5, 0, 0], kneeL: [95, 0, 0], torso: [14, 0, 0], shoulderR: [-40, 0, -8], elbowR: [-60, 0, 0] }), { hips: [0, 0.05, 0] })]),
    clip(root, 'alert', 0.9, [k(0, P({})), k(0.3, P({ neck: [-10, 30, 0], torso: [-4, 10, 0], shoulderR: [-60, 0, -20], elbowR: [-80, 0, 0] })), k(0.6, P({ neck: [-10, -30, 0], torso: [-4, -10, 0], shoulderR: [-60, 0, -20], elbowR: [-80, 0, 0] })), k(0.9, P({ shoulderR: [-50, 0, -15], elbowR: [-70, 0, 0] }))], false),
    // Telegráfico: bastão levantado
    clip(root, 'windup', 0.6, [k(0, P({})), k(0.35, P({ shoulderR: [-175, 0, -20], elbowR: [-50, 0, 0], torso: [-12, 25, 0], neck: [-6, -15, 0], thighL: [-25, 0, 0], kneeL: [25, 0, 0], thighR: [20, 0, 0], kneeR: [15, 0, 0] }), { hips: [0, -0.04, 0] }), k(0.6, P({ shoulderR: [-180, 0, -22], elbowR: [-55, 0, 0], torso: [-14, 27, 0], neck: [-6, -15, 0], thighL: [-25, 0, 0], kneeL: [25, 0, 0], thighR: [20, 0, 0], kneeR: [15, 0, 0] }), { hips: [0, -0.04, 0] })], false),
    clip(root, 'attack', 0.35, [k(0, P({ shoulderR: [-180, 0, -22], elbowR: [-55, 0, 0], torso: [-14, 27, 0], thighL: [-25, 0, 0], kneeL: [25, 0, 0], thighR: [20, 0, 0], kneeR: [15, 0, 0] }), { hips: [0, -0.04, 0] }), k(0.12, P({ shoulderR: [-60, 0, 5], elbowR: [-5, 0, 0], torso: [30, -20, 0], neck: [-20, 0, 0], thighL: [-45, 0, 0], kneeL: [60, 0, 0], thighR: [25, 0, 0], kneeR: [35, 0, 0] }), { hips: [0, -0.16, 0.1] }), k(0.35, P({ shoulderR: [-50, 0, 0], elbowR: [-10, 0, 0], torso: [26, -16, 0], thighL: [-40, 0, 0], kneeL: [55, 0, 0], thighR: [22, 0, 0], kneeR: [30, 0, 0] }), { hips: [0, -0.14, 0.08] })], false),
    clip(root, 'charge_windup', 0.7, [k(0, P({})), k(0.5, P({ shoulderR: [-90, 0, -10], elbowR: [-100, 0, 0], torso: [24, 0, 0], thighL: [-40, 0, 0], kneeL: [60, 0, 0], thighR: [30, 0, 0], kneeR: [40, 0, 0], shoulderL: [-30, 0, 30] }), { hips: [0, -0.15, -0.05] }), k(0.7, P({ shoulderR: [-92, 0, -10], elbowR: [-102, 0, 0], torso: [26, 0, 0], thighL: [-40, 0, 0], kneeL: [60, 0, 0], thighR: [30, 0, 0], kneeR: [40, 0, 0], shoulderL: [-30, 0, 30] }), { hips: [0, -0.15, -0.05] })], false),
    clip(root, 'charge', 0.5, [k(0, P({ shoulderR: [-90, 0, 0], elbowR: [-10, 0, 0], torso: [30, 0, 0], thighL: [-50, 0, 0], kneeL: [30, 0, 0], thighR: [40, 0, 0], kneeR: [60, 0, 0] })), k(0.25, P({ shoulderR: [-90, 0, 0], elbowR: [-5, 0, 0], torso: [30, 0, 0], thighR: [-50, 0, 0], kneeR: [30, 0, 0], thighL: [40, 0, 0], kneeL: [60, 0, 0] }))]),
    clip(root, 'recover', 0.6, [k(0, P({ torso: [26, -16, 0], shoulderR: [-50, 0, 0] }), { hips: [0, -0.12, 0.06] }), k(0.6, P({}), { hips: [0, 0, 0] })], false),
    clip(root, 'hit', 0.3, [k(0, P({})), k(0.08, P({ torso: [-20, 10, 0], neck: [-20, 0, 0], shoulderL: [20, 0, 30] }), { hips: [0, 0, -0.08] }), k(0.3, P({}), { hips: [0, 0, 0] })], false),
    clip(root, 'stagger', 1.4, [k(0, P({})), k(0.15, P({ torso: [-30, 15, 10], neck: [-30, 0, 0], shoulderL: [30, 0, 50], shoulderR: [30, 0, -50], thighL: [-30, 0, 0], kneeL: [50, 0, 0] }), { hips: [0, -0.1, -0.1] }), k(0.9, P({ torso: [30, 0, -10], neck: [20, 20, 0], shoulderL: [10, 0, 20], shoulderR: [10, 0, -20], elbowR: [-5, 0, 0], thighL: [-50, 0, 0], kneeL: [80, 0, 0], thighR: [-30, 0, 0], kneeR: [60, 0, 0] }), { hips: [0, -0.25, 0] }), k(1.4, P({}), { hips: [0, 0, 0] })], false),
    clip(root, 'death', 1.2, [k(0, P({})), k(0.2, P({ torso: [-30, 0, 0], neck: [-30, 0, 0] }), { hips: [0, 0, -0.1] }), k(0.7, P({ torso: [50, 30, 20], neck: [40, 0, 30], thighL: [-90, 0, 0], kneeL: [110, 0, 0], thighR: [-70, 0, 0], kneeR: [120, 0, 0], shoulderL: [20, 0, 60], shoulderR: [30, 0, -60] }), { hips: [0, -0.6, 0] }), k(1.2, P({ torso: [80, 30, 30], neck: [50, 0, 40], thighL: [-95, 0, 0], kneeL: [120, 0, 0], thighR: [-80, 0, 0], kneeR: [125, 0, 0], shoulderL: [40, 0, 70], shoulderR: [40, 0, -70] }), { hips: [0, -0.72, 0] })], false),
  ];
  return { scene: root, clips };
}

// ======================= E01 — Catador Rastejante =======================
export function buildE01(): ModelAsset {
  const m = E();
  const root = node('E01');
  const body = node('body', [0, 0.38, 0], root);
  body.add(mesh(sph(0.3, 14, 10), m.rust, [0, 0, 0], [0, 0, 0], undefined, [1, 0.55, 1.2]));
  body.add(mesh(rbox(0.36, 0.08, 0.42, 0.03), m.olive, [0, 0.13, -0.02]));
  rivets(body, m.steel, [-0.15, 0.18, -0.15], [0.15, 0.18, -0.15], 4, 0.012);
  body.add(mesh(cyl(0.05, 0.05, 0.12, 8), m.steelDark, [0.1, 0.18, -0.25], [0.6, 0, 0]));
  const head = node('head', [0, 0.02, 0.32], body);
  head.add(mesh(rbox(0.22, 0.12, 0.14, 0.04), m.dark, [0, 0, 0]));
  head.add(mesh(sph(0.04, 10, 8), m.amberGlow, [0.06, 0.03, 0.07], [0, 0, 0], 'eye'));
  head.add(mesh(sph(0.03, 10, 8), m.amberGlow, [-0.06, 0.04, 0.07]));
  for (const s of ['L', 'R'] as const) {
    const sx = s === 'L' ? 1 : -1;
    const mand = node(`mand${s}`, [0.07 * sx, -0.04, 0.07], head);
    mand.add(mesh(cone(0.025, 0.14, 6), m.steel, [0, 0, 0.07], [Math.PI / 2, 0, 0]));
  }
  const legPos: [string, number, number][] = [['FL', 1, 0.16], ['FR', -1, 0.16], ['BL', 1, -0.18], ['BR', -1, -0.18]];
  for (const [n, sx, z] of legPos) {
    const hip = node(`leg${n}`, [0.22 * sx, 0, z], body);
    hip.rotation.z = 0;
    hip.add(mesh(sph(0.05, 8, 6), m.steelDark, [0, 0, 0]));
    hip.add(mesh(rbox(0.25, 0.05, 0.05, 0.015), m.rust2, [0.12 * sx, 0.06, 0], [0, 0, 0.5 * sx]));
    const kn = node(`foot${n}`, [0.24 * sx, 0.12, 0], hip);
    kn.add(mesh(cone(0.03, 0.5, 6), m.steelDark, [0.04 * sx, -0.25, 0], [0, 0, 0.15 * sx]));
  }
  const rest: R3 = { body: [0, 0, 0], head: [0, 0, 0], legFL: [0, 0, 0], legFR: [0, 0, 0], legBL: [0, 0, 0], legBR: [0, 0, 0], mandL: [0, 0, 0], mandR: [0, 0, 0] };
  const P = (o: R3) => ({ ...rest, ...o });
  const clips = [
    clip(root, 'idle', 1.2, [k(0, P({}), { body: [0, 0, 0] }), k(0.6, P({ head: [5, 10, 0], mandL: [0, 20, 0], mandR: [0, -20, 0] }), { body: [0, -0.02, 0] })]),
    clip(root, 'walk', 0.4, [
      k(0, P({ legFL: [0, 25, 10], legBR: [0, 25, -10], legFR: [0, 20, 0], legBL: [0, 20, 0] }), { body: [0, 0, 0] }),
      k(0.1, P({ legFL: [0, 0, 0], legBR: [0, 0, 0], legFR: [0, 0, -15], legBL: [0, 0, 15] }), { body: [0, 0.02, 0] }),
      k(0.2, P({ legFL: [0, -20, 0], legBR: [0, -20, 0], legFR: [0, -25, -10], legBL: [0, -25, 10] }), { body: [0, 0, 0] }),
      k(0.3, P({ legFL: [0, 0, 15], legBR: [0, 0, -15], legFR: [0, 0, 0], legBL: [0, 0, 0] }), { body: [0, 0.02, 0] })]),
    clip(root, 'windup', 0.5, [k(0, P({})), k(0.4, P({ body: [-18, 0, 0], head: [-15, 0, 0], legFL: [0, 0, 25], legFR: [0, 0, -25], legBL: [0, 0, 25], legBR: [0, 0, -25], mandL: [0, 40, 0], mandR: [0, -40, 0] }), { body: [0, -0.12, -0.05] }), k(0.5, P({ body: [-20, 0, 0], head: [-15, 0, 0], legFL: [0, 0, 27], legFR: [0, 0, -27], legBL: [0, 0, 27], legBR: [0, 0, -27], mandL: [0, 40, 0], mandR: [0, -40, 0] }), { body: [0, -0.13, -0.05] })], false),
    clip(root, 'attack', 0.5, [k(0, P({ body: [-25, 0, 0], legFL: [0, -40, -20], legFR: [0, 40, 20], mandL: [0, 40, 0], mandR: [0, -40, 0] }), { body: [0, 0.1, 0] }), k(0.25, P({ body: [15, 0, 0], head: [20, 0, 0], legFL: [0, 30, -20], legFR: [0, -30, 20], mandL: [0, -10, 0], mandR: [0, 10, 0] }), { body: [0, 0.05, 0.1] }), k(0.5, P({}), { body: [0, 0, 0] })], false),
    clip(root, 'hit', 0.25, [k(0, P({})), k(0.06, P({ body: [15, 0, 20] }), { body: [0, 0.05, -0.05] }), k(0.25, P({}), { body: [0, 0, 0] })], false),
    clip(root, 'stagger', 1.0, [k(0, P({})), k(0.2, P({ body: [0, 0, 160] }), { body: [0, 0.25, 0] }), k(0.7, P({ body: [0, 0, 175], legFL: [0, 30, 30], legFR: [0, -30, -30] }), { body: [0, 0.12, 0] }), k(1.0, P({}), { body: [0, 0, 0] })], false),
    clip(root, 'death', 0.9, [k(0, P({})), k(0.3, P({ body: [0, 0, 170] }), { body: [0, 0.3, 0] }), k(0.9, P({ body: [0, 0, 180], legFL: [0, 0, -40], legFR: [0, 0, 40], legBL: [0, 0, -40], legBR: [0, 0, 40] }), { body: [0, -0.1, 0] })], false),
  ];
  return { scene: root, clips };
}

// ======================= E03 — Carregador Pesado =======================
export function buildE03(): ModelAsset {
  const m = E();
  const root = node('E03');
  const chassis = node('chassis', [0, 0.45, 0], root);
  for (const sx of [1, -1]) {
    const tr = node(sx > 0 ? 'treadL' : 'treadR', [0.55 * sx, 0, 0], chassis);
    tr.add(mesh(rbox(0.32, 0.5, 1.5, 0.2), m.rubber, [0, 0, 0]));
    for (let i = 0; i < 4; i++) tr.add(mesh(cyl(0.16, 0.16, 0.34, 14), m.steelDark, [0, -0.04, -0.52 + i * 0.35], [0, 0, Math.PI / 2]));
    tr.add(mesh(rbox(0.34, 0.08, 1.3, 0.03), m.hazard, [0, 0.27, 0]));
  }
  const body = node('body', [0, 0.35, 0], chassis);
  body.add(mesh(rbox(0.9, 0.8, 1.2, 0.1), m.olive, [0, 0.4, -0.05]));
  body.add(mesh(rbox(0.7, 0.5, 0.5, 0.08), m.dark, [0, 0.95, -0.15]));
  body.add(mesh(rbox(0.6, 0.18, 0.04, 0.03), m.glass, [0, 1.0, 0.11]));
  body.add(mesh(rbox(0.5, 0.05, 0.03, 0.01), m.amberGlow, [0, 1.0, 0.135], [0, 0, 0], 'eye'));
  rivets(body, m.steel, [-0.4, 0.75, 0.56], [0.4, 0.75, 0.56], 7, 0.016);
  // escapamentos traseiros (flanco exposto)
  for (const sx of [1, -1]) {
    body.add(mesh(cyl(0.07, 0.08, 0.7, 10), m.steelDark, [0.25 * sx, 0.95, -0.62]));
    body.add(mesh(cyl(0.075, 0.075, 0.06, 10), m.redGlow, [0.25 * sx, 1.3, -0.62], [0, 0, 0], 'exhaust'));
  }
  body.add(mesh(rbox(0.6, 0.4, 0.06, 0.02), m.redGlow, [0, 0.45, -0.66], [0, 0, 0], 'weak'));
  // garfos / placas frontais
  const plow = node('plow', [0, 0.25, 0.65], body);
  plow.add(mesh(rbox(1.3, 0.8, 0.12, 0.04), m.steel, [0, 0.15, 0.1]));
  for (let i = 0; i < 5; i++) plow.add(mesh(rbox(0.12, 0.82, 0.04, 0.01), i % 2 ? m.hazard : m.dark, [-0.48 + i * 0.24, 0.15, 0.17]));
  for (const sx of [1, -1]) plow.add(mesh(rbox(0.12, 0.08, 0.7, 0.02), m.steelDark, [0.4 * sx, -0.25, 0.35]));
  const clips = [
    clip(root, 'idle', 0.3, [k(0, { body: [0, 0, 0] }, { body: [0, 0, 0] }), k(0.15, { body: [1, 0, 0] }, { body: [0, 0.01, 0] })]),
    clip(root, 'walk', 0.5, [k(0, { body: [2, 0, 1], plow: [0, 0, 0] }, { body: [0, 0, 0] }), k(0.25, { body: [2, 0, -1], plow: [0, 0, 0] }, { body: [0, 0.02, 0] })]),
    clip(root, 'windup', 0.9, [k(0, { body: [0, 0, 0], plow: [0, 0, 0] }), k(0.3, { body: [-8, 0, 2], plow: [-20, 0, 0] }, { body: [0, 0.04, -0.1] }), k(0.45, { body: [-8, 0, -2], plow: [-22, 0, 0] }, { body: [0, 0.02, -0.12] }), k(0.6, { body: [-9, 0, 2], plow: [-20, 0, 0] }, { body: [0, 0.04, -0.1] }), k(0.9, { body: [-10, 0, -2], plow: [-24, 0, 0] }, { body: [0, 0.02, -0.12] })], false),
    clip(root, 'attack', 0.4, [k(0, { body: [10, 0, 0], plow: [15, 0, 0] }, { body: [0, 0, 0.08] }), k(0.2, { body: [12, 0, 2], plow: [18, 0, 0] }, { body: [0, 0.02, 0.1] })]),
    clip(root, 'push', 0.7, [k(0, { body: [0, 0, 0], plow: [0, 0, 0] }), k(0.3, { body: [-4, 0, 0], plow: [-50, 0, 0] }), k(0.42, { body: [10, 0, 0], plow: [30, 0, 0] }, { body: [0, 0, 0.15] }), k(0.7, { body: [0, 0, 0], plow: [0, 0, 0] }, { body: [0, 0, 0] })], false),
    clip(root, 'recover', 1.6, [k(0, { body: [14, 0, 0], plow: [25, 0, 0] }, { body: [0, -0.05, 0.08] }), k(0.4, { body: [10, 0, 6], plow: [20, 0, 0] }), k(0.8, { body: [10, 0, -6], plow: [20, 0, 0] }), k(1.6, { body: [0, 0, 0], plow: [0, 0, 0] }, { body: [0, 0, 0] })], false),
    clip(root, 'hit', 0.25, [k(0, { body: [0, 0, 0] }), k(0.06, { body: [-6, 0, 3] }), k(0.25, { body: [0, 0, 0] })], false),
    clip(root, 'stagger', 1.4, [k(0, { body: [0, 0, 0], plow: [0, 0, 0] }), k(0.2, { body: [-12, 0, 8], plow: [-30, 0, 0] }, { body: [0, 0.08, 0] }), k(1.0, { body: [6, 0, -4], plow: [10, 0, 0] }), k(1.4, { body: [0, 0, 0], plow: [0, 0, 0] }, { body: [0, 0, 0] })], false),
    clip(root, 'death', 1.2, [k(0, { body: [0, 0, 0], plow: [0, 0, 0] }, { body: [0, 0, 0] }), k(0.4, { body: [-10, 0, 10], plow: [30, 0, 0] }, { body: [0, 0.1, 0] }), k(1.2, { body: [15, 0, 18], plow: [60, 0, 0] }, { body: [0, -0.25, 0] })], false),
  ];
  return { scene: root, clips };
}

// ======================= E04 — Triturador Circular =======================
export function buildE04(): ModelAsset {
  const m = E();
  const root = node('E04');
  const base = node('base', [0, 0.32, 0], root);
  base.add(mesh(cyl(0.32, 0.32, 0.18, 20), m.rubber, [0, 0, 0], [0, 0, Math.PI / 2], 'wheel'));
  base.add(mesh(cyl(0.18, 0.18, 0.2, 14), m.steelDark, [0, 0, 0], [0, 0, Math.PI / 2]));
  const body = node('body', [0, 0.35, 0], base);
  body.add(mesh(rbox(0.6, 0.5, 0.5, 0.1), m.red, [0, 0.2, 0]));
  body.add(mesh(rbox(0.62, 0.06, 0.52, 0.02), m.hazard, [0, 0.0, 0]));
  body.add(mesh(rbox(0.3, 0.1, 0.04, 0.02), m.dark, [0, 0.36, 0.25]));
  body.add(mesh(sph(0.04, 10, 8), m.redGlow, [0.07, 0.36, 0.27], [0, 0, 0], 'eye'));
  body.add(mesh(sph(0.04, 10, 8), m.redGlow, [-0.07, 0.36, 0.27]));
  body.add(mesh(cyl(0.05, 0.06, 0.3, 8), m.steelDark, [0.2, 0.55, -0.15]));
  const arm = node('sawArm', [0, 0.18, 0.28], body);
  arm.add(mesh(rbox(0.12, 0.12, 0.3, 0.03), m.steelDark, [0, 0, 0.12]));
  const saw = node('saw', [0, 0, 0.36], arm);
  const sawGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.03, 24);
  saw.add(mesh(sawGeo, m.steel, [0, 0, 0], [0, 0, Math.PI / 2]));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    saw.add(mesh(cone(0.04, 0.09, 4), m.steelDark, [0, Math.sin(a) * 0.44, Math.cos(a) * 0.44], [a + Math.PI / 2, 0, 0]));
  }
  saw.add(mesh(cyl(0.09, 0.09, 0.05, 12), m.redGlow, [0, 0, 0], [0, 0, Math.PI / 2], 'sawHub'));
  // saw: orientado no plano YZ (vertical à frente)
  // giro contínuo: chaves a cada 90° para a interpolação de quaternions não ficar ambígua
  const spin = (turns: number, d: number, extra: (t: number) => R3 = () => ({})): Key[] => {
    const n = Math.max(4, Math.round(turns * 4));
    const ks: Key[] = [];
    for (let i = 0; i <= n; i++) { const t = (i / n) * d; ks.push(k(t, { saw: [((i * 90) % 360) * -1, 0, 0], ...extra(t) })); }
    return ks;
  };
  const accel = (d: number): Key[] => { // acelera: ângulo ~ t^2
    const ks: Key[] = []; let ang = 0; const n = 24;
    for (let i = 0; i <= n; i++) { const t = (i / n) * d; ang = 1440 * (i / n) * (i / n); ks.push(k(t, { saw: [-(ang % 360), 0, 0], body: [-12 * Math.min(1, t / 0.2), 0, 0], sawArm: [-35 * Math.min(1, t / 0.2), 0, 0] })); }
    return ks;
  };
  const clips = [
    clip(root, 'idle', 0.8, spin(1, 0.8, (t) => ({ body: [0, 0, 0] })), true),
    clip(root, 'walk', 0.4, spin(1, 0.4, () => ({ body: [7, 0, 0] }))),
    clip(root, 'windup', 0.8, accel(0.8), false),
    clip(root, 'attack', 0.3, spin(3, 0.3, () => ({ body: [10, 0, 0], sawArm: [10, 0, 0] }))),
    clip(root, 'recover', 2.0, [k(0, { body: [0, 0, 20], saw: [0, 0, 0] }), k(0.5, { body: [0, 0, -18] }), k(1.0, { body: [0, 0, 14] }), k(1.5, { body: [0, 0, -8] }), k(2.0, { body: [0, 0, 0], saw: [90, 0, 0] })], false),
    clip(root, 'hit', 0.25, [k(0, { body: [0, 0, 0] }), k(0.06, { body: [-15, 0, 5] }), k(0.25, { body: [0, 0, 0] })], false),
    clip(root, 'stagger', 1.2, [k(0, { body: [0, 0, 0] }), k(0.2, { body: [-25, 0, 20] }), k(0.8, { body: [10, 0, -15] }), k(1.2, { body: [0, 0, 0] })], false),
    clip(root, 'death', 1.0, [k(0, { body: [0, 0, 0], sawArm: [0, 0, 0] }, { base: [0, 0, 0] }), k(0.4, { body: [-30, 0, 30], sawArm: [40, 0, 0] }, { base: [0, 0.05, 0] }), k(1.0, { body: [0, 0, 85], sawArm: [60, 0, 0] }, { base: [0, -0.1, 0] })], false),
  ];
  return { scene: root, clips };
}

// ======================= E05 — Drone de Coleta =======================
export function buildE05(): ModelAsset {
  const m = E();
  const root = node('E05');
  const body = node('body', [0, 2.2, 0], root);
  body.add(mesh(sph(0.28, 16, 10), m.hazard, [0, 0, 0], [0, 0, 0], undefined, [1, 0.6, 1]));
  body.add(mesh(cyl(0.18, 0.22, 0.12, 14), m.dark, [0, -0.15, 0]));
  body.add(mesh(cyl(0.08, 0.1, 0.06, 12), m.yellowGlow, [0, -0.23, 0], [0, 0, 0], 'beamer'));
  body.add(mesh(sph(0.06, 10, 8), m.redGlow, [0, 0.02, 0.26], [0, 0, 0], 'eye'));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(a) * 0.42, z = Math.sin(a) * 0.42;
    body.add(mesh(rbox(0.4, 0.04, 0.06, 0.015), m.steelDark, [x / 2, 0.04, z / 2], [0, -a, 0]));
    body.add(mesh(cyl(0.05, 0.05, 0.08, 10), m.dark, [x, 0.06, z]));
    const rot = node(`rotor${i}`, [x, 0.12, z], body);
    rot.add(mesh(rbox(0.36, 0.01, 0.05, 0.004), m.steel, [0, 0, 0]));
    rot.add(mesh(rbox(0.05, 0.01, 0.36, 0.004), m.steel, [0, 0, 0]));
    rot.add(mesh(tor(0.2, 0.012, 4, 20), m.hazard, [0, -0.01, 0], [Math.PI / 2, 0, 0]));
  }
  const clawN = node('claw', [0, -0.25, 0.08], body);
  for (const sx of [1, -1]) clawN.add(mesh(rbox(0.03, 0.16, 0.03, 0.01), m.steel, [0.05 * sx, -0.08, 0], [0, 0, 0.3 * sx]));
  const rot = (t: number) => Object.fromEntries([0, 1, 2, 3].map((i) => [`rotor${i}`, [0, (i % 2 ? -1 : 1) * (t % 360), 0]])) as R3;
  const hov = (d: number, extra: R3 = {}, amp = 0.06): Key[] => [0, 1, 2, 3, 4].map((i) => k((i / 4) * d, { ...rot(i * 90), body: [0, 0, 0], ...extra }, { body: [0, i === 2 ? amp : i % 2 ? amp * 0.5 : 0, 0] }));
  const clips = [
    clip(root, 'idle', 0.25, hov(0.25)),
    clip(root, 'walk', 0.25, hov(0.25, { body: [12, 0, 0] })),
    clip(root, 'windup', 0.25, hov(0.25, { body: [-8, 0, 0], claw: [40, 0, 0] }, 0.02)),
    clip(root, 'attack', 0.25, hov(0.25, { body: [-4, 0, 0], claw: [50, 0, 0] }, 0.02)),
    clip(root, 'hit', 0.25, [k(0, { ...rot(0), body: [0, 0, 0] }), k(0.06, { ...rot(90), body: [-25, 0, 20] }), k(0.25, { ...rot(180), body: [0, 0, 0] })], false),
    clip(root, 'stagger', 1.0, [k(0, { ...rot(0), body: [0, 0, 0] }, { body: [0, 0, 0] }), k(0.5, { ...rot(90), body: [20, 0, 40] }, { body: [0, -0.6, 0] }), k(1.0, { ...rot(180), body: [0, 0, 0] }, { body: [0, 0, 0] })], false),
    clip(root, 'death', 1.0, [k(0, { ...rot(0), body: [0, 0, 0] }, { body: [0, 0, 0] }), k(0.5, { ...rot(100), body: [40, 0, 60] }, { body: [0, -1.2, 0] }), k(1.0, { ...rot(120), body: [80, 0, 100] }, { body: [0, -2.0, 0] })], false),
  ];
  return { scene: root, clips };
}

// ======================= B01 — O COMPACTADOR =======================
export function buildB01(): ModelAsset {
  const m = E();
  const root = node('B01');
  const hull = node('hull', [0, 3.2, 0], root);
  hull.add(mesh(rbox(3.0, 2.6, 2.8, 0.25), m.olive, [0, 0.6, 0]));
  hull.add(mesh(rbox(3.1, 0.3, 2.9, 0.08), m.hazard, [0, -0.6, 0]));
  hull.add(mesh(rbox(2.4, 1.4, 0.2, 0.06), m.dark, [0, 1.0, -1.45]));
  for (let i = 0; i < 5; i++) hull.add(mesh(rbox(2.2, 0.08, 0.1, 0.02), m.steelDark, [0, 0.5 + i * 0.25, -1.55]));
  rivets(hull, m.steel, [-1.4, 1.85, 1.41], [1.4, 1.85, 1.41], 10, 0.04);
  rivets(hull, m.steel, [-1.4, -0.4, 1.41], [1.4, -0.4, 1.41], 10, 0.04);
  // chaminés e cabos expostos
  for (const sx of [1, -1]) {
    hull.add(mesh(cyl(0.22, 0.26, 1.4, 12), m.steelDark, [0.9 * sx, 2.4, -0.6]));
    hull.add(mesh(cyl(0.24, 0.24, 0.12, 12), m.rust2, [0.9 * sx, 3.1, -0.6]));
    hose(hull, m.copper, [[0.6 * sx, 1.9, -1.0], [1.2 * sx, 1.4, -1.6], [1.4 * sx, 0.4, -1.4]], 0.07, 12);
    hose(hull, mat('b_cable_r', 0xb3261e, { rough: 0.6, metal: 0.1 }), [[0.3 * sx, 1.9, -1.2], [0.8 * sx, 1.0, -1.8], [1.2 * sx, -0.2, -1.5]], 0.05, 12);
  }
  // cabine/sensor
  const sensor = node('sensor', [0, 2.0, 1.1], hull);
  sensor.add(mesh(rbox(1.4, 0.5, 0.6, 0.12), m.dark, [0, 0, 0]));
  sensor.add(mesh(rbox(1.1, 0.14, 0.05, 0.03), m.redGlow, [0, 0.03, 0.3], [0, 0, 0], 'eye'));
  // núcleo exposto (ponto fraco) na base
  const core = node('core', [0, -0.75, 0], hull);
  core.add(mesh(sph(0.45, 18, 12), m.amberGlow, [0, 0, 0], [0, 0, 0], 'coreGlow'));
  core.add(mesh(tor(0.5, 0.06, 8, 24), m.steelDark, [0, 0, 0], [Math.PI / 2, 0, 0]));
  // placa frontal da prensa (dobradiça no topo)
  const plate = node('plate', [0, 1.9, 1.45], hull);
  plate.add(mesh(rbox(3.2, 3.4, 0.35, 0.08), m.steel, [0, -1.8, 0.1]));
  for (let i = 0; i < 6; i++) plate.add(mesh(rbox(0.25, 3.3, 0.05, 0.02), i % 2 ? m.hazard : m.dark, [-1.25 + i * 0.5, -1.8, 0.3]));
  plate.add(mesh(rbox(3.25, 0.25, 0.4, 0.05), m.rust, [0, -3.45, 0.1]));
  // braços
  for (const s of ['L', 'R'] as const) {
    const sx = s === 'L' ? 1 : -1;
    const sh = node(`arm${s}`, [1.7 * sx, 1.0, 0.4], hull);
    sh.add(mesh(sph(0.42, 14, 10), m.steelDark, [0, 0, 0]));
    sh.add(mesh(rbox(0.6, 1.6, 0.6, 0.12), m.olive, [0.1 * sx, -0.85, 0]));
    const el = node(`fore${s}`, [0.1 * sx, -1.7, 0], sh);
    el.add(mesh(sph(0.32, 12, 8), m.steel, [0, 0, 0]));
    el.add(mesh(rbox(0.5, 1.4, 0.5, 0.1), m.dark, [0, -0.7, 0]));
    el.add(mesh(rbox(0.9, 0.5, 0.9, 0.12), m.rust, [0, -1.5, 0], [0, 0, 0], `fist${s}`));
    el.add(mesh(rbox(0.92, 0.12, 0.92, 0.03), m.hazard, [0, -1.25, 0]));
  }
  // quatro pernas
  for (const [n, sx, sz] of [['FL', 1, 1], ['FR', -1, 1], ['BL', 1, -1], ['BR', -1, -1]] as [string, number, number][]) {
    const th = node(`leg${n}`, [1.2 * sx, -0.5, 1.0 * sz], hull);
    th.add(mesh(sph(0.35, 12, 8), m.steelDark, [0, 0, 0]));
    th.add(mesh(rbox(0.45, 1.6, 0.45, 0.1), m.olive, [0.35 * sx, -0.6, 0], [0, 0, 0.5 * sx]));
    const sh = node(`shin${n}`, [0.75 * sx, -1.35, 0], th);
    sh.add(mesh(sph(0.28, 10, 8), m.steel, [0, 0, 0]));
    sh.add(mesh(rbox(0.38, 1.4, 0.38, 0.08), m.dark, [0, -0.7, 0], [0, 0, -0.5 * sx]));
    sh.add(mesh(cyl(0.45, 0.55, 0.3, 14), m.rust2, [-0.32 * sx, -1.33, 0]));
  }
  const legs = (o: Partial<Record<string, V3>> = {}): R3 => ({ legFL: [0, 0, 0], legFR: [0, 0, 0], legBL: [0, 0, 0], legBR: [0, 0, 0], shinFL: [0, 0, 0], shinFR: [0, 0, 0], shinBL: [0, 0, 0], shinBR: [0, 0, 0], ...o } as R3);
  const rest: R3 = { ...legs(), armL: [0, 0, 0], armR: [0, 0, 0], foreL: [-20, 0, 0], foreR: [-20, 0, 0], plate: [0, 0, 0], hull: [0, 0, 0], sensor: [0, 0, 0] };
  const P = (o: R3) => ({ ...rest, ...o });
  const clips = [
    clip(root, 'idle', 2.0, [k(0, P({}), { hull: [0, 0, 0] }), k(1, P({ sensor: [0, 12, 0], foreL: [-25, 0, 0], foreR: [-25, 0, 0] }), { hull: [0, -0.06, 0] })]),
    clip(root, 'walk', 1.4, [
      k(0, P({ legFL: [-15, 0, 0], legBR: [-15, 0, 0], legFR: [12, 0, 0], legBL: [12, 0, 0], hull: [0, 0, 2], armL: [12, 0, 0], armR: [-12, 0, 0] }), { hull: [0, 0, 0] }),
      k(0.35, P({ legFL: [0, 0, 0], legBR: [0, 0, 0], legFR: [0, 0, 0], legBL: [0, 0, 0], shinFR: [-25, 0, 0], shinBL: [-25, 0, 0] }), { hull: [0, 0.18, 0] }),
      k(0.7, P({ legFR: [-15, 0, 0], legBL: [-15, 0, 0], legFL: [12, 0, 0], legBR: [12, 0, 0], hull: [0, 0, -2], armL: [-12, 0, 0], armR: [12, 0, 0] }), { hull: [0, 0, 0] }),
      k(1.05, P({ shinFL: [-25, 0, 0], shinBR: [-25, 0, 0] }), { hull: [0, 0.18, 0] })]),
    clip(root, 'intro', 2.4, [k(0, P({ hull: [20, 0, 0], armL: [30, 0, 30], armR: [30, 0, -30] }), { hull: [0, -1.0, 0] }), k(1.0, P({ hull: [-15, 0, 0], armL: [-130, 0, 30], armR: [-130, 0, -30], plate: [-30, 0, 0], sensor: [-20, 0, 0] }), { hull: [0, 0.3, 0] }), k(1.6, P({ hull: [-12, 0, 0], armL: [-140, 0, 40], armR: [-140, 0, -40], plate: [-35, 0, 0], sensor: [-25, 0, 0] }), { hull: [0, 0.35, 0] }), k(2.4, P({}), { hull: [0, 0, 0] })], false),
    // pisão frontal: telegráfico = levanta perna dianteira e corpo
    clip(root, 'stomp_w', 1.0, [k(0, P({})), k(0.8, P({ legFL: [-45, 0, 0], legFR: [-45, 0, 0], shinFL: [-30, 0, 0], shinFR: [-30, 0, 0], hull: [-12, 0, 0], armL: [-40, 0, 20], armR: [-40, 0, -20] }), { hull: [0, 0.5, -0.2] }), k(1.0, P({ legFL: [-47, 0, 0], legFR: [-47, 0, 0], shinFL: [-32, 0, 0], shinFR: [-32, 0, 0], hull: [-13, 0, 0], armL: [-40, 0, 20], armR: [-40, 0, -20] }), { hull: [0, 0.52, -0.2] })], false),
    clip(root, 'stomp', 0.5, [k(0, P({ legFL: [-47, 0, 0], legFR: [-47, 0, 0], shinFL: [-32, 0, 0], shinFR: [-32, 0, 0], hull: [-13, 0, 0] }), { hull: [0, 0.52, -0.2] }), k(0.15, P({ legFL: [10, 0, 0], legFR: [10, 0, 0], hull: [10, 0, 0], armL: [20, 0, 10], armR: [20, 0, -10] }), { hull: [0, -0.5, 0.3] }), k(0.5, P({ legFL: [8, 0, 0], legFR: [8, 0, 0], hull: [8, 0, 0] }), { hull: [0, -0.45, 0.25] })], false),
    // golpe de braço
    clip(root, 'swing_w', 0.8, [k(0, P({})), k(0.7, P({ armR: [-120, -30, -50], foreR: [-60, 0, 0], hull: [0, 25, 0] }), { hull: [0, 0.1, 0] }), k(0.8, P({ armR: [-122, -30, -52], foreR: [-62, 0, 0], hull: [0, 26, 0] }), { hull: [0, 0.1, 0] })], false),
    clip(root, 'swing', 0.6, [k(0, P({ armR: [-122, -30, -52], foreR: [-62, 0, 0], hull: [0, 26, 0] })), k(0.2, P({ armR: [-60, 40, 10], foreR: [-10, 0, 0], hull: [6, -30, 0] }), { hull: [0, -0.1, 0.2] }), k(0.6, P({ armR: [-40, 30, 0], foreR: [-20, 0, 0], hull: [4, -25, 0] }), { hull: [0, -0.1, 0.15] })], false),
    // varredura lateral (fase 2)
    clip(root, 'sweep_w', 1.0, [k(0, P({})), k(0.8, P({ armL: [-80, 0, 80], foreL: [-10, 0, 0], armR: [-80, 0, -80], foreR: [-10, 0, 0], hull: [0, 50, 0] }), { hull: [0, -0.2, 0] }), k(1.0, P({ armL: [-82, 0, 82], foreL: [-10, 0, 0], armR: [-82, 0, -82], foreR: [-10, 0, 0], hull: [0, 52, 0] }), { hull: [0, -0.2, 0] })], false),
    clip(root, 'sweep', 0.9, [k(0, P({ armL: [-82, 0, 82], armR: [-82, 0, -82], hull: [0, 52, 0], foreL: [-10, 0, 0], foreR: [-10, 0, 0] }), { hull: [0, -0.2, 0] }), k(0.5, P({ armL: [-82, 0, 82], armR: [-82, 0, -82], hull: [0, -150, 0], foreL: [-10, 0, 0], foreR: [-10, 0, 0] }), { hull: [0, -0.2, 0] }), k(0.9, P({ hull: [0, -180, 0] }), { hull: [0, 0, 0] })], false),
    clip(root, 'charge_w', 1.0, [k(0, P({})), k(0.8, P({ hull: [18, 0, 0], legBL: [25, 0, 0], legBR: [25, 0, 0], armL: [40, 0, 20], armR: [40, 0, -20], plate: [-10, 0, 0] }), { hull: [0, -0.4, -0.4] }), k(1.0, P({ hull: [19, 0, 0], legBL: [26, 0, 0], legBR: [26, 0, 0], armL: [40, 0, 20], armR: [40, 0, -20], plate: [-10, 0, 0] }), { hull: [0, -0.42, -0.42] })], false),
    clip(root, 'charge', 0.6, [k(0, P({ hull: [14, 0, 0], legFL: [-25, 0, 0], legBR: [-25, 0, 0], legFR: [20, 0, 0], legBL: [20, 0, 0] }), { hull: [0, -0.2, 0] }), k(0.3, P({ hull: [14, 0, 0], legFR: [-25, 0, 0], legBL: [-25, 0, 0], legFL: [20, 0, 0], legBR: [20, 0, 0] }), { hull: [0, 0, 0] })]),
    // atordoado: núcleo exposto, corpo baixo
    clip(root, 'stunned', 2.0, [k(0, P({ hull: [8, 0, 6], legFL: [30, 0, 0], legFR: [30, 0, 0], shinFL: [40, 0, 0], shinFR: [40, 0, 0], armL: [20, 0, 40], armR: [20, 0, -40], sensor: [20, 0, 0], plate: [-40, 0, 0] }), { hull: [0, -1.0, 0] }), k(1.0, P({ hull: [8, 0, -6], legFL: [32, 0, 0], legFR: [32, 0, 0], shinFL: [42, 0, 0], shinFR: [42, 0, 0], armL: [25, 0, 40], armR: [25, 0, -40], sensor: [20, 15, 0], plate: [-42, 0, 0] }), { hull: [0, -1.05, 0] })]),
    // prensa central (fase 3): ergue e esmaga
    clip(root, 'slam_w', 1.2, [k(0, P({})), k(1.0, P({ plate: [-95, 0, 0], armL: [-160, 0, 20], armR: [-160, 0, -20], foreL: [-30, 0, 0], foreR: [-30, 0, 0], hull: [-10, 0, 0] }), { hull: [0, 1.0, 0] }), k(1.2, P({ plate: [-97, 0, 0], armL: [-162, 0, 20], armR: [-162, 0, -20], foreL: [-30, 0, 0], foreR: [-30, 0, 0], hull: [-10, 0, 0] }), { hull: [0, 1.05, 0] })], false),
    clip(root, 'slam', 0.6, [k(0, P({ plate: [-97, 0, 0], armL: [-162, 0, 20], armR: [-162, 0, -20], hull: [-10, 0, 0] }), { hull: [0, 1.05, 0] }), k(0.15, P({ plate: [5, 0, 0], armL: [-40, 0, 20], armR: [-40, 0, -20], hull: [12, 0, 0] }), { hull: [0, -1.1, 0.3] }), k(0.6, P({ plate: [0, 0, 0], armL: [-30, 0, 20], armR: [-30, 0, -20], hull: [10, 0, 0] }), { hull: [0, -1.0, 0.3] })], false),
    clip(root, 'hit', 0.3, [k(0, P({})), k(0.08, P({ hull: [-4, 4, 2], sensor: [-10, 0, 0] }), { hull: [0, 0.05, -0.1] }), k(0.3, P({}), { hull: [0, 0, 0] })], false),
    clip(root, 'death', 3.0, [k(0, P({}), { hull: [0, 0, 0] }), k(0.6, P({ hull: [-10, 10, 8], armL: [-100, 0, 30], armR: [-60, 0, -40], sensor: [-30, 0, 0], plate: [-60, 0, 0] }), { hull: [0, 0.3, 0] }), k(1.6, P({ hull: [15, -10, -10], legFL: [40, 0, 0], legFR: [40, 0, 0], shinFL: [50, 0, 0], shinFR: [50, 0, 0], armL: [30, 0, 60], armR: [30, 0, -60], sensor: [40, 0, 0], plate: [-20, 0, 0] }), { hull: [0, -1.4, 0.2] }), k(3.0, P({ hull: [22, -12, -14], legFL: [60, 0, 0], legFR: [60, 0, 0], legBL: [-20, 0, 0], legBR: [-20, 0, 0], shinFL: [60, 0, 0], shinFR: [60, 0, 0], armL: [40, 0, 70], armR: [40, 0, -70], sensor: [45, 0, 0], plate: [-10, 0, 0] }), { hull: [0, -1.9, 0.3] })], false),
  ];
  return { scene: root, clips };
}

// ======================= FERRO-7 =======================
export function buildFerro7(): ModelAsset {
  const m = E();
  const blue = mat('f7_blue', 0x3d6f8f, { rough: 0.55, metal: 0.4 });
  const root = node('FERRO7');
  const hips = node('hips', [0, 1.0, 0], root);
  hips.add(mesh(rbox(0.4, 0.2, 0.3, 0.06), m.dark, [0, 0, 0]));
  const torso = node('torso', [0, 0.1, 0], hips);
  torso.add(mesh(rbox(0.5, 0.6, 0.36, 0.08), blue, [0, 0.32, 0]));
  torso.add(mesh(rbox(0.42, 0.5, 0.06, 0.02), mat('f7_apron', 0x6b4a2e, { rough: 0.9, metal: 0 }), [0, 0.2, 0.2]));
  torso.add(mesh(cyl(0.12, 0.12, 0.5, 12), m.copper, [0, 0.35, -0.26]));
  torso.add(mesh(cyl(0.13, 0.13, 0.04, 12), m.hazard, [0, 0.6, -0.26]));
  const neck = node('neck', [0, 0.66, 0.04], torso);
  neck.add(mesh(cyl(0.05, 0.05, 0.12, 8), m.steelDark, [0, 0.04, 0]));
  const head = node('head', [0, 0.1, 0], neck);
  head.add(mesh(rbox(0.32, 0.3, 0.3, 0.08), blue, [0, 0.12, 0]));
  const mask = node('mask', [0, 0.26, 0.12], head);
  mask.add(mesh(rbox(0.34, 0.24, 0.06, 0.03), m.dark, [0, -0.12, 0.04]));
  mask.add(mesh(rbox(0.24, 0.06, 0.02, 0.01), m.amberGlow, [0, -0.1, 0.075], [0, 0, 0], 'eye'));
  head.add(mesh(cyl(0.006, 0.006, 0.25, 6), m.steelDark, [-0.1, 0.38, -0.06]));
  head.add(mesh(sph(0.02, 8, 6), m.cyan, [-0.1, 0.51, -0.06]));
  for (const s of ['L', 'R'] as const) {
    const sx = s === 'L' ? 1 : -1;
    const sh = node(`shoulder${s}`, [0.32 * sx, 0.55, 0], torso);
    sh.add(mesh(sph(0.09, 10, 8), m.steelDark, [0, 0, 0]));
    sh.add(mesh(rbox(0.1, 0.36, 0.1, 0.03), blue, [0, -0.2, 0]));
    const el = node(`elbow${s}`, [0, -0.4, 0], sh);
    el.add(mesh(rbox(0.09, 0.34, 0.09, 0.03), m.steel, [0, -0.17, 0]));
    if (s === 'R') {
      el.add(mesh(cyl(0.03, 0.04, 0.2, 8), m.copper, [0, -0.42, 0.02]));
      el.add(mesh(cone(0.02, 0.06, 8), m.cyan, [0, -0.55, 0.02], [Math.PI, 0, 0], 'torch'));
    } else {
      for (let i = 0; i < 3; i++) el.add(mesh(rbox(0.02, 0.1, 0.02, 0.006), m.steelDark, [-0.03 + i * 0.03, -0.39, 0.02]));
    }
    const th = node(`thigh${s}`, [0.14 * sx, -0.06, 0], hips);
    th.add(mesh(rbox(0.12, 0.44, 0.14, 0.04), m.dark, [0, -0.22, 0]));
    const kn = node(`knee${s}`, [0, -0.46, 0], th);
    kn.add(mesh(rbox(0.11, 0.44, 0.12, 0.03), blue, [0, -0.22, 0]));
    kn.add(mesh(rbox(0.16, 0.08, 0.26, 0.03), m.steelDark, [0, -0.46, 0.05]));
  }
  const rest: R3 = { torso: [14, 0, 0], neck: [0, 0, 0], head: [-6, 0, 0], shoulderL: [0, 0, 10], shoulderR: [0, 0, -10], elbowL: [-20, 0, 0], elbowR: [-20, 0, 0], thighL: [-6, 0, 0], thighR: [-6, 0, 0], kneeL: [8, 0, 0], kneeR: [8, 0, 0], mask: [0, 0, 0] };
  const P = (o: R3) => ({ ...rest, ...o });
  const clips = [
    clip(root, 'idle', 2.6, [k(0, P({})), k(1.3, P({ torso: [16, 0, 0], neck: [0, 12, 0], shoulderR: [-10, 0, -12] }))]),
    clip(root, 'work', 1.0, [k(0, P({ torso: [28, 0, 0], shoulderR: [-70, 20, 0], elbowR: [-50, 0, 0], shoulderL: [-60, -20, 0], elbowL: [-60, 0, 0], neck: [20, 0, 0], mask: [0, 0, 0] })), k(0.5, P({ torso: [30, 0, 0], shoulderR: [-75, 25, 0], elbowR: [-45, 0, 0], shoulderL: [-58, -20, 0], elbowL: [-62, 0, 0], neck: [22, 0, 0], mask: [0, 0, 0] }))]),
    clip(root, 'wave', 1.2, [k(0, P({})), k(0.3, P({ shoulderR: [-160, 0, -30], elbowR: [-30, 0, 0], mask: [-80, 0, 0] })), k(0.6, P({ shoulderR: [-160, 0, -50], elbowR: [-60, 0, 0], mask: [-80, 0, 0] })), k(0.9, P({ shoulderR: [-160, 0, -30], elbowR: [-30, 0, 0], mask: [-80, 0, 0] })), k(1.2, P({ mask: [-80, 0, 0] }))], false),
    clip(root, 'trapped', 1.2, [k(0, P({ torso: [30, 20, 0], shoulderL: [-120, 0, 30], shoulderR: [-120, 0, -30], elbowL: [-40, 0, 0], elbowR: [-40, 0, 0] })), k(0.6, P({ torso: [26, -20, 0], shoulderL: [-130, 0, 40], shoulderR: [-110, 0, -20], elbowL: [-30, 0, 0], elbowR: [-60, 0, 0] }))]),
  ];
  return { scene: root, clips };
}

// ======================= PÍXEL (projetor holográfico) =======================
export function buildPixel(): ModelAsset {
  const m = E();
  const root = node('PIXEL');
  const body = node('body', [0, 0, 0], root);
  body.add(mesh(sph(0.11, 16, 12), m.white, [0, 0, 0]));
  body.add(mesh(tor(0.14, 0.015, 6, 24), m.steelDark, [0, 0, 0], [Math.PI / 2, 0, 0]));
  body.add(mesh(cyl(0.05, 0.05, 0.03, 14), m.cyan, [0, 0, 0.1], [Math.PI / 2, 0, 0], 'lens'));
  body.add(mesh(rbox(0.05, 0.02, 0.1, 0.008), m.hazard, [0, 0.11, -0.02]));
  const fin = node('fin', [0, -0.1, -0.04], body);
  fin.add(mesh(cone(0.03, 0.1, 6), m.steelDark, [0, -0.04, 0], [Math.PI, 0, 0]));
  const clips = [clip(root, 'idle', 2.0, [k(0, { body: [0, 0, 0], fin: [0, 0, 0] }, { body: [0, 0, 0] }), k(1.0, { body: [6, 20, 4], fin: [10, 0, 0] }, { body: [0, 0.06, 0] })])];
  return { scene: root, clips };
}

export const MODEL_BUILDERS: Record<string, () => ModelAsset> = {
  e01: buildE01, e02: buildE02, e03: buildE03, e04: buildE04, e05: buildE05, b01: buildB01, ferro7: buildFerro7, pixel: buildPixel,
};
