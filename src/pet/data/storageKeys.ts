export const PET_SETTINGS_KEY = "new-pet-settings";
const PET_OPEN_SETTINGS_KEY = "new-pet-open-settings";
export const PET_BUS_NAME = "new-pet";
const PET_BUBBLE_PAYLOAD_KEY = "new-pet-bubble-payload";
/** requestPetIntro 挂起标；窗未起来时 pet mount/resume 再取 */
const PET_PENDING_INTRO_KEY = "new-pet-pending-intro";

/** 旧版 desktop-pet-* → new-pet-*，读一次就迁走 */
const LEGACY_KEYS: Record<string, string> = {
  [PET_SETTINGS_KEY]: "desktop-pet-settings",
  [PET_OPEN_SETTINGS_KEY]: "desktop-pet-open-settings",
  [PET_BUBBLE_PAYLOAD_KEY]: "desktop-pet-bubble-payload",
  [PET_PENDING_INTRO_KEY]: "desktop-pet-pending-intro",
};

function readMigrating(key: string): string | null {
  try {
    const cur = localStorage.getItem(key);
    if (cur != null) return cur;
    const legacy = LEGACY_KEYS[key];
    if (!legacy) return null;
    const old = localStorage.getItem(legacy);
    if (old == null) return null;
    localStorage.setItem(key, old);
    localStorage.removeItem(legacy);
    return old;
  } catch {
    return null;
  }
}

export function readSettingsRaw(): string | null {
  return readMigrating(PET_SETTINGS_KEY);
}

export function writeSettingsRaw(json: string): void {
  localStorage.setItem(PET_SETTINGS_KEY, json);
  try {
    localStorage.removeItem(LEGACY_KEYS[PET_SETTINGS_KEY]!);
  } catch {
    // ignore
  }
}

export function readBubblePayloadRaw(): string | null {
  return readMigrating(PET_BUBBLE_PAYLOAD_KEY);
}

export function writeBubblePayloadRaw(json: string): void {
  localStorage.setItem(PET_BUBBLE_PAYLOAD_KEY, json);
}

export function writeOpenSettingsSignal(payload: string): void {
  localStorage.setItem(PET_OPEN_SETTINGS_KEY, payload);
}

export function isOpenSettingsStorageKey(key: string | null): boolean {
  return (
    key === PET_OPEN_SETTINGS_KEY || key === LEGACY_KEYS[PET_OPEN_SETTINGS_KEY]
  );
}

export function isSettingsStorageKey(key: string | null): boolean {
  return key === PET_SETTINGS_KEY || key === LEGACY_KEYS[PET_SETTINGS_KEY];
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
    localStorage.removeItem(LEGACY_KEYS[PET_PENDING_INTRO_KEY]!);
  } catch {
    // ignore
  }
}

/** 取出并清除；同一请求只播一次 */
export function takePetIntroPending(): boolean {
  try {
    const on =
      localStorage.getItem(PET_PENDING_INTRO_KEY) === "1" ||
      localStorage.getItem(LEGACY_KEYS[PET_PENDING_INTRO_KEY]!) === "1";
    if (!on) return false;
    localStorage.removeItem(PET_PENDING_INTRO_KEY);
    localStorage.removeItem(LEGACY_KEYS[PET_PENDING_INTRO_KEY]!);
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
      const legacy = LEGACY_KEYS[key];
      for (const k of [key, legacy].filter(Boolean) as string[]) {
        if (localStorage.getItem(k) == null) continue;
        keys += 1;
        localStorage.removeItem(k);
      }
    } catch {
      // ignore
    }
  }
  return keys;
}
