import "./themeBase.css";
import "./themePicker.css";
import "./bubbleTheme.css";
import "./packs/ukiyo.css";
import "./packs/construct.css";
import "./packs/arcade.css";
import "./packs/paper.css";
import "./packs/hud.css";
import "./packs/candy.css";
import "./packs/poster.css";
import "./packs/ink.css";
import "./packs/aurora.css";
import "./packs/crt.css";
import "./packs/bauhaus.css";
import "./packs/brass.css";
import "./packs/nord.css";
import "./packs/toon.css";
import "./packs/comic.css";
import "./packs/scifi.css";
import "./packs/manga.css";
import "./packs/pixel.css";
import "./packs/mecha.css";
import "./packs/ghibli.css";
import "./packs/shinkai.css";
import "./packs/vapor.css";
import "./packs/memphis.css";
import "./packs/brutal.css";
import "./packs/stained.css";
import "./packs/celadon.css";
import "./packs/noir.css";
import "./packs/y2k.css";
import "./packs/folk.css";
import "./packs/ice.css";
import "./packs/morocco.css";
import "./packs/india.css";
import "./packs/mexico.css";
import "./packs/egypt.css";
import "./packs/korea.css";
import "./packs/russia.css";
import "./packs/turkey.css";
import "./packs/italy.css";
import "./packs/brazil.css";
import "./packs/arabia.css";
import "./packs/nouveau.css";
import "./packs/deco.css";
import "./packs/swiss.css";
import "./packs/gothic.css";
import "./packs/academia.css";
import "./packs/dunhuang.css";
import "./packs/sancai.css";
import "./packs/papercut.css";
import "./packs/wabi.css";
import "./packs/zen.css";
import "./packs/thai.css";
import "./packs/tibet.css";
import "./packs/delft.css";
import "./packs/greece.css";
import "./packs/azulejo.css";
import "./packs/celtic.css";
import "./packs/viking.css";
import "./packs/aboriginal.css";
import "./packs/solarpunk.css";
import "./packs/lofi.css";
import "./packs/cottage.css";
import "./packs/dune.css";
import "./packs/aqua.css";
import "./packs/sakura.css";

export type {
  PetThemeSettings,
  ThemeBootAnimation,
  ThemeBootDurationMode,
  ThemePack,
  ThemePackId,
  ThemePackMeta,
  ThemePackTokens,
  ThemeStageBackdrop,
  ThemeStageBackdropMode,
  ThemeWallpaperFit,
} from "./types";
export {
  BOOT_ANIM_MAX_SEC,
  BOOT_ANIM_MIN_SEC,
  BUBBLE_OPACITY_DEFAULT,
  BUBBLE_OPACITY_MAX,
  BUBBLE_OPACITY_MIN,
  DEFAULT_PET_THEME_SETTINGS,
  DEFAULT_THEME_BOOT_ANIMATION,
  DEFAULT_THEME_STAGE_BACKDROP,
  THEME_PACK_IDS,
  clampBootDurationSec,
  clampBubbleOpacity,
  clonePetThemeSettings,
  isThemeBootDurationMode,
  isThemePackId,
  isThemeStageBackdropMode,
  isThemeWallpaperFit,
} from "./types";
export { bootRemainMinMs, bootScheduleDelayMs } from "./bootHold";
export {
  getThemePack,
  listThemePacks,
  resolveThemePackId,
} from "./registry";
export { paintDocumentBackdrop, themeRootStyle } from "./applyTheme";
export {
  THEME_MEDIA_EXTENSIONS,
  detectThemeMediaKind,
  themeMediaSrc,
  type ThemeMediaKind,
} from "./media";
export { default as ThemeMediaLayer } from "./ThemeMediaLayer.vue";
export { default as BootSplashBar } from "./BootSplashBar.vue";
export { usePetWindowTheme } from "./usePetWindowTheme";
export {
  validateThemeMediaPath,
  type ThemeMediaFailReason,
  type ThemeMediaValidation,
} from "./validateMedia";
