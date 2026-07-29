import type { PetModelKind } from "@/pet/skins/types";

export interface PetFormDef {
  model: PetModelKind;
  nameKey: string;
  defaultNickname?: string;
}

export const formChip: PetFormDef = {
  model: "chip",
  nameKey: "pet.modelChip",
  defaultNickname: "天问7号",
};

export const formFig: PetFormDef = {
  model: "fig-sci",
  nameKey: "pet.modelFig",
  defaultNickname: "梨宝",
};

export const formToon: PetFormDef = {
  model: "toon",
  nameKey: "pet.modelToon",
  defaultNickname: "狐青青",
};

export const formVrm: PetFormDef = {
  model: "vrm",
  nameKey: "pet.modelVrm",
  defaultNickname: "酥酥",
};
