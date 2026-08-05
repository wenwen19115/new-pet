import type { Ref } from "vue";
import type { ApplyPetMood } from "./petHostMood";
import type { PetModelKind } from "@/pet/skins/types";
import type { PetSettings } from "../data/types";
import { pickPlayfulLine } from "../content/dialogue/lines";
import { linePickOptsFromSettings } from "./usePetLines";
import {
  PLAYFUL_CATCH_WINDOW_MS,
  PLAYFUL_CHASE_MS,
  PLAYFUL_MENU_BURST_MS,
  PLAYFUL_POST_CATCH_COOLDOWN_MS,
  PLAYFUL_POST_MISS_COOLDOWN_MS,
  advancePlayfulMissStreak,
  canPlayfulCatch,
  cursorNearPet,
  playfulScareRadius,
} from "./playfulPhysics";
import { bumpMoyuDay } from "@/pet/data/moyuDay";

export function usePetPlayfulHost(deps: {
  hostAlive: () => boolean;
  enabled: () => boolean;
  mood: () => string;
  isDragging: () => boolean;
  isMenuOpen: () => boolean;
  isPeeking: () => boolean;
  chasePausesIdle: () => boolean;
  setChaseIdleGate: (
    active: boolean,
    opts?: { rescheduleIdle?: boolean }
  ) => void;
  tone: () => "cute" | "snarky";
  model: () => PetModelKind;
  settings: Ref<PetSettings>;
  bodyBox: () => { w: number; h: number };
  applyMood: ApplyPetMood;
  runPlayfulFlee: (cursor: { x: number; y: number }) => Promise<boolean>;
  speakText: (
    text: string,
    fromAuto: boolean,
    opts?: { keepMotion?: boolean; force?: boolean }
  ) => void | Promise<void>;
  resetSleepTimer: () => void;
}) {
  let fleeBusy = false;
  let cooldownUntil = 0;
  let catchUntil = 0;
  let chaseTimer: number | null = null;
  let chaseGen = 0;
  let missStreak = 0;
  /** 菜单触发的限时调皮；不写 playfulModeEnabled */
  let burstActive = false;
  let burstTimer: number | null = null;
  let lastCursor = { x: 0, y: 0 };
  let hasCursor = false;

  function isEnabled() {
    return deps.enabled() || burstActive;
  }

  function clearChaseTimer() {
    if (chaseTimer != null) {
      window.clearTimeout(chaseTimer);
      chaseTimer = null;
    }
  }

  function clearBurstTimer() {
    if (burstTimer != null) {
      window.clearTimeout(burstTimer);
      burstTimer = null;
    }
  }

  function clearBurstFlag() {
    burstActive = false;
    clearBurstTimer();
  }

  function endChase(opts?: { rescheduleIdle?: boolean }) {
    clearChaseTimer();
    chaseGen += 1;
    deps.setChaseIdleGate(false, opts);
  }

  function stop() {
    clearBurstFlag();
    endChase({ rescheduleIdle: false });
    fleeBusy = false;
    cooldownUntil = 0;
    catchUntil = 0;
    missStreak = 0;
  }

  function lineFor(kind: "start" | "catch" | "miss" | "sulk"): string {
    const model = deps.model();
    const s = deps.settings.value;
    return pickPlayfulLine(
      kind,
      deps.tone(),
      model,
      s.personality,
      linePickOptsFromSettings(s, model)
    );
  }

  function onChaseMiss() {
    deps.applyMood("grumpy", "playful-miss");
    const outcome = advancePlayfulMissStreak(missStreak);
    missStreak = outcome.missStreak;
    const kind = outcome.sulk ? "sulk" : "miss";
    void deps.speakText(lineFor(kind), true, {
      force: true,
      keepMotion: true,
    });
    cooldownUntil = Date.now() + PLAYFUL_POST_MISS_COOLDOWN_MS;
    catchUntil = 0;
    endChase();
    clearBurstFlag();
  }

  function beginChase() {
    if (deps.chasePausesIdle()) return;
    deps.setChaseIdleGate(true);
    const gen = ++chaseGen;
    void deps.speakText(lineFor("start"), true, {
      force: true,
      keepMotion: true,
    });
    clearChaseTimer();
    chaseTimer = window.setTimeout(() => {
      if (gen !== chaseGen || !deps.chasePausesIdle()) return;
      onChaseMiss();
    }, PLAYFUL_CHASE_MS);
  }

  async function tickProximity(
    cursor: { x: number; y: number },
    winCenter: { x: number; y: number }
  ) {
    lastCursor = cursor;
    hasCursor = true;
    if (!deps.hostAlive()) return;
    if (!isEnabled()) {
      if (deps.chasePausesIdle()) stop();
      return;
    }
    if (deps.isDragging() || deps.isMenuOpen()) return;
    if (deps.isPeeking()) return;
    if (deps.mood() === "sleep") return;
    if (fleeBusy) return;

    const now = Date.now();
    if (now < cooldownUntil) return;
    if (now < catchUntil) return;

    const radius = playfulScareRadius(deps.bodyBox().w, deps.bodyBox().h);
    if (!cursorNearPet(cursor, winCenter, radius)) return;

    beginChase();
    fleeBusy = true;
    deps.resetSleepTimer();
    try {
      const ok = await deps.runPlayfulFlee(cursor);
      if (ok) catchUntil = Date.now() + PLAYFUL_CATCH_WINDOW_MS;
    } finally {
      fleeBusy = false;
    }
  }

  function tryCatchOnTap(): boolean {
    if (!isEnabled() || !deps.chasePausesIdle() || fleeBusy) return false;
    if (deps.mood() === "sleep") return false;
    if (!canPlayfulCatch(Date.now(), catchUntil)) return false;

    clearChaseTimer();
    missStreak = 0;
    deps.applyMood("happy", "playful-catch");
    bumpMoyuDay({ catches: 1, taps: 1 });
    void deps.speakText(lineFor("catch"), true, {
      force: true,
      keepMotion: true,
    });
    cooldownUntil = Date.now() + PLAYFUL_POST_CATCH_COOLDOWN_MS;
    catchUntil = 0;
    endChase();
    clearBurstFlag();
    deps.resetSleepTimer();
    return true;
  }

  /** 菜单「调皮一下」：立刻躲一次；10s 内未抓到则结束，不改常驻设置 */
  function startBurst(): boolean {
    if (!deps.hostAlive()) return false;
    if (deps.isDragging() || deps.isPeeking()) return false;
    if (deps.mood() === "sleep") return false;
    if (fleeBusy || deps.chasePausesIdle()) return false;

    burstActive = true;
    clearBurstTimer();
    burstTimer = window.setTimeout(() => {
      if (!burstActive) return;
      if (deps.chasePausesIdle()) onChaseMiss();
      else clearBurstFlag();
    }, PLAYFUL_MENU_BURST_MS);

    beginChase();
    fleeBusy = true;
    deps.resetSleepTimer();
    const cursor = hasCursor ? lastCursor : { x: 0, y: 0 };
    void (async () => {
      try {
        const ok = await deps.runPlayfulFlee(cursor);
        if (ok) catchUntil = Date.now() + PLAYFUL_CATCH_WINDOW_MS;
      } finally {
        fleeBusy = false;
      }
    })();
    return true;
  }

  return {
    tickProximity,
    tryCatchOnTap,
    startBurst,
    stop,
  };
}
