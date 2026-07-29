import type { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export type WaitWebviewReadyOptions = {
  timeoutMs?: number;
  /** 超时：保留 HWND（pet 冷启动）或销毁（bubble/menu/chat） */
  onTimeout?: "keep" | "destroy";
};

export async function waitWebviewReady(
  win: WebviewWindow,
  options?: WaitWebviewReadyOptions
): Promise<WebviewWindow | null> {
  const timeoutMs = options?.timeoutMs ?? 2500;
  const onTimeout = options?.onTimeout ?? "destroy";

  return await new Promise((resolve) => {
    let settled = false;
    const finish = (value: WebviewWindow | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    };
    const timer = window.setTimeout(() => {
      if (onTimeout === "destroy") {
        void win.destroy().catch(() => undefined);
        finish(null);
        return;
      }
      finish(win);
    }, timeoutMs);
    void win.once("tauri://created", () => finish(win));
    void win.once("tauri://error", () => {
      void win.destroy().catch(() => undefined);
      finish(null);
    });
  });
}
