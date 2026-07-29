/**
 * idle / 飞行横切入口。host 调 dispatch，不要各自再实现一遍。
 */

export type PetHostIntent =
  | { type: "chat-open"; open: boolean }
  | { type: "random-idle-setting"; enabled: boolean }
  | { type: "suspend-runtime" };

export type PetHostIntentEffects = {
  hostAlive: () => boolean;
  randomIdleEnabled: () => boolean;
  chatPausesRandomIdle: () => boolean;
  setChatPausesRandomIdle: (open: boolean) => void;
  setIdleActionTimer: (id: number | null) => void;
  cancelFlight: () => void;
  scheduleIdleAction: () => void;
};

/** 聊天窗开关 → 随机 idle 门禁。 */
export function applyChatOpenIdleGate(
  open: boolean,
  fx: Pick<
    PetHostIntentEffects,
    | "hostAlive"
    | "randomIdleEnabled"
    | "setIdleActionTimer"
    | "cancelFlight"
    | "scheduleIdleAction"
  >
): void {
  if (open) {
    fx.setIdleActionTimer(null);
    fx.cancelFlight();
    return;
  }
  if (fx.hostAlive() && fx.randomIdleEnabled()) {
    fx.scheduleIdleAction();
  }
}

export function applyRandomIdleSettingGate(
  enabled: boolean,
  fx: Pick<
    PetHostIntentEffects,
    "chatPausesRandomIdle" | "setIdleActionTimer" | "scheduleIdleAction"
  >
): void {
  if (enabled && !fx.chatPausesRandomIdle()) {
    fx.scheduleIdleAction();
    return;
  }
  fx.setIdleActionTimer(null);
}

/** suspend/dispose 时清 idle/飞行（RAF/TTS 仍归 lifecycle）。 */
export function applySuspendRuntimeGate(
  fx: Pick<PetHostIntentEffects, "setIdleActionTimer" | "cancelFlight">
): void {
  fx.setIdleActionTimer(null);
  fx.cancelFlight();
}

export function dispatchPetHostIntent(
  intent: PetHostIntent,
  fx: PetHostIntentEffects
): void {
  switch (intent.type) {
    case "chat-open":
      fx.setChatPausesRandomIdle(intent.open);
      applyChatOpenIdleGate(intent.open, fx);
      return;
    case "random-idle-setting":
      applyRandomIdleSettingGate(intent.enabled, fx);
      return;
    case "suspend-runtime":
      applySuspendRuntimeGate(fx);
      return;
  }
}
