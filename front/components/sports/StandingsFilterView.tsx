"use client";

import { useMemo, useState } from "react";
import type { StandingDto } from "@/lib/api/types";
import { StandingsTable } from "./StandingsTable";

interface StandingsFilterViewProps {
  standings: StandingDto[];
  locale?: string;
  bocaTeamId?: string;
}

interface TournamentGroup {
  id: string;
  name: string;
  isAnnual: boolean;
  subgroups: {
    groupName: string;
    rows: StandingDto[];
  }[];
}

export function StandingsFilterView({
  standings,
  locale = "es",
  bocaTeamId,
}: StandingsFilterViewProps) {
  const isEs = locale === "es";

  // Group standings by competition name or groupName
  const tournaments = useMemo(() => {
    const map = new Map<string, { name: string; isAnnual: boolean; subgroups: Map<string, StandingDto[]> }>();

    for (const row of standings) {
      const compName = row.competitionName || row.groupName || (isEs ? "Torneo" : "Tournament");
      const isAnnual =
        compName.toLowerCase().includes("anual") ||
        row.groupName.toLowerCase().includes("anual");

      // Normalize tournament key
      let key = compName;
      if (isAnnual) key = isEs ? "Tabla Anual" : "Annual Table";

      let tourney = map.get(key);
      if (!tourney) {
        tourney = {
          name: key,
          isAnnual,
          subgroups: new Map<string, StandingDto[]>(),
        };
        map.set(key, tourney);
      }

      const subKey = row.groupName || key;
      const subRows = tourney.subgroups.get(subKey) ?? [];
      subRows.push(row);
      tourney.subgroups.set(subKey, subRows);
    }

    const list: TournamentGroup[] = [];
    for (const [id, data] of map.entries()) {
      list.push({
        id,
        name: data.name,
        isAnnual: data.isAnnual,
        subgroups: Array.from(data.subgroups.entries()).map(([groupName, rows]) => ({
          groupName,
          rows: rows.sort((a, b) => a.rank - b.rank),
        })),
      });
    }

    // Sort order: Liga Profesional first, then Tabla Anual, then Copa Sudamericana / International, then rest
    return list.sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      if (aLower.includes("liga") && !bLower.includes("liga")) return -1;
      if (!aLower.includes("liga") && bLower.includes("liga")) return 1;
      if (a.isAnnual && !b.isAnnual) return -1;
      if (!a.isAnnual && b.isAnnual) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [standings, isEs]);

  const [activeTab, setActiveTab] = useState<string>("all");

  const visibleTournaments = useMemo(() => {
    if (activeTab === "all") return tournaments;
    return tournaments.filter((t) => t.id === activeTab);
  }, [tournaments, activeTab]);

  return (
    <div className="flex flex-col gap-6">
      {/* Tournament Selector Tabs */}
      {tournaments.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "all"
                ? "bg-[var(--accent)] text-white shadow-md"
                : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[color-mix(in_oklab,var(--foreground)_8%,var(--muted))] hover:text-[var(--foreground)]"
            }`}
          >
            {isEs ? "Todos los torneos" : "All Tournaments"}
          </button>

          {tournaments.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  active
                    ? "bg-[var(--accent)] text-white shadow-md"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[color-mix(in_oklab,var(--foreground)_8%,var(--muted))] hover:text-[var(--foreground)]"
                }`}
              >
                {t.name}
                {t.isAnnual && (
                  <span className="ml-1.5 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
                    {isEs ? "Copas 2026" : "Cups 2026"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Rendered Tournament Tables */}
      <div className="flex flex-col gap-10">
        {visibleTournaments.map((tourney) => (
          <section key={tourney.id} className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h2 className="font-display text-xl font-bold tracking-tight text-[var(--foreground)]">
                {tourney.name}
              </h2>
              {tourney.isAnnual && (
                <span className="text-xs font-semibold text-[var(--oro-500)] uppercase tracking-wider">
                  {isEs ? "Clasificación a Libertadores y Sudamericana" : "Libertadores & Sudamericana spots"}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-6">
              {tourney.subgroups.map((sub) => (
                <div key={sub.groupName} className="flex flex-col gap-2">
                  {tourney.subgroups.length > 1 && (
                    <h3 className="font-display text-sm font-semibold text-[var(--accent)] uppercase tracking-wider">
                      {sub.groupName}
                    </h3>
                  )}
                  <StandingsTable
                    rows={sub.rows}
                    bocaTeamId={bocaTeamId}
                    isAnnualTable={tourney.isAnnual}
                    locale={locale}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
