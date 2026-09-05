import type { CharacterDef } from "./types";
import { formVrm } from "../skins/forms";
import { PET_VRM_DEMO_MOTIONS } from "../content/motion/motions";
import { emptyVrmExtension } from "../data/extensions";
import { lines } from "./lines/vrm";
import { remapVrmMotion } from "./motionRemap";
import PetVrmModel from "../models/vrm/PetVrmModel.vue";

export const characterVrm: CharacterDef = {
  id: "vrm",
  form: formVrm,
  capabilities: [
    "custom-lines",
    "motion-toggle",
    "vrm-upload",
    "vrm-bone-editor",
    "preview-orbit",
  ],
  demoMotions: PET_VRM_DEMO_MOTIONS,
  idleMotions: [
    "vrm-idle",
    "vrm-idle2",
    "vrm-idle3",
    "vrm-idle4",
    "vrm-idle5",
    "vrm-look",
    "vrm-relax",
    "vrm-think",
    "vrm-wave",
    "vrm-greet",
    "vrm-peace",
    "vrm-pose",
    "vrm-blush",
    "vrm-talk",
  ],
  defaults: {
    demoMotion: "vrm-idle",
    lookId: "cyan",
    buildExtensions: () => ({ vrm: emptyVrmExtension() }),
  },
  lookIds: [],
  size: {
    bubbleOffsetYFactor: -0.28,
    bubbleClearanceFactor: 0.36,
    bodyBox: (scale, screen) => {
      const short = Math.min(screen.availW, screen.availH);
      const h = Math.round(
        Math.min(320, Math.max(210, short * 0.24)) * scale
      );
      // 双马尾等横向溢出：略加宽，避免画布左右裁切
      const w = Math.round(h * 0.62);
      return { w, h };
    },
    previewBaseScale: 1,
    previewMaxBoost: 55,
    previewActor: { w: 220, h: 300, bottom: "8%", z: 40 },
  },
  previewHintKey: "pet.previewVrmHint",
  appearance: {
    nameFrom: "look",
  },
  lines,
  resolveMotion: remapVrmMotion,
  runtime: {
    gaze: { max: 1.8, range: 90, follow: 0.55 },
    tapFallbackMotion: "vrm-wave",
    screenFlight: "none",
    dragLandMotions: ["vrm-wave", "vrm-blush", "vrm-relax"],
    accents: {
      deskWeather: {
        appsUp: "vrm-surprise",
        appsDown: "vrm-sleepy",
        switchBurst: "vrm-clap",
        maxDwell: {
          "30s": "vrm-look",
          "3m": "vrm-relax",
        },
      },
    },
  },
  view: {
    shell: "vrm",
    previewPad: "vrm",
    previewOrbit: { yaw: 18, pitch: 8 },
    Model: PetVrmModel,
    bindRuntime: (ctx) => ({
      src: ctx.vrmSrc,
      mood: ctx.mood,
      gaze: ctx.gaze,
      motion: ctx.motion,
      motionPlayId: ctx.motionPlayId ?? 0,
      customMotions: ctx.customVrmMotions,
      blinking: ctx.blinking,
      lifting: ctx.lifting,
      faceYaw: ctx.faceYaw,
    }),
    bindPreview: (ctx) => ({
      src: ctx.vrmSrc,
      mood: ctx.mood,
      gaze: ctx.previewGaze,
      motion: ctx.motion,
      customMotions: ctx.customMotions,
      orbitYaw: ctx.yaw,
      orbitPitch: ctx.pitch,
      errorText: ctx.errorText,
    }),
  },
};
