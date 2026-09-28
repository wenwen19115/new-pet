import type { PetIdleMotion } from "./motions";
import idleUrl from "../../assets/vrm/motions/idle.vrma?url";
import idle2Url from "../../assets/vrm/motions/idle2.vrma?url";
import idle3Url from "../../assets/vrm/motions/idle3.vrma?url";
import idle4Url from "../../assets/vrm/motions/idle4.vrma?url";
import idle5Url from "../../assets/vrm/motions/idle5.vrma?url";
import talkUrl from "../../assets/vrm/motions/talk.vrma?url";
import showcaseUrl from "../../assets/vrm/motions/showcase.vrma?url";
import greetUrl from "../../assets/vrm/motions/greet.vrma?url";
import peaceUrl from "../../assets/vrm/motions/peace.vrma?url";
import shootUrl from "../../assets/vrm/motions/shoot.vrma?url";
import twirlUrl from "../../assets/vrm/motions/twirl.vrma?url";
import poseUrl from "../../assets/vrm/motions/pose.vrma?url";
import squatUrl from "../../assets/vrm/motions/squat.vrma?url";
import waveUrl from "../../assets/vrm/motions/wave.vrma?url";
import clapUrl from "../../assets/vrm/motions/clap.vrma?url";
import jumpUrl from "../../assets/vrm/motions/jump.vrma?url";
import thinkUrl from "../../assets/vrm/motions/think.vrma?url";
import lookUrl from "../../assets/vrm/motions/look.vrma?url";
import surpriseUrl from "../../assets/vrm/motions/surprise.vrma?url";
import relaxUrl from "../../assets/vrm/motions/relax.vrma?url";
import angryUrl from "../../assets/vrm/motions/angry.vrma?url";
import blushUrl from "../../assets/vrm/motions/blush.vrma?url";
import sadUrl from "../../assets/vrm/motions/sad.vrma?url";
import sleepyUrl from "../../assets/vrm/motions/sleepy.vrma?url";
import accadConversationGesturesUrl from "../../assets/vrm/motions/accad_conversation_gestures.vrma?url";
import accadCrouchUrl from "../../assets/vrm/motions/accad_crouch.vrma?url";
import accadLiftBoxUrl from "../../assets/vrm/motions/accad_lift_box.vrma?url";
import accadLookUrl from "../../assets/vrm/motions/accad_look.vrma?url";
import accadPickUpBoxUrl from "../../assets/vrm/motions/accad_pick_up_box.vrma?url";
import accadRandomGesturesUrl from "../../assets/vrm/motions/accad_random_gestures.vrma?url";
import accadSwingArmsUrl from "../../assets/vrm/motions/accad_swing_arms.vrma?url";

/**
 * 样例文件本身没有官方类型字段；本仓自标 kind / vibe。
 * 只收原地类；走/跑/侧移等根位移片不入库。
 *
 * aikeya + vrm-viewer + ACCAD Female1 原地子集（CC BY 3.0，见 assets LICENSE）。
 */
export type VrmMotionKind = "idle" | "talk" | "gesture" | "emotion";
export type VrmMotionVibe = "soft" | "lively" | "bold";

export interface VrmaMotionDef {
  id: PetIdleMotion;
  url: string;
  durationMs: number;
  kind: VrmMotionKind;
  vibe: VrmMotionVibe;
  /** 待机类循环播；手势 once */
  loop?: boolean;
}

export const BUILT_IN_VRMA_MOTIONS: readonly VrmaMotionDef[] = [
  // —— aikeya idle / talk ——
  { id: "vrm-idle", url: idleUrl, durationMs: 16600, kind: "idle", vibe: "soft", loop: true },
  { id: "vrm-idle2", url: idle2Url, durationMs: 10000, kind: "idle", vibe: "soft", loop: true },
  { id: "vrm-idle3", url: idle3Url, durationMs: 4400, kind: "idle", vibe: "soft", loop: true },
  { id: "vrm-idle4", url: idle4Url, durationMs: 7000, kind: "idle", vibe: "soft", loop: true },
  { id: "vrm-idle5", url: idle5Url, durationMs: 6700, kind: "idle", vibe: "soft", loop: true },
  { id: "vrm-talk", url: talkUrl, durationMs: 5900, kind: "talk", vibe: "soft" },
  // —— VRoid Hub 7 种（经 aikeya VRMA_01–07）——
  { id: "vrm-showcase", url: showcaseUrl, durationMs: 11800, kind: "gesture", vibe: "soft" },
  { id: "vrm-greet", url: greetUrl, durationMs: 7300, kind: "gesture", vibe: "soft" },
  { id: "vrm-peace", url: peaceUrl, durationMs: 11700, kind: "gesture", vibe: "soft" },
  { id: "vrm-shoot", url: shootUrl, durationMs: 9600, kind: "gesture", vibe: "lively" },
  { id: "vrm-twirl", url: twirlUrl, durationMs: 9400, kind: "gesture", vibe: "lively" },
  { id: "vrm-pose", url: poseUrl, durationMs: 7600, kind: "gesture", vibe: "soft" },
  { id: "vrm-squat", url: squatUrl, durationMs: 11500, kind: "gesture", vibe: "lively" },
  // —— vrm-viewer 补充 ——
  { id: "vrm-wave", url: waveUrl, durationMs: 4000, kind: "gesture", vibe: "soft" },
  { id: "vrm-think", url: thinkUrl, durationMs: 4000, kind: "gesture", vibe: "soft" },
  { id: "vrm-look", url: lookUrl, durationMs: 4000, kind: "gesture", vibe: "soft" },
  { id: "vrm-blush", url: blushUrl, durationMs: 4000, kind: "emotion", vibe: "soft" },
  { id: "vrm-relax", url: relaxUrl, durationMs: 4000, kind: "emotion", vibe: "soft" },
  { id: "vrm-sleepy", url: sleepyUrl, durationMs: 4000, kind: "emotion", vibe: "soft" },
  { id: "vrm-sad", url: sadUrl, durationMs: 4000, kind: "emotion", vibe: "soft" },
  { id: "vrm-clap", url: clapUrl, durationMs: 4000, kind: "gesture", vibe: "lively" },
  { id: "vrm-jump", url: jumpUrl, durationMs: 4000, kind: "gesture", vibe: "lively" },
  { id: "vrm-surprise", url: surpriseUrl, durationMs: 4000, kind: "emotion", vibe: "lively" },
  { id: "vrm-angry", url: angryUrl, durationMs: 4000, kind: "emotion", vibe: "bold" },
  // —— ACCAD Female1 原地子集（CC BY 3.0）——
  { id: "vrm-accad-conversation-gestures", url: accadConversationGesturesUrl, durationMs: 50700, kind: "gesture", vibe: "soft" },
  { id: "vrm-accad-crouch", url: accadCrouchUrl, durationMs: 5067, kind: "gesture", vibe: "soft" },
  { id: "vrm-accad-lift-box", url: accadLiftBoxUrl, durationMs: 8367, kind: "gesture", vibe: "lively" },
  { id: "vrm-accad-look", url: accadLookUrl, durationMs: 21267, kind: "gesture", vibe: "soft" },
  { id: "vrm-accad-pick-up-box", url: accadPickUpBoxUrl, durationMs: 6267, kind: "gesture", vibe: "lively" },
  { id: "vrm-accad-random-gestures", url: accadRandomGesturesUrl, durationMs: 20067, kind: "gesture", vibe: "soft" },
  { id: "vrm-accad-swing-arms", url: accadSwingArmsUrl, durationMs: 14500, kind: "gesture", vibe: "soft" },
];

const BY_ID = new Map(BUILT_IN_VRMA_MOTIONS.map((m) => [m.id, m]));

const KIND_ORDER: VrmMotionKind[] = ["idle", "talk", "gesture", "emotion"];

export function isVrmaClipMotion(value: unknown): value is PetIdleMotion {
  return typeof value === "string" && BY_ID.has(value as PetIdleMotion);
}

export function findVrmaMotion(id: string): VrmaMotionDef | undefined {
  return BY_ID.get(id as PetIdleMotion);
}

/** 程序待机 id → 循环 VRMA；旧误标 id 顺带迁 */
export function resolveVrmRestMotion(
  motion: string | undefined
): PetIdleMotion | string {
  if (!motion || motion === "idle-float") return "vrm-idle";
  if (motion === "vrm-stretch") return "vrm-shoot";
  return motion;
}

export function groupVrmaMotionIdsByKind(
  ids: readonly string[]
): Array<{ kind: VrmMotionKind; ids: string[] }> {
  const buckets = new Map<VrmMotionKind, string[]>();
  for (const kind of KIND_ORDER) buckets.set(kind, []);
  const other: string[] = [];
  for (const id of ids) {
    const meta = BY_ID.get(id as PetIdleMotion);
    if (meta) buckets.get(meta.kind)!.push(id);
    else other.push(id);
  }
  const groups = KIND_ORDER.map((kind) => ({
    kind,
    ids: buckets.get(kind)!,
  })).filter((g) => g.ids.length);
  if (other.length) {
    const gesture = groups.find((g) => g.kind === "gesture");
    if (gesture) gesture.ids.push(...other);
    else groups.push({ kind: "gesture", ids: other });
  }
  return groups;
}
