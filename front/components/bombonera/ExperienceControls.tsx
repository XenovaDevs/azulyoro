import type { CameraStopId } from "./cameraStops";

type ViewOption = {
  id: CameraStopId;
  label: string;
};

type ExperienceControlsProps = {
  activeView: CameraStopId;
  freeMode: boolean;
  guidedHint: string;
  freeHint: string;
  guidedModeLabel: string;
  freeModeLabel: string;
  modeLabel: string;
  nextLabel: string;
  previousLabel: string;
  resetLabel: string;
  title: string;
  tourLabel: string;
  views: readonly ViewOption[];
  onModeChange: (freeMode: boolean) => void;
  onNext: () => void;
  onPrevious: () => void;
  onReset: () => void;
  onSelectView: (id: CameraStopId) => void;
};

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  const path = direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6";

  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h5M20 20v-5h-5M5.6 15.5A7.5 7.5 0 0 0 18.7 17M18.4 8.5A7.5 7.5 0 0 0 5.3 7"
      />
    </svg>
  );
}

const controlClass =
  "inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border border-white/20 bg-[#071b4a]/88 text-white shadow-lg backdrop-blur-md transition hover:border-[#f5c542]/70 hover:bg-[#0a2866] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c542] active:scale-95";

export function ExperienceControls({
  activeView,
  freeMode,
  guidedHint,
  freeHint,
  guidedModeLabel,
  freeModeLabel,
  modeLabel,
  nextLabel,
  previousLabel,
  resetLabel,
  title,
  tourLabel,
  views,
  onModeChange,
  onNext,
  onPrevious,
  onReset,
  onSelectView,
}: ExperienceControlsProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-5">
      <div className="pointer-events-auto max-w-sm rounded-2xl border border-white/15 bg-[#061333]/86 p-3 text-white shadow-2xl backdrop-blur-xl sm:p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-sm font-bold tracking-wide text-[#f5c542] sm:text-base">
              {title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/75 sm:text-sm">
              {freeMode ? freeHint : guidedHint}
            </p>
          </div>

          <div
            aria-label={modeLabel}
            className="grid shrink-0 grid-cols-2 rounded-full border border-white/15 bg-black/25 p-1"
            role="group"
          >
            <button
              aria-pressed={!freeMode}
              className={`min-h-9 rounded-full px-3 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-[#f5c542] ${
                !freeMode
                  ? "bg-[#f5c542] text-[#061333]"
                  : "text-white/75 hover:text-white"
              }`}
              type="button"
              onClick={() => onModeChange(false)}
            >
              {guidedModeLabel}
            </button>
            <button
              aria-pressed={freeMode}
              className={`min-h-9 rounded-full px-3 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-[#f5c542] ${
                freeMode
                  ? "bg-[#f5c542] text-[#061333]"
                  : "text-white/75 hover:text-white"
              }`}
              type="button"
              onClick={() => onModeChange(true)}
            >
              {freeModeLabel}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <nav
          aria-label={tourLabel}
          className="pointer-events-auto max-w-[calc(100%-8rem)] overflow-x-auto rounded-2xl border border-white/15 bg-[#061333]/88 p-2 shadow-2xl backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <ol className="flex min-w-max gap-1.5">
            {views.map((view, index) => {
              const active = activeView === view.id;

              return (
                <li key={view.id}>
                  <button
                    aria-current={active ? "location" : undefined}
                    className={`min-h-11 touch-manipulation rounded-xl px-3 text-left text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#f5c542] sm:text-sm ${
                      active
                        ? "bg-[#f5c542] text-[#061333]"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    }`}
                    type="button"
                    onClick={() => onSelectView(view.id)}
                  >
                    <span aria-hidden="true" className="mr-1.5 font-mono opacity-60">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {view.label}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="pointer-events-auto grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            aria-label={previousLabel}
            className={controlClass}
            type="button"
            onClick={onPrevious}
          >
            <ArrowIcon direction="left" />
          </button>
          <button
            aria-label={nextLabel}
            className={controlClass}
            type="button"
            onClick={onNext}
          >
            <ArrowIcon direction="right" />
          </button>
          <button
            aria-label={resetLabel}
            className={`${controlClass} col-span-2 sm:col-span-1`}
            type="button"
            onClick={onReset}
          >
            <ResetIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
