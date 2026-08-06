<template>
  <div class="pet-root" :style="rootStyle">
    <div
      v-if="skySurfaceOn"
      class="pet-sky-vortex"
      :data-vortex="skyVortexPhase"
      :data-hide-effect="skyHideEffectOnPet"
      :style="skyBackdropStyle"
    >
      <div class="pet-sky-vortex-spin">
        <!-- 底部室内底板：补全窗台以下透明区 -->
        <i class="pet-sky-floor" aria-hidden="true" />
        <HeroWindowWorld
          class="pet-sky-backdrop"
          :tod="skyDisplayTod"
          :weather="skyDisplayWeather"
          :family="skyWindowFamily"
          :follow-clock="skyFollowClock"
          :rainbow="skyRainbow"
          :events="skyEvents"
          :clip-actor="false"
        />
      </div>
      <!-- 漩涡光晕：收束时的水流旋纹 -->
      <i
        v-if="skyHideEffectOnPet === 'vortexHalo'"
        class="pet-sky-flow"
        aria-hidden="true"
      />
    </div>
    <!-- 漩涡光晕：收束后主题色旋转光晕 -->
    <i
      v-if="skyHaloVisible"
      class="pet-sky-halo"
      :data-vortex="skyVortexPhase"
      :style="skyHaloStyle"
      aria-hidden="true"
    />
    <div
      class="pet-stage"
      :data-model="activeSkin.model"
      :data-sky="skyStageClip ? '1' : '0'"
      :style="stageFlyStyle"
    >
      <PetMeteorTrail
        v-if="trailEnabled"
        :active="isDragging && dragTrailSpeed > 0.04"
        :angle="dragTrailAngle"
        :speed="dragTrailSpeed"
        :palette="trailStyle"
        :wormhole-phase="wormholePhase"
      />
      <div
        class="pet-avatar"
        :data-mood="mood"
        :data-idle="idleMotion"
        :data-physics="physicsActive ? '1' : '0'"
        :data-model="activeSkin.model"
        :data-skin="activeSkin.id"
        :style="chipSkinStyle"
        :title="chipTitle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @contextmenu.prevent="onContextMenu"
      >
        <i v-show="showHitBounds" class="pet-hit-bounds" aria-hidden="true" />
        <template v-if="activeCharacter.view.shell === 'vrm'">
          <template v-if="vrmSrc">
            <i class="vrm-ground-shadow" aria-hidden="true" />
            <component
              :is="activeCharacter.view.Model"
              class="vrm-host"
              v-bind="runtimeModelProps"
            />
          </template>
        </template>
        <span
          v-else
          class="chip-bob"
          :key="motionPlayId"
          :style="bobStyle"
        >
          <component
            :is="activeCharacter.view.Model"
            v-bind="runtimeModelProps"
          />
        </span>
        <i
          v-if="activeCharacter.view.showBobShadow"
          class="chip-ground-shadow"
          aria-hidden="true"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { characterHas } from "@/pet/characters";
import { createPetHost } from "@/pet/runtime";
import { usePetSkySurface } from "@/pet/runtime/usePetSkySurface";
import { PetMeteorTrail } from "@/pet/models";
import HeroWindowWorld from "@/pet/models/preview/HeroWindowWorld.vue";
import { resolvePetShellBobAnimation } from "@/pet/content/shell/petShellMotions";
import { resolveTrailStyle } from "@/pet/content/motion/trailStyles";
import { resolveNickname } from "@/pet/skins";
import "@/pet/content/shell/petShellMotions.css";
import "./petSkySurface.css";

const host = createPetHost();
const {
  settings,
  vrmSrc,
  mood,
  idleMotion,
  gaze,
  activeSkin,
  activeCharacter,
  v,
  bodyBox,
  isDragging,
  isPeeking,
  showHitBounds,
  dragTrailAngle,
  dragTrailSpeed,
  physicsActive,
  physicsStyle,
  motionPlayId,
  flyVisualX,
  flyVisualY,
  vrmFaceYaw,
  wormholePhase,
  pinColors,
  blinking,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onContextMenu,
  mount,
  dispose,
  skyBackdropEnabled,
  skyHideableOnPet,
  skyHideEffectOnPet,
  skyDisplayTod,
  skyDisplayWeather,
  skyRainbow,
  skyEvents,
  skyFollowClock,
  skyWindowFamily,
  skyBackdropStyle,
  skyVisualHold,
  finishSkyDismiss,
} = host;

const {
  skySurfaceOn,
  skyVortexPhase,
  skyStageClip,
  skyHaloVisible,
  skyHaloStyle,
} = usePetSkySurface({
  skyBackdropEnabled,
  skyHideableOnPet,
  skyHideEffectOnPet,
  skyBackdropStyle,
  bodyBox,
  isDragging,
  isPeeking,
  flyVisualX,
  flyVisualY,
  skyVisualHold,
  finishSkyDismiss,
});

const displayName = computed(() =>
  resolveNickname(settings.value.nickname, activeSkin.value)
);

const chipTitle = computed(() => {
  const toneTag = settings.value.tone === "snarky" ? " \u00b7 snarky" : "";
  return `${displayName.value}${toneTag}`;
});

const chipSkinStyle = computed(() => {
  const vis = v.value;
  return {
    "--pet-accent": vis.accent,
    "--pet-accent-soft": vis.accentSoft,
    "--pet-side-hi": vis.sideHi,
    "--pet-side-mid": vis.sideMid,
    "--pet-side-lo": vis.sideLo,
    "--pet-back-grid": vis.backGrid,
    "--pet-package-stroke": vis.packageStroke,
    "--pet-die-from": vis.dieFrom,
    "--pet-die-to": vis.dieTo,
    "--pet-body": `${bodyBox.value.h}px`,
    "--pet-body-w": `${bodyBox.value.w}px`,
    "--pet-body-h": `${bodyBox.value.h}px`,
  } as Record<string, string>;
});

const rootStyle = computed(() =>
  settings.value.opacity < 0.995 ? { opacity: settings.value.opacity } : {}
);

const trailEnabled = computed(() =>
  characterHas(activeSkin.value.model, "pixel-fx")
);

const trailStyle = computed(() =>
  resolveTrailStyle({
    lookId: activeSkin.value.lookId,
    toonDecor: activeSkin.value.toonDecor,
    preferToonDecor: Boolean(activeCharacter.value.appearance.attachToonDecor),
  })
);

const bobStyle = computed(() => {
  if (activeCharacter.value.view.shell === "vrm") return {};
  if (physicsActive.value) return physicsStyle.value;
  const animation = resolvePetShellBobAnimation({
    model: activeSkin.value.model,
    idle: idleMotion.value,
    mood: mood.value,
    physicsActive: false,
    shellSleepBob: characterHas(activeSkin.value.model, "shell-sleep-bob"),
  });
  return animation ? { animation } : {};
});

const runtimeModelProps = computed(() =>
  activeCharacter.value.view.bindRuntime({
    visual: v.value,
    mood: mood.value,
    gaze: gaze,
    blinking: blinking.value,
    motion: idleMotion.value,
    pinColors: pinColors.value,
    figArtId: activeSkin.value.figArtId,
    toonDecor: activeSkin.value.toonDecor,
    wormholePhase: wormholePhase.value,
    vrmSrc: vrmSrc.value,
    customVrmMotions: settings.value.customVrmMotions,
    lifting: isDragging.value,
    faceYaw: vrmFaceYaw.value,
  })
);

const stageFlyStyle = computed(() => {
  const x = flyVisualX.value;
  const y = flyVisualY.value;
  if (Math.abs(x) < 0.15 && Math.abs(y) < 0.15) return {};
  return {
    transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`,
    willChange: "transform",
  } as Record<string, string>;
});

onMounted(() => {
  void mount();
});

onUnmounted(() => {
  dispose();
});
</script>

<style scoped>
.pet-root {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: transparent;
  overflow: visible;
  user-select: none;
  touch-action: none;
  pointer-events: none;
}

.pet-root:active {
  cursor: grabbing;
}

.pet-stage {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 720px;
  perspective-origin: 50% 40%;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  pointer-events: none;
  overflow: visible;
}

.pet-stage[data-model="vrm"] {
  perspective: none;
  transform-style: flat;
  backface-visibility: visible;
}

.pet-stage[data-sky="1"] {
  overflow: hidden;
}

.pet-avatar {
  position: relative;
  z-index: 2;
  width: var(--pet-body-w, var(--pet-body, 108px));
  height: var(--pet-body-h, var(--pet-body, 108px));
  flex-shrink: 0;
  transform-style: preserve-3d;
  pointer-events: auto;
  cursor: grab;
}

.pet-hit-bounds {
  position: absolute;
  inset: 0;
  z-index: 0;
  box-sizing: border-box;
  border: 1px solid rgba(120, 120, 120, 0.55);
  background: rgba(128, 128, 128, 0.28);
  border-radius: 4px;
  pointer-events: none;
}

.pet-avatar:active {
  cursor: grabbing;
}

.pet-avatar[data-model="vrm"] {
  transform-style: flat;
  overflow: visible;
}

.vrm-host {
  display: block;
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.vrm-ground-shadow {
  position: absolute;
  left: 22%;
  right: 22%;
  bottom: 3%;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(0, 0, 0, 0.45) 0%,
    rgba(0, 0, 0, 0.18) 42%,
    transparent 72%
  );
  pointer-events: none;
  z-index: 0;
  filter: blur(0.5px);
}

.chip-bob {
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
  transform-origin: 50% 55%;
  transform-style: preserve-3d;
  will-change: transform;
  backface-visibility: hidden;
}

.chip-ground-shadow {
  position: absolute;
  left: 50%;
  bottom: calc(50% - var(--pet-body-h, 108px) * 0.42);
  width: calc(var(--pet-body-w, 108px) * 0.62);
  height: 14px;
  margin-left: calc(var(--pet-body-w, 108px) * -0.31);
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(0, 0, 0, 0.55) 0%,
    rgba(0, 0, 0, 0) 72%
  );
  pointer-events: none;
  z-index: 0;
  transform: none;
}
</style>
