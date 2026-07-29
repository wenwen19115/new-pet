<template>
  <canvas
    ref="canvasRef"
    class="pet-trail-canvas"
    :class="{ 'is-on': engineOn }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { PetTrailStyle } from "../../content/motion/trailStyles";
import { MeteorTrailEngine } from "./meteorTrailEngine";

const props = withDefaults(
  defineProps<{
    active: boolean;
    /** Trail direction in deg (opposite to motion; 0 = right) */
    angle: number;
    speed: number;
    palette: PetTrailStyle;
    wormholePhase?: "idle" | "out" | "warp" | "in";
  }>(),
  {
    active: false,
    angle: 0,
    speed: 0,
    wormholePhase: "idle",
  }
);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const engine = new MeteorTrailEngine(() => ({
  active: props.active,
  angle: props.angle,
  speed: props.speed,
  palette: props.palette,
}));
const fadingTick = ref(0);
const engineOn = computed(
  () => props.active || engine.fading || fadingTick.value > 0
);

let raf = 0;

function loop(now: number) {
  const el = canvasRef.value;
  if (!el) {
    raf = requestAnimationFrame(loop);
    return;
  }
  const keep = engine.tick(now, el);
  fadingTick.value = engine.fading ? 1 : 0;
  if (keep) {
    raf = requestAnimationFrame(loop);
  } else {
    raf = 0;
  }
}

function ensureLoop() {
  if (!raf) raf = requestAnimationFrame(loop);
}

function onResize() {
  const el = canvasRef.value;
  if (el) engine.resize(el);
}

onMounted(() => {
  const el = canvasRef.value;
  if (el) engine.resize(el);
  window.addEventListener("resize", onResize);
  ensureLoop();
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  engine.dispose();
});

watch(
  () => [props.palette.id, props.active] as const,
  () => {
    if (props.active) ensureLoop();
    if (!props.active) return;
    engine.resetParticles();
  }
);

watch(
  () => props.wormholePhase,
  (phase, prev) => {
    if (phase === prev) return;
    if (phase === "out" || phase === "in") {
      engine.emitWormholeBurst(phase, canvasRef.value);
      ensureLoop();
    }
  }
);
</script>

<style scoped>
.pet-trail-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s ease-out;
}

.pet-trail-canvas.is-on {
  opacity: 1;
}
</style>
