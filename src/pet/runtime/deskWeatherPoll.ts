import {
  acquireDeskWeatherWatch,
  fetchDeskWeatherSnapshot,
  releaseDeskWeatherWatch,
} from "@/pet/bridge/deskWeather";
import type { DeskWeatherConfig, DeskWeatherKind } from "@/pet/data/deskWeather";
import {
  commitDeskWeatherFire,
  createDeskWeatherEngineState,
  observeDeskWeather,
  type DeskWeatherEngineState,
} from "./deskWeatherEngine";

type DeskWeatherHandler = (kind: DeskWeatherKind) => boolean;

const POLL_MS = 500;

let timer: ReturnType<typeof setInterval> | null = null;
let polling = false;
let watchLeased = false;
let acquirePending = false;
/** stop 时 +1，过期的 in-flight acquire 直接 release */
let watchGen = 0;
let handler: DeskWeatherHandler | null = null;
let getConfig: (() => DeskWeatherConfig) | null = null;
let canFire: (() => boolean) | null = null;
let engine: DeskWeatherEngineState = createDeskWeatherEngineState();

async function pollOnce(): Promise<void> {
  if (polling || !handler || !getConfig) return;
  const cfg = getConfig();
  if (!cfg.enabled) return;
  polling = true;
  try {
    const snap = await fetchDeskWeatherSnapshot();
    if (!snap) return;
    const now = Date.now();
    const kind = observeDeskWeather(engine, cfg, snap, now);
    if (!kind || !canFire?.()) return;
    if (!handler(kind)) return;
    commitDeskWeatherFire(engine, cfg, kind, snap, now);
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
  }, POLL_MS);
}

async function releaseWatchLease() {
  if (!watchLeased) return;
  watchLeased = false;
  await releaseDeskWeatherWatch();
}

export function stopPetDeskWeather(): void {
  watchGen += 1;
  acquirePending = false;
  handler = null;
  getConfig = null;
  canFire = null;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  engine = createDeskWeatherEngineState();
  void releaseWatchLease();
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
  if (timer || acquirePending) return;

  const gen = watchGen;
  engine = createDeskWeatherEngineState();
  acquirePending = true;
  void acquireDeskWeatherWatch().then(async (ok) => {
    if (gen !== watchGen) {
      acquirePending = false;
      if (ok) await releaseDeskWeatherWatch();
      return;
    }
    acquirePending = false;
    if (!ok) return;
    watchLeased = true;
    armTimer();
    void pollOnce();
  });
}
