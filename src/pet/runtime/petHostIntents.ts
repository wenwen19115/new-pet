/** idle / 飞行横切：host 只调 dispatch。 */

export type PetHostIntent =
  | { type: "chat-open"; open: boolean }
  | { type: "random-idle-setting"; enabled: boolean }
  | { type: "playful-chase"; active: boolean; rescheduleIdle?: boolean }
  | { type: "peek-hide"; active: boolean; rescheduleIdle?: boolean }
  | { type: "suspend-runtime" };

export type PetHostIntentEffects = {
  hostAlive: () => boolean;
  randomIdleEnabled: () => boolean;
  chatPausesRandomIdle: () => boolean;
  setChatPausesRandomIdle: (open: boolean) => void;
  playfulPausesRandomIdle: () => boolean;
  setPlayfulPausesRandomIdle: (active: boolean) => void;
  peekPausesRandomIdle: () => boolean;
  setPeekPausesRandomIdle: (active: boolean) => void;
  setIdleActionTimer: (id: number | null) => void;
  cancelFlight: () => void;
  scheduleIdleAction: () => void;
};

function canScheduleRandomIdle(fx: PetHostIntentEffects): boolean {
  return (
    fx.hostAlive() &&
    fx.randomIdleEnabled() &&
    !fx.chatPausesRandomIdle() &&
    !fx.playfulPausesRandomIdle() &&
    !fx.peekPausesRandomIdle()
  );
}

function applyIdlePauseFlagGate(
  setFlag: (active: boolean) => void,
  active: boolean,
  fx: PetHostIntentEffects,
  rescheduleIdle: boolean
): void {
  setFlag(active);
  if (active) {
    fx.setIdleActionTimer(null);
    return;
  }
  if (rescheduleIdle && canScheduleRandomIdle(fx)) {
    fx.scheduleIdleAction();
  }
}

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
  fx.cancelFlight();
}

export function applyPlayfulChaseIdleGate(
  active: boolean,
  fx: PetHostIntentEffects,
  rescheduleIdle = true
): void {
  applyIdlePauseFlagGate(
    fx.setPlayfulPausesRandomIdle,
    active,
    fx,
    rescheduleIdle
  );
}

export function applyPeekHideIdleGate(
  active: boolean,
  fx: PetHostIntentEffects,
  rescheduleIdle = true
): void {
  applyIdlePauseFlagGate(fx.setPeekPausesRandomIdle, active, fx, rescheduleIdle);
}

export function applySuspendRuntimeGate(
  fx: Pick<
    PetHostIntentEffects,
    | "setIdleActionTimer"
    | "cancelFlight"
    | "setPlayfulPausesRandomIdle"
    | "setPeekPausesRandomIdle"
  >
): void {
  fx.setPlayfulPausesRandomIdle(false);
  fx.setPeekPausesRandomIdle(false);
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
    case "peek-hide":
      applyPeekHideIdleGate(
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
