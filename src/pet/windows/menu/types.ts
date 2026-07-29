export const PET_MENU_LABEL = "pet-menu";
export const PET_MENU_SHOW_EVENT = "pet://menu-show";
export const PET_MENU_HIDE_EVENT = "pet://menu-hide";
export const PET_MENU_ACTION_EVENT = "pet://menu-action";
export const PET_MENU_ACTIVITY_EVENT = "pet://menu-activity";
export const PET_MENU_LAYOUT_EVENT = "pet://menu-layout";

export type PetMenuAction = "open" | "pin" | "chat";

export interface PetMenuPayload {
  /** Show chat row when true */
  chatEnabled: boolean;
  /** Whether system stats panel starts expanded */
  statsExpandDefault: boolean;
}

export interface PetMenuLayoutPayload {
  expanded: boolean;
  /** Measured content height; preferred over preset when present */
  height?: number;
}

/** Idle with no pointer/keyboard feedback → auto close */
export const PET_MENU_IDLE_MS = 15_000;

export const PET_MENU_W = 228;
/** toggle + divider + 3 items; keep a little headroom for DPI */
export const PET_MENU_H_COLLAPSED = 176;
export const PET_MENU_H_EXPANDED = 228;
/** Placement uses expanded height so opening near screen edge still fits when expanded */
export const PET_MENU_H = PET_MENU_H_EXPANDED;
export const PET_MENU_GAP = -6;

export function petMenuHeight(expanded: boolean): number {
  return expanded ? PET_MENU_H_EXPANDED : PET_MENU_H_COLLAPSED;
}
