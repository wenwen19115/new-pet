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
import { publishPetSettings } from "@/pet/data/settings";
import type { PetSettings } from "@/pet/data/types";

/** 按角色的陪聊草稿；点 Save 才进 settings，其它持久化仍用上次已存值。 */
export function useChatAiDraft(options: {
  settingsBag: Ref<PetSettings>;
  getCurrentSettings: () => PetSettings;
}) {
  const { t } = useI18n();
  const { settingsBag, getCurrentSettings } = options;

  const chatAiProvider = ref<PetChatProviderId>(DEFAULT_PET_CHAT_AI.provider);
  const chatAiApiKey = ref("");
  const chatAiBaseUrl = ref("");
  const chatAiModel = ref("");
  const chatAiCustomModels = ref<string[]>([]);

  function applyChatAiDraft(raw: unknown) {
    const cfg = normalizePetChatAi(
      raw && typeof raw === "object"
        ? (raw as Partial<typeof DEFAULT_PET_CHAT_AI>)
        : DEFAULT_PET_CHAT_AI
    );
    chatAiProvider.value = cfg.provider;
    chatAiApiKey.value = cfg.apiKey;
    chatAiBaseUrl.value = cfg.baseUrl;
    chatAiModel.value = cfg.model;
    chatAiCustomModels.value = [...cfg.customModels];
  }

  function savedChatAi() {
    return normalizePetChatAi(settingsBag.value.chatAi ?? DEFAULT_PET_CHAT_AI);
  }

  function sameStringList(a: string[], b: string[]) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }

  const chatAiDirty = computed(() => {
    const saved = savedChatAi();
    return (
      chatAiProvider.value !== saved.provider ||
      chatAiApiKey.value.trim() !== saved.apiKey ||
      chatAiBaseUrl.value.trim() !== saved.baseUrl ||
      chatAiModel.value.trim() !== saved.model ||
      !sameStringList(chatAiCustomModels.value, saved.customModels)
    );
  });

  const canAddChatAiModel = computed(() => {
    const id = chatAiModel.value.trim();
    if (!id || chatAiProvider.value === "local") return false;
    if (builtinChatModelIds(chatAiProvider.value).includes(id)) return false;
    return !chatAiCustomModels.value.includes(id);
  });

  function onChatAiProvider(value: unknown) {
    if (!isPetChatProviderId(value)) return;
    chatAiProvider.value = value;
    chatAiModel.value = "";
    chatAiBaseUrl.value = "";
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

  async function onChatAiSave() {
    const next = await publishPetSettings({
      ...getCurrentSettings(),
      chatAi: normalizePetChatAi({
        provider: chatAiProvider.value,
        apiKey: chatAiApiKey.value,
        baseUrl: chatAiBaseUrl.value,
        model: chatAiModel.value,
        customModels: addCustomChatModel(
          chatAiProvider.value,
          chatAiCustomModels.value,
          chatAiModel.value
        ),
      }),
    });
    settingsBag.value = next;
    applyChatAiDraft(next.chatAi);
    message.success(t("pet.chatAiSaved"));
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
  };
}
