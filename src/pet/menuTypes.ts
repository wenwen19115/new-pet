export const PET_MENU_LABEL = "pet-menu";
export const PET_MENU_SHOW_EVENT = "pet://menu-show";
export const PET_MENU_HIDE_EVENT = "pet://menu-hide";
export const PET_MENU_ACTION_EVENT = "pet://menu-action";

export type PetMenuAction = "open" | "pin";

export interface PetMenuPayload {
  openLabel: string;
  pinLabel: string;
}

export const PET_MENU_W = 148;
export const PET_MENU_H = 76;
export const PET_MENU_GAP = -6;
