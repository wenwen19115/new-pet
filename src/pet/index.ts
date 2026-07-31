export {
  initPetHostBridge,
  applySettingsWindowPin,
} from "./bridge/hostBridge";

import {
  PET_MOTION_EVENT,
  type PetIdleMotion,
  type PetMotionPayload,
} from "./content/motion/motions";
import {
  clearPetIntroPending,
  markPetIntroPending,
} from "./data/storageKeys";
import { PET_INTRO_EVENT } from "./events";

export async function requestPetMotion(
  motion: PetIdleMotion | string
): Promise<void> {
  try {
    const { emit } = await import("@tauri-apps/api/event");
    const payload: PetMotionPayload = { motion };
    await emit(PET_MOTION_EVENT, payload);
  } catch {
    // ignore
  }
}

/** 先打标再 emit：窗未起来时由 pet mount/resume 补播 */
export async function requestPetIntro(): Promise<void> {
  markPetIntroPending();
  try {
    const { emit } = await import("@tauri-apps/api/event");
    await emit(PET_INTRO_EVENT);
  } catch {
    // ignore
  }
}

export function cancelPetIntroRequest(): void {
  clearPetIntroPending();
}
