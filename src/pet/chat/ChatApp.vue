<template>
  <div
    v-if="visible"
    class="pet-chat"
    @pointerdown="onActivity"
    @keydown="onActivity"
  >
    <header class="pet-chat-head">
      <div class="pet-chat-title-wrap">
        <span class="pet-chat-title">{{ title }}</span>
        <span class="pet-chat-provider">{{ providerLabel }}</span>
      </div>
      <button
        type="button"
        class="pet-chat-head-btn"
        :title="clearLabel"
        :aria-label="clearLabel"
        :disabled="busy || turns.length === 0"
        @click="clearAll"
      >
        {{ clearShort }}
      </button>
      <button type="button" class="pet-chat-close" :aria-label="closeLabel" @click="close">
        ×
      </button>
    </header>

    <div ref="listEl" class="pet-chat-list" aria-live="polite">
      <div v-if="turns.length === 0 && !busy" class="pet-chat-hint">
        {{ hint }}
      </div>
      <div
        v-for="(m, i) in turns"
        :key="m.id"
        class="pet-chat-row"
        :class="m.role"
      >
        <div
          class="pet-chat-bubble"
          :class="[m.role, { error: m.kind === 'error', clickable: m.kind === 'error' }]"
          @click="m.kind === 'error' ? retryAt(i) : undefined"
        >
          <button
            v-if="m.kind === 'error'"
            type="button"
            class="pet-chat-retry"
            :title="retryLabel"
            :aria-label="retryLabel"
            :disabled="busy"
            @click.stop="retryAt(i)"
          >
            <span class="pet-chat-retry-ring" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                <path
                  d="M13.2 8A5.2 5.2 0 1 1 11.3 3.6"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                />
                <path
                  d="M11.1 1.6v2.7h2.7"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          </button>
          <span class="pet-chat-bubble-text">{{ m.content }}</span>
        </div>
        <div class="pet-chat-meta">
          <span class="pet-chat-time">{{ formatTime(m.ts) }}</span>
          <button
            type="button"
            class="pet-chat-del"
            :title="deleteLabel"
            :aria-label="deleteLabel"
            :disabled="busy"
            @click.stop="removeMessage(m.id)"
          >
            ×
          </button>
        </div>
      </div>
      <div v-if="busy" class="pet-chat-row assistant">
        <div class="pet-chat-bubble assistant" :class="{ pending: !streamText }">
          <span class="pet-chat-bubble-text">{{ streamText || "…" }}</span>
        </div>
      </div>
    </div>

    <form class="pet-chat-compose" @submit.prevent="onComposeSubmit">
      <textarea
        ref="inputEl"
        v-model="draft"
        class="pet-chat-input"
        rows="2"
        :maxlength="inputMax"
        :placeholder="placeholder"
        :disabled="busy"
        autocomplete="off"
        @keydown="onInputKeydown"
      />
      <button
        v-if="busy"
        type="button"
        class="pet-chat-send stop"
        @click="stopGeneration"
      >
        {{ stopLabel }}
      </button>
      <button v-else type="submit" class="pet-chat-send" :disabled="!draft.trim()">
        {{ sendLabel }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { askPetChatAi, PetChatAiError, type ChatTurn } from "./ai";
import {
  appendChatMessages,
  clearChatHistory,
  deleteChatMessage,
  formatChatTime,
  historyEventCharacterId,
  isChatHistoryStorageKey,
  loadChatWindowSlice,
  PET_CHAT_HISTORY_CHANGED,
  PET_CHAT_WINDOW_MAX,
  type PetChatHistoryItem,
} from "./history";
import { loadPetSettings } from "../settings";
import { normalizePetChatAi, type PetChatAiConfig } from "./providers";
import {
  PET_CHAT_ACTIVITY_EVENT,
  PET_CHAT_CLOSE_REQ_EVENT,
  PET_CHAT_HIDE_EVENT,
  PET_CHAT_INPUT_MAX,
  PET_CHAT_REPLY_EVENT,
  PET_CHAT_SHOW_EVENT,
  type PetChatShowPayload,
} from "./types";
import { PET_SETTINGS_EVENT, type PetSettings, type PetTone } from "../types";
import { isPetPersonality, type PetPersonality } from "../personality";
import type { PetModelKind } from "../skins/types";
import { speakPetTts, cancelPetTts } from "../tts";

const visible = ref(false);
const draft = ref("");
const busy = ref(false);
const streamText = ref("");
const turns = ref<PetChatHistoryItem[]>([]);
const listEl = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLTextAreaElement | null>(null);

const petName = ref("桌宠");
const personality = ref<PetPersonality>("sunny");
const tone = ref<PetTone>("cute");
const muted = ref(false);
const ttsEnabled = ref(false);
const ttsVoiceUri = ref("");
const modelKind = ref<PetModelKind>("chip");
const lang = ref<"zh" | "en">("zh");
const chatAi = ref<PetChatAiConfig>(normalizePetChatAi(loadPetSettings().chatAi));

let unlistenShow: UnlistenFn | null = null;
let unlistenHide: UnlistenFn | null = null;
let unlistenSettings: UnlistenFn | null = null;
let abort: AbortController | null = null;
let sessionGen = 0;

const inputMax = PET_CHAT_INPUT_MAX;
const en = computed(() => lang.value === "en");
const title = computed(() =>
  en.value ? `Chat · ${petName.value}` : `聊天 · ${petName.value}`
);
const providerLabel = computed(() => {
  const id = chatAi.value.provider;
  if (en.value) {
    return id === "local" ? "Local" : "DeepSeek";
  }
  return id === "local" ? "本地陪聊" : "DeepSeek";
});
const hint = computed(() =>
  en.value ? "Say something…" : "打字跟我说点什么吧…"
);
const placeholder = computed(() =>
  en.value ? `Message (≤${inputMax})…` : `说点什么（≤${inputMax}字）…`
);
const sendLabel = computed(() => (en.value ? "Send" : "发送"));
const stopLabel = computed(() => (en.value ? "Stop" : "停止"));
const closeLabel = computed(() => (en.value ? "Close" : "关闭"));
const retryLabel = computed(() => (en.value ? "Retry" : "重试"));
const deleteLabel = computed(() => (en.value ? "Delete" : "删除"));
const clearLabel = computed(() =>
  en.value ? "Clear all chat history" : "清除全部聊天记录"
);
const clearShort = computed(() => (en.value ? "Clear" : "清空"));

function formatTime(ts: number) {
  return formatChatTime(ts, lang.value);
}

function characterId() {
  return modelKind.value || "chip";
}

function reloadWindowTurns() {
  turns.value = loadChatWindowSlice(characterId(), PET_CHAT_WINDOW_MAX);
}

function toAiTurns(list: PetChatHistoryItem[]): ChatTurn[] {
  return list.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    kind: m.kind,
    ts: m.ts,
  }));
}

async function pingActivity() {
  try {
    await emit(PET_CHAT_ACTIVITY_EVENT, null);
  } catch {
    // ignore
  }
}

function onActivity() {
  void pingActivity();
}

async function scrollBottom() {
  await nextTick();
  const el = listEl.value;
  if (el) el.scrollTop = el.scrollHeight;
}

function applyPayload(payload: PetChatShowPayload) {
  sessionGen += 1;
  abort?.abort();
  abort = null;
  busy.value = false;
  streamText.value = "";
  cancelPetTts();

  petName.value = payload.petName?.trim() || (payload.lang === "en" ? "Pet" : "桌宠");
  personality.value = isPetPersonality(payload.personality)
    ? payload.personality
    : "sunny";
  tone.value = payload.tone === "snarky" ? "snarky" : "cute";
  muted.value = Boolean(payload.muted);
  ttsEnabled.value = Boolean(payload.ttsEnabled);
  ttsVoiceUri.value =
    typeof payload.ttsVoiceUri === "string" ? payload.ttsVoiceUri : "";
  modelKind.value = (payload.modelKind as PetModelKind) || "chip";
  lang.value = payload.lang === "en" ? "en" : "zh";
  if (payload.chatAi) {
    chatAi.value = normalizePetChatAi(payload.chatAi);
  } else {
    chatAi.value = normalizePetChatAi(loadPetSettings().chatAi);
  }
  draft.value = "";
  reloadWindowTurns();
  visible.value = true;
  void pingActivity();
  void nextTick(() => {
    inputEl.value?.focus();
    void scrollBottom();
  });
}

async function close() {
  visible.value = false;
  abort?.abort();
  abort = null;
  busy.value = false;
  streamText.value = "";
  cancelPetTts();
  try {
    await emit(PET_CHAT_CLOSE_REQ_EVENT, null);
  } catch {
    // ignore
  }
}

async function speakReply(text: string) {
  if (muted.value || !ttsEnabled.value || !text) return;
  try {
    await speakPetTts(text, {
      model: modelKind.value,
      personality: personality.value,
      tone: tone.value,
      voiceUri: ttsVoiceUri.value,
      lang: lang.value,
    });
  } catch (err) {
    console.warn("[pet] chat tts failed", err);
  }
}

async function notifyReply(text: string) {
  try {
    await emit(PET_CHAT_REPLY_EVENT, { text });
  } catch {
    // ignore
  }
}

function stopGeneration() {
  abort?.abort();
}

function clearAll() {
  if (busy.value) return;
  const ok = window.confirm(
    en.value
      ? "Clear chat history for this character? This cannot be undone."
      : "清除当前角色的聊天记录？此操作无法恢复。"
  );
  if (!ok) return;
  clearChatHistory(characterId());
  reloadWindowTurns();
  void pingActivity();
}

async function requestAssistantReply(gen: number) {
  busy.value = true;
  streamText.value = "";
  abort?.abort();
  abort = new AbortController();

  let reply = "";
  let isError = false;
  let aborted = false;
  try {
    reply = await askPetChatAi(
      {
        petName: petName.value,
        personality: personality.value,
        tone: tone.value,
        lang: lang.value,
      },
      toAiTurns(turns.value),
      {
        signal: abort.signal,
        chatAi: chatAi.value,
        onDelta: (text) => {
          if (gen !== sessionGen) return;
          streamText.value = text;
          void scrollBottom();
          void pingActivity();
        },
      }
    );
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") {
      aborted = true;
      reply = streamText.value.trim();
    } else {
      console.warn("[pet] chat ai failed", err);
      isError = true;
      reply =
        err instanceof PetChatAiError
          ? err.message
          : lang.value === "en"
            ? "Chat failed. Check Settings → AI Chat."
            : "对话失败。请到设置 → AI 聊天检查配置。";
    }
  }

  if (gen !== sessionGen) return;
  busy.value = false;
  abort = null;
  streamText.value = "";

  if (aborted && !reply) return;

  appendChatMessages(characterId(), {
    role: "assistant",
    content: reply,
    kind: isError ? "error" : "ok",
  });
  reloadWindowTurns();
  void scrollBottom();
  void pingActivity();
  if (!isError && !aborted) {
    void notifyReply(reply);
    void speakReply(reply);
  }
}

function onInputKeydown(ev: KeyboardEvent) {
  onActivity();
  if (ev.key === "Enter" && !ev.shiftKey) {
    ev.preventDefault();
    void send();
  }
}

function onComposeSubmit() {
  void send();
}

async function send() {
  const text = draft.value.trim().slice(0, inputMax);
  if (!text || busy.value) return;

  draft.value = "";
  appendChatMessages(characterId(), { role: "user", content: text, kind: "ok" });
  reloadWindowTurns();
  void scrollBottom();
  void pingActivity();

  await requestAssistantReply(sessionGen);
}

async function retryAt(errorIndex: number) {
  if (busy.value) return;
  const errTurn = turns.value[errorIndex];
  if (!errTurn || errTurn.kind !== "error") return;

  let userMsg: PetChatHistoryItem | null = null;
  for (let i = errorIndex - 1; i >= 0; i--) {
    if (turns.value[i]?.role === "user") {
      userMsg = turns.value[i]!;
      break;
    }
  }
  if (!userMsg) return;

  deleteChatMessage(characterId(), errTurn.id);
  reloadWindowTurns();
  void scrollBottom();
  void pingActivity();
  await requestAssistantReply(sessionGen);
}

function removeMessage(id: string) {
  if (busy.value) return;
  deleteChatMessage(characterId(), id);
  reloadWindowTurns();
}

function onHistoryChanged(ev?: Event) {
  if (!visible.value) return;
  const cid = historyEventCharacterId(
    ev && "detail" in ev ? (ev as CustomEvent).detail : null
  );
  if (cid && cid !== characterId()) return;
  reloadWindowTurns();
}

function onStorage(ev: StorageEvent) {
  if (!isChatHistoryStorageKey(ev.key)) return;
  onHistoryChanged();
}

onMounted(async () => {
  unlistenShow = await listen<PetChatShowPayload>(PET_CHAT_SHOW_EVENT, (ev) => {
    applyPayload(ev.payload);
  });
  unlistenHide = await listen(PET_CHAT_HIDE_EVENT, () => {
    visible.value = false;
    abort?.abort();
    abort = null;
    busy.value = false;
    streamText.value = "";
    cancelPetTts();
  });
  unlistenSettings = await listen<PetSettings>(PET_SETTINGS_EVENT, (ev) => {
    chatAi.value = normalizePetChatAi(ev.payload?.chatAi);
    const nextKind = ev.payload?.modelKind;
    if (typeof nextKind === "string" && nextKind.trim() && nextKind !== modelKind.value) {
      modelKind.value = nextKind as PetModelKind;
      if (visible.value) reloadWindowTurns();
    }
  });
  window.addEventListener("storage", onStorage);
  window.addEventListener(PET_CHAT_HISTORY_CHANGED, onHistoryChanged);
});

onUnmounted(() => {
  unlistenShow?.();
  unlistenHide?.();
  unlistenSettings?.();
  abort?.abort();
  cancelPetTts();
  window.removeEventListener("storage", onStorage);
  window.removeEventListener(PET_CHAT_HISTORY_CHANGED, onHistoryChanged);
});
</script>

<style scoped>
.pet-chat {
  width: 100%;
  height: 100%;
  padding: 8px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background:
    radial-gradient(120% 80% at 10% 0%, rgba(64, 196, 255, 0.14), transparent 55%),
    rgba(12, 16, 22, 0.94);
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.38);
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
  color: rgba(255, 255, 255, 0.92);
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.pet-chat-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 2px 0;
}

.pet-chat-title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.pet-chat-title {
  min-width: 0;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pet-chat-provider {
  flex: 0 0 auto;
  max-width: 42%;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
  color: #9fe4ff;
  background: rgba(64, 196, 255, 0.16);
  border: 1px solid rgba(64, 196, 255, 0.28);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pet-chat-head-btn {
  appearance: none;
  border: 0;
  height: 24px;
  padding: 0 8px;
  border-radius: 7px;
  background: transparent;
  color: rgba(255, 180, 180, 0.75);
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
}

.pet-chat-head-btn:hover:not(:disabled) {
  background: rgba(255, 96, 96, 0.12);
  color: #ffb4b4;
}

.pet-chat-head-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.pet-chat-close {
  appearance: none;
  border: 0;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.pet-chat-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #9fe4ff;
}

.pet-chat-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 2px;
  scrollbar-width: thin;
  scrollbar-color: rgba(64, 196, 255, 0.35) rgba(255, 255, 255, 0.06);
}

.pet-chat-list::-webkit-scrollbar {
  width: 8px;
}

.pet-chat-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
}

.pet-chat-list::-webkit-scrollbar-thumb {
  background: rgba(64, 196, 255, 0.28);
  border-radius: 8px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.pet-chat-list::-webkit-scrollbar-thumb:hover {
  background: rgba(64, 196, 255, 0.45);
  background-clip: padding-box;
}

.pet-chat-list::-webkit-scrollbar-button {
  display: none;
  height: 0;
  width: 0;
}

.pet-chat-hint {
  margin: auto;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.42);
  text-align: center;
  padding: 12px;
}

.pet-chat-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 100%;
}

.pet-chat-row.user {
  align-items: flex-end;
}

.pet-chat-row.assistant {
  align-items: flex-start;
}

.pet-chat-bubble {
  max-width: 92%;
  padding: 7px 10px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.45;
  word-break: break-word;
  white-space: pre-wrap;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.pet-chat-bubble-text {
  flex: 1;
  min-width: 0;
}

.pet-chat-bubble.user {
  background: rgba(64, 196, 255, 0.22);
  color: #e8f7ff;
}

.pet-chat-bubble.assistant {
  background: rgba(255, 255, 255, 0.08);
}

.pet-chat-bubble.error {
  background: rgba(255, 96, 96, 0.14);
  color: rgba(255, 196, 196, 0.95);
  border: 1px solid rgba(255, 120, 120, 0.28);
}

.pet-chat-bubble.clickable {
  cursor: pointer;
}

.pet-chat-bubble.clickable:hover {
  background: rgba(255, 96, 96, 0.2);
}

.pet-chat-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
  opacity: 0.55;
}

.pet-chat-row.user .pet-chat-meta {
  flex-direction: row-reverse;
}

.pet-chat-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
}

.pet-chat-del {
  appearance: none;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
}

.pet-chat-del:hover:not(:disabled) {
  color: #ffb4b4;
}

.pet-chat-del:disabled {
  opacity: 0.35;
  cursor: default;
}

.pet-chat-retry {
  appearance: none;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.pet-chat-retry:disabled {
  opacity: 0.4;
  cursor: default;
}

.pet-chat-retry-ring {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  box-sizing: border-box;
  color: rgba(255, 170, 170, 0.9);
  display: grid;
  place-items: center;
  transition: transform 0.2s ease, color 0.15s ease;
}

.pet-chat-retry:hover:not(:disabled) .pet-chat-retry-ring {
  transform: rotate(-90deg);
  color: #ffc4c4;
}

.pet-chat-bubble.pending {
  opacity: 0.65;
  letter-spacing: 0.12em;
}

.pet-chat-compose {
  display: flex;
  gap: 6px;
  align-items: flex-end;
}

.pet-chat-input {
  flex: 1;
  min-width: 0;
  min-height: 32px;
  max-height: 72px;
  resize: none;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.92);
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1.35;
  outline: none;
  font-family: inherit;
}

.pet-chat-input:focus {
  border-color: rgba(64, 196, 255, 0.45);
}

.pet-chat-input:disabled {
  opacity: 0.55;
}

.pet-chat-send {
  appearance: none;
  border: 0;
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  background: rgba(64, 196, 255, 0.28);
  color: #9fe4ff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.pet-chat-send.stop {
  background: rgba(255, 120, 120, 0.22);
  color: #ffc4c4;
}

.pet-chat-send:hover:not(:disabled) {
  background: rgba(64, 196, 255, 0.4);
}

.pet-chat-send.stop:hover:not(:disabled) {
  background: rgba(255, 120, 120, 0.32);
}

.pet-chat-send:disabled {
  opacity: 0.45;
  cursor: default;
}
</style>
