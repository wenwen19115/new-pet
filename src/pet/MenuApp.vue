<template>
  <div v-if="visible" class="pet-ctx-menu">
    <button type="button" class="pet-ctx-item" @click="emitAction('open')">
      {{ openLabel }}
    </button>
    <button type="button" class="pet-ctx-item" @click="emitAction('pin')">
      {{ pinLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  PET_MENU_ACTION_EVENT,
  PET_MENU_HIDE_EVENT,
  PET_MENU_SHOW_EVENT,
  type PetMenuAction,
  type PetMenuPayload,
} from "./menuTypes";

const visible = ref(false);
const openLabel = ref("打开设置");
const pinLabel = ref("置顶设置页");

let unlistenShow: UnlistenFn | null = null;
let unlistenHide: UnlistenFn | null = null;

function applyPayload(payload: PetMenuPayload) {
  openLabel.value = payload.openLabel;
  pinLabel.value = payload.pinLabel;
  visible.value = true;
}

async function emitAction(action: PetMenuAction) {
  visible.value = false;
  try {
    await emit(PET_MENU_ACTION_EVENT, { action });
  } catch {
    // ignore
  }
}

onMounted(async () => {
  unlistenShow = await listen<PetMenuPayload>(PET_MENU_SHOW_EVENT, (ev) => {
    applyPayload(ev.payload);
  });
  unlistenHide = await listen(PET_MENU_HIDE_EVENT, () => {
    visible.value = false;
  });
});

onUnmounted(() => {
  unlistenShow?.();
  unlistenHide?.();
});
</script>

<style scoped>
.pet-ctx-menu {
  width: 100%;
  height: 100%;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(12, 16, 22, 0.92);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-sizing: border-box;
}

.pet-ctx-item {
  appearance: none;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  text-align: left;
  padding: 8px 10px;
  border-radius: 7px;
  cursor: pointer;
}

.pet-ctx-item:hover {
  background: rgba(64, 196, 255, 0.18);
  color: #9fe4ff;
}
</style>
