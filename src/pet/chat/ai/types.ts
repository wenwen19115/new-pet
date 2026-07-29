import type { PetPersonality } from "../../content/dialogue/personality";
import type { PetTone } from "../../data/types";

/** Cap messages sent to the model as context */
export const PET_CHAT_MAX_TURNS = 8;

type ChatRole = "system" | "user" | "assistant";

export interface ChatTurn {
  id?: string;
  role: Exclude<ChatRole, "system">;
  content: string;
  /** Error bubbles are UI-only; never sent back to the model */
  kind?: "ok" | "error";
  ts?: number;
}

type PetChatAiErrorCode =
  | "missing_key"
  | "http"
  | "network"
  | "empty"
  | "config";

export class PetChatAiError extends Error {
  readonly code: PetChatAiErrorCode;
  constructor(code: PetChatAiErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "PetChatAiError";
    this.code = code;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export interface PetChatPersona {
  petName: string;
  personality: PetPersonality;
  tone: PetTone;
  lang: "zh" | "en";
}
