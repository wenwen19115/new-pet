import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bumpMoyuDay,
  clearMoyuDayStats,
  formatMoyuDayLine,
  loadMoyuDayStats,
  noteMoyuPeekEnd,
  noteMoyuPeekStart,
  PET_MOYU_DAY_KEY,
} from "./moyuDay";

describe("moyuDay", () => {
  afterEach(() => {
    localStorage.removeItem(PET_MOYU_DAY_KEY);
    vi.useRealTimers();
  });

  it("bumps and rolls over by local day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 5, 10, 0, 0));
    bumpMoyuDay({ taps: 2, performs: 1 });
    expect(loadMoyuDayStats().taps).toBe(2);
    expect(formatMoyuDayLine("zh")).toContain("被点 2 次");
    expect(formatMoyuDayLine("zh")).toContain("表演 1 次");

    vi.setSystemTime(new Date(2026, 7, 6, 1, 0, 0));
    expect(loadMoyuDayStats().taps).toBe(0);
    expect(formatMoyuDayLine("zh")).toContain("还没开始摸鱼");
  });

  it("accumulates peek duration across start/end", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 5, 12, 0, 0));
    noteMoyuPeekStart(Date.now());
    vi.setSystemTime(new Date(2026, 7, 5, 12, 0, 45));
    noteMoyuPeekEnd(Date.now());
    const line = formatMoyuDayLine("zh");
    expect(line).toContain("躲了 45 秒");
    expect(loadMoyuDayStats().peeks).toBe(1);
    expect(loadMoyuDayStats().peekStartedAt).toBeNull();
  });

  it("empty day has soft empty line", () => {
    expect(formatMoyuDayLine("en")).toMatch(/No moyu/i);
  });

  it("clearMoyuDayStats removes key", () => {
    bumpMoyuDay({ taps: 3 });
    expect(clearMoyuDayStats()).toBe(true);
    expect(localStorage.getItem(PET_MOYU_DAY_KEY)).toBeNull();
    expect(clearMoyuDayStats()).toBe(false);
    expect(formatMoyuDayLine("zh")).toContain("还没开始摸鱼");
  });
});
