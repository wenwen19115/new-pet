import { computed, ref, type Ref } from "vue";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import {
  cursorPosition,
  getCurrentWindow,
} from "@tauri-apps/api/window";
import type { PetMood } from "@/pet/data/types";
import type { ApplyPetMood } from "./petHostMood";
import { testPetPreciseHit } from "@/pet/runtime/petHitBridge";
import {
  buildPhysicsStyle,
  computeReleaseImpulses,
  cursorToBodyNdc,
  isCursorOverPet,
  isPhysicsActive,
  resetPhysicsVelocities,
  smoothCursorDelta,
  tickDragPhysics,
  tickReleasePhysics,
  updateGaze,
  winCenterFromOuter,
  type PointerPhysicsVelocities,
} from "./pointerPhysics";

export function usePetPointerHost(deps: {
  hostAlive: () => boolean;
  winSize: Ref<{ w: number; h: number }> | { value: { w: number; h: number } };
  bodyBox: Ref<{ w: number; h: number }> | { value: { w: number; h: number } };
  mood: Ref<PetMood>;
  applyMood: ApplyPetMood;
  isMenuOpen: () => boolean;
  gaze: { x: number; y: number };
  gazeConfig: () => { max: number; range: number; follow: number };
  dragThreshold?: number;
  /** 拖拽锁定前：停飞行、藏浮层、清动作 timer */
  onBeforeDrag: () => void;
  onTap: () => void;
  onAfterPointerUp: (info: { wasDragging: boolean }) => void;
  syncBubble?: () => void;
  /** 每帧光标采样后（含 winCenter） */
  onCursorSample?: (
    cursor: { x: number; y: number },
    winCenter: { x: number; y: number }
  ) => void;
  /** 额外可点区域（如宠下对话条）——参与穿透关闭 */
  isOverExtra?: (
    cursor: { x: number; y: number },
    winCenter: { x: number; y: number },
    winSize: { w: number; h: number }
  ) => boolean;
}) {
  const DRAG_THRESHOLD = deps.dragThreshold ?? 14;
  const HIT_PAD = 2;

  const isDragging = ref(false);
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
  let physicsVel: PointerPhysicsVelocities = resetPhysicsVelocities();
  let cachedScale = 1;
  let winCenter = { x: 0, y: 0 };
  let wantPos: { x: number; y: number } | null = null;
  let posWriting = false;
  let ignoreCursor = false;
  /** 上一帧精检结果；节流复用，避免每帧射线 */
  let lastPreciseOver = false;
  let lastPreciseFrame = -999;
  /** 穿透切换迟滞，减少边缘来回打 IPC */
  let passDesire: boolean | null = null;
  let passDesireStreak = 0;
  let sampleBusy = false;
  let passSyncing = false;

  const physicsSnap = () => ({
    swingAngle: swingAngle.value,
    tiltY: tiltY.value,
    tiltX: tiltX.value,
    stretchX: stretchX.value,
    stretchY: stretchY.value,
  });

  const dragTrail = () => ({
    dragTrailAngle: dragTrailAngle.value,
    dragTrailSpeed: dragTrailSpeed.value,
  });

  const physicsActive = computed(() =>
    isPhysicsActive(physicsSnap(), isDragging.value)
  );

  const physicsStyle = computed(() => {
    if (!physicsActive.value) return {};
    return buildPhysicsStyle(physicsSnap());
  });

  async function syncCursorPassThrough(overPet: boolean) {
    if (!deps.hostAlive()) return;
    const shouldIgnore = !overPet && !isDragging.value;
    if (shouldIgnore === ignoreCursor) return;
    if (passSyncing) return;
    ignoreCursor = shouldIgnore;
    passSyncing = true;
    try {
      await getCurrentWindow().setIgnoreCursorEvents(shouldIgnore);
    } catch {
      // ignore
    } finally {
      passSyncing = false;
    }
  }

  /** 命中要灵敏；离开要粘一点，避免轮廓边缘狂切穿透 */
  function applyPassThroughHysteresis(overPet: boolean) {
    if (isDragging.value || deps.isMenuOpen()) {
      passDesire = null;
      passDesireStreak = 0;
      void syncCursorPassThrough(true);
      return;
    }
    if (passDesire === overPet) {
      passDesireStreak += 1;
    } else {
      passDesire = overPet;
      passDesireStreak = 1;
    }
    const need = overPet ? 1 : 3;
    if (passDesireStreak >= need) void syncCursorPassThrough(overPet);
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
          winCenter = winCenterFromOuter(
            p,
            deps.winSize.value.w,
            deps.winSize.value.h
          );
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

      winCenter = winCenterFromOuter(
        outer,
        deps.winSize.value.w,
        deps.winSize.value.h
      );

      deps.applyMood("curious", "drag-start");
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
      physicsVel = computeReleaseImpulses(
        smoothVelX,
        smoothVelY,
        stretchX.value,
        stretchY.value
      );
    }

    dragStarted = false;
    wantPos = null;

    if (!wasDragging && dist < DRAG_THRESHOLD) {
      deps.onTap();
    }

    deps.onAfterPointerUp({ wasDragging });
  }

  function tickSwing(dt: number) {
    const snap = physicsSnap();
    const trail = dragTrail();

    if (isDragging.value) {
      tickDragPhysics(dt, smoothVelX, smoothVelY, snap, trail);
      swingAngle.value = snap.swingAngle;
      tiltY.value = snap.tiltY;
      tiltX.value = snap.tiltX;
      stretchX.value = snap.stretchX;
      stretchY.value = snap.stretchY;
      dragTrailAngle.value = trail.dragTrailAngle;
      dragTrailSpeed.value = trail.dragTrailSpeed;
      return;
    }

    smoothVelX = 0;
    smoothVelY = 0;
    tickReleasePhysics(dt, snap, physicsVel, trail);
    swingAngle.value = snap.swingAngle;
    tiltY.value = snap.tiltY;
    tiltX.value = snap.tiltX;
    stretchX.value = snap.stretchX;
    stretchY.value = snap.stretchY;
    dragTrailAngle.value = trail.dragTrailAngle;
    dragTrailSpeed.value = trail.dragTrailSpeed;
  }

  async function sampleCursor(frame: number) {
    if (!deps.hostAlive() || sampleBusy) return;
    sampleBusy = true;
    try {
      const scale = cachedScale || (await getCurrentWindow().scaleFactor());
      cachedScale = scale;
      const cursor = (await cursorPosition()).toLogical(scale);

      if (isDragging.value) {
        const dx = cursor.x - lastCursorLog.x;
        const dy = cursor.y - lastCursorLog.y;
        const vel = smoothCursorDelta(smoothVelX, smoothVelY, dx, dy);
        smoothVelX = vel.x;
        smoothVelY = vel.y;
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
        winCenter = winCenterFromOuter(
          outer,
          deps.winSize.value.w,
          deps.winSize.value.h
        );
      }

      let overPet = isCursorOverPet(
        cursor,
        winCenter,
        deps.bodyBox.value.w,
        deps.bodyBox.value.h,
        HIT_PAD,
        isDragging.value,
        deps.isMenuOpen()
      );
      if (
        overPet &&
        !isDragging.value &&
        !deps.isMenuOpen()
      ) {
        // 每 3 帧精检一次；中间复用，减轻射线与穿透抖动
        if (frame - lastPreciseFrame >= 3) {
          const ndc = cursorToBodyNdc(
            cursor,
            winCenter,
            deps.bodyBox.value.w,
            deps.bodyBox.value.h
          );
          const precise = testPetPreciseHit(ndc.x, ndc.y);
          lastPreciseOver = precise === null ? true : precise;
          lastPreciseFrame = frame;
        }
        overPet = lastPreciseOver;
      } else {
        lastPreciseOver = false;
        lastPreciseFrame = frame;
      }
      if (
        !overPet &&
        deps.isOverExtra?.(cursor, winCenter, deps.winSize.value)
      ) {
        overPet = true;
      }
      applyPassThroughHysteresis(overPet);

      updateGaze(deps.gaze, cursor, winCenter, deps.mood.value, deps.gazeConfig());
      deps.onCursorSample?.(cursor, winCenter);
    } catch {
      // ignore
    } finally {
      sampleBusy = false;
    }
  }

  function resetDragState() {
    wantPos = null;
    pointerDown = false;
    dragStarted = false;
    isDragging.value = false;
    ignoreCursor = false;
    passDesire = null;
    passDesireStreak = 0;
  }

  async function syncWindowCenter() {
    try {
      const win = getCurrentWindow();
      cachedScale = await win.scaleFactor();
      const outer = (await win.outerPosition()).toLogical(cachedScale);
      winCenter = winCenterFromOuter(
        outer,
        deps.winSize.value.w,
        deps.winSize.value.h
      );
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
    winCenter = winCenterFromOuter(
      outer,
      deps.winSize.value.w,
      deps.winSize.value.h
    );
  }

  return {
    isDragging,
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
