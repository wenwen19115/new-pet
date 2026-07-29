import type { CharacterDef } from "./types";
import { formFig } from "../skins/forms";
import { FIG_LOOK_IDS } from "../skins/looks";
import { PET_FIG_DEMO_MOTIONS } from "../content/motions";
import { lines } from "./lines/fig-sci";
import { remapFigMotion } from "./motionRemap";
import PetFigSciModel from "../models/PetFigSciModel.vue";

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
      const w = Math.round(h * (288 / 473));
      return { w, h };
    },
  },
  previewHintKey: "pet.previewFigHint",
  appearance: {
    nicknameFrom: "form",
    nameFrom: "look",
  },
  lines,
  resolveMotion: remapFigMotion,
  runtime: {
    gaze: { max: 2.2, range: 160, follow: 0.32 },
    tapFallbackMotion: "tap-frenzy",
    screenFlight: "fly",
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
