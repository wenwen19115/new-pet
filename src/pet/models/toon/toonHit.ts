/** NDC → 像素格；仅 x/y 参与占用。 */
type ToonHitCell = { x: number; y: number };

const TOON_HIT_GRID = 40;

/** 从像素列表建占用表，并 1 格膨胀，避免缝隙难点。 */
export function buildToonHitMask(lists: ToonHitCell[][]): Uint8Array {
  const n = TOON_HIT_GRID;
  const raw = new Uint8Array(n * n);
  for (const list of lists) {
    for (const p of list) {
      if (p.x < 0 || p.y < 0 || p.x >= n || p.y >= n) continue;
      raw[p.y * n + p.x] = 1;
    }
  }
  const out = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let hit = raw[y * n + x] === 1;
      if (!hit) {
        for (let dy = -1; dy <= 1 && !hit; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
            if (raw[ny * n + nx] === 1) {
              hit = true;
              break;
            }
          }
        }
      }
      if (hit) out[y * n + x] = 1;
    }
  }
  return out;
}

export function testToonHitMask(
  mask: Uint8Array,
  ndcX: number,
  ndcY: number
): boolean {
  const n = TOON_HIT_GRID;
  const gx = Math.floor(((ndcX + 1) / 2) * n);
  const gy = Math.floor(((1 - ndcY) / 2) * n);
  if (gx < 0 || gy < 0 || gx >= n || gy >= n) return false;
  return mask[gy * n + gx] === 1;
}
