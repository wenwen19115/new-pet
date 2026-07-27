import type { PetModelKind } from "../skins/types";
import { getCharacter } from "../characters";
import { filterEnabledMotions } from "../customLines";
import {
  findCustomVrmMotion,
  isCustomVrmMotionId,
  type CustomVrmMotion,
} from "../customVrmMotions";
import type { PetIdleMotion } from "../motions";
import { motionHoldMs } from "../motions";

interface MotionPlayRequest {
  id: string;
  durationMs: number;
  isCustom: boolean;
  custom?: CustomVrmMotion;
}

/** Resolve built-in + custom random pool for a character */
export function buildIdleMotionPool(opts: {
  model: PetModelKind;
  disabledMotions?: string[];
  customVrmMotions?: CustomVrmMotion[];
}): string[] {
  const def = getCharacter(opts.model);
  const builtIn = filterEnabledMotions(
    [...def.idleMotions],
    opts.disabledMotions
  );
  const pool: string[] = [...builtIn];
  if (opts.model === "vrm" && opts.customVrmMotions?.length) {
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

export function demoMotionOptions(
  model: PetModelKind,
  customVrmMotions: CustomVrmMotion[] = []
): Array<{ value: string; labelKey?: string; label?: string }> {
  const def = getCharacter(model);
  const builtIn = def.demoMotions.map((value) => ({
    value,
    labelKey: `pet.motion.${value}`,
  }));
  if (model !== "vrm") return builtIn;
  const customs = customVrmMotions.map((m) => ({
    value: m.id,
    label: m.name,
  }));
  return [...builtIn, ...customs];
}
