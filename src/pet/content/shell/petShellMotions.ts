import type { PetIdleMotion } from "../motion/motions";
import type { PetModelKind } from "../../skins/types";
import type { PetMood } from "../../data/types";

/** 壳层 bob（`.chip-bob`），不是模型内部像素/VRM 表演。 */
export type PetShellAnimSpec = {
  name: string;
  duration: string;
  easing: string;
  iteration?: string;
  /** 有限次默认 both，infinite 默认 none */
  fill?: string;
  onlyModels?: readonly PetModelKind[];
};

const CHIP_ONLY = ["chip"] as const satisfies readonly PetModelKind[];

/**
 * `data-idle` → 壳层 bob。表里没有的交给模型内部（toon/fig/vrm）或不做 bob。
 */
export const PET_SHELL_IDLE_ANIMS: Partial<
  Record<PetIdleMotion, PetShellAnimSpec>
> = {
  "idle-float": {
    name: "pet-shell-idle-float",
    duration: "3.8s",
    easing: "ease-in-out",
    iteration: "infinite",
    onlyModels: CHIP_ONLY,
  },
  "happy-bounce": {
    name: "pet-shell-happy-bounce",
    duration: "0.55s",
    easing: "ease-out",
    fill: "none",
    onlyModels: CHIP_ONLY,
  },
  "fly-orbit": {
    name: "pet-shell-fly-orbit",
    duration: "3.2s",
    easing: "linear",
    onlyModels: CHIP_ONLY,
  },
  "fly-dash": {
    name: "pet-shell-fly-dash",
    duration: "2.8s",
    easing: "cubic-bezier(0.37, 0.01, 0.2, 1)",
    onlyModels: CHIP_ONLY,
  },
  "barrel-roll": {
    name: "pet-shell-barrel-roll",
    duration: "2.6s",
    easing: "linear",
    onlyModels: CHIP_ONLY,
  },
  "rocket-jump": {
    name: "pet-shell-rocket-jump",
    duration: "2.3s",
    easing: "cubic-bezier(0.22, 0.85, 0.28, 1)",
    onlyModels: CHIP_ONLY,
  },
  cartwheel: {
    name: "pet-shell-cartwheel",
    duration: "2.5s",
    easing: "linear",
    onlyModels: CHIP_ONLY,
  },
  "figure-eight": {
    name: "pet-shell-figure-eight",
    duration: "3.4s",
    easing: "linear",
    onlyModels: CHIP_ONLY,
  },
  "victory-burst": {
    name: "pet-shell-victory-burst",
    duration: "2.2s",
    easing: "cubic-bezier(0.34, 1.15, 0.64, 1)",
    onlyModels: CHIP_ONLY,
  },
  "screen-dash": {
    name: "pet-shell-screen-lean",
    duration: "0.95s",
    easing: "cubic-bezier(0.33, 0.1, 0.2, 1)",
  },
  "screen-zip": {
    name: "pet-shell-screen-lean",
    duration: "0.95s",
    easing: "cubic-bezier(0.33, 0.1, 0.2, 1)",
  },
  "screen-hop": {
    name: "pet-shell-rocket-jump",
    duration: "1.5s",
    easing: "cubic-bezier(0.22, 0.85, 0.28, 1)",
  },
  "screen-glide": {
    name: "pet-shell-screen-glide-bob",
    duration: "1.9s",
    easing: "cubic-bezier(0.4, 0.05, 0.2, 1)",
  },
  "tap-frenzy": {
    name: "pet-shell-tap-frenzy",
    duration: "1.8s",
    easing: "cubic-bezier(0.34, 1.3, 0.64, 1)",
  },
};

/** 睡眠呼吸 bob；需调用方传入 `shellSleepBob`。 */
export const PET_SHELL_SLEEP_ANIM: PetShellAnimSpec = {
  name: "pet-shell-breathe",
  duration: "3.2s",
  easing: "ease-in-out",
  iteration: "infinite",
};

export function petShellAnimToCss(spec: PetShellAnimSpec): string {
  const iteration = spec.iteration ?? "1";
  const fill =
    spec.fill ?? (iteration === "infinite" ? "none" : "both");
  return `${spec.name} ${spec.duration} ${spec.easing} ${iteration} ${fill}`;
}

export function listPetShellKeyframeNames(): string[] {
  const names = new Set<string>();
  for (const spec of Object.values(PET_SHELL_IDLE_ANIMS)) {
    if (spec) names.add(spec.name);
  }
  names.add(PET_SHELL_SLEEP_ANIM.name);
  return [...names].sort();
}

export function listPetShellCoveredIdleMotions(): PetIdleMotion[] {
  return Object.keys(PET_SHELL_IDLE_ANIMS) as PetIdleMotion[];
}

function modelAllowed(
  model: string,
  only?: readonly PetModelKind[]
): boolean {
  if (!only?.length) return true;
  return (only as readonly string[]).includes(model);
}

/** 解析 `.chip-bob` 的 CSS animation；无则 null。物理态 / VRM 壳由调用方跳过。 */
export function resolvePetShellBobAnimation(opts: {
  model: PetModelKind | string;
  idle: string;
  mood: PetMood | string;
  physicsActive: boolean;
  /** 角色是否具备 shell-sleep-bob（由调用方查 capability） */
  shellSleepBob?: boolean;
}): string | null {
  if (opts.physicsActive) return null;

  if (opts.mood === "sleep" && opts.shellSleepBob) {
    return petShellAnimToCss(PET_SHELL_SLEEP_ANIM);
  }

  const spec = PET_SHELL_IDLE_ANIMS[opts.idle as PetIdleMotion];
  if (!spec) return null;
  if (!modelAllowed(String(opts.model), spec.onlyModels)) return null;
  return petShellAnimToCss(spec);
}
