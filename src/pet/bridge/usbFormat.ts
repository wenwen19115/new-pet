import { getLinePack } from "../characters/lines";
import { resolveUsb } from "../characters/lines/shared";
import type { PetUsbAnnouncePayload } from "../data/types";

function formatPortLine(port: {
  portName: string;
  friendlyName?: string | null;
  description?: string | null;
}): string {
  const label =
    (port.friendlyName && port.friendlyName.trim()) ||
    (port.description && port.description.trim()) ||
    "";
  if (!label) return port.portName;
  if (label.includes(port.portName)) return label;
  return `${label} (${port.portName})`;
}

export function buildUsbAnnounceText(
  payload: PetUsbAnnouncePayload,
  lang: "zh" | "en",
  model = "chip"
): string {
  const tpl = resolveUsb(getLinePack(model));
  const join = lang === "zh" ? "、" : ", ";
  const added = payload.added.join(join);
  const headTpl =
    payload.added.length === 1 ? tpl.addedOne[lang] : tpl.addedMany[lang];
  const head = headTpl.replaceAll("{added}", added || "—");

  const portLines = payload.ports.map(formatPortLine);
  if (portLines.length === 0) {
    return `${head}\n${tpl.emptyTail[lang]}`;
  }
  const list = portLines
    .map((item) => tpl.bullet[lang].replaceAll("{item}", item))
    .join("\n");
  return `${head}\n${tpl.listHeader[lang]}\n${list}`;
}
