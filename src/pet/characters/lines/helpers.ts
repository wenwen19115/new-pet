import type { LineLangPack, CharacterPersonalityLines } from "../lineTypes";

export function L(zh: string[], en: string[]): LineLangPack {
  return { zh, en };
}

export function P(
  idleCute: LineLangPack,
  idleSnarky: LineLangPack,
  tap: LineLangPack,
  flavor: LineLangPack
): CharacterPersonalityLines {
  return { idleCute, idleSnarky, tap, flavor };
}
