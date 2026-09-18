import { LogicalPosition } from "@tauri-apps/api/dpi";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";

/** smootherstep：比 cubic 更顺滑，起停更柔 */
function easeSmooth(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export type WorkRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type CrawlEdge = "top" | "right" | "bottom" | "left";

const EDGE_ORDER: CrawlEdge[] = ["top", "right", "bottom", "left"];

/** 窗左上角投影到最近工作区边（inset 已含窗尺寸）。 */
export function projectOntoNearestEdge(
  rect: WorkRect,
  x: number,
  y: number
): { x: number; y: number; edge: CrawlEdge } {
  const dTop = Math.abs(y - rect.top);
  const dBottom = Math.abs(y - rect.bottom);
  const dLeft = Math.abs(x - rect.left);
  const dRight = Math.abs(x - rect.right);
  const min = Math.min(dTop, dBottom, dLeft, dRight);
  const cx = clamp(x, rect.left, rect.right);
  const cy = clamp(y, rect.top, rect.bottom);
  if (min === dTop) return { x: cx, y: rect.top, edge: "top" };
  if (min === dBottom) return { x: cx, y: rect.bottom, edge: "bottom" };
  if (min === dLeft) return { x: rect.left, y: cy, edge: "left" };
  return { x: rect.right, y: cy, edge: "right" };
}

function pointOnEdge(
  rect: WorkRect,
  edge: CrawlEdge,
  t: number
): { x: number; y: number } {
  const u = clamp(t, 0.08, 0.92);
  if (edge === "top") {
    return {
      x: Math.round(rect.left + (rect.right - rect.left) * u),
      y: rect.top,
    };
  }
  if (edge === "bottom") {
    return {
      x: Math.round(rect.left + (rect.right - rect.left) * u),
      y: rect.bottom,
    };
  }
  if (edge === "left") {
    return {
      x: rect.left,
      y: Math.round(rect.top + (rect.bottom - rect.top) * u),
    };
  }
  return {
    x: rect.right,
    y: Math.round(rect.top + (rect.bottom - rect.top) * u),
  };
}

/**
 * 从当前位置贴边后，沿边折线爬若干段（纯函数，供 smoke / crawl 共用）。
 * `rng` 缺省 Math.random。
 */
export function buildEdgeCrawlWaypoints(
  rect: WorkRect,
  from: { x: number; y: number },
  segments = 3,
  rng: () => number = Math.random
): { x: number; y: number }[] {
  const segs = Math.max(1, Math.min(6, Math.floor(segments)));
  const start = projectOntoNearestEdge(rect, from.x, from.y);
  const out: { x: number; y: number }[] = [
    { x: Math.round(start.x), y: Math.round(start.y) },
  ];
  let edge = start.edge;
  let edgeIdx = EDGE_ORDER.indexOf(edge);
  for (let i = 0; i < segs; i++) {
    const turn = rng() < 0.55 ? 1 : rng() < 0.5 ? -1 : 0;
    if (turn !== 0) {
      edgeIdx = (edgeIdx + turn + EDGE_ORDER.length) % EDGE_ORDER.length;
      edge = EDGE_ORDER[edgeIdx]!;
    }
    out.push(pointOnEdge(rect, edge, rng()));
  }
  return out;
}

async function readWorkRect(
  winW: number,
  winH: number
): Promise<WorkRect | null> {
  try {
    const monitor = await currentMonitor();
    if (!monitor) return null;
    const scale = monitor.scaleFactor || 1;
    const wp = monitor.workArea.position;
    const ws = monitor.workArea.size;
    const left = wp.x / scale;
    const top = wp.y / scale;
    const right = (wp.x + ws.width) / scale - winW;
    const bottom = (wp.y + ws.height) / scale - winH;
    if (right <= left + 8 || bottom <= top + 8) return null;
    return { left, top, right, bottom };
  } catch {
    return null;
  }
}

function randomPointInWork(rect: WorkRect): { x: number; y: number } {
  return {
    x: Math.round(rect.left + 24 + Math.random() * (rect.right - rect.left - 48)),
    y: Math.round(rect.top + 24 + Math.random() * (rect.bottom - rect.top - 48)),
  };
}

async function pickRandomWorkPoint(
  winW: number,
  winH: number
): Promise<{ x: number; y: number } | null> {
  const rect = await readWorkRect(winW, winH);
  if (!rect) return null;
  return randomPointInWork(rect);
}

/** 尽量落在远离 avoid 的工作区点（调皮躲开用）。 */
export async function pickWorkPointAwayFrom(
  winW: number,
  winH: number,
  avoid: { x: number; y: number },
  minDist = 280
): Promise<{ x: number; y: number } | null> {
  const rect = await readWorkRect(winW, winH);
  if (!rect) return null;
  let best = randomPointInWork(rect);
  let bestDist = Math.hypot(best.x + winW / 2 - avoid.x, best.y + winH / 2 - avoid.y);
  for (let i = 0; i < 14; i++) {
    const p = randomPointInWork(rect);
    const d = Math.hypot(p.x + winW / 2 - avoid.x, p.y + winH / 2 - avoid.y);
    if (d > bestDist) {
      best = p;
      bestDist = d;
    }
    if (d >= minDist) return p;
  }
  return best;
}

interface FlyFrameInfo {
  x: number;
  y: number;
  visualDx: number;
  visualDy: number;
}

/**
 * 平滑飞窗：
 * - 每帧算理想位置（约 60fps）
 * - 窗位 IPC 异步追赶（队列只保留最新点，不 await 阻塞）
 * - visualDx/Dy 用 CSS 补上窗位滞后，观感接近满帧
 */
async function animatePetWindowTo(
  toX: number,
  toY: number,
  durationMs: number,
  signal?: { cancelled: boolean },
  onFrame?: (info: FlyFrameInfo) => void
): Promise<void> {
  const win = getCurrentWindow();
  const scale = await win.scaleFactor();
  const from = (await win.outerPosition()).toLogical(scale);
  const start = performance.now();

  let committed = { x: from.x, y: from.y };
  let pending: { x: number; y: number } | null = null;
  let writing = false;

  const flushWrite = () => {
    if (writing || !pending || signal?.cancelled) return;
    writing = true;
    const next = pending;
    pending = null;
    void win
      .setPosition(new LogicalPosition(next.x, next.y))
      .then(() => {
        committed = next;
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        writing = false;
        if (pending) flushWrite();
      });
  };

  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      if (signal?.cancelled) {
        onFrame?.({ x: committed.x, y: committed.y, visualDx: 0, visualDy: 0 });
        resolve();
        return;
      }

      const t = clamp((now - start) / Math.max(1, durationMs), 0, 1);
      const e = easeSmooth(t);
      const x = from.x + (toX - from.x) * e;
      const y = from.y + (toY - from.y) * e;

      pending = { x, y };
      flushWrite();

      onFrame?.({
        x,
        y,
        visualDx: x - committed.x,
        visualDy: y - committed.y,
      });

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        pending = { x: toX, y: toY };
        flushWrite();
        void win
          .setPosition(new LogicalPosition(toX, toY))
          .catch(() => {})
          .finally(() => {
            onFrame?.({ x: toX, y: toY, visualDx: 0, visualDy: 0 });
            resolve();
          });
      }
    };
    requestAnimationFrame(step);
  });
}

export async function flyPetWindowRandom(
  winW: number,
  winH: number,
  durationMs = 1600,
  signal?: { cancelled: boolean },
  onFrame?: (info: FlyFrameInfo) => void
): Promise<boolean> {
  const dest = await pickRandomWorkPoint(winW, winH);
  if (!dest) return false;
  await animatePetWindowTo(dest.x, dest.y, durationMs, signal, onFrame);
  return !signal?.cancelled;
}

/** 沿工作区边框折线爬；每段分摊总时长。 */
export async function crawlPetWindowAlongEdge(
  winW: number,
  winH: number,
  durationMs = 2200,
  signal?: { cancelled: boolean },
  onFrame?: (info: FlyFrameInfo) => void,
  segments = 3
): Promise<boolean> {
  const rect = await readWorkRect(winW, winH);
  if (!rect) return false;
  const win = getCurrentWindow();
  const scale = await win.scaleFactor();
  const from = (await win.outerPosition()).toLogical(scale);
  const points = buildEdgeCrawlWaypoints(
    rect,
    { x: from.x, y: from.y },
    segments
  );
  const legs = Math.max(1, points.length - 1);
  const per = Math.max(280, durationMs / legs);
  let cursor = { x: from.x, y: from.y };
  for (let i = 0; i < points.length; i++) {
    if (signal?.cancelled) return false;
    const p = points[i]!;
    // 已在起点边上则跳过零长度段
    if (i === 0 && Math.hypot(p.x - cursor.x, p.y - cursor.y) < 4) {
      cursor = p;
      continue;
    }
    await animatePetWindowTo(p.x, p.y, per, signal, onFrame);
    cursor = p;
  }
  return !signal?.cancelled;
}

/** 调皮躲开：先贴边，再往远离光标的边爬。 */
export async function crawlPetWindowAway(
  avoid: { x: number; y: number },
  winW: number,
  winH: number,
  durationMs = 900,
  signal?: { cancelled: boolean },
  onFrame?: (info: FlyFrameInfo) => void
): Promise<boolean> {
  const rect = await readWorkRect(winW, winH);
  if (!rect) return false;
  const win = getCurrentWindow();
  const scale = await win.scaleFactor();
  const from = (await win.outerPosition()).toLogical(scale);
  const start = projectOntoNearestEdge(rect, from.x, from.y);
  const candidates = EDGE_ORDER.map((edge) => pointOnEdge(rect, edge, 0.5));
  let best = candidates[0]!;
  let bestDist = -1;
  for (const p of candidates) {
    const d = Math.hypot(p.x + winW / 2 - avoid.x, p.y + winH / 2 - avoid.y);
    if (d > bestDist) {
      best = p;
      bestDist = d;
    }
  }
  await animatePetWindowTo(start.x, start.y, durationMs * 0.35, signal, onFrame);
  if (signal?.cancelled) return false;
  await animatePetWindowTo(best.x, best.y, durationMs * 0.65, signal, onFrame);
  return !signal?.cancelled;
}

export async function movePetWindowTo(
  toX: number,
  toY: number,
  durationMs = 720,
  signal?: { cancelled: boolean },
  onFrame?: (info: FlyFrameInfo) => void
): Promise<boolean> {
  await animatePetWindowTo(toX, toY, durationMs, signal, onFrame);
  return !signal?.cancelled;
}

export type PeekEdge = "left" | "right" | "top" | "bottom";

/** 只露约 38% 身体：贴工作区边。 */
export async function pickPeekOuterPosition(
  winW: number,
  winH: number,
  bodyW: number,
  bodyH: number
): Promise<{ x: number; y: number; edge: PeekEdge } | null> {
  try {
    const monitor = await currentMonitor();
    if (!monitor) return null;
    const scale = monitor.scaleFactor || 1;
    const wp = monitor.workArea.position;
    const ws = monitor.workArea.size;
    const workL = wp.x / scale;
    const workT = wp.y / scale;
    const workR = (wp.x + ws.width) / scale;
    const workB = (wp.y + ws.height) / scale;
    const visible = 0.38;
    const edges: PeekEdge[] = ["left", "right", "top", "bottom"];
    const edge = edges[Math.floor(Math.random() * edges.length)]!;
    const midX = (workL + workR) / 2;
    const midY = (workT + workB) / 2;
    const jitterX = (Math.random() - 0.5) * Math.max(40, (workR - workL) * 0.35);
    const jitterY = (Math.random() - 0.5) * Math.max(40, (workB - workT) * 0.35);

    let cx = midX;
    let cy = midY;
    if (edge === "right") {
      cx = workR - (bodyW * visible) / 2;
      cy = clamp(midY + jitterY, workT + bodyH / 2, workB - bodyH / 2);
    } else if (edge === "left") {
      cx = workL + (bodyW * visible) / 2;
      cy = clamp(midY + jitterY, workT + bodyH / 2, workB - bodyH / 2);
    } else if (edge === "top") {
      cy = workT + (bodyH * visible) / 2;
      cx = clamp(midX + jitterX, workL + bodyW / 2, workR - bodyW / 2);
    } else {
      cy = workB - (bodyH * visible) / 2;
      cx = clamp(midX + jitterX, workL + bodyW / 2, workR - bodyW / 2);
    }

    return {
      x: Math.round(cx - winW / 2),
      y: Math.round(cy - winH / 2),
      edge,
    };
  } catch {
    return null;
  }
}

/** 从贴边探头只往里挪一点，刚好整只露在工作区里，不飞回远处。 */
export async function pickPeekRevealOuterPosition(
  winW: number,
  winH: number,
  bodyW: number,
  bodyH: number,
  edge: PeekEdge,
  fromOuter?: { x: number; y: number }
): Promise<{ x: number; y: number } | null> {
  try {
    const monitor = await currentMonitor();
    if (!monitor) return null;
    const scale = monitor.scaleFactor || 1;
    const wp = monitor.workArea.position;
    const ws = monitor.workArea.size;
    const workL = wp.x / scale;
    const workT = wp.y / scale;
    const workR = (wp.x + ws.width) / scale;
    const workB = (wp.y + ws.height) / scale;
    const pad = 10;
    const fromCx = fromOuter ? fromOuter.x + winW / 2 : (workL + workR) / 2;
    const fromCy = fromOuter ? fromOuter.y + winH / 2 : (workT + workB) / 2;

    let cx = fromCx;
    let cy = fromCy;
    if (edge === "left") {
      cx = workL + bodyW / 2 + pad;
      cy = clamp(fromCy, workT + bodyH / 2, workB - bodyH / 2);
    } else if (edge === "right") {
      cx = workR - bodyW / 2 - pad;
      cy = clamp(fromCy, workT + bodyH / 2, workB - bodyH / 2);
    } else if (edge === "top") {
      cy = workT + bodyH / 2 + pad;
      cx = clamp(fromCx, workL + bodyW / 2, workR - bodyW / 2);
    } else {
      cy = workB - bodyH / 2 - pad;
      cx = clamp(fromCx, workL + bodyW / 2, workR - bodyW / 2);
    }

    return {
      x: Math.round(cx - winW / 2),
      y: Math.round(cy - winH / 2),
    };
  } catch {
    return null;
  }
}

function sleep(ms: number, signal?: { cancelled: boolean }): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = (now: number) => {
      if (signal?.cancelled || now - start >= ms) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

type WormholePhase = "out" | "warp" | "in" | "done";

export async function teleportPetWindowWormhole(
  winW: number,
  winH: number,
  signal?: { cancelled: boolean },
  onPhase?: (phase: WormholePhase) => void,
  destOverride?: { x: number; y: number } | null
): Promise<boolean> {
  const dest =
    destOverride ?? (await pickRandomWorkPoint(winW, winH));
  if (!dest) return false;
  const win = getCurrentWindow();

  onPhase?.("out");
  await sleep(360, signal);
  if (signal?.cancelled) {
    onPhase?.("done");
    return false;
  }

  try {
    await win.setPosition(new LogicalPosition(dest.x, dest.y));
  } catch {
    onPhase?.("done");
    return false;
  }
  onPhase?.("warp");
  await sleep(280, signal);
  if (signal?.cancelled) {
    onPhase?.("done");
    return false;
  }

  onPhase?.("in");
  await sleep(480, signal);
  onPhase?.("done");
  return !signal?.cancelled;
}

export async function flyPetWindowAway(
  avoid: { x: number; y: number },
  winW: number,
  winH: number,
  durationMs = 900,
  signal?: { cancelled: boolean },
  onFrame?: (info: FlyFrameInfo) => void
): Promise<boolean> {
  const dest = await pickWorkPointAwayFrom(winW, winH, avoid);
  if (!dest) return false;
  await animatePetWindowTo(dest.x, dest.y, durationMs, signal, onFrame);
  return !signal?.cancelled;
}

export async function teleportPetWindowWormholeAway(
  avoid: { x: number; y: number },
  winW: number,
  winH: number,
  signal?: { cancelled: boolean },
  onPhase?: (phase: WormholePhase) => void
): Promise<boolean> {
  const dest = await pickWorkPointAwayFrom(winW, winH, avoid, 320);
  return teleportPetWindowWormhole(winW, winH, signal, onPhase, dest);
}
