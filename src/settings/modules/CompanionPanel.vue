<template>
  <div class="companion-panel">
    <ThemeSection :label="$t('pet.secAppear')">
      <SettingsItemRow
        :title="$t('pet.enableTitle')"
        :description="$t('pet.enableDesc')"
        tone="pet"
      >
        <ThemeSwitch
          :checked="ctx.enabled.value"
          @update:checked="(v) => ctx.onEnabled(v)"
        />
      </SettingsItemRow>
    </ThemeSection>

    <ThemeSection v-if="ctx.enabled.value" :label="$t('pet.secIdentity')">
      <SettingsItemRow
        :title="$t('pet.formTitle')"
        :description="$t('pet.formDesc')"
        tone="pet"
      >
        <template #body>
          <ThemeChoices
            :model-value="ctx.modelKind.value"
            :options="ctx.formOptions.value"
            :aria-label="$t('pet.formTitle')"
            @update:model-value="(v) => ctx.onModel(v)"
          />
        </template>
      </SettingsItemRow>

      <SettingsItemRow
        v-if="ctx.capabilities.value.has('vrm-upload')"
        :title="$t('pet.vrmUploadTitle')"
        :description="$t('pet.vrmUploadDesc')"
        tone="pet"
      >
        <div class="vrm-upload-row">
          <span class="vrm-file-name" :title="ctx.vrmModelName.value || undefined">
            {{ ctx.vrmModelName.value || $t("pet.vrmNotUploaded") }}
          </span>
          <button
            type="button"
            class="theme-btn"
            :disabled="ctx.vrmBusy.value"
            @click="ctx.onPickVrm"
          >
            {{ ctx.vrmModelName.value ? $t("pet.vrmReplace") : $t("pet.vrmUpload") }}
          </button>
          <button
            v-if="ctx.vrmModelName.value"
            type="button"
            class="theme-btn"
            :disabled="ctx.vrmBusy.value"
            @click="ctx.onClearVrm"
          >
            {{ $t("pet.vrmClear") }}
          </button>
        </div>
      </SettingsItemRow>

      <template v-if="!ctx.isVrmPending.value">
        <SettingsItemRow
          v-if="ctx.capabilities.value.has('look-swatches') && lookOptions.length > 0"
          :title="$t('pet.lookTitle')"
          :description="$t('pet.lookDesc')"
          tone="pet"
        >
          <template #body>
            <ThemeChoices
              :model-value="ctx.lookId.value"
              :options="lookOptions"
              :aria-label="$t('pet.lookTitle')"
              @update:model-value="(v) => ctx.onLook(v)"
            />
          </template>
        </SettingsItemRow>

        <SettingsItemRow
          :title="$t('pet.nicknameTitle')"
          :description="$t('pet.nicknameDesc')"
          tone="pet"
        >
          <div class="nickname-row">
            <a-input
              v-model:value="ctx.nickname.value"
              size="small"
              class="ctrl-input"
              :placeholder="ctx.skinDefaultNickname.value"
              :maxlength="12"
              allow-clear
            />
            <button type="button" class="theme-btn pri" @click="ctx.onSaveNickname">
              {{ $t("pet.nicknameSave") }}
            </button>
          </div>
        </SettingsItemRow>

        <SettingsItemRow
          :title="$t('pet.personalityTitle')"
          :description="$t('pet.personalityDesc')"
          tone="pet"
        >
          <ThemeSeg
            :model-value="ctx.personality.value"
            :options="ctx.personalityOptions.value"
            :aria-label="$t('pet.personalityTitle')"
            @update:model-value="(v) => ctx.onPersonality(v)"
          />
        </SettingsItemRow>

        <SettingsItemRow
          :title="$t('pet.resetProfileTitle')"
          :description="$t('pet.resetProfileDesc')"
          tone="pet"
        >
          <button type="button" class="theme-btn" @click="ctx.onResetProfile">
            {{ $t("pet.resetProfile") }}
          </button>
        </SettingsItemRow>
      </template>
    </ThemeSection>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import SettingsItemRow from "@/components/SettingsItemRow.vue";
import ThemeChoices from "@/settings/components/ThemeChoices.vue";
import ThemeSection from "@/settings/components/ThemeSection.vue";
import ThemeSeg from "@/settings/components/ThemeSeg.vue";
import ThemeSwitch from "@/settings/components/ThemeSwitch.vue";
import { PET_SETTINGS_PAGE_KEY } from "@/settings/context";

const ctx = inject(PET_SETTINGS_PAGE_KEY)!;

const lookOptions = computed(() =>
  ctx.looks.value.map((look) => ({
    value: look.id,
    label: ctx.lookLabel(look),
  }))
);
</script>

<style scoped>
.companion-panel {
  display: contents;
}

.nickname-row,
.vrm-upload-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.vrm-file-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--ui-text-muted);
}

.ctrl-input {
  width: 140px;
  max-width: 100%;
}
</style>
