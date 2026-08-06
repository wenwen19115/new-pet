import type { ComputedRef, Ref } from "vue";
import { hidePetBubble } from "@/pet/windows/bubble";
import { hidePetChat, showPetChat } from "@/pet/windows/chat";
import { requestOpenPetSettings, requestPinPetSettings } from "@/pet/bridge/hostBridge";
import { syncPetWindow } from "@/pet/windows/pet";
import {
  hidePetMenu,
  showPetMenu,
  type PetMenuAction,
} from "@/pet/windows/menu";
import { bumpMoyuDay } from "@/pet/data/moyuDay";
import { normalizeSkyWeather } from "@/pet/data/skyWeather";
import { patchPetSettings, publishPetSettings } from "@/pet/data/settings";
import { clearPetIntroPending } from "@/pet/data/storageKeys";
import { filterEnabledMotions } from "@/pet/content/dialogue/customLines";
import {
  characterSupportsVrmAssets,
  getCharacter,
  resolveMotionForModel,
} from "@/pet/characters";
import { buildIdleMotionPool } from "@/pet/content/motion/motionPlayer";
import { isScreenFlightMotion, PET_TAP_EGG_MOTIONS } from "@/pet/content/motion/motions";
import type { CharacterRuntimeSpec } from "@/pet/characters/types";
import type { PetSettings } from "@/pet/data/types";
import type { PetModelKind, PetSkinVisual } from "@/pet/skins/types";
import type { PetHostPorts } from "./petHostPorts";

import type { ApplyPetMood } from "./petHostMood";

const TAP_WINDOW_MS = 700;
const TAP_EGG_NEED = 3;

export function usePetShellActions(deps: {
  ports: PetHostPorts;
  bindPorts: (partial: Partial<PetHostPorts>) => void;
  settings: Ref<PetSettings>;
  speaking: Ref<boolean>;
  activeSkin: ComputedRef<{ model: PetModelKind; visual: PetSkinVisual }>;
  activeCharacter: ComputedRef<{ runtime: CharacterRuntimeSpec }>;
  applyMood: ApplyPetMood;
  cancelActiveMotion: () => void;
  clearMotionTimers: () => void;
  beginMotion: (id: string, opts?: { manual?: boolean }) => void;
  speakTapEgg: (model: PetModelKind) => void;
  speakDragStart: () => void;
  speakDragLand: () => void;
  speak: (fromAuto?: boolean) => void | Promise<void>;
  pointerOnPointerDown: (e: PointerEvent) => void;
  tryPlayfulCatch?: () => boolean;
  startPlayfulBurst?: () => boolean;
  stopPlayful?: () => void;
  isPeeking?: () => boolean;
  startPeek?: () => void | Promise<boolean>;
  revealPeek?: () => void | Promise<boolean>;
  tryRevealPeekOnTap?: () => boolean;
  skyVisualHold?: Ref<boolean>;
}) {
  let tapTimes: number[] = [];

  function triggerTapEgg() {
    const model = deps.activeSkin.value.model;
    const profile = deps.settings.value.profiles[model];
    const pool = filterEnabledMotions(
      PET_TAP_EGG_MOTIONS.filter((m) => {
        const r = resolveMotionForModel(m, model);
        return (
          r === m ||
          isScreenFlightMotion(r) ||
          r.startsWith("toon") ||
          r === "tap-frenzy" ||
          r === "victory-burst" ||
          r === "peekaboo"
        );
      }),
      profile?.disabledMotions
    );
    const pick =
      pool[Math.floor(Math.random() * pool.length)] ??
      deps.activeCharacter.value.runtime.tapFallbackMotion;
    deps.beginMotion(pick, { manual: true });
    deps.speakTapEgg(model);
  }

  function registerTapForEgg() {
    const now = Date.now();
    tapTimes = tapTimes.filter((t) => now - t < TAP_WINDOW_MS);
    tapTimes.push(now);
    if (tapTimes.length >= TAP_EGG_NEED) {
      tapTimes = [];
      triggerTapEgg();
      return true;
    }
    return false;
  }

  deps.bindPorts({
    onBeforeDrag: () => {
      if (deps.isPeeking?.()) void deps.revealPeek?.();
      deps.stopPlayful?.();
      deps.cancelActiveMotion();
      deps.clearMotionTimers();
      deps.speaking.value = false;
      void hidePetBubble();
      void hidePetChat();
      deps.speakDragStart();
    },
    onTap: () => {
      if (deps.tryRevealPeekOnTap?.()) return;
      if (deps.tryPlayfulCatch?.()) return;
      if (registerTapForEgg()) {
        bumpMoyuDay({ taps: 1 });
        return;
      }
      bumpMoyuDay({ taps: 1 });
      void deps.speak(false);
    },
    onAfterPointerUp: (info) => {
      if (info.wasDragging) {
        deps.applyMood("happy", "drag-land");
        const runtime = deps.activeCharacter.value.runtime;
        const motionChance = runtime.accents?.dragLandMotionChance ?? 1;
        if (Math.random() < motionChance) {
          const model = deps.activeSkin.value.model;
          const profile = deps.settings.value.profiles[model];
          const pool = filterEnabledMotions(
            [...runtime.dragLandMotions],
            profile?.disabledMotions
          );
          const pick =
            pool[Math.floor(Math.random() * pool.length)] ??
            runtime.dragLandMotions[0] ??
            runtime.tapFallbackMotion;
          deps.beginMotion(pick, { manual: true });
        }
        deps.speakDragLand();
        deps.ports.scheduleIdleAction();
      }
      deps.ports.resetSleepTimer();
    },
  });

  function onPointerDown(e: PointerEvent) {
    void hidePetMenu();
    deps.pointerOnPointerDown(e);
  }

  async function onContextMenu() {
    void hidePetChat();
    await showPetMenu({
      chatEnabled: deps.settings.value.chatEnabled,
      statsExpandDefault: deps.settings.value.sysStatsDefaultExpanded,
      peekHidden: Boolean(deps.isPeeking?.()),
      skyOnPet: Boolean(deps.settings.value.skyWeather?.enableOnPet),
    });
  }

  function triggerPerformOnce() {
    const model = deps.activeSkin.value.model;
    const profile = deps.settings.value.profiles[model];
    const character = getCharacter(model);
    const pool = buildIdleMotionPool({
      idleMotions: character.idleMotions,
      allowCustomVrm: characterSupportsVrmAssets(model),
      disabledMotions: profile?.disabledMotions,
      customVrmMotions: deps.settings.value.customVrmMotions,
    });
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)]!;
    deps.beginMotion(pick, { manual: true });
    bumpMoyuDay({ performs: 1 });
  }

  function onCtxMenuAction(action: PetMenuAction) {
    void hidePetMenu();
    if (action === "perform") {
      triggerPerformOnce();
      return;
    }
    if (action === "playful") {
      deps.startPlayfulBurst?.();
      return;
    }
    if (action === "open") {
      void requestOpenPetSettings();
      return;
    }
    if (action === "pin") {
      void requestPinPetSettings();
      return;
    }
    if (action === "chat") {
      void hidePetBubble();
      deps.speaking.value = false;
      void showPetChat();
      return;
    }
    if (action === "hide") {
      void deps.startPeek?.();
      return;
    }
    if (action === "reveal") {
      void deps.revealPeek?.();
      return;
    }
    if (action === "sky-on-pet") {
      const sw = normalizeSkyWeather(deps.settings.value.skyWeather);
      const nextOn = !sw.enableOnPet;
      if (!nextOn && deps.skyVisualHold) deps.skyVisualHold.value = true;
      void publishPetSettings({
        ...deps.settings.value,
        skyWeather: { ...sw, enableOnPet: nextOn },
      }).then((next) => {
        deps.settings.value = next;
      });
      return;
    }
    if (action === "dismiss") {
      clearPetIntroPending();
      void patchPetSettings({ enabled: false }).then((next) => {
        deps.settings.value = next;
        return syncPetWindow();
      });
    }
  }

  return { onPointerDown, onContextMenu, onCtxMenuAction };
}
