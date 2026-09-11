import type { PetModelKind } from "@/pet/skins/types";
import { getCharacter } from "../characters";

/** 设置滑条与落盘共用；+200 ≈ 本体 3 倍 */
export const PET_ZOOM_MIN = -100;
export const PET_ZOOM_MAX = 200;

export function clampPetZoom(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(
    PET_ZOOM_MAX,
    Math.max(PET_ZOOM_MIN, Math.round(value))
  );
}

function petScaleFromZoom(zoomPercent: number): number {
  return Math.max(0.2, 1 + clampPetZoom(zoomPercent) / 100);
}

interface PetScreenMetrics {
  availW: number;
  availH: number;
}

function readPetScreenMetrics(): PetScreenMetrics {
  try {
    const availW = window.screen?.availWidth ?? 1280;
    const availH = window.screen?.availHeight ?? 800;
    return {
      availW: Math.max(800, availW),
      availH: Math.max(600, availH),
    };
  } catch {
    return { availW: 1280, availH: 800 };
  }
}

export function petBodyBox(
  model: PetModelKind,
  zoomPercent = 0,
  screen: PetScreenMetrics = readPetScreenMetrics()
): { w: number; h: number } {
  const scale = petScaleFromZoom(zoomPercent);
  return getCharacter(model).size.bodyBox(scale, screen);
}

export function petBubbleAnchor(
  model: PetModelKind,
  zoomPercent = 0
): { halfW: number; offsetY: number } {
  const box = petBodyBox(model, zoomPercent);
  const size = getCharacter(model).size;
  const factor = size.bubbleOffsetYFactor;
  const clear = Math.min(1, Math.max(0.28, size.bubbleClearanceFactor ?? 0.5));
  return { halfW: (box.w / 2) * clear, offsetY: box.h * factor };
}

/** 右键菜单等壳外浮层：相对角色可视半宽（同气泡贴靠系数） */
export function petInteractHalfW(
  model: PetModelKind,
  zoomPercent = 0
): number {
  return petBubbleAnchor(model, zoomPercent).halfW;
}

/** 桌宠窗景画布基准（约设置 hero 缩小版）；随 zoom 缩放 */
const SKY_PET_BACKDROP_W = 280;
const SKY_PET_BACKDROP_H = 360;

export function petWindowSize(
  model: PetModelKind,
  zoomPercent = 0,
  screen: PetScreenMetrics = readPetScreenMetrics()
): { w: number; h: number } {
  const scale = petScaleFromZoom(zoomPercent);
  const k = Math.max(0.85, Math.min(1.25, scale));
  const skyW = Math.round(SKY_PET_BACKDROP_W * k);
  const skyH = Math.round(SKY_PET_BACKDROP_H * k);
  // 角色盒随 zoom 可大于窗景基准；HWND 须盖住角色，否则 html overflow 裁头脚
  const body = getCharacter(model).size.bodyBox(scale, screen);
  // 壳层 rocket-jump 峰值约 -56px；pad 须盖住行程，否则 html overflow 裁头脚
  const padX = 28;
  const padY = 72;
  return {
    w: Math.max(skyW, body.w + padX),
    h: Math.max(skyH, body.h + padY),
  };
}

export const PET_BUBBLE_W = 220;
export const PET_BUBBLE_H = 96;
export const PET_BUBBLE_W_WIDE = 280;
export const PET_BUBBLE_H_TALL = 200;
export const PET_BUBBLE_GAP = 6;
