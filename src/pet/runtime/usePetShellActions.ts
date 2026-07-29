import type { ComputedRef, Ref } from "vue";
import { hidePetBubble } from "@/pet/windows/bubble";
import { hidePetChat, showPetChat } from "@/pet/windows/chat";
import { requestOpenPetSettings, requestPinPetSettings } from "@/pet/bridge/hostBridge";
import {
  hidePetMenu,
  showPetMenu,
  type PetMenuAction,
} from "@/pet/windows/menu";
import { filterEnabledMotions } from "@/pet/content/customLines";
import { resolveMotionForModel } from "@/pet/characters";
import { isScreenFlightMotion, PET_TAP_EGG_MOTIONS } from "@/pet/content/motions";
import type { CharacterRuntimeSpec } from "@/pet/characters/types";
import type { PetSettings } from "@/pet/data/types";
import type { PetModelKind, PetSkinVisual } from "@/pet/skins/types";
import type { PetHostPorts } from "./createPetHost";

const TAP_WINDOW_MS = 700;
const TAP_EGG_NEED = 3;

/** Context menu, menu actions, tap-to-speak, and tap-egg easter egg. */
export function usePetShellActions(deps: {
  ports: PetHostPorts;
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

  deps.ports.onBeforeDrag = () => {
    deps.cancelActiveMotion();
    deps.clearMotionTimers();
    deps.speaking.value = false;
    void hidePetBubble();
    void hidePetChat();
  };

  deps.ports.onTap = () => {
    if (registerTapForEgg()) return;
    void deps.speak(false);
  };

  deps.ports.onAfterPointerUp = (info) => {
    if (info.wasDragging) deps.ports.scheduleIdleAction();
    deps.ports.resetSleepTimer();
  };

  function onPointerDown(e: PointerEvent) {
    void hidePetMenu();
    deps.pointerOnPointerDown(e);
  }

  async function onContextMenu() {
    void hidePetChat();
    await showPetMenu({
      chatEnabled: deps.settings.value.chatEnabled,
      statsExpandDefault: deps.settings.value.sysStatsDefaultExpanded,
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
    }
  }

  return { onPointerDown, onContextMenu, onCtxMenuAction };
}
