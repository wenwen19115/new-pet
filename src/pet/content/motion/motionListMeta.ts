import type { PetIdleMotion } from "./motions";
import {
  findVrmaMotion,
  type VrmMotionKind,
  type VrmMotionVibe,
} from "./vrmaMotions";

/** 设置页动作列表：类型 / 风格（与 VRM 筛选同一套） */
export type MotionListKind = VrmMotionKind;
export type MotionListVibe = VrmMotionVibe;

export type MotionListMeta = {
  kind: MotionListKind;
  vibe: MotionListVibe;
};

/**
 * 非 VRMA 壳动作的列表元数据（筛选 / 分组用）。
 * VRM 片走 vrmaMotions；两边共用 kind/vibe 词表。
 */
const SHELL_MOTION_LIST_META: Readonly<
  Partial<Record<PetIdleMotion, MotionListMeta>>
> = {
  "idle-float": { kind: "idle", vibe: "soft" },
  "sway-step": { kind: "idle", vibe: "soft" },
  "tip-toe": { kind: "idle", vibe: "soft" },
  "toon-sway": { kind: "idle", vibe: "soft" },
  "toon-tilt": { kind: "idle", vibe: "soft" },
  "toon-read": { kind: "idle", vibe: "soft" },
  "toon-tea": { kind: "idle", vibe: "soft" },

  "bow-nod": { kind: "talk", vibe: "soft" },
  "toon-wave": { kind: "talk", vibe: "soft" },

  "stretch-up": { kind: "gesture", vibe: "soft" },
  "side-hop": { kind: "gesture", vibe: "lively" },
  "fly-orbit": { kind: "gesture", vibe: "lively" },
  "fly-dash": { kind: "gesture", vibe: "lively" },
  "figure-eight": { kind: "gesture", vibe: "lively" },
  "barrel-roll": { kind: "gesture", vibe: "bold" },
  "cartwheel": { kind: "gesture", vibe: "bold" },
  "rocket-jump": { kind: "gesture", vibe: "lively" },
  "screen-dash": { kind: "gesture", vibe: "lively" },
  "screen-hop": { kind: "gesture", vibe: "lively" },
  "screen-glide": { kind: "gesture", vibe: "soft" },
  "screen-zip": { kind: "gesture", vibe: "lively" },
  "screen-wormhole": { kind: "gesture", vibe: "bold" },
  "tap-frenzy": { kind: "gesture", vibe: "bold" },
  "toon-walk": { kind: "gesture", vibe: "soft" },
  "toon-dodge": { kind: "gesture", vibe: "lively" },
  "toon-spin": { kind: "gesture", vibe: "lively" },
  "toon-water": { kind: "gesture", vibe: "soft" },
  "toon-splash": { kind: "gesture", vibe: "lively" },

  "happy-bounce": { kind: "emotion", vibe: "lively" },
  "victory-burst": { kind: "emotion", vibe: "bold" },
  "toon-grass": { kind: "emotion", vibe: "soft" },
  "toon-fire": { kind: "emotion", vibe: "bold" },
  "toon-thunder": { kind: "emotion", vibe: "bold" },
};

const KIND_ORDER: MotionListKind[] = ["idle", "talk", "gesture", "emotion"];

export function findMotionListMeta(id: string): MotionListMeta | undefined {
  const vrma = findVrmaMotion(id);
  if (vrma) return { kind: vrma.kind, vibe: vrma.vibe };
  return SHELL_MOTION_LIST_META[id as PetIdleMotion];
}

/** 按类型分组；无 meta 的进手势组（与 VRM 列表一致） */
export function groupMotionIdsByKind(
  ids: readonly string[]
): Array<{ kind: MotionListKind; ids: string[] }> {
  const buckets = new Map<MotionListKind, string[]>();
  for (const kind of KIND_ORDER) buckets.set(kind, []);
  const other: string[] = [];
  for (const id of ids) {
    const meta = findMotionListMeta(id);
    if (meta) buckets.get(meta.kind)!.push(id);
    else other.push(id);
  }
  const groups = KIND_ORDER.map((kind) => ({
    kind,
    ids: buckets.get(kind)!,
  })).filter((g) => g.ids.length);
  if (other.length) {
    const gesture = groups.find((g) => g.kind === "gesture");
    if (gesture) gesture.ids.push(...other);
    else groups.push({ kind: "gesture", ids: other });
  }
  return groups;
}
