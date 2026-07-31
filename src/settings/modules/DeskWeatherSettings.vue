<template>
  <div class="desk-weather span-2">
    <SettingsItemRow
      :title="$t('pet.deskWeatherTitle')"
      :description="$t('pet.deskWeatherDesc')"
      tone="pet"
    >
      <template #icon><CloudOutlined /></template>
      <a-switch
        :checked="cfg.enabled"
        size="small"
        @change="onEnabled"
      />
    </SettingsItemRow>

    <div v-if="cfg.enabled" class="desk-weather-body">
      <div class="desk-weather-probe">
        <RadarChartOutlined class="desk-weather-probe-ico" />
        <div class="desk-weather-probe-text">{{ probeText }}</div>
      </div>

      <div class="desk-weather-sub desk-weather-sub--apps">
        <div class="desk-weather-sub-top">
          <div class="desk-weather-sub-label">
            <AppstoreOutlined />
            <span
              >{{ $t("pet.deskWeatherAppsTitle") }}
              {{ $t("pet.deskWeatherInteract") }}</span
            >
          </div>
          <div class="desk-weather-row">
            <a-switch
              :checked="cfg.appsMany.enabled"
              size="small"
              @change="(v: boolean) => patchApps({ enabled: v })"
            />
          </div>
        </div>
        <div class="desk-weather-hint">{{ $t("pet.deskWeatherAppsDesc") }}</div>
        <div class="desk-weather-row desk-weather-row--start">
          <span class="desk-weather-chip">{{ $t("pet.deskWeatherAppsStep") }}</span>
          <a-input-number
            :value="cfg.appsMany.changeStep"
            size="small"
            :min="1"
            :max="10"
            :disabled="!cfg.appsMany.enabled"
            style="width: 64px"
            @change="(v: number | null) => patchApps({ changeStep: Number(v) })"
          />
          <span class="desk-weather-chip">{{ $t("pet.deskWeatherCooldown") }}</span>
          <a-input-number
            :value="cfg.cooldown.appsChangeSec"
            size="small"
            :min="0"
            :max="600"
            :disabled="!cfg.appsMany.enabled"
            style="width: 72px"
            @change="(v: number | null) => patchCooldown({ appsChangeSec: Number(v) })"
          />
          <span class="desk-weather-chip">{{ $t("pet.deskWeatherCooldownUnit") }}</span>
        </div>
        <div class="desk-weather-param-hint">
          {{ $t("pet.deskWeatherAppsStepHint") }}；{{ $t("pet.deskWeatherCooldownHint") }}
        </div>
      </div>

      <div class="desk-weather-sub desk-weather-sub--burst">
        <div class="desk-weather-sub-top">
          <div class="desk-weather-sub-label">
            <SwapOutlined />
            <span
              >{{ $t("pet.deskWeatherBurstTitle") }}
              {{ $t("pet.deskWeatherInteract") }}</span
            >
          </div>
          <div class="desk-weather-row">
            <a-switch
              :checked="cfg.switchBurst.enabled"
              size="small"
              @change="(v: boolean) => patchBurst({ enabled: v })"
            />
          </div>
        </div>
        <div class="desk-weather-hint">{{ $t("pet.deskWeatherBurstDesc") }}</div>
        <div class="desk-weather-row desk-weather-row--start">
          <a-input-number
            :value="Math.round(cfg.switchBurst.windowMs / 1000)"
            size="small"
            :min="1"
            :max="10"
            :disabled="!cfg.switchBurst.enabled"
            style="width: 56px"
            @change="(v: number | null) => patchBurst({ windowMs: Number(v) * 1000 })"
          />
          <span class="desk-weather-chip">{{ $t("pet.deskWeatherBurstSec") }}</span>
          <a-input-number
            :value="cfg.switchBurst.switchCount"
            size="small"
            :min="2"
            :max="8"
            :disabled="!cfg.switchBurst.enabled"
            style="width: 56px"
            @change="(v: number | null) => patchBurst({ switchCount: Number(v) })"
          />
          <span class="desk-weather-chip">{{ $t("pet.deskWeatherBurstTimes") }}</span>
          <span class="desk-weather-chip">{{ $t("pet.deskWeatherCooldown") }}</span>
          <a-input-number
            :value="cfg.cooldown.switchBurstSec"
            size="small"
            :min="0"
            :max="600"
            :disabled="!cfg.switchBurst.enabled"
            style="width: 72px"
            @change="(v: number | null) => patchCooldown({ switchBurstSec: Number(v) })"
          />
          <span class="desk-weather-chip">{{ $t("pet.deskWeatherCooldownUnit") }}</span>
        </div>
        <div class="desk-weather-param-hint">
          {{ $t("pet.deskWeatherBurstParamHint") }}
        </div>
      </div>

      <div class="desk-weather-sub desk-weather-sub--dwell">
        <div class="desk-weather-sub-top">
          <div class="desk-weather-sub-label">
            <ExpandOutlined />
            <span
              >{{ $t("pet.deskWeatherDwellTitle") }}
              {{ $t("pet.deskWeatherInteract") }}</span
            >
          </div>
          <div class="desk-weather-row">
            <a-switch
              :checked="cfg.maxDwell.enabled"
              size="small"
              @change="(v: boolean) => patchDwell({ enabled: v })"
            />
          </div>
        </div>
        <div class="desk-weather-hint">{{ $t("pet.deskWeatherDwellDesc") }}</div>
        <div class="desk-weather-tiers">
          <label
            v-for="(sec, i) in cfg.maxDwell.tiersSec"
            :key="i"
            class="desk-weather-tier"
          >
            <span>{{ dwellTierLabels[i] }}</span>
            <a-input-number
              :value="sec"
              size="small"
              :min="5"
              :max="3600"
              :disabled="!cfg.maxDwell.enabled"
              style="width: 68px"
              @change="(v: number | null) => onTier(i, Number(v))"
            />
            <span>{{ $t("pet.deskWeatherDwellTierSuffix") }}</span>
          </label>
        </div>
        <div class="desk-weather-param-hint">
          {{ $t("pet.deskWeatherDwellParamHint") }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  AppstoreOutlined,
  CloudOutlined,
  ExpandOutlined,
  RadarChartOutlined,
  SwapOutlined,
} from "@ant-design/icons-vue";
import SettingsItemRow from "@/components/SettingsItemRow.vue";
import type { DeskWeatherConfig } from "@/pet/data/deskWeather";
import { normalizeDeskWeather } from "@/pet/data/deskWeather";
import {
  fetchDeskWeatherSnapshot,
  isPetDeskWeatherPolling,
  stopDeskWeatherFocusWatch,
  type DeskWeatherSnapshot,
} from "@/pet/bridge/deskWeather";

const PROBE_MS = 1000;

const props = defineProps<{
  modelValue: DeskWeatherConfig;
}>();

const emit = defineEmits<{
  "update:modelValue": [DeskWeatherConfig];
  change: [];
}>();

const { t } = useI18n();
const cfg = computed(() => normalizeDeskWeather(props.modelValue));
const dwellTierLabels = computed(() => [
  t("pet.deskWeatherDwellTier1"),
  t("pet.deskWeatherDwellTier2"),
]);
const lastSnap = ref<DeskWeatherSnapshot | null>(null);
const probeError = ref("");
let probeTimer: ReturnType<typeof setInterval> | null = null;
let probing = false;
let probeGen = 0;

const burstWindowSec = computed(() =>
  Math.max(1, Math.round(cfg.value.switchBurst.windowMs / 1000))
);

function switchesInWindow(snap: DeskWeatherSnapshot): number {
  const windowMs = cfg.value.switchBurst.windowMs;
  const now = Date.now();
  return snap.recentSwitchTimesMs.filter((t) => now - t <= windowMs).length;
}

const probeText = computed(() => {
  if (probeError.value) return probeError.value;
  const s = lastSnap.value;
  if (!s) return t("pet.deskWeatherProbeHint");
  return t("pet.deskWeatherProbeResult", {
    apps: s.appCount,
    fg: s.foregroundKey
      ? t("pet.deskWeatherProbeFgExt")
      : t("pet.deskWeatherProbeFgSelf"),
    immersive: s.foregroundImmersive ? "yes" : "no",
    sec: burstWindowSec.value,
    switches: switchesInWindow(s),
  });
});

async function probeOnce() {
  if (probing || !cfg.value.enabled) return;
  probing = true;
  try {
    const snap = await fetchDeskWeatherSnapshot();
    if (!snap) {
      probeError.value = t("pet.deskWeatherProbeFail");
      lastSnap.value = null;
      return;
    }
    probeError.value = "";
    lastSnap.value = snap;
  } catch (e) {
    probeError.value = t("pet.deskWeatherProbeFail");
    lastSnap.value = null;
    console.warn("[settings] desk weather probe failed", e);
  } finally {
    probing = false;
  }
}

function clearProbeTimer() {
  if (probeTimer) {
    clearInterval(probeTimer);
    probeTimer = null;
  }
}

async function stopProbe() {
  probeGen += 1;
  clearProbeTimer();
  // 桌宠还在轮询时别停焦点线程，否则切窗传感会空一截
  if (!isPetDeskWeatherPolling()) {
    await stopDeskWeatherFocusWatch();
  }
}

function startProbe() {
  const gen = ++probeGen;
  clearProbeTimer();
  if (!cfg.value.enabled) {
    void (async () => {
      if (gen !== probeGen) return;
      if (!isPetDeskWeatherPolling()) {
        await stopDeskWeatherFocusWatch();
      }
    })();
    return;
  }
  void probeOnce();
  probeTimer = setInterval(() => {
    void probeOnce();
  }, PROBE_MS);
}

function commit(next: DeskWeatherConfig) {
  emit("update:modelValue", normalizeDeskWeather(next));
  emit("change");
}

function onEnabled(v: boolean) {
  commit({ ...cfg.value, enabled: v });
}

function patchApps(patch: Partial<DeskWeatherConfig["appsMany"]>) {
  commit({
    ...cfg.value,
    appsMany: { ...cfg.value.appsMany, ...patch },
  });
}

function patchBurst(patch: Partial<DeskWeatherConfig["switchBurst"]>) {
  commit({
    ...cfg.value,
    switchBurst: { ...cfg.value.switchBurst, ...patch },
  });
}

function patchCooldown(patch: Partial<DeskWeatherConfig["cooldown"]>) {
  commit({
    ...cfg.value,
    cooldown: { ...cfg.value.cooldown, ...patch },
  });
}

function patchDwell(patch: Partial<DeskWeatherConfig["maxDwell"]>) {
  commit({
    ...cfg.value,
    maxDwell: { ...cfg.value.maxDwell, ...patch },
  });
}

function onTier(index: number, value: number) {
  const tiers = [...cfg.value.maxDwell.tiersSec];
  tiers[index] = value;
  patchDwell({ tiersSec: tiers });
}

onMounted(() => {
  startProbe();
});

onUnmounted(() => {
  void stopProbe();
});

watch(
  () => cfg.value.enabled,
  () => {
    startProbe();
  }
);
</script>

<style scoped>
.desk-weather {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
}

.desk-weather :deep(.settings-item) {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.desk-weather-body {
  margin-top: -1px;
  padding: 0 0 4px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-top: 0;
  border-radius: 0 0 12px 12px;
  background: rgba(0, 0, 0, 0.16);
  border-left: 2px solid rgba(64, 196, 255, 0.35);
}

.desk-weather-probe {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 10px 12px 6px 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(64, 196, 255, 0.06);
  border: 1px solid rgba(64, 196, 255, 0.12);
}

.desk-weather-probe-ico {
  margin-top: 1px;
  color: var(--ui-primary, #40c4ff);
  opacity: 0.85;
  flex-shrink: 0;
}

.desk-weather-probe-text {
  font-size: 12px;
  line-height: 1.45;
  color: var(--ui-text-muted, rgba(255, 255, 255, 0.7));
  word-break: break-word;
}

.desk-weather-sub {
  /* 主题青的邻近/互补：薄荷 · 珊瑚 · 嫩绿；边条略压暗，不抢主色 */
  --dw-accent: #5eead4;
  margin: 6px 10px;
  padding: 10px 12px 12px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-left: 3px solid color-mix(in srgb, var(--dw-accent) 62%, transparent);
  background: rgba(255, 255, 255, 0.03);
}

.desk-weather-sub--apps {
  --dw-accent: #5eead4;
}

.desk-weather-sub--burst {
  --dw-accent: #ff8f7a;
}

.desk-weather-sub--dwell {
  --dw-accent: #8be08b;
}

.desk-weather-sub-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.desk-weather-sub-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ui-text, rgba(255, 255, 255, 0.88));
}

.desk-weather-sub-label :deep(.anticon) {
  color: color-mix(in srgb, var(--dw-accent) 82%, #fff);
  opacity: 0.88;
}

.desk-weather-sub .desk-weather-tier {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.desk-weather-hint {
  margin-top: 4px;
  margin-bottom: 8px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--ui-text-faint, rgba(255, 255, 255, 0.42));
}

.desk-weather-param-hint {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--ui-text-faint, rgba(255, 255, 255, 0.38));
}

.desk-weather-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.desk-weather-row--start {
  justify-content: flex-start;
}

.desk-weather-chip {
  font-size: 11px;
  opacity: 0.7;
  white-space: nowrap;
}

.desk-weather-tiers {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
}

.desk-weather-tier {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  opacity: 0.9;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
}
</style>
