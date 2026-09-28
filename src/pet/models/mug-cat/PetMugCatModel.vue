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

const sheet = computed(() => atlasDefault);
const manifest = raw as PetSpriteManifest;
</script>
