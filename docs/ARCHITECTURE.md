# Desktop Pet 架构

## 分层

```
src/settings/          # 设置页：modules + composables + usePetSettingsPage
src/pet/
  windows/             # WebView 壳（pet / bubble / menu / chat）+ shared/
  runtime/             # host 接线（createPetHost + use*）
  characters/          # CharacterDef + lines/ + capabilities
  content/
    shell/             # 桌宠窗 bob 动作表 + keyframes
    motion/            # idle 目录、motionPlayer、toonAnim、自定义 VRM、拖尾
    dialogue/          # 台词、性格、口头禅、自定义台词、intro
  data/
    settings/          # normalize / profiles / io / defaults
    …                  # store / types / 设置子域（deskWeather）/ extensions（角色）/ vrm
  chat/
    ai/                # askPetChatAi + localReply + remote
    providers / history
  bridge/              # Tauri/系统薄封装（tts、usb、deskWeather、sizes、host…）
  events/              # 跨窗事件名索引（定义仍在各自 types / motions）
  models/              # toon/ chip/ fig-sci/ preview/ trail/ vrm/
  skins/               # look 注册表 + 表单文案
src-tauri/             # 窗口/托盘、串口/USB、工位气象传感、TTS、FS、进程生命周期
```

## 依赖方向（只向下）

```
data/types（纯类型 / 事件常量）
  ↑
content（motion / shell / personality 类型与纯函数）
  ↑
characters（注册表 + 角色包；可读 content）
  ↑
data/settings（含 defaults）← 也可读 content / chat
  ↑
runtime / windows / settings UI

chat → content / data 类型
bridge → data 类型 + Tauri
```

注意：

- `content/motion`、`content/shell`、`content/dialogue/personality` 不要 import `characters`（能力/idle 表由调用方注入）。
- `content/dialogue` 的台词编排（`lines` / `intro` / `catchphrases`）可读 `characters/lines`。
- `data/types` 不要 import `characters`；默认档案在 `data/settings/defaults.ts`。
- `content` / `data` 不要 import Vue 窗口或 runtime host。

## 命名

| 词 | 含义 |
| --- | --- |
| 形象 look | 外观（`lookId`、色板、fig 立绘） |
| UI theme | 设置页日/夜（`uiTheme`） |
| 性格 personality | 台词口味（sunny / shy / cool / fiery） |

## 角色包（`characters/<id>.ts`）

- `capabilities`：功能开关（用这个，别写长驻 `model ===`）
- `demoMotions` / `idleMotions` / `resolveMotion`
- `defaults`：lookId、demoMotion、可选 `buildExtensions`
- `lookIds`：来自 `skins/looks.json`
- `size` / `previewHintKey` / `appearance`
- `lines`：`characters/lines/data/<id>.json`
- `runtime`：gaze / screenFlight / tickLeds / tapFallbackMotion
- `view`：`shell` / `previewPad` / `Model` / `bindRuntime` / `bindPreview`

形象列表只认 `characters/index.ts`，用 `isPetModelKind` 校验。
VRM 文件 / 自定义动作走 `characterHas(id, "vrm-upload")`，别写死 `"vrm"`。

## 形象与动作包

| 块 | 位置 |
| --- | --- |
| Shell bob | `content/shell/petShellMotions.ts` + `.css`；chip 专用行用 `onlyModels`；睡眠呼吸看 `shell-sleep-bob`。`PetApp.vue` 用 `resolvePetShellBobAnimation` 设 `animation`，别再写 per-idle CSS 选择器 |
| Toon | `models/toon/`（像素 `*.ts` + `PetToonModel.vue` + css） |
| Chip | `models/chip/` |
| Fig | `models/fig-sci/` |
| Trail | `models/trail/` |
| VRM | `models/vrm/`（含 bone editor） |
| Preview | `models/preview/` |

## 运行时状态

见 [`STATE.md`](./STATE.md)。idle / 飞行走 `dispatchPetHostIntent`；mood 走 `applyPetMood`；跨 host 接线看 `runtime/petHostPorts.ts`。

手测：[`GOLDEN_PATHS.md`](./GOLDEN_PATHS.md)。自动：`yarn test`（`*.smoke.test.ts`）。

## 加角色时核对

| Capability / 字段 | 作用 |
| --- | --- |
| `custom-lines` | LookPanel 自定义台词 |
| `motion-toggle` | MotionPanel 内置动作开关 |
| `look-swatches` | CompanionPanel 形象色板 |
| `preview-orbit` | 设置预览自动转 |
| `vrm-upload` / `vrm-bone-editor` | VRM 文件 + 骨骼编辑 |
| `pixel-fx` | Toon 拖尾 / 像素特效 |
| `shell-sleep-bob` | chip 睡眠呼吸 bob |
| `lookIds` | 可用 look（空 = 无色板） |
| `runtime.screenFlight` | `fly` \| `wormhole` \| `none` |
| `runtime.tickLeds` | 引脚灯 |
| `runtime.gaze` | 跟鼠标强度 |
| `lines.motionLines` | 动作台词 |

## 扩展落点

| 目标 | 位置 |
| --- | --- |
| 新角色 | `characters/<id>.ts` + `lines/data/<id>.json` + Model + 注册表 |
| 新 look | `skins/looks.json` + 角色 `lookIds` |
| 新设置页 tab | `registerSettingsModule` + 需要的 composables |
| 聊天窗会话 | `windows/chat/useChatWindowSession.ts`（壳留在 ChatApp） |
| 新子窗 | `windows/<name>/{App,window,types,main,html}` + destroy 链 |
| 新系统能力 | `src-tauri` + `bridge` 薄封装 |
| 设置子域（传感/阈值类） | `data/<名>.ts`（类型+默认+normalize）→ `PetSettings` 挂字段 → settings UI；别塞进 `extensions`（那是角色扩展） |
| 跨 idle/speech | 对应 `use*` + ports；在 `createPetHost` 接线 |

## 跨窗事件

索引：`src/pet/events/index.ts`（定义仍在 `windows/*/types`、`data/types`、`content/motion/motions`）。host / App 优先从 `@/pet/events` 引事件名。

## Smoke

```bash
yarn test
```

- `architecture.smoke.test.ts`：事件目录、注册表、VRM capability、ports 空实现
- `runtime/petHost.smoke.test.ts`：intent、dispose、settings→idle、chat-open 暂停

## 存储

- 键：`desktop-pet-settings`
- 形象字段：`lookId`
- 旧键 `wheat-esp-pet-*` 只读一次迁移，不再写回
