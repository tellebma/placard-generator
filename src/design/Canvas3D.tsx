import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { EnsembleProject, PlacedCaisson } from '../domain/ensembleProject';
import type { Part } from '../domain/parts';

export type DoorMode = 'hidden' | 'closed' | 'open';

interface Props {
  readonly ensemble: EnsembleProject;
  /** Caisson en cours d'édition (mis en évidence, les autres sont atténués). */
  readonly activeCaisson: number;
  readonly doorMode: DoorMode;
  /** Colonne sélectionnée dans le caisson actif. */
  readonly selectedColumn: number | null;
  /** Clic (sans glisser) sur un caisson de l'ensemble. */
  readonly onPickCaisson?: (index: number) => void;
}

interface Scene3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly sun: THREE.DirectionalLight;
  content: THREE.Group | null;
  doors: { pivot: THREE.Object3D; target: number }[];
}

const MM = 0.001;
const DOOR_ANGLE = (70 * Math.PI) / 180;
const PICK_TOLERANCE = 4;

const COLORS = {
  wood: 0xe4cba4,
  woodSelected: 0xf0a868,
  edge: 0x7a5a38,
  back: 0xcbb08a,
  door: 0xf1e6d4,
  rod: 0x9aa0a6,
};

/** Variante atténuée (plus claire, désaturée) pour les caissons non actifs. */
function dim(hex: number): number {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s * 0.5, Math.min(0.92, hsl.l + 0.14));
  return c.getHex();
}

interface Materials {
  readonly wood: THREE.MeshStandardMaterial;
  readonly woodDim: THREE.MeshStandardMaterial;
  readonly woodSelected: THREE.MeshStandardMaterial;
  readonly back: THREE.MeshStandardMaterial;
  readonly backDim: THREE.MeshStandardMaterial;
  readonly door: THREE.MeshStandardMaterial;
  readonly doorDim: THREE.MeshStandardMaterial;
  readonly rod: THREE.MeshStandardMaterial;
  readonly rodDim: THREE.MeshStandardMaterial;
}

/** Un seul jeu de matériaux par rendu, partagé par toutes les pièces de tous les caissons. */
function buildMaterials(doorMode: DoorMode): Materials {
  const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...extra });
  const doorExtra = { transparent: doorMode === 'closed', opacity: 0.92 };
  const rodExtra = { metalness: 0.8, roughness: 0.3 };
  return {
    wood: mat(COLORS.wood),
    woodDim: mat(dim(COLORS.wood)),
    woodSelected: mat(COLORS.woodSelected),
    back: mat(COLORS.back),
    backDim: mat(dim(COLORS.back)),
    door: mat(COLORS.door, doorExtra),
    doorDim: mat(dim(COLORS.door), doorExtra),
    rod: mat(COLORS.rod, rodExtra),
    rodDim: mat(dim(COLORS.rod), rodExtra),
  };
}

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

function partMaterial(p: Part, isActive: boolean, selectedColumn: number | null, m: Materials): THREE.Material {
  if (p.kind === 'back') return isActive ? m.back : m.backDim;
  if (isActive && p.kind === 'shelf' && p.column === selectedColumn) return m.woodSelected;
  return isActive ? m.wood : m.woodDim;
}

/**
 * Groupe d'un caisson placé dans l'ensemble : mêmes pièces/tringles que le caisson seul,
 * décalé de x en largeur et de z (retrait de façade) en profondeur, tous plaqués au mur du fond.
 */
function buildCaissonGroup(
  placed: PlacedCaisson,
  isActive: boolean,
  selectedColumn: number | null,
  doorMode: DoorMode,
  m: Materials,
  ensemble: EnsembleProject,
  s: Scene3D,
): THREE.Group {
  const group = new THREE.Group();
  placed.project.parts.forEach((p) => {
    if (p.kind === 'door') {
      if (doorMode === 'hidden') return;
      const { pivot } = buildDoor(p, isActive ? m.door : m.doorDim);
      group.add(pivot);
      s.doors.push({ pivot, target: doorMode === 'open' ? DOOR_ANGLE : 0 });
      return;
    }
    group.add(extrude(p, partMaterial(p, isActive, selectedColumn, m)));
  });
  placed.project.rods.forEach((r) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, r.x1 - r.x0, 20), isActive ? m.rod : m.rodDim);
    rod.rotation.z = Math.PI / 2;
    rod.position.set((r.x0 + r.x1) / 2, r.y, -r.z);
    rod.castShadow = true;
    group.add(rod);
  });
  group.position.set(placed.x - ensemble.width / 2, placed.y, ensemble.depth / 2 - placed.z);
  group.userData.caisson = placed.index;
  return group;
}

function buildContent(ensemble: EnsembleProject, activeCaisson: number, doorMode: DoorMode, selectedColumn: number | null, s: Scene3D): THREE.Group {
  const materials = buildMaterials(doorMode);
  s.doors = [];
  const root = new THREE.Group();
  ensemble.caissons.forEach((c) => {
    root.add(buildCaissonGroup(c, c.index === activeCaisson, selectedColumn, doorMode, materials, ensemble, s));
  });
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

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.minDistance = 0.8;
  controls.maxDistance = 25;
  return { renderer, scene, camera, controls, sun, content: null, doors: [] };
}

/** Cadre la caméra et le frustum d'ombre sur l'encombrement global de l'ensemble. */
function frameCamera(s: Scene3D, ensemble: EnsembleProject) {
  const W = ensemble.width * MM;
  const H = ensemble.height * MM;
  const D = ensemble.depth * MM;
  const size = Math.max(W, H);
  s.controls.target.set(0, H / 2, 0);
  s.camera.position.set(size * 0.85, H * 0.8, size * 2.25);
  s.controls.update();
  const shadowHalf = Math.max(W, D, H) * 0.75 + 0.5;
  Object.assign(s.sun.shadow.camera, { left: -shadowHalf, right: shadowHalf, top: shadowHalf, bottom: -shadowHalf });
  s.sun.shadow.camera.updateProjectionMatrix();
}

/** Remonte la hiérarchie depuis l'objet touché par le rayon pour retrouver l'index du caisson. */
function caissonAt(obj: THREE.Object3D | null): number | null {
  for (let o = obj; o; o = o.parent) {
    if (typeof o.userData.caisson === 'number') return o.userData.caisson;
  }
  return null;
}

function disposeContent(s: Scene3D) {
  if (!s.content) return;
  s.scene.remove(s.content);
  const materials = new Set<THREE.Material>();
  s.content.traverse((o) => {
    if (!(o instanceof THREE.Mesh || o instanceof THREE.LineSegments)) return;
    o.geometry.dispose();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((mat: THREE.Material) => materials.add(mat));
  });
  materials.forEach((mat) => mat.dispose());
}

export default function Canvas3D(props: Props) {
  const { ensemble, activeCaisson, doorMode, selectedColumn, onPickCaisson } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene3D | null>(null);
  const framedFor = useRef('');
  const pickRef = useRef(onPickCaisson);
  pickRef.current = onPickCaisson;

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

    const raycaster = new THREE.Raycaster();
    const downAt = new THREE.Vector2();
    let hasDown = false;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      downAt.set(e.clientX, e.clientY);
      hasDown = true;
    };
    const onUp = (e: PointerEvent) => {
      if (e.button !== 0 || !hasDown) return;
      hasDown = false;
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > PICK_TOLERANCE) return;
      const onPick = pickRef.current;
      if (!onPick || !s.content) return;
      const rect = s.renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, s.camera);
      const hit = raycaster.intersectObject(s.content, true)[0];
      const index = hit ? caissonAt(hit.object) : null;
      if (index !== null) onPick(index);
    };
    s.renderer.domElement.addEventListener('pointerdown', onDown);
    s.renderer.domElement.addEventListener('pointerup', onUp);

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
      s.renderer.domElement.removeEventListener('pointerdown', onDown);
      s.renderer.domElement.removeEventListener('pointerup', onUp);
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
    disposeContent(s);
    s.content = buildContent(ensemble, activeCaisson, doorMode, selectedColumn, s);
    s.doors.forEach((d, i) => (d.pivot.rotation.y = previousAngles[i] ?? 0));
    s.scene.add(s.content);
    const key = `${ensemble.width}x${ensemble.height}x${ensemble.depth}`;
    if (framedFor.current !== key) {
      frameCamera(s, ensemble);
      framedFor.current = key;
    }
  }, [ensemble, activeCaisson, doorMode, selectedColumn]);

  return (
    <div className="viewer3d" ref={hostRef}>
      <button
        type="button"
        className="btn btn--sm viewer3d__reset"
        onClick={() => sceneRef.current && frameCamera(sceneRef.current, ensemble)}
      >
        Recentrer
      </button>
    </div>
  );
}
