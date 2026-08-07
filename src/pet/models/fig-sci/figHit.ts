/**
 * fig PNG alpha 命中。
 * 布局对齐 figSciModel.css：root padding + object-fit:contain + bottom。
 */

const PAD_L = 0.03;
const PAD_R = 0.03;
const PAD_T = 0.02;
const PAD_B = 0.04;
const ALPHA_MIN = 24;

export type FigAlphaMap = {
  w: number;
  h: number;
  /** 每像素 alpha 0–255 */
  alpha: Uint8Array;
};

const cache = new Map<string, FigAlphaMap | null>();
const inflight = new Map<string, Promise<FigAlphaMap | null>>();

export function loadFigAlphaMap(src: string): Promise<FigAlphaMap | null> {
  const hit = cache.get(src);
  if (hit !== undefined) return Promise.resolve(hit);
  const pending = inflight.get(src);
  if (pending) return pending;

  const job = new Promise<FigAlphaMap | null>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w < 1 || h < 1) {
          cache.set(src, null);
          resolve(null);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          cache.set(src, null);
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, w, h).data;
        const alpha = new Uint8Array(w * h);
        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
          alpha[p] = data[i + 3]!;
        }
        const map: FigAlphaMap = { w, h, alpha };
        cache.set(src, map);
        resolve(map);
      } catch {
        cache.set(src, null);
        resolve(null);
      } finally {
        inflight.delete(src);
      }
    };
    img.onerror = () => {
      cache.set(src, null);
      inflight.delete(src);
      resolve(null);
    };
    img.src = src;
  });
  inflight.set(src, job);
  return job;
}

/** bodyAspect = bodyW / bodyH（与桌宠本体框一致） */
export function testFigAlphaHit(
  map: FigAlphaMap,
  ndcX: number,
  ndcY: number,
  bodyAspect: number
): boolean {
  const u = (ndcX + 1) / 2;
  const v = (1 - ndcY) / 2;
  const contentW = 1 - PAD_L - PAD_R;
  const contentH = 1 - PAD_T - PAD_B;
  const cu = (u - PAD_L) / contentW;
  const cv = (v - PAD_T) / contentH;
  if (cu < 0 || cv < 0 || cu > 1 || cv > 1) return false;

  const boxAspect = Math.max(0.05, bodyAspect) * (contentW / contentH);
  const imgAspect = map.w / Math.max(1, map.h);
  let drawW: number;
  let drawH: number;
  if (imgAspect > boxAspect) {
    drawW = 1;
    drawH = boxAspect / imgAspect;
  } else {
    drawH = 1;
    drawW = imgAspect / boxAspect;
  }
  // object-position: center bottom（内容盒归一化坐标）
  const ox = (1 - drawW) / 2;
  const oy = 1 - drawH;
  const lx = cu - ox;
  const ly = cv - oy;
  if (lx < 0 || ly < 0 || lx > drawW || ly > drawH) return false;

  const px = Math.min(map.w - 1, Math.max(0, Math.floor((lx / drawW) * map.w)));
  const py = Math.min(map.h - 1, Math.max(0, Math.floor((ly / drawH) * map.h)));
  return map.alpha[py * map.w + px]! >= ALPHA_MIN;
}
