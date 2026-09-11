<template>
  <a-config-provider :theme="antdTheme">
    <div
      class="app-root theme-stage"
      :data-style="theme.style"
      :style="themeVars"
      :data-splash="showSplash ? '1' : '0'"
    >
      <ThemeTitleBar :pack-title="packTitle" />
      <ThemeMediaLayer
        v-if="wallpaperActive"
        class="app-wallpaper"
        :path="theme.stageBackdrop.imagePath"
        :fit="theme.stageBackdrop.fit"
        :muted="theme.stageBackdrop.muted"
        :loop="true"
        preload="auto"
        @ready="onWallpaperReady"
        @error="onWallpaperError"
      />
      <div
        v-if="showSplash"
        class="app-splash"
        :class="{
          'app-splash--media': useBootMedia,
          'app-splash--ready': bootMediaReady,
        }"
        aria-hidden="true"
        @click="onSplashClick"
      >
        <template v-if="useBootMedia">
          <div class="splash-media-stage">
            <ThemeMediaLayer
              :path="theme.bootAnimation.mediaPath"
              :fit="theme.bootAnimation.fit"
              :muted="theme.bootAnimation.muted"
              :loop="bootMediaLoop"
              preload="metadata"
              :defer-src="true"
              @ready="onBootMediaReady"
              @ended="onBootVideoEnded"
              @error="onBootMediaError"
            />
          </div>
          <BootSplashBar
            :status-text="
              bootMediaReady ? t('pet.bootAnimReady') : t('pet.bootAnimLoading')
            "
            :skip-text="skipHint"
          />
        </template>
        <template v-else>
          <div class="splash-glow" />
          <img class="splash-logo" src="/app-icon.png" alt="" />
          <p class="splash-title">{{ t("pet.pageTitle") }}</p>
        </template>
      </div>
      <div
        v-if="mainMounted"
        class="app-main"
        :class="{ 'app-main--in': !showSplash }"
      >
        <PetSettings @theme-change="onThemeChange" />
      </div>
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { theme as antTheme } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import PetSettings from "./views/PetSettings.vue";
import {
  applySettingsWindowPin,
  initPetHostBridge,
} from "./pet/bridge/hostBridge";
import { loadPetSettings } from "./pet/data/settings";
import "@/theme";
import {
  bootRemainMinMs,
  bootScheduleDelayMs,
  clonePetThemeSettings,
  detectThemeMediaKind,
  getThemeControlShape,
  getThemePack,
  paintDocumentBackdrop,
  themeRootStyle,
  BootSplashBar,
  ThemeMediaLayer,
  ThemeTitleBar,
  type PetThemeSettings,
} from "@/theme";

import { emit } from "@tauri-apps/api/event";
import { PET_HOTKEY_SUSPEND_EVENT } from "@/pet/events/hotkey";

const { t } = useI18n();
const theme = ref<PetThemeSettings>(loadPetSettings().theme);
const showSplash = ref(true);
const bootMediaReady = ref(false);
const bootVideoEnded = ref(false);
const wallpaperReady = ref(false);
/** 大开机媒体时延后挂设置页，减轻无响应 */
const mainMounted = ref(false);
const themeVars = computed(() => themeRootStyle(theme.value));
const packTitle = computed(() => getThemePack(theme.value.style).meta.title);
const wallpaperActive = computed(
  () =>
    theme.value.stageBackdrop.mode === "wallpaper" &&
    Boolean(theme.value.stageBackdrop.imagePath.trim()) &&
    detectThemeMediaKind(theme.value.stageBackdrop.imagePath) !== "none"
);
const useBootMedia = computed(() => {
  const boot = theme.value.bootAnimation;
  return (
    boot.enabled &&
    Boolean(boot.mediaPath.trim()) &&
    detectThemeMediaKind(boot.mediaPath) !== "none"
  );
});
const bootMediaKind = computed(() =>
  detectThemeMediaKind(theme.value.bootAnimation.mediaPath)
);
const bootMediaLoop = computed(
  () =>
    !(
      theme.value.bootAnimation.durationMode === "media" &&
      bootMediaKind.value === "video"
    )
);
const skipHint = computed(() => t("pet.bootAnimSkip"));
const antdTheme = computed(() => {
  const tokens = getThemePack(theme.value.style).tokens;
  const shape = getThemeControlShape(theme.value.style);
  return {
    algorithm:
      tokens.antAlgorithm === "dark"
        ? antTheme.darkAlgorithm
        : antTheme.defaultAlgorithm,
    token: {
      colorPrimary: tokens.colorPrimary,
      borderRadius: shape.antRadius,
    },
  };
});

let disposeHost: (() => void) | null = null;
let splashTimer: number | null = null;
let bootReadyAt = 0;
let wallpaperWaitResolve: (() => void) | null = null;
let splashEnding = false;
const WALLPAPER_WAIT_MS = 2200;

function clearSplashTimer() {
  if (splashTimer != null) {
    window.clearTimeout(splashTimer);
    splashTimer = null;
  }
}

function ensureHost() {
  if (disposeHost) return;
  disposeHost = initPetHostBridge(() => {
    void applySettingsWindowPin(loadPetSettings().settingsAlwaysOnTop);
  });
}

function resolveWallpaperWait() {
  wallpaperWaitResolve?.();
  wallpaperWaitResolve = null;
}

function onWallpaperReady() {
  wallpaperReady.value = true;
  resolveWallpaperWait();
}

function onWallpaperError() {
  // 加载失败也别卡 splash
  wallpaperReady.value = true;
  resolveWallpaperWait();
}

function waitWallpaperOrTimeout(): Promise<void> {
  if (!wallpaperActive.value || wallpaperReady.value) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      wallpaperWaitResolve = null;
      resolve();
    }, WALLPAPER_WAIT_MS);
    wallpaperWaitResolve = () => {
      window.clearTimeout(timer);
      resolve();
    };
  });
}

async function endSplash() {
  if (!showSplash.value || splashEnding) return;
  splashEnding = true;
  clearSplashTimer();
  try {
    await waitWallpaperOrTimeout();
    if (!showSplash.value) return;
    showSplash.value = false;
    paintDocumentBackdrop(theme.value.style);
    mainMounted.value = true;
    // 下一帧再起 host，别和设置页首屏抢线程
    requestAnimationFrame(() => {
      ensureHost();
    });
  } finally {
    if (showSplash.value) splashEnding = false;
  }
}

function onSplashClick() {
  void endSplash();
}

function scheduleFromReady() {
  clearSplashTimer();
  const boot = theme.value.bootAnimation;
  const delay = bootScheduleDelayMs({
    durationMode: boot.durationMode,
    durationSec: boot.durationSec,
    mediaKind: bootMediaKind.value,
    videoEnded: bootVideoEnded.value,
    readyAtMs: bootReadyAt,
  });
  if (delay == null) return;
  splashTimer = window.setTimeout(() => {
    void endSplash();
  }, delay);
}

function onBootMediaReady() {
  bootMediaReady.value = true;
  bootReadyAt = Date.now();
  scheduleFromReady();
}

function onBootVideoEnded() {
  bootVideoEnded.value = true;
  if (theme.value.bootAnimation.durationMode !== "media") return;
  if (!bootMediaReady.value) return;
  clearSplashTimer();
  splashTimer = window.setTimeout(() => {
    void endSplash();
  }, bootRemainMinMs(bootReadyAt));
}

function onBootMediaError() {
  void endSplash();
}

function onThemeChange(next: PetThemeSettings) {
  const prevPath = theme.value.stageBackdrop.imagePath;
  theme.value = clonePetThemeSettings(next);
  if (next.stageBackdrop.imagePath !== prevPath) {
    wallpaperReady.value = false;
  }
  paintDocumentBackdrop(next.style);
}

function startSplash() {
  showSplash.value = true;
  splashEnding = false;
  bootMediaReady.value = false;
  bootVideoEnded.value = false;
  wallpaperReady.value = false;
  bootReadyAt = 0;
  clearSplashTimer();
  paintDocumentBackdrop(theme.value.style);
  if (!useBootMedia.value) {
    mainMounted.value = true;
    splashTimer = window.setTimeout(() => {
      void endSplash();
    }, 1400);
    ensureHost();
  }
  // 有自定义媒体：等 ready；随视频模式不加最长兜底
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function onHotkeyFocusIn(ev: FocusEvent) {
  if (isEditableTarget(ev.target)) {
    void emit(PET_HOTKEY_SUSPEND_EVENT, { suspend: true });
  }
}

function onHotkeyFocusOut(ev: FocusEvent) {
  if (isEditableTarget(ev.target)) {
    // 下一焦点可能仍是输入框，延迟再判
    window.setTimeout(() => {
      const active = document.activeElement;
      void emit(PET_HOTKEY_SUSPEND_EVENT, {
        suspend: isEditableTarget(active),
      });
    }, 0);
  }
}

onMounted(() => {
  theme.value = clonePetThemeSettings(loadPetSettings().theme);
  startSplash();
  document.addEventListener("focusin", onHotkeyFocusIn, true);
  document.addEventListener("focusout", onHotkeyFocusOut, true);
});

onUnmounted(() => {
  document.removeEventListener("focusin", onHotkeyFocusIn, true);
  document.removeEventListener("focusout", onHotkeyFocusOut, true);
  disposeHost?.();
  disposeHost = null;
  clearSplashTimer();
  resolveWallpaperWait();
});
</script>

<style scoped>
.app-root {
  --titlebar-h: 38px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: var(--ui-text);
  background: var(--ui-bg-0);
  position: relative;
  display: flex;
  flex-direction: column;
}

.app-wallpaper {
  z-index: 0;
}

.app-main {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  min-height: 0;
  height: auto;
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
  left: 0;
  right: 0;
  top: var(--titlebar-h, 38px);
  bottom: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  cursor: pointer;
  background: var(--ui-bg-0, #0a0a0a);
}

.app-splash--media {
  align-items: stretch;
  justify-content: flex-start;
  gap: 0;
  background: var(--ui-bg-0, #0a0a0a);
}

.app-splash--media.app-splash--ready {
  background: var(--ui-bg-0, #0a0a0a);
}

.splash-media-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  background: var(--ui-bg-0, #0a0a0a);
}

.app-splash--media .splash-media-stage::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--ui-primary, #7ec8ff) 75%, #fff) 0%,
    color-mix(in srgb, var(--ui-primary, #7ec8ff) 40%, #000) 55%,
    rgba(0, 0, 0, 0.85) 100%
  );
  box-shadow:
    0 -1px 0 color-mix(in srgb, var(--ui-primary, #7ec8ff) 55%, transparent),
    0 1px 0 rgba(0, 0, 0, 0.65),
    0 0 10px color-mix(in srgb, var(--ui-primary, #7ec8ff) 35%, transparent);
}

.app-splash--media :deep(.theme-media-layer) {
  z-index: 0;
}

.splash-glow {
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--ui-primary) 35%, transparent),
    transparent 70%
  );
  filter: blur(8px);
}

.splash-logo {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  position: relative;
  z-index: 1;
  box-shadow: 0 12px 40px color-mix(in srgb, var(--ui-primary) 28%, transparent);
}

.splash-title {
  margin: 0;
  position: relative;
  z-index: 1;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.88);
}
</style>
