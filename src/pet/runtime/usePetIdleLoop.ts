import type { Ref } from "vue";
import type { PetSettings } from "../data/types";
import type { PetModelKind } from "../skins/types";
import { buildIdleMotionPool, resolveMotionPlay } from "../domain/motionPlayer";

export function usePetIdleLoop(deps: {
  settings: Ref<PetSettings>;
  model: { value: PetModelKind };
  speaking: Ref<boolean>;
  isDragging: Ref<boolean>;
  mood: Ref<string>;
  isMotionLocked: () => boolean;
  /** When true (e.g. AI chat open), do not schedule random idle motions */
  isPaused?: () => boolean;
  beginMotion: (id: string, opts?: { withSpeakChance?: number }) => void;
  clearTimer: (id: number | null) => void;
  getIdleActionTimer: () => number | null;
  setIdleActionTimer: (id: number | null) => void;
}) {
  function scheduleIdleAction() {
    deps.clearTimer(deps.getIdleActionTimer());
    if (deps.isPaused?.() || !deps.settings.value.randomIdleEnabled) {
      deps.setIdleActionTimer(null);
      return;
    }
    deps.setIdleActionTimer(
      window.setTimeout(() => {
        if (deps.isPaused?.() || !deps.settings.value.randomIdleEnabled) {
          deps.setIdleActionTimer(null);
          return;
        }
        if (
          deps.mood.value === "sleep" ||
          deps.speaking.value ||
          deps.isDragging.value ||
          deps.isMotionLocked()
        ) {
          scheduleIdleAction();
          return;
        }
        const model = deps.model.value;
        const profile = deps.settings.value.profiles[model];
        const pool = buildIdleMotionPool({
          model,
          disabledMotions: profile?.disabledMotions,
          customVrmMotions: deps.settings.value.customVrmMotions,
        });
        if (!pool.length) {
          scheduleIdleAction();
          return;
        }
        const next = pool[Math.floor(Math.random() * pool.length)]!;
        deps.beginMotion(next, { withSpeakChance: 0.55 });
        const play = resolveMotionPlay(
          next,
          deps.settings.value.customVrmMotions
        );
        deps.setIdleActionTimer(
          window.setTimeout(() => {
            scheduleIdleAction();
          }, play.durationMs + 2600 + Math.random() * 4000)
        );
      }, 3800 + Math.random() * 4200)
    );
  }

  return { scheduleIdleAction };
}
