<template>
  <div class="sky-weather span-2">
    <SettingsItemRow
      :title="$t('pet.skyWeatherLinkMode')"
      :description="linkModeDesc"
      tone="pet"
    >
      <label class="sky-weather-link-sw">
        <span>{{
          model.linkMode === "online"
            ? $t("pet.skyWeatherLinkOnline")
            : $t("pet.skyWeatherLinkOffline")
        }}</span>
        <ThemeSwitch
          :checked="model.linkMode === 'online'"
          :disabled="Boolean(busy) || linking"
          :aria-label="$t('pet.skyWeatherLinkMode')"
          @update:checked="onLinkOnline"
        />
      </label>
    </SettingsItemRow>

    <SettingsItemRow
      :title="$t('pet.skyWeatherRegion')"
      :description="linkOnline ? '' : $t('pet.skyWeatherRegionOfflineHint')"
      tone="pet"
      :class="{ 'is-disabled': !linkOnline }"
    >
      <SkyMenuSelect
        :open="openMenu === 'region'"
        :disabled="!linkOnline"
        :busy="busy"
        :label="regionTriggerLabel"
        :aria-label="$t('pet.skyWeatherRegion')"
        :options="regionOptions"
        :model-value="model.regionId"
        @toggle="toggleMenu('region')"
        @pick="pickRegion"
      />
    </SettingsItemRow>

    <!-- 模式 + 值同槽同宽：固定可改，其余只读，避免换行撑高 -->
    <SettingsItemRow :title="$t('pet.skyWeatherTodMode')" tone="pet">
      <div class="sky-drive-row">
        <ThemeSeg
          :model-value="model.todMode"
          :options="todModeOptions"
          :aria-label="$t('pet.skyWeatherTodMode')"
          @update:model-value="onTodMode"
        />
        <div class="sky-drive-value">
          <SkyMenuSelect
            :open="model.todMode === 'fixed' && openMenu === 'tod'"
            :disabled="model.todMode !== 'fixed'"
            :hide-caret="model.todMode !== 'fixed'"
            :label="todValueLabel"
            :aria-label="$t('pet.skyWeatherManualTod')"
            :options="todSelectOptions"
            :model-value="model.manualTod"
            @toggle="toggleMenu('tod')"
            @pick="pickManualTod"
          />
        </div>
      </div>
    </SettingsItemRow>

    <SettingsItemRow :title="$t('pet.skyWeatherWxMode')" tone="pet">
      <div class="sky-drive-row">
        <ThemeSeg
          :model-value="model.weatherMode"
          :options="wxModeOptions"
          :aria-label="$t('pet.skyWeatherWxMode')"
          @update:model-value="onWxMode"
        />
        <div class="sky-drive-value">
          <SkyMenuSelect
            :open="model.weatherMode === 'fixed' && openMenu === 'wx'"
            :disabled="model.weatherMode !== 'fixed'"
            :hide-caret="model.weatherMode !== 'fixed'"
            :label="wxValueLabel"
            :aria-label="$t('pet.skyWeatherManualWx')"
            :options="wxSelectOptions"
            :model-value="model.manualWeather"
            @toggle="toggleMenu('wx')"
            @pick="pickManualWx"
          />
        </div>
      </div>
    </SettingsItemRow>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import SettingsItemRow from "@/components/SettingsItemRow.vue";
import ThemeSeg from "@/settings/components/ThemeSeg.vue";
import ThemeSwitch from "@/settings/components/ThemeSwitch.vue";
import SkyMenuSelect from "@/settings/components/SkyMenuSelect.vue";
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
  /** 切换在线前强制探测 */
  probeNet?: () => Promise<boolean>;
  /** 当前展示天色（系统钟/离线旁提示） */
  displayTod?: SkyTodId;
  /** 当前展示天气（实况/离线旁提示） */
  displayWeather?: SkyWeatherId;
}>();

const emit = defineEmits<{
  "update:modelValue": [v: SkyWeatherConfig];
  change: [];
}>();

const { t } = useI18n();

const model = computed(() => normalizeSkyWeather(props.modelValue));
const linkOnline = computed(() => model.value.linkMode === "online");
/** 正在为「切在线」做探测，开关先不拨过去 */
const linking = ref(false);
const linkDenied = ref(false);

const linkModeDesc = computed(() => {
  if (linking.value) return t("pet.skyWeatherLinkNeedNet");
  if (linkDenied.value && !linkOnline.value) {
    return t("pet.skyWeatherLinkProbeDenied");
  }
  return t("pet.skyWeatherLinkModeDesc");
});

type MenuId = "region" | "tod" | "wx";
const openMenu = ref<MenuId | null>(null);

function toggleMenu(id: MenuId) {
  if (id === "region" && !linkOnline.value) return;
  if (id === "tod" && model.value.todMode !== "fixed") return;
  if (id === "wx" && model.value.weatherMode !== "fixed") return;
  openMenu.value = openMenu.value === id ? null : id;
}

function closeMenus() {
  openMenu.value = null;
}

const regionList = computed(() =>
  Object.values(SKY_REGIONS).sort(
    (a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name)
  )
);

/** 跟随系统：优先显示定位城名 */
const systemRegionLabel = computed(() => {
  const id = props.netCityId || model.value.runtime.locatedRegionId || "";
  const city = SKY_REGIONS[id]?.name || "";
  if (city) return t("pet.skyWeatherRegionSystemCity", { city });
  if (props.busy) return t("pet.skyWeatherRegionLocating");
  return t("pet.skyWeatherRegionSystem");
});

const regionTriggerLabel = computed(() => {
  if (model.value.regionId === "system") return systemRegionLabel.value;
  return SKY_REGIONS[model.value.regionId]?.name || model.value.regionId;
});

const regionOptions = computed(() => [
  { value: "system", label: systemRegionLabel.value },
  ...regionList.value.map((r) => ({ value: r.id, label: r.name })),
]);

const todModeOptions = computed(() => {
  const all = [
    { value: "offline" as const, label: t("pet.skyModeOffline") },
    { value: "sync" as const, label: t("pet.skyModeSyncTod") },
    { value: "fixed" as const, label: t("pet.skyModeFixedTod") },
  ];
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

const todSelectOptions = computed(() =>
  (["morning", "noon", "dusk", "evening", "night", "predawn"] as SkyTodId[]).map(
    (value) => ({ value, label: t(`pet.skyTod.${value}`) })
  )
);

const todTriggerLabel = computed(() => {
  const hit = todSelectOptions.value.find((o) => o.value === model.value.manualTod);
  return hit?.label || model.value.manualTod;
});

const wxSelectOptions = computed(() =>
  NORMAL_WEATHER_POOL.map((id) => ({ value: id, label: weatherLabel(id) }))
);

function weatherLabel(id: string) {
  const key = `pet.skyWx.${id}`;
  const msg = t(key);
  return msg === key ? id : msg;
}

const displayTodLabel = computed(() => {
  const id = props.displayTod || model.value.runtime.snapTod || model.value.manualTod;
  return t(`pet.skyTod.${id}`);
});

const displayWxLabel = computed(() => {
  const id =
    props.displayWeather ||
    model.value.runtime.snapWeather ||
    model.value.manualWeather;
  return weatherLabel(id);
});

const todValueLabel = computed(() =>
  model.value.todMode === "fixed" ? todTriggerLabel.value : displayTodLabel.value
);

const wxValueLabel = computed(() =>
  model.value.weatherMode === "fixed"
    ? weatherLabel(model.value.manualWeather)
    : displayWxLabel.value
);

function commit(next: SkyWeatherConfig) {
  emit("update:modelValue", normalizeSkyWeather(next));
  emit("change");
}

function patch(partial: Partial<SkyWeatherConfig>) {
  commit({ ...model.value, ...partial });
}

function pickRegion(id: string) {
  if (!linkOnline.value) return;
  closeMenus();
  patch({ regionId: id });
}

function pickManualTod(id: string) {
  closeMenus();
  patch({ manualTod: id as SkyTodId });
}

function pickManualWx(id: string) {
  closeMenus();
  patch({
    manualWeather: id as SkyWeatherId,
    runtime: { ...model.value.runtime, eggWeather: "" },
  });
}

async function onLinkOnline(online: boolean) {
  if (linking.value) return;
  if (!online) {
    linkDenied.value = false;
    if (model.value.linkMode === "offline") return;
    closeMenus();
    commit(applySkyLinkMode(model.value, "offline"));
    return;
  }
  if (model.value.linkMode === "online") return;
  // 先探测，成功才切在线；失败开关保持离线
  linking.value = true;
  linkDenied.value = false;
  try {
    const ok = props.probeNet ? await props.probeNet() : false;
    if (!ok) {
      linkDenied.value = true;
      return;
    }
    closeMenus();
    commit(applySkyLinkMode(model.value, "online" as SkyLinkMode));
  } finally {
    linking.value = false;
  }
}

function onTodMode(v: string | number) {
  closeMenus();
  commit(applySkyTodMode(model.value, v as SkyTodMode));
}

function onWxMode(v: string | number) {
  closeMenus();
  commit(applySkyWeatherMode(model.value, v as SkyWeatherMode));
}
</script>
