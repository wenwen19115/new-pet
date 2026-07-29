import type { ApplyPetMood } from "./petHostMood";
import {
  PLAYFUL_CATCH_WINDOW_MS,
  PLAYFUL_CHASE_MS,
  PLAYFUL_POST_CATCH_COOLDOWN_MS,
  PLAYFUL_POST_MISS_COOLDOWN_MS,
  cursorNearPet,
  pickPlayfulLine,
  playfulScareRadius,
} from "./playfulPhysics";

/**
 * 调皮模式：靠近就躲开；开局起倒计时，窗内点中算抓到。
 * idle 暂停走 playful-chase intent，别自己清 timer。
 */
export function usePetPlayfulHost(deps: {
  hostAlive: () => boolean;
  enabled: () => boolean;
  mood: () => string;
  isDragging: () => boolean;
  isMenuOpen: () => boolean;
  /** 由 playful-chase intent 写入 */
  chasePausesIdle: () => boolean;
  setChaseIdleGate: (
    active: boolean,
    opts?: { rescheduleIdle?: boolean }
  ) => void;
  tone: () => "cute" | "snarky";
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
  }

  function beginChase() {
    if (deps.chasePausesIdle()) return;
    deps.setChaseIdleGate(true);
    const gen = ++chaseGen;
    const tone = deps.tone();
    void deps.speakText(pickPlayfulLine("start", tone), true, {
      force: true,
      keepMotion: true,
    });
    clearChaseTimer();
    chaseTimer = window.setTimeout(() => {
      if (gen !== chaseGen || !deps.chasePausesIdle()) return;
      deps.applyMood("grumpy", "playful-miss");
      void deps.speakText(pickPlayfulLine("miss", deps.tone()), true, {
        force: true,
        keepMotion: true,
      });
      cooldownUntil = Date.now() + PLAYFUL_POST_MISS_COOLDOWN_MS;
      endChase();
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

  /** @returns true 表示已处理为抓到，调用方别再走普通点按 */
  function tryCatchOnTap(): boolean {
    if (!deps.enabled() || !deps.chasePausesIdle() || fleeBusy) return false;
    if (deps.mood() === "sleep") return false;

    clearChaseTimer();
    deps.applyMood("happy", "playful-catch");
    void deps.speakText(pickPlayfulLine("catch", deps.tone()), true, {
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
