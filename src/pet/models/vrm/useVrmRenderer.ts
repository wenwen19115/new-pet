import { computed, nextTick, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
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
import { getPetLocale } from "../../bridge/locale";
import { registerPetHitTester } from "@/pet/runtime/petHitBridge";
import { isPetHitHostWindow } from "@/pet/runtime/isPetHitHostWindow";

function defaultVrmLoadFailText(): string {
  return getPetLocale() === "en" ? "Failed to load model" : "模型加载失败";
}

export type VrmRendererProps = {
  src?: string | null;
  mood: PetMood;
  gaze: { x: number; y: number };
  motion?: PetIdleMotion | string;
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
  let raf = 0;
  let lastTs = 0;
  let disposed = false;
  let clockT = 0;
  let ro: ResizeObserver | null = null;
  let loadGen = 0;

  const smoothedQ: Partial<Record<VrmBoneName, THREE.Quaternion>> = {};
  const targetQ = new THREE.Quaternion();
  const targetE = new THREE.Euler(0, 0, 0, "XYZ");
  const lookTarget = new THREE.Vector3();
  const hitRaycaster = new THREE.Raycaster();
  const hitPointer = new THREE.Vector2();

  /** 只写 normalized；欧拉语义 = 相对 T-pose（见 docs/VRM_MOTION.md） */
  function boneNode(name: VrmBoneName) {
    return vrm?.humanoid?.getNormalizedBoneNode(name) ?? null;
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
    // 取景略放宽：跳/双马尾/裙摆易超出静态 AABB
    cameraDist = Math.max(height * 3.05, width * 3.55);

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

  function applyPose(dt: number) {
    if (!vrm?.humanoid || !modelRoot) return;
    clockT += dt;
    const motion = props.motion ?? "idle-float";
    const custom =
      typeof motion === "string" && isCustomVrmMotionId(motion)
        ? findCustomVrmMotion(props.customMotions ?? [], motion)
        : undefined;
    const pose = resolveVrmPose(motion, props.mood, clockT, {
      lifting: props.lifting,
      gaze: props.gaze,
      customPose: custom ? resolveCustomVrmPose(custom, clockT) : null,
    });
    const rate = props.lifting
      ? 14
      : motion === "vrm-walk"
        ? 7.5
        : motion === "idle-float"
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
    const gx = Math.max(-1, Math.min(1, props.gaze.x / 2.2));
    const gy = Math.max(-1, Math.min(1, props.gaze.y / 2.2));
    lookTarget.set(gx * 0.55, modelHeight * 0.72 - gy * 0.35, 1.35);
    modelRoot.localToWorld(lookTarget);
    vrm.lookAt.lookAt(lookTarget);
  }

  function applyBlink() {
    if (!vrm?.expressionManager) return;
    const blink = props.blinking || props.mood === "sleep" ? 1 : 0;
    vrm.expressionManager.setValue("blink", blink);
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
    () => props.motion,
    () => {
      clockT = 0;
    }
  );

  watch(
    () => props.lifting,
    (lifting) => {
      if (lifting) applyPose(0.2);
    }
  );

  return { loadError, displayError };
}
