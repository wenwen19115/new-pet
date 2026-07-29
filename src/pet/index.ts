/** Public host API for the main settings window. */
export {
  initPetHostBridge,
  applySettingsWindowPin,
} from "./bridge/hostBridge";

import {
  PET_MOTION_EVENT,
  type PetIdleMotion,
  type PetMotionPayload,
} from "./content/motions";
import { PET_INTRO_EVENT } from "./data/types";

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

export async function requestPetIntro(): Promise<void> {
  try {
    const { emit } = await import("@tauri-apps/api/event");
    await emit(PET_INTRO_EVENT);
  } catch {
    // ignore
  }
}
