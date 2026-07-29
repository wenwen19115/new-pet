import { describe, expect, it } from "vitest";
import {
  cursorNearPet,
  pickPlayfulLine,
  playfulScareRadius,
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

  it("pickPlayfulLine varies by tone", () => {
    expect(pickPlayfulLine("catch", "cute")).not.toBe(
      pickPlayfulLine("catch", "snarky")
    );
    expect(pickPlayfulLine("start", "cute").length).toBeGreaterThan(0);
  });
});
