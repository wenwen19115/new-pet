import type { SpriteAtlas } from "./atlas";
import { CODEX_PET_ATLAS, CODEX_FRAME_MS } from "./atlas";

/**
 * 本仓桌宠 SoT：108×128 格、Codex 帧数 + 逐帧时长曲线。
 * 主图用 atlas-fixed.png（真关键帧）；勿默认 densify。
 */
export const LOCAL_PET_ATLAS: SpriteAtlas = {
  ...CODEX_PET_ATLAS,
  frameW: 108,
  frameH: 128,
  frameMs: { ...CODEX_FRAME_MS },
};
