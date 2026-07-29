import type { ToonAnimState } from "../../content/motion/toonAnim";
import type { ToonPix } from "./types";

export function buildToonScenePixels(
  anim: ToonAnimState,
  accent: string,
  accentSoft: string
): ToonPix[] {
  const a = accent;
  const s = accentSoft;
  const green = "#5ecf5a";
  const greenD = "#2f8a36";
  const greenL = "#a6f08a";
  const water = "#4eb8ff";
  const waterD = "#2a7ec8";
  const fire = "#ff5a1a";
  const fireM = "#ff8a28";
  const fireH = "#ffe066";
  const bolt = "#ffe566";
  const cloud = "#e8eef8";
  const cloudD = "#9aa8c0";
  const wood = "#8a5a32";
  const woodD = "#5a3a20";
  switch (anim) {
    case "water":
      return [
        // 水壶壶身
        { x: 3, y: 15, fill: woodD },
        { x: 4, y: 15, fill: wood },
        { x: 5, y: 15, fill: wood },
        { x: 6, y: 15, fill: woodD },
        { x: 3, y: 16, fill: wood },
        { x: 4, y: 16, fill: "#c0d8e8" },
        { x: 5, y: 16, fill: "#a8c8e0" },
        { x: 6, y: 16, fill: wood },
        { x: 3, y: 17, fill: woodD },
        { x: 4, y: 17, fill: wood },
        { x: 5, y: 17, fill: wood },
        { x: 6, y: 17, fill: woodD },
        // 壶嘴
        { x: 7, y: 15, fill: wood },
        { x: 8, y: 14, fill: woodD },
        { x: 9, y: 13, fill: wood },
        // 把手
        { x: 2, y: 15, fill: woodD },
        { x: 2, y: 16, fill: wood },
        { x: 2, y: 17, fill: woodD },
        // 水柱
        { x: 10, y: 14, fill: water },
        { x: 11, y: 15, fill: water },
        { x: 12, y: 17, fill: water, opacity: 0.9 },
        { x: 12, y: 19, fill: water, opacity: 0.75 },
        { x: 13, y: 21, fill: water, opacity: 0.65 },
        { x: 13, y: 23, fill: waterD, opacity: 0.7 },
        // 草丛被浇
        { x: 12, y: 26, fill: greenD },
        { x: 13, y: 24, fill: green },
        { x: 13, y: 25, fill: greenD },
        { x: 14, y: 23, fill: greenL },
        { x: 14, y: 25, fill: green },
        { x: 15, y: 24, fill: green },
        { x: 15, y: 26, fill: greenD },
        { x: 16, y: 25, fill: green },
      ];
    case "grass":
      return [
        // 左草丛（多片叶）
        { x: 4, y: 27, fill: greenD },
        { x: 5, y: 25, fill: green },
        { x: 5, y: 26, fill: greenD },
        { x: 6, y: 23, fill: greenL },
        { x: 6, y: 24, fill: green },
        { x: 6, y: 26, fill: greenD },
        { x: 7, y: 22, fill: green },
        { x: 7, y: 24, fill: greenL },
        { x: 7, y: 25, fill: greenD },
        { x: 8, y: 23, fill: green },
        { x: 8, y: 26, fill: greenD },
        { x: 9, y: 24, fill: greenL },
        { x: 9, y: 25, fill: green },
        // 小花
        { x: 7, y: 21, fill: "#ff7ab8" },
        { x: 6, y: 21, fill: "#ffd060" },
        { x: 8, y: 21, fill: "#ff7ab8" },
        // 右草丛
        { x: 28, y: 27, fill: greenD },
        { x: 29, y: 25, fill: green },
        { x: 29, y: 26, fill: greenD },
        { x: 30, y: 23, fill: greenL },
        { x: 30, y: 24, fill: green },
        { x: 31, y: 22, fill: green },
        { x: 31, y: 25, fill: greenD },
        { x: 32, y: 24, fill: greenL },
        { x: 33, y: 26, fill: greenD },
      ];
    case "fire":
      return [
        // 口喷火焰（近大远小，黄心橙边）
        { x: 13, y: 17, fill: fireH },
        { x: 12, y: 16, fill: fireM },
        { x: 12, y: 17, fill: fireH },
        { x: 12, y: 18, fill: fireM },
        { x: 11, y: 15, fill: fire },
        { x: 11, y: 16, fill: fireH },
        { x: 11, y: 17, fill: fireM },
        { x: 11, y: 18, fill: fire },
        { x: 10, y: 14, fill: fireM },
        { x: 10, y: 15, fill: fireH },
        { x: 10, y: 16, fill: fire },
        { x: 10, y: 17, fill: fireM },
        { x: 9, y: 13, fill: fire },
        { x: 9, y: 14, fill: fireH },
        { x: 9, y: 15, fill: fireM },
        { x: 9, y: 16, fill: fire },
        { x: 8, y: 12, fill: fireM },
        { x: 8, y: 13, fill: fire },
        { x: 8, y: 14, fill: fireH },
        { x: 8, y: 15, fill: fire },
        { x: 7, y: 11, fill: fire },
        { x: 7, y: 12, fill: fireM },
        { x: 7, y: 13, fill: fire },
        { x: 6, y: 10, fill: fireM, opacity: 0.85 },
        { x: 6, y: 11, fill: fire, opacity: 0.9 },
        { x: 5, y: 9, fill: fireH, opacity: 0.7 },
        { x: 5, y: 10, fill: fire, opacity: 0.75 },
        { x: 4, y: 8, fill: fireM, opacity: 0.55 },
      ];
    case "splash":
      return [
        // 水柱
        { x: 13, y: 17, fill: water },
        { x: 12, y: 16, fill: water },
        { x: 12, y: 17, fill: "#b8e8ff" },
        { x: 12, y: 18, fill: water },
        { x: 11, y: 15, fill: waterD },
        { x: 11, y: 16, fill: water },
        { x: 11, y: 17, fill: "#b8e8ff" },
        { x: 11, y: 18, fill: waterD },
        { x: 10, y: 14, fill: water },
        { x: 10, y: 15, fill: "#b8e8ff" },
        { x: 10, y: 16, fill: water },
        { x: 9, y: 13, fill: waterD },
        { x: 9, y: 14, fill: water },
        { x: 8, y: 12, fill: water },
        { x: 8, y: 13, fill: "#b8e8ff" },
        { x: 7, y: 11, fill: water, opacity: 0.85 },
        // 水花
        { x: 6, y: 10, fill: s, opacity: 0.8 },
        { x: 5, y: 12, fill: water, opacity: 0.7 },
        { x: 6, y: 14, fill: water, opacity: 0.65 },
        { x: 7, y: 16, fill: water, opacity: 0.55 },
        { x: 4, y: 15, fill: water, opacity: 0.5 },
        // 地面水洼
        { x: 8, y: 27, fill: waterD, opacity: 0.55 },
        { x: 9, y: 27, fill: water, opacity: 0.6 },
        { x: 10, y: 27, fill: waterD, opacity: 0.5 },
      ];
    case "thunder":
      return [
        { x: 12, y: 4, fill: cloudD },
        { x: 13, y: 3, fill: cloud },
        { x: 14, y: 2, fill: cloud },
        { x: 15, y: 2, fill: cloud },
        { x: 16, y: 1, fill: cloud },
        { x: 17, y: 1, fill: cloud },
        { x: 18, y: 1, fill: cloud },
        { x: 19, y: 1, fill: cloud },
        { x: 20, y: 1, fill: cloud },
        { x: 21, y: 1, fill: cloud },
        { x: 22, y: 2, fill: cloud },
        { x: 23, y: 2, fill: cloud },
        { x: 24, y: 3, fill: cloud },
        { x: 25, y: 4, fill: cloudD },
        { x: 13, y: 4, fill: cloud },
        { x: 14, y: 3, fill: cloudD },
        { x: 15, y: 3, fill: cloud },
        { x: 16, y: 2, fill: cloudD },
        { x: 17, y: 2, fill: cloud },
        { x: 18, y: 2, fill: cloudD },
        { x: 19, y: 2, fill: cloud },
        { x: 20, y: 2, fill: cloudD },
        { x: 21, y: 2, fill: cloud },
        { x: 22, y: 3, fill: cloud },
        { x: 23, y: 3, fill: cloudD },
        { x: 24, y: 4, fill: cloud },
        { x: 14, y: 4, fill: cloudD },
        { x: 15, y: 4, fill: cloud },
        { x: 16, y: 3, fill: cloud },
        { x: 21, y: 3, fill: cloud },
        { x: 22, y: 4, fill: cloudD },
        { x: 19, y: 5, fill: bolt },
        { x: 20, y: 5, fill: bolt },
        { x: 20, y: 6, fill: bolt },
        { x: 19, y: 7, fill: bolt },
        { x: 18, y: 7, fill: bolt },
        { x: 18, y: 8, fill: bolt },
        { x: 17, y: 8, fill: bolt },
        { x: 18, y: 9, fill: bolt },
        { x: 19, y: 9, fill: bolt },
        { x: 19, y: 10, fill: bolt },
        { x: 20, y: 11, fill: bolt },
        { x: 21, y: 11, fill: a },
        { x: 20, y: 12, fill: bolt },
        { x: 19, y: 13, fill: bolt },
        { x: 18, y: 14, fill: a },
      ];
    case "dodge":
      return [
        // 残影剪影（头+身）
        { x: 8, y: 12, fill: a, opacity: 0.35 },
        { x: 9, y: 11, fill: a, opacity: 0.4 },
        { x: 10, y: 11, fill: a, opacity: 0.4 },
        { x: 11, y: 12, fill: a, opacity: 0.35 },
        { x: 8, y: 13, fill: a, opacity: 0.3 },
        { x: 9, y: 13, fill: s, opacity: 0.35 },
        { x: 10, y: 13, fill: s, opacity: 0.35 },
        { x: 11, y: 13, fill: a, opacity: 0.3 },
        { x: 9, y: 14, fill: a, opacity: 0.28 },
        { x: 10, y: 14, fill: a, opacity: 0.28 },
        { x: 8, y: 16, fill: a, opacity: 0.25 },
        { x: 9, y: 15, fill: a, opacity: 0.3 },
        { x: 10, y: 15, fill: a, opacity: 0.3 },
        { x: 11, y: 16, fill: a, opacity: 0.25 },
        { x: 9, y: 17, fill: a, opacity: 0.22 },
        { x: 10, y: 17, fill: a, opacity: 0.22 },
        { x: 9, y: 19, fill: a, opacity: 0.18 },
        { x: 10, y: 19, fill: a, opacity: 0.18 },
        // 速度线
        { x: 5, y: 14, fill: s, opacity: 0.45 },
        { x: 4, y: 15, fill: s, opacity: 0.35 },
        { x: 3, y: 16, fill: s, opacity: 0.25 },
      ];
    default:
      return [];
  }
}
