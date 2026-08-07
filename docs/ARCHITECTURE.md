# Desktop Pet 架构

本文说明模块划分与代码落点，供开发查阅。运行时状态约定见 [`STATE.md`](./STATE.md)；发版前手测见 [`GOLDEN_PATHS.md`](./GOLDEN_PATHS.md)。

## 概述

本项目基于 Tauri 多 WebView：桌宠窗口常驻；气泡、菜单、聊天为子窗口；设置页为独立入口。表现与陪伴逻辑位于前端；窗口、托盘、传感、TTS、文件系统等位于 Rust。

## 目录结构

```
src/settings/          # 设置页（modules + composables + components）
src/theme/             # Theme Pack：types / registry / packs / 壁纸与开机 / 自定义标题栏
src/pet/
  windows/             # WebView 壳：pet / bubble / menu / chat；shared/ 浮层避让等跨壳几何
  runtime/             # createPetHost 接线与 use* 行为；精确命中桥 petHitBridge
  characters/          # 角色包、台词 JSON、capabilities
  content/
    shell/             # 桌宠窗 bob
    motion/            # idle 目录、播放器、拖尾等
    dialogue/          # 选句、性格（personality）、口头禅等
  data/
    settings/          # normalize / profiles / io / defaults
    …                  # store、types、deskWeather / skyWeather 等子域、vrm 等
  chat/                # 陪聊领域（ai / providers），不含窗口壳
  bridge/              # Tauri invoke 薄封装；窗几何 sizes / windowAnchor；主窗边框 windowChrome
  events/              # 跨窗事件名索引
  models/              # toon / chip / fig-sci / preview / trail / vrm
  skins/               # look 表与文案
src-tauri/             # 窗口、托盘、USB、工位气象传感、窗外气象拉取、TTS、FS
```

## 常见入口

| 改动目标 | 建议入口 |
| --- | --- |
| 点击、拖拽、睡眠、说话 | `runtime/createPetHost.ts` → 对应 `usePet*` |
| 精确命中 / 空白穿透 | `runtime/petHitBridge` + `models/<包>/*Hit`（仅桌宠窗 `isPetHitHostWindow` 注册） |
| 气泡 / 菜单共存避让 | `windows/shared/floatOverlayRects` ← bubble / menu `window.ts` |
| 气泡 / 菜单 / 聊天 UI | `windows/<名>/` |
| 台词文案 | `characters/lines/data/*.json` |
| 形象表现 | `characters/<id>.ts` + `models/<包>/` |
| 设置表单项 | `settings/modules/` + `composables/` |
| Theme Pack / 壁纸 / 开机动画 | `src/theme/` + `settings/modules/AppPanel` 等 |
| 设置主窗标题栏（跟主题） | `theme/ThemeTitleBar.vue` + `titlebar.css`；主窗 `decorations: false`；边框 `bridge/windowChrome` → Rust `titlebar` |
| 系统能力 | `src-tauri` + `bridge/`（invoke 与窗几何助手；桥内勿塞业务调度） |

典型点击链路：`PetApp` → host / shell → `playMotionOnce` / `speak*` → mood 经 `applyMood`；随机 idle 与聊天暂停经 `dispatchPetHostIntent`。

## 依赖方向

上层模块不得依赖下层运行时：

```
data/types
  ↑ content（motion / shell / dialogue 等）
  ↑ characters
  ↑ data/settings
  ↑ runtime / windows / settings UI / theme

chat → content、data 类型
bridge → data 类型 + Tauri
```

约束：

- `content/motion`、`content/shell`、`content/dialogue`（含 `personality.ts`）不得 import `characters`（能力表与 idle 表由调用方注入）。
- 台词编排（`lines` / `intro` / `catchphrases`）可读 `characters/lines`。
- `data/types` 不得 import `characters`；默认档案位于 `settings/defaults.ts`。
- `content` / `data` 不得 import Vue 窗口或 runtime。

## 术语

| 词 | 含义 |
| --- | --- |
| look | 外观（`lookId`、色板、立绘） |
| theme / Theme Pack | 设置页视觉包（`src/theme/`：`theme.style` + packs + 可选壁纸/开机；主窗自定义标题栏 `ThemeTitleBar`） |
| personality | 台词口味（sunny / shy / cool / fiery）；实现于 `content/dialogue/personality.ts` |

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

细则见 `.cursor/rules/coding.mdc`（角色与动作）。

## 形象代码位置

| 块 | 位置 |
| --- | --- |
| Shell bob | `content/shell/`；`PetApp` 通过 `resolvePetShellBobAnimation` 设置，避免按 idle 堆叠 CSS 选择器 |
| Toon / Chip / Fig / Trail / VRM / Preview | 各自 `models/<包>/` |

## 设置页

- 接线：`createPetSettingsPageRuntime.ts`；`usePetSettingsPage` 仅负责挂载并返回 view。
- 新增 tab：`registerSettingsModule`，并补充所需 composable / `modules/*.vue`。
- 传感类设置（如工位气象）：配置位于 `data/<名>.ts` 并挂入 `PetSettings`；阈值与轮询位于 `runtime/`；`bridge` 仅负责 invoke（含跨窗共享的焦点线程租约 acquire / release）。
- 窗外天气（`skyWeather`，≠ 工位气象）：配置/映射 `data/skyWeather.ts`（含 `enableOnPet` / `bgOpacity` / `hideableOnPet` / `hideEffectOnPet`）；调度 `runtime/skyWeatherScheduler`；跟随系统 `runtime/skyWeatherSystemRegion`；网络同步 `runtime/skyWeatherSync`（**须 `linkMode===online`**）；联网编排 `runtime/skyWeatherLinkController`；会话 `useSkyWeatherSession`；设置预览 `useSkyWeatherPreview`（`enableOnPet` 关时为 tick leader；左侧预览**始终**显示联网探测状态+刷新，≠ `linkMode` 天气系统在线/离线）；桌宠投射 `runtime/useSkyWeatherPetBackdrop` + `runtime/usePetSkySurface`（显隐 phase）+ `PetApp` 挂 `HeroWindowWorld`（`enableOnPet` 开时为 tick leader；桌宠 HWND **固定窗景画布** `bridge/sizes.petWindowSize`，开关只做显隐动效、不 `setSize`；zoom/换模改尺寸走 `bridge/windowAnchor.setWindowSizeKeepCenter` 钉中心；设置预览镜像；飞行物经 `SKY_WEATHER_FIRE_EVENT`；可隐藏时拖拽/飞行/peek 按 `hideEffectOnPet` 收起；动效 CSS `windows/pet/petSkySurface.css`）；**窗景 tab**（`sky` / `SkyWeatherPanel`）上段投射/透明度/可隐藏/动效，下段天色天气；右键菜单应用组仍可快速开关投射；模式切换 `skyWeatherModeOps`；真气象 `bridge/skyWeather` → Rust；窗景 CSS 在 `models/preview/heroWindowWorld/`。Open-Meteo / 粗定位权限挂 `main.json` 与 `pet.json`（桌宠 leader 时需拉网）。
- 维护类操作：
  - 出厂数据：`data/maintenance.ts`（默认快照来自 `settings/defaults.createFactoryResetSettings`）；设置页负责确认框、进度 Modal、表单 hydrate、窗同步。
  - 清缓存：`runtime/clearRuntimeCaches.ts`（本窗清 + `requestClearPetCache` 广播）；pet host 监听同事件再清一次。
  - 进度口统一为 `onStep(id, run)`：先亮「正在」，再执行 `run`，完成后改文案（设置页 `createMaintenanceLog`）。

## 运行时状态

mood、idle、暂停位等写入约定见 [`STATE.md`](./STATE.md)。跨 host 接线见 `runtime/petHostPorts.ts`。

## 功能扩展落点

| 目标 | 落点 |
| --- | --- |
| 新角色 | `characters/<id>.ts` + lines JSON + Model + 注册表 |
| 新 Theme Pack | `theme/packs/<id>.css` + `theme/types.ts` `THEME_PACK_IDS` + `theme/registry.ts` |
| 设置主窗 chrome | `ThemeTitleBar` / `titlebar.css`；`paintDocumentBackdrop` → 边框 `set_window_border_color` |
| 新 look | `skins/looks.json` + 角色 `lookIds` |
| 新子窗 | `windows/<name>/`，并接入 destroy 链 |
| 新系统能力 | Rust + 薄 `bridge` |
| 出厂 / 清缓存 | `data/maintenance` + `runtime/clearRuntimeCaches`；设置页只接 UI 与窗 |
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
yarn check:pre-commit   # 提交前机械检查；目视清单见 .cursor/rules/commit.mdc
```

手测清单见 [`GOLDEN_PATHS.md`](./GOLDEN_PATHS.md)。常用 smoke：`architecture`（目录与注册表）、`petHost`（intent / dispose）、`petHit`（各形象精检）、`floatOverlayRects`（气泡/菜单避让）、`toonPixels`、`playfulPhysics`、`bubblePong`、`deskWeather`、`skyWeather`。

本地示意/试验稿（不入库）放 `tests/local/`，见该目录说明。
