import { LogicalSize } from "@tauri-apps/api/dpi";
import { emit, emitTo } from "@tauri-apps/api/event";
import { WebviewWindow, getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { currentMonitor } from "@tauri-apps/api/window";
import {
  destroyBubbleWindow,
  hidePetBubble,
} from "@/pet/windows/bubble";
import {
  destroyMenuWindow,
  hidePetMenu,
} from "@/pet/windows/menu";
import { destroyChatWindow, hidePetChat } from "@/pet/windows/chat";
import { loadPetSettings } from "@/pet/data/settings";
import { resolveAppearance } from "@/pet/skins";
import { petWindowSize } from "@/pet/bridge/sizes";
import {
  PET_RESUME_EVENT,
  PET_SUSPEND_EVENT,
  PET_WINDOW_LABEL,
} from "@/pet/data/types";
import { isPetVrmReady } from "@/pet/data/vrmStorage";
import { waitWebviewReady } from "@/pet/windows/shared/waitWebviewReady";

function petUrl(): string {
  if (import.meta.env.DEV) {
    return `${window.location.origin}/src/pet/windows/pet/pet.html`;
  }
  return "src/pet/windows/pet/pet.html";
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

async function destroyLabel(label: string): Promise<void> {
  let existing: WebviewWindow | null = null;
  try {
    existing = (await WebviewWindow.getByLabel(label)) ?? null;
  } catch {
    return;
  }
  if (!existing) return;
  try {
    await existing.destroy();
  } catch {
    // ignore
  }
}

async function emitPet(event: string): Promise<void> {
  try {
    await emitTo(PET_WINDOW_LABEL, event, null);
  } catch {
    try {
      await emit(event, null);
    } catch {
      // ignore
    }
  }
}

/** Soft dismiss: hide webviews, keep HWNDs (avoids WebView2 PostMessage after destroy). */
async function dismissPetWindow(): Promise<void> {
  await emitPet(PET_SUSPEND_EVENT);
  await sleep(40);
  await hidePetMenu().catch(() => undefined);
  await hidePetChat().catch(() => undefined);
  await hidePetBubble().catch(() => undefined);
  const pet = await getPetWindow();
  if (!pet) return;
  try {
    await pet.hide();
  } catch {
    // ignore
  }
}

/** App exit / forced recreate: tear down HWNDs. */
async function destroyPetWindow(): Promise<void> {
  await emitPet(PET_SUSPEND_EVENT);
  await sleep(80);
  await destroyMenuWindow().catch(() => undefined);
  await destroyChatWindow().catch(() => undefined);
  await destroyBubbleWindow().catch(() => undefined);
  await destroyLabel(PET_WINDOW_LABEL);
  await waitUntilPetWindowGone(2000);
}

async function createPetWindow(): Promise<WebviewWindow | null> {
  // Soft-dismiss leaves the label alive — never create a second pet.
  const existing = await getPetWindow();
  if (existing) return existing;

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

  const ready = await waitWebviewReady(pet, {
    timeoutMs: 8000,
    onTimeout: "keep",
  });
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
      const size = currentPetWindowSize();
      try {
        await existing.setSize(new LogicalSize(size.w, size.h));
      } catch {
        // ignore
      }
      await existing.show();
      await existing.setAlwaysOnTop(true);
      await emitPet(PET_RESUME_EVENT);
      return existing;
    } catch {
      await destroyLabel(PET_WINDOW_LABEL);
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
/**
 * Dev HMR / html path moves can leave a live HWND on a stale URL.
 * Production cold start has no stale HWND — only recreate when asked.
 */
let needsFreshPetWindow = import.meta.env.DEV;

export async function syncPetWindow(options?: {
  recreate?: boolean;
}): Promise<void> {
  const recreate = Boolean(options?.recreate) || needsFreshPetWindow;
  const run = async () => {
    const settings = loadPetSettings();
    const shouldShow = settings.enabled && isPetVrmReady(settings);

    if (!shouldShow) {
      await dismissPetWindow();
      return;
    }

    if (recreate) {
      needsFreshPetWindow = false;
      await destroyPetWindow();
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
  try {
    if (getCurrentWebviewWindow().label !== "main") return;
  } catch {
    return;
  }

  if (hostInited) {
    if (needsFreshPetWindow) await syncPetWindow({ recreate: true });
    return;
  }
  hostInited = true;

  await syncPetWindow();

  try {
    const main = getCurrentWebviewWindow();
    await main.onCloseRequested(async (event) => {
      event.preventDefault();
      try {
        await destroyPetWindow();
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
