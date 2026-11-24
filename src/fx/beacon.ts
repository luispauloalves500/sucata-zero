// Feixes de luz verticais que indicam objetivos no mundo (visíveis de longe, somem de perto).
import * as THREE from 'three';

const VS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const FS = `uniform vec3 color; uniform float opacity; uniform float time; varying vec2 vUv;
void main(){
  float edge = pow(sin(vUv.x*3.14159), 2.0);
  float fall = (1.0 - vUv.y); fall *= fall;
  float bands = 0.75 + 0.25*sin(vUv.y*40.0 - time*3.0);
  float a = edge * fall * bands * opacity;
  gl_FragColor = vec4(color * (1.2 + fall), a);
}`;
const geo = new THREE.CylinderGeometry(0.42, 0.42, 1, 16, 1, true).translate(0, 0.5, 0);

export class Beacon {
  mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  private cur = 0;
  constructor(scene: THREE.Scene, color: number, public height = 16) {
    this.mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: 0 }, time: { value: 0 } } });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.scale.set(1, height, 1);
    this.mesh.renderOrder = 4; this.mesh.frustumCulled = false; this.mesh.visible = false;
    scene.add(this.mesh);
  }
  /** pos = alvo (ou null para esconder); dist = distância do jogador */
  update(pos: THREE.Vector3 | null, dist: number, dt: number, time: number) {
    const want = pos ? THREE.MathUtils.smoothstep(dist, 6, 22) * 0.55 : 0;
    this.cur += (want - this.cur) * Math.min(1, dt * 4);
    if (pos) this.mesh.position.set(pos.x, Math.max(0, pos.y - 0.2), pos.z);
    this.mat.uniforms.opacity.value = this.cur;
    this.mat.uniforms.time.value = time;
    this.mesh.visible = this.cur > 0.01;
  }
}
