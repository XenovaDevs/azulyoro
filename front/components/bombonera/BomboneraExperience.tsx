"use client";

import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { BomboneraScene } from "./BomboneraScene";
import { ExperienceControls } from "./ExperienceControls";
import {
  CAMERA_STOP_IDS,
  type CameraStopId,
} from "./cameraStops";

type SceneQuality = "high" | "low";

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

function LoadingOverlay({ label }: { label: string }) {
  return (
    <div
      aria-live="polite"
      className="absolute inset-0 z-20 grid place-items-center bg-[#061333] text-white"
      role="status"
    >
      <div className="text-center">
        <div className="mx-auto size-10 animate-spin rounded-full border-2 border-white/20 border-t-[#f5c542] motion-reduce:animate-none" />
        <p className="mt-4 font-display text-sm font-bold tracking-wide text-[#f5c542]">
          {label}
        </p>
      </div>
    </div>
  );
}

function WebGlFallback({
  message,
}: {
  message: string;
}) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#061333] p-6 text-center text-white">
      <p className="max-w-md text-sm leading-relaxed text-white/80">{message}</p>
    </div>
  );
}

function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);

  return null;
}

export default function BomboneraExperience() {
  const t = useTranslations("Bombonera.experience");
  const [activeView, setActiveView] = useState<CameraStopId>("exterior");
  const [freeMode, setFreeMode] = useState(false);
  const [quality, setQuality] = useState<SceneQuality>("high");
  const [ready, setReady] = useState(false);
  const [webGlFailed, setWebGlFailed] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const frame = window.requestAnimationFrame(() => {
      if (mobileQuery.matches) setQuality("low");

      const canvas = document.createElement("canvas");
      const webGlAvailable = Boolean(
        canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
      );
      setWebGlFailed(!webGlAvailable);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const views = useMemo(
    () =>
      CAMERA_STOP_IDS.map((id) => ({
        id,
        label: t(`views.${id}`),
      })),
    [t],
  );

  const selectView = useCallback((id: CameraStopId) => {
    setActiveView(id);
    setFreeMode(false);
  }, []);

  const move = useCallback((direction: -1 | 1) => {
    setActiveView((current) => {
      const index = CAMERA_STOP_IDS.indexOf(current);
      const nextIndex =
        (index + direction + CAMERA_STOP_IDS.length) % CAMERA_STOP_IDS.length;
      return CAMERA_STOP_IDS[nextIndex];
    });
    setFreeMode(false);
  }, []);

  const resetView = useCallback(() => {
    setFreeMode(false);
    setActiveView((current) => current);
  }, []);

  const markReady = useCallback(() => setReady(true), []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        setFreeMode((current) => !current);
      } else if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        resetView();
      } else if (/^[1-6]$/.test(event.key)) {
        event.preventDefault();
        selectView(CAMERA_STOP_IDS[Number(event.key) - 1]);
      }
    },
    [move, resetView, selectView],
  );

  return (
    <section
      aria-busy={!ready && !webGlFailed}
      aria-label={t("ariaLabel")}
      className="relative isolate h-[38rem] w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061333] shadow-[0_32px_90px_rgba(3,14,47,0.38)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f5c542] sm:h-[44rem]"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <Canvas
        camera={{ fov: 48, far: 900, near: 0.1, position: [150, 68, 122] }}
        dpr={quality === "high" ? [1, 1.75] : 1}
        fallback={
          <WebGlFallback message={t("webglUnavailable")} />
        }
        gl={{
          antialias: quality === "high",
          powerPreference: "high-performance",
        }}
        shadows={quality === "high"}
        onCreated={({ gl }) => {
          gl.outputColorSpace = "srgb";
          gl.toneMappingExposure = 0.94;
        }}
      >
        <Suspense fallback={null}>
          <PerformanceMonitor
            onDecline={() => setQuality("low")}
            onFallback={() => setQuality("low")}
          />
          <AdaptiveDpr pixelated />
          <BomboneraScene
            activeView={activeView}
            freeMode={freeMode}
            quality={quality}
            reducedMotion={reducedMotion}
            onSelectView={selectView}
          />
          <SceneReady onReady={markReady} />
        </Suspense>
      </Canvas>

      {!ready && !webGlFailed ? <LoadingOverlay label={t("loading")} /> : null}

      {!webGlFailed ? (
        <ExperienceControls
          activeView={activeView}
          freeMode={freeMode}
          freeHint={t("freeHint")}
          freeModeLabel={t("freeMode")}
          guidedHint={t("guidedHint")}
          guidedModeLabel={t("guidedMode")}
          modeLabel={t("modeLabel")}
          nextLabel={t("nextView")}
          previousLabel={t("previousView")}
          resetLabel={t("resetView")}
          title={t("controlTitle")}
          tourLabel={t("tourLabel")}
          views={views}
          onModeChange={setFreeMode}
          onNext={() => move(1)}
          onPrevious={() => move(-1)}
          onReset={resetView}
          onSelectView={selectView}
        />
      ) : null}

      <p aria-live="polite" className="sr-only">
        {t("currentView", { view: t(`views.${activeView}`) })}
        {quality === "low" ? ` ${t("qualityReduced")}` : ""}
      </p>
    </section>
  );
}
