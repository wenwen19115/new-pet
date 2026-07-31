import type { BoneEuler, VrmBoneName, VrmPoseFrame, VrmPoseMap } from "../../data/vrmPoses";
import { poseIdle } from "../../data/vrmPoses";

const CUSTOM_VRM_MOTION_PREFIX = "custom:";

const EDITABLE_VRM_BONES: VrmBoneName[] = [
  "head",
  "neck",
  "spine",
  "chest",
  "upperChest",
  "leftShoulder",
  "leftUpperArm",
  "leftLowerArm",
  "leftHand",
  "rightShoulder",
  "rightUpperArm",
  "rightLowerArm",
  "rightHand",
  "leftUpperLeg",
  "leftLowerLeg",
  "rightUpperLeg",
  "rightLowerLeg",
  "hips",
];

type CustomVrmBoneGroup =
  | "head"
  | "torso"
  | "leftArm"
  | "rightArm"
  | "legs";

export const CUSTOM_VRM_BONE_GROUPS: Array<{
  id: CustomVrmBoneGroup;
  bones: VrmBoneName[];
}> = [
  { id: "head", bones: ["head", "neck"] },
  { id: "torso", bones: ["hips", "spine", "chest", "upperChest"] },
  {
    id: "leftArm",
    bones: ["leftShoulder", "leftUpperArm", "leftLowerArm", "leftHand"],
  },
  {
    id: "rightArm",
    bones: ["rightShoulder", "rightUpperArm", "rightLowerArm", "rightHand"],
  },
  {
    id: "legs",
    bones: ["leftUpperLeg", "leftLowerLeg", "rightUpperLeg", "rightLowerLeg"],
  },
];

interface CustomVrmKeyFrame {
  /** 0–1 within the loop */
  t: number;
  bones: VrmPoseMap;
  rootY?: number;
  rootYaw?: number;
}

export interface CustomVrmMotion {
  id: string;
  name: string;
  /** Full loop length in ms */
  durationMs: number;
  includeInRandom: boolean;
  /** ≥1 poses; playback lerps across them then loops */
  keyframes: CustomVrmKeyFrame[];
}

export function isCustomVrmMotionId(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(CUSTOM_VRM_MOTION_PREFIX);
}

function createCustomVrmMotionId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${CUSTOM_VRM_MOTION_PREFIX}${rand}`;
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function clampAxis(n: unknown): number {
  return clamp(Number(n ?? 0), -Math.PI, Math.PI);
}

function normalizeBoneEuler(raw: unknown): BoneEuler | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as BoneEuler;
  const x = clampAxis(o.x);
  const y = clampAxis(o.y);
  const z = clampAxis(o.z);
  if (x === 0 && y === 0 && z === 0) return { x: 0, y: 0, z: 0 };
  return { x, y, z };
}

function normalizePoseMap(raw: unknown): VrmPoseMap {
  if (!raw || typeof raw !== "object") return {};
  const out: VrmPoseMap = {};
  const src = raw as Record<string, unknown>;
  for (const name of EDITABLE_VRM_BONES) {
    const e = normalizeBoneEuler(src[name]);
    if (e) out[name] = e;
  }
  return out;
}

function normalizeKeyFrame(
  raw: Partial<CustomVrmKeyFrame> | null | undefined,
  fallbackT: number
): CustomVrmKeyFrame {
  return {
    t: clamp(Number(raw?.t ?? fallbackT), 0, 1),
    bones: normalizePoseMap(raw?.bones),
    rootY: clamp(Number(raw?.rootY ?? 0), -0.2, 0.2),
    rootYaw: clampAxis(raw?.rootYaw ?? 0),
  };
}

export function createDefaultKeyframes(): CustomVrmKeyFrame[] {
  const idle = poseIdle(0);
  return [
    {
      t: 0,
      bones: { ...idle.bones },
      rootY: idle.rootY ?? 0,
      rootYaw: 0,
    },
    {
      t: 0.5,
      bones: {
        ...idle.bones,
        rightUpperArm: { x: -0.35, y: -0.7, z: -0.15 },
        rightLowerArm: { x: 0.25, y: -0.1, z: -0.25 },
        leftUpperArm: { x: 0.05, y: 0.28, z: 0.5 },
        head: { x: -0.08, y: 0.12, z: 0 },
      },
      rootY: 0.01,
      rootYaw: 0.08,
    },
  ];
}

export function createEmptyCustomVrmMotion(name: string): CustomVrmMotion {
  return {
    id: createCustomVrmMotionId(),
    name: name.trim().slice(0, 24) || "Pose",
    durationMs: 2800,
    includeInRandom: true,
    keyframes: createDefaultKeyframes(),
  };
}

function normalizeCustomVrmMotion(
  raw: Partial<CustomVrmMotion> | null | undefined
): CustomVrmMotion | null {
  if (!raw || typeof raw !== "object") return null;

  const id =
    typeof raw.id === "string" && isCustomVrmMotionId(raw.id)
      ? raw.id
      : createCustomVrmMotionId();
  const name =
    typeof raw.name === "string" ? raw.name.trim().slice(0, 24) : "";
  if (!name) return null;

  const framesRaw = Array.isArray(raw.keyframes) ? raw.keyframes : [];
  let keyframes = framesRaw
    .map((f, i) =>
      normalizeKeyFrame(f as Partial<CustomVrmKeyFrame>, i === 0 ? 0 : 0.5)
    )
    .sort((a, b) => a.t - b.t);

  if (keyframes.length === 0) keyframes = createDefaultKeyframes();
  if (keyframes.length === 1) {
    keyframes = [
      { ...keyframes[0]!, t: 0 },
      { ...keyframes[0]!, t: 0.5, bones: { ...keyframes[0]!.bones } },
    ];
  }
  keyframes[0]!.t = 0;
  if (keyframes.length > 24) keyframes = keyframes.slice(0, 24);

  return {
    id,
    name,
    durationMs: Math.round(clamp(Number(raw.durationMs ?? 2800), 800, 12000)),
    includeInRandom: raw.includeInRandom !== false,
    keyframes,
  };
}

export function normalizeCustomVrmMotions(raw: unknown): CustomVrmMotion[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomVrmMotion[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const m = normalizeCustomVrmMotion(item as Partial<CustomVrmMotion>);
    if (!m || seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
    if (out.length >= 24) break;
  }
  return out;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpEuler(a: BoneEuler | undefined, b: BoneEuler | undefined, t: number): BoneEuler {
  return {
    x: lerp(a?.x ?? 0, b?.x ?? 0, t),
    y: lerp(a?.y ?? 0, b?.y ?? 0, t),
    z: lerp(a?.z ?? 0, b?.z ?? 0, t),
  };
}

function lerpFrame(a: CustomVrmKeyFrame, b: CustomVrmKeyFrame, t: number): VrmPoseFrame {
  const bones: VrmPoseMap = {};
  const names = new Set([
    ...Object.keys(a.bones),
    ...Object.keys(b.bones),
  ] as VrmBoneName[]);
  for (const name of names) {
    bones[name] = lerpEuler(a.bones[name], b.bones[name], t);
  }
  return {
    bones,
    rootY: lerp(a.rootY ?? 0, b.rootY ?? 0, t),
    rootYaw: lerp(a.rootYaw ?? 0, b.rootYaw ?? 0, t),
  };
}

/** Sample bone pose at time `t` seconds (loops by durationMs) */
export function resolveCustomVrmPose(
  motion: CustomVrmMotion,
  t: number
): VrmPoseFrame {
  const frames = motion.keyframes;
  if (!frames.length) return poseIdle(t);
  if (frames.length === 1) {
    const f = frames[0]!;
    return { bones: { ...f.bones }, rootY: f.rootY, rootYaw: f.rootYaw };
  }

  const dur = Math.max(0.2, motion.durationMs / 1000);
  const u = ((t % dur) + dur) % dur / dur; // 0–1

  // Loop: treat last→first
  const ordered = [...frames].sort((a, b) => a.t - b.t);
  let i0 = ordered.length - 1;
  let i1 = 0;
  for (let i = 0; i < ordered.length - 1; i++) {
    if (u >= ordered[i]!.t && u <= ordered[i + 1]!.t) {
      i0 = i;
      i1 = i + 1;
      break;
    }
  }

  const a = ordered[i0]!;
  const b = ordered[i1]!;
  let span: number;
  let local: number;
  if (i1 === 0 && i0 === ordered.length - 1) {
    span = 1 - a.t + b.t;
    local = u >= a.t ? (u - a.t) / Math.max(1e-6, span) : (u + 1 - a.t) / Math.max(1e-6, span);
  } else {
    span = Math.max(1e-6, b.t - a.t);
    local = (u - a.t) / span;
  }
  return lerpFrame(a, b, clamp(local, 0, 1));
}

export function findCustomVrmMotion(
  list: CustomVrmMotion[],
  id: string
): CustomVrmMotion | undefined {
  return list.find((m) => m.id === id);
}

export function radToDeg(rad: number): number {
  return Math.round(((rad * 180) / Math.PI) * 10) / 10;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function getBoneAxisDeg(
  bones: VrmPoseMap,
  name: VrmBoneName,
  axis: "x" | "y" | "z"
): number {
  return radToDeg(bones[name]?.[axis] ?? 0);
}

export function setBoneAxisDeg(
  bones: VrmPoseMap,
  name: VrmBoneName,
  axis: "x" | "y" | "z",
  deg: number
): VrmPoseMap {
  const next = { ...bones };
  const cur = { x: 0, y: 0, z: 0, ...next[name] };
  cur[axis] = degToRad(clamp(deg, -180, 180));
  next[name] = cur;
  return next;
}
