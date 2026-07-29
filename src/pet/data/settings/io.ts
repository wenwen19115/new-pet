import type { PetSettings } from "../types";
import {
  createDefaultProfiles,
  DEFAULT_PET_SETTINGS,
} from "./defaults";
import { PET_SETTINGS_EVENT } from "../../events";
import { readSettingsRaw, writeSettingsRaw } from "../storageKeys";
import { normalizePetSettings } from "./normalize";
import { syncActiveProfileIntoProfiles } from "./profiles";

export function loadPetSettings(): PetSettings {
  try {
    const raw = readSettingsRaw();
    if (!raw)
      return { ...DEFAULT_PET_SETTINGS, profiles: createDefaultProfiles() };
    return normalizePetSettings(JSON.parse(raw) as Partial<PetSettings>);
  } catch {
    return { ...DEFAULT_PET_SETTINGS, profiles: createDefaultProfiles() };
  }
}

function savePetSettings(settings: PetSettings): PetSettings {
  const next = syncActiveProfileIntoProfiles(settings);
  writeSettingsRaw(JSON.stringify(next));
  return next;
}

export async function publishPetSettings(
  settings: PetSettings
): Promise<PetSettings> {
  const next = savePetSettings(settings);
  await emitPetSettings(next);
  return next;
}

async function emitPetSettings(next: PetSettings): Promise<void> {
  try {
    const { emit } = await import("@tauri-apps/api/event");
    await emit(PET_SETTINGS_EVENT, next);
  } catch {
    // ignore
  }
  try {
    const { notifyPetStoreFromSave } = await import("../store");
    notifyPetStoreFromSave(next);
  } catch {
    // ignore
  }
}

export async function patchPetSettings(
  patch: Partial<PetSettings>
): Promise<PetSettings> {
  const current = loadPetSettings();
  const keys = Object.keys(patch);
  const globalOnly =
    keys.length > 0 &&
    keys.every((k) =>
      [
        "settingsAlwaysOnTop",
        "enabled",
        "uiTheme",
        "sysStatsDefaultExpanded",
        "chatEnabled",
      ].includes(k)
    );
  if (globalOnly) {
    const next = normalizePetSettings({ ...current, ...patch });
    writeSettingsRaw(JSON.stringify(next));
    await emitPetSettings(next);
    return next;
  }
  return publishPetSettings({
    ...current,
    ...patch,
  });
}
