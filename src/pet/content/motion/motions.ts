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
  | "peekaboo"
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
  | "vrm-scratch";

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
  "peekaboo",
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
  "peekaboo",
  "screen-glide",
];

export const PET_TOON_DEMO_MOTIONS: PetIdleMotion[] = [
  "toon-grass",
  "toon-thunder",
  "toon-walk",
  "toon-tilt",
  "toon-sway",
  "happy-bounce",
  "peekaboo",
  "screen-wormhole",
];

export const PET_VRM_DEMO_MOTIONS: PetIdleMotion[] = [
  "idle-float",
  "happy-bounce",
  "sway-step",
  "bow-nod",
  "stretch-up",
  "peekaboo",
  "victory-burst",
  "vrm-scratch",
  "vrm-walk",
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
    "idle-float",
    "happy-bounce",
    "tap-frenzy",
    "rocket-jump",
    "cartwheel",
    "toon-spin",
    "vrm-walk",
    "vrm-scratch",
  ]),
];

export function isPetIdleMotion(value: unknown): value is PetIdleMotion {
  return typeof value === "string" && (ALL_MOTIONS as string[]).includes(value);
}

export function motionHoldMs(motion: PetIdleMotion): number {
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
    case "vrm-scratch":
      return 4200;
    case "rocket-jump":
      return 2350;
    case "victory-burst":
    case "peekaboo":
      return 4200;
    case "tap-frenzy":
      return 2800;
    case "happy-bounce":
      return 4200;
    default:
      return 1200;
  }
}

export const PET_TAP_EGG_MOTIONS: PetIdleMotion[] = [
  "tap-frenzy",
  "screen-zip",
  "victory-burst",
  "peekaboo",
  "toon-thunder",
  "screen-wormhole",
];
