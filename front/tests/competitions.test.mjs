import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

// Node's built-in TypeScript loader needs the same alias as the Next app.
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier.startsWith("@/")
      ? new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href
      : specifier, context);
  },
});
const { aggregateTies, fixturePhase, isKnockoutRound, latestPhase, standingGroups } = await import("../lib/competitions.ts");
const { formatArgentinaDate, formatDateInZone } = await import("../lib/dateUtils.ts");

function row(overrides = {}) {
  return { competitionId: "league", teamId: "boca", phase: "apertura", groupName: "Group A",
    rank: 1, points: 3, played: 1, ...overrides };
}
function match(overrides = {}) {
  return { homeTeamId: "boca", awayTeamId: "rival", homeTeamName: "Boca", awayTeamName: "Rival",
    homeGoals: 1, awayGoals: 0, dateUtc: "2026-05-01T20:00:00Z", status: "Finished", round: "Apertura - 8", ...overrides };
}

test("identically named groups from Apertura and Clausura are never merged or added", () => {
  const tables = standingGroups([row({ points: 30 }), row({ phase: "clausura", points: 11 })]);
  assert.equal(tables.length, 2);
  assert.deepEqual(tables.map((table) => table.rows[0].points), [30, 11]);
});

test("points order wins over obsolete source rank, source ties remain stable, inputs stay unchanged", () => {
  const rows = [row({ teamId: "a", rank: 1, points: 10 }), row({ teamId: "b", rank: 3, points: 12 }), row({ teamId: "c", rank: 2, points: 12 })];
  const result = standingGroups(rows)[0].rows;
  assert.deepEqual(result.map((item) => item.teamId), ["c", "b", "a"]);
  assert.deepEqual(result.map((item) => item.rank), [1, 2, 3]);
  assert.deepEqual(rows.map((item) => item.rank), [1, 3, 2]);
});

test("group stages and cup knockout rounds are classified without losing league half", () => {
  assert.equal(fixturePhase("Clausura - Quarter-finals", "League"), "clausura");
  assert.equal(isKnockoutRound("Clausura - Quarter-finals"), true);
  assert.equal(fixturePhase("Group Stage - 6", "Cup"), "groups");
  assert.equal(fixturePhase("1st Round", "Cup"), "playoffs");
  assert.equal(fixturePhase("2nd Round", "Cup"), "playoffs");
  assert.equal(fixturePhase("Preliminary Round", "Cup"), "playoffs");
  assert.equal(fixturePhase("Regular Season - 8", "League"), "league");
});

test("a future Clausura fixture does not select it before that tournament starts", () => {
  const fixtures = [match(), match({ round: "Clausura - 1", dateUtc: "2026-08-01T20:00:00Z", status: "NotStarted", homeGoals: null, awayGoals: null })];
  assert.equal(latestPhase(fixtures, [row(), row({ phase: "clausura", played: 0 })]), "apertura");
  assert.equal(latestPhase([...fixtures, match({ round: "Clausura - 2", dateUtc: "2026-08-08T20:00:00Z" })], []), "clausura");
});

test("aggregate goals follow reversed home/away teams and never invent an unplayed leg", () => {
  const first = match({ round: "Quarter-finals", homeGoals: 2, awayGoals: 1 });
  const second = match({ round: "Quarter-finals", homeTeamId: "rival", awayTeamId: "boca", homeGoals: 1, awayGoals: 1, dateUtc: "2026-05-08T20:00:00Z" });
  assert.deepEqual(aggregateTies([first, second]).map(({ homeGoals, awayGoals }) => [homeGoals, awayGoals]), [[3, 2]]);
  assert.deepEqual(aggregateTies([first]), []);
  assert.deepEqual(aggregateTies([first, { ...second, status: "NotStarted", homeGoals: null, awayGoals: null }]), []);
});

test("kickoff formatting normalizes ICU spaces that differ between Node and browsers", () => {
  const options = { dateStyle: "medium", timeStyle: "short" };
  const date = "2026-09-05T22:30:00Z";
  assert.doesNotMatch(formatArgentinaDate(date, "es", options), /[\u00a0\u202f]/);
  assert.doesNotMatch(formatDateInZone(date, "es", undefined, options), /[\u00a0\u202f]/);
});
