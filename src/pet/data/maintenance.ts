import { clearAllChatHistory } from "../chat/history";
import { clearMoyuDayStats } from "./moyuDay";
import { clearPetVrmFile } from "./vrmStorage";
import { createFactoryResetSettings } from "./settings/defaults";
import { publishPetSettings } from "./settings/io";
import { clearPetHandshakeKeys } from "./storageKeys";
import type { PetSettings } from "./types";

export type FactoryResetStepId =
  | "handshake"
  | "chat"
  | "vrm"
  | "settings";

/** 进度口：先亮「正在」，再 run 本步，最后由调用方改成「完成」 */
export type FactoryResetStepFn = (
  step: FactoryResetStepId,
  run: () => void | Promise<void>
) => void | Promise<void>;

async function withStep(
  onStep: FactoryResetStepFn | undefined,
  step: FactoryResetStepId,
  work: () => void | Promise<void>
) {
  if (onStep) await onStep(step, work);
  else await work();
}

/** 出厂：握手键 + 聊天 + 磁盘 VRM + 设置 → 默认；UI/窗同步留给设置页 */
export async function factoryResetPet(
  onStep?: FactoryResetStepFn
): Promise<PetSettings> {
  await withStep(onStep, "handshake", () => {
    clearPetHandshakeKeys();
    clearMoyuDayStats();
  });

  await withStep(onStep, "chat", () => {
    clearAllChatHistory();
  });

  await withStep(onStep, "vrm", () => clearPetVrmFile());

  let next!: PetSettings;
  await withStep(onStep, "settings", async () => {
    next = await publishPetSettings(createFactoryResetSettings());
  });
  return next;
}
