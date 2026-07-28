import type { PetModelKind } from "./skins/types";
import { DEFAULT_PET_MODEL } from "./characters";
import type { PetPersonality } from "./personality";
import type { AppUiTheme } from "@/theme/uiTheme";
import type { CustomVrmMotion } from "./customVrmMotions";
import type { PetCustomLine } from "./customLines";
import type { CharacterExtensions } from "./domain/extensions";
import {
  CATCHPHRASE_DEFAULT_CHANCE,
  defaultCatchphrasesForModel,
} from "./catchphrases";
import {
  getCharacter,
  listCharacters,
  PET_MODEL_KINDS,
} from "./characters";

export type PetTone = "cute" | "snarky";
export type { AppUiTheme };
export type { PetCustomLine, PetLineScene } from "./customLines";
export type {
  CharacterExtensions,
  VrmCharacterExtension,
} from "./domain/extensions";
export { PET_MODEL_KINDS };

export type PetMood =
  | "idle"
  | "happy"
  | "grumpy"
  | "curious"
  | "excited"
  | "sleep";

/** Per-character user data (common to all characters) */
export interface PetModelProfile {
  nickname: string;
  personality: PetPersonality;
  tone: PetTone;
  lookId: string;
  zoomPercent: number;
  demoMotion: string;
  muted: boolean;
  /** Speak bubble text via Edge neural TTS */
  ttsEnabled: boolean;
  /** Edge ShortName; empty = auto by character */
  ttsVoiceUri: string;
  opacity: number;
  usbWatchEnabled: boolean;
  randomIdleEnabled: boolean;
  hitBoundsEnabled: boolean;
  catchphrases: string[];
  catchphraseChance: number;
  customLines: PetCustomLine[];
  customLinesOnly: boolean;
  disabledMotions: string[];
  /** Built-in dialogue categories closed like motion toggles */
  disabledBuiltInLines: string[];
  /** Character-specific bags (vrm / future) */
  extensions: CharacterExtensions;
}

export type PetModelProfiles = Record<PetModelKind, PetModelProfile>;

export interface PetSettings {
  enabled: boolean;
  modelKind: PetModelKind;
  uiTheme: AppUiTheme;
  settingsAlwaysOnTop: boolean;
  profiles: PetModelProfiles;
  /**
   * Mirrored from active profile / vrm extension for convenience.
   * Canonical VRM data lives in profiles.vrm.extensions.vrm
   */
  vrmModelName: string;
  vrmModelRev: number;
  customVrmMotions: CustomVrmMotion[];
  muted: boolean;
  ttsEnabled: boolean;
  ttsVoiceUri: string;
  opacity: number;
  usbWatchEnabled: boolean;
  randomIdleEnabled: boolean;
  hitBoundsEnabled: boolean;
  catchphrases: string[];
  catchphraseChance: number;
  tone: PetTone;
  demoMotion: string;
  lookId: string;
  nickname: string;
  personality: PetPersonality;
  zoomPercent: number;
}

export const PET_WINDOW_LABEL = "pet";
export const PET_SETTINGS_EVENT = "pet://settings-changed";
export const PET_INTRO_EVENT = "pet://intro";

export function defaultProfileForModel(model: PetModelKind): PetModelProfile {
  const character = getCharacter(model);
  return {
    nickname: "",
    personality: "sunny",
    tone: "cute",
    lookId: character.defaults.lookId,
    zoomPercent: 0,
    demoMotion: character.defaults.demoMotion,
    muted: false,
    ttsEnabled: false,
    ttsVoiceUri: "",
    opacity: 1,
    usbWatchEnabled: true,
    randomIdleEnabled: true,
    hitBoundsEnabled: true,
    catchphrases: defaultCatchphrasesForModel(model),
    catchphraseChance: CATCHPHRASE_DEFAULT_CHANCE,
    customLines: [],
    customLinesOnly: false,
    disabledMotions: [],
    disabledBuiltInLines: [],
    extensions: character.defaults.buildExtensions?.() ?? {},
  };
}

export function createDefaultProfiles(): PetModelProfiles {
  const profiles = {} as PetModelProfiles;
  for (const character of listCharacters()) {
    profiles[character.id] = defaultProfileForModel(character.id);
  }
  return profiles;
}

export const DEFAULT_PET_SETTINGS: PetSettings = {
  enabled: false,
  muted: false,
  ttsEnabled: false,
  ttsVoiceUri: "",
  opacity: 1,
  modelKind: DEFAULT_PET_MODEL,
  usbWatchEnabled: true,
  randomIdleEnabled: true,
  vrmModelName: "",
  vrmModelRev: 0,
  hitBoundsEnabled: true,
  catchphrases: defaultCatchphrasesForModel(DEFAULT_PET_MODEL),
  catchphraseChance: CATCHPHRASE_DEFAULT_CHANCE,
  uiTheme: "night",
  settingsAlwaysOnTop: false,
  customVrmMotions: [],
  profiles: createDefaultProfiles(),
  tone: "cute",
  demoMotion: getCharacter(DEFAULT_PET_MODEL).defaults.demoMotion,
  lookId: getCharacter(DEFAULT_PET_MODEL).defaults.lookId,
  nickname: "",
  personality: "sunny",
  zoomPercent: 0,
};

export interface PetUsbAnnouncePayload {
  ports: Array<{
    portName: string;
    friendlyName?: string | null;
    description?: string | null;
  }>;
  added: string[];
}
