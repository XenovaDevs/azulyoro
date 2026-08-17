"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const BomboneraExperience = dynamic(() => import("./BomboneraExperience"), {
  ssr: false,
});

export function BomboneraLoader() {
  const t = useTranslations("Bombonera.experience");

  return (
    <div className="relative min-h-[38rem] sm:min-h-[44rem]">
      <div
        aria-hidden="true"
        className="absolute inset-0 grid place-items-center rounded-[1.75rem] border border-white/10 bg-[#061333]"
      >
        <div className="text-center">
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-white/20 border-t-[var(--oro-500)] motion-reduce:animate-none" />
          <p className="mt-4 font-display text-sm font-bold tracking-wide text-[var(--oro-400)]">
            {t("loading")}
          </p>
        </div>
      </div>
      <BomboneraExperience />
    </div>
  );
}
