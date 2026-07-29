export type PetPersonality = "sunny" | "shy" | "cool" | "fiery";

export type LineLangPack = { zh: string[]; en: string[] };
export type LineBilingual = { zh: string; en: string };

/** 性格润色表（数据可在 characters/lines，类型归 content） */
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

export function isPetPersonality(value: unknown): value is PetPersonality {
  return (
    value === "sunny" ||
    value === "shy" ||
    value === "cool" ||
    value === "fiery"
  );
}

function stripTrailingFlavor(text: string): string {
  return text
    .replace(/[～~!！。.…呢嘛呀哦啦吧啊哼切欸喂]+$/u, "")
    .trimEnd();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** `polish` 由调用方从角色台词包解析后传入，避免 content → characters。 */
export function flavorPetLine(
  line: string,
  _personality: PetPersonality,
  lang: "zh" | "en" = "zh",
  polish: PersonalityPolish
): string {
  const base = stripTrailingFlavor(line);
  if (!base) return line;

  const prefix = pick(polish.prefix[lang]);
  const end = pick(polish.end[lang]);
  const trunc = polish.truncateLong;
  if (
    trunc &&
    base.length > trunc.minLen &&
    Math.random() < trunc.chance
  ) {
    return `${prefix}${base.slice(0, trunc.keep)}${trunc.ellipsis[lang]}${end}`;
  }

  let out = `${prefix}${base}${end}`;
  if (
    polish.extraSuffix &&
    polish.extraSuffixChance &&
    Math.random() < polish.extraSuffixChance
  ) {
    out += pick(polish.extraSuffix[lang]);
  }
  return out;
}
