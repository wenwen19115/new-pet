import { xiaozhiOtaCheck } from "@/pet/bridge/xiaozhi";
import {
  isXiaozhiBound,
  normalizePetChatAi,
  resolveXiaozhiOtaUrl,
  type PetChatAiConfig,
} from "@/pet/chat/providers";

export type XiaozhiOtaParsed =
  | {
      kind: "need_bind";
      code: string;
      message: string;
    }
  | {
      kind: "ready";
      wsUrl: string;
      token: string;
    }
  | {
      kind: "unknown";
      raw: string;
    };

export function parseXiaozhiOtaBody(body: string): XiaozhiOtaParsed {
  let obj: unknown;
  try {
    obj = JSON.parse(body);
  } catch {
    return { kind: "unknown", raw: body };
  }
  if (!obj || typeof obj !== "object") return { kind: "unknown", raw: body };
  const root = obj as Record<string, unknown>;

  const activation = root.activation;
  if (activation && typeof activation === "object") {
    const a = activation as Record<string, unknown>;
    const code = typeof a.code === "string" ? a.code.trim() : "";
    const message = typeof a.message === "string" ? a.message.trim() : "";
    if (code) {
      return { kind: "need_bind", code, message };
    }
  }

  const websocket = root.websocket;
  if (websocket && typeof websocket === "object") {
    const w = websocket as Record<string, unknown>;
    const wsUrl = typeof w.url === "string" ? w.url.trim() : "";
    const token = typeof w.token === "string" ? w.token.trim() : "";
    if (
      wsUrl &&
      (wsUrl.startsWith("ws://") || wsUrl.startsWith("wss://")) &&
      token
    ) {
      return { kind: "ready", wsUrl, token };
    }
  }

  return { kind: "unknown", raw: body };
}

export async function fetchXiaozhiOta(
  chatAi: PetChatAiConfig,
  lang: "zh" | "en" = "zh"
): Promise<XiaozhiOtaParsed> {
  const cfg = normalizePetChatAi(chatAi);
  const res = await xiaozhiOtaCheck({
    otaUrl: resolveXiaozhiOtaUrl(cfg),
    deviceId: cfg.deviceId,
    clientId: cfg.clientId,
    lang,
  });
  return parseXiaozhiOtaBody(res.body);
}

export type XiaozhiBindProgress = {
  code?: string;
  message?: string;
  attempt: number;
};

/**
 * OTA 检查；若需绑定则轮询直到拿到 websocket，或 signal abort。
 * 成功返回写入了 baseUrl/apiKey 的新配置（其余字段保留）。
 */
export async function waitXiaozhiBound(
  chatAi: PetChatAiConfig,
  options?: {
    lang?: "zh" | "en";
    signal?: AbortSignal;
    /** 轮询间隔 ms，默认 5s */
    intervalMs?: number;
    /** 最多轮询次数，默认 60（约 5 分钟） */
    maxAttempts?: number;
    onProgress?: (p: XiaozhiBindProgress) => void;
  }
): Promise<PetChatAiConfig> {
  const lang = options?.lang ?? "zh";
  const intervalMs = options?.intervalMs ?? 5000;
  const maxAttempts = options?.maxAttempts ?? 60;
  const signal = options?.signal;
  let cfg = normalizePetChatAi(chatAi);
  let lastCode = "";
  let lastMessage = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const parsed = await fetchXiaozhiOta(cfg, lang);
    if (parsed.kind === "ready") {
      return normalizePetChatAi({
        ...cfg,
        baseUrl: parsed.wsUrl,
        apiKey: parsed.token,
      });
    }
    if (parsed.kind === "need_bind") {
      lastCode = parsed.code;
      lastMessage = parsed.message;
      options?.onProgress?.({
        code: lastCode,
        message: lastMessage,
        attempt,
      });
    } else {
      options?.onProgress?.({
        code: lastCode || undefined,
        message: lastMessage || undefined,
        attempt,
      });
      // 已绑定但响应异常：若本地已有凭证可放行
      if (isXiaozhiBound(cfg) && attempt > 1) {
        return cfg;
      }
      if (attempt === 1) {
        throw new Error(
          lang === "en"
            ? "Unexpected OTA response. Check OTA URL / network."
            : "OTA 返回异常。请检查 OTA 地址或网络。"
        );
      }
    }

    await sleep(intervalMs, signal);
  }

  throw new Error(
    lang === "en"
      ? `Still waiting for bind (code ${lastCode || "—"}). Open Xiaozhi console and add this device.`
      : `仍在等待绑定（验证码 ${lastCode || "—"}）。请到小智控制台添加设备并输入验证码。`
  );
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
