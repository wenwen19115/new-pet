import type { ComputedRef, Ref } from "vue";
import { hidePetBubble } from "@/pet/windows/bubble";
import { hidePetChat, showPetChat } from "@/pet/windows/chat";
import { requestOpenPetSettings, requestPinPetSettings } from "@/pet/bridge/hostBridge";
import {
  hidePetMenu,
  showPetMenu,
  type PetMenuAction,
} from "@/pet/windows/menu";
import { filterEnabledMotions } from "@/pet/content/dialogue/customLines";
import { resolveMotionForModel } from "@/pet/characters";
import { isScreenFlightMotion, PET_TAP_EGG_MOTIONS } from "@/pet/content/motion/motions";
import type { CharacterRuntimeSpec } from "@/pet/characters/types";
import type { PetSettings } from "@/pet/data/types";
import type { PetModelKind, PetSkinVisual } from "@/pet/skins/types";
import type { PetHostPorts } from "./petHostPorts";

const TAP_WINDOW_MS = 700;
const TAP_EGG_NEED = 3;

export function usePetShellActions(deps: {
  ports: PetHostPorts;
  bindPorts: (partial: Partial<PetHostPorts>) => void;
  settings: Ref<PetSettings>;
  speaking: Ref<boolean>;
  activeSkin: ComputedRef<{ model: PetModelKind; visual: PetSkinVisual }>;
  activeCharacter: ComputedRef<{ runtime: CharacterRuntimeSpec }>;
  cancelActiveMotion: () => void;
  clearMotionTimers: () => void;
  beginMotion: (id: string, opts?: { manual?: boolean }) => void;
  speakTapEgg: (model: PetModelKind) => void;
  speak: (fromAuto?: boolean) => void | Promise<void>;
  pointerOnPointerDown: (e: PointerEvent) => void;
  tryPlayfulCatch?: () => boolean;
  stopPlayful?: () => void;
  isPeeking?: () => boolean;
  startPeek?: () => void | Promise<boolean>;
  revealPeek?: () => void | Promise<boolean>;
  tryRevealPeekOnTap?: () => boolean;
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
    },
    onTap: () => {
      if (deps.tryRevealPeekOnTap?.()) return;
      if (deps.tryPlayfulCatch?.()) return;
      if (registerTapForEgg()) return;
      void deps.speak(false);
    },
    onAfterPointerUp: (info) => {
      if (info.wasDragging) deps.ports.scheduleIdleAction();
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
    });
  }

  function onCtxMenuAction(action: PetMenuAction) {
    void hidePetMenu();
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
    }
  }

  return { onPointerDown, onContextMenu, onCtxMenuAction };
}
