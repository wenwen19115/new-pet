import { invoke } from "@tauri-apps/api/core";
import type { SerialPortDetail } from "@/types/serial";

export async function getSerialPortDetails(): Promise<SerialPortDetail[]> {
  return (await invoke("get_serial_port_details")) as SerialPortDetail[];
}
