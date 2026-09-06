import { getTranslations } from "next-intl/server";
import type { CompetitionDto, PlayerSeasonStatDto } from "@/lib/api/types";

/**
 * Season stats table (tabular-nums). One row per competition. Competition names
 * are resolved from a lookup map keyed by competition id.
 */
export async function PlayerStatsTable({
  stats,
  competitions,
}: {
  stats: PlayerSeasonStatDto[];
  competitions: CompetitionDto[];
}) {
  const t = await getTranslations("Player");
  const nameById = new Map(competitions.map((c) => [c.id, c.name]));

  return (
    <div role="region" tabIndex={0} aria-label={t("seasonStats")} className="overflow-x-auto rounded-lg border border-[var(--border)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
      <table className="w-full min-w-[560px] text-sm tabular-nums">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--muted)] text-left text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <th scope="col" className="px-3 py-2 text-left">{t("competition")}</th>
            <th scope="col" className="px-2 py-2 text-right">{t("appearances")}</th>
            <th scope="col" className="px-2 py-2 text-right">{t("minutes")}</th>
            <th scope="col" className="px-2 py-2 text-right">{t("goals")}</th>
            <th scope="col" className="px-2 py-2 text-right">{t("assists")}</th>
            <th scope="col" className="px-2 py-2 text-right">{t("yellow")}</th>
            <th scope="col" className="px-2 py-2 text-right">{t("red")}</th>
            <th scope="col" className="px-3 py-2 text-right">{t("rating")}</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr
              key={`${s.competitionId}-${s.seasonId}-${i}`}
              className="border-b border-[var(--border)] last:border-0"
            >
              <td className="px-3 py-2 text-left">
                {nameById.get(s.competitionId) ?? "—"}
              </td>
              <td className="px-2 py-2 text-right">{s.appearances}</td>
              <td className="px-2 py-2 text-right">{s.minutes}</td>
              <td className="px-2 py-2 text-right font-semibold">{s.goals}</td>
              <td className="px-2 py-2 text-right">{s.assists}</td>
              <td className="px-2 py-2 text-right">{s.yellow}</td>
              <td className="px-2 py-2 text-right">{s.red}</td>
              <td className="px-3 py-2 text-right">
                {s.rating != null ? s.rating.toFixed(2) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
