<template>
  <div
    class="fig-root"
    :data-mood="mood"
    :data-motion="motion"
    :data-fig-art="figArtKey"
    :style="rootVars"
    aria-hidden="true"
  >
    <i v-if="showShadow" class="fig-shadow" />
    <div class="fig-bob">
      <img class="fig-art" :src="artSrc" alt="" draggable="false" />
      <span v-if="mood === 'sleep'" class="fig-zzz">z</span>
      <i
        v-else-if="mood === 'happy' || mood === 'excited'"
        class="fig-spark"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { PetIdleMotion } from "../../content/motion/motions";
import type { PetMood } from "../../data/types";
import type { PetFigArtId, PetSkinVisual } from "../../skins";

import artCool from "../../assets/fig/cool.png";
import artSunny from "../../assets/fig/sunny.png";
import artShy from "../../assets/fig/shy.png";
import artFiery from "../../assets/fig/fiery.png";
import artValentine from "../../assets/fig/valentine.png";
import artSpring from "../../assets/fig/spring.png";
import artMidautumn from "../../assets/fig/midautumn.png";
import artLabor from "../../assets/fig/labor.png";

const ART_BY_FIG_THEME: Record<PetFigArtId, string> = {
  sunny: artSunny,
  shy: artShy,
  cool: artCool,
  fiery: artFiery,
  valentine: artValentine,
  spring: artSpring,
  midautumn: artMidautumn,
  labor: artLabor,
};

const props = withDefaults(
  defineProps<{
    visual: PetSkinVisual;
    mood: PetMood;
    gaze: { x: number; y: number };
    motion?: PetIdleMotion;
    figArtId?: PetFigArtId | null;
    showShadow?: boolean;
  }>(),
  {
    motion: "idle-float",
    figArtId: "sunny",
    showShadow: true,
  }
);

const figArtKey = computed(() => props.figArtId || "sunny");
const artSrc = computed(
  () => ART_BY_FIG_THEME[figArtKey.value] ?? artSunny
);

const rootVars = computed(
  () =>
    ({
      "--fig-accent": props.visual.accent,
      "--fig-accent-soft": props.visual.accentSoft,
      "--fig-gaze-x": `${props.gaze.x * 0.35}px`,
      "--fig-gaze-y": `${props.gaze.y * 0.25}px`,
    }) as Record<string, string>
);
</script>

<style scoped src="./figSciModel.css"></style>
