<template>
  <div class="pet-page">
    <aside
      class="pet-hero"
      :data-model="activeLook.model"
      :style="heroMergedStyle"
    >
      <div class="hero-stage">
        <HeroWindowWorld
          :tod="skyDisplayTod"
          :weather="skyDisplayWeather"
          :family="windowFamily"
          :follow-clock="skyFollowClock"
          :rainbow="skyRainbow"
          :events="skyEvents"
          :preview-actor="previewActor"
          :clip-actor="clipPreviewActor"
        >
          <template #actor>
            <PetPreviewOrbit
              :key="`${activeLook.id}-${vrmModelRev}`"
              :model="activeLook.model"
              :visual="v"
              :mood="tone === 'snarky' ? 'grumpy' : 'idle'"
              :fig-art-id="activeLook.figArtId"
              :toon-decor="activeLook.toonDecor"
              :vrm-src="vrmSrc"
              :custom-motions="customVrmMotions"
              :motion-override="previewMotionOverride"
              :auto-orbit="effectivePreviewAutoOrbit"
              :auto-idle-clips="previewAutoIdleClips"
              :show-bg="false"
            />
          </template>
        </HeroWindowWorld>
        <p v-if="previewHint" class="hero-orbit-hint">{{ previewHint }}</p>
      </div>
      <div class="hero-text">
        <p class="hero-role">{{ $t(activeLook.modelNameKey) }}</p>
        <h1 class="hero-name">{{ displayName || $t(activeLook.modelNameKey) }}</h1>
        <p class="hero-tagline">{{ $t("pet.pageTagline") }}</p>
        <div class="hero-meta">
          <span class="meta-pill meta-pill--theme">
            <i class="theme-dot" :style="{ background: v.accent }" />
            {{ $t(activeLook.nameKey) }}
          </span>
          <span class="meta-pill">{{ personalityLabel }}</span>
          <span v-if="enabled" class="meta-pill meta-pill--on">{{ $t("pet.statusOn") }}</span>
          <span v-else class="meta-pill">{{ $t("pet.statusOff") }}</span>
        </div>
        <label
          class="preview-orbit-toggle"
          :class="{ 'is-disabled': !canPreviewOrbit }"
          :title="canPreviewOrbit ? undefined : $t('pet.previewAutoOrbit2dHint')"
        >
          <ThemeSwitch v-model:checked="previewAutoOrbit" :disabled="!canPreviewOrbit" />
          <span>{{ $t("pet.previewAutoOrbit") }}</span>
        </label>
      </div>
    </aside>

    <div class="pet-settings-col">
      <div class="theme-shell pet-body">
        <div class="theme-banner">{{ themeBanner }}</div>
        <nav class="pet-nav" :aria-label="$t('pet.settingsNav')">
          <button
            v-for="tab in settingsTabs"
            :key="tab.id"
            type="button"
            class="pet-nav-item"
            :data-active="settingsTab === tab.id ? '1' : '0'"
            @click="onSettingsTab(tab.id)"
          >
            <component :is="tab.icon" class="pet-nav-icon" />
            <span>{{ tab.label }}</span>
          </button>
        </nav>

        <section class="pet-main">
          <header class="panel-head">
            <span class="panel-title">{{ activeTabTitle }}</span>
            <div class="theme-chip">
              {{ $t("pet.themeChipCurrent") }}<em>{{ displayName || $t(activeLook.modelNameKey) }}</em>
            </div>
          </header>
          <div class="item-stack" :data-expanded="enabled ? '1' : '0'">
            <component :is="activeModule?.panel" v-if="activeModule" />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PetPreviewOrbit from "@/pet/models/preview/PetPreviewOrbit.vue";
import HeroWindowWorld from "@/pet/models/preview/HeroWindowWorld.vue";
import ThemeSwitch from "@/settings/components/ThemeSwitch.vue";
import { usePetSettingsPage } from "@/settings/usePetSettingsPage";
import type { PetThemeSettings } from "@/theme/types";

const emit = defineEmits<{
  "theme-change": [theme: PetThemeSettings];
}>();

const {
  enabled,
  tone,
  previewAutoOrbit,
  canPreviewOrbit,
  effectivePreviewAutoOrbit,
  settingsTab,
  settingsTabs,
  activeModule,
  activeTabTitle,
  onSettingsTab,
  activeLook,
  v,
  vrmModelRev,
  vrmSrc,
  customVrmMotions,
  previewMotionOverride,
  previewAutoIdleClips,
  previewHint,
  displayName,
  personalityLabel,
  themeBanner,
  heroMergedStyle,
  skyDisplayTod,
  skyDisplayWeather,
  skyRainbow,
  skyEvents,
  skyFollowClock,
  windowFamily,
  previewActor,
  clipPreviewActor,
} = usePetSettingsPage({
  onThemeChange: (theme) => emit("theme-change", theme),
});
</script>

<style scoped src="./styles/petSettings.css"></style>
