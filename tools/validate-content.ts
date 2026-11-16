// Valida referências cruzadas do conteúdo (itens, ataques, missões, modelos). Uso: npm run validate
import fs from 'node:fs';
import { ITEMS } from '../src/content/items';
import { ATTACKS, COMBO, HEAVY } from '../src/content/attacks';
import { QUESTS } from '../src/content/quests';
import { ENEMIES } from '../src/content/enemies';
const errs: string[] = [];
for (const [id, it] of Object.entries(ITEMS)) if (it.id !== id) errs.push(`item ${id}: id interno ${it.id}`);
for (const [m, list] of Object.entries(COMBO)) for (const a of list) if (!ATTACKS[a]) errs.push(`combo ${m}: ataque ${a} inexistente`);
for (const [m, a] of Object.entries(HEAVY)) if (a && !ATTACKS[a]) errs.push(`pesado ${m}: ${a} inexistente`);
const qids = new Set(QUESTS.map((q) => q.id));
for (const q of QUESTS) {
  for (const r of q.requires ?? []) if (!qids.has(r)) errs.push(`missão ${q.id}: requer ${r} inexistente`);
  for (const u of q.unlocks ?? []) if (!qids.has(u)) errs.push(`missão ${q.id}: libera ${u} inexistente`);
  for (const s of q.stages) if ((s.type === 'collect' || s.type === 'equip') && !ITEMS[s.target!]) errs.push(`missão ${q.id}/${s.id}: item ${s.target}`);
  if (q.rewards.blueprint && !ITEMS[q.rewards.blueprint]) errs.push(`missão ${q.id}: planta ${q.rewards.blueprint}`);
}
for (const [id, e] of Object.entries(ENEMIES)) if (e.hp <= 0) errs.push(`inimigo ${id}: hp`);
const man = JSON.parse(fs.readFileSync('public/assets/manifest.json', 'utf8'));
const entries: any[] = man.assets ?? [];
for (const m of entries) { const p = m.url; if (p && !fs.existsSync('public/' + p)) errs.push(`modelo ausente: ${p}`); }
if (errs.length) { console.error('✘ conteúdo inválido:\n' + errs.join('\n')); process.exit(1); }
console.log(`✔ conteúdo ok: ${Object.keys(ITEMS).length} peças, ${QUESTS.length} missões, ${Object.keys(ENEMIES).length} inimigos, ${entries.length} modelos`);
