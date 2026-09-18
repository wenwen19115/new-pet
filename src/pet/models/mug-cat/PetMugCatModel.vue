<template>
  <PetSpriteModel
    :src="sheet"
    :manifest="manifest"
    :visual="visual"
    :mood="mood"
    :gaze="gaze"
    :motion="motion"
    :show-shadow="showShadow"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { PetIdleMotion } from "../../content/motion/motions";
import type { PetMood } from "../../data/types";
import type { PetSkinVisual } from "../../skins";
import { PetSpriteModel } from "../sprite";
import type { PetSpriteManifest } from "../sprite";
import atlasDefault from "../../assets/pets/mug-cat/atlas-default.png";
import atlasMatcha from "../../assets/pets/mug-cat/atlas-matcha.png";
import atlasThermos from "../../assets/pets/mug-cat/atlas-thermos.png";
import raw from "../../assets/pets/mug-cat/pet.json";

const props = withDefaults(
  defineProps<{
    visual: PetSkinVisual;
    mood: PetMood;
    gaze: { x: number; y: number };
    motion?: PetIdleMotion;
    showShadow?: boolean;
    lookId?: string | null;
  }>(),
  { motion: "idle-float", showShadow: true, lookId: "mug-default" }
);

const ATLAS: Record<string, string> = {
  "mug-default": atlasDefault,
  "mug-matcha": atlasMatcha,
  "mug-thermos": atlasThermos,
};

const sheet = computed(
  () => ATLAS[props.lookId || "mug-default"] ?? atlasDefault
);
const manifest = raw as PetSpriteManifest;
</script>
