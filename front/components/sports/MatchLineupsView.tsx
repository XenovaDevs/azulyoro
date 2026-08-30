"use client";

import { useState } from "react";
import type { EventDto, LineupDto, LineupPlayerDto } from "@/lib/api/types";

interface MatchLineupsViewProps {
  lineups: LineupDto[];
  events?: EventDto[];
  locale?: string;
  homeTeamId?: string;
  awayTeamId?: string;
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
  // Check if grid is present
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

  // Fallback: group by formation rows [1, 4, 3, 3]
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

  // Remaining if any
  if (currentIndex < starters.length) {
    result.push(starters.slice(currentIndex));
  }

  return result;
}

export function MatchLineupsView({
  lineups,
  events = [],
  locale = "es",
}: MatchLineupsViewProps) {
  const [selectedTeamIdx, setSelectedTeamIdx] = useState<number>(0);
  const isEs = locale === "es";

  if (!lineups || lineups.length === 0) {
    return null;
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
        <div className="flex items-center gap-2">
          {lineups.map((lu, idx) => {
            const active = idx === selectedTeamIdx;
            return (
              <button
                key={lu.teamId || idx}
                type="button"
                onClick={() => setSelectedTeamIdx(idx)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
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
          <div className="flex items-center gap-2 rounded-md bg-[var(--card)] border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
            <span className="font-semibold text-[var(--foreground)]">
              {isEs ? "DT:" : "Coach:"}
            </span>
            <span>{activeLineup.coachName}</span>
          </div>
        )}
      </div>

      {/* Main pitch & bench layout */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Tactical Pitch (View from above) */}
        <div className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-emerald-800/80 bg-gradient-to-b from-emerald-700 via-emerald-800 to-emerald-900 p-4 sm:p-6 shadow-2xl text-white">
          {/* Pitch Field Markings (SVG overlay) */}
          <div className="pointer-events-none absolute inset-0 opacity-40">
            {/* Field outer line */}
            <div className="absolute inset-3 border-2 border-white/60 rounded-sm" />
            {/* Center line */}
            <div className="absolute top-1/2 left-3 right-3 h-0.5 bg-white/60 -translate-y-1/2" />
            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/60" />
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
            {/* Top penalty box (Goalie opponent side) */}
            <div className="absolute top-3 left-1/2 h-16 w-36 -translate-x-1/2 border-2 border-t-0 border-white/60" />
            <div className="absolute top-3 left-1/2 h-7 w-20 -translate-x-1/2 border-2 border-t-0 border-white/60" />
            {/* Bottom penalty box (Our goalie side) */}
            <div className="absolute bottom-3 left-1/2 h-16 w-36 -translate-x-1/2 border-2 border-b-0 border-white/60" />
            <div className="absolute bottom-3 left-1/2 h-7 w-20 -translate-x-1/2 border-2 border-b-0 border-white/60" />
            {/* Grass stripes */}
            <div className="absolute inset-0 flex flex-col justify-between opacity-15">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-1/6 w-full odd:bg-black even:bg-transparent" />
              ))}
            </div>
          </div>

          {/* Header indicator */}
          <div className="relative z-10 mb-4 flex items-center justify-between text-xs font-semibold text-emerald-200 uppercase tracking-wider">
            <span>{isEs ? "Ataque" : "Attack"} ⬆️</span>
            <span>{activeLineup.formation ?? (isEs ? "Formación" : "Lineup")}</span>
          </div>

          {/* Tactical lines from Attackers (top) to Goalkeeper (bottom) */}
          <div className="relative z-10 flex min-h-[460px] flex-col-reverse justify-between py-2 sm:min-h-[520px]">
            {tacticalLines.map((line, lineIdx) => (
              <div
                key={lineIdx}
                className="flex items-center justify-around gap-2 px-2"
              >
                {line.map((player) => {
                  const badges = getPlayerBadges(player.playerId, player.playerName, events);
                  return (
                    <div
                      key={player.playerId}
                      className="group flex flex-col items-center gap-1.5 transition-transform hover:scale-110"
                    >
                      {/* Jersey Circle */}
                      <div className="relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full shadow-lg transition-shadow group-hover:shadow-amber-400/50">
                        <div
                          className={`flex h-full w-full items-center justify-center rounded-full border-2 font-bold tabular-nums text-sm sm:text-base ${
                            isBoca
                              ? "border-amber-400 bg-gradient-to-tr from-blue-900 via-blue-800 to-blue-950 text-amber-300 shadow-inner"
                              : "border-slate-300 bg-gradient-to-tr from-slate-800 to-slate-900 text-white shadow-inner"
                          }`}
                        >
                          {player.number ?? "–"}
                        </div>

                        {/* Event badges on jersey */}
                        <div className="absolute -top-1 -right-1 flex gap-0.5">
                          {badges.goals > 0 && (
                            <span
                              className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white shadow"
                              title={`${badges.goals} ${isEs ? "gol(es)" : "goal(s)"}`}
                            >
                              ⚽
                            </span>
                          )}
                          {badges.yellowCards > 0 && (
                            <span
                              className="h-3.5 w-2.5 rounded-xs bg-yellow-400 shadow-sm inline-block"
                              title={isEs ? "Tarjeta amarilla" : "Yellow card"}
                            />
                          )}
                          {badges.redCards > 0 && (
                            <span
                              className="h-3.5 w-2.5 rounded-xs bg-red-600 shadow-sm inline-block"
                              title={isEs ? "Tarjeta roja" : "Red card"}
                            />
                          )}
                          {badges.subbedOut && (
                            <span
                              className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow"
                              title={isEs ? "Sustituido" : "Subbed out"}
                            >
                              ⬇️
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Player Name Pill */}
                      <span className="max-w-[80px] sm:max-w-[100px] truncate rounded bg-black/75 px-1.5 py-0.5 text-center text-[10px] sm:text-xs font-semibold text-white backdrop-blur-xs border border-white/20 shadow-md">
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
            <h3 className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2 font-display text-sm font-semibold uppercase tracking-wider text-[var(--accent)]">
              <span>{isEs ? "Suplentes" : "Substitutes"}</span>
              <span className="text-xs text-[var(--muted-foreground)] font-normal">
                {substitutes.length} {isEs ? "jugadores" : "players"}
              </span>
            </h3>

            {substitutes.length > 0 ? (
              <ul className="flex flex-col divide-y divide-[var(--border)]">
                {substitutes.map((sub) => {
                  const badges = getPlayerBadges(sub.playerId, sub.playerName, events);
                  return (
                    <li
                      key={sub.playerId}
                      className="flex items-center justify-between py-2 text-sm hover:bg-[color-mix(in_oklab,var(--foreground)_3%,var(--card))] px-1 rounded transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-bold tabular-nums text-[var(--muted-foreground)]">
                          {sub.number ?? "–"}
                        </span>
                        <span className="font-medium text-[var(--foreground)]">
                          {sub.playerName ?? "—"}
                        </span>
                      </div>

                      {/* Event indicators for substitutes */}
                      <div className="flex items-center gap-1">
                        {badges.subbedIn && (
                          <span
                            className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600"
                            title={isEs ? "Ingresó al partido" : "Entered match"}
                          >
                            ⬆️ {isEs ? "Ingresó" : "In"}
                          </span>
                        )}
                        {badges.goals > 0 && (
                          <span className="text-xs" title="Gol">
                            ⚽
                          </span>
                        )}
                        {badges.yellowCards > 0 && (
                          <span className="h-3.5 w-2.5 rounded-xs bg-yellow-400 inline-block" />
                        )}
                        {badges.redCards > 0 && (
                          <span className="h-3.5 w-2.5 rounded-xs bg-red-600 inline-block" />
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
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-[var(--foreground)]">
              {starters.map((p) => (
                <div key={p.playerId} className="flex items-center gap-1.5 truncate">
                  <span className="tabular-nums font-semibold text-[var(--oro-500)]">
                    {p.number ?? "–"}.
                  </span>
                  <span className="truncate">{p.playerName ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
