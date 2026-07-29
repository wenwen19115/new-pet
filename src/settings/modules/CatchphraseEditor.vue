<template>
  <div class="catch-editor span-2">
    <header class="catch-head">
      <div>
        <div class="catch-title">{{ $t("pet.catchphraseTitle") }}</div>
        <div class="catch-desc">{{ $t("pet.catchphraseDesc") }}</div>
      </div>
      <a-button
        size="small"
        type="primary"
        ghost
        :disabled="modelValue.length >= max"
        @click="onAdd"
      >
        {{ $t("pet.catchphraseAdd") }}
      </a-button>
    </header>

    <div class="catch-chance">
      <span>{{ $t("pet.catchphraseChanceTitle") }}</span>
      <a-slider
        :value="Math.round(chance * 100)"
        :min="0"
        :max="100"
        :step="5"
        style="width: 120px; margin: 0"
        @change="onChance"
      />
      <span class="catch-chance-label">{{ Math.round(chance * 100) }}%</span>
    </div>
    <p class="catch-chance-desc">{{ $t("pet.catchphraseChanceDesc") }}</p>

    <div v-if="!modelValue.length" class="catch-empty">
      {{ $t("pet.catchphraseEmpty") }}
    </div>

    <div v-for="(text, index) in modelValue" :key="index" class="catch-row">
      <a-input
        :value="text"
        :maxlength="textMax"
        :placeholder="$t('pet.catchphraseHint')"
        size="small"
        @update:value="(v: string) => onText(index, v)"
      />
      <a-button size="small" danger @click="onRemove(index)">
        {{ $t("pet.catchphraseRemove") }}
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CATCHPHRASE_MAX,
  CATCHPHRASE_TEXT_MAX,
  clampCatchphraseChance,
} from "@/pet/content/catchphrases";

const props = defineProps<{
  modelValue: string[];
  chance: number;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
  "update:chance": [value: number];
  change: [];
}>();

const max = CATCHPHRASE_MAX;
const textMax = CATCHPHRASE_TEXT_MAX;

function onAdd() {
  if (props.modelValue.length >= max) return;
  emit("update:modelValue", [...props.modelValue, ""]);
  emit("change");
}

function onText(index: number, value: string) {
  const next = props.modelValue.map((t, i) =>
    i === index ? value.slice(0, textMax) : t
  );
  emit("update:modelValue", next);
  emit("change");
}

function onRemove(index: number) {
  emit(
    "update:modelValue",
    props.modelValue.filter((_, i) => i !== index)
  );
  emit("change");
}

function onChance(value: number) {
  emit("update:chance", clampCatchphraseChance(value / 100));
  emit("change");
}
</script>

<style scoped>
.catch-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.08));
  background: color-mix(in srgb, var(--ui-surface-strong, #12141c) 70%, transparent);
}

.catch-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.catch-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ui-text);
}

.catch-desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ui-text-muted);
  line-height: 1.4;
}

.catch-chance {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--ui-text);
}

.catch-chance-label {
  min-width: 36px;
  color: var(--ui-text-muted);
}

.catch-chance-desc {
  margin: -4px 0 0;
  font-size: 11px;
  color: var(--ui-text-faint, rgba(255, 255, 255, 0.4));
}

.catch-empty {
  font-size: 12px;
  color: var(--ui-text-muted);
  padding: 8px 0;
}

.catch-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.catch-row :deep(.ant-input) {
  flex: 1;
}
</style>
