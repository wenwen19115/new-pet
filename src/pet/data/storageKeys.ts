export const PET_SETTINGS_KEY = "desktop-pet-settings";
const PET_OPEN_SETTINGS_KEY = "desktop-pet-open-settings";
export const PET_BUS_NAME = "desktop-pet";
const PET_BUBBLE_PAYLOAD_KEY = "desktop-pet-bubble-payload";
/** requestPetIntro 挂起标；窗未起来时 pet mount/resume 再取 */
const PET_PENDING_INTRO_KEY = "desktop-pet-pending-intro";

export function readSettingsRaw(): string | null {
  try {
    return localStorage.getItem(PET_SETTINGS_KEY);
  } catch {
    return null;
  }
}

export function writeSettingsRaw(json: string): void {
  localStorage.setItem(PET_SETTINGS_KEY, json);
}

export function readBubblePayloadRaw(): string | null {
  try {
    return localStorage.getItem(PET_BUBBLE_PAYLOAD_KEY);
  } catch {
    return null;
  }
}

export function writeBubblePayloadRaw(json: string): void {
  localStorage.setItem(PET_BUBBLE_PAYLOAD_KEY, json);
}

export function writeOpenSettingsSignal(payload: string): void {
  localStorage.setItem(PET_OPEN_SETTINGS_KEY, payload);
}

export function isOpenSettingsStorageKey(key: string | null): boolean {
  return key === PET_OPEN_SETTINGS_KEY;
}

export function isSettingsStorageKey(key: string | null): boolean {
  return key === PET_SETTINGS_KEY;
}

export function markPetIntroPending(): void {
  try {
    localStorage.setItem(PET_PENDING_INTRO_KEY, "1");
  } catch {
    // ignore
  }
}

export function clearPetIntroPending(): void {
  try {
    localStorage.removeItem(PET_PENDING_INTRO_KEY);
  } catch {
    // ignore
  }
}

/** 取出并清除；同一请求只播一次 */
export function takePetIntroPending(): boolean {
  try {
    if (localStorage.getItem(PET_PENDING_INTRO_KEY) !== "1") return false;
    localStorage.removeItem(PET_PENDING_INTRO_KEY);
    return true;
  } catch {
    return false;
  }
}

/** 气泡 / 打开设置 / intro 挂起等握手键；返回清掉的键数 */
export function clearPetHandshakeKeys(): number {
  let keys = 0;
  for (const key of [
    PET_BUBBLE_PAYLOAD_KEY,
    PET_OPEN_SETTINGS_KEY,
    PET_PENDING_INTRO_KEY,
  ]) {
    try {
      if (localStorage.getItem(key) == null) continue;
      keys += 1;
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
  return keys;
}
