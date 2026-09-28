/**
 * 提交前机械检查。yarn check:pre-commit
 * 判不了的（注释品味、落点是否「对」）仍靠 .cursor/rules/commit.mdc / coding.mdc
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const failures = [];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "target") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function rel(p) {
  return relative(root, p).replace(/\\/g, "/");
}

function read(p) {
  return readFileSync(p, "utf8");
}

// 1) 临时脚本
const scriptsDir = join(root, "scripts");
if (existsSync(scriptsDir)) {
  for (const name of readdirSync(scriptsDir)) {
    if (/^_/.test(name) || /^fix-/.test(name)) {
      failures.push(`临时脚本未删: scripts/${name}`);
    }
  }
}

const srcFiles = walk(join(root, "src")).filter((p) =>
  /\.(ts|tsx|vue|js|mjs)$/.test(p)
);

const bannedAi = [
  /\bCross-cutting\b/,
  /\bSingle door\b/,
  /\bCanonical\b/,
  /\borchestration\b/i,
  /\bBehavior lives in\b/,
  /\bWhy .+ is changing\b/,
  /\bPrefer .+ over\b/,
  /\bmust not\b/,
  /\bview-facing surface\b/,
  /\bboolean soup\b/,
  /\bPorts bag\b/,
  /\bcontract coverage\b/,
];

for (const file of srcFiles) {
  const text = read(file);
  const r = rel(file);
  const lines = text.split(/\r?\n/);

  // 2) content/data 别反向依赖 windows / runtime
  if (
    (r.startsWith("src/pet/content/") || r.startsWith("src/pet/data/")) &&
    !r.includes(".test.")
  ) {
    if (
      /from\s+["'][^"']*\/(windows|runtime)\//.test(text) ||
      /from\s+["']@\/pet\/(windows|runtime)\//.test(text)
    ) {
      failures.push(`${r}: content/data 不要 import windows/runtime`);
    }
  }

  // 3) motion/shell 别查 characters registry
  if (
    (r.startsWith("src/pet/content/motion/") ||
      r.startsWith("src/pet/content/shell/")) &&
    !r.includes(".test.")
  ) {
    if (/from\s+["'][^"']*characters/.test(text)) {
      failures.push(`${r}: content/motion|shell 不要 import characters`);
    }
  }

  // 4) mood.value = 赋值（排除 ===）；只允许 mood 模块 + host 注入 setMood
  if (
    r.startsWith("src/pet/") &&
    !r.endsWith("petHostMood.ts") &&
    !r.endsWith("createPetHost.ts") &&
    !r.includes(".test.")
  ) {
    lines.forEach((line, i) => {
      if (/^\s*\/\//.test(line)) return;
      if (/mood\.value\s*=(?!=)/.test(line)) {
        failures.push(
          `${r}:${i + 1}: mood 写入走 applyMood/applyPetMood，别直接 mood.value =`
        );
      }
    });
  }
}

// docs 扫 AI 腔（规则文件里有反例，不扫）
for (const file of walk(join(root, "docs"))) {
  if (!/\.md$/.test(file)) continue;
  const text = read(file);
  const r = rel(file);
  for (const re of bannedAi) {
    if (re.test(text)) {
      failures.push(`${r}: 疑似 AI 腔（${re}），见 coding.mdc`);
      break;
    }
  }
}

// 版本号：只认 package.json；另两处必须已被 sync-version 对齐
{
  const pkgVer = JSON.parse(read(join(root, "package.json"))).version;
  const tauriVer = JSON.parse(read(join(root, "src-tauri/tauri.conf.json")))
    .version;
  const cargoMatch = read(join(root, "src-tauri/Cargo.toml")).match(
    /^version = "([^"]+)"/m
  );
  const cargoVer = cargoMatch?.[1];
  if (pkgVer !== tauriVer || pkgVer !== cargoVer) {
    failures.push(
      `版本未对齐: package=${pkgVer} tauri=${tauriVer} cargo=${cargoVer} → 先 yarn sync-version 再暂存`
    );
  }
}

if (failures.length) {
  console.error("pre-commit 检查未过:\n");
  for (const f of failures) console.error(`  - ${f}`);
  console.error("\n清单: .cursor/rules/commit.mdc");
  process.exit(1);
}

console.log("pre-commit 机械检查通过。目视项仍看 commit.mdc / coding.mdc。");
