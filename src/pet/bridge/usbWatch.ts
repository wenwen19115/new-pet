import { getSerialPortDetails } from "@/pet/bridge/serial";
import type { SerialPortDetail } from "@/pet/bridge/serialTypes";
import {
  type PetUsbAnnouncePayload,
} from "../data/types";

const POLL_MS_ACTIVE = 1500;
const POLL_MS_SLEEP = 6000;

type PetUsbAnnounceHandler = (payload: PetUsbAnnouncePayload) => void;

let timer: ReturnType<typeof setInterval> | null = null;
let pollMs = POLL_MS_ACTIVE;
let knownPorts = new Set<string>();
let bootstrapped = false;
let polling = false;
let handler: PetUsbAnnounceHandler | null = null;

function normalizePortKey(name: string): string {
  const upper = name.toUpperCase();
  const m = upper.match(/COM\d+/);
  return m ? m[0] : upper.replace(/^\\\\\.\\/, "");
}

function portKey(p: SerialPortDetail): string {
  return normalizePortKey(p.portName);
}

async function pollOnce(): Promise<void> {
  if (polling || !handler) return;
  polling = true;
  try {
    const list = await getSerialPortDetails();
    const next = new Set(list.map(portKey));

    if (!bootstrapped) {
      knownPorts = next;
      bootstrapped = true;
      return;
    }

    const addedKeys = [...next].filter((name) => !knownPorts.has(name));
    knownPorts = next;

    if (addedKeys.length === 0) return;

    const addedNames = list
      .filter((p) => addedKeys.includes(portKey(p)))
      .map((p) => p.portName);

    const payload: PetUsbAnnouncePayload = {
      ports: list.map((p) => ({
        portName: p.portName,
        friendlyName: p.friendlyName,
        description: p.description,
      })),
      added: addedNames.length > 0 ? addedNames : addedKeys,
    };
    handler(payload);
  } catch (err) {
    console.warn("[pet] usb watch poll failed", err);
  } finally {
    polling = false;
  }
}

function armTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (!handler) return;
  timer = setInterval(() => {
    void pollOnce();
  }, pollMs);
}

function startPetUsbWatch(onAnnounce: PetUsbAnnounceHandler): void {
  handler = onAnnounce;
  if (timer) return;
  bootstrapped = false;
  knownPorts = new Set();
  void pollOnce();
  armTimer();
}

export function stopPetUsbWatch(): void {
  handler = null;
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  bootstrapped = false;
  knownPorts = new Set();
}

/** Slow USB polling while pet sleeps to cut background IPC. */
export function setPetUsbWatchRelaxed(relaxed: boolean): void {
  const next = relaxed ? POLL_MS_SLEEP : POLL_MS_ACTIVE;
  if (next === pollMs) return;
  pollMs = next;
  if (handler && timer) armTimer();
}

export function syncPetUsbWatch(
  enabled: boolean,
  onAnnounce: PetUsbAnnounceHandler
): void {
  if (enabled) {
    startPetUsbWatch(onAnnounce);
  } else {
    stopPetUsbWatch();
  }
}

/** 重扫基线；已插设备不再当「新插入」 */
export function resetPetUsbWatchBootstrap(): boolean {
  const hit = bootstrapped || knownPorts.size > 0;
  if (!handler) {
    bootstrapped = false;
    knownPorts = new Set();
    return hit;
  }
  bootstrapped = false;
  knownPorts = new Set();
  void pollOnce();
  return hit;
}
