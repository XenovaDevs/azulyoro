"use client";

import { useState } from "react";
import type { EventDto, LineupDto, LineupPlayerDto } from "@/lib/api/types";

interface MatchLineupsViewProps {
  lineups: LineupDto[];
  events?: EventDto[];
  locale?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  homeGoals?: number | null;
  awayGoals?: number | null;
  status?: string;
}

interface PlayerEventBadges {
  goals: number;
  yellowCards: number;
  redCards: number;
  subbedOut: boolean;
  subbedIn: boolean;
}

function getPlayerBadges(
  playerId: string,
  playerName: string | null,
  events: EventDto[] = [],
): PlayerEventBadges {
  const badges: PlayerEventBadges = {
    goals: 0,
    yellowCards: 0,
    redCards: 0,
    subbedOut: false,
    subbedIn: false,
  };

  const norm = (s: string | null) => (s ?? "").trim().toLowerCase();
  const pName = norm(playerName);

  for (const e of events) {
    const type = (e.type ?? "").toLowerCase();
    const detail = (e.detail ?? "").toLowerCase();
    const isThisPlayer =
      (e.playerId && e.playerId === playerId) ||
      (pName && norm(e.playerName) === pName);
    const isAssist =
      (e.assistPlayerId && e.assistPlayerId === playerId) ||
      (pName && norm(e.assistName) === pName);

    if (type === "goal" && isThisPlayer && !detail.includes("missed")) {
      badges.goals++;
    }

    if (type === "card" && isThisPlayer) {
      if (detail.includes("red") || detail.includes("roja")) {
        badges.redCards++;
      } else if (detail.includes("yellow") || detail.includes("amarilla")) {
        badges.yellowCards++;
      }
    }

    if (type === "substitution" || type === "subst") {
      if (isThisPlayer) {
        badges.subbedIn = true;
      }
      if (isAssist) {
        badges.subbedOut = true;
      }
    }
  }

  return badges;
}

/** Parses formation (e.g. "4-3-3" -> [1, 4, 3, 3]) */
function parseFormationRows(formation: string | null): number[] {
  if (!formation) return [1, 4, 4, 2];
  const parts = formation.split("-").map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n) && n > 0);
  if (parts.length === 0) return [1, 4, 4, 2];
  return [1, ...parts]; // 1 goalkeeper + lines
}

/** Groups starters into tactical lines based on grid or formation */
function groupStartersIntoLines(
  starters: LineupPlayerDto[],
  formation: string | null,
): LineupPlayerDto[][] {
  const hasGrid = starters.some((p) => Boolean(p.grid));
  if (hasGrid) {
    const rowsMap = new Map<number, LineupPlayerDto[]>();
    for (const p of starters) {
      const row = p.grid ? parseInt(p.grid.split(":")[0], 10) || 1 : 1;
      const bucket = rowsMap.get(row) ?? [];
      bucket.push(p);
      rowsMap.set(row, bucket);
    }
    const sortedKeys = Array.from(rowsMap.keys()).sort((a, b) => a - b);
    return sortedKeys.map((k) => {
      const rowPlayers = rowsMap.get(k)!;
      return rowPlayers.sort((a, b) => {
        const colA = a.grid ? parseInt(a.grid.split(":")[1], 10) || 0 : 0;
        const colB = b.grid ? parseInt(b.grid.split(":")[1], 10) || 0 : 0;
        return colA - colB;
      });
    });
  }

  const rows = parseFormationRows(formation);
  const result: LineupPlayerDto[][] = [];
  let currentIndex = 0;

  for (const count of rows) {
    const line = starters.slice(currentIndex, currentIndex + count);
    if (line.length > 0) {
      result.push(line);
    }
    currentIndex += count;
  }

  if (currentIndex < starters.length) {
    result.push(starters.slice(currentIndex));
  }

  return result;
}

export function MatchLineupsView({
  lineups,
  events = [],
  locale = "es",
  homeTeamName,
  awayTeamName,
  homeGoals,
  awayGoals,
}: MatchLineupsViewProps) {
  const [selectedTeamIdx, setSelectedTeamIdx] = useState<number>(0);
  const isEs = locale === "es";

  const hasScore = homeGoals != null || awayGoals != null;

  if (!lineups || lineups.length === 0) {
    return (
      <div className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-emerald-800/80 bg-gradient-to-b from-emerald-700 via-emerald-800 to-emerald-900 p-8 shadow-2xl text-white">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute inset-3 border-2 border-white/60 rounded-sm" />
          <div className="absolute top-1/2 left-3 right-3 h-0.5 bg-white/60 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/60" />
          <div className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
          <div className="absolute top-3 left-1/2 h-16 w-36 -translate-x-1/2 border-2 border-t-0 border-white/60" />
          <div className="absolute bottom-3 left-1/2 h-16 w-36 -translate-x-1/2 border-2 border-b-0 border-white/60" />
        </div>

        <div className="relative z-10 my-12 flex flex-col items-center justify-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-2xl border border-white/20 backdrop-blur-xs shadow-lg">
            📋
          </span>
          <h3 className="font-display text-lg font-bold text-white">
            {isEs ? "Alineaciones no disponibles" : "Lineups not available"}
          </h3>
          <p className="max-w-md text-xs sm:text-sm text-emerald-100/80">
            {isEs
              ? "Las formaciones tácticas oficiales de los equipos se publican habitualmente 1 hora antes del pitazo inicial o tras la confirmación de las autoridades."
              : "Official starting lineups and tactical formations are typically confirmed 1 hour before kickoff."}
          </p>
        </div>
      </div>
    );
  }

  const activeLineup = lineups[selectedTeamIdx] ?? lineups[0];
  const starters = activeLineup.players.filter((p) => p.isStarter);
  const substitutes = activeLineup.players.filter((p) => !p.isStarter);
  const tacticalLines = groupStartersIntoLines(starters, activeLineup.formation);
  const isBoca = (activeLineup.teamName ?? "").toLowerCase().includes("boca");

  return (
    <div className="flex flex-col gap-6">
      {/* Team selector tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {lineups.map((lu, idx) => {
            const active = idx === selectedTeamIdx;
            return (
              <button
                key={lu.teamId || idx}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedTeamIdx(idx)}
                className={`min-h-11 max-w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                  active
                    ? "bg-[var(--accent)] text-white shadow-md"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[color-mix(in_oklab,var(--foreground)_8%,var(--muted))] hover:text-[var(--foreground)]"
                }`}
              >
                {lu.teamName ?? `${isEs ? "Equipo" : "Team"} ${idx + 1}`}
                {lu.formation && (
                  <span className={`ml-2 text-xs font-normal ${active ? "text-amber-200" : "opacity-75"}`}>
                    ({lu.formation})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeLineup.coachName && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-md bg-[var(--card)] border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
            <span className="font-semibold text-[var(--foreground)]">
              {isEs ? "DT:" : "Coach:"}
            </span>
            <span>{activeLineup.coachName}</span>
          </div>
        )}
      </div>

      {/* Main pitch & bench layout */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* Tactical Pitch (View from above) */}
        <div className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-emerald-800/80 bg-gradient-to-b from-emerald-700 via-emerald-800 to-emerald-900 p-4 sm:p-6 shadow-2xl text-white">
          {/* Pitch Field Markings (SVG overlay) */}
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute inset-3 border-2 border-white/60 rounded-sm" />
            <div className="absolute top-1/2 left-3 right-3 h-0.5 bg-white/60 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/60" />
            <div className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
            <div className="absolute top-3 left-1/2 h-16 w-36 -translate-x-1/2 border-2 border-t-0 border-white/60" />
            <div className="absolute top-3 left-1/2 h-7 w-20 -translate-x-1/2 border-2 border-t-0 border-white/60" />
            <div className="absolute bottom-3 left-1/2 h-16 w-36 -translate-x-1/2 border-2 border-b-0 border-white/60" />
            <div className="absolute bottom-3 left-1/2 h-7 w-20 -translate-x-1/2 border-2 border-b-0 border-white/60" />
            <div className="absolute inset-0 flex flex-col justify-between opacity-15">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-1/6 w-full odd:bg-black even:bg-transparent" />
              ))}
            </div>
          </div>

          {/* Tactical Pitch Header with Attack Direction & Formation */}
          <div className="relative z-10 mb-2 flex items-center justify-between text-xs font-semibold text-emerald-200 uppercase tracking-wider">
            <span>{isEs ? "Ataque" : "Attack"} ⬆️</span>
            <span>{activeLineup.formation ?? (isEs ? "Formación" : "Lineup")}</span>
          </div>

          {/* Score display inside the tactical pitch map (User requirement) */}
          {hasScore && (
            <div className="relative z-10 mb-4 flex items-center justify-center">
              <div className="flex items-center gap-2.5 sm:gap-3 rounded-full border border-emerald-400/40 bg-black/80 px-3.5 sm:px-5 py-1 sm:py-1.5 shadow-2xl backdrop-blur-md">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-emerald-100 truncate max-w-[100px] sm:max-w-[150px]">
                  {homeTeamName ?? "Local"}
                </span>
                <span className="rounded bg-amber-400/20 px-2 sm:px-2.5 py-0.5 font-mono text-xs sm:text-sm font-extrabold text-amber-300">
                  {homeGoals ?? "—"} : {awayGoals ?? "—"}
                </span>
                <span className="font-display text-xs font-bold uppercase tracking-wider text-emerald-100 truncate max-w-[100px] sm:max-w-[150px]">
                  {awayTeamName ?? "Visita"}
                </span>
              </div>
            </div>
          )}

          {/* Tactical lines from Attackers (top) to Goalkeeper (bottom) */}
          <div className="relative z-10 flex min-h-[460px] flex-col-reverse justify-between py-2 sm:min-h-[520px]">
            {tacticalLines.map((line, lineIdx) => (
              <div
                key={lineIdx}
                className="grid items-start justify-items-center gap-1 sm:gap-2"
                style={{ gridTemplateColumns: `repeat(${line.length}, minmax(0, 1fr))` }}
              >
                {line.map((player) => {
                  const badges = getPlayerBadges(player.playerId, player.playerName, events);
                  return (
                    <div
                      key={player.playerId}
                      className="group flex w-full min-w-0 flex-col items-center gap-1.5"
                    >
                      {/* Tactical Player Circle with Photo & Badges */}
                      <div className="relative flex aspect-square w-11 max-w-full sm:w-14 items-center justify-center rounded-full shadow-xl transition-shadow group-hover:shadow-amber-400/50">
                        {player.photoUrl ? (
                          <div className={`relative h-full w-full rounded-full overflow-hidden border-2 shadow-inner bg-slate-900 ${
                            isBoca ? "border-amber-400" : "border-slate-300"
                          }`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={player.photoUrl}
                              alt={player.playerName ?? ""}
                              className="h-full w-full object-cover object-top"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div
                            className={`flex h-full w-full items-center justify-center rounded-full border-2 font-bold tabular-nums text-sm sm:text-base ${
                              isBoca
                                ? "border-amber-400 bg-gradient-to-tr from-blue-900 via-blue-800 to-blue-950 text-amber-300 shadow-inner"
                                : "border-slate-300 bg-gradient-to-tr from-slate-800 to-slate-900 text-white shadow-inner"
                            }`}
                          >
                            {player.number ?? "–"}
                          </div>
                        )}

                        {/* Dorsal Number Badge (Bottom pill) */}
                        {player.number != null && (
                          <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.2 text-[9px] sm:text-[10px] font-extrabold tabular-nums shadow-md ${
                            isBoca ? "bg-amber-400 text-blue-950" : "bg-white text-slate-900"
                          }`}>
                            {player.number}
                          </span>
                        )}

                        {/* Substitution indicators (Small icons on top - User requirement) */}
                        {badges.subbedOut && (
                          <span
                            className="absolute -top-1.5 -left-1.5 z-30 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white shadow-md ring-1 ring-white/70"
                            title={isEs ? "Salió del campo (Sustituido)" : "Subbed out"}
                          >
                            ⬇
                          </span>
                        )}
                        {badges.subbedIn && (
                          <span
                            className="absolute -top-1.5 -right-1.5 z-30 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-extrabold text-white shadow-md ring-1 ring-white/70"
                            title={isEs ? "Ingresó al campo (Entró)" : "Subbed in"}
                          >
                            ⬆
                          </span>
                        )}

                        {/* Goals & Cards badges floating at top edge */}
                        <div className="absolute -top-1 right-2 flex items-center gap-0.5 z-20">
                          {badges.goals > 0 && (
                            <span
                              className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white shadow-md font-bold"
                              title={`${badges.goals} ${isEs ? "gol(es)" : "goal(s)"}`}
                            >
                              ⚽{badges.goals > 1 ? badges.goals : ""}
                            </span>
                          )}
                          {badges.yellowCards > 0 && (
                            <span
                              className="h-3.5 w-2 rounded-xs bg-amber-400 shadow-md inline-block border border-black/20"
                              title={isEs ? "Tarjeta amarilla" : "Yellow card"}
                            />
                          )}
                          {badges.redCards > 0 && (
                            <span
                              className="h-3.5 w-2 rounded-xs bg-rose-600 shadow-md inline-block border border-black/20"
                              title={isEs ? "Tarjeta roja" : "Red card"}
                            />
                          )}
                        </div>
                      </div>

                      {/* Player Name Pill */}
                      <span title={player.playerName ?? undefined} className="w-full min-w-0 max-w-[105px] break-words rounded-md bg-black/85 px-1 py-0.5 text-center text-[10px] sm:text-xs font-semibold text-white backdrop-blur-xs border border-white/20 shadow-md">
                        {player.playerName ?? "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="relative z-10 mt-3 text-center text-[11px] font-medium text-emerald-200/80">
            {isEs ? "Arquero" : "Goalkeeper"} 🧤
          </div>
        </div>

        {/* Bench / Substitutes Column */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            {/* Header with Score arriba en suplentes (User requirement) */}
            <div className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <div>
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {isEs ? "Suplentes" : "Substitutes"}
                </h3>
                <span className="text-xs text-[var(--muted-foreground)] font-normal">
                  {substitutes.length} {isEs ? "jugadores" : "players"}
                </span>
              </div>

              {/* Score indicator on top of substitutes */}
              {hasScore && (
                <div className="flex items-center gap-1.5 rounded-md bg-[var(--muted)] px-2.5 py-1 text-xs font-bold tabular-nums text-[var(--foreground)] border border-[var(--border)] shadow-xs">
                  <span>{(homeTeamName ?? "LOC").slice(0, 3).toUpperCase()}</span>
                  <span className="text-[var(--oro-500)]">{homeGoals ?? 0} - {awayGoals ?? 0}</span>
                  <span>{(awayTeamName ?? "VIS").slice(0, 3).toUpperCase()}</span>
                </div>
              )}
            </div>

            {substitutes.length > 0 ? (
              <ul className="flex flex-col divide-y divide-[var(--border)]">
                {substitutes.map((sub) => {
                  const badges = getPlayerBadges(sub.playerId, sub.playerName, events);
                  return (
                    <li
                      key={sub.playerId}
                      className="flex items-center justify-between py-2 text-sm hover:bg-[color-mix(in_oklab,var(--foreground)_3%,var(--card))] px-1 rounded transition-colors"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="relative">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-bold tabular-nums text-[var(--muted-foreground)]">
                            {sub.number ?? "–"}
                          </span>
                          {/* Small icon on top for substitution in list */}
                          {badges.subbedIn && (
                            <span
                              className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white shadow-xs"
                              title={isEs ? "Entró" : "In"}
                            >
                              ⬆
                            </span>
                          )}
                          {badges.subbedOut && (
                            <span
                              className="absolute -top-1 -left-1 flex h-3 w-3 items-center justify-center rounded-full bg-rose-600 text-[8px] font-bold text-white shadow-xs"
                              title={isEs ? "Salió" : "Out"}
                            >
                              ⬇
                            </span>
                          )}
                        </div>

                        {sub.photoUrl && (
                          <span className="h-6 w-6 shrink-0 rounded-full overflow-hidden border border-[var(--border)] bg-slate-900 inline-block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={sub.photoUrl} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
                          </span>
                        )}
                        <span className="min-w-0 break-words font-medium text-[var(--foreground)]">
                          {sub.playerName ?? "—"}
                        </span>
                      </div>

                      {/* Event indicators for substitutes */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        {badges.subbedIn && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500"
                            title={isEs ? "Ingresó al partido" : "Entered match"}
                          >
                            ⬆ {isEs ? "Entró" : "In"}
                          </span>
                        )}
                        {badges.subbedOut && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-500"
                            title={isEs ? "Salió sustituido" : "Subbed out"}
                          >
                            ⬇ {isEs ? "Salió" : "Out"}
                          </span>
                        )}
                        {badges.goals > 0 && (
                          <span className="text-xs font-bold text-emerald-400 inline-flex items-center gap-0.5" title="Gol">
                            ⚽{badges.goals > 1 ? badges.goals : ""}
                          </span>
                        )}
                        {badges.yellowCards > 0 && (
                          <span className="h-3.5 w-2.5 rounded-xs bg-amber-400 inline-block shadow-xs" title="Amarilla" />
                        )}
                        {badges.redCards > 0 && (
                          <span className="h-3.5 w-2.5 rounded-xs bg-rose-600 inline-block shadow-xs" title="Roja" />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)] italic">
                {isEs ? "No hay suplentes registrados." : "No substitutes listed."}
              </p>
            )}
          </div>

          {/* Starters list summary */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {isEs ? "Titulares" : "Starting XI"}
            </h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-[var(--foreground)]">
              {starters.map((p) => {
                const badges = getPlayerBadges(p.playerId, p.playerName, events);
                return (
                  <div key={p.playerId} className="flex items-center gap-2 truncate">
                    <span className="tabular-nums font-bold text-[var(--oro-500)] text-xs">
                      {p.number ?? "–"}.
                    </span>
                    {p.photoUrl && (
                      <span className="h-5 w-5 shrink-0 rounded-full overflow-hidden border border-[var(--border)] bg-slate-900 inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.photoUrl} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
                      </span>
                    )}
                    <span className="truncate font-medium">{p.playerName ?? "—"}</span>
                    {badges.subbedOut && (
                      <span className="text-[10px] font-bold text-rose-500 ml-auto shrink-0" title={isEs ? "Salió" : "Out"}>
                        ⬇
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
