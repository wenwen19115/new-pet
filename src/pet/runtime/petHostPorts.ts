/**
 * createPetHost 跨 host 调用契约。
 * 各 host 闭包引用稳定的 `ports`；实现稍后 `bind()`，调用处不要直接改 ports 上的方法字段。
 */

export type PetHostPorts = {
  scheduleIdleAction: () => void;
  scheduleAutoSpeak: () => void;
  resetSleepTimer: () => void;
  wakeFromSleep: () => void;
  speakText: (
    text: string,
    fromAuto: boolean,
    opts?: { keepMotion?: boolean }
  ) => void | Promise<void>;
  speak: (fromAuto?: boolean) => void | Promise<void>;
  onBeforeDrag: () => void;
  onTap: () => void;
  onAfterPointerUp: (info: { wasDragging: boolean }) => void;
};

const NOOP_PORTS: PetHostPorts = {
  scheduleIdleAction: () => {},
  scheduleAutoSpeak: () => {},
  resetSleepTimer: () => {},
  wakeFromSleep: () => {},
  speakText: () => {},
  speak: () => {},
  onBeforeDrag: () => {},
  onTap: () => {},
  onAfterPointerUp: () => {},
};

export function createDefaultPetHostPorts(): PetHostPorts {
  return { ...NOOP_PORTS };
}

/** 延迟 bind：解决 host 互相引用时的接线顺序。 */
export function createPetHostPortBus() {
  const impl: PetHostPorts = createDefaultPetHostPorts();
  const ports: PetHostPorts = {
    scheduleIdleAction: () => impl.scheduleIdleAction(),
    scheduleAutoSpeak: () => impl.scheduleAutoSpeak(),
    resetSleepTimer: () => impl.resetSleepTimer(),
    wakeFromSleep: () => impl.wakeFromSleep(),
    speakText: (text, fromAuto, opts) => impl.speakText(text, fromAuto, opts),
    speak: (fromAuto) => impl.speak(fromAuto),
    onBeforeDrag: () => impl.onBeforeDrag(),
    onTap: () => impl.onTap(),
    onAfterPointerUp: (info) => impl.onAfterPointerUp(info),
  };

  function bind(partial: Partial<PetHostPorts>) {
    Object.assign(impl, partial);
  }

  return { ports, bind };
}
