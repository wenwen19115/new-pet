import { computed, ref, type Ref } from "vue";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import {
  cursorPosition,
  getCurrentWindow,
} from "@tauri-apps/api/window";
import type { PetMood } from "@/pet/data/types";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Pointer hit-test, drag/follow, gaze, and spring/tilt for the floating pet. */
export function usePetPointerHost(deps: {
  hostAlive: () => boolean;
  winSize: Ref<{ w: number; h: number }> | { value: { w: number; h: number } };
  bodyBox: Ref<{ w: number; h: number }> | { value: { w: number; h: number } };
  mood: Ref<PetMood>;
  speaking: Ref<boolean>;
  hitBoundsEnabled: () => boolean;
  isMenuOpen: () => boolean;
  gaze: { x: number; y: number };
  gazeConfig: () => { max: number; range: number; follow: number };
  dragThreshold?: number;
  /** Cancel flights, hide overlays, clear motion timers before drag locks in. */
  onBeforeDrag: () => void;
  onTap: () => void;
  onAfterPointerUp: (info: { wasDragging: boolean }) => void;
  syncBubble?: () => void;
}) {
  const DRAG_THRESHOLD = deps.dragThreshold ?? 14;
  const HIT_PAD = 2;

  const isDragging = ref(false);
  const showHitBounds = ref(false);
  const swingAngle = ref(0);
  const tiltY = ref(0);
  const tiltX = ref(0);
  const stretchX = ref(1);
  const stretchY = ref(1);
  const dragTrailAngle = ref(0);
  const dragTrailSpeed = ref(0);

  let pointerDown = false;
  let dragStarted = false;
  let downScreen = { x: 0, y: 0 };
  let lastCursorLog = { x: 0, y: 0 };
  let grabOffsetX = 0;
  let grabOffsetY = 0;
  let smoothVelX = 0;
  let smoothVelY = 0;
  let swingVel = 0;
  let tiltYVel = 0;
  let tiltXVel = 0;
  let stretchVelX = 0;
  let stretchVelY = 0;
  let cachedScale = 1;
  let winCenter = { x: 0, y: 0 };
  let wantPos: { x: number; y: number } | null = null;
  let posWriting = false;
  let ignoreCursor = false;

  const physicsActive = computed(
    () =>
      isDragging.value ||
      Math.abs(swingAngle.value) > 0.35 ||
      Math.abs(tiltY.value) > 0.6 ||
      Math.abs(tiltX.value) > 0.6 ||
      Math.abs(stretchX.value - 1) > 0.012 ||
      Math.abs(stretchY.value - 1) > 0.012
  );

  const physicsStyle = computed(() => {
    if (!physicsActive.value) return {};
    return {
      animation: "none",
      transform: `rotateY(${tiltY.value}deg) rotateX(${tiltX.value}deg) rotateZ(${swingAngle.value}deg) scale(${stretchX.value}, ${stretchY.value})`,
      transformOrigin: "50% 55%",
    };
  });

  async function syncCursorPassThrough(overPet: boolean) {
    if (!deps.hostAlive()) return;
    const shouldIgnore = !overPet && !isDragging.value;
    if (shouldIgnore === ignoreCursor) return;
    ignoreCursor = shouldIgnore;
    try {
      await getCurrentWindow().setIgnoreCursorEvents(shouldIgnore);
    } catch {
      // ignore
    }
  }

  async function pumpWindowPos() {
    if (posWriting || !deps.hostAlive()) return;
    posWriting = true;
    try {
      const win = getCurrentWindow();
      while (wantPos && isDragging.value && deps.hostAlive()) {
        const p = wantPos;
        wantPos = null;
        try {
          await win.setPosition(new LogicalPosition(p.x, p.y));
          winCenter = {
            x: p.x + deps.winSize.value.w / 2,
            y: p.y + deps.winSize.value.h / 2,
          };
        } catch {
          break;
        }
      }
    } finally {
      posWriting = false;
      if (wantPos && isDragging.value && deps.hostAlive()) void pumpWindowPos();
    }
  }

  async function beginPhysicsDrag() {
    if (dragStarted || isDragging.value) return;
    dragStarted = true;

    try {
      const win = getCurrentWindow();
      cachedScale = await win.scaleFactor();
      const outer = (await win.outerPosition()).toLogical(cachedScale);
      const cursor = (await cursorPosition()).toLogical(cachedScale);

      if (!pointerDown || !dragStarted) {
        dragStarted = false;
        return;
      }

      grabOffsetX = cursor.x - outer.x;
      grabOffsetY = cursor.y - outer.y;
      lastCursorLog = { x: cursor.x, y: cursor.y };
      smoothVelX = 0;
      smoothVelY = 0;
      wantPos = null;

      deps.onBeforeDrag();

      winCenter = {
        x: outer.x + deps.winSize.value.w / 2,
        y: outer.y + deps.winSize.value.h / 2,
      };

      deps.mood.value = "curious";
      isDragging.value = true;
      wantPos = { x: outer.x, y: outer.y };
    } catch {
      dragStarted = false;
    }
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    pointerDown = true;
    dragStarted = false;
    downScreen = { x: e.screenX, y: e.screenY };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!pointerDown || dragStarted) return;
    const dist = Math.hypot(e.screenX - downScreen.x, e.screenY - downScreen.y);
    if (dist >= DRAG_THRESHOLD) {
      void beginPhysicsDrag();
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (!pointerDown) return;
    pointerDown = false;

    const dist = Math.hypot(e.screenX - downScreen.x, e.screenY - downScreen.y);
    const wasDragging = dragStarted || isDragging.value;

    if (isDragging.value) {
      isDragging.value = false;
      swingVel = smoothVelX * 3.2;
      tiltYVel = smoothVelX * 0.7;
      tiltXVel = -smoothVelY * 0.5;
      stretchVelX = (1 - stretchX.value) * 8;
      stretchVelY = (1 - stretchY.value) * 8;
      window.setTimeout(() => {
        if (
          !isDragging.value &&
          !deps.speaking.value &&
          deps.mood.value !== "sleep"
        ) {
          deps.mood.value = "idle";
        }
      }, 320);
    }

    dragStarted = false;
    wantPos = null;

    if (!wasDragging && dist < DRAG_THRESHOLD) {
      deps.onTap();
    }

    deps.onAfterPointerUp({ wasDragging });
  }

  function tickSwing(dt: number) {
    if (isDragging.value) {
      const speed = Math.hypot(smoothVelX, smoothVelY);
      const targetSwing = clamp(smoothVelX * 4.2, -28, 28);
      swingAngle.value += (targetSwing - swingAngle.value) * Math.min(1, dt * 16);

      const targetTiltY = clamp(smoothVelX * 2.4, -22, 22);
      const targetTiltX = clamp(-smoothVelY * 1.8, -14, 14);
      tiltY.value += (targetTiltY - tiltY.value) * Math.min(1, dt * 14);
      tiltX.value += (targetTiltX - tiltX.value) * Math.min(1, dt * 14);

      const pull = clamp(speed * 0.01, 0, 0.12);
      const tx = clamp(1 - pull * 0.35, 0.9, 1.03);
      const ty = clamp(1 + pull * 0.45, 0.97, 1.12);
      stretchX.value += (tx - stretchX.value) * Math.min(1, dt * 14);
      stretchY.value += (ty - stretchY.value) * Math.min(1, dt * 14);

      const targetSpeed = clamp(speed / 12, 0, 1);
      dragTrailSpeed.value +=
        (targetSpeed - dragTrailSpeed.value) * Math.min(1, dt * 14);
      if (speed > 0.4) {
        const ang = (Math.atan2(smoothVelY, smoothVelX) * 180) / Math.PI + 180;
        const prev = dragTrailAngle.value;
        let delta = ang - prev;
        while (delta > 180) delta -= 360;
        while (delta < -180) delta += 360;
        dragTrailAngle.value = prev + delta * Math.min(1, dt * 14);
      }
      return;
    }

    dragTrailSpeed.value *= Math.max(0, 1 - dt * 11);
    if (dragTrailSpeed.value < 0.025) dragTrailSpeed.value = 0;

    smoothVelX = 0;
    smoothVelY = 0;

    swingVel += (-90 * swingAngle.value - 14 * swingVel) * dt;
    swingAngle.value += swingVel * dt;
    tiltYVel += (-85 * tiltY.value - 13 * tiltYVel) * dt;
    tiltY.value += tiltYVel * dt;
    tiltXVel += (-85 * tiltX.value - 13 * tiltXVel) * dt;
    tiltX.value += tiltXVel * dt;
    stretchVelX += (-70 * (stretchX.value - 1) - 12 * stretchVelX) * dt;
    stretchX.value += stretchVelX * dt;
    stretchVelY += (-70 * (stretchY.value - 1) - 12 * stretchVelY) * dt;
    stretchY.value += stretchVelY * dt;

    if (
      Math.abs(swingAngle.value) < 0.15 &&
      Math.abs(swingVel) < 0.15 &&
      Math.abs(tiltY.value) < 0.2 &&
      Math.abs(tiltX.value) < 0.2 &&
      Math.abs(tiltYVel) < 0.15 &&
      Math.abs(tiltXVel) < 0.15 &&
      Math.abs(stretchX.value - 1) < 0.008 &&
      Math.abs(stretchY.value - 1) < 0.008
    ) {
      swingAngle.value = 0;
      swingVel = 0;
      tiltY.value = 0;
      tiltX.value = 0;
      tiltYVel = 0;
      tiltXVel = 0;
      stretchX.value = 1;
      stretchY.value = 1;
      stretchVelX = 0;
      stretchVelY = 0;
    }
  }

  async function sampleCursor(frame: number) {
    if (!deps.hostAlive()) return;
    try {
      const scale = cachedScale || (await getCurrentWindow().scaleFactor());
      cachedScale = scale;
      const cursor = (await cursorPosition()).toLogical(scale);

      if (isDragging.value) {
        const dx = cursor.x - lastCursorLog.x;
        const dy = cursor.y - lastCursorLog.y;
        smoothVelX += (dx - smoothVelX) * 0.55;
        smoothVelY += (dy - smoothVelY) * 0.55;
        wantPos = {
          x: cursor.x - grabOffsetX,
          y: cursor.y - grabOffsetY,
        };
        void pumpWindowPos();
        deps.syncBubble?.();
      }

      lastCursorLog = { x: cursor.x, y: cursor.y };

      if (isDragging.value || frame % 6 === 0) {
        const outer = (
          await getCurrentWindow().outerPosition()
        ).toLogical(scale);
        winCenter = {
          x: outer.x + deps.winSize.value.w / 2,
          y: outer.y + deps.winSize.value.h / 2,
        };
      }

      const halfW = deps.bodyBox.value.w / 2 + HIT_PAD;
      const halfH = deps.bodyBox.value.h / 2 + HIT_PAD;
      const overPet =
        isDragging.value ||
        deps.isMenuOpen() ||
        (Math.abs(cursor.x - winCenter.x) <= halfW &&
          Math.abs(cursor.y - winCenter.y) <= halfH);
      showHitBounds.value =
        deps.hitBoundsEnabled() &&
        overPet &&
        !isDragging.value &&
        !deps.isMenuOpen();
      void syncCursorPassThrough(overPet);

      if (deps.mood.value !== "sleep") {
        const gdx = cursor.x - winCenter.x;
        const gdy = cursor.y - winCenter.y;
        const len = Math.hypot(gdx, gdy) || 1;
        const { max: maxGaze, range, follow } = deps.gazeConfig();
        const strength = clamp(len / range, 0, 1);
        deps.gaze.x += ((gdx / len) * maxGaze * strength - deps.gaze.x) * follow;
        deps.gaze.y += ((gdy / len) * maxGaze * strength - deps.gaze.y) * follow;
      } else {
        deps.gaze.x *= 0.85;
        deps.gaze.y *= 0.85;
      }
    } catch {
      // ignore
    }
  }

  function resetDragState() {
    wantPos = null;
    pointerDown = false;
    dragStarted = false;
    isDragging.value = false;
    ignoreCursor = false;
  }

  async function syncWindowCenter() {
    try {
      const win = getCurrentWindow();
      cachedScale = await win.scaleFactor();
      const outer = (await win.outerPosition()).toLogical(cachedScale);
      winCenter = {
        x: outer.x + deps.winSize.value.w / 2,
        y: outer.y + deps.winSize.value.h / 2,
      };
      return { cachedScale, outer, winCenter };
    } catch {
      return null;
    }
  }

  async function initCursorLog() {
    try {
      const cursor = (await cursorPosition()).toLogical(cachedScale || 1);
      lastCursorLog = { x: cursor.x, y: cursor.y };
    } catch {
      // ignore
    }
  }

  function setWinCenterFromResize(outer: { x: number; y: number }) {
    winCenter = {
      x: outer.x + deps.winSize.value.w / 2,
      y: outer.y + deps.winSize.value.h / 2,
    };
  }

  return {
    isDragging,
    showHitBounds,
    dragTrailAngle,
    dragTrailSpeed,
    physicsActive,
    physicsStyle,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    tickSwing,
    sampleCursor,
    resetDragState,
    syncWindowCenter,
    initCursorLog,
    setWinCenterFromResize,
  };
}
