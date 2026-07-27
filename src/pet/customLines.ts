export type PetLineScene = "idle" | "tap" | "usb";

export const PET_LINE_SCENES: PetLineScene[] = ["idle", "tap", "usb"];

export interface PetCustomLine {
  id: string;
  text: string;
  scene: PetLineScene;
  enabled: boolean;
}

function isPetLineScene(value: unknown): value is PetLineScene {
  return value === "idle" || value === "tap" || value === "usb";
}

function createCustomLineId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `line:${rand}`;
}

export function createEmptyCustomLine(
  scene: PetLineScene = "idle",
  text = ""
): PetCustomLine {
  return {
    id: createCustomLineId(),
    text: text.trim().slice(0, 120),
    scene,
    enabled: true,
  };
}

function normalizeOne(
  raw: Partial<PetCustomLine> | null | undefined
): PetCustomLine | null {
  if (!raw || typeof raw !== "object") return null;
  const text = typeof raw.text === "string" ? raw.text.slice(0, 120) : "";
  const scene = isPetLineScene(raw.scene) ? raw.scene : "idle";
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim().slice(0, 64)
      : createCustomLineId();
  return {
    id,
    text,
    scene,
    enabled: raw.enabled !== false,
  };
}

/** Accept legacy `string[]` as idle lines */
export function normalizeCustomLines(raw: unknown): PetCustomLine[] {
  if (!Array.isArray(raw)) return [];
  const out: PetCustomLine[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item === "string") {
      const line = normalizeOne({ text: item, scene: "idle", enabled: true });
      if (!line || !line.text.trim() || seen.has(line.id)) continue;
      seen.add(line.id);
      out.push(line);
    } else {
      const line = normalizeOne(item as Partial<PetCustomLine>);
      if (!line || seen.has(line.id)) continue;
      seen.add(line.id);
      out.push(line);
    }
    if (out.length >= 64) break;
  }
  return out;
}

export function enabledCustomLineTexts(
  lines: PetCustomLine[],
  scene: PetLineScene
): string[] {
  return lines
    .filter((l) => l.enabled && l.scene === scene && l.text.trim())
    .map((l) => l.text.trim());
}

export function normalizeDisabledMotions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 64) break;
  }
  return out;
}

export function filterEnabledMotions<T extends string>(
  pool: readonly T[],
  disabledMotions: string[] | undefined
): T[] {
  if (!disabledMotions?.length) return [...pool];
  const disabled = new Set(disabledMotions);
  return pool.filter((m) => !disabled.has(m));
}
