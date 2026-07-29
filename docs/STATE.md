# Pet runtime 状态所有权

同一条规则只走一个入口，别另开旁路。

| 入口 | 模块 |
| --- | --- |
| idle / 飞行 | `dispatchPetHostIntent`（`petHostIntents.ts`） |
| mood | `applyPetMood` / `createApplyPetMood`（`petHostMood.ts`） |

## 谁写什么

| 状态 | 主写入方 | 备注 |
| --- | --- | --- |
| `mood` | 只经 `applyMood(...)` | 调用方：speech / motion / life / pointer / lifecycle；互斥在 `petHostMood.ts` |
| `speaking` / `lastLine` | `usePetSpeech` | suspend / dispose 由 lifecycle 清 |
| `idleMotion` | `usePetMotionHost` | 视图只读 |
| `isDragging` / gaze / 物理 | `usePetPointerHost` | |
| `chatPausesRandomIdle` | lifecycle ← `chat-open` intent | idle 循环只读 |
| `playfulPausesRandomIdle` | ← `playful-chase` intent | 调皮追逐中停随机 idle |
| `peekPausesRandomIdle` | ← `peek-hide` intent | 躲起来探头中停随机 idle |
| `hostAlive` | `usePetHostLifecycle` | |
| settings 镜像 | `usePetSettingsSync` | 可能再发 `random-idle-setting` |

## mood reason 与互斥

| Reason | 常见调用方 | 门禁 |
| --- | --- | --- |
| `speak` / `chat-reply` | speech / lifecycle | 可盖过 motion mood |
| `motion` | motion host | speaking / dragging / sleep 时挡 |
| `sleep` | life timers | 醒之前粘住 |
| `wake` / `usb-wake` | life / speech | 仅从 sleep 来 |
| `drag-start` | pointer | 置 curious |
| `playful-flee` / `playful-catch` / `playful-miss` | playful host | 躲开 / 抓到 / 超时 |
| `peek-hide` / `peek-reveal` | peek host | 躲起来 / 现身 |
| `speak-end` / `chat-reply-end` | speech / lifecycle | 回 idle（sleep / drag / motion-locked 除外；气泡可能还在） |
| `motion-end` / `drag-end` | motion / pointer | 回 idle（sleep / drag / speaking 除外） |

host 里别写 `mood.value = …`，用 `applyMood(next, reason)`。

## idle / 飞行 intent

| Intent | 效果 |
| --- | --- |
| `chat-open` | 开：停随机 idle + 取消飞行；关：按需恢复（追逐中不恢复） |
| `random-idle-setting` | 开且未 chat/playful 暂停 → schedule；关 → 清 timer |
| `playful-chase` | 开：停随机 idle；关：按需恢复（`rescheduleIdle: false` 只清门禁） |
| `peek-hide` | 开：贴边探头 + 停随机 idle；关：现身并按需恢复 |
| `suspend-runtime` | 清 playful/peek 门禁 + idle timer + 取消飞行（RAF / TTS / webview 仍归 lifecycle） |

## 改动时

1. 新的 idle/飞行横切：加 intent + `dispatchPetHostIntent` + smoke。
2. 新的 mood 写入 / 互斥：改 `petHostMood.ts` + smoke；别直接改 `mood.value`。
3. 别在零散 host 里改 `chatPausesRandomIdle` / idle timer，走 dispatch。
4. 能读现有状态就别再抄一份 boolean。
