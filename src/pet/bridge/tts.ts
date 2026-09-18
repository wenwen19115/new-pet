import { invoke } from "@tauri-apps/api/core";
import type { PetPersonality } from "../content/dialogue/personality";
import type { PetModelKind } from "@/pet/skins/types";
import type { PetTone } from "../data/types";
import { getPetLocale } from "./locale";

export interface PetTtsOptions {
  model: PetModelKind;
  personality: PetPersonality;
  tone?: PetTone;
  lang?: "zh" | "en";
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
  vrm: { zh: "zh-CN-XiaoxiaoNeural", en: "en-US-AriaNeural" },
  "mug-cat": { zh: "zh-CN-XiaoxiaoNeural", en: "en-US-JennyNeural" },
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

function edgeProsody(
  personality: PetPersonality,
  tone?: PetTone
): { rate: number; pitch: number } {
  let rate = 0;
  let pitch = 0;
  switch (personality) {
    case "sunny":
      rate = 4;
      pitch = 2;
      break;
    case "shy":
      rate = -8;
      pitch = 1;
      break;
    case "cool":
      rate = -6;
      pitch = -4;
      break;
    case "fiery":
      rate = 10;
      pitch = 4;
      break;
  }
  if (tone === "snarky") {
    rate -= 2;
    pitch -= 2;
  } else if (tone === "cute") {
    pitch += 1;
  }
  return { rate, pitch };
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

/** 停播并丢掉音色列表缓存（下次 list 再拉） */
export function clearPetTtsCache(): {
  voices: number;
  stopped: boolean;
} {
  const stopped = activeAudio != null;
  const voices = edgeVoiceCache?.length ?? 0;
  cancelPetTts();
  edgeVoiceCache = null;
  return { voices, stopped };
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

/** Edge 神经网络 TTS（需联网）。 */
export async function speakPetTts(
  text: string,
  opts: PetTtsOptions
): Promise<number> {
  const cleaned = sanitizeForTts(text);
  if (!cleaned) return 0;

  const lang = opts.lang ?? getPetLocale();
  cancelPetTts();
  const token = playToken;

  const voice = resolveEdgeVoice(opts.model, lang, opts.voiceUri);
  const { rate, pitch } = edgeProsody(opts.personality, opts.tone);
  try {
    const audio = await invoke<EdgeTtsAudio>("synthesize_edge_tts", {
      text: cleaned,
      voice,
      rate,
      pitch,
    });
    if (token !== playToken) return 0;
    stopAudioElement();
    const el = new Audio(`data:${audio.mime};base64,${audio.base64}`);
    activeAudio = el;

    const durationMs = await new Promise<number>((resolve) => {
      let settled = false;
      const finish = (ms: number) => {
        if (settled) return;
        settled = true;
        resolve(ms);
      };
      el.onloadedmetadata = () => {
        const d = el.duration;
        finish(Number.isFinite(d) && d > 0 ? d * 1000 : 0);
      };
      el.onerror = () => finish(0);
      window.setTimeout(() => finish(0), 2500);
    });

    if (token !== playToken) {
      stopAudioElement();
      return 0;
    }

    el.onended = () => {
      if (activeAudio === el) activeAudio = null;
    };
    try {
      await el.play();
    } catch (err) {
      console.warn("[pet] tts play failed", err);
      if (activeAudio === el) activeAudio = null;
      return 0;
    }
    return durationMs > 0 ? durationMs : Math.max(1200, cleaned.length * 90);
  } catch (err) {
    console.warn("[pet] edge tts failed", err);
    return 0;
  }
}
