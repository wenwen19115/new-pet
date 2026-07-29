import { filterEnabledMotions } from "../dialogue/customLines";
import {
  findCustomVrmMotion,
  isCustomVrmMotionId,
  type CustomVrmMotion,
} from "./customVrmMotions";
import type { PetIdleMotion } from "./motions";
import { motionHoldMs } from "./motions";

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
  allowCustomVrm = false
): Array<{ value: string; labelKey?: string; label?: string }> {
  const builtIn = demoMotions.map((value) => ({
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
