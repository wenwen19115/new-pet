import { describe, expect, it } from "vitest";
import {
  findMotionListMeta,
  groupMotionIdsByKind,
} from "@/pet/content/motion/motionListMeta";

describe("motionListMeta", () => {
  it("resolves VRM and shell meta", () => {
    expect(findMotionListMeta("vrm-idle")?.kind).toBe("idle");
    expect(findMotionListMeta("happy-bounce")?.kind).toBe("emotion");
    expect(findMotionListMeta("screen-zip")?.kind).toBe("gesture");
  });

  it("groups chip-like pool like VRM list UI", () => {
    const groups = groupMotionIdsByKind([
      "screen-dash",
      "happy-bounce",
      "bow-nod",
      "sway-step",
    ]);
    expect(groups.map((g) => g.kind)).toEqual([
      "idle",
      "talk",
      "gesture",
      "emotion",
    ]);
    expect(groups.find((g) => g.kind === "idle")?.ids).toEqual(["sway-step"]);
    expect(groups.find((g) => g.kind === "talk")?.ids).toEqual(["bow-nod"]);
  });
});
