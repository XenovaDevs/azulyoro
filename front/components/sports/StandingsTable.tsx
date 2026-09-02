"use client";

import { useTranslations } from "next-intl";
import type { StandingDto } from "@/lib/api/types";

function isBocaRow(row: StandingDto, bocaTeamId?: string): boolean {
  if (bocaTeamId && row.teamId === bocaTeamId) return true;
  return (row.teamName ?? "").toLowerCase().includes("boca");
}

function FormPips({ form }: { form: string | null }) {
  if (!form) return <span className="text-[var(--muted-foreground)]">—</span>;
  const color: Record<string, string> = {
    W: "bg-emerald-600",
    D: "bg-amber-500",
    L: "bg-rose-600",
  };
  return (
    <span className="inline-flex gap-1">
      {form
        .slice(-5)
        .split("")
        .map((r, i) => (
          <span
            key={i}
            title={r}
            className={`h-4 w-4 rounded-sm text-[10px] font-bold leading-4 text-white ${
              color[r.toUpperCase()] ?? "bg-[var(--muted)]"
            } text-center shadow-xs`}
          >
            {r.toUpperCase()}
          </span>
        ))}
    </span>
  );
}

/**
 * Standings table (tabular-nums). Highlights the tracked team's row — matched by
 * `bocaTeamId` when provided, otherwise by teamName containing "Boca".
 * Supports qualification spot badges for Tabla Anual and leagues.
 */
export function StandingsTable({
  rows,
  bocaTeamId,
  isAnnualTable = false,
  locale = "es",
}: {
  rows: StandingDto[];
  bocaTeamId?: string;
  isAnnualTable?: boolean;
  locale?: string;
}) {
  const t = useTranslations("Standings");
  const isEs = locale === "es";

  const totalRows = rows.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xs">
        <table className="w-full min-w-[660px] text-sm tabular-nums">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)] text-left text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <th scope="col" className="px-3 py-3 text-center w-12">{t("rank")}</th>
              <th scope="col" className="px-3 py-3 text-left">{t("team")}</th>
              <th scope="col" className="px-2.5 py-3 text-right">{t("played")}</th>
              <th scope="col" className="px-2.5 py-3 text-right">{t("win")}</th>
              <th scope="col" className="px-2.5 py-3 text-right">{t("draw")}</th>
              <th scope="col" className="px-2.5 py-3 text-right">{t("lose")}</th>
              <th scope="col" className="px-2.5 py-3 text-right">{t("goalsFor")}</th>
              <th scope="col" className="px-2.5 py-3 text-right">{t("goalsAgainst")}</th>
              <th scope="col" className="px-2.5 py-3 text-right">{t("goalsDiff")}</th>
              <th scope="col" className="px-3.5 py-3 text-right font-bold text-[var(--foreground)]">{t("points")}</th>
              <th scope="col" className="px-3 py-3 text-left">{t("form")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const boca = isBocaRow(row, bocaTeamId);
              const isLibertadores = isAnnualTable && row.rank <= 3;
              const isSudamericana = isAnnualTable && row.rank >= 4 && row.rank <= 9;
              const isRelegation = isAnnualTable && row.rank >= totalRows && totalRows > 4;

              let rankBadgeClass = "text-[var(--muted-foreground)]";
              let rowBorderLeft = "";

              if (boca) {
                rowBorderLeft = "border-l-4 border-l-[var(--oro-500)]";
              } else if (isLibertadores) {
                rowBorderLeft = "border-l-4 border-l-emerald-500";
                rankBadgeClass = "font-bold text-emerald-500";
              } else if (isSudamericana) {
                rowBorderLeft = "border-l-4 border-l-sky-500";
                rankBadgeClass = "font-bold text-sky-500";
              } else if (isRelegation) {
                rowBorderLeft = "border-l-4 border-l-rose-500";
                rankBadgeClass = "font-bold text-rose-500";
              }

              return (
                <tr
                  key={row.teamId}
                  className={`border-b border-[var(--border)] last:border-0 transition-colors ${rowBorderLeft} ${
                    boca
                      ? "bg-[color-mix(in_oklab,var(--oro-500)_12%,var(--card))] font-semibold"
                      : "hover:bg-[color-mix(in_oklab,var(--foreground)_2.5%,var(--card))]"
                  }`}
                >
                  <td className={`px-3 py-2.5 text-center text-xs font-semibold ${rankBadgeClass}`}>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)]">
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-left font-medium">
                    <div className="flex items-center gap-2.5">
                      {row.teamLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.teamLogoUrl}
                          alt=""
                          width={22}
                          height={22}
                          loading="lazy"
                          className="h-5.5 w-5.5 shrink-0 object-contain"
                        />
                      ) : (
                        <span className="h-5.5 w-5.5 shrink-0 rounded-full bg-[var(--muted)]" />
                      )}
                      <span className={boca ? "font-bold text-[var(--foreground)]" : "text-[var(--foreground)]"}>
                        {row.teamName ?? "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-2.5 py-2.5 text-right text-[var(--muted-foreground)]">{row.played}</td>
                  <td className="px-2.5 py-2.5 text-right">{row.win}</td>
                  <td className="px-2.5 py-2.5 text-right">{row.draw}</td>
                  <td className="px-2.5 py-2.5 text-right">{row.lose}</td>
                  <td className="px-2.5 py-2.5 text-right text-[var(--muted-foreground)]">{row.goalsFor}</td>
                  <td className="px-2.5 py-2.5 text-right text-[var(--muted-foreground)]">{row.goalsAgainst}</td>
                  <td className="px-2.5 py-2.5 text-right font-medium">
                    {row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-bold text-base text-[var(--foreground)]">
                    {row.points}
                  </td>
                  <td className="px-3 py-2.5 text-left">
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
        <div className="flex flex-wrap items-center gap-4 rounded-lg bg-[var(--muted)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">{t("qualification")}</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
            <span>{t("libertadores")}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-sky-500 inline-block" />
            <span>{t("sudamericana")}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500 inline-block" />
            <span>{t("relegation")}</span>
          </span>
        </div>
      )}
    </div>
  );
}

