// Física 3D com Rapier (pacote compat, WASM embutido). Corpos cinemáticos para personagens.
import RAPIER from '@dimforge/rapier3d-compat';

export type R = typeof RAPIER;
export class Physics {
  R!: R;
  world!: RAPIER.World;
  staticIds = new Set<number>();
  movingPlatforms = new Map<number, { dx: number; dy: number; dz: number }>();
  async init() {
    await RAPIER.init();
    this.R = RAPIER;
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = 1 / 60;
  }
  addBox(x: number, y: number, z: number, hx: number, hy: number, hz: number, rotY = 0, friction = 0.6): RAPIER.Collider {
    const d = this.R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setFriction(friction);
    if (rotY) d.setRotation({ x: 0, y: Math.sin(rotY / 2), z: 0, w: Math.cos(rotY / 2) });
    const c = this.world.createCollider(d);
    this.staticIds.add(c.handle);
    return c;
  }
  /** caixa inclinada (rampa) em torno do eixo X local após rotY */
  addRamp(x: number, y: number, z: number, hx: number, hy: number, hz: number, rotY: number, pitch: number): RAPIER.Collider {
    const q1 = { x: Math.sin(pitch / 2), y: 0, z: 0, w: Math.cos(pitch / 2) };
    const cy = Math.cos(rotY / 2), sy = Math.sin(rotY / 2);
    // q = qy * qx
    const q = { x: cy * q1.x, y: sy * q1.w, z: -sy * q1.x, w: cy * q1.w };
    const c = this.world.createCollider(this.R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setRotation(q));
    this.staticIds.add(c.handle);
    return c;
  }
  addCylinder(x: number, y: number, z: number, hh: number, r: number): RAPIER.Collider {
    const c = this.world.createCollider(this.R.ColliderDesc.cylinder(hh, r).setTranslation(x, y, z));
    this.staticIds.add(c.handle);
    return c;
  }
  kinematicBox(x: number, y: number, z: number, hx: number, hy: number, hz: number) {
    const body = this.world.createRigidBody(this.R.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z));
    const col = this.world.createCollider(this.R.ColliderDesc.cuboid(hx, hy, hz), body);
    this.staticIds.add(col.handle);
    return { body, col };
  }
  remove(c: RAPIER.Collider) { this.staticIds.delete(c.handle); this.world.removeCollider(c, false); }
  /** raio contra o cenário estático (exclui personagens) */
  rayStatic(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, max: number): number | null {
    const ray = new this.R.Ray({ x: ox, y: oy, z: oz }, { x: dx, y: dy, z: dz });
    const hit = this.world.castRay(ray, max, true, undefined, undefined, undefined, undefined, (c) => this.staticIds.has(c.handle));
    return hit ? hit.timeOfImpact : null;
  }
  sphereCastStatic(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, max: number, radius: number): number | null {
    const shape = new this.R.Ball(radius);
    const hit = this.world.castShape({ x: ox, y: oy, z: oz }, { x: 0, y: 0, z: 0, w: 1 }, { x: dx, y: dy, z: dz }, shape, 0, max, true, undefined, undefined, undefined, undefined, (c) => this.staticIds.has(c.handle));
    return hit ? hit.time_of_impact : null;
  }
  lineOfSight(ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-4) return true;
    const t = this.rayStatic(ax, ay, az, dx / len, dy / len, dz / len, len);
    return t === null || t >= len - 0.05;
  }
  step() { this.world.step(); }
}
