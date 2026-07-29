import type { PetModelKind } from "@/pet/skins/types";
import { DEFAULT_PET_MODEL } from "../characters";
import type { PetPersonality } from "../content/personality";
import type { AppUiTheme } from "@/theme/uiTheme";
import type { CustomVrmMotion } from "../content/customVrmMotions";
import type { PetCustomLine } from "../content/customLines";
import type { CharacterExtensions } from "./extensions";
import {
  CATCHPHRASE_DEFAULT_CHANCE,
  defaultCatchphrasesForModel,
} from "../content/catchphrases";
import {
  getCharacter,
  listCharacters,
  PET_MODEL_KINDS,
} from "../characters";
import {
  DEFAULT_PET_CHAT_AI,
  type PetChatAiConfig,
} from "../chat/providers";

export type { PetChatAiConfig, PetChatProviderId } from "../chat/providers";

export type PetTone = "cute" | "snarky";
export type { AppUiTheme };
export type { PetCustomLine, PetLineScene } from "../content/customLines";
export type {
  CharacterExtensions,
  VrmCharacterExtension,
} from "./extensions";
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
  /** Per-character AI provider / model / key */
  chatAi: PetChatAiConfig;
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
  /** Right-click menu: expand system peek (CPU/RAM/…) by default */
  sysStatsDefaultExpanded: boolean;
  /** App-level: show Chat in right-click menu */
  chatEnabled: boolean;
  /** Mirrored from active profile (per-character AI chat config) */
  chatAi: PetChatAiConfig;
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
/** Host → pet: soft dismiss / hard teardown prelude — stop work & unload VRM */
export const PET_SUSPEND_EVENT = "pet://suspend";
/** Host → pet: soft dismiss ended — resume loops & reload VRM */
export const PET_RESUME_EVENT = "pet://resume";

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
    chatAi: { ...DEFAULT_PET_CHAT_AI },
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
  chatEnabled: true,
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
  sysStatsDefaultExpanded: false,
  chatAi: { ...DEFAULT_PET_CHAT_AI },
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
