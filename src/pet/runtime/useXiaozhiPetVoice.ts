import { computed, ref, type Ref } from "vue";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { PET_MOTION_EVENT, type PetMotionPayload } from "@/pet/events";
import {
  PET_HOTKEY_SUSPEND_EVENT,
  type PetHotkeySuspendPayload,
} from "@/pet/events/hotkey";
import { isXiaozhiChatProvider } from "@/pet/chat/providers";
import {
  XiaozhiSession,
  mapXiaozhiEmotionToMotion,
  waitXiaozhiBound,
  type XiaozhiSessionPhase,
} from "@/pet/chat/xiaozhi";
import {
  applyXiaozhiBindResult,
  chatAiFromXiaozhiPrefs,
  isXiaozhiPrefsBound,
  normalizeXiaozhiPrefs,
  XIAOZHI_LISTEN_IDLE_MS,
  XIAOZHI_TALK_BAR_PROXIMITY_PAD,
  XIAOZHI_TALK_BAR_VISUAL_H,
  XIAOZHI_TALK_BAR_W,
  type XiaozhiPrefs,
} from "@/pet/chat/xiaozhi/prefs";
import {
  createXiaozhiOpusPlayer,
  type XiaozhiOpusPlayer,
} from "@/pet/chat/xiaozhi/playOpus";
import { publishPetSettings } from "@/pet/data/settings";
import type { PetSettings, PetTone } from "@/pet/data/types";
import type { ApplyPetMood } from "./petHostMood";
import { showPetBubble } from "@/pet/windows/bubble";

export type XiaozhiTalkUiPhase =
  | "hidden"
  | "need_bind"
  | "binding"
  | "idle"
  | "connecting"
  | "ready"
  | "listening"
  | "speaking"
  | "error";

/** 通话忙：禁随机 idle / 自动说话 / 点击台词 */
export function isXiaozhiTalkBusyPhase(p: XiaozhiTalkUiPhase): boolean {
  return p === "speaking" || p === "listening" || p === "connecting";
}

function prefsOf(s: PetSettings): XiaozhiPrefs {
  return normalizeXiaozhiPrefs(s.xiaozhi, s.chatAi);
}

export function useXiaozhiPetVoice(deps: {
  hostAlive: () => boolean;
  settings: Ref<PetSettings>;
  muted: () => boolean;
  applyMood: ApplyPetMood;
  getTone: () => PetTone;
  getBodyBox: () => { w: number; h: number };
  /** 打断随机台词气泡，避免抢小智字幕 */
  cancelSpeech?: () => void;
}) {
  const phase = ref<XiaozhiTalkUiPhase>("hidden");
  const bindCode = ref("");
  const bindHint = ref("");
  const errorText = ref("");
  const statusText = ref("");

  let session: XiaozhiSession | null = null;
  let player: XiaozhiOpusPlayer | null = null;
  let bindAbort: AbortController | null = null;
  let listenIdleTimer: number | null = null;
  let hotkeyRegistered: string | null = null;
  let hotkeySuspended = false;
  let unlistenHotkeySuspend: UnlistenFn | null = null;
  let pttHeld = false;
  let clickListening = false;
  let connectGen = 0;
  /** 进行中的 ensureSession，避免并发把 connecting 当成已就绪 */
  let connectInflight: Promise<boolean> | null = null;
  let pttPointerId: number | null = null;
  let pttWinUp: ((ev: PointerEvent) => void) | null = null;
  let barHideTimer: number | null = null;

  const visible = computed(() =>
    isXiaozhiChatProvider(deps.settings.value.chatAi.provider)
  );
  /** 闲置渐隐后的浮现态；绑定/通话中强制保持 */
  const barRevealed = ref(true);

  function clearListenIdle() {
    if (listenIdleTimer != null) {
      window.clearTimeout(listenIdleTimer);
      listenIdleTimer = null;
    }
  }

  function clearBarHide() {
    if (barHideTimer != null) {
      window.clearTimeout(barHideTimer);
      barHideTimer = null;
    }
  }

  function barMustStay(): boolean {
    if (pttHeld || clickListening) return true;
    const p = phase.value;
    return (
      p === "need_bind" ||
      p === "binding" ||
      p === "connecting" ||
      p === "listening" ||
      p === "speaking" ||
      p === "error"
    );
  }

  function armBarHide() {
    clearBarHide();
    if (!visible.value || !deps.hostAlive()) return;
    if (barMustStay()) return;
    const sec = prefsOf(deps.settings.value).talkBarHideSec;
    if (sec <= 0) return;
    barHideTimer = window.setTimeout(() => {
      barHideTimer = null;
      if (!visible.value || barMustStay()) return;
      barRevealed.value = false;
    }, sec * 1000);
  }

  /** 浮现对话条并重新计闲置隐藏 */
  function bumpBarActivity() {
    if (!visible.value) return;
    barRevealed.value = true;
    armBarHide();
  }

  function armListenIdle() {
    clearListenIdle();
    listenIdleTimer = window.setTimeout(() => {
      listenIdleTimer = null;
      void endListenAndDisconnect("idle");
    }, XIAOZHI_LISTEN_IDLE_MS);
  }

  async function ensurePlayer() {
    if (player) return player;
    player = await createXiaozhiOpusPlayer();
    return player;
  }

  function stopPlayer() {
    player?.clear();
  }

  async function disposePlayer() {
    player?.dispose();
    player = null;
  }

  function setUiPhase(next: XiaozhiTalkUiPhase) {
    phase.value = next;
    if (next === "hidden") {
      clearBarHide();
      barRevealed.value = false;
      return;
    }
    bumpBarActivity();
  }

  function syncPhaseFromSession(p: XiaozhiSessionPhase) {
    if (!visible.value) {
      setUiPhase("hidden");
      return;
    }
    if (!isXiaozhiPrefsBound(prefsOf(deps.settings.value)) && phase.value === "binding") {
      return;
    }
    switch (p) {
      case "connecting":
        setUiPhase("connecting");
        break;
      case "ready":
        setUiPhase("ready");
        break;
      case "listening":
        deps.cancelSpeech?.();
        setUiPhase("listening");
        break;
      case "speaking":
        deps.cancelSpeech?.();
        setUiPhase("speaking");
        break;
      case "error":
        setUiPhase("error");
        break;
      default:
        if (isXiaozhiPrefsBound(prefsOf(deps.settings.value))) setUiPhase("idle");
        else setUiPhase("need_bind");
    }
  }

  function clearPttWindowHook() {
    if (pttWinUp) {
      window.removeEventListener("pointerup", pttWinUp, true);
      pttWinUp = null;
    }
    pttPointerId = null;
  }

  function armPttWindowHook(pointerId: number) {
    clearPttWindowHook();
    pttPointerId = pointerId;
    pttWinUp = (ev: PointerEvent) => {
      if (pttPointerId != null && ev.pointerId !== pttPointerId) return;
      // 只认真正抬起；cancel 在切角色改窗时很常见，不当松手
      if (ev.type !== "pointerup") return;
      clearPttWindowHook();
      if (!pttHeld) return;
      pttHeld = false;
      void endListen();
    };
    window.addEventListener("pointerup", pttWinUp, true);
  }

  async function disposeSession(opts?: { keepPtt?: boolean }) {
    clearListenIdle();
    // 重连时勿清按住意图，否则首按/切宠后 ensureSession 会把 pttHeld 抹掉
    if (!opts?.keepPtt) {
      pttHeld = false;
      clickListening = false;
      clearPttWindowHook();
    }
    stopPlayer();
    const s = session;
    session = null;
    if (s) await s.dispose().catch(() => undefined);
  }

  async function endListenAndDisconnect(_reason: "idle" | "error" | "manual") {
    clearListenIdle();
    clickListening = false;
    pttHeld = false;
    clearPttWindowHook();
    try {
      await session?.stopListen();
    } catch {
      /* ignore */
    }
    await disposeSession();
    if (!deps.hostAlive() || !visible.value) return;
    if (isXiaozhiPrefsBound(prefsOf(deps.settings.value))) setUiPhase("idle");
    else setUiPhase("need_bind");
  }

  async function persistPrefs(next: XiaozhiPrefs) {
    const published = await publishPetSettings({
      ...deps.settings.value,
      xiaozhi: next,
      chatAi: {
        ...deps.settings.value.chatAi,
        ...(deps.settings.value.chatAi.provider === "xiaozhi"
          ? {
              apiKey: next.token,
              baseUrl: next.wsUrl,
              deviceId: next.deviceId,
              clientId: next.clientId,
              otaUrl: next.otaUrl,
            }
          : {}),
      },
    });
    deps.settings.value = published;
  }

  async function startBindPoll() {
    if (!visible.value || !deps.hostAlive()) return;
    bindAbort?.abort();
    bindAbort = new AbortController();
    const signal = bindAbort.signal;
    setUiPhase("binding");
    bindCode.value = "";
    bindHint.value = "";
    errorText.value = "";
    try {
      const boundChat = await waitXiaozhiBound(
        chatAiFromXiaozhiPrefs(prefsOf(deps.settings.value)),
        {
          signal,
          onProgress: (p) => {
            if (p.code) bindCode.value = p.code;
            if (p.message) bindHint.value = p.message;
          },
        }
      );
      if (signal.aborted || !deps.hostAlive()) return;
      const next = applyXiaozhiBindResult(prefsOf(deps.settings.value), {
        wsUrl: boundChat.baseUrl,
        token: boundChat.apiKey,
      });
      await persistPrefs(next);
      bindCode.value = "";
      setUiPhase("idle");
    } catch (err) {
      if (signal.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg !== "Aborted" && msg !== "XIAOZHI_BIND_TIMEOUT") {
        errorText.value = msg;
        setUiPhase("error");
      } else if (!isXiaozhiPrefsBound(prefsOf(deps.settings.value))) {
        setUiPhase("need_bind");
      }
    }
  }

  async function ensureSession(): Promise<boolean> {
    if (!visible.value || !deps.hostAlive()) return false;
    const prefs = prefsOf(deps.settings.value);
    if (!isXiaozhiPrefsBound(prefs)) {
      void startBindPoll();
      return false;
    }
    if (session) {
      const p = session.getPhase();
      if (p === "ready" || p === "listening" || p === "speaking") return true;
      if (p === "connecting" && connectInflight) return connectInflight;
    }
    if (connectInflight) return connectInflight;

    await disposeSession({ keepPtt: true });
    const gen = ++connectGen;
    const s = new XiaozhiSession({
      onPhase: (ph) => {
        if (session !== s) return;
        syncPhaseFromSession(ph);
        if (ph === "listening") armListenIdle();
        else clearListenIdle();
      },
      onUserStt: (text) => {
        if (session !== s || !deps.hostAlive()) return;
        statusText.value = text;
      },
      onAssistantSentence: (text) => {
        if (session !== s || !deps.hostAlive()) return;
        statusText.value = text;
        deps.cancelSpeech?.();
        void showPetBubble({
          text,
          tone: deps.getTone(),
          durationMs: 12_000,
          instant: true,
        });
      },
      onSpeakingEnd: () => {
        if (session !== s || !deps.hostAlive()) return;
        const text = statusText.value.trim();
        if (!text) return;
        void showPetBubble({
          text,
          tone: deps.getTone(),
          durationMs: 3000,
          instant: true,
        });
      },
      onEmotion: (mood, emotion) => {
        if (session !== s || !deps.hostAlive()) return;
        deps.applyMood(mood, "chat-reply");
        void emit(PET_MOTION_EVENT, {
          motion: mapXiaozhiEmotionToMotion(emotion),
        } satisfies PetMotionPayload);
      },
      onError: (message) => {
        if (session !== s || !deps.hostAlive()) return;
        errorText.value = message;
        void endListenAndDisconnect("error");
      },
      onAudioPacket: (bytes) => {
        if (session !== s || !deps.hostAlive()) return;
        const prefsNow = prefsOf(deps.settings.value);
        if (deps.muted() || !prefsNow.voicePlayback) return;
        void ensurePlayer().then((pl) => pl.pushPacket(bytes));
      },
    });
    session = s;
    setUiPhase("connecting");

    connectInflight = (async () => {
      try {
        await s.connect(chatAiFromXiaozhiPrefs(prefs));
        if (gen !== connectGen || session !== s) {
          await s.dispose().catch(() => undefined);
          return false;
        }
        setUiPhase("ready");
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errorText.value = msg;
        await disposeSession({ keepPtt: true });
        if (msg === "XIAOZHI_NEED_BIND") {
          void startBindPoll();
        } else {
          setUiPhase("error");
        }
        return false;
      } finally {
        connectInflight = null;
      }
    })();

    return connectInflight;
  }

  async function beginListen() {
    if (!visible.value || !deps.hostAlive()) return;
    stopPlayer();
    deps.cancelSpeech?.();
    const ok = await ensureSession();
    if (!ok || !session) return;
    if (!pttHeld && !clickListening) return;
    try {
      await session.startListen();
      if (!pttHeld && !clickListening) {
        await endListen();
        return;
      }
      armListenIdle();
    } catch (err) {
      errorText.value =
        err instanceof Error ? err.message : String(err);
      setUiPhase("error");
    }
  }

  async function endListen() {
    clearListenIdle();
    try {
      await session?.stopListen();
    } catch (err) {
      console.warn("[pet] xiaozhi stop listen failed", err);
    }
    if (
      phase.value === "listening" ||
      phase.value === "connecting"
    ) {
      const sp = session?.getPhase();
      if (sp === "ready" || sp === "speaking") syncPhaseFromSession(sp);
      else if (session) setUiPhase("ready");
      else if (isXiaozhiPrefsBound(prefsOf(deps.settings.value))) {
        setUiPhase("idle");
      }
    }
  }

  async function onPttDown() {
    if (!visible.value || !deps.hostAlive() || hotkeySuspended) return;
    pttHeld = true;
    clickListening = false;
    await beginListen();
  }

  async function onPttUp() {
    if (!pttHeld) return;
    pttHeld = false;
    clearPttWindowHook();
    await endListen();
  }

  async function onBarPointerDown(ev: PointerEvent) {
    if (!visible.value || !deps.hostAlive()) return;
    const prefs = prefsOf(deps.settings.value);
    if (prefs.clickToggleListen) {
      ev.preventDefault();
      if (phase.value === "listening" && clickListening) {
        clickListening = false;
        void endListen();
        return;
      }
      clickListening = true;
      void beginListen();
      return;
    }
    (ev.currentTarget as HTMLElement | null)?.setPointerCapture?.(ev.pointerId);
    pttHeld = true;
    clickListening = false;
    armPttWindowHook(ev.pointerId);
    void beginListen();
  }

  async function onBarPointerUp(ev: PointerEvent) {
    if (prefsOf(deps.settings.value).clickToggleListen) return;
    // 切宠改窗常发 cancel / lostcapture；按住期间忽略，松手靠 window pointerup
    if (ev.type === "lostpointercapture" || ev.type === "pointercancel") {
      if (pttHeld) {
        try {
          (ev.currentTarget as HTMLElement | null)?.setPointerCapture?.(
            ev.pointerId
          );
        } catch {
          /* ignore */
        }
      }
      return;
    }
    if (pttPointerId != null && ev.pointerId !== pttPointerId) return;
    try {
      (ev.currentTarget as HTMLElement | null)?.releasePointerCapture?.(
        ev.pointerId
      );
    } catch {
      /* ignore */
    }
    void onPttUp();
  }

  async function refreshHotkey() {
    const next = visible.value
      ? prefsOf(deps.settings.value).hotkey.trim() || "Alt+Space"
      : "";
    if (hotkeyRegistered === next) return;
    if (hotkeyRegistered) {
      try {
        await unregister(hotkeyRegistered);
      } catch {
        /* ignore */
      }
      hotkeyRegistered = null;
    }
    if (!next || !deps.hostAlive()) return;
    try {
      await register(next, (event) => {
        if (hotkeySuspended || !visible.value) return;
        if (event.state === "Pressed") void onPttDown();
        else if (event.state === "Released") void onPttUp();
      });
      hotkeyRegistered = next;
    } catch (err) {
      console.warn("[pet] xiaozhi hotkey register failed", err);
      errorText.value = `快捷键不可用：${next}`;
    }
  }

  async function onSettingsChanged() {
    if (!visible.value) {
      bindAbort?.abort();
      bindAbort = null;
      await disposeSession();
      await disposePlayer();
      setUiPhase("hidden");
      await refreshHotkey();
      return;
    }
    const prefs = prefsOf(deps.settings.value);
    if (!isXiaozhiPrefsBound(prefs)) {
      await disposeSession();
      if (phase.value !== "binding") setUiPhase("need_bind");
      void startBindPoll();
    } else if (phase.value === "need_bind" || phase.value === "binding") {
      bindAbort?.abort();
      setUiPhase("idle");
    }
    if (!prefs.voicePlayback || deps.muted()) stopPlayer();
    await refreshHotkey();
    bumpBarActivity();
    // 已召唤且已绑定：预连 WS，避免第一次按住卡在首连上丢手势
    if (
      deps.hostAlive() &&
      isXiaozhiPrefsBound(prefs) &&
      phase.value !== "binding" &&
      phase.value !== "need_bind"
    ) {
      void ensureSession().catch((err) => {
        console.warn("[pet] xiaozhi preconnect failed", err);
      });
    }
  }

  /** 命中检测：角色脚下对话条（已浮现时才可点） */
  function isCursorOverTalkBar(
    cursor: { x: number; y: number },
    winCenter: { x: number; y: number },
    winSize: { w: number; h: number }
  ): boolean {
    if (!visible.value || !barRevealed.value) return false;
    const body = deps.getBodyBox();
    const gap = 8;
    const barW = Math.min(winSize.w - 16, XIAOZHI_TALK_BAR_W);
    const top = winCenter.y + body.h / 2 + gap;
    const bottom = top + XIAOZHI_TALK_BAR_VISUAL_H;
    const left = winCenter.x - barW / 2;
    const right = left + barW;
    return (
      cursor.x >= left &&
      cursor.x <= right &&
      cursor.y >= top &&
      cursor.y <= bottom
    );
  }

  /** 鼠标靠近宠物身位 → 浮现对话条 */
  function tickProximity(
    cursor: { x: number; y: number },
    winCenter: { x: number; y: number }
  ) {
    if (!visible.value || !deps.hostAlive()) return;
    const body = deps.getBodyBox();
    const radius =
      Math.hypot(body.w, body.h) / 2 + XIAOZHI_TALK_BAR_PROXIMITY_PAD;
    const near =
      Math.hypot(cursor.x - winCenter.x, cursor.y - winCenter.y) <= radius;
    if (near) bumpBarActivity();
  }

  /** 退出召唤：拆会话，避免下行句子在宠藏后仍弹气泡 */
  async function suspend() {
    bindAbort?.abort();
    bindAbort = null;
    clearBarHide();
    await disposeSession();
    stopPlayer();
    if (!visible.value) {
      setUiPhase("hidden");
      return;
    }
    if (isXiaozhiPrefsBound(prefsOf(deps.settings.value))) setUiPhase("idle");
    else setUiPhase("need_bind");
  }

  async function start() {
    unlistenHotkeySuspend = await listen<PetHotkeySuspendPayload>(
      PET_HOTKEY_SUSPEND_EVENT,
      (ev) => {
        hotkeySuspended = Boolean(ev.payload?.suspend);
      }
    );
    await onSettingsChanged();
  }

  async function stop() {
    bindAbort?.abort();
    bindAbort = null;
    clearBarHide();
    clearListenIdle();
    unlistenHotkeySuspend?.();
    unlistenHotkeySuspend = null;
    if (hotkeyRegistered) {
      try {
        await unregister(hotkeyRegistered);
      } catch {
        /* ignore */
      }
      hotkeyRegistered = null;
    }
    await disposeSession();
    await disposePlayer();
    setUiPhase("hidden");
  }

  return {
    visible,
    barRevealed,
    phase,
    bindCode,
    bindHint,
    errorText,
    statusText,
    onBarPointerDown,
    onBarPointerUp,
    onSettingsChanged,
    isCursorOverTalkBar,
    tickProximity,
    start,
    stop,
    suspend,
  };
}
