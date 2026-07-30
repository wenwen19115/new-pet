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
/** 落地后短窗口可点，否则永远抓不到 */
export const PLAYFUL_CATCH_WINDOW_MS = 650;
export const PLAYFUL_POST_CATCH_COOLDOWN_MS = 4200;
export const PLAYFUL_POST_MISS_COOLDOWN_MS = 5200;
export const PLAYFUL_MISS_STREAK_NEED = 3;
export const PLAYFUL_STREAK_PEEK_CHANCE = 0.45;
export const PLAYFUL_STREAK_PEEK_DELAY_MS = 1000;

export type PlayfulMissStreakResult = {
  missStreak: number;
  sulk: boolean;
  maybePeek: boolean;
};

/** 连空计数：满 3 次嫌弃并重置；maybePeek 由 peekRoll 决定 */
export function advancePlayfulMissStreak(
  prev: number,
  peekRoll = Math.random()
): PlayfulMissStreakResult {
  const next = prev + 1;
  if (next >= PLAYFUL_MISS_STREAK_NEED) {
    return {
      missStreak: 0,
      sulk: true,
      maybePeek: peekRoll < PLAYFUL_STREAK_PEEK_CHANCE,
    };
  }
  return { missStreak: next, sulk: false, maybePeek: false };
}
