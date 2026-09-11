import { describe, expect, it } from "vitest";
import {
  normalizePetChatAi,
  isPetChatProviderId,
  isXiaozhiBound,
  isXiaozhiChatProvider,
  resolveXiaozhiEndpoint,
} from "@/pet/chat/providers";
import {
  buildClientHello,
  isServerHelloOk,
  mapXiaozhiEmotionToMood,
  mapXiaozhiEmotionToMotion,
  parseServerMessage,
} from "@/pet/chat/xiaozhi/protocol";
import { parseXiaozhiOtaBody } from "@/pet/chat/xiaozhi/ota";

describe("xiaozhi provider normalize", () => {
  it("accepts xiaozhi provider id", () => {
    expect(isPetChatProviderId("xiaozhi")).toBe(true);
    expect(isXiaozhiChatProvider("xiaozhi")).toBe(true);
    expect(isXiaozhiChatProvider("deepseek")).toBe(false);
  });

  it("fills deviceId/clientId and clears model for xiaozhi", () => {
    const a = normalizePetChatAi({
      provider: "xiaozhi",
      apiKey: " tok ",
      baseUrl: "wss://example/ws/",
      model: "should-drop",
      customModels: ["x"],
      otaUrl: " https://ota.example/ ",
    });
    expect(a.provider).toBe("xiaozhi");
    expect(a.apiKey).toBe("tok");
    expect(a.baseUrl).toBe("wss://example/ws/");
    expect(a.otaUrl).toBe("https://ota.example/");
    expect(a.model).toBe("");
    expect(a.customModels).toEqual([]);
    expect(a.deviceId.length).toBeGreaterThan(0);
    expect(a.clientId.length).toBeGreaterThan(0);
    expect(isXiaozhiBound(a)).toBe(true);
    expect(resolveXiaozhiEndpoint(a).wsUrl).toBe("wss://example/ws/");

    const stripped = normalizePetChatAi({
      ...a,
      baseUrl: "wss://api.tenclass.net/xiaozhi/v1",
    });
    expect(resolveXiaozhiEndpoint(stripped).wsUrl).toBe(
      "wss://api.tenclass.net/xiaozhi/v1/"
    );

    const b = normalizePetChatAi({
      provider: "xiaozhi",
      deviceId: a.deviceId,
      clientId: a.clientId,
    });
    expect(b.deviceId).toBe(a.deviceId);
    expect(b.clientId).toBe(a.clientId);
    expect(isXiaozhiBound(b)).toBe(false);
  });
});

describe("xiaozhi ota parse", () => {
  it("parses activation code", () => {
    const p = parseXiaozhiOtaBody(
      JSON.stringify({
        activation: { code: "123456", message: "请登录控制台添加设备" },
      })
    );
    expect(p).toEqual({
      kind: "need_bind",
      code: "123456",
      message: "请登录控制台添加设备",
    });
  });

  it("parses websocket credentials", () => {
    const p = parseXiaozhiOtaBody(
      JSON.stringify({
        websocket: { url: "wss://x/ws", token: "abc" },
      })
    );
    expect(p).toEqual({
      kind: "ready",
      wsUrl: "wss://x/ws",
      token: "abc",
    });
  });
});

describe("xiaozhi protocol", () => {
  it("builds hello without mcp", () => {
    const hello = buildClientHello();
    expect(hello.type).toBe("hello");
    expect(hello.transport).toBe("websocket");
    expect(hello.features?.mcp).toBe(false);
    expect(hello.audio_params.sample_rate).toBe(16000);
    expect(hello.audio_params.frame_duration).toBe(60);
  });

  it("parses server messages and hello ok", () => {
    expect(parseServerMessage("not-json")).toBeNull();
    expect(parseServerMessage("{}")).toBeNull();
    const hello = parseServerMessage(
      JSON.stringify({ type: "hello", transport: "websocket", session_id: "s1" })
    );
    expect(hello && isServerHelloOk(hello)).toBe(true);
    const stt = parseServerMessage(JSON.stringify({ type: "stt", text: "你好" }));
    expect(stt?.type).toBe("stt");
  });

  it("maps all 21 emotions to mood + motion", () => {
    const moods = new Set(
      [
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
      ].map((e) => mapXiaozhiEmotionToMood(e))
    );
    expect(moods.size).toBeGreaterThanOrEqual(4);
    expect(mapXiaozhiEmotionToMotion("angry")).toBe("tap-frenzy");
    expect(mapXiaozhiEmotionToMotion("thinking")).toBe("toon-read");
    expect(mapXiaozhiEmotionToMotion("smile")).toBe("happy-bounce");
    expect(mapXiaozhiEmotionToMood("smile")).toBe("happy");
  });
});

describe("xiaozhi prefs", () => {
  it("normalizes shared prefs and clear bind", async () => {
    const {
      normalizeXiaozhiPrefs,
      isXiaozhiPrefsBound,
      clearXiaozhiBind,
    } = await import("@/pet/chat/xiaozhi/prefs");
    const p = normalizeXiaozhiPrefs({
      wsUrl: "wss://x/ws",
      token: "tok",
      voicePlayback: false,
      clickToggleListen: true,
      hotkey: "Ctrl+Shift+Z",
      talkBarHideSec: 8,
    });
    expect(isXiaozhiPrefsBound(p)).toBe(true);
    expect(p.voicePlayback).toBe(false);
    expect(p.clickToggleListen).toBe(true);
    expect(p.hotkey).toBe("Ctrl+Shift+Z");
    expect(p.talkBarHideSec).toBe(8);
    expect(isXiaozhiPrefsBound(clearXiaozhiBind(p))).toBe(false);
  });

  it("clamps talkBarHideSec", async () => {
    const {
      normalizeXiaozhiTalkBarHideSec,
      DEFAULT_XIAOZHI_TALK_BAR_HIDE_SEC,
      XIAOZHI_TALK_BAR_HIDE_SEC_MAX,
    } = await import("@/pet/chat/xiaozhi/prefs");
    expect(normalizeXiaozhiTalkBarHideSec(undefined)).toBe(
      DEFAULT_XIAOZHI_TALK_BAR_HIDE_SEC
    );
    expect(normalizeXiaozhiTalkBarHideSec(-3)).toBe(0);
    expect(normalizeXiaozhiTalkBarHideSec(9999)).toBe(
      XIAOZHI_TALK_BAR_HIDE_SEC_MAX
    );
  });
});

describe("xiaozhi talk busy phase", () => {
  it("marks listening/speaking/connecting as busy", async () => {
    const { isXiaozhiTalkBusyPhase } = await import(
      "@/pet/runtime/useXiaozhiPetVoice"
    );
    expect(isXiaozhiTalkBusyPhase("listening")).toBe(true);
    expect(isXiaozhiTalkBusyPhase("speaking")).toBe(true);
    expect(isXiaozhiTalkBusyPhase("connecting")).toBe(true);
    expect(isXiaozhiTalkBusyPhase("idle")).toBe(false);
    expect(isXiaozhiTalkBusyPhase("ready")).toBe(false);
    expect(isXiaozhiTalkBusyPhase("binding")).toBe(false);
  });
});
