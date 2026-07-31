import { invoke } from "@tauri-apps/api/core";

export interface DeskWeatherSnapshot {
  appCount: number;
  foregroundKey: string;
  foregroundImmersive: boolean;
  recentSwitchTimesMs: number[];
}

export async function fetchDeskWeatherSnapshot(): Promise<DeskWeatherSnapshot | null> {
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

/** 持有焦点线程租约；跨 WebView 引用计数，归零才停。失败返回 false，调用方勿标 leased。 */
export async function acquireDeskWeatherWatch(): Promise<boolean> {
  try {
    await invoke("acquire_desk_weather_watch");
    return true;
  } catch (err) {
    console.warn("[pet] desk weather acquire failed", err);
    return false;
  }
}

export async function releaseDeskWeatherWatch(): Promise<void> {
  try {
    await invoke("release_desk_weather_watch");
  } catch {
    /* ignore */
  }
}
