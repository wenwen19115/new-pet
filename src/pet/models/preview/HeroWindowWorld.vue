<template>
  <div
    class="hero-window-world"
    :data-tod="tod"
    :data-weather="weather"
    :data-family="family"
    :data-clip-actor="clipActor ? '1' : '0'"
    :class="{
      'rainbow-event': rainbow,
      'bolt-flash': weather === 'egg-thunder' || weather === 'thunder',
    }"
    :style="stageStyle"
  >
    <div class="world">
      <div class="room-wall"></div>
      <div class="view-port">
        <div class="sky-layer">
          <div class="sky-wash"></div>
          <div class="stars" :style="{ opacity: starsOpacity }" />
          <div class="stars-dense" :style="{ opacity: starsDenseOpacity }" />
          <div class="sun" :class="{ eclipse: sunEclipse }" :style="sunStyle"><span class="aura" /><span class="core" /><span class="deco" /></div>
          <div class="moon" :class="{ eclipse: moonEclipse }" :style="moonStyle"><span class="aura" /><span class="core" /><span class="deco" /></div>
          <div class="mount far"><i class="snow-cap"></i></div>
          <div class="mount mid"><i class="snow-cap"></i></div>
          <div class="mount near">
            <i class="mt-body"><i class="snow-cap"></i></i>
            <i class="crater"></i><i class="lava-glow"></i><i class="lava-jet"></i>
            <i class="plume p-base"></i><i class="plume p-mid"></i><i class="plume p-top"></i>
            <i class="ember-field"></i>
          </div>
          <div class="wx-veil"></div>
          <div class="wave w1"></div><div class="wave w2"></div>
          <div class="cloud c1 fluff"><span class="p p1"></span><span class="p p2"></span><span class="p p3"></span><span class="p p4"></span><span class="p p5"></span></div>
          <div class="cloud c2 streak"><span class="p p1"></span><span class="p p2"></span><span class="p p3"></span><span class="p p4"></span><span class="p p5"></span></div>
          <div class="cloud c3 wispy"><span class="p p1"></span><span class="p p2"></span><span class="p p3"></span><span class="p p4"></span><span class="p p5"></span></div>
          <div class="cloud c4 anvil"><span class="p p1"></span><span class="p p2"></span><span class="p p3"></span><span class="p p4"></span><span class="p p5"></span></div>
          <div class="cloud c5 bank"><span class="p p1"></span><span class="p p2"></span><span class="p p3"></span><span class="p p4"></span><span class="p p5"></span></div>
          <div class="cloud c6 fluff"><span class="p p1"></span><span class="p p2"></span><span class="p p3"></span><span class="p p4"></span><span class="p p5"></span></div>
          <div class="rain r1"></div><div class="rain r2"></div><div class="rain r3"></div>
          <div class="rain-mist"></div>
          <div class="snow s1"></div><div class="snow s2"></div><div class="snow s3"></div>
          <div class="fog"></div>
          <div class="wind-streak"></div>
          <div class="dust"></div>
          <div class="haze"></div>
          <div class="hail h1"></div><div class="hail h2"></div><div class="hail h3"></div>
          <div class="lightning"></div>
          <div class="rainbow"></div>
          <div class="aurora a1"></div><div class="aurora a2"></div><div class="aurora a3"></div>
          <div class="tornado">
            <i class="t-meso"></i>
            <i class="t-column">
              <i class="wisps"></i>
              <i class="swirl s1"></i><i class="swirl s2"></i><i class="swirl s3"></i><i class="swirl s4"></i>
              <i class="swirl s5"></i><i class="swirl s6"></i><i class="swirl s7"></i><i class="swirl s8"></i>
              <i class="leaf l1"></i><i class="leaf l2"></i><i class="leaf l3"></i>
              <i class="leaf l4"></i><i class="leaf l5"></i><i class="leaf l6"></i>
            </i>
            <i class="t-dust"></i>
          </div>
          <div class="fx-bits" />
          <div class="flyers">
            <div
              v-for="ev in flyerNodes"
              :key="ev.key"
              class="flyer"
              :class="ev.kind"
            >
              <template v-if="ev.kind === 'meteor'">
                <i class="m-tail" /><i class="m-head" />
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 窗玻璃水珠（雨天）：只有珠子，无滑动淌痕 -->
      <div class="glass-wet">
        <div class="beads"></div>
      </div>

      <!-- 各族窗框（角色后） -->
      <div class="win win-wood">
        <div class="frame"></div><div class="grid"></div><div class="rail"></div>
      </div>
      <div class="win win-ink">
        <div class="frame"></div><div class="scroll-bar"></div><div class="seal"></div>
      </div>
      <div class="win win-geo">
        <div class="frame"></div><div class="cut"></div><div class="slash"></div>
      </div>
      <div class="win win-neon">
        <div class="frame"></div>
        <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
        <div class="scan"></div>
      </div>
      <div class="win win-zen">
        <div class="lintel"></div><div class="moon-gate"></div>
      </div>
      <div class="win win-ceramic">
        <div class="arch"><div class="tiles"></div></div>
      </div>
      <div class="win win-cold">
        <div class="frame"></div><div class="crack"></div>
      </div>
      <div class="win win-warm">
        <div class="frame"></div><div class="bar v"></div><div class="bar h"></div>
        <i class="boss tl"></i><i class="boss tr"></i><i class="boss bl"></i><i class="boss br"></i>
      </div>
      <div class="win win-dark">
        <div class="arch"></div><div class="inner"></div><div class="tracery"></div>
      </div>
      <div class="win win-ornate">
        <div class="frame"></div><div class="vine"></div><div class="vine r"></div>
      </div>

      <div class="sill-layer">
        <div class="sill-kit sill-wood"><div class="plane"></div></div>
        <div class="sill-kit sill-ink"><div class="plane"></div></div>
        <div class="sill-kit sill-geo"><div class="plane"></div></div>
        <div class="sill-kit sill-neon"><div class="plane"></div></div>
        <div class="sill-kit sill-zen"><div class="plane"></div></div>
        <div class="sill-kit sill-ceramic"><div class="plane"></div></div>
        <div class="sill-kit sill-cold"><div class="plane"></div></div>
        <div class="sill-kit sill-warm"><div class="plane"></div></div>
        <div class="sill-kit sill-dark"><div class="plane"></div></div>
        <div class="sill-kit sill-ornate"><div class="plane"></div></div>
        <div class="sill-lip"></div>

        <div class="clutter">
          <div class="kit kit-wood">
            <div class="obj tea"></div><div class="obj bonsai"></div><div class="obj meiping"></div>
            <div class="obj scroll"></div><div class="obj fruit"></div><div class="obj lantern"></div>
          </div>
          <div class="kit kit-ink">
            <div class="obj inkstone"></div><div class="obj seal"></div><div class="obj brush-pot"></div>
            <div class="obj paper"></div><div class="obj weight"></div><div class="obj rest"></div>
          </div>
          <div class="kit kit-geo">
            <div class="obj block"></div><div class="obj tri"></div><div class="obj cyl"></div>
            <div class="obj sphere"></div><div class="obj bar"></div><div class="obj mark"></div>
          </div>
          <div class="kit kit-neon">
            <div class="obj cart">CHIP</div><div class="obj can"></div><div class="obj tube"></div>
            <div class="obj board"></div><div class="obj dial"></div><div class="obj pixel"></div>
          </div>
          <div class="kit kit-zen">
            <div class="obj stone"></div><div class="obj bowl"></div><div class="obj incense"></div>
            <div class="obj pebbles"></div><div class="obj coaster"></div><div class="obj rake"></div>
          </div>
          <div class="kit kit-ceramic">
            <div class="obj jar"></div><div class="obj dish"></div><div class="obj blue-vase"></div>
            <div class="obj cup"></div><div class="obj spoon"></div><div class="obj gaiwan"></div>
          </div>
          <div class="kit kit-cold">
            <div class="obj crystal"></div><div class="obj flake"></div><div class="obj ice-jar"></div>
            <div class="obj lamp"></div><div class="obj shards"></div><div class="obj globe"></div>
          </div>
          <div class="kit kit-warm">
            <div class="obj clay"></div><div class="obj basket"></div><div class="obj brass"></div>
            <div class="obj loaf"></div><div class="obj spice"></div><div class="obj mug"></div>
          </div>
          <div class="kit kit-dark">
            <div class="obj tome"></div><div class="obj phial"></div><div class="obj candle"></div>
            <div class="obj key"></div><div class="obj watch"></div><div class="obj quill"></div>
          </div>
          <div class="kit kit-ornate">
            <div class="obj cloisonne"></div><div class="obj casket"></div><div class="obj gilt"></div>
            <div class="obj fan"></div><div class="obj jewel"></div><div class="obj ribbon"></div>
          </div>
        </div>
      </div>

      <div class="actor-shadow" />
      <div class="actor-layer">
        <slot name="actor" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, toRef, watch } from "vue";
import type { SkyEventId, SkyTodId, SkyWeatherId } from "@/pet/data/skyWeather";
import type { HeroWindowFamily } from "./themePackToFamily";
import { useCelestialArc } from "./useCelestialArc";
import "./heroWindowWorld/index.css";

const props = defineProps<{
  tod: SkyTodId;
  weather: SkyWeatherId;
  family: HeroWindowFamily;
  followClock?: boolean;
  rainbow?: boolean;
  events?: SkyEventId[];
  /** 演员框；缺省走 CSS 变量默认值 */
  previewActor?: {
    w: number;
    h: number;
    bottom?: string;
    z?: number;
  } | null;
  /** false：3D 轨道角色不硬裁，靠演员框与 maxBoost 控溢出 */
  clipActor?: boolean;
}>();

const followClock = computed(() => Boolean(props.followClock));
const clipActor = computed(() => props.clipActor !== false);
const { celestial } = useCelestialArc({
  tod: toRef(props, "tod"),
  weather: toRef(props, "weather"),
  followClock,
});

// 族色调变量由设置页 aside（heroMergedStyle）注入，这里继承即可
const stageStyle = computed(() => {
  const actor = props.previewActor;
  const actorVars: Record<string, string> = {};
  if (actor) {
    actorVars["--actor-w"] = `${actor.w}px`;
    actorVars["--actor-h"] = `${actor.h}px`;
    if (actor.bottom) actorVars["--actor-bottom"] = actor.bottom;
    if (actor.z != null) actorVars["--actor-z"] = `${actor.z}px`;
  }
  return {
    ...celestial.value.glowVars,
    ...actorVars,
  };
});

const sunStyle = computed(() => celestial.value.sunStyle);
const moonStyle = computed(() => celestial.value.moonStyle);
const starsOpacity = computed(() => celestial.value.starsOpacity);
const starsDenseOpacity = computed(() => celestial.value.starsDenseOpacity);
const sunEclipse = computed(() => celestial.value.sunEclipse);
const moonEclipse = computed(() => celestial.value.moonEclipse);

type FlyerNode = { key: string; kind: string };
const flyerNodes = ref<FlyerNode[]>([]);
let flyerSeq = 0;
const flyerTimeouts = new Set<number>();

watch(
  () => props.events?.slice() ?? [],
  (list, prev) => {
    const before = new Set(prev ?? []);
    for (const id of list) {
      if (before.has(id)) continue;
      if (id === "rainbow") continue;
      const kind =
        id === "santa"
          ? "santa"
          : id === "plane"
            ? "plane"
            : id === "spirit"
              ? "spirit"
              : id === "ufo"
                ? "ufo"
                : id === "witch"
                  ? "witch"
                  : id === "meteor"
                    ? "meteor"
                    : id;
      const key = `${id}-${flyerSeq++}`;
      flyerNodes.value = [...flyerNodes.value, { key, kind }];
      const tid = window.setTimeout(() => {
        flyerTimeouts.delete(tid);
        flyerNodes.value = flyerNodes.value.filter((n) => n.key !== key);
      }, id === "meteor" ? 2200 : 11000);
      flyerTimeouts.add(tid);
    }
  }
);

onUnmounted(() => {
  for (const tid of flyerTimeouts) window.clearTimeout(tid);
  flyerTimeouts.clear();
});
</script>

<style scoped>
.hero-window-world {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}
.hero-window-world :deep(.world) {
  pointer-events: none;
}
.actor-layer {
  pointer-events: auto !important;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 芯片 3D 不能靠本层 overflow 硬裁（会压扁），用略紧的演员框 + 角色 maxBoost */
  overflow: hidden;
}
.hero-window-world[data-clip-actor="0"] .actor-layer {
  overflow: visible;
}
.actor-layer > :deep(*) {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}
</style>
