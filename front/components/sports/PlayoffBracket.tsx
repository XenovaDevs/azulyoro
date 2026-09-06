"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { MatchDto } from "@/lib/api/types";
import { buildPlayoffBrackets, type PlayoffTie, type PlayoffRound } from "@/lib/playoffs";
import { BRACKET_COLUMN_WIDTH, BRACKET_HEADER_HEIGHT, BRACKET_TIE_WIDTH, layoutPlayoffBracket } from "@/lib/playoff-layout";
import { ARGENTINA_TIMEZONE, formatDateInZone } from "@/lib/dateUtils";
import { classifyStatus, statusTranslationKey } from "@/lib/matchStatus";
import { matchSlug } from "@/lib/slug";
import { Link } from "@/i18n/navigation";

function TieResult({ tie, locale, isFinal }: { tie: PlayoffTie; locale: string; isFinal: boolean }) {
  const t = useTranslations("Playoffs");
  const tm = useTranslations("Matches");
  const twoLegs = tie.fixtures.length > 1;
  const last = tie.fixtures.at(-1);
  const live = tie.fixtures.find(match => classifyStatus(match.status) === "live");
  const penalties = last?.status.toLowerCase() === "finished" && last.penaltyHome !== null && last.penaltyAway !== null ? last : null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--card)] text-sm">
      <div className="flex h-7 shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--muted)] px-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        <span className={live ? "text-[var(--live)]" : ""}>{live ? tm("live") : last ? tm(statusTranslationKey(last.status)) : t("pending")}</span>
        <span className="flex gap-3" aria-hidden="true">
          {twoLegs ? <><span>{t("firstLegShort")}</span><span>{t("secondLegShort")}</span></> : <span>{t("score")}</span>}
          {tie.aggregate ? <span>{t("aggregateShort")}</span> : null}
        </span>
      </div>
      <div className="divide-y divide-[var(--border)]" role="list" aria-label={t("teamsAndScores")}>
        {tie.teams.map((team, index) => {
          const winner = tie.winnerTeamId === team.id;
          const boca = team.name?.toLowerCase().includes("boca");
          return (
            <div key={team.id} role="listitem" className={`flex h-8 items-center gap-2 px-2.5 ${winner ? "bg-[color-mix(in_oklab,var(--oro-500)_12%,var(--card))] font-bold" : "font-medium"}`}>
              {team.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.logoUrl} alt="" width={18} height={18} loading="lazy" className="h-[18px] w-[18px] shrink-0 object-contain" />
              ) : <span className="h-[18px] w-[18px] shrink-0 rounded-full bg-[var(--muted)]" aria-hidden />}
              <span className={`min-w-0 flex-1 truncate ${boca ? "font-bold" : ""}`} title={team.name ?? undefined}>{team.name ?? t("teamPending")}</span>
              {winner ? <span className="text-[var(--accent)]" aria-label={t(isFinal ? "champion" : "winner")}>▸</span> : null}
              {tie.fixtures.map(match => {
                const score = team.id === match.homeTeamId ? match.homeGoals : match.awayGoals;
                const penalty = penalties?.id === match.id ? (team.id === match.homeTeamId ? match.penaltyHome : match.penaltyAway) : null;
                return <span key={match.id} className="w-6 shrink-0 text-right tabular-nums" aria-label={penalty !== null ? t("scoreWithPenalties", { score: score ?? "–", penalties: penalty }) : undefined}>
                  {score ?? "–"}{penalty !== null ? <sup className="ml-0.5 text-[9px] text-[var(--muted-foreground)]">{penalty}</sup> : null}
                </span>;
              })}
              {tie.aggregate ? <span className="w-7 shrink-0 border-l border-[var(--border)] pl-1.5 text-right font-bold tabular-nums text-[var(--accent)]">{tie.aggregate[index]}</span> : null}
            </div>
          );
        })}
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1 border-t border-[var(--border)] px-2.5 py-1.5 text-[11px] text-[var(--muted-foreground)]">
        {tie.fixtures.map((match, index) => {
          const date = formatDateInZone(match.dateUtc, locale, ARGENTINA_TIMEZONE, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
          return <Link key={match.id} href={{ pathname: "/partido/[slug]", params: { slug: matchSlug(match) } }}
            aria-label={`${match.homeTeamName ?? t("teamPending")} vs ${match.awayTeamName ?? t("teamPending")} · ${date || t("datePending")}`}
            className="flex min-h-5 items-center justify-between gap-1 rounded-xs underline-offset-2 hover:text-[var(--foreground)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
            <span>{twoLegs ? `${index === 0 ? t("firstLegShort") : t("secondLegShort")} · ` : ""}<time dateTime={match.dateUtc}>{date || t("datePending")}</time></span>
            <span className="text-[9px] tracking-wide">ARG ↗</span>
          </Link>;
        })}
        {penalties ? <span className="text-[9px]">{t("penaltiesLegend")}</span> : null}
      </div>
    </div>
  );
}

export function PlayoffBracket({ fixtures, competitionType, locale }: {
  fixtures: MatchDto[];
  competitionType: string;
  locale: string;
}) {
  const t = useTranslations("Playoffs");
  const brackets = useMemo(() => buildPlayoffBrackets(fixtures, competitionType).map(bracket => ({ bracket, layout: layoutPlayoffBracket(bracket) })), [fixtures, competitionType]);
  const roundTitle = (round: PlayoffRound) => round.stage === "other" ? round.label : t(round.stage);

  return <div className="flex min-w-0 flex-col gap-7" data-playoff-brackets>
    {brackets.map(({ bracket, layout }) => (
      <section key={bracket.id} className="min-w-0" aria-label={`${t("title")}${bracket.phase === "apertura" ? " · Apertura" : bracket.phase === "clausura" ? " · Clausura" : ""}`}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-base font-bold">{t("title")}{bracket.phase === "apertura" ? " · Apertura" : bracket.phase === "clausura" ? " · Clausura" : ""}</h3>
          <p className="text-xs text-[var(--muted-foreground)]">{t("scrollHint")}</p>
        </div>
        <div tabIndex={0} role="region" aria-label={t("scrollLabel")} style={{ maxHeight: bracket.rounds.some(round => round.ties.length > 8) ? "75vh" : undefined }} className="overflow-auto overscroll-contain rounded-lg border-y border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_45%,transparent)] p-4 focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
          <div className="relative" style={{ width: layout.width, height: layout.height + BRACKET_HEADER_HEIGHT }}>
            <svg aria-hidden="true" focusable="false" className="pointer-events-none absolute left-0 overflow-visible text-[var(--muted-foreground)] opacity-50" style={{ top: BRACKET_HEADER_HEIGHT }} width={layout.width} height={layout.height}>
              {layout.edges.map(edge => <path key={edge.id} d={edge.path} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />)}
            </svg>
            {layout.columns.map(({ round, ties }, column) => (
              <div key={round.id} className="absolute top-0" style={{ left: column * BRACKET_COLUMN_WIDTH, width: BRACKET_TIE_WIDTH }}>
                <h4 className="mb-4 flex h-10 items-center gap-2 border-b-2 border-[var(--oro-500)] font-display text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                  <span className="text-[var(--muted-foreground)]">{String(column + 1).padStart(2, "0")}</span>{roundTitle(round)}
                </h4>
                <ol className="relative m-0 list-none p-0" aria-label={roundTitle(round)}>
                  {ties.map(({ tie, y }) => <li key={tie.id} className="absolute left-0 w-full" style={{ top: y, height: layout.nodeHeight }}><TieResult tie={tie} locale={locale} isFinal={round.stage === "final"} /></li>)}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>
    ))}
  </div>;
}
