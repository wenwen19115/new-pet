/** 角色 id。已知 id 在 characters registry；用 isPetModelKind 校验，别在这里写死闭集。 */
export type PetModelKind = string;

/** 外观配色（芯片整套色 / 人形强调色共用） */
export interface PetSkinVisual {
  bodyFrom: string;
  bodyMid: string;
  bodyTo: string;
  dieFrom: string;
  dieMid: string;
  dieTo: string;
  accent: string;
  accentSoft: string;
  packageStroke: string;
  dieStroke: string;
  sideHi: string;
  sideMid: string;
  sideLo: string;
  backGrid: string;
  mark: string;
  ledHue: number;
  /** 人形皮肤底色 */
  skinTone?: string;
  /** 人形发色 */
  hairFrom?: string;
  hairTo?: string;
}

export function resolveNickname(
  custom: string | undefined | null,
  appearance: { defaultNickname: string }
): string {
  const trimmed = (custom ?? "").trim();
  return trimmed || appearance.defaultNickname;
}
