import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export const XIAOZHI_WS_MESSAGE_EVENT = "xiaozhi-ws-message";
export const XIAOZHI_WS_CLOSED_EVENT = "xiaozhi-ws-closed";
export const XIAOZHI_WS_ERROR_EVENT = "xiaozhi-ws-error";

export interface XiaozhiWsMessagePayload {
  kind: "text" | "binary" | string;
  data: string;
}

export interface XiaozhiWsErrorPayload {
  message: string;
}

export interface XiaozhiWsConnectArgs {
  url: string;
  token: string;
  deviceId: string;
  clientId: string;
}

export interface XiaozhiOtaCheckArgs {
  otaUrl: string;
  deviceId: string;
  clientId: string;
  lang?: "zh" | "en";
}

export interface XiaozhiOtaCheckResult {
  ok: boolean;
  status: number;
  body: string;
}

export async function xiaozhiWsConnect(args: XiaozhiWsConnectArgs): Promise<void> {
  await invoke("xiaozhi_ws_connect", {
    url: args.url,
    token: args.token,
    deviceId: args.deviceId,
    clientId: args.clientId,
  });
}

export async function xiaozhiWsSendText(text: string): Promise<void> {
  await invoke("xiaozhi_ws_send_text", { text });
}

export async function xiaozhiWsSendBinary(bytes: Uint8Array): Promise<void> {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const base64 = btoa(binary);
  await invoke("xiaozhi_ws_send_binary", { base64 });
}

export async function xiaozhiWsClose(): Promise<void> {
  await invoke("xiaozhi_ws_close");
}

export async function xiaozhiOtaCheck(
  args: XiaozhiOtaCheckArgs
): Promise<XiaozhiOtaCheckResult> {
  return invoke<XiaozhiOtaCheckResult>("xiaozhi_ota_check", {
    otaUrl: args.otaUrl,
    deviceId: args.deviceId,
    clientId: args.clientId,
    lang: args.lang ?? "zh",
  });
}

export function listenXiaozhiWsMessage(
  handler: (payload: XiaozhiWsMessagePayload) => void
): Promise<UnlistenFn> {
  return listen<XiaozhiWsMessagePayload>(XIAOZHI_WS_MESSAGE_EVENT, (ev) => {
    handler(ev.payload);
  });
}

export function listenXiaozhiWsClosed(handler: () => void): Promise<UnlistenFn> {
  return listen(XIAOZHI_WS_CLOSED_EVENT, () => {
    handler();
  });
}

export function listenXiaozhiWsError(
  handler: (payload: XiaozhiWsErrorPayload) => void
): Promise<UnlistenFn> {
  return listen<XiaozhiWsErrorPayload>(XIAOZHI_WS_ERROR_EVENT, (ev) => {
    handler(ev.payload);
  });
}
