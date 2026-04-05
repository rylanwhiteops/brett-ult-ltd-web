'use client';

/**
 * SprinklerModel — Scroll-jacked 3D sprinkler pump
 *
 * Renderer: autoClear=true, clear() before every frame, powerPreference high-performance,
 *           setPixelRatio(devicePixelRatio), no CSS background on canvas
 * Material:  matte gold #B8860B — metalness 0.7, roughness 0.6
 * Lights:    gold key 4.0, orange fill 1.0, white rim 2.0
 * Grouping:  single THREE.Object3D parent — only parent ever transforms
 * Dissolve:  solid phase doubled (0→0.55 solid, then transition)
 * Zoom:      z 6.2→4.8 (never closer than 40% of start; 4.8/6.2=77%)
 * Base:      centroid-Y filter removes platform meshes
 * Desktop-only — hard bail on mobile
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const lerp    = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const invLerp = (a: number, b: number, v: number) => clamp01((v - a) / (b - a));

export default function SprinklerModel() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (window.innerWidth < 768) return; // desktop only

    const getW = () => mount.clientWidth  || Math.round(window.innerWidth * 0.6);
    const getH = () => mount.clientHeight || window.innerHeight;

    /* ── Renderer ────────────────────────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({
      antialias:       true,
      alpha:           true,
      powerPreference: 'high-performance',
    });
    renderer.autoClear           = true;                        // no ghost lines
    renderer.setClearColor(0x000000, 0);                        // fully transparent
    renderer.setPixelRatio(window.devicePixelRatio);            // crisp on retina
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    renderer.setSize(getW(), getH());
    renderer.domElement.style.background = '';                  // no CSS bg on canvas
    mount.appendChild(renderer.domElement);

    /* ── Scene ───────────────────────────────────────────────────────────── */
    const scene = new THREE.Scene();

    /* ── Environment (low intensity — lights do the heavy work) ─────────── */
    const pmrem  = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
    scene.environment          = envTex;
    scene.environmentIntensity = 0.2;
    pmrem.dispose();

    /* ── Camera ─────────────────────────────────────────────────── */
    const camera = new THREE.PerspectiveCamera(38, getW() / getH(), 0.01, 200);
    camera.position.set(0, 0.4, 6.2);
    camera.lookAt(-1.4, 0.0, 0);

    /* ── Lights ──────────────────────────────────────────────────────────
       Gold key (upper-right) + orange fill (left) + white rim (behind)
    ── */
    scene.add(new THREE.AmbientLight(0x1a1000, 1.5));

    const keyLight = new THREE.PointLight(0xD4A017, 4.0, 35);
    keyLight.position.set(6, 9, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(512, 512);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0xFF6B00, 1.0, 28);
    fillLight.position.set(-5, 1, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 2.0);
    rimLight.position.set(0, 2, -8);
    scene.add(rimLight);

    /* ── Material — matte industrial gold ───────────────────────────────── */
    const goldBase = new THREE.MeshStandardMaterial({
      color:               new THREE.Color('#B8860B'),
      metalness:           0.7,
      roughness:           0.6,
      envMapIntensity:     0.4,
      transparent:         true,
      opacity:             1,
      polygonOffset:       true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits:  1,
    });

    const wireBase = new THREE.LineBasicMaterial({
      color:       0xD4A017,
      transparent: true,
      opacity:     0,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    });

    /* ── Mouse ───────────────────────────────────────────────────────────── */
    const mouse = { x: 0, y: 0 };
    const onMouse = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth  - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    /* ── Resize ──────────────────────────────────────────────────────────── */
    const onResize = () => {
      renderer.setSize(getW(), getH());
      camera.aspect = getW() / getH();
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize, { passive: true });

    /* ── Scroll / ScrollTrigger ──────────────────────────────────────────── */
    const progress = { value: 0 };

    const st = ScrollTrigger.create({
      trigger: '#hero',
      start:   'top top',
      end:     '+=220%',
      pin:     true,
      scrub:   1.0,
      onUpdate: (self) => {
        progress.value = self.progress;
        const t = invLerp(0, 0.28, self.progress);
        const copyEl = document.getElementById('hero-copy');
        if (copyEl) {
          copyEl.style.opacity   = String(lerp(1, 0, t));
          copyEl.style.transform = `translateX(${lerp(0, -50, t)}px)`;
        }
        const maskEl = document.getElementById('model-mask');
        if (maskEl) maskEl.style.opacity = String(lerp(1, 0, t));
      },
    });

    /* ── Model state ─────────────────────────────────────────────────────── */
    interface SolidEntry { mat: THREE.MeshStandardMaterial }
    interface WireEntry  { mat: THREE.LineBasicMaterial    }
    let solidEntries: SolidEntry[] = [];
    let wireEntries:  WireEntry[]  = [];

    // Single parent — ONLY this ever transforms; individual meshes never move
    const parent = new THREE.Object3D();
    scene.add(parent);

    let baseRotY = 0;

    /* ── GLB Load — DRACOLoader ready (handles compressed or plain GLB) ─── */
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load('/red_sprinkler_pump.glb', (gltf) => {
      const root = gltf.scene;

      // Log mesh count so we can verify all children are present
      let meshCount = 0;
      root.traverse(c => { if ((c as THREE.Mesh).isMesh) meshCount++; });
      console.log(`[SprinklerModel] GLB loaded — ${meshCount} meshes`);

      /* 1. Normalise scale to 3-unit bounding box */
      const fullBox   = new THREE.Box3().setFromObject(root);
      const fullSize  = fullBox.getSize(new THREE.Vector3());
      const normScale = 3.0 / Math.max(fullSize.x, fullSize.y, fullSize.z);
      root.scale.setScalar(normScale);
      const fullCentre = fullBox.getCenter(new THREE.Vector3());
      root.position.sub(fullCentre.multiplyScalar(normScale));

      /* 2. Base-platform centroid filter */
      const scaledBox = new THREE.Box3().setFromObject(root);
      const modelH    = scaledBox.max.y - scaledBox.min.y;
      // Hide any mesh whose centroid sits in the bottom 35% — that's the base disc
      const centroidThreshold = scaledBox.min.y + modelH * 0.35;

      /* 3. Apply material to EVERY mesh; hide only base-platform pieces */
      root.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mesh = child as THREE.Mesh;
        mesh.castShadow    = true;
        mesh.receiveShadow = true;

        const mb        = new THREE.Box3().setFromObject(mesh);
        const centroidY = (mb.min.y + mb.max.y) * 0.5;
        if (centroidY < centroidThreshold) {
          mesh.visible = false;
          return;
        }

        const solidMat = goldBase.clone() as THREE.MeshStandardMaterial;
        mesh.material  = solidMat;
        solidEntries.push({ mat: solidMat });

        const edges   = new THREE.EdgesGeometry(mesh.geometry, 20);
        const wireMat = wireBase.clone() as THREE.LineBasicMaterial;
        const lines   = new THREE.LineSegments(edges, wireMat);
        lines.renderOrder = 1;
        mesh.add(lines);
        wireEntries.push({ mat: wireMat });
      });

      /* 4. Re-centre on visible geometry */
      const visBox = new THREE.Box3();
      root.traverse(c => {
        if ((c as THREE.Mesh).isMesh && c.visible) visBox.expandByObject(c);
      });
      if (!visBox.isEmpty()) {
        root.position.y -= visBox.getCenter(new THREE.Vector3()).y;
      }

      /* 5. Scale group so visible portion fills target world size */
      const visSize = new THREE.Box3();
      root.traverse(c => { if ((c as THREE.Mesh).isMesh && c.visible) visSize.expandByObject(c); });
      const visDim = Math.max(...visSize.getSize(new THREE.Vector3()).toArray());
      parent.scale.setScalar(visDim > 0.001 ? 3.9 / visDim : 1);

      /* 6. Add root under the single parent — nothing else ever moves */
      parent.add(root);
    });

    /* ── RAF 30fps ───────────────────────────────────────────────────────── */
    const FRAME_MS = 1000 / 30;
    let lastFrame  = 0, rafId = 0, lerpRX = 0, lerpRY = 0, lastP = -1;

    // Camera path: start z=6.2, end z=4.8 — never closer than 40% of 6.2 (2.48)
    const CAM_START  = new THREE.Vector3(0, 0.4,  6.2);
    const CAM_END    = new THREE.Vector3(0, 0.3,  4.8);
    // LookAt sweeps from offset-left (model appears right) to centre
    const LOOK_START = new THREE.Vector3(-1.4, 0.0, 0);
    const LOOK_END   = new THREE.Vector3( 0,   0.0, 0);
    const LOOK_NOW   = new THREE.Vector3();

    const loop = (ts: number) => {
      rafId = requestAnimationFrame(loop);
      if (ts - lastFrame < FRAME_MS) return;
      lastFrame = ts;

      renderer.clear(); // explicit clear — no ghost/artifact lines

      const p = progress.value;

      /* Camera */
      camera.position.lerpVectors(CAM_START, CAM_END, p);
      LOOK_NOW.lerpVectors(LOOK_START, LOOK_END, clamp01(p / 0.55));
      camera.lookAt(LOOK_NOW);

      /* Dissolve — solid phase doubled: solid 0→0.55, transition 0.55→0.78, wire 0.78→0.92, fade 0.92→1 */
      if (Math.abs(p - lastP) > 0.002) {
        lastP = p;

        const solidOpacity =
          p < 0.55 ? 1 :
          p < 0.78 ? lerp(1, 0, invLerp(0.55, 0.78, p)) :
          0;

        const wireOpacity =
          p < 0.55 ? 0 :
          p < 0.78 ? lerp(0, 1, invLerp(0.55, 0.78, p)) :
          p < 0.92 ? 1 :
                     lerp(1, 0, invLerp(0.92, 1.00, p));

        solidEntries.forEach(({ mat }) => {
          mat.opacity = Math.max(0, solidOpacity);
          mat.visible = solidOpacity > 0.005;
        });
        wireEntries.forEach(({ mat }) => {
          mat.opacity = Math.max(0, wireOpacity * 0.88);
        });
      }

      /* Rotate single parent only */
      baseRotY += 0.004 * (1 - clamp01(p * 4));
      const mf = 1 - clamp01(p * 5);
      lerpRX += (mouse.y * -0.18 * mf - lerpRX) * 0.05;
      lerpRY += (mouse.x *  0.16 * mf - lerpRY) * 0.05;
      parent.rotation.y = baseRotY + lerpRY;
      parent.rotation.x = lerpRX;

      /* Gold key light tracks mouse */
      keyLight.position.x = 6 + mouse.x * 2;
      keyLight.position.y = 9 + mouse.y * -1.5;

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(loop);

    /* ── Cleanup ─────────────────────────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize',    onResize);
      st.kill();
      const copyEl = document.getElementById('hero-copy');
      if (copyEl) { copyEl.style.opacity = '1'; copyEl.style.transform = ''; }
      const maskEl = document.getElementById('model-mask');
      if (maskEl) maskEl.style.opacity = '1';
      goldBase.dispose();
      wireBase.dispose();
      envTex.dispose();
      dracoLoader.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0 }}
    />
  );
}
