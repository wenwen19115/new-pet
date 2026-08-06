import { createApp, defineComponent, h, nextTick, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDebouncedPersist,
  DEFAULT_SKY_WEATHER,
  normalizeSkyWeather,
  normalizeSkyPetHideEffect,
  SKY_PET_HIDE_EFFECTS,
  resolveTodFromDate,
  resolveTodFromSun,
  parseOpenMeteoIso,
  regionWeatherOrFallback,
  nearestSkyRegion,
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
import {
  clearSystemRegionCache,
  peekSystemRegionId,
  resolveSystemRegion,
} from "@/pet/runtime/skyWeatherSystemRegion";

const { fetchOpenMeteoWeather, fetchClientGeo } = vi.hoisted(() => ({
  fetchOpenMeteoWeather: vi.fn(),
  fetchClientGeo: vi.fn(),
}));
vi.mock("@/pet/bridge/skyWeather", () => ({
  fetchOpenMeteoWeather,
  fetchClientGeo,
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
    // 地区默认：未指定时随 linkMode；出厂离线落深圳
    expect(DEFAULT_SKY_WEATHER.regionId).toBe(FALLBACK_REGION_ID);
    expect(DEFAULT_SKY_WEATHER.linkMode).toBe("offline");
    expect(normalizeSkyWeather(undefined).regionId).toBe(FALLBACK_REGION_ID);
    expect(normalizeSkyWeather({}).regionId).toBe(FALLBACK_REGION_ID);
    expect(normalizeSkyWeather({ linkMode: "online" }).regionId).toBe("system");
    expect(DEFAULT_SKY_WEATHER.enableOnPet).toBe(false);
    expect(DEFAULT_SKY_WEATHER.bgOpacity).toBe(1);
    expect(DEFAULT_SKY_WEATHER.hideableOnPet).toBe(true);
    expect(DEFAULT_SKY_WEATHER.hideEffectOnPet).toBe("vortexHalo");
    expect(normalizeSkyWeather({}).enableOnPet).toBe(false);
    expect(normalizeSkyWeather({}).hideableOnPet).toBe(true);
    expect(normalizeSkyWeather({ enableOnPet: true, bgOpacity: 0.4 }).enableOnPet).toBe(
      true
    );
    expect(normalizeSkyWeather({ bgOpacity: 2 }).bgOpacity).toBe(1);
    expect(normalizeSkyWeather({ bgOpacity: -1 }).bgOpacity).toBe(0);
    expect(
      normalizeSkyWeather({ hideableOnPet: false, hideEffectOnPet: "fade" }).hideableOnPet
    ).toBe(false);
    expect(normalizeSkyWeather({ hideEffectOnPet: "fade" }).hideEffectOnPet).toBe(
      "fade"
    );
    expect(normalizeSkyWeather({ hideEffectOnPet: "nope" }).hideEffectOnPet).toBe(
      "vortexHalo"
    );
    expect(normalizeSkyPetHideEffect("shutter")).toBe("shutter");
    expect(normalizeSkyPetHideEffect("")).toBe("vortexHalo");
    expect(SKY_PET_HIDE_EFFECTS).toEqual([
      "vortexHalo",
      "fade",
      "suckPoint",
      "shutter",
    ]);
  });

  it("resolveTodFromDate covers day segments", () => {
    expect(resolveTodFromDate(new Date(2026, 0, 1, 8, 0))).toBe("morning");
    expect(resolveTodFromDate(new Date(2026, 0, 1, 12, 0))).toBe("noon");
    expect(resolveTodFromDate(new Date(2026, 0, 1, 23, 0))).toBe("night");
  });

  it("nearestSkyRegion picks shenzhen over shanghai for south china coords", () => {
    expect(nearestSkyRegion(22.54, 114.06)).toBe("shenzhen");
    expect(nearestSkyRegion(31.23, 121.47)).toBe("shanghai");
    expect(nearestSkyRegion(39.9, 116.41)).toBe("beijing");
  });

  it("region fallback uses shenzhen when unknown", () => {
    const hit = regionWeatherOrFallback("not-a-city");
    expect(hit.regionId).toBe(FALLBACK_REGION_ID);
    expect(hit.ok).toBe(false);
  });

  it("regionWeatherOrFallback 接受定位城参数", () => {
    expect(regionWeatherOrFallback("system", "shenzhen").regionId).toBe(
      "shenzhen"
    );
    expect(regionWeatherOrFallback("system", "nope").ok).toBe(true);
  });

  it("peekSystemRegionId 跟缓存", async () => {
    clearSystemRegionCache();
    expect(peekSystemRegionId()).toBeNull();
    fetchClientGeo.mockResolvedValueOnce({
      ok: true,
      lat: 22.54,
      lon: 114.06,
      city: "Shenzhen",
      source: "test",
    });
    await resolveSystemRegion({ force: true });
    expect(peekSystemRegionId()).toBe("shenzhen");
    clearSystemRegionCache();
    expect(peekSystemRegionId()).toBeNull();
  });

  it("resolveSystemRegion uses IP coords then nearest city", async () => {
    clearSystemRegionCache();
    fetchClientGeo.mockResolvedValueOnce({
      ok: true,
      lat: 22.54,
      lon: 114.06,
      city: "Shenzhen",
      source: "test",
    });
    const hit = await resolveSystemRegion({ force: true });
    expect(hit.id).toBe("shenzhen");
    expect(hit.offline).toBe(false);
    expect(hit.lat).toBeCloseTo(22.54);
    clearSystemRegionCache();
  });

  it("resolveSystemRegion marks offline when geo unreachable", async () => {
    clearSystemRegionCache();
    fetchClientGeo.mockResolvedValueOnce(null);
    const hit = await resolveSystemRegion({ force: true });
    expect(hit.offline).toBe(true);
    expect(hit.source).toBe("offline");
    // 失败结果会缓存；不 force 不会自动重试
    fetchClientGeo.mockResolvedValueOnce({
      ok: true,
      lat: 22.54,
      lon: 114.06,
      city: "Shenzhen",
      source: "test",
    });
    const cached = await resolveSystemRegion();
    expect(cached.offline).toBe(true);
    const forced = await resolveSystemRegion({ force: true });
    expect(forced.offline).toBe(false);
    expect(forced.id).toBe("shenzhen");
    clearSystemRegionCache();
  });

  it("resolveSystemRegion force：旧请求晚到不覆盖新 cache", async () => {
    clearSystemRegionCache();
    fetchClientGeo.mockReset();
    let releaseSlow: (() => void) | undefined;
    const slowGate = new Promise<void>((r) => {
      releaseSlow = r;
    });
    fetchClientGeo
      .mockImplementationOnce(async () => {
        await slowGate;
        return {
          ok: true,
          lat: 31.23,
          lon: 121.47,
          city: "Shanghai",
          source: "slow",
        };
      })
      .mockResolvedValueOnce({
        ok: true,
        lat: 22.54,
        lon: 114.06,
        city: "Shenzhen",
        source: "fast",
      });

    const first = resolveSystemRegion({ force: true });
    await vi.waitFor(() => {
      expect(fetchClientGeo).toHaveBeenCalledTimes(1);
    });
    const second = await resolveSystemRegion({ force: true });
    expect(second.id).toBe("shenzhen");
    expect(peekSystemRegionId()).toBe("shenzhen");

    releaseSlow!();
    const firstHit = await first;
    expect(firstHit.id).toBe("shenzhen");
    expect(peekSystemRegionId()).toBe("shenzhen");
    clearSystemRegionCache();
  });

  it("normal pool decay then reset on other pick", () => {
    const cfg = normalizeSkyWeather({});
    const rng = () => 0; // always first weight
    const a = rollNormalWeather(cfg.runtime, cfg.sched, rng);
    expect(a).toBeTruthy();
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

  it("sync 天色优先用日出日落", () => {
    // 本地正午附近：假定日出 6:00、日落 18:00（用固定 epoch 避免时区飘）
    const rise = Date.UTC(2026, 5, 1, 6, 0, 0);
    const set = Date.UTC(2026, 5, 1, 18, 0, 0);
    expect(resolveTodFromSun(new Date(Date.UTC(2026, 5, 1, 12, 0, 0)), rise, set)).toBe(
      "noon"
    );
    expect(resolveTodFromSun(new Date(Date.UTC(2026, 5, 1, 5, 0, 0)), rise, set)).toBe(
      "predawn"
    );
    expect(resolveTodFromSun(new Date(Date.UTC(2026, 5, 1, 19, 0, 0)), rise, set)).toBe(
      "evening"
    );
    expect(resolveTodFromSun(new Date(Date.UTC(2026, 5, 1, 12, 0, 0)), 0, 0)).toBe(
      resolveTodFromDate(new Date(Date.UTC(2026, 5, 1, 12, 0, 0)))
    );

    const cfg = normalizeSkyWeather({
      todMode: "sync",
      runtime: {
        ...normalizeSkyWeather({}).runtime,
        sunRiseAt: rise,
        sunSetAt: set,
      },
    });
    expect(resolveDisplayTod(cfg, new Date(Date.UTC(2026, 5, 1, 12, 0, 0)))).toBe("noon");
    expect(parseOpenMeteoIso("2026-06-01T06:00")).toBeGreaterThan(0);
    expect(parseOpenMeteoIso("2026-06-01T06:00:00Z")).toBe(
      Date.parse("2026-06-01T06:00:00Z")
    );
    expect(parseOpenMeteoIso("")).toBe(0);
  });
});

describe("sky weather debounced persist", () => {
  it("schedule 合并；flush / force / discard 语义正确", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const persist = createDebouncedPersist(run, 100);

    persist.schedule();
    persist.schedule();
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(run).toHaveBeenCalledTimes(1);

    persist.schedule();
    persist.flush();
    expect(run).toHaveBeenCalledTimes(2);

    persist.flush();
    expect(run).toHaveBeenCalledTimes(2);
    persist.flush(true);
    expect(run).toHaveBeenCalledTimes(3);

    persist.schedule();
    persist.discard();
    vi.advanceTimersByTime(100);
    expect(run).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});

describe("sky weather session persist gate", () => {
  it("pity 递增不落盘，相位/极端才落盘", async () => {
    const { skyRuntimePersistWorthy, skyRuntimeMemoryDirty } = await import(
      "@/pet/runtime/skyWeatherSync"
    );
    const base = normalizeSkyWeather({}).runtime;
    const pityOnly = {
      ...base,
      eventPity: { ...base.eventPity, santa: { drySec: 3, lastAt: 0 } },
    };
    expect(skyRuntimePersistWorthy(base, pityOnly)).toBe(false);
    expect(skyRuntimeMemoryDirty(base, pityOnly)).toBe(true);

    const phase = {
      ...base,
      offlineIsDay: !base.offlineIsDay,
      offlinePhaseStartedAt: base.offlinePhaseStartedAt + 1,
    };
    expect(skyRuntimePersistWorthy(base, phase)).toBe(true);
    expect(skyRuntimeMemoryDirty(base, phase)).toBe(true);

    const eggOn = { ...base, eggWeather: "egg-aurora", eggStartedAt: 1 };
    expect(skyRuntimePersistWorthy(base, eggOn)).toBe(true);
    expect(skyRuntimeMemoryDirty(base, eggOn)).toBe(true);
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

  it("离线再切跟随：作废同步戳，避免沿用离线天气", async () => {
    const { applySkyWeatherMode } = await import(
      "@/pet/runtime/skyWeatherModeOps"
    );
    const cfg = normalizeSkyWeather({
      linkMode: "online",
      weatherMode: "offline",
      todMode: "fixed",
      manualWeather: "cloudy",
      runtime: {
        ...normalizeSkyWeather({}).runtime,
        everSynced: true,
        lastSyncAt: Date.now(),
        snapWeather: "clear",
      },
    });
    const next = applySkyWeatherMode(cfg, "sync");
    expect(next.weatherMode).toBe("sync");
    expect(next.runtime.everSynced).toBe(false);
    expect(next.runtime.lastSyncAt).toBe(0);
    // 未同步前显示地区示意，而不是离线抽签/旧 manual
    expect(resolveDisplayWeather(next)).toBe(
      regionWeatherOrFallback(next.regionId).weather
    );
  });

  it("总闸离线落深圳双离线；在线落跟随系统+双跟随", async () => {
    const { applySkyLinkMode } = await import(
      "@/pet/runtime/skyWeatherModeOps"
    );
    const base = normalizeSkyWeather({
      linkMode: "online",
      regionId: "system",
      todMode: "sync",
      weatherMode: "sync",
    });
    const off = applySkyLinkMode(base, "offline");
    expect(off.linkMode).toBe("offline");
    expect(off.regionId).toBe(FALLBACK_REGION_ID);
    expect(off.todMode).toBe("offline");
    expect(off.weatherMode).toBe("offline");

    const on = applySkyLinkMode(off, "online");
    expect(on.linkMode).toBe("online");
    expect(on.regionId).toBe("system");
    expect(on.todMode).toBe("sync");
    expect(on.weatherMode).toBe("sync");
    expect(on.runtime.everSynced).toBe(false);
  });
});

describe("sky weather session lifecycle", () => {
  afterEach(() => {
    vi.useRealTimers();
    fetchOpenMeteoWeather.mockReset();
    fetchClientGeo.mockReset();
    clearSystemRegionCache();
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
        linkBootstrapped: true,
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

  it("已在线无网开机回落离线总闸", async () => {
    fetchClientGeo.mockResolvedValue(null);
    fetchOpenMeteoWeather.mockResolvedValue(null);
    const { useSkyWeatherSession } = await import(
      "@/pet/runtime/useSkyWeatherSession"
    );
    const config = ref(
      normalizeSkyWeather({
        linkMode: "online",
        linkBootstrapped: true,
        regionId: "system",
        todMode: "sync",
        weatherMode: "sync",
        manualTod: "noon",
        manualWeather: "clear",
      })
    );

    let stopFn: (() => void) | null = null;
    const app = createApp(
      defineComponent({
        setup() {
          const session = useSkyWeatherSession({
            config,
            commit: (next) => {
              config.value = next;
            },
          });
          stopFn = session.stop;
          return () => h("div");
        },
      })
    );
    app.mount(document.createElement("div"));
    await nextTick();
    await new Promise((r) => setTimeout(r, 80));

    expect(config.value.linkMode).toBe("offline");
    expect(config.value.regionId).toBe(FALLBACK_REGION_ID);
    expect(config.value.todMode).toBe("offline");
    expect(config.value.weatherMode).toBe("offline");

    stopFn?.();
    app.unmount();
  });

  it("在线刷新探测失败回落离线总闸", async () => {
    clearSystemRegionCache();
    fetchClientGeo.mockResolvedValue({
      ok: true,
      lat: 22.54,
      lon: 114.06,
      city: "Shenzhen",
      source: "test",
    });
    fetchOpenMeteoWeather.mockResolvedValue({
      ok: true,
      weather: "clear",
      source: "test",
      sunRiseAt: Date.UTC(2026, 0, 1, 6),
      sunSetAt: Date.UTC(2026, 0, 1, 18),
    });
    const { useSkyWeatherSession } = await import(
      "@/pet/runtime/useSkyWeatherSession"
    );
    const config = ref(
      normalizeSkyWeather({
        linkMode: "online",
        linkBootstrapped: true,
        regionId: "system",
        todMode: "sync",
        weatherMode: "sync",
        manualTod: "noon",
        manualWeather: "clear",
      })
    );

    let refreshFn: (() => Promise<void>) | null = null;
    let stopFn: (() => void) | null = null;
    const app = createApp(
      defineComponent({
        setup() {
          const session = useSkyWeatherSession({
            config,
            commit: (next) => {
              config.value = next;
            },
          });
          refreshFn = session.refreshLinks;
          stopFn = session.stop;
          return () => h("div");
        },
      })
    );
    app.mount(document.createElement("div"));
    await nextTick();
    await new Promise((r) => setTimeout(r, 80));
    expect(config.value.linkMode).toBe("online");

    clearSystemRegionCache();
    fetchClientGeo.mockResolvedValue(null);
    await refreshFn?.();
    await nextTick();

    expect(config.value.linkMode).toBe("offline");
    expect(config.value.regionId).toBe(FALLBACK_REGION_ID);
    expect(config.value.todMode).toBe("offline");
    expect(config.value.weatherMode).toBe("offline");

    stopFn?.();
    app.unmount();
  });

  it("失败缓存后开总闸应重新探测，不立刻回落", async () => {
    clearSystemRegionCache();
    fetchClientGeo.mockResolvedValue(null);
    fetchOpenMeteoWeather.mockResolvedValue(null);
    const { useSkyWeatherSession } = await import(
      "@/pet/runtime/useSkyWeatherSession"
    );
    const { applySkyLinkMode } = await import(
      "@/pet/runtime/skyWeatherModeOps"
    );
    const config = ref(
      normalizeSkyWeather({
        linkMode: "online",
        linkBootstrapped: true,
        regionId: "system",
        todMode: "sync",
        weatherMode: "sync",
        manualTod: "noon",
        manualWeather: "clear",
      })
    );

    let stopFn: (() => void) | null = null;
    const app = createApp(
      defineComponent({
        setup() {
          const session = useSkyWeatherSession({
            config,
            commit: (next) => {
              config.value = next;
            },
          });
          stopFn = session.stop;
          return () => h("div");
        },
      })
    );
    app.mount(document.createElement("div"));
    await nextTick();
    await new Promise((r) => setTimeout(r, 80));
    expect(config.value.linkMode).toBe("offline");
    const geoCallsAfterFail = fetchClientGeo.mock.calls.length;

    // 网络恢复后用户再开总闸：须 force 重探，不能吃失败缓存
    fetchClientGeo.mockResolvedValue({
      ok: true,
      lat: 22.54,
      lon: 114.06,
      city: "Shenzhen",
      source: "test",
    });
    fetchOpenMeteoWeather.mockResolvedValue({
      ok: true,
      weather: "cloudy",
      source: "test",
      sunRiseAt: Date.UTC(2026, 0, 1, 6),
      sunSetAt: Date.UTC(2026, 0, 1, 18),
    });
    config.value = applySkyLinkMode(config.value, "online");
    await nextTick();
    // scheduleModeWatchSync 防抖 180ms
    await new Promise((r) => setTimeout(r, 320));

    expect(fetchClientGeo.mock.calls.length).toBeGreaterThan(geoCallsAfterFail);
    expect(config.value.linkMode).toBe("online");
    expect(config.value.regionId).toBe("system");
    expect(config.value.todMode).toBe("sync");
    expect(config.value.weatherMode).toBe("sync");

    stopFn?.();
    app.unmount();
  });

  it("换地区强制同步时，写回 manual 不会拉网死循环", async () => {
    fetchOpenMeteoWeather.mockResolvedValue({
      ok: true,
      weather: "rain-mid",
      source: "test",
      sunRiseAt: Date.UTC(2026, 0, 1, 6),
      sunSetAt: Date.UTC(2026, 0, 1, 18),
    });
    fetchClientGeo.mockResolvedValue({
      ok: true,
      lat: 22.54,
      lon: 114.06,
      city: "Shenzhen",
      source: "test",
    });
    const { useSkyWeatherSession } = await import(
      "@/pet/runtime/useSkyWeatherSession"
    );
    const config = ref(
      normalizeSkyWeather({
        todMode: "fixed",
        weatherMode: "sync",
        regionId: "shenzhen",
        linkMode: "online",
        linkBootstrapped: true,
        manualTod: "noon",
        manualWeather: "clear",
        runtime: {
          ...normalizeSkyWeather({}).runtime,
          lastDayRollKey: "2026-01-01",
          everSynced: false,
          lastSyncAt: 0,
        },
      })
    );

    let stopFn: (() => void) | null = null;
    const app = createApp(
      defineComponent({
        setup() {
          const session = useSkyWeatherSession({
            config,
            commit: (next) => {
              config.value = next;
            },
          });
          stopFn = session.stop;
          return () => h("div");
        },
      })
    );
    app.mount(document.createElement("div"));
    await nextTick();
    await new Promise((r) => setTimeout(r, 50));

    const afterBoot = fetchOpenMeteoWeather.mock.calls.length;
    expect(afterBoot).toBeGreaterThanOrEqual(1);

    config.value = normalizeSkyWeather({
      ...config.value,
      regionId: "xian",
    });
    await nextTick();
    await new Promise((r) => setTimeout(r, 30));

    const afterRegion = fetchOpenMeteoWeather.mock.calls.length;
    expect(afterRegion - afterBoot).toBeLessThanOrEqual(2);
    expect(afterRegion).toBeLessThan(8);

    stopFn?.();
    app.unmount();
  });

  it("sync 模式走 bridge invoke，失败回退地区示意", async () => {
    const { syncSkyWeatherFromNetwork } = await import(
      "@/pet/runtime/skyWeatherSync"
    );
    const rise = Date.UTC(2026, 0, 1, 6);
    const set = Date.UTC(2026, 0, 1, 18);
    fetchOpenMeteoWeather.mockReset();
    fetchOpenMeteoWeather.mockResolvedValueOnce({
      ok: true,
      weather: "rain-mid",
      source: "test",
      sunRiseAt: rise,
      sunSetAt: set,
    });
    const base = normalizeSkyWeather({
      linkMode: "online",
      weatherMode: "sync",
      todMode: "fixed",
      regionId: "shenzhen",
      manualTod: "noon",
    });
    expect(base.linkMode).toBe("online");
    const ok = await syncSkyWeatherFromNetwork(base, Date.UTC(2026, 0, 1, 12));
    expect(fetchOpenMeteoWeather).toHaveBeenCalled();
    expect(ok.manualWeather).toBe("rain-mid");
    expect(ok.runtime.snapWeather).toBe("rain-mid");
    expect(ok.runtime.everSynced).toBe(true);
    expect(ok.runtime.wxOnline).toBe(true);
    expect(ok.runtime.sunRiseAt).toBe(rise);
    expect(ok.runtime.sunSetAt).toBe(set);

    fetchOpenMeteoWeather.mockResolvedValueOnce(null);
    const fallback = await syncSkyWeatherFromNetwork(base, Date.UTC(2026, 0, 1, 12));
    const regionWx = regionWeatherOrFallback("shenzhen").weather;
    expect(fallback.manualWeather).toBe(regionWx);
    expect(fallback.runtime.snapWeather).toBe(regionWx);
    expect(fallback.runtime.wxOnline).toBe(false);
  });

  it("仅 sync 天色也会拉 Open-Meteo 包并按日照切相位", async () => {
    const { syncSkyWeatherFromNetwork } = await import(
      "@/pet/runtime/skyWeatherSync"
    );
    const rise = Date.UTC(2026, 5, 1, 6);
    const set = Date.UTC(2026, 5, 1, 18);
    fetchOpenMeteoWeather.mockReset();
    fetchOpenMeteoWeather.mockResolvedValueOnce({
      ok: true,
      weather: "cloudy",
      source: "test",
      sunRiseAt: rise,
      sunSetAt: set,
    });
    const base = normalizeSkyWeather({
      linkMode: "online",
      weatherMode: "offline",
      todMode: "sync",
      regionId: "shenzhen",
      manualWeather: "clear",
      manualTod: "morning",
    });
    const next = await syncSkyWeatherFromNetwork(base, Date.UTC(2026, 5, 1, 12));
    expect(fetchOpenMeteoWeather).toHaveBeenCalled();
    expect(next.manualWeather).toBe("clear");
    expect(next.manualTod).toBe("noon");
    expect(next.runtime.sunRiseAt).toBe(rise);
    expect(next.runtime.snapTod).toBe("noon");
  });

  it("offline 不同步网络", async () => {
    const { syncSkyWeatherFromNetwork } = await import(
      "@/pet/runtime/skyWeatherSync"
    );
    const cfg = normalizeSkyWeather({
      weatherMode: "offline",
      todMode: "offline",
    });
    const next = await syncSkyWeatherFromNetwork(cfg);
    expect(fetchOpenMeteoWeather).not.toHaveBeenCalled();
    expect(next).toBe(cfg);
  });

  it("linkMode offline 即使子项 sync 也不拉网", async () => {
    fetchOpenMeteoWeather.mockClear();
    const { syncSkyWeatherFromNetwork } = await import(
      "@/pet/runtime/skyWeatherSync"
    );
    const { applySkyTodMode, applySkyWeatherMode } = await import(
      "@/pet/runtime/skyWeatherModeOps"
    );
    const cfg = normalizeSkyWeather({
      linkMode: "offline",
      linkBootstrapped: true,
      regionId: FALLBACK_REGION_ID,
      todMode: "offline",
      weatherMode: "offline",
    });
    // 旁路强行写成 sync（模拟脏配置），同步入口仍应拒网
    const dirty = normalizeSkyWeather({
      ...cfg,
      todMode: "sync",
      weatherMode: "sync",
    });
    const next = await syncSkyWeatherFromNetwork(dirty);
    expect(fetchOpenMeteoWeather).not.toHaveBeenCalled();
    expect(next).toBe(dirty);

    // modeOps：离线总闸拒切 sync
    expect(applySkyTodMode(cfg, "sync").todMode).toBe("offline");
    expect(applySkyWeatherMode(cfg, "sync").weatherMode).toBe("offline");
  });

  it("会话：离线总闸周期不同步", async () => {
    vi.useFakeTimers();
    fetchOpenMeteoWeather.mockReset();
    fetchClientGeo.mockResolvedValue(null);
    try {
      const { useSkyWeatherSession } = await import(
        "@/pet/runtime/useSkyWeatherSession"
      );
      const config = ref(
        normalizeSkyWeather({
          linkMode: "offline",
          linkBootstrapped: true,
          regionId: FALLBACK_REGION_ID,
          todMode: "sync",
          weatherMode: "sync",
          manualTod: "noon",
          manualWeather: "clear",
        })
      );

      let stopFn: (() => void) | null = null;
      const app = createApp(
        defineComponent({
          setup() {
            const session = useSkyWeatherSession({
              config,
              commit: (next) => {
                config.value = next;
              },
            });
            stopFn = session.stop;
            return () => h("div");
          },
        })
      );
      app.mount(document.createElement("div"));
      await nextTick();
      await vi.advanceTimersByTimeAsync(120_000);
      expect(fetchOpenMeteoWeather).not.toHaveBeenCalled();
      stopFn?.();
      app.unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("pet sky surface phase", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("开投射：appear 后 phase 清空；关投射：dismiss 后 finishSkyDismiss", async () => {
    vi.useFakeTimers();
    const { usePetSkySurface } = await import("./usePetSkySurface");

    const skyBackdropEnabled = ref(true);
    const skyHideableOnPet = ref(true);
    const skyHideEffectOnPet = ref("vortexHalo" as const);
    const skyBackdropStyle = ref<Record<string, string>>({});
    const bodyBox = ref({ w: 80, h: 100 });
    const isDragging = ref(false);
    const isPeeking = ref(false);
    const flyVisualX = ref(0);
    const flyVisualY = ref(0);
    const skyVisualHold = ref(false);
    const finishSkyDismiss = vi.fn();

    let surface: ReturnType<typeof usePetSkySurface> | null = null;
    const app = createApp(
      defineComponent({
        setup() {
          surface = usePetSkySurface({
            skyBackdropEnabled,
            skyHideableOnPet,
            skyHideEffectOnPet,
            skyBackdropStyle,
            bodyBox,
            isDragging,
            isPeeking,
            flyVisualX,
            flyVisualY,
            skyVisualHold,
            finishSkyDismiss,
          });
          return () => h("div");
        },
      })
    );
    app.mount(document.createElement("div"));
    await nextTick();

    expect(surface!.skySurfaceOn.value).toBe(true);
    // appear：held → raf×2 → out → 720ms 清空
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(surface!.skyVortexPhase.value).toBe("out");
    await vi.advanceTimersByTimeAsync(720);
    expect(surface!.skyVortexPhase.value).toBe("");
    expect(skyVisualHold.value).toBe(false);

    skyBackdropEnabled.value = false;
    await nextTick();
    expect(skyVisualHold.value).toBe(true);
    expect(surface!.skyVortexPhase.value).toBe("in");
    await vi.advanceTimersByTimeAsync(680);
    await vi.advanceTimersByTimeAsync(0);
    expect(surface!.skySurfaceOn.value).toBe(false);
    expect(finishSkyDismiss).toHaveBeenCalled();
    expect(skyVisualHold.value).toBe(false);

    app.unmount();
  });

  it("hideable + 拖拽：in → held；松手 out → 清空", async () => {
    vi.useFakeTimers();
    const { usePetSkySurface } = await import("./usePetSkySurface");

    const skyBackdropEnabled = ref(true);
    const skyHideableOnPet = ref(true);
    const skyHideEffectOnPet = ref("fade" as const);
    const skyBackdropStyle = ref<Record<string, string>>({});
    const bodyBox = ref({ w: 80, h: 100 });
    const isDragging = ref(false);
    const isPeeking = ref(false);
    const flyVisualX = ref(0);
    const flyVisualY = ref(0);
    const skyVisualHold = ref(false);
    const finishSkyDismiss = vi.fn();

    let surface: ReturnType<typeof usePetSkySurface> | null = null;
    const app = createApp(
      defineComponent({
        setup() {
          surface = usePetSkySurface({
            skyBackdropEnabled,
            skyHideableOnPet,
            skyHideEffectOnPet,
            skyBackdropStyle,
            bodyBox,
            isDragging,
            isPeeking,
            flyVisualX,
            flyVisualY,
            skyVisualHold,
            finishSkyDismiss,
          });
          return () => h("div");
        },
      })
    );
    app.mount(document.createElement("div"));
    // 跳过 appear
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(720);
    expect(surface!.skyVortexPhase.value).toBe("");

    isDragging.value = true;
    await nextTick();
    expect(surface!.skyVortexPhase.value).toBe("in");
    await vi.advanceTimersByTimeAsync(680);
    expect(surface!.skyVortexPhase.value).toBe("held");
    expect(surface!.skyStageClip.value).toBe(false);

    isDragging.value = false;
    await nextTick();
    expect(surface!.skyVortexPhase.value).toBe("out");
    await vi.advanceTimersByTimeAsync(720);
    expect(surface!.skyVortexPhase.value).toBe("");
    expect(surface!.skyStageClip.value).toBe(true);

    app.unmount();
  });

  it("hideable 关时 busy 不收起；快速关开投射 gen 作废旧 dismiss", async () => {
    vi.useFakeTimers();
    const { usePetSkySurface } = await import("./usePetSkySurface");

    const skyBackdropEnabled = ref(true);
    const skyHideableOnPet = ref(false);
    const skyHideEffectOnPet = ref("vortexHalo" as const);
    const skyBackdropStyle = ref<Record<string, string>>({});
    const bodyBox = ref({ w: 80, h: 100 });
    const isDragging = ref(false);
    const isPeeking = ref(false);
    const flyVisualX = ref(0);
    const flyVisualY = ref(0);
    const skyVisualHold = ref(false);
    const finishSkyDismiss = vi.fn();

    let surface: ReturnType<typeof usePetSkySurface> | null = null;
    const app = createApp(
      defineComponent({
        setup() {
          surface = usePetSkySurface({
            skyBackdropEnabled,
            skyHideableOnPet,
            skyHideEffectOnPet,
            skyBackdropStyle,
            bodyBox,
            isDragging,
            isPeeking,
            flyVisualX,
            flyVisualY,
            skyVisualHold,
            finishSkyDismiss,
          });
          return () => h("div");
        },
      })
    );
    app.mount(document.createElement("div"));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(720);

    isDragging.value = true;
    await nextTick();
    expect(surface!.skyVortexPhase.value).toBe("");

    // 关投射再立刻开：旧 dismiss 不应卸层
    skyBackdropEnabled.value = false;
    await nextTick();
    expect(surface!.skyVortexPhase.value).toBe("in");
    skyBackdropEnabled.value = true;
    await nextTick();
    expect(surface!.skySurfaceOn.value).toBe(true);
    await vi.advanceTimersByTimeAsync(680);
    await vi.advanceTimersByTimeAsync(0);
    expect(surface!.skySurfaceOn.value).toBe(true);
    expect(finishSkyDismiss).not.toHaveBeenCalled();

    app.unmount();
  });
});
