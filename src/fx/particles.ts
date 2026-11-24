// Partículas com pool (faíscas, poeira, fumaça, detritos) + decalques de telegráfico.
import * as THREE from 'three';

const MAX = 900;
export class Particles {
  private geo = new THREE.BufferGeometry();
  private pos = new Float32Array(MAX * 3);
  private col = new Float32Array(MAX * 3);
  private size = new Float32Array(MAX);
  private alpha = new Float32Array(MAX);
  private vel = new Float32Array(MAX * 3);
  private life = new Float32Array(MAX);
  private maxLife = new Float32Array(MAX);
  private drag = new Float32Array(MAX);
  private grav = new Float32Array(MAX);
  private grow = new Float32Array(MAX);
  private baseSize = new Float32Array(MAX);
  private head = 0;
  points: THREE.Points;
  density = 1;
  constructor(scene: THREE.Scene) {
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      uniforms: { scale: { value: 600 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale;
        void main(){ vC=color; vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*scale/max(0.5,-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 d=gl_PointCoord-0.5; float r=length(d); if(r>0.5) discard; float a=smoothstep(0.5,0.15,r)*vA; gl_FragColor=vec4(vC,a); }`,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    for (let i = 0; i < MAX; i++) this.pos[i * 3 + 1] = -999;
  }
  setScale(h: number) { (this.points.material as THREE.ShaderMaterial).uniforms.scale.value = h * 0.9; }
  spawn(p: { x: number; y: number; z: number }, v: { x: number; y: number; z: number }, color: number, size: number, life: number, opts: { drag?: number; grav?: number; grow?: number; glow?: number } = {}) {
    const i = this.head; this.head = (this.head + 1) % MAX;
    this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
    this.vel[i * 3] = v.x; this.vel[i * 3 + 1] = v.y; this.vel[i * 3 + 2] = v.z;
    const c = new THREE.Color(color); const gl = opts.glow ?? 1;
    this.col[i * 3] = c.r * gl; this.col[i * 3 + 1] = c.g * gl; this.col[i * 3 + 2] = c.b * gl;
    this.life[i] = life; this.maxLife[i] = life; this.baseSize[i] = size; this.size[i] = size;
    this.drag[i] = opts.drag ?? 1.5; this.grav[i] = opts.grav ?? 0; this.grow[i] = opts.grow ?? 0; this.alpha[i] = 1;
  }
  burst(kind: 'sparks' | 'dust' | 'smoke' | 'hit' | 'heavy' | 'scrap' | 'electric' | 'debris' | 'weld' | 'acidless', p: { x: number; y: number; z: number }, n = 10, dir?: THREE.Vector3) {
    const count = Math.max(1, Math.round(n * this.density));
    const r = Math.random;
    // clarão de impacto (1 partícula grande e curtíssima — some com o bloom)
    if (kind === 'hit' || kind === 'heavy') this.spawn(p, { x: 0, y: 0, z: 0 }, 0xfff4d8, kind === 'heavy' ? 0.9 : 0.5, kind === 'heavy' ? 0.12 : 0.08, { drag: 0, glow: 4, grow: 0.6 });
    for (let k = 0; k < count; k++) {
      switch (kind) {
        case 'sparks': case 'weld':
          this.spawn(p, { x: (r() - 0.5) * 7 + (dir?.x ?? 0) * 3, y: r() * 5 + 1, z: (r() - 0.5) * 7 + (dir?.z ?? 0) * 3 }, r() > 0.4 ? 0xffd27a : 0xff8a2a, 0.05 + r() * 0.05, 0.3 + r() * 0.4, { grav: 14, drag: 1, glow: 3.5 }); break;
        case 'hit':
          this.spawn(p, { x: (r() - 0.5) * 6, y: r() * 4, z: (r() - 0.5) * 6 }, r() > 0.5 ? 0xfff0c0 : 0x7ff6ff, 0.06 + r() * 0.06, 0.2 + r() * 0.25, { grav: 8, drag: 2, glow: 3 }); break;
        case 'heavy':
          this.spawn(p, { x: (r() - 0.5) * 10, y: r() * 6 + 1, z: (r() - 0.5) * 10 }, r() > 0.5 ? 0xffc060 : 0xffffff, 0.08 + r() * 0.08, 0.35 + r() * 0.3, { grav: 12, drag: 1.5, glow: 3 }); break;
        case 'dust':
          this.spawn({ x: p.x + (r() - 0.5) * 0.6, y: p.y + 0.1, z: p.z + (r() - 0.5) * 0.6 }, { x: (r() - 0.5) * 2, y: r() * 0.8, z: (r() - 0.5) * 2 }, 0xb39a7a, 0.25 + r() * 0.25, 0.5 + r() * 0.5, { drag: 2.5, grow: 1.1 }); break;
        case 'smoke':
          this.spawn({ x: p.x + (r() - 0.5) * 0.5, y: p.y, z: p.z + (r() - 0.5) * 0.5 }, { x: (r() - 0.5) * 0.6, y: 1 + r() * 1.2, z: (r() - 0.5) * 0.6 }, r() > 0.5 ? 0x3a3530 : 0x56504a, 0.5 + r() * 0.5, 1.5 + r() * 1.2, { drag: 0.6, grow: 1.4 }); break;
        case 'scrap':
          this.spawn(p, { x: (r() - 0.5) * 3, y: 2 + r() * 3, z: (r() - 0.5) * 3 }, 0x39f0ff, 0.07, 0.6, { grav: 9, drag: 1, glow: 2.5 }); break;
        case 'electric':
          this.spawn({ x: p.x + (r() - 0.5) * 0.8, y: p.y + (r() - 0.5) * 0.8, z: p.z + (r() - 0.5) * 0.8 }, { x: (r() - 0.5) * 3, y: (r() - 0.5) * 3, z: (r() - 0.5) * 3 }, r() > 0.5 ? 0xa86bff : 0xd8c8ff, 0.06, 0.25, { drag: 4, glow: 3 }); break;
        case 'debris':
          this.spawn(p, { x: (r() - 0.5) * 9, y: 3 + r() * 5, z: (r() - 0.5) * 9 }, r() > 0.5 ? 0x7d4528 : 0x4a4f55, 0.12 + r() * 0.12, 0.9 + r() * 0.5, { grav: 16, drag: 0.6 }); break;
        default: break;
      }
    }
  }
  update(dt: number) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; this.alpha[i] = 0; continue; }
      const d = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= d; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.grav[i] * dt; this.vel[i * 3 + 2] *= d;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.02 && this.grav[i] > 0) { this.pos[i * 3 + 1] = 0.02; this.vel[i * 3 + 1] *= -0.3; this.vel[i * 3] *= 0.6; this.vel[i * 3 + 2] *= 0.6; }
      const t = this.life[i] / this.maxLife[i];
      this.alpha[i] = Math.min(1, t * 2.5);
      this.size[i] = this.baseSize[i] * (1 + this.grow[i] * (1 - t));
    }
    for (const k of ['position', 'color', 'size', 'alpha']) (this.geo.attributes[k] as THREE.BufferAttribute).needsUpdate = true;
  }
}

/** Decalques no chão para ataques anunciados (círculo/retângulo/anel), pool simples. */
export class Telegraphs {
  private pool: THREE.Mesh[] = [];
  private active: { m: THREE.Mesh; t: number; dur: number; follow?: () => THREE.Vector3 | null }[] = [];
  private circleGeo = new THREE.CircleGeometry(1, 40);
  private ringGeo = new THREE.RingGeometry(0.86, 1, 48);
  private rectGeo = new THREE.PlaneGeometry(1, 1);
  constructor(private scene: THREE.Scene) {}
  private get(geo: THREE.BufferGeometry, color: number): THREE.Mesh {
    let m = this.pool.pop();
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    if (!m) { m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; }
    else { (m.material as THREE.Material).dispose(); m.material = mat; m.geometry = geo; }
    this.scene.add(m);
    return m;
  }
  circle(x: number, z: number, r: number, dur: number, color = 0xff3b2f, ring = false) {
    const m = this.get(ring ? this.ringGeo : this.circleGeo, color);
    m.position.set(x, 0.06, z); m.scale.set(r, r, 1); m.rotation.set(-Math.PI / 2, 0, 0);
    this.active.push({ m, t: 0, dur });
  }
  rect(x: number, z: number, w: number, len: number, rotY: number, dur: number, color = 0xff3b2f) {
    const m = this.get(this.rectGeo, color);
    m.position.set(x, 0.06, z); m.scale.set(w, len, 1); m.rotation.set(-Math.PI / 2, 0, rotY);
    this.active.push({ m, t: 0, dur });
  }
  update(dt: number) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const a = this.active[i];
      a.t += dt;
      const k = a.t / a.dur;
      (a.m.material as THREE.MeshBasicMaterial).opacity = 0.18 + 0.32 * Math.abs(Math.sin(a.t * 10)) * (0.4 + k * 0.6);
      if (k >= 1) { this.scene.remove(a.m); this.pool.push(a.m); this.active.splice(i, 1); }
    }
  }
  clear() { for (const a of this.active) { this.scene.remove(a.m); this.pool.push(a.m); } this.active.length = 0; }
}
