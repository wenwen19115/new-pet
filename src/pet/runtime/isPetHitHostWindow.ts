/** 仅桌宠主窗注册命中；设置预览同组件勿抢桥。 */
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PET_WINDOW_LABEL } from "@/pet/data/types";

export function isPetHitHostWindow(): boolean {
  try {
    return getCurrentWindow().label === PET_WINDOW_LABEL;
  } catch {
    return false;
  }
}
