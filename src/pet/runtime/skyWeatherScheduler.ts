/**
 * 窗外天气调度（纯函数 + 可变 runtime 快照）
 * 驱动：固定 > 跟随 > 离线
 */
import {
  NORMAL_WEATHER_POOL,
  type SkyEventId,
  type SkySchedParams,
  type SkyTodId,
  type SkyWeatherConfig,
  type SkyWeatherId,
  type SkyWeatherRuntimeState,
  isEggWeatherId,
  resolveTodFromDate,
  regionWeatherOrFallback,
} from "@/pet/data/skyWeather";

const DAY_TODS = new Set<SkyTodId>(["morning", "noon", "dusk"]);
const NIGHT_TODS = new Set<SkyTodId>(["evening", "night", "predawn"]);
const METEOR_TODS = new Set<SkyTodId>(["evening", "night", "predawn"]);
const WITCH_TODS = new Set<SkyTodId>(["night", "predawn"]);
const RAINBOW_TODS = new Set<SkyTodId>(["morning", "noon", "dusk"]);
const RAINISH = new Set<string>([
  "rain-light", "rain-mid", "rain-heavy", "rain-storm", "thunder", "sleet",
  "hail-light", "hail-mid", "hail-heavy", "hail-storm",
]);
const WINDISH = new Set<string>(["wind-light", "wind-mid", "wind-heavy"]);
const PLANE_BLOCK = new Set<string>([
  "rain-storm", "hail-storm", "snow-blizzard",
  "egg-thunder", "egg-volcano", "egg-tornado", "egg-meteor",
  "egg-sulfur", "wind-typhoon", "egg-solar",
]);

type EggGate = null | "day" | "night" | "rainish" | "windish";

const EGG_DEFS: { id: SkyWeatherId; gate: EggGate }[] = [
  { id: "egg-aurora", gate: null },
  { id: "egg-solar", gate: "day" },
  { id: "egg-lunar", gate: "night" },
  { id: "egg-sulfur", gate: "rainish" },
  { id: "egg-volcano", gate: null },
  { id: "egg-tornado", gate: "windish" },
  { id: "egg-thunder", gate: null },
  { id: "egg-frog", gate: null },
  { id: "egg-diamond", gate: null },
  { id: "egg-meteor", gate: null },
  { id: "wind-typhoon", gate: null },
];

export interface SkyBoost {
  baseAdd: number;
  stepAdd: number;
}

export interface SkyEventDef {
  id: SkyEventId;
  kind: "flyer" | "meteor" | "rainbow";
  weatherOk: (w: SkyWeatherId, rainbowUntil: number, now: number) => boolean;
  todOk: (tod: SkyTodId) => boolean;
  themeBoost: (w: SkyWeatherId, tod: SkyTodId, sched: SkySchedParams) => SkyBoost;
}

export const SKY_EVENT_DEFS: SkyEventDef[] = [
  {
    id: "santa",
    kind: "flyer",
    weatherOk: (w) => w === "snow-blizzard" || w === "snow-heavy",
    todOk: () => true,
    themeBoost: (w, _t, s) =>
      w === "snow-blizzard"
        ? { baseAdd: s.boostSantaBlizzardBase, stepAdd: s.boostSantaBlizzardStep }
        : { baseAdd: 0, stepAdd: 0 },
  },
  {
    id: "plane",
    kind: "flyer",
    weatherOk: (w) => !PLANE_BLOCK.has(w),
    todOk: () => true,
    themeBoost: (w, _t, s) =>
      w === "clear" || w === "cloudy"
        ? { baseAdd: s.boostPlaneFairBase, stepAdd: s.boostPlaneFairStep }
        : { baseAdd: 0, stepAdd: 0 },
  },
  {
    id: "spirit",
    kind: "flyer",
    weatherOk: (w, rainbowUntil, now) =>
      w === "clear"
      || w === "egg-aurora"
      || w === "egg-diamond"
      || w === "egg-meteor"
      || w === "egg-thunder"
      || (w === "cloudy" && rainbowUntil > now),
    todOk: () => true,
    themeBoost: (w, _t, s) => {
      if (w === "egg-aurora" || w === "egg-diamond") {
        return { baseAdd: s.boostSpiritAuroraBase, stepAdd: s.boostSpiritAuroraStep };
      }
      if (w === "egg-meteor" || w === "egg-thunder") {
        return { baseAdd: s.boostSpiritStormBase, stepAdd: s.boostSpiritStormStep };
      }
      return { baseAdd: 0, stepAdd: 0 };
    },
  },
  {
    id: "ufo",
    kind: "flyer",
    weatherOk: () => true,
    todOk: () => true,
    themeBoost: (w, _t, s) =>
      w === "egg-solar" || w === "egg-meteor" || w === "egg-volcano"
      || w === "egg-sulfur" || w === "wind-typhoon"
        ? { baseAdd: s.boostUfoExtremeBase, stepAdd: s.boostUfoExtremeStep }
        : { baseAdd: 0, stepAdd: 0 },
  },
  {
    id: "witch",
    kind: "flyer",
    weatherOk: () => true,
    todOk: (tod) => WITCH_TODS.has(tod),
    themeBoost: (w, tod, s) => {
      let baseAdd = 0;
      let stepAdd = 0;
      if (w === "egg-lunar" || w === "egg-tornado" || w === "egg-frog" || w === "egg-thunder") {
        baseAdd += s.boostWitchThemeBase;
        stepAdd += s.boostWitchThemeStep;
      }
      if (tod === "night" || tod === "predawn") {
        baseAdd += s.boostWitchNightBase;
        stepAdd += s.boostWitchNightStep;
      }
      return { baseAdd, stepAdd };
    },
  },
  {
    id: "meteor",
    kind: "meteor",
    weatherOk: (w) => w !== "egg-meteor",
    todOk: (tod) => METEOR_TODS.has(tod),
    themeBoost: () => ({ baseAdd: 0, stepAdd: 0 }),
  },
  {
    id: "rainbow",
    kind: "rainbow",
    weatherOk: (w) => w === "cloudy",
    todOk: (tod) => RAINBOW_TODS.has(tod),
    themeBoost: () => ({ baseAdd: 0, stepAdd: 0 }),
  },
];

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function rollPct(pct: number, rng = Math.random): boolean {
  return rng() * 100 < clamp(pct, 0, 100);
}

function pickWeighted(
  entries: { id: string; w: number }[],
  rng = Math.random
): string | null {
  const sum = entries.reduce((s, e) => s + Math.max(0, e.w), 0);
  if (sum <= 0) return null;
  let r = rng() * sum;
  for (const e of entries) {
    r -= Math.max(0, e.w);
    if (r <= 0) return e.id;
  }
  return entries[entries.length - 1]?.id ?? null;
}

export function dayRollKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function resolveDisplayTod(cfg: SkyWeatherConfig, now = new Date()): SkyTodId {
  if (cfg.todMode === "fixed" || cfg.todMode === "offline") return cfg.manualTod;
  return resolveTodFromDate(now);
}

export function resolveDisplayWeather(cfg: SkyWeatherConfig): SkyWeatherId {
  const egg = cfg.runtime.eggWeather;
  if (egg && isEggWeatherId(egg)) return egg as SkyWeatherId;
  if (cfg.weatherMode === "fixed" || cfg.weatherMode === "offline") {
    return cfg.manualWeather;
  }
  // sync：已同步用 manualWeather（网络或地区回退写入）；未同步前用地区示意
  if (cfg.runtime.everSynced) return cfg.manualWeather;
  return regionWeatherOrFallback(cfg.regionId).weather;
}

export function rollNormalWeather(
  rt: SkyWeatherRuntimeState,
  sched: SkySchedParams,
  rng = Math.random
): SkyWeatherId {
  const entries = NORMAL_WEATHER_POOL.map((id) => ({
    id,
    w: rt.normalWeights[id] ?? 1,
  }));
  const id = (pickWeighted(entries, rng) || "clear") as SkyWeatherId;
  for (const wid of NORMAL_WEATHER_POOL) {
    if (wid === id) {
      rt.normalWeights[wid] = (rt.normalWeights[wid] ?? 1) * sched.normalWeightDecay;
    } else {
      rt.normalWeights[wid] = 1;
    }
  }
  return id;
}

function eggGateOk(gate: EggGate, weather: SkyWeatherId, tod: SkyTodId): boolean {
  if (!gate) return true;
  if (gate === "day") return DAY_TODS.has(tod);
  if (gate === "night") return NIGHT_TODS.has(tod);
  if (gate === "rainish") return RAINISH.has(weather);
  if (gate === "windish") return WINDISH.has(weather);
  return true;
}

export function rollEggWeather(
  rt: SkyWeatherRuntimeState,
  sched: SkySchedParams,
  baseWeather: SkyWeatherId,
  tod: SkyTodId,
  rng = Math.random
): SkyWeatherId | null {
  const entries = EGG_DEFS.filter((d) => eggGateOk(d.gate, baseWeather, tod)).map((d) => {
    let w = rt.eggWeights[d.id] ?? 1;
    if (rt.eggStreak.id === d.id && rt.eggStreak.n >= sched.eggBanAfterStreak) w = 0;
    return { id: d.id, w };
  });
  const id = pickWeighted(entries, rng) as SkyWeatherId | null;
  if (!id) return null;
  if (rt.eggStreak.id === id) rt.eggStreak.n += 1;
  else {
    if (rt.eggStreak.id && rt.eggStreak.n >= sched.eggBanAfterStreak) {
      rt.eggWeights[rt.eggStreak.id] = 1;
    }
    rt.eggStreak = { id, n: 1 };
  }
  rt.eggWeights[id] = (rt.eggWeights[id] ?? 1) * sched.eggWeightDecay;
  return id;
}

export function eventChancePct(
  def: SkyEventDef,
  weather: SkyWeatherId,
  tod: SkyTodId,
  rt: SkyWeatherRuntimeState,
  sched: SkySchedParams
): number {
  const pity = rt.eventPity[def.id] || { drySec: 0, lastAt: 0 };
  const boost = def.themeBoost(weather, tod, sched);
  const base = sched.eventBasePctPerSec + boost.baseAdd;
  const steps = Math.floor((pity.drySec || 0) / sched.eventPityIntervalSec);
  const step = sched.eventPityStepPct + boost.stepAdd;
  return clamp(base + steps * step, 0, 100);
}

export function markEventMiss(rt: SkyWeatherRuntimeState, id: SkyEventId) {
  const p = rt.eventPity[id] || { drySec: 0, lastAt: 0 };
  p.drySec = (p.drySec || 0) + 1;
  rt.eventPity[id] = p;
}

export function markEventHit(rt: SkyWeatherRuntimeState, id: SkyEventId, sched: SkySchedParams, now: number) {
  rt.eventPity[id] = { drySec: 0, lastAt: now };
  rt.eventCdUntil[id] = now + sched.eventCooldownSec * 1000;
}

/** 无存档/离线启动抽签 */
export function seedOfflineBoot(
  cfg: SkyWeatherConfig,
  rng = Math.random,
  now = Date.now()
): SkyWeatherConfig {
  const next = { ...cfg, runtime: { ...cfg.runtime } };
  const rt = next.runtime;
  if (next.todMode === "offline") {
    rt.offlineIsDay = rng() < 0.55;
    rt.offlinePhaseStartedAt = now;
    next.manualTod = rt.offlineIsDay
      ? rng() < 0.5 ? "morning" : "noon"
      : rng() < 0.5 ? "evening" : "night";
  }
  if (next.weatherMode === "offline" && !rt.eggWeather) {
    next.manualWeather = rollNormalWeather(rt, next.sched, rng);
    rt.lastDayRollKey = dayRollKey(new Date(now));
  }
  return next;
}

export type SkyTickFire = { eventId: SkyEventId; kind: SkyEventDef["kind"] };

export interface SkyTickResult {
  cfg: SkyWeatherConfig;
  fires: SkyTickFire[];
  displayTod: SkyTodId;
  displayWeather: SkyWeatherId;
  rainbowActive: boolean;
}

/**
 * 每秒 tick：离线相位、极端时长/演变、事件 pity
 * flyerSlotUsed：当前飞行物数量（由 UI 传入）
 */
export function tickSkyWeather(
  cfg: SkyWeatherConfig,
  opts: {
    now?: number;
    flyerCount?: number;
    rng?: () => number;
  } = {}
): SkyTickResult {
  const now = opts.now ?? Date.now();
  const rng = opts.rng ?? Math.random;
  const flyerCount = opts.flyerCount ?? 0;
  let next: SkyWeatherConfig = {
    ...cfg,
    runtime: { ...cfg.runtime },
    sched: { ...cfg.sched },
  };
  const rt = next.runtime;
  const sched = next.sched;
  const fires: SkyTickFire[] = [];

  if (rt.rainbowUntil && now >= rt.rainbowUntil) rt.rainbowUntil = 0;

  // 离线相位
  if (next.todMode === "offline" || next.weatherMode === "offline") {
    const dayMs = sched.offlineDayMin * 60 * 1000;
    const nightMs = sched.offlineNightMin * 60 * 1000;
    const need = rt.offlineIsDay ? dayMs : nightMs;
    if (now - (rt.offlinePhaseStartedAt || now) >= need) {
      rt.offlineIsDay = !rt.offlineIsDay;
      rt.offlinePhaseStartedAt = now;
      if (next.todMode === "offline") {
        next.manualTod = rt.offlineIsDay ? "noon" : "night";
      }
      if (
        rt.offlineIsDay
        && next.weatherMode === "offline"
        && !rt.eggWeather
      ) {
        next.manualWeather = rollNormalWeather(rt, sched, rng);
        rt.lastDayRollKey = dayRollKey(new Date(now));
      }
    }
  }

  // 极端时长
  if (rt.eggWeather && rt.eggStartedAt && next.weatherMode !== "fixed") {
    const synced = next.todMode === "sync" || next.weatherMode === "sync";
    if (synced) {
      if (now - rt.eggStartedAt >= sched.eggDurationOnlineSec * 1000) {
        next.manualWeather = isEggWeatherId(rt.eggBaseWeather)
          ? "clear"
          : rt.eggBaseWeather;
        rt.eggWeather = "";
        rt.eggStartedAt = 0;
      }
    } else {
      const tod = resolveDisplayTod(next, new Date(now));
      const key = dayRollKey(new Date(now));
      if (DAY_TODS.has(tod) && rt.eggDayKey && rt.eggDayKey !== key) {
        next.manualWeather = isEggWeatherId(rt.eggBaseWeather)
          ? "clear"
          : rt.eggBaseWeather;
        rt.eggWeather = "";
        rt.eggStartedAt = 0;
      }
    }
  }

  // 演变
  if (next.weatherMode !== "fixed" && !rt.eggWeather) {
    const base = resolveDisplayWeather({ ...next, runtime: { ...rt, eggWeather: "" } });
    if (!isEggWeatherId(base)) {
      const hardMs = sched.hardPityHours * 3600 * 1000;
      const tryEvolve = () => {
        const tod = resolveDisplayTod(next, new Date(now));
        const eggId = rollEggWeather(rt, sched, base, tod, rng);
        if (!eggId) return;
        if (!isEggWeatherId(base)) rt.eggBaseWeather = base;
        rt.eggWeather = eggId;
        rt.eggStartedAt = now;
        rt.eggDayKey = dayRollKey(new Date(now));
        rt.lastExtremeAt = now;
      };
      if (now - (rt.lastExtremeAt || now) >= hardMs) {
        tryEvolve();
      } else if (now - (rt.lastEvolveAt || 0) >= sched.evolveIntervalSec * 1000) {
        rt.lastEvolveAt = now;
        if (rollPct(sched.evolvePct, rng)) tryEvolve();
      }
    }
  }

  const weather = resolveDisplayWeather(next);
  const tod = resolveDisplayTod(next, new Date(now));
  let flyerOpen = flyerCount < sched.flyerMaxConcurrent;
  const order = SKY_EVENT_DEFS.slice().sort(() => rng() - 0.5);
  for (const def of order) {
    if (!def.weatherOk(weather, rt.rainbowUntil, now) || !def.todOk(tod)) continue;
    if ((rt.eventCdUntil[def.id] || 0) > now) continue;
    if (def.kind === "flyer" && !flyerOpen) continue;
    const chance = eventChancePct(def, weather, tod, rt, sched);
    if (rollPct(chance, rng)) {
      markEventHit(rt, def.id, sched, now);
      if (def.kind === "rainbow") {
        rt.rainbowUntil = now + sched.rainbowEventSec * 1000;
      }
      fires.push({ eventId: def.id, kind: def.kind });
      if (def.kind === "flyer") flyerOpen = false;
    } else {
      markEventMiss(rt, def.id);
    }
  }

  return {
    cfg: next,
    fires,
    displayTod: tod,
    displayWeather: resolveDisplayWeather(next),
    rainbowActive: (rt.rainbowUntil || 0) > now,
  };
}

/** 跟随同步成功：写入快照；示意表或 API 天气 */
export function applySkySyncSuccess(
  cfg: SkyWeatherConfig,
  opts: { weather?: SkyWeatherId; tod?: SkyTodId; now?: number }
): SkyWeatherConfig {
  const now = opts.now ?? Date.now();
  const next = { ...cfg, runtime: { ...cfg.runtime } };
  if (next.todMode === "sync") {
    next.manualTod = opts.tod ?? resolveTodFromDate(new Date(now));
  }
  if (next.weatherMode === "sync" && !next.runtime.eggWeather && opts.weather) {
    next.manualWeather = opts.weather;
  }
  next.runtime.everSynced = true;
  next.runtime.lastSyncAt = now;
  next.runtime.snapTod = resolveDisplayTod(next, new Date(now));
  next.runtime.snapWeather = resolveDisplayWeather(next);
  return next;
}
