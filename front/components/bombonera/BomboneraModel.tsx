import { useGLTF } from "@react-three/drei";
import {
  Component,
  Suspense,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from "react";
import * as THREE from "three";

const MODEL_URL = "/models/bombonera/bombonera-sketchfab.glb";

type ModelErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

type ModelErrorBoundaryState = {
  failed: boolean;
};

class ModelErrorBoundary extends Component<
  ModelErrorBoundaryProps,
  ModelErrorBoundaryState
> {
  state: ModelErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ModelErrorBoundaryState {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function SketchfabModel() {
  const { scene } = useGLTF(MODEL_URL, false, true);
  const model = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [model]);

  return <primitive object={model} />;
}

export function BomboneraSketchfabModel({ fallback }: { fallback: ReactNode }) {
  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <SketchfabModel />
      </Suspense>
    </ModelErrorBoundary>
  );
}
