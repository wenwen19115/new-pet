<template>
  <div
    class="orbit-stage"
    :data-model="model"
    :data-bg="showBg ? '1' : '0'"
    :style="stageStyle"
    @wheel.prevent="onWheel"
  >
    <div class="stage-lights" v-if="showBg" aria-hidden="true">
      <i class="light-spot light-spot--key" />
      <i class="light-spot light-spot--rim" />
      <i class="light-spot light-spot--fill" />
      <i class="light-haze" />
      <i class="light-vignette" />
    </div>

    <template v-if="character.view.previewPad === 'orbit'">
      <div
        class="orbit-pad"
        :data-bg="showBg ? '1' : '0'"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
        @dblclick="resetOrbit"
      >
        <div class="orbit-floor" />
        <div class="orbit-scene">
          <div class="orbit-zoom" :style="zoomStyle">
            <div class="orbit-rig" :style="rigStyle">
              <component :is="character.view.Model" v-bind="previewModelProps" />
            </div>
          </div>
        </div>
        <p v-if="hint" class="orbit-hint">{{ hint }}</p>
      </div>
    </template>

    <template v-else-if="character.view.previewPad === 'vrm'">
      <div
        v-if="vrmSrc"
        class="orbit-pad vrm-orbit"
        :data-bg="showBg ? '1' : '0'"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
        @dblclick="resetOrbit"
      >
        <div class="orbit-floor" />
        <div class="vrm-orbit-stage">
          <div class="vrm-orbit-zoom" :style="figZoomStyle">
            <component :is="character.view.Model" v-bind="previewModelProps" />
          </div>
        </div>
        <p v-if="hint" class="orbit-hint">{{ hint }}</p>
      </div>
      <div v-else class="vrm-empty">
        <p v-if="hint" class="orbit-hint">{{ hint }}</p>
      </div>
    </template>

    <div
      v-else
      class="fig-pad"
      :class="character.view.previewPadClass"
      :data-bg="showBg ? '1' : '0'"
    >
      <div class="fig-floor" />
      <div class="fig-stage">
        <div class="fig-zoom" :style="figZoomStyle">
          <component :is="character.view.Model" v-bind="previewModelProps" />
        </div>
      </div>
      <p v-if="hint" class="orbit-hint">{{ hint }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CustomVrmMotion } from "@/pet/content/motion/customVrmMotions";
import type { PetFigArtId, PetModelKind, PetSkinVisual } from "@/pet/skins";
import type { PetMood } from "@/pet/data/types";
import type { PetToonDecorId } from "@/pet/skins/looks";
import { usePreviewOrbit } from "./usePreviewOrbit";
import "./previewOrbit.css";

const props = withDefaults(
  defineProps<{
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
  }>(),
  {
    mood: "idle",
    hint: "",
    figArtId: null,
    toonDecor: null,
    vrmSrc: null,
    showBg: true,
    motionOverride: null,
    customMotions: () => [],
    autoOrbit: false,
    autoIdleClips: true,
  }
);

const {
  character,
  stageStyle,
  previewModelProps,
  zoomStyle,
  rigStyle,
  figZoomStyle,
  onWheel,
  onDown,
  onMove,
  onUp,
  resetOrbit,
} = usePreviewOrbit(props);
</script>
