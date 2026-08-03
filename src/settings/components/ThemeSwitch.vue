<template>
  <button
    type="button"
    class="theme-sw"
    :class="{ on: checked }"
    :aria-pressed="checked"
    :aria-label="ariaLabel"
    :disabled="disabled"
    @click="onClick"
  />
</template>

<script setup lang="ts">
const props = defineProps<{
  checked: boolean;
  ariaLabel?: string;
  disabled?: boolean;
}>();
const emit = defineEmits<{
  "update:checked": [value: boolean];
}>();

function onClick() {
  if (props.disabled) return;
  emit("update:checked", !props.checked);
}
</script>

<style scoped>
.theme-sw:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
