import {
  coerceLookIdForModel,
  getPetLook,
  isPetFigArtId,
  type PetFigArtId,
  type PetToonDecorId,
} from "./looks";
import type { PetModelKind, PetSkinVisual } from "./types";
import { pickLocaleName, FALLBACK_DEFAULT_NICKNAME } from "./localeName";
import { getPetLocale, type PetLocale } from "../bridge/locale";
import {
  DEFAULT_PET_MODEL,
  getCharacter,
  isPetModelKind,
} from "../characters";

interface PetAppearance {
  id: string;
  model: PetModelKind;
  lookId: string;
  /** look / 装饰显示名 key */
  nameKey: string;
  /** 角色形态显示名 key（天问7号 / 梨宝…） */
  modelNameKey: string;
  defaultNickname: string;
  visual: PetSkinVisual;
  figArtId?: PetFigArtId;
  toonDecor?: PetToonDecorId;
}

export function resolveAppearance(
  model: PetModelKind | null | undefined,
  lookId: string | null | undefined,
  lang: PetLocale = getPetLocale()
): PetAppearance {
  const kind = isPetModelKind(model) ? model : DEFAULT_PET_MODEL;
  const character = getCharacter(kind);
  const form = character.form;
  const coercedLookId = coerceLookIdForModel(lookId, form.model);
  const look = getPetLook(coercedLookId);
  const policy = character.appearance;

  const defaultNickname = pickLocaleName(
    form.defaultNickname ?? FALLBACK_DEFAULT_NICKNAME,
    lang
  );

  const nameKey =
    policy.nameFrom === "look-toon" && look.toonNameKey
      ? look.toonNameKey
      : look.nameKey;

  return {
    id: `${form.model}:${look.id}`,
    model: form.model,
    lookId: look.id,
    nameKey,
    modelNameKey: form.nameKey,
    defaultNickname,
    visual: look.visual,
    figArtId: isPetFigArtId(look.id) ? look.id : undefined,
    toonDecor: policy.attachToonDecor ? look.toonDecor : undefined,
  };
}

export type { PetModelKind, PetSkinVisual } from "./types";
export type { PetFigArtId, PetToonDecorId } from "./looks";
export {
  listPetLooksForModel,
  coerceLookIdForModel,
  isPetLookId,
} from "./looks";
export { isPetModelKind, DEFAULT_PET_MODEL };
export { resolveNickname } from "./types";
