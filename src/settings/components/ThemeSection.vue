<template>
  <section class="theme-sec">
    <span v-if="label" class="theme-lab">{{ label }}</span>
    <div class="theme-list">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  label?: string;
}>();
</script>
