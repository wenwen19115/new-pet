/**
 * 桌宠窗景显隐：开关投射动效 + 拖拽/飞行/peek 收起。
 * HWND 固定窗景画布，本模块只管 DOM phase。
 */
import {
  computed,
  onUnmounted,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from "vue";
import type { SkyPetHideEffect } from "@/pet/data/skyWeather";

const SKY_HIDE_IN_MS = 680;
const SKY_HIDE_OUT_MS = 720;

type MaybeRefBool = Ref<boolean> | ComputedRef<boolean>;
type MaybeRefEffect = Ref<SkyPetHideEffect> | ComputedRef<SkyPetHideEffect>;

export function usePetSkySurface(deps: {
  skyBackdropEnabled: MaybeRefBool;
  skyHideableOnPet: MaybeRefBool;
  skyHideEffectOnPet: MaybeRefEffect;
  skyBackdropStyle: Ref<Record<string, string>> | ComputedRef<Record<string, string>>;
  bodyBox: Ref<{ w: number; h: number }> | ComputedRef<{ w: number; h: number }>;
  isDragging: MaybeRefBool;
  isPeeking: MaybeRefBool;
  flyVisualX: Ref<number> | ComputedRef<number>;
  flyVisualY: Ref<number> | ComputedRef<number>;
  skyVisualHold: Ref<boolean>;
  finishSkyDismiss: () => void;
}) {
  /** 视觉挂载（开关投射只显隐，不再扩缩 HWND） */
  const skySurfaceOn = ref(Boolean(deps.skyBackdropEnabled.value));
  /** '' | in | held | out — 窗景收起/释放 */
  const skyVortexPhase = ref<"" | "in" | "held" | "out">("");
  let skyVortexTimer: ReturnType<typeof setTimeout> | null = null;
  let skyToggleGen = 0;
  const skyRafIds = new Set<number>();

  const skyFlying = computed(
    () => Math.hypot(deps.flyVisualX.value, deps.flyVisualY.value) > 0.5
  );

  const skyBusyWant = computed(
    () =>
      Boolean(skySurfaceOn.value) &&
      Boolean(deps.skyBackdropEnabled.value) &&
      Boolean(deps.skyHideableOnPet.value) &&
      (deps.isDragging.value || skyFlying.value || deps.isPeeking.value)
  );

  const skyDismissing = computed(
    () => Boolean(skySurfaceOn.value) && !deps.skyBackdropEnabled.value
  );

  /** 收束中/已收起时不裁切 stage，方便角色飞出 */
  const skyStageClip = computed(
    () =>
      Boolean(skySurfaceOn.value) &&
      skyVortexPhase.value !== "in" &&
      skyVortexPhase.value !== "held"
  );

  const skyHaloVisible = computed(
    () =>
      Boolean(skySurfaceOn.value) &&
      Boolean(deps.skyBackdropEnabled.value) &&
      deps.skyHideEffectOnPet.value === "vortexHalo" &&
      (skyVortexPhase.value === "in" ||
        skyVortexPhase.value === "held" ||
        skyVortexPhase.value === "out")
  );

  const skyHaloStyle = computed(() => ({
    ...deps.skyBackdropStyle.value,
    "--pet-body-w": `${deps.bodyBox.value.w}px`,
    "--pet-body-h": `${deps.bodyBox.value.h}px`,
  }));

  function clearSkyVortexTimer() {
    if (skyVortexTimer) {
      clearTimeout(skyVortexTimer);
      skyVortexTimer = null;
    }
  }

  function clearSkyRafs() {
    for (const id of skyRafIds) cancelAnimationFrame(id);
    skyRafIds.clear();
  }

  function scheduleRaf(fn: () => void) {
    const id = requestAnimationFrame(() => {
      skyRafIds.delete(id);
      fn();
    });
    skyRafIds.add(id);
  }

  /** 收起：in → held */
  function beginBusyIn() {
    skyVortexPhase.value = "in";
    skyVortexTimer = setTimeout(() => {
      skyVortexPhase.value = "held";
      skyVortexTimer = null;
    }, SKY_HIDE_IN_MS);
  }

  function syncBusyAfterToggle() {
    if (!skyBusyWant.value) return;
    beginBusyIn();
  }

  function finishAppearOut(gen: number) {
    skyVortexPhase.value = "out";
    skyVortexTimer = setTimeout(() => {
      if (gen !== skyToggleGen) return;
      skyVortexPhase.value = "";
      skyVortexTimer = null;
      deps.skyVisualHold.value = false;
      syncBusyAfterToggle();
    }, SKY_HIDE_OUT_MS);
  }

  function playSkyAppear(gen: number) {
    deps.skyVisualHold.value = true;
    skySurfaceOn.value = true;
    skyVortexPhase.value = "held";
    scheduleRaf(() => {
      scheduleRaf(() => {
        if (gen !== skyToggleGen) return;
        finishAppearOut(gen);
      });
    });
  }

  function playSkyDismiss(gen: number) {
    if (!skySurfaceOn.value) {
      deps.skyVisualHold.value = false;
      deps.finishSkyDismiss();
      return;
    }
    deps.skyVisualHold.value = true;
    skyVortexPhase.value = "in";
    skyVortexTimer = setTimeout(() => {
      if (gen !== skyToggleGen) return;
      // 先 held 藏住再卸层，避免 phase 清空闪回全亮
      skyVortexPhase.value = "held";
      skyVortexTimer = null;
      scheduleRaf(() => {
        if (gen !== skyToggleGen) return;
        skySurfaceOn.value = false;
        skyVortexPhase.value = "";
        deps.skyVisualHold.value = false;
        deps.finishSkyDismiss();
      });
    }, SKY_HIDE_IN_MS);
  }

  /** 从 held/in 放出：走 out，避免直接清 phase 留下 animation forwards 残影 */
  function releaseSkyBusy(gen: number) {
    if (!skyVortexPhase.value || skyVortexPhase.value === "out") return;
    skyVortexPhase.value = "out";
    skyVortexTimer = setTimeout(() => {
      if (gen !== skyToggleGen) return;
      skyVortexPhase.value = "";
      skyVortexTimer = null;
    }, SKY_HIDE_OUT_MS);
  }

  watch(
    () => deps.skyBackdropEnabled.value,
    (on, was) => {
      // 仅边沿触发；避免同值重入把可见窗景又打成 held
      if (on === was) return;
      const gen = ++skyToggleGen;
      clearSkyVortexTimer();
      clearSkyRafs();
      if (on) {
        playSkyAppear(gen);
        return;
      }
      playSkyDismiss(gen);
    },
    { immediate: true }
  );

  watch(
    skyBusyWant,
    (want) => {
      if (skyDismissing.value || deps.skyVisualHold.value) return;
      clearSkyVortexTimer();
      if (
        !skySurfaceOn.value ||
        !deps.skyBackdropEnabled.value ||
        !deps.skyHideableOnPet.value
      ) {
        if (skyVortexPhase.value === "in" || skyVortexPhase.value === "held") {
          releaseSkyBusy(++skyToggleGen);
        } else if (skyVortexPhase.value) {
          skyVortexPhase.value = "";
        }
        return;
      }
      if (want) {
        if (skyVortexPhase.value === "in" || skyVortexPhase.value === "held") {
          return;
        }
        beginBusyIn();
        return;
      }
      releaseSkyBusy(++skyToggleGen);
    },
    { immediate: true }
  );

  // 投射仍开却停在 held（竞态/残影）：空闲时放出
  watch(
    [
      skyBusyWant,
      () => deps.skyBackdropEnabled.value,
      () => deps.skyVisualHold.value,
      skyVortexPhase,
    ],
    () => {
      if (deps.skyVisualHold.value || skyDismissing.value) return;
      if (!deps.skyBackdropEnabled.value || !skySurfaceOn.value) return;
      if (skyBusyWant.value) return;
      if (skyVortexPhase.value !== "held") return;
      clearSkyVortexTimer();
      releaseSkyBusy(++skyToggleGen);
    }
  );

  watch(
    () => deps.skyHideableOnPet.value,
    (on) => {
      if (on || skyDismissing.value || deps.skyVisualHold.value) return;
      if (skyVortexPhase.value === "in" || skyVortexPhase.value === "held") {
        clearSkyVortexTimer();
        releaseSkyBusy(++skyToggleGen);
      }
    }
  );

  watch(
    () => deps.skyHideEffectOnPet.value,
    () => {
      if (skyDismissing.value || deps.skyVisualHold.value) return;
      clearSkyVortexTimer();
      if (skyVortexPhase.value === "in" || skyVortexPhase.value === "held") {
        releaseSkyBusy(++skyToggleGen);
      } else {
        skyVortexPhase.value = "";
      }
      if (!skyBusyWant.value) return;
      beginBusyIn();
    }
  );

  onUnmounted(() => {
    skyToggleGen += 1;
    clearSkyVortexTimer();
    clearSkyRafs();
  });

  return {
    skySurfaceOn,
    skyVortexPhase,
    skyStageClip,
    skyHaloVisible,
    skyHaloStyle,
  };
}
