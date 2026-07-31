import { invoke } from "@tauri-apps/api/core";
import type { DeskWeatherConfig, DeskWeatherKind } from "@/pet/data/deskWeather";
import { deskWeatherTierIdAt } from "@/pet/data/deskWeather";

export interface DeskWeatherSnapshot {
  appCount: number;
  foregroundKey: string;
  foregroundImmersive: boolean;
  /** Rust 后台 50ms 盯焦点，切外部窗的 unix ms */
  recentSwitchTimesMs: number[];
}

type DeskWeatherHandler = (kind: DeskWeatherKind) => boolean;

const POLL_MS_ACTIVE = 500;

let timer: ReturnType<typeof setInterval> | null = null;
let polling = false;
let handler: DeskWeatherHandler | null = null;
let getConfig: (() => DeskWeatherConfig) | null = null;
let canFire: (() => boolean) | null = null;

let appsChangeCooldownUntil = 0;
let switchBurstCooldownUntil = 0;
let maxDwellCooldownUntil = 0;
/** 启动时记下的应用数基线；每提示一次按 step 挪 */
let appsBaseline: number | null = null;
let immersiveKey = "";
let immersiveSince = 0;
let firedTierMask = 0;
let bootstrapped = false;
let lastConsumedSwitchMs = 0;

async function fetchSnapshot(): Promise<DeskWeatherSnapshot | null> {
  try {
    const raw = (await invoke("get_desk_weather_snapshot")) as DeskWeatherSnapshot;
    return {
      appCount: Number(raw.appCount) || 0,
      foregroundKey: typeof raw.foregroundKey === "string" ? raw.foregroundKey : "",
      foregroundImmersive: Boolean(raw.foregroundImmersive),
      recentSwitchTimesMs: Array.isArray(raw.recentSwitchTimesMs)
        ? raw.recentSwitchTimesMs.map(Number).filter((n) => Number.isFinite(n))
        : [],
    };
  } catch (err) {
    console.warn("[pet] desk weather snapshot failed", err);
    return null;
  }
}

/** 设置页探测用 */
export async function fetchDeskWeatherSnapshot(): Promise<DeskWeatherSnapshot | null> {
  return fetchSnapshot();
}

function tryEmit(
  kind: DeskWeatherKind,
  fired: { value: boolean }
): boolean {
  if (fired.value || !handler || !canFire?.()) return false;
  const ok = handler(kind);
  if (!ok) return false;
  fired.value = true;
  return true;
}

function noteSwitch(
  now: number,
  cfg: DeskWeatherConfig,
  timesMs: number[],
  fired: { value: boolean }
): void {
  if (!cfg.switchBurst.enabled || fired.value) return;
  if (now < switchBurstCooldownUntil) return;
  if (!timesMs.length) return;
  const windowMs = cfg.switchBurst.windowMs;
  const newest = Math.max(...timesMs);
  const fresh = timesMs.filter(
    (t) => t > lastConsumedSwitchMs && newest - t <= windowMs
  );
  if (fresh.length < cfg.switchBurst.switchCount) return;
  if (!tryEmit({ type: "switch-burst" }, fired)) return;
  lastConsumedSwitchMs = Math.max(...fresh);
  switchBurstCooldownUntil = now + cfg.cooldown.switchBurstSec * 1000;
}

function noteApps(
  now: number,
  cfg: DeskWeatherConfig,
  appCount: number,
  timesMs: number[],
  fired: { value: boolean }
): void {
  if (fired.value || !cfg.appsMany.enabled) return;
  if (appsBaseline == null) {
    appsBaseline = appCount;
    return;
  }
  const step = Math.max(1, cfg.appsMany.changeStep);
  const delta = appCount - appsBaseline;
  // ≥ N 就提示（不必刚好等于 N）
  if (Math.abs(delta) < step) return;
  if (now < appsChangeCooldownUntil) return;

  const kind: DeskWeatherKind =
    delta > 0
      ? { type: "apps-up", appCount, delta: Math.abs(delta) }
      : { type: "apps-down", appCount, delta: Math.abs(delta) };

  if (!tryEmit(kind, fired)) return;

  // 提示后钉到当前值；下次再相对这一档累计 ≥ N
  appsBaseline = appCount;
  appsChangeCooldownUntil = now + cfg.cooldown.appsChangeSec * 1000;
  // Win+D 等会连带一串切窗，吃掉，别下一轮又念切窗
  if (timesMs.length) {
    lastConsumedSwitchMs = Math.max(lastConsumedSwitchMs, ...timesMs);
  }
}

function noteImmersive(
  now: number,
  cfg: DeskWeatherConfig,
  key: string,
  immersive: boolean,
  fired: { value: boolean }
): void {
  if (!cfg.maxDwell.enabled) {
    immersiveKey = "";
    immersiveSince = 0;
    firedTierMask = 0;
    return;
  }
  if (!key) return;
  if (!immersive) {
    immersiveKey = "";
    immersiveSince = 0;
    firedTierMask = 0;
    return;
  }
  if (key !== immersiveKey) {
    immersiveKey = key;
    immersiveSince = now;
    firedTierMask = 0;
  }
  if (fired.value || now < maxDwellCooldownUntil) return;
  const dwellSec = Math.floor((now - immersiveSince) / 1000);
  const tiers = cfg.maxDwell.tiersSec;
  for (let i = 0; i < tiers.length; i++) {
    const need = tiers[i]!;
    const bit = 1 << i;
    if (dwellSec < need || (firedTierMask & bit) !== 0) continue;
    const tier = deskWeatherTierIdAt(i);
    if (!tier) continue;
    if (!tryEmit({ type: "max-dwell", tier, dwellSec: need }, fired)) return;
    firedTierMask |= bit;
    if (i === tiers.length - 1) {
      maxDwellCooldownUntil = now + cfg.cooldown.maxDwellAfterTopMin * 60_000;
    }
    return;
  }
}

async function pollOnce(): Promise<void> {
  if (polling || !handler || !getConfig) return;
  const cfg = getConfig();
  if (!cfg.enabled) return;
  polling = true;
  try {
    const snap = await fetchSnapshot();
    if (!snap) return;
    const now = Date.now();
    if (!bootstrapped) {
      bootstrapped = true;
      appsBaseline = snap.appCount;
      if (snap.recentSwitchTimesMs.length) {
        lastConsumedSwitchMs = Math.max(...snap.recentSwitchTimesMs);
      }
      if (snap.foregroundImmersive && snap.foregroundKey) {
        immersiveKey = snap.foregroundKey;
        immersiveSince = now;
      }
      return;
    }
    const fired = { value: false };
    // 同轮优先级：应用增减 > 切窗 > 最大化久待
    noteApps(now, cfg, snap.appCount, snap.recentSwitchTimesMs, fired);
    noteSwitch(now, cfg, snap.recentSwitchTimesMs, fired);
    noteImmersive(
      now,
      cfg,
      snap.foregroundKey,
      snap.foregroundImmersive,
      fired
    );
  } finally {
    polling = false;
  }
}

function armTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (!handler) return;
  timer = setInterval(() => {
    void pollOnce();
  }, POLL_MS_ACTIVE);
}

function resetRuntimeState() {
  appsChangeCooldownUntil = 0;
  switchBurstCooldownUntil = 0;
  maxDwellCooldownUntil = 0;
  appsBaseline = null;
  immersiveKey = "";
  immersiveSince = 0;
  firedTierMask = 0;
  bootstrapped = false;
  lastConsumedSwitchMs = 0;
}

export async function stopDeskWeatherFocusWatch(): Promise<void> {
  try {
    await invoke("stop_desk_weather_watch");
  } catch {
    // 非 Windows / 权限未热更时忽略
  }
}

/** 桌宠 host 是否在轮询（设置页停探测时别误停 Rust 焦点线程） */
export function isPetDeskWeatherPolling(): boolean {
  return timer != null;
}

export function stopPetDeskWeather(): void {
  handler = null;
  getConfig = null;
  canFire = null;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  resetRuntimeState();
  void stopDeskWeatherFocusWatch();
}

export function syncPetDeskWeather(deps: {
  enabled: boolean;
  getConfig: () => DeskWeatherConfig;
  canFire: () => boolean;
  onWeather: DeskWeatherHandler;
}): void {
  if (!deps.enabled) {
    stopPetDeskWeather();
    return;
  }
  getConfig = deps.getConfig;
  canFire = deps.canFire;
  handler = deps.onWeather;
  if (!timer) {
    resetRuntimeState();
    void pollOnce();
    armTimer();
  }
}
