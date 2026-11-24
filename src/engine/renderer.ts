import * as THREE from 'three';
import type { Quality } from '../app/settings';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/** passe final único: ACES + gradação quente/fria + vinheta + grão leve + sRGB */
const FinalShader = {
  uniforms: { tDiffuse: { value: null }, exposure: { value: 1.05 }, vignette: { value: 0.32 }, time: { value: 0 }, saturation: { value: 1.12 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float exposure; uniform float vignette; uniform float time; uniform float saturation; varying vec2 vUv;
    vec3 szFit(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 szAces(vec3 c){ const mat3 IN=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777));
      const mat3 OUT=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602));
      c*=exposure/0.6; c=IN*c; c=szFit(c); c=OUT*c; return clamp(c,0.0,1.0); }
    vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c,vec3(1.0/2.4))-0.055, step(vec3(0.0031308),c)); }
    float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c = szAces(c);
      float l = dot(c, vec3(0.299,0.587,0.114));
      c = mix(vec3(l), c, saturation);
      c = mix(c, c*c*(3.0-2.0*c), 0.28);
      // sombras levemente frias, altas luzes quentes (poeira do ferro-velho)
      c += vec3(0.018,0.006,-0.016) * smoothstep(0.35,1.0,l) + vec3(-0.012,0.0,0.014) * (1.0-smoothstep(0.0,0.35,l));
      vec2 d = vUv-0.5; float v = 1.0 - dot(d,d)*vignette*2.2;
      c *= clamp(v,0.0,1.0);
      c = toSRGB(clamp(c,0.0,1.0));
      c += (hash(vUv*vec2(1271.0,937.0)+time)-0.5)/255.0*2.0;
      gl_FragColor = vec4(c,1.0);
    }`,
};

export const isTouchDevice = () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0) && matchMedia('(pointer: coarse)').matches;

export interface QualityProfile { name: Exclude<Quality, 'auto'>; pixelRatio: number; shadows: boolean; shadowSize: number; particles: number; propDensity: number; drawDistance: number; antialias: boolean; post: boolean }
export const PROFILES: Record<Exclude<Quality, 'auto'>, QualityProfile> = {
  low: { name: 'low', pixelRatio: 0.75, shadows: false, shadowSize: 512, particles: 0.4, propDensity: 0.5, drawDistance: 90, antialias: false, post: false },
  medium: { name: 'medium', pixelRatio: 1.0, shadows: true, shadowSize: 1024, particles: 0.7, propDensity: 0.8, drawDistance: 140, antialias: false, post: true },
  high: { name: 'high', pixelRatio: 1.5, shadows: true, shadowSize: 2048, particles: 1, propDensity: 1, drawDistance: 220, antialias: true, post: true },
};

export class Renderer {
  readonly r: THREE.WebGLRenderer;
  profile: QualityProfile;
  private setting: Quality;
  private dynScale = 1;
  private fpsSamples: number[] = [];
  private lastAdjust = 0;
  composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private final: ShaderPass | null = null;
  private renderPass: RenderPass | null = null;
  onContextLost?: () => void;
  onContextRestored?: () => void;

  constructor(canvas: HTMLCanvasElement, quality: Quality) {
    this.setting = quality;
    this.profile = this.pick(quality);
    const ctxOpts = { canvas, antialias: this.profile.antialias, powerPreference: 'high-performance' as const, stencil: false };
    this.r = new THREE.WebGLRenderer(ctxOpts);
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.r.toneMapping = THREE.ACESFilmicToneMapping;
    this.r.toneMappingExposure = 1.05;
    this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.applyProfile();
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.onContextLost?.(); });
    canvas.addEventListener('webglcontextrestored', () => this.onContextRestored?.());
  }
  private pick(q: Quality): QualityProfile {
    if (q !== 'auto') return PROFILES[q];
    return isTouchDevice() ? PROFILES.low : PROFILES.medium;
  }
  setQuality(q: Quality) { this.setting = q; this.profile = this.pick(q); this.dynScale = 1; this.applyProfile(); }
  applyProfile() {
    this.r.shadowMap.enabled = this.profile.shadows;
    if (this.profile.post && !this.composer) this.makeComposer();
    this.resize();
  }
  private makeComposer() {
    const size = this.r.getSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), { type: THREE.HalfFloatType, samples: this.profile.antialias ? 4 : 0 });
    this.composer = new EffectComposer(this.r, rt);
    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.Camera());
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.42, 0.55, 1.05);
    this.composer.addPass(this.bloom);
    this.final = new ShaderPass(FinalShader);
    this.composer.addPass(this.final);
  }
  /** desenha a cena (com pós-processamento nos perfis médio/alto) */
  render(scene: THREE.Scene, cam: THREE.Camera, time = 0) {
    this.r.info.autoReset = false; this.r.info.reset();
    if (this.profile.post && this.composer && this.renderPass && this.final) {
      this.renderPass.scene = scene; this.renderPass.camera = cam;
      this.final.uniforms.time.value = time % 10;
      this.final.uniforms.exposure.value = this.r.toneMappingExposure;
      this.composer.render();
    } else this.r.render(scene, cam);
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pr = Math.min(dpr, this.profile.pixelRatio * (isTouchDevice() ? Math.min(dpr, 1.5) / 1.5 + 0.34 : 1)) * this.dynScale;
    // teto de pixels renderizados (evita telefones de DPI muito alto estourarem)
    const w = window.innerWidth, h = window.innerHeight;
    const maxPixels = isTouchDevice() ? 1.3e6 : 3.2e6;
    const scale = Math.min(pr, Math.sqrt(maxPixels / Math.max(1, w * h)));
    this.r.setPixelRatio(Math.max(0.5, scale));
    this.r.setSize(w, h, false);
    if (this.composer) { this.composer.setPixelRatio(this.r.getPixelRatio()); this.composer.setSize(w, h); this.bloom?.resolution.set(w / 2, h / 2); }
  }
  /** Ajuste automático: reduz escala interna por etapas se FPS sustentado cair (com teto para não oscilar). */
  sampleFrame(dt: number, now: number) {
    if (this.setting !== 'auto') return;
    this.fpsSamples.push(dt);
    if (this.fpsSamples.length < 90 || now - this.lastAdjust < 4000) return;
    const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
    this.fpsSamples.length = 0;
    const fps = 1 / avg;
    if (fps < 40 && this.dynScale > 0.6) { this.dynScale = Math.max(0.6, this.dynScale - 0.15); this.lastAdjust = now; this.resize(); }
    else if (fps < 30 && this.profile.name !== 'low') { this.profile = PROFILES.low; this.lastAdjust = now; this.applyProfile(); }
    else if (fps > 58 && this.dynScale < 1) { this.dynScale = Math.min(1, this.dynScale + 0.1); this.lastAdjust = now; this.resize(); }
  }
  get stats() { const i = this.r.info; return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, pr: this.r.getPixelRatio(), profile: this.profile.name }; }
}
