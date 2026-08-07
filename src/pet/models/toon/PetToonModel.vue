<template>
  <!--
    狐青青：像素神话小兽（狐火精灵）
    40×40 像素格 + 分层动画（耳/尾/狐火独立），铺满父级本体框。
  -->
  <div
    class="pix"
    :data-mood="mood"
    :data-anim="animState"
    :data-wormhole="wormholePhase"
    :style="rootVars"
    aria-hidden="true"
  >
    <i v-if="showShadow" class="pix-shadow" />

    <!-- 虫洞门：独立于角色舞台，隐身/掉落时洞口仍可见 -->
    <svg
      v-if="wormholePhase === 'warp' || wormholePhase === 'in'"
      class="pix-portal-svg"
      viewBox="0 0 40 40"
      width="100%"
      height="100%"
      shape-rendering="crispEdges"
      aria-hidden="true"
    >
      <g class="pix-portal">
        <rect
          v-for="(p, i) in portalPixels"
          :key="'p' + i"
          :x="p.x"
          :y="p.y"
          width="1"
          height="1"
          :fill="p.fill"
          :opacity="p.opacity ?? 1"
        />
      </g>
    </svg>

    <div class="pix-stage">
      <svg
        class="pix-svg"
        viewBox="0 0 40 40"
        width="100%"
        height="100%"
        shape-rendering="crispEdges"
      >
        <!-- 场景道具（动作触发） -->
        <g v-if="scenePixels.length" class="pix-scene">
          <rect
            v-for="(p, i) in scenePixels"
            :key="'s' + i"
            :x="p.x"
            :y="p.y"
            width="1"
            height="1"
            :fill="p.fill"
            :opacity="p.opacity ?? 1"
          />
        </g>

        <!-- 身后灵气：呼吸光晕 + 漂浮粒子（出现/消失） -->
        <g class="pix-aura" :data-sleep="animState === 'sleep' || mood === 'sleep' ? '1' : '0'">
          <g class="pix-breath">
            <rect
              v-for="(p, i) in breathPixels"
              :key="'br' + i"
              :x="p.x"
              :y="p.y"
              width="1"
              height="1"
              :fill="p.fill"
              :opacity="p.opacity ?? 1"
            />
          </g>
          <g
            v-for="(p, i) in floatParticles"
            :key="'fp' + i"
            class="pix-particle"
            :style="{
              '--p-delay': p.delay,
              '--p-dur': p.dur,
              '--p-rise': p.rise,
              '--p-drift': p.drift,
            }"
          >
            <rect
              v-for="(c, j) in p.cells"
              :key="'c' + j"
              :x="c.x"
              :y="c.y"
              width="1"
              height="1"
              :fill="c.fill"
              :opacity="c.opacity ?? 1"
            />
          </g>
        </g>

        <!-- 光翼：身后能量翼片（左右分层漂浮） -->
        <g class="pix-wings">
          <g class="pix-wing pix-wing--l">
            <rect
              v-for="(p, i) in leftWingPixels"
              :key="'wl' + i"
              :x="p.x"
              :y="p.y"
              width="1"
              height="1"
              :fill="p.fill"
              :opacity="p.opacity ?? 1"
            />
          </g>
          <g class="pix-wing pix-wing--r">
            <rect
              v-for="(p, i) in rightWingPixels"
              :key="'wr' + i"
              :x="p.x"
              :y="p.y"
              width="1"
              height="1"
              :fill="p.fill"
              :opacity="p.opacity ?? 1"
            />
          </g>
        </g>

        <!-- 尾巴 + 狐火 -->
        <g class="pix-tail">
          <rect
            v-for="(p, i) in tailPixels"
            :key="'t' + i"
            :x="p.x"
            :y="p.y"
            width="1"
            height="1"
            :fill="p.fill"
          />
        </g>

        <!-- 身体 -->
        <g class="pix-body">
          <rect
            v-for="(p, i) in bodyPixels"
            :key="'b' + i"
            :x="p.x"
            :y="p.y"
            width="1"
            height="1"
            :fill="p.fill"
          />
        </g>

        <!-- 耳朵（可单独抖） -->
        <g class="pix-ears">
          <rect
            v-for="(p, i) in earPixels"
            :key="'a' + i"
            :x="p.x"
            :y="p.y"
            width="1"
            height="1"
            :fill="p.fill"
          />
        </g>

        <!-- 主题装饰 -->
        <g v-if="decorPixels.length" class="pix-decor">
          <rect
            v-for="(p, i) in decorPixels"
            :key="'d' + i"
            :x="p.x"
            :y="p.y"
            width="1"
            height="1"
            :fill="p.fill"
            :opacity="p.opacity ?? 1"
          />
        </g>

        <!-- 眼睛（视线跟随；眼珠限制在眼白内） -->
        <g class="pix-eyes">
          <rect x="14" y="14" width="3" height="3" fill="#fff8f0" />
          <rect x="23" y="14" width="3" height="3" fill="#fff8f0" />
          <rect
            class="eye-pupil"
            :x="14 + pupil.ox"
            :y="14 + pupil.oy"
            width="1.2"
            height="1.2"
            :fill="visual.accent"
          />
          <rect
            class="eye-pupil"
            :x="23 + pupil.ox"
            :y="14 + pupil.oy"
            width="1.2"
            height="1.2"
            :fill="visual.accent"
          />
          <rect
            :x="14.35 + pupil.ox"
            :y="14.3 + pupil.oy"
            width="0.45"
            height="0.45"
            fill="#ffffff"
            opacity="0.9"
          />
          <rect
            :x="23.35 + pupil.ox"
            :y="14.3 + pupil.oy"
            width="0.45"
            height="0.45"
            fill="#ffffff"
            opacity="0.9"
          />
        </g>

        <!-- 睡眼 -->
        <g v-if="animState === 'sleep' || mood === 'sleep'" class="pix-sleep">
          <rect x="14" y="15" width="3" height="1" fill="#2a2030" />
          <rect x="23" y="15" width="3" height="1" fill="#2a2030" />
        </g>
      </svg>

      <span v-if="animState === 'sleep' || mood === 'sleep'" class="pix-z"
        >z</span
      >
      <i
        v-else-if="
          animState === 'happy' || mood === 'happy' || mood === 'excited'
        "
        class="pix-spark"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import type { PetIdleMotion } from "../../content/motion/motions";
import type { PetMood } from "../../data/types";
import type { PetSkinVisual } from "../../skins";
import type { PetToonDecorId } from "../../skins/looks";
import { resolveToonAnimState } from "../../content/motion/toonAnim";
import { registerPetHitTester } from "@/pet/runtime/petHitBridge";
import { isPetHitHostWindow } from "@/pet/runtime/isPetHitHostWindow";
import { buildToonBreathPixels, buildToonFloatParticles } from "./aura";
import {
  buildToonBodyPixels,
  buildToonEarPixels,
  buildToonTailPixels,
} from "./body";
import { buildToonDecorPixels } from "./decor";
import { buildToonPalette } from "./palette";
import { buildToonPortalPixels } from "./portal";
import { resolveToonPupil } from "./pupil";
import { buildToonScenePixels } from "./scene";
import { buildToonLightWing } from "./wings";
import { buildToonHitMask, testToonHitMask } from "./toonHit";
import "./toonModel.css";

const props = withDefaults(
  defineProps<{
    visual: PetSkinVisual;
    mood: PetMood;
    gaze: { x: number; y: number };
    motion?: PetIdleMotion;
    decor?: PetToonDecorId | null;
    showShadow?: boolean;
    wormholePhase?: "idle" | "out" | "warp" | "in";
  }>(),
  {
    motion: "idle-float",
    decor: null,
    showShadow: true,
    wormholePhase: "idle",
  }
);

const animState = computed(() =>
  resolveToonAnimState(props.motion, props.mood)
);

const pupil = computed(() => resolveToonPupil(props.gaze));

const rootVars = computed(
  () =>
    ({
      "--pix-accent": props.visual.accent,
      "--pix-accent-soft": props.visual.accentSoft,
    }) as Record<string, string>
);

const palette = computed(() => buildToonPalette(props.visual));
const earPixels = computed(() => buildToonEarPixels(palette.value));
const bodyPixels = computed(() => buildToonBodyPixels(palette.value));
const tailPixels = computed(() => buildToonTailPixels(palette.value));
const breathPixels = computed(() =>
  buildToonBreathPixels(props.visual.accent, props.visual.accentSoft)
);
const floatParticles = computed(() =>
  buildToonFloatParticles(props.visual.accent, props.visual.accentSoft)
);
const leftWingPixels = computed(() =>
  buildToonLightWing(
    "l",
    props.visual.accent,
    props.visual.accentSoft,
    props.decor
  )
);
const rightWingPixels = computed(() =>
  buildToonLightWing(
    "r",
    props.visual.accent,
    props.visual.accentSoft,
    props.decor
  )
);
const portalPixels = computed(() =>
  buildToonPortalPixels(props.visual.accent, props.visual.accentSoft)
);
const decorPixels = computed(() =>
  buildToonDecorPixels(props.decor, props.visual.accent, props.visual.accentSoft)
);
const scenePixels = computed(() =>
  buildToonScenePixels(
    animState.value,
    props.visual.accent,
    props.visual.accentSoft
  )
);

const hitMask = computed(() =>
  buildToonHitMask([
    earPixels.value,
    bodyPixels.value,
    tailPixels.value,
    leftWingPixels.value,
    rightWingPixels.value,
    decorPixels.value,
  ])
);

function hitTestNdc(ndcX: number, ndcY: number): boolean {
  return testToonHitMask(hitMask.value, ndcX, ndcY);
}

const hostHit = isPetHitHostWindow();

onMounted(() => {
  if (hostHit) registerPetHitTester(hitTestNdc);
});

onUnmounted(() => {
  if (hostHit) registerPetHitTester(null);
});
</script>
