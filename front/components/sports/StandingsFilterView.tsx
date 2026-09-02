"use client";

import { memo, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { StandingDto } from "@/lib/api/types";
import { StandingsTable } from "./StandingsTable";

interface StandingsFilterViewProps {
  standings: StandingDto[];
  locale?: string;
  bocaTeamId?: string;
}

interface SubgroupData {
  groupName: string;
  isGeneral: boolean;
  rows: StandingDto[];
}

interface TournamentGroup {
  id: string;
  name: string;
  isAnnual: boolean;
  subgroups: SubgroupData[];
}

function normalizeGroupName(raw: string, isEs: boolean): string {
  if (!raw) return isEs ? "Tabla General" : "General Table";
  const lower = raw.toLowerCase();

  if (lower.includes("aggregate") || lower.includes("general")) {
    return isEs ? "Tabla General" : "General Table";
  }
  if (lower.includes("anual") || lower.includes("annual")) {
    return isEs ? "Tabla Anual" : "Annual Table";
  }
  if (lower.includes("group a") || lower.includes("grupo a") || lower.includes("zona a")) {
    return isEs ? "Zona A" : "Group A";
  }
  if (lower.includes("group b") || lower.includes("grupo b") || lower.includes("zona b")) {
    return isEs ? "Zona B" : "Group B";
  }
  if (lower.includes("group c") || lower.includes("grupo c") || lower.includes("zona c")) {
    return isEs ? "Zona C" : "Group C";
  }
  if (lower.includes("group d") || lower.includes("grupo d") || lower.includes("zona d")) {
    return isEs ? "Zona D" : "Group D";
  }

  return raw;
}

function isGeneralOrAnnual(name: string): boolean {
  const l = name.toLowerCase();
  return (
    l.includes("general") ||
    l.includes("anual") ||
    l.includes("annual") ||
    l.includes("aggregate")
  );
}

export const StandingsFilterView = memo(function StandingsFilterView({
  standings,
  locale = "es",
  bocaTeamId,
}: StandingsFilterViewProps) {
  const t = useTranslations("Standings");
  const isEs = locale === "es";

  // Group standings by competition name and groups
  const tournaments = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        isAnnual: boolean;
        subgroups: Map<string, StandingDto[]>;
      }
    >();

    for (const row of standings) {
      const compName =
        row.competitionName || row.groupName || (isEs ? "Torneo" : "Tournament");
      const isAnnual = isGeneralOrAnnual(compName) || isGeneralOrAnnual(row.groupName);

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

      const rawSubKey = row.groupName || key;
      const normalizedSubKey = normalizeGroupName(rawSubKey, isEs);
      const subRows = tourney.subgroups.get(normalizedSubKey) ?? [];
      subRows.push({ ...row, groupName: normalizedSubKey });
      tourney.subgroups.set(normalizedSubKey, subRows);
    }

    const list: TournamentGroup[] = [];
    for (const [id, data] of map.entries()) {
      const subgroupsList: SubgroupData[] = Array.from(data.subgroups.entries()).map(
        ([groupName, rows]) => ({
          groupName,
          isGeneral: isGeneralOrAnnual(groupName),
          rows: rows.sort((a, b) => a.rank - b.rank),
        })
      );

      // Check if there is already a General/Annual table
      const hasGeneral = subgroupsList.some((s) => s.isGeneral);

      // If there are 2 or more zone groups and no general table, synthesize "Tabla General"
      if (!hasGeneral && subgroupsList.length >= 2) {
        const teamMap = new Map<string, StandingDto>();

        for (const sub of subgroupsList) {
          for (const r of sub.rows) {
            const teamKey = r.teamId || r.teamName || "";
            const existing = teamMap.get(teamKey);
            if (!existing) {
              teamMap.set(teamKey, { ...r });
            } else {
              // Merge stats if team appears in multiple phases
              teamMap.set(teamKey, {
                ...existing,
                played: existing.played + r.played,
                win: existing.win + r.win,
                draw: existing.draw + r.draw,
                lose: existing.lose + r.lose,
                goalsFor: existing.goalsFor + r.goalsFor,
                goalsAgainst: existing.goalsAgainst + r.goalsAgainst,
                goalsDiff: existing.goalsDiff + r.goalsDiff,
                points: existing.points + r.points,
              });
            }
          }
        }

        const generalRows: StandingDto[] = Array.from(teamMap.values())
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalsDiff !== a.goalsDiff) return b.goalsDiff - a.goalsDiff;
            if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
            if (b.win !== a.win) return b.win - a.win;
            return (a.teamName ?? "").localeCompare(b.teamName ?? "");
          })
          .map((row, idx) => ({
            ...row,
            rank: idx + 1,
            groupName: isEs ? "Tabla General" : "General Table",
          }));

        subgroupsList.unshift({
          groupName: isEs ? "Tabla General" : "General Table",
          isGeneral: true,
          rows: generalRows,
        });
      }

      list.push({
        id,
        name: data.name,
        isAnnual: data.isAnnual,
        subgroups: subgroupsList,
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
  const [selectedSubgroup, setSelectedSubgroup] = useState<Record<string, string>>({});

  const visibleTournaments = useMemo(() => {
    if (activeTab === "all") return tournaments;
    return tournaments.filter((t) => t.id === activeTab);
  }, [tournaments, activeTab]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Tournament Selector Tabs: Horizontal scrollable on small screens */}
      {tournaments.length > 1 && (
        <nav
          aria-label={t("title")}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x border-b border-[var(--border)] pb-3"
        >
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-all min-h-[40px] ${
              activeTab === "all"
                ? "bg-[var(--accent)] text-white shadow-md"
                : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[color-mix(in_oklab,var(--foreground)_8%,var(--muted))] hover:text-[var(--foreground)]"
            }`}
          >
            {t("allTournaments")}
          </button>

          {tournaments.map((tGroup) => {
            const active = activeTab === tGroup.id;
            return (
              <button
                key={tGroup.id}
                type="button"
                onClick={() => setActiveTab(tGroup.id)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-all min-h-[40px] flex items-center ${
                  active
                    ? "bg-[var(--accent)] text-white shadow-md"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[color-mix(in_oklab,var(--foreground)_8%,var(--muted))] hover:text-[var(--foreground)]"
                }`}
              >
                <span>{tGroup.name}</span>
                {tGroup.isAnnual && (
                  <span className="ml-1.5 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
                    {t("copasBadge")}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* Rendered Tournament Tables */}
      <div className="flex flex-col gap-10">
        {visibleTournaments.map((tourney) => {
          const currentSubKey = selectedSubgroup[tourney.id] ?? "all";
          const visibleSubgroups =
            currentSubKey === "all"
              ? tourney.subgroups
              : tourney.subgroups.filter((s) => s.groupName === currentSubKey);

          return (
            <section key={tourney.id} className="flex flex-col gap-4">
              {/* Tournament Title & Subgroup Selector */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]">
                    {tourney.name}
                  </h2>
                  {tourney.isAnnual && (
                    <span className="text-xs font-semibold text-[var(--oro-500)] uppercase tracking-wider hidden sm:inline">
                      {t("qualificationSubtitle")}
                    </span>
                  )}
                </div>

                {/* Subgroup Filter Buttons (Scrollable on small screens) */}
                {tourney.subgroups.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x pb-1 sm:pb-0">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSubgroup((prev) => ({
                          ...prev,
                          [tourney.id]: "all",
                        }))
                      }
                      className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors min-h-[32px] ${
                        currentSubKey === "all"
                          ? "bg-[var(--foreground)] text-[var(--background)] font-semibold"
                          : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {t("allTables")}
                    </button>
                    {tourney.subgroups.map((sub) => {
                      const isSelected = currentSubKey === sub.groupName;
                      return (
                        <button
                          key={sub.groupName}
                          type="button"
                          onClick={() =>
                            setSelectedSubgroup((prev) => ({
                              ...prev,
                              [tourney.id]: sub.groupName,
                            }))
                          }
                          className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors min-h-[32px] flex items-center ${
                            isSelected
                              ? "bg-[var(--accent)] text-white font-semibold shadow-xs"
                              : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          }`}
                        >
                          <span>{sub.groupName}</span>
                          {sub.isGeneral && (
                            <span className="ml-1 text-[10px] opacity-90">★</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Subgroup Tables */}
              <div className="flex flex-col gap-8">
                {visibleSubgroups.map((sub) => (
                  <div key={sub.groupName} className="flex flex-col gap-2">
                    {tourney.subgroups.length > 1 && (
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-sm sm:text-base font-semibold text-[var(--accent)] uppercase tracking-wider">
                          {sub.groupName}
                        </h3>
                        {sub.isGeneral && (
                          <span className="text-xs font-medium text-[var(--oro-500)]">
                            {t("qualificationSubtitle")}
                          </span>
                        )}
                      </div>
                    )}
                    <StandingsTable
                      rows={sub.rows}
                      bocaTeamId={bocaTeamId}
                      isAnnualTable={tourney.isAnnual || sub.isGeneral}
                      locale={locale}
                      captionTitle={`${tourney.name} - ${sub.groupName}`}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
});
