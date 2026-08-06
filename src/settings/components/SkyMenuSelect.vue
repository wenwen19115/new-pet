<template>
  <div
    ref="rootEl"
    class="sky-menu-select"
    :data-open="open ? '1' : '0'"
  >
    <button
      type="button"
      class="sky-menu-select-trigger"
      :aria-expanded="open"
      :aria-label="ariaLabel"
      :aria-busy="busy ? 'true' : 'false'"
      :disabled="disabled"
      @click.stop.prevent="onToggle"
    >
      <span class="sky-menu-select-label">{{ label }}</span>
      <span
        v-if="!hideCaret"
        class="sky-menu-select-caret"
        aria-hidden="true"
      />
    </button>
    <Teleport to="body">
      <div
        v-if="open"
        ref="panelEl"
        class="sky-menu-select-panel"
        role="listbox"
        :style="panelStyle"
        @pointerdown.stop
      >
        <button
          v-for="opt in options"
          :key="String(opt.value)"
          type="button"
          class="sky-menu-select-opt"
          role="option"
          :aria-selected="modelValue === opt.value"
          :data-active="modelValue === opt.value ? '1' : '0'"
          @pointerdown.stop
          @click.stop.prevent="onPick(String(opt.value))"
        >
          {{ opt.label }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onUnmounted,
  ref,
  watch,
  type CSSProperties,
} from "vue";

const props = defineProps<{
  open: boolean;
  label: string;
  options: Array<{ value: string; label: string }>;
  modelValue: string;
  ariaLabel?: string;
  disabled?: boolean;
  busy?: boolean;
  /** 只读展示时隐藏下拉箭头，外形与可点状态同槽 */
  hideCaret?: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
  pick: [value: string];
}>();

const rootEl = ref<HTMLElement | null>(null);
const panelEl = ref<HTMLElement | null>(null);
const geom = ref({ top: 0, left: 0, width: 220, maxHeight: 220 });
const themeVars = ref<CSSProperties>({});
/** 打开后一帧再听外部点击，避免同一次 click 立刻关掉 */
let outsideBound = false;
let outsideArmTimer: ReturnType<typeof setTimeout> | null = null;

function clearOutsideArmTimer() {
  if (!outsideArmTimer) return;
  clearTimeout(outsideArmTimer);
  outsideArmTimer = null;
}

const panelStyle = computed(
  (): CSSProperties => ({
    position: "fixed",
    top: `${geom.value.top}px`,
    left: `${geom.value.left}px`,
    width: `${geom.value.width}px`,
    maxHeight: `${geom.value.maxHeight}px`,
    zIndex: 20000,
    ...themeVars.value,
  })
);

function layoutPanel() {
  const root = rootEl.value;
  if (!root) return;
  const trigger = root.querySelector(
    ".sky-menu-select-trigger"
  ) as HTMLElement | null;
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  const gap = 4;
  const pad = 8;
  const below = Math.floor(window.innerHeight - rect.bottom - gap - pad);
  const above = Math.floor(rect.top - gap - pad);
  const preferDown = below >= 120 || below >= above;
  const avail = Math.max(96, preferDown ? below : above);
  const cap = Math.floor(window.innerHeight * 0.45);
  const maxHeight = Math.min(cap, avail);
  const width = Math.max(160, Math.round(rect.width));
  const left = Math.min(
    Math.max(pad, Math.round(rect.left)),
    Math.max(pad, window.innerWidth - width - pad)
  );
  const top = preferDown
    ? Math.round(rect.bottom + gap)
    : Math.max(pad, Math.round(rect.top - gap - maxHeight));
  geom.value = { top, left, width, maxHeight };

  const stage = document.querySelector(".app-root") as HTMLElement | null;
  if (stage) {
    const cs = getComputedStyle(stage);
    themeVars.value = {
      color: cs.getPropertyValue("--ui-text").trim() || "#e8dcc8",
      borderColor: cs.getPropertyValue("--ui-border").trim() || "#5a4838",
      background:
        cs.getPropertyValue("--ui-surface-strong").trim() ||
        cs.getPropertyValue("--ui-surface").trim() ||
        "#1a140e",
    };
  }
}

function onToggle() {
  if (props.disabled) return;
  emit("toggle");
}

function onPick(value: string) {
  emit("pick", value);
}

function onOutsidePointerDown(e: PointerEvent) {
  if (!props.open) return;
  const t = e.target as Node | null;
  if (!t) return;
  if (panelEl.value?.contains(t)) return;
  if (rootEl.value?.contains(t)) return;
  emit("toggle");
}

function bindOutside() {
  if (outsideBound) return;
  outsideBound = true;
  document.addEventListener("pointerdown", onOutsidePointerDown, true);
}

function unbindOutside() {
  if (!outsideBound) return;
  outsideBound = false;
  document.removeEventListener("pointerdown", onOutsidePointerDown, true);
}

function onRelayout() {
  if (!props.open) return;
  layoutPanel();
}

watch(
  () => props.open,
  async (on) => {
    clearOutsideArmTimer();
    unbindOutside();
    if (!on) return;
    layoutPanel();
    await nextTick();
    layoutPanel();
    // 等掉打开那次 click 的残余事件
    outsideArmTimer = setTimeout(() => {
      outsideArmTimer = null;
      if (props.open) bindOutside();
    }, 0);
  }
);

window.addEventListener("resize", onRelayout);
window.addEventListener("scroll", onRelayout, true);
onUnmounted(() => {
  clearOutsideArmTimer();
  unbindOutside();
  window.removeEventListener("resize", onRelayout);
  window.removeEventListener("scroll", onRelayout, true);
});
</script>

<style>
.sky-menu-select {
  position: relative;
  width: min(240px, 100%);
}

.sky-menu-select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.14));
  background: var(--ui-surface-strong, var(--ui-surface, #16120c));
  color: var(--ui-text, rgba(255, 255, 255, 0.92));
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
}

.sky-menu-select-trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.sky-menu-select-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sky-menu-select-caret {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid var(--ui-text-muted, rgba(255, 255, 255, 0.45));
  flex: 0 0 auto;
  transition: transform 0.15s ease;
}

.sky-menu-select[data-open="1"] .sky-menu-select-caret {
  transform: rotate(180deg);
}

.sky-menu-select-panel {
  overflow: auto;
  overscroll-behavior: contain;
  border-radius: 8px;
  border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.14));
  background: var(--ui-surface-strong, #1a140e);
  color: var(--ui-text, rgba(255, 255, 255, 0.92));
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  padding: 4px;
  box-sizing: border-box;
}

.sky-menu-select-opt {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  text-align: left;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
}

.sky-menu-select-opt:hover,
.sky-menu-select-opt[data-active="1"] {
  background: color-mix(in srgb, var(--ui-primary, #c9a227) 22%, transparent);
}
</style>
