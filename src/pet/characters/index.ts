import type { CharacterDef, PetCapability } from "./types";
import type { PetModelKind } from "../skins/types";
import type { PetIdleMotion } from "../content/motion/motions";
import { characterChip } from "./chip";
import { characterFig } from "./fig-sci";
import { characterToon } from "./toon";
import { characterVrm } from "./vrm";
import { characterMugCat } from "./mug-cat";

const REGISTRY: Record<string, CharacterDef> = {
  chip: characterChip,
  "fig-sci": characterFig,
  toon: characterToon,
  vrm: characterVrm,
  "mug-cat": characterMugCat,
};

const CHARACTER_ORDER: PetModelKind[] = [
  "chip",
  "fig-sci",
  "toon",
  "vrm",
  "mug-cat",
];

export const PET_MODEL_KINDS: PetModelKind[] = CHARACTER_ORDER;
export const DEFAULT_PET_MODEL: PetModelKind = "chip";

export function listCharacters(): CharacterDef[] {
  return CHARACTER_ORDER.map((id) => REGISTRY[id]);
}

export function getCharacter(id: PetModelKind): CharacterDef {
  return REGISTRY[id] ?? REGISTRY.chip;
}

export function characterCapabilities(id: PetModelKind): Set<PetCapability> {
  return new Set(getCharacter(id).capabilities);
}

export function characterHas(id: PetModelKind, cap: PetCapability): boolean {
  return getCharacter(id).capabilities.includes(cap);
}

/** 走 capability，别写死 model === "vrm"。 */
export function characterSupportsVrmAssets(id: PetModelKind): boolean {
  return characterHas(id, "vrm-upload");
}

export function isPetModelKind(value: unknown): value is PetModelKind {
  return typeof value === "string" && value in REGISTRY;
}

export function resolveMotionForModel(
  motion: PetIdleMotion,
  model: PetModelKind
): PetIdleMotion {
  return getCharacter(model).resolveMotion(motion);
}

export type { PetCapability } from "./types";
