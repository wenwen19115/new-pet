import { describe, expect, it } from "vitest";
import { pickPlayfulLine } from "../content/dialogue/lines";
import {
  advancePlayfulMissStreak,
  cursorNearPet,
  playfulScareRadius,
  PLAYFUL_MISS_STREAK_NEED,
} from "./playfulPhysics";

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

  it("miss streak sulks at 3 and may peek", () => {
    let streak = 0;
    const first = advancePlayfulMissStreak(streak, 0);
    expect(first.sulk).toBe(false);
    expect(first.missStreak).toBe(1);
    streak = first.missStreak;

    const second = advancePlayfulMissStreak(streak, 0);
    expect(second.sulk).toBe(false);
    streak = second.missStreak;

    const thirdForcePeek = advancePlayfulMissStreak(streak, 0);
    expect(thirdForcePeek.sulk).toBe(true);
    expect(thirdForcePeek.maybePeek).toBe(true);
    expect(thirdForcePeek.missStreak).toBe(0);

    const thirdNoPeek = advancePlayfulMissStreak(
      PLAYFUL_MISS_STREAK_NEED - 1,
      0.99
    );
    expect(thirdNoPeek.sulk).toBe(true);
    expect(thirdNoPeek.maybePeek).toBe(false);
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
