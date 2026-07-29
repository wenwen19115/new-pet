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
  /** Prefer this over chat-window localStorage (settings live in another webview) */
  chatAi?: import("./providers").PetChatAiConfig | null;
}

export interface PetChatReplyPayload {
  text: string;
}

/** Pet host: AI chat window open/closed (pause random idle while open) */
export const PET_CHAT_OPEN_STATE_EVENT = "pet://chat-open-state";
export type PetChatOpenStatePayload = { open: boolean };

/** Idle with no input → auto close (longer than menu for typing) */
export const PET_CHAT_IDLE_MS = 90_000;

export const PET_CHAT_W = 280;
export const PET_CHAT_H = 360;
export const PET_CHAT_GAP = 8;

/** Cap messages sent to the model as context */
export const PET_CHAT_MAX_TURNS = 8;
/** Max characters for one user input in the chat window */
export const PET_CHAT_INPUT_MAX = 1000;
