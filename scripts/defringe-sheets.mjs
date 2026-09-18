/**
 * Kill residual magenta/white fringe on keyed sheets.
 * node scripts/defringe-sheets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PET_ASSETS_ROOT } from "./petAssetsRoot.mjs";

const ROOT = PET_ASSETS_ROOT;
const IDS = ["mug-cat"];

function idx(x, y, w) {
  return (y * w + x) * 4;
}

async function defringe(id) {
  const src = path.join(ROOT, id, "sheet.png");
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const buf = Buffer.from(data);
  let killed = 0;

  const passes = 2;
  for (let p = 0; p < passes; p++) {
    const next = Buffer.from(buf);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = idx(x, y, w);
        const a = buf[i + 3];
        if (a < 8) continue;
        // has transparent neighbor?
        let nearT = false;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [-1, -1],
          [1, -1],
          [-1, 1],
        ]) {
          if (buf[idx(x + dx, y + dy, w) + 3] < 8) {
            nearT = true;
            break;
          }
        }
        if (!nearT) continue;
        const r = buf[i];
        const g = buf[i + 1];
        const b = buf[i + 2];
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        const mx = Math.max(r, g, b);
        const magenta = Math.min(r, b) - g;
        const light = mx >= 150 && sat <= 55;
        const mag = magenta >= 20 && g <= 140;
        if (light || mag || a < 140) {
          next[i] = 0;
          next[i + 1] = 0;
          next[i + 2] = 0;
          next[i + 3] = 0;
          killed++;
        } else if (magenta > 5) {
          // despill leftover
          next[i] = Math.min(r, g + 18);
          next[i + 2] = Math.min(b, g + 18);
        }
      }
    }
    next.copy(buf);
  }

  const out = path.join(ROOT, id, "atlas.png");
  await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(out);
  console.log(`${id}: killed=${killed} -> atlas.png`);
}

for (const id of IDS) await defringe(id);
