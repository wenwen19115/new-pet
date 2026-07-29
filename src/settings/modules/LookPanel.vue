<template>
  <div v-if="!ctx.enabled.value || ctx.isVrmPending.value" class="tab-empty">
    {{ !ctx.enabled.value ? $t("pet.tabNeedEnable") : $t("pet.vrmNeedUploadFirst") }}
  </div>
  <template v-else>
    <SettingsItemRow :title="$t('pet.muteTitle')" :description="$t('pet.muteDesc')" tone="pet">
      <template #icon>
        <SoundOutlined v-if="!ctx.muted.value" />
        <AudioMutedOutlined v-else />
      </template>
      <a-switch v-model:checked="ctx.muted.value" size="small" @change="ctx.onMuted" />
    </SettingsItemRow>
    <SettingsItemRow :title="$t('pet.ttsTitle')" :description="$t('pet.ttsDesc')" tone="pet">
      <template #icon><CustomerServiceOutlined /></template>
      <a-switch
        v-model:checked="ctx.ttsEnabled.value"
        size="small"
        :disabled="ctx.muted.value"
        @change="ctx.onTtsEnabled"
      />
    </SettingsItemRow>
    <SettingsItemRow
      v-if="ctx.ttsEnabled.value && !ctx.muted.value"
      :title="$t('pet.ttsVoiceTitle')"
      :description="$t('pet.ttsVoiceDesc')"
      tone="pet"
    >
      <template #icon><CustomerServiceOutlined /></template>
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
    <SettingsItemRow :title="$t('pet.opacityTitle')" :description="$t('pet.opacityDesc')" tone="pet">
      <template #icon><EyeOutlined /></template>
      <div class="opacity-row" :title="$t('pet.dblClickReset')" @dblclick="ctx.resetOpacity">
        <a-slider
          v-model:value="ctx.opacityPercent.value"
          :min="30"
          :max="100"
          :step="5"
          style="width: 120px; margin: 0"
          @change="ctx.onOpacity"
        />
        <span class="opacity-label">{{ ctx.opacityPercent.value }}%</span>
      </div>
    </SettingsItemRow>
    <SettingsItemRow :title="$t('pet.zoomTitle')" :description="$t('pet.zoomDesc')" tone="pet">
      <template #icon><ZoomInOutlined /></template>
      <div class="opacity-row" :title="$t('pet.dblClickReset')" @dblclick="ctx.resetZoom">
        <a-slider
          v-model:value="ctx.zoomPercent.value"
          :min="-100"
          :max="100"
          :step="5"
          style="width: 120px; margin: 0"
          @change="ctx.onZoom"
        />
        <span class="opacity-label"
          >{{ ctx.zoomPercent.value > 0 ? "+" : "" }}{{ ctx.zoomPercent.value }}%</span
        >
      </div>
    </SettingsItemRow>
    <SettingsItemRow :title="$t('pet.toneTitle')" :description="$t('pet.toneDesc')" tone="pet">
      <template #icon><SmileOutlined /></template>
      <a-segmented
        v-model:value="ctx.tone.value"
        size="small"
        :options="ctx.toneOptions.value"
        @change="ctx.onTone"
      />
    </SettingsItemRow>
    <SettingsItemRow :title="$t('pet.usbWatchTitle')" :description="$t('pet.usbWatchDesc')" tone="pet">
      <template #icon><UsbOutlined /></template>
      <a-switch
        v-model:checked="ctx.usbWatchEnabled.value"
        size="small"
        @change="ctx.onUsbWatch"
      />
    </SettingsItemRow>
    <SettingsItemRow
      :title="$t('pet.randomIdleTitle')"
      :description="$t('pet.randomIdleDesc')"
      tone="pet"
    >
      <template #icon><SyncOutlined /></template>
      <a-switch
        v-model:checked="ctx.randomIdleEnabled.value"
        size="small"
        @change="ctx.onRandomIdle"
      />
    </SettingsItemRow>
    <SettingsItemRow
      :title="$t('pet.playfulModeTitle')"
      :description="$t('pet.playfulModeDesc')"
      tone="pet"
    >
      <template #icon><ThunderboltOutlined /></template>
      <a-switch
        v-model:checked="ctx.playfulModeEnabled.value"
        size="small"
        @change="ctx.onPlayfulMode"
      />
    </SettingsItemRow>
    <SettingsItemRow
      :title="$t('pet.hitBoundsTitle')"
      :description="$t('pet.hitBoundsDesc')"
      tone="pet"
    >
      <template #icon><BorderOutlined /></template>
      <a-switch
        v-model:checked="ctx.hitBoundsEnabled.value"
        size="small"
        @change="ctx.onHitBounds"
      />
    </SettingsItemRow>

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
  </template>
</template>

<script setup lang="ts">
import { inject } from "vue";
import {
  AudioMutedOutlined,
  BorderOutlined,
  CustomerServiceOutlined,
  EyeOutlined,
  SmileOutlined,
  SoundOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  UsbOutlined,
  ZoomInOutlined,
} from "@ant-design/icons-vue";
import SettingsItemRow from "@/components/SettingsItemRow.vue";
import CustomLinesEditor from "./CustomLinesEditor.vue";
import CatchphraseEditor from "./CatchphraseEditor.vue";
import BuiltInIdToggles from "./BuiltInIdToggles.vue";
import { BUILTIN_LINE_CATEGORIES } from "@/pet/characters/lineTypes";
import { PET_SETTINGS_PAGE_KEY } from "@/settings/context";

const ctx = inject(PET_SETTINGS_PAGE_KEY)!;
const lineCategoryIds = [...BUILTIN_LINE_CATEGORIES];
</script>

<style scoped>
.tab-empty {
  grid-column: 1 / -1;
  padding: 18px 8px;
  text-align: center;
  font-size: 13px;
  color: var(--ui-text-faint);
}

.opacity-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
  max-width: 240px;
  min-width: 0;
}

.opacity-label {
  min-width: 40px;
  font-size: 12px;
  color: var(--ui-text-muted, rgba(255, 255, 255, 0.55));
  text-align: right;
}

.opacity-row :deep(.ant-slider) {
  flex: 1 1 100px;
  min-width: 80px;
  max-width: 160px;
}

.tts-voice-select {
  width: 100%;
  max-width: 240px;
  min-width: 0;
}

@media (max-width: 980px) {
  .opacity-row {
    max-width: 100%;
  }

  .tts-voice-select {
    max-width: 100%;
  }
}
</style>
