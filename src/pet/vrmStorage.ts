import { convertFileSrc } from "@tauri-apps/api/core";
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

/** Per-webview cache: avoid re-resolving the same rev into a new URL. */
let cachedRev = Number.NaN;
let cachedSrc: string | null = null;
/** Legacy blob URL from older builds; revoke on upgrade path. */
let legacyBlobUrl: string | null = null;

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

function revokeLegacyBlobUrl() {
  if (!legacyBlobUrl) return;
  try {
    URL.revokeObjectURL(legacyBlobUrl);
  } catch {
    // ignore
  }
  legacyBlobUrl = null;
}

function clearSrcCache() {
  revokeLegacyBlobUrl();
  cachedRev = Number.NaN;
  cachedSrc = null;
}

function fileSrcFromPath(path: string): string {
  revokeLegacyBlobUrl();
  return convertFileSrc(path);
}

function blobSrcFromBytes(data: Uint8Array): string {
  revokeLegacyBlobUrl();
  // Copy: underlying buffer may be a shared Tauri/FS view.
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  legacyBlobUrl = URL.createObjectURL(
    new Blob([copy], { type: "model/gltf-binary" })
  );
  return legacyBlobUrl;
}

function fileNameFromPath(sourcePath: string): string {
  const parts = sourcePath.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || "custom.vrm";
}

/**
 * Resolve VRM for GLTFLoader via asset URL (no full-file blob copy in JS heap).
 * Falls back to blob if convertFileSrc fails.
 */
export async function resolvePetVrmSrc(rev = 0): Promise<string | null> {
  if (cachedSrc != null && cachedRev === rev) return cachedSrc;
  try {
    const path = await getPetVrmStoragePath();
    const bytes = await size(path);
    if (!bytes) {
      clearSrcCache();
      return null;
    }
    try {
      const src = fileSrcFromPath(path);
      cachedSrc = src;
      cachedRev = rev;
      return src;
    } catch (err) {
      console.warn("[pet] convertFileSrc failed, blob fallback", err);
      const data = await readFile(path);
      if (!data.byteLength) {
        clearSrcCache();
        return null;
      }
      cachedSrc = blobSrcFromBytes(data);
      cachedRev = rev;
      return cachedSrc;
    }
  } catch (err) {
    console.warn("[pet] resolve vrm src failed", err);
    clearSrcCache();
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

  await ensurePetVrmDir();
  const dest = await getPetVrmStoragePath();

  let data: Uint8Array;
  try {
    data = await readFile(sourcePath);
  } catch (err) {
    throw new PetVrmImportException(
      "failed",
      err instanceof Error ? err.message : String(err)
    );
  }
  if (data.byteLength > PET_VRM_MAX_BYTES) {
    throw new PetVrmImportException("too_large");
  }

  try {
    await writeFile(dest, data);
  } catch (err) {
    console.warn("[pet] vrm import failed", sourcePath, err);
    throw new PetVrmImportException(
      "failed",
      err instanceof Error ? err.message : String(err)
    );
  }

  clearSrcCache();
  const name = fileNameFromPath(sourcePath);
  try {
    return { name, src: fileSrcFromPath(dest) };
  } catch (err) {
    console.warn("[pet] convertFileSrc after import failed, blob fallback", err);
    return { name, src: blobSrcFromBytes(data) };
  }
}

export async function clearPetVrmFile(): Promise<void> {
  clearSrcCache();
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
