/** 指针物理：clamp / 弹簧 / 拖尾（无 Vue 生命周期）。 */

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export type PointerPhysicsSnapshot = {
  swingAngle: number;
  tiltY: number;
  tiltX: number;
  stretchX: number;
  stretchY: number;
};

export type PointerPhysicsVelocities = {
  swingVel: number;
  tiltYVel: number;
  tiltXVel: number;
  stretchVelX: number;
  stretchVelY: number;
};

export type DragTrailState = {
  dragTrailAngle: number;
  dragTrailSpeed: number;
};

export function isPhysicsActive(
  snap: PointerPhysicsSnapshot,
  isDragging: boolean
): boolean {
  return (
    isDragging ||
    Math.abs(snap.swingAngle) > 0.35 ||
    Math.abs(snap.tiltY) > 0.6 ||
    Math.abs(snap.tiltX) > 0.6 ||
    Math.abs(snap.stretchX - 1) > 0.012 ||
    Math.abs(snap.stretchY - 1) > 0.012
  );
}

export function buildPhysicsStyle(
  snap: PointerPhysicsSnapshot
): Record<string, string> {
  return {
    animation: "none",
    transform: `rotateY(${snap.tiltY}deg) rotateX(${snap.tiltX}deg) rotateZ(${snap.swingAngle}deg) scale(${snap.stretchX}, ${snap.stretchY})`,
    transformOrigin: "50% 55%",
  };
}

export function computeReleaseImpulses(
  smoothVelX: number,
  smoothVelY: number,
  stretchX: number,
  stretchY: number
): PointerPhysicsVelocities {
  return {
    swingVel: smoothVelX * 3.2,
    tiltYVel: smoothVelX * 0.7,
    tiltXVel: -smoothVelY * 0.5,
    stretchVelX: (1 - stretchX) * 8,
    stretchVelY: (1 - stretchY) * 8,
  };
}

/** Drag-phase swing/tilt/stretch + trail speed; mutates `snap` and `trail`. */
export function tickDragPhysics(
  dt: number,
  smoothVelX: number,
  smoothVelY: number,
  snap: PointerPhysicsSnapshot,
  trail: DragTrailState
): void {
  const speed = Math.hypot(smoothVelX, smoothVelY);
  const targetSwing = clamp(smoothVelX * 4.2, -28, 28);
  snap.swingAngle += (targetSwing - snap.swingAngle) * Math.min(1, dt * 16);

  const targetTiltY = clamp(smoothVelX * 2.4, -22, 22);
  const targetTiltX = clamp(-smoothVelY * 1.8, -14, 14);
  snap.tiltY += (targetTiltY - snap.tiltY) * Math.min(1, dt * 14);
  snap.tiltX += (targetTiltX - snap.tiltX) * Math.min(1, dt * 14);

  const pull = clamp(speed * 0.01, 0, 0.12);
  const tx = clamp(1 - pull * 0.35, 0.9, 1.03);
  const ty = clamp(1 + pull * 0.45, 0.97, 1.12);
  snap.stretchX += (tx - snap.stretchX) * Math.min(1, dt * 14);
  snap.stretchY += (ty - snap.stretchY) * Math.min(1, dt * 14);

  const targetSpeed = clamp(speed / 12, 0, 1);
  trail.dragTrailSpeed +=
    (targetSpeed - trail.dragTrailSpeed) * Math.min(1, dt * 14);
  if (speed > 0.4) {
    trail.dragTrailAngle = stepDragTrailAngle(
      trail.dragTrailAngle,
      smoothVelX,
      smoothVelY,
      dt
    );
  }
}

export function stepDragTrailAngle(
  prev: number,
  smoothVelX: number,
  smoothVelY: number,
  dt: number
): number {
  const ang = (Math.atan2(smoothVelY, smoothVelX) * 180) / Math.PI + 180;
  let delta = ang - prev;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return prev + delta * Math.min(1, dt * 14);
}

/** Release-phase spring decay; mutates `snap`, `vel`, and `trail`. Returns true when settled. */
export function tickReleasePhysics(
  dt: number,
  snap: PointerPhysicsSnapshot,
  vel: PointerPhysicsVelocities,
  trail: DragTrailState
): boolean {
  trail.dragTrailSpeed *= Math.max(0, 1 - dt * 11);
  if (trail.dragTrailSpeed < 0.025) trail.dragTrailSpeed = 0;

  vel.swingVel += (-90 * snap.swingAngle - 14 * vel.swingVel) * dt;
  snap.swingAngle += vel.swingVel * dt;
  vel.tiltYVel += (-85 * snap.tiltY - 13 * vel.tiltYVel) * dt;
  snap.tiltY += vel.tiltYVel * dt;
  vel.tiltXVel += (-85 * snap.tiltX - 13 * vel.tiltXVel) * dt;
  snap.tiltX += vel.tiltXVel * dt;
  vel.stretchVelX += (-70 * (snap.stretchX - 1) - 12 * vel.stretchVelX) * dt;
  snap.stretchX += vel.stretchVelX * dt;
  vel.stretchVelY += (-70 * (snap.stretchY - 1) - 12 * vel.stretchVelY) * dt;
  snap.stretchY += vel.stretchVelY * dt;

  if (
    Math.abs(snap.swingAngle) < 0.15 &&
    Math.abs(vel.swingVel) < 0.15 &&
    Math.abs(snap.tiltY) < 0.2 &&
    Math.abs(snap.tiltX) < 0.2 &&
    Math.abs(vel.tiltYVel) < 0.15 &&
    Math.abs(vel.tiltXVel) < 0.15 &&
    Math.abs(snap.stretchX - 1) < 0.008 &&
    Math.abs(snap.stretchY - 1) < 0.008
  ) {
    snap.swingAngle = 0;
    vel.swingVel = 0;
    snap.tiltY = 0;
    snap.tiltX = 0;
    vel.tiltYVel = 0;
    vel.tiltXVel = 0;
    snap.stretchX = 1;
    snap.stretchY = 1;
    vel.stretchVelX = 0;
    vel.stretchVelY = 0;
    return true;
  }
  return false;
}

export function resetPhysicsVelocities(): PointerPhysicsVelocities {
  return {
    swingVel: 0,
    tiltYVel: 0,
    tiltXVel: 0,
    stretchVelX: 0,
    stretchVelY: 0,
  };
}

export function winCenterFromOuter(
  outer: { x: number; y: number },
  winW: number,
  winH: number
) {
  return { x: outer.x + winW / 2, y: outer.y + winH / 2 };
}

/** 光标相对身体盒中心 → 画布 NDC（Y 向上为正，对齐 WebGL）。 */
export function cursorToBodyNdc(
  cursor: { x: number; y: number },
  winCenter: { x: number; y: number },
  bodyW: number,
  bodyH: number
): { x: number; y: number } {
  const halfW = Math.max(1, bodyW / 2);
  const halfH = Math.max(1, bodyH / 2);
  return {
    x: (cursor.x - winCenter.x) / halfW,
    y: -(cursor.y - winCenter.y) / halfH,
  };
}

export function isCursorOverPet(
  cursor: { x: number; y: number },
  winCenter: { x: number; y: number },
  bodyW: number,
  bodyH: number,
  hitPad: number,
  isDragging: boolean,
  isMenuOpen: boolean
): boolean {
  if (isDragging || isMenuOpen) return true;
  const halfW = bodyW / 2 + hitPad;
  const halfH = bodyH / 2 + hitPad;
  return (
    Math.abs(cursor.x - winCenter.x) <= halfW &&
    Math.abs(cursor.y - winCenter.y) <= halfH
  );
}

export function updateGaze(
  gaze: { x: number; y: number },
  cursor: { x: number; y: number },
  winCenter: { x: number; y: number },
  mood: string,
  gazeConfig: { max: number; range: number; follow: number }
): void {
  if (mood !== "sleep") {
    const gdx = cursor.x - winCenter.x;
    const gdy = cursor.y - winCenter.y;
    const len = Math.hypot(gdx, gdy) || 1;
    const { max: maxGaze, range, follow } = gazeConfig;
    const strength = clamp(len / range, 0, 1);
    gaze.x += ((gdx / len) * maxGaze * strength - gaze.x) * follow;
    gaze.y += ((gdy / len) * maxGaze * strength - gaze.y) * follow;
  } else {
    gaze.x *= 0.85;
    gaze.y *= 0.85;
  }
}

export function smoothCursorDelta(
  smoothVelX: number,
  smoothVelY: number,
  dx: number,
  dy: number
): { x: number; y: number } {
  return {
    x: smoothVelX + (dx - smoothVelX) * 0.55,
    y: smoothVelY + (dy - smoothVelY) * 0.55,
  };
}
