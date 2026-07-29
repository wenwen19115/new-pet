export const PET_MENU_LABEL = "pet-menu";
export const PET_MENU_SHOW_EVENT = "pet://menu-show";
export const PET_MENU_HIDE_EVENT = "pet://menu-hide";
export const PET_MENU_ACTION_EVENT = "pet://menu-action";
export const PET_MENU_ACTIVITY_EVENT = "pet://menu-activity";
export const PET_MENU_LAYOUT_EVENT = "pet://menu-layout";

export type PetMenuAction = "open" | "pin" | "chat" | "hide" | "reveal";

export interface PetMenuPayload {
  chatEnabled: boolean;
  statsExpandDefault: boolean;
  peekHidden?: boolean;
}

export interface PetMenuLayoutPayload {
  expanded: boolean;
  /** 实测内容高度；有则优先于预设 */
  height?: number;
}

/** 无指针/键盘活动多久后自动关 */
export const PET_MENU_IDLE_MS = 15_000;

export const PET_MENU_W = 228;
/** 折叠高度：开关 + 分隔 + 4 项，留一点 DPI 余量 */
export const PET_MENU_H_COLLAPSED = 208;
export const PET_MENU_H_EXPANDED = 260;
/** 摆位按展开高度算，靠屏幕边也能展开 */
export const PET_MENU_H = PET_MENU_H_EXPANDED;
export const PET_MENU_GAP = -6;

export function petMenuHeight(expanded: boolean): number {
  return expanded ? PET_MENU_H_EXPANDED : PET_MENU_H_COLLAPSED;
}
