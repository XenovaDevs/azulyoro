"use client";

import { useState } from "react";
import type {
  EventDto,
  LineupDto,
  MatchDetailDto,
  MatchDto,
  MatchStatisticsDto,
  PlayerStatDto,
} from "@/lib/api/types";
import { MatchStatistics } from "@/components/sports/MatchStatistics";
import { MatchLineupsView } from "@/components/sports/MatchLineupsView";
import { MatchEventsList } from "@/components/sports/MatchEventsList";
import { MatchForumTab } from "@/components/sports/MatchForumTab";
import { EmptyState } from "@/components/ui/EmptyState";

type TabKey = "stats" | "lineups" | "events" | "forum";

interface MatchDetailTabsProps {
  match: MatchDto;
  detail: MatchDetailDto | null;
  events: EventDto[];
  lineups: LineupDto[];
  stats: PlayerStatDto[];
  teamStats: MatchStatisticsDto | null;
  locale: string;
  labels: {
    stats: string;
    lineups: string;
    events: string;
    forum: string;
    eventsEmpty: string;
    playerStats: string;
    player: string;
    minutesShort: string;
    goalsShort: string;
    assistsShort: string;
    ratingShort: string;
  };
}

export function MatchDetailTabs({
  match,
  detail: _detail,
  events,
  lineups,
  stats,
  teamStats,
  locale,
  labels,
}: MatchDetailTabsProps) {
  // Estadísticas is default tab as requested by user ("la de estadisticas primero")
  const [activeTab, setActiveTab] = useState<TabKey>("stats");

  const tabs: { key: TabKey; label: string; count?: number; icon: string }[] = [
    { key: "stats", label: labels.stats, icon: "📊" },
    { key: "lineups", label: labels.lineups, icon: "📋" },
    { key: "events", label: labels.events, count: events.length, icon: "⏱️" },
    { key: "forum", label: labels.forum, icon: "💬" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation Tab Bar */}
      <nav aria-label="Match sections" className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-sm scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 min-h-10 cursor-pointer items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-[var(--accent)] whitespace-nowrap ${
                isActive
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--muted-foreground)] hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] hover:text-[var(--foreground)]"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count != null && tab.count > 0 && (
                <span
                  className={`flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Tab 1: Estadísticas (First by default) */}
      {activeTab === "stats" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <MatchStatistics
            data={teamStats}
            status={match.status}
            homeTeamName={match.homeTeamName}
            awayTeamName={match.awayTeamName}
            locale={locale}
          />

          {stats.length > 0 && (
            <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 sm:p-5 shadow-sm">
              <h3 className="mb-3 font-display text-base font-bold text-[var(--foreground)]">
                {labels.playerStats}
              </h3>
              <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full min-w-[340px] text-sm">
                  <thead className="bg-[var(--muted)] text-left text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-3 py-2">{labels.player}</th>
                      <th className="px-3 py-2 text-right">{labels.minutesShort}</th>
                      <th className="px-3 py-2 text-right">{labels.goalsShort}</th>
                      <th className="px-3 py-2 text-right">{labels.assistsShort}</th>
                      <th className="px-3 py-2 text-right">{labels.ratingShort}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s, i) => (
                      <tr key={i} className="border-t border-[var(--border)] hover:bg-[color-mix(in_oklab,var(--foreground)_3%,var(--card))]">
                        <td className="px-3 py-2 font-medium text-[var(--foreground)]">{s.playerName ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-[var(--muted-foreground)]">{s.minutes ?? 0}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-400">{s.goals}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-[var(--muted-foreground)]">{s.assists}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-[var(--oro-500)]">{s.rating ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Tab 2: Alineaciones (Con score en mapa de cancha y en suplentes arriba, y flechas roja/verde) */}
      {activeTab === "lineups" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <MatchLineupsView
            lineups={lineups}
            events={events}
            locale={locale}
            homeTeamId={match.homeTeamId}
            awayTeamId={match.awayTeamId}
            homeTeamName={match.homeTeamName}
            awayTeamName={match.awayTeamName}
            homeGoals={match.homeGoals}
            awayGoals={match.awayGoals}
            status={match.status}
          />
        </div>
      )}

      {/* Tab 3: Cronología (Timeline de eventos/incidencias) */}
      {activeTab === "events" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {events.length > 0 ? (
            <MatchEventsList
              events={events}
              locale={locale}
              homeTeamId={match.homeTeamId}
              awayTeamId={match.awayTeamId}
              homeTeamName={match.homeTeamName}
              awayTeamName={match.awayTeamName}
            />
          ) : (
            <EmptyState title={labels.eventsEmpty} />
          )}
        </div>
      )}

      {/* Tab 4: Foro del Partido (Debate e interacción directa) */}
      {activeTab === "forum" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <MatchForumTab
            matchId={match.id}
            locale={locale}
            homeTeamName={match.homeTeamName}
            awayTeamName={match.awayTeamName}
          />
        </div>
      )}
    </div>
  );
}
