<template>
  <div
    ref="rootEl"
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
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { PetIdleMotion } from "../../content/motion/motions";
import type { PetMood } from "../../data/types";
import type { PetFigArtId, PetSkinVisual } from "../../skins";
import { registerPetHitTester } from "@/pet/runtime/petHitBridge";
import { isPetHitHostWindow } from "@/pet/runtime/isPetHitHostWindow";
import { loadFigAlphaMap, testFigAlphaHit, type FigAlphaMap } from "./figHit";

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

const rootEl = ref<HTMLElement | null>(null);
const alphaMap = ref<FigAlphaMap | null>(null);
const bodyAspect = ref(2 / 3);
const hostHit = isPetHitHostWindow();
let loadGen = 0;
let ro: ResizeObserver | null = null;

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

function syncBodyAspect() {
  const el = rootEl.value;
  if (!el) return;
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (w > 0 && h > 0) bodyAspect.value = w / h;
}

function hitTestNdc(ndcX: number, ndcY: number): boolean {
  const map = alphaMap.value;
  if (!map) return true;
  return testFigAlphaHit(map, ndcX, ndcY, bodyAspect.value);
}

async function refreshAlpha(src: string) {
  const gen = ++loadGen;
  const map = await loadFigAlphaMap(src);
  if (gen !== loadGen) return;
  alphaMap.value = map;
}

onMounted(() => {
  syncBodyAspect();
  if (typeof ResizeObserver !== "undefined" && rootEl.value) {
    ro = new ResizeObserver(() => syncBodyAspect());
    ro.observe(rootEl.value);
  }
  void refreshAlpha(artSrc.value);
  if (hostHit) registerPetHitTester(hitTestNdc);
});

onUnmounted(() => {
  loadGen += 1;
  ro?.disconnect();
  ro = null;
  if (hostHit) registerPetHitTester(null);
});

watch(artSrc, (src) => {
  void refreshAlpha(src);
});
</script>

<style scoped src="./figSciModel.css"></style>
