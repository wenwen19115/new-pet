<template>
  <div class="theme-root" :data-style="theme.style" :style="themeVars">
  <div
    v-if="visible"
    ref="rootEl"
    class="pet-ctx-menu"
    @pointerdown="onActivity"
    @keydown="onActivity"
  >
    <button
      type="button"
      class="pet-ctx-stats-toggle"
      :class="{ open: statsExpanded }"
      :aria-expanded="statsExpanded"
      @click="toggleStats"
    >
      <span class="pet-ctx-stats-emoji" aria-hidden="true">{{ moodEmoji }}</span>
      <span class="pet-ctx-stats-title">
        <span class="pet-ctx-stats-name">{{ toggleTitle }}</span>
        <span class="pet-ctx-stats-hint">{{ toggleHint }}</span>
      </span>
      <span class="pet-ctx-stats-chevron" aria-hidden="true">▾</span>
    </button>

    <div v-if="statsExpanded" class="pet-ctx-stats-panel" aria-live="polite">
      <div class="pet-ctx-moyu-line">{{ moyuLine }}</div>
      <div class="pet-ctx-meters">
        <div
          v-for="(cell, i) in cells"
          :key="cell.key"
          class="pet-ctx-meter"
          :class="[`tone-${cell.key}`, { hot: cell.hot }]"
          :style="{ animationDelay: `${i * 40}ms` }"
        >
          <span class="pet-ctx-meter-value">{{ cell.value }}</span>
          <span class="pet-ctx-meter-label">{{ cell.label }}</span>
        </div>
      </div>
    </div>

    <div class="pet-ctx-divider" />

    <div class="pet-ctx-group">
      <div class="pet-ctx-group-label">{{ sectionInteract }}</div>
      <button type="button" class="pet-ctx-item" @click="emitAction('perform')">
        {{ performLabel }}
      </button>
      <button type="button" class="pet-ctx-item" @click="emitAction('playful')">
        {{ playfulLabel }}
      </button>
      <button
        type="button"
        class="pet-ctx-item"
        @click="emitAction(peekHidden ? 'reveal' : 'hide')"
      >
        {{ peekLabel }}
      </button>
    </div>

    <div class="pet-ctx-divider" />

    <div class="pet-ctx-group">
      <div class="pet-ctx-group-label">{{ sectionSky }}</div>
      <button type="button" class="pet-ctx-item pet-ctx-item--switch" @click="emitAction('sky-on-pet')">
        <span>{{ skyOnPetTitle }}</span>
        <span class="pet-ctx-switch" :data-on="skyOnPet ? '1' : '0'" aria-hidden="true">
          <span class="pet-ctx-switch-knob" />
        </span>
      </button>
    </div>

    <div class="pet-ctx-divider" />

    <div class="pet-ctx-group">
      <div class="pet-ctx-group-label">{{ sectionApp }}</div>
      <button
        v-if="chatLabel"
        type="button"
        class="pet-ctx-item"
        @click="emitAction('chat')"
      >
        {{ chatLabel }}
      </button>
      <button type="button" class="pet-ctx-item" @click="emitAction('open')">
        {{ openLabel }}
      </button>
      <button type="button" class="pet-ctx-item" @click="emitAction('pin')">
        {{ pinLabel }}
      </button>
      <button type="button" class="pet-ctx-item" @click="emitAction('dismiss')">
        {{ dismissLabel }}
      </button>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  getPetLocale,
  isPetLocale,
  PET_LOCALE_EVENT,
  type PetLocale,
} from "@/pet/bridge/locale";
import {
  PET_MENU_ACTION_EVENT,
  PET_MENU_ACTIVITY_EVENT,
  PET_MENU_HIDE_EVENT,
  PET_MENU_LAYOUT_EVENT,
  PET_MENU_SHOW_EVENT,
  type PetMenuAction,
  type PetMenuPayload,
} from "@/pet/events";
import { petMenuHeight } from "./types";
import { formatMoyuDayLine } from "@/pet/data/moyuDay";
import { formatStatPercent, getSystemStats } from "@/pet/bridge/systemStats";
import "@/theme";
import { usePetWindowTheme } from "@/theme";

const { theme, themeVars } = usePetWindowTheme();

const rootEl = ref<HTMLElement | null>(null);
const visible = ref(false);
const statsExpanded = ref(false);
const chatEnabled = ref(false);
const peekHidden = ref(false);
const skyOnPet = ref(false);
const cpuPct = ref(0);
const memPct = ref(0);
const diskPct = ref(0);
const netPct = ref(0);
const statsReady = ref(false);
const moyuLine = ref("");
const appLocale = ref<PetLocale>(getPetLocale());

const en = computed(() => appLocale.value === "en");

function refreshMoyuLine() {
  moyuLine.value = formatMoyuDayLine(appLocale.value);
}

const performLabel = computed(() =>
  en.value ? "Do a trick" : "表演一个"
);
const playfulLabel = computed(() =>
  en.value ? "Playful" : "调皮一下"
);
const openLabel = computed(() =>
  en.value ? "Settings" : "打开设置"
);
const pinLabel = computed(() => (en.value ? "Pin" : "置顶"));
const dismissLabel = computed(() =>
  en.value ? "Dismiss pet" : "退出召唤"
);
const chatLabel = computed(() =>
  chatEnabled.value ? (en.value ? "Chat" : "聊天") : ""
);
const peekLabel = computed(() => {
  if (peekHidden.value) return en.value ? "Come out" : "出来";
  return en.value ? "Hide" : "躲起来";
});
const sectionInteract = computed(() => (en.value ? "Interact" : "互动"));
const sectionSky = computed(() => (en.value ? "Window sky" : "窗景"));
const sectionApp = computed(() => (en.value ? "App" : "应用"));
const skyOnPetTitle = computed(() =>
  en.value ? "Project to pet" : "投射到桌宠"
);

const toggleTitle = computed(() =>
  en.value ? "System peek" : "摸鱼仪表盘"
);
const toggleHint = computed(() => {
  if (!statsExpanded.value) {
    return en.value ? "tap to expand" : "点一下展开";
  }
  if (!statsReady.value) return en.value ? "sampling…" : "采样中…";
  return en.value ? "live · like Task Manager" : "实时 · 对齐任务管理器";
});

const moodEmoji = computed(() => {
  const peak = Math.max(cpuPct.value, memPct.value);
  if (!statsReady.value) return "💤";
  if (peak >= 85) return "🥵";
  if (peak >= 60) return "😅";
  if (netPct.value >= 40 || diskPct.value >= 40) return "📡";
  return "😎";
});

const cells = computed(() => {
  const items = [
    {
      key: "cpu",
      label: "CPU",
      value: statsReady.value ? formatStatPercent(cpuPct.value) : "—",
      hot: cpuPct.value >= 80,
    },
    {
      key: "mem",
      label: en.value ? "RAM" : "内存",
      value: statsReady.value ? formatStatPercent(memPct.value) : "—",
      hot: memPct.value >= 80,
    },
    {
      key: "disk",
      label: en.value ? "Disk" : "磁盘",
      value: statsReady.value ? formatStatPercent(diskPct.value) : "—",
      hot: diskPct.value >= 80,
    },
    {
      key: "net",
      label: en.value ? "Net" : "网络",
      value: statsReady.value ? formatStatPercent(netPct.value) : "—",
      hot: netPct.value >= 80,
    },
  ];
  return items;
});

let unlistenShow: UnlistenFn | null = null;
let unlistenHide: UnlistenFn | null = null;
let unlistenLocale: UnlistenFn | null = null;
let statsTimer: number | null = null;
let statsGen = 0;

function clearStatsTimer() {
  if (statsTimer == null) return;
  window.clearInterval(statsTimer);
  statsTimer = null;
}

async function pingActivity() {
  try {
    await emit(PET_MENU_ACTIVITY_EVENT, null);
  } catch {
    // ignore
  }
}

function onActivity() {
  void pingActivity();
}

async function publishLayout(expanded: boolean) {
  await nextTick();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  const el = rootEl.value;
  const measured = el ? Math.ceil(el.scrollHeight) : 0;
  const height = Math.max(petMenuHeight(expanded), measured);
  try {
    await emit(PET_MENU_LAYOUT_EVENT, { expanded, height });
  } catch {
    // ignore
  }
}

async function refreshStats(gen: number) {
  try {
    const s = await getSystemStats();
    if (gen !== statsGen) return;
    cpuPct.value = s.cpuPercent;
    memPct.value = s.memoryPercent;
    diskPct.value = s.diskPercent;
    netPct.value = s.networkPercent;
    statsReady.value = true;
  } catch {
    if (gen !== statsGen) return;
    statsReady.value = false;
  }
}

function startStatsWatch() {
  clearStatsTimer();
  const gen = ++statsGen;
  void refreshStats(gen);
  statsTimer = window.setInterval(() => {
    void refreshStats(gen);
  }, 1500);
}

function stopStatsWatch() {
  statsGen += 1;
  clearStatsTimer();
  statsReady.value = false;
}

function toggleStats() {
  statsExpanded.value = !statsExpanded.value;
  void pingActivity();
  if (statsExpanded.value) {
    refreshMoyuLine();
    startStatsWatch();
  } else stopStatsWatch();
  void publishLayout(statsExpanded.value);
}

function applyPayload(payload: PetMenuPayload) {
  appLocale.value = getPetLocale();
  chatEnabled.value = Boolean(payload.chatEnabled);
  peekHidden.value = Boolean(payload.peekHidden);
  skyOnPet.value = Boolean(payload.skyOnPet);
  statsExpanded.value = Boolean(payload.statsExpandDefault);
  refreshMoyuLine();
  visible.value = true;
  void pingActivity();
  void publishLayout(statsExpanded.value);
  if (statsExpanded.value) startStatsWatch();
  else stopStatsWatch();
}

async function emitAction(action: PetMenuAction) {
  visible.value = false;
  stopStatsWatch();
  try {
    await emit(PET_MENU_ACTION_EVENT, { action });
  } catch {
    // ignore
  }
}

onMounted(async () => {
  unlistenShow = await listen<PetMenuPayload>(PET_MENU_SHOW_EVENT, (ev) => {
    applyPayload(ev.payload);
  });
  unlistenHide = await listen(PET_MENU_HIDE_EVENT, () => {
    visible.value = false;
    stopStatsWatch();
  });
  unlistenLocale = await listen<{ locale?: string }>(PET_LOCALE_EVENT, (ev) => {
    const next = ev.payload?.locale;
    appLocale.value = isPetLocale(next) ? next : getPetLocale();
  });
});

onUnmounted(() => {
  unlistenShow?.();
  unlistenHide?.();
  unlistenLocale?.();
  stopStatsWatch();
});
</script>

<style>
html,
body,
#menu-app {
  background: transparent !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>

<style scoped>
.theme-root {
  width: 100%;
  height: 100%;
  background: transparent;
}

.pet-ctx-menu {
  width: 100%;
  height: auto;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.14));
  background:
    radial-gradient(
      120% 80% at 10% 0%,
      color-mix(in srgb, var(--ui-primary, #40c4ff) 18%, transparent),
      transparent 55%
    ),
    color-mix(in srgb, var(--ui-surface-strong, #0c1016) 94%, transparent);
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.38);
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-sizing: border-box;
  color: var(--ui-text, rgba(255, 255, 255, 0.92));
}

.pet-ctx-stats-toggle {
  appearance: none;
  border: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  background: var(--ui-accent-soft, rgba(255, 255, 255, 0.04));
  color: var(--ui-text, rgba(255, 255, 255, 0.92));
  transition: background 0.18s ease;
}

.pet-ctx-stats-toggle:hover {
  background: color-mix(in srgb, var(--ui-primary, #40c4ff) 22%, transparent);
}

.pet-ctx-stats-emoji {
  font-size: 16px;
  line-height: 1;
  filter: saturate(1.15);
}

.pet-ctx-stats-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.pet-ctx-stats-name {
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.01em;
}

.pet-ctx-stats-hint {
  font-size: 10px;
  color: var(--ui-text-faint, rgba(255, 255, 255, 0.48));
}

.pet-ctx-stats-chevron {
  font-size: 11px;
  color: var(--ui-text-faint, rgba(255, 255, 255, 0.45));
  transition: transform 0.2s ease;
}

.pet-ctx-stats-toggle.open .pet-ctx-stats-chevron {
  transform: rotate(180deg);
  color: var(--ui-primary, #9fe4ff);
}

.pet-ctx-stats-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 2px 2px 4px;
  padding: 8px 6px 8px;
  border-radius: 8px;
  background: color-mix(
    in srgb,
    var(--ui-surface-strong, #0c1016) 82%,
    var(--ui-accent-soft, rgba(255, 255, 255, 0.06))
  );
  animation: pet-stats-pop 0.22s ease-out;
}

.pet-ctx-moyu-line {
  font-size: 11px;
  font-weight: 560;
  line-height: 1.35;
  letter-spacing: 0.01em;
  color: var(--ui-text-muted, rgba(255, 255, 255, 0.72));
  text-align: center;
  padding: 0 4px 2px;
}

.pet-ctx-meters {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: stretch;
  min-height: 44px;
}

.pet-ctx-meter {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 2px 4px;
  animation: pet-meter-in 0.28s ease both;
}

.pet-ctx-meter:not(:last-child)::after {
  content: "";
  position: absolute;
  right: 0;
  top: 12%;
  bottom: 12%;
  width: 1px;
  background: var(--ui-border, rgba(255, 255, 255, 0.12));
}

.pet-ctx-meter-value {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.15;
  color: var(--ui-text, rgba(255, 255, 255, 0.95));
  font-variant-numeric: tabular-nums;
}

.pet-ctx-meter-label {
  font-size: 11px;
  font-weight: 560;
  line-height: 1.1;
  color: var(--ui-text-muted, rgba(255, 255, 255, 0.72));
  letter-spacing: 0.02em;
}

.pet-ctx-meter.tone-cpu .pet-ctx-meter-value {
  color: color-mix(in srgb, #b45309 78%, var(--ui-text, #1a1a1a));
}
.pet-ctx-meter.tone-cpu .pet-ctx-meter-label {
  color: color-mix(in srgb, #b45309 55%, var(--ui-text-muted, #555));
}
.pet-ctx-meter.tone-mem .pet-ctx-meter-value {
  color: color-mix(in srgb, var(--ui-primary, #2563eb) 45%, var(--ui-text, #1a1a1a));
}
.pet-ctx-meter.tone-mem .pet-ctx-meter-label {
  color: color-mix(in srgb, var(--ui-primary, #2563eb) 40%, var(--ui-text-muted, #555));
}
.pet-ctx-meter.tone-disk .pet-ctx-meter-value {
  color: color-mix(in srgb, #15803d 78%, var(--ui-text, #1a1a1a));
}
.pet-ctx-meter.tone-disk .pet-ctx-meter-label {
  color: color-mix(in srgb, #15803d 55%, var(--ui-text-muted, #555));
}
.pet-ctx-meter.tone-net .pet-ctx-meter-value {
  color: color-mix(in srgb, #6d28d9 72%, var(--ui-text, #1a1a1a));
}
.pet-ctx-meter.tone-net .pet-ctx-meter-label {
  color: color-mix(in srgb, #6d28d9 50%, var(--ui-text-muted, #555));
}

.pet-ctx-meter.hot .pet-ctx-meter-value {
  animation: pet-hot-pulse 1.1s ease-in-out infinite;
}

.pet-ctx-divider {
  height: 1px;
  margin: 5px 8px;
  background: var(--ui-border, rgba(255, 255, 255, 0.1));
}

.pet-ctx-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.pet-ctx-group-label {
  padding: 2px 10px 4px;
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.12em;
  color: var(--ui-text-faint, rgba(255, 255, 255, 0.42));
}

.pet-ctx-item {
  appearance: none;
  border: 0;
  width: 100%;
  background: transparent;
  color: var(--ui-text, rgba(255, 255, 255, 0.9));
  font-size: 12px;
  text-align: left;
  padding: 8px 10px;
  border-radius: 7px;
  cursor: pointer;
  line-height: 1.25;
}

.pet-ctx-item--switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pet-ctx-switch {
  position: relative;
  flex: 0 0 auto;
  width: 28px;
  height: 16px;
  border-radius: var(--sw-radius, 999px);
  background: color-mix(in srgb, var(--ui-text, #fff) 16%, transparent);
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, var(--ui-text, #fff) 12%, transparent);
  transition: background 0.16s ease;
}

.pet-ctx-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: var(--sw-knob-radius, 999px);
  background: color-mix(in srgb, var(--ui-text, #fff) 88%, transparent);
  transition: transform 0.16s ease, background 0.16s ease;
}

.pet-ctx-switch[data-on="1"] {
  background: color-mix(in srgb, var(--ui-primary, #40c4ff) 55%, transparent);
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, var(--ui-primary, #40c4ff) 35%, transparent);
}

.pet-ctx-switch[data-on="1"] .pet-ctx-switch-knob {
  transform: translateX(12px);
  background: var(--ui-primary, #9fe4ff);
}

.pet-ctx-item:hover {
  background: color-mix(in srgb, var(--ui-primary, #40c4ff) 22%, transparent);
  color: var(--ui-primary, #9fe4ff);
}

@keyframes pet-stats-pop {
  from {
    opacity: 0;
    transform: translateY(-4px) scaleY(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes pet-meter-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes pet-hot-pulse {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.25);
  }
}
</style>
