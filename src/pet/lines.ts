import type { PetModelKind } from "./skins/types";
import type { PetTone } from "./types";
import { flavorPetLine, type PetPersonality } from "./personality";
import {
  enabledCustomLineTexts,
  type PetCustomLine,
  type PetLineScene,
} from "./customLines";
import { getPetLocale } from "./locale";
import { buildUsbAnnounceText } from "./usbFormat";
import type { PetUsbAnnouncePayload } from "./types";
import { getCharacter } from "./characters";
import type { BuiltInLineCategory } from "./characters/lineTypes";

export interface PetLinePickOptions {
  customLines?: PetCustomLine[];
  customLinesOnly?: boolean;
  /** Categories closed like motion toggles */
  disabledBuiltInLines?: string[];
  lookId?: string;
}

const CARE_ZH = [
  "喝口水吧，嘴巴别只用来叹气。",
  "抬抬头，让颈椎透透气。",
  "远眺二十秒：眼睛保养小程序已启动。",
  "站起来走两步，血液循环会感谢你。",
  "该眨眼了。真的，现在就眨。",
  "适当休息不是偷懒，是续航策略。",
  "肩膀往下沉一点……对，别端着。",
];

const CARE_EN = [
  "Drink water. Sighing doesn't hydrate.",
  "Lift your chin. Give the neck some air.",
  "Look afar for twenty seconds. Eye care routine.",
  "Stand and walk two steps. Circulation thanks you.",
  "Blink. Really. Now.",
  "Rest isn't laziness. It's battery strategy.",
  "Drop your shoulders… yes, like that.",
];

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

function personalityLines(
  model: PetModelKind,
  personality: PetPersonality
) {
  return getCharacter(model).lines.byPersonality[personality];
}

function packLang(pack: { zh: string[]; en: string[] }): string[] {
  return pickLocale() === "zh" ? pack.zh : pack.en;
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
  const pack = getCharacter(model).lines.byLook?.[lookId];
  return pack ? packLang(pack) : [];
}

function carePool(): string[] {
  return pickLocale() === "zh" ? CARE_ZH : CARE_EN;
}

export function pickPetLine(
  tone: PetTone,
  avoid: string | null = null,
  personality: PetPersonality = "sunny",
  model: PetModelKind = "chip",
  opts?: PetLinePickOptions
): string {
  const lang = pickLocale();
  const customIdle = enabledCustomLineTexts(opts?.customLines ?? [], "idle");

  if (opts?.customLinesOnly && customIdle.length > 0) {
    const next = pickFromPool(customIdle, avoid);
    return next ? flavorPetLine(next, personality, lang) : "";
  }

  if (
    !opts?.customLinesOnly &&
    lineCatOn("personality", opts) &&
    Math.random() < 0.4
  ) {
    const special = pickFromPool(flavorPool(model, personality), avoid);
    if (special && (!avoid || special !== avoid)) {
      return flavorPetLine(special, personality, lang);
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
    builtIn.push(...carePool());
  }
  if (
    !opts?.customLinesOnly &&
    lineCatOn("idle", opts) &&
    Math.random() < 0.22
  ) {
    builtIn.push(...lookPool(model, opts?.lookId));
  }

  const pool = mergeScenePool(builtIn, "idle", opts);
  const next = pickFromPool(pool, avoid);
  return next ? flavorPetLine(next, personality, lang) : "";
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
  const line = pickFromPool(pool);
  return line ? flavorPetLine(line, personality, pickLocale()) : "";
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

/** USB 插拔：自定义句 ∪ 内置格式化文案 */
export function pickUsbLine(
  payload: PetUsbAnnouncePayload,
  personality: PetPersonality = "sunny",
  opts?: PetLinePickOptions
): string {
  const custom = enabledCustomLineTexts(opts?.customLines ?? [], "usb").map(
    (t) => fillUsbTemplate(t, payload)
  );
  const builtIn = lineCatOn("usb", opts)
    ? [buildUsbAnnounceText(payload, pickLocale())]
    : [];

  if (opts?.customLinesOnly && custom.length > 0) {
    return flavorPetLine(pickFromPool(custom), personality, pickLocale());
  }
  const pool = opts?.customLinesOnly
    ? custom.length > 0
      ? custom
      : builtIn
    : [...custom, ...builtIn];
  const line = pickFromPool(pool);
  if (!line) return "";
  return custom.includes(line)
    ? flavorPetLine(line, personality, pickLocale())
    : line;
}

/** 按动作挑一句（试播 / 随机动作时用） */
export function pickMotionLine(
  motion: string,
  tone: PetTone,
  personality: PetPersonality = "sunny",
  model: PetModelKind = "chip",
  opts?: PetLinePickOptions
): string {
  if (!lineCatOn("motion", opts)) return "";
  const zh = pickLocale() === "zh";
  const bundle = getCharacter(model).lines.motionLines;
  const pool = (zh ? bundle?.zh : bundle?.en)?.[motion];
  if (pool?.length) {
    const line = pool[Math.floor(Math.random() * pool.length)]!;
    return flavorPetLine(line, personality, pickLocale());
  }
  return pickPetLine(tone, null, personality, model, opts);
}
