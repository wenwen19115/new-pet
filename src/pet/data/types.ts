import type { PetModelKind } from "@/pet/skins/types";
import type { PetPersonality } from "../content/dialogue/personality";
import type { AppUiTheme } from "@/theme/uiTheme";
import type { CustomVrmMotion } from "../content/motion/customVrmMotions";
import type { PetCustomLine } from "../content/dialogue/customLines";
import type { CharacterExtensions } from "./extensions";
import type { PetChatAiConfig } from "../chat/providers";
import type { DeskWeatherConfig } from "./deskWeather";

export type { PetChatAiConfig, PetChatProviderId } from "../chat/providers";
export type {
  DeskWeatherConfig,
  DeskWeatherKind,
  DeskWeatherMaxDwellTierId,
} from "./deskWeather";

export type PetTone = "cute" | "snarky";
export type { AppUiTheme };
export type { PetCustomLine, PetLineScene } from "../content/dialogue/customLines";
export type {
  CharacterExtensions,
  VrmCharacterExtension,
} from "./extensions";

export type PetMood =
  | "idle"
  | "happy"
  | "grumpy"
  | "curious"
  | "excited"
  | "sleep";

export interface PetModelProfile {
  nickname: string;
  personality: PetPersonality;
  tone: PetTone;
  lookId: string;
  zoomPercent: number;
  demoMotion: string;
  muted: boolean;
  /** 气泡台词走 Edge 神经网络 TTS */
  ttsEnabled: boolean;
  /** Edge ShortName；空则按角色自动选 */
  ttsVoiceUri: string;
  chatAi: PetChatAiConfig;
  opacity: number;
  usbWatchEnabled: boolean;
  randomIdleEnabled: boolean;
  /** 调皮：靠近躲开，倒计时内点中算抓到 */
  playfulModeEnabled: boolean;
  hitBoundsEnabled: boolean;
  catchphrases: string[];
  catchphraseChance: number;
  customLines: PetCustomLine[];
  customLinesOnly: boolean;
  disabledMotions: string[];
  /** 内置台词类别开关（同 motion toggle） */
  disabledBuiltInLines: string[];
  extensions: CharacterExtensions;
}

export type PetModelProfiles = Record<PetModelKind, PetModelProfile>;

export interface PetSettings {
  enabled: boolean;
  modelKind: PetModelKind;
  uiTheme: AppUiTheme;
  settingsAlwaysOnTop: boolean;
  /** 右键菜单：系统信息默认展开 */
  sysStatsDefaultExpanded: boolean;
  /** 右键菜单是否显示聊天 */
  chatEnabled: boolean;
  /** 从当前角色档案镜像出来的陪聊配置 */
  chatAi: PetChatAiConfig;
  profiles: PetModelProfiles;
  /**
   * 顶层镜像，方便读写；权威数据在 profiles.vrm.extensions.vrm
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
  /** 调皮：靠近躲开，倒计时内点中算抓到 */
  playfulModeEnabled: boolean;
  hitBoundsEnabled: boolean;
  deskWeather: DeskWeatherConfig;
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
/** 清可重建缓存（各 WebView 各自执行） */
export const PET_CLEAR_CACHE_EVENT = "pet://clear-cache";
/** host → pet：软隐藏 / 硬销毁前奏 — 停活并卸 VRM */
export const PET_SUSPEND_EVENT = "pet://suspend";
/** host → pet：软隐藏结束 — 恢复循环并重载 VRM */
export const PET_RESUME_EVENT = "pet://resume";

export interface PetUsbAnnouncePayload {
  ports: Array<{
    portName: string;
    friendlyName?: string | null;
    description?: string | null;
  }>;
  added: string[];
}
