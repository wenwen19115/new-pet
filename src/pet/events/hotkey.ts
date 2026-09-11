/** 输入框聚焦时吞掉全局语音快捷键 */
export const PET_HOTKEY_SUSPEND_EVENT = "pet://hotkey-suspend";

export type PetHotkeySuspendPayload = {
  suspend: boolean;
};
