<template>
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
.bubble {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 8px;
  position: relative;
  background: transparent;
  animation: pop 0.2s cubic-bezier(0.22, 1.2, 0.36, 1);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.bubble-inner {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 9px 11px;
  border-radius: 12px;
  background: rgba(8, 14, 22, 0.94);
  border: 1px solid rgba(0, 229, 255, 0.4);
  box-shadow: none;
  overflow: hidden;
  display: flex;
  align-items: center;
  transform-origin: center center;
}

.bubble.is-squish .bubble-inner {
  animation: jelly-squish 0.42s cubic-bezier(0.33, 1.35, 0.48, 1) both;
}

.bubble[data-tone="snarky"] .bubble-inner {
  border-color: rgba(255, 140, 80, 0.45);
}

.bubble::after {
  content: "";
  position: absolute;
  top: 50%;
  width: 8px;
  height: 8px;
  background: rgba(8, 14, 22, 0.94);
  border-left: 1px solid rgba(0, 229, 255, 0.4);
  border-bottom: 1px solid rgba(0, 229, 255, 0.4);
  transform: translateY(-50%) rotate(45deg);
  box-shadow: none;
}

.bubble[data-tone="snarky"]::after {
  border-left-color: rgba(255, 140, 80, 0.45);
  border-bottom-color: rgba(255, 140, 80, 0.45);
}

.bubble[data-side="right"]::after {
  left: 2px;
}

.bubble[data-side="left"]::after {
  right: 2px;
  transform: translateY(-50%) rotate(-135deg);
}

.text {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: rgba(220, 245, 255, 0.95);
  word-break: break-word;
  white-space: pre-wrap;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  letter-spacing: 0.02em;
  pointer-events: none;
}

.caret {
  display: inline-block;
  margin-left: 1px;
  color: rgba(0, 229, 255, 0.85);
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
    transform: scale(0.97);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
