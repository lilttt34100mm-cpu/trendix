/* Trendix — cosmos hero 3D scene.
   Dynamically imported by main.js only on capable, non-touch, non-reduced-motion
   desktop viewports (see initCosmosScene). Self-hosted — Three.js core resolves
   via the import map in index.html; the postprocessing addons are vendored
   locally under vendor/three/examples/jsm, no CDN fetch at runtime. */

import * as THREE from "three";
import { EffectComposer } from "./vendor/three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./vendor/three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js";

const STAR_LAYERS = 3;
const STARS_PER_LAYER = 2600;
const PIN_DISTANCE = "+=60%";

const CAMERA_START = { x: 0, y: 26, z: 150 };
const CAMERA_SETTLED = { x: 0, y: 34, z: -30 };

const MOUNTAIN_LAYERS = [
  { distance: -50, height: 60, color: 0x0d1220, opacity: 1 },
  { distance: -100, height: 80, color: 0x121728, opacity: 0.85 },
  { distance: -150, height: 100, color: 0x1a2138, opacity: 0.65 },
  { distance: -200, height: 120, color: 0x232d48, opacity: 0.4 }
];

export function initCosmosHero({ canvas, heroEl }) {
  const state = {
    scene: null,
    camera: null,
    renderer: null,
    composer: null,
    stars: [],
    nebula: null,
    mountains: [],
    animationId: null,
    running: true,
    smoothCam: { x: CAMERA_START.x, y: CAMERA_START.y, z: CAMERA_START.z },
    targetCam: { x: CAMERA_START.x, y: CAMERA_START.y, z: CAMERA_START.z }
  };

  setup();
  bindScroll();
  bindResize();
  bindVisibility();
  animate();

  return {
    destroy: () => teardown(state)
  };

  function setup() {
    state.scene = new THREE.Scene();
    state.scene.fog = new THREE.FogExp2(0x000000, 0.00025);

    state.camera = new THREE.PerspectiveCamera(
      75,
      heroEl.clientWidth / heroEl.clientHeight,
      0.1,
      2000
    );
    state.camera.position.set(CAMERA_START.x, CAMERA_START.y, CAMERA_START.z);

    state.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    state.renderer.setSize(heroEl.clientWidth, heroEl.clientHeight);
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    state.renderer.toneMappingExposure = 0.5;

    state.composer = new EffectComposer(state.renderer);
    state.composer.addPass(new RenderPass(state.scene, state.camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(heroEl.clientWidth, heroEl.clientHeight),
      0.65,
      0.4,
      0.82
    );
    state.composer.addPass(bloom);

    createStarField(state);
    createNebula(state);
    createMountains(state);
    createAtmosphere(state);
  }

  function bindScroll() {
    if (!window.gsap || !window.ScrollTrigger) return;
    window.ScrollTrigger.create({
      trigger: heroEl,
      start: "top top",
      end: PIN_DISTANCE,
      pin: true,
      pinSpacing: true,
      scrub: 1,
      onUpdate: (self) => {
        const p = self.progress;
        state.targetCam.x = lerp(CAMERA_START.x, CAMERA_SETTLED.x, p);
        state.targetCam.y = lerp(CAMERA_START.y, CAMERA_SETTLED.y, p);
        state.targetCam.z = lerp(CAMERA_START.z, CAMERA_SETTLED.z, p);
      }
    });
  }

  function bindResize() {
    window.addEventListener("resize", onResize);
  }

  function onResize() {
    const w = heroEl.clientWidth;
    const h = heroEl.clientHeight;
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(w, h);
    state.composer.setSize(w, h);
  }

  function bindVisibility() {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          state.running = entry.isIntersecting;
          if (state.running && !state.animationId) animate();
        });
      },
      { threshold: 0 }
    );
    io.observe(heroEl);
  }

  function animate() {
    if (!state.running) {
      state.animationId = null;
      return;
    }
    state.animationId = requestAnimationFrame(animate);

    const time = Date.now() * 0.001;

    state.stars.forEach((field) => {
      if (field.material.uniforms) field.material.uniforms.time.value = time;
    });
    if (state.nebula && state.nebula.material.uniforms) {
      state.nebula.material.uniforms.time.value = time * 0.5;
    }

    const smoothing = 0.05;
    state.smoothCam.x += (state.targetCam.x - state.smoothCam.x) * smoothing;
    state.smoothCam.y += (state.targetCam.y - state.smoothCam.y) * smoothing;
    state.smoothCam.z += (state.targetCam.z - state.smoothCam.z) * smoothing;

    const floatX = Math.sin(time * 0.1) * 2;
    const floatY = Math.cos(time * 0.15) * 1;
    state.camera.position.x = state.smoothCam.x + floatX;
    state.camera.position.y = state.smoothCam.y + floatY;
    state.camera.position.z = state.smoothCam.z;
    state.camera.lookAt(0, 10, -600);

    state.mountains.forEach((mountain, i) => {
      const parallax = 1 + i * 0.5;
      mountain.position.x = Math.sin(time * 0.1) * 2 * parallax;
      mountain.position.y = 50 + Math.cos(time * 0.15) * 1 * parallax;
    });

    state.composer.render();
  }

  function teardown() {
    state.running = false;
    if (state.animationId) cancelAnimationFrame(state.animationId);
    window.removeEventListener("resize", onResize);
    state.stars.forEach((f) => { f.geometry.dispose(); f.material.dispose(); });
    state.mountains.forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
    if (state.nebula) { state.nebula.geometry.dispose(); state.nebula.material.dispose(); }
    if (state.renderer) state.renderer.dispose();
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function createStarField(state) {
  for (let i = 0; i < STAR_LAYERS; i++) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(STARS_PER_LAYER * 3);
    const colors = new Float32Array(STARS_PER_LAYER * 3);
    const sizes = new Float32Array(STARS_PER_LAYER);

    for (let j = 0; j < STARS_PER_LAYER; j++) {
      const radius = 200 + Math.random() * 800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[j * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[j * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[j * 3 + 2] = radius * Math.cos(phi);

      const color = new THREE.Color();
      const choice = Math.random();
      if (choice < 0.7) {
        color.setHSL(0, 0, 0.8 + Math.random() * 0.2);
      } else if (choice < 0.88) {
        color.setHSL(0.55, 0.65, 0.75);
      } else {
        color.setHSL(0.72, 0.6, 0.78);
      }

      colors[j * 3] = color.r;
      colors[j * 3 + 1] = color.g;
      colors[j * 3 + 2] = color.b;
      sizes[j] = Math.random() * 2 + 0.5;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, depth: { value: i } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        uniform float depth;
        void main() {
          vColor = color;
          vec3 pos = position;
          float angle = time * 0.05 * (1.0 - depth * 0.3);
          mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
          pos.xy = rot * pos.xy;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float opacity = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor, opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    state.scene.add(points);
    state.stars.push(points);
  }
}

function createNebula(state) {
  const geometry = new THREE.PlaneGeometry(8000, 4000, 100, 100);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color1: { value: new THREE.Color(0x2563eb) },
      color2: { value: new THREE.Color(0x8b5cf6) },
      opacity: { value: 0.28 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying float vElevation;
      uniform float time;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float elevation = sin(pos.x * 0.01 + time) * cos(pos.y * 0.01 + time) * 20.0;
        pos.z += elevation;
        vElevation = elevation;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color1;
      uniform vec3 color2;
      uniform float opacity;
      uniform float time;
      varying vec2 vUv;
      varying float vElevation;
      void main() {
        float mixFactor = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time);
        vec3 color = mix(color1, color2, mixFactor * 0.5 + 0.5);
        float alpha = opacity * (1.0 - length(vUv - 0.5) * 2.0);
        alpha *= 1.0 + vElevation * 0.01;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const nebula = new THREE.Mesh(geometry, material);
  nebula.position.z = -1050;
  state.scene.add(nebula);
  state.nebula = nebula;
}

function createMountains(state) {
  MOUNTAIN_LAYERS.forEach((layer, index) => {
    const points = [];
    const segments = 50;
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments - 0.5) * 1000;
      const y =
        Math.sin(i * 0.1) * layer.height +
        Math.sin(i * 0.05) * layer.height * 0.5 +
        Math.random() * layer.height * 0.2 -
        100;
      points.push(new THREE.Vector2(x, y));
    }
    points.push(new THREE.Vector2(5000, -300));
    points.push(new THREE.Vector2(-5000, -300));

    const shape = new THREE.Shape(points);
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
      color: layer.color,
      transparent: true,
      opacity: layer.opacity,
      side: THREE.DoubleSide
    });

    const mountain = new THREE.Mesh(geometry, material);
    mountain.position.z = layer.distance;
    mountain.position.y = layer.distance;
    mountain.userData = { baseZ: layer.distance, index };
    state.scene.add(mountain);
    state.mountains.push(mountain);
  });
}

function createAtmosphere(state) {
  const geometry = new THREE.SphereGeometry(600, 32, 32);
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      uniform float time;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        vec3 atmosphere = vec3(0.35, 0.5, 1.0) * intensity;
        float pulse = sin(time * 2.0) * 0.1 + 0.9;
        atmosphere *= pulse;
        gl_FragColor = vec4(atmosphere, intensity * 0.25);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true
  });

  const atmosphere = new THREE.Mesh(geometry, material);
  state.scene.add(atmosphere);
}
