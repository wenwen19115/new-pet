import { ref } from "vue";
import { hidePetBubble, syncPetBubbleToPet } from "@/pet/windows/bubble";
import { hidePetChat } from "@/pet/windows/chat";
import { hidePetMenu, isPetMenuOpen } from "@/pet/windows/menu";
import { usePetIdleLoop } from "./usePetIdleLoop";
import { usePetLifeTimers } from "./usePetLifeTimers";
import { usePetMotionHost } from "./usePetMotionHost";
import { usePetPointerHost } from "./usePetPointerHost";
import { usePetPlayfulHost } from "./usePetPlayfulHost";
import { usePetPeekHost } from "./usePetPeekHost";
import { usePetSpeech } from "./usePetSpeech";
import { usePetDeskWeather } from "./usePetDeskWeather";
import { useSkyWeatherPetBackdrop } from "./useSkyWeatherPetBackdrop";
import { usePetHostLifecycle } from "./usePetHostLifecycle";
import { usePetSettingsSync } from "./usePetSettingsSync";
import { usePetShellActions } from "./usePetShellActions";
import {
  dispatchPetHostIntent,
  type PetHostIntent,
  type PetHostIntentEffects,
} from "./petHostIntents";
import { createApplyPetMood } from "./petHostMood";
import {
  clearPetHostTimer,
  createPetHostShared,
  type PetHostShared,
} from "./petHostShared";

/** 具体行为在 use*；这里只接线。 */
export function createPetHost() {
  const s = createPetHostShared();
  return wirePetHost(s);
}

function wirePetHost(s: PetHostShared) {
  const {
    settings,
    locale,
    vrmSrc,
    mood,
    lastLine,
    idleMotion,
    speaking,
    gaze,
    ports,
    bindPorts,
    activeSkin,
    activeCharacter,
    v,
    winSize,
    skyVisualHold,
    bodyBox,
    activeModel,
    applyMood,
  } = s;

  /** 与 peekPausesRandomIdle 同步，供 PetApp 响应式订阅 */
  const isPeeking = ref(false);

  let tickPlayfulProximity: (
    cursor: { x: number; y: number },
    winCenter: { x: number; y: number }
  ) => void = () => {};

  const pointerHost = usePetPointerHost({
    hostAlive: () => s.hostAlive,
    winSize,
    bodyBox,
    mood,
    applyMood,
    isMenuOpen: () => isPetMenuOpen(),
    gaze,
    gazeConfig: () => activeCharacter.value.runtime.gaze,
    onBeforeDrag: () => ports.onBeforeDrag(),
    onTap: () => ports.onTap(),
    onAfterPointerUp: (info) => ports.onAfterPointerUp(info),
    syncBubble: () => {
      if (speaking.value) void syncPetBubbleToPet();
    },
    onCursorSample: (cursor, center) => {
      tickPlayfulProximity(cursor, center);
    },
  });

  const motionHost = usePetMotionHost({
    settings,
    activeSkin,
    activeCharacter,
    winSize,
    mood,
    speaking,
    applyMood,
    isDragging: pointerHost.isDragging,
    idleMotion,
    clearTimer: clearPetHostTimer,
    scheduleIdleAction: () => ports.scheduleIdleAction(),
    speakText: (text, fromAuto, opts) => ports.speakText(text, fromAuto, opts),
    wakeFromSleep: () => ports.wakeFromSleep(),
    resetSleepTimer: () => ports.resetSleepTimer(),
    clearMoodResetTimer: () => {
      clearPetHostTimer(s.moodResetTimer);
      s.moodResetTimer = null;
    },
  });

  let dispatchIntent: (intent: PetHostIntent) => void = () => {};

  const playful = usePetPlayfulHost({
    hostAlive: () => s.hostAlive,
    enabled: () => settings.value.playfulModeEnabled,
    mood: () => mood.value,
    isDragging: () => pointerHost.isDragging.value,
    isMenuOpen: () => isPetMenuOpen(),
    isPeeking: () => s.peekPausesRandomIdle,
    chasePausesIdle: () => s.playfulPausesRandomIdle,
    setChaseIdleGate: (active, opts) => {
      dispatchIntent({
        type: "playful-chase",
        active,
        rescheduleIdle: opts?.rescheduleIdle,
      });
    },
    tone: () => settings.value.tone,
    model: () => activeModel.value,
    settings,
    bodyBox: () => bodyBox.value,
    applyMood,
    runPlayfulFlee: (cursor) => motionHost.runPlayfulFlee(cursor),
    speakText: (text, fromAuto, opts) => ports.speakText(text, fromAuto, opts),
    resetSleepTimer: () => ports.resetSleepTimer(),
  });
  tickPlayfulProximity = (cursor, center) => {
    void playful.tickProximity(cursor, center);
  };

  const peek = usePetPeekHost({
    hostAlive: () => s.hostAlive,
    mood: () => mood.value,
    isPeeking: () => s.peekPausesRandomIdle,
    setPeekIdleGate: (active, opts) => {
      dispatchIntent({
        type: "peek-hide",
        active,
        rescheduleIdle: opts?.rescheduleIdle,
      });
    },
    winSize: () => winSize.value,
    bodyBox: () => bodyBox.value,
    applyMood,
    cancelActiveMotion: () => motionHost.cancelActiveMotion(),
    stopPlayful: () => playful.stop(),
    speakText: (text, fromAuto, opts) => ports.speakText(text, fromAuto, opts),
    tone: () => settings.value.tone,
    hideOverlays: () => {
      speaking.value = false;
      void hidePetBubble();
      void hidePetChat();
      void hidePetMenu();
    },
    syncBubble: () => {
      if (speaking.value) void syncPetBubbleToPet();
    },
    resetSleepTimer: () => ports.resetSleepTimer(),
  });

  s.setApplyMoodImpl(
    createApplyPetMood({
      getMood: () => mood.value,
      setMood: (m) => {
        mood.value = m;
      },
      speaking: () => speaking.value,
      dragging: () => pointerHost.isDragging.value,
      isMotionLocked: motionHost.isMotionLocked,
    })
  );

  const speech = usePetSpeech({
    settings,
    model: activeModel,
    mood,
    speaking,
    applyMood,
    lastLine,
    idleMotion,
    isDragging: pointerHost.isDragging,
    isMotionLocked: motionHost.isMotionLocked,
    resetSleepTimer: () => ports.resetSleepTimer(),
    scheduleAutoSpeak: () => ports.scheduleAutoSpeak(),
    clearTimer: clearPetHostTimer,
    setBubbleTimer: (id) => {
      s.bubbleTimer = id;
    },
    setMoodResetTimer: (id) => {
      s.moodResetTimer = id;
    },
    getBubbleTimer: () => s.bubbleTimer,
    getMoodResetTimer: () => s.moodResetTimer,
  });

  const life = usePetLifeTimers({
    settings,
    mood,
    speaking,
    applyMood,
    isDragging: pointerHost.isDragging,
    idleMotion,
    clearTimer: clearPetHostTimer,
    speak: (fromAuto) => speech.speak(fromAuto),
    speakUsb: (payload) => speech.speakUsb(payload),
    onEnterSleep: () => {
      motionHost.cancelActiveMotion({ resetVisuals: false });
      motionHost.clearMotionTimers();
    },
  });

  const deskWeather = usePetDeskWeather({
    settings,
    speaking,
    isDragging: pointerHost.isDragging,
    onWeather: (kind) => {
      const { spoke, motion } = speech.speakDeskWeather(kind);
      if (spoke && motion) {
        motionHost.playMotionOnce(motion, { keepSpeech: true });
      }
      return spoke;
    },
  });

  let resizePetWindow: () => Promise<void> =
    async () => {};

  const skyBackdrop = useSkyWeatherPetBackdrop({
    settings,
    skyVisualHold,
  });

  bindPorts({
    resetSleepTimer: life.resetSleepTimer,
    scheduleAutoSpeak: life.scheduleAutoSpeak,
    wakeFromSleep: life.wakeFromSleep,
    speakText: speech.speakText,
    speak: speech.speak,
  });

  const idleLoop = usePetIdleLoop({
    settings,
    model: activeModel,
    speaking,
    isDragging: pointerHost.isDragging,
    mood,
    isMotionLocked: motionHost.isMotionLocked,
    isPaused: () =>
      s.chatPausesRandomIdle ||
      s.playfulPausesRandomIdle ||
      s.peekPausesRandomIdle,
    beginMotion: motionHost.beginMotion,
    clearTimer: clearPetHostTimer,
    getIdleActionTimer: motionHost.getIdleActionTimer,
    setIdleActionTimer: motionHost.setIdleActionTimer,
  });

  bindPorts({ scheduleIdleAction: idleLoop.scheduleIdleAction });

  const intentFx: PetHostIntentEffects = {
    hostAlive: () => s.hostAlive,
    randomIdleEnabled: () => settings.value.randomIdleEnabled,
    chatPausesRandomIdle: () => s.chatPausesRandomIdle,
    setChatPausesRandomIdle: (open) => {
      s.chatPausesRandomIdle = open;
    },
    playfulPausesRandomIdle: () => s.playfulPausesRandomIdle,
    setPlayfulPausesRandomIdle: (active) => {
      s.playfulPausesRandomIdle = active;
    },
    peekPausesRandomIdle: () => s.peekPausesRandomIdle,
    setPeekPausesRandomIdle: (active) => {
      s.peekPausesRandomIdle = active;
      isPeeking.value = active;
    },
    setIdleActionTimer: motionHost.setIdleActionTimer,
    cancelFlight: motionHost.cancelFlight,
    scheduleIdleAction: () => ports.scheduleIdleAction(),
  };

  dispatchIntent = (intent: PetHostIntent) => {
    dispatchPetHostIntent(intent, intentFx);
  };

  function dispatch(intent: PetHostIntent) {
    dispatchIntent(intent);
  }

  const settingsSync = usePetSettingsSync({
    settings,
    vrmSrc,
    hostAlive: () => s.hostAlive,
    getActiveSkinId: () => activeSkin.value.id,
    getActiveSkinModel: () => activeSkin.value.model,
    refreshUsbWatch: life.refreshUsbWatch,
    refreshDeskWeather: deskWeather.refreshDeskWeather,
    refreshSkyWeatherBackdrop: skyBackdrop.refreshSkyWeatherBackdrop,
    resizePetWindow: () => resizePetWindow(),
    onRandomIdleSetting: (enabled) => {
      dispatch({ type: "random-idle-setting", enabled });
    },
    speakIntro: speech.speakIntro,
  });

  const shell = usePetShellActions({
    ports,
    bindPorts,
    settings,
    speaking,
    activeSkin,
    activeCharacter,
    applyMood,
    cancelActiveMotion: motionHost.cancelActiveMotion,
    clearMotionTimers: motionHost.clearMotionTimers,
    beginMotion: motionHost.beginMotion,
    speakTapEgg: speech.speakTapEgg,
    speakDragStart: speech.speakDragStart,
    speakDragLand: speech.speakDragLand,
    speak: speech.speak,
    pointerOnPointerDown: pointerHost.onPointerDown,
    tryPlayfulCatch: () => playful.tryCatchOnTap(),
    startPlayfulBurst: () => playful.startBurst(),
    stopPlayful: () => playful.stop(),
    isPeeking: () => s.peekPausesRandomIdle,
    startPeek: () => peek.startPeek(),
    revealPeek: () => peek.revealPeek(),
    tryRevealPeekOnTap: () => peek.tryRevealOnTap(),
    skyVisualHold,
  });

  const lifecycle = usePetHostLifecycle({
    hostAliveRef: {
      get: () => s.hostAlive,
      set: (v) => {
        s.hostAlive = v;
      },
    },
    settings,
    locale,
    vrmSrc,
    mood,
    lastLine,
    speaking,
    applyMood,
    isDragging: pointerHost.isDragging,
    activeCharacter,
    winSize,
    bubbleTimerRef: {
      get: () => s.bubbleTimer,
      set: (id) => {
        s.bubbleTimer = id;
      },
    },
    moodResetTimerRef: {
      get: () => s.moodResetTimer,
      set: (id) => {
        s.moodResetTimer = id;
      },
    },
    onChatOpen: (open) => {
      dispatch({ type: "chat-open", open });
    },
    onSuspendRuntime: () => {
      playful.stop();
      peek.clearPeek({ rescheduleIdle: false });
      dispatch({ type: "suspend-runtime" });
    },
    clearLifeTimers: life.clearLifeTimers,
    clearUsbFollowUpTimer: speech.clearUsbFollowUpTimer,
    clearDeskWeather: deskWeather.clearDeskWeather,
    clearSkyWeatherBackdrop: skyBackdrop.clearSkyWeatherBackdrop,
    clearMotionTimers: motionHost.clearMotionTimers,
    resetDragState: pointerHost.resetDragState,
    syncWindowCenter: pointerHost.syncWindowCenter,
    initCursorLog: pointerHost.initCursorLog,
    setWinCenterFromResize: pointerHost.setWinCenterFromResize,
    tickLeds: motionHost.tickLeds,
    tickSwing: pointerHost.tickSwing,
    sampleCursor: pointerHost.sampleCursor,
    resetSleepTimer: life.resetSleepTimer,
    scheduleBlink: life.scheduleBlink,
    scheduleIdleAction: () => ports.scheduleIdleAction(),
    scheduleAutoSpeak: life.scheduleAutoSpeak,
    refreshVrmSrc: settingsSync.refreshVrmSrc,
    refreshUsbWatch: life.refreshUsbWatch,
    refreshDeskWeather: deskWeather.refreshDeskWeather,
    refreshSkyWeatherBackdrop: skyBackdrop.refreshSkyWeatherBackdrop,
    applySettings: settingsSync.applySettings,
    speakIntro: speech.speakIntro,
    speakBubblePong: speech.speakBubblePong,
    isMotionLocked: motionHost.isMotionLocked,
    playMotionOnce: motionHost.playMotionOnce,
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
    isDragging: pointerHost.isDragging,
    isPeeking,
    dragTrailAngle: pointerHost.dragTrailAngle,
    dragTrailSpeed: pointerHost.dragTrailSpeed,
    physicsActive: pointerHost.physicsActive,
    physicsStyle: pointerHost.physicsStyle,
    motionPlayId: motionHost.motionPlayId,
    flyVisualX: motionHost.flyVisualX,
    flyVisualY: motionHost.flyVisualY,
    vrmFaceYaw: motionHost.vrmFaceYaw,
    wormholePhase: motionHost.wormholePhase,
    pinColors: motionHost.pinColors,
    blinking: life.blinking,
    onPointerDown: shell.onPointerDown,
    onPointerMove: pointerHost.onPointerMove,
    onPointerUp: pointerHost.onPointerUp,
    onContextMenu: shell.onContextMenu,
    mount: lifecycle.mount,
    dispose: lifecycle.dispose,
    skyBackdropEnabled: skyBackdrop.skyBackdropEnabled,
    skyHideableOnPet: skyBackdrop.skyHideableOnPet,
    skyHideEffectOnPet: skyBackdrop.skyHideEffectOnPet,
    skyDisplayTod: skyBackdrop.skyDisplayTod,
    skyDisplayWeather: skyBackdrop.skyDisplayWeather,
    skyRainbow: skyBackdrop.skyRainbow,
    skyEvents: skyBackdrop.skyEvents,
    skyFollowClock: skyBackdrop.skyFollowClock,
    skyWindowFamily: skyBackdrop.skyWindowFamily,
    skyBackdropStyle: skyBackdrop.skyBackdropStyle,
    skyVisualHold,
    finishSkyDismiss: skyBackdrop.finishSkyDismiss,
  };
}
