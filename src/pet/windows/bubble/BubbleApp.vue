<template>
  <div class="theme-root" :data-style="theme.style" :style="themeVars">
    <div
      v-if="visible"
      class="bubble"
      :class="{ 'is-squish': squishOn }"
      :data-tone="tone"
      :data-side="side"
      @pointerdown.prevent="onPong"
    >
      <div class="bubble-inner">
        <p class="text">
          <span>{{ displayText }}</span>
          <span v-if="typing" class="caret">▌</span>
        </p>
        <i class="bubble-tail" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  PET_BUBBLE_EVENT,
  PET_BUBBLE_HIDE_EVENT,
  PET_BUBBLE_PONG_EVENT,
  type PetBubblePayload,
} from "@/pet/events";
import type { PetTone } from "@/pet/data/types";
import { readBubblePayloadRaw } from "@/pet/data/storageKeys";
import {
  advanceBubblePongTap,
  BUBBLE_PONG_HOLD_MS,
} from "./bubblePong";
import "@/theme";
import { usePetWindowTheme } from "@/theme";

const { theme, themeVars } = usePetWindowTheme();

const visible = ref(false);
const displayText = ref("");
const tone = ref<PetTone>("cute");
const side = ref<"left" | "right">("right");
const typing = ref(false);
const squishOn = ref(false);

let hideTimer: number | null = null;
let typeTimer: number | null = null;
let pollTimer: number | null = null;
let lastAppliedAt = 0;
let pongTaps = 0;
let unlistenShow: UnlistenFn | null = null;
let unlistenHide: UnlistenFn | null = null;

function clearHideTimer() {
  if (hideTimer != null) window.clearTimeout(hideTimer);
  hideTimer = null;
}

function clearTypeTimer() {
  if (typeTimer != null) window.clearTimeout(typeTimer);
  typeTimer = null;
}

function scheduleHide(holdMs: number) {
  clearHideTimer();
  hideTimer = window.setTimeout(async () => {
    visible.value = false;
    squishOn.value = false;
    pongTaps = 0;
    try {
      await getCurrentWindow().hide();
    } catch {
      // ignore
    }
  }, holdMs);
}

function charDelay(ch: string): number {
  if (/[，。！？、；：…~～]/.test(ch)) return 140;
  if (/[,.!?;:]/.test(ch)) return 110;
  if (/\s/.test(ch)) return 24;
  if (/[^\u0000-\u00ff]/.test(ch)) return 38;
  return 22;
}

function typeOut(full: string, holdMs: number) {
  clearTypeTimer();
  displayText.value = "";
  typing.value = true;
  let i = 0;

  const step = () => {
    if (i >= full.length) {
      typing.value = false;
      scheduleHide(holdMs);
      return;
    }
    const ch = full[i++];
    displayText.value += ch;
    typeTimer = window.setTimeout(step, charDelay(ch));
  };
  step();
}

async function applyPayload(payload: PetBubblePayload & { at?: number }) {
  const at = payload.at ?? Date.now();
  // 同一条消息（含补发）只开播一次；补发必须带相同 at
  if (at <= lastAppliedAt) return;
  lastAppliedAt = at;

  tone.value = payload.tone;
  side.value = payload.side;
  visible.value = true;
  squishOn.value = false;
  pongTaps = 0;
  clearHideTimer();

  const hold = Math.max(900, payload.durationMs - payload.text.length * 30);
  typeOut(payload.text, hold);
}

function tryReadStorage() {
  try {
    const raw = readBubblePayloadRaw();
    if (!raw) return;
    const payload = JSON.parse(raw) as PetBubblePayload & { at?: number };
    if (!payload?.text) return;
    if (payload.at && Date.now() - payload.at > 1500) return;
    void applyPayload(payload);
  } catch {
    // ignore
  }
}

function startPoll() {
  if (pollTimer != null) return;
  tryReadStorage();
  pollTimer = window.setInterval(tryReadStorage, 150);
}

function stopPoll() {
  if (pollTimer == null) return;
  window.clearInterval(pollTimer);
  pollTimer = null;
}

function onVisibilityChange() {
  if (document.visibilityState === "hidden") {
    stopPoll();
  } else if (visible.value) {
    startPoll();
  }
}

function playSquish() {
  squishOn.value = false;
  requestAnimationFrame(() => {
    squishOn.value = true;
  });
}

function onPong() {
  if (!visible.value) return;
  playSquish();
  scheduleHide(BUBBLE_PONG_HOLD_MS);

  const outcome = advanceBubblePongTap(pongTaps);
  pongTaps = outcome.taps;
  if (outcome.annoyed) void emit(PET_BUBBLE_PONG_EVENT);
}

onMounted(async () => {
  document.documentElement.style.background = "transparent";
  document.body.style.background = "transparent";
  document.documentElement.style.setProperty("background", "transparent", "important");
  document.body.style.setProperty("background", "transparent", "important");

  try {
    await getCurrentWindow().setShadow(false);
  } catch {
    // ignore
  }

  document.addEventListener("visibilitychange", onVisibilityChange);

  unlistenShow = await listen<PetBubblePayload>(PET_BUBBLE_EVENT, (e) => {
    startPoll();
    void applyPayload(e.payload);
  });
  unlistenHide = await listen(PET_BUBBLE_HIDE_EVENT, async () => {
    visible.value = false;
    typing.value = false;
    squishOn.value = false;
    pongTaps = 0;
    clearHideTimer();
    clearTypeTimer();
    stopPoll();
    try {
      await getCurrentWindow().hide();
    } catch {
      // ignore
    }
  });

  startPoll();
});

onUnmounted(() => {
  document.removeEventListener("visibilitychange", onVisibilityChange);
  clearHideTimer();
  clearTypeTimer();
  stopPoll();
  unlistenShow?.();
  unlistenHide?.();
});
</script>

<style>
html,
body,
#bubble-app {
  background: transparent !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}
</style>

<style scoped>
.theme-root {
  width: 100%;
  height: 100%;
  background: transparent;
}

.bubble {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 10px 12px 10px 14px;
  position: relative;
  background: transparent;
  animation: pop 0.28s cubic-bezier(0.22, 1.35, 0.36, 1);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.bubble-inner {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 12px 14px 13px;
  overflow: visible;
  display: flex;
  align-items: center;
  transform-origin: center center;
}

.bubble.is-squish .bubble-inner {
  animation: jelly-squish 0.42s cubic-bezier(0.33, 1.35, 0.48, 1) both;
}

.bubble[data-tone="snarky"] .bubble-inner {
  --bubble-line: color-mix(
    in srgb,
    #ff8c50 70%,
    var(--ui-primary, #00e5ff)
  );
  --bubble-glow: rgba(255, 140, 80, 0.35);
}

/* 尖角朝向角色 */
.bubble-tail,
.bubble-tail::before {
  content: "";
  position: absolute;
  top: 50%;
  width: 0;
  height: 0;
  transform: translateY(-50%);
  pointer-events: none;
  border-style: solid;
}

.bubble-tail {
  z-index: 1;
}

.bubble-tail::before {
  z-index: 0;
}

.bubble[data-side="right"] .bubble-tail {
  left: -9px;
  border-width: 7px 9px 7px 0;
  border-color: transparent var(--bubble-fill, #0c1016) transparent transparent;
}

.bubble[data-side="right"] .bubble-tail::before {
  left: -2px;
  top: 50%;
  border-width: 9px 11px 9px 0;
  border-color: transparent var(--bubble-line, #7ec8ff) transparent transparent;
}

.bubble[data-side="left"] .bubble-tail {
  right: -9px;
  border-width: 7px 0 7px 9px;
  border-color: transparent transparent transparent var(--bubble-fill, #0c1016);
}

.bubble[data-side="left"] .bubble-tail::before {
  right: -2px;
  left: auto;
  top: 50%;
  border-width: 9px 0 9px 11px;
  border-color: transparent transparent transparent var(--bubble-line, #7ec8ff);
}

.text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--ui-text, rgba(220, 245, 255, 0.95));
  word-break: break-word;
  white-space: pre-wrap;
  font-family: "Noto Sans SC", "Segoe UI", "PingFang SC", "Microsoft YaHei",
    sans-serif;
  letter-spacing: 0.02em;
  pointer-events: none;
}

.caret {
  display: inline-block;
  margin-left: 1px;
  color: var(--ui-primary, rgba(0, 229, 255, 0.85));
  animation: blink 0.8s step-end infinite;
  font-size: 11px;
}

@keyframes jelly-squish {
  0% {
    transform: scale(1, 1);
  }
  22% {
    transform: scale(1.06, 0.9);
  }
  48% {
    transform: scale(0.96, 1.05);
  }
  72% {
    transform: scale(1.02, 0.98);
  }
  100% {
    transform: scale(1, 1);
  }
}

@keyframes pop {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.88);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
