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
        <div class="hero-text-main">
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
          <div class="hero-net" aria-live="polite">
            <!-- busy 只挂徽章：文案变「同步中」+ 点脉冲；刷新钮仅 aria/disabled -->
            <span
              class="hero-net-badge"
              :data-online="skyNetBadgeOnline ? '1' : '0'"
              :data-busy="skyNetBusy ? '1' : '0'"
            >
              {{ skyNetLabel }}
            </span>
            <button
              type="button"
              class="hero-net-refresh"
              :disabled="skyNetBusy"
              :aria-busy="skyNetBusy ? 'true' : 'false'"
              @click="refreshSkyNet"
            >
              {{ $t("pet.skyWeatherLinkRefresh") }}
            </button>
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
        <div class="hero-sky-pet">
          <button
            type="button"
            class="hero-sky-pet-chip"
            :data-on="skyEnableOnPet ? '1' : '0'"
            :aria-pressed="skyEnableOnPet"
            :aria-label="$t('pet.skyWeatherOnPet')"
            @click="onSkyEnableOnPet(!skyEnableOnPet)"
          >
            <span class="hero-sky-pet-chip-head">
              <span class="hero-sky-pet-led" aria-hidden="true" />
              <span class="hero-sky-pet-chip-title">{{ $t("pet.skyWeatherOnPet") }}</span>
              <span class="hero-sky-pet-chip-state">{{
                skyEnableOnPet
                  ? $t("pet.skyWeatherOnPetOn")
                  : $t("pet.skyWeatherOnPetOff")
              }}</span>
            </span>
            <span class="hero-sky-pet-chip-desc">{{
              skyEnableOnPet
                ? $t("pet.skyWeatherOnPetHintOn")
                : $t("pet.skyWeatherOnPetHintOff")
            }}</span>
          </button>
          <div v-if="skyEnableOnPet" class="hero-sky-pet-opacity">
            <span class="hero-sky-pet-opacity-label">{{
              $t("pet.skyWeatherBgOpacityShort")
            }}</span>
            <ThemeMeter
              :value="skyBgOpacityPercent"
              :min="0"
              :max="100"
              :step="5"
              :title="$t('pet.dblClickReset')"
              :aria-label="$t('pet.skyWeatherBgOpacity')"
              @change="onSkyBgOpacity"
              @dblclick="resetSkyBgOpacity"
            >
              {{ skyBgOpacityPercent }}%
            </ThemeMeter>
          </div>
        </div>
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
import ThemeMeter from "@/settings/components/ThemeMeter.vue";
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
  skyNetBusy,
  skyNetLabel,
  skyNetBadgeOnline,
  refreshSkyNet,
  skyEnableOnPet,
  skyBgOpacityPercent,
  onSkyEnableOnPet,
  onSkyBgOpacity,
  resetSkyBgOpacity,
  windowFamily,
  previewActor,
  clipPreviewActor,
} = usePetSettingsPage({
  onThemeChange: (theme) => emit("theme-change", theme),
});
</script>

<style scoped src="./styles/petSettings.css"></style>
