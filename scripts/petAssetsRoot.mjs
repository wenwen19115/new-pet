import { fileURLToPath } from "node:url";
import path from "node:path";

/** 仓库根 → `src/pet/assets/pets` */
export const PET_ASSETS_ROOT = path.join(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
  "src",
  "pet",
  "assets",
  "pets"
);
