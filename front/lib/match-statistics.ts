import type { MatchStatisticsDto } from "./api/types";

export const MATCH_STATISTICS = [
  { key: "possession", percent: true, primary: true },
  { key: "shotsTotal", primary: true },
  { key: "shotsOnGoal", primary: true },
  { key: "corners", primary: true },
  { key: "fouls", primary: true },
  { key: "yellowCards", primary: true },
  { key: "redCards", primary: true },
  { key: "offsides", primary: true },
  { key: "shotsOffGoal" },
  { key: "blockedShots" },
  { key: "shotsInsideBox" },
  { key: "shotsOutsideBox" },
  { key: "saves" },
  { key: "passesTotal" },
  { key: "passesAccurate" },
  { key: "passesAccuracy", percent: true },
  { key: "expectedGoals" },
  { key: "goalsPrevented" },
] satisfies { key: string; percent?: boolean; primary?: boolean }[];

function nullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

/** Validate HTTP and live frames before their values reach the comparison. */
export function parseMatchStatistics(value: unknown): MatchStatisticsDto | null {
  if (!value || typeof value !== "object" || !("statistics" in value) || !Array.isArray(value.statistics)
    || !("updatedAt" in value) || (value.updatedAt !== null && typeof value.updatedAt !== "string")) return null;
  const statistics: MatchStatisticsDto["statistics"] = [];
  const seen = new Set<string>();
  for (const row of value.statistics) {
    if (!row || typeof row !== "object" || !("key" in row) || typeof row.key !== "string"
      || !("home" in row) || !nullableNumber(row.home) || !("away" in row) || !nullableNumber(row.away)
      || seen.has(row.key)) return null;
    seen.add(row.key);
    statistics.push({ key: row.key, home: row.home, away: row.away });
  }
  return { updatedAt: value.updatedAt, statistics };
}

/** A missing opponent value is not zero; a 0–0 comparison has no coloured share. */
export function statisticShares(home: number | null, away: number | null): [number, number] | null {
  if (home === null || away === null || home < 0 || away < 0 || !Number.isFinite(home + away) || home + away === 0) return null;
  return [100 * home / (home + away), 100 * away / (home + away)];
}
