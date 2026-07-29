import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { emit, emitTo, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { petBodyBox } from "./sizes";
import { loadPetSettings } from "./settings";
import { resolveAppearance } from "./skins";
import {
  PET_MENU_ACTIVITY_EVENT,
  PET_MENU_GAP,
  PET_MENU_H,
  PET_MENU_H_COLLAPSED,
  PET_MENU_HIDE_EVENT,
  PET_MENU_IDLE_MS,
  PET_MENU_LABEL,
  PET_MENU_LAYOUT_EVENT,
  PET_MENU_SHOW_EVENT,
  PET_MENU_W,
  petMenuHeight,
  type PetMenuLayoutPayload,
  type PetMenuPayload,
} from "./menuTypes";

function menuUrl(): string {
  if (import.meta.env.DEV) {
    return `${window.location.origin}/src/pet/pet-menu.html`;
  }
  return "src/pet/pet-menu.html";
}

function clamp(n: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, n));
}

async function waitWebviewReady(
  win: WebviewWindow,
  timeoutMs = 2500
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
      void win.destroy().catch(() => undefined);
      finish(null);
    }, timeoutMs);
    void win.once("tauri://created", () => finish(win));
    void win.once("tauri://error", () => {
      void win.destroy().catch(() => undefined);
      finish(null);
    });
  });
}

async function ensureMenuWindow(): Promise<WebviewWindow | null> {
  const existing = await WebviewWindow.getByLabel(PET_MENU_LABEL);
  if (existing) return existing;

  const win = new WebviewWindow(PET_MENU_LABEL, {
    url: menuUrl(),
    title: "Chip Pet Menu",
    width: PET_MENU_W,
    height: PET_MENU_H_COLLAPSED,
    resizable: false,
    maximizable: false,
    minimizable: false,
    decorations: false,
    transparent: true,
    shadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focus: true,
    visible: false,
    backgroundColor: [0, 0, 0, 0],
  });

  return await waitWebviewReady(win);
}

async function resolveMenuPlacement(menuH: number): Promise<{
  x: number;
  y: number;
}> {
  const pet = getCurrentWindow();
  const scale = await pet.scaleFactor();
  const outer = (await pet.outerPosition()).toLogical(scale);
  const size = (await pet.outerSize()).toLogical(scale);
  const monitor = await currentMonitor();

  const s = loadPetSettings();
  const model = resolveAppearance(s.modelKind, s.lookId).model;
  const body = petBodyBox(model, s.zoomPercent);
  const petCenterX = outer.x + size.width / 2;
  const petCenterY = outer.y + size.height / 2;
  const bodyLeft = petCenterX - body.w / 2;
  const bodyRight = petCenterX + body.w / 2;
  const bodyBottom = petCenterY + body.h / 2;

  let workLeft = 0;
  let workTop = 0;
  let workRight = (window.screen?.availWidth ?? 1280) || 1280;
  let workBottom = (window.screen?.availHeight ?? 800) || 800;
  if (monitor) {
    const wp = monitor.workArea.position;
    const ws = monitor.workArea.size;
    workLeft = wp.x / scale;
    workTop = wp.y / scale;
    workRight = (wp.x + ws.width) / scale;
    workBottom = (wp.y + ws.height) / scale;
  }

  const gap = PET_MENU_GAP;
  const need = PET_MENU_W + Math.max(0, gap);
  const spaceRight = workRight - bodyRight;
  const spaceLeft = bodyLeft - workLeft;

  let side: "left" | "right";
  if (spaceRight >= need) {
    side = "right";
  } else if (spaceLeft >= need) {
    side = "left";
  } else {
    side = spaceRight >= spaceLeft ? "right" : "left";
  }

  let x =
    side === "right" ? bodyRight + gap : bodyLeft - gap - PET_MENU_W;
  let y = bodyBottom + gap;

  const minX = workLeft + 4;
  const maxX = Math.max(minX, workRight - PET_MENU_W - 4);
  const minY = workTop + 4;
  const maxY = Math.max(minY, workBottom - menuH - 4);

  x = clamp(x, minX, maxX);
  y = clamp(y, minY, maxY);

  const overlapsBody =
    (side === "right" && x < bodyRight + gap - 0.5) ||
    (side === "left" && x + PET_MENU_W > bodyLeft - gap + 0.5);
  if (overlapsBody) {
    if (side === "right" && spaceLeft >= need) {
      side = "left";
      x = clamp(bodyLeft - gap - PET_MENU_W, minX, maxX);
    } else if (side === "left" && spaceRight >= need) {
      side = "right";
      x = clamp(bodyRight + gap, minX, maxX);
    }
  }

  return { x: Math.round(x), y: Math.round(y) };
}

async function applyMenuGeometry(
  win: WebviewWindow,
  x: number,
  y: number,
  h: number
): Promise<void> {
  await win.setSize(new LogicalSize(PET_MENU_W, h));
  await win.setPosition(new LogicalPosition(x, y));
}

let menuOpen = false;
let menuExpanded = false;
let menuPlace: { x: number; y: number } | null = null;
let idleTimer: number | null = null;
let unlistenActivity: UnlistenFn | null = null;
let unlistenLayout: UnlistenFn | null = null;
let listenersReady = false;
function clearIdleTimer() {
  if (idleTimer == null) return;
  window.clearTimeout(idleTimer);
  idleTimer = null;
}

function bumpIdleTimer() {
  clearIdleTimer();
  if (!menuOpen) return;
  idleTimer = window.setTimeout(() => {
    void hidePetMenu();
  }, PET_MENU_IDLE_MS);
}

async function ensureMenuListeners() {
  if (listenersReady) return;
  listenersReady = true;
  unlistenActivity = await listen(PET_MENU_ACTIVITY_EVENT, () => {
    bumpIdleTimer();
  });
  unlistenLayout = await listen<PetMenuLayoutPayload>(
    PET_MENU_LAYOUT_EVENT,
    (ev) => {
      bumpIdleTimer();
      const expanded = Boolean(ev.payload?.expanded);
      menuExpanded = expanded;
      const measured = ev.payload?.height;
      const h =
        typeof measured === "number" && measured > 0
          ? Math.ceil(measured)
          : petMenuHeight(expanded);
      const win = WebviewWindow.getByLabel(PET_MENU_LABEL);
      void (async () => {
        const w = await win;
        if (!w || !menuPlace) return;
        try {
          await applyMenuGeometry(w, menuPlace.x, menuPlace.y, h);
        } catch {
          // ignore
        }
      })();
    }
  );
}

export function isPetMenuOpen(): boolean {
  return menuOpen;
}

export async function showPetMenu(options: {
  openLabel: string;
  pinLabel: string;
  chatLabel?: string;
  statsExpandDefault?: boolean;
}): Promise<void> {
  await ensureMenuListeners();
  const win = await ensureMenuWindow();
  if (!win) return;

  menuExpanded = Boolean(options.statsExpandDefault);
  const h = petMenuHeight(menuExpanded);
  // Place against expanded height so expanding later stays on-screen
  const place = await resolveMenuPlacement(PET_MENU_H);
  menuPlace = place;
  menuOpen = true;
  bumpIdleTimer();

  try {
    await applyMenuGeometry(win, place.x, place.y, h);
    await win.setAlwaysOnTop(true);
    try {
      await win.setShadow(false);
    } catch {
      // ignore
    }
    await win.show();
    try {
      await win.setFocus();
    } catch {
      // ignore
    }
    await applyMenuGeometry(win, place.x, place.y, h);
    window.setTimeout(() => {
      void applyMenuGeometry(win, place.x, place.y, h);
    }, 48);
  } catch (err) {
    console.warn("[pet] menu place failed", err);
  }

  const payload: PetMenuPayload = {
    openLabel: options.openLabel,
    pinLabel: options.pinLabel,
    chatLabel: options.chatLabel?.trim() ?? "",
    statsExpandDefault: menuExpanded,
  };

  await new Promise((r) => window.setTimeout(r, 40));
  try {
    await emitTo(PET_MENU_LABEL, PET_MENU_SHOW_EVENT, payload);
  } catch {
    try {
      await emit(PET_MENU_SHOW_EVENT, payload);
    } catch {
      // ignore
    }
  }
}

async function hideMenuWindow(): Promise<void> {
  menuOpen = false;
  menuPlace = null;
  clearIdleTimer();
  let existing: Awaited<ReturnType<typeof WebviewWindow.getByLabel>> = null;
  try {
    existing = await WebviewWindow.getByLabel(PET_MENU_LABEL);
  } catch {
    return;
  }
  if (!existing) return;
  try {
    await existing.hide();
  } catch {
    // ignore
  }
}

export async function hidePetMenu(): Promise<void> {
  try {
    await emitTo(PET_MENU_LABEL, PET_MENU_HIDE_EVENT, null);
  } catch {
    // ignore
  }
  try {
    await emit(PET_MENU_HIDE_EVENT, null);
  } catch {
    // ignore
  }
  await hideMenuWindow();
}

export async function destroyMenuWindow(): Promise<void> {
  menuOpen = false;
  menuPlace = null;
  clearIdleTimer();
  unlistenActivity?.();
  unlistenLayout?.();
  unlistenActivity = null;
  unlistenLayout = null;
  listenersReady = false;
  let existing: Awaited<ReturnType<typeof WebviewWindow.getByLabel>> = null;
  try {
    existing = await WebviewWindow.getByLabel(PET_MENU_LABEL);
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
