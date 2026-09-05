import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  distToFitAabb,
  expandBoxFromPoints,
  fillHumanoidFrameBox,
  worldDeltaToScreenPx,
} from "./vrmFraming";

describe("vrmFraming", () => {
  it("distToFitAabb grows with taller or wider AABB", () => {
    const tall = distToFitAabb({ x: 0.4, y: 1.6, z: 0.3 }, 30, 0.62);
    const short = distToFitAabb({ x: 0.4, y: 0.8, z: 0.3 }, 30, 0.62);
    const wide = distToFitAabb({ x: 1.8, y: 1.6, z: 0.3 }, 30, 0.62);
    expect(tall).toBeGreaterThan(short);
    expect(wide).toBeGreaterThan(tall * 0.9);
  });

  it("fillHumanoidFrameBox needs hips+extremities", () => {
    const box = new THREE.Box3();
    const map: Record<string, THREE.Vector3> = {
      hips: new THREE.Vector3(0, 1, 0),
      head: new THREE.Vector3(0, 1.6, 0),
      leftHand: new THREE.Vector3(-0.4, 1.1, 0),
      rightHand: new THREE.Vector3(0.4, 1.1, 0),
      leftFoot: new THREE.Vector3(-0.1, 0.05, 0),
      rightFoot: new THREE.Vector3(0.1, 0.05, 0),
    };
    const ok = fillHumanoidFrameBox(box, (name, out) => {
      const p = map[name];
      if (!p) return false;
      out.copy(p);
      return true;
    });
    expect(ok).toBe(true);
    expect(box.min.y).toBeLessThan(0.2);
    expect(box.max.y).toBeGreaterThan(1.5);
    const size = box.getSize(new THREE.Vector3());
    const dist = distToFitAabb(size, 30, 0.62, 1.22);
    expect(dist).toBeGreaterThan(2);
  });

  it("expandBoxFromPoints rejects empty", () => {
    const box = new THREE.Box3();
    expect(expandBoxFromPoints(box, [])).toBe(false);
  });

  it("worldDeltaToScreenPx flips Y for desktop coords", () => {
    const p = worldDeltaToScreenPx(0.5, 0.25, 200);
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(-50);
  });

  it("bakeVrmaClipInPlace pins .position XZ to first key", async () => {
    const { bakeVrmaClipInPlace } = await import("./vrmFraming");
    const clip = new THREE.AnimationClip("t", 1, [
      new THREE.VectorKeyframeTrack("hips.position", [0, 1], [
        1, 0.8, 2, 4, 0.9, 6,
      ]),
    ]);
    bakeVrmaClipInPlace(clip);
    const v = clip.tracks[0]!.values;
    expect(v[0]).toBe(1);
    expect(v[2]).toBe(2);
    expect(v[3]).toBe(1);
    expect(v[5]).toBe(2);
  });
});
