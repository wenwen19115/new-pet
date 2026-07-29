import type { Component } from "vue";
import type { PetModelKind } from "@/pet/skins/types";
import type { PetCapability } from "@/pet/characters";

export interface SettingsModuleContext {
  enabled: boolean;
  modelKind: PetModelKind;
  capabilities: Set<PetCapability>;
  vrmUploaded: boolean;
}

export interface SettingsModule {
  id: string;
  order: number;
  labelKey: string;
  icon: Component;
  panel: Component;
  when?: (ctx: SettingsModuleContext) => boolean;
}

const modules: SettingsModule[] = [];

export function registerSettingsModule(mod: SettingsModule): void {
  const i = modules.findIndex((m) => m.id === mod.id);
  if (i >= 0) modules[i] = mod;
  else modules.push(mod);
}

export function listSettingsModules(
  ctx?: SettingsModuleContext
): SettingsModule[] {
  const sorted = [...modules].sort((a, b) => a.order - b.order);
  if (!ctx) return sorted;
  return sorted.filter((m) => (m.when ? m.when(ctx) : true));
}
