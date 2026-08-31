"use client";

import { useEffect, useState } from "react";
import type { EventDto, LineupDto, MatchDetailDto, MatchDto, PlayerStatDto } from "@/lib/api/types";
import { classifyStatus } from "@/lib/matchStatus";
import { EmptyState } from "@/components/ui/EmptyState";
import { LiveScoreBadge } from "@/components/sports/LiveScoreBadge";
import { MatchKickoffTime } from "@/components/sports/MatchKickoffTime";
import { MatchEventsList } from "@/components/sports/MatchEventsList";
import { MatchLineupsView } from "@/components/sports/MatchLineupsView";

interface LiveMatchStreamProps {
  match: MatchDto;
  detail: MatchDetailDto | null;
  events: EventDto[];
  lineups?: LineupDto[];
  stats?: PlayerStatDto[];
  locale?: string;
  labels: {
    live: string;
    statusScheduled: string;
    statusFinished: string;
    events: string;
    eventsEmpty: string;
    lineups?: string;
    playerStats?: string;
    notStartedTitle: string;
    notStartedDescription: string;
  };
}

interface LiveUpdate {
  fixtureId: string;
  status: string;
  elapsed: number | null;
  homeGoals: number | null;
  awayGoals: number | null;
  events: EventDto[];
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "https://api.azulyoro.com.ar").replace(/\/$/, "");

function TeamCrest({ name, logoUrl }: { name: string | null; logoUrl: string | null }) {
  return (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] p-2">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={name ?? ""} width={56} height={56} loading="eager" className="h-full w-full object-contain" />
      ) : (
        <span className="font-display text-xl font-bold text-[var(--muted-foreground)]">
          {(name ?? "?").slice(0, 3).toUpperCase()}
        </span>
      )}
    </span>
  );
}

export function LiveMatchStream({
  match,
  detail,
  events,
  lineups = [],
  stats = [],
  locale = "es",
  labels,
}: LiveMatchStreamProps) {
  const [update, setUpdate] = useState<LiveUpdate>(() => ({
    fixtureId: match.id,
    status: match.status,
    elapsed: detail?.elapsed ?? null,
    homeGoals: match.homeGoals,
    awayGoals: match.awayGoals,
    events,
  }));

  useEffect(() => {
    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let finished = false;

    const connect = () => {
      if (disposed || finished) return;
      source = new EventSource(`${API_URL}/api/matches/${encodeURIComponent(match.id)}/stream`);
      source.onmessage = (message) => {
        try {
          const next = JSON.parse(message.data) as LiveUpdate;
          if (next.fixtureId !== match.id) return;
          setUpdate(next);
          if (classifyStatus(next.status) === "finished") {
            finished = true;
            source?.close();
          }
        } catch {
          // The stream is public and best-effort; reconnecting handles a bad frame.
        }
      };
      source.onerror = () => {
        source?.close();
        if (!disposed && !finished) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      };
    };

    connect();
    return () => {
      disposed = true;
      finished = true;
      source?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [match.id]);

  const state = classifyStatus(update.status);
  const played = state !== "scheduled";

  return (
    <div className="flex flex-col gap-8" aria-live="polite">
      {/* Scoreboard Card */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-b from-[var(--azul-900)] to-[var(--card)] p-6 text-[var(--foreground)] shadow-lg">
        <div className="mb-6 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide">
          <span className="text-[var(--oro-500)]">{match.competitionName}</span>
          {state === "live" ? (
            <LiveScoreBadge label={labels.live} minute={update.elapsed} />
          ) : (
            <span className="text-[var(--muted-foreground)]">
              {state === "finished" ? labels.statusFinished : labels.statusScheduled}
            </span>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <TeamCrest name={match.homeTeamName} logoUrl={match.homeTeamLogoUrl} />
            <span className="font-display text-sm font-semibold sm:text-base">{match.homeTeamName}</span>
          </div>
          <div className="px-2 text-center">
            <div className="tabular-nums text-4xl font-bold sm:text-5xl">
              {played ? `${update.homeGoals ?? 0} : ${update.awayGoals ?? 0}` : "vs"}
            </div>
            {played && detail && (detail.htHome != null || detail.htAway != null) && (
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                HT {detail.htHome ?? 0}-{detail.htAway ?? 0}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <TeamCrest name={match.awayTeamName} logoUrl={match.awayTeamLogoUrl} />
            <span className="font-display text-sm font-semibold sm:text-base">{match.awayTeamName}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-1 text-center text-sm text-[var(--muted-foreground)]">
          <MatchKickoffTime
            dateUtc={match.dateUtc}
            locale={locale}
            variant="full"
            showTimezoneBadge
          />
          {detail?.venue ? <span>· {detail.venue}</span> : null}
          {detail?.round ? <span>· {detail.round}</span> : null}
        </div>
      </section>

      {!played && (
        <EmptyState title={labels.notStartedTitle} description={labels.notStartedDescription} />
      )}

      {/* Tactical Lineups (Field from above & Bench) */}
      <section>
        <h2 className="mb-4 font-display text-xl font-bold">
          {labels.lineups ?? (locale === "es" ? "Formaciones y Cancha Táctica" : "Lineups & Tactical Pitch")}
        </h2>
        <MatchLineupsView
          lineups={lineups}
          events={update.events}
          locale={locale}
          homeTeamId={match.homeTeamId}
          awayTeamId={match.awayTeamId}
        />
      </section>

      {/* Incidencias / Events List */}
      {played && (
        <section>
          <h2 className="mb-4 font-display text-xl font-bold">{labels.events}</h2>
          {update.events.length > 0 ? (
            <MatchEventsList
              events={update.events}
              locale={locale}
              homeTeamId={match.homeTeamId}
              awayTeamId={match.awayTeamId}
              homeTeamName={match.homeTeamName}
              awayTeamName={match.awayTeamName}
            />
          ) : (
            <EmptyState title={labels.eventsEmpty} />
          )}
        </section>
      )}

      {/* Player Stats */}
      {stats.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">
            {labels.playerStats ?? (locale === "es" ? "Estadísticas de jugadores" : "Player Stats")}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--muted)] text-left text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-3 py-2">{locale === "es" ? "Jugador" : "Player"}</th>
                  <th className="px-3 py-2 text-right">{locale === "es" ? "Min" : "Min"}</th>
                  <th className="px-3 py-2 text-right">{locale === "es" ? "G" : "G"}</th>
                  <th className="px-3 py-2 text-right">{locale === "es" ? "A" : "A"}</th>
                  <th className="px-3 py-2 text-right">{locale === "es" ? "Nota" : "Rating"}</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={i} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 font-medium">{s.playerName ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.minutes ?? 0}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.goals}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.assists}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-[var(--oro-500)]">{s.rating ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
