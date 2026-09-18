/**
 * Re-anchor every cell so opaque content stays horizontally fixed.
 * - mode bottom: align bottom-center (pots / grounded)
 * - mode center: align bbox center
 *
 * node scripts/anchor-atlas-frames.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PET_ASSETS_ROOT } from "./petAssetsRoot.mjs";

const ROOT = PET_ASSETS_ROOT;
const COLS = 8;
const ROWS = 9;

/** @type {Record<string, 'bottom' | 'center'>} */
const MODE = {
  "mug-cat": "bottom",
};

function cellBounds(data, width, col, row, fw, fh) {
  let minX = fw,
    maxX = -1,
    minY = fh,
    maxY = -1;
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const i = ((row * fh + y) * width + (col * fw + x)) * 4;
      if (data[i + 3] < 16) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { minX, maxX, minY, maxY };
}

async function processOne(id) {
  const src = path.join(ROOT, id, "atlas.png");
  if (!fs.existsSync(src)) {
    console.log("skip missing", id);
    return;
  }
  const mode = MODE[id] || "center";
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const fw = Math.floor(info.width / COLS);
  const fh = Math.floor(info.height / ROWS);
  const out = Buffer.alloc(data.length); // transparent

  // target: use first non-empty cell of row 0 as reference, or cell center
  let refMidX = fw / 2;
  let refBottom = fh - 4;
  const b0 = cellBounds(data, info.width, 0, 0, fw, fh);
  if (b0) {
    refMidX = (b0.minX + b0.maxX) / 2;
    refBottom = b0.maxY;
  }

  let moved = 0;
  for (let row = 0; row < ROWS; row++) {
    // per-row reference from first occupied frame (keeps walk cycles relative)
    let rowRefMid = refMidX;
    let rowRefBottom = refBottom;
    for (let c = 0; c < COLS; c++) {
      const b = cellBounds(data, info.width, c, row, fw, fh);
      if (b) {
        rowRefMid = (b.minX + b.maxX) / 2;
        rowRefBottom = b.maxY;
        break;
      }
    }

    // For in-place rows (0,3,4,5,6,7,8) lock ALL frames to same global ref
    // For walk/run rows (1,2) lock within-row to first frame of that row
    const lockGlobal = row !== 1 && row !== 2;
    const midTarget = lockGlobal ? refMidX : rowRefMid;
    const bottomTarget = lockGlobal ? refBottom : rowRefBottom;

    for (let col = 0; col < COLS; col++) {
      const b = cellBounds(data, info.width, col, row, fw, fh);
      if (!b) continue;
      const mid = (b.minX + b.maxX) / 2;
      const dx = Math.round(midTarget - mid);
      let dy = 0;
      if (mode === "bottom") {
        dy = Math.round(bottomTarget - b.maxY);
      }
      if (dx !== 0 || dy !== 0) moved++;

      for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
          const si = ((row * fh + y) * info.width + (col * fw + x)) * 4;
          if (data[si + 3] < 1) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= fw || ny >= fh) continue;
          const di = ((row * fh + ny) * info.width + (col * fw + nx)) * 4;
          // last write wins; fine for opaque sprites
          out[di] = data[si];
          out[di + 1] = data[si + 1];
          out[di + 2] = data[si + 2];
          out[di + 3] = data[si + 3];
        }
      }
    }
  }

  const tmp = path.join(ROOT, id, "atlas.anchored.png");
  const dst = path.join(ROOT, id, "atlas.png");
  await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(tmp);
  try {
    fs.renameSync(tmp, dst);
  } catch {
    fs.copyFileSync(tmp, path.join(ROOT, id, "atlas.v2.png"));
    console.log(`${id}: locked, wrote atlas.v2.png`);
  }
  console.log(`${id}: mode=${mode} cellsShifted=${moved}`);
}

for (const id of Object.keys(MODE)) {
  await processOne(id);
}
