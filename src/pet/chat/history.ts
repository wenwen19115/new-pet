/** Per-character chat transcript (separate from settings blob). Frontend-only. */

const PET_CHAT_HISTORY_KEY = "desktop-pet-chat-history";
/** Soft cap per character archive */
export const PET_CHAT_HISTORY_MAX = 2000;
/** Floating chat window loads at most this many messages */
export const PET_CHAT_WINDOW_MAX = 50;

export const PET_CHAT_HISTORY_CHANGED = "pet-chat-history-changed";
export const PET_CHAT_HISTORY_TRUNCATED = "pet-chat-history-truncated";

export type PetChatHistoryKind = "ok" | "error";
/** Stable bucket key — use modelKind, not nickname */
export type PetChatCharacterId = string;

export interface PetChatHistoryItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  kind: PetChatHistoryKind;
  /** unix ms */
  ts: number;
}

type HistoryStoreV2 = {
  version: 2;
  byCharacter: Record<string, PetChatHistoryItem[]>;
};

function newId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeCharacterId(id: string | null | undefined): PetChatCharacterId {
  const t = typeof id === "string" ? id.trim() : "";
  return t || "chip";
}

function normalizeItem(raw: unknown): PetChatHistoryItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const role = o.role === "user" || o.role === "assistant" ? o.role : null;
  const content = typeof o.content === "string" ? o.content : "";
  if (!role || !content) return null;
  const kind: PetChatHistoryKind = o.kind === "error" ? "error" : "ok";
  const ts =
    typeof o.ts === "number" && Number.isFinite(o.ts) ? o.ts : Date.now();
  const id =
    typeof o.id === "string" && o.id.trim() ? o.id.trim() : newId();
  return { id, role, content: content.slice(0, 4000), kind, ts };
}

function normalizeList(raw: unknown): PetChatHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  const out: PetChatHistoryItem[] = [];
  for (const row of raw) {
    const item = normalizeItem(row);
    if (item) out.push(item);
  }
  return out;
}

function emptyStore(): HistoryStoreV2 {
  return { version: 2, byCharacter: {} };
}

/**
 * Read store; migrate legacy flat array → current character bucket once.
 * `migrateTo` only used when legacy array is present.
 */
function readStore(migrateTo?: PetChatCharacterId): HistoryStoreV2 {
  try {
    const raw = localStorage.getItem(PET_CHAT_HISTORY_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const list = normalizeList(parsed);
      const store = emptyStore();
      if (list.length) {
        store.byCharacter[normalizeCharacterId(migrateTo)] = list;
        // Persist migration immediately so other windows see v2
        writeStore(store);
      }
      return store;
    }
    if (!parsed || typeof parsed !== "object") return emptyStore();
    const o = parsed as Record<string, unknown>;
    if (o.version === 2 && o.byCharacter && typeof o.byCharacter === "object") {
      const byCharacter: Record<string, PetChatHistoryItem[]> = {};
      for (const [k, v] of Object.entries(
        o.byCharacter as Record<string, unknown>
      )) {
        const id = normalizeCharacterId(k);
        const list = normalizeList(v);
        if (list.length) byCharacter[id] = list;
      }
      return { version: 2, byCharacter };
    }
    return emptyStore();
  } catch {
    return emptyStore();
  }
}

function writeStore(store: HistoryStoreV2): void {
  localStorage.setItem(PET_CHAT_HISTORY_KEY, JSON.stringify(store));
}

function emitChanged(characterId: PetChatCharacterId): void {
  try {
    window.dispatchEvent(
      new CustomEvent(PET_CHAT_HISTORY_CHANGED, {
        detail: { characterId },
      })
    );
  } catch {
    // ignore
  }
}

function emitTruncated(
  characterId: PetChatCharacterId,
  kept: number
): void {
  try {
    window.dispatchEvent(
      new CustomEvent(PET_CHAT_HISTORY_TRUNCATED, {
        detail: { characterId, kept, max: PET_CHAT_HISTORY_MAX },
      })
    );
  } catch {
    // ignore
  }
}

type SaveChatHistoryResult = {
  items: PetChatHistoryItem[];
  truncated: boolean;
};

export function loadChatHistory(
  characterId: PetChatCharacterId
): PetChatHistoryItem[] {
  const id = normalizeCharacterId(characterId);
  const store = readStore(id);
  const list = store.byCharacter[id];
  return list ? list.slice() : [];
}

function saveChatHistory(
  characterId: PetChatCharacterId,
  items: PetChatHistoryItem[]
): SaveChatHistoryResult {
  const id = normalizeCharacterId(characterId);
  const store = readStore(id);
  const truncated = items.length > PET_CHAT_HISTORY_MAX;
  const capped = truncated
    ? items.slice(items.length - PET_CHAT_HISTORY_MAX)
    : items;
  if (capped.length === 0) {
    delete store.byCharacter[id];
  } else {
    store.byCharacter[id] = capped;
  }
  writeStore(store);
  emitChanged(id);
  if (truncated) emitTruncated(id, capped.length);
  return { items: capped, truncated };
}

export function appendChatMessages(
  characterId: PetChatCharacterId,
  ...rows: Array<{
    role: "user" | "assistant";
    content: string;
    kind?: PetChatHistoryKind;
    ts?: number;
  }>
): { added: PetChatHistoryItem[]; truncated: boolean } {
  const list = loadChatHistory(characterId);
  const added: PetChatHistoryItem[] = rows.map((r) => ({
    id: newId(),
    role: r.role,
    content: r.content.slice(0, 4000),
    kind: r.kind === "error" ? "error" : "ok",
    ts: r.ts ?? Date.now(),
  }));
  list.push(...added);
  const { truncated } = saveChatHistory(characterId, list);
  return { added, truncated };
}

export function deleteChatMessage(
  characterId: PetChatCharacterId,
  id: string
): boolean {
  const list = loadChatHistory(characterId);
  const next = list.filter((m) => m.id !== id);
  if (next.length === list.length) return false;
  saveChatHistory(characterId, next);
  return true;
}

/** Clear one character's history only */
export function clearChatHistory(characterId: PetChatCharacterId): void {
  saveChatHistory(characterId, []);
}

function buildChatHistoryExport(
  characterId: PetChatCharacterId
): string {
  const id = normalizeCharacterId(characterId);
  return JSON.stringify(
    {
      version: 2,
      characterId: id,
      exportedAt: new Date().toISOString(),
      max: PET_CHAT_HISTORY_MAX,
      messages: loadChatHistory(id),
    },
    null,
    2
  );
}

export function downloadChatHistoryExport(
  characterId: PetChatCharacterId
): void {
  const id = normalizeCharacterId(characterId);
  const text = buildChatHistoryExport(id);
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `desktop-pet-chat-${id}-${dayKey(Date.now())}.json`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function isChatHistoryNearCap(
  characterId: PetChatCharacterId,
  count = loadChatHistory(characterId).length
): boolean {
  return count >= PET_CHAT_HISTORY_MAX;
}

/** Last N messages for the floating window */
export function loadChatWindowSlice(
  characterId: PetChatCharacterId,
  max = PET_CHAT_WINDOW_MAX
): PetChatHistoryItem[] {
  const list = loadChatHistory(characterId);
  if (list.length <= max) return list;
  return list.slice(list.length - max);
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatChatTime(ts: number, lang: "zh" | "en" = "zh"): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return lang === "en" ? `${date} ${time}` : `${date} ${time}`;
}

export function filterChatHistory(
  characterId: PetChatCharacterId,
  options: {
    query?: string;
    day?: string | null;
  }
): PetChatHistoryItem[] {
  const q = options.query?.trim().toLowerCase() ?? "";
  const day = options.day?.trim() || null;
  return loadChatHistory(characterId).filter((m) => {
    if (day && dayKey(m.ts) !== day) return false;
    if (q && !m.content.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function isChatHistoryStorageKey(key: string | null): boolean {
  return key === PET_CHAT_HISTORY_KEY;
}

export function historyEventCharacterId(detail: unknown): string | null {
  if (!detail || typeof detail !== "object") return null;
  const id = (detail as { characterId?: unknown }).characterId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}
