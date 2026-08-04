<template>
  <div class="sky-weather span-2">
    <SettingsItemRow
      :title="$t('pet.skyWeatherTitle')"
      :description="$t('pet.skyWeatherDesc')"
      tone="pet"
    >
      <template #body>
        <div class="sky-weather-body">
          <div class="sky-weather-row">
            <div class="sky-weather-label">{{ $t("pet.skyWeatherRegion") }}</div>
            <select
              class="sky-weather-select"
              :value="model.regionId"
              :aria-label="$t('pet.skyWeatherRegion')"
              @change="onRegion"
            >
              <option value="system">{{ $t("pet.skyWeatherRegionSystem") }}</option>
              <option v-for="r in regionList" :key="r.id" :value="r.id">
                {{ r.name }}
              </option>
            </select>
          </div>

          <div class="sky-weather-row sky-weather-row--stack">
            <div class="sky-weather-label">{{ $t("pet.skyWeatherTodMode") }}</div>
            <p class="sky-weather-hint">{{ $t("pet.skyWeatherTodModeDesc") }}</p>
            <ThemeSeg
              :model-value="model.todMode"
              :options="todModeOptions"
              :aria-label="$t('pet.skyWeatherTodMode')"
              @update:model-value="onTodMode"
            />
          </div>

          <div class="sky-weather-row sky-weather-row--stack">
            <div class="sky-weather-label">{{ $t("pet.skyWeatherWxMode") }}</div>
            <p class="sky-weather-hint">{{ $t("pet.skyWeatherWxModeDesc") }}</p>
            <ThemeSeg
              :model-value="model.weatherMode"
              :options="wxModeOptions"
              :aria-label="$t('pet.skyWeatherWxMode')"
              @update:model-value="onWxMode"
            />
          </div>

          <div
            v-if="model.todMode !== 'sync'"
            class="sky-weather-row sky-weather-row--stack"
          >
            <div class="sky-weather-label">{{ $t("pet.skyWeatherManualTod") }}</div>
            <ThemeSeg
              :model-value="model.manualTod"
              :options="todOptions"
              :aria-label="$t('pet.skyWeatherManualTod')"
              @update:model-value="onManualTod"
            />
          </div>

          <div
            v-if="model.weatherMode !== 'sync'"
            class="sky-weather-row sky-weather-row--stack"
          >
            <div class="sky-weather-label">{{ $t("pet.skyWeatherManualWx") }}</div>
            <div
              ref="wxMenuRoot"
              class="sky-weather-menu"
              :data-open="wxMenuOpen ? '1' : '0'"
            >
              <button
                type="button"
                class="sky-weather-menu-trigger"
                :aria-expanded="wxMenuOpen"
                :aria-label="$t('pet.skyWeatherManualWx')"
                @click="toggleWxMenu"
              >
                <span>{{ weatherLabel(model.manualWeather) }}</span>
                <span class="sky-weather-menu-caret" aria-hidden="true" />
              </button>
              <div
                v-if="wxMenuOpen"
                class="sky-weather-menu-panel"
                role="listbox"
                :style="wxMenuPanelStyle"
                @wheel.stop
                @touchmove.stop
              >
                <button
                  v-for="id in normalWeatherIds"
                  :key="id"
                  type="button"
                  class="sky-weather-menu-opt"
                  role="option"
                  :aria-selected="model.manualWeather === id"
                  :data-active="model.manualWeather === id ? '1' : '0'"
                  @click="pickManualWx(id)"
                >
                  {{ weatherLabel(id) }}
                </button>
              </div>
            </div>
          </div>

          <div class="sky-weather-status">{{ statusText }}</div>
        </div>
      </template>
    </SettingsItemRow>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import SettingsItemRow from "@/components/SettingsItemRow.vue";
import ThemeSeg from "@/settings/components/ThemeSeg.vue";
import {
  NORMAL_WEATHER_POOL,
  SKY_REGIONS,
  normalizeSkyWeather,
  type SkyTodId,
  type SkyTodMode,
  type SkyWeatherConfig,
  type SkyWeatherId,
  type SkyWeatherMode,
} from "@/pet/data/skyWeather";
import {
  applySkyTodMode,
  applySkyWeatherMode,
  resolveDisplayTod,
  resolveDisplayWeather,
} from "@/pet/runtime/skyWeatherModeOps";
import "./skyWeatherSettings.css";

const props = defineProps<{
  modelValue: SkyWeatherConfig;
}>();

const emit = defineEmits<{
  "update:modelValue": [v: SkyWeatherConfig];
  change: [];
}>();

const { t } = useI18n();

const model = computed(() => normalizeSkyWeather(props.modelValue));
const wxMenuOpen = ref(false);
const wxMenuRoot = ref<HTMLElement | null>(null);
/** 视口下方可用高度算出的面板限高 */
const wxMenuMaxH = ref(220);

const wxMenuPanelStyle = computed(() => ({
  maxHeight: `${wxMenuMaxH.value}px`,
}));

function layoutWxMenu() {
  const root = wxMenuRoot.value;
  if (!root) return;
  const trigger = root.querySelector(".sky-weather-menu-trigger") as HTMLElement | null;
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  const gap = 4;
  const pad = 8;
  const below = Math.floor(window.innerHeight - rect.bottom - gap - pad);
  // 至少留一截可点，最多别超过大半屏
  const cap = Math.floor(window.innerHeight * 0.55);
  wxMenuMaxH.value = Math.max(96, Math.min(cap, below));
}

function toggleWxMenu() {
  if (wxMenuOpen.value) {
    wxMenuOpen.value = false;
    return;
  }
  layoutWxMenu();
  wxMenuOpen.value = true;
}

function onWxMenuRelayout() {
  if (!wxMenuOpen.value) return;
  layoutWxMenu();
}

const regionList = computed(() =>
  Object.values(SKY_REGIONS).sort(
    (a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name)
  )
);

const normalWeatherIds = NORMAL_WEATHER_POOL;

const todModeOptions = computed(() => [
  { value: "offline" as const, label: t("pet.skyModeOffline") },
  { value: "sync" as const, label: t("pet.skyModeSyncTod") },
  { value: "fixed" as const, label: t("pet.skyModeFixedTod") },
]);

const wxModeOptions = computed(() => [
  { value: "offline" as const, label: t("pet.skyModeOffline") },
  { value: "sync" as const, label: t("pet.skyModeSyncWx") },
  { value: "fixed" as const, label: t("pet.skyModeFixedWx") },
]);

const todOptions = computed(() =>
  (["morning", "noon", "dusk", "evening", "night", "predawn"] as SkyTodId[]).map(
    (value) => ({ value, label: t(`pet.skyTod.${value}`) })
  )
);

const statusText = computed(() => {
  const cfg = model.value;
  return t("pet.skyWeatherStatus", {
    tod: t(`pet.skyTod.${resolveDisplayTod(cfg)}`),
    weather: weatherLabel(resolveDisplayWeather(cfg)),
  });
});

function weatherLabel(id: string) {
  const key = `pet.skyWx.${id}`;
  const msg = t(key);
  return msg === key ? id : msg;
}

function commit(next: SkyWeatherConfig) {
  emit("update:modelValue", normalizeSkyWeather(next));
  emit("change");
}

function patch(partial: Partial<SkyWeatherConfig>) {
  commit({ ...model.value, ...partial });
}

function onRegion(e: Event) {
  patch({ regionId: (e.target as HTMLSelectElement).value });
}

function onTodMode(v: string | number) {
  commit(applySkyTodMode(model.value, v as SkyTodMode));
}

function onWxMode(v: string | number) {
  commit(applySkyWeatherMode(model.value, v as SkyWeatherMode));
}

function onManualTod(v: string | number) {
  patch({ manualTod: v as SkyTodId });
}

function pickManualWx(id: SkyWeatherId) {
  wxMenuOpen.value = false;
  patch({
    manualWeather: id,
    runtime: { ...model.value.runtime, eggWeather: "" },
  });
}

function onDocPointerDown(e: PointerEvent) {
  if (!wxMenuOpen.value) return;
  const root = wxMenuRoot.value;
  if (root && !root.contains(e.target as Node)) wxMenuOpen.value = false;
}

document.addEventListener("pointerdown", onDocPointerDown);
window.addEventListener("resize", onWxMenuRelayout);
onUnmounted(() => {
  document.removeEventListener("pointerdown", onDocPointerDown);
  window.removeEventListener("resize", onWxMenuRelayout);
});
</script>
