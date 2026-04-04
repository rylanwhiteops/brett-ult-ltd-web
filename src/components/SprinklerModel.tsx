'use client';

/**
 * SprinklerModel — Interactive 3D sprinkler pump with scroll-driven dissolve
 *
 * SCROLL EFFECT (scroll progress 0 → 1 as hero scrolls out):
 *   0 → 0.55  solid opacity 1→0  |  wire opacity 0→1   (solid dissolves INTO wireframe)
 *   0.55 → 1  wire opacity 1→0                          (wireframe fades out)
 *
 * Materials:
 *   - Gold MeshStandardMaterial (#D4A017, metalness 0.85) with RoomEnvironment
 *   - EdgesGeometry LineSegments added as children of each mesh (auto-inherit transforms)
 *
 * Lighting:
 *   - Gold PointLight above-right (#D4A017)
 *   - Warm fill left (#FF8C00)
 *   - Rim DirectionalLight from behind
 *   - Low AmbientLight to keep shadows readable
 *
 * Base removal: hides meshes whose bounding-box top is in the bottom 7% of model
 * Mouse: smooth lerped parallax tilt ±12°
 * Rotation: slow Y auto-rotation
 * Performance: 30fps cap, alpha canvas
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface WirePair { mat: THREE.LineBasicMaterial }
interface SolidMesh { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }

export default function SprinklerModel() {
  const mountRef       = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    /* ── Renderer ────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled  = true;
    renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    /* ── Scene ───────────────────────────────────── */
    const scene = new THREE.Scene();

    /* ── Environment map (RoomEnvironment for gold reflections) ── */
    const pmrem  = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
    scene.environment    = envTex;
    scene.environmentIntensity = 0.7;
    pmrem.dispose();

    /* ── Camera ──────────────────────────────────── */
    const camera = new THREE.PerspectiveCamera(
      36,
      mount.clientWidth / mount.clientHeight,
      0.01, 200,
    );
    camera.position.set(0, 0.4, 5.5);

    /* ── Lights ──────────────────────────────────── */
    // Low ambient — keeps shadows from going pure black
    scene.add(new THREE.AmbientLight(0x120a00, 2.2));

    // Gold key light — above-right
    const keyLight = new THREE.PointLight(0xD4A017, 180, 22);
    keyLight.position.set(4, 7, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    // Warm orange fill — left side, matches ember palette
    const fillLight = new THREE.PointLight(0xFF8C00, 35, 20);
    fillLight.position.set(-5, 1, 3);
    scene.add(fillLight);

    // Gold rim from behind-right — edge separation
    const rimLight = new THREE.DirectionalLight(0xD4A017, 0.55);
    rimLight.position.set(2, -1, -5);
    scene.add(rimLight);

    /* ── Gold material (shared, cloned per mesh) ─── */
    const goldBase = new THREE.MeshStandardMaterial({
      color:          new THREE.Color('#D4A017'),
      metalness:      0.88,
      roughness:      0.22,
      envMapIntensity: 1.3,
      transparent:    true,
      opacity:        1,
      polygonOffset:  true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits:  1,
    });

    /* ── Wire material (shared, cloned per edge set) */
    const wireBase = new THREE.LineBasicMaterial({
      color:       0xD4A017,
      transparent: true,
      opacity:     0,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    });

    /* ── Mouse state ─────────────────────────────── */
    const mouse = { x: 0, y: 0 };
    const onMouse = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth  - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    /* ── Resize ──────────────────────────────────── */
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize, { passive: true });

    /* ── State arrays filled after load ─────────── */
    let solidMeshes: SolidMesh[] = [];
    let wirePairs:   WirePair[]  = [];
    let modelGroup:  THREE.Group | null = null;

    /* ── RAF state ───────────────────────────────── */
    const FRAME_MS = 1000 / 30;
    let lastFrame  = 0;
    let rafId      = 0;
    let rotY       = 0;
    let lerpRX     = 0;
    let lerpRY     = 0;

    /* ── Load GLB ────────────────────────────────── */
    new GLTFLoader().load(
      '/red_sprinkler_pump.glb',

      (gltf) => {
        const root = gltf.scene;

        /* Centre + uniform scale */
        const box    = new THREE.Box3().setFromObject(root);
        const centre = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 2.8 / maxDim;

        root.scale.setScalar(scale);
        root.position.sub(centre.multiplyScalar(scale));

        /* Re-compute bounds after scale for base detection */
        const scaledBox = new THREE.Box3().setFromObject(root);
        const baseThreshold = scaledBox.min.y + (scaledBox.max.y - scaledBox.min.y) * 0.07;

        /* Apply gold material + build wire children */
        root.traverse((child) => {
          if (!(child as THREE.Mesh).isMesh) return;
          const mesh = child as THREE.Mesh;
          mesh.castShadow    = true;
          mesh.receiveShadow = true;

          /* Hide base platform meshes */
          const meshBox = new THREE.Box3().setFromObject(mesh);
          if (meshBox.max.y < baseThreshold) {
            mesh.visible = false;
            return;
          }

          /* Gold solid material */
          const solidMat = goldBase.clone() as THREE.MeshStandardMaterial;
          mesh.material = solidMat;
          solidMeshes.push({ mesh, mat: solidMat });

          /* Gold wire — EdgesGeometry child (inherits mesh transforms) */
          const edges   = new THREE.EdgesGeometry(mesh.geometry, 12);
          const wireMat = wireBase.clone() as THREE.LineBasicMaterial;
          const lines   = new THREE.LineSegments(edges, wireMat);
          lines.renderOrder = 1;
          mesh.add(lines);
          wirePairs.push({ mat: wireMat });
        });

        modelGroup = new THREE.Group();
        modelGroup.add(root);
        scene.add(modelGroup);

        setLoading(false);

        /* ── RAF loop ──────────────────────────── */
        const loop = (ts: number) => {
          rafId = requestAnimationFrame(loop);
          if (ts - lastFrame < FRAME_MS) return;
          lastFrame = ts;

          /* ── Scroll progress ─────────────────── */
          // Hero is min-h-screen; progress 0→1 as hero scrolls out
          const rawProgress = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.9)));

          /* Dissolve curve:
             0    → 0.55 : solid 1→0, wire 0→1
             0.55 → 1    : wire  1→0
          */
          const solidOpacity = rawProgress < 0.55
            ? 1 - rawProgress / 0.55
            : 0;
          const wireOpacity  = rawProgress < 0.55
            ? rawProgress / 0.55
            : 1 - (rawProgress - 0.55) / 0.45;

          solidMeshes.forEach(({ mat }) => {
            mat.opacity  = Math.max(0, solidOpacity);
            mat.visible  = solidOpacity > 0.01;
          });
          wirePairs.forEach(({ mat }) => {
            mat.opacity = Math.max(0, wireOpacity * 0.92);
          });

          /* ── Rotation + tilt ─────────────────── */
          rotY += 0.005;

          lerpRX += (mouse.y * -0.28 - lerpRX) * 0.055;
          lerpRY += (mouse.x *  0.22 - lerpRY) * 0.055;

          if (modelGroup) {
            modelGroup.rotation.y = rotY + lerpRY;
            modelGroup.rotation.x = lerpRX;

            // Subtle upward drift as model dissolves
            modelGroup.position.y = rawProgress * 0.35;
          }

          /* ── Key light follows mouse gently ──── */
          keyLight.position.x = 4 + mouse.x * 2;
          keyLight.position.y = 7 + mouse.y * -1.5;

          renderer.render(scene, camera);
        };
        rafId = requestAnimationFrame(loop);
      },

      undefined,

      (err) => {
        console.error('GLTFLoader:', err);
        setLoadErr(true);
        setLoading(false);
      },
    );

    /* ── Cleanup ─────────────────────────────────── */
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize',    onResize);
      goldBase.dispose();
      wireBase.dispose();
      envTex.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" aria-hidden="true" />

      {loading && !loadErr && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none select-none">
          <div
            style={{
              width: 44, height: 44,
              borderRadius: '50%',
              border: '1px solid rgba(212,160,23,0.15)',
              borderTopColor: '#D4A017',
              animation: 'modelSpin 1.1s linear infinite',
            }}
          />
          <p className="eyebrow text-[#6B6B6B]">Loading</p>
        </div>
      )}

      {loadErr && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="eyebrow text-[#444]">Model unavailable</p>
        </div>
      )}

      <style>{`
        @keyframes modelSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
