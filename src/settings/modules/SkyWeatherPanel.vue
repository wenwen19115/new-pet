<template>
  <div class="sky-weather-panel">
    <ThemeSection :label="$t('pet.secSkyWeather')">
      <SkyWeatherSettings
        :model-value="skyWeatherModel"
        :net-city-id="netCityId"
        :busy="busy"
        @update:model-value="onSkyWeather"
        @change="() => ctx.onSkyWeatherChange()"
      />
    </ThemeSection>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import ThemeSection from "@/settings/components/ThemeSection.vue";
import SkyWeatherSettings from "@/settings/modules/SkyWeatherSettings.vue";
import { PET_SETTINGS_PAGE_KEY } from "@/settings/context";
import {
  DEFAULT_SKY_WEATHER,
  type SkyWeatherConfig,
} from "@/pet/data/skyWeather";

const ctx = inject(PET_SETTINGS_PAGE_KEY)!;

const skyWeatherModel = computed(
  () => ctx.skyWeather?.value ?? DEFAULT_SKY_WEATHER
);
const netCityId = computed(() => ctx.skyNetCityId.value);
const busy = computed(() => ctx.skyNetBusy.value);

function onSkyWeather(next: SkyWeatherConfig) {
  if (!ctx.skyWeather) return;
  ctx.skyWeather.value = next;
}
</script>

<style scoped>
.sky-weather-panel {
  display: contents;
}
</style>
