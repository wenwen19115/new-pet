import type { PetPersonality } from "../personality";

export type LineLangPack = { zh: string[]; en: string[] };

export type LineBilingual = { zh: string; en: string };

export interface CharacterPersonalityLines {
  idleCute: LineLangPack;
  idleSnarky: LineLangPack;
  tap: LineLangPack;
  flavor: LineLangPack;
}

export interface PersonalityPolish {
  prefix: LineLangPack;
  end: LineLangPack;
  extraSuffix?: LineLangPack;
  extraSuffixChance?: number;
  truncateLong?: {
    minLen: number;
    keep: number;
    chance: number;
    ellipsis: LineBilingual;
  };
}

export interface UsbLineTemplates {
  addedOne: LineBilingual;
  addedMany: LineBilingual;
  emptyTail: LineBilingual;
  listHeader: LineBilingual;
  bullet: LineBilingual;
}

export interface CharacterIntroLines {
  zh: { cute: string; snarky: string };
  en: { cute: string; snarky: string };
}

export interface CharacterLineBundle {
  byPersonality: Record<PetPersonality, CharacterPersonalityLines>;
  byLook?: Record<string, LineLangPack>;
  motionLines?: {
    zh: Record<string, string[]>;
    en: Record<string, string[]>;
  };
  care?: LineLangPack;
  catchphrases: LineLangPack;
  intro: CharacterIntroLines;
  usb?: UsbLineTemplates;
  polish?: Partial<Record<PetPersonality, PersonalityPolish>>;
}

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
