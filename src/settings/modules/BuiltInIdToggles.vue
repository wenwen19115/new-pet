<template>
  <div class="id-toggles span-2">
    <header class="id-toggles-head">
      <div>
        <div class="id-toggles-title">{{ $t(titleKey) }}</div>
        <div class="id-toggles-desc">{{ $t(descKey) }}</div>
      </div>
    </header>
    <div class="id-toggle-list">
      <label v-for="id in ids" :key="id" class="id-toggle-row">
        <span class="id-toggle-name">{{ labelOf(id) }}</span>
        <a-switch
          :checked="isOn(id)"
          size="small"
          @change="(v: boolean) => onToggle(id, v)"
        />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { isCustomVrmMotionId } from "@/pet/content/motion/customVrmMotions";

const props = withDefaults(
  defineProps<{
    ids: string[];
    disabledIds: string[];
    titleKey: string;
    descKey: string;
    /** i18n key prefix, e.g. `pet.motion.` / `pet.lineCategory.` */
    labelKeyPrefix: string;
    customNames?: Record<string, string>;
  }>(),
  {
    customNames: () => ({}),
  }
);

const emit = defineEmits<{
  "update:disabledIds": [value: string[]];
  change: [];
}>();

const { t } = useI18n();

function isOn(id: string) {
  return !props.disabledIds.includes(id);
}

function labelOf(id: string) {
  if (isCustomVrmMotionId(id)) {
    return props.customNames?.[id] || t("pet.customMotionName");
  }
  return t(`${props.labelKeyPrefix}${id}`);
}

function onToggle(id: string, enabled: boolean) {
  const set = new Set(props.disabledIds);
  if (enabled) set.delete(id);
  else set.add(id);
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
  border-radius: 12px;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
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

.id-toggle-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow: auto;
}

.id-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--ui-border);
  cursor: pointer;
}

.id-toggle-name {
  min-width: 0;
  font-size: 13px;
  color: var(--ui-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
