import { getLinePack } from "../../characters/lines";
import { SHARED_CATCHPHRASE_FALLBACK } from "../../characters/lines/shared";
import { getPetLocale } from "../../bridge/locale";

export const CATCHPHRASE_MAX = 5;
export const CATCHPHRASE_DEFAULT_CHANCE = 0.6;
export const CATCHPHRASE_TEXT_MAX = 24;

export function defaultCatchphrasesForModel(model: string): string[] {
  const pack = getLinePack(model);
  const lang = getPetLocale();
  const list = pack.catchphrases[lang] ?? pack.catchphrases.zh;
  return [...(list.length ? list : SHARED_CATCHPHRASE_FALLBACK[lang])];
}

export function clampCatchphraseChance(value: unknown): number {
  const n = Number(value);
  if (Number.isNaN(n)) return CATCHPHRASE_DEFAULT_CHANCE;
  return Math.min(1, Math.max(0, Math.round(n * 100) / 100));
}

export function normalizeCatchphrases(
  raw: unknown,
  model: string
): string[] {
  if (raw === undefined || raw === null) {
    return defaultCatchphrasesForModel(model);
  }
  if (!Array.isArray(raw)) return defaultCatchphrasesForModel(model);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const text = item.trim().slice(0, CATCHPHRASE_TEXT_MAX);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= CATCHPHRASE_MAX) break;
  }
  return out;
}

function pickOne(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function applyCatchphrase(
  line: string,
  phrases: string[] | undefined,
  chance: number
): string {
  const base = line.trim();
  if (!base) return line;
  const pool = (phrases ?? []).map((p) => p.trim()).filter(Boolean);
  if (pool.length === 0) return line;
  const p = clampCatchphraseChance(chance);
  if (Math.random() >= p) return line;
  const phrase = pickOne(pool);
  if (!phrase || base.includes(phrase)) return line;
  const needsSpace = /[A-Za-z0-9]$/.test(base) && /^[A-Za-z0-9]/.test(phrase);
  return `${base}${needsSpace ? " " : ""}${phrase}`;
}
