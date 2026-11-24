// Tour fixo de câmera para comparar antes/depois. Uso: SCRIPT=$PWD/tests/browser/tour.mjs OUT=/workspace/sucata-shots/v2/antes node tests/browser/shot.mjs
export default async function (page, out) {
  const S = (f, a) => page.evaluate(f, a);
  const w = (ms) => page.waitForTimeout(ms);
  await S(() => __SZ.newGame()); await w(3000);
  const spots = [
    ['01-camara', -3, 0.6, -6.5, 0, 0.25],
    ['02-patio', 2, 0.1, 16, 0, 0.18],
    ['04-triagem', 0, 0.1, 61, 0, 0.2],
    ['05-triagem-prensas', -14, 0.1, 76, 0.7, 0.2],
    ['06-galpao', 0, 0.1, 127, 0, 0.18],
    ['07-arena', 0, 0.1, 181, 0, 0.15],
    ['08-arena-dentro', 6, 0.1, 205, Math.PI + 0.4, 0.2],
  ];
  for (const [name, x, y, z, h, p] of spots) {
    await S(([x, y, z, h]) => __SZ.teleport(x, y, z, h), [x, y, z, h]);
    if (name === '07-arena') await S(() => { for (const id of ['gate_arena_in']) window.__SZG?.openGate?.(id); });
    await w(900);
    await S(([h, p]) => __SZ.setCam(h, p), [h, p]);
    await w(700);
    await page.screenshot({ path: `${out}-${name}.png` });
    if (name === '02-patio') {
      // combate no pátio
      await S(() => __SZ.teleport(-6, 0.1, 21.5, 0)); await w(900);
      for (let i = 0; i < 2; i++) { await S(() => __SZ.press('attack', 60)); await w(160); }
      await page.screenshot({ path: `${out}-03-combate.png` });
      await w(1200);
    }
  }
  console.log(JSON.stringify(await S(() => __SZ.renderStats())));
}
