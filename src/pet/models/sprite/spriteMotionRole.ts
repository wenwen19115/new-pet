import type { PetIdleMotion } from "../../content/motion/motions";

/**
 * 精灵动作分工（A/B）：
 * - gesture：帧演主角，壳/精灵 bob 尽量不抢
 * - ambient：慢呼吸 + 轻壳
 * - hop：轻跳（幅度已压窗内）
 */
export type SpriteMotionRole = "gesture" | "ambient" | "hop";

const GESTURE = new Set<string>(["mug-steam", "tap-frenzy"]);

const HOP = new Set<string>([
  "happy-bounce",
  "side-hop",
  "mug-sip",
  "rocket-jump",
  "victory-burst",
]);

export function spriteMotionRole(
  motion: PetIdleMotion | string | undefined
): SpriteMotionRole {
  if (!motion) return "ambient";
  if (GESTURE.has(motion)) return "gesture";
  if (HOP.has(motion)) return "hop";
  return "ambient";
}
