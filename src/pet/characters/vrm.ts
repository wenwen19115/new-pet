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
    "idle-float",
    "happy-bounce",
    "sway-step",
    "bow-nod",
    "stretch-up",
    "peekaboo",
    "victory-burst",
    "vrm-scratch",
    "vrm-walk",
  ],
  defaults: {
    demoMotion: "happy-bounce",
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
      // 双马尾等横向溢出：略加宽，避免画布左右裁发
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
    tapFallbackMotion: "tap-frenzy",
    screenFlight: "none",
    dragLandMotions: [
      "vrm-scratch",
      "bow-nod",
      "sway-step",
      "happy-bounce",
      "stretch-up",
    ],
    accents: {
      deskWeather: {
        appsUp: "stretch-up",
        appsDown: "bow-nod",
        switchBurst: "sway-step",
        maxDwell: {
          "30s": null,
          "3m": "vrm-walk",
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
