import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PetIdleMotion } from "@/pet/content/motion/motions";
import type { CustomVrmMotion } from "@/pet/content/motion/customVrmMotions";
import type { PetFigArtId, PetModelKind, PetSkinVisual } from "@/pet/skins";
import { clampPreviewBoost, previewBoostScale } from "@/pet/bridge/sizes";
import type { PetMood } from "@/pet/data/types";
import type { PetToonDecorId } from "@/pet/skins/looks";
import { characterHas, getCharacter } from "@/pet/characters";

export type PreviewOrbitProps = {
  model: PetModelKind;
  visual: PetSkinVisual;
  mood?: PetMood;
  hint?: string;
  figArtId?: PetFigArtId | null;
  toonDecor?: PetToonDecorId | null;
  vrmSrc?: string | null;
  showBg?: boolean;
  motionOverride?: string | null;
  customMotions?: CustomVrmMotion[];
  autoOrbit?: boolean;
  autoIdleClips?: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hsl(h: number, s: number, l: number) {
  return `hsl(${((h % 360) + 360) % 360} ${s}% ${l}%)`;
}

export function usePreviewOrbit(props: PreviewOrbitProps) {
  const { t } = useI18n();
  const vrmErrorText = computed(() => t("pet.vrmLoadFail"));

  const character = computed(() => getCharacter(props.model));
  const canOrbit = computed(() => characterHas(props.model, "preview-orbit"));

  const defaultOrbit = () =>
    character.value.view.previewOrbit ?? { yaw: 18, pitch: 8 };
  const yaw = ref(defaultOrbit().yaw);
  const pitch = ref(defaultOrbit().pitch);
  const dragging = ref(false);
  const previewBoost = ref(0);
  const previewMotion = ref<PetIdleMotion>("idle-float");
  const vrmPreviewMotion = computed(
    () => props.motionOverride || previewMotion.value
  );
  const previewGaze = ref({ x: 0.2, y: 0.05 });
  const pinColors = ref<string[]>(Array.from({ length: 14 }, () => "#1a6b78"));

  const previewModelProps = computed(() =>
    character.value.view.bindPreview({
      visual: props.visual,
      mood: props.mood ?? "idle",
      motion: vrmPreviewMotion.value,
      pinColors: pinColors.value,
      figArtId: props.figArtId ?? null,
      toonDecor: props.toonDecor ?? null,
      vrmSrc: props.vrmSrc ?? null,
      customMotions: props.customMotions ?? [],
      yaw: yaw.value,
      pitch: pitch.value,
      previewGaze: previewGaze.value,
      errorText: vrmErrorText.value,
    })
  );

  let lastX = 0;
  let lastY = 0;
  let raf = 0;
  let idleCycleTimer = 0;

  const stageStyle = computed(
    () =>
      ({
        "--pet-accent": props.visual.accent,
        "--pet-accent-soft": props.visual.accentSoft,
        "--pet-side-hi": props.visual.sideHi,
        "--pet-side-mid": props.visual.sideMid,
        "--pet-side-lo": props.visual.sideLo,
        "--pet-back-grid": props.visual.backGrid,
        "--pet-package-stroke": props.visual.packageStroke,
        "--pet-die-from": props.visual.dieFrom,
        "--pet-die-to": props.visual.dieTo,
      }) as Record<string, string>
  );

  const combinedScale = computed(() => previewBoostScale(previewBoost.value));

  const rigStyle = computed(() => ({
    transform: `rotateX(${pitch.value}deg) rotateY(${yaw.value}deg) scale(${combinedScale.value})`,
  }));

  const figZoomStyle = computed(() => ({
    transform: `scale(${combinedScale.value})`,
  }));

  function tickLeds(now: number) {
    const phase = now / 150;
    const breath = 0.5 + 0.5 * Math.sin(now / 620);
    const baseHue = props.visual.ledHue;
    const next = new Array<string>(14);
    for (let i = 0; i < 14; i++) {
      let dist = Math.abs(i - (phase % 14));
      dist = Math.min(dist, 14 - dist);
      const chase = Math.exp(-dist * dist * 0.5);
      const tVal = clamp(chase * 0.95 + breath * 0.22, 0, 1);
      const hue = baseHue + i * 5 + phase * 7 + tVal * 28;
      next[i] = hsl(hue, 70 + tVal * 25, 28 + tVal * 42);
    }
    pinColors.value = next;
  }

  function resetOrbit() {
    const orbit = character.value.view.previewOrbit ?? { yaw: 18, pitch: 8 };
    yaw.value = orbit.yaw;
    pitch.value = orbit.pitch;
    previewBoost.value = 0;
  }

  function onWheel(e: WheelEvent) {
    const delta = e.deltaY > 0 ? -5 : 5;
    previewBoost.value = clampPreviewBoost(previewBoost.value + delta);
  }

  function onDown(e: PointerEvent) {
    if (e.button !== 0) return;
    dragging.value = true;
    lastX = e.clientX;
    lastY = e.clientY;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function onMove(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement | null;
    if (el && character.value.view.previewPad === "vrm") {
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
      previewGaze.value = {
        x: clamp(nx * 0.85, -1, 1),
        y: clamp(ny * 0.75, -0.85, 0.85),
      };
    }
    if (!dragging.value) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    yaw.value += dx * 0.45;
    pitch.value = clamp(pitch.value - dy * 0.35, -28, 42);
  }

  function onUp() {
    dragging.value = false;
  }

  function tick(now: number) {
    const pad = character.value.view.previewPad;
    if (pad === "orbit") tickLeds(now);
    if (canOrbit.value && props.autoOrbit && !dragging.value) {
      yaw.value += pad === "vrm" ? 0.28 : 0.22;
    }
    raf = window.requestAnimationFrame(tick);
  }

  function startOrbitLoop() {
    if (raf) return;
    raf = window.requestAnimationFrame(tick);
  }

  function stopOrbitLoop() {
    if (!raf) return;
    window.cancelAnimationFrame(raf);
    raf = 0;
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      stopOrbitLoop();
    } else {
      startOrbitLoop();
    }
  }

  function scheduleIdleClip() {
    window.clearTimeout(idleCycleTimer);
    if (!props.autoIdleClips || props.motionOverride) {
      idleCycleTimer = 0;
      return;
    }
    idleCycleTimer = window.setTimeout(() => {
      if (!props.autoIdleClips || props.motionOverride) {
        scheduleIdleClip();
        return;
      }
      // orbit 垫（chip）保留引脚灯；flat/vrm 才轮播 demo 片段
      const clips = [...character.value.demoMotions];
      if (character.value.view.previewPad === "orbit" || clips.length === 0) {
        scheduleIdleClip();
        return;
      }
      const next = clips[Math.floor(Math.random() * clips.length)]!;
      previewMotion.value = next;
      window.setTimeout(() => {
        previewMotion.value = "idle-float";
        scheduleIdleClip();
      }, next === "idle-float" ? 800 : 1800);
    }, 4500 + Math.random() * 4000);
  }

  watch(
    () => props.model,
    () => {
      resetOrbit();
      previewMotion.value = "idle-float";
    },
    { immediate: true }
  );

  watch(
    () => [props.autoIdleClips, props.motionOverride] as const,
    () => {
      window.clearTimeout(idleCycleTimer);
      if (props.motionOverride) {
        previewMotion.value = "idle-float";
        return;
      }
      if (props.autoIdleClips) scheduleIdleClip();
      else previewMotion.value = "idle-float";
    }
  );

  watch(
    () => props.autoOrbit,
    (on) => {
      if (!on) resetOrbit();
    }
  );

  onMounted(() => {
    document.addEventListener("visibilitychange", onVisibilityChange);
    startOrbitLoop();
    scheduleIdleClip();
  });

  onUnmounted(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    stopOrbitLoop();
    window.clearTimeout(idleCycleTimer);
  });

  return {
    character,
    stageStyle,
    previewModelProps,
    rigStyle,
    figZoomStyle,
    onWheel,
    onDown,
    onMove,
    onUp,
    resetOrbit,
  };
}
