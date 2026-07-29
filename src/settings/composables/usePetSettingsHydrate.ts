import type { Ref } from "vue";
import type { PetSettings } from "@/pet/data/types";
import type { PetPersonality } from "@/pet/content/dialogue/personality";
import type { PetTone } from "@/pet/data/types";
import type { PetModelKind } from "@/pet/skins/types";
import type { CustomVrmMotion } from "@/pet/content/motion/customVrmMotions";
import type { PetCustomLine } from "@/pet/content/dialogue/customLines";
import type { AppUiTheme } from "@/theme/uiTheme";
import { isPetIdleMotion } from "@/pet/content/motion/motions";
import { isCustomVrmMotionId } from "@/pet/content/motion/customVrmMotions";
import { coerceLookIdForModel } from "@/pet/skins";
import { isAppUiTheme } from "@/theme/uiTheme";
import { clampCatchphraseChance } from "@/pet/content/dialogue/catchphrases";
import { isPetPersonality } from "@/pet/content/dialogue/personality";

export function usePetSettingsHydrate(deps: {
  settingsBag: Ref<PetSettings>;
  enabled: Ref<boolean>;
  muted: Ref<boolean>;
  chatEnabled: Ref<boolean>;
  opacityPercent: Ref<number>;
  zoomPercent: Ref<number>;
  tone: Ref<PetTone>;
  demoMotion: Ref<string>;
  modelKind: Ref<PetModelKind>;
  lookId: Ref<string>;
  nickname: Ref<string>;
  personality: Ref<PetPersonality>;
  usbWatchEnabled: Ref<boolean>;
  randomIdleEnabled: Ref<boolean>;
  playfulModeEnabled: Ref<boolean>;
  hitBoundsEnabled: Ref<boolean>;
  catchphrases: Ref<string[]>;
  catchphraseChance: Ref<number>;
  uiTheme: Ref<AppUiTheme>;
  settingsAlwaysOnTop: Ref<boolean>;
  sysStatsDefaultExpanded: Ref<boolean>;
  customVrmMotions: Ref<CustomVrmMotion[]>;
  customLines: Ref<PetCustomLine[]>;
  customLinesOnly: Ref<boolean>;
  disabledMotions: Ref<string[]>;
  disabledBuiltInLines: Ref<string[]>;
  applyTtsFromSettings: (s: PetSettings) => void;
  applyChatAiDraft: (raw: unknown) => void;
  applyVrmFromSettings: (s: PetSettings) => void;
  refreshTtsVoiceOptions: () => void | Promise<void>;
  onUiThemeChange?: (theme: AppUiTheme) => void;
}) {
  function applyLocalFromSettings(s: PetSettings) {
    deps.settingsBag.value = s;
    deps.enabled.value = s.enabled;
    deps.muted.value = s.muted;
    deps.applyTtsFromSettings(s);
    deps.chatEnabled.value = Boolean(s.chatEnabled);
    deps.applyChatAiDraft(s.chatAi);
    deps.opacityPercent.value = Math.round(s.opacity * 100);
    void deps.refreshTtsVoiceOptions();
    deps.zoomPercent.value = s.zoomPercent;
    deps.tone.value = s.tone;
    deps.demoMotion.value =
      isPetIdleMotion(s.demoMotion) || isCustomVrmMotionId(s.demoMotion)
        ? s.demoMotion
        : "fly-orbit";
    deps.modelKind.value = s.modelKind;
    deps.lookId.value = coerceLookIdForModel(s.lookId, s.modelKind);
    deps.nickname.value = s.nickname;
    deps.personality.value = isPetPersonality(s.personality)
      ? s.personality
      : deps.personality.value;
    deps.usbWatchEnabled.value = s.usbWatchEnabled;
    deps.randomIdleEnabled.value = s.randomIdleEnabled;
    deps.playfulModeEnabled.value = s.playfulModeEnabled;
    deps.hitBoundsEnabled.value = s.hitBoundsEnabled;
    deps.catchphrases.value = [...(s.catchphrases ?? [])];
    deps.catchphraseChance.value = clampCatchphraseChance(s.catchphraseChance);
    deps.uiTheme.value = isAppUiTheme(s.uiTheme) ? s.uiTheme : "night";
    deps.settingsAlwaysOnTop.value = Boolean(s.settingsAlwaysOnTop);
    deps.sysStatsDefaultExpanded.value = Boolean(s.sysStatsDefaultExpanded);
    deps.customVrmMotions.value = s.customVrmMotions.map((m) => ({ ...m }));
    const profile = s.profiles[s.modelKind];
    deps.customLines.value = (profile?.customLines ?? []).map((l) => ({
      ...l,
    }));
    deps.customLinesOnly.value = Boolean(profile?.customLinesOnly);
    deps.disabledMotions.value = [...(profile?.disabledMotions ?? [])];
    deps.disabledBuiltInLines.value = [
      ...(profile?.disabledBuiltInLines ?? []),
    ];
    deps.applyVrmFromSettings(s);
    deps.onUiThemeChange?.(deps.uiTheme.value);
  }

  return { applyLocalFromSettings };
}
