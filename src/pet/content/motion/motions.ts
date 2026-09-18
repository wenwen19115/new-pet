import { findVrmaMotion } from "./vrmaMotions";

export type PetIdleMotion =
  | "idle-float"
  | "happy-bounce"
  | "fly-orbit"
  | "fly-dash"
  | "barrel-roll"
  | "rocket-jump"
  | "cartwheel"
  | "figure-eight"
  | "victory-burst"
  | "sway-step"
  | "side-hop"
  | "bow-nod"
  | "stretch-up"
  | "tip-toe"
  | "screen-dash"
  | "screen-hop"
  | "screen-glide"
  | "screen-zip"
  | "screen-wormhole"
  | "tap-frenzy"
  | "toon-walk"
  | "toon-wave"
  /** @deprecated 旧「原地打转」；解析时映射为 toon-sway */
  | "toon-spin"
  | "toon-read"
  | "toon-tea"
  | "toon-tilt"
  | "toon-sway"
  | "toon-water"
  | "toon-grass"
  | "toon-fire"
  | "toon-splash"
  | "toon-thunder"
  | "toon-dodge"
  | "vrm-walk"
  | "vrm-idle"
  | "vrm-idle2"
  | "vrm-idle3"
  | "vrm-idle4"
  | "vrm-idle5"
  | "vrm-idle6"
  | "vrm-talk"
  | "vrm-wave"
  | "vrm-greet"
  | "vrm-peace"
  | "vrm-pose"
  | "vrm-showcase"
  | "vrm-shoot"
  | "vrm-squat"
  | "vrm-twirl"
  | "vrm-clap"
  | "vrm-jump"
  | "vrm-think"
  | "vrm-look"
  | "vrm-surprise"
  | "vrm-relax"
  | "vrm-angry"
  | "vrm-blush"
  | "vrm-sad"
  | "vrm-sleepy"
  | "vrm-accad-conversation-gestures"
  | "vrm-accad-crouch"
  | "vrm-accad-lift-box"
  | "vrm-accad-look"
  | "vrm-accad-pick-up-box"
  | "vrm-accad-random-gestures"
  | "vrm-accad-stand"
  | "vrm-accad-sway"
  | "vrm-accad-swing-arms"
  | "vrm-accad-wait"
  /** 杯杯：冒汽 / 呼噜 / 倾斜 / 小啜 / 趴睡 / 盯人 */
  | "mug-steam"
  | "mug-purr"
  | "mug-tip"
  | "mug-sip"
  | "mug-nap"
  | "mug-stare";

export const PET_CHIP_DEMO_MOTIONS: PetIdleMotion[] = [
  "screen-dash",
  "screen-hop",
  "screen-glide",
  "screen-zip",
  "fly-dash",
  "fly-orbit",
  "figure-eight",
  "barrel-roll",
  "victory-burst",
];

export const PET_FIG_DEMO_MOTIONS: PetIdleMotion[] = [
  "happy-bounce",
  "sway-step",
  "side-hop",
  "tip-toe",
  "bow-nod",
  "stretch-up",
  "rocket-jump",
  "victory-burst",
  "screen-glide",
];

export const PET_TOON_DEMO_MOTIONS: PetIdleMotion[] = [
  "toon-grass",
  "toon-thunder",
  "toon-walk",
  "toon-tilt",
  "toon-sway",
  "happy-bounce",
  "screen-wormhole",
];

/** 杯杯：汽 / 呼噜 / 歪 / 啜 / 睡 / 盯 */
export const PET_MUG_DEMO_MOTIONS: PetIdleMotion[] = [
  "mug-steam",
  "mug-purr",
  "mug-tip",
  "mug-sip",
  "mug-nap",
  "mug-stare",
  "sway-step",
];

export const PET_VRM_DEMO_MOTIONS: PetIdleMotion[] = [
  // aikeya idle / talk
  "vrm-idle",
  "vrm-idle2",
  "vrm-idle3",
  "vrm-idle4",
  "vrm-idle5",
  "vrm-idle6",
  "vrm-talk",
  // VRoid VRMA_01–07（经 aikeya）
  "vrm-showcase",
  "vrm-greet",
  "vrm-peace",
  "vrm-shoot",
  "vrm-twirl",
  "vrm-pose",
  "vrm-squat",
  // vrm-viewer 补充
  "vrm-wave",
  "vrm-think",
  "vrm-look",
  "vrm-blush",
  "vrm-relax",
  "vrm-sleepy",
  "vrm-sad",
  "vrm-clap",
  "vrm-jump",
  "vrm-surprise",
  "vrm-angry",
  // ACCAD Female1 原地子集
  "vrm-accad-conversation-gestures",
  "vrm-accad-crouch",
  "vrm-accad-lift-box",
  "vrm-accad-look",
  "vrm-accad-pick-up-box",
  "vrm-accad-random-gestures",
  "vrm-accad-stand",
  "vrm-accad-sway",
  "vrm-accad-swing-arms",
  "vrm-accad-wait",
];

export function isScreenFlightMotion(motion: PetIdleMotion): boolean {
  return (
    motion === "screen-dash" ||
    motion === "screen-hop" ||
    motion === "screen-glide" ||
    motion === "screen-zip" ||
    motion === "screen-wormhole"
  );
}

export function isVrmWalkMotion(motion: PetIdleMotion): boolean {
  return motion === "vrm-walk";
}

export const PET_MOTION_EVENT = "pet://play-motion";
export const PET_OPEN_SETTINGS_EVENT = "pet://open-settings";

export interface PetMotionPayload {
  /** Built-in idle motion id, or `custom:…` Susu motion id */
  motion: PetIdleMotion | string;
}

const ALL_MOTIONS: PetIdleMotion[] = [
  ...new Set<PetIdleMotion>([
    ...PET_CHIP_DEMO_MOTIONS,
    ...PET_FIG_DEMO_MOTIONS,
    ...PET_TOON_DEMO_MOTIONS,
    ...PET_VRM_DEMO_MOTIONS,
    ...PET_MUG_DEMO_MOTIONS,
    "idle-float",
    "happy-bounce",
    "tap-frenzy",
    "rocket-jump",
    "cartwheel",
    "toon-spin",
    "vrm-walk",
  ]),
];

export function isPetIdleMotion(value: unknown): value is PetIdleMotion {
  return typeof value === "string" && (ALL_MOTIONS as string[]).includes(value);
}

export function motionHoldMs(motion: PetIdleMotion): number {
  // VRMA 时长以 vrmaMotions 为 SoT，避免双写
  const vrma = findVrmaMotion(motion);
  if (vrma) return vrma.durationMs;
  switch (motion) {
    case "screen-wormhole":
      return 1300;
    case "screen-dash":
    case "screen-zip":
      return 1600;
    case "screen-hop":
      return 1900;
    case "screen-glide":
      return 2200;
    case "vrm-walk":
      return 13000;
    case "fly-orbit":
      return 3250;
    case "figure-eight":
    case "toon-sway":
    case "toon-read":
    case "toon-tea":
    case "toon-water":
    case "toon-grass":
      return 3450;
    case "fly-dash":
    case "side-hop":
    case "tip-toe":
    case "toon-walk":
    case "toon-wave":
    case "toon-tilt":
    case "toon-fire":
    case "toon-splash":
    case "toon-thunder":
    case "toon-dodge":
      return 2850;
    case "barrel-roll":
    case "cartwheel":
      return 2650;
    case "bow-nod":
      return 5600;
    case "stretch-up":
      return 4800;
    case "sway-step":
      return 4200;
    case "rocket-jump":
      return 2350;
    case "victory-burst":
      return 4200;
    case "tap-frenzy":
      return 2800;
    case "happy-bounce":
      return 4800;
    case "mug-steam":
      return 2600;
    case "mug-purr":
      return 2400;
    case "mug-sip":
      return 2200;
    case "mug-stare":
      return 3200;
    case "mug-nap":
      return 4000;
    case "mug-tip":
      return 3000;
    default:
      return 1200;
  }
}

export const PET_TAP_EGG_MOTIONS: PetIdleMotion[] = [
  "tap-frenzy",
  "screen-zip",
  "victory-burst",
  "toon-thunder",
  "screen-wormhole",
];
