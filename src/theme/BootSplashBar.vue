<template>
  <div class="boot-splash-bar" role="status">
    <div class="boot-splash-bar__face">
      <div class="boot-splash-bar__motion" aria-hidden="true">
        <span class="dot" />
        <span class="dot" />
        <span class="dot" />
        <span class="pulse" />
      </div>
      <div class="boot-splash-bar__text">
        <span class="status">{{ statusText }}</span>
        <span class="sep" aria-hidden="true">·</span>
        <span class="skip">{{ skipText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  statusText: string;
  skipText: string;
}>();
</script>

<style scoped>
/* 外框：明显抬起的台面 + 底部厚度 */
.boot-splash-bar {
  --boot-hi: color-mix(in srgb, var(--ui-primary, #7ec8ff) 55%, #fff);
  --boot-mid: color-mix(in srgb, var(--ui-surface-strong, #222833) 88%, #fff);
  --boot-lo: color-mix(in srgb, var(--ui-bg-0, #0a0a0a) 70%, #000);
  --boot-edge: color-mix(in srgb, var(--ui-primary, #7ec8ff) 65%, #000);

  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  margin: 0;
  padding: 0 0 5px;
  box-sizing: border-box;
  background: linear-gradient(180deg, var(--boot-edge) 0%, #1a1208 55%, #050508 100%);
  box-shadow:
    0 -10px 28px rgba(0, 0, 0, 0.55),
    0 -2px 0 color-mix(in srgb, var(--ui-primary, #7ec8ff) 35%, transparent);
  pointer-events: none;
  color: var(--ui-text, rgba(255, 255, 255, 0.92));
}

/* 面板正面：上亮下暗的硬斜切 */
.boot-splash-bar__face {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 12px 18px 14px;
  box-sizing: border-box;
  border-top: 2px solid var(--boot-hi);
  border-left: 1px solid color-mix(in srgb, var(--boot-hi) 55%, transparent);
  border-right: 1px solid rgba(0, 0, 0, 0.45);
  border-bottom: 2px solid rgba(0, 0, 0, 0.72);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--ui-primary, #7ec8ff) 28%, transparent) 0%,
      transparent 38%
    ),
    linear-gradient(180deg, var(--boot-mid) 0%, var(--boot-lo) 100%);
  box-shadow:
    inset 0 3px 0 color-mix(in srgb, #fff 22%, transparent),
    inset 0 -4px 8px rgba(0, 0, 0, 0.45),
    inset 3px 0 6px rgba(255, 255, 255, 0.06),
    inset -4px 0 8px rgba(0, 0, 0, 0.35);
}

/* 顶棱高光条 */
.boot-splash-bar__face::before {
  content: "";
  position: absolute;
  left: 8%;
  right: 8%;
  top: 0;
  height: 3px;
  border-radius: 0 0 2px 2px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--ui-primary, #7ec8ff) 85%, #fff),
    transparent
  );
  box-shadow: 0 0 12px color-mix(in srgb, var(--ui-primary, #7ec8ff) 55%, transparent);
  pointer-events: none;
}

/* 底部厚度台阶 */
.boot-splash-bar::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 5px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--ui-primary, #7ec8ff) 25%, #2a2018) 0%,
    #0a0806 100%
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

.boot-splash-bar__motion {
  position: relative;
  width: 36px;
  height: 18px;
  flex-shrink: 0;
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.55));
}

.dot {
  position: absolute;
  top: 50%;
  width: 6px;
  height: 6px;
  margin-top: -3px;
  border-radius: 50%;
  background: var(--ui-primary, #7ec8ff);
  box-shadow:
    0 0 8px color-mix(in srgb, var(--ui-primary, #7ec8ff) 55%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  animation: boot-dot 1.05s ease-in-out infinite;
}

.dot:nth-child(1) {
  left: 2px;
  animation-delay: 0s;
}
.dot:nth-child(2) {
  left: 14px;
  animation-delay: 0.15s;
}
.dot:nth-child(3) {
  left: 26px;
  animation-delay: 0.3s;
}

.pulse {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18px;
  height: 18px;
  margin: -9px 0 0 -9px;
  border-radius: 50%;
  border: 1.5px solid
    color-mix(in srgb, var(--ui-primary, #7ec8ff) 55%, transparent);
  opacity: 0;
  animation: boot-ring 1.4s ease-out infinite;
}

.boot-splash-bar__text {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 8px;
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.55);
}

.status {
  color: var(--ui-text, rgba(255, 255, 255, 0.92));
}

.sep {
  color: var(--ui-text-faint, rgba(255, 255, 255, 0.4));
}

.skip {
  color: color-mix(in srgb, var(--ui-primary, #7ec8ff) 88%, #fff);
}

@keyframes boot-dot {
  0%,
  80%,
  100% {
    transform: translateY(0) scale(0.85);
    opacity: 0.45;
  }
  40% {
    transform: translateY(-4px) scale(1.15);
    opacity: 1;
  }
}

@keyframes boot-ring {
  0% {
    transform: scale(0.4);
    opacity: 0.55;
  }
  70% {
    transform: scale(1.35);
    opacity: 0;
  }
  100% {
    transform: scale(1.35);
    opacity: 0;
  }
}
</style>
