import type { PetSkinVisual } from "../../skins";
import type { ToonPalette } from "./types";

export function buildToonPalette(visual: PetSkinVisual): ToonPalette {
  return {
    fur: visual.bodyFrom || "#3a4558",
    furD: visual.bodyTo || "#1e2430",
    furL: visual.sideHi || "#5a6a80",
    ear: visual.accent || "#3ec8ff",
    earIn: visual.accentSoft || "#9ae8ff",
    outline: "#141820",
    belly: "#f2f6fa",
    nose: "#1a1420",
    cheek: visual.accentSoft || "#9ae8ff",
  };
}
