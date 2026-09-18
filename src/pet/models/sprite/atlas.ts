/** Codex / pets-Skills 共用 8×9 精灵表契约 */

export type SpriteAnimName =
  | "idle"
  | "walk"
  | "run"
  | "wave"
  | "jump"
  | "failed"
  | "waiting"
  | "active"
  | "review";

/** 匀速 number，或按帧下标的时长表（开源 Codex 曲线） */
export type SpriteFrameTiming = number | readonly number[];

export interface SpriteAtlas {
  columns: number;
  rows: number;
  /** 逻辑帧宽（与图无关；用于 aspect） */
  frameW: number;
  frameH: number;
  /** 每行动画名；index = 行号 */
  rowOf: Record<SpriteAnimName, number>;
  /** 每行有效帧数（从左起） */
  frames: Record<SpriteAnimName, number>;
  /** 默认每帧时长 ms；数组按帧下标，短于帧数时末值延用 */
  frameMs: Record<SpriteAnimName, SpriteFrameTiming>;
}

/** 解析当前帧应停留的 ms（再乘 pace） */
export function spriteFrameDelayMs(
  timing: SpriteFrameTiming | undefined,
  frameIndex: number,
  pace = 1
): number {
  const fallback = 120;
  let base = fallback;
  if (typeof timing === "number") {
    base = timing;
  } else if (timing && timing.length > 0) {
    const i = Math.max(0, Math.min(frameIndex, timing.length - 1));
    base = timing[i] ?? timing[timing.length - 1] ?? fallback;
  }
  return Math.max(40, Math.round(base * pace));
}

/**
 * Codex 逐帧曲线（animation-rows 精神）：
 * 首/末更长 → Extreme 可读；中段推进。
 */
export const CODEX_FRAME_MS: Record<SpriteAnimName, readonly number[]> = {
  idle: [280, 110, 110, 140, 140, 320],
  walk: [120, 120, 120, 120, 120, 120, 120, 220],
  run: [100, 100, 100, 100, 100, 100, 100, 180],
  wave: [140, 140, 140, 280],
  jump: [140, 140, 140, 140, 280],
  failed: [140, 140, 140, 140, 140, 140, 140, 240],
  waiting: [150, 150, 150, 150, 150, 260],
  active: [120, 120, 120, 120, 120, 220],
  review: [150, 150, 150, 150, 150, 280],
};

/** Codex catalog：1536×1872 / 192×208 */
export const CODEX_PET_ATLAS: SpriteAtlas = {
  columns: 8,
  rows: 9,
  frameW: 192,
  frameH: 208,
  rowOf: {
    idle: 0,
    walk: 1,
    run: 2,
    wave: 3,
    jump: 4,
    failed: 5,
    waiting: 6,
    active: 7,
    review: 8,
  },
  frames: {
    idle: 6,
    walk: 8,
    run: 8,
    wave: 4,
    jump: 5,
    failed: 8,
    waiting: 6,
    active: 6,
    review: 6,
  },
  frameMs: { ...CODEX_FRAME_MS },
};

/** pets-Skills 行语义（idle/walk/run/wave/sit/sleep/happy/eat）映射到本仓名 */
export const PETS_SKILL_ATLAS: SpriteAtlas = {
  ...CODEX_PET_ATLAS,
  rowOf: {
    idle: 0,
    walk: 1,
    run: 2,
    wave: 3,
    jump: 6, // happy
    failed: 4, // sit 作蔫/收
    waiting: 5, // sleep
    active: 7, // eat
    review: 8,
  },
  frames: {
    idle: 8,
    walk: 8,
    run: 8,
    wave: 8,
    jump: 8,
    failed: 8,
    waiting: 8,
    active: 8,
    review: 8,
  },
  frameMs: {
    idle: 140,
    walk: 90,
    run: 70,
    wave: 110,
    jump: 100,
    failed: 100,
    waiting: 160,
    active: 95,
    review: 120,
  },
};
