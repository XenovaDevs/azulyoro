"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { CompetitionOverviewDto } from "@/lib/api/types";
import { fixtureGroups, fixturePhase, isKnockoutRound, latestPhase, standingGroups } from "@/lib/competitions";
import { classifyStatus } from "@/lib/matchStatus";
import { buildPlayoffBrackets } from "@/lib/playoffs";
import { StandingsTable } from "./StandingsTable";
import { MatchCard } from "./MatchCard";
import { PlayoffBracket } from "./PlayoffBracket";
import { EmptyState } from "@/components/ui/EmptyState";

export function StandingsFilterView({ overview, locale }: { overview: CompetitionOverviewDto; locale: string }) {
  const t = useTranslations("Standings");
  const [phase, setPhase] = useState(() => latestPhase(overview.fixtures, overview.standings, overview.competition.type));
  const [stage, setStage] = useState("all");
  const [status, setStatus] = useState("all");
  const [round, setRound] = useState("all");
  const [bocaOnly, setBocaOnly] = useState(false);
  const [visible, setVisible] = useState(30);
  const phases = [...new Set([
    ...overview.standings.map((row) => row.phase),
    ...overview.fixtures.map((match) => fixturePhase(match.round, overview.competition.type)),
  ])].filter(Boolean);
  const phaseLabel = (value: string) => {
    switch (value) {
      case "apertura": return "Apertura";
      case "clausura": return "Clausura";
      case "annual": return t("annualTable");
      case "groups": return t("groupStage");
      case "playoffs": return t("playoffs");
      case "league": return t("regularSeason");
      default: return value;
    }
  };
  const tables = useMemo(() => standingGroups(overview.standings.filter((row) => phase === "all" || row.phase === phase)), [overview.standings, phase]);
  const fixtures = useMemo(() => overview.fixtures.filter((match) => {
    const matchPhase = fixturePhase(match.round, overview.competition.type);
    if (phase === "annual") {
      if (!["apertura", "clausura"].includes(matchPhase) || isKnockoutRound(match.round, overview.competition.type)) return false;
    } else if (phase !== "all" && matchPhase !== phase) return false;
    if (stage === "playoffs" && !isKnockoutRound(match.round, overview.competition.type)) return false;
    if (stage === "groups" && isKnockoutRound(match.round, overview.competition.type)) return false;
    return !bocaOnly || match.isBoca;
  }).sort((a, b) => Date.parse(a.dateUtc) - Date.parse(b.dateUtc)), [overview.fixtures, overview.competition.type, phase, stage, bocaOnly]);
  const rounds = [...new Set(fixtures.map((match) => match.round).filter((value) => value !== null))];
  const selectedFixtures = fixtures.filter((match) => (round === "all" || match.round === round)
    && (status === "all" || classifyStatus(match.status) === status));
  if (status === "finished") selectedFixtures.reverse();
  const regularFixtures = selectedFixtures.filter(match => !isKnockoutRound(match.round, overview.competition.type));
  const selectedPlayoffs = new Set(selectedFixtures.filter(match => isKnockoutRound(match.round, overview.competition.type)).map(match => match.id));
  // Keep both legs of a selected tie, even when a status filter matches only one.
  const playoffFixtures = buildPlayoffBrackets(fixtures, overview.competition.type).flatMap(bracket =>
    bracket.rounds.flatMap(round => round.ties.filter(tie => tie.fixtures.some(match => selectedPlayoffs.has(match.id)))
      .flatMap(tie => tie.fixtures)));
  const groups = fixtureGroups(regularFixtures.slice(0, visible));
  const shown = Math.min(visible, regularFixtures.length) + playoffFixtures.length;
  const total = regularFixtures.length + playoffFixtures.length;
  const selectClass = "rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm focus:outline-2 focus:outline-[var(--accent)]";

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("phase")}>
        {["all", ...phases].map((value) => (
          <button type="button" key={value} aria-pressed={phase === value} onClick={() => { setPhase(value); setStage("all"); setRound("all"); setVisible(30); }}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${phase === value ? "border-[var(--oro-500)] bg-[var(--oro-500)] text-[var(--azul-900)]" : "border-[var(--border)] hover:border-[var(--accent)]"}`}>
            {value === "all" ? t("allPhases") : phaseLabel(value)}
          </button>
        ))}
      </div>

      {tables.length > 0 && stage !== "playoffs" ? (
        <section className="flex flex-col gap-6" aria-label={t("title")}>
          {tables.map((table, index) => (
            <div key={`${table.name}-${index}`}>
              <h2 className="mb-3 font-display text-lg font-semibold">{table.name || phaseLabel(table.rows[0]?.phase ?? "league")}</h2>
              {table.rows.some((row) => row.isProvisional) ? <p className="mb-2 text-xs text-[var(--muted-foreground)]">{t("provisional")}</p> : null}
              <StandingsTable rows={table.rows} locale={locale} captionTitle={table.name} />
            </div>
          ))}
        </section>
      ) : <p className="text-sm text-[var(--muted-foreground)]">{t(stage === "playoffs" || phase === "playoffs" || overview.competition.type.toLowerCase() === "cup" ? "knockoutNotice" : "noTableForPhase")}</p>}

      <section className="flex flex-col gap-4" aria-label={t("fixtureTitle")}>
        <div>
          <h2 className="font-display text-xl font-semibold">{t("fixtureTitle")}</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t("fixtureDescription")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-[var(--muted-foreground)]">{t("stage")}
            <select aria-label={t("stage")} className={selectClass} value={stage} onChange={(event) => { setStage(event.target.value); setRound("all"); setVisible(30); }}>
              <option value="all">{t("allStages")}</option><option value="groups">{t("regularAndGroups")}</option><option value="playoffs">{t("playoffs")}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--muted-foreground)]">{t("round")}
            <select aria-label={t("round")} className={selectClass} value={round} onChange={(event) => { setRound(event.target.value); setVisible(30); }}>
              <option value="all">{t("allRounds")}</option>{rounds.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--muted-foreground)]">{t("matchStatus")}
            <select aria-label={t("matchStatus")} className={selectClass} value={status} onChange={(event) => { setStatus(event.target.value); setVisible(30); }}>
              <option value="all">{t("allMatches")}</option><option value="scheduled">{t("upcoming")}</option><option value="finished">{t("results")}</option><option value="live">{t("live")}</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bocaOnly} onChange={(event) => { setBocaOnly(event.target.checked); setRound("all"); setVisible(30); }} className="h-4 w-4 accent-[var(--oro-500)]" />{t("bocaOnly")}</label>
        <p className="text-xs text-[var(--muted-foreground)]" aria-live="polite">{t("matchCount", { shown, total })}</p>
        {playoffFixtures.length > 0 ? <PlayoffBracket fixtures={playoffFixtures} competitionType={overview.competition.type} locale={locale} /> : null}
        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-3 font-display text-sm font-semibold text-[var(--accent)]">{group.title || t("roundPending")}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{group.matches.map((match) => <MatchCard key={match.id} match={match} locale={locale} linked />)}</div>
          </div>
        ))}
        {total === 0 ? <EmptyState title={t("noFixtures")} description={t("noFixturesDescription")} /> : null}
        {visible < regularFixtures.length ? <button type="button" onClick={() => setVisible((count) => count + 30)} className="self-center rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold hover:border-[var(--accent)]">{t("loadMore")}</button> : null}
      </section>
    </div>
  );
}
