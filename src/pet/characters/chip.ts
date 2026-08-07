import type { CharacterDef } from "./types";
import { formChip } from "../skins/forms";
import { STANDARD_LOOK_IDS } from "../skins/looks";
import { PET_CHIP_DEMO_MOTIONS } from "../content/motion/motions";
import { lines } from "./lines/chip";
import { remapChipMotion } from "./motionRemap";
import PetChipModel from "../models/chip/PetChipModel.vue";

export const characterChip: CharacterDef = {
  id: "chip",
  form: formChip,
  capabilities: [
    "custom-lines",
    "motion-toggle",
    "look-swatches",
    "preview-orbit",
    "shell-sleep-bob",
  ],
  demoMotions: PET_CHIP_DEMO_MOTIONS,
  idleMotions: [
    "screen-dash",
    "screen-hop",
    "screen-glide",
    "screen-zip",
    "fly-dash",
    "fly-orbit",
    "figure-eight",
    "barrel-roll",
    "victory-burst",
    "peekaboo",
  ],
  defaults: {
    demoMotion: "screen-dash",
    lookId: "cyan",
  },
  lookIds: STANDARD_LOOK_IDS,
  size: {
    bubbleOffsetYFactor: -0.02,
    bubbleClearanceFactor: 0.7,
    bodyBox: (scale, screen) => {
      const short = Math.min(screen.availW, screen.availH);
      const side = Math.round(
        Math.min(140, Math.max(112, short * 0.085)) * scale
      );
      return { w: side, h: side };
    },
    // 芯片 3D + 引脚易溢出；起始略收、放大限幅、Z 别太近
    previewBaseScale: 0.9,
    previewMaxBoost: 18,
    previewActor: { w: 168, h: 168, bottom: "15%", z: 32 },
  },
  previewHintKey: "pet.previewDragHint",
  appearance: {
    nameFrom: "look",
  },
  lines,
  resolveMotion: remapChipMotion,
  runtime: {
    gaze: { max: 2.2, range: 160, follow: 0.32 },
    tickLeds: true,
    tapFallbackMotion: "screen-zip",
    screenFlight: "fly",
    dragLandMotions: [
      "fly-orbit",
      "figure-eight",
      "barrel-roll",
      "victory-burst",
    ],
    accents: {
      usbFollowUpChance: 0.82,
      deskWeather: {
        appsUp: "screen-zip",
        appsDown: "screen-glide",
        switchBurst: "screen-hop",
        maxDwell: {
          "30s": null,
          "3m": "screen-glide",
        },
      },
    },
  },
  view: {
    shell: "bob",
    previewPad: "orbit",
    showBobShadow: true,
    previewOrbit: { yaw: -38, pitch: 22 },
    Model: PetChipModel,
    bindRuntime: (ctx) => ({
      visual: ctx.visual,
      mood: ctx.mood,
      blinking: ctx.blinking,
      gaze: ctx.gaze,
      pinColors: ctx.pinColors,
    }),
    bindPreview: (ctx) => ({
      visual: ctx.visual,
      mood: ctx.mood,
      blinking: false,
      gaze: { x: 0.4, y: 0.1 },
      pinColors: ctx.pinColors,
    }),
  },
};
