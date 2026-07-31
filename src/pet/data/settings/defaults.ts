import type { PetModelKind } from "../../skins/types";
import {
  DEFAULT_PET_MODEL,
  getCharacter,
  listCharacters,
} from "../../characters";
import {
  CATCHPHRASE_DEFAULT_CHANCE,
  defaultCatchphrasesForModel,
} from "../../content/dialogue/catchphrases";
import { DEFAULT_PET_CHAT_AI } from "../../chat/providers";
import type {
  PetModelProfile,
  PetModelProfiles,
  PetSettings,
} from "../types";
import { DEFAULT_DESK_WEATHER, normalizeDeskWeather } from "../deskWeather";

/** 默认档案工厂：可依赖 characters / content / chat（不放在 data/types）。 */
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
    playfulModeEnabled: false,
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
  playfulModeEnabled: false,
  vrmModelName: "",
  vrmModelRev: 0,
  hitBoundsEnabled: true,
  deskWeather: normalizeDeskWeather(DEFAULT_DESK_WEATHER),
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
