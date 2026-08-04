import { invoke } from "@tauri-apps/api/core";
import {
  EGG_WEATHER_IDS,
  NORMAL_WEATHER_POOL,
  type SkyWeatherId,
} from "@/pet/data/skyWeather";

const WEATHER_OK = new Set<string>([...NORMAL_WEATHER_POOL, ...EGG_WEATHER_IDS]);

export interface OpenMeteoWeatherHit {
  ok: boolean;
  weather: SkyWeatherId;
  source: string;
}

export async function fetchOpenMeteoWeather(
  lat: number,
  lon: number
): Promise<OpenMeteoWeatherHit | null> {
  try {
    const raw = (await invoke("fetch_open_meteo_weather", { lat, lon })) as {
      ok?: boolean;
      weather?: string;
      source?: string;
    };
    const weather = String(raw.weather || "clear");
    if (!WEATHER_OK.has(weather)) {
      return { ok: false, weather: "clear", source: "invalid" };
    }
    return {
      ok: Boolean(raw.ok),
      weather: weather as SkyWeatherId,
      source: typeof raw.source === "string" ? raw.source : "open-meteo",
    };
  } catch (err) {
    console.warn("[pet] open-meteo fetch failed", err);
    return null;
  }
}
