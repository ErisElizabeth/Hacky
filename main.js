import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import "./matrix-rain.js";

const mount = document.querySelector("#hacky-stage");
const status = document.querySelector("#model-status");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050608, 0.09);

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 1.15, 8.2);
camera.lookAt(0, 0.6, 0);

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.88;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
mount.appendChild(renderer.domElement);

// A low, cool fill keeps the silhouette readable while the warm key light
// brings out the rubber material without making the scene feel brightly lit.
scene.add(new THREE.HemisphereLight(0x31445c, 0x090709, 0.45));

const keyLight = new THREE.SpotLight(0xffd6a0, 34, 20, Math.PI / 5, 0.65, 1.35);
keyLight.position.set(-3.4, 5.7, 5.2);
keyLight.target.position.set(0, 0.7, 0);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.bias = -0.00015;
scene.add(keyLight, keyLight.target);

const rimLight = new THREE.DirectionalLight(0x78b8ff, 2.4);
rimLight.position.set(4.5, 2.6, -4);
scene.add(rimLight);

const faceFill = new THREE.PointLight(0xff9f70, 4.5, 8, 2);
faceFill.position.set(1.1, 1.2, 4);
scene.add(faceFill);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(4.2, 96),
  new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.58 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.54;
ground.receiveShadow = true;
scene.add(ground);

let hacky = null;
let targetTiltX = 0;
let targetTiltY = 0;
const clock = new THREE.Clock();

new GLTFLoader().load(
  "./assets/Hacky.glb",
  ({ scene: model }) => {
    const initialBounds = new THREE.Box3().setFromObject(model);
    const initialSize = initialBounds.getSize(new THREE.Vector3());
    const scale = 3.45 / Math.max(initialSize.y, 0.001);
    model.scale.setScalar(scale);

    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -bounds.min.y - 1.54, -center.z);

    model.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.filter(Boolean).forEach((material) => {
        if ("envMapIntensity" in material) material.envMapIntensity = 0.35;
        if ("roughness" in material) material.roughness = Math.max(material.roughness, 0.34);
      });
    });

    hacky = new THREE.Group();
    hacky.add(model);
    hacky.rotation.y = -0.16;
    scene.add(hacky);
    status.classList.add("is-hidden");
  },
  undefined,
  (error) => {
    console.error("Could not load Hacky.glb", error);
    status.textContent = "Hacky couldn't load. Try refreshing the page.";
    status.classList.add("has-error");
  },
);

function resize() {
  const width = mount.clientWidth;
  const height = mount.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
}

function updatePointer(event) {
  const rect = mount.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  targetTiltY = THREE.MathUtils.clamp(x * 0.17, -0.17, 0.17);
  targetTiltX = THREE.MathUtils.clamp(y * 0.08, -0.08, 0.08);
}

mount.addEventListener("pointermove", updatePointer);
mount.addEventListener("pointerleave", () => {
  targetTiltX = 0;
  targetTiltY = 0;
});

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(mount);
resize();

function animate() {
  const elapsed = clock.getElapsedTime();

  if (hacky) {
    hacky.rotation.x = THREE.MathUtils.lerp(hacky.rotation.x, targetTiltX, 0.045);
    hacky.rotation.y = THREE.MathUtils.lerp(hacky.rotation.y, -0.16 + targetTiltY, 0.045);
    hacky.position.y = reduceMotion ? 0 : Math.sin(elapsed * 1.15) * 0.035;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
