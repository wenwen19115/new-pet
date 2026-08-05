export function playfulScareRadius(bodyW: number, bodyH: number): number {
  return Math.max(130, Math.hypot(bodyW, bodyH) * 0.55 + 48);
}

export function cursorNearPet(
  cursor: { x: number; y: number },
  winCenter: { x: number; y: number },
  scareRadius: number
): boolean {
  return Math.hypot(cursor.x - winCenter.x, cursor.y - winCenter.y) <= scareRadius;
}

export const PLAYFUL_CHASE_MS = 10_000;
/** 右键「调皮一下」：单次会话上限；超时未抓到则结束，不改设置里的常驻开关 */
export const PLAYFUL_MENU_BURST_MS = 10_000;
/** 躲开落地后只有这段时间点中算抓到；过了窗口仍在追逐里点不算 */
export const PLAYFUL_CATCH_WINDOW_MS = 650;
export const PLAYFUL_POST_CATCH_COOLDOWN_MS = 4200;
export const PLAYFUL_POST_MISS_COOLDOWN_MS = 5200;
export const PLAYFUL_MISS_STREAK_NEED = 3;

export type PlayfulMissStreakResult = {
  missStreak: number;
  sulk: boolean;
};

/** 是否处在可抓窗口（catchUntil 为落地截止时间戳） */
export function canPlayfulCatch(now: number, catchUntil: number): boolean {
  return catchUntil > 0 && now < catchUntil;
}

/** 连空计数：满 3 次嫌弃并重置 */
export function advancePlayfulMissStreak(
  prev: number
): PlayfulMissStreakResult {
  const next = prev + 1;
  if (next >= PLAYFUL_MISS_STREAK_NEED) {
    return { missStreak: 0, sulk: true };
  }
  return { missStreak: next, sulk: false };
}
