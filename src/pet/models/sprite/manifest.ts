import type {
  SpriteAtlas,
  SpriteAnimName,
  SpriteFrameTiming,
} from "./atlas";
import { PETS_SKILL_ATLAS } from "./atlas";
import { LOCAL_PET_ATLAS } from "./localAtlas";

export interface PetSpriteManifest {
  id: string;
  name: { zh: string; en: string };
  spritesheet: string;
  /** 缺省本仓 864×1152 Codex 行语义 */
  atlas?: "codex" | "pets-skill";
  /** 覆盖列数（如 12 列加密表） */
  columns?: number;
  /** 覆盖每行有效帧数 */
  frames?: Partial<Record<SpriteAnimName, number>>;
  /** 覆盖逐帧 / 匀速时长 */
  frameMs?: Partial<Record<SpriteAnimName, SpriteFrameTiming>>;
  /** sway-step / idle-float 等走 idle 行时的 pace 倍率 */
  idleSwayPace?: number;
}

export function atlasForManifest(m: PetSpriteManifest): SpriteAtlas {
  const base =
    m.atlas === "pets-skill"
      ? { ...PETS_SKILL_ATLAS, frameW: 108, frameH: 128 }
      : { ...LOCAL_PET_ATLAS };
  const next: SpriteAtlas = { ...base };
  if (typeof m.columns === "number" && m.columns > 0) {
    next.columns = m.columns;
  }
  if (m.frames) {
    next.frames = { ...base.frames, ...m.frames };
  }
  if (m.frameMs) {
    next.frameMs = { ...base.frameMs, ...m.frameMs };
  }
  return next;
}
