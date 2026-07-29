import type { PetToonDecorId } from "../../skins/looks";
import type { ToonPix } from "./types";

/**
 * 光翼：参考机甲光翼——肩部关节向外扇形展开的能量刃片
 * 每侧 4 片（主 / 中 / 支1 / 支2），片间留空，斜向展开而非横条堆叠
 */
export function buildToonLightWing(
  side: "l" | "r",
  accent: string,
  accentSoft: string,
  style: PetToonDecorId | null | undefined
): ToonPix[] {
  const a = accent;
  const s = accentSoft;
  const mir = (x: number) => (side === "l" ? x : 39 - x);
  const out: ToonPix[] = [];
  const put = (x: number, y: number, fill: string, opacity = 1) => {
    out.push({ x: mir(x), y, fill, opacity });
  };
  const hi = "#e8ffff";
  const kind = style || "crystal";

  // 肩关节（小，不粘连翼片）
  put(14, 17, s, 0.75);
  put(13, 17, a, 0.55);

  if (kind === "lantern") {
    // 暖扇：略圆的扇叶，仍斜向展开
    // ① 上主叶
    put(12, 14, a, 0.95);
    put(11, 13, a, 0.95);
    put(10, 12, s, 0.9);
    put(9, 12, a, 0.75);
    put(12, 15, s, 0.9);
    put(11, 14, s, 0.95);
    put(10, 13, a, 0.85);
    put(11, 12, hi, 0.4);
    // ② 中叶（空一格后）
    put(12, 17, a, 0.9);
    put(11, 17, s, 0.9);
    put(10, 16, a, 0.85);
    put(9, 16, s, 0.7);
    put(11, 18, a, 0.7);
    put(10, 17, a, 0.75);
    // ③ 支叶
    put(12, 20, a, 0.75);
    put(11, 20, s, 0.7);
    put(10, 19, a, 0.55);
    // ④ 更小支叶
    put(12, 22, s, 0.55);
    put(11, 22, a, 0.5);
    put(10, 22, s, 0.35);
    return out;
  }

  if (kind === "blossom") {
    // 花瓣：外缘偏软，仍扇形
    // ①
    put(12, 14, s, 0.95);
    put(11, 13, a, 0.9);
    put(10, 12, s, 0.85);
    put(9, 12, a, 0.65);
    put(12, 15, a, 0.9);
    put(11, 14, s, 0.95);
    put(10, 13, a, 0.8);
    put(11, 12, hi, 0.4);
    // ②
    put(12, 17, a, 0.85);
    put(11, 17, s, 0.9);
    put(10, 16, a, 0.8);
    put(9, 16, s, 0.6);
    put(11, 18, a, 0.7);
    put(10, 17, s, 0.7);
    // ③
    put(12, 20, s, 0.7);
    put(11, 20, a, 0.7);
    put(10, 19, s, 0.5);
    // ④
    put(11, 22, a, 0.5);
    put(10, 22, s, 0.45);
    put(10, 23, a, 0.35);
    return out;
  }

  if (kind === "star") {
    // 月牙碎翼：尖端带星光
    // ①
    put(12, 14, a, 0.95);
    put(11, 13, a, 0.95);
    put(10, 12, s, 0.9);
    put(9, 11, a, 0.7);
    put(12, 15, s, 0.85);
    put(11, 14, s, 0.9);
    put(10, 13, a, 0.8);
    put(10, 11, hi, 0.45);
    // ②
    put(12, 17, a, 0.9);
    put(11, 17, a, 0.85);
    put(10, 16, s, 0.8);
    put(9, 15, a, 0.55);
    put(11, 18, s, 0.65);
    // ③ 星尖
    put(12, 20, a, 0.7);
    put(11, 20, hi, 0.55);
    put(10, 19, s, 0.45);
    // ④ 更小星尖
    put(12, 22, s, 0.5);
    put(11, 23, a, 0.45);
    put(10, 22, hi, 0.35);
    return out;
  }

  // crystal 青焰晶：锐利光刃扇形（最接近参考图）
  // ① 最上最长：斜上外展
  put(12, 15, a, 0.95);
  put(11, 14, a, 0.95);
  put(10, 13, a, 0.95);
  put(9, 12, a, 0.9);
  put(8, 11, s, 0.75);
  put(12, 16, s, 0.85);
  put(11, 15, s, 0.95);
  put(10, 14, s, 0.9);
  put(9, 13, a, 0.8);
  put(11, 13, hi, 0.45);
  put(10, 12, hi, 0.4);
  put(8, 12, a, 0.45);
  // ② 中刃：更水平外展（与①隔空）
  put(12, 18, a, 0.9);
  put(11, 18, a, 0.95);
  put(10, 17, a, 0.9);
  put(9, 16, s, 0.85);
  put(8, 16, a, 0.65);
  put(11, 19, s, 0.7);
  put(10, 18, s, 0.8);
  put(9, 17, a, 0.7);
  put(10, 16, hi, 0.35);
  // ③ 支刃：斜下外展
  put(12, 21, a, 0.8);
  put(11, 21, a, 0.85);
  put(10, 20, s, 0.75);
  put(9, 20, a, 0.55);
  put(11, 22, s, 0.55);
  put(10, 21, a, 0.6);
  // ④ 更小支刃：更下、更短
  put(12, 24, s, 0.6);
  put(11, 24, a, 0.65);
  put(10, 23, s, 0.5);
  put(11, 25, a, 0.4);

  return out;
}
