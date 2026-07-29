/**
 * idle / 飞行横切入口。host 调 dispatch，不要各自再实现一遍。
 */

export type PetHostIntent =
  | { type: "chat-open"; open: boolean }
  | { type: "random-idle-setting"; enabled: boolean }
  | { type: "playful-chase"; active: boolean; rescheduleIdle?: boolean }
  | { type: "suspend-runtime" };

export type PetHostIntentEffects = {
  hostAlive: () => boolean;
  randomIdleEnabled: () => boolean;
  chatPausesRandomIdle: () => boolean;
  setChatPausesRandomIdle: (open: boolean) => void;
  playfulPausesRandomIdle: () => boolean;
  setPlayfulPausesRandomIdle: (active: boolean) => void;
  setIdleActionTimer: (id: number | null) => void;
  cancelFlight: () => void;
  scheduleIdleAction: () => void;
};

function canScheduleRandomIdle(fx: PetHostIntentEffects): boolean {
  return (
    fx.hostAlive() &&
    fx.randomIdleEnabled() &&
    !fx.chatPausesRandomIdle() &&
    !fx.playfulPausesRandomIdle()
  );
}

/** 聊天窗开关 → 随机 idle 门禁。 */
export function applyChatOpenIdleGate(
  open: boolean,
  fx: PetHostIntentEffects
): void {
  if (open) {
    fx.setIdleActionTimer(null);
    fx.cancelFlight();
    return;
  }
  if (canScheduleRandomIdle(fx)) {
    fx.scheduleIdleAction();
  }
}

export function applyRandomIdleSettingGate(
  enabled: boolean,
  fx: PetHostIntentEffects
): void {
  if (enabled && canScheduleRandomIdle(fx)) {
    fx.scheduleIdleAction();
    return;
  }
  fx.setIdleActionTimer(null);
}

/** 调皮追逐：开则停随机 idle；关则按需恢复。 */
export function applyPlayfulChaseIdleGate(
  active: boolean,
  fx: PetHostIntentEffects,
  rescheduleIdle = true
): void {
  fx.setPlayfulPausesRandomIdle(active);
  if (active) {
    fx.setIdleActionTimer(null);
    return;
  }
  if (rescheduleIdle && canScheduleRandomIdle(fx)) {
    fx.scheduleIdleAction();
  }
}

/** suspend/dispose 时清 idle/飞行（RAF/TTS 仍归 lifecycle）。 */
export function applySuspendRuntimeGate(
  fx: Pick<
    PetHostIntentEffects,
    "setIdleActionTimer" | "cancelFlight" | "setPlayfulPausesRandomIdle"
  >
): void {
  fx.setPlayfulPausesRandomIdle(false);
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
    case "playful-chase":
      applyPlayfulChaseIdleGate(
        intent.active,
        fx,
        intent.rescheduleIdle !== false
      );
      return;
    case "suspend-runtime":
      applySuspendRuntimeGate(fx);
      return;
  }
}
