<template>
  <div class="theme-seg" role="radiogroup" :aria-label="ariaLabel">
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      role="radio"
      class="theme-seg-opt"
      :class="{ on: modelValue === opt.value }"
      :aria-checked="modelValue === opt.value"
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
