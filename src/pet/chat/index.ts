/** Left-click AI chat dialog (WebView window + free AI + TTS reuse). */
export {
  destroyChatWindow,
  hidePetChat,
  isPetChatOpen,
  showPetChat,
  togglePetChat,
} from "./window";

export { PET_CHAT_REPLY_EVENT, PET_CHAT_OPEN_STATE_EVENT } from "./types";
export type {
  PetChatReplyPayload,
  PetChatShowPayload,
  PetChatOpenStatePayload,
} from "./types";

export {
  DEFAULT_PET_CHAT_AI,
  PET_CHAT_PROVIDERS,
  addCustomChatModel,
  mergeChatModelIds,
  normalizePetChatAi,
  removeCustomChatModel,
  resolveChatEndpoint,
  isPetChatProviderId,
} from "./providers";
export type { PetChatAiConfig, PetChatProviderId } from "./providers";

export {
  PET_CHAT_HISTORY_KEY,
  PET_CHAT_HISTORY_MAX,
  PET_CHAT_HISTORY_CHANGED,
  PET_CHAT_HISTORY_TRUNCATED,
  PET_CHAT_WINDOW_MAX,
  appendChatMessages,
  clearChatHistory,
  deleteChatMessage,
  downloadChatHistoryExport,
  filterChatHistory,
  formatChatTime,
  loadChatHistory,
  loadChatWindowSlice,
} from "./history";
export type {
  PetChatCharacterId,
  PetChatHistoryItem,
  PetChatHistoryKind,
} from "./history";

export { askPetChatAi, testPetChatConnection, PetChatAiError } from "./ai";
