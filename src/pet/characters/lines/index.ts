import type { CharacterLineBundle } from "../lineTypes";
import { lines as chip } from "./chip";
import { lines as figSci } from "./fig-sci";
import { lines as toon } from "./toon";
import { lines as vrm } from "./vrm";
import { lines as mugCat } from "./mug-cat";

const PACKS: Record<string, CharacterLineBundle> = {
  chip,
  "fig-sci": figSci,
  toon,
  vrm,
  "mug-cat": mugCat,
};

export function getLinePack(model: string): CharacterLineBundle {
  return PACKS[model] ?? PACKS.chip!;
}
