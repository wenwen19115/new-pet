<template>
  <div class="pet-root" :style="rootStyle">
    <div
      class="pet-stage"
      :data-model="activeSkin.model"
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
import { PetMeteorTrail } from "@/pet/models";
import { resolveTrailStyle } from "@/pet/content/trailStyles";
import { resolveNickname } from "@/pet/skins";

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
} = host;

const displayName = computed(() =>
  resolveNickname(settings.value.nickname, activeSkin.value)
);

const chipTitle = computed(() => {
  const toneTag = settings.value.tone === "snarky" ? " · snarky" : "";
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
    model: activeSkin.value.model,
    toonDecor: activeSkin.value.toonDecor,
  })
);

const bobStyle = computed(() => {
  if (activeCharacter.value.view.shell === "vrm") return {};
  return physicsStyle.value;
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

.pet-avatar {
  position: relative;
  z-index: 1;
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

.pet-avatar[data-model="chip"][data-physics="0"][data-idle="idle-float"] .chip-bob {
  animation: idle-float 3.8s ease-in-out infinite;
}

.pet-avatar[data-model="chip"][data-physics="0"][data-idle="happy-bounce"] .chip-bob {
  animation: happy-bounce 0.55s ease-out;
}

.pet-avatar[data-model="chip"][data-physics="0"][data-idle="fly-orbit"] .chip-bob {
  animation: fly-orbit 3.2s linear both;
}

.pet-avatar[data-model="chip"][data-physics="0"][data-idle="fly-dash"] .chip-bob {
  animation: fly-dash 2.8s cubic-bezier(0.37, 0.01, 0.2, 1) both;
}

.pet-avatar[data-model="chip"][data-physics="0"][data-idle="barrel-roll"] .chip-bob {
  animation: barrel-roll 2.6s linear both;
}

.pet-avatar[data-model="chip"][data-physics="0"][data-idle="rocket-jump"] .chip-bob {
  animation: rocket-jump 2.3s cubic-bezier(0.22, 0.85, 0.28, 1) both;
}

.pet-avatar[data-model="chip"][data-physics="0"][data-idle="cartwheel"] .chip-bob {
  animation: cartwheel 2.5s linear both;
}

.pet-avatar[data-model="chip"][data-physics="0"][data-idle="figure-eight"] .chip-bob {
  animation: figure-eight 3.4s linear both;
}

.pet-avatar[data-model="chip"][data-physics="0"][data-idle="victory-burst"] .chip-bob {
  animation: victory-burst 2.2s cubic-bezier(0.34, 1.15, 0.64, 1) both;
}

.pet-avatar[data-model="chip"][data-physics="0"][data-idle="peekaboo"] .chip-bob {
  animation: peekaboo 2.3s cubic-bezier(0.4, 0.05, 0.2, 1) both;
}

.pet-avatar[data-physics="0"][data-idle="screen-dash"] .chip-bob,
.pet-avatar[data-physics="0"][data-idle="screen-zip"] .chip-bob {
  animation: screen-lean 0.95s cubic-bezier(0.33, 0.1, 0.2, 1) both;
}

.pet-avatar[data-physics="0"][data-idle="screen-hop"] .chip-bob {
  animation: rocket-jump 1.5s cubic-bezier(0.22, 0.85, 0.28, 1) both;
}

.pet-avatar[data-physics="0"][data-idle="screen-glide"] .chip-bob {
  animation: screen-glide-bob 1.9s cubic-bezier(0.4, 0.05, 0.2, 1) both;
}

.pet-avatar[data-physics="0"][data-idle="tap-frenzy"] .chip-bob {
  animation: tap-frenzy 1.8s cubic-bezier(0.34, 1.3, 0.64, 1) both;
}

.pet-avatar[data-model="chip"][data-physics="0"][data-mood="sleep"] .chip-bob {
  animation: breathe 3.2s ease-in-out infinite;
}

@keyframes screen-lean {
  0% {
    transform: translate3d(0, 0, 0) rotateZ(0) scale(1);
  }
  30% {
    transform: translate3d(0, -8px, 12px) rotateZ(-12deg) scale(1.06);
  }
  70% {
    transform: translate3d(0, -4px, 8px) rotateZ(10deg) scale(1.04);
  }
  100% {
    transform: translate3d(0, 0, 0) rotateZ(0) scale(1);
  }
}

@keyframes screen-glide-bob {
  0%,
  100% {
    transform: translateY(0) rotateZ(0) scale(1);
  }
  25% {
    transform: translateY(-10px) rotateZ(-6deg) scale(1.03);
  }
  50% {
    transform: translateY(-4px) rotateZ(4deg) scale(1.01);
  }
  75% {
    transform: translateY(-12px) rotateZ(-3deg) scale(1.04);
  }
}

@keyframes tap-frenzy {
  0%,
  100% {
    transform: translateY(0) rotateZ(0) scale(1);
  }
  12% {
    transform: translateY(-16px) rotateZ(-10deg) scale(1.08);
  }
  24% {
    transform: translateY(2px) rotateZ(12deg) scale(0.94);
  }
  36% {
    transform: translateY(-20px) rotateZ(-8deg) scale(1.1);
  }
  48% {
    transform: translateY(0) rotateZ(14deg) scale(0.96);
  }
  60% {
    transform: translateY(-14px) rotateZ(-12deg) scale(1.06);
  }
  80% {
    transform: translateY(-6px) rotateZ(6deg) scale(1.02);
  }
}

@keyframes idle-float {
  0%,
  100% {
    transform: translateY(0) rotateZ(-2deg);
  }
  50% {
    transform: translateY(-6px) rotateZ(2deg);
  }
}

@keyframes happy-bounce {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  40% {
    transform: translateY(-14px) scale(0.94, 1.06);
  }
  70% {
    transform: translateY(0) scale(1.05, 0.95);
  }
}

@keyframes fly-orbit {
  0% {
    transform: translate3d(0, 12px, 0) scale(1.04) rotateY(0deg) rotateX(4deg) rotateZ(-5deg);
  }
  6.25% {
    transform: translate3d(15px, 9px, -8px) scale(1.01) rotateY(22deg) rotateX(3deg) rotateZ(-1deg);
  }
  12.5% {
    transform: translate3d(28px, 4px, -20px) scale(0.96) rotateY(45deg) rotateX(2deg) rotateZ(4deg);
  }
  18.75% {
    transform: translate3d(37px, -1px, -34px) scale(0.9) rotateY(68deg) rotateX(1deg) rotateZ(5deg);
  }
  25% {
    transform: translate3d(42px, -6px, -48px) scale(0.84) rotateY(90deg) rotateX(0deg) rotateZ(6deg);
  }
  31.25% {
    transform: translate3d(37px, -11px, -62px) scale(0.77) rotateY(112deg) rotateX(-1deg) rotateZ(4deg);
  }
  37.5% {
    transform: translate3d(28px, -14px, -72px) scale(0.7) rotateY(135deg) rotateX(-2deg) rotateZ(2deg);
  }
  43.75% {
    transform: translate3d(15px, -17px, -82px) scale(0.63) rotateY(158deg) rotateX(-3deg) rotateZ(1deg);
  }
  50% {
    transform: translate3d(0, -18px, -88px) scale(0.58) rotateY(180deg) rotateX(-4deg) rotateZ(0);
  }
  56.25% {
    transform: translate3d(-15px, -17px, -82px) scale(0.63) rotateY(202deg) rotateX(-3deg) rotateZ(-1deg);
  }
  62.5% {
    transform: translate3d(-28px, -14px, -72px) scale(0.7) rotateY(225deg) rotateX(-2deg) rotateZ(-2deg);
  }
  68.75% {
    transform: translate3d(-37px, -11px, -62px) scale(0.77) rotateY(248deg) rotateX(-1deg) rotateZ(-4deg);
  }
  75% {
    transform: translate3d(-42px, -6px, -48px) scale(0.84) rotateY(270deg) rotateX(0deg) rotateZ(-6deg);
  }
  81.25% {
    transform: translate3d(-37px, -1px, -34px) scale(0.9) rotateY(292deg) rotateX(1deg) rotateZ(-5deg);
  }
  87.5% {
    transform: translate3d(-28px, 4px, -20px) scale(0.96) rotateY(315deg) rotateX(2deg) rotateZ(-4deg);
  }
  93.75% {
    transform: translate3d(-15px, 9px, -8px) scale(1.01) rotateY(338deg) rotateX(3deg) rotateZ(-3deg);
  }
  100% {
    transform: translate3d(0, 12px, 0) scale(1.04) rotateY(360deg) rotateX(4deg) rotateZ(-5deg);
  }
}

@keyframes fly-dash {
  0% {
    transform: translate3d(0, 0, 0) scale(1) rotateY(0) rotateX(8deg);
  }
  10% {
    transform: translate3d(0, 4px, 36px) scale(1.18) rotateY(-4deg) rotateX(2deg);
  }
  20% {
    transform: translate3d(0, 8px, 70px) scale(1.35) rotateY(-8deg) rotateX(-6deg);
  }
  32% {
    transform: translate3d(8px, 0, 48px) scale(1.2) rotateY(10deg) rotateX(0deg);
  }
  44% {
    transform: translate3d(-12px, -10px, -10px) scale(0.95) rotateY(80deg) rotateX(-4deg);
  }
  56% {
    transform: translate3d(-36px, -18px, -80px) scale(0.55) rotateY(160deg) rotateX(-8deg);
  }
  68% {
    transform: translate3d(-10px, -12px, -55px) scale(0.7) rotateY(220deg) rotateX(-2deg);
  }
  80% {
    transform: translate3d(24px, -8px, -30px) scale(0.85) rotateY(280deg) rotateX(4deg);
  }
  90% {
    transform: translate3d(10px, -2px, -10px) scale(0.95) rotateY(330deg) rotateX(6deg);
  }
  100% {
    transform: translate3d(0, 0, 0) scale(1) rotateY(360deg) rotateX(8deg);
  }
}

@keyframes barrel-roll {
  0% {
    transform: translate3d(0, 0, 0) rotateZ(0) rotateX(0) scale(1);
  }
  12.5% {
    transform: translate3d(10px, -6px, -4px) rotateZ(2deg) rotateX(45deg) scale(0.98);
  }
  25% {
    transform: translate3d(20px, -10px, -12px) rotateZ(4deg) rotateX(90deg) scale(0.94);
  }
  37.5% {
    transform: translate3d(30px, -6px, -20px) rotateZ(6deg) rotateX(135deg) scale(0.9);
  }
  50% {
    transform: translate3d(34px, 0, -28px) rotateZ(4deg) rotateX(180deg) scale(0.88);
  }
  62.5% {
    transform: translate3d(24px, 6px, -32px) rotateZ(-2deg) rotateX(225deg) scale(0.9);
  }
  75% {
    transform: translate3d(8px, 2px, -20px) rotateZ(-4deg) rotateX(270deg) scale(0.94);
  }
  87.5% {
    transform: translate3d(-4px, -4px, -8px) rotateZ(2deg) rotateX(315deg) scale(0.98);
  }
  100% {
    transform: translate3d(0, 0, 0) rotateZ(0) rotateX(360deg) scale(1);
  }
}

@keyframes rocket-jump {
  0% {
    transform: translateY(0) scale(1) rotateY(0) rotateZ(0);
  }
  8% {
    transform: translateY(6px) scale(1.08, 0.86) rotateY(0) rotateZ(-3deg);
  }
  16% {
    transform: translateY(8px) scale(1.12, 0.78) rotateY(10deg) rotateZ(-4deg);
  }
  28% {
    transform: translateY(-28px) scale(0.94, 1.08) rotateY(60deg) rotateZ(4deg);
  }
  40% {
    transform: translateY(-52px) scale(0.88, 1.1) rotateY(120deg) rotateZ(6deg);
  }
  52% {
    transform: translateY(-56px) scale(0.85, 1.08) rotateY(180deg) rotateZ(-4deg);
  }
  64% {
    transform: translateY(-40px) scale(0.9, 1.04) rotateY(240deg) rotateZ(2deg);
  }
  76% {
    transform: translateY(-14px) scale(0.98, 1) rotateY(300deg) rotateZ(0);
  }
  88% {
    transform: translateY(4px) scale(1.1, 0.88) rotateY(345deg) rotateZ(0);
  }
  100% {
    transform: translateY(0) scale(1) rotateY(360deg) rotateZ(0);
  }
}

@keyframes cartwheel {
  0% {
    transform: translateX(0) translateY(0) rotateZ(0) scale(1);
  }
  10% {
    transform: translateX(-6px) translateY(2px) rotateZ(-30deg) scale(1.02, 0.96);
  }
  25% {
    transform: translateX(4px) translateY(-14px) rotateZ(-90deg) scale(0.96);
  }
  40% {
    transform: translateX(20px) translateY(-18px) rotateZ(-150deg) scale(0.94);
  }
  55% {
    transform: translateX(36px) translateY(-8px) rotateZ(-220deg) scale(0.92);
  }
  70% {
    transform: translateX(28px) translateY(-4px) rotateZ(-280deg) scale(0.96);
  }
  85% {
    transform: translateX(10px) translateY(2px) rotateZ(-330deg) scale(1.02, 0.96);
  }
  100% {
    transform: translateX(0) translateY(0) rotateZ(-360deg) scale(1);
  }
}

@keyframes figure-eight {
  0% {
    transform: translate3d(0, 0, 0) rotateY(0) rotateZ(-4deg) scale(1);
  }
  12.5% {
    transform: translate3d(26px, -12px, -16px) rotateY(45deg) rotateZ(6deg) scale(0.92);
  }
  25% {
    transform: translate3d(0, -22px, -40px) rotateY(90deg) rotateZ(0) scale(0.78);
  }
  37.5% {
    transform: translate3d(-26px, -12px, -16px) rotateY(135deg) rotateZ(-6deg) scale(0.92);
  }
  50% {
    transform: translate3d(0, 0, 0) rotateY(180deg) rotateZ(4deg) scale(1);
  }
  62.5% {
    transform: translate3d(26px, 10px, -16px) rotateY(225deg) rotateZ(-4deg) scale(0.92);
  }
  75% {
    transform: translate3d(0, 18px, -40px) rotateY(270deg) rotateZ(0) scale(0.78);
  }
  87.5% {
    transform: translate3d(-26px, 10px, -16px) rotateY(315deg) rotateZ(6deg) scale(0.92);
  }
  100% {
    transform: translate3d(0, 0, 0) rotateY(360deg) rotateZ(-4deg) scale(1);
  }
}

@keyframes victory-burst {
  0% {
    transform: translateY(0) rotateY(0) scale(1);
  }
  12% {
    transform: translateY(-18px) rotateY(30deg) scale(0.94, 1.08);
  }
  24% {
    transform: translateY(0) rotateY(70deg) scale(1.08, 0.9);
  }
  36% {
    transform: translateY(-24px) rotateY(120deg) scale(0.92, 1.1);
  }
  48% {
    transform: translateY(0) rotateY(180deg) scale(1.06, 0.92);
  }
  60% {
    transform: translateY(-26px) rotateY(230deg) scale(0.9, 1.1);
  }
  72% {
    transform: translateY(0) rotateY(280deg) scale(1.06, 0.92);
  }
  86% {
    transform: translateY(-12px) rotateY(330deg) scale(0.96, 1.04);
  }
  100% {
    transform: translateY(0) rotateY(360deg) scale(1);
  }
}

@keyframes peekaboo {
  0% {
    transform: rotateY(0) scale(1) translateY(0);
  }
  15% {
    transform: rotateY(60deg) scale(0.92) translateY(2px);
  }
  30% {
    transform: rotateY(120deg) scale(0.8) translateY(6px);
  }
  42% {
    transform: rotateY(180deg) scale(0.7) translateY(8px);
  }
  55% {
    transform: rotateY(180deg) scale(0.68) translateY(10px);
  }
  68% {
    transform: rotateY(240deg) scale(0.82) translateY(-4px);
  }
  80% {
    transform: rotateY(300deg) scale(0.98) translateY(-10px);
  }
  90% {
    transform: rotateY(340deg) scale(1.06, 0.94) translateY(2px);
  }
  100% {
    transform: rotateY(360deg) scale(1) translateY(0);
  }
}

@keyframes breathe {
  0%,
  100% {
    transform: scale(1) translateY(0);
  }
  50% {
    transform: scale(0.97) translateY(2px);
  }
}
</style>
