import type { CharacterDef } from "./types";
import { formToon } from "../skins/forms";
import { STANDARD_LOOK_IDS } from "../skins/looks";
import { PET_TOON_DEMO_MOTIONS } from "../content/motion/motions";
import { lines } from "./lines/toon";
import { remapToonMotion } from "./motionRemap";
import { PetToonModel } from "../models/toon";

export const characterToon: CharacterDef = {
  id: "toon",
  form: formToon,
  capabilities: [
    "custom-lines",
    "motion-toggle",
    "look-swatches",
    "pixel-fx",
  ],
  demoMotions: PET_TOON_DEMO_MOTIONS,
  idleMotions: [
    "toon-grass",
    "toon-thunder",
    "toon-walk",
    "toon-tilt",
    "toon-sway",
    "happy-bounce",
    "peekaboo",
    "screen-wormhole",
  ],
  defaults: {
    demoMotion: "toon-sway",
    lookId: "cyan",
  },
  lookIds: STANDARD_LOOK_IDS,
  size: {
    safeMargin: 36,
    bubbleOffsetYFactor: -0.06,
    bodyBox: (scale, screen) => {
      const short = Math.min(screen.availW, screen.availH);
      const side = Math.round(
        Math.min(160, Math.max(88, short * 0.09)) * scale
      );
      return { w: side, h: Math.round(side * 1.08) };
    },
  },
  previewHintKey: "pet.previewToonHint",
  appearance: {
    nicknameFrom: "form",
    nameFrom: "look-toon",
    attachToonDecor: true,
  },
  lines,
  resolveMotion: remapToonMotion,
  runtime: {
    gaze: { max: 3.4, range: 120, follow: 0.42 },
    tapFallbackMotion: "tap-frenzy",
    screenFlight: "wormhole",
  },
  view: {
    shell: "bob",
    previewPad: "flat",
    previewPadClass: "toon-pad",
    Model: PetToonModel,
    bindRuntime: (ctx) => ({
      visual: ctx.visual,
      mood: ctx.mood,
      gaze: ctx.gaze,
      motion: ctx.motion,
      decor: ctx.toonDecor,
      wormholePhase: ctx.wormholePhase,
    }),
    bindPreview: (ctx) => ({
      visual: ctx.visual,
      mood: ctx.mood,
      gaze: { x: 0.3, y: 0.1 },
      motion: ctx.motion,
      decor: ctx.toonDecor,
      showShadow: false,
    }),
  },
};
