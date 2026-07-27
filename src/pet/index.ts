export {
  initPetHostBridge,
  requestOpenPetSettings,
  requestPinPetSettings,
  applySettingsWindowPin,
} from "./hostBridge";

import {
  PET_MOTION_EVENT,
  type PetIdleMotion,
  type PetMotionPayload,
} from "./motions";
import { PET_INTRO_EVENT } from "./types";

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
