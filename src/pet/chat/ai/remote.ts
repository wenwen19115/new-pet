import {
  resolveChatEndpoint,
  type PetChatAiConfig,
} from "../providers";
import {
  PET_CHAT_MAX_TURNS,
  PetChatAiError,
  type ChatTurn,
  type PetChatPersona,
} from "./types";

function trimTurns(turns: ChatTurn[]): ChatTurn[] {
  const usable = turns.filter((m) => m.kind !== "error");
  const max = PET_CHAT_MAX_TURNS * 2;
  if (usable.length <= max) return usable;
  return usable.slice(usable.length - max);
}

function extractReply(raw: unknown): string {
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return "";
    try {
      const parsed = JSON.parse(t) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const c = parsed.choices?.[0]?.message?.content;
      if (typeof c === "string" && c.trim()) return c.trim();
    } catch {
      // plain text
    }
    return t;
  }
  if (raw && typeof raw === "object") {
    const obj = raw as {
      choices?: Array<{ message?: { content?: string } }>;
      content?: string;
    };
    const c = obj.choices?.[0]?.message?.content ?? obj.content;
    if (typeof c === "string") return c.trim();
  }
  return "";
}

function sanitizeReply(text: string): string {
  return text
    .replace(/^["「『]|["」』]$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

function buildSystemPrompt(persona: PetChatPersona): string {
  const hint =
    persona.personality === "shy"
      ? persona.lang === "zh"
        ? "软萌害羞"
        : "shy and soft"
      : persona.personality === "cool"
        ? persona.lang === "zh"
          ? "高冷简洁"
          : "cool and terse"
        : persona.personality === "fiery"
          ? persona.lang === "zh"
            ? "暴躁直接"
            : "fiery and blunt"
          : persona.lang === "zh"
            ? "开朗热情"
            : "sunny and warm";
  const toneHint =
    persona.tone === "snarky"
      ? persona.lang === "zh"
        ? "带一点毒舌"
        : "a bit snarky"
      : persona.lang === "zh"
        ? "可爱卖萌"
        : "cute";

  if (persona.lang === "en") {
    return `You are ${persona.petName}, a new-pet companion. Personality: ${hint}. Tone: ${toneHint}. Reply in 1-2 short spoken sentences. No markdown.`;
  }
  return `你是新宠「${persona.petName}」。性格：${hint}；语气：${toneHint}。用一两句口头中文回复，约 60 字内，不要 markdown。`;
}

function buildMessages(persona: PetChatPersona, turns: ChatTurn[]) {
  return [
    { role: "system" as const, content: buildSystemPrompt(persona) },
    ...trimTurns(turns).map((m) => ({
      role: m.role,
      content: m.content.slice(0, 1000),
    })),
  ];
}

export function mapRemoteError(err: unknown, lang: "zh" | "en"): never {
  if ((err as { name?: string })?.name === "AbortError") throw err;
  console.warn("[pet] chat remote failed", err);
  const msg = err instanceof Error ? err.message : String(err);
  if (/chat http 401|chat http 403/i.test(msg)) {
    throw new PetChatAiError(
      "http",
      lang === "en"
        ? "API rejected the key (401/403). Check API Key in Settings → AI Chat."
        : "API Key 无效或无权限（401/403）。请到设置 → AI 聊天检查 Key。",
      err
    );
  }
  if (/chat http 402|chat http 429/i.test(msg)) {
    throw new PetChatAiError(
      "http",
      lang === "en"
        ? "Provider quota/rate limited. Try later, another model, or Local companion."
        : "服务商额度不足或限流。稍后再试、换模型，或改用「仅本地陪聊」。",
      err
    );
  }
  if (/Failed to fetch|NetworkError|chat http/i.test(msg)) {
    throw new PetChatAiError(
      "network",
      lang === "en"
        ? "Chat request failed (network or server). Check connection and API settings."
        : "对话请求失败（网络或服务端）。请检查网络与 API 设置。",
      err
    );
  }
  throw new PetChatAiError(
    "empty",
    lang === "en"
      ? "No reply from the model. Try again or switch provider."
      : "模型没有返回有效内容。请重试或更换服务商。",
    err
  );
}

export function requireRemoteEndpoint(
  cfg: PetChatAiConfig,
  lang: "zh" | "en"
): { baseUrl: string; model: string; apiKey: string } {
  const { provider, baseUrl, model, apiKey } = resolveChatEndpoint(cfg);
  if (provider.id === "local") {
    throw new PetChatAiError(
      "config",
      lang === "en"
        ? "Switch to DeepSeek to test the API connection."
        : "请先切换到 DeepSeek 再测试连接。"
    );
  }
  if (provider.needsKey && !apiKey) {
    throw new PetChatAiError(
      "missing_key",
      lang === "en"
        ? "API Key missing. Set one in Settings → AI Chat, or switch to Local companion."
        : "未填写 API Key。请到设置 → AI 聊天填写，或改用「仅本地陪聊」。"
    );
  }
  if (!provider.openaiCompat || !baseUrl || !model) {
    throw new PetChatAiError(
      "config",
      lang === "en"
        ? "Chat provider is misconfigured. Check model in Settings → AI Chat."
        : "聊天服务未配置完整。请到设置 → AI 聊天检查模型。"
    );
  }
  return { baseUrl, model, apiKey };
}

export async function askOpenAiCompat(
  persona: PetChatPersona,
  turns: ChatTurn[],
  baseUrl: string,
  model: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<string> {
  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: buildMessages(persona, turns),
      max_tokens: 160,
      temperature: 0.8,
    }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `chat http ${res.status}${body ? `: ${body.slice(0, 120)}` : ""}`
    );
  }

  const raw = await res.json();
  const reply = sanitizeReply(extractReply(raw));
  if (!reply) throw new Error("chat empty reply");
  return reply;
}

export async function askOpenAiCompatStream(
  persona: PetChatPersona,
  turns: ChatTurn[],
  baseUrl: string,
  model: string,
  apiKey: string,
  onDelta: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: buildMessages(persona, turns),
      max_tokens: 160,
      temperature: 0.8,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `chat http ${res.status}${body ? `: ${body.slice(0, 120)}` : ""}`
    );
  }
  if (!res.body) {
    const raw = await res.json();
    const reply = sanitizeReply(extractReply(raw));
    if (!reply) throw new Error("chat empty reply");
    onDelta(reply);
    return reply;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let acc = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const piece = json.choices?.[0]?.delta?.content;
        if (typeof piece === "string" && piece) {
          acc += piece;
          onDelta(acc);
        }
      } catch {
        // ignore malformed chunk
      }
    }
  }

  const reply = sanitizeReply(acc);
  if (!reply) throw new Error("chat empty reply");
  onDelta(reply);
  return reply;
}

export async function streamLocalReply(
  text: string,
  onDelta: (text: string) => void,
  signal?: AbortSignal
): Promise<string> {
  let acc = "";
  for (const ch of text) {
    if (signal?.aborted) {
      const err = new Error("Aborted");
      err.name = "AbortError";
      throw err;
    }
    acc += ch;
    onDelta(acc);
    await new Promise((r) => setTimeout(r, 14));
  }
  return acc;
}
