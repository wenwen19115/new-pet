export type DeskWeatherMaxDwellTierId = "30s" | "3m";

export interface DeskWeatherAppsManyConfig {
  enabled: boolean;
  /** 相对基线增减 ≥N 才提示；启动只记基线 */
  changeStep: number;
}

export interface DeskWeatherSwitchBurstConfig {
  enabled: boolean;
  windowMs: number;
  switchCount: number;
}

export interface DeskWeatherMaxDwellConfig {
  enabled: boolean;
  tiersSec: number[];
}

export interface DeskWeatherCooldownConfig {
  /** 秒；0 = 不休眠 */
  appsChangeSec: number;
  /** 秒；0 = 不休眠 */
  switchBurstSec: number;
  /** 分钟 */
  maxDwellAfterTopMin: number;
}

export interface DeskWeatherConfig {
  enabled: boolean;
  appsMany: DeskWeatherAppsManyConfig;
  switchBurst: DeskWeatherSwitchBurstConfig;
  maxDwell: DeskWeatherMaxDwellConfig;
  cooldown: DeskWeatherCooldownConfig;
}

export type DeskWeatherKind =
  | { type: "apps-up"; appCount: number; delta: number }
  | { type: "apps-down"; appCount: number; delta: number }
  | { type: "switch-burst" }
  | {
      type: "max-dwell";
      tier: DeskWeatherMaxDwellTierId;
      dwellSec: number;
    };

export const DEFAULT_DESK_WEATHER: DeskWeatherConfig = {
  enabled: true,
  appsMany: {
    enabled: true,
    changeStep: 3,
  },
  switchBurst: {
    enabled: true,
    windowMs: 3000,
    switchCount: 3,
  },
  maxDwell: {
    enabled: true,
    tiersSec: [30, 180],
  },
  cooldown: {
    appsChangeSec: 10,
    switchBurstSec: 10,
    maxDwellAfterTopMin: 10,
  },
};

const TIER_IDS: DeskWeatherMaxDwellTierId[] = ["30s", "3m"];

export function deskWeatherTierIdAt(
  index: number
): DeskWeatherMaxDwellTierId | null {
  return TIER_IDS[index] ?? null;
}

function clampInt(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeAppsMany(raw: unknown): DeskWeatherAppsManyConfig {
  const d = DEFAULT_DESK_WEATHER.appsMany;
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    enabled: o.enabled === undefined ? d.enabled : Boolean(o.enabled),
    changeStep: clampInt(Number(o.changeStep ?? d.changeStep), 1, 10, d.changeStep),
  };
}

function normalizeSwitchBurst(raw: unknown): DeskWeatherSwitchBurstConfig {
  const d = DEFAULT_DESK_WEATHER.switchBurst;
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    enabled: o.enabled === undefined ? d.enabled : Boolean(o.enabled),
    windowMs: clampInt(Number(o.windowMs ?? d.windowMs), 1000, 10000, d.windowMs),
    switchCount: clampInt(
      Number(o.switchCount ?? d.switchCount),
      2,
      8,
      d.switchCount
    ),
  };
}

function normalizeMaxDwell(raw: unknown): DeskWeatherMaxDwellConfig {
  const d = DEFAULT_DESK_WEATHER.maxDwell;
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const tiersRaw = Array.isArray(o.tiersSec) ? o.tiersSec.map(Number) : [];
  let a = d.tiersSec[0]!;
  let b = d.tiersSec[1]!;
  if (tiersRaw.length >= 2) {
    a = tiersRaw[0]!;
    b = tiersRaw[1]!;
  } else if (tiersRaw.length === 1) {
    a = tiersRaw[0]!;
    b = Math.max(a + 1, d.tiersSec[1]!);
  }
  a = clampInt(a, 5, 3600, d.tiersSec[0]!);
  b = clampInt(b, a + 1, 3600, Math.max(a + 1, d.tiersSec[1]!));
  return {
    enabled: o.enabled === undefined ? d.enabled : Boolean(o.enabled),
    tiersSec: [a, b],
  };
}

function normalizeCooldown(raw: unknown): DeskWeatherCooldownConfig {
  const d = DEFAULT_DESK_WEATHER.cooldown;
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    appsChangeSec: clampInt(
      Number(o.appsChangeSec ?? d.appsChangeSec),
      0,
      600,
      d.appsChangeSec
    ),
    switchBurstSec: clampInt(
      Number(o.switchBurstSec ?? d.switchBurstSec),
      0,
      600,
      d.switchBurstSec
    ),
    maxDwellAfterTopMin: clampInt(
      Number(o.maxDwellAfterTopMin ?? d.maxDwellAfterTopMin),
      5,
      120,
      d.maxDwellAfterTopMin
    ),
  };
}

export function normalizeDeskWeather(raw: unknown): DeskWeatherConfig {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    enabled: o.enabled === undefined ? DEFAULT_DESK_WEATHER.enabled : Boolean(o.enabled),
    appsMany: normalizeAppsMany(o.appsMany),
    switchBurst: normalizeSwitchBurst(o.switchBurst),
    maxDwell: normalizeMaxDwell(o.maxDwell),
    cooldown: normalizeCooldown(o.cooldown),
  };
}
