# 黄金路径（发版前手测）

发版前回归清单，用于覆盖关键用户路径，而非追求测试覆盖率。代码改动后应先执行 `yarn test`，再按相关条目手测。

自动化对照（`yarn test`）：`architecture.smoke.test.ts`、`petHost.smoke.test.ts`、`toonPixels.smoke.test.ts`、`deskWeather.smoke.test.ts`、`skyWeather.smoke.test.ts`、`previewFit.smoke.test.ts`、`playfulPhysics.smoke.test.ts`、`bubblePong.smoke.test.ts`、`moyuDay.smoke.test.ts`。

| # | 路径 | 手测要点 | 自动化对照 |
| --- | --- | --- | --- |
| 1 | 启动待机 | 形象正常出现；chip / toon 具备呼吸或 idle-float | shell 含 `idle-float`；toon 像素非空 |
| 2 | 拖拽 | 按下进入 curious 并有惊讶台词；松手有落地余韵（fig 常以台词为主）；随后回到 idle，无卡死 | `drag-start` / `drag-land` |
| 3 | 单击 | 播放动作，可能伴随冒泡 / TTS | motion / shell |
| 4 | 随机 idle | 开启后一段时间切换动作；关闭后停止 | `random-idle-setting` |
| 5 | 聊天开/关 | 聊天打开时暂停随机 idle 与飞行；关闭后恢复 | `chat-open` |
| 6 | 睡眠/唤醒 | 睡眠状态粘滞；点击或 USB 可唤醒 | `sleep` / `wake` |
| 7 | 切换形象 / 身份 | chip / fig / toon / vrm 均可切换且表现正常；**未召唤**时伙伴页仍可改身份，召唤后加载 | registry |
| 8 | 设置即时生效 | mute 停止 TTS；关闭 chat 隐藏窗口；randomIdle 即时响应 | settings sync |
| 9 | 冒泡乒乓 | 说话时点击气泡有轻弹反馈；连点三次切换嫌弃句；说话期间仍可拖拽桌宠 | `bubblePong.smoke.test.ts` |
| 10 | dispose | 关闭桌宠或重载后监听与定时器无泄漏 | lifecycle |
| 11 | 调皮模式 | 鼠标靠近时躲开；落地后短窗口内点中视为抓到；连续未抓中 3 次仅台词嫌弃；右键「调皮一下」立刻躲一次，约 10s 未抓到则结束（不改常驻开关） | `playfulPhysics.smoke.test.ts` |
| 12 | 躲起来 | 菜单躲起后贴边仅露半截；点击露头或「出来」现身；软隐藏后再召唤亦清除 peek | `peek-hide` |
| 13 | 工位气象 | 开启总开关后：窗口增减达阈值 / 切窗爆发 / 铺满两档可触发台词（可带轻动作）；说话中不叠加；冷却期内不重复触发 | `deskWeather.smoke.test.ts` |
| 14 | Theme Pack | 设置 → 应用：切换 `theme.style` 后整页配色/边框即时变；气泡与菜单窗跟包；与 look（形象）独立、互不覆盖 | `src/theme/` + settings sync |
| 15 | 壁纸层 | 背景模式切「壁纸」选图/GIF/视频后舞台显示；压暗与适配生效；切回「跟随风格」恢复 pack 底 | `ThemeMediaLayer` / `stageBackdrop` |
| 16 | 开机动画 | 开启后重启设置窗见闪屏；auto / media / manual 时长符合预期；可跳过；无媒体或失败时不卡死 | `bootHold` / `BootAnimationSettings` |
| 17 | 窗外天气 | 设置 → 天气：联网总闸 + 天色/天气/地区；离线总闸锁死实况/定位城；实况一次拉 Open-Meteo（天气+日出日落）；左侧预览下方统一联网状态 + 手动刷新；**在线探测失败回落离线**。**不画在桌宠主窗** | `skyWeather.smoke.test.ts`；预览缩放 `previewFit.smoke.test.ts` |
| 18 | 右键菜单 / 摸鱼 | 展开摸鱼仪表盘见「今日摸鱼一行」；互动后计数变化；清缓存或出厂后战绩归零 | `moyuDay.smoke.test.ts` |

## 勾选范围

- 发版，或改动 runtime / 动画：至少覆盖 1–10。
- 改动调皮模式或躲起来：追加 11–12。
- 改动工位气象：追加 13。
- 改动 Theme Pack / 壁纸 / 开机：追加 14–16。
- 改动窗外天气：追加 17。
- 改动右键菜单 / 今日摸鱼：追加 18。
- 仅改 Toon 像素：执行 toon smoke，并手测待机与一个 `toon-*` 动作。
- 仅改 mood / intent：执行 `yarn test` 后抽测相关条目。
