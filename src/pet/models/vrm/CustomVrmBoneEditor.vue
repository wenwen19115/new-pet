<template>
  <div class="bone-editor">
    <div class="bone-tabs">
      <button
        v-for="(kf, idx) in motion.keyframes"
        :key="idx"
        type="button"
        class="bone-tab"
        :data-active="frameIndex === idx ? '1' : '0'"
        @click="frameIndex = idx"
      >
        {{ $t("pet.customMotionFrame", { n: idx + 1 }) }}
      </button>
    </div>

    <div class="bone-meta">
      <label @dblclick.prevent="onRootY(0)">
        <span>{{ $t("pet.customMotionRootY") }}</span>
        <a-slider
          :value="rootYMm"
          :min="-80"
          :max="80"
          :step="1"
          @change="onRootY"
        />
      </label>
      <label @dblclick.prevent="onRootYaw(0)">
        <span>{{ $t("pet.customMotionRootYaw") }}</span>
        <a-slider
          :value="rootYawDeg"
          :min="-45"
          :max="45"
          :step="1"
          @change="onRootYaw"
        />
      </label>
    </div>

    <a-collapse v-model:activeKey="openGroups" ghost class="bone-groups">
      <a-collapse-panel
        v-for="group in groups"
        :key="group.id"
        :header="$t(`pet.customMotionGroup.${group.id}`)"
      >
        <div
          v-for="bone in group.bones"
          :key="bone"
          class="bone-row"
        >
          <div class="bone-name">{{ $t(`pet.customMotionBone.${bone}`) }}</div>
          <div class="bone-axes">
            <label
              v-for="axis in axes"
              :key="axis"
              @dblclick.prevent="onAxis(bone, axis, 0)"
            >
              <span>{{ axis.toUpperCase() }}</span>
              <a-slider
                :value="axisDeg(bone, axis)"
                :min="-120"
                :max="120"
                :step="1"
                @change="(v: number) => onAxis(bone, axis, v)"
              />
            </label>
          </div>
        </div>
      </a-collapse-panel>
    </a-collapse>

    <div class="bone-footer">
      <a-button size="small" @click="resetFrame">
        {{ $t("pet.customMotionResetFrame") }}
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
/** 滑条单位：度；语义 = normalized、相对 T-pose（docs/VRM_MOTION.md） */
import { computed, ref, watch } from "vue";
import {
  CUSTOM_VRM_BONE_GROUPS,
  createDefaultKeyframes,
  getBoneAxisDeg,
  radToDeg,
  setBoneAxisDeg,
  type CustomVrmMotion,
} from "@/pet/content/motion/customVrmMotions";
import type { VrmBoneName } from "@/pet/data/vrmPoses";

const props = defineProps<{
  motion: CustomVrmMotion;
}>();

const emit = defineEmits<{
  change: [motion: CustomVrmMotion];
  frameChange: [frameIndex: number];
}>();

const axes = ["x", "y", "z"] as const;
const groups = CUSTOM_VRM_BONE_GROUPS;
const frameIndex = ref(0);
const openGroups = ref<string[]>(["head", "leftArm", "rightArm"]);

watch(
  () => props.motion.id,
  () => {
    frameIndex.value = 0;
  }
);

watch(
  () => props.motion.keyframes.length,
  (n) => {
    if (frameIndex.value >= n) frameIndex.value = Math.max(0, n - 1);
  }
);

watch(
  frameIndex,
  (n) => {
    emit("frameChange", n);
  },
  { immediate: true }
);

const activeFrame = computed(
  () => props.motion.keyframes[frameIndex.value] ?? props.motion.keyframes[0]!
);

const rootYMm = computed(() =>
  Math.round((activeFrame.value.rootY ?? 0) * 1000)
);
const rootYawDeg = computed(() => radToDeg(activeFrame.value.rootYaw ?? 0));

function patchFrame(
  patch: Partial<(typeof props.motion.keyframes)[number]>
) {
  const keyframes = props.motion.keyframes.map((kf, i) =>
    i === frameIndex.value ? { ...kf, ...patch } : kf
  );
  emit("change", { ...props.motion, keyframes });
}

function axisDeg(bone: VrmBoneName, axis: "x" | "y" | "z") {
  return getBoneAxisDeg(activeFrame.value.bones, bone, axis);
}

function onAxis(bone: VrmBoneName, axis: "x" | "y" | "z", deg: number) {
  patchFrame({
    bones: setBoneAxisDeg(activeFrame.value.bones, bone, axis, deg),
  });
}

function onRootY(v: number) {
  patchFrame({ rootY: v / 1000 });
}

function onRootYaw(v: number) {
  patchFrame({ rootYaw: (v * Math.PI) / 180 });
}

function resetFrame() {
  const defaults = createDefaultKeyframes();
  const fallback = defaults[Math.min(frameIndex.value, defaults.length - 1)]!;
  patchFrame({
    bones: { ...fallback.bones },
    rootY: fallback.rootY,
    rootYaw: fallback.rootYaw,
  });
}
</script>

<style scoped>
.bone-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bone-tabs {
  display: flex;
  gap: 6px;
}

.bone-tab {
  appearance: none;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
  color: var(--ui-text-muted);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}

.bone-tab[data-active="1"] {
  color: var(--ui-primary);
  border-color: color-mix(in srgb, var(--ui-primary) 45%, transparent);
  background: var(--ui-accent-soft);
}

.bone-meta {
  display: grid;
  gap: 4px;
}

.bone-meta label,
.bone-axes label {
  display: grid;
  grid-template-columns: 28px 1fr;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--ui-text-muted);
}

.bone-meta label {
  grid-template-columns: 64px 1fr;
}

.bone-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 0;
  border-bottom: 1px solid var(--ui-border);
}

.bone-row:last-child {
  border-bottom: 0;
}

.bone-name {
  font-size: 12px;
  color: var(--ui-text);
  font-weight: 500;
}

.bone-axes {
  display: grid;
  gap: 2px;
}

.bone-footer {
  display: flex;
  justify-content: flex-end;
}

.bone-groups :deep(.ant-collapse-header) {
  color: var(--ui-text) !important;
  padding: 6px 0 !important;
  font-size: 12px !important;
}

.bone-groups :deep(.ant-collapse-content-box) {
  padding: 0 0 4px !important;
}
</style>
