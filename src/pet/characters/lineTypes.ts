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

/** 调皮追逐：开始 / 抓到 / 普通空 / 连空嫌弃 */
export interface PlayfulToneLines {
  cute: LineLangPack;
  snarky: LineLangPack;
}

export interface PlayfulLinePack {
  start: PlayfulToneLines;
  catch: PlayfulToneLines;
  miss: PlayfulToneLines;
  sulk: PlayfulToneLines;
}

export type PlayfulLineKind = keyof PlayfulLinePack;

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
  /** 调皮追逐台词；缺省走 shared */
  playful?: PlayfulLinePack;
  /** 开始拖时的惊讶/紧张台词；缺省走 shared */
  dragStart?: LineLangPack;
  /** 拖完落地余韵台词；缺省走 shared */
  dragEnd?: LineLangPack;
  usb?: UsbLineTemplates;
  /** USB 主句后的追句（口音）；仅声明了池的角色才会追 */
  usbFollowUp?: LineLangPack;
  /** 冒泡连点三次嫌烦；缺省走 shared */
  bubblePong?: LineLangPack;
  /** 工位气象；缺省走 shared */
  deskWeather?: DeskWeatherLinePack;
  polish?: Partial<Record<PetPersonality, PersonalityPolish>>;
}

export interface DeskWeatherLinePack {
  /** 窗口增多：略紧张压抑，须带「窗口」等硬联系词 */
  appsUp: LineLangPack;
  /** 窗口减少：放松舒气，须带「窗口」等硬联系词 */
  appsDown: LineLangPack;
  /** 切窗太勤：闪太快伤眼感，须带「窗口」等硬联系词 */
  switchBurst: LineLangPack;
  maxDwell: {
    "30s": LineLangPack;
    "3m": LineLangPack;
  };
}

export const BUILTIN_LINE_CATEGORIES = [
  "idle",
  "tap",
  "usb",
  "personality",
  "care",
  "motion",
  "playful",
  "drag-start",
  "drag-end",
  "bubble-pong",
  "desk-weather",
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
