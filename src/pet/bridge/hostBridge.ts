import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { PET_OPEN_SETTINGS_EVENT } from "../content/motion/motions";
import { initPetHost } from "@/pet/windows/pet";
import { loadPetSettings, patchPetSettings } from "../data/settings";
import {
  PET_BUS_NAME,
  isOpenSettingsStorageKey,
  writeOpenSettingsSignal,
} from "../data/storageKeys";

async function focusMainWindow(opts?: {
  alwaysOnTop?: boolean;
}): Promise<void> {
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const main = await WebviewWindow.getByLabel("main");
  if (!main) return;
  try {
    await main.unminimize();
  } catch {
    // ignore
  }
  await main.show();
  if (opts?.alwaysOnTop !== undefined) {
    try {
      await main.setAlwaysOnTop(opts.alwaysOnTop);
    } catch {
      // ignore
    }
  }
  await main.setFocus();
}

function postBus(type: "open-settings" | "pin-settings"): void {
  try {
    const bus = new BroadcastChannel(PET_BUS_NAME);
    bus.postMessage({ type, at: Date.now() });
    bus.close();
  } catch {
    // ignore
  }
}

export async function requestOpenPetSettings(): Promise<void> {
  try {
    writeOpenSettingsSignal(JSON.stringify({ at: Date.now() }));
  } catch {
    // ignore
  }
  postBus("open-settings");
  try {
    const { emit, emitTo } = await import("@tauri-apps/api/event");
    const pinned = loadPetSettings().settingsAlwaysOnTop;
    await focusMainWindow({ alwaysOnTop: pinned ? true : undefined });
    try {
      await emitTo("main", PET_OPEN_SETTINGS_EVENT, null);
    } catch {
      // ignore
    }
    await emit(PET_OPEN_SETTINGS_EVENT, null);
  } catch {
    // ignore
  }
}

export async function requestPinPetSettings(): Promise<void> {
  try {
    await patchPetSettings({ settingsAlwaysOnTop: true });
  } catch {
    // ignore
  }
  try {
    writeOpenSettingsSignal(JSON.stringify({ at: Date.now(), pin: true }));
  } catch {
    // ignore
  }
  postBus("pin-settings");
  try {
    const { emit, emitTo } = await import("@tauri-apps/api/event");
    await focusMainWindow({ alwaysOnTop: true });
    try {
      await emitTo("main", PET_OPEN_SETTINGS_EVENT, { pin: true });
    } catch {
      // ignore
    }
    await emit(PET_OPEN_SETTINGS_EVENT, { pin: true });
  } catch {
    // ignore
  }
}

export async function applySettingsWindowPin(pinned: boolean): Promise<void> {
  try {
    const { getCurrentWebviewWindow } = await import(
      "@tauri-apps/api/webviewWindow"
    );
    const main = getCurrentWebviewWindow();
    if (main.label !== "main") return;
    await main.setAlwaysOnTop(pinned);
  } catch {
    // ignore
  }
}

export function initPetHostBridge(onOpenSettings: () => void): () => void {
  void initPetHost();
  void applySettingsWindowPin(loadPetSettings().settingsAlwaysOnTop);

  let unlisten: UnlistenFn | null = null;
  void listen(PET_OPEN_SETTINGS_EVENT, () => {
    onOpenSettings();
    void applySettingsWindowPin(loadPetSettings().settingsAlwaysOnTop);
  }).then((fn) => {
    unlisten = fn;
  });

  const onStorage = (ev: StorageEvent) => {
    if (!isOpenSettingsStorageKey(ev.key) || !ev.newValue) return;
    onOpenSettings();
    void applySettingsWindowPin(loadPetSettings().settingsAlwaysOnTop);
  };
  window.addEventListener("storage", onStorage);

  let settingsBus: BroadcastChannel | null = null;
  try {
    settingsBus = new BroadcastChannel(PET_BUS_NAME);
    settingsBus.onmessage = (ev) => {
      if (
        ev.data?.type === "open-settings" ||
        ev.data?.type === "pin-settings"
      ) {
        onOpenSettings();
        void applySettingsWindowPin(loadPetSettings().settingsAlwaysOnTop);
      }
    };
  } catch {
    // ignore
  }

  return () => {
    unlisten?.();
    unlisten = null;
    window.removeEventListener("storage", onStorage);
    settingsBus?.close();
  };
}
