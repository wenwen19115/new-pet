/**
 * Magenta chroma-key pet spritesheets → transparent PNG (sharp).
 * Usage: node scripts/key-magenta-sheets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PET_ASSETS_ROOT } from "./petAssetsRoot.mjs";

/** 原始品红底 sheet 目录，文件名 `<id>-magenta.png` */
const SRC_ROOT = process.env.PET_SHEET_SRC || process.argv[2];
const DST_ROOT = PET_ASSETS_ROOT;
const IDS = ["mug-cat"];

if (!SRC_ROOT) {
  console.error(
    "用法: PET_SHEET_SRC=<dir> node scripts/key-magenta-sheets.mjs\n  或: node scripts/key-magenta-sheets.mjs <srcDir>"
  );
  process.exit(1);
}

function keyMagenta(r, g, b) {
  const score = Math.min(r, b) - g;
  const avgRb = (r + b) * 0.5;
  // hard transparent
  if (g <= 90 && score >= 55 && r >= 140 && b >= 140 && avgRb >= g + 40) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  // soft
  let a = 255;
  if (g <= 130 && score >= 25 && r >= 100 && b >= 100) {
    a = Math.max(0, Math.min(255, Math.round(((55 - score) / 30) * 255)));
  }
  // despill
  let rr = r;
  let bb = b;
  if (a < 250 || score > 10) {
    rr = Math.min(r, g + 25);
    bb = Math.min(b, g + 25);
  }
  if (a > 0 && a < 250) {
    const t = a / 255;
    // unmix magenta bg
    const bgR = 255;
    const bgG = 0;
    const bgB = 255;
    rr = Math.min(255, Math.max(0, (rr - (1 - t) * bgR) / Math.max(t, 0.02)));
    let gg = Math.min(255, Math.max(0, (g - (1 - t) * bgG) / Math.max(t, 0.02)));
    bb = Math.min(255, Math.max(0, (bb - (1 - t) * bgB) / Math.max(t, 0.02)));
    // extra despill on soft edge
    rr = Math.min(rr, (gg + rr) * 0.5);
    bb = Math.min(bb, (gg + bb) * 0.5);
    return {
      r: Math.round(rr),
      g: Math.round(gg),
      b: Math.round(bb),
      a: a < 8 ? 0 : a,
    };
  }
  if (a < 8) return { r: 0, g: 0, b: 0, a: 0 };
  return { r: Math.round(rr), g: Math.round(g), b: Math.round(bb), a };
}

async function processOne(id) {
  const src = path.join(SRC_ROOT, `${id}-magenta.png`);
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(data.length);
  let keyed = 0;
  let opaque = 0;
  for (let i = 0; i < data.length; i += 4) {
    const px = keyMagenta(data[i], data[i + 1], data[i + 2]);
    out[i] = px.r;
    out[i + 1] = px.g;
    out[i + 2] = px.b;
    out[i + 3] = px.a;
    if (px.a < 8) keyed++;
    else if (px.a >= 16) opaque++;
  }

  const tmp = path.join(DST_ROOT, id, "sheet.key.png");
  const dst = path.join(DST_ROOT, id, "sheet.png");
  await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(tmp);

  try {
    fs.renameSync(tmp, dst);
  } catch {
    fs.copyFileSync(tmp, path.join(DST_ROOT, id, "sheet.fresh.png"));
    console.log(`  locked sheet.png → wrote sheet.fresh.png`);
  }
  console.log(`${id}: keyed=${keyed} opaque=${opaque}`);
}

for (const id of IDS) {
  await processOne(id);
}
