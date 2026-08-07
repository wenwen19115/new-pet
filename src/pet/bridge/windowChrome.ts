import { invoke } from "@tauri-apps/api/core";

/** 无边框主窗 DWM 边框色（可见标题栏是 ThemeTitleBar）。 */
export async function setWindowBorderColor(input: {
  border: [number, number, number];
  dark: boolean;
}): Promise<void> {
  await invoke("set_window_border_color", input);
}
