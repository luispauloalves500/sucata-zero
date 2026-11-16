// Peças modulares do Z-01 (Mundo 1). Cada peça é um nó com filhos nomeados pelo socket de destino.
import * as THREE from 'three';
import { PAL, mat, mesh, node, rbox, cyl, sph, tor, cone, rivets, hose, type V3 } from './kit';

const M = () => ({
  body: mat('z_body', PAL.zBody, { rough: 0.5, metal: 0.25 }),
  body2: mat('z_body2', PAL.zBody2, { rough: 0.6, metal: 0.25 }),
  dark: mat('z_dark', PAL.zDark, { rough: 0.6, metal: 0.5 }),
  joint: mat('z_joint', PAL.zJoint, { rough: 0.45, metal: 0.7 }),
  cyan: mat('z_cyan', PAL.zCyan, { emissive: PAL.zCyan, ei: 2.2, rough: 0.3, metal: 0 }),
  glass: mat('z_glass', 0x0b1418, { rough: 0.15, metal: 0.2 }),
  steel: mat('steel', PAL.steel, { rough: 0.4, metal: 0.85 }),
  steelDark: mat('steel_dark', PAL.steelDark, { rough: 0.5, metal: 0.8 }),
  copper: mat('z_copper', PAL.copper, { rough: 0.35, metal: 0.9 }),
  hazard: mat('hazard', PAL.hazard, { rough: 0.55, metal: 0.2 }),
  orange: mat('tensor_orange', 0xe8641e, { rough: 0.5, metal: 0.3 }),
  rust: mat('rust', PAL.rust, { rough: 0.85, metal: 0.4 }),
  rubber: mat('rubber', PAL.rubber, { rough: 0.9, metal: 0.0 }),
  amberGlow: mat('amber_glow', PAL.amber, { emissive: PAL.amber, ei: 2.0, rough: 0.3, metal: 0 }),
  redGlow: mat('red_glow', PAL.red, { emissive: PAL.red, ei: 2.4, rough: 0.3, metal: 0 }),
});

function part(id: string): THREE.Object3D { return node(id); }
function sock(p: THREE.Object3D, s: string): THREE.Object3D { return node(`${p.name}__${s}`, [0, 0, 0], p); }

// ---------------- Cabeças ----------------
function headBase(h: THREE.Object3D, m: ReturnType<typeof M>) {
  h.add(mesh(rbox(0.32, 0.25, 0.28, 0.07), m.body, [0, 0.13, 0]));
  h.add(mesh(rbox(0.26, 0.13, 0.04, 0.03), m.dark, [0, 0.14, 0.135]));
  h.add(mesh(cyl(0.035, 0.035, 0.36, 10), m.joint, [0, 0.12, -0.01], [0, 0, Math.PI / 2]));
  h.add(mesh(cyl(0.05, 0.05, 0.02, 12), m.steel, [0.17, 0.12, -0.01], [0, 0, Math.PI / 2]));
  h.add(mesh(cyl(0.05, 0.05, 0.02, 12), m.steel, [-0.17, 0.12, -0.01], [0, 0, Math.PI / 2]));
  h.add(mesh(rbox(0.2, 0.03, 0.18, 0.012), m.body2, [0, 0.265, -0.02]));
}
function P01(): THREE.Object3D { // Visor de Lata
  const m = M(); const p = part('P01'); const h = sock(p, 'SOCKET_HEAD');
  headBase(h, m);
  h.add(mesh(rbox(0.21, 0.045, 0.02, 0.018), m.cyan, [0, 0.145, 0.157], [0, 0, 0], 'eye'));
  h.add(mesh(cyl(0.006, 0.006, 0.18, 6), m.joint, [0.1, 0.34, -0.06]));
  h.add(mesh(sph(0.018, 8, 6), m.amberGlow, [0.1, 0.43, -0.06]));
  rivets(h, m.steel, [-0.12, 0.235, 0.141], [0.12, 0.235, 0.141], 5, 0.008);
  return p;
}
function P02(): THREE.Object3D { // Sensor MIRA
  const m = M(); const p = part('P02'); const h = sock(p, 'SOCKET_HEAD');
  headBase(h, m);
  h.add(mesh(cyl(0.085, 0.09, 0.05, 20), m.steelDark, [0, 0.14, 0.15], [Math.PI / 2, 0, 0]));
  h.add(mesh(cyl(0.06, 0.06, 0.02, 20), m.cyan, [0, 0.14, 0.18], [Math.PI / 2, 0, 0], 'eye'));
  h.add(mesh(tor(0.075, 0.008, 6, 24), m.copper, [0, 0.14, 0.177]));
  h.add(mesh(rbox(0.004, 0.09, 0.004, 0.001), m.redGlow, [0, 0.14, 0.192]));
  h.add(mesh(rbox(0.09, 0.004, 0.004, 0.001), m.redGlow, [0, 0.14, 0.192]));
  // prato de radar lateral
  const dish = node('radar', [-0.2, 0.2, -0.02], h);
  dish.add(mesh(cyl(0.012, 0.012, 0.08, 6), m.joint, [0, 0.03, 0]));
  dish.add(mesh(new THREE.SphereGeometry(0.07, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), m.steel, [0, 0.08, 0], [Math.PI / 2.4, 0, 0.4]));
  h.add(mesh(cyl(0.005, 0.005, 0.26, 6), m.joint, [0.12, 0.37, -0.08]));
  h.add(mesh(sph(0.02, 8, 6), m.cyan, [0.12, 0.5, -0.08]));
  return p;
}
function P03(): THREE.Object3D { // Olho de Sucata
  const m = M(); const p = part('P03'); const h = sock(p, 'SOCKET_HEAD');
  headBase(h, m);
  h.add(mesh(cyl(0.05, 0.05, 0.06, 16), m.steelDark, [0.06, 0.15, 0.16], [Math.PI / 2, 0, 0]));
  h.add(mesh(cyl(0.035, 0.035, 0.02, 16), m.amberGlow, [0.06, 0.15, 0.195], [Math.PI / 2, 0, 0], 'eye'));
  h.add(mesh(cyl(0.032, 0.032, 0.08, 14), m.copper, [-0.07, 0.12, 0.16], [Math.PI / 2, 0, 0]));
  h.add(mesh(cyl(0.022, 0.022, 0.02, 14), m.amberGlow, [-0.07, 0.12, 0.205], [Math.PI / 2, 0, 0]));
  h.add(mesh(rbox(0.12, 0.05, 0.1, 0.01), m.rust, [0.08, 0.28, 0], [0, 0, 0.2]));
  return p;
}

// ---------------- Braços ----------------
function upperArm(u: THREE.Object3D, m: ReturnType<typeof M>, matBody: THREE.Material, r = 0.065) {
  u.add(mesh(rbox(r * 2, 0.2, r * 2, 0.03), matBody, [0, -0.12, 0]));
  u.add(mesh(cyl(r * 0.6, r * 0.6, 0.06, 10), m.joint, [0, -0.25, 0]));
  u.add(mesh(rbox(0.16, 0.08, 0.17, 0.035), matBody, [0, 0.0, 0])); // ombreira
}
function P06(): THREE.Object3D { // Garra de Oficina (braço E)
  const m = M(); const p = part('P06');
  const u = sock(p, 'SOCKET_ARM_L_UPPER'); upperArm(u, m, m.body);
  const f = sock(p, 'SOCKET_ARM_L_FORE');
  f.add(mesh(rbox(0.11, 0.2, 0.11, 0.025), m.dark, [0, -0.11, 0]));
  f.add(mesh(cyl(0.05, 0.05, 0.05, 12), m.steel, [0, -0.23, 0]));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const fin = node('claw' + i, [Math.cos(a) * 0.035, -0.25, Math.sin(a) * 0.035], f);
    fin.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
    fin.add(mesh(rbox(0.025, 0.1, 0.025, 0.008), m.steel, [0, -0.05, 0]));
    fin.add(mesh(cone(0.016, 0.05, 6), m.steelDark, [0, -0.12, 0], [Math.PI, 0, 0]));
  }
  hose(f, m.copper, [[0.05, 0, -0.03], [0.07, -0.1, -0.05], [0.04, -0.2, -0.04]], 0.01, 8);
  return p;
}
function P07(): THREE.Object3D { // Braço TENSOR (guincho)
  const m = M(); const p = part('P07');
  const u = sock(p, 'SOCKET_ARM_L_UPPER'); upperArm(u, m, m.orange, 0.075);
  u.add(mesh(rbox(0.04, 0.16, 0.16, 0.01), m.hazard, [0.07, -0.11, 0]));
  const f = sock(p, 'SOCKET_ARM_L_FORE');
  f.add(mesh(rbox(0.15, 0.22, 0.15, 0.03), m.orange, [0, -0.12, 0]));
  f.add(mesh(cyl(0.065, 0.065, 0.13, 16), m.steelDark, [0, -0.12, 0.06], [0, 0, Math.PI / 2], 'drum'));
  f.add(mesh(cyl(0.07, 0.07, 0.03, 16), m.cyan, [0.07, -0.12, 0.06], [0, 0, Math.PI / 2]));
  f.add(mesh(tor(0.05, 0.012, 6, 16), m.steel, [0, -0.12, 0.06], [0, Math.PI / 2, 0]));
  f.add(mesh(cyl(0.05, 0.035, 0.08, 12), m.steel, [0, -0.27, 0]));
  const hook = node('hook', [0, -0.33, 0], f);
  hook.add(mesh(tor(0.04, 0.012, 6, 14, Math.PI * 1.4), m.steelDark, [0, -0.04, 0], [0, 0, Math.PI * 0.8]));
  hook.add(mesh(cyl(0.008, 0.008, 0.06, 6), m.steelDark, [0, 0.0, 0]));
  rivets(f, m.steel, [-0.077, -0.03, 0.04], [-0.077, -0.21, 0.04], 4, 0.009);
  return p;
}
function P08(): THREE.Object3D { // Escudo de Porta
  const m = M(); const p = part('P08');
  const u = sock(p, 'SOCKET_ARM_L_UPPER'); upperArm(u, m, m.body);
  const f = sock(p, 'SOCKET_ARM_L_FORE');
  f.add(mesh(rbox(0.11, 0.22, 0.11, 0.025), m.dark, [0, -0.12, 0]));
  const sh = node('shield', [0.09, -0.14, 0], f);
  sh.add(mesh(rbox(0.04, 0.46, 0.34, 0.02), m.steel, [0, 0, 0]));
  sh.add(mesh(rbox(0.045, 0.06, 0.3, 0.01), m.hazard, [0, 0.14, 0]));
  sh.add(mesh(rbox(0.045, 0.1, 0.06, 0.01), m.glass, [0, 0.03, 0.08]));
  rivets(sh, m.steelDark, [0.025, -0.2, -0.15], [0.025, -0.2, 0.15], 6, 0.01);
  return p;
}
function P11(): THREE.Object3D { // Punho Rebitador (braço D)
  const m = M(); const p = part('P11');
  const u = sock(p, 'SOCKET_ARM_R_UPPER'); upperArm(u, m, m.body);
  u.add(mesh(rbox(0.02, 0.12, 0.1, 0.006), m.cyan, [-0.066, -0.12, 0]));
  const f = sock(p, 'SOCKET_ARM_R_FORE');
  f.add(mesh(rbox(0.13, 0.18, 0.13, 0.03), m.steelDark, [0, -0.1, 0]));
  f.add(mesh(cyl(0.025, 0.025, 0.16, 8), m.steel, [0.07, -0.1, 0.02]));
  f.add(mesh(cyl(0.03, 0.03, 0.05, 8), m.copper, [0.07, -0.02, 0.02]));
  const fist = node('fist', [0, -0.22, 0], f);
  fist.add(mesh(rbox(0.15, 0.12, 0.15, 0.035), m.body, [0, -0.04, 0]));
  fist.add(mesh(rbox(0.16, 0.03, 0.16, 0.01), m.hazard, [0, 0.03, 0]));
  for (let i = 0; i < 3; i++) fist.add(mesh(cyl(0.017, 0.017, 0.03, 8), m.steel, [-0.045 + i * 0.045, -0.105, 0.03]));
  return p;
}
function P12(): THREE.Object3D { // Martelo de Prensa
  const m = M(); const p = part('P12');
  const u = sock(p, 'SOCKET_ARM_R_UPPER'); upperArm(u, m, m.steelDark, 0.075);
  const f = sock(p, 'SOCKET_ARM_R_FORE');
  f.add(mesh(rbox(0.14, 0.2, 0.14, 0.03), m.steelDark, [0, -0.1, 0]));
  f.add(mesh(cyl(0.03, 0.03, 0.2, 10), m.steel, [0, -0.25, 0]));
  const hm = node('hammer', [0, -0.37, 0], f);
  hm.add(mesh(rbox(0.3, 0.17, 0.2, 0.03), m.rust, [0, 0, 0]));
  hm.add(mesh(rbox(0.06, 0.19, 0.22, 0.02), m.hazard, [0.12, 0, 0]));
  hm.add(mesh(rbox(0.06, 0.19, 0.22, 0.02), m.hazard, [-0.12, 0, 0]));
  hm.add(mesh(rbox(0.02, 0.1, 0.1, 0.005), m.amberGlow, [0, 0, 0.105]));
  hose(f, m.copper, [[-0.07, 0, 0], [-0.1, -0.15, 0.02], [-0.06, -0.3, 0]], 0.012, 8);
  return p;
}

// ---------------- Pernas ----------------
function legs(id: string, spring: boolean): THREE.Object3D {
  const m = M(); const p = part(id);
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    const t = sock(p, `SOCKET_LEG_${s}_THIGH`);
    t.add(mesh(rbox(0.12, 0.26, 0.13, 0.035), spring ? m.steelDark : m.body, [0, -0.17, 0]));
    if (spring) {
      t.add(mesh(rbox(0.03, 0.2, 0.03, 0.01), m.cyan, [0.065 * sx, -0.17, 0]));
    } else {
      t.add(mesh(rbox(0.13, 0.04, 0.14, 0.012), m.hazard, [0, -0.05, 0]));
    }
    const sh = sock(p, `SOCKET_LEG_${s}_SHIN`);
    sh.add(mesh(rbox(0.11, 0.24, 0.12, 0.03), spring ? m.body : m.dark, [0, -0.14, 0]));
    if (spring) {
      sh.add(mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 12), m.steel, [0, -0.06, -0.08], [Math.PI / 2, 0, 0]));
      sh.add(mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 12), m.steel, [0, -0.1, -0.08], [Math.PI / 2, 0, 0]));
      sh.add(mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 12), m.steel, [0, -0.14, -0.08], [Math.PI / 2, 0, 0]));
      sh.add(mesh(cyl(0.02, 0.02, 0.18, 8), m.steelDark, [0, -0.1, -0.08]));
    }
    // pé / bota
    sh.add(mesh(rbox(0.15, 0.08, 0.24, 0.03), spring ? m.steelDark : m.body2, [0, -0.32, 0.035]));
    sh.add(mesh(rbox(0.155, 0.025, 0.25, 0.01), m.rubber, [0, -0.36, 0.035]));
    if (!spring) sh.add(mesh(rbox(0.12, 0.03, 0.04, 0.01), m.hazard, [0, -0.3, 0.16]));
    else sh.add(mesh(rbox(0.1, 0.02, 0.04, 0.008), m.cyan, [0, -0.3, 0.16]));
  }
  return p;
}

// ---------------- Carcaças ----------------
function body(id: string, heavy: boolean): THREE.Object3D {
  const m = M(); const p = part(id);
  const t = sock(p, 'SOCKET_TORSO');
  const shell = heavy ? m.steel : m.body;
  t.add(mesh(rbox(heavy ? 0.54 : 0.48, 0.42, heavy ? 0.36 : 0.32, 0.08), shell, [0, 0.27, 0]));
  t.add(mesh(rbox(0.36, 0.14, 0.04, 0.03), m.dark, [0, 0.38, heavy ? 0.17 : 0.155]));
  // grade frontal e listras
  for (let i = 0; i < 4; i++) t.add(mesh(rbox(0.05, 0.012, 0.01, 0.004), m.joint, [-0.09 + i * 0.06, 0.4, heavy ? 0.192 : 0.177]));
  t.add(mesh(rbox(heavy ? 0.55 : 0.49, 0.045, heavy ? 0.37 : 0.33, 0.015), m.hazard, [0, 0.1, 0]));
  // mochila com aletas
  t.add(mesh(rbox(0.32, 0.3, 0.12, 0.03), m.body2, [0, 0.28, -0.2]));
  for (let i = 0; i < 4; i++) t.add(mesh(rbox(0.28, 0.018, 0.03, 0.006), m.joint, [0, 0.18 + i * 0.06, -0.27]));
  t.add(mesh(cyl(0.035, 0.035, 0.1, 10), m.steelDark, [0.12, 0.47, -0.2]));
  t.add(mesh(cyl(0.025, 0.025, 0.02, 10), m.cyan, [0.12, 0.525, -0.2]));
  t.add(mesh(tor(0.09, 0.022, 8, 18), m.joint, [0, 0.49, 0], [Math.PI / 2, 0, 0]));
  t.add(mesh(rbox(0.07, 0.02, 0.01, 0.004), m.cyan, [0.15, 0.28, heavy ? 0.181 : 0.161]));
  if (heavy) {
    // placas de trilho rebitadas
    for (const sx of [1, -1]) {
      t.add(mesh(rbox(0.06, 0.38, 0.3, 0.02), m.rust, [0.29 * sx, 0.27, 0]));
      rivets(t, m.steelDark, [0.32 * sx, 0.12, 0.12], [0.32 * sx, 0.42, 0.12], 5, 0.012);
      t.add(mesh(rbox(0.18, 0.1, 0.2, 0.03), m.rust, [0.3 * sx, 0.5, 0]));
    }
  } else {
    t.add(mesh(rbox(0.1, 0.06, 0.15, 0.025), m.body2, [0.27, 0.47, 0]));
    t.add(mesh(rbox(0.1, 0.06, 0.15, 0.025), m.body2, [-0.27, 0.47, 0]));
  }
  const h = sock(p, 'SOCKET_HIPS');
  h.add(mesh(rbox(0.34, 0.15, 0.24, 0.05), m.dark, [0, -0.02, 0]));
  h.add(mesh(rbox(0.36, 0.04, 0.26, 0.015), heavy ? m.rust : m.body2, [0, 0.05, 0]));
  return p;
}

// ---------------- Núcleos ----------------
function P27(): THREE.Object3D {
  const m = M(); const p = part('P27'); const c = sock(p, 'SOCKET_CORE');
  c.add(mesh(cyl(0.075, 0.075, 0.04, 20), m.steelDark, [0, 0, 0], [Math.PI / 2, 0, 0]));
  c.add(mesh(cyl(0.05, 0.05, 0.03, 20), m.cyan, [0, 0, 0.015], [Math.PI / 2, 0, 0], 'coreGlow'));
  c.add(mesh(tor(0.065, 0.01, 6, 24), m.copper, [0, 0, 0.022]));
  return p;
}

export const PART_BUILDERS: Record<string, () => THREE.Object3D> = {
  P01, P02, P03, P06, P07, P08, P11, P12,
  P17: () => legs('P17', false), P18: () => legs('P18', true),
  P23: () => body('P23', false), P24: () => body('P24', true), P27,
};

export function buildParts(): THREE.Object3D {
  const root = node('PARTS');
  for (const [id, fn] of Object.entries(PART_BUILDERS)) root.add(fn());
  return root;
}
