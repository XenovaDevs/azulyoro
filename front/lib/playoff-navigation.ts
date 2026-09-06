import type { PlayoffBracket } from "./playoffs";
import { classifyStatus } from "@/lib/matchStatus";

/** Prefer live action, then Boca's next tie, rather than starting in old preliminary rounds. */
export function preferredPlayoffTie(bracket: PlayoffBracket, bocaOnly = false) {
  const ties = bracket.rounds.flatMap(round => round.ties.map(tie => ({ round, tie })));
  const candidates = bocaOnly ? ties.filter(({ tie }) => tie.fixtures.some(match => match.isBoca)) : ties;
  const live = candidates.find(({ tie }) => tie.fixtures.some(match => classifyStatus(match.status) === "live"));
  if (live) return live;
  const upcoming = candidates.flatMap(entry => entry.tie.fixtures
    .filter(match => classifyStatus(match.status) === "scheduled")
    .map(match => ({ entry, date: Date.parse(match.dateUtc), boca: match.isBoca })))
    .sort((a, b) => Number(b.boca) - Number(a.boca) || a.date - b.date);
  return upcoming[0]?.entry ?? candidates.at(-1);
}
