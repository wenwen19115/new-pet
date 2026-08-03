<template>
  <div
    v-if="liveSrc && kind !== 'none'"
    class="theme-media-layer"
    :class="{ 'is-ready': ready }"
    :data-fit="fit"
    aria-hidden="true"
  >
    <video
      v-if="kind === 'video'"
      ref="videoEl"
      class="theme-media-el"
      :src="liveSrc"
      :muted="muted"
      :loop="loop"
      autoplay
      playsinline
      :preload="preload"
      @loadeddata="onVideoReady"
      @canplay="onVideoReady"
      @ended="$emit('ended')"
      @error="$emit('error')"
    />
    <img
      v-else
      class="theme-media-el"
      :src="liveSrc"
      alt=""
      decoding="async"
      loading="eager"
      @load="onImageReady"
      @error="$emit('error')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  detectThemeMediaKind,
  themeMediaSrc,
  type ThemeMediaKind,
} from "./media";
import type { ThemeWallpaperFit } from "./types";

const props = withDefaults(
  defineProps<{
    path: string;
    fit?: ThemeWallpaperFit;
    muted?: boolean;
    loop?: boolean;
    /** boot 大文件用 metadata，壁纸循环可用 auto */
    preload?: "auto" | "metadata" | "none";
    /** 延后挂 src，先让状态栏画出来，减轻卡顿 */
    deferSrc?: boolean;
  }>(),
  {
    fit: "cover",
    muted: false,
    loop: true,
    preload: "auto",
    deferSrc: false,
  }
);

const emit = defineEmits<{
  ready: [];
  ended: [];
  error: [];
}>();

const videoEl = ref<HTMLVideoElement | null>(null);
const ready = ref(false);
const liveSrc = ref("");
let readyEmitted = false;
let cancelDefer: (() => void) | null = null;

const kind = computed<ThemeMediaKind>(() => detectThemeMediaKind(props.path));

function markReady() {
  if (readyEmitted) return;
  readyEmitted = true;
  ready.value = true;
  emit("ready");
}

function onImageReady() {
  markReady();
}

function onVideoReady() {
  markReady();
  void tryPlay();
}

async function tryPlay() {
  const el = videoEl.value;
  if (!el || kind.value !== "video") return;
  try {
    el.muted = props.muted;
    await el.play();
  } catch {
    try {
      el.muted = true;
      await el.play();
    } catch {
      emit("error");
    }
  }
}

function armSrc() {
  cancelDefer?.();
  cancelDefer = null;
  ready.value = false;
  readyEmitted = false;
  liveSrc.value = "";

  const apply = () => {
    liveSrc.value = themeMediaSrc(props.path);
  };

  if (!props.deferSrc) {
    apply();
    return;
  }

  // 两帧 + 短延迟：先画底栏，再开始吃大文件
  let alive = true;
  let rafOuter = 0;
  let rafInner = 0;
  let deferTimer: number | null = null;
  cancelDefer = () => {
    alive = false;
    if (rafOuter) cancelAnimationFrame(rafOuter);
    if (rafInner) cancelAnimationFrame(rafInner);
    if (deferTimer != null) {
      window.clearTimeout(deferTimer);
      deferTimer = null;
    }
    rafOuter = 0;
    rafInner = 0;
  };
  rafOuter = requestAnimationFrame(() => {
    rafInner = requestAnimationFrame(() => {
      deferTimer = window.setTimeout(() => {
        deferTimer = null;
        if (alive) apply();
      }, 32);
    });
  });
}

watch(
  () => props.path,
  () => {
    armSrc();
  }
);

watch(
  () => [props.muted, kind.value, liveSrc.value] as const,
  () => {
    void tryPlay();
  }
);

onMounted(() => {
  armSrc();
});

onUnmounted(() => {
  cancelDefer?.();
  cancelDefer = null;
  readyEmitted = false;
});
</script>

<style scoped>
.theme-media-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.theme-media-layer.is-ready {
  opacity: 1;
}

.theme-media-el {
  width: 100%;
  height: 100%;
  display: block;
  object-position: center;
  object-fit: cover;
}

.theme-media-layer[data-fit="contain"] .theme-media-el {
  object-fit: contain;
}
</style>
