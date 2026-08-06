/** 事件名索引；定义仍放在各自 types / motions，跨 host 监听时从这里引。 */

export {
  PET_WINDOW_LABEL,
  PET_SETTINGS_EVENT,
  PET_INTRO_EVENT,
  PET_CLEAR_CACHE_EVENT,
  PET_SUSPEND_EVENT,
  PET_RESUME_EVENT,
} from "../data/types";

export { PET_LOCALE_EVENT } from "../bridge/locale";

export {
  PET_MOTION_EVENT,
  PET_OPEN_SETTINGS_EVENT,
} from "../content/motion/motions";
export type { PetMotionPayload } from "../content/motion/motions";

export {
  PET_BUBBLE_EVENT,
  PET_BUBBLE_HIDE_EVENT,
  PET_BUBBLE_PONG_EVENT,
} from "../windows/bubble/types";
export type { PetBubblePayload } from "../windows/bubble/types";

export {
  PET_MENU_SHOW_EVENT,
  PET_MENU_HIDE_EVENT,
  PET_MENU_ACTION_EVENT,
  PET_MENU_ACTIVITY_EVENT,
  PET_MENU_LAYOUT_EVENT,
} from "../windows/menu/types";
export type { PetMenuAction, PetMenuPayload } from "../windows/menu/types";

export {
  PET_CHAT_SHOW_EVENT,
  PET_CHAT_HIDE_EVENT,
  PET_CHAT_ACTIVITY_EVENT,
  PET_CHAT_CLOSE_REQ_EVENT,
  PET_CHAT_REPLY_EVENT,
  PET_CHAT_OPEN_STATE_EVENT,
} from "../windows/chat/types";
export type {
  PetChatShowPayload,
  PetChatOpenStatePayload,
} from "../windows/chat/types";

export {
  SKY_WEATHER_FIRE_EVENT,
  SKY_WEATHER_REFRESH_EVENT,
} from "../data/skyWeather";
export type { SkyWeatherFirePayload } from "../data/skyWeather";

/** 事件名清单（审计 / 文档用）。 */
export const PET_EVENT_CATALOG = [
  "pet://settings-changed",
  "pet://locale-changed",
  "pet://intro",
  "pet://clear-cache",
  "pet://suspend",
  "pet://resume",
  "pet://play-motion",
  "pet://open-settings",
  "pet://bubble-show",
  "pet://bubble-hide",
  "pet://bubble-pong",
  "pet://menu-show",
  "pet://menu-hide",
  "pet://menu-action",
  "pet://menu-activity",
  "pet://menu-layout",
  "pet://chat-show",
  "pet://chat-hide",
  "pet://chat-activity",
  "pet://chat-close-req",
  "pet://chat-reply",
  "pet://chat-open-state",
  "pet://sky-weather-fire",
  "pet://sky-weather-refresh",
] as const;
