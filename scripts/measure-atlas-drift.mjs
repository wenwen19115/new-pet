/**
 * Measure per-cell opaque centroid drift in a Codex 8x9 atlas.
 * node scripts/measure-atlas-drift.mjs [path]
 */
import path from "node:path";
import sharp from "sharp";
import { PET_ASSETS_ROOT } from "./petAssetsRoot.mjs";

const src =
  process.argv[2] ||
  path.join(PET_ASSETS_ROOT, "mug-cat", "atlas-default.png");
const cols = 8;
const rows = 9;

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const fw = Math.floor(info.width / cols);
const fh = Math.floor(info.height / rows);
console.log("size", info.width, info.height, "cell", fw, fh);

for (let row = 0; row < 3; row++) {
  const mids = [];
  for (let col = 0; col < cols; col++) {
    let minX = fw,
      maxX = 0,
      n = 0,
      sumX = 0;
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const i = ((row * fh + y) * info.width + (col * fw + x)) * 4;
        if (data[i + 3] < 16) continue;
        n++;
        sumX += x;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    const mid = n ? (minX + maxX) / 2 : -1;
    const cx = n ? sumX / n : -1;
    mids.push(mid);
    console.log(
      `r${row}c${col} n=${n} midX=${mid.toFixed(1)} cx=${cx.toFixed(1)} box=${minX}-${maxX}`
    );
  }
  const valid = mids.filter((m) => m >= 0);
  const spread = Math.max(...valid) - Math.min(...valid);
  console.log(`row ${row} midX spread=${spread.toFixed(1)}px`);
}
