<template>
  <div class="companion-panel">
    <SettingsItemRow
      class="span-2"
      :title="$t('pet.enableTitle')"
      :description="$t('pet.enableDesc')"
      tone="pet"
    >
      <template #icon><RobotOutlined /></template>
      <a-switch
        :checked="ctx.enabled.value"
        size="small"
        @change="(v: boolean) => ctx.onEnabled(v)"
      />
    </SettingsItemRow>

    <template v-if="ctx.enabled.value">
      <SettingsItemRow
        class="span-2 form-row"
        :title="$t('pet.formTitle')"
        :description="$t('pet.formDesc')"
        tone="pet"
      >
        <template #icon><AppstoreOutlined /></template>
        <div
          :ref="(el) => setFormRef(el)"
          class="form-picker"
          role="tablist"
          :aria-label="$t('pet.formTitle')"
        >
          <div
            class="form-picker-thumb"
            :style="thumbStyle"
            aria-hidden="true"
          />
          <button
            v-for="opt in ctx.formOptions.value"
            :key="opt.value"
            type="button"
            role="tab"
            class="form-picker-item"
            :class="{ 'is-active': ctx.modelKind.value === opt.value }"
            :aria-selected="ctx.modelKind.value === opt.value"
            @click="ctx.onModel(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </SettingsItemRow>

      <SettingsItemRow
        v-if="ctx.capabilities.value.has('vrm-upload')"
        class="span-2"
        :title="$t('pet.vrmUploadTitle')"
        :description="$t('pet.vrmUploadDesc')"
        tone="pet"
      >
        <template #icon><CloudUploadOutlined /></template>
        <div class="vrm-upload-row">
          <span class="vrm-file-name" :title="ctx.vrmModelName.value || undefined">
            {{ ctx.vrmModelName.value || $t("pet.vrmNotUploaded") }}
          </span>
          <a-button size="small" :loading="ctx.vrmBusy.value" @click="ctx.onPickVrm">
            {{ ctx.vrmModelName.value ? $t("pet.vrmReplace") : $t("pet.vrmUpload") }}
          </a-button>
          <a-button
            v-if="ctx.vrmModelName.value"
            size="small"
            danger
            :disabled="ctx.vrmBusy.value"
            @click="ctx.onClearVrm"
          >
            {{ $t("pet.vrmClear") }}
          </a-button>
        </div>
      </SettingsItemRow>

      <template v-if="!ctx.isVrmPending.value">
        <SettingsItemRow
          v-if="ctx.capabilities.value.has('look-swatches') && ctx.looks.value.length > 0"
          class="span-2 form-row"
          :title="$t('pet.lookTitle')"
          :description="$t('pet.lookDesc')"
          tone="pet"
        >
          <template #icon><SkinOutlined /></template>
          <div class="look-swatches" role="listbox" :aria-label="$t('pet.lookTitle')">
            <button
              v-for="theme in ctx.looks.value"
              :key="theme.id"
              type="button"
              class="theme-swatch"
              :class="{
                active: ctx.lookId.value === theme.id,
                'theme-swatch--fig': !!theme.figArtId,
              }"
              :title="ctx.lookLabel(theme)"
              :style="{
                '--swatch': theme.visual.accent,
                '--swatch-soft': theme.visual.accentSoft,
              }"
              @click="ctx.onLook(theme.id)"
            >
              <span class="swatch-core" />
              <span class="swatch-name">{{ ctx.lookLabel(theme) }}</span>
            </button>
          </div>
        </SettingsItemRow>

        <SettingsItemRow
          :title="$t('pet.nicknameTitle')"
          :description="$t('pet.nicknameDesc')"
          tone="pet"
        >
          <template #icon><EditOutlined /></template>
          <div class="nickname-row">
            <a-input
              v-model:value="ctx.nickname.value"
              size="small"
              class="ctrl-input"
              :placeholder="ctx.skinDefaultNickname.value"
              :maxlength="12"
              allow-clear
            />
            <a-button size="small" type="primary" @click="ctx.onSaveNickname">
              {{ $t("pet.nicknameSave") }}
            </a-button>
          </div>
        </SettingsItemRow>

        <SettingsItemRow
          :title="$t('pet.personalityTitle')"
          :description="$t('pet.personalityDesc')"
          tone="pet"
        >
          <template #icon><UserOutlined /></template>
          <a-segmented
            v-model:value="ctx.personality.value"
            size="small"
            :options="ctx.personalityOptions.value"
            @change="ctx.onPersonality"
          />
        </SettingsItemRow>

        <SettingsItemRow
          class="span-2"
          :title="$t('pet.resetProfileTitle')"
          :description="$t('pet.resetProfileDesc')"
          tone="pet"
        >
          <template #icon><RedoOutlined /></template>
          <a-button size="small" @click="ctx.onResetProfile">
            {{ $t("pet.resetProfile") }}
          </a-button>
        </SettingsItemRow>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import {
  AppstoreOutlined,
  CloudUploadOutlined,
  EditOutlined,
  RedoOutlined,
  RobotOutlined,
  SkinOutlined,
  UserOutlined,
} from "@ant-design/icons-vue";
import SettingsItemRow from "@/components/SettingsItemRow.vue";
import { PET_SETTINGS_PAGE_KEY } from "@/settings/context";

const ctx = inject(PET_SETTINGS_PAGE_KEY)!;
const thumbStyle = computed(() => ctx.formThumbStyle.value);

function setFormRef(el: unknown) {
  ctx.formPickerRef.value = (el as HTMLElement | null) ?? null;
}
</script>

<style scoped>
.companion-panel {
  display: contents;
}

.companion-panel :deep(.form-row.settings-item) {
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}

.companion-panel :deep(.form-row .item-actions) {
  max-width: 100%;
  width: 100%;
  flex-shrink: 1;
  justify-content: stretch;
}

.form-picker {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  padding: 3px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--ui-text, #fff) 8%, transparent);
  border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.08));
}

.form-picker-thumb {
  position: absolute;
  top: 3px;
  left: 0;
  bottom: 3px;
  z-index: 0;
  border-radius: 6px;
  pointer-events: none;
  background: color-mix(in srgb, var(--ui-primary, #00e5ff) 28%, rgba(255, 255, 255, 0.14));
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--ui-primary, #00e5ff) 50%, transparent),
    0 1px 6px rgba(0, 0, 0, 0.18);
  will-change: transform, width;
  transition:
    transform 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.form-picker-item {
  position: relative;
  z-index: 1;
  flex: 1 1 0;
  min-width: 0;
  margin: 0;
  padding: 0 4px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ui-text-muted, rgba(255, 255, 255, 0.55));
  font-size: 12px;
  line-height: 24px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s ease;
}

.form-picker-item:hover {
  color: var(--ui-text, rgba(255, 255, 255, 0.85));
}

.form-picker-item.is-active {
  color: var(--ui-text, #fff);
  font-weight: 600;
}

.look-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
  max-width: 100%;
}

.theme-swatch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 7px;
  border-radius: 999px;
  border: 1px solid var(--ui-border, rgba(255, 255, 255, 0.1));
  background: color-mix(in srgb, var(--ui-text, #fff) 4%, transparent);
  color: var(--ui-text-muted, rgba(255, 255, 255, 0.72));
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.theme-swatch:hover {
  border-color: color-mix(in srgb, var(--swatch) 45%, var(--ui-border, rgba(255, 255, 255, 0.2)));
  background: color-mix(in srgb, var(--swatch) 10%, transparent);
}

.theme-swatch.active {
  border-color: color-mix(in srgb, var(--swatch) 65%, transparent);
  background: color-mix(in srgb, var(--swatch) 16%, transparent);
  color: var(--ui-text, #fff);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--swatch) 25%, transparent);
}

.theme-swatch--fig {
  border-style: dashed;
}

.swatch-core {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, #fff 0 18%, transparent 19%),
    linear-gradient(135deg, var(--swatch-soft), var(--swatch));
  box-shadow: 0 0 10px color-mix(in srgb, var(--swatch) 55%, transparent);
}

.swatch-name {
  font-size: 12px;
  line-height: 1;
}

.nickname-row,
.vrm-upload-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
  max-width: 240px;
  min-width: 0;
}

.vrm-upload-row {
  max-width: 320px;
  flex-wrap: nowrap;
}

.vrm-file-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--ui-text-muted, rgba(200, 220, 235, 0.78));
}

.nickname-row {
  flex-wrap: nowrap;
  max-width: 220px;
}

.nickname-row .ctrl-input {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
  max-width: none;
}

.nickname-row :deep(.ant-btn) {
  flex-shrink: 0;
}

.ctrl-input {
  width: 140px;
  max-width: 100%;
  flex: 0 1 140px;
}

@media (max-width: 1100px) {
  .look-swatches {
    justify-content: flex-start;
  }
}

@media (max-width: 980px) {
  .nickname-row,
  .vrm-upload-row {
    max-width: 100%;
  }
}
</style>
