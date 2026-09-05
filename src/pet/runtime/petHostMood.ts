import type { PetMood } from "@/pet/data/types";
import type { PetIdleMotion } from "@/pet/content/motion/motions";

/**
 * mood 变更原因。写入一律走 applyPetMood，host 里别直接改 mood.value。
 */
export type PetMoodReason =
  | "speak"
  | "speak-end"
  | "motion"
  | "motion-end"
  | "sleep"
  | "wake"
  | "usb-wake"
  | "drag-start"
  | "drag-end"
  | "chat-reply"
  | "chat-reply-end"
  | "playful-flee"
  | "playful-catch"
  | "playful-miss"
  | "peek-hide"
  | "peek-reveal"
  | "drag-land"
  | "bubble-pong"
  | "desk-weather"
  | "force";

export type PetMoodGateCtx = {
  getMood: () => PetMood;
  setMood: (mood: PetMood) => void;
  speaking: () => boolean;
  dragging: () => boolean;
  isMotionLocked: () => boolean;
};

export type ApplyPetMood = (
  next: PetMood,
  reason: PetMoodReason
) => boolean;

/** 内置动作 → 展示 mood（不做互斥判断）。 */
export function moodForMotion(motion: PetIdleMotion): PetMood {
  switch (motion) {
    case "happy-bounce":
    case "victory-burst":
    case "rocket-jump":
    case "cartwheel":
    case "tap-frenzy":
    case "toon-wave":
    case "toon-tilt":
    case "toon-tea":
    case "toon-water":
    case "toon-grass":
    case "toon-splash":
    case "sway-step":
    case "side-hop":
    case "bow-nod":
    case "tip-toe":
    case "stretch-up":
      return "happy";
    case "toon-fire":
    case "toon-thunder":
    case "screen-wormhole":
    case "fly-orbit":
    case "fly-dash":
    case "barrel-roll":
    case "figure-eight":
    case "screen-dash":
    case "screen-hop":
    case "screen-glide":
    case "screen-zip":
    case "toon-walk":
    case "vrm-walk":
      return "excited";
    case "toon-dodge":
    case "toon-spin":
    case "toon-read":
      return "curious";
    default:
      return "idle";
  }
}

function canReturnToIdle(ctx: PetMoodGateCtx, reason: PetMoodReason): boolean {
  if (ctx.getMood() === "sleep") return false;
  if (ctx.dragging()) return false;
  // speak-end / chat-reply-end 触发时气泡可能还在，不要用 speaking 挡回 idle
  if (
    reason !== "speak-end" &&
    reason !== "chat-reply-end" &&
    ctx.speaking()
  ) {
    return false;
  }
  if (
    (reason === "speak-end" || reason === "chat-reply-end") &&
    ctx.isMotionLocked()
  ) {
    return false;
  }
  return true;
}

/**
 * mood 唯一写入入口（含 speaking/drag/sleep 互斥）。
 * @returns 是否改写了 mood
 */
export function applyPetMood(
  next: PetMood,
  reason: PetMoodReason,
  ctx: PetMoodGateCtx
): boolean {
  const cur = ctx.getMood();

  switch (reason) {
    case "force":
      ctx.setMood(next);
      return true;

    case "sleep":
      ctx.setMood("sleep");
      return true;

    case "wake":
    case "usb-wake":
      if (cur !== "sleep") return false;
      ctx.setMood(next === "sleep" ? "idle" : next);
      return true;

    case "speak":
    case "chat-reply":
      // 说话/聊天闪态可盖过 motion mood；drag 在上游已挡 speak
      ctx.setMood(next);
      return true;

    case "drag-start":
      ctx.setMood("curious");
      return true;

    case "playful-flee":
    case "peek-hide":
      if (ctx.dragging() || cur === "sleep") return false;
      ctx.setMood("curious");
      return true;

    case "playful-catch":
    case "peek-reveal":
    case "drag-land":
      if (cur === "sleep") return false;
      ctx.setMood("happy");
      return true;

    case "playful-miss":
    case "bubble-pong":
      if (ctx.dragging() || cur === "sleep") return false;
      ctx.setMood("grumpy");
      return true;

    case "desk-weather":
      if (ctx.dragging() || cur === "sleep" || ctx.speaking()) return false;
      ctx.setMood(next);
      return true;

    case "motion":
      // speaking / drag / sleep 优先于 motion mood
      if (ctx.speaking() || ctx.dragging() || cur === "sleep") return false;
      ctx.setMood(next);
      return true;

    case "speak-end":
    case "motion-end":
    case "drag-end":
    case "chat-reply-end":
      if (!canReturnToIdle(ctx, reason)) return false;
      ctx.setMood("idle");
      return true;

    default:
      return false;
  }
}

export function createApplyPetMood(ctx: PetMoodGateCtx): ApplyPetMood {
  return (next, reason) => applyPetMood(next, reason, ctx);
}
