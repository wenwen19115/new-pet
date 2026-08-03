<template>
  <div class="meter-row" @dblclick="$emit('dblclick', $event)">
    <div
      ref="trackEl"
      class="meter-track"
      role="slider"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="value"
      :aria-label="ariaLabel"
      tabindex="0"
      @pointerdown="onPointerDown"
      @keydown="onKeydown"
    >
      <div class="theme-bar">
        <i :style="{ width: `${fillPercent}%` }" />
      </div>
    </div>
    <span v-if="$slots.default" class="theme-num"><slot /></span>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";

const props = withDefaults(
  defineProps<{
    value: number;
    min?: number;
    max?: number;
    step?: number;
    /** zoom 等非线性映射时自算填条比例 */
    fillPercent?: number;
    ariaLabel?: string;
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
  }
);

const emit = defineEmits<{
  change: [number];
  dblclick: [MouseEvent];
}>();

const trackEl = ref<HTMLElement | null>(null);
let dragging = false;
let activePointerId: number | null = null;

const fillPercent = computed(() => {
  if (typeof props.fillPercent === "number" && Number.isFinite(props.fillPercent)) {
    return Math.min(100, Math.max(0, props.fillPercent));
  }
  const span = props.max - props.min;
  if (span <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, ((props.value - props.min) / span) * 100)
  );
});

function clampStepped(raw: number): number {
  const { min, max, step } = props;
  if (!Number.isFinite(raw)) return props.value;
  const stepped =
    step > 0 ? Math.round((raw - min) / step) * step + min : raw;
  const rounded = Math.round(stepped * 1000) / 1000;
  return Math.min(max, Math.max(min, rounded));
}

function valueFromClientX(clientX: number): number {
  const el = trackEl.value;
  if (!el) return props.value;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0) return props.value;
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return clampStepped(props.min + ratio * (props.max - props.min));
}

function commit(next: number) {
  if (next === props.value) return;
  emit("change", next);
}

function clearDragListeners() {
  const el = trackEl.value;
  dragging = false;
  if (el && activePointerId != null) {
    try {
      el.releasePointerCapture(activePointerId);
    } catch {
      // capture 可能已释放
    }
  }
  activePointerId = null;
  if (!el) return;
  el.removeEventListener("pointermove", onPointerMove);
  el.removeEventListener("pointerup", onPointerUp);
  el.removeEventListener("pointercancel", onPointerUp);
}

function onPointerDown(ev: PointerEvent) {
  if (ev.button !== 0) return;
  const el = trackEl.value;
  if (!el) return;
  dragging = true;
  activePointerId = ev.pointerId;
  el.setPointerCapture(ev.pointerId);
  commit(valueFromClientX(ev.clientX));
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerUp);
}

function onPointerMove(ev: PointerEvent) {
  if (!dragging) return;
  commit(valueFromClientX(ev.clientX));
}

function onPointerUp() {
  clearDragListeners();
}

function onKeydown(ev: KeyboardEvent) {
  const { min, max, step, value } = props;
  let next = value;
  if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") {
    next = value - step;
  } else if (ev.key === "ArrowRight" || ev.key === "ArrowUp") {
    next = value + step;
  } else if (ev.key === "Home") {
    next = min;
  } else if (ev.key === "End") {
    next = max;
  } else {
    return;
  }
  ev.preventDefault();
  commit(clampStepped(next));
}

onUnmounted(clearDragListeners);
</script>
