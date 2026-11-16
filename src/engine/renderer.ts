import * as THREE from 'three';
import type { Quality } from '../app/settings';

export const isTouchDevice = () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0) && matchMedia('(pointer: coarse)').matches;

export interface QualityProfile { name: Exclude<Quality, 'auto'>; pixelRatio: number; shadows: boolean; shadowSize: number; particles: number; propDensity: number; drawDistance: number; antialias: boolean }
export const PROFILES: Record<Exclude<Quality, 'auto'>, QualityProfile> = {
  low: { name: 'low', pixelRatio: 0.75, shadows: false, shadowSize: 512, particles: 0.4, propDensity: 0.5, drawDistance: 90, antialias: false },
  medium: { name: 'medium', pixelRatio: 1.0, shadows: true, shadowSize: 1024, particles: 0.7, propDensity: 0.8, drawDistance: 140, antialias: false },
  high: { name: 'high', pixelRatio: 1.5, shadows: true, shadowSize: 2048, particles: 1, propDensity: 1, drawDistance: 220, antialias: true },
};

export class Renderer {
  readonly r: THREE.WebGLRenderer;
  profile: QualityProfile;
  private setting: Quality;
  private dynScale = 1;
  private fpsSamples: number[] = [];
  private lastAdjust = 0;
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
    this.resize();
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
