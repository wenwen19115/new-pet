<template>
  <div v-if="!ctx.enabled.value || ctx.isVrmPending.value" class="tab-empty">
    {{ !ctx.enabled.value ? $t("pet.tabNeedEnable") : $t("pet.vrmNeedUploadFirst") }}
  </div>
  <div v-else class="motion-panel">
    <ThemeSection :label="$t('pet.secMotion')">
      <SettingsItemRow
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
            @change="ctx.onDemoMotion"
          />
          <button type="button" class="theme-btn pri" @click="ctx.onPlayMotion">
            {{ $t("pet.motionPlay") }}
          </button>
        </div>
      </SettingsItemRow>

      <BuiltInIdToggles
        v-if="ctx.capabilities.value.has('motion-toggle')"
        :ids="ctx.motionPoolIds.value"
        v-model:disabled-ids="ctx.disabledMotions.value"
        title-key="pet.motionPoolTitle"
        desc-key="pet.motionPoolDesc"
        label-key-prefix="pet.motion."
        @change="ctx.persistOnly"
      />
    </ThemeSection>

    <div v-if="ctx.capabilities.value.has('vrm-bone-editor')" class="custom-motion-panel">
      <header class="custom-motion-head">
        <div>
          <div class="custom-motion-title">{{ $t("pet.customMotionTitle") }}</div>
          <div class="custom-motion-desc">{{ $t("pet.customMotionDesc") }}</div>
        </div>
        <button type="button" class="theme-btn pri" @click="ctx.onAddCustomMotion">
          {{ $t("pet.customMotionAdd") }}
        </button>
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
            @change="ctx.persistCustomMotions"
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
            @change="ctx.persistCustomMotions"
          />
        </label>
        <CustomVrmBoneEditor
          v-if="ctx.editingCustomId.value === item.id"
          :motion="item"
          @change="ctx.onCustomMotionBoneChange"
        />
        <div class="custom-motion-actions">
          <label class="custom-motion-random">
            <ThemeSwitch
              :checked="item.includeInRandom"
              @update:checked="
                (v) => {
                  item.includeInRandom = v;
                  void ctx.persistCustomMotions();
                }
              "
            />
            <span>{{ $t("pet.customMotionEnabled") }}</span>
          </label>
          <div class="custom-motion-btns">
            <button type="button" class="theme-btn" @click="ctx.onPlayCustomMotion(item.id)">
              {{ $t("pet.motionPlay") }}
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
  ctx.persistCustomMotions();
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
  max-width: 220px;
  min-width: 0;
}

.motion-row .ctrl-select {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
  max-width: none;
}

.motion-row :deep(.ant-btn) {
  flex-shrink: 0;
}

.ctrl-select {
  width: 148px;
  max-width: 100%;
  flex: 0 1 148px;
}

.custom-motion-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
}

.custom-motion-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
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
  border-radius: 10px;
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
