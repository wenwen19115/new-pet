import { invoke } from "@tauri-apps/api/core";

export interface SystemStats {
  cpuPercent: number;
  /** Running memory (RAM) used ratio 0–100 */
  memoryPercent: number;
  diskPercent: number;
  networkPercent: number;
}

export async function getSystemStats(): Promise<SystemStats> {
  return (await invoke("get_system_stats")) as SystemStats;
}

export function formatStatPercent(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "—";
  return `${Math.min(100, Math.round(value))}%`;
}
