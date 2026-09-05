# VRM 动作编写规则

代码 SoT：
- **VRMA 主库（酥酥默认）**：`src/pet/content/motion/vrmaMotions.ts` + `src/pet/assets/vrm/motions/*.vrma`
  - 自标 `kind`（类型：idle/talk/gesture/emotion）与 `vibe`（风格：soft/lively/bold）；样例文件本身无官方类型
  - 设置「动作列表」点行即播；随机池仍由各开关控制（关掉即不进随机）
  - aikeya 全量：`idle`×5 + `talk` + VRoid `VRMA_01–07`（showcase/greet/peace/shoot/twirl/pose/squat）
  - 另附 vrm-viewer 手势情绪（wave / blush…）
  - 来源：https://github.com/aikeyaorg/aikeya/tree/main/static/animations + vrm-viewer；见 `assets/vrm/motions/LICENSE-vrma-samples.txt`
- 程序姿态（仅睡眠 / 拎起 / 自定义骨骼）：`src/pet/data/vrmPoses.ts`
- 自定义关键帧：`src/pet/content/motion/customVrmMotions.ts`（导出 JSON 用**度**）

播放：`useVrmRenderer` 对 VRMA id（含 `idle-float`→`vrm-idle`）走 `AnimationMixer`；睡眠与拎起仍 `resolveVrmPose`。

姿态写在 **Normalized Humanoid**（`getNormalizedBoneNode`）。零姿态 = T-pose；数值 = **相对 T-pose** 的本地旋转。  
规范提供的是 T-pose / 归一化空间，**不是**「每骨欧拉 X/Y/Z 拧多少 = 什么观感」的滑条说明书。下表以**本项目预览实测**为准（酥酥 + 设置页「做一下」），勿用纸面世界轴推断覆盖实测。

参考：[VRM T-pose](https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/tpose.md) · [NormalizedLocalRotation](https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm_animation-1.0/how_to_transform_human_pose.md) · [three-vrm Humanoid](https://pixiv.github.io/three-vrm/docs/classes/three-vrm.VRMHumanoid.html)

## 1. 写入约定

| 项 | 约定 |
| --- | --- |
| 写入目标 | 只写 normalized（禁止 raw） |
| 朝向 | VRM1；`VRMUtils.rotateVRM0` 后正面 +Z、Y 上；预览相机大致在角色正面 |
| 作者格式 | 欧拉 XYZ + `deg()`；运行时转四元数 |
| 站姿 | `REST` / `restArms` / `restLegs` = T-pose→A-pose；其它动作只叠增量 |
| 自定义 JSON | 度制欧拉 = 相对 T-pose |

## 2. 实测轴向表（SoT，勿改回「纸面常识」）

### 躯干 / 腿

| 骨 | 轴 | 实测观感 |
| --- | --- | --- |
| `hips → head` | **X-**（`FWD = -1`） | **前倾（朝相机）**；X+ = 后仰 |
| 同上 | Y / Z | 左右转 / 侧倾 |
| `upperLeg` | **X-** | 大腿朝前（迈步/蹲）；X+ = 朝后 |
| `lowerLeg` | **X-** | **正常屈膝**（`knee(flex)` 内部取负）；X+ = 反关节鸟腿 |

### 手臂（A-pose 站姿上改）

| 骨 | 轴 | 实测观感 |
| --- | --- | --- |
| `upperArm` | **Z** | T-pose 平举 ↔ 体侧（站姿主靠 Z 收下） |
| `upperArm` | **X+** | **体前**抬/送；**X- = 体后**（伸懒腰曾搞反） |
| `upperArm` | **Y** | 易成「整臂拧转 / 外展拥抱」；屈肘、体前上抬时**不要当主动轴** |
| `lowerArm` | **Z** | **屈肘**（站姿已有 z≈±25；加深弯肘加大 \|Z\|；右臂写入为负 Z） |
| `lowerArm` | **X** | **不会弯肘**（伸懒腰实测：只改 X 小臂仍直） |
| `shoulder` | Z 近站姿 ±21° | 耸肩/打开可小改；勿当抬臂主轴 |

代码：

- `FWD * deg(n)` = 躯干前倾；后仰 = `-FWD * deg(n)`
- `knee(flexDeg)` = 正常屈膝
- 屈肘 = 改 `lowerArm` 的 **Z**（见 `stretchArmChain`），不要改 X 充屈肘
- 平举类抬臂仍可用上臂 **Z**（`raiseBothArms`）；屈臂上抬类用上臂 **X+** + 前臂 **Z**，且上臂 Z 勿从体侧扫过 0°（会像张开拥抱）

## 3. 伸懒腰等「屈臂」动作的硬规则

曾反复踩坑，按下面写：

1. **先屈肘再上举**：屈肘段上臂几乎不动（Y 锁站姿，X/Z 仅极小），只加深前臂 **Z**；可停住一拍让人看清弯肘。
2. **体前上抬用上臂 X+**，不是 X-（X- 会落到体后）。
3. **禁止**用上臂 Y 充当「弯肘」或「上抬」——观感是旋转/展开，不是屈臂。
4. **禁止**上臂 Z 从体侧插值经过 T 字平举再到过头——中途像展开拥抱。
5. 手臂要自然：肩→上臂→前臂→手**联动**，但每段主动轴必须符合上表；联动 ≠ 乱拧 Y。
6. 伸展阶段才：上臂 Z 收到过头 + 前臂 Z 略收回 + 躯干 `-FWD` 后仰。

## 4. 站姿 SoT（A-pose）

| 骨骼 | X | Y | Z | 含义 |
| --- | ---: | ---: | ---: | --- |
| leftShoulder | ≈3.4 | ≈6.9 | **-21** | 肩带 |
| rightShoulder | ≈3.4 | ≈-6.9 | **+21** | 镜像 |
| leftUpperArm | ≈3.4 | ≈16 | ≈+37 | 平举收到体侧 |
| rightUpperArm | ≈3.4 | ≈-16 | ≈-37 | 镜像 |
| leftLowerArm | ≈35.5 | ≈6.9 | **+25** | 肘微屈（**Z**） |
| rightLowerArm | **+15** | ≈-6.9 | **-25** | 肘 Z 镜像；X 略不对称 |
| hand | 见 `REST` | | | 腕 |

摆臂：`restArms({ swingL, swingR })` 只推上臂 X；别为摆臂改肩 Z。

## 5. 编写流程

1. 定意图一句话。
2. **查 §2 实测表**（不要凭「一般人体 X=屈肘」开写）。
3. `mergePose(restArms(…), …)` 只叠要变的骨。
4. 屈臂类走 `stretchArmChain` 同类写法；直臂欢呼类才优先 `raiseBothArms`。
5. 相位：走跑臂腿对侧；伸懒腰屈肘→停→上举→伸展→收。
6. 自检：鞠躬朝相机；膝非鸟腿；屈肘看前臂 Z；体前抬看上臂 X+；无拥抱外展。
7. `remapVrmMotion` 勿把 `victory-burst` / `stretch-up` 折成别的动作。

## 5.1 活人感（当前首要目标）

姿态优化**以预览能一眼读出生命感为准**，禁止「相位差几毫秒」式保守微调当交差。

| 要 | 不要 |
| --- | --- |
| 左右承重/关节权重差可读；接触时间线合理 | 半拍错相装不同步 |
| 髋膝**不同曲线**（蓄力/蹬地/落地职责可读） | 整条腿同一包络 |
| 重量感：落地缓冲、移重、先着地侧 | 匀速木偶、整机同步 |
| 克制：一般动作约 0.4 幅（`MILD_MOTION_AMP`）；摆头/伸懒腰全幅 | 把克制理解成「改了但看不出」 |
| 改完用「做一下」验收：闭眼也能听出节奏差 | 只改系数不敢动结构 |

相机：有垂直位移的动作勿让相机 1:1 跟 `rootY`（会把高度对消）；见 `useVrmRenderer.updateOrbitCamera`。

## 6. 动作意图表

| 函数 | motion id | 意图 | 主驱动 |
| --- | --- | --- | --- |
| `poseIdle` | `idle-float`（睡眠时） | 呼吸+轻移重 | 躯干/腿；臂小摆 |
| `poseSleep` / `poseLifted` | mood / drag | 瞌睡 / 拎起 | 见代码 |
| VRMA loop | `vrm-idle` / `vrm-idle2` | 待机 | aikeya idle clips，`LoopRepeat` |
| VRMA once | `vrm-wave` / `vrm-clap` / `vrm-jump` / `vrm-think` / `vrm-look` / `vrm-surprise` / `vrm-relax` / `vrm-talk` / `vrm-angry` / `vrm-blush` / `vrm-sad` / `vrm-sleepy` | 手势库 | `@pixiv/three-vrm-animation` |

## 7. 禁止事项

- 写 raw；或用「世界轴纸面符号」覆盖 §2 实测
- 用 **前臂 X** 当屈肘（无效）
- 用 **上臂 Y** 冒充屈臂/上抬（像拧转、拥抱）
- 上臂 Z 体侧→平举→过头 扫过 T 字当「上举」
- 上臂 X- 当「体前」（实际体后）
- `FWD = +1` 当朝相机鞠躬（实测反了）
- `lowerLeg` 正 X 当屈膝（鸟腿）
- 抬臂肘完全伸直；整段覆盖肩回旧硬编码
- 自定义草稿未保存当已入库
- 为避风险把动作改成「看不出变化」（违背 §5.1）

## 8. 改完怎么验

1. 设置页 → 酥酥 →「做一下」（预览与桌宠同步播）。
2. 伸懒腰：先弯肘停住 → 身前屈臂上抬 → 再伸展；不得平举外展、不得体后抡。
3. 鞠躬朝相机；走路屈膝人向。
4. 欢乐跳：双脚一起起落；能感到承重左右略偏与落地缓冲，不能像瘸腿错相。
5. `yarn vue-tsc --noEmit`。
