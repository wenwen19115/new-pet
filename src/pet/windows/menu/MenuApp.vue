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

    <div class="pet-ctx-divider" />
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
    <button
      type="button"
      class="pet-ctx-item"
      @click="emitAction(peekHidden ? 'reveal' : 'hide')"
    >
      {{ peekLabel }}
    </button>
  </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getPetLocale } from "@/pet/bridge/locale";
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
import { formatStatPercent, getSystemStats } from "@/pet/bridge/systemStats";
import "@/theme";
import { usePetWindowTheme } from "@/theme";

const { theme, themeVars } = usePetWindowTheme();

const rootEl = ref<HTMLElement | null>(null);
const visible = ref(false);
const statsExpanded = ref(false);
const chatEnabled = ref(false);
const peekHidden = ref(false);
const cpuPct = ref(0);
const memPct = ref(0);
const diskPct = ref(0);
const netPct = ref(0);
const statsReady = ref(false);

const en = computed(() => getPetLocale() === "en");

const openLabel = computed(() =>
  en.value ? "Open settings" : "打开设置"
);
const pinLabel = computed(() =>
  en.value ? "Pin settings on top" : "置顶设置页"
);
const chatLabel = computed(() =>
  chatEnabled.value ? (en.value ? "Chat" : "聊天") : ""
);
const peekLabel = computed(() => {
  if (peekHidden.value) return en.value ? "Come out" : "出来";
  return en.value ? "Hide away" : "躲起来";
});

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
  void publishLayout(statsExpanded.value);
  if (statsExpanded.value) startStatsWatch();
  else stopStatsWatch();
}

function applyPayload(payload: PetMenuPayload) {
  chatEnabled.value = Boolean(payload.chatEnabled);
  peekHidden.value = Boolean(payload.peekHidden);
  statsExpanded.value = Boolean(payload.statsExpandDefault);
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
});

onUnmounted(() => {
  unlistenShow?.();
  unlistenHide?.();
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
  padding: 5px;
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
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: stretch;
  margin: 2px 2px 4px;
  padding: 8px 2px 8px;
  min-height: 52px;
  border-radius: 8px;
  background: var(--ui-accent-soft, rgba(255, 255, 255, 0.04));
  animation: pet-stats-pop 0.22s ease-out;
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
  background: rgba(255, 255, 255, 0.12);
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
  color: #ffd39a;
}
.pet-ctx-meter.tone-cpu .pet-ctx-meter-label {
  color: rgba(255, 211, 154, 0.78);
}
.pet-ctx-meter.tone-mem .pet-ctx-meter-value {
  color: var(--ui-primary, #9fe4ff);
}
.pet-ctx-meter.tone-mem .pet-ctx-meter-label {
  color: color-mix(in srgb, var(--ui-primary, #9fe4ff) 78%, transparent);
}
.pet-ctx-meter.tone-disk .pet-ctx-meter-value {
  color: #b8f0c0;
}
.pet-ctx-meter.tone-disk .pet-ctx-meter-label {
  color: rgba(184, 240, 192, 0.78);
}
.pet-ctx-meter.tone-net .pet-ctx-meter-value {
  color: #d2c4ff;
}
.pet-ctx-meter.tone-net .pet-ctx-meter-label {
  color: rgba(210, 196, 255, 0.78);
}

.pet-ctx-meter.hot .pet-ctx-meter-value {
  animation: pet-hot-pulse 1.1s ease-in-out infinite;
}

.pet-ctx-divider {
  height: 1px;
  margin: 2px 6px 4px;
  background: var(--ui-border, rgba(255, 255, 255, 0.1));
}

.pet-ctx-item {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--ui-text, rgba(255, 255, 255, 0.9));
  font-size: 12px;
  text-align: left;
  padding: 8px 10px;
  border-radius: 7px;
  cursor: pointer;
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
