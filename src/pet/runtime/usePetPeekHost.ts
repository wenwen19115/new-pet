import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  movePetWindowTo,
  pickPeekOuterPosition,
  pickPeekRevealOuterPosition,
  type PeekEdge,
} from "@/pet/bridge/screenFly";
import type { ApplyPetMood } from "./petHostMood";

export function usePetPeekHost(deps: {
  hostAlive: () => boolean;
  mood: () => string;
  isPeeking: () => boolean;
  setPeekIdleGate: (
    active: boolean,
    opts?: { rescheduleIdle?: boolean }
  ) => void;
  winSize: () => { w: number; h: number };
  bodyBox: () => { w: number; h: number };
  applyMood: ApplyPetMood;
  cancelActiveMotion: () => void;
  stopPlayful: () => void;
  speakText: (
    text: string,
    fromAuto: boolean,
    opts?: { keepMotion?: boolean; force?: boolean }
  ) => void | Promise<void>;
  tone: () => "cute" | "snarky";
  hideOverlays: () => void;
  syncBubble: () => void;
  resetSleepTimer: () => void;
}) {
  let moveSignal: { cancelled: boolean } | null = null;
  let savedEdge: PeekEdge | null = null;
  let busy = false;

  function cancelMove() {
    if (moveSignal) moveSignal.cancelled = true;
    moveSignal = null;
  }

  async function readOuter(): Promise<{ x: number; y: number } | null> {
    try {
      const win = getCurrentWindow();
      const scale = await win.scaleFactor();
      const outer = (await win.outerPosition()).toLogical(scale);
      return { x: outer.x, y: outer.y };
    } catch {
      return null;
    }
  }

  async function startPeek(): Promise<boolean> {
    if (!deps.hostAlive() || busy || deps.isPeeking()) return false;
    if (deps.mood() === "sleep") return false;
    busy = true;
    deps.stopPlayful();
    deps.cancelActiveMotion();
    deps.hideOverlays();
    deps.resetSleepTimer();

    const size = deps.winSize();
    const body = deps.bodyBox();
    const dest = await pickPeekOuterPosition(size.w, size.h, body.w, body.h);
    if (!dest) {
      busy = false;
      return false;
    }
    savedEdge = dest.edge;

    cancelMove();
    moveSignal = { cancelled: false };
    const signal = moveSignal;
    deps.setPeekIdleGate(true);
    deps.applyMood("curious", "peek-hide");

    try {
      await movePetWindowTo(dest.x, dest.y, 680, signal, () => {
        deps.syncBubble();
      });
      if (signal.cancelled || !deps.hostAlive()) return false;
      void deps.speakText(
        deps.tone() === "snarky"
          ? "先躲会儿，别烦我。"
          : "我躲起来啦，再召我出来～",
        true,
        { force: true, keepMotion: true }
      );
    } finally {
      busy = false;
    }
    return !signal.cancelled;
  }

  async function revealPeek(opts?: {
    rescheduleIdle?: boolean;
    silent?: boolean;
  }): Promise<boolean> {
    if (!deps.isPeeking() && !savedEdge) return false;
    if (busy) return false;
    busy = true;
    deps.hideOverlays();
    deps.resetSleepTimer();

    cancelMove();
    moveSignal = { cancelled: false };
    const signal = moveSignal;
    const size = deps.winSize();
    const body = deps.bodyBox();
    const edge = savedEdge ?? "bottom";
    savedEdge = null;
    const from = await readOuter();
    const dest = await pickPeekRevealOuterPosition(
      size.w,
      size.h,
      body.w,
      body.h,
      edge,
      from ?? undefined
    );

    deps.setPeekIdleGate(false, {
      rescheduleIdle: opts?.rescheduleIdle !== false,
    });

    if (!opts?.silent) {
      deps.applyMood("happy", "peek-reveal");
    }

    try {
      if (dest) {
        await movePetWindowTo(dest.x, dest.y, 420, signal, () => {
          deps.syncBubble();
        });
      }
      if (!opts?.silent && !signal.cancelled && deps.hostAlive()) {
        void deps.speakText(
          deps.tone() === "snarky" ? "行，出来了。" : "我回来啦～",
          true,
          { force: true, keepMotion: true }
        );
      }
    } finally {
      busy = false;
    }
    return true;
  }

  function clearPeek(opts?: { rescheduleIdle?: boolean }) {
    cancelMove();
    savedEdge = null;
    busy = false;
    if (deps.isPeeking()) {
      deps.setPeekIdleGate(false, {
        rescheduleIdle: opts?.rescheduleIdle === true,
      });
    }
  }

  function tryRevealOnTap(): boolean {
    if (!deps.isPeeking() || busy) return false;
    void revealPeek();
    return true;
  }

  return {
    startPeek,
    revealPeek,
    clearPeek,
    tryRevealOnTap,
  };
}
