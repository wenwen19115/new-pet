# Pet runtime 状态

同一类状态只经统一入口写入，请勿另开旁路。实现细节以代码为准；本文仅记录**写入所有权**。

| 入口 | 模块 |
| --- | --- |
| idle / 飞行的暂停与恢复 | `dispatchPetHostIntent`（`petHostIntents.ts`） |
| mood | `applyPetMood` / `createApplyPetMood`（`petHostMood.ts`） |

## 写入方

| 状态 | 主写入方 | 说明 |
| --- | --- | --- |
| `mood` | 仅经 `applyMood(...)` | speech / motion / life / pointer / lifecycle / playful / peek 均通过该入口；互斥逻辑位于 mood 模块 |
| `speaking` / `lastLine` | `usePetSpeech` | suspend / dispose 由 lifecycle 清理 |
| `idleMotion` | `usePetMotionHost` | 视图只读 |
| `isDragging` / gaze / 物理 | `usePetPointerHost` | |
| `chatPausesRandomIdle` | lifecycle ← `chat-open` | idle 循环只读 |
| `playfulPausesRandomIdle` | ← `playful-chase` | 调皮追逐期间暂停随机 idle |
| `peekPausesRandomIdle` | ← `peek-hide` | 躲起来期间暂停随机 idle |
| `hostAlive` | `usePetHostLifecycle` | |
| settings 镜像 | `usePetSettingsSync` | 可能再发 `random-idle-setting`；deskWeather 变更时调用 `refreshDeskWeather` |
| 工位气象 | `usePetDeskWeather`（poll + engine） | bridge 只 invoke（快照 / acquire·release 租约）；冷却在 engine；说话成功后再 commit |
| 窗外天气 | 设置页 `useSkyWeatherPreview` → `useSkyWeatherSession` | 配置在 `PetSettings.skyWeather`；调度在 runtime；真气象 bridge→Rust；只驱动设置预览，≠ 工位气象、不进主窗 |

host 内请勿直接赋值 `mood.value`。

## mood reason（常用）

| Reason | 触发方 | 说明 |
| --- | --- | --- |
| `speak` / `chat-reply` | speech / lifecycle | 可覆盖 motion mood |
| `motion` | motion | speaking / dragging / sleep 时拒绝 |
| `sleep` | life timers | 唤醒前保持粘滞 |
| `wake` / `usb-wake` | life / speech | 仅能从 sleep 转入；USB 后 chip 可按 `usbFollowUpChance` 追加一句 |
| `drag-start` | pointer | curious，并配合开拖台词 |
| `drag-land` | shell（松手后） | happy 余韵；动作概率见 `accents.dragLandMotionChance` |
| `playful-flee` / `catch` / `miss` | playful | 躲开 / 抓到 / 超时；连续未抓中 3 次仅台词嫌弃；菜单「调皮一下」为限时 burst（不写常驻开关） |
| `bubble-pong` | speech ← 气泡窗 | 连点三次进入嫌烦 |
| `desk-weather` | speech ← 工位气象 | curious，并配合角色台词 / 动作 |
| `peek-hide` / `peek-reveal` | peek | 躲起 / 现身 |
| `speak-end` / `chat-reply-end` | speech / lifecycle | 回到 idle（sleep / drag / motion-locked 除外） |
| `motion-end` / `drag-end` | motion / 旧松手路径 | 回到 idle（sleep / drag / speaking 除外） |

## idle / 飞行 intent

| Intent | 效果 |
| --- | --- |
| `chat-open` | 开启：停止随机 idle 并取消飞行；关闭：按条件恢复（追逐中不恢复） |
| `random-idle-setting` | 开启且未被 chat / playful / peek 暂停时 schedule；关闭则清除 timer |
| `playful-chase` | 开启：停止随机 idle；关闭：按条件恢复（`rescheduleIdle: false` 仅清除门禁） |
| `peek-hide` | 开启：贴边探头并停止随机 idle；关闭：现身并按条件恢复 |
| `suspend-runtime` | 清除 playful / peek 门禁、idle timer，并取消飞行（RAF / TTS / webview 仍由 lifecycle 负责） |

## 变更约定

1. 新增 idle / 飞行横切：增加 intent，经 `dispatchPetHostIntent` 分发，并补充 smoke。
2. 新增 mood 写入或互斥：修改 `petHostMood.ts`，并补充 smoke；请勿直接改写 `mood.value`。
3. 请勿在零散 host 中直接修改暂停位或 idle timer，一律经 dispatch。
4. 已有状态可读时，勿再复制一份并行 boolean。
