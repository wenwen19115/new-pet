import type { PetSkinVisual, PetModelKind } from "./types";
import { getCharacter } from "../characters";
import looksData from "./looks.json";

/** fig 形象 look id 单表；PetFigArtId 由此推导 */
export const FIG_LOOK_IDS = [
  "sunny",
  "shy",
  "cool",
  "fiery",
  "valentine",
  "spring",
  "midautumn",
  "labor",
] as const;

export type PetFigArtId = (typeof FIG_LOOK_IDS)[number];

export type PetToonDecorId = "crystal" | "lantern" | "blossom" | "star";

export interface PetLookDef {
  id: string;
  nameKey: string;
  toonNameKey?: string;
  toonDecor?: PetToonDecorId;
  visual: PetSkinVisual;
}

const PET_LOOK_REGISTRY = looksData as PetLookDef[];

const DEFAULT_PET_LOOK_ID = "cyan";

const lookById = new Map(PET_LOOK_REGISTRY.map((t) => [t.id, t]));

const FIG_LOOK_ID_SET = new Set<string>(FIG_LOOK_IDS);

export const STANDARD_LOOK_IDS = ["cyan", "amber", "rose", "violet"] as const;

export function isPetFigArtId(value: unknown): value is PetFigArtId {
  return typeof value === "string" && FIG_LOOK_ID_SET.has(value);
}

export function listPetLooksForModel(model: PetModelKind): PetLookDef[] {
  const ids = getCharacter(model).lookIds;
  if (!ids.length) return [];
  return ids
    .map((id) => lookById.get(id))
    .filter((t): t is PetLookDef => !!t);
}

function defaultLookIdForModel(model: PetModelKind): string {
  return getCharacter(model).defaults.lookId;
}

export function coerceLookIdForModel(
  lookId: string | null | undefined,
  model: PetModelKind
): string {
  const allowed = listPetLooksForModel(model);
  if (lookId && allowed.some((t) => t.id === lookId)) return lookId;
  const fallback = defaultLookIdForModel(model);
  if (allowed.some((t) => t.id === fallback)) return fallback;
  return allowed[0]?.id ?? DEFAULT_PET_LOOK_ID;
}

export function getPetLook(id: string | null | undefined): PetLookDef {
  if (id && lookById.has(id)) return lookById.get(id)!;
  return lookById.get(DEFAULT_PET_LOOK_ID) ?? PET_LOOK_REGISTRY[0]!;
}

export function isPetLookId(value: unknown): value is string {
  return typeof value === "string" && lookById.has(value);
}
