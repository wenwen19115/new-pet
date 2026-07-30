import type { Ref } from "vue";
import type { ApplyPetMood } from "./petHostMood";
import type { PetModelKind } from "@/pet/skins/types";
import type { PetSettings } from "../data/types";
import { pickPlayfulLine } from "../content/dialogue/lines";
import { linePickOptsFromSettings } from "./usePetLines";
import {
  PLAYFUL_CATCH_WINDOW_MS,
  PLAYFUL_CHASE_MS,
  PLAYFUL_POST_CATCH_COOLDOWN_MS,
  PLAYFUL_POST_MISS_COOLDOWN_MS,
  advancePlayfulMissStreak,
  canPlayfulCatch,
  cursorNearPet,
  playfulScareRadius,
} from "./playfulPhysics";

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

  function clearChaseTimer() {
    if (chaseTimer != null) {
      window.clearTimeout(chaseTimer);
      chaseTimer = null;
    }
  }

  function endChase(opts?: { rescheduleIdle?: boolean }) {
    clearChaseTimer();
    chaseGen += 1;
    deps.setChaseIdleGate(false, opts);
  }

  function stop() {
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
    if (!deps.hostAlive()) return;
    if (!deps.enabled()) {
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
    if (!deps.enabled() || !deps.chasePausesIdle() || fleeBusy) return false;
    if (deps.mood() === "sleep") return false;
    if (!canPlayfulCatch(Date.now(), catchUntil)) return false;

    clearChaseTimer();
    missStreak = 0;
    deps.applyMood("happy", "playful-catch");
    void deps.speakText(lineFor("catch"), true, {
      force: true,
      keepMotion: true,
    });
    cooldownUntil = Date.now() + PLAYFUL_POST_CATCH_COOLDOWN_MS;
    catchUntil = 0;
    endChase();
    deps.resetSleepTimer();
    return true;
  }

  return {
    tickProximity,
    tryCatchOnTap,
    stop,
  };
}
