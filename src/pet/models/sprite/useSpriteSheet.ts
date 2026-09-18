import { computed, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import {
  spriteFrameDelayMs,
  type SpriteAtlas,
  type SpriteAnimName,
} from "./atlas";
import type { SpritePlayback } from "./resolveAnim";

export function useSpriteSheet(opts: {
  atlas: Ref<SpriteAtlas>;
  anim: Ref<SpriteAnimName>;
  playback: Ref<SpritePlayback>;
  playing: Ref<boolean>;
  pace?: Ref<number>;
  flipEvery?: Ref<number | undefined>;
}) {
  const frame = ref(0);
  const dir = ref(1);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let gen = 0;

  const row = computed(() => opts.atlas.value.rowOf[opts.anim.value] ?? 0);
  const frameCount = computed(
    () => opts.atlas.value.frames[opts.anim.value] ?? 1
  );

  const flipX = computed(() => {
    const every = opts.flipEvery?.value;
    if (!every || every < 1) return false;
    return Math.floor(frame.value / every) % 2 === 1;
  });

  function clear() {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function delayFor(frameIndex: number): number {
    return spriteFrameDelayMs(
      opts.atlas.value.frameMs[opts.anim.value],
      frameIndex,
      opts.pace?.value ?? 1
    );
  }

  function tick(myGen: number) {
    clear();
    if (!opts.playing.value || myGen !== gen) return;
    const n = frameCount.value;
    const mode = opts.playback.value;
    const ms = delayFor(frame.value);

    timer = setTimeout(() => {
      if (myGen !== gen) return;

      if (mode === "pingpong" && n > 1) {
        let next = frame.value + dir.value;
        if (next >= n) {
          dir.value = -1;
          next = n - 2;
        } else if (next < 0) {
          dir.value = 1;
          next = 1;
        }
        frame.value = Math.max(0, Math.min(n - 1, next));
        tick(myGen);
        return;
      }

      const next = frame.value + 1;
      if (next >= n) {
        if (mode === "loop") {
          frame.value = 0;
          tick(myGen);
        } else {
          frame.value = Math.max(0, n - 1);
        }
        return;
      }
      frame.value = next;
      tick(myGen);
    }, ms);
  }

  function restart() {
    gen += 1;
    frame.value = 0;
    dir.value = 1;
    tick(gen);
  }

  watch(
    [
      opts.anim,
      opts.playback,
      opts.playing,
      frameCount,
      () => opts.pace?.value,
      () => opts.flipEvery?.value,
      () => opts.atlas.value.frameMs,
    ],
    () => restart(),
    { immediate: true }
  );

  onMounted(() => restart());
  onUnmounted(() => {
    gen += 1;
    clear();
  });

  const bgPos = computed(() => {
    const cols = opts.atlas.value.columns;
    const rows = opts.atlas.value.rows;
    const col = Math.min(frame.value, cols - 1);
    const r = Math.min(row.value, rows - 1);
    const x = cols <= 1 ? 0 : (col / (cols - 1)) * 100;
    const y = rows <= 1 ? 0 : (r / (rows - 1)) * 100;
    return `${x}% ${y}%`;
  });

  const bgSize = computed(
    () => `${opts.atlas.value.columns * 100}% ${opts.atlas.value.rows * 100}%`
  );

  return { frame, row, bgPos, bgSize, flipX, restart };
}
