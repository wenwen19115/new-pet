export const PET_CHAT_LABEL = "pet-chat";
export const PET_CHAT_SHOW_EVENT = "pet://chat-show";
export const PET_CHAT_HIDE_EVENT = "pet://chat-hide";
export const PET_CHAT_ACTIVITY_EVENT = "pet://chat-activity";
export const PET_CHAT_CLOSE_REQ_EVENT = "pet://chat-close-req";
export const PET_CHAT_REPLY_EVENT = "pet://chat-reply";

export interface PetChatShowPayload {
  petName: string;
  personality: string;
  tone: "cute" | "snarky";
  muted: boolean;
  ttsEnabled: boolean;
  ttsVoiceUri: string;
  modelKind: string;
  lang: "zh" | "en";
  /** 聊天窗别读自己的 localStorage（设置在另一个 webview） */
  chatAi?: import("@/pet/chat/providers").PetChatAiConfig | null;
}

export interface PetChatReplyPayload {
  text: string;
}

/** 聊天窗开/关（开着时暂停随机 idle） */
export const PET_CHAT_OPEN_STATE_EVENT = "pet://chat-open-state";
export type PetChatOpenStatePayload = { open: boolean };

/** 无输入多久后自动关（比菜单更长，方便打字） */
export const PET_CHAT_IDLE_MS = 90_000;

export const PET_CHAT_W = 280;
export const PET_CHAT_H = 360;
export const PET_CHAT_GAP = 8;

export const PET_CHAT_INPUT_MAX = 1000;
