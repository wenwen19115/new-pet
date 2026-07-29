import { syncPetBubbleToPet } from "@/pet/windows/bubble";
import { isPetMenuOpen } from "@/pet/windows/menu";
import { usePetIdleLoop } from "./usePetIdleLoop";
import { usePetLifeTimers } from "./usePetLifeTimers";
import { usePetMotionHost } from "./usePetMotionHost";
import { usePetPointerHost } from "./usePetPointerHost";
import { usePetSpeech } from "./usePetSpeech";
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
    bodyBox,
    activeModel,
    applyMood,
  } = s;

  const pointerHost = usePetPointerHost({
    hostAlive: () => s.hostAlive,
    winSize,
    bodyBox,
    mood,
    applyMood,
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
    isPaused: () => s.chatPausesRandomIdle,
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
    setIdleActionTimer: motionHost.setIdleActionTimer,
    cancelFlight: motionHost.cancelFlight,
    scheduleIdleAction: () => ports.scheduleIdleAction(),
  };

  function dispatch(intent: PetHostIntent) {
    dispatchPetHostIntent(intent, intentFx);
  }

  let resizePetWindow: () => void | Promise<void> = () => {};

  const settingsSync = usePetSettingsSync({
    settings,
    vrmSrc,
    hostAlive: () => s.hostAlive,
    getActiveSkinId: () => activeSkin.value.id,
    getActiveSkinModel: () => activeSkin.value.model,
    refreshUsbWatch: life.refreshUsbWatch,
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
    cancelActiveMotion: motionHost.cancelActiveMotion,
    clearMotionTimers: motionHost.clearMotionTimers,
    beginMotion: motionHost.beginMotion,
    speakTapEgg: speech.speakTapEgg,
    speak: speech.speak,
    pointerOnPointerDown: pointerHost.onPointerDown,
  });

  const lifecycle = usePetHostLifecycle({
    hostAliveRef: {
      get: () => s.hostAlive,
      set: (v) => {
        s.hostAlive = v;
      },
    },
    settings,
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
      dispatch({ type: "suspend-runtime" });
    },
    clearLifeTimers: life.clearLifeTimers,
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
    applySettings: settingsSync.applySettings,
    speakIntro: speech.speakIntro,
    isMotionLocked: motionHost.isMotionLocked,
    playMotionOnce: motionHost.playMotionOnce,
    showHitBounds: pointerHost.showHitBounds,
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
    showHitBounds: pointerHost.showHitBounds,
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
  };
}
