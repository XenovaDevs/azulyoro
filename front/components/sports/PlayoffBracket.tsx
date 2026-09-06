"use client";

import { useEffect, useEffectEvent, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { MatchDto } from "@/lib/api/types";
import { buildPlayoffBrackets, type PlayoffBracket as Bracket, type PlayoffTie, type PlayoffRound } from "@/lib/playoffs";
import { BRACKET_COLUMN_WIDTH, BRACKET_HEADER_HEIGHT, BRACKET_TIE_WIDTH, layoutPlayoffBracket } from "@/lib/playoff-layout";
import { preferredPlayoffTie } from "@/lib/playoff-navigation";
import { sportsPhaseLabel, sportsRoundLabel } from "@/lib/sports-labels";
import { ARGENTINA_TIMEZONE, formatDateInZone } from "@/lib/dateUtils";
import { classifyStatus, statusTranslationKey } from "@/lib/matchStatus";
import { matchSlug } from "@/lib/slug";
import { Link } from "@/i18n/navigation";

const controlClass = "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold transition-colors hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-default disabled:opacity-40";

function Arrow({ back = false }: { back?: boolean }) {
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={back ? "shrink-0 rotate-180" : "shrink-0"}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

function displayTeam(name: string | null, locale: string, pending: string) {
  if (!name || /^(tbd|tba|to be (defined|determined))$/i.test(name)) return pending;
  return locale.startsWith("es") && /^(winner|loser)\b/i.test(name)
    ? sportsRoundLabel(name.replace(/^winner\b/i, "Ganador").replace(/^loser\b/i, "Perdedor"), locale) : name;
}

function TieResult({ tie, locale, isFinal, compact = false }: { tie: PlayoffTie; locale: string; isFinal: boolean; compact?: boolean }) {
  const t = useTranslations("Playoffs");
  const tm = useTranslations("Matches");
  const twoLegs = tie.fixtures.length > 1;
  const last = tie.fixtures.at(-1);
  const live = tie.fixtures.find(match => classifyStatus(match.status) === "live");
  const penalties = last?.status.toLowerCase() === "finished" && last.penaltyHome !== null && last.penaltyAway !== null ? last : null;
  const columns = { gridTemplateColumns: `minmax(0, 1fr) repeat(${tie.fixtures.length + (tie.aggregate ? 1 : 0)}, 2.5rem)` };

  return <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--card)] text-sm" data-playoff-tie>
    <div style={columns} className="grid min-h-8 items-center border-b border-[var(--border)] bg-[var(--muted)] px-3 text-xs font-semibold text-[var(--muted-foreground)]">
      <span>{live ? tm("live") : last ? tm(statusTranslationKey(last.status)) : t("pending")}</span>
      {tie.fixtures.map((match, index) => <span key={match.id} className="text-center">{twoLegs ? t(index === 0 ? "firstLegShort" : "secondLegShort") : t("scoreShort")}</span>)}
      {tie.aggregate ? <span className="text-center">{t("aggregateShort")}</span> : null}
    </div>
    <div className="divide-y divide-[var(--border)]" role="list" aria-label={t("teamsAndScores")}>
      {tie.teams.map((team, index) => {
        const winner = tie.winnerTeamId === team.id;
        return <div key={team.id} role="listitem" style={columns} className={`grid min-h-11 items-center px-3 ${winner ? "bg-[color-mix(in_oklab,var(--oro-500)_12%,var(--card))] font-bold" : "font-medium"}`}>
          <span className="flex min-w-0 items-center gap-2 py-1.5">
            {team.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team.logoUrl} alt="" width={20} height={20} loading="lazy" className="h-5 w-5 shrink-0 object-contain" />
            ) : null}
            <span className={`min-w-0 break-words leading-snug ${compact ? "line-clamp-2" : ""}`} title={displayTeam(team.name, locale, t("teamPending"))}>{displayTeam(team.name, locale, t("teamPending"))}</span>
            {winner ? <svg role="img" aria-label={t(isFinal ? "champion" : "winner")} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="m5 12 4 4L19 6" /></svg> : null}
          </span>
          {tie.fixtures.map(match => {
            const score = team.id === match.homeTeamId ? match.homeGoals : match.awayGoals;
            const penalty = penalties?.id === match.id ? (team.id === match.homeTeamId ? match.penaltyHome : match.penaltyAway) : null;
            return <span key={match.id} className="text-center text-base tabular-nums" aria-label={penalty !== null ? t("scoreWithPenalties", { score: score ?? "–", penalties: penalty }) : undefined}>
              {score ?? "–"}{penalty !== null ? <sup className="ml-0.5 text-[10px]">{penalty}</sup> : null}
            </span>;
          })}
          {tie.aggregate ? <span className="border-l border-[var(--border)] text-center text-base font-bold tabular-nums">{tie.aggregate[index]}</span> : null}
        </div>;
      })}
    </div>
    <div className="mt-auto divide-y divide-[var(--border)] border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
      {tie.fixtures.map((match, index) => {
        const date = formatDateInZone(match.dateUtc, locale, ARGENTINA_TIMEZONE, { day: "2-digit", month: "short", year: "numeric" });
        const time = formatDateInZone(match.dateUtc, locale, ARGENTINA_TIMEZONE, { hour: "2-digit", minute: "2-digit", hour12: false });
        return <Link key={match.id} href={{ pathname: "/partido/[slug]", params: { slug: matchSlug(match) } }}
          aria-label={t("matchDetails", { home: displayTeam(match.homeTeamName, locale, t("teamPending")), away: displayTeam(match.awayTeamName, locale, t("teamPending")), date: `${date} ${time}`.trim() || t("datePending") })}
          className="flex min-h-11 items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)]">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">{twoLegs ? <strong>{t(index === 0 ? "firstLegShort" : "secondLegShort")}</strong> : null}<time dateTime={match.dateUtc}>{date || t("datePending")} {time ? <span className="whitespace-nowrap">· {time}</span> : null}</time></span>
          <Arrow />
        </Link>;
      })}
    </div>
    {penalties ? <p className="px-3 pb-2 text-xs text-[var(--muted-foreground)]">{t("penaltiesLegend")}</p> : null}
  </div>;
}

function BracketView({ bracket, locale }: { bracket: Bracket; locale: string }) {
  const t = useTranslations("Playoffs");
  const id = useId();
  const layout = useMemo(() => layoutPlayoffBracket(bracket), [bracket]);
  const [roundId, setRoundId] = useState(() => preferredPlayoffTie(bracket)?.round.id);
  const [view, setView] = useState<"round" | "full">("round");
  const [zoom, setZoom] = useState(100);
  const [target, setTarget] = useState<string | null>(null);
  const [navigation, setNavigation] = useState(0);
  const canvas = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLLIElement>());
  const round = bracket.rounds.find(item => item.id === roundId) ?? preferredPlayoffTie(bracket)?.round;
  const column = bracket.rounds.findIndex(item => item.id === round?.id);
  const boca = preferredPlayoffTie(bracket, true);
  const scale = zoom / 100;
  const title = (item: PlayoffRound) => item.stage === "other" ? sportsRoundLabel(item.label, locale) || t("pending") : t(item.stage);

  const positionView = useEffectEvent(() => {
    if (view === "full") {
      const positions = layout.columns[column]?.ties;
      const node = positions?.find(item => item.tie.id === target) ?? positions?.[0];
      canvas.current?.scrollTo({ left: column * BRACKET_COLUMN_WIDTH * scale, top: Math.max(0, (node?.y ?? 0) * scale - 16), behavior: "instant" });
      if (target) canvas.current?.focus({ preventScroll: true });
    } else if (target) {
      const node = nodes.current.get(target);
      node?.scrollIntoView({ block: "nearest", behavior: "instant" });
      node?.focus({ preventScroll: true });
    }
  });
  useEffect(() => { positionView(); }, [column, scale, target, view, navigation]);

  function navigate(nextId: string, tieId: string | null = null) {
    setRoundId(nextId);
    setTarget(tieId);
    setNavigation(value => value + 1);
  }

  if (!round) return null;

  return <section className="min-w-0" aria-label={`${t("title")}${["apertura", "clausura"].includes(bracket.phase) ? ` · ${sportsPhaseLabel(bracket.phase, locale)}` : ""}`}>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-display text-lg font-bold">{t("title")}{["apertura", "clausura"].includes(bracket.phase) ? ` · ${sportsPhaseLabel(bracket.phase, locale)}` : ""}</h3><p className="mt-1 text-xs text-[var(--muted-foreground)]">{t("timezone")}</p></div>
      {boca ? <button type="button" className={controlClass} onClick={() => navigate(boca.round.id, boca.tie.id)}>{t("findBoca")}<Arrow /></button> : null}
    </div>
    <div className="mb-4 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--card)] p-1 sm:inline-grid" role="group" aria-label={t("viewLabel")}>
        {(["round", "full"] as const).map(mode => <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)}
          className={`min-h-11 cursor-pointer rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${view === mode ? "bg-[var(--azul-700)] text-white" : "hover:bg-[var(--muted)]"}`}>{t(mode === "round" ? "roundView" : "fullView")}</button>)}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-xs font-semibold text-[var(--muted-foreground)]" htmlFor={`${id}-round`}>{t("chooseRound")}
          <select id={`${id}-round`} className="mt-1 block min-h-11 w-full cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-base font-medium text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]" value={round.id} onChange={event => navigate(event.target.value)}>
            {bracket.rounds.map(item => <option key={item.id} value={item.id}>{title(item)} ({item.ties.length})</option>)}
          </select>
        </label>
        <button type="button" className={controlClass} aria-label={t("previousRound")} disabled={column <= 0} onClick={() => { const previous = bracket.rounds[column - 1]; if (previous) navigate(previous.id); }}><Arrow back /></button>
        <button type="button" className={controlClass} aria-label={t("nextRound")} disabled={column >= bracket.rounds.length - 1} onClick={() => { const next = bracket.rounds[column + 1]; if (next) navigate(next.id); }}><Arrow /></button>
        {view === "full" ? <label className="w-full text-xs font-semibold text-[var(--muted-foreground)] sm:w-auto" htmlFor={`${id}-zoom`}>{t("zoom")}
          <select id={`${id}-zoom`} value={zoom} onChange={event => setZoom(Number(event.target.value))} className="mt-1 min-h-11 w-full cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-base text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
            {[50, 75, 100, 125].map(value => <option key={value} value={value}>{value}%</option>)}
          </select>
        </label> : null}
      </div>
    </div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2" aria-live="polite" aria-atomic="true">
      <h4 className="font-display font-bold">{title(round)}</h4><span className="text-xs text-[var(--muted-foreground)]">{t("roundProgress", { current: column + 1, total: bracket.rounds.length, count: round.ties.length })}</span>
    </div>
    {view === "round" ? <ol className="grid min-w-0 grid-cols-1 items-start gap-x-8 gap-y-6 p-0 md:grid-cols-2 xl:grid-cols-3" aria-label={title(round)}>
      {round.ties.map(tie => {
        const destination = bracket.connections.find(edge => edge.fromTieId === tie.id);
        const nextRound = destination ? bracket.rounds.find(item => item.ties.some(next => next.id === destination.toTieId)) : undefined;
        const nextTie = nextRound?.ties.find(next => next.id === destination?.toTieId);
        return <li key={tie.id} tabIndex={-1} ref={node => { if (node) nodes.current.set(tie.id, node); else nodes.current.delete(tie.id); }} className={`min-w-0 list-none rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] ${target === tie.id ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)]" : ""}`}>
          <TieResult tie={tie} locale={locale} isFinal={round.stage === "final"} />
          {nextRound && nextTie ? <div className="ml-5 border-l-2 border-[var(--border)] pb-1 pl-4 pt-3">
            <button type="button" className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-xs transition-colors hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]" onClick={() => navigate(nextRound.id, nextTie.id)}>
              <span><span className="block font-semibold">{t("followTie", { round: title(nextRound) })}</span><span className="mt-1 block text-[var(--muted-foreground)]">{nextTie.teams.map(team => displayTeam(team.name, locale, t("teamPending"))).join(" · ")}</span></span><Arrow />
            </button>
          </div> : null}
        </li>;
      })}
    </ol> : <>
      <p className="mb-3 text-xs text-[var(--muted-foreground)]">{t("scrollHint")}</p>
      <div ref={canvas} tabIndex={0} role="region" aria-label={t("scrollLabel")} className="max-h-[70svh] overflow-auto overscroll-contain rounded-lg border border-[var(--border)] bg-[var(--muted)] p-3 focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
        <div className="relative" style={{ width: layout.width * scale, height: (layout.height + BRACKET_HEADER_HEIGHT) * scale }}>
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: layout.width, height: layout.height + BRACKET_HEADER_HEIGHT, transform: `scale(${scale})` }}>
            <svg aria-hidden="true" focusable="false" className="pointer-events-none absolute left-0 overflow-visible text-[var(--muted-foreground)]" style={{ top: BRACKET_HEADER_HEIGHT }} width={layout.width} height={layout.height}>
              {layout.edges.map(edge => <path key={edge.id} d={edge.path} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />)}
            </svg>
            {layout.columns.map(({ round: item, ties }, index) => <div key={item.id} className="absolute top-0" style={{ left: index * BRACKET_COLUMN_WIDTH, width: BRACKET_TIE_WIDTH }}>
              <h4 className="mb-4 flex h-10 items-center gap-2 border-b-2 border-[var(--oro-500)] font-display text-sm font-bold">{title(item)}</h4>
              <ol className="relative m-0 list-none p-0" aria-label={title(item)}>{ties.map(({ tie, y }) => <li key={tie.id} className={`absolute left-0 w-full rounded-md ${target === tie.id ? "ring-2 ring-[var(--accent)]" : ""}`} style={{ top: y, height: layout.nodeHeight }}><TieResult tie={tie} locale={locale} isFinal={item.stage === "final"} compact /></li>)}</ol>
            </div>)}
          </div>
        </div>
      </div>
    </>}
  </section>;
}

export function PlayoffBracket({ fixtures, competitionType, locale }: { fixtures: MatchDto[]; competitionType: string; locale: string }) {
  const brackets = useMemo(() => buildPlayoffBrackets(fixtures, competitionType), [fixtures, competitionType]);
  return <div className="flex min-w-0 flex-col gap-8" data-playoff-brackets>{brackets.map(bracket => <BracketView key={bracket.id} bracket={bracket} locale={locale} />)}</div>;
}
