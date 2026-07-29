export type ToonPix = { x: number; y: number; fill: string; opacity?: number };
export type ToonFloatParticle = {
  delay: string;
  dur: string;
  rise: string;
  drift: string;
  cells: ToonPix[];
};
export type ToonPalette = {
  fur: string;
  furD: string;
  furL: string;
  ear: string;
  earIn: string;
  outline: string;
  belly: string;
  nose: string;
  cheek: string;
};
