// utilitário: abre o jogo, roda um roteiro e tira screenshots
import { chromium } from '@playwright/test';
const url = process.env.URL || 'http://localhost:4173/';
const mobile = process.env.MOBILE === '1';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext(mobile ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
await page.goto(url);
await page.waitForFunction(() => window.__SZ && window.__SZ.mode === 'title', null, { timeout: 120000 });
const script = process.env.SCRIPT || '';
const out = process.env.OUT || '/workspace/sucata-shots/tmp';
await page.waitForTimeout(1500);
await page.screenshot({ path: out + '-title.png' });
if (script) { const fn = await import(script); await fn.default(page, out); }
console.log(JSON.stringify(await page.evaluate(() => ({ mode: __SZ.mode, errors: __SZ.errors, frames: __SZ.frames, r: __SZ.renderStats() }))));
console.log(logs.slice(0, 30).join('\n'));
await browser.close();
