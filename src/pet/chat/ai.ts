import type { PetPersonality } from "../personality";
import type { PetTone } from "../types";
import {
  DEFAULT_PET_CHAT_AI,
  normalizePetChatAi,
  resolveChatEndpoint,
  type PetChatAiConfig,
} from "./providers";
import { PET_CHAT_MAX_TURNS } from "./types";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatTurn {
  id?: string;
  role: Exclude<ChatRole, "system">;
  content: string;
  /** Error bubbles are UI-only; never sent back to the model */
  kind?: "ok" | "error";
  ts?: number;
}

export type PetChatAiErrorCode =
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

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

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
    return `You are ${persona.petName}, a desktop pet. Personality: ${hint}. Tone: ${toneHint}. Reply in 1-2 short spoken sentences. No markdown.`;
  }
  return `你是桌宠「${persona.petName}」。性格：${hint}；语气：${toneHint}。用一两句口头中文回复，约 60 字内，不要 markdown。`;
}

/** Local companion reply — only used when provider is explicitly `local`. */
export function localPetChatReply(
  persona: PetChatPersona,
  userText: string
): string {
  const name = persona.petName || (persona.lang === "en" ? "Pet" : "桌宠");
  const zh = persona.lang === "zh";
  const snarky = persona.tone === "snarky";
  const t = userText.trim();

  const byPersonality = (cute: string[], roast: string[]): string =>
    pick(snarky ? roast : cute);

  if (/^(hi|hello|hey|yo)\b|你好|您好|嗨|哈喽|早|晚安/i.test(t)) {
    return byPersonality(
      zh
        ? [`嗨～我是${name}！`, `${name}在呢，想聊点什么？`, `来啦，我听着呢～`]
        : [`Hi! I'm ${name}.`, `${name} here — what's up?`, `Hey! I'm all ears.`],
      zh
        ? [`哦，是你啊。`, `${name}在。有话快说。`, `嗯，我听着。`]
        : [`Oh. It's you.`, `${name} here. Spit it out.`, `Yeah, I'm listening.`]
    );
  }

  if (/你是谁|叫什么|名字|who are you|your name|介绍/i.test(t)) {
    return byPersonality(
      zh
        ? [
            `我是${name}呀，就在桌面上陪着你。`,
            `嗯，我叫${name}，你的小桌宠～`,
            `${name}报到！专陪你摸鱼的那种。`,
          ]
        : [
            `I'm ${name}, your desktop buddy.`,
            `Call me ${name} — I live on your screen.`,
            `${name}, reporting for cuddle duty.`,
          ],
      zh
        ? [
            `${name}。桌宠。别问太多。`,
            `我是${name}。看名字就懂了吧。`,
            `${name}。还用介绍？`,
          ]
        : [
            `${name}. Desktop pet. Next question.`,
            `I'm ${name}. The name's the resume.`,
            `${name}. Obvious, no?`,
          ]
    );
  }

  if (/累|困|烦|难过|伤心|tired|sad|stress|忙/i.test(t)) {
    return byPersonality(
      zh
        ? [
            `辛苦啦…先喝口水，我在这儿陪你。`,
            `嗯嗯，累了就歇一小下，我等你。`,
            `抱抱。事情一件件来，好吗？`,
          ]
        : [
            `Rough day? Water first — I'm right here.`,
            `Rest a minute. I'll wait.`,
            `Hey… one thing at a time, okay?`,
          ],
      zh
        ? [`累就停一下。硬撑很蠢。`, `行了，先休息。我看着。`, `别硬刚。歇会儿。`]
        : [
            `Stop pushing. Rest.`,
            `Fine — break time. I'll watch.`,
            `Don't grind yourself down.`,
          ]
    );
  }

  if (/谢谢|thank/i.test(t)) {
    return byPersonality(
      zh
        ? [`嘿嘿，小事～`, `被你夸到啦。`, `不客气呀。`]
        : [`Anytime~`, `You're welcome!`, `Aw, thanks.`],
      zh
        ? [`嗯。`, `知道了。`, `行。`]
        : [`Mm.`, `Noted.`, `Sure.`]
    );
  }

  switch (persona.personality) {
    case "shy":
      return byPersonality(
        zh
          ? [`嗯…我听到了。`, `那、那个…我陪你想想？`, `好、好的…我在呢。`]
          : [`Mm… I heard you.`, `I-I can sit with you…`, `Okay… I'm here.`],
        zh
          ? [`……嗯。`, `知道了。`, `我听着。`]
          : [`…Okay.`, `Got it.`, `I'm listening.`]
      );
    case "cool":
      return byPersonality(
        zh
          ? [`收到。`, `嗯，继续说。`, `可以。`]
          : [`Got it.`, `Go on.`, `Alright.`],
        zh
          ? [`哼。`, `然后呢？`, `说重点。`]
          : [`Hmph.`, `And?`, `Point?`]
      );
    case "fiery":
      return byPersonality(
        zh
          ? [`哈！有意思！`, `行啊，接着说！`, `冲！我听着呢！`]
          : [`Ha! Nice!`, `Okay, keep going!`, `Let's go — I'm in!`],
        zh
          ? [`切，就这？`, `快点说！`, `行行行，我听着！`]
          : [`Tch, that all?`, `Spit it faster!`, `Fine, I'm listening!`]
      );
    default:
      return byPersonality(
        zh
          ? [`嗯嗯，我记住啦～`, `有道理！再跟我说说？`, `好呀，我陪你聊。`]
          : [
              `Got it~ tell me more?`,
              `Nice! What else?`,
              `Sure — I'm chatting with you.`,
            ],
        zh
          ? [`哦。`, `行吧。`, `继续。`]
          : [`Oh.`, `Fine.`, `Continue.`]
      );
  }
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

function mapRemoteError(err: unknown, lang: "zh" | "en"): never {
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

function requireRemoteEndpoint(
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

async function askOpenAiCompat(
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
    throw new Error(`chat http ${res.status}${body ? `: ${body.slice(0, 120)}` : ""}`);
  }

  const raw = await res.json();
  const reply = sanitizeReply(extractReply(raw));
  if (!reply) throw new Error("chat empty reply");
  return reply;
}

async function askOpenAiCompatStream(
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
    throw new Error(`chat http ${res.status}${body ? `: ${body.slice(0, 120)}` : ""}`);
  }
  if (!res.body) {
    // Fallback if runtime has no stream body
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

async function streamLocalReply(
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

/** Legacy Pollinations path removed — DeepSeek / local only. */

/**
 * Prefer configured remote AI. Local keyword replies only when provider is `local`.
 * Remote failures throw — UI shows an error bubble (no silent local fallback).
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

/** Minimal DeepSeek ping using current draft/saved config. */
export async function testPetChatConnection(
  chatAi: PetChatAiConfig | null | undefined,
  lang: "zh" | "en" = "zh",
  signal?: AbortSignal
): Promise<{ model: string; preview: string }> {
  const cfg = normalizePetChatAi(chatAi ?? DEFAULT_PET_CHAT_AI);
  const { baseUrl, model, apiKey } = requireRemoteEndpoint(cfg, lang);
  const persona: PetChatPersona = {
    petName: lang === "en" ? "Pet" : "桌宠",
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
          content: lang === "en" ? "Reply with exactly one word: ok" : "只回复一个字：好",
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
