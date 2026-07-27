export type PetPersonality = "sunny" | "shy" | "cool" | "fiery";

export function isPetPersonality(value: unknown): value is PetPersonality {
  return (
    value === "sunny" ||
    value === "shy" ||
    value === "cool" ||
    value === "fiery"
  );
}

function stripTrailingFlavor(text: string): string {
  return text
    .replace(/[～~!！。.…呢嘛呀哦啦吧啊哼切欸喂]+$/u, "")
    .trimEnd();
}

const ZH_END: Record<PetPersonality, string[]> = {
  sunny: ["～", "！", "呀～", "哦！", "嘿！", "耶！"],
  shy: ["……", "呢……", "嘛……", "……啦", "呢", "……好吗"],
  cool: ["。", "……", "。", "罢了。", "即可。"],
  fiery: ["！", "啊？！", "哼！", "！切。", "烦死了！", "听见没！"],
};

const ZH_PREFIX: Record<PetPersonality, string[]> = {
  sunny: ["", "嘿嘿，", "呀，", "好耶，", ""],
  shy: ["", "那个……", "嗯……", "对、对不起，", "我……"],
  cool: ["", "……", "呵，", "行吧，", ""],
  fiery: ["", "喂，", "哈？", "啧，", "说你呢，"],
};

const EN_END: Record<PetPersonality, string[]> = {
  sunny: ["!", "~", "!!", "!"],
  shy: ["...", "...", "~", "..."],
  cool: [".", "...", ".", "."],
  fiery: ["!", "?!", " Hmph!", "!", "—now!"],
};

const EN_PREFIX: Record<PetPersonality, string[]> = {
  sunny: ["", "Hehe, ", "Yay— ", ""],
  shy: ["", "Um... ", "I... ", ""],
  cool: ["", "...", "Hmph. ", ""],
  fiery: ["", "Hey— ", "What? ", "Tch. "],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function flavorPetLine(
  line: string,
  personality: PetPersonality,
  lang: "zh" | "en" = "zh"
): string {
  const base = stripTrailingFlavor(line);
  if (!base) return line;

  if (lang === "zh") {
    const prefix = pick(ZH_PREFIX[personality]);
    const end = pick(ZH_END[personality]);
    if (personality === "cool" && base.length > 18 && Math.random() < 0.35) {
      return `${prefix}${base.slice(0, 14)}……${end}`;
    }
    if (personality === "fiery" && Math.random() < 0.25) {
      return `${prefix}${base}${end}听见没！`;
    }
    if (personality === "shy" && Math.random() < 0.3) {
      return `${prefix}${base}……就这样。`;
    }
    return `${prefix}${base}${end}`;
  }

  const prefix = pick(EN_PREFIX[personality]);
  const end = pick(EN_END[personality]);
  return `${prefix}${base}${end}`;
}
