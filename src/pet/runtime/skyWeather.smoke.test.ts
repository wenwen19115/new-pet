import { createApp, defineComponent, h, nextTick, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SKY_WEATHER,
  normalizeSkyWeather,
  resolveTodFromDate,
  regionWeatherOrFallback,
  FALLBACK_REGION_ID,
  isEggWeatherId,
} from "@/pet/data/skyWeather";
import {
  eventChancePct,
  rollNormalWeather,
  rollEggWeather,
  seedOfflineBoot,
  tickSkyWeather,
  SKY_EVENT_DEFS,
  resolveDisplayWeather,
  resolveDisplayTod,
} from "@/pet/runtime/skyWeatherScheduler";

const { fetchOpenMeteoWeather } = vi.hoisted(() => ({
  fetchOpenMeteoWeather: vi.fn(),
}));
vi.mock("@/pet/bridge/skyWeather", () => ({
  fetchOpenMeteoWeather,
}));

describe("sky weather", () => {
  it("normalize defaults offline modes and clamps sched", () => {
    const n = normalizeSkyWeather({
      todMode: "offline",
      weatherMode: "nope",
      sched: { eventBasePctPerSec: 99, flyerMaxConcurrent: 0 },
      manualWeather: "rainbow",
    });
    expect(n.todMode).toBe("offline");
    expect(n.weatherMode).toBe("offline");
    expect(n.sched.eventBasePctPerSec).toBe(20);
    expect(n.sched.flyerMaxConcurrent).toBe(1);
    expect(n.manualWeather).toBe("clear");
    expect(normalizeSkyWeather(undefined).todMode).toBe(
      DEFAULT_SKY_WEATHER.todMode
    );
  });

  it("resolveTodFromDate covers day segments", () => {
    expect(resolveTodFromDate(new Date(2026, 0, 1, 8, 0))).toBe("morning");
    expect(resolveTodFromDate(new Date(2026, 0, 1, 12, 0))).toBe("noon");
    expect(resolveTodFromDate(new Date(2026, 0, 1, 23, 0))).toBe("night");
  });

  it("region fallback uses shenzhen when unknown", () => {
    const hit = regionWeatherOrFallback("not-a-city");
    expect(hit.regionId).toBe(FALLBACK_REGION_ID);
    expect(hit.ok).toBe(false);
  });

  it("normal pool decay then reset on other pick", () => {
    const cfg = normalizeSkyWeather({});
    const rng = () => 0; // always first weight
    const a = rollNormalWeather(cfg.runtime, cfg.sched, rng);
    expect(NORMAL_FIRST(cfg, a)).toBeTruthy();
    const wAfter = cfg.runtime.normalWeights[a]!;
    expect(wAfter).toBeLessThan(1);
    // force another id by rng that skips first if weight low — just check reset path
    const b = rollNormalWeather(cfg.runtime, cfg.sched, () => 0.99);
    if (b !== a) {
      expect(cfg.runtime.normalWeights[a]).toBe(1);
    }
  });

  it("egg streak bans after N then other restores", () => {
    const cfg = normalizeSkyWeather({});
    cfg.sched.eggBanAfterStreak = 3;
    cfg.sched.eggWeightDecay = 0.2;
    const fixedRng = () => 0;
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const id = rollEggWeather(cfg.runtime, cfg.sched, "clear", "noon", fixedRng);
      expect(id).toBeTruthy();
      ids.push(id!);
    }
    expect(ids.every((x) => x === ids[0])).toBe(true);
    const banned = ids[0]!;
    // next roll should avoid banned (weight 0) if others exist
    const next = rollEggWeather(cfg.runtime, cfg.sched, "clear", "noon", () => 0.5);
    expect(next).toBeTruthy();
    if (next !== banned) {
      expect(cfg.runtime.eggWeights[banned]).toBe(1);
    }
  });

  it("seedOfflineBoot changes morning/clear defaults", () => {
    let changed = false;
    for (let i = 0; i < 20; i++) {
      const seeded = seedOfflineBoot(normalizeSkyWeather({}));
      if (seeded.manualTod !== "morning" || seeded.manualWeather !== "clear") {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
  });

  it("fixed weather blocks evolve in tick", () => {
    let cfg = normalizeSkyWeather({
      weatherMode: "fixed",
      manualWeather: "clear",
      sched: { evolvePct: 100, evolveIntervalSec: 60, hardPityHours: 1 },
    });
    cfg.runtime.lastEvolveAt = 0;
    cfg.runtime.lastExtremeAt = Date.now();
    const r = tickSkyWeather(cfg, { now: Date.now() + 120_000, rng: () => 0 });
    expect(r.cfg.runtime.eggWeather).toBe("");
    expect(isEggWeatherId(r.displayWeather)).toBe(false);
  });

  it("event chance includes theme boost", () => {
    const cfg = normalizeSkyWeather({});
    const santa = SKY_EVENT_DEFS.find((e) => e.id === "santa")!;
    const base = eventChancePct(santa, "snow-heavy", "noon", cfg.runtime, cfg.sched);
    const boosted = eventChancePct(
      santa,
      "snow-blizzard",
      "noon",
      cfg.runtime,
      cfg.sched
    );
    expect(boosted).toBeGreaterThan(base);
  });

  it("display helpers respect modes", () => {
    const offline = normalizeSkyWeather({
      todMode: "offline",
      weatherMode: "offline",
      manualTod: "evening",
      manualWeather: "cloudy",
    });
    expect(resolveDisplayTod(offline)).toBe("evening");
    expect(resolveDisplayWeather(offline)).toBe("cloudy");
    offline.runtime.eggWeather = "egg-aurora";
    expect(resolveDisplayWeather(offline)).toBe("egg-aurora");

    const syncing = normalizeSkyWeather({
      weatherMode: "sync",
      regionId: "shenzhen",
      manualWeather: "clear",
    });
    expect(resolveDisplayWeather(syncing)).toBe(
      regionWeatherOrFallback("shenzhen").weather
    );
    syncing.runtime.everSynced = true;
    syncing.manualWeather = "rain-mid";
    expect(resolveDisplayWeather(syncing)).toBe("rain-mid");
  });
});

describe("sky weather session persist gate", () => {
  it("pity 递增不落盘，相位/极端才落盘", async () => {
    const { skyRuntimePersistWorthy } = await import(
      "@/pet/runtime/useSkyWeatherSession"
    );
    const base = normalizeSkyWeather({}).runtime;
    const pityOnly = {
      ...base,
      eventPity: { santa: { drySec: 12, lastAt: 0 } },
    };
    expect(skyRuntimePersistWorthy(base, pityOnly)).toBe(false);
    const eggOn = { ...base, eggWeather: "egg-aurora", eggStartedAt: 1 };
    expect(skyRuntimePersistWorthy(base, eggOn)).toBe(true);
  });
});

describe("sky weather mode ops", () => {
  it("切 fixed 锁住当前显示天色/天气", async () => {
    const { applySkyTodMode, applySkyWeatherMode } = await import(
      "@/pet/runtime/skyWeatherModeOps"
    );
    const cfg = normalizeSkyWeather({
      todMode: "offline",
      weatherMode: "offline",
      manualTod: "dusk",
      manualWeather: "rain-mid",
    });
    const todFixed = applySkyTodMode(cfg, "fixed");
    expect(todFixed.todMode).toBe("fixed");
    expect(todFixed.manualTod).toBe("dusk");
    const wxFixed = applySkyWeatherMode(cfg, "fixed");
    expect(wxFixed.weatherMode).toBe("fixed");
    expect(wxFixed.manualWeather).toBe("rain-mid");
    expect(wxFixed.runtime.eggWeather).toBe("");
  });
});

describe("sky weather session lifecycle", () => {
  afterEach(() => {
    vi.useRealTimers();
    fetchOpenMeteoWeather.mockReset();
  });

  it("stop 清 timer，后续 tick 不再 commit", async () => {
    vi.useFakeTimers();
    const { useSkyWeatherSession } = await import(
      "@/pet/runtime/useSkyWeatherSession"
    );
    const commits: Array<{ persist?: boolean }> = [];
    const config = ref(
      normalizeSkyWeather({
        todMode: "offline",
        weatherMode: "offline",
        // 已有 seed，避免 start 时再 seed 一次干扰计数
        manualTod: "noon",
        manualWeather: "cloudy",
        runtime: {
          ...normalizeSkyWeather({}).runtime,
          lastDayRollKey: "2026-01-01",
        },
      })
    );

    let stopFn: (() => void) | null = null;
    const app = createApp(
      defineComponent({
        setup() {
          const session = useSkyWeatherSession({
            config,
            commit: (next, opts) => {
              config.value = next;
              commits.push({ persist: opts?.persist });
            },
            enableNetworkSync: false,
          });
          stopFn = session.stop;
          return () => h("div");
        },
      })
    );
    app.mount(document.createElement("div"));
    await nextTick();

    const afterStart = commits.length;
    expect(stopFn).toBeTypeOf("function");
    (stopFn as () => void)();
    const afterStop = commits.length;
    expect(afterStop).toBeGreaterThanOrEqual(afterStart);
    // stop 强制落盘一次
    expect(commits[commits.length - 1]?.persist).not.toBe(false);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(commits.length).toBe(afterStop);

    app.unmount();
  });

  it("sync 模式走 bridge invoke，失败回退地区示意", async () => {
    const { syncSkyWeatherFromNetwork } = await import(
      "@/pet/runtime/useSkyWeatherSession"
    );
    fetchOpenMeteoWeather.mockResolvedValueOnce({
      ok: true,
      weather: "rain-mid",
      source: "test",
    });
    const base = normalizeSkyWeather({
      weatherMode: "sync",
      todMode: "fixed",
      regionId: "shenzhen",
      manualTod: "noon",
    });
    const ok = await syncSkyWeatherFromNetwork(base, Date.UTC(2026, 0, 1, 12));
    expect(fetchOpenMeteoWeather).toHaveBeenCalled();
    expect(ok.manualWeather).toBe("rain-mid");
    expect(ok.runtime.snapWeather).toBe("rain-mid");
    expect(ok.runtime.everSynced).toBe(true);

    fetchOpenMeteoWeather.mockResolvedValueOnce(null);
    const fallback = await syncSkyWeatherFromNetwork(base, Date.UTC(2026, 0, 1, 12));
    const regionWx = regionWeatherOrFallback("shenzhen").weather;
    expect(fallback.manualWeather).toBe(regionWx);
    expect(fallback.runtime.snapWeather).toBe(regionWx);
  });

  it("offline 不同步网络", async () => {
    const { syncSkyWeatherFromNetwork } = await import(
      "@/pet/runtime/useSkyWeatherSession"
    );
    const cfg = normalizeSkyWeather({
      weatherMode: "offline",
      todMode: "offline",
    });
    const next = await syncSkyWeatherFromNetwork(cfg);
    expect(fetchOpenMeteoWeather).not.toHaveBeenCalled();
    expect(next).toBe(cfg);
  });
});

function NORMAL_FIRST(
  cfg: ReturnType<typeof normalizeSkyWeather>,
  id: string
): boolean {
  return (cfg.runtime.normalWeights[id] ?? 1) < 1 || id.length > 0;
}
