<template>
  <div
    class="sprite-root"
    :data-mood="mood"
    :data-motion="motion"
    :data-anim="play.anim"
    :data-playback="play.playback"
    :data-role="role"
    :style="rootStyle"
    aria-hidden="true"
  >
    <i v-if="showShadow" class="sprite-shadow" />
    <div class="sprite-bob">
      <div
        class="sprite-frame"
        :style="frameStyle"
        :class="{ 'is-flip': sheetFlip }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import type { PetIdleMotion } from "../../content/motion/motions";
import type { PetMood } from "../../data/types";
import type { PetSkinVisual } from "../../skins";
import { registerPetHitTester } from "@/pet/runtime/petHitBridge";
import { isPetHitHostWindow } from "@/pet/runtime/isPetHitHostWindow";
import { resolveSpriteAnim } from "./resolveAnim";
import { spriteMotionRole } from "./spriteMotionRole";
import { useSpriteSheet } from "./useSpriteSheet";
import type { PetSpriteManifest } from "./manifest";
import { atlasForManifest } from "./manifest";
import { LOCAL_PET_ATLAS } from "./localAtlas";
import { testSpriteHit } from "./spriteHit";

const props = withDefaults(
  defineProps<{
    src: string;
    manifest?: PetSpriteManifest;
    visual: PetSkinVisual;
    mood: PetMood;
    gaze: { x: number; y: number };
    motion?: PetIdleMotion;
    showShadow?: boolean;
  }>(),
  { motion: "idle-float", showShadow: true }
);

const hostHit = isPetHitHostWindow();

const atlas = computed(() =>
  props.manifest ? atlasForManifest(props.manifest) : LOCAL_PET_ATLAS
);

const play = computed(() =>
  resolveSpriteAnim(
    props.mood,
    props.motion,
    props.manifest?.idleSwayPace ?? 1.15
  )
);
const role = computed(() => spriteMotionRole(props.motion));
const anim = computed(() => play.value.anim);
const playback = computed(() => play.value.playback);
const pace = computed(() => play.value.pace ?? 1);
const flipEvery = computed(() => play.value.flipEvery);
const playing = computed(() => true);

const { bgPos, bgSize, flipX } = useSpriteSheet({
  atlas,
  anim,
  playback,
  playing,
  pace,
  flipEvery,
});

const sheetFlip = computed(() => flipX.value);

const rootStyle = computed(
  () =>
    ({
      "--gaze-x": "0px",
      "--gaze-y": `${props.gaze.y * 0.25}px`,
      "--accent": props.visual.accent,
      "--aspect-w": String(atlas.value.frameW),
      "--aspect-h": String(atlas.value.frameH),
      "--bob-ms": `${Math.round(2800 * (play.value.pace ?? 1))}ms`,
    }) as Record<string, string>
);

const frameStyle = computed(() => ({
  backgroundImage: `url(${props.src})`,
  backgroundSize: bgSize.value,
  backgroundPosition: bgPos.value,
  backgroundRepeat: "no-repeat",
}));

function hitTestNdc(ndcX: number, ndcY: number): boolean {
  return testSpriteHit(ndcX, ndcY);
}

onMounted(() => {
  if (hostHit) registerPetHitTester(hitTestNdc);
});
onUnmounted(() => {
  if (hostHit) registerPetHitTester(null);
});
</script>

<style scoped>
.sprite-root {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: end center;
  position: relative;
  padding-bottom: 2%;
}
.sprite-shadow {
  position: absolute;
  left: 50%;
  bottom: 1%;
  width: 46%;
  height: 7%;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(20, 16, 28, 0.28),
    transparent 70%
  );
  pointer-events: none;
}
.sprite-bob {
  width: 92%;
  max-height: 96%;
  transform: translate(var(--gaze-x), var(--gaze-y));
  transform-origin: 50% 100%;
  /* 默认轻呼吸；各 anim 再覆盖节奏，避免千人一面的匀速 bob */
  animation: breath var(--bob-ms, 2.8s) ease-in-out infinite;
}
.sprite-frame {
  width: 100%;
  aspect-ratio: var(--aspect-w) / var(--aspect-h);
  image-rendering: auto;
  filter: drop-shadow(0 2px 0 color-mix(in srgb, var(--accent) 18%, transparent));
  transform-origin: 50% 100%;
  transition: filter 180ms ease;
}
.sprite-frame.is-flip {
  transform: scaleX(-1);
}
.sprite-root[data-mood="sleep"] .sprite-bob {
  animation: doze 3.6s ease-in-out infinite;
  filter: saturate(0.78) brightness(0.96);
}
.sprite-root[data-mood="sleep"] .sprite-frame {
  filter: drop-shadow(0 1px 0 color-mix(in srgb, var(--accent) 10%, transparent));
}

/* —— 按 role 分工：gesture 只靠帧；ambient 轻呼吸；hop 轻跳 —— */
.sprite-root[data-role="gesture"] .sprite-bob {
  animation: none;
}
.sprite-root[data-role="ambient"] .sprite-bob {
  animation: breath 3.4s ease-in-out infinite;
}
.sprite-root[data-role="ambient"][data-anim="walk"] .sprite-bob,
.sprite-root[data-role="ambient"][data-anim="run"] .sprite-bob {
  animation: none;
}
.sprite-root[data-role="hop"] .sprite-bob {
  animation: hop 0.55s cubic-bezier(0.22, 0.85, 0.28, 1) infinite;
}

@keyframes breath {
  0%,
  100% {
    transform: translate(var(--gaze-x), var(--gaze-y)) translateY(0) scale(1);
  }
  50% {
    transform: translate(var(--gaze-x), var(--gaze-y)) translateY(-2px)
      scale(1.01, 0.99);
  }
}
@keyframes hop {
  0%,
  100% {
    transform: translate(var(--gaze-x), var(--gaze-y)) translateY(0)
      scale(1, 1);
  }
  35% {
    transform: translate(var(--gaze-x), var(--gaze-y)) translateY(-4px)
      scale(0.97, 1.04);
  }
  55% {
    transform: translate(var(--gaze-x), var(--gaze-y)) translateY(0)
      scale(1.03, 0.96);
  }
  70% {
    transform: translate(var(--gaze-x), var(--gaze-y)) translateY(-2px)
      scale(0.99, 1.01);
  }
}
</style>
