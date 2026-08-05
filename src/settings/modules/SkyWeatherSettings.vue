<template>
  <div class="sky-weather span-2">
    <SettingsItemRow
      :title="$t('pet.skyWeatherTitle')"
      :description="$t('pet.skyWeatherDesc')"
      tone="pet"
    >
      <template #body>
        <div class="sky-weather-body">
          <div class="sky-weather-row sky-weather-row--link">
            <div class="sky-weather-link-meta">
              <div class="sky-weather-label">{{ $t("pet.skyWeatherLinkMode") }}</div>
              <p class="sky-weather-hint">{{ $t("pet.skyWeatherLinkModeDesc") }}</p>
            </div>
            <label class="sky-weather-link-sw">
              <span>{{
                model.linkMode === "online"
                  ? $t("pet.skyWeatherLinkOnline")
                  : $t("pet.skyWeatherLinkOffline")
              }}</span>
              <ThemeSwitch
                :checked="model.linkMode === 'online'"
                :aria-label="$t('pet.skyWeatherLinkMode')"
                @update:checked="onLinkOnline"
              />
            </label>
          </div>

          <div class="sky-weather-row sky-weather-row--stack">
            <div class="sky-weather-label">{{ $t("pet.skyWeatherRegion") }}</div>
            <p class="sky-weather-hint">{{ regionHint }}</p>
            <select
              class="sky-weather-select"
              :value="model.regionId"
              :aria-label="$t('pet.skyWeatherRegion')"
              :aria-busy="busy ? 'true' : 'false'"
              :disabled="!linkOnline"
              @change="onRegion"
            >
              <option value="system">{{ systemRegionLabel }}</option>
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
import ThemeSwitch from "@/settings/components/ThemeSwitch.vue";
import {
  NORMAL_WEATHER_POOL,
  SKY_REGIONS,
  normalizeSkyWeather,
  type SkyLinkMode,
  type SkyTodId,
  type SkyTodMode,
  type SkyWeatherConfig,
  type SkyWeatherId,
  type SkyWeatherMode,
} from "@/pet/data/skyWeather";
import {
  applySkyLinkMode,
  applySkyTodMode,
  applySkyWeatherMode,
} from "@/pet/runtime/skyWeatherModeOps";
import "./skyWeatherSettings.css";

const props = defineProps<{
  modelValue: SkyWeatherConfig;
  /** 跟随系统解析出的城 id；空=尚未定位 */
  netCityId?: string;
  /** 探测/换城同步中 */
  busy?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [v: SkyWeatherConfig];
  change: [];
}>();

const { t } = useI18n();

const model = computed(() => normalizeSkyWeather(props.modelValue));
const linkOnline = computed(() => model.value.linkMode === "online");
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

/** 在线跟随：有探测城则显示城名，不写「跟随系统」 */
const systemRegionLabel = computed(() => {
  const id = props.netCityId || "";
  const city = SKY_REGIONS[id]?.name || "";
  if (city) return t("pet.skyWeatherRegionSystemCity", { city });
  if (props.busy) return t("pet.skyWeatherRegionLocating");
  return t("pet.skyWeatherRegionSystem");
});

const regionHint = computed(() =>
  linkOnline.value
    ? t("pet.skyWeatherRegionSystemHint")
    : t("pet.skyWeatherRegionOfflineHint")
);

const normalWeatherIds = NORMAL_WEATHER_POOL;

const todModeOptions = computed(() => {
  const all = [
    { value: "offline" as const, label: t("pet.skyModeOffline") },
    { value: "sync" as const, label: t("pet.skyModeSyncTod") },
    { value: "fixed" as const, label: t("pet.skyModeFixedTod") },
  ];
  // 总闸离线：不提供跟随项
  return linkOnline.value ? all : all.filter((o) => o.value !== "sync");
});

const wxModeOptions = computed(() => {
  const all = [
    { value: "offline" as const, label: t("pet.skyModeOffline") },
    { value: "sync" as const, label: t("pet.skyModeSyncWx") },
    { value: "fixed" as const, label: t("pet.skyModeFixedWx") },
  ];
  return linkOnline.value ? all : all.filter((o) => o.value !== "sync");
});

const todOptions = computed(() =>
  (["morning", "noon", "dusk", "evening", "night", "predawn"] as SkyTodId[]).map(
    (value) => ({ value, label: t(`pet.skyTod.${value}`) })
  )
);

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
  if (!linkOnline.value) return;
  patch({ regionId: (e.target as HTMLSelectElement).value });
}

function onLinkOnline(online: boolean) {
  const next = online ? "online" : "offline";
  if (model.value.linkMode === next) return;
  commit(applySkyLinkMode(model.value, next as SkyLinkMode));
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
