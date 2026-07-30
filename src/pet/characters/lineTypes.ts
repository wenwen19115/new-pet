import type {
  PetPersonality,
  PersonalityPolish,
  LineLangPack,
  LineBilingual,
} from "../content/dialogue/personality";

export type {
  PetPersonality,
  PersonalityPolish,
  LineLangPack,
  LineBilingual,
} from "../content/dialogue/personality";

export interface CharacterPersonalityLines {
  idleCute: LineLangPack;
  idleSnarky: LineLangPack;
  tap: LineLangPack;
  flavor: LineLangPack;
}

export interface UsbLineTemplates {
  /** 各字段均为多语数组，组装时每段随机抽一条再拼 */
  addedOne: LineLangPack;
  addedMany: LineLangPack;
  emptyTail: LineLangPack;
  listHeader: LineLangPack;
  bullet: LineLangPack;
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
  /** 开始拖时的惊讶/紧张台词；缺省走 shared */
  dragStart?: LineLangPack;
  /** 拖完落地余韵台词；缺省走 shared */
  dragEnd?: LineLangPack;
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
  "drag-start",
  "drag-end",
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
