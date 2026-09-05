"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { CompetitionDto } from "@/lib/api/types";

export function CompetitionSelector({ competitions, competitionId, season }: {
  competitions: CompetitionDto[];
  competitionId: string;
  season: number;
}) {
  const t = useTranslations("Standings");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const seasons = [...new Set(competitions.flatMap((competition) => competition.seasons))].sort((a, b) => b - a);
  const available = competitions.filter((competition) => competition.seasons.includes(season));

  function navigate(id: string, year: number) {
    startTransition(() => router.push(`${pathname}?${new URLSearchParams({ competition: id, season: String(year) })}`, { scroll: false }));
  }

  const selectClass = "w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm font-medium focus:outline-2 focus:outline-[var(--accent)] disabled:opacity-60";
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]" aria-busy={pending}>
      <label className="flex flex-col gap-1.5 text-xs text-[var(--muted-foreground)]">
        {t("competition")}
        <select aria-label={t("competition")} className={selectClass} value={competitionId} disabled={pending} onChange={(event) => navigate(event.target.value, season)}>
          {available.map((competition) => <option key={competition.id} value={competition.id}>{competition.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-xs text-[var(--muted-foreground)]">
        {t("season")}
        <select aria-label={t("season")} className={selectClass} value={season} disabled={pending} onChange={(event) => {
          const year = Number(event.target.value);
          const selected = competitions.find((competition) => competition.id === competitionId && competition.seasons.includes(year))
            ?? competitions.find((competition) => competition.seasons.includes(year));
          if (selected) navigate(selected.id, year);
        }}>
          {seasons.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      </label>
    </div>
  );
}
