<template>
  <SettingsItemRow
    class="span-2"
    :title="$t('pet.uiThemeTitle')"
    :description="$t('pet.uiThemeDesc')"
    tone="pet"
  >
    <template #icon><BulbOutlined /></template>
    <a-segmented
      v-model:value="ctx.uiTheme.value"
      size="small"
      :options="ctx.uiThemeOptions.value"
      @change="ctx.onUiTheme"
    />
  </SettingsItemRow>
  <SettingsItemRow
    class="span-2"
    :title="$t('pet.settingsPinTitle')"
    :description="$t('pet.settingsPinDesc')"
    tone="pet"
  >
    <template #icon><PushpinOutlined /></template>
    <a-switch
      v-model:checked="ctx.settingsAlwaysOnTop.value"
      size="small"
      @change="ctx.onSettingsPin"
    />
  </SettingsItemRow>
  <SettingsItemRow
    class="span-2"
    :title="$t('pet.sysStatsExpandTitle')"
    :description="$t('pet.sysStatsExpandDesc')"
    tone="pet"
  >
    <template #icon><DashboardOutlined /></template>
    <a-switch
      v-model:checked="ctx.sysStatsDefaultExpanded.value"
      size="small"
      @change="ctx.onSysStatsDefaultExpanded"
    />
  </SettingsItemRow>
  <SettingsItemRow
    class="span-2"
    :title="$t('pet.previewAutoOrbitTitle')"
    :description="
      ctx.canPreviewOrbit.value
        ? $t('pet.previewAutoOrbitDesc')
        : $t('pet.previewAutoOrbit2dHint')
    "
    tone="pet"
  >
    <template #icon><SyncOutlined /></template>
    <a-switch
      v-model:checked="ctx.previewAutoOrbit.value"
      size="small"
      :disabled="!ctx.canPreviewOrbit.value"
    />
  </SettingsItemRow>
</template>

<script setup lang="ts">
import { inject } from "vue";
import {
  BulbOutlined,
  DashboardOutlined,
  PushpinOutlined,
  SyncOutlined,
} from "@ant-design/icons-vue";
import SettingsItemRow from "@/components/SettingsItemRow.vue";
import { PET_SETTINGS_PAGE_KEY } from "@/settings/context";

const ctx = inject(PET_SETTINGS_PAGE_KEY)!;
</script>
