/**
 * VRM 骨骼姿态（Normalized Humanoid）。
 * 轴向以 docs/VRM_MOTION.md §2 实测表为准（勿用纸面「X=屈肘」常识）。
 * 站姿 REST / restArms；屈肘=前臂 Z；体前抬=上臂 X+；躯干前倾=FWD(-1)。
 * 动作优化首要目标：活人感（§5.1）——可见节拍差与关节连锁，禁止微差交差。
 */
import type { PetIdleMotion } from "../content/motion/motions";
import type { PetMood } from "./types";

/** Euler XYZ（弧度），相对 normalized T-pose */
export type BoneEuler = { x?: number; y?: number; z?: number };

export type VrmBoneName =
  | "hips"
  | "spine"
  | "chest"
  | "upperChest"
  | "neck"
  | "head"
  | "leftShoulder"
  | "rightShoulder"
  | "leftUpperArm"
  | "leftLowerArm"
  | "leftHand"
  | "rightUpperArm"
  | "rightLowerArm"
  | "rightHand"
  | "leftUpperLeg"
  | "leftLowerLeg"
  | "rightUpperLeg"
  | "rightLowerLeg";

export type VrmPoseMap = Partial<Record<VrmBoneName, BoneEuler>>;

export interface VrmPoseFrame {
  bones: VrmPoseMap;
  rootY?: number;
  rootYaw?: number;
}

/** 躯干前倾：预览正面朝相机时实测 X- ≈ 鞠躬前倾（非世界轴纸面符号） */
const FWD = -1;

/** 上臂 T-pose→体侧的基准 Z（弧度）；左 +、右 − */
const ZL = Math.PI * 0.34;
const ZR = -Math.PI * 0.34;

/**
 * A-pose 相对 T-pose 的站姿量（度）。与设置页滑条、docs/VRM_MOTION.md 一致。
 */
const REST = {
  shoulder: { x: 3.4, y: 6.9, z: 21 },
  upper: { x: 3.4, y: 16, zExtra: 10.3 },
  elbowL: { x: 35.5, y: 6.9, z: 25 },
  elbowR: { x: 15, y: 6.9, z: 25 },
  handL: { x: -5, y: 3.4, z: 4.6 },
  handR: { x: 10, y: 3.4, z: 10 },
} as const;

function e(x = 0, y = 0, z = 0): BoneEuler {
  return { x, y, z };
}

function deg(n: number): number {
  return (n * Math.PI) / 180;
}

function mergePose(...parts: VrmPoseMap[]): VrmPoseMap {
  const out: VrmPoseMap = {};
  for (const p of parts) {
    for (const [k, v] of Object.entries(p)) {
      const key = k as VrmBoneName;
      out[key] = { x: 0, y: 0, z: 0, ...out[key], ...v };
    }
  }
  return out;
}

/** 站姿手臂；swingL/R 只推上臂 X，肩 Z 不动 */
function restArms(opts?: { swingL?: number; swingR?: number }): VrmPoseMap {
  const sL = opts?.swingL ?? 0;
  const sR = opts?.swingR ?? 0;
  const sh = REST.shoulder;
  const up = REST.upper;
  const eL = REST.elbowL;
  const eR = REST.elbowR;
  const hL = REST.handL;
  const hR = REST.handR;
  return {
    leftShoulder: e(deg(sh.x), deg(sh.y), deg(-sh.z)),
    rightShoulder: e(deg(sh.x), deg(-sh.y), deg(sh.z)),
    leftUpperArm: e(deg(up.x) + sL, deg(up.y), ZL + deg(up.zExtra)),
    rightUpperArm: e(deg(up.x) + sR, deg(-up.y), ZR - deg(up.zExtra)),
    leftLowerArm: e(
      deg(eL.x) + Math.max(0, -sL) * 0.35,
      deg(eL.y),
      deg(eL.z)
    ),
    rightLowerArm: e(
      deg(eR.x) + Math.max(0, -sR) * 0.35,
      deg(-eR.y),
      deg(-eR.z)
    ),
    leftHand: e(deg(hL.x), deg(hL.y), deg(hL.z)),
    rightHand: e(deg(hR.x), deg(-hR.y), deg(hR.z)),
  };
}

/** 站姿外展：左 Z- / 右 Z+；约 3°——略宽于贴腿，避免 A 字过开 */
const STANCE_ZL = deg(-3.2);
const STANCE_ZR = deg(3.2);

function restLegs(weight = 0): VrmPoseMap {
  return {
    // upperLeg X- ≈ 大腿朝前
    leftUpperLeg: e(-0.03 + weight * 0.04, 0, STANCE_ZL),
    rightUpperLeg: e(-0.03 - weight * 0.04, 0, STANCE_ZR),
    leftLowerLeg: knee(3),
    rightLowerLeg: knee(3),
  };
}

/** 正常屈膝（度→弧度）。normalized：lowerLeg X- = 屈膝，X+ = 反关节 */
function knee(flexDeg: number): BoneEuler {
  return e(deg(-Math.max(0, flexDeg)));
}

/**
 * 双臂上抬（直臂/欢呼类）。raise 0..1：0=体侧，1=高举。
 * 抬起主轴：上臂 Z。屈臂伸懒腰勿用本函数，用 stretchArmChain（前臂 Z 屈肘 + 上臂 X+）。
 */
function raiseBothArms(
  raise: number,
  opts?: { openDeg?: number; elbowDeg?: number; overhead?: boolean }
): VrmPoseMap {
  const a = Math.min(1, Math.max(0, raise));
  const open = deg(opts?.openDeg ?? 14) * a;
  const restZL = ZL + deg(REST.upper.zExtra);
  const restZR = ZR - deg(REST.upper.zExtra);
  const zRaisedL = deg(opts?.overhead ? -45 : 18);
  const zRaisedR = deg(opts?.overhead ? 45 : -18);
  const zL = restZL * (1 - a) + zRaisedL * a;
  const zR = restZR * (1 - a) + zRaisedR * a;
  const pitch = deg(opts?.overhead ? -55 : -28) * a;
  const elbowL = deg(opts?.elbowDeg ?? 28) + deg(REST.elbowL.x) * (1 - a) * 0.35;
  const elbowR = deg(opts?.elbowDeg ?? 24) + deg(REST.elbowR.x) * (1 - a) * 0.35;

  return {
    leftShoulder: e(
      deg(REST.shoulder.x + 4 * a),
      deg(REST.shoulder.y + 6 * a),
      deg(-REST.shoulder.z + 6 * a)
    ),
    rightShoulder: e(
      deg(REST.shoulder.x + 4 * a),
      deg(-(REST.shoulder.y + 6 * a)),
      deg(REST.shoulder.z - 6 * a)
    ),
    leftUpperArm: e(deg(REST.upper.x) + pitch, deg(REST.upper.y) + open, zL),
    rightUpperArm: e(deg(REST.upper.x) + pitch, deg(-REST.upper.y) - open, zR),
    leftLowerArm: e(elbowL, deg(REST.elbowL.y), deg(REST.elbowL.z - 4 * a)),
    rightLowerArm: e(elbowR, deg(-REST.elbowR.y), deg(-(REST.elbowR.z - 4 * a))),
    leftHand: e(deg(REST.handL.x - 4 * a), deg(REST.handL.y), deg(REST.handL.z + 4 * a)),
    rightHand: e(deg(REST.handR.x + 4 * a), deg(-REST.handR.y), deg(REST.handR.z + 4 * a)),
  };
}

/** 0..1：起势 → 停住 → 缓回 */
function holdEnvelope(t: number, periodSec: number, hold = 0.4): number {
  const period = Math.max(0.6, periodSec);
  const u = (((t % period) + period) % period) / period;
  const downEnd = Math.max(0.12, (1 - hold) * 0.45);
  const holdEnd = downEnd + hold;
  if (u < downEnd) {
    const x = u / downEnd;
    return x * x * (3 - 2 * x);
  }
  if (u < holdEnd) return 1;
  const x = (u - holdEnd) / Math.max(0.08, 1 - holdEnd);
  const s = x * x * (3 - 2 * x);
  return 1 - s;
}

function applySoftHeadGaze(
  pose: VrmPoseFrame,
  gaze: { x: number; y: number }
): VrmPoseFrame {
  const gx = Math.max(-1, Math.min(1, gaze.x / 2));
  const gy = Math.max(-1, Math.min(1, gaze.y / 2));
  const head = pose.bones.head || e();
  const neck = pose.bones.neck || e();
  return {
    ...pose,
    bones: {
      ...pose.bones,
      neck: {
        x: (neck.x ?? 0) + -gy * 0.09,
        y: (neck.y ?? 0) + gx * 0.12,
        z: neck.z ?? 0,
      },
      head: {
        x: (head.x ?? 0) + -gy * 0.18,
        y: (head.y ?? 0) + gx * 0.24,
        z: (head.z ?? 0) + gx * 0.03,
      },
    },
  };
}

/** 待机：呼吸 + 轻移重；臂只小摆 */
export function poseIdle(t: number): VrmPoseFrame {
  const breath = Math.sin(t * 1.35) * 0.03;
  const sway = Math.sin(t * 0.62) * 0.035;
  const weight = Math.sin(t * 0.48) * 0.04;
  const armSway = Math.sin(t * 0.85) * deg(7);

  return {
    rootY: Math.sin(t * 1.1) * 0.004,
    rootYaw: sway * 0.3,
    bones: mergePose(
      restArms({ swingL: armSway, swingR: -armSway * 0.9 }),
      restLegs(weight),
      {
        hips: e(FWD * 0.02, sway * 0.4, weight * 0.18),
        spine: e(FWD * (breath * 0.65 + 0.02), sway * 0.55, 0),
        chest: e(FWD * breath * 0.4, sway * 0.35, 0),
        upperChest: e(FWD * breath * 0.2, sway * 0.12, 0),
        neck: e(FWD * (-breath * 0.12), sway * 0.15, 0),
        head: e(
          FWD * (0.02 + Math.sin(t * 0.8) * 0.02),
          sway * 0.12,
          Math.sin(t * 0.65) * 0.025
        ),
      }
    ),
  };
}

/** 走路：臂腿对侧；upperLeg X- = 前迈；knee = 正常屈膝 */
function poseWalk(t: number): VrmPoseFrame {
  const g = t * 3.2;
  const swing = Math.sin(g);
  const opp = Math.sin(g + Math.PI);
  const bob = Math.abs(Math.sin(g)) * 0.014;
  const arm = deg(22);
  const leg = deg(28);
  // swing>0：左腿前迈 → 屈膝加大
  const leftFlex = 8 + Math.max(0, swing) * 48 + Math.max(0, -swing) * 14;
  const rightFlex = 8 + Math.max(0, opp) * 48 + Math.max(0, -opp) * 14;

  return {
    rootY: bob,
    rootYaw: swing * deg(2.5),
    bones: mergePose(
      restArms({ swingL: opp * arm, swingR: swing * arm }),
      {
        hips: e(FWD * deg(2), swing * deg(5), swing * deg(1.2)),
        spine: e(FWD * deg(1.5), swing * deg(3.5), 0),
        chest: e(FWD * deg(1), swing * deg(2.5), 0),
        upperChest: e(0, swing * deg(1.2), 0),
        neck: e(deg(1), -swing * deg(2), 0),
        head: e(deg(1.5), -swing * deg(2.5), 0),
        leftUpperLeg: e(-swing * leg - deg(2), 0, deg(1.5)),
        leftLowerLeg: knee(leftFlex),
        rightUpperLeg: e(-opp * leg - deg(2), 0, deg(-1.5)),
        rightLowerLeg: knee(rightFlex),
      }
    ),
  };
}

function poseLifted(t: number): VrmPoseFrame {
  const d1 = Math.sin(t * 4.5) * 0.1;
  const d2 = Math.sin(t * 4.5 + 1.1) * 0.09;
  return {
    rootY: 0.04,
    rootYaw: Math.sin(t * 2) * deg(2),
    bones: mergePose(restArms({ swingL: d1 * 0.15, swingR: d2 * 0.15 }), {
      hips: e(FWD * deg(4), 0, 0),
      spine: e(FWD * deg(3), 0, 0),
      chest: e(FWD * deg(2), 0, 0),
      neck: e(FWD * deg(5), Math.sin(t * 1.8) * deg(3), 0),
      head: e(FWD * deg(8) + Math.sin(t * 2.2) * deg(2), Math.sin(t * 1.5) * deg(4), 0),
      // 腿蜷：髋屈 = upperLeg X-
      leftUpperLeg: e(-(deg(14) + d1 * 0.4), deg(2), deg(4)),
      leftLowerLeg: knee(32 + Math.max(0, d1) * 18),
      rightUpperLeg: e(-(deg(13) + d2 * 0.4), deg(-2), deg(-4)),
      rightLowerLeg: knee(30 + Math.max(0, d2) * 18),
    }),
  };
}

/** 鞠躬：躯干 X+ 前倾；下俯 → 停住 → 缓起 */
function poseBow(t: number): VrmPoseFrame {
  const nod = 0.15 + holdEnvelope(t, 5.2, 0.48) * 0.82;
  return {
    rootY: -0.012 * nod,
    bones: mergePose(restArms({ swingL: deg(2), swingR: deg(2) }), restLegs(), {
      hips: e(FWD * deg(16) * nod, 0, 0),
      spine: e(FWD * deg(32) * nod, 0, 0),
      chest: e(FWD * deg(18) * nod, 0, 0),
      upperChest: e(FWD * deg(10) * nod, 0, 0),
      neck: e(FWD * deg(16) * nod, 0, 0),
      head: e(FWD * deg(22) * nod, 0, 0),
      leftUpperArm: e(deg(REST.upper.x + 4 * nod), deg(REST.upper.y), ZL + deg(REST.upper.zExtra)),
      rightUpperArm: e(deg(REST.upper.x + 4 * nod), deg(-REST.upper.y), ZR - deg(REST.upper.zExtra)),
    }),
  };
}

function poseSway(t: number): VrmPoseFrame {
  const s = Math.sin(t * 1.35);
  return {
    rootY: Math.abs(s) * 0.004,
    rootYaw: s * deg(7),
    bones: mergePose(restArms({ swingL: s * deg(5), swingR: -s * deg(5) }), {
      hips: e(FWD * deg(1), s * deg(6), s * deg(2)),
      spine: e(FWD * deg(1), s * deg(9), 0),
      chest: e(0, s * deg(7), 0),
      neck: e(deg(1), s * deg(5), 0),
      head: e(deg(1.5), s * deg(9), -s * deg(2)),
      leftUpperLeg: e(deg(-2) - s * deg(6), 0, deg(2)),
      rightUpperLeg: e(deg(-2) + s * deg(6), 0, deg(-2)),
      leftLowerLeg: knee(6 + Math.max(0, s) * 4),
      rightLowerLeg: knee(6 + Math.max(0, -s) * 4),
    }),
  };
}

function poseSleep(_t: number): VrmPoseFrame {
  return {
    rootY: -0.008,
    bones: mergePose(restArms({ swingL: deg(4), swingR: deg(4) }), restLegs(0.02), {
      hips: e(FWD * deg(3), 0, deg(2)),
      spine: e(FWD * deg(8), 0, deg(4)),
      chest: e(FWD * deg(5)),
      neck: e(FWD * deg(16), 0, deg(8)),
      head: e(FWD * deg(24), 0, deg(12)),
      leftUpperArm: e(deg(REST.upper.x + 8), deg(REST.upper.y - 2), ZL + deg(REST.upper.zExtra + 2)),
      rightUpperArm: e(deg(REST.upper.x + 8), deg(-(REST.upper.y - 2)), ZR - deg(REST.upper.zExtra + 2)),
      leftLowerArm: e(deg(REST.elbowL.x + 8), deg(REST.elbowL.y), deg(REST.elbowL.z)),
      rightLowerArm: e(deg(REST.elbowR.x + 6), deg(-REST.elbowR.y), deg(-REST.elbowR.z)),
    }),
  };
}

/**
 * 伸懒腰手臂链：肩→上臂→前臂→手联动。
 * 屈肘：本模型 A-pose 下前臂 **Z** 才是弯肘（X 无效，已实测）；左右 Z 镜像。
 * 上臂 Y 锁站姿；上举靠上臂 X；伸展才改上臂 Z 过头。
 */
function stretchArmChain(bend: number, raise: number, extend: number): VrmPoseMap {
  const b = Math.min(1, Math.max(0, bend));
  const r = Math.min(1, Math.max(0, raise));
  const x = Math.min(1, Math.max(0, extend));
  const prep = b * (1 - r);

  const restZL = ZL + deg(REST.upper.zExtra);
  const restZR = ZR - deg(REST.upper.zExtra);
  const zL = restZL * (1 - x) + deg(-38) * x;
  const zR = restZR * (1 - x) + deg(38) * x;

  // 屈肘段不上抬；上举/伸展体前抬（正 X）
  const pitch = deg(6) * prep + deg(48) * r * (1 - x) + deg(62) * r * x;

  // 屈肘走前臂 Z：站姿 z≈25 → 深屈；伸展略收回
  const zDeep = 100;
  const zStretch = 35;
  const elbowZL =
    REST.elbowL.z * (1 - b) + (zDeep * (1 - x) + zStretch * x) * b;
  const elbowZR =
    REST.elbowR.z * (1 - b) + (zDeep * (1 - x) + zStretch * x) * b;

  const shX = REST.shoulder.x + 8 * prep + 6 * r + 4 * x;
  const shY = REST.shoulder.y + 2 * r + 4 * x;
  const shZ = REST.shoulder.z - 4 * r - 6 * x;

  return {
    leftShoulder: e(deg(shX), deg(shY), deg(-shZ)),
    rightShoulder: e(deg(shX), deg(-shY), deg(shZ)),
    leftUpperArm: e(deg(REST.upper.x) + pitch, deg(REST.upper.y), zL),
    rightUpperArm: e(deg(REST.upper.x) + pitch, deg(-REST.upper.y), zR),
    // X/Y 保持站姿；Z 弯肘（右臂 Z 取反）
    leftLowerArm: e(deg(REST.elbowL.x), deg(REST.elbowL.y), deg(elbowZL)),
    rightLowerArm: e(deg(REST.elbowR.x), deg(-REST.elbowR.y), deg(-elbowZR)),
    // 腕/掌：屈肘微收掌 → 上举打开 → 伸展掌心略翻上
    leftHand: e(
      deg(REST.handL.x - 22 * prep - 10 * r + 28 * x),
      deg(REST.handL.y + 8 * prep - 6 * r + 14 * x),
      deg(REST.handL.z + 16 * prep + 12 * r + 10 * x)
    ),
    rightHand: e(
      deg(REST.handR.x + 22 * prep + 10 * r - 28 * x),
      deg(-(REST.handR.y + 8 * prep - 6 * r + 14 * x)),
      deg(REST.handR.z + 16 * prep + 12 * r + 10 * x)
    ),
  };
}

/** 伸懒腰：屈肘 → 屈臂上举 → 过头伸展后仰 → 收回（停顿短；腕掌随动） */
function poseStretch(t: number): VrmPoseFrame {
  const period = 4.6;
  const u = (((t % period) + period) % period) / period;
  const smooth = (x: number) => {
    const c = Math.min(1, Math.max(0, x));
    return c * c * (3 - 2 * c);
  };

  let bend = 0;
  let raise = 0;
  let extend = 0;
  let back = 0;
  if (u < 0.14) {
    // 屈肘起势（几乎不停）
    bend = smooth(u / 0.14);
  } else if (u < 0.2) {
    // 极短确认弯肘
    bend = 1;
  } else if (u < 0.48) {
    bend = 1;
    raise = smooth((u - 0.2) / 0.28);
  } else if (u < 0.72) {
    bend = 1;
    raise = 1;
    extend = smooth((u - 0.48) / 0.24);
    back = extend;
  } else {
    const keep = 1 - smooth((u - 0.72) / 0.28);
    bend = keep;
    raise = keep;
    extend = keep;
    back = keep;
  }

  // 抬手时头颈跟上：微仰 + 轻晃，避免只动手臂
  const lookUp = raise * (0.55 + 0.45 * extend);
  const headSway = Math.sin(t * 2.4) * deg(4) * raise + Math.sin(t * 1.1) * deg(2) * back;

  return {
    rootY: 0.004 + raise * 0.012 + back * 0.008,
    bones: mergePose(restArms(), restLegs(), stretchArmChain(bend, raise, extend), {
      hips: e(-FWD * deg(3) * back, 0, 0),
      spine: e(-FWD * deg(3) * raise - FWD * deg(6) * back, 0, 0),
      chest: e(-FWD * deg(2) * raise - FWD * deg(4) * back, headSway * 0.25, 0),
      upperChest: e(-FWD * deg(2) * raise - FWD * deg(3) * back, headSway * 0.35, 0),
      neck: e(
        FWD * deg(3) * bend * (1 - raise) - FWD * deg(8) * lookUp - FWD * deg(4) * back,
        headSway * 0.6,
        0
      ),
      head: e(
        FWD * deg(4) * bend * (1 - raise) - FWD * deg(10) * lookUp - FWD * deg(5) * back,
        headSway,
        headSway * 0.2
      ),
      leftUpperLeg: e(deg(2) * back),
      rightUpperLeg: e(deg(2) * back),
      leftLowerLeg: knee(6),
      rightLowerLeg: knee(6),
    }),
  };
}

/** 开心晃：单脚支撑点踏，另一脚抬起；高举手晃腕 */
function poseVictory(t: number): VrmPoseFrame {
  const env = holdEnvelope(t, 3.2, 0.36);
  const shake = Math.sin(t * 7.2) * env;
  const step = Math.sin(t * 4.0);
  const raise = 0.55 + env * 0.4;
  const leftSupport = step >= 0;
  const liftAmt = Math.abs(step) * env;
  return {
    rootY: liftAmt * 0.028,
    bones: mergePose(
      restArms(),
      raiseBothArms(raise, { openDeg: 20, elbowDeg: 28, overhead: true }),
      {
        hips: e(FWD * deg(1), shake * deg(2), (leftSupport ? 1 : -1) * deg(3) * liftAmt),
        spine: e(FWD * deg(1), shake * deg(3), 0),
        chest: e(0, shake * deg(4), 0),
        neck: e(FWD * deg(-3) * env, shake * deg(4), 0),
        head: e(FWD * deg(-5) * env, shake * deg(6), 0),
        leftHand: e(deg(REST.handL.x - 8) + shake * deg(12), deg(REST.handL.y), deg(REST.handL.z + 8)),
        rightHand: e(deg(REST.handR.x + 8) - shake * deg(12), deg(-REST.handR.y), deg(REST.handR.z + 8)),
        // 抬脚：髋屈 X-；支撑腿近站姿
        leftUpperLeg: e(leftSupport ? deg(-1) : deg(-8) - liftAmt * deg(22), 0, deg(2)),
        rightUpperLeg: e(leftSupport ? deg(-8) - liftAmt * deg(22) : deg(-1), 0, deg(-2)),
        leftLowerLeg: knee(leftSupport ? 8 + liftAmt * 6 : 18 + liftAmt * 36),
        rightLowerLeg: knee(leftSupport ? 18 + liftAmt * 36 : 8 + liftAmt * 6),
      }
    ),
  };
}

/**
 * 一般动作相对站姿的幅度倍率（轻微）。
 * 左右摆头（poseSway）与伸懒腰（poseStretch）不走此缩放。
 */
const MILD_MOTION_AMP = 0.4;

function restNeutralBones(): VrmPoseMap {
  return mergePose(restArms(), restLegs(), {
    hips: e(),
    spine: e(),
    chest: e(),
    upperChest: e(),
    neck: e(),
    head: e(),
  });
}

/** 相对 A-pose 站姿缩放增量，站姿本身不塌向 T-pose */
function softenPoseFrame(pose: VrmPoseFrame, amp: number): VrmPoseFrame {
  const base = restNeutralBones();
  const bones: VrmPoseMap = {};
  const names = new Set<VrmBoneName>([
    ...(Object.keys(base) as VrmBoneName[]),
    ...(Object.keys(pose.bones) as VrmBoneName[]),
  ]);
  for (const name of names) {
    const b = base[name] || e();
    const p = pose.bones[name] || e();
    bones[name] = e(
      (b.x ?? 0) + ((p.x ?? 0) - (b.x ?? 0)) * amp,
      (b.y ?? 0) + ((p.y ?? 0) - (b.y ?? 0)) * amp,
      (b.z ?? 0) + ((p.z ?? 0) - (b.z ?? 0)) * amp
    );
  }
  return {
    rootY: (pose.rootY ?? 0) * amp,
    rootYaw: (pose.rootYaw ?? 0) * amp,
    bones,
  };
}

/** 摆头 / 伸懒腰 / 待机（本就轻）保持全幅 */
function keepFullMotionAmp(motion: PetIdleMotion | string | undefined): boolean {
  switch (motion) {
    case "sway-step":
    case "side-hop":
    case "tip-toe":
    case "stretch-up":
      return true;
    case "bow-nod":
    case "victory-burst":
    case "vrm-walk":
    case "toon-walk":
    case "screen-glide":
    case "screen-dash":
    case "screen-hop":
    case "screen-zip":
      return false;
    default:
      return true;
  }
}

export function resolveVrmPose(
  motion: PetIdleMotion | string | undefined,
  mood: PetMood,
  t: number,
  options?: {
    lifting?: boolean;
    gaze?: { x: number; y: number };
    customPose?: VrmPoseFrame | null;
  }
): VrmPoseFrame {
  let pose: VrmPoseFrame;
  if (options?.lifting) {
    pose = softenPoseFrame(poseLifted(t), MILD_MOTION_AMP);
  } else if (mood === "sleep") {
    pose = softenPoseFrame(poseSleep(t), MILD_MOTION_AMP);
  } else if (options?.customPose) {
    pose = options.customPose;
  } else {
    switch (motion) {
      case "vrm-walk":
      case "toon-walk":
      case "screen-glide":
      case "screen-dash":
      case "screen-hop":
      case "screen-zip":
        pose = poseWalk(t);
        break;
      case "bow-nod":
        pose = poseBow(t);
        break;
      case "sway-step":
      case "side-hop":
      case "tip-toe":
        pose = poseSway(t);
        break;
      case "stretch-up":
        pose = poseStretch(t);
        break;
      case "victory-burst":
        pose = poseVictory(t);
        break;
      default:
        pose = poseIdle(t);
    }
    if (!keepFullMotionAmp(motion)) {
      pose = softenPoseFrame(pose, MILD_MOTION_AMP);
    }
  }

  if (options?.gaze && !options.lifting && mood !== "sleep") {
    return applySoftHeadGaze(pose, options.gaze);
  }
  return pose;
}
