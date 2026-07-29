<template>
  <div v-if="!ctx.enabled.value" class="tab-empty">
    {{ $t("pet.tabNeedEnable") }}
  </div>
  <template v-else>
    <SettingsItemRow
      :title="$t('pet.chatProviderTitle')"
      :description="providerHint"
      tone="pet"
    >
      <template #icon><ApiOutlined /></template>
      <a-select
        :value="ctx.chatAiProvider.value"
        size="small"
        class="chat-select"
        :options="providerOptions"
        @change="ctx.onChatAiProvider"
      />
    </SettingsItemRow>

    <SettingsItemRow
      v-if="showModel"
      :title="$t('pet.chatModelTitle')"
      :description="$t('pet.chatModelDesc')"
      tone="pet"
    >
      <template #icon><RobotOutlined /></template>
      <div class="chat-model-wrap">
        <div class="chat-model-row">
          <a-auto-complete
            :value="ctx.chatAiModel.value"
            size="small"
            class="chat-select"
            :options="modelSelectOptions"
            :placeholder="modelPlaceholder"
            allow-clear
            @update:value="onModelUpdate"
          />
          <a-button
            size="small"
            :disabled="!ctx.canAddChatAiModel.value"
            @click="ctx.onChatAiAddModel"
          >
            {{ $t("pet.chatModelAdd") }}
          </a-button>
        </div>
        <div v-if="customModelTags.length" class="chat-model-tags">
          <span
            v-for="id in customModelTags"
            :key="id"
            class="chat-model-tag"
          >
            {{ id }}
            <button
              type="button"
              class="chat-model-tag-x"
              :title="$t('pet.chatModelRemove')"
              @click="ctx.onChatAiRemoveModel(id)"
            >
              ×
            </button>
          </span>
        </div>
      </div>
    </SettingsItemRow>

    <SettingsItemRow
      v-if="showApiKey"
      :title="$t('pet.chatApiKeyTitle')"
      :description="$t('pet.chatApiKeyDesc')"
      tone="pet"
    >
      <template #icon><KeyOutlined /></template>
      <a-input-password
        :value="ctx.chatAiApiKey.value"
        size="small"
        class="chat-select"
        :placeholder="$t('pet.chatApiKeyPh')"
        autocomplete="off"
        @update:value="(v: string) => (ctx.chatAiApiKey.value = v)"
      />
    </SettingsItemRow>

    <SettingsItemRow
      :title="$t('pet.chatAiApplyTitle')"
      :description="$t('pet.chatAiApplyDesc')"
      tone="pet"
    >
      <template #icon><SaveOutlined /></template>
      <div class="chat-actions">
        <a-button size="small" :loading="testing" @click="onTestConnection">
          {{ $t("pet.chatAiTest") }}
        </a-button>
        <a-button
          size="small"
          :disabled="isLocalProvider"
          @click="ctx.onChatAiReset"
        >
          {{ $t("pet.chatAiReset") }}
        </a-button>
        <a-button type="primary" size="small" @click="ctx.onChatAiSave">
          {{ $t("pet.chatAiSave") }}
        </a-button>
      </div>
    </SettingsItemRow>

    <ChatHistorySection :character-id="historyCharacterId" />
  </template>
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { useI18n } from "vue-i18n";
import { message } from "ant-design-vue";
import {
  ApiOutlined,
  KeyOutlined,
  RobotOutlined,
  SaveOutlined,
} from "@ant-design/icons-vue";
import SettingsItemRow from "@/components/SettingsItemRow.vue";
import ChatHistorySection from "@/settings/modules/ChatHistorySection.vue";
import { PET_SETTINGS_PAGE_KEY } from "@/settings/context";
import {
  PET_CHAT_PROVIDERS,
  builtinChatModelIds,
  mergeChatModelIds,
  normalizePetChatAi,
  type PetChatProviderId,
} from "@/pet/chat/providers";
import { PetChatAiError, testPetChatConnection } from "@/pet/chat/ai";

const { t, locale } = useI18n();
const ctx = inject(PET_SETTINGS_PAGE_KEY)!;
const testing = ref(false);

const historyCharacterId = computed(
  () => (ctx.modelKind.value || "chip").trim() || "chip"
);

function onModelUpdate(v: string | undefined) {
  ctx.onChatAiModel(typeof v === "string" ? v : "");
}

async function onTestConnection() {
  if (testing.value) return;
  testing.value = true;
  const lang = String(locale.value).startsWith("en") ? "en" : "zh";
  try {
    const draft = normalizePetChatAi({
      provider: ctx.chatAiProvider.value,
      apiKey: ctx.chatAiApiKey.value,
      baseUrl: ctx.chatAiBaseUrl.value,
      model: ctx.chatAiModel.value,
      customModels: ctx.chatAiCustomModels.value,
    });
    if (draft.provider === "local") {
      message.success(t("pet.chatAiTestLocalOk"));
      if (ctx.chatAiDirty.value) {
        await ctx.onChatAiSave();
      }
      return;
    }
    const result = await testPetChatConnection(draft, lang);
    message.success(
      t("pet.chatAiTestOk", { model: result.model, preview: result.preview })
    );
    if (ctx.chatAiDirty.value) {
      await ctx.onChatAiSave();
    }
  } catch (err) {
    const msg =
      err instanceof PetChatAiError ? err.message : t("pet.chatAiTestFail");
    message.error(msg);
  } finally {
    testing.value = false;
  }
}

const providerOptions = computed(() =>
  (Object.keys(PET_CHAT_PROVIDERS) as PetChatProviderId[]).map((id) => ({
    value: id,
    label: t(PET_CHAT_PROVIDERS[id].labelKey),
  }))
);

const activeProvider = computed(
  () => PET_CHAT_PROVIDERS[ctx.chatAiProvider.value] ?? PET_CHAT_PROVIDERS.local
);

const providerHint = computed(() => t(activeProvider.value.hintKey));
const showApiKey = computed(() => activeProvider.value.needsKey);
const showModel = computed(() => activeProvider.value.id !== "local");
const isLocalProvider = computed(() => activeProvider.value.id === "local");

const modelSelectOptions = computed(() => {
  const provider = activeProvider.value;
  const builtin = new Map(provider.models.map((m) => [m.value, m.labelKey]));
  return mergeChatModelIds(provider.id, ctx.chatAiCustomModels.value).map(
    (id) => ({
      value: id,
      label: builtin.has(id) ? t(builtin.get(id)!) : id,
    })
  );
});

const customModelTags = computed(() => {
  const builtin = new Set(builtinChatModelIds(activeProvider.value.id));
  return ctx.chatAiCustomModels.value.filter((id) => !builtin.has(id));
});

const modelPlaceholder = computed(() => {
  const def = activeProvider.value.defaultModel;
  if (def) return `${t("pet.chatModelAuto")}（${def}）`;
  return t("pet.chatModelCustomPh");
});
</script>

<style scoped>
.tab-empty {
  grid-column: 1 / -1;
  padding: 24px 8px;
  text-align: center;
  color: var(--text-muted, rgba(255, 255, 255, 0.45));
  font-size: 13px;
}

.chat-select {
  min-width: 200px;
  max-width: 280px;
  width: 100%;
}

.chat-model-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  min-width: 240px;
  max-width: 320px;
  width: 320px;
}

.chat-model-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.chat-model-row .chat-select {
  flex: 1 1 auto;
  min-width: 0;
  max-width: none;
  width: auto;
}

.chat-model-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  width: 100%;
}

.chat-model-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 6px 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.78);
  background: rgba(64, 196, 255, 0.12);
  border: 1px solid rgba(64, 196, 255, 0.22);
}

.chat-model-tag-x {
  appearance: none;
  border: 0;
  background: transparent;
  color: rgba(255, 180, 180, 0.8);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 0 2px;
}

.chat-model-tag-x:hover {
  color: #ffb4b4;
}

.chat-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
