import type { MatchDto, StandingDto } from "@/lib/api/types";
import { classifyStatus } from "@/lib/matchStatus";

/** Keep tournament identities intact: never combine the two league halves. */
export function fixturePhase(round: string | null, competitionType?: string): string {
  const value = (round ?? "").toLowerCase();
  if (value.includes("apertura")) return "apertura";
  if (value.includes("clausura")) return "clausura";
  if (value.includes("group") || value.includes("grupo")) return "groups";
  if (isKnockoutRound(round, competitionType)) return "playoffs";
  return "league";
}

export function isKnockoutRound(round: string | null, competitionType?: string): boolean {
  const value = round ?? "";
  if (/group|grupo|regular|league/i.test(value)) return false;
  return /final|semi|quarter|round of|play.?off|knockout|elimin|16avos|32avos|octavos|cuartos|preliminary|qualifying/i.test(value)
    || (competitionType?.toLowerCase() === "cup" && /round|ronda|fase|phase/i.test(value));
}

export function latestPhase(fixtures: MatchDto[], rows: StandingDto[], competitionType?: string): string {
  const started = fixtures.filter((match) => classifyStatus(match.status) !== "scheduled" && match.homeGoals !== null && match.awayGoals !== null)
    .sort((a, b) => Date.parse(b.dateUtc) - Date.parse(a.dateUtc));
  if (started[0]) return fixturePhase(started[0].round, competitionType);
  return rows.find((row) => row.played > 0 && row.phase !== "annual")?.phase ?? rows[0]?.phase ?? "all";
}

export function standingGroups(rows: StandingDto[]): { name: string; rows: StandingDto[] }[] {
  const groups = new Map<string, StandingDto[]>();
  for (const row of rows) {
    const key = `${row.competitionId ?? ""}:${row.phase}:${row.groupName}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return Array.from(groups.values(), (group) => ({
    name: group[0]?.groupName ?? "",
    // Points lead; retain the source's competition-specific tiebreak order.
    rows: [...group].sort((a, b) => b.points - a.points || a.rank - b.rank)
      .map((row, index) => ({ ...row, rank: index + 1 })),
  }));
}

export function fixtureGroups(fixtures: MatchDto[]): { title: string; matches: MatchDto[] }[] {
  const groups = new Map<string, MatchDto[]>();
  for (const fixture of fixtures) {
    const key = fixture.round ?? "";
    const matches = groups.get(key) ?? [];
    matches.push(fixture);
    groups.set(key, matches);
  }
  return Array.from(groups, ([title, matches]) => ({ title, matches }));
}

/** Only report a two-leg aggregate when both completed reverse fixtures exist. */
export function aggregateTies(fixtures: MatchDto[]) {
  const pairs = new Map<string, MatchDto[]>();
  for (const fixture of fixtures) {
    const key = [fixture.homeTeamId, fixture.awayTeamId].sort().join(":");
    const pair = pairs.get(key) ?? [];
    pair.push(fixture);
    pairs.set(key, pair);
  }
  return Array.from(pairs.entries()).flatMap(([id, legs]) => {
    const [first, second] = [...legs].sort((a, b) => Date.parse(a.dateUtc) - Date.parse(b.dateUtc));
    if (legs.length !== 2 || !first || !second || first.homeTeamId !== second.awayTeamId
      || first.awayTeamId !== second.homeTeamId || first.status.toLowerCase() !== "finished"
      || second.status.toLowerCase() !== "finished" || first.homeGoals === null || first.awayGoals === null
      || second.homeGoals === null || second.awayGoals === null) return [];
    return [{ id, homeName: first.homeTeamName, awayName: first.awayTeamName,
      homeGoals: first.homeGoals + second.awayGoals, awayGoals: first.awayGoals + second.homeGoals }];
  });
}
