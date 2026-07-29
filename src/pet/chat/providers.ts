/** AI chat provider presets — DeepSeek (CN) + local companion only. */

export type PetChatProviderId = "local" | "deepseek";

export interface PetChatAiConfig {
  provider: PetChatProviderId;
  /** Bearer token; empty → error for keyed providers */
  apiKey: string;
  /** Empty = provider default base URL */
  baseUrl: string;
  /** Empty = provider default model */
  model: string;
  /** User-added model ids shown in the DeepSeek dropdown */
  customModels: string[];
}

export interface PetChatProviderDef {
  id: PetChatProviderId;
  labelKey: string;
  hintKey: string;
  defaultBaseUrl: string;
  defaultModel: string;
  needsKey: boolean;
  openaiCompat: boolean;
  region: "cn" | "local";
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
  };

export const DEFAULT_PET_CHAT_AI: PetChatAiConfig = {
  provider: "local",
  apiKey: "",
  baseUrl: "",
  model: "",
  customModels: [],
};

const CUSTOM_MODEL_MAX = 30;
const CUSTOM_MODEL_LEN = 80;

export function isPetChatProviderId(v: unknown): v is PetChatProviderId {
  return v === "local" || v === "deepseek";
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

export function normalizePetChatAi(
  raw: Partial<PetChatAiConfig> | null | undefined
): PetChatAiConfig {
  let provider: PetChatProviderId = DEFAULT_PET_CHAT_AI.provider;
  if (isPetChatProviderId(raw?.provider)) {
    provider = raw.provider;
  } else if (typeof raw?.provider === "string") {
    // migrate removed providers → deepseek
    provider = "deepseek";
  }
  const model = typeof raw?.model === "string" ? raw.model.trim() : "";
  let customModels = normalizeCustomModels(raw?.customModels);
  // Keep the currently selected non-builtin model in the dropdown list
  if (model && provider !== "local") {
    customModels = addCustomChatModel(provider, customModels, model);
  }
  return {
    provider,
    apiKey: typeof raw?.apiKey === "string" ? raw.apiKey.trim() : "",
    baseUrl: typeof raw?.baseUrl === "string" ? raw.baseUrl.trim() : "",
    model,
    customModels,
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
