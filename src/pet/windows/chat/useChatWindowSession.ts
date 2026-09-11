import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { askPetChatAi, PetChatAiError, type ChatTurn } from "@/pet/chat/ai";
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
} from "@/pet/chat/history";
import { loadPetSettings } from "@/pet/data/settings";
import {
  isXiaozhiChatProvider,
  normalizePetChatAi,
  type PetChatAiConfig,
} from "@/pet/chat/providers";
import { PET_CHAT_INPUT_MAX } from "./types";
import {
  PET_CHAT_ACTIVITY_EVENT,
  PET_CHAT_CLOSE_REQ_EVENT,
  PET_CHAT_HIDE_EVENT,
  PET_CHAT_REPLY_EVENT,
  PET_CHAT_SHOW_EVENT,
  PET_SETTINGS_EVENT,
  type PetChatShowPayload,
} from "@/pet/events";
import { type PetMood, type PetSettings, type PetTone } from "@/pet/data/types";
import { isPetPersonality, type PetPersonality } from "@/pet/content/dialogue/personality";
import type { PetModelKind } from "@/pet/skins/types";
import { speakPetTts, cancelPetTts } from "@/pet/bridge/tts";

export function useChatWindowSession() {
  const visible = ref(false);
  const draft = ref("");
  const busy = ref(false);
  const streamText = ref("");
  const turns = ref<PetChatHistoryItem[]>([]);
  const listEl = ref<HTMLElement | null>(null);
  const inputEl = ref<HTMLTextAreaElement | null>(null);

  const petName = ref("新宠");
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
  /** 小智会话在宠侧；此窗只读历史 */
  const isXiaozhi = computed(() => isXiaozhiChatProvider(chatAi.value.provider));
  const title = computed(() =>
    en.value ? `Chat · ${petName.value}` : `聊天 · ${petName.value}`
  );
  const providerLabel = computed(() => {
    const id = chatAi.value.provider;
    if (en.value) {
      if (id === "local") return "Local";
      if (id === "xiaozhi") return "Xiaozhi";
      return "DeepSeek";
    }
    if (id === "local") return "本地陪聊";
    if (id === "xiaozhi") return "小智语音";
    return "DeepSeek";
  });
  const hint = computed(() => {
    if (isXiaozhi.value) {
      return en.value
        ? "Talk to the pet — this window is history only."
        : "对着宠物说话；此窗仅作历史记录。";
    }
    return en.value ? "Say something…" : "打字跟我说点什么吧…";
  });
  const xzHistoryOnly = computed(() =>
    en.value
      ? "Talk to the pet for Xiaozhi; this window is history only."
      : "小智对话请对着宠物说；此窗仅作历史记录。"
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

    petName.value = payload.petName?.trim() || (payload.lang === "en" ? "new-pet" : "新宠");
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
      if (!isXiaozhi.value) inputEl.value?.focus();
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
    if (isXiaozhi.value) return;
    if (!muted.value && ttsEnabled.value && text) {
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
  }

  async function notifyReply(text: string, mood?: PetMood) {
    try {
      await emit(PET_CHAT_REPLY_EVENT, { text, mood });
    } catch {
      // ignore
    }
  }

  function stopGeneration() {
    if (isXiaozhi.value) return;
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
    if (isXiaozhi.value) return;
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
    if (isXiaozhi.value) return;
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
    if (isXiaozhi.value || busy.value) return;
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
      const prev = chatAi.value.provider;
      chatAi.value = normalizePetChatAi(ev.payload?.chatAi);
      const nextKind = ev.payload?.modelKind;
      if (typeof nextKind === "string" && nextKind.trim() && nextKind !== modelKind.value) {
        modelKind.value = nextKind as PetModelKind;
        if (visible.value) reloadWindowTurns();
      }
      if (!visible.value) return;
      const next = chatAi.value.provider;
      if (prev !== next) {
        abort?.abort();
        abort = null;
        busy.value = false;
        streamText.value = "";
        cancelPetTts();
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

  return {
    visible,
    draft,
    busy,
    streamText,
    turns,
    listEl,
    inputEl,
    inputMax,
    isXiaozhi,
    xzHistoryOnly,
    title,
    providerLabel,
    hint,
    placeholder,
    sendLabel,
    stopLabel,
    closeLabel,
    retryLabel,
    deleteLabel,
    clearLabel,
    clearShort,
    formatTime,
    onActivity,
    close,
    clearAll,
    retryAt,
    removeMessage,
    stopGeneration,
    onInputKeydown,
    onComposeSubmit,
  };
}
