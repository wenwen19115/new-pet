import {
  coerceLookIdForModel,
  getPetLook,
  type PetFigArtId,
  type PetToonDecorId,
} from "./looks";
import type { PetModelKind, PetSkinVisual } from "./types";
import {
  DEFAULT_PET_MODEL,
  getCharacter,
  isPetModelKind,
} from "../characters";

interface PetAppearance {
  id: string;
  model: PetModelKind;
  lookId: string;
  /** Look / decor display name */
  nameKey: string;
  /** Character form label (天问7号 / 梨宝 / …) */
  modelNameKey: string;
  defaultNickname: string;
  visual: PetSkinVisual;
  figArtId?: PetFigArtId;
  toonDecor?: PetToonDecorId;
}

export function resolveAppearance(
  model: PetModelKind | null | undefined,
  lookId: string | null | undefined
): PetAppearance {
  const kind = isPetModelKind(model) ? model : DEFAULT_PET_MODEL;
  const character = getCharacter(kind);
  const form = character.form;
  const coercedLookId = coerceLookIdForModel(lookId, form.model);
  const look = getPetLook(coercedLookId);
  const policy = character.appearance;

  const defaultNickname =
    policy.nicknameFrom === "look-chip"
      ? look.chipNickname
      : form.defaultNickname ?? "桌宠";

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
    figArtId: look.figArtId,
    toonDecor: policy.attachToonDecor ? look.toonDecor : undefined,
  };
}

export type { PetModelKind, PetSkinVisual } from "./types";
export type { PetFigArtId, PetToonDecorId } from "./looks";
export {
  listPetLooksForModel,
  coerceLookIdForModel,
  isPetLookId,
  STANDARD_LOOK_IDS,
  FIG_LOOK_IDS,
} from "./looks";
export { isPetModelKind, DEFAULT_PET_MODEL };
export { resolveNickname } from "./types";
