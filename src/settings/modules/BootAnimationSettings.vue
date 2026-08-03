<template>
  <div class="boot-anim span-2">
    <SettingsItemRow
      :title="$t('pet.bootAnimTitle')"
      :description="$t('pet.bootAnimDesc')"
      tone="pet"
      :plain="false"
    >
      <template #icon><PlayCircleOutlined /></template>
      <ThemeSwitch
        :checked="boot.enabled"
        @update:checked="(v) => ctx.onBootAnimationEnabled(v)"
      />
    </SettingsItemRow>

    <div v-if="boot.enabled" class="boot-anim-body">
      <div class="boot-anim-sub boot-anim-sub--preview">
        <div class="boot-anim-sub-top">
          <div class="boot-anim-sub-label">
            <EyeOutlined />
            <span>{{ $t("pet.bootAnimPreview") }}</span>
          </div>
          <div class="boot-anim-row">
            <button
              type="button"
              class="theme-btn pri"
              :disabled="!hasMedia"
              @click="onPreviewToggle"
            >
              {{
                previewPlaying
                  ? $t("pet.bootAnimPreviewStop")
                  : $t("pet.bootAnimPreviewPlay")
              }}
            </button>
          </div>
        </div>
        <div class="boot-anim-hint">{{ $t("pet.bootAnimPreviewDesc") }}</div>
        <div class="boot-anim-preview" :data-playing="previewPlaying ? '1' : '0'">
          <div v-if="!hasMedia" class="boot-anim-preview-empty">
            {{ $t("pet.bootAnimPreviewEmpty") }}
          </div>
          <div
            v-else
            class="boot-anim-preview-stage"
            @click="onPreviewStageClick"
          >
            <div class="boot-anim-preview-media">
              <ThemeMediaLayer
                :key="mediaLayerKey"
                :path="boot.mediaPath"
                :fit="boot.fit"
                :muted="previewMuted"
                :loop="previewLoop"
                preload="metadata"
                :defer-src="true"
                @ready="onPreviewReady"
                @ended="onPreviewVideoEnded"
                @error="onPreviewError"
              />
              <div
                v-if="previewPhase === 'done'"
                class="boot-anim-preview-done"
              >
                {{ $t("pet.bootAnimPreviewDone") }}
              </div>
            </div>
            <BootSplashBar
              :status-text="previewStatusText"
              :skip-text="$t('pet.bootAnimSkip')"
            />
          </div>
        </div>
      </div>

      <div class="boot-anim-sub boot-anim-sub--media">
        <div class="boot-anim-sub-top">
          <div class="boot-anim-sub-label">
            <VideoCameraOutlined />
            <span>{{ $t("pet.bootAnimSubtabMedia") }}</span>
          </div>
        </div>
        <div class="boot-anim-hint">{{ $t("pet.themeMediaHint") }}</div>
        <div class="boot-anim-row">
          <button
            type="button"
            class="theme-btn pri"
            @click="ctx.onPickBootAnimation"
          >
            {{ $t("pet.bootAnimPick") }}
          </button>
          <button
            type="button"
            class="theme-btn"
            :disabled="!boot.mediaPath"
            @click="ctx.onClearBootAnimation"
          >
            {{ $t("pet.bootAnimClear") }}
          </button>
        </div>
        <div class="boot-anim-param-hint">
          {{ boot.mediaPath || $t("pet.bootAnimMediaEmpty") }}
        </div>
      </div>

      <div class="boot-anim-sub boot-anim-sub--duration">
        <div class="boot-anim-sub-top">
          <div class="boot-anim-sub-label">
            <FieldTimeOutlined />
            <span>{{ $t("pet.bootAnimSubtabDuration") }}</span>
          </div>
        </div>
        <div class="boot-anim-hint">{{ $t("pet.bootAnimDurationDesc") }}</div>
        <div class="boot-anim-row">
          <ThemeSeg
            :model-value="boot.durationMode"
            :options="ctx.bootDurationModeOptions.value"
            :aria-label="$t('pet.bootAnimDurationTitle')"
            @update:model-value="(v) => ctx.onBootAnimationDurationMode(v)"
          />
        </div>
        <div
          v-if="boot.durationMode === 'manual'"
          class="boot-anim-row boot-anim-row--spaced"
        >
          <ThemeMeter
            class="boot-anim-meter"
            :value="boot.durationSec"
            :min="3"
            :max="120"
            :step="1"
            :aria-label="$t('pet.bootAnimDurationSec')"
            @change="ctx.onBootAnimationDurationSec"
          >
            {{ boot.durationSec }}s
          </ThemeMeter>
        </div>
        <div v-if="boot.durationMode === 'manual'" class="boot-anim-param-hint">
          {{ $t("pet.bootAnimDurationSecDesc") }}
        </div>
      </div>

      <div class="boot-anim-sub boot-anim-sub--display">
        <div class="boot-anim-sub-top">
          <div class="boot-anim-sub-label">
            <ExpandOutlined />
            <span>{{ $t("pet.bootAnimSubtabDisplay") }}</span>
          </div>
        </div>
        <div class="boot-anim-hint">{{ $t("pet.bootAnimFitDesc") }}</div>
        <div class="boot-anim-row boot-anim-row--between">
          <ThemeSeg
            :model-value="boot.fit"
            :options="ctx.themeWallpaperFitOptions.value"
            :aria-label="$t('pet.themeWallpaperFit')"
            @update:model-value="(v) => ctx.onBootAnimationFit(v)"
          />
        </div>
        <div class="boot-anim-row boot-anim-row--between boot-anim-row--spaced-lg">
          <div>
            <div class="boot-anim-sub-label boot-anim-sub-label--sm">
              {{ $t("pet.themeMediaMuted") }}
            </div>
            <div class="boot-anim-param-hint boot-anim-param-hint--tight">
              {{ $t("pet.themeMediaMutedDesc") }}
            </div>
          </div>
          <ThemeSwitch
            :checked="boot.muted"
            @update:checked="(v) => ctx.onBootAnimationMuted(v)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  ExpandOutlined,
  EyeOutlined,
  FieldTimeOutlined,
  PlayCircleOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons-vue";
import SettingsItemRow from "@/components/SettingsItemRow.vue";
import ThemeSeg from "@/settings/components/ThemeSeg.vue";
import ThemeSwitch from "@/settings/components/ThemeSwitch.vue";
import ThemeMeter from "@/settings/components/ThemeMeter.vue";
import { PET_SETTINGS_PAGE_KEY } from "@/settings/context";
import {
  BootSplashBar,
  ThemeMediaLayer,
  bootRemainMinMs,
  bootScheduleDelayMs,
  detectThemeMediaKind,
} from "@/theme";
import "./bootAnimationSettings.css";

type PreviewPhase = "idle" | "loading" | "ready" | "done";

const ctx = inject(PET_SETTINGS_PAGE_KEY)!;
const { t } = useI18n();
const boot = computed(() => ctx.theme.value.bootAnimation);
const hasMedia = computed(
  () =>
    Boolean(boot.value.mediaPath.trim()) &&
    detectThemeMediaKind(boot.value.mediaPath) !== "none"
);
const mediaKind = computed(() =>
  detectThemeMediaKind(boot.value.mediaPath)
);

const previewPlaying = ref(false);
const previewPhase = ref<PreviewPhase>("idle");
const previewKey = ref(0);
const previewReadyAt = ref(0);
const previewVideoEnded = ref(false);
let previewTimer: number | null = null;
let doneTimer: number | null = null;

const mediaLayerKey = computed(
  () => `${previewKey.value}:${boot.value.mediaPath}:${boot.value.fit}`
);

/** 闲置只看画面，强制静音；试播跟设置 */
const previewMuted = computed(() =>
  previewPlaying.value ? boot.value.muted : true
);

const previewLoop = computed(() => {
  if (!previewPlaying.value) return true;
  return !(
    boot.value.durationMode === "media" && mediaKind.value === "video"
  );
});

const previewStatusText = computed(() => {
  if (!hasMedia.value) return t("pet.bootAnimPreviewEmpty");
  if (previewPhase.value === "done") return t("pet.bootAnimPreviewDone");
  if (previewPhase.value === "loading") return t("pet.bootAnimLoading");
  if (previewPhase.value === "ready" || previewPhase.value === "idle") {
    return previewPlaying.value
      ? t("pet.bootAnimReady")
      : t("pet.bootAnimPreviewIdle");
  }
  return t("pet.bootAnimPreviewIdle");
});

function clearPreviewTimers() {
  if (previewTimer != null) {
    window.clearTimeout(previewTimer);
    previewTimer = null;
  }
  if (doneTimer != null) {
    window.clearTimeout(doneTimer);
    doneTimer = null;
  }
}

function finishPreview() {
  clearPreviewTimers();
  previewPhase.value = "done";
  previewPlaying.value = false;
  doneTimer = window.setTimeout(() => {
    previewPhase.value = "idle";
    previewKey.value += 1;
  }, 900);
}

function scheduleFromReady() {
  clearPreviewTimers();
  const delay = bootScheduleDelayMs({
    durationMode: boot.value.durationMode,
    durationSec: boot.value.durationSec,
    mediaKind: mediaKind.value,
    videoEnded: previewVideoEnded.value,
    readyAtMs: previewReadyAt.value,
  });
  if (delay == null) return;
  previewTimer = window.setTimeout(finishPreview, delay);
}

function stopPreview() {
  clearPreviewTimers();
  previewPlaying.value = false;
  previewPhase.value = "idle";
  previewVideoEnded.value = false;
  previewKey.value += 1;
}

function startPreview() {
  if (!hasMedia.value) return;
  clearPreviewTimers();
  previewPlaying.value = true;
  previewPhase.value = "loading";
  previewVideoEnded.value = false;
  previewReadyAt.value = 0;
  previewKey.value += 1;
}

function onPreviewToggle() {
  if (previewPlaying.value) stopPreview();
  else startPreview();
}

function onPreviewStageClick() {
  if (previewPlaying.value) finishPreview();
}

function onPreviewReady() {
  if (!previewPlaying.value) {
    previewPhase.value = "idle";
    return;
  }
  previewPhase.value = "ready";
  previewReadyAt.value = Date.now();
  scheduleFromReady();
}

function onPreviewVideoEnded() {
  previewVideoEnded.value = true;
  if (!previewPlaying.value) return;
  if (boot.value.durationMode !== "media") return;
  if (previewPhase.value !== "ready") return;
  clearPreviewTimers();
  previewTimer = window.setTimeout(
    finishPreview,
    bootRemainMinMs(previewReadyAt.value)
  );
}

function onPreviewError() {
  if (previewPlaying.value) finishPreview();
}

watch(
  () => boot.value.enabled,
  (on) => {
    if (!on) stopPreview();
  }
);

watch(
  () => boot.value.mediaPath,
  () => {
    stopPreview();
  }
);

onUnmounted(() => {
  clearPreviewTimers();
});
</script>
