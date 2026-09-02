"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import type { StandingDto } from "@/lib/api/types";

function isBocaRow(row: StandingDto, bocaTeamId?: string): boolean {
  if (bocaTeamId && row.teamId === bocaTeamId) return true;
  return (row.teamName ?? "").toLowerCase().includes("boca");
}

const FormPips = memo(function FormPips({ form }: { form: string | null }) {
  if (!form) return <span className="text-[var(--muted-foreground)]">—</span>;
  const color: Record<string, string> = {
    W: "bg-emerald-600",
    D: "bg-amber-500",
    L: "bg-rose-600",
  };
  return (
    <span className="inline-flex gap-1" aria-label={`Forma: ${form.slice(-5)}`}>
      {form
        .slice(-5)
        .split("")
        .map((r, i) => (
          <span
            key={i}
            title={r}
            className={`h-4 w-4 rounded-xs text-[10px] font-bold leading-4 text-white ${
              color[r.toUpperCase()] ?? "bg-[var(--muted)]"
            } text-center shadow-xs select-none`}
          >
            {r.toUpperCase()}
          </span>
        ))}
    </span>
  );
});

interface StandingsTableProps {
  rows: StandingDto[];
  bocaTeamId?: string;
  isAnnualTable?: boolean;
  locale?: string;
  captionTitle?: string;
}

/**
 * Responsive Standings Table.
 * - Sticky `#` and `Equipo` columns on horizontal scroll.
 * - Mobile-first column priority: core stats always visible, secondary stats on sm/md.
 * - Qualification borders and legend for annual/general table.
 */
export const StandingsTable = memo(function StandingsTable({
  rows,
  bocaTeamId,
  isAnnualTable = false,
  locale = "es",
  captionTitle,
}: StandingsTableProps) {
  const t = useTranslations("Standings");
  const isEs = locale === "es";
  const totalRows = rows.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xs touch-pan-x">
        <table className="w-full text-sm tabular-nums border-separate border-spacing-0 text-left">
          <caption className="sr-only">
            {captionTitle || (isEs ? "Tabla de posiciones" : "Standings table")}
          </caption>
          <thead>
            <tr className="bg-[var(--muted)] text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
              {/* Sticky Rank */}
              <th
                scope="col"
                className="sticky left-0 z-30 w-10 min-w-10 sm:w-12 sm:min-w-12 bg-[var(--muted)] px-2 py-3 text-center border-b border-[var(--border)]"
              >
                {t("rank")}
              </th>

              {/* Sticky Team */}
              <th
                scope="col"
                className="sticky left-10 sm:left-12 z-30 min-w-[130px] sm:min-w-[170px] bg-[var(--muted)] px-3 py-3 border-b border-r border-[var(--border)] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]"
              >
                {t("team")}
              </th>

              {/* Core numbers */}
              <th scope="col" className="px-2.5 py-3 text-right border-b border-[var(--border)]">
                <span title={isEs ? "Partidos Jugados" : "Matches Played"}>{t("played")}</span>
              </th>
              <th scope="col" className="px-2 py-3 text-right border-b border-[var(--border)]">
                <span title={isEs ? "Ganados" : "Wins"}>{t("win")}</span>
              </th>
              <th scope="col" className="px-2 py-3 text-right border-b border-[var(--border)]">
                <span title={isEs ? "Empatados" : "Draws"}>{t("draw")}</span>
              </th>
              <th scope="col" className="px-2 py-3 text-right border-b border-[var(--border)]">
                <span title={isEs ? "Perdidos" : "Losses"}>{t("lose")}</span>
              </th>

              {/* Secondary goals: hidden on mobile, visible on sm+ */}
              <th
                scope="col"
                className="hidden sm:table-cell px-2 py-3 text-right border-b border-[var(--border)]"
              >
                <span title={isEs ? "Goles a Favor" : "Goals For"}>{t("goalsFor")}</span>
              </th>
              <th
                scope="col"
                className="hidden sm:table-cell px-2 py-3 text-right border-b border-[var(--border)]"
              >
                <span title={isEs ? "Goles en Contra" : "Goals Against"}>{t("goalsAgainst")}</span>
              </th>

              {/* Goal Diff & Points: always visible */}
              <th scope="col" className="px-2.5 py-3 text-right border-b border-[var(--border)]">
                <span title={isEs ? "Diferencia de Gol" : "Goal Difference"}>{t("goalsDiff")}</span>
              </th>
              <th
                scope="col"
                className="px-3.5 py-3 text-right font-bold text-[var(--foreground)] border-b border-[var(--border)]"
              >
                <span title={isEs ? "Puntos" : "Points"}>{t("points")}</span>
              </th>

              {/* Form: hidden on small screens, visible on md+ */}
              <th
                scope="col"
                className="hidden md:table-cell px-3 py-3 text-left border-b border-[var(--border)] min-w-[110px]"
              >
                {t("form")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const boca = isBocaRow(row, bocaTeamId);
              const isLibertadores = isAnnualTable && row.rank <= 3;
              const isSudamericana = isAnnualTable && row.rank >= 4 && row.rank <= 9;
              const isRelegation = isAnnualTable && row.rank >= totalRows && totalRows > 4;

              let rankColor = "text-[var(--muted-foreground)]";
              let rowBorderLeft = "";

              if (boca) {
                rowBorderLeft = "border-l-4 border-l-[var(--oro-500)]";
              } else if (isLibertadores) {
                rowBorderLeft = "border-l-4 border-l-emerald-500";
                rankColor = "font-bold text-emerald-500";
              } else if (isSudamericana) {
                rowBorderLeft = "border-l-4 border-l-sky-500";
                rankColor = "font-bold text-sky-500";
              } else if (isRelegation) {
                rowBorderLeft = "border-l-4 border-l-rose-500";
                rankColor = "font-bold text-rose-500";
              }

              const rowBg = boca
                ? "bg-[color-mix(in_oklab,var(--oro-500)_12%,var(--card))]"
                : "bg-[var(--card)] hover:bg-[color-mix(in_oklab,var(--foreground)_3%,var(--card))]";

              return (
                <tr
                  key={row.teamId}
                  className={`group transition-colors ${rowBg} ${boca ? "font-semibold" : ""}`}
                >
                  {/* Sticky Rank Cell */}
                  <td
                    className={`sticky left-0 z-20 px-2 py-2.5 text-center text-xs border-b border-[var(--border)] ${rowBg} ${rowBorderLeft} ${rankColor}`}
                  >
                    <span className="inline-flex h-5.5 w-5.5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] text-xs font-semibold">
                      {row.rank}
                    </span>
                  </td>

                  {/* Sticky Team Cell */}
                  <td
                    className={`sticky left-10 sm:left-12 z-20 px-3 py-2.5 text-left font-medium border-b border-r border-[var(--border)] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] ${rowBg}`}
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      {row.teamLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.teamLogoUrl}
                          alt=""
                          width={20}
                          height={20}
                          loading="lazy"
                          className="h-5 w-5 sm:h-5.5 sm:w-5.5 shrink-0 object-contain"
                        />
                      ) : (
                        <span className="h-5 w-5 sm:h-5.5 sm:w-5.5 shrink-0 rounded-full bg-[var(--muted)]" />
                      )}
                      <span
                        className={`truncate text-xs sm:text-sm ${
                          boca ? "font-bold text-[var(--foreground)]" : "text-[var(--foreground)]"
                        }`}
                      >
                        {row.teamName ?? "—"}
                      </span>
                    </div>
                  </td>

                  {/* Numbers */}
                  <td className="px-2.5 py-2.5 text-right text-xs sm:text-sm text-[var(--muted-foreground)] border-b border-[var(--border)]">
                    {row.played}
                  </td>
                  <td className="px-2 py-2.5 text-right text-xs sm:text-sm border-b border-[var(--border)]">
                    {row.win}
                  </td>
                  <td className="px-2 py-2.5 text-right text-xs sm:text-sm border-b border-[var(--border)]">
                    {row.draw}
                  </td>
                  <td className="px-2 py-2.5 text-right text-xs sm:text-sm border-b border-[var(--border)]">
                    {row.lose}
                  </td>

                  {/* Secondary: GF & GC */}
                  <td className="hidden sm:table-cell px-2 py-2.5 text-right text-xs sm:text-sm text-[var(--muted-foreground)] border-b border-[var(--border)]">
                    {row.goalsFor}
                  </td>
                  <td className="hidden sm:table-cell px-2 py-2.5 text-right text-xs sm:text-sm text-[var(--muted-foreground)] border-b border-[var(--border)]">
                    {row.goalsAgainst}
                  </td>

                  {/* Diff & Points */}
                  <td className="px-2.5 py-2.5 text-right text-xs sm:text-sm font-medium border-b border-[var(--border)]">
                    {row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-bold text-sm sm:text-base text-[var(--foreground)] border-b border-[var(--border)]">
                    {row.points}
                  </td>

                  {/* Form */}
                  <td className="hidden md:table-cell px-3 py-2.5 text-left border-b border-[var(--border)]">
                    <FormPips form={row.form} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Qualification Legend for annual table or international spots */}
      {isAnnualTable && (
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 rounded-lg bg-[var(--muted)] px-3 py-2.5 text-xs text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">{t("qualification")}</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block shrink-0" />
            <span>{t("libertadores")}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500 inline-block shrink-0" />
            <span>{t("sudamericana")}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block shrink-0" />
            <span>{t("relegation")}</span>
          </span>
        </div>
      )}
    </div>
  );
});
