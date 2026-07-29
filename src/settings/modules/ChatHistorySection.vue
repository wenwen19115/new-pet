<template>
  <div class="hist-block span-2">
    <div class="hist-head">
      <div>
        <div class="hist-title">{{ $t("pet.chatHistoryTitle") }}</div>
        <div class="hist-desc">{{ $t("pet.chatHistoryDesc") }}</div>
      </div>
      <div class="chat-actions">
        <a-button size="small" :disabled="!historyAll.length" @click="onExport">
          {{ $t("pet.chatHistoryExport") }}
        </a-button>
        <a-button size="small" @click="onResetFilters">
          {{ $t("pet.chatHistoryResetFilter") }}
        </a-button>
        <a-button
          size="small"
          danger
          :disabled="!historyAll.length"
          @click="onClearAll"
        >
          {{ $t("pet.chatHistoryClear") }}
        </a-button>
      </div>
    </div>

    <div v-if="nearCap" class="hist-cap">
      {{ $t("pet.chatHistoryCapWarn", { max: historyMax }) }}
    </div>

    <div class="hist-filters">
      <a-input
        v-model:value="historyQuery"
        size="small"
        allow-clear
        class="hist-search"
        :placeholder="$t('pet.chatHistorySearchPh')"
      />
      <a-date-picker
        v-model:value="historyDay"
        size="small"
        value-format="YYYY-MM-DD"
        :placeholder="$t('pet.chatHistoryDayPh')"
        class="hist-day"
        allow-clear
      />
    </div>

    <div v-if="!filteredHistory.length" class="hist-empty">
      {{ $t("pet.chatHistoryEmpty") }}
    </div>
    <div v-else class="hist-list">
      <div
        v-for="m in filteredHistory"
        :key="m.id"
        class="hist-item"
        :class="m.role"
      >
        <div class="hist-item-top">
          <span class="hist-role">{{
            m.role === "user"
              ? $t("pet.chatHistoryUser")
              : $t("pet.chatHistoryBot")
          }}</span>
          <span class="hist-time">{{ formatChatTime(m.ts) }}</span>
          <button type="button" class="hist-del" @click="onDeleteOne(m.id)">
            {{ $t("pet.chatHistoryDelete") }}
          </button>
        </div>
        <div class="hist-content" :class="{ error: m.kind === 'error' }">
          {{ m.content }}
        </div>
      </div>
    </div>
    <div class="hist-foot">
      {{
        $t("pet.chatHistoryCount", {
          shown: filteredHistory.length,
          total: historyAll.length,
        })
      }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Modal, message } from "ant-design-vue";
import {
  clearChatHistory,
  deleteChatMessage,
  downloadChatHistoryExport,
  filterChatHistory,
  formatChatTime,
  historyEventCharacterId,
  isChatHistoryNearCap,
  isChatHistoryStorageKey,
  loadChatHistory,
  PET_CHAT_HISTORY_CHANGED,
  PET_CHAT_HISTORY_MAX,
  PET_CHAT_HISTORY_TRUNCATED,
  type PetChatHistoryItem,
} from "@/pet/chat/history";

const props = defineProps<{
  characterId: string;
}>();

const { t } = useI18n();

const historyAll = ref<PetChatHistoryItem[]>([]);
const filteredHistory = ref<PetChatHistoryItem[]>([]);
const historyQuery = ref("");
const historyDay = ref<string | null>(null);
const historyMax = PET_CHAT_HISTORY_MAX;

const nearCap = computed(() =>
  isChatHistoryNearCap(props.characterId, historyAll.value.length)
);

function refreshHistory() {
  const cid = props.characterId;
  historyAll.value = loadChatHistory(cid);
  filteredHistory.value = filterChatHistory(cid, {
    query: historyQuery.value,
    day: historyDay.value,
  })
    .slice()
    .reverse();
}

function onDeleteOne(id: string) {
  deleteChatMessage(props.characterId, id);
  refreshHistory();
  message.success(t("pet.chatHistoryDeleted"));
}

function onResetFilters() {
  historyQuery.value = "";
  historyDay.value = null;
  refreshHistory();
}

function onExport() {
  if (!historyAll.value.length) return;
  downloadChatHistoryExport(props.characterId);
  message.success(t("pet.chatHistoryExported"));
}

function onClearAll() {
  Modal.confirm({
    title: t("pet.chatHistoryClearTitle"),
    content: t("pet.chatHistoryClearDesc"),
    okText: t("pet.chatHistoryClear"),
    okType: "danger",
    cancelText: t("pet.chatCancel"),
    onOk() {
      clearChatHistory(props.characterId);
      refreshHistory();
      message.success(t("pet.chatHistoryCleared"));
    },
  });
}

function onStorage(ev: StorageEvent) {
  if (!isChatHistoryStorageKey(ev.key)) return;
  refreshHistory();
}

function onHistoryChanged(ev: Event) {
  const cid = historyEventCharacterId(
    "detail" in ev ? (ev as CustomEvent).detail : null
  );
  if (cid && cid !== props.characterId) return;
  refreshHistory();
}

function onTruncated(ev: Event) {
  const cid = historyEventCharacterId(
    "detail" in ev ? (ev as CustomEvent).detail : null
  );
  if (cid && cid !== props.characterId) return;
  refreshHistory();
  message.warning(t("pet.chatHistoryCapWarn", { max: historyMax }));
}

onMounted(() => {
  refreshHistory();
  window.addEventListener("storage", onStorage);
  window.addEventListener(PET_CHAT_HISTORY_CHANGED, onHistoryChanged);
  window.addEventListener(PET_CHAT_HISTORY_TRUNCATED, onTruncated);
});

onUnmounted(() => {
  window.removeEventListener("storage", onStorage);
  window.removeEventListener(PET_CHAT_HISTORY_CHANGED, onHistoryChanged);
  window.removeEventListener(PET_CHAT_HISTORY_TRUNCATED, onTruncated);
});

watch([historyQuery, historyDay, () => props.characterId], () => {
  refreshHistory();
});
</script>

<style scoped>
.chat-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hist-block {
  grid-column: 1 / -1;
  margin-top: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.hist-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.hist-title {
  font-size: 13px;
  font-weight: 650;
  color: rgba(255, 255, 255, 0.92);
}

.hist-desc {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}

.hist-cap {
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  color: rgba(255, 210, 150, 0.95);
  background: rgba(255, 160, 64, 0.12);
  border: 1px solid rgba(255, 160, 64, 0.25);
}

.hist-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.hist-search {
  flex: 1;
  min-width: 160px;
}

.hist-day {
  width: 150px;
}

.hist-empty {
  padding: 20px 8px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.hist-list {
  max-height: 360px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(64, 196, 255, 0.35) rgba(255, 255, 255, 0.06);
}

.hist-list::-webkit-scrollbar {
  width: 8px;
}

.hist-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
}

.hist-list::-webkit-scrollbar-thumb {
  background: rgba(64, 196, 255, 0.28);
  border-radius: 8px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.hist-list::-webkit-scrollbar-button {
  display: none;
}

.hist-item {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.hist-item-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 11px;
}

.hist-role {
  font-weight: 600;
  color: #9fe4ff;
}

.hist-item.user .hist-role {
  color: #b8f0c0;
}

.hist-time {
  color: rgba(255, 255, 255, 0.4);
  flex: 1;
}

.hist-del {
  appearance: none;
  border: 0;
  background: transparent;
  color: rgba(255, 160, 160, 0.75);
  cursor: pointer;
  font-size: 11px;
  padding: 0;
}

.hist-del:hover {
  color: #ffb4b4;
}

.hist-content {
  font-size: 12px;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.85);
  white-space: pre-wrap;
  word-break: break-word;
}

.hist-content.error {
  color: rgba(255, 196, 196, 0.9);
}

.hist-foot {
  margin-top: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}
</style>
