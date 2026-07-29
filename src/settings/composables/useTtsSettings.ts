import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { listPetTtsVoices } from "@/pet/bridge/tts";

/** TTS enable / voice options for settings page. */
export function useTtsSettings(options: {
  persistOnly: () => Promise<void>;
}) {
  const { t } = useI18n();
  const { persistOnly } = options;

  const ttsEnabled = ref(false);
  const ttsVoiceUri = ref("");
  const ttsVoiceOptions = ref<Array<{ label: string; value: string }>>([
    { label: "", value: "" },
  ]);

  async function refreshTtsVoiceOptions() {
    const voices = await listPetTtsVoices();
    ttsVoiceOptions.value = [
      { label: t("pet.ttsVoiceAuto"), value: "" },
      ...voices.map((v) => ({
        label: v.name,
        value: v.uri,
      })),
    ];
  }

  function applyTtsFromSettings(s: { ttsEnabled?: boolean; ttsVoiceUri?: string }) {
    ttsEnabled.value = Boolean(s.ttsEnabled);
    ttsVoiceUri.value = typeof s.ttsVoiceUri === "string" ? s.ttsVoiceUri : "";
  }

  async function onTtsEnabled(value: boolean) {
    ttsEnabled.value = value;
    if (value) void refreshTtsVoiceOptions();
    await persistOnly();
  }

  async function onTtsVoice(value: unknown) {
    ttsVoiceUri.value = typeof value === "string" ? value : "";
    await persistOnly();
  }

  return {
    ttsEnabled,
    ttsVoiceUri,
    ttsVoiceOptions,
    refreshTtsVoiceOptions,
    applyTtsFromSettings,
    onTtsEnabled,
    onTtsVoice,
  };
}
