<template>
  <div class="vrm-wrap" aria-hidden="true">
    <canvas ref="canvasRef" class="vrm-canvas" />
    <div v-if="src && loadError" class="vrm-fallback">{{ displayError }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { PetIdleMotion } from "../../content/motion/motions";
import type { PetMood } from "../../data/types";
import type { CustomVrmMotion } from "../../content/motion/customVrmMotions";
import { useVrmRenderer } from "./useVrmRenderer";

const props = withDefaults(
  defineProps<{
    src?: string | null;
    mood: PetMood;
    gaze: { x: number; y: number };
    motion?: PetIdleMotion | string;
    customMotions?: CustomVrmMotion[];
    blinking?: boolean;
    lifting?: boolean;
    faceYaw?: number;
    orbitYaw?: number;
    orbitPitch?: number;
    errorText?: string;
  }>(),
  {
    src: null,
    motion: "idle-float",
    customMotions: () => [],
    blinking: false,
    lifting: false,
    faceYaw: 0,
    orbitYaw: 0,
    orbitPitch: 8,
    errorText: undefined,
  }
);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const { loadError, displayError } = useVrmRenderer(canvasRef, props);
</script>

<style scoped>
.vrm-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  transform: translateZ(0);
  transform-style: flat;
}

.vrm-canvas {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.vrm-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 12px;
  text-align: center;
  color: #9adfff;
  font-size: 13px;
  line-height: 1.45;
  opacity: 0.88;
}
</style>
