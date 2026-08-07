import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { emit, emitTo, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { petBodyBox, petInteractHalfW } from "@/pet/bridge/sizes";
import { loadPetSettings } from "@/pet/data/settings";
import { resolveAppearance } from "@/pet/skins";
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
} from "./types";
import { waitWebviewReady } from "@/pet/windows/shared/waitWebviewReady";
import {
  getBubbleOverlayRect,
  nudgeAwayFromObstacle,
  setMenuOverlayRect,
} from "@/pet/windows/shared/floatOverlayRects";
import { syncPetBubbleToPet } from "@/pet/windows/bubble";

function menuUrl(): string {
  if (import.meta.env.DEV) {
    return `${window.location.origin}/src/pet/windows/menu/menu.html`;
  }
  return "src/pet/windows/menu/menu.html";
}

function clamp(n: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, n));
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
  const halfW = petInteractHalfW(model, s.zoomPercent);
  const petCenterX = outer.x + size.width / 2;
  const petCenterY = outer.y + size.height / 2;
  const bodyLeft = petCenterX - halfW;
  const bodyRight = petCenterX + halfW;
  // 窗景开时清到整窗外缘，避免压在窗景上
  const skyOnPet = Boolean(s.skyWeather.enableOnPet);
  const clearLeft = skyOnPet ? outer.x : bodyLeft;
  const clearRight = skyOnPet ? outer.x + size.width : bodyRight;

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

  // 身旁小缝，贴角色可视半宽（窗景开则贴整窗外）
  const gap = PET_MENU_GAP;
  const need = PET_MENU_W + gap;
  const spaceRight = workRight - clearRight;
  const spaceLeft = clearLeft - workLeft;

  let side: "left" | "right";
  if (spaceRight >= need) {
    side = "right";
  } else if (spaceLeft >= need) {
    side = "left";
  } else {
    side = spaceRight >= spaceLeft ? "right" : "left";
  }

  let x =
    side === "right" ? clearRight + gap : clearLeft - gap - PET_MENU_W;
  // 竖直对齐角色中部偏上，菜单挂在身旁而不是脚下
  let y = petCenterY - menuH * 0.32;

  const minX = workLeft + 4;
  const maxX = Math.max(minX, workRight - PET_MENU_W - 4);
  const minY = workTop + 4;
  const maxY = Math.max(minY, workBottom - menuH - 4);

  x = clamp(x, minX, maxX);
  y = clamp(y, minY, maxY);

  const overlapsClear =
    (side === "right" && x < clearRight + gap - 0.5) ||
    (side === "left" && x + PET_MENU_W > clearLeft - gap + 0.5);
  if (overlapsClear) {
    if (side === "right" && spaceLeft >= need) {
      side = "left";
      x = clamp(clearLeft - gap - PET_MENU_W, minX, maxX);
    } else if (side === "left" && spaceRight >= need) {
      side = "right";
      x = clamp(clearRight + gap, minX, maxX);
    } else {
      // 左右都挤：退到角色下方
      const bodyBottom = skyOnPet
        ? outer.y + size.height
        : petCenterY + body.h * 0.42;
      x = clamp(petCenterX - PET_MENU_W / 2, minX, maxX);
      y = clamp(bodyBottom + gap, minY, maxY);
    }
  }

  const nudged = nudgeAwayFromObstacle(
    { x, y },
    { w: PET_MENU_W, h: menuH },
    getBubbleOverlayRect(),
    { minX, maxX, minY, maxY },
    {
      centerX: petCenterX,
      bodyLeft: clearLeft,
      bodyRight: clearRight,
      gap,
    }
  );

  return { x: Math.round(nudged.x), y: Math.round(nudged.y) };
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
          // 展开后高度变了，重新避让气泡
          const place = await resolveMenuPlacement(Math.max(h, PET_MENU_H));
          menuPlace = place;
          setMenuOverlayRect({
            x: place.x,
            y: place.y,
            w: PET_MENU_W,
            h: Math.max(h, PET_MENU_H),
          });
          await applyMenuGeometry(w, place.x, place.y, h);
          void syncPetBubbleToPet();
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
  chatEnabled?: boolean;
  statsExpandDefault?: boolean;
  peekHidden?: boolean;
  skyOnPet?: boolean;
}): Promise<void> {
  await ensureMenuListeners();
  const win = await ensureMenuWindow();
  if (!win) return;

  menuExpanded = Boolean(options.statsExpandDefault);
  const h = petMenuHeight(menuExpanded);
  // 按展开高度占位，避免展开后压住气泡
  const place = await resolveMenuPlacement(PET_MENU_H);
  menuPlace = place;
  menuOpen = true;
  setMenuOverlayRect({
    x: place.x,
    y: place.y,
    w: PET_MENU_W,
    h: PET_MENU_H,
  });
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

  // 菜单落位后让气泡躲开，两边都留着
  void syncPetBubbleToPet();

  const payload: PetMenuPayload = {
    chatEnabled: Boolean(options.chatEnabled),
    statsExpandDefault: menuExpanded,
    peekHidden: Boolean(options.peekHidden),
    skyOnPet: Boolean(options.skyOnPet),
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
  setMenuOverlayRect(null);
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
  void syncPetBubbleToPet();
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
  setMenuOverlayRect(null);
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
