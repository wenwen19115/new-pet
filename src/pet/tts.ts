import { invoke } from "@tauri-apps/api/core";
import type { PetPersonality } from "./personality";
import type { PetModelKind } from "./skins/types";
import { getPetLocale } from "./locale";

export interface PetTtsOptions {
  model: PetModelKind;
  personality: PetPersonality;
  lang?: "zh" | "en";
  /** Edge ShortName（如 zh-CN-XiaoxiaoNeural）；空=按角色自动 */
  voiceUri?: string;
}

export interface PetTtsVoiceOption {
  uri: string;
  name: string;
  lang: string;
}

interface EdgeVoiceInfo {
  shortName: string;
  friendlyName: string;
  locale: string;
  gender: string;
}

interface EdgeTtsAudio {
  mime: string;
  base64: string;
}

const EDGE_DEFAULT: Record<PetModelKind, { zh: string; en: string }> = {
  chip: { zh: "zh-CN-YunxiNeural", en: "en-US-GuyNeural" },
  "fig-sci": { zh: "zh-CN-XiaoxiaoNeural", en: "en-US-JennyNeural" },
  toon: { zh: "zh-CN-XiaoyiNeural", en: "en-US-AnaNeural" },
  vrm: { zh: "zh-CN-YunjianNeural", en: "en-US-AriaNeural" },
};

let edgeVoiceCache: PetTtsVoiceOption[] | null = null;
let playToken = 0;
let activeAudio: HTMLAudioElement | null = null;

function sanitizeForTts(text: string): string {
  return text
    .replace(/[～~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function edgeProsody(personality: PetPersonality): { rate: number; pitch: number } {
  switch (personality) {
    case "sunny":
      return { rate: 4, pitch: 2 };
    case "shy":
      return { rate: -8, pitch: 1 };
    case "cool":
      return { rate: -6, pitch: -4 };
    case "fiery":
      return { rate: 10, pitch: 4 };
  }
}

function resolveEdgeVoice(
  model: PetModelKind,
  lang: "zh" | "en",
  voiceUri?: string
): string {
  if (voiceUri?.trim()) return voiceUri.trim();
  return EDGE_DEFAULT[model]?.[lang] ?? EDGE_DEFAULT.vrm[lang];
}

function stopAudioElement() {
  if (!activeAudio) return;
  try {
    activeAudio.pause();
    activeAudio.src = "";
  } catch {
    // ignore
  }
  activeAudio = null;
}

export function cancelPetTts(): void {
  playToken += 1;
  stopAudioElement();
}

export async function listPetTtsVoices(
  lang?: "zh" | "en"
): Promise<PetTtsVoiceOption[]> {
  const prefer = lang ?? getPetLocale();
  const matchLang = (v: PetTtsVoiceOption) =>
    prefer === "zh"
      ? v.lang.toLowerCase().startsWith("zh")
      : v.lang.toLowerCase().startsWith("en");

  if (edgeVoiceCache) return edgeVoiceCache.filter(matchLang);

  try {
    const prefix = prefer === "zh" ? "zh" : "en";
    const list = await invoke<EdgeVoiceInfo[]>("list_edge_tts_voices", {
      localePrefix: prefix,
    });
    edgeVoiceCache = list.map((v) => ({
      uri: v.shortName,
      name: v.friendlyName || v.shortName,
      lang: v.locale || prefix,
    }));
    return edgeVoiceCache.filter(matchLang);
  } catch (err) {
    console.warn("[pet] edge voice list failed", err);
    return [];
  }
}

/** Free Edge neural TTS (requires network). */
export async function speakPetTts(
  text: string,
  opts: PetTtsOptions
): Promise<void> {
  const cleaned = sanitizeForTts(text);
  if (!cleaned) return;

  const lang = opts.lang ?? getPetLocale();
  cancelPetTts();
  const token = playToken;

  const voice = resolveEdgeVoice(opts.model, lang, opts.voiceUri);
  const { rate, pitch } = edgeProsody(opts.personality);
  try {
    const audio = await invoke<EdgeTtsAudio>("synthesize_edge_tts", {
      text: cleaned,
      voice,
      rate,
      pitch,
    });
    if (token !== playToken) return;
    stopAudioElement();
    const el = new Audio(`data:${audio.mime};base64,${audio.base64}`);
    activeAudio = el;
    el.onended = () => {
      if (activeAudio === el) activeAudio = null;
    };
    await el.play();
  } catch (err) {
    console.warn("[pet] edge tts failed", err);
  }
}
