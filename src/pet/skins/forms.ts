import type { PetModelKind } from "@/pet/skins/types";
import type { LocaleName } from "./localeName";

export interface PetFormDef {
  model: PetModelKind;
  nameKey: string;
  defaultNickname?: LocaleName;
}

export const formChip: PetFormDef = {
  model: "chip",
  nameKey: "pet.modelChip",
  defaultNickname: { zh: "天问7号", en: "Tianwen-7" },
};

export const formFig: PetFormDef = {
  model: "fig-sci",
  nameKey: "pet.modelFig",
  defaultNickname: { zh: "梨宝", en: "Li Bao" },
};

export const formToon: PetFormDef = {
  model: "toon",
  nameKey: "pet.modelToon",
  defaultNickname: { zh: "狐青青", en: "Hu Qingqing" },
};

export const formVrm: PetFormDef = {
  model: "vrm",
  nameKey: "pet.modelVrm",
  defaultNickname: { zh: "酥酥", en: "Susu" },
};
