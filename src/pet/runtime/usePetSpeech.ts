import { type Ref } from "vue";
import { showPetBubble, hidePetBubble } from "@/pet/windows/bubble";
import { buildSkinIntro } from "../content/dialogue/intro";
import { pickPetLine, pickTapEggLine, pickUsbLine, pickUsbFollowUpLine, pickDragEndLine, pickDragStartLine, pickBubblePongLine, pickDeskWeatherLine } from "../content/dialogue/lines";
import { applyCatchphrase } from "../content/dialogue/catchphrases";
import type { PetMood, PetSettings, PetUsbAnnouncePayload } from "../data/types";
import type { DeskWeatherKind } from "../data/deskWeather";
import type { PetModelKind } from "../skins/types";
import { getCharacter, resolveMotionForModel } from "../characters";
import type { PetIdleMotion } from "../content/motion/motions";
import { linePickOptsFromSettings } from "./usePetLines";
import { cancelPetTts, speakPetTts } from "../bridge/tts";
import type { ApplyPetMood } from "./petHostMood";

type SpeakOptions = {
  keepMotion?: boolean;
  force?: boolean;
  keepMood?: boolean;
};

export function usePetSpeech(deps: {
  settings: Ref<PetSettings>;
  model: Ref<PetModelKind> | { value: PetModelKind };
  mood: Ref<PetMood>;
  speaking: Ref<boolean>;
  applyMood: ApplyPetMood;
  lastLine: Ref<string | null>;
  idleMotion: Ref<string>;
  isDragging: Ref<boolean>;
  isMotionLocked: () => boolean;
  resetSleepTimer: () => void;
  scheduleAutoSpeak: () => void;
  clearTimer: (id: number | null) => void;
  setBubbleTimer: (id: number | null) => void;
  setMoodResetTimer: (id: number | null) => void;
  getBubbleTimer: () => number | null;
  getMoodResetTimer: () => number | null;
  bubbleMs?: number;
}) {
  const BUBBLE_MS = deps.bubbleMs ?? 4500;
  let speakGen = 0;
  let usbFollowUpTimer: number | null = null;

  function clearUsbFollowUpTimer() {
    deps.clearTimer(usbFollowUpTimer);
    usbFollowUpTimer = null;
  }

  function playClickSound() {
    if (deps.settings.value.muted) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value =
        deps.settings.value.tone === "snarky" ? 240 : 520;
      gain.gain.value = 0.025;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
      osc.stop(ctx.currentTime + 0.11);
      window.setTimeout(() => void ctx.close(), 180);
    } catch {
      // ignore
    }
  }

  function withCatchphrase(line: string): string {
    const s = deps.settings.value;
    return applyCatchphrase(line, s.catchphrases, s.catchphraseChance);
  }

  async function speakText(
    line: string,
    fromAuto = false,
    options: SpeakOptions = {}
  ) {
    if (!line) return;
    // 退出召唤后勿再弹随机/事件台词
    if (!deps.settings.value.enabled) return;
    if (deps.speaking.value && fromAuto && !options.force) return;
    if (deps.isDragging.value && !options.force) return;
    if (
      fromAuto &&
      deps.isMotionLocked() &&
      !options.keepMotion &&
      !options.force
    )
      return;

    const text = withCatchphrase(line);
    if (!text) return;

    const gen = ++speakGen;
    clearUsbFollowUpTimer();
    cancelPetTts();

    deps.lastLine.value = text;
    deps.speaking.value = true;
    if (!options.keepMood) {
      deps.applyMood(
        deps.settings.value.tone === "snarky" ? "grumpy" : "happy",
        "speak"
      );
    }
    if (!options.keepMotion && !deps.isMotionLocked()) {
      deps.idleMotion.value = resolveMotionForModel(
        "happy-bounce",
        deps.model.value
      );
    }

    const estimateMs = Math.max(BUBBLE_MS, 1200 + text.length * 42);
    const s = deps.settings.value;
    const wantTts = !s.muted && s.ttsEnabled;

    const ttsPromise = wantTts
      ? speakPetTts(text, {
          model: deps.model.value,
          personality: s.personality,
          tone: s.tone,
          voiceUri: s.ttsVoiceUri,
        }).catch((err) => {
          console.warn("[pet] tts failed", err);
          return 0;
        })
      : Promise.resolve(0);

    if (!deps.settings.value.enabled || gen !== speakGen) {
      deps.speaking.value = false;
      return;
    }

    try {
      await showPetBubble({
        text,
        tone: s.tone,
        durationMs: Math.max(estimateMs, 18000),
      });
    } catch (err) {
      console.warn("[pet] bubble failed", err);
    }

    if (gen !== speakGen || !deps.settings.value.enabled) {
      deps.speaking.value = false;
      return;
    }

    const audioMs = await ttsPromise;
    if (gen !== speakGen || !deps.settings.value.enabled) {
      deps.speaking.value = false;
      return;
    }

    const holdMs = Math.max(estimateMs, audioMs > 0 ? audioMs + 280 : 0);
    deps.clearTimer(deps.getBubbleTimer());
    deps.setBubbleTimer(
      window.setTimeout(() => {
        if (gen !== speakGen) return;
        deps.speaking.value = false;
        void hidePetBubble();
        cancelPetTts();
      }, holdMs)
    );

    deps.clearTimer(deps.getMoodResetTimer());
    deps.setMoodResetTimer(
      window.setTimeout(() => {
        if (gen !== speakGen) return;
        if (deps.applyMood("idle", "speak-end") && !options.keepMotion) {
          deps.idleMotion.value = "idle-float";
        }
      }, 1600)
    );

    if (!fromAuto) playClickSound();
    deps.resetSleepTimer();
    if (deps.settings.value.enabled) deps.scheduleAutoSpeak();
  }

  /** 退出召唤：作废在途 speak，避免 hide 后再弹 */
  function cancelSpeech() {
    speakGen += 1;
    clearUsbFollowUpTimer();
    cancelPetTts();
    deps.speaking.value = false;
  }

  async function speak(fromAuto = false, options: SpeakOptions = {}) {
    const model = deps.model.value;
    const opts = linePickOptsFromSettings(deps.settings.value, model);
    const line = pickPetLine(
      deps.settings.value.tone,
      deps.lastLine.value,
      deps.settings.value.personality,
      model,
      opts
    );
    await speakText(line, fromAuto, options);
  }

  function speakIntro() {
    // 未召唤时切角色也会 sync settings → introIfSkinChanged；勿在默认位弹气泡
    if (!deps.settings.value.enabled) return;
    const line = buildSkinIntro(deps.settings.value);
    void speakText(line, false);
  }

  function speakTapEgg(model: PetModelKind) {
    const opts = linePickOptsFromSettings(deps.settings.value, model);
    const line = pickTapEggLine(
      model,
      deps.settings.value.personality,
      opts
    );
    void speakText(line, false, { force: true, keepMotion: true });
  }

  function speakDragStart() {
    const model = deps.model.value;
    const opts = linePickOptsFromSettings(deps.settings.value, model);
    const line = pickDragStartLine(
      model,
      deps.settings.value.personality,
      opts
    );
    if (!line) return;
    void speakText(line, false, { force: true, keepMotion: true });
  }

  function speakDragLand() {
    const model = deps.model.value;
    const opts = linePickOptsFromSettings(deps.settings.value, model);
    const line = pickDragEndLine(
      model,
      deps.settings.value.personality,
      opts
    );
    if (!line) return;
    void speakText(line, false, { force: true, keepMotion: true });
  }

  function speakBubblePong() {
    const model = deps.model.value;
    const opts = linePickOptsFromSettings(deps.settings.value, model);
    const line = pickBubblePongLine(
      model,
      deps.settings.value.personality,
      opts
    );
    if (!line) return;
    deps.applyMood("grumpy", "bubble-pong");
    void speakText(line, false, {
      force: true,
      keepMotion: true,
      keepMood: true,
    });
  }

  async function speakUsb(payload: PetUsbAnnouncePayload) {
    if (!deps.settings.value.usbWatchEnabled) return;
    deps.applyMood("idle", "usb-wake");
    const model = deps.model.value;
    const opts = linePickOptsFromSettings(deps.settings.value, model);
    const personality = deps.settings.value.personality;
    const text = pickUsbLine(payload, personality, opts, model);
    await speakText(text, false, { force: true });

    const chance =
      getCharacter(model).runtime.accents?.usbFollowUpChance ?? 0;
    if (chance <= 0 || Math.random() >= chance) return;
    const follow = pickUsbFollowUpLine(model, personality, opts);
    if (!follow) return;
    const delayMs = Math.max(1600, 800 + text.length * 34);
    clearUsbFollowUpTimer();
    usbFollowUpTimer = window.setTimeout(() => {
      usbFollowUpTimer = null;
      void speakText(follow, false, { force: true, keepMotion: true });
    }, delayMs);
  }

  function resolveDeskWeatherMotion(
    kind: DeskWeatherKind,
    model: PetModelKind
  ): PetIdleMotion | null {
    const table = getCharacter(model).runtime.accents?.deskWeather;
    if (!table) return null;
    if (kind.type === "apps-up") return table.appsUp ?? null;
    if (kind.type === "apps-down") return table.appsDown ?? null;
    if (kind.type === "switch-burst") return table.switchBurst ?? null;
    return table.maxDwell?.[kind.tier] ?? null;
  }

  function speakDeskWeather(kind: DeskWeatherKind): {
    spoke: boolean;
    motion: PetIdleMotion | null;
  } {
    if (!deps.settings.value.deskWeather.enabled) {
      return { spoke: false, motion: null };
    }
    if (deps.mood.value === "sleep") {
      deps.applyMood("idle", "wake");
    }
    const model = deps.model.value;
    const opts = linePickOptsFromSettings(deps.settings.value, model);
    const line = pickDeskWeatherLine(
      kind,
      model,
      deps.settings.value.personality,
      opts
    );
    if (!line) {
      console.warn("[pet] desk weather skipped: empty line", kind.type);
      return { spoke: false, motion: null };
    }
    deps.applyMood("curious", "desk-weather");
    const motion = resolveDeskWeatherMotion(kind, model);
    void speakText(line, false, {
      force: true,
      keepMotion: true,
      keepMood: true,
    });
    return { spoke: true, motion };
  }

  return {
    playClickSound,
    speakText,
    speak,
    speakIntro,
    speakTapEgg,
    speakDragStart,
    speakDragLand,
    speakBubblePong,
    speakUsb,
    speakDeskWeather,
    clearUsbFollowUpTimer,
    cancelSpeech,
  };
}
