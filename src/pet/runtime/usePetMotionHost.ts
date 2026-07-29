import { ref, type Ref } from "vue";
import { hidePetBubble, syncPetBubbleToPet } from "@/pet/windows/bubble";
import { pickMotionLine } from "@/pet/content/dialogue/lines";
import { linePickOptsFromSettings } from "@/pet/runtime/usePetLines";
import { resolveMotionForModel } from "@/pet/characters";
import {
  findCustomVrmMotion,
  isCustomVrmMotionId,
} from "@/pet/content/motion/customVrmMotions";
import {
  isPetIdleMotion,
  isScreenFlightMotion,
  isVrmWalkMotion,
  motionHoldMs,
  type PetIdleMotion,
} from "@/pet/content/motion/motions";
import {
  flyPetWindowAway,
  flyPetWindowRandom,
  teleportPetWindowWormhole,
  teleportPetWindowWormholeAway,
  walkPetWindowRandom,
} from "@/pet/bridge/screenFly";
import type { CharacterRuntimeSpec } from "@/pet/characters/types";
import type { PetMood, PetSettings } from "@/pet/data/types";
import type { PetModelKind, PetSkinVisual } from "@/pet/skins/types";
import { moodForMotion, type ApplyPetMood } from "./petHostMood";

const PIN_COUNT = 14;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hsl(h: number, s: number, l: number) {
  return `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%)`;
}

export function usePetMotionHost(deps: {
  settings: Ref<PetSettings>;
  activeSkin: { value: { model: PetModelKind; visual: PetSkinVisual } };
  activeCharacter: { value: { runtime: CharacterRuntimeSpec } };
  winSize: Ref<{ w: number; h: number }> | { value: { w: number; h: number } };
  mood: Ref<PetMood>;
  speaking: Ref<boolean>;
  applyMood: ApplyPetMood;
  isDragging: Ref<boolean>;
  idleMotion: Ref<string>;
  clearTimer: (id: number | null) => void;
  scheduleIdleAction: () => void;
  speakText: (
    text: string,
    fromAuto: boolean,
    opts?: { keepMotion?: boolean; force?: boolean }
  ) => void | Promise<void>;
  wakeFromSleep: () => void;
  resetSleepTimer: () => void;
  clearMoodResetTimer: () => void;
}) {
  const motionPlayId = ref(0);
  const flyVisualX = ref(0);
  const flyVisualY = ref(0);
  const vrmFaceYaw = ref(0);
  const wormholePhase = ref<"idle" | "out" | "warp" | "in">("idle");
  const pinColors = ref<string[]>(
    Array.from({ length: PIN_COUNT }, () => "#1a6b78")
  );

  let idleActionTimer: number | null = null;
  let idleHoldTimer: number | null = null;
  let motionLockUntil = 0;
  let motionGen = 0;
  let flySignal: { cancelled: boolean } | null = null;

  function tickLeds(now: number) {
    const phase = now / 150;
    const breath = 0.5 + 0.5 * Math.sin(now / 620);
    const snarky = deps.settings.value.tone === "snarky";
    const baseHue = snarky ? 22 : deps.activeSkin.value.visual.ledHue;
    const next = new Array<string>(PIN_COUNT);
    for (let i = 0; i < PIN_COUNT; i++) {
      let dist = Math.abs(i - (phase % PIN_COUNT));
      dist = Math.min(dist, PIN_COUNT - dist);
      const chase = Math.exp(-dist * dist * 0.5);
      const t = clamp(chase * 0.95 + breath * 0.22, 0, 1);
      const hue = baseHue + i * 5 + phase * 7 + t * 28;
      next[i] = hsl(hue, 70 + t * 25, 28 + t * 42);
    }
    pinColors.value = next;
  }

  function applyMoodForMotion(motion: PetIdleMotion) {
    deps.applyMood(moodForMotion(motion), "motion");
  }

  function isMotionLocked() {
    return Date.now() < motionLockUntil;
  }

  function cancelFlight() {
    if (flySignal) flySignal.cancelled = true;
  }

  function resetFlyVisuals() {
    flyVisualX.value = 0;
    flyVisualY.value = 0;
    vrmFaceYaw.value = 0;
    wormholePhase.value = "idle";
  }

  function cancelActiveMotion(options?: { resetVisuals?: boolean }) {
    cancelFlight();
    flySignal = null;
    if (options?.resetVisuals !== false) {
      resetFlyVisuals();
    }
    motionGen += 1;
    motionLockUntil = 0;
    deps.clearTimer(idleHoldTimer);
    idleHoldTimer = null;
  }

  function clearMotionTimers() {
    deps.clearTimer(idleHoldTimer);
    idleHoldTimer = null;
    deps.clearTimer(idleActionTimer);
    idleActionTimer = null;
  }

  function getIdleActionTimer() {
    return idleActionTimer;
  }

  function setIdleActionTimer(id: number | null) {
    deps.clearTimer(idleActionTimer);
    idleActionTimer = id;
  }

  function beginMotion(
    motion: PetIdleMotion | string,
    options: { manual?: boolean; withSpeakChance?: number } = {}
  ) {
    const manual = Boolean(options.manual);
    const gen = ++motionGen;
    deps.clearTimer(idleHoldTimer);
    idleHoldTimer = null;
    if (manual) {
      deps.clearTimer(idleActionTimer);
      idleActionTimer = null;
    }
    cancelFlight();
    flySignal = { cancelled: false };
    const flight = flySignal;
    flyVisualX.value = 0;
    flyVisualY.value = 0;

    const isCustom = isCustomVrmMotionId(motion);
    const resolved: string = isCustom
      ? motion
      : resolveMotionForModel(
          motion as PetIdleMotion,
          deps.activeSkin.value.model
        );
    if (!isVrmWalkMotion(resolved as PetIdleMotion)) {
      vrmFaceYaw.value = 0;
    }
    const custom = isCustom
      ? findCustomVrmMotion(deps.settings.value.customVrmMotions, resolved)
      : undefined;
    const hold = custom?.durationMs ?? motionHoldMs(resolved as PetIdleMotion);
    motionLockUntil = Date.now() + hold + (manual ? 900 : 250);
    motionPlayId.value += 1;
    deps.idleMotion.value = resolved;
    if (!isCustom) applyMoodForMotion(resolved as PetIdleMotion);
    else deps.applyMood("happy", "motion");

    if (isVrmWalkMotion(resolved as PetIdleMotion) && !deps.isDragging.value) {
      void walkPetWindowRandom(
        deps.winSize.value.w,
        deps.winSize.value.h,
        flight,
        (info) => {
          flyVisualX.value = info.visualDx;
          flyVisualY.value = info.visualDy;
          const target = info.dirX >= 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
          vrmFaceYaw.value += (target - vrmFaceYaw.value) * 0.28;
          if (deps.speaking.value) void syncPetBubbleToPet();
        }
      ).finally(() => {
        if (!flight.cancelled) {
          flyVisualX.value = 0;
          flyVisualY.value = 0;
          vrmFaceYaw.value = 0;
        }
        if (
          gen === motionGen &&
          !deps.isDragging.value &&
          deps.mood.value !== "sleep"
        ) {
          deps.idleMotion.value = "idle-float";
          deps.applyMood("idle", "motion-end");
        }
        if (gen === motionGen) {
          motionLockUntil = 0;
          if (manual) deps.scheduleIdleAction();
        }
      });
    } else if (
      !isCustom &&
      isPetIdleMotion(resolved) &&
      isScreenFlightMotion(resolved) &&
      !deps.isDragging.value
    ) {
      const screenFlight = deps.activeCharacter.value.runtime.screenFlight;
      if (screenFlight === "wormhole") {
        wormholePhase.value = "out";
        void teleportPetWindowWormhole(
          deps.winSize.value.w,
          deps.winSize.value.h,
          flight,
          (phase) => {
            if (phase === "done") {
              wormholePhase.value = "idle";
            } else {
              wormholePhase.value = phase;
            }
            if (deps.speaking.value) void syncPetBubbleToPet();
          }
        ).finally(() => {
          if (!flight.cancelled) wormholePhase.value = "idle";
        });
      } else if (screenFlight === "fly") {
        const dur =
          resolved === "screen-zip"
            ? 900
            : resolved === "screen-dash"
              ? 1200
              : resolved === "screen-hop"
                ? 1500
                : 1900;
        void flyPetWindowRandom(
          deps.winSize.value.w,
          deps.winSize.value.h,
          dur,
          flight,
          (info) => {
            flyVisualX.value = info.visualDx;
            flyVisualY.value = info.visualDy;
            if (deps.speaking.value) void syncPetBubbleToPet();
          }
        ).finally(() => {
          if (!flight.cancelled) {
            flyVisualX.value = 0;
            flyVisualY.value = 0;
          }
        });
      }
    }

    const speakChance = options.withSpeakChance ?? 0;
    if (speakChance > 0 && Math.random() < speakChance && !isCustom) {
      window.setTimeout(() => {
        if (gen !== motionGen) return;
        if (deps.isDragging.value || deps.mood.value === "sleep") return;
        const line = pickMotionLine(
          resolved as PetIdleMotion,
          deps.settings.value.tone,
          deps.settings.value.personality,
          deps.activeSkin.value.model,
          linePickOptsFromSettings(
            deps.settings.value,
            deps.activeSkin.value.model
          )
        );
        void deps.speakText(line, true, { keepMotion: true });
      }, 280);
    }

    idleHoldTimer = window.setTimeout(() => {
      if (gen !== motionGen) return;
      if (isVrmWalkMotion(resolved as PetIdleMotion)) return;
      if (!deps.isDragging.value && deps.mood.value !== "sleep") {
        deps.idleMotion.value = "idle-float";
        deps.applyMood("idle", "motion-end");
      }
      if (manual) {
        motionLockUntil = 0;
        deps.scheduleIdleAction();
      }
    }, hold);
  }

  function playMotionOnce(motion: PetIdleMotion | string) {
    if (deps.isDragging.value) return;
    deps.wakeFromSleep();
    deps.speaking.value = false;
    void hidePetBubble();
    deps.clearMoodResetTimer();
    beginMotion(motion, { manual: true, withSpeakChance: 0.85 });
    deps.resetSleepTimer();
  }

  async function runPlayfulFlee(cursor: { x: number; y: number }): Promise<boolean> {
    if (deps.isDragging.value || deps.mood.value === "sleep") return false;
    cancelActiveMotion({ resetVisuals: true });
    flySignal = { cancelled: false };
    const flight = flySignal;
    const gen = ++motionGen;
    motionLockUntil = Date.now() + 1600;
    motionPlayId.value += 1;
    deps.applyMood("curious", "playful-flee");

    const screenFlight = deps.activeCharacter.value.runtime.screenFlight;
    const w = deps.winSize.value.w;
    const h = deps.winSize.value.h;
    let ok = false;

    if (screenFlight === "wormhole") {
      deps.idleMotion.value = "screen-wormhole";
      wormholePhase.value = "out";
      ok = await teleportPetWindowWormholeAway(
        cursor,
        w,
        h,
        flight,
        (phase) => {
          if (phase === "done") wormholePhase.value = "idle";
          else wormholePhase.value = phase;
          if (deps.speaking.value) void syncPetBubbleToPet();
        }
      );
      if (!flight.cancelled) wormholePhase.value = "idle";
    } else {
      deps.idleMotion.value =
        screenFlight === "fly" ? "screen-zip" : "idle-float";
      ok = await flyPetWindowAway(
        cursor,
        w,
        h,
        screenFlight === "fly" ? 780 : 620,
        flight,
        (info) => {
          flyVisualX.value = info.visualDx;
          flyVisualY.value = info.visualDy;
          if (deps.speaking.value) void syncPetBubbleToPet();
        }
      );
      if (!flight.cancelled) {
        flyVisualX.value = 0;
        flyVisualY.value = 0;
      }
    }

    if (gen === motionGen && !deps.isDragging.value) {
      deps.idleMotion.value = "idle-float";
      deps.applyMood("idle", "motion-end");
    }
    if (gen === motionGen) motionLockUntil = 0;
    return ok && !flight.cancelled;
  }

  return {
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
    runPlayfulFlee,
    cancelActiveMotion,
    cancelFlight,
    clearMotionTimers,
    getIdleActionTimer,
    setIdleActionTimer,
  };
}
