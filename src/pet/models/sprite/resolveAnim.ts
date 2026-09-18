import type { PetIdleMotion } from "../../content/motion/motions";
import type { PetMood } from "../../data/types";
import type { SpriteAnimName } from "./atlas";

/** loop=循环；once=播完钉末帧；pingpong=来回拨更像「做了一下」 */
export type SpritePlayback = "loop" | "once" | "pingpong";

export type SpritePlayPlan = {
  anim: SpriteAnimName;
  playback: SpritePlayback;
  flipEvery?: number;
  /** 帧时长倍率：<1 更脆，>1 更懒 */
  pace?: number;
};

/**
 * mood / motion → 行 + 节奏。
 * 简单动作：短 pingpong + 偏脆 pace；复杂/情绪：慢 loop，靠 atlas 逐帧曲线撑 Extreme。
 */
export function resolveSpriteAnim(
  mood: PetMood,
  motion: PetIdleMotion | string,
  idleSwayPace = 1.15
): SpritePlayPlan {
  if (mood === "sleep") {
    return { anim: "waiting", playback: "loop", pace: 1.4 };
  }

  switch (motion) {
    case "screen-dash":
    case "screen-zip":
    case "fly-dash":
      return { anim: "run", playback: "loop", pace: 0.85 };
    case "screen-glide":
    case "screen-hop":
    case "fly-orbit":
      return { anim: "run", playback: "loop", pace: 1.05 };

    case "mug-tip":
      return { anim: "failed", playback: "pingpong", pace: 1.45 };

    case "mug-nap":
      return { anim: "waiting", playback: "loop", pace: 1.5 };

    case "mug-stare":
    case "toon-read":
      return { anim: "review", playback: "pingpong", pace: 1.25 };

    case "mug-purr":
      return { anim: "active", playback: "loop", pace: 1.3 };

    case "mug-steam":
      return { anim: "wave", playback: "pingpong", pace: 0.95 };
    case "tap-frenzy":
      return { anim: "wave", playback: "pingpong", pace: 0.7 };

    case "mug-sip":
      return { anim: "jump", playback: "pingpong", pace: 0.95 };
    case "happy-bounce":
    case "victory-burst":
    case "rocket-jump":
      return {
        anim: "jump",
        playback: "loop",
        pace: 0.9,
      };

    case "side-hop":
      return {
        anim: "jump",
        playback: "loop",
        pace: 0.88,
        flipEvery: 2,
      };

    case "tip-toe":
      return {
        anim: "idle",
        playback: "loop",
        pace: 0.8,
        flipEvery: 1,
      };

    case "sway-step":
    case "toon-walk":
    case "idle-float":
    case "bow-nod":
    case "stretch-up":
      return {
        anim: "idle",
        playback: "loop",
        pace: idleSwayPace,
      };

    default:
      break;
  }

  if (mood === "curious") {
    return { anim: "review", playback: "pingpong", pace: 1.15 };
  }
  if (mood === "happy" || mood === "excited") {
    return { anim: "active", playback: "loop", pace: 0.95 };
  }
  if (mood === "grumpy") {
    return { anim: "failed", playback: "loop", pace: 1.35 };
  }
  return { anim: "idle", playback: "loop", pace: 1 };
}

export function spritePlayLoops(plan: SpritePlayPlan): boolean {
  return plan.playback !== "once";
}
