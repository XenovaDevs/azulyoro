"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { MatchStatisticsDto } from "@/lib/api/types";
import { MATCH_STATISTICS, statisticShares } from "@/lib/match-statistics";
import { ARGENTINA_TIMEZONE, formatDateInZone } from "@/lib/dateUtils";
import { classifyStatus } from "@/lib/matchStatus";

export function MatchStatistics({ data, status, homeTeamName, awayTeamName, locale }: {
  data: MatchStatisticsDto | null;
  status: string;
  homeTeamName: string | null;
  awayTeamName: string | null;
  locale: string;
}) {
  const t = useTranslations("MatchStatistics");
  const id = useId();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const state = classifyStatus(status);
  const stats = new Map(data?.statistics.map(row => [row.key, row]));
  const hasValues = MATCH_STATISTICS.some(({ key }) => stats.get(key)?.home != null || stats.get(key)?.away != null);
  const rows = MATCH_STATISTICS.filter(item => item.primary || stats.get(item.key)?.home != null || stats.get(item.key)?.away != null);
  const extraCount = rows.filter(row => !row.primary).length;
  const updated = data?.updatedAt ? formatDateInZone(data.updatedAt, locale, ARGENTINA_TIMEZONE,
    { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : "";
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  return <section aria-labelledby={`${id}-title`} className="min-w-0" data-match-statistics>
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id={`${id}-title`} className="font-display text-xl font-bold">{t("title")}</h2>
      {state === "live" ? <span className="text-xs font-semibold">{t("live")}</span> : null}
    </div>
    {!hasValues ? <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-5 text-sm text-[var(--muted-foreground)]">
      <p>{t(state === "scheduled" ? "scheduled" : data === null ? "loadError" : "empty")}</p>
      {data === null && state !== "scheduled" ? <button type="button" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}
        className="mt-3 min-h-11 cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 font-semibold text-[var(--foreground)] hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-50">{t(refreshing ? "refreshing" : "retry")}</button> : null}
    </div> : <>
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <table id={`${id}-table`} className="w-full table-fixed border-collapse">
          <caption className="sr-only">{t("comparison", { home: homeTeamName ?? t("home"), away: awayTeamName ?? t("away") })}</caption>
          <colgroup><col className="w-[23%]" /><col className="w-[54%]" /><col className="w-[23%]" /></colgroup>
          <thead className="bg-[var(--muted)] text-xs">
            <tr>
              <th scope="col" className="break-words px-1.5 py-3 sm:px-4 sm:py-4 text-center text-xs sm:text-sm font-semibold"><span className="mb-1 block text-[var(--muted-foreground)] text-[10px] sm:text-xs">{t("home")}</span>{homeTeamName ?? "—"}</th>
              <th scope="col" className="px-1.5 py-3 sm:px-4 sm:py-4 text-center text-xs sm:text-sm font-medium text-[var(--muted-foreground)]">{t("statistic")}</th>
              <th scope="col" className="break-words px-1.5 py-3 sm:px-4 sm:py-4 text-center text-xs sm:text-sm font-semibold"><span className="mb-1 block text-[var(--muted-foreground)] text-[10px] sm:text-xs">{t("away")}</span>{awayTeamName ?? "—"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.filter(row => expanded || row.primary).map(row => {
              const values = stats.get(row.key);
              const home = values?.home ?? null;
              const away = values?.away ?? null;
              const shares = statisticShares(home, away);
              const format = (value: number | null) => value === null ? "—" : `${number.format(value)}${row.percent ? "%" : ""}`;
              return <tr key={row.key} className="border-t border-[var(--border)]">
                <td className="px-1.5 py-3 sm:px-4 sm:py-4 text-center text-sm sm:text-base font-bold tabular-nums" aria-label={home === null ? t("unavailable") : undefined}>{format(home)}</td>
                <th scope="row" className="px-1.5 py-3 sm:px-4 sm:py-4 text-center text-xs sm:text-sm font-medium">
                  {t(row.key)}
                  <span aria-hidden="true" className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                    {shares ? <><span className="h-full bg-[var(--azul-500)]" style={{ width: `${shares[0]}%` }} /><span className="h-full bg-[var(--oro-500)]" style={{ width: `${shares[1]}%` }} /></> : null}
                  </span>
                </th>
                <td className="px-1.5 py-3 sm:px-4 sm:py-4 text-center text-sm sm:text-base font-bold tabular-nums" aria-label={away === null ? t("unavailable") : undefined}>{format(away)}</td>
              </tr>;
            })}
          </tbody>
        </table>
        {extraCount > 0 ? <button type="button" aria-expanded={expanded} aria-controls={`${id}-table`} onClick={() => setExpanded(value => !value)}
          className="min-h-12 w-full cursor-pointer border-t border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm font-semibold hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)]">{expanded ? t("showLess") : t("showMore", { count: extraCount })}</button> : null}
      </div>
      <p className="mt-3 text-xs text-[var(--muted-foreground)]">{t("missingHint")}{updated ? ` · ${t("updated", { time: updated })}` : ""}</p>
    </>}
  </section>;
}
