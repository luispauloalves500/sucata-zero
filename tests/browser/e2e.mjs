// E2E: percorre o Episódio 1 inteiro em Chromium headless (WebGL via SwiftShader) e salva screenshots.
// Uso: URL=http://localhost:4173/ node tests/browser/e2e.mjs
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const URL = process.env.URL || 'http://localhost:4173/';
const SHOTS = process.env.SHOTS || '/workspace/sucata-shots';
const QUICK = process.env.QUICK === '1';
fs.mkdirSync(SHOTS, { recursive: true });
const exe = process.env.CHROME || '/usr/bin/google-chrome';
const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
let failures = 0; const results = [];
const ok = (name, cond, extra = '') => { results.push(`${cond ? '✔' : '✘'} ${name}${extra ? ' — ' + extra : ''}`); if (!cond) failures++; };

async function open(viewport, mobile = false) {
  const ctx = await browser.newContext(mobile ? { viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => errs.push('requestfailed: ' + r.url()));
  const t0 = Date.now();
  const resp = await page.goto(URL);
  ok(`HTTP ${resp.status()} em ${URL}`, resp.status() === 200);
  await page.waitForFunction(() => window.__SZ && window.__SZ.mode === 'title', null, { timeout: 120000 });
  results.push(`  carregamento até o título: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  return { ctx, page, errs };
}
const S = (page, fn, arg) => page.evaluate(fn, arg);
// espera em tempo de SIMULAÇÃO (headless/SwiftShader roda abaixo de 60 FPS) e também em tempo real
const wait = async (page, ms) => {
  const t0 = await S(page, () => __SZ.time);
  await page.waitForTimeout(ms);
  try { await page.waitForFunction(([t0, s]) => __SZ.mode !== 'play' || __SZ.time >= t0 + s, [t0, ms / 1000], { timeout: ms * 6 + 2000, polling: 50 }); } catch {}
};
const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png` });
const tp = (page, x, y, z, h = 0) => S(page, ([x, y, z, h]) => __SZ.teleport(x, y, z, h), [x, y, z, h]);
const closeMenus = (page) => S(page, () => __SZ.closeMenus());
const until = async (page, fn, arg, ms = 8000) => { try { await page.waitForFunction(fn, arg, { timeout: ms, polling: 100 }); return true; } catch { return false; } };
process.on('uncaughtException', (e) => { console.log(results.join('\n')); console.log('EXCEÇÃO:', e); process.exit(1); });
process.on('unhandledRejection', (e) => { console.log(results.join('\n')); console.log('EXCEÇÃO:', e); process.exit(1); });

// ---------------------------------------------------------------- desktop
{
  const { page, errs, ctx } = await open({ width: 1280, height: 720 });
  await wait(page, 1200);
  await shot(page, '01-titulo');
  await S(page, () => __SZ.newGame('standard'));
  await wait(page, 2500);
  ok('novo jogo inicia em modo play', (await S(page, () => __SZ.mode)) === 'play');
  // movimento real pelo controlador (entrada virtual)
  const p0 = await S(page, () => __SZ.player());
  await S(page, () => __SZ.move(0, 1)); await wait(page, 1200); await S(page, () => __SZ.move(0, 0));
  const p1 = await S(page, () => __SZ.player());
  ok('andar move o robô', Math.hypot(p1.x - p0.x, p1.z - p0.z) > 1.2, `${Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(2)} m`);
  ok('robô no chão (KCC)', p1.grounded);
  await S(page, () => __SZ.press('jump', 100)); await wait(page, 260);
  const pj = await S(page, () => __SZ.player());
  ok('pular sobe', pj.y > p1.y + 0.4, `Δy ${(pj.y - p1.y).toFixed(2)}`);
  await wait(page, 1000);
  ok('sem braço direito no início', (await S(page, () => __SZ.player())).armR === null);
  // 1-1
  await tp(page, 9.7, 2.3, 0, 0); await wait(page, 500);
  ok('1-1: passarela alcançada', (await S(page, () => __SZ.quest('1-1'))).stage >= 1);
  await tp(page, 9.7, 2.3, 5.8, 0); await wait(page, 300);
  ok('1-1: interagir com contêiner', (await S(page, () => __SZ.interactNearest())) === 'crate_start');
  await wait(page, 1500);
  await shot(page, '02-memoria');
  await closeMenus(page); await wait(page, 1600);
  ok('1-1: portão A abre', await S(page, () => __SZ.gate('gate_a')));
  await tp(page, 0, 0.1, 13.6, 0); await until(page, () => __SZ.quest('1-1').state === 'complete');
  ok('1-1 concluída', (await S(page, () => __SZ.quest('1-1'))).state === 'complete');
  // 1-2
  await tp(page, 0, 0.1, 18, 0); await until(page, () => __SZ.enemies().some((e) => e.tag === 'e02_quest'));
  const en = await S(page, () => __SZ.enemies());
  ok('1-2: Patrulheiro de missão aparece', en.some((e) => e.tag === 'e02_quest'));
  // combate real: ataque com garra contra o patrulheiro
  const e02 = en.find((e) => e.tag === 'e02_quest');
  await tp(page, e02.x, 0.1, e02.z - 1.6, 0); await wait(page, 120);
  const hpBefore = (await S(page, () => __SZ.enemies())).find((e) => e.tag === 'e02_quest').hp;
  for (let i = 0; i < 3; i++) { await S(page, () => __SZ.press('attack', 60)); await wait(page, 330); }
  const e02b = (await S(page, () => __SZ.enemies())).find((e) => e.tag === 'e02_quest');
  ok('combate: golpes da garra causam dano', !e02b || e02b.hp < hpBefore, `${hpBefore} → ${e02b?.hp}`);
  await shot(page, '03-combate-garra');
  await S(page, () => __SZ.damageEnemyTag('e02_quest', 999)); await wait(page, 900);
  ok('1-2: patrulheiro derrotado', (await S(page, () => __SZ.quest('1-2'))).stage >= 2);
  const drops = await S(page, () => __SZ.drops());
  ok('1-2: peças P11 e P02 caem', drops.some((d) => d.itemId === 'P11') && drops.some((d) => d.itemId === 'P02'));
  await shot(page, '04-peca-no-chao');
  for (const d of drops.filter((x) => x.itemId !== 'P03')) { await tp(page, d.x, 0.1, d.z, 0); await wait(page, 250); }
  ok('1-2: Punho Rebitador coletado', (await S(page, () => __SZ.state())).inventory.parts.some((p) => p.itemId === 'P11'));
  await tp(page, 12.4, 0.1, 51, -Math.PI / 2); await wait(page, 300);
  ok('1-2: usar a bancada de campo', (await S(page, () => __SZ.interactNearest())) === 'term_field');
  await wait(page, 600);
  await closeMenus(page);
  await S(page, () => __SZ.openWorkshop('field')); await wait(page, 900);
  await shot(page, '05-oficina-antes');
  // equipa pelo botão da UI (clique real)
  await page.click('.wslot[data-v="armR"]'); await wait(page, 200);
  const btn = await page.$('.witem'); await btn.click(); await wait(page, 200);
  await page.click('.acts .mbtn.primary'); await wait(page, 1600);
  ok('1-2: braço direito montado (corpo mudou)', (await S(page, () => __SZ.player())).armR === 'P11');
  ok('1-2: combo Rebitador ativo', (await S(page, () => __SZ.stats())).moveset === 'rivet');
  await shot(page, '06-oficina-depois');
  await closeMenus(page); await wait(page, 500);
  // golpe pesado real rompe a chapa
  await tp(page, 0, 0.1, 56.2, 0); await wait(page, 300);
  await S(page, () => __SZ.press('heavy', 80)); await wait(page, 1300);
  ok('1-2: golpe pesado rompe a chapa rachada (nova habilidade abre caminho)', await S(page, () => __SZ.plateBroken('plate_12')));
  await shot(page, '07-chapa-rompida');
  ok('1-2 concluída', (await S(page, () => __SZ.quest('1-2'))).state === 'complete');
  // 1-3
  for (const [x, y, z] of [[-18, 0.1, 64], [18.5, 2.7, 90.5], [-17.5, 0.1, 114]]) { await tp(page, x, y, z, 0); await wait(page, 350); await S(page, () => __SZ.interactNearest()); await wait(page, 1000); }
  ok('1-3: três condutores ligados', (await S(page, () => __SZ.quest('1-3'))).stage >= 1);
  await tp(page, 4.5, 0.1, 116, 0); await wait(page, 300);
  await S(page, () => __SZ.interactNearest()); await wait(page, 1600);
  ok('1-3: elevador liberado', await S(page, () => __SZ.gate('lift_13_gate')));
  await shot(page, '08-linha-de-triagem');
  await tp(page, 0, 0.1, 124.5, 0); await wait(page, 400);
  ok('1-3 concluída', (await S(page, () => __SZ.quest('1-3'))).state === 'complete');
  // 1-4 arena
  await tp(page, 0, 0.1, 133, 0); await wait(page, 1500);
  ok('1-4: emboscada começa (onda 1)', (await S(page, () => __SZ.enemies())).length >= 4);
  await shot(page, '09-emboscada');
  await S(page, () => __SZ.killAll()); await wait(page, 3200);
  ok('1-4: onda 2', (await S(page, () => __SZ.enemies())).some((e) => e.def === 'E03'));
  await S(page, () => __SZ.killAll()); await wait(page, 2800);
  ok('1-4: arena limpa', (await S(page, () => __SZ.quest('1-4'))).stage >= 1);
  await tp(page, 0, 0.1, 159.6, 0); await wait(page, 300);
  ok('1-4: libertar FERRO-7', (await S(page, () => __SZ.interactNearest())) === 'cage_ferro7');
  await wait(page, 3000);
  await tp(page, -11, 0.1, 162.3, Math.PI); await wait(page, 300);
  ok('1-4: oficina do hub', (await S(page, () => __SZ.interactNearest())) === 'bench_hub');
  await wait(page, 500); await closeMenus(page);
  ok('1-4 concluída e portão do chefe aberto', (await S(page, () => __SZ.quest('1-4'))).state === 'complete' && (await S(page, () => __SZ.gate('gate_boss'))));
  // fabricação
  await S(page, () => __SZ.grant({ scrap: 400, alloy: 4 }));
  await S(page, () => __SZ.openWorkshop('full')); await wait(page, 500);
  await page.click('.wtabs button[data-v="craft"]'); await wait(page, 200);
  await shot(page, '10-fabricar');
  await page.click('.craft .mbtn.primary'); await wait(page, 300);
  ok('oficina: fabricar Escudo de Porta', (await S(page, () => __SZ.state())).inventory.parts.some((p) => p.itemId === 'P08'));
  await closeMenus(page); await wait(page, 300);
  // save/load
  await S(page, () => __SZ.save('slot1')); await wait(page, 500);
  const snap = await S(page, () => __SZ.state());
  // 1-5 chefe
  await tp(page, 0, 0.1, 183.5, 0); await wait(page, 500);
  ok('1-5: entrar no depósito', (await S(page, () => __SZ.quest('1-5'))).stage >= 1);
  await tp(page, 0, 0.1, 188, 0); await wait(page, 3500);
  const b0 = await S(page, () => __SZ.boss());
  ok('1-5: luta com O COMPACTADOR começa', b0 && b0.fight);
  await shot(page, '11-chefe');
  await wait(page, 3500);
  await shot(page, '12-chefe-ataque');
  for (let i = 0; i < 6; i++) { await S(page, () => __SZ.damageBoss(150)); await wait(page, 300); }
  ok('chefe: fase 2', (await S(page, () => __SZ.boss())).phase >= 2);
  await wait(page, 1800);
  for (let i = 0; i < 6; i++) { await S(page, () => __SZ.damageBoss(150)); await wait(page, 300); }
  ok('chefe: fase 3 (placa cai)', (await S(page, () => __SZ.boss())).phase === 3);
  await wait(page, 1800);
  await shot(page, '13-chefe-fase3');
  for (let i = 0; i < 8 && (await S(page, () => __SZ.boss()))?.alive; i++) { await S(page, () => __SZ.damageBoss(200)); await wait(page, 250); }
  ok('chefe derrotado', !(await S(page, () => __SZ.boss())).alive);
  await wait(page, 3000);
  const d7 = (await S(page, () => __SZ.drops())).find((d) => d.itemId === 'P07');
  ok('chefe deixa o Braço TENSOR', !!d7);
  if (d7) { await tp(page, d7.x, 0.1, d7.z, 0); await wait(page, 500); }
  ok('TENSOR coletado', (await S(page, () => __SZ.state())).inventory.parts.some((p) => p.itemId === 'P07'));
  await S(page, () => __SZ.equipItem('P07')); await wait(page, 1500);
  ok('TENSOR equipado (guincho)', (await S(page, () => __SZ.stats())).abilities.includes('winch'));
  await tp(page, 0, 0.1, 211.5, 0); await wait(page, 400);
  await S(page, () => __SZ.press('ability', 80)); await wait(page, 1000);
  await shot(page, '14-guincho');
  await wait(page, 2400);
  ok('guincho abre o portão da âncora', (await S(page, () => __SZ.flags()))['used:anchor_gate'] === true);
  await wait(page, 3500);
  ok('Episódio 1 concluído', (await S(page, () => __SZ.quest('1-5'))).state === 'complete');
  ok('tela final', (await S(page, () => __SZ.mode)) === 'ending');
  await wait(page, 7000);
  await shot(page, '15-final');
  // carregar o save do slot 1 após recarregar a página
  await page.reload();
  await page.waitForFunction(() => window.__SZ && window.__SZ.mode === 'title', null, { timeout: 120000 });
  await S(page, () => __SZ.load('slot1')); await wait(page, 1500);
  const loaded = await S(page, () => __SZ.state());
  ok('save/load: estado restaurado após recarregar', loaded.quests['1-4'].state === 'complete' && loaded.inventory.parts.length === snap.inventory.parts.length && loaded.equipment.armR === snap.equipment.armR);
  ok('save/load: braço continua montado', (await S(page, () => __SZ.player())).armR === 'P11');
  // morte e retorno
  await S(page, () => __SZ.killPlayer()); await wait(page, 2300);
  ok('morte mostra tela', (await S(page, () => __SZ.screen())).includes('death'));
  await shot(page, '16-morte');
  await page.click('.death .mbtn'); await wait(page, 1200);
  ok('reativa no terminal', (await S(page, () => __SZ.mode)) === 'play' && (await S(page, () => __SZ.player())).hp > 0);
  // pausa
  await S(page, () => __SZ.pause()); await wait(page, 400);
  await shot(page, '17-pausa');
  await closeMenus(page);
  const e = await S(page, () => __SZ.errors);
  ok('sem erros internos do jogo (desktop)', e.length === 0, e.join(' | '));
  ok('sem erros de console (desktop)', errs.length === 0, errs.slice(0, 5).join(' | '));
  const rs = await S(page, () => __SZ.renderStats());
  results.push(`  render: ${rs.calls} draw calls, ${rs.tris} triângulos, perfil ${rs.profile}`);
  await ctx.close();
}

// ---------------------------------------------------------------- celular paisagem
{
  const { page, errs, ctx } = await open({ width: 844, height: 390 }, true);
  await wait(page, 800);
  await shot(page, '20-mobile-titulo');
  await page.tap('.title .mbtn'); await wait(page, 400);
  await page.tap('.diff .mbtn:nth-child(2)'); await wait(page, 2500);
  ok('mobile: controles de toque visíveis', await page.isVisible('#touch .tb-attack'));
  // joystick virtual por eventos de toque
  const p0 = await S(page, () => __SZ.player());
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  await touch('touchStart', [{ x: 120, y: 300, id: 1 }]);
  for (let i = 1; i <= 6; i++) { await touch('touchMove', [{ x: 120, y: 300 - i * 9, id: 1 }]); await wait(page, 60); }
  await wait(page, 900);
  await shot(page, '21-mobile-jogo');
  await touch('touchEnd', [{ x: 120, y: 246, id: 1 }]);
  const p1 = await S(page, () => __SZ.player());
  ok('mobile: joystick move o robô', Math.hypot(p1.x - p0.x, p1.z - p0.z) > 0.8, `${Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(2)} m`);
  await page.tap('.tb-jump'); await wait(page, 200);
  ok('mobile: botão pular', (await S(page, () => __SZ.player())).y > p1.y + 0.2);
  await tp(page, 12.3, 0.1, 51, -Math.PI / 2); await wait(page, 400);
  ok('mobile: botão contextual de interação', await page.isVisible('.tb-interact'));
  await S(page, () => __SZ.openWorkshop('field')); await wait(page, 700);
  await shot(page, '22-mobile-oficina');
  await closeMenus(page);
  const e = await S(page, () => __SZ.errors);
  ok('sem erros (mobile)', e.length === 0 && errs.length === 0, [...e, ...errs].slice(0, 5).join(' | '));
  await ctx.close();
}
await browser.close();
console.log(results.join('\n'));
console.log(failures ? `\n${failures} FALHA(S)` : '\nTODOS OS TESTES E2E PASSARAM');
process.exit(failures ? 1 : 0);
