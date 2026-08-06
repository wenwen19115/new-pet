<template>
  <div class="sky-pet-backdrop-panel">
    <ThemeSection :label="$t('pet.secSkyPetBackdrop')">
      <SettingsItemRow
        :title="$t('pet.skyWeatherOnPet')"
        :description="$t('pet.skyWeatherOnPetDesc')"
        tone="pet"
      >
        <ThemeSwitch
          :checked="enableOnPet"
          :aria-label="$t('pet.skyWeatherOnPet')"
          @update:checked="onEnable"
        />
      </SettingsItemRow>

      <SettingsItemRow
        :title="$t('pet.skyWeatherBgOpacity')"
        :description="$t('pet.skyWeatherBgOpacityDesc')"
        tone="pet"
      >
        <ThemeMeter
          :value="bgOpacityPercent"
          :min="0"
          :max="100"
          :step="5"
          :title="$t('pet.dblClickReset')"
          :aria-label="$t('pet.skyWeatherBgOpacity')"
          @change="onBgOpacity"
          @dblclick="resetBgOpacity"
        >
          {{ bgOpacityPercent }}%
        </ThemeMeter>
      </SettingsItemRow>

      <SettingsItemRow
        :title="$t('pet.skyPetHideable')"
        :description="$t('pet.skyPetHideableDesc')"
        tone="pet"
      >
        <ThemeSeg
          :model-value="hideableOnPet ? 'yes' : 'no'"
          :options="hideableOptions"
          :aria-label="$t('pet.skyPetHideable')"
          @update:model-value="onHideable"
        />
      </SettingsItemRow>

      <SettingsItemRow
        :title="$t('pet.skyPetHideEffect')"
        :description="$t('pet.skyPetHideEffectDesc')"
        tone="pet"
        :class="{ 'is-disabled': !hideableOnPet }"
      >
        <template #body>
          <ThemeChoices
            :model-value="hideEffectOnPet"
            :options="hideEffectOptions"
            :aria-label="$t('pet.skyPetHideEffect')"
            @update:model-value="onHideEffect"
          />
          <p class="sky-pet-effect-hint">{{ hideEffectHint }}</p>
        </template>
      </SettingsItemRow>
    </ThemeSection>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { useI18n } from "vue-i18n";
import ThemeSection from "@/settings/components/ThemeSection.vue";
import ThemeSwitch from "@/settings/components/ThemeSwitch.vue";
import ThemeMeter from "@/settings/components/ThemeMeter.vue";
import ThemeSeg from "@/settings/components/ThemeSeg.vue";
import ThemeChoices from "@/settings/components/ThemeChoices.vue";
import SettingsItemRow from "@/components/SettingsItemRow.vue";
import { PET_SETTINGS_PAGE_KEY } from "@/settings/context";
import {
  normalizeSkyWeather,
  normalizeSkyPetHideEffect,
  SKY_PET_HIDE_EFFECTS,
  type SkyPetHideEffect,
} from "@/pet/data/skyWeather";

const { t } = useI18n();
const ctx = inject(PET_SETTINGS_PAGE_KEY)!;

const cfg = computed(() => normalizeSkyWeather(ctx.skyWeather.value));
const enableOnPet = computed(() => cfg.value.enableOnPet);
const bgOpacityPercent = ctx.skyBgOpacityPercent;
const hideableOnPet = computed(() => cfg.value.hideableOnPet);
const hideEffectOnPet = computed(() => cfg.value.hideEffectOnPet);

const hideableOptions = computed(() => [
  { value: "yes", label: t("pet.skyPetHideableYes") },
  { value: "no", label: t("pet.skyPetHideableNo") },
]);

const HIDE_EFFECT_LABEL: Record<SkyPetHideEffect, string> = {
  vortexHalo: "pet.skyPetHideEffectVortex",
  fade: "pet.skyPetHideEffectFade",
  suckPoint: "pet.skyPetHideEffectSuck",
  shutter: "pet.skyPetHideEffectShutter",
};

const hideEffectOptions = computed(() =>
  SKY_PET_HIDE_EFFECTS.map((value) => ({
    value,
    label: t(HIDE_EFFECT_LABEL[value]),
  }))
);

const hideEffectHint = computed(() => {
  const key =
    hideEffectOnPet.value === "fade"
      ? "pet.skyPetHideEffectFadeHint"
      : hideEffectOnPet.value === "suckPoint"
        ? "pet.skyPetHideEffectSuckHint"
        : hideEffectOnPet.value === "shutter"
          ? "pet.skyPetHideEffectShutterHint"
          : "pet.skyPetHideEffectVortexHint";
  return t(key);
});

function patch(partial: Partial<ReturnType<typeof normalizeSkyWeather>>) {
  ctx.patchSkyWeather(partial);
}

function onEnable(on: boolean) {
  ctx.onSkyEnableOnPet(on);
}

function onBgOpacity(v: number) {
  ctx.onSkyBgOpacity(v);
}

function resetBgOpacity() {
  ctx.resetSkyBgOpacity();
}

function onHideable(v: string | number) {
  const on = v === "yes";
  if (hideableOnPet.value === on) return;
  patch({ hideableOnPet: on });
}

function onHideEffect(v: string | number) {
  if (!hideableOnPet.value) return;
  const next = normalizeSkyPetHideEffect(v);
  if (hideEffectOnPet.value === next) return;
  patch({ hideEffectOnPet: next });
}
</script>

<style scoped>
.sky-pet-backdrop-panel {
  display: contents;
}

.is-disabled {
  opacity: 0.45;
  pointer-events: none;
}

.sky-pet-effect-hint {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--ui-text-muted);
}
</style>
