import { invoke } from "@tauri-apps/api/core";
import {
  EGG_WEATHER_IDS,
  NORMAL_WEATHER_POOL,
  parseOpenMeteoIso,
  type SkyWeatherId,
} from "@/pet/data/skyWeather";

const WEATHER_OK = new Set<string>([...NORMAL_WEATHER_POOL, ...EGG_WEATHER_IDS]);

/** Open-Meteo 一次包：天气 + 日出日落 */
interface OpenMeteoWeatherHit {
  ok: boolean;
  weather: SkyWeatherId;
  source: string;
  /** epoch ms；0=无 */
  sunRiseAt: number;
  sunSetAt: number;
}

interface ClientGeoHit {
  ok: boolean;
  lat: number;
  lon: number;
  city: string;
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
      sunrise?: string;
      sunset?: string;
    };
    const weather = String(raw.weather || "clear");
    if (!WEATHER_OK.has(weather)) {
      return {
        ok: false,
        weather: "clear",
        source: "invalid",
        sunRiseAt: 0,
        sunSetAt: 0,
      };
    }
    return {
      ok: Boolean(raw.ok),
      weather: weather as SkyWeatherId,
      source: typeof raw.source === "string" ? raw.source : "open-meteo",
      sunRiseAt: parseOpenMeteoIso(raw.sunrise),
      sunSetAt: parseOpenMeteoIso(raw.sunset),
    };
  } catch (err) {
    console.warn("[pet] open-meteo fetch failed", err);
    return null;
  }
}

/** IP 粗定位；失败返回 null（上层再回落时区/默认城） */
export async function fetchClientGeo(): Promise<ClientGeoHit | null> {
  try {
    const raw = (await invoke("fetch_client_geo")) as {
      ok?: boolean;
      lat?: number;
      lon?: number;
      city?: string;
      source?: string;
    };
    if (!raw?.ok) return null;
    const lat = Number(raw.lat);
    const lon = Number(raw.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      ok: true,
      lat,
      lon,
      city: typeof raw.city === "string" ? raw.city : "",
      source: typeof raw.source === "string" ? raw.source : "geo",
    };
  } catch (err) {
    console.warn("[pet] client geo failed", err);
    return null;
  }
}
