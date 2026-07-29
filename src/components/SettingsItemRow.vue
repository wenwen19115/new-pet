<template>
  <div class="settings-item" :data-stack="stack ? '1' : '0'">
    <div class="item-main">
      <div class="item-icon" :data-tone="tone">
        <slot name="icon" />
      </div>
      <div class="item-text">
        <div class="item-title">{{ title }}</div>
        <div v-if="description" class="item-desc">{{ description }}</div>
      </div>
    </div>
    <div class="item-actions">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    tone?: "default" | "pet";
    /** Put controls on the next line (wide inputs / avoid crushing description) */
    stack?: boolean;
  }>(),
  {
    description: "",
    tone: "default",
    stack: false,
  }
);
</script>

<style scoped>
.settings-item {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.08));
  background: var(--ui-surface, rgba(0, 0, 0, 0.22));
}

.settings-item[data-stack="1"] {
  flex-direction: column;
  align-items: stretch;
}

.item-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 160px;
  flex: 1 1 auto;
}

.item-icon {
  --tone: var(--ui-accent-soft, rgba(255, 255, 255, 0.08));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 9px;
  background: var(--tone);
  font-size: 17px;
  color: var(--ui-text-muted, rgba(255, 255, 255, 0.78));
}

.item-icon[data-tone="pet"] {
  --tone: var(--ui-accent-soft, rgba(64, 196, 255, 0.16));
  color: var(--ui-primary, #40c4ff);
}

.item-text {
  min-width: 0;
  flex: 1;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--ui-text, rgba(255, 255, 255, 0.9));
  line-height: 1.35;
}

.item-desc {
  margin-top: 3px;
  font-size: 12px;
  color: var(--ui-text-faint, rgba(255, 255, 255, 0.45));
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: normal;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  flex-shrink: 0;
  margin-left: auto;
}

.settings-item[data-stack="1"] .item-actions {
  margin-left: 0;
  width: 100%;
  padding-left: 48px;
  box-sizing: border-box;
}
</style>
