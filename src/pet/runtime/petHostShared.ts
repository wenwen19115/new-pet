import { computed, reactive, ref } from "vue";
import { getCharacter } from "@/pet/characters";
import { getPetLocale, type PetLocale } from "@/pet/bridge/locale";
import { loadPetSettings } from "@/pet/data/settings";
import { resolveAppearance } from "@/pet/skins";
import { petBodyBox, petWindowSize } from "@/pet/bridge/sizes";
import type { PetMood, PetSettings } from "@/pet/data/types";
import { createPetHostPortBus } from "./petHostPorts";
import { type ApplyPetMood } from "./petHostMood";

export function clearPetHostTimer(id: number | null) {
  if (id != null) window.clearTimeout(id);
}

export function createPetHostShared() {
  const settings = ref<PetSettings>(loadPetSettings());
  /** 参与 activeSkin，切语言后重算默认昵称 */
  const locale = ref<PetLocale>(getPetLocale());
  const vrmSrc = ref<string | null>(null);
  const mood = ref<PetMood>("idle");
  const lastLine = ref<string | null>(null);
  const idleMotion = ref<string>("idle-float");
  const speaking = ref(false);
  let applyMoodImpl: ApplyPetMood = () => false;
  const applyMood: ApplyPetMood = (next, reason) => applyMoodImpl(next, reason);
  const gaze = reactive({ x: 0, y: 0 });

  const { ports, bind: bindPorts } = createPetHostPortBus();

  let bubbleTimer: number | null = null;
  let moodResetTimer: number | null = null;
  let chatPausesRandomIdle = false;
  let playfulPausesRandomIdle = false;
  let peekPausesRandomIdle = false;
  let hostAlive = true;

  const activeSkin = computed(() =>
    resolveAppearance(
      settings.value.modelKind,
      settings.value.lookId,
      locale.value
    )
  );
  const activeCharacter = computed(() => getCharacter(activeSkin.value.model));
  const v = computed(() => activeSkin.value.visual);
  const winSize = computed(() =>
    petWindowSize(activeSkin.value.model, settings.value.zoomPercent)
  );
  const bodyBox = computed(() =>
    petBodyBox(activeSkin.value.model, settings.value.zoomPercent)
  );
  const activeModel = computed(() => activeSkin.value.model);

  return {
    settings,
    locale,
    vrmSrc,
    mood,
    lastLine,
    idleMotion,
    speaking,
    gaze,
    ports,
    bindPorts,
    activeSkin,
    activeCharacter,
    v,
    winSize,
    bodyBox,
    activeModel,
    applyMood,
    setApplyMoodImpl: (fn: ApplyPetMood) => {
      applyMoodImpl = fn;
    },
    get bubbleTimer() {
      return bubbleTimer;
    },
    set bubbleTimer(id: number | null) {
      bubbleTimer = id;
    },
    get moodResetTimer() {
      return moodResetTimer;
    },
    set moodResetTimer(id: number | null) {
      moodResetTimer = id;
    },
    get chatPausesRandomIdle() {
      return chatPausesRandomIdle;
    },
    set chatPausesRandomIdle(v: boolean) {
      chatPausesRandomIdle = v;
    },
    get playfulPausesRandomIdle() {
      return playfulPausesRandomIdle;
    },
    set playfulPausesRandomIdle(v: boolean) {
      playfulPausesRandomIdle = v;
    },
    get peekPausesRandomIdle() {
      return peekPausesRandomIdle;
    },
    set peekPausesRandomIdle(v: boolean) {
      peekPausesRandomIdle = v;
    },
    get hostAlive() {
      return hostAlive;
    },
    set hostAlive(v: boolean) {
      hostAlive = v;
    },
  };
}

export type PetHostShared = ReturnType<typeof createPetHostShared>;
