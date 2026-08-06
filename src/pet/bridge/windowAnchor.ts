/**
 * 窗口几何助手（与 sizes.ts 同族）：改尺寸时钉中心。
 * 非业务调度；调用方仍在 runtime / windows。
 */
import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";

type AnchorWindow = {
  scaleFactor: () => Promise<number>;
  outerPosition: () => Promise<{
    toLogical: (scale: number) => { x: number; y: number };
  }>;
  outerSize: () => Promise<{
    toLogical: (scale: number) => { width: number; height: number };
  }>;
  setSize: (size: LogicalSize) => Promise<void>;
  setPosition: (pos: LogicalPosition) => Promise<void>;
};

/**
 * 改窗口大小时钉住内容中心（桌宠角色居中），避免缩放/换模后角色跳位。
 */
export async function setWindowSizeKeepCenter(
  win: AnchorWindow,
  next: { w: number; h: number }
): Promise<{ x: number; y: number }> {
  const scale = await win.scaleFactor();
  const outer = (await win.outerPosition()).toLogical(scale);
  const prev = (await win.outerSize()).toLogical(scale);
  const cx = outer.x + prev.width / 2;
  const cy = outer.y + prev.height / 2;
  const targetW = Math.max(1, Math.round(next.w));
  const targetH = Math.max(1, Math.round(next.h));
  const nextX = Math.round(cx - targetW / 2);
  const nextY = Math.round(cy - targetH / 2);

  const sizeChanged =
    Math.abs(prev.width - targetW) > 0.5 || Math.abs(prev.height - targetH) > 0.5;
  if (sizeChanged) {
    await win.setSize(new LogicalSize(targetW, targetH));
  }
  await win.setPosition(new LogicalPosition(nextX, nextY));

  // OS 可能钳到工作区，再钉一次中心
  const settledPos = (await win.outerPosition()).toLogical(scale);
  const settledSize = (await win.outerSize()).toLogical(scale);
  const scx = settledPos.x + settledSize.width / 2;
  const scy = settledPos.y + settledSize.height / 2;
  if (Math.abs(scx - cx) > 1.5 || Math.abs(scy - cy) > 1.5) {
    const fixX = Math.round(cx - settledSize.width / 2);
    const fixY = Math.round(cy - settledSize.height / 2);
    await win.setPosition(new LogicalPosition(fixX, fixY));
    return { x: fixX, y: fixY };
  }
  return { x: nextX, y: nextY };
}
