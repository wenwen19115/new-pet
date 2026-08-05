import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { getCharacter } from "../characters";
import { pickPlayfulLine, pickUsbFollowUpLine } from "../content/dialogue/lines";
import { buildIdleMotionPool } from "../content/motion/motionPlayer";
import {
  advancePlayfulMissStreak,
  canPlayfulCatch,
  cursorNearPet,
  playfulScareRadius,
  PLAYFUL_MENU_BURST_MS,
  PLAYFUL_MISS_STREAK_NEED,
} from "./playfulPhysics";
import { usePetPlayfulHost } from "./usePetPlayfulHost";
import type { PetSettings } from "../data/types";

describe("playfulPhysics", () => {
  it("scare radius grows with body size", () => {
    expect(playfulScareRadius(220, 220)).toBeGreaterThan(
      playfulScareRadius(100, 100)
    );
    expect(playfulScareRadius(40, 40)).toBeGreaterThanOrEqual(130);
  });

  it("cursorNearPet uses scare radius", () => {
    const center = { x: 500, y: 400 };
    expect(cursorNearPet({ x: 500, y: 400 }, center, 120)).toBe(true);
    expect(cursorNearPet({ x: 800, y: 400 }, center, 120)).toBe(false);
  });

  it("miss streak sulks at 3", () => {
    let streak = 0;
    const first = advancePlayfulMissStreak(streak);
    expect(first.sulk).toBe(false);
    expect(first.missStreak).toBe(1);
    streak = first.missStreak;

    const second = advancePlayfulMissStreak(streak);
    expect(second.sulk).toBe(false);
    streak = second.missStreak;

    const third = advancePlayfulMissStreak(streak);
    expect(third.sulk).toBe(true);
    expect(third.missStreak).toBe(0);

    const again = advancePlayfulMissStreak(PLAYFUL_MISS_STREAK_NEED - 1);
    expect(again.sulk).toBe(true);
  });

  it("canPlayfulCatch only inside catch window", () => {
    expect(canPlayfulCatch(1000, 0)).toBe(false);
    expect(canPlayfulCatch(1000, 1000)).toBe(false);
    expect(canPlayfulCatch(999, 1000)).toBe(true);
    expect(canPlayfulCatch(1001, 1000)).toBe(false);
  });

  it("menu burst window is 10s", () => {
    expect(PLAYFUL_MENU_BURST_MS).toBe(10_000);
  });
});

describe("menu perform pool", () => {
  it("buildIdleMotionPool drops disabled motions", () => {
    const chip = getCharacter("chip");
    const disabled = [chip.idleMotions[0]!];
    const pool = buildIdleMotionPool({
      idleMotions: chip.idleMotions,
      disabledMotions: disabled,
    });
    expect(pool).not.toContain(disabled[0]);
    expect(pool.length).toBe(chip.idleMotions.length - 1);
  });
});

describe("character accents", () => {
  it("chip 会追 USB 八卦，fig 落地动作偏低", () => {
    expect(getCharacter("chip").runtime.accents?.usbFollowUpChance).toBeGreaterThan(
      0
    );
    expect(pickUsbFollowUpLine("chip").length).toBeGreaterThan(0);
    expect(pickUsbFollowUpLine("toon")).toBe("");
    // toon 可有 deskWeather 动作口音，但不追 USB 八卦
    expect(getCharacter("toon").runtime.accents?.usbFollowUpChance).toBeUndefined();
    expect(getCharacter("toon").runtime.accents?.deskWeather).toBeTruthy();
    expect(
      getCharacter("fig-sci").runtime.accents?.dragLandMotionChance
    ).toBeLessThan(1);
  });
});

describe("pickPlayfulLine by character", () => {
  it("varies by tone and model pack", () => {
    const chipCute = pickPlayfulLine("catch", "cute", "chip");
    const chipSnarky = pickPlayfulLine("catch", "snarky", "chip");
    expect(chipCute.length).toBeGreaterThan(0);
    expect(chipSnarky.length).toBeGreaterThan(0);
    expect(chipCute).not.toBe(chipSnarky);

    expect(pickPlayfulLine("sulk", "cute", "toon").length).toBeGreaterThan(0);
    expect(pickPlayfulLine("start", "cute", "fig-sci").length).toBeGreaterThan(
      0
    );
  });
});

describe("playful menu burst", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("startBurst flees once and ends after timeout without sticky enable", async () => {
    let chaseActive = false;
    let enabledSticky = false;
    const flee = vi.fn(async () => true);
    const applyMood = vi.fn(() => true);
    const speakText = vi.fn();
    const settings = ref({
      tone: "cute",
      personality: "sunny",
      profiles: {},
    } as unknown as PetSettings);

    const host = usePetPlayfulHost({
      hostAlive: () => true,
      enabled: () => enabledSticky,
      mood: () => "idle",
      isDragging: () => false,
      isMenuOpen: () => false,
      isPeeking: () => false,
      chasePausesIdle: () => chaseActive,
      setChaseIdleGate: (active) => {
        chaseActive = active;
      },
      tone: () => "cute",
      model: () => "chip",
      settings,
      bodyBox: () => ({ w: 120, h: 120 }),
      applyMood: applyMood as never,
      runPlayfulFlee: flee,
      speakText,
      resetSleepTimer: () => {},
    });

    expect(host.startBurst()).toBe(true);
    expect(chaseActive).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(flee).toHaveBeenCalledTimes(1);

    // 超时未抓 → miss 并清 burst；常驻开关仍关
    await vi.advanceTimersByTimeAsync(PLAYFUL_MENU_BURST_MS);
    expect(chaseActive).toBe(false);
    expect(enabledSticky).toBe(false);
    expect(applyMood).toHaveBeenCalledWith("grumpy", "playful-miss");

    // burst 结束后靠近不再追
    flee.mockClear();
    await host.tickProximity({ x: 500, y: 400 }, { x: 500, y: 400 });
    expect(flee).not.toHaveBeenCalled();
  });
});
