<template>
  <div class="theme-choices" role="listbox" :aria-label="ariaLabel">
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      role="option"
      class="theme-choice"
      :class="{ on: modelValue === opt.value }"
      :aria-selected="modelValue === opt.value"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number">
defineProps<{
  modelValue: T;
  options: Array<{ label: string; value: T }>;
  ariaLabel?: string;
}>();
defineEmits<{
  "update:modelValue": [value: T];
}>();
</script>

<style scoped>
.theme-choices {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
</style>
