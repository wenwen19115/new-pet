# 黄金路径（发版前手测）

防社死用的，不是刷覆盖率。自动对照：`architecture.smoke.test.ts` / `petHost.smoke.test.ts` / `toonPixels.smoke.test.ts`。

| # | 路径 | 手测要点 | 自动化对照 |
| --- | --- | --- | --- |
| 1 | 启动待机 | 形象出现，chip/toon 有呼吸或 idle-float | shell 表含 `idle-float`；toon palette/body 非空 |
| 2 | 拖拽 | 按下 curious + 惊讶台词，松开落地余韵（fig 常只说话少动作；其他轻动作+一句）再回 idle；无卡死 | mood `drag-start`/`drag-land` + accents |
| 3 | 单击动作 | 播动作 + 可能冒泡/TTS | motion pool / shell 覆盖 chip demo |
| 4 | 随机 idle | 开：过一会儿换动作；关：停 | `random-idle-setting` intent |
| 5 | 聊天开/关 | 打开暂停随机 idle 与飞行；关闭恢复 | `chat-open` intent |
| 6 | 睡眠/唤醒 | 睡眠粘滞；点击或 USB 可醒 | mood `sleep`/`wake` |
| 7 | 切形象 | chip / fig / toon / vrm 可切换且可动 | registry + capabilities |
| 8 | 设置立刻生效 | mute 停 TTS；关 chat 藏窗；randomIdle 即时 | settings sync |
| 9 | 冒泡不挡拖 | 说话时仍可拖宠（产品若如此） | speak 挡 motion mood，不挡 drag |
| 10 | dispose | 关宠/重载无泄漏监听 | lifecycle dispose |
| 11 | 调皮模式 | 开：靠近躲开；躲开落地后短窗口点中算抓到；连空 3 次嫌弃（台词）；peek 只走菜单躲起来 | playful mood + catch window |
| 12 | 躲起来 | 菜单躲起来贴边半截；点露头或「出来」现身；软隐藏后再召唤也清 peek | `peek-hide` intent |

## 用法

- 发版或大改 runtime / 动画前：勾选 1–10。
- 改 mood / intent / shell 表：先跑 `yarn test`，再抽测相关行。
- 改 Toon 像素：跑 toon 快照烟测 + 手测 toon 待机与一两个 `toon-*` 动作。
