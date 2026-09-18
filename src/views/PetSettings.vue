<template>
  <div class="pet-page">
    <aside
      class="pet-hero"
      :data-model="activeLook.model"
      :style="heroMergedStyle"
    >
      <div class="hero-stage" :data-syncing="skyNetBusy ? '1' : '0'">
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
              :look-id="activeLook.lookId"
              :toon-decor="activeLook.toonDecor"
              :vrm-src="vrmSrc"
              :custom-motions="previewCustomMotions"
              :motion-override="previewMotionOverride"
              :auto-orbit="effectivePreviewAutoOrbit"
              :auto-idle-clips="previewAutoIdleClips"
              :show-bg="false"
            />
          </template>
        </HeroWindowWorld>
        <div
          v-if="skyNetBusy"
          class="hero-sync-top"
          aria-live="polite"
        >
          <span class="hero-net-badge" data-busy="1" data-online="0">
            {{ $t("pet.skyWeatherUpdating") }}
          </span>
        </div>
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
        <div class="hero-net" aria-live="polite">
          <!-- 始终显示：仅反映联网探测；刷新再探测。≠ 窗景「天气系统」在线/离线 -->
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
            :disabled="skyNetRefreshDisabled"
            :aria-busy="skyNetBusy ? 'true' : 'false'"
            @click="refreshSkyNet"
          >
            {{ $t("pet.skyWeatherLinkRefresh") }}
          </button>
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
import { usePetSettingsPage } from "@/settings/usePetSettingsPage";
import type { PetThemeSettings } from "@/theme/types";

const emit = defineEmits<{
  "theme-change": [theme: PetThemeSettings];
}>();

const {
  enabled,
  tone,
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
  previewCustomMotions,
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
  skyNetRefreshDisabled,
  refreshSkyNet,
  windowFamily,
  previewActor,
  clipPreviewActor,
} = usePetSettingsPage({
  onThemeChange: (theme) => emit("theme-change", theme),
});
</script>

<style scoped src="./styles/petSettings.css"></style>
