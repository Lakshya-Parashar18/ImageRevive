import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCcw,
  Play,
  Pause,
  Box,
  Info,
} from 'lucide-react';

export interface SurfaceMeshViewerProps {
  imageUrl: string;
  width?: number;
  height?: number;
  title?: string;
  className?: string;
}

type ColorPalette = 'inferno' | 'viridis' | 'cyberpunk' | 'texture' | 'grayscale';
type RenderStyle = 'surface' | 'wireframe' | 'hybrid' | 'points';

export const SurfaceMeshViewer: React.FC<SurfaceMeshViewerProps> = ({
  imageUrl,
  title = '3D Intensity Topography Mesh',
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // User Interactive Controls
  const [palette, setPalette] = useState<ColorPalette>('inferno');
  const [renderStyle, setRenderStyle] = useState<RenderStyle>('hybrid');
  const [gridDensity, setGridDensity] = useState<number>(128); // 64, 128, 192
  const [heightScale, setHeightScale] = useState<number>(1.2);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [stats, setStats] = useState<{ vertices: number; triangles: number }>({
    vertices: 0,
    triangles: 0,
  });

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isRotatingRef = useRef<boolean>(isRotating);

  isRotatingRef.current = isRotating;

  // Color mapping helper: maps normalized intensity t in [0, 1] to THREE.Color
  const getColormapColor = useCallback((t: number, pal: ColorPalette): THREE.Color => {
    t = Math.max(0, Math.min(1, t));
    const c = new THREE.Color();

    switch (pal) {
      case 'inferno': {
        // Black -> Deep Purple -> Orange -> Bright Yellow
        if (t < 0.25) {
          c.setRGB(t * 1.5, 0, t * 2.5);
        } else if (t < 0.6) {
          const k = (t - 0.25) / 0.35;
          c.setRGB(0.375 + k * 0.5, k * 0.25, 0.625 - k * 0.4);
        } else if (t < 0.85) {
          const k = (t - 0.6) / 0.25;
          c.setRGB(0.875 + k * 0.12, 0.25 + k * 0.5, 0.225 - k * 0.2);
        } else {
          const k = (t - 0.85) / 0.15;
          c.setRGB(1.0, 0.75 + k * 0.25, 0.025 + k * 0.8);
        }
        break;
      }
      case 'viridis': {
        // Purple -> Teal -> Lime Green
        if (t < 0.5) {
          const k = t / 0.5;
          c.setRGB(0.28 - k * 0.16, 0.1 + k * 0.5, 0.47 + k * 0.1);
        } else {
          const k = (t - 0.5) / 0.5;
          c.setRGB(0.12 + k * 0.75, 0.6 + k * 0.35, 0.57 - k * 0.45);
        }
        break;
      }
      case 'cyberpunk': {
        // Deep Violet -> Neon Cyan -> Gold
        if (t < 0.5) {
          const k = t / 0.5;
          c.setRGB(0.15 - k * 0.1, 0.05 + k * 0.85, 0.35 + k * 0.65);
        } else {
          const k = (t - 0.5) / 0.5;
          c.setRGB(0.05 + k * 0.9, 0.9 - k * 0.3, 1.0 - k * 0.9);
        }
        break;
      }
      case 'grayscale': {
        c.setRGB(t, t, t);
        break;
      }
      default:
        c.setRGB(t, t, t);
    }
    return c;
  }, []);

  // Build the 3D surface mesh from image luminance
  const buildMesh = useCallback(async () => {
    if (!sceneRef.current || !meshGroupRef.current) return;

    // Clear old objects in mesh group
    while (meshGroupRef.current.children.length > 0) {
      const obj = meshGroupRef.current.children[0];
      meshGroupRef.current.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) {
        if (Array.isArray((obj as any).material)) {
          (obj as any).material.forEach((m: any) => m.dispose());
        } else {
          (obj as any).material.dispose();
        }
      }
    }

    // Load image onto offscreen canvas to sample luminance
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = imageUrl;
    });

    const offCanvas = document.createElement('canvas');
    const seg = gridDensity;
    offCanvas.width = seg;
    offCanvas.height = seg;
    const ctx = offCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, seg, seg);
    const imgData = ctx.getImageData(0, 0, seg, seg).data;

    // Create PlaneGeometry with (seg, seg) vertices
    const planeW = 80;
    const planeH = 80;
    const geometry = new THREE.PlaneGeometry(planeW, planeH, seg - 1, seg - 1);
    geometry.rotateX(-Math.PI / 2); // Lay flat on XZ plane

    const posAttr = geometry.attributes.position;
    const count = posAttr.count;

    // Prepare vertex colors
    const colors = new Float32Array(count * 3);
    const textureLoader = new THREE.TextureLoader();
    let texture: THREE.Texture | null = null;

    if (palette === 'texture') {
      texture = textureLoader.load(imageUrl);
      texture.colorSpace = THREE.SRGBColorSpace;
    }

    // Compute elevation and colors
    const maxElevation = 26 * heightScale;

    for (let i = 0; i < count; i++) {
      // Map vertex index to image grid coordinates (row, col)
      const row = Math.floor(i / seg);
      const col = i % seg;

      const pIdx = (row * seg + col) * 4;
      const r = imgData[pIdx];
      const g = imgData[pIdx + 1];
      const b = imgData[pIdx + 2];

      // Standard DIP Rec.601 Luminance
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const norm = lum / 255.0;

      // Displace Y-axis height
      posAttr.setY(i, norm * maxElevation);

      // Vertex color
      if (palette !== 'texture') {
        const c = getColormapColor(norm, palette);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
    }

    if (palette !== 'texture') {
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }

    geometry.computeVertexNormals();

    // 1. Solid Surface Mesh
    if (renderStyle === 'surface' || renderStyle === 'hybrid') {
      const surfaceMat = new THREE.MeshStandardMaterial({
        vertexColors: palette !== 'texture',
        map: palette === 'texture' ? texture : null,
        roughness: 0.35,
        metalness: 0.2,
        side: THREE.DoubleSide,
        flatShading: false,
      });
      const surfaceMesh = new THREE.Mesh(geometry, surfaceMat);
      surfaceMesh.castShadow = true;
      surfaceMesh.receiveShadow = true;
      meshGroupRef.current.add(surfaceMesh);
    }

    // 2. Wireframe Overlay
    if (renderStyle === 'wireframe' || renderStyle === 'hybrid') {
      const wireMat = new THREE.MeshBasicMaterial({
        color:
          renderStyle === 'hybrid'
            ? 0x000000
            : palette === 'grayscale'
            ? 0xe5e7eb
            : 0xe5a34d,
        wireframe: true,
        transparent: true,
        opacity: renderStyle === 'hybrid' ? 0.22 : 0.85,
      });
      const wireMesh = new THREE.Mesh(geometry, wireMat);
      wireMesh.position.y += 0.08; // slightly above to prevent z-fighting
      meshGroupRef.current.add(wireMesh);
    }

    // 3. Points / Cloud
    if (renderStyle === 'points') {
      const pointMat = new THREE.PointsMaterial({
        vertexColors: palette !== 'texture',
        color: palette === 'texture' ? 0xffffff : undefined,
        size: 0.7,
        sizeAttenuation: true,
      });
      const pointMesh = new THREE.Points(geometry, pointMat);
      meshGroupRef.current.add(pointMesh);
    }

    // Ground Grid Base
    const gridHelper = new THREE.GridHelper(90, 18, 0xe5a34d, 0x273142);
    gridHelper.position.y = -0.5;
    meshGroupRef.current.add(gridHelper);

    // Update stats
    setStats({
      vertices: count,
      triangles: (seg - 1) * (seg - 1) * 2,
    });
  }, [imageUrl, palette, renderStyle, gridDensity, heightScale, getColormapColor]);

  // Initialize Three.js scene, camera, renderer, lighting & controls
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 460;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0f14);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(65, 55, 75);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // allow slight under-view
    controls.minDistance = 20;
    controls.maxDistance = 250;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfffaed, 1.4);
    dirLight1.position.set(40, 70, 30);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x7dd3fc, 0.5);
    dirLight2.position.set(-40, 30, -30);
    scene.add(dirLight2);

    // Mesh Group
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshGroupRef.current = meshGroup;

    // Resize Observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // Animation Loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (isRotatingRef.current && meshGroupRef.current) {
        meshGroupRef.current.rotation.y += 0.0035;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
      controls.dispose();
      if (container) container.innerHTML = '';
    };
  }, []);

  // Rebuild mesh when parameters change
  useEffect(() => {
    buildMesh();
  }, [buildMesh]);

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current && meshGroupRef.current) {
      cameraRef.current.position.set(65, 55, 75);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
      meshGroupRef.current.rotation.set(0, 0, 0);
    }
  };

  return (
    <div className={`flex flex-col rounded-2xl border border-border bg-surface overflow-hidden shadow-lg ${className}`}>
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-border bg-elevated/70">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-accent/15 border border-accent/25 text-accent">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-primary uppercase font-mono tracking-wider">
              {title}
            </h3>
            <p className="text-[11px] text-muted">
              Spatial coordinates <span className="text-secondary font-mono">(x, y)</span> with intensity altitude <span className="text-accent font-mono">z = I(x, y)</span>
            </p>
          </div>
        </div>

        {/* Quick Actions & Live Stats */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="hidden sm:flex items-center gap-3 px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] text-muted">
            <span>Vertices: <strong className="text-primary">{stats.vertices.toLocaleString()}</strong></span>
            <span>Triangles: <strong className="text-primary">{stats.triangles.toLocaleString()}</strong></span>
          </div>

          <button
            onClick={() => setIsRotating(!isRotating)}
            title={isRotating ? 'Pause Turntable' : 'Play Turntable'}
            className={`p-1.5 rounded-lg border transition-colors ${
              isRotating
                ? 'bg-accent/15 border-accent/30 text-accent'
                : 'bg-surface border-border text-muted hover:text-primary'
            }`}
          >
            {isRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleResetCamera}
            title="Reset Perspective Camera"
            className="p-1.5 rounded-lg bg-surface border border-border text-muted hover:text-primary transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div className="relative w-full h-[460px] bg-[#0c0f14] cursor-grab active:cursor-grabbing select-none">
        <div ref={mountRef} className="w-full h-full" />

        {/* Floating View Controls Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-surface/90 backdrop-blur-md border border-border shadow-xl text-xs font-mono">
          {/* Colormap Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted text-[11px]">Colormap:</span>
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'inferno', name: 'Inferno' },
                  { id: 'viridis', name: 'Viridis' },
                  { id: 'cyberpunk', name: 'Cyber' },
                  { id: 'texture', name: 'Texture' },
                  { id: 'grayscale', name: 'Grayscale' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPalette(p.id)}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all border ${
                    palette === p.id
                      ? 'bg-accent text-surface border-accent'
                      : 'bg-elevated border-border text-muted hover:text-secondary'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Render Mode Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted text-[11px]">Mesh Style:</span>
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'hybrid', name: 'Surface+Grid' },
                  { id: 'surface', name: 'Solid' },
                  { id: 'wireframe', name: 'Wire' },
                  { id: 'points', name: 'Points' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setRenderStyle(m.id)}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all border ${
                    renderStyle === m.id
                      ? 'bg-accent/15 border-accent/40 text-accent'
                      : 'bg-elevated border-border text-muted hover:text-secondary'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Elevation Height Scale Slider */}
          <div className="flex items-center gap-2 min-w-[170px]">
            <span className="text-muted text-[11px]">Elevation:</span>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={heightScale}
              onChange={(e) => setHeightScale(Number(e.target.value))}
              className="w-24 accent-accent"
            />
            <span className="text-accent font-bold text-[11px] min-w-[28px]">
              {heightScale.toFixed(1)}x
            </span>
          </div>

          {/* Grid Density */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted text-[11px]">Resolution:</span>
            <select
              value={gridDensity}
              onChange={(e) => setGridDensity(Number(e.target.value))}
              className="bg-elevated border border-border text-primary rounded px-2 py-1 text-[11px] focus:outline-hidden"
            >
              <option value={64}>64×64 (Fast)</option>
              <option value={128}>128×128 (Balanced)</option>
              <option value={192}>192×192 (Detailed)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Footer Navigation Tip */}
      <div className="px-5 py-2.5 border-t border-border bg-elevated/40 flex items-center justify-between text-[11px] font-mono text-muted">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-accent" />
          <span>Left-click + drag to orbit • Right-click to pan • Scroll to zoom</span>
        </div>
        <span className="hidden sm:inline text-secondary">
          DIP Intuition: Sharp edges form steep slopes; noise appears as spikes
        </span>
      </div>
    </div>
  );
};
