import type { PetModelKind } from "@/pet/skins/types";
import type { PetTone } from "../../data/types";
import { flavorPetLine, type PetPersonality } from "./personality";
import {
  enabledCustomLineTexts,
  type PetCustomLine,
  type PetLineScene,
} from "./customLines";
import { getPetLocale } from "../../bridge/locale";
import { buildUsbAnnounceText } from "../../bridge/usbFormat";
import type { PetUsbAnnouncePayload } from "../../data/types";
import { getLinePack } from "../../characters/lines";
import { resolveCare, resolvePolish } from "../../characters/lines/shared";
import type { BuiltInLineCategory } from "../../characters/lineTypes";

export interface PetLinePickOptions {
  customLines?: PetCustomLine[];
  customLinesOnly?: boolean;
  disabledBuiltInLines?: string[];
  lookId?: string;
}

function pickLocale(): "zh" | "en" {
  return getPetLocale();
}

function lineCatOn(
  cat: BuiltInLineCategory,
  opts?: PetLinePickOptions
): boolean {
  return !opts?.disabledBuiltInLines?.includes(cat);
}

function pickFromPool(pool: string[], avoid: string | null = null): string {
  if (pool.length === 0) return "";
  if (pool.length === 1) return pool[0]!;
  let next = pool[Math.floor(Math.random() * pool.length)]!;
  let guard = 0;
  while (avoid && next === avoid && guard < 8) {
    next = pool[Math.floor(Math.random() * pool.length)]!;
    guard += 1;
  }
  return next;
}

function mergeScenePool(
  builtIn: string[],
  scene: PetLineScene,
  opts?: PetLinePickOptions
): string[] {
  const custom = enabledCustomLineTexts(opts?.customLines ?? [], scene);
  if (opts?.customLinesOnly) {
    return custom.length > 0 ? custom : builtIn;
  }
  return [...custom, ...builtIn];
}

function packFor(model: PetModelKind) {
  return getLinePack(model);
}

function personalityLines(model: PetModelKind, personality: PetPersonality) {
  return packFor(model).byPersonality[personality];
}

function packLang(pack: { zh: string[]; en: string[] }): string[] {
  return pickLocale() === "zh" ? pack.zh : pack.en;
}

function withFlavor(
  line: string,
  personality: PetPersonality,
  model: PetModelKind
): string {
  if (!line) return "";
  return flavorPetLine(
    line,
    personality,
    pickLocale(),
    resolvePolish(packFor(model), personality)
  );
}

function idlePool(
  tone: PetTone,
  model: PetModelKind,
  personality: PetPersonality
): string[] {
  const p = personalityLines(model, personality);
  return packLang(tone === "snarky" ? p.idleSnarky : p.idleCute);
}

function flavorPool(
  model: PetModelKind,
  personality: PetPersonality
): string[] {
  return packLang(personalityLines(model, personality).flavor);
}

function lookPool(model: PetModelKind, lookId?: string): string[] {
  if (!lookId) return [];
  const pack = packFor(model).byLook?.[lookId];
  return pack ? packLang(pack) : [];
}

function carePool(model: PetModelKind): string[] {
  return packLang(resolveCare(packFor(model)));
}

export function pickPetLine(
  tone: PetTone,
  avoid: string | null = null,
  personality: PetPersonality = "sunny",
  model: PetModelKind = "chip",
  opts?: PetLinePickOptions
): string {
  const customIdle = enabledCustomLineTexts(opts?.customLines ?? [], "idle");

  if (opts?.customLinesOnly && customIdle.length > 0) {
    return withFlavor(pickFromPool(customIdle, avoid), personality, model);
  }

  if (
    !opts?.customLinesOnly &&
    lineCatOn("personality", opts) &&
    Math.random() < 0.4
  ) {
    const special = pickFromPool(flavorPool(model, personality), avoid);
    if (special && (!avoid || special !== avoid)) {
      return withFlavor(special, personality, model);
    }
  }

  const builtIn: string[] = [];
  if (lineCatOn("idle", opts)) {
    builtIn.push(...idlePool(tone, model, personality));
  }
  if (
    !opts?.customLinesOnly &&
    lineCatOn("care", opts) &&
    Math.random() < 0.18
  ) {
    builtIn.push(...carePool(model));
  }
  if (
    !opts?.customLinesOnly &&
    lineCatOn("idle", opts) &&
    Math.random() < 0.22
  ) {
    builtIn.push(...lookPool(model, opts?.lookId));
  }

  const pool = mergeScenePool(builtIn, "idle", opts);
  return withFlavor(pickFromPool(pool, avoid), personality, model);
}

function builtInTapLines(
  model: PetModelKind,
  personality: PetPersonality
): string[] {
  return packLang(personalityLines(model, personality).tap);
}

export function pickTapEggLine(
  model: PetModelKind,
  personality: PetPersonality = "sunny",
  opts?: PetLinePickOptions
): string {
  const builtIn = lineCatOn("tap", opts)
    ? builtInTapLines(model, personality)
    : [];
  const pool = mergeScenePool(builtIn, "tap", opts);
  return withFlavor(pickFromPool(pool), personality, model);
}

function fillUsbTemplate(
  template: string,
  payload: PetUsbAnnouncePayload
): string {
  const ports = payload.ports
    .map((p) => p.portName)
    .filter(Boolean)
    .join(pickLocale() === "zh" ? "、" : ", ");
  const added = payload.added.join(pickLocale() === "zh" ? "、" : ", ");
  return template
    .replaceAll("{ports}", ports || "—")
    .replaceAll("{added}", added || "—");
}

export function pickUsbLine(
  payload: PetUsbAnnouncePayload,
  personality: PetPersonality = "sunny",
  opts?: PetLinePickOptions,
  model: PetModelKind = "chip"
): string {
  const custom = enabledCustomLineTexts(opts?.customLines ?? [], "usb").map(
    (t) => fillUsbTemplate(t, payload)
  );
  const builtIn = lineCatOn("usb", opts)
    ? [buildUsbAnnounceText(payload, pickLocale(), model)]
    : [];

  if (opts?.customLinesOnly && custom.length > 0) {
    return withFlavor(pickFromPool(custom), personality, model);
  }
  const pool = opts?.customLinesOnly
    ? custom.length > 0
      ? custom
      : builtIn
    : [...custom, ...builtIn];
  const line = pickFromPool(pool);
  if (!line) return "";
  return custom.includes(line) ? withFlavor(line, personality, model) : line;
}

export function pickMotionLine(
  motion: string,
  tone: PetTone,
  personality: PetPersonality = "sunny",
  model: PetModelKind = "chip",
  opts?: PetLinePickOptions
): string {
  if (!lineCatOn("motion", opts)) return "";
  const zh = pickLocale() === "zh";
  const bundle = packFor(model).motionLines;
  const pool = (zh ? bundle?.zh : bundle?.en)?.[motion];
  if (pool?.length) {
    const line = pool[Math.floor(Math.random() * pool.length)]!;
    return withFlavor(line, personality, model);
  }
  return pickPetLine(tone, null, personality, model, opts);
}
