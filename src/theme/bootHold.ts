import {
  BOOT_ANIM_MIN_SEC,
  clampBootDurationSec,
  type ThemeBootDurationMode,
} from "./types";
import type { ThemeMediaKind } from "./media";

/** auto / media 至少 3s；manual 用设置秒数 */
export function bootHoldMs(
  mode: ThemeBootDurationMode,
  durationSec: number
): number {
  if (mode === "manual") {
    return clampBootDurationSec(durationSec) * 1000;
  }
  return BOOT_ANIM_MIN_SEC * 1000;
}

/** 相对就绪时刻，补足最少 3s 的剩余毫秒 */
export function bootRemainMinMs(readyAtMs: number, now = Date.now()): number {
  return Math.max(0, BOOT_ANIM_MIN_SEC * 1000 - (now - readyAtMs));
}

/** null = media+视频且未 ended，等 ended 再调 bootRemainMinMs */
export function bootScheduleDelayMs(input: {
  durationMode: ThemeBootDurationMode;
  durationSec: number;
  mediaKind: ThemeMediaKind;
  videoEnded: boolean;
  readyAtMs: number;
}): number | null {
  const { durationMode, durationSec, mediaKind, videoEnded, readyAtMs } =
    input;
  if (durationMode === "media" && mediaKind === "video") {
    if (videoEnded) return bootRemainMinMs(readyAtMs);
    return null;
  }
  return bootHoldMs(durationMode, durationSec);
}
