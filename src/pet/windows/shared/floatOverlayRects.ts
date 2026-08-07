/** 气泡 / 右键菜单等独立 HWND 的共存避让 */

type OverlayRect = { x: number; y: number; w: number; h: number };

let bubbleRect: OverlayRect | null = null;
let menuRect: OverlayRect | null = null;

export function setBubbleOverlayRect(rect: OverlayRect | null) {
  bubbleRect = rect;
}

export function getBubbleOverlayRect(): OverlayRect | null {
  return bubbleRect;
}

export function setMenuOverlayRect(rect: OverlayRect | null) {
  menuRect = rect;
}

export function getMenuOverlayRect(): OverlayRect | null {
  return menuRect;
}

export function rectsOverlap(
  a: OverlayRect,
  b: OverlayRect,
  pad = 10
): boolean {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

function clamp(n: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, n));
}

/**
 * 在工作区内挪开障碍物；优先对侧 → 下 → 上 → 原位微调。
 * 不隐藏任一方。
 */
export function nudgeAwayFromObstacle(
  place: { x: number; y: number },
  self: { w: number; h: number },
  obstacle: OverlayRect | null,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  pet: {
    centerX: number;
    bodyLeft: number;
    bodyRight: number;
    gap: number;
  }
): { x: number; y: number } {
  if (!obstacle) return place;

  const pad = 10;
  const tryPlace = (x: number, y: number) => {
    const nx = clamp(x, bounds.minX, bounds.maxX);
    const ny = clamp(y, bounds.minY, bounds.maxY);
    const rect = { x: nx, y: ny, w: self.w, h: self.h };
    return { x: nx, y: ny, ok: !rectsOverlap(rect, obstacle, pad) };
  };

  const cur = tryPlace(place.x, place.y);
  if (cur.ok) return { x: cur.x, y: cur.y };

  const obstMidX = obstacle.x + obstacle.w / 2;
  const obstOnRight = obstMidX >= pet.centerX;

  // 1) 角色另一侧
  {
    const x = obstOnRight
      ? pet.bodyLeft - pet.gap - self.w
      : pet.bodyRight + pet.gap;
    const hit = tryPlace(x, place.y);
    if (hit.ok) return { x: hit.x, y: hit.y };
  }

  // 2) 障碍下方
  {
    const hit = tryPlace(place.x, obstacle.y + obstacle.h + pad);
    if (hit.ok) return { x: hit.x, y: hit.y };
  }

  // 3) 障碍上方
  {
    const hit = tryPlace(place.x, obstacle.y - self.h - pad);
    if (hit.ok) return { x: hit.x, y: hit.y };
  }

  // 4) 对侧 + 下移
  {
    const x = obstOnRight
      ? pet.bodyLeft - pet.gap - self.w
      : pet.bodyRight + pet.gap;
    const hit = tryPlace(x, obstacle.y + obstacle.h + pad);
    if (hit.ok) return { x: hit.x, y: hit.y };
  }

  // 5) 对侧 + 上移
  {
    const x = obstOnRight
      ? pet.bodyLeft - pet.gap - self.w
      : pet.bodyRight + pet.gap;
    const hit = tryPlace(x, obstacle.y - self.h - pad);
    if (hit.ok) return { x: hit.x, y: hit.y };
  }

  return { x: cur.x, y: cur.y };
}
