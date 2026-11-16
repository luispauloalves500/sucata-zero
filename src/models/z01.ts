// Z-01: rig de nós rígidos com sockets e clipes de animação (exportado para public/assets/robots/z01.glb)
import * as THREE from 'three';
import { PAL, mat, mesh, node, rbox, cyl, sph, clip, hose, type ModelAsset, type Key } from './kit';

export const Z_SOCKETS = [
  'SOCKET_HIPS', 'SOCKET_TORSO', 'SOCKET_CORE', 'SOCKET_HEAD',
  'SOCKET_ARM_L_UPPER', 'SOCKET_ARM_L_FORE', 'SOCKET_ARM_R_UPPER', 'SOCKET_ARM_R_FORE',
  'SOCKET_LEG_L_THIGH', 'SOCKET_LEG_L_SHIN', 'SOCKET_LEG_R_THIGH', 'SOCKET_LEG_R_SHIN',
] as const;

export function buildZ01Rig(): THREE.Object3D {
  const dark = mat('z_joint', PAL.zJoint, { rough: 0.45, metal: 0.7 });
  const darker = mat('z_dark', PAL.zDark, { rough: 0.6, metal: 0.5 });
  const cyan = mat('z_cyan', PAL.zCyan, { emissive: PAL.zCyan, ei: 2.2, rough: 0.3, metal: 0 });
  const copper = mat('z_copper', PAL.copper, { rough: 0.35, metal: 0.9 });

  const root = node('Z01');
  const hips = node('hips', [0, 0.74, 0], root);
  node('SOCKET_HIPS', [0, 0, 0], hips);
  hips.add(mesh(sph(0.085, 12, 8), dark, [0, 0, 0]));
  const torso = node('torso', [0, 0.06, 0], hips);
  node('SOCKET_TORSO', [0, 0, 0], torso);
  // coluna/espinha mecânica visível entre quadril e peito
  torso.add(mesh(cyl(0.06, 0.07, 0.14, 10), darker, [0, 0.05, 0]));
  const core = node('core', [0, 0.27, 0.165], torso);
  node('SOCKET_CORE', [0, 0, 0], core);
  const neck = node('neck', [0, 0.5, 0], torso);
  neck.add(mesh(cyl(0.045, 0.06, 0.1, 10), dark, [0, 0.03, 0]));
  hose(neck, darker, [[0.05, -0.04, -0.04], [0.06, 0.04, -0.07], [0.03, 0.1, -0.05]], 0.012, 8);
  const head = node('head', [0, 0.07, 0], neck);
  node('SOCKET_HEAD', [0, 0, 0], head);

  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    const sh = node(`shoulder${side}`, [0.29 * sx, 0.4, 0], torso);
    sh.add(mesh(sph(0.075, 12, 8), dark, [0, 0, 0]));
    node(`SOCKET_ARM_${side}_UPPER`, [0, 0, 0], sh);
    const el = node(`elbow${side}`, [0, -0.27, 0], sh);
    node(`SOCKET_ARM_${side}_FORE`, [0, 0, 0], el);
    const th = node(`thigh${side}`, [0.12 * sx, -0.03, 0], hips);
    th.add(mesh(sph(0.075, 12, 8), dark, [0, 0, 0]));
    node(`SOCKET_LEG_${side}_THIGH`, [0, 0, 0], th);
    const kn = node(`knee${side}`, [0, -0.34, 0], th);
    kn.add(mesh(sph(0.06, 10, 8), dark, [0, 0, 0]));
    node(`SOCKET_LEG_${side}_SHIN`, [0, 0, 0], kn);
  }
  // Toco do braço direito arrancado (visível enquanto não houver braço direito)
  const stub = node('STUB_R', [0, 0, 0], root.getObjectByName('shoulderR')!);
  stub.add(mesh(cyl(0.06, 0.05, 0.12, 10), mat('z_body2', PAL.zBody2, { rough: 0.6, metal: 0.25 }), [0, -0.07, 0]));
  stub.add(mesh(cyl(0.035, 0.03, 0.06, 8), darker, [0, -0.15, 0]));
  hose(stub, copper, [[0.01, -0.13, 0], [0.04, -0.2, 0.02], [0.02, -0.25, 0.05]], 0.008, 6);
  hose(stub, mat('z_wire_r', 0xc0392b, { rough: 0.5, metal: 0.1 }), [[-0.01, -0.13, 0], [-0.03, -0.19, -0.02], [-0.05, -0.22, 0.01]], 0.008, 6);
  stub.add(mesh(sph(0.012, 6, 4), cyan, [0.02, -0.25, 0.05], [0, 0, 0], 'stub_spark'));
  return root;
}

const k = (t: number, r: Key['r'], p?: Key['p']): Key => ({ t, r, p });

export function buildZ01Clips(root: THREE.Object3D): THREE.AnimationClip[] {
  const C: THREE.AnimationClip[] = [];
  // repouso: braços levemente abertos
  const rest = {
    shoulderL: [0, 0, 9], shoulderR: [0, 0, -9], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0],
    thighL: [0, 0, 0], thighR: [0, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], torso: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], hips: [0, 0, 0],
  } as Record<string, [number, number, number]>;
  const P = (o: Record<string, [number, number, number]>) => ({ ...rest, ...o });

  C.push(clip(root, 'idle', 2.4, [
    k(0, P({}), { hips: [0, 0, 0], torso: [0, 0, 0] }),
    k(1.2, P({ torso: [2, 0, 0], shoulderL: [3, 0, 11], shoulderR: [3, 0, -11], neck: [-2, 4, 0], elbowL: [-16, 0, 0], elbowR: [-16, 0, 0], thighL: [-3, 0, 0], thighR: [-3, 0, 0], kneeL: [6, 0, 0], kneeR: [6, 0, 0] }), { hips: [0, -0.012, 0], torso: [0, 0.006, 0] }),
  ]));
  C.push(clip(root, 'idle2', 3.2, [
    k(0, P({})),
    k(0.8, P({ neck: [8, 35, 0], head: [0, 10, 6], torso: [0, 10, 0] })),
    k(1.6, P({ neck: [8, -30, 0], head: [0, -10, -6], torso: [0, -8, 0] })),
    k(2.4, P({ neck: [-12, 0, 0], shoulderL: [-20, 0, 14] })),
    k(3.2, P({})),
  ], false));
  const walkT = 0.92;
  C.push(clip(root, 'walk', walkT, [
    k(0, P({ thighL: [-26, 0, 0], kneeL: [8, 0, 0], thighR: [22, 0, 0], kneeR: [18, 0, 0], shoulderL: [18, 0, 9], shoulderR: [-18, 0, -9], torso: [4, -6, 0], hips: [0, 6, 0] }), { hips: [0, 0, 0] }),
    k(walkT * 0.25, P({ thighL: [-6, 0, 0], kneeL: [4, 0, 0], thighR: [-2, 0, 0], kneeR: [48, 0, 0], shoulderL: [2, 0, 9], shoulderR: [-2, 0, -9], torso: [4, 0, 0] }), { hips: [0, 0.03, 0] }),
    k(walkT * 0.5, P({ thighR: [-26, 0, 0], kneeR: [8, 0, 0], thighL: [22, 0, 0], kneeL: [18, 0, 0], shoulderR: [18, 0, -9], shoulderL: [-18, 0, 9], torso: [4, 6, 0], hips: [0, -6, 0] }), { hips: [0, 0, 0] }),
    k(walkT * 0.75, P({ thighR: [-6, 0, 0], kneeR: [4, 0, 0], thighL: [-2, 0, 0], kneeL: [48, 0, 0], shoulderL: [-2, 0, 9], shoulderR: [2, 0, -9], torso: [4, 0, 0] }), { hips: [0, 0.03, 0] }),
  ]));
  const runT = 0.58;
  C.push(clip(root, 'run', runT, [
    k(0, P({ thighL: [-50, 0, 0], kneeL: [25, 0, 0], thighR: [35, 0, 0], kneeR: [55, 0, 0], shoulderL: [40, 0, 14], shoulderR: [-50, 0, -14], elbowL: [-70, 0, 0], elbowR: [-80, 0, 0], torso: [16, -10, 0], neck: [-10, 8, 0], hips: [0, 10, 0] }), { hips: [0, -0.02, 0] }),
    k(runT * 0.25, P({ thighL: [-20, 0, 0], kneeL: [10, 0, 0], thighR: [-10, 0, 0], kneeR: [100, 0, 0], shoulderL: [5, 0, 14], shoulderR: [-10, 0, -14], elbowL: [-75, 0, 0], elbowR: [-75, 0, 0], torso: [16, 0, 0], neck: [-10, 0, 0] }), { hips: [0, 0.06, 0] }),
    k(runT * 0.5, P({ thighR: [-50, 0, 0], kneeR: [25, 0, 0], thighL: [35, 0, 0], kneeL: [55, 0, 0], shoulderR: [40, 0, -14], shoulderL: [-50, 0, 14], elbowL: [-80, 0, 0], elbowR: [-70, 0, 0], torso: [16, 10, 0], neck: [-10, -8, 0], hips: [0, -10, 0] }), { hips: [0, -0.02, 0] }),
    k(runT * 0.75, P({ thighR: [-20, 0, 0], kneeR: [10, 0, 0], thighL: [-10, 0, 0], kneeL: [100, 0, 0], shoulderL: [-10, 0, 14], shoulderR: [5, 0, -14], elbowL: [-75, 0, 0], elbowR: [-75, 0, 0], torso: [16, 0, 0], neck: [-10, 0, 0] }), { hips: [0, 0.06, 0] }),
  ]));
  C.push(clip(root, 'jump', 0.35, [
    k(0, P({ thighL: [-30, 0, 0], kneeL: [50, 0, 0], thighR: [-30, 0, 0], kneeR: [50, 0, 0], torso: [18, 0, 0], shoulderL: [30, 0, 15], shoulderR: [30, 0, -15] }), { hips: [0, -0.1, 0] }),
    k(0.15, P({ thighL: [-45, 0, 0], kneeL: [20, 0, 0], thighR: [10, 0, 0], kneeR: [30, 0, 0], torso: [-4, 0, 0], shoulderL: [-150, 0, 20], shoulderR: [-140, 0, -20], elbowL: [-20, 0, 0], elbowR: [-20, 0, 0] }), { hips: [0, 0.02, 0] }),
    k(0.35, P({ thighL: [-55, 0, 0], kneeL: [70, 0, 0], thighR: [-20, 0, 0], kneeR: [60, 0, 0], torso: [6, 0, 0], shoulderL: [-60, 0, 40], shoulderR: [-60, 0, -40], elbowL: [-40, 0, 0], elbowR: [-40, 0, 0] }), { hips: [0, 0, 0] }),
  ], false));
  C.push(clip(root, 'fall', 0.8, [
    k(0, P({ thighL: [-30, 0, 0], kneeL: [50, 0, 0], thighR: [-10, 0, 0], kneeR: [30, 0, 0], shoulderL: [-30, 0, 55], shoulderR: [-30, 0, -55], elbowL: [-30, 0, 0], elbowR: [-30, 0, 0], torso: [6, 0, 0] })),
    k(0.4, P({ thighL: [-20, 0, 0], kneeL: [40, 0, 0], thighR: [-25, 0, 0], kneeR: [45, 0, 0], shoulderL: [-20, 0, 65], shoulderR: [-20, 0, -65], elbowL: [-20, 0, 0], elbowR: [-20, 0, 0], torso: [4, 0, 0] })),
  ]));
  C.push(clip(root, 'land', 0.3, [
    k(0, P({ thighL: [-50, 0, 0], kneeL: [90, 0, 0], thighR: [-50, 0, 0], kneeR: [90, 0, 0], torso: [28, 0, 0], shoulderL: [-20, 0, 35], shoulderR: [-20, 0, -35] }), { hips: [0, -0.2, 0] }),
    k(0.3, P({}), { hips: [0, 0, 0] }),
  ], false));
  C.push(clip(root, 'dodge', 0.45, [
    k(0, P({ torso: [30, 0, 0], thighL: [-50, 0, 0], kneeL: [60, 0, 0], thighR: [20, 0, 0], kneeR: [40, 0, 0], shoulderL: [50, 0, 30], shoulderR: [50, 0, -30] }), { hips: [0, -0.18, 0] }),
    k(0.2, P({ torso: [40, 0, 0], thighL: [-70, 0, 0], kneeL: [90, 0, 0], thighR: [-10, 0, 0], kneeR: [100, 0, 0], shoulderL: [60, 0, 20], shoulderR: [60, 0, -20], neck: [-20, 0, 0] }), { hips: [0, -0.28, 0] }),
    k(0.45, P({ torso: [8, 0, 0] }), { hips: [0, 0, 0] }),
  ], false));
  C.push(clip(root, 'block', 0.5, [
    k(0, P({ shoulderL: [-75, -10, -30], elbowL: [-80, 0, 0], shoulderR: [-30, 0, -20], elbowR: [-70, 0, 0], torso: [8, 15, 0], thighL: [-20, 0, 0], kneeL: [30, 0, 0], thighR: [15, 0, 0], kneeR: [25, 0, 0] }), { hips: [0, -0.05, 0] }),
    k(0.25, P({ shoulderL: [-78, -10, -30], elbowL: [-82, 0, 0], shoulderR: [-30, 0, -20], elbowR: [-72, 0, 0], torso: [9, 15, 0], thighL: [-20, 0, 0], kneeL: [30, 0, 0], thighR: [15, 0, 0], kneeR: [25, 0, 0] }), { hips: [0, -0.06, 0] }),
  ]));
  C.push(clip(root, 'parry', 0.35, [
    k(0, P({ shoulderL: [-75, -10, -30], elbowL: [-80, 0, 0], torso: [8, 15, 0] })),
    k(0.08, P({ shoulderL: [-95, 30, 30], elbowL: [-30, 0, 0], torso: [4, -25, 0] })),
    k(0.35, P({ shoulderL: [-40, 0, 20], elbowL: [-40, 0, 0], torso: [2, -5, 0] })),
  ], false));
  // Golpes leves (combo 3) — braço direito
  C.push(clip(root, 'atk1', 0.38, [
    k(0, P({ shoulderR: [-30, 0, -20], elbowR: [-110, 0, 0], torso: [6, 25, 0], thighL: [-25, 0, 0], kneeL: [25, 0, 0], thighR: [15, 0, 0], kneeR: [20, 0, 0] })),
    k(0.12, P({ shoulderR: [-88, 0, 0], elbowR: [-6, 0, 0], torso: [10, -22, 0], shoulderL: [10, 0, 25], thighL: [-30, 0, 0], kneeL: [30, 0, 0], thighR: [20, 0, 0], kneeR: [15, 0, 0] }), { hips: [0, -0.04, 0.05] }),
    k(0.38, P({ shoulderR: [-40, 0, -15], elbowR: [-80, 0, 0], torso: [5, -5, 0] }), { hips: [0, 0, 0] }),
  ], false));
  C.push(clip(root, 'atk2', 0.42, [
    k(0, P({ shoulderL: [-20, 0, 70], elbowL: [-50, 0, 0], torso: [6, 30, 0] })),
    k(0.15, P({ shoulderL: [-85, -60, -10], elbowL: [-25, 0, 0], torso: [8, -35, 0], shoulderR: [-30, 0, -30], elbowR: [-60, 0, 0], thighL: [-15, 0, 0], kneeL: [20, 0, 0] }), { hips: [0, -0.04, 0.04] }),
    k(0.42, P({ shoulderL: [-30, 0, 15], elbowL: [-40, 0, 0], torso: [4, -6, 0] }), { hips: [0, 0, 0] }),
  ], false));
  C.push(clip(root, 'atk3', 0.55, [
    k(0, P({ shoulderR: [-170, 0, -10], elbowR: [-60, 0, 0], torso: [-14, 10, 0], thighL: [-15, 0, 0], kneeL: [20, 0, 0] }), { hips: [0, 0.02, 0] }),
    k(0.2, P({ shoulderR: [-60, 0, 0], elbowR: [-10, 0, 0], torso: [32, 0, 0], neck: [-18, 0, 0], thighL: [-45, 0, 0], kneeL: [60, 0, 0], thighR: [20, 0, 0], kneeR: [40, 0, 0], shoulderL: [20, 0, 35] }), { hips: [0, -0.14, 0.08] }),
    k(0.55, P({ shoulderR: [-30, 0, -15], elbowR: [-40, 0, 0], torso: [6, 0, 0] }), { hips: [0, 0, 0] }),
  ], false));
  // Garra (sem braço direito): varredura com a esquerda
  C.push(clip(root, 'claw', 0.42, [
    k(0, P({ shoulderL: [-30, 0, 60], elbowL: [-60, 0, 0], torso: [4, 28, 0] })),
    k(0.14, P({ shoulderL: [-80, -50, -5], elbowL: [-20, 0, 0], torso: [8, -30, 0], thighL: [-20, 0, 0], kneeL: [25, 0, 0] }), { hips: [0, -0.04, 0.04] }),
    k(0.42, P({ shoulderL: [-25, 0, 15], elbowL: [-35, 0, 0], torso: [3, -4, 0] }), { hips: [0, 0, 0] }),
  ], false));
  C.push(clip(root, 'heavy', 0.95, [
    k(0, P({})),
    k(0.4, P({ shoulderR: [-185, 0, -20], elbowR: [-70, 0, 0], shoulderL: [-30, 0, 45], torso: [-18, 25, 0], neck: [10, -10, 0], thighL: [-20, 0, 0], kneeL: [25, 0, 0], thighR: [25, 0, 0], kneeR: [20, 0, 0] }), { hips: [0, 0.03, -0.04] }),
    k(0.52, P({ shoulderR: [-55, 0, 0], elbowR: [-5, 0, 0], shoulderL: [10, 0, 40], torso: [42, -8, 0], neck: [-25, 0, 0], thighL: [-60, 0, 0], kneeL: [80, 0, 0], thighR: [30, 0, 0], kneeR: [55, 0, 0] }), { hips: [0, -0.2, 0.12] }),
    k(0.72, P({ shoulderR: [-50, 0, 0], elbowR: [-10, 0, 0], torso: [36, -6, 0], thighL: [-55, 0, 0], kneeL: [75, 0, 0], thighR: [28, 0, 0], kneeR: [50, 0, 0] }), { hips: [0, -0.18, 0.1] }),
    k(0.95, P({}), { hips: [0, 0, 0] }),
  ], false));
  C.push(clip(root, 'hit', 0.35, [
    k(0, P({})),
    k(0.08, P({ torso: [-22, 8, 0], neck: [-20, 0, 0], shoulderL: [20, 0, 40], shoulderR: [20, 0, -40], thighL: [-15, 0, 0], kneeL: [25, 0, 0] }), { hips: [0, -0.03, -0.06] }),
    k(0.35, P({}), { hips: [0, 0, 0] }),
  ], false));
  C.push(clip(root, 'death', 1.3, [
    k(0, P({})),
    k(0.25, P({ torso: [-25, 0, 0], neck: [-25, 0, 0], shoulderL: [30, 0, 50], shoulderR: [30, 0, -50] }), { hips: [0, -0.05, 0] }),
    k(0.7, P({ torso: [60, 0, 10], neck: [30, 20, 0], thighL: [-90, 0, 0], kneeL: [120, 0, 0], thighR: [-80, 0, 0], kneeR: [130, 0, 0], shoulderL: [10, 0, 20], shoulderR: [-10, 0, -10], elbowL: [-5, 0, 0], elbowR: [-5, 0, 0] }), { hips: [0, -0.48, 0] }),
    k(1.3, P({ torso: [72, 0, 14], neck: [40, 25, 0], head: [0, 0, 15], thighL: [-95, 0, 0], kneeL: [130, 0, 0], thighR: [-85, 0, 0], kneeR: [140, 0, 0], shoulderL: [20, 0, 10], shoulderR: [-15, 0, -5], elbowL: [0, 0, 0], elbowR: [0, 0, 0] }), { hips: [0, -0.52, 0] }),
  ], false));
  C.push(clip(root, 'getup', 1.0, [
    k(0, P({ torso: [72, 0, 14], neck: [40, 25, 0], thighL: [-95, 0, 0], kneeL: [130, 0, 0], thighR: [-85, 0, 0], kneeR: [140, 0, 0] }), { hips: [0, -0.52, 0] }),
    k(0.5, P({ torso: [40, 0, 0], neck: [-10, 0, 0], thighL: [-70, 0, 0], kneeL: [110, 0, 0], thighR: [-40, 0, 0], kneeR: [90, 0, 0], shoulderL: [20, 0, 30], shoulderR: [20, 0, -30] }), { hips: [0, -0.3, 0] }),
    k(1.0, P({}), { hips: [0, 0, 0] }),
  ], false));
  C.push(clip(root, 'interact', 0.9, [
    k(0, P({})),
    k(0.3, P({ shoulderL: [-75, 0, 5], elbowL: [-30, 0, 0], torso: [14, 10, 0], neck: [12, 0, 0] })),
    k(0.45, P({ shoulderL: [-80, 0, 0], elbowL: [-20, 0, 0], torso: [16, 10, 0], neck: [14, 0, 0] })),
    k(0.6, P({ shoulderL: [-72, 0, 5], elbowL: [-35, 0, 0], torso: [14, 10, 0], neck: [12, 0, 0] })),
    k(0.9, P({})),
  ], false));
  C.push(clip(root, 'victory', 1.4, [
    k(0, P({})),
    k(0.3, P({ shoulderR: [-170, 0, -15], elbowR: [-30, 0, 0], shoulderL: [0, 0, 35], torso: [-8, 0, 0], neck: [-15, 0, 0] }), { hips: [0, 0.03, 0] }),
    k(0.6, P({ shoulderR: [-160, 0, -25], elbowR: [-60, 0, 0], shoulderL: [0, 0, 30], torso: [-6, 0, 0], neck: [-12, 0, 0] })),
    k(0.9, P({ shoulderR: [-172, 0, -15], elbowR: [-25, 0, 0], shoulderL: [0, 0, 35], torso: [-8, 0, 0], neck: [-15, 0, 0] }), { hips: [0, 0.03, 0] }),
    k(1.4, P({})),
  ], false));
  C.push(clip(root, 'pull', 0.8, [
    k(0, P({ shoulderL: [-85, 0, 0], elbowL: [-5, 0, 0], shoulderR: [-60, 0, -10], elbowR: [-40, 0, 0], torso: [-18, 0, 0], thighL: [-35, 0, 0], kneeL: [30, 0, 0], thighR: [20, 0, 0], kneeR: [15, 0, 0] }), { hips: [0, -0.08, -0.06] }),
    k(0.4, P({ shoulderL: [-75, 0, 0], elbowL: [-35, 0, 0], shoulderR: [-55, 0, -10], elbowR: [-60, 0, 0], torso: [-26, 0, 0], thighL: [-40, 0, 0], kneeL: [40, 0, 0], thighR: [25, 0, 0], kneeR: [20, 0, 0] }), { hips: [0, -0.1, -0.1] }),
  ]));
  C.push(clip(root, 'equip', 1.2, [
    k(0, P({})),
    k(0.3, P({ shoulderL: [-40, 0, 60], shoulderR: [-40, 0, -60], elbowL: [-60, 0, 0], elbowR: [-60, 0, 0], torso: [-10, 0, 0], neck: [-25, 0, 0] }), { hips: [0, 0.04, 0] }),
    k(0.7, P({ shoulderL: [-10, 0, 70], shoulderR: [-10, 0, -70], elbowL: [-10, 0, 0], elbowR: [-10, 0, 0], torso: [-14, 0, 0], neck: [-30, 0, 0] }), { hips: [0, 0.06, 0] }),
    k(1.2, P({})),
  ], false));
  return C;
}

export function buildZ01(): ModelAsset {
  const scene = buildZ01Rig();
  return { scene, clips: buildZ01Clips(scene) };
}
