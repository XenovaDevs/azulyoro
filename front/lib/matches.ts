import type { MatchDto } from "@/lib/api/types";
import type { MatchGroup } from "@/components/sports/FixtureList";
import { ARGENTINA_TIMEZONE, formatDateInZone } from "./dateUtils";

/** Groups matches by local day in Argentina timezone, preserving the
 * given order across groups. `direction` controls day ordering. */
export function groupByDay(
  matches: MatchDto[],
  locale: string,
  direction: "asc" | "desc" = "asc",
): MatchGroup[] {
  const buckets = new Map<string, { ts: number; matches: MatchDto[] }>();
  for (const m of matches) {
    const d = new Date(m.dateUtc);
    const key = formatDateInZone(d, locale, ARGENTINA_TIMEZONE, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const ts = d.getTime();
    const bucket = buckets.get(key) ?? { ts, matches: [] };
    bucket.matches.push(m);
    buckets.set(key, bucket);
  }
  return Array.from(buckets.entries())
    .sort((a, b) =>
      direction === "asc" ? a[1].ts - b[1].ts : b[1].ts - a[1].ts,
    )
    .map(([title, { matches }]) => ({ title, matches }));
}

/** Groups matches by competition name (fallback label for unknowns). */
export function groupByCompetition(
  matches: MatchDto[],
  fallback: string,
): MatchGroup[] {
  const buckets = new Map<string, MatchDto[]>();
  for (const m of matches) {
    const key = m.competitionName ?? fallback;
    const bucket = buckets.get(key) ?? [];
    bucket.push(m);
    buckets.set(key, bucket);
  }
  return Array.from(buckets.entries()).map(([title, matches]) => ({
    title,
    matches,
  }));
}
