import type { PetModelKind } from "@/pet/skins/types";
import { getCharacter } from "../characters";

function petSafeMargin(model: PetModelKind): number {
  return getCharacter(model).size.safeMargin;
}

export function clampPetZoom(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(-100, Math.round(value)));
}

export function clampPreviewBoost(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(40, Math.max(0, Math.round(value)));
}

function petScaleFromZoom(zoomPercent: number): number {
  return Math.max(0.2, 1 + clampPetZoom(zoomPercent) / 100);
}

export function previewBoostScale(boostPercent: number): number {
  return 1 + clampPreviewBoost(boostPercent) / 100;
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

export function petWindowSize(
  model: PetModelKind,
  zoomPercent = 0,
  screen?: PetScreenMetrics
): { w: number; h: number } {
  const body = petBodyBox(model, zoomPercent, screen ?? readPetScreenMetrics());
  const safe = petSafeMargin(model);
  return {
    w: body.w + safe * 2,
    h: body.h + safe * 2,
  };
}

export const PET_BUBBLE_W = 220;
export const PET_BUBBLE_H = 96;
export const PET_BUBBLE_W_WIDE = 280;
export const PET_BUBBLE_H_TALL = 200;
export const PET_BUBBLE_GAP = 12;
