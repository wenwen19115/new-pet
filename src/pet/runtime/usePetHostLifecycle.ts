import type { Ref } from "vue";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { hidePetBubble, syncPetBubbleToPet } from "@/pet/windows/bubble";
import { hidePetChat } from "@/pet/windows/chat";
import { setWindowSizeKeepCenter } from "@/pet/bridge/windowAnchor";
import { isCustomVrmMotionId } from "@/pet/content/motion/customVrmMotions";
import { isPetIdleMotion } from "@/pet/content/motion/motions";
import { loadPetSettings } from "@/pet/data/settings";
import { takePetIntroPending } from "@/pet/data/storageKeys";
import { petStore } from "@/pet/data/store";
import { cancelPetTts } from "@/pet/bridge/tts";
import type { CharacterRuntimeSpec } from "@/pet/characters/types";
import type { PetMood, PetSettings } from "@/pet/data/types";
import type { ApplyPetMood } from "./petHostMood";
import { clearPetRuntimeCachesLocal } from "./clearRuntimeCaches";
import {
  getPetLocale,
  isPetLocale,
  PET_LOCALE_EVENT,
  type PetLocale,
} from "@/pet/bridge/locale";
import {
  PET_CHAT_OPEN_STATE_EVENT,
  PET_CHAT_REPLY_EVENT,
  PET_CLEAR_CACHE_EVENT,
  PET_INTRO_EVENT,
  PET_MENU_ACTION_EVENT,
  PET_MOTION_EVENT,
  PET_RESUME_EVENT,
  PET_SETTINGS_EVENT,
  PET_SUSPEND_EVENT,
  PET_BUBBLE_PONG_EVENT,
  type PetChatOpenStatePayload,
  type PetMenuAction,
  type PetMotionPayload,
} from "@/pet/events";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function clearTimer(id: number | null) {
  if (id != null) window.clearTimeout(id);
}

export function usePetHostLifecycle(deps: {
  hostAliveRef: { get: () => boolean; set: (v: boolean) => void };
  settings: Ref<PetSettings>;
  locale: Ref<PetLocale>;
  vrmSrc: Ref<string | null>;
  mood: Ref<PetMood>;
  lastLine: Ref<string | null>;
  speaking: Ref<boolean>;
  applyMood: ApplyPetMood;
  isDragging: Ref<boolean>;
  activeCharacter: { value: { runtime: CharacterRuntimeSpec } };
  winSize: Ref<{ w: number; h: number }>;
  bubbleTimerRef: { get: () => number | null; set: (id: number | null) => void };
  moodResetTimerRef: { get: () => number | null; set: (id: number | null) => void };
  onChatOpen: (open: boolean) => void;
  onSuspendRuntime: () => void;
  clearLifeTimers: () => void;
  clearUsbFollowUpTimer: () => void;
  cancelSpeech: () => void;
  clearDeskWeather: () => void;
  clearSkyWeatherBackdrop: () => void;
  clearMotionTimers: () => void;
  resetDragState: () => void;
  syncWindowCenter: () => Promise<unknown>;
  initCursorLog: () => Promise<void>;
  setWinCenterFromResize: (outer: { x: number; y: number }) => void;
  tickLeds: (now: number) => void;
  tickSwing: (dt: number) => void;
  sampleCursor: (frame: number) => void | Promise<void>;
  resetSleepTimer: () => void;
  scheduleBlink: () => void;
  scheduleIdleAction: () => void;
  scheduleAutoSpeak: () => void;
  refreshVrmSrc: () => void | Promise<void>;
  refreshUsbWatch: () => void;
  refreshDeskWeather: () => void;
  refreshSkyWeatherBackdrop: () => void;
  applySettings: (
    next: PetSettings | Partial<PetSettings>,
    options?: { introIfSkinChanged?: boolean }
  ) => void;
  speakIntro: () => void | Promise<void>;
  speakBubblePong: () => void;
  isMotionLocked: () => boolean;
  playMotionOnce: (motion: string) => void;
  onStorage: (ev: StorageEvent) => void;
  onCtxMenuAction: (action: PetMenuAction) => void;
}) {
  let rafId = 0;
  let lastTick = 0;
  let frame = 0;
  /** 串行改尺寸，避免并发读到中间态 */
  let resizeTail: Promise<void> = Promise.resolve();

  let unlistenSettings: UnlistenFn | null = null;
  let unlistenMotion: UnlistenFn | null = null;
  let unlistenIntro: UnlistenFn | null = null;
  let unlistenMenuAction: UnlistenFn | null = null;
  let unlistenChatReply: UnlistenFn | null = null;
  let unlistenChatOpen: UnlistenFn | null = null;
  let unlistenBubblePong: UnlistenFn | null = null;
  let unlistenSuspend: UnlistenFn | null = null;
  let unlistenResume: UnlistenFn | null = null;
  let unlistenClearCache: UnlistenFn | null = null;
  let unlistenLocale: UnlistenFn | null = null;

  function clearHostTimers() {
    deps.clearLifeTimers();
    clearTimer(deps.bubbleTimerRef.get());
    deps.bubbleTimerRef.set(null);
    clearTimer(deps.moodResetTimerRef.get());
    deps.moodResetTimerRef.set(null);
    deps.clearUsbFollowUpTimer();
    deps.cancelSpeech();
    deps.clearDeskWeather();
    deps.clearSkyWeatherBackdrop();
    deps.clearMotionTimers();
  }

  function resizePetWindow(): Promise<void> {
    const run = async () => {
      if (!deps.hostAliveRef.get()) return;
      try {
        const win = getCurrentWindow();
        const pos = await setWindowSizeKeepCenter(win, deps.winSize.value);
        deps.setWinCenterFromResize(pos);
        if (deps.speaking.value) void syncPetBubbleToPet();
      } catch {
        // ignore
      }
    };
    resizeTail = resizeTail.then(run, run);
    return resizeTail;
  }

  function loop(now: number) {
    if (!deps.hostAliveRef.get()) return;
    const dt = lastTick ? clamp((now - lastTick) / 1000, 0.001, 0.04) : 0.016;
    lastTick = now;
    frame += 1;

    const sleeping = deps.mood.value === "sleep" && !deps.isDragging.value;
    if (!sleeping || frame % 4 === 0) {
      if (deps.activeCharacter.value.runtime.tickLeds) {
        deps.tickLeds(now);
      }
      deps.tickSwing(dt);
    }

    if (deps.isDragging.value || (!sleeping && frame % 2 === 0)) {
      void deps.sampleCursor(frame);
    }

    rafId = window.requestAnimationFrame(loop);
  }

  function suspendHost() {
    deps.hostAliveRef.set(false);
    deps.onSuspendRuntime();
    deps.resetDragState();
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    clearHostTimers();
    cancelPetTts();
    void hidePetBubble();
    void hidePetChat();
    deps.vrmSrc.value = null;
    deps.lastLine.value = null;
    deps.speaking.value = false;
  }

  function flushPendingIntro() {
    if (!deps.hostAliveRef.get()) return;
    if (!takePetIntroPending()) return;
    void deps.speakIntro();
  }

  async function resumeHost() {
    if (deps.hostAliveRef.get()) return;
    deps.hostAliveRef.set(true);
    deps.settings.value = loadPetSettings();
    petStore.setSettings(deps.settings.value);
    try {
      const win = getCurrentWindow();
      await setWindowSizeKeepCenter(win, deps.winSize.value);
      await deps.syncWindowCenter();
    } catch {
      // ignore
    }
    lastTick = 0;
    if (!rafId) rafId = window.requestAnimationFrame(loop);
    deps.resetSleepTimer();
    deps.scheduleBlink();
    deps.scheduleIdleAction();
    deps.scheduleAutoSpeak();
    await deps.refreshVrmSrc();
    deps.refreshUsbWatch();
    deps.refreshDeskWeather();
    deps.refreshSkyWeatherBackdrop();
    flushPendingIntro();
  }

  async function mount() {
    deps.hostAliveRef.set(true);
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";

    try {
      const win = getCurrentWindow();
      await setWindowSizeKeepCenter(win, deps.winSize.value);
      await deps.syncWindowCenter();
      await deps.initCursorLog();
    } catch {
      // ignore
    }

    lastTick = 0;
    rafId = window.requestAnimationFrame(loop);
    deps.resetSleepTimer();
    deps.scheduleBlink();
    deps.scheduleIdleAction();
    deps.scheduleAutoSpeak();
    void deps.refreshVrmSrc();

    unlistenSuspend = await listen(PET_SUSPEND_EVENT, () => {
      suspendHost();
    });
    unlistenResume = await listen(PET_RESUME_EVENT, () => {
      void resumeHost();
    });
    unlistenSettings = await listen<PetSettings>(PET_SETTINGS_EVENT, (event) => {
      deps.applySettings(event.payload, { introIfSkinChanged: true });
    });
    unlistenMotion = await listen<PetMotionPayload>(PET_MOTION_EVENT, (event) => {
      if (!deps.hostAliveRef.get()) return;
      const motion = event.payload?.motion;
      if (typeof motion !== "string") return;
      if (isCustomVrmMotionId(motion)) {
        deps.playMotionOnce(motion);
        return;
      }
      if (!isPetIdleMotion(motion) || motion === "idle-float") return;
      deps.playMotionOnce(motion);
    });
    unlistenIntro = await listen(PET_INTRO_EVENT, () => {
      // 未 alive 时保留 pending，交给 mount/resume flush
      if (!deps.hostAliveRef.get()) return;
      if (!takePetIntroPending()) return;
      deps.applySettings(loadPetSettings(), { introIfSkinChanged: false });
      void deps.speakIntro();
    });
    unlistenClearCache = await listen(PET_CLEAR_CACHE_EVENT, () => {
      void clearPetRuntimeCachesLocal().then(() => {
        if (deps.hostAliveRef.get()) void deps.refreshVrmSrc();
      });
    });
    unlistenMenuAction = await listen<{ action?: PetMenuAction }>(
      PET_MENU_ACTION_EVENT,
      (event) => {
        if (!deps.hostAliveRef.get()) return;
        const action = event.payload?.action;
        if (
          action !== "open" &&
          action !== "pin" &&
          action !== "chat" &&
          action !== "hide" &&
          action !== "reveal" &&
          action !== "perform" &&
          action !== "playful" &&
          action !== "sky-on-pet" &&
          action !== "dismiss"
        ) {
          return;
        }
        deps.onCtxMenuAction(action);
      }
    );
    unlistenChatReply = await listen<{ text?: string; mood?: string }>(
      PET_CHAT_REPLY_EVENT,
      (event) => {
        if (!deps.hostAliveRef.get()) return;
        const rawMood = event.payload?.mood;
        const fromPayload =
          rawMood === "happy" ||
          rawMood === "grumpy" ||
          rawMood === "curious" ||
          rawMood === "excited" ||
          rawMood === "idle" ||
          rawMood === "sleep"
            ? rawMood
            : null;
        const next =
          fromPayload ??
          (deps.settings.value.tone === "snarky" ? "grumpy" : "happy");
        deps.applyMood(next, "chat-reply");
        clearTimer(deps.moodResetTimerRef.get());
        deps.moodResetTimerRef.set(
          window.setTimeout(() => {
            if (!deps.hostAliveRef.get()) return;
            deps.applyMood("idle", "chat-reply-end");
          }, 1600)
        );
      }
    );
    unlistenChatOpen = await listen<PetChatOpenStatePayload>(
      PET_CHAT_OPEN_STATE_EVENT,
      (event) => {
        if (!deps.hostAliveRef.get()) return;
        deps.onChatOpen(Boolean(event.payload?.open));
      }
    );
    unlistenBubblePong = await listen(PET_BUBBLE_PONG_EVENT, () => {
      if (!deps.hostAliveRef.get()) return;
      deps.speakBubblePong();
    });
    unlistenLocale = await listen<{ locale?: string }>(PET_LOCALE_EVENT, (event) => {
      const next = event.payload?.locale;
      deps.locale.value = isPetLocale(next) ? next : getPetLocale();
    });
    deps.refreshUsbWatch();
    deps.refreshDeskWeather();
    deps.refreshSkyWeatherBackdrop();
    window.addEventListener("storage", deps.onStorage);
    flushPendingIntro();
  }

  function dispose() {
    suspendHost();
    unlistenSuspend?.();
    unlistenResume?.();
    unlistenSettings?.();
    unlistenMotion?.();
    unlistenIntro?.();
    unlistenClearCache?.();
    unlistenMenuAction?.();
    unlistenChatReply?.();
    unlistenChatOpen?.();
    unlistenBubblePong?.();
    unlistenLocale?.();
    window.removeEventListener("storage", deps.onStorage);
  }

  return { mount, dispose, resizePetWindow, suspendHost, resumeHost, clearHostTimers };
}
