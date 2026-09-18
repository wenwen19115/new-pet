import type { PetIdleMotion } from "../content/motion/motions";

export function remapChipMotion(motion: PetIdleMotion): PetIdleMotion {
  if (
    motion === "toon-walk" ||
    motion === "toon-wave" ||
    motion === "toon-spin" ||
    motion === "toon-read" ||
    motion === "toon-tea" ||
    motion === "toon-tilt" ||
    motion === "toon-sway" ||
    motion === "toon-water" ||
    motion === "toon-grass" ||
    motion === "toon-fire" ||
    motion === "toon-splash" ||
    motion === "toon-thunder" ||
    motion === "toon-dodge" ||
    motion === "screen-wormhole"
  ) {
    return motion === "screen-wormhole" ? "screen-zip" : "screen-dash";
  }
  return motion;
}

export function remapToonMotion(motion: PetIdleMotion): PetIdleMotion {
  switch (motion) {
    case "fly-orbit":
    case "figure-eight":
    case "toon-spin":
      return "toon-sway";
    case "fly-dash":
    case "barrel-roll":
    case "toon-wave":
    case "cartwheel":
      return "toon-walk";
    case "sway-step":
      return "toon-sway";
    case "bow-nod":
    case "toon-read":
      return "toon-tilt";
    case "stretch-up":
    case "toon-tea":
    case "toon-fire":
    case "toon-water":
    case "toon-splash":
    case "toon-dodge":
      return "toon-grass";
    case "screen-dash":
    case "screen-hop":
    case "screen-glide":
    case "screen-zip":
      return "screen-wormhole";
    default:
      return motion;
  }
}

export function remapVrmMotion(motion: PetIdleMotion): PetIdleMotion {
  switch (motion) {
    case "toon-wave":
      return "vrm-wave";
    case "bow-nod":
      return "vrm-sad";
    case "toon-read":
      return "vrm-think";
    case "toon-tea":
      return "vrm-peace";
    case "toon-tilt":
      return "vrm-think";
    case "stretch-up":
      return "vrm-surprise";
    case "victory-burst":
    case "happy-bounce":
      return "vrm-clap";
    case "tap-frenzy":
      return "vrm-angry";
    case "toon-water":
    case "toon-grass":
    case "toon-fire":
    case "toon-splash":
    case "toon-thunder":
    case "toon-dodge":
      return "vrm-peace";
    case "rocket-jump":
      return "vrm-jump";
    case "cartwheel":
      return "vrm-twirl";
    case "side-hop":
    case "tip-toe":
      return "vrm-blush";
    case "sway-step":
    case "toon-sway":
    case "toon-spin":
      return "vrm-relax";
    case "idle-float":
      return "vrm-idle";
    case "screen-dash":
    case "screen-hop":
    case "screen-zip":
    case "screen-glide":
    case "screen-wormhole":
    case "toon-walk":
    case "fly-dash":
    case "fly-orbit":
    case "figure-eight":
    case "barrel-roll":
    case "vrm-walk":
      return "vrm-look";
    default:
      return motion;
  }
}

export function remapFigMotion(motion: PetIdleMotion): PetIdleMotion {
  switch (motion) {
    case "fly-orbit":
    case "figure-eight":
      return "sway-step";
    case "fly-dash":
      return "side-hop";
    case "barrel-roll":
      return "happy-bounce";
    case "cartwheel":
      return "bow-nod";
    case "toon-walk":
      return "tip-toe";
    case "toon-wave":
    case "toon-water":
      return "happy-bounce";
    case "toon-sway":
    case "toon-grass":
      return "sway-step";
    case "toon-read":
      return "bow-nod";
    case "toon-tea":
    case "toon-fire":
      return "stretch-up";
    case "toon-tilt":
    case "toon-dodge":
      return "tip-toe";
    case "toon-splash":
      return "side-hop";
    case "toon-thunder":
      return "victory-burst";
    case "screen-dash":
    case "screen-hop":
    case "screen-zip":
    case "screen-wormhole":
      return "screen-glide";
    default:
      return motion;
  }
}

function remapToSoftBob(motion: PetIdleMotion): PetIdleMotion {
  switch (motion) {
    case "fly-orbit":
    case "figure-eight":
    case "toon-sway":
    case "toon-grass":
    case "idle-float":
      return "sway-step";
    case "fly-dash":
    case "side-hop":
    case "toon-splash":
      return "side-hop";
    case "barrel-roll":
    case "cartwheel":
    case "victory-burst":
    case "toon-thunder":
      return "happy-bounce";
    case "toon-walk":
    case "toon-tilt":
    case "toon-dodge":
      return "tip-toe";
    case "toon-wave":
    case "toon-water":
      return "happy-bounce";
    case "toon-read":
    case "bow-nod":
      return "bow-nod";
    case "toon-tea":
    case "toon-fire":
    case "stretch-up":
      return "stretch-up";
    case "screen-dash":
    case "screen-hop":
    case "screen-zip":
    case "screen-glide":
    case "screen-wormhole":
      return "sway-step";
    default:
      return motion;
  }
}

/** 杯杯：无手无腿，禁止碎步/侧跳/招手语义 */
export function remapMugCatMotion(motion: PetIdleMotion): PetIdleMotion {
  switch (motion) {
    case "mug-steam":
    case "mug-purr":
    case "mug-tip":
    case "mug-sip":
    case "mug-nap":
    case "mug-stare":
    case "sway-step":
    case "happy-bounce":
      return motion;
    case "bow-nod":
    case "tap-frenzy":
    case "stretch-up":
      return "mug-steam";
    case "toon-sway":
    case "idle-float":
      return "mug-purr";
    case "side-hop":
    case "tip-toe":
      return "mug-tip";
    case "rocket-jump":
      return "mug-sip";
    case "toon-read":
      return "mug-stare";
    case "victory-burst":
      return "happy-bounce";
    default:
      return remapToSoftBob(motion);
  }
}
