import type { CustomVrmMotion } from "../customVrmMotions";
import { normalizeCustomVrmMotions } from "../customVrmMotions";

/** Per-character extension bags — only the owning character uses them */
export interface VrmCharacterExtension {
  customMotions: CustomVrmMotion[];
  modelName: string;
  modelRev: number;
}

export interface CharacterExtensions {
  vrm?: VrmCharacterExtension;
}

export function emptyVrmExtension(): VrmCharacterExtension {
  return { customMotions: [], modelName: "", modelRev: 0 };
}

export function normalizeVrmExtension(
  raw: Partial<VrmCharacterExtension> | null | undefined
): VrmCharacterExtension {
  return {
    customMotions: normalizeCustomVrmMotions(raw?.customMotions),
    modelName: typeof raw?.modelName === "string" ? raw.modelName.trim() : "",
    modelRev: Math.max(0, Math.floor(Number(raw?.modelRev ?? 0) || 0)),
  };
}

export function normalizeExtensions(
  raw: Partial<CharacterExtensions> | null | undefined
): CharacterExtensions {
  if (!raw || typeof raw !== "object") return {};
  const out: CharacterExtensions = {};
  if (raw.vrm) out.vrm = normalizeVrmExtension(raw.vrm);
  return out;
}
