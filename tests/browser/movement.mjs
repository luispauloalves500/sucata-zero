// Regressão de suavidade de movimento: anda em linhas retas e círculos pelo chão de cada área e mede
// travadas (queda de velocidade), solavancos verticais, perda de chão e tremor visual do modelo.
// Uso: URL=http://localhost:4173/ node tests/browser/movement.mjs   (MOBILE=1 para celular; REPORT=arquivo.json)
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const URL = process.env.URL || 'http://localhost:4173/';
const MOBILE = process.env.MOBILE === '1';
const exe = process.env.CHROME || '/usr/bin/google-chrome';
const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext(MOBILE ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(URL);
await page.waitForFunction(() => window.__SZ && window.__SZ.mode === 'title', null, { timeout: 120000 });
const S = (fn, a) => page.evaluate(fn, a);
await S(() => __SZ.newGame('standard'));
await page.waitForTimeout(2500);
const simWait = async (sec) => { const t0 = await S(() => __SZ.time); await page.waitForFunction(([t0, s]) => __SZ.time >= t0 + s, [t0, sec], { timeout: sec * 15000 + 5000, polling: 50 }); };

// [nome, x, z, joystick ([x,y] fixo ou 'circle'), duração em s de simulação, limites extras]
// câmera com yaw 0 (olhando +Z): joystick [0,1] anda para +Z e [-1,0] anda para +X
const runs0 = [
  ['pátio-reta', 0, 14.5, [0, 1], 3.2],
  ['pátio-círculo', 0, 36, 'circle', 4],
  ['triagem-reta (entre esteiras)', -12, 77, [-1, 0], 4],
  ['triagem-círculo', 12, 98, 'circle', 3.4],
  ['galpão-reta', 0, 122, [0, 1], 4.5],
  ['galpão-círculo', 0, 146, 'circle', 4],
  ['arena-círculo', 14, 197, 'circle', 5],
  ['câmara-reta', -3, -6, [0, 1], 2],
  ['câmara-rampa (subida)', -0.5, 7.8, [-1, 0], 2.2, { ramp: 'up' }],
  ['câmara-rampa (descida)', 8.6, 7.8, [1, 0], 2.2, { ramp: 'down', y: 2.3 }],
];
const runs = process.env.ONLY ? runs0.filter((r) => r[0].includes(process.env.ONLY)) : runs0;
const median = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
const report = [];
for (const [name, x, z, kind, dur, opt = {}] of runs) {
  await S(([x, z, y]) => { __SZ.move(0, 0); __SZ.killAll(); __SZ.teleport(x, y, z, 0); __SZ.setCam(0, 0.2); }, [x, z, opt.y ?? 0.1]);
  await simWait(0.6);
  await S(([kind]) => {
    __SZ.traceStart();
    if (kind !== 'circle') __SZ.move(kind[0], kind[1]);
    else { const t0 = __SZ.time; window.__circ = setInterval(() => { const a = (__SZ.time - t0) * 1.6; __SZ.move(Math.cos(a), Math.sin(a)); }, 8); }
  }, [kind]);
  await simWait(dur);
  const tr = await S(() => { clearInterval(window.__circ); __SZ.move(0, 0); return __SZ.traceStop(); });
  // passos físicos (60 Hz): descarta 0,5 s de aceleração
  if (process.env.DUMP) fs.appendFileSync(process.env.DUMP, name + '\n' + tr.steps.map((s) => s.map((v) => +v.toFixed(4)).join(' ')).join('\n') + '\n');
  const st = tr.steps; const t0 = st[0][0];
  const sp = [], dy = [], ys = []; let air = 0, n = 0;
  const interrupted = st.some((s) => s[6]); // levou golpe/ação que trava o movimento por design

  for (let i = 1; i < st.length; i++) {
    if (st[i][0] - t0 < 0.5) continue;
    const dt = st[i][0] - st[i - 1][0]; if (dt <= 0) continue;
    sp.push(Math.hypot(st[i][1] - st[i - 1][1], st[i][3] - st[i - 1][3]) / dt);
    dy.push(st[i][2] - st[i - 1][2]); ys.push(st[i][2]);
    if (!st[i][4]) air++; n++;
  }
  const med = median(sp);
  const stalls = sp.filter((v) => v < med * 0.6).length;
  // solavanco = mudança brusca na velocidade vertical entre passos (funciona no plano e na rampa)
  let yJumps = 0; for (let i = 1; i < dy.length; i++) if (Math.abs(dy[i] - dy[i - 1]) > 0.04) yJumps++;
  // tremor visual: variação quadro a quadro da velocidade do modelo renderizado (normalizada pela física)
  const fr = tr.frames.filter((f, i) => i > 3);
  const rs = [];
  for (let i = 1; i < fr.length; i++) { const dt = (fr[i][0] - fr[i - 1][0]) / 1000; if (dt > 0) rs.push(Math.hypot(fr[i][1] - fr[i - 1][1], fr[i][3] - fr[i - 1][3]) / dt); }
  const rmed = median(rs);
  // solavanco visual: salto na velocidade vertical do modelo entre quadros
  let rJolts = 0, pvy = null;
  for (let i = 1; i < fr.length; i++) { const dt = (fr[i][0] - fr[i - 1][0]) / 1000; if (dt <= 0) continue; const vy = (fr[i][2] - fr[i - 1][2]) / dt; if (pvy !== null && Math.abs(vy - pvy) > (opt.ramp ? 2.5 : 0.8)) rJolts++; pvy = vy; }
  let jit = 0; for (let i = 1; i < rs.length; i++) jit += Math.abs(rs[i] - rs[i - 1]); jit = rs.length > 1 ? jit / (rs.length - 1) / Math.max(0.1, rmed) : 0;
  const vis = rs.filter((v) => v < rmed * 0.4).length / Math.max(1, rs.length);
  const r = { name, interrupted, ramp: opt.ramp || '', endY: +st[st.length - 1][2].toFixed(2), steps: n, medSpeed: +med.toFixed(2), stallSteps: stalls, stallPct: +(100 * stalls / Math.max(1, n)).toFixed(1), yJumps, yRange: +(Math.max(...ys) - Math.min(...ys)).toFixed(3), airPct: +(100 * air / Math.max(1, n)).toFixed(1), frames: rs.length, rJolts, renderJitter: +jit.toFixed(3), renderFrozenPct: +(100 * vis).toFixed(1) };
  report.push(r);
  console.log(JSON.stringify(r));
}
await browser.close();
if (process.env.REPORT) fs.writeFileSync(process.env.REPORT, JSON.stringify(report, null, 2));
// limites
let fail = 0;
for (const r of report) {
  const bad = [];
  if (r.interrupted) bad.push('movimento interrompido por golpe/ação (teste inválido)');
  if (r.stallPct > 2) bad.push(`travadas ${r.stallPct}%`);
  if (r.yJumps > (r.ramp ? 2 : 0)) bad.push(`solavancos verticais ${r.yJumps}`);
  if (r.airPct > (r.ramp ? 6 : 1)) bad.push(`fora do chão ${r.airPct}%`);
  if (r.ramp === 'up' && r.endY < 1.5) bad.push(`não subiu a rampa (y final ${r.endY})`);
  if (r.ramp === 'down' && r.endY > 0.3) bad.push(`não desceu a rampa (y final ${r.endY})`);
  if (!r.ramp && r.yRange > 0.03) bad.push(`altura oscilou ${r.yRange} m`);
  if (r.rJolts > (r.ramp ? 2 : 0)) bad.push(`solavancos visuais ${r.rJolts}`);
  if (r.renderFrozenPct > 10) bad.push(`modelo parado em ${r.renderFrozenPct}% dos quadros`);
  if (r.renderJitter > 0.6) bad.push(`tremor visual ${r.renderJitter}`);
  console.log(`${bad.length ? '✘' : '✔'} ${r.name}${bad.length ? ' — ' + bad.join(', ') : ''}`);
  if (bad.length) fail++;
}
if (errs.length) { console.log('✘ erros:', errs.slice(0, 3).join(' | ')); fail++; }
console.log(fail ? `\n${fail} FALHA(S) DE SUAVIDADE` : '\nMOVIMENTO SUAVE EM TODAS AS ÁREAS');
process.exit(fail ? 1 : 0);
