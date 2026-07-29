import { computed, reactive, ref } from "vue";
import { getCharacter } from "@/pet/characters";
import { syncPetBubbleToPet } from "@/pet/windows/bubble";
import { isPetMenuOpen } from "@/pet/windows/menu";
import { loadPetSettings } from "@/pet/data/settings";
import { resolveAppearance } from "@/pet/skins";
import { petBodyBox, petWindowSize } from "@/pet/bridge/sizes";
import type { PetMood, PetSettings } from "@/pet/data/types";
import { usePetIdleLoop } from "./usePetIdleLoop";
import { usePetLifeTimers } from "./usePetLifeTimers";
import { usePetMotionHost } from "./usePetMotionHost";
import { usePetPointerHost } from "./usePetPointerHost";
import { usePetSpeech } from "./usePetSpeech";
import { usePetHostLifecycle } from "./usePetHostLifecycle";
import { usePetSettingsSync } from "./usePetSettingsSync";
import { usePetShellActions } from "./usePetShellActions";

export type PetHostPorts = {
  scheduleIdleAction: () => void;
  scheduleAutoSpeak: () => void;
  resetSleepTimer: () => void;
  wakeFromSleep: () => void;
  speakText: (
    text: string,
    fromAuto: boolean,
    opts?: { keepMotion?: boolean }
  ) => void | Promise<void>;
  speak: (fromAuto?: boolean) => void | Promise<void>;
  onBeforeDrag: () => void;
  onTap: () => void;
  onAfterPointerUp: (info: { wasDragging: boolean }) => void;
};

function createDefaultPorts(): PetHostPorts {
  return {
    scheduleIdleAction: () => {},
    scheduleAutoSpeak: () => {},
    resetSleepTimer: () => {},
    wakeFromSleep: () => {},
    speakText: () => {},
    speak: () => {},
    onBeforeDrag: () => {},
    onTap: () => {},
    onAfterPointerUp: () => {},
  };
}

function clearTimer(id: number | null) {
  if (id != null) window.clearTimeout(id);
}

/** Shared pet runtime: state, ports bag, and sub-host wiring. */
export function createPetHost() {
  const settings = ref<PetSettings>(loadPetSettings());
  const vrmSrc = ref<string | null>(null);
  const mood = ref<PetMood>("idle");
  const lastLine = ref<string | null>(null);
  const idleMotion = ref<string>("idle-float");
  const speaking = ref(false);
  const gaze = reactive({ x: 0, y: 0 });

  const ports = createDefaultPorts();

  let bubbleTimer: number | null = null;
  let moodResetTimer: number | null = null;
  let chatPausesRandomIdle = false;
  let hostAlive = true;

  const activeSkin = computed(() =>
    resolveAppearance(settings.value.modelKind, settings.value.lookId)
  );
  const activeCharacter = computed(() => getCharacter(activeSkin.value.model));
  const v = computed(() => activeSkin.value.visual);
  const winSize = computed(() =>
    petWindowSize(activeSkin.value.model, settings.value.zoomPercent)
  );
  const bodyBox = computed(() =>
    petBodyBox(activeSkin.value.model, settings.value.zoomPercent)
  );
  const activeModel = computed(() => activeSkin.value.model);

  const pointerHost = usePetPointerHost({
    hostAlive: () => hostAlive,
    winSize,
    bodyBox,
    mood,
    speaking,
    hitBoundsEnabled: () => settings.value.hitBoundsEnabled,
    isMenuOpen: () => isPetMenuOpen(),
    gaze,
    gazeConfig: () => activeCharacter.value.runtime.gaze,
    onBeforeDrag: () => ports.onBeforeDrag(),
    onTap: () => ports.onTap(),
    onAfterPointerUp: (info) => ports.onAfterPointerUp(info),
    syncBubble: () => {
      if (speaking.value) void syncPetBubbleToPet();
    },
  });

  const {
    isDragging,
    showHitBounds,
    dragTrailAngle,
    dragTrailSpeed,
    physicsActive,
    physicsStyle,
    onPointerMove,
    onPointerUp,
    tickSwing,
    sampleCursor,
    resetDragState,
    syncWindowCenter,
    initCursorLog,
    setWinCenterFromResize,
  } = pointerHost;

  const motionHost = usePetMotionHost({
    settings,
    activeSkin,
    activeCharacter,
    winSize,
    mood,
    speaking,
    isDragging,
    idleMotion,
    clearTimer,
    scheduleIdleAction: () => ports.scheduleIdleAction(),
    speakText: (text, fromAuto, opts) => ports.speakText(text, fromAuto, opts),
    wakeFromSleep: () => ports.wakeFromSleep(),
    resetSleepTimer: () => ports.resetSleepTimer(),
    clearMoodResetTimer: () => {
      clearTimer(moodResetTimer);
      moodResetTimer = null;
    },
  });

  const {
    motionPlayId,
    flyVisualX,
    flyVisualY,
    vrmFaceYaw,
    wormholePhase,
    pinColors,
    tickLeds,
    isMotionLocked,
    beginMotion,
    playMotionOnce,
    cancelActiveMotion,
    cancelFlight,
    clearMotionTimers,
    getIdleActionTimer,
    setIdleActionTimer,
  } = motionHost;

  const speech = usePetSpeech({
    settings,
    model: activeModel,
    mood,
    speaking,
    lastLine,
    idleMotion,
    isDragging,
    isMotionLocked,
    resetSleepTimer: () => ports.resetSleepTimer(),
    scheduleAutoSpeak: () => ports.scheduleAutoSpeak(),
    clearTimer,
    setBubbleTimer: (id) => {
      bubbleTimer = id;
    },
    setMoodResetTimer: (id) => {
      moodResetTimer = id;
    },
    getBubbleTimer: () => bubbleTimer,
    getMoodResetTimer: () => moodResetTimer,
  });

  const { speakText, speak, speakIntro, speakTapEgg } = speech;

  const life = usePetLifeTimers({
    settings,
    mood,
    speaking,
    isDragging,
    idleMotion,
    clearTimer,
    speak: (fromAuto) => speak(fromAuto),
    speakUsb: (payload) => speech.speakUsb(payload),
    onEnterSleep: () => {
      cancelActiveMotion({ resetVisuals: false });
      clearMotionTimers();
    },
  });

  const {
    blinking,
    wakeFromSleep,
    resetSleepTimer,
    scheduleBlink,
    scheduleAutoSpeak,
    refreshUsbWatch,
    clearLifeTimers,
  } = life;

  ports.resetSleepTimer = resetSleepTimer;
  ports.scheduleAutoSpeak = scheduleAutoSpeak;
  ports.wakeFromSleep = wakeFromSleep;
  ports.speakText = speakText;
  ports.speak = speak;

  const idleLoop = usePetIdleLoop({
    settings,
    model: activeModel,
    speaking,
    isDragging,
    mood,
    isMotionLocked,
    isPaused: () => chatPausesRandomIdle,
    beginMotion,
    clearTimer,
    getIdleActionTimer,
    setIdleActionTimer,
  });

  ports.scheduleIdleAction = idleLoop.scheduleIdleAction;

  let resizePetWindow: () => void | Promise<void> = () => {};

  const settingsSync = usePetSettingsSync({
    settings,
    vrmSrc,
    hostAlive: () => hostAlive,
    getChatPausesRandomIdle: () => chatPausesRandomIdle,
    getActiveSkinId: () => activeSkin.value.id,
    getActiveSkinModel: () => activeSkin.value.model,
    refreshUsbWatch,
    resizePetWindow: () => resizePetWindow(),
    setIdleActionTimer,
    scheduleIdleAction: () => ports.scheduleIdleAction(),
    speakIntro,
  });

  const shell = usePetShellActions({
    ports,
    settings,
    speaking,
    activeSkin,
    activeCharacter,
    cancelActiveMotion,
    clearMotionTimers,
    beginMotion,
    speakTapEgg,
    speak,
    pointerOnPointerDown: pointerHost.onPointerDown,
  });

  const lifecycle = usePetHostLifecycle({
    hostAliveRef: {
      get: () => hostAlive,
      set: (v) => {
        hostAlive = v;
      },
    },
    settings,
    vrmSrc,
    mood,
    lastLine,
    speaking,
    isDragging,
    activeCharacter,
    winSize,
    bubbleTimerRef: {
      get: () => bubbleTimer,
      set: (id) => {
        bubbleTimer = id;
      },
    },
    moodResetTimerRef: {
      get: () => moodResetTimer,
      set: (id) => {
        moodResetTimer = id;
      },
    },
    getChatPausesRandomIdle: () => chatPausesRandomIdle,
    setChatPausesRandomIdle: (open) => {
      chatPausesRandomIdle = open;
      if (open) {
        setIdleActionTimer(null);
        cancelFlight();
        return;
      }
      if (hostAlive && settings.value.randomIdleEnabled) {
        ports.scheduleIdleAction();
      }
    },
    clearLifeTimers,
    clearMotionTimers,
    cancelFlight,
    resetDragState,
    syncWindowCenter,
    initCursorLog,
    setWinCenterFromResize,
    tickLeds,
    tickSwing,
    sampleCursor,
    resetSleepTimer,
    scheduleBlink,
    scheduleIdleAction: () => ports.scheduleIdleAction(),
    scheduleAutoSpeak,
    refreshVrmSrc: settingsSync.refreshVrmSrc,
    refreshUsbWatch,
    applySettings: settingsSync.applySettings,
    speakIntro,
    isMotionLocked,
    playMotionOnce,
    showHitBounds,
    onStorage: settingsSync.onStorage,
    onCtxMenuAction: shell.onCtxMenuAction,
  });

  resizePetWindow = lifecycle.resizePetWindow;

  return {
    settings,
    vrmSrc,
    mood,
    idleMotion,
    speaking,
    gaze,
    activeSkin,
    activeCharacter,
    v,
    bodyBox,
    isDragging,
    showHitBounds,
    dragTrailAngle,
    dragTrailSpeed,
    physicsActive,
    physicsStyle,
    motionPlayId,
    flyVisualX,
    flyVisualY,
    vrmFaceYaw,
    wormholePhase,
    pinColors,
    blinking,
    onPointerDown: shell.onPointerDown,
    onPointerMove,
    onPointerUp,
    onContextMenu: shell.onContextMenu,
    mount: lifecycle.mount,
    dispose: lifecycle.dispose,
  };
}
