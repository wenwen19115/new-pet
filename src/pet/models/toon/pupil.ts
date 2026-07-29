export function resolveToonPupil(gaze: { x: number; y: number }): {
  ox: number;
  oy: number;
} {
  const inset = 0.35;
  const pupilSize = 1.2;
  const max = 3 - pupilSize - inset;
  const ox = Math.min(max, Math.max(inset, inset + 0.45 + gaze.x * 0.28));
  const oy = Math.min(max, Math.max(inset, inset + 0.35 + gaze.y * 0.22));
  return { ox, oy };
}
