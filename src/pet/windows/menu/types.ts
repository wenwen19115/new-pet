export const PET_MENU_LABEL = "pet-menu";
export const PET_MENU_SHOW_EVENT = "pet://menu-show";
export const PET_MENU_HIDE_EVENT = "pet://menu-hide";
export const PET_MENU_ACTION_EVENT = "pet://menu-action";
export const PET_MENU_ACTIVITY_EVENT = "pet://menu-activity";
export const PET_MENU_LAYOUT_EVENT = "pet://menu-layout";

export type PetMenuAction =
  | "open"
  | "pin"
  | "chat"
  | "hide"
  | "reveal"
  | "perform"
  | "playful"
  | "sky-on-pet"
  | "dismiss";

export interface PetMenuPayload {
  chatEnabled: boolean;
  statsExpandDefault: boolean;
  peekHidden?: boolean;
  /** 窗外天气是否投射到桌宠 */
  skyOnPet?: boolean;
}

export interface PetMenuLayoutPayload {
  expanded: boolean;
  /** 实测内容高度；有则优先于预设 */
  height?: number;
}

/** 无指针/键盘活动多久后自动关 */
export const PET_MENU_IDLE_MS = 15_000;

export const PET_MENU_W = 228;
/** 折叠：仪表盘 + 分组单列（含退出召唤）；实测高度优先 */
export const PET_MENU_H_COLLAPSED = 372;
export const PET_MENU_H_EXPANDED = 448;
/** 摆位按展开高度算，靠屏幕边也能展开 */
export const PET_MENU_H = PET_MENU_H_EXPANDED;
export const PET_MENU_GAP = -6;

export function petMenuHeight(expanded: boolean): number {
  return expanded ? PET_MENU_H_EXPANDED : PET_MENU_H_COLLAPSED;
}
