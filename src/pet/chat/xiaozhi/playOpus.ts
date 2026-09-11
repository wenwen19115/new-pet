import { createDecoder, type OpusDecoderHandle } from "libopus-wasm";
import {
  XIAOZHI_CHANNELS,
  XIAOZHI_FRAME_SAMPLES,
  XIAOZHI_SAMPLE_RATE,
} from "./protocol";

export type XiaozhiOpusPlayer = {
  pushPacket: (bytes: Uint8Array) => void;
  clear: () => void;
  dispose: () => void;
};

/**
 * 下行 Opus → 16k mono PCM → WebAudio 排队播放。
 * 关播报时调用方勿 push；clear 打断当前队列。
 */
export async function createXiaozhiOpusPlayer(): Promise<XiaozhiOpusPlayer> {
  const decoder: OpusDecoderHandle = await createDecoder({
    sampleRate: XIAOZHI_SAMPLE_RATE,
    channels: XIAOZHI_CHANNELS,
  });
  const ctx = new AudioContext({ sampleRate: XIAOZHI_SAMPLE_RATE });
  let nextStart = 0;
  let disposed = false;
  const sources = new Set<AudioBufferSourceNode>();

  function clear() {
    for (const src of sources) {
      try {
        src.stop();
      } catch {
        /* ignore */
      }
      try {
        src.disconnect();
      } catch {
        /* ignore */
      }
    }
    sources.clear();
    nextStart = ctx.currentTime;
  }

  return {
    pushPacket(bytes: Uint8Array) {
      if (disposed || bytes.byteLength === 0) return;
      try {
        const pcm = decoder.decodeFloat(bytes);
        if (!pcm || pcm.length === 0) return;
        const samples =
          pcm.length >= XIAOZHI_FRAME_SAMPLES
            ? pcm
            : (() => {
                const padded = new Float32Array(XIAOZHI_FRAME_SAMPLES);
                padded.set(pcm);
                return padded;
              })();
        const buffer = ctx.createBuffer(
          XIAOZHI_CHANNELS,
          samples.length,
          XIAOZHI_SAMPLE_RATE
        );
        buffer.getChannelData(0).set(samples);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);
        sources.add(src);
        src.onended = () => {
          sources.delete(src);
          try {
            src.disconnect();
          } catch {
            /* ignore */
          }
        };
        const startAt = Math.max(ctx.currentTime + 0.01, nextStart);
        src.start(startAt);
        nextStart = startAt + buffer.duration;
        if (ctx.state === "suspended") void ctx.resume();
      } catch (err) {
        console.warn("[pet] xiaozhi opus decode failed", err);
      }
    },
    clear,
    dispose() {
      if (disposed) return;
      disposed = true;
      clear();
      void ctx.close();
      try {
        decoder.free();
      } catch {
        /* ignore */
      }
    },
  };
}
