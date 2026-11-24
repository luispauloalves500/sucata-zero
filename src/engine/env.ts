// Environment map procedural (céu poeirento + sol + chão quente) para reflexos e luz ambiente dos metais.
import * as THREE from 'three';

export function makeEnvironment(r: THREE.WebGLRenderer, skyTex: THREE.Texture): THREE.Texture {
  const s = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide }));
  s.add(sky);
  // chão quente (meia esfera inferior)
  const ground = new THREE.Mesh(new THREE.SphereGeometry(49, 32, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5a4330, side: THREE.BackSide }));
  s.add(ground);
  // sol e halo
  const sun = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe2b0).multiplyScalar(14) }));
  sun.position.set(-24, 30, 32); s.add(sun);
  // painéis de "rebote" (contêineres coloridos ao redor) para reflexos menos uniformes
  const cols = [0x9c3b23, 0x2f5b6b, 0xb8862a, 0x4b5d3a];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(cols[i % 4]).multiplyScalar(0.5), side: THREE.DoubleSide }));
    p.position.set(Math.sin(a) * 40, 2, Math.cos(a) * 40); p.lookAt(0, 2, 0); s.add(p);
  }
  const pm = new THREE.PMREMGenerator(r);
  const rt = pm.fromScene(s, 0.04);
  pm.dispose();
  s.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
  return rt.texture;
}
