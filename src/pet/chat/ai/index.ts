import {
  DEFAULT_PET_CHAT_AI,
  normalizePetChatAi,
  resolveChatEndpoint,
  type PetChatAiConfig,
} from "../providers";
import { localPetChatReply } from "./localReply";
import {
  askOpenAiCompat,
  askOpenAiCompatStream,
  mapRemoteError,
  requireRemoteEndpoint,
  streamLocalReply,
} from "./remote";
import type { ChatTurn, PetChatPersona } from "./types";

export type { ChatTurn, PetChatPersona } from "./types";
export { PetChatAiError } from "./types";

/**
 * 优先远程；仅 provider=`local` 时用本地关键词回复。
 * 远程失败直接抛错，UI 显示错误气泡，不做静默本地兜底。
 */
export async function askPetChatAi(
  persona: PetChatPersona,
  turns: ChatTurn[],
  options?: {
    signal?: AbortSignal;
    chatAi?: PetChatAiConfig | null;
    onDelta?: (text: string) => void;
  }
): Promise<string> {
  const lastUser =
    [...turns].reverse().find((m) => m.role === "user")?.content ?? "";
  const cfg = normalizePetChatAi(options?.chatAi ?? DEFAULT_PET_CHAT_AI);
  const signal = options?.signal;
  const onDelta = options?.onDelta;
  const { provider } = resolveChatEndpoint(cfg);
  const lang = persona.lang;

  if (provider.id === "local") {
    const reply = localPetChatReply(persona, lastUser);
    if (onDelta) return streamLocalReply(reply, onDelta, signal);
    return reply;
  }

  const remote = requireRemoteEndpoint(cfg, lang);

  try {
    if (onDelta) {
      return await askOpenAiCompatStream(
        persona,
        turns,
        remote.baseUrl,
        remote.model,
        remote.apiKey,
        onDelta,
        signal
      );
    }
    return await askOpenAiCompat(
      persona,
      turns,
      remote.baseUrl,
      remote.model,
      remote.apiKey,
      signal
    );
  } catch (err) {
    mapRemoteError(err, lang);
  }
}

export async function testPetChatConnection(
  chatAi: PetChatAiConfig | null | undefined,
  lang: "zh" | "en" = "zh",
  signal?: AbortSignal
): Promise<{ model: string; preview: string }> {
  const cfg = normalizePetChatAi(chatAi ?? DEFAULT_PET_CHAT_AI);
  const { baseUrl, model, apiKey } = requireRemoteEndpoint(cfg, lang);
  const persona: PetChatPersona = {
    petName: lang === "en" ? "new-pet" : "新宠",
    personality: "sunny",
    tone: "cute",
    lang,
  };
  try {
    const preview = await askOpenAiCompat(
      persona,
      [
        {
          role: "user",
          content:
            lang === "en" ? "Reply with exactly one word: ok" : "只回复一个字：好",
        },
      ],
      baseUrl,
      model,
      apiKey,
      signal
    );
    return { model, preview: preview.slice(0, 40) };
  } catch (err) {
    mapRemoteError(err, lang);
  }
}
