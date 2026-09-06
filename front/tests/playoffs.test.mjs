import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier.startsWith("@/")
      ? new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href
      : specifier, context);
  },
});
const { buildPlayoffBrackets } = await import("../lib/playoffs.ts");
const { layoutPlayoffBracket, BRACKET_TIE_WIDTH } = await import("../lib/playoff-layout.ts");

function match(id, overrides = {}) {
  return { id, extId: 1, competitionId: "cup", competitionName: "Copa Argentina", season: 2026,
    homeTeamId: "boca", awayTeamId: "rival", homeTeamName: "Boca", awayTeamName: "Rival",
    homeTeamLogoUrl: null, awayTeamLogoUrl: null, homeGoals: 1, awayGoals: 0,
    dateUtc: "2026-05-01T20:00:00Z", status: "Finished", round: "Quarter-finals", isBoca: true,
    penaltyHome: null, penaltyAway: null, lastSyncedAt: null, ...overrides };
}

test("knockout progression follows round size, not API order or kickoff dates", () => {
  const rounds = ["Final", "Round of 16", "Semi-finals", "Round of 64", "Quarter-finals", "Round of 32"];
  const fixtures = rounds.map((round, index) => match(String(index), { round }));
  const original = structuredClone(fixtures);
  const [bracket] = buildPlayoffBrackets(fixtures, "Cup");
  assert.deepEqual(bracket.rounds.map((round) => round.stage), ["round64", "round32", "round16", "quarterfinal", "semifinal", "final"]);
  assert.deepEqual(fixtures, original);
});

test("numbered preliminary cup rounds sort numerically while keeping their source descriptions", () => {
  const [bracket] = buildPlayoffBrackets([match("10", { round: "10th Round" }), match("2", { round: "2nd Round" }), match("1", { round: "1st Round" })], "Cup");
  assert.deepEqual(bracket.rounds.map((round) => round.label), ["1st Round", "2nd Round", "10th Round"]);
  assert.ok(bracket.rounds.every((round) => round.stage === "other"));
  assert.deepEqual(bracket.connections, []);
});

test("Apertura, Clausura, seasons and competitions never share ties; regular groups are excluded", () => {
  const brackets = buildPlayoffBrackets([
    match("a", { round: "Apertura - Quarter-finals" }),
    match("b", { round: "Clausura - Quarter-finals" }),
    match("c", { round: "Clausura - Quarter-finals", season: 2025 }),
    match("d", { round: "Clausura - Quarter-finals", competitionId: "other" }),
    match("e", { round: "Group Stage - 6" }), match("f", { round: "Apertura - 8" }),
  ], "Cup");
  assert.equal(brackets.length, 4);
  assert.deepEqual(brackets.map((bracket) => bracket.phase), ["apertura", "clausura", "clausura", "clausura"]);
  assert.ok(brackets.every((bracket) => bracket.rounds[0].ties.length === 1));
});

test("reversed legs retain dates, orient aggregates to first leg, and read returning-team penalties", () => {
  const first = match("first", { round: "Quarter-finals - 1st Leg", homeGoals: 2, awayGoals: 1 });
  const second = match("second", { round: "Quarter-finals - 2nd Leg", homeTeamId: "rival", awayTeamId: "boca",
    homeTeamName: "Rival", awayTeamName: "Boca", homeGoals: 1, awayGoals: 0,
    dateUtc: "2026-05-08T20:00:00Z", penaltyHome: 3, penaltyAway: 4 });
  const [bracket] = buildPlayoffBrackets([second, first], "Cup");
  assert.equal(bracket.rounds.length, 1);
  const [tie] = bracket.rounds[0].ties;
  assert.deepEqual(tie.fixtures.map((fixture) => fixture.id), ["first", "second"]);
  assert.deepEqual(tie.teams.map((team) => team.id), ["boca", "rival"]);
  assert.deepEqual(tie.aggregate, [2, 2]);
  assert.equal(tie.winnerTeamId, "boca");
  assert.equal(tie.fixtures[1].penaltyHome, 3);
});

test("a scheduled or live return leg never publishes an aggregate or winner", () => {
  for (const status of ["NotStarted", "SecondHalf", "Cancelled", "Abandoned"]) {
    const [bracket] = buildPlayoffBrackets([match("1"), match("2", { homeTeamId: "rival", awayTeamId: "boca",
      dateUtc: "2026-05-08T20:00:00Z", status })], "Cup");
    const [tie] = bracket.rounds[0].ties;
    assert.equal(tie.aggregate, null);
    assert.equal(tie.winnerTeamId, null);
  }
});

test("a lone continental leg cannot declare advancement; a completed single final can", () => {
  for (const competitionName of ["CONMEBOL Libertadores", "CONMEBOL Sudamericana"]) {
    const [bracket] = buildPlayoffBrackets([match("qf", { competitionName }), match("final", { competitionName, round: "Final" })], "Cup");
    assert.equal(bracket.rounds[0].ties[0].winnerTeamId, null);
    assert.equal(bracket.rounds[1].ties[0].winnerTeamId, "boca");
  }
  const [bracket] = buildPlayoffBrackets([match("explicit", { round: "Semi-finals - ida" })], "Cup");
  assert.equal(bracket.rounds[0].ties[0].winnerTeamId, null);
});

test("single-match penalties resolve tied scores, unresolved ties and abandoned matches do not", () => {
  const winner = (overrides) => buildPlayoffBrackets([match("1", overrides)], "Cup")[0].rounds[0].ties[0].winnerTeamId;
  assert.equal(winner({ homeGoals: 1, awayGoals: 1, penaltyHome: 4, penaltyAway: 5 }), "rival");
  assert.equal(winner({ homeGoals: 1, awayGoals: 1 }), null);
  assert.equal(winner({ status: "Abandoned" }), null);
  assert.equal(winner({ homeGoals: null }), null);
});

test("finished continental shootouts prove advancement even with an absent leg or qualification format", () => {
  for (const round of ["Qualification Round 1", "Quarter-finals", "Quarter-finals - 2nd Leg"]) {
    for (const homeGoals of [1, 2]) {
      const [bracket] = buildPlayoffBrackets([match("continental-shootout", {
        competitionName: "CONMEBOL Sudamericana", round, homeGoals, awayGoals: 1, penaltyHome: 3, penaltyAway: 4,
      })], "Cup");
      const [tie] = bracket.rounds[0].ties;
      assert.equal(tie.winnerTeamId, "rival");
      assert.equal(tie.aggregate, null);
    }
  }
  for (const overrides of [{ penaltyHome: null, penaltyAway: null }, { penaltyHome: 3, penaltyAway: 3 }, { status: "Penalty" }]) {
    const [bracket] = buildPlayoffBrackets([match("unresolved-qualifier", {
      competitionName: "CONMEBOL Sudamericana", round: "Qualification Round 1", penaltyHome: 3, penaltyAway: 4, ...overrides,
    })], "Cup");
    assert.equal(bracket.rounds[0].ties[0].winnerTeamId, null);
  }
});

test("only known progression is connected, without fabricating opponents or missing rounds", () => {
  const [bracket] = buildPlayoffBrackets([
    match("qf"),
    match("sf", { round: "Semi-finals", awayTeamId: "other", status: "NotStarted", homeGoals: null, awayGoals: null }),
    match("final", { round: "Final", homeTeamId: "unknown", homeTeamName: "TBD", awayTeamId: "unknown2", awayTeamName: "TBD", status: "NotStarted" }),
  ], "Cup");
  assert.deepEqual(bracket.connections, [{ fromTieId: "qf", toTieId: "sf" }]);
  assert.equal(bracket.rounds.reduce((count, round) => count + round.ties.length, 0), 3);
  const [partial] = buildPlayoffBrackets([match("qf"), match("final", { round: "Final" })], "Cup");
  assert.deepEqual(partial.connections, []);
  assert.equal(partial.rounds.length, 2);
});

test("shared losing teams cannot produce false progression connectors", () => {
  const [bracket] = buildPlayoffBrackets([match("qf"), match("sf", { round: "Semi-finals", homeTeamId: "rival", awayTeamId: "other" })], "Cup");
  assert.deepEqual(bracket.connections, []);
});

test("Boca-only input stays partial and deduplicates repeated API fixtures", () => {
  const fixture = match("boca-quarter");
  const [bracket] = buildPlayoffBrackets([fixture, fixture], "Cup");
  assert.equal(bracket.rounds.length, 1);
  assert.equal(bracket.rounds[0].ties.length, 1);
  assert.deepEqual(bracket.connections, []);
});

function completeBracketFixtures() {
  const fixture = (id, homeTeamId, awayTeamId, round) => match(id, {
    homeTeamId, awayTeamId, homeTeamName: homeTeamId, awayTeamName: awayTeamId, round,
  });
  // Deliberately interleave separate branches to exercise graph-based positioning.
  return [fixture("q1", "A", "B", "Quarter-finals"), fixture("q3", "E", "F", "Quarter-finals"),
    fixture("q2", "C", "D", "Quarter-finals"), fixture("q4", "G", "H", "Quarter-finals"),
    fixture("s1", "A", "C", "Semi-finals"), fixture("s2", "E", "G", "Semi-finals"),
    fixture("f1", "A", "E", "Final")].map((fixture, index) => ({ ...fixture, dateUtc: `2026-05-0${index + 1}T20:00:00Z` }));
}

function assertContainedAndSeparated(layout) {
  for (const column of layout.columns) {
    let previousBottom = 0;
    for (const node of column.ties) {
      assert.ok(node.x >= 0 && node.x + BRACKET_TIE_WIDTH <= layout.width, `${node.tie.id} fits horizontally`);
      assert.ok(node.y >= previousBottom, `${node.tie.id} does not overlap the preceding tie`);
      assert.ok(node.y + layout.nodeHeight <= layout.height, `${node.tie.id} fits vertically`);
      previousBottom = node.y + layout.nodeHeight;
    }
  }
}

test("full quarterfinal bracket centers semifinals and final on their actual feeders", () => {
  const [bracket] = buildPlayoffBrackets(completeBracketFixtures(), "Cup");
  const original = structuredClone(bracket);
  const layout = layoutPlayoffBracket(bracket);
  assert.deepEqual(layout.columns.map((column) => column.ties.length), [4, 2, 1]);
  assert.deepEqual(layout.columns[0].ties.map((node) => node.tie.id), ["q1", "q2", "q3", "q4"]);
  assert.equal(layout.edges.length, 6);
  const nodes = new Map(layout.columns.flatMap((column) => column.ties.map((node) => [node.tie.id, node])));
  assert.equal(nodes.get("s1").y, (nodes.get("q1").y + nodes.get("q2").y) / 2);
  assert.equal(nodes.get("s2").y, (nodes.get("q3").y + nodes.get("q4").y) / 2);
  assert.equal(nodes.get("f1").y, (nodes.get("s1").y + nodes.get("s2").y) / 2);
  assertContainedAndSeparated(layout);
  assert.deepEqual(bracket, original);
});

test("two-leg tie layouts allow both dates without overlapping or clipping any node", () => {
  const fixtures = completeBracketFixtures();
  fixtures.push(match("q1-return", { homeTeamId: "B", awayTeamId: "A", homeTeamName: "B", awayTeamName: "A",
    homeGoals: 0, awayGoals: 1, dateUtc: "2026-05-08T20:00:00Z" }));
  const [bracket] = buildPlayoffBrackets(fixtures, "Cup");
  const layout = layoutPlayoffBracket(bracket);
  const [singleBracket] = buildPlayoffBrackets(completeBracketFixtures(), "Cup");
  assert.ok(layout.nodeHeight > layoutPlayoffBracket(singleBracket).nodeHeight);
  assert.equal(layout.edges.length, 6);
  assert.equal(layout.columns[0].ties.find((node) => node.tie.fixtures.length === 2).tie.fixtures.length, 2);
  assertContainedAndSeparated(layout);
});

test("partial layouts preserve only observed matches and confirmed paths", () => {
  const fixtures = completeBracketFixtures().filter((fixture) => ["q1", "s1", "f1"].includes(fixture.id));
  const [bracket] = buildPlayoffBrackets(fixtures, "Cup");
  const layout = layoutPlayoffBracket(bracket);
  assert.deepEqual(layout.columns.flatMap((column) => column.ties.map((node) => node.tie.id)), ["q1", "s1", "f1"]);
  assert.deepEqual(layout.edges.map((edge) => edge.id), ["q1:s1", "s1:f1"]);
  assertContainedAndSeparated(layout);

  const [missingRound] = buildPlayoffBrackets(fixtures.filter((fixture) => fixture.id !== "s1"), "Cup");
  const disconnected = layoutPlayoffBracket(missingRound);
  assert.equal(disconnected.columns.length, 2);
  assert.deepEqual(disconnected.edges, []);
  assertContainedAndSeparated(disconnected);
});
