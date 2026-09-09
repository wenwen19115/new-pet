<template>
  <header class="app-titlebar" data-tauri-drag-region @dblclick="onToggleMaximize">
    <div class="app-titlebar__wash" aria-hidden="true" />
    <div class="app-titlebar__glow" aria-hidden="true" />
    <div class="app-titlebar__grain" aria-hidden="true" />
    <div class="app-titlebar__brand" data-tauri-drag-region>
      <img class="app-titlebar__icon" src="/app-icon.png" alt="" draggable="false" />
      <div class="app-titlebar__titles" data-tauri-drag-region>
        <span class="app-titlebar__name">{{ t("pet.pageTitle") }}</span>
        <span class="app-titlebar__pack">{{ packTitle }}</span>
      </div>
    </div>
    <div class="app-titlebar__rail" aria-hidden="true" />
    <div class="app-titlebar__controls" @dblclick.stop>
      <button
        type="button"
        class="app-titlebar__btn"
        :title="t('pet.windowMinimize')"
        :aria-label="t('pet.windowMinimize')"
        @click.stop="onMinimize"
      >
        <span class="app-titlebar__glyph app-titlebar__glyph--min" />
      </button>
      <button
        type="button"
        class="app-titlebar__btn"
        :title="
          maximized ? t('pet.windowRestore') : t('pet.windowMaximize')
        "
        :aria-label="
          maximized ? t('pet.windowRestore') : t('pet.windowMaximize')
        "
        @click.stop="onToggleMaximize"
      >
        <span
          class="app-titlebar__glyph"
          :class="
            maximized
              ? 'app-titlebar__glyph--restore'
              : 'app-titlebar__glyph--max'
          "
        />
      </button>
      <button
        type="button"
        class="app-titlebar__btn app-titlebar__btn--close"
        :title="t('pet.windowClose')"
        :aria-label="t('pet.windowClose')"
        @click.stop="onClose"
      >
        <span class="app-titlebar__glyph app-titlebar__glyph--close" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { getCurrentWindow } from "@tauri-apps/api/window";

defineProps<{
  packTitle: string;
}>();

const { t } = useI18n();
const maximized = ref(false);
let unlistenResize: (() => void) | null = null;

async function syncMaximized() {
  try {
    maximized.value = await getCurrentWindow().isMaximized();
  } catch {
    maximized.value = false;
  }
}

async function onMinimize() {
  try {
    await getCurrentWindow().minimize();
  } catch {
    /* ignore */
  }
}

async function onToggleMaximize() {
  try {
    await getCurrentWindow().toggleMaximize();
    await syncMaximized();
  } catch {
    /* ignore */
  }
}

async function onClose() {
  try {
    await getCurrentWindow().close();
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  void syncMaximized();
  void getCurrentWindow()
    .onResized(() => {
      void syncMaximized();
    })
    .then((fn) => {
      unlistenResize = fn;
    })
    .catch(() => {
      /* ignore */
    });
});

onUnmounted(() => {
  unlistenResize?.();
  unlistenResize = null;
});
</script>
