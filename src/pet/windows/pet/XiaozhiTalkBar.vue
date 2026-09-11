<template>
  <div
    v-if="visible"
    class="xz-talk"
    :data-phase="phase"
    :data-revealed="revealed ? '1' : '0'"
    :data-click-toggle="clickToggle ? '1' : '0'"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onLostCapture"
    @lostpointercapture="onLostCapture"
  >
    <div class="xz-talk-inner">
      <span class="xz-dot" aria-hidden="true" />
      <div class="xz-talk-copy">
        <template v-if="phase === 'need_bind' || phase === 'binding'">
          <strong v-if="bindCode" class="xz-code">{{ bindCode }}</strong>
          <span class="xz-line">{{ bindLine }}</span>
        </template>
        <template v-else-if="phase === 'error'">
          <span class="xz-line xz-err" :title="errorText || errorFallback">
            {{ errorText || errorFallback }}
          </span>
        </template>
        <template v-else>
          <span class="xz-line" :title="primaryLine">{{ primaryLine }}</span>
        </template>
      </div>
      <span class="xz-hint">{{ hintLine }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { getPetLocale } from "@/pet/bridge/locale";
import type { XiaozhiTalkUiPhase } from "@/pet/runtime/useXiaozhiPetVoice";

const props = defineProps<{
  visible: boolean;
  revealed: boolean;
  phase: XiaozhiTalkUiPhase;
  bindCode: string;
  bindHint: string;
  errorText: string;
  statusText: string;
  clickToggle: boolean;
  hotkeyLabel: string;
}>();

const emit = defineEmits<{
  pointerdown: [ev: PointerEvent];
  pointerup: [ev: PointerEvent];
}>();

const en = computed(() => getPetLocale() === "en");

const bindLine = computed(() => {
  if (props.bindCode) {
    return en.value
      ? "Enter this code at xiaozhi.me"
      : "到 xiaozhi.me 输入此验证码";
  }
  if (props.phase === "binding") {
    return en.value ? "Fetching activation code…" : "正在获取验证码…";
  }
  return en.value ? "Add device at xiaozhi.me" : "到 xiaozhi.me 添加设备";
});

const errorFallback = computed(() =>
  en.value ? "Xiaozhi error — try again later" : "小智出错，请稍后重试"
);

/** 条上只留一行状态，听写/回答长文走气泡，避免双行裁切 */
const primaryLine = computed(() => {
  switch (props.phase) {
    case "connecting":
      return en.value ? "Connecting…" : "连接中…";
    case "listening":
      return en.value ? "Listening…" : "正在听…";
    case "speaking":
      return en.value ? "Speaking…" : "回答中…";
    case "ready":
    case "idle":
    default:
      return en.value ? "Hold to talk" : "按住说话";
  }
});

const hintLine = computed(() => {
  if (props.phase === "need_bind" || props.phase === "binding") {
    return "xiaozhi.me";
  }
  if (props.clickToggle) {
    return props.phase === "listening"
      ? en.value
        ? "Click stop"
        : "单击结束"
      : en.value
        ? "Click start"
        : "单击开麦";
  }
  if (props.phase === "listening" || props.phase === "speaking") {
    return en.value ? "Release to stop" : "松开结束";
  }
  return props.hotkeyLabel || "Alt+Space";
});

function onPointerDown(ev: PointerEvent) {
  emit("pointerdown", ev);
}
function onPointerUp(ev: PointerEvent) {
  emit("pointerup", ev);
}
function onLostCapture(ev: PointerEvent) {
  // 交给 runtime：仍按着则夺回 capture，否则当松手
  emit("pointerup", ev);
}
</script>

<style scoped>
.xz-talk {
  position: absolute;
  left: 50%;
  /* 贴脚下：跟身位高度走；宽高固定，不随 zoom 变胖 */
  top: calc(50% + var(--pet-body-h, 108px) / 2 + 8px);
  transform: translateX(-50%);
  z-index: 8;
  width: min(calc(100% - 12px), 248px);
  height: 40px;
  pointer-events: auto;
  cursor: pointer;
  user-select: none;
  touch-action: none;
  border-radius: 14px;
  color: var(--ui-text, #0f172a);
  background: color-mix(
    in srgb,
    var(--ui-surface, #ffffff) 88%,
    var(--ui-primary, #2563eb) 12%
  );
  border: 1px solid
    color-mix(in srgb, var(--ui-primary, #2563eb) 40%, rgba(15, 23, 42, 0.2));
  box-shadow:
    0 8px 22px rgba(15, 23, 42, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition:
    opacity 420ms ease,
    transform 420ms ease,
    background 160ms ease,
    border-color 160ms ease;
}

.xz-talk[data-revealed="0"] {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
  pointer-events: none;
}

.xz-talk:hover {
  border-color: color-mix(in srgb, var(--ui-primary, #2563eb) 55%, transparent);
}

.xz-talk[data-revealed="1"]:hover {
  transform: translateX(-50%) translateY(-1px);
}

.xz-talk[data-phase="listening"],
.xz-talk[data-phase="speaking"] {
  background: color-mix(
    in srgb,
    var(--ui-primary, #2563eb) 28%,
    var(--ui-surface, #fff) 72%
  );
}

.xz-talk[data-phase="need_bind"],
.xz-talk[data-phase="binding"] {
  background: color-mix(in srgb, #f59e0b 22%, var(--ui-surface, #fff) 78%);
  border-color: color-mix(in srgb, #f59e0b 45%, transparent);
}

.xz-talk[data-phase="error"] {
  background: color-mix(in srgb, #ef4444 18%, var(--ui-surface, #fff) 82%);
  border-color: color-mix(in srgb, #ef4444 40%, transparent);
}

.xz-talk-inner {
  height: 100%;
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 0 12px 0 12px;
}

.xz-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ui-primary, #2563eb);
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--ui-primary, #2563eb) 22%, transparent);
  flex-shrink: 0;
}

.xz-talk[data-phase="listening"] .xz-dot {
  animation: xz-pulse 1s ease-in-out infinite;
}

.xz-talk[data-phase="speaking"] .xz-dot {
  background: #10b981;
  box-shadow: 0 0 0 3px color-mix(in srgb, #10b981 25%, transparent);
}

.xz-talk[data-phase="need_bind"] .xz-dot,
.xz-talk[data-phase="binding"] .xz-dot {
  background: #f59e0b;
  box-shadow: 0 0 0 3px color-mix(in srgb, #f59e0b 28%, transparent);
}

.xz-talk-copy {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.xz-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 14px;
  letter-spacing: 0.12em;
  line-height: 1;
  color: #92400e;
  flex-shrink: 0;
}

.xz-line {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.xz-err {
  color: #b91c1c;
}

.xz-hint {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.7;
  white-space: nowrap;
  flex-shrink: 0;
  padding-left: 2px;
}

.xz-talk[data-phase="listening"] .xz-hint,
.xz-talk[data-phase="speaking"] .xz-hint {
  opacity: 0.85;
}

@keyframes xz-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.25);
    opacity: 0.7;
  }
}
</style>
