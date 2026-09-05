import * as THREE from "three";

const FRAME_BONES = [
  "hips",
  "head",
  "leftHand",
  "rightHand",
  "leftFoot",
  "rightFoot",
] as const;

export type FrameBoneName = (typeof FRAME_BONES)[number];

/** 用关键人型点撑开包围盒；缺 hips 或极端点则失败 */
export function fillHumanoidFrameBox(
  box: THREE.Box3,
  sample: (name: FrameBoneName, out: THREE.Vector3) => boolean
): boolean {
  const tmp = new THREE.Vector3();
  const pts: THREE.Vector3[] = [];
  let hasHips = false;
  for (const name of FRAME_BONES) {
    if (!sample(name, tmp)) continue;
    if (name === "hips") hasHips = true;
    pts.push(tmp.clone());
  }
  if (!hasHips || pts.length < 3) return false;
  return expandBoxFromPoints(box, pts);
}

export function expandBoxFromPoints(
  box: THREE.Box3,
  points: readonly THREE.Vector3[]
): boolean {
  if (!points.length) return false;
  box.makeEmpty();
  for (const p of points) box.expandByPoint(p);
  return !box.isEmpty();
}

/**
 * 透视相机下把 AABB 装进画面所需距离（世界单位）。
 * aspect = width/height；pad > 1 留边。
 */
export function distToFitAabb(
  size: { x: number; y: number; z: number },
  fovDeg: number,
  aspect: number,
  pad = 1.18
): number {
  const fov = (Math.max(1, fovDeg) * Math.PI) / 180;
  const halfV = Math.tan(fov / 2);
  const halfH = halfV * Math.max(0.2, aspect);
  const h = Math.max(0.05, size.y) * pad;
  const w = Math.max(0.05, Math.max(size.x, size.z)) * pad;
  const distV = h / 2 / halfV;
  const distH = w / 2 / halfH;
  return Math.max(distV, distH, 0.8);
}

/** 世界水平位移 → 桌面逻辑像素（Y 向上为正世界，桌面 Y 向下） */
export function worldDeltaToScreenPx(
  worldDx: number,
  worldDy: number,
  pixelsPerMeter: number
): { x: number; y: number } {
  const s = Number.isFinite(pixelsPerMeter) ? pixelsPerMeter : 0;
  return { x: worldDx * s, y: -worldDy * s };
}

/** 把世界位移投影到相机右向，得到屏幕水平分量（米） */
export function projectWorldDeltaToCameraRight(
  delta: THREE.Vector3,
  camera: THREE.Camera,
  out = new THREE.Vector3()
): number {
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  const right = out.set(0, 1, 0).cross(fwd).normalize();
  if (right.lengthSq() < 1e-6) return delta.x;
  return delta.dot(right);
}

/** 钉死水平根位移：只适配原地片，防残留 XZ 漂 */
export function bakeVrmaClipInPlace(clip: THREE.AnimationClip): void {
  for (const track of clip.tracks) {
    if (!/\.position$/i.test(track.name)) continue;
    const v = track.values;
    if (!v || v.length < 3 || v.length % 3 !== 0) continue;
    const x0 = v[0]!;
    const z0 = v[2]!;
    for (let i = 0; i < v.length; i += 3) {
      v[i] = x0;
      v[i + 2] = z0;
    }
  }
}
