import type { DeskWeatherConfig, DeskWeatherKind } from "@/pet/data/deskWeather";
import { deskWeatherTierIdAt } from "@/pet/data/deskWeather";
import type { DeskWeatherSnapshot } from "@/pet/bridge/deskWeather";

export type DeskWeatherEngineState = {
  bootstrapped: boolean;
  appsBaseline: number | null;
  appsChangeCooldownUntil: number;
  switchBurstCooldownUntil: number;
  maxDwellCooldownUntil: number;
  immersiveKey: string;
  immersiveSince: number;
  firedTierMask: number;
  lastConsumedSwitchMs: number;
};

export function createDeskWeatherEngineState(): DeskWeatherEngineState {
  return {
    bootstrapped: false,
    appsBaseline: null,
    appsChangeCooldownUntil: 0,
    switchBurstCooldownUntil: 0,
    maxDwellCooldownUntil: 0,
    immersiveKey: "",
    immersiveSince: 0,
    firedTierMask: 0,
    lastConsumedSwitchMs: 0,
  };
}

/** 达阈值返回 kind，不写冷却；同轮：增减 > 切窗 > 铺满 */
export function observeDeskWeather(
  state: DeskWeatherEngineState,
  cfg: DeskWeatherConfig,
  snap: DeskWeatherSnapshot,
  now: number
): DeskWeatherKind | null {
  if (!cfg.enabled) return null;

  if (!state.bootstrapped) {
    state.bootstrapped = true;
    state.appsBaseline = snap.appCount;
    if (snap.recentSwitchTimesMs.length) {
      state.lastConsumedSwitchMs = Math.max(...snap.recentSwitchTimesMs);
    }
    if (snap.foregroundImmersive && snap.foregroundKey) {
      state.immersiveKey = snap.foregroundKey;
      state.immersiveSince = now;
    }
    return null;
  }

  trackImmersive(state, cfg, snap.foregroundKey, snap.foregroundImmersive, now);

  return (
    peekApps(state, cfg, snap.appCount, now) ??
    peekSwitch(state, cfg, snap.recentSwitchTimesMs, now) ??
    peekImmersive(state, cfg, now)
  );
}

/** 说话成功后再钉基线/冷却 */
export function commitDeskWeatherFire(
  state: DeskWeatherEngineState,
  cfg: DeskWeatherConfig,
  kind: DeskWeatherKind,
  snap: DeskWeatherSnapshot,
  now: number
): void {
  if (kind.type === "apps-up" || kind.type === "apps-down") {
    state.appsBaseline = snap.appCount;
    state.appsChangeCooldownUntil = now + cfg.cooldown.appsChangeSec * 1000;
    if (snap.recentSwitchTimesMs.length) {
      state.lastConsumedSwitchMs = Math.max(
        state.lastConsumedSwitchMs,
        ...snap.recentSwitchTimesMs
      );
    }
    return;
  }
  if (kind.type === "switch-burst") {
    const timesMs = snap.recentSwitchTimesMs;
    if (timesMs.length) {
      const windowMs = cfg.switchBurst.windowMs;
      const newest = Math.max(...timesMs);
      const fresh = timesMs.filter(
        (t) => t > state.lastConsumedSwitchMs && newest - t <= windowMs
      );
      if (fresh.length) {
        state.lastConsumedSwitchMs = Math.max(...fresh);
      }
    }
    state.switchBurstCooldownUntil = now + cfg.cooldown.switchBurstSec * 1000;
    return;
  }
  const tiers = cfg.maxDwell.tiersSec;
  for (let i = 0; i < tiers.length; i++) {
    if (deskWeatherTierIdAt(i) !== kind.tier) continue;
    state.firedTierMask |= 1 << i;
    if (i === tiers.length - 1) {
      state.maxDwellCooldownUntil =
        now + cfg.cooldown.maxDwellAfterTopMin * 60_000;
    }
    return;
  }
}

function peekApps(
  state: DeskWeatherEngineState,
  cfg: DeskWeatherConfig,
  appCount: number,
  now: number
): DeskWeatherKind | null {
  if (!cfg.appsMany.enabled) return null;
  if (state.appsBaseline == null) {
    state.appsBaseline = appCount;
    return null;
  }
  const step = Math.max(1, cfg.appsMany.changeStep);
  const delta = appCount - state.appsBaseline;
  if (Math.abs(delta) < step) return null;
  if (now < state.appsChangeCooldownUntil) return null;
  return delta > 0
    ? { type: "apps-up", appCount, delta: Math.abs(delta) }
    : { type: "apps-down", appCount, delta: Math.abs(delta) };
}

function peekSwitch(
  state: DeskWeatherEngineState,
  cfg: DeskWeatherConfig,
  timesMs: number[],
  now: number
): DeskWeatherKind | null {
  if (!cfg.switchBurst.enabled) return null;
  if (now < state.switchBurstCooldownUntil) return null;
  if (!timesMs.length) return null;
  const windowMs = cfg.switchBurst.windowMs;
  const newest = Math.max(...timesMs);
  const fresh = timesMs.filter(
    (t) => t > state.lastConsumedSwitchMs && newest - t <= windowMs
  );
  if (fresh.length < cfg.switchBurst.switchCount) return null;
  return { type: "switch-burst" };
}

function trackImmersive(
  state: DeskWeatherEngineState,
  cfg: DeskWeatherConfig,
  key: string,
  immersive: boolean,
  now: number
): void {
  if (!cfg.maxDwell.enabled) {
    state.immersiveKey = "";
    state.immersiveSince = 0;
    state.firedTierMask = 0;
    return;
  }
  if (!key || !immersive) {
    state.immersiveKey = "";
    state.immersiveSince = 0;
    state.firedTierMask = 0;
    return;
  }
  if (key !== state.immersiveKey) {
    state.immersiveKey = key;
    state.immersiveSince = now;
    state.firedTierMask = 0;
  }
}

function peekImmersive(
  state: DeskWeatherEngineState,
  cfg: DeskWeatherConfig,
  now: number
): DeskWeatherKind | null {
  if (!cfg.maxDwell.enabled) return null;
  if (!state.immersiveKey || !state.immersiveSince) return null;
  if (now < state.maxDwellCooldownUntil) return null;
  const dwellSec = Math.floor((now - state.immersiveSince) / 1000);
  const tiers = cfg.maxDwell.tiersSec;
  for (let i = 0; i < tiers.length; i++) {
    const need = tiers[i]!;
    const bit = 1 << i;
    if (dwellSec < need || (state.firedTierMask & bit) !== 0) continue;
    const tier = deskWeatherTierIdAt(i);
    if (!tier) continue;
    return { type: "max-dwell", tier, dwellSec: need };
  }
  return null;
}
