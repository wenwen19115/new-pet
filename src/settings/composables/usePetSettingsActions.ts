import { message, Modal } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import type { ComputedRef, Ref } from "vue";
import { isPetIdleMotion } from "@/pet/content/motion/motions";
import {
  applySettingsWindowPin,
  cancelPetIntroRequest,
  factoryResetPet,
  requestClearPetCache,
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
import { open } from "@tauri-apps/plugin-dialog";
import { THEME_MEDIA_EXTENSIONS } from "@/theme/media";
import { resolveThemePackId } from "@/theme/registry";
import {
  clampBootDurationSec,
  clampBubbleOpacity,
  isThemeBootDurationMode,
  isThemeStageBackdropMode,
  isThemeWallpaperFit,
  type PetThemeSettings,
} from "@/theme/types";
import {
  validateThemeMediaPath,
  type ThemeMediaFailReason,
} from "@/theme/validateMedia";
import { characterHas, getCharacter } from "@/pet/characters";
import { syncPetWindow, resetPetWindowToDefaultPosition } from "@/pet/windows/pet";
import { createMaintenanceLog } from "./createMaintenanceLog";

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
  theme: Ref<PetThemeSettings>;
  sysStatsDefaultExpanded: Ref<boolean>;
  customVrmMotions: Ref<CustomVrmMotion[]>;
  editingCustomId: Ref<string | null>;
  settingsBag: Ref<PetSettings>;
  getCurrentSettings: () => PetSettings;
  applyLocalFromSettings: (s: PetSettings) => void;
  persistOnly: () => Promise<void>;
  persistAndSync: () => Promise<void>;
  refreshVrmPreview: () => void | Promise<void>;
  refreshTtsVoiceOptions: () => void | Promise<void>;
  /** 出厂时清未持久化的设置页 UI 态 */
  resetEphemeralUi: () => void;
  isVrmPending: ComputedRef<boolean>;
  onThemeChange?: (theme: PetThemeSettings) => void;
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
    if (!value) cancelPetIntroRequest();
    await deps.persistAndSync();
    if (value) await requestPetIntro();
  }

  async function onResetPetPosition() {
    if (!deps.enabled.value) return;
    const ok = await resetPetWindowToDefaultPosition();
    if (!ok) {
      message.warning(t("pet.resetPositionFailed"));
      return;
    }
    message.success(t("pet.resetPositionDone"));
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

  function onFactoryReset() {
    Modal.confirm({
      title: t("pet.factoryResetTitle"),
      content: t("pet.factoryResetConfirm"),
      okText: t("pet.factoryReset"),
      okType: "danger",
      cancelText: t("pet.factoryResetCancel"),
      centered: true,
      width: 416,
      // 不 return Promise，确认框立刻关掉，只留进度日志窗
      onOk() {
        void (async () => {
          const log = createMaintenanceLog({
            title: t("pet.factoryResetWorking"),
            paceMs: 200,
          });
          log.open();
          try {
            cancelPetIntroRequest();
            const next = await factoryResetPet(async (step, run) => {
              await log.step(
                t(`pet.factoryResetStep.${step}`),
                t(`pet.factoryResetStepDone.${step}`),
                run
              );
            });
            await log.step(
              t("pet.factoryResetStep.ui"),
              t("pet.factoryResetStepDone.ui"),
              () => {
                deps.applyLocalFromSettings(next);
                deps.resetEphemeralUi();
                deps.onThemeChange?.(next.theme);
              }
            );
            await log.step(
              t("pet.factoryResetStep.window"),
              t("pet.factoryResetStepDone.window"),
              async () => {
                await applySettingsWindowPin(next.settingsAlwaysOnTop);
                await syncPetWindow();
                await deps.refreshVrmPreview();
              }
            );
            log.done(t("pet.factoryResetOk"));
          } catch (err) {
            console.warn("[settings] factory reset failed", err);
            log.fail(t("pet.factoryResetFail"));
          }
        })();
      },
    });
  }

  function onClearCache() {
    void (async () => {
      const log = createMaintenanceLog({
        title: t("pet.clearCacheWorking"),
        paceMs: 200,
      });
      log.open();
      try {
        const report = await requestClearPetCache(async (id, run) => {
          const name = t(`pet.clearCachePart.${id}`);
          let hit = false;
          await log.step(
            t("pet.clearCacheStepRun", { name }),
            () =>
              hit
                ? t("pet.clearCacheStepHitDone", { name })
                : t("pet.clearCacheStepSkip", { name }),
            async () => {
              hit = await run();
            }
          );
        });
        await deps.refreshTtsVoiceOptions();

        if (report.parts <= 0) {
          log.done(t("pet.clearCacheOkEmpty"));
          return;
        }

        log.done(t("pet.clearCacheDoneTitle"));
      } catch (err) {
        console.warn("[settings] clear cache failed", err);
        log.fail(t("pet.clearCacheFail"));
      }
    })();
  }

  async function onSaveNickname() {
    await deps.persistAndSync();
    if (!deps.enabled.value) {
      message.success(t("pet.nicknameSaved"));
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

  async function onThemeStyle(value: unknown) {
    const style = resolveThemePackId(value);
    deps.theme.value = {
      ...deps.theme.value,
      style,
    };
    deps.onThemeChange?.(deps.theme.value);
    await deps.persistOnly();
  }

  async function onThemeStageMode(value: unknown) {
    if (!isThemeStageBackdropMode(value)) return;
    deps.theme.value = {
      ...deps.theme.value,
      stageBackdrop: { ...deps.theme.value.stageBackdrop, mode: value },
    };
    deps.onThemeChange?.(deps.theme.value);
    await deps.persistOnly();
  }

  async function onThemeWallpaperDim(value: unknown) {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    deps.theme.value = {
      ...deps.theme.value,
      stageBackdrop: {
        ...deps.theme.value.stageBackdrop,
        dim: Math.min(1, Math.max(0, n)),
      },
    };
    deps.onThemeChange?.(deps.theme.value);
    await deps.persistOnly();
  }

  async function onBubbleOpacity(value: unknown) {
    deps.theme.value = {
      ...deps.theme.value,
      bubbleOpacity: clampBubbleOpacity(value),
    };
    deps.onThemeChange?.(deps.theme.value);
    await deps.persistOnly();
  }

  async function onThemeWallpaperFit(value: unknown) {
    if (!isThemeWallpaperFit(value)) return;
    deps.theme.value = {
      ...deps.theme.value,
      stageBackdrop: { ...deps.theme.value.stageBackdrop, fit: value },
    };
    deps.onThemeChange?.(deps.theme.value);
    await deps.persistOnly();
  }

  function mediaFailText(reason: ThemeMediaFailReason) {
    return t(`pet.themeMediaFail.${reason}`);
  }

  async function pickValidMediaPath(): Promise<string | null> {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Media",
          extensions: [...THEME_MEDIA_EXTENSIONS],
        },
      ],
    });
    if (typeof selected !== "string" || !selected) return null;
    const result = await validateThemeMediaPath(selected);
    if (!result.ok) {
      message.warning(mediaFailText(result.reason));
      return null;
    }
    return selected;
  }

  async function onPickThemeWallpaper() {
    const selected = await pickValidMediaPath();
    if (!selected) return;
    deps.theme.value = {
      ...deps.theme.value,
      stageBackdrop: {
        ...deps.theme.value.stageBackdrop,
        mode: "wallpaper",
        imagePath: selected,
      },
    };
    deps.onThemeChange?.(deps.theme.value);
    await deps.persistOnly();
  }

  async function onClearThemeWallpaper() {
    deps.theme.value = {
      ...deps.theme.value,
      stageBackdrop: {
        ...deps.theme.value.stageBackdrop,
        mode: "pack",
        imagePath: "",
      },
    };
    deps.onThemeChange?.(deps.theme.value);
    await deps.persistOnly();
  }

  async function onThemeWallpaperMuted(value: unknown) {
    deps.theme.value = {
      ...deps.theme.value,
      stageBackdrop: {
        ...deps.theme.value.stageBackdrop,
        muted: Boolean(value),
      },
    };
    deps.onThemeChange?.(deps.theme.value);
    await deps.persistOnly();
  }

  async function onBootAnimationEnabled(value: unknown) {
    deps.theme.value = {
      ...deps.theme.value,
      bootAnimation: {
        ...deps.theme.value.bootAnimation,
        enabled: Boolean(value),
      },
    };
    deps.onThemeChange?.(deps.theme.value);
    await deps.persistOnly();
  }

  async function onBootAnimationMuted(value: unknown) {
    deps.theme.value = {
      ...deps.theme.value,
      bootAnimation: {
        ...deps.theme.value.bootAnimation,
        muted: Boolean(value),
      },
    };
    deps.onThemeChange?.(deps.theme.value);
    await deps.persistOnly();
  }

  async function onBootAnimationFit(value: unknown) {
    if (!isThemeWallpaperFit(value)) return;
    deps.theme.value = {
      ...deps.theme.value,
      bootAnimation: {
        ...deps.theme.value.bootAnimation,
        fit: value,
      },
    };
    deps.onThemeChange?.(deps.theme.value);
    await deps.persistOnly();
  }

  async function onPickBootAnimation() {
    const selected = await pickValidMediaPath();
    if (!selected) return;
    deps.theme.value = {
      ...deps.theme.value,
      bootAnimation: {
        ...deps.theme.value.bootAnimation,
        enabled: true,
        mediaPath: selected,
      },
    };
    deps.onThemeChange?.(deps.theme.value);
    await deps.persistOnly();
  }

  async function onClearBootAnimation() {
    deps.theme.value = {
      ...deps.theme.value,
      bootAnimation: {
        ...deps.theme.value.bootAnimation,
        enabled: false,
        mediaPath: "",
      },
    };
    deps.onThemeChange?.(deps.theme.value);
    await deps.persistOnly();
  }

  async function onBootAnimationDurationMode(value: unknown) {
    if (!isThemeBootDurationMode(value)) return;
    deps.theme.value = {
      ...deps.theme.value,
      bootAnimation: {
        ...deps.theme.value.bootAnimation,
        durationMode: value,
      },
    };
    deps.onThemeChange?.(deps.theme.value);
    await deps.persistOnly();
  }

  async function onBootAnimationDurationSec(value: unknown) {
    deps.theme.value = {
      ...deps.theme.value,
      bootAnimation: {
        ...deps.theme.value.bootAnimation,
        durationSec: clampBootDurationSec(value),
      },
    };
    deps.onThemeChange?.(deps.theme.value);
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
    onResetPetPosition,
    onModel,
    onLook,
    onResetProfile,
    onFactoryReset,
    onClearCache,
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
    onThemeStyle,
    onThemeStageMode,
    onThemeWallpaperDim,
    onBubbleOpacity,
    onThemeWallpaperFit,
    onPickThemeWallpaper,
    onClearThemeWallpaper,
    onThemeWallpaperMuted,
    onBootAnimationEnabled,
    onBootAnimationMuted,
    onBootAnimationFit,
    onPickBootAnimation,
    onClearBootAnimation,
    onBootAnimationDurationMode,
    onBootAnimationDurationSec,
    onSysStatsDefaultExpanded,
    persistCustomMotions,
    onAddCustomMotion,
    toggleEditCustom,
    onCustomMotionBoneChange,
    onRemoveCustomMotion,
    onPlayCustomMotion,
  };
}
