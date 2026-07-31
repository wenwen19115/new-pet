import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import { mkdir, readFile, remove, size, writeFile } from "@tauri-apps/plugin-fs";
import {
  characterSupportsVrmAssets,
  isPetModelKind,
} from "../characters";

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

/** 每 webview 缓存：同 rev 不重复解析出新 URL。 */
let cachedRev = Number.NaN;
let cachedSrc: string | null = null;
/** 旧版 blob URL；升级路径里 revoke。 */
let legacyBlobUrl: string | null = null;

async function getPetVrmStoragePath(): Promise<string> {
  return join(await appDataDir(), PET_VRM_DIR, PET_VRM_FILE);
}

async function ensurePetVrmDir(): Promise<string> {
  const dir = await join(await appDataDir(), PET_VRM_DIR);
  try {
    await mkdir(dir, { recursive: true });
  } catch {
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

/** 仅清内存 src；不动磁盘文件 */
export function clearPetVrmSrcCache(): boolean {
  const hit = cachedSrc != null || legacyBlobUrl != null;
  clearSrcCache();
  return hit;
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
 * 给 GLTFLoader 用 asset URL（避免整文件 blob 进 JS 堆）。
 * convertFileSrc 失败再退回 blob。
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
    const src = fileSrcFromPath(dest);
    cachedSrc = src;
    cachedRev = 0;
    return { name, src };
  } catch (err) {
    console.warn("[pet] convertFileSrc after import failed, blob fallback", err);
    const src = blobSrcFromBytes(data);
    cachedSrc = src;
    cachedRev = 0;
    return { name, src };
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

/** 本地 VRM 文件没了、settings 里还留着名字时用。 */
export function clearedPetVrmMeta(): {
  vrmModelName: "";
  vrmModelRev: 0;
} {
  return { vrmModelName: "", vrmModelRev: 0 };
}

/** 解析具名 VRM 的 src；`stale` 表示 settings 有名但文件不在。 */
export async function resolveNamedPetVrmSrc(
  name: string | undefined,
  rev = 0
): Promise<{ src: string | null; stale: boolean }> {
  if (!name?.trim()) return { src: null, stale: false };
  const src = await resolvePetVrmSrc(rev);
  if (src) return { src, stale: false };
  return { src: null, stale: true };
}

export function isPetVrmReady(settings: {
  modelKind: string;
  vrmModelName?: string;
}): boolean {
  if (
    !isPetModelKind(settings.modelKind) ||
    !characterSupportsVrmAssets(settings.modelKind)
  ) {
    return true;
  }
  return Boolean(settings.vrmModelName?.trim());
}
