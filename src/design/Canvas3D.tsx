import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { maxHeight } from '../domain/geometry';
import type { Part } from '../domain/parts';
import type { Project } from '../domain/project';
import type { ClosetConfig } from '../domain/types';

export type DoorMode = 'hidden' | 'closed' | 'open';

interface Props {
  readonly cfg: ClosetConfig;
  readonly project: Project;
  readonly doorMode: DoorMode;
  readonly selectedColumn: number | null;
}

interface Scene3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  content: THREE.Group | null;
  doors: { pivot: THREE.Object3D; target: number }[];
}

const MM = 0.001;
const DOOR_ANGLE = (70 * Math.PI) / 180;

const COLORS = {
  wood: 0xe4cba4,
  woodSelected: 0xf0a868,
  edge: 0x7a5a38,
  back: 0xcbb08a,
  door: 0xf1e6d4,
  rod: 0x9aa0a6,
};

function extrude(part: Part, material: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape(part.poly.map(([x, y]) => new THREE.Vector2(x, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: part.z1 - part.z0, bevelEnabled: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = -part.z1;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 30),
    new THREE.LineBasicMaterial({ color: COLORS.edge, transparent: true, opacity: 0.55 }),
  );
  mesh.add(edges);
  return mesh;
}

function buildDoor(part: Part, material: THREE.Material): { pivot: THREE.Object3D } {
  const door = part.door;
  const mesh = extrude(part, material);
  const pivot = new THREE.Object3D();
  if (!door) return { pivot };
  const axisX = door.hingeSide === 'left' ? door.x0 : door.x1;
  pivot.position.set(axisX, 0, -part.z0);
  mesh.position.x = -axisX;
  mesh.position.z = -part.z1 + part.z0;
  pivot.add(mesh);
  pivot.userData.sign = door.hingeSide === 'left' ? -1 : 1;
  return { pivot };
}

function buildContent(cfg: ClosetConfig, project: Project, props: Props, s: Scene3D): THREE.Group {
  const group = new THREE.Group();
  const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...extra });
  const wood = mat(COLORS.wood);
  const woodSel = mat(COLORS.woodSelected);
  const back = mat(COLORS.back);
  const doorMat = mat(COLORS.door, { transparent: props.doorMode === 'closed', opacity: 0.92 });

  s.doors = [];
  project.parts.forEach((p) => {
    if (p.kind === 'door') {
      if (props.doorMode === 'hidden') return;
      const { pivot } = buildDoor(p, doorMat);
      group.add(pivot);
      s.doors.push({ pivot, target: props.doorMode === 'open' ? DOOR_ANGLE : 0 });
      return;
    }
    const selected = p.kind === 'shelf' && p.column === props.selectedColumn;
    group.add(extrude(p, p.kind === 'back' ? back : selected ? woodSel : wood));
  });

  project.rods.forEach((r) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, r.x1 - r.x0, 20), mat(COLORS.rod, { metalness: 0.8, roughness: 0.3 }));
    rod.rotation.z = Math.PI / 2;
    rod.position.set((r.x0 + r.x1) / 2, r.y, -r.z);
    rod.castShadow = true;
    group.add(rod);
  });

  group.position.set(-cfg.width / 2, 0, cfg.depth / 2);
  const root = new THREE.Group();
  root.add(group);
  root.scale.setScalar(MM);
  return root;
}

function initScene(host: HTMLDivElement): Scene3D {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a58c, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(2.5, 4, 3.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.minDistance = 0.8;
  controls.maxDistance = 15;
  return { renderer, scene, camera, controls, content: null, doors: [] };
}

function frameCamera(s: Scene3D, cfg: ClosetConfig) {
  const H = maxHeight(cfg) * MM;
  const size = Math.max(cfg.width * MM, H);
  s.controls.target.set(0, H / 2, 0);
  s.camera.position.set(size * 0.85, H * 0.8, size * 2.25);
  s.controls.update();
}

export default function Canvas3D(props: Props) {
  const { cfg, project, doorMode, selectedColumn } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene3D | null>(null);
  const framedFor = useRef('');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const s = initScene(host);
    sceneRef.current = s;
    framedFor.current = '';
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      s.renderer.setSize(w, h);
      s.camera.aspect = w / Math.max(1, h);
      s.camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    let raf = 0;
    const loop = () => {
      s.doors.forEach((d) => {
        const current = d.pivot.rotation.y;
        const goal = d.target * (d.pivot.userData.sign as number);
        d.pivot.rotation.y = current + (goal - current) * 0.15;
      });
      s.controls.update();
      s.renderer.render(s.scene, s.camera);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      s.controls.dispose();
      s.renderer.dispose();
      host.removeChild(s.renderer.domElement);
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    const previousAngles = s.doors.map((d) => d.pivot.rotation.y);
    if (s.content) {
      s.scene.remove(s.content);
      s.content.traverse((o) => {
        if (!(o instanceof THREE.Mesh || o instanceof THREE.LineSegments)) return;
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => m.dispose());
      });
    }
    s.content = buildContent(cfg, project, { cfg, project, doorMode, selectedColumn }, s);
    s.doors.forEach((d, i) => (d.pivot.rotation.y = previousAngles[i] ?? 0));
    s.scene.add(s.content);
    const key = `${cfg.width}x${maxHeight(cfg)}x${cfg.depth}`;
    if (framedFor.current !== key) {
      frameCamera(s, cfg);
      framedFor.current = key;
    }
  }, [cfg, project, doorMode, selectedColumn]);

  return (
    <div className="viewer3d" ref={hostRef}>
      <button
        type="button"
        className="btn btn--sm viewer3d__reset"
        onClick={() => sceneRef.current && frameCamera(sceneRef.current, cfg)}
      >
        Recentrer
      </button>
    </div>
  );
}
