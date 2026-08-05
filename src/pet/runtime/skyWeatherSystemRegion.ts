/**
 * 跟随系统地区：IP 粗定位 → 最近示意城。
 * 无网/失败 → offline；不自动重试，靠手动刷新。
 */
import {
  FALLBACK_REGION_ID,
  SKY_REGIONS,
  nearestSkyRegion,
} from "@/pet/data/skyWeather";
import { fetchClientGeo } from "@/pet/bridge/skyWeather";

type SystemRegionHit = {
  id: string;
  lat: number;
  lon: number;
  source: string;
  city: string;
  offline: boolean;
};

let cache: SystemRegionHit | null = null;
let inflight: Promise<SystemRegionHit> | null = null;
/** 递增作废旧请求写 cache；force / clear 都会 bump */
let fetchSeq = 0;

export function clearSystemRegionCache() {
  cache = null;
  inflight = null;
  fetchSeq += 1;
}

/** 当前缓存的在线定位城；无缓存或离线则为 null */
export function peekSystemRegionId(): string | null {
  if (!cache || cache.offline) return null;
  return SKY_REGIONS[cache.id] ? cache.id : null;
}

function fromOffline(): SystemRegionHit {
  const r = SKY_REGIONS[FALLBACK_REGION_ID]!;
  return {
    id: r.id,
    lat: r.lat,
    lon: r.lon,
    source: "offline",
    city: "",
    offline: true,
  };
}

function fromGeo(geo: {
  lat: number;
  lon: number;
  source: string;
  city: string;
}): SystemRegionHit {
  const id = nearestSkyRegion(geo.lat, geo.lon);
  return {
    id,
    lat: geo.lat,
    lon: geo.lon,
    source: geo.source,
    city: geo.city || SKY_REGIONS[id]?.name || id,
    offline: false,
  };
}

/** force=true 才重新拉；失败结果也会缓存，直到手动再刷 */
export async function resolveSystemRegion(
  opts?: { force?: boolean }
): Promise<SystemRegionHit> {
  if (!opts?.force) {
    if (cache) return cache;
    if (inflight) return inflight;
  }

  const mySeq = ++fetchSeq;
  const job = (async (): Promise<SystemRegionHit> => {
    const geo = await fetchClientGeo();
    const hit = geo?.ok ? fromGeo(geo) : fromOffline();
    // 仅最新一次写 cache，避免 force 竞态被旧请求覆盖
    if (mySeq === fetchSeq) cache = hit;
    return hit;
  })();

  inflight = job;
  try {
    const hit = await job;
    if (mySeq !== fetchSeq) {
      // 已被更新的 force/clear 取代：跟最新结果
      if (inflight) return inflight;
      if (cache) return cache;
    }
    return hit;
  } finally {
    if (inflight === job) inflight = null;
  }
}
