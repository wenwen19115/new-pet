/**
 * 版本号唯一来源：根目录 package.json 的 version。
 * 写入 src-tauri/tauri.conf.json 与 Cargo.toml，避免发版改三处。
 *
 * yarn sync-version
 * （tauri beforeBuild / beforeDev 也会跑）
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const pkgPath = join(root, "package.json");
const version = readJson(pkgPath).version;
if (typeof version !== "string" || !/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`package.json version 无效: ${JSON.stringify(version)}`);
  process.exit(1);
}

const changed = [];

const tauriPath = join(root, "src-tauri", "tauri.conf.json");
const tauri = readJson(tauriPath);
if (tauri.version !== version) {
  tauri.version = version;
  writeFileSync(tauriPath, `${JSON.stringify(tauri, null, 2)}\n`, "utf8");
  changed.push("src-tauri/tauri.conf.json");
}

const cargoPath = join(root, "src-tauri", "Cargo.toml");
const cargo = readFileSync(cargoPath, "utf8");
const cargoNext = cargo.replace(
  /^(\[package\]\r?\n(?:[\s\S]*?\r?\n)?)version = "[^"]*"/m,
  `$1version = "${version}"`
);
if (cargoNext === cargo) {
  if (!/^\[package\]/m.test(cargo) || !/^version = "/m.test(cargo)) {
    console.error("Cargo.toml 找不到 [package] version，请手改格式");
    process.exit(1);
  }
  // 已一致
} else {
  writeFileSync(cargoPath, cargoNext, "utf8");
  changed.push("src-tauri/Cargo.toml");
}

if (changed.length) {
  console.log(`sync-version → ${version}（已写 ${changed.join(", ")}）`);
} else {
  console.log(`sync-version → ${version}（已对齐）`);
}
