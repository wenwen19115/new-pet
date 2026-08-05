/** 今日摸鱼轻量计数；localStorage，按本地日切。 */

export const PET_MOYU_DAY_KEY = "desktop-pet-moyu-day";

export type MoyuDayStats = {
  day: string;
  taps: number;
  peeks: number;
  peekMs: number;
  performs: number;
  catches: number;
  /** 正在躲藏的开始时刻；菜单可读出「正在躲」时长 */
  peekStartedAt: number | null;
};

export type MoyuDayBump = Partial<
  Pick<MoyuDayStats, "taps" | "peeks" | "peekMs" | "performs" | "catches">
>;

function localDayId(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyStats(day = localDayId()): MoyuDayStats {
  return {
    day,
    taps: 0,
    peeks: 0,
    peekMs: 0,
    performs: 0,
    catches: 0,
    peekStartedAt: null,
  };
}

function clampNonNeg(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), 1_000_000);
}

export function loadMoyuDayStats(now = new Date()): MoyuDayStats {
  const today = localDayId(now);
  try {
    const raw = localStorage.getItem(PET_MOYU_DAY_KEY);
    if (!raw) return emptyStats(today);
    const parsed = JSON.parse(raw) as Partial<MoyuDayStats>;
    if (typeof parsed.day !== "string" || parsed.day !== today) {
      return emptyStats(today);
    }
    return {
      day: today,
      taps: clampNonNeg(Number(parsed.taps)),
      peeks: clampNonNeg(Number(parsed.peeks)),
      peekMs: clampNonNeg(Number(parsed.peekMs)),
      performs: clampNonNeg(Number(parsed.performs)),
      catches: clampNonNeg(Number(parsed.catches)),
      peekStartedAt:
        typeof parsed.peekStartedAt === "number" && parsed.peekStartedAt > 0
          ? parsed.peekStartedAt
          : null,
    };
  } catch {
    return emptyStats(today);
  }
}

function writeMoyuDayStats(stats: MoyuDayStats): void {
  try {
    localStorage.setItem(PET_MOYU_DAY_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

/** 清缓存 / 出厂：去掉今日摸鱼战绩；有键才算清到 */
export function clearMoyuDayStats(): boolean {
  try {
    if (localStorage.getItem(PET_MOYU_DAY_KEY) == null) return false;
    localStorage.removeItem(PET_MOYU_DAY_KEY);
    return true;
  } catch {
    return false;
  }
}

export function bumpMoyuDay(delta: MoyuDayBump, now = new Date()): MoyuDayStats {
  const cur = loadMoyuDayStats(now);
  const next: MoyuDayStats = {
    ...cur,
    taps: clampNonNeg(cur.taps + (delta.taps ?? 0)),
    peeks: clampNonNeg(cur.peeks + (delta.peeks ?? 0)),
    peekMs: clampNonNeg(cur.peekMs + (delta.peekMs ?? 0)),
    performs: clampNonNeg(cur.performs + (delta.performs ?? 0)),
    catches: clampNonNeg(cur.catches + (delta.catches ?? 0)),
  };
  writeMoyuDayStats(next);
  return next;
}

export function noteMoyuPeekStart(now = Date.now()): void {
  const cur = loadMoyuDayStats(new Date(now));
  if (cur.peekStartedAt != null) return;
  writeMoyuDayStats({
    ...cur,
    peeks: clampNonNeg(cur.peeks + 1),
    peekStartedAt: now,
  });
}

export function noteMoyuPeekEnd(now = Date.now()): void {
  const cur = loadMoyuDayStats(new Date(now));
  if (cur.peekStartedAt == null) return;
  const elapsed = Math.max(0, now - cur.peekStartedAt);
  writeMoyuDayStats({
    ...cur,
    peekMs: clampNonNeg(cur.peekMs + elapsed),
    peekStartedAt: null,
  });
}

function formatPeekDuration(ms: number, en: boolean): string {
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 60) return en ? `${sec}s hid` : `躲了 ${sec} 秒`;
  const min = Math.max(1, Math.round(sec / 60));
  return en ? `${min}m hid` : `躲了 ${min} 分`;
}

/** 仪表盘一行；空闲时给一句轻提示 */
export function formatMoyuDayLine(
  locale: "zh" | "en",
  now = new Date()
): string {
  const s = loadMoyuDayStats(now);
  let peekMs = s.peekMs;
  if (s.peekStartedAt != null) {
    peekMs += Math.max(0, now.getTime() - s.peekStartedAt);
  }
  const en = locale === "en";
  const parts: string[] = [];
  if (s.taps > 0) {
    parts.push(en ? `poked ${s.taps}×` : `被点 ${s.taps} 次`);
  }
  if (peekMs >= 1000 || s.peeks > 0) {
    parts.push(formatPeekDuration(peekMs, en));
  }
  if (s.performs > 0) {
    parts.push(en ? `${s.performs} tricks` : `表演 ${s.performs} 次`);
  }
  if (s.catches > 0) {
    parts.push(en ? `caught ${s.catches}×` : `抓到 ${s.catches} 次`);
  }
  if (!parts.length) {
    return en ? "No moyu yet today" : "今天还没开始摸鱼～";
  }
  return en ? `Today · ${parts.join(" · ")}` : `今天 · ${parts.join(" · ")}`;
}
