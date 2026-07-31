import { describe, expect, it } from "vitest";
import { pickBubblePongLine } from "../../content/dialogue/lines";
import {
  advanceBubblePongTap,
  BUBBLE_PONG_ANNOY_NEED,
} from "./bubblePong";

describe("bubblePong", () => {
  it("连点满额才嫌弃并清零", () => {
    let taps = 0;
    const a = advanceBubblePongTap(taps);
    expect(a.annoyed).toBe(false);
    expect(a.taps).toBe(1);
    taps = a.taps;

    const b = advanceBubblePongTap(taps);
    expect(b.annoyed).toBe(false);
    taps = b.taps;

    const c = advanceBubblePongTap(taps);
    expect(c.annoyed).toBe(true);
    expect(c.taps).toBe(0);

    expect(BUBBLE_PONG_ANNOY_NEED).toBe(3);
  });

  it("嫌弃台词按角色池有货", () => {
    expect(pickBubblePongLine("chip").length).toBeGreaterThan(0);
    expect(pickBubblePongLine("toon").length).toBeGreaterThan(0);
  });
});
