/** 调皮躲鼠标：纯几何，无 Vue / Tauri。 */

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
/** 落地后可点窗，这段时间不躲开 */
export const PLAYFUL_CATCH_WINDOW_MS = 650;
export const PLAYFUL_POST_CATCH_COOLDOWN_MS = 4200;
export const PLAYFUL_POST_MISS_COOLDOWN_MS = 5200;

export function pickPlayfulLine(
  kind: "start" | "catch" | "miss",
  tone: "cute" | "snarky"
): string {
  if (kind === "start") {
    return tone === "snarky" ? "来啊，抓得到再说。" : "来抓我呀～倒计时开始！";
  }
  if (kind === "catch") {
    return tone === "snarky" ? "……行吧，算你手快。" : "呜被抓住了！你赢啦～";
  }
  return tone === "snarky" ? "哈哈，慢吞吞的。" : "嘿嘿，没抓到～下次再来！";
}
