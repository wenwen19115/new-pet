import type { PetSettings } from "../types";
import type { PetModelKind } from "../skins/types";
import type { PetLinePickOptions } from "../lines";

/** Active character profile → line pick options */
export function linePickOptsFromSettings(
  settings: PetSettings,
  model: PetModelKind
): PetLinePickOptions {
  const profile = settings.profiles[model];
  return {
    customLines: profile?.customLines,
    customLinesOnly: profile?.customLinesOnly,
    disabledBuiltInLines: profile?.disabledBuiltInLines,
    lookId: profile?.lookId ?? settings.lookId,
  };
}
