<template>
  <div class="theme-choices-wrap">
    <div class="theme-choices" role="listbox" :aria-label="ariaLabel">
      <button
        v-for="opt in options"
        :key="String(opt.value)"
        type="button"
        role="option"
        class="theme-choice"
        :class="{ on: modelValue === opt.value }"
        :aria-selected="modelValue === opt.value"
        :title="opt.hint"
        @click="$emit('update:modelValue', opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
    <p v-if="selectedHint" class="theme-choices-hint">{{ selectedHint }}</p>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number">
import { computed } from "vue";

const props = defineProps<{
  modelValue: T;
  options: Array<{ label: string; value: T; hint?: string }>;
  ariaLabel?: string;
}>();
defineEmits<{
  "update:modelValue": [value: T];
}>();

const selectedHint = computed(() => {
  const hit = props.options.find((o) => o.value === props.modelValue);
  return hit?.hint || "";
});
</script>

<style scoped>
.theme-choices-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.theme-choices {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.theme-choices-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--ui-text-muted);
}
</style>
