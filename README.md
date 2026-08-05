# Desktop Pet

独立桌宠工程（芯宠 / Chip Pet）。

## 功能

- 设置页 Theme Pack（`src/theme/`：`THEME_PACK_IDS` 现约 64 包 + 可选壁纸 / 开机动画）
- 启动入场动画 + 像素宠图标
- 右键桌宠：表演一个 / 调皮一下 / 打开设置 / 置顶 / 躲起来
- 乐心（VRM）自定义动作：命名、设计、加入随机池
- Edge 神经语音播报（需联网）
- 右键菜单 AI 聊天：DeepSeek（需 API Key）或仅本地陪聊；失败显示错误并可重试（不会静默换成随机句）
- 聊天记录本机持久化：按角色（modelKind）分桶；聊天窗最多显示最近 50 条；完整记录在设置 → AI 聊天（可按日期/关键词查找、删单条、清除当前角色、导出）；每角色软上限 2000 条
- AI 服务商 / 模型 / Key：按角色独立保存（换角色各自配置）

## 开发

```bash
yarn
yarn tauri dev
```

Vite 端口：`1421`。

## 打包

```bash
yarn tauri build --bundles nsis
```
