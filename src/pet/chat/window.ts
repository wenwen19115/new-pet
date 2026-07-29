import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { emit, emitTo, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { petBodyBox } from "../sizes";
import { loadPetSettings } from "../settings";
import { petStore } from "../store";
import { resolveAppearance } from "../skins";
import { getPetLocale } from "../locale";
import { getCharacter } from "../characters";
import {
  PET_CHAT_ACTIVITY_EVENT,
  PET_CHAT_CLOSE_REQ_EVENT,
  PET_CHAT_GAP,
  PET_CHAT_H,
  PET_CHAT_HIDE_EVENT,
  PET_CHAT_IDLE_MS,
  PET_CHAT_LABEL,
  PET_CHAT_OPEN_STATE_EVENT,
  PET_CHAT_SHOW_EVENT,
  PET_CHAT_W,
  type PetChatShowPayload,
} from "./types";
import { normalizePetChatAi } from "./providers";
function chatUrl(): string {
  if (import.meta.env.DEV) {
    return `${window.location.origin}/src/pet/chat/chat.html`;
  }
  return "src/pet/chat/chat.html";
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

async function ensureChatWindow(): Promise<WebviewWindow | null> {
  const existing = await WebviewWindow.getByLabel(PET_CHAT_LABEL);
  if (existing) return existing;

  const win = new WebviewWindow(PET_CHAT_LABEL, {
    url: chatUrl(),
    title: "Chip Pet Chat",
    width: PET_CHAT_W,
    height: PET_CHAT_H,
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

async function resolveChatPlacement(): Promise<{ x: number; y: number }> {
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
  const bodyTop = petCenterY - body.h / 2;

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

  const gap = PET_CHAT_GAP;
  const need = PET_CHAT_W + Math.max(0, gap);
  const spaceRight = workRight - bodyRight;
  const spaceLeft = bodyLeft - workLeft;

  let side: "left" | "right";
  if (spaceRight >= need) side = "right";
  else if (spaceLeft >= need) side = "left";
  else side = spaceRight >= spaceLeft ? "right" : "left";

  let x = side === "right" ? bodyRight + gap : bodyLeft - gap - PET_CHAT_W;
  let y = bodyTop - gap - 8;

  const minX = workLeft + 4;
  const maxX = Math.max(minX, workRight - PET_CHAT_W - 4);
  const minY = workTop + 4;
  const maxY = Math.max(minY, workBottom - PET_CHAT_H - 4);

  x = clamp(x, minX, maxX);
  y = clamp(y, minY, maxY);
  return { x: Math.round(x), y: Math.round(y) };
}

async function applyChatGeometry(
  win: WebviewWindow,
  x: number,
  y: number
): Promise<void> {
  await win.setSize(new LogicalSize(PET_CHAT_W, PET_CHAT_H));
  await win.setPosition(new LogicalPosition(x, y));
}

let chatOpen = false;
let idleTimer: number | null = null;
let unlistenActivity: UnlistenFn | null = null;
let unlistenCloseReq: UnlistenFn | null = null;
let listenersReady = false;

function clearIdleTimer() {
  if (idleTimer == null) return;
  window.clearTimeout(idleTimer);
  idleTimer = null;
}

function bumpIdleTimer() {
  clearIdleTimer();
  if (!chatOpen) return;
  idleTimer = window.setTimeout(() => {
    void hidePetChat();
  }, PET_CHAT_IDLE_MS);
}

async function ensureChatListeners() {
  if (listenersReady) return;
  listenersReady = true;
  unlistenActivity = await listen(PET_CHAT_ACTIVITY_EVENT, () => {
    bumpIdleTimer();
  });
  unlistenCloseReq = await listen(PET_CHAT_CLOSE_REQ_EVENT, () => {
    void hidePetChat();
  });
}

function buildShowPayload(): PetChatShowPayload {
  // Prefer in-memory store (synced via settings events across webviews)
  const s = petStore.settings ?? loadPetSettings();
  const character = getCharacter(s.modelKind);
  const petName =
    s.nickname.trim() ||
    character.form.defaultNickname ||
    character.id;
  return {
    petName,
    personality: s.personality,
    tone: s.tone,
    muted: s.muted,
    ttsEnabled: s.ttsEnabled,
    ttsVoiceUri: s.ttsVoiceUri,
    modelKind: s.modelKind,
    lang: getPetLocale(),
    chatAi: normalizePetChatAi(s.chatAi),
  };
}

async function emitChatOpenState(open: boolean) {
  try {
    await emit(PET_CHAT_OPEN_STATE_EVENT, { open });
  } catch {
    // ignore
  }
}

export function isPetChatOpen(): boolean {
  return chatOpen;
}

export async function showPetChat(): Promise<void> {
  await ensureChatListeners();
  const win = await ensureChatWindow();
  if (!win) return;

  const place = await resolveChatPlacement();
  chatOpen = true;
  bumpIdleTimer();
  void emitChatOpenState(true);

  try {
    await applyChatGeometry(win, place.x, place.y);
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
    await applyChatGeometry(win, place.x, place.y);
  } catch (err) {
    console.warn("[pet] chat place failed", err);
  }

  const payload = buildShowPayload();
  await new Promise((r) => window.setTimeout(r, 40));
  try {
    await emitTo(PET_CHAT_LABEL, PET_CHAT_SHOW_EVENT, payload);
  } catch {
    try {
      await emit(PET_CHAT_SHOW_EVENT, payload);
    } catch {
      // ignore
    }
  }
}

async function hideChatWindow(): Promise<void> {
  chatOpen = false;
  clearIdleTimer();
  void emitChatOpenState(false);
  let existing: Awaited<ReturnType<typeof WebviewWindow.getByLabel>> = null;
  try {
    existing = await WebviewWindow.getByLabel(PET_CHAT_LABEL);
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

export async function hidePetChat(): Promise<void> {
  try {
    await emitTo(PET_CHAT_LABEL, PET_CHAT_HIDE_EVENT, null);
  } catch {
    // ignore
  }
  try {
    await emit(PET_CHAT_HIDE_EVENT, null);
  } catch {
    // ignore
  }
  await hideChatWindow();
}

export async function togglePetChat(): Promise<void> {
  if (chatOpen) {
    await hidePetChat();
    return;
  }
  await showPetChat();
}

export async function destroyChatWindow(): Promise<void> {
  chatOpen = false;
  clearIdleTimer();
  void emitChatOpenState(false);
  unlistenActivity?.();
  unlistenCloseReq?.();
  unlistenActivity = null;
  unlistenCloseReq = null;
  listenersReady = false;
  let existing: Awaited<ReturnType<typeof WebviewWindow.getByLabel>> = null;
  try {
    existing = await WebviewWindow.getByLabel(PET_CHAT_LABEL);
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
