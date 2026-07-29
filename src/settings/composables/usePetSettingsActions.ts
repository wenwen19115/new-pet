import { message } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import type { ComputedRef, Ref } from "vue";
import { isPetIdleMotion } from "@/pet/content/motion/motions";
import {
  requestPetIntro,
  requestPetMotion,
} from "@/pet";
import {
  publishPetSettings,
  resetActiveModelProfile,
  switchPetModel,
} from "@/pet/data/settings";
import { isPetModelKind, type PetModelKind } from "@/pet/skins";
import { isPetPersonality, type PetPersonality } from "@/pet/content/dialogue/personality";
import {
  createEmptyCustomVrmMotion,
  isCustomVrmMotionId,
  type CustomVrmMotion,
} from "@/pet/content/motion/customVrmMotions";
import type { PetSettings, PetTone } from "@/pet/data/types";
import { isAppUiTheme, type AppUiTheme } from "@/theme/uiTheme";
import { characterHas, getCharacter } from "@/pet/characters";
import { syncPetWindow } from "@/pet/windows/pet";

export function usePetSettingsActions(deps: {
  enabled: Ref<boolean>;
  muted: Ref<boolean>;
  chatEnabled: Ref<boolean>;
  opacityPercent: Ref<number>;
  zoomPercent: Ref<number>;
  tone: Ref<PetTone>;
  demoMotion: Ref<string>;
  modelKind: Ref<PetModelKind>;
  lookId: Ref<string>;
  personality: Ref<PetPersonality>;
  usbWatchEnabled: Ref<boolean>;
  randomIdleEnabled: Ref<boolean>;
  playfulModeEnabled: Ref<boolean>;
  hitBoundsEnabled: Ref<boolean>;
  uiTheme: Ref<AppUiTheme>;
  sysStatsDefaultExpanded: Ref<boolean>;
  customVrmMotions: Ref<CustomVrmMotion[]>;
  editingCustomId: Ref<string | null>;
  settingsBag: Ref<PetSettings>;
  getCurrentSettings: () => PetSettings;
  applyLocalFromSettings: (s: PetSettings) => void;
  persistOnly: () => Promise<void>;
  persistAndSync: () => Promise<void>;
  refreshVrmPreview: () => void | Promise<void>;
  isVrmPending: ComputedRef<boolean>;
  onUiThemeChange?: (theme: AppUiTheme) => void;
}) {
  const { t } = useI18n();

  async function onEnabled(value: boolean) {
    deps.enabled.value = value;
    if (value && deps.isVrmPending.value) {
      await deps.persistOnly();
      await syncPetWindow();
      message.info(t("pet.vrmNeedUploadFirst"));
      return;
    }
    await deps.persistAndSync();
  }

  async function onModel(value: string | number) {
    if (!isPetModelKind(value)) return;
    const fromModel = deps.settingsBag.value.modelKind;
    if (fromModel === value) return;

    const snapshot = {
      ...deps.getCurrentSettings(),
      modelKind: fromModel,
    };
    const switched = switchPetModel(snapshot, value, fromModel);
    deps.applyLocalFromSettings(switched);

    const allowed = getCharacter(value).demoMotions;
    const okBuiltIn =
      isPetIdleMotion(deps.demoMotion.value) &&
      (allowed as readonly string[]).includes(deps.demoMotion.value);
    const okCustom =
      characterHas(value, "vrm-bone-editor") &&
      isCustomVrmMotionId(deps.demoMotion.value);
    if (!okBuiltIn && !okCustom) {
      deps.demoMotion.value = allowed[0] ?? "happy-bounce";
    }
    const next = await publishPetSettings(deps.getCurrentSettings());
    deps.settingsBag.value = next;
    await syncPetWindow();
    await deps.refreshVrmPreview();
  }

  async function onLook(id: string) {
    deps.lookId.value = id;
    await deps.persistAndSync();
  }

  async function onResetProfile() {
    const next = resetActiveModelProfile(deps.getCurrentSettings());
    deps.applyLocalFromSettings(next);
    await deps.persistAndSync();
    message.success(t("pet.resetProfileOk"));
  }

  async function onHitBounds(value: boolean) {
    deps.hitBoundsEnabled.value = value;
    await deps.persistOnly();
  }

  async function onSaveNickname() {
    await deps.persistAndSync();
    if (!deps.enabled.value) {
      message.warning(t("pet.motionNeedEnable"));
      return;
    }
    try {
      await requestPetIntro();
      message.success(t("pet.nicknameSaved"));
    } catch {
      message.error(t("pet.nicknameSaveFailed"));
    }
  }

  async function onPersonality(value: string | number) {
    if (!isPetPersonality(value)) return;
    deps.personality.value = value;
    await deps.persistOnly();
  }

  async function onMuted(value: boolean) {
    deps.muted.value = value;
    await deps.persistOnly();
  }

  async function onChatEnabled(value: boolean) {
    deps.chatEnabled.value = value;
    await deps.persistOnly();
  }

  async function onOpacity(value: number) {
    deps.opacityPercent.value = value;
    await deps.persistOnly();
  }

  async function onZoom(value: number) {
    deps.zoomPercent.value = value;
    await deps.persistOnly();
  }

  async function resetOpacity() {
    deps.opacityPercent.value = 100;
    await onOpacity(100);
  }

  async function resetZoom() {
    deps.zoomPercent.value = 0;
    await onZoom(0);
  }

  async function onTone(value: string | number) {
    deps.tone.value = value === "snarky" ? "snarky" : "cute";
    await deps.persistOnly();
  }

  async function onUsbWatch(value: boolean) {
    deps.usbWatchEnabled.value = value;
    await deps.persistOnly();
  }

  async function onRandomIdle(value: boolean) {
    deps.randomIdleEnabled.value = value;
    await deps.persistOnly();
  }

  async function onPlayfulMode(value: boolean) {
    deps.playfulModeEnabled.value = value;
    await deps.persistOnly();
  }

  async function onDemoMotion(value: unknown) {
    if (typeof value !== "string") return;
    if (!isPetIdleMotion(value) && !isCustomVrmMotionId(value)) return;
    deps.demoMotion.value = value;
    await deps.persistOnly();
  }

  async function onPlayMotion() {
    if (!deps.enabled.value) {
      message.warning(t("pet.motionNeedEnable"));
      return;
    }
    try {
      await requestPetMotion(deps.demoMotion.value);
    } catch {
      message.error(t("pet.motionPlayFailed"));
    }
  }

  async function onUiTheme(value: unknown) {
    if (!isAppUiTheme(value)) return;
    deps.uiTheme.value = value;
    deps.onUiThemeChange?.(value);
    await deps.persistOnly();
  }

  async function onSysStatsDefaultExpanded(value: unknown) {
    deps.sysStatsDefaultExpanded.value = Boolean(value);
    await deps.persistOnly();
  }

  async function persistCustomMotions() {
    await deps.persistOnly();
  }

  async function onAddCustomMotion() {
    const next = createEmptyCustomVrmMotion(
      t("pet.customMotionDefaultName", {
        n: deps.customVrmMotions.value.length + 1,
      })
    );
    deps.customVrmMotions.value = [...deps.customVrmMotions.value, next];
    deps.demoMotion.value = next.id;
    deps.editingCustomId.value = next.id;
    await deps.persistOnly();
  }

  function toggleEditCustom(id: string) {
    deps.editingCustomId.value =
      deps.editingCustomId.value === id ? null : id;
  }

  function onCustomMotionBoneChange(next: CustomVrmMotion) {
    deps.customVrmMotions.value = deps.customVrmMotions.value.map((m) =>
      m.id === next.id ? next : m
    );
    void persistCustomMotions();
  }

  async function onRemoveCustomMotion(id: string) {
    deps.customVrmMotions.value = deps.customVrmMotions.value.filter(
      (m) => m.id !== id
    );
    if (deps.editingCustomId.value === id) deps.editingCustomId.value = null;
    if (deps.demoMotion.value === id) {
      deps.demoMotion.value =
        getCharacter("vrm").demoMotions[0] ?? "happy-bounce";
    }
    await deps.persistOnly();
  }

  async function onPlayCustomMotion(id: string) {
    if (!deps.enabled.value) {
      message.warning(t("pet.motionNeedEnable"));
      return;
    }
    try {
      await requestPetMotion(id);
    } catch {
      message.error(t("pet.motionPlayFailed"));
    }
  }

  return {
    onEnabled,
    onModel,
    onLook,
    onResetProfile,
    onHitBounds,
    onSaveNickname,
    onPersonality,
    onMuted,
    onChatEnabled,
    onOpacity,
    onZoom,
    resetOpacity,
    resetZoom,
    onTone,
    onUsbWatch,
    onRandomIdle,
    onPlayfulMode,
    onDemoMotion,
    onPlayMotion,
    onUiTheme,
    onSysStatsDefaultExpanded,
    persistCustomMotions,
    onAddCustomMotion,
    toggleEditCustom,
    onCustomMotionBoneChange,
    onRemoveCustomMotion,
    onPlayCustomMotion,
  };
}
