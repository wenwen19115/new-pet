import { LogicalSize } from "@tauri-apps/api/dpi";
import { WebviewWindow, getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { currentMonitor } from "@tauri-apps/api/window";
import { closeBubbleWindow } from "./bubbleWindow";
import { closeMenuWindow } from "./menuWindow";
import { loadPetSettings } from "./settings";
import { resolveAppearance } from "./skins";
import { petWindowSize } from "./sizes";
import { PET_WINDOW_LABEL } from "./types";
import { isPetVrmReady } from "./vrmStorage";

function petUrl(): string {
  if (import.meta.env.DEV) {
    return `${window.location.origin}/src/pet/pet.html`;
  }
  return "src/pet/pet.html";
}

function currentPetWindowSize() {
  const s = loadPetSettings();
  return petWindowSize(
    resolveAppearance(s.modelKind, s.lookId).model,
    s.zoomPercent
  );
}

async function resolveDefaultPetPosition(): Promise<{ x: number; y: number }> {
  const marginX = 48;
  const marginY = 80;
  const { w } = currentPetWindowSize();
  try {
    const monitor = await currentMonitor();
    if (monitor) {
      const scale = monitor.scaleFactor || 1;
      const wp = monitor.workArea.position;
      const ws = monitor.workArea.size;
      const workRight = (wp.x + ws.width) / scale;
      const workTop = wp.y / scale;
      return {
        x: Math.round(workRight - w - marginX),
        y: Math.round(workTop + marginY),
      };
    }
  } catch {
    // ignore
  }
  const availW = window.screen?.availWidth ?? 1280;
  return {
    x: Math.max(marginX, Math.round(availW - w - marginX)),
    y: marginY,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function getPetWindow(): Promise<WebviewWindow | null> {
  try {
    return (await WebviewWindow.getByLabel(PET_WINDOW_LABEL)) ?? null;
  } catch {
    return null;
  }
}

async function waitUntilPetWindowGone(timeoutMs = 5000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!(await getPetWindow())) return true;
    await sleep(50);
  }
  return !(await getPetWindow());
}

async function destroyPetLabel(): Promise<void> {
  const existing = await getPetWindow();
  if (!existing) return;
  try {
    await existing.hide();
  } catch {
    // ignore
  }
  try {
    await existing.destroy();
  } catch {
    try {
      await existing.close();
    } catch {
      // ignore
    }
  }
}

async function closePetWindow(): Promise<void> {
  await closeMenuWindow().catch(() => undefined);
  await closeBubbleWindow().catch(() => undefined);
  await destroyPetLabel();
  if (await waitUntilPetWindowGone()) return;

  console.warn("[pet] window label still held after destroy; retrying");
  await destroyPetLabel();
  if (!(await waitUntilPetWindowGone(2000))) {
    console.warn("[pet] failed to release pet window label");
  }
}

async function waitWebviewReady(
  win: WebviewWindow,
  timeoutMs = 8000
): Promise<WebviewWindow | null> {
  return await new Promise((resolve) => {
    let settled = false;
    const finish = (value: WebviewWindow | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    };
    const timer = window.setTimeout(() => {
      finish(win);
    }, timeoutMs);
    void win.once("tauri://created", () => finish(win));
    void win.once("tauri://error", () => {
      void win.destroy().catch(() => undefined);
      finish(null);
    });
  });
}

async function createPetWindow(): Promise<WebviewWindow | null> {
  if (await getPetWindow()) {
    await closePetWindow();
  }
  if (await getPetWindow()) {
    return null;
  }

  const pos = await resolveDefaultPetPosition();
  const size = currentPetWindowSize();
  const pet = new WebviewWindow(PET_WINDOW_LABEL, {
    url: petUrl(),
    title: "芯宠",
    width: size.w,
    height: size.h,
    resizable: false,
    maximizable: false,
    minimizable: false,
    decorations: false,
    transparent: true,
    shadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focus: false,
    visible: true,
    backgroundColor: [0, 0, 0, 0],
    center: false,
    x: pos.x,
    y: pos.y,
  });

  const ready = await waitWebviewReady(pet);
  if (!ready) return null;
  try {
    await ready.show();
    await ready.setAlwaysOnTop(true);
  } catch {
    // ignore
  }
  return ready;
}

async function openPetWindow(): Promise<WebviewWindow | null> {
  const existing = await getPetWindow();
  if (existing) {
    try {
      await existing.show();
      await existing.setAlwaysOnTop(true);
      const size = currentPetWindowSize();
      try {
        await existing.setSize(new LogicalSize(size.w, size.h));
      } catch {
        // ignore
      }
      return existing;
    } catch {
      await destroyPetLabel();
      await waitUntilPetWindowGone();
    }
  }

  let created = await createPetWindow();
  if (!created) {
    await sleep(150);
    created = await createPetWindow();
  }
  return created;
}

let syncChain: Promise<void> = Promise.resolve();

export async function syncPetWindow(options?: {
  recreate?: boolean;
}): Promise<void> {
  const recreate = Boolean(options?.recreate);
  const run = async () => {
    const settings = loadPetSettings();
    const shouldShow = settings.enabled && isPetVrmReady(settings);

    if (!shouldShow) {
      await closePetWindow();
      return;
    }

    if (recreate) {
      await closePetWindow();
      await openPetWindow();
      return;
    }

    await openPetWindow();
  };

  syncChain = syncChain.then(run, run);
  await syncChain;
}

let hostInited = false;

export async function initPetHost(): Promise<void> {
  if (hostInited) return;
  try {
    if (getCurrentWebviewWindow().label !== "main") return;
  } catch {
    return;
  }
  hostInited = true;

  await syncPetWindow();

  try {
    const main = getCurrentWebviewWindow();
    await main.onCloseRequested(async (event) => {
      event.preventDefault();
      try {
        await closePetWindow();
      } catch {
        // ignore
      }
      try {
        await main.destroy();
      } catch {
        // ignore
      }
    });
  } catch {
    // ignore
  }
}
