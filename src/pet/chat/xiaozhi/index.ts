/** 外部入口：会话 / OTA 等待 / 情绪→动作；其余走子路径 */
export { mapXiaozhiEmotionToMotion } from "./protocol";
export { waitXiaozhiBound } from "./ota";
export { XiaozhiSession, testXiaozhiHandshake } from "./session";
export type { XiaozhiSessionPhase } from "./session";
