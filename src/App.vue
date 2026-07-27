<template>
  <a-config-provider :theme="antdTheme">
    <div
      class="app-root"
      :data-ui-theme="uiTheme"
      :style="themeVars"
      :data-splash="showSplash ? '1' : '0'"
    >
      <div v-if="showSplash" class="app-splash" aria-hidden="true">
        <div class="splash-glow" />
        <img class="splash-logo" src="/app-icon.png" alt="" />
        <p class="splash-title">Desktop Pet</p>
      </div>
      <div class="app-main" :class="{ 'app-main--in': !showSplash }">
        <PetSettings @ui-theme-change="onUiThemeChange" />
      </div>
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { theme } from "ant-design-vue";
import PetSettings from "./views/PetSettings.vue";
import {
  applySettingsWindowPin,
  initPetHostBridge,
} from "./pet/hostBridge";
import { loadPetSettings } from "./pet/settings";
import {
  isAppUiTheme,
  type AppUiTheme,
  uiThemeCssVars,
  UI_THEME_TOKENS,
} from "./theme/uiTheme";

const uiTheme = ref<AppUiTheme>(loadPetSettings().uiTheme);
const showSplash = ref(true);
const themeVars = computed(() => uiThemeCssVars(uiTheme.value));
const antdTheme = computed(() => {
  const tokens = UI_THEME_TOKENS[uiTheme.value];
  return {
    algorithm:
      tokens.algorithm === "dark"
        ? theme.darkAlgorithm
        : theme.defaultAlgorithm,
    token: { colorPrimary: tokens.colorPrimary },
  };
});

let disposeHost: (() => void) | null = null;
let splashTimer: number | null = null;

function onUiThemeChange(next: AppUiTheme) {
  if (!isAppUiTheme(next)) return;
  uiTheme.value = next;
  document.documentElement.style.background = UI_THEME_TOKENS[next].bg0;
  document.body.style.background = UI_THEME_TOKENS[next].bg0;
}

onMounted(() => {
  onUiThemeChange(uiTheme.value);
  disposeHost = initPetHostBridge(() => {
    void applySettingsWindowPin(loadPetSettings().settingsAlwaysOnTop);
  });
  splashTimer = window.setTimeout(() => {
    showSplash.value = false;
  }, 1400);
});

onUnmounted(() => {
  disposeHost?.();
  disposeHost = null;
  if (splashTimer != null) window.clearTimeout(splashTimer);
});
</script>

<style scoped>
.app-root {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: var(--ui-text);
  background: radial-gradient(
    120% 80% at 10% 0%,
    var(--ui-bg-1) 0%,
    var(--ui-bg-0) 55%
  );
  position: relative;
}

.app-main {
  height: 100%;
  opacity: 0;
  transform: translateY(10px) scale(0.985);
}

.app-main--in {
  animation: app-main-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes app-main-in {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.app-splash {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: radial-gradient(
    90% 70% at 50% 40%,
    color-mix(in srgb, var(--ui-primary) 18%, var(--ui-bg-0)),
    var(--ui-bg-0) 70%
  );
  animation: splash-out 0.55s ease 1.05s forwards;
  pointer-events: none;
}

.splash-glow {
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--ui-primary) 45%, transparent),
    transparent 70%
  );
  filter: blur(8px);
  animation: splash-pulse 1.2s ease-in-out infinite;
}

.splash-logo {
  position: relative;
  width: 112px;
  height: 112px;
  object-fit: contain;
  border-radius: 24px;
  animation: splash-logo-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  filter: drop-shadow(0 0 18px color-mix(in srgb, var(--ui-primary) 55%, transparent));
}

.splash-title {
  position: relative;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--ui-text);
  animation: splash-title-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both;
}

@keyframes splash-logo-in {
  from {
    opacity: 0;
    transform: scale(0.72) translateY(12px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes splash-title-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes splash-pulse {
  0%,
  100% {
    transform: scale(0.92);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

@keyframes splash-out {
  to {
    opacity: 0;
    transform: scale(1.04);
    visibility: hidden;
  }
}
</style>
