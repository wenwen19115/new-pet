<template>
  <div v-if="ctx.isVrmPending.value" class="tab-empty">
    {{ $t("pet.vrmNeedUploadFirst") }}
  </div>
  <div v-else class="motion-panel">
    <ThemeSection :label="$t('pet.secMotion')">
      <SettingsItemRow
        v-if="!ctx.capabilities.value.has('vrm-upload')"
        :title="$t('pet.motionTitle')"
        :description="$t('pet.motionDesc')"
        tone="pet"
      >
        <div class="motion-row">
          <a-select
            v-model:value="ctx.demoMotion.value"
            size="small"
            class="ctrl-select"
            :options="ctx.motionOptions.value"
            :list-height="360"
            :dropdown-match-select-width="false"
            @change="ctx.onDemoMotion"
          />
          <button type="button" class="theme-btn pri" @click="() => ctx.onPlayMotion()">
            {{ $t("pet.motionPlay") }}
          </button>
        </div>
      </SettingsItemRow>

      <BuiltInIdToggles
        v-if="ctx.capabilities.value.has('motion-toggle')"
        :ids="ctx.motionPoolIds.value"
        v-model:disabled-ids="ctx.disabledMotions.value"
        :title-key="
          ctx.capabilities.value.has('vrm-upload')
            ? 'pet.motionPoolTitleVrm'
            : 'pet.motionPoolTitle'
        "
        :desc-key="
          ctx.capabilities.value.has('vrm-upload')
            ? 'pet.motionPoolDescVrm'
            : 'pet.motionPoolDesc'
        "
        label-key-prefix="pet.motion."
        :motion-meta="ctx.capabilities.value.has('vrm-upload')"
        :selectable="ctx.capabilities.value.has('vrm-upload')"
        :selected-id="ctx.demoMotion.value"
        @update:selected-id="(id) => ctx.onDemoMotion(id)"
        @play="(id) => ctx.onPlayMotion(id)"
        @change="ctx.persistOnly"
      />
    </ThemeSection>

    <div v-if="ctx.capabilities.value.has('vrm-bone-editor')" class="custom-motion-panel">
      <header class="custom-motion-head">
        <div class="custom-motion-head-text">
          <div class="custom-motion-title">{{ $t("pet.customMotionTitle") }}</div>
          <div class="custom-motion-desc">{{ $t("pet.customMotionDesc") }}</div>
        </div>
        <div class="custom-motion-head-actions">
          <button type="button" class="theme-btn" @click="ctx.onImportCustomMotions">
            {{ $t("pet.customMotionImport") }}
          </button>
          <button type="button" class="theme-btn" @click="ctx.onExportCustomMotions">
            {{ $t("pet.customMotionExport") }}
          </button>
          <button type="button" class="theme-btn" @click="ctx.onAddCustomMotion">
            {{ $t("pet.customMotionAdd") }}
          </button>
          <button type="button" class="theme-btn pri" @click="ctx.persistCustomMotions">
            {{ $t("pet.customMotionSave") }}
          </button>
          <button type="button" class="theme-btn" @click="ctx.onCustomMotionReset">
            {{ $t("pet.customMotionReset") }}
          </button>
        </div>
      </header>
      <div v-if="!ctx.customVrmMotions.value.length" class="custom-motion-empty">
        {{ $t("pet.customMotionEmpty") }}
      </div>
      <div
        v-for="item in ctx.customVrmMotions.value"
        :key="item.id"
        class="custom-motion-card"
        :data-editing="ctx.editingCustomId.value === item.id ? '1' : '0'"
      >
        <div class="custom-motion-card-row">
          <a-input
            v-model:value="item.name"
            size="small"
            :maxlength="24"
            :placeholder="$t('pet.customMotionName')"
          />
          <a-button
            size="small"
            :type="ctx.editingCustomId.value === item.id ? 'primary' : 'default'"
            @click="ctx.toggleEditCustom(item.id)"
          >
            {{
              ctx.editingCustomId.value === item.id
                ? $t("pet.customMotionCloseEditor")
                : $t("pet.customMotionEditBones")
            }}
          </a-button>
        </div>
        <label
          class="custom-motion-duration"
          @dblclick.prevent="resetDuration(item)"
        >
          <span>{{ $t("pet.customMotionDuration") }}</span>
          <a-slider
            v-model:value="item.durationMs"
            :min="800"
            :max="8000"
            :step="100"
          />
        </label>
        <CustomVrmBoneEditor
          v-if="ctx.editingCustomId.value === item.id"
          :motion="item"
          @change="ctx.onCustomMotionBoneChange"
          @frame-change="ctx.onCustomMotionFrameChange"
        />
        <div class="custom-motion-actions">
          <label class="custom-motion-random">
            <ThemeSwitch
              :checked="item.includeInRandom"
              @update:checked="(v) => (item.includeInRandom = v)"
            />
            <span>{{ $t("pet.customMotionEnabled") }}</span>
          </label>
          <div class="custom-motion-btns">
            <button type="button" class="theme-btn" @click="ctx.onPlayCustomMotion(item.id)">
              {{ $t("pet.motionPlay") }}
            </button>
            <button type="button" class="theme-btn" @click="ctx.onExportCustomMotion(item.id)">
              {{ $t("pet.customMotionExportOne") }}
            </button>
            <button type="button" class="theme-btn" @click="ctx.onRemoveCustomMotion(item.id)">
              {{ $t("pet.customMotionRemove") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from "vue";
import SettingsItemRow from "@/components/SettingsItemRow.vue";
import ThemeSection from "@/settings/components/ThemeSection.vue";
import ThemeSwitch from "@/settings/components/ThemeSwitch.vue";
import { CustomVrmBoneEditor } from "@/pet/models/vrm";
import type { CustomVrmMotion } from "@/pet/content/motion/customVrmMotions";
import BuiltInIdToggles from "./BuiltInIdToggles.vue";
import { PET_SETTINGS_PAGE_KEY } from "@/settings/context";

const ctx = inject(PET_SETTINGS_PAGE_KEY)!;

const DEFAULT_CUSTOM_DURATION_MS = 2800;

function resetDuration(item: CustomVrmMotion) {
  item.durationMs = DEFAULT_CUSTOM_DURATION_MS;
}
</script>

<style scoped>
.motion-panel {
  display: contents;
}

.tab-empty {
  padding: 18px 8px;
  text-align: center;
  font-size: 13px;
  color: var(--ui-text-faint);
}

.motion-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.motion-row .ctrl-select {
  flex: 1 1 auto;
  width: auto;
  min-width: 140px;
  max-width: none;
}

.motion-row :deep(.ant-btn) {
  flex-shrink: 0;
}

.ctrl-select {
  width: 100%;
  max-width: 100%;
}

.custom-motion-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--ui-panel-radius, 12px);
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
}

.custom-motion-head {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}

.custom-motion-head-text {
  min-width: 0;
}

.custom-motion-head-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.custom-motion-head-actions .theme-btn {
  flex: 0 0 auto;
  white-space: nowrap;
}

.custom-motion-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ui-text);
}

.custom-motion-desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ui-text-faint);
}

.custom-motion-empty {
  font-size: 12px;
  color: var(--ui-text-faint);
  padding: 6px 0 2px;
}

.custom-motion-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: var(--ui-radius, 10px);
  border: 1px solid var(--ui-border);
  background: var(--ui-surface-strong);
}

.custom-motion-card-row {
  display: flex;
  gap: 8px;
}

.custom-motion-card[data-editing="1"] {
  border-color: color-mix(in srgb, var(--ui-primary) 40%, transparent);
}

.custom-motion-duration {
  display: grid;
  grid-template-columns: 52px 1fr;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--ui-text-muted);
}

.custom-motion-sliders label {
  display: grid;
  grid-template-columns: 52px 1fr;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--ui-text-muted);
}

.custom-motion-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.custom-motion-random {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--ui-text-muted);
}

.custom-motion-btns {
  display: flex;
  gap: 6px;
}

@media (max-width: 980px) {
  .motion-row {
    max-width: 100%;
  }
}
</style>
