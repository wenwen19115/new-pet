import type { PetPersonality } from "../../personality";
import type {
  CharacterLineBundle,
  LineLangPack,
  PersonalityPolish,
  UsbLineTemplates,
} from "../lineTypes";

export const SHARED_CARE: LineLangPack = {
  zh: [
    "喝口水吧，嘴巴别只用来叹气。",
    "抬抬头，让颈椎透透气。",
    "远眺二十秒：眼睛保养小程序已启动。",
    "站起来走两步，血液循环会感谢你。",
    "该眨眼了。真的，现在就眨。",
    "适当休息不是偷懒，是续航策略。",
    "肩膀往下沉一点……对，别端着。",
  ],
  en: [
    "Drink water. Sighing doesn't hydrate.",
    "Lift your chin. Give the neck some air.",
    "Look afar for twenty seconds. Eye care routine.",
    "Stand and walk two steps. Circulation thanks you.",
    "Blink. Really. Now.",
    "Rest isn't laziness. It's battery strategy.",
    "Drop your shoulders… yes, like that.",
  ],
};

export const SHARED_USB: UsbLineTemplates = {
  addedOne: {
    zh: "发现新 USB 设备：{added}",
    en: "New USB device: {added}",
  },
  addedMany: {
    zh: "发现新 USB 设备：{added}",
    en: "New USB devices: {added}",
  },
  emptyTail: {
    zh: "目前列表是空的。",
    en: "No devices listed right now.",
  },
  listHeader: {
    zh: "目前有：",
    en: "Currently:",
  },
  bullet: {
    zh: "· {item}",
    en: "· {item}",
  },
};

export const SHARED_CATCHPHRASE_FALLBACK: LineLangPack = {
  zh: ["你好呀"],
  en: ["Hi there"],
};

export const SHARED_POLISH: Record<PetPersonality, PersonalityPolish> = {
  sunny: {
    prefix: {
      zh: ["", "嘿嘿，", "呀，", "好耶，", ""],
      en: ["", "Hehe, ", "Yay— ", ""],
    },
    end: {
      zh: ["～", "！", "呀～", "哦！", "嘿！", "耶！"],
      en: ["!", "~", "!!", "!"],
    },
  },
  shy: {
    prefix: {
      zh: ["", "那个……", "嗯……", "对、对不起，", "我……"],
      en: ["", "Um... ", "I... ", ""],
    },
    end: {
      zh: ["……", "呢……", "嘛……", "……啦", "呢", "……好吗"],
      en: ["...", "...", "~", "..."],
    },
    extraSuffix: {
      zh: ["……就这样。"],
      en: ["...that's all."],
    },
    extraSuffixChance: 0.3,
  },
  cool: {
    prefix: {
      zh: ["", "……", "呵，", "行吧，", ""],
      en: ["", "...", "Hmph. ", ""],
    },
    end: {
      zh: ["。", "……", "。", "罢了。", "即可。"],
      en: [".", "...", ".", "."],
    },
    truncateLong: {
      minLen: 18,
      keep: 14,
      chance: 0.35,
      ellipsis: { zh: "……", en: "..." },
    },
  },
  fiery: {
    prefix: {
      zh: ["", "喂，", "哈？", "啧，", "说你呢，"],
      en: ["", "Hey— ", "What? ", "Tch. "],
    },
    end: {
      zh: ["！", "啊？！", "哼！", "！切。", "烦死了！", "听见没！"],
      en: ["!", "?!", " Hmph!", "!", "—now!"],
    },
    extraSuffix: {
      zh: ["听见没！"],
      en: [" Hear me?!"],
    },
    extraSuffixChance: 0.25,
  },
};

export function resolveCare(pack: CharacterLineBundle): LineLangPack {
  return pack.care ?? SHARED_CARE;
}

export function resolveUsb(pack: CharacterLineBundle): UsbLineTemplates {
  return pack.usb ?? SHARED_USB;
}

export function resolvePolish(
  pack: CharacterLineBundle,
  personality: PetPersonality
): PersonalityPolish {
  return pack.polish?.[personality] ?? SHARED_POLISH[personality];
}
