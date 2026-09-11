import type { UnlistenFn } from "@tauri-apps/api/event";
import {
  listenXiaozhiWsClosed,
  listenXiaozhiWsError,
  listenXiaozhiWsMessage,
  xiaozhiWsClose,
  xiaozhiWsConnect,
  xiaozhiWsSendText,
} from "@/pet/bridge/xiaozhi";
import {
  isXiaozhiBound,
  normalizePetChatAi,
  resolveXiaozhiEndpoint,
  type PetChatAiConfig,
} from "@/pet/chat/providers";
import type { PetMood } from "@/pet/data/types";
import { startXiaozhiMic, type XiaozhiMicHandle } from "./micOpus";
import {
  buildClientHello,
  isServerHelloOk,
  mapXiaozhiEmotionToMood,
  parseServerMessage,
} from "./protocol";

export type XiaozhiSessionPhase =
  | "idle"
  | "connecting"
  | "ready"
  | "listening"
  | "speaking"
  | "error";

type XiaozhiSessionHooks = {
  onPhase?: (phase: XiaozhiSessionPhase) => void;
  onUserStt?: (text: string) => void;
  onAssistantSentence?: (text: string) => void;
  onEmotion?: (mood: PetMood, emotion: string) => void;
  onError?: (message: string) => void;
  /** 下行 Opus 原始包；调用方解码播放 */
  onAudioPacket?: (bytes: Uint8Array) => void;
  /** 服务端 tts stop：回答播完 */
  onSpeakingEnd?: () => void;
};

const HELLO_TIMEOUT_MS = 10_000;

export class XiaozhiSession {
  private phase: XiaozhiSessionPhase = "idle";
  private sessionId = "";
  private unlistenMsg: UnlistenFn | null = null;
  private unlistenClosed: UnlistenFn | null = null;
  private unlistenErr: UnlistenFn | null = null;
  private mic: XiaozhiMicHandle | null = null;
  private helloWait: {
    resolve: () => void;
    reject: (err: Error) => void;
    timer: number;
  } | null = null;
  private disposed = false;

  constructor(private hooks: XiaozhiSessionHooks = {}) {}

  getPhase() {
    return this.phase;
  }

  private setPhase(next: XiaozhiSessionPhase) {
    this.phase = next;
    this.hooks.onPhase?.(next);
  }

  private async ensureListeners() {
    if (this.unlistenMsg) return;
    this.unlistenMsg = await listenXiaozhiWsMessage((payload) => {
      if (payload.kind === "binary") {
        try {
          const bin = Uint8Array.from(atob(payload.data), (c) =>
            c.charCodeAt(0)
          );
          this.hooks.onAudioPacket?.(bin);
        } catch (err) {
          console.warn("[pet] xiaozhi binary frame decode failed", err);
        }
        return;
      }
      this.onTextFrame(payload.data);
    });
    this.unlistenClosed = await listenXiaozhiWsClosed(() => {
      this.failHello(new Error("xiaozhi ws closed before hello"));
      void this.stopMic();
      if (!this.disposed) this.setPhase("idle");
    });
    this.unlistenErr = await listenXiaozhiWsError((payload) => {
      const msg = payload.message || "xiaozhi ws error";
      this.failHello(new Error(msg));
      this.hooks.onError?.(msg);
      this.setPhase("error");
    });
  }

  private failHello(err: Error) {
    if (!this.helloWait) return;
    window.clearTimeout(this.helloWait.timer);
    this.helloWait.reject(err);
    this.helloWait = null;
  }

  private resolveHello() {
    if (!this.helloWait) return;
    window.clearTimeout(this.helloWait.timer);
    this.helloWait.resolve();
    this.helloWait = null;
  }

  private onTextFrame(raw: string) {
    const msg = parseServerMessage(raw);
    if (!msg) return;

    if (msg.type === "hello" && isServerHelloOk(msg)) {
      const sid = (msg as { session_id?: string }).session_id;
      if (typeof sid === "string" && sid) this.sessionId = sid;
      this.resolveHello();
      return;
    }

    if (msg.type === "stt") {
      const text = typeof msg.text === "string" ? msg.text.trim() : "";
      if (text) this.hooks.onUserStt?.(text);
      return;
    }

    if (msg.type === "llm") {
      const emotion =
        typeof (msg as { emotion?: string }).emotion === "string"
          ? (msg as { emotion: string }).emotion
          : "";
      this.hooks.onEmotion?.(mapXiaozhiEmotionToMood(emotion), emotion);
      return;
    }

    if (msg.type === "tts") {
      const state = typeof msg.state === "string" ? msg.state : "";
      if (state === "start") {
        this.setPhase("speaking");
        return;
      }
      if (state === "stop") {
        if (this.phase === "speaking") {
          this.setPhase("ready");
          this.hooks.onSpeakingEnd?.();
        }
        return;
      }
      if (state === "sentence_start") {
        const text = typeof msg.text === "string" ? msg.text.trim() : "";
        if (text) this.hooks.onAssistantSentence?.(text);
      }
    }
  }

  async connect(chatAi: PetChatAiConfig): Promise<void> {
    if (this.disposed) throw new Error("xiaozhi session disposed");
    const cfg = normalizePetChatAi(chatAi);
    if (!isXiaozhiBound(cfg)) {
      throw new Error("XIAOZHI_NEED_BIND");
    }
    const ep = resolveXiaozhiEndpoint(cfg);

    await this.ensureListeners();
    this.setPhase("connecting");

    await xiaozhiWsConnect({
      url: ep.wsUrl,
      token: ep.token,
      deviceId: ep.deviceId,
      clientId: ep.clientId,
    });

    const helloPromise = new Promise<void>((resolve, reject) => {
      this.helloWait = {
        resolve,
        reject,
        timer: window.setTimeout(() => {
          this.failHello(new Error("xiaozhi hello timeout"));
        }, HELLO_TIMEOUT_MS),
      };
    });

    await xiaozhiWsSendText(JSON.stringify(buildClientHello()));
    await helloPromise;
    if (this.disposed) return;
    this.setPhase("ready");
  }

  private async stopMic() {
    this.mic?.stop();
    this.mic = null;
  }

  async startListen(): Promise<void> {
    if (this.phase !== "ready" && this.phase !== "speaking") {
      throw new Error("xiaozhi not ready");
    }
    if (this.phase === "speaking") {
      await this.abortSpeaking();
    }
    // 先开麦再通知 listen start，避免服务端已听、本地还没上行
    try {
      this.mic = await startXiaozhiMic();
    } catch (err) {
      throw err;
    }
    try {
      await xiaozhiWsSendText(
        JSON.stringify({
          type: "listen",
          state: "start",
          mode: "manual",
          ...(this.sessionId ? { session_id: this.sessionId } : {}),
        })
      );
    } catch (err) {
      await this.stopMic();
      throw err;
    }
    this.setPhase("listening");
  }

  async stopListen(): Promise<void> {
    await this.stopMic();
    if (this.phase !== "listening") return;
    await xiaozhiWsSendText(
      JSON.stringify({
        type: "listen",
        state: "stop",
        ...(this.sessionId ? { session_id: this.sessionId } : {}),
      })
    );
    this.setPhase("ready");
  }

  async abortSpeaking(): Promise<void> {
    await xiaozhiWsSendText(
      JSON.stringify({
        type: "abort",
        reason: "user_abort",
        ...(this.sessionId ? { session_id: this.sessionId } : {}),
      })
    ).catch(() => undefined);
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.failHello(new Error("xiaozhi session disposed"));
    await this.stopMic();
    try {
      await this.abortSpeaking();
    } catch {
      /* ignore */
    }
    try {
      await xiaozhiWsClose();
    } catch {
      /* ignore */
    }
    this.unlistenMsg?.();
    this.unlistenClosed?.();
    this.unlistenErr?.();
    this.unlistenMsg = null;
    this.unlistenClosed = null;
    this.unlistenErr = null;
    this.setPhase("idle");
  }
}

function asError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === "string" && err.trim()) return new Error(err.trim());
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string" && m.trim()) return new Error(m.trim());
  }
  return new Error(String(err ?? "xiaozhi test failed"));
}

/** 设置页测试：须已绑定；握手成功后立刻关掉 */
export async function testXiaozhiHandshake(
  chatAi: PetChatAiConfig
): Promise<void> {
  const cfg = normalizePetChatAi(chatAi);
  if (!isXiaozhiBound(cfg)) {
    throw new Error("XIAOZHI_NEED_BIND");
  }
  // 先拆掉宠侧租约，避免双端抢同一条 Rust WS
  try {
    await xiaozhiWsClose();
  } catch {
    /* ignore */
  }
  const session = new XiaozhiSession();
  try {
    await session.connect(cfg);
  } catch (err) {
    throw asError(err);
  } finally {
    await session.dispose();
  }
}
