import { type Ref } from "vue";
import { showPetBubble, hidePetBubble } from "@/pet/windows/bubble";
import { buildSkinIntro } from "../content/dialogue/intro";
import { pickPetLine, pickTapEggLine, pickUsbLine, pickDragEndLine, pickDragStartLine } from "../content/dialogue/lines";
import { applyCatchphrase } from "../content/dialogue/catchphrases";
import type { PetMood, PetSettings, PetUsbAnnouncePayload } from "../data/types";
import type { PetModelKind } from "../skins/types";
import { linePickOptsFromSettings } from "./usePetLines";
import { cancelPetTts, speakPetTts } from "../bridge/tts";
import type { ApplyPetMood } from "./petHostMood";

type SpeakOptions = { keepMotion?: boolean; force?: boolean };

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
    cancelPetTts();

    deps.lastLine.value = text;
    deps.speaking.value = true;
    deps.applyMood(
      deps.settings.value.tone === "snarky" ? "grumpy" : "happy",
      "speak"
    );
    if (!options.keepMotion && !deps.isMotionLocked()) {
      deps.idleMotion.value = "happy-bounce";
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

    try {
      await showPetBubble({
        text,
        tone: s.tone,
        durationMs: Math.max(estimateMs, 18000),
      });
    } catch (err) {
      console.warn("[pet] bubble failed", err);
    }

    if (gen !== speakGen) return;

    const audioMs = await ttsPromise;
    if (gen !== speakGen) return;

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
    deps.scheduleAutoSpeak();
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

  function speakUsb(payload: PetUsbAnnouncePayload) {
    if (!deps.settings.value.usbWatchEnabled) return;
    deps.applyMood("idle", "usb-wake");
    const model = deps.model.value;
    const opts = linePickOptsFromSettings(deps.settings.value, model);
    const text = pickUsbLine(
      payload,
      deps.settings.value.personality,
      opts,
      model
    );
    void speakText(text, false, { force: true });
  }

  return {
    playClickSound,
    speakText,
    speak,
    speakIntro,
    speakTapEgg,
    speakDragStart,
    speakDragLand,
    speakUsb,
  };
}
