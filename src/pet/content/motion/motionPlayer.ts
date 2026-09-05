import { filterEnabledMotions } from "../dialogue/customLines";
import {
  findCustomVrmMotion,
  isCustomVrmMotionId,
  type CustomVrmMotion,
} from "./customVrmMotions";
import type { PetIdleMotion } from "./motions";
import { motionHoldMs } from "./motions";
import { groupVrmaMotionIdsByKind } from "./vrmaMotions";

interface MotionPlayRequest {
  id: string;
  durationMs: number;
  isCustom: boolean;
  custom?: CustomVrmMotion;
}

/** 纯内容：调用方传入 idle 表与 VRM 能力，不查 characters registry。 */
export function buildIdleMotionPool(opts: {
  idleMotions: readonly string[];
  allowCustomVrm?: boolean;
  disabledMotions?: string[];
  customVrmMotions?: CustomVrmMotion[];
}): string[] {
  const builtIn = filterEnabledMotions(
    [...opts.idleMotions],
    opts.disabledMotions
  );
  const pool: string[] = [...builtIn];
  if (opts.allowCustomVrm && opts.customVrmMotions?.length) {
    for (const m of opts.customVrmMotions) {
      if (!m.includeInRandom) continue;
      if (opts.disabledMotions?.includes(m.id)) continue;
      pool.push(m.id);
    }
  }
  return pool;
}

export function resolveMotionPlay(
  motionId: string,
  customVrmMotions: CustomVrmMotion[] = []
): MotionPlayRequest {
  if (isCustomVrmMotionId(motionId)) {
    const custom = findCustomVrmMotion(customVrmMotions, motionId);
    return {
      id: motionId,
      durationMs: custom?.durationMs ?? 2800,
      isCustom: true,
      custom,
    };
  }
  return {
    id: motionId,
    durationMs: motionHoldMs(motionId as PetIdleMotion),
    isCustom: false,
  };
}

/** 纯内容：demo 表与是否允许自定义 VRM 由调用方决定。 */
export function demoMotionOptions(
  demoMotions: readonly string[],
  customVrmMotions: CustomVrmMotion[] = [],
  allowCustomVrm = false,
  opts?: {
    /** 按 kind 分组（设置页 Select） */
    groupByKind?: boolean;
  }
): Array<{
  value?: string;
  labelKey?: string;
  label?: string;
  options?: Array<{ value: string; labelKey?: string; label?: string }>;
}> {
  const ids = [...demoMotions];

  if (opts?.groupByKind && allowCustomVrm) {
    type Opt = { value: string; labelKey?: string; label?: string };
    type Group = { labelKey: string; options: Opt[] };
    const groups: Group[] = groupVrmaMotionIdsByKind(ids).map((g) => ({
      labelKey: `pet.motionKind.${g.kind}`,
      options: g.ids.map((value) => ({
        value,
        labelKey: `pet.motion.${value}`,
      })),
    }));
    if (customVrmMotions.length) {
      groups.push({
        labelKey: "pet.motionKind.custom",
        options: customVrmMotions.map((m) => ({
          value: m.id,
          label: m.name,
        })),
      });
    }
    return groups;
  }

  const builtIn = ids.map((value) => ({
    value,
    labelKey: `pet.motion.${value}`,
  }));
  if (!allowCustomVrm) return builtIn;
  const customs = customVrmMotions.map((m) => ({
    value: m.id,
    label: m.name,
  }));
  return [...builtIn, ...customs];
}
