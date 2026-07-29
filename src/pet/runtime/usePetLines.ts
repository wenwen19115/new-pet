import type { PetSettings } from "../data/types";
import type { PetModelKind } from "../skins/types";
import type { PetLinePickOptions } from "../content/dialogue/lines";

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
