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

function createContextGeometry(buildings: readonly ContextBuilding[]) {
  const palette = ["#8e7c68", "#9d866f", "#777e7d", "#ad9d7c", "#806d60"];
  const geometries = buildings.map((building) => {
    const shape = new THREE.Shape();
    building.footprint.forEach(([x, z], index) => {
      if (index === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    });
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
      bevelEnabled: false,
      curveSegments: 1,
      depth: building.height,
      steps: 1,
    });
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, building.height, 0);

    const color = new THREE.Color(palette[building.id % palette.length]);
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

function UrbanFabric({ quality }: { quality: SceneQuality }) {
  const geometry = useMemo(
    () =>
      createContextGeometry(
        quality === "high" ? CONTEXT_BUILDINGS : CONTEXT_BUILDINGS.slice(0, 52),
      ),
    [quality],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} castShadow={quality === "high"} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.93} />
    </mesh>
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
            colors={["#e2e9eb", "#83a9ca", "#285f9b"]}
            size={512}
            stops={[0, 0.5, 1]}
          />
        </meshBasicMaterial>
      </mesh>
      {quality === "high" ? (
        <Environment environmentIntensity={0.48} frames={1} resolution={128}>
          <Lightformer
            color="#fff0cf"
            form="rect"
            intensity={2.1}
            position={[-90, 95, 70]}
            scale={[95, 42]}
          />
          <Lightformer
            color="#78a7d4"
            form="ring"
            intensity={0.7}
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
      <color attach="background" args={["#9bb8d2"]} />
      <fog attach="fog" args={["#afc5d7", 210, 420]} />

      <StadiumAtmosphere quality={quality} />

      <ambientLight intensity={0.24} />
      <hemisphereLight args={["#d7ebff", "#665b48", 0.78]} />
      <directionalLight
        castShadow={quality === "high"}
        color="#fff0c4"
        intensity={3.2}
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
