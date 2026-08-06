import type { PetModelKind } from "@/pet/skins/types";
import { getCharacter } from "../characters";

export function clampPetZoom(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(-100, Math.round(value)));
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
  const factor = getCharacter(model).size.bubbleOffsetYFactor;
  return { halfW: box.w / 2, offsetY: box.h * factor };
}

/** 桌宠窗景画布基准（约设置 hero 缩小版）；随 zoom 缩放 */
const SKY_PET_BACKDROP_W = 280;
const SKY_PET_BACKDROP_H = 360;

export function petWindowSize(
  _model: PetModelKind,
  zoomPercent = 0
): { w: number; h: number } {
  // 桌宠 HWND 固定窗景画布（开关投射只显隐，不改尺寸）
  const scale = petScaleFromZoom(zoomPercent);
  const k = Math.max(0.85, Math.min(1.25, scale));
  return {
    w: Math.round(SKY_PET_BACKDROP_W * k),
    h: Math.round(SKY_PET_BACKDROP_H * k),
  };
}

export const PET_BUBBLE_W = 220;
export const PET_BUBBLE_H = 96;
export const PET_BUBBLE_W_WIDE = 280;
export const PET_BUBBLE_H_TALL = 200;
export const PET_BUBBLE_GAP = 12;
