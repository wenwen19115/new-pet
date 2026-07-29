import { invoke } from "@tauri-apps/api/core";
import type { SerialPortDetail } from "@/pet/bridge/serialTypes";

export async function getSerialPortDetails(): Promise<SerialPortDetail[]> {
  return (await invoke("get_serial_port_details")) as SerialPortDetail[];
}
