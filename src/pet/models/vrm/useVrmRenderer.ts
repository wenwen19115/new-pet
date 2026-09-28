import { computed, nextTick, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import {
  createVRMAnimationClip,
  VRMAnimationLoaderPlugin,
} from "@pixiv/three-vrm-animation";
import type { PetIdleMotion } from "../../content/motion/motions";
import type { PetMood } from "../../data/types";
import {
  resolveVrmPose,
  type BoneEuler,
  type VrmBoneName,
} from "../../data/vrmPoses";
import {
  findCustomVrmMotion,
  isCustomVrmMotionId,
  resolveCustomVrmPose,
  type CustomVrmMotion,
} from "../../content/motion/customVrmMotions";
import {
  findVrmaMotion,
  isVrmaClipMotion,
  resolveVrmRestMotion,
} from "../../content/motion/vrmaMotions";
import { getPetLocale } from "../../bridge/locale";
import { registerPetHitTester } from "@/pet/runtime/petHitBridge";
import { isPetHitHostWindow } from "@/pet/runtime/isPetHitHostWindow";
import { bakeVrmaClipInPlace } from "./vrmFraming";

function defaultVrmLoadFailText(): string {
  return getPetLocale() === "en" ? "Failed to load model" : "模型加载失败";
}

export type VrmRendererProps = {
  src?: string | null;
  mood: PetMood;
  gaze: { x: number; y: number };
  motion?: PetIdleMotion | string;
  /** 同 motion 再播时递增 */
  motionPlayId?: number;
  customMotions?: CustomVrmMotion[];
  blinking?: boolean;
  lifting?: boolean;
  faceYaw?: number;
  orbitYaw?: number;
  orbitPitch?: number;
  errorText?: string;
};

const FACE_FRONT = 0;

const BONE_NAMES: VrmBoneName[] = [
  "hips",
  "spine",
  "chest",
  "upperChest",
  "neck",
  "head",
  "leftShoulder",
  "rightShoulder",
  "leftUpperArm",
  "leftLowerArm",
  "leftHand",
  "rightUpperArm",
  "rightLowerArm",
  "rightHand",
  "leftUpperLeg",
  "leftLowerLeg",
  "rightUpperLeg",
  "rightLowerLeg",
];

export function useVrmRenderer(
  canvasRef: Ref<HTMLCanvasElement | null>,
  props: VrmRendererProps
) {
  const loadError = ref(false);
  const displayError = computed(
    () => props.errorText?.trim() || defaultVrmLoadFailText()
  );

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let vrm: VRM | null = null;
  let modelRoot: THREE.Group | null = null;
  let baseRootY = 0;
  let modelHeight = 1.5;
  let cameraDist = 3.2;
  /** fit 时的静息距离；待机 VRMA 保持此大小 */
  let restCameraDist = 3.2;
  let raf = 0;
  let lastTs = 0;
  let disposed = false;
  let clockT = 0;
  let ro: ResizeObserver | null = null;
  let loadGen = 0;
  let mixer: THREE.AnimationMixer | null = null;
  let currentVrmaAction: THREE.AnimationAction | null = null;
  let activeVrmaId: string | null = null;
  let vrmaPlayGen = 0;
  /** motion + playId；同 key 不重开，好让 once 手势停在末帧 */
  let vrmaSyncKey = "";
  const vrmaClipCache = new Map<string, THREE.AnimationClip>();
  const smoothedQ: Partial<Record<VrmBoneName, THREE.Quaternion>> = {};
  const targetQ = new THREE.Quaternion();
  const targetE = new THREE.Euler(0, 0, 0, "XYZ");
  const lookTarget = new THREE.Vector3();
  const hitRaycaster = new THREE.Raycaster();
  const hitPointer = new THREE.Vector2();
  const gazeAddE = new THREE.Euler(0, 0, 0, "XYZ");
  const gazeAddQ = new THREE.Quaternion();

  /** 只写 normalized；欧拉语义 = 相对 T-pose（见 docs/VRM_MOTION.md） */
  function boneNode(name: VrmBoneName) {
    return vrm?.humanoid?.getNormalizedBoneNode(name) ?? null;
  }

  function stopVrma(fadeSec = 0.2) {
    vrmaPlayGen += 1;
    if (currentVrmaAction) {
      currentVrmaAction.fadeOut(fadeSec);
      currentVrmaAction = null;
    }
    activeVrmaId = null;
    cameraDist = restCameraDist;
  }

  function disposeMixer() {
    stopVrma(0);
    mixer?.stopAllAction();
    mixer = null;
    vrmaClipCache.clear();
  }

  async function loadVrmaClip(
    motionId: string,
    target: VRM
  ): Promise<THREE.AnimationClip | null> {
    const def = findVrmaMotion(motionId);
    if (!def) return null;
    const cached = vrmaClipCache.get(motionId);
    if (cached) {
      bakeVrmaClipInPlace(cached);
      return cached;
    }
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
    try {
      const gltf = await loader.loadAsync(def.url);
      const anim = gltf.userData.vrmAnimations?.[0];
      if (!anim) return null;
      const clip = createVRMAnimationClip(anim, target);
      bakeVrmaClipInPlace(clip);
      vrmaClipCache.set(motionId, clip);
      return clip;
    } catch (err) {
      console.warn("[pet] vrma load failed", motionId, err);
      return null;
    }
  }

  async function playVrma(motionId: string) {
    if (!vrm || props.lifting) return;
    const def = findVrmaMotion(motionId);
    if (!def) return;
    const gen = ++vrmaPlayGen;
    const clip = await loadVrmaClip(motionId, vrm);
    if (disposed || gen !== vrmaPlayGen || !vrm || !clip) return;
    if (!mixer) mixer = new THREE.AnimationMixer(vrm.scene);
    const next = mixer.clipAction(clip);
    next.reset();
    if (def.loop) {
      next.setLoop(THREE.LoopRepeat, Infinity);
      next.clampWhenFinished = false;
    } else {
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
    }
    next.enabled = true;
    next.setEffectiveWeight(1);
    if (currentVrmaAction && currentVrmaAction !== next) {
      currentVrmaAction.crossFadeTo(next, 0.28, false);
    } else {
      next.fadeIn(0.22);
    }
    next.play();
    currentVrmaAction = next;
    activeVrmaId = motionId;
    cameraDist = restCameraDist;
  }

  /** 睡眠/拎起保留程序姿态；idle-float → 循环待机 VRMA */
  function resolvedMotionId(): string {
    const raw = props.motion ?? "idle-float";
    if (props.lifting) return raw;
    if (props.mood === "sleep") return raw;
    if (isCustomVrmMotionId(raw)) return raw;
    const rest = resolveVrmRestMotion(raw);
    return typeof rest === "string" ? rest : raw;
  }

  function syncVrmaFromProps() {
    const motion = resolvedMotionId();
    if (props.lifting || props.mood === "sleep" || !isVrmaClipMotion(motion)) {
      if (activeVrmaId) stopVrma(0.22);
      vrmaSyncKey = "";
      return;
    }
    const key = `${motion}@${props.motionPlayId ?? 0}`;
    // 同一次播放别重开：once + clampWhenFinished 才能停在末帧
    if (key === vrmaSyncKey) return;
    vrmaSyncKey = key;
    void playVrma(motion);
  }

  function lerpBone(
    name: VrmBoneName,
    target: BoneEuler | undefined,
    alpha: number
  ) {
    const node = boneNode(name);
    if (!node) return;
    targetE.set(target?.x ?? 0, target?.y ?? 0, target?.z ?? 0, "XYZ");
    targetQ.setFromEuler(targetE);
    if (!smoothedQ[name]) smoothedQ[name] = new THREE.Quaternion();
    smoothedQ[name]!.slerp(targetQ, alpha);
    node.quaternion.copy(smoothedQ[name]!);
  }

  function updateOrbitCamera() {
    if (!camera) return;
    const yaw = ((props.orbitYaw ?? 0) * Math.PI) / 180;
    const pitch = ((props.orbitPitch ?? 8) * Math.PI) / 180;
    const lift = modelRoot ? modelRoot.position.y - baseRootY : 0;
    // 下蹲跟满防裁脚；上跳只跟一小部分，否则 1:1 跟拍把跳高对消掉
    const camLift = lift >= 0 ? lift * 0.22 : lift;
    const lookY = modelHeight * 0.5 + camLift;
    const dist = cameraDist;
    const cp = Math.cos(pitch);
    camera.position.set(
      Math.sin(yaw) * cp * dist,
      lookY + Math.sin(pitch) * dist * 0.85,
      Math.cos(yaw) * cp * dist
    );
    camera.lookAt(0, lookY, 0);
    camera.updateProjectionMatrix();
  }

  function fitCameraToVrm(model: VRM) {
    if (!camera || !modelRoot) return;
    modelRoot.position.set(0, 0, 0);
    modelRoot.rotation.set(0, FACE_FRONT, 0);
    modelRoot.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model.scene);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    modelRoot.position.x = -center.x;
    modelRoot.position.z = -center.z;
    modelRoot.position.y = -box.min.y;
    modelRoot.updateMatrixWorld(true);
    baseRootY = modelRoot.position.y;

    const height = Math.max(0.2, size.y);
    const width = Math.max(0.1, size.x);
    modelHeight = height;
    cameraDist = Math.max(height * 3.05, width * 3.55);
    restCameraDist = cameraDist;

    camera.fov = 30;
    camera.near = Math.max(0.05, cameraDist / 100);
    camera.far = cameraDist * 40;
    updateOrbitCamera();
  }

  function hitTestNdc(ndcX: number, ndcY: number): boolean {
    // 模型未就绪时退回外层 AABB，避免加载期整窗穿透
    if (!camera || !vrm?.scene) return true;
    hitPointer.set(ndcX, ndcY);
    hitRaycaster.setFromCamera(hitPointer, camera);
    // 命中即停，避免整树收集全部交点
    const hits: THREE.Intersection[] = [];
    const stack: THREE.Object3D[] = [vrm.scene];
    while (stack.length) {
      const obj = stack.pop()!;
      if (!obj.visible) continue;
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.raycast(hitRaycaster, hits);
        if (hits.length > 0) return true;
      }
      const kids = obj.children;
      for (let i = kids.length - 1; i >= 0; i--) {
        stack.push(kids[i]!);
      }
    }
    return false;
  }

  /** 待机 VRMA 之上叠颈/头偏移（lookAt alone 很多模型几乎看不出） */
  function applyClipHeadGaze(gaze: { x: number; y: number }) {
    if (!vrm?.humanoid) return;
    // 无 head 轨时 mixer 不重置；multiply 会按帧累乘把脑袋转飞
    const clip = currentVrmaAction?.getClip();
    if (
      clip &&
      !clip.tracks.some((t) => /head\.quaternion$/i.test(t.name))
    ) {
      return;
    }
    const gx = Math.max(-1, Math.min(1, gaze.x / 2));
    const gy = Math.max(-1, Math.min(1, gaze.y / 2));
    const layers: Array<[VrmBoneName, number, number, number]> = [
      ["neck", -gy * 0.09, gx * 0.12, 0],
      ["head", -gy * 0.18, gx * 0.24, gx * 0.03],
    ];
    for (const [name, x, y, z] of layers) {
      const node = boneNode(name);
      if (!node) continue;
      gazeAddE.set(x, y, z, "XYZ");
      gazeAddQ.setFromEuler(gazeAddE);
      node.quaternion.multiply(gazeAddQ);
    }
    vrm.humanoid.update();
  }

  function applyPose(dt: number) {
    if (!vrm?.humanoid || !modelRoot) return;
    clockT += dt;

    if (props.lifting && activeVrmaId) {
      stopVrma(0.12);
    }

    const motion = resolvedMotionId();
    // VRMA：等 clip 就绪前别用程序姿态抢写（会 cancel 异步 play）
    if (!props.lifting && props.mood !== "sleep" && isVrmaClipMotion(motion)) {
      mixer?.update(dt);
      const def = findVrmaMotion(motion);
      if (def?.loop) applyClipHeadGaze(props.gaze);
      const yaw = FACE_FRONT + (props.faceYaw ?? 0);
      modelRoot.rotation.y +=
        (yaw - modelRoot.rotation.y) * Math.min(1, 1 - Math.exp(-dt * 8));
      return;
    }

    if (activeVrmaId) stopVrma(0.2);

    const poseMotion = props.motion ?? "idle-float";
    const custom =
      typeof poseMotion === "string" && isCustomVrmMotionId(poseMotion)
        ? findCustomVrmMotion(props.customMotions ?? [], poseMotion)
        : undefined;
    const pose = resolveVrmPose(poseMotion, props.mood, clockT, {
      lifting: props.lifting,
      gaze: props.gaze,
      customPose: custom ? resolveCustomVrmPose(custom, clockT) : null,
    });
    const rate = props.lifting
      ? 14
      : poseMotion === "vrm-walk"
        ? 7.5
        : poseMotion === "idle-float"
          ? 4.2
          : 7;
    const alpha = 1 - Math.exp(-dt * rate);

    for (const name of BONE_NAMES) {
      lerpBone(name, pose.bones[name], alpha);
    }

    // normalized → raw
    vrm.humanoid.update();

    const targetY = baseRootY + (pose.rootY ?? 0);
    modelRoot.position.y += (targetY - modelRoot.position.y) * alpha;
    const yaw = FACE_FRONT + (pose.rootYaw ?? 0) + (props.faceYaw ?? 0);
    modelRoot.rotation.y +=
      (yaw - modelRoot.rotation.y) * Math.min(1, alpha * 1.4);
  }

  function applyLookAt() {
    if (!vrm?.lookAt || props.lifting || !modelRoot) return;
    const motion = resolvedMotionId();
    // once 手势可能自带头/视线轨；待机循环仍跟鼠标
    if (isVrmaClipMotion(motion)) {
      const def = findVrmaMotion(motion);
      if (def && !def.loop) return;
    }
    const gx = Math.max(-1, Math.min(1, props.gaze.x / 2.2));
    const gy = Math.max(-1, Math.min(1, props.gaze.y / 2.2));
    lookTarget.set(gx * 0.55, modelHeight * 0.72 - gy * 0.35, 1.35);
    modelRoot.localToWorld(lookTarget);
    vrm.lookAt.lookAt(lookTarget);
  }

  function applyBlink() {
    if (!vrm?.expressionManager) return;
    const forceClosed = props.blinking || props.mood === "sleep";
    if (isVrmaClipMotion(resolvedMotionId())) {
      // 程序眨眼盖 clip；松手必须写 0，否则会一直闭眼
      vrm.expressionManager.setValue("blink", forceClosed ? 1 : 0);
      return;
    }
    vrm.expressionManager.setValue("blink", forceClosed ? 1 : 0);
    if (props.mood === "happy" || props.mood === "excited") {
      vrm.expressionManager.setValue("happy", 0.4);
    } else if (props.lifting) {
      vrm.expressionManager.setValue("happy", 0);
      try {
        vrm.expressionManager.setValue("surprised", 0.25);
      } catch {
        // expression may not exist
      }
    } else {
      vrm.expressionManager.setValue("happy", 0);
    }
  }

  function tick(now: number) {
    if (disposed) return;
    raf = 0;

    const sleepThrottle =
      props.mood === "sleep" && !props.lifting ? 100 : 0;
    if (sleepThrottle > 0 && lastTs && now - lastTs < sleepThrottle) {
      raf = requestAnimationFrame(tick);
      return;
    }

    const dt = lastTs ? Math.min(0.05, (now - lastTs) / 1000) : 0.016;
    lastTs = now;

    updateOrbitCamera();

    if (vrm) {
      applyPose(dt);
      applyLookAt();
      applyBlink();
      vrm.update(dt);
    }
    // 姿态改完再对一次相机，跳起时头顶才跟得上
    updateOrbitCamera();
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(tick);
  }

  function startRenderLoop() {
    if (disposed || raf) return;
    lastTs = 0;
    raf = requestAnimationFrame(tick);
  }

  function stopRenderLoop() {
    if (!raf) return;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") stopRenderLoop();
    else startRenderLoop();
  }

  function resizeToCanvas() {
    const canvas = canvasRef.value;
    if (!canvas || !renderer || !camera) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // 限制绘制缓冲，防止极端尺寸丢上下文（预览变灰块）
    const maxBuf = 2048;
    let width = Math.max(1, canvas.clientWidth || 180);
    let height = Math.max(1, canvas.clientHeight || 180);
    const bufW = width * dpr;
    const bufH = height * dpr;
    if (bufW > maxBuf || bufH > maxBuf) {
      const s = Math.min(maxBuf / bufW, maxBuf / bufH);
      width = Math.max(1, Math.floor(width * s));
      height = Math.max(1, Math.floor(height * s));
    }
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function disposeVrm() {
    disposeMixer();
    if (vrm) {
      modelRoot?.remove(vrm.scene);
      VRMUtils.deepDispose(vrm.scene);
      vrm = null;
    }
    for (const k of Object.keys(smoothedQ)) {
      delete smoothedQ[k as VrmBoneName];
    }
  }

  async function loadModel(url: string | null | undefined) {
    const gen = ++loadGen;
    disposeVrm();
    loadError.value = false;
    if (!url || !scene || !modelRoot) return;

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    try {
      const gltf = await loader.loadAsync(url);
      if (disposed || gen !== loadGen) {
        const loaded = gltf.userData.vrm as VRM | undefined;
        if (loaded) VRMUtils.deepDispose(loaded.scene);
        return;
      }
      const loaded = gltf.userData.vrm as VRM | undefined;
      if (!loaded) {
        loadError.value = true;
        return;
      }

      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.rotateVRM0(loaded);
      loaded.humanoid.autoUpdateHumanBones = true;

      vrm = loaded;
      modelRoot.add(vrm.scene);
      fitCameraToVrm(vrm);

      clockT = 0;
      applyPose(1);
      vrm.humanoid.update();
      vrm.update(0);
      syncVrmaFromProps();
    } catch (err) {
      console.warn("[pet] vrm load failed", url, err);
      if (gen === loadGen) loadError.value = true;
    }
  }

  function ensureScene() {
    const canvas = canvasRef.value;
    if (!canvas || renderer) return;

    const width = Math.max(1, canvas.clientWidth || 180);
    const height = Math.max(1, canvas.clientHeight || 180);

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x556688, 1.05);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(1.4, 2.4, 2.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xaad8ff, 0.5);
    rim.position.set(-1.6, 1.2, -1.0);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffe8d8, 0.28);
    fill.position.set(-0.4, 1.0, 1.8);
    scene.add(fill);

    modelRoot = new THREE.Group();
    scene.add(modelRoot);
  }

  onMounted(async () => {
    ensureScene();
    if (isPetHitHostWindow()) registerPetHitTester(hitTestNdc);
    await nextTick();
    resizeToCanvas();
    void loadModel(props.src);
    document.addEventListener("visibilitychange", onVisibilityChange);
    startRenderLoop();
    const canvas = canvasRef.value;
    if (canvas && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => resizeToCanvas());
      ro.observe(canvas);
    }
  });

  onUnmounted(() => {
    disposed = true;
    loadGen += 1;
    if (isPetHitHostWindow()) registerPetHitTester(null);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    ro?.disconnect();
    ro = null;
    stopRenderLoop();
    disposeVrm();
    renderer?.dispose();
    renderer = null;
    scene = null;
    camera = null;
    modelRoot = null;
  });

  watch(
    () => props.src,
    (next) => {
      void loadModel(next);
    }
  );

  watch(
    () => [props.orbitYaw, props.orbitPitch],
    () => {
      updateOrbitCamera();
    }
  );

  watch(
    () => [props.motion, props.motionPlayId, props.mood] as const,
    () => {
      clockT = 0;
      syncVrmaFromProps();
    }
  );

  watch(
    () => props.lifting,
    (lifting) => {
      if (lifting) {
        stopVrma(0.12);
        applyPose(0.2);
      } else {
        syncVrmaFromProps();
      }
    }
  );

  return { loadError, displayError };
}
