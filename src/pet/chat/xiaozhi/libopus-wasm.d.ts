declare module "libopus-wasm" {
  export const Application: {
    readonly Voip: number;
    readonly Audio: number;
    readonly RestrictedLowDelay: number;
  };

  export interface OpusEncoderHandle {
    readonly sampleRate: number;
    readonly channels: number;
    readonly frameSize: number;
    encode(pcm: Int16Array | Uint8Array): Uint8Array;
    encodeFloat(pcm: Float32Array): Uint8Array;
    free(): void;
  }

  export interface OpusDecoderHandle {
    readonly sampleRate: number;
    readonly channels: number;
    decode(packet: Uint8Array | null): Int16Array;
    decodeFloat(packet: Uint8Array | null): Float32Array;
    free(): void;
  }

  /** @deprecated 用 OpusEncoderHandle */
  export type OpusEncoder = OpusEncoderHandle;

  export function createEncoder(options?: {
    sampleRate?: number;
    channels?: number;
    application?: number;
    frameSize?: number;
    bitrate?: number | "auto" | "max";
  }): Promise<OpusEncoderHandle>;

  export function createDecoder(options?: {
    sampleRate?: number;
    channels?: number;
    maxFrameSize?: number;
  }): Promise<OpusDecoderHandle>;
}
