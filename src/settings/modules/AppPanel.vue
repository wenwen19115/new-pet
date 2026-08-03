<template>
  <div class="app-panel">
    <ThemeSection :label="$t('pet.secApp')">
      <SettingsItemRow
        :title="$t('pet.chatTitle')"
        :description="$t('pet.chatDesc')"
        tone="pet"
      >
        <ThemeSwitch
          :checked="ctx.chatEnabled.value"
          @update:checked="(v) => ctx.onChatEnabled(v)"
        />
      </SettingsItemRow>
      <SettingsItemRow
        :title="$t('pet.settingsPinTitle')"
        :description="$t('pet.settingsPinDesc')"
        tone="pet"
      >
        <ThemeSwitch
          :checked="ctx.settingsAlwaysOnTop.value"
          @update:checked="(v) => ctx.onSettingsPin(v)"
        />
      </SettingsItemRow>
      <SettingsItemRow
        :title="$t('pet.sysStatsExpandTitle')"
        :description="$t('pet.sysStatsExpandDesc')"
        tone="pet"
      >
        <ThemeSwitch
          :checked="ctx.sysStatsDefaultExpanded.value"
          @update:checked="(v) => ctx.onSysStatsDefaultExpanded(v)"
        />
      </SettingsItemRow>
      <SettingsItemRow
        :title="$t('pet.previewAutoOrbitTitle')"
        :description="
          ctx.canPreviewOrbit.value
            ? $t('pet.previewAutoOrbitDesc')
            : $t('pet.previewAutoOrbit2dHint')
        "
        tone="pet"
      >
        <ThemeSwitch
          :checked="ctx.previewAutoOrbit.value"
          :disabled="!ctx.canPreviewOrbit.value"
          @update:checked="(v) => (ctx.previewAutoOrbit.value = v)"
        />
      </SettingsItemRow>
    </ThemeSection>

    <ThemeSection :label="$t('pet.secTheme')">
      <SettingsItemRow
        :title="$t('pet.themePackTitle')"
        :description="$t('pet.themePackDesc')"
        tone="pet"
      >
        <template #body>
          <ThemePackPicker
            :model-value="ctx.theme.value.style"
            :aria-label="$t('pet.themePackTitle')"
            @update:model-value="(v) => ctx.onThemeStyle(v)"
          />
        </template>
      </SettingsItemRow>
      <SettingsItemRow
        :title="$t('pet.themeStageTitle')"
        :description="$t('pet.themeStageDesc')"
        tone="pet"
      >
        <ThemeSeg
          :model-value="ctx.theme.value.stageBackdrop.mode"
          :options="ctx.themeStageModeOptions.value"
          :aria-label="$t('pet.themeStageTitle')"
          @update:model-value="(v) => ctx.onThemeStageMode(v)"
        />
      </SettingsItemRow>
      <template v-if="ctx.theme.value.stageBackdrop.mode === 'wallpaper'">
        <SettingsItemRow
          :title="$t('pet.themeWallpaperPick')"
          :description="
            ctx.theme.value.stageBackdrop.imagePath || $t('pet.themeMediaHint')
          "
          tone="pet"
        >
          <button type="button" class="theme-btn pri" @click="ctx.onPickThemeWallpaper">
            {{ $t("pet.themeWallpaperPick") }}
          </button>
          <button
            type="button"
            class="theme-btn"
            :disabled="!ctx.theme.value.stageBackdrop.imagePath"
            @click="ctx.onClearThemeWallpaper"
          >
            {{ $t("pet.themeWallpaperClear") }}
          </button>
        </SettingsItemRow>
        <SettingsItemRow
          :title="$t('pet.themeWallpaperDim')"
          :description="$t('pet.themeStageDesc')"
          tone="pet"
        >
          <ThemeMeter
            :value="ctx.theme.value.stageBackdrop.dim"
            :min="0"
            :max="1"
            :step="0.05"
            :aria-label="$t('pet.themeWallpaperDim')"
            @change="ctx.onThemeWallpaperDim"
          >
            {{ Math.round(ctx.theme.value.stageBackdrop.dim * 100) }}%
          </ThemeMeter>
        </SettingsItemRow>
        <SettingsItemRow
          :title="$t('pet.themeWallpaperFit')"
          :description="$t('pet.themeWallpaperFitDesc')"
          tone="pet"
        >
          <ThemeSeg
            :model-value="ctx.theme.value.stageBackdrop.fit"
            :options="ctx.themeWallpaperFitOptions.value"
            @update:model-value="(v) => ctx.onThemeWallpaperFit(v)"
          />
        </SettingsItemRow>
        <SettingsItemRow
          :title="$t('pet.themeMediaMuted')"
          :description="$t('pet.themeMediaMutedDesc')"
          tone="pet"
        >
          <ThemeSwitch
            :checked="ctx.theme.value.stageBackdrop.muted"
            @update:checked="(v) => ctx.onThemeWallpaperMuted(v)"
          />
        </SettingsItemRow>
      </template>

      <SettingsItemRow
        :title="$t('pet.bubbleOpacityTitle')"
        :description="$t('pet.bubbleOpacityDesc')"
        tone="pet"
      >
        <ThemeMeter
          :value="1 - ctx.theme.value.bubbleOpacity"
          :min="0"
          :max="0.8"
          :step="0.05"
          :aria-label="$t('pet.bubbleOpacityTitle')"
          @change="(v) => ctx.onBubbleOpacity(1 - v)"
        >
          {{ Math.round((1 - ctx.theme.value.bubbleOpacity) * 100) }}%
        </ThemeMeter>
      </SettingsItemRow>

      <BootAnimationSettings />
    </ThemeSection>

    <ThemeSection :label="$t('pet.secMaintain')">
      <SettingsItemRow
        :title="$t('pet.clearCacheTitle')"
        :description="$t('pet.clearCacheDesc')"
        tone="pet"
      >
        <button type="button" class="theme-btn" @click="ctx.onClearCache">
          {{ $t("pet.clearCache") }}
        </button>
      </SettingsItemRow>
      <SettingsItemRow
        :title="$t('pet.factoryResetTitle')"
        :description="$t('pet.factoryResetDesc')"
        tone="pet"
      >
        <button type="button" class="theme-btn" @click="ctx.onFactoryReset">
          {{ $t("pet.factoryReset") }}
        </button>
      </SettingsItemRow>
    </ThemeSection>
  </div>
</template>

<script setup lang="ts">
import { inject } from "vue";
import SettingsItemRow from "@/components/SettingsItemRow.vue";
import ThemePackPicker from "@/settings/components/ThemePackPicker.vue";
import ThemeSection from "@/settings/components/ThemeSection.vue";
import ThemeSeg from "@/settings/components/ThemeSeg.vue";
import ThemeSwitch from "@/settings/components/ThemeSwitch.vue";
import ThemeMeter from "@/settings/components/ThemeMeter.vue";
import BootAnimationSettings from "@/settings/modules/BootAnimationSettings.vue";
import { PET_SETTINGS_PAGE_KEY } from "@/settings/context";

const ctx = inject(PET_SETTINGS_PAGE_KEY)!;
</script>

<style scoped>
.app-panel {
  display: contents;
}
</style>
