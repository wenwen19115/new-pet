import type { PetPersonality } from "../personality";

export type LineLangPack = { zh: string[]; en: string[] };

/** Per-personality dialogue; tone = cute / snarky within */
export interface CharacterPersonalityLines {
  idleCute: LineLangPack;
  idleSnarky: LineLangPack;
  tap: LineLangPack;
  /** High-weight personality lines (replaces old global personality pool) */
  flavor: LineLangPack;
}

export interface CharacterLineBundle {
  byPersonality: Record<PetPersonality, CharacterPersonalityLines>;
  /** Slight mix-ins keyed by lookId（形象） */
  byLook?: Record<string, LineLangPack>;
  motionLines?: {
    zh: Record<string, string[]>;
    en: Record<string, string[]>;
  };
}

/** Built-in dialogue categories that can be toggled like motions */
export const BUILTIN_LINE_CATEGORIES = [
  "idle",
  "tap",
  "usb",
  "personality",
  "care",
  "motion",
] as const;

export type BuiltInLineCategory = (typeof BUILTIN_LINE_CATEGORIES)[number];

export function isBuiltInLineCategory(
  value: unknown
): value is BuiltInLineCategory {
  return (
    typeof value === "string" &&
    (BUILTIN_LINE_CATEGORIES as readonly string[]).includes(value)
  );
}
