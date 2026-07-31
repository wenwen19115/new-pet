# Desktop Pet 架构

本文说明模块划分与代码落点，供开发查阅。运行时状态约定见 [`STATE.md`](./STATE.md)；发版前手测见 [`GOLDEN_PATHS.md`](./GOLDEN_PATHS.md)。

## 概述

本项目基于 Tauri 多 WebView：桌宠窗口常驻；气泡、菜单、聊天为子窗口；设置页为独立入口。表现与陪伴逻辑位于前端；窗口、托盘、传感、TTS、文件系统等位于 Rust。

## 目录结构

```
src/settings/          # 设置页（modules + composables）
src/pet/
  windows/             # WebView 壳：pet / bubble / menu / chat
  runtime/             # createPetHost 接线与 use* 行为
  characters/          # 角色包、台词 JSON、capabilities
  content/
    shell/             # 桌宠窗 bob
    motion/            # idle 目录、播放器、拖尾等
    dialogue/          # 选句、性格、口头禅等
  data/
    settings/          # normalize / profiles / io / defaults
    …                  # store、types、deskWeather 等子域、vrm 等
  chat/                # 陪聊领域（ai / providers），不含窗口壳
  bridge/              # Tauri invoke 薄封装
  events/              # 跨窗事件名索引
  models/              # toon / chip / fig-sci / preview / trail / vrm
  skins/               # look 表与文案
src-tauri/             # 窗口、托盘、USB、工位气象传感、TTS、FS
```

## 常见入口

| 改动目标 | 建议入口 |
| --- | --- |
| 点击、拖拽、睡眠、说话 | `runtime/createPetHost.ts` → 对应 `usePet*` |
| 气泡 / 菜单 / 聊天 UI | `windows/<名>/` |
| 台词文案 | `characters/lines/data/*.json` |
| 形象表现 | `characters/<id>.ts` + `models/<包>/` |
| 设置表单项 | `settings/modules/` + `composables/` |
| 系统能力 | `src-tauri` + `bridge/`（桥内勿放入业务逻辑） |

典型点击链路：`PetApp` → host / shell → `playMotionOnce` / `speak*` → mood 经 `applyMood`；随机 idle 与聊天暂停经 `dispatchPetHostIntent`。

## 依赖方向

上层模块不得依赖下层运行时：

```
data/types
  ↑ content（motion / shell / personality 等）
  ↑ characters
  ↑ data/settings
  ↑ runtime / windows / settings UI

chat → content、data 类型
bridge → data 类型 + Tauri
```

约束：

- `content/motion`、`content/shell`、`personality` 不得 import `characters`（能力表与 idle 表由调用方注入）。
- 台词编排（`lines` / `intro` / `catchphrases`）可读 `characters/lines`。
- `data/types` 不得 import `characters`；默认档案位于 `settings/defaults.ts`。
- `content` / `data` 不得 import Vue 窗口或 runtime。

## 术语

| 词 | 含义 |
| --- | --- |
| look | 外观（`lookId`、色板、立绘） |
| uiTheme | 设置页日/夜主题 |
| personality | 台词口味（sunny / shy / cool / fiery） |

## 角色包

单个角色由 `characters/<id>.ts`、`lines/data/<id>.json` 与 `models/` 中的视图组成。形象列表以 `characters/index.ts` 为准。

常用字段：`capabilities`、`idleMotions` / `demoMotions`、`resolveMotion`、`runtime`（gaze / screenFlight / accents 等）、`view`（Model / bind 等）。

角色特例应通过 `characterHas` 或 capability 表达，避免长驻 `model === "…"` 判断。

### 媒介与动作预算

运行时调度的是**意图**（如无聊互动、躲开、探头）；具体动作由角色表决定，不宜对所有角色套用同一套演出。

| 角色 | 适宜表现 | 不宜强加 |
| --- | --- | --- |
| fig | 窗位移、轻壳、台词 | 画内关节、夸张空翻壳动画 |
| chip | 壳变换、LED、飞窗 | 人形骨骼式表演 |
| toon | 分部位像素、特效、wormhole | 仅靠整窗甩动代替小品 |
| VRM | 骨骼与表情；少做飞窗 | 以整窗杂技作为主表演 |

细则见 `.cursor/rules/pet-character-motion.mdc`。

## 形象代码位置

| 块 | 位置 |
| --- | --- |
| Shell bob | `content/shell/`；`PetApp` 通过 `resolvePetShellBobAnimation` 设置，避免按 idle 堆叠 CSS 选择器 |
| Toon / Chip / Fig / Trail / VRM / Preview | 各自 `models/<包>/` |

## 设置页

- 接线：`createPetSettingsPageRuntime.ts`；`usePetSettingsPage` 仅负责挂载并返回 view。
- 新增 tab：`registerSettingsModule`，并补充所需 composable / `modules/*.vue`。
- 传感类设置（如工位气象）：配置位于 `data/<名>.ts` 并挂入 `PetSettings`；阈值与轮询位于 `runtime/`；`bridge` 仅负责 invoke（含跨窗共享的焦点线程租约 acquire / release）。

## 运行时状态

mood、idle、暂停位等写入约定见 [`STATE.md`](./STATE.md)。跨 host 接线见 `runtime/petHostPorts.ts`。

## 功能扩展落点

| 目标 | 落点 |
| --- | --- |
| 新角色 | `characters/<id>.ts` + lines JSON + Model + 注册表 |
| 新 look | `skins/looks.json` + 角色 `lookIds` |
| 新子窗 | `windows/<name>/`，并接入 destroy 链 |
| 新系统能力 | Rust + 薄 `bridge` |
| 跨 idle / speech 玩法 | `use*` + ports，于 `createPetHost` 接线 |

角色 capability 对照：

| 字段 | 作用 |
| --- | --- |
| `custom-lines` | 自定义台词 |
| `motion-toggle` | 内置动作开关 |
| `look-swatches` | 形象色板 |
| `preview-orbit` | 预览自转 |
| `vrm-upload` / `vrm-bone-editor` | VRM 文件与骨骼编辑 |
| `pixel-fx` | Toon 拖尾等 |
| `shell-sleep-bob` | chip 睡眠呼吸 |
| `runtime.screenFlight` | `fly` / `wormhole` / `none` |
| `runtime.accents` | 口音相关概率（USB 追问、落地动作等） |

## 跨窗事件

事件名索引位于 `src/pet/events/index.ts`；定义仍保留在各 `windows/*/types`、`data/types`、`content/motion`。host 与 App 优先从 `@/pet/events` 引用。

## 存储

- 键：`desktop-pet-settings`
- 形象字段：`lookId`

## 验证

```bash
yarn test
yarn check:pre-commit   # 提交前机械检查；目视清单见 .cursor/rules/pre-commit-checklist.mdc
```

手测清单见 [`GOLDEN_PATHS.md`](./GOLDEN_PATHS.md)。常用 smoke：`architecture`（目录与注册表）、`petHost`（intent / dispose）、`toonPixels`。
