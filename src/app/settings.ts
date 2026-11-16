// Configurações triviais em localStorage (separadas do progresso — GDD §19.1)
export type Quality = 'auto' | 'low' | 'medium' | 'high';
export interface Settings {
  quality: Quality; music: number; sfx: number; muted: boolean; sensitivity: number; invertY: boolean;
  shoulder: 1 | -1; shake: boolean; hudScale: number; subtitlesScale: number; damageNumbers: boolean;
  autoLock: boolean; fixedJoystick: boolean; reduceFlashes: boolean; highContrast: boolean; showFps: boolean; lang: 'pt';
}
export const DEFAULT_SETTINGS: Settings = {
  quality: 'auto', music: 0.6, sfx: 0.8, muted: false, sensitivity: 1, invertY: false, shoulder: 1, shake: true,
  hudScale: 1, subtitlesScale: 1, damageNumbers: true, autoLock: false, fixedJoystick: false, reduceFlashes: false, highContrast: false, showFps: false, lang: 'pt',
};
const KEY = 'sucata-zero:settings';
export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    const s = { ...DEFAULT_SETTINGS, ...raw } as Settings;
    s.music = clamp01(s.music); s.sfx = clamp01(s.sfx);
    s.sensitivity = Math.min(3, Math.max(0.2, Number(s.sensitivity) || 1));
    s.hudScale = Math.min(1.5, Math.max(0.75, Number(s.hudScale) || 1));
    s.subtitlesScale = Math.min(1.6, Math.max(0.8, Number(s.subtitlesScale) || 1));
    if (!['auto', 'low', 'medium', 'high'].includes(s.quality)) s.quality = 'auto';
    if (s.shoulder !== 1 && s.shoulder !== -1) s.shoulder = 1;
    return s;
  } catch { return { ...DEFAULT_SETTINGS }; }
}
export function saveSettings(s: Settings) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* modo privado */ } }
function clamp01(v: unknown) { const n = Number(v); return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.6; }
