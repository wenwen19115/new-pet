<template>
  <div class="pet-page">
    <aside class="pet-hero" :data-model="activeLook.model" :style="heroPanelStyle">
      <div class="hero-stage">
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
          :show-bg="true"
          :hint="previewHint"
        />
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
          <a-switch
            v-model:checked="previewAutoOrbit"
            size="small"
            :disabled="!canPreviewOrbit"
          />
          <span>{{ $t("pet.previewAutoOrbit") }}</span>
        </label>
      </div>
    </aside>

    <div class="pet-body">
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

      <section class="pet-list">
        <header class="panel-head">
          <span class="panel-title">{{ activeTabTitle }}</span>
        </header>
        <div class="item-stack" :data-expanded="enabled ? '1' : '0'">
          <component :is="activeModule?.panel" v-if="activeModule" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import PetPreviewOrbit from "@/pet/models/PetPreviewOrbit.vue";
import { usePetSettingsPage } from "@/settings/usePetSettingsPage";
import type { AppUiTheme } from "@/theme/uiTheme";

const emit = defineEmits<{
  "ui-theme-change": [theme: AppUiTheme];
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
  heroPanelStyle,
  personalityLabel,
} = usePetSettingsPage({
  onUiThemeChange: (theme) => emit("ui-theme-change", theme),
});
</script>

<style scoped>
.pet-page {
  display: grid;
  /* Always side-by-side: preview | (nav + panel). Never stack on shrink. */
  grid-template-columns: minmax(200px, 0.78fr) minmax(420px, 1.35fr);
  grid-template-rows: minmax(0, 1fr);
  justify-content: stretch;
  align-content: stretch;
  column-gap: 14px;
  row-gap: 0;
  height: 100%;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
  padding: 14px 16px 14px;
  box-sizing: border-box;
  color: var(--ui-text);
}

.pet-body {
  min-width: 0;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 10px;
}

.pet-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 6px;
  border-radius: 14px;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
  overflow: auto;
}

.pet-nav-item {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--ui-text-muted);
  border-radius: 10px;
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
}

.pet-nav-item:hover {
  background: var(--ui-accent-soft);
  color: var(--ui-text);
}

.pet-nav-item[data-active="1"] {
  background: var(--ui-accent-soft);
  color: var(--ui-primary);
}

.pet-nav-icon {
  font-size: 16px;
}

.preview-orbit-toggle {
  margin-top: 8px;
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.35;
  color: var(--ui-text-muted);
  max-width: 100%;
  cursor: pointer;
}

.preview-orbit-toggle.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
  color: var(--ui-text-faint);
}

.preview-orbit-toggle :deep(.ant-switch) {
  flex-shrink: 0;
  margin-top: 1px;
}

.preview-orbit-toggle span {
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
}

.pet-hero {
  min-width: 0;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--hero-accent, #00e5ff) 28%, rgba(255, 255, 255, 0.06));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 12px 40px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}

.hero-stage {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0, 0, 0, 0.12);
}

.pet-hero[data-model="chip"] .hero-stage {
  /* ????????????????????*/
  overflow: hidden;
}

.pet-hero[data-model="fig-sci"] .hero-tagline {
  -webkit-line-clamp: 1;
}

.pet-hero[data-model="fig-sci"] {
  gap: 8px;
}

.pet-list {
  min-width: 0;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--ui-surface-strong) 80%, transparent), transparent 48px),
    var(--ui-surface, rgba(0, 0, 0, 0.22));
  border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.08));
  border-radius: 18px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.hero-text {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
}

.hero-role {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: color-mix(in srgb, var(--hero-accent, #00e5ff) 70%, rgba(255, 255, 255, 0.45));
}

.hero-name {
  margin: 0;
  font-size: clamp(22px, 2.6vw, 32px);
  font-weight: 650;
  color: var(--ui-text, rgba(255, 255, 255, 0.96));
  letter-spacing: 0.02em;
  line-height: 1.15;
}

.hero-tagline {
  margin: 0;
  font-size: 13px;
  color: var(--ui-text-muted, rgba(255, 255, 255, 0.5));
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--ui-text-muted, rgba(255, 255, 255, 0.72));
  border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.1));
  background: var(--ui-surface, rgba(255, 255, 255, 0.04));
}

.meta-pill--on {
  color: color-mix(in srgb, var(--hero-accent, #00e5ff) 85%, #fff);
  border-color: color-mix(in srgb, var(--hero-accent, #00e5ff) 35%, transparent);
  background: color-mix(in srgb, var(--hero-accent, #00e5ff) 12%, transparent);
}

.theme-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ui-border, rgba(255, 255, 255, 0.06));
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ui-text-muted, rgba(255, 255, 255, 0.72));
}

.item-stack {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  padding: 12px 14px 14px;
  overflow: auto;
  min-height: 0;
  flex: 1 1 0;
  align-content: start;
  width: 100%;
  max-width: none;
  margin-inline: 0;
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: var(--ui-scroll-thumb, rgba(64, 196, 255, 0.35))
    var(--ui-scroll-track, rgba(255, 255, 255, 0.06));
}

.item-stack::-webkit-scrollbar {
  width: 8px;
}

.item-stack::-webkit-scrollbar-track {
  background: var(--ui-scroll-track, rgba(255, 255, 255, 0.04));
  border-radius: 8px;
}

.item-stack::-webkit-scrollbar-thumb {
  background: var(--ui-scroll-thumb, rgba(64, 196, 255, 0.28));
  border-radius: 8px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.item-stack::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--ui-primary, #40c4ff) 55%, transparent);
  background-clip: padding-box;
}

.item-stack::-webkit-scrollbar-button {
  display: none;
  height: 0;
  width: 0;
}

.item-stack[data-expanded="1"] {
  grid-template-columns: 1fr;
}

.item-stack :deep(.span-2) {
  grid-column: 1 / -1;
}

.item-stack :deep(.settings-item) {
  border-radius: 12px;
  border-color: rgba(255, 255, 255, 0.07);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(0, 0, 0, 0.18));
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px 12px;
  padding: 12px 14px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.item-stack :deep(.item-main) {
  flex: 1 1 auto;
  min-width: 0;
}

.item-stack :deep(.item-text) {
  min-width: 0;
  overflow: hidden;
}

.item-stack :deep(.item-title),
.item-stack :deep(.item-desc) {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.item-stack :deep(.item-actions) {
  flex: 0 0 auto;
  flex-shrink: 0;
  min-width: 0;
  max-width: none;
  width: auto;
  justify-content: flex-end;
  flex-wrap: nowrap;
  margin-left: auto;
}

.item-stack :deep(.form-row.settings-item) {
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}

.item-stack :deep(.form-row .item-actions) {
  max-width: 100%;
  width: 100%;
  flex-shrink: 1;
  justify-content: stretch;
}

/* Shrink: keep side-by-side; never hide labels; keep switches on the right */
@media (max-width: 1100px) {
  .pet-page {
    grid-template-columns: minmax(190px, 0.72fr) minmax(420px, 1.4fr);
    column-gap: 10px;
    padding: 10px 12px;
  }

  .pet-body {
    grid-template-columns: 88px minmax(0, 1fr);
    gap: 8px;
  }

  .pet-nav-item {
    padding: 8px 4px;
    font-size: 11px;
  }

  .hero-tagline {
    -webkit-line-clamp: 2;
  }

  .item-stack :deep(.settings-item) {
    flex-wrap: nowrap;
  }

  .item-stack :deep(.item-actions) {
    flex: 0 0 auto;
    width: auto;
    max-width: none;
    justify-content: flex-end;
  }
}

@media (max-width: 980px) {
  .pet-page {
    grid-template-columns: minmax(180px, 0.68fr) minmax(400px, 1.45fr);
    column-gap: 8px;
    padding: 8px 10px;
  }

  .pet-body {
    grid-template-columns: 84px minmax(0, 1fr);
  }

  .pet-nav-item {
    padding: 8px 2px;
    font-size: 10px;
    gap: 4px;
  }

  .item-stack :deep(.settings-item) {
    flex-wrap: nowrap;
    padding: 10px 12px;
  }

  .item-stack :deep(.item-desc) {
    -webkit-line-clamp: 2;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .item-stack :deep(.item-actions) {
    flex: 0 0 auto;
    width: auto;
    max-width: none;
    justify-content: flex-end;
    margin-left: auto;
  }

  .item-stack :deep(.form-row .item-actions) {
    width: 100%;
    max-width: 100%;
    justify-content: stretch;
  }
}
</style>
