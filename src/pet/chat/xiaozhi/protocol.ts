import type { PetMood } from "@/pet/data/types";
import type { PetIdleMotion } from "@/pet/content/motion/motions";

export type XiaozhiListenMode = "manual" | "auto" | "realtime";

export interface XiaozhiHelloOut {
  type: "hello";
  version: 1;
  transport: "websocket";
  features?: { mcp?: boolean; aec?: boolean };
  audio_params: {
    format: "opus";
    sample_rate: number;
    channels: number;
    frame_duration: number;
  };
}

export interface XiaozhiListenOut {
  type: "listen";
  session_id?: string;
  state: "start" | "stop" | "detect";
  mode?: XiaozhiListenMode;
  text?: string;
}

export interface XiaozhiAbortOut {
  type: "abort";
  session_id?: string;
  reason?: string;
}

export type XiaozhiClientMessage =
  | XiaozhiHelloOut
  | XiaozhiListenOut
  | XiaozhiAbortOut;

export type XiaozhiServerMessage =
  | { type: "hello"; transport?: string; session_id?: string }
  | { type: "stt"; text?: string; session_id?: string }
  | { type: "tts"; state?: string; text?: string; session_id?: string }
  | { type: "llm"; emotion?: string; text?: string; session_id?: string }
  | { type: string; [k: string]: unknown };

export const XIAOZHI_SAMPLE_RATE = 16000;
export const XIAOZHI_CHANNELS = 1;
export const XIAOZHI_FRAME_DURATION_MS = 60;
/** 60ms @ 16kHz mono */
export const XIAOZHI_FRAME_SAMPLES =
  (XIAOZHI_SAMPLE_RATE * XIAOZHI_FRAME_DURATION_MS) / 1000;

/** 官方 21 表情（文档表）+ smile 别名 */
export const XIAOZHI_EMOTIONS = [
  "neutral",
  "happy",
  "laughing",
  "funny",
  "sad",
  "angry",
  "crying",
  "loving",
  "embarrassed",
  "surprised",
  "shocked",
  "thinking",
  "winking",
  "cool",
  "relaxed",
  "delicious",
  "kissy",
  "confident",
  "sleepy",
  "silly",
  "confused",
] as const;

export type XiaozhiEmotion = (typeof XIAOZHI_EMOTIONS)[number];

export function buildClientHello(): XiaozhiHelloOut {
  return {
    type: "hello",
    version: 1,
    transport: "websocket",
    features: { mcp: false, aec: false },
    audio_params: {
      format: "opus",
      sample_rate: XIAOZHI_SAMPLE_RATE,
      channels: XIAOZHI_CHANNELS,
      frame_duration: XIAOZHI_FRAME_DURATION_MS,
    },
  };
}

export function parseServerMessage(raw: string): XiaozhiServerMessage | null {
  try {
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== "object") return null;
    const type = (obj as { type?: unknown }).type;
    if (typeof type !== "string" || !type) return null;
    return obj as XiaozhiServerMessage;
  } catch {
    return null;
  }
}

function normalizeEmotionKey(emotion: string | null | undefined): string {
  const key = (emotion ?? "").trim().toLowerCase();
  // 文档示例用 smile，表里是 happy
  if (key === "smile") return "happy";
  return key;
}

/** 小智 emotion → PetMood */
export function mapXiaozhiEmotionToMood(
  emotion: string | null | undefined
): PetMood {
  switch (normalizeEmotionKey(emotion)) {
    case "happy":
    case "laughing":
    case "funny":
    case "loving":
    case "winking":
    case "kissy":
    case "delicious":
    case "silly":
      return "happy";
    case "angry":
    case "sad":
    case "crying":
      return "grumpy";
    case "surprised":
    case "shocked":
    case "confident":
    case "cool":
      return "excited";
    case "thinking":
    case "confused":
    case "embarrassed":
    case "neutral":
    case "relaxed":
      return "curious";
    case "sleepy":
      return "idle";
    default:
      return "happy";
  }
}

/**
 * 小智 emotion → 跨角色可 remap 的动作意图。
 * VRM 侧在 remapVrmMotion 里落到 emotion 片。
 */
export function mapXiaozhiEmotionToMotion(
  emotion: string | null | undefined
): PetIdleMotion {
  switch (normalizeEmotionKey(emotion)) {
    case "neutral":
      return "sway-step";
    case "happy":
      return "happy-bounce";
    case "laughing":
      return "victory-burst";
    case "funny":
      return "happy-bounce";
    case "sad":
      return "bow-nod";
    case "angry":
      return "tap-frenzy";
    case "crying":
      return "bow-nod";
    case "loving":
      return "sway-step";
    case "embarrassed":
      return "tip-toe";
    case "surprised":
      return "stretch-up";
    case "shocked":
      return "rocket-jump";
    case "thinking":
      return "toon-read";
    case "winking":
      return "toon-wave";
    case "cool":
      return "stretch-up";
    case "relaxed":
      return "sway-step";
    case "delicious":
      return "toon-tea";
    case "kissy":
      return "bow-nod";
    case "confident":
      return "stretch-up";
    case "sleepy":
      return "bow-nod";
    case "silly":
      return "cartwheel";
    case "confused":
      return "toon-tilt";
    default:
      return "happy-bounce";
  }
}

export function isServerHelloOk(msg: XiaozhiServerMessage): boolean {
  if (msg.type !== "hello") return false;
  const transport = (msg as { transport?: string }).transport;
  return !transport || transport === "websocket";
}
