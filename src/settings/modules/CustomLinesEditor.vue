<template>
  <div class="lines-editor span-2">
    <header class="lines-head">
      <div>
        <div class="lines-title">{{ $t("pet.customLinesTitle") }}</div>
        <div class="lines-desc">{{ $t("pet.customLinesDesc") }}</div>
      </div>
      <a-button size="small" type="primary" ghost @click="onAdd">
        {{ $t("pet.customLinesAdd") }}
      </a-button>
    </header>

    <label class="lines-only">
      <a-switch :checked="customLinesOnly" size="small" @change="onOnly" />
      <span>{{ $t("pet.customLinesOnly") }}</span>
    </label>

    <div class="lines-scene-tabs" role="tablist">
      <button
        v-for="scene in scenes"
        :key="scene"
        type="button"
        class="lines-scene-tab"
        :data-active="activeScene === scene ? '1' : '0'"
        @click="activeScene = scene"
      >
        {{ $t(`pet.customLinesScene.${scene}`) }}
        <span class="lines-count">{{ countFor(scene) }}</span>
      </button>
    </div>

    <div v-if="!filtered.length" class="lines-empty">
      {{ $t("pet.customLinesEmpty") }}
    </div>

    <div v-for="item in filtered" :key="item.id" class="lines-card">
      <a-textarea
        :value="item.text"
        :rows="2"
        :maxlength="120"
        :placeholder="scenePlaceholder"
        @update:value="(v: string) => onText(item.id, v)"
      />
      <div class="lines-card-actions">
        <label class="lines-enable">
          <a-switch
            :checked="item.enabled"
            size="small"
            @change="(v: boolean) => onEnabled(item.id, v)"
          />
          <span>{{ $t("pet.customLinesEnabled") }}</span>
        </label>
        <a-button size="small" danger @click="onRemove(item.id)">
          {{ $t("pet.customLinesRemove") }}
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  createEmptyCustomLine,
  PET_LINE_SCENES,
  type PetCustomLine,
  type PetLineScene,
} from "@/pet/customLines";

const props = defineProps<{
  modelValue: PetCustomLine[];
  customLinesOnly: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: PetCustomLine[]];
  "update:customLinesOnly": [value: boolean];
  change: [];
}>();

const { t } = useI18n();
const scenes = PET_LINE_SCENES;
const activeScene = ref<PetLineScene>("idle");

const filtered = computed(() =>
  props.modelValue.filter((l) => l.scene === activeScene.value)
);

const scenePlaceholder = computed(() => {
  if (activeScene.value === "usb") return t("pet.customLinesUsbHint");
  if (activeScene.value === "tap") return t("pet.customLinesTapHint");
  return t("pet.customLinesIdleHint");
});

function countFor(scene: PetLineScene) {
  return props.modelValue.filter((l) => l.scene === scene).length;
}

function commit(next: PetCustomLine[]) {
  emit("update:modelValue", next);
  emit("change");
}

function onAdd() {
  commit([...props.modelValue, createEmptyCustomLine(activeScene.value, "")]);
}

function onRemove(id: string) {
  commit(props.modelValue.filter((l) => l.id !== id));
}

function onText(id: string, text: string) {
  commit(
    props.modelValue.map((l) =>
      l.id === id ? { ...l, text: text.slice(0, 120) } : l
    )
  );
}

function onEnabled(id: string, enabled: boolean) {
  commit(
    props.modelValue.map((l) => (l.id === id ? { ...l, enabled } : l))
  );
}

function onOnly(value: boolean) {
  emit("update:customLinesOnly", value);
  emit("change");
}
</script>

<style scoped>
.lines-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
}

.lines-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.lines-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ui-text);
}

.lines-desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ui-text-faint);
  line-height: 1.4;
}

.lines-only {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--ui-text-muted);
}

.lines-scene-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.lines-scene-tab {
  appearance: none;
  border: 1px solid var(--ui-border);
  background: transparent;
  color: var(--ui-text-muted);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.lines-scene-tab[data-active="1"] {
  border-color: color-mix(in srgb, var(--ui-primary) 50%, transparent);
  background: var(--ui-accent-soft);
  color: var(--ui-primary);
}

.lines-count {
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}

.lines-empty {
  padding: 12px 4px;
  font-size: 12px;
  color: var(--ui-text-faint);
  text-align: center;
}

.lines-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--ui-border);
  background: color-mix(in srgb, var(--ui-surface) 70%, transparent);
}

.lines-card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.lines-enable {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--ui-text-muted);
}
</style>

