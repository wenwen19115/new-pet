import { computed, ref, type Ref } from "vue";
import { message } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import {
  DEFAULT_PET_CHAT_AI,
  addCustomChatModel,
  builtinChatModelIds,
  isPetChatProviderId,
  normalizePetChatAi,
  removeCustomChatModel,
  type PetChatProviderId,
} from "@/pet/chat/providers";
import {
  clearXiaozhiBind,
  DEFAULT_XIAOZHI_HOTKEY,
  DEFAULT_XIAOZHI_TALK_BAR_HIDE_SEC,
  normalizeXiaozhiHotkey,
  normalizeXiaozhiPrefs,
  normalizeXiaozhiTalkBarHideSec,
} from "@/pet/chat/xiaozhi/prefs";
import { publishPetSettings } from "@/pet/data/settings";
import type { PetSettings } from "@/pet/data/types";

/** 陪聊草稿：凭证/OTA 点 Save；语音播报/单击听/热键即时落盘。 */
export function useChatAiDraft(options: {
  settingsBag: Ref<PetSettings>;
  getCurrentSettings: () => PetSettings;
  persistOnly: () => Promise<void>;
}) {
  const { t } = useI18n();
  const { settingsBag, getCurrentSettings, persistOnly } = options;

  const chatAiProvider = ref<PetChatProviderId>(DEFAULT_PET_CHAT_AI.provider);
  const chatAiApiKey = ref("");
  const chatAiBaseUrl = ref("");
  const chatAiModel = ref("");
  const chatAiCustomModels = ref<string[]>([]);
  const chatAiOtaUrl = ref("");
  const xiaozhiVoicePlayback = ref(true);
  const xiaozhiClickToggleListen = ref(false);
  const xiaozhiHotkey = ref(DEFAULT_XIAOZHI_HOTKEY);
  const xiaozhiTalkBarHideSec = ref(DEFAULT_XIAOZHI_TALK_BAR_HIDE_SEC);

  function applyChatAiDraft(raw: unknown) {
    const cfg = normalizePetChatAi(
      raw && typeof raw === "object"
        ? (raw as Partial<typeof DEFAULT_PET_CHAT_AI>)
        : DEFAULT_PET_CHAT_AI
    );
    const xz = normalizeXiaozhiPrefs(settingsBag.value.xiaozhi, cfg);
    chatAiProvider.value = cfg.provider;
    if (cfg.provider === "xiaozhi") {
      chatAiApiKey.value = xz.token;
      chatAiBaseUrl.value = xz.wsUrl;
    } else {
      chatAiApiKey.value = cfg.apiKey;
      chatAiBaseUrl.value = cfg.baseUrl;
    }
    chatAiModel.value = cfg.model;
    chatAiCustomModels.value = [...cfg.customModels];
    chatAiOtaUrl.value = xz.otaUrl || cfg.otaUrl;
    xiaozhiVoicePlayback.value = xz.voicePlayback;
    xiaozhiClickToggleListen.value = xz.clickToggleListen;
    xiaozhiHotkey.value = xz.hotkey;
    xiaozhiTalkBarHideSec.value = xz.talkBarHideSec;
  }

  function savedChatAi() {
    return normalizePetChatAi(settingsBag.value.chatAi ?? DEFAULT_PET_CHAT_AI);
  }

  function savedXiaozhi() {
    return normalizeXiaozhiPrefs(
      settingsBag.value.xiaozhi,
      settingsBag.value.chatAi
    );
  }

  function sameStringList(a: string[], b: string[]) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }

  const chatAiDirty = computed(() => {
    const saved = savedChatAi();
    const xz = savedXiaozhi();
    const isXz = chatAiProvider.value === "xiaozhi";
    return (
      chatAiProvider.value !== saved.provider ||
      (isXz
        ? chatAiApiKey.value.trim() !== xz.token ||
          chatAiBaseUrl.value.trim() !== xz.wsUrl
        : chatAiApiKey.value.trim() !== saved.apiKey ||
          chatAiBaseUrl.value.trim() !== saved.baseUrl) ||
      chatAiModel.value.trim() !== saved.model ||
      chatAiOtaUrl.value.trim() !== xz.otaUrl ||
      !sameStringList(chatAiCustomModels.value, saved.customModels)
    );
  });

  const canAddChatAiModel = computed(() => {
    const id = chatAiModel.value.trim();
    if (
      !id ||
      chatAiProvider.value === "local" ||
      chatAiProvider.value === "xiaozhi"
    ) {
      return false;
    }
    if (builtinChatModelIds(chatAiProvider.value).includes(id)) return false;
    return !chatAiCustomModels.value.includes(id);
  });

  async function onChatAiProvider(value: unknown) {
    if (!isPetChatProviderId(value)) return;
    if (chatAiProvider.value === value) return;
    chatAiProvider.value = value;
    chatAiModel.value = "";
    if (value !== "deepseek") {
      chatAiBaseUrl.value = "";
    }
    // 立刻落盘：宠下对话条按已存 provider 显隐
    await onChatAiSave();
  }

  function onChatAiModel(value: unknown) {
    chatAiModel.value = typeof value === "string" ? value : "";
  }

  function onChatAiAddModel() {
    if (!canAddChatAiModel.value) return;
    chatAiCustomModels.value = addCustomChatModel(
      chatAiProvider.value,
      chatAiCustomModels.value,
      chatAiModel.value
    );
    message.success(t("pet.chatModelAdded"));
  }

  function onChatAiRemoveModel(id: string) {
    chatAiCustomModels.value = removeCustomChatModel(
      chatAiCustomModels.value,
      id
    );
  }

  async function onXiaozhiVoicePlayback(enabled: boolean) {
    xiaozhiVoicePlayback.value = enabled;
    await persistOnly();
  }

  async function onXiaozhiClickToggleListen(enabled: boolean) {
    xiaozhiClickToggleListen.value = enabled;
    await persistOnly();
  }

  async function onXiaozhiHotkeyCommit() {
    xiaozhiHotkey.value = normalizeXiaozhiHotkey(xiaozhiHotkey.value);
    await persistOnly();
  }

  async function onXiaozhiTalkBarHideSec(value: unknown) {
    xiaozhiTalkBarHideSec.value = normalizeXiaozhiTalkBarHideSec(value);
    await persistOnly();
  }

  async function onChatAiSave() {
    const current = getCurrentSettings();
    const xzPrev = normalizeXiaozhiPrefs(current.xiaozhi, current.chatAi);
    const xiaozhi = normalizeXiaozhiPrefs({
      ...xzPrev,
      otaUrl: chatAiOtaUrl.value,
      voicePlayback: xiaozhiVoicePlayback.value,
      clickToggleListen: xiaozhiClickToggleListen.value,
      hotkey: xiaozhiHotkey.value,
      talkBarHideSec: xiaozhiTalkBarHideSec.value,
    });
    const isXz = chatAiProvider.value === "xiaozhi";
    const next = await publishPetSettings({
      ...current,
      xiaozhi,
      chatAi: normalizePetChatAi({
        provider: chatAiProvider.value,
        apiKey: isXz ? xiaozhi.token : chatAiApiKey.value,
        baseUrl: isXz ? xiaozhi.wsUrl : chatAiBaseUrl.value,
        model: chatAiModel.value,
        customModels: addCustomChatModel(
          chatAiProvider.value,
          chatAiCustomModels.value,
          chatAiModel.value
        ),
        deviceId: xiaozhi.deviceId,
        clientId: xiaozhi.clientId,
        otaUrl: xiaozhi.otaUrl,
      }),
    });
    settingsBag.value = next;
    applyChatAiDraft(next.chatAi);
    message.success(t("pet.chatAiSaved"));
  }

  async function onXiaozhiRebind() {
    const current = getCurrentSettings();
    const cleared = clearXiaozhiBind(
      normalizeXiaozhiPrefs(current.xiaozhi, current.chatAi)
    );
    const next = await publishPetSettings({
      ...current,
      xiaozhi: cleared,
      chatAi: normalizePetChatAi({
        ...current.chatAi,
        apiKey: "",
        baseUrl: "",
        deviceId: cleared.deviceId,
        clientId: cleared.clientId,
        otaUrl: cleared.otaUrl,
      }),
    });
    settingsBag.value = next;
    applyChatAiDraft(next.chatAi);
    message.success(t("pet.chatXiaozhiRebindOk"));
  }

  function onChatAiReset() {
    if (!chatAiDirty.value) {
      message.info(t("pet.chatAiResetClean"));
      return;
    }
    applyChatAiDraft(savedChatAi());
    message.success(t("pet.chatAiResetOk"));
  }

  return {
    chatAiProvider,
    chatAiApiKey,
    chatAiBaseUrl,
    chatAiModel,
    chatAiCustomModels,
    chatAiOtaUrl,
    xiaozhiVoicePlayback,
    xiaozhiClickToggleListen,
    xiaozhiHotkey,
    xiaozhiTalkBarHideSec,
    chatAiDirty,
    canAddChatAiModel,
    applyChatAiDraft,
    savedChatAi,
    onChatAiProvider,
    onChatAiModel,
    onChatAiAddModel,
    onChatAiRemoveModel,
    onChatAiSave,
    onChatAiReset,
    onXiaozhiVoicePlayback,
    onXiaozhiClickToggleListen,
    onXiaozhiHotkeyCommit,
    onXiaozhiTalkBarHideSec,
    onXiaozhiRebind,
  };
}
