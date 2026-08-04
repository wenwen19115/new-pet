/** Theme Pack → 窗景设计族（10 族；新 pack 须补映射） */
import type { ThemePackId } from "@/theme/types";

export type HeroWindowFamily =
  | "wood"
  | "ink"
  | "geo"
  | "neon"
  | "zen"
  | "ceramic"
  | "cold"
  | "warm"
  | "dark"
  | "ornate";

export const THEME_PACK_TO_FAMILY: Record<ThemePackId, HeroWindowFamily> = {
  aboriginal: "warm",
  academia: "dark",
  aqua: "cold",
  arabia: "ornate",
  arcade: "neon",
  aurora: "cold",
  azulejo: "ceramic",
  bauhaus: "geo",
  brass: "warm",
  brazil: "warm",
  brutal: "geo",
  candy: "warm",
  celadon: "ceramic",
  celtic: "wood",
  comic: "geo",
  construct: "geo",
  cottage: "wood",
  crt: "cold",
  deco: "ornate",
  delft: "ceramic",
  dune: "warm",
  dunhuang: "wood",
  egypt: "warm",
  folk: "wood",
  ghibli: "wood",
  gothic: "dark",
  greece: "ceramic",
  hud: "neon",
  ice: "cold",
  india: "warm",
  ink: "ink",
  italy: "ceramic",
  korea: "ink",
  lofi: "zen",
  manga: "ink",
  mecha: "neon",
  memphis: "geo",
  mexico: "warm",
  morocco: "ceramic",
  noir: "dark",
  nord: "zen",
  nouveau: "ornate",
  paper: "zen",
  papercut: "ink",
  pixel: "neon",
  poster: "geo",
  russia: "ornate",
  sakura: "wood",
  sancai: "ceramic",
  scifi: "neon",
  shinkai: "cold",
  solarpunk: "warm",
  stained: "ceramic",
  swiss: "geo",
  thai: "ornate",
  tibet: "ornate",
  toon: "warm",
  turkey: "ceramic",
  ukiyo: "wood",
  vapor: "neon",
  viking: "dark",
  wabi: "zen",
  y2k: "cold",
  zen: "zen",
};

export interface HeroFamilyTone {
  ink: string;
  panel: string;
  cream: string;
  sand: string;
  accent: string;
  muted: string;
}

export const FAMILY_TONE: Record<HeroWindowFamily, HeroFamilyTone> = {
  wood: { ink: "#1a2a48", panel: "#16365f", cream: "#fff8f0", sand: "#e8d8c0", accent: "#c45a48", muted: "#5a4a38" },
  ink: { ink: "#1a1a1a", panel: "#2a2a2a", cream: "#f6f2ea", sand: "#e8e2d6", accent: "#a02828", muted: "#6a655c" },
  geo: { ink: "#111", panel: "#c02820", cream: "#1a1a1a", sand: "#111", accent: "#c02820", muted: "#999" },
  neon: { ink: "#00f0ff", panel: "#7a3cff", cream: "#1a0f28", sand: "#12081c", accent: "#ff2d95", muted: "#8a7aa8" },
  zen: { ink: "#222", panel: "#222", cream: "#f6f6f0", sand: "#e4e4dc", accent: "#6a6a62", muted: "#6a6a65" },
  ceramic: { ink: "#1a3048", panel: "#2a5a7a", cream: "#f2f6f8", sand: "#dce8ee", accent: "#2a6a8a", muted: "#5a6a72" },
  cold: { ink: "#1a3050", panel: "#2a5080", cream: "#e8f0f8", sand: "#d0e0f0", accent: "#3a78b0", muted: "#5a7088" },
  warm: { ink: "#3a2418", panel: "#8a4020", cream: "#fff4e8", sand: "#f0dcc0", accent: "#c45a28", muted: "#7a5a40" },
  dark: { ink: "#e8e0d8", panel: "#8a2030", cream: "#1a1418", sand: "#120e12", accent: "#a02838", muted: "#8a7a78" },
  ornate: { ink: "#2a1830", panel: "#6a3060", cream: "#f8f0e8", sand: "#e8d8c8", accent: "#8a4060", muted: "#6a5a58" },
};

export function themePackToFamily(style: string): HeroWindowFamily {
  return (THEME_PACK_TO_FAMILY as Record<string, HeroWindowFamily>)[style] || "wood";
}

export function familyToneVars(family: HeroWindowFamily): Record<string, string> {
  const t = FAMILY_TONE[family] || FAMILY_TONE.wood;
  return {
    "--ink": t.ink,
    "--panel": t.panel,
    "--cream": t.cream,
    "--sand": t.sand,
    "--accent": t.accent,
    "--muted": t.muted,
  };
}
