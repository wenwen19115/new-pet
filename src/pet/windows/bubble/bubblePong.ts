export const BUBBLE_PONG_ANNOY_NEED = 3;
/** 点一下后多挂一会儿，免得弹着玩时气泡先没 */
export const BUBBLE_PONG_HOLD_MS = 2800;

export type BubblePongTapResult = {
  taps: number;
  annoyed: boolean;
};

export function advanceBubblePongTap(prev: number): BubblePongTapResult {
  const next = prev + 1;
  if (next >= BUBBLE_PONG_ANNOY_NEED) {
    return { taps: 0, annoyed: true };
  }
  return { taps: next, annoyed: false };
}
