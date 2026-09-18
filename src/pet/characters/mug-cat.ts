import type { CharacterDef } from "./types";
import { formMugCat } from "../skins/forms";
import { MUG_LOOK_IDS } from "../skins/looks";
import { PET_MUG_DEMO_MOTIONS } from "../content/motion/motions";
import { lines } from "./lines/mug-cat";
import { remapMugCatMotion } from "./motionRemap";
import { PetMugCatModel } from "../models/mug-cat";

export const characterMugCat: CharacterDef = {
  id: "mug-cat",
  form: formMugCat,
  capabilities: ["custom-lines", "motion-toggle", "look-swatches"],
  demoMotions: PET_MUG_DEMO_MOTIONS,
  idleMotions: PET_MUG_DEMO_MOTIONS,
  defaults: {
    demoMotion: "mug-steam",
    lookId: "mug-default",
  },
  lookIds: MUG_LOOK_IDS,
  size: {
    bubbleOffsetYFactor: -0.14,
    bubbleClearanceFactor: 0.5,
    bodyBox: (scale, screen) => {
      const short = Math.min(screen.availW, screen.availH);
      const h = Math.round(
        Math.min(195, Math.max(125, short * 0.115)) * scale
      );
      return { w: Math.round(h * 0.8), h };
    },
    previewBaseScale: 0.88,
    previewMaxBoost: 17,
    previewActor: { w: 175, h: 220, bottom: "8%", z: 36 },
  },
  previewHintKey: "pet.previewMugCatHint",
  appearance: { nameFrom: "look" },
  lines,
  resolveMotion: remapMugCatMotion,
  runtime: {
    gaze: { max: 1.8, range: 145, follow: 0.28 },
    tapFallbackMotion: "mug-steam",
    screenFlight: "none",
    dragLandMotions: ["mug-tip", "mug-purr", "sway-step"],
    accents: {
      deskWeather: {
        appsUp: "mug-sip",
        appsDown: "mug-nap",
        switchBurst: "mug-steam",
        maxDwell: { "30s": "mug-purr", "3m": "mug-stare" },
      },
    },
  },
  view: {
    shell: "bob",
    previewPad: "flat",
    Model: PetMugCatModel,
    bindRuntime: (ctx) => ({
      visual: ctx.visual,
      mood: ctx.mood,
      gaze: ctx.gaze,
      motion: ctx.motion,
      lookId: ctx.lookId,
    }),
    bindPreview: (ctx) => ({
      visual: ctx.visual,
      mood: ctx.mood,
      gaze: ctx.previewGaze,
      motion: ctx.motion,
      lookId: ctx.lookId,
    }),
  },
};
