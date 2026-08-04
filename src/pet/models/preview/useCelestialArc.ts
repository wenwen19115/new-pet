import { onUnmounted, ref, watch, type Ref } from "vue";
import type { SkyTodId, SkyWeatherId } from "@/pet/data/skyWeather";

const TOD_HOUR: Record<SkyTodId, number> = {
  morning: 7.1,
  noon: 13.0,
  dusk: 17.85,
  evening: 20.4,
  night: 23.6,
  predawn: 3.4,
};

const WX_SKY: Record<string, { sun: number; moon: number; star: number; glow: number }> = {
  clear: { sun: 1, moon: 1, star: 1, glow: 1 },
  cloudy: { sun: 0.28, moon: 0.35, star: 0.3, glow: 0.35 },
  "egg-aurora": { sun: 0.15, moon: 0.55, star: 1.1, glow: 0.7 },
  "egg-solar": { sun: 1, moon: 0.2, star: 0.15, glow: 0.55 },
  "egg-lunar": { sun: 0, moon: 1, star: 0.95, glow: 0.45 },
  "fog-light": { sun: 0.55, moon: 0.6, star: 0.5, glow: 0.55 },
  "fog-mid": { sun: 0.4, moon: 0.45, star: 0.35, glow: 0.4 },
  "fog-heavy": { sun: 0.2, moon: 0.25, star: 0.15, glow: 0.22 },
  haze: { sun: 0.2, moon: 0.25, star: 0.08, glow: 0.18 },
  "egg-sulfur": { sun: 0.02, moon: 0.04, star: 0, glow: 0.08 },
  "egg-volcano": { sun: 0.08, moon: 0.1, star: 0.05, glow: 0.25 },
  "egg-tornado": { sun: 0.15, moon: 0.2, star: 0.1, glow: 0.2 },
  "egg-thunder": { sun: 0, moon: 0, star: 0, glow: 0.08 },
  "egg-frog": { sun: 0.08, moon: 0.12, star: 0.05, glow: 0.12 },
  "egg-diamond": { sun: 0.55, moon: 0.6, star: 0.9, glow: 1.05 },
  "egg-meteor": { sun: 0.05, moon: 0.2, star: 0.9, glow: 0.35 },
  sandstorm: { sun: 0.05, moon: 0.05, star: 0, glow: 0.08 },
  thunder: { sun: 0, moon: 0, star: 0, glow: 0.05 },
  sleet: { sun: 0.04, moon: 0.08, star: 0.05, glow: 0.1 },
  "rain-light": { sun: 0.06, moon: 0.1, star: 0.05, glow: 0.12 },
  "rain-mid": { sun: 0, moon: 0.05, star: 0, glow: 0.06 },
  "rain-heavy": { sun: 0, moon: 0, star: 0, glow: 0.03 },
  "rain-storm": { sun: 0, moon: 0, star: 0, glow: 0 },
  "snow-light": { sun: 0.18, moon: 0.25, star: 0.22, glow: 0.25 },
  "snow-mid": { sun: 0.1, moon: 0.16, star: 0.14, glow: 0.16 },
  "snow-heavy": { sun: 0.05, moon: 0.1, star: 0.08, glow: 0.1 },
  "snow-blizzard": { sun: 0, moon: 0.04, star: 0.02, glow: 0.04 },
  "hail-light": { sun: 0.12, moon: 0.15, star: 0.1, glow: 0.14 },
  "hail-mid": { sun: 0.06, moon: 0.1, star: 0.06, glow: 0.1 },
  "hail-heavy": { sun: 0.03, moon: 0.06, star: 0.03, glow: 0.06 },
  "hail-storm": { sun: 0, moon: 0.02, star: 0, glow: 0.03 },
  "wind-light": { sun: 0.95, moon: 0.9, star: 0.85, glow: 0.9 },
  "wind-mid": { sun: 0.85, moon: 0.8, star: 0.7, glow: 0.75 },
  "wind-heavy": { sun: 0.7, moon: 0.65, star: 0.55, glow: 0.6 },
  "wind-typhoon": { sun: 0.15, moon: 0.2, star: 0.1, glow: 0.18 },
};

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function arcPose(t: number) {
  const u = clamp(t, 0, 1);
  return {
    x: 12 + u * 72,
    y: 58 - Math.sin(Math.PI * u) * 42,
    s: 0.72 + Math.sin(Math.PI * u) * 0.38,
  };
}

function sunFactor(h: number) {
  if (h < 5.1 || h > 19.35) return { vis: 0, t: h < 12 ? 0 : 1 };
  const t = clamp((h - 5.1) / (19.35 - 5.1), 0, 1);
  let vis = 1;
  if (h < 5.9) vis = (h - 5.1) / 0.8;
  else if (h > 18.55) vis = (19.35 - h) / 0.8;
  return { vis: clamp(vis, 0, 1), t };
}

function moonFactor(h: number) {
  const up = h >= 18 || h < 6.35;
  if (!up) return { vis: 0, t: 0 };
  const t = h >= 18 ? (h - 18) / 12.35 : (h + 6) / 12.35;
  let vis = 1;
  if (h >= 18 && h < 18.8) vis = (h - 18) / 0.8;
  else if (h >= 5.4 && h < 6.35) vis = (6.35 - h) / 0.95;
  else if (h >= 6.35 && h < 18) vis = 0;
  return { vis: clamp(vis, 0, 1), t: clamp(t, 0, 1) };
}

function starFactor(h: number) {
  if (h >= 5.6 && h < 18.4) return { base: 0, dense: 0 };
  if (h >= 18.4 && h < 20.2) {
    const a = (h - 18.4) / 1.8;
    return { base: 0.25 * a, dense: 0 };
  }
  if (h >= 20.2 && h < 24) {
    const a = (h - 20.2) / 3.8;
    return { base: 0.45 + 0.35 * a, dense: 0.15 * a };
  }
  if (h >= 0 && h < 1) return { base: 0.8, dense: 0.35 };
  if (h >= 1 && h < 4.2) return { base: 0.95, dense: 0.9 };
  if (h >= 4.2 && h < 5.6) {
    const a = 1 - (h - 4.2) / 1.4;
    return { base: 0.85 * a, dense: 0.7 * a };
  }
  return { base: 0, dense: 0 };
}

export interface CelestialState {
  sunStyle: Record<string, string>;
  moonStyle: Record<string, string>;
  starsOpacity: number;
  starsDenseOpacity: number;
  sunEclipse: boolean;
  moonEclipse: boolean;
  glowVars: Record<string, string>;
}

function computeCelestial(tod: SkyTodId, weather: SkyWeatherId, followClock: boolean): CelestialState {
  const now = new Date();
  const h = followClock
    ? now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
    : TOD_HOUR[tod] ?? 12;
  const mul = WX_SKY[weather] || WX_SKY.clear!;
  let sun = sunFactor(h);
  let moon = moonFactor(h);
  const star = starFactor(h);
  let sunPose = arcPose(sun.t);
  let moonPose = arcPose(moon.t);
  let sunEclipse = weather === "egg-solar";
  let moonEclipse = weather === "egg-lunar";

  if (weather === "egg-solar") {
    sun = { vis: 1, t: 0.5 };
    sunPose = arcPose(0.5);
    moonPose = arcPose(0.5);
    moon = { vis: 0.25, t: 0.5 };
  } else if (weather === "egg-lunar") {
    if (moon.vis < 0.45) {
      moon = { vis: 1, t: h >= 18 || h < 6 ? moon.t : 0.55 };
      moonPose = arcPose(moon.t);
    }
  }

  const sunOp = sun.vis * mul.sun;
  const moonOp = moon.vis * mul.moon;
  const glowBody = sunOp >= 0.08 ? sunPose : moonPose;
  const glowA = Math.max(sun.vis * mul.glow * 0.7, moon.vis * mul.glow * 0.22);

  return {
    sunStyle: {
      left: `${sunPose.x.toFixed(2)}%`,
      top: `${sunPose.y.toFixed(2)}%`,
      transform: `translate(-50%, -50%) scale(${sunPose.s.toFixed(3)})`,
      opacity: String(sunOp),
    },
    moonStyle: {
      left: `${moonPose.x.toFixed(2)}%`,
      top: `${moonPose.y.toFixed(2)}%`,
      transform: `translate(-50%, -50%) scale(${moonPose.s.toFixed(3)})`,
      opacity: String(moonOp),
    },
    starsOpacity: star.base * mul.star,
    starsDenseOpacity: star.dense * mul.star,
    sunEclipse,
    moonEclipse,
    glowVars: {
      "--glow-x": `${glowBody.x.toFixed(2)}%`,
      "--glow-y": `${glowBody.y.toFixed(2)}%`,
      "--glow-a": glowA.toFixed(3),
    },
  };
}

/** 日/月/星弧：跟随系统钟或按 tod 代表时刻 */
export function useCelestialArc(deps: {
  tod: Ref<SkyTodId>;
  weather: Ref<SkyWeatherId>;
  /** todMode===sync 时跟系统钟 */
  followClock: Ref<boolean>;
}) {
  const state = ref<CelestialState>(
    computeCelestial(deps.tod.value, deps.weather.value, deps.followClock.value)
  );

  function tick() {
    state.value = computeCelestial(
      deps.tod.value,
      deps.weather.value,
      deps.followClock.value
    );
  }

  // 跟钟才需要秒级推进；固定/离线 tod 只靠 watch 重算
  let timer: ReturnType<typeof setInterval> | null = null;
  function syncTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (deps.followClock.value) {
      timer = setInterval(tick, 1000);
    }
  }

  tick();
  syncTimer();
  watch([deps.tod, deps.weather, deps.followClock], () => {
    tick();
    syncTimer();
  });
  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return {
    celestial: state,
  };
}
