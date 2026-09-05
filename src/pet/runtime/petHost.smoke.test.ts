/**
 * host 回归烟测：dispose、settings、chat-open / intent、mood 门禁。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import { type PetMood, type PetSettings } from "@/pet/data/types";
import { DEFAULT_PET_SETTINGS, publishPetSettings } from "@/pet/data/settings";
import { normalizeSkyWeather } from "@/pet/data/skyWeather";
import {
  dispatchPetHostIntent,
  type PetHostIntentEffects,
} from "./petHostIntents";
import {
  applyPetMood,
  createApplyPetMood,
  moodForMotion,
  type PetMoodGateCtx,
} from "./petHostMood";
import { usePetIdleLoop } from "./usePetIdleLoop";
import { usePetHostLifecycle } from "./usePetHostLifecycle";
import { usePetSettingsSync } from "./usePetSettingsSync";
import { useSkyWeatherPetBackdrop } from "./useSkyWeatherPetBackdrop";

const hidePetChat = vi.fn();
const cancelPetTts = vi.fn();
const listenHandlers = new Map<string, (event: { payload?: unknown }) => void>();
const unlistenFns: Array<ReturnType<typeof vi.fn>> = [];

vi.mock("@/pet/windows/chat", () => ({
  hidePetChat: (...args: unknown[]) => hidePetChat(...args),
}));
vi.mock("@/pet/windows/bubble", () => ({
  syncPetBubbleToPet: vi.fn(),
}));
vi.mock("@/pet/bridge/tts", () => ({
  cancelPetTts: (...args: unknown[]) => cancelPetTts(...args),
}));
vi.mock("@/pet/data/vrmStorage", () => ({
  resolveNamedPetVrmSrc: vi.fn(async () => ({ src: null, stale: false })),
  clearedPetVrmMeta: vi.fn(() => ({
    vrmModelName: "",
    vrmModelRev: 0,
    customVrmMotions: [],
  })),
}));
vi.mock("@/pet/data/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/pet/data/settings")>();
  return {
    ...actual,
    publishPetSettings: vi.fn(async (s: PetSettings) => s),
  };
});
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (event: string, handler: (e: { payload?: unknown }) => void) => {
    listenHandlers.set(event, handler);
    const un = vi.fn(() => {
      listenHandlers.delete(event);
    });
    unlistenFns.push(un);
    return un;
  }),
  emit: vi.fn(async () => undefined),
}));
vi.mock("@/pet/bridge/skyWeather", () => ({
  fetchOpenMeteoWeather: vi.fn(async () => null),
  fetchClientGeo: vi.fn(async () => null),
}));
vi.mock("@tauri-apps/api/dpi", () => ({
  LogicalSize: class {
    constructor(
      public width: number,
      public height: number
    ) {}
  },
}));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    setSize: vi.fn(async () => undefined),
    scaleFactor: vi.fn(async () => 1),
    outerPosition: vi.fn(async () => ({
      toLogical: () => ({ x: 10, y: 20 }),
    })),
  })),
}));

function baseSettings(patch: Partial<PetSettings> = {}): PetSettings {
  return {
    ...DEFAULT_PET_SETTINGS,
    randomIdleEnabled: true,
    chatEnabled: true,
    muted: false,
    ttsEnabled: true,
    ...patch,
  };
}

function makeFx(patch: Partial<PetHostIntentEffects> = {}) {
  let chatPause = false;
  let playfulPause = false;
  let peekPause = false;
  let randomIdle = true;
  let alive = true;
  const setIdleActionTimer = vi.fn();
  const cancelFlight = vi.fn();
  const scheduleIdleAction = vi.fn();
  const fx: PetHostIntentEffects = {
    hostAlive: () => alive,
    randomIdleEnabled: () => randomIdle,
    chatPausesRandomIdle: () => chatPause,
    setChatPausesRandomIdle: (open) => {
      chatPause = open;
    },
    playfulPausesRandomIdle: () => playfulPause,
    setPlayfulPausesRandomIdle: (active) => {
      playfulPause = active;
    },
    peekPausesRandomIdle: () => peekPause,
    setPeekPausesRandomIdle: (active) => {
      peekPause = active;
    },
    setIdleActionTimer,
    cancelFlight,
    scheduleIdleAction,
    ...patch,
  };
  return {
    fx,
    setIdleActionTimer,
    cancelFlight,
    scheduleIdleAction,
    setAlive: (v: boolean) => {
      alive = v;
    },
    setRandomIdle: (v: boolean) => {
      randomIdle = v;
    },
    getChatPause: () => chatPause,
    getPlayfulPause: () => playfulPause,
    getPeekPause: () => peekPause,
  };
}

function makeMoodCtx(opts: { mood?: PetMood } = {}) {
  let mood: PetMood = opts.mood ?? "idle";
  const speaking = vi.fn(() => false);
  const dragging = vi.fn(() => false);
  const isMotionLocked = vi.fn(() => false);
  const ctx: PetMoodGateCtx = {
    getMood: () => mood,
    setMood: (m) => {
      mood = m;
    },
    speaking,
    dragging,
    isMotionLocked,
  };
  return {
    ctx,
    getMood: () => mood,
    speaking,
    dragging,
    isMotionLocked,
    apply: createApplyPetMood(ctx),
  };
}

describe("mood gate (applyPetMood)", () => {
  it("speaking 时 motion 改不了 mood", () => {
    const bag = makeMoodCtx();
    bag.speaking.mockReturnValue(true);
    expect(applyPetMood("happy", "motion", bag.ctx)).toBe(false);
    expect(bag.getMood()).toBe("idle");

    bag.speaking.mockReturnValue(false);
    expect(applyPetMood("happy", "motion", bag.ctx)).toBe(true);
    expect(bag.getMood()).toBe("happy");
  });

  it("sleep is sticky until wake", () => {
    const bag = makeMoodCtx({ mood: "sleep" });
    expect(applyPetMood("happy", "motion", bag.ctx)).toBe(false);
    expect(applyPetMood("idle", "speak-end", bag.ctx)).toBe(false);
    expect(bag.getMood()).toBe("sleep");

    expect(applyPetMood("idle", "wake", bag.ctx)).toBe(true);
    expect(bag.getMood()).toBe("idle");
  });

  it("speak-end / chat-reply-end skip idle restore while motion-locked", () => {
    const bag = makeMoodCtx({ mood: "happy" });
    bag.isMotionLocked.mockReturnValue(true);
    expect(applyPetMood("idle", "speak-end", bag.ctx)).toBe(false);
    expect(applyPetMood("idle", "chat-reply-end", bag.ctx)).toBe(false);
    expect(bag.getMood()).toBe("happy");

    bag.isMotionLocked.mockReturnValue(false);
    expect(applyPetMood("idle", "speak-end", bag.ctx)).toBe(true);
    expect(bag.getMood()).toBe("idle");
  });

  it("moodForMotion maps built-in motions", () => {
    expect(moodForMotion("happy-bounce")).toBe("happy");
    expect(moodForMotion("fly-orbit")).toBe("excited");
    expect(moodForMotion("idle-float")).toBe("idle");
  });

  it("playful mood reasons", () => {
    const bag = makeMoodCtx();
    expect(applyPetMood("curious", "playful-flee", bag.ctx)).toBe(true);
    expect(bag.getMood()).toBe("curious");
    expect(applyPetMood("happy", "playful-catch", bag.ctx)).toBe(true);
    expect(bag.getMood()).toBe("happy");
    expect(applyPetMood("grumpy", "playful-miss", bag.ctx)).toBe(true);
    expect(applyPetMood("grumpy", "bubble-pong", bag.ctx)).toBe(true);
    expect(bag.getMood()).toBe("grumpy");

    const sleepBag = makeMoodCtx({ mood: "sleep" });
    expect(applyPetMood("curious", "playful-flee", sleepBag.ctx)).toBe(false);
    expect(applyPetMood("grumpy", "bubble-pong", sleepBag.ctx)).toBe(false);
  });

  it("peek mood reasons", () => {
    const bag = makeMoodCtx();
    expect(applyPetMood("curious", "peek-hide", bag.ctx)).toBe(true);
    expect(bag.getMood()).toBe("curious");
    expect(applyPetMood("happy", "peek-reveal", bag.ctx)).toBe(true);
    expect(bag.getMood()).toBe("happy");
    const sleepBag = makeMoodCtx({ mood: "sleep" });
    expect(applyPetMood("curious", "peek-hide", sleepBag.ctx)).toBe(false);
  });

  it("drag-land mood reason", () => {
    const bag = makeMoodCtx();
    expect(applyPetMood("happy", "drag-land", bag.ctx)).toBe(true);
    expect(bag.getMood()).toBe("happy");
    const sleepBag = makeMoodCtx({ mood: "sleep" });
    expect(applyPetMood("happy", "drag-land", sleepBag.ctx)).toBe(false);
  });
});

describe("host intent dispatch", () => {
  it("chat-open intent pauses idle and cancels flight; close reschedules", () => {
    const bag = makeFx();
    dispatchPetHostIntent({ type: "chat-open", open: true }, bag.fx);
    expect(bag.getChatPause()).toBe(true);
    expect(bag.setIdleActionTimer).toHaveBeenCalledWith(null);
    expect(bag.cancelFlight).toHaveBeenCalledTimes(1);
    expect(bag.scheduleIdleAction).not.toHaveBeenCalled();

    bag.setIdleActionTimer.mockClear();
    bag.cancelFlight.mockClear();
    dispatchPetHostIntent({ type: "chat-open", open: false }, bag.fx);
    expect(bag.getChatPause()).toBe(false);
    expect(bag.scheduleIdleAction).toHaveBeenCalledTimes(1);
  });

  it("random-idle-setting off clears idle timer and cancels flight", () => {
    const bag = makeFx();
    bag.setIdleActionTimer.mockClear();
    bag.cancelFlight.mockClear();
    dispatchPetHostIntent({ type: "random-idle-setting", enabled: false }, bag.fx);
    expect(bag.setIdleActionTimer).toHaveBeenCalledWith(null);
    expect(bag.cancelFlight).toHaveBeenCalledTimes(1);
    expect(bag.scheduleIdleAction).not.toHaveBeenCalled();
  });

  it("random-idle-setting respects chat pause", () => {
    const bag = makeFx();
    dispatchPetHostIntent({ type: "chat-open", open: true }, bag.fx);
    bag.scheduleIdleAction.mockClear();
    bag.setIdleActionTimer.mockClear();

    dispatchPetHostIntent({ type: "random-idle-setting", enabled: true }, bag.fx);
    expect(bag.scheduleIdleAction).not.toHaveBeenCalled();
    expect(bag.setIdleActionTimer).toHaveBeenCalledWith(null);

    dispatchPetHostIntent({ type: "chat-open", open: false }, bag.fx);
    bag.scheduleIdleAction.mockClear();
    dispatchPetHostIntent({ type: "random-idle-setting", enabled: true }, bag.fx);
    expect(bag.scheduleIdleAction).toHaveBeenCalledTimes(1);
  });

  it("suspend-runtime clears idle timer, flight, and playful pause", () => {
    const bag = makeFx();
    dispatchPetHostIntent({ type: "playful-chase", active: true }, bag.fx);
    expect(bag.getPlayfulPause()).toBe(true);
    bag.setIdleActionTimer.mockClear();
    bag.cancelFlight.mockClear();

    dispatchPetHostIntent({ type: "suspend-runtime" }, bag.fx);
    expect(bag.getPlayfulPause()).toBe(false);
    expect(bag.setIdleActionTimer).toHaveBeenCalledWith(null);
    expect(bag.cancelFlight).toHaveBeenCalledTimes(1);
  });

  it("playful-chase pauses idle; close reschedules unless asked not to", () => {
    const bag = makeFx();
    dispatchPetHostIntent({ type: "playful-chase", active: true }, bag.fx);
    expect(bag.getPlayfulPause()).toBe(true);
    expect(bag.setIdleActionTimer).toHaveBeenCalledWith(null);
    expect(bag.scheduleIdleAction).not.toHaveBeenCalled();

    bag.scheduleIdleAction.mockClear();
    dispatchPetHostIntent({ type: "playful-chase", active: false }, bag.fx);
    expect(bag.getPlayfulPause()).toBe(false);
    expect(bag.scheduleIdleAction).toHaveBeenCalledTimes(1);

    dispatchPetHostIntent({ type: "playful-chase", active: true }, bag.fx);
    bag.scheduleIdleAction.mockClear();
    dispatchPetHostIntent(
      { type: "playful-chase", active: false, rescheduleIdle: false },
      bag.fx
    );
    expect(bag.getPlayfulPause()).toBe(false);
    expect(bag.scheduleIdleAction).not.toHaveBeenCalled();
  });

  it("chat-open close does not reschedule while playful chase pauses idle", () => {
    const bag = makeFx();
    dispatchPetHostIntent({ type: "playful-chase", active: true }, bag.fx);
    dispatchPetHostIntent({ type: "chat-open", open: true }, bag.fx);
    bag.scheduleIdleAction.mockClear();
    dispatchPetHostIntent({ type: "chat-open", open: false }, bag.fx);
    expect(bag.scheduleIdleAction).not.toHaveBeenCalled();
  });

  it("peek-hide pauses idle; reveal reschedules", () => {
    const bag = makeFx();
    dispatchPetHostIntent({ type: "peek-hide", active: true }, bag.fx);
    expect(bag.getPeekPause()).toBe(true);
    expect(bag.setIdleActionTimer).toHaveBeenCalledWith(null);
    bag.scheduleIdleAction.mockClear();
    dispatchPetHostIntent({ type: "peek-hide", active: false }, bag.fx);
    expect(bag.getPeekPause()).toBe(false);
    expect(bag.scheduleIdleAction).toHaveBeenCalledTimes(1);
  });

  it("suspend-runtime clears peek pause", () => {
    const bag = makeFx();
    dispatchPetHostIntent({ type: "peek-hide", active: true }, bag.fx);
    dispatchPetHostIntent({ type: "suspend-runtime" }, bag.fx);
    expect(bag.getPeekPause()).toBe(false);
  });
});

describe("host regression smokes", () => {
  beforeEach(() => {
    listenHandlers.clear();
    unlistenFns.length = 0;
    hidePetChat.mockClear();
    cancelPetTts.mockClear();
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      }),
    });
  });

  it("idle loop does not schedule while paused (chat-open)", () => {
    let idleTimer: number | null = 42;
    const clearTimer = vi.fn((id: number | null) => {
      if (id != null) window.clearTimeout(id);
    });
    let paused = true;
    const loop = usePetIdleLoop({
      settings: ref(baseSettings()),
      model: { value: "chip" },
      speaking: ref(false),
      isDragging: ref(false),
      mood: ref("idle"),
      isMotionLocked: () => false,
      isPaused: () => paused,
      beginMotion: vi.fn(),
      clearTimer,
      getIdleActionTimer: () => idleTimer,
      setIdleActionTimer: (id) => {
        idleTimer = id;
      },
    });

    loop.scheduleIdleAction();
    expect(idleTimer).toBeNull();

    paused = false;
    loop.scheduleIdleAction();
    expect(idleTimer).not.toBeNull();
    if (idleTimer != null) window.clearTimeout(idleTimer);
  });

  it("settings apply routes random-idle changes through onRandomIdleSetting", () => {
    const settings = ref(baseSettings());
    const vrmSrc = ref<string | null>("blob:vrm");
    const onRandomIdleSetting = vi.fn();

    const sync = usePetSettingsSync({
      settings,
      vrmSrc,
      hostAlive: () => true,
      getActiveSkinId: () => settings.value.lookId,
      getActiveSkinModel: () => settings.value.modelKind,
      refreshUsbWatch: vi.fn(),
      refreshDeskWeather: vi.fn(),
      refreshSkyWeatherBackdrop: vi.fn(),
      resizePetWindow: vi.fn(),
      onRandomIdleSetting,
      speakIntro: vi.fn(),
    });

    const withRandomIdle = (enabled: boolean): PetSettings => {
      const model = settings.value.modelKind;
      const prev = settings.value.profiles[model]!;
      return {
        ...settings.value,
        randomIdleEnabled: enabled,
        profiles: {
          ...settings.value.profiles,
          [model]: { ...prev, randomIdleEnabled: enabled },
        },
      };
    };

    sync.applySettings(withRandomIdle(false));
    expect(onRandomIdleSetting).toHaveBeenCalledWith(false);

    onRandomIdleSetting.mockClear();
    sync.applySettings(withRandomIdle(true));
    expect(onRandomIdleSetting).toHaveBeenCalledWith(true);

    sync.applySettings({
      ...settings.value,
      chatEnabled: false,
    });
    expect(hidePetChat).toHaveBeenCalled();

    sync.applySettings({
      ...settings.value,
      chatEnabled: true,
      muted: true,
      profiles: {
        ...settings.value.profiles,
        [settings.value.modelKind]: {
          ...settings.value.profiles[settings.value.modelKind]!,
          muted: true,
        },
      },
    });
    expect(cancelPetTts).toHaveBeenCalled();
  });

  it("未召唤时切形象不触发 intro 气泡", () => {
    const settings = ref({ ...baseSettings(), enabled: false });
    const speakIntro = vi.fn();
    const sync = usePetSettingsSync({
      settings,
      vrmSrc: ref<string | null>(null),
      hostAlive: () => false,
      getActiveSkinId: () => settings.value.lookId,
      getActiveSkinModel: () => settings.value.modelKind,
      refreshUsbWatch: vi.fn(),
      refreshDeskWeather: vi.fn(),
      refreshSkyWeatherBackdrop: vi.fn(),
      resizePetWindow: vi.fn(),
      onRandomIdleSetting: vi.fn(),
      speakIntro,
    });

    const fromLook = settings.value.lookId;
    // 换 look（同模型不同皮肤）会改 active skin id
    const looks = ["cyan", "pink", "mint", "amber"] as const;
    const nextLook = looks.find((id) => id !== fromLook) ?? "pink";
    sync.applySettings(
      {
        ...settings.value,
        lookId: nextLook,
        profiles: {
          ...settings.value.profiles,
          [settings.value.modelKind]: {
            ...settings.value.profiles[settings.value.modelKind]!,
            lookId: nextLook,
          },
        },
      },
      { introIfSkinChanged: true }
    );
    expect(speakIntro).not.toHaveBeenCalled();

    settings.value = { ...settings.value, enabled: true };
    sync.applySettings(
      {
        ...settings.value,
        lookId: fromLook,
        profiles: {
          ...settings.value.profiles,
          [settings.value.modelKind]: {
            ...settings.value.profiles[settings.value.modelKind]!,
            lookId: fromLook,
          },
        },
      },
      { introIfSkinChanged: true }
    );
    expect(speakIntro).toHaveBeenCalledTimes(1);
  });

  it("lifecycle dispose suspends host and tears down listeners/state", async () => {
    let hostAlive = true;
    const settings = ref(baseSettings());
    const vrmSrc = ref<string | null>("blob:vrm");
    const mood = ref<PetMood>("idle");
    const lastLine = ref<string | null>("hi");
    const speaking = ref(true);
    const isDragging = ref(false);
    const clearLifeTimers = vi.fn();
    const clearUsbFollowUpTimer = vi.fn();
    const clearMotionTimers = vi.fn();
    const resetDragState = vi.fn();
    const onStorage = vi.fn();
    const onChatOpen = vi.fn();
    const onSuspendRuntime = vi.fn();
    const applyMood = createApplyPetMood({
      getMood: () => mood.value,
      setMood: (m) => {
        mood.value = m;
      },
      speaking: () => speaking.value,
      dragging: () => isDragging.value,
      isMotionLocked: () => false,
    });

    const life = usePetHostLifecycle({
      hostAliveRef: {
        get: () => hostAlive,
        set: (v) => {
          hostAlive = v;
        },
      },
      settings,
      locale: ref<"zh" | "en">("zh"),
      vrmSrc,
      mood,
      applyMood,
      lastLine,
      speaking,
      isDragging,
      activeCharacter: {
        value: {
          runtime: {
            gaze: { max: 1, range: 1, follow: 1 },
            tapFallbackMotion: "happy-bounce",
            screenFlight: "fly",
            dragLandMotions: ["happy-bounce", "bow-nod"],
          },
        },
      },
      winSize: ref({ w: 200, h: 200 }),
      bubbleTimerRef: { get: () => null, set: () => {} },
      moodResetTimerRef: { get: () => null, set: () => {} },
      onChatOpen,
      onSuspendRuntime,
      clearLifeTimers,
      clearUsbFollowUpTimer,
      clearDeskWeather: vi.fn(),
      clearSkyWeatherBackdrop: vi.fn(),
      clearMotionTimers,
      resetDragState,
      syncWindowCenter: vi.fn(async () => undefined),
      initCursorLog: vi.fn(async () => undefined),
      setWinCenterFromResize: vi.fn(),
      tickLeds: vi.fn(),
      tickSwing: vi.fn(),
      sampleCursor: vi.fn(),
      resetSleepTimer: vi.fn(),
      scheduleBlink: vi.fn(),
      scheduleIdleAction: vi.fn(),
      scheduleAutoSpeak: vi.fn(),
      refreshVrmSrc: vi.fn(),
      refreshUsbWatch: vi.fn(),
      refreshDeskWeather: vi.fn(),
      refreshSkyWeatherBackdrop: vi.fn(),
      applySettings: vi.fn(),
      speakIntro: vi.fn(),
      speakBubblePong: vi.fn(),
      isMotionLocked: () => false,
      playMotionOnce: vi.fn(),
      onStorage,
      onCtxMenuAction: vi.fn(),
    });

    await life.mount();
    expect(listenHandlers.size).toBeGreaterThan(3);

    const chatOpen = listenHandlers.get("pet://chat-open-state");
    chatOpen?.({ payload: { open: true } });
    expect(onChatOpen).toHaveBeenCalledWith(true);

    life.dispose();
    expect(hostAlive).toBe(false);
    expect(onSuspendRuntime).toHaveBeenCalled();
    expect(speaking.value).toBe(false);
    expect(vrmSrc.value).toBeNull();
    expect(lastLine.value).toBeNull();
    expect(clearLifeTimers).toHaveBeenCalled();
    expect(clearUsbFollowUpTimer).toHaveBeenCalled();
    expect(clearMotionTimers).toHaveBeenCalled();
    expect(resetDragState).toHaveBeenCalled();
    expect(hidePetChat).toHaveBeenCalled();
    expect(cancelPetTts).toHaveBeenCalled();
    for (const un of unlistenFns) {
      expect(un).toHaveBeenCalled();
    }
  });

  it("mount flushes pending summon intro", async () => {
    const { markPetIntroPending } = await import("@/pet/data/storageKeys");
    markPetIntroPending();

    let hostAlive = false;
    const speakIntro = vi.fn();
    const applySettings = vi.fn();
    const settings = ref(baseSettings());
    const vrmSrc = ref<string | null>(null);
    const mood = ref<PetMood>("idle");
    const lastLine = ref<string | null>(null);
    const speaking = ref(false);
    const isDragging = ref(false);
    const applyMood = createApplyPetMood({
      getMood: () => mood.value,
      setMood: (m) => {
        mood.value = m;
      },
      speaking: () => speaking.value,
      dragging: () => isDragging.value,
      isMotionLocked: () => false,
    });

    const life = usePetHostLifecycle({
      hostAliveRef: {
        get: () => hostAlive,
        set: (v) => {
          hostAlive = v;
        },
      },
      settings,
      locale: ref<"zh" | "en">("zh"),
      vrmSrc,
      mood,
      applyMood,
      lastLine,
      speaking,
      isDragging,
      activeCharacter: {
        value: {
          runtime: {
            gaze: { max: 1, range: 1, follow: 1 },
            tapFallbackMotion: "happy-bounce",
            screenFlight: "fly",
            dragLandMotions: ["happy-bounce"],
          },
        },
      },
      winSize: ref({ w: 200, h: 200 }),
      bubbleTimerRef: { get: () => null, set: () => {} },
      moodResetTimerRef: { get: () => null, set: () => {} },
      onChatOpen: vi.fn(),
      onSuspendRuntime: vi.fn(),
      clearLifeTimers: vi.fn(),
      clearUsbFollowUpTimer: vi.fn(),
      clearDeskWeather: vi.fn(),
      clearSkyWeatherBackdrop: vi.fn(),
      clearMotionTimers: vi.fn(),
      resetDragState: vi.fn(),
      syncWindowCenter: vi.fn(async () => undefined),
      initCursorLog: vi.fn(async () => undefined),
      setWinCenterFromResize: vi.fn(),
      tickLeds: vi.fn(),
      tickSwing: vi.fn(),
      sampleCursor: vi.fn(),
      resetSleepTimer: vi.fn(),
      scheduleBlink: vi.fn(),
      scheduleIdleAction: vi.fn(),
      scheduleAutoSpeak: vi.fn(),
      refreshVrmSrc: vi.fn(),
      refreshUsbWatch: vi.fn(),
      refreshDeskWeather: vi.fn(),
      refreshSkyWeatherBackdrop: vi.fn(),
      applySettings,
      speakIntro,
      speakBubblePong: vi.fn(),
      isMotionLocked: () => false,
      playMotionOnce: vi.fn(),
      onStorage: vi.fn(),
      onCtxMenuAction: vi.fn(),
    });

    await life.mount();
    expect(speakIntro).toHaveBeenCalledTimes(1);

    const { markPetIntroPending: markAgain } = await import(
      "@/pet/data/storageKeys"
    );
    markAgain();
    listenHandlers.get("pet://intro")?.({});
    expect(speakIntro).toHaveBeenCalledTimes(2);
    expect(applySettings).toHaveBeenCalled();

    speakIntro.mockClear();
    listenHandlers.get("pet://intro")?.({});
    expect(speakIntro).not.toHaveBeenCalled();

    life.dispose();
  });
});

describe("sky weather pet backdrop stop flush", () => {
  beforeEach(() => {
    vi.mocked(publishPetSettings).mockClear();
    vi.mocked(publishPetSettings).mockImplementation(async (s) => s);
  });

  it("stopLeader 在 running 已关后仍 flush 落盘", async () => {
    const settings = ref(
      baseSettings({
        skyWeather: normalizeSkyWeather({
          enableOnPet: true,
          linkBootstrapped: true,
          todMode: "offline",
          weatherMode: "offline",
          manualTod: "noon",
          manualWeather: "cloudy",
          runtime: {
            ...normalizeSkyWeather({}).runtime,
            lastDayRollKey: "2026-01-01",
          },
        }),
      })
    );

    let clearFn: (() => void) | null = null;
    const app = createApp(
      defineComponent({
        setup() {
          const skyVisualHold = ref(false);
          const backdrop = useSkyWeatherPetBackdrop({
            settings,
            skyVisualHold,
          });
          clearFn = backdrop.clearSkyWeatherBackdrop;
          return () => h("div");
        },
      })
    );
    app.mount(document.createElement("div"));
    await nextTick();

    expect(clearFn).toBeTypeOf("function");
    vi.mocked(publishPetSettings).mockClear();
    (clearFn as () => void)();
    await nextTick();
    expect(publishPetSettings).toHaveBeenCalled();

    app.unmount();
  });
});
