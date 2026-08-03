import { resolveAppearance, resolveNickname } from "../../skins";
import { flavorPetLine } from "./personality";
import { getLinePack } from "../../characters/lines";
import { resolvePolish } from "../../characters/lines/shared";
import type { PetSettings, PetTone } from "../../data/types";
import { getPetLocale } from "../../bridge/locale";

export function buildSkinIntro(
  settings: PetSettings,
  options?: { lang?: "zh" | "en"; tone?: PetTone }
): string {
  const look = resolveAppearance(settings.modelKind, settings.lookId);
  const name = resolveNickname(settings.nickname, look);
  const tone = options?.tone ?? settings.tone;
  const lang = options?.lang ?? getPetLocale();
  const pack = getLinePack(settings.modelKind);
  const template = pack.intro[lang][tone === "snarky" ? "snarky" : "cute"];
  const base = template.replaceAll("{name}", name);
  return flavorPetLine(
    base,
    settings.personality,
    lang,
    resolvePolish(pack, settings.personality)
  );
}
