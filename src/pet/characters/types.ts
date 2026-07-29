import type { Component } from "vue";
import type { PetModelKind, PetSkinVisual } from "../skins/types";
import type { PetFormDef } from "../skins/forms";
import type { PetIdleMotion } from "../content/motions";
import type { CharacterExtensions } from "../domain/extensions";
import type { CharacterLineBundle } from "./lineTypes";

export type {
  CharacterLineBundle,
  CharacterPersonalityLines,
  CharacterIntroLines,
  LineLangPack,
  PersonalityPolish,
  UsbLineTemplates,
  BuiltInLineCategory,
} from "./lineTypes";
export { BUILTIN_LINE_CATEGORIES, isBuiltInLineCategory } from "./lineTypes";

/** Declared abilities — UI/runtime gate on these, not raw `model ===` checks */
export type PetCapability =
  | "custom-lines"
  | "motion-toggle"
  | "look-swatches"
  | "vrm-upload"
  | "vrm-bone-editor"
  | "pixel-fx"
  /** 3D preview yaw orbit (chip / VRM); 2D fig & toon stay off */
  | "preview-orbit";

/** Desktop pet window mount shell */
type CharacterShell = "bob" | "vrm";

/** Settings preview stage layout */
type CharacterPreviewPad = "orbit" | "flat" | "vrm";

interface CharacterScreenMetrics {
  availW: number;
  availH: number;
}

interface CharacterSizeSpec {
  safeMargin: number;
  /** Bubble Y offset as a fraction of body height (negative = upward) */
  bubbleOffsetYFactor: number;
  bodyBox: (
    scale: number,
    screen: CharacterScreenMetrics
  ) => { w: number; h: number };
}

interface CharacterDefaults {
  demoMotion: string;
  /** Default pet look (形象) id */
  lookId: string;
  /** Build per-character extension bag for a fresh profile */
  buildExtensions?: () => CharacterExtensions;
}

interface CharacterAppearancePolicy {
  /** chip uses look.chipNickname; others use form.defaultNickname */
  nicknameFrom: "form" | "look-chip";
  /** toon may prefer look.toonNameKey */
  nameFrom: "look" | "look-toon";
  attachToonDecor?: boolean;
}

/** Host reads these instead of `model ===` for interaction/flight */
export interface CharacterRuntimeSpec {
  gaze: {
    max: number;
    /** Distance (px) at which gaze strength saturates */
    range: number;
    follow: number;
  };
  /** Chip-style LED chase on pins */
  tickLeds?: boolean;
  /** Fallback when tap-egg pool is empty */
  tapFallbackMotion: PetIdleMotion;
  /**
   * How screen-flight motions move the window:
   * - fly: random glide (chip / fig)
   * - wormhole: toon teleport
   * - none: stay put (vrm walk handles itself)
   */
  screenFlight: "fly" | "wormhole" | "none";
}

/** Host → model props for the live pet window */
interface CharacterRuntimeBindCtx {
  visual: PetSkinVisual;
  mood: string;
  gaze: { x: number; y: number };
  blinking: boolean;
  motion: string;
  pinColors: string[];
  figArtId?: string | null;
  toonDecor?: string | null;
  wormholePhase: string;
  vrmSrc: string | null;
  customVrmMotions: unknown[];
  lifting: boolean;
  faceYaw: number;
}

/** Host → model props for settings preview */
interface CharacterPreviewBindCtx {
  visual: PetSkinVisual;
  mood: string;
  motion: string;
  pinColors: string[];
  figArtId?: string | null;
  toonDecor?: string | null;
  vrmSrc: string | null;
  customMotions: unknown[];
  yaw: number;
  pitch: number;
  previewGaze: { x: number; y: number };
  errorText: string;
}

interface CharacterView {
  shell: CharacterShell;
  previewPad: CharacterPreviewPad;
  /** Extra class on flat preview pad (e.g. toon-pad) */
  previewPadClass?: string;
  showBobShadow?: boolean;
  /** Default orbit angles for preview reset */
  previewOrbit?: { yaw: number; pitch: number };
  Model: Component;
  bindRuntime: (ctx: CharacterRuntimeBindCtx) => Record<string, unknown>;
  bindPreview: (ctx: CharacterPreviewBindCtx) => Record<string, unknown>;
}

/**
 * Per-character package.
 * Host should read this instead of branching on model id.
 */
export interface CharacterDef {
  id: PetModelKind;
  form: PetFormDef;
  capabilities: readonly PetCapability[];
  demoMotions: readonly PetIdleMotion[];
  idleMotions: readonly PetIdleMotion[];
  defaults: CharacterDefaults;
  /** Allowed pet look (形象) ids from the global look registry */
  lookIds: readonly string[];
  size: CharacterSizeSpec;
  /** i18n key for settings preview hint */
  previewHintKey: string;
  appearance: CharacterAppearancePolicy;
  lines: CharacterLineBundle;
  /** Interaction / flight params (Host reads instead of model ===) */
  runtime: CharacterRuntimeSpec;
  /** Map foreign / legacy motion ids onto this character */
  resolveMotion: (motion: PetIdleMotion) => PetIdleMotion;
  view: CharacterView;
}
