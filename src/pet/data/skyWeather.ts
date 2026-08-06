/**
 * 窗外天色/天气（与 deskWeather 工位传感无关）
 * 底：跟随地区示意或真气象；极端与特殊事件叠在底上。
 */

export type SkyTodId =
  | "morning"
  | "noon"
  | "dusk"
  | "evening"
  | "night"
  | "predawn";

/** 天色驱动：离线 | 跟随系统钟 | 固定 */
export type SkyTodMode = "offline" | "sync" | "fixed";

/** 天气驱动：离线普通池 | 跟随地区 | 固定 */
export type SkyWeatherMode = "offline" | "sync" | "fixed";

/** 总闸：在线跟随 / 离线本地（地区落到深圳） */
export type SkyLinkMode = "online" | "offline";

export type SkyWeatherId =
  | "clear"
  | "cloudy"
  | "fog-light"
  | "fog-mid"
  | "fog-heavy"
  | "haze"
  | "sandstorm"
  | "rain-light"
  | "rain-mid"
  | "rain-heavy"
  | "rain-storm"
  | "thunder"
  | "sleet"
  | "snow-light"
  | "snow-mid"
  | "snow-heavy"
  | "snow-blizzard"
  | "hail-light"
  | "hail-mid"
  | "hail-heavy"
  | "hail-storm"
  | "wind-light"
  | "wind-mid"
  | "wind-heavy"
  | "egg-aurora"
  | "egg-solar"
  | "egg-lunar"
  | "egg-sulfur"
  | "egg-volcano"
  | "egg-tornado"
  | "egg-thunder"
  | "egg-frog"
  | "egg-diamond"
  | "egg-meteor"
  | "wind-typhoon";

export type SkyEventId =
  | "santa"
  | "plane"
  | "spirit"
  | "ufo"
  | "witch"
  | "meteor"
  | "rainbow";

export interface SkyRegionDef {
  id: string;
  name: string;
  /** 离线/同步失败时的地区示意底天气 */
  weather: SkyWeatherId;
  lat: number;
  lon: number;
  group: string;
}

export interface SkySchedParams {
  eventBasePctPerSec: number;
  eventPityStepPct: number;
  eventPityIntervalSec: number;
  eventCooldownSec: number;
  flyerMaxConcurrent: number;
  evolveIntervalSec: number;
  evolvePct: number;
  hardPityHours: number;
  eggDurationOnlineSec: number;
  eggWeightDecay: number;
  eggBanAfterStreak: number;
  normalWeightDecay: number;
  offlineDayMin: number;
  offlineNightMin: number;
  syncIntervalMin: number;
  rainbowEventSec: number;
  boostSantaBlizzardBase: number;
  boostSantaBlizzardStep: number;
  boostPlaneFairBase: number;
  boostPlaneFairStep: number;
  boostSpiritAuroraBase: number;
  boostSpiritAuroraStep: number;
  boostSpiritStormBase: number;
  boostSpiritStormStep: number;
  boostUfoExtremeBase: number;
  boostUfoExtremeStep: number;
  boostWitchThemeBase: number;
  boostWitchThemeStep: number;
  boostWitchNightBase: number;
  boostWitchNightStep: number;
}

/** 持久化运行时快照（pity / 权重 / 相位） */
export interface SkyWeatherRuntimeState {
  eventPity: Record<string, { drySec: number; lastAt: number }>;
  eventCdUntil: Record<string, number>;
  eggWeights: Record<string, number>;
  eggStreak: { id: string; n: number };
  normalWeights: Record<string, number>;
  lastEvolveAt: number;
  lastExtremeAt: number;
  eggStartedAt: number;
  eggBaseWeather: SkyWeatherId;
  eggDayKey: string;
  offlinePhaseStartedAt: number;
  offlineIsDay: boolean;
  lastDayRollKey: string;
  lastSyncAt: number;
  everSynced: boolean;
  /** 实况天气最近一次是否拉到真气象（失败仍可能用示意表） */
  wxOnline: boolean;
  /** Open-Meteo 今日日出（epoch ms）；0=无 */
  sunRiseAt: number;
  /** Open-Meteo 今日日落（epoch ms）；0=无 */
  sunSetAt: number;
  snapWeather: SkyWeatherId;
  snapTod: SkyTodId;
  rainbowUntil: number;
  /** 当前极端覆盖；空串=无 */
  eggWeather: string;
}

/** 桌宠窗景忙碌收起动效 */
export type SkyPetHideEffect =
  | "vortexHalo"
  | "fade"
  | "suckPoint"
  | "shutter";

export const SKY_PET_HIDE_EFFECTS: SkyPetHideEffect[] = [
  "vortexHalo",
  "fade",
  "suckPoint",
  "shutter",
];

export interface SkyWeatherConfig {
  /** 地区：system = 跟随系统解析；否则城市 id */
  regionId: string;
  todMode: SkyTodMode;
  weatherMode: SkyWeatherMode;
  /** 总闸：在线=跟随系统+系统钟+实况；离线=深圳+双离线 */
  linkMode: SkyLinkMode;
  /** 是否已按首次联网探测落过总闸默认 */
  linkBootstrapped: boolean;
  /** 固定或离线手选天色 */
  manualTod: SkyTodId;
  /** 固定或离线手选天气（非极端） */
  manualWeather: SkyWeatherId;
  /** 投射完整窗景到桌宠主窗；默认关 */
  enableOnPet: boolean;
  /** 桌宠窗景背景不透明度 0..1；默认 1 */
  bgOpacity: number;
  /** 拖拽/飞行/peek 时是否收起窗景；默认开 */
  hideableOnPet: boolean;
  /** 收起动效；默认漩涡光晕 */
  hideEffectOnPet: SkyPetHideEffect;
  sched: SkySchedParams;
  runtime: SkyWeatherRuntimeState;
}

/** tick leader 广播瞬时事件（飞行物等）给镜像窗 */
export const SKY_WEATHER_FIRE_EVENT = "pet://sky-weather-fire";

/** 镜像窗请求 leader 刷新联网 */
export const SKY_WEATHER_REFRESH_EVENT = "pet://sky-weather-refresh";

/** 设置页 / 桌宠 leader 共用落盘防抖 */
export const SKY_WEATHER_PERSIST_DEBOUNCE_MS = 420;

/** 两 leader 共用：schedule 合并；flush 立刻跑（force 时无排队也跑） */
export function createDebouncedPersist(
  run: () => void | Promise<void>,
  delayMs = SKY_WEATHER_PERSIST_DEBOUNCE_MS
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let queued = false;

  function clearTimer() {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
  }

  function schedule() {
    queued = true;
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      if (!queued) return;
      queued = false;
      void run();
    }, delayMs);
  }

  function flush(force = false) {
    clearTimer();
    if (!queued && !force) return;
    queued = false;
    void run();
  }

  function discard() {
    clearTimer();
    queued = false;
  }

  return { schedule, flush, discard };
}

export type SkyWeatherFirePayload = {
  events: SkyEventId[];
  at: number;
};

export const FALLBACK_REGION_ID = "shenzhen";

export const SKY_REGIONS: Record<string, SkyRegionDef> = {
  beijing: { id: "beijing", name: "北京", weather: "haze", lat: 39.9, lon: 116.41, group: "华北" },
  shanghai: { id: "shanghai", name: "上海", weather: "cloudy", lat: 31.23, lon: 121.47, group: "华东" },
  shenzhen: { id: "shenzhen", name: "深圳", weather: "rain-storm", lat: 22.54, lon: 114.06, group: "华南" },
  guangzhou: { id: "guangzhou", name: "广州", weather: "rain-light", lat: 23.13, lon: 113.26, group: "华南" },
  hangzhou: { id: "hangzhou", name: "杭州", weather: "rain-light", lat: 30.27, lon: 120.15, group: "华东" },
  chengdu: { id: "chengdu", name: "成都", weather: "fog-mid", lat: 30.57, lon: 104.07, group: "西南" },
  wuhan: { id: "wuhan", name: "武汉", weather: "thunder", lat: 30.59, lon: 114.31, group: "华中" },
  xian: { id: "xian", name: "西安", weather: "cloudy", lat: 34.34, lon: 108.94, group: "西北" },
  harbin: { id: "harbin", name: "哈尔滨", weather: "snow-heavy", lat: 45.75, lon: 126.65, group: "东北" },
  hongkong: { id: "hongkong", name: "香港", weather: "rain-storm", lat: 22.32, lon: 114.17, group: "港澳台" },
};

export const NORMAL_WEATHER_POOL: SkyWeatherId[] = [
  "clear", "cloudy",
  "fog-light", "fog-mid", "fog-heavy", "haze", "sandstorm",
  "rain-light", "rain-mid", "rain-heavy", "rain-storm", "thunder", "sleet",
  "snow-light", "snow-mid", "snow-heavy", "snow-blizzard",
  "hail-light", "hail-mid", "hail-heavy", "hail-storm",
  "wind-light", "wind-mid", "wind-heavy",
];

export const EGG_WEATHER_IDS: SkyWeatherId[] = [
  "egg-aurora", "egg-solar", "egg-lunar", "egg-sulfur", "egg-volcano",
  "egg-tornado", "egg-thunder", "egg-frog", "egg-diamond", "egg-meteor", "wind-typhoon",
];

const DEFAULT_SKY_SCHED: SkySchedParams = {
  eventBasePctPerSec: 1,
  eventPityStepPct: 0.5,
  eventPityIntervalSec: 60,
  eventCooldownSec: 90,
  flyerMaxConcurrent: 1,
  evolveIntervalSec: 600,
  evolvePct: 1,
  hardPityHours: 12,
  eggDurationOnlineSec: 1200,
  eggWeightDecay: 0.2,
  eggBanAfterStreak: 3,
  normalWeightDecay: 0.9,
  offlineDayMin: 10,
  offlineNightMin: 10,
  syncIntervalMin: 30,
  rainbowEventSec: 45,
  boostSantaBlizzardBase: 0.5,
  boostSantaBlizzardStep: 0.5,
  boostPlaneFairBase: 0.5,
  boostPlaneFairStep: 0.5,
  boostSpiritAuroraBase: 2,
  boostSpiritAuroraStep: 2,
  boostSpiritStormBase: 0.5,
  boostSpiritStormStep: 0.5,
  boostUfoExtremeBase: 2,
  boostUfoExtremeStep: 2,
  boostWitchThemeBase: 2,
  boostWitchThemeStep: 2,
  boostWitchNightBase: 0.5,
  boostWitchNightStep: 0.5,
};

function clampNum(n: number, lo: number, hi: number, fb: number): number {
  if (!Number.isFinite(n)) return fb;
  return Math.min(hi, Math.max(lo, n));
}

function emptyRuntime(now = Date.now()): SkyWeatherRuntimeState {
  const normalWeights: Record<string, number> = {};
  for (const id of NORMAL_WEATHER_POOL) normalWeights[id] = 1;
  const eggWeights: Record<string, number> = {};
  for (const id of EGG_WEATHER_IDS) eggWeights[id] = 1;
  return {
    eventPity: {},
    eventCdUntil: {},
    eggWeights,
    eggStreak: { id: "", n: 0 },
    normalWeights,
    lastEvolveAt: now,
    lastExtremeAt: now,
    eggStartedAt: 0,
    eggBaseWeather: "clear",
    eggDayKey: "",
    offlinePhaseStartedAt: now,
    offlineIsDay: true,
    lastDayRollKey: "",
    lastSyncAt: 0,
    everSynced: false,
    wxOnline: false,
    sunRiseAt: 0,
    sunSetAt: 0,
    snapWeather: "clear",
    snapTod: "noon",
    rainbowUntil: 0,
    eggWeather: "",
  };
}

function normalizeSkySched(raw: unknown): SkySchedParams {
  const d = DEFAULT_SKY_SCHED;
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const n = (k: keyof SkySchedParams, lo: number, hi: number) =>
    clampNum(Number(o[k] ?? d[k]), lo, hi, d[k]);
  return {
    eventBasePctPerSec: n("eventBasePctPerSec", 0, 20),
    eventPityStepPct: n("eventPityStepPct", 0, 10),
    eventPityIntervalSec: n("eventPityIntervalSec", 5, 600),
    eventCooldownSec: n("eventCooldownSec", 0, 600),
    flyerMaxConcurrent: n("flyerMaxConcurrent", 1, 3),
    evolveIntervalSec: n("evolveIntervalSec", 60, 3600),
    evolvePct: n("evolvePct", 0, 20),
    hardPityHours: n("hardPityHours", 1, 72),
    eggDurationOnlineSec: n("eggDurationOnlineSec", 60, 7200),
    eggWeightDecay: n("eggWeightDecay", 0.05, 1),
    eggBanAfterStreak: n("eggBanAfterStreak", 1, 5),
    normalWeightDecay: n("normalWeightDecay", 0.5, 1),
    offlineDayMin: n("offlineDayMin", 1, 120),
    offlineNightMin: n("offlineNightMin", 1, 120),
    syncIntervalMin: n("syncIntervalMin", 5, 180),
    rainbowEventSec: n("rainbowEventSec", 10, 300),
    boostSantaBlizzardBase: n("boostSantaBlizzardBase", 0, 10),
    boostSantaBlizzardStep: n("boostSantaBlizzardStep", 0, 10),
    boostPlaneFairBase: n("boostPlaneFairBase", 0, 10),
    boostPlaneFairStep: n("boostPlaneFairStep", 0, 10),
    boostSpiritAuroraBase: n("boostSpiritAuroraBase", 0, 10),
    boostSpiritAuroraStep: n("boostSpiritAuroraStep", 0, 10),
    boostSpiritStormBase: n("boostSpiritStormBase", 0, 10),
    boostSpiritStormStep: n("boostSpiritStormStep", 0, 10),
    boostUfoExtremeBase: n("boostUfoExtremeBase", 0, 10),
    boostUfoExtremeStep: n("boostUfoExtremeStep", 0, 10),
    boostWitchThemeBase: n("boostWitchThemeBase", 0, 10),
    boostWitchThemeStep: n("boostWitchThemeStep", 0, 10),
    boostWitchNightBase: n("boostWitchNightBase", 0, 10),
    boostWitchNightStep: n("boostWitchNightStep", 0, 10),
  };
}

const TOD_SET = new Set<string>(["morning", "noon", "dusk", "evening", "night", "predawn"]);
const MODE_SET = new Set<string>(["offline", "sync", "fixed"]);
const WEATHER_SET = new Set<string>([...NORMAL_WEATHER_POOL, ...EGG_WEATHER_IDS]);
const HIDE_EFFECT_SET = new Set<string>(SKY_PET_HIDE_EFFECTS);

export function isEggWeatherId(id: string): boolean {
  return EGG_WEATHER_IDS.includes(id as SkyWeatherId);
}

export function normalizeSkyPetHideEffect(raw: unknown): SkyPetHideEffect {
  const s = String(raw || "");
  return HIDE_EFFECT_SET.has(s) ? (s as SkyPetHideEffect) : "vortexHalo";
}

export function normalizeSkyWeather(raw: unknown): SkyWeatherConfig {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const todMode = MODE_SET.has(String(o.todMode)) ? (o.todMode as SkyTodMode) : "offline";
  const weatherMode = MODE_SET.has(String(o.weatherMode))
    ? (o.weatherMode as SkyWeatherMode)
    : "offline";
  const manualTod = TOD_SET.has(String(o.manualTod)) ? (o.manualTod as SkyTodId) : "morning";
  let manualWeather = String(o.manualWeather || "clear");
  if (!WEATHER_SET.has(manualWeather) || manualWeather === "rainbow") manualWeather = "clear";
  const linkMode: SkyLinkMode = o.linkMode === "online" ? "online" : "offline";
  // 旧档无此字段：视为已落过，避免升级后被首次探测盖掉用户选择
  const linkBootstrapped =
    "linkBootstrapped" in o
      ? Boolean(o.linkBootstrapped)
      : Object.keys(o).length > 0;
  let regionId = String(
    o.regionId || (linkMode === "online" ? "system" : FALLBACK_REGION_ID)
  );
  if (regionId !== "system" && !SKY_REGIONS[regionId]) regionId = FALLBACK_REGION_ID;

  const rtRaw = o.runtime && typeof o.runtime === "object"
    ? (o.runtime as Record<string, unknown>)
    : {};
  const baseRt = emptyRuntime();
  const runtime: SkyWeatherRuntimeState = {
    ...baseRt,
    ...rtRaw,
    eventPity: (rtRaw.eventPity as SkyWeatherRuntimeState["eventPity"]) || {},
    eventCdUntil: (rtRaw.eventCdUntil as SkyWeatherRuntimeState["eventCdUntil"]) || {},
    eggWeights: { ...baseRt.eggWeights, ...(rtRaw.eggWeights as object || {}) },
    normalWeights: { ...baseRt.normalWeights, ...(rtRaw.normalWeights as object || {}) },
    eggStreak: (rtRaw.eggStreak as SkyWeatherRuntimeState["eggStreak"]) || baseRt.eggStreak,
    eggWeather: typeof rtRaw.eggWeather === "string" ? rtRaw.eggWeather : "",
    eggBaseWeather: WEATHER_SET.has(String(rtRaw.eggBaseWeather))
      ? (rtRaw.eggBaseWeather as SkyWeatherId)
      : "clear",
    snapWeather: WEATHER_SET.has(String(rtRaw.snapWeather))
      ? (rtRaw.snapWeather as SkyWeatherId)
      : "clear",
    snapTod: TOD_SET.has(String(rtRaw.snapTod)) ? (rtRaw.snapTod as SkyTodId) : "noon",
    wxOnline: Boolean(rtRaw.wxOnline),
    sunRiseAt: clampNum(Number(rtRaw.sunRiseAt ?? 0), 0, Number.MAX_SAFE_INTEGER, 0),
    sunSetAt: clampNum(Number(rtRaw.sunSetAt ?? 0), 0, Number.MAX_SAFE_INTEGER, 0),
  };

  return {
    regionId,
    todMode,
    weatherMode,
    linkMode,
    linkBootstrapped,
    manualTod,
    manualWeather: manualWeather as SkyWeatherId,
    enableOnPet: "enableOnPet" in o ? Boolean(o.enableOnPet) : false,
    bgOpacity: clampNum(Number(o.bgOpacity ?? 1), 0, 1, 1),
    hideableOnPet: "hideableOnPet" in o ? Boolean(o.hideableOnPet) : true,
    hideEffectOnPet: normalizeSkyPetHideEffect(o.hideEffectOnPet),
    sched: normalizeSkySched(o.sched),
    runtime,
  };
}

export const DEFAULT_SKY_WEATHER: SkyWeatherConfig = normalizeSkyWeather({
  regionId: FALLBACK_REGION_ID,
  todMode: "offline",
  weatherMode: "offline",
  linkMode: "offline",
  linkBootstrapped: false,
  manualTod: "morning",
  manualWeather: "clear",
  enableOnPet: false,
  bgOpacity: 1,
  hideableOnPet: true,
  hideEffectOnPet: "vortexHalo",
});

/** 系统钟 → 天色（无日照数据时的回退） */
export function resolveTodFromDate(date = new Date()): SkyTodId {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 5 && h < 10) return "morning";
  if (h >= 10 && h < 16.5) return "noon";
  if (h >= 16.5 && h < 19) return "dusk";
  if (h >= 19 && h < 22) return "evening";
  if (h >= 22 || h < 2) return "night";
  return "predawn";
}

/**
 * 按当地日出日落切天色；无效则回退 resolveTodFromDate。
 * 白天按时长比例切晨/午/暮，日落后 evening→night，日出前 predawn。
 */
export function resolveTodFromSun(
  date: Date,
  sunRiseAt: number,
  sunSetAt: number
): SkyTodId {
  if (
    !Number.isFinite(sunRiseAt)
    || !Number.isFinite(sunSetAt)
    || sunRiseAt <= 0
    || sunSetAt <= 0
    || sunSetAt <= sunRiseAt
  ) {
    return resolveTodFromDate(date);
  }
  const t = date.getTime();
  const dayLen = sunSetAt - sunRiseAt;
  const predawnMs = 90 * 60 * 1000;
  const eveningMs = 120 * 60 * 1000;
  if (t < sunRiseAt - predawnMs) return "night";
  if (t < sunRiseAt) return "predawn";
  if (t < sunRiseAt + dayLen * 0.28) return "morning";
  if (t < sunRiseAt + dayLen * 0.72) return "noon";
  if (t < sunSetAt) return "dusk";
  if (t < sunSetAt + eveningMs) return "evening";
  return "night";
}

/**
 * Open-Meteo `timezone=auto` 常返回无偏移本地 ISO（如 `2026-06-01T06:00`）。
 * 无 Z/偏移时按运行环境本地墙钟解析；带 Z/偏移按 UTC/偏移。失败回 0。
 */
export function parseOpenMeteoIso(iso: string | undefined | null): number {
  if (!iso || typeof iso !== "string") return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function resolveRegionByTimezone(): { id: string; source: string } {
  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    /* ignore */
  }
  const hint: Record<string, string> = {
    "Asia/Shanghai": "shanghai",
    "Asia/Chongqing": "chengdu",
    "Asia/Harbin": "harbin",
    "Asia/Hong_Kong": "hongkong",
    "Asia/Urumqi": "xian",
  };
  if (hint[tz] && SKY_REGIONS[hint[tz]]) return { id: hint[tz], source: "时区" };
  const offMin = -new Date().getTimezoneOffset();
  if (offMin === 480) return { id: "shanghai", source: "时区" };
  const lang = (navigator.language || "").toLowerCase();
  if (lang.includes("zh-hk")) return { id: "hongkong", source: "语言" };
  if (lang.startsWith("zh")) return { id: "shanghai", source: "语言" };
  return { id: FALLBACK_REGION_ID, source: "失败回退" };
}

export function nearestSkyRegion(lat: number, lon: number): string {
  let best = FALLBACK_REGION_ID;
  let bestD = Infinity;
  for (const r of Object.values(SKY_REGIONS)) {
    const d = (r.lat - lat) ** 2 + (r.lon - lon) ** 2;
    if (d < bestD) {
      bestD = d;
      best = r.id;
    }
  }
  return best;
}

/**
 * 示意城天气；`system` 时用调用方传入的定位城（runtime peek），否则时区粗估。
 * 不在 data 层持有可变全局，避免 runtime 副作用倒灌。
 */
export function regionWeatherOrFallback(
  regionId: string,
  systemResolvedId?: string | null
): {
  ok: boolean;
  weather: SkyWeatherId;
  regionId: string;
} {
  if (regionId === "system") {
    const id =
      systemResolvedId && SKY_REGIONS[systemResolvedId]
        ? systemResolvedId
        : resolveRegionByTimezone().id;
    const r = SKY_REGIONS[id] || SKY_REGIONS[FALLBACK_REGION_ID]!;
    return { ok: true, weather: r.weather, regionId: r.id };
  }
  if (SKY_REGIONS[regionId]) {
    const r = SKY_REGIONS[regionId]!;
    return { ok: true, weather: r.weather, regionId: r.id };
  }
  const r = SKY_REGIONS[FALLBACK_REGION_ID]!;
  return { ok: false, weather: r.weather, regionId: r.id };
}
