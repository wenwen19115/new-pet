import { ref, type Ref } from "vue";
import {
  hidePetBubble,
} from "@/pet/windows/bubble";
import { hidePetChat } from "@/pet/chat";
import {
  setPetUsbWatchRelaxed,
  stopPetUsbWatch,
  syncPetUsbWatch,
} from "@/pet/bridge/usbWatch";
import type { PetMood, PetSettings, PetUsbAnnouncePayload } from "@/pet/data/types";

const SLEEP_MS = 3 * 60 * 1000;

/** Sleep / blink / auto-speak / USB watch timers for the pet host. */
export function usePetLifeTimers(deps: {
  settings: Ref<PetSettings>;
  mood: Ref<PetMood>;
  speaking: Ref<boolean>;
  isDragging: Ref<boolean>;
  idleMotion: Ref<string>;
  clearTimer: (id: number | null) => void;
  speak: (fromAuto: boolean) => void;
  speakUsb: (payload: PetUsbAnnouncePayload) => void;
  onEnterSleep: () => void;
}) {
  const blinking = ref(false);
  let sleepTimer: number | null = null;
  let blinkTimer: number | null = null;
  let autoSpeakTimer: number | null = null;

  function wakeFromSleep() {
    if (deps.mood.value !== "sleep") return;
    deps.mood.value = "idle";
    setPetUsbWatchRelaxed(false);
  }

  function resetSleepTimer() {
    deps.clearTimer(sleepTimer);
    sleepTimer = null;
    wakeFromSleep();
    sleepTimer = window.setTimeout(() => {
      void hidePetBubble();
      void hidePetChat();
      deps.speaking.value = false;
      deps.mood.value = "sleep";
      setPetUsbWatchRelaxed(true);
      deps.idleMotion.value = "idle-float";
      deps.onEnterSleep();
    }, SLEEP_MS);
  }

  function scheduleBlink() {
    deps.clearTimer(blinkTimer);
    blinkTimer = null;
    blinkTimer = window.setTimeout(() => {
      if (deps.mood.value === "sleep" || deps.isDragging.value) {
        scheduleBlink();
        return;
      }
      blinking.value = true;
      window.setTimeout(() => {
        blinking.value = false;
      }, 100);
      scheduleBlink();
    }, 2000 + Math.random() * 2800);
  }

  function scheduleAutoSpeak() {
    deps.clearTimer(autoSpeakTimer);
    autoSpeakTimer = null;
    autoSpeakTimer = window.setTimeout(() => {
      if (
        deps.mood.value === "sleep" ||
        deps.speaking.value ||
        deps.isDragging.value
      ) {
        scheduleAutoSpeak();
        return;
      }
      void deps.speak(true);
    }, 45000 + Math.random() * 50000);
  }

  function onUsbAnnounce(payload: PetUsbAnnouncePayload) {
    deps.speakUsb(payload);
  }

  function refreshUsbWatch() {
    syncPetUsbWatch(deps.settings.value.usbWatchEnabled, onUsbAnnounce);
    setPetUsbWatchRelaxed(deps.mood.value === "sleep");
  }

  function clearLifeTimers() {
    deps.clearTimer(sleepTimer);
    sleepTimer = null;
    deps.clearTimer(blinkTimer);
    blinkTimer = null;
    deps.clearTimer(autoSpeakTimer);
    autoSpeakTimer = null;
    stopPetUsbWatch();
  }

  return {
    blinking,
    wakeFromSleep,
    resetSleepTimer,
    scheduleBlink,
    scheduleAutoSpeak,
    refreshUsbWatch,
    onUsbAnnounce,
    clearLifeTimers,
  };
}
