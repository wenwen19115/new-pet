import { clearPetTtsCache } from "@/pet/bridge/tts";
import { resetPetUsbWatchBootstrap } from "@/pet/bridge/usbWatch";
import { clearMoyuDayStats } from "@/pet/data/moyuDay";
import { clearPetHandshakeKeys } from "@/pet/data/storageKeys";
import { clearPetVrmSrcCache } from "@/pet/data/vrmStorage";
import { PET_CLEAR_CACHE_EVENT } from "@/pet/events";
import { resetPetDeskWeatherEngine } from "./deskWeatherPoll";

export type PetCachePartId =
  | "handshake"
  | "vrm"
  | "tts"
  | "usb"
  | "weather"
  | "moyu";

export type PetCacheClearReport = {
  /** 实际清到的类别数 */
  parts: number;
};

/** 与出厂重置同形：先亮进度，再 run；run 返回是否清到 */
export type PetCacheClearStepFn = (
  id: PetCachePartId,
  run: () => boolean | Promise<boolean>
) => void | Promise<void>;

async function withCacheStep(
  onStep: PetCacheClearStepFn | undefined,
  id: PetCachePartId,
  work: () => boolean | Promise<boolean>
): Promise<void> {
  if (!onStep) {
    await work();
    return;
  }
  await onStep(id, work);
}

/** 本 WebView 内可重建缓存；不动设置 / 磁盘 VRM / 聊天 */
export async function clearPetRuntimeCachesLocal(
  onStep?: PetCacheClearStepFn
): Promise<PetCacheClearReport> {
  let parts = 0;

  await withCacheStep(onStep, "handshake", () => {
    const hit = clearPetHandshakeKeys() > 0;
    if (hit) parts += 1;
    return hit;
  });

  await withCacheStep(onStep, "vrm", () => {
    const hit = clearPetVrmSrcCache();
    if (hit) parts += 1;
    return hit;
  });

  await withCacheStep(onStep, "tts", () => {
    const tts = clearPetTtsCache();
    const hit = tts.voices > 0 || tts.stopped;
    if (hit) parts += 1;
    return hit;
  });

  await withCacheStep(onStep, "usb", () => {
    const hit = resetPetUsbWatchBootstrap();
    if (hit) parts += 1;
    return hit;
  });

  await withCacheStep(onStep, "weather", () => {
    const hit = resetPetDeskWeatherEngine();
    if (hit) parts += 1;
    return hit;
  });

  await withCacheStep(onStep, "moyu", () => {
    const hit = clearMoyuDayStats();
    if (hit) parts += 1;
    return hit;
  });

  return { parts };
}

/** 本窗先清，再通知其它 WebView */
export async function requestClearPetCache(
  onStep?: PetCacheClearStepFn
): Promise<PetCacheClearReport> {
  const report = await clearPetRuntimeCachesLocal(onStep);
  try {
    const { emit } = await import("@tauri-apps/api/event");
    await emit(PET_CLEAR_CACHE_EVENT);
  } catch {
    // ignore
  }
  return report;
}
