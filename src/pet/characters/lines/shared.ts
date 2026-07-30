import type {
  PetPersonality,
  PersonalityPolish,
} from "../../content/dialogue/personality";
import type {
  CharacterLineBundle,
  LineLangPack,
  PlayfulLinePack,
  UsbLineTemplates,
} from "../lineTypes";
import sharedData from "./data/shared.json";

export const SHARED_CARE = sharedData.care as LineLangPack;
export const SHARED_USB = sharedData.usb as UsbLineTemplates;
export const SHARED_PLAYFUL = sharedData.playful as PlayfulLinePack;
export const SHARED_DRAG_START = sharedData.dragStart as LineLangPack;
export const SHARED_DRAG_END = sharedData.dragEnd as LineLangPack;
export const SHARED_CATCHPHRASE_FALLBACK =
  sharedData.catchphraseFallback as LineLangPack;
export const SHARED_POLISH = sharedData.polish as Record<
  PetPersonality,
  PersonalityPolish
>;

export function resolveCare(pack: CharacterLineBundle): LineLangPack {
  return pack.care ?? SHARED_CARE;
}

export function resolveUsb(pack: CharacterLineBundle): UsbLineTemplates {
  return pack.usb ?? SHARED_USB;
}

export function resolvePlayful(pack: CharacterLineBundle): PlayfulLinePack {
  return pack.playful ?? SHARED_PLAYFUL;
}

export function resolveDragStart(pack: CharacterLineBundle): LineLangPack {
  return pack.dragStart ?? SHARED_DRAG_START;
}

export function resolveDragEnd(pack: CharacterLineBundle): LineLangPack {
  return pack.dragEnd ?? SHARED_DRAG_END;
}

export function resolvePolish(
  pack: CharacterLineBundle,
  personality: PetPersonality
): PersonalityPolish {
  return pack.polish?.[personality] ?? SHARED_POLISH[personality];
}
