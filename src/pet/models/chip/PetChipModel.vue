<template>
  <div class="chip-slab" aria-hidden="true">
    <div class="chip-face chip-face--back">
      <div class="chip-back-inner">
        <span class="chip-back-mark">{{ visual.mark }}</span>
        <span class="chip-back-grid" />
      </div>
    </div>
    <div class="chip-face chip-face--left">
      <span
        v-for="n in 4"
        :key="'L' + n"
        class="side-led"
        :style="sideLedStyle(9 + n)"
      />
    </div>
    <div class="chip-face chip-face--right">
      <span
        v-for="n in 4"
        :key="'R' + n"
        class="side-led"
        :style="sideLedStyle(2 + n)"
      />
    </div>
    <div class="chip-face chip-face--top" />
    <div class="chip-face chip-face--bottom" />
    <div class="chip-face chip-face--front">
      <svg class="chip-svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient :id="gid.body" x1="0.15" y1="0" x2="0.9" y2="1">
            <stop offset="0%" :stop-color="visual.bodyFrom" />
            <stop offset="45%" :stop-color="visual.bodyMid" />
            <stop offset="100%" :stop-color="visual.bodyTo" />
          </linearGradient>
          <linearGradient :id="gid.die" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" :stop-color="visual.dieFrom" />
            <stop offset="50%" :stop-color="visual.dieMid" />
            <stop offset="100%" :stop-color="visual.dieTo" />
          </linearGradient>
          <linearGradient :id="gid.metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#d5dde8" />
            <stop offset="55%" stop-color="#8b97a8" />
            <stop offset="100%" stop-color="#5c6778" />
          </linearGradient>
          <linearGradient :id="gid.edge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" :stop-color="visual.accent" stop-opacity="0" />
            <stop offset="50%" :stop-color="visual.accent" stop-opacity="0.7" />
            <stop offset="100%" :stop-color="visual.accent" stop-opacity="0" />
          </linearGradient>
          <radialGradient
            v-for="(c, i) in pinColors"
            :id="`${gid.led}-${i}`"
            :key="`${gid.led}-${i}`"
            cx="32%"
            cy="28%"
            r="78%"
          >
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
            <stop offset="38%" :stop-color="c" />
            <stop offset="100%" :stop-color="c" stop-opacity="0.72" />
          </radialGradient>
        </defs>

        <rect
          x="18"
          y="18"
          width="64"
          height="64"
          rx="6"
          :fill="`url(#${gid.body})`"
          :stroke="visual.packageStroke"
          stroke-width="1.2"
        />
        <rect
          x="28"
          y="28"
          width="44"
          height="44"
          rx="3"
          :fill="`url(#${gid.die})`"
          :stroke="visual.dieStroke"
          stroke-width="0.8"
        />
        <g :stroke="visual.accent" stroke-width="0.7" fill="none" opacity="0.35">
          <path d="M32 36 H48 V44 H40" />
          <path d="M68 36 H55 V50 H62" />
          <path d="M34 62 H46 V54" />
          <path d="M66 64 H52 V58 H58" />
        </g>
        <g :fill="visual.accent" opacity="0.45">
          <rect x="31" y="35" width="2.2" height="2.2" rx="0.3" />
          <rect x="46" y="43" width="2.2" height="2.2" rx="0.3" />
          <rect x="60" y="49" width="2.2" height="2.2" rx="0.3" />
          <rect x="44" y="53" width="2.2" height="2.2" rx="0.3" />
          <rect x="56" y="57" width="2.2" height="2.2" rx="0.3" />
        </g>
        <rect
          x="28"
          y="28"
          width="44"
          height="44"
          rx="3"
          fill="none"
          :stroke="`url(#${gid.edge})`"
          stroke-width="0.6"
          opacity="0.55"
        />
        <text class="mark" x="50" y="39" text-anchor="middle">{{ visual.mark }}</text>

        <g class="pins">
          <g v-for="pin in pins" :key="pin.id">
            <rect
              :x="pin.x"
              :y="pin.y"
              :width="pin.w"
              :height="pin.h"
              rx="1.2"
              :fill="`url(#${gid.metal})`"
            />
            <rect
              :x="pin.tipX"
              :y="pin.tipY"
              :width="pin.tipW"
              :height="pin.tipH"
              rx="0.8"
              :fill="`url(#${gid.led}-${pin.index})`"
            />
          </g>
        </g>

        <g class="face">
          <template v-if="mood === 'idle' || mood === 'happy' || mood === 'excited'">
            <rect
              class="sensor"
              x="35"
              :y="blinking ? 47.5 : 44"
              width="10"
              :height="blinking ? 1.5 : 8"
              rx="1.5"
            />
            <rect
              class="sensor"
              x="55"
              :y="blinking ? 47.5 : 44"
              width="10"
              :height="blinking ? 1.5 : 8"
              rx="1.5"
            />
            <template v-if="!blinking">
              <rect
                class="pupil"
                :x="37.2 + gaze.x"
                :y="45.8 + gaze.y"
                width="5.2"
                height="4.4"
                rx="0.8"
              />
              <rect
                class="pupil"
                :x="57.2 + gaze.x"
                :y="45.8 + gaze.y"
                width="5.2"
                height="4.4"
                rx="0.8"
              />
              <rect
                class="spark"
                :x="37.6 + gaze.x * 0.6"
                :y="46.1 + gaze.y * 0.6"
                width="1.6"
                height="1.2"
                rx="0.3"
              />
              <rect
                class="spark"
                :x="57.6 + gaze.x * 0.6"
                :y="46.1 + gaze.y * 0.6"
                width="1.6"
                height="1.2"
                rx="0.3"
              />
            </template>
            <path v-if="mood === 'excited'" class="mouth" d="M40 60 H60" stroke-width="2.6" />
            <path v-else-if="mood === 'happy'" class="mouth" d="M42 59 H58" />
            <path v-else class="mouth soft" d="M44 60 H56" />
          </template>

          <template v-else-if="mood === 'curious'">
            <rect
              class="sensor"
              x="34"
              :y="blinking ? 47 : 43"
              width="11"
              :height="blinking ? 1.5 : 9"
              rx="1.5"
            />
            <rect
              class="sensor"
              x="55"
              :y="blinking ? 47 : 43"
              width="11"
              :height="blinking ? 1.5 : 9"
              rx="1.5"
            />
            <template v-if="!blinking">
              <rect
                class="pupil"
                :x="36.5 + gaze.x"
                :y="45 + gaze.y"
                width="6"
                height="5"
                rx="0.8"
              />
              <rect
                class="pupil"
                :x="57.5 + gaze.x"
                :y="45 + gaze.y"
                width="6"
                height="5"
                rx="0.8"
              />
            </template>
            <rect class="mouth-box" x="47" y="59" width="6" height="5" rx="1" />
          </template>

          <template v-else-if="mood === 'grumpy'">
            <path class="brow" d="M34 43 L46 46" />
            <path class="brow" d="M66 43 L54 46" />
            <rect
              class="sensor"
              x="35"
              :y="blinking ? 48.5 : 46"
              width="10"
              :height="blinking ? 1.2 : 6"
              rx="1.2"
            />
            <rect
              class="sensor"
              x="55"
              :y="blinking ? 48.5 : 46"
              width="10"
              :height="blinking ? 1.2 : 6"
              rx="1.2"
            />
            <template v-if="!blinking">
              <rect
                class="pupil"
                :x="37.5 + gaze.x * 0.8"
                :y="47.2 + gaze.y * 0.8"
                width="4.5"
                height="3.5"
                rx="0.6"
              />
              <rect
                class="pupil"
                :x="57.5 + gaze.x * 0.8"
                :y="47.2 + gaze.y * 0.8"
                width="4.5"
                height="3.5"
                rx="0.6"
              />
            </template>
            <path class="mouth" d="M42 62 H58" />
          </template>

          <template v-else>
            <path class="sleep-eye" d="M35 50 H45" />
            <path class="sleep-eye" d="M55 50 H65" />
            <text class="zzz" x="72" y="34">z</text>
          </template>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { PetMood } from "../../data/types";
import type { PetSkinVisual } from "../../skins/types";
import { CHIP_PINS, chipSideLedStyle } from "./chipPins";

const props = defineProps<{
  visual: PetSkinVisual;
  mood: PetMood;
  blinking: boolean;
  gaze: { x: number; y: number };
  pinColors: string[];
}>();

const uid = Math.random().toString(36).slice(2, 8);
const gid = computed(() => ({
  body: `chip-body-${uid}`,
  die: `chip-die-${uid}`,
  metal: `chip-metal-${uid}`,
  edge: `chip-edge-${uid}`,
  led: `chip-led-${uid}`,
}));

const pins = CHIP_PINS;

function sideLedStyle(index: number) {
  return chipSideLedStyle(props.pinColors, index);
}
</script>

<style scoped src="./chipModel.css"></style>
