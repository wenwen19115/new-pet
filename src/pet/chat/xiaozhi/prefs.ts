import {
  isXiaozhiBound,
  normalizePetChatAi,
  type PetChatAiConfig,
} from "@/pet/chat/providers";

/** 全应用共用：绑定凭证 + 宠下语音 UX */
export type XiaozhiPrefs = {
  otaUrl: string;
  deviceId: string;
  clientId: string;
  /** OTA 绑定后写入；设置页不手填 */
  wsUrl: string;
  token: string;
  /** 播下行 Opus；关则只字幕 */
  voicePlayback: boolean;
  /** 单击对话条切换聆听；快捷键仍按住 */
  clickToggleListen: boolean;
  /** 如 Alt+Space */
  hotkey: string;
  /**
   * 对话条无对话后自动渐隐秒数。
   * 0=不自动隐藏；靠近宠物会再浮现。
   */
  talkBarHideSec: number;
};

export const DEFAULT_XIAOZHI_HOTKEY = "Alt+Space";
/** 默认闲置隐藏；设置可改 */
export const DEFAULT_XIAOZHI_TALK_BAR_HIDE_SEC = 15;
export const XIAOZHI_TALK_BAR_HIDE_SEC_MAX = 300;

export const DEFAULT_XIAOZHI_PREFS: XiaozhiPrefs = {
  otaUrl: "",
  deviceId: "",
  clientId: "",
  wsUrl: "",
  token: "",
  voicePlayback: true,
  clickToggleListen: false,
  hotkey: DEFAULT_XIAOZHI_HOTKEY,
  talkBarHideSec: DEFAULT_XIAOZHI_TALK_BAR_HIDE_SEC,
};

/** 条可视宽（不随宠物 zoom）；命中与 CSS 共用 */
export const XIAOZHI_TALK_BAR_W = 248;
export const XIAOZHI_TALK_BAR_VISUAL_H = 40;
export const XIAOZHI_LISTEN_IDLE_MS = 60_000;
/** 鼠标靠近宠物浮现对话条的半径余量（相对身位框） */
export const XIAOZHI_TALK_BAR_PROXIMITY_PAD = 56;

const HOTKEY_MAX = 48;

export function normalizeXiaozhiHotkey(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_XIAOZHI_HOTKEY;
  const s = raw.trim().slice(0, HOTKEY_MAX);
  return s || DEFAULT_XIAOZHI_HOTKEY;
}

export function normalizeXiaozhiTalkBarHideSec(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_XIAOZHI_TALK_BAR_HIDE_SEC;
  return Math.min(
    XIAOZHI_TALK_BAR_HIDE_SEC_MAX,
    Math.max(0, Math.round(n))
  );
}

/**
 * 归一化全应用小智偏好。
 * 缺 device/ws/token 时从 chatAi（旧档）迁移。
 */
export function normalizeXiaozhiPrefs(
  raw: Partial<XiaozhiPrefs> | null | undefined,
  migrateFrom?: Partial<PetChatAiConfig> | null
): XiaozhiPrefs {
  const migrated = normalizePetChatAi({
    provider: "xiaozhi",
    apiKey:
      typeof raw?.token === "string" && raw.token.trim()
        ? raw.token
        : migrateFrom?.apiKey,
    baseUrl:
      typeof raw?.wsUrl === "string" && raw.wsUrl.trim()
        ? raw.wsUrl
        : migrateFrom?.baseUrl,
    deviceId:
      typeof raw?.deviceId === "string" && raw.deviceId.trim()
        ? raw.deviceId
        : migrateFrom?.deviceId,
    clientId:
      typeof raw?.clientId === "string" && raw.clientId.trim()
        ? raw.clientId
        : migrateFrom?.clientId,
    otaUrl:
      typeof raw?.otaUrl === "string" && raw.otaUrl.trim()
        ? raw.otaUrl
        : migrateFrom?.otaUrl,
  });

  return {
    otaUrl: migrated.otaUrl,
    deviceId: migrated.deviceId,
    clientId: migrated.clientId,
    wsUrl: migrated.baseUrl,
    token: migrated.apiKey,
    voicePlayback:
      raw?.voicePlayback === undefined
        ? DEFAULT_XIAOZHI_PREFS.voicePlayback
        : Boolean(raw.voicePlayback),
    clickToggleListen:
      raw?.clickToggleListen === undefined
        ? DEFAULT_XIAOZHI_PREFS.clickToggleListen
        : Boolean(raw.clickToggleListen),
    hotkey: normalizeXiaozhiHotkey(raw?.hotkey),
    talkBarHideSec:
      raw?.talkBarHideSec === undefined
        ? DEFAULT_XIAOZHI_PREFS.talkBarHideSec
        : normalizeXiaozhiTalkBarHideSec(raw.talkBarHideSec),
  };
}

/** 会话 / OTA 用的 chatAi 视图（凭证来自 prefs） */
export function chatAiFromXiaozhiPrefs(prefs: XiaozhiPrefs): PetChatAiConfig {
  return normalizePetChatAi({
    provider: "xiaozhi",
    apiKey: prefs.token,
    baseUrl: prefs.wsUrl,
    deviceId: prefs.deviceId,
    clientId: prefs.clientId,
    otaUrl: prefs.otaUrl,
  });
}

/** prefs 视图；判定与 isXiaozhiBound 同一套 */
export function isXiaozhiPrefsBound(prefs: XiaozhiPrefs): boolean {
  return isXiaozhiBound(chatAiFromXiaozhiPrefs(prefs));
}

/** 绑定成功后写回 ws/token，保留 device 与 UX 开关 */
export function applyXiaozhiBindResult(
  prefs: XiaozhiPrefs,
  bound: { wsUrl: string; token: string }
): XiaozhiPrefs {
  return normalizeXiaozhiPrefs({
    ...prefs,
    wsUrl: bound.wsUrl,
    token: bound.token,
  });
}

/** 重绑：清凭证，device 保留 */
export function clearXiaozhiBind(prefs: XiaozhiPrefs): XiaozhiPrefs {
  return normalizeXiaozhiPrefs({
    ...prefs,
    wsUrl: "",
    token: "",
  });
}
