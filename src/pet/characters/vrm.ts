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
    safeMargin: 18,
    bubbleOffsetYFactor: -0.18,
    bodyBox: (scale, screen) => {
      const short = Math.min(screen.availW, screen.availH);
      const h = Math.round(
        Math.min(320, Math.max(210, short * 0.24)) * scale
      );
      const w = Math.round(h * 0.55);
      return { w, h };
    },
  },
  previewHintKey: "pet.previewVrmHint",
  appearance: {
    nicknameFrom: "form",
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
