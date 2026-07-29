/** Canonical Desktop Pet storage keys */
export const PET_SETTINGS_KEY = "desktop-pet-settings";
const PET_OPEN_SETTINGS_KEY = "desktop-pet-open-settings";
export const PET_BUS_NAME = "desktop-pet";
const PET_BUBBLE_PAYLOAD_KEY = "desktop-pet-bubble-payload";

/** Legacy wheat keys — read-only migration, never write back */
const LEGACY_PET_SETTINGS_KEY = "wheat-esp-pet-settings";
const LEGACY_PET_OPEN_SETTINGS_KEY = "wheat-esp-pet-open-settings";
export const LEGACY_PET_BUS_NAME = "wheat-esp-pet";
const LEGACY_PET_BUBBLE_PAYLOAD_KEY = "wheat-esp-pet-bubble-payload";

/** Read settings JSON; migrate legacy → new once if needed */
export function readSettingsRaw(): string | null {
  try {
    const current = localStorage.getItem(PET_SETTINGS_KEY);
    if (current) return current;
    const legacy = localStorage.getItem(LEGACY_PET_SETTINGS_KEY);
    if (!legacy) return null;
    localStorage.setItem(PET_SETTINGS_KEY, legacy);
    return legacy;
  } catch {
    return null;
  }
}

export function writeSettingsRaw(json: string): void {
  localStorage.setItem(PET_SETTINGS_KEY, json);
}

export function readBubblePayloadRaw(): string | null {
  try {
    return (
      localStorage.getItem(PET_BUBBLE_PAYLOAD_KEY) ??
      localStorage.getItem(LEGACY_PET_BUBBLE_PAYLOAD_KEY)
    );
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
  return (
    key === PET_OPEN_SETTINGS_KEY || key === LEGACY_PET_OPEN_SETTINGS_KEY
  );
}

export function isSettingsStorageKey(key: string | null): boolean {
  return key === PET_SETTINGS_KEY || key === LEGACY_PET_SETTINGS_KEY;
}
