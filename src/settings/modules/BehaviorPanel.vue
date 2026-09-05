<template>
  <div v-if="ctx.isVrmPending.value" class="tab-empty">
    {{ $t("pet.vrmNeedUploadFirst") }}
  </div>
  <div v-else class="behavior-panel">
    <ThemeSection :label="$t('pet.secVoice')">
      <SettingsItemRow
        :title="$t('pet.muteTitle')"
        :description="$t('pet.muteDesc')"
        tone="pet"
      >
        <ThemeSwitch
          :checked="ctx.muted.value"
          @update:checked="(v) => { ctx.muted.value = v; ctx.onMuted(v); }"
        />
      </SettingsItemRow>
      <SettingsItemRow
        :title="$t('pet.ttsTitle')"
        :description="$t('pet.ttsDesc')"
        tone="pet"
      >
        <ThemeSwitch
          :checked="ctx.ttsEnabled.value"
          :disabled="ctx.muted.value"
          @update:checked="(v) => ctx.onTtsEnabled(v)"
        />
      </SettingsItemRow>
      <SettingsItemRow
        v-if="ctx.ttsEnabled.value && !ctx.muted.value"
        :title="$t('pet.ttsVoiceTitle')"
        :description="$t('pet.ttsVoiceDesc')"
        tone="pet"
      >
        <a-select
          v-model:value="ctx.ttsVoiceUri.value"
          size="small"
          class="tts-voice-select"
          :options="ctx.ttsVoiceOptions.value"
          :list-height="320"
          show-search
          option-filter-prop="label"
          @change="ctx.onTtsVoice"
        />
      </SettingsItemRow>
      <SettingsItemRow
        :title="$t('pet.toneTitle')"
        :description="$t('pet.toneDesc')"
        tone="pet"
      >
        <ThemeSeg
          :model-value="ctx.tone.value"
          :options="ctx.toneOptions.value"
          :aria-label="$t('pet.toneTitle')"
          @update:model-value="(v) => ctx.onTone(v)"
        />
      </SettingsItemRow>
    </ThemeSection>

    <ThemeSection :label="$t('pet.secBody')">
      <SettingsItemRow
        :title="$t('pet.opacityTitle')"
        :description="$t('pet.opacityDesc')"
        tone="pet"
      >
        <ThemeMeter
          :value="ctx.opacityPercent.value"
          :min="30"
          :max="100"
          :step="5"
          :title="$t('pet.dblClickReset')"
          :aria-label="$t('pet.opacityTitle')"
          @change="ctx.onOpacity"
          @dblclick="ctx.resetOpacity"
        >
          {{ ctx.opacityPercent.value }}%
        </ThemeMeter>
      </SettingsItemRow>
      <SettingsItemRow
        :title="$t('pet.zoomTitle')"
        :description="$t('pet.zoomDesc')"
        tone="pet"
      >
        <ThemeMeter
          :value="ctx.zoomPercent.value"
          :min="-100"
          :max="100"
          :step="5"
          :fill-percent="
            Math.min(100, Math.max(0, (ctx.zoomPercent.value + 100) / 2))
          "
          :title="$t('pet.dblClickReset')"
          :aria-label="$t('pet.zoomTitle')"
          @change="ctx.onZoom"
          @dblclick="ctx.resetZoom"
        >
          {{ ctx.zoomPercent.value > 0 ? "+" : "" }}{{ ctx.zoomPercent.value }}%
        </ThemeMeter>
      </SettingsItemRow>
    </ThemeSection>

    <ThemeSection :label="$t('pet.secReact')">
      <SettingsItemRow
        :title="$t('pet.usbWatchTitle')"
        :description="$t('pet.usbWatchDesc')"
        tone="pet"
      >
        <ThemeSwitch
          :checked="ctx.usbWatchEnabled.value"
          @update:checked="(v) => ctx.onUsbWatch(v)"
        />
      </SettingsItemRow>
      <SettingsItemRow
        :title="$t('pet.randomIdleTitle')"
        :description="$t('pet.randomIdleDesc')"
        tone="pet"
      >
        <ThemeSwitch
          :checked="ctx.randomIdleEnabled.value"
          @update:checked="(v) => ctx.onRandomIdle(v)"
        />
      </SettingsItemRow>
      <SettingsItemRow
        :title="$t('pet.playfulModeTitle')"
        :description="$t('pet.playfulModeDesc')"
        tone="pet"
      >
        <ThemeSwitch
          :checked="ctx.playfulModeEnabled.value"
          @update:checked="(v) => ctx.onPlayfulMode(v)"
        />
      </SettingsItemRow>
      <DeskWeatherSettings
        :model-value="deskWeatherModel"
        @update:model-value="onDeskWeatherModel"
        @change="ctx.onDeskWeatherChange"
      />
    </ThemeSection>

    <ThemeSection :label="$t('pet.secLines')">
      <CatchphraseEditor
        v-model="ctx.catchphrases.value"
        v-model:chance="ctx.catchphraseChance.value"
        @change="ctx.persistOnly"
      />
      <CustomLinesEditor
        v-if="ctx.capabilities.value.has('custom-lines')"
        v-model="ctx.customLines.value"
        v-model:custom-lines-only="ctx.customLinesOnly.value"
        @change="ctx.persistOnly"
      />
      <BuiltInIdToggles
        v-if="ctx.capabilities.value.has('custom-lines')"
        :ids="lineCategoryIds"
        v-model:disabled-ids="ctx.disabledBuiltInLines.value"
        title-key="pet.linePoolTitle"
        desc-key="pet.linePoolDesc"
        label-key-prefix="pet.lineCategory."
        @change="ctx.persistOnly"
      />
    </ThemeSection>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import SettingsItemRow from "@/components/SettingsItemRow.vue";
import ThemeSection from "@/settings/components/ThemeSection.vue";
import ThemeSeg from "@/settings/components/ThemeSeg.vue";
import ThemeSwitch from "@/settings/components/ThemeSwitch.vue";
import ThemeMeter from "@/settings/components/ThemeMeter.vue";
import CustomLinesEditor from "./CustomLinesEditor.vue";
import CatchphraseEditor from "./CatchphraseEditor.vue";
import BuiltInIdToggles from "./BuiltInIdToggles.vue";
import DeskWeatherSettings from "./DeskWeatherSettings.vue";
import { BUILTIN_LINE_CATEGORIES } from "@/pet/characters/lineTypes";
import {
  DEFAULT_DESK_WEATHER,
  type DeskWeatherConfig,
} from "@/pet/data/deskWeather";
import { PET_SETTINGS_PAGE_KEY } from "@/settings/context";

const ctx = inject(PET_SETTINGS_PAGE_KEY)!;
const lineCategoryIds = [...BUILTIN_LINE_CATEGORIES];

const deskWeatherModel = computed(
  () => ctx.deskWeather?.value ?? DEFAULT_DESK_WEATHER
);

function onDeskWeatherModel(next: DeskWeatherConfig) {
  if (!ctx.deskWeather) return;
  ctx.deskWeather.value = next;
}
</script>

<style scoped>
.behavior-panel {
  display: contents;
}

.tab-empty {
  padding: 18px 8px;
  text-align: center;
  font-size: 13px;
  color: var(--ui-text-faint);
}

.tts-voice-select {
  width: 100%;
  max-width: 240px;
  min-width: 0;
}
</style>
