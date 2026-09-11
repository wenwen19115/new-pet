import {
  Application,
  createEncoder,
  type OpusEncoderHandle,
} from "libopus-wasm";
import { xiaozhiWsSendBinary } from "@/pet/bridge/xiaozhi";
import {
  XIAOZHI_CHANNELS,
  XIAOZHI_FRAME_SAMPLES,
  XIAOZHI_SAMPLE_RATE,
} from "./protocol";

export type XiaozhiMicHandle = {
  stop: () => void;
};

/**
 * 开麦 → 重采样到 16k mono → Opus 60ms 帧 → WS 二进制。
 */
export async function startXiaozhiMic(): Promise<XiaozhiMicHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const encoder: OpusEncoderHandle = await createEncoder({
    sampleRate: XIAOZHI_SAMPLE_RATE,
    channels: XIAOZHI_CHANNELS,
    application: Application.Voip,
    frameSize: XIAOZHI_FRAME_SAMPLES,
  });

  const audioCtx = new AudioContext({ sampleRate: XIAOZHI_SAMPLE_RATE });
  if (audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch {
      /* ignore */
    }
  }
  // 部分浏览器忽略构造参数，仍按设备率跑，需手工抽稀
  const source = audioCtx.createMediaStreamSource(stream);
  const processor = audioCtx.createScriptProcessor(4096, 1, 1);
  const silent = audioCtx.createGain();
  silent.gain.value = 0;

  let pending = new Float32Array(0);
  let stopped = false;

  const flushFrames = async () => {
    while (pending.length >= XIAOZHI_FRAME_SAMPLES) {
      const frame = pending.subarray(0, XIAOZHI_FRAME_SAMPLES);
      pending = pending.subarray(XIAOZHI_FRAME_SAMPLES);
      try {
        const packet = encoder.encodeFloat(frame);
        if (packet.byteLength > 0) {
          await xiaozhiWsSendBinary(packet);
        }
      } catch (err) {
        console.warn("[pet] xiaozhi opus encode failed", err);
      }
    }
  };

  processor.onaudioprocess = (ev) => {
    if (stopped) return;
    if (audioCtx.state === "suspended") {
      void audioCtx.resume().catch(() => undefined);
    }
    const input = ev.inputBuffer.getChannelData(0);
    const ratio = audioCtx.sampleRate / XIAOZHI_SAMPLE_RATE;
    let resampled: Float32Array;
    if (Math.abs(ratio - 1) < 0.01) {
      resampled = new Float32Array(input);
    } else {
      const outLen = Math.floor(input.length / ratio);
      resampled = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) {
        resampled[i] = input[Math.floor(i * ratio)] ?? 0;
      }
    }
    const merged = new Float32Array(pending.length + resampled.length);
    merged.set(pending, 0);
    merged.set(resampled, pending.length);
    pending = merged;
    void flushFrames();
  };

  source.connect(processor);
  processor.connect(silent);
  silent.connect(audioCtx.destination);

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      try {
        processor.disconnect();
        source.disconnect();
        silent.disconnect();
      } catch {
        /* ignore */
      }
      void audioCtx.close();
      for (const track of stream.getTracks()) track.stop();
      try {
        encoder.free();
      } catch {
        /* ignore */
      }
    },
  };
}
