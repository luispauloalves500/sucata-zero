// Texturas procedurais (canvas) para o cenário — originais, sem download.
import * as THREE from 'three';
import { rng } from '../core/math';

function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c: HTMLCanvasElement, rep = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep, rep);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function noise(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, seed: number, mono = true) {
  const id = ctx.getImageData(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < id.data.length; i += 4) {
    const n = (r() - 0.5) * amount;
    id.data[i] += n; id.data[i + 1] += mono ? n : n * 0.8; id.data[i + 2] += mono ? n : n * 0.6;
  }
  ctx.putImageData(id, 0, 0);
}
function blotches(ctx: CanvasRenderingContext2D, w: number, h: number, n: number, colors: string[], rmin: number, rmax: number, seed: number, alpha = 0.25) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rad = rmin + r() * (rmax - rmin);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const c = colors[Math.floor(r() * colors.length)];
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha * (0.5 + r() * 0.5);
    ctx.fillStyle = g;
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { ctx.save(); ctx.translate(ox, oy); ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  ctx.globalAlpha = 1;
}

export interface TexSet { slab: THREE.Texture; macro: THREE.Texture; ground: THREE.Texture; containers: THREE.Texture[]; plate: THREE.Texture; concrete: THREE.Texture; hazard: THREE.Texture; belt: THREE.Texture; rustPanel: THREE.Texture; crack: THREE.Texture; sky: THREE.Texture; grime: THREE.Texture }

export function makeTextures(): TexSet {
  // chão de areia/terra com manchas de ferrugem e óleo
  const g = canvas(512); let c = g.getContext('2d')!;
  c.fillStyle = '#8a7558'; c.fillRect(0, 0, 512, 512);
  blotches(c, 512, 512, 60, ['#6e5238', '#9c8462', '#7a4a2c', '#5e4a36'], 20, 90, 3, 0.35);
  blotches(c, 512, 512, 25, ['#2b2420', '#3a2e26'], 8, 40, 7, 0.3);
  const r = rng(11);
  for (let i = 0; i < 900; i++) { c.fillStyle = r() > 0.5 ? 'rgba(60,45,30,0.5)' : 'rgba(180,160,120,0.35)'; c.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 2); }
  noise(c, 512, 512, 26, 5);
  const ground = tex(g, 24);

  // contêineres corrugados em várias cores
  const containers = ['#9c3b23', '#2f5b6b', '#b8862a', '#4b5d3a', '#6b6f73'].map((col, idx) => {
    const cv = canvas(256); const x = cv.getContext('2d')!;
    x.fillStyle = col; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 16) {
      const gr = x.createLinearGradient(i, 0, i + 16, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.0)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0.06)');
      x.fillStyle = gr; x.fillRect(i, 0, 16, 256);
    }
    // escorridos de ferrugem
    const rr = rng(20 + idx);
    for (let i = 0; i < 26; i++) { const sx = rr() * 256, sy = rr() * 120; const gr = x.createLinearGradient(0, sy, 0, sy + 60 + rr() * 140); gr.addColorStop(0, 'rgba(110,52,24,0.55)'); gr.addColorStop(1, 'rgba(110,52,24,0)'); x.fillStyle = gr; x.fillRect(sx, sy, 2 + rr() * 6, 200); }
    blotches(x, 256, 256, 14, ['#6b3018', '#3b2a20'], 6, 30, 30 + idx, 0.35);
    x.fillStyle = 'rgba(20,20,20,0.35)'; x.fillRect(0, 0, 256, 6); x.fillRect(0, 250, 256, 6);
    if (idx % 2 === 0) { x.font = 'bold 26px monospace'; x.fillStyle = 'rgba(235,230,215,0.55)'; x.fillText(['FV-09', 'ORDEM', 'CARGA', 'Z-LOG', 'TRIAGEM'][idx], 18 + idx * 8, 60 + idx * 20); }
    noise(x, 256, 256, 18, 40 + idx);
    return tex(cv, 1);
  });

  // chapa xadrez (piso metálico)
  const p = canvas(256); c = p.getContext('2d')!;
  c.fillStyle = '#5b6066'; c.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) {
    c.save(); c.translate(x + 16, y + 16); c.rotate(((x + y) / 32) % 2 ? Math.PI / 4 : -Math.PI / 4);
    c.fillStyle = 'rgba(200,205,210,0.35)'; c.fillRect(-10, -2.5, 20, 5); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-10, 2, 20, 1.5); c.restore();
  }
  blotches(c, 256, 256, 18, ['#7a4a2c', '#3a2e26'], 10, 50, 9, 0.35);
  noise(c, 256, 256, 22, 12);
  const plate = tex(p, 1);

  const cc = canvas(256); c = cc.getContext('2d')!;
  c.fillStyle = '#8c8a84'; c.fillRect(0, 0, 256, 256);
  blotches(c, 256, 256, 40, ['#6d6b66', '#a19e96', '#5a4e44'], 8, 50, 14, 0.35);
  c.strokeStyle = 'rgba(40,40,40,0.4)'; c.lineWidth = 2; c.strokeRect(1, 1, 254, 254);
  noise(c, 256, 256, 30, 15);
  const concrete = tex(cc, 1);

  const hz = canvas(128); c = hz.getContext('2d')!;
  c.fillStyle = '#e8a317'; c.fillRect(0, 0, 128, 128);
  c.fillStyle = '#1d1d1d';
  for (let i = -128; i < 256; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 16, 0); c.lineTo(i + 16 + 128, 128); c.lineTo(i + 128, 128); c.fill(); }
  noise(c, 128, 128, 30, 16);
  const hazard = tex(hz, 1);

  const bl = canvas(128, 256); c = bl.getContext('2d')!;
  c.fillStyle = '#26282b'; c.fillRect(0, 0, 128, 256);
  for (let y = 0; y < 256; y += 16) { c.fillStyle = '#3a3d41'; c.fillRect(0, y, 128, 5); c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, y + 5, 128, 2); }
  noise(c, 128, 256, 16, 17);
  const belt = tex(bl, 1);

  const rp = canvas(256); c = rp.getContext('2d')!;
  c.fillStyle = '#7d4528'; c.fillRect(0, 0, 256, 256);
  blotches(c, 256, 256, 50, ['#5a2c18', '#9a5a30', '#3a2418', '#a06a40'], 6, 40, 18, 0.45);
  c.fillStyle = 'rgba(30,20,15,0.6)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.beginPath(); c.arc(16 + i * 74, 16 + j * 74, 4, 0, 7); c.fill(); }
  noise(c, 256, 256, 30, 19);
  const rustPanel = tex(rp, 1);

  // chapa rachada âmbar (gate de golpe pesado)
  const cr = canvas(256); c = cr.getContext('2d')!;
  c.fillStyle = '#b47a2a'; c.fillRect(0, 0, 256, 256);
  blotches(c, 256, 256, 30, ['#7a4a1c', '#d8a040', '#5a3416'], 8, 40, 21, 0.4);
  c.strokeStyle = '#1a120c'; c.lineWidth = 4; c.lineJoin = 'round';
  const cr2 = rng(22);
  for (let k = 0; k < 5; k++) { c.beginPath(); let x = 128, y = 128; c.moveTo(x, y); for (let i = 0; i < 7; i++) { x += (cr2() - 0.5) * 60 + Math.cos(k * 1.3) * 18; y += (cr2() - 0.5) * 60 + Math.sin(k * 1.3) * 18; c.lineTo(x, y); } c.stroke(); }
  c.fillStyle = '#ffb02e'; c.globalAlpha = 0.9; c.beginPath(); c.arc(128, 128, 10, 0, 7); c.fill(); c.globalAlpha = 1;
  c.fillStyle = '#1d1d1d'; c.font = 'bold 22px monospace'; c.fillText('⚠ FRÁGIL', 70, 230);
  noise(c, 256, 256, 22, 23);
  const crack = tex(cr, 1);

  // céu: gradiente poeirento
  const sk = canvas(16, 256); c = sk.getContext('2d')!;
  const gr = c.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#3d5a73'); gr.addColorStop(0.42, '#9aa7a6'); gr.addColorStop(0.6, '#e2b98a'); gr.addColorStop(0.72, '#d48a52'); gr.addColorStop(1, '#5a3a2a');
  c.fillStyle = gr; c.fillRect(0, 0, 16, 256);
  const sky = tex(sk, 1); sky.wrapS = sky.wrapT = THREE.ClampToEdgeWrapping;

  const gm = canvas(128); c = gm.getContext('2d')!;
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 128);
  blotches(c, 128, 128, 20, ['#8a7a6a', '#b0a090'], 5, 30, 24, 0.5);
  noise(c, 128, 128, 30, 25);
  const grime = tex(gm, 1);
  // placas de concreto com rejunte, rachaduras e manchas (piso do galpão e da arena)
  const sl = canvas(512); c = sl.getContext('2d')!;
  c.fillStyle = '#85827b'; c.fillRect(0, 0, 512, 512);
  blotches(c, 512, 512, 70, ['#6f6b64', '#9b978e', '#5e5348', '#7a7266'], 10, 70, 31, 0.32);
  const rs = rng(32);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.fillStyle = `rgba(${rs() > 0.5 ? 255 : 0},${rs() > 0.5 ? 255 : 0},${rs() > 0.5 ? 255 : 0},0.035)`; c.fillRect(i * 128, j * 128, 128, 128); }
  c.strokeStyle = 'rgba(35,32,28,0.75)'; c.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 128, 0); c.lineTo(i * 128, 512); c.stroke(); c.beginPath(); c.moveTo(0, i * 128); c.lineTo(512, i * 128); c.stroke(); }
  c.strokeStyle = 'rgba(200,195,185,0.25)'; c.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 128 + 2, 0); c.lineTo(i * 128 + 2, 512); c.stroke(); c.beginPath(); c.moveTo(0, i * 128 + 2); c.lineTo(512, i * 128 + 2); c.stroke(); }
  c.strokeStyle = 'rgba(30,28,25,0.6)'; c.lineWidth = 1.5;
  for (let k = 0; k < 9; k++) { c.beginPath(); let x = rs() * 512, y = rs() * 512; c.moveTo(x, y); for (let i = 0; i < 8; i++) { x += (rs() - 0.5) * 40; y += (rs() - 0.5) * 40; c.lineTo(x, y); } c.stroke(); }
  blotches(c, 512, 512, 10, ['#1e1a16'], 10, 40, 33, 0.35);
  noise(c, 512, 512, 22, 34);
  const slab = tex(sl, 1);
  // macro-ruído (escala grande) para quebrar a repetição do chão
  const mc = canvas(256); c = mc.getContext('2d')!;
  c.fillStyle = '#808080'; c.fillRect(0, 0, 256, 256);
  blotches(c, 256, 256, 40, ['#ffffff', '#202020', '#c0c0c0', '#404040'], 20, 80, 41, 0.45);
  blotches(c, 256, 256, 60, ['#ffffff', '#000000'], 6, 24, 42, 0.25);
  const macro = tex(mc, 1, false);
  return { slab, macro, ground, containers, plate, concrete, hazard, belt, rustPanel, crack, sky, grime };
}
