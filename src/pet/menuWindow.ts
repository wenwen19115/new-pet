import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { emit, emitTo } from "@tauri-apps/api/event";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { petBodyBox } from "./sizes";
import { loadPetSettings } from "./settings";
import { resolveAppearance } from "./skins";
import {
  PET_MENU_GAP,
  PET_MENU_H,
  PET_MENU_HIDE_EVENT,
  PET_MENU_LABEL,
  PET_MENU_SHOW_EVENT,
  PET_MENU_W,
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
    height: PET_MENU_H,
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

async function resolveMenuPlacement(): Promise<{
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
  const maxY = Math.max(minY, workBottom - PET_MENU_H - 4);

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
  y: number
): Promise<void> {
  await win.setSize(new LogicalSize(PET_MENU_W, PET_MENU_H));
  await win.setPosition(new LogicalPosition(x, y));
}

let menuOpen = false;

export function isPetMenuOpen(): boolean {
  return menuOpen;
}

export async function showPetMenu(options: {
  openLabel: string;
  pinLabel: string;
}): Promise<void> {
  const win = await ensureMenuWindow();
  if (!win) return;

  const place = await resolveMenuPlacement();
  menuOpen = true;

  try {
    await applyMenuGeometry(win, place.x, place.y);
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
    await applyMenuGeometry(win, place.x, place.y);
    window.setTimeout(() => {
      void applyMenuGeometry(win, place.x, place.y);
    }, 48);
  } catch (err) {
    console.warn("[pet] menu place failed", err);
  }

  const payload: PetMenuPayload = {
    openLabel: options.openLabel,
    pinLabel: options.pinLabel,
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

export async function hidePetMenu(): Promise<void> {
  menuOpen = false;
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
  const existing = await WebviewWindow.getByLabel(PET_MENU_LABEL);
  if (!existing) return;
  try {
    await existing.hide();
  } catch {
    // ignore
  }
}

export async function closeMenuWindow(): Promise<void> {
  menuOpen = false;
  const existing = await WebviewWindow.getByLabel(PET_MENU_LABEL);
  if (!existing) return;
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
