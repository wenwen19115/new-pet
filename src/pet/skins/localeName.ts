import type { PetLocale } from "@/pet/bridge/locale";
import { getPetLocale } from "@/pet/bridge/locale";

/** 中英各一版的显示名（默认昵称等） */
export type LocaleName = { zh: string; en: string };

export const FALLBACK_DEFAULT_NICKNAME: LocaleName = {
  zh: "桌宠",
  en: "Desktop Pet",
};

export function pickLocaleName(
  value: LocaleName,
  lang: PetLocale = getPetLocale()
): string {
  return value[lang] || value.zh;
}
