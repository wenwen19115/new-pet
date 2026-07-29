import { computed, ref, type Ref } from "vue";
import { message } from "ant-design-vue";
import { open } from "@tauri-apps/plugin-dialog";
import { useI18n } from "vue-i18n";
import { publishPetSettings } from "@/pet/data/settings";
import { characterCapabilities } from "@/pet/characters";
import type { PetModelKind } from "@/pet/skins";
import type { PetSettings } from "@/pet/data/types";
import {
  clearPetVrmFile,
  clearedPetVrmMeta,
  importPetVrmFromPath,
  PetVrmImportException,
  resolveNamedPetVrmSrc,
} from "@/pet/data/vrmStorage";
import { syncPetWindow } from "@/pet/windows/pet";

/** VRM upload / clear / preview for settings page. */
export function useVrmSettings(options: {
  modelKind: Ref<PetModelKind>;
  settingsBag: Ref<PetSettings>;
  getCurrentSettings: () => PetSettings;
  persistAndSync: () => Promise<void>;
}) {
  const { t } = useI18n();
  const { modelKind, settingsBag, getCurrentSettings, persistAndSync } =
    options;

  const vrmModelName = ref("");
  const vrmModelRev = ref(0);
  const vrmSrc = ref<string | null>(null);
  const vrmBusy = ref(false);

  const isVrmPending = computed(
    () =>
      characterCapabilities(modelKind.value).has("vrm-upload") &&
      !vrmModelName.value.trim()
  );

  async function refreshVrmPreview() {
    const { src, stale } = await resolveNamedPetVrmSrc(
      vrmModelName.value,
      vrmModelRev.value
    );
    vrmSrc.value = src;
    if (!stale) return;
    // Settings still have a name but the local file is gone — no floating pet,
    // only the empty settings hero (looks like "the pet became this card").
    vrmModelName.value = "";
    vrmModelRev.value = 0;
    try {
      const next = await publishPetSettings({
        ...getCurrentSettings(),
        ...clearedPetVrmMeta(),
      });
      settingsBag.value = next;
      await syncPetWindow();
    } catch (err) {
      console.warn("[pet] clear stale vrm meta failed", err);
    }
    message.warning(t("pet.vrmNeedUploadFirst"));
  }

  function applyVrmFromSettings(s: PetSettings) {
    vrmModelName.value = s.vrmModelName;
    vrmModelRev.value = s.vrmModelRev;
  }

  async function onPickVrm() {
    if (vrmBusy.value) return;
    const selected = await open({
      multiple: false,
      filters: [{ name: "VRM", extensions: ["vrm"] }],
    });
    if (selected == null) return;
    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return;

    vrmBusy.value = true;
    try {
      const imported = await importPetVrmFromPath(path);
      vrmSrc.value = imported.src;
      vrmModelName.value = imported.name;
      vrmModelRev.value = Date.now();
      if (modelKind.value !== "vrm") {
        modelKind.value = "vrm";
      }
      const next = await publishPetSettings(getCurrentSettings());
      settingsBag.value = next;
      await syncPetWindow();
      message.success(t("pet.vrmUploadOk"));
    } catch (err) {
      console.warn("[pet] pick vrm failed", err);
      if (err instanceof PetVrmImportException) {
        if (err.code === "too_large") {
          message.error(t("pet.vrmTooLarge"));
        } else if (err.code === "not_vrm") {
          message.error(t("pet.vrmInvalid"));
        } else {
          message.error(
            err.message && err.message !== "failed"
              ? `${t("pet.vrmUploadFail")}: ${err.message}`
              : t("pet.vrmUploadFail")
          );
        }
      } else {
        const detail = err instanceof Error ? err.message : String(err);
        message.error(
          detail
            ? `${t("pet.vrmUploadFail")}: ${detail}`
            : t("pet.vrmUploadFail")
        );
      }
    } finally {
      vrmBusy.value = false;
    }
  }

  async function onClearVrm() {
    if (vrmBusy.value) return;
    vrmBusy.value = true;
    try {
      await clearPetVrmFile();
      vrmModelName.value = "";
      vrmModelRev.value = 0;
      vrmSrc.value = null;
      await persistAndSync();
      message.success(t("pet.vrmCleared"));
    } catch (err) {
      console.warn("[pet] clear vrm failed", err);
      message.error(t("pet.vrmUploadFail"));
    } finally {
      vrmBusy.value = false;
    }
  }

  return {
    vrmModelName,
    vrmModelRev,
    vrmSrc,
    vrmBusy,
    isVrmPending,
    refreshVrmPreview,
    applyVrmFromSettings,
    onPickVrm,
    onClearVrm,
  };
}
