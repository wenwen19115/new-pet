# Desktop Pet

独立桌宠工程（从 `wheat-esp-tools` 抽出的芯宠 / Chip Pet）。

## 功能

- 夜晚 / 珍珠白白天 UI 主题（`src/theme/uiTheme.ts`）
- 启动入场动画 + 像素宠图标
- 右键桌宠：打开设置 / 置顶设置页
- 乐心（VRM）自定义动作：命名、设计、加入随机池
- Edge 神经语音播报（需联网）

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
