# 新宠 / new-pet

独立桌宠工程（品牌名：新宠；技术标识：new-pet）。桌面壳为 **Tauri 2**（Rust 后端 + Vue 3 前端），多 WebView 窗口（桌宠 / 气泡 / 菜单 / 聊天 / 设置）。

## 功能

- 设置页 Theme Pack（`src/theme/`：`THEME_PACK_IDS` 现约 64 包 + 可选壁纸 / 开机动画）
- 启动入场动画 + 像素宠图标
- 右键桌宠：表演一个 / 调皮一下 / 打开设置 / 置顶 / 躲起来
- 乐心（VRM）自定义动作：命名、设计、加入随机池
- Edge 神经语音播报（需联网）
- 右键菜单 AI 聊天：DeepSeek（需 API Key）或仅本地陪聊；失败显示错误并可重试（不会静默换成随机句）
- 聊天记录本机持久化：按角色（modelKind）分桶；聊天窗最多显示最近 50 条；完整记录在设置 → AI 聊天（可按日期/关键词查找、删单条、清除当前角色、导出）；每角色软上限 2000 条
- AI 服务商 / 模型 / Key：按角色独立保存（换角色各自配置）

## 环境要求

| 项 | 说明 |
| --- | --- |
| 系统 | **Windows 10/11**（当前安装包为 NSIS；开发机亦以 Windows 为主） |
| Node.js | **18+**（建议 LTS） |
| 包管理 | **Yarn 1.x**（仓库脚本按 Yarn 编写） |
| Rust | **stable**（[rustup](https://rustup.rs/) 安装即可） |
| C++ 构建链 | **Visual Studio Build Tools** 或 VS 2022，勾选「使用 C++ 的桌面开发」/ MSVC（编译 `src-tauri` 必需） |
| WebView2 | 运行时依赖；安装包配置为 **embedBootstrapper**，打包时会引导安装 |

可选（仅改精灵表资源时）：`sharp` 已列为 devDependency，配合 `scripts/*` 做 atlas 抠图 / 对齐（见下文）。

## 环境搭建

1. **克隆仓库**

   ```bash
   git clone <仓库地址>
   cd desktop-pet
   ```

2. **安装 Node 依赖**

   ```bash
   yarn
   ```

3. **确认 Rust 可用**

   ```bash
   rustc --version
   cargo --version
   ```

   若未安装，执行 `rustup` 默认安装 stable 工具链。

4. **首次编译**

   第一次执行 `yarn tauri dev` 或 `yarn tauri build` 会拉取并编译 Rust 依赖，耗时较长属正常现象。

## 开发

**推荐：完整桌面应用（前端 + Rust）**

```bash
yarn tauri dev
```

- Vite 开发服：**http://localhost:1421**（见 `src-tauri/tauri.conf.json` 的 `devUrl`）
- 会同时启动设置窗等 Tauri 窗口；改 Vue/TS 热更新，改 Rust 需重新编译。

**仅前端（不连原生壳，调试 UI 时用）**

```bash
yarn dev
```

端口同样为 **1421**；无法调用 Tauri invoke / 多窗行为，适合纯页面逻辑。

## 验证与检查

改代码后建议至少跑：

```bash
yarn test                  # Vitest smoke（architecture / petHost / 各子域等）
yarn vue-tsc --noEmit      # Vue + TS 类型检查（build 脚本也会跑）
yarn check:pre-commit      # 提交前机械检查（落点/禁 import 等）
```

发版前手测清单见 [`docs/GOLDEN_PATHS.md`](docs/GOLDEN_PATHS.md)。目录与状态约定见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)、[`docs/STATE.md`](docs/STATE.md)。

## 编译与打包

**仅构建前端静态资源**（产物在 `dist/`，供 Tauri 打包引用）：

```bash
yarn build
```

等价于 `vue-tsc --noEmit && vite build`。

**Windows 安装包（NSIS）**

```bash
yarn tauri build --bundles nsis
```

- 会先执行 `yarn build`，再编译 Release 二进制并打 NSIS。
- 安装包通常在 `src-tauri/target/release/bundle/nsis/` 下（具体文件名随版本号变化）。
- 产物名：**新宠**（`productName`）；可执行文件：**new-pet**（`mainBinaryName`）。

## 精灵表资源（可选）

维护 Codex 8×9 桌宠 atlas（如 `src/pet/assets/pets/mug-cat/`）时，可使用 `scripts/` 下 Node 脚本（依赖 `sharp`）：

```bash
# 品红底 sheet → 透明 PNG（需自备原始图目录，文件名为 <id>-magenta.png）
set PET_SHEET_SRC=D:\path\to\raw-sheets
node scripts/key-magenta-sheets.mjs

node scripts/defringe-sheets.mjs
node scripts/anchor-atlas-frames.mjs
node scripts/measure-atlas-drift.mjs
```

路径以仓库内 `src/pet/assets/pets` 为默认输出根（见 `scripts/petAssetsRoot.mjs`）。本地 Python 工具链若放在 `.tools/`，已 gitignore，勿提交。
