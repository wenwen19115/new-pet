<template>
  <div
    class="settings-item"
    :data-stack="stack ? '1' : '0'"
    :data-plain="plain ? '1' : '0'"
    :data-tone="tone"
  >
    <div class="item-main">
      <div v-if="!plain && $slots.icon" class="item-icon" :data-tone="tone">
        <slot name="icon" />
      </div>
      <div class="item-text">
        <div class="item-title">{{ title }}</div>
        <div v-if="description" class="item-desc theme-d">{{ description }}</div>
        <div v-if="$slots.body" class="item-body">
          <slot name="body" />
        </div>
      </div>
    </div>
    <div v-if="$slots.default" class="item-actions">
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
    /** 控件另起一行 */
    stack?: boolean;
    /** 对齐 mockup .item：无左侧图标 */
    plain?: boolean;
  }>(),
  {
    description: "",
    tone: "default",
    stack: false,
    plain: true,
  }
);
</script>

<style scoped>
.settings-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.08));
  background: var(--ui-surface, rgba(0, 0, 0, 0.22));
  box-sizing: border-box;
  width: 100%;
}

.settings-item[data-stack="1"],
.settings-item:not(:has(.item-actions)) {
  grid-template-columns: minmax(0, 1fr);
}

.item-main {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
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
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 700;
  color: var(--ui-text, rgba(255, 255, 255, 0.9));
  line-height: 1.35;
}

.item-desc {
  margin: 0;
  font-size: 12px;
  color: var(--ui-text-muted, rgba(255, 255, 255, 0.45));
  line-height: 1.45;
}

.item-body {
  min-width: 0;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.settings-item[data-stack="1"] .item-actions {
  width: 100%;
  justify-content: flex-start;
}
</style>
