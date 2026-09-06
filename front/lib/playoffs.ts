import type { MatchDto } from "@/lib/api/types";
import { fixturePhase, isKnockoutRound } from "@/lib/competitions";

export type PlayoffTeam = { id: string; name: string | null; logoUrl: string | null };
export type PlayoffStage = "round64" | "round32" | "round16" | "quarterfinal" | "semifinal" | "final" | "other";
export type PlayoffTie = {
  id: string;
  fixtures: MatchDto[];
  teams: [PlayoffTeam, PlayoffTeam];
  aggregate: [number, number] | null;
  winnerTeamId: string | null;
};
export type PlayoffRound = { id: string; label: string; stage: PlayoffStage; ties: PlayoffTie[] };
export type PlayoffBracket = {
  id: string;
  phase: string;
  competitionId: string;
  season: number | null;
  rounds: PlayoffRound[];
  connections: { fromTieId: string; toTieId: string }[];
};

const STAGE_ORDER: Record<PlayoffStage, number> = {
  round64: 100, round32: 101, round16: 102, quarterfinal: 103, semifinal: 104, final: 105, other: -1,
};

function roundDescription(round: string | null): { id: string; label: string; stage: PlayoffStage; order: number } {
  const label = (round ?? "").replace(/\b(apertura|clausura)\b\s*[-:]?\s*/gi, "")
    .replace(/\s*[-:(]?\s*(?:(?:1st|2nd|first|second)\s+leg|leg\s*[12]|ida|vuelta)\)?\s*$/i, "").trim();
  const value = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let stage: PlayoffStage = "other";
  if (/round of 64|32avos|32nd.?final|treintaidosavos/.test(value)) stage = "round64";
  else if (/round of 32|16avos|16th.?final|dieciseisavos/.test(value)) stage = "round32";
  else if (/round of 16|octavos|8th.?final/.test(value)) stage = "round16";
  else if (/quarter|cuartos/.test(value)) stage = "quarterfinal";
  else if (/semi/.test(value)) stage = "semifinal";
  else if (/^final(?:s)?$/.test(value)) stage = "final";
  const numbered = value.match(/(?:round|ronda|fase|phase)\s*[-:]?\s*(\d+)|(\d+)(?:st|nd|rd|th)?\s*(?:round|ronda|fase|phase)/);
  const order = stage !== "other" ? STAGE_ORDER[stage]
    : /prelim|qualif|previa/.test(value) ? 0 : numbered ? Number(numbered[1] ?? numbered[2]) : 50;
  return { id: stage === "other" ? value : stage, label, stage, order };
}

function compareDates(a: MatchDto, b: MatchDto) {
  return Date.parse(a.dateUtc) - Date.parse(b.dateUtc) || a.id.localeCompare(b.id);
}

function completed(match: MatchDto) {
  return match.status.toLowerCase() === "finished" && match.homeGoals !== null && match.awayGoals !== null;
}

function winner(teams: [PlayoffTeam, PlayoffTeam], score: [number, number]): string | null {
  return score[0] > score[1] ? teams[0].id : score[1] > score[0] ? teams[1].id : null;
}

function makeTie(fixtures: [MatchDto, ...MatchDto[]], stage: PlayoffStage): PlayoffTie {
  const first = fixtures[0];
  const teams: [PlayoffTeam, PlayoffTeam] = [
    { id: first.homeTeamId, name: first.homeTeamName, logoUrl: first.homeTeamLogoUrl },
    { id: first.awayTeamId, name: first.awayTeamName, logoUrl: first.awayTeamLogoUrl },
  ];
  const second = fixtures[1];
  let aggregate: [number, number] | null = null;
  let winnerTeamId: string | null = null;
  if (second && completed(first) && completed(second)
    && first.homeGoals !== null && first.awayGoals !== null && second.homeGoals !== null && second.awayGoals !== null) {
    aggregate = [first.homeGoals + second.awayGoals, first.awayGoals + second.homeGoals];
    winnerTeamId = winner(teams, aggregate);
    if (!winnerTeamId && second.penaltyHome !== null && second.penaltyAway !== null) {
      winnerTeamId = winner(teams, [second.penaltyAway, second.penaltyHome]);
    }
  } else if (!second && completed(first) && first.homeGoals !== null && first.awayGoals !== null) {
    const explicitLeg = /\bleg\b|\bida\b|\bvuelta\b/i.test(first.round ?? "");
    const continentalLeg = /libertadores|sudamericana/i.test(first.competitionName ?? "") && stage !== "final";
    // A completed shootout resolves the tie even if its other leg is absent.
    if (first.penaltyHome !== null && first.penaltyAway !== null) {
      winnerTeamId = winner(teams, [first.penaltyHome, first.penaltyAway]);
    }
    // A lone continental knockout fixture can be an incomplete two-leg tie.
    if (!winnerTeamId && !explicitLeg && !continentalLeg) {
      winnerTeamId = winner(teams, [first.homeGoals, first.awayGoals]);
    }
  }
  return { id: fixtures.map((fixture) => fixture.id).join(":"), fixtures, teams, aggregate, winnerTeamId };
}

function knownTeam(team: PlayoffTeam) {
  return Boolean(team.id) && !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(team.id)
    && !/^(tbd|tba|por definir|a definir|to be (defined|determined)|winner\b|ganador\b)/i.test(team.name ?? "");
}

/** Keep only observed ties: the API does not supply tournament seed/slot information. */
export function buildPlayoffBrackets(fixtures: MatchDto[], competitionType?: string): PlayoffBracket[] {
  const groups = new Map<string, { bracket: PlayoffBracket; fixtures: MatchDto[] }>();
  const seen = new Set<string>();
  for (const fixture of fixtures) {
    if (!isKnockoutRound(fixture.round, competitionType) || seen.has(fixture.id)) continue;
    seen.add(fixture.id);
    const phase = fixturePhase(fixture.round, competitionType);
    const id = `${fixture.competitionId}:${fixture.season ?? ""}:${phase}`;
    let group = groups.get(id);
    if (!group) {
      group = { bracket: { id, phase, competitionId: fixture.competitionId, season: fixture.season, rounds: [], connections: [] }, fixtures: [] };
      groups.set(id, group);
    }
    group.fixtures.push(fixture);
  }
  return Array.from(groups.values(), ({ bracket, fixtures: matches }) => {
    const rounds = new Map<string, { round: PlayoffRound; order: number; fixtures: MatchDto[] }>();
    for (const fixture of [...matches].sort(compareDates)) {
      const description = roundDescription(fixture.round);
      let entry = rounds.get(description.id);
      if (!entry) {
        entry = { round: { id: `${bracket.id}:${description.id}`, label: description.label, stage: description.stage, ties: [] }, order: description.order, fixtures: [] };
        rounds.set(description.id, entry);
      }
      entry.fixtures.push(fixture);
    }
    bracket.rounds = Array.from(rounds.values()).sort((a, b) => a.order - b.order).map(({ round, fixtures: roundFixtures }) => {
      const pairs = new Map<string, MatchDto[]>();
      for (const fixture of roundFixtures) {
        const key = [fixture.homeTeamId, fixture.awayTeamId].sort().join(":");
        const pair = pairs.get(key) ?? [];
        pair.push(fixture);
        pairs.set(key, pair);
      }
      for (const legs of pairs.values()) {
        const [first, second] = legs;
        if (!first) continue;
        if (legs.length === 2 && second && first.homeTeamId === second.awayTeamId && first.awayTeamId === second.homeTeamId) {
          round.ties.push(makeTie([first, second], round.stage));
        } else {
          round.ties.push(...legs.map((fixture) => makeTie([fixture], round.stage)));
        }
      }
      return round;
    });
    for (let index = 1; index < bracket.rounds.length; index++) {
      const previous = bracket.rounds[index - 1];
      const current = bracket.rounds[index];
      if (!previous || !current || previous.stage === "other" || current.stage === "other"
        || STAGE_ORDER[current.stage] - STAGE_ORDER[previous.stage] !== 1) continue;
      for (const from of previous.ties) {
        const destinations = current.ties.filter((to) => from.teams.some((team) => knownTeam(team)
          && (!from.winnerTeamId || from.winnerTeamId === team.id) && to.teams.some((opponent) => knownTeam(opponent) && opponent.id === team.id)));
        if (destinations.length === 1 && destinations[0]) {
          bracket.connections.push({ fromTieId: from.id, toTieId: destinations[0].id });
        }
      }
    }
    return bracket;
  });
}
