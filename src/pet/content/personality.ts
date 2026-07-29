import type { PersonalityPolish } from "../characters/lineTypes";
import { SHARED_POLISH } from "../characters/lines/shared";

export type PetPersonality = "sunny" | "shy" | "cool" | "fiery";

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

export function flavorPetLine(
  line: string,
  personality: PetPersonality,
  lang: "zh" | "en" = "zh",
  polish: PersonalityPolish = SHARED_POLISH[personality]
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
