import type { Component } from "vue";
import type { PetModelKind, PetSkinVisual } from "../skins/types";
import type { PetFormDef } from "../skins/forms";
import type { PetIdleMotion } from "../content/motion/motions";
import type { CharacterExtensions } from "../data/extensions";
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

/** 能力声明；UI/runtime 用这个，别写长驻 `model ===` */
export type PetCapability =
  | "custom-lines"
  | "motion-toggle"
  | "look-swatches"
  | "vrm-upload"
  | "vrm-bone-editor"
  | "pixel-fx"
  /** 3D 预览 yaw 轨道（chip / VRM）；fig / toon 关掉 */
  | "preview-orbit"
  /** chip 睡眠呼吸 bob */
  | "shell-sleep-bob";

type CharacterShell = "bob" | "vrm";

type CharacterPreviewPad = "orbit" | "flat" | "vrm";

interface CharacterScreenMetrics {
  availW: number;
  availH: number;
}

interface CharacterPreviewActor {
  w: number;
  h: number;
  /** hero 演员层 bottom，如 `10%` */
  bottom?: string;
  /** 相对镜头的 translateZ（px）；越大透视越「近」 */
  z?: number;
}

interface CharacterSizeSpec {
  /** Bubble Y offset as a fraction of body height (negative = upward) */
  bubbleOffsetYFactor: number;
  bodyBox: (
    scale: number,
    screen: CharacterScreenMetrics
  ) => { w: number; h: number };
  /** 设置预览贴合垫子后的起始倍率 */
  previewBaseScale?: number;
  /** 滚轮额外放大上限（百分点，叠在 base 上） */
  previewMaxBoost?: number;
  /** 设置页窗外预览的演员框 */
  previewActor?: CharacterPreviewActor;
}

interface CharacterDefaults {
  demoMotion: string;
  lookId: string;
  /** Build per-character extension bag for a fresh profile */
  buildExtensions?: () => CharacterExtensions;
}

interface CharacterAppearancePolicy {
  /** toon 可优先 look.toonNameKey */
  nameFrom: "look" | "look-toon";
  attachToonDecor?: boolean;
}

/** host 读这里的参数，别按 model id 分支 */
export interface CharacterRuntimeSpec {
  gaze: {
    max: number;
    /** 注视强度饱和距离（px） */
    range: number;
    follow: number;
  };
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
  dragLandMotions: readonly PetIdleMotion[];
  /**
   * 口音小规则：玩法同一套，反应分家。缺省字段 = 跟全局默认。
   */
  accents?: {
    /** USB 主句后追一句的概率；0/缺省 = 不追（chip 电压八卦） */
    usbFollowUpChance?: number;
    /** 拖拽落地播动作概率；缺省 1；fig 可压低「台词多、动作少」 */
    dragLandMotionChance?: number;
    /** 工位气象动作；缺省只台词 */
    deskWeather?: {
      appsUp?: PetIdleMotion | null;
      appsDown?: PetIdleMotion | null;
      switchBurst?: PetIdleMotion | null;
      maxDwell?: Partial<
        Record<"30s" | "3m", PetIdleMotion | null>
      >;
    };
  };
}

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
  previewPadClass?: string;
  showBobShadow?: boolean;
  /** Default orbit angles for preview reset */
  previewOrbit?: { yaw: number; pitch: number };
  Model: Component;
  bindRuntime: (ctx: CharacterRuntimeBindCtx) => Record<string, unknown>;
  bindPreview: (ctx: CharacterPreviewBindCtx) => Record<string, unknown>;
}

/**
 * 单个角色包。host 读这个，别按 model id 分支。
 */
export interface CharacterDef {
  id: PetModelKind;
  form: PetFormDef;
  capabilities: readonly PetCapability[];
  demoMotions: readonly PetIdleMotion[];
  idleMotions: readonly PetIdleMotion[];
  defaults: CharacterDefaults;
  lookIds: readonly string[];
  size: CharacterSizeSpec;
  previewHintKey: string;
  appearance: CharacterAppearancePolicy;
  lines: CharacterLineBundle;
  runtime: CharacterRuntimeSpec;
  /** 把外来 / 旧动作 id 映射到本角色可播 id */
  resolveMotion: (motion: PetIdleMotion) => PetIdleMotion;
  view: CharacterView;
}
