<template>
  <div
    v-if="visible"
    class="pet-chat"
    @pointerdown="onActivity"
    @keydown="onActivity"
  >
    <header class="pet-chat-head">
      <div class="pet-chat-title-wrap">
        <span class="pet-chat-title">{{ title }}</span>
        <span class="pet-chat-provider">{{ providerLabel }}</span>
      </div>
      <button
        type="button"
        class="pet-chat-head-btn"
        :title="clearLabel"
        :aria-label="clearLabel"
        :disabled="busy || turns.length === 0"
        @click="clearAll"
      >
        {{ clearShort }}
      </button>
      <button type="button" class="pet-chat-close" :aria-label="closeLabel" @click="close">
        ×
      </button>
    </header>

    <div ref="listEl" class="pet-chat-list" aria-live="polite">
      <div v-if="turns.length === 0 && !busy" class="pet-chat-hint">
        {{ hint }}
      </div>
      <div
        v-for="(m, i) in turns"
        :key="m.id"
        class="pet-chat-row"
        :class="m.role"
      >
        <div
          class="pet-chat-bubble"
          :class="[m.role, { error: m.kind === 'error', clickable: m.kind === 'error' }]"
          @click="m.kind === 'error' ? retryAt(i) : undefined"
        >
          <button
            v-if="m.kind === 'error'"
            type="button"
            class="pet-chat-retry"
            :title="retryLabel"
            :aria-label="retryLabel"
            :disabled="busy"
            @click.stop="retryAt(i)"
          >
            <span class="pet-chat-retry-ring" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                <path
                  d="M13.2 8A5.2 5.2 0 1 1 11.3 3.6"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                />
                <path
                  d="M11.1 1.6v2.7h2.7"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          </button>
          <span class="pet-chat-bubble-text">{{ m.content }}</span>
        </div>
        <div class="pet-chat-meta">
          <span class="pet-chat-time">{{ formatTime(m.ts) }}</span>
          <button
            type="button"
            class="pet-chat-del"
            :title="deleteLabel"
            :aria-label="deleteLabel"
            :disabled="busy"
            @click.stop="removeMessage(m.id)"
          >
            ×
          </button>
        </div>
      </div>
      <div v-if="busy" class="pet-chat-row assistant">
        <div class="pet-chat-bubble assistant" :class="{ pending: !streamText }">
          <span class="pet-chat-bubble-text">{{ streamText || "…" }}</span>
        </div>
      </div>
    </div>

    <form class="pet-chat-compose" @submit.prevent="onComposeSubmit">
      <textarea
        ref="inputEl"
        v-model="draft"
        class="pet-chat-input"
        rows="2"
        :maxlength="inputMax"
        :placeholder="placeholder"
        :disabled="busy"
        autocomplete="off"
        @keydown="onInputKeydown"
      />
      <button
        v-if="busy"
        type="button"
        class="pet-chat-send stop"
        @click="stopGeneration"
      >
        {{ stopLabel }}
      </button>
      <button v-else type="submit" class="pet-chat-send" :disabled="!draft.trim()">
        {{ sendLabel }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useChatWindowSession } from "./useChatWindowSession";
import "./chatWindow.css";

const {
  visible,
  draft,
  busy,
  streamText,
  turns,
  listEl,
  inputEl,
  inputMax,
  title,
  providerLabel,
  hint,
  placeholder,
  sendLabel,
  stopLabel,
  closeLabel,
  retryLabel,
  deleteLabel,
  clearLabel,
  clearShort,
  formatTime,
  onActivity,
  close,
  clearAll,
  retryAt,
  removeMessage,
  stopGeneration,
  onInputKeydown,
  onComposeSubmit,
} = useChatWindowSession();
</script>
