<template>
  <div class="theme-pack-picker-wrap">
    <div class="theme-pack-toolbar">
      <input
        v-model="query"
        type="search"
        class="theme-pack-search"
        :placeholder="t('pet.themePackSearch')"
        :aria-label="t('pet.themePackSearch')"
      />
      <button type="button" class="theme-btn" @click="expandAll">
        {{ t("pet.themePackExpand") }}
      </button>
      <button type="button" class="theme-btn" @click="collapseAll">
        {{ t("pet.themePackCollapse") }}
      </button>
    </div>
    <p class="theme-pack-meta theme-d">{{ statusText }}</p>
    <div class="theme-pack-picker" role="listbox" :aria-label="ariaLabel">
      <button
        v-for="pack in visiblePacks"
        :key="pack.id"
        type="button"
        role="option"
        :data-style="pack.id"
        :class="{ on: modelValue === pack.id }"
        :aria-selected="modelValue === pack.id"
        @click="$emit('update:modelValue', pack.id)"
      >
        <strong>{{ packIndex(pack.id) }} · {{ pack.meta.title }}</strong>
        <small>{{ pack.meta.blurb }}</small>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { listThemePacks } from "@/theme";
import type { ThemePack, ThemePackId } from "@/theme";

const props = defineProps<{
  modelValue: ThemePackId;
  ariaLabel?: string;
}>();
defineEmits<{
  "update:modelValue": [value: ThemePackId];
}>();

const { t } = useI18n();
const allPacks = listThemePacks();
const indexById = new Map(allPacks.map((p, i) => [p.id, i + 1]));

const query = ref("");
/** 默认收起，只露当前选中 */
const expanded = ref(false);

function packIndex(id: ThemePackId): number {
  return indexById.get(id) ?? 0;
}

const filteredPacks = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return allPacks;
  return allPacks.filter((p) => {
    return (
      p.id.toLowerCase().includes(q) ||
      p.meta.title.toLowerCase().includes(q) ||
      p.meta.blurb.toLowerCase().includes(q) ||
      p.meta.banner.toLowerCase().includes(q)
    );
  });
});

const visiblePacks = computed((): ThemePack[] => {
  const list = filteredPacks.value;
  if (query.value.trim() || expanded.value) return list;
  const selected =
    allPacks.find((p) => p.id === props.modelValue) ?? allPacks[0];
  return selected ? [selected] : [];
});

const statusText = computed(() => {
  const total = allPacks.length;
  const shown = visiblePacks.value.length;
  if (query.value.trim()) {
    return t("pet.themePackStatusSearch", { shown, total });
  }
  if (expanded.value) {
    return t("pet.themePackStatusExpanded", { total });
  }
  return t("pet.themePackStatusCollapsed", { total });
});

function expandAll() {
  expanded.value = true;
}

function collapseAll() {
  expanded.value = false;
  query.value = "";
}
</script>

<style scoped>
.theme-pack-picker-wrap {
  width: 100%;
  min-width: 0;
}

.theme-pack-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.theme-pack-search {
  flex: 1 1 160px;
  min-width: 120px;
  box-sizing: border-box;
  appearance: none;
  border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.14));
  background: var(--ui-surface, rgba(0, 0, 0, 0.22));
  color: var(--ui-text, inherit);
  border-radius: 8px;
  padding: 7px 10px;
  font: inherit;
  font-size: 12px;
}

.theme-pack-search::placeholder {
  color: var(--ui-text-faint, rgba(255, 255, 255, 0.4));
}

.theme-pack-meta {
  margin: 8px 2px 0;
  font-size: 11px;
  line-height: 1.4;
}

.theme-pack-picker-wrap :deep(.theme-pack-picker) {
  margin-top: 8px;
}
</style>
