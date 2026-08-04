import type { CharacterDef } from "./types";
import { formFig } from "../skins/forms";
import { FIG_LOOK_IDS } from "../skins/looks";
import { PET_FIG_DEMO_MOTIONS } from "../content/motion/motions";
import { lines } from "./lines/fig-sci";
import { remapFigMotion } from "./motionRemap";
import { PetFigSciModel } from "../models/fig-sci";

export const characterFig: CharacterDef = {
  id: "fig-sci",
  form: formFig,
  capabilities: ["custom-lines", "motion-toggle", "look-swatches"],
  demoMotions: PET_FIG_DEMO_MOTIONS,
  idleMotions: [
    "sway-step",
    "side-hop",
    "tip-toe",
    "bow-nod",
    "stretch-up",
    "happy-bounce",
    "screen-glide",
    "victory-burst",
    "peekaboo",
  ],
  defaults: {
    demoMotion: "happy-bounce",
    lookId: "sunny",
  },
  lookIds: FIG_LOOK_IDS,
  size: {
    safeMargin: 16,
    bubbleOffsetYFactor: -0.12,
    bodyBox: (scale, screen) => {
      const h = Math.round(
        Math.min(400, Math.max(240, screen.availH * 0.3)) * scale
      );
      const w = Math.round(h * (2 / 3));
      return { w, h };
    },
    // 贴合垫子上限 1；起始留滚轮余量，放大不裁头
    previewBaseScale: 0.84,
    previewMaxBoost: 19,
    previewActor: { w: 236, h: 352, bottom: "5%", z: 42 },
  },
  previewHintKey: "pet.previewFigHint",
  appearance: {
    nameFrom: "look",
  },
  lines,
  resolveMotion: remapFigMotion,
  runtime: {
    gaze: { max: 2.2, range: 160, follow: 0.32 },
    tapFallbackMotion: "tap-frenzy",
    screenFlight: "fly",
    dragLandMotions: ["tip-toe", "sway-step"],
    accents: {
      dragLandMotionChance: 0.38,
      deskWeather: {
        appsUp: "stretch-up",
        appsDown: "bow-nod",
        switchBurst: "side-hop",
        maxDwell: {
          "30s": null,
          "3m": "sway-step",
        },
      },
    },
  },
  view: {
    shell: "bob",
    previewPad: "flat",
    Model: PetFigSciModel,
    bindRuntime: (ctx) => ({
      visual: ctx.visual,
      mood: ctx.mood,
      gaze: ctx.gaze,
      motion: ctx.motion,
      figArtId: ctx.figArtId,
    }),
    bindPreview: (ctx) => ({
      visual: ctx.visual,
      mood: ctx.mood,
      gaze: { x: 0, y: 0 },
      motion: ctx.motion,
      figArtId: ctx.figArtId,
      showShadow: false,
    }),
  },
};
