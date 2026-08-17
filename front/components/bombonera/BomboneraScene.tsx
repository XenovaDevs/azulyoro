import {
  Environment,
  GradientTexture,
  Instance,
  Instances,
  Lightformer,
  OrbitControls,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useMemo,
  useRef,
  type ComponentRef,
} from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  CAMERA_STOP_BY_ID,
  CAMERA_STOPS,
  type CameraStopId,
} from "./cameraStops";
import { BomboneraSketchfabModel } from "./BomboneraModel";
import { CONTEXT_BUILDINGS, type ContextBuilding } from "./contextGeometry";

type SceneQuality = "high" | "low";

type BomboneraSceneProps = {
  activeView: CameraStopId;
  freeMode: boolean;
  quality: SceneQuality;
  reducedMotion: boolean;
  onSelectView: (view: CameraStopId) => void;
};

const GOLD = "#f1c52b";
const BUILDING_PALETTE = [
  "#9b8d7a",
  "#8d5748",
  "#b6a37f",
  "#88978f",
  "#a98a83",
  "#747b7d",
  "#9daeb0",
] as const;
const ROOF_PALETTE = ["#4f4d48", "#6a584d", "#756b58", "#59615d"] as const;

type UrbanInstance = {
  key: number | string;
  position: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: readonly [number, number, number];
};

function buildingShape(building: ContextBuilding, invertZ = false) {
  const shape = new THREE.Shape();
  building.footprint.forEach(([x, z], index) => {
    const shapeZ = invertZ ? -z : z;
    if (index === 0) shape.moveTo(x, shapeZ);
    else shape.lineTo(x, shapeZ);
  });
  shape.closePath();
  return shape;
}

function createContextGeometry(buildings: readonly ContextBuilding[]) {
  const geometries = buildings.map((building) => {
    const geometry = new THREE.ExtrudeGeometry(buildingShape(building), {
      bevelEnabled: false,
      curveSegments: 1,
      depth: building.height,
      steps: 1,
    });
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, building.height, 0);

    const color = new THREE.Color(
      BUILDING_PALETTE[building.id % BUILDING_PALETTE.length],
    );
    const colorValues = new Float32Array(
      geometry.getAttribute("position").count * 3,
    );
    for (let index = 0; index < colorValues.length; index += 3) {
      colorValues[index] = color.r;
      colorValues[index + 1] = color.g;
      colorValues[index + 2] = color.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colorValues, 3));
    return geometry;
  });

  const merged = mergeGeometries(geometries, false) ?? new THREE.BufferGeometry();
  geometries.forEach((geometry) => geometry.dispose());
  merged.computeVertexNormals();
  return merged;
}

function createRoofGeometry(buildings: readonly ContextBuilding[]) {
  const geometries = buildings.map((building) => {
    const geometry = new THREE.ShapeGeometry(buildingShape(building, true));
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, building.height + 0.035, 0);

    const color = new THREE.Color(
      ROOF_PALETTE[building.id % ROOF_PALETTE.length],
    );
    const colorValues = new Float32Array(
      geometry.getAttribute("position").count * 3,
    );
    for (let index = 0; index < colorValues.length; index += 3) {
      colorValues[index] = color.r;
      colorValues[index + 1] = color.g;
      colorValues[index + 2] = color.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colorValues, 3));
    return geometry;
  });

  const merged = mergeGeometries(geometries, false) ?? new THREE.BufferGeometry();
  geometries.forEach((geometry) => geometry.dispose());
  return merged;
}

function buildingCenter(building: ContextBuilding) {
  const [x, z] = building.footprint.reduce(
    (sum, point) => [sum[0] + point[0], sum[1] + point[1]],
    [0, 0],
  );
  return [x / building.footprint.length, z / building.footprint.length] as const;
}

function createFacadeWindows(buildings: readonly ContextBuilding[]) {
  const windows: UrbanInstance[] = [];
  buildings.forEach((building) => {
    if (building.id % 4 !== 0) return;

    let longestEdge = {
      length: 0,
      start: building.footprint[0],
      end: building.footprint[1],
    };
    building.footprint.forEach((point, index) => {
      const next = building.footprint[(index + 1) % building.footprint.length];
      const length = Math.hypot(next[0] - point[0], next[1] - point[1]);
      if (length > longestEdge.length) {
        longestEdge = { length, start: point, end: next };
      }
    });

    const dx = longestEdge.end[0] - longestEdge.start[0];
    const dz = longestEdge.end[1] - longestEdge.start[1];
    const rotationY = -Math.atan2(dz, dx);
    const floors = Math.min(3, Math.max(1, Math.floor((building.height - 1.5) / 2.7)));
    for (let floor = 0; floor < floors; floor += 1) {
      [0.34, 0.66].forEach((progress, windowIndex) => {
        windows.push({
          key: `${building.id}-${floor}-${windowIndex}`,
          position: [
            THREE.MathUtils.lerp(longestEdge.start[0], longestEdge.end[0], progress),
            2.2 + floor * 2.45,
            THREE.MathUtils.lerp(longestEdge.start[1], longestEdge.end[1], progress),
          ],
          rotation: [0, rotationY, 0],
          scale: [Math.min(1.25, longestEdge.length * 0.13), 0.62, 0.085],
        });
      });
    }
  });
  return windows.slice(0, 210);
}

const FACADE_WINDOWS = createFacadeWindows(CONTEXT_BUILDINGS);
const ROOFTOP_TANKS: readonly UrbanInstance[] = CONTEXT_BUILDINGS.filter(
  (building) => building.id % 11 === 0,
)
  .slice(0, 18)
  .map((building) => {
    const [x, z] = buildingCenter(building);
    return {
      key: building.id,
      position: [x, building.height + 0.8, z],
    };
  });
const STREET_TREES: readonly UrbanInstance[] = [
  ...[-44, -18, 8, 34, 60].flatMap((z, index) => [
    { key: index * 2, position: [-121, 0, z] as const },
    { key: index * 2 + 1, position: [121, 0, z] as const },
  ]),
  ...[-78, -42, 42, 78].map((x, index) => ({
    key: index + 20,
    position: [x, 0, -73] as const,
  })),
];
const STREET_LIGHTS = STREET_TREES.filter((_, index) => index % 2 === 0);

function UrbanFabric({ quality }: { quality: SceneQuality }) {
  const geometry = useMemo(
    () => ({
      roofs: createRoofGeometry(CONTEXT_BUILDINGS),
      walls: createContextGeometry(CONTEXT_BUILDINGS),
    }),
    [],
  );

  useEffect(
    () => () => {
      geometry.roofs.dispose();
      geometry.walls.dispose();
    },
    [geometry],
  );

  return (
    <group>
      <mesh
        geometry={geometry.walls}
        castShadow={quality === "high"}
        receiveShadow
      >
        <meshStandardMaterial vertexColors roughness={0.94} />
      </mesh>
      <mesh geometry={geometry.roofs} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.88} />
      </mesh>
    </group>
  );
}

function UrbanDetails() {
  return (
    <group>
      <Instances limit={FACADE_WINDOWS.length}>
        <boxGeometry />
        <meshStandardMaterial
          color="#263b45"
          metalness={0.08}
          roughness={0.38}
        />
        {FACADE_WINDOWS.map((window) => (
          <Instance
            key={window.key}
            position={window.position}
            rotation={window.rotation}
            scale={window.scale}
          />
        ))}
      </Instances>

      <Instances limit={ROOFTOP_TANKS.length}>
        <cylinderGeometry args={[0.76, 0.88, 1.55, 10]} />
        <meshStandardMaterial color="#353b3b" roughness={0.76} />
        {ROOFTOP_TANKS.map((tank) => (
          <Instance key={tank.key} position={tank.position} />
        ))}
      </Instances>

      <Instances limit={STREET_TREES.length}>
        <cylinderGeometry args={[0.18, 0.24, 3.4, 7]} />
        <meshStandardMaterial color="#655140" roughness={1} />
        {STREET_TREES.map((tree) => (
          <Instance
            key={tree.key}
            position={[tree.position[0], 1.7, tree.position[2]]}
          />
        ))}
      </Instances>
      <Instances limit={STREET_TREES.length}>
        <icosahedronGeometry args={[1.45, 1]} />
        <meshStandardMaterial color="#476850" roughness={0.96} />
        {STREET_TREES.map((tree) => (
          <Instance
            key={tree.key}
            position={[tree.position[0], 4.15, tree.position[2]]}
            scale={[1, 1.22, 1]}
          />
        ))}
      </Instances>

      <Instances limit={STREET_LIGHTS.length}>
        <cylinderGeometry args={[0.07, 0.11, 5.4, 8]} />
        <meshStandardMaterial color="#4d5558" metalness={0.72} roughness={0.4} />
        {STREET_LIGHTS.map((light) => (
          <Instance
            key={light.key}
            position={[light.position[0] + 3, 2.7, light.position[2] + 7]}
          />
        ))}
      </Instances>
      <Instances limit={STREET_LIGHTS.length}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial
          color="#e8dec6"
          emissive="#d8c9a5"
          emissiveIntensity={0.35}
          roughness={0.46}
        />
        {STREET_LIGHTS.map((light) => (
          <Instance
            key={light.key}
            position={[light.position[0] + 3, 5.42, light.position[2] + 7]}
          />
        ))}
      </Instances>
    </group>
  );
}

function Surroundings({ quality }: { quality: SceneQuality }) {
  return (
    <group>
      <mesh receiveShadow position={[0, -0.42, 8]}>
        <boxGeometry args={[310, 0.7, 285]} />
        <meshStandardMaterial color="#8e8c86" roughness={1} />
      </mesh>

      <mesh receiveShadow position={[-109, -0.02, 7]}>
        <boxGeometry args={[17, 0.16, 180]} />
        <meshStandardMaterial color="#363b3e" roughness={1} />
      </mesh>
      <mesh receiveShadow position={[0, -0.015, -61]}>
        <boxGeometry args={[230, 0.16, 17]} />
        <meshStandardMaterial color="#363b3e" roughness={1} />
      </mesh>
      <mesh receiveShadow position={[108, -0.015, 25]}>
        <boxGeometry args={[17, 0.16, 165]} />
        <meshStandardMaterial color="#363b3e" roughness={1} />
      </mesh>

      <UrbanFabric quality={quality} />
      <UrbanDetails />

      {[-57, -61].map((z) => (
        <mesh key={z} receiveShadow position={[0, 0.12, z]}>
          <boxGeometry args={[132, 0.14, 0.18]} />
          <meshStandardMaterial color="#635f58" metalness={0.5} roughness={0.58} />
        </mesh>
      ))}
      <Instances limit={35}>
        <boxGeometry />
        <meshStandardMaterial color="#756b5d" roughness={0.94} />
        {Array.from({ length: 35 }, (_, index) => (
          <Instance
            key={index}
            position={[-65 + index * 3.85, 0.055, -59]}
            scale={[0.3, 0.12, 5.8]}
          />
        ))}
      </Instances>

      {[-115, 115].map((x) => (
        <group key={x} position={[x, 0, -40]}>
          {Array.from({ length: 8 }, (_, index) => (
            <mesh key={index} position={[0, 0.04, index * 12]}>
              <boxGeometry args={[0.25, 0.08, 6]} />
              <meshBasicMaterial color="#e9dfbd" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function CameraController({
  activeView,
  freeMode,
  reducedMotion,
}: Pick<BomboneraSceneProps, "activeView" | "freeMode" | "reducedMotion">) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const target = useRef(new THREE.Vector3());
  const destination = useMemo(() => new THREE.Vector3(), []);
  const desiredTarget = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const stop = CAMERA_STOP_BY_ID.get(activeView) ?? CAMERA_STOPS[0];
    destination.set(...stop.position);
    desiredTarget.set(...stop.target);

    const aspect = size.width / Math.max(size.height, 1);
    const narrowScreenDistance = aspect < 0.9 ? Math.min(1.55, 1 / aspect) : 1;
    if (narrowScreenDistance > 1) {
      destination
        .sub(desiredTarget)
        .multiplyScalar(narrowScreenDistance)
        .add(desiredTarget);
    }

    if (reducedMotion) {
      camera.position.copy(destination);
      target.current.copy(desiredTarget);
      camera.lookAt(target.current);
    }

    if (controls.current) {
      controls.current.target.copy(desiredTarget);
      controls.current.update();
    }
  }, [
    activeView,
    camera,
    desiredTarget,
    destination,
    reducedMotion,
    size.height,
    size.width,
  ]);

  useFrame((_, delta) => {
    if (freeMode || reducedMotion) return;

    const easing = 1 - Math.exp(-delta * 2.6);
    camera.position.lerp(destination, easing);
    target.current.lerp(desiredTarget, easing);
    camera.lookAt(target.current);
  });

  if (!freeMode) return null;

  return (
    <OrbitControls
      ref={controls}
      enableDamping={!reducedMotion}
      dampingFactor={0.075}
      enablePan
      maxDistance={235}
      maxPolarAngle={Math.PI / 2 - 0.025}
      minDistance={4}
      minPolarAngle={0.12}
      screenSpacePanning={false}
      target={CAMERA_STOP_BY_ID.get(activeView)?.target ?? [0, 6, 8]}
    />
  );
}

function Hotspot({
  active,
  position,
  reducedMotion,
  onSelect,
}: {
  active: boolean;
  position: readonly [number, number, number];
  reducedMotion: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.09;
    ref.current.scale.setScalar(pulse);
  });

  return (
    <group ref={ref} position={position}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "auto";
          onSelect();
        }}
        onPointerEnter={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerLeave={() => {
          document.body.style.cursor = "auto";
        }}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[active ? 1.05 : 0.8, active ? 0.17 : 0.12, 10, 28]} />
        <meshBasicMaterial color={active ? "#fff2a8" : GOLD} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshBasicMaterial color="#fff9d6" toneMapped={false} />
      </mesh>
    </group>
  );
}

function ModelLoadFallback() {
  return (
    <group position={[0, 8, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.2, 0.22, 8, 48]} />
        <meshBasicMaterial color={GOLD} toneMapped={false} />
      </mesh>
    </group>
  );
}

function StadiumAtmosphere({ quality }: { quality: SceneQuality }) {
  return (
    <>
      <mesh scale={520}>
        <sphereGeometry args={[1, 32, 18]} />
        <meshBasicMaterial
          depthWrite={false}
          fog={false}
          side={THREE.BackSide}
          toneMapped={false}
        >
          <GradientTexture
            colors={["#dce3df", "#91acb9", "#3f6681"]}
            size={512}
            stops={[0, 0.5, 1]}
          />
        </meshBasicMaterial>
      </mesh>
      {quality === "high" ? (
        <Environment environmentIntensity={0.34} frames={1} resolution={128}>
          <Lightformer
            color="#fff8ea"
            form="rect"
            intensity={1.35}
            position={[-90, 95, 70]}
            scale={[95, 42]}
          />
          <Lightformer
            color="#9db7ca"
            form="ring"
            intensity={0.45}
            position={[45, 38, -125]}
            scale={72}
          />
        </Environment>
      ) : null}
    </>
  );
}

export function BomboneraScene({
  activeView,
  freeMode,
  quality,
  reducedMotion,
  onSelectView,
}: BomboneraSceneProps) {
  return (
    <>
      <color attach="background" args={["#9dafba"]} />
      <fog attach="fog" args={["#b7c2c7", 210, 420]} />

      <StadiumAtmosphere quality={quality} />

      <ambientLight intensity={0.17} />
      <hemisphereLight args={["#dceaf0", "#6c6c63", 0.68]} />
      <directionalLight
        castShadow={quality === "high"}
        color="#fff8e8"
        intensity={2.25}
        position={[120, 140, 170]}
        shadow-bias={-0.00008}
        shadow-camera-bottom={-125}
        shadow-camera-left={-135}
        shadow-camera-right={135}
        shadow-camera-top={125}
        shadow-mapSize-height={quality === "high" ? 2048 : 512}
        shadow-mapSize-width={quality === "high" ? 2048 : 512}
        shadow-normalBias={0.035}
      />

      <Surroundings quality={quality} />
      <BomboneraSketchfabModel fallback={<ModelLoadFallback />} />

      {CAMERA_STOPS.map((stop) => (
        <Hotspot
          key={stop.id}
          active={activeView === stop.id}
          position={stop.hotspot}
          reducedMotion={reducedMotion}
          onSelect={() => onSelectView(stop.id)}
        />
      ))}

      <CameraController
        activeView={activeView}
        freeMode={freeMode}
        reducedMotion={reducedMotion}
      />
    </>
  );
}
