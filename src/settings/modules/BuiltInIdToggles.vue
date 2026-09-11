<template>
  <div class="id-toggles span-2">
    <header class="id-toggles-head">
      <div class="id-toggles-head-text">
        <div class="id-toggles-title">{{ $t(titleKey) }}</div>
        <div class="id-toggles-desc">{{ $t(descKey) }}</div>
      </div>
    </header>

    <div v-if="motionMeta" class="id-toggle-filters">
      <div class="id-filter-row">
        <span class="id-filter-label">{{ $t("pet.motionFilterKind") }}</span>
        <div class="id-filter-chips" role="radiogroup">
          <button
            v-for="opt in kindFilterOptions"
            :key="String(opt.value)"
            type="button"
            class="id-filter-chip"
            :class="{ on: kindFilter === opt.value }"
            :aria-pressed="kindFilter === opt.value"
            @click="kindFilter = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
      <div class="id-filter-row">
        <span class="id-filter-label">{{ $t("pet.motionFilterVibe") }}</span>
        <div class="id-filter-chips" role="radiogroup">
          <button
            v-for="opt in vibeFilterOptions"
            :key="String(opt.value)"
            type="button"
            class="id-filter-chip"
            :class="{ on: vibeFilter === opt.value }"
            :aria-pressed="vibeFilter === opt.value"
            @click="vibeFilter = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="id-toggle-list">
      <template v-if="motionMeta">
        <div
          v-for="group in filteredGroups"
          :key="group.kind"
          class="id-toggle-group"
        >
          <div class="id-toggle-group-head">
            <span>{{ $t(`pet.motionKind.${group.kind}`) }}</span>
            <span class="id-toggle-group-count">{{ group.ids.length }}</span>
            <button
              type="button"
              class="id-toggle-group-btn"
              @click="setGroup(group.ids, true)"
            >
              {{ $t("pet.motionFilterEnableAll") }}
            </button>
            <button
              type="button"
              class="id-toggle-group-btn"
              @click="setGroup(group.ids, false)"
            >
              {{ $t("pet.motionFilterDisableAll") }}
            </button>
          </div>
          <div
            v-for="id in group.ids"
            :key="id"
            class="id-toggle-row"
            :data-selected="selectable && selectedId === id ? '1' : '0'"
            role="button"
            tabindex="0"
            @click="onSelect(id)"
            @keydown.enter.prevent="onSelect(id)"
            @keydown.space.prevent="onSelect(id)"
          >
            <span class="id-toggle-main">
              <span class="id-toggle-name">{{ labelOf(id) }}</span>
              <span
                v-if="vibeOf(id)"
                class="id-toggle-tag"
                :data-vibe="vibeOf(id)"
              >
                {{ $t(`pet.motionVibe.${vibeOf(id)}`) }}
              </span>
            </span>
            <a-switch
              :checked="isOn(id)"
              size="small"
              @click.stop
              @change="(v: boolean) => onToggle(id, v)"
            />
          </div>
        </div>
        <div v-if="!filteredGroups.length" class="id-toggle-empty">
          {{ $t("pet.motionFilterEmpty") }}
        </div>
      </template>
      <template v-else>
        <div
          v-for="id in ids"
          :key="id"
          class="id-toggle-row"
          :data-selected="selectable && selectedId === id ? '1' : '0'"
          :role="selectable ? 'button' : undefined"
          :tabindex="selectable ? 0 : undefined"
          @click="onSelect(id)"
          @keydown.enter.prevent="onSelect(id)"
          @keydown.space.prevent="onSelect(id)"
        >
          <span class="id-toggle-name">{{ labelOf(id) }}</span>
          <a-switch
            :checked="isOn(id)"
            size="small"
            @click.stop
            @change="(v: boolean) => onToggle(id, v)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { isCustomVrmMotionId } from "@/pet/content/motion/customVrmMotions";
import {
  findMotionListMeta,
  groupMotionIdsByKind,
  type MotionListKind,
  type MotionListVibe,
} from "@/pet/content/motion/motionListMeta";

const props = withDefaults(
  defineProps<{
    ids: string[];
    disabledIds: string[];
    titleKey: string;
    descKey: string;
    /** i18n key prefix, e.g. `pet.motion.` / `pet.lineCategory.` */
    labelKeyPrefix: string;
    customNames?: Record<string, string>;
    /** 按类型 + 风格筛选/分组（VRM 与壳角色共用） */
    motionMeta?: boolean;
    /** 点行选中并立即「做一下」 */
    selectable?: boolean;
    selectedId?: string | null;
  }>(),
  {
    customNames: () => ({}),
    motionMeta: false,
    selectable: false,
    selectedId: null,
  }
);

const emit = defineEmits<{
  "update:disabledIds": [value: string[]];
  "update:selectedId": [value: string];
  change: [];
  play: [id: string];
}>();

const { t } = useI18n();

type KindFilter = "all" | MotionListKind;
type VibeFilter = "all" | MotionListVibe;

const kindFilter = ref<KindFilter>("all");
const vibeFilter = ref<VibeFilter>("all");

const kindFilterOptions = computed(() => [
  { value: "all" as const, label: t("pet.motionFilterAll") },
  { value: "idle" as const, label: t("pet.motionKind.idle") },
  { value: "talk" as const, label: t("pet.motionKind.talk") },
  { value: "gesture" as const, label: t("pet.motionKind.gesture") },
  { value: "emotion" as const, label: t("pet.motionKind.emotion") },
]);

const vibeFilterOptions = computed(() => [
  { value: "all" as const, label: t("pet.motionFilterAll") },
  { value: "soft" as const, label: t("pet.motionVibe.soft") },
  { value: "lively" as const, label: t("pet.motionVibe.lively") },
  { value: "bold" as const, label: t("pet.motionVibe.bold") },
]);

const filteredIds = computed(() => {
  if (!props.motionMeta) return props.ids;
  return props.ids.filter((id) => {
    const meta = findMotionListMeta(id);
    if (!meta) return kindFilter.value === "all" && vibeFilter.value === "all";
    if (kindFilter.value !== "all" && meta.kind !== kindFilter.value) {
      return false;
    }
    if (vibeFilter.value !== "all" && meta.vibe !== vibeFilter.value) {
      return false;
    }
    return true;
  });
});

const filteredGroups = computed(() => groupMotionIdsByKind(filteredIds.value));

function isOn(id: string) {
  return !props.disabledIds.includes(id);
}

function labelOf(id: string) {
  if (isCustomVrmMotionId(id)) {
    return props.customNames?.[id] || t("pet.customMotionName");
  }
  return t(`${props.labelKeyPrefix}${id}`);
}

function vibeOf(id: string): MotionListVibe | null {
  return findMotionListMeta(id)?.vibe ?? null;
}

function onSelect(id: string) {
  if (!props.selectable) return;
  emit("update:selectedId", id);
  emit("play", id);
}

function onToggle(id: string, enabled: boolean) {
  const set = new Set(props.disabledIds);
  if (enabled) set.delete(id);
  else set.add(id);
  emit("update:disabledIds", [...set]);
  emit("change");
}

function setGroup(ids: string[], enabled: boolean) {
  const set = new Set(props.disabledIds);
  for (const id of ids) {
    if (enabled) set.delete(id);
    else set.add(id);
  }
  emit("update:disabledIds", [...set]);
  emit("change");
}
</script>

<style scoped>
.id-toggles {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--ui-panel-radius, 12px);
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
}

.id-toggles-head {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.id-toggles-head-text {
  min-width: 0;
}

.id-toggles-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ui-text);
}

.id-toggles-desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ui-text-faint);
  line-height: 1.4;
}

.id-toggle-filters {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.id-filter-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.id-filter-label {
  flex: 0 0 2.5em;
  padding-top: 5px;
  font-size: 12px;
  color: var(--ui-text-faint);
}

.id-filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.id-filter-chip {
  appearance: none;
  border: 1px solid var(--ui-border);
  background: transparent;
  color: var(--ui-text-muted, var(--ui-text-faint));
  font-size: 12px;
  line-height: 1;
  padding: 6px 10px;
  border-radius: var(--ui-radius, 999px);
  cursor: pointer;
}

.id-filter-chip.on {
  border-color: color-mix(in srgb, var(--ui-accent, #5b8def) 55%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-accent, #5b8def) 18%, transparent);
  color: var(--ui-text);
}

.id-toggle-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 360px;
  overflow: auto;
}

.id-toggle-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.id-toggle-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 2px 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--ui-text-muted, var(--ui-text-faint));
}

.id-toggle-group-count {
  font-weight: 500;
  opacity: 0.7;
}

.id-toggle-group-btn {
  appearance: none;
  margin-left: 0;
  border: none;
  background: transparent;
  color: var(--ui-accent, #5b8def);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.id-toggle-group-btn:first-of-type {
  margin-left: auto;
}

.id-toggle-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--ui-radius-sm, 8px);
  border: 1px solid var(--ui-border);
  cursor: pointer;
}

.id-toggle-row[data-selected="1"] {
  border-color: color-mix(in srgb, var(--ui-accent, #5b8def) 55%, var(--ui-border));
  background: color-mix(in srgb, var(--ui-accent, #5b8def) 14%, transparent);
}

.id-toggle-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  min-width: 0;
  flex: 1 1 auto;
}

.id-toggle-name {
  min-width: 0;
  font-size: 13px;
  color: var(--ui-text);
  line-height: 1.35;
  white-space: normal;
  word-break: break-word;
}

.id-toggle-tag {
  flex: 0 0 auto;
  font-size: 11px;
  line-height: 1;
  padding: 3px 6px;
  border-radius: var(--ui-radius, 999px);
  border: 1px solid var(--ui-border);
  color: var(--ui-text-faint);
}

.id-toggle-tag[data-vibe="soft"] {
  border-color: color-mix(in srgb, #7eb8ff 45%, var(--ui-border));
  color: #9cc7ff;
}

.id-toggle-tag[data-vibe="lively"] {
  border-color: color-mix(in srgb, #f0b35a 45%, var(--ui-border));
  color: #f0c27a;
}

.id-toggle-tag[data-vibe="bold"] {
  border-color: color-mix(in srgb, #e07a7a 45%, var(--ui-border));
  color: #e8a0a0;
}

.id-toggle-empty {
  padding: 16px 8px;
  text-align: center;
  font-size: 12px;
  color: var(--ui-text-faint);
}
</style>
