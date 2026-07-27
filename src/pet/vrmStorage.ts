import { appDataDir, join } from "@tauri-apps/api/path";
import { mkdir, readFile, remove, size, writeFile } from "@tauri-apps/plugin-fs";

const PET_VRM_MAX_BYTES = 50 * 1024 * 1024;

const PET_VRM_DIR = "pet-vrm";
const PET_VRM_FILE = "custom.vrm";

type PetVrmImportError = "too_large" | "not_vrm" | "failed";

export class PetVrmImportException extends Error {
  readonly code: PetVrmImportError;
  constructor(code: PetVrmImportError, message?: string) {
    super(message ?? code);
    this.name = "PetVrmImportException";
    this.code = code;
  }
}

let activeBlobUrl: string | null = null;

async function getPetVrmStoragePath(): Promise<string> {
  return join(await appDataDir(), PET_VRM_DIR, PET_VRM_FILE);
}

async function ensurePetVrmDir(): Promise<string> {
  const dir = await join(await appDataDir(), PET_VRM_DIR);
  try {
    await mkdir(dir, { recursive: true });
  } catch {
    // already exists
  }
  return dir;
}

function revokeActiveBlobUrl() {
  if (!activeBlobUrl) return;
  try {
    URL.revokeObjectURL(activeBlobUrl);
  } catch {
    // ignore
  }
  activeBlobUrl = null;
}

function blobUrlFromBytes(data: Uint8Array): string {
  revokeActiveBlobUrl();
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const blob = new Blob([copy], { type: "model/gltf-binary" });
  activeBlobUrl = URL.createObjectURL(blob);
  return activeBlobUrl;
}

async function readSourceBytes(sourcePath: string): Promise<number> {
  return await size(sourcePath);
}

function fileNameFromPath(sourcePath: string): string {
  const parts = sourcePath.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || "custom.vrm";
}

export async function resolvePetVrmSrc(_rev = 0): Promise<string | null> {
  try {
    const path = await getPetVrmStoragePath();
    const data = await readFile(path);
    if (!data.byteLength) return null;
    return blobUrlFromBytes(data);
  } catch (err) {
    console.warn("[pet] resolve vrm src failed", err);
    return null;
  }
}

export async function importPetVrmFromPath(
  sourcePath: string
): Promise<{ name: string; src: string }> {
  const lower = sourcePath.toLowerCase();
  if (!lower.endsWith(".vrm")) {
    throw new PetVrmImportException("not_vrm");
  }

  let bytes = 0;
  try {
    bytes = await readSourceBytes(sourcePath);
  } catch (err) {
    throw new PetVrmImportException(
      "failed",
      err instanceof Error ? err.message : String(err)
    );
  }
  if (bytes > PET_VRM_MAX_BYTES) {
    throw new PetVrmImportException("too_large");
  }

  await ensurePetVrmDir();
  const dest = await getPetVrmStoragePath();

  let data: Uint8Array;
  try {
    data = await readFile(sourcePath);
    if (data.byteLength > PET_VRM_MAX_BYTES) {
      throw new PetVrmImportException("too_large");
    }
    await writeFile(dest, data);
  } catch (err) {
    if (err instanceof PetVrmImportException) throw err;
    console.warn("[pet] vrm import failed", sourcePath, err);
    throw new PetVrmImportException(
      "failed",
      err instanceof Error ? err.message : String(err)
    );
  }

  const name = fileNameFromPath(sourcePath);

  return { name, src: blobUrlFromBytes(data) };
}

export async function clearPetVrmFile(): Promise<void> {
  revokeActiveBlobUrl();
  try {
    const path = await getPetVrmStoragePath();
    await remove(path);
  } catch {
    // ignore missing
  }
}

export function isPetVrmReady(settings: {
  modelKind: string;
  vrmModelName?: string;
}): boolean {
  if (settings.modelKind !== "vrm") return true;
  return Boolean(settings.vrmModelName?.trim());
}
