export type PetChatProviderId = "local" | "deepseek" | "xiaozhi";

export interface PetChatAiConfig {
  provider: PetChatProviderId;
  /** Bearer token; empty → error for keyed providers / 小智 WS token */
  apiKey: string;
  /** DeepSeek: API base；小智：WS URL（OTA 绑定后写入） */
  baseUrl: string;
  /** Empty = provider default model */
  model: string;
  /** User-added model ids shown in the DeepSeek dropdown */
  customModels: string[];
  /** 小智 Device-Id（MAC 形态）；空则 normalize 时生成并应写回 */
  deviceId: string;
  /** 小智 Client-Id（UUID）；空则 normalize 时生成 */
  clientId: string;
  /** 小智 OTA 地址；空 = 官方默认 */
  otaUrl: string;
}

export interface PetChatProviderDef {
  id: PetChatProviderId;
  labelKey: string;
  hintKey: string;
  defaultBaseUrl: string;
  defaultModel: string;
  needsKey: boolean;
  openaiCompat: boolean;
  region: "cn" | "local" | "voice";
  models: Array<{ value: string; labelKey: string }>;
}

export const PET_CHAT_PROVIDERS: Record<PetChatProviderId, PetChatProviderDef> =
  {
    local: {
      id: "local",
      labelKey: "pet.chatProviderLocal",
      hintKey: "pet.chatProviderLocalHint",
      defaultBaseUrl: "",
      defaultModel: "",
      needsKey: false,
      openaiCompat: false,
      region: "local",
      models: [],
    },
    deepseek: {
      id: "deepseek",
      labelKey: "pet.chatProviderDeepseek",
      hintKey: "pet.chatProviderDeepseekHint",
      defaultBaseUrl: "https://api.deepseek.com",
      defaultModel: "deepseek-v4-flash",
      needsKey: true,
      openaiCompat: true,
      region: "cn",
      models: [
        { value: "deepseek-v4-flash", labelKey: "pet.chatModelDsV4Flash" },
        { value: "deepseek-v4-pro", labelKey: "pet.chatModelDsV4Pro" },
      ],
    },
    xiaozhi: {
      id: "xiaozhi",
      labelKey: "pet.chatProviderXiaozhi",
      hintKey: "pet.chatProviderXiaozhiHint",
      defaultBaseUrl: "",
      defaultModel: "",
      needsKey: false,
      openaiCompat: false,
      region: "voice",
      models: [],
    },
  };

export const DEFAULT_XIAOZHI_OTA_URL = "https://api.tenclass.net/xiaozhi/ota/";

export const DEFAULT_PET_CHAT_AI: PetChatAiConfig = {
  provider: "local",
  apiKey: "",
  baseUrl: "",
  model: "",
  customModels: [],
  deviceId: "",
  clientId: "",
  otaUrl: "",
};

const CUSTOM_MODEL_MAX = 30;
const CUSTOM_MODEL_LEN = 80;
const ID_LEN = 64;

export function isPetChatProviderId(v: unknown): v is PetChatProviderId {
  return v === "local" || v === "deepseek" || v === "xiaozhi";
}

export function isXiaozhiChatProvider(
  provider: PetChatProviderId
): provider is "xiaozhi" {
  return provider === "xiaozhi";
}

export function builtinChatModelIds(provider: PetChatProviderId): string[] {
  return PET_CHAT_PROVIDERS[provider].models.map((m) => m.value);
}

export function normalizeCustomModels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (typeof row !== "string") continue;
    const id = row.trim().slice(0, CUSTOM_MODEL_LEN);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= CUSTOM_MODEL_MAX) break;
  }
  return out;
}

/** Merge builtin + user extras (extras that duplicate builtin are dropped). */
export function mergeChatModelIds(
  provider: PetChatProviderId,
  customModels: string[]
): string[] {
  const builtin = builtinChatModelIds(provider);
  const builtinSet = new Set(builtin);
  const extras = normalizeCustomModels(customModels).filter(
    (id) => !builtinSet.has(id)
  );
  return [...builtin, ...extras];
}

/** Add a model id to the custom list (no-op if empty / builtin / duplicate). */
export function addCustomChatModel(
  provider: PetChatProviderId,
  customModels: string[],
  modelId: string
): string[] {
  const id = modelId.trim().slice(0, CUSTOM_MODEL_LEN);
  if (!id) return normalizeCustomModels(customModels);
  if (provider === "local" || provider === "xiaozhi") {
    return normalizeCustomModels(customModels);
  }
  if (builtinChatModelIds(provider).includes(id)) {
    return normalizeCustomModels(customModels);
  }
  return normalizeCustomModels([...customModels, id]);
}

export function removeCustomChatModel(
  customModels: string[],
  modelId: string
): string[] {
  const id = modelId.trim();
  return normalizeCustomModels(customModels).filter((m) => m !== id);
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = (Math.random() * 256) | 0;
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** 小智 Device-Id：假 MAC，稳定落盘后复用 */
function generateXiaozhiDeviceId(): string {
  const h = randomHex(6);
  return `${h.slice(0, 2)}:${h.slice(2, 4)}:${h.slice(4, 6)}:${h.slice(6, 8)}:${h.slice(8, 10)}:${h.slice(10, 12)}`;
}

function generateXiaozhiClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const h = randomHex(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function normalizeIdField(raw: unknown, max = ID_LEN): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, max);
}

const XIAOZHI_IDS_CACHE_KEY = "new-pet-xiaozhi-ids";

function ensureXiaozhiIds(raw: Partial<PetChatAiConfig> | null | undefined): {
  deviceId: string;
  clientId: string;
} {
  let deviceId = normalizeIdField(raw?.deviceId);
  let clientId = normalizeIdField(raw?.clientId);
  if (deviceId && clientId) return { deviceId, clientId };
  try {
    const cached = JSON.parse(
      localStorage.getItem(XIAOZHI_IDS_CACHE_KEY) || "{}"
    ) as { deviceId?: unknown; clientId?: unknown };
    if (!deviceId) deviceId = normalizeIdField(cached.deviceId);
    if (!clientId) clientId = normalizeIdField(cached.clientId);
  } catch {
    /* ignore */
  }
  if (!deviceId) deviceId = generateXiaozhiDeviceId();
  if (!clientId) clientId = generateXiaozhiClientId();
  try {
    localStorage.setItem(
      XIAOZHI_IDS_CACHE_KEY,
      JSON.stringify({ deviceId, clientId })
    );
  } catch {
    /* ignore */
  }
  return { deviceId, clientId };
}

export function normalizePetChatAi(
  raw: Partial<PetChatAiConfig> | null | undefined
): PetChatAiConfig {
  const provider: PetChatProviderId = isPetChatProviderId(raw?.provider)
    ? raw.provider
    : DEFAULT_PET_CHAT_AI.provider;
  const model =
    provider === "xiaozhi" || provider === "local"
      ? ""
      : typeof raw?.model === "string"
        ? raw.model.trim()
        : "";
  let customModels =
    provider === "xiaozhi" || provider === "local"
      ? []
      : normalizeCustomModels(raw?.customModels);
  if (model && provider === "deepseek") {
    customModels = addCustomChatModel(provider, customModels, model);
  }

  const { deviceId, clientId } = ensureXiaozhiIds(raw);

  return {
    provider,
    apiKey: typeof raw?.apiKey === "string" ? raw.apiKey.trim() : "",
    baseUrl: typeof raw?.baseUrl === "string" ? raw.baseUrl.trim() : "",
    model,
    customModels,
    deviceId,
    clientId,
    otaUrl: typeof raw?.otaUrl === "string" ? raw.otaUrl.trim() : "",
  };
}

export function resolveChatEndpoint(cfg: PetChatAiConfig): {
  provider: PetChatProviderDef;
  baseUrl: string;
  model: string;
  apiKey: string;
} {
  const provider = PET_CHAT_PROVIDERS[cfg.provider];
  const baseUrl = (cfg.baseUrl || provider.defaultBaseUrl).replace(/\/+$/, "");
  const model = cfg.model || provider.defaultModel;
  return { provider, baseUrl, model, apiKey: cfg.apiKey };
}

/** 小智 OTA；空则官方默认 */
export function resolveXiaozhiOtaUrl(cfg: PetChatAiConfig): string {
  const normalized = normalizePetChatAi(cfg);
  const raw = (normalized.otaUrl || DEFAULT_XIAOZHI_OTA_URL).trim();
  return raw.endsWith("/") ? raw : `${raw}/`;
}

/** 已拿到 WS + Token（控制台绑定完成） */
export function isXiaozhiBound(cfg: PetChatAiConfig): boolean {
  const ep = resolveXiaozhiEndpoint(cfg);
  return Boolean(
    ep.wsUrl &&
      (ep.wsUrl.startsWith("ws://") || ep.wsUrl.startsWith("wss://")) &&
      ep.token
  );
}

/**
 * 小智 WS URL：保留/补齐尾斜杠。
 * 官方路径形如 …/xiaozhi/v1/；无 / 时 nginx 常 301，tungstenite 不跟重定向。
 */
export function normalizeXiaozhiWsUrl(raw: string): string {
  const u = raw.trim();
  if (!u) return "";
  if (u.endsWith("/")) return u;
  const pathStart = u.search(/:\/\/[^/]+\//);
  if (pathStart >= 0) return `${u}/`;
  return u;
}

/** 小智 WS 连接参数；缺 URL/Token 时抛错文案由调用方包 */
export function resolveXiaozhiEndpoint(cfg: PetChatAiConfig): {
  wsUrl: string;
  token: string;
  deviceId: string;
  clientId: string;
} {
  const normalized = normalizePetChatAi(cfg);
  return {
    wsUrl: normalizeXiaozhiWsUrl(normalized.baseUrl),
    token: normalized.apiKey,
    deviceId: normalized.deviceId,
    clientId: normalized.clientId,
  };
}
